import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { fixture } from './test/fixtures';
import * as app from './App';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); delete document.documentElement.dataset.theme; });

// Weather now comes from our own same-origin proxy, so no third-party origin is called.
const liveWeather = {
  available: true,
  source: 'weatherapi-page',
  source_label: 'WeatherAPI.com Toronto page',
  location: 'Toronto',
  condition: 'Overcast',
  temperature_c: 17.5,
  feels_like_c: 16.2,
  wind_kph: 13,
  precip_mm: 0,
  pressure_mb: 1022,
  high_c: 22,
  low_c: 11,
  fetched_at: new Date().toISOString(),
  daily: [
    { label: 'Sun', temperature_c: 17.8, condition: 'Overcast', icon_code: '122', icon_period: 'day', is_day: true, icon_local: '/media/icons/day-122.png' },
    { label: 'Mon', temperature_c: 17.0, condition: 'Light rain', icon_code: '296', icon_period: 'day', is_day: true, icon_local: '/media/icons/day-296.png' },
  ],
  icon_code: '122',
  icon_period: 'day',
  is_day: true,
  icon_local: '/media/icons/day-122.png',
};

const torontoToday = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// A current edition is required before live weather is trusted over the snapshot.
const freshFixture = () => ({ ...fixture, meta: { ...fixture.meta, date_iso: torontoToday() } });

const liveImages = { 'https://example.org/print': 'media/0123456789abcdef.jpg' };

function routeFetch(weather = liveWeather, briefing = fixture, images = liveImages) {
  return vi.fn(async url => {
    const target = String(url);
    if (target.includes('/data/weather.json')) return { ok: true, json: async () => weather };
    if (target.includes('/data/images.json')) return { ok: true, json: async () => images };
    return { ok: true, json: async () => briefing };
  });
}

it('renders an honest public dashboard with source links, capped selections, filters, navigation, and theme', async () => {
  expect(app.default).toBeTypeOf('function');
  vi.stubGlobal('fetch', routeFetch());
  const user = userEvent.setup();
  render(<app.default />);
  expect(screen.getByRole('heading', {name:'Toronto Today',level:1})).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  await screen.findByText(fixture.meta.content_note);
  expect(screen.getByText(/not today’s Toronto edition/i)).toBeInTheDocument();
  expect(screen.getAllByText(fixture.meta.generated_at).length).toBeGreaterThan(0);
  expect(document.body.textContent).not.toContain('PRIVATE TEST MARKER');
  // The best-bets section was removed: its content duplicated the other sections.
  expect(screen.queryByText('Make a little room for the city')).not.toBeInTheDocument();
  // And no event may appear in two sections at once.
  const aroundTitles = [...document.querySelectorAll('.overview-grid .event-grid .event-card h3')].map(h => h.textContent.trim());
  const socialTitles = [...document.querySelectorAll('.social-grid .event-card h3')].map(h => h.textContent.trim());
  expect(aroundTitles.length).toBeGreaterThan(0);
  expect(aroundTitles.filter(t => socialTitles.includes(t))).toEqual([]);
  expect(screen.queryByText('Suggested outing 4')).not.toBeInTheDocument();
  // The reader now controls how many items to see (10 by default), so the fourth
  // social option is expected to render rather than being silently capped at three.
  expect(screen.getByText('Social gathering 4')).toBeInTheDocument();
  expect(screen.queryByText('Example print fair duplicate')).not.toBeInTheDocument();
  const source = screen.getByRole('link', {name:/Example print fair/});
  expect(source).toHaveAttribute('rel','noopener noreferrer');
  await user.click(screen.getByRole('button', {name:'Events',exact:true}));
  await user.click(screen.getByRole('button', {name:'Free',exact:true}));
  expect(screen.queryByRole('link', {name:/Example chamber concert/})).not.toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', {name:'Search events'}),'archive');
  expect(screen.getByRole('link', {name:/Example archive exhibition/})).toBeInTheDocument();
  expect(screen.queryByRole('link', {name:/Example print fair/})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', {name:'News',exact:true}));
  expect(screen.getByRole('link', {name:/Example city business headline/})).toBeInTheDocument();
  await user.click(screen.getByRole('button', {name:'Networking',exact:true}));
  expect(screen.getByRole('link', {name:/Example professional meetup/})).toBeInTheDocument();
  await user.click(screen.getByRole('button', {name:'Switch to dark theme'}));
  expect(document.documentElement).toHaveAttribute('data-theme','dark');
});

it('shows a cached local image when the source has one and nothing when it does not', async () => {
  vi.stubGlobal('fetch', routeFetch(liveWeather, freshFixture()));
  render(<app.default />);
  await screen.findByText(fixture.meta.content_note);
  const images = await screen.findAllByRole('img');
  // Only same-origin cached media is ever used as a src.
  expect(images.map(i => i.getAttribute('src'))).toEqual(['/media/0123456789abcdef.jpg']);
  expect(images[0]).toHaveAttribute('loading','lazy');
  // An item with no cached image renders no broken <img> at all.
  expect(screen.getByRole('link', {name:/Example chamber concert/})).toBeInTheDocument();
  expect(images.length).toBe(1);
});

it('shows WeatherAPI live conditions, its attribution link and the extended outlook', async () => {
  vi.stubGlobal('fetch', routeFetch(liveWeather, freshFixture()));
  render(<app.default />);
  expect(await screen.findByText('18°')).toBeInTheDocument();
  // The widget renders its own label for the mapped condition.
  const weatherRegion = screen.getByRole('region', {name:'Toronto weather'});
  expect(within(weatherRegion).getAllByText('Cloudy').length).toBeGreaterThan(0);
  expect(screen.getByText(/WeatherAPI\.com Toronto page/)).toBeInTheDocument();
  expect(screen.getByRole('link', {name:/WeatherAPI\.com · Toronto/})).toHaveAttribute(
    'href','https://www.weatherapi.com/weather/q/toronto-317748');
  const outlook = screen.getByRole('region', {name:'Extended outlook'});
  expect(within(outlook).getByText('Mon')).toBeInTheDocument();
  // The einui liquid-glass widget carries the current conditions.
  expect(document.querySelector('.wx-glass')).toBeTruthy();
  expect(screen.getByText('Toronto')).toBeInTheDocument();
  // Outlook days still use the provider's own cached artwork.
  const outlookGlyphs = [...outlook.querySelectorAll('img')];
  expect(outlookGlyphs.map(i => i.getAttribute('src'))).toEqual(['/media/icons/day-296.png']);
  // Condition tone drives the visual treatment.
  expect(document.querySelector('.wx-ap').dataset.tone).toBe('cloud');
  // No stale-edition warning on a current edition.
  expect(screen.queryByText(/not today’s Toronto edition/i)).not.toBeInTheDocument();
});

it('suppresses live weather on a stale edition so a past date cannot show current conditions', async () => {
  vi.stubGlobal('fetch', routeFetch());
  render(<app.default />);
  await screen.findByText(fixture.meta.content_note);
  expect(screen.queryByText(/WeatherAPI\.com Toronto page/)).not.toBeInTheDocument();
  expect(screen.getByText(/Saved forecast · briefing time/)).toBeInTheDocument();
});

it('falls back to the saved snapshot when the weather feed is unavailable', async () => {
  vi.stubGlobal('fetch', routeFetch({ available: false, source: 'unavailable', note: 'Live weather unavailable: upstream request failed' }, freshFixture()));
  render(<app.default />);
  expect(await screen.findByText(/Saved forecast · briefing time/)).toBeInTheDocument();
  expect(screen.queryByText(/WeatherAPI\.com Toronto page/)).not.toBeInTheDocument();
  expect(screen.getByText('Clear')).toBeInTheDocument();
});
