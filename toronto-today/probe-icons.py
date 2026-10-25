#!/usr/bin/env python3
"""Test a favicon resolver for hosts that block datacenter IPs, and look for
larger brand icons where only a 16px one was found."""
import subprocess

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def head(url):
    out = subprocess.run(['curl', '-sS', '-L', '--max-time', '20', '-A', UA,
                          '-o', '/dev/null', '-w', '%{http_code} %{content_type} %{size_download}',
                          url], capture_output=True, text=True)
    return out.stdout.strip()

BLOCKED = [
    'roythomsonhall.mhrth.com',
    'masseyhall.mhrth.com',
    'ago.ca',
    'www.ouevents.ca',
    'tiff.net',
    'www.scotiabankarena.com',
]

print('=== favicon resolver (real site mark, fetched server-side) ===')
for host in BLOCKED:
    for tmpl in ['https://www.google.com/s2/favicons?domain={d}&sz=128',
                 'https://icons.duckduckgo.com/ip3/{d}.ico']:
        url = tmpl.format(d=host)
        print(f'  {head(url):28} {url}')

print()
print('=== larger tolive brand icons ===')
for size in (16, 32, 48, 64, 128, 180, 192, 512):
    url = f'https://www.tolive.com/assets/icons/ios/{size}.png'
    print(f'  {size:>3}: {head(url)}')

print()
print('=== scotiabankarena: any real og image? ===')
out = subprocess.run(['curl', '-sS', '-L', '--max-time', '25', '-A', UA,
                      'https://www.scotiabankarena.com/'], capture_output=True)
html = out.stdout.decode('utf-8', 'ignore')
import re
for pat in ['og:image', 'twitter:image']:
    for m in re.finditer(pat + r'[^>]{0,200}', html, re.I):
        print('  ', m.group(0)[:200])
        break
