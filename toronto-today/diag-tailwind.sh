#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
CSS=$(ls -t dist/assets/*.css | head -1)
echo "built css: $CSS ($(wc -c < "$CSS") bytes)"
echo '--- are widget utilities present? ---'
while IFS= read -r c; do
  printf '%-24s %s\n' "$c" "$(grep -c -F "$c" "$CSS")"
done <<'CLASSES'
.rounded-2xl
.backdrop-blur-xl
.min-w-50
.text-white
.bg-white\/10
.p-4
.flex
.items-center
CLASSES
echo
echo '--- does tailwind see any source files? ---'
npx tailwindcss --help >/dev/null 2>&1 && echo 'tailwind cli available' || echo 'no tailwind cli (expected, v4 uses postcss plugin)'
echo
echo '--- gitignore contents (tailwind respects it) ---'
cat .gitignore
