#!/usr/bin/env python3
"""Track down the Tkaronto Open IV poster from official sources."""
import re
import subprocess
import urllib.parse

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def get(url, binary=False):
    out = subprocess.run(['curl', '-sS', '-L', '--max-time', '25', '-A', UA,
                          '-H', 'Accept-Language: en-CA,en;q=0.9', url], capture_output=True)
    return out.stdout.decode('utf-8', 'ignore') if not binary else out.stdout

def images_in(html, base):
    found = []
    for pat in [r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
                r'name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)',
                r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp))']:
        for m in re.finditer(pat, html, re.I):
            url = urllib.parse.urljoin(base, m.group(1))
            if url not in found:
                found.append(url)
    return found

print('=== current (dead?) URL ===')
html = get('https://torontounion.ca/event/tkaronto-open-iv-presented-by-sturdy-br/')
print('  length:', len(html), '| looks like 404:', 'not found' in html.lower() or len(html) < 3000)

print()
print('=== search the organizer site for the event ===')
for q in ['tkaronto', 'Tkaronto Open']:
    url = f'https://torontounion.ca/?s={urllib.parse.quote(q)}'
    h = get(url)
    hits = re.findall(r'<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', h, re.S | re.I)
    print(f'  query "{q}": {len(hits)} hits')
    for href, title in hits[:6]:
        print('    ', re.sub(r'<[^>]+>', '', title).strip()[:60], '->', href)
    if not hits:
        # any links that mention tkaronto
        for m in re.finditer(r'href="([^"]*tkaronto[^"]*)"', h, re.I):
            print('     link:', m.group(1))
            break

print()
print('=== try likely official event paths ===')
candidates = [
    'https://torontounion.ca/event/tkaronto-open-iv/',
    'https://torontounion.ca/events/tkaronto-open-iv/',
    'https://torontounion.ca/tkaronto-open-iv/',
]
for c in candidates:
    h = get(c)
    imgs = images_in(h, c)
    print(f'  {c} -> {len(h)} bytes, {len(imgs)} images')
    for i in imgs[:4]:
        print('      ', i)

print()
print('=== Bing image search (server-side, cached locally) ===')
q = 'Tkaronto Open IV poster Toronto Union'
h = get('https://www.bing.com/images/search?q=' + urllib.parse.quote(q))
found = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', h)
print('  results:', len(found))
for u in found[:8]:
    print('      ', urllib.parse.unquote(u)[:120])
