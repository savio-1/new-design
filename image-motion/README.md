# ImageMotion

Image choreography for hero sections, plus a small studio that turns those choreographies into
MP4 / WebM / GIF clips. Dependency-free library, browser-only export.

```
image-motion/
├── image-motion.js    the library: 30 motion templates, DOM/CSS-3D renderer (≈ 45 KB, no dependencies)
├── image-motion.css   base styles for the stage, cards and the ticker list
├── render.js          ImageMotionRenderer — draws a frame to a canvas (WebGL2 + 2D), used for export
├── export.js          ImageMotionExport — MP4/WebM via WebCodecs, GIF via gifenc
├── index.html         ImageMotion Studio (the editor)
├── editor.js          studio logic
├── images/            12 demo portraits (640×800) + CREDITS.md
└── README.md
```

Open `index.html` through any static server (for example `npx http-server .`).

## Using the library on a site

```html
<link rel="stylesheet" href="image-motion/image-motion.css">

<section class="hero" id="hero">
  <!-- Anything inside the stage renders above the cards -->
  <h1>One platform. Every creative outcome.</h1>
</section>

<script src="image-motion/image-motion.js"></script>
<script>
  const hero = ImageMotion.mount('#hero', {
    mode: 'tunnel',
    count: 16,
    images: ['/img/a.jpg', '/img/b.jpg', { src: '/img/c.jpg', label: 'Campaign' }],
    params: { travel: 80, splay: 12 },
  });
</script>
```

The container needs a size; cards are inserted behind your own content and never intercept
clicks on it. Declarative alternative: `<section data-image-motion='{"mode":"float","count":10}'>`.
The studio's **Embed code** button writes this snippet for you, with your text layers and
safe zones included.

## Templates

| category | ids |
| --- | --- |
| Rings & orbits | `orbit` `burst` `sphere` `helix` `cylinder` `wheel` |
| Carousels & decks | `coverflow` `stack` `fan` `slideshow` `split` `heroreel` |
| Grids | `wave` `mosaic` `focus` `popgrid` `flipgrid` |
| Collage & float | `float` `shuffle` `converge` `drift` `toss` `trail` |
| Belts & streams | `marquee` `cascade` `columns` `iso` |
| Depth & 3D | `tunnel` `depthstack` |
| Text & lists | `ticker` |

`ImageMotion.modes` lists every template with `id`, `name`, `category`, `description`, `defaults`
and a `schema` describing its settings; the studio builds its panel from that. Register your own
with `ImageMotion.registerMode({ id, name, defaults, schema, layout(ctx), frame(ctx, i, pose) })`.
Every template is a pure function of time, so it is scrubbable and its export is frame-exact.

## Options

| option | default | notes |
| --- | --- | --- |
| `mode` | `'orbit'` | one of the ids above |
| `images` | `null` | array of URLs or `{ src, label, alt }`; `null`/`[]` renders gradient placeholders |
| `labels` | `null` | list of strings for the `ticker` template |
| `count` | `12` | number of cards (images repeat if there are fewer) |
| `cardWidth` / `cardHeight` | `150` / `190` | base card size in px |
| `sizeVariance` / `aspectMix` | `0.18` / `true` | size and aspect variation in collage templates |
| `radius` / `shadow` / `showLabels` | `14` / `true` / `false` | card style |
| `speed` / `intensity` | `1` / `1` | timeline speed; scale of drift, wobble and lift |
| `easing` | `'inOutCubic'` | easing for discrete transitions (`ImageMotion.easings`) |
| `perspective` / `depthFade` / `depthBlur` | `1200` / `0.55` / `3` | camera and depth cues |
| `parallax` / `hoverLift` / `hoverPause` | `0.5` / `true` / `false` | mouse behaviour |
| `seed` | `7` | same seed = same layout |
| `avoidCenter` | `true` | keep collage layouts off the copy |
| `avoidWidth` / `avoidHeight` | `0.56` / `0.46` | single centred safe zone, fractions of the stage |
| `avoidRects` | `null` | explicit safe zones instead: `[{ x, y, w, h }]` as fractions of the stage, `x`/`y` = centre offset from the stage centre |
| `avoidPad` | `0` | extra clearance around safe zones, px |
| `autoplay` / `respectReducedMotion` | `true` / `true` | |
| `params` | template defaults | per-template settings |

### Instance API

```js
im.set({ speed: 1.4, params: { radius: 0.45 } });  im.setMode('float', { amplitude: 20 });
im.resetParams();  im.setImages([...]);  im.play();  im.pause();  im.toggle();
im.seek(seconds);  im.restart();  im.refresh();  im.getConfig();  im.on('frame'|'change', fn);  im.destroy();
```

## Rendering frames and exporting video

`render.js` draws the current frame of an ImageMotion instance — and any text sitting on the same
stage — into a canvas at any scale, reproducing the CSS 3D maths exactly:

```js
const renderer = new ImageMotionRenderer({ im, stage: heroElement, width: 1920, height: 1080, scale: 2 }); // 4K
im.seek(1.25);
renderer.render({ background: { type: 'gradient', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#2b1055' }, { at: 1, color: '#7597de' }] } });
renderer.canvas; // the frame
```

`export.js` walks the timeline and encodes:

```js
const blob = await ImageMotionExport.record({ im, renderer, format: 'mp4', fps: 30, duration: 8, background, onProgress: (p) => … });
await ImageMotionExport.save(blob, 'hero.mp4');
```

* **MP4** and **WebM** use WebCodecs (Chrome, Edge). MP4 tries H.264 (up to level 5.2 for 4K60), then HEVC and AV1;
  WebM tries VP9, AV1, VP8. Browsers without WebCodecs fall back to a real-time WebM recording.
* **GIF** uses gifenc (256 colours per frame). The studio caps GIFs at 1080p.
* Load the muxers and gifenc from jsdelivr before `export.js`; see the header of that file.
* Exports use a still camera: mouse parallax is preview-only. Card captions are not drawn.

## The studio (`index.html`)

An editor in the spirit of template tools such as Animos:

* **Templates rail** — 30 templates grouped by category with generated thumbnails and search.
* **Canvas sizes** — 16:9, 9:16, 1:1, 4:5, 3:4, 4:3 or any custom size from 240 to 4096 px. The
  canvas is a fixed design size scaled to fit; switching size scales type and cards to keep the look.
* **Motion tab** — the template's own settings, cards, timing, and camera/depth under *Advanced*;
  starter looks that mirror the reference videos.
* **Media tab** — bundled portraits, your own uploads (drag and drop), remote URLs, or blank
  gradient cards; the word list for the ticker template.
* **Style tab** — background as a colour or a gradient (presets, linear/radial, angle, up to five
  colour stops); text colour; card radius and shadow.
* **Text tab** — any number of text layers (headings, body, labels, buttons) with font, weight, size,
  spacing, line height, alignment, case, colour and width; drag to place, snap guides to centres and
  edges, anchor grid, in-place editing (double-press). Collage templates keep cards off the text.
* **Export** — MP4, WebM or GIF; canvas size, 720p, 1080p, 1440p or 4K; 24–60 fps; duration and
  start time; quality. Frames are rendered from the same timeline as the preview.
* **Embed code** — the hero as HTML + CSS + mount call, type sizes in `cqw` so it scales with the hero.
* The whole state lives in the URL hash (**Copy link**). Uploaded images stay in the browser tab.

Keyboard: `space` play/pause · `R` restart · `E` export · `T` templates · `H` panel · arrows nudge
(`Shift` = 10 px) · `Delete` removes the layer · `Ctrl/Cmd+D` duplicates · `Esc` deselects ·
`Alt` while dragging disables snapping.

## Notes

* Only `transform`, `opacity` and (optionally) `filter: blur()` change per frame in the DOM
  renderer, so 20–40 cards run at 60 fps. Set `depthBlur: 0` for the cheapest path.
* Images that fail to load fall back to a seeded gradient. Remote images need CORS headers to appear
  in exports; same-origin files, uploads and data URLs always work.
* The demo portraits in `images/` are for the playground; see `images/CREDITS.md` and check each
  licence before shipping them.
