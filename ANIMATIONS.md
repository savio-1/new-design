# Animation studio

`animations.html` is the animation UI, copied from the Light Rails reference
build (https://light-stroke-rail.vercel.app/). It is one self-contained page
plus `vendor/gsap.min.js` — no build step, no bundler, no CDN. Open the file, or
serve the folder (`npx http-server -p 8123 .`) and hit `/animations.html`.

## What is in it

Two layers share the same framed stage box, so a card can sit on top of the
live pattern and both are captured together by the exporter.

**1. The pattern layer** — a WebGL fragment shader on `#stage`.

- 17 shader templates in the left card (`TEMPLATES`, `animations.html:2253`),
  each a named bundle of shader constants.
- The right card (`Rails`) is the live control stack: shape, lines, gradient
  run, timing, look. Every slider writes straight into the uniform set, and
  the whole config is persisted to `localStorage.railCfg`.
- Theme presets and gradient colours drive the palette uniforms.
- The render loop is `render()` / `loop()` at `animations.html:2815`; the
  canvas is created with `preserveDrawingBuffer` so other layers can
  `drawImage` off it.

**2. The card layer** — an animated scene reel on `#ui`, driven by GSAP.

- 18 scenes exist in the markup (`animations.html:4599`); scenes crossfade via
  `.scene.on { opacity: 1 }`.
- `SCENES` (`animations.html:4793`) is the reel order plus each scene's `hold`
  in ms.
- Every `canvas.art` inside a card is a live crop of the shader output —
  `paintArt()` (`animations.html:4966`) re-draws them each frame off the WebGL
  canvas, honouring the card's `data-crop` (`square` / `fill`) and `data-zoom`.
  There are no images anywhere in the reel.
- Some scenes paint their own 2D canvas instead: `paintTrail`, `paintHills`,
  `paintCoil`, `paintWash`, `paintBars`, `paintVision`. These read the same
  palette as the shader so the whole reel stays in one colour world.
- `playScene(id, node)` (`animations.html:5509`) is the per-scene GSAP
  timeline: entrance tweens on `sceneTl`, endless tweens pushed onto `loops`.
- `tick()` / `schedule()` (`animations.html:5612`) advance the reel; the pause
  button and the `Pattern` dropdown park it on one scene. Reel state lives in
  `localStorage.railUI`.
- `Edit text` makes every `[data-k]` node editable and stores overrides in
  `localStorage.railCopy`.

**Export** (top right): PNG frame, WebM 6s, MP4 6s (MediaRecorder off the
canvas stream), GIF 3s (hand-written GIF89a encoder — no library), and the
config as JSON.

**Keyboard**: `H` toggles the Rails panel.

## Only four scenes play right now

The reference build kept the other scenes' markup and tween code but filtered
them out of the reel. That filter is the `OUT` list at `animations.html:4817`:

```js
var OUT = ['vision', 'poster', 'coda', 'blobs', 'build', 'cluster', 'mesh',
           'split', 'trail', 'hills', 'wash', 'bars', 'coil', 'deck'];
```

Delete an id from `OUT` and that scene comes back exactly as it was — markup,
timeline, painter and dropdown entry are all still in the file. The reel
currently plays `ask`, `brand`, `posters`, `promo`.

## Adding a new animation

Five edits, all in `animations.html`:

1. **Markup** — add `<div class="scene" id="myscene"> … </div>` inside
   `<div id="ui">` (`:4599`). Use `<canvas class="art" data-crop="square"
   data-zoom="1.6">` anywhere you want the live pattern showing through.
2. **Styles** — add the scene's rules to the `#ui` style block that starts at
   `:4222`. Scope everything under `#ui #myscene` and size with `vw`/`vh` or
   `%` so it survives the billboard transform and the export crop.
3. **Reel entry** — push `{ id: 'myscene', name: 'My scene', hold: 5000 }` onto
   `SCENES` (`:4793`). `hold` is how long it stays on screen.
4. **Timeline** — add an `else if (id === 'myscene') { … }` branch in
   `playScene` (`:5509`). Entrance tweens go on `t`; anything that repeats
   forever goes through `loop(target, vars)` so it gets killed on scene change.
5. **Painter (only if the scene draws its own canvas)** — write a
   `paintMyscene()` in the style of `paintHills` (`:5230`) and kick it off with
   `requestAnimationFrame`.

Two traps the reference code calls out and that new scenes hit too:

- A `gsap.from()` tween sets its target to the from-value immediately. Kill the
  timeline mid-entrance — which happens on every scene switch — and the element
  is parked there, usually at `opacity: 0`, forever. `playScene` clears
  `opacity,transform` on the incoming scene for this reason; don't add an
  `opacity` `.from()` on a whole scene container, the crossfade already handles
  it.
- Don't remove scene nodes from the DOM to hide a scene. Setup code looks
  scenes up by id and throws on the missing node, which takes the whole reel
  and its dropdown down with it. Use the `OUT` filter instead.

## Deliberate differences from the reference build

- **Rate + Share removed.** That block posted ratings to a third-party Supabase
  project with the anon key hardcoded in the page, and the Share sheet shared
  the reference deploy's own URL. Neither is animation functionality, so
  neither was carried over, along with the two topbar buttons that opened them.
  Export is untouched.
- **Billboard mockup photo not vendored.** The billboard layer is dormant in
  the reference too (`boardOn` is `false`, the layer is `hidden`, and the
  toggle was pulled from the UI), and the photo is 8 MB. The layer, the
  projective fit and `rail.mockup(true)` are all still in the file; drop a
  `mockups/billboard.png` in and point `#boardImg`'s `src` at it (currently
  parked on `data-src`) to bring it back.
- Page title and byline changed; the reference deploy's `og:` tags dropped.

Everything else — shader, templates, palettes, control panel, scene markup,
timelines, painters, export, persistence — is copied verbatim.
