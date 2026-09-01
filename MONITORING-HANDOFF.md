# Cogentiq Monitoring — design & build handoff

Context for continuing this work in a fresh chat. Everything below is the
**current state as built**, not a plan.

- **Repo:** `savio-1/new-design` · branch `claude/monitoring-screen-activity-lbl7sp`
- **Live artifact (all pages, one shell):** https://claude.ai/code/artifact/d8e226d8-7179-4084-b412-b8353781c334
  - deep links: `#monitoring`, `#checkpoints`, `#leaderboard`, `#index`, `#automations`, …
- **Pages built here:** `monitoring.html` (3.9k lines), `checkpoints.html` (2.6k), `leaderboard.html` (2.7k)
- **Figma source file:** key `Cq3g1NA1RzLfySk1EM2n2V` (Cogentiq · Builder)

| Node | What it is |
|---|---|
| `2973:508638` | Monitoring · Activity wireframe |
| `2965:10450` | Human Checkpoint Approvals wireframe |
| `1652:421873` | Monitoring · Adoption wireframe |
| `1652:422133` / `422136` / `422139` | The three podium column groups (1st / 2nd / 3rd) — source of the 3D geometry + gradients |
| `126:88445` | Date filter section; `126:94497` is the open dropdown (presets + calendar) |
| `190:164186` | Gradient/stroke card-hover component |

---

## 1 · How these pages are put together

Each page is a **single self-contained HTML file**. It is assembled from the
existing product shell, not written from scratch:

- Lines `1…1662` of `integrations.html` (an earlier page in the artifact) are the
  **shared stylesheet**: all design tokens plus the whole `cq-*` component
  library. Copied verbatim into every page's `<head>`, with only `<title>` and
  `<meta description>` changed.
- The **platform rail** markup (`<aside class="cq-rail" id="rail">`) is copied
  verbatim, with the `data-group="monitor"` group opened (`aria-expanded="true"`)
  and a `Monitoring` leaf added inside a `cq-rail-stack`.
- The **tail** (profile-menu CSS + "Combined product · shared shell wiring"
  script) is copied verbatim. Its `PAGES` map is the cross-page nav table and
  must list every page:
  ```js
  var PAGES = { 'home': 'index.html', 'automations': 'automations.html',
    'skills': 'skills.html', 'integrations': 'integrations.html',
    'model hub': 'model-hub.html', 'doc store': 'doc-store.html',
    'monitor': 'monitoring.html', 'monitoring': 'monitoring.html' };
  ```
  Rail buttons are matched to it by their `title` attribute, lower-cased.
- Between them sits the page's own `<style>`, its markup, and its `<script>`.

### Navigation between pages
Inside the artifact shell each page runs in an iframe, so links post a message;
standalone they just navigate:
```js
function go(url) {
  if (window.parent !== window) parent.postMessage({ cqNav: url }, '*');
  else window.location.href = url;
}
```

### The artifact bundle (deploy)
`scratchpad/build-bundle.py` builds the published wrapper. **It rebases on the
newest published snapshot** (`.../tool-results/artifact-d8e226d8-*.html`),
swaps in only `monitoring.html`, `checkpoints.html`, `leaderboard.html`, and
carries everything else through untouched. This matters: the artifact is
shared — another session added `automations.html` to it mid-project, and a
naive rebuild would have deleted that page.

Publishing rules learned the hard way:
- Publish with `url` = the artifact URL to update in place.
- A publish is **refused** if a newer version exists that you did not build on.
  Recovery: read the saved snapshot the error names, diff it against yours,
  re-apply only your delta onto it, publish again. Never force.
- The wrapper's `frame-runtime` block and `<!doctype>`/`<head>` scaffolding must
  be stripped before republishing (the build script does this).

---

## 2 · Design system essentials

Dark is the default; light is opt-in via `data-mode="light"` on `<html>`, stored
in `localStorage['cq-theme']`. Every colour comes from a token — never a literal.

**Surfaces** `--backgrounds-page-bg-1` (app ground) · `-2` (cards: `#212121` /
`#ffffff`) · `-3` (tiles, table head: `#1b1b1b` / `#f5f5f5`) · `-4` (content
ground) · `--backgrounds-card-bg-4` (hover fill) · `-bg-5` (header/sidebar —
**`#ffffff` in light, i.e. identical to a card**, which is why nested tiles use
`page-bg-3` instead).

**Text** `--text-primary` · `--text-secondary` · `--text-teritiary` *(sic —
that spelling is the token name)* · `--text-coloured-{blue,green,indigo,cyan,light-green}`
· `--text-button-{white,tonal-1,tonal-2}`.

**Strokes** `--strokes-line-1` (stronger) · `--strokes-line-3` (hairline) ·
`--strokes-card-default` · `--strokes-colour-{blue,green,cyan,indigo,…}`.

**Badges** `--backgrounds-badge-{blue,green,cyan,indigo,light-green}` paired with
`--strokes-colour-*` and `--text-coloured-*`. **Red and orange families are not
published** — they are derived per page in the same key (see §8).

**Type utilities** `cq-subhead1-med` (24/32) · `cq-subhead2-med` (18/24) ·
`cq-body1-med` (16/24) · `cq-body2-med|reg` (14/20) · `cq-caption-med|reg` (12/16).
Fonts: `--font-geist`, `--font-geist-mono` (all figures use the mono face +
`font-variant-numeric: tabular-nums`).

**Components used** `cq-page__{rail,main,frame,header,body,col,bar,content}` ·
`cq-table` + `cq-thead` + `cq-row` + `cq-cell` (set `--cq-cols` per table) ·
`cq-seg` + `cq-seg__thumb` (tabs; keep synced with `cqSegSync()`) ·
`cq-btn--{primary,tonal,tonal-2,ghost,sm,xs}` · `cq-status` + `cq-status--dot` ·
`cq-badge` · `cq-tag--model` · `cq-avatar` · `cq-dropdown` + `cq-pop` +
`cq-option` · `cq-search` · `cq-icon-btn` · `cq-scroll-y` · `cq-truncate`.

**Additions made by this work** (kept in the page-local stylesheet, candidates
for promotion into the shared sheet):
- `.cq-btn--tonal-2` — the published `--text-button-tonal-2` had no ground; it is
  derived as `--backgrounds-button-tonal-2: #424242 / #eeeeee`.
- `.cq-btn--xs` — 24px row-level button.
- `.cq-badge[data-tone="red|orange|grey"]`, `.cq-status[data-tone="blue|red|orange"]`.

---

## 3 · Page inventory

### `monitoring.html`
Header (module name + account controls) → `cq-page__bar` with the tab segment
and, on the right, either the refresh note (`#barNote`, Activity) or the filters
(`#barFilters`, Adoption) → `cq-page__content` holding one pane per tab.

Tabs: **Activity · Usage & Performance · Cost · Adoption** (`#monTabs`,
`data-tab="activity|usage|cost|adoption"`). Activity carries a pulsing live dot
(`.mon-tab-live`). Routing lives in `showTab(tab, label)`:
Activity → `#monActivity`, Adoption → `#monAdoption`, anything else → the quiet
placeholder `#monEmpty` titled from the button's text. **Charts are drawn on the
way in**, because a hidden pane has no width to size an SVG against.

**Activity pane** (`#monActivity`, 12-col grid):
- 3 KPI cards (`.mon-stat`, span 4) — Executions today 1,847 / Error rate 2.3% /
  Today's cost $127.40, with `#i-dollar`.
- Live Automation Executions (`.mon-live`, span 8) — `cq-table`, cols
  `minmax(220px,1fr) 92px 130px 76px 110px 96px`, 6 rows from `LIVE[]`. Status:
  Success → `#i-check`, Failed → `#i-alert`, Running → a 6px pulsing dot.
  Row action is `cq-btn--xs cq-btn--tonal-2`. Automation glyphs are bare
  (no tile), each in its own `--text-coloured-*` hue.
- Human Checkpoint Approvals (`.mon-approvals`, span 4) — 3 tiles from
  `APPROVALS[]` on `page-bg-3` with a hover shadow; `#ckViewAll` → `checkpoints.html`.
- Top Failing Automations (`.mon-donut`, span 5) — SVG ring, centred with its
  legend rows below; hovering a row or an arc cross-highlights both.
- Execution Volume & Error Rate (`.mon-volume`, span 7) — `drawVolume()`.
- Executions Heatmap (`.mon-heat`, span 12) — 7 days × 12 two-hour columns,
  levels 0–5, `HEAT_VAL` gives the tooltip midpoint.

**Adoption pane** (`#monAdoption`):
- 2 KPI cards (`.mon-kpi`, span 3): Automations 210 and Assistants 97, each with
  an inline sparkline **to the right of the figure**; then "Agents & other
  artifacts" (`.mon-others`, span 6) carrying five counts — Agents 186, Tools 41,
  Context 14, Skills 240, Guardrails 31 — on `repeat(5, minmax(0,1fr))`.
- Artifact creation trend (`.mon-trend`, span 6) — stacked area, 18 points
  (3/month, Jan–Jun), `drawSeriesChart('trendPlot', …)`.
- DAU / MAU (`.mon-dau`, span 6) — MAU 415→540 as the envelope, DAU 150→248 inside.
- Artifact reuse (`.mon-reuse`, span 12) — one row per library (Tools,
  Guardrails, Agents, Skills, Models) from `REUSE[]`. **Track = that library's
  size, fill = how much of it is reused**, both scaled by the largest library
  (`REUSE_MAX`); the label reads "171 of 240 reused · 71%". One hue for every bar
  (`--viz-success`) because it is one measure — the leading icon carries the
  type's identity. Bars fill in on tab entry (`playReuse()`, 60ms stagger).
  Clicking a row opens the drill-down panel; clicking it again closes.
- Top creators (`.mon-creators`, span 12) — podium left, leaderboard right.
  The cross-workspace link sits **in the card head row** (`#boardAll`), so
  nothing occupies the strip above the table (head→table 16px vs 17px below).
  Board rows scroll inside `max-height: 264px`.

### `checkpoints.html` — Human Checkpoint Approvals
Breadcrumb header (`#crumbBack` → monitoring) · page head · 4 stat cards
(47 / 12 / 28 / 7, each with a status-hued icon, no "Active" tags) · toolbar
(search, All/Awaiting/Approved/Rejected pills, Sort by, date-range button) ·
`cq-table` of 47 rows, **10 per page** with a pager. Awaiting rows show an
orange wait time + primary **Review**; others get **View output** (`tonal-2`).
The Awaiting pill's dot is 6px (Approved/Rejected wear glyphs).

### `leaderboard.html` — across all workspaces
Breadcrumb (Monitoring › Adoption › Leaderboard) · page head with 3 stats
(50 builders / 6 workspaces / 6,317 artifacts) · **podium card** for the top 3 ·
toolbar (search, workspace filter, sort) · `cq-table` of 50 builders,
**20 per page** with a pager, cols
`76px minmax(180px,1.4fr) 150px 130px minmax(200px,1fr) 110px`.
`PEOPLE[]` is generated from `NAMES[]` with **strictly descending** totals
(412 down, `STEPS = [0,75,69]` for the top three) — rank comes from array
position, so totals must never disagree with it.
The podium card's ground is lit rather than flat: a blue wash rising from the
floor plus indigo/cyan over each shoulder, at `z-index:-1` inside the card, with
per-theme mix percentages (`--wash-floor/-side/--floor-line`).

---

## 4 · The podium component (most-iterated piece)

Defined once in `monitoring.html`; `scratchpad/build-lb.py` **extracts** the CSS
block and the JS (`CAP_*`, the builder IIFE, `scalePodium`, `playPodium`) into
`leaderboard.html` at build time, so the two cannot drift. Editing the podium
means editing `monitoring.html` then re-running `build-lb.py`.

Geometry, taken from the Figma export verbatim:
- **Cap** = the exported rounded-rhombus path (`CAP_PATH`), rendered as inline
  SVG with `viewBox = CAP_BOX {x:-1.5, y:-1.5, w:147.06, h:72.24}` and
  `preserveAspectRatio="none"`. Height follows width via
  `CAP_RATIO = 72.24/147.06 ≈ 0.4913`, so it never skews as a column grows.
- Cap is absolutely positioned at `top: calc(var(--cap-h) / -2)`; the column
  carries `margin-top: calc(var(--cap-h) / 2)` to reserve that overhang.
- **Front face** is clipped to the cap's lower edges:
  `clip-path: polygon(0 0, 50% calc(var(--v) - .5px), 100% 0, 100% 100%, 0 100%)`
  where `--v = 0.4876 × cap-h`.
- **Gradients** are ramp steps from the same export — rank 1 blue 600/500/300,
  rank 2 indigo 500/400/300, rank 3 cyan 500/400/300 — but all three now share
  **one fade shape** (`0% → 45% @52% → 16% @100%`). The export fades each column
  at a different fraction (73/75/100%) because there they run off the card edge;
  copying that made the feet *look* uneven even though the elements were
  bottom-aligned.
- **Labels sit on the flat top face**, not the front: `.mon-pod__label` is
  positioned on the cap (`translateY(-46%)`, `z-index: 2`) with the orange
  gradient pill (16px avatar + 11px name) and an 11px count under it. The face
  is only full-width along its own midline and tapers fast, hence the compact
  sizes and the straddling offset.
- Name pill gradient = the system's orange:
  `linear-gradient(225.24deg, orange-800 8.84%, orange-600 54.42%, orange-300 100%)`.
- Avatars everywhere use a **single first-name initial** (`initial(name)`).

Animation: columns grow from the floor, staggered 2nd → 1st → 3rd
(`.04s / .16s / .28s`), then the pill (`.34s`) and count (`.52s`) fade in.
`playPodium()` adds `.no-anim` for one frame to snap back to zero before
replaying — otherwise removing `.is-in` just eases the columns *down* and the
replay is invisible. `scalePodium()` sizes `--cap-h`, `--v` and `--h` per column
from the board's height (capped at 320px) so the podium ends level with the
table; `prefers-reduced-motion` gets the final state with no transitions.

---

## 5 · Charts

All hand-drawn inline SVG, no libraries. Renderers in `monitoring.html`:
`drawVolume()` (Activity), `drawSeriesChart(hostId, cfg)` (stacked or line),
`drawSparks()`, plus the donut and heatmap builders. `monoPath(points)` produces
the shared monotone curve. Charts redraw on resize (debounced 120ms), on
`document.fonts.ready`, and when their tab is shown.

**Colour roles** (dark / light):

| Role | Token |
|---|---|
| Success / Failed (volume) | `--viz-success` blue-500/700 · `--viz-fail` red-500/600 |
| Donut slices | `--don-1..4` = red-600, blue-600, orange-900/800, purple-500 |
| Heatmap 0–5 | `--heat-0..5` blue-1100→500 / blue-200→600 |
| Trend | `--ser-automations` blue-500/700 · `--ser-agents` green-600/700 · `--ser-assistants` purple-500/600 |
| DAU / MAU | `--ser-dau` cyan-500/600 · `--ser-mau` indigo-500/600 |
| Sparkline | `--spark-up` green-500/700 · `--spark-down` orange-500/800 (by direction, not series) |
| Podium | `--pod-1..3` blue, indigo, cyan |

Rules that were validated with the dataviz skill's checker
(`node scripts/validate_palette.js "<hex,…>" --mode dark --surface "#212121"`,
and `--mode light --surface "#ffffff"`):
- **Stack order is blue → green → purple.** Blue beside purple fails CVD
  separation at these steps (ΔE 3.2 deutan in light). So Agents took green and
  Assistants purple, swapping the wireframe's colours; the legend order matches
  the stack bottom-to-top.
- **Donut order is red, blue, orange, purple** — interleaved so no confusable
  pair is adjacent in the ring.
- Line strokes are **1.5px**; stacked bands fade in their own hue via
  `objectBoundingBox` gradients (`.34 → .03`) and each band's own top line is
  the separator from the band above.
- **Legends on line charts use a line swatch** (`.mon-legend__swatch--line`,
  14×3); the donut keeps dots.
- Sparklines have no endpoint dot.
- Every chart has a crosshair + tooltip (`#monTip`, `tipShow/tipHide`), and MAU
  is drawn as the envelope around DAU (the wireframe had it inverted, which no
  active-user pair can be).

---

## 6 · Interactions

- **Card hover glow** — a masked 1.5px ring (`.mon-card::after`,
  `mask-composite: exclude`) painted with a radial spotlight
  (orange-500 → purple-450 38% → blue-450 62% → transparent 80%) whose centre
  tracks `--gx/--gy` from `pointermove`. Short cards use `--glow-r: 130px` and
  **snap `--gy` to the nearest horizontal edge**, so hovering below centre lights
  the bottom stroke; taller cards let it follow freely.
- **User picker** (`#userBtn/#userPop`) — search, "All users", then people with
  avatars, `(You)` on self, blue text + tick on the selection.
- **Date filter** (`#dateBtn/#datePop`) — from Figma `126:94497`: preset rail
  (Today, Last 1 week/1 month/3 months/6 months/1 year, rule, **Custom range** in
  blue) beside start/end fields and a live month grid. Click a start then an end;
  the band paints between (`.is-in-range`), endpoints go primary blue
  (`.is-edge`), the fields fill and the trigger label becomes e.g. "5 Aug – 17 Aug".
- **Pagination** — checkpoints 10/page, leaderboard 20/page; prev · numbers ·
  next, disabled at the ends, hidden when a filter leaves one page; filters and
  search reset to page 1.
- **Tab segment** — `cqSegSync()` positions the sliding thumb; re-run on resize
  and after webfont swap-in.
- **Reuse drill-down** (`#reusePanel`) — the system's own `.cq-panel` right
  drawer (fixed, 420px, `.is-open` slides it in). Lists that type's reused
  artifacts: name, an `N×` badge, where it is used, last used. Closes on the X,
  Escape, an outside click, or leaving the Adoption tab. The chart row it came
  from holds `.is-selected`.

---

## 7 · Verification recipe

Headless Chromium is pre-installed; Playwright is global:
```bash
NODE_PATH=/opt/node22/lib/node_modules node script.js
# chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```
Always check **both themes** (click `#themeToggle`), listen for `pageerror`, and
measure geometry with `getBoundingClientRect()` rather than eyeballing — several
bugs in this project (podium feet, scroll region, gap sizes) were only settled by
measuring. A `net::ERR_CONNECTION_RESET` console entry is just the Google Fonts
fetch failing offline; ignore it.

---

## 8 · Gotchas worth keeping

1. **The shared stylesheet only ships the ramp steps its own components use.**
   `--orange-500`, `--blue-700`, `--cyan-500`, `--green-500/700`, `--indigo-100/300`,
   the whole red family and more are absent, and an undefined var silently kills
   the whole gradient/colour. Declare the steps you need in the page's `:root`
   (values are from the same Figma export, identical in both themes).
2. **`filter` creates a stacking context.** `.cq-page__bar` carries a drop-shadow
   filter, so popovers inside it painted *under* the cards that follow in the DOM
   at any z-index. Fix: `.mon-root .cq-page__bar { position: relative; z-index: 5 }`.
3. **`repeat(4, 1fr)` is not equal columns** — `1fr` floors each track at its own
   min-content, so long labels ("Guardrails") widen their cell. Use `minmax(0, 1fr)`.
4. **`card-bg-5` is `#ffffff` in light**, identical to a card, so nested tiles
   vanish there. Nested surfaces take `page-bg-3`.
5. **`clip-path` clips descendants too** — handy for making a growing bar clip its
   own label, fatal if you need something (the cap) to paint outside it.
6. **A transition-based replay needs a reset frame.** Removing the class eases
   back from the current value; add a `.no-anim` class, commit the collapsed
   state, remove it, then re-add `.is-in` on the next frame.
7. **Padding floors a zero height.** `height: 0` with `padding-top: 18px` still
   measures 18px, so a bar can't start from nothing — put the inset on the child.
8. **Bottom-aligned is not the same as looking bottom-aligned** — see the podium
   fade in §4.
9. **Check tag balance after scripted edits.** A stray `</section></div>` once
   closed `.cq-page__content` early, so the toolbar and table fell outside the
   scroll region and the page looked half-fixed, half-scrolling.
10. **The artifact is shared.** Rebase bundles on the live snapshot (§1).

---

## 9 · Not built yet

- **Usage & Performance** and **Cost** tabs — both show the honest quiet
  placeholder. Wireframes exist in the Figma file (the Adoption frame's tab bar
  labels the third one "Cost Metrics"; the shipped label is "Cost").
- The chart cards' expand buttons (`#i-expand`) are decorative — no full-screen
  view behind them.
- Row clicks on the tables don't open detail panels yet (`cq-panel` exists in the
  system and is used by `integrations.html` if a detail sheet is wanted).
- Filters are visual only: the user picker and date range set labels but don't
  re-query the mock data.
