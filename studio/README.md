# Collage Studio

A browser editor for scrapbook / collage style posts: layered photos, stickers, styled text, calendars and planners on a snap-to-grid canvas.

Open `studio/index.html` in a browser, or serve the folder with any static server (for example `npx serve studio`). Network access is needed for Konva (jsDelivr) and the Google Fonts it uses.

| File | What it holds |
| --- | --- |
| `index.html`, `studio.css` | App shell and editor chrome |
| `fonts.js` | 121 Google Fonts (serif, display, script, handwritten, mono) and font loading |
| `stickers.js` | 120 recolourable SVG stickers in 5 categories |
| `render.js` | Canvas renderer for every element type, used by both the editor and export |
| `app.js` | Editor core: stage, selection, snapping & guides, transforms, text editing, crop, history, import |
| `ui.js` | Panels, inspector, popovers, dialogs |
| `templates.js` | 20 templates plus text, paper, planner, photo-layout and background presets |

Work is autosaved to the browser (IndexedDB). Use **Project → Save project file** to keep a portable `.studio.json`.
