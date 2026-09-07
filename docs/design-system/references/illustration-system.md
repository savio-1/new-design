# Product illustration system

How AlmaConnect draws its product. Derived from a study of nine Calendly "Callie"
feature illustrations (2026-09-07). The **construction** is taken from them — a person
in a white card, on a gradient ground, with UI kept to a hint; every colour, ground,
person and card here is ours.

What carries these, in order: **the person**, **the ground**, **the UI**. A card
without a face in it is the exception and needs a reason.

The rendered vocabulary — 22 grounds, 4 glass treatments, 6 compositions — is
`illustration-system.html` in the website repo's `dist/`.

---

## 1. The stack

```
page ground  --ground, 24–40px margin (or the frame is full-bleed)
└ frame      radius 28, one of the 22 grounds (§2)
  └ card(s)  radius 24, solid / frost / rim (§3), 60–80% of the frame, may bleed one edge
    └ person avatar 84–96px or a photo tile taking a third of the card
    └ UI     one title · one meta line · skeleton lines · at most one button
  └ satellites  0–2 glass tiles carrying a system logo or glyph
```

Rules measured from the references and adopted:

1. **A person is the largest thing in the card.** Avatar 84–96px, or a photo tile
   (radius 16) that takes a third of the card. Bright, daylit, smiling — the reference
   mood. Our p7, p11, p6, p9, p10, p1 fit; the moodier portraits do not.
2. **One hue per illustration.** Ground, tinted controls, accent bar and the button's
   gradient all share it.
3. **UI is a hint, never a screen.** Title (24/600), meta (14, `--ink-65`), skeleton
   lines for anything longer, one button. If the card needs a second button it is
   two cards.
4. **White card, no shadow** — except on satellites, and softly. Depth is white on tint,
   or glass on gradient.
5. **The card may bleed one edge.** Rises and glass splits crop the card; tonal singles
   usually do not. Four of nine references crop.
6. **Nunito Sans only.** 24 / 18 / 16 / 14 / 12. Weight 400; 600 on titles and buttons.

Radii: frame **28** · card **24** · photo tile **16** · controls **12** · pills
**9999** · satellite **18**. Card padding **26–32**.

---

## 2. Grounds — twenty-two, from the tokens

| Family | Names | When |
|---|---|---|
| **Tonal singles** | aqua · lilac · sky · peach · mint · sand | the default; the hue of the card's controls |
| **Rises** — white top, hue arriving below | rise-aqua · rise-peach · rise-lilac · rise-sky · rise-dawn | the card stands *in* the colour; bleed it off the bottom |
| **Vertical blends** — into a deep end | **tide** (sky → mint → teal → `--deep`, the house blend) · abyss (sky → `--on-sky` → `--deep-raised`) · ember (sand → peach → lilac → `--on-lilac`) · meadow · dusk | one per section; a rim or frost card on top |
| **Spans** — sideways | span-cool (lilac → sky → aqua) · span-warm (sand → peach → lilac) | wide frames, a card off to one side |
| **Blooms** | aurora · sea glass · blush | layered pairs; the frosted card behind picks the bloom up |
| **Deep** | deep (`--deep-raised` → `--deep` → `--night`) | at most once a page; white card |

Exact stops live in the board's CSS and in `almaconnect.css` under "illustration
grounds". Never put a gradient behind text inside the card; the one exception is a
primary button taking a two-stop gradient of the ground hue (saturated → lift).

---

## 3. Glass — four treatments

| Treatment | Recipe | Use |
|---|---|---|
| **Solid** | `#fff` | the default |
| **Frost** | `rgba(255,255,255,.72)` · `backdrop-filter: blur(20px) saturate(1.3)` · 1px `rgba(255,255,255,.75)` border | a card *behind* the hero (layered pair); a card that belongs to the ground (glass split) |
| **Rim** | white card · `border: 6px solid rgba(255,255,255,.38)` · `background-clip: padding-box` | a white card on a deep blend — the ground shows through the border |
| **Tile** | 68px · radius 18 · `rgba(255,255,255,.66)` · `blur(14px)` · `0 14px 30px rgba(4,48,43,.10)` | satellites: a system logo, a glyph |

`background-clip: padding-box` is what makes the rim work — without it the white
fill paints under the translucent border and the border reads as solid.

---

## 4. Compositions — the six constructions, and how to make more

Each is one reference's construction rebuilt on our system. New illustrations pick one
and change the person, the product moment, and the ground.

| # | Construction | Ground | Card | Person | UI hint | From |
|---|---|---|---|---|---|---|
| A | **Composer** | a rise, card bleeds bottom | solid | 84px avatar + name | Cc chip · 3 skeleton lines · one line of body · gradient button | r8 |
| B | **Recap** | tonal | solid | two photo tiles stacked left | title · two headed skeleton sections with accent bar · count badge | r3 |
| C | **Layered pair** | a bloom | frost behind, solid in front, offset ~34% | photo tile with a name tag, in the frost card | title · meta with a coloured name · gradient-tipped bars | r9 |
| D | **Glass split** | tonal | solid bleeding top, frost below, joined by a 6px white connector | 88px avatar centred in the frost card | two inputs · one labelled dropdown · one word under the avatar | r4 |
| E | **Rim settings** | a deep blend | rim | 36px avatars in three rows | 28px title · stepper · dropdown + toggle · avatar rows with right-aligned meta | r7 |
| F | **Chip email** | rise-dawn | frost, bleeds bottom | avatar inside a To: chip | To/Cc chips with × · hairline · two lines of body · two satellite tiles overlapping the card edge | r6 |

### Generating a new one

1. **Product moment first.** What does the person get? (An alert routed to them. A match
   found. A mentor surfaced.) One sentence — that becomes the body line.
2. **Pick the person.** Bright, smiling, daylit. The avatar or tile is placed before any UI.
3. **Pick the hue** from the product or the section rhythm. Everything else follows it.
4. **Pick the construction** (A–F) that fits the moment: one person speaking → A or F;
   two people → B; a person and a result → C or D; a person in a list → E.
5. **Pick the ground family** the construction wants: A/F a rise, B/D tonal, C a bloom,
   E a deep blend.
6. **Add UI until the feature is named, then stop.** Title, meta, skeletons, one button.
7. Check against §1. If the card needs a second hue, a second button, or a screenful of
   UI, split it into two illustrations.

---

## 5. What is deliberately not adopted

- Abstract background patterns (bars, triangles, waveforms). Tried, rejected — they
  read as decoration and cost the person the frame. The ground carries the mood alone.
- The reference's typeface (Inter) — Nunito Sans throughout.
- Its page ground `#FCFBF8` — ours is `--ground` #F2EFEA.
- Its purple→blue button gradient — ours is always a two-stop of the ground hue.

---

## 6. Implementation traps

- **Grid items default to `min-height: auto`.** A photo column set to `1fr 1fr` grew to
  its images' intrinsic height and overflowed the card, clipping the lower portrait.
  Use `minmax(0, 1fr)` rows and `min-height: 0` on the images.
- **A fixed-height card clips its last row silently.** Three avatar rows under a title
  and two field rows need ~330px; give the card the room or drop a row — don't let
  `overflow: hidden` decide.
- **`background-clip: padding-box` is not optional on the rim.** Without it the white
  fill extends under the translucent border and the rim reads solid.
- **Portraits are inlined as base64.** The artifact host blocks asset requests; a
  520px-tall JPEG at q80 is 40–80KB, a 112px face crop ~3KB.
