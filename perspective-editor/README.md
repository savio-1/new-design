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
only the words. *Subject mask* lets words pass behind the person in the shot, and *Motion tracking*
pins words to something in the footage so they stay put while the real camera moves (both below).
Without a video, choose the canvas shape and length here.

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
`K` add camera key · `M` adjust the subject mask · `Esc` leave tracker placement · `L` cycle Preview /
Split / 3D layout · `Ctrl+S` save · `Ctrl+E` export.

## How the 3D reveal works

The footage sits on a plane at depth 0 inside a 3D scene; the camera starts close to it (so the
video looks zoomed in) and pulls back to where the scaled video exactly fills the frame. Words are
static objects placed between those two camera positions at different depths. Each word starts
behind the lens and is revealed as the camera passes it, growing smaller and settling into place.
Words far behind the lens can dissolve (*Fade far words*). The camera templates set all of this up
from a sentence — each derives every word's depth from where the camera will be when that word
should read.

## Depth of field

Text can sit anywhere from 3 units behind the video plane to 10 units out in front of it, and the
camera can pull back about 14 units, so there is room for a long line of words in depth. Remember
that the footage has to be scaled up to keep filling the frame as the camera retreats — roughly the
camera distance divided by 2.4, which *Fit video at this key* works out for you.

Focus is a **band that travels with the camera**, not a plane locked to one object. *Sharp from* and
*Sharp to* set the two distances between which text is crisp; nearer or further than that it softens,
with a smooth edge either side. So a word coming toward the lens is soft, snaps into focus once it is
a sensible distance away, and softens again as it falls far behind. *Blur amount* scales how strong
that softening is, and the band is drawn as a green zone in the 3D layout so you can see which words
sit inside it.

## Letting text pass behind the subject

Text normally draws over the footage. *Subject mask* (step 1 · Media) covers the person with a soft
rounded shape; any word you mark **Behind subject** in the inspector is erased wherever that shape
covers it, so the word reads as if it were standing behind them — the strongest depth cue there is,
because the subject overlaps the text instead of the other way round.

1. Tick **Let text pass behind the subject**.
2. Press **Adjust on canvas** (or `M`) and drag on the preview to place the shape; the wheel resizes
   it, `Shift`+wheel changes only the height. *Centre X/Y*, *Width*, *Height*, *Roundness* and
   *Softness* do the same thing numerically — roundness 100 % gives a capsule, which fits a standing
   person well, and softness feathers the edge so the cut is not a hard line.
3. Select the words that should go behind and tick **Behind subject**.
4. If the subject moves, scrub to another time and press **Add mask key** (or just drag the shape —
   dragging at a new time writes a key by itself). The Mask row in the timeline shows the keys as
   diamonds, exactly like the camera row, and the shape interpolates between them.

The shape is pinned to the footage, not to the screen: it moves and scales with *Video scale* /
*Video X / Y* and with the camera, so a mask placed once stays on the subject as the camera pulls
back. It is a shape you place by hand, not an automatic cut-out. *Show the outline while editing*
draws it while you work; it is never in the export.

## Pinning text to the footage (motion tracking)

Everything above moves a *virtual* camera over a static shot. Motion tracking is the other case: the
footage itself was shot with a moving camera, and you want a caption that stays stuck to a screen, a
sign, a product — and grows as the camera closes in — as if it had been in the room.

1. In **1 · Media → Motion tracking**, press **New tracker**, then click the object on the preview.
   A box appears; the wheel sizes it (`Shift`+wheel: height only). Box a part of the object with
   edges or texture — a logo, the corner of a screen — not a flat wall.
2. Press **Track motion**. The tracker follows that patch forwards and backwards from the frame you
   placed it on, in about the running time of the clip, and stops if it loses the patch (the status
   says where). The Tracker row in the timeline shows the covered range as a bar.
3. Press **Add pinned text** for a caption that follows the tracker and appears word by word, or
   select existing words and press **Pin selected words**. In the inspector every word has a
   **Pinned to** menu; changing it never moves the word on screen — its position is simply stored as
   an offset from the tracked point from then on.

A pinned word keeps its own controls: drag it to sit where you like relative to the point, set its
size, tilt or turn it, and it will hold that relationship as the point moves and scales. Depth stays
at 0 so it sits on the surface; give it a little depth and the virtual camera adds parallax on top.

If the track drifts, scrub to that moment, press **Place on canvas** (or click the tracker row) and
drag the point back where it belongs. That writes a **correction key** — a diamond on the tracker
row — and the fix is blended into the neighbouring frames so nothing jumps. The wheel corrects the
size the same way. Corrections can also be typed in the inspector, and a track can be keyed entirely
by hand when there is no video, or when the footage has nothing trackable: keys are interpolated
just like camera keys.

Tracking runs on a 640-pixel greyscale copy of the video using normalised cross-correlation against
both the previous frame (so gradual changes of light and angle do not break the lock) and the
original patch at several scales (so drift cannot build up, and so the size is recovered). It is
translation and scale only — no rotation or perspective warp — which is what a floating caption
needs. It is not a planar tracker: text will not bend onto a surface seen at a steep angle.

**Word-by-word captions.** In the Animation section, **Words appear one by one** sets the layer to
animate by words with a fade and a 0.4 s stagger — raise the stagger to pace a spoken line — and
**Type it out** does the same by letters. Both leave the exit off so the caption stays until the
layer ends.

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
| Spiral Reveal | The sentence winds out of a vortex — small and deep at the eye, big and near the lens at the outside, each word turned along the curve. The camera pulls back through it with a slow roll. |
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
  true perspective. A fragment-shader disk blur drives the focus effect, and a rounded-box SDF —
  projected from the video plane so it tracks the footage — erases the words marked as being behind
  the subject.
- `js/text-render.js` — lays out text (block / words / letters), rasterises each group with
  shadow, extrusion, stroke and box into a canvas, and caches the result. Textures are re-rendered at
  the export resolution so 4K output stays sharp.
- `js/animations.js` — easing curves plus the entrance / exit / loop library. Each animation is a
  pure function of progress that returns translation, rotation, scale, opacity and blur.
- `js/camera.js` — camera keyframes, interpolation, and the library of camera moves.
- `js/tracker.js` — the point tracker: reads frames from real-time playback (`requestVideoFrameCallback`,
  falling back to seeking), matches the boxed patch by normalised cross-correlation against the previous
  frame and the reference at several scales, and returns per-frame position and size keys.
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
