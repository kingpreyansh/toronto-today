import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from './server.mjs';

async function fixture(t) {
 const root=await mkdtemp(join(tmpdir(),'toronto-server-'));
 await mkdir(join(root,'dist','assets'),{recursive:true});await mkdir(join(root,'data'));await mkdir(join(root,'media'));
 await writeFile(join(root,'dist','index.html'),'<html>React app</html>');
 await writeFile(join(root,'dist','assets','index-abc.js'),'export default 1');
 await writeFile(join(root,'data','latest.json'),JSON.stringify({meta:{date_iso:'2026-09-26'}}));
 await writeFile(join(root,'data','images.json'),JSON.stringify({'https://example.org/a':'media/0123456789abcdef.jpg'}));
 await writeFile(join(root,'media','0123456789abcdef.jpg'),Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10]));
 await mkdir(join(root,'media','icons'),{recursive:true});
 await writeFile(join(root,'media','icons','day-122.png'),Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a]));
 await writeFile(join(root,'media','README.txt'),'not an image');
 await writeFile(join(root,'private.env'),'SECRET=must-not-serve');
 const server=createServer({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})});
 return 'http://127.0.0.1:'+server.address().port;
}

test('serves root, public JSON and immutable built asset only',async t=>{
 const base=await fixture(t);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html/);
 assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);
 assert.equal(page.headers.get('x-robots-tag'),'noindex, nofollow');
 const data=await fetch(base+'/data/latest.json');assert.equal(data.headers.get('cache-control'),'no-store');assert.equal((await data.json()).meta.date_iso,'2026-09-26');
 const js=await fetch(base+'/assets/index-abc.js');assert.equal(js.status,200);assert.match(js.headers.get('cache-control'),/immutable/);
});
test('rejects unknown, private, traversal paths and mutation methods',async t=>{
 const base=await fixture(t);
 for(const path of ['/.env','/private.env','/server.mjs','/data/../private.env','/data/%2e%2e%2fprivate.env','/assets/%2e%2e%2findex.html','/data/2026-09-26.json'])assert.equal((await fetch(base+path)).status,404,path);
 assert.equal((await fetch(base+'/',{method:'POST',body:'x'})).status,405);
});
test('unready server returns 503 instead of inventing an edition',async t=>{
 const root=await mkdtemp(join(tmpdir(),'toronto-empty-'));
 const server=createServer({root});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})});
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/healthz')).status,503);
 assert.equal((await fetch(base+'/data/latest.json')).status,404);
});
test('serves cached briefing images and the image map, but nothing else under media',async t=>{
 const base=await fixture(t);
 const img=await fetch(base+'/media/0123456789abcdef.jpg');
 assert.equal(img.status,200);
 assert.match(img.headers.get('content-type'),/image\/jpeg/);
 assert.match(img.headers.get('cache-control'),/immutable/);
 assert.equal((await img.arrayBuffer()).byteLength,6);
 const map=await fetch(base+'/data/images.json');
 assert.equal(map.status,200);assert.equal(map.headers.get('cache-control'),'no-store');
 assert.ok((await map.json())['https://example.org/a']);
 // Only hash-named image files are reachable, so an arbitrary file in media/ cannot leak.
 assert.equal((await fetch(base+'/media/README.txt')).status,404);
 assert.equal((await fetch(base+'/media/../../private.env')).status,404);
 assert.equal((await fetch(base+'/media/0123456789abcdef.sh')).status,404);
 assert.equal((await fetch(base+'/data/../private.env')).status,404);
});
test('a missing icon is 404 and carries no long cache lifetime, a present one is cacheable',async t=>{
 const base=await fixture(t);
 const missing=await fetch(base+'/media/icons/day-999.png');
 assert.equal(missing.status,404);
 const cc=missing.headers.get('cache-control')||'';
 assert.ok(!/max-age=[1-9]/.test(cc),`a 404 must not be cacheable, got: ${cc}`);
 const present=await fetch(base+'/media/icons/day-122.png');
 assert.equal(present.status,200);
 assert.match(present.headers.get('content-type'),/image\/png/);
 assert.match(present.headers.get('cache-control'),/max-age=604800/);
 // A version token is accepted and still resolves the same file.
 assert.equal((await fetch(base+'/media/icons/day-122.png?v=1')).status,200);
 assert.equal((await fetch(base+'/media/icons/day-122')).status,404);
});
test('weather proxy always answers with JSON and never leaks a key',async t=>{
 const base=await fixture(t);
 const res=await fetch(base+'/data/weather.json');
 assert.equal(res.status,200);
 assert.match(res.headers.get('content-type'),/application\/json/);
 assert.equal(res.headers.get('cache-control'),'no-store');
 const body=await res.json();
 assert.equal(typeof body.available,'boolean');
 assert.equal(typeof body.cache_age_ms,'number');
 assert.ok(!/key|token|secret/i.test(JSON.stringify(body)),'weather payload must not expose credentials');
});
test('health exposes status and public date, HEAD sends no body',async t=>{
 const base=await fixture(t); const h=await (await fetch(base+'/healthz')).json();assert.equal(h.status,'ok');assert.equal(h.date,'2026-09-26');
 const r=await fetch(base+'/',{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');
});
