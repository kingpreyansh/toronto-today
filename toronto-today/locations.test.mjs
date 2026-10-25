import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlace, titleFromPlace, lookupPlace, commonsCredit} from './locations.mjs';

test('normalizePlace strips suffixes that break a title lookup',()=>{
  assert.equal(normalizePlace('Union Station, TD West Carriageway'), 'Union Station');
  assert.equal(normalizePlace('Soulpepper at the Young Centre'), 'Soulpepper');
  assert.equal(normalizePlace('  David Pecaut Square  '), 'David Pecaut Square');
  assert.equal(normalizePlace('Metro Toronto Convention Centre, South Building'), 'Metro Toronto Convention Centre');
  assert.equal(normalizePlace(''), '');
  assert.equal(normalizePlace(null), '');
});

test('titleFromPlace builds a wikipedia-safe title',()=>{
  assert.equal(titleFromPlace('David Pecaut Square'), 'David_Pecaut_Square');
  assert.equal(titleFromPlace('Union Station, TD West Carriageway'), 'Union_Station');
  assert.equal(titleFromPlace(''), '');
});

test('lookupPlace returns a freely-licensed photo and rejects unusable results',async t=>{
  const original = globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});

  // A Commons photograph with attribution available.
  globalThis.fetch = async url => {
    if (String(url).includes('/page/summary/')) {
      return {ok:true, json:async()=>({
        type:'standard',
        thumbnail:{source:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Flame_Toronto.jpg/330px-Flame_Toronto.jpg'},
        originalimage:{source:'https://upload.wikimedia.org/wikipedia/commons/8/83/Flame_Toronto.jpg'},
        content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/David_Pecaut_Square'}},
      })};
    }
    return {ok:true, json:async()=>({query:{pages:{'-1':{
      imageinfo:[{extmetadata:{Artist:{value:'<a href="#">Jane Doe</a>'}, LicenseShortName:{value:'CC BY-SA 4.0'}}}],
    }}}})};
  };
  const found = await lookupPlace('David Pecaut Square');
  assert.ok(found && found.image.includes('wikimedia.org'));
  assert.equal(found.page, 'https://en.wikipedia.org/wiki/David_Pecaut_Square');
  assert.equal(found.credit.author, 'Jane Doe');
  assert.equal(found.credit.license, 'CC BY-SA 4.0');

  // Fair-use (wikipedia/en) and SVG logo files must be refused.
  globalThis.fetch = async url => String(url).includes('/page/summary/')
    ? {ok:true, json:async()=>({
        type:'standard',
        thumbnail:{source:'https://thumb.wikimedia.org/wikipedia/en/thumb/2/27/Logo.svg/330px-Logo.svg.png'},
        originalimage:{source:'https://upload.wikimedia.org/wikipedia/en/2/27/Logo.svg'},
      })}
    : {ok:false, json:async()=>({})};
  assert.equal(await lookupPlace('Hockey Hall of Fame'), null);

  // Disambiguation pages and empty names yield nothing.
  globalThis.fetch = async () => ({ok:true, json:async()=>({type:'disambiguation'})});
  assert.equal(await lookupPlace('Spring Garden'), null);
  assert.equal(await lookupPlace(''), null);
});

test('commonsCredit tolerates a missing API response',async t=>{
  const original = globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch = async () => ({ok:false, json:async()=>({})});
  assert.equal(await commonsCredit('https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg'), null);
  assert.equal(await commonsCredit('not a url'), null);
});
