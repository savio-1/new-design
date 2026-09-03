#!/usr/bin/env python3
"""Split the Context app into a developer handoff package.

context-studio.html is a single self-contained page: one <style>, one
<script>, and an inline SVG sprite. A developer wants those as files, so
this splits the page at the section boundaries the page already carries
and writes them out in load order, then zips the result.

The split is positional, not a rewrite: every byte of CSS and JS lands
in exactly one file, in the same order the cascade and the script had
them, so the package renders identically to the page. The one thing
dropped is a prototype-only block for cross-page links, which the
in-page router made dead.

Run from the repository root:  python3 tools/build-handoff.py
"""
import os, re, shutil, zipfile

SRC  = 'context-studio.html'
OUT  = 'handoff'
ZIP  = 'cogentiq-context-handoff.zip'
NAME = 'cogentiq-context'

page = open(SRC, encoding='utf8').read()

# ── carve the page into its three parts ───────────────────────────────
css   = page[page.index('<style>') + len('<style>'):page.index('</style>')]
after = page[page.index('</style>') + len('</style>'):]
body  = after[:after.index('<script>')]
js    = after[after.index('<script>') + len('<script>'):after.rindex('</script>')]

def cut(text, marks, what):
    """Slice `text` at each mark in turn. Marks must appear in order."""
    out, pos = [], 0
    for mark, finder in marks:
        i = finder(text, mark, pos)
        assert i > pos, f'{what}: boundary out of order at {mark[:40]!r}'
        out.append(text[pos:i])
        pos = i
    out.append(text[pos:])
    return out

first = lambda t, m, p: t.index(m, p)
last  = lambda t, m, p: t.rindex(m)

def banner(t, label, p):
    """Start of the ═-ruled comment that introduces `label`."""
    return t.rindex('/*', 0, t.index(label, p))

CSS_PARTS = [
    ('1-tokens-and-base.css',    None),
    ('2-sidebar.css',            ('    /* ── Context sidebar (240px)', first)),
    ('3-detail-panel.css',       ('DETAIL PANEL — shared by',          banner)),
    ('4-shell-views.css',        ('    /* Layer identity hues,',       first)),
    ('5-view-studio.css',        ('    /* ── Studio column ──',        first)),
    ('6-view-glossary.css',      ('GLOSSARY — page-specific styles',   banner)),
    ('7-view-create-bundle.css', ('CREATE NEW BUNDLE — page-specific', banner)),
    ('8-responsive.css',         ('    /* ── Responsive ──',           last)),
]

JS_PARTS = [
    ('1-app.js',                 None),
    ('__shell-explainer',       ('/* ── The explainer opens itself',  first)),
    ('2-view-studio.js',        ('/* ══ VIEW: Studio',                first)),
    ('3-view-glossary.js',      ('/* ══ VIEW: Glossary',              first)),
    ('4-view-create-bundle.js', ('/* ══ VIEW: Create bundle',         first)),
    ('__dead-prototype',        ('/* ── Cross-page links',            first)),
    ('__shell-body',            ('/* ── Platform panel: hover',       first)),
]

css_chunks = cut(css, [m for _, m in CSS_PARTS if m], 'css')
js_chunks  = cut(js,  [m for _, m in JS_PARTS  if m], 'js')
assert ''.join(css_chunks) == css and ''.join(js_chunks) == js, 'lossy split'

# Four spaces of <style> indentation come off every CSS line.
dedent = lambda s: re.sub(r'^    ', '', s, flags=re.M).strip() + '\n'

files = {}
for (name, _), chunk in zip(CSS_PARTS, css_chunks):
    files['css/' + name] = dedent(chunk)

js_by_name = dict(zip([n for n, _ in JS_PARTS], js_chunks))
# The explainer is sidebar behaviour and self-contained, so it joins the
# shell rather than staying between the shared block and the views. The
# cross-page-link block is dropped: the router replaced it.
js_by_name['5-shell.js'] = (js_by_name.pop('__shell-explainer').rstrip()
                            + '\n\n' + js_by_name.pop('__shell-body').lstrip())
js_by_name.pop('__dead-prototype')
for name, chunk in js_by_name.items():
    files['js/' + name] = "'use strict';\n" + chunk.strip() + '\n'

CSS_ORDER = [n for n, _ in CSS_PARTS]
JS_ORDER  = ['1-app.js', '2-view-studio.js', '3-view-glossary.js',
             '4-view-create-bundle.js', '5-shell.js']

links   = '\n  '.join(f'<link rel="stylesheet" href="css/{n}" />'   for n in CSS_ORDER)
scripts = '\n  '.join(f'<script src="js/{n}"></script>'             for n in JS_ORDER)

files['index.html'] = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cogentiq Builder — Context</title>
  <meta name="description" content="The enterprise AI context layer — the Studio, the glossary, and the bundles an assistant reads from." />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <!-- Load order is the cascade. Keep it. -->
  {links}
</head>
<body>
{body.strip()}

  <!-- Classic scripts, not modules: 1-app.js declares $, LAYERS and the
       router in the global lexical scope and the rest read them, so this
       order matters too. 5-shell.js boots the app on its last line. -->
  {scripts}
</body>
</html>
'''

files['README.md'] = README = '''# Cogentiq · Context — developer handoff

One page, three views. `index.html` is the whole module: **Studio**,
**Glossary** and **Create new bundle** are sections in the same document,
switched in place. There are no links between them and no second URL —
`js/1-app.js` holds a small router.

Open `index.html` from disk; nothing needs a server or a build step.

## Files

    index.html                     markup for all three views, both detail
                                   panels, the artifact picker, and the
                                   inline SVG sprite
    css/1-tokens-and-base.css      design variables (light + dark), reset,
                                   type ramp, app shell, header, platform
                                   panel, page bar, shared form controls
    css/2-sidebar.css              context sidebar and its explainer card
    css/3-detail-panel.css         the 420px right panel, shared by the
                                   bundle and glossary panels
    css/4-shell-views.css          layer identity hues; the create view's
                                   full-frame layout; breadcrumb
    css/5-view-studio.css          Studio: hero, CTA, bundle cards
    css/6-view-glossary.css        Glossary: tabs, filter row, cards,
                                   table, version rows
    css/7-view-create-bundle.css   Create bundle: form, selection matrix,
                                   picker popover, footer
    css/8-responsive.css           Studio breakpoints
    js/1-app.js                    $, root, the LAYERS vocabulary,
                                   esc(), and the view router
    js/2-view-studio.js            bundle list, search, detail panel,
                                   hero pointer glow
    js/3-view-glossary.js          tabs, tag/author/date filters, card and
                                   table views, detail panel
    js/4-view-create-bundle.js     selection matrix, artifact picker,
                                   validation, counts
    js/5-shell.js                  explainer card, platform panel, theme
                                   toggle, and the boot call
    INTERACTIONS.md                every animation and interaction, with
                                   durations and easings

**Load order is the cascade and the script order.** The CSS files are
numbered because later files rely on earlier ones losing specificity
ties; the JS files are classic scripts sharing one global lexical scope,
where `1-app.js` declares what the others read.

## Design tokens

Every colour comes from a custom property named after its Figma variable
— `--backgrounds-page-bg-2`, `--strokes-line-1`, `--text-teritiary` (the
Figma spelling) — declared twice in `css/1-tokens-and-base.css`: once on
`:root` for light, once on `:root[data-mode="dark"]`. Nothing in the rest
of the CSS carries a literal colour, so wiring these to your own token
source is the whole theming job.

Type is a ramp of utility classes, also named after the Figma styles:
`.t-subhead1-med`, `.t-subhead2-med`, `.t-body1-med`, `.t-body2-med`,
`.t-body2-reg`, `.t-caption1-med`, `.t-caption1-reg`, `.t-caption2-med`.
Fonts are Geist and Geist Mono from Google Fonts.

## Theming

`applyMode('light' | 'dark')` stamps `data-mode` on `<html>` and swaps the
header toggle's icon. The choice persists in `localStorage` under
`cq-theme`. Light is the default.

## Icons

All glyphs live in one inline `<svg class="sprite">` at the top of the
body and are used as `<use href="#id">`, so they inherit `currentColor`
and theme with everything else. If you move them to an external file,
`<use>` stops resolving across documents in every browser — inline them
or hand them to your own icon component instead.

## The router

`go('studio' | 'glossary' | 'create')` shows one view, hides the others,
swaps the header's left side, and shows or hides the context sidebar.
Markup drives it: `data-view` on a sidebar row, `data-go` on anything
else (the hero CTA, the breadcrumb, Cancel). It also fires a
`cq:viewchange` event on `document` if you need to hook page-level
behaviour.

Replace it with your framework's router when you wire this up — the
views themselves do not depend on it, only on their own ids
(`#view-studio`, `#view-glossary`, `#view-create`).

## Mock data

Three arrays hold every row on screen; nothing fetches. Swap them for
your API and the renderers work unchanged.

    js/2-view-studio.js        BUNDLES, TYPES
    js/3-view-glossary.js      GLOSSARIES, ALL_TAGS, ALL_AUTHORS, DATE_RANGES
    js/4-view-create-bundle.js CATALOG, TYPES

Submit handlers are deliberately empty and marked — `#createBtn`,
`#newGlossary`, and the panels' primary buttons.

## Layer order — house rule

Wherever the three layers appear, they read **Solution › Organization ›
Domain**, narrowest scope first. One array in `js/1-app.js` drives
every list, tab strip, badge and column, so the order is set in one
place.

## Accessibility notes

Panels carry `aria-hidden`, the filter buttons carry `aria-expanded`, the
view toggle uses `aria-pressed`, tabs are a `role="tablist"`, and the
matrix cells are buttons with `aria-haspopup="dialog"`. Escape closes
every popover and panel. Focus moves into a panel's close button when it
opens; returning focus to the opener on close is left for you, since it
depends on your routing.
'''

files['INTERACTIONS.md'] = '''# Interactions and motion

Durations and easings as built. Everything is CSS transition or
`requestAnimationFrame`; there is no animation library.

## Motion tokens in use

| Purpose | Duration | Easing |
|---|---|---|
| Colour / border / shadow on hover | 150ms | `ease` |
| Panel slide-in, rail width | 260–280ms | `cubic-bezier(.4, 0, .2, 1)` |
| Explainer card open/close | 280ms | `cubic-bezier(.4, 0, .2, 1)` |
| Card lift | 150ms | `ease` |

`@media (prefers-reduced-motion: reduce)` is **not** yet handled — add it
when you implement. The two things to neutralise are the panel slide and
the hero's pointer glow.

## Platform panel (left rail)

68px crunched, 240px open. Opens on `mouseenter` after a **140ms** delay
and closes on `mouseleave` after **200ms** — the asymmetry stops a
cursor crossing the rail from flashing it open. Width animates over
260ms. The collapse button closes it immediately.

Only one category is open at a time: clicking a group head closes the
others (`aria-expanded` on `.cq-rail-ghead`).

## Header

The theme toggle swaps sun/moon and rewrites its own `title` and
`aria-label` to name the destination mode, not the current one.

## Context sidebar — explainer card

Starts **collapsed** and opens itself after **4.5s**, once the page has
settled, so it reads as an invitation rather than a wall. Once the user
touches it the timer is cancelled and their choice stands. Open and
close animate `max-height` over 280ms; the card's `gap` lives on the
body's `margin-top` instead, because a flex `gap` still applies at zero
height and left a stray gap under the collapsed card. A `ResizeObserver`
keeps the max-height honest if the content reflows.

## Studio — hero

The dot grid **lights up under the pointer**. Two stacked grids: a base
layer and a brighter copy masked by a radial gradient whose centre
follows the cursor. The cursor position is written to `--mx` / `--my` on
the glow layer and read by its mask, so nothing re-layouts; reads are
throttled to one per frame with `requestAnimationFrame`. The glow fades
to `opacity: .5` on hover and back out on leave.

Tile captions stay white in both themes — the hero keeps its own ground.

## Cards

Hover darkens the border to `--strokes-card-hover` and adds
`--shadow-card-hover`. Bundle cards also lift 2px; glossary cards do not
— list cards stay put. Selected cards take the accent border plus a 1px
ring.

## Detail panels

420px, fixed to the right edge, sliding in from `translateX(100%)` over
280ms with `visibility` switched on the same transition so a closed
panel is not focusable. The scrim behind is **transparent**: this is a
detail view, not a modal, so the list stays readable and the scrim only
catches the outside click. Escape closes. Clicking the open card closes
it again.

Opening moves focus to the panel's close button. The panel overlays the
header — as it does on Model hub and Skills — so the theme toggle is not
reachable while a panel is open.

## Glossary — filters

Three popovers, one open at a time. The button's chevron flips to
`#ic-arrowup` while open, and focus lands in the search field where
there is one.

- **Tags** — search, a create action, and a multi-select checkbox list.
- **Created by** — search and a multi-select list with avatars.
- **Any time** — single choice, ticked; picking one closes the popover.

Selected counts show as a badge on the button, which takes the
`has-count` state. Escape or an outside click closes.

The card/table toggle is `aria-pressed` on two buttons; the hidden view
uses the `hidden` attribute, which needs the
`[hidden] { display: none !important; }` rule in the reset because
`display: grid` otherwise wins over the UA default.

## Create bundle — selection matrix

Cells are **48px tall whether empty or filled**; the filled state is one
row, not a stack, so nothing reflows on pick. Empty cells are dashed;
hover takes the neutral grey and the solid border.

The picker is a 404px popover positioned against the clicked cell,
repositioned on resize and on scroll (captured, because the scroll
happens on `.cb-scroll`, not the window). It stays open after a pick so
a second choice is one click away — Escape closes it and returns focus
to the cell.

Note for reimplementation: the option list re-renders on click, which
detaches the clicked node. The outside-click handler therefore checks
`e.target.isConnected` before closing, or a pick would close the picker
by looking like a click on nothing.

Required fields turn red only after they have been touched and left
empty (`blur`), never while typing.

## View transitions

`go()` is an instant swap — no cross-fade. Two dense screens dissolved
through each other read as blur rather than motion, since the rail and
header are identical on every view. The scroll position resets to the
top on each change.
'''

# ── write ─────────────────────────────────────────────────────────────
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
for rel, text in files.items():
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf8').write(text)

with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in files:
        z.write(os.path.join(OUT, rel), f'{NAME}/{rel}')

for rel in sorted(files):
    print(f'  {rel:32} {len(files[rel]):>8,} bytes')
print(f'\n{ZIP}: {os.path.getsize(ZIP):,} bytes, {len(files)} files')
