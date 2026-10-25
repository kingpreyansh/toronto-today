#!/usr/bin/env python3
"""Verify the official poster and test a WordPress media lookup, which is far more
reliable than image search for venue sites."""
import json
import re
import subprocess
import urllib.parse

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36'

def curl(url, headers=None):
    cmd = ['curl', '-sS', '-L', '--max-time', '25', '-A', UA]
    for h in (headers or []):
        cmd += ['-H', h]
    out = subprocess.run(cmd + [url], capture_output=True)
    return out.stdout

def curl_json(url):
    try:
        return json.loads(curl(url, ['Accept: application/json']).decode('utf-8', 'ignore'))
    except Exception as e:
        return {'_error': str(e)}

print('=== the candidate poster image ===')
for u in ['https://torontounion.ca/wp-content/uploads/2026/09/sssssss-scaled.jpg',
          'https://torontounion.ca/wp-content/uploads/2026/09/sssssss-1024x576.jpg']:
    info = subprocess.run(['curl', '-sS', '-L', '--max-time', '25', '-A', UA,
                           '-o', '/dev/null', '-w', '%{http_code} %{content_type} %{size_download}',
                           u], capture_output=True, text=True).stdout.strip()
    print(f'  {info:32} {u.split("/")[-1]}')

print()
print('=== WordPress REST search (venue sites are usually WordPress) ===')
host = 'https://torontounion.ca'
s = curl_json(f'{host}/wp-json/wp/v2/search?search={urllib.parse.quote("Tkaronto Open IV")}&per_page=5')
print('  search keys:', list(s)[:6] if isinstance(s, dict) else type(s))
for hit in (s if isinstance(s, list) else [])[:5]:
    print('   ', hit.get('id'), hit.get('subtype'), '|', re.sub(r'<[^>]+>', '', str(hit.get('title')))[:60], '|', hit.get('url'))

print()
print('=== resolve featured media for each hit ===')
for hit in (s if isinstance(s, list) else [])[:4]:
    post = curl_json(f"{host}/wp-json/wp/v2/{hit.get('subtype')}/{hit.get('id')}")
    fm = post.get('featured_media') if isinstance(post, dict) else None
    link = post.get('link') if isinstance(post, dict) else None
    print(f"   post {hit.get('id')} featured_media={fm} link={link}")
    if fm:
        media = curl_json(f'{host}/wp-json/wp/v2/media/{fm}')
        if isinstance(media, dict):
            src = (media.get('source_url') or '')
            print('      source_url:', src)
            print('      alt:', (media.get('alt_text') or '')[:70])
            print('      mime:', media.get('mime_type'), '| sizes:', list((media.get('media_details') or {}).get('sizes', {}))[:6])
            print('      title:', ((media.get('title') or {}).get('rendered') or '')[:70])
