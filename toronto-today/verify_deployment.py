#!/usr/bin/env python3
"""Read-only deploy check, never prints config/credentials."""
import json
import urllib.request
from pathlib import Path

ROOT=Path(__file__).parent
base='https://today.getphiads.com'

def fetch(path):
 r=urllib.request.urlopen(urllib.request.Request(base+path,headers={'User-Agent':'TorontoToday-DeployCheck/1.0'}),timeout=30)
 return r.status,r.read(),dict(r.headers)

status,body,headers=fetch('/data/latest.json')
actual=json.loads(body);expected=json.loads((ROOT/'data/latest.json').read_text())
assert status==200 and actual==expected,'Public JSON does not match local publication'
for key in ('full_briefing_text','focus_prompt','token','lead_email','password'):
 assert key not in body.decode(),'Private key in public data'
assert headers.get('Cache-Control',headers.get('cache-control',''))=='no-store'
status,body,_=fetch('/healthz');assert status==200
assert json.loads(body).get('date')==expected['meta']['date_iso']
status,body,_=fetch('/');assert status==200 and b'type="module"' in body
print(json.dumps({'ok':True,'url':base,'date':expected['meta']['date_iso'],'public_json_matches':True,'react_module_served':True}))
