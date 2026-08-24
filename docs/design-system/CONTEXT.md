# AlmaConnect — project context

Read `SKILL.md` for the design system itself. This file is the surrounding
context: how the prototype is built, what is real, what is placeholder, and what
is still open. It exists so a new session can pick up the work without
re-deriving decisions that were already made and paid for.

**Repo:** `savio-1/new-design` · branch `claude/almaconnect-design-review-48vnbb`
**Live prototype:** the homepage artifact (ask the user for the URL)

---

## 1. What exists today

One page — the homepage — built as a single self-contained HTML file. Section
order:

| # | Section | What it is |
|---|---|---|
| — | Load intro | Four keywords cycling one at a time, then the page |
| 01 | Hero | 88px headline with a looping shimmer; auto-drifting staircase of portraits |
| 02 | Trusted-by | Headline + 12 placeholder wordmarks |
| 03 | Products | 4 cards, each with a CSS-built illustration and a `+` that reveals features |
| 04 | Problem | Scroll-lit paragraph — words light progressively as you scroll |
| 05 | Solution | Grainy gradient ground, 3 cards, one expands to a screenshot |
| 05b | Benefits | Dark teal band, segmented tabs, auto-advancing accordion |
| 06 | Testimonials | Looping carousel, 1.5 cards in view, ruled stat band |
| 07 | Integrations + privacy | Orbiting logos; three drawn certification marks |
| 09 | Closing CTA | Aurora wash dissolving into near-black |
| — | Footer | Brand block + five link columns, same ground as the closing band |

---

## 2. Build pipeline

**Never edit `almaconnect-home.html` directly** — it is generated.

```
almaconnect-home.src.html   ← edit this
        ↓  python3 scripts/build-home.py
almaconnect-home.html       ← publish this
```

The build inlines assets as base64 data URIs, because the artifact host blocks
external asset requests. Tokens:

| Token | Resolves to |
|---|---|
| `@img:name` | `assets/img/floema/name.jpg` |
| `@png:name` | `assets/logo/name.png` — for marks that need transparency |
| `@svg:name` | `assets/logo/name.svg` |
| `@video:name` | `assets/videos/name.mp4` |

The result is ~2.2MB and fully standalone: every image, video and logo is baked
in. The only external request is the Google Fonts stylesheet.

**A new page should follow the same split.** Copy the pipeline rather than
hand-inlining, and link `almaconnect.css` rather than pasting its rules in — the
stylesheet is the implementation of record for everything in `SKILL.md`.

---

## 3. How this work gets verified

The habit that mattered most on this project: **measure in the browser, don't
eyeball**. Several changes looked right and were wrong.

- Type: read `getComputedStyle` across every text node and check the inventory
  collapses to the ladder. This caught 45 distinct specs on a page that looked
  consistent.
- Contrast: sample the **rendered pixels**, not the computed colour. Once a fill
  moves to a sibling or a pseudo-element, computed styles report the element as
  transparent and lie to you.
- Motion: sample state over time. "It animates" is not a check — confirm the
  midpoint actually sits between the endpoints, or you cannot tell a transition
  from a snap.
- Hover on moving elements: re-measure the target's live position immediately
  before moving the pointer; Playwright refuses to hover unstable elements.
- Layout: after any change that alters text flow, re-measure every section
  height against the previous values. Identical heights prove no reflow.

A page renders headless via Playwright against `file://` — no server needed.

---

## 4. What is placeholder

Everything here is stand-in and should not ship as-is:

- **Portraits** — stock faces, including beside real named testimonial authors.
  Attaching a stranger's face to a named person misrepresents them; swap these
  before anything goes public.
- **Testimonial names and quotes** — the quotes are real customer language, the
  faces are not those people.
- **Directory names** in the products illustration (Priya Sharma, Daniel Reyes…)
  are invented.
- **Trusted-by wordmarks** — set in Georgia/Nunito as fake logotypes. They are
  deliberately exempt from the type rules. Replace with real SVGs.
- **Certification marks** (SOC 2, GDPR, EU–US DPF) — drawn from scratch. Each has
  licensing rules and requires the actual certification. Do not publish without
  legal sign-off and real artwork.
- **Brand marks** (LinkedIn, Salesforce, Blackbaud, Ellucian, Google) — need
  official press-kit assets.
- **Product videos** and mock UI copy.

---

## 5. Open items

| Item | Note |
|---|---|
| `--ink-45` at 14px | Measures **2.6:1** — under AA. Affects every caption, role and disclaimer on the page. Moving those to `--ink-65` fixes it; it is a token-level decision, not a one-off. |
| Mobile nav | Links hide below 1000px and nothing replaces them — no hamburger or drawer exists yet. |
| Intro replay | Plays on every load. Session-gate it before real traffic, and consider click-to-skip. |
| Figma | The plan was always to rebuild in Figma once the HTML settled. |

---

## 6. Decisions already made — don't re-litigate

- **Two faces, closed ladder.** Geist headlines, Nunito Sans body. The size
  inventory is closed; new steps get invented constantly and have to be caught.
- **Tracking turns at 48px, weight turns at 24px.** These two hinges replace
  memorising the table.
- **Gradients are grounds and shimmers only.** Never flat behind static text.
- **No drop shadows on page cards.** The only shadows on the page are *inside*
  artwork, where a mock UI card floats on a tint.
- **Buttons are 10px radius, ink-filled.** Turquoise fill takes ink text —
  `#00C4B5` is light and white on it fails AA.
- **One H2 spec for every section.** Per-section headline sizes were the single
  biggest source of drift.
- **Reduced motion is not optional.** Every effect added here has a
  `prefers-reduced-motion` path, and the JS gates read the same query.

---

## 7. Traps that cost a debugging round each

Every one of these looked correct in code and failed in the browser.

1. **`letter-spacing: -0.03em` on `body` alone is wrong.** `em` resolves to a
   pixel value at body size and then inherits as *pixels* — 14px text renders
   −3.4%, 18px renders −2.7%, and form controls get nothing. Re-anchor on the
   elements themselves.
2. **`span`/`em`/`strong` must stay out of that rule.** They wrap runs inside
   headlines and have to take the parent's tracking.
3. **The `background` shorthand resets `background-clip`.** Use
   `background-image` on anything clipped to text.
4. **A `calc(var(--x))` endpoint in `@keyframes` does not interpolate.** Chrome
   snaps to the end and holds. SVG traces need literal measured path lengths.
5. **A chasing light's delay must advance with the index** — `(count - i)`, not
   `-i`, or it runs backwards. Ramp up *and* down across a span wider than the
   gap between neighbours, or it steps instead of flows.
6. **`focusin` fires on a plain mouse click.** Never pause an auto-advancing
   cycle on it. Pause on `:focus-visible`, and never on hover over a whole
   column — the pointer is already there when the section scrolls into view.
7. **A transparent overlay swallows pointer events.** `pointer-events: none` on
   it, `auto` back on its real children.
8. **A `z-index: -1` child paints behind its parent's background** unless the
   parent has a stacking context.
9. **`position: relative` does not blockify a `<span>`.** Its background paints
   per line box.
10. **Never change a nav bar's geometry when its menu opens.** It moves the
    links out from under a stationary pointer, `mouseenter` fires on whatever
    lands there, and the nav oscillates. Measured: 16 distinct geometries and 7
    open/close flips inside 1.4 seconds of holding still.
11. **IntersectionObserver fires regardless of what is painted over an
    element.** Anything revealed on scroll must be gated behind a load overlay,
    or it plays unseen.
12. **Glass needs ~0.82 alpha to stay legible.** At 0.62 a photographic hero
    read through hard enough to drop nav labels to 2:1.
