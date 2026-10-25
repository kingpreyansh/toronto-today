#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "=== who claims the 632KB poster file? ==="
python3 - <<'PY'
import json
d = json.load(open('data/images.json'))
target = 'media/bd0a58e80bae3ed3.jpg'
hits = [(k, v) for k, v in d.items() if v == target]
print('  keys mapped to the poster file:', len(hits))
for k, v in hits:
    print('   ', k)
PY
echo
echo "=== every key and its file size, sorted by size ==="
python3 - <<'PY'
import json, os
d = json.load(open('data/images.json'))
rows = []
for k, v in d.items():
    rows.append((os.path.getsize(v) if os.path.exists(v) else -1, v, k))
rows.sort(reverse=True)
for size, v, k in rows:
    tag = 'POSTER-LIKE' if size > 50000 else ('logo/favicon' if size < 20000 else 'photo')
    print(f'  {size:>9} {tag:12} {v:32} {k[:52]}')
PY
