# Product illustration system

How AlmaConnect draws its product. Derived from a study of nine Calendly "Callie"
feature illustrations (2026-09-07) — the **stack, proportions and tonal discipline**
are taken from them; every colour, pattern and card is ours. Measured, not eyeballed:
frame grounds sit at L 92–95%, patterns are the same hue 3–13% darker, cards are pure
white with no shadow.

Use this when a product page, a feature section, a card or a marketing tile needs to
*show the product* rather than photograph it.

---

## 1. The stack — every illustration is these five layers, in this order

```
┌─ page ground ──────────────────────────────────────┐   --ground, 24–40px margin
│  ┌─ frame ─────────────────────────────────────┐   │   radius 28px
│  │  ground gradient  (§2)                       │   │
│  │  pattern          (§3)  tonal, behind card   │   │
│  │      ┌─ card ─────────────────┐              │   │   white, radius 24, no shadow
│  │      │   UI  (§4 grammar)      │  ◦ satellite │   │   0–2 floating tiles
│  │      └─────────────────────────┘              │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

Rules that hold across all nine references and therefore across all of ours:

1. **One hue per illustration.** The ground, the pattern, and every tinted control
   inside the card share it. A card whose button is a different hue from its ground
   is wrong.
2. **The pattern is texture, not decoration.** Same hue as the ground, 6–12% darker
   (`color-mix(in oklab, <tint> 86%, <on-colour>)`), large in scale, and partly
   occluded by the card. It never competes with the UI.
3. **The card is the hero.** 60–80% of the frame's width. Pure white. It may bleed off
   one frame edge (top, bottom or a side) — that crop is a composition move, not a
   mistake, and it is used in four of nine references.
4. **No shadows on the card.** Depth comes from the card being white on a tint. The
   only permitted shadow is on a *satellite* tile, and it is soft
   (`0 12px 28px rgba(4,48,43,.10)`).
5. **Nunito Sans only inside illustrations.** Sizes stay on the ladder:
   24 title · 18/16 body · 14 meta · 12 micro. Weight 400, except 600 on card titles
   and button labels (the same controls exception the site uses).

Proportions: frame radius **28**, card radius **24**, inner controls **12–16**,
pills **9999**, satellite tiles **16**. Card padding **32–40**. Frame aspect between
4:3 and 1:1; a card never fills more than ~78% of the frame height.

---

## 2. Ground gradients

All built from design-system tokens. Fourteen grounds in four families. Use the
**tonal singles** for most cards; reach for a blend when the section needs a mood
change or sits next to another tonal card of the same hue.

### Tonal singles — one tint, pattern 8% darker (references r1–r4)

| Name | Ground | Pattern (computed) | Controls inside card |
|---|---|---|---|
| `g-aqua`  | `--tint-aqua`  #E0F7F4 | aqua −8% L  | tint fill + `--on-aqua` text  |
| `g-lilac` | `--tint-lilac` #F5EDFD | lilac −8% L | tint fill + `--on-lilac` text |
| `g-sky`   | `--tint-sky`   #EBF4FD | sky −8% L   | tint fill + `--on-sky` text   |
| `g-peach` | `--tint-peach` #FCE9DC | peach −8% L | tint fill + `--on-peach` text |
| `g-mint`  | `--tint-mint`  #E5F6F0 | mint −8% L  | tint fill + `--on-mint` text  |
| `g-sand`  | `--tint-sand`  #FDF4E3 | sand −8% L  | tint fill + `--on-sand` text  |

### Rises — white at the top, hue arriving at the bottom (references r5, r6)

The card usually bleeds off the **bottom** edge on these, so the hue reads as the
ground the UI is standing in.

| Name | Stops (top → bottom) |
|---|---|
| `g-rise-aqua`  | #FFFFFF 0% → #FFFFFF 38% → #E0F7F4 70% → #7FE8DE 100% |
| `g-rise-peach` | #FFFFFF 0% → #FFFFFF 38% → #FCE9DC 70% → #F7BF95 100% |
| `g-rise-lilac` | #FFFFFF 0% → #FFFFFF 38% → #F5EDFD 70% → #CDB1F2 100% |
| `g-rise-dawn`  | #FFFFFF 0% → #FFFFFF 35% → #FCE9DC 62% → #E5F6F0 100%, with a peach bloom lower-left and a mint bloom lower-right |

### Blends — the full frame, running into a deep end (references r8, r9)

These carry the brand's own arc: cool and light at the top, AlmaConnect teal
deepening at the bottom. Cards on a blend are often **layered pairs**.

| Name | Stops (top → bottom) | Note |
|---|---|---|
| `g-tide`   | #EBF4FD 0% → #E5F6F0 32% → #7FE8DE 62% → #00A396 84% → #10261E 100% | the house blend — sky into our teal |
| `g-dusk`   | #F5EDFD 0% → #FCE9DC 48% → #FDF4E3 100% | warm, for people-led cards |
| `g-aurora` | 165deg #CDB1F2 → #9EC9F5 → #E0F7F4, with three blurred blooms (lilac / sky / aqua) | the closing band's cousin, lighter |

### Deep — for a dark illustration (one per page at most)

| Name | Stops | Card treatment |
|---|---|---|
| `g-deep` | #1B3A2E 0% → #10261E 60% → #050C0A 100% | card stays white; pattern is white at 10% |

Never put a flat gradient *behind text inside the card*. Gradients are grounds, and
the one exception is a primary button taking a two-stop gradient of the ground hue
(reference r8's "Send Email").

---

## 3. Patterns — six, all ours

Each is tonal to its ground (§1 rule 2), drawn at a scale where it reads as texture,
and sits **behind** the card. They carry meaning from the product, which is what makes
them AlmaConnect's rather than generic:

| Pattern | Drawn as | Means | Best for |
|---|---|---|---|
| **Lattice**       | hexagon outline grid, 28px cells — the logo mark's geometry | the network as a structure | Network products, integrations |
| **Ties**          | small filled nodes joined by hairlines, an irregular graph | people connected to people | Directory, mentorship, referrals |
| **Rings**         | concentric arcs from one corner, stroke only | signal, search, reach | News tracker, Data Mine finds |
| **Ledger**        | horizontal rules of varying length, a dot at each start | records, rows, a database | Data Mine, CRM sync, enrichment |
| **Constellation** | filled circles of 3–4 sizes, loosely scattered | a population of alumni | Stats, segments, cohorts |
| **Chevrons**      | repeated › in a diagonal band | the Find → Verify → Alert → Reconnect arc | Workflow, rules, automation |

Pattern placement: anchored to one or two frame edges (left/right in r2, r3; top-left
in r4; bottom in r7), never centred behind the card where it would be fully hidden.
Density: 30–45% of the frame's visible ground carries pattern.

Not ours — do not use: barcodes, equalizer bars, triangles/herringbone. Those are the
reference's signature and would read as theirs.

---

## 4. Card grammar — atoms, molecules, archetypes

The point of a grammar is that **new cards can be composed** without inventing new
parts. A card is one archetype, or two to four molecules stacked, on one hue.

### Atoms

| Atom | Spec |
|---|---|
| Avatar | circle, 32–56px, our `av*.jpg` crops; 2px white ring when overlapping |
| Title | Nunito 24/600 ink |
| Body | Nunito 18 or 16/400 ink |
| Meta | Nunito 14/400 `--ink-65` |
| Micro | Nunito 12/400 `--ink-45` |
| Skeleton line | pill, 10–12px tall, `--panel` or hue tint at 60%; widths vary 45–95% |
| Chip | pill, 30px, hairline border, 14px, optional × or avatar; hue-tint fill when active |
| Count badge | 22px circle, hue tint, on-colour 12px numeral |
| Pill button (secondary) | pill, 44–48px, hue tint fill, on-colour 16/600 label |
| Primary button | radius 12, 48px, hue 2-stop gradient (saturated → lift), white or ink label per contrast |
| Icon tile | 32px, radius 10, hue tint, on-colour glyph |
| Toggle | 44×26 pill, `--panel` off / hue saturated on |
| Stepper / dropdown | 44px, hairline border, radius 12, chevron `--ink-45` |
| Tick | 22px circle, `--tint-mint` + `--on-mint` check |
| Accent bar | 3px vertical, hue saturated, beside a list |
| Gradient-tipped bar | skeleton line whose last 18% is a bright 2-stop gradient of the hue |
| Time slot | pill, 56px tall, hue tint; selected = hue saturated + white label |
| Calendar cell | 44px circle, hue tint; selected = saturated; muted dates `--ink-45` |
| Satellite tile | 56–72px white rounded square (16), one logo/glyph, soft shadow |
| Input bar | pill, 56px, white, hairline, leading glyph + placeholder `--ink-45` + trailing send |

### Molecules

- **Header** — avatar · name (18/600) · meta line, optional chip
- **Step list** — 3 icon tiles joined by a 2px tint line, 16px labels
- **Field row** — 14px label · control (stepper / toggle / dropdown)
- **Skeleton section** — 16/600 heading · accent bar · 4–5 skeleton lines
- **Action row** — one primary + optional secondary
- **Chip row** — To/CC style labels with chips
- **Suggestion stack** — 2–3 tint pills with 16px prompts
- **Slot column** — day/date heading · 3 time slots, one selected
- **Media block** — photo, radius 16, optional name tag pill top-left

### Archetypes

From the references, re-skinned:

| # | Archetype | Built from | Ref |
|---|---|---|---|
| A1 | **Composer** | header · body text · primary button | r2, r8 |
| A2 | **Picker** | calendar grid ‖ slot column | r1 |
| A3 | **Settings** | title · 2–3 field rows · list with avatar initials | r7 |
| A4 | **Recap** | media block ‖ 2 skeleton sections with count badge | r3, r9 |
| A5 | **Form** | 2 inputs · label + dropdown, card bleeding off top | r4 |
| A6 | **Assistant** | title + sparkle · suggestion stack · input bar bleeding off bottom | r5 |
| A7 | **Chip email** | chip rows · rule · body · 2 satellite tiles | r6 |
| A8 | **Layered pair** | media card behind · detail card in front, offset 32px | r9 |

AlmaConnect-native — the products need these and the references don't have them:

| # | Archetype | Built from |
|---|---|---|
| A9  | **Alert feed** | 3 stacked alert rows: avatar · "named CFO" · source + time · tick; newest on top, older receding |
| A10 | **Record match** | two columns of chips tied by hairlines: what was found → the CRM field it writes; confidence bar |
| A11 | **Directory** | avatar rows · name · role/class-year meta · filter chips above; table bleeds off one side |
| A12 | **Rule builder** | "If [chip] then [chip]" line · the list it feeds as a tilted satellite chip mid-drag |
| A13 | **Stat tile** | Geist-free: 64px numeral is the one place display type is allowed · 14px label · gradient-tipped bar |
| A14 | **Timeline** | one person: avatar header · vertical ledger of dated events with icon tiles |
| A15 | **Search** | input bar · results dropdown with 3 avatar rows, first highlighted |
| A16 | **Toast stack** | 3 small notification cards fanned at −3°/0°/+3°, top one sharp |

### Generating a new card

1. Pick the **hue** from the product or the section rhythm. Everything follows it.
2. Pick a **ground family** (§2): tonal by default; rise if the card should stand in
   the colour; blend for a layered pair or a mood shift; deep at most once a page.
3. Pick the **pattern** (§3) by meaning, not by look. Anchor it to an edge.
4. Pick an **archetype**, or compose 2–4 molecules. Header + one content molecule +
   one action molecule is the reliable shape.
5. Decide the **crop**: does the card bleed an edge? (Yes for A5, A6, A11; optional
   elsewhere.) Add 0–2 satellites only if the story needs an external system in it.
6. Check the card against §1: one hue, pattern tonal, white card, no shadow, Nunito
   only, ladder sizes only.

If a card needs a colour that is not the ground's hue to make sense, the ground hue
was chosen wrong — change the ground, not the rule.

---

## 5. What is deliberately not adopted

- The reference's page ground `#FCFBF8` — ours is `--ground` #F2EFEA.
- Its typeface (Inter) — Nunito Sans throughout illustrations, per the client.
- Barcode / equalizer / triangle patterns — theirs.
- Its drop shadows on satellite tiles are kept *only* on satellites, never on the card.
- Its purple→blue button gradient — ours is always a two-stop of the ground hue.

---

## 6. Implementation traps

- **`currentColor` inside a shared `<pattern>` resolves where the def lives, not where
  it is used.** A `<defs>` svg at the top of the page inherits `body`'s ink, so every
  tile filled from it painted its pattern in ink — measured Δ−82% L on a sand ground
  instead of the intended −8%. Put the `<pattern>` inside the tile's own `<svg>` so it
  inherits that tile's `color`. Shapes drawn directly in the tile's svg never had the
  problem.
- **Verify the tonal offset from rendered pixels**, not computed styles. Chrome
  serialises `color-mix()` results as `oklab(0.93 …)`; a parser expecting `rgb()` reads
  those 0–1 components as near-black and reports a −92% offset that isn't there.
