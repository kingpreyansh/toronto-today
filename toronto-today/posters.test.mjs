import test from 'node:test';
import assert from 'node:assert/strict';
import {titleTokens, isSameEvent, findOrganizerPoster} from './posters.mjs';

test('titleTokens drops filler and short words',()=>{
  const t = titleTokens('Tkaronto Open IV presented by Sturdy');
  assert.ok(t.has('tkaronto'));
  assert.ok(t.has('open'));
  assert.ok(!t.has('presented'));
  assert.ok(!t.has('by'));
  assert.ok(!t.has('iv'));
});

test('isSameEvent refuses a wrong poster, which is the whole point of the guard',()=>{
  // The real event must match itself.
  assert.equal(isSameEvent('Tkaronto Open IV', 'Tkaronto Open IV'), true);
  assert.equal(isSameEvent('Tkaronto Open IV presented by Sturdy', 'Tkaronto Open IV'), true);
  // Unrelated events on the same site must never be accepted.
  assert.equal(isSameEvent('Tkaronto Open IV', 'Toronto Maple Leafs vs Ottawa'), false);
  assert.equal(isSameEvent('Tkaronto Open IV', 'Summer Music Festival'), false);
  // One shared generic word is not enough.
  assert.equal(isSameEvent('Toronto Jazz Festival', 'Toronto Blue Jays Game'), false);
  // Empty or junk input yields false rather than a false positive.
  assert.equal(isSameEvent('', 'Tkaronto Open IV'), false);
  assert.equal(isSameEvent('Tkaronto Open IV', ''), false);
  assert.equal(isSameEvent('the and for', 'anything'), false);
});

test('findOrganizerPoster returns the featured media and rejects unrelated hits',async t=>{
  const original = globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});

  globalThis.fetch = async url => {
    const u = String(url);
    if (u.includes('/wp-json/wp/v2/search')) {
      return {ok:true, json:async()=>([
        {id:1, subtype:'tribe_events', title:'Summer Music Festival', url:'https://venue.ca/e/1'},
        {id:21932, subtype:'tribe_events', title:'Tkaronto Open IV', url:'https://venue.ca/event/tkaronto-open-iv/'},
      ])};
    }
    if (u.includes('/wp-json/wp/v2/tribe_events/21932')) {
      return {ok:true, json:async()=>({
        link:'https://venue.ca/event/tkaronto-open-iv/',
        _embedded:{'wp:featuredmedia':[{source_url:'https://venue.ca/wp-content/uploads/2026/09/poster-scaled.jpg'}]},
      })};
    }
    return {ok:false, json:async()=>({})};
  };

  const found = await findOrganizerPoster({origin:'https://venue.ca', title:'Tkaronto Open IV presented by Sturdy'});
  assert.ok(found);
  assert.equal(found.image, 'https://venue.ca/wp-content/uploads/2026/09/poster-scaled.jpg');
  assert.equal(found.page, 'https://venue.ca/event/tkaronto-open-iv/');
  assert.equal(found.hitTitle, 'Tkaronto Open IV');

  // When only an unrelated hit exists, nothing is returned.
  globalThis.fetch = async url => String(url).includes('/wp-json/wp/v2/search')
    ? {ok:true, json:async()=>([{id:1, subtype:'posts', title:'Summer Music Festival', url:'https://venue.ca/1'}])}
    : {ok:false, json:async()=>({})};
  assert.equal(await findOrganizerPoster({origin:'https://venue.ca', title:'Tkaronto Open IV'}), null);

  // A non-WordPress site (no REST API) yields nothing rather than throwing.
  globalThis.fetch = async () => ({ok:false, json:async()=>({})});
  assert.equal(await findOrganizerPoster({origin:'https://example.com', title:'Anything'}), null);
  assert.equal(await findOrganizerPoster({origin:'', title:'Anything'}), null);
  assert.equal(await findOrganizerPoster({origin:'https://x.ca', title:''}), null);
});

test('findOrganizerPoster rejects non-image featured media',async t=>{
  const original = globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch = async url => {
    const u = String(url);
    if (u.includes('/wp-json/wp/v2/search')) {
      return {ok:true, json:async()=>([{id:5, subtype:'posts', title:'Tkaronto Open IV', url:'https://v.ca/5'}])};
    }
    if (u.includes('/wp-json/wp/v2/posts/5')) {
      return {ok:true, json:async()=>({
        featured_media:9, link:'https://v.ca/5',
        _embedded:{'wp:featuredmedia':[{source_url:'https://v.ca/wp-content/uploads/poster.pdf'}]},
      })};
    }
    return {ok:true, json:async()=>({source_url:'https://v.ca/wp-content/uploads/thing.pdf'})};
  };
  assert.equal(await findOrganizerPoster({origin:'https://v.ca', title:'Tkaronto Open IV'}), null);
});
