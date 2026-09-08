/*!
 * ImageMotion — reusable image choreography for hero sections and marketing pages.
 * Dependency-free. Drives a set of image cards with 3D transforms using a deterministic,
 * time-based frame function per "mode", so every mode is scrubbable and re-configurable live.
 *
 * Usage (classic script): include image-motion.css and image-motion.js, then
 *   const im = ImageMotion.mount('#hero', { mode: 'orbit', images: [...], count: 12 });
 *   im.set({ speed: 1.4 }); im.setMode('tunnel'); im.pause(); im.play(); im.destroy();
 *
 * Or declaratively with a data attribute on the container:
 *   data-image-motion='{"mode":"float","count":10}'
 *
 * The file contains no literal HTML tags so it can be safely inlined in a page.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ImageMotion = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ───────────────────────── utilities ───────────────────────── */
  const TAU = Math.PI * 2;
  const DEG = 180 / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mod = (n, m) => ((n % m) + m) % m;
  const frac = (n) => n - Math.floor(n);
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  /** Small seeded PRNG (mulberry32) so layouts are reproducible for a given seed. */
  function rng(seed) {
    let a = (seed * 1_000_003 + 12345) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const Ease = {
    linear: (t) => t,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inOutBack: (t) => { const c = 1.2, c2 = c * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2; },
  };
  const easeFn = (name) => Ease[name] || Ease.inOutCubic;
  const E = (name, t) => easeFn(name)(clamp(t, 0, 1));

  /**
   * Best-candidate scatter: natural looking, evenly spread points in a centred box,
   * optionally avoiding a central rectangle (for headline copy).
   */
  function scatter(n, W, H, rand, opt = {}) {
    const pts = [];
    const m = opt.margin ?? 0.05;
    const ax = (opt.avoidW ?? 0) / 2, ay = (opt.avoidH ?? 0) / 2;
    const sizeOf = opt.sizeOf || (() => ({ w: 0, h: 0 }));
    const pad = opt.pad ?? 0;
    for (let i = 0; i < n; i++) {
      const sz = sizeOf(i);
      const hw = Math.max(20, W * (0.5 - m) - sz.w / 2), hh = Math.max(20, H * (0.5 - m) - sz.h / 2);
      const ex = ax + sz.w / 2 + pad, ey = ay + sz.h / 2 + pad;   // card must clear the copy box entirely
      let best = null, bestD = -1;
      for (let k = 0; k < 28; k++) {
        const x = (rand() * 2 - 1) * hw, y = (rand() * 2 - 1) * hh;
        if (ax && ay && Math.abs(x) < ex && Math.abs(y) < ey) continue;
        let d = Infinity;
        for (const p of pts) d = Math.min(d, (p.x - x) ** 2 + (p.y - y) ** 2);
        if (d > bestD) { bestD = d; best = { x, y }; }
      }
      if (!best) {                                                  // no room outside the box: park on its rim
        const side = rand() < 0.5 ? -1 : 1;
        best = rand() < 0.5 ? { x: side * Math.min(hw, ex), y: (rand() * 2 - 1) * hh } : { x: (rand() * 2 - 1) * hw, y: side * Math.min(hh, ey) };
      }
      pts.push(best);
    }
    return pts;
  }

  /** Scatter options that respect the copy safe-zone and each card's real size. */
  function scatterOpts(ctx, pad = 0) {
    return {
      avoidW: ctx.cfg.avoidCenter ? ctx.W * ctx.cfg.avoidWidth : 0,
      avoidH: ctx.cfg.avoidCenter ? ctx.H * ctx.cfg.avoidHeight : 0,
      sizeOf: (i) => ({ w: ctx.cards[i]?.w || ctx.cfg.cardWidth, h: ctx.cards[i]?.h || ctx.cfg.cardHeight }),
      pad,
    };
  }

  /** Grid slots that fill the stage. */
  function grid(n, cols, W, H, padX = 0.1, padY = 0.12) {
    const rows = Math.max(1, Math.ceil(n / cols));
    const cw = (W * (1 - padX * 2)) / cols, ch = (H * (1 - padY * 2)) / rows;
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      out.push({ x: (c - (cols - 1) / 2) * cw, y: (r - (rows - 1) / 2) * ch, c, r, cols, rows, cw, ch });
    }
    return out;
  }

  /* ───────────────────────── defaults ───────────────────────── */
  const DEFAULTS = {
    mode: 'orbit',
    images: null,          // array of URLs or {src,label} | null → gradient placeholders
    labels: null,          // optional list of strings for `ticker` mode / captions
    count: 12,
    cardWidth: 150,
    cardHeight: 190,
    sizeVariance: 0.18,    // 0..1 random card size variation (collage modes only)
    aspectMix: true,       // mix aspect ratios (collage modes only)
    radius: 14,
    shadow: true,
    showLabels: false,
    speed: 1,
    intensity: 1,          // global multiplier for motion amplitude
    easing: 'inOutCubic',  // easing for discrete transitions
    perspective: 1200,
    depthFade: 0.55,       // 0..1 how much far cards fade
    depthBlur: 3,          // px of blur for the farthest cards
    parallax: 0.5,         // mouse parallax strength (0 disables)
    hoverLift: true,
    hoverPause: false,
    seed: 7,
    autoplay: true,
    respectReducedMotion: true,
    avoidCenter: true,     // keep collage layouts away from the headline area
    avoidWidth: 0.56,      // fraction of stage width reserved for copy
    avoidHeight: 0.46,
  };

  const DEFAULT_LABELS = [
    'Brand films', 'Product shots', 'Campaign art', 'Social cuts', 'Motion graphics', 'Lookbooks',
    'Packaging', 'Editorial', 'Storyboards', 'Key visuals', 'Launch decks', 'Web heroes',
  ];

  /* ───────────────────────── modes ─────────────────────────
     Each mode: { id, name, group, description, defaults, schema, uniform?, layout(ctx), frame(ctx, i, pose) }
     ctx = { W, H, n, t, cfg, p (mode params), R (per-card random arrays), data (layout cache), mouse, cards }
     pose = { x, y, z, rx, ry, rz, s, o, img, depth }  — depth:false skips depth cues
  */
  const MODES = [];
  const registerMode = (m) => { MODES.push(m); return m; };
  const range = (key, label, min, max, step, hint) => ({ key, label, type: 'range', min, max, step, hint });
  const select = (key, label, options, hint) => ({ key, label, type: 'select', options, hint });
  const bool = (key, label, hint) => ({ key, label, type: 'boolean', hint });

  /* 1 · ORBIT — ring of cards circling the headline (video 1, “level up”) */
  registerMode({
    id: 'orbit', name: 'Orbit ring', group: 'reference',
    description: 'Cards circle the headline on one or two counter-rotating rings.',
    defaults: { radius: 0.4, rings: 1, tilt: 0, wobble: 1, faceCenter: false, direction: 1 },
    schema: [
      range('radius', 'Ring radius', 0.15, 0.6, 0.01),
      range('rings', 'Rings', 1, 3, 1),
      range('tilt', 'Ring tilt', 0, 75, 1, 'Rotates the ring plane for a 3D ellipse'),
      range('wobble', 'Wobble', 0, 3, 0.1),
      bool('faceCenter', 'Face the center'),
      select('direction', 'Direction', [{ value: 1, label: 'Clockwise' }, { value: -1, label: 'Counter-clockwise' }]),
    ],
    layout(ctx) {
      const rings = Math.max(1, Math.round(ctx.p.rings));
      return Array.from({ length: ctx.n }, (_, i) => ({ ring: i % rings, idx: Math.floor(i / rings), per: Math.ceil((ctx.n - (i % rings)) / rings) }));
    },
    frame(ctx, i, pose) {
      const { W, H, t, p, R } = ctx;
      const d = ctx.data[i];
      const rings = Math.max(1, Math.round(p.rings));
      const base = Math.min(W, H) * p.radius;
      const ringScale = 1 - d.ring * (0.42 / rings);
      const dir = p.direction * (d.ring % 2 ? -1 : 1);
      const speed = 0.045 * TAU * (1 + d.ring * 0.25);
      const a = (d.idx / d.per) * TAU + dir * t * speed;
      const breathe = 1 + 0.025 * Math.sin(t * 0.6 + d.ring) * ctx.cfg.intensity;
      const r = base * ringScale * breathe;
      const tilt = (p.tilt * Math.PI) / 180;
      pose.x = Math.cos(a) * r;
      pose.y = Math.sin(a) * r * Math.cos(tilt);
      pose.z = Math.sin(a) * r * Math.sin(tilt) - d.ring * 120;
      pose.rz = p.faceCenter ? a * DEG + 90 : Math.sin(t * 0.8 + R[i][0] * TAU) * 4 * p.wobble * ctx.cfg.intensity;
      pose.s = 1 - d.ring * 0.12;
      pose.y += Math.sin(t * 1.1 + R[i][1] * TAU) * 6 * p.wobble * ctx.cfg.intensity;
    },
  });

  /* 2 · STACK — plates stacked above / below copy, the front one flipping to the back (video 1, “stepping up”) */
  registerMode({
    id: 'stack', name: 'Stack cascade', group: 'reference', uniform: true,
    description: 'Plates stacked in perspective; the front plate flips over to the back on a beat.',
    defaults: { groups: 2, period: 1.6, tilt: 58, gap: 0.22, lift: 1.1, flip: true, spread: 0.3 },
    schema: [
      range('groups', 'Stacks', 1, 3, 1),
      range('period', 'Beat (s)', 0.5, 4, 0.1),
      range('tilt', 'Plate tilt', 0, 80, 1),
      range('gap', 'Plate gap', 0.08, 0.5, 0.01),
      range('lift', 'Flip height', 0.2, 2.5, 0.1),
      range('spread', 'Stack distance', 0, 0.45, 0.01),
      bool('flip', 'Flip while travelling'),
    ],
    layout(ctx) {
      const g = Math.max(1, Math.round(ctx.p.groups));
      const per = Math.ceil(ctx.n / g);
      return Array.from({ length: ctx.n }, (_, i) => ({ g: i % g, k: Math.floor(i / g), m: Math.ceil((ctx.n - (i % g)) / g), per }));
    },
    frame(ctx, i, pose) {
      const { H, t, p, cfg } = ctx;
      const d = ctx.data[i];
      const g = Math.max(1, Math.round(p.groups));
      const gapY = cfg.cardHeight * p.gap;
      const groupY = g === 1 ? 0 : (d.g - (g - 1) / 2) * H * p.spread * 2;
      const tl = t / p.period + d.g / g; // stagger groups
      const step = Math.floor(tl);
      const e = E(cfg.easing, frac(tl));
      const posOf = (q) => ({ y: groupY + (q - (d.m - 1) / 2) * gapY, z: -q * 26, s: 1 - q * 0.035 });
      const cur = mod(d.k - step, d.m);          // current slot (0 = front/top)
      const next = cur === 0 ? d.m - 1 : cur - 1;
      const A = posOf(cur), B = posOf(next);
      const wrapping = cur === 0;
      pose.y = lerp(A.y, B.y, e);
      pose.z = lerp(A.z, B.z, e);
      pose.s = lerp(A.s, B.s, e);
      pose.rx = p.tilt;
      if (wrapping) {
        const arc = Math.sin(Math.PI * e);
        pose.y -= arc * cfg.cardHeight * p.lift * cfg.intensity;
        pose.z += arc * 220;
        if (p.flip) pose.rx += 360 * e;
        pose.o = 1 - 0.25 * arc;
      }
    },
  });

  /* 3 · BURST — orbiting ring that explodes outward and re-forms (video 1 transition) */
  registerMode({
    id: 'burst', name: 'Burst & re-form', group: 'reference',
    description: 'A ring that periodically blows apart, fades and regroups from the centre.',
    defaults: { radius: 0.34, period: 6, force: 2.4, spin: 1 },
    schema: [
      range('radius', 'Ring radius', 0.15, 0.6, 0.01),
      range('period', 'Cycle (s)', 2, 14, 0.5),
      range('force', 'Burst distance', 1.2, 4, 0.1),
      range('spin', 'Spin on burst', 0, 3, 0.1),
    ],
    frame(ctx, i, pose) {
      const { W, H, n, t, p, R, cfg } = ctx;
      const base = Math.min(W, H) * p.radius;
      const a = (i / n) * TAU + t * 0.28;
      const u = frac(t / p.period);
      const stag = R[i][0] * 0.08;
      let r = base, s = 1, o = 1, extraRot = 0;
      if (u > 0.72 && u <= 0.88) {                     // explode
        const e = Ease.inOutCubic(clamp((u - 0.72 - stag * 0.5) / 0.13, 0, 1));
        r = base * lerp(1, p.force, e);
        o = 1 - Ease.outCubic(e);
        extraRot = e * 70 * p.spin * (R[i][1] - 0.5) * 2;
        s = 1 + e * 0.25;
      } else if (u > 0.88) {                            // re-enter from centre
        const e = Ease.outBack(clamp((u - 0.88 - stag) / 0.11, 0, 1));
        r = base * e;
        s = lerp(0.3, 1, e);
        o = Ease.outCubic(clamp((u - 0.88 - stag) / 0.06, 0, 1));
      }
      pose.x = Math.cos(a) * r;
      pose.y = Math.sin(a) * r + Math.sin(t * 1.2 + R[i][2] * TAU) * 5 * cfg.intensity;
      pose.rz = Math.sin(t * 0.9 + R[i][3] * TAU) * 4 * cfg.intensity + extraRot;
      pose.s = s; pose.o = o;
    },
  });

  /* 4 · CONVERGE — tight cluster that expands into a collage and gathers back (video 1, “expand your reach”) */
  registerMode({
    id: 'converge', name: 'Converge & expand', group: 'reference',
    description: 'Cards huddle in the middle, then spread into a collage around the copy and gather again.',
    defaults: { period: 9, cluster: 0.12, hold: 0.45, stagger: 0.6 },
    schema: [
      range('period', 'Cycle (s)', 3, 20, 0.5),
      range('cluster', 'Cluster size', 0.02, 0.4, 0.01),
      range('hold', 'Hold expanded', 0.1, 0.8, 0.05, 'Fraction of the cycle spent expanded'),
      range('stagger', 'Stagger', 0, 1, 0.05),
    ],
    layout(ctx) {
      const rand = rng(ctx.cfg.seed + 31);
      const pts = scatter(ctx.n, ctx.W, ctx.H, rand, scatterOpts(ctx, 8));
      return pts.map((pt, i) => ({ ...pt, cx: (ctx.R[i][0] - 0.5) * ctx.W * 0.2, cy: (ctx.R[i][1] - 0.5) * ctx.H * 0.28, order: ctx.R[i][2] }));
    },
    frame(ctx, i, pose) {
      const { t, p, R, cfg } = ctx;
      const d = ctx.data[i];
      const u = frac(t / p.period);
      const hold = p.hold, trans = (1 - hold) / 2 * 0.8;   // gather-hold-expand-hold
      const st = d.order * p.stagger * trans * 0.6;
      let k;
      if (u < trans) k = E(cfg.easing, (u - st) / (trans - st * 0.4));            // expanding
      else if (u < trans + hold) k = 1;                                          // holding expanded
      else if (u < trans * 2 + hold) k = 1 - E(cfg.easing, (u - trans - hold - st) / (trans - st * 0.4)); // contracting
      else k = 0;
      k = clamp(k, 0, 1);
      const sizeK = clamp(p.cluster / 0.12, 0.35, 1.2);
      pose.x = lerp(d.cx * sizeK, d.x, k);
      pose.y = lerp(d.cy * sizeK, d.y, k);
      pose.z = lerp(-120 + R[i][3] * 200, 0, k);
      pose.s = lerp(0.45, 1, k);
      pose.rz = lerp((R[i][4] - 0.5) * 34, (R[i][4] - 0.5) * 6, k) + Math.sin(t * 0.7 + R[i][5] * TAU) * 1.5 * k;
      pose.y += Math.sin(t * 0.9 + R[i][6] * TAU) * 7 * k * cfg.intensity;
    },
  });

  /* 5 · SHUFFLE — scattered collage where cards swap on a staggered rhythm (video 2) */
  registerMode({
    id: 'shuffle', name: 'Shuffle collage', group: 'reference',
    description: 'A scattered collage whose cards pop, flip or slide out and are replaced one at a time.',
    defaults: { period: 4.2, swap: 0.22, style: 'pop', idle: 1 },
    schema: [
      range('period', 'Swap period (s)', 1.5, 10, 0.1),
      range('swap', 'Transition length', 0.08, 0.5, 0.01, 'Fraction of the period spent transitioning'),
      select('style', 'Swap style', [{ value: 'pop', label: 'Pop' }, { value: 'flip', label: 'Flip' }, { value: 'slide', label: 'Slide up' }, { value: 'zoom', label: 'Zoom through' }]),
      range('idle', 'Idle drift', 0, 3, 0.1),
    ],
    layout(ctx) {
      const rand = rng(ctx.cfg.seed + 7);
      return scatter(ctx.n, ctx.W, ctx.H, rand, scatterOpts(ctx, 6));
    },
    frame(ctx, i, pose) {
      const { t, n, p, R, cfg } = ctx;
      const d = ctx.data[i];
      const tl = t / p.period + R[i][0];
      const cycle = Math.floor(tl), u = frac(tl);
      pose.img = i + cycle * n;                            // which image this slot shows now
      pose.x = d.x + Math.sin(t * 0.5 + R[i][1] * TAU) * 6 * p.idle * cfg.intensity;
      pose.y = d.y + Math.cos(t * 0.6 + R[i][2] * TAU) * 6 * p.idle * cfg.intensity;
      pose.rz = (R[i][3] - 0.5) * 5;
      const inD = p.swap, outD = p.swap * 0.6;
      let e = null, dirn = 0;
      if (u < inD) { e = E(cfg.easing === 'linear' ? 'outCubic' : cfg.easing, u / inD); dirn = 1; }
      else if (u > 1 - outD) { e = 1 - E('inOutCubic', (u - (1 - outD)) / outD); dirn = -1; }
      if (e !== null) {
        switch (p.style) {
          case 'flip': pose.ry = dirn > 0 ? lerp(-95, 0, Ease.outCubic(e)) : lerp(95, 0, e); pose.o = e < 0.5 && dirn < 0 ? e * 2 : 1; break;
          case 'slide': pose.y += dirn > 0 ? lerp(40, 0, e) : lerp(-40, 0, e); pose.o = e; break;
          case 'zoom': pose.s = dirn > 0 ? lerp(0.2, 1, e) : lerp(1.6, 1, e); pose.z = dirn > 0 ? lerp(-300, 0, e) : lerp(220, 0, e); pose.o = e; break;
          default: pose.s = dirn > 0 ? lerp(0.55, 1, Ease.outBack(e)) : lerp(0.75, 1, e); pose.o = e;
        }
      }
    },
  });

  /* 6 · FLOAT — drifting field with depth (video 3) */
  registerMode({
    id: 'float', name: 'Floating field', group: 'reference',
    description: 'Cards hover in place with soft drift, sway and depth-based parallax.',
    defaults: { amplitude: 14, sway: 3, depth: 320, speedVar: 1 },
    schema: [
      range('amplitude', 'Drift (px)', 0, 60, 1),
      range('sway', 'Sway (deg)', 0, 12, 0.5),
      range('depth', 'Depth range', 0, 900, 10),
      range('speedVar', 'Tempo variation', 0, 2, 0.1),
    ],
    layout(ctx) {
      const rand = rng(ctx.cfg.seed + 3);
      const pts = scatter(ctx.n, ctx.W, ctx.H, rand, scatterOpts(ctx, ctx.p.amplitude * 1.5 * ctx.cfg.intensity));
      return pts.map((pt, i) => ({ ...pt, zf: ctx.R[i][7] - 0.5 }));
    },
    frame(ctx, i, pose) {
      const { t, p, R, cfg, mouse } = ctx;
      const d = ctx.data[i];
      const f1 = 0.35 + R[i][0] * 0.3 * p.speedVar, f2 = 0.5 + R[i][1] * 0.4 * p.speedVar;
      const A = p.amplitude * cfg.intensity;
      pose.x = d.x + A * (Math.sin(t * f1 + R[i][2] * TAU) + 0.5 * Math.sin(t * f2 * 1.7 + R[i][3] * TAU));
      pose.y = d.y + A * (Math.cos(t * f2 + R[i][4] * TAU) + 0.5 * Math.sin(t * f1 * 1.3 + R[i][5] * TAU));
      pose.z = d.zf * p.depth;
      pose.rz = (R[i][6] - 0.5) * 10 + Math.sin(t * f1 * 0.8 + R[i][6] * TAU) * p.sway * cfg.intensity;
      // extra per-depth parallax on top of the scene tilt
      pose.x += mouse.x * cfg.parallax * 36 * (0.4 + d.zf);
      pose.y += mouse.y * cfg.parallax * 24 * (0.4 + d.zf);
    },
  });

  /* 7 · TUNNEL — corridor of panels on the walls, travelling forward (video 4) */
  registerMode({
    id: 'tunnel', name: 'Gallery tunnel', group: 'reference', uniform: true,
    description: 'Panels line the walls of a corridor receding to a vanishing point while you glide through.',
    defaults: { width: 0.92, gap: 1.25, travel: 90, splay: 12, walls: 'sides', panelScale: 1.9, jitter: 0.5 },
    schema: [
      range('width', 'Corridor width', 0.5, 1.4, 0.01),
      range('gap', 'Panel spacing', 1.02, 2.5, 0.01),
      range('travel', 'Travel speed', 0, 400, 5),
      range('splay', 'Panel splay (deg)', -30, 45, 1, 'Turns panels towards the viewer'),
      select('walls', 'Walls', [{ value: 'sides', label: 'Left & right' }, { value: 'all', label: 'All four' }, { value: 'floor', label: 'Sides + floor' }]),
      range('panelScale', 'Panel size', 1, 3, 0.05),
      range('jitter', 'Height jitter', 0, 1, 0.05),
    ],
    layout(ctx) {
      const wallList = ctx.p.walls === 'all' ? ['L', 'R', 'T', 'B'] : ctx.p.walls === 'floor' ? ['L', 'R', 'B'] : ['L', 'R'];
      const wc = wallList.length;
      return Array.from({ length: ctx.n }, (_, i) => ({ wall: wallList[i % wc], slot: Math.floor(i / wc), per: Math.ceil((ctx.n - (i % wc)) / wc) }));
    },
    frame(ctx, i, pose) {
      const { W, H, t, p, R, cfg } = ctx;
      const d = ctx.data[i];
      const P = cfg.perspective;
      const panelW = cfg.cardWidth * p.panelScale;
      const D = panelW * p.gap;
      const L = d.per * D;
      const zNear = P * 0.42;
      const z = zNear - mod(d.slot * D - t * p.travel, L);
      const zFar = zNear - L;
      const hw = (W * p.width) / 2, hh = (H * p.width) / 2 * 0.9;
      const jit = (R[i][0] - 0.5) * p.jitter;
      const splay = p.splay;
      pose.z = z;
      switch (d.wall) {
        case 'L': pose.x = -hw + R[i][1] * W * 0.04; pose.y = jit * H * 0.35; pose.ry = 90 - splay; break;
        case 'R': pose.x = hw - R[i][1] * W * 0.04; pose.y = jit * H * 0.35; pose.ry = -90 + splay; break;
        case 'T': pose.y = -hh; pose.x = jit * W * 0.4; pose.rx = -90 + splay; break;
        default:  pose.y = hh; pose.x = jit * W * 0.4; pose.rx = 90 - splay; break;
      }
      pose.s = p.panelScale * (0.9 + R[i][2] * 0.25);
      const nearFade = clamp((zNear - z) / (D * 0.9), 0, 1);
      const farFade = clamp((z - zFar) / (D * 2), 0, 1);
      pose.o = nearFade * farFade;
      pose.depth = false;
      pose.blur = (1 - nearFade) * 6 + (1 - farFade) * cfg.depthBlur;
    },
  });

  /* 8 · TICKER — vertical word list with a swapping thumbnail (video 1, “endless tools”) */
  registerMode({
    id: 'ticker', name: 'List ticker', group: 'reference', uniform: true, usesLabels: true,
    description: 'A scrolling list of names with the current one highlighted and a thumbnail that swaps beside it.',
    defaults: { period: 1.1, rowHeight: 40, side: 1, offset: 0.22, thumb: 0.8 },
    schema: [
      range('period', 'Beat (s)', 0.3, 3, 0.05),
      range('rowHeight', 'Row height', 24, 72, 1),
      select('side', 'Thumbnail side', [{ value: 1, label: 'Right' }, { value: -1, label: 'Left' }, { value: 0, label: 'Behind text' }]),
      range('offset', 'Thumbnail offset', 0, 0.45, 0.01),
      range('thumb', 'Thumbnail size', 0.4, 1.6, 0.05),
    ],
    setup(inst) {
      const el = document.createElement('div');
      el.className = 'im-ticker';
      el.innerHTML = '<div class="im-ticker__list"></div>';
      inst.layerEl.appendChild(el);
      inst._ticker = { el, list: el.firstElementChild, items: [], built: '' };
    },
    teardown(inst) { inst._ticker?.el.remove(); inst._ticker = null; },
    frame(ctx, i, pose) {
      const { t, n, p, cfg, inst, H, W } = ctx;
      const labels = (cfg.labels && cfg.labels.length ? cfg.labels : DEFAULT_LABELS);
      const m = labels.length;
      const tk = inst._ticker;
      const tl = t / p.period;
      const step = Math.floor(tl), e = E(cfg.easing, frac(tl));
      const pos = mod(step, m) + e;
      if (i === 0 && tk) {                                   // update DOM list once per frame
        const copies = Math.ceil(H / p.rowHeight / m) + 3;
        const key = labels.join('|') + copies + p.rowHeight;
        if (tk.built !== key) {
          tk.list.innerHTML = '';
          tk.items = [];
          for (let c = 0; c < copies; c++) for (let k = 0; k < m; k++) {
            const s = document.createElement('span');
            s.className = 'im-ticker__item'; s.textContent = labels[k];
            s.style.height = p.rowHeight + 'px';
            tk.list.appendChild(s); tk.items.push(s);
          }
          tk.built = key;
        }
        const center = Math.floor(copies / 2) * m;
        tk.list.style.transform = `translateY(${-(center + pos) * p.rowHeight}px)`;
        for (let k = 0; k < tk.items.length; k++) {
          const dist = Math.abs(k - (center + pos));
          const it = tk.items[k];
          it.style.opacity = clamp(1 - dist * 0.16, 0.08, 1).toFixed(2);
          it.classList.toggle('is-active', dist < 0.5);
        }
      }
      const active = mod(step, n);
      const prev = mod(step - 1, n);
      const side = p.side;
      const sx = side === 0 ? 0 : side * W * p.offset;
      pose.depth = false;
      pose.s = p.thumb;
      if (i === active) {
        const k = Ease.outBack(clamp(e / 0.45, 0, 1));
        pose.img = step;                                        // image index follows the beat
        pose.x = sx; pose.y = lerp(30, 0, k); pose.s = p.thumb * lerp(0.7, 1, k);
        pose.o = clamp(e / 0.25, 0, 1); pose.z = side === 0 ? -80 : 0;
        pose.rz = lerp(-4, 0, k);
      } else if (i === prev) {
        const k = Ease.inOutCubic(clamp(e / 0.35, 0, 1));
        pose.img = step - 1;
        pose.x = sx; pose.y = -k * 34; pose.s = p.thumb * lerp(1, 0.85, k);
        pose.o = 1 - k; pose.z = side === 0 ? -80 : 0;
      } else { pose.o = 0; pose.s = 0.5; pose.x = sx; }
    },
  });

  /* ── extra variations ─────────────────────────────────────── */

  /* 9 · MARQUEE — belts of cards at different depths scrolling in alternate directions */
  registerMode({
    id: 'marquee', name: 'Marquee belts', group: 'extra', uniform: true,
    description: 'Rows of cards glide sideways at different speeds and depths, like layered conveyor belts.',
    defaults: { rows: 3, gap: 0.18, velocity: 60, depthSpread: 500, tilt: 0, slant: 0 },
    schema: [
      range('rows', 'Rows', 1, 5, 1), range('gap', 'Gap', 0, 0.8, 0.01), range('velocity', 'Velocity', 10, 240, 5),
      range('depthSpread', 'Depth spread', 0, 1200, 10), range('tilt', 'Row tilt (deg)', -45, 45, 1), range('slant', 'Slant (deg)', -30, 30, 1),
    ],
    layout(ctx) {
      const rows = Math.max(1, Math.round(ctx.p.rows));
      const per = Math.ceil(ctx.n / rows);
      return Array.from({ length: ctx.n }, (_, i) => ({ row: i % rows, k: Math.floor(i / rows), per, rows }));
    },
    frame(ctx, i, pose) {
      const { W, t, p, cfg } = ctx;
      const d = ctx.data[i];
      const rowH = cfg.cardHeight * (1 + p.gap);
      const spacing = Math.max(cfg.cardWidth * (1 + p.gap), (W + cfg.cardWidth * 1.4) / d.per);
      const len = d.per * spacing;
      const dir = d.row % 2 ? -1 : 1;
      const z = ((d.row * 0.618 + 0.25) % 1 - 0.5) * p.depthSpread;
      const parallaxV = p.velocity * (1 + z / (cfg.perspective * 1.2));
      pose.x = mod(d.k * spacing + dir * t * parallaxV + len / 2, len) - len / 2;
      pose.y = (d.row - (d.rows - 1) / 2) * rowH;
      pose.z = z;
      pose.rx = p.tilt; pose.rz = p.slant;
      const edge = clamp((len / 2 - Math.abs(pose.x)) / (cfg.cardWidth * 0.6), 0, 1);
      pose.o = edge;
    },
  });

  /* 10 · COVERFLOW — stepped carousel with angled neighbours */
  registerMode({
    id: 'coverflow', name: 'Coverflow', group: 'extra', uniform: true,
    description: 'A centred card with angled neighbours receding to each side, stepping on a beat.',
    defaults: { period: 2.2, spacing: 0.78, angle: 46, depth: 140, continuous: false },
    schema: [
      range('period', 'Beat (s)', 0.6, 6, 0.1), range('spacing', 'Spacing', 0.3, 1.2, 0.01), range('angle', 'Side angle', 0, 80, 1), range('depth', 'Recede depth', 0, 600, 10), bool('continuous', 'Continuous glide'),
    ],
    frame(ctx, i, pose) {
      const { n, t, p, cfg } = ctx;
      const tl = t / p.period;
      const center = p.continuous ? tl : Math.floor(tl) + E(cfg.easing, frac(tl));
      const d = mod(i - center + n / 2, n) - n / 2;
      const ad = Math.abs(d), sg = Math.sign(d);
      const sp = cfg.cardWidth * p.spacing;
      pose.x = sg * (Math.min(ad, 1) * sp * 1.25 + Math.max(ad - 1, 0) * sp);
      pose.z = -ad * p.depth;
      pose.ry = -clamp(d, -1, 1) * p.angle;
      pose.s = 1 - Math.min(ad, 1) * 0.08;
      pose.o = clamp((n / 2 - ad) / 1.2, 0, 1);
    },
  });

  /* 11 · WAVE — grid rippling in depth */
  registerMode({
    id: 'wave', name: 'Grid wave', group: 'extra', uniform: true,
    description: 'A tidy grid that ripples in and out of the screen like a slow wave.',
    defaults: { cols: 5, amplitude: 90, wavelength: 1.6, tempo: 0.9, tiltAmount: 10 },
    schema: [range('cols', 'Columns', 2, 8, 1), range('amplitude', 'Amplitude', 0, 300, 5), range('wavelength', 'Wavelength', 0.5, 4, 0.1), range('tempo', 'Tempo', 0.1, 3, 0.05), range('tiltAmount', 'Tilt', 0, 30, 1)],
    layout(ctx) { return grid(ctx.n, Math.max(2, Math.round(ctx.p.cols)), ctx.W, ctx.H); },
    frame(ctx, i, pose) {
      const { t, p, cfg } = ctx;
      const d = ctx.data[i];
      const ph = (d.c * 0.9 + d.r * 1.1) / p.wavelength;
      const w = t * p.tempo * 1.6 - ph;
      pose.x = d.x; pose.y = d.y;
      pose.z = Math.sin(w) * p.amplitude * cfg.intensity;
      pose.rx = Math.cos(w) * p.tiltAmount * 0.6;
      pose.ry = -Math.cos(w) * p.tiltAmount;
      pose.s = Math.min(d.cw / cfg.cardWidth, d.ch / cfg.cardHeight) * 0.9;
    },
  });

  /* 12 · HELIX — spiral staircase of cards */
  registerMode({
    id: 'helix', name: 'Helix', group: 'extra', uniform: true,
    description: 'Cards climb a rotating spiral, facing outward, endlessly rising.',
    defaults: { radius: 0.3, turns: 1.6, rise: 0.05, spin: 0.35, height: 1.2 },
    schema: [range('radius', 'Radius', 0.1, 0.6, 0.01), range('turns', 'Turns', 0.5, 4, 0.1), range('rise', 'Rise speed', -0.3, 0.3, 0.01), range('spin', 'Spin speed', -1.5, 1.5, 0.05), range('height', 'Height', 0.5, 2, 0.05)],
    frame(ctx, i, pose) {
      const { W, H, n, t, p } = ctx;
      const u = mod(i / n + t * p.rise, 1);
      const a = u * p.turns * TAU + t * p.spin;
      const R = Math.min(W, H) * p.radius;
      pose.x = Math.cos(a) * R; pose.z = Math.sin(a) * R;
      pose.y = (0.5 - u) * H * p.height;
      pose.ry = 90 - a * DEG;
      const end = Math.min(u, 1 - u) / 0.12;
      pose.o = clamp(end, 0, 1);
    },
  });

  /* 13 · CASCADE — slow rain of cards */
  registerMode({
    id: 'cascade', name: 'Cascade', group: 'extra',
    description: 'Cards drift down the screen at different depths and speeds like slow falling leaves.',
    defaults: { velocity: 50, variance: 0.6, sway: 30, spin: 12, depth: 500, direction: 1 },
    schema: [range('velocity', 'Fall speed', 5, 200, 5), range('variance', 'Speed variance', 0, 1, 0.05), range('sway', 'Sway', 0, 120, 2), range('spin', 'Spin', 0, 90, 1), range('depth', 'Depth range', 0, 1200, 10), select('direction', 'Direction', [{ value: 1, label: 'Down' }, { value: -1, label: 'Up' }])],
    frame(ctx, i, pose) {
      const { W, H, t, p, R, cfg } = ctx;
      const zf = R[i][0] - 0.5;
      const v = p.velocity * (1 + (R[i][1] - 0.5) * 2 * p.variance) * (1 + zf * 0.6);
      const span = H + cfg.cardHeight * 2.4;
      pose.y = p.direction * (mod(R[i][2] * span + t * v, span) - span / 2);
      pose.x = (R[i][3] - 0.5) * W * 0.9 + Math.sin(t * 0.5 + R[i][4] * TAU) * p.sway * cfg.intensity;
      pose.z = zf * p.depth;
      pose.rz = (R[i][5] - 0.5) * p.spin + Math.sin(t * 0.4 + R[i][6] * TAU) * p.spin * 0.4;
    },
  });

  /* 14 · FAN — a hand of cards fanning open and closed */
  registerMode({
    id: 'fan', name: 'Fan deck', group: 'extra', uniform: true,
    description: 'A deck pivots open like a hand of cards, holds, and closes again.',
    defaults: { period: 6, spreadAngle: 92, pivot: 0.7, hold: 0.35 },
    schema: [range('period', 'Cycle (s)', 2, 14, 0.5), range('spreadAngle', 'Spread (deg)', 20, 220, 2), range('pivot', 'Pivot distance', 0.3, 1.5, 0.01), range('hold', 'Hold open', 0, 0.8, 0.05)],
    frame(ctx, i, pose) {
      const { H, n, t, p, cfg } = ctx;
      const u = frac(t / p.period);
      const tr = (1 - p.hold) / 2;
      let open;
      if (u < tr) open = E(cfg.easing, u / tr);
      else if (u < tr + p.hold) open = 1;
      else open = 1 - E(cfg.easing, (u - tr - p.hold) / tr);
      const Rr = H * p.pivot;
      const a = ((i - (n - 1) / 2) / Math.max(1, n - 1)) * p.spreadAngle * open * (Math.PI / 180);
      pose.x = Math.sin(a) * Rr;
      pose.y = H * 0.12 + Rr - Math.cos(a) * Rr - (1 - open) * H * 0.05;
      pose.rz = a * DEG;
      pose.z = i * 1.5;
    },
  });

  /* 15 · MOSAIC — cards fly in to assemble a grid, hold, and fly out */
  registerMode({
    id: 'mosaic', name: 'Mosaic assemble', group: 'extra', uniform: true,
    description: 'Cards fly in from off-screen to assemble a mosaic, hold, then scatter out again.',
    defaults: { cols: 4, period: 7, hold: 0.45, distance: 1.2, stagger: 0.5 },
    schema: [range('cols', 'Columns', 2, 8, 1), range('period', 'Cycle (s)', 3, 16, 0.5), range('hold', 'Hold', 0.1, 0.8, 0.05), range('distance', 'Fly distance', 0.5, 2.5, 0.05), range('stagger', 'Stagger', 0, 1, 0.05)],
    layout(ctx) {
      const g = grid(ctx.n, Math.max(2, Math.round(ctx.p.cols)), ctx.W, ctx.H, 0.14, 0.12);
      return g.map((s, i) => ({ ...s, ang: ctx.R[i][0] * TAU, order: ctx.R[i][1] }));
    },
    frame(ctx, i, pose) {
      const { W, H, t, p, R, cfg } = ctx;
      const d = ctx.data[i];
      const u = frac(t / p.period);
      const tr = (1 - p.hold) / 2;
      const st = d.order * p.stagger * tr * 0.7;
      const dist = Math.max(W, H) * p.distance;
      const fx = Math.cos(d.ang) * dist, fy = Math.sin(d.ang) * dist;
      let k, phase;
      if (u < tr) { k = E('outExpo', (u - st) / (tr - st)); phase = 'in'; }
      else if (u < tr + p.hold) { k = 1; phase = 'hold'; }
      else { k = 1 - E('inOutCubic', (u - tr - p.hold - st) / (tr - st)); phase = 'out'; }
      k = clamp(k, 0, 1);
      const sx = phase === 'out' ? -fx : fx, sy = phase === 'out' ? -fy : fy;
      pose.x = lerp(d.x + sx, d.x, k);
      pose.y = lerp(d.y + sy, d.y, k);
      pose.z = lerp(-400, 0, k);
      pose.rz = lerp((R[i][2] - 0.5) * 60, 0, k);
      pose.s = Math.min(d.cw / cfg.cardWidth, d.ch / cfg.cardHeight) * 0.92 * lerp(0.6, 1, k);
      pose.o = k < 0.02 ? 0 : 1;
      if (phase === 'hold') pose.y += Math.sin(t * 0.9 + R[i][3] * TAU) * 3 * cfg.intensity;
    },
  });

  /* 16 · SPHERE — cards on a slowly turning globe */
  registerMode({
    id: 'sphere', name: 'Sphere', group: 'extra', uniform: true,
    description: 'Cards distributed over a globe that turns slowly, fading on the far side.',
    defaults: { radius: 0.38, spin: 0.25, tilt: 18, backFade: 0.75, facing: 'camera' },
    schema: [range('radius', 'Radius', 0.15, 0.7, 0.01), range('spin', 'Spin speed', -1, 1, 0.05), range('tilt', 'Axis tilt', -60, 60, 1), range('backFade', 'Far-side fade', 0, 1, 0.05), select('facing', 'Cards face', [{ value: 'camera', label: 'The camera' }, { value: 'outward', label: 'Outward (globe skin)' }])],
    frame(ctx, i, pose) {
      const { W, H, n, t, p } = ctx;
      const R = Math.min(W, H) * p.radius;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);          // fibonacci sphere
      const theta = Math.PI * (1 + Math.sqrt(5)) * i + t * p.spin;
      let x = Math.sin(phi) * Math.cos(theta), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta);
      const tl = (p.tilt * Math.PI) / 180;                      // tilt around X
      const y2 = y * Math.cos(tl) - z * Math.sin(tl), z2 = y * Math.sin(tl) + z * Math.cos(tl);
      y = y2; z = z2;
      pose.x = x * R; pose.y = y * R; pose.z = z * R;
      if (p.facing === 'outward') { pose.ry = Math.atan2(x, z) * DEG; pose.rx = -Math.asin(clamp(y, -1, 1)) * DEG; }
      else { pose.ry = x * 12; pose.rx = -y * 8; }
      pose.s = p.facing === 'outward' ? 0.8 : lerp(0.55, 1, (z + 1) / 2);
      pose.o = 1 - p.backFade * clamp((-z + 0.15) / 1.1, 0, 1);
    },
  });

  /* 17 · SCATTER-DRIFT — slow parallax collage that never repeats (bonus, subtle) */
  registerMode({
    id: 'drift', name: 'Slow drift', group: 'extra',
    description: 'A collage that creeps sideways with depth parallax, wrapping seamlessly. Very calm.',
    defaults: { velocity: 18, depth: 700, direction: 1, sway: 2 },
    schema: [range('velocity', 'Velocity', 2, 120, 1), range('depth', 'Depth range', 0, 1400, 10), select('direction', 'Direction', [{ value: 1, label: 'Left' }, { value: -1, label: 'Right' }]), range('sway', 'Sway', 0, 8, 0.25)],
    layout(ctx) {
      const rand = rng(ctx.cfg.seed + 11);
      return scatter(ctx.n, ctx.W * 1.6, ctx.H, rand, { sizeOf: scatterOpts(ctx).sizeOf }).map((pt, i) => ({ ...pt, zf: ctx.R[i][7] - 0.5 }));
    },
    frame(ctx, i, pose) {
      const { W, t, p, R, cfg } = ctx;
      const d = ctx.data[i];
      const span = W * 1.6 + cfg.cardWidth * 2;
      const v = p.velocity * (1 + d.zf * 0.9);
      pose.x = mod(d.x - p.direction * t * v + span / 2, span) - span / 2;
      pose.y = d.y + Math.sin(t * 0.4 + R[i][1] * TAU) * 8 * cfg.intensity;
      pose.z = d.zf * p.depth;
      pose.rz = (R[i][2] - 0.5) * 6 + Math.sin(t * 0.5 + R[i][3] * TAU) * p.sway;
      pose.o = clamp((span / 2 - Math.abs(pose.x)) / (cfg.cardWidth * 0.8), 0, 1);
    },
  });

  const modeById = (id) => MODES.find((m) => m.id === id) || MODES[0];

  /* ───────────────────────── placeholders ───────────────────────── */
  function placeholders(n, seed = 1) {
    const rand = rng(seed + 99);
    return Array.from({ length: n }, (_, i) => {
      const h = Math.floor(rand() * 360), h2 = (h + 40 + rand() * 60) % 360;
      return { gradient: `linear-gradient(${Math.floor(rand() * 360)}deg, hsl(${h} 70% 58%), hsl(${h2} 75% 40%))`, label: `Image ${i + 1}` };
    });
  }

  /* ───────────────────────── instance ───────────────────────── */
  class ImageMotionInstance {
    constructor(el, options = {}) {
      this.el = typeof el === 'string' ? document.querySelector(el) : el;
      if (!this.el) throw new Error('ImageMotion: container not found');
      const { params, ...rest } = options;
      this.cfg = { ...DEFAULTS, ...rest };
      this.paramsByMode = {};
      if (params) this.paramsByMode[this.cfg.mode] = { ...params };
      this.mode = modeById(this.cfg.mode);
      this.t = 0;
      this.playing = false;
      this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      this.cards = [];
      this.listeners = {};
      this._build();
      this._bind();
      this._applyMode();
      this.refresh();
      this.reduced = this.cfg.respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.cfg.autoplay && !this.reduced) this.play(); else this._render();
    }

    /* — public API — */
    get params() { return this._params; }
    getConfig() {
      const { images, labels, ...rest } = this.cfg;
      return { ...rest, ...(images ? { images } : {}), ...(labels ? { labels } : {}), params: { ...this._params } };
    }
    set(patch = {}) {
      const { params, mode, ...rest } = patch;
      Object.assign(this.cfg, rest);
      if (params) Object.assign(this._params, params);
      if (rest.images !== undefined || rest.count !== undefined || rest.seed !== undefined || rest.showLabels !== undefined) this._ensureCards();
      if (mode && mode !== this.mode.id) return this.setMode(mode);
      this.refresh();
      if (!this.playing) this._render();
      this._emit('change');
      return this;
    }
    setMode(id, params) {
      const m = modeById(id);
      if (this.mode && this.mode.teardown) this.mode.teardown(this);
      this.paramsByMode[this.mode.id] = this._params;
      this.mode = m;
      this.cfg.mode = m.id;
      if (params) this.paramsByMode[m.id] = { ...(this.paramsByMode[m.id] || {}), ...params };
      this._applyMode();
      this.refresh();
      if (!this.playing) this._render();
      this._emit('change');
      return this;
    }
    resetParams() { this._params = { ...this.mode.defaults }; this.refresh(); this._emit('change'); return this; }
    setImages(images) { return this.set({ images }); }
    play() { if (this.playing) return this; this.playing = true; this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); this.el.classList.add('im-stage--playing'); return this; }
    pause() { this.playing = false; cancelAnimationFrame(this._raf); this.el.classList.remove('im-stage--playing'); return this; }
    toggle() { return this.playing ? this.pause() : this.play(); }
    seek(t) { this.t = t; this._render(); return this; }
    restart() { this.t = 0; this._render(); return this; }
    refresh() {
      const r = this.el.getBoundingClientRect();
      this.W = r.width || this.el.offsetWidth || 800;
      this.H = r.height || this.el.offsetHeight || 500;
      this.el.style.setProperty('--im-perspective', this.cfg.perspective + 'px');
      this.el.style.setProperty('--im-radius', this.cfg.radius + 'px');
      this.el.classList.toggle('im-stage--shadow', !!this.cfg.shadow);
      this.el.classList.toggle('im-stage--hover-lift', !!this.cfg.hoverLift);
      this._sizeCards();
      this._layout();
      return this;
    }
    on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return this; }
    off(evt, fn) { this.listeners[evt] = (this.listeners[evt] || []).filter((f) => f !== fn); return this; }
    destroy() {
      this.pause();
      this._ro?.disconnect();
      this.el.removeEventListener('pointermove', this._onMove);
      this.el.removeEventListener('pointerleave', this._onLeave);
      this.el.removeEventListener('pointerenter', this._onEnter);
      if (this.mode.teardown) this.mode.teardown(this);
      this.layerEl.remove();
      this.el.classList.remove('im-stage', 'im-stage--playing', 'im-stage--shadow', 'im-stage--hover-lift');
      this.destroyed = true;
    }

    /* — internals — */
    _emit(evt) { (this.listeners[evt] || []).forEach((f) => f(this)); }
    _build() {
      this.el.classList.add('im-stage');
      const layer = document.createElement('div');
      layer.className = 'im-layer';
      layer.setAttribute('aria-hidden', 'true');
      const scene = document.createElement('div');
      scene.className = 'im-scene';
      layer.appendChild(scene);
      this.el.insertBefore(layer, this.el.firstChild);
      this.layerEl = layer; this.sceneEl = scene;
      this._ensureCards();
    }
    _bind() {
      this._onMove = (e) => {
        const r = this.el.getBoundingClientRect();
        this.mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        this.mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      this._onLeave = () => { this.mouse.tx = 0; this.mouse.ty = 0; if (this.cfg.hoverPause && this._pausedByHover) { this._pausedByHover = false; this.play(); } };
      this._onEnter = () => { if (this.cfg.hoverPause && this.playing) { this._pausedByHover = true; this.pause(); } };
      this.el.addEventListener('pointermove', this._onMove);
      this.el.addEventListener('pointerleave', this._onLeave);
      this.el.addEventListener('pointerenter', this._onEnter);
      if ('ResizeObserver' in window) { this._ro = new ResizeObserver(() => { this.refresh(); if (!this.playing) this._render(); }); this._ro.observe(this.el); }
      this._tick = (now) => {
        if (!this.playing) return;
        const dt = Math.min(0.1, (now - this._last) / 1000);
        this._last = now;
        this.t += dt * this.cfg.speed;
        this._render(dt);
        this._raf = requestAnimationFrame(this._tick);
      };
    }
    _applyMode() {
      this._params = { ...this.mode.defaults, ...(this.paramsByMode[this.mode.id] || {}) };
      this.el.dataset.imMode = this.mode.id;
      if (this.mode.setup) this.mode.setup(this);
      this._sizeCards();
    }
    _images() {
      const imgs = this.cfg.images;
      if (Array.isArray(imgs) && imgs.length) return imgs.map((x) => (typeof x === 'string' ? { src: x } : x));
      return placeholders(Math.max(this.cfg.count, 12), this.cfg.seed);
    }
    _ensureCards() {
      const n = Math.max(1, Math.round(this.cfg.count));
      const rand = rng(this.cfg.seed);
      this.R = Array.from({ length: n }, () => Array.from({ length: 8 }, rand));
      this.imageList = this._images();
      while (this.cards.length < n) {
        const fig = document.createElement('figure');
        fig.className = 'im-card';
        fig.innerHTML = '<div class="im-card__inner"><img class="im-card__img" alt="" decoding="async" loading="eager"></div><figcaption class="im-card__label"></figcaption>';
        this.sceneEl.appendChild(fig);
        this.cards.push({ el: fig, inner: fig.firstElementChild, img: fig.querySelector('img'), cap: fig.lastElementChild, imgIndex: -1, blur: -1 });
      }
      while (this.cards.length > n) this.cards.pop().el.remove();
      this.cards.forEach((c, i) => this._setImage(c, i));
      this.el.classList.toggle('im-stage--labels', !!this.cfg.showLabels);
    }
    _setImage(card, index) {
      const list = this.imageList;
      const idx = mod(index, list.length);
      if (card.imgIndex === idx) return;
      card.imgIndex = idx;
      const item = list[idx];
      if (item.src) {
        card.img.style.display = '';
        card.img.src = item.src; card.img.alt = item.alt || item.label || '';
        card.inner.style.background = '';
        card.img.onerror = () => { card.img.style.display = 'none'; card.inner.style.background = placeholders(1, idx + this.cfg.seed)[0].gradient; };
      } else {
        card.img.style.display = 'none'; card.img.removeAttribute('src');
        card.inner.style.background = item.gradient || item.color || '#444';
      }
      card.cap.textContent = item.label || '';
    }
    _sizeCards() {
      const { cardWidth, cardHeight, sizeVariance, aspectMix } = this.cfg;
      const uniform = this.mode.uniform;
      const aspects = [0.78, 1, 1.28, 1.5];
      this.cards.forEach((c, i) => {
        let w = cardWidth, h = cardHeight;
        if (!uniform) {
          const f = 1 + (this.R[i][6] - 0.5) * 2 * sizeVariance;
          if (aspectMix) { const a = aspects[Math.floor(this.R[i][5] * aspects.length)]; const area = cardWidth * cardHeight; w = Math.sqrt(area * a); h = area / w; }
          w *= f; h *= f;
        }
        c.w = w; c.h = h;
        c.el.style.width = w + 'px'; c.el.style.height = h + 'px';
        c.el.style.marginLeft = -w / 2 + 'px'; c.el.style.marginTop = -h / 2 + 'px';
      });
    }
    _ctx() {
      return { W: this.W, H: this.H, n: this.cards.length, t: this.t, cfg: this.cfg, p: this._params, R: this.R, data: this.data, mouse: this.mouse, cards: this.cards, inst: this };
    }
    _layout() { this.data = this.mode.layout ? this.mode.layout(this._ctx()) : null; }
    _render(dt = 1 / 60) {
      if (this.destroyed) return;
      const k = 1 - Math.pow(0.001, dt);          // smooth mouse follow
      this.mouse.x += (this.mouse.tx - this.mouse.x) * k * 0.9;
      this.mouse.y += (this.mouse.ty - this.mouse.y) * k * 0.9;
      const par = this.cfg.parallax;
      this.sceneEl.style.transform = par ? `rotateX(${(-this.mouse.y * 4 * par).toFixed(3)}deg) rotateY(${(this.mouse.x * 5 * par).toFixed(3)}deg)` : '';
      const ctx = this._ctx();
      const depthRange = this.cfg.perspective * 0.55;
      const pose = {};
      for (let i = 0; i < this.cards.length; i++) {
        const c = this.cards[i];
        pose.x = 0; pose.y = 0; pose.z = 0; pose.rx = 0; pose.ry = 0; pose.rz = 0; pose.s = 1; pose.o = 1; pose.img = null; pose.depth = true; pose.blur = null;
        this.mode.frame(ctx, i, pose);
        if (pose.img !== null) this._setImage(c, pose.img);
        let o = pose.o, blur = 0;
        if (pose.depth) {
          const far = clamp(-pose.z / depthRange, 0, 1);
          o *= 1 - this.cfg.depthFade * far * 0.85;
          blur = this.cfg.depthBlur * far * far;
        }
        if (pose.blur !== null) blur = pose.blur;
        c.el.style.transform = `translate3d(${pose.x.toFixed(2)}px,${pose.y.toFixed(2)}px,${pose.z.toFixed(2)}px) rotateX(${pose.rx.toFixed(2)}deg) rotateY(${pose.ry.toFixed(2)}deg) rotateZ(${pose.rz.toFixed(2)}deg) scale(${pose.s.toFixed(4)})`;
        c.el.style.opacity = clamp(o, 0, 1).toFixed(3);
        const bq = Math.round(blur * 2) / 2;
        if (bq !== c.blur) { c.blur = bq; c.img.style.filter = bq > 0 ? `blur(${bq}px)` : ''; c.inner.style.filter = c.img.style.display === 'none' && bq > 0 ? `blur(${bq}px)` : ''; }
      }
      this._emit('frame');
    }
  }

  /* ───────────────────────── public namespace ───────────────────────── */
  const api = {
    version: '1.0.0',
    mount: (el, options) => new ImageMotionInstance(el, options),
    modes: MODES,
    getMode: modeById,
    registerMode,
    defaults: DEFAULTS,
    defaultLabels: DEFAULT_LABELS,
    placeholders,
    easings: Object.keys(Ease),
    utils: { rng, scatter, grid, clamp, lerp, mod, Ease },
    autoInit(rootEl = document) {
      return Array.from(rootEl.querySelectorAll('[data-image-motion]')).map((el) => {
        if (el.__imageMotion) return el.__imageMotion;
        let opts = {};
        try { opts = JSON.parse(el.getAttribute('data-image-motion') || '{}'); } catch (e) { console.warn('ImageMotion: invalid JSON in data-image-motion', e); }
        return (el.__imageMotion = new ImageMotionInstance(el, opts));
      });
    },
  };
  if (typeof document !== 'undefined') {
    const boot = () => api.autoInit();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
  return api;
});
