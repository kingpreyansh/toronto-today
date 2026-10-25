# Adding a field or section to the public data contract

The dashboard's payload passes through **four independent whitelists in two languages**. A new field or
section must be registered in every one. Missing any single one does not error — the data is silently
dropped and the section renders as an empty state. That failure mode produced the user's complaint
*"why is there nothing here?"* even though the published JSON contained the data.

## The four places

| # | Where | What it gates | Symptom if missed |
|---|---|---|---|
| 1 | `publish.py` → `SECTIONS` dict | which fields survive into `data/latest.json` | field absent from the published file |
| 2 | `publish.py` → `OPTIONAL` set | whether a section may be absent from a payload | **every** publish fails, including old payloads and the whole publisher test suite |
| 3 | `src/lib/briefing.js` → `fields` array | which keys survive `normalizeBriefing` in the browser | data is published but never renders |
| 4 | `src/lib/briefing.js` → the section loop list | which sections exist client-side | section renders its empty state forever |

There is also a fifth, subtler one: the **per-section cap** inside that same loop
(`result[key] = ['best_bets','social_options'].includes(key) ? items.slice(0,3) : items`). A cap here
silently truncates even when the contract and the publisher allow more.

## Trap 1: every published field must be a string

`publish.py`'s `select()` enforces this for every key in every section:

```python
if not isinstance(value,str) or len(value)>6000:raise ValueError('Expected bounded text in '+key)
```

A numeric or boolean field fails the whole publish with
`Publication rejected: Expected bounded text in <key>`. Live example: a reading-time field published as
`"minutes": 25` was rejected. Store a **label string** instead (`"read": "25 min"`), and render that
directly rather than re-deriving it in the UI.

## Trap 2: adding a section makes it mandatory everywhere

The publisher loops `for name,keys in SECTIONS.items()` and requires each one to be a list in the incoming
payload. Registering a new section therefore **breaks every existing payload and the publisher tests**:

```
ValueError: Invalid section learning
```

Fix by declaring it optional so it defaults to empty:

```python
SECTIONS = { ..., 'learning': ('title','topic','level','read','why','source','url') }
OPTIONAL = {'learning'}          # may be absent; defaults to []

for name, keys in SECTIONS.items():
    rows = data.get(name)
    if rows is None and name in OPTIONAL: rows = []
    if not isinstance(rows,list) or len(rows)>150: raise ValueError('Invalid section '+name)
```

Prefer optional for anything the research run may legitimately return empty. Required is right only for the
sections the dashboard always renders.

## Trap 3: a cap in the code can contradict the contract

The contract was raised to allow up to 15 social options while `publish.py` still asserted
`len(rows)>3` for `social_options`. The next research run would have returned 6 items and **the publish
would have failed outright**. When a limit changes, grep for it in the code as well as the docs:

```
grep -rn "social_options" publish.py src/lib/briefing.js
```

## Order of work when adding a section

1. `publish.py`: add the section to `SECTIONS` with its field tuple, add it to `OPTIONAL` if it may be empty.
2. `publish.py`: check for any cap on that section and align it with the contract.
3. `src/lib/briefing.js`: add every new key to the shared `fields` array.
4. `src/lib/briefing.js`: add the section name to the normalize loop, and confirm the cap logic excludes it.
5. `CONTRACT.md`: document the object shape and the sourcing rules.
6. Run `python3 -m unittest test_publish` and `npm test`. Test files that assert old caps will fail; those
   are intended-behaviour changes and the assertions should be updated, not worked around.
7. Publish, then verify the field is present in the **served** JSON and that the section actually renders in
   a real browser — both halves, because a whitelist failure is invisible in the JSON alone.

## Reader-controlled section length (user preference)

Hard-capping a section length is the wrong shape for this user. He asked for a **dropdown per section with
Show 5 / Show 10 / Show 15 and 10 as the default**, so he decides how much to read. Implement as local UI
state keyed per section, applied via `slice(0, count)`, and keep the gather targets in `CONTRACT.md` high
enough (15+) that the larger options are actually useful. Do not re-introduce a silent cap in the
normalizer to "protect" the layout.

## Verify the served artefact, not the pipeline

Every check must read what the browser would receive:

```bash
curl -sS https://today.getphiads.com/data/latest.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('items:', len(d.get('learning') or []))"
```

Then drive a real browser and count rendered cards plus assert there is no console error. A section can
publish correctly and still render nothing because of whitelist #3 or #4.