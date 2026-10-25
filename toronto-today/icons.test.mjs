import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile, readFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {iconFile, isAllowedIconUrl, parseIconUrl, ensureIcons} from './icons.mjs';

test('iconFile only accepts real provider codes and periods',()=>{
 assert.equal(iconFile('122','day'),'day-122.png');
 assert.equal(iconFile('1000','night'),'night-1000.png');
 for (const bad of [['122','dusk'],['12','day'],['abcd','day'],['','day'],[null,'day'],['122',null],['../../etc/passwd','day']]) {
  assert.equal(iconFile(bad[0],bad[1]), null, String(bad));
 }
});

test('only the provider CDN is an allowed icon source',()=>{
 assert.equal(isAllowedIconUrl('https://cdn.weatherapi.com/weather/128x128/day/122.png'), true);
 assert.equal(parseIconUrl('https://cdn.weatherapi.com/weather/64x64/night/116.png').file, 'night-116.png');
 for (const bad of [
   'https://evil.example.com/weather/128x128/day/122.png',
   'http://cdn.weatherapi.com/weather/128x128/day/122.png',
   'https://cdn.weatherapi.com.evil.example/weather/128x128/day/122.png',
   'https://cdn.weatherapi.com/weather/128x128/day/122.svg',
   'file:///etc/passwd',
   'https://cdn.weatherapi.com/../secret.png',
 ]) {
  assert.equal(isAllowedIconUrl(bad), false, bad);
 }
});

test('ensureIcons caches once, skips re-downloads and ignores disallowed urls',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'icons-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 // Pre-seed one already-cached icon to prove no refetch is needed.
 await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'day-122.png'), Buffer.from([0x89,0x50,0x4e,0x47]));

 const allowed='https://cdn.weatherapi.com/weather/128x128/day/122.png';
 const disallowed='https://evil.example.com/weather/128x128/day/999.png';
 const original=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async url=>{
  calls++;
  return {ok:true, headers:{get:()=>'image/png'}, arrayBuffer:async()=>new Uint8Array([1,2,3,4])};
 };
 t.after(()=>{globalThis.fetch=original;});

 const map=await ensureIcons([allowed,allowed,disallowed,'not a url',null],{dir});
 assert.equal(calls,0,'a cached icon must not be refetched');
 assert.deepEqual(map,{'day-122':'media/icons/day-122.png'});
 assert.equal(await readFile(path.join(dir,'day-122.png'))!==null,true);
 assert.ok(!Object.keys(map).some(k=>k.includes('999')));
});

test('ensureIcons tolerates upstream failure without throwing',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'icons-fail-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const original=globalThis.fetch;
 globalThis.fetch=async ()=>{ throw new Error('network down'); };
 t.after(()=>{globalThis.fetch=original;});
 const map=await ensureIcons(['https://cdn.weatherapi.com/weather/128x128/day/119.png'],{dir});
 assert.deepEqual(map,{});
});

test('ensureIcons rejects a non-png or oversized response',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'icons-bad-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const original=globalThis.fetch;
 globalThis.fetch=async ()=>({ok:true,headers:{get:()=>'text/html'},arrayBuffer:async()=>new Uint8Array([1])});
 t.after(()=>{globalThis.fetch=original;});
 assert.deepEqual(await ensureIcons(['https://cdn.weatherapi.com/weather/128x128/day/119.png'],{dir}),{});
});
