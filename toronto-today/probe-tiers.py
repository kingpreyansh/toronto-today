#!/usr/bin/env python3
"""Probe image fallback tiers for every source that currently has no image.

Tier 1: page og:image / twitter:image / JSON-LD
Tier 2: the site's own apple-touch-icon or favicon (a real brand asset)
Tier 3: the site's favicon via a public favicon service (still the real mark)
"""
import json
import re
import subprocess
import urllib.parse

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def curl(url, binary=False, timeout=20):
    cmd = ['curl', '-sS', '-L', '--max-time', str(timeout), '-A', UA,
           '-H', 'Accept: text/html,application/xhtml+xml,*/*;q=0.8',
           '-H', 'Accept-Language: en-CA,en;q=0.9',
           '-o', '-', '-w', '\n@@HTTP:%{http_code}:%{content_type}']
    out = subprocess.run(cmd + [url], capture_output=True)
    body = out.stdout
    marker = body.rfind(b'\n@@HTTP:')
    if marker < 0:
        return None, None, b''
    meta = body[marker + 8:].decode('utf-8', 'ignore').strip()
    body = body[:marker]
    parts = meta.split(':')
    return parts[0], (parts[1] if len(parts) > 1 else ''), body

def og_image(html, base):
    for pat in [r'property=["\']og:image:secure_url["\'][^>]+content=["\']([^"\']+)',
                r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
                r'content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
                r'name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)']:
        m = re.search(pat, html, re.I)
        if m:
            return urllib.parse.urljoin(base, m.group(1).replace('&amp;', '&'))
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.{0,20000}?)</script>', html, re.S | re.I):
        try:
            node = json.loads(m.group(1).strip())
        except Exception:
            continue
        for n in (node if isinstance(node, list) else [node]):
            if isinstance(n, dict) and n.get('image'):
                img = n['image']
                img = img[0] if isinstance(img, list) else (img.get('url') if isinstance(img, dict) else img)
                if isinstance(img, str):
                    return urllib.parse.urljoin(base, img)
    return None

def icon_link(html, base):
    best = None
    for m in re.finditer(r'<link[^>]+rel=["\']([^"\']*icon[^"\']*)["\'][^>]*>', html, re.I):
        tag = m.group(0)
        href = re.search(r'href=["\']([^"\']+)["\']', tag, re.I)
        if not href:
            continue
        rel = m.group(1).lower()
        if 'apple-touch' in rel:
            return urllib.parse.urljoin(base, href.group(1))
        if best is None:
            best = urllib.parse.urljoin(base, href.group(1))
    return best

URLS = [
    'https://toronto.thewordonthestreet.ca/event-directory/annual-festival/2026-festival/',
    'https://torontounion.ca/event/tkaronto-open-iv-presented-by-sturdy-br/',
    'https://roythomsonhall.mhrth.com/tickets/tso-mahler-yuja-wang-2026/',
    'https://www.ouevents.ca/ouf/',
    'https://www.tolive.com/Event-Details-Page/reference/Pete-Davidson-2026',
    'https://tiff.net/events/setting-the-scene-exhibition-open-hours',
    'https://masseyhall.mhrth.com/tickets/',
    'https://ago.ca/events/analog-photography-meetups',
    'https://finance.yahoo.com/news/trump-sees-no-urgency-canada-150107242.html',
    'https://www.federalreserve.gov/monetarypolicy/files/monetary20260916a1.pdf',
    'https://www150.statcan.gc.ca/n1/daily-quotidien/260924/dq260924a-eng.htm',
]

VENUES = {
    'Scotiabank Arena': 'https://www.scotiabankarena.com/',
    'Rogers Centre': 'https://www.mlb.com/bluejays',
    'Union Station': 'https://torontounion.ca/',
    'Meridian Hall': 'https://www.tolive.com/',
    'Hockey Hall of Fame': 'https://www.hhof.com/',
    'Metro Toronto Convention Centre': 'https://www.mtccc.com/',
}

def protocol_relative(u):
    if u and u.startswith('//'):
        return 'https:' + u
    return u

print('=== event/news sources ===')
for u in URLS:
    code, ctype, body = curl(u)
    html = body.decode('utf-8', 'ignore') if body else ''
    got = og_image(html, u) if html else None
    tier = 'og' if got else None
    if not got and html:
        got = icon_link(html, u)
        tier = 'icon-link' if got else None
    if not got:
        host = urllib.parse.urlparse(u).netloc
        got = f'https://{host}/favicon.ico'
        tier = 'favicon-guess'
    print(f'  {code:>4} {tier:14} {u[:58]}')
    print(f'        -> {protocol_relative(got)}')

print()
print('=== venue homepages ===')
for name, u in VENUES.items():
    code, ctype, body = curl(u)
    html = body.decode('utf-8', 'ignore') if body else ''
    got = og_image(html, u) if html else None
    tier = 'og' if got else None
    if not got and html:
        got = icon_link(html, u)
        tier = 'icon-link' if got else None
    if not got:
        host = urllib.parse.urlparse(u).netloc
        got = f'https://{host}/favicon.ico'
        tier = 'favicon-guess'
    print(f'  {code:>4} {tier:14} {name}')
    print(f'        -> {protocol_relative(got)}')
