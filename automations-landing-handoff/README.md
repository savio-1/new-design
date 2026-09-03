# Automations landing screen — dev handoff

A standalone in-product screen built on the CogentIQ `cq-` design system.
Everything here was generated from one file, `reference/automations-landing.html`,
which is the source of truth.

## Start here

1. **Open `reference/automations-landing.html` in a browser.** No build, no
   server, no dependencies — it runs from the filesystem. Hover a card, switch
   the lens, open the table view and the detail panel. That is the spec in
   motion.
2. **Read `HANDOFF.md`.** Layout geometry, the card, states, filters, table,
   panel, accessibility, and a short list of things that were bugs before they
   were decisions (§5.2 especially).
3. **Read `data/schema.md`** if you're wiring a backend.

## What's in the box

```
README.md            this file
HANDOFF.md           the implementation spec — measurements, states, gotchas
reference/
  automations-landing.html   the working screen, verbatim
css/
  01-tokens.css      design tokens, both themes            (~13 KB)
  02-system.css      the cq- component library             (~69 KB)
  03-screen.css      this screen's own styles              (~29 KB)
js/
  screen.js          data, render, filters, panel, theme    (~54 KB)
  shell.js           rail nav + cross-screen theme sync     (~10 KB)
data/
  automations.json   the 15 automations
  marketplace.json   the 9 templates
  enums.json         every closed set (status, type, tags, …)
  schema.md          field-by-field contract
assets/
  icons.svg          70 symbols — inline once, then <use href="#id">
```

## About the split files

`css/` and `js/` are a **split of the reference file, not a rewrite** — the
rules and functions in them are byte-identical to the blocks they came from,
verified on extraction. They exist so you can drop them into a real project
without unpicking one 244 KB HTML file. If the two ever disagree, the reference
file wins.

Load order matters: `01-tokens` → `02-system` → `03-screen`.

The wrapper element must keep the `cq` class — the system's reset,
focus-visible styling and the global `prefers-reduced-motion` rule are all
scoped to it.

## What is deliberately not here

- **The checkpoint queue.** It is its own screen. Rows and panel steps with
  someone waiting link out to it.
- **The canvas flow preview.** Removed from these cards on purpose; the sibling
  screen still has it if you need the reference.
- **A framework.** The reference is vanilla — no React, no build step, one
  `<script>`. Port it to whatever the app uses; the spec is framework-agnostic.

## Scope of `shell.js`

Product chrome shared with the other module screens: platform-rail navigation,
the light/dark choice and its cross-screen sync, the profile menu. If you are
implementing this screen inside an app that already has those, drop `shell.js`
and keep only the `applyMode` half of the theme handling in `screen.js`.
