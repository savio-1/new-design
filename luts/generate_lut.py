#!/usr/bin/env python3
"""
Generate the "Coastal Kodachrome" film-look LUT.

The look is reverse-engineered from a set of reference frames: sun-bleached
Mediterranean coastline, turquoise rock pools, tanned skin, pale cream skies.

Characteristics measured off the reference frames:

  * nothing reaches true black - the floor sits around 14-20/255 with a
    faint green-cyan bias (matte, print-like shadows)
  * nothing clips to white - skies top out around 236-242/255 and are
    cream tinted, never blue-white
  * low overall contrast with a very wide, flat midtone shelf
  * highlights desaturate toward cream as they climb (blue rolls off first)
  * foliage reads olive / yellow-green, not emerald
  * shallow water reads turquoise: cyan pulled toward green and boosted
  * deep ocean reads soft navy-teal, desaturated
  * skin holds a warm tan, reds are deep and muted rather than vivid

Everything is driven by the PARAMS block below, so the look can be retuned
without touching the pipeline. Pure standard library - no dependencies.

    python3 generate_lut.py            # writes the .cube files into ./
"""

import math
import os

# --------------------------------------------------------------------------
# Look parameters
# --------------------------------------------------------------------------

PARAMS = {
    # --- scene-linear stage -------------------------------------------
    # Overall exposure trim applied before the film curve.
    "exposure": 1.030,

    # White balance as linear channel gains. Warms the whole frame slightly,
    # which is what pulls the skies off blue and onto cream.
    "wb_gain": (1.038, 1.000, 0.948),

    # Channel crosstalk. Real film stocks bleed light between dye layers,
    # which is the main reason film highlights desaturate and why film
    # greens collapse toward yellow. Rows sum to 1 so neutrals stay neutral.
    "crosstalk": (
        (0.936, 0.052, 0.012),
        (0.018, 0.957, 0.025),
        (0.016, 0.062, 0.922),
    ),

    # Per-channel highlight shoulder. Scene-linear values below the knee are
    # left untouched; above it each channel rolls toward its own asymptote.
    # Blue rolls off hardest and red holds longest, so highlights drift to
    # cream the way a print does instead of clipping to blue-white.
    "shoulder_knee": 0.575,
    "shoulder_k": (1.55, 1.40, 1.26),

    # --- display-referred stage ---------------------------------------
    # Hue-selective adjustments, keyed by hue centre in degrees.
    #   width  - raised-cosine falloff half-width in degrees
    #   hue    - hue rotation in degrees
    #   sat    - saturation multiplier
    #   val    - value (brightness) multiplier
    "hue_zones": [
        # name        center width   hue    sat    val
        ("red",           2,   40,  +3.0, 1.080, 0.940),
        ("orange_skin",  32,   30,  +3.5, 0.985, 1.005),
        ("yellow",       58,   30,  -3.0, 0.880, 1.010),
        ("green",       110,   56, -16.0, 0.925, 0.985),
        ("aqua",        180,   46,  -5.0, 1.205, 1.055),
        ("blue",        222,   44,  -9.0, 0.925, 1.010),
        ("magenta",     305,   44,  +4.0, 0.840, 0.985),
    ],
    # Below this saturation, hue-selective work fades out so that near-neutral
    # pixels (skin shadows, concrete, sand) are never hue-twisted.
    "hue_sat_gate": 0.16,

    # Midtone contrast as a power curve about a pivot, renormalised so that
    # 1.0 still maps to 1.0. Kept low - the reference look is soft.
    "contrast": 1.055,
    "contrast_pivot": 0.44,

    # Final per-channel range remap. This sets the matte floor and the
    # rolled-off ceiling, and is where the split tone lives:
    # cool green-cyan shadows, warm cream highlights.
    "floor": (0.0555, 0.0670, 0.0655),
    "ceil":  (0.9760, 0.9690, 0.9490),

    # Film desaturates as it climbs toward the shoulder: bright areas lose
    # chroma and drift to cream, while shadows keep theirs. This is what
    # keeps the skies pale instead of blue and stops the darks going muddy.
    "hl_desat": 0.375,        # chroma removed at full white
    "hl_desat_start": 0.52,  # luma at which the falloff begins

    # Global saturation, applied last against Rec.709 luma.
    "saturation": 0.955,
}

# Output variants: (filename, title, strength)
VARIANTS = [
    ("CoastalKodachrome.cube",         "Coastal Kodachrome",          1.00),
    ("CoastalKodachrome_Soft.cube",    "Coastal Kodachrome Soft",     0.65),
]

# Strength above 1.0 is deliberately not offered. Extrapolating past the
# calibrated look amplifies the hue-zone reversals into visible territory,
# and every NLE can already dial a LUT down with node/layer opacity.

LUT_SIZE = 33
LUMA = (0.2126, 0.7152, 0.0722)


# --------------------------------------------------------------------------
# Transfer functions (sRGB / Rec.709 display encoding)
# --------------------------------------------------------------------------

def srgb_to_linear(c):
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c):
    if c <= 0.0:
        return 0.0
    if c <= 0.0031308:
        return c * 12.92
    return 1.055 * (c ** (1.0 / 2.4)) - 0.055


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else (hi if x > hi else x)


def lerp(a, b, t):
    return a + (b - a) * t


def rgb_to_hsv(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    d = mx - mn
    if d < 1e-9:
        h = 0.0
    elif mx == r:
        h = 60.0 * (((g - b) / d) % 6.0)
    elif mx == g:
        h = 60.0 * (((b - r) / d) + 2.0)
    else:
        h = 60.0 * (((r - g) / d) + 4.0)
    s = 0.0 if mx < 1e-9 else d / mx
    return h % 360.0, s, mx


def hsv_to_rgb(h, s, v):
    h = h % 360.0
    c = v * s
    x = c * (1.0 - abs(((h / 60.0) % 2.0) - 1.0))
    m = v - c
    i = int(h // 60.0) % 6
    r, g, b = (
        (c, x, 0.0), (x, c, 0.0), (0.0, c, x),
        (0.0, x, c), (x, 0.0, c), (c, 0.0, x),
    )[i]
    return r + m, g + m, b + m


def soft_max_one(t, eps=0.30):
    """C-infinity approximation of max(t, 1.0)."""
    return 0.5 * (t + 1.0 + math.sqrt((t - 1.0) ** 2 + eps * eps))


def hue_weight(h, center, width):
    """Raised-cosine window on the hue circle: 1 at centre, 0 at +/- width."""
    d = abs(((h - center + 180.0) % 360.0) - 180.0)
    if d >= width:
        return 0.0
    return 0.5 * (1.0 + math.cos(math.pi * d / width))


# --------------------------------------------------------------------------
# Pipeline stages
# --------------------------------------------------------------------------

def apply_matrix(rgb, m):
    r, g, b = rgb
    return (
        m[0][0] * r + m[0][1] * g + m[0][2] * b,
        m[1][0] * r + m[1][1] * g + m[1][2] * b,
        m[2][0] * r + m[2][1] * g + m[2][2] * b,
    )


def shoulder(x, knee, k):
    """Identity below the knee, exponential rolloff above it.

    Monotonic and C1-continuous at the knee, so the midtone slope is
    untouched and only the highlights bend.
    """
    if x <= knee:
        return x
    a = 1.0 - knee
    return knee + a * (1.0 - math.exp(-k * (x - knee) / a))


def hue_selective(rgb, p):
    h, s, v = rgb_to_hsv(*rgb)
    if s < 1e-5:
        return rgb

    gate = min(1.0, s / p["hue_sat_gate"])

    zones = []
    total = 0.0
    for _name, center, width, dh, ds, dv in p["hue_zones"]:
        w = hue_weight(h, center, width) * gate
        if w > 0.0:
            zones.append((w, dh, ds, dv))
            total += w
    if not zones:
        return rgb

    # Normalise so overlapping windows blend rather than compound. A hard
    # max(total, 1) would put a kink in the derivative right where two hue
    # windows meet, which shows up as tiny non-monotonic wiggles in the grid,
    # so use a smooth approximation of it instead.
    norm = 1.0 / soft_max_one(total)

    d_hue = 0.0
    m_sat = 1.0
    m_val = 1.0
    for w, dh, ds, dv in zones:
        wn = w * norm
        d_hue += dh * wn
        m_sat *= 1.0 + (ds - 1.0) * wn
        m_val *= 1.0 + (dv - 1.0) * wn

    return hsv_to_rgb(h + d_hue, clamp(s * m_sat), clamp(v * m_val))


def contrast_curve(x, amount, pivot):
    """Power curve about a pivot, renormalised so f(1) == 1."""
    if x <= 0.0:
        return 0.0
    top = pivot * ((1.0 / pivot) ** amount)
    return pivot * ((x / pivot) ** amount) / top


def saturate(rgb, amount):
    y = LUMA[0] * rgb[0] + LUMA[1] * rgb[1] + LUMA[2] * rgb[2]
    return tuple(y + (c - y) * amount for c in rgb)


def highlight_desaturate(rgb, amount, start):
    """Roll chroma off toward the highlights, the way a print shoulder does."""
    y = LUMA[0] * rgb[0] + LUMA[1] * rgb[1] + LUMA[2] * rgb[2]
    if y <= start:
        return rgb
    t = (y - start) / (1.0 - start)
    t = clamp(t)
    t = t * t * (3.0 - 2.0 * t)          # smoothstep
    return saturate(rgb, 1.0 - amount * t)


def transform(rgb_in, p):
    """Full Rec.709/sRGB display -> Rec.709/sRGB display look transform."""
    # 1. decode to scene linear
    lin = [srgb_to_linear(clamp(c)) for c in rgb_in]

    # 2. exposure + white balance
    lin = [lin[i] * p["exposure"] * p["wb_gain"][i] for i in range(3)]

    # 3. film dye-layer crosstalk
    lin = list(apply_matrix(lin, p["crosstalk"]))
    lin = [max(0.0, c) for c in lin]

    # 4. per-channel highlight shoulder (blue first -> cream highlights)
    lin = [shoulder(lin[i], p["shoulder_knee"], p["shoulder_k"][i])
           for i in range(3)]

    # 5. re-encode to display
    out = [linear_to_srgb(c) for c in lin]

    # 6. hue-selective grade
    out = list(hue_selective(out, p))

    # 7. midtone contrast
    out = [contrast_curve(clamp(c), p["contrast"], p["contrast_pivot"]) for c in out]

    # 8. per-channel range remap -> matte floor + rolled, warm ceiling
    out = [p["floor"][i] + out[i] * (p["ceil"][i] - p["floor"][i]) for i in range(3)]

    # 9. highlight chroma rolloff, then global saturation
    out = list(highlight_desaturate(out, p["hl_desat"], p["hl_desat_start"]))
    out = saturate(out, p["saturation"])

    return tuple(clamp(c) for c in out)


def transform_blend(rgb_in, p, strength):
    if strength == 1.0:
        return transform(rgb_in, p)
    out = transform(rgb_in, p)
    return tuple(clamp(lerp(rgb_in[i], out[i], strength)) for i in range(3))


# --------------------------------------------------------------------------
# .cube writer
# --------------------------------------------------------------------------

def write_cube(path, title, size, strength, p):
    lines = [
        'TITLE "%s"' % title,
        "",
        "# Film-look LUT generated by generate_lut.py",
        "# Input  : Rec.709 / sRGB display-referred",
        "# Output : Rec.709 / sRGB display-referred",
        "# Strength: %d%%" % round(strength * 100),
        "",
        "LUT_3D_SIZE %d" % size,
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "",
    ]
    d = size - 1
    # .cube ordering: red index varies fastest.
    for bi in range(size):
        b = bi / d
        for gi in range(size):
            g = gi / d
            for ri in range(size):
                r = ri / d
                o = transform_blend((r, g, b), p, strength)
                lines.append("%.6f %.6f %.6f" % o)
    with open(path, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    return len(lines)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for name, title, strength in VARIANTS:
        path = os.path.join(here, name)
        write_cube(path, title, LUT_SIZE, strength, PARAMS)
        print("wrote %s  (%d^3, %d%%)" % (name, LUT_SIZE, round(strength * 100)))


if __name__ == "__main__":
    main()
