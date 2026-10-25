#!/usr/bin/env bash
cd /home/ubuntu/phiads-odysseus/toronto-today || exit 1
echo "=== markers that should exist ==="
while IFS= read -r s; do
  printf '%-34s %s\n' "$s" "$(grep -c -F "$s" src/styles.css)"
done <<'MARKERS'
@media print
break-inside:avoid
prefers-reduced-motion
min-width:1600px
max-width:1180px
max-width:820px
max-width:560px
.weather-outlook
.news-item h3
.social-grid
.venue-panel
.best-bets
.brand-symbol
.edition-pill
@import '@fontsource/newsreader/500.css'
MARKERS
echo
echo "=== is there a git repo? ==="
git -C /home/ubuntu/phiads-odysseus rev-parse --is-inside-work-tree 2>&1 | head -2
ls -d /home/ubuntu/phiads-odysseus/.git 2>/dev/null || echo 'no .git'
echo
echo "=== any css backups? ==="
ls -la src/*.css* src/*.bak 2>/dev/null
echo
echo "=== vite built css (last good build) ==="
ls -la dist/assets/*.css 2>/dev/null
echo
echo "=== count of css rules in source vs built ==="
echo "source braces: $(grep -o '{' src/styles.css | wc -l)"
echo "built  braces: $(grep -o '{' dist/assets/index-CdUw7tOb.css 2>/dev/null | wc -l)"
