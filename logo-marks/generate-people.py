# -*- coding: utf-8 -*-
"""Exports the frame the ring-into-hexagon animation lands on (see logo-animation.html)
as static SVG, in both readings: heads to the centre and heads to the outside."""
import math, os

ACCENT, INK = "#00C4B5", "#04302B"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))

MODES = {
    "in":  dict(B=41, sign=-1, delta=52, HIP=18, SHO=23, NECK=27,   HEAD=31, HR=5,   FOOT=4.5, LW=4.8),
    "out": dict(B=9,  sign=1,  delta=55, HIP=15, SHO=23, NECK=26.5, HEAD=31, HR=4.8, FOOT=5,   LW=4.8),
}

def hexpath(r=40.0, cx=60.0, cy=60.0):
    pts = []
    for i in range(6):
        a = math.radians(90 - i*60)
        pts.append((cx + r*math.cos(a), cy - r*math.sin(a)))
    return "M" + " L".join("%.2f %.2f" % p for p in pts) + " Z"

def figures(B, sign, delta, HIP, SHO, NECK, HEAD, HR, FOOT, LW, ic="#FFFFFF", C=60.0):
    """Three figures on a ring of radius B, bodies pointing in (sign -1) or out (sign +1).
    Arms are an arc of the circle the shoulders sit on, wrapping `delta` degrees each way."""
    Ra = abs(B + sign*SHO)
    d = math.radians(delta)
    arm_up = sign * (Ra*math.cos(d) - B)
    arm_side = Ra*math.sin(d)
    ctrl_up = 2*SHO - arm_up
    out = []
    for th in (90, 210, 330):
        t = math.radians(th)
        ox, oy = math.cos(t), math.sin(t)
        bx, by = C + B*ox, C + B*oy
        dx, dy = sign*ox, sign*oy       # body axis, feet -> head
        tx, ty = -oy, ox                # tangent
        P = lambda up, side: (bx + dx*up + tx*side, by + dy*up + ty*side)
        fl, fr = P(0, -FOOT), P(0, FOOT)
        hip, neck, head = P(HIP, 0), P(NECK, 0), P(HEAD, 0)
        al, ar, ct = P(arm_up, -arm_side), P(arm_up, arm_side), P(ctrl_up, 0)
        out.append('<path d="M%.2f %.2f L%.2f %.2f L%.2f %.2f M%.2f %.2f L%.2f %.2f '
                   'M%.2f %.2f Q%.2f %.2f %.2f %.2f" fill="none" stroke="%s" stroke-width="%s" '
                   'stroke-linecap="round" stroke-linejoin="round"/>'
                   % (fl[0], fl[1], hip[0], hip[1], fr[0], fr[1], hip[0], hip[1], neck[0], neck[1],
                      al[0], al[1], ct[0], ct[1], ar[0], ar[1], ic, LW))
        out.append('<circle cx="%.2f" cy="%.2f" r="%s" fill="%s"/>' % (head[0], head[1], HR, ic))
    return "".join(out)

def svg(name, hx, ic, label):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" '
            'role="img" aria-label="AlmaConnect mark — %s">'
            '<path d="%s" fill="%s" stroke="%s" stroke-width="28" stroke-linejoin="round"/>%s</svg>\n'
            % (label, hexpath(), hx, hx, figures(ic=ic, **MODES[name])))

for name in MODES:
    label = "three figures, heads " + ("to the centre" if name == "in" else "outward")
    open(os.path.join(OUT, "people3-%s.svg" % name), "w").write(svg(name, ACCENT, "#FFFFFF", label))
    open(os.path.join(OUT, "people3-%s-mono.svg" % name), "w").write(svg(name, INK, "#FFFFFF", label))
print("wrote 4 svgs")
