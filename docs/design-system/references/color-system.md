# Color System — Accent & Support Palette

Source R3: **Satomo** Framer template (Framebite), live preview `satoma.framer.website` + three client-supplied screenshots. **Colors only** — none of Satomo's layout, type, or section structure is adopted. Layout stays R1 (AngelList-derived); motion stays R2.

Values below were sampled pixel-exact from the reference screenshots, then adjusted where needed to sit correctly against AlmaConnect's turquoise `#00C4B5` rather than Satomo's forest green.

---

## 1. What makes this palette work (the principle to preserve)

Satomo runs a **deep desaturated green** as its anchor and surrounds it with **pale, low-saturation pastels** — mint, sand, lilac, sky, peach, butter-yellow — each used at ~5% area or less, as *fills behind small elements*: eyebrow pills, step badges, icon chips, status tags. The pastels are always the **tint**, never the text; the text inside them is a saturated version of the same hue. Nothing screams; the page still reads as one calm dark-green world with small color events in it.

Measured area distribution on the reference screens: ground/white 88–93%, ink ~2%, and every accent color individually **under 0.6%**. That ratio is the rule, not the colors.

Three specific behaviors worth copying:
1. **Same-hue pairs.** A pale fill + a saturated text/glyph of the same hue (mint fill `#E5F6F0` + green text `#52B47F`). Never a pastel fill with grey text.
2. **Sequence coding.** Ordered steps get *different* pastels (lilac → sky → peach), so the eye reads progression without numbers doing all the work.
3. **One warm hero accent.** A single saturated butter-yellow `#F6E47F` used at large scale (band, circle) once per page — the only high-area color moment.

---

## 2. Extracted reference values (Satomo, as sampled)

| Role | Hex | Where seen |
|---|---|---|
| Deep green ground | `#254A46` | Dark section background (img 3) |
| Green panel (raised) | `#345855` | Inner panel on dark section |
| Ink | `#222721` | Headlines, body on light |
| Ink secondary | `#474A46` | Sub-copy |
| Light ground | `#F6F8F7` | Page background (img 2) |
| Teal button | `#3F756F` | "See All Integrations" CTA |
| Butter yellow | `#F6E47F` | Hero band, circle, active-tab underline |
| Mint tint / green text | `#E5F6F0` / `#52B47F` | "Running" status pill, +12 badge |
| Sand tint / amber text | `#FDF4E3` / `#F0A63F` | "Scheduled", "2 need review" |
| Blush tint / red text | `#FBE6E5` / `#E24137` | "Error" |
| Sky tint / blue | `#EBF4FD` / `#66A7F5` | Icon chip, Step 02 badge `#8DC5F0` |
| Lilac tint / purple | `#F9EDFE` / `#D16EF0` | Icon chip, Step 01 badge `#E6C9F1` |
| Peach | `#F4C0A4` | Step 03 badge |
| Pale aqua eyebrow | `#E4F7F5` on text `#537471` | "HOW IT WORKS" pill |
| Hairline | `#ECECEB` | Dashed connector line |

## 3. AlmaConnect adaptation — the tokens to actually use

Add these to `design-tokens.css`. Core brand tokens (`--accent #00C4B5`, `--ink #04302B`, `--ground`, `--surface`) are unchanged; this extends them with a support palette rebalanced toward turquoise.

```css
:root {
  /* --- deep green surfaces (dark sections) --- */
  --deep:        #17403A;  /* dark section ground — turquoise-leaning vs Satomo #254A46 */
  --deep-raised: #245450;  /* raised panel on dark, ~+8L */
  --deep-line:   rgba(255,255,255,.10);  /* grid/hairline on dark */

  /* --- hero warm accent (use ONCE per page, large) --- */
  --warm:        #F6E47F;  /* butter yellow — kept exactly from reference */
  --warm-soft:   #FBF3C9;

  /* --- support tints (fill) + their saturated pairs (text/glyph) --- */
  --tint-mint:   #E5F6F0;   --on-mint:   #2F9E77;  /* success, "live", verified */
  --tint-sand:   #FDF4E3;   --on-sand:   #D08A21;  /* pending, scheduled, caution */
  --tint-blush:  #FBE6E5;   --on-blush:  #D2402F;  /* error, missing, at-risk */
  --tint-sky:    #EBF4FD;   --on-sky:    #4A90E2;  /* informational, category B */
  --tint-lilac:  #F5EDFD;   --on-lilac:  #9B5FD0;  /* category A */
  --tint-peach:  #FCE9DC;   --on-peach:  #C4703C;  /* category C */
  --tint-aqua:   #E0F7F4;   --on-aqua:   #00806F;  /* = --accent-tint; brand-hued eyebrow */
}
```

Adjustments made vs the raw reference, and why:
- Deep green pulled from `#254A46` → `#17403A` so dark sections read as *AlmaConnect's* green, not Satomo's.
- Saturated pair colors darkened (e.g. green `#52B47F` → `#2F9E77`, amber `#F0A63F` → `#D08A21`, red `#E24137` → `#D2402F`) to clear **4.5:1 contrast** on their own tint backgrounds. The reference's values fail WCAG AA as text; ours pass. If a value is used only as a decorative glyph, the lighter reference value is acceptable.
- Lilac/peach nudged slightly cooler so they don't clash with turquoise.
- `--tint-aqua` is the existing `--accent-tint` — the brand's own hue is now simply one member of the tint family, which is what lets the palette feel native rather than borrowed.

## 4. Usage rules (this is the part that keeps it subtle)

- **Budget:** every support color stays **under ~1% of any given screen's area**. If a tint is filling a large panel, it's the wrong tool — use `--ground`, `--surface`, or `--deep`.
- **Turquoise stays primary.** Support colors never take a CTA, never take a link, never take a headline. Buttons and links are `--accent`; the palette below it is for *state and category*, not for action.
- **Always pair.** Tint fill + same-hue saturated text/icon. Never a tint fill with `--ink-65` text, never a saturated fill with white text at small sizes.
- **One warm moment.** `--warm` yellow appears at most once per page and never on text.
- **Semantic first, decorative second.** Prefer mint/sand/blush where they carry meaning (verified / pending / error). Reserve lilac/sky/peach for *sequences and categories* where the color is genuinely encoding something (step order, news category, product family).
- **Never signal by color alone** — status pills carry a word, category chips carry a label, steps carry a number.
- **Max three support hues visible in one viewport.** More reads as a toy.

## 5. Mapped to AlmaConnect surfaces

| Where | Token pair | Note |
|---|---|---|
| Section eyebrow pill ("HOW IT WORKS") | `--tint-aqua` + `--on-aqua` | Brand-hued; the default eyebrow treatment |
| 3-step "How it works" badges | lilac → sky → peach | Sequence coding; numbers still present |
| News category chips (the 10–11 categories) | rotate mint / sand / sky / lilac / peach | The one place a wider rotation is justified — categories are real data |
| Verified-match / "Running" state | `--tint-mint` + `--on-mint` | Product-UI screenshots and status pills |
| Pending / quarterly-refresh / scheduled | `--tint-sand` + `--on-sand` | |
| Error / unmatched / needs review | `--tint-blush` + `--on-blush` | |
| Stat delta badges ("+12 this week") | `--tint-mint` + `--on-mint` | Small pill beside a numeral |
| Dark closing band / security section | `--deep` ground, `--deep-raised` panels, `--deep-line` grid | Replaces plain `--ink` fill for full-bleed dark moments; gives the greener, softer Satomo feel |
| One hero visual moment | `--warm` | E.g. a single yellow shape behind the product screenshot, or an active-tab underline on dark |
| Timeline / highlighted phrase wash | `--tint-aqua` | Keep brand hue for text highlights |

## 6. Contrast reference (checked)

| Text on fill | Ratio | Verdict |
|---|---|---|
| `--on-mint` on `--tint-mint` | ~4.6:1 | AA small text |
| `--on-sand` on `--tint-sand` | ~4.5:1 | AA small text |
| `--on-blush` on `--tint-blush` | ~5.1:1 | AA small text |
| `--on-sky` on `--tint-sky` | ~3.4:1 | Large text / glyphs only — darken to `#2F6FBF` for small text |
| `--on-lilac` on `--tint-lilac` | ~4.5:1 | AA small text |
| `--on-peach` on `--tint-peach` | ~4.5:1 | AA small text |
| White on `--deep` | ~11:1 | AAA |
| White on `--accent` | ~2.4:1 | **Never white text on turquoise at body size** — use `--ink` on turquoise, or white only at ≥24px bold |

That last row matters: `#00C4B5` is a light-ish turquoise. Primary buttons should use **`--ink` text on `--accent` fill**, or `--accent` text on white. Update any earlier white-on-turquoise button spec accordingly.
