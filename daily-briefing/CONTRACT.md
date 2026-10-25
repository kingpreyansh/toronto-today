# Toronto Today HTML briefing contract

The daily cron researches today's Toronto briefing, writes one JSON data file, and publishes its PUBLIC CITY fields to the React dashboard at https://today.getphiads.com/. This supersedes HTML attachment delivery. Never publish private planner/health/client/lead data or personal focus replies.

## Production hosted delivery

1. Research fresh data using the JSON shape below. All local-event coverage must be retained, not only top picks.
2. Run `python3 /home/ubuntu/phiads-odysseus/toronto-today/publish.py --input /home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD.json`.
3. Run `python3 /home/ubuntu/phiads-odysseus/toronto-today/verify_deployment.py`. Both commands must return `ok: true` before reporting an update.
4. Deliver the permanent HTTPS link in Discord, not an attachment. The React app reads fresh data automatically, no rebuild needed.
5. Preserve last good data on failures. Do not use `--allow-archive` or relabel old research as today.

`full_briefing_text` and `focus_prompt` are excluded from public data. See `../toronto-today/HOSTING.md`. The standalone renderer instructions below are retained ONLY for optional offline exports.

## Paths

- Renderer: `/home/ubuntu/.hermes/scripts/render_toronto_briefing.py`
- Daily JSON: `/home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD.json`
- Daily HTML archive: `/home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD-toronto-briefing.html`
- Latest copy: `/home/ubuntu/phiads-odysseus/daily-briefing/today.html`

## Required JSON shape

```json
{
  "schema_version": 1,
  "meta": {
    "date_iso": "YYYY-MM-DD",
    "date_display": "Saturday, September 26, 2026",
    "city": "Toronto",
    "timezone": "America/Toronto",
    "edition": "7:00 AM edition",
    "generated_at": "September 26, 2026 at 7:05 AM EDT"
  },
  "weather": {
    "temperature": "12°",
    "condition": "Clear",
    "summary": "One concise practical forecast paragraph.",
    "high_low": "20° / 9°",
    "precipitation": "10%",
    "wind": "12 km/h",
    "sun": "7:09 / 7:07",
    "source_url": "https://official-or-primary-source"
  },
  "best_bets": [
    {
      "category": "Networking",
      "title": "Event name",
      "time": "6:00 to 8:00 PM",
      "location": "Venue",
      "why": "Why this is one of today's best realistic options.",
      "url": "https://official-source"
    }
  ],
  "networking": [],
  "local_events": [],
  "business_source_note": "Optional one-line sourcing note.",
  "business_news": [],
  "cultural_events": [],
  "social_options": [],
  "venue_checks": [],
  "focus_prompt": "What is the one thing you are going to do today?"
}
```

Each event object in `networking`, `local_events`, `cultural_events`, and `social_options` accepts:

```json
{
  "title": "Required event name",
  "category": "Short category",
  "time": "Exact start and exact or clearly approximate finish",
  "venue": "Venue",
  "neighborhood": "Neighbourhood",
  "location_label": "Downtown central | Midtown | East | West | Online",
  "price": "Free | C$25 | Pay what you can | Check inventory",
  "status": "Available | Sold out | Registration required | Scheduled",
  "summary": "Why it matters or fits. Keep concise.",
  "crowd": "young-crowd | mixed | general | family | quiet",
  "url": "https://direct-official-source"
}
```

`crowd` is how likely a young, lively crowd will be there. It is the reader's first priority, and the
dashboard sorts on it, so set it honestly from evidence (a university event, a cultural festival, a concert,
a sports fixture, an artsy or nightlife-forward listing is `young-crowd`; a midweek daytime talk or a
family-oriented market is not). If there is no evidence, omit the field rather than guessing; omitted values
keep a neutral rank and never sort ahead of a genuine `young-crowd` item.

Prioritise research toward what a young, socially active person would actually enjoy: cultural and
heritage festivals, university and student programming, concerts and live music, sports fixtures, artsy and
creative events, and anything with a large expected attendance.

Each business-news object accepts:

```json
{
  "title": "Headline",
  "why_it_matters": "One concise, grounded implication.",
  "source": "Reuters | Bank of Canada | Official company",
  "url": "https://source"
}
```

Each venue check accepts:

```json
{
  "venue": "Scotiabank Arena",
  "status": "Verified event at 7:00 PM or no public event on official calendar",
  "state": "event | live | checked | clear"
}
```

## Generation flow

1. Resolve current date and timezone with `TZ=America/Toronto date`.
2. Research and verify the required briefing sections using the city-daily-briefings skill.
3. Write the JSON with the file tool. Arrays must be present even when empty. Never insert HTML.
4. Validate and render:

```bash
python3 /home/ubuntu/.hermes/scripts/render_toronto_briefing.py \
  --input /home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD.json \
  --output /home/ubuntu/phiads-odysseus/daily-briefing/YYYY-MM-DD-toronto-briefing.html \
  --latest /home/ubuntu/phiads-odysseus/daily-briefing/today.html
```

5. Verify the renderer returns `"ok": true`, the dated HTML exists and is non-empty, and the HTML contains all five headings: `Networking`, `Downtown pulse`, `Business and economics`, `Culture nearby`, `Social options`.
6. Deliver the dated HTML with a `MEDIA:/absolute/path.html` line. Do not attach JSON or screenshots.

## Safety and quality

- The renderer escapes all text and allows only `http` and `https` source links.
- Never claim a third-party widget supplied data unless it actually did.
- The HTML includes a separately labelled live Open-Meteo current-weather enhancement for the same Toronto date, with an 8-second timeout. Offline, blocked storage, no JavaScript and archived dates retain the saved forecast. Weather API failures must not break the briefing.
- `meta.content_note` optionally records provenance. For format conversions use `full_briefing_text` to preserve the entire original report in an expandable section. Do not claim the conversion is a new research run.
- Include every required local event in the JSON, not just the top picks. The counters deduplicate by source URL. All six metadata chips, including region, stay visible.
- Saved HTML files are dated snapshots. Updating server-side `today.html` does not update files already downloaded by Preyansh. No public hosting is created by this workflow.
- Do not use generic Google News home-page links. Link the specific article, primary announcement, or verified source page.
- Keep `best_bets` empty (it is no longer displayed). Gather generously elsewhere: the dashboard shows 10 by default and lets the reader expand to 15, so aim for at least 15 verified events across `local_events` and `cultural_events`, up to 15 in `social_options` (distinct from the other sections), and 10 to 15 in `business_news`. Returning more good verified items is useful; padding with weak ones is not.
- An empty verified section is valid and will render a clear empty state. Never pad it.

### `learning` (deep reading picks)

Optional section. This is NOT business news: it is material the reader can learn from, on the deeper side of
AI and engineering. Each item accepts:

```json
{
  "title": "Paper or article title",
  "topic": "Transformer architecture | Distributed systems | AI engineering | Context engineering | Forward deployed engineering | Kubernetes | Inference | Evals",
  "level": "Foundational | Intermediate | Advanced",
  "minutes": 25,
  "why": "What the reader will actually walk away understanding.",
  "source": "arXiv | Anthropic Engineering | Google Research | ...",
  "url": "https://direct-source"
}
```

Rules: link the primary source (the paper, the lab's own engineering post, the original article), never an
aggregator, a slide deck or a feed. `minutes` is a real estimate of reading time. `why` must describe what is
learned, not why it is interesting. Prefer genuinely deep material over listicles: transformer internals,
attention variants, inference and serving, distributed systems design, context and memory engineering,
evaluation, deployment and orchestration. 6 to 15 items, best first.
