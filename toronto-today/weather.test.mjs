import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseWeatherApiPage, normalizeWeatherApiJson, weatherUnavailable, iconUrls} from './weather.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const pageHtml=await readFile(path.join(here,'test/fixtures/weatherapi-toronto.html'),'utf8');

test('parses the real WeatherAPI Toronto page into current conditions and outlook',()=>{
 const w=parseWeatherApiPage(pageHtml);
 assert.equal(w.source,'weatherapi-page');
 assert.equal(w.location,'Toronto');
 assert.equal(w.condition,'Overcast');
 assert.equal(w.temperature_c,17.5);
 assert.equal(w.wind_kph,13);
 assert.equal(w.precip_mm,0);
 assert.equal(w.pressure_mb,1022);
 assert.ok(w.daily.length>=5,'expected at least five outlook days');
 assert.deepEqual(w.daily[0],{label:'Sun',temperature_c:17.8,condition:'Overcast',icon_code:'122',icon_period:'day',is_day:true});
 assert.ok(w.daily.every(d=>d.label&&Number.isFinite(d.temperature_c)));
 assert.ok(w.daily.every(d=>d.icon_code&&d.icon_period),'every outlook day carries provider artwork');
});

test('captures the provider condition artwork for a keyless page read',()=>{
 const w=parseWeatherApiPage(pageHtml);
 assert.equal(w.icon_code,'122');
 assert.equal(w.icon_period,'day');
 assert.equal(w.is_day,true);
 const urls=iconUrls(w);
 assert.ok(urls.includes('https://cdn.weatherapi.com/weather/128x128/day/122.png'));
 // Deduplicated: the same condition across the outlook collapses to one download.
 assert.equal(urls.filter(u=>u.endsWith('/122.png')).length,1);
 assert.ok(urls.every(u=>u.startsWith('https://cdn.weatherapi.com/')),'only the provider CDN');
 assert.deepEqual(iconUrls({}),[]);
 assert.deepEqual(iconUrls({icon_code:null,daily:[{}]}),[]);
});

test('normalizes api icons and rejects foreign hosts',()=>{
 const base={location:{name:'Toronto',tz_id:'America/Toronto'},current:{temp_c:5,condition:{text:'Sunny',icon:'//cdn.weatherapi.com/weather/64x64/day/113.png'}},forecast:{forecastday:[{date:'2026-09-26',day:{maxtemp_c:9,mintemp_c:1,condition:{text:'Light rain',icon:'//cdn.weatherapi.com/weather/64x64/night/296.png'}}}]}};
 const w=normalizeWeatherApiJson(base);
 assert.equal(w.icon_code,'113');assert.equal(w.icon_period,'day');
 assert.equal(w.daily[0].icon_code,'296');assert.equal(w.daily[0].is_day,false);
 const hostile={...base,current:{...base.current,condition:{text:'X',icon:'https://evil.example.com/weather/64x64/day/113.png'}}};
 assert.equal(normalizeWeatherApiJson(hostile).icon_code,null);
});

test('rejects pages without WeatherAPI data instead of inventing values',()=>{
 assert.throws(()=>parseWeatherApiPage('<html><body>Sorry, service unavailable</body></html>'));
 assert.throws(()=>parseWeatherApiPage(''));
});

test('normalizes the WeatherAPI REST payload and keeps 3-day accuracy tier',()=>{
 const payload={location:{name:'Toronto',region:'Ontario',country:'Canada',tz_id:'America/Toronto'},
  current:{last_updated_epoch:1780000000,temp_c:17.5,feelslike_c:16.2,condition:{text:'Overcast',code:1009},
   wind_kph:13,precip_mm:0,pressure_mb:1022,humidity:71,uv:2,vis_km:24},
  forecast:{forecastday:[{date:'2026-09-26',day:{maxtemp_c:22,mintemp_c:11,condition:{text:'Partly cloudy'},daily_chance_of_rain:10}}]}};
 const w=normalizeWeatherApiJson(payload);
 assert.equal(w.source,'weatherapi-api');
 assert.equal(w.temperature_c,17.5);
 assert.equal(w.feels_like_c,16.2);
 assert.equal(w.humidity,71);
 assert.equal(w.high_c,22);
 assert.equal(w.low_c,11);
 assert.equal(w.condition,'Overcast');
 assert.equal(w.tz_id,'America/Toronto');
 assert.equal(w.daily.length,1);
});

test('frames unavailable weather honestly for the browser',()=>{
 const w=weatherUnavailable('provider error');
 assert.equal(w.available,false);
 assert.equal(w.source,'unavailable');
 assert.ok(w.note.includes('provider error'));
});
