#!/usr/bin/env python3
"""Prove the recovered stylesheet is equivalent to the last good build,
then re-apply the 13px typography floor."""
import re
import sys
from pathlib import Path

APP = Path('/home/ubuntu/phiads-odysseus/toronto-today')
BUILT = APP / 'dist/assets/index-CdUw7tOb.css'
TARGET = APP / 'src/styles.css'

norm = lambda s: re.sub(r'\s+', '', s)

built = BUILT.read_text(encoding='utf-8')
built_core = re.sub(r'@font-face\s*\{[^}]*\}', '', built)
built_core = re.sub(r'@import\s+[^;]+;', '', built_core)
built_norm = norm(built_core)

source = TARGET.read_text(encoding='utf-8')
source_core = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
source_core = re.sub(r'@import\s+[^;]+;', '', source_core)
source_norm = norm(source_core)

print('built core chars :', len(built_norm))
print('source core chars:', len(source_norm))
print('EXACT_EQUIVALENT:', built_norm == source_norm)
if built_norm != source_norm:
    # Report the first divergence so the gap is knowable.
    for i, (a, b) in enumerate(zip(built_norm, source_norm)):
        if a != b:
            print('first divergence at', i)
            print('built :', built_norm[max(0, i - 60):i + 60])
            print('source:', source_norm[max(0, i - 60):i + 60])
            break
    print('length delta:', len(built_norm) - len(source_norm))
    sys.exit(1)

# Re-apply the readable floor now that content is verified complete.
raised, n = re.subn(
    r'font-size:\s*([0-9.]+)px',
    lambda m: 'font-size:13px' if float(m.group(1)) < 13 else m.group(0),
    source,
)
TARGET.write_text(raised, encoding='utf-8')

sizes = [float(m) for m in re.findall(r'font-size:\s*([0-9.]+)px', raised)]
print('declarations raised to 13px:', n)
print('remaining below 13px:', sum(1 for s in sizes if s < 13))
print('min font size:', min(sizes))
print('braces balanced:', raised.count('{') == raised.count('}'))
print('FLOOR_OK' if sum(1 for s in sizes if s < 13) == 0 else 'FLOOR_FAILED')
