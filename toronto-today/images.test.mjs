import test from 'node:test';
import assert from 'node:assert/strict';
import {extractImageUrl, isSafeRemoteUrl, hashFor, isImageContentType, pickImages,
  extractIconUrl, faviconUrlFor, faviconResolverUrl} from './images.mjs';

test('site icons are taken from the site itself, preferring apple-touch',()=>{
 const base='https://example.org/event/1';
 assert.equal(
  extractIconUrl('<link rel="apple-touch-icon" href="/apple.png"><link rel="icon" sizes="512x512" href="/big.png">', base),
  'https://example.org/apple.png');
 assert.equal(
  extractIconUrl('<link rel="icon" sizes="32x32" href="/s.png"><link rel="icon" sizes="512x512" href="/big.png">', base),
  'https://example.org/big.png');
 assert.equal(extractIconUrl('<link rel="shortcut icon" href="/f.ico">', base), 'https://example.org/f.ico');
 assert.equal(extractIconUrl('<html>no icons</html>', base), null);
 assert.equal(extractIconUrl('', base), null);
});

test('favicon fallbacks are built safely and only for real hosts',()=>{
 assert.equal(faviconUrlFor('https://a.b.example.org/path/page?q=1'), 'https://a.b.example.org/favicon.ico');
 assert.equal(faviconUrlFor('not a url'), null);
 assert.equal(faviconResolverUrl('mhrth.com'),
  'https://www.google.com/s2/favicons?domain=mhrth.com&sz=128');
 assert.equal(faviconResolverUrl('a/b'), null);
 assert.equal(faviconResolverUrl('evil.com/../x'), null);
 assert.equal(faviconResolverUrl(''), null);
});

test('ico is treated as a real image type',()=>{
 assert.equal(isImageContentType('image/x-icon'), true);
 assert.equal(isImageContentType('image/vnd.microsoft.icon'), true);
 assert.equal(isImageContentType('text/html'), false);
});

test('extracts og:image, twitter:image, JSON-LD and decodes entities',()=>{
 const base='https://example.org/event/1';
 assert.equal(
  extractImageUrl('<meta property="og:image" content="/a.jpg">', base), 'https://example.org/a.jpg');
 assert.equal(
  extractImageUrl('<meta property="og:image:secure_url" content="https://cdn.example.org/b.png">', base),
  'https://cdn.example.org/b.png');
 assert.equal(
  extractImageUrl('<meta name="twitter:image" content="https://cdn.example.org/c.jpg">', base),
  'https://cdn.example.org/c.jpg');
 assert.equal(
  extractImageUrl('<script type="application/ld+json">{"image":"https://cdn.example.org/d.jpg"}</script>', base),
  'https://cdn.example.org/d.jpg');
 // Real ROM markup encodes the URL with an HTML entity.
 assert.equal(
  extractImageUrl('<meta property="og:image" content="https://x.org/i.jpg?h=1&amp;itok=abc">', base),
  'https://x.org/i.jpg?h=1&itok=abc');
});

test('prefers og:image and returns null when a page has none',()=>{
 const base='https://example.org/e';
 assert.equal(extractImageUrl('<html><body>no preview here</body></html>', base), null);
 assert.equal(extractImageUrl('', base), null);
 assert.equal(
  extractImageUrl('<meta name="twitter:image" content="https://t.org/1.jpg"><meta property="og:image" content="https://o.org/2.jpg">', base),
  'https://o.org/2.jpg');
});

test('rejects unsafe remote targets',()=>{
 for (const bad of ['http://127.0.0.1/x.jpg','http://localhost/x.jpg','http://10.0.0.5/x.jpg',
   'http://192.168.1.4/x.jpg','http://172.16.9.9/x.jpg','http://169.254.169.254/latest/meta-data',
   'http://[::1]/x.jpg','file:///etc/passwd','javascript:alert(1)','http://0.0.0.0/x.jpg']) {
  assert.equal(isSafeRemoteUrl(bad), false, bad);
 }
 for (const good of ['https://cdn.example.org/a.jpg','http://example.org/b.png']) {
  assert.equal(isSafeRemoteUrl(good), true, good);
 }
 // Only real image content types are cached.
 assert.equal(isImageContentType('image/jpeg'), true);
 assert.equal(isImageContentType('image/webp; charset=binary'), true);
 assert.equal(isImageContentType('text/html'), false);
 assert.equal(isImageContentType('application/pdf'), false);
});

test('hashFor is stable and filename safe',()=>{
 const a=hashFor('https://example.org/one.jpg');
 assert.equal(a, hashFor('https://example.org/one.jpg'));
 assert.notEqual(a, hashFor('https://example.org/two.jpg'));
 assert.match(a, /^[a-f0-9]{16}$/);
});

test('pickImages keeps public shapes and drops private or unsourced items',()=>{ const data={
  best_bets:[{title:'A',url:'https://a.org',image:'media/x.jpg'}],
  local_events:[{title:'B',url:'https://b.org'},{title:'C',url:'https://c.org',image:'media/y.jpg'}],
  cultural_events:[{title:'D',url:'https://d.org',image:'media/z.jpg'}],
  business_news:[{title:'E',url:'https://e.org',image:'media/n.jpg'}],
  social_options:[], networking:[],
  private_stuff:[{title:'P',url:'https://p.org',image:'media/secret.jpg'}],
  full_briefing_text:'PRIVATE',
 };
 const picked=pickImages(data);
 const flat=JSON.stringify(picked);
 assert.ok(flat.includes('media/x.jpg') && flat.includes('media/n.jpg'));
 assert.ok(!flat.includes('secret') && !flat.includes('PRIVATE') && !flat.includes('p.org'));
 assert.equal(picked['https://b.org'], undefined, 'items without an image stay absent');
});
