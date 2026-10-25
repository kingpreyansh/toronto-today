#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "bytes: $(wc -c < src/styles.css)"
echo "=== integrity markers (all must be >= 1) ==="
while IFS= read -r s; do
  printf '%-34s %s\n' "$s" "$(grep -c -F "$s" src/styles.css)"
done <<'M'
@media print
prefers-reduced-motion
min-width:1600px
max-width:1180px
max-width:820px
max-width:560px
.news-item h3
.social-grid
.venue-panel
.brand-symbol
.edition-pill
.wx-deck{
.wx-deck-foot
.weather-outlook
.best-bets
.card-media
M
echo "=== python integrity check ==="
python3 - <<'PY'
from pathlib import Path
import re
s = Path('src/styles.css').read_text()
sizes = [float(m) for m in re.findall(r'font-size:\s*([0-9.]+)px', s)]
print('open/close braces:', s.count('{'), s.count('}'), '-> balanced:', s.count('{') == s.count('}'))
print('min font size:', min(sizes), '| below 13px:', sum(1 for x in sizes if x < 13))
print('ends with closing brace:', s.rstrip().endswith('}'))
PY