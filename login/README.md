# Cogentiq sign-in — handoff

The sign-in screen for the Cogentiq platform, with its animated showcase panel.
It's one self-contained HTML file plus an `assets/` folder: no build step, no
framework, no dependencies beyond the Geist font from Google Fonts.

- **Design source:** Figma, *Cogentiq design system* → page *Ideation* → the six
  "Login Screen" frames (light and dark)
  https://www.figma.com/design/HimR0mebP9NQmNK0LQ9MQC/Cogentiq-design-system?node-id=922-103020
- **Tokens:** the Cogentiq Figma variables, as used in the CogentIQ Platform prototype
- **Live prototype:** https://claude.ai/artifact/KUWrndx7MgZ3E2PoixjupL
- **Animation spec:** [`ANIMATIONS.md`](ANIMATIONS.md)
- **Reference stills:** `screenshots/`

## Run it

Serve the folder over HTTP and open `index.html`:

```sh
npx serve .            # or: python3 -m http.server 8080
```

Opening the file straight from disk (`file://`) also works.

## What's in the package

```
index.html          the page: markup, CSS and JS in one file
assets/             every image the page uses (see "Assets")
screenshots/        stills of each slide and each sign-in state, light/dark/mobile
README.md           this file
ANIMATIONS.md       per-slide motion timelines, easing and durations
```

## Layout

Built on the Figma frame's 1440 × 820 grid.

| Region | Spec |
|---|---|
| Showcase panel | 540 × 804, inset 8px, radius 16. Keeps the frame's 540:804 ratio and takes the viewport's height (min 624px). |
| Panel art | Laid out in the frame's own 540 × 804 coordinates inside `#stage`, then scaled to the panel with `transform: scale(var(--s))`, where `--s = panelHeight / 804` (set by a ResizeObserver). Every position in the markup is a Figma coordinate. |
| Form column | 360px wide, centred in the remaining space, 12px above the vertical centre. |
| Logo | 48px white disc with the Cogentiq mark (26.67px), 8px above the heading. |
| Legal line | 326px wide, 24px from the bottom. |
| ≤ 960px | Showcase hidden; the form fills the screen with a 16px safe-area gutter. |
| ≤ 480px | Heading steps down to 30/36. |

## Design tokens

Named one-to-one after the Figma variables. Light is the base `:root`; dark
applies under `prefers-color-scheme: dark` and under `[data-theme="dark"]`
(the theme toggle sets `data-theme` and remembers it in `localStorage`).

| Token | Light | Dark |
|---|---|---|
| `--backgrounds-page-bg-1` | `#fafafa` | `#121212` |
| `--backgrounds-type-default-bg-1` (input fill) | `#f5f5f5` | `#323232` |
| `--backgrounds-button-primary` | `#0d99ff` | `#0d99ff` |
| `--backgrounds-button-primary-hover` | `#007be5` | `#007be5` |
| `--backgrounds-disabled-tonal-2` | `#eeeeee` | `#424242` |
| `--backgrounds-card-bg-4` | `#f5f5f5` | `#323232` |
| `--backgrounds-badge-red` (error alert) | `#fff5f5` | `#3f0907` |
| `--strokes-type-default` | `#e0e0e0` | `#424242` |
| `--strokes-type-hover` | `#bdbdbd` | `#616161` |
| `--strokes-type-focus` | `#0d99ff` | `#007be5` |
| `--strokes-type-error` | `#f24822` | `#f24822` |
| `--strokes-icon-default` | `#616161` | `#9e9e9e` |
| `--text-primary` | `#121212` | `#ffffff` |
| `--text-secondary` | `#616161` | `#bdbdbd` |
| `--text-teritiary` *(Figma spelling)* | `#8c8c8c` | `#8c8c8c` |
| `--text-error` | `#dc3412` | `#ffafa3` |
| `--text-disabled-tonal-2` | `#bdbdbd` | `#757575` |
| `--text-coloured-blue` | `#0d99ff` | `#44aaf3` |

The showcase panel is the same in both themes: its cards are always white on
the gradient, as in Figma.

**Type** — Geist 400/500, named after the Figma text styles:

| Class | Spec |
|---|---|
| `.t-head2-med` | 500 36/40, −1.44px |
| `.t-body1-med` | 500 16/24, −0.64px |
| `.t-body2-reg` / `.t-body2-med` | 400 / 500 14/20, −0.56px |
| `.t-caption-reg` / `.t-caption-med` | 400 / 500 12/16, −0.24px |
| Showcase headline | 500 36/38, −1.44px, white |

**Radii:** inputs and buttons 8 · pills 12 · cards 16–20 · panel 16 · badges 80 (full).

**Card shadow (showcase):** `0 2px 12px rgba(33,33,33,.3)` for pills and step
cards; `0 8px 12px rgba(0,0,0,.12), 0 -8px 12px rgba(0,0,0,.08)` for listing cards.

## Components

| Component | Notes |
|---|---|
| Input field | Label 14/20 over a 44px control: 12px padding, radius 8, 1px stroke. Hover darkens the stroke; focus turns it blue with a 3px 20% ring; error turns it red. |
| Primary button | 44px, radius 8, 500 14/20. Disabled (`aria-disabled="true"`) uses `disabled/tonal-2`. Busy shows a 16px spinner and keeps the blue fill. |
| "Social" (SSO) button | Primary fill plus the 1px input stroke, 10px vertical padding, as in Figma. |
| OR divider | Two 135px rules either side of a 12px "OR". |
| Step (showcase) | A glass tab (`rgba(255,255,255,.16)`, top radius 8, 100px min) over a white card. Used for Trigger, Agent, Result, Assistant, Marketplace, Context bundle. |
| Assistant icon | 32px white tile with layered gradient glows behind the mark. Built at runtime from the Figma ellipse SVGs (`s2-ellipse-*.svg`) by the `GLOWS` table in the script. |
| Status pill | Pale tone fill, coloured text, a pulsing 6px dot. |
| Badge | `#f5f5f5` pill, `#007be5` text, 12/16 medium, optional 14px icon. |
| Pager | 8px dots (active 100%, others 40%) between 24px glass chevron buttons. |

## Sign-in flow

| State | How it's reached | Notes |
|---|---|---|
| Sign in | Default | Sign in stays disabled until both fields have a value. The eye icon toggles password visibility. |
| Busy | Submit | ~1.1s simulated request. |
| Error | Password under 8 characters | **Prototype rule only**, so the state can be reviewed. Inline alert, both fields red, password selected. |
| Signed in | Any other credentials | "Welcome back, {name}", the account, how they signed in, and *Open cogentiq*. |
| SSO | *Single sign on (SSO)* | Work email. |
| SSO error | A public email domain (gmail.com, outlook.com…) | "SSO isn't set up for {domain}…" |
| Redirecting | Any other domain | Shows the organisation and its sign-in host, then returns signed in (simulated). |

**Replace before production:** the simulated timeouts and the under-8-characters
rule in `VIEWS.signin` and `VIEWS.sso` (bottom of the script); the
`PUBLIC` domain list should become your SSO-discovery call; *Open cogentiq*
points at the prototype and should point at the app; the Terms and Privacy
links are `#terms` / `#privacy` placeholders.

## Carousel

- Five slides; each declares how long its sequence runs (`data-length`, in ms).
  A slide advances 2.5s after its sequence ends, so it holds 4.4–7.3s.
- Dots jump to a slide; chevrons step back and forward and wrap around.
- Every sequence restarts each time its slide comes into view.
- Keyboard focus inside the panel holds the current slide; a mouse click
  doesn't. A hidden tab doesn't advance.
- Under `prefers-reduced-motion`: no auto-advance and no animation; each slide
  shows its finished state.

## Accessibility

- The panel is `aria-roledescription="carousel"`; each slide is a labelled
  "n of 5" slide. Slide art is `aria-hidden`; headlines are real `h2`s.
- Dots carry `aria-current` and screen-reader labels; chevrons have `aria-label`s.
- The form view area is `aria-live="polite"`; errors use `role="alert"` and
  `aria-invalid`.
- Focus rings use `--strokes-type-focus` everywhere (white in the panel).

## Assets

| Files | Source |
|---|---|
| `logo-mark.svg`, `icon-*.svg`, `connector.svg`, `s1-spark-*`, `s2-spark-*`, `s2-ellipse-*`, `s2-assistant-glyph.svg`, `s3-orbit-*`, `s3-spark-*`, app logos (`notion`, `zoom`, `jira`, `google`, `salesforce`, `hubspot`, `slack`, `dropbox`, `teams.png`, `gmail.png`), `avatar-*.png`, `gemini.png` | Exported from the Figma frames unchanged. |
| `panel-gradient.png` | Figma's own render of the panel's five blended gradient layers (node `984:104608`). Browsers composite those blend modes differently from Figma, so the rendered image is used. Re-export it from Figma if the gradient changes. |
| `ctx-*.svg`, `mkt-*.svg`, `s3-hub.svg` | Drawn for the new Context and Marketplace slides and the neutral integrations hub, in the Figma icons' style: 1.5px strokes, the indigo gradient for card icons, white for tab icons, white glow for connectors. |

## Content notes

The headlines, names, numbers and copy on the showcase slides (Invoice
Validator, Revenue Insights, the context bundle counts, marketplace ratings and
installs) are illustrative, so change them freely. The marketplace items and
Context Studio artifact types come from the CogentIQ Platform prototype.
