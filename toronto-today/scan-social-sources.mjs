#!/usr/bin/env node
// Collect social-option candidates for the Toronto briefing from Luma and Eventbrite.
//
// Both are read from their public pages, which expose structured data:
//   - lu.ma/toronto ships a Next.js __NEXT_DATA__ blob whose event objects carry a
//     name, an ISO start time and a slug.
//   - Eventbrite's Toronto directory page ships a JSON-LD ItemList of events with
//     name, url, start/end dates and an image.
//
// Output is CANDIDATES ONLY. The daily briefing run must still verify each event
// against the organizer before publishing; nothing here is treated as confirmed.

import {writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(ROOT, 'data/social-candidates.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36';

const LUMA_URL = 'https://lu.ma/toronto';
const EVENTBRITE_URL = 'https://www.eventbrite.ca/d/canada--toronto--events/';

async function getText(url, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-CA,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Toronto calendar day for an instant, as YYYY-MM-DD. */
export function torontoDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-CA', {timeZone: 'America/Toronto'});
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

/**
 * Walk any parsed JSON and collect objects that look like an event.
 * Shape-agnostic on purpose: both sites ship deep, undocumented payloads that
 * change, so we match on the presence of a title and a start time.
 */
export function collectEventLike(node, out = [], depth = 0) {
  if (depth > 12 || node === null) return out;
  if (Array.isArray(node)) {
    for (const item of node) collectEventLike(item, out, depth + 1);
    return out;
  }
  if (typeof node !== 'object') return out;

  const name = node.name || node.event_name || node.title;
  const start = node.start_at || node.startDate || node.start_date || node.start_time || node.startTime;
  if (typeof name === 'string' && name.trim().length > 3 && start) {
    const geo = node.geo_address_info || node.geo || node.location || {};
    const slug = node.url || node.slug || node.api_id || null;
    out.push({
      title: name.trim(),
      start: String(start),
      url: isHttpUrl(slug) ? slug : (typeof slug === 'string' && /^[a-z0-9]{6,}$/i.test(slug) ? `https://lu.ma/${slug}` : null),
      venue: (geo && (geo.full_address || geo.address || geo.city || geo.place_name)) || null,
      image: isHttpUrl(node.image) ? node.image : (isHttpUrl(node.cover_url) ? node.cover_url : null),
    });
  }
  for (const value of Object.values(node)) collectEventLike(value, out, depth + 1);
  return out;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = (item.url || item.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scanLuma() {
  const html = await getText(LUMA_URL);
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return {events: [], error: 'no __NEXT_DATA__ payload'};
  let payload;
  try {
    payload = JSON.parse(match[1]);
  } catch (error) {
    return {events: [], error: `payload parse failed: ${error.message}`};
  }
  const events = dedupe(collectEventLike(payload))
    .filter(e => e.url && !Number.isNaN(new Date(e.start).getTime()))
    .map(e => ({...e, source: 'Luma', source_url: LUMA_URL}));
  return {events, error: null};
}

export async function scanEventbrite() {
  const html = await getText(EVENTBRITE_URL);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const events = [];
  for (const [, raw] of blocks) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    const roots = Array.isArray(data) ? data : [data];
    for (const root of roots) {
      const list = root && root.itemListElement;
      if (!Array.isArray(list)) continue;
      for (const entry of list) {
        const item = entry && entry.item ? entry.item : entry;
        if (!item || typeof item.name !== 'string') continue;
        events.push({
          title: item.name.trim(),
          start: item.startDate ? String(item.startDate) : null,
          end: item.endDate ? String(item.endDate) : null,
          url: isHttpUrl(item.url) ? item.url : null,
          venue: (item.location && (item.location.name || item.location.address)) || null,
          image: isHttpUrl(item.image) ? item.image : null,
          source: 'Eventbrite',
          source_url: EVENTBRITE_URL,
        });
      }
    }
  }
  return {events: dedupe(events).filter(e => e.url), error: null};
}

async function main() {
  const today = torontoDay(new Date());
  const results = {};
  for (const [name, scan] of [['luma', scanLuma], ['eventbrite', scanEventbrite]]) {
    try {
      const {events, error} = await scan();
      results[name] = {
        count: events.length,
        todayCount: events.filter(e => torontoDay(e.start) === today).length,
        error,
        events,
      };
    } catch (error) {
      results[name] = {count: 0, todayCount: 0, error: error.message, events: []};
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    toronto_today: today,
    note: 'Candidates only. Verify each event against the organizer before publishing.',
    sources: results,
  };
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 1));

  console.log(JSON.stringify({
    toronto_today: today,
    luma: {count: results.luma.count, today: results.luma.todayCount, error: results.luma.error},
    eventbrite: {count: results.eventbrite.count, today: results.eventbrite.todayCount, error: results.eventbrite.error},
    outFile: OUT_FILE,
  }, null, 1));
}

main().catch(error => { console.error('scan-social-sources failed:', error.message); process.exitCode = 1; });
