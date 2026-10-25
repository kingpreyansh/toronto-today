// WeatherAPI condition artwork, cached locally.
//
// The provider's PNG icons are small (~3 KB) and keyed by an old numeric code
// system. We download the ones a payload needs and serve them from our own
// origin, which keeps the page's Content-Security-Policy at `img-src 'self'`
// and means the browser never talks to the provider's CDN.

import {writeFile, mkdir, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {ICON_CDN_HOST} from './weather.mjs';

const MAX_BYTES = 256 * 1024;

const exists = async file => { try { await access(file, constants.F_OK); return true; } catch { return false; } };

export function iconFile(code, period) {
  if (!/^\d{3,4}$/.test(String(code || '')) || !['day', 'night'].includes(period)) return null;
  return `${period}-${code}.png`;
}

// Only the provider's own CDN may be fetched, so a tampered payload cannot make
// the server download from an arbitrary host.
export function isAllowedIconUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && url.hostname === ICON_CDN_HOST
      && /^\/weather\/\d+x\d+\/(day|night)\/\d{3,4}\.png$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function parseIconUrl(value) {
  if (!isAllowedIconUrl(value)) return null;
  const [, period, code] = new URL(value).pathname.match(/\/(day|night)\/(\d{3,4})\.png$/);
  return {code, period, file: iconFile(code, period)};
}

// Downloads any not-yet-cached icons. Returns { "<period-code>": "media/icons/..." }.
export async function ensureIcons(urls, {dir, timeoutMs = 10000} = {}) {
  const map = {};
  await mkdir(dir, {recursive: true});
  for (const url of new Set(urls || [])) {
    const parsed = parseIconUrl(url);
    if (!parsed) continue;
    const target = path.join(dir, parsed.file);
    if (!(await exists(target))) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {signal: controller.signal, headers: {'User-Agent': 'Mozilla/5.0'}});
        if (!res.ok) continue;
        const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (type !== 'image/png') continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        if (!buffer.length || buffer.length > MAX_BYTES) continue;
        await writeFile(target, buffer);
      } catch {
        continue;
      } finally {
        clearTimeout(timer);
      }
    }
    if (await exists(target)) map[`${parsed.period}-${parsed.code}`] = `media/icons/${parsed.file}`;
  }
  return map;
}
