#!/usr/bin/env python3
"""Find the scrim darkness behind the vendor widget that makes its own
text-white/50 and text-white/60 reach WCAG AA.

The vendor file is used verbatim, so its hardcoded text colours cannot be
changed. Contrast can only be improved by darkening what sits behind it.
"""
def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lum(rgb):
    r, g, b = (srgb(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)
def over(fg, alpha, bg):
    return tuple(round(bg[i] + alpha * (fg[i] - bg[i])) for i in range(3))
def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
# Worst case is the lightest gradient stop, where the widget sits.
STOPS = [hexrgb('#17493d'), hexrgb('#0e2c25'), hexrgb('#07120e')]

def worst_for(scrim):
    worst = 999
    for stop in STOPS:
        bg = over(BLACK, scrim, stop) if scrim else stop
        panel = over(WHITE, 0.10, bg)          # the widget's bg-white/10 glass
        for alpha in (0.50, 0.60):             # text-white/50 and /60
            worst = min(worst, ratio(over(WHITE, alpha, panel), panel))
    return worst

print(f"{'scrim':>6}  {'worst white/50-60':>18}  verdict")
best = None
for i in range(0, 71, 5):
    s = i / 100
    w = worst_for(s)
    ok = w >= 4.5
    if ok and best is None:
        best = s
    print(f'{s:>6.2f}  {w:>18.2f}  {"PASS" if ok else "FAIL"}')

print()
print('minimum scrim that passes:', best)
for s in (best, best + 0.05, best + 0.10):
    print(f'  scrim {s:.2f} -> {worst_for(round(s,2)):.2f}:1')
