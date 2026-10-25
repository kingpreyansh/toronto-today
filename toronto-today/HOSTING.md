# Toronto Today hosting

## Public scope
User approved public city briefing only. Public URL: https://today.getphiads.com/
No authentication. Anyone with the URL can read it. Search indexing is discouraged via robots.txt and X-Robots-Tag, not access control.

Only built React assets and whitelisted `data/latest.json` are served. No personal planner/lead data, full original briefing, source JSON, .env, scripts, source tree or directory browsing. There is no public write endpoint.

## Layout
- Frontend source: src/ with package.json and Vite build.
- Built public shell: dist/.
- Current public data: data/latest.json.
- Public data publisher: publish.py, accepts local researched JSON and atomically replaces only allowlisted city fields.
- Read-only HTTP server: server.mjs, binds 127.0.0.1:8780. Asset URLs immutable, HTML and JSON no-store.
- HTTPS edge: separate Cloudflare named tunnel `toronto-today`, config `/home/ubuntu/.cloudflared/toronto-today.yml`.
- System services: toronto-today.service and toronto-today-tunnel.service, startup at boot and restart on failure.
- Existing Instantly tunnel and port 8650 remain unchanged.

## Preview images

Cards show the source page's own declared preview image (og:image, twitter:image or JSON-LD image).
Nothing is invented and no stock imagery is used.

- `images.mjs` extracts and validates; `warm-images.mjs` fetches and caches once per day.
- Run from the app dir after publishing: `node warm-images.mjs` (add `--force` to refetch, `--limit N` to cap).
- Cached bytes live in `media/<16-hex>.<ext>`; the map is `data/images.json` (`source url -> media/<file>`).
- The page only requests same-origin `/media/...`. `img-src 'self' data:` and `connect-src 'self'` stay tight,
  so the browser never contacts the publisher's CDN and no third-party tracking occurs on the page.
- Only files matching `^media/[a-f0-9]{16}\.(jpg|png|webp|avif|gif)$` are servable, so an arbitrary file
  dropped in `media/` cannot be exposed.
- Expensive fetching happens offline in the warm script, never in the public request path, so the server
  cannot be used to make outbound requests on demand.

Coverage is now **complete: every item and every venue gets an image**. Resolution is tiered, and every
tier uses an asset the source itself publishes, so nothing is ever substituted or invented:

1. `preview` - the page's own `og:image` / `twitter:image` / JSON-LD image (a real photo).
2. `poster` - the event's **own poster**, taken from the organizer's own website via its CMS
   (WordPress REST API: `wp-json/wp/v2/search` then the post's featured media). This is authoritative and
   also recovers the canonical event URL when the stored link has gone stale, which is how
   `Tkaronto Open IV` now shows its real poster. A title-overlap guard (`isSameEvent` in `posters.mjs`) is
   mandatory: a search hit must genuinely be the same event or it is rejected, so a wrong poster can never
   be shown. Non-image media (PDFs) is refused.
3. `location-photo` - a freely-licensed photo of the place itself, from Wikimedia Commons. Used when the
   page publishes no photo. Every event carries a `venue`/`location`, which is normalised
   (suffixes like ", TD West Carriageway" and "at the Young Centre" stripped) and looked up on Wikipedia.
   Fair-use files (`wikipedia/en`) and SVG logos are refused, so only genuinely free photography is used.
4. `site-icon` - the site's own declared icon, preferring `apple-touch-icon`, else the largest declared.
5. `favicon` - the site's conventional `/favicon.ico`.
6. `favicon-resolved` - the site's real favicon via a resolver, for hosts that refuse datacenter IPs
   (`mhrth.com`, `ago.ca`, `ouevents.ca`, `tiff.net`). Downloaded once here and cached, so the browser
   never contacts the resolver.

**Image search is deliberately not used.** A Bing image query for "Tkaronto Open IV poster" returned Magic:
The Gathering cards, so search-based images would put unrelated pictures on the page. The organizer's own
website is authoritative; a search engine is not.

`warm-images.mjs` ends with a self-check that fails the run if any target resolved successfully but is absent
from the written map. This exists because an earlier revision resolved posters correctly, reported them
correctly, and still wrote a stale map - the tiers must be verified against the file on disk, never against
their own report.

Measured on 2026-09-26 across 31 targets: 17 `preview` photos, 2 `poster`s, 4 `location-photo`s, so **23 of
31 are real photography**; the remaining 8 fall back to a brand mark. 0 unresolved.

### Attribution is required, so it is shown

Creative Commons images need credit. `data/credits.json` holds `{author, license, page}` per licensed image
and the UI shows it both as a caption on the image and as a consolidated "Place photos" line in the footer.
`locations-cache.json` caches place lookups so the daily run does not re-query Wikipedia every morning, and
`--refresh-places` forces a re-lookup.

Venues are resolved too. `venues.json` maps each venue name to its official homepage, and those are fetched
for a real preview image. The map is keyed `venue:<Name>` in `data/images.json`.

Browser-verified coverage: best bets 3/3, around the city 7/7, venue watch 6/6, social options 3/3,
business in brief 7/7, Events tab 18/18, Culture 8/8, Networking 1/1, News 7/7 - all loaded, zero broken,
zero cross-origin requests.

### Security guards in `images.mjs`

- Only `http`/`https`, no credentials in the URL, no non-standard ports.
- Private, loopback, link-local, CGNAT and multicast addresses are rejected, for both literal IPs and
  resolved hostnames, so a hostile URL cannot reach internal services.
- Images must be a real image content type and under 6 MB, with a bounded timeout.

## Weather widget (einui, shadcn registry)

The current-conditions card uses the **einui "Liquid Glass" weather widget** requested by Preyansh:
`https://ui.eindev.ir/docs/components/weather-widget`.

- Install is a shadcn registry add, not an npm package: `npx shadcn@latest add @einui/weather-widget`
  resolves from `https://ui.eindev.ir/r/weather-widget.json`. The npm name `@einui/weather-widget` does
  **not** exist, so a registry 404 is expected and is not a fault.
- Files are vendored verbatim into `src/components/ui/` (`weather-widget.tsx`, `base-widget.tsx`).
  `src/components/GlassWeather.jsx` wraps `CurrentWeatherWidget` and feeds it our own
  `/data/weather.json` values. The widget is presentational: it performs no network access, asserted by
  `src/components/GlassWeather.test.jsx`.
- Adds Tailwind v4 (`src/tailwind.css`), `clsx`, `tailwind-merge`, `lucide-react`, `framer-motion`.
  `src/lib/utils.js` provides the `cn` helper the registry components import as `@/lib/utils`;
  the `@` alias is set in `vite.config.js`.
- **Preflight is deliberately excluded.** Only the theme variables and utilities layers are imported so
  Tailwind cannot reset the hand-written stylesheet.
- Cost, measured: JS bundle 239 kB -> 401 kB raw (75 kB -> 128 kB gzip), CSS ~21 kB -> 61 kB.
  That is the price of framer-motion plus the icon set.
- The `.wx-glass` wrapper supplies the dark gradient the glass effect needs; `styles.css` widens the
  weather column to 290px because the widget declares `min-w-50` (200px) and would otherwise overflow.
- Night variants are selected when the source reports `is_day: false`.

Outlook days intentionally still use the provider's own cached condition artwork rather than the widget's
generic icons, because it reflects the real reported condition.

### The weather deck

The whole weather block is one dark `.wx-deck` surface so the glass widget and the researched detail read
as a single object instead of a light panel next to a dark one.

- Typical `ForecastWidget` / `ForecastWeatherWidget` are **not** used: they require a real per-day
  `high` and `low`, and the keyless WeatherAPI page reports only one temperature per day. Passing the same
  value twice would render "17° 17°" and a zero-width bar, so the outlook is built in the same glass
  language with the provider's own artwork instead.
- The widget hardcodes `text-white/50` and `text-white/60`. Those cannot reach WCAG AA on the deck
  gradient, so `.wx-deck .wx-glass` carries a 62% dark inset panel behind it. The vendored file is never
  edited.
- `qa-contrast.py` composites each layer (gradient stop, glass panel, scrim) and scores every text colour.
  All deck text passes WCAG AA at every gradient stop, worst case 4.54:1.

## Typography

**Beware duplicate selectors.** The stylesheet is append-ordered and has accumulated several definitions of
the same selector from successive edits (`.news-item` had four). A later duplicate silently wins, which is
exactly how the news image ended up on its own row: a later two-column `.news-item` overrode the
three-column one. When editing layout, `grep -n 'selector{' src/styles.css` first and reconcile every
definition rather than adding another.

The stylesheet carries a **READABLE TYPE SCALE** block near the end which is the authoritative
small-text scale and supersedes any earlier per-component size.

- **Floor is 13px.** No visible text is smaller. 8-11px declarations were removed, not just overridden.
- Body 17px (16px on phones), subtext 14-16px, labels 13px.
- `src/lib/typography.test.js` fails the build if any `font-size` in the stylesheet drops below 13px.
- `qa-font-sizes.cjs` measures every visible text node in a real browser at 1440 / 768 / 390 / 320px and
  fails if anything renders below the floor or overflows. CSS-only checks miss inherited and shorthand
  sizes, so both checks are kept.

### Editing warning

`read_file` **truncates very long lines**. `styles.css` is largely one line, so a read → regex → write
cycle silently destroyed most of it. Never round-trip this file (or any long-line file) through
read + write. Edit with `patch`, or script the edit, and verify afterwards by comparing a normalized
copy against `dist/assets/*.css` from the last good build. Recovery used exactly that comparison and
confirmed a byte-exact match.

## Condition artwork (visual weather)

The weather section is deliberately visual, and uses the provider's own condition icons.

- `weather.mjs` captures the icon reference from whichever source answered. The page path reads the
  artwork out of the markup WeatherAPI already rendered; the API path uses `condition.icon`.
- `normalizeIcon` accepts only `https://cdn.weatherapi.com/weather/<size>/<day|night>/<code>.png` and
  rewrites it to the 128x128 asset, so upstream content can never point the cache at another host.
- `icons.mjs` caches those PNGs to `media/icons/<period>-<code>.png`. `warm-icon-set.mjs` pre-seeds the
  whole documented code set (90 files, ~528 KB) so the server only ever reads.
- **The public server must not need to write.** Its systemd unit sets `ProtectSystem=strict` and
  `ReadOnlyPaths` on the app directory, so a runtime icon download would silently fail. Pre-seeding is
  what makes this work; re-run `node warm-icon-set.mjs` after deploying to a fresh host.
- Icons are served same-origin from `/media/icons/...`. The page never contacts the CDN, so the CSP stays
  at `img-src 'self'`.
- The client builds the request as `/media/icons/<period>-<code>.png?v=1`. The version token exists so a
  previously cached 404 at the CDN edge cannot shadow a file that is now present.
- `src/lib/briefing.js` `conditionTone()` maps the condition phrase to a tone
  (clear / cloud / rain / snow / storm / fog / mild) which drives the panel tint, the metric icon colour
  and the per-day outlook tint. Rain and snow are matched before cloud so "Patchy rain" is not read as cloud.
- The big glyph falls back to an inline SVG when no cached icon exists, so the layout never collapses and
  no broken image is shown.

### Cache-header rule (learned the hard way)

A long `Cache-Control` must be applied only **after** a successful file read. Setting it before the read
meant a 404 inherited `max-age=604800`, Cloudflare cached that 404 at the edge, and the icon stayed
broken for a week even after the file appeared. `server.test.mjs` now asserts a 404 never carries a
long lifetime.

## Weather source (WeatherAPI.com)

Toronto location id is `317748`. Public page: https://www.weatherapi.com/weather/q/toronto-317748

Two supported paths, tried in order by `weather.mjs`:

1. `weatherapi-api` when `WEATHERAPI_KEY` is set in `~/.hermes/.env`. Calls
   `https://api.weatherapi.com/v1/forecast.json?key=...&q=id:317748&days=3&aqi=no&alerts=yes`
   and returns current conditions plus a 3-day outlook, feels-like, humidity and UV.
2. `weatherapi-page` with no key. Parses the public Toronto page server-side for current
   conditions and the multi-day outlook.

To enable the keyed path, sign up at weatherapi.com for a free key, then add it to `.env` as
`WEATHERAPI_KEY=...` and restart the service. No frontend change or rebuild is needed. WeatherAPI free
tier is 1,000,000 calls/month; the server caches for 5 minutes so real usage is a few hundred per month.

The key never reaches the browser. The client only calls same-origin `/data/weather.json`, and the
Content-Security-Policy is `connect-src 'self'`, so no third-party weather origin is contacted by the
page. Never print the key, and never inline it into `dist/`.

Behaviour notes:

- The route always answers HTTP 200 with JSON. On upstream failure it returns `available:false` and the
  UI falls back to the researched snapshot forecast.
- Live conditions are suppressed on a stale edition so a past date never shows current weather.
- The page path does not supply feels-like, humidity, UV or a true daily high/low. Those fields stay
  `null` and the UI shows the researched snapshot value instead of inventing one.
- WeatherAPI free tier is 3-day forecast accuracy. Do not present longer ranges as free-tier data.

## Numbers that must never be invented
- Do not derive a daily high/low from the page's first outlook value; it is not a high.
- Label the researched forecast as a snapshot and keep live conditions separately attributed.

## Update content
Research today's Toronto data under the existing CONTRACT.md in ../daily-briefing. Never copy stale data forward with a new date. Never insert private information in public fields.

Run:
```
python3 /home/ubuntu/phiads-odysseus/toronto-today/publish.py --input /home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD.json
```

Then GET https://today.getphiads.com/data/latest.json and /healthz. Verify returned date, public-only content and HTTP 200 before reporting success. No frontend rebuild required for daily data changes. The last good JSON remains if validation fails; React shows a stale-date warning and the cron must report the blocker.

## Build and test
- `npm test` and `npm run build`
- `node --test server.test.mjs`
- `python3 test_publish.py`
- Browser QA: public link, mobile widths, filters, tabs, reload, theme and offline handling.

## Deployment
Units in deploy/ are installed in /etc/systemd/system. Unit service user is ubuntu, no new IAM roles, instances, paid hosting plans or open inbound firewall ports. App reads only built assets/public JSON. No restart of Hermes or outbound ingress is needed.

This README contains no credentials. Cloudflare credentials stay local and are never served. Do not print tunnel credential files.
