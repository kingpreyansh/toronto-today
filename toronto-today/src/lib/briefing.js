const text = value => typeof value === 'string' ? value.trim() : '';
const pickText = (object, keys) => Object.fromEntries(keys.map(key => [key, text(object?.[key])]));
const fields = ['title', 'category', 'time', 'venue', 'location', 'neighborhood', 'location_label', 'price', 'status', 'summary', 'why', 'why_it_matters', 'source', 'impact', 'crowd', 'topic', 'level', 'read'];

export function normalizeBriefing(raw) {
  const date = raw?.meta?.date_iso;
  if (raw?.schema_version !== 1 || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('This edition could not be read. Please try again.');
  }
  const result = {
    schema_version: 1,
    meta: pickText(raw.meta, ['date_iso', 'date_display', 'edition', 'generated_at', 'content_note']),
    weather: { ...pickText(raw.weather, ['temperature', 'condition', 'summary', 'high_low', 'precipitation', 'wind', 'sun']), source_url: safeUrl(raw.weather?.source_url) },
    business_source_note: text(raw.business_source_note),
    venue_checks: (Array.isArray(raw.venue_checks) ? raw.venue_checks : []).filter(item => text(item?.venue)).map(item => pickText(item, ['venue', 'status', 'state'])),
  };
  for (const key of ['local_events', 'cultural_events', 'networking', 'best_bets', 'social_options', 'business_news', 'learning']) {
    const items = (Array.isArray(raw[key]) ? raw[key] : []).filter(item => text(item?.title)).map(item => ({ ...pickText(item, fields), url: safeUrl(item.url) }));
    // Only best_bets is capped here; the reader controls how much of the rest to see.
    result[key] = key === 'best_bets' ? items.slice(0, 3) : items;
  }
  return result;
}

export function torontoDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isStaleEdition(edition, now = new Date()) {
  return edition !== torontoDate(now);
}

// Rank events so the ones most likely to draw a young, lively crowd come first.
// The research sets `crowd`; unknown or missing values keep a neutral rank and
// preserve their original order, so this never invents a signal.
const CROWD_RANK = {'young-crowd': 0, young: 0, mixed: 1, general: 2, family: 3, quiet: 4};
export function sortByCrowd(events) {
  const rank = event => {
    const key = String((event && event.crowd) || '').toLowerCase();
    return key in CROWD_RANK ? CROWD_RANK[key] : 2;
  };
  // Decorating with the index keeps the sort stable for equal ranks.
  return events
    .map((event, index) => ({event, index}))
    .sort((a, b) => rank(a.event) - rank(b.event) || a.index - b.index)
    .map(pair => pair.event);
}

export function dedupeEvents(events) {
  const seen = new Set();
  return events.filter(event => {
    const href = safeUrl(event.url);
    if (!href) return true;
    const url = new URL(href);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith('utm_') || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    url.searchParams.sort();
    const key = url.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterEvents(events, query = '', filter = 'All') {
  const needle = query.trim().toLocaleLowerCase();
  return events.filter(event => {
    const matches = !needle || fields.map(key => text(event[key])).join(' ').toLocaleLowerCase().includes(needle);
    const price = text(event.price).toLowerCase();
    const free = /^(?:free\b|no charge\b|(?:c\$|\$)?0(?:\.00)?$)/.test(price);
    const downtown = /\bdowntown\b/i.test(text(event.location_label));
    return matches && (filter === 'Free' ? free : filter === 'Downtown' ? downtown : true);
  });
}

export function safeUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Maps a provider condition phrase to a visual tone. Pure and order-sensitive:
// rain and snow are checked before cloud so "Patchy rain" does not read as cloud.
export function conditionTone(text) {
  const value = String(text || '').toLowerCase();
  if (/thunder|storm/.test(value)) return 'storm';
  if (/snow|sleet|ice|blizzard|pellet/.test(value)) return 'snow';
  if (/rain|drizzle|shower|freezy|freezing/.test(value)) return 'rain';
  if (/fog|mist/.test(value)) return 'fog';
  if (/overcast|cloud|partly/.test(value)) return 'cloud';
  if (/sunny|clear/.test(value)) return 'clear';
  return 'mild';
}

// Only a same-origin cached media path is ever usable as an image source.
// An optional numeric version token is allowed and keeps the CDN edge honest.
export function localMediaUrl(value) {
  return typeof value === 'string' && /^\/media\/(icons\/(day|night)-\d{3,4}|[a-f0-9]{16})\.(png|jpg|jpeg|webp|avif|gif|ico)(\?v=\d+)?$/.test(value)
    ? value
    : null;
}
