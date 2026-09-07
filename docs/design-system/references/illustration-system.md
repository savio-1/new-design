# Product illustration system

How AlmaConnect draws its product. Derived from a study of twenty-five Calendly
"Callie" feature illustrations (2026-09-07, two sets). The **construction** is taken
from them — a person, a gradient ground, and UI kept to a hint; every colour, ground,
person and card here is ours.

What carries these, in order: **the person**, **the ground**, **the UI**. A card
without a face in it is the exception and needs a reason.

The rendered vocabulary — 28 grounds, 5 glass treatments, 19 compositions — is
`illustration-system.html` in the website repo's `dist/`, built by
`scripts/build-illustration-board.py`.

---

## 1. The stack

```
page ground  --ground, 24–40px margin (or the frame is full-bleed)
└ frame      radius 28, one of the 28 grounds (§2), always grained (§2.1)
  └ card(s)  radius 24, solid / frost / rim / halo (§3), 60–80% of the frame,
             may bleed one edge — or a shell, device or rim frame instead (§4)
    └ person avatar 84–96px, a photo tile taking a third of the card,
             or an arch portrait breaking the frame's top edge
    └ UI     one title · one meta line · skeleton lines · at most one button
  └ satellites  0–2 glass tiles carrying a mark or glyph
```

Rules measured from the references and adopted:

1. **A person is the largest thing in the card.** Bright, daylit, smiling. Our p6,
   p7, p11, p9, p10, p1, p2 fit; the moodier portraits do not.
2. **One hue per illustration.** Ground, tinted controls, accent bar and the button's
   gradient all share it.
3. **UI is a hint, never a screen** — except the shell and device, which crop the real
   product at two edges rather than shrink it.
4. **White card, no shadow** — except satellites, devices and the halo.
5. **The card may bleed one edge.** Rises, glass splits, shells and devices crop;
   tonal singles usually do not.
6. **Nunito Sans only.** 24 / 21 / 18 / 16 / 14 / 12. Weight 400; 600 on titles,
   banner words and buttons.

Radii: frame **28** · card **24** · photo tile **16** · controls **12** · device **40**
· rim frame **34** · pills **9999** · satellite **18**. Card padding **20–32**.

---

## 2. Grounds — twenty-eight, from the tokens

| Family | Names | When |
|---|---|---|
| **Tonal singles** | aqua · lilac · sky · peach · mint · sand | the default; the hue of the card's controls |
| **Rises** — white top, hue arriving below | rise-aqua · rise-peach · rise-lilac · rise-sky · rise-dawn | the card stands *in* the colour; bleed it off the bottom |
| **Vertical blends** — into a deep end | **tide** (sky → mint → teal → `--deep`, the house blend) · abyss · ember · meadow · dusk | one per section; a rim or halo card on top |
| **Spans** — sideways | span-cool (lilac → sky → aqua) · span-warm (sand → peach → lilac) | wide frames, a card off to one side |
| **Blooms** | aurora · sea glass · blush | layered pairs; the frosted card behind picks the bloom up |
| **Painterly** — several soft lights over a blend | veil · drift · opal · ridge · halo · cove | behind a person; this is what the references actually use |
| **Deep** | deep (`--deep-raised` → `--deep` → `--night`) | at most once a page; white card |

Exact stops live in the board's CSS. Never put a gradient behind text inside the card;
the one exception is a primary button taking a two-stop gradient of the ground hue.

### 2.1 Grain is not optional

Every frame carries a fractal-noise overlay at **13–16%**, `mix-blend-mode: overlay`:

```css
--grain:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
```

It is most of the difference between a CSS gradient and something that reads as artwork.

---

## 3. Glass — five treatments

| Treatment | Recipe | Use |
|---|---|---|
| **Solid** | `#fff` | the default |
| **Frost** | `rgba(255,255,255,.72)` · `backdrop-filter: blur(20px) saturate(1.3)` · 1px `rgba(255,255,255,.75)` border | a card *behind* the hero; a card that belongs to the ground |
| **Rim** | white card · `border: 6px solid rgba(255,255,255,.38)` · `background-clip: padding-box` | a white card on a deep blend |
| **Halo** | white card · `box-shadow: 0 0 0 10px rgba(255,255,255,.30), 0 18px 40px rgba(4,48,43,.12)` | a dialog or roster that needs lifting off a busy ground |
| **Tile** | 68px · radius 18 · `rgba(255,255,255,.66)` · `blur(14px)` · `0 14px 30px rgba(4,48,43,.10)` | satellites: a mark, a glyph |

`background-clip: padding-box` is what makes the rim work — without it the white fill
paints under the translucent border and the border reads as solid.

---

## 4. Compositions — nineteen constructions, and how to make more

Each is one reference's construction rebuilt on our system. New illustrations pick one
and change the person, the product moment, and the ground. A–F came from the first
reference set, G–S from the second.

| # | Construction | Ground | Carrier | Person | UI hint |
|---|---|---|---|---|---|
| A | **Composer** | a rise, bleeds bottom | solid card | 84px avatar + name | Cc chip · skeletons · one body line · gradient button |
| B | **Recap** | tonal | solid card | two photo tiles stacked left | title · headed skeleton sections · count badge |
| C | **Layered pair** | a bloom | frost behind, solid in front | photo tile with a name tag | title · meta with a coloured name · gradient-tipped bars |
| D | **Glass split** | tonal | solid bleeding top + frost below, 6px white connector | 88px avatar centred below | two inputs · one dropdown · one word |
| E | **Rim settings** | a deep blend | rim card | 36px avatars in three rows | stepper · dropdown + toggle · rows with right-aligned meta |
| F | **Chip email** | rise-dawn | frost, bleeds bottom | avatar inside a To: chip | To/Cc chips · hairline · two body lines · two satellites |
| G | **Banner, warm** | painterly (veil) | open frame, no card | arch portrait breaking the top edge | icon chip + two notched word pills |
| H | **Banner, cool** | painterly (halo) | open frame + slat band | same | same, cool hue |
| I | **App shell** | a bloom | window, crops right + bottom | — (product, not portrait) | chrome bar · title · one highlighted row · one flat row |
| J | **Device** | a rise | phone, radius 40, crops bottom | — | header · date rows · one real row · skeleton rows with coloured bars |
| K | **Hub** | painterly (drift) | none | — | centre mark tile + six glass satellites on hairline spokes |
| L | **Roster** | a blend | halo card | three 44px faces in tinted rings | title · two tabs · role pill + toggle per row |
| M | **Offset pair** | painterly (cove) | solid card + frost over its corner | — | two marks on a hairline · headline · ink button · toggle + three checks |
| N | **Screen pair** | span | 13px white rim frame | two photo tiles with name tags | one gradient pill with a waveform, crossing the frame edge |
| O | **Fan-out** | painterly (halo) | solid photo card | two photo tiles | gradient pill · dashed connectors · three glass satellites |
| P | **Dialog** | tonal | halo card | — | icon chip + title · dropdown · three checks · full-width gradient button |
| Q | **Toggle list** | a blend | halo card | — | title · meta · column heads · three glyph rows with switches |
| R | **Media recap** | span | frost clip card + solid card in front | photo tile with a name tag | scrub bar · gradient play button · summary skeletons · count badge |
| S | **Agenda + detail** | a bloom | frost list card + solid card in front | — | three timed rows, one carrying a gradient chip · detail skeletons |

### 4.1 The banner family (G, H)

The most distinctive of the second set, and the one that needs care.

- **Frame is open.** `overflow: visible` on the frame, with the ground in an inner
  `.gnd` that owns the radius, the grain and the band. Otherwise the portrait is
  clipped at the top edge.
- **Arch portrait.** Radius `999px 999px 22px 22px`, ~38% of the frame's width,
  starting ~20% above the top edge, `object-position: 50% 8%`, an inset 3px white
  ring, and a bottom fade `mask-image: linear-gradient(180deg,#000 66%,transparent)`.
  We have no cut-outs, so the arch is what makes the person read as placed rather than
  pasted — **choose portraits with plain, light backgrounds** (p6, p11).
- **Notched word pills.** A tinted icon chip and two white pills, `gap: 0`, each
  carving a shallow waist out of its facing edge:
  `mask-image: radial-gradient(5px 11px at right center, transparent 90%, #000 100%)`
  (and `left center`; both, composited `intersect`, on the middle pill). A round bite
  instead of this shallow ellipse leaves a dark blob between the pills.
- **The band** is a horizontal strip of hairlines (`--rules`) or soft slats
  (`--slats`) at 40–43% height, masked to fade at both ends. Keep it under 55% white.
  It is a rake of light, not a pattern — anything busier was rejected.

### Generating a new one

1. **Product moment first.** What does the person get? One sentence — that becomes the
   body line, or the two banner words.
2. **Pick the person.** Bright, smiling, daylit. Placed before any UI.
3. **Pick the hue** from the product or the section rhythm. Everything else follows it.
4. **Pick the construction:** one person speaking → A or F; a stated moment → G/H;
   two people → B, N or O; a person and a result → C or D; a person in a list → E or L;
   the product itself → I or J; a system reaching out → K or O; a setting → P or Q;
   a before/after pair of cards → M, R or S.
5. **Pick the ground family** the construction wants: A/F a rise, B/D/P tonal,
   C/S a bloom, E/Q a deep blend, G/H/K/M/O painterly, I a bloom, J a rise, N a span.
6. **Add UI until the feature is named, then stop.**
7. Check against §1. If the card needs a second hue, a second button, or a screenful of
   UI, split it into two illustrations.

---

## 5. What is deliberately not adopted

- Abstract background patterns filling the frame (bars, triangles, waveforms). Tried,
  rejected — they read as decoration and cost the person the frame. The only survivor
  is the banner's hairline band, which sits behind the person and stays under 55% white.
- Third-party brand logos in the hub and toggle lists. The references use Salesforce,
  Zoom and Teams marks; ours use neutral line glyphs until real press-kit assets and
  permission exist.
- The reference's typeface (Inter) — Nunito Sans throughout.
- Its page ground `#FCFBF8` — ours is `--ground` #F2EFEA.
- Its purple→blue button gradient — ours is always a two-stop of the ground hue.

---

## 6. Implementation traps

- **Grid items default to `min-height: auto`.** A photo column set to `1fr 1fr`, or a
  two-up photo row inside a fixed-height card, grows to the images' intrinsic height
  and overflows. Use `minmax(0, 1fr)` rows and `min-height: 0` on the images.
- **A fixed-height card clips its last row silently.** Give the card the room or drop
  a row — don't let `overflow: hidden` decide.
- **`background-clip: padding-box` is not optional on the rim** or on the device
  border. Without it the white fill extends under the translucent border.
- **An open frame is required for anything that breaks the frame edge.** `.cf` has
  `overflow: hidden`; the arch needs the ground moved into a child.
- **A circular notch mask leaves a blob.** Use a shallow ellipse (5×11 at a 46px pill).
- **Check every name against its portrait.** Placeholder names drift onto the wrong
  face across edits; three did on this board before it was caught.
- **Portraits are inlined as base64.** The artifact host blocks asset requests; a
  520px-tall JPEG at q80 is 40–80KB, a 760px arch crop ~120KB, a 112px face crop ~3KB.
  The full board is ~580KB.
