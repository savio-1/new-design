# Automations landing screen — implementation spec

Reference build: `reference/automations-landing.html` — open it in a browser.
It is the source of truth for anything this document leaves ambiguous. Every
number below was measured off that file, not recalled.

Reference viewport: **1440 × 820**, dark by default, `data-mode="light"` on
`<html>` for light.

---

## 1. What this screen is

One screen with **two lenses**, switched by a segmented control in the page bar:

| Lens | Contents |
|---|---|
| **Automations** | The workspace inventory — 15 automations, card or table view |
| **Marketplace** | 9 published automations to start from, cards only |

The **checkpoint queue is not on this screen.** Rows and panel steps that have
someone waiting link out to `checkpoints.html`. Don't re-add it here.

---

## 2. Frame

The shell is shared with the other module screens — build it once.

```
┌─ rail (fixed overlay) ─┬─ .cq-page__main ─────────────────────────────┐
│ 68px gutter reserved   │ ┌─ .cq-page__frame ────────────────────────┐ │
│ panel expands to 240   │ │ header 48px                              │ │
│ on hover, over content │ ├──────────┬───────────────────────────────┤ │
│                        │ │ sidebar  │ page bar 60px                 │ │
│                        │ │ 240px    ├───────────────────────────────┤ │
│                        │ │          │ content (scrolls)             │ │
│                        │ └──────────┴───────────────────────────────┘ │
└────────────────────────┴──────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Rail | `position: fixed`, `width: 68px`, `--rail-w-open: 240px` on `.is-open`. **Overlays** — the page keeps a constant 68px `padding-left`, so opening it never reflows content. |
| `.cq-page__main` | `padding: 8px 8px 8px 0` — the inset that gives the product its floating-panel look |
| `.cq-page__frame` | `border: 1px solid var(--strokes-line-3)`, `border-radius: 12px`, `overflow: hidden` |
| Header | `height: 48px`, `padding: 12px 16px`, `background: var(--backgrounds-card-bg-5)`, `border-bottom: 1px solid var(--strokes-line-3)` |
| Sidebar | `width: 240px`, `padding: 20px 12px 24px`, `background: card-bg-5`, `border-right: 1px line-3`, `overflow-y: auto` |
| Page bar | `height: 60px`, `padding: 12px 24px`, `gap: 16px`, `background: card-bg-5`, `border-bottom: 1px line-3` |
| Content | `padding: 16px 24px 24px`, `background: var(--backgrounds-page-bg-4)`, `overflow-y: auto` |

At 1440 the content column is **1122px** wide, **1074px** inside its padding.

---

## 3. Tokens and theming

`css/01-tokens.css` holds every token, twice: `:root` is dark (the product's
default), `:root[data-mode="light"]` restates only the themed values. Ramps,
type and layout constants are theme-independent and are declared once.

**Three rules that are not optional:**

1. **Never define a colour only inside a `[data-mode]` block.** Declare it in
   the base `:root` first, then override. A colour that exists only in the
   light block renders as nothing in dark.
2. **Style through tokens, never literals** — with two deliberate exceptions,
   both documented in place: the card wash (§5.2) and, if you port them, the
   canvas-thumbnail hues in the sibling screen. Both are single gradients read
   across both themes.
3. **`body` needs an explicit token background.** The host paints its own
   ground behind the page; a transparent body borrows the wrong theme.

Theme switching is `data-mode` on `<html>` plus `localStorage['cq-theme']`.
`js/shell.js` also syncs it across screens via `postMessage` — drop that half
if you only ship this one screen.

---

## 4. Sidebar — two filter dimensions

Both single-select, both with their own "all", and they **combine (AND)**.

```
All                     15     ← scope: everything
Waiting for approval     3     ← pending > 0
Running currently        2     ← status Active && lastN <= 5

TYPE
All types               15     ← type: any
Job                      6
Live                     9
```

Rows are the system's `.cq-nav-item`: `36px` tall, `padding: 0 12px`,
`border-radius: 8px`, active state `background: var(--backgrounds-table-select)`
with `border-color: var(--strokes-colour-blue)` and blue label. The count pill
on the right is `.au-side__n`.

**Counts are derived from the data at boot, never written into the markup** —
see `js/screen.js` boot block. A hardcoded count is a bug waiting to happen.

"Running currently" is not a stored field: `status === 'Active' && lastN <= 5`.

---

## 5. The automation card

`min-height: 188px` · `padding: 16px` · `border-radius: 12px` ·
`background: var(--backgrounds-card-bg-5)` · `filter: var(--shadow-card)` ·
`border: 1px solid transparent`

Grid: `repeat(auto-fill, minmax(430px, 1fr))`, `gap: 12px` → **two columns of
531px** at 1440. 430px is the width the design system's own note gives for two
columns at the standard 1076px content width.

```
┌─────────────────────────────────────────────────────────┐
│ ┌────┐                              ● Awaiting approval │  al-head
│ │ ◈  │ 36px                                             │
│ └────┘                                                  │
│                                                14px ↕   │
│ Invoice Extraction Pipeline                             │  au-card__body
│ Reads supplier invoices out of the AP inbox, pulls      │  (2-line clamp)
│ line items and totals, and posts the approved ones…     │
│                                                         │
│                                                16px ↕   │  no divider
│ ⚡ Live   finance                        (S)      ⋯     │  au-card__foot
└─────────────────────────────────────────────────────────┘
```

### 5.1 Border: transparent, not absent

There is **no stroke at rest** — the card reads off its own ground and shadow.
Keep the border in the box at `transparent` so hover and selection can use it
without the 1px shifting everything inside:

```css
.au-card              { border: 1px solid transparent; }
.au-card:hover        { border-color: var(--strokes-line-1); }
.au-card.is-selected  { border-color: var(--strokes-card-selected); }
```

### 5.2 The wash — the one thing to get right

A soft gradient blooms out of the **top-right corner** on hover, in the
automation's own hue. `opacity: 0` at rest → `1` on
`:hover`, `:focus-visible` and `.is-selected`, over `.34s ease`.

```
.al-wash   position: absolute; top: 0; right: 0
           width: 84%; height: 82%   (of the card)
           radial-gradient(120% 106% at 100% 0%, …6 stops…)
```

Two things here were bugs before they were decisions. **Don't undo either.**

**(a) Saturated stops, not pastels.** The stops are the 500-level hue and the
softness is alpha. A pastel is already most of the way to white, so fading one
over `#1b1b1b` walks it to grey and the colour disappears — the first build did
exactly that and read as brown haze in dark mode. A saturated hue at a third of
its strength reads as a pastel over white *and* as a tint over black, so one
gradient serves both grounds with no second palette.

```css
:root                   { --al-o1: .30; --al-o2: .17; }   /* light */
:root[data-mode="dark"] { --al-o1: .40; --al-o2: .22; }   /* dark  */
```

**(b) Fade to the hue at zero alpha, never to `transparent`.** `transparent`
is `rgba(0,0,0,0)`, so a stop fading to it drags the colour through black on the
way out — which over a dark ground showed as **visible bands across the
fadeout**. Hence the RGB triplets: every stop is `rgb(var(--al-1) / <alpha>)`
and the last is `rgb(var(--al-2) / 0)`, so alpha is the only thing interpolated.
Six stops ease that alpha rather than ramping it linearly.

Verified on the isolated gradient (card contents hidden, then pixel-scanned):
**largest single-pixel step anywhere in the ramp is 1–2/255** in both themes.
If you change the stops, re-check that number — a visible band shows up as a
flat run ending in a step of 4 or more.

Hues come from `WASH` in `js/screen.js`, keyed on the automation's `hue` field.
Values are space-separated RGB components (`"88 96 237"`), not hex, because
every stop is `rgb(<triplet> / <alpha>)`.

### 5.3 The mark

`36 × 36`, `border-radius: 10px`, 18px `#ic-pp_automation` glyph.

| | Rest | Hover / focus / selected |
|---|---|---|
| background | `var(--backgrounds-card-bg-4)` | `rgb(var(--al-1) / .18)` |
| border | `1px var(--strokes-line-3)` | `1px rgb(var(--al-1) / .42)` |
| icon | `var(--text-teritiary)` | `var(--al-ink)` light / `var(--al-ink-d)` dark |
| transform | — | `translateY(-1px)` |

Transitions: `background/border-color/color .28s ease`,
`transform .34s cubic-bezier(.22, .61, .36, 1)`.

The ink needs a per-theme value: the 600 level carries the mark on white, but
goes muddy on `#1b1b1b`, so dark takes the 300 instead.

### 5.4 The flag — at most one, three labels only

`22px` tall, `border-radius: 9999px`, `padding: 0 9px 0 8px`, `gap: 6px`, with a
`6px` dot. **First match wins**, so a card never wears two:

| Order | Condition | Label | Tone |
|---|---|---|---|
| 1 | `pending > 0` | `Awaiting approval` | `wait` — orange badge tokens |
| 2 | `status === 'Active' && lastN <= 5` | `Running` | `live` — green, dot pulses `2s` |
| 3 | `status === 'Paused'` | `Paused` | `off` — grey |
| — | anything else | *no flag* | |

**Most cards carry none, and that is the design.** 6 of 15 are flagged. There is
deliberately no `Active` flag: twelve of fifteen are active, so it said nothing
and competed with the flag beside it.

### 5.5 The footer row

`padding-top: 16px`, **no `border-top`**. With the type moved down here the
footer is the only row under the description, so a divider between two things
that already read as separate is a line doing nothing.

Left group (`.au-tags`, `gap: 6px`), in order:

- **`.al-type`** — `Job` or `Live` with its icon (`#i-clock` / `#i-bolt`).
  Built to `.cq-tag`'s geometry (`16px` tall, `radius-sm`, `padding: 0 6px`,
  11px mono) but `font-weight: 500` and `--text-secondary`: it is the first
  thing in the row and the only part always true.
- **Tags** — `.cq-tag` with `data-tone`. Grey at rest; they take their colour
  when the card is hovered or selected, via the system's `.cq-tint` pair. Tone
  is **fixed per tag** in `TAG_TONE` so a word never changes colour depending
  on where it lands. Counts vary on purpose: 2 cards carry two tags, 9 carry
  one, 4 carry none.

Right group: 20px `.cq-avatar` (always `--indigo-500`, **first initial only**)
then a `.cq-icon-btn--sm` ⋯ button.

**No step count and no checkpoint note on the card.** How a flow is built is the
builder's business, and whether a person stands in it is already the flag when
someone is actually waiting.

---

## 6. States and motion

| State | What changes |
|---|---|
| Rest | No border, no wash, grey mark |
| Hover | Wash to `opacity: 1`, mark lights and lifts 1px, border `line-1`, description `--text-secondary`, tags take their tones |
| `:focus-visible` | Same as hover (the card is a `role="button"`, `tabindex="0"`) |
| `.is-selected` | Same as hover, plus border `--strokes-card-selected` |

**The grid must not move.** Nothing on hover changes layout — the wash is
painted, not unfolded, and the mark's lift is a `transform`. Verified: card
tops are identical hovered and at rest. Don't switch this to a height change.

`prefers-reduced-motion: reduce` is handled globally in
`02-system.css` §16 — `.cq *` gets `animation: none !important` and
`transition-duration: .001ms !important`. That covers the wash and the pulsing
`Running` dot; you get it for free as long as `.cq` stays on the wrapper.

---

## 7. Filters in the content bar

`Tags` · `Created by` · `All time`, then the card/table toggle at the far end.

All popovers share one mechanism (`registerPop` / `togglePop` in
`js/screen.js`): **opening one closes the rest**, focus lands in the search when
there is one, and Escape closes whatever is open.

| | Tags | Created by | All time |
|---|---|---|---|
| Select | multi | multi | single |
| Search row | yes, 180px + a tonal **+ Tag** button | yes, full width | none |
| Rows | checkbox + label | checkbox + 20px avatar + name | label + tick |
| Trigger | count badge, `.has-count` when > 0 | count badge | takes the chosen label |
| On pick | stays open | stays open | closes |

Popover: `277px` wide, `border-radius: 12px`, `box-shadow: var(--shadow-pop)`,
list `max-height: 288px` with `overflow-y: auto`, rows `36px`. Empty state is
`.cq-pop__empty` — *No people match "qqq".*

The chevron **swaps glyph**, `#ic-arrowdown` ⇄ `#ic-arrowup`; it is not a CSS
rotation.

> **Gotcha.** Clicks inside a popover must `stopPropagation`, or the document's
> click-away handler closes a multi-select on the first tick and a second value
> can never be added. This was a real bug. Single-pick popovers close
> themselves, deliberately, in their own handler.

---

## 8. Table view

Same inventory, one row deep. Columns:

```css
--cq-cols: minmax(320px, 2fr) 96px 96px 118px 118px 108px;
```

| Automation | Runs 7d | Success | Last run | Status | *(actions)* |
|---|---|---|---|---|---|

Rows are `64px`. There is **no flow column** — don't add one back.

The first cell stacks the name over the **description**, one line, ellipsed at
the column edge (`.cq-truncate`) rather than cut to a character count, so the
row keeps its height whatever the sentence does. The full text goes in `title`.

`Runs 7d` and `Success` are right-aligned in both header and cell, with
`font-variant-numeric: tabular-nums`. Success is tinted green ≥ 97%, orange
< 92%. Rows with `pending > 0` get a `Review N` primary button; the rest get a
⋯ icon button.

---

## 9. Detail panel

Opens on card or row click. `.cq-panel`, `420px`, slides in over the content
(`transform .28s cubic-bezier(.4, 0, .2, 1)`).

Sections, in order: head (status pill, name, description, actions) →
**`AWAITING APPROVAL`** *(only when `pending > 0`)* → `CONFIGURATION` → `TAGS`.

**There is no flow diagram in the panel.** For an automation with runs waiting,
the `AWAITING APPROVAL` section shows a human-checkpoint block and a **Review**
CTA that links to the checkpoint queue. That replaced the full flow rail.

The panel overlays rather than insets, so **clicking past it must dismiss it** —
otherwise the right third of the screen is unreachable while it is open. The
card and row that opened it are excluded from that handler, or the same click
would close it again.

Marketplace cards open the same panel with a template-shaped head and
key/value list (Publisher, Category, Installs, Steps, Human checkpoints, Last
updated) and **Use template** as the primary action.

---

## 10. Marketplace lens

Same card, same wash, same grid. Differences:

- **No flag** — a template is neither running nor keeping anyone waiting.
- Head end carries a `.cq-badge[data-tone="grey"]` with the category.
- Footer left: type chip, publisher avatar + name, a 3px dot, `4.2k installs`.
- Footer right: a tonal **Use template** button (`data-use`), which must
  `stopPropagation` so it doesn't also open the panel.
- Sidebar becomes `All templates` + a `CATEGORY` group.
- Filters become `Sort by` (single) and `Publisher` (multi, with search).

---

## 11. Data

`data/automations.json` (15), `data/marketplace.json` (9),
`data/enums.json` (every closed set), `data/schema.md` (field-by-field).

Numbers that must reconcile — a reviewer will check these:

| | |
|---|---|
| Automations | 15 |
| With runs awaiting | 3 automations, **12 runs total** |
| Running now | 2 |
| Job / Live | 6 / 9 |
| Active / Paused / Draft | 12 / 1 / 2 |
| Cards carrying a flag | 6 of 15 |

The 12 awaiting runs are the same 12 the sidebar counts, the same 12 the
`Review N` buttons sum to, and the same 12 the panel's per-checkpoint counts add
back up to (front-loaded across each automation's checkpoints — a rounded share
per step showed the same run twice on a two-checkpoint flow).

---

## 12. Accessibility

Already in the reference; keep it.

- Cards and rows are `role="button" tabindex="0"`, with `aria-label` naming the
  automation, and respond to Enter and Space.
- `:focus-visible` gets the full hover treatment, not just an outline ring; the
  system also paints `outline: 2px solid var(--strokes-type-focus)` on `.cq`.
- The lens control is `role="tablist"` / `role="tab"` with `aria-selected`;
  panes are `role="tabpanel"`.
- Dropdown triggers carry `aria-expanded`; sidebar groups carry `aria-label`.
- The wash and the mini icons are `aria-hidden` — decorative.
- Escape closes popovers and the detail panel.
- Contrast: tag tones and flag tones are the system's published pairs, checked
  on both grounds.

---

## 13. Known deviations from the design system

Small, deliberate, documented in place in `03-screen.css`:

1. **Header is 48px**, not the 56px the Figma frame shows — every other cq
   module screen is 48 and consistency won. Easy to change if you'd rather
   match the frame.
2. **`--cq-card-min: 430px`** overrides the system's 340px 3-up default, to get
   two columns.
3. **Literal colours in the wash and the mark ink**, per §5.2 — the only place
   this screen steps outside tokens.
4. The workspace pill in the header keeps its own colour; it identifies a
   workspace, not a person, so it is not indigo like the avatars.

---

## 14. Suggested build order

1. `01-tokens.css` + `02-system.css` — the shell, the sidebar, the page bar.
   Nothing screen-specific yet.
2. Inline `assets/icons.svg` once per document.
3. The card, from §5. Get the wash right before anything else — it is the one
   novel piece and the one with the two traps.
4. The grid, the sidebar filters, and the counts derived from data.
5. The content-bar filters (§7) — reuse one popover mechanism, don't write
   three.
6. Table view, then the detail panel.
7. The marketplace lens last; it is the same card with a different footer.
