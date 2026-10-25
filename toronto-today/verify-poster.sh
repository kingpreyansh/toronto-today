#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "=== images.json ON DISK (not via CDN) ==="
python3 - <<'PY'
import json
d = json.load(open('data/images.json'))
for k, v in d.items():
    if 'tkaronto' in k.lower() or 'wordonthestreet' in k.lower():
        print(f'  {k[:66]}')
        print(f'      -> {v}')
PY
echo
echo "=== sizes of the mapped files ==="
python3 - <<'PY'
import json, os
d = json.load(open('data/images.json'))
for k, v in d.items():
    if 'tkaronto' in k.lower() or 'wordonthestreet' in k.lower():
        p = v
        size = os.path.getsize(p) if os.path.exists(p) else -1
        print(f'  {size:>9} bytes  {v}  <- {k[:50]}')
PY
echo
echo "=== largest images in media/ (a poster should be near the top) ==="
ls -S media/*.jpg media/*.png media/*.webp media/*.ico 2>/dev/null | head -8 | while read -r f; do
  printf '  %9s  %s\n' "$(stat -c%s "$f")" "$f"
done
echo
echo "=== does /data/images.json have a cache header? ==="
curl -sS -D - -o /dev/null --max-time 20 https://today.getphiads.com/data/images.json | grep -iE '^(cache-control|cf-cache-status|age)' || echo '  (no cache headers reported)'
