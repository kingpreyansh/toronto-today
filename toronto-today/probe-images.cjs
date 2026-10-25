// Probe: which briefing sources expose a usable preview image?
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/home/ubuntu/phiads-odysseus/toronto-today/data/latest.json', 'utf8'));

const urls = new Set();
for (const key of ['best_bets', 'local_events', 'cultural_events', 'networking', 'social_options', 'business_news']) {
  for (const item of data[key] || []) if (item.url) urls.add(item.url);
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36';

function findImage(html, base) {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) { try { return new URL(m[1], base).href; } catch { return null; } }
  }
  return null;
}

(async () => {
  const results = [];
  for (const url of urls) {
    const row = { url, status: null, image: null, type: null };
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 12000);
      const res = await fetch(url, { signal: c.signal, headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      clearTimeout(t);
      row.status = res.status;
      row.type = (res.headers.get('content-type') || '').split(';')[0];
      if (res.ok && row.type === 'text/html') {
        const html = (await res.text()).slice(0, 400000);
        row.image = findImage(html, url);
      }
    } catch (e) { row.status = 'ERR ' + e.message.slice(0, 40); }
    results.push(row);
  }
  const ok = results.filter(r => r.image).length;
  console.log(JSON.stringify({ total: results.length, withImage: ok, results }, null, 1));
})();
