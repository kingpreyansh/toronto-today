#!/usr/bin/env python3
"""Recover src/styles.css from the last good Vite build output.

The source file was truncated by a read_file -> write_file round trip. The most
recent successful build embeds a complete, minified copy of the same stylesheet,
so it is the authoritative recovery source. Font faces are re-imported rather
than kept inline.
"""
import re
import sys
from pathlib import Path

APP = Path('/home/ubuntu/phiads-odysseus/toronto-today')
BUILT = APP / 'dist/assets/index-CdUw7tOb.css'
TARGET = APP / 'src/styles.css'

built = BUILT.read_text(encoding='utf-8')

# Drop the inlined @font-face blocks; the @import lines restore them at build time.
font_face_count = len(re.findall(r'@font-face\s*\{', built))
rest = re.sub(r'@font-face\s*\{[^}]*\}', '', built)

# Drop any stray fontsource @import left in the bundle.
rest = re.sub(r'@import\s+[^;]+;', '', rest).strip()

IMPORTS = "\n".join(
    f"@import '@fontsource/dm-sans/{w}.css';" for w in (400, 500, 600, 700)
) + "\n@import '@fontsource/newsreader/400.css';\n@import '@fontsource/newsreader/500.css';\n"

# Re-flow to one rule per line so the file stays reviewable, keeping at-rule
# bodies together.
pretty = re.sub(r'\}(?=\S)', '}\n', rest)
pretty = re.sub(r'\n{2,}', '\n', pretty).strip()

header = (
    "/* Recovered from the last good build after a truncating edit.\n"
    "   Recovery source: dist/assets/index-CdUw7tOb.css (complete stylesheet).\n"
    "   Typography floor is 13px; see the READABLE TYPE SCALE block below. */\n"
)

TARGET.write_text(IMPORTS + header + pretty + "\n", encoding='utf-8')

recovered = TARGET.read_text(encoding='utf-8')
sizes = [float(m) for m in re.findall(r'font-size:\s*([0-9.]+)px', recovered)]

checks = {
    'bytes': len(recovered.encode()),
    'open_braces': recovered.count('{'),
    'close_braces': recovered.count('}'),
    'font_faces_stripped': font_face_count,
    'has_print_rule': '@media print' in recovered,
    'has_reduced_motion': 'prefers-reduced-motion' in recovered,
    'has_1180_breakpoint': 'max-width:1180px' in recovered,
    'has_1600_breakpoint': 'min-width:1600px' in recovered,
    'has_news_item_h3': '.news-item h3' in recovered,
    'has_social_grid': '.social-grid' in recovered,
    'min_font_px': min(sizes) if sizes else None,
    'below_13px': sum(1 for s in sizes if s < 13),
}
print(checks)
ok = (
    checks['open_braces'] == checks['close_braces']
    and checks['has_print_rule']
    and checks['has_reduced_motion']
    and checks['has_1180_breakpoint']
    and checks['has_news_item_h3']
    and checks['below_13px'] == 0
)
print('RECOVERY_OK' if ok else 'RECOVERY_INCOMPLETE')
sys.exit(0 if ok else 1)
