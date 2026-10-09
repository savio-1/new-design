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
| `bgremove.js` | On-device background removal (RMBG-1.4 via ONNX Runtime Web) |
| `video.js` | Frame-by-frame video export (WebCodecs H.264 → MP4 or VP9 → WebM, MediaRecorder fallback) |
| `ui.js` | Panels, inspector, popovers, dialogs |
| `templates.js` | 20 templates plus text, paper, planner, photo-layout and background presets |

Work is autosaved to the browser (IndexedDB). Use **Project → Save project file** to keep a portable `.studio.json`.

## Background removal

Select a photo and choose **Remove background** (or **Cut out to layer** to keep the original underneath). The background photo can also have its subject cut out onto its own layer, which makes text-behind-the-subject layouts easy. It runs entirely in the browser with BRIA's [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model: the first use downloads about 44 MB from Hugging Face, which is then cached in IndexedDB. RMBG-1.4 is licensed for non-commercial use; check BRIA's terms before using it commercially.

## Erasing, animation and video

- **Eraser** (`E`): paint over any layer with a round or square brush to erase it; switch to *Restore* to paint it back. Erasing is stored per layer, so it survives moving and resizing and can be reset.
- **Copy & paste**: `⌘/Ctrl C` and `⌘/Ctrl V` copy layers (also through the system clipboard), pasted images become photo layers and pasted text becomes a text layer. **Alt-drag** leaves a copy behind; hold **Ctrl** while dragging to skip snapping.
- **Animation**: every layer can have a loop (stop-motion wiggle, float, jiggle, sway, swing, spin, pulse, bounce, shake, orbit, blink) and an entrance (pop, fade, slide, drop, zoom, spin, typewriter, wipe). The *Animate* tab applies a look to every layer at once. Loops fit a whole number of cycles into the video length so exports loop seamlessly.
- **Export**: images and videos at 720p, 1080p, 1440p or 4K (2160 px on the short side). Video is MP4 (H.264) where the browser can encode it, otherwise WebM.
