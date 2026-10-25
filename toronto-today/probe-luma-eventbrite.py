#!/usr/bin/env python3
"""Probe Luma and Eventbrite for Toronto events: what is actually scrapeable?"""
import json
import re
import subprocess
import urllib.parse

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def curl(url, accept='application/json,text/html,*/*'):
    out = subprocess.run(['curl', '-sS', '-L', '--max-time', '25', '-A', UA,
                          '-H', f'Accept: {accept}',
                          '-H', 'Accept-Language: en-CA,en;q=0.9',
                          '-w', '\n@@HTTP:%{http_code}', url], capture_output=True)
    body = out.stdout
    marker = body.rfind(b'\n@@HTTP:')
    code = body[marker + 8:].decode().strip() if marker > 0 else '?'
    if marker > 0: body = body[:marker]
    return code, body.decode('utf-8', 'ignore')

print('=== LUMA ===')
for name, url in [
    ('discover toronto page', 'https://lu.ma/toronto'),
    ('discover api', 'https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-Bvpg3X8B3n46r1h'),
    ('search api', 'https://api.lu.ma/search/get-results?query=toronto'),
]:
    code, body = curl(url)
    print(f'  {name:24} HTTP {code}  len={len(body)}')
    if code == '200' and body.strip().startswith('{'):
        try:
            d = json.loads(body)
            keys = list(d)[:8]
            print('      json keys:', keys)
            entries = d.get('entries') or d.get('events') or []
            print('      entries:', len(entries) if isinstance(entries, list) else 'n/a')
            if isinstance(entries, list) and entries:
                e = entries[0]
                print('      sample:', json.dumps(e)[:300])
        except Exception as ex:
            print('      parse error:', ex)
    elif code == '200':
        m = re.findall(r'"(?:name|event)":\s*"([^"]{4,60})"', body)[:5]
        print('      text hits:', m)

print()
print('=== EVENTBRITE ===')
for name, url in [
    ('toronto search', 'https://www.eventbrite.ca/d/canada--toronto--events/'),
    ('api v3', 'https://www.eventbriteapi.com/v3/events/search/?location.address=Toronto'),
    ('public search json', 'https://www.eventbrite.ca/api/v3/destination/search/?q=toronto'),
]:
    code, body = curl(url)
    print(f'  {name:20} HTTP {code}  len={len(body)}')
    if code == '200' and body.strip().startswith('{'):
        try:
            d = json.loads(body)
            print('      json keys:', list(d)[:8])
        except Exception as ex:
            print('      parse error:', ex)
    elif code == '200':
        m = re.findall(r'class="[^"]*event-card[^"]*"', body)[:3]
        print('      event-card hits:', len(m))
