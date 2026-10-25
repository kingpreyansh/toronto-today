// Real photos of the place an event happens at, for items whose own page has no
// preview image. Uses Wikipedia/Wikimedia Commons so the imagery is freely
// licensed, and records the attribution that the licence requires.
//
// Only Commons-hosted files are accepted. Wikipedia's own `wikipedia/en` fair-use
// files (club crests, logos) are deliberately skipped.

const UA = 'TorontoToday/1.0 (briefing dashboard; contact via site owner)';
const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Venue strings in the briefing often carry a suffix that breaks a title lookup.
export function normalizePlace(name) {
  let value = String(name || '').trim();
  if (!value) return '';
  value = value.split(',')[0].trim();                       // "Union Station, TD West Carriageway"
  value = value.replace(/\s+at\s+the\s+.*$/i, '');          // "Soulpepper at the Young Centre"
  value = value.replace(/\s+(Public\s+Square|Square|Theatre|Theater)$/i, (m) => m);
  return value.trim();
}

export function titleFromPlace(name) {
  const clean = normalizePlace(name);
  return clean ? clean.replace(/\s+/g, '_') : '';
}

function isCommonsImage(url) {
  try {
    const u = new URL(url);
    return /(^|\.)wikimedia\.org$/.test(u.hostname)
      && u.pathname.includes('/wikipedia/commons/');
  } catch {
    return false;
  }
}

function filenameFromThumb(url) {
  try {
    const parts = new URL(url).pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return null;
  }
}

async function getJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {signal: controller.signal, headers: {'User-Agent': UA, Accept: 'application/json'}});
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Attribution required by the image's licence, read from Commons. */
export async function commonsCredit(imageUrl) {
  const filename = filenameFromThumb(imageUrl);
  if (!filename) return null;
  const api = `${COMMONS_API}?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url`
    + `&titles=${encodeURIComponent('File:' + filename)}`;
  const data = await getJson(api);
  const pages = data && data.query && data.query.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const meta = page && page.imageinfo && page.imageinfo[0] && page.imageinfo[0].extmetadata;
  if (!meta) return null;
  const strip = html => String(html || '').replace(/<[^>]*>/g, '').trim();
  return {
    source: 'Wikimedia Commons',
    author: strip(meta.Artist && meta.Artist.value) || 'Wikimedia contributor',
    license: strip(meta.LicenseShortName && meta.LicenseShortName.value) || 'see file page',
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename.replace(/ /g, '_'))}`,
  };
}

/**
 * Look up a freely-licensed photo of a place.
 * Returns { image, credit, page } or null when there is nothing usable.
 */
export async function lookupPlace(place) {
  const title = titleFromPlace(place);
  if (!title) return null;
  const summary = await getJson(SUMMARY + encodeURIComponent(title));
  if (!summary || summary.type === 'disambiguation') return null;

  const candidate = (summary.originalimage && summary.originalimage.source)
    || (summary.thumbnail && summary.thumbnail.source);
  // Skip fair-use files and SVG logos; we want a photograph of the place.
  if (!candidate || !isCommonsImage(candidate) || /\.svg($|\?)/i.test(candidate)) return null;

  const page = (summary.content_urls && summary.content_urls.desktop && summary.content_urls.desktop.page) || null;
  const credit = await commonsCredit(candidate);
  const creditResult = credit || {source: 'Wikimedia Commons', author: 'Wikimedia contributor', license: 'see file page', page};
  return {
    image: (summary.thumbnail && summary.thumbnail.source) || candidate,
    full: candidate,
    page,
    credit: creditResult,
  };
}
