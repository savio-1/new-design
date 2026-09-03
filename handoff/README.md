# Cogentiq · Context — developer handoff

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
