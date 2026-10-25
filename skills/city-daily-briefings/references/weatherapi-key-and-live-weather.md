# WeatherAPI key and the live-weather payload

Why the key matters, how to wire it, what it unlocks, and the two traps that bit during setup.

## What the keyless path cannot do

Without a key, weather comes from a server-side parse of the public Toronto page
(`parseWeatherApiPage`). That path returns real values for condition, temperature, wind,
precipitation, pressure and the daily outlook, but has **no** source for:

feels-like, humidity, UV, true daily low, gust, visibility, and **no hourly data at all**.

The Apple-style layout Preyansh asked for is built around an hourly strip and a condition tile
grid, so almost all of it is unfillable without the key. Leave unavailable fields `null` and
omit the tile. Never invent a number to fill a tile.

## Setup (4 steps, and step 2 is the one that gets missed)

1. Write the key to `.env` in the app directory. `.env` is already gitignored. Never print the
   key to stdout, and never put it in frontend code or a built asset.

2. **Add `EnvironmentFile` to the systemd unit.** The unit shipped without it, so the service
   could not see `.env` at all and silently kept using the keyless path:

   ```
   EnvironmentFile=/home/ubuntu/phiads-odysseus/toronto-today/.env
   ```

   Then `sudo systemctl daemon-reload && sudo systemctl restart toronto-today.service`.

   Read-only sandboxing (`ProtectSystem=strict`, `ReadOnlyPaths=`, `ProtectHome=read-only`)
   does **not** block reading an env file. Reading is fine; writing is what is blocked.

3. Confirm the service actually received it, without printing the value:
   `sudo systemctl show toronto-today.service -p EnvironmentFiles`

4. Confirm the payload switched sources. `source` must read `weatherapi-api`, not
   `weatherapi-page`:

   ```
   curl -sS https://today.getphiads.com/data/weather.json | python3 -c "
   import json,sys; d=json.load(sys.stdin)
   print(d.get('source'), d.get('feels_like_c'), d.get('humidity'), len(d.get('hourly') or []))"
   ```

## Endpoint and field mapping

```
https://api.weatherapi.com/v1/forecast.json?key=<KEY>&q=id:317748&days=3&aqi=no&alerts=yes
```

Location is pinned by WeatherAPI location id `317748` (Toronto), not by name.

| Source | Field | Notes |
|---|---|---|
| `current.temp_c`, `condition.text`, `condition.icon` | temperature, condition, icon | |
| `current.feelslike_c`, `humidity`, `uv` | feels-like, humidity, UV index | null in the keyless path |
| `current.gust_kph`, `vis_km`, `wind_dir`, `is_day` | gusts, visibility, direction, day/night | |
| `current.last_updated_epoch` | freshness | also the anchor for slicing hourly |
| `forecastday[0].day.maxtemp_c / mintemp_c` | true daily high / low | low is null in the keyless path |
| `forecastday[].day.daily_chance_of_rain` | rain chance | |
| `forecastday[0].hour[]` | hourly strip | `temp_c`, `feelslike_c`, `chance_of_rain`, `is_day`, `time`, `time_epoch`, `condition.icon` |

Hourly slice: keep entries with `time_epoch >= last_updated_epoch - 1800`, then take 8. The
half-hour slack stops the current hour being dropped at the boundary.

`forecastday[].date` is an ISO date; the UI wants a weekday. Format with a **midday** anchor to
avoid shifting the day across timezones:

```js
new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {weekday:'short', timeZone:'America/Toronto'})
```

## Trap 1: hourly icons silently vanish

`iconUrls()` in `weather.mjs` originally collected icon codes from `current` and `daily` only.
Because `ensureIcons()` returns a map only for the URLs it was handed, hourly-only codes were
absent from the map, so `attach()` set `icon_local: null` **even though the PNG was already
seeded on disk**. Symptom: current and most daily icons fine, but a few hourly entries and
every night-period hourly entry had no artwork.

Fix: collect hourly too.

```js
for (const hour of (weather && weather.hourly) || []) add(hour.icon_code, hour.icon_period);
```

Any time a new collection of weather entries is added, extend `iconUrls()` as well. The
server-side `attach` loop in `server.mjs` must also be extended
(`withIcons.hourly = (fresh.hourly || []).map(attach)`).

Diagnostic that separates the two possible causes: if the icon **file exists** on disk but
`icon_local` is null, it is the collection bug, not a missing download. A missing file shows as
a genuine absence in `media/icons/`.

## Trap 2: night icons

WeatherAPI returns protocol-relative URLs like
`//cdn.weatherapi.com/weather/64x64/night/122.png`. The period segment matters: the same
condition code has separate day and night files. If only day icons resolve, suspect
`iconUrls`; if the period is ignored, the day file will be served for a night hour.

## Ceiling is not a WeatherAPI field

The reference design had a "Ceiling" tile. Ceiling is an aviation metric from METAR reports and
WeatherAPI does not expose it. Substituted UV index and visibility, which are the closest real
fields. Say so plainly rather than labelling an invented value as ceiling.

## Layout notes for the Apple-style section

The block is `.wx-ap*` (sky gradient, dark-glass hero, translucent cards and tiles). Two things
that are not obvious:

- **The hero needs its own dark scrim.** The vendored einui widget hardcodes `text-white/50` and
  `text-white/60`. Over a light blue gradient its own `bg-white/10` panel makes that text
  unreadable. A dark hero panel behind it (`rgba(8,18,28,.55)`) restores contrast without
  editing the vendored file. Same lever as the earlier dark deck: darken what sits **behind**
  a component you must not modify.
- The hourly strip is 8 fixed columns on wide screens and switches to a horizontal scroller
  (`display:flex; overflow-x:auto`) by 1100px so eight cards never crush into unreadable slivers.

## Verification

```
node qa-apple-weather.cjs    # hourly card count, icons loaded, tile labels+values, overflow
```

Assert: every hourly card has a **loaded** icon, tile values are non-empty, `broken` is empty,
`crossOrigin` is empty, and `scrollOverflow` is false at both 1400px and 390px.

## Security

The key is server-side only. The browser reads `/data/weather.json`, which the server fills, so
the key cannot be lifted from the page. `connect-src 'self'` stays intact and the page makes
zero third-party requests. Confirm with `external: []` from any browser QA script.
