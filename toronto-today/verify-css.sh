#!/usr/bin/env bash
# Verify src/styles.css survived the font-size rewrite intact.
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "size: $(wc -c < src/styles.css) bytes | lines: $(wc -l < src/styles.css)"
echo "READABLE TYPE SCALE markers: $(grep -c 'READABLE TYPE SCALE' src/styles.css)"
echo "--- key selectors (count must be >= 1) ---"
while IFS= read -r s; do
  printf '%-28s %s\n' "$s" "$(grep -c -F "$s" src/styles.css)"
done <<'SELECTORS'
.weather-hero{
.news-media{
.brand-symbol{
@media print{
.filter-group button{
.venue-check p{
footer small{
SELECTORS
echo "--- first 3 lines (imports) ---"
head -3 src/styles.css
echo "--- last 200 chars ---"
tail -c 200 src/styles.css
echo
echo "--- size of built CSS for comparison ---"
ls -la dist/assets/*.css 2>/dev/null | head -3
