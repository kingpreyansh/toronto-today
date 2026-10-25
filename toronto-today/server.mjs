import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchWeather, weatherUnavailable, iconUrls} from './weather.mjs';
import {ensureIcons} from './icons.mjs';

const ownRoot=path.dirname(fileURLToPath(import.meta.url));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; object-src 'none'";

// Server-side weather cache. Keeps the WeatherAPI key off the client and
// protects the upstream page from being hit once per visitor.
const WEATHER_TTL_MS=5*60*1000;

export function createServer({root=ownRoot}={}) {
 // Weather and condition icons are cached per server instance so tests can use
 // a temp root and never write into the real media directory.
 const weatherCache={payload:null,at:0,inflight:null};
 const iconDir=path.join(root,'media','icons');

 async function getWeather(){
  const now=Date.now();
  if (weatherCache.payload && now-weatherCache.at < WEATHER_TTL_MS) return {payload:weatherCache.payload,age_ms:now-weatherCache.at};
  if (weatherCache.inflight) return {payload:weatherCache.payload,age_ms:now-weatherCache.at};
  weatherCache.inflight=(async()=>{
   try{
    const fresh=await fetchWeather();
    if (fresh?.available){
     // Cache the provider's condition artwork locally so the browser never
     // contacts the CDN and the page CSP can stay at img-src 'self'.
     const icons=await ensureIcons(iconUrls(fresh),{dir:iconDir}).catch(()=>({}));
     const attach=entry=>{
      if(!entry||!entry.icon_code)return entry?{...entry,icon_local:null}:entry;
      const rel=icons[`${entry.icon_period}-${entry.icon_code}`];
      // The version token keeps a previously cached 404 from shadowing the file.
      return {...entry,icon_local:rel?`/${rel}?v=1`:null};
     };
     const withIcons=attach(fresh);
     withIcons.daily=(fresh.daily||[]).map(attach);
     withIcons.hourly=(fresh.hourly||[]).map(attach);
     weatherCache.payload=withIcons;weatherCache.at=Date.now();
    }
    else if(!weatherCache.payload) weatherCache.payload=fresh;
    return weatherCache.payload;
   }catch(error){
    if(!weatherCache.payload) weatherCache.payload=weatherUnavailable('upstream request failed');
    return weatherCache.payload;
   }finally{weatherCache.inflight=null;}
  })();
  await weatherCache.inflight;
  return {payload:weatherCache.payload,age_ms:Date.now()-weatherCache.at};
 }

 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Security-Policy',CSP);
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control','no-store');
  const send=(code,body,type='text/plain; charset=utf-8')=>{
   res.statusCode=code;res.setHeader('Content-Type',type);res.setHeader('Content-Length',Buffer.byteLength(body));res.end(req.method==='HEAD'?undefined:body);
  };
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed');}
  const raw=(req.url||'/').split('?')[0];
  let pathname;
  try {pathname=decodeURIComponent(raw);}catch{return send(404,'Not found');}
  if(pathname.includes('..')||pathname.includes('\\')||pathname.includes('\0'))return send(404,'Not found');
  if(pathname==='/healthz'){
   try{
    const data=JSON.parse(await readFile(path.join(root,'data/latest.json'),'utf8'));
    await stat(path.join(root,'dist/index.html'));
    return send(200,JSON.stringify({status:'ok',date:data.meta?.date_iso}),'application/json; charset=utf-8');
   }catch{return send(503,'{"status":"not_ready"}','application/json; charset=utf-8');}
  }
  if(pathname==='/robots.txt')return send(200,'User-agent: *\nDisallow: /\n');
  if(pathname==='/data/weather.json'){
   const {payload,age_ms}=await getWeather();
   return send(200,JSON.stringify({...payload,cache_age_ms:age_ms}),'application/json; charset=utf-8');
  }
  let file;
  // A long cache lifetime is only safe once we know the file exists, so the
  // policy is applied after a successful read. Otherwise a 404 would be cached.
  let cachePolicy=null;
  if(pathname==='/'||pathname==='/index.html')file=path.join(root,'dist/index.html');
  else if(pathname==='/data/latest.json')file=path.join(root,'data/latest.json');
  else if(pathname==='/data/images.json')file=path.join(root,'data/images.json');
  else if(pathname==='/data/credits.json')file=path.join(root,'data/credits.json');
  else if(pathname==='/data/learning.json')file=path.join(root,'data/learning.json');
  else if(/^\/media\/icons\/(day|night)-\d{3,4}\.png$/.test(pathname)){
   file=path.join(root,'media','icons',path.basename(pathname));
   cachePolicy='public, max-age=604800';
  }
  else if(/^\/media\/[a-f0-9]{16}\.(jpg|png|webp|avif|gif|ico)$/.test(pathname)){
   file=path.join(root,'media',path.basename(pathname));
   cachePolicy='public, max-age=31536000, immutable';
  }
  else if(/^\/assets\/[A-Za-z0-9_./-]+\.(js|css|svg|png|woff2)$/.test(pathname)){
   file=path.join(root,'dist',pathname);
   cachePolicy='public, max-age=31536000, immutable';
  }else if(['/favicon.svg','/favicon.ico','/favicon-32.png','/favicon-16.png','/apple-touch-icon.png','/icon-512.png'].includes(pathname)){
   file=path.join(root,'dist',pathname);
   cachePolicy='public, max-age=86400';
  }
  else return send(404,'Not found');
  try{
   const body=await readFile(file);
   if(cachePolicy)res.setHeader('Cache-Control',cachePolicy);
   send(200,body,MIME[path.extname(file)]||'application/octet-stream');
  }catch{send(404,'Not found');}
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createServer();server.requestTimeout=15000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
 server.listen(8780,'127.0.0.1',()=>console.log('Toronto Today listening on 127.0.0.1:8780'));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
