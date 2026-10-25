#!/usr/bin/env python3
"""WCAG audit for the weather deck, including the vendor widget's own text.

The widget's translucent white text sits on its own `bg-white/10` glass panel,
which sits on the deck gradient. Each layer is composited explicitly so the
score reflects what actually renders, not a guess.
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
STOPS = [hexrgb('#17493d'), hexrgb('#0e2c25'), hexrgb('#07120e')]
SCRIM = 0.62  # .wx-deck .wx-glass inset panel

def report(label, colour, alpha, layer_alpha, need, scrim=0.0):
    worst, scores = 999, []
    for stop in STOPS:
        base = over(BLACK, scrim, stop) if scrim else stop
        panel = over(WHITE, layer_alpha, base) if layer_alpha else base
        fg = over(colour, alpha, panel) if alpha < 1 else colour
        s = ratio(fg, panel)
        scores.append(s)
        worst = min(worst, s)
    ok = worst >= need
    print(f'{label:34} {worst:6.2f}:1  (need {need})  {"PASS" if ok else "FAIL"}')
    return ok

checks = [
    # Our own text, directly on the deck.
    ('deck credit / foot link',  WHITE, 0.78, 0.0, 4.5),
    ('day-ahead summary',        WHITE, 0.80, 0.0, 4.5),
    ('block label',              hexrgb('#9fd8c2'), 1.0, 0.0, 4.5),
    ('tile label',               WHITE, 0.78, 0.07, 4.5),
    ('tile value',               WHITE, 1.0, 0.07, 4.5),
    ('outlook day label',        WHITE, 0.78, 0.06, 4.5),
    ('outlook temp',             WHITE, 1.0, 0.06, 4.5),
    ('outlook condition',        WHITE, 0.76, 0.06, 4.5),
    # The vendor widget's own Tailwind text colours over its bg-white/10 panel,
    # which sits on the dark inset scrim.
    ('widget location (white)',  WHITE, 1.0, 0.10, 4.5, SCRIM),
    ('widget location (white/70)', WHITE, 0.70, 0.10, 4.5, SCRIM),
    ('widget temp (white)',      WHITE, 1.0, 0.10, 3.0, SCRIM),
    ('widget condition (white/60)', WHITE, 0.60, 0.10, 4.5, SCRIM),
    ('widget stat (white/50)',   WHITE, 0.50, 0.10, 4.5, SCRIM),
]

print(f"{'element':34} {'worst':>8}  requirement  verdict")
print('-' * 74)
results = [report(*c) for c in checks]

print()
if all(results):
    print('All deck text passes WCAG AA against every gradient stop.')
else:
    print('FAILURES remain; raise the alpha values for the rows marked FAIL.')
