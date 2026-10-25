// Cloudflare Pages Function: GET /data/weather.json
//
// Replaces the weather route the Lightsail server.mjs used to serve. It
// reuses the app's own weather.mjs adapter unchanged: the WeatherAPI REST
// API when the WEATHERAPI_KEY secret is set on the Pages project, otherwise
// the keyless public Toronto page parse. The key never reaches the browser.
// Responses are edge-cached for 5 minutes, matching the old server's
// behaviour. On any failure it answers 200 with available:false and the UI
// falls back to the researched snapshot, exactly as before.
import { fetchWeather, weatherUnavailable } from "../../weather.mjs";

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/data/weather.json", context.request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let data;
  try {
    data = await fetchWeather({ apiKey: context.env.WEATHERAPI_KEY || "" });
  } catch {
    data = weatherUnavailable("weather function error");
  }
  const response = Response.json(data, {
    headers: { "cache-control": "public, max-age=300" },
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
