#!/usr/bin/env node
// Resolve and cache a preview image for every briefing item and venue.
//
// Tiers, best first. Every tier is an asset that is genuinely of the subject:
//   1. preview          the page's own og:image / twitter:image / JSON-LD (a real photo of the event)
//   2. location         a freely-licensed photo of the place itself (Wikimedia Commons),
//                       used when the page publishes no photo. Attribution is recorded.
//   3. site-icon        the site's own declared icon (apple-touch preferred, else largest)
//   4. favicon          the site's conventional /favicon.ico
//   5. favicon-resolved the site's real favicon via a resolver, for hosts that refuse
//                       datacenter IPs. Fetched once here, so the browser never contacts it.
// Writes:
//   media/<hash>.<ext>
//   data/images.json    { "<source url>"|"venue:<Name>" : "media/<file>" }
//   data/credits.json   { "<same key>" : {source, author, license, page} }  (only where required)
//
// Usage: node warm-images.mjs [--limit N] [--force] [--refresh-places]

import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  extractImageUrl, extractIconUrl, faviconUrlFor, faviconResolverUrl,
  fetchHtml, downloadImage, readImageMap, PUBLIC_IMAGE_SECTIONS,
} from './images.mjs';
import {lookupPlace, normalizePlace} from './locations.mjs';
import {findOrganizerPoster} from './posters.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(ROOT, 'data/latest.json');
const MAP_FILE = path.join(ROOT, 'data/images.json');
const CREDITS_FILE = path.join(ROOT, 'data/credits.json');
const PLACES_CACHE = path.join(ROOT, 'data/locations-cache.json');
const MEDIA_DIR = path.join(ROOT, 'media');
const VENUES_FILE = path.join(ROOT, 'venues.json');

const args = process.argv.slice(2);
const force = args.includes('--force');
const refreshPlaces = args.includes('--refresh-places');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

const exists = async file => { try { await access(file, constants.F_OK); return true; } catch { return false; } };
const readJson = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; } };

function collectTargets(data) {
  const byKey = new Map();
  for (const section of PUBLIC_IMAGE_SECTIONS) {
    for (const item of (Array.isArray(data?.[section]) ? data[section] : [])) {
      const url = item && typeof item.url === 'string' ? item.url : '';
      if (!url || byKey.has(url)) continue;
      // The place the thing happens at, used for the location tier.
      const place = (typeof item.venue === 'string' && item.venue)
        || (typeof item.location === 'string' && item.location) || null;
      byKey.set(url, {key: url, pageUrl: url, place, title: item.title || null, label: item.title || section});
    }
  }
  return [...byKey.values()];
}

function collectVenues(data, venueMap) {
  const out = [];
  for (const v of (Array.isArray(data?.venue_checks) ? data.venue_checks : [])) {
    const name = v && typeof v.venue === 'string' ? v.venue.trim() : '';
    if (!name) continue;
    const homepage = venueMap[name];
    if (homepage) out.push({key: `venue:${name}`, pageUrl: homepage, place: name, label: `venue ${name}`});
  }
  return out;
}

async function mapWithConcurrency(items, size, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({length: Math.min(size, items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const data = await readJson(DATA_FILE, null);
  if (!data) throw new Error('data/latest.json missing or unreadable');
  const venueMap = (await readJson(VENUES_FILE, {})).venues || {};

  const targets = [...collectTargets(data), ...collectVenues(data, venueMap)];
  const limited = limit === Infinity ? targets : targets.slice(0, limit);

  const existing = await readImageMap(MAP_FILE);
  const credits = await readJson(CREDITS_FILE, {});
  // Cache place lookups so the daily run does not re-query every venue.
  const placeCache = refreshPlaces ? {} : await readJson(PLACES_CACHE, {});

  const resolved = {...existing};
  await mkdir(MEDIA_DIR, {recursive: true});

  const results = await mapWithConcurrency(limited, 5, async target => {
    const save = async candidate => {
      if (!candidate) return null;
      const {filename} = await downloadImage(candidate, {dir: MEDIA_DIR});
      return `media/${filename}`;
    };

    // Record every successful resolution into the map. Without this the tiers
    // still report success while the written map keeps stale values.
    const done = (tier, rel, extra) => {
      if (rel) resolved[target.key] = rel;
      return {key: target.key, tier, rel, place: target.place, ...(extra || {})};
    };

    const cached = existing[target.key];
    if (cached && !force && await exists(path.join(ROOT, cached))) {
      return done('cached', cached);
    }

    // Tier 1: the page's own preview image.
    let html = null;
    try { html = await fetchHtml(target.pageUrl); } catch { /* blocked or offline */ }
    if (html) {
      try {
        const rel = await save(extractImageUrl(html, target.pageUrl));
        if (rel) return done('preview', rel);
      } catch {}
    }

    // Tier 2: the event's own poster, from the organizer's own website. Used when the
    // event page publishes no preview image, or when its URL has gone stale.
    if (target.title) {
      let origin = null;
      try { origin = new URL(target.pageUrl).origin; } catch {}
      if (origin) {
        try {
          const poster = await findOrganizerPoster({origin, title: target.title});
          if (poster && poster.image) {
            const rel = await save(poster.image);
            if (rel) return done('poster', rel, {posterPage: poster.page});
          }
        } catch {}
      }
    }

    // Tier 3: a real photo of the place itself.
    if (target.place) {
      const cacheKey = normalizePlace(target.place);
      let found = placeCache[cacheKey];
      if (found === undefined) {
        try { found = await lookupPlace(target.place); } catch { found = null; }
        placeCache[cacheKey] = found;
      }
      if (found && found.image) {
        try {
          const rel = await save(found.image);
          if (rel) {
            if (found.credit) credits[target.key] = found.credit;
            return done('location-photo', rel);
          }
        } catch {}
      }
    }

    // Tier 3: the site's own declared icon.
    if (html) {
      try {
        const rel = await save(extractIconUrl(html, target.pageUrl));
        if (rel) return done('site-icon', rel);
      } catch {}
    }
    // Tier 4: conventional favicon.
    try {
      const rel = await save(faviconUrlFor(target.pageUrl));
      if (rel) return done('favicon', rel);
    } catch {}
    // Tier 5: resolver, for hosts that block datacenter traffic entirely.
    try {
      const rel = await save(faviconResolverUrl(new URL(target.pageUrl).hostname));
      if (rel) return done('favicon-resolved', rel);
    } catch {}
    return done('none', null);
  });

  const verified = {};
  for (const [key, rel] of Object.entries(resolved)) {
    if (await exists(path.join(ROOT, rel))) verified[key] = rel;
  }
  await writeFile(MAP_FILE, JSON.stringify(verified, null, 1));

  // Only keep credits for keys that still have an image.
  const keptCredits = {};
  for (const [key, credit] of Object.entries(credits)) {
    if (verified[key]) keptCredits[key] = credit;
  }
  await writeFile(CREDITS_FILE, JSON.stringify(keptCredits, null, 1));
  await writeFile(PLACES_CACHE, JSON.stringify(placeCache, null, 1));

  // Self-check: a target that resolved successfully must appear in the written map.
  // This is the guard against the map silently keeping stale values.
  const mismatched = results.filter(r => r.rel && verified[r.key] !== r.rel);
  if (mismatched.length) {
    console.error(`ERROR: ${mismatched.length} resolved target(s) are missing from the written map`);
    for (const r of mismatched.slice(0, 10)) {
      console.error(`  ${r.tier} ${r.key.slice(0, 70)} resolved=${r.rel} inMap=${verified[r.key]}`);
    }
    process.exitCode = 1;
  }

  const byTier = results.reduce((acc, r) => { acc[r.tier] = (acc[r.tier] || 0) + 1; return acc; }, {});
  const stillMissing = results.filter(r => !r.rel).map(r => r.key);
  if (args.includes('--verbose')) {
    for (const r of results) console.error(`${r.tier.padEnd(18)} ${String(r.place || '').slice(0, 26).padEnd(28)} ${r.key.slice(0, 70)}`);
  }
  console.log(JSON.stringify({
    targets: targets.length,
    byTier,
    totalInMap: Object.keys(verified).length,
    creditedImages: Object.keys(keptCredits).length,
    stillMissing,
    mapFile: MAP_FILE,
    creditsFile: CREDITS_FILE,
  }, null, 1));

  if (stillMissing.length) {
    console.error(`WARNING: ${stillMissing.length} item(s) still have no image`);
    console.error(JSON.stringify(stillMissing.slice(0, 20), null, 1));
  }
}

main().catch(error => { console.error('warm-images failed:', error.message); process.exitCode = 1; });
