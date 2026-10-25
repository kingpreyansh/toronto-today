#!/usr/bin/env python3
"""Inspect the fields available to derive an event's location, and test whether
Wikipedia/Wikimedia can supply a real photo of that place."""
import json
import subprocess
import urllib.parse

def curl_json(url):
    out = subprocess.run(['curl', '-sS', '--max-time', '25', '-A',
                          'Mozilla/5.0 (compatible; TorontoToday/1.0)', url],
                         capture_output=True, text=True)
    try:
        return json.loads(out.stdout)
    except Exception:
        return None

data = curl_json('https://today.getphiads.com/data/latest.json')
images = curl_json('https://today.getphiads.com/data/images.json')

print('=== fields present on a local event ===')
ev = (data.get('local_events') or [{}])[0]
print(json.dumps(ev, indent=1)[:900])

print()
print('=== location-ish fields across all items ===')
for section in ['best_bets', 'local_events', 'cultural_events', 'social_options', 'networking']:
    for item in (data.get(section) or []):
        loc = {k: item.get(k) for k in ('venue', 'location', 'location_label', 'neighborhood') if item.get(k)}
        has_img = bool(images.get(item.get('url')))
        print(f'  [{section:16}] img={str(has_img):5} {loc}')

print()
print('=== can Wikipedia give a real photo of the place? ===')
candidates = [
    'David Pecaut Square',
    'Nathan Phillips Square',
    'Scotiabank Arena',
    'Rogers Centre',
    'Union Station (Toronto)',
    'Hockey Hall of Fame',
    'Metro Toronto Convention Centre',
]
for name in candidates:
    title = urllib.parse.quote(name.replace(' ', '_'))
    d = curl_json(f'https://en.wikipedia.org/api/rest_v1/page/summary/{title}')
    if not d:
        print(f'  {name:36} -> no response')
        continue
    thumb = (d.get('thumbnail') or {}).get('source')
    orig = (d.get('originalimage') or {}).get('source')
    print(f'  {name:36} -> {d.get("title")}')
    print(f'      thumb: {thumb}')
    print(f'      page : {(d.get("content_urls") or {}).get("desktop", {}).get("page")}')
