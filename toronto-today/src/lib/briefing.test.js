import { describe, it, expect } from 'vitest';
const helpers = await import('./briefing.js').catch(() => ({}));

describe('public briefing helpers', () => {
  it('compares the edition to Toronto today, not the UTC calendar day', () => {
    expect(helpers.torontoDate).toBeTypeOf('function');
    const beforeMidnight = new Date('2026-09-27T02:00:00Z');
    expect(helpers.torontoDate(beforeMidnight)).toBe('2026-09-26');
    expect(helpers.isStaleEdition('2026-09-26', beforeMidnight)).toBe(false);
    expect(helpers.isStaleEdition('2026-09-25', beforeMidnight)).toBe(true);
    expect(helpers.torontoDate(new Date('2026-01-01T03:00:00Z'))).toBe('2025-12-31');
  });
  it('deduplicates event URLs without losing distinct events and filters meaningful event fields', () => {
    expect(helpers.dedupeEvents).toBeTypeOf('function');
    const events = [
      {title:'Gallery day',url:'https://example.org/art/',price:'Free',location_label:'Downtown central',venue:'Example Gallery'},
      {title:'Art repeat',url:'https://example.org/art#tickets'},
      {title:'Neighbourhood walk',url:'https://example.org/walk',price:'C$10',neighborhood:'Uptown'},
      {title:'Library workshop',url:null,price:'Free admission',location_label:'Downtown north'},
      {title:'Freeway gig',url:null,price:'C$15',summary:'Free snacks included'},
    ];
    const unique = helpers.dedupeEvents(events);
    expect(unique).toHaveLength(4);
    expect(helpers.filterEvents(unique, 'gallery', 'All')).toHaveLength(1);
    expect(helpers.filterEvents(unique, '', 'Free')).toHaveLength(2);
    expect(helpers.filterEvents(unique, '', 'Downtown')).toHaveLength(2);
    expect(helpers.filterEvents(unique, ' UPTOWN ', 'All')[0].title).toBe('Neighbourhood walk');
  });
  it('normalizes only display fields, removes private fields, and rejects invalid editions', () => {
    expect(helpers.normalizeBriefing).toBeTypeOf('function');
    const data = helpers.normalizeBriefing({
      schema_version: 1,
      meta: {date_iso:'2026-09-01', generated_at:'A research timestamp', content_note:'An editorial note', personal_name:'PRIVATE'},
      full_briefing_text:'PRIVATE', focus_prompt:'PRIVATE',
      local_events: [null, {title:'Example gathering', url:'javascript:alert(1)', summary:'Description', secret:'PRIVATE'}],
      best_bets: [1,2,3,4].map(n => ({title:`Pick ${n}`, url:`https://example.org/${n}`})),
      social_options: [1,2,3,4].map(n => ({title:`Social ${n}`, url:`https://example.org/s${n}`})),
    });
    expect(JSON.stringify(data)).not.toContain('PRIVATE');
    expect(data.local_events).toHaveLength(1);
    expect(data.local_events[0].url).toBeNull();
    expect(data.best_bets).toHaveLength(3);
    // No hard cap on social options any more: the reader picks the count.
    expect(data.social_options).toHaveLength(4);
    expect(data.business_news).toEqual([]);
    expect(() => helpers.normalizeBriefing({meta:{date_iso:'2026-02-31'}})).toThrow();
    expect(() => helpers.normalizeBriefing({})).toThrow();
    expect(() => helpers.normalizeBriefing({schema_version:99,meta:{date_iso:'2026-09-01'}})).toThrow();
  });
  it('allows only absolute http and https source URLs', () => {
    expect(helpers.safeUrl, 'safeUrl is implemented').toBeTypeOf('function');
    expect(helpers.safeUrl('https://example.org/event')).toBe('https://example.org/event');
    expect(helpers.safeUrl('http://example.org/')).toBe('http://example.org/');
    for (const value of ['javascript:alert(1)', 'data:text/html,hi', '//evil.test', '/relative', 'https://user:secret@example.org', null, {}]) {
      expect(helpers.safeUrl(value)).toBeNull();
    }
  });
  it('maps provider condition phrases to visual tones, checking rain and snow before cloud', () => {
    expect(helpers.conditionTone).toBeTypeOf('function');
    expect(helpers.conditionTone('Sunny')).toBe('clear');
    expect(helpers.conditionTone('Clear')).toBe('clear');
    expect(helpers.conditionTone('Overcast')).toBe('cloud');
    expect(helpers.conditionTone('Partly cloudy')).toBe('cloud');
    expect(helpers.conditionTone('Patchy rain possible')).toBe('rain');
    expect(helpers.conditionTone('Moderate or heavy rain shower')).toBe('rain');
    expect(helpers.conditionTone('Light drizzle')).toBe('rain');
    expect(helpers.conditionTone('Light snow')).toBe('snow');
    expect(helpers.conditionTone('Moderate or heavy sleet')).toBe('snow');
    expect(helpers.conditionTone('Blizzard')).toBe('snow');
    expect(helpers.conditionTone('Thundery outbreaks possible')).toBe('storm');
    expect(helpers.conditionTone('Patchy light rain with thunder')).toBe('storm');
    expect(helpers.conditionTone('Fog')).toBe('fog');
    expect(helpers.conditionTone('')).toBe('mild');
    expect(helpers.conditionTone(null)).toBe('mild');
    expect(helpers.conditionTone('Something new')).toBe('mild');
  });
  it('accepts only same-origin cached media as an image source', () => {
    expect(helpers.localMediaUrl).toBeTypeOf('function');
    expect(helpers.localMediaUrl('/media/icons/day-122.png')).toBe('/media/icons/day-122.png');
    expect(helpers.localMediaUrl('/media/icons/night-116.png')).toBe('/media/icons/night-116.png');
    expect(helpers.localMediaUrl('/media/0123456789abcdef.jpg')).toBe('/media/0123456789abcdef.jpg');
    for (const bad of ['https://cdn.weatherapi.com/weather/128x128/day/122.png', '//evil.example.com/x.png',
      '/media/icons/../../secret.png', '/media/icons/day-12.png', '/media/icons/day-122.svg',
      'javascript:alert(1)', '', null, undefined]) {
      expect(helpers.localMediaUrl(bad)).toBeNull();
    }
  });
});
