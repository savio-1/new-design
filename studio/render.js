/* Studio — rendering engine.
   Pure canvas-2D drawing for every element type. The editor (Konva) calls
   drawElement() from each node's sceneFunc, and export/thumbnails call
   renderDoc() on a plain canvas, so what you see is exactly what you export. */
(function () {
  'use strict';

  const R = {};
  const TAU = Math.PI * 2;
  const Fonts = window.StudioFonts;

  /* ───────────────────────── resources ───────────────────────── */

  let assets = {};
  const imgCache = new Map();
  const svgCache = new Map();
  let redrawHook = () => {};
  let redrawQueued = false;
  R.fontsVersion = 0;

  function requestRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(() => { redrawQueued = false; redrawHook(); });
  }
  R.setAssets = a => { assets = a; };
  R.onRedraw = fn => { redrawHook = fn; };
  R.requestRedraw = requestRedraw;
  // safety net: any face finishing (e.g. one first used by the DOM) invalidates text metrics
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { R.fontsVersion++; requestRedraw(); });

  function loadImage(src, cache, key) {
    let e = cache.get(key);
    if (e && e.src === src) return e;
    const img = new Image();
    e = { img, ok: false, failed: false, src };
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    e.promise = new Promise(res => {
      img.onload = () => { e.ok = true; requestRedraw(); res(); };
      img.onerror = () => { e.failed = true; res(); };
    });
    img.src = src;
    cache.set(key, e);
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    return e;
  }
  function assetImage(id) {
    if (!id || !assets[id]) return null;
    const e = loadImage(assets[id], imgCache, id);
    return e.ok ? e.img : null;
  }
  R.assetImage = assetImage;

  let stickerMap = null;
  function stickerDef(id) {
    if (!stickerMap) {
      stickerMap = new Map();
      for (const s of (window.STICKERS || [])) stickerMap.set(s.id, s);
    }
    return stickerMap.get(id);
  }
  R.stickerDef = stickerDef;
  function stickerSvg(el) {
    const def = stickerDef(el.stickerId);
    if (!def) return null;
    const cols = (el.colors && el.colors.length === def.colors.length) ? el.colors : def.colors;
    return def.svg(cols);
  }
  function svgImage(svg) {
    const key = svg;
    const e = loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), svgCache, key);
    return e.ok ? e.img : null;
  }
  R.svgDataUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  /* ───────────────────────── small utils ───────────────────────── */

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const mcanvas = document.createElement('canvas');
  const mctx = mcanvas.getContext('2d');
  function rgba(color, a = 1) {
    if (!color || color === 'transparent') return 'rgba(0,0,0,0)';
    mctx.fillStyle = '#000';
    mctx.fillStyle = color;
    const c = mctx.fillStyle;
    if (c[0] === '#') {
      const n = parseInt(c.slice(1), 16);
      return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(',').map(parseFloat);
    return `rgba(${p[0]},${p[1]},${p[2]},${(p[3] ?? 1) * a})`;
  }
  R.rgba = rgba;
  function isClear(c) { return !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c); }
  function deviceScale(ctx) {
    const m = ctx.getTransform();
    return Math.hypot(m.a, m.b) || 1;
  }
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  class LRU {
    constructor(n) { this.n = n; this.m = new Map(); }
    get(k) { const v = this.m.get(k); if (v !== undefined) { this.m.delete(k); this.m.set(k, v); } return v; }
    set(k, v) { this.m.set(k, v); if (this.m.size > this.n) this.m.delete(this.m.keys().next().value); }
  }

  /* ───────────────────────── noise textures ───────────────────────── */

  let grainTex = null, paperTex = null;
  function grain() {
    if (grainTex) return grainTex;
    const c = canvas(256, 256), x = c.getContext('2d');
    const d = x.createImageData(256, 256), r = rng(7);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return (grainTex = c);
  }
  function paper() {
    if (paperTex) return paperTex;
    const S = 512, c = canvas(S, S), x = c.getContext('2d'), r = rng(11);
    x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const px = r() * S, py = r() * S, rad = 40 + r() * 140;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(120,100,70,${0.025 + r() * 0.04})`);
      g.addColorStop(1, 'rgba(120,100,70,0)');
      x.fillStyle = g;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.save(); x.translate(ox, oy); x.fillRect(px - rad, py - rad, rad * 2, rad * 2); x.restore(); }
    }
    const d = x.getImageData(0, 0, S, S);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = (r() - 0.5) * 26 + (r() < 0.004 ? -60 * r() : 0);
      d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
    }
    x.putImageData(d, 0, 0);
    // short fibres
    x.strokeStyle = 'rgba(90,80,60,0.08)'; x.lineWidth = 0.6;
    for (let i = 0; i < 220; i++) {
      const px = r() * S, py = r() * S, a = r() * TAU, l = 3 + r() * 9;
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + 1) * l / 2, py + Math.sin(a + 1) * l / 2, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    return (paperTex = c);
  }
  function fillTexture(ctx, kind, amount, w, h, scale = 1) {
    if (!amount) return;
    const tex = kind === 'paper' ? paper() : grain();
    const pat = ctx.createPattern(tex, 'repeat');
    if (scale !== 1 && pat.setTransform) pat.setTransform(new DOMMatrix().scale(scale));
    ctx.save();
    ctx.globalCompositeOperation = kind === 'paper' ? 'multiply' : 'overlay';
    ctx.globalAlpha *= kind === 'paper' ? clamp(amount / 100, 0, 1) : clamp(amount / 100, 0, 1) * 0.55;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ───────────────────────── paths ───────────────────────── */

  function rrect(p, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    if (!r) { p.rect(x, y, w, h); return p; }
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
    return p;
  }
  function polyPath(pts, smooth = 0) {
    const p = new Path2D();
    if (!smooth) {
      pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
    } else {
      // closed Catmull-Rom → cubic Bézier
      const n = pts.length;
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * smooth, p1[1] + (p2[1] - p0[1]) / 6 * smooth,
          p2[0] - (p3[0] - p1[0]) / 6 * smooth, p2[1] - (p3[1] - p1[1]) / 6 * smooth, p2[0], p2[1]);
      }
    }
    p.closePath();
    return p;
  }
  // radial shape fitted to the w×h box; fn(theta) returns radius in [0,1]
  function polar(w, h, fn, samples = 360) {
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples * TAU;
      const r = fn(t);
      pts.push([w / 2 + Math.sin(t) * r * w / 2, h / 2 - Math.cos(t) * r * h / 2]);
    }
    return polyPath(pts);
  }
  function fitPoly(unit, w, h) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of unit) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return unit.map(([x, y]) => [(x - x0) / (x1 - x0) * w, (y - y0) / (y1 - y0) * h]);
  }
  function starUnit(n, inner) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = i / (n * 2) * TAU - Math.PI / 2, r = i % 2 ? inner : 1;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function regular(n) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; pts.push([Math.cos(a), Math.sin(a)]); }
    return pts;
  }
  function roundedPoly(pts, r) {
    // polygon with rounded corners (arcTo), r in px
    const p = new Path2D(), n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = mid(pts[n - 1], pts[0]);
    p.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      p.arcTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, r);
    }
    p.closePath();
    return p;
  }
  function heartPath(w, h) {
    const p = new Path2D();
    p.moveTo(w / 2, h * 0.28);
    p.bezierCurveTo(w * 0.42, h * 0.02, 0, h * 0.02, 0, h * 0.34);
    p.bezierCurveTo(0, h * 0.6, w * 0.3, h * 0.78, w / 2, h);
    p.bezierCurveTo(w * 0.7, h * 0.78, w, h * 0.6, w, h * 0.34);
    p.bezierCurveTo(w, h * 0.02, w * 0.58, h * 0.02, w / 2, h * 0.28);
    p.closePath();
    return p;
  }
  function sparklePath(w, h, k = 0.12) {
    const p = new Path2D(), cx = w / 2, cy = h / 2;
    p.moveTo(cx, 0);
    p.quadraticCurveTo(cx + w * k, cy - h * k, w, cy);
    p.quadraticCurveTo(cx + w * k, cy + h * k, cx, h);
    p.quadraticCurveTo(cx - w * k, cy + h * k, 0, cy);
    p.quadraticCurveTo(cx - w * k, cy - h * k, cx, 0);
    p.closePath();
    return p;
  }
  function blobPath(w, h, seed) {
    const r = rng(seed), n = 7, pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + r() * 0.3, rad = 0.78 + r() * 0.22;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    return polyPath(fitPoly(pts, w, h), 1);
  }
  function stampPath(w, h, rh) {
    const p = new Path2D();
    const nx = Math.max(2, Math.round(w / (rh * 3.1))), ny = Math.max(2, Math.round(h / (rh * 3.1)));
    const sx = w / nx, sy = h / ny;
    p.moveTo(0, 0);
    for (let i = 0; i < nx; i++) { const c = sx * (i + 0.5); p.lineTo(c - rh, 0); p.arc(c, 0, rh, Math.PI, 0, true); }
    p.lineTo(w, 0);
    for (let i = 0; i < ny; i++) { const c = sy * (i + 0.5); p.lineTo(w, c - rh); p.arc(w, c, rh, -Math.PI / 2, Math.PI / 2, true); }
    p.lineTo(w, h);
    for (let i = 0; i < nx; i++) { const c = w - sx * (i + 0.5); p.lineTo(c + rh, h); p.arc(c, h, rh, 0, Math.PI, true); }
    p.lineTo(0, h);
    for (let i = 0; i < ny; i++) { const c = h - sy * (i + 0.5); p.lineTo(0, c + rh); p.arc(0, c, rh, Math.PI / 2, -Math.PI / 2, true); }
    p.closePath();
    return p;
  }
  function tornPath(w, h, seed, amp) {
    const r = rng(seed), pts = [];
    const edge = (x0, y0, x1, y1, nx, ny) => {
      const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(6, Math.round(len / (amp * 1.4)));
      for (let i = 0; i < steps; i++) {
        const t = i / steps, j = (r() * 0.85 + 0.15) * amp;
        pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
      }
    };
    edge(0, 0, w, 0, 0, 1); edge(w, 0, w, h, -1, 0); edge(w, h, 0, h, 0, -1); edge(0, h, 0, 0, 1, 0);
    return polyPath(pts);
  }
  function ticketPath(w, h, r, notch) {
    const p = new Path2D(), n = notch;
    r = Math.min(r, h / 4, w / 4);
    p.moveTo(r, 0); p.lineTo(w - r, 0); p.arcTo(w, 0, w, r, r);
    p.lineTo(w, h / 2 - n); p.arc(w, h / 2, n, -Math.PI / 2, Math.PI / 2, true);
    p.lineTo(w, h - r); p.arcTo(w, h, w - r, h, r);
    p.lineTo(r, h); p.arcTo(0, h, 0, h - r, r);
    p.lineTo(0, h / 2 + n); p.arc(0, h / 2, n, Math.PI / 2, -Math.PI / 2, true);
    p.lineTo(0, r); p.arcTo(0, 0, r, 0, r);
    p.closePath();
    return p;
  }
  function speechPath(w, h, r, tailSide = 'left') {
    const bh = h * 0.8, p = new Path2D();
    r = Math.min(r, bh / 2, w / 2);
    const tx = tailSide === 'left' ? w * 0.18 : w * 0.82;
    p.moveTo(r, 0); p.arcTo(w, 0, w, bh, r); p.arcTo(w, bh, 0, bh, r);
    if (tailSide === 'left') { p.lineTo(tx + w * 0.12, bh); p.lineTo(tx - w * 0.04, h); p.lineTo(tx, bh); }
    else { p.lineTo(tx, bh); p.lineTo(tx + w * 0.04, h); p.lineTo(tx - w * 0.12, bh); }
    p.arcTo(0, bh, 0, 0, r); p.arcTo(0, 0, w, 0, r);
    p.closePath();
    return p;
  }
  function cloudPath(w, h) {
    const p = new Path2D();
    p.moveTo(w * 0.22, h);
    p.bezierCurveTo(w * 0.02, h, -w * 0.02, h * 0.6, w * 0.16, h * 0.52);
    p.bezierCurveTo(w * 0.12, h * 0.2, w * 0.42, h * 0.08, w * 0.5, h * 0.3);
    p.bezierCurveTo(w * 0.58, -h * 0.08, w * 0.92, h * 0.04, w * 0.84, h * 0.42);
    p.bezierCurveTo(w * 1.04, h * 0.44, w * 1.04, h, w * 0.8, h);
    p.closePath();
    return p;
  }
  function archPath(w, h) {
    const p = new Path2D(), r = w / 2, ry = Math.min(r, h);
    p.moveTo(0, h); p.lineTo(0, ry);
    p.ellipse(w / 2, ry, r, ry, 0, Math.PI, 0);
    p.lineTo(w, h); p.closePath();
    return p;
  }

  const SHAPES = {
    rect: { label: 'Rectangle', path: (w, h, o) => rrect(new Path2D(), 0, 0, w, h, o.radius || 0) },
    rounded: { label: 'Rounded', path: (w, h, o) => rrect(new Path2D(), 0, 0, w, h, o.radius ?? Math.min(w, h) * 0.18) },
    pill: { label: 'Pill', path: (w, h) => rrect(new Path2D(), 0, 0, w, h, Math.min(w, h) / 2) },
    ellipse: { label: 'Circle', path: (w, h) => { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); return p; } },
    arch: { label: 'Arch', path: archPath },
    halfcircle: { label: 'Half circle', path: (w, h) => { const p = new Path2D(); p.moveTo(0, h); p.ellipse(w / 2, h, w / 2, h, 0, Math.PI, 0); p.closePath(); return p; } },
    triangle: { label: 'Triangle', path: (w, h, o) => o.radius ? roundedPoly([[w / 2, 0], [w, h], [0, h]], o.radius) : polyPath([[w / 2, 0], [w, h], [0, h]]) },
    diamond: { label: 'Diamond', path: (w, h) => polyPath([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]) },
    pentagon: { label: 'Pentagon', path: (w, h, o) => roundedPoly(fitPoly(regular(5), w, h), o.radius || 0.01) },
    hexagon: { label: 'Hexagon', path: (w, h, o) => roundedPoly(fitPoly(regular(6), w, h), o.radius || 0.01) },
    star: { label: 'Star', path: (w, h, o) => roundedPoly(fitPoly(starUnit(o.points || 5, o.inner || 0.48), w, h), o.radius || 0.01) },
    burst: { label: 'Burst', path: (w, h, o) => polyPath(fitPoly(starUnit(o.points || 18, o.inner || 0.78), w, h)) },
    scallop: { label: 'Scallop', path: (w, h, o) => { const n = o.points || 16, d = o.depth ?? 0.08; return polar(w, h, t => 1 - d + d * Math.sqrt(Math.abs(Math.sin(n * t / 2)))); } },
    flower: { label: 'Flower', path: (w, h, o) => { const n = o.points || 8, d = o.depth ?? 0.28; return polar(w, h, t => 1 - d + d * Math.sqrt(Math.abs(Math.sin(n * t / 2)))); } },
    squircle: { label: 'Squircle', path: (w, h) => polar(w, h, t => Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -1 / 4) / Math.SQRT2 * 1.0, 240) },
    sparkle: { label: 'Sparkle', path: (w, h) => sparklePath(w, h) },
    heart: { label: 'Heart', path: heartPath },
    blob: { label: 'Blob', path: (w, h, o) => blobPath(w, h, o.seed || 3) },
    cloud: { label: 'Cloud', path: cloudPath },
    ticket: { label: 'Ticket', path: (w, h, o) => ticketPath(w, h, o.radius ?? 12, Math.min(w, h) * 0.12) },
    speech: { label: 'Speech', path: (w, h, o) => speechPath(w, h, o.radius ?? Math.min(w, h) * 0.2) },
    stamp: { label: 'Stamp edge', path: (w, h) => stampPath(w, h, Math.max(4, Math.min(w, h) * 0.035)) },
    torn: { label: 'Torn paper', path: (w, h, o) => tornPath(w, h, o.seed || 5, Math.max(3, Math.min(w, h) * 0.025)) },
    cross: { label: 'Plus', path: (w, h) => { const t = 0.32; return polyPath([[w * (0.5 - t / 2), 0], [w * (0.5 + t / 2), 0], [w * (0.5 + t / 2), h * (0.5 - t / 2)], [w, h * (0.5 - t / 2)], [w, h * (0.5 + t / 2)], [w * (0.5 + t / 2), h * (0.5 + t / 2)], [w * (0.5 + t / 2), h], [w * (0.5 - t / 2), h], [w * (0.5 - t / 2), h * (0.5 + t / 2)], [0, h * (0.5 + t / 2)], [0, h * (0.5 - t / 2)], [w * (0.5 - t / 2), h * (0.5 - t / 2)]]); } },
    arrow: { label: 'Arrow', path: (w, h) => polyPath([[0, h * 0.32], [w * 0.62, h * 0.32], [w * 0.62, 0], [w, h / 2], [w * 0.62, h], [w * 0.62, h * 0.68], [0, h * 0.68]]) },
    parallelogram: { label: 'Slant', path: (w, h) => polyPath([[w * 0.18, 0], [w, 0], [w * 0.82, h], [0, h]]) },
    line: { label: 'Line', path: null },
  };
  R.SHAPES = SHAPES;
  function shapePath(kind, w, h, o = {}) {
    const s = SHAPES[kind] || SHAPES.rect;
    return s.path ? s.path(w, h, o) : rrect(new Path2D(), 0, 0, w, h, 0);
  }
  R.shapePath = shapePath;

  /* ───────────────────────── patterns ───────────────────────── */

  const PATTERNS = {
    none: 'None', grid: 'Grid paper', graph: 'Graph paper', dots: 'Dot grid', lined: 'Notebook lines',
    check: 'Checkerboard', gingham: 'Gingham', stripes: 'Stripes', diagonal: 'Diagonal', polka: 'Polka dots',
    waves: 'Waves', plus: 'Plus grid', halftone: 'Halftone',
  };
  R.PATTERNS = PATTERNS;
  function drawPattern(ctx, w, h, p) {
    if (!p || !p.type || p.type === 'none') return;
    const s = Math.max(4, p.size || 40), col = p.color || 'rgba(0,0,0,.15)', lw = p.thick || 1.5;
    ctx.save();
    ctx.globalAlpha *= p.opacity ?? 1;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    const path = new Path2D();
    switch (p.type) {
      case 'grid':
        for (let x = s; x < w; x += s) { path.moveTo(x, 0); path.lineTo(x, h); }
        for (let y = s; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path); break;
      case 'graph': {
        const fine = new Path2D(), f = s / 5;
        for (let x = f; x < w; x += f) { fine.moveTo(x, 0); fine.lineTo(x, h); }
        for (let y = f; y < h; y += f) { fine.moveTo(0, y); fine.lineTo(w, y); }
        ctx.save(); ctx.globalAlpha *= 0.45; ctx.lineWidth = lw * 0.6; ctx.stroke(fine); ctx.restore();
        for (let x = s; x < w; x += s) { path.moveTo(x, 0); path.lineTo(x, h); }
        for (let y = s; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path); break;
      }
      case 'dots':
        for (let x = s; x < w; x += s) for (let y = s; y < h; y += s) { path.moveTo(x + lw * 1.3, y); path.arc(x, y, lw * 1.3, 0, TAU); }
        ctx.fill(path); break;
      case 'lined': {
        for (let y = s * 2; y < h; y += s) { path.moveTo(0, y); path.lineTo(w, y); }
        ctx.stroke(path);
        ctx.strokeStyle = p.color2 || 'rgba(222,96,96,.55)';
        ctx.beginPath(); ctx.moveTo(s * 2.2, 0); ctx.lineTo(s * 2.2, h); ctx.stroke();
        break;
      }
      case 'check':
        for (let x = 0, i = 0; x < w; x += s, i++) for (let y = 0, j = 0; y < h; y += s, j++) if ((i + j) % 2) path.rect(x, y, s, s);
        ctx.fill(path); break;
      case 'gingham': {
        ctx.globalAlpha *= 0.5;
        const a = new Path2D(), b = new Path2D();
        for (let x = 0; x < w; x += s * 2) a.rect(x, 0, s, h);
        for (let y = 0; y < h; y += s * 2) b.rect(0, y, w, s);
        ctx.fill(a); ctx.fill(b); break;
      }
      case 'stripes':
        for (let x = 0; x < w; x += s) path.rect(x, 0, s / 2, h);
        ctx.fill(path); break;
      case 'diagonal':
        ctx.lineWidth = s / 4;
        for (let x = -h; x < w + h; x += s) { path.moveTo(x, 0); path.lineTo(x + h, h); }
        ctx.stroke(path); break;
      case 'polka':
        for (let y = 0, j = 0; y < h + s; y += s / 2, j++) for (let x = (j % 2) * s / 2; x < w + s; x += s) { path.moveTo(x + s * 0.13, y); path.arc(x, y, s * 0.13, 0, TAU); }
        ctx.fill(path); break;
      case 'waves':
        for (let y = s / 2; y < h + s; y += s / 2) {
          path.moveTo(0, y);
          for (let x = 0; x <= w; x += 4) path.lineTo(x, y + Math.sin(x / s * TAU) * s * 0.12);
        }
        ctx.stroke(path); break;
      case 'plus':
        for (let x = s / 2; x < w; x += s) for (let y = s / 2; y < h; y += s) { const k = s * 0.12; path.moveTo(x - k, y); path.lineTo(x + k, y); path.moveTo(x, y - k); path.lineTo(x, y + k); }
        ctx.lineCap = 'round'; ctx.stroke(path); break;
      case 'halftone':
        for (let y = 0, j = 0; y < h + s; y += s / 2, j++) {
          const r = s * 0.22 * (1 - y / h * 0.85);
          for (let x = (j % 2) * s / 2; x < w + s; x += s) { path.moveTo(x + r, y); path.arc(x, y, Math.max(0.5, r), 0, TAU); }
        }
        ctx.fill(path); break;
    }
    ctx.restore();
  }
  R.drawPattern = drawPattern;

  /* ───────────────────────── fills ───────────────────────── */

  function makeFill(ctx, f, w, h) {
    // f: {color, color2, gradient:'none'|'linear'|'radial', angle}
    if (!f.gradient || f.gradient === 'none' || !f.color2) return f.color;
    if (f.gradient === 'radial') {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, f.color); g.addColorStop(1, f.color2);
      return g;
    }
    const a = ((f.angle ?? 180) - 90) * Math.PI / 180;
    const L = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const cx = w / 2, cy = h / 2, dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, f.color); g.addColorStop(1, f.color2);
    return g;
  }

  /* ───────────────────────── text layout ───────────────────────── */

  const GENERIC = { Serif: 'serif', Sans: 'sans-serif', Display: 'sans-serif', Script: 'cursive', Handwritten: 'cursive', Mono: 'monospace' };
  function fontFor(family, weight, italic, size) {
    const meta = Fonts.BY_NAME[family];
    const wgt = meta ? Fonts.nearestWeight(family, weight || 400) : (weight || 400);
    const gen = meta ? (GENERIC[meta.cat] || 'sans-serif') : 'sans-serif';
    if (meta && !Fonts.isLoaded(family, wgt, !!italic)) {
      Fonts.ensure(family, wgt, !!italic).then(() => { R.fontsVersion++; requestRedraw(); });
    }
    return `${italic ? 'italic ' : ''}${wgt} ${size}px "${family}", ${gen}`;
  }
  R.fontFor = fontFor;

  const metricCache = new Map();
  function metrics(fontAt100) {
    const k = fontAt100 + '|' + R.fontsVersion;
    let m = metricCache.get(k);
    if (m) return m;
    mctx.font = fontAt100;
    const H = mctx.measureText('H'), g = mctx.measureText('g');
    m = { cap: (H.actualBoundingBoxAscent || 70) / 100, desc: (g.actualBoundingBoxDescent || 20) / 100 };
    metricCache.set(k, m);
    return m;
  }

  function measurer(ctx, font, ls) {
    ctx.font = font;
    const cache = new Map();
    const raw = s => { let v = cache.get(s); if (v === undefined) { v = ctx.measureText(s).width; cache.set(s, v); } return v; };
    const fn = s => { const n = [...s].length; return raw(s) + ls * Math.max(0, n - 1); };
    fn.raw = raw;
    return fn;
  }

  // draws one line at x (left), baseline y. letter-spacing done per glyph, but
  // positions come from prefix widths so pair-kerning survives.
  function drawLine(ctx, str, x, y, ls, mode) {
    const op = mode === 'stroke' ? 'strokeText' : 'fillText';
    if (!ls) { ctx[op](str, x, y); return; }
    const chars = [...str];
    let prefix = '';
    for (let i = 0; i < chars.length; i++) {
      const px = ctx.measureText(prefix).width + ls * i;
      ctx[op](chars[i], x + px, y);
      prefix += chars[i];
    }
  }

  const LINE_BG = new Set(['lines', 'select', 'marker', 'underline', 'rough']);
  R.TEXT_BG = {
    none: 'None', box: 'Box', pill: 'Pill', lines: 'Line highlight', select: 'Selection', marker: 'Marker',
    sticker: 'Sticker outline', tape: 'Tape', oval: 'Oval', scallop: 'Scallop', burst: 'Burst',
    speech: 'Speech bubble', ticket: 'Ticket', underline: 'Underline', scribble: 'Scribble circle', torn: 'Torn paper', rough: 'Marker blocks',
  };

  const layoutCache = new LRU(400);
  function textKey(el) {
    const b = el.bg || {};
    return [el.text, el.fontFamily, el.fontWeight, el.italic, el.fontSize, el.lineHeight, el.letterSpacing, el.uppercase,
      el.align, el.autoWidth ? 'A' : el.width, el.curve || 0, b.style, b.padX, b.padY, b.gap, el.stroke && el.stroke.width, R.fontsVersion].join('\u0001');
  }
  function layoutText(el) {
    const key = textKey(el);
    const hit = layoutCache.get(key);
    if (hit) return hit;
    const size = el.fontSize || 48;
    const font = fontFor(el.fontFamily, el.fontWeight, el.italic, size);
    const font100 = fontFor(el.fontFamily, el.fontWeight, el.italic, 100);
    const m = metrics(font100);
    const ls = (el.letterSpacing || 0) * size;
    const measure = measurer(mctx, font, ls);
    const bg = el.bg || { style: 'none' };
    const style = bg.style || 'none';
    const lineBg = LINE_BG.has(style);
    let padX = bg.padX || 0, padY = bg.padY || 0;
    if (style === 'none') { padX = 0; padY = 0; }
    if (style === 'sticker') padY = padX;
    const gap = lineBg ? (bg.gap ?? 0) : 0;
    const lh = size * (el.lineHeight || 1.2);
    let txt = el.text ?? '';
    if (el.uppercase) txt = txt.toUpperCase();
    const cap = m.cap * size;
    const desc = (el.uppercase ? 0 : m.desc * 0.5) * size;

    // curved: single run along an arc
    if (el.curve && Math.abs(el.curve) >= 1) {
      const str = txt.replace(/\s*\n\s*/g, ' ');
      const chars = [...str];
      const pos = [];
      let prefix = '';
      for (let i = 0; i < chars.length; i++) { pos.push(measure.raw(prefix) + ls * i); prefix += chars[i]; }
      const total = measure(str) || 1;
      const theta = Math.min(Math.abs(el.curve) / 100 * TAU, TAU);
      const r = total / theta;
      const sign = el.curve > 0 ? 1 : -1;
      const asc = size * 0.85, dsc = size * 0.25;
      const glyphs = chars.map((ch, i) => {
        const cw = (i < chars.length - 1 ? pos[i + 1] - ls : total) - pos[i];
        return { ch, cw, phi: (pos[i] + cw / 2 - total / 2) / r };
      });
      const r0 = sign > 0 ? r - dsc : r - asc, r1 = sign > 0 ? r + asc : r + dsc;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const span = theta / 2 + (size * 0.6) / r;
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const phi = -span + 2 * span * i / steps;
        for (const rad of [r0, r1]) {
          const x = rad * Math.sin(phi), y = sign > 0 ? -rad * Math.cos(phi) : rad * Math.cos(phi);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      const p = style === 'sticker' ? padX : 0;
      const sw = (el.stroke && el.stroke.width) || 0;
      const pp = p + sw;
      const L = {
        curved: true, font, size, ls, lh, glyphs, r, sign,
        cx: pp - x0, cy: pp - y0,
        boxW: Math.max(10, x1 - x0 + pp * 2), boxH: Math.max(10, y1 - y0 + pp * 2),
        padX: pp, padY: pp, lines: [], cap, desc, style,
      };
      layoutCache.set(key, L);
      return L;
    }

    const maxW = el.autoWidth ? Infinity : Math.max(1, (el.width || 300) - padX * 2);
    const lines = [];
    for (const par of txt.split('\n')) {
      if (maxW === Infinity || measure(par) <= maxW) { lines.push(par); continue; }
      const toks = par.split(/(\s+)/);
      let line = '';
      for (const tok of toks) {
        if (!tok) continue;
        const test = line + tok;
        if (!line.trim() || measure(test.trimEnd()) <= maxW) { line = test; continue; }
        lines.push(line.trimEnd());
        line = /^\s+$/.test(tok) ? '' : tok;
        // a single word longer than the box: hard-break it
        while (measure(line) > maxW && [...line].length > 1) {
          const cs = [...line];
          let k = cs.length - 1;
          while (k > 1 && measure(cs.slice(0, k).join('')) > maxW) k--;
          lines.push(cs.slice(0, k).join(''));
          line = cs.slice(k).join('');
        }
      }
      lines.push(line.trimEnd());
    }
    const widths = lines.map(l => measure(l));
    const contentW = maxW === Infinity ? Math.max(1, ...widths) : maxW;
    const boxW = contentW + padX * 2;
    const slot = lineBg ? lh + padY * 2 + gap : lh;
    const boxH = lineBg ? lines.length * slot - gap : lines.length * lh + padY * 2;
    const out = lines.map((t, i) => {
      const w = widths[i];
      const x = el.align === 'right' ? padX + contentW - w : el.align === 'center' ? padX + (contentW - w) / 2 : padX;
      const top = lineBg ? i * slot + padY : padY + i * lh;
      return { text: t, w, x, top, base: top + lh / 2 + (cap - desc) / 2 };
    });
    const L = { curved: false, font, size, ls, lh, lines: out, boxW, boxH: Math.max(boxH, 1), padX, padY, cap, desc, style, slot, lineBg };
    layoutCache.set(key, L);
    return L;
  }
  R.layoutText = layoutText;

  function textBackground(ctx, el, L) {
    const bg = el.bg || {};
    const style = bg.style;
    if (!style || style === 'none' || style === 'sticker') return;
    const col = bg.color || '#f4d35e';
    const w = L.boxW, h = L.boxH, rad = bg.radius ?? 0;
    const border = bg.borderWidth > 0 ? { w: bg.borderWidth, c: bg.borderColor || '#111' } : null;
    const paint = (path, fill = true) => {
      if (fill) { ctx.fillStyle = col; ctx.fill(path); }
      if (border && !bg.stitch) { ctx.lineWidth = border.w; ctx.strokeStyle = border.c; ctx.lineJoin = 'round'; ctx.stroke(path); }
    };
    // dashed "stitched" line sewn just inside a label's edge
    const stitch = (x, y, ww, hh, r) => {
      if (!bg.stitch) return;
      const ins = Math.max(3, L.size * 0.09), lw = bg.borderWidth > 0 ? bg.borderWidth : Math.max(1.5, L.size * 0.035);
      ctx.save();
      ctx.setLineDash([lw * 3.2, lw * 2.4]); ctx.lineWidth = lw; ctx.strokeStyle = bg.borderColor || '#ffffff'; ctx.lineCap = 'round';
      ctx.stroke(rrect(new Path2D(), x + ins, y + ins, ww - ins * 2, hh - ins * 2, Math.max(0, r - ins)));
      ctx.restore();
    };
    const seed = hashStr(el.id || 'x');
    switch (style) {
      case 'box': paint(rrect(new Path2D(), 0, 0, w, h, rad)); stitch(0, 0, w, h, rad); break;
      case 'pill': paint(rrect(new Path2D(), 0, 0, w, h, h / 2)); stitch(0, 0, w, h, h / 2); break;
      case 'oval': { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); paint(p); break; }
      case 'scallop': paint(shapePath('scallop', w, h, { points: Math.round(clamp((w + h) / 18, 12, 28)), depth: 0.07 })); break;
      case 'burst': paint(shapePath('burst', w, h, { points: 20, inner: 0.84 })); break;
      case 'speech': paint(speechPath(w, h, rad || h * 0.2)); break;
      case 'ticket': paint(ticketPath(w, h, rad, Math.min(h * 0.16, 18))); break;
      case 'torn': paint(tornPath(w, h, seed, Math.max(2, Math.min(w, h) * 0.04))); break;
      case 'tape': {
        const r = rng(seed), p = new Path2D(), z = Math.max(3, h * 0.07), n = Math.max(4, Math.round(h / (z * 1.6)));
        p.moveTo(0, 0); p.lineTo(w, 0);
        for (let i = 1; i <= n; i++) p.lineTo(w - (i % 2 ? z * (0.6 + r() * 0.6) : 0), h * i / n);
        p.lineTo(0, h);
        for (let i = n - 1; i >= 0; i--) p.lineTo(i % 2 ? z * (0.6 + r() * 0.6) : 0, h * i / n);
        p.closePath();
        ctx.save(); ctx.globalAlpha *= 0.92; paint(p); ctx.restore();
        ctx.save(); ctx.clip(p); ctx.globalAlpha *= 0.12; ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h * 0.35); ctx.restore();
        break;
      }
      case 'scribble': {
        const r = rng(seed), p = new Path2D();
        const lw = bg.borderWidth || Math.max(2, L.size * 0.06);
        for (let k = 0; k < 2; k++) {
          const ox = (r() - 0.5) * w * 0.04, oy = (r() - 0.5) * h * 0.08;
          for (let i = 0; i <= 64; i++) {
            const t = i / 64 * TAU * 1.08 - 0.6, x = w / 2 + ox + Math.cos(t) * (w / 2 - lw), y = h / 2 + oy + Math.sin(t) * (h / 2 - lw);
            i ? p.lineTo(x, y) : p.moveTo(x, y);
          }
        }
        ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.stroke(p);
        break;
      }
      default: if (L.lineBg) {
        for (const ln of L.lines) {
          if (!ln.text.trim()) continue;
          const x = ln.x - L.padX, y = ln.top - L.padY, lw = ln.w + L.padX * 2, lh = L.lh + L.padY * 2;
          if (style === 'lines') { paint(rrect(new Path2D(), x, y, lw, lh, rad)); stitch(x, y, lw, lh, rad); }
          else if (style === 'rough') {
            // hand-cut marker block: wobbly edges and slightly skewed corners
            const r = rng(seed + (ln.top | 0)), j = Math.max(2, L.size * 0.06), pts = [];
            const edge = (x0, y0, x1, y1) => { const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (L.size * 0.5))); for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n + (r() - 0.5) * j, y0 + (y1 - y0) * i / n + (r() - 0.5) * j]); };
            edge(x, y, x + lw, y); edge(x + lw, y, x + lw, y + lh); edge(x + lw, y + lh, x, y + lh); edge(x, y + lh, x, y);
            paint(polyPath(pts));
          }
          else if (style === 'select') {
            ctx.fillStyle = col; ctx.fillRect(x, y, lw, lh);
            const ac = bg.borderColor || '#6c5ce7', bw = bg.borderWidth || Math.max(1.5, L.size * 0.025);
            ctx.lineWidth = bw; ctx.strokeStyle = ac; ctx.strokeRect(x, y, lw, lh);
            const dr = Math.max(3, L.size * 0.07);
            ctx.fillStyle = ac;
            ctx.beginPath(); ctx.arc(x, y, dr, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(x + lw, y + lh, dr, 0, TAU); ctx.fill();
          } else if (style === 'marker') {
            const r = rng(seed + ln.top | 0), p = new Path2D();
            const y0 = ln.top + L.lh * 0.42, y1 = ln.top + L.lh * 0.98, sk = L.size * 0.08;
            p.moveTo(x + sk, y0 + (r() - 0.5) * sk);
            p.lineTo(x + lw, y0 - sk * 0.3);
            p.quadraticCurveTo(x + lw + sk * 0.8, (y0 + y1) / 2, x + lw - sk * 0.4, y1);
            p.lineTo(x, y1 + (r() - 0.5) * sk);
            p.quadraticCurveTo(x - sk * 0.6, (y0 + y1) / 2, x + sk, y0);
            ctx.save(); ctx.globalAlpha *= 0.85; ctx.fillStyle = col; ctx.fill(p); ctx.restore();
          } else if (style === 'underline') {
            const r = rng(seed + ln.top | 0), p = new Path2D(), uy = ln.base + L.size * 0.14;
            p.moveTo(x, uy + (r() - 0.5) * 4);
            p.bezierCurveTo(x + lw * 0.3, uy - L.size * 0.06, x + lw * 0.7, uy + L.size * 0.08, x + lw, uy - L.size * 0.02);
            ctx.lineWidth = bg.borderWidth || Math.max(2, L.size * 0.07); ctx.lineCap = 'round';
            ctx.strokeStyle = col; ctx.stroke(p);
          }
        }
      }
    }
  }

  function drawText(ctx, el, env) {
    const L = layoutText(el);
    const bg = el.bg || {};
    textBackground(ctx, el, L);
    ctx.font = L.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const stroke = el.stroke || {};
    const echo = el.echo || {};
    const fillStyle = (el.gradient && el.gradient !== 'none' && el.fill2)
      ? makeFill(ctx, { color: el.fill, color2: el.fill2, gradient: el.gradient, angle: el.gradAngle }, L.boxW, L.boxH)
      : (el.fill || '#111');

    const pass = (mode, style, lineWidth, dx = 0, dy = 0) => {
      ctx.save();
      ctx.translate(dx, dy);
      if (mode === 'stroke') { ctx.lineWidth = lineWidth; ctx.strokeStyle = style; }
      else ctx.fillStyle = style;
      if (L.curved) {
        for (const g of L.glyphs) {
          ctx.save();
          if (L.sign > 0) { ctx.translate(L.cx + L.r * Math.sin(g.phi), L.cy - L.r * Math.cos(g.phi)); ctx.rotate(g.phi); }
          else { ctx.translate(L.cx + L.r * Math.sin(g.phi), L.cy + L.r * Math.cos(g.phi)); ctx.rotate(-g.phi); }
          mode === 'stroke' ? ctx.strokeText(g.ch, -g.cw / 2, 0) : ctx.fillText(g.ch, -g.cw / 2, 0);
          ctx.restore();
        }
      } else {
        for (const ln of L.lines) drawLine(ctx, ln.text, ln.x, ln.base, L.ls, mode);
      }
      ctx.restore();
    };

    if (bg.style === 'sticker') {
      const pw = bg.padX || L.size * 0.12;
      if (bg.borderWidth > 0) pass('stroke', bg.borderColor || '#111', (pw + bg.borderWidth) * 2 + (stroke.width || 0) * 2);
      pass('stroke', bg.color || '#fff', pw * 2 + (stroke.width || 0) * 2);
    }
    if (echo.on) {
      const steps = Math.max(1, Math.round(echo.steps || 1));
      const dx = (echo.dx ?? 0.05) * L.size, dy = (echo.dy ?? 0.05) * L.size;
      for (let k = steps; k >= 1; k--) {
        const ox = dx * k / steps, oy = dy * k / steps;
        if (stroke.width > 0) pass('stroke', echo.color || '#111', stroke.width * 2, ox, oy);
        pass('fill', echo.color || '#111', 0, ox, oy);
      }
    }
    // a filled glyph hides the inner half of the stroke; outline-only text keeps it centred
    if (stroke.width > 0) pass('stroke', stroke.color || '#111', isClear(el.fill) ? stroke.width : stroke.width * 2);
    if (!isClear(el.fill)) pass('fill', fillStyle);

    if (!L.curved && (el.underline || el.strike)) {
      ctx.fillStyle = isClear(el.fill) ? (stroke.color || '#111') : el.fill;
      const t = Math.max(1, L.size * 0.055);
      for (const ln of L.lines) {
        if (el.underline) ctx.fillRect(ln.x, ln.base + L.size * 0.1, ln.w, t);
        if (el.strike) ctx.fillRect(ln.x, ln.base - L.cap * 0.42 - t / 2, ln.w, t);
      }
    }
  }
  /* ───────────────────────── checklist ───────────────────────── */

  function layoutChecklist(el) {
    const size = el.fontSize || 40;
    const lh = size * (el.lineHeight || 1.6);
    const items = (el.items || '').split('\n');
    return { size, lh, items, boxH: Math.max(lh, items.length * lh), font: fontFor(el.fontFamily, el.fontWeight, el.italic, size) };
  }
  R.layoutChecklist = layoutChecklist;
  function drawChecklist(ctx, el) {
    const L = layoutChecklist(el);
    const box = L.size * 0.78, gap = L.size * 0.5;
    ctx.font = L.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const m = metrics(fontFor(el.fontFamily, el.fontWeight, el.italic, 100));
    L.items.forEach((raw, i) => {
      const checked = /^\s*\[x\]/i.test(raw);
      const text = raw.replace(/^\s*\[( |x)?\]\s?/i, '');
      const cy = i * L.lh + L.lh / 2;
      const bx = 0, by = cy - box / 2;
      const lw = Math.max(1.5, L.size * 0.07);
      const p = new Path2D();
      const shape = el.boxStyle || 'square';
      if (shape === 'circle') p.arc(bx + box / 2, cy, box / 2, 0, TAU);
      else if (shape === 'heart') { const hp = heartPath(box, box); p.addPath(hp, new DOMMatrix().translate(bx, by)); }
      else if (shape === 'star') { p.addPath(shapePath('star', box, box, { radius: box * 0.06 }), new DOMMatrix().translate(bx, by)); }
      else rrect(p, bx, by, box, box, shape === 'round' ? box * 0.28 : box * 0.08);
      if (checked && el.fillChecked) { ctx.fillStyle = el.boxColor || '#111'; ctx.fill(p); }
      ctx.lineWidth = lw; ctx.strokeStyle = el.boxColor || '#111'; ctx.stroke(p);
      if (checked) {
        ctx.strokeStyle = el.fillChecked ? (el.checkOnFill || '#fff') : (el.checkColor || el.boxColor || '#111');
        ctx.lineWidth = lw * 1.4;
        ctx.beginPath();
        ctx.moveTo(bx + box * 0.2, cy + box * 0.02);
        ctx.lineTo(bx + box * 0.42, cy + box * 0.24);
        ctx.lineTo(bx + box * (el.fillChecked ? 0.8 : 0.95), cy - box * (el.fillChecked ? 0.22 : 0.42));
        ctx.stroke();
      }
      const tx = bx + box + gap;
      ctx.fillStyle = el.fill || '#111';
      ctx.save();
      if (checked && el.dimChecked !== false) ctx.globalAlpha *= 0.55;
      ctx.textBaseline = 'alphabetic';
      const base = cy + (m.cap * L.size) / 2;
      ctx.fillText(text, tx, base);
      if (checked && el.strikeChecked !== false) {
        const tw = ctx.measureText(text).width;
        ctx.fillRect(tx, base - m.cap * L.size * 0.45, tw, Math.max(1, L.size * 0.06));
      }
      if (el.ruled) {
        ctx.globalAlpha = 0.25; ctx.fillRect(tx, i * L.lh + L.lh - 1, el.width - tx, 1.2);
      }
      ctx.restore();
    });
  }

  /* ───────────────────────── calendar ───────────────────────── */

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  R.MONTHS = MONTHS; R.DAYS = DAYS;
  function markPath(kind, cx, cy, r, seed) {
    switch (kind) {
      case 'heart': { const p = new Path2D(); p.addPath(heartPath(r * 2.1, r * 1.9), new DOMMatrix().translate(cx - r * 1.05, cy - r * 0.9)); return p; }
      case 'star': { const p = new Path2D(); p.addPath(shapePath('star', r * 2.4, r * 2.3, { radius: r * 0.12 }), new DOMMatrix().translate(cx - r * 1.2, cy - r * 1.2)); return p; }
      case 'square': return rrect(new Path2D(), cx - r, cy - r, r * 2, r * 2, r * 0.3);
      case 'flower': { const p = new Path2D(); p.addPath(shapePath('flower', r * 2.3, r * 2.3, { points: 8, depth: 0.22 }), new DOMMatrix().translate(cx - r * 1.15, cy - r * 1.15)); return p; }
      case 'scribble': {
        const rr = rng(seed), p = new Path2D();
        for (let i = 0; i <= 50; i++) {
          const t = i / 50 * TAU * 1.15 - 0.4, k = 1 + (rr() - 0.5) * 0.05;
          const x = cx + Math.cos(t) * r * 1.15 * k, y = cy + Math.sin(t) * r * 0.95 * k;
          i ? p.lineTo(x, y) : p.moveTo(x, y);
        }
        return p;
      }
      default: { const p = new Path2D(); p.arc(cx, cy, r, 0, TAU); return p; }
    }
  }
  function drawMark(ctx, el, cx, cy, r, day) {
    const kind = el.markStyle || 'circle', col = el.accent || '#e4572e';
    const p = markPath(kind, cx, cy, r, day * 31);
    if (kind === 'ring' || kind === 'scribble') {
      ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(p);
      return false;
    }
    if (kind === 'cross') {
      ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy - r * 0.8); ctx.lineTo(cx + r * 0.8, cy + r * 0.8);
      ctx.moveTo(cx + r * 0.8, cy - r * 0.8); ctx.lineTo(cx - r * 0.8, cy + r * 0.8); ctx.stroke();
      return false;
    }
    ctx.fillStyle = col; ctx.fill(p);
    return true;
  }
  function centered(ctx, s, x, y, ls = 0) {
    // text centred on x; y is the visual middle
    const w = ctx.measureText(s).width + ls * Math.max(0, [...s].length - 1);
    drawLine(ctx, s, x - w / 2, y, ls, 'fill');
  }
  function weeksIn(year, month, mon) {
    const first = new Date(year, month, 1).getDay();
    const off = mon ? (first + 6) % 7 : first;
    const days = new Date(year, month + 1, 0).getDate();
    return { off, days, rows: Math.ceil((off + days) / 7) };
  }
  function drawCalendar(ctx, el) {
    const w = el.width, h = el.height;
    const year = el.year ?? 2026, month = el.month ?? 0;
    const text = el.color || '#1d1d1b', accent = el.accent || '#e4572e', accentText = el.accentText || '#fff';
    const marked = new Set(el.marked || []);
    const tF = el.titleFont || 'Instrument Serif', bF = el.bodyFont || 'Instrument Sans';
    const tW = el.titleWeight || 400, bW = el.bodyWeight || 500;
    const capOf = (fam, wt) => metrics(fontFor(fam, wt, false, 100)).cap;
    const layout = el.layout || 'grid';

    if (el.bgColor && !isClear(el.bgColor)) {
      ctx.fillStyle = el.bgColor;
      ctx.fill(rrect(new Path2D(), 0, 0, w, h, el.radius || 0));
    }
    ctx.textBaseline = 'alphabetic';

    if (layout === 'page') {
      const r = el.radius ?? w * 0.06;
      const band = h * 0.24;
      ctx.save();
      ctx.clip(rrect(new Path2D(), 0, 0, w, h, r));
      ctx.fillStyle = el.cellColor || '#fffdf7'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, w, band);
      ctx.restore();
      // binding rings
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (const fx of [0.3, 0.7]) { ctx.beginPath(); ctx.arc(w * fx, band * 0.22, w * 0.025, 0, TAU); ctx.fill(); }
      ctx.fillStyle = accentText;
      let fs = band * 0.42;
      ctx.font = fontFor(tF, tW, false, fs);
      const mtxt = (el.monthCase === 'upper' ? MONTHS[month].toUpperCase() : MONTHS[month]);
      centered(ctx, mtxt, w / 2, band * 0.55 + capOf(tF, tW) * fs / 2, (el.titleSpacing || 0) * fs);
      const day = clamp(el.day || 1, 1, 31);
      fs = h * 0.5;
      ctx.font = fontFor(tF, tW, false, fs);
      ctx.fillStyle = text;
      centered(ctx, String(day), w / 2, band + (h - band) * 0.46 + capOf(tF, tW) * fs / 2);
      fs = h * 0.075;
      ctx.font = fontFor(bF, bW, false, fs);
      ctx.fillStyle = text;
      const wd = DAYS[new Date(year, month, day).getDay()];
      centered(ctx, el.monthCase === 'upper' ? wd.toUpperCase() : wd, w / 2, h - (h - band) * 0.12, fs * 0.08);
      return;
    }

    if (layout === 'strip') {
      const day = clamp(el.day || 1, 1, 31);
      const date = new Date(year, month, day);
      const dow = el.startMonday ? (date.getDay() + 6) % 7 : date.getDay();
      const start = new Date(year, month, day - dow);
      const showT = el.showTitle !== false;
      const th = showT ? h * 0.26 : 0;
      if (showT) {
        const fs = th * 0.62;
        ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = text;
        const s = MONTHS[month] + (el.showYear !== false ? ' ' + year : '');
        if (el.titleAlign === 'left') drawLine(ctx, el.monthCase === 'upper' ? s.toUpperCase() : s, w * 0.02, th * 0.72, 0, 'fill');
        else centered(ctx, el.monthCase === 'upper' ? s.toUpperCase() : s, w / 2, th * 0.72);
      }
      const cw = w / 7, ch = h - th;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const cx = cw * i + cw / 2;
        const sel = d.getDate() === day && d.getMonth() === month;
        const pill = rrect(new Path2D(), cx - cw * 0.4, th + ch * 0.04, cw * 0.8, ch * 0.92, cw * 0.4);
        if (sel) { ctx.fillStyle = accent; ctx.fill(pill); }
        else if (el.cellColor && !isClear(el.cellColor)) { ctx.fillStyle = el.cellColor; ctx.fill(pill); }
        let fs = Math.min(cw * 0.26, ch * 0.16);
        ctx.font = fontFor(bF, bW, false, fs); ctx.fillStyle = sel ? accentText : text;
        ctx.save(); if (!sel) ctx.globalAlpha *= 0.6;
        centered(ctx, DAYS[d.getDay()].slice(0, 3).toUpperCase(), cx, th + ch * 0.3, fs * 0.08);
        ctx.restore();
        fs = Math.min(cw * 0.48, ch * 0.34);
        ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = sel ? accentText : text;
        centered(ctx, String(d.getDate()), cx, th + ch * 0.68 + capOf(tF, tW) * fs / 2 - fs * 0.1);
        if (!sel && marked.has(d.getDate()) && d.getMonth() === month) {
          ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, th + ch * 0.86, cw * 0.05, 0, TAU); ctx.fill();
        }
      }
      return;
    }

    // grid / minimal
    const { off, days, rows } = weeksIn(year, month, el.startMonday);
    const pad = w * 0.04;
    const showT = el.showTitle !== false;
    const th = showT ? h * (el.titleSize || 0.17) : 0;
    const hh = h * 0.08;
    const gx = pad, gy = pad + th + hh, gw = w - pad * 2, gh = h - gy - pad;
    const cw = gw / 7, chh = gh / rows;
    if (showT) {
      const fs = th * 0.7;
      ctx.font = fontFor(tF, tW, false, fs); ctx.fillStyle = text;
      let s = MONTHS[month];
      if (el.monthCase === 'upper') s = s.toUpperCase();
      const ty = pad + th * 0.5 + capOf(tF, tW) * fs / 2;
      const tsp = (el.titleSpacing || 0) * fs;
      if (el.titleAlign === 'center') centered(ctx, s + (el.showYear !== false ? ' ' + year : ''), w / 2, ty, tsp);
      else {
        drawLine(ctx, s, gx, ty, tsp, 'fill');
        if (el.showYear !== false) {
          const yf = fs * 0.42;
          ctx.font = fontFor(bF, bW, false, yf);
          const yw = ctx.measureText(String(year)).width;
          ctx.save(); ctx.globalAlpha *= 0.7;
          ctx.fillText(String(year), gx + gw - yw, ty);
          ctx.restore();
        }
      }
    }
    // weekday header
    {
      const fs = Math.min(cw * 0.3, hh * 0.5);
      ctx.font = fontFor(bF, Math.max(bW, 600), false, fs);
      const names = el.startMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 7; i++) {
        let n = DAYS[names[i]];
        n = el.dayFormat === 'initial' ? n[0] : el.dayFormat === 'long' ? n : n.slice(0, 3);
        if (el.dayFormat !== 'long') n = n.toUpperCase();
        const isWeekend = names[i] === 0 || names[i] === 6;
        ctx.fillStyle = isWeekend && el.weekendAccent ? accent : text;
        ctx.save(); ctx.globalAlpha *= isWeekend && el.weekendAccent ? 1 : 0.65;
        centered(ctx, n, gx + cw * i + cw / 2, pad + th + hh * 0.5 + capOf(bF, 600) * fs / 2, fs * 0.08);
        ctx.restore();
      }
      if (el.headerLine) {
        ctx.fillStyle = el.lineColor || text; ctx.fillRect(gx, pad + th + hh - 1, gw, 1.5);
      }
    }
    const lineCol = el.lineColor || rgba(text, 0.25);
    if (layout === 'grid' && el.showLines !== false) {
      ctx.strokeStyle = lineCol; ctx.lineWidth = Math.max(1, w * 0.0025);
      const p = new Path2D();
      for (let r = 0; r <= rows; r++) { p.moveTo(gx, gy + chh * r); p.lineTo(gx + gw, gy + chh * r); }
      for (let c = 0; c <= 7; c++) { p.moveTo(gx + cw * c, gy); p.lineTo(gx + cw * c, gy + gh); }
      ctx.stroke(p);
    }
    const fs = Math.min(cw, chh) * (layout === 'grid' ? 0.34 : 0.42);
    const numFont = fontFor(bF, bW, false, fs);
    const numCap = capOf(bF, bW) * fs;
    const topLeft = layout === 'grid' && el.numberPos === 'corner';
    for (let d = 1; d <= days; d++) {
      const idx = off + d - 1, r = Math.floor(idx / 7), c = idx % 7;
      const x0 = gx + cw * c, y0 = gy + chh * r;
      if (el.cellColor && !isClear(el.cellColor)) {
        ctx.fillStyle = el.cellColor;
        const ins = Math.min(cw, chh) * 0.06;
        ctx.fill(rrect(new Path2D(), x0 + ins, y0 + ins, cw - ins * 2, chh - ins * 2, (el.cellRadius ?? 0.2) * Math.min(cw, chh)));
      }
      let cx = x0 + cw / 2, cy = y0 + chh / 2;
      if (topLeft) { cx = x0 + fs * 0.9; cy = y0 + fs * 0.95; }
      let onAccent = false;
      if (marked.has(d)) onAccent = drawMark(ctx, el, cx, cy, Math.min(cw, chh) * (topLeft ? 0.22 : 0.36), d);
      ctx.font = numFont;
      const weekend = el.startMonday ? c >= 5 : (c === 0 || c === 6);
      ctx.fillStyle = onAccent ? accentText : (weekend && el.weekendAccent ? accent : text);
      centered(ctx, String(d), cx, cy + numCap / 2);
    }
    if (el.showAdjacent) {
      ctx.save(); ctx.globalAlpha *= 0.28; ctx.font = numFont; ctx.fillStyle = text;
      const prevDays = new Date(year, month, 0).getDate();
      for (let i = 0; i < off; i++) centered(ctx, String(prevDays - off + 1 + i), gx + cw * i + cw / 2, gy + chh / 2 + numCap / 2);
      const tail = rows * 7 - off - days;
      for (let i = 0; i < tail; i++) {
        const idx = off + days + i, r = Math.floor(idx / 7), c = idx % 7;
        centered(ctx, String(i + 1), gx + cw * c + cw / 2, gy + chh * r + chh / 2 + numCap / 2);
      }
      ctx.restore();
    }
  }

  /* ───────────────────────── badge (circular text) ───────────────────────── */

  function drawBadge(ctx, el) {
    const s = Math.min(el.width, el.height), cx = el.width / 2, cy = el.height / 2, R0 = s / 2;
    const shape = el.shape || 'circle';
    if (shape !== 'none') {
      const p = new Path2D();
      const m = new DOMMatrix().translate(cx - R0, cy - R0);
      if (shape === 'circle') p.arc(cx, cy, R0, 0, TAU);
      else p.addPath(shapePath(shape, s, s, shape === 'burst' ? { points: 22, inner: 0.86 } : shape === 'flower' ? { points: 10, depth: 0.16 } : { points: 18, depth: 0.06 }), m);
      ctx.fillStyle = el.fill || '#d7ef5a'; ctx.fill(p);
      if (el.borderWidth > 0) { ctx.lineWidth = el.borderWidth; ctx.strokeStyle = el.borderColor || '#111'; ctx.stroke(p); }
    }
    if (el.innerRing) {
      ctx.lineWidth = Math.max(1, s * 0.008); ctx.strokeStyle = el.textColor || '#111';
      ctx.beginPath(); ctx.arc(cx, cy, R0 * (el.ringRadius ?? 0.74) - s * 0.06, 0, TAU); ctx.stroke();
    }
    // ring text
    const fs = s * (el.ringSize ?? 0.1);
    const font = fontFor(el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false, fs);
    ctx.font = font; ctx.fillStyle = el.textColor || '#1f3fd1'; ctx.textBaseline = 'alphabetic';
    const m = metrics(fontFor(el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false, 100));
    let str = el.ringText || '';
    if (el.ringUpper !== false) str = str.toUpperCase();
    const rr = R0 * (el.ringRadius ?? 0.74);
    const circ = TAU * rr;
    let chars = [...str];
    const ls0 = (el.ringSpacing ?? 0.1) * fs;
    const widthOf = arr => { let t = 0; for (const c of arr) t += ctx.measureText(c).width + ls0; return t; };
    if (el.ringRepeat && chars.length) {
      const unit = [...(str + (el.ringSep ?? '  •  '))];
      const uw = widthOf(unit);
      const reps = Math.max(1, Math.floor(circ / uw));
      chars = []; for (let i = 0; i < reps; i++) chars.push(...unit);
    }
    const total = widthOf(chars);
    const extra = el.ringFill !== false && chars.length ? Math.max(0, circ - total) / chars.length : 0;
    let a = (el.ringStart ?? 0) * Math.PI / 180;
    const mid = rr - m.cap * fs / 2; // place baseline so glyphs are centred on the ring radius
    for (const ch of chars) {
      const cw = ctx.measureText(ch).width + ls0 + extra;
      const phi = a + (cw / 2) / rr;
      ctx.save();
      ctx.translate(cx + Math.sin(phi) * mid, cy - Math.cos(phi) * mid);
      ctx.rotate(phi);
      ctx.fillText(ch, -ctx.measureText(ch).width / 2, 0);
      ctx.restore();
      a += cw / rr;
    }
    // centre
    const cs = s * (el.centerSize ?? 0.3);
    const center = el.center || 'asterisk';
    ctx.fillStyle = el.centerColor || el.textColor || '#1f3fd1';
    ctx.strokeStyle = ctx.fillStyle;
    if (center === 'text') {
      const f2 = fontFor(el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic, cs);
      ctx.font = f2;
      const lines = (el.centerText || '').split('\n');
      const mm = metrics(fontFor(el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic, 100));
      const lh = cs * 1.0;
      const top = cy - (lines.length - 1) * lh / 2;
      lines.forEach((ln, i) => centered(ctx, ln, cx, top + i * lh + mm.cap * cs / 2));
    } else if (center === 'asterisk') {
      ctx.lineWidth = cs * 0.16; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const t = i * Math.PI / 3 + Math.PI / 2; ctx.moveTo(cx - Math.cos(t) * cs / 2, cy - Math.sin(t) * cs / 2); ctx.lineTo(cx + Math.cos(t) * cs / 2, cy + Math.sin(t) * cs / 2); }
      ctx.stroke();
    } else if (center !== 'none') {
      const kind = center === 'sparkle' ? 'sparkle' : center === 'heart' ? 'heart' : center === 'flower' ? 'flower' : 'star';
      const p = new Path2D();
      p.addPath(shapePath(kind, cs, cs, { radius: cs * 0.05 }), new DOMMatrix().translate(cx - cs / 2, cy - cs / 2));
      ctx.fill(p);
    }
  }

  /* ───────────────────────── images ───────────────────────── */

  R.FILTER_PRESETS = {
    original: { label: 'Original', f: {} },
    vivid: { label: 'Vivid', f: { saturation: 35, contrast: 12 } },
    warm: { label: 'Warm', f: { warmth: 35, saturation: 8 } },
    cool: { label: 'Cool', f: { warmth: -30, contrast: 6 } },
    fade: { label: 'Fade', f: { fade: 45, contrast: -12, saturation: -10 } },
    vintage: { label: 'Vintage', f: { sepia: 35, fade: 30, warmth: 18, contrast: -6, vignette: 35, grain: 30 } },
    film: { label: 'Film', f: { fade: 22, warmth: 10, contrast: 10, saturation: -8, grain: 45 } },
    dreamy: { label: 'Dreamy', f: { brightness: 10, fade: 25, saturation: -12, blur: 0 } },
    punch: { label: 'Punch', f: { contrast: 30, saturation: 25, brightness: -4 } },
    bw: { label: 'B&W', f: { grayscale: 100, contrast: 12 } },
    noir: { label: 'Noir', f: { grayscale: 100, contrast: 45, brightness: -8, vignette: 45, grain: 25 } },
    sepia: { label: 'Sepia', f: { sepia: 85, contrast: 5 } },
    halftone: { label: 'Halftone', f: { grayscale: 100, contrast: 25, brightness: 12, halftone: 35 } },
    halftoneFine: { label: 'Fine dots', f: { grayscale: 100, contrast: 20, halftone: 12 } },
    duoBlue: { label: 'Duo blue', f: { contrast: 15, duotone: true, duoDark: '#1b2a8f', duoLight: '#a9c4ff' } },
    duoPink: { label: 'Duo pink', f: { contrast: 15, duotone: true, duoDark: '#3a0d2c', duoLight: '#ff7ab6' } },
    duoDots: { label: 'Duo dots', f: { contrast: 20, duotone: true, duoDark: '#1b2a8f', duoLight: '#b8cdfa', halftone: 20 } },
    photocopy: { label: 'Photocopy', f: { contrast: 20, threshold: 50, grain: 35 } },
    riso: { label: 'Riso', f: { contrast: 25, duotone: true, duoDark: '#f2542d', duoLight: '#fff3d6', halftone: 8, grain: 25 } },
    xerox: { label: 'Xerox', f: { grayscale: 100, contrast: 60, brightness: 8, grain: 50, fade: 10 } },
  };
  const FILTER_KEYS = ['brightness', 'contrast', 'saturation', 'warmth', 'fade', 'grayscale', 'sepia', 'halftone', 'threshold', 'duotone'];
  const filterCache = new LRU(40);
  function hexRgb(c) { const v = rgba(c).match(/[\d.]+/g).map(Number); return v; }
  function filteredSource(id, img, f) {
    if (!f || !FILTER_KEYS.some(k => f[k])) return img;
    const key = id + '|' + FILTER_KEYS.map(k => f[k] || 0).join(',') + '|' + (f.duotone || f.threshold || f.halftone ? (f.duoDark || '') + (f.duoLight || '') : '');
    const hit = filterCache.get(key);
    if (hit) return hit;
    const c = canvas(img.naturalWidth || img.width, img.naturalHeight || img.height), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    let d;
    try { d = x.getImageData(0, 0, c.width, c.height); } catch (e) { return img; }
    const a = d.data;
    const br = 1 + (f.brightness || 0) / 100;
    const cv = (f.contrast || 0) * 2.55, cf = (259 * (cv + 255)) / (255 * (259 - cv));
    const sat = 1 + (f.saturation || 0) / 100;
    const wa = (f.warmth || 0) * 0.35;
    const fade = (f.fade || 0) / 100 * 0.32;
    const gs = (f.grayscale || 0) / 100, sp = (f.sepia || 0) / 100;
    // two-tone mapping (duotone and photocopy threshold) paints luminance between an ink and a paper colour
    const twoTone = f.duotone || f.threshold;
    const dk = twoTone ? hexRgb(f.duoDark || '#111111') : null, lt = twoTone ? hexRgb(f.duoLight || '#f4f1ea') : null;
    const thr = (f.threshold || 0) / 100 * 255;
    const tone = f.halftone ? new Float32Array(a.length / 4) : null;
    for (let i = 0; i < a.length; i += 4) {
      let r = a[i] * br, g = a[i + 1] * br, b = a[i + 2] * br;
      r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
      r += wa; b -= wa; g += wa * 0.15;
      if (gs) { const L2 = 0.299 * r + 0.587 * g + 0.114 * b; r += (L2 - r) * gs; g += (L2 - g) * gs; b += (L2 - b) * gs; }
      if (sp) {
        const sr = r * 0.393 + g * 0.769 + b * 0.189, sg = r * 0.349 + g * 0.686 + b * 0.168, sb = r * 0.272 + g * 0.534 + b * 0.131;
        r += (sr - r) * sp; g += (sg - g) * sp; b += (sb - b) * sp;
      }
      if (fade) { r = r * (1 - fade) + 255 * fade * 0.42; g = g * (1 - fade) + 255 * fade * 0.4; b = b * (1 - fade) + 255 * fade * 0.38; }
      if (tone) tone[i >> 2] = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
      if (twoTone) {
        let t = clamp((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0, 1);
        if (f.threshold) t = t * 255 > thr ? 1 : 0;
        r = dk[0] + (lt[0] - dk[0]) * t; g = dk[1] + (lt[1] - dk[1]) * t; b = dk[2] + (lt[2] - dk[2]) * t;
      }
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
    }
    x.putImageData(d, 0, 0);
    let out = c;
    if (f.halftone) out = halftone(c, tone, f);
    filterCache.set(key, out);
    return out;
  }
  // print-style dot screen: one dot per cell, sized by how dark the cell is
  function halftone(src, tone, f) {
    const w = src.width, h = src.height;
    const cell = Math.max(3, Math.round(Math.max(w, h) * (0.004 + f.halftone / 100 * 0.022)));
    const ink = f.duotone ? f.duoDark || '#111' : '#111111', paper = f.duotone ? f.duoLight || '#f4f1ea' : '#f4f1ea';
    const o = canvas(w, h), x = o.getContext('2d');
    x.fillStyle = paper; x.fillRect(0, 0, w, h);
    x.fillStyle = ink;
    const p = new Path2D();
    for (let row = 0, y = cell / 2; y < h + cell; y += cell * 0.866, row++) {
      for (let cx0 = (row % 2) * cell / 2; cx0 < w + cell; cx0 += cell) {
        const sx = Math.min(w - 1, Math.max(0, cx0 | 0)), sy = Math.min(h - 1, Math.max(0, y | 0));
        const dark = 1 - tone[sy * w + sx];
        const r = cell * 0.56 * Math.sqrt(dark);  // dot area tracks darkness
        if (r > 0.35) { p.moveTo(cx0 + r, y); p.arc(cx0, y, r, 0, TAU); }
      }
    }
    x.fill(p);
    // keep the photo's transparency (cut-outs stay cut out)
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(src, 0, 0);
    return o;
  }

  R.FRAMES = {
    none: 'None', rounded: 'Rounded', circle: 'Circle', arch: 'Arch', polaroid: 'Polaroid', stamp: 'Stamp',
    film: 'Film', torn: 'Torn paper', papercut: 'Paper cut', border: 'Border', blob: 'Blob', heart: 'Heart', star: 'Star',
    scallop: 'Scallop', flower: 'Flower', ticket: 'Ticket', squircle: 'Squircle', sparkle: 'Sparkle',
  };
  function frameGeometry(el) {
    const w = el.width, h = el.height, f = el.frame || {};
    const style = f.style || 'none';
    const size = f.size ?? Math.min(w, h) * 0.05;
    const full = { x: 0, y: 0, w, h };
    const g = { outer: null, inner: null, rect: full, stroke: null, extra: null };
    const inset = (l, t, r, b) => ({ x: l, y: t, w: w - l - r, h: h - t - b });
    switch (style) {
      case 'none': g.inner = rrect(new Path2D(), 0, 0, w, h, f.radius || 0); break;
      case 'rounded': g.inner = rrect(new Path2D(), 0, 0, w, h, f.radius ?? Math.min(w, h) * 0.08); if (f.size) g.stroke = { path: g.inner, w: size }; break;
      case 'border':
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius || 0);
        g.rect = inset(size, size, size, size);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, Math.max(0, (f.radius || 0) - size));
        break;
      case 'polaroid':
        g.outer = rrect(new Path2D(), 0, 0, w, h, f.radius ?? 2);
        g.rect = inset(size, size, size, size * (f.bottom ?? 3.6));
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      case 'stamp': {
        const rh = Math.max(3, Math.min(w, h) * 0.028);
        g.outer = stampPath(w, h, rh);
        const s2 = Math.max(size, rh * 2.2);
        g.rect = inset(s2, s2, s2, s2);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      }
      case 'film': {
        const bw = Math.max(size, Math.min(w, h) * 0.09);
        g.outer = rrect(new Path2D(), 0, 0, w, h, 2);
        g.rect = inset(size * 0.6, bw, size * 0.6, bw);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 3);
        g.extra = ctx => {
          const hw = bw * 0.36, hh = bw * 0.42, n = Math.max(4, Math.round(w / (hw * 2.4)));
          ctx.fillStyle = 'rgba(250,246,238,.92)';
          for (let i = 0; i < n; i++) {
            const x = (w / n) * (i + 0.5) - hw / 2;
            ctx.fill(rrect(new Path2D(), x, (bw - hh) / 2, hw, hh, hw * 0.2));
            ctx.fill(rrect(new Path2D(), x, h - bw + (bw - hh) / 2, hw, hh, hw * 0.2));
          }
        };
        break;
      }
      case 'torn':
        g.outer = tornPath(w, h, hashStr(el.id || 'img'), Math.max(3, Math.min(w, h) * 0.022));
        g.rect = inset(size, size, size, size);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        break;
      case 'papercut': {
        // angular hand-cut outline: a jittered polygon with the photo cut along an inset copy
        const r = rng(hashStr(el.id || 'pc')), cx = w / 2, cy = h / 2, n = 16;
        const pts = [];
        for (let i = 0; i < n; i++) {
          const t = i / n * TAU + (r() - 0.5) * 0.25;
          const ex = Math.cos(t), ey = Math.sin(t);
          const k = 1 / Math.max(Math.abs(ex), Math.abs(ey)); // push towards the rectangle's edge
          const j = 0.9 + r() * 0.1;
          pts.push([ex * Math.min(k, 1.25) * j, ey * Math.min(k, 1.25) * j]);
        }
        const outerPts = fitPoly(pts, w, h);
        g.outer = polyPath(outerPts);
        const sx = Math.max(0.1, (w / 2 - size) / (w / 2)), sy = Math.max(0.1, (h / 2 - size) / (h / 2));
        g.inner = polyPath(outerPts.map(([x, y]) => [cx + (x - cx) * sx, cy + (y - cy) * sy]));
        g.rect = { x: 0, y: 0, w, h };
        break;
      }
      case 'ticket':
        g.inner = ticketPath(w, h, f.radius ?? Math.min(w, h) * 0.06, Math.min(w, h) * 0.1);
        if (f.size) g.stroke = { path: g.inner, w: size };
        break;
      default: {
        const kind = style === 'circle' ? 'ellipse' : style;
        g.inner = shapePath(kind, w, h, { points: style === 'scallop' ? 18 : style === 'star' ? 5 : 8, depth: style === 'scallop' ? 0.06 : 0.22, radius: Math.min(w, h) * 0.06, seed: hashStr(el.id || 'b') % 97 + 1 });
        if (f.size) g.stroke = { path: g.inner, w: size };
      }
    }
    return g;
  }

  R.frameGeometry = frameGeometry;
  R.filteredSource = filteredSource;

  function drawPlaceholder(ctx, r, el) {
    const cols = el.placeholder || ['#e7e1d4', '#cfc5b1'];
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    // a small "photo" glyph
    const s = Math.min(r.w, r.h) * 0.2, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save();
    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineJoin = 'round';
    ctx.stroke(rrect(new Path2D(), cx - s, cy - s * 0.72, s * 2, s * 1.44, s * 0.18));
    ctx.beginPath(); ctx.arc(cx + s * 0.45, cy - s * 0.25, s * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - s * 0.8, cy + s * 0.5); ctx.lineTo(cx - s * 0.25, cy - s * 0.1); ctx.lineTo(cx + s * 0.15, cy + s * 0.25); ctx.lineTo(cx + s * 0.4, cy + s * 0.05); ctx.lineTo(cx + s * 0.8, cy + s * 0.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCover(ctx, src, r, el) {
    const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
    if (!iw || !ih) return;
    const c = el.crop || {};
    const sc = Math.max(r.w / iw, r.h / ih) * (c.zoom || 1);
    const dw = iw * sc, dh = ih * sc;
    const fx = c.x ?? 0.5, fy = c.y ?? 0.5;
    const dx = r.x + (r.w - dw) * fx, dy = r.y + (r.h - dh) * fy;
    ctx.save();
    if (el.flipX || el.flipY) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    const f = el.filters || {};
    if (f.blur && 'filter' in ctx) ctx.filter = `blur(${f.blur * deviceScale(ctx) * Math.max(dw, dh) / 1000}px)`;
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.restore();
  }

  function overlays(ctx, r, f) {
    if (f.vignette) {
      const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.25, r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${f.vignette / 100 * 0.75})`);
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    if (f.grain) {
      ctx.save(); ctx.translate(r.x, r.y); fillTexture(ctx, 'grain', f.grain, r.w, r.h); ctx.restore();
    }
  }

  function drawImageEl(ctx, el, env) {
    const g = frameGeometry(el);
    const f = el.frame || {};
    if (g.outer) {
      ctx.fillStyle = f.color || '#fff'; ctx.fill(g.outer);
      if (f.texture) { ctx.save(); ctx.clip(g.outer); fillTexture(ctx, 'paper', f.texture, el.width, el.height); ctx.restore(); }
    }
    const img = assetImage(el.assetId);
    if (el.outline && el.outline.on && el.outline.width > 0 && img && (f.style || 'none') === 'none') {
      const src = filteredSource(el.assetId, img, el.filters);
      drawOutlined(ctx, el, 'img:' + el.assetId + JSON.stringify(el.filters || {}) + JSON.stringify(el.crop || {}) + (el.flipX ? 1 : 0), (c, w, h) => drawCover(c, src, { x: 0, y: 0, w, h }, el));
      return;
    }
    ctx.save();
    ctx.clip(g.inner);
    if (img) drawCover(ctx, filteredSource(el.assetId, img, el.filters), g.rect, el);
    else drawPlaceholder(ctx, g.rect, el);
    overlays(ctx, g.rect, el.filters || {});
    ctx.restore();
    if (g.stroke) { ctx.lineWidth = g.stroke.w; ctx.strokeStyle = f.color || '#fff'; ctx.lineJoin = 'round'; ctx.stroke(g.stroke.path); }
    if (g.extra) g.extra(ctx);
  }

  /* ───────────────────────── die-cut outline ───────────────────────── */

  const outlineCache = new LRU(60);
  R.OUTLINE_STYLES = { smooth: 'Smooth sticker', paper: 'Paper cut-out', scribble: 'Marker scribble' };
  function dilate(sil, W, H, rad) {
    const d = canvas(W, H), dx = d.getContext('2d');
    const n = 28;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; dx.drawImage(sil, Math.cos(a) * rad, Math.sin(a) * rad); }
    for (let i = 0; i < n / 2; i++) { const a = i / (n / 2) * TAU; dx.drawImage(sil, Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5); }
    dx.drawImage(sil, 0, 0);
    return d;
  }
  // outer contours of the opaque blobs in a canvas, as point lists in canvas pixels
  function contours(src, W, H) {
    const g = Math.min(1, 240 / Math.max(W, H));
    const gw = Math.max(2, Math.round(W * g)), gh = Math.max(2, Math.round(H * g));
    const sm = canvas(gw + 2, gh + 2), sx = sm.getContext('2d', { willReadFrequently: true });
    sx.drawImage(src, 1, 1, gw, gh);
    const gw2 = gw + 2, gh2 = gh + 2, px = sx.getImageData(0, 0, gw2, gh2).data;
    const G = new Uint8Array(gw2 * gh2);
    for (let i = 0; i < G.length; i++) G[i] = px[i * 4 + 3] > 110 ? 1 : 0;
    const lab = new Int32Array(G.length), comps = [];
    let id = 0;
    for (let i = 0; i < G.length; i++) {
      if (!G[i] || lab[i]) continue;
      id++;
      let area = 0;
      const stack = [i];
      lab[i] = id;
      while (stack.length) {
        const q = stack.pop(); area++;
        const qx = q % gw2, qy = (q / gw2) | 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = qx + ox, ny = qy + oy;
          if (nx < 0 || ny < 0 || nx >= gw2 || ny >= gh2) continue;
          const ni = ny * gw2 + nx;
          if (G[ni] && !lab[ni]) { lab[ni] = id; stack.push(ni); }
        }
      }
      comps.push({ id, start: i, area });
    }
    const maxA = Math.max(0, ...comps.map(c => c.area));
    const D = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
    const out = [];
    for (const c of comps) {
      if (c.area < Math.max(12, maxA * 0.03)) continue;
      const inC = (x, y) => x >= 0 && y >= 0 && x < gw2 && y < gh2 && lab[y * gw2 + x] === c.id;
      const sxp = c.start % gw2, syp = (c.start / gw2) | 0;
      let cx = sxp, cy = syp, dir = 0;
      const pts = [];
      const cap = c.area * 4 + 100;
      for (let step = 0; step < cap; step++) {
        pts.push([cx, cy]);
        let found = false;
        for (let k = 0; k < 8; k++) {
          const d = (dir + k) % 8, nx = cx + D[d][0], ny = cy + D[d][1];
          if (inC(nx, ny)) { cx = nx; cy = ny; dir = (d + 6) % 8; found = true; break; }
        }
        if (!found || (cx === sxp && cy === syp && pts.length > 2)) break;
      }
      out.push(pts.map(([x, y]) => [(x - 1 + 0.5) / g, (y - 1 + 0.5) / g]));
    }
    return out;
  }
  function simplify(pts, eps) {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop();
      const [ax, ay] = pts[i0], [bx, by] = pts[i1];
      const L = Math.hypot(bx - ax, by - ay) || 1;
      let best = -1, bd = 0;
      for (let i = i0 + 1; i < i1; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > bd) { bd = d; best = i; }
      }
      if (bd > eps && best > 0) { keep[best] = 1; stack.push([i0, best], [best, i1]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function drawOutlined(ctx, el, srcKey, paint) {
    const w = el.width, h = el.height, o = el.outline;
    const style = o.style || 'smooth';
    const s = Math.min(4, Math.max(0.25, Math.ceil(deviceScale(ctx) * 4) / 4));
    const sw = style === 'scribble' ? Math.max(3, o.width * 0.5) : 0;
    const pad = o.width + sw + 4;
    const key = [srcKey, w | 0, h | 0, s, o.width, o.color, style].join('|');
    let c = outlineCache.get(key);
    if (!c) {
      const W = (w + pad * 2) * s, H = (h + pad * 2) * s;
      const art = canvas(W, H), ax = art.getContext('2d');
      ax.scale(s, s); ax.translate(pad, pad); paint(ax, w, h);
      const sil = canvas(W, H), sx = sil.getContext('2d');
      sx.drawImage(art, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = o.color || '#fff'; sx.fillRect(0, 0, W, H);
      c = canvas(W, H);
      const cx = c.getContext('2d');
      const rad = o.width * s;
      if (style === 'smooth') {
        cx.drawImage(dilate(sil, W, H, rad), 0, 0);
      } else {
        const polys = contours(dilate(sil, W, H, rad), W, H);
        const r = rng(hashStr(el.id || 'o'));
        cx.fillStyle = cx.strokeStyle = o.color || '#fff';
        cx.lineJoin = 'round'; cx.lineCap = 'round';
        for (const poly of polys) {
          if (style === 'paper') {
            // few, straight cuts like scissors through paper
            const pts = simplify(poly, Math.max(W, H) * 0.018).map(([x, y]) => [x + (r() - 0.5) * rad * 0.3, y + (r() - 0.5) * rad * 0.3]);
            cx.fill(polyPath(pts));
          } else {
            // low-frequency wobble so the line reads as drawn by hand around the subject
            const s1 = r() * 10, s2 = r() * 10, amp = sw * s * 0.55;
            const pts = simplify(poly, Math.max(1.5, Math.max(W, H) * 0.004)).map(([x, y], i) => [x + (Math.sin(i * 0.55 + s1) + 0.5 * Math.sin(i * 1.7 + s2)) * amp, y + (Math.cos(i * 0.6 + s2) + 0.5 * Math.sin(i * 1.3 + s1)) * amp]);
            cx.lineWidth = sw * s;
            cx.stroke(polyPath(pts, 1));
            cx.globalAlpha = 0.55;
            cx.lineWidth = sw * s * 0.6;
            cx.stroke(polyPath(pts.map(([x, y]) => [x + (r() - 0.5) * sw * s * 0.8, y + (r() - 0.5) * sw * s * 0.8]), 1));
            cx.globalAlpha = 1;
          }
        }
      }
      if (style !== 'scribble') cx.drawImage(art, 0, 0);
      c.art = style === 'scribble' ? art : null;
      outlineCache.set(key, c);
    }
    ctx.drawImage(c, -pad, -pad, w + pad * 2, h + pad * 2);
    if (c.art) ctx.drawImage(c.art, -pad, -pad, w + pad * 2, h + pad * 2);
  }

  /* ───────────────────────── stickers & shapes ───────────────────────── */

  function drawSticker(ctx, el) {
    const svg = stickerSvg(el);
    if (!svg) return;
    const img = svgImage(svg);
    if (!img) return;
    const w = el.width, h = el.height;
    ctx.save();
    if (el.flipX || el.flipY) { ctx.translate(el.flipX ? w : 0, el.flipY ? h : 0); ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1); }
    if (el.outline && el.outline.on && el.outline.width > 0) drawOutlined(ctx, el, 'svg:' + hashStr(svg), (c, ww, hh) => c.drawImage(img, 0, 0, ww, hh));
    else ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }

  function drawShape(ctx, el) {
    const w = el.width, h = el.height;
    ctx.save();
    if (el.flipX || el.flipY) { ctx.translate(el.flipX ? w : 0, el.flipY ? h : 0); ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1); }
    if (el.shape === 'line') {
      const sw = el.strokeWidth || 6;
      ctx.strokeStyle = el.stroke || '#111'; ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = sw; ctx.lineCap = el.dash ? 'butt' : 'round';
      if (el.dash) ctx.setLineDash([sw * el.dash, sw * el.dash]);
      const y = h / 2, head = sw * 3.2;
      const x0 = el.arrowStart ? head * 0.8 : 0, x1 = el.arrowEnd ? w - head * 0.8 : w;
      ctx.beginPath();
      if (el.wavy) { for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin((x - x0) / (sw * 6) * TAU / 2) * sw * 1.5; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } }
      else { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
      ctx.stroke(); ctx.setLineDash([]);
      const headAt = (x, dir) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * head, y - head * 0.62); ctx.lineTo(x - dir * head, y + head * 0.62); ctx.closePath(); ctx.fill(); };
      if (el.arrowEnd) headAt(w, 1);
      if (el.arrowStart) headAt(0, -1);
      ctx.restore();
      return;
    }
    const path = shapePath(el.shape, w, h, el);
    if (!isClear(el.fill)) {
      ctx.fillStyle = makeFill(ctx, { color: el.fill, color2: el.fill2, gradient: el.gradient, angle: el.gradAngle }, w, h);
      ctx.fill(path);
    }
    if ((el.pattern && el.pattern.type && el.pattern.type !== 'none') || el.texture) {
      ctx.save(); ctx.clip(path);
      drawPattern(ctx, w, h, el.pattern);
      if (el.texture) fillTexture(ctx, 'paper', el.texture, w, h);
      ctx.restore();
    }
    if (el.strokeWidth > 0 && !isClear(el.stroke)) {
      ctx.lineWidth = el.strokeWidth; ctx.strokeStyle = el.stroke; ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash([el.strokeWidth * el.dash, el.strokeWidth * el.dash * 0.8]);
      ctx.stroke(path);
    }
    ctx.restore();
  }

  /* ───────────────────────── element dispatch ───────────────────────── */

  function bleed(el) {
    const m = Math.max(el.width, el.height);
    switch (el.type) {
      case 'text': return ((el.bg && el.bg.padX) || 0) + ((el.stroke && el.stroke.width) || 0) * 2 + (el.echo && el.echo.on ? el.fontSize * 0.4 : 0) + 8;
      case 'sticker': case 'image': return ((el.outline && el.outline.on && el.outline.width) || 0) * 1.6 + 8;
      case 'shape': return (el.strokeWidth || 0) + 6;
      default: return m * 0.05 + 6;
    }
  }

  function drawCore(ctx, el, env) {
    switch (el.type) {
      case 'text': drawText(ctx, el, env); break;
      case 'image': drawImageEl(ctx, el, env); break;
      case 'sticker': drawSticker(ctx, el, env); break;
      case 'shape': drawShape(ctx, el, env); break;
      case 'calendar': drawCalendar(ctx, el, env); break;
      case 'badge': drawBadge(ctx, el, env); break;
      case 'checklist': drawChecklist(ctx, el, env); break;
    }
  }

  /* ───────────────────────── animation ───────────────────────── */

  R.playTime = null;
  R.animDoc = null;
  R.ANIM_LOOPS = {
    none: 'None', wiggle: 'Stop-motion wiggle', float: 'Float', jiggle: 'Jiggle', sway: 'Sway', swing: 'Swing',
    spin: 'Spin', pulse: 'Pulse', bounce: 'Bounce', shake: 'Shake', orbit: 'Orbit', blink: 'Blink',
  };
  R.ANIM_ENTER = {
    none: 'None', pop: 'Pop in', fade: 'Fade in', rise: 'Slide up', drop: 'Drop in', left: 'Slide from left',
    right: 'Slide from right', zoom: 'Zoom in', spinIn: 'Spin in', typewriter: 'Typewriter', wipe: 'Wipe',
  };
  const LOOP_PERIOD = { float: 3, jiggle: 0.9, sway: 3, swing: 2.2, spin: 6, pulse: 1.6, bounce: 1.2, shake: 0.5, orbit: 4, blink: 1.4 };
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const easeBounce = p => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  };
  R.hasAnim = el => !!(el.anim && ((el.anim.loop && el.anim.loop !== 'none') || (el.anim.enter && el.anim.enter !== 'none')));
  function animState(el, t, doc) {
    const an = el.anim, D = Math.max(0.5, (doc && doc.anim && doc.anim.duration) || 5);
    const st = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: 1, px: el.width / 2, py: el.height / 2, chars: null, reveal: 1 };
    const amt = an.amount ?? 1, spd = an.speed ?? 1, m = Math.min(el.width, el.height);
    const tl = ((t % D) + D) % D;
    const loop = an.loop || 'none';
    if (loop !== 'none') {
      const phase = an.sync ? 0 : (hashStr(el.id || 'a') % 1000) / 1000;
      if (loop === 'wiggle') {
        const N = Math.max(1, Math.round(D * 8 * spd));
        const k = Math.floor(tl / D * N) % N;
        const r = rng(hashStr(el.id || 'w') + k * 7919);
        st.dx = (r() - 0.5) * m * 0.035 * amt; st.dy = (r() - 0.5) * m * 0.035 * amt; st.rot = (r() - 0.5) * 5 * amt;
      } else {
        const base = LOOP_PERIOD[loop] / spd;
        const P = D / Math.max(1, Math.round(D / base));
        const u = tl / P + phase, ph = u * TAU;
        switch (loop) {
          case 'float': st.dy = Math.sin(ph) * m * 0.06 * amt; break;
          case 'jiggle': st.rot = Math.sin(ph) * 6 * amt; st.sc = 1 + Math.sin(ph * 2) * 0.02 * amt; break;
          case 'sway': st.rot = Math.sin(ph) * 4 * amt; st.dx = Math.sin(ph) * m * 0.03 * amt; break;
          case 'swing': st.rot = Math.sin(ph) * 10 * amt; st.py = 0; break;
          case 'spin': st.rot = (u % 1) * 360 * (an.reverse ? -1 : 1); break;
          case 'pulse': st.sc = 1 + (0.5 + 0.5 * Math.sin(ph)) * 0.08 * amt; break;
          case 'bounce': st.dy = -Math.abs(Math.sin(ph / 2)) * m * 0.14 * amt; break;
          case 'shake': st.dx = Math.sin(ph) * m * 0.025 * amt; break;
          case 'orbit': st.dx = Math.cos(ph) * m * 0.06 * amt; st.dy = Math.sin(ph) * m * 0.06 * amt; break;
          case 'blink': st.alpha = (u % 1) < 0.78 ? 1 : 0.12; break;
        }
      }
    }
    const enter = an.enter || 'none';
    if (enter !== 'none') {
      const dur = 0.6 / spd, p = clamp((tl - (an.delay || 0)) / dur, 0, 1), e = easeOut(p);
      switch (enter) {
        case 'pop': st.sc *= Math.max(0, easeBack(p)); st.alpha *= Math.min(1, p * 3); break;
        case 'fade': st.alpha *= e; break;
        case 'rise': st.dy += (1 - e) * m * 0.4; st.alpha *= e; break;
        case 'drop': st.dy -= (1 - easeBounce(p)) * m * 1.2; st.alpha *= Math.min(1, p * 4); break;
        case 'left': st.dx -= (1 - e) * m * 1.2; st.alpha *= e; break;
        case 'right': st.dx += (1 - e) * m * 1.2; st.alpha *= e; break;
        case 'zoom': st.sc *= 1.6 - 0.6 * e; st.alpha *= e; break;
        case 'spinIn': st.rot -= (1 - e) * 200; st.sc *= e; break;
        case 'typewriter': if (el.type === 'text') st.chars = Math.floor(p * [...(el.text || '')].length); else st.reveal = p; break;
        case 'wipe': st.reveal = e; break;
      }
    }
    return st;
  }
  R.animState = animState;

  function drawElement(ctx, el, env = {}) {
    const t = 'time' in env ? env.time : R.playTime;
    if (t == null || !R.hasAnim(el)) { drawLayered(ctx, el, env); return; }
    const A = animState(el, t, env.doc || R.animDoc);
    if (A.alpha <= 0.001 || A.sc <= 0.001 || A.reveal <= 0) return;
    ctx.save();
    ctx.translate(A.px + A.dx, A.py + A.dy);
    if (A.rot) ctx.rotate(A.rot * Math.PI / 180);
    if (A.sc !== 1) ctx.scale(A.sc, A.sc);
    ctx.translate(-A.px, -A.py);
    if (A.alpha < 1) ctx.globalAlpha *= A.alpha;
    if (A.reveal < 1) {
      const b = bleed(el);
      ctx.beginPath(); ctx.rect(-b, -b, (el.width + b * 2) * A.reveal, el.height + b * 2); ctx.clip();
    }
    let e = el;
    if (A.chars != null) {
      const chars = [...(el.text || '')];
      if (A.chars < chars.length) e = Object.assign({}, el, { text: chars.slice(0, A.chars).join(''), autoWidth: false, width: el.width });
    }
    drawLayered(ctx, e, env);
    ctx.restore();
  }
  R.drawElement = drawElement;

  /* ───────────────────────── erasing ───────────────────────── */

  // el.erase: [{ m: 'erase'|'restore', s: 'circle'|'square', r, p: [u, v, …] }] in fractions of the box
  function strokeErase(x, el, st) {
    const w = el.width, h = el.height, r = Math.max(0.5, st.r * w), p = st.p;
    if (st.s === 'square') {
      const stamp = (u, v) => x.fillRect(u * w - r, v * h - r, r * 2, r * 2);
      stamp(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) {
        const x0 = p[i - 2] * w, y0 = p[i - 1] * h, x1 = p[i] * w, y1 = p[i + 1] * h;
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r * 0.4)));
        for (let k = 1; k <= n; k++) stamp((x0 + (x1 - x0) * k / n) / w, (y0 + (y1 - y0) * k / n) / h);
      }
      return;
    }
    if (p.length <= 2) { x.beginPath(); x.arc(p[0] * w, p[1] * h, r, 0, TAU); x.fill(); return; }
    x.lineWidth = r * 2; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(p[0] * w, p[1] * h);
    for (let i = 2; i < p.length; i += 2) x.lineTo(p[i] * w, p[i + 1] * h);
    x.stroke();
  }

  const layerCache = new LRU(60);
  function drawLayered(ctx, el, env) {
    const sh = el.shadow;
    const erased = el.erase && el.erase.length;
    if ((!sh || !sh.on) && !erased) { drawCore(ctx, el, env); return; }
    const s = Math.min(4, Math.max(0.25, Math.ceil(deviceScale(ctx) * 4) / 4));
    const b = bleed(el);
    const { x, y, rotation, opacity, name, locked, hidden, anim, ...rest } = el;
    const key = JSON.stringify(rest) + '|' + s + '|' + R.fontsVersion;
    let c = layerCache.get(key);
    if (!c || c.dirty) {
      const W = (el.width + b * 2) * s, H = (el.height + b * 2) * s;
      c = canvas(W, H);
      const x2 = c.getContext('2d');
      x2.scale(s, s); x2.translate(b, b);
      drawCore(x2, el, env);
      if (erased) {
        const mk = canvas(W, H), mx = mk.getContext('2d');
        mx.scale(s, s); mx.translate(b, b);
        mx.fillStyle = mx.strokeStyle = '#000';
        mx.fillRect(-b, -b, el.width + b * 2, el.height + b * 2);
        for (const st of el.erase) {
          mx.globalCompositeOperation = st.m === 'restore' ? 'source-over' : 'destination-out';
          strokeErase(mx, el, st);
        }
        x2.setTransform(1, 0, 0, 1, 0, 0);
        x2.globalCompositeOperation = 'destination-in';
        x2.drawImage(mk, 0, 0);
      }
      // async resources may still be loading; don't cache an incomplete render
      if (!isComplete(el)) c.dirty = true;
      layerCache.set(key, c);
    }
    const ds = deviceScale(ctx);
    ctx.save();
    if (sh && sh.on) {
      ctx.shadowColor = rgba(sh.color || '#000', sh.opacity ?? 0.35);
      ctx.shadowBlur = (sh.blur ?? 20) * ds;
      ctx.shadowOffsetX = (sh.x ?? 0) * ds;
      ctx.shadowOffsetY = (sh.y ?? 12) * ds;
    }
    ctx.drawImage(c, -b, -b, el.width + b * 2, el.height + b * 2);
    ctx.restore();
  }

  function isComplete(el) {
    if (el.type === 'image') return !el.assetId || !!assetImage(el.assetId);
    if (el.type === 'sticker') { const svg = stickerSvg(el); return !svg || !!svgImage(svg); }
    return true;
  }

  /* ───────────────────────── background / overlay ───────────────────────── */

  function drawBackground(ctx, doc, opts = {}) {
    const w = doc.width, h = doc.height, bg = doc.background || {};
    if (!opts.transparent) {
      ctx.fillStyle = makeFill(ctx, { color: bg.color || '#fff', color2: bg.color2, gradient: bg.gradient, angle: bg.angle }, w, h);
      ctx.fillRect(0, 0, w, h);
    }
    if (bg.assetId) {
      const img = assetImage(bg.assetId);
      if (img) {
        ctx.save();
        ctx.globalAlpha *= bg.imageOpacity ?? 1;
        const el = { crop: bg.crop, filters: bg.filters, flipX: bg.flipX };
        drawCover(ctx, filteredSource(bg.assetId, img, bg.filters), { x: 0, y: 0, w, h }, el);
        overlays(ctx, { x: 0, y: 0, w, h }, bg.filters || {});
        ctx.restore();
      }
    }
    drawPattern(ctx, w, h, bg.pattern);
    if (bg.texture) fillTexture(ctx, 'paper', bg.texture, w, h);
  }
  R.drawBackground = drawBackground;

  function drawOverlay(ctx, doc) {
    const o = doc.overlay || {};
    const w = doc.width, h = doc.height;
    if (o.vignette) overlays(ctx, { x: 0, y: 0, w, h }, { vignette: o.vignette });
    if (o.grain) fillTexture(ctx, 'grain', o.grain, w, h);
    if (o.tint && o.tintAmount) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha *= o.tintAmount / 100; ctx.fillStyle = o.tint; ctx.fillRect(0, 0, w, h); ctx.restore(); }
    if (o.paper) fillTexture(ctx, 'paper', o.paper, w, h);
    if (o.leak) {
      // warm light leak bleeding in from two corners
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha *= o.leak / 100;
      for (const [x, y, c] of [[0, 0, '255,120,40'], [w, h * 0.85, '255,60,120']]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.6);
        g.addColorStop(0, `rgba(${c},0.85)`); g.addColorStop(0.5, `rgba(${c},0.25)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
    if (o.creases) {
      // folded-poster creases: a shadow and a highlight either side of each fold
      const a = o.creases / 100;
      const fold = (x0, y0, x1, y1, vertical) => {
        const span = Math.max(w, h) * 0.012;
        const g = vertical ? ctx.createLinearGradient(x0 - span, 0, x0 + span, 0) : ctx.createLinearGradient(0, y0 - span, 0, y0 + span);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, `rgba(0,0,0,${0.22 * a})`);
        g.addColorStop(0.55, `rgba(255,255,255,${0.35 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        if (vertical) ctx.fillRect(x0 - span, 0, span * 2, h); else ctx.fillRect(0, y0 - span, w, span * 2);
      };
      ctx.save();
      fold(w / 2, 0, w / 2, h, true);
      fold(0, h / 3, w, h / 3, false);
      fold(0, h * 2 / 3, w, h * 2 / 3, false);
      fillTexture(ctx, 'paper', 25 * a, w, h);
      ctx.restore();
    }
  }
  R.drawOverlay = drawOverlay;

  /* ───────────────────────── whole-document render ───────────────────────── */

  function fontsOf(doc) {
    const out = [];
    for (const el of doc.elements || []) {
      if (el.type === 'text' || el.type === 'checklist') out.push([el.fontFamily, el.fontWeight || 400, !!el.italic]);
      if (el.type === 'calendar') { out.push([el.titleFont || 'Instrument Serif', el.titleWeight || 400, false], [el.bodyFont || 'Instrument Sans', el.bodyWeight || 500, false], [el.bodyFont || 'Instrument Sans', 600, false]); }
      if (el.type === 'badge') { out.push([el.ringFont || 'Bricolage Grotesque', el.ringWeight || 600, false]); if (el.center === 'text') out.push([el.centerFont || el.ringFont || 'Bricolage Grotesque', el.centerWeight || 700, !!el.centerItalic]); }
    }
    return out.filter(f => Fonts.BY_NAME[f[0]]).map(([f, w, i]) => [f, Fonts.nearestWeight(f, w), i]);
  }
  R.preload = async function (doc) {
    const jobs = [];
    for (const [f, w, i] of fontsOf(doc)) jobs.push(Fonts.ensure(f, w, i));
    const ids = new Set();
    if (doc.background && doc.background.assetId) ids.add(doc.background.assetId);
    for (const el of doc.elements || []) {
      if (el.type === 'image' && el.assetId) ids.add(el.assetId);
      if (el.type === 'sticker') { const svg = stickerSvg(el); if (svg) jobs.push(loadImage(R.svgDataUrl(svg), svgCache, svg).promise); }
    }
    for (const id of ids) if (assets[id]) jobs.push(loadImage(assets[id], imgCache, id).promise);
    await Promise.all(jobs);
    R.fontsVersion++;
    requestRedraw();
  };

  R.renderDoc = function (doc, opts = {}) {
    const scale = opts.scale || 1;
    const c = opts.canvas || canvas(doc.width * scale, doc.height * scale);
    const ctx = c.getContext('2d');
    if (opts.canvas) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); }
    ctx.save();
    ctx.scale(c.width / doc.width, c.height / doc.height);
    drawBackground(ctx, doc, opts);
    const env = Object.assign({}, opts, { time: opts.time ?? null, doc });
    for (const el of doc.elements || []) {
      if (el.hidden) continue;
      ctx.save();
      ctx.translate(el.x, el.y);
      ctx.rotate((el.rotation || 0) * Math.PI / 180);
      ctx.globalAlpha = el.opacity ?? 1;
      if (el.blend && el.blend !== 'normal') ctx.globalCompositeOperation = el.blend;
      drawElement(ctx, el, env);
      ctx.restore();
    }
    drawOverlay(ctx, doc);
    ctx.restore();
    return c;
  };

  window.StudioRender = R;
})();
