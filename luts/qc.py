#!/usr/bin/env python3
"""Quality control on a generated .cube: format, range, monotonicity, smoothness."""
import sys

def load(path):
    size=None; data=[]
    for ln in open(path):
        ln=ln.strip()
        if not ln or ln.startswith('#'): continue
        if ln.startswith('LUT_3D_SIZE'): size=int(ln.split()[1]); continue
        if ln[0].isdigit() or ln[0]=='-' or ln[0]=='.':
            p=ln.split()
            if len(p)==3: data.append(tuple(float(x) for x in p))
    return size, data

def qc(path):
    n, d = load(path)
    print("== %s" % path)
    assert n, "no LUT_3D_SIZE"
    exp = n**3
    print("  size %d^3, entries %d (expected %d) %s" % (n, len(d), exp, "OK" if len(d)==exp else "MISMATCH"))
    assert len(d)==exp
    lo = min(min(e) for e in d); hi = max(max(e) for e in d)
    print("  value range [%.4f, %.4f] %s" % (lo, hi, "OK" if lo>=0 and hi<=1 else "OUT OF RANGE"))

    idx = lambda r,g,b: (b*n + g)*n + r   # red varies fastest

    # Monotonicity. Hue rotation is not monotonic in RGB by construction, so
    # any hue-selective look LUT reverses slightly at zone boundaries. What
    # matters is the magnitude: below one 8-bit code value it cannot be seen.
    THRESH = 1.0 / 255.0
    bad = 0; worst_rev = 0.0
    for ax, ch in ((0, 0), (1, 1), (2, 2)):
        for a in range(n):
            for b in range(n):
                prev = None
                for t in range(n):
                    r, g, bl = (t, a, b) if ax == 0 else ((a, t, b) if ax == 1 else (a, b, t))
                    v = d[idx(r, g, bl)][ch]
                    if prev is not None and v < prev:
                        rev = prev - v
                        worst_rev = max(worst_rev, rev)
                        if rev > THRESH:
                            bad += 1
                    prev = v
    print("  max axis reversal: %.5f (%.2f/255) %s" % (
        worst_rev, worst_rev * 255,
        "OK - below 8-bit quantisation" if worst_rev <= 1.5 / 255 else "WARN - visible reversal"))
    print("  reversals above 1/255: %d" % bad)

    # smoothness: largest jump between neighbouring grid nodes
    worst=0.0; where=None
    for r in range(n):
        for g in range(n):
            for b in range(n):
                cur=d[idx(r,g,b)]
                for dr,dg,db in ((1,0,0),(0,1,0),(0,0,1)):
                    r2,g2,b2=r+dr,g+dg,b+db
                    if r2>=n or g2>=n or b2>=n: continue
                    nb=d[idx(r2,g2,b2)]
                    j=max(abs(cur[i]-nb[i]) for i in range(3))
                    if j>worst: worst, where = j,(r,g,b)
    step = 1.0/(n-1)
    print("  max neighbour jump: %.4f (grid step %.4f, ratio %.2fx) at %s" % (worst, step, worst/step, where))
    print("  %s\n" % ("OK - no banding risk" if worst/step < 2.0 else "WARN - steep transition, check for banding"))

for p in sys.argv[1:]:
    qc(p)
