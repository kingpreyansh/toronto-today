# Image sourcing ladder for briefing cards

Requirement from Preyansh: **every item AND every venue must have an image.** No bare cards, no
placeholder tiles, and never a stock or invented picture. Preyansh also supplied the two fallback ideas
that made this achievable: if an item has no image, use **a photo of the location it happens at** (his
example: David Pecaut Square), and if the event has a **poster**, use that.

Resolution is tiered. Every tier returns an asset that is genuinely of the subject, best first:

| Tier | Source | What it is |
| --- | --- | --- |
| 1 `preview` | the page's own `og:image` / `twitter:image` / JSON-LD | real photo of the event |
| 2 `poster` | the organizer's own website, via its CMS | the event's own poster |
| 3 `location-photo` | Wikimedia Commons | freely-licensed photo of the place |
| 4 `site-icon` | the site's own declared icon (apple-touch first, else largest) | brand mark |
| 5 `favicon` | the site's conventional `/favicon.ico` | brand mark |
| 6 `favicon-resolved` | the site's real favicon via a resolver, for hosts that block datacenter IPs | brand mark |

Never substitute an unrelated photo to fill a gap. A real brand mark beats a wrong photograph.

## Tier 2 — organizer poster (the authoritative source)

**Do not use image search.** A Bing image query for `Tkaronto Open IV poster` returned **Magic: The
Gathering cards**. Google Images actively blocks scraping and, even when it answers, gives no way to
confirm the image belongs to *that* event. Image search puts wrong pictures on the page; the organizer's
own site does not.

Most venue, festival and theatre sites run WordPress, so ask the site what its own event looks like:

1. `GET {origin}/wp-json/wp/v2/search?per_page=5&search={event title}`
2. For a hit, `GET {origin}/wp-json/wp/v2/{subtype}/{id}?_embed=wp:featuredmedia`
3. Take `_embedded['wp:featuredmedia'][0].source_url`, else `media_details.sizes`, else
   `featured_media` then `GET {origin}/wp-json/wp/v2/media/{id}` and use `source_url`.
4. Refuse non-image media (a PDF featured image is not a poster).

Worked example: `torontounion.ca` returned the poster at
`wp-content/uploads/2026/09/sssssss-scaled.jpg` (632,146 bytes) for `Tkaronto Open IV`.

Two extra wins from this tier:

- **It recovers canonical URLs.** The stored link was
  `torontounion.ca/event/tkaronto-open-iv-presented-by-sturdy-br/` (dead, 404). The CMS search returns
  the live `torontounion.ca/event/tkaronto-open-iv/`, which is also how the dead-link defect gets fixed.
- The `tribe_events` subtype signals The Events Calendar plugin, common on venue sites.

### Mandatory guard: never accept a wrong poster

A CMS search returns *nearby* content, so a hit must be confirmed to be the same event before its image
is used. `isSameEvent` in `posters.mjs` requires the hit to share a meaningful share of the wanted
title's distinctive words (words longer than 3 chars, excluding filler like `the/and/for/with/presented/by`):
at least half the tokens, and never fewer than two. Test it against realistic collisions so a search for
one event cannot adopt a Toronto Maple Leafs game or a summer music festival.

## Tier 3 — location photo, with attribution

Use this when the page publishes no photo and no poster is found.

- **Normalise the place name first.** Real briefing strings break a title lookup:
  `Union Station, TD West Carriageway` → `Union Station`; `Soulpepper at the Young Centre` →
  `Soulpepper`; `Metro Toronto Convention Centre, South Building` → the venue name. Strip after the
  first comma, and strip ` at the ...`.
- `GET https://en.wikipedia.org/api/rest_v1/page/summary/{Title_With_Underscores}` → `thumbnail.source`
  or `originalimage.source`.
- **Accept Commons only.** Keep the image only when the path contains `/wikipedia/commons/`. Refuse
  Wikipedia's own `wikipedia/en` fair-use files (club crests, logos) and any `.svg`, so only genuinely
  free photography is used.
- Reject `type: "disambiguation"`.

### Attribution is a licence condition, not decoration

Creative Commons images legally require credit. Store `{author, license, page}` per image and show it
both as a caption on the image and as a consolidated credits line in the footer. Read the metadata from
`GET https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=File:{name}`
→ `extmetadata.Artist.value` and `.LicenseShortName.value` (strip HTML tags).

Wikipedia's summary API does not always yield a clean author; those entries fall back to
"Wikimedia contributor" plus a link to the file page. That is still attributed by link, but say so
rather than implying every credit is a named photographer.

Posters from tier 2 are the organizer's own promotional artwork on their own site, so they carry no free
licence and need no credit. Flag that distinction if the user cares about licensing.

## Tiers 4-6 — brand marks

- `extractIconUrl`: prefer `rel="apple-touch-icon"` (usually 180px), else the largest declared `sizes`.
- Then `/favicon.ico` on the page origin.
- Last, for hosts that **refuse datacenter IPs entirely** (403 on both the page and its favicon), use a
  favicon resolver for the site's real mark: `https://www.google.com/s2/favicons?domain={host}&sz=128`.
  Fetch it once server-side and cache it, so the browser never contacts the resolver.
  Known-blocking hosts encountered: `roythomsonhall.mhrth.com`, `masseyhall.mhrth.com`, `ago.ca`,
  `www.ouevents.ca`, `tiff.net`.

Accept `.ico` as a real image type end to end: content-type check, extension map, the media route regex,
and the frontend's local-media path validator.

## Venues

`venue_checks` items have **no URL** and originally had no image field at all. Add `venues.json` mapping
venue name → official homepage, resolve those homepages through the same ladder, and key the map
`venue:<Name>` in `data/images.json`. Many venues then yield a real photo from their own homepage
`og:image` (Rogers Centre, Union Station, Hockey Hall of Fame, MTCC all did).

Look the key up in one helper so both shapes work:

```
keyFor(item) = item.url  ||  'venue:' + item.venue.trim()
```

## Verify against the artefact, not the report

The most dangerous failure in this pipeline is silent: **every tier reported success while the written
map kept stale values.** Posters downloaded correctly, the run printed `poster: 2`, and `images.json`
still pointed at an 847-byte favicon. The cause was a refactor that dropped the line recording the
result into the map.

- Assert it in the script: after writing, fail the run if any target resolved but is absent from the
  written map. Compare `results[].rel` against the written map and exit non-zero on mismatch.
- Check file **size** as the quickest truth test. A favicon is hundreds of bytes; a poster or photo is
  tens to hundreds of KB. `ls -S media/*.jpg | head` puts the real posters at the top at a glance.
- Confirm the resolved bytes match the source exactly (632,146 bytes matched `sssssss-scaled.jpg`),
  which is how you know it is genuinely that event's poster rather than something else.
- Read `data/images.json` **from disk**, not through the CDN.

## Pitfalls

- **`head -N` will kill a piped process with SIGPIPE before it finishes.** Running
  `node warm-images.mjs --force --verbose 2>&1 | grep ... | head -22` terminated the script after 22
  lines, so it never wrote the map — which looked exactly like a logic bug and sent the investigation
  the wrong way for a while. Redirect to a file (`> /tmp/x.log 2>&1`) and read the file when the
  process is long or its output matters.
- Never fill a gap with an unrelated or stock image. A wrong photo is worse than a brand mark.
- Cache place lookups (`data/locations-cache.json`) so the daily run does not re-query Wikipedia every
  morning; provide a `--refresh-places` flag to force a re-lookup.
- Static hosts run read-only, so all downloading happens in the warm step, never in the request path.
- Keep the browser same-origin: verify zero external requests in a real browser after any change.
