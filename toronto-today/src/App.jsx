import {useEffect,useMemo,useState,useCallback} from 'react';
import {useBriefing} from './hooks/useBriefing';
import {dedupeEvents,filterEvents,isStaleEdition,safeUrl,conditionTone,localMediaUrl,sortByCrowd} from './lib/briefing';
import GlassWeather from './components/GlassWeather.jsx';

const views=['Overview','Events','Culture','News','Networking'];
function Icon({name,...props}){
 const paths={Overview:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',Events:'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4',Culture:'M3 9l9-6 9 6 M4 10h16 M6 10v9 M12 10v9 M18 10v9 M3 21h18',News:'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h3 M14 15h2',Networking:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 11a4 4 0 0 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87',refresh:'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-2l2 3 M4 16l2 3a7 7 0 0 0 12-2',search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',moon:'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10',arrow:'M5 19L19 5 M6 5h13v13',pin:'M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14z M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6',clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2',wind:'M3 8h11a3 3 0 1 0-3-3 M3 12h15a3 3 0 1 1-3 3 M3 16h7',drop:'M12 3s5 5.6 5 9.2A5 5 0 0 1 7 12.2C7 8.6 12 3 12 3z',gauge:'M12 13.5l4.2-4.2 M20.5 17a9 9 0 1 0-17 0 M4 17h16',updown:'M8 20V5 M8 5L5 8 M8 5l3 3 M16 4v15 M16 19l3-3 M16 19l-3-3'};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.Overview}/></svg>;
}
function Source({item,children}){
 const href=safeUrl(item.url||item.source_url);
 return href?<a className="source" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title||'Weather'}: open source`}>{children||'Source & details'} <Icon name="arrow"/></a>:<span className="muted">Source unavailable</span>;
}
function useLiveWeather(){
 const [weather,setWeather]=useState(null);
 useEffect(()=>{
  // Same-origin proxy. The WeatherAPI key stays on the server.
  const c=new AbortController();
  fetch('/data/weather.json',{cache:'no-store',signal:c.signal})
   .then(r=>{if(!r.ok)throw Error('weather');return r.json()})
   .then(d=>{if(!c.signal.aborted&&d?.available===true)setWeather(d)})
   .catch(()=>{});
  return()=>c.abort();
 },[]);
 return weather;
}
function useImages(){
 const [state,setState]=useState({images:{},credits:{}});
 useEffect(()=>{
  // Cached preview images and their attribution. Same-origin, so no third-party tracking.
  const c=new AbortController();
  const load=(url,fallback)=>fetch(url,{cache:'no-store',signal:c.signal})
   .then(r=>r.ok?r.json():fallback).catch(()=>fallback);
  Promise.all([load('/data/images.json',{}),load('/data/credits.json',{})])
   .then(([images,credits])=>{
    if(!c.signal.aborted)setState({images:images&&typeof images==='object'?images:{},credits:credits&&typeof credits==='object'?credits:{}});
   });
  return()=>c.abort();
 },[]);
 return state;
}
// Only ever resolves a cached local media path; never a remote or untrusted URL.
const MEDIA_PATH = /^media\/[a-f0-9]{16}\.(jpg|png|webp|avif|gif|ico)$/;
function mediaPath(rel){return typeof rel==='string'&&MEDIA_PATH.test(rel)?'/'+rel:null}
// Item images are keyed by source URL, and venue images by venue name.
function keyFor(item){
 if(!item)return null;
 if(typeof item.url==='string'&&item.url)return item.url;
 if(typeof item.venue==='string'&&item.venue.trim())return 'venue:'+item.venue.trim();
 return null;
}
function imageFor(images,item){
 const key=keyFor(item);
 return key?mediaPath(images&&images[key]):null;
}
// Attribution required by the image's licence, shown so credit is always given.
function creditFor(credits,item){
 const key=keyFor(item);
 const c=key&&credits?credits[key]:null;
 if(!c||!c.author)return null;
 return c;
}
function Media({src,alt,className,credit}){
 if(!src)return null;
 return <div className={className||'card-media'}>
  <img src={src} alt={alt||''} loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
  {credit&&<span className="media-credit" title={`${credit.author} · ${credit.license} · ${credit.source||''}`}>{credit.author} · {credit.license}</span>}
 </div>;
}
function isToday(stamp){
 if(!stamp)return false;
 try{return new Date(stamp).toLocaleDateString('en-CA',{timeZone:'America/Toronto'})===new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'})}catch{return false}
}
function Weather({data,stale}){
 const w=data.weather;
 const fetched=useLiveWeather();
 // Archived or unavailable live feed falls back to the researched snapshot.
 const live=(!stale&&fetched?.available)?fetched:null;
 const condition=live?(live.condition||'Current conditions'):w.condition;
 const tone=conditionTone(condition||'');
 const metrics=[
  {key:'range',icon:'updown',label:'High / Low',value:live&&Number.isFinite(live.high_c)&&Number.isFinite(live.low_c)?`${Math.round(live.high_c)}° / ${Math.round(live.low_c)}°`:w.high_low},
  {key:'feels',icon:'gauge',label:'Feels like',value:live&&Number.isFinite(live.feels_like_c)?`${Math.round(live.feels_like_c)}°C`:null},
  {key:'wind',icon:'wind',label:'Wind',value:live&&Number.isFinite(live.wind_kph)?`${Math.round(live.wind_kph)} km/h${live.wind_dir?` ${live.wind_dir}`:''}`:w.wind},
  {key:'gust',icon:'wind',label:'Gusts',value:live&&Number.isFinite(live.gust_kph)?`${Math.round(live.gust_kph)} km/h`:null},
  {key:'humidity',icon:'drop',label:'Humidity',value:live&&Number.isFinite(live.humidity)?`${Math.round(live.humidity)}%`:null},
  {key:'visibility',icon:'sun',label:'Visibility',value:live&&Number.isFinite(live.vis_km)?`${live.vis_km} km`:null},
  {key:'pressure',icon:'gauge',label:'Pressure',value:live&&Number.isFinite(live.pressure_mb)?`${Math.round(live.pressure_mb)} mb`:null},
  {key:'uv',icon:'sun',label:'UV index',value:live&&Number.isFinite(live.uv)?`${live.uv}`:null},
  {key:'precip',icon:'drop',label:'Precipitation',value:live&&Number.isFinite(live.precip_mm)?`${live.precip_mm} mm`:w.precipitation},
 ].filter(m=>m.value);
 const hourly=(live?.hourly||[]).slice(0,8).filter(h=>Number.isFinite(h.temperature_c));
 const credit=live?`${live.source_label}${live.is_day===false?' · overnight':''}`:'Saved forecast · briefing time';
 const checkedAt=live?.fetched_at?new Date(live.fetched_at).toLocaleTimeString('en-CA',{timeZone:'America/Toronto',hour:'numeric',minute:'2-digit'}):null;
 const outlook=(live?.daily||[]).slice(1,6);
 return <section className="section" aria-label="Toronto weather">
  <div className="wx-ap" data-tone={tone}>
   <div className="wx-ap-head">
    <div>
     <h2>Toronto, ON</h2>
     <p>{checkedAt?`Updated ${checkedAt} · ${credit}`:credit}</p>
    </div>
   </div>
   <div className="wx-ap-grid">
    <div className="wx-ap-hero">
     {live
      ? <GlassWeather weather={live}/>
      : <div className="weather-hero">
         <span className="weather-glyph weather-glyph-fallback" aria-hidden="true"><Icon name={tone==='clear'?'sun':'moon'}/></span>
         <div className="weather-hero-readout">
          <div className="temperature">{w.temperature||'N/A'}</div>
          <p className="condition">{condition}</p>
         </div>
        </div>}
    </div>
    <div>
     <div className="wx-ap-rowhead"><span>Hourly</span><span>{live?'Live':'Unavailable'}</span></div>
     <section className="wx-ap-cards wx-ap-hours" aria-label="Hourly forecast">
      {hourly.length?hourly.map(h=>{
       const hIcon=localMediaUrl(h.icon_local);
       return <div className="wx-ap-card" key={h.label} data-tone={conditionTone(h.condition||'')}>
        <span>{h.label}</span>
        {hIcon?<img src={hIcon} alt="" width="128" height="128" loading="lazy" decoding="async"/>:<span className="outlook-glyph-fallback" aria-hidden="true"/>}
        <strong>{Math.round(h.temperature_c)}°</strong>
        <em>{Number.isFinite(h.precip_chance)?`${h.precip_chance}%`:'\u00a0'}</em>
       </div>;
      }):<p className="wx-ap-empty">Hourly forecast is unavailable from the current source.</p>}
     </section>
     {w.summary&&<p className="wx-ap-summary">{w.summary}</p>}
    </div>
   </div>
   {metrics.length>0&&<>
    <h3 className="wx-ap-condhead">Today’s Conditions</h3>
    <div className="wx-ap-tiles">
     {metrics.map(m=><div className="wx-ap-tile" key={m.key}><span><Icon name={m.icon}/>{m.label}</span><strong>{m.value}</strong></div>)}
    </div>
   </>}
   {outlook.length>0&&<>
    <div className="wx-ap-rowhead wx-ap-nexthead"><span>Next days</span><span>Outlook</span></div>
    <section className="wx-ap-cards" aria-label="Extended outlook">
     {outlook.map(day=>{
      const dayIcon=localMediaUrl(day.icon_local);
      return <div className="wx-ap-card" key={day.label} data-tone={conditionTone(day.condition||'')}>
       <span>{day.label}</span>
       {dayIcon?<img src={dayIcon} alt="" width="128" height="128" loading="lazy" decoding="async"/>:<span className="outlook-glyph-fallback" aria-hidden="true"/>}
       <strong>{Number.isFinite(day.high_c)&&Number.isFinite(day.low_c)?`${Math.round(day.high_c)}°/${Math.round(day.low_c)}°`:(Number.isFinite(day.temperature_c)?`${Math.round(day.temperature_c)}°`:'N/A')}</strong>
       <em>{day.condition||''}</em>
      </div>;
     })}
    </section>
   </>}
   <div className="wx-deck-foot">
    {safeUrl(w.source_url)&&<a href={safeUrl(w.source_url)} target="_blank" rel="noopener noreferrer">Research snapshot source ↗</a>}
    <a href="https://www.weatherapi.com/weather/q/toronto-317748" target="_blank" rel="noopener noreferrer">WeatherAPI.com · Toronto ↗</a>
   </div>
  </div>
 </section>;
}
function EventCard({item,index,image,credit}){
 const free=/^free\b/i.test(item.price||'');
 return <article className="event-card">
  <Media src={image} credit={credit} alt={item.title?`Preview image for ${item.title}`:''}/>
  <div className="event-topline"><span className="category">{item.category||'City event'}</span>{item.price&&<span className={`price ${free?'free':''}`}>{item.price}</span>}</div>
  <h3>{item.title}</h3>
  {item.time&&<p className="event-meta"><Icon name="clock"/>{item.time}</p>}
  {(item.venue||item.location)&&<p className="event-meta"><Icon name="pin"/>{item.venue||item.location}</p>}
  <p className="event-description">{item.summary||item.why}</p>
  <div className="event-tags">{[item.neighborhood,item.location_label,item.status].filter(Boolean).map((tag,i)=><span key={i}>{tag}</span>)}</div>
  <Source item={item}/>
 </article>;
}
function News({items,images,credits}){
 return <div className="news-list">{items.length?items.map((item,i)=><article className="news-item" key={item.url||i}><span className="news-index">{String(i+1).padStart(2,'0')}</span><div><span className="category">{item.source||'Business & economics'}</span><h3>{item.title}</h3><p>{item.why_it_matters||item.summary}</p><Source item={item}>Read the reporting</Source></div><Media src={imageFor(images||{},item)} credit={creditFor(credits||{},item)} alt="" className="news-media"/></article>):<Empty>No verified business stories in this edition.</Empty>}</div>}
// Weekly deep-reading pool. Kept in its own file so the daily briefing run cannot
// overwrite it, and so the pool survives across days within the week.
function useLearning(){
 const [deck,setDeck]=useState({week:'',pool:[],urls:[]});
 useEffect(()=>{
  const c=new AbortController();
  fetch('/data/learning.json',{cache:'no-store',signal:c.signal})
   .then(r=>r.ok?r.json():null)
   .then(d=>{
    if(c.signal.aborted||!d||!Array.isArray(d.pool))return;
    const pool=d.pool.filter(i=>i&&typeof i.url==='string'&&typeof i.title==='string');
    const week=String(d.week_of||'');
    // Restore this week's picks so a swap survives a reload, then append the rest.
    let urls=[];
    try{const raw=localStorage.getItem('toronto-learning-'+week);const saved=raw?JSON.parse(raw):null;
     if(Array.isArray(saved)){const known=new Set(pool.map(p=>p.url));urls=saved.filter(u=>known.has(u))}}catch{}
    const seen=new Set(urls);
    for(const p of pool)if(!seen.has(p.url)){urls.push(p.url);seen.add(p.url)}
    setDeck({week,pool,urls});
   }).catch(()=>{});
  return()=>c.abort();
 },[]);
 // Promote a fresh pick into a visible slot. The rejected one is parked at the
 // back of the deck so it can resurface later, and the swap is remembered for the week.
 const swap=useCallback((index,visible)=>{
  setDeck(d=>{
   const urls=[...d.urls];
   const v=Math.min(visible,urls.length);
   if(urls.length<=v)return d;               // no spare inventory to pull from
   const [rejected]=urls.splice(index,1);
   urls.push(rejected);
   const [fresh]=urls.splice(v-1,1);
   urls.splice(index,0,fresh);
   try{localStorage.setItem('toronto-learning-'+d.week,JSON.stringify(urls))}catch{}
   return {...d,urls};
  });
 },[]);
 return {week:deck.week,pool:deck.pool,urls:deck.urls,swap};
}
function Empty({children}){return <div className="empty">{children}</div>}
// Deep reading picks: things to actually learn from, not news. Each card can be
// swapped for a different pick from the weekly pool.
function Learning({items,onRefresh}){
 return <div className="learn-list">{items.length?items.map((item,i)=><article className="learn-card" key={item.url}>
  <div className="learn-top"><span className="category">{item.topic||'Deep dive'}</span>{item.level&&<span className="learn-level">{item.level}</span>}</div>
  <h3>{item.title}</h3>
  {item.why&&<p>{item.why}</p>}
  <p className="learn-meta">{[item.source,item.read].filter(Boolean).join(' · ')}</p>
  <div className="learn-actions">
   <Source item={item}>Read it</Source>
   {onRefresh&&<button type="button" className="learn-refresh" onClick={()=>onRefresh(i)} aria-label={`Show a different article instead of ${item.title}`}><Icon name="refresh"/><span>Different one</span></button>}
  </div>
 </article>):<Empty>No reading pick in this week.</Empty>}</div>;
}
function SectionHeading({title,note,action}){return <div className="section-heading"><h2>{title}</h2><div className="heading-tools">{note&&<span>{note}</span>}{action}</div></div>}
// Lets the reader choose how much of a section to see. Defaults to 10.
function CountSelect({value,onChange,label}){
 return <span className="count-select"><select value={value} aria-label={label} onChange={e=>onChange(Number(e.target.value))}>{[5,10,15].map(n=><option key={n} value={n}>{`Show ${n}`}</option>)}</select></span>;
}

export default function App(){
 const {data,loading,error,checkedAt,refresh}=useBriefing();
 const {images,credits}=useImages();
 // Attribution for every licensed photo used, de-duplicated by author and licence.
 const photoCredits=[...new Map(Object.values(credits||{}).filter(c=>c&&c.author).map(c=>[`${c.author}|${c.license}`,c])).values()];
 const [view,setView]=useState('Overview');const [query,setQuery]=useState('');const [filter,setFilter]=useState('All');
 const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('toronto-theme')==='dark'?'dark':'light'}catch{return 'light'}});
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('toronto-theme',theme)}catch{}},[theme]);
 const events=useMemo(()=>data?dedupeEvents([...data.local_events,...data.cultural_events,...data.networking,...data.social_options]):[],[data]);
 // No event may appear in two sections. "Around the city" owns the local and
 // cultural events; "A good reason to go out" only adds social options that have
 // not already been shown, so the two sections never repeat each other.
 const aroundTheCity=useMemo(()=>data?sortByCrowd(dedupeEvents([...data.local_events,...data.cultural_events])):[],[data]);
 const socialOptions=useMemo(()=>{
  if(!data)return [];
  const shown=new Set(aroundTheCity.map(e=>safeUrl(e.url)||e.title));
  return dedupeEvents(data.social_options).filter(e=>!shown.has(safeUrl(e.url)||e.title));
 },[data,aroundTheCity]);
 // How many items each section shows. 10 by default, reader-adjustable.
 const [counts,setCounts]=useState({around:10,social:10,business:10,learning:10});
 const setCount=useCallback((key,value)=>setCounts(c=>({...c,[key]:value})),[]);
 const {pool:learnPool,urls:learnUrls,swap:swapLearning}=useLearning();
 const learningByUrl=useMemo(()=>Object.fromEntries(learnPool.map(p=>[p.url,p])),[learnPool]);
 const learningItems=useMemo(()=>learnUrls.map(u=>learningByUrl[u]).filter(Boolean),[learnUrls,learningByUrl]);
 const refreshLearning=useCallback(index=>swapLearning(index,counts.learning),[swapLearning,counts.learning]);
 const stale=data&&isStaleEdition(data.meta.date_iso);
 const items=view==='Culture'?data?.cultural_events||[]:view==='Networking'?data?.networking||[]:events;
 const filtered=filterEvents(dedupeEvents(items),query,filter);
 const changeView=v=>{setView(v);setQuery('');setFilter('All');window.scrollTo?.({top:0,behavior:'instant'})};
 return <div className="app-shell">
  <aside className="sidebar"><a className="wordmark" href="/" aria-label="Toronto Today home"><span className="brand-symbol">T.</span><span>TORONTO<span className="wordmark-light">TODAY</span></span></a><div className="sidebar-label">YOUR CITY, IN FOCUS</div><nav aria-label="Sections">{views.map(v=><button key={v} aria-label={v} onClick={()=>changeView(v)} className={view===v?'nav-item active':'nav-item'} aria-current={view===v?'page':undefined}><Icon name={v}/><span>{v}</span>{v==='Events'&&data&&<span className="nav-count">{events.length}</span>}</button>)}</nav><div className="sidebar-bottom"><span className="location-dot"/>Toronto, Ontario<p>America/Toronto</p><small>Public city briefing.<br/>Researched daily. Worth your time.</small></div></aside>
  <main className="main-content"><header className="topline"><div className="breadcrumb">City briefing <span>/</span> {view}</div><div className="toolbar"><button className="icon-button" aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} onClick={()=>setTheme(theme==='light'?'dark':'light')}><Icon name={theme==='light'?'moon':'sun'}/></button><button className="refresh-button" onClick={refresh} disabled={loading}><Icon name="refresh"/><span>{loading?'Refreshing':'Refresh'}</span></button></div></header>
   <div className="page-heading"><div><div className="eyebrow">THE DAILY EDITION</div><h1 aria-label="Toronto Today">Toronto Today<span aria-hidden="true">.</span></h1><p className="date-line">{data?.meta.date_display||'Your day in the city'}</p></div><div className="edition-pill"><span/>{data?.meta.edition||'Morning briefing'}</div></div>
   {loading&&!data&&<div className="loading" role="status">Loading your city briefing…</div>}
   {error&&<div className="alert" role="alert">{error} {data?'Showing the last loaded edition.':''}<button onClick={refresh}>Try again</button></div>}
   {data&&<>
    {stale&&<div className="alert">This is not today’s Toronto edition. Showing {data.meta.date_display}; check event dates before making plans.</div>}
    <div className="provenance"><span className="small-dot"/><p>{data.meta.content_note||'A researched morning snapshot. Check the organizer for changes before heading out.'}</p></div>
    {view==='Overview'&&<><Weather data={data} stale={stale}/>
      <div className="overview-grid"><section className="section"><SectionHeading title="Around the city" note={`${aroundTheCity.length} OPTIONS · YOUNG CROWDS FIRST`} action={<CountSelect value={counts.around} onChange={v=>setCount('around',v)} label="How many around-the-city events to show"/>}/><div className="event-grid">{aroundTheCity.slice(0,counts.around).map((item,i)=><EventCard item={item} index={i} image={imageFor(images,item)} credit={creditFor(credits,item)} key={item.url||i}/>)}</div><button className="all-events" onClick={()=>changeView('Events')}>Explore all events <span>↗</span></button></section><aside className="right-rail"><section className="venue-panel"><SectionHeading title="Venue watch"/><p className="muted">What’s on around the downtown core.</p>{data.venue_checks.map((item,i)=><div className="venue-check" key={i}><Media src={imageFor(images,item)} alt={item.venue?`${item.venue} preview`:'Venue preview'} className="venue-media"/><div><span className="venue-head"><strong>{item.venue}</strong><span className={'venue-dot '+item.state}/></span><p>{item.status}</p></div></div>)}</section></aside></div>
      <section className="section"><SectionHeading title="A good reason to go out" note="SOCIAL OPTIONS" action={<CountSelect value={counts.social} onChange={v=>setCount('social',v)} label="How many social options to show"/>}/><div className="event-grid social-grid">{socialOptions.length?socialOptions.slice(0,counts.social).map((item,i)=><EventCard item={item} image={imageFor(images,item)} credit={creditFor(credits,item)} key={item.url||i}/>):<Empty>No additional social option beyond the events above today.</Empty>}</div></section>
      <section className="section"><SectionHeading title="Business, in brief" note="AI, MARKETS + TECH" action={<CountSelect value={counts.business} onChange={v=>setCount('business',v)} label="How many business stories to show"/>}/><News items={(data.business_news||[]).slice(0,counts.business)} images={images} credits={credits}/></section>
      <section className="section"><SectionHeading title="Something worth learning" note="DEEP AI + ENGINEERING · WEEKLY" action={<CountSelect value={counts.learning} onChange={v=>setCount('learning',v)} label="How many learning picks to show"/>}/><Learning items={learningItems.slice(0,counts.learning)} onRefresh={refreshLearning}/></section>
    </>}
    {['Events','Culture','Networking'].includes(view)&&<section className="section browse"><SectionHeading title={view==='Events'?'Find your next plan':view==='Culture'?'Culture, close by':'The right room'} note={`${filtered.length} OPTIONS`}/><div className="filters"><label className="search-field"><Icon name="search"/><input type="search" aria-label="Search events" placeholder="Search events, places, neighbourhoods…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filter-group" aria-label="Filter events">{['All','Free','Downtown'].map(f=><button className={filter===f?'selected':''} aria-pressed={filter===f} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div></div><div className="event-grid">{filtered.length?filtered.map((item,i)=><EventCard item={item} index={i} image={imageFor(images,item)} credit={creditFor(credits,item)} key={item.url||i}/>):<Empty>{query||filter!=='All'?'No matches. Try another search or filter.':`No verified ${view.toLowerCase()} options in this edition.`}</Empty>}</div></section>}
    {view==='News'&&<section className="section news-page"><SectionHeading title="The bigger picture" note="BUSINESS + ECONOMICS"/>{data.business_source_note&&<p className="source-note">{data.business_source_note}</p>}<News items={data.business_news} images={images} credits={credits}/></section>}
    <footer><div><strong>Toronto Today</strong><p>City life, minus the noise.</p></div><div><span>Research snapshot</span><p>{data.meta.generated_at||data.meta.date_display}</p>{checkedAt&&<small>Feed checked {checkedAt.toLocaleTimeString('en-CA',{timeZone:'America/Toronto',hour:'numeric',minute:'2-digit'})} Toronto · refreshes every 5 minutes</small>}{photoCredits.length>0&&<small className="footer-credits">Place photos: {photoCredits.slice(0,5).map((c,i)=><span key={c.author+c.license}>{i?', ':''}<a href={c.page} target="_blank" rel="noopener noreferrer">{c.author}</a> ({c.license})</span>)}</small>}</div></footer>
   </>}
  </main>
 </div>;
}
