#!/usr/bin/env python3
"""Check the look transform against patches measured off the reference frames."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_lut import transform, PARAMS

def T(rgb255):
    o = transform(tuple(c/255.0 for c in rgb255), PARAMS)
    return tuple(round(c*255) for c in o)

# (label, plausible neutral Rec.709 input, target as read off the reference frames)
PATCHES = [
    ("pure black",        (  0,  0,  0), ( 14, 17, 17)),
    ("deep shadow",       ( 20, 20, 20), ( 30, 34, 33)),
    ("dark rock shadow",  ( 60, 48, 40), ( 68, 60, 52)),
    ("18% grey",          (118,118,118), (124,124,116)),
    ("bright cloud",      (230,230,230), (231,229,218)),
    ("pure white",        (255,255,255), (243,241,232)),
    ("tanned skin",       (215,165,130), (208,166,133)),
    ("skin shadow",       (150,110, 88), (150,116, 96)),
    ("sandstone rock",    (200,175,145), (203,177,144)),
    ("turquoise shallow", ( 70,190,185), ( 92,192,176)),
    ("deep ocean",        ( 30, 80,130), ( 48, 92,124)),
    ("foliage green",     ( 85,150, 60), (110,150, 80)),
    ("pale sky",          (170,205,230), (196,213,211)),
    ("red surfboard",     (170, 45, 40), (150, 52, 48)),
]

print("%-19s %-16s %-16s %-16s %s" % ("patch", "input", "LUT output", "reference", "delta"))
print("-"*88)
worst = 0
for name, src, target in PATCHES:
    out = T(src)
    d = [out[i]-target[i] for i in range(3)]
    worst = max(worst, max(abs(x) for x in d))
    print("%-19s %-16s %-16s %-16s %s" % (
        name, str(src), str(out), str(target),
        "(%+d %+d %+d)" % tuple(d)))
print("-"*88)
print("worst channel delta: %d/255" % worst)

# monotonicity + neutral-axis report
print("\nneutral axis (grey ramp in -> out):")
for v in (0, 16, 32, 64, 96, 128, 160, 192, 224, 255):
    print("  %3d -> %s" % (v, T((v,v,v))))
