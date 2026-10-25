#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo '=== frontend tests ==='
npm test 2>&1 | grep -E 'Test Files|Tests +[0-9]'
echo '=== node suites ==='
for f in weather.test.mjs icons.test.mjs images.test.mjs server.test.mjs; do
  printf '%-20s ' "$f"
  node --test "$f" 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '
  echo
done
echo '=== publisher ==='
python3 test_publish.py 2>&1 | tail -2
echo '=== css integrity ==='
python3 - <<'PY'
from pathlib import Path
import re
s = Path('src/styles.css').read_text()
sizes = [float(m) for m in re.findall(r'font-size:\s*([0-9.]+)px', s)]
print('bytes:', len(s.encode()))
print('braces balanced:', s.count('{') == s.count('}'))
print('print rule present:', '@media print' in s)
print('reduced-motion present:', 'prefers-reduced-motion' in s)
print('min font size:', min(sizes))
print('declarations below 13px:', sum(1 for x in sizes if x < 13))
PY
echo '=== deployment + outbound ==='
python3 verify_deployment.py
curl -fsS --max-time 15 https://instantly-hook.getphiads.com/health
echo
systemctl is-active toronto-today.service toronto-today-tunnel.service
