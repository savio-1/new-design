# Collage Studio

A browser editor for scrapbook / collage style posts: layered photos, stickers, styled text, calendars and planners on a snap-to-grid canvas.

Open `studio/index.html` in a browser, or serve the folder with any static server (for example `npx serve studio`). Network access is needed for Konva (jsDelivr) and the Google Fonts it uses.

| File | What it holds |
| --- | --- |
| `index.html`, `studio.css` | App shell and editor chrome |
| `fonts.js` | 121 Google Fonts (serif, display, script, handwritten, mono) and font loading |
| `stickers.js`, `stickers-game.js` | 170 recolourable SVG stickers, including glossy game-UI icons and crystals |
| `nature.js` | Procedural garden painters (lawn hills, flower beds, bushes, hedges, trees, clouds, sky) and 9 garden backdrops |
| `render.js` | Canvas renderer for every element type, used by both the editor and export |
| `app.js` | Editor core: stage, selection, snapping & guides, transforms, text editing, crop, history, import |
| `bgremove.js` | On-device background removal (RMBG-1.4 via ONNX Runtime Web) |
| `video.js` | Frame-by-frame video export (WebCodecs H.264 → MP4 or VP9 → WebM, MediaRecorder fallback) |
| `ui.js` | Panels, inspector, popovers, dialogs |
| `templates.js` | 55 templates plus text, paper, planner, photo-layout and background presets |

Work is autosaved to the browser (IndexedDB). Use **Project → Save project file** to keep a portable `.studio.json`.

## Layout of the editor

- **Top bar**: menu (new, open, save, canvas size, shortcuts), name, undo/redo, **Animate** and **Export**.
- **Left rail**: Templates, Elements (garden, ribbons, lines, shapes, paper, calendars, camera overlays, stickers), Text, Photos, Canvas, and Layers at the bottom. Each panel shows a short shelf per category with **See all**; click the active tab again to fold the panel away.
- **Inspector**: shows the common settings for the selected layer first. Less-used controls sit behind **More options**, and Effects, Motion and canvas Finish start empty with a **+** to add only what you need.
- **Dock** (bottom centre): select, hand (`H`), add text, shapes, photos, eraser. Zoom and grid/snapping live bottom right.

## Ribbons, garden and camera looks

- **Ribbons**: bands or thin lines with text running along a path (wave, loop, swoosh, arc, S-curve, spiral, circle…). Double-click one to drag its points, add points from the midpoints, or double-click a point to remove it. *Text flow* makes the words travel along the ribbon; *Draw on* grows lines and arrows in.
- **Garden**: painted lawns, flower beds and clouds are layers you can stack behind a cut-out photo; add a **Ground shadow** to the photo to stand it on the grass.
- **Photo looks**: Motion blur (with direction), Noise, Fisheye, plus presets such as Gym grit, Ghost, Haze and Lens.
- **Camera overlays**: phone camera interface, camcorder and viewfinder, with an optional wide-lens black edge and editable labels.

## Video templates and camera

- **Template families**: variations of one idea show as a single card with a style count; click it to see every style. Video templates carry a *Video* badge and play when you hover them.
- **Newspaper reveal** (pull-back, crash zoom, snap zoom, hard cuts, slow push-in), **Typing** (type & follow, typed note, crash zoom, terminal), **Match cut** (keyword, night edition, newsprint flicker), **Kinetic headline** (good news, big reveal, pop words), **Sticky notes** (colour cut, stack, flip-book) with photos printed onto the notes, **Rolling numbers** (years, countdown, price drop), **Word by word** (italic VHS, bold statement, soft whisper) and **Letter bounce** (everyone, glitch hello, pastel).
- **Text entrances**: letters slam / rise / drop / fade in one by one; slide-ins get motion blur automatically; *Captions* shows one line of a text layer at a time for subtitles; *Roll through lines* rolls them up like a counter (optionally speeding up); *Word by word* pops one word at a time; *Letters bounce in* types with each letter landing low and snapping up.
- **Sticky note frame** prints a photo onto the note like ink; **Window-blind shadows**, **VHS scanlines** and **RGB split** are canvas finishes.
- **Camera** (Canvas panel on the right with nothing selected, or Animate → Camera): push-in, pull-back reveal, whip, snap, crash in & out, follow the typing, hard cuts, handheld drift, pan, Dutch tilt, jolt cuts and spiral. Pick what it focuses on, zoom, timing, tilt, handheld shake and motion blur. The camera only frames the layout; it never moves your layers.
- **Typing** (Motion → Typing on a text layer): types at a steady pace with a cursor; tap words to highlight them as a text selection, marker or underline.
- **Show / hide timing** (Motion): make a layer appear and leave at set times. Layers that take turns create match cuts.
- **Layer blur** (Effects): Gaussian and directional blur on any layer.

## Background removal

Select a photo and choose **Remove background** (or **Cut out to layer** to keep the original underneath). The background photo can also have its subject cut out onto its own layer, which makes text-behind-the-subject layouts easy. It runs entirely in the browser with BRIA's [RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4) model: the first use downloads about 44 MB from Hugging Face, which is then cached in IndexedDB. RMBG-1.4 is licensed for non-commercial use; check BRIA's terms before using it commercially. Face slots on outfit figures also use the 1.3 MB [UltraFace](https://github.com/onnx/models/tree/main/validated/vision/body_analysis/ultraface) detector (MIT) to keep just the head.

## Erasing, animation and video

- **Eraser** (`E`): paint over any layer with a round or square brush to erase it; switch to *Restore* to paint it back. Erasing is stored per layer, so it survives moving and resizing and can be reset.
- **Copy & paste**: `⌘/Ctrl C` and `⌘/Ctrl V` copy layers (also through the system clipboard), pasted images become photo layers and pasted text becomes a text layer. **Alt-drag** leaves a copy behind; hold **Ctrl** while dragging to skip snapping.
- **Animation**: every layer can have a loop (stop-motion wiggle, float, jiggle, sway, swing, spin, pulse, bounce, shake, orbit, blink) and an entrance (pop, fade, slide, drop, zoom, spin, typewriter, wipe). **Animate** in the top bar applies a look to every layer at once. Loops fit a whole number of cycles into the video length so exports loop seamlessly.
- **Export**: images and videos at 720p, 1080p, 1440p or 4K (2160 px on the short side). Video is MP4 (H.264) where the browser can encode it, otherwise WebM.

## Fonts and outfits

- **Your fonts**: upload `.otf`, `.ttf`, `.woff`, `.woff2` files or a `.zip` from the font picker or the Text tab. They are registered with the FontFace API, kept in this browser only, and packed into saved project files. Commercial fonts are deliberately not bundled in this repo.
- **Outfits** (`outfits-girls.js`, `outfits-boys.js`): neck-down outfit bodies plus shoes, bags and accessories. Adding one also adds an oversized face slot; a selfie dropped into it is cut out and trimmed to the head automatically for the "big head" look.
