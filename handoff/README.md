# Cogentiq Builder — Context Studio

Implementation of the Figma frame **“Context- glossary”**
(file `Cq3g1NA1RzLfySk1EM2n2V`, node **2296-537913**) on the Cogentiq design system.

Open `context-studio.html` directly in a browser — no build step, no dependencies.

---

## Files

| File | What it holds |
|---|---|
| `context-studio.html` | Document, icon sprite, page markup |
| `context-studio.css` | All styles: design tokens, both themes, every component |
| `context-studio.js` | All interactions and animations, plus the demo data fixtures |

Nothing else is required. The only external request is Google Fonts (Geist + Geist Mono);
if your app already loads Geist, drop the `<link>` tags.

### The icon sprite

Every icon is an exported Figma asset, inlined once at the top of `<body>` and referenced
with `<use href="#id">`. Prefixes: `ic-pp_*` platform panel, `ic-*` shared UI, `cx-*`
Context Studio specifics.

To move it to a partial, cut the `<svg class="sprite">` block into its own file and include
it server-side at the top of `<body>`. **Do not** switch to an external
`<use href="icons.svg#id">` reference — the glyphs would stop inheriting `currentColor`,
which is how the sidebar items, rail and hero tiles get their colours.

---

## Theming

Light is the mode the frame is designed in, and the default. The header toggle stamps
`data-mode="dark"` on `<html>` and remembers the choice in `localStorage` under `cq-theme`.

All colour lives in two token blocks at the top of the CSS — `:root` (light) and
`:root[data-mode="dark"]`. Token names match the Figma variables one-for-one, so a value
changed in Figma maps to exactly one line here. **Components never hard-code a colour**;
if a value is missing, add a token rather than a literal.

Three exceptions, which are deliberate and documented in place:

- The hero gradient, its CTA card and its quick tiles keep literal colours in both themes —
  the band is the same gradient in dark mode, so the white text and white cards on it are
  correct either way.
- `--art-row-bg` is its own token because the obvious candidate (`--backgrounds-card-bg-6`)
  resolves to the detail panel’s own background in dark mode, which made the artifact rows
  dissolve into it.
- The bundle-mark gradients (`cx-b-*`) are exported Figma SVGs with baked gradient stops.

---

## Component map

| Region | Selector | Notes |
|---|---|---|
| Platform panel | `.cq-rail` | Current design-system component, ported as-is. Overlays rather than pushes, so `.app` reserves a constant `--rail-w` gutter. |
| Frame + header | `.content-wrapper`, `.header` | Title plus tertiary subtext, matching the Model hub and Skills pages. |
| Context sidebar | `.sidebar`, `.side-item` | Studio / Glossary / Ontology / Data Binding / Tool Binding / Prompts / Rules & Policies. |
| Explainer card | `.ctx-info` | Collapsible; see interactions below. |
| Filter bar | `.filters-bar` | Title with count, one-line description, search field. |
| Hero band | `.hero` | Gradient, dot grid, CTA card, `OR CREATE` divider, six quick-create tiles. |
| Bundle grid | `.bundle-grid`, `.bundle-card` | Three columns, dropping to two then one. Count chip uses the Model hub card-tag style. |
| Detail panel | `.panel` | 420px right-edge overlay, same component as the Model hub and Skills panels. |

### Hero background

The frame’s gradient art is a large exported composite. It is rebuilt in CSS instead
(layered radial + linear gradients, a `radial-gradient` dot grid, and a `conic-gradient`
ray fan) so the band scales fluidly at any width. If you need pixel-exact parity with
Figma, replace `.hero`’s `background` and its `::before` / `::after` with the exported
asset — nothing else depends on them.

---

## Interactions and animations

Everything below is implemented in `context-studio.js`; timings are exact.

### 1 · Platform panel

- Hover opens it from **68px → 240px** after a **140ms** delay; leaving closes it after
  **200ms**. The delays stop it flickering as the cursor crosses.
- Width transitions **260ms `cubic-bezier(.4,0,.2,1)`**.
- Labels are laid out at full width the whole time and clipped by the rail — animating
  their width instead would reflow every row.
- The collapse button closes it immediately.
- Category headers toggle on click, **one open at a time**: opening one closes the others.
  Chevron rotates **180° over 220ms**.
- Context Studio is a leaf category (no children) and sits below all others under a rule.
  Its tile gradient rotates on a **6s** loop, speeding to **1.4s** on hover.

### 2 · Hero dot highlight

Two identical dot grids are stacked. The base grid is dim; the second (`.hero__glow`) is
bright and revealed only through a **150px radial mask centred on the cursor**.

- Cursor position is written to `--mx` / `--my` on the glow layer, throttled to one write
  per animation frame via `requestAnimationFrame`.
- The layer fades **0 → 0.5 over 450ms** on hover, so only the dots brighten in a soft
  pool — the band itself does not change.
- Skipped under `(hover: none)` and `prefers-reduced-motion`.

Both grids use the same `background-size` and phase, so dots light up *in place* rather
than a second grid fading in over the first.

### 3 · Explainer card — “What is a context bundle?”

- Starts **minimised**, so the artifact list owns the sidebar on arrival.
- **Opens itself after 4500ms** and stays open.
- The header row is the toggle. Clicking it **cancels the timer**, so the card never
  re-opens over someone who just closed it.
- Height animates from a `max-height` measured in script, so it works with content of any
  length. A `ResizeObserver` keeps the cap true if the content reflows while open.
- The card’s column gap belongs to the collapsible body, not the card — otherwise the
  collapsed state carries a phantom row and the bottom padding looks larger than the top.

### 4 · Bundle grid → detail panel

- Clicking a card opens the panel; clicking the same card again closes it.
- Cards lift **2px** on hover and take a blue ring while selected.
- The panel slides in with `transform` **280ms `cubic-bezier(.4,0,.2,1)`** over a
  transparent scrim that exists only to catch the outside click.
- Closes on: the **×**, a click outside, **Escape**, or re-clicking the open card.
- Focus moves to the **×** on open.

### 5 · Search

The “Search bundles” field filters the grid live on `input`, matching name and description.
An empty-state line shows when nothing matches.

### 6 · Reduced motion

`@media (prefers-reduced-motion: reduce)` disables every transition and animation, and the
hero glow layer is hidden outright.

---

## Data shape

The fixtures at the top of the JS mirror the create-bundle screen (node **2175-12558**):
a bundle is a matrix of **artifact type × layer**, one artifact per cell, each pinned to a
version.

```js
{
  icon: 'cx-b-indigo',      // sprite id of the bundle mark
  size: 24,                 // its viewBox, 23 or 24
  name: 'Customer Support',
  desc: 'This bundle is created for…',
  count: '12 artifacts',    // the card chip
  owner: 'S',               // avatar initial on the card
  creator: 'Savio Govindu',
  created: 'Aug 12, 2026',
  updated: 'Aug 28, 2026',
  artifacts: [
    { layer: 'domain', type: 'glossary', name: 'Customer Glossary', version: 'v2.1' },
    // layer: 'domain' | 'organization' | 'solution'
    // type:  keys of TYPES — glossary | ontology | data | prompts | tools | rules
  ],
}
```

Replace `BUNDLES` with your API payload; the render functions read nothing else.
`TYPES` supplies each artifact type’s label, one-liner and icon; `LAYERS` fixes the display
order of the three layers.

All interpolated values pass through `esc()` before reaching `innerHTML`. Keep that in
place when you wire real data — bundle names and descriptions are user input.

---

## Accessibility

Already in place: `aria-expanded` on both the rail categories and the explainer toggle,
`aria-current="page"` on the active nav items, `aria-hidden` on the panel, `aria-label` on
every icon-only control, a visible `:focus-visible` ring, and Escape closing the panel.

Two things worth doing when this becomes a real page:

- Give the panel `role="dialog"` and trap focus inside it while open, if you want it to
  behave as a modal. As built it is a non-modal detail view: the page behind stays
  readable and scrollable, which is why the scrim is transparent.
- Make the nav items and bundle cards real links (`<a href>`) rather than `<button>`, so
  they can be opened in a new tab.

---

## Two notes on the design

1. **Active rail item.** The Figma frame shows the *brain* icon selected in the rail, which
   in the design system’s current naming is **Model Hub**. Since this is the Context page,
   Library › **Context** is marked active here instead. One line in the HTML if you want
   the Figma selection back.

2. **Artifact type copy.** The create-bundle frame labels *Data Binding* “Pre-configured
   prompt templates” and *Prompts* “Connections to data sources” — these look swapped. The
   `TYPES` map uses the sensible pairing. Worth confirming with the designer.

---

## Browser support

Chrome, Edge, Safari and Firefox, current versions.

The hero glow and the frame’s pixel texture use `mask-image`, written with the `-webkit-`
prefix alongside the standard property. Where masks are unsupported the glow simply does
not appear; nothing else depends on it. `ResizeObserver` is feature-detected.
