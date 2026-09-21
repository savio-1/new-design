# Cogentiq · Agents — developer handoff

The Agents page and the three remote-agent registration flows, as a
working static prototype plus the specs that go with it. No build step,
no dependencies: open `index.html` in a browser.

    open index.html          # macOS
    start index.html         # Windows
    python3 -m http.server   # or serve the folder, if you prefer

Everything is vanilla HTML/CSS/JS so it can be read straight across into
whatever the app is built in. Nothing here is meant to ship as-is — it is
a specification you can run.

---

## Start here

| If you are… | Read |
| --- | --- |
| building the landing page and detail drawer | [docs/01-agents-page.md](docs/01-agents-page.md) |
| building the registration wizard | [docs/02-registration-flows.md](docs/02-registration-flows.md) |
| writing the API behind it | [docs/03-data-and-api.md](docs/03-data-and-api.md) |
| picking up the front-end code | [docs/04-implementation-notes.md](docs/04-implementation-notes.md) |
| looking for the designs | [design/](design/) and the Figma links below |

**Figma** — [Remote agent registration, dark](https://www.figma.com/design/Cq3g1NA1RzLfySk1EM2n2V/Cogentiq--Builder?node-id=3705-150833)
(9 frames, one per state, built from the published library).
**Prototype** — this folder, and the single-file copy
`Cogentiq-Agents.standalone.html` for anyone who just wants to click.

---

## What's in the box

```
index.html                  markup for the page, the drawer and all three modals
Cogentiq-Agents.standalone.html   the same thing as one self-contained file
css/
  01-tokens.css             design tokens, light and dark
  02-components.css         the shared design system (.cq-*)
  03-agents-page.css        this page's own components (.ag-*)
  04-agents-wizard.css      the registration modal's components
js/
  01-data.js                seed data + image constants — replace with API responses
  02-app.js                 all rendering and interaction
  03-theme-shell.js         theme toggle and platform-rail chrome
assets/
  marks/                    agent + orchestrator marks, 7 hues, 96px for a 40px slot
  logos/                    model-provider logos
  img/avatar.png            header avatar
design/                     rendered states, and what each one is for
docs/                       the specs listed above
```

Load order matters: the CSS files cascade in numbered order, and
`02-app.js` reads the constants `01-data.js` defines.

---

## Theming

`data-mode="light"` or `data-mode="dark"` on `<html>` switches the theme.
Nothing else is needed — every colour in the page resolves through a
token, and both themes are defined in `01-tokens.css`:

```css
:root                    { --backgrounds-page-bg-1: #121212; … }   /* dark  */
:root[data-mode="light"] { --backgrounds-page-bg-1: #ffffff; … }   /* light */
```

If you are porting this, port the tokens first and the rest follows.
`01-tokens.css` holds the shared set; `03-agents-page.css` opens with a
second `:root` block adding the few this page needs on top (the orange
and red badge families, the `--ag-well*` surfaces, `--ag-required`).
Both are token definitions — those are the two places to look for a
colour. Literal colours elsewhere are limited to `#fff` on coloured
grounds, shadow rgba, and a couple of gradients.

Token families, by what they name rather than what they look like:

| Family | Used for |
| --- | --- |
| `--backgrounds-page-bg-1..4` | page and panel grounds, back to front |
| `--backgrounds-card-bg-2..5` | card and well surfaces |
| `--backgrounds-type-*` | input and search field grounds |
| `--strokes-line-1/3`, `--strokes-card-*`, `--strokes-type-*` | borders and rules |
| `--text-primary/secondary/teritiary` | text, in descending emphasis |
| `--text-coloured-*` | accent text (blue, cyan, green, indigo, orange…) |
| `--radius-sm/md/lg` | 6 / 8 / 12px |
| `--ag-well*`, `--ag-required` | page-local surfaces and the required-field red |

`--text-teritiary` is spelled that way in the source design system. Kept
as-is so the two do not drift.

The Figma library uses the same names — `Backgrounds/Page/bg-2`,
`Text/Teritiary`, `Strokes/Card/Default` — so a value in a frame maps to
exactly one line of CSS.

### Type

Geist and Geist Mono, matching the Figma text styles one-for-one:

| CSS class | Size / line height | Weight | Used for |
| --- | --- | --- | --- |
| `.cq-subhead1-med` | 24 / 32 | 500 | page title |
| `.cq-subhead2-med` | 18 / 24 | 500 | modal titles, drawer name |
| `.cq-body1-med` · `.cq-body1-reg` | 16 / 24 | 500 · 400 | card names, preview name |
| `.cq-body2-med` · `.cq-body2-reg` | 14 / 20 | 500 · 400 | body copy, field values, buttons |
| `.cq-caption-med` · `.cq-caption-reg` | 12 / 16 | 500 · 400 | group labels, help text, meta |
| `.cq-mono` | 11 / 1 | 400 | endpoints and paths inline |
| `.ag-json__body` | 12 / 1.6 | 400 | the Agent Card JSON viewer |

The names match the Figma text styles, with one gotcha: Figma's
`Body2/Reg` is 14/20 and maps to `.cq-body2-reg`, while `.cq-body1-*` is
the 16/24 step above it.

---

## Motion

There is no animation library and no keyframe soup. Two rules cover
almost everything:

- **State changes**: `transition: <property> .15s ease` — hover borders,
  background tints, text colour, icon colour.
- **Things that rotate or scale**: `.2s cubic-bezier(.4, 0, .2, 1)` —
  dropdown chevrons (`transform: rotate(180deg)`), radio dots
  (`transform: scale(0)` → `scale(1)`).

Named exceptions, all in CSS:

| What | Where | Behaviour |
| --- | --- | --- |
| Validation spinner | `.ag-spin` | `@keyframes ag-spin`, 0.7s linear infinite — the only keyframe animation this page uses |
| Card lift on hover | `.ag-card:hover` | `translateY(-2px)` plus a two-layer shadow, with a lighter shadow in the light theme |
| Toast | `.ag-toast` | `opacity .18s` + `transform .22s cubic-bezier(.2,.8,.2,1)`, driven by two classes: `.is-open` flips `display`, then `.is-shown` on the next frame runs the transition |

Two honest gaps:

- **Modals do not animate.** `.cq-scrim.is-open` flips `display: none`
  to `flex`, so the overlay and its `backdrop-filter: blur(3px)` appear
  in one frame. A fade wants the same two-class trick the toast uses,
  since you cannot transition `display`.
- **`02-components.css` carries keyframes this page never uses** —
  `cq-flag-sheen`, `cq-coach-*`, `cq-tiq-*`, and the conic-gradient spin.
  They belong to design-system components that are not on this screen.
  Safe to drop when you port only what Agents needs.

`prefers-reduced-motion: reduce` is honoured — the card lift and the
design system's animated pieces all opt out under it. Keep that when you
add motion.

The only JS-driven timing is the fake validation delay in `takeSpec()`
(900ms) — a real implementation replaces it with the actual request.

---

## Source of truth

This folder is generated from the single-file prototype `agents.html` in
the same repository, which is what the live artifact publishes. Changes
made here will not flow back — edit the prototype and regenerate, or take
this folder as the fork point and retire the prototype.

The `docs/` and `design/` folders are written by hand and are not
regenerated; keep them with the code when you fork.
