// Try harder on the sources that failed a plain fetch.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-CA,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'none', 'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache',
};

const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&quot;/g, '"');

function jsonLdImage(html, base) {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]{0,20000}?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const img = node && node.image;
        const candidate = Array.isArray(img) ? img[0] : (typeof img === 'string' ? img : img && img.url);
        if (candidate) return new URL(decode(candidate), base).href;
      }
    } catch { /* ignore malformed blocks */ }
  }
  return null;
}

function metaImage(html, base) {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']thumbnail["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) { try { return new URL(decode(m[1]), base).href; } catch { return null; } }
  }
  return null;
}

function heroImage(html, base) {
  // Last resort: the first reasonably large content image on the page.
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    if (/(sprite|icon|logo|avatar|placeholder|pixel|spacer|1x1|badge)/i.test(m[1])) continue;
    if (/width=["']?([0-9]{1,2})["']?/.test(tag)) continue;
    try {
      const url = new URL(decode(m[1]), base);
      if (/\.(jpe?g|png|webp|avif)($|\?)/i.test(url.pathname)) return url.href;
    } catch { /* ignore */ }
  }
  return null;
}

const targets = process.argv.slice(2);
(async () => {
  const out = [];
  for (const url of targets) {
    const row = { url, status: null, og: null, ld: null, hero: null };
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 15000);
      const res = await fetch(url, { signal: c.signal, headers: HEADERS, redirect: 'follow' });
      clearTimeout(t);
      row.status = res.status;
      if (res.ok || res.status === 202) {
        const html = (await res.text()).slice(0, 600000);
        row.og = metaImage(html, url);
        row.ld = jsonLdImage(html, url);
        row.hero = heroImage(html, url);
      }
    } catch (e) { row.status = 'ERR ' + e.message.slice(0, 40); }
    out.push(row);
  }
  console.log(JSON.stringify(out, null, 1));
})();
