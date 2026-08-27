# Cogentiq Context Studio — 12s launch animation

Remotion implementation of the [storyboard v2](#) — a 12-second, seamlessly
looping launch film for Context Studio, built on the Cogentiq design system
(Figma `HimR0mebP9NQmNK0LQ9MQC`, login-screen panels `991:104474`,
`991:104659`, `991:104968`).

## Run

```
npm install
npm run dev          # Remotion studio
npm run render:2x3   # 1080×1620 master  → out/context-studio-2x3.mp4
npm run render:1x1   # 1080×1080 square  → out/context-studio-1x1.mp4
```

720 frames @ 60fps. Everything is authored in Figma panel units (540 × 804)
and scaled by `width / 540` in one place (`src/layout.tsx`) — no output pixels
are hardcoded.

The render browser is pinned in `remotion.config.ts` to the container's
Playwright Chromium headless shell; on a normal machine you can delete that
line and let Remotion download its own.

## Structure

```
src/
  tokens.ts               design tokens (colors, card, type)
  motion.ts               osc / easings / seeded jitter — all periods divide 12s
  layout.tsx              panel-unit scaling + stage mapping per aspect ratio
  fonts.ts                Geist Medium/Regular via @font-face + delayRender
  gradient/
    layers.ts             the 5 mesh layers from Figma 991:104969, as data
    MeshGradient.tsx      the living field — never cuts, loops at f720
  components/             GlassCard, Pill, Connector, IconTile, OrbitCore,
                          OrbitRing, Sparkles, LogoLockup, ProgressDots,
                          Headline (mask-up/mask-down swap), Glyphs
  scenes/
    B1Scatter.tsx         beat 1 — ten integration tiles + Sources counter
    B23BlocksCombine.tsx  beats 2+3 — seven cards → stack → deck → bundle
    B4Attach.tsx          beat 4 — orbit (12s period) + agent card; persists
                          receded behind beat 5 and returns for the close
    B5Grounded.tsx        beat 5 — trigger → agent → result flow
  data/
    blocks.ts             the seven context blocks
    integrations.ts       beat-1 logos (placeholder monograms)
```

## Deviations from the storyboard, and why

- **Mesh layers carry extra blur (24–48px) plus a soft white radial lift.**
  The raw §4 layer table renders with visible inner-rect seams and reads far
  darker than the Figma export of `991:104968`; the blur + lift matches the
  panel's pastel wash. Diffed against a live Figma screenshot
  (`stills/figma-104968.png`).
- **Orbit rings are 0.85× the Figma ellipses** so the orbit clears the agent
  card that docks beneath it in beat 4 — the reference panel has no card
  there.
- **Beat 5 execution card is 124 units tall** (spec implied ~116) so the
  status row, title, description, and Gemini badge fit without clipping.
- **`success` green added to the token set** for the beat-5 "Approved" tick,
  which §8 calls for explicitly.
- **Integration logos are Geist monograms** and the seven block icons are
  minimal ink glyphs — placeholders for storyboard open item #2 (real brand
  SVGs and design-system icons). Swap them in `data/integrations.ts` and
  `components/Glyphs.tsx`.
- **16:9 is not built** — per §2 it's a relayout (gradient panel as a left
  column), a separate composition to add once the aspect-ratio priority
  (open item #5) is settled.
- **WebP loop of beats 2–4** (§10) isn't exported — Remotion has no animated
  WebP codec; render frames 120–503 as a GIF or image sequence if needed.

## Loop

Frame 719 → 0 is seamless by construction: every periodic motion (gradient
drift, sparkle twinkle, card bobs, orbital period) uses a period that divides
12s. The only discontinuity is the content itself, which is intended.
