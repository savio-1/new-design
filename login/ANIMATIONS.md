# Showcase motion spec

Each slide plays one short sequence when it becomes the active slide. It then
holds for 2.5s and advances. All times are in ms from the moment the slide
becomes active. Positions are in the panel's 540 × 804 Figma coordinates.

Everything is CSS keyframes scoped to `.slide.is-active`, so a sequence restarts
whenever its slide returns. The only JavaScript is the typed text on slides 2
and 5 (`typeInto()`), which runs on timeouts that are cancelled on slide change.

## Motion primitives

| Name | What it does | Duration · easing | Used as |
|---|---|---|---|
| `cq-rise` | opacity 0→1, translateY 12px→0 | 600 · `cubic-bezier(.2,.8,.2,1)` | `[data-in]` with `--d` delay |
| `cq-draw` | `clip-path` reveal from the top (source) end | 500 · ease-out | `[data-draw]` on connectors |
| `cq-pop` | opacity 0→1, scale .85→1 with slight overshoot | 450 · `cubic-bezier(.3,1.4,.5,1)` | `[data-pop]` on badges, pills, checks |
| `cq-pulse` | an 8px glowing dot runs the length of a connector | 700 · ease-in-out | `.pulse` with `--d` and `--len` |
| `.swap` | crossfade between two labels at `--t` | 250 · ease | status labels |
| `cq-twinkle` | sparkle opacity 1 ↔ .25, three phase offsets | 3200 loop | every `.spk` |
| `cq-live` | status-dot opacity 1 ↔ .3 | 1600 loop | `.a-status::before` |
| Slide change | crossfade between slides | 500 · ease | `.slide` opacity |

## 1 · Workflow — "Automate your business outcomes" · length 4400

| t | Element | Motion |
|---|---|---|
| 100 | Trigger step: "New Invoice received" | rise |
| 450 | Connector 1 | draw |
| 600 | Pulse 1 (24px run) | pulse |
| 800 | Agent step: Invoice Validator, "Running…" | rise |
| 1100 | Gemini badge | pop |
| 1300 → 1900 | Task 1 "Extract invoice fields" | waiting ring → spinner → green check, "0.6s" fades in |
| 1900 → 2500 | Task 2 "Match PO #4821 and receipt" | same |
| 2500 → 3100 | Task 3 "Check payment terms" | same |
| 3250 | "Running…" → "Finished execution" | swap |
| 3400 | Connector 2 | draw |
| 3550 | Pulse 2 | pulse |
| 3800 | Result step: "Approved for payment" | rise |
| 4100 | Green check | pop |

Task text is grey until its task starts, then turns primary (`cq-ink`). The
spinner is a 16px ring, 2px `#0d99ff` with a transparent right edge,
rotating every 700ms.

## 2 · Assistant chat — "Accelerate decisions with your assistants" · length 4200

| t | Element | Motion |
|---|---|---|
| 100 | Assistant step: Revenue Insights chat window | rise |
| 500 → 1900 | "How did Q3 revenue trend by region?" typed into the input | 40ms per character, blinking caret |
| 1950 | Send button | press (scale .9, 300) |
| 2050 | Input clears back to its placeholder | — |
| 2100 | User message bubble | rise |
| 2350 → 2950 | Typing indicator (three dots bouncing 3px, 900 loop, staggered 150) | fade in → fade out |
| 3000 | Reply: "Answered from your sales data", answer text | rise |
| 3150 / 3250 / 3350 / 3450 | Bars NA / EMEA / APAC / LATAM | grow from the bottom (`scaleY` 0→1, 700) |
| 3750 / 3900 | Source badges "Q3 revenue report", "Sales ledger" | pop |
| loop | "Online" status dot | live |

## 3 · Integrations — "Connect your enterprise. Power every workflow." · length 1900

| t | Element | Motion |
|---|---|---|
| 0 | Hub | pop (600), then breathes 1 ↔ 1.07 every 3600 |
| 100 / 250 | Orbit A / Orbit B | rise |
| 390 → 1200 | Ten app tiles, 90ms apart | pop |
| loop | Each tile's logo | drifts 3px up and back every 4200, three phase offsets |

## 4 · Context — "Give your agents what your company knows" · length 2800

| t | Element | Motion |
|---|---|---|
| 0 | "Context Studio" tab | rise |
| 150 / 300 / 450 | Glossary · Ontology · Rules & policies | pop |
| 600 / 750 / 900 | Data binding · Tool binding · Prompts | pop |
| 1150 | Merge connector (three lines into one) | draw |
| 1400 | Context bundle step: "Finance close", "Bundling 6 artifacts…" | rise |
| 2000 | "Bundling 6 artifacts…" → "Ready for your assistants" | swap |
| 2150 / 2250 / 2350 | Layer badges Solution · Organization · Domain | pop |

## 5 · Marketplace — "Launch faster with ready-made agents" · length 4800

| t | Element | Motion |
|---|---|---|
| 0 | Marketplace step with search bar | rise |
| 150 | Category chips | rise |
| 450 → 1880 | "automate invoice approvals" typed into search | 55ms per character, caret stays |
| 2200 / 2350 / 2500 | Results: Invoice Validator · Invoice Processing Automator · Finance Close Assistant | rise |
| 2630 → 3410 | Cursor fades in at (470, 560) and glides to the middle row's Add | `cq-cursor`, 3400 total from 1100 |
| 3500 | Add button | press |
| 3650 | Add → "Added", button turns `#14ae5c`, row gains a 1.5px `#0d99ff` outline | crossfade · colour · ring |
| 3850 | Connector | draw |
| 4100 | "Invoice Processing Automator added ✓" | rise |
| ~4500 | Cursor | fades out |

The cursor's end point is set on the element (`--cx: 417px; --cy: 371px`) so
its tip lands on the button centre at (420, 374). If the list layout changes,
re-measure.

## Carousel timing

```
advance after = data-length + 2500
```

| Slide | Sequence | On screen |
|---|---|---|
| 1 Workflow | 4.4s | 6.9s |
| 2 Assistant chat | 4.2s | 6.7s |
| 3 Integrations | 1.9s | 4.4s |
| 4 Context | 2.8s | 5.3s |
| 5 Marketplace | 4.8s | 7.3s |

## Reduced motion

Under `prefers-reduced-motion: reduce`, all slide animations are disabled and
slides don't auto-advance. Each slide shows its end state ("Finished
execution", completed tasks, "Ready for your assistants", the typed search
query). The cursor is hidden and the slide crossfade is instant.
