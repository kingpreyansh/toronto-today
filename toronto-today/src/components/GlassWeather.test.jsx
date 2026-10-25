import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlassWeather, { toneToWidgetCondition } from './GlassWeather.jsx';

const live = {
  available: true,
  source: 'weatherapi-page',
  source_label: 'WeatherAPI.com Toronto page',
  location: 'Toronto',
  condition: 'Overcast',
  temperature_c: 17.5,
  feels_like_c: null,
  high_c: 17.8,
  low_c: null,
  wind_kph: 13,
  precip_mm: 0,
  humidity: null,
  is_day: true,
  icon_code: '122',
  icon_period: 'day',
};

afterEach(() => vi.unstubAllGlobals());

describe('toneToWidgetCondition', () => {
  it('maps provider tones onto the widget condition union', () => {
    expect(toneToWidgetCondition('clear', true)).toBe('sunny');
    expect(toneToWidgetCondition('clear', false)).toBe('night');
    expect(toneToWidgetCondition('cloud', true)).toBe('cloudy');
    expect(toneToWidgetCondition('cloud', false)).toBe('night-cloudy');
    expect(toneToWidgetCondition('rain', true)).toBe('rainy');
    expect(toneToWidgetCondition('storm', true)).toBe('rainy');
    expect(toneToWidgetCondition('snow', true)).toBe('snowy');
    expect(toneToWidgetCondition('fog', true)).toBe('cloudy');
    expect(toneToWidgetCondition('mild', true)).toBe('cloudy');
    expect(toneToWidgetCondition(undefined, undefined)).toBe('cloudy');
  });
});

describe('GlassWeather', () => {
  it('renders real values from our own payload and makes no network request', () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    render(<GlassWeather weather={live} />);
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('18°')).toBeInTheDocument();
    expect(screen.getByText('Cloudy')).toBeInTheDocument();
    expect(screen.getByText(/H: 18°/)).toBeInTheDocument();
    expect(screen.getByText(/13 km\/h/)).toBeInTheDocument();
    // Presentational only: it must never fetch on its own.
    expect(spy).not.toHaveBeenCalled();
  });

  it('omits optional fields the upstream does not provide, rather than inventing them', () => {
    render(<GlassWeather weather={live} />);
    expect(screen.queryByText(/Feels like/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^L:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
  });

  it('renders nothing without a usable live payload', () => {
    const unavailable = render(<GlassWeather weather={{ available: false }} />);
    expect(unavailable.container).toBeEmptyDOMElement();
    const empty = render(<GlassWeather weather={null} />);
    expect(empty.container).toBeEmptyDOMElement();
  });
});
