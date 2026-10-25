#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
CSS=$(ls -t dist/assets/*.css | head -1)
echo "=== is ANY theme variable DEFINED (vs just used)? ==="
for v in '--spacing:' '--color-white:' '--radius-2xl:' '--blur-xl:' '--color-red-500:'; do
  printf '%-18s defined: %s\n' "$v" "$(grep -o -- "$v" "$CSS" | wc -l)"
done
echo
echo "=== what does the theme layer actually contain? ==="
python3 - "$CSS" <<'PY'
import re, sys
css = open(sys.argv[1]).read()
m = re.search(r'@layer theme\{(.*?)\n\}', css, re.S)
if not m:
    m = re.search(r'@layer theme\{(.{0,600})', css, re.S)
print(repr(m.group(1)[:400]) if m else 'no @layer theme block found')
PY
echo
echo "=== is the raw @import preserved (unresolved)? ==="
grep -c 'tailwindcss/theme.css' "$CSS"
echo
echo "=== is postcss-import installed? ==="
ls node_modules/postcss-import/package.json 2>/dev/null && echo 'postcss-import present' || echo 'postcss-import MISSING'
ls node_modules/@tailwindcss/vite/package.json 2>/dev/null && echo '@tailwindcss/vite present' || echo '@tailwindcss/vite MISSING'
