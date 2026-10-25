// Preview images for briefing sources. Server-side only.
//
// Extracts the page's own declared preview image (og:image / twitter:image /
// JSON-LD), downloads it once, and caches it locally so the public page serves
// images from our own origin with no third-party requests and no key exposure.

import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';

export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export const PUBLIC_IMAGE_SECTIONS = ['best_bets', 'local_events', 'cultural_events', 'networking', 'social_options', 'business_news'];

const MAX_BYTES = 6 * 1024 * 1024;
const decodeEntities = s => s.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&quot;/g, '"');

export function hashFor(url) {
  return createHash('sha256').update(String(url)).digest('hex').slice(0, 16);
}

function toAbsolute(candidate, base) {
  if (!candidate) return null;
  try {
    const url = new URL(decodeEntities(String(candidate).trim()), base);
    return url.href;
  } catch {
    return null;
  }
}

export function extractImageUrl(html, base) {
  const raw = typeof html === 'string' ? html : '';
  if (!raw) return null;

  // Ordered most-specific first.
  const metaPatterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = raw.match(pattern);
    if (match) {
      const url = toAbsolute(match[1], base);
      if (url) return url;
    }
  }

  for (const block of raw.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]{0,20000}?)<\/script>/gi)) {
    let parsed;
    try { parsed = JSON.parse(block[1].trim()); } catch { continue; }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      const image = node && node.image;
      const candidate = Array.isArray(image) ? image[0] : (typeof image === 'string' ? image : image && image.url);
      const url = toAbsolute(candidate, base);
      if (url) return url;
    }
  }
  return null;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a === 169
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
  }
  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    return value === '::1' || value === '::' || value.startsWith('fc')
      || value.startsWith('fd') || value.startsWith('fe80') || value.startsWith('::ffff:127');
  }
  return true;
}

export function isSafeRemoteUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { return false; }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  // URL.hostname keeps IPv6 literals bracketed, so strip before IP checks.
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) return false;
  if (net.isIP(hostname) && isPrivateAddress(hostname)) return false;
  if (url.port && !['80', '443', ''].includes(url.port)) return false;
  return true;
}

async function resolvesPublicly(hostname) {
  const host = String(hostname).replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return !isPrivateAddress(host);
  try {
    const records = await dns.lookup(host, {all: true});
    if (!records.length) return false;
    return records.every(record => !isPrivateAddress(record.address));
  } catch {
    return false;
  }
}

export function isImageContentType(value) {
  return /^image\/(jpeg|jpg|png|webp|avif|gif|x-icon|vnd\.microsoft\.icon)$/i.test(String(value || '').split(';')[0].trim());
}

const EXT_FOR_TYPE = {'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico'};

/**
 * The site's own declared brand mark. Prefers apple-touch-icon (usually 180px)
 * and otherwise the largest declared icon. This is a real asset published by the
 * source, never a substitute, so it is honest to show when no photo exists.
 */
export function extractIconUrl(html, base) {
  const raw = typeof html === 'string' ? html : '';
  if (!raw) return null;
  let apple = null;
  let best = null;
  let bestSize = -1;
  for (const match of raw.matchAll(/<link[^>]+rel=["']([^"']*icon[^"']*)["'][^>]*>/gi)) {
    const tag = match[0];
    const rel = match[1].toLowerCase();
    const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const abs = toAbsolute(href, base);
    if (!abs) continue;
    if (rel.includes('apple-touch')) { if (!apple) apple = abs; continue; }
    const sizes = (tag.match(/sizes=["']([^"']+)["']/i) || [])[1] || '';
    const px = Math.max(0, ...sizes.split(/\s+/).map(v => parseInt(v, 10) || 0));
    if (px > bestSize) { bestSize = px; best = abs; }
  }
  return apple || best;
}

/** Classic favicon location for a page, tried before any third-party resolver. */
export function faviconUrlFor(pageUrl) {
  try { return new URL('/favicon.ico', new URL(pageUrl).origin).href; } catch { return null; }
}

/**
 * Last resort for hosts that refuse datacenter IPs (403 on both the page and its
 * favicon). Returns the site's real favicon via a resolver, which is downloaded
 * once and cached here, so the browser never contacts the resolver.
 */
export function faviconResolverUrl(host, size = 128) {
  if (!host || /[^a-z0-9.\-]/i.test(host)) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

export async function fetchHtml(url, timeoutMs = 15000) {
  if (!isSafeRemoteUrl(url) || !(await resolvesPublicly(new URL(url).hostname))) {
    throw new Error('unsafe target');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-CA,en;q=0.9',
        'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'none',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (type && !type.includes('html')) throw new Error(`unexpected content-type ${type}`);
    return (await res.text()).slice(0, 800000);
  } finally {
    clearTimeout(timer);
  }
}

export async function downloadImage(imageUrl, {dir, timeoutMs = 20000} = {}) {
  if (!isSafeRemoteUrl(imageUrl) || !(await resolvesPublicly(new URL(imageUrl).hostname))) {
    throw new Error('unsafe image target');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Referer: new URL(imageUrl).origin + '/'},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!isImageContentType(type)) throw new Error(`not an image: ${type || 'unknown'}`);
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared && declared > MAX_BYTES) throw new Error('image too large');
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_BYTES) throw new Error('image too large or empty');
    const filename = hashFor(imageUrl) + (EXT_FOR_TYPE[type] || '.jpg');
    await mkdir(dir, {recursive: true});
    await writeFile(path.join(dir, filename), buffer);
    return {filename, bytes: buffer.length, type};
  } finally {
    clearTimeout(timer);
  }
}

export async function readImageMap(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return {}; }
}

// Only image paths for allowlisted public sections, keyed by source URL.
export function pickImages(data) {
  const map = {};
  for (const section of PUBLIC_IMAGE_SECTIONS) {
    for (const item of (Array.isArray(data?.[section]) ? data[section] : [])) {
      if (!item || typeof item !== 'object') continue;
      const url = typeof item.url === 'string' ? item.url : '';
      const image = typeof item.image === 'string' ? item.image : '';
      if (url && image.startsWith('media/') && !image.includes('..')) map[url] = image;
    }
  }
  return map;
}
