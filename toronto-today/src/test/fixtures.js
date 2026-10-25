// Synthetic test-only data. Never imported by the application.
export const fixture = {
  schema_version: 1,
  meta: {date_iso:'2020-01-02', date_display:'Thursday, January 2, 2020', edition:'Morning edition', generated_at:'January 2, 2020 at 7:30 AM EST', content_note:'A test research snapshot, not a live listings feed.'},
  weather: {temperature:'5°',condition:'Clear',summary:'Synthetic weather for interface testing.',high_low:'8° / 2°',wind:'10 km/h',sun:'Sunset 5 PM',precipitation:'Dry',source_url:'https://example.org/weather'},
  local_events: [
    {title:'Example print fair',category:'Art',time:'10 AM',venue:'Example Hall',neighborhood:'Central',location_label:'Downtown central',price:'Free',status:'Drop-in',summary:'A synthetic event.',url:'https://example.org/print'},
    {title:'Example chamber concert',category:'Music',time:'7 PM',venue:'Example Stage',neighborhood:'North',location_label:'Uptown',price:'C$20',status:'Check tickets',summary:'A second synthetic event.',url:'https://example.org/concert'},
  ],
  cultural_events: [
    {title:'Example print fair duplicate',price:'Free',url:'https://example.org/print/'},
    {title:'Example archive exhibition',category:'Exhibition',venue:'Example Archive',location_label:'Downtown north',price:'Free',url:'https://example.org/archive'},
  ],
  best_bets: [1,2,3,4].map(n => ({title:`Suggested outing ${n}`,category:'Editor selection',why:'Synthetic selection.',url:`https://example.org/bet/${n}`})),
  social_options: [1,2,3,4].map(n => ({title:`Social gathering ${n}`,summary:'Synthetic social option.',url:`https://example.org/social/${n}`})),
  networking: [{title:'Example professional meetup',category:'Professional community',summary:'A synthetic meetup.',url:'https://example.org/meetup'}],
  business_news: [{title:'Example city business headline',why_it_matters:'A synthetic business context.',source:'Example publication',url:'https://example.org/news'}],
  business_source_note:'Source availability note.',
  venue_checks:[{venue:'Example Hall',status:'Check the organizer before travelling.',state:'caution'}],
  focus_prompt:'PRIVATE TEST MARKER', full_briefing_text:'PRIVATE TEST MARKER',
};
