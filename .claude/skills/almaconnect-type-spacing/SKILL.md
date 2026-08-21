---
name: almaconnect-type-spacing
description: Typography scale, font pairing, and spacing system for the AlmaConnect website — Geist 350 for headlines (88/64/48/32/24/16/14, −4% at 48px+ and −3% below), Nunito Sans 400 for body (24/20/18/16/14/12 at −3%), on spacing measured from asana.com. Use alongside the almaconnect-design skill whenever building or reviewing any AlmaConnect page or section; this skill overrides almaconnect-design's type scale and section spacing, while colors, components, and section patterns still come from almaconnect-design.
---

# AlmaConnect Type & Spacing System

Measured live from asana.com (1440×900 viewport, 2026-08-20, computed styles — not eyeballed), then adapted to AlmaConnect's font pairing. This skill is the source of truth for **font sizes, weights, line-heights, letter-spacing, and vertical rhythm** across almaconnect.com. Everything else — color tokens, component recipes, section patterns (P0–P18, M1–M3) — still comes from the `almaconnect-design` skill. Where the two disagree on type or spacing, this skill wins.

## 1. Font pairing

| Role | Face | Source |
|---|---|---|
| Headlines & display (H1, H2, H3, stat numerals) | **Geist** | Repo: `assets/fonts/geist/Geist-VariableFont_wght.ttf` (OFL). Also on Google Fonts (`family=Geist:wght@100..900`) — use Google Fonts for prototypes/artifacts, the repo file for production `@font-face`. |
| Everything else (subtext, body, buttons, nav, labels, captions, UI chips) | **Nunito Sans** | Google Fonts variable (`wght 200–1000`). |

Stacks:
- `--font-display: "Geist", "Helvetica Neue", Arial, sans-serif;`
- `--font-body: "Nunito Sans", ui-sans-serif, system-ui, sans-serif;`

**Weight discipline:** headlines are *light* — Geist **350** at every size, from the 88px display down to a 14px pill, always with negative tracking. Body prose is Nunito Sans **400**. Only UI controls go heavier: buttons and CTA links **600**, nav **500**. Nothing on the page is ever 700+. The scale does the talking, not the boldness — see §2 for the locked ladder.

## 2. Type scale — LOCKED (2026-08-21)

This is the ratified scale, signed off by the client and applied wholesale to the
homepage. It supersedes the earlier asana-derived draft (kept in §2b for provenance).
Two faces, two rules, no exceptions:

- **Headlines are Geist at weight 350, always.** Tracking is **−4% from 88px down to
  48px**, and **−3% for anything below 48px**.
- **Body is Nunito Sans at weight 400, always, at −3% tracking.** Line-heights vary by
  role; tracking does not.

### Headlines — Geist, weight 350

| Step | Size | Tracking | Line-height | Used for |
|---|---|---|---|---|
| Display / H1 | **88px** `clamp(52px, 6.1vw, 88px)` | **−4%** | 0.95 | Homepage hero only |
| Numerals | **64px** `clamp(40px, 4.45vw, 64px)` | **−4%** | 0.95 | Stat bands |
| H2 | **48px** `clamp(34px, 3.34vw, 48px)` | **−4%** | 1.05–1.12 | Every section headline — one spec, never per-section |
| H3 | **32px** | **−3%** | 1.25 | Sub-section heads, large card titles |
| H4 | **24px** | **−3%** | 1.2–1.25 | Card titles, accordion heads, product names, mega-menu titles |
| Tabs | **16px** | **−3%** | 1 | Tab/segmented controls |
| Small pills | **14px** | **−3%** | 1.4 | Category pills |

48px is the hinge: at 48 and above use −4%, below use −3%.

### Body — Nunito Sans, weight 400, −3% tracking

| Size | Line-height | Used for |
|---|---|---|
| **24px** | 1.55 | Editorial / long-form lead paragraphs |
| **20px** | 24px (hero) · 1.45 | Hero subtext, pull quotes, testimonials |
| **18px** | 1.5–1.55 | Section subtext, intro paragraphs |
| **16px** | 1.5 | Default body, card copy, nav, buttons, list items |
| **14px** | 1.4 | Labels, roles, captions, legal |
| **12px** | 1.5 | Micro-labels only |

Distinct sizes on the page — stay inside this inventory:
**Geist 88 / 64 / 48 / 32 / 24 / 16 / 14 · Nunito Sans 24 / 20 / 18 / 16 / 14 / 12.**

### Weight exceptions (the only ones)

Body weight is 400 for prose. **UI controls keep their heavier label weight** because
they read as affordances, not text: buttons and inline CTA links stay Nunito Sans
**600**, nav items stay **500**. Sizes still come from the ladder above.

### Implementing −3% body tracking

`letter-spacing: -0.03em` on `body` alone is not enough. `em` resolves to a pixel
value at the body's own font-size and then **inherits as that pixel value**, so a 14px
child renders −3.4% and an 18px child −2.7%. Set the default on `body`, then re-anchor
it on the elements themselves so `em` resolves against each element's own size — and
include form controls, which inherit neither font nor tracking:

```css
h1, h2, h3, h4, h5, h6,
p, li, a, blockquote, cite, figcaption, label, dt, dd,
button, input, select, textarea, td, th { letter-spacing: -0.03em; }
```

Keep `span`, `em`, and `strong` **out** of that list: they wrap a run inside a headline
(the shimmer device does exactly this) and must take the parent's tracking, not reset
it. Any `<span>` that carries its own `font-size` needs its own explicit `-0.03em`.

Logotypes are exempt from the tracking laws — a drawn mark's lettering keeps whatever
spacing the mark specifies (e.g. +6%).

## 2b. Provenance — the asana.com measurement this replaced

Measured live from asana.com (1440×900, 2026-08-20, computed styles). Retained only to
explain where the scale came from; **do not build to these numbers.** Asana's draft used
88/54/30/24/22/20/16/15/13/11px with headline weight 300 and mostly-neutral body
tracking. The locked scale above collapses that to seven headline steps and six body
steps, moves headline weight 300 → 350, and makes negative tracking universal rather
than "negative above 26px only".

## 3. Spacing system (measured)

| Metric | Value |
|---|---|
| Container | **1288px** content width, 76px side margins at 1440. Fluid below that. |
| Reading width | Subtext/paragraph blocks render **520–628px**, never full-width — even in full-bleed bands. |
| Section vertical padding | **80px standard**; 120–160px for marquee/feature sections; 40px for thin utility strips. Sections butt together (no margins between sections — padding carries all rhythm). |
| H1 → hero subtext | **28px** |
| Subtext → CTA | **24px** |
| Eyebrow → H2 | **8px** |
| H2 → section subtext | **16–24px** |
| Card grid gaps | **32px** columns / 48px rows (4-up rows: 4 × 298px + 3 × 32 = 1288) |
| Card internals | 24–32px padding, 8–12px radius |
| Intra-stack micro-scale | 8 / 16 / 24 / 28px — never arbitrary values |

## 4. Buttons

Height ladder by prominence (Asana), label always Nunito Sans **16px/600** — nav included (nav moved 15px → 16px with the locked scale):

| Tier | Height | Padding-x |
|---|---|---|
| Nav CTA | 44px | 24px |
| Standard / hero primary | 50px | 32px |
| Section-closing CTA | 58px | 32px |
| Footer mega-CTA | 64px (20px label) | 40px |

**Geometry stays AlmaConnect:** radius 6–8px rectangles per the `almaconnect-design` mock language — Asana's 100px pill radius is NOT adopted. Fill rules also stay AlmaConnect: ink fill + white text for hero/mock-style primaries, `--accent` fill + ink text for the nav CTA; never white text on turquoise.

## 5. How this composes with almaconnect-design

- **From this skill:** every font-size, weight, line-height, tracking, section padding, stack gap, container width, button height.
- **From almaconnect-design:** all color tokens (`--accent`, `--ink`, `--ground`, tints, support palette), hairlines, radii, section patterns (P0–P18), motion patterns (M1–M3), do/don't rules (sentence case, no shadows, two-tone paragraph device, tinted-panel illustration style).
- The two-tone device now reads: lead phrase Nunito Sans 600 full ink, remainder 400 at `--ink-65`.
- Superseded from almaconnect-design §2: the old Nunito-Sans-only scale (Display XL 112/0.9 @375, Display M 44, Heading M 28, section pad 96–144, container 1344/48). Use this skill's values instead.
