#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "=== seeded icon files ==="
ls media/icons | wc -l
echo
echo "=== icon codes referenced by the live payload vs what exists ==="
curl -sS --max-time 25 https://today.getphiads.com/data/weather.json > /tmp/w.json
python3 - <<'PY'
import json, os
d = json.load(open('/tmp/w.json'))
refs = []
def add(entry, where):
    if not entry: return
    code = entry.get('icon_code'); period = entry.get('icon_period') or 'day'
    if code: refs.append((period, str(code), where, entry.get('icon_local')))
add(d, 'current')
for h in (d.get('hourly') or []): add(h, 'hourly ' + str(h.get('label')))
for x in (d.get('daily') or []): add(x, 'daily ' + str(x.get('label')))
seen = set()
missing = []
for period, code, where, local in refs:
    key = (period, code)
    exists = os.path.exists(f'media/icons/{period}-{code}.png')
    if not exists and key not in seen:
        missing.append((period, code, where))
    seen.add(key)
print('  distinct (period,code) referenced:', len(seen))
print('  MISSING files:', len(missing))
for m in missing: print('    ', m)
PY
