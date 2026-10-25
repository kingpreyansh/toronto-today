import json,urllib.request
key=[l.split('=',1)[1].strip() for l in open('/home/ubuntu/.hermes/.env') if l.startswith('WEATHERAPI_KEY=')]
k=key[0] if key else None
print('key present:',bool(k))
if k:
    u='https://api.weatherapi.com/v1/astronomy.json?key=%s&q=id:317748&dt=2026-10-01'%k
    print(json.dumps(json.load(urllib.request.urlopen(u,timeout=15)),indent=1))
