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

The left panel is three steps.

**1 · Media.** Import a video (or drop one on the preview), or skip it and work on a plain
background colour. The video is a layer inside the 3D scene: *Video scale* zooms the footage up
(150–200 % is typical) so it still fills the frame when the camera pulls back, and *Video X / Y*
reframe it. Untick *Video zooms with the camera* to pin the footage as a fixed backdrop and move
only the words. Without a video, choose the canvas shape and length here.

**2 · Text.** *Add text* drops a word just in front of the camera. Templates build a whole
sequence, including the camera move — *Camera Reveal* is the After-Effects-style pull-back. Text
styles apply a look to the selected words.

**3 · Camera.** Pick a camera move, set depth of field (blur amount and what to focus on), fade
for far words, and the lens. *Add keyframe here* and *Fit video at this key* write keyframes at the
playhead.

**The stage** has three views: *Preview* (the final picture), *3D layout* (a big top-down or side
diagram of the scene), or *Split*. In the 3D layout the red line is the video, the blue dot is the
camera with its field of view and focus line, the dashed line is the camera path with its keyframes
as diamonds, and every word is a pill you can drag left/right and nearer/further (top view) or
up/down (side view). Dragging the camera writes a keyframe at the playhead; dragging a diamond edits
that keyframe. Scroll to zoom, drag empty space to pan, double-click empty space to fit everything.

**The inspector** (right) edits the selected word or camera keyframe. Shift-click words in the
preview, layout, or timeline to select several and change them together.

**Timeline**: drag bars to move words in time, drag their edges to trim, click the eye to hide.
The Camera row shows keyframes as diamonds — drag to retime, double-click to add.

**Export**: Original / 720p / 1080p / 1440p / 4K, frame rate, quality, range, audio. For 4K or long
clips tick *Stream straight to a file*. **Save / Open** stores the project as JSON (the video is not
embedded — re-import it).

Keyboard: `Space` play/pause · `,` `.` step frames · `Home` / `End` · `Delete` remove word or key ·
`Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `Ctrl+A` select all · `Ctrl+D` duplicate · `T` add text ·
`K` add camera key · `L` cycle Preview / Split / 3D layout · `Ctrl+S` save · `Ctrl+E` export.

## How the 3D reveal works

The footage sits on a plane at depth 0 inside a 3D scene; the camera starts close to it (so the
video looks zoomed in) and pulls back to where the scaled video exactly fills the frame. Words are
static objects placed between those two camera positions at different depths. Each word starts
behind the lens and is revealed as the camera passes it, growing smaller and settling into place.
Words far behind the lens can dissolve (*Fade far words*). The camera templates set all of this up
from a sentence — each derives every word's depth from where the camera will be when that word
should read.

## Depth of field

Focus is a **band that travels with the camera**, not a plane locked to one object. *Sharp from* and
*Sharp to* set the two distances between which text is crisp; nearer or further than that it softens,
with a smooth edge either side. So a word coming toward the lens is soft, snaps into focus once it is
a sensible distance away, and softens again as it falls far behind. *Blur amount* scales how strong
that softening is, and the band is drawn as a green zone in the 3D layout so you can see which words
sit inside it.

## Animations

Entrances double as exits (played in reverse), so every combination works.

- **Simple**: Fade, Focus (blur in), Pop, Slide up/down/left/right, Rise, Typewriter, Stretch.
- **Complex**: Fly from camera, Zoom from far, Flip on either axis, Swing, Spin, Drop & bounce,
  Tumble, Scatter & assemble, Wave, Hinge, Glitch, Push from below.
- **While visible**: Float, Pulse, Wobble, Perspective sway, Spin, Shake, Bounce, Flicker,
  Breathing focus.

## Templates

**Camera templates** place static words in depth and let the camera move do the work:

| Template | What it does |
| --- | --- |
| Camera Reveal | Zoomed into the footage, the camera pulls back and reveals a stack of words. |
| Spiral Reveal | Words wind outward on a helix; the camera pulls back with a slow roll. |
| Tunnel Fly-through | Words ring the centre; the camera flies forward down the middle. |
| Corridor Signs | Words hang left and right like street signs; the camera tracks past them. |
| Orbit Cloud | Words float in a cloud; the camera arcs around them for parallax. |
| Rising Steps | Words climb into the distance; the camera cranes up while pulling back. |
| Centre Punch | One word at a time, dead centre, each deeper than the last. |

**Flat templates** compose for a still camera: Kinetic Words, Stacked Headline, Fly-in Title,
Typewriter Caption, Word Swap, Floor Crawl, Wall Text, Lower Third, Scatter Assemble, Neon Sign,
Bouncy Pop, Elegant Quote.

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
- `js/layout-view.js` — the large top/side diagram of the scene with draggable words, camera and keyframes.
- `js/presets.js` — style presets and template generators.
- `js/exporter.js` — frame-accurate export: seeks the source video frame by frame, renders,
  encodes with WebCodecs (H.264, falling back to VP9 / AV1) and muxes with
  [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (`vendor/`, MIT). Audio is decoded with
  Web Audio and encoded as AAC (or Opus). Without WebCodecs it records the canvas in real time with
  MediaRecorder.
- `js/app.js` — state, undo/redo, timeline, inspector, canvas interaction, dialogs.

Fonts are loaded from Google Fonts; without a network connection the editor falls back to system
fonts.
