# Perspective — 3D text for video

A browser-based video editor for adding perspective ("3D") text to any video, animating it with
simple or complex motion, and exporting the result as an MP4 at up to 4K.

It recreates the kinetic "3D text effect" look from the reference recording: words pop in one by
one with a focus blur, mix bold sans-serif and italic serif faces, sit at different depths and
angles in the scene, then blur out as the next cluster arrives.

## Running it

Everything is static — no build step and no server-side code.

```sh
cd perspective-editor
python3 -m http.server 8080      # or any static server
# open http://localhost:8080
```

Opening `index.html` directly from disk also works in Chrome.

**Browser support**

| Feature | Chrome / Edge (recommended) | Firefox / Safari |
| --- | --- | --- |
| Editing, preview, timeline | Yes | Yes |
| MP4 export (H.264) up to 4K | Yes (WebCodecs) | Falls back to real-time WebM recording |
| Audio in export | Yes | Yes (WebM) |
| Stream export straight to disk | Yes | No |

Video decoding depends on the browser: MP4/H.264, WebM/VP9, and MOV/H.264 play in Chrome.
HEVC MOV files from iPhones need to be transcoded to H.264 first.

## Using the editor

1. **Import a video** (button or drag-and-drop onto the canvas). You can also design text first on
   a blank 16:9 / 9:16 / 1:1 / 4:5 canvas and import the video later.
2. **Add text** with the `+ Add text` button (or press `T`), or pick a **template** from the left
   panel, type your words, and insert a ready-made sequence at the playhead.
3. **Move text on the canvas**: drag to move, `Alt`+drag to rotate in 3D, mouse wheel to resize,
   double-click to edit the words. Arrow keys nudge; `Shift` nudges further.
4. **Inspector** (right panel):
   - *Text* — font, weight, italic, size, fill, alignment, tracking, and whether animation applies to
     the whole block, each word, or each letter.
   - *Look* — stroke, soft or hard shadow, fake 3D extrusion, background box, opacity.
   - *Position & 3D* — X / Y / depth and tilt / turn / roll, plus scale.
   - *Animation* — entrance, exit, and a looping "while visible" motion, each with duration,
     easing and stagger between words or letters.
   - *Timing* — start / end, or snap them to the playhead.
5. **Timeline**: drag bars to move layers in time, drag their edges to trim, click the eye to hide a
   layer. Bars snap to the playhead and to other layers' edges.
6. **Text styles** tab: one-click looks (Clean Bold, Editorial Italic, Orange 3D, Neon, Caption
   Box, Retro Pop, …) applied to the selected layer.
7. **Export**: choose Original / 720p / 1080p / 1440p / 4K, frame rate, quality, range, audio.
   For 4K or long clips tick *Stream straight to a file* to avoid holding the whole file in memory.
8. **Save / Open** stores the project as JSON (the video itself is not embedded — re-import it).

Keyboard: `Space` play/pause · `,` `.` step frames · `Home` / `End` · `Delete` remove layer or key ·
`Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `Ctrl+A` select all · `Ctrl+D` duplicate · `T` add text ·
`K` add camera key · `Ctrl+S` save · `Ctrl+E` export.

## Camera and depth

The text lives in a 3D world in front of the footage, and a virtual camera moves through it while
the video stays put — this is what gives the reference clips their depth. Open the **Camera** tab:

- **Depth of field** blurs words the further they sit from the focal plane, more strongly when they
  are close to the lens. **Follow newest word** keeps focus on the word that just appeared, easing
  over from the previous one, exactly like the reference.
- **Camera moves** write keyframes over the selected layers' time span (or 3 s from the playhead):
  Dolly in/out, Push through (approach, then fly past the words so they blur out of frame),
  Orbit left/right, Crane up, Pull-back reveal, Handheld drift, Whip in.
- The **Camera** track above the layers shows keyframes as diamonds. Drag to retime, click to edit
  dolly / truck / pedestal / yaw / pitch / roll and easing in the inspector, double-click the track
  (or press `K`) to add a key at the playhead.
- The **Scene map** at the top of the Camera tab is a top-down view of the whole setup: the red line
  is the video plane, the blue dot is the camera with its field of view, and each word is a dot.
  Drag a word to place it in X and depth; drag the camera to write a keyframe at the playhead.
- **Fade far text** dissolves words once they fall this far behind the lens, so a pull-back leaves
  distant words behind naturally. Words about to pass the lens also dissolve rather than pop.
- **Camera Reveal** template: words sit still at increasing depths along the line of sight and the
  camera tracks backwards, revealing each one as it passes — the tracked-3D-title look. Use the
  *Tracking shot* moves to match footage where the real camera walks backwards or forwards.
- Templates such as *Kinetic Words* insert their own camera moves along with the layers.

## Multi-selection

Shift-click (or Ctrl/Cmd-click) layers in the timeline or on the canvas to select several, or press
`Ctrl+A` for all. The inspector then edits every selected layer at once: font, weight, size, colour,
animation and so on are applied to all of them, while position, rotation and timing move each layer
by the same amount. Dragging on the canvas or in the timeline moves the whole selection.

## Fonts

Google Fonts plus two local families shipped in `fonts/` as Latin-subset WOFF2: **Helvetica Neue**
(Ultra Light to Black, with italics) and **Francy**. Helvetica Neue is a licensed typeface supplied
by the project owner; check your licence before distributing the bundle.

## Animations

Entrances double as exits (played in reverse), so every combination works.

- **Simple**: Fade, Focus (blur in), Pop, Slide up/down/left/right, Rise, Typewriter, Stretch.
- **Complex**: Fly from camera, Zoom from far, Flip on either axis, Swing, Spin, Drop & bounce,
  Tumble, Scatter & assemble, Wave, Hinge, Glitch, Push from below.
- **While visible**: Float, Pulse, Wobble, Perspective sway, Spin, Shake, Bounce, Flicker,
  Breathing focus.

## Templates

Kinetic Words (the reference look), Stacked Headline, Fly-in Title, Typewriter Caption, Word Swap,
Floor Crawl, Wall Text, Lower Third, Scatter Assemble, Neon Sign, Bouncy Pop, Elegant Quote.

## How it works

- `js/renderer.js` — WebGL compositor. The video is a plane at z = 0 filling a perspective camera's
  view; each text group is a textured quad with its own model matrix, so rotation and depth produce
  true perspective. A fragment-shader disk blur drives the focus effect.
- `js/text-render.js` — lays out text (block / words / letters), rasterises each group with
  shadow, extrusion, stroke and box into a canvas, and caches the result. Textures are re-rendered at
  the export resolution so 4K output stays sharp.
- `js/animations.js` — easing curves plus the entrance / exit / loop library. Each animation is a
  pure function of progress that returns translation, rotation, scale, opacity and blur.
- `js/camera.js` — camera keyframes, interpolation, and the library of camera moves.
- `js/presets.js` — style presets and template generators.
- `js/exporter.js` — frame-accurate export: seeks the source video frame by frame, renders,
  encodes with WebCodecs (H.264, falling back to VP9 / AV1) and muxes with
  [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (`vendor/`, MIT). Audio is decoded with
  Web Audio and encoded as AAC (or Opus). Without WebCodecs it records the canvas in real time with
  MediaRecorder.
- `js/app.js` — state, undo/redo, timeline, inspector, canvas interaction, dialogs.

Fonts are loaded from Google Fonts; without a network connection the editor falls back to system
fonts.
