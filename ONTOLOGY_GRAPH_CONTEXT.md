# Ontology Graph — Design Context

Portable spec for the interactive ontology-graph prototype (`ontology-graph.html`).
Written so a fresh chat can understand the design intent and build variations
without needing the conversation history that produced it.

## What this is

A single-file, dependency-free HTML/SVG prototype of an **ego-network graph
explorer** for a knowledge-graph / ontology product (Cogentiq). One entity is
always "in focus" at the center; its direct relationships fan out around it;
everything else in the ontology is still rendered, but faded into the
background, real and clickable rather than decorative filler.

Reference inputs it was built from (for context, not required to open):
- **teamworkgraph.com** (Atlassian) — the ego-network interaction model:
  click a node → it becomes the new center, its neighbors fan out, breadcrumb
  trail tracks history.
- **Figma file "Cogentiq — Builder"** (node `2603-473248`) — the visual
  language: dark dot-grid canvas, small rounded-rect chips with a colored
  square icon + label for plain entities, and a circular avatar-with-initials
  "hub" treatment for the currently important node, gradient-tinted solid
  edges, dark bordered relationship pills.
- **magicui.design's rainbow-button** — inspiration for the focus node's
  animated gradient border (multi-hue sweep rather than a flat highlight).
- A screen recording of Cogentiq's *actual* production ontology graph — too
  much shown at once (every node's full definition inline, raw snake_case
  edge labels). The whole point of this redesign is progressive disclosure:
  **structure first, definitions on demand.**

## Interaction model

1. **One node is always "focused"** (centered, avatar+initials treatment).
   Its direct neighbors are pulled into a ring around it via a lightweight
   force simulation (repulsion + spring-to-rest-radius). This is the
   **active set**.
2. **Click any node** (focused-cluster or faded-background) → it becomes the
   new focus; the graph re-centers with a spring animation. A breadcrumb
   trail (top bar) tracks history with a `← back` button.
3. **Hover any node** (active or background) → its full definition appears
   in a floating card (type badge, name, definition text) beside it; its
   real neighbors highlight; everything else — including the current focus,
   if unrelated — dims. This is deliberate: hover answers "what is this and
   what does it touch," independent of what's currently focused.
4. **Drag** empty canvas to pan, **scroll** to zoom (0.35×–2.4×), **search
   box** jumps focus to a matching entity by name.
5. **The rest of the ontology never disappears.** Every node always exists
   somewhere on screen — either in the bright active cluster or faded in the
   background ring — so "the rest of the graph" is real data, not a
   scroll-away void.

## Visual system

### Color tokens
Pulled directly from Cogentiq's Figma variable-collection export
(`Dark.tokens.json`), 500/600 tier for saturated accents:

| Role | Hex | Token |
|---|---|---|
| Canvas background | `#121212` | Grey/1000 |
| Panel / chip fill | `#212121` | Grey/900 |
| Panel border | `#323232` | Grey/850 |
| Panel border (hover) | `#424242` | Grey/800 |
| Primary text | `#f5f5f5` | White-ish |
| Secondary text | `#bdbdbd` | Grey/400 |
| Tertiary text | `#8c8c8c` | Grey/550 |

Entity-type accent palette (one hue per category, used for the chip's
colored square, the avatar fill, and the legend swatch):

| Type | Hex | Token |
|---|---|---|
| Measure | `#14ae5c` | Green/500 |
| Forecast | `#5860ed` | Indigo/500 |
| Derived metric | `#00a2c2` | Cyan/500 |
| Account | `#f24822` | Red/500 |
| Inventory | `#0d99ff` | Blue/500 |
| Policy | `#fc9e24` | Orange/600 |

Focus-ring rainbow gradient (5 stops, first = last so a full rotation has no
seam): `#0d99ff → #9747ff → #e91e63 → #fc9e24 → #0d99ff` at 0/25/50/75/100%.

### Typography
`Geist` (weights 400/500/600/700) for UI text, `Geist Mono` (500) for the
zoom-percent readout. Loaded via Google Fonts `<link>`; **note the
font-load race** documented below.

- Chip label: 12px / weight 500
- Focus capsule label: 13px / weight 600
- Avatar initials: 16px / weight **300** / centered (`text-anchor:middle`,
  `dominant-baseline:central`)
- Relationship pill text: 10.5px / weight 500
- Definition-card name: 13px / weight 600; body: 12px / weight 400

### Background
`#stage::before` layers two radial-gradients: a repeating 26×26px dot grid
(`rgba(255,255,255,.06)` dots) plus a very soft central brightness lift.

### Node treatments
Two distinct shapes, chosen by whether a node is the current focus:

- **Chip** (everything else, active-neighbor or background): rounded-rect
  (`rx:8`), `#212121` fill, `#323232`/`#424242` border, small 7–8px colored
  square icon + label, sized to hug its text (`width = measured_text + ~26px`
  padding). Label flips to the left side when the chip sits left of the
  focus, so text never points away from the cluster.
- **Focus capsule**: taller rounded-rect (`rx:19`, height 38), dark fill,
  **animated rainbow-gradient stroke** (see Motion below), a solid-color
  avatar circle (r:14) with 2-letter initials, label in white/weight 600.
  Width = `21 + 27 + measured_text_width + 18` — i.e. hugs the text with a
  fixed avatar+padding allowance, not a fixed empty margin.

**Known past bug, now fixed:** all these widths come from
`canvas.measureText()` against a `Geist` font string. If that measurement
runs *before* the Geist webfont has actually downloaded, the browser
silently substitutes a fallback font with different (usually wider) metrics,
so early-built chips/capsules reserve too much space — inconsistently,
since only elements built before the font arrived are affected. **Fix
pattern:** rebuild everything once via `document.fonts.ready.then(() =>
setFocus(focusId, false))` after initial paint. Carry this pattern into any
variation that measures text with canvas.

### Edges
- **Default (background-only, or neighbor-to-neighbor not touching focus):**
  dotted grey, `stroke:#4d5158`, `stroke-dasharray:2 7`, width 1.6,
  opacity .75.
- **Touching the focused node:** solid blue (`--blue:#0d99ff`), no dash,
  width 1.7, opacity .85.
- **Background-only edges** (both endpoints in the faded ring): even
  dimmer/thinner — `#2a2c30`, width 1, dash `2 8`, **opacity .15** — present
  for context, essentially invisible unless you look for them.
- **Hover state (`.hi`):** full opacity, width 2.1.

### Relationship pills
Small dark rounded-rect (`#1c1c1cf0` fill, `#424242` border) centered along
each edge, showing the human-readable relationship verb from the data
(e.g. "produces deviation", "stockout risk rule"). Positioned with a
clearance calculation so it never collides with the wide focus capsule —
biased away from the focus end when the neighbor sits to the capsule's
right (see `focusReach` math in `render()`).

### Hover definition card
Floating panel (`#tip`), appears beside whichever node is hovered: colored
type-dot, uppercase type label, bold name, definition body text. Flips
left/above near viewport edges. This is the **progressive-disclosure
payoff** — the whole redesign's thesis is "structure visible by default,
definitions on demand," and this card is where the demand gets met.

### Background (faded) layer
Every node not in the active set renders as a low-opacity chip
(`BG_OPACITY = 0.32`) at a **fixed position from a one-time force-directed
layout** (`computeFullLayout()` — repulsion + spring-to-link-length, run
once at page load, then the whole arrangement is pushed out to
`radius = 225 + r*0.28` — just outside the active cluster's own radius, so
nothing overlaps). This is a deliberate rejection of decorative "ambient"
filler: every faded node is the *real* entity at a *stable* location, so a
user's spatial memory of "where things are" holds up across clicks.
Hovering dims everything to `BG_DIM = 0.07` except the hovered node and its
real neighbors (wherever they are, active or background).

## Motion specs

Two independent animation systems, both intentionally **pulsed with rest
periods**, not continuous loops — the explicit design goal ("even and
smooth, nicely timed out between each") was to avoid a busy/anxious feel.

### 1. Focus-ring gradient sweep
```
SPIN  = 3.6s   // two full 360° rotations (720° total), eased
FADE  = 1.1s   // glow fade-out after the spin ends
REST  = 4.0s   // dark, motionless rest before the next spin
PERIOD = SPIN + REST = 7.6s
```
- Rotation uses **easeInOutCubic**, not linear — decelerates into the start,
  accelerates through the middle, decelerates into the stop. This reads as
  a deliberate sweep rather than a spinning wheel.
- A separate blurred glow rect (`.cap-glow`, `feGaussianBlur stdDeviation:5.5`)
  sits behind the crisp gradient border and fades its opacity 0→1 as the
  spin starts, holds through both loops, eases back to 0 over `FADE`
  seconds once the spin stops. The **crisp border itself is always
  visible** — only the soft outer glow is tied to motion.
- Implementation: a single `<linearGradient id="focusGrad">` with
  `gradientTransform: rotate(angle 0.5 0.5)` recomputed every frame; both
  the border stroke and the glow stroke reference the same gradient so they
  stay in sync.
- Tuning history: started at a linear half-turn (180°) per cycle — nearly
  imperceptible. Went to 720° linear at 1.5s (too fast/mechanical), then
  1.95s (still too fast per feedback), landed on 3.6s eased as the
  "slow, deliberate" version. If asked to retune, these three constants are
  the only ones that matter.

### 2. Edge shimmer (relationship pulse)
```
PERIOD = 5.5s   // time between pulses, per edge
TRAVEL = 1.1s   // time to slide the full node-to-node length
```
- A soft light window (3-stop gradient: transparent → white → transparent,
  `stroke-opacity .95` at the peak) slides along each edge's own
  coordinates (not a separate floating object — it's a second `<line>`
  layered on the real edge, `mix-blend-mode: screen`, with a matching
  `feGaussianBlur` for softness).
- Always travels **outward from the focused node** to the neighbor
  (`e.from`/`e.to` are resolved so `from` is the focus-side endpoint).
- `easeInOutQuad` on the 0→1 travel progress; eases fully in at the focus
  end and fully out at the neighbor end (`band = 13`% half-width window
  slides from `-band` to `100+band`).
- **Each edge has a different phase** (`phase = index / totalEdges`,
  spread evenly at `buildEdges()` time) so pulses ripple around the graph
  one after another rather than firing in sync — this reads as "alive"
  without being busy.
- Design history: started as a **floating dot** traveling between nodes —
  rejected as "disturbing," not shimmer-like. Rebuilt as a light window
  gliding along the line's own pixels (feels like a glint on a wire, not an
  object in space). Then rebuilt again from "continuous nonstop" to
  discrete pulses with genuine rest between them, per feedback that named
  the exact rhythm: "move, settle, wait ~4s [analogous window here], move
  again."

## Data schema

```js
const NODES = [
  { id: 'Human-readable Entity Name', type: 'measure', // one of the TYPE keys
    def: 'One or two sentences — the full definition shown on hover.' },
  // ...
];
const LINKS = [
  ['Entity A', 'Entity B', 'relationship verb, human-readable'],
  // undirected for graph purposes; 'from'/'to' for the shimmer's direction
  // is resolved separately (always focus → neighbor), not from link order.
];
const START = 'Entity A'; // which node is focused on load
```
`TYPE` keys must match `type` values used in `NODES`; each needs `{color,
label}`. Adding a new type = one object literal + it shows up in the legend
automatically (built by iterating `NODES` for types actually used).

Current seed data is a **CPG demand-planning ontology** (Forecast Deviation,
Calibrated/Observed Actual Demand, Consensus/Calibrated Demand Forecast,
Walmart, Monitored Inventory Position, Retailer Replenishment Policy) — 8
nodes, transcribed from a recording of Cogentiq's real production graph for
that domain. Swap `NODES`/`LINKS`/`START` for any other domain; nothing
else in the file depends on the specific entities.

## Known constraints / things to watch when varying this

- **All measurement happens via `canvas.measureText()`** against Geist —
  respect the `document.fonts.ready` rebuild pattern in any variant that
  keeps custom fonts.
- **Only 8 nodes in the seed data** — the background-ring radius
  (`225 + r*0.28`) and active-cluster REST radius
  (`95 + ids.length*6 + estW(focusId)*0.4 + maxChipW*0.25`) were tuned for
  this scale. A denser real ontology will likely need both radii and the
  one-time force-layout iteration count (`260` in `computeFullLayout`)
  revisited — more nodes will want more spread and probably more
  iterations to settle without overlap.
- **No persistence / no backend** — pure client-side, single HTML file,
  no build step. Good for fast iteration on look/feel; would need
  real data wiring for production.
- **Not yet built:** multi-select, filtering by type, a "show all
  relationships" mode, keyboard navigation, mobile/touch gesture tuning
  (pan/zoom currently mouse/wheel-oriented).

## File map

- `ontology-graph.html` — the whole prototype, self-contained, open directly
  in a browser. All CSS in a `<style>` block, all JS in one `<script>` block
  at the bottom, no external JS dependencies (Google Fonts is the only
  external request).
