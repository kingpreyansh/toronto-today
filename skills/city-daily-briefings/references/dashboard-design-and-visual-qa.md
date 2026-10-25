# Dashboard design and visual QA (no vision tool available)

The hosted briefing dashboard is a visual deliverable, and Preyansh judges it visually. He pushed back
twice in one session: once on legibility ("subtext font are too small you need to make them much
bigger") and once on composition ("just make it look good man. I don't think it really looks good").

Both are legitimate quality bars, not nitpicks. Treat "it doesn't look good" as a defect report.

## The constraint to state plainly

The agent may have **no vision tool** in a given session. It cannot look at a screenshot. Do not fake
an opinion about how something looks, and do not claim it looks great.

Instead:

1. Measure the properties that determine whether it *reads*: font sizes, contrast ratios, overflow,
   element widths, broken images.
2. Take screenshots and send them so the user can judge.
3. Say explicitly which parts were measured and which were left to the user's eye.

This was well received. Guessing would have been worse.

## Cohesion: one surface, not two

The specific composition defect: a **light beige panel sitting next to a dark glass widget**. Two
design languages in one block, which read as broken regardless of how good either half was.

Fix: put the whole block on **one surface**. The widget, the summary, the metric tiles and the outlook
all live on a single dark deck, with the glass widget in a darker inset panel so its effect reads as
designed. One `.wx-deck` wrapper, one background, one text-colour vocabulary.

General rule: when integrating a styled third-party component into an existing design, do not drop it
beside the existing styling and hope. Rebuild the containing block around it.

## Contrast verification without seeing the page

Text on a gradient cannot be judged by picking one background colour. Composite the layers explicitly
and score every text colour against the worst stop.

The audit that caught a real bug:

```python
# blend translucent text over the panel, panel over the gradient stop
panel = over(white, layer_alpha, over(black, scrim, stop))
fg    = over(white, text_alpha, panel)
ratio = wcag_contrast(fg, panel)
```

Results before the fix — these were genuinely unreadable where the gradient was lightest:

| element | ratio | verdict |
|---|---|---|
| deck credit / tile labels / outlook labels | 3.66:1 | FAIL (needs 4.5) |
| vendor widget's own text | 3.24:1 | FAIL |

Minimum white alpha on that gradient is **0.66** for 4.5:1. Shipped values: deck dim text `0.78`,
outlook condition `0.76`, widget scrim `0.62`. Worst case after: **4.54:1**; every element passes AA.

Key insight: **the vendor component hardcoded its own translucent text colours**, so raising your own
alphas was not enough. The only legitimate lever was darkening what sits *behind* it (a scrim), since
editing a vendored file destroys provenance. Solve for the required scrim numerically rather than
guessing: 0.0 -> 3.24, 0.55 -> 4.41, 0.60 -> 4.53, 0.65 -> 4.62.

## Typography

Floor is **13px for all visible text**. Before the fix there were 38 declarations at 11px or below,
including three at 8px. Those were removed, not merely overridden.

- body 17px, 16px on phones
- subtext 14-16px
- labels 13px

Guard it twice: a stylesheet scan (`src/lib/typography.test.js`) fails on any `font-size` under 13px,
and a browser probe (`qa-font-sizes.cjs`) walks every visible text node at 1440/768/390/320 and fails
if anything renders below the floor. CSS-only checks miss inherited and shorthand sizes; both are
needed. The stylesheet test caught new 12px labels being added later the same session.

## Verification scripts worth keeping

| Script | Checks |
|---|---|
| `qa-font-sizes.cjs` | computed font size of every visible text node, overflow, at 4 widths |
| `qa-contrast.py` | WCAG ratio per text colour, compositing gradient + panel + scrim |
| `qa-images.cjs` | images load, none broken, none cross-origin |
| `qa-einui.cjs` | widget renders, no console errors, no external requests, no overflow |
| `verify_deployment.py` | real public output matches the local allowlisted copy |
| `warm-icon-set.mjs` | pre-seeds provider condition artwork (server is read-only) |

Screenshots via Playwright: walk the page to trigger `loading="lazy"` images before asserting on them,
or below-the-fold images never resolve and a naive `await` on load hangs.

## Pitfall

Changing an element the QA scripts wait on silently breaks them. After `.weather-credit` was replaced
by `.wx-deck-credit`, two scripts timed out on `waitForSelector('.weather-credit')` and returned no
JSON. Keep the selectors the QA scripts depend on in sync with the markup.
