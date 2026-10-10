# Collage Studio — project context

A browser-based editor for scrapbook / collage Instagram posts and short videos (Reels): layered
photos, text, stickers, frames, templates, animation, camera moves, and image / MP4 / WebM export.
Everything lives in `studio/`. There is no server, framework or build step for development: open
`studio/index.html` in Chrome. The other files at the repo root (`index.html`, `direction-1.html`,
`fillout-hero.html`) are unrelated older pages.

Work on this has been done on the branch `claude/charming-mendel-rchh9w`. Don't open pull requests
unless asked.

## How the owner likes to work

- Requests usually come with reference screenshots or screen recordings (Pinterest / Instagram /
  CapCut). For videos: pull frames with `ffmpeg -i in.mov -vf "fps=4,scale=440:-1,tile=4x7" sheet.png`
  and look at every variation; "add all variations" means every distinct design in the reference.
- Similar templates are grouped into one **family** card that opens into all its styles.
- UI should stay calm and minimal (Figma Buzz is the reference): common controls visible, the rest
  behind "More" or a "+" list; group by user intent.
- Every place a photo goes should also accept a video.
- Video templates with words get a text box in the inspector (not on-canvas typing).
- Match reference fonts with free Google Fonts look-alikes. Never commit commercial or trial fonts
  (Helvetica Neue, Druk, Neue Montreal, etc.); users can upload their own.
- Rude or religious slogans in references have been softened ("…stuff", "Trust the work of your
  hands"); mention such rewordings when reporting.
- After a change: test in the browser (Playwright, below), update `studio/README.md`, commit and
  push, rebuild the single file.

## Files (`studio/`)

| File | Role |
| --- | --- |
| `index.html` | Shell: top bar, left rail, panel, stage, inspector, dock, home overlay, script order. |
| `render.js` | `window.StudioRender` (R). Pure canvas-2D renderer used by the editor, thumbnails and export. Every element type, filters, frames, text layout, animation, camera, video sync. |
| `app.js` | `window.Studio` (S). Editor core: document state, Konva stage, selection, drag/resize, snapping, crop, path / spot editing, history, autosave + projects (IndexedDB), import, keyboard. |
| `ui.js` | All DOM UI: panels (Templates, Elements, Text, Photos, Canvas, Layers), inspector per element type, home page, export dialog, timeline, menus, toasts. |
| `templates.js` | `window.STUDIO_TEMPLATES` (+ text presets, paper / planner presets, backgrounds). `GROUPS` maps family name → template ids and sets the order. |
| `fonts.js` | Google Fonts catalogue (`[family, category, axes, weights, hasItalic]`), lazy loading (`ensure`), user-uploaded fonts (IndexedDB, packed into project files). |
| `stickers.js`, `stickers-game.js`, `outfits-*.js` | SVG sticker library (`window.STICKERS`). |
| `nature.js` | Painted garden / sky / flower painters (`window.StudioNature`). |
| `flashes.js` | Bundled photos as data URLs: speed-flash packs (`IMG`, `PACKS`), demo portraits (`DEMO`), text-slide backdrops. All from Unsplash (credited in README). |
| `filmphotos.js` | Film-style demo photos (`window.StudioFilm.IMG`), registered as `film-<key>` assets for the Film looks / Film camera templates. |
| `bgremove.js` | Background removal and the "studio look" cut-out (onnxruntime-web + RMBG-1.4 from Hugging Face). |
| `video.js` | Video export: frame-by-frame render → WebCodecs → mp4-muxer / webm-muxer; MediaRecorder fallback. |
| `studio.css` | All styling; colour tokens on `:root`, dark mode via `prefers-color-scheme`. |
| `vendor/` | Konva, muxers, JSZip — inlined into the single-file build so it works offline. |
| `tools/build_single_file.py` | Builds `dist/collage-studio.html` (everything inlined). |
| `tools/smoke_test.js` | Playwright smoke test: loads the app, renders every template, reports errors. |
| `dist/collage-studio.html` | The portable app (copy to any laptop, double-click). Rebuild after changes. |
| `README.md` | User-facing feature guide. Keep it current. |

## Document model

```js
doc = {
  width, height,
  background: { color, color2, gradient, angle, assetId, crop, filters, imageOpacity, video, pattern, texture, crumple, scene },
  overlay: { grain, vignette, tint, leak, blinds, scanlines, rgb, … },     // finish over everything
  anim: { duration, fps },                                                // video length
  camera: { move, target, zoom, start, dur, rotate, shake, blur, … } | null,
  elements: [ … ],                                                        // bottom → top
}
```

Every element: `{ id, type, x, y, width, height, rotation, opacity, blend, hidden, locked, name, shadow,
anim?, time?, lblur?, erase? }` plus type fields. Defaults live in `DEFAULTS` in `app.js`
(`S.mk(type, over)` builds one, `normalize` fills missing fields on load). Types:

- `text` — text, font, `bg` (box / pill / lines / marker / tape / … highlight styles), stroke, echo, curve, typing marks.
- `image` — `assetId`, `crop {zoom,x,y,fit}`, `filters`, `frame {style,color,size,radius,…}`, outline, studio look, `video {trim,end,speed,loop}` when the asset is a video, `seq {ids,fps,mode,jitter,still}` for stop motion.
- `sticker`, `shape` (incl. `person`, `torn`, `burst`, …), `calendar`, `badge`, `checklist`.
- `ribbon` — text on a Catmull-Rom path (also lines, arrows, marker marks).
- `camera` — phone / camcorder overlay. `nature` — painted scenery.
- `flashes` — speed-flash overlay: photo pack or own photos cut fast with motion blur.

Animation: `el.anim {enter, loop, delay, speed, amount}`; `el.time {start, end, cycle}` for cuts;
`R.hasAnim(el)` decides whether something moves. Text sequence modes (captions, roll, words) show one
piece at a time.

**Assets** are data URLs in `assets[id]` (app.js), never inside `doc`. Ids starting `demo-` and `img-`
are the bundled photos from `flashes.js`, `film-` from `filmphotos.js`, registered at start-up so templates can use them.
`data:video/…` assets are videos (`R.isVideoAsset`); the renderer draws them through a muted
`<video>` and `R.syncVideos` seeks frames exactly during export.

## Rendering

- `R.renderDoc(doc, { scale, canvas, time, transparent })` draws a whole frame; `time` null = the still
  editing layout. Export, thumbnails, home-page previews and the editor all share it.
- The editor wraps each element in a `Konva.Shape` whose `sceneFunc` calls `R.drawElement(ctx, el, { editor: true })`.
  Background and overlay are separate shapes. Camera moves transform the `art` / `bgCam` groups.
- Photo filters are pixel operations cached in `filteredSource` (key = asset + filter values; video
  frames use a single-slot cache, graded at 720 px while previewing and 1280 px for export). Add new
  filter keys to `FILTER_KEYS`, then show them in `adjustSection` / `filmSection` (ui.js) and, for
  presets, `R.FILTER_PRESETS` + a shelf in `R.FILTER_GROUPS`. Draw-time photo finishes (vignette, grain,
  light leak, dust) live in `overlays()` (`R.photoFinish`) and get a time only for time-varying layers.
- Film effects over the whole canvas (`doc.overlay`: grain + grainSize, dust, burn, flicker, leak) are
  painted in `drawOverlay(ctx, doc, t)`; `overlay.weave` (gate weave) is applied in `camAt` like a
  camera move. `R.hasFilmMotion(doc)` (weave / flicker) makes a design count as a video.
- Frames: add a case to `frameGeometry` (returns `outer`, `inner` clip, `rect`, optional `extra` painter; starting size and colour in `FRAME_START`, ui.js)
  and a label in `R.FRAMES`.
- New element type: `DEFAULTS` + `S.elLabel` (app.js), a `drawCore` case and `bleedCore` (render.js),
  an inspector in the `fn` map in `renderInspector` (ui.js), an Elements panel entry if users add it.

## Editor (app.js) essentials

- State: `doc`, `sel` (ids), `elMap`, `nodes`. Change things with `S.change(target, path, value, live)`
  (`target` = `'doc'` or `'sel'`), `S.changeEl(el, fn)`, then `S.commit()` for history.
- Events (`S.on`): `selection`, `values`, `doc`, `history`, `change`, `time`, `playstate`, `projects`,
  `project`, `name`, `templates`, `view`, `uploads`, `replaced`, `spotedit`, `pathedit`, `fonts`, `toast`.
- Import: `S.pickImages(opts)` / `S.importFiles(files, opts)` (photos and videos; `replaceId`,
  `asBackground`, `uploadOnly`+`onAdded`, `startFromPhoto`, `imagesOnly`).
- Projects: each design is a project in IndexedDB (`project:<id>` + a `projects` index with thumbnails,
  status draft / saved). `S.projects.*`, `S.saveNow()`. Opening the app shows the home page.
- My templates: `S.myTemplates.*` (save / add / rename / remove / restore) stores a snapshot of the canvas
  under `template:<id>` + a `templates` index (thumbnail, size, video). Bundled `demo-/img-/film-` photos are
  left out of the snapshot. ui.js turns them into template-like objects (`myTpls`, `t.mine`) so
  `templateCard`, `useTemplate` and pieces work unchanged; a file with `kind: 'template'` opened through
  *Open file* is added to My templates instead of opening as a design. Event: `templates`.
- Selection gestures: Shift adds (click or box), Alt removes, Cmd/Ctrl toggles; Alt-drag duplicates;
  holding Alt shows distance lines (`updateDistances`). Selection gestures set `noDrag`.
- Full-canvas `flashes` layers don't listen to clicks so the photo under them stays reachable.

## UI (ui.js) building blocks

`h('tag.class', attrs, ...children)` makes DOM. Controls: `num`, `colorCtl`, `selectCtl`, `seg`,
`toggle`, `textCtl`, `inputCtl`, `fontCtl`. Layout: `sec(title, kids, open, {key, collapsible})`,
`more(key, kids, label)` for hidden extras, `addSec(title, items)` for the "+" lists, `row(label, ctl)`,
`full(node)`, `label(text)`. Panels use `shelf`, `elTile`, `templateCard`. Call `renderInspector()` /
`renderPanel()` after structural changes; `toast(msg, {label, run})` for feedback with an action.

## Templates (templates.js)

A template is `{ id, name, tags, width, height, video?, build: () => doc }`. Helpers: `txt`, `img`,
`stk`, `shp`, `rib`, `nat`, `cam`. Text can be placed by centre (`cx`, `cy`); widths are measured on
load. Put a new family's ids in `GROUPS` (order = display order); `video: true` adds the badge and hover
preview. Families so far: Text slides (69), Film looks (16), Film camera (10), Stop motion, Speed flashes, Studio portrait, Newspaper
reveal, Typing, Match cut, Kinetic headline, Sticky notes, Rolling numbers, Word by word, Letter
bounce, Life-sim garden, Ribbon poster, Motion blur, Camera view, Meet the team, Grid-paper notes,
Polaroid POV, Wall calendar, Notebook tip, Outfit line-up — about 190 templates. Film templates build
filters with `LOOK('<preset>', overrides)` so they stay in step with the presets.

When lining up words with inline photo chips, measure text widths first (create a text with `S.mk`,
`S.autosize`, read `width` after fonts load) and hard-code positions.

## Testing

Playwright with the pre-installed Chromium works well:

```bash
node studio/tools/smoke_test.js            # loads the app, renders every template, prints errors
```

For features, script the real UI: `page.click(...)`, file choosers via `page.waitForEvent('filechooser')`,
read state with `page.evaluate(() => window.Studio…)`, render frames with
`window.StudioRender.renderDoc(doc, { time })` into a contact sheet and look at it. Headless
Chromium exports WebM (no H.264); real Chrome exports MP4.

## Shipping

1. Commit with a clear message; push to the working branch.
2. `python3 studio/tools/build_single_file.py` → `studio/dist/collage-studio.html` (commit it too).
3. A private claude.ai artifact of the app was published earlier
   (https://claude.ai/artifact/WSEaiShKsrkDT4mFzVpkES). Republishing `dist/collage-studio.html` to it
   works; note the artifact sandbox may block Hugging Face downloads, which breaks background removal
   there unless the model is shipped alongside.

## Moving to another computer

Copy `studio/dist/collage-studio.html` and double-click it. Designs live in the browser, so move them
with **⋯ → Download project file** (`.studio.json`, photos / videos / fonts inside) and **Open file** on
the home page. Offline, everything works except Google Fonts (system fallback) and background removal.
