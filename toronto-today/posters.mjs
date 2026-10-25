// Event posters, taken from the event organizer's own website.
//
// Where image search is unusable (a query for a niche local event returns
// unrelated stock), an organizer's own CMS knows exactly what its event is.
// Most venue and festival sites run WordPress, so the REST API can return the
// event's featured image, which is normally its poster.
//
// A title-overlap guard is mandatory: a search hit must actually be the event we
// asked for, otherwise a wrong poster would be shown.

const UA = 'TorontoToday/1.0 (briefing dashboard; contact via site owner)';

export function titleTokens(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'presented', 'by'].includes(w)),
  );
}

/**
 * True when a search hit is credibly the same event.
 * Requires a meaningful share of the wanted title's words to appear in the hit.
 */
export function isSameEvent(wantedTitle, hitTitle) {
  const want = titleTokens(wantedTitle);
  if (!want.size) return false;
  const got = titleTokens(hitTitle);
  if (!got.size) return false;
  let shared = 0;
  for (const token of want) if (got.has(token)) shared++;
  // Most distinctive words must match; one-word overlap is not enough.
  return shared >= Math.min(want.size, 2) && shared / want.size >= 0.5;
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

/** True only for a plain https(s) image URL we would be willing to download. */
function usableImage(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    return /\.(jpe?g|png|webp|avif)($|\?)/i.test(u.pathname + u.search);
  } catch {
    return false;
  }
}

/**
 * Look for the event's own poster on the organizer's website.
 * Returns {image, page, hitTitle, confidence} or null.
 */
export async function findOrganizerPoster({origin, title}) {
  if (!origin || !title) return null;
  const base = String(origin).replace(/\/$/, '');
  const search = await getJson(`${base}/wp-json/wp/v2/search?per_page=5&search=${encodeURIComponent(title)}`);
  if (!Array.isArray(search)) return null;

  for (const hit of search) {
    const hitTitle = String(hit?.title || '');
    if (!isSameEvent(title, hitTitle)) continue;
    const subtype = String(hit?.subtype || 'posts');
    const post = await getJson(`${base}/wp-json/wp/v2/${encodeURIComponent(subtype)}/${encodeURIComponent(hit.id)}?_embed=wp:featuredmedia`);
    if (!post || typeof post !== 'object') continue;

    // The embedded featured media is the poster in the common case.
    const embedded = post._embedded && post._embedded['wp:featuredmedia'];
    const media = Array.isArray(embedded) ? embedded[0] : null;
    const candidate = (media && (media.source_url || (media.media_details && media.media_details.sizes
      && ((media.media_details.sizes['1536x1536'] || media.media_details.sizes.large || {}).source_url))))
      || null;
    if (candidate && usableImage(candidate)) {
      return {image: candidate, page: post.link || hit.url || null, hitTitle, confidence: 'featured-media'};
    }
    // Fall back to fetching the media object directly.
    if (post.featured_media) {
      const m = await getJson(`${base}/wp-json/wp/v2/media/${encodeURIComponent(post.featured_media)}`);
      const src = m && m.source_url;
      if (src && usableImage(src)) {
        return {image: src, page: post.link || hit.url || null, hitTitle, confidence: 'media-endpoint'};
      }
    }
  }
  return null;
}
