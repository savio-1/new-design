# Cogentiq design system — reference

Compiled from the branches and chats up to 2026-10-12. The canonical source is `design-system/cogentiq-design-system.css` (v0.1, ~1800 lines, extracted from the Model Hub build) on branch `claude/cogentiq-combine-pages-rv39kk`. When this doc and that file disagree, the file wins.

## Where things live

| What | Where |
|---|---|
| CSS library | `cogentiq-combine-pages-rv39kk:design-system/cogentiq-design-system.css` (started on `model-hub-page-80b7di`; copies split into `css/01-tokens.css` in the agents and automations handoffs) |
| Docs pages | `design-system/*.src.html` + `docs-chrome.css`, built by `build-design-system.py` and `build-nav-guidelines.py`. Don't edit the generated `*.html` |
| Figma variable exports | `cogentiq-home-page-ak5084:Dark.tokens.json` / `Light.tokens.json` (W3C token JSON, 272 tokens each: primitives Grey 50–1000 and Blue/Purple/Pink/Cyan/Indigo/Green/Red/Yellow/Light Green/Orange 100–1100; semantic Text, Backgrounds, Strokes) |
| Older light-default version | `cogentiq-design-page-bkho2s:handoff/css/1-tokens-and-base.css` |
| Light-only landing-page spec | `figma-design-guidelines-z68u27:ARTIFACT_LANDING_PAGE_GUIDELINES.md` |
| DS reference page (92 tokens, 63-symbol sprite) | `monitoring-screen-activity-lbl7sp:design-system.html` · https://claude.ai/code/artifact/db66a8ab-9520-471b-ac88-3a54dc2a24e5 |
| Artifacts | Design System https://claude.ai/code/artifact/edb3664e-d248-4a96-9e7b-894bad13157d · Page Guidelines https://claude.ai/code/artifact/32738800-342f-461d-9792-9852122f7dae · Nav guidelines https://claude.ai/code/artifact/78c121d8-096d-4b13-a2f3-581fcc07c03e · Left-nav panel https://claude.ai/code/artifact/6761014c-dcbc-4ac9-8b65-6ca5461c1b23 |

Starter prompt for a new module (from the DS page):
> Build the <module> page for Cogentiq. Layout rules: <Page Guidelines URL> Components and tokens: <Design System URL> Read both, then use the cq- shell and component classes only. Add a token rather than hard-coding a colour, and support both themes.

## Usage

- `<link href="cogentiq-design-system.css">`, `<body class="cq">`, and `<html data-mode="light">` for light. **Dark is the default.** Theme is stored in `localStorage['cq-theme']`.
- Library classes use the `cq-*` prefix. Page-local classes get their own prefix (`mon-`, `ag-`, `au-`, `al-`, `ck-`).
- Token names match the Figma variables one-to-one. Keep the misspelling `--text-teritiary`.

## Typography

- **Geist** for UI (400/500), **Geist Mono** for identifiers, model ids, keys and all figures (`tabular-nums`). Stack: `"Geist","Inter",-apple-system,…`. Loaded from Google Fonts; handoffs should self-host.
- Letter-spacing slightly negative (e.g. −0.56px at 14px). Marketing headlines are tighter still (≈ −0.05em, line-height 0.92–1.0).

| Class | Size / line-height |
|---|---|
| `cq-subhead1-med` | 24/32 |
| `cq-subhead2-med` | 18/24 |
| `cq-body1-med` / `-reg` | 16/24 |
| `cq-body2-med` / `-reg` | 14/20 |
| `cq-caption-med` / `-reg` | 12/16 |
| Caption2 | 10/14 |

## Colour tokens (dark / light)

| Token | Dark | Light |
|---|---|---|
| `--backgrounds-page-bg-1` | #121212 | #fafafa |
| `--backgrounds-page-bg-2` (cards, modals) | #212121 | #ffffff |
| `--backgrounds-page-bg-3` (tiles, table header) | #1b1b1b | #f5f5f5 |
| `--backgrounds-page-bg-4` (content ground) | #121212 | #f0f0f0 |
| `--backgrounds-card-bg-1…5` | #121212 / #212121 / #323232 / #323232 / #1b1b1b | #fafafa / #fff / #fff / #f5f5f5 / #fff |
| `--backgrounds-button-primary` | #0d99ff | #0d99ff |
| tonal-1 (hover) | #093077 (#0a4390) | #e5f4ff (#bde3ff) |
| tonal-2 (hover) | #323232 (#424242) | #f5f5f5 (#eeeeee) |
| `--backgrounds-table-select` | #0d193f | #e5f4ff |
| badge blue / cyan / green / indigo / light-green | #09112b / #051b29 / #031d11 / #0b0f2e / #14280c | #f2f9ff / #effcff / #ebffee / #f0f1fe / #f1f8e9 |
| `--strokes-card-default`, `--strokes-line-1` | #424242 | #eeeeee |
| `--strokes-line-3` (hairline) | #323232 | #f5f5f5 |
| `--strokes-type-default` / hover / focus | #424242 / #616161 / #007be5 | #e0e0e0 / #9e9e9e / #0d99ff |
| `--strokes-card-selected` | #0d99ff | #0d99ff |
| `--strokes-icon-default` | #9e9e9e | #616161 |
| `--text-primary` | #ffffff | #121212 |
| `--text-secondary` | #bdbdbd | #616161 |
| `--text-teritiary` | #8c8c8c | #8c8c8c |
| `--text-button-tonal-1` | #80caff | #007be5 |
| `--text-coloured-blue / cyan / green / indigo / light-green` | #44aaf3 / #35caf0 / #85e0a3 / #a0a5f7 / #7cb342 | #0d99ff / #00a2c2 / #14ae5c / #5860ed / #689f38 |

**Accent rule:** the only UI accent is Blue/500 `#0d99ff`. Other hues are only for per-item identity: icon tiles, badges, charts, avatars (indigo-500).

**Ramps in the CSS:** Blue 300 #bde3ff, 500 #0d99ff, 600 #007be5, 700 #0768cf · Indigo 300 #c2c5fa, 500 #5860ed, 600 #454de0 · Purple 300 #e4ccff, 400 #d9b8ff, 500 #9747ff, 600 #8638e5 · Orange 300 #fcd19c, 600 #fc9e24, 800 #dd7c0e · Green 300 #aff4c6, 500 #14ae5c, 600 #009951 · Cyan 400 #75d7f0.

**Only in the Figma JSON:** Red/500 #F24822, Red/600 #DC3412, Pink/500 #E91E63, Yellow/900 #FF8F00 (rating star), Orange/500 #FFA629, Cyan/500 #00A2C2, Light Green/500 #8BC34A. Declare any missing step in the page's `:root`; an undefined var silently kills a gradient. Never define a colour only inside a `[data-mode]` block.

**Grey:** 50 #FAFAFA, 100 #F5F5F5, 200 #EEEEEE, 300 #E0E0E0, 400 #BDBDBD, 500 #9E9E9E, 550 #8C8C8C, 600 #757575, 700 #616161, 800 #424242, 850 #323232, 900 #212121, 950 #1B1B1B, 1000 #121212.

**Special gradients**
- Tiq mark: `#0D99FF → #5860ED → #F24822 → #FFCA28 → white`.
- Context tile: purple-400 `#d9b8ff` → blue-500 → blue-600, rotating.
- Hero sky (shipped, variant #17 of 17 in `cogentiq/sky-variants/`): Orange/500 → Red/500 → Blue/500 in the `--sky-*` tokens. Avoid magenta.
- Ontology focus-node rim: `#0d99ff → #9747ff → #e91e63 → #fc9e24` (magicui rainbow-button style).

**White-label (Settings → Appearance):** primary colour, logo, name and subtitle, stored in `localStorage['cq-brand']`. It rewrites `--backgrounds-button-primary`, `--strokes-card-selected`, `--text-coloured-blue` and related tokens. Presets: Blue 500, Indigo 500, Purple 500, Pink 600, Red 600, Orange 800, Cyan 600, Green 600, Light Green 700. "Improve for contrast" acts only at lightness ≥ 80 or ≤ 12.

## Radius, spacing, layout

- Radius: `--radius-sm` 6 (tags), `-md` 8 (buttons, inputs), `-lg` 12 (cards, modals), `-xl` 14 (floating prompt bars), `-full` 9999. Card icon tiles 10px.
- Spacing on a 4px base: 4/6/8/10/12/16/20/24/32. Card gap 12, card padding 16. Dashboards: 8px gaps between cards.
- Layout tokens: `--rail-w` 68, `--rail-w-open` 240, `--sidebar-w` 240, `--panel-w` 420, `--tiq-dock-w` 360.
- Page frame: rail on `page-bg-1`; frame inset 8px with a 1px `line-3` border and radius 12; header 48px on `card-bg-5`; sidebar 240; filters bar 60; content on `page-bg-4` with padding `16px 24px 24px`, the only region that scrolls; detail panel 420 on `page-bg-2`, overlaying the content.
- Shell classes: `cq-page__{rail,main,frame,header,body,sidebar,col,bar,content}`. Content width 1076px at a 1440 window.
- Grids: never `repeat(3,1fr)`; use `minmax(0,1fr)`. `--cq-card-min` 340px gives 3 per row, 430px gives 2.

## Shadows

`--shadow-card`, `-bar`, `-sidebar` (drop-shadow filters), `-tab`, `-modal` (0 4px 12px), `-panel` (−8px 0 24px), `-rail` (8px 0 28px), `-pop` (3 layers), `-tiq` (heavy). Alpha is heavier in dark. Light card: 1px #f5f5f5 border plus `0 1px 2px rgba(33,33,33,.08)`. Avoid grey shadow "clouds" in light mode.

## Icons

- Source of truth: the Figma Iconography page (`HimR0mebP9NQmNK0LQ9MQC`, node `496-227152`). Extract the SVGs and commit the exact bytes. Fallback: Tabler Icons.
- Sizes: 20 default, 24 rail, 16 lists, 12 inline meta, 32 gradient tiles.
- One inline `<svg class="sprite">` per file, `<use href="#ic-…">`, `currentColor`. `<use>` doesn't resolve across documents. Never leave black fills inside stroke icons or hard-code `#0D99FF` in an icon.
- Rail icons have GSAP stroke draw-on hover animations (`context-studio-nav-variations-74s193`).

## Components

- **Buttons:** 5 styles × 4 sizes × 4 states, from Figma `497:233716`. Strokes are `inset box-shadow`. Each state has its own fill token (no `filter: brightness()`). Rectangles with an 8px radius.
- **Fields;** `cq-dropdown` / `cq-pop` / `cq-option`; tags and badges with `data-tone` (a tag stays grey until its parent is hovered; a badge is always coloured; tag hover changes colour only, no size jitter).
- **Avatar:** first initial only, indigo-500.
- **`cq-table`** with `--cq-cols`. The selected row gets a 1px focus stroke; no fill change on hover.
- **`cq-seg`** tabs with a sliding thumb (`.cq-seg__thumb` + `cqSegSync()`, 280ms ease-out).
- **`cq-rail` / `cq-nav-item`** (36px). Sub-items use secondary text until hover; the active icon uses `--text-coloured-blue`.
- **`cq-panel` / `cq-scrim`**, `cq-modal`, Tiq dock, `cq-menu`, `cq-tag-picker`, `cq-tag-manage`; utilities `cq-truncate`, `cq-scroll-y`. Use thin, clean scrollbars.

## Motion

- Hover 150ms ease; panels 260–280ms `cubic-bezier(.4,0,.2,1)`; rail open 120–140ms, close 200–220ms; tab crossfade 160ms.
- Periodic with rests, not constant; reduced motion is handled globally under `.cq`.

## Charts

Hand-drawn inline SVG. Check palettes with the dataviz validator. Stack order blue → green → purple; donut order red, blue, orange, purple. Avoid blue next to purple (colour-blind readers). Line strokes 1.25–1.5px; bars with a 4–6px radius; hover tooltips with numbers; sparklines green when rising, orange when falling; Geist Mono for KPI numbers (24px medium).

## Gotchas

- `filter` creates a stacking context, so popovers end up under cards.
- `card-bg-5` is white in light mode, so nested tiles need `page-bg-3`.
- `.cq-btn` `display` overrides the `[hidden]` attribute.
- Clicks inside popovers must `stopPropagation`.
- Gradients fade to the same hue at alpha 0, never to `transparent`.
- Transition replays need a `.no-anim` reset frame.
- Namespace ids when inlining one page into another.
- Canvas text measurement must rerun after `document.fonts.ready`.
- Use `scrollbar-gutter: stable` to stop sideways jumps when switching tabs.
