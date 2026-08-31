# Monitoring v2 — a second direction

A new look and feel for the Monitoring module, built from the reference set
(analytics-report dashboards: mono eyebrow labels, hairline-divided figures,
segmented tracks, calendar heatmaps).

**The two lists lead.** Live executions and the checkpoints waiting on a human
are what an operator opens this page to act on, so they sit directly under the
figures. The failure breakdown and the heatmap are context you read after
acting, and follow.

**Standalone by design.** The rail carries the Monitor group and nothing
else — no Home, no Build/Library/Evaluate, no Marketplace pill, and no
cross-module page table in the shell script. Nothing here navigates out of
Monitoring.

**Status:** Activity is built. Usage & Performance, Cost and Adoption show a
quiet placeholder; Checkpoints and Leaderboard are not built in this
direction yet, so their rail leaves and the footer links are inert.

**Layout:** figures strip → live executions (8) + checkpoints (4) → failure
share (4) + heatmap (8).

## Build

```bash
python3 monitoring-v2/build.py
```

`src/` holds the shared parts once; each page is assembled from them into a
single self-contained HTML file. v1 kept every screen as one hand-maintained
250KB file and then needed a second script to copy a component between two of
them, because the shared parts had already drifted — hence the assembler.

| Path | What it is |
|---|---|
| `src/cq-base.css` | The published Cogentiq sheet, verbatim (`design-system/cogentiq-design-system.css` on `claude/cogentiq-combine-pages-rv39kk`). Never edit here — edit it there and re-copy. |
| `src/mv2.css` | The new page language. Composes cq- tokens; restyles no cq- component. |
| `src/mv2.js` | Data, renderers, interactions. One seeded generator feeds every figure. |
| `src/shell.js` | Profile menu + theme preference, with v1's `PAGES` map removed. |
| `src/rail.html` | Monitoring-only rail; `__RAIL_ACT_*__` slots are filled per page by `build.py`. |
| `src/monitoring.body.html` | The Activity page's markup. |
| `src/sprite*.html`, `src/avatar.txt` | Icon symbols and the header avatar. |

## What changed from v1

| v1 | v2 | Why |
|---|---|---|
| Cards with a pointer-tracking radial glow ring | Hairline card, mono eyebrow head, controls right | The references read as a report, not a console |
| 3 bordered KPI cards | One hairline-divided strip of 5 figures | Four borders to say "these are peers"; three hairlines say it quieter |
| Donut for top failing automations | Segmented track + rows with counts | Four shares this close are not readable as arcs |
| Volume chart above the lists | No volume chart; the lists lead | Removed on request — the page is for acting first, reading second |
| 7 days × 12 two-hour cells | 14 days × 24 hours, filling the card | The old grid left two thirds of the card empty, and a fortnight is where the weekly rhythm becomes visible |
| Grey glyphs on the KPI cards | The system's gradient tiles | Colour from the library rather than from choices of this page's own |
| One hue per chart | One hue per **automation**, page-wide | An automation wears the same colour in the table, the failure track and its checkpoint tile |
| Duration as a number | Number **plus** a stage strip per row | "4.2s" says how long; the strip says which stage owned it |

## Colour

Every value is a published Cogentiq token or ramp step — nothing on the page is
an interpolated or eyeballed colour. Dark is *selected*, not a flip of light:
each mode picks the steps that work against its own card surface.

| Role | Dark (`#212121`) | Light (`#ffffff`) |
|---|---|---|
| Automation identity ×4 | blue-500 · orange-900 · indigo-500 · cyan-500 | blue-600 · orange-800 · indigo-600 · cyan-500 |
| Heatmap, 5 levels + neutral zero | blue-700 → blue-200 | blue-450 → blue-1000 |
| Stage strip | blue-800 → blue-300 | blue-300 → blue-800 |
| Status pills | published badge families: green, blue (+ derived red) | same |
| Gradient tiles | `cq-grad-{blue,green,orange,indigo,purple}` (+ derived cyan) | same |

**Colour follows the entity.** Each automation owns one hue and wears it
everywhere — its gradient tile in the run table, its segment in the failure
track, its 3px accent on a checkpoint tile. So "the orange one" means Lead
router on every card, and removing a series never repaints the survivors.

Green and red never appear as an automation's identity hue: they are reserved
for status, so a series can never impersonate "healthy" or "failing".

### The three places the library has no token, and what was done

The library is missing exactly three things this page needs. Each is derived in
the library's own construction rather than invented:

1. **No red badge family.** Published families are blue, indigo, green, cyan and
   light-green. The `Failed` status pill takes a red trio built the same way as
   the published pairs: darkest ramp step as ground, mid step as stroke, light
   step as ink.
2. **No cyan gradient tile.** `cq-grad-teal` is green-600 → green-500 →
   cyan-400, which reads *green* — so the automation whose identity hue is cyan
   would wear a green tile while its own failure segment stayed cyan, and a
   green identity tile would sit one column from the green `Success` pill.
   `.mv-grad-cyan` uses the published family's exact angle and three stops, from
   published cyan steps.
3. **No orange badge family or coloured-text token.** The warning tag and the
   escalating wait time take the orange ramp's own step, always with a glyph
   beside them so state never rests on colour alone.

### One contrast trade-off, made deliberately

Published `orange-900` (`#ce7012`) as 12px text on white is **3.53:1** — under
the 4.5:1 WCAG minimum for small text. Every use is paired with a clock or
alert glyph, which is the documented mitigation for warning colours, but if you
want the number to clear 4.5:1 the fix is a darker step (`#a85a10`, 5.08:1) that
the library does not currently publish. Say the word and I'll either switch to
it or take it to the Figma library as a new `orange-1000`.

Also worth knowing: the library's own `--text-coloured-*` steps are low-contrast
on a bare card in light mode (`--text-coloured-blue` is blue-500, ~2.6:1 on
white). They are picked to sit on their badge fill, which is why every use of
them here is inside a `cq-badge` or `cq-status` rather than as loose text.

## Verification

```bash
NODE_PATH=/opt/node22/lib/node_modules node script.js
# chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

Checked in both themes at 1512 / 1280 / 1024 / 860px: no `pageerror`, no
horizontal overflow anywhere, no card head or table row overflowing, and every
figure on the page derives from the same arrays — the strip, the failure
breakdown and the table's "of N today" cannot disagree.

## Gotchas found here

1. **`display: flex` beats the `hidden` attribute.** `.mv-empty` painted
   under the Activity pane until an explicit `[hidden] { display: none }`.
2. **`filter` creates a stacking context.** `.cq-page__bar` carries a
   drop-shadow, so anything opened inside it paints under later cards at any
   z-index. The bar itself has to be lifted.
3. **A card that stretches needs its body to grow**, or the footer floats
   mid-card and the bottom reads as unfinished.
4. **A gradient named for a hue may not read as that hue.** `cq-grad-teal` is
   two greens and a cyan; it reads green. Check the stops, not the name.
5. **The extracted design-system sheet is a superset of v1's inlined copy** —
   it already ships `.cq-btn--tonal-2` and a 24px `.cq-btn--s`, both of which
   v1 had to derive locally. It has no `.cq-seg__thumb`, though: this sheet
   paints the active tab directly, so no thumb-positioning code is needed.
