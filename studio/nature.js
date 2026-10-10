/* Studio nature painters — "photoreal-ish" garden elements and scenes.
 * Defines window.StudioNature = { KINDS, draw(ctx, el), SCENES, drawScene(ctx, w, h, scene) }.
 * Pure canvas 2D, deterministic for a given seed, every element rendered once into an
 * offscreen canvas (small LRU) at the resolution the current transform needs.
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ------------------------------------------------------------ PRNG / noise */
  function rng(seed) {
    let a = (seed >>> 0) ^ 0x2f6b9e1d;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // integer hash -> [0,1)
  function hash3(x, y, s) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const grids = new Map();
  // 256x256 lattice of random values in [-1,1] (value noise, wraps at 256)
  function grid(seed) {
    let g = grids.get(seed);
    if (g) return g;
    const r = rng(seed * 2654435761 + 977);
    g = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) g[i] = r() * 2 - 1;
    if (grids.size > 64) grids.delete(grids.keys().next().value);
    grids.set(seed, g);
    return g;
  }
  function vn(g, x, y) {
    const xf = Math.floor(x), yf = Math.floor(y);
    let fx = x - xf, fy = y - yf;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = xf & 255, y0 = (yf & 255) << 8, x1 = (x0 + 1) & 255, y1 = ((yf + 1) & 255) << 8;
    const a = g[y0 | x0], b = g[y0 | x1], c = g[y1 | x0], d = g[y1 | x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(g, x, y, oct) {
    let s = 0, amp = 0.5, n = 0, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * vn(g, x * f + i * 37.1, y * f + i * 17.9); n += amp; amp *= 0.5; f *= 2.07; }
    return s / n;
  }

  /* ------------------------------------------------------------------ colour */
  const pcache = new Map();
  let cctx = null;
  function parseColor(s) {
    if (Array.isArray(s)) return s;
    if (typeof s !== 'string' || !s) return [0, 0, 0, 1];
    let c = pcache.get(s);
    if (c) return c;
    const str = s.trim();
    let m;
    if ((m = /^#([0-9a-f]{3,8})$/i.exec(str))) {
      let h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((q) => q + q).join('');
      c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    } else if ((m = /^rgba?\(([^)]+)\)$/i.exec(str))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      const num = (v, sc) => (/%$/.test(v) ? (parseFloat(v) / 100) * sc : parseFloat(v));
      c = [num(p[0], 255), num(p[1], 255), num(p[2], 255), p.length > 3 ? num(p[3], 1) : 1];
    } else {
      try {
        if (!cctx) cctx = mk(1, 1).getContext('2d');
        cctx.fillStyle = '#000';
        cctx.fillStyle = str;
        const n = cctx.fillStyle;
        c = n === str ? [0, 0, 0, 1] : parseColor(n);
      } catch (e) { c = [0, 0, 0, 1]; }
    }
    if (c.some((v) => !isFinite(v))) c = [0, 0, 0, 1];
    if (pcache.size > 500) pcache.clear();
    pcache.set(s, c);
    return c;
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a.length > 3 ? (a[3] + ((b[3] == null ? 1 : b[3]) - a[3]) * t) : 1];
  const mul = (a, f) => [a[0] * f, a[1] * f, a[2] * f, a[3]];
  const css = (c, al) => `rgba(${clamp(Math.round(c[0]), 0, 255)},${clamp(Math.round(c[1]), 0, 255)},${clamp(Math.round(c[2]), 0, 255)},${+(al == null ? (c[3] == null ? 1 : c[3]) : al).toFixed(3)})`;
  const WHITE = [255, 255, 255, 1], BLACK = [0, 0, 0, 1];

  /* ----------------------------------------------------------------- canvas */
  function mk(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    return new OffscreenCanvas(w, h);
  }

  // bucketed Path2D batches: one fill/stroke per colour
  function Buckets() { this.m = new Map(); }
  Buckets.prototype.get = function (key) { let p = this.m.get(key); if (!p) { p = new Path2D(); this.m.set(key, p); } return p; };

  /* ---------------------------------------------------------------- LRU */
  const LRU_MAX = 24, LRU_PX = 40e6;
  const lru = new Map();
  let lruPx = 0;
  function lruGet(key) {
    const v = lru.get(key);
    if (v) { lru.delete(key); lru.set(key, v); }
    return v;
  }
  function lruSet(key, cv) {
    lru.set(key, cv);
    lruPx += cv.width * cv.height;
    while (lru.size > LRU_MAX || (lruPx > LRU_PX && lru.size > 1)) {
      const k0 = lru.keys().next().value, c0 = lru.get(k0);
      lru.delete(k0);
      lruPx -= c0.width * c0.height;
    }
  }

  /* ================================================================ HILL */
  function hillProfile(profile, r) {
    const p = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];
    const und = (x, a) => a * (0.6 * Math.sin(x * 5.1 + p[0]) + 0.3 * Math.sin(x * 11.3 + p[1]) + 0.1 * Math.sin(x * 27.7 + p[2]));
    const sq = (v) => v * v;
    switch (profile) {
      case 'right': return [{ f: (x) => 0.015 + 0.5 * Math.pow(1 - x, 1.75) + und(x, 0.012), haze: 0 }];
      case 'dome': return [{ f: (x) => 0.02 + 0.44 * sq((x - 0.5 - (p[3] - 3.14) * 0.015) / 0.6) + und(x, 0.01), haze: 0 }];
      case 'flat': return [{ f: (x) => 0.04 + und(x, 0.018) + 0.012 * Math.sin(x * 2.2 + p[3]), haze: 0 }];
      case 'double': return [
        { f: (x) => 0.015 + 0.34 * sq((x - 0.68) / 0.7) + und(x, 0.01), haze: 0.42 },
        { f: (x) => Math.min(0.92, 0.3 + 0.5 * sq((x - 0.16) / 0.95) + und(x + 2.1, 0.012)), haze: 0 },
      ];
      default: return [{ f: (x) => 0.015 + 0.5 * Math.pow(x, 1.75) + und(x, 0.012), haze: 0 }];
    }
  }

  function paintHill(W, H, o) {
    const { k, seed, density, params, hd } = o;
    const r = rng(seed * 9301 + 17);
    const layers = hillProfile(params.profile, r);
    const Lb = clamp(hd * 0.0135, 3, 9.5); // design-px blade length in the foreground
    const margin = Math.max(2, Lb * 0.45 * k + 2);
    const tops = layers.map((L) => {
      const a = new Float32Array(W);
      for (let x = 0; x < W; x++) a[x] = margin + Math.max(0, L.f((x + 0.5) / W)) * (H - margin);
      return a;
    });
    let cv = null, ctx = null;
    for (let i = 0; i < layers.length; i++) {
      const lim = new Float32Array(W).fill(H + 1);
      if (i + 1 < layers.length) for (let x = 0; x < W; x++) lim[x] = tops[i + 1][x] + 4 + Lb * k;
      const lc = hillLayer(W, H, k, tops[i], lim, o.colors, seed + i * 31, density, layers[i].haze, Lb);
      if (!cv) { cv = lc; ctx = cv.getContext('2d'); } else ctx.drawImage(lc, 0, 0);
    }
    return cv;
  }

  function hillLayer(W, H, k, top, lim, C, seed, density, haze, Lb) {
    let c0 = C[0], c1 = C[1], c2 = C[2], c3 = C[3];
    if (haze) {
      const hz = mix(mix(c0, [208, 228, 226], 0.6), WHITE, 0.1);
      c0 = mix(c0, hz, haze); c1 = mix(c1, hz, haze * 0.85); c2 = mix(c2, hz, haze * 0.7); c3 = mix(c3, hz, haze * 0.5);
    }
    const deep = [c2[0] * 0.48, c2[1] * 0.56, c2[2] * 0.46];
    const lut = new Float32Array(256 * 3);
    const farEnd = mix(c0, c1, 0.15), nearEnd = mix(c1, c2, 0.38);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const c = t < 0.42 ? mix(farEnd, c1, sstep(0, 0.42, t)) : mix(c1, nearEnd, (t - 0.42) / 0.58);
      lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
    }
    const slope = new Float32Array(W);
    for (let x = 0; x < W; x++) slope[x] = (top[Math.min(W - 1, x + 2)] - top[Math.max(0, x - 2)]) / (Math.min(W - 1, x + 2) - Math.max(0, x - 2) || 1);

    const cv = mk(W, H), ctx = cv.getContext('2d');
    const img = ctx.createImageData(W, H), D = img.data;
    const g1 = grid(seed), g2 = grid(seed + 101), g3 = grid(seed + 202);
    const Wd = W / k, ik = 1 / k, contrast = 1 - haze * 0.55;
    const hs = seed * 7 + 3;
    const Vs = 1.25 * H * ik; // ground-plane depth: v = ∫ dt / sp², foreshortened toward the crest
    const moAt = (u, v) => vn(g3, u * 0.0044 + v * 0.0055, v * 0.0072 - u * 0.0033) * 0.5 +
      vn(g3, u * 0.0098 - v * 0.0208 + 40.3, v * 0.0155 + u * 0.0128 + 11.7) * 0.32;
    // low-frequency terms (mottling + mowing bands) on a coarse 4px lattice, bilinearly interpolated
    const CS = 4, cw = Math.ceil(W / CS) + 2, ch = Math.ceil(H / CS) + 2;
    const LOW = new Float32Array(cw * ch);
    for (let gy = 0; gy < ch; gy++) {
      const y = gy * CS;
      for (let gx = 0; gx < cw; gx++) {
        const x = Math.min(W - 1, gx * CS), tp = top[x];
        const d = Math.max(0, y + 0.5 - tp);
        const t = clamp01(0.62 * d / (H - tp + 1) + 0.38 * Math.min(1, y / H));
        const sp = 0.2 + 0.8 * t;
        const u = (x * ik - Wd * 0.5) / sp, v = Vs * (5 - 1 / sp);
        const mo = moAt(u, v) + vn(g2, u * 0.04 + v * 0.048 + 7.1, v * 0.064 - u * 0.03 + 3.3) * 0.18;
        const mw = Math.sin((u * 0.9 + v * 0.45) * 0.028 + mo * 2.6);
        LOW[gy * cw + gx] = mo * 0.3 + mw * 0.04 * t;
      }
    }
    const iCS = 1 / CS;
    for (let y = 0; y < H; y++) {
      const absy = y / H;
      const gyf = y * iCS, gy0 = gyf | 0, fy = gyf - gy0, r0 = gy0 * cw, r1 = r0 + cw;
      let i = y * W * 4;
      let hsx = (Math.imul(y + 1, 0x9e3779b1) ^ hs) | 1;
      for (let x = 0; x < W; x++, i += 4) {
        const tp = top[x];
        const d = y + 0.5 - tp;
        if (d < -0.5 || y > lim[x]) continue;
        const cov = d >= 0.5 ? 1 : d + 0.5;
        let t = 0.62 * d / (H - tp + 1) + 0.38 * absy;
        if (t > 1) t = 1; else if (t < 0) t = 0;
        const sp = 0.2 + 0.8 * t;
        const dd = (d > 0 ? d : 0) * ik;
        const u = (x * ik - Wd * 0.5) / sp;
        const v = Vs * (5 - 1 / sp);
        // fine vertical blade streaks + finer speckle
        hsx ^= hsx << 13; hsx ^= hsx >>> 17; hsx ^= hsx << 5;
        const st = vn(g1, u * 0.85, v * 0.17) * 0.62 + ((hsx >>> 0) / 4294967296 - 0.5) * 0.7;
        const gxf = x * iCS, gx0 = gxf | 0, fx = gxf - gx0;
        const l0 = LOW[r0 + gx0] + (LOW[r0 + gx0 + 1] - LOW[r0 + gx0]) * fx;
        const l1 = LOW[r1 + gx0] + (LOW[r1 + gx0 + 1] - LOW[r1 + gx0]) * fx;
        const cr = dd < 25 ? Math.exp(-dd * 0.22) : 0;
        hsx ^= hsx << 13; hsx ^= hsx >>> 17; hsx ^= hsx << 5;
        const gr = (hsx >>> 0) / 4294967296 - 0.5;
        let V = (l0 + (l1 - l0) * fy + st * (0.18 + 0.3 * t) + gr * 0.12 + slope[x] * -0.1 * (1 - t)) * contrast + cr * 0.32;
        const ti = (t * 255) | 0;
        let R = lut[ti * 3], G = lut[ti * 3 + 1], B = lut[ti * 3 + 2];
        if (V >= 0) {
          const a = V > 1 ? 1 : V;
          R += (c3[0] - R) * a; G += (c3[1] - G) * a; B += (c3[2] - B) * a;
        } else {
          let a = -V * 1.7;
          if (a <= 1) { R += (c2[0] - R) * a; G += (c2[1] - G) * a; B += (c2[2] - B) * a; }
          else { a = a - 1 > 1 ? 1 : a - 1; R = c2[0] + (deep[0] - c2[0]) * a; G = c2[1] + (deep[1] - c2[1]) * a; B = c2[2] + (deep[2] - c2[2]) * a; }
        }
        D[i] = R; D[i + 1] = G; D[i + 2] = B; D[i + 3] = cov * 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    /* ---- blades, batched per (width band, depth band, tone) */
    const r = rng(seed * 131 + 7);
    const bk = new Buckets();
    const toneOf = (t, tone) => {
      const ti = (clamp01(t) * 255) | 0;
      const b = [lut[ti * 3], lut[ti * 3 + 1], lut[ti * 3 + 2]];
      switch (tone) {
        case 0: return mix(b, deep, 0.72);
        case 1: return mix(b, c2, 0.6);
        case 2: return mix(b, c1, 0.4);
        case 3: return mix(b, c3, 0.5);
        default: return mix(mix(b, c3, 0.92), WHITE, 0.06);
      }
    };
    const cellW = 24, cellH = 6;
    const cover = 0.46 * density;
    for (let cy = 0; cy < H; cy += cellH) {
      for (let cx = 0; cx < W; cx += cellW) {
        const mx = Math.min(W - 1, cx + (cellW >> 1));
        const tp = top[mx], yc = cy + cellH / 2;
        if (yc < tp - 1 || yc > lim[mx]) continue;
        const t = clamp01(0.62 * (yc - tp) / (H - tp + 1) + 0.38 * yc / H);
        const sp = 0.2 + 0.8 * t;
        const lenP = Lb * sp * k;
        if (lenP < 1.7) continue;
        const wP = Math.max(0.55, lenP * 0.12);
        const wb = clamp(Math.round(Math.log(wP / 0.55) / Math.log(1.3)), 0, 9);
        const lw = 0.55 * Math.pow(1.3, wb);
        const tq = Math.round(t * 5);
        const u = (mx / k - W / k * 0.5) / sp, v = Vs * (5 - 1 / sp);
        const mo = moAt(u, v);
        const lean = vn(g2, mx / k * 0.012, yc / k * 0.02) * 0.25;
        let n = (cellW * cellH * cover) / (lenP * wP);
        n = Math.min(70, Math.floor(n) + (r() < n % 1 ? 1 : 0));
        for (let j = 0; j < n; j++) {
          const x0 = cx + r() * cellW, y0 = cy + r() * cellH;
          const xi = Math.min(W - 1, x0 | 0);
          if (y0 < top[xi] + 0.8 || y0 > lim[xi]) continue;
          const tone = clamp(Math.floor(r() * 4.15 + mo * 4 + 0.05), 0, 4);
          const a = -Math.PI / 2 + lean + (r() - 0.5) * 0.7;
          const len = lenP * (0.5 + r() * 0.8);
          const p = bk.get(wb * 1000 + tq * 10 + tone);
          p.moveTo(x0, y0);
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          if (len < 7) p.lineTo(x1, y1);
          else p.quadraticCurveTo(x0 + Math.cos(a) * len * 0.55, y0 + Math.sin(a) * len * 0.55, x1 + (r() - 0.5) * lw, y1);
        }
      }
    }
    // fringe of tiny blades breaking the silhouette
    const nf = Math.round((W / k) * 1.3 * density);
    for (let j = 0; j < nf; j++) {
      const x0 = r() * W, xi = Math.min(W - 1, x0 | 0);
      if (lim[xi] < top[xi]) continue;
      const t = clamp01(0.38 * top[xi] / H);
      const sp = 0.2 + 0.8 * t;
      const len = Math.max(1.6, Lb * sp * 0.55 * k) * (0.45 + r() * 0.9);
      const y0 = top[xi] + r() * len * 0.5 + 0.6;
      const wb = clamp(Math.round(Math.log(Math.max(0.55, len * 0.16) / 0.55) / Math.log(1.3)), 0, 9);
      const tone = r() < 0.35 ? 2 : r() < 0.6 ? 3 : r() < 0.85 ? 4 : 1;
      const a = -Math.PI / 2 + (r() - 0.5) * 0.9;
      const p = bk.get(wb * 1000 + 0 * 10 + tone);
      p.moveTo(x0, y0);
      p.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
    }
    ctx.lineCap = 'round';
    const keys = [...bk.m.keys()].sort((a, b) => (a % 10) - (b % 10) || a - b);
    for (const key of keys) {
      const tone = key % 10, tq = Math.floor(key / 10) % 100, wb = Math.floor(key / 1000);
      ctx.strokeStyle = css(toneOf(tq / 5, tone), tone === 0 ? 0.8 : 0.88);
      ctx.lineWidth = 0.55 * Math.pow(1.3, wb);
      ctx.stroke(bk.m.get(key));
    }
    return cv;
  }

  /* ============================================================== FLOWERS */
  function paintFlowers(W, H, o) {
    const { k, seed, density, params, hd, wd } = o;
    const [cb, cs, cl, cd, cc] = o.colors;
    const r = rng(seed * 7717 + 3);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const bloom = params.bloom || 'cluster';
    const spike = bloom === 'spike';
    const cx = W / 2, base = H * 0.86, hw = W * 0.47;
    const mh = spike ? H * 0.5 : H * 0.74;
    const ph = [r() * TAU, r() * TAU, r() * TAU];
    const topAt = (xn) => base - mh * Math.pow(Math.max(0, 1 - xn * xn), 0.55) *
      (0.84 + 0.1 * Math.sin(xn * 6.3 + ph[0]) + 0.06 * Math.sin(xn * 15.1 + ph[1]));
    const tri = () => (r() + r() + r()) / 1.5 - 1;
    const deep = mix(mul(cd, 0.55), BLACK, 0.1);

    // contact shadow
    ctx.save();
    ctx.translate(cx, base + H * 0.03);
    ctx.scale(W * 0.5, H * 0.13);
    let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(12,28,8,0.5)'); g.addColorStop(0.55, 'rgba(12,28,8,0.28)'); g.addColorStop(1, 'rgba(12,28,8,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();

    const ls = clamp(Math.min(hd * 0.065, wd * 0.028), 2.2, 9) * k; // leaf length px
    const leafTones = spike
      ? [mix(deep, cd, 0.5), cd, mix(cd, cl, 0.5), cl, mix(cl, WHITE, 0.2)]
      : [mix(deep, cd, 0.4), cd, mix(cd, cl, 0.45), cl, mix(mix(cl, [230, 240, 140], 0.25), WHITE, 0.08)];
    const leaves = new Buckets();
    const leaf = (bk, x, y, len, rot, tone, wr) => {
      const rx = len * 0.5, ry = rx * (wr || 0.55);
      const p = bk.get(tone);
      p.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
      p.ellipse(x, y, rx, ry, rot, 0, TAU);
    };
    const area = W * mh * 1.25;
    const nLeaves = spike ? 0 : Math.round((area / (ls * ls * 0.42)) * density);
    const deepP = new Path2D();
    for (let i = 0; i < nLeaves; i++) {
      const xn = tri();
      if (Math.abs(xn) > 0.98) continue;
      const yt = topAt(xn);
      const dy = Math.pow(r(), 0.85);
      const y = yt + ls * 0.3 + dy * (base - yt);
      const x = cx + xn * hw + (r() - 0.5) * ls;
      const lit = (1 - dy) * 0.65 + r() * 0.5 - xn * 0.12 - 0.05;
      const tone = clamp(Math.floor(lit * 4.6), 0, 4);
      const l = ls * (0.65 + r() * 0.6);
      leaf(leaves, x, y, l, spike ? -Math.PI / 2 + (r() - 0.5) * 1.6 : r() * TAU, tone, spike ? 0.22 : 0.55);
      if (i % 2 === 0 && dy > 0.12) { const rr = ls * (0.55 + r() * 0.3); deepP.moveTo(x + rr, y); deepP.ellipse(x, y, rr, rr * 0.8, 0, 0, TAU); }
    }
    ctx.fillStyle = css(deep);
    ctx.fill(deepP);
    const fillBk = (bk, tones, alpha) => {
      for (let t = 0; t < tones.length; t++) { const p = bk.m.get(t); if (!p) continue; ctx.fillStyle = css(tones[t], alpha); ctx.fill(p); }
    };
    fillBk(leaves, leafTones, 1);

    if (spike) { paintSpikes(ctx, r, W, H, k, o, cx, hw, base, topAt, tri); return cv; }

    // ---- blooms: clusters of small 5-petal florets (geranium / verbena look)
    const hr = clamp(Math.min(hd * 0.055, wd * 0.022), 2.4, 10) * k; // head radius px
    const daisy = bloom === 'daisy';
    const nHeads = Math.round(((W * mh * 0.5) / (Math.PI * hr * hr)) * density * (daisy ? 0.75 : 0.95));
    const heads = [];
    for (let i = 0; i < nHeads; i++) {
      const xn = tri();
      if (Math.abs(xn) > 0.96 || r() < Math.pow(Math.abs(xn), 2.5) * 0.8) continue;
      const yt = topAt(xn);
      const y = yt + hr * 0.5 + Math.pow(r(), 1.4) * (base - yt) * 0.62;
      heads.push({ x: cx + xn * hw * 0.98, y, rr: hr * (0.75 + r() * 0.45), v: r() });
    }
    heads.sort((a, b) => a.y - b.y);
    const half = Math.ceil(heads.length * 0.55);
    const groups = [heads.slice(0, half), heads.slice(half)];
    const bloomTones = [mix(cb, cs, 0.22), cb, mix(cb, mix(cb, WHITE, 0.5), 0.35)];
    const hiC = mix(cb, WHITE, 0.45);
    for (let gi = 0; gi < 2; gi++) {
      const shade = new Path2D(), hil = new Path2D(), cen = new Path2D();
      const mains = new Buckets();
      for (const hd0 of groups[gi]) {
        const nf = daisy ? 1 : 6 + Math.floor(r() * 5);
        for (let f = 0; f < nf; f++) {
          const ang = r() * TAU, rad = daisy ? 0 : hd0.rr * (0.12 + 0.62 * Math.sqrt(r()));
          const fx = hd0.x + Math.cos(ang) * rad, fy = hd0.y + Math.sin(ang) * rad * 0.82;
          const fr = daisy ? hd0.rr * 0.95 : hd0.rr * (0.3 + r() * 0.1);
          const pr = daisy ? fr * 0.22 : fr * 0.52;
          const rot = r() * TAU;
          const upper = (fy - hd0.y) / hd0.rr - (fx - hd0.x) / hd0.rr * 0.5; // <0 = upper-left of head
          const tone = clamp(Math.round(1 + (hd0.v - 0.5) * 1.2 - upper * 0.7), 0, 2);
          const np = daisy ? 11 : 5;
          for (let q = 0; q < np; q++) {
            const a = rot + (q * TAU) / np;
            const px = fx + Math.cos(a) * fr * (daisy ? 0.62 : 0.5), py = fy + Math.sin(a) * fr * (daisy ? 0.5 : 0.44);
            if (daisy) {
              shade.moveTo(px + pr * 0.5, py + pr * 0.5); shade.ellipse(px + pr * 0.3, py + pr * 0.45, fr * 0.36, pr * 0.62, a, 0, TAU);
              const m = mains.get(tone);
              m.moveTo(px + fr * 0.36, py); m.ellipse(px, py, fr * 0.36, pr * 0.55, a, 0, TAU);
            } else {
              shade.moveTo(px + pr * 1.3, py + pr * 0.4); shade.arc(px + pr * 0.28, py + pr * 0.4, pr * 1.02, 0, TAU);
              const m = mains.get(tone);
              m.moveTo(px + pr, py); m.arc(px, py, pr, 0, TAU);
              if (upper < -0.15 && q % 2 === 0) { hil.moveTo(px - pr * 0.25 + pr * 0.5, py - pr * 0.3); hil.arc(px - pr * 0.25, py - pr * 0.3, pr * 0.5, 0, TAU); }
            }
          }
          const crr = daisy ? fr * 0.3 : pr * 0.42;
          cen.moveTo(fx + crr, fy); cen.arc(fx, fy, crr, 0, TAU);
        }
      }
      ctx.fillStyle = css(cs, daisy ? 0.55 : 0.95); ctx.fill(shade);
      for (let t = 0; t < 3; t++) { const p = mains.m.get(t); if (p) { ctx.fillStyle = css(bloomTones[t]); ctx.fill(p); } }
      ctx.fillStyle = css(hiC, 0.55); ctx.fill(hil);
      ctx.fillStyle = css(cc, daisy ? 1 : 0.85); ctx.fill(cen);
      if (gi === 0) {
        // a few leaves in front of the back blooms for depth
        const fr = new Buckets();
        const nfl = Math.round(nLeaves * 0.12);
        for (let i = 0; i < nfl; i++) {
          const xn = tri(); if (Math.abs(xn) > 0.95) continue;
          const yt = topAt(xn);
          const y = yt + (0.35 + r() * 0.65) * (base - yt);
          leaf(fr, cx + xn * hw, y, ls * (0.7 + r() * 0.5), r() * TAU, clamp(Math.floor((0.2 + r() * 0.5) * 4.6), 0, 4), 0.55);
        }
        fillBk(fr, leafTones, 1);
      }
    }
    // front leaves along the lower rim
    const fl = new Buckets();
    const nfl = Math.round((W / ls) * 2.2 * density);
    for (let i = 0; i < nfl; i++) {
      const xn = tri(); if (Math.abs(xn) > 0.95) continue;
      const yt = topAt(xn);
      const y = base - r() * (base - yt) * 0.28;
      leaf(fl, cx + xn * hw, y, ls * (0.7 + r() * 0.6), r() * TAU, clamp(Math.floor(r() * 2.6), 0, 4), 0.55);
    }
    fillBk(fl, leafTones, 1);
    return cv;
  }

  // lavender-style spikes: stems with stacked buds
  function paintSpikes(ctx, r, W, H, k, o, cx, hw, base, topAt, tri) {
    const [cb, cs, cl, cd] = o.colors;
    const hd = o.hd;
    const sl = clamp(hd * 0.62, 5, 95) * k; // stem length px
    const spacing = clamp(hd * 0.032, 1.1, 5) * k;
    // foliage: short grey-green upward strokes
    const fol = new Buckets();
    const ftones = [mix(cd, BLACK, 0.25), cd, mix(cd, cl, 0.5), cl];
    const fl = Math.max(1.5, sl * 0.3), fw = Math.max(0.6, fl * 0.12);
    const nf = Math.round((W / spacing) * 3 * o.density);
    for (let i = 0; i < nf; i++) {
      const xn = tri(); if (Math.abs(xn) > 0.97) continue;
      const yt = topAt(xn), dy = r();
      const x = cx + xn * hw, y = yt + fl * 0.6 + dy * (base - yt - fl * 0.3);
      const a = -Math.PI / 2 + (r() - 0.5) * 1.3 + xn * 0.4, l = fl * (0.6 + r() * 0.7);
      const p = fol.get(clamp(Math.floor((1 - dy) * 2.6 + r() * 1.6), 0, 3));
      p.moveTo(x, y); p.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = fw;
    for (let t = 0; t < 4; t++) { const p = fol.m.get(t); if (p) { ctx.strokeStyle = css(ftones[t]); ctx.stroke(p); } }
    // spikes
    const n = Math.round((W / spacing) * o.density * 1.4);
    const stems = new Path2D();
    const heads = new Buckets(), buds = new Buckets();
    const tones = [mix(cb, cs, 0.6), mix(cb, cs, 0.25), cb, mix(cb, WHITE, 0.28)];
    let hwMax = 0;
    const spikes = [];
    for (let i = 0; i < n; i++) {
      const xn = tri(); if (Math.abs(xn) > 0.97) continue;
      const yt = topAt(xn);
      const bx = cx + xn * hw + (r() - 0.5) * spacing, by = yt + (base - yt) * (0.25 + r() * 0.55);
      const a = -Math.PI / 2 + xn * 0.35 + (r() - 0.5) * 0.4;
      const L = sl * (0.6 + r() * 0.5) * (1 - Math.abs(xn) * 0.3);
      spikes.push({ bx, by, a, L, v: r() });
    }
    spikes.sort((p, q) => p.by - q.by);
    for (const s of spikes) {
      const ca = Math.cos(s.a), sa = Math.sin(s.a);
      const ex = s.bx + ca * s.L, ey = Math.max(1, s.by + sa * s.L);
      const bl = s.L * 0.42, w = Math.max(0.8, bl * 0.2);
      hwMax = Math.max(hwMax, w);
      stems.moveTo(s.bx, s.by); stems.lineTo(ex - ca * bl, ey - sa * bl);
      const wq = clamp(Math.round(Math.log(w / 0.8) / Math.log(1.4)), 0, 12);
      heads.get(wq * 10 + (s.v < 0.3 ? 1 : 2)).moveTo(ex - ca * bl, ey - sa * bl);
      heads.get(wq * 10 + (s.v < 0.3 ? 1 : 2)).lineTo(ex, ey);
      if (bl > 5) {
        const nb = Math.max(3, Math.round(bl / (w * 0.9)));
        for (let j = 0; j < nb; j++) {
          const t = j / nb, px = ex - ca * bl * (1 - t), py = ey - sa * bl * (1 - t);
          const side = j % 2 ? 1 : -1, ox = -sa * side * w * 0.32, oy = ca * side * w * 0.32;
          const p = buds.get(wq * 10 + (side < 0 ? 3 : 0));
          p.moveTo(px + ox, py + oy); p.lineTo(px + ox + ca * w * 0.35, py + oy + sa * w * 0.35);
        }
      }
    }
    ctx.strokeStyle = css(mix(cd, cl, 0.35));
    ctx.lineWidth = Math.max(0.5, hwMax * 0.25);
    ctx.stroke(stems);
    const draw = (bk, scale) => {
      for (const key of [...bk.m.keys()].sort((p, q) => (p % 10) - (q % 10))) {
        ctx.strokeStyle = css(tones[key % 10]);
        ctx.lineWidth = 0.8 * Math.pow(1.4, Math.floor(key / 10)) * scale;
        ctx.stroke(bk.m.get(key));
      }
    };
    draw(heads, 1);
    draw(buds, 0.55);
  }

  /* ======================================================== LEAF MASSES */
  // clumps: [{x,y,r}] in px (later = more in front). Leaves sampled inside clumps,
  // shaded by the sphere normal of the front-most clump containing them.
  function leafMass(ctx, r, clumps, opts) {
    const { ls, count, tones, light = [-0.55, -0.7, 0.45], shadeY, inside, deep } = opts;
    const Ln = Math.hypot(light[0], light[1], light[2]);
    const L = [light[0] / Ln, light[1] / Ln, light[2] / Ln];
    // dark interior
    const dp = new Path2D();
    for (const c of clumps) { dp.moveTo(c.x + c.r * 0.92, c.y); dp.arc(c.x, c.y, c.r * 0.92, 0, TAU); }
    ctx.save();
    if (opts.clip) ctx.clip(opts.clip);
    ctx.fillStyle = css(deep); ctx.fill(dp);
    ctx.restore();
    let tot = 0;
    for (const c of clumps) tot += c.r * c.r;
    const bk = new Buckets();
    const NT = tones.length;
    for (let i = 0; i < count; i++) {
      let pick = r() * tot, ci = 0;
      for (; ci < clumps.length - 1; ci++) { pick -= clumps[ci].r * clumps[ci].r; if (pick <= 0) break; }
      const c = clumps[ci];
      const a = r() * TAU, rr = c.r * 1.04 * Math.sqrt(r());
      const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
      if (inside && !inside(x, y)) continue;
      let f = c;
      for (let j = clumps.length - 1; j > ci; j--) {
        const q = clumps[j];
        if ((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) < q.r * q.r * 0.9) { f = q; break; }
      }
      const nx = (x - f.x) / f.r, ny = (y - f.y) / f.r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lam = nx * L[0] + ny * L[1] + nz * L[2];
      const edge = Math.sqrt(nx * nx + ny * ny);
      let val = lam * 0.72 + 0.1 + (r() - 0.5) * 0.42 - (edge > 0.75 ? (edge - 0.75) * 1.1 : 0);
      if (shadeY) val += shadeY(x, y);
      const tone = clamp(Math.floor(val * NT), 0, NT - 1);
      const l = ls * (0.6 + r() * 0.65), rot = r() * TAU;
      const p = bk.get(tone);
      p.moveTo(x + Math.cos(rot) * l * 0.5, y + Math.sin(rot) * l * 0.5);
      p.ellipse(x, y, l * 0.5, l * 0.29, rot, 0, TAU);
    }
    ctx.save();
    if (opts.clip) ctx.clip(opts.clip);
    for (let t = 0; t < NT; t++) { const p = bk.m.get(t); if (p) { ctx.fillStyle = css(tones[t]); ctx.fill(p); } }
    ctx.restore();
  }
  const leafTonesOf = (cl, cm, cd) => {
    const deep = mix(mul(cd, 0.6), BLACK, 0.1);
    return { deep, tones: [mix(deep, cd, 0.55), cd, mix(cd, cm, 0.55), cm, mix(cm, cl, 0.55), cl, mix(cl, [240, 245, 170], 0.28)] };
  };
  function groundShadow(ctx, x, y, rx, ry, a) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(10,25,8,${a})`); g.addColorStop(0.5, `rgba(10,25,8,${a * 0.6})`); g.addColorStop(1, 'rgba(10,25,8,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function smallFlowers(ctx, r, pts, size, col) {
    const sh = new Path2D(), m = new Path2D(), cen = new Path2D(), hi = new Path2D();
    for (const [x, y] of pts) {
      const s = size * (0.75 + r() * 0.5), rot = r() * TAU;
      for (let q = 0; q < 5; q++) {
        const a = rot + (q * TAU) / 5, px = x + Math.cos(a) * s * 0.5, py = y + Math.sin(a) * s * 0.45, pr = s * 0.36;
        sh.moveTo(px + pr * 1.3, py + pr * 0.4); sh.arc(px + pr * 0.3, py + pr * 0.4, pr, 0, TAU);
        m.moveTo(px + pr, py); m.arc(px, py, pr, 0, TAU);
      }
      hi.moveTo(x - s * 0.15 + s * 0.2, y - s * 0.2); hi.arc(x - s * 0.15, y - s * 0.2, s * 0.2, 0, TAU);
      cen.moveTo(x + s * 0.14, y); cen.arc(x, y, s * 0.14, 0, TAU);
    }
    ctx.fillStyle = css(mix(col, BLACK, 0.4), 0.9); ctx.fill(sh);
    ctx.fillStyle = css(col); ctx.fill(m);
    ctx.fillStyle = css(mix(col, WHITE, 0.45), 0.6); ctx.fill(hi);
    ctx.fillStyle = css(mix(col, [255, 220, 90], 0.6)); ctx.fill(cen);
  }

  /* ================================================================ BUSH */
  function paintBush(W, H, o) {
    const { k, seed, density, params } = o;
    const [cl, cm, cd, cbl] = o.colors;
    const r = rng(seed * 4241 + 11);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const gy = H * 0.94;
    groundShadow(ctx, W / 2, gy, W * 0.48, H * 0.07, 0.45);
    const cx = W / 2, cy = H * 0.56, R = Math.min(W * 0.5, H * 0.52);
    const clumps = [];
    const n = 9 + Math.floor(r() * 4);
    clumps.push({ x: cx, y: cy + R * 0.08, r: R * 0.62 });
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (1.02 + (i / (n - 1)) * 0.96) + (r() - 0.5) * 0.2;
      const rr = R * (0.3 + r() * 0.12);
      const ex = (W * 0.5 - rr) * 0.98, ey = (cy - rr) * 0.98;
      clumps.push({ x: cx + Math.cos(a) * ex, y: cy + Math.sin(a) * Math.min(ey, R * 0.55), r: rr });
    }
    for (let i = 0; i < 5; i++) {
      const xn = -0.8 + (1.6 * i) / 4 + (r() - 0.5) * 0.15;
      const rr = R * (0.28 + r() * 0.1);
      clumps.push({ x: cx + xn * (W * 0.5 - rr), y: gy - rr * 0.95, r: rr });
    }
    clumps.sort((a, b) => a.y - b.y);
    const { deep, tones } = leafTonesOf(cl, cm, cd);
    const ls = clamp(Math.min(o.wd, o.hd) * 0.045, 3, 11) * k;
    let area = 0; for (const c of clumps) area += Math.PI * c.r * c.r;
    const count = Math.round((area / (ls * ls * 0.23)) * 0.75 * density);
    const clip = new Path2D(); clip.rect(0, 0, W, gy + ls * 0.3);
    leafMass(ctx, r, clumps, { ls, count, tones, deep, clip, shadeY: (x, y) => -((y - cy) / R) * 0.12 - Math.max(0, (y - gy + R * 0.4) / R) * 0.35 });
    const bl = clamp(+params.blooms || 0, 0, 1);
    if (bl > 0) {
      const pts = [];
      const nb = Math.round(count * 0.07 * bl);
      for (let i = 0; i < nb; i++) {
        const c = clumps[Math.floor(r() * clumps.length)];
        const a = Math.PI * (1.0 + r() * 1.1), rr = c.r * Math.sqrt(r()) * 0.95;
        const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
        if (y < gy - ls) pts.push([x, y]);
      }
      smallFlowers(ctx, r, pts, ls * 0.62, cbl);
    }
    return cv;
  }

  /* =============================================================== HEDGE */
  function paintHedge(W, H, o) {
    const { k, seed, density } = o;
    const [cl, cm, cd] = o.colors;
    const r = rng(seed * 6007 + 5);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const top = H * 0.06, bot = H * 0.95, x0 = W * 0.012, x1 = W * 0.988;
    groundShadow(ctx, W / 2, bot, W * 0.52, H * 0.07, 0.5);
    const ls = clamp(Math.min(o.wd * 0.02, o.hd * 0.05), 2.5, 9) * k;
    const cr = Math.min(H * 0.18, W * 0.08);
    const clip = new Path2D();
    // boxy outline with rounded top corners and a slightly bumpy edge
    const pts = [];
    const ph = r() * TAU;
    const steps = Math.max(12, Math.round(W / (ls * 2)));
    for (let i = 0; i <= steps; i++) { const t = i / steps; pts.push([x0 + cr + (x1 - x0 - 2 * cr) * t, top + Math.sin(t * 23 + ph) * ls * 0.25 + (r() - 0.5) * ls * 0.5]); }
    clip.moveTo(x0, bot);
    clip.lineTo(x0 + (r() - 0.5) * ls * 0.4, top + cr);
    clip.quadraticCurveTo(x0, top, pts[0][0], pts[0][1]);
    for (const p of pts) clip.lineTo(p[0], p[1]);
    clip.quadraticCurveTo(x1, top, x1, top + cr);
    clip.lineTo(x1, bot);
    clip.closePath();
    const clumps = [];
    const cR = Math.max(ls * 2.5, Math.min(H * 0.2, W * 0.12));
    for (let y = top + cR * 0.6; y < bot + cR * 0.5; y += cR * 1.1) {
      for (let x = x0 + cR * 0.5 + (r() - 0.5) * cR * 0.5; x < x1 + cR * 0.5; x += cR * 1.2) clumps.push({ x: x + (r() - 0.5) * cR * 0.4, y: y + (r() - 0.5) * cR * 0.3, r: cR * (0.85 + r() * 0.3) });
    }
    clumps.sort((a, b) => a.y - b.y);
    const { deep, tones } = leafTonesOf(cl, cm, cd);
    ctx.save(); ctx.clip(clip);
    ctx.fillStyle = css(deep); ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const count = Math.round(((x1 - x0) * (bot - top)) / (ls * ls * 0.2) * 0.8 * density);
    const faceTop = top + (bot - top) * 0.2;
    leafMass(ctx, r, clumps, {
      ls, count, tones, deep, clip, light: [-0.4, -0.85, 0.5],
      shadeY: (x, y) => (y < faceTop ? 0.35 * (1 - (y - top) / (faceTop - top)) + 0.1 : 0) - ((y - faceTop) / (bot - faceTop)) * 0.45 * (y > faceTop) - 0.05,
    });
    // darker base
    ctx.save(); ctx.clip(clip);
    const g = ctx.createLinearGradient(0, bot - (bot - top) * 0.45, 0, bot);
    g.addColorStop(0, 'rgba(8,22,6,0)'); g.addColorStop(1, 'rgba(8,22,6,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return cv;
  }

  /* ================================================================ TREE */
  function paintTree(W, H, o) {
    const { k, seed, density } = o;
    const [cl, cm, cd, ct] = o.colors;
    const r = rng(seed * 3571 + 13);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const gy = H * 0.97, cx = W / 2;
    groundShadow(ctx, cx, gy, W * 0.36, H * 0.035, 0.45);
    // trunk
    const tw = W * 0.055;
    const ccy = H * 0.38, rx = W * 0.47, ry = H * 0.35;
    const tr = new Path2D();
    tr.moveTo(cx - tw * 1.6, gy);
    tr.quadraticCurveTo(cx - tw * 0.9, gy - tw * 0.6, cx - tw * 0.8, gy - H * 0.12);
    tr.lineTo(cx - tw * 0.55, ccy + ry * 0.2);
    tr.lineTo(cx - tw * 2.6, ccy - ry * 0.25);
    tr.lineTo(cx - tw * 2.2, ccy - ry * 0.3);
    tr.lineTo(cx - tw * 0.1, ccy + ry * 0.05);
    tr.lineTo(cx + tw * 0.3, ccy - ry * 0.45);
    tr.lineTo(cx + tw * 0.75, ccy - ry * 0.42);
    tr.lineTo(cx + tw * 0.55, ccy + ry * 0.12);
    tr.lineTo(cx + tw * 2.4, ccy - ry * 0.15);
    tr.lineTo(cx + tw * 2.6, ccy - ry * 0.08);
    tr.lineTo(cx + tw * 0.6, ccy + ry * 0.32);
    tr.lineTo(cx + tw * 0.85, gy - H * 0.12);
    tr.quadraticCurveTo(cx + tw * 1.0, gy - tw * 0.6, cx + tw * 1.7, gy);
    tr.closePath();
    const tg = ctx.createLinearGradient(cx - tw * 1.2, 0, cx + tw * 1.2, 0);
    tg.addColorStop(0, css(mix(ct, WHITE, 0.18))); tg.addColorStop(0.45, css(ct)); tg.addColorStop(1, css(mix(ct, BLACK, 0.55)));
    ctx.fillStyle = tg; ctx.fill(tr);
    // bark streaks
    const bark = new Path2D();
    for (let i = 0; i < 26; i++) {
      const x = cx + (r() - 0.5) * tw * 1.4, y = gy - H * 0.04 - r() * (gy - ccy - ry * 0.1);
      bark.moveTo(x, y); bark.lineTo(x + (r() - 0.5) * tw * 0.15, y - H * (0.02 + r() * 0.05));
    }
    ctx.save(); ctx.clip(tr);
    ctx.strokeStyle = css(mix(ct, BLACK, 0.45), 0.55); ctx.lineWidth = Math.max(0.7, tw * 0.08); ctx.stroke(bark);
    ctx.restore();
    // canopy clumps
    const clumps = [{ x: cx, y: ccy + ry * 0.05, r: Math.min(rx, ry) * 0.5 }];
    const n = 14 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r() * 0.3;
      const rr = Math.min(rx, ry) * (0.24 + r() * 0.16);
      clumps.push({ x: cx + Math.cos(a) * (rx - rr) * (0.85 + r() * 0.15), y: ccy + Math.sin(a) * (ry - rr) * (0.85 + r() * 0.15), r: rr });
    }
    for (let i = 0; i < 8; i++) {
      const a = r() * TAU, d = 0.2 + r() * 0.4;
      clumps.push({ x: cx + Math.cos(a) * rx * d, y: ccy + Math.sin(a) * ry * d + ry * 0.05, r: Math.min(rx, ry) * (0.22 + r() * 0.12) });
    }
    clumps.sort((a, b) => a.y - b.y);
    const { deep, tones } = leafTonesOf(cl, cm, cd);
    const ls = clamp(Math.min(o.wd, o.hd) * 0.035, 3, 12) * k;
    let area = 0; for (const c of clumps) area += Math.PI * c.r * c.r;
    const count = Math.round((area / (ls * ls * 0.23)) * 0.6 * density);
    leafMass(ctx, r, clumps, { ls, count, tones, deep, shadeY: (x, y) => -((y - ccy) / ry) * 0.18 });
    return cv;
  }

  /* =============================================================== CLOUD */
  function paintCloud(W, H, o) {
    const { k, seed } = o;
    const [chi, csh] = o.colors;
    const r = rng(seed * 5153 + 29);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    // render the density field at reduced resolution — clouds are soft anyway
    const ds = Math.max(1, Math.min(3, Math.round(Math.max(W, H) / 700)));
    const gw = Math.ceil(W / ds), gh = Math.ceil(H / ds);
    const base = gh * 0.8;
    const puffs = [];
    const T = 0.22, edge = Math.sqrt(1 - Math.sqrt(T)); // visible radius / field radius
    const add = (x, y, rho, w) => {
      rho = Math.min(rho, x - 2, gw - 2 - x, y - 2);
      if (rho > 2) puffs.push({ x, y, R: rho / edge, w: w || 1 });
    };
    const nb = 5 + Math.floor(r() * 3);
    for (let i = 0; i < nb; i++) {
      const xn = -0.78 + (1.56 * i) / (nb - 1) + (r() - 0.5) * 0.08;
      const rho = gh * (0.17 + 0.12 * (1 - xn * xn)) * (0.85 + r() * 0.3);
      add(gw / 2 + xn * gw * 0.4, base - rho * 0.45, rho);
    }
    const nt = 2 + Math.floor(r() * 3);
    for (let i = 0; i < nt; i++) {
      const xn = (i / Math.max(1, nt - 1) - 0.5) * 0.8 + (r() - 0.5) * 0.15;
      const rho = gh * (0.27 + r() * 0.08) * (1 - Math.abs(xn) * 0.45);
      add(gw / 2 + xn * gw * 0.5, base - gh * 0.3 - rho * 0.5 * (1 - Math.abs(xn)) - r() * gh * 0.05, rho);
    }
    for (let i = 0; i < 6; i++) {
      const xn = (r() - 0.5) * 1.2;
      const rho = gh * (0.1 + r() * 0.08);
      add(gw / 2 + xn * gw * 0.42, base - gh * (0.15 + r() * 0.35), rho);
    }
    const F = new Float32Array(gw * gh);
    for (const p of puffs) {
      const R2 = p.R * p.R;
      const ya = Math.max(0, Math.floor(p.y - p.R)), yb = Math.min(gh - 1, Math.ceil(p.y + p.R));
      const xa = Math.max(0, Math.floor(p.x - p.R)), xb = Math.min(gw - 1, Math.ceil(p.x + p.R));
      for (let y = ya; y <= yb; y++) {
        const dy2 = (y - p.y) * (y - p.y);
        for (let x = xa; x <= xb; x++) {
          const q = 1 - ((x - p.x) * (x - p.x) + dy2) / R2;
          if (q > 0) F[y * gw + x] += q * q * p.w;
        }
      }
    }
    const g1 = grid(seed + 77), g2 = grid(seed + 78);
    const sc = 1 / (gh * 0.11);
    for (let y = 0; y < gh; y++) {
      const flat = sstep(base + gh * 0.13, base - gh * 0.16, y);
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const f = F[i];
        if (f <= 0.02) { F[i] = 0; continue; }
        const nz = fbm(g1, x * sc, y * sc, 5) * 0.32 + vn(g2, x * sc * 4.3, y * sc * 4.3) * 0.1;
        F[i] = Math.max(0, (f + nz * Math.min(1, f * 2.2)) * flat);
      }
    }
    const lx = -0.5, ly = -0.86;
    // top of the cloud per column (for the vertical light falloff)
    const topY = new Float32Array(gw).fill(base);
    for (let x = 0; x < gw; x++) for (let y = 0; y < gh; y++) if (F[y * gw + x] > T) { topY[x] = y; break; }
    for (let pass = 0; pass < 2; pass++) for (let x = 1; x < gw - 1; x++) topY[x] = Math.min(topY[x], (topY[x - 1] + topY[x] * 2 + topY[x + 1]) / 4 + gh * 0.02);
    const o1 = gh * 0.035, o2 = gh * 0.08, o3 = gh * 0.16;
    const at = (x, y) => { x = x | 0; y = y | 0; return x < 0 || y < 0 || x >= gw || y >= gh ? 0 : F[y * gw + x]; };
    const sm = mk(gw, gh), sx = sm.getContext('2d');
    const img = sx.createImageData(gw, gh), D = img.data;
    const mid = mix(chi, csh, 0.45);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const f = F[y * gw + x];
        if (f <= 0) continue;
        const gx = at(x + 1, y) - at(x - 1, y), gyy = at(x, y + 1) - at(x, y - 1);
        const gm = Math.max(0.004, Math.sqrt(gx * gx + gyy * gyy) * 0.5); // field change per px
        const a = sstep(T - gm * 1.6 * ds - 0.01, T + gm * 2.2 * ds + 0.02, f);
        if (a <= 0) continue;
        const occ = at(x + lx * o1, y + ly * o1) * 0.45 + at(x + lx * o2, y + ly * o2) * 0.35 + at(x + lx * o3, y + ly * o3) * 0.2;
        // self-shadowing toward the light + darker toward the flat base; thin edges stay light
        const vy = (y - topY[x]) / Math.max(4, base - topY[x]);
        let s = clamp01((occ - 0.3) * 0.3 + vy * 0.6 - 0.14 - (1 - Math.min(1, f / 0.45)) * 0.15 * (1 - vy));
        s = clamp01(s + fbm(g2, x * sc * 1.1 + 5.3, y * sc * 1.1 + 1.1, 3) * 0.28 * (0.3 + vy));
        s = s * s * (3 - 2 * s);
        const c = s < 0.5 ? mix(chi, mid, s * 2) : mix(mid, csh, (s - 0.5) * 2);
        const j = (y * gw + x) * 4;
        D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; D[j + 3] = a * 255 * (chi[3] == null ? 1 : chi[3]);
      }
    }
    sx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sm, 0, 0, gw, gh, 0, 0, gw * ds, gh * ds);
    return cv;
  }

  /* ================================================================= SKY */
  function paintSky(W, H, o) {
    const { seed, params } = o;
    const [ct, chz] = o.colors;
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 8; i++) { const t = i / 8; g.addColorStop(t, css(mix(ct, chz, Math.pow(t, 1.55)), 1)); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // faint glow near the horizon on one side
    const r = rng(seed * 811 + 1);
    const gx = W * (0.15 + r() * 0.7);
    const rg = ctx.createRadialGradient(gx, H, 0, gx, H, Math.max(W, H) * 0.7);
    rg.addColorStop(0, css(mix(chz, WHITE, 0.4), 0.28)); rg.addColorStop(1, css(chz, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const amount = clamp(+params.clouds || 0, 0, 1);
    if (amount > 0) {
      const cc = Array.isArray(params.cloudColors) && params.cloudColors.length >= 2
        ? params.cloudColors.map(parseColor)
        : [mix(WHITE, chz, 0.05), mix(mix(ct, [190, 200, 215], 0.55), WHITE, 0.2)];
      const n = Math.round(1 + amount * 6);
      for (let i = 0; i < n; i++) {
        const d = r();
        const cw = W * (0.28 + amount * 0.3) * (0.55 + d * 0.65), ch = cw * (0.42 + r() * 0.12);
        const x = W * (i + 0.2 + r() * 0.6) / n - cw / 2;
        const y = H * (0.04 + (1 - d) * 0.42 + r() * 0.08);
        const cc2 = [mix(cc[0], chz, (1 - d) * 0.25), mix(cc[1], chz, (1 - d) * 0.3)];
        const c = paintCloud(Math.round(cw), Math.round(ch), { k: o.k, seed: seed * 13 + i * 7 + 1, colors: cc2 });
        ctx.globalAlpha = 0.7 + d * 0.3;
        ctx.drawImage(c, x, y);
      }
      ctx.globalAlpha = 1;
    }
    const grain = params.grain == null ? 30 : clamp(+params.grain, 0, 100);
    if (grain > 0) applyGrain(ctx, W, H, grain, seed);
    return cv;
  }
  function applyGrain(ctx, W, H, grain, seed) {
    const img = ctx.getImageData(0, 0, W, H), D = img.data;
    const amp = grain * 0.42;
    const s = seed * 31 + 5;
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i += 4) {
        if (!D[i + 3]) continue;
        const n = (hash3(x, y, s) + hash3(x, y, s + 1) - 1) * amp;
        const c = (hash3(x, y, s + 2) - 0.5) * amp * 0.25;
        D[i] += n + c; D[i + 1] += n; D[i + 2] += n - c;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ================================================================ TUFT */
  function paintTuft(W, H, o) {
    const { seed, density } = o;
    const [cl, cm, cd] = o.colors;
    const r = rng(seed * 2221 + 9);
    const cv = mk(W, H), ctx = cv.getContext('2d');
    const bx = W / 2, by = H * 0.985;
    groundShadow(ctx, bx, by, W * 0.3, H * 0.05, 0.4);
    const n = Math.round(36 * density);
    const tones = [mix(cd, BLACK, 0.25), cd, mix(cd, cm, 0.5), cm, mix(cm, cl, 0.5), cl];
    const bk = new Buckets();
    for (let i = 0; i < n; i++) {
      const order = i / n;
      const tone = clamp(Math.floor(order * 4.2 + r() * 1.8), 0, 5);
      const x0 = bx + (r() - 0.5) * W * 0.3 * (0.4 + order * 0.6);
      let ang = -Math.PI / 2 + (r() - 0.5) * 1.5 + ((x0 - bx) / W) * 1.6;
      const lean = ang + Math.PI / 2;
      let len = H * (0.5 + r() * 0.48) * (1 - Math.abs(lean) * 0.32);
      const bend = (r() - 0.5) * 0.5 + Math.sign(lean) * 0.35;
      let tx = x0 + Math.cos(ang) * len, ty = by + Math.sin(ang) * len;
      const sx = tx < 1 ? (x0 - 1) / (x0 - tx) : tx > W - 1 ? (W - 1 - x0) / (tx - x0) : 1;
      const sy = ty < 1 ? (by - 1) / (by - ty) : 1;
      const s = Math.min(1, sx, sy);
      len *= s; tx = x0 + Math.cos(ang) * len; ty = by + Math.sin(ang) * len;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const mx = x0 + Math.cos(ang) * len * 0.55 + nx * bend * len * 0.22, my = by + Math.sin(ang) * len * 0.55 + ny * bend * len * 0.22;
      const tipx = tx + nx * bend * len * 0.3, tipy = ty + ny * bend * len * 0.15;
      const wb = W * 0.024 * (0.7 + r() * 0.6);
      const p = bk.get(tone);
      p.moveTo(x0 - wb, by);
      p.quadraticCurveTo(mx - nx * wb * 0.5, my - ny * wb * 0.5, tipx, Math.max(0.5, tipy));
      p.quadraticCurveTo(mx + nx * wb * 0.5, my + ny * wb * 0.5, x0 + wb, by);
      p.closePath();
    }
    for (let t = 0; t < tones.length; t++) { const p = bk.m.get(t); if (p) { ctx.fillStyle = css(tones[t]); ctx.fill(p); } }
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, by, 0, by - H * 0.6);
    g.addColorStop(0, 'rgba(10,30,6,0.6)'); g.addColorStop(1, 'rgba(10,30,6,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g2.addColorStop(0, css(mix(cl, [250, 245, 170], 0.3), 0.35)); g2.addColorStop(1, css(cl, 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    return cv;
  }

  /* ============================================================== SHADOW */
  function paintShadow(W, H, o) {
    const c = o.colors[0];
    const soft = clamp(o.params.softness == null ? 0.6 : +o.params.softness, 0, 1);
    const a = c[3] == null ? 1 : c[3];
    const cv = mk(W, H), ctx = cv.getContext('2d');
    ctx.translate(W / 2, H / 2); ctx.scale(W / 2, H / 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const inner = (1 - soft) * 0.72;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const f = t <= inner ? 1 - 0.15 * (t / Math.max(inner, 1e-3)) : 0.85 * (1 - sstep(inner, 1, t));
      g.addColorStop(t, css(c, a * f));
    }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    return cv;
  }

  /* =============================================================== KINDS */
  const KINDS = {
    hill: {
      label: 'Grassy hill', w: 1080, h: 700, paint: paintHill,
      colors: ['#b5d65e', '#5fae37', '#2c6a1f', '#cdea7c'], colorNames: ['Far grass', 'Mid grass', 'Dark grass', 'Blade highlight'],
      params: { profile: 'left' }, options: { profile: ['left', 'right', 'dome', 'double', 'flat'] },
    },
    flowers: {
      label: 'Flower bed', w: 400, h: 160, paint: paintFlowers,
      colors: ['#e3262c', '#8e0d15', '#3d7a2c', '#163c13', '#4d0a0c'], colorNames: ['Bloom', 'Bloom shade', 'Leaf', 'Leaf dark', 'Centre'],
      params: { bloom: 'cluster' }, options: { bloom: ['cluster', 'daisy', 'spike'] },
    },
    bush: {
      label: 'Bush', w: 300, h: 240, paint: paintBush,
      colors: ['#8cbf4c', '#4b8b2e', '#1e4c19', '#f0507a'], colorNames: ['Leaf light', 'Leaf mid', 'Leaf dark', 'Bloom'],
      params: { blooms: 0 },
    },
    hedge: {
      label: 'Hedge', w: 520, h: 200, paint: paintHedge,
      colors: ['#86b84c', '#457f2b', '#1b4517'], colorNames: ['Light', 'Mid', 'Dark'],
    },
    tree: {
      label: 'Tree', w: 420, h: 560, paint: paintTree,
      colors: ['#93c556', '#4f8c31', '#1d4919', '#6b4a32'], colorNames: ['Leaf light', 'Leaf mid', 'Leaf dark', 'Trunk'],
    },
    cloud: {
      label: 'Cloud', w: 420, h: 220, paint: paintCloud,
      colors: ['#ffffff', '#a7bcd4'], colorNames: ['Highlight', 'Shade'],
    },
    sky: {
      label: 'Sky', w: 1080, h: 1350, paint: paintSky,
      colors: ['#2a78d4', '#c2e8f6'], colorNames: ['Top', 'Horizon'],
      params: { clouds: 0, grain: 30 },
    },
    tuft: {
      label: 'Grass tuft', w: 160, h: 140, paint: paintTuft,
      colors: ['#a6d25a', '#5c9c35', '#2a5c1e'], colorNames: ['Light', 'Mid', 'Dark'],
    },
    shadow: {
      label: 'Contact shadow', w: 300, h: 60, paint: paintShadow,
      colors: ['rgba(20,35,15,0.45)'], colorNames: ['Shadow'],
      params: { softness: 0.6 },
    },
  };

  function resolve(el, kind) {
    const K = KINDS[kind];
    const def = K.colors;
    const src = Array.isArray(el.colors) && el.colors.length === def.length ? el.colors : def;
    const colorsStr = src.map((c, i) => (typeof c === 'string' && c ? c : def[i]));
    const params = {};
    const P = el.params && typeof el.params === 'object' ? el.params : {};
    for (const key of Object.keys(K.params || {})) params[key] = P[key] != null ? P[key] : el[key] != null ? el[key] : K.params[key];
    if (kind === 'sky' && (P.cloudColors || el.cloudColors)) params.cloudColors = P.cloudColors || el.cloudColors;
    const seed = Number.isFinite(+el.seed) && el.seed !== null && el.seed !== '' ? Math.round(+el.seed) : 1;
    const density = clamp(Number.isFinite(+el.density) && el.density !== null && el.density !== '' ? +el.density : 1, 0.1, 3);
    return { colorsStr, colors: colorsStr.map(parseColor), params, seed, density };
  }

  // paint one kind at an explicit pixel size; wd/hd = design size
  function paintKind(kind, el, pw, ph, wd, hd) {
    const K = KINDS[kind];
    const R = resolve(el, kind);
    return K.paint(pw, ph, { k: pw / wd, wd, hd, colors: R.colors, seed: R.seed, density: R.density, params: R.params });
  }

  const q16 = (v) => Math.max(16, Math.ceil(v / 16) * 16);
  function pixelSize(ctx, w, h, cap) {
    let sx = 1, sy = 1;
    try { const m = ctx.getTransform(); sx = Math.hypot(m.a, m.b) || 1; sy = Math.hypot(m.c, m.d) || 1; } catch (e) { /* no transform API */ }
    let pw = w * sx, ph = h * sy;
    const L = Math.max(pw, ph);
    if (L > cap) { pw *= cap / L; ph *= cap / L; }
    return [Math.min(q16(pw), cap), Math.min(q16(ph), cap)];
  }

  function draw(ctx, el) {
    if (!el) return;
    const kind = KINDS[el.kind] ? el.kind : 'hill';
    const w = +el.width, h = +el.height;
    if (!(w > 0 && h > 0)) return;
    const [pw, ph] = pixelSize(ctx, w, h, 3000);
    const R = resolve(el, kind);
    const key = [kind, R.colorsStr.join(','), R.seed, R.density, JSON.stringify(R.params), pw + 'x' + ph, Math.round(w) + 'x' + Math.round(h)].join('|');
    let cv = lruGet(key);
    if (!cv) {
      cv = KINDS[kind].paint(pw, ph, { k: pw / w, wd: w, hd: h, colors: R.colors, seed: R.seed, density: R.density, params: R.params });
      lruSet(key, cv);
    }
    ctx.drawImage(cv, 0, 0, w, h);
  }

  /* ============================================================== SCENES */
  function composeScene(pw, ph, w, h, sc) {
    const cv = mk(pw, ph), ctx = cv.getContext('2d');
    const k = pw / w;
    const seed = Number.isFinite(+sc.seed) ? Math.round(+sc.seed) : 1;
    const sky = paintKind('sky', { colors: sc.sky, seed, params: { clouds: sc.clouds || 0, grain: sc.grain == null ? 30 : sc.grain, cloudColors: sc.cloudColors } }, pw, ph, w, h);
    ctx.drawImage(sky, 0, 0);
    const place = (kind, it, fx, fy, centre) => {
      const bw = (it.w || 0.2) * w, bh = (it.h || 0.1) * h;
      const px = Math.max(1, Math.round(bw * k)), py = Math.max(1, Math.round(bh * k));
      const el = Object.assign({ seed: seed + 1 }, it);
      const c = paintKind(kind, el, px, py, bw, bh);
      const x = fx * pw - (centre ? px / 2 : 0), y = fy * ph - (centre ? py / 2 : 0);
      if (it.flipX) { ctx.save(); ctx.translate(x + px, y); ctx.scale(-1, 1); ctx.drawImage(c, 0, 0); ctx.restore(); }
      else ctx.drawImage(c, x, y);
    };
    const hills = Array.isArray(sc.hills) ? sc.hills : sc.hill ? [sc.hill] : [];
    for (const hl of hills) {
      const top = clamp(hl.top == null ? 0.5 : +hl.top, 0, 0.98);
      place('hill', Object.assign({ seed }, hl, { w: 1, h: 1 - top }), 0, top, false);
    }
    const items = [];
    for (const f of sc.flowers || []) items.push(Object.assign({ kind: 'flowers' }, f));
    for (const it of sc.items || []) items.push(it);
    items.sort((a, b) => (a.y || 0) - (b.y || 0));
    items.forEach((it, i) => {
      const kind = KINDS[it.kind] ? it.kind : 'flowers';
      place(kind, Object.assign({ seed: seed * 17 + i + 3 }, it), it.x == null ? 0.5 : +it.x, it.y == null ? 0.8 : +it.y, true);
    });
    return cv;
  }

  function drawScene(ctx, w, h, scene) {
    if (!scene || !(w > 0 && h > 0)) return;
    const sc = typeof scene === 'string' ? (SCENES[scene] && SCENES[scene].scene) : scene;
    if (!sc) return;
    const [pw, ph] = pixelSize(ctx, w, h, 4000);
    const key = 'scene|' + JSON.stringify(sc) + '|' + pw + 'x' + ph + '|' + Math.round(w) + 'x' + Math.round(h);
    let cv = lruGet(key);
    if (!cv) { cv = composeScene(pw, ph, w, h, sc); lruSet(key, cv); }
    ctx.drawImage(cv, 0, 0, w, h);
  }

  const RED = ['#e3262c', '#8e0d15', '#3d7a2c', '#163c13', '#4d0a0c'];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  function lavenderRows() {
    const out = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const y = 0.585 + Math.pow(t, 1.55) * 0.44;
      const hh = 0.03 + Math.pow(t, 1.4) * 0.17;
      out.push({ x: r3(0.5 + (i % 2 ? 0.03 : -0.03)), y: r3(y), w: 1.25, h: r3(hh), bloom: 'spike', density: 1.2, colors: ['#8a63c9', '#4f347f', '#7f9f6a', '#3d5a35', '#2b1d47'] });
    }
    return out;
  }
  const SCENES = {
    'sunny-hill': {
      label: 'Sunny hill',
      scene: {
        sky: ['#1f6dd0', '#bfe7f6'], clouds: 0, grain: 32, seed: 3,
        hill: { profile: 'left', top: 0.5, colors: ['#b5d65e', '#5fae37', '#2c6a1f', '#cdea7c'] },
        flowers: [{ x: 0.24, y: 0.8, w: 0.36, h: 0.1, colors: RED }, { x: 0.76, y: 0.91, w: 0.42, h: 0.12, colors: RED }],
      },
    },
    'rolling-hills': {
      label: 'Rolling hills',
      scene: {
        sky: ['#2b78d6', '#cdeef7'], clouds: 0.25, grain: 28, seed: 5,
        hill: { profile: 'double', top: 0.42, colors: ['#b9d968', '#62ad3a', '#2d6b20', '#d2ec84'] },
        flowers: [{ x: 0.7, y: 0.86, w: 0.36, h: 0.09, colors: RED }],
      },
    },
    'lawn-beds': {
      label: 'Lawn & flower beds',
      scene: {
        sky: ['#2a77d3', '#c4e9f6'], clouds: 0.15, grain: 30, seed: 7,
        hill: { profile: 'flat', top: 0.56, colors: ['#a9d05c', '#58a636', '#2a661e', '#c6e679'] },
        flowers: [
          { x: 0.2, y: 0.64, w: 0.22, h: 0.04, colors: RED },
          { x: 0.68, y: 0.66, w: 0.26, h: 0.045, colors: ['#f2c12e', '#a8730c', '#3d7a2c', '#163c13', '#5a3a06'] },
          { x: 0.36, y: 0.76, w: 0.36, h: 0.07, colors: RED },
          { x: 0.8, y: 0.86, w: 0.38, h: 0.09, colors: ['#ffffff', '#b8c0c8', '#3d7a2c', '#163c13', '#f2c12e'], bloom: 'daisy' },
          { x: 0.18, y: 0.93, w: 0.42, h: 0.11, colors: RED },
        ],
      },
    },
    'golden-hour': {
      label: 'Golden hour',
      scene: {
        sky: ['#f5ab86', '#fbe8a0'], clouds: 0.2, cloudColors: ['#fff6e0', '#e9a77f'], grain: 34, seed: 11,
        hill: { profile: 'left', top: 0.52, colors: ['#d6d86a', '#8fb43c', '#4f6e1f', '#ecea8c'] },
        flowers: [{ x: 0.3, y: 0.82, w: 0.32, h: 0.09, colors: ['#ff5a2e', '#a3230f', '#557c2a', '#26401a', '#5a1a08'] }],
      },
    },
    'pink-dusk': {
      label: 'Pink dusk',
      scene: {
        sky: ['#a99be0', '#f6b2c6'], clouds: 0.3, cloudColors: ['#ffe4ee', '#a98cc4'], grain: 36, seed: 13,
        hill: { profile: 'dome', top: 0.55, colors: ['#7fae5a', '#3f7d35', '#1b4720', '#a6cf7a'] },
        flowers: [{ x: 0.25, y: 0.84, w: 0.3, h: 0.08, colors: ['#ff4f86', '#9c1747', '#2f6a2c', '#11331a', '#4a0a22'] }, { x: 0.74, y: 0.92, w: 0.34, h: 0.09, colors: ['#ff4f86', '#9c1747', '#2f6a2c', '#11331a', '#4a0a22'] }],
      },
    },
    'cloudy-meadow': {
      label: 'Cloudy meadow',
      scene: {
        sky: ['#3a83d8', '#d5eff8'], clouds: 0.85, grain: 28, seed: 17,
        hill: { profile: 'dome', top: 0.6, colors: ['#b7d763', '#61ad38', '#2c6a1f', '#cfeb80'] },
        flowers: [
          { x: 0.16, y: 0.72, w: 0.18, h: 0.04, colors: RED },
          { x: 0.6, y: 0.76, w: 0.22, h: 0.05, colors: ['#f2c12e', '#a8730c', '#3d7a2c', '#163c13', '#5a3a06'] },
          { x: 0.3, y: 0.88, w: 0.3, h: 0.08, colors: ['#ffffff', '#b8c0c8', '#3d7a2c', '#163c13', '#f2c12e'], bloom: 'daisy' },
          { x: 0.86, y: 0.92, w: 0.3, h: 0.08, colors: RED },
        ],
      },
    },
    overcast: {
      label: 'Overcast',
      scene: {
        sky: ['#8796a8', '#d3dbe1'], clouds: 1, cloudColors: ['#eef1f4', '#8a98a8'], grain: 40, seed: 19,
        hill: { profile: 'right', top: 0.5, colors: ['#a3b67a', '#5f8a45', '#2f5228', '#bccb92'] },
        flowers: [{ x: 0.72, y: 0.86, w: 0.32, h: 0.08, colors: ['#c8283a', '#6e0f1b', '#3a6332', '#16331a', '#3a0a10'] }],
      },
    },
    'lavender-field': {
      label: 'Lavender field',
      scene: {
        sky: ['#3c86d9', '#e2f1f4'], clouds: 0.2, grain: 30, seed: 23,
        hill: { profile: 'flat', top: 0.555, colors: ['#a9c46a', '#5f9a3e', '#2f5c25', '#c3da86'] },
        flowers: lavenderRows(),
      },
    },
    'garden-park': {
      label: 'Garden park',
      scene: {
        sky: ['#2770d2', '#c6eaf6'], clouds: 0.35, grain: 30, seed: 29,
        hill: { profile: 'right', top: 0.55, colors: ['#b5d65e', '#5fae37', '#2c6a1f', '#cdea7c'] },
        items: [
          { kind: 'tree', x: 0.8, y: 0.47, w: 0.34, h: 0.34 },
          { kind: 'hedge', x: 0.3, y: 0.76, w: 0.56, h: 0.08 },
          { kind: 'bush', x: 0.72, y: 0.74, w: 0.24, h: 0.12, blooms: 0.25 },
        ],
        flowers: [{ x: 0.55, y: 0.86, w: 0.5, h: 0.1, colors: RED }],
      },
    },
  };

  window.StudioNature = { KINDS, draw, SCENES, drawScene, parseColor, clearCache: () => { lru.clear(); lruPx = 0; } };
})();
