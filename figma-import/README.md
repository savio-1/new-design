# HTML → Figma

Turns rendered HTML pages (Claude artifacts, prototypes, anything a browser can open) into editable Figma frames: frames, text, vector icons and images, with every colour bound to a variable that has **Dark** and **Light** modes.

A page converts in 2–8 seconds and imports in a few more. Nothing is drawn by hand.

```
page.html ──html-to-figma.js──▶ page.figma.json ──Figma plugin──▶ editable frame
                (Playwright)        (one file, images inside)
```

## 1. Convert pages

Install once:

```bash
cd figma-import && npm install && npx playwright install chromium
```

Convert one or more pages:

```bash
node figma-import/html-to-figma.js path/to/page.html --themes --collection CogentIQ
```

The `.figma.json` files land in `figma-import/exports/`, which git ignores.

| Option | What it does |
| --- | --- |
| `--themes` | Capture the page in dark **and** light, and bind colours to variables (see below). |
| `--collection <name>` | Variable collection to create or reuse (default `Theme`). Use the same name for every page of a product so they share one set of tokens. |
| `--width <px>` | Viewport width (default 1440). |
| `--screen --height <px>` | Capture just the viewport. Use this for app shells that scroll inside a panel (the CogentIQ pages take `--screen --height 990`). Without it, the whole page is captured. |
| `--light-js "<js>"` / `--dark-js "<js>"` | How to switch theme (default: `data-mode="light"` / `"dark"` on `<html>`, which is what the CogentIQ pages use). |
| `--selector <css>` | Convert one element instead of the page. |
| `--name <text>` | Frame name (default: the page title). |

## 2. Import into Figma (plugin)

One-time setup, in the Figma **desktop** app: **Plugins → Development → Import plugin from manifest…** and pick `figma-import/plugin/manifest.json`.

Then, in any file: **Plugins → Development → HTML → Figma importer**. Drop in one or more `.figma.json` files and click **Import**. Each page becomes a frame placed to the right of what's already on the canvas.

## Themes and variables

With `--themes` the converter reads every colour custom property on the page (`--backgrounds-page-bg-1`, `--strokes-card-default`, `--text-primary`, the `--grey-*` / `--blue-*` palette and so on) in both themes. It then renders the page twice and pairs each colour with its light-mode counterpart.

In Figma, each pair is bound to a variable in the collection:

- **Exact token match:** the token's own variable, e.g. `backgrounds/page-bg-1`, `text/primary` or `palette/blue/500`. Fills prefer `backgrounds/`, borders `strokes/` and text `text/` when several tokens share a value.
- **No token match:** a variable under `derived/` that holds the dark and light values seen on the page. These are colours the CSS mixes or hard-codes.
- **Images that differ by theme** (masked glows, canvas art): a dark layer and a light layer, with visibility bound to `mode/is-dark` and `mode/is-light`.

Fills, borders, text, icon vectors, gradient stops and shadows all bind. Each frame is set to Dark; change its mode in the right panel (**Layer → Appearance → collection → Light**) to see the light version.

## Limitations

- Layout is absolute (frames at their rendered positions), not auto-layout.
- CSS masks have no Figma equivalent, so a masked element is imported as an image of just that element.
- Hover, focus and other interaction states aren't captured; only the page as it first renders.
- A font must exist in Figma to be used. Missing families fall back to Inter.
- Repeating background patterns (dot grids drawn with `background-size`) come through as a single gradient, not a tiled pattern.
- `text-overflow: ellipsis` isn't reproduced; the text is clipped by its frame instead.

## From a Claude Code session (no plugin)

A cloud session can't run the plugin, but it can import through the Figma MCP connector. The page data travels as a small PNG through the same upload route as the images, so the build call stays a few KB however big the page is:

1. `node figma-import/claude-session.js count <bundle>` gives N. Call `upload_assets` with `count: N`.
2. `node figma-import/claude-session.js upload <bundle> <submitUrl …>` POSTs everything and writes `<bundle>.loader.js`.
3. Pass that file's contents to `use_figma`. It builds the whole page in one call and removes the temporary upload frames.

For many pages, `count-many` / `upload-many` upload each distinct image once, pack several pages per data file (`--per-call`, default 4), and lay the frames out in a grid (`--cols`, `--origin x,y`). The 12 CogentIQ inner pages, about 4,500 layers, went in with one upload request and one build call of about 25 seconds.
