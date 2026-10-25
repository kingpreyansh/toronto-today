#!/usr/bin/env python3
"""Confirm structured event extraction from the Luma and Eventbrite public pages."""
import json
import re
import subprocess

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def curl(url):
    out = subprocess.run(['curl', '-sS', '-L', '--max-time', '30', '-A', UA,
                          '-H', 'Accept-Language: en-CA,en;q=0.9', url], capture_output=True)
    return out.stdout.decode('utf-8', 'ignore')

print('=== LUMA: embedded JSON in the page ===')
html = curl('https://lu.ma/toronto')
print('  page bytes:', len(html))
# Next.js style payload
for pat, label in [(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', 'NEXT_DATA'),
                   (r'window\.__NUXT__=(.*?);</script>', 'NUXT')]:
    m = re.search(pat, html, re.S)
    print(f'  {label}: {"found" if m else "not found"}')

# Luma also ships a JSON blob with entries
for key in ['"events"', '"entries"', '"featured_events"', '"place"']:
    print(f'  contains {key}: {html.count(key)}')

names = re.findall(r'"name":"([^"]{6,70})"', html)
print('  name fields found:', len(names))
print('  sample names:', names[:8])
starts = re.findall(r'"(?:start_at|startDate|start_date)":"([^"]{10,30})"', html)
print('  start fields found:', len(starts), starts[:4])
slugs = re.findall(r'"url":"(toronto/[^"]{3,60})"', html) or re.findall(r'href="/([a-z0-9-]{5,60})"', html)
print('  url-ish slugs:', len(slugs), slugs[:6])

print()
print('=== EVENTBRITE: JSON-LD + embedded state ===')
eb = curl('https://www.eventbrite.ca/d/canada--toronto--events/')
print('  page bytes:', len(eb))
ld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', eb, re.S)
print('  json-ld blocks:', len(ld))
for block in ld[:2]:
    try:
        d = json.loads(block)
        t = d.get('@type')
        print('    @type:', t)
        if isinstance(d, dict) and d.get('itemListElement'):
            items = d['itemListElement']
            print('    itemListElement:', len(items))
            print('    first:', json.dumps(items[0])[:260])
    except Exception as ex:
        print('    parse error:', ex)
print('  contains "events":', eb.count('"events"'))
print('  contains eventbrite.ca/e/:', eb.count('eventbrite.ca/e/'))
