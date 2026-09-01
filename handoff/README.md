# Cogentiq Builder — Context Studio & Create bundle

Two pages on the Cogentiq design system, implemented from Figma file
`Cq3g1NA1RzLfySk1EM2n2V`:

| Page | Figma node |
|---|---|
| **Context Studio** — `context-studio.html` | **2296-537913** (“Context- glossary”) |
| **Create new bundle** — `create-bundle.html` | **2175-12558** |

The Studio page’s “Create Context bundle” card links to the second page; its back link
and Cancel button return. Open either file directly in a browser — no build step, no
dependencies.

---

## Files

Shared layer, linked by both pages:

| File | What it holds |
|---|---|
| `cogentiq.css` | Design tokens (light + dark), type ramps, reset, app shell, platform panel, shared form controls |
| `cogentiq.js` | Platform-panel behaviour and the theme toggle. Defines `$` and `root` |

Per page — link the shared file **first**, then the page file:

| File | What it holds |
|---|---|
| `context-studio.html` / `.css` / `.js` | The Studio page: hero, bundle grid, detail panel |
| `create-bundle.html` / `.css` / `.js` | The create page: form, how-it-works, selection matrix, artifact picker |

Each HTML file carries its own icon sprite. The only external request is Google Fonts
(Geist + Geist Mono); if your app already loads Geist, drop the `<link>` tags.

**Load order matters.** `cogentiq.js` declares `$` and `root`; the page scripts use them
and must come after it. Both are `defer`, so document order is execution order.

---

## Layer hierarchy — house rule

Wherever the three context layers appear, they are shown **narrowest scope first:**

> **Solution › Organization › Domain**

This holds in the Studio page’s sidebar explainer, in its bundle detail panel, and in the
create page’s matrix columns. Each page declares the order once in a `LAYERS` array in its
own script and every list is rendered from it — no CSS and no markup assumes a position.
Change that array and every list follows.

---

## The icon sprite

Every icon is an exported Figma asset, inlined once at the top of `<body>` and referenced
with `<use href="#id">`. Prefixes: `ic-pp_*` platform panel, `ic-*` shared UI, `cx-*`
Context Studio, `cb-*` Create bundle.

To move it to a partial, cut the `<svg class="sprite">` block into its own file and include
it server-side at the top of `<body>`. **Do not** switch to an external
`<use href="icons.svg#id">` reference — the glyphs would stop inheriting `currentColor`,
which is how the sidebar items, rail and hero tiles get their colours.

---

## Theming

Light is the mode the frame is designed in, and the default. The header toggle stamps
`data-mode="dark"` on `<html>` and remembers the choice in `localStorage` under `cq-theme`.

All colour lives in two token blocks at the top of `cogentiq.css` — `:root` (light) and
`:root[data-mode="dark"]`; `create-bundle.css` adds a handful of its own in the same shape.
Token names match the Figma variables one-for-one, so a value
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

### Create new bundle

| Region | Selector | Notes |
|---|---|---|
| Breadcrumb | `.crumb` | Back chevron, “Context studio / Create new bundle”. |
| Form | `.cb-form` | Bundle name and description, both required. |
| How it works | `.cb-how` | Three tiles plus “Watch tutorial”. |
| Section head | `.cb-sec` | Title, description, and the “Max 1 of each type per layer” pill. |
| Matrix | `.cb-matrix`, `.cb-col`, `.cb-cell` | Four equal columns: the artifact-type spine, then one column per layer. CSS `subgrid` keeps every row on one baseline; where it is unsupported the columns fall back to their own flow. |
| Picker | `.cb-pop` | Fixed-position popover, placed in script. |
| Footer | `.cb-foot` | Live count, Cancel, Create Bundle. |

### Hero background

The frame’s gradient art is a large exported composite. It is rebuilt in CSS instead
(layered radial + linear gradients, a `radial-gradient` dot grid, and a `conic-gradient`
ray fan) so the band scales fluidly at any width. If you need pixel-exact parity with
Figma, replace `.hero`’s `background` and its `::before` / `::after` with the exported
asset — nothing else depends on them.

---

## Interactions and animations

Timings below are exact. §1 lives in `cogentiq.js`; §2–5 in `context-studio.js`;
§6 in `create-bundle.js`.

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

### 6 · Create bundle — the selection matrix

- Clicking a **Select** cell opens the artifact picker anchored under it; the cell takes the
  dashed-blue active state. Clicking the same cell again closes it.
- The popover is fixed-position: it **flips above** the cell when there is no room below and
  **shifts inward** near a viewport edge. It is repositioned on resize and on scroll
  (captured, because the scrolling element is `.cb-scroll`, not the window).
- Search filters the list. Clicking an artifact **expands its versions** — `max-height`
  measured after paint, **280ms** — and the chevron rotates 90°. One row open at a time.
- Picking a version fills the cell with the artifact name and a version pill, closes the
  popover and returns focus to the cell.
- **Max 1 of each type per layer** is enforced by the data shape: `selection[type][layer]`
  holds a single value, so picking again replaces. The **×** on a filled cell clears it.
- The footer count is live. **Create Bundle** stays disabled until there is a name, a
  description and at least one artifact.
- A required field turns red only after it has been used and left empty, so the form is
  never red before use.
- Closes on the ×, an outside click, or **Escape**; Escape returns focus to the cell.

One implementation note worth keeping: the picker’s click handler re-renders the list,
which detaches the clicked node. The document-level outside-click handler therefore checks
`e.target.isConnected` and the picker handler calls `stopPropagation()` — without both, a
click inside the popover reads as a click outside and closes it.

### 7 · Reduced motion

`@media (prefers-reduced-motion: reduce)` disables every transition and animation, and the
hero glow layer is hidden outright.

---

## Data shape — Context Studio

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

## Data shape — create bundle

`LAYERS`, `TYPES` and `CATALOG` at the top of `create-bundle.js` drive the whole matrix.
A selection is `selection[typeKey][layerKey] = { name, version }` — one artifact per cell.

```js
CATALOG.glossary = [
  { name: 'Customer Glossary', sub: 'Standard business terms and definitions',
    versions: [ { v: 'v2.1', date: 'Aug 12, 2026', latest: true },
                { v: 'v2.0', date: 'Jul 28, 2026' } ] },
];
```

Versions are newest-first; the one flagged `latest` gets the badge. `New` and
`Create Bundle` are left as empty handlers for you to wire.
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

---

## Notes on the design

1. **Active rail item.** The Figma frame shows the *brain* icon selected in the rail, which
   in the design system’s current naming is **Model Hub**. Since this is the Context page,
   Library › **Context** is marked active here instead. One line in the HTML if you want
   the Figma selection back.

2. **Artifact type copy.** The create-bundle frame labels *Data Binding* “Pre-configured
   prompt templates” and *Prompts* “Connections to data sources” — these look swapped. Both
   pages use the sensible pairing (Data Binding → connections, Prompts → templates). Worth
   confirming with the designer.

3. **Layer order vs. Figma.** The Figma matrix shows the columns as Domain, Organization,
   Solution. Per the house rule above they are rendered Solution, Organization, Domain.

---

## Browser support

Chrome, Edge, Safari and Firefox, current versions.

The hero glow and the frame’s pixel texture use `mask-image`, written with the `-webkit-`
prefix alongside the standard property. Where masks are unsupported the glow simply does
not appear; nothing else depends on it. `ResizeObserver` is feature-detected.
