#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
CSS=$(ls -t dist/assets/*.css | head -1)
echo "=== .rounded-2xl rule ==="
grep -o '\.rounded-2xl{[^}]*}' "$CSS" | head -3
echo
echo "=== .backdrop-blur-xl rule ==="
grep -o '\.backdrop-blur-xl{[^}]*}' "$CSS" | head -3
echo
echo "=== .min-w-50 rule ==="
grep -o '\.min-w-50{[^}]*}' "$CSS" | head -3
echo
echo "=== are theme variables defined? ==="
for v in '--radius-2xl' '--blur-xl' '--color-white' '--font-sans'; do
  printf '%-18s occurrences: %s\n' "$v" "$(grep -o -- "$v" "$CSS" | wc -l)"
done
echo
echo "=== does :root define radius-2xl? ==="
grep -o ':root[^}]\{0,200\}--radius-2xl[^;]*;' "$CSS" | head -2
echo
echo "=== layer declaration in built css ==="
grep -o '@layer[^{;]*[;{]' "$CSS" | head -8
