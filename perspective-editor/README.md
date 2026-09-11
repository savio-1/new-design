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

The left rail has five tools; each opens its own page, and the inspector on the right edits whatever is
selected (a word, a camera keyframe, a mask or tracker keyframe).

| Tool | What lives there |
| --- | --- |
| **Media** | Import a video or work on a plain colour; canvas shape and length; how the footage sits in the 3D scene (scale, position, **depth**, opacity, whether it zooms with the camera); **more layers** — extra videos, images and sound. |
| **Text** | Add words, templates (which build a whole sequence with its camera move), text styles. |
| **Camera** | Camera moves, depth of field, far fade, lens. |
| **Track** | Motion tracking: mark an object (or let the editor find objects), track it, pin words to it. |
| **Mask** | The subject mask that lets words pass behind the person in the shot. |

**Media.** Import a video (or drop one on the preview), or skip it and work on a plain
background colour. The video is a layer inside the 3D scene: *Video scale* zooms the footage up
(150–200 % is typical) so it still fills the frame when the camera pulls back, *Video X / Y*
reframe it, and **Video depth** moves the footage itself back or forward. Pushed behind the sharp
band it goes soft like anything else out of focus; brought forward it grows and can sit in front of
words — everything is drawn far-to-near, so words and other media placed behind it are covered by it.

**More layers.** *Add video*, *Add image* and *Add sound* put extra media on the timeline as layers of
their own (dropping a second file onto the preview does the same). A video or image layer is a picture
in the 3D scene: it has a position and **depth**, a size, rotation, opacity, entrance and exit
animations, and it blurs when it leaves the sharp band exactly like a word; it can be pinned to a
tracker or sent behind the subject mask. On the timeline each is a bar you drag, trim (trimming the
head keeps the same frame at the cut) and **split** at the playhead (`S`), so several clips can be
laid one after another — the timeline grows to fit, and the main video simply stops showing when its
pieces end. Sound layers play in step with everything else, with their own volume and mute. Export
mixes every audible layer together, placed where it sits on the timeline. Files are not embedded in
a saved project: a reopened project lists each media layer with **Relink file…** in the inspector. Untick *Video zooms with the camera* to pin the footage as a fixed backdrop and move
only the words. *Subject mask* lets words pass behind the person in the shot, and *Motion tracking*
pins words to something in the footage so they stay put while the real camera moves (both below).
Without a video, choose the canvas shape and length here.

**Text.** *Add text* drops a word just in front of the camera. Templates build a whole
sequence, including the camera move — *Camera Reveal* is the After-Effects-style pull-back. Text
styles apply a look to the selected words.

**Camera.** Pick a camera move, set depth of field (blur amount and what to focus on), fade
for far words, and the lens. *Add keyframe here* and *Fit video at this key* write keyframes at the
playhead. Each keyframe has an **Ease in** that shapes the move arriving at it — presets from linear
to a hold-then-jump, or **Custom curve…**, which opens a speed-curve editor: drag the two handles of a
cubic Bezier (time across, progress up), or pick Gentle / Slow start / Slow finish / Snappy / Overshoot /
Anticipate. Different keys can have different curves, so one move can creep, rush and settle in turn.

**The stage** has three views: *Preview* (the final picture), *3D layout* (a big top-down or side
diagram of the scene), or *Split*. Placing things precisely: **Snap** (or `G`) quantises every drag in
the 3D layout — words, media, the camera and its keyframes — to a grid whose step you choose (0.05 to
0.5 scene units), drawn faintly behind the scene; hold **Alt** during a drag to bypass it. Holding
**Shift** while dragging an already-selected item locks the move to one axis — whichever you set off
along first — so a word can be pushed straight back or slid straight across without wandering; this
works in the preview too. The inspector's number fields take exact values, and the arrow keys nudge a
selection by 0.01 (0.1 with Shift). In the 3D layout the red line is the video, the blue dot is the
camera with its field of view and focus line, the dashed line is the camera path with its keyframes
as diamonds, and every word is a pill you can drag left/right and nearer/further (top view) or
up/down (side view). Dragging the camera writes a keyframe at the playhead; dragging a diamond edits
that keyframe. Scroll to zoom, drag empty space to pan, double-click empty space to fit everything.

**The inspector** (right) edits the selected word or camera keyframe. Shift-click words in the
preview, layout, or timeline to select several and change them together.

**Timeline**: the **Video** row shows the footage as a filmstrip; media layers sit below it with a
poster frame, and `S` splits whichever layer is selected (or the footage when nothing is). Press **Split** (the scissors, or
`S`) to cut it at the playhead, drag the ends of a piece to trim it, click a piece and press `Delete`
to remove it — the remaining pieces close up, and the timeline shortens to match. Words and camera
keys keep their timeline positions; anything bound to the footage (tracks, the subject mask) stays
with its frames, so a tracked caption still sits on its object after a cut. Export follows the edit,
audio included. Below that, drag word bars to move them in time, drag their edges to trim, click the
eye to hide. The Camera row shows keyframes as diamonds — drag to retime, double-click to add.

**Export**: Original / 720p / 1080p / 1440p / 4K, frame rate, quality, range, audio. For 4K or long
clips tick *Stream straight to a file*. **Save / Open** stores the project as JSON (the video is not
embedded — re-import it).

Keyboard: `Space` play/pause · `,` `.` step frames · `Home` / `End` · `Delete` remove word or key ·
`Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `Ctrl+A` select all · `Ctrl+D` duplicate · `T` add text ·
`K` add camera key · `S` split the selected layer (or the video) at the playhead · `G` snap on/off ·
`Shift`+drag one axis · `Alt`+drag bypass snap · `M` adjust the subject mask · `Enter` close
a tracker shape · `Backspace` take back its last point · `Esc` leave tracker marking / dismiss object
proposals · `L` cycle Preview / Split / 3D layout · `Ctrl+S` save · `Ctrl+E` export.

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
sign, a product — growing and turning with it — as if it had been in the room.

**1 · Mark the object** in **Track**. Either press **Find objects** — the editor looks for the
textured, trackable things in the current frame and outlines them; click one to make a tracker —
or pick how to mark it yourself, press **New tracker**, and work on the preview:

| Mark with | How | What it gives you |
| --- | --- | --- |
| **Box** | Drag out a rectangle over a detailed part of the object. Wheel resizes, drag a corner to reshape. | Position, size and rotation |
| **Shape** | Click points around the object; click the first point again (or double-click, or `Enter`) to close it. `Backspace` takes back a point; drag a point to adjust it. | Position, size and rotation — the most accurate, because you decide exactly what belongs to the object |
| **Point** | Click one small detail. | Position only |

Mark something with edges or texture — a logo, a screen corner, a pattern. A flat wall or a plain
gradient is refused with a message, because there is nothing in it to follow.

**2 · Press Track motion.** The tracker follows the object forwards and backwards from the frame you
marked it on, and stops where it loses it (the status line says where). The Tracker row in the
timeline shows the covered range as a bar.

**3 · Press Add pinned text** for a caption that follows the tracker and appears word by word, or
select existing words and press **Pin selected words**. In the inspector every word has a **Pinned
to** menu; changing it never moves the word — its position, size and angle are simply stored relative
to the tracked object from then on. **Follow rotation** (on by default) turns the word with the
object as well; turn it off for a caption that should stay upright.

A pinned word keeps all its own controls: drag it to sit where you like beside the object, set its
size, tilt or turn it, and it holds that relationship as the object moves, grows and turns. Depth
stays near 0 so it sits on the surface; give it some depth and the virtual camera adds parallax on
top of the tracked motion.

### Stabilise

A tracker measures the footage frame by frame, and a little of that measurement is jitter. The
**Stabilise** slider on each tracker takes it off with a Gaussian window over the neighbouring
frames — at 0 the pinned words follow every last shake of the footage; at the default 30 % they
ride the real motion smoothly; higher gives a floatier feel. It changes how the track is *read*, not
the track itself, so it can be adjusted any time without re-tracking.

### If it drifts

Scrub to the moment it goes wrong, press **Mark on canvas** (or click the tracker's row) and drag the
mark back where it belongs. That writes a **correction key** — a diamond on the tracker row — and the
fix is blended into the neighbouring frames so nothing jumps. The wheel corrects size the same way,
and position, size and rotation can all be typed into the inspector. A track can also be keyed
entirely by hand, which is what you get with no video loaded at all: keys interpolate exactly like
camera keys.

### How the tracking works

Frames are read by playing the clip and taking every frame the browser hands over. Reading and
analysing a frame is slower than a frame period on many machines, so the clip is played **at half
speed, dropping to a quarter or an eighth if it notices a frame went by unseen** — the status line
shows the rate. Getting every frame matters more than finishing quickly: a tracker that skips frames
is exactly one that wanders off. *Step every frame* seeks each frame instead, which is slower again
and needs no luck at all.

Inside your region, up to 48 corners are detected (Shi-Tomasi) and each is followed frame to frame by
pyramidal Lucas-Kanade optical flow over four levels, starting from the **whole frame's dominant
motion** (the camera move, measured on a grid of points at the coarsest level) so a sudden jerk of
the camera does not throw the features out of range. Each flow is run **backwards** as well and must
land back on itself, or the feature is dropped for that frame. Every surviving feature is then
checked against the patch it had on the reference frame, warped by the current size and angle, and
any that no longer match — occluded, blurred, slipped onto neighbouring texture — are dropped, so
drift cannot build up. What survives is fitted with one similarity transform (position, uniform
scale, rotation) with outlier rejection, and *that* is the object's motion: no single feature can
pull the text off. When too many features are lost, fresh ones are detected where the object now is.
While the object is only partly visible the tracker keeps following but writes no keys (the gap is
interpolated); when it is lost outright, every following frame is **searched for the object again**
at the last known size and angle (and a few around it), and on a hit the original features are woken
up first so the fit corrects any error in the guess.

Measured on a test clip that pushes in 1.5×, rolls ±10°, pans across the frame and wobbles like a
handheld shot: **Box and Shape hold the object to about 2 px in a 960-wide frame** (0.2 %), with size
within 0.2 % and rotation within 0.7°. With a bar sweeping across the object for a second, the track
is lost for a quarter of a second and re-acquired, and its size and angle return to within 1 % and
1°. **Point mode holds position to about 20 px** on the same clip — a few pixels of neighbourhood
cannot measure scale or rotation, so it reports neither; use Box or Shape when the shot zooms.

It is translation, scale and rotation — not a planar tracker. A caption floats beside or on a surface
convincingly, but text will not bend onto a table seen at a steep angle.

**Word-by-word captions.** In the Animation section, **Words appear one by one** sets the layer to
animate by words with a fade, and **Type it out** does the same by letters; both leave the exit off so
the caption stays until the layer ends. Pacing works one of two ways. With **Fit to layer length** on
(the default for these presets and for pinned text) the words are spread over the layer's whole time
so the last one has appeared — and stayed for *Hold at end* — before the layer ends, however many
words there are: drag the layer longer or shorter on the timeline to set the speed. With it off,
**Gap per word** is a fixed delay, which is precise but means words scheduled past the layer's end
are simply never shown.

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

- `js/renderer.js` — WebGL compositor. The video is a plane at its own depth (z = 0 by default)
  filling a perspective camera's view; each text group and each video / image layer is a textured quad
  with its own model matrix, so rotation and depth produce true perspective. Everything is queued and
  drawn far-to-near so layers cover each other correctly by depth. Text is rasterised for the magnification it will actually be seen at — camera
  distance times the layer's own scale, in steps up to 12× — so words close to the lens or pinned to a
  growing object stay crisp. A fragment-shader disk blur drives the focus effect, and a rounded-box SDF —
  projected from the video plane so it tracks the footage — erases the words marked as being behind
  the subject.
- `js/text-render.js` — lays out text (block / words / letters), rasterises each group with
  shadow, extrusion, stroke and box into a canvas, and caches the result. Textures are re-rendered at
  the export resolution so 4K output stays sharp.
- `js/animations.js` — easing curves plus the entrance / exit / loop library. Each animation is a
  pure function of progress that returns translation, rotation, scale, opacity and blur.
- `js/camera.js` — camera keyframes, interpolation (preset easings and per-key cubic-Bezier speed
  curves), and the library of camera moves.
- `js/tracker.js` — the object tracker: reads frames by playing the clip at an adaptive rate
  (`requestVideoFrameCallback`, falling back to seeking), detects Shi-Tomasi corners in the marked
  region, follows them with pyramidal Lucas-Kanade optical flow, validates each against its reference
  patch, and fits one similarity transform per frame to give position, size and rotation keys.
- `js/layout-view.js` — the large top/side diagram of the scene with draggable words, camera and keyframes.
- `js/presets.js` — style presets and template generators.
- `js/exporter.js` — frame-accurate export: seeks every video frame by frame, renders,
  encodes with WebCodecs (H.264, falling back to VP9 / AV1) and muxes with
  [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (`vendor/`, MIT). Audio is decoded with
  Web Audio, mixed across the main video's pieces and every audible layer, and encoded as AAC (or Opus). Without WebCodecs it records the canvas in real time with
  MediaRecorder.
- `js/app.js` — state, undo/redo, timeline, inspector, canvas interaction, dialogs.

Fonts are loaded from Google Fonts, plus local faces bundled with the editor (Helvetica Neue,
Francy, EB Garamond, Very Vogue Text and Display — the last four supplied by the project owner);
without a network connection the Google faces fall back to system fonts.
