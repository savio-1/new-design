# ImageMotion

Reusable, dependency-free image choreography for hero sections and marketing pages.
Drop a set of images into a container and pick one of 17 motion modes; everything is
tuneable live from the playground and exportable as a small JSON config.

```
image-motion/
├── image-motion.js    the library (≈ 30 KB, no dependencies, classic script or CommonJS)
├── image-motion.css   base styles for the stage, cards and the ticker list
├── index.html         playground with the control panel
└── README.md
```

Open `index.html` through any static server (for example `npx http-server .`) to use the playground.

## Quick start

```html
<link rel="stylesheet" href="image-motion/image-motion.css">

<section class="hero" id="hero">
  <!-- Anything inside the stage is rendered above the cards -->
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

The container needs a size (the library positions cards relative to its box) and can hold
any content of your own. Cards are inserted behind that content and never intercept clicks
on it.

Declarative alternative, auto-initialised on `DOMContentLoaded`:

```html
<section data-image-motion='{"mode":"float","count":10,"images":["/img/a.jpg","/img/b.jpg"]}'>
  …
</section>
```

## Modes

| id | name | inspired by | what it does |
| --- | --- | --- | --- |
| `orbit` | Orbit ring | video 1 | Cards circle the copy on 1 – 3 rings, optional tilt and wobble |
| `stack` | Stack cascade | video 1 | Plates stacked above/below the copy; the front plate flips to the back on a beat |
| `burst` | Burst & re-form | video 1 | A ring that periodically explodes outward, fades and regroups |
| `converge` | Converge & expand | video 1 | Cluster in the centre → collage around the copy → gather again |
| `shuffle` | Shuffle collage | video 2 | Scattered collage; cards pop / flip / slide / zoom out and swap one by one |
| `float` | Floating field | video 3 | Cards hover with soft drift, sway and depth parallax |
| `tunnel` | Gallery tunnel | video 4 | Panels on the walls of a corridor glide toward the viewer |
| `ticker` | List ticker | video 1 | Vertical word list with the active row highlighted and a swapping thumbnail |
| `marquee` | Marquee belts | extra | Rows of cards scroll sideways at different depths and speeds |
| `coverflow` | Coverflow | extra | Centre card with angled neighbours, stepping on a beat |
| `wave` | Grid wave | extra | A grid that ripples in depth |
| `helix` | Helix | extra | Cards climb a rotating spiral |
| `cascade` | Cascade | extra | Slow rain of cards at different depths |
| `fan` | Fan deck | extra | A hand of cards fans open, holds, and closes |
| `mosaic` | Mosaic assemble | extra | Cards fly in to form a grid, hold, and scatter out |
| `sphere` | Sphere | extra | Cards on a slowly turning globe |
| `drift` | Slow drift | extra | A calm collage creeping sideways with parallax, wrapping seamlessly |

Every mode is a pure function of time, so timelines are deterministic, scrubbable
(`seek(t)`), and parameter changes take effect instantly without restarting.

## Options

Global options (all optional) and their defaults:

| option | default | notes |
| --- | --- | --- |
| `mode` | `'orbit'` | one of the ids above |
| `images` | `null` | array of URLs or `{ src, label, alt }`; `null`/`[]` renders gradient placeholders |
| `labels` | `null` | list of strings for the `ticker` mode; captions fall back to image labels |
| `count` | `12` | number of cards (images repeat if there are fewer) |
| `cardWidth` / `cardHeight` | `150` / `190` | base card size in px |
| `sizeVariance` | `0.18` | random size variation for collage modes |
| `aspectMix` | `true` | mix aspect ratios in collage modes |
| `radius` | `14` | corner radius in px |
| `shadow` | `true` | drop shadow under each card |
| `showLabels` | `false` | caption under each card |
| `speed` | `1` | timeline speed multiplier |
| `intensity` | `1` | scales drift, wobble and lift amounts |
| `easing` | `'inOutCubic'` | easing for discrete transitions (`ImageMotion.easings` lists them) |
| `perspective` | `1200` | camera perspective in px |
| `depthFade` / `depthBlur` | `0.55` / `3` | fade and blur applied to far cards |
| `parallax` | `0.5` | mouse parallax strength, `0` disables |
| `hoverLift` / `hoverPause` | `true` / `false` | hover behaviour |
| `seed` | `7` | same seed = same layout |
| `avoidCenter` | `true` | keep collage layouts off the copy area |
| `avoidWidth` / `avoidHeight` | `0.56` / `0.46` | copy safe zone as a fraction of the stage |
| `autoplay` | `true` | |
| `respectReducedMotion` | `true` | renders a static frame when the OS asks for reduced motion |
| `params` | mode defaults | per-mode settings, see `ImageMotion.getMode(id).schema` |

## Instance API

```js
const im = ImageMotion.mount(el, options);

im.set({ speed: 1.4, params: { radius: 0.45 } }); // patch anything live
im.setMode('float', { amplitude: 20 });           // switch mode (params are remembered per mode)
im.resetParams();                                 // back to the mode defaults
im.setImages([...]);
im.play(); im.pause(); im.toggle();
im.seek(seconds); im.restart();
im.refresh();                                     // re-measure after you resize the container yourself
im.getConfig();                                   // serialisable config, paste it back into mount()
im.on('change', fn); im.on('frame', fn);
im.destroy();
```

`ImageMotion.modes` lists mode definitions (`id`, `name`, `description`, `defaults`, `schema`),
which is what the playground uses to build its panel. You can register your own mode with
`ImageMotion.registerMode({ id, name, defaults, schema, layout(ctx), frame(ctx, i, pose) })`.

## Styling hooks

* `.im-stage` — the container. The stage sets `--im-perspective` and `--im-radius`.
* `.im-card`, `.im-card__inner`, `.im-card__img`, `.im-card__label` — card parts.
* `--im-shadow`, `--im-label-color`, `--im-accent` (ticker marker) — CSS variables you can override.
* The ticker list inherits `font-family` and `color` from the stage.

## Playground

`index.html` is the control panel. It lets you pick presets that mirror the reference videos,
switch modes, tune every global and per-mode parameter, choose the image source (sample photos,
offline gradients, or your own URLs), edit the preview copy and colours, and copy the resulting
config, an embed snippet or a share link. The full state is stored in the URL hash.

Keyboard: `space` play/pause · `R` restart · `H` hide panel · `F` fullscreen.

## Notes

* Only `transform`, `opacity` and (optionally) `filter: blur()` change per frame, so 20 – 40
  cards run at 60 fps on typical hardware. Set `depthBlur: 0` for the cheapest path.
* Images that fail to load fall back to a seeded gradient so layouts never show broken cards.
* Put any element inside the stage to render it above the cards; the layer under it uses
  `pointer-events: none` so buttons stay clickable while cards still get hover lift.
