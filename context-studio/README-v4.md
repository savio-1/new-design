# Context Studio — storyboard v4 (the sphere film)

13.0s, 780 frames @ 60fps. Compositions: `Main169` (1920×1080 primary),
`V4Square` (1080×1080). Source lives in `src/v4/`.

```
npx remotion render Main169  out/context-studio-v4-16x9.mp4 --codec=h264 --crf=15
npx remotion render V4Square out/context-studio-v4-1x1.mp4  --codec=h264 --crf=15
```

## Decisions taken (storyboard §1, §11)

- **Tonal arc: Option A (Dawn)** — dark throughout, lifting to `#1A2145` with
  the mint bloom, exactly as §7–8 are written. Option B (the full dark→light
  flip) changes only beats 5–6 and the field tokens; say the word and it's a
  ~40-line rewrite in `elements.tsx` (Field/Caption colors) + `choreo.ts`.
- **Seven spheres**, not three groupings — per the brief in §1.2.
- **Noise**: generated in-browser via seeded SVG `feTurbulence` data-URIs
  (`grain.ts`) instead of a PNG asset — deterministic in headless Chromium,
  no binary in the repo. In-sphere grain ≈8% effective, global ≈4%,
  re-seeded every 2 frames.
- **Cogentiq mark** reuses the triangle glyph from the v2 film's component
  library (open item #3 — swap for the real SVG when it lands).

## Structure

```
src/v4/
  tokens.ts     FIELD / TEXT / SPHERES (§3)
  camera.tsx    the rig (§4): keyframe tracks for zoom/aperture/focus/pan,
                depth solver, <Depth> wrapper, worldForScreen()
  grain.ts      feTurbulence noise tiles + 2-frame reseed offsets
  spheres.tsx   MatteSphere / EmissiveSphere / ShadedSphere — three
                components, never one with modes (§10)
  elements.tsx  Field, MintBloom, GlobalGrain, RadarRings, EmitRing, Squares,
                Plane, UIFragment, TrailBar, Swoosh, Sparkle, Label, Caption,
                Lockup
  choreo.ts     grid cells, the seven spheres' full state over time
                (grid → scatter → rack targets → spiral gather → absorption),
                and the core (ignition, flash, breathing, travel)
  Film.tsx      assembles all six beats from global frame — the beats share
                too much state (the seven, the core) for per-beat Sequences
```

## Deviations / interpretation notes

- **Camera pan** shifts every depth (base + parallax differential), not just
  off-focus depths — §4's raw formula leaves a depth-0.5 hero frozen during
  beat 5's drift, contradicting §8's "the core slides left through parallax".
- **Beat-5 clutter blur** comes from a temporary aperture lift to 1.0 during
  f578–624 (the storyboard's flat 0.4 gives the depth-0.9 planes only ~8px,
  short of the specified 18–26px).
- **Beat-6 sphere grows to 0.085w** during the emissive→shaded crossfade —
  at the spec's arrival scale the resolved object would be ~75px wide at
  1920, too small to carry the closing frame.
- **The core's conic rotation runs at 6.5s**, not §8's 8s, honouring §10's
  "periods divide into 13s".
- **9:16 not built** — §11 open item 5: a tall frame wants fewer, larger
  spheres; grid pitch and beat-2 depth spread need retuning first.

## Open items (from §11)

Copy sign-off on the six clauses; real cogentiq mark/wordmark SVGs;
Option A vs B call; audio (hit points at f96, f150, f450, f644, f690).
