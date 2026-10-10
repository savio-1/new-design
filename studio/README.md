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

Work is autosaved to the browser (IndexedDB). Use **Menu → Download project file** to keep a portable `.studio.json`.

## Home page and your designs

The app opens on a home page:

- **Start something new**: one click for a portrait post, square post, story/reel or landscape canvas, start from a photo (click or drop), or pick any custom size and colour. Templates sit below, grouped into families, with the same tag filters as the editor.
- **Your designs**: every design you start is kept as its own project in this browser, with a thumbnail, its size and when it was last edited. Tabs split them into **Drafts** (everything autosaves as a draft) and **Saved** (press ⌘S / Ctrl+S, click the *Draft* chip next to the design name, or use *Mark as saved*). Sort by last edited, newest or name, and search by name.
- Each card's **⋯** menu opens, renames (or double-click the name), duplicates, moves between drafts and saved, downloads the project file or deletes — with an Undo right after deleting.
- **Menu → Home — all designs** (or *Back to editor* on the home page) moves between the two. Opening a `.studio.json` file adds it to your designs.

Designs live in this browser's storage, so clearing site data removes them — download project files for anything you want to keep elsewhere.

## Layout of the editor

- **Top bar**: menu (new, open, save, canvas size, shortcuts), name, undo/redo, **Animate** and **Export**.
- **Left rail**: Templates, Elements (garden, ribbons, lines, shapes, paper, calendars, camera overlays, stickers), Text, Photos, Canvas, and Layers at the bottom. Each panel shows a short shelf per category with **See all**; click the active tab again to fold the panel away.
- **Inspector**: shows the common settings for the selected layer first. Less-used controls sit behind **More options**, and Effects, Motion and canvas Finish start empty with a **+** to add only what you need.
- **Dock** (bottom centre): select, hand (`H`), add text, shapes, photos, eraser. Zoom and grid/snapping live bottom right.

## Ribbons, garden and camera looks

- **Ribbons**: bands or thin lines with text running along a path (wave, loop, swoosh, arc, S-curve, spiral, circle…). Double-click one to drag its points, add points from the midpoints, or double-click a point to remove it. *Text flow* makes the words travel along the ribbon; *Draw on* grows lines and arrows in.
- **Garden**: painted lawns, flower beds and clouds are layers you can stack behind a cut-out photo; add a **Ground shadow** to the photo to stand it on the grass.
- **Photo looks**: Noise, Fisheye, plus presets such as Gym grit, Ghost, Haze and Lens.
- **Studio look** (on any photo): the person is cut out once (with the background-removal model) and re-lit on a seamless studio backdrop — presets Ember, Spotlight, Blue hour, Clay, Studio grey, Lime, Noir and Blush, with light type (soft key, spotlight, side, top, flat), backdrop/shadow/light colours, brightness, how much the person takes on the backdrop colour, rim light and a soft wall shadow. It never changes the original photo and can be switched off. The *Studio portrait* templates use it.
- **Blur** (its own section on any photo): None, Motion, Zoom, Spin, Soft, Tilt-shift or Double, with an amount slider and the controls that type needs — direction, the centre point, or the sharp focus band.
- **Film gate frame** (Frame → *Film gate*): a projected-film border — dark gate, rounded corners and a soft burnt-in edge. Set its colour and border width, and under *More options* the corner roundness and how soft the edge is.
- **Halation** (Look → *Halation*, or the slider under Adjust → Lens): the red-orange glow that bleeds around highlights on film — city lights, sun, white skies. Works on photos and the canvas background.
- **Blur spots**: under Blur → *Where*, choose *Everywhere*, *On spots* (blur only around chosen points) or *Off spots* (keep those points sharp and blur the rest). *Place on photo* lets you click the photo to drop spots, drag a spot to move it, drag its ring handle to resize and double-click to remove (Esc when done). Each spot also has a size slider, *Softness* sets how gently the blur fades, and background photos get position sliders instead.
- **Camera overlays**: phone camera interface, camcorder and viewfinder, with an optional wide-lens black edge and editable labels.

## Selecting layers

- **Shift** + click adds a layer to the selection; **Shift** + drag draws a box that adds every layer it touches — even when you start the drag on top of a photo. A layer that surrounds the whole box (like a full-bleed background photo) is left out.
- **Alt / Option** + click removes a layer from the selection; **Alt** + drag from an empty part of the canvas removes everything the box touches. Alt-dragging a selected layer still drops a copy.
- **Measure distances**: with a layer selected — or while dragging it — hold **Alt / Option** to see red measurement lines with the distance in pixels to each canvas edge. Point at another layer while holding Alt to measure the gaps to that layer instead.
- **⌘ / Ctrl** + click toggles a layer. The same Shift / Alt / ⌘ rules work in the Layers panel.

## Text slides

One **Text slides** family holds 69 typographic quote posters in the style of Pinterest/Instagram carousel slides — every layout from the reference board: staggered Helvetica-style lines on electric blue, words with photo chips set inline, zigzag lines on denim, red reminder notes on lined paper, a redacted paragraph with one phrase left un-struck, grey line highlights (“Chapter : 1”), tape-label slogans, blurred repeated words, a duotone eye in a square, a photo clipped into a star, a pen-scribble page, a text silhouette beside a typewriter quote, embossed serif titles and more. Every word is an ordinary text layer and every photo is a replaceable photo layer. New building blocks they use: a **Pen scribbles** background pattern and a **Person** silhouette shape. The second set (laziest designer, Go for it, Things we should normalize, The time is NOW, Let it happen, All we have are memories, Think big and more) uses free typefaces picked to match the originals: Arimo (Helvetica/Arial metrics), Inter Tight, Roboto Condensed and Archivo Narrow for condensed grotesks, Anton, Antonio and League Gothic for compressed poster type, Covered By Your Grace, Caveat Brush and Permanent Marker for hand lettering, Young Serif, Fraunces, Gloock and Newsreader for the serifs, Silkscreen for pixel type, Yellowtail for the script. Commercial originals (Helvetica Neue, Druk, Cooper and similar) aren't bundled.

## Video templates and camera

- **Speed flashes** (template family + an element): fast, motion-blurred action shots cut over your own photo or video, like the hustle-edit reels. Four templates — *Against the world* (serif quote over a side profile), *No days off* (mono gym flashes with a white pop on every cut), *Run your race* (orange-tinted running shots, word by word) and *Built different* (supercars and city lights, letterboxed). Add flashes to any design from **Elements → Speed flashes**. A background photo or video can be removed from the Canvas panel (the bin next to *Replace*, or *Remove photo* under the background photo), from the left Canvas tab, or from the flashes *Underneath* card — with Undo right after. Clicks on the canvas pass through the flashes to your photo or video underneath (select the flashes from Layers, or *Edit the speed flashes on top* in the photo panel); the flashes panel opens with an **Underneath** card to replace that photo or video. Pick a photo pack (Hustle mix, Run, Gym, Fight, Drive, Play, Rise) or add your own photos, then set cuts per second, blur amount and direction, strength and blend (Light, Punchy, Soft, Solid), colour / mono / tint, and under *More*: drift, push-in, overlap (two photos at once), flash on cut, gaps that let your shot breathe, contrast and shuffle.
- **Videos as photos**: anywhere a photo goes — a photo layer's *Replace*, the Photos panel, drag and drop, or the canvas background — you can drop in a video (mp4 / mov / webm, up to 120 MB). It plays with the design when you preview, and video export seeks it frame by frame so it stays in sync. *Playback* sets where it starts, its speed and whether it loops; the design's length grows to match the clip (up to 30 s). Videos play muted and export without sound. Your browser has to be able to play the file (iPhone HEVC .mov files may need converting to H.264 first).

- **Template families**: variations of one idea show as a single card with a style count; click it to see every style. Video templates carry a *Video* badge and play when you hover them.
- **Newspaper reveal** (pull-back, crash zoom, snap zoom, hard cuts, slow push-in), **Typing** (type & follow, typed note, crash zoom, terminal), **Match cut** (keyword, night edition, newsprint flicker), **Kinetic headline** (good news, big reveal, pop words), **Sticky notes** (colour cut, stack, flip-book) with photos printed onto the notes, **Rolling numbers** (years, countdown, price drop), **Word by word** (italic VHS, bold statement, soft whisper) and **Letter bounce** (everyone, glitch hello, pastel).
- **Text entrances**: letters slam / rise / drop / fade in one by one; slide-ins get motion blur automatically; *Captions* shows one line of a text layer at a time for subtitles; *Roll through lines* rolls them up like a counter (optionally speeding up); *Word by word* pops one word at a time; *Letters bounce in* types with each letter landing low and snapping up.
- **Sticky note frame** prints a photo onto the note like ink; **Window-blind shadows**, **VHS scanlines** and **RGB split** are canvas finishes.
- **Camera** (Canvas panel on the right with nothing selected, or Animate → Camera): push-in, pull-back reveal, whip, snap, crash in & out, follow the typing, hard cuts, handheld drift, pan, Dutch tilt, jolt cuts and spiral. Pick what it focuses on, zoom, timing, tilt, handheld shake and motion blur. The camera only frames the layout; it never moves your layers.
- **Typing** (Motion → Typing on a text layer): types at a steady pace with a cursor; tap words to highlight them as a text selection, marker or underline.
- **Text in videos** is typed in the side panel: select a text layer (or double-click it) to get its text box, or, with nothing selected, edit every piece of text in the video under *Text in this video*.
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

## Photo credits

The speed-flash photo packs and the demo portraits in `flashes.js` are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license) (free to use, attribution not required). Image ids, for credit — each one is `https://images.unsplash.com/photo-<id>`:
`1461896836934-ffe607ba8211`,
`1526676317768-d9b14f15615a`,
`1696536823512-79d724454616`,
`1698671823406-035c77ff6fcd`,
`1758922769578-68c5ba000d87`,
`1766970096346-937852c7d350`,
`1517836357463-d25dfeac3438`,
`1521804906057-1df8fdb718b7`,
`1526506118085-60ce8714f8c5`,
`1541534741688-6078c6bfb5c5`,
`1581009146145-b5ef050c2e1e`,
`1599058917212-d750089bc07e`,
`1605296867304-46d5465a13f1`,
`1509563268479-0f004cf3f58b`,
`1517438322307-e67111335449`,
`1622599511051-16f55a1234d0`,
`1506719040632-7d586470c936`,
`1555532686-d0fccaccadcf`,
`1589240508375-8ad32cfcfcf4`,
`1690984651796-6bbb102fbf30`,
`1505811210036-052144988918`,
`1611416457332-946853cc75d6`,
`1452573992436-6d508f200b30`,
`1508087625439-de3978963553`,
`1560272564-c83b66b1ad12`,
`1715900677967-fb67cee16359`,
`1574629810360-7efbbe195018`,
`1634040843188-5ca36cf26cc1`,
`1639938794001-bcc9e3770fd4`,
`1761027436967-63584b301a77`,
`1607017137021-5dc7e8cd4317`,
`1633106485777-eaa336fb40df`,
`1770664612860-1f69b26b1682`,
`1614010966237-74489a16848b`,
`1603437873662-dc1f44901825`,
`1774031476314-7284990b1424`,
`1652995023370-15f2fe166652`,
`1765710307817-db7fd96602d4`,
`1636137351259-fbe4b2a94244`,
`1463947628408-f8581a2f4aca`.
