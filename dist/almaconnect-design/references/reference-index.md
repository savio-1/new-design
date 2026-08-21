# Reference Index

Registry of every design reference absorbed into this skill. When a new reference is added, study it, append/extend patterns in `section-patterns.md` (new `P##` numbers, never renumber), and log it here.

| # | Source | What it is | Frames studied | Patterns contributed | Added |
|---|--------|-----------|----------------|----------------------|-------|
| R1 | Figma `wPFGlGLF2kGdcC06My35za` ("Website") | AngelList site capture — 12 page frames @1440px | Homepage ×2 (1:4, 1:8360), venture-funds (1:1495), syndicates-for-managers (1:2866), start-rolling (1:3972), scout-funds (1:4763), investor-venture-funds (1:6144), partnerships (1:6917), blog (1:7411), learn (1:7784), data-center (1:8121), help (1:7712) | P0–P18 (all current patterns) + token system foundation | 2026-08-20 |
| R2 | wonderful.ai (live site, Framer build) | Motion/interaction reference — scoped to two patterns the client selected | Homepage: logo-strip section, case-study ticker, hero pill nav | M1 auto-scrolling logo marquee · M2 link ticker · M3 pill-nav → white overlay panel (see motion-patterns.md) | 2026-08-20 |
| R3 | Satomo template by Framebite (`satoma.framer.website`) + 3 client screenshots | **Colour reference only** — pastel support palette around a deep green anchor | How-it-works steps, integrations section, dark feature panel w/ status pills | Full support palette + usage budget + contrast fixes (see color-system.md) | 2026-08-20 |

## Brand constants (fixed, not from references)

- Font: **Nunito Sans** variable (wght 200–1000, upright + italic) — bundled in `assets/fonts/`
- Primary: **#00C4B5** turquoise green
- These override any reference's font/accent. References contribute *layout, spacing, hierarchy, and component grammar* only.

## Adaptation rules applied to R1

- Reference ink `#002B31` → AlmaConnect ink `#04302B` (re-derived toward turquoise hue)
- Reference purple accent `#5A50F5` → `#00C4B5`
- Reference lavender tints/`#CDCBFF` on-dark → `#E0F7F4` tint / `#BFF0EA` on-dark
- Reference coral→periwinkle pill gradient → `#7FE8DE→#BFF0EA`
- Reference grotesque (AngelList Sans/Display, Regular weight at display sizes) → Nunito Sans wght 375 at display sizes, 600 for emphasis
- Everything else (grid, radii, hairlines, section anatomy, no-shadow rule) carried over unchanged

## Adaptation rules applied to R2 (wonderful.ai)

- **Scoped adoption:** only the two client-selected patterns (logo marquee + nav hover overlay, plus the adjacent link ticker that shares the marquee mechanics). Wonderful's overall look (dark video heroes, its type, its palette) is NOT adopted — layout/skin remain AngelList-derived + AlmaConnect brand.
- Dark pill nav tint → ink `#04302B` @45% + blur (reference uses near-black); expanded panel → `--surface` with `--accent-tint` hover rows.
- Marquee logo treatment → monochrome ink @55% opacity on `--ground`, edge fade via CSS mask.
- Exact speeds/durations extrapolated from observed feel (Framer defaults); tune in browser: marquee 28–36s/loop, panel 380ms expand.

## Adaptation rules applied to R3 (Satomo)

- **Colours only.** Explicit client instruction: no layout, type, section structure, or component shapes from this template. Satomo's own look is not adopted.
- Values sampled pixel-exact from the three client screenshots (PIL frequency + point sampling), cross-checked against the live preview.
- Deep green anchor `#254A46` → `#17403A` so dark sections read as AlmaConnect turquoise-green, not Satomo forest-green.
- Saturated pair colours darkened to clear WCAG AA (4.5:1) on their own tints — the reference's status-pill text fails as small text. Reference values retained only for decorative glyphs.
- Butter yellow `#F6E47F` kept **exactly** — it's the palette's one high-area warm accent and the thing that makes the deep green feel warm rather than corporate.
- Lilac/peach nudged cooler to avoid clashing with turquoise.
- **Contrast bug found & fixed in the existing skill:** `--accent #00C4B5` is light (white text ≈2.4:1, fails AA). Primary buttons changed to ink-on-turquoise; token sheet and SKILL.md updated.

## Open items

- Mobile/responsive behavior: R1 contains desktop (1440) frames only. Breakpoint rules are currently extrapolated (clamp() on display type, 48px→24px margins). A mobile reference would firm this up.
- Photography/illustration art direction beyond "UI-mock collages on tinted panels" — add a reference if a distinct style is wanted.
