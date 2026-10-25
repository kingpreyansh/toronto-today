#!/usr/bin/env python3
"""Convert the numeric minutes field to a string read label, then republish."""
import re
import subprocess
from pathlib import Path

SEED = Path('/home/ubuntu/phiads-odysseus/toronto-today/seed-learning.py')
text = SEED.read_text()
converted, n = re.subn(r'"minutes":\s*(\d+),', r'"read": "\1 min",', text)
SEED.write_text(converted)
print(f'converted {n} minutes fields to read labels')

# Rebuild the payload with the corrected field.
seed = subprocess.run(['python3', str(SEED)], capture_output=True, text=True)
print(seed.stdout.strip() or seed.stderr.strip())

# Republish.
pub = subprocess.run(['python3', '/home/ubuntu/phiads-odysseus/toronto-today/publish.py',
                      '--input', '/home/ubuntu/phiads-odysseus/daily-briefing/2026-09-26.json'],
                     capture_output=True, text=True)
print('publish stdout:', pub.stdout.strip())
print('publish stderr:', pub.stderr.strip())
print('publish exit:', pub.returncode)