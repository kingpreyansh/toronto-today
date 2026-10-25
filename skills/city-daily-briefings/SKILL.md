---
name: city-daily-briefings
description: "Use for daily city briefings with verified events."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Toronto, events, weather, networking, social, local-research, briefings]
    category: research
---

# City Daily Briefings

## When to Use

Use when a user wants a recurring or on-demand daily briefing about weather, events, social opportunities, networking, and local business news in a specific city.


## Toronto hosted React delivery

Preyansh prefers a permanent hosted React link over daily HTML attachments: `https://today.getphiads.com/`. He approved public access for CITY BRIEFING ONLY. Personal planner/health/lead/client information, names, credentials, private focus replies and full original reports never belong on the public page.

- App: `/home/ubuntu/phiads-odysseus/toronto-today/`. Read `HOSTING.md` there and `/home/ubuntu/phiads-odysseus/daily-briefing/CONTRACT.md` for data shape.
- Research fresh, write the dated JSON under daily-briefing, then run `python3 /home/ubuntu/phiads-odysseus/toronto-today/publish.py --input /home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD.json`.
- The publisher whitelists public fields, requires today's Toronto date and atomically updates `data/latest.json`. No React build or restart needed for daily updates. Never use `--allow-archive` in daily production.
- Verify actual public output with `python3 /home/ubuntu/phiads-odysseus/toronto-today/verify_deployment.py`. A failed publication keeps last good data, so report a blocker rather than claiming a fresh edition.
- Daily Discord delivery is a brief @mention + the permanent link, optionally best bets, followed by the one-thing question. The exact question must be rendered as a standalone Discord H1 with a blank line before it: `# What is the one thing you are going to do today?` Never send it as plain body text. No HTML attachment by default. Priorities stay in Discord/Notion. Do not announce routine verification details such as “verified end to end,” `ok: true`, image-target counts, `stillMissing`, or that the learning pool was untouched. Perform those checks internally, then report only the useful result or an actual blocker.
- Hosting uses Lightsail, loopback Node port 8780 and a separate Cloudflare named tunnel, with system services `toronto-today` and `toronto-today-tunnel`. Do not touch the separate Instantly tunnel.
- Typography floor is 13px for all visible text; body 17px (16px phones), subtext 14-16px, labels 13px. Guarded by `src/lib/typography.test.js` (stylesheet scan) and `qa-font-sizes.cjs` (real-browser measurement at 1440/768/390/320).
- CSS pitfall: `src/styles.css` is append-ordered and holds duplicate definitions of some selectors (`.news-item` had four at one point). A later duplicate silently overrides an earlier one. Before changing layout, run `grep -n 'selector{' src/styles.css` and reconcile every definition; never just append a new rule. News rows are `index | text | 118px image` so the image sits on the right.
- The dashboard is a **visual deliverable** and Preyansh judges it as one. Treat "it doesn't look good" as a defect report, not a nitpick. Keep the weather block on ONE surface; do not drop a dark glass widget beside a light panel, which reads as broken. When a third-party component is involved, rebuild the containing block around it.
- **Answer the literal question first, in one line, before any analysis.** During the WeatherAPI work he asked where to get the key, and got a wall of data-gap analysis ending in a decision prompt instead of the answer; he had to ask again, plainly. When the question is simple ("where do I get X", "how do I do Y"), lead with the direct answer, then context if it is genuinely useful. Do not convert a simple question into a `clarify` decision request, and do not restate the problem in place of answering it.
- When he says "continue" after you asked a question, treat it as "proceed with your best judgement" and choose the option that produces a working artefact, rather than asking again.
- **If there is no vision tool, never fake an opinion about how it looks.** Measure what determines legibility (font size, WCAG contrast compositing each layer, overflow, broken images), take screenshots, and send them for Preyansh to judge. Say which parts were measured and which were left to his eye.
- Verify text contrast numerically against the WORST gradient stop, and solve for required alpha/scrim values instead of guessing. A vendored component's hardcoded translucent text can only be fixed by darkening what sits behind it, never by editing the vendored file.
- All hosting/design/QA detail lives in `references/dashboard-design-and-visual-qa.md` (cohesion, contrast audit, typography guards, QA scripts, screenshot pitfalls). Read it before changing the dashboard's look.
- **Never round-trip a long-line file through read_file + write_file.** Any minified or bundled CSS/JS counts. `read_file` truncates very long lines, which silently destroyed most of `src/styles.css` once (172 braces survived of 347). Edit with `patch` or a script, then verify integrity afterwards: check braces balance, confirm known rules are still present, and compare a whitespace-normalized copy against `dist/assets/*.css` from the last good build. That comparison proved the recovery byte-exact. Note that Vite's minifier rewrites media queries to range syntax (`(width<=1180px)`), so grep for the old `max-width:1180px` form returns zero on a perfectly intact file.
- Weather is visual: condition glyph plus per-day outlook icons, provider artwork only. `weather.mjs` captures the icon reference from the page markup or the API `condition.icon`, accepts only the provider CDN, and `warm-icon-set.mjs` pre-seeds the full code set into `media/icons/`. The server runs read-only (`ProtectSystem=strict`), so it must never download at request time; re-run the warm script on a fresh host. Serve icons same-origin with a `?v=N` token so a cached 404 at the CDN edge cannot shadow a present file. `conditionTone()` drives the panel tint, and a missing icon falls back to an inline SVG rather than a broken image.
- Apply a long `Cache-Control` only after a successful file read. Setting it before the read let a 404 be cached for a week by the CDN edge, which presented as a broken icon even after the file existed.
- Snapshot research and live weather are distinct. Toronto weather uses WeatherAPI.com location id `317748`: the official REST API when `WEATHERAPI_KEY` is set, otherwise a server-side parse of the public Toronto page. Both are proxied through same-origin `/data/weather.json` so the key never reaches the browser. Label source/time and stale editions. A past date must never show current conditions.
- **The key is configured and the API is the live path** (`source: weatherapi-api`). It is what makes the visual weather section possible: feels-like, humidity, UV, gust, visibility, true daily high/low and the **hourly strip** all exist only via the API. The keyless page path has none of them; leave those `null` and omit the tile rather than inventing a number. Setup is 4 steps and one of them is easy to miss: the systemd unit needed an `EnvironmentFile` directive it did not have, so the service silently kept using the keyless path until it was added. Recipe, field mapping and the two icon traps are in `references/weatherapi-key-and-live-weather.md`.
- **Extend `iconUrls()` whenever you add a new collection of weather entries.** It originally covered only `current` and `daily`, so hourly-only codes were missing from the icon map and `attach()` set `icon_local: null` while the PNGs sat seeded on disk. Symptom: current and most daily icons fine, a few hourly and every night-period hourly icon blank. Quick triage: file present on disk + `icon_local` null means the collection bug; a genuinely absent file shows up when listing `media/icons/`. `server.mjs` needs the matching `attach` loop extension too.
- "Ceiling" is an aviation/METAR metric and **is not a WeatherAPI field**. Substitute UV index and visibility and say so instead of labelling an invented value as ceiling.
- Preserve every required verified local-event item, not only top picks. Do not copy yesterday's facts forward under a new date.
- QA: React build/frontend tests, `server.test.mjs`, `test_publish.py`, public HTTP/JSON verification, mobile 320/390px, tablet/desktop, theme, search/filter, stale-date and network failure.
- Standalone HTML renderer remains an optional offline export, not the daily delivery method.
- Social sources: run `node /home/ubuntu/phiads-odysseus/toronto-today/scan-social-sources.mjs` from the app dir first. It reads two public pages and writes `data/social-candidates.json` with structured candidates (title, start, url, venue, image): Luma via the `__NEXT_DATA__` blob on `lu.ma/toronto`, Eventbrite via the JSON-LD `ItemList` on its Toronto directory page. Measured 2026-09-26: 17 Luma and 28 Eventbrite candidates, 5 and 7 of them today, and Eventbrite supplies images we can feed to the image pipeline.
  - These are CANDIDATES, never confirmed. Verify each against the organizer before publishing.
  - Luma is the better fit for the social bar (creative, community, cultural: photo walks, cafe socials, festivals). It does include non-Toronto listings (for example Square One in Mississauga), so filter by venue/city to Toronto and the defined regions.
  - Eventbrite skews heavily to nightlife and club nights ("ladies free", dancehall/late-night promos). The existing exclusions apply unchanged: no tiny bar gigs, no appearance/demographic/romantic framing. Take only the genuinely cultural, community, fitness or alcohol-optional listings.
  - Both list far more than the 3-item cap, so select on quality rather than taking the first entries.
- Business/economics sourcing: the reader is an AI practitioner building a company, so weight the section toward what will actually affect him and gather 10 to 15 items:
  - AI lab and tooling sources first: Anthropic, OpenAI, Google DeepMind and similar lab engineering blogs, release notes, model and API announcements, case studies, and eval or safety writeups; plus tooling teams like LangChain, Vercel AI, Hugging Face.
  - Engineering briefs and breakthroughs: notable systems, inference, training and hardware results, with the primary paper or engineering post linked, not a summary site.
  - Venture capital and startup news: funding rounds, notable raises, acquisitions, and market shifts, from the company's own announcement or a primary report.
  - Hacker News and YC signal: front-page engineering or AI discussions, Show HN launches, and YC batch or demo-day news that is genuinely interesting rather than routine.
  - LinkedIn: scour public posts and company pages for AI, engineering and hiring-market signal. Quote or link the specific post, never a LinkedIn feed or search URL.
  - Still include material US and Canada business news (trade, Fed/BoC, markets, major corporate moves).
  - Set `impact` on each item: one short line on why it matters to him specifically. If the only honest answer is "interesting but not impactful", say that plainly instead of inflating it.
  - Prefer depth over volume: a real engineering writeup beats five press-release rewrites. Never pad to hit the count.
- Prioritise the whole briefing, and around-the-city research specifically, toward events a young, socially active person would enjoy: cultural and heritage festivals, university and student programming, concerts and live music, sports fixtures, artsy and creative events, and anything with large expected attendance. Set the `crowd` field from evidence so the dashboard can sort on it; omit it when there is no evidence.
- Learning section (`learning`): WEEKLY, NOT DAILY. It lives in its own file, `data/learning.json`, served at `/data/learning.json`, and is maintained by the separate "Weekly deep-reading pool refresh" cron job (Sundays). The daily run must NOT produce or overwrite it: leave `learning` out of the daily payload (the publisher treats it as optional). The pool holds 20 to 30 verified deep articles; the dashboard shows the first N and each card has a refresh button that swaps in the next unused pool item, so the pool size is what makes that button useful. Deep reading material, separate from business news: transformer internals and attention variants, inference and serving, context and memory engineering, evaluation, agent design, distributed systems, Kubernetes and deployment, forward deployed engineering, foundational papers. Prefer primary sources (arXiv and lab papers, lab and first-party engineering blogs) and never link an aggregator, feed, or listicle. Never write a link unless it was confirmed to load or confirmed to exist via a real reference; never construct or guess a URL. Target the deeper side of AI and engineering, for example transformer architecture and attention internals, inference and serving, context and memory engineering, evaluation, distributed systems, Kubernetes and deployment, forward deployed engineering, agent design. Sources to favour: arXiv and lab papers (Anthropic, OpenAI, DeepMind, Google Research), lab engineering blogs, high-quality engineering writeups, roadmap-style learning paths. Link the primary paper or original article, never an aggregator or a feed. Set `topic`, `level`, real `minutes`, and a `why` that says what will actually be learned. No listicles, no press releases, no news.
- Preview images: every item AND every venue must have one. Resolution is tiered, best source first, and every tier returns an asset that is genuinely of the subject: **(1)** the page's own og:image/twitter/JSON-LD, **(2)** the event's **own poster from the organizer's own website** via its CMS (`wp-json/wp/v2/search` then the post's featured media), **(3)** a freely-licensed **photo of the place** from Wikimedia Commons, **(4)** the site's own declared icon, **(5)** `/favicon.ico`, **(6)** the site's real favicon via a resolver for hosts that block datacenter IPs (mhrth.com, ago.ca, ouevents.ca, tiff.net). Never a placeholder, never a stock substitute. Tiers 2 and 3 exist because Preyansh asked for them by name: use the event poster if there is one, otherwise a photo of the location it happens at (his example, David Pecaut Square).
- **Never resolve card images with image search.** A Bing image query for a niche local event returned Magic: The Gathering cards, and Google Images blocks scraping and cannot confirm the image belongs to that event. An organizer's own site is authoritative; a search engine is not. A CMS-sourced poster must pass a title-overlap guard (`isSameEvent`) so a wrong poster can never be shown.
- Commons photos are CC-licensed and **attribution is a licence condition**: store `{author, license, page}` per image and show it as an image caption plus a consolidated footer credits line. Organizer posters need no credit.
- Venues have no URL of their own: resolve them via `venues.json` (name to official homepage) through the same ladder, keyed `venue:<Name>` in `data/images.json`. Run `node warm-images.mjs` after publishing and check its `stillMissing` is empty. Verify real browser coverage with `qa-image-coverage.cjs`, which asserts every card in every section has a loaded image.
- **Verify the artefact on disk, never the pipeline's own success report.** Every image tier once reported success while `images.json` kept stale values: posters downloaded correctly, the run printed `poster: 2`, and the map still pointed at an 847-byte favicon. Use file size as the quickest truth test (a favicon is hundreds of bytes, a poster is hundreds of KB) and read `data/images.json` from disk rather than through the CDN.
- All sourcing recipes, CMS endpoints, attribution handling, guards and failure modes are in `references/image-sourcing-ladder.md`. Read it before touching the image pipeline.
- **Adding a section or field means updating four whitelists in two languages, and missing one makes data silently vanish.** `publish.py`'s `SECTIONS` dict and `src/lib/briefing.js`'s `fields` array and section loop all have to learn the new name, plus any per-section cap. The symptom is a section stuck on its empty state even though the published JSON contains the data, which reads to the user as "why is there nothing here?". Every published field must also be a **string** (`Expected bounded text in <key>` rejects a number, so a reading time is `"25 min"`, not `25`), and a newly registered section becomes **mandatory** in every payload until it is listed in `OPTIONAL`. Full recipe, exact error messages and order of work: `references/public-data-contract-plumbing.md`.
- **A limit changed in the contract must also be changed in code.** The contract was raised to 15 social options while `publish.py` still rejected more than 3, which would have failed the next day's publish outright. Grep both the publisher and the normalizer for a section name whenever its cap changes.
- **Hard caps are the wrong shape here: give the reader a count control.** Preyansh asked for a per-section dropdown with **Show 5 / Show 10 / Show 15, defaulting to 10**, so he decides how much to read. Keep gather targets in `CONTRACT.md` high enough (15+) that the larger options are useful, and do not re-add a silent cap in the normalizer.
- **Run `node --check server.mjs` after every edit to it, before restarting the service.** An edit that added routes left an unclosed block, and the site stayed up only because systemd was still running the previously loaded code; it would have gone down on the next restart, reboot or crash. Editing that one file has broken it more than once, so a syntax check is the standing guard.
- The brand mark is a **CN Tower in `#275c48`** (which is also the `theme-color`), deliberately simplified so it reads at 16px. Assets live in `public/` and are rasterised from the SVG with Playwright (screenshot at each size, then wrap the 32px PNG in a minimal ICO container so `/favicon.ico` works too). `server.mjs` routes only the icon paths it is told about, so a new icon file needs its route added as well as its `<link>` tag.
- Dead source links are a defect: if a previously cited event URL now 404s, use a working official URL and say so.
- Test the actual cron execution, not only the local publish command: a job-specific model/provider pin can differ from the active chat and fail even after chat-provider credit refills. Change only the intended job with supported CLI after user direction, then run a read-only smoke. Never claim cron readiness from HTTP health alone.
- **Check the pinned model's per-token price before blaming a balance.** A premium pin can reserve more credit per run than a small balance authorizes, producing HTTP 402 "would exceed your available credits" from OpenRouter even when credits remain. Compare `GET https://openrouter.ai/api/v1/models` pricing for the job's model versus the cheap default, then pin the job to a cheap high-context model (this job uses `deepseek/deepseek-v4.1-flash`, about $0.30/M in and $1.20/M out). A $10/M in, $50/M out pin such as `openai/gpt-6-astra` is roughly 33x the cost and triggered exactly this failure. Verify a direct minimal completion succeeds before retrying the job.
- Publisher-controlled provenance/source notes must not echo internal authentication errors. Keep technical blockers in Discord, not the public briefing.

## Core output contract

Produce a concise briefing titled with the date or `Today`. Keep these top-level sections in order:

1. **Weather** — current conditions, high/low, precipitation, wind, and practical advice.
2. **Networking** — verified opportunities likely to attract accomplished founders, investors, senior operators, technology leaders, finance professionals, or other high-signal business communities.
3. **Prime business news / stories** — current local or national business/technology/funding developments from reputable public web sources and primary announcements.
4. **Social options** — split into **Major events** and **Wholesome options**.
5. **Nearby cultural events in downtown Toronto** — required for the Toronto briefing (Preyansh asked for it explicitly on 2026-09-25). Always include this section in the Toronto job even when the result is empty.

For Toronto, deliver these as concrete numbered sections: (1) weather, (2) high-signal networking,
(3) mandatory local-events scan around Maple Leaf Square plus Rogers Centre and Blue Jays,
(4) US/Canada business and economics, (5) social options with a maximum of three recommendations,
(6) downtown cultural events.

End with **Best bets today**, selecting a small number of realistic, verified choices.

## Section: nearby cultural events in downtown Toronto

Required coverage, roughly 3 km of downtown/Union Station, plus any major cultural event city-wide
worth naming:

- **Museums and galleries:** ROM, AGO, Aga Khan Museum, MOCA, Textile Museum of Canada, Bata Shoe
  Museum, Campbell House, Spadina Museum, Design Exchange.
- **Performing arts:** Four Seasons Centre for the Performing Arts, Roy Thomson Hall, Massey Hall,
  Meridian Hall, St. Lawrence Centre for the Arts, Harbourfront Centre Theatre, Koerner Hall.
- **Theatre and film:** Mirvish theatres (Royal Alexandra, Princess of Wales, CAA), TIFF Bell
  Lightbox, Factory Theatre, Tarragon, Soulpepper, Young Centre, Cineplex Yonge-Dundas.
- **Live music:** classical, jazz, and world music specifically, not generic bar bands.
- **Dance, literary, heritage, festivals:** National Ballet, literary and author events, heritage and
  historic-site programming, cultural festivals, Nuit Blanche and similar.
- **Free / pay-what-you-can:** Toronto Public Library cultural series, Toronto Reference Library
  talks, city cultural centres, free museum nights.

Per item record: name, exact start time, approximate end time clearly labelled approximate when the
venue does not publish one, venue, neighbourhood, downtown-central vs midtown vs east/west label,
ticket price or free/pay-what-you-can status when verified, and a direct link to the official venue
or organizer page. Check the City of Toronto culture calendar, Destination Toronto, and Toronto Arts
Council listings for discovery, but verify against the official page before reporting.

Say explicitly that no verified downtown cultural event was found when the scan comes up empty. Never
pad with stale, undated, or unverified listings, and never cite a listing whose date cannot be
confirmed for today.

## Prioritization

### Social
Optimize for high-attendance, socially active, conversation-friendly settings rather than merely listing many events. Prioritize major concerts, sports, festivals, recognized cultural venues, outdoor public programming, art/design, fitness/recreation, university/community events, and activities with natural participation. Do not claim that an event guarantees romantic connections or make unsupported claims about attendees' appearance or demographics. Frame the goal as respectful socializing.

Major-event examples include stadium/arena concerts, professional sports, major festivals, conventions, exhibitions, headline comedy/theatre, and city-wide experiences. For Toronto, check Rogers Centre/Rogers Stadium, Scotiabank Arena, Budweiser Stage, Massey Hall, History, Coca-Cola Coliseum, BMO Field, major museums, TIFF, and CNE.

Wholesome options are not limited to a fixed list. Search broadly for outdoor movies, community BBQs, picnics, dog-friendly activities, group walks, free museum/gallery programming, outdoor music, public art, volunteering, classes, games, nature activities, fitness, maker events, community meals, educational talks, cultural programming, family-friendly festivals, university events, and unusual one-day experiences. Prefer low-pressure activities where conversation and participation are natural and drinking is not the focus. State alcohol status as absent, optional, or unknown only when supported.

### Networking
Optimize for quality over volume. Prefer credible accelerators, VC/investor events, major conferences, university/industry leadership events, executive panels, founder gatherings, finance/business events, and established technology communities. Exclude generic networking spam, stale listings, and events that already ended. Clearly label online or non-central options.

## Research procedure

1. Determine the current date and target timezone with a system tool; do not infer it from memory.
2. Search live public sources for today's date. Use official venue/team/organizer pages first, then reputable local media and event platforms for discovery.
3. For each candidate, verify today's date, time, location, and availability from a page that actually supports the claim. Do not promote future, stale, or already-ended listings.
4. Search public Instagram pages only when useful for community programming; link only public posts/pages and never imply access to private content. Instagram is supplementary, not a reason to weaken verification.
5. Use public web research by default. Do not make X/Twitter access a dependency for business news; if X is unavailable, use primary company announcements and reputable business reporting and label the source accurately.
6. Prefer a short list of strong options over padding. Say explicitly when a category has no verified match.
7. Include direct source links for weather, events, and business stories. Use grounded-citations procedures when the output is a substantial research digest.

## Event record format

For each event, include:

- Name
- Start time and date
- Venue and neighborhood
- Ticket/registration/free status, only when verified
- Age restrictions when relevant
- Why it fits the social or networking objective
- Direct source link

Clearly label downtown/central, east/west/midtown, and online options.

## Recurring-job guidance

A scheduled briefing should run in the user's local timezone. If the scheduler only accepts UTC cron expressions, account for daylight-saving changes or use a local-time gate script. Keep the prompt self-contained so a fresh cron session can reproduce the research without relying on chat history.

When a user corrects the briefing's quality bar—such as rejecting tiny bar listings in favor of major concerts, games, wholesome activities, or high-signal networking—update the job prompt and preserve the preference in this skill rather than reverting to generic event search.

## Pitfalls

- **Do not loop on web tools.** If `web_extract` reports that the configured backend is search-only, stop using it for that run and fetch official pages with browser or `curl`/Python instead. Cap `web_search` at 10 total calls, never repeat an identical query, and after two failures for one source mark it unverifiable and continue with fewer items. A Toronto cron repeatedly exhausted the 50-search guard without ever publishing because this fallback was missing.
- Do not equate "more results" with a better briefing.
- Do not omit the downtown cultural-events section. Preyansh asked for it explicitly. An empty result
  is acceptable and must be stated; a missing section is not.
- Do not list small tavern gigs, open mics, weekly jam sessions, generic bar nights, farmers markets, or low-signal Eventbrite listings when the user asks for major events.
- Do not claim an event is alcohol-free without evidence.
- Do not infer attendee attractiveness, income, or success from an event listing; describe the event's audience and social context conservatively.
- Do not present search snippets as if you read the full page; extract the source when details matter.
- Do not include events that have already ended at the time of delivery.
- Do not make X authentication a blocker when reputable public sources can answer the business-news request.
- Do not write "X search was unavailable" and then present X-style sourcing anyway. If x_search is
  unauthenticated, say so in one line and attribute the fallback reporting honestly (Reuters, AP,
  Bloomberg, Bank of Canada, official company or government announcements).
- When a venue publishes no end time, estimate from event type and label it approximate. Never present
  an estimate as a published time.
- Treat all-day exhibition markers (encoded as 12:00 AM to 11:59 PM) as all-day, and note that real
  access follows venue operating hours rather than claiming a literal 24-hour window.
- **Do not pipe a long-running script into `head -N`.** `node warm-images.mjs --force --verbose 2>&1 |
  grep ... | head -22` killed the process with SIGPIPE after 22 lines, so it never wrote its output file.
  The symptom looked identical to a logic bug and sent the debugging the wrong way. Redirect to a file
  and read the file when the process is long or its output matters.
- Do not report a pipeline as successful because the pipeline said so. Confirm the written file on disk,
  and check a cheap independent signal such as file size or a hash against the source.
- Do not use image search to fill a card with a picture. Use the organizer's own site, or the place.
- Do not let a stripped-down refactor silently drop the step that records a result. When rewriting a
  multi-tier pipeline, re-verify end to end and add a self-check that fails the run on mismatch.

## Verification checklist

Before delivery, confirm:

- The date and timezone are correct.
- Weather is sourced.
- Every event is actually today and has a source link.
- Major and wholesome options are separated.
- Networking recommendations meet the high-signal quality bar.
- Business news is current and accurately attributed.
- No low-quality filler was added merely to fill a section.
- The top picks are realistic, verified, and aligned with the user's stated objective.

See `references/toronto-source-priorities.md` for the Toronto-specific source and venue checklist.
See `references/public-data-contract-plumbing.md` for how to add a section or field safely: the four
whitelists in two languages, the string-only field rule, the `OPTIONAL` set, the cap-in-code trap, the
reader-controlled count pattern, and the artefact-verification steps.
See `references/image-sourcing-ladder.md` for the full card-image ladder: the organizer-poster CMS recipe,
the Wikimedia location-photo recipe and its attribution requirement, the venue map, and the verification
and failure modes.
See `references/dashboard-design-and-visual-qa.md` for cohesion, the WCAG contrast audit, typography
guards, QA scripts and screenshot pitfalls.
See `references/weatherapi-key-and-live-weather.md` for the WeatherAPI key setup (including the
`EnvironmentFile` step that is easy to miss), the full payload field mapping, the hourly slice, the
`iconUrls()`/hourly-icon trap, the "ceiling is not a real field" substitution, and the live-weather
verification script.
