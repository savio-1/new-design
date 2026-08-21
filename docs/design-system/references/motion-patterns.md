# Motion Patterns

Source R2: wonderful.ai (Framer build, studied 2026-08-20). Two interaction patterns adopted for AlmaConnect, re-skinned to AlmaConnect tokens (see SKILL.md §1). These are *behavioral* patterns — layout/spacing still follow the AngelList-derived system; this file adds how things move.

Global motion rules (apply to everything in this file):
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint feel) for panel/reveal motion; `linear` only for marquees.
- Durations: micro-hover 150–200ms · panel expand 350–450ms · marquee loop 30–45s.
- Always honor `prefers-reduced-motion: reduce` → marquees stop (static row, horizontally scrollable), panels switch to simple fade.

---

## M1 · Auto-scrolling logo marquee (wonderful.ai section 2)

What the reference does: under a small centered heading ("Trusted by leading enterprises across industries"), a single row of monochrome client logos scrolls horizontally forever, right-to-left, at constant speed, edges fading out. No controls, no pause button; pauses on hover.

**Anatomy**
- Section on `--ground`; heading = Caption/Label size (14–16px, `--ink-65`), centered, 32–40px above the strip.
- Logo cells: fixed box ~200×56 (reference 250×70), logos rendered monochrome `--ink` at 45–60% opacity, `object-fit: contain`, vertically centered. 56–72px gap between cells.
- Edge masks: 96–120px fade to `--ground` on both sides (use `mask-image: linear-gradient(to right, transparent, black 120px, black calc(100% - 120px), transparent)` on the viewport element — works over any background, unlike overlay gradients).
- Speed: constant, ~28–36s per full loop for ~12 logos (≈40–60px/s). Slow enough to read, fast enough to feel alive.
- Hover: `animation-play-state: paused` on the track.

**Mechanics (the duplication trick):** render the logo set **twice** inside one track; animate the track `translateX(0 → -50%)` with `linear infinite`. When the first copy has fully exited, the loop restarts invisibly. The track must be `width: max-content; display: flex`.

```html
<section class="logo-marquee" aria-label="Trusted by 500+ institutions">
  <p class="logo-marquee__label">Trusted by 500+ institutions, foundations and companies</p>
  <div class="logo-marquee__viewport">
    <div class="logo-marquee__track">
      <!-- set A -->
      <div class="cell"><img src="logo1.svg" alt="Harvard Medical School"></div>
      <div class="cell"><img src="logo2.svg" alt="Punahou School"></div>
      <!-- …all logos… -->
      <!-- set B: exact duplicate, aria-hidden -->
      <div class="cell" aria-hidden="true"><img src="logo1.svg" alt=""></div>
      <!-- …duplicate all… -->
    </div>
  </div>
</section>
```

```css
.logo-marquee { padding-block: 64px; background: var(--ground); }
.logo-marquee__label { text-align: center; font-size: 15px; color: var(--ink-65); margin-bottom: 36px; }
.logo-marquee__viewport {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 120px, #000 calc(100% - 120px), transparent);
}
.logo-marquee__track {
  display: flex; gap: 64px; width: max-content;
  animation: marquee 32s linear infinite;
}
.logo-marquee__viewport:hover .logo-marquee__track { animation-play-state: paused; }
.cell { width: 200px; height: 56px; display: grid; place-items: center; flex: none; }
.cell img { max-width: 100%; max-height: 100%; object-fit: contain;
  filter: grayscale(1) brightness(0.35); opacity: 0.55; transition: opacity .2s, filter .2s; }
.cell:hover img { filter: none; opacity: 1; }   /* optional color-on-hover */
@keyframes marquee { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .logo-marquee__track { animation: none; }
  .logo-marquee__viewport { overflow-x: auto; mask-image: none; }
}
```

Notes:
- `-50%` only lands seamlessly because the track contains exactly two identical sets — keep it that way.
- AlmaConnect usage: homepage "Trusted by" strip (this marquee replaces/augments pattern P3's static strip; the filterable tabbed wall still lives on /customers). Also reusable for integration-partner logos.
- Don't run two marquees in the same viewport at once; one moving strip per screen.

## M2 · Case-study link ticker (same section family)

The reference follows the logo marquee with a second marquee: a heading ("Solving the problems that move the business.") and a scrolling row of text links — case-study titles with ↗ arrows — using the same duplicated-track mechanics but slower and in the **opposite direction** (`translateX(-50% → 0)` or `animation-direction: reverse`).

- Items: 18–20px links, `--ink`, ↗ glyph after, 48px apart, optionally separated by hairline dots. Hover: link turns `--accent`, underline appears; track pauses.
- Because items are interactive, pause-on-hover is **required**, and every duplicated set after the first gets `aria-hidden="true"` + `tabindex="-1"` on its links so keyboard users tab through one set only.
- AlmaConnect usage: scrolling strip of customer outcomes / news headlines ("Willamette found prospects other methods missed ↗", "$2.1M gift discovered via a job-change alert ↗") — a live-feeling proof ticker between sections.

## M3 · Nav hover → white overlay panel (wonderful.ai hero nav)

What the reference does: over a dark hero, the top-center nav is a compact translucent **pill** (logo · Platform · Industries · Company · Blog · CTA). Hovering a parent item makes the pill **expand into a white rounded panel** — the white surface grows out of the nav itself (not a detached dropdown) — revealing the child links stacked inside; text that was light-on-dark flips to ink-on-white. Moving between parents morphs the panel size; leaving collapses it back to the pill.

**Anatomy**
- Collapsed pill: height 56–64px, radius `--r-pill`, background rgba(ink, 0.35–0.5) + `backdrop-filter: blur(12px)`, 1px rgba(255,255,255,0.12) border, white 15–16px links, 8px inner padding.
- Expanded: same element grows (height animates to fit content, radius eases to 20–24px), background transitions to `--surface` white, links flip to `--ink`. Child links: 16px/2.4 rows, `--ink-65`, hover `--ink` + `--accent` glyph; grouped under 12–13px `--ink-45` column labels when a parent has 4+ children.
- Timing: expand 380ms, collapse 300ms, both with the global ease. Child links stagger in: 20ms/item delay, fade + 6px translate-y.
- Keyboard/touch: expansion must also trigger on `:focus-within` and on click (aria-expanded toggling); Escape collapses; on touch, first tap expands, second tap follows link.

**Mechanics:** one nav element, CSS grid row animation for height (`grid-template-rows: 0fr → 1fr` on the panel wrapper — animates height without JS measurement), background-color/border-radius transitions on the container, and a `data-open="platform|industries|…"` attribute driving which child group renders.

```html
<nav class="pillnav" data-open="">
  <div class="pillnav__bar">
    <a class="pillnav__logo" href="/">AlmaConnect</a>
    <button class="pillnav__item" data-menu="products" aria-expanded="false">Products</button>
    <a class="pillnav__item" href="/customers">Customers</a>
    <a class="pillnav__item" href="/pricing">Pricing</a>
    <button class="pillnav__item" data-menu="company" aria-expanded="false">Company</button>
    <a class="btn btn--nav" href="/demo">Book a demo</a>
  </div>
  <div class="pillnav__panelwrap">
    <div class="pillnav__panel">
      <div class="pillnav__group" data-group="products"><!-- 4 product links w/ buyer lines --></div>
      <div class="pillnav__group" data-group="company"><!-- about, security, contact… --></div>
    </div>
  </div>
</nav>
```

```css
.pillnav {
  position: fixed; top: 20px; left: 50%; translate: -50% 0; z-index: 50;
  border-radius: 28px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(4,48,43,.45); backdrop-filter: blur(12px);
  color: #fff; width: max-content; max-width: min(920px, calc(100vw - 48px));
  transition: background .38s cubic-bezier(.22,1,.36,1),
              border-radius .38s cubic-bezier(.22,1,.36,1),
              border-color .38s;
}
.pillnav__bar { display: flex; align-items: center; gap: 4px; padding: 8px; }
.pillnav__item { padding: 10px 16px; border-radius: 9999px; font: inherit;
  background: none; border: 0; color: inherit; cursor: pointer;
  transition: background .15s, color .15s; }
.pillnav__item:hover { background: rgba(255,255,255,.12); }

.pillnav__panelwrap { display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows .38s cubic-bezier(.22,1,.36,1); }
.pillnav__panel { overflow: hidden; }
.pillnav__group { display: none; padding: 8px 20px 20px; }

/* open state */
.pillnav[data-open] { }
.pillnav[data-open]:not([data-open=""]) {
  background: var(--surface); color: var(--ink);
  border-radius: 22px; border-color: var(--hairline);
}
.pillnav[data-open]:not([data-open=""]) .pillnav__panelwrap { grid-template-rows: 1fr; }
.pillnav[data-open="products"] [data-group="products"],
.pillnav[data-open="company"]  [data-group="company"] { display: block; }

.pillnav__group a { display: block; padding: 8px 12px; border-radius: 8px;
  color: var(--ink-65); text-decoration: none;
  opacity: 0; translate: 0 6px;
  transition: opacity .25s, translate .25s, color .15s, background .15s; }
.pillnav[data-open]:not([data-open=""]) .pillnav__group a {
  opacity: 1; translate: 0 0; }
.pillnav__group a:nth-child(1){transition-delay:.05s}
.pillnav__group a:nth-child(2){transition-delay:.07s}
.pillnav__group a:nth-child(3){transition-delay:.09s}
.pillnav__group a:nth-child(4){transition-delay:.11s}
.pillnav__group a:hover { color: var(--ink); background: var(--accent-tint); }
```

```js
// hover intent + keyboard support
const nav = document.querySelector('.pillnav');
let closeTimer;
nav.querySelectorAll('[data-menu]').forEach(btn => {
  const open = () => { clearTimeout(closeTimer);
    nav.dataset.open = btn.dataset.menu;
    nav.querySelectorAll('[data-menu]').forEach(b =>
      b.setAttribute('aria-expanded', b === btn ? 'true' : 'false')); };
  btn.addEventListener('mouseenter', open);
  btn.addEventListener('focus', open);
  btn.addEventListener('click', open);           // touch
});
nav.addEventListener('mouseleave', () =>
  closeTimer = setTimeout(() => { nav.dataset.open = ''; }, 180));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') nav.dataset.open = '';
});
```

**Where this fits AlmaConnect's shell:** the global header spec (P0 + the Products mega-menu in SKILL.md §5 / homepage plan) stays the source of truth for *content* — four products, each with buyer line. M3 is the *presentation* option for pages with a dark or media hero: dark pill over the hero that blooms white on hover. On light/interior pages, keep the standard P0 white bar; do not mix both on one page. The 180ms close delay (hover intent) is load-bearing — without it the panel flickers when the cursor travels to the links.

**AlmaConnect skin:** collapsed pill tint uses ink `#04302B` at 45% + blur (over photography/video) — never pure black; expanded panel is `--surface` with `--accent-tint` hover rows; the "Book a demo" CTA inside the pill stays `--accent` filled in both states.
