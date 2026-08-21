---
name: almaconnect-design
description: Design system and section patterns for building the AlmaConnect website (almaconnect.com and news.almaconnect.com). Use whenever designing, building, or reviewing any AlmaConnect page, section, component, or Figma frame — heroes, navigation, product cards, pricing, stats, testimonials, FAQs, footers, blog/resource layouts. Derived from the AngelList reference designs (Figma file wPFGlGLF2kGdcC06My35za), adapted to AlmaConnect's brand — Geist headlines + Nunito Sans body, turquoise #00C4B5. Carries the drop-in stylesheet references/almaconnect.css (tokens, type ladder, colours, gradients, shimmer system) — start every page from it. If a section being built resembles a pattern in references/section-patterns.md, reuse that pattern's layout, spacing, and hierarchy rather than inventing a new one.
---

# AlmaConnect Design Skill

Build AlmaConnect web pages in the visual language of the AngelList reference designs: quiet, editorial, type-led, generous whitespace, hairline rules, restrained color. The reference's structure and rhythm are kept; the brand layer (font, accent color) is swapped to AlmaConnect's.

**`references/almaconnect.css` is the stylesheet — start every page from it.** It is the drop-in implementation of everything below: tokens, the ratified type ladder, buttons/pills/chips, the gradient recipes and the shimmer system, plus the JS the shimmer expects. It supersedes `references/design-tokens.css` (v1, kept only for provenance). A rendered proof of every class is in the website repo at `styleguide.html`.

**Read `references/section-patterns.md` before designing any full section** — it catalogs every studied reference section with exact layout specs. **Read `references/motion-patterns.md` before adding any animation or interactive nav** — it holds the adopted motion patterns (logo marquee, link ticker, expanding pill-nav overlay) with working CSS/JS. **Read `references/color-system.md` before using any color beyond `--accent`, `--ink`, and the grounds** — it holds the support palette and the rules that keep it subtle. `references/design-tokens.css` is the drop-in token sheet. `references/reference-index.md` tracks which references have been absorbed (this skill grows as more references are added).

## 1. Brand layer

| Token | Value | Role |
|---|---|---|
| `--accent` | **#00C4B5** | Primary turquoise. CTAs, links, eyebrow labels, active states. Replaces the reference's purple `#5A50F5`. |
| `--accent-dark` | #00A396 | Hover/pressed accent; link hover. |
| `--accent-tint` | #E0F7F4 | Pale turquoise wash — tag pills, highlighted-phrase backgrounds, icon chips. Replaces reference lavender tints. |
| `--ink` | **#04302B** | Near-black teal ink. ALL headlines and primary body text. Derived from turquoise the way the reference's `#002B31` derives from its palette. Also the fill for dark buttons and dark sections. |
| `--ink-65` | rgba(6, 48, 43, 0.65) | Secondary body text (the reference runs most paragraph text at 65% ink). |
| `--ink-45` | rgba(6, 48, 43, 0.45) | Tertiary: dates, captions, disclaimers. |
| `--ground` | **#F2EFEA** | Warm off-white page ground. Never pure white for page backgrounds. |
| `--panel` | #EDEBE4 | Recessed panel, one step under the ground. |
| `--surface` | #FFFFFF | Cards, nav bar, pricing panels — white sits *on* the cream ground. |
| `--tint-mint` | #DDF2E4 | Pale green full-bleed band (reference: "Full Service Fund Management" band). |
| `--tint-sand` | #F3EAE0 | Warm beige explainer panel background. |
| `--hairline` | rgba(153, 159, 153, 0.25) | ALL rules, borders, dividers. One hairline everywhere. |
| `--deep` | **#10261E** | The dark section ground — deeper than `--ink`, which is reserved for type and fills. |
| `--deep-raised` | #1B3A2E | A card sitting on the dark ground. |
| `--on-deep` | rgba(255,255,255,0.72) | Body text on the dark ground. Headlines there go full white. |
| `--warm` | **#F6E47F** | The one warm accent: chasing lights on dark grounds only. Never on light. |
| `--grad-aqua/-lilac/-sky/-peach` | — | Progress-line gradients, in the four hues the numerals shimmer in. |
| `--on-dark` | #FFFFFF / #BFF0EA | Text on `--ink` sections; #BFF0EA (pale turquoise) replaces the reference's periwinkle `#CDCBFF` for oversized display text on dark. |

Color discipline (this is what makes the reference look expensive):
- Pages are 90% ink-on-cream. Accent appears in small doses: links, one button, an eyebrow, a tag.
- Tinted bands (`--tint-mint`, `--tint-sand`, `--deep` dark) appear **at most once or twice per page**, full-bleed, to break rhythm.
- Never use pure black. **Gradients are for grounds and shimmers only** — never a flat gradient sitting behind static text, and never more than one gradient surface per viewport. The shimmer device (§4b) is the sanctioned way a gradient touches type: it sweeps and then leaves.
- **A support palette exists** (mint/sand/blush/sky/lilac/peach tints + a butter-yellow hero accent) for *state and category only* — see `references/color-system.md` before using any color that isn't `--accent`, `--ink`, or a ground. Each support hue stays under ~1% of screen area, always as a tint fill paired with its same-hue saturated text, never on CTAs, links, or headlines.
- **`#00C4B5` is light.** White text on it fails AA. Primary buttons are `--ink` on `--accent`; use white only on `--ink`/`--deep` fills or at ≥24px bold.

## 2. Typography — Geist headlines + Nunito Sans body

**Two faces.** Geist for everything that behaves like a headline; Nunito Sans for
everything else. The full rationale, provenance and spacing rhythm live in the
`almaconnect-type-spacing` skill — that skill wins on any type question. What follows
is the ratified ladder as implemented in `references/almaconnect.css`.

| Role | Face | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|---|
| Display / H1 | Geist | **88px** `clamp(52px, 6.1vw, 88px)` | 350 | **−4%** | 0.95 |
| Stat numeral | Geist | **64px** `clamp(40px, 4.45vw, 64px)` | 350 | **−4%** | 0.95 |
| H2 — every section headline | Geist | **48px** `clamp(34px, 3.34vw, 48px)` | 350 | **−4%** | ~1.08 |
| H3 | Geist | **32px** | 350 | −3% | 1.25 |
| H4 — card titles, accordion heads | Geist | **24px** | 400 | −3% | 1.22 |
| Tabs | Geist | **16px** | 400 | −3% | 1 |
| Category pills | Geist | **14px** | 400 | −3% | 1.4 |
| Editorial lead | Nunito Sans | **24px** | 400 | −3% | 1.55 |
| Hero subtext / quotes | Nunito Sans | **20px** | 400 | −3% | 24px / 1.45 |
| Section subtext | Nunito Sans | **18px** | 400 | −3% | 1.5 |
| Body, nav, buttons | Nunito Sans | **16px** | 400 · *600 buttons · 500 nav* | −3% | 1.5 |
| Labels, roles, captions | Nunito Sans | **14px** | 400 | −3% | 1.4 |
| Micro | Nunito Sans | **12px** | 400 | −3% | 1.5 |

Two hinges carry the whole system — learn these instead of the table:

- **Tracking:** −4% at 48px and above, −3% at everything below (body included).
- **Weight:** Geist 350 at 32px and above, Geist 400 at 24px and below. Nunito Sans 400.
  A headline that drops a step at a breakpoint crosses the weight hinge with it.

The size inventory is closed. **Geist 88 / 64 / 48 / 32 / 24 / 16 / 14 · Nunito Sans
24 / 20 / 18 / 16 / 14 / 12.** Do not invent steps between them.

**Weight exceptions — the only ones.** Buttons and inline CTA links stay Nunito Sans
600, nav stays 500: they read as affordances, not prose. Logotypes are exempt from
the tracking laws and keep whatever spacing the drawn mark specifies.

**Implementing −3%:** `letter-spacing: -0.03em` on `body` alone is wrong. `em` resolves
to a pixel value at body size and then inherits as *that pixel value*, so 14px text
renders −3.4% and 18px renders −2.7%, while form controls sit at 0 (they inherit
neither font nor tracking). `almaconnect.css` re-anchors it on the elements themselves.
Keep `span`/`em`/`strong` out of that rule — they wrap a run inside a headline (the
shimmer does exactly this) and must take the parent's tracking.

Two-tone paragraph device (signature reference move): lead phrase at full `--ink`,
remainder of the sentence at `--ink-65` — `.t-twotone` in the stylesheet. Lead at
wght 600, rest at 400/65%.

## 3. Layout system

- **Canvas:** 1440px design width. **Container: 1288px** centered (**76px** side margins, dropping to 24px below 920px). Content that "hangs" text columns often uses a narrower measure inside it.
- **Grid:** 12-col mental model; the recurring physical grids are **4 × 298px cards with 32px gaps** (= 1288) and a **2-col split** (roughly 1/3 text : 2/3 visual) for explainer sections.
- **Nav height:** 72px (64px below 920px), bottom hairline, sticky; the bar goes to `--nav-solid` rgba(242,239,234,0.9) once scrolled.
- **Section vertical rhythm:** 80px standard, 120–160px for marquee sections, 40px for thin strips; hero top offset ~120px below nav. Sections butt together — padding carries all rhythm, never margins.
- **Radii:** **10px buttons** · 12px cards/images · 9999px pills, tag chips, circular icon buttons · 16px large media panels. Tokens: `--r-button` / `--r-card` / `--r-pill` / `--r-panel`.
- **Easing:** one curve everywhere — `--ease: cubic-bezier(0.22, 1, 0.36, 1)`.
- **Shadows: none.** Depth comes from hairlines, tinted panels, and layered UI-screenshot compositions — never drop shadows on cards.
- **Dividers:** hairline top+bottom borders on editorial card columns; single hairline between FAQ rows, blog list rows, timeline rows.

## 4. Component recipes

**Buttons** — `.btn` + a fill modifier in `almaconnect.css`. Label is always Nunito
Sans 16px/600 at −3%; radius is 10px (`--r-button`); no shadows, ever.
- Primary: `--ink` fill, white text, 50px height, 32px x-padding (`.btn--ink`).
- Turquoise fill: `--accent` with **ink** text (`.btn--accent`). **Never white on
  turquoise** — #00C4B5 is light and white on it fails AA. White is for `--ink`/`--deep`
  fills only.
- Secondary: 1px ink outline, ink text, 40px height (`.btn--outline`). On hover it
  inverts to ink fill *and drops to 0 radius* — a small house signature.
- Nav CTA: 44px height, 26px x-padding (`.btn--nav`).
- Text link with arrow: accent, 16px/600, inline `→` that nudges 3px right on hover
  (`.link-arrow`).

**Announcement pill:** dark `--ink` pill, 44px, radius 9999, gradient text (reference: coral→periwinkle; AlmaConnect: `#7FE8DE → #BFF0EA`), small arrow. Sits above the H1.

**Editorial product card (4-up):** 18px eyebrow label → hairline → 432px tall image (12px radius, 48px circular ⊕ overlay bottom-right) → two-tone description. Column has top+bottom hairlines. This is the pattern for the AlmaConnect product router.

**Tag chip:** 12–13px text, `--ground`-darker or `--accent-tint` fill, radius 4–6px, 4px 10px padding ("Report", "Product News" pattern).

**Stat block:** giant numeral over 16px `--ink-65` caption, left-aligned or centered; grouped 3-up or in a 1-big + 2×2 grid with hairline rows.

**FAQ row:** 20px question, chevron right-aligned, hairline separators, "FAQ" Display M pinned in left column.

**Segmented control:** the horizontal tab pattern. One track at 6% white (6% ink on
light) holding all tabs, with only the selected tab filled — solid white with ink text
on dark, `--ink` with white text on light. Unselected tabs carry no fill of their own,
just a muted label colour. Not a row of separate pills. The fill is one element that
slides between tabs (`.segmented__thumb`), measured in JS because tabs differ in width. Below the width the track needs
for a single row it becomes a 2-up block with the panel radius; a stadium radius wrapped
around two rows reads as a bug. Classes `.segmented` + `.segmented__tab`.

**Vertical tab selector:** stacked 20–24px items, active = full ink + short underline, inactive = `--ink-45`; media panel on the right swaps per tab (reference "Attract investors / Engage investors…" pattern).

**Timeline row ("Our Story"):** year caption left · hairline-separated rows · body text with key phrases wash-highlighted in `--accent-tint`.

**Testimonial:** either (a) full-bleed photo band, 44px quote in pale accent on the image, caption + prev/next circles, or (b) 4-up white cards with avatar, name/handle, body quote, hairline border. AlmaConnect prefers (b) for named-institution quotes.

**Footer:** 5 link columns (16px, ink), logo mark bottom-left, hairline, then legal row + social squares, then small disclaimer text at `--ink-45`. Sits on `--ground`.

## 4b. Gradients and the shimmer system

Both are implemented in `references/almaconnect.css`; this is when to reach for them.

**Gradients are for grounds and shimmers only.** Never a flat gradient behind static
text, never more than one gradient surface per viewport.

| Recipe | Class | Use |
|---|---|---|
| Pastel wash | `.wash-pastel` | Four offset radial blooms under `blur(42px)` behind floating/orbiting elements. The blur is the point — no individual blob may read as a shape. |
| Ink scrim | `.scrim-ink` | Over a photographic or gradient ground: 58% ink at the top, 22% at 45%, 50% at the bottom, so a headline up top and cards at the bottom both hold contrast. |
| Frosted card | `.glass` | A card on a busy ground: `rgba(250,250,250,0.94)` + `backdrop-filter: blur(14px)`. |

**The shimmer** is the house signature. A gradient band sweeps across the glyphs
(clipped with `background-clip: text`) or along an SVG outline, then the element
returns to its resting colour. It never leaves a gradient parked on the text.

```html
<span class="shine" data-text="Your database didn't.">Your database didn't.</span>
```

The string is duplicated into `data-text` because `::after` paints `attr(data-text)` —
keep the two in sync. Which variant:

- **Hero headline loops** — plain `.shine`, 5s cycle, ~45% sweep then rest.
- **Every other headline sweeps once**, the first time it scrolls into view — add
  `.shine--once` and let the IntersectionObserver (threshold 0.6, then `unobserve`)
  add `.is-lit`. Once per session, never on re-scroll.
- **On a dark ground** add `.shine--dark` — sweeps aqua→white instead of ink→turquoise.
- **Numerals on hover** — `.shimmer-num` plus one hue modifier per column
  (`--aqua/--lilac/--sky/--peach`), so a stat band shimmers a different colour per stat.
- **SVG outlines** — `.trace` runs a lit dash round a drawn mark; `.chase` runs a light
  around a ring of small marks.
- **Progress lines** — `.progress-line` is the timer bar under an auto-advancing item.
  It fills in one of the four gradient hues; set `--load-grad` per item and offset the
  starting hue per panel so all four appear across a section even when each panel holds
  fewer than four rows. `--warm` is no longer used for these — it is chasing lights only.

Four traps, each of which cost a debugging round on the homepage — the stylesheet
comments carry the fixes:

1. Use `background-image`, **not** the `background` shorthand, on `.shine--dark`. The
   shorthand resets `background-clip` and paints a solid band over the text.
2. A `calc(var(--x))` endpoint in a `@keyframes` **does not interpolate** — Chrome snaps
   to the end value and holds. SVG traces need literal measured path lengths, so each
   mark carries its own keyframes.
3. A chasing light's delay must **advance** with the index — `(count - i)`, not `-i`, or
   the chase runs anticlockwise. Ramp the glow up *and* down across a span wider than
   the gap between neighbours, or it steps instead of flowing.
4. Never pause an auto-advancing carousel/accordion on `focusin` — it fires on a plain
   mouse click, so clicking an item kills the cycle. Pause on `:focus-visible` only, and
   don't pause on hover over a whole column: the pointer is already there when the
   section scrolls into view.

`prefers-reduced-motion: reduce` stops all of it, and any JS gate must read the same
media query.

## 5. Section pattern matching

When asked to design a section, first check `references/section-patterns.md` for the closest match and inherit its layout. Quick map to AlmaConnect pages:

| AlmaConnect need | Reference pattern |
|---|---|
| Homepage hero | P1 Hero (announcement pill + Display XL + 28px sub + CTA) |
| Product router (4 products) | P2 Editorial 4-card row with eyebrow labels |
| "Trusted by 500+" logos | P3 Partner logo strip w/ vertical hairlines + dark pill banner |
| What we do / capabilities | P4 Statement H2 + vertical-tab media explainer |
| News/Data Mine cross-sell band | P5 Full-bleed mint band, 1/3 text : 2/3 media |
| Stats ("500+ institutions…") | P6 Stat grids (3-up band or 1+4 hairline grid) |
| Differentiation explainer | P7 Split explainer w/ sand panel + annotated UI collage |
| Testimonials | P8 photo band or P13 card row |
| Pricing | P9 three white panels on ground |
| FAQ | P10 left-pinned FAQ + hairline rows |
| Guides/резources, blog | P11 blog patterns; P12 Data-Center card library |
| About/company story | P14 mission split + P15 timeline |
| Dark closing/partnership band | P16 dark band w/ pale display type |
| Auto-scrolling logo strip | **M1** logo marquee (motion-patterns.md) — pairs with P3's heading |
| Scrolling proof/outcomes ticker | **M2** case-study link ticker |
| Nav over dark/media hero | **M3** pill-nav → white overlay panel (content still per P0/mega-menu spec) |

Motion baseline: sections and cards may fade+rise 12–16px on scroll-into-view (once, 400ms, staggered ≤60ms); nothing else moves unless it's an M-pattern. `prefers-reduced-motion` disables all of it.

## 6. Do / Don't

- DO let type scale carry hierarchy; headline weight is 350 at 32px and up, 400 below — never bold display type.
- DO use sentence case everywhere — headlines, buttons, nav. Never Title Case or ALL CAPS (except tiny annotation chips like `DEPLOY`).
- DO keep paragraph measure tight — ~54ch for body/subtext, 620px for 24px editorial text. Text never spans the full container.
- DO use real product-UI screenshots/mock cards inside tinted panels as the illustration style — small white UI cards with 12px radius floating on tint, connected by 1px ink lines and tiny labeled chips.
- DON'T use stock-photo hero collages, drop shadows, or more than one accent per viewport. Gradients are allowed **only** as grounds and shimmers per §4b — never flat behind static text.
- DON'T center body text (only stat bands and the dark closing band center).
- DON'T introduce new greys — every neutral derives from `--ink` at an opacity or the two ground/surface values.
- DON'T bold whole paragraphs; use the two-tone device instead.
- DON'T hand-write type values into a page — use the `.t-*` classes from `almaconnect.css` so the ladder stays closed.

## 7. Extending this skill

New references go through the same pipeline: study frames → extract tokens/patterns → append a `P##` entry to `references/section-patterns.md` → log the source in `references/reference-index.md`. Never overwrite existing patterns; if a new reference conflicts, note both and prefer the newer only if the user says so.
