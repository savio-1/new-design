---
name: almaconnect-design
description: Complete design system for building AlmaConnect web pages (almaconnect.com, news.almaconnect.com) — brand tokens, the ratified Geist + Nunito Sans type ladder, colour rules, layout and spacing, component recipes, gradients, and the shimmer motion system. Bundles almaconnect.css, a drop-in stylesheet implementing all of it. Use whenever designing, building, or reviewing any AlmaConnect page, section, component, or Figma frame — heroes, navigation, product cards, pricing, stats, testimonials, FAQs, footers, blog and resource layouts — and whenever a question touches AlmaConnect type sizes, colours, spacing, buttons, or animation.
---

# AlmaConnect Design System

Build AlmaConnect pages in a quiet, editorial, type-led visual language: generous
whitespace, hairline rules, restrained colour, no drop shadows. Structure and rhythm
come from the AngelList reference designs; the brand layer — Geist + Nunito Sans,
turquoise `#00C4B5`, warm cream ground — is AlmaConnect's own.

**Start every page from `almaconnect.css`.** It is the drop-in implementation of
everything in this file: tokens, the type ladder as `.t-*` classes, buttons and pills,
the gradient recipes, and the full shimmer system with the JS it expects. Link it after
the font stylesheet and before any page CSS. Don't hand-write type or colour values into
a page — use the classes and tokens, so the ladder stays closed.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap">
<link rel="stylesheet" href="almaconnect.css">
```

**Companion references, read before the work they cover:**

| File | Read before |
|---|---|
| `references/section-patterns.md` | designing any full section — a catalog of studied layouts (P0–P18) with exact specs |
| `references/motion-patterns.md` | adding animation or interactive nav — logo marquee, link ticker, expanding pill-nav (M1–M3) |
| `references/color-system.md` | using any colour beyond `--accent`, `--ink` and the grounds |
| `references/reference-index.md` | adding a new reference to the system |

If a section resembles a pattern in `section-patterns.md`, inherit that pattern's
layout, spacing and hierarchy rather than inventing a new one. Note that file predates
the current container width — take its **proportions**, but the container is 1288px
with 76px margins (§3), not the 1344/48 written there.

---

## 1. Brand layer

| Token | Value | Role |
|---|---|---|
| `--accent` | **#00C4B5** | Primary turquoise. CTAs, links, active states. |
| `--accent-dark` | #00A396 | Hover/pressed; the mid stop inside shimmer gradients. |
| `--accent-tint` | #E0F7F4 | Pale wash — tag pills, highlighted-phrase backgrounds, icon chips. |
| `--accent-lift` | #7FE8DE | The bright crest inside gradients. |
| `--ink` | **#04302B** | Near-black teal. ALL headlines and primary body text; also dark button fills. Never pure black. |
| `--ink-80` | rgba(4, 48, 43, 0.8) | Hero subtext. |
| `--ink-65` | rgba(6, 48, 43, 0.65) | Secondary body text — most paragraph text runs here. |
| `--ink-45` | rgba(6, 48, 43, 0.45) | Tertiary: dates, captions, disclaimers. |
| `--ground` | **#F2EFEA** | Warm off-white page ground. Never pure white for page backgrounds. |
| `--surface` | #FFFFFF | Cards, nav bar, panels — white sits *on* the cream ground. |
| `--panel` | #EDEBE4 | Recessed panel, one step under the ground. |
| `--hairline` | rgba(153, 159, 153, 0.25) | ALL rules, borders, dividers. One hairline everywhere. |
| `--deep` | **#10261E** | The dark section ground — deeper than `--ink`, which stays for type and fills. |
| `--deep-raised` | #1B3A2E | A card sitting on the dark ground. |
| `--deep-line` | rgba(255,255,255,0.16) | Dividers on dark. |
| `--on-deep` | rgba(255,255,255,0.72) | Body text on dark. Headlines there go full white. |
| `--warm` | **#F6E47F** | The one warm accent: chasing lights on dark grounds only. Never on light. |
| `--grad-aqua/-lilac/-sky/-peach` | — | Progress-line gradients, in the four hues the numerals shimmer in. |

**Support palette** — tint fill paired with its same-hue text, for *category and state
only*. Each hue stays under ~1% of screen area. Never on CTAs, links, or headlines.

| Pair | Tint | Text | Saturated (gradients only) |
|---|---|---|---|
| aqua | #E0F7F4 | #00806F | #6FE0D3 |
| lilac | #F5EDFD | #9B5FD0 | #CDB1F2 |
| sky | #EBF4FD | #2F6FBF | #9EC9F5 |
| peach | #FCE9DC | #C4703C | #F7BF95 |
| mint — *verified / positive* | #E5F6F0 | #2F9E77 | — |
| sand — *former / pending* | #FDF4E3 | #D08A21 | — |

**Colour discipline — this is what makes it look expensive:**

- Pages are 90% ink-on-cream. Accent appears in small doses: a link, one button, a tag.
- Tinted or dark full-bleed bands appear **at most once or twice per page**, to break rhythm.
- **`#00C4B5` is light.** White text on it fails AA. Primary buttons are ink-filled;
  turquoise fill takes **ink** text. Use white only on `--ink` / `--deep`.
- **Gradients are for grounds and shimmers only** (§5) — never flat behind static text,
  never more than one gradient surface per viewport.
- Never introduce new greys. Every neutral is `--ink` at an opacity, or a ground.

---

## 2. Typography — Geist headlines, Nunito Sans body

Two faces. Geist for anything that behaves like a headline; Nunito Sans for everything
else. Geist is bundled/available on Google Fonts (`wght@100..900`); Nunito Sans is the
variable font (`wght 200–1000`).

```css
--font-display: "Geist", "Helvetica Neue", Arial, sans-serif;
--font-body:    "Nunito Sans", ui-sans-serif, system-ui, sans-serif;
```

### The ladder

| Role | Face | Size | Weight | Tracking | Line-height | Class |
|---|---|---|---|---|---|---|
| Display / H1 | Geist | **88px** `clamp(52px, 6.1vw, 88px)` | 350 | **−4%** | 0.95 | `.t-display` |
| Stat numeral | Geist | **64px** `clamp(40px, 4.45vw, 64px)` | 350 | **−4%** | 0.95 | `.t-num` |
| H2 — every section headline | Geist | **48px** `clamp(34px, 3.34vw, 48px)` | 350 | **−4%** | ~1.08 | `.t-h2` |
| H3 | Geist | **32px** | 350 | −3% | 1.25 | `.t-h3` |
| H4 — card titles, accordion heads | Geist | **24px** | **400** | −3% | 1.22 | `.t-h4` |
| Tabs | Geist | **16px** | **400** | −3% | 1 | `.t-tab` |
| Category pills | Geist | **14px** | **400** | −3% | 1.4 | `.t-pill` |
| Editorial lead | Nunito Sans | **24px** | 400 | −3% | 1.55 | `.t-editorial` |
| Hero subtext | Nunito Sans | **20px** | 400 | −3% | 24px | `.t-hero-sub` |
| Quotes, large body | Nunito Sans | **20px** | 400 | −3% | 1.45 | `.t-lead` |
| Section subtext | Nunito Sans | **18px** | 400 | −3% | 1.5 | `.t-sub` |
| Body, nav, buttons | Nunito Sans | **16px** | 400 | −3% | 1.5 | `.t-body` |
| Labels, roles, captions | Nunito Sans | **14px** | 400 | −3% | 1.4 | `.t-label` |
| Micro | Nunito Sans | **12px** | 400 | −3% | 1.5 | `.t-micro` |

### Two hinges — learn these instead of the table

- **Tracking turns at 48px.** −4% at 48px and above; −3% at everything below, body included.
- **Weight turns at 24px.** Geist 350 at 32px and above; Geist 400 at 24px and below.
  Nunito Sans is 400 throughout.

A headline that drops a step at a breakpoint **crosses the hinge with it** — a 32px H3
falling to 24px must also go 350 → 400.

**The size inventory is closed.** Geist 88 / 64 / 48 / 32 / 24 / 16 / 14 · Nunito Sans
24 / 20 / 18 / 16 / 14 / 12. Never invent a step between them. One H2 spec serves every
section — never a per-section headline size.

### Weight exceptions — the only ones

Buttons and inline CTA links stay Nunito Sans **600**; nav stays **500**. They read as
affordances, not prose. Sizes still come from the ladder. Nothing on the page is ever
700+. Logotypes are exempt from the tracking laws and keep whatever spacing the drawn
mark specifies (e.g. +6%).

### Implementing −3% tracking (a real trap)

`letter-spacing: -0.03em` on `body` alone is **wrong**. `em` resolves to a pixel value
at the body's own size and then inherits as *that pixel value* — so a 14px child renders
−3.4% and an 18px child −2.7%, while form controls sit at 0 (they inherit neither font
nor tracking). Re-anchor on the elements themselves so `em` resolves against each
element's own size:

```css
h1, h2, h3, h4, h5, h6,
p, li, a, blockquote, cite, figcaption, label, dt, dd,
button, input, select, textarea, td, th { letter-spacing: -0.03em; }
```

Keep `span`, `em` and `strong` **out** of that list — they wrap a run inside a headline
(the shimmer device does exactly this) and must take the parent's tracking, not reset
it. Any `<span>` carrying its own `font-size` needs its own explicit `-0.03em`.

### Two-tone paragraph device (house signature)

Lead phrase at full `--ink` weight 600, remainder at 400 / `--ink-65`. Use this instead
of bolding a whole paragraph. Class: `.t-twotone`.

---

## 3. Layout and spacing

- **Canvas** 1440px. **Container 1288px**, 76px side margins (24px below 920px).
- **Grid** 4 × 298px cards with 32px gaps (= 1288); 2-col explainer split ~1/3 text : 2/3 visual.
- **Nav** 72px tall (64px below 920px), bottom hairline, sticky; goes to
  `--nav-solid` rgba(242,239,234,0.9) once scrolled.
- **Section rhythm** 80px standard · 120–160px for marquee sections · 40px thin strips.
  Sections butt together — **padding carries all rhythm, never margins**.
- **Reading measure** ~54ch for body and subtext; 620px for 24px editorial text.
  Text never spans the full container.
- **Intra-stack scale** 8 / 16 / 24 / 28 / 32px — never arbitrary values.
  H1 → hero subtext 28px · subtext → CTA 24px · H2 → section subtext 16–24px.
- **Radii** `--r-button` 10px · `--r-card` 12px · `--r-panel` 16px · `--r-pill` 9999px.
- **Easing** one curve everywhere: `--ease: cubic-bezier(0.22, 1, 0.36, 1)`.
- **Shadows: none.** Depth comes from hairlines, tinted panels and layered UI cards.

---

## 4. Component recipes

**Buttons** — `.btn` plus a fill modifier. Label always Nunito Sans 16px/600 at −3%,
radius 10px, no shadow.

| Tier | Class | Spec |
|---|---|---|
| Primary | `.btn--ink` | `--ink` fill, white text, 50px tall, 32px x-padding |
| Turquoise | `.btn--accent` | `--accent` fill, **ink** text — never white |
| Secondary | `.btn--outline` | 1px ink outline, 40px tall; on hover inverts to ink fill **and drops to 0 radius** (house signature) |
| Nav CTA | `.btn--nav` | 44px tall, 26px x-padding |

**Scrolled nav:** the bar contracts into a floating glass pill (`.nav-bar` +
`.is-scrolled`) — max-width pulls in, the logo releases its reserved slot so the row
converges, and a blurred translucent ground carries it. Keep that ground at ~0.82
alpha or higher: over a photographic hero a thinner pill drops nav labels to 2:1.
**Never** change the bar's geometry on open: it moves the links out from under a
stationary pointer, which re-fires mouseenter and makes the nav oscillate. The menu
drops as a floating card (`.nav-menu`) under the bar instead.
| Text link | `.link-arrow` | accent, 16px/600, inline `→` nudging 3px right on hover |

**Pill** (`.pill`) — 32px tall, Geist 14px/400, `--panel` fill. No greens on pills.

**Segmented control** (`.segmented` + `.segmented__tab`) — the tab pattern. One track
at 6% white holding all tabs, with only the selected tab filled solid white and ink;
unselected tabs carry no fill of their own, just muted label colour. Not a row of
separate pills. The fill is **one element that slides** between tabs (`.segmented__thumb`),
measured in JS because the tabs are different widths. Where the track sits beside a visual, that grid must be `align-items: start` —
centred, one extra line of copy on a single tab slides the whole tab row. Below the width the track needs for a single row it becomes a 2-up
block with the panel radius — a stadium radius wrapped around two rows reads as a bug.

**Keyword highlight** (`.hl` + `--aqua/--lilac/--sky/--peach`) — a saturated support
hue washed behind a word inside a paragraph. Rotate hues; don't repeat one twice in a row.

**Card** (`.card`) — `--surface` fill, 1px hairline, 12px radius.

**Stat block** — `.t-num` numeral over a 14–16px `--ink-65` caption, in a hairline-ruled
band. Caption sits **above** the numeral. Tabular figures.

**Editorial product card** — eyebrow pill → media (12px radius) → `.t-h4` name →
two-tone description → `.link-arrow`. The router pattern for the products row.

**Testimonial** — white card, logo, quote at `.t-lead`, then name in **Geist 16px/400**
over role at 14px `--ink-45`. Hovering a card washes it in one of the four support hues via `.card--wash` —
set the hue in the markup, not by DOM position, so a carousel's clones keep it.

**Footer** — 5 link columns at 16px, logo bottom-left, hairline, legal row, then
disclaimer at `--ink-45`. Sits on `--ground`.

---

## 5. Gradients and the shimmer system

**Gradients are for grounds and shimmers only.**

| Recipe | Class | Use |
|---|---|---|
| Pastel wash | `.wash-pastel` | Four offset radial blooms under `blur(42px)` behind floating/orbiting elements. The blur is the point — no blob may read as a shape. |
| Ink scrim | `.scrim-ink` | Over a photographic ground: 58% ink top, 22% at 45%, 50% bottom, so a headline up top and cards below both hold contrast. |
| Frosted card | `.glass` | `rgba(250,250,250,0.94)` + `backdrop-filter: blur(14px)` on a busy ground. |

**The shimmer is the house signature.** A gradient band sweeps across the glyphs
(clipped with `background-clip: text`) or along an SVG outline, then the element returns
to its resting colour. It never leaves a gradient parked on the text.

```html
<span class="shine" data-text="Your database didn't.">Your database didn't.</span>
```

The string is duplicated into `data-text` because `::after` paints `attr(data-text)` —
keep the two in sync.

| Variant | Behaviour |
|---|---|
| `.shine` | Hero headline. Loops: 5s cycle, ~45% sweep, then rests. |
| `.bw` + `.is-in` | **Blur-in.** Headlines and section subtext resolve word by word on first sight — sharp at the line start while the tail is still blurred. The shimmer is sequenced to start as the last word lands, never over text that has not resolved. |
| `.shine--once` | Every other headline. Sweeps **once**, the first time it scrolls into view — an IntersectionObserver (threshold 0.6, then `unobserve`) adds `.is-lit`. Never on re-scroll. |
| `.shine--dark` | On a dark ground: sweeps aqua → white instead of ink → turquoise. |
| `.shimmer-num` + `--aqua/--lilac/--sky/--peach` | Numerals shimmer on hover, a different hue per column of a stat band. |
| `.trace` | A lit dash runs the outline of a drawn SVG mark. |
| `.chase` | A light runs around a ring of small SVG marks. |
| `.progress-line` | Timer bar under an auto-advancing item, filling in one of the four gradient hues. Offset the starting hue per panel so all four appear across a section. |

**Five traps, each of which cost a debugging round.** The stylesheet carries the fixes
next to the code:

1. Use `background-image`, **not** the `background` shorthand, on `.shine--dark` — the
   shorthand resets `background-clip` and paints a solid band over the text.
2. A `calc(var(--x))` endpoint in a `@keyframes` **does not interpolate** — Chrome snaps
   to the end value and holds. SVG traces need literal measured path lengths, so each
   mark carries its own keyframes.
3. A chase delay must **advance** with the index — `(count - i)`, not `-i`, or the chase
   runs anticlockwise. Ramp the glow up *and* down across a span wider than the gap
   between neighbours, or it steps instead of flowing.
4. Never pause an auto-advancing carousel or accordion on `focusin` — it fires on a
   plain mouse click, so clicking an item kills the cycle. Pause on `:focus-visible`
   only, always clear the pause on click, and don't pause on hover over a whole column:
   the pointer is already there when the section scrolls into view.
5. A transparent overlay (a copy block's padding sitting above icons) swallows pointer
   events. Give it `pointer-events: none` and put `auto` back on its real children.

**Motion baseline:** sections and cards may fade + rise 12–16px on scroll-into-view
(once, ~500ms, staggered ≤60ms) via `.rise`. Nothing else moves unless it's an
M-pattern from `references/motion-patterns.md`. `prefers-reduced-motion: reduce` stops
all of it — and any JS gate must read the same media query.

---

## 6. Do / Don't

- DO let type scale carry hierarchy — headline weight 350 at 32px+, 400 below. Never bold display type.
- DO use sentence case everywhere: headlines, buttons, nav. Never Title Case or ALL CAPS, except tiny annotation chips.
- DO use real product-UI screenshots and mock cards inside tinted panels as the illustration style — small white UI cards, 12px radius, floating on tint, connected by 1px ink lines and small labelled chips.
- DO keep every measure tight; text never spans the full container.
- DON'T use stock-photo hero collages, drop shadows, or more than one accent per viewport.
- DON'T centre body text — only stat bands and a dark closing band centre.
- DON'T introduce new greys, or hand-write type values instead of using the `.t-*` classes.
- DON'T bold whole paragraphs; use the two-tone device.
- DON'T put white text on turquoise.

---

## 7. Extending this system

New references go through the same pipeline: study the frames → extract tokens and
patterns → append a `P##` entry to `references/section-patterns.md` → log the source in
`references/reference-index.md`. Never overwrite an existing pattern; if a new reference
conflicts, record both and prefer the newer only if the user says so.

When changing type, colour or motion, **change `almaconnect.css` first** and let this
file describe it — the stylesheet is the implementation of record, and `styleguide.html`
in the website repo renders every class in it for an end-to-end check.
