import { CurrentWeatherWidget } from './ui/weather-widget.tsx';
import { conditionTone } from '../lib/briefing';

// The registry widget takes a fixed condition union, so the provider's phrasing
// is mapped onto it. Night variants are used when the source reports night.
export function toneToWidgetCondition(tone, isDay) {
  const night = isDay === false;
  switch (tone) {
    case 'clear':
      return night ? 'night' : 'sunny';
    case 'rain':
    case 'storm':
      return 'rainy';
    case 'snow':
      return 'snowy';
    case 'fog':
      return 'cloudy';
    case 'cloud':
    default:
      return night ? 'night-cloudy' : 'cloudy';
  }
}

/**
 * The einui liquid-glass weather widget, driven entirely by our own WeatherAPI
 * data. It performs no network access of its own: every field below comes from
 * the same-origin /data/weather.json payload.
 */
export default function GlassWeather({ weather, className = '' }) {
  if (!weather || weather.available !== true) return null;
  const condition = toneToWidgetCondition(
    conditionTone(weather.condition || ''),
    weather.is_day,
  );

  return (
    <div className={`wx-glass ${className}`.trim()}>
      <CurrentWeatherWidget
        location={weather.location || 'Toronto'}
        temperature={Math.round(weather.temperature_c)}
        feelsLike={Number.isFinite(weather.feels_like_c) ? Math.round(weather.feels_like_c) : undefined}
        high={Number.isFinite(weather.high_c) ? Math.round(weather.high_c) : undefined}
        low={Number.isFinite(weather.low_c) ? Math.round(weather.low_c) : undefined}
        condition={condition}
        humidity={Number.isFinite(weather.humidity) ? weather.humidity : undefined}
        windSpeed={Number.isFinite(weather.wind_kph) ? Math.round(weather.wind_kph) : undefined}
      />
    </div>
  );
}
