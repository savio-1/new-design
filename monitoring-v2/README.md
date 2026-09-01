# Monitoring v2 — a second direction

A new look and feel for the Monitoring module, built from the reference set
(analytics-report dashboards: soft multi-line charts, mono eyebrow labels,
hairline-divided figures, segmented tracks).

**Minimal on purpose.** Five cards, 39 painted marks, one screen at 1512×1000.
An earlier pass had six cards, gradient tiles on thirteen elements, filled
status pills, coloured accent bars and a 336-cell heatmap; it read as busy. The
rule applied since: colour and ink where they carry data, nothing where they
only decorate.

**The two lists lead.** Live executions and the checkpoints waiting on a human
are what an operator opens this page to act on, so they sit directly under the
figures. The two visualizations follow as context.

**Standalone by design.** The rail carries the Monitor group and nothing
else — no Home, no Build/Library/Evaluate, no Marketplace pill, and no
cross-module page table in the shell script. Nothing here navigates out of
Monitoring.

**Status:** Activity is built. Usage & Performance, Cost and Adoption show a
quiet placeholder; Checkpoints and Leaderboard are not built in this
direction yet, so their rail leaves and the footer links are inert.

**Layout:** four figures (12) → live executions (8) + checkpoints (4) →
executions per hour (8) + failure share (4).

Three visualization forms, one each: a smooth multi-line with a haze wash for
the shape of the day, a segmented part-to-whole track for where the failures
sat, and a stage strip per run row for where a run's time went.

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
| 3 bordered KPI cards | One hairline-divided strip of 4 figures | Four borders to say "these are peers"; three hairlines say it quieter |
| Volume **and** error rate on one plot, two y-scales | One plot, one y axis | Two y-scales align arbitrarily, so such a chart invents a correlation. The day's error rate is a figure in the strip instead |
| Donut for top failing automations | Segmented track + rows with counts | Four shares this close are not readable as arcs |
| Stacked-area trend | Smooth multi-line with a haze wash | Identity is the job; the wash is the reference set's signature |
| Duration as a number | Number **plus** a stage strip per row | "4.2s" says how long; the strip says which stage owned it |
| Podium, heatmap, 6 cards | 5 cards | Element count was the thing that made the page feel heavy |

### What was cut, and what it would take to bring back

Each of these is a one-line change in `src/`, kept out because of element count
rather than because it was wrong:

- **Executions heatmap** (weekday or day × hour) — 168–336 cells, over a third
  of the page's marks. The single biggest lever on how busy the page feels.
- **Error-rate panel** under the chart — a second plot sharing the x axis.
- **Gradient tiles** on the figures and every run row — 13 coloured tiles.
- **Filled status pills** and **coloured accent bars** on checkpoint tiles.
- **Median duration** figure, the **per-run cost** column, and the failure
  card's two footer facts.

## Colour

Every value is a token; chart hues are ramp steps picked per mode against that
mode's own card surface. Dark is *selected*, not a flip of light. All of it was
run through the dataviz validator rather than eyeballed:

| Role | Dark (`#212121`) | Light (`#ffffff`) | Cleared |
|---|---|---|---|
| Categorical ×4 (blue → orange → indigo → cyan) | `#0d99ff #ce7012 #5860ed #00a2c2` | `#007be5 #dd7c0e #454de0 #00a2c2` | adjacent CVD ΔE 15.9 / 19.1 · normal-vision 19.7 / 23.2 · contrast pass |
| Failure share, 4 steps | `#ba3728 → #febfb4` | `#a21c10 → #fe9c8c` | monotone, ΔL .11, light-end 2.03:1 |
| Stage strip | blue ramp, 4 steps | same, reversed | — |
| Status as 12px text | green-500 / red-400 / orange-500 | green-700 / red-600 / `#a85a10` | ≥ 4.5:1 WCAG text |

Green and red never appear as categorical slots: they are reserved for status,
so a series can never impersonate "healthy" or "failing".

Colour is restricted to marks that carry data — the four chart lines, the
failure track's segments, the stage strips, and the status dots. The gradient
tiles, filled pills and accent bars from the busier pass are gone: they were
colour doing decoration, which is what made the page loud.

The failure ramp and the light-mode warning step are **derived** in their own
family (hue and chroma held, lightness stepped) because the published ramp has
no step at the spacing the ordinal gates want. Worth knowing for the library:
v1's heatmap ramp fails both the adjacency gate (`blue-450`→`500` is ΔL .041)
and the light-end contrast floor, and there is no published red badge family or
orange coloured-text token.

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
6. **The extracted design-system sheet is a superset of v1's inlined copy** —
   it already ships `.cq-btn--tonal-2` and a 24px `.cq-btn--s`, both of which
   v1 had to derive locally. It has no `.cq-seg__thumb`, though: this sheet
   paints the active tab directly, so no thumb-positioning code is needed.
