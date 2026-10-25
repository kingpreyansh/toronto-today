// WeatherAPI.com adapter. Runs server-side only so no key ever reaches the browser.
// Two paths: the official REST API when a key is configured, and the public
// Toronto forecast page as a keyless source. Both return the same shape.

export const WEATHERAPI_LOCATION_ID = '317748';
export const WEATHERAPI_PAGE = 'https://www.weatherapi.com/weather/q/toronto-317748';
export const ICON_CDN_HOST = 'cdn.weatherapi.com';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36';

const num = value => {
  const n = Number.parseFloat(String(value ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function titleCase(slug) {
  return String(slug || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function pick(text, pattern) {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

// Normalizes any WeatherAPI condition image reference to a known 128x128
// day/night asset. Returns null for anything not from the provider's own CDN,
// so upstream page content can never point the cache at an arbitrary host.
function normalizeIcon(raw) {
  if (!raw) return null;
  let value = String(raw).trim();
  if (value.startsWith('//')) value = 'https:' + value;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== ICON_CDN_HOST) return null;
  const match = url.pathname.match(/\/weather\/(\d+x\d+)\/(day|night)\/(\d{3,4})\.png$/);
  if (!match) return null;
  const [, , period, code] = match;
  return { code, period, is_day: period === 'day', url: `https://${ICON_CDN_HOST}/weather/128x128/${period}/${code}.png` };
}

const iconFields = icon => icon
  ? { icon_code: icon.code, icon_period: icon.period, is_day: icon.is_day }
  : { icon_code: null, icon_period: null, is_day: null };

// Every condition image a payload needs, deduplicated.
export function iconUrls(weather) {
  const urls = new Set();
  const add = (code, period) => {
    if (code && period) urls.add(`https://${ICON_CDN_HOST}/weather/128x128/${period}/${code}.png`);
  };
  add(weather && weather.icon_code, weather && weather.icon_period);
  for (const day of (weather && weather.daily) || []) add(day.icon_code, day.icon_period);
  // Hourly icons matter too: without this the hourly strip loses its artwork.
  for (const hour of (weather && weather.hourly) || []) add(hour.icon_code, hour.icon_period);
  return [...urls];
}

export function parseWeatherApiPage(html) {
  const raw = typeof html === 'string' ? html : '';
  if (!raw.includes('weatherapi-weather-current-temp')) {
    throw new Error('WeatherAPI page did not contain readable conditions');
  }
  const temperature_c = num(pick(raw, /class="weatherapi-weather-current-temp">\s*([-\d.]+)/));
  if (temperature_c === null) throw new Error('WeatherAPI page had no current temperature');

  const descriptions = [...raw.matchAll(/class="weatherapi_descr">([^<]*)</g)].map(m => m[1].trim());
  const condition = descriptions.find(t => t && !/^(wind|precip)/i.test(t)) || null;
  if (!condition) throw new Error('WeatherAPI page had no condition text');

  const canonical = pick(raw, /<link rel="canonical"[^>]*href="[^"]*\/weather\/q\/([a-z0-9-]+)-\d+"/i);
  const location = canonical ? titleCase(canonical.replace(/-\d+$/, '')) : titleCase(pick(raw, /<title>\s*([^<]*?)\s+Weather/i));

  // The provider's own condition artwork, taken from the page it already rendered.
  const currentIcon = normalizeIcon(
    pick(raw, /weatherapi-weather-todays-stats-big-pict[\s\S]{0,240}?src="([^"]+)"/i)
  );

  const daily = [];
  for (const block of raw.split(/class="weatherapi-weather-forecast-day"/).slice(1)) {
    const label = pick(block, /class="weatherapi-weathe-forecast-day-abbr">\s*([A-Za-z]{2,9})\s*</);
    const temperature = num(pick(block, /class="weatherapi-weather-forecast-day-temp">\s*([-\d.]+)/));
    const dayCondition = pick(block, /<img[^>]*alt="([^"]+)"/);
    const icon = normalizeIcon(pick(block, /src="([^"]*cdn\.weatherapi\.com[^"]*)"/i));
    if (label && temperature !== null) {
      daily.push({ label, temperature_c: temperature, condition: dayCondition || null, ...iconFields(icon) });
    }
  }

  return {
    available: true,
    source: 'weatherapi-page',
    source_label: 'WeatherAPI.com Toronto page',
    location,
    location_id: WEATHERAPI_LOCATION_ID,
    condition,
    temperature_c,
    feels_like_c: null,
    wind_kph: num(pick(raw, /Wind:\s*([\d.]+)\s*kmph/i)),
    precip_mm: num(pick(raw, /Precip:\s*([\d.]+)\s*mm/i)),
    pressure_mb: num(pick(raw, /Pressure:\s*([\d.]+)\s*mb/i)),
    humidity: null,
    uv: null,
    high_c: daily[0]?.temperature_c ?? null,
    low_c: null,
    ...iconFields(currentIcon),
    daily,
    fetched_at: new Date().toISOString(),
  };
}

// WeatherAPI returns ISO dates for forecast days; the UI wants a weekday.
function weekdayLabel(iso) {
  if (!iso || typeof iso !== 'string') return '';
  try {
    // Midday avoids any date shifting across timezones.
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {
      weekday: 'short', timeZone: 'America/Toronto',
    });
  } catch {
    return iso;
  }
}

export function normalizeWeatherApiJson(payload) {
  const loc = payload?.location || {};
  const cur = payload?.current || {};
  if (!Number.isFinite(cur.temp_c)) throw new Error('WeatherAPI payload had no current temperature');
  const days = Array.isArray(payload?.forecast?.forecastday) ? payload.forecast.forecastday : [];
  const first = days[0]?.day || {};
  return {
    available: true,
    source: 'weatherapi-api',
    source_label: 'WeatherAPI.com API',
    location: loc.name || 'Toronto',
    location_id: WEATHERAPI_LOCATION_ID,
    tz_id: loc.tz_id || 'America/Toronto',
    condition: cur.condition?.text || null,
    temperature_c: cur.temp_c,
    feels_like_c: Number.isFinite(cur.feelslike_c) ? cur.feelslike_c : null,
    wind_kph: Number.isFinite(cur.wind_kph) ? cur.wind_kph : null,
    precip_mm: Number.isFinite(cur.precip_mm) ? cur.precip_mm : null,
    pressure_mb: Number.isFinite(cur.pressure_mb) ? cur.pressure_mb : null,
    humidity: Number.isFinite(cur.humidity) ? cur.humidity : null,
    uv: Number.isFinite(cur.uv) ? cur.uv : null,
    gust_kph: Number.isFinite(cur.gust_kph) ? cur.gust_kph : null,
    vis_km: Number.isFinite(cur.vis_km) ? cur.vis_km : null,
    wind_dir: cur.wind_dir || null,
    is_day: cur.is_day === 1 || cur.is_day === true,
    high_c: Number.isFinite(first.maxtemp_c) ? first.maxtemp_c : null,
    low_c: Number.isFinite(first.mintemp_c) ? first.mintemp_c : null,
    rain_chance: Number.isFinite(first.daily_chance_of_rain) ? first.daily_chance_of_rain : null,
    last_updated_epoch: Number.isFinite(cur.last_updated_epoch) ? cur.last_updated_epoch : null,
    ...iconFields(normalizeIcon(cur.condition?.icon)),
    // Next few hours, starting at the current hour, for the hourly strip.
    hourly: (() => {
      const hours = Array.isArray(days[0]?.hour) ? days[0].hour : [];
      const nowEpoch = Number.isFinite(cur.last_updated_epoch)
        ? cur.last_updated_epoch
        : Math.floor(Date.now() / 1000);
      return hours
        .filter(h => Number.isFinite(h?.time_epoch) && h.time_epoch >= nowEpoch - 1800)
        .slice(0, 8)
        .map(h => ({
          label: h.time ? String(h.time).slice(-5) : '',
          temperature_c: Number.isFinite(h.temp_c) ? h.temp_c : null,
          feels_like_c: Number.isFinite(h.feelslike_c) ? h.feelslike_c : null,
          condition: h.condition?.text || null,
          precip_chance: Number.isFinite(h.chance_of_rain) ? h.chance_of_rain : null,
          is_day: h.is_day === 1 || h.is_day === true,
          ...iconFields(normalizeIcon(h.condition?.icon)),
        }));
    })(),
    daily: days.map(day => ({
      label: weekdayLabel(day.date),
      date: day.date || '',
      temperature_c: Number.isFinite(day.day?.avgtemp_c) ? day.day.avgtemp_c : day.day?.maxtemp_c ?? null,
      high_c: Number.isFinite(day.day?.maxtemp_c) ? day.day.maxtemp_c : null,
      low_c: Number.isFinite(day.day?.mintemp_c) ? day.day.mintemp_c : null,
      rain_chance: Number.isFinite(day.day?.daily_chance_of_rain) ? day.day.daily_chance_of_rain : null,
      condition: day.day?.condition?.text || null,
      ...iconFields(normalizeIcon(day.day?.condition?.icon)),
    })),
    fetched_at: new Date().toISOString(),
  };
}

export function weatherUnavailable(reason) {
  return { available: false, source: 'unavailable', source_label: null, note: `Live weather unavailable: ${reason}` };
}

async function get(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {signal: controller.signal, headers: {'User-Agent': UA, Accept: 'application/json,text/html'}});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Order: official API (with key) -> public WeatherAPI page -> caller's fallback.
export async function fetchWeather({apiKey = process.env.WEATHERAPI_KEY || '', pageUrl = WEATHERAPI_PAGE} = {}) {
  const attempts = [];
  if (apiKey) {
    attempts.push(['weatherapi-api', async () =>
      normalizeWeatherApiJson(JSON.parse(await get(
        `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(apiKey)}&q=id:${WEATHERAPI_LOCATION_ID}&days=3&aqi=no&alerts=yes`
      )))]);
  }
  attempts.push(['weatherapi-page', async () => parseWeatherApiPage(await get(pageUrl))]);

  for (const [name, run] of attempts) {
    try {
      const result = await run();
      if (result?.available) return result;
    } catch (error) {
      if (name === 'weatherapi-api' && /HTTP 401|HTTP 403/.test(error.message)) {
        attempts.failure = 'WeatherAPI key was rejected, used the public page';
        continue;
      }
    }
  }
  return weatherUnavailable(attempts.failure || 'no usable WeatherAPI source responded');
}
