---
name: almaconnect-type-spacing
description: Typography scale, font pairing, and spacing system for the AlmaConnect website — Geist for headlines, Nunito Sans for body, on a type/spacing scale measured from asana.com. Use alongside the almaconnect-design skill whenever building or reviewing any AlmaConnect page or section; this skill overrides almaconnect-design's type scale and section spacing, while colors, components, and section patterns still come from almaconnect-design.
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

**Weight discipline (Asana's signature move):** headlines are *light* — Geist **300** at display sizes, with negative tracking. Small UI text (buttons, nav, chips, card titles) is *medium/semibold* — Nunito Sans **500–600**. Nothing on the page is ever 700+ except tiny chips. The scale does the talking, not the boldness.

## 2. Type scale (as measured on asana.com at 1440px)

| Role | Face | Size / line-height | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Display / H1 | Geist | **88px** / 0.95 | 300 | **−0.04em** | Homepage hero only. `clamp(52px, 6.1vw, 88px)`. Max-width ~900px. (Asana measured 102/0.90/−0.025em; 88px/−4% is the client's confirmed override.) |
| H2 (every section headline) | Geist | 54px / 1.00 | 300 | −0.02em | One spec reused by ALL sections — never invent per-section sizes. |
| H3 / feature title | Geist | 30px / 1.20 | 400 | 0 | |
| Card / accordion title | Geist | 24px / 1.20 | 500 | 0 | |
| Hero subtext | Nunito Sans | **22px** / 1.35 | 400 | **−0.04em** | Color: ink at 80%. Renders ~520–630px wide. (Asana measured 26/1.3; 22px/−4% is the client's confirmed override.) |
| Section subtext / card body (large) | Nunito Sans | 20px / 1.50 | 400 | 0 | |
| Body / button labels | Nunito Sans | 16px / 1.55 | 400 (body) · 600 (buttons, links, card leads) | 0 | |
| Nav items | Nunito Sans | 15px / 1.5 | 500 | 0 | (Asana: 14px/500 — nudged +1 for Nunito's smaller x-height feel) |
| Caption / legal | Nunito Sans | 13px / 1.50 | 400 | +0.02em | |
| Eyebrow | Nunito Sans | 16px / 1.5 | 600 | +0.04em | Asana sets these uppercase; AlmaConnect keeps **sentence case** (house rule) — the +0.04em tracking only applies if a rare uppercase chip is used. |
| Micro-chip labels | Nunito Sans | 10–11px / 1.5 | 600–700 | +0.04em | UPPERCASE allowed here only (`NEWS ALERT`, `DEPLOY`-style annotation chips). |

Distinct sizes on the page — stay inside this inventory: **88, 54, 30, 24, 22, 20, 16, 15, 13, 11px.**

**Line-height law:** 1.5 at ≤20px → 1.2–1.3 mid-scale → 1.0 at H2 → 0.9 at display. **Tracking law:** negative above 26px, neutral for body, positive only on uppercase micro-text.

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

Height ladder by prominence (Asana), label always Nunito Sans 16px/600 (nav: 15px):

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
