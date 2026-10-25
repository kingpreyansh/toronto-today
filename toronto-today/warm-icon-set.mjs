#!/usr/bin/env node
// Pre-seed the complete WeatherAPI condition icon set.
//
// The public server runs under a read-only sandbox, so it must never need to
// write. Downloading the finite set of condition codes up front means serving
// an icon is a pure file read with no outbound request in the request path.
//
// Usage: node warm-icon-set.mjs [--force]

import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureIcons} from './icons.mjs';
import {ICON_CDN_HOST} from './weather.mjs';

// The documented World Weather Online condition codes WeatherAPI artwork uses.
const CODES = [
  113, 116, 119, 122, 143, 176, 200, 227, 230, 248, 260, 263, 266, 281, 284,
  293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 323, 326, 329, 332, 335,
  338, 350, 353, 356, 359, 362, 365, 368, 371, 374, 377, 386, 389, 392, 395,
];

const force = process.argv.includes('--force');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'media/icons');

const urls = [];
for (const code of CODES) {
  for (const period of ['day', 'night']) {
    urls.push(`https://${ICON_CDN_HOST}/weather/128x128/${period}/${code}.png`);
  }
}

await mkdir(dir, {recursive: true});
const map = await ensureIcons(urls, {dir});
const cached = Object.keys(map).length;

console.log(JSON.stringify({
  attempted: urls.length,
  cached,
  dir,
  missingCodes: CODES.filter(code => !map[`day-${code}`] && !map[`night-${code}`]),
}, null, 1));

if (!cached) {
  console.error('No condition icons could be cached. Check outbound access to the WeatherAPI CDN.');
  process.exitCode = 1;
}
