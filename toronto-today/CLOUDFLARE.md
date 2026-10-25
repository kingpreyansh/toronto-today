# Toronto Today on Cloudflare Pages

Migration target for https://today.getphiads.com/ (currently Lightsail +
Cloudflare tunnel; see HOSTING.md for the original setup). The Lightsail
deployment stays live as fallback until the DNS cutover is verified.

## Pages project settings

- Project name: `toronto-today`
- Repository: `kingpreyansh/toronto-today`, production branch `main`
- Root directory: `toronto-today`
- Framework preset: Vite (or None with the settings below)
- Build command: `npm run build && node scripts/copy-public-data.mjs`
- Build output directory: `dist`
- Environment variable (optional, encrypted): `WEATHERAPI_KEY`
  - Without it, live weather uses the keyless public-page parse in
    weather.mjs. With it, the official WeatherAPI REST API is used.
  - Use a NEW key created for this deployment. The Lightsail key never
    leaves that box.

## How the pieces map

- Static app: Vite build into `dist/`, as before.
- `/data/latest.json`, `/data/images.json`, `/data/credits.json`,
  `/data/learning.json`: copied from `data/` into `dist/data/` by
  scripts/copy-public-data.mjs during the build.
- `/data/weather.json`: served live by the Pages Function
  `functions/data/weather.json.js`, which reuses `weather.mjs` unchanged.
- `/media/...`: the warmed image cache, served from a Cloudflare R2
  bucket named `toronto-today-media`, bound to the Pages project as
  `MEDIA` and read by `functions/media/[[path]].js`. Object keys mirror
  the path under `/media/` (`/media/icons/day-113.png` is key
  `icons/day-113.png`). `media/` itself is not in git (about 63 MB,
  regenerable by warm-images.mjs from the source URLs in
  data/images.json). The current cache was seeded into the bucket once at
  migration time; the daily flow uploads each edition's newly warmed
  files. Decision made by Preyansh on Oct 25, 2026: R2, not git.

## Daily publish flow (after cutover)

1. Research today's edition and validate it exactly as CONTRACT.md and
   publish.py require (publish.py remains the validator of record).
2. Replace `data/latest.json` (and refresh `data/images.json`,
   `data/credits.json`, `data/learning.json` when they change), warm images,
   upload the newly warmed media files to the `toronto-today-media` R2
   bucket under their `/media/`-relative keys, then commit and push to
   `main`.
3. Pages rebuilds and deploys automatically. Verify the live
   `/data/latest.json` reports today's `meta.date_iso` before calling the
   edition published.

## Cutover

- First deploy goes to the project's `*.pages.dev` URL only. The custom
  domain `today.getphiads.com` is attached only after a supervised test
  edition verifies on pages.dev (page loads, data files 200, weather
  function answers, images checked).
- DNS for getphiads.com is already on Cloudflare, so attaching the custom
  domain is a Pages-side action; the Lightsail tunnel stays up as the
  rollback until the cutover is verified.
