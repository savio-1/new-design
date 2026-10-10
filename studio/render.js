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
  // sides: any of 't', 'r', 'b', 'l' — the edges that are ripped; the rest stay straight
  function tornPath(w, h, seed, amp, sides = 'trbl') {
    const r = rng(seed), pts = [];
    const edge = (x0, y0, x1, y1, nx, ny, torn) => {
      if (!torn) { pts.push([x0, y0]); return; }
      const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(6, Math.round(len / (amp * 1.4)));
      for (let i = 0; i < steps; i++) {
        const t = i / steps, j = (r() * 0.85 + 0.15) * amp;
        pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
      }
    };
    edge(0, 0, w, 0, 0, 1, sides.includes('t')); edge(w, 0, w, h, -1, 0, sides.includes('r'));
    edge(w, h, 0, h, 0, -1, sides.includes('b')); edge(0, h, 0, 0, 1, 0, sides.includes('l'));
    return polyPath(pts);
  }
  // a page ripped out of a spiral notebook: ragged left edge with torn-through punch holes
  function notebookPath(w, h, seed) {
    const p = new Path2D();
    p.addPath(tornPath(w, h, seed, Math.max(3, w * 0.03), 'l'));
    const hole = Math.max(4, Math.min(w, h) * 0.028), gap = hole * 2.6, r = rng(seed + 9);
    for (let y = gap; y < h - hole * 2; y += gap) {
      const x = w * 0.035 + (r() - 0.5) * hole * 0.3;
      rrect(p, x, y, hole * 1.2, hole, hole * 0.2);
    }
    return p;
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
    torn: { label: 'Torn paper', path: (w, h, o) => tornPath(w, h, o.seed || 5, Math.max(3, Math.min(w, h) * 0.025), o.tornSides || 'trbl') },
    notebook: { label: 'Notebook page', path: (w, h, o) => notebookPath(w, h, o.seed || 7), evenodd: true },
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
    speech: 'Speech bubble', ticket: 'Ticket', underline: 'Underline', scribble: 'Scribble circle', torn: 'Torn paper', rough: 'Marker blocks', folded: 'Folded label', glossy: 'Game button',
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
      case 'glossy': {
        // game-menu button: soft vertical gradient, top sheen and a darker lower lip
        const p = rrect(new Path2D(), 0, 0, w, h, Math.min(h / 2, rad || h / 2));
        const base = rgba(col);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, rgba('#ffffff', 1)); g.addColorStop(0.55, base); g.addColorStop(1, base);
        ctx.fillStyle = g; ctx.fill(p);
        ctx.save(); ctx.clip(p);
        const lip = ctx.createLinearGradient(0, h * 0.6, 0, h);
        lip.addColorStop(0, 'rgba(0,0,0,0)'); lip.addColorStop(1, 'rgba(60,50,40,0.16)');
        ctx.fillStyle = lip; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill(rrect(new Path2D(), h * 0.3, h * 0.08, w - h * 0.6, h * 0.22, h * 0.11));
        ctx.restore();
        ctx.lineWidth = Math.max(1, h * 0.025); ctx.strokeStyle = border ? border.c : 'rgba(80,70,60,0.18)'; ctx.stroke(p);
        break;
      }
      case 'oval': { const p = new Path2D(); p.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); paint(p); break; }
      case 'scallop': paint(shapePath('scallop', w, h, { points: Math.round(clamp((w + h) / 18, 12, 28)), depth: 0.07 })); break;
      case 'burst': paint(shapePath('burst', w, h, { points: 20, inner: 0.84 })); break;
      case 'speech': paint(speechPath(w, h, rad || h * 0.2)); break;
      case 'ticket': paint(ticketPath(w, h, rad, Math.min(h * 0.16, 18))); break;
      case 'torn': paint(tornPath(w, h, seed, Math.max(2, Math.min(w, h) * 0.04))); break;
      case 'folded': {
        // paper label with its top-right corner folded over
        const f = Math.min(h * 0.75, w * 0.3);
        const body = polyPath([[0, 0], [w - f, 0], [w, f], [w, h], [0, h]]);
        paint(body);
        if (!isClear(col)) {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = f * 0.25 * deviceScale(ctx); ctx.shadowOffsetX = -f * 0.08 * deviceScale(ctx); ctx.shadowOffsetY = f * 0.1 * deviceScale(ctx);
          ctx.fillStyle = col; ctx.fill(polyPath([[w - f, 0], [w - f, f], [w, f]]));
          ctx.restore();
          ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(polyPath([[w - f, 0], [w - f, f], [w, f]]));
        }
        break;
      }
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

  // char ranges of the highlighted words, mapped onto the laid-out lines
  function typingBoxes(el, L) {
    const tp = el.typing || {};
    const up = s => el.uppercase ? s.toUpperCase() : s;
    const shown = up(el.text || '');
    const full = up(el._full != null ? el._full : (el.text || ''));
    const meas = measurer(mctx, L.font, 0);
    const starts = [];
    let i = 0;
    for (const ln of L.lines) { const idx = ln.text ? shown.indexOf(ln.text, i) : i; const at = idx < 0 ? i : idx; starts.push(at); i = at + ln.text.length; }
    const xAt = (li, off) => { const ln = L.lines[li]; return ln.x + meas.raw(ln.text.slice(0, off)) + L.ls * off; };
    const boxes = [];
    const F = full.toLowerCase();
    for (const raw of (tp.marks || [])) {
      const m = String(raw || '').trim().toLowerCase();
      if (!m) continue;
      let from = 0, a;
      while ((a = F.indexOf(m, from)) >= 0) {
        const b = Math.min(a + m.length, shown.length);
        from = a + m.length;
        if (b <= a) continue;
        L.lines.forEach((ln, li) => {
          const s0 = Math.max(a, starts[li]), e0 = Math.min(b, starts[li] + ln.text.length);
          if (e0 > s0) boxes.push({ li, x0: xAt(li, s0 - starts[li]), x1: xAt(li, e0 - starts[li]) - (e0 - starts[li] > 0 ? L.ls * 0.5 : 0), base: ln.base, first: s0 === a, last: e0 === a + m.length || e0 === shown.length });
        });
      }
    }
    const last = L.lines[L.lines.length - 1];
    const caret = last ? { x: last.x + meas.raw(last.text) + L.ls * [...last.text].length, base: last.base } : { x: 0, base: L.size };
    return { boxes, caret };
  }
  R.typingBoxes = typingBoxes;
  function typingUnder(ctx, el, L, T) {
    const tp = el.typing;
    const st = tp.style || 'select';
    for (const b of T.boxes) {
      const y0 = b.base - L.cap * 1.32, y1 = b.base + L.size * 0.2;
      const px = st === 'marker' ? L.size * 0.12 : L.size * 0.03;
      if (st === 'underline') { ctx.fillStyle = tp.color || '#ff3b30'; ctx.fillRect(b.x0, b.base + L.size * 0.08, b.x1 - b.x0, Math.max(2, L.size * 0.09)); continue; }
      ctx.fillStyle = tp.color || (st === 'marker' ? '#f4e04d' : 'rgba(52,130,246,0.32)');
      if (st === 'marker') ctx.fill(rrect(new Path2D(), b.x0 - px, y0, b.x1 - b.x0 + px * 2, y1 - y0, L.size * 0.04));
      else ctx.fillRect(b.x0 - px, y0, b.x1 - b.x0 + px * 2, y1 - y0);
    }
  }
  function typingOver(ctx, el, L, T) {
    const tp = el.typing;
    if ((tp.style || 'select') === 'select') {
      const hc = tp.handle || '#1f7ae0', lw = Math.max(1.5, L.size * 0.05), kr = Math.max(3, L.size * 0.1);
      ctx.fillStyle = hc; ctx.strokeStyle = hc; ctx.lineWidth = lw; ctx.lineCap = 'butt';
      for (const b of T.boxes) {
        const px = L.size * 0.03, y0 = b.base - L.cap * 1.32, y1 = b.base + L.size * 0.2;
        if (b.first) { ctx.beginPath(); ctx.moveTo(b.x0 - px, y0 - kr); ctx.lineTo(b.x0 - px, y1); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x0 - px, y0 - kr, kr, 0, TAU); ctx.fill(); }
        if (b.last) { ctx.beginPath(); ctx.moveTo(b.x1 + px, y0); ctx.lineTo(b.x1 + px, y1 + kr); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x1 + px, y1 + kr, kr, 0, TAU); ctx.fill(); }
      }
    }
    if (tp.caret !== false && el._caretOn !== false) {
      ctx.fillStyle = tp.caretColor || (isClear(el.fill) ? '#111' : el.fill);
      const w = Math.max(1.5, L.size * (tp.caretWidth || 0.06));
      ctx.fillRect(T.caret.x + L.size * 0.04, T.caret.base - L.cap * 1.22, w, L.cap * 1.22 + L.size * 0.2);
    }
  }
  function drawText(ctx, el, env) {
    const L = layoutText(el);
    const bg = el.bg || {};
    // anchor: slide the line so one chosen word sits dead centre (match cuts keep it still)
    if (el.anchor && !L.curved) {
      const A = typingBoxes(Object.assign({}, el, { typing: { marks: [el.anchor] } }), L).boxes[0];
      if (A) ctx.translate(L.boxW / 2 - (A.x0 + A.x1) / 2, 0);
    }
    textBackground(ctx, el, L);
    if (el._yShift) ctx.translate(0, el._yShift);
    const TY = el.typing && !L.curved ? typingBoxes(el, L) : null;
    if (TY) typingUnder(ctx, el, L, TY);
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
      if (el._letters && !L.curved) {
        // per-letter entrance: each glyph lands on its own, staggered
        const LT = el._letters, meas = measurer(mctx, L.font, 0);
        const stag = 0.055 / LT.spd, dur = 0.42 / LT.spd;
        let g = 0;
        for (const ln of L.lines) {
          const chars = [...ln.text];
          let prefix = '';
          for (let i = 0; i < chars.length; i++, g++) {
            const ch = chars[i], x = ln.x + meas.raw(prefix) + L.ls * i, cw = meas.raw(prefix + ch) - meas.raw(prefix);
            prefix += ch;
            const q = clamp((LT.t - g * stag) / dur, 0, 1);
            if (q <= 0 || ch === ' ') continue;
            ctx.save();
            ctx.translate(x + cw / 2, ln.base - L.cap / 2);
            if (LT.style === 'slam') {
              const k = easeBack(q), sc = 2.1 - 1.1 * k;
              ctx.rotate((1 - q) * (g % 2 ? 0.35 : -0.35)); ctx.scale(sc, sc); ctx.globalAlpha *= Math.min(1, q * 3);
            } else if (LT.style === 'lettersUp') { ctx.translate(0, (1 - easeOut(q)) * L.size * 0.9); ctx.globalAlpha *= q; }
            else if (LT.style === 'lettersDrop') { ctx.translate(0, -(1 - easeBounce(q)) * L.size * 1.3); ctx.globalAlpha *= Math.min(1, q * 4); }
            else { ctx.globalAlpha *= q; ctx.scale(0.9 + 0.1 * q, 0.9 + 0.1 * q); }
            mode === 'stroke' ? ctx.strokeText(ch, -cw / 2, L.cap / 2) : ctx.fillText(ch, -cw / 2, L.cap / 2);
            ctx.restore();
          }
        }
      } else if (L.curved) {
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
    if (TY) typingOver(ctx, el, L, TY);
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
    const hh = el.showWeekdays === false ? 0 : h * 0.08;
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
    if (hh) {
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
    const fs = Math.min(cw, chh) * (layout === 'grid' ? 0.34 : 0.42) * (el.numberScale || 1);
    const numFont = fontFor(bF, bW, false, fs);
    const numCap = capOf(bF, bW) * fs;
    const topLeft = layout === 'grid' && (el.numberPos === 'corner' || el.numberPos === 'corner-right');
    const rightCorner = el.numberPos === 'corner-right';
    for (let d = 1; d <= days; d++) {
      const idx = off + d - 1, r = Math.floor(idx / 7), c = idx % 7;
      const x0 = gx + cw * c, y0 = gy + chh * r;
      if (el.cellColor && !isClear(el.cellColor)) {
        ctx.fillStyle = el.cellColor;
        const ins = Math.min(cw, chh) * 0.06;
        ctx.fill(rrect(new Path2D(), x0 + ins, y0 + ins, cw - ins * 2, chh - ins * 2, (el.cellRadius ?? 0.2) * Math.min(cw, chh)));
      }
      let cx = x0 + cw / 2, cy = y0 + chh / 2;
      if (topLeft) { cx = rightCorner ? x0 + cw - fs * 1.1 : x0 + fs * 0.9; cy = y0 + fs * 0.95; }
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
    motion: { label: 'Motion', f: { motion: 45, contrast: 6 } },
    grit: { label: 'Gym grit', f: { grayscale: 100, contrast: 28, brightness: -6, motion: 55, noise: 55, vignette: 35 } },
    ghost: { label: 'Ghost', f: { motion: 70, motionAngle: 90, fade: 18, saturation: -20 } },
    noisy: { label: 'Noise', f: { noise: 60, contrast: 10, fade: 8 } },
    haze: { label: 'Haze', f: { blur: 6, fade: 22, brightness: 8, noise: 30 } },
    fisheye: { label: 'Fisheye', f: { fisheye: 45, contrast: 6, saturation: 8 } },
    lens: { label: 'Lens', f: { fisheye: 35, warmth: 12, fade: 10, vignette: 30 } },
  };
  const FILTER_KEYS = ['brightness', 'contrast', 'saturation', 'warmth', 'fade', 'grayscale', 'sepia', 'halftone', 'threshold', 'duotone', 'noise', 'motion', 'motionAngle', 'fisheye'];
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
    // luminance noise is baked into the pixels, so it stays fine-grained at any size
    const nz = (f.noise || 0) / 100 * 120;
    let seed = 0x9e3779b9;
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
      if (nz) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        const n = ((seed >>> 0) / 4294967296 - 0.5) * nz;
        r += n; g += n; b += n;
      }
      a[i] = r; a[i + 1] = g; a[i + 2] = b;
    }
    x.putImageData(d, 0, 0);
    let out = c;
    if (f.halftone) out = halftone(c, tone, f);
    if (f.motion) out = motionBlur(out, f.motion, f.motionAngle || 0);
    if (f.fisheye) out = barrel(out, f.fisheye);
    filterCache.set(key, out);
    return out;
  }
  // directional blur: the photo averaged with copies of itself slid along the angle
  function motionBlur(src, amt, angle) {
    const w = src.width, h = src.height;
    const L = Math.max(w, h) * amt / 100 * 0.09;
    const N = clamp(Math.round(L / 3), 6, 40);
    const o = canvas(w, h), x = o.getContext('2d');
    const a = angle * Math.PI / 180, dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    x.drawImage(src, 0, 0);
    for (let i = 1; i < N; i++) {
      const t = i / (N - 1) - 0.5;
      x.globalAlpha = 1 / (i + 1); // running average keeps every copy equally weighted
      x.drawImage(src, dx * t, dy * t);
    }
    return o;
  }
  function motionBlurPx(src, L, angle) {
    const w = src.width, h = src.height, o = canvas(w, h), x = o.getContext('2d');
    const N = clamp(Math.round(L / 2.5), 4, 36), a = angle * Math.PI / 180, dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    for (let i = 0; i < N; i++) { const t = i / (N - 1) - 0.5; x.globalAlpha = 1 / (i + 1); x.drawImage(src, dx * t, dy * t); }
    return o;
  }
  // barrel distortion: the centre swells, edges bow out and the corners fall away
  function barrel(src, amt) {
    const w = src.width, h = src.height;
    const sc = canvas(w, h).getContext('2d', { willReadFrequently: true });
    sc.drawImage(src, 0, 0);
    let si;
    try { si = sc.getImageData(0, 0, w, h); } catch (e) { return src; }
    const sd = si.data, o = canvas(w, h), ox = o.getContext('2d'), od = ox.createImageData(w, h), dd = od.data;
    const k = amt / 100 * 0.6;
    for (let y = 0; y < h; y++) {
      const ny = (y + 0.5) / h * 2 - 1;
      for (let x = 0; x < w; x++) {
        const nx = (x + 0.5) / w * 2 - 1;
        const f = 1 + k * (nx * nx + ny * ny - 1);
        const fx = (nx * f + 1) / 2 * w - 0.5, fy = (ny * f + 1) / 2 * h - 0.5;
        if (fx < -0.5 || fy < -0.5 || fx > w - 0.5 || fy > h - 0.5) continue;
        const x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy));
        const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
        const tx = clamp(fx - x0, 0, 1), ty = clamp(fy - y0, 0, 1);
        const i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4, i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
        const di = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) {
          const top = sd[i00 + c] + (sd[i10 + c] - sd[i00 + c]) * tx, bot = sd[i01 + c] + (sd[i11 + c] - sd[i01 + c]) * tx;
          dd[di + c] = top + (bot - top) * ty;
        }
      }
    }
    ox.putImageData(od, 0, 0);
    return o;
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
    scallop: 'Scallop', flower: 'Flower', ticket: 'Ticket', squircle: 'Squircle', sparkle: 'Sparkle', sticky: 'Sticky note',
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
      case 'sticky': {
        // a sticky note: the photo printed on the paper, glue strip on top, the bottom edge curling up
        const lift = h * 0.025;
        const p = new Path2D();
        p.moveTo(0, 0); p.lineTo(w, 0); p.lineTo(w, h - lift); p.quadraticCurveTo(w * 0.55, h + lift * 0.4, 0, h - lift * 0.3); p.closePath();
        g.outer = p;
        g.rect = inset(size, size * 1.1, size, size * 1.3);
        g.inner = rrect(new Path2D(), g.rect.x, g.rect.y, g.rect.w, g.rect.h, 0);
        g.print = true;
        g.extra = ctx => {
          ctx.save(); ctx.clip(p);
          const gl = ctx.createLinearGradient(0, 0, 0, h * 0.14);
          gl.addColorStop(0, 'rgba(0,0,0,0.10)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h * 0.14);
          const cl = ctx.createLinearGradient(0, h * 0.72, 0, h);
          cl.addColorStop(0, 'rgba(255,255,255,0)'); cl.addColorStop(0.7, 'rgba(255,255,255,0.10)'); cl.addColorStop(1, 'rgba(0,0,0,0.18)');
          ctx.fillStyle = cl; ctx.fillRect(0, h * 0.72, w, h * 0.28);
          const sd = ctx.createLinearGradient(0, 0, w, 0);
          sd.addColorStop(0, 'rgba(0,0,0,0.06)'); sd.addColorStop(0.15, 'rgba(0,0,0,0)'); sd.addColorStop(0.85, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(0,0,0,0.08)');
          ctx.fillStyle = sd; ctx.fillRect(0, 0, w, h);
          ctx.restore();
        };
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
    // printed frames lay the photo into the paper like ink
    if (g.print) ctx.globalCompositeOperation = 'multiply';
    if (img) drawCover(ctx, filteredSource(el.assetId, img, el.filters), g.rect, el);
    else drawPlaceholder(ctx, g.rect, el);
    ctx.globalCompositeOperation = 'source-over';
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
    const rule = (SHAPES[el.shape] || {}).evenodd ? 'evenodd' : 'nonzero';
    // white paper fibres showing along a ripped edge
    if ((el.shape === 'torn' || el.shape === 'notebook') && el.rim && !isClear(el.rim)) {
      const amp = Math.max(3, Math.min(w, h) * 0.025) * 1.9;
      ctx.fillStyle = el.rim;
      ctx.fill(el.shape === 'torn' ? tornPath(w, h, (el.seed || 5) + 31, amp, el.tornSides || 'trbl') : tornPath(w, h, (el.seed || 7) + 31, Math.max(3, w * 0.03) * 1.6, 'l'));
    }
    if (!isClear(el.fill)) {
      ctx.fillStyle = makeFill(ctx, { color: el.fill, color2: el.fill2, gradient: el.gradient, angle: el.gradAngle }, w, h);
      ctx.fill(path, rule);
    }
    if ((el.pattern && el.pattern.type && el.pattern.type !== 'none') || el.texture || el.crumple) {
      ctx.save(); ctx.clip(path, rule);
      drawPattern(ctx, w, h, el.pattern);
      if (el.texture) fillTexture(ctx, 'paper', el.texture, w, h);
      if (el.crumple) drawCrumple(ctx, w, h, el.crumple, el.seed || 3);
      ctx.restore();
    }
    if (el.strokeWidth > 0 && !isClear(el.stroke)) {
      ctx.lineWidth = el.strokeWidth; ctx.strokeStyle = el.stroke; ctx.lineJoin = 'round';
      if (el.dash) ctx.setLineDash([el.strokeWidth * el.dash, el.strokeWidth * el.dash * 0.8]);
      ctx.stroke(path);
    }
    ctx.restore();
  }

  /* ───────────────────────── crumpled paper ─────────────────────────
     Light and shadow painted as translucent white and black (folds, crinkles,
     mottling, fibres, dust), so the relief reads on any paper colour. */
  const crumpleCache = new LRU(12);
  let dustTile = null;
  function dust() {
    if (dustTile) return dustTile;
    const c = canvas(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(29);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = r(), white = v < 0.5;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = white ? 255 : 0;
      d.data[i + 3] = r() < 0.004 ? 200 : Math.round(Math.abs(v - 0.5) * 2 * 46);
    }
    x.putImageData(d, 0, 0);
    return (dustTile = c);
  }
  function crumpleTexture(w, h, seed) {
    const k = Math.min(1, 1800 / Math.max(w, h));
    const W = Math.max(64, Math.round(w * k)), H = Math.max(64, Math.round(h * k));
    const key = W + 'x' + H + ':' + seed;
    let c = crumpleCache.get(key);
    if (c) return c;
    c = canvas(W, H);
    const x = c.getContext('2d'), r = rng(seed * 7919 + 13), M = Math.max(W, H);
    // blotchy mottling
    for (let i = 0; i < 90; i++) {
      const px = r() * W, py = r() * H, rad = M * (0.06 + r() * 0.3), light = r() < 0.35;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      const al = (0.06 + r() * 0.14) * (light ? 0.55 : 1);
      g.addColorStop(0, light ? `rgba(255,255,255,${al})` : `rgba(0,0,0,${al})`);
      g.addColorStop(1, light ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    // folds: shaded band on one side, lit band on the other, crisp ridge between
    const crease = (pts, strength) => {
      const path = new Path2D(); pts.forEach(([a, b], i) => i ? path.lineTo(a, b) : path.moveTo(a, b));
      const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len, ny = (bx - ax) / len, band = M * (0.01 + r() * 0.025);
      x.save(); x.lineJoin = 'round'; x.lineCap = 'round';
      for (let j = 0; j < 3; j++) {
        const bw = band * (1 - j * 0.3);
        x.lineWidth = bw;
        x.save(); x.translate(nx * bw / 2, ny * bw / 2); x.strokeStyle = `rgba(0,0,0,${0.07 * strength})`; x.stroke(path); x.restore();
        x.save(); x.translate(-nx * bw / 2, -ny * bw / 2); x.strokeStyle = `rgba(255,255,255,${0.05 * strength})`; x.stroke(path); x.restore();
      }
      x.lineWidth = Math.max(1, M * 0.0013);
      x.strokeStyle = `rgba(255,255,255,${0.55 * strength})`; x.stroke(path);
      x.translate(nx * Math.max(1.2, M * 0.001), ny * Math.max(1.2, M * 0.001)); x.strokeStyle = `rgba(0,0,0,${0.45 * strength})`; x.stroke(path);
      x.restore();
    };
    const line = (x0, y0, x1, y1, wobble) => {
      const pts = [], n = 8;
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * wobble, y0 + (y1 - y0) * t + (r() - 0.5) * wobble]); }
      return pts;
    };
    crease(line(W * (0.47 + r() * 0.06), -10, W * (0.47 + r() * 0.06), H + 10, M * 0.01), 1.1);
    crease(line(-10, H * (0.18 + r() * 0.06), W + 10, H * (0.18 + r() * 0.06), M * 0.01), 1);
    crease(line(-10, H * (0.72 + r() * 0.06), W + 10, H * (0.72 + r() * 0.06), M * 0.01), 0.8);
    for (let i = 0; i < 18; i++) {
      const a = r() * TAU, cx = r() * W, cy = r() * H, L = M * (0.15 + r() * 0.6);
      crease(line(cx - Math.cos(a) * L / 2, cy - Math.sin(a) * L / 2, cx + Math.cos(a) * L / 2, cy + Math.sin(a) * L / 2, M * 0.025), 0.35 + r() * 0.6);
    }
    // fine crinkles
    x.lineWidth = Math.max(0.6, M * 0.0009);
    for (let i = 0; i < 600; i++) {
      const cx = r() * W, cy = r() * H, a = r() * TAU, L = M * (0.008 + r() * 0.05);
      x.strokeStyle = r() < 0.45 ? `rgba(255,255,255,${0.1 + r() * 0.15})` : `rgba(0,0,0,${0.12 + r() * 0.18})`;
      x.beginPath(); x.moveTo(cx, cy); x.quadraticCurveTo(cx + Math.cos(a + 0.6) * L / 2, cy + Math.sin(a + 0.6) * L / 2, cx + Math.cos(a) * L, cy + Math.sin(a) * L); x.stroke();
    }
    // fibres and photocopy dust
    x.fillStyle = x.createPattern(dust(), 'repeat');
    x.fillRect(0, 0, W, H);
    crumpleCache.set(key, c);
    return c;
  }
  function drawCrumple(ctx, w, h, amount, seed) {
    if (!amount) return;
    const tex = crumpleTexture(w, h, seed || 1);
    ctx.save();
    ctx.globalAlpha *= clamp(amount / 100, 0, 1);
    ctx.drawImage(tex, 0, 0, w, h);
    ctx.restore();
  }
  R.drawCrumple = drawCrumple;

  /* ───────────────────────── ribbons: bands and lines with text along a path ─────────────────────────
     el.points are [u, v] fractions of the box, joined by a Catmull-Rom spline. */

  R.RIBBON_PATHS = {
    wave: { label: 'Wave', pts: [[0, 0.62], [0.18, 0.3], [0.42, 0.68], [0.66, 0.3], [0.85, 0.62], [1, 0.42]] },
    loop: { label: 'Loop', pts: [[0, 0.92], [0.17, 0.78], [0.33, 0.66], [0.4, 0.84], [0.28, 0.95], [0.17, 0.8], [0.19, 0.42], [0.36, 0.12], [0.58, 0.2], [0.78, 0.6], [1, 0.52]] },
    swoosh: { label: 'Swoosh', pts: [[0, 0.82], [0.35, 0.8], [0.7, 0.55], [1, 0.12]] },
    arc: { label: 'Arc', pts: [[0, 0.95], [0.25, 0.25], [0.5, 0.05], [0.75, 0.25], [1, 0.95]] },
    scurve: { label: 'S-curve', pts: [[0, 0.1], [0.55, 0.12], [0.62, 0.5], [0.38, 0.86], [1, 0.9]] },
    double: { label: 'Double loop', pts: [[0, 0.7], [0.15, 0.45], [0.27, 0.72], [0.17, 0.85], [0.12, 0.6], [0.35, 0.3], [0.55, 0.5], [0.66, 0.78], [0.56, 0.86], [0.52, 0.62], [0.75, 0.3], [1, 0.4]] },
    zigzag: { label: 'Zigzag', sharp: true, pts: [[0, 0.25], [0.25, 0.75], [0.5, 0.25], [0.75, 0.75], [1, 0.25]] },
    spiral: { label: 'Spiral', pts: (() => { const o = []; for (let i = 0; i <= 26; i++) { const t = i / 26 * TAU * 1.6, r = 0.08 + 0.42 * i / 26; o.push([0.5 + Math.cos(t) * r, 0.5 + Math.sin(t) * r]); } return o; })() },
    circle: { label: 'Circle', closed: true, pts: (() => { const o = []; for (let i = 0; i < 12; i++) { const t = i / 12 * TAU - Math.PI / 2; o.push([0.5 + Math.cos(t) * 0.5, 0.5 + Math.sin(t) * 0.5]); } return o; })() },
    straight: { label: 'Straight', pts: [[0, 0.5], [1, 0.5]] },
    hook: { label: 'Hook arrow', pts: [[0.02, 0], [0.06, 0.55], [0.3, 0.92], [1, 0.97]] },
    scribble: { label: 'Scribble circle', pts: (() => { const o = []; for (let i = 0; i <= 16; i++) { const t = -1.75 + i / 16 * TAU * 1.12, r = 0.47 + (i === 0 || i === 16 ? 0.05 : 0) - Math.sin(i * 1.7) * 0.012; o.push([0.5 + Math.cos(t) * r, 0.5 + Math.sin(t) * r * 0.98]); } o.unshift([0.5 + Math.cos(-1.9) * 0.62, 0.5 + Math.sin(-1.9) * 0.6]); return o; })() },
    swipe: { label: 'Marker swipe', pts: [[0, 0.62], [0.35, 0.5], [0.7, 0.42], [1, 0.36]] },
    tick: { label: 'Tick', sharp: true, pts: [[0, 0.55], [0.34, 1], [1, 0]] },
    cross: { label: 'Cross-out', sharp: true, pts: [[0, 0.1], [1, 0.9], [0.98, 0.08], [0.02, 0.95]] },
    bend: { label: 'Bend arrow', pts: [[0, 0.85], [0.45, 0.1], [1, 0.3]] },
  };
  const ribbonCache = new LRU(60);
  function ribbonGeom(el) {
    const w = el.width, h = el.height, pre = R.RIBBON_PATHS[el.path] || R.RIBBON_PATHS.wave;
    const P = (el.points && el.points.length >= 2 ? el.points : pre.pts);
    const closed = el.points ? !!el.closed : !!pre.closed, sharp = el.points ? !!el.sharp : !!pre.sharp;
    const key = JSON.stringify(P) + '|' + w + '|' + h + '|' + closed + sharp;
    let g = ribbonCache.get(key);
    if (g) return g;
    const pts = P.map(([u, v]) => [u * w, v * h]);
    const out = [];
    const n = pts.length, segs = closed ? n : n - 1;
    const at = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const steps = sharp ? 1 : Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        if (sharp) { out.push([p1[0], p1[1]]); continue; }
        out.push([0, 1].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(closed ? out[0].slice() : pts[n - 1].slice());
    const cum = [0];
    for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    g = { pts: out, cum, L: cum[cum.length - 1] || 1, closed };
    ribbonCache.set(key, g);
    return g;
  }
  R.ribbonGeom = ribbonGeom;
  // point and direction at distance d along the path
  function pathAt(g, d) {
    const { pts, cum, L } = g;
    if (g.closed) d = ((d % L) + L) % L; else d = clamp(d, 0, L);
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / seg;
    const a = pts[lo], b = pts[hi];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function subPath(g, d0, d1) {
    const p = new Path2D(), { pts, cum } = g;
    const s = pathAt(g, d0);
    p.moveTo(s.x, s.y);
    for (let i = 0; i < pts.length; i++) if (cum[i] > d0 && cum[i] < d1) p.lineTo(pts[i][0], pts[i][1]);
    const e = pathAt(g, d1);
    p.lineTo(e.x, e.y);
    return p;
  }
  function ribbonHead(el) {
    const th = el.thickness || 60;
    return el.line ? Math.max(10, th * 4.2) : th * 1.1;
  }
  function drawRibbon(ctx, el) {
    const g = ribbonGeom(el);
    const th = Math.max(0.5, el.thickness || 60);
    const L = g.L;
    const frac = el.drawFrac == null ? 1 : clamp(el.drawFrac, 0, 1);
    if (frac <= 0.004) return;
    const head = ribbonHead(el);
    const end = L * frac;
    const d0 = el.arrowStart && !g.closed ? head * 0.85 : 0;
    const d1 = el.arrowEnd && !g.closed ? Math.max(d0, end - head * 0.85) : end;
    const path = g.closed && frac >= 1 && !el.arrowEnd ? (() => { const p = new Path2D(); g.pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; })() : subPath(g, d0, d1);
    const col = el.color || '#e9f07a';
    const bw = (el.border && el.border.width) || 0;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = el.ends === 'flat' ? 'butt' : 'round';
    if (el.dash) ctx.setLineDash([th * el.dash, th * el.dash * (el.line ? 1.4 : 0.6)]);
    if (bw > 0 && !el.line) { ctx.lineWidth = th + bw * 2; ctx.strokeStyle = el.border.color || '#111'; ctx.stroke(path); }
    if (!isClear(col)) { ctx.lineWidth = th; ctx.strokeStyle = col; ctx.stroke(path); }
    ctx.setLineDash([]);
    // arrowheads
    const headAt = (d, dir) => {
      const p = pathAt(g, d), a = p.ang + (dir < 0 ? Math.PI : 0);
      const hw = el.line ? head * 0.42 : th * 1.05, hl = head;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.beginPath();
      if (el.line && el.headStyle !== 'solid') {
        ctx.moveTo(-hl, -hw); ctx.lineTo(0, 0); ctx.lineTo(-hl, hw);
        ctx.lineWidth = th; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      } else {
        ctx.moveTo(0, 0); ctx.lineTo(-hl, -hw); ctx.lineTo(-hl, hw); ctx.closePath();
        if (bw > 0 && !el.line) { ctx.lineWidth = bw * 2; ctx.strokeStyle = el.border.color || '#111'; ctx.stroke(); }
        ctx.fillStyle = col; ctx.fill();
      }
      ctx.restore();
    };
    if (el.arrowEnd && !g.closed && frac > 0.02) headAt(end, 1);
    if (el.arrowStart && !g.closed && frac > 0.02) headAt(0, -1);
    // text riding the path
    let txt = el.text || '';
    if (el.uppercase) txt = txt.toUpperCase();
    txt = txt.replace(/\s*\n\s*/g, ' ');
    if (txt.trim() && el.fontSize > 0) {
      const size = el.fontSize;
      const font = fontFor(el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic, size);
      const m = metrics(fontFor(el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic, 100));
      const ls = (el.letterSpacing || 0) * size;
      const unitStr = el.repeat ? txt + (el.sep ?? '   ✦   ') : txt;
      const chars = [...unitStr];
      const meas = measurer(mctx, font, 0);
      const pos = [], cw = [];
      let prefix = '';
      for (let i = 0; i < chars.length; i++) { pos.push(meas.raw(prefix) + ls * i); prefix += chars[i]; }
      const unitW = meas.raw(unitStr) + ls * chars.length;
      for (let i = 0; i < chars.length; i++) cw.push((i < chars.length - 1 ? pos[i + 1] - ls : meas.raw(unitStr)) - pos[i]);
      const flow = el.flowShift || 0;
      let starts;
      if (el.repeat) {
        const first = ((el.offset || 0) * L + flow * unitW) % unitW;
        starts = [];
        for (let s0 = first - unitW; s0 < L + unitW; s0 += unitW) starts.push(s0);
      } else {
        const tw = unitW - ls;
        let s0 = el.align === 'start' ? (el.offset || 0) * L + size * 0.4 : (L - tw) / 2 + (el.offset || 0) * L;
        if (flow) s0 = ((s0 + flow * L) % L + L) % L - (g.closed ? 0 : tw * 0);
        starts = [s0];
      }
      ctx.font = font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = el.textColor || '#111';
      const lift = m.cap * size / 2 + (el.textShift || 0) * size;
      const flip = !!el.flip;
      const lim = end;
      for (const s0 of starts) {
        for (let i = 0; i < chars.length; i++) {
          if (chars[i] === ' ') continue;
          let d = s0 + pos[i] + cw[i] / 2;
          if (g.closed) d = ((d % L) + L) % L;
          else if (d < -cw[i] || d > lim + cw[i] * 0.2) continue;
          if (!g.closed && (d < 0 || d > lim)) continue;
          const pd = flip ? L - d : d;
          const p = pathAt(g, pd);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.ang + (flip ? Math.PI : 0));
          ctx.fillText(chars[i], -cw[i] / 2, lift);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  /* ───────────────────────── camera overlays ───────────────────────── */

  R.CAMERA_STYLES = { iphone: 'Phone camera', camcorder: 'Camcorder', minimal: 'Viewfinder' };
  // a rounded frame whose sides bow outwards, like a wide lens seen on screen
  function barrelPath(w, h, ins, bulge, rad) {
    const p = new Path2D(), x0 = ins, y0 = ins, x1 = w - ins, y1 = h - ins;
    p.moveTo(x0 + rad, y0);
    p.quadraticCurveTo(w / 2, y0 - bulge, x1 - rad, y0);
    p.quadraticCurveTo(x1, y0, x1, y0 + rad);
    p.quadraticCurveTo(x1 + bulge, h / 2, x1, y1 - rad);
    p.quadraticCurveTo(x1, y1, x1 - rad, y1);
    p.quadraticCurveTo(w / 2, y1 + bulge, x0 + rad, y1);
    p.quadraticCurveTo(x0, y1, x0, y1 - rad);
    p.quadraticCurveTo(x0 - bulge, h / 2, x0, y0 + rad);
    p.quadraticCurveTo(x0, y0, x0 + rad, y0);
    p.closePath();
    return p;
  }
  function drawCamera(ctx, el) {
    const w = el.width, h = el.height, u = Math.min(w, h) / 1080;
    const style = el.style || 'iphone';
    const col = el.color || '#ffffff', acc = el.accent || '#ffd60a';
    const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    ctx.save();
    if (el.lens) {
      const m = Math.min(w, h);
      const p = barrelPath(w, h, m * 0.035, m * 0.03, m * 0.11);
      const outer = new Path2D(); outer.rect(-2, -2, w + 4, h + 4); outer.addPath(p);
      ctx.fillStyle = el.lensColor || '#000000'; ctx.fill(outer, 'evenodd');
      // soft inner shading at the lens edge
      ctx.save(); ctx.clip(p);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.hypot(w, h) * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    const thin = Math.max(1, 1.6 * u);
    if (el.grid) {
      ctx.strokeStyle = rgba(col, 0.42); ctx.lineWidth = thin;
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(w * f, 0); ctx.lineTo(w * f, h); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); }
      ctx.stroke();
    }
    const brackets = (x0, y0, x1, y1, len, lw, c) => {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.moveTo(x + sx * len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * len);
      }
      ctx.stroke();
    };
    const font = (wt, px, fam) => fontFor(fam || el.fontFamily || 'Inter', wt, false, px);
    const label = (t, x, y, f, c, align = 'center', ls = 0) => {
      ctx.font = f; ctx.fillStyle = c; ctx.textBaseline = 'middle';
      if (!ls) { ctx.textAlign = align; ctx.fillText(t, x, y); return; }
      ctx.textAlign = 'left';
      const tw = ctx.measureText(t).width + ls * ([...t].length - 1);
      drawLine(ctx, t, align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x, y, ls, 'fill');
    };
    if (style === 'iphone') {
      if (el.brackets !== false) brackets(w * 0.045, h * 0.07, w * 0.955, h * 0.79, 28 * u, 3 * u, rgba(col, 0.85));
      // zoom bubbles
      const zooms = list(el.zooms ?? '0.5, 1×, 2, 5'), za = el.activeZoom ?? 1;
      const zy = h * 0.745, zgap = 88 * u, zx0 = w / 2 - (zooms.length - 1) * zgap / 2;
      zooms.forEach((z, i) => {
        const x = zx0 + i * zgap, on = i === za;
        ctx.fillStyle = 'rgba(20,20,20,0.38)';
        ctx.beginPath(); ctx.arc(x, zy, (on ? 34 : 27) * u, 0, TAU); ctx.fill();
        label(z, x, zy + 1 * u, font(on ? 700 : 600, (on ? 25 : 21) * u), on ? acc : col);
      });
      // mode strip, centred on the active mode
      const modes = list(el.modes ?? 'CINEMATIC, VIDEO, PHOTO, PORTRAIT, PANO'), ma = clamp(el.activeMode ?? 2, 0, Math.max(0, modes.length - 1));
      const mf = font(600, 25 * u), mls = 1.5 * u, gap = 52 * u, my = h * 0.85;
      ctx.font = mf;
      const widths = modes.map(m => ctx.measureText(m).width + mls * ([...m].length - 1));
      let x = w / 2 - widths[ma] / 2;
      for (let i = ma - 1; i >= 0; i--) x -= widths[i] + gap;
      modes.forEach((m, i) => { label(m, x, my, mf, i === ma ? acc : rgba(col, 0.92), 'left', mls); x += widths[i] + gap; });
      // shutter, last-shot thumbnail, flip
      const sy = h * 0.93;
      ctx.lineWidth = 6 * u; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(w / 2, sy, 56 * u, 0, TAU); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(w / 2, sy, 46 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,20,20,0.38)';
      ctx.beginPath(); ctx.arc(w * 0.82, sy, 38 * u, 0, TAU); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3.5 * u; ctx.lineCap = 'round';
      const fx = w * 0.82, r = 15 * u;
      ctx.beginPath(); ctx.arc(fx, sy, r, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, sy, r, Math.PI * 0.05, Math.PI * 0.85); ctx.stroke();
      const tip = (a, dir) => { const px = fx + Math.cos(a) * r, py = sy + Math.sin(a) * r; ctx.beginPath(); ctx.moveTo(px - 6 * u, py - dir * 5 * u); ctx.lineTo(px, py); ctx.lineTo(px + 7 * u * dir, py - 2 * u); ctx.stroke(); };
      tip(Math.PI * 1.85, -1); tip(Math.PI * 0.85, 1);
      if (el.thumb !== false) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill(rrect(new Path2D(), w * 0.18 - 32 * u, sy - 32 * u, 64 * u, 64 * u, 10 * u)); }
    } else if (style === 'camcorder') {
      const vt = (px) => fontFor(el.fontFamily || 'VT323', 400, false, px);
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6 * u * deviceScale(ctx);
      brackets(w * 0.06, h * 0.06, w * 0.94, h * 0.94, 46 * u, 4 * u, rgba(col, 0.9));
      ctx.fillStyle = el.recColor || '#ff3b30';
      ctx.beginPath(); ctx.arc(w * 0.1, h * 0.105, 13 * u, 0, TAU); ctx.fill();
      label(el.rec ?? 'REC', w * 0.1 + 26 * u, h * 0.105, vt(62 * u), col, 'left');
      label(el.timecode ?? '00:12:47', w * 0.9, h * 0.105, vt(62 * u), col, 'right');
      // battery
      const bx = w * 0.9 - 70 * u, by = h * 0.105 + 44 * u;
      ctx.strokeStyle = col; ctx.lineWidth = 3 * u; ctx.strokeRect(bx, by, 60 * u, 28 * u);
      ctx.fillStyle = col; ctx.fillRect(bx + 60 * u, by + 8 * u, 6 * u, 12 * u);
      for (let i = 0; i < 3; i++) ctx.fillRect(bx + (6 + i * 18) * u, by + 6 * u, 13 * u, 16 * u);
      label(el.date ?? 'OCT 10 2026', w * 0.1, h * 0.895, vt(56 * u), col, 'left');
      label(el.mode ?? 'SP ▶', w * 0.9, h * 0.895, vt(56 * u), col, 'right');
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 3 * u;
      ctx.beginPath(); ctx.moveTo(w / 2 - 24 * u, h / 2); ctx.lineTo(w / 2 + 24 * u, h / 2); ctx.moveTo(w / 2, h / 2 - 24 * u); ctx.lineTo(w / 2, h / 2 + 24 * u); ctx.stroke();
      if (el.scanlines) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let y = 0; y < h; y += 6 * u) ctx.fillRect(0, y, w, 2.5 * u);
      }
    } else {
      brackets(w * 0.06, h * 0.06, w * 0.94, h * 0.94, 40 * u, 3 * u, rgba(col, 0.9));
      const fs = Math.min(w, h) * 0.16;
      ctx.strokeStyle = acc; ctx.lineWidth = 2.5 * u;
      ctx.strokeRect(w / 2 - fs / 2, h / 2 - fs / 2, fs, fs);
      ctx.fillStyle = acc;
      for (const [x, y] of [[w / 2, h / 2 - fs / 2], [w / 2, h / 2 + fs / 2], [w / 2 - fs / 2, h / 2], [w / 2 + fs / 2, h / 2]]) ctx.fillRect(x - 1.5 * u - (y === h / 2 ? (x < w / 2 ? 0 : 8 * u) : 0), y - 1.5 * u - (x === w / 2 ? (y < h / 2 ? 0 : 8 * u) : 0), y === h / 2 ? 11 * u : 3 * u, x === w / 2 ? 11 * u : 3 * u);
      label(el.zoomLabel ?? '1×', w / 2, h * 0.88, font(700, 26 * u), acc);
    }
    ctx.restore();
  }

  /* ───────────────────────── element dispatch ───────────────────────── */

  function bleed(el) {
    const lb = el.lblur || {};
    return bleedCore(el) + (lb.gauss || 0) * 2.5 + (lb.motion || 0) * 0.6;
  }
  function bleedCore(el) {
    const m = Math.max(el.width, el.height);
    switch (el.type) {
      case 'text': return ((el.bg && el.bg.padX) || 0) + ((el.stroke && el.stroke.width) || 0) * 2 + (el.echo && el.echo.on ? el.fontSize * 0.4 : 0) + 8;
      case 'sticker': case 'image': return ((el.outline && el.outline.on && el.outline.width) || 0) * 1.6 + 8;
      case 'shape': return (el.strokeWidth || 0) + 6;
      case 'ribbon': return Math.max(el.thickness || 0, (el.fontSize || 0) * 1.2) / 2 + ((el.border && el.border.width) || 0) + ribbonHead(el) * 0.6 + 8;
      case 'camera': return 6;
      case 'nature': return 4;
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
      case 'ribbon': drawRibbon(ctx, el, env); break;
      case 'camera': drawCamera(ctx, el, env); break;
      case 'nature': if (window.StudioNature) window.StudioNature.draw(ctx, el); break;
    }
  }

  /* ───────────────────────── animation ───────────────────────── */

  R.playTime = null;
  R.animDoc = null;
  R.ANIM_LOOPS = {
    none: 'None', wiggle: 'Stop-motion wiggle', float: 'Float', jiggle: 'Jiggle', sway: 'Sway', swing: 'Swing',
    spin: 'Spin', pulse: 'Pulse', bounce: 'Bounce', shake: 'Shake', orbit: 'Orbit', blink: 'Blink', flow: 'Text flow (paths)',
  };
  R.ANIM_ENTER = {
    none: 'None', pop: 'Pop in', fade: 'Fade in', rise: 'Slide up', drop: 'Drop in', left: 'Slide from left',
    right: 'Slide from right', zoom: 'Zoom in', spinIn: 'Spin in', typewriter: 'Typewriter', wipe: 'Wipe', draw: 'Draw on (paths)',
    slam: 'Letters slam in', lettersUp: 'Letters rise', lettersDrop: 'Letters drop', lettersFade: 'Letters fade in', captions: 'Captions (line by line)',
  };
  const LOOP_PERIOD = { float: 3, jiggle: 0.9, sway: 3, swing: 2.2, spin: 6, pulse: 1.6, bounce: 1.2, shake: 0.5, orbit: 4, blink: 1.4, flow: 4 };
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeBack = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const easeBounce = p => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  };
  R.hasAnim = el => !!((el.anim && ((el.anim.loop && el.anim.loop !== 'none') || (el.anim.enter && el.anim.enter !== 'none'))) || R.hasTiming(el) || (el.typing && el.typing.caret !== false && el.typing.blink !== false));
  R.hasTiming = el => !!(el.time && ((el.time.start || 0) > 0 || el.time.end != null || (el.time.cycle && el.time.cycle.count > 1)));
  // cuts: a layer can be shown only for part of the video, or take turns with others
  R.visibleAt = function (el, t) {
    const tm = el.time;
    if (!tm || t == null) return true;
    const s0 = tm.start || 0, e0 = tm.end;
    if (t < s0 - 1e-6) return false;
    if (e0 != null && e0 > s0 && t >= e0) return false;
    const cy = tm.cycle;
    if (cy && cy.count > 1) {
      const k = Math.floor((t - s0) / Math.max(0.02, cy.slot || 0.15));
      return ((k % cy.count) + cy.count) % cy.count === (cy.index || 0) % cy.count;
    }
    return true;
  };
  function animState(el, t, doc) {
    const an = el.anim || {}, D = Math.max(0.5, (doc && doc.anim && doc.anim.duration) || 5);
    const st = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: 1, px: el.width / 2, py: el.height / 2, chars: null, reveal: 1, flow: null, draw: null, letters: null, caption: null, mblur: 0, mang: 0 };
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
          case 'flow': st.flow = (u - phase) * (an.reverse ? -1 : 1); break;
        }
      }
    }
    const enter = an.enter || 'none';
    if (enter !== 'none') {
      // typing runs at a steady characters-per-second rate; other entrances take ~0.6 s
      const nch = enter === 'typewriter' && el.type === 'text' ? [...(el.text || '')].length : 0;
      const dur = nch ? Math.max(0.2, nch / (14 * spd)) : 0.6 / spd, p = clamp((tl - (an.delay || 0)) / dur, 0, 1), e = easeOut(p);
      switch (enter) {
        case 'pop': st.sc *= Math.max(0, easeBack(p)); st.alpha *= Math.min(1, p * 3); break;
        case 'fade': st.alpha *= e; break;
        case 'rise': st.dy += (1 - e) * m * 0.4; st.alpha *= e; st.mblur = (1 - e) * m * 0.25; st.mang = 90; break;
        case 'drop': st.dy -= (1 - easeBounce(p)) * m * 1.2; st.alpha *= Math.min(1, p * 4); st.mblur = (1 - p) * m * 0.4; st.mang = 90; break;
        case 'left': st.dx -= (1 - e) * m * 1.2; st.alpha *= e; st.mblur = (1 - e) * m * 0.6; break;
        case 'right': st.dx += (1 - e) * m * 1.2; st.alpha *= e; st.mblur = (1 - e) * m * 0.6; break;
        case 'slam': case 'lettersUp': case 'lettersDrop': case 'lettersFade':
          if (el.type === 'text') st.letters = { t: tl - (an.delay || 0), spd, style: enter }; else st.alpha *= e;
          break;
        case 'captions': if (el.type === 'text') st.caption = Math.max(0, Math.floor((tl - (an.delay || 0)) / (0.8 / spd))); break;
        case 'zoom': st.sc *= 1.6 - 0.6 * e; st.alpha *= e; break;
        case 'spinIn': st.rot -= (1 - e) * 200; st.sc *= e; break;
        case 'typewriter': if (el.type === 'text') st.chars = Math.floor(p * nch + 1e-6); else st.reveal = p; break;
        case 'wipe': st.reveal = e; break;
        case 'draw': if (el.type === 'ribbon') st.draw = e; else st.reveal = e; break;
      }
    }
    return st;
  }
  R.animState = animState;

  function drawElement(ctx, el, env = {}) {
    const t = 'time' in env ? env.time : R.playTime;
    if (t != null && !R.visibleAt(el, t)) return;
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
      if (A.chars < chars.length) e = Object.assign({}, el, { text: chars.slice(0, A.chars).join(''), autoWidth: false, width: el.width, _full: el.text, _typing: true });
    }
    if (el.typing && el.typing.caret !== false) {
      // solid while typing, blinking once the text is complete
      const on = e._typing || el.typing.blink === false || ((t % 1) + 1) % 1 < 0.55;
      if (e === el) e = Object.assign({}, el);
      e._caretOn = on;
    }
    if (A.flow != null || A.draw != null) e = Object.assign({}, e, A.flow != null ? { flowShift: ((A.flow % 1) + 1) % 1 } : {}, A.draw != null ? { drawFrac: A.draw } : {});
    if (A.letters) e = Object.assign({}, e, { _letters: A.letters });
    if (A.mblur > 1.5) e = Object.assign({}, e, { lblur: Object.assign({}, e.lblur || {}, { motion: ((e.lblur && e.lblur.motion) || 0) + A.mblur, angle: A.mang }) });
    if (A.caption != null && el.type === 'text') {
      // captions: one line of the text at a time, centred in the layer's box
      const lines = String(el.text || '').split('\n').filter(x => x.trim());
      if (lines.length) {
        const line = lines[Math.min(lines.length - 1, A.caption)];
        const one = Object.assign({}, e, { text: line, autoWidth: false, width: el.width });
        one._yShift = (el.height - layoutText(one).boxH) / 2;
        e = one;
      }
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
    const lb = el.lblur && (el.lblur.gauss > 0 || el.lblur.motion > 0) ? el.lblur : null;
    if ((!sh || !sh.on) && !erased && !lb) { drawCore(ctx, el, env); return; }
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
      if (lb && lb.motion > 0) {
        const sm = motionBlurPx(c, lb.motion * s, lb.angle || 0);
        sm.dirty = c.dirty; c = sm;
      }
      // async resources may still be loading; don't cache an incomplete render
      if (!isComplete(el)) c.dirty = true;
      layerCache.set(key, c);
    }
    const ds = deviceScale(ctx);
    ctx.save();
    if (sh && sh.on && sh.style === 'cast') {
      // a shadow lying on the ground behind the subject: its silhouette sheared and squashed from the box's bottom edge
      if (!c.sil || c.sil.src !== key) {
        const sil = canvas(c.width, c.height), sx = sil.getContext('2d');
        sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#000'; sx.fillRect(0, 0, sil.width, sil.height);
        c.sil = sil; c.sil.src = key;
      }
      const hh = el.height, skew = Math.tan(clamp(sh.angle ?? 50, -85, 85) * Math.PI / 180), len = sh.length ?? 0.45;
      ctx.save();
      ctx.transform(1, 0, -skew * len, len, skew * len * hh + (sh.x || 0), hh * (1 - len) + (sh.y || 0));
      ctx.globalAlpha *= clamp(sh.opacity ?? 0.4, 0, 1);
      if ((sh.blur ?? 12) > 0 && 'filter' in ctx) ctx.filter = `blur(${(sh.blur ?? 12) * ds}px)`;
      ctx.drawImage(c.sil, -b, -b, el.width + b * 2, el.height + b * 2);
      ctx.restore();
    } else if (sh && sh.on) {
      ctx.shadowColor = rgba(sh.color || '#000', sh.opacity ?? 0.35);
      ctx.shadowBlur = (sh.blur ?? 20) * ds;
      ctx.shadowOffsetX = (sh.x ?? 0) * ds;
      ctx.shadowOffsetY = (sh.y ?? 12) * ds;
    }
    if (lb && lb.gauss > 0 && 'filter' in ctx) ctx.filter = `blur(${lb.gauss * ds}px)`;
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
      if (bg.scene && window.StudioNature) window.StudioNature.drawScene(ctx, w, h, bg.scene);
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
    if (bg.crumple) drawCrumple(ctx, w, h, bg.crumple, bg.crumpleSeed || 1);
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
    if (o.blinds) {
      // soft diagonal shadows, like sun through window blinds
      const a = o.blinds / 100, period = Math.max(w, h) * 0.34;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(-0.62); ctx.translate(-w, -h);
      for (let x = 0; x < w * 2.4; x += period) {
        const gg = ctx.createLinearGradient(x, 0, x + period, 0);
        gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(0.3, `rgba(0,0,0,${0.32 * a})`); gg.addColorStop(0.5, `rgba(0,0,0,${0.36 * a})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg; ctx.fillRect(x, 0, period, h * 2.4);
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

  /* ───────────────────────── camera ─────────────────────────
     doc.camera moves a virtual camera over the finished layout while the video
     plays: { move, target, zoom, start, dur, rotate, shake, blur, cut }.
     It never changes the layout itself, only how the frame is viewed. */

  R.CAMERA_MOVES = {
    none: 'Still', pushin: 'Slow push-in', pullback: 'Pull-back reveal', whip: 'Whip zoom', snap: 'Snap zoom', crash: 'Crash zoom in & out',
    follow: 'Follow the typing', cuts: 'Hard cuts (close → wide)', drift: 'Handheld drift', pan: 'Pan across', tilt: 'Dutch tilt', jolt: 'Jolt cuts', spiral: 'Spiral in',
  };
  const eio = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const eoExpo = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
  const eioExpo = p => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
  function findEl(doc, key) { return key ? (doc.elements || []).find(e => e.id === key || e.key === key) : null; }
  function elCentre(el) {
    const a = (el.rotation || 0) * Math.PI / 180, w = el.width / 2, h = el.height / 2;
    return { x: el.x + w * Math.cos(a) - h * Math.sin(a), y: el.y + w * Math.sin(a) + h * Math.cos(a) };
  }
  // where the typing caret sits (in canvas coordinates) at time t
  R.caretAt = function (el, t, doc) {
    let e = el;
    if (t != null && el.anim && el.anim.enter === 'typewriter') {
      const A = animState(el, t, doc);
      const chars = [...(el.text || '')];
      if (A.chars != null && A.chars < chars.length) e = Object.assign({}, el, { text: chars.slice(0, A.chars).join(''), autoWidth: false, width: el.width, _full: el.text });
    }
    const L = layoutText(e), T = typingBoxes(e, L);
    const lx = T.caret.x, ly = T.caret.base - L.cap * 0.5;
    const a = (el.rotation || 0) * Math.PI / 180;
    return { x: el.x + lx * Math.cos(a) - ly * Math.sin(a), y: el.y + lx * Math.sin(a) + ly * Math.cos(a) };
  };
  function focusAt(doc, c, t) {
    const el = findEl(doc, c.target);
    if (!el) return null;
    if (c.move === 'follow' && el.type === 'text') {
      // ease toward the caret instead of locking onto every keystroke
      let x = 0, y = 0, wsum = 0;
      for (let k = 0; k < 6; k++) { const p = R.caretAt(el, Math.max(0, t - k * 0.05), doc), w = 6 - k; x += p.x * w; y += p.y * w; wsum += w; }
      return { x: x / wsum, y: y / wsum };
    }
    return elCentre(el);
  }
  function camAt(doc, t) {
    const c = doc.camera;
    if (!c || !c.move || c.move === 'none' || t == null) return null;
    const W = doc.width, H = doc.height, C = { x: W / 2, y: H / 2 };
    const D = Math.max(0.5, (doc.anim && doc.anim.duration) || 5);
    const T0 = focusAt(doc, c, t) || C;
    const Z = Math.max(1, c.zoom || 2), s0 = c.start || 0, d = Math.max(0.05, c.dur || 1.5), rot = c.rotate || 0;
    const p = clamp((t - s0) / d, 0, 1);
    const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    let f = C, z = 1, r = 0;
    switch (c.move) {
      case 'pushin': { const k = eio(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'pullback': { const k = 1 - Math.pow(1 - p, 2.6); f = mix(T0, C, k); z = Z + (1 - Z) * k; r = rot * (1 - k); break; }
      case 'whip': { const k = eioExpo(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * Math.sin(Math.PI * p) + rot * 0.15 * k; break; }
      case 'snap': { const q = clamp((t - s0) / 0.14, 0, 1), k = q <= 0 ? 0 : easeBack(q); f = mix(C, T0, Math.min(1, k)); z = (1 + (Z - 1) * k) * (1 + 0.06 * p); r = rot * Math.min(1, k); break; }
      case 'crash': { const k = p < 0.5 ? eioExpo(p * 2) : 1 - eioExpo((p - 0.5) * 2); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'follow': { const k = eio(clamp((t - s0) / Math.min(d, 0.45), 0, 1)); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = rot * k; break; }
      case 'drift': { const k = t / D; z = 1 + (Z - 1) * k; f = { x: C.x + (T0.x - C.x) * k + Math.sin(t * 0.9) * W * 0.01, y: C.y + (T0.y - C.y) * k + Math.cos(t * 0.7) * H * 0.008 }; r = Math.sin(t * 0.6) * (rot || 1.5); break; }
      case 'pan': { const k = eio(p); z = Z; f = { x: W / 2 / z + (W - W / z) * k, y: T0.y }; r = rot; break; }
      case 'tilt': { const k = eio(p); z = Z; f = mix(C, T0, 0.5); r = -(rot || 8) + 2 * (rot || 8) * k; break; }
      case 'cuts': {
        // three hard cuts from a tight close-up out to the full frame, each shot creeping in
        const shot = p >= 1 ? 3 : Math.floor(p * 3), q = p >= 1 ? clamp((t - s0 - d) / Math.max(0.5, D - s0 - d), 0, 1) : (p * 3) % 1;
        const zs = [Z, 1 + (Z - 1) * 0.45, 1.12, 1];
        f = shot === 0 ? T0 : shot === 1 ? mix(T0, C, 0.35) : shot === 2 ? mix(T0, C, 0.8) : C;
        z = zs[shot] * (1 + 0.05 * q); r = shot === 1 ? rot * 0.6 : shot === 0 ? -rot * 0.4 : 0;
        break;
      }
      case 'spiral': { const k = eio(p); f = mix(C, T0, k); z = 1 + (Z - 1) * k; r = (rot || 25) * (1 - k); break; }
      case 'jolt': {
        const slot = Math.max(0.05, c.cut || 0.15), n = Math.floor(t / slot), rr = rng(n * 7919 + 101);
        z = 1 + (Z - 1) * (0.35 + rr() * 0.65); r = (rr() - 0.5) * 2 * (rot || 3);
        const wd = c.wander ?? 1;
        f = { x: T0.x + (rr() - 0.5) * W * 0.05 * wd, y: T0.y + (rr() - 0.5) * H * 0.04 * wd };
        break;
      }
    }
    if (c.shake) {
      const a = c.shake;
      f = { x: f.x + (Math.sin(t * 7.3) + 0.6 * Math.sin(t * 13.1 + 1.7)) * W * 0.004 * a / z, y: f.y + (Math.cos(t * 6.1) + 0.6 * Math.sin(t * 11.3 + 0.4)) * H * 0.004 * a / z };
      r += Math.sin(t * 5.3 + 0.8) * 0.5 * a;
    }
    // never show past the canvas edge: zoom enough to cover the rotation, keep the view inside
    const ar = Math.abs(r) * Math.PI / 180, asp = Math.max(W / H, H / W);
    z = Math.max(z, Math.cos(ar) + Math.sin(ar) * asp);
    const hw = W / 2 / z, hh = H / 2 / z;
    f = { x: clamp(f.x, hw, W - hw), y: clamp(f.y, hh, H - hh) };
    return { fx: f.x, fy: f.y, z, r };
  }
  R.camAt = camAt;
  R.hasCamera = doc => !!(doc && doc.camera && doc.camera.move && doc.camera.move !== 'none');
  function camMatrix(doc, cam) {
    return new DOMMatrix().translate(doc.width / 2, doc.height / 2).rotate(cam.r).scale(cam.z).translate(-cam.fx, -cam.fy);
  }

  /* ───────────────────────── whole-document render ───────────────────────── */

  function fontsOf(doc) {
    const out = [];
    for (const el of doc.elements || []) {
      if (el.type === 'text' || el.type === 'checklist') out.push([el.fontFamily, el.fontWeight || 400, !!el.italic]);
      if (el.type === 'calendar') { out.push([el.titleFont || 'Instrument Serif', el.titleWeight || 400, false], [el.bodyFont || 'Instrument Sans', el.bodyWeight || 500, false], [el.bodyFont || 'Instrument Sans', 600, false]); }
      if (el.type === 'ribbon' && el.text) out.push([el.fontFamily || 'Space Mono', el.fontWeight || 700, !!el.italic]);
      if (el.type === 'camera') { if (el.style === 'camcorder') out.push([el.fontFamily || 'VT323', 400, false]); else out.push([el.fontFamily || 'Inter', 600, false], [el.fontFamily || 'Inter', 700, false]); }
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

  let blurBuf = null;
  R.renderDoc = function (doc, opts = {}) {
    const scale = opts.scale || 1;
    const c = opts.canvas || canvas(doc.width * scale, doc.height * scale);
    const ctx = c.getContext('2d');
    if (opts.canvas) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); }
    const t = opts.time ?? null;
    const cam = t != null ? camAt(doc, t) : null;
    const sx = c.width / doc.width, sy = c.height / doc.height;
    ctx.save();
    ctx.scale(sx, sy);
    if (cam) ctx.transform(...(m => [m.a, m.b, m.c, m.d, m.e, m.f])(camMatrix(doc, cam)));
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
    ctx.restore();
    // motion blur: smear the frame along the camera's own movement during a short shutter
    const blur = cam && doc.camera.blur > 0 ? doc.camera.blur : 0;
    if (blur) {
      const sh = blur * 0.045;
      const prev = camAt(doc, Math.max(0, t - sh));
      if (prev) {
        const M = camMatrix(doc, cam), Mi = M.inverse();
        const S0 = new DOMMatrix().scale(sx, sy), S0i = S0.inverse();
        const rel = k => { const ck = camAt(doc, Math.max(0, t - sh * k)); return S0.multiply(camMatrix(doc, ck)).multiply(Mi).multiply(S0i); };
        const R1 = rel(1);
        const pts = [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height], [c.width / 2, c.height / 2]];
        const disp = Math.max(...pts.map(([x, y]) => { const q = R1.transformPoint(new DOMPoint(x, y)); return Math.hypot(q.x - x, q.y - y); }));
        if (disp > 1.5) {
          const N = clamp(Math.ceil(disp / 3), 2, 14);
          if (!blurBuf || blurBuf.width !== c.width || blurBuf.height !== c.height) blurBuf = canvas(c.width, c.height);
          const bx = blurBuf.getContext('2d');
          bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalAlpha = 1; bx.clearRect(0, 0, c.width, c.height);
          bx.drawImage(c, 0, 0);
          for (let i = 1; i <= N; i++) {
            bx.setTransform(rel(i / N)); bx.globalAlpha = 1 / (i + 1);
            bx.drawImage(c, 0, 0);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
          ctx.drawImage(blurBuf, 0, 0);
        }
      }
    }
    ctx.save();
    ctx.scale(sx, sy);
    drawOverlay(ctx, doc);
    ctx.restore();
    return c;
  };

  window.StudioRender = R;
})();
