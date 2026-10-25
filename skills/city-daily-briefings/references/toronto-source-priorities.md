# Toronto source priorities

Use this reference when building a Toronto daily briefing. It is a priority list, not a guarantee that a source has a current listing.

## Major event checks

- **Sports:** Toronto Blue Jays/Rogers Centre or Rogers Stadium, Raptors, Maple Leafs, Toronto FC/BMO Field, Toronto Tempo, Argonauts, and official league/team schedules.
- **Concerts and performances:** Scotiabank Arena, Budweiser Stage, Massey Hall, History, Coca-Cola Coliseum, RBC Amphitheatre, Mirvish, TIFF Bell Lightbox, and official promoter/venue calendars.
- **Large city events:** City of Toronto events, Destination Toronto, CNE, TIFF, major festivals, conventions, museums, and recognized cultural institutions.

## Wholesome discovery

Check City of Toronto Parks and Recreation, Toronto Public Library, public museum/gallery calendars, community centres, university event calendars, nonprofit/community organizations, public Instagram pages for local organizers, and venue calendars. Search terms should vary beyond a fixed list: `outdoor movie`, `community BBQ`, `dog`, `walk`, `free museum`, `gallery`, `public art`, `volunteer`, `class`, `maker`, `nature`, `fitness`, `picnic`, `community meal`, `music`, `family festival`, `workshop`, `games`, and `free tickets`.

## Downtown cultural events (required section)

- **Museums / galleries:** rom.on.ca, ago.ca, agakhanmuseum.org, moca.ca, textilemuseum.ca,
  batashoemuseum.ca, campbellhousemuseum.ca, toronto.ca (Spadina Museum), thedx.com.
- **Performing arts:** fourseasonscentre.ca, rcmusic.com (Koerner Hall), roythomsonhall.com,
  masseyhall.com, meridianhall.com, stlc.com, harbourfrontcentre.com.
- **Theatre / film:** mirvish.com, tiff.net, factorytheatre.ca, tarragontheatre.com,
  soulpepper.ca, youngcentre.ca.
- **Live music (classical / jazz / world):** TSO at Roy Thomson Hall, Toronto Symphony listings,
  jazz clubs with a published cultural program, Small World Music, Harbourfront Centre music series.
- **Dance / literary / heritage / festivals:** national.ballet.ca, Toronto Public Library event
  listings (torontopubliclibrary.ca/programs-and-classes), Toronto Heritage, City of Toronto culture
  calendar (toronto.ca/explore-enjoy/festivals-events), Destination Toronto (destinationtoronto.com),
  Toronto Arts Council.
- **Free / pay-what-you-can:** TPL cultural series, Toronto Reference Library talks, city cultural
  centres, free museum nights, Nuit Blanche and similar city-wide cultural programming.

Verification discipline for this section: extract the official venue or organizer page before
asserting time, price, or availability. Link the official page. Label neighbourhood and downtown
versus midtown versus east/west. State plainly when nothing verifiable is on today.

### Which cultural calendars fetch cleanly (tested 2026-09-25)

These returned real content to a plain HTTP request, so extract them directly:

- TIFF calendar `tiff.net/calendar`
- Toronto Public Library programs and classes `torontopubliclibrary.ca/programs-and-classes/`
- City of Toronto festivals and events `toronto.ca/explore-enjoy/festivals-events/`
- Harbourfront Centre `harbourfrontcentre.com/whats-on/`
- Massey Hall `masseyhall.com`
- Mirvish `mirvish.com/shows`
- Factory Theatre `factorytheatre.ca`
- Tarragon `tarragontheatre.com`
- Soulpepper `soulpepper.ca/whats-on`
- MOCA `moca.ca/exhibitions/`

These block plain fetching (403 bot challenge, TLS handshake failure, or connection reset), so use
the browser tool rather than blaming the venue for having no events:

- AGO `ago.ca` (403 to plain requests)
- Four Seasons Centre `fourseasonscentre.ca` (connection reset)
- Meridian Hall `meridianhall.com` (TLS chain rejected by plain curl)
- St. Lawrence Centre `stlc.com` (TLS chain rejected by plain curl)

ROM, Aga Khan Museum, Bata Shoe Museum, and the National Ballet do not respond on the deep paths
guessed here (404 or DNS failure). Start from the site root, or search for the current exhibitions
page, rather than reusing a stale deep link.

Deep event links are unstable (for example `harbourfrontcentre.com/event/music-garden-concerts/`
returns 404). Always navigate from the venue's what's-on index and follow the current link, rather
than hard-coding an event URL.

`toronto.ca/explore-enjoy/festivals-events/` is mostly evergreen program copy (Black History Month,
Doors Open, Newcomer Day), not a dated daily calendar. Do not treat it as a today-listings source.
Use it for context and go to the venue pages for dated programming.

Always confirm the venue is actually open. Example caught on 2026-09-25: MOCA was temporarily closed
for installation and did not reopen until 2026-10-04, so it had to be excluded even though its
exhibitions page is live.

## Networking discovery

Prioritize MaRS, DMZ, Communitech/Toronto programming, Creative Destruction Lab, major universities, established VC funds and accelerators, TechTO, prominent AI/ML communities, Toronto Board of Trade, CFA Society Toronto, finance/market institutions, and credible conference organizers. Verify that the event is actually in Toronto/central Toronto and happening today.

## Source discipline

Use search snippets only for discovery. Extract the official event page before asserting time, venue, price, or availability. If the only source is a public Instagram page, link the page/post and label uncertain fields explicitly. Do not infer alcohol-free status, attendee demographics, attractiveness, income, or career success from a listing.
