/* Studio sticker library.
 * Defines window.STICKERS = [{ id, name, cat, w, h, colors, svg(c) }, ...]
 * Every svg(c) returns a standalone SVG string (xmlns, width/height, viewBox 0 0 w h),
 * safe to load as a data: URL and draw to a canvas (no text, no external refs).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  const PI = Math.PI;
  const f = (n) => +(+n).toFixed(1);
  const rad = (d) => (d * PI) / 180;
  const pol = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  const pt = (p) => f(p[0]) + ' ' + f(p[1]);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  // deterministic PRNG so the hand-drawn wobble is stable between renders
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const S = (w, h, body, defs) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs ? `<defs>${defs}</defs>` : '') + body + '</svg>';

  const poly = (p, closed) => 'M' + p.map(pt).join('L') + (closed ? 'Z' : '');

  // Catmull-Rom spline through points -> cubic Bezier path
  function smooth(p, closed) {
    const n = p.length;
    const g = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    let d = 'M' + pt(p[0]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' +
        pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d + (closed ? 'Z' : '');
  }

  // random per-point jitter (for sparse, cornered shapes)
  const jit = (p, a, seed) => { const r = rng(seed); return p.map((q) => [q[0] + (r() * 2 - 1) * a, q[1] + (r() * 2 - 1) * a]); };

  // smooth low-frequency wobble along arclength (for dense curves)
  function wob(p, a, seed) {
    const r = rng(seed);
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
    let s = 0;
    return p.map((q, i) => {
      if (i) s += Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]);
      return [q[0] + a * (0.7 * Math.sin(s / 21 + ph[0]) + 0.3 * Math.sin(s / 8 + ph[1])),
        q[1] + a * (0.7 * Math.sin(s / 19 + ph[2]) + 0.3 * Math.sin(s / 7 + ph[3]))];
    });
  }

  const samp = (fn, n, t0 = 0, t1 = 1) => { const a = []; for (let i = 0; i <= n; i++) a.push(fn(t0 + ((t1 - t0) * i) / n)); return a; };

  function starPts(cx, cy, R, r, n, rot = -90) {
    const a = [];
    for (let i = 0; i < 2 * n; i++) a.push(pol(cx, cy, i % 2 ? r : R, rot + (i * 180) / n));
    return a;
  }

  // polygon with rounded corners (r may be a number or array cycling per vertex)
  function roundPoly(p, r) {
    const n = p.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
      const rr = Array.isArray(r) ? r[i % r.length] : r;
      const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const s = lerp(b, a, Math.min(rr, l1 / 2) / l1), e = lerp(b, c, Math.min(rr, l2 / 2) / l2);
      d += (i ? 'L' : 'M') + pt(s) + 'Q' + pt(b) + ' ' + pt(e);
    }
    return d + 'Z';
  }

  // wavy-edged circle made of n outward arcs. b = arc radius / half-chord (1 = semicircles)
  function scallop(cx, cy, R, n, b = 1, rot = -90) {
    const ar = f(R * Math.sin(PI / n) * b);
    let d = '';
    for (let i = 0; i <= n; i++) {
      const p = pol(cx, cy, R, rot + (i * 360) / n);
      d += i ? `A${ar} ${ar} 0 0 1 ${pt(p)}` : 'M' + pt(p);
    }
    return d + 'Z';
  }

  // map every coordinate pair of an absolute M/L/C/Q/Z path
  const mapPairs = (d, fn) => d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (m, x, y) => pt(fn(+x, +y)));
  const xf = (d, cx, cy, s, sy) => mapPairs(d, (x, y) => [cx + x * s, cy + y * (sy || s)]);
  const mirror = (d, W) => mapPairs(d, (x, y) => [W - x, y]);

  // heart in a -50..50 box
  const HEART = 'M0 44 C-6 40 -48 16 -48 -14 C-48 -32 -35 -42 -22 -42 C-10 -42 -3 -35 0 -27 C3 -35 10 -42 22 -42 C35 -42 48 -32 48 -14 C48 16 6 40 0 44 Z';
  const heart = (cx, cy, s) => xf(HEART, cx, cy, s);

  // 4-point sparkle with concave sides
  const sparkle = (cx, cy, s, k = 0.12) => {
    const q = (x, y) => pt([cx + x * s, cy + y * s]);
    return `M${q(0, -1)}C${q(k, -0.32)} ${q(0.32, -k)} ${q(1, 0)}C${q(0.32, k)} ${q(k, 0.32)} ${q(0, 1)}C${q(-k, 0.32)} ${q(-0.32, k)} ${q(-1, 0)}C${q(-0.32, -k)} ${q(-k, -0.32)} ${q(0, -1)}Z`;
  };

  // tapered brush stroke: filled outline around a centerline with width profile w(t)
  function taper(p, w) {
    const L = [], R = [], n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const hw = w(i / (n - 1)) / 2, nx = -dy / l, ny = dx / l;
      L.push([p[i][0] + nx * hw, p[i][1] + ny * hw]);
      R.push([p[i][0] - nx * hw, p[i][1] - ny * hw]);
    }
    return smooth(L.concat(R.reverse()), true);
  }

  // circle as a path (for evenodd holes)
  const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

  // polygon edge between two points with perpendicular random jaggedness (torn paper)
  function tornEdge(a, b, amp, step, r) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / step));
    const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    const out = [], ph = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = i / n, o = i ? amp * (0.6 * (r() * 2 - 1) + 0.6 * Math.sin(i * 0.55 + ph)) : 0;
      out.push([a[0] + (b[0] - a[0]) * t + nx * o + (i ? (r() - 0.5) * step * 0.5 : 0) * (b[0] - a[0]) / L,
        a[1] + (b[1] - a[1]) * t + ny * o]);
    }
    return out;
  }
  // rectangle whose sides (top,right,bottom,left) may be torn: torn = [amp,amp,amp,amp]
  function tornRect(x0, y0, x1, y1, seed, torn, step = 6) {
    const r = rng(seed);
    const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    let pts = [];
    for (let i = 0; i < 4; i++) pts = pts.concat(torn[i] ? tornEdge(c[i], c[(i + 1) % 4], torn[i], step, r) : [c[i]]);
    return poly(pts, true);
  }

  // washi tape strip with zig-zag torn ends
  function tapeShape(x0, x1, y0, y1, seed, depth = 5, step = 4.5) {
    const r = rng(seed);
    const p = [[x0, y0], [x1, y0]];
    let i = 0;
    for (let y = y0 + step; y < y1 - 1; y += step, i++) p.push([x1 - (i % 2 ? depth * (0.6 + r() * 0.6) : r() * 1.5), y]);
    p.push([x1, y1], [x0, y1]);
    i = 0;
    for (let y = y1 - step; y > y0 + 1; y -= step, i++) p.push([x0 + (i % 2 ? depth * (0.6 + r() * 0.6) : r() * 1.5), y]);
    return poly(p, true);
  }

  const shadowF = (id, sd, dx, dy, op) =>
    `<filter id="${id}" x="-25%" y="-25%" width="150%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="${sd}"/><feOffset dx="${dx}" dy="${dy}" result="o"/><feComponentTransfer><feFuncA type="linear" slope="${op}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

  // chalk / crayon: wobble the stroke, fray the edges, punch speckles out of it
  const CHALK = '<filter id="ck" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="a"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="a" scale="5" xChannelSelector="R" yChannelSelector="G" result="b"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8" result="c"/>' +
    '<feDisplacementMap in="b" in2="c" scale="3" xChannelSelector="R" yChannelSelector="B" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".55 .9" numOctaves="2" seed="12" result="c2"/>' +
    '<feColorMatrix in="c2" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -6 0 0 4.05" result="e"/>' +
    '<feComposite in="d" in2="e" operator="in"/></filter>';

  // doodle stroke attributes
  const DS = (c, w = 8) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  // flat illustration outline
  const K = '#1d1d1b';
  const OL = `stroke="${K}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
  const arrowHead = (p, q, len = 26, spread = 32) => {
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / PI;
    return 'M' + pt(pol(q[0], q[1], len, a + 180 - spread)) + 'L' + pt(q) + 'L' + pt(pol(q[0], q[1], len, a + 180 + spread));
  };
  const wcirc = (cx, cy, rx, ry, a0, turns, seed, amp = 1.3, n = 30) =>
    smooth(wob(samp((t) => [cx + rx * (1 + 0.04 * t) * Math.cos(rad(a0 + t * 360 * turns)), cy + ry * (1 + 0.04 * t) * Math.sin(rad(a0 + t * 360 * turns))], n), amp, seed));

  const out = [];
  const add = (id, name, cat, w, h, colors, svg) => out.push({ id, name, cat, w, h, colors, svg });

  /* =================================================================== SHAPES */
  const SH = 'Shapes';
  {
    const d = roundPoly(starPts(100, 108, 96, 54, 5), [20, 12]);
    add('star-chunky', 'Chunky star', SH, 200, 200, ['#8fae86'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const d = sparkle(100, 100, 92, 0.1);
    add('sparkle-4', 'Sparkle', SH, 200, 200, ['#ffc93c'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const d = heart(100, 104, 1.78);
    add('heart-puffy', 'Puffy heart', SH, 200, 200, ['#a77bd6'], (c) => S(200, 200,
      `<path d="${d}" fill="${c[0]}"/><ellipse cx="58" cy="60" rx="17" ry="10" transform="rotate(-38 58 60)" fill="#fff" opacity=".35"/><circle cx="80" cy="46" r="4.5" fill="#fff" opacity=".35"/>`));
  }
  {
    const d = scallop(100, 100, 82, 12, 1.3);
    add('badge-scallop', 'Scalloped badge', SH, 200, 200, ['#f4a6c1'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const d = scallop(100, 100, 66, 8, 1.0);
    add('flower-cog', 'Bumpy flower', SH, 200, 200, ['#ff8a3d'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const d = roundPoly(starPts(100, 100, 94, 68, 18), 1.5);
    add('burst-sharp', 'Starburst', SH, 200, 200, ['#ffd23f'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const d = smooth(samp((t) => pol(100, 100, 80 + 11 * Math.cos(t * 2 * PI * 14), t * 360 - 90), 84, 0, 1).slice(0, -1), true);
    add('burst-soft', 'Soft burst', SH, 200, 200, ['#ff8fab'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    let rays = '';
    for (let i = 0; i < 12; i++) rays += 'M' + pt(pol(100, 100, 64, i * 30 - 90)) + 'L' + pt(pol(100, 100, 86, i * 30 - 90));
    add('sun-rays', 'Sun', SH, 200, 200, ['#f9a825'], (c) => S(200, 200,
      `<circle cx="100" cy="100" r="48" fill="${c[0]}"/><path d="${rays}" stroke="${c[0]}" stroke-width="13" stroke-linecap="round"/>`));
  }
  add('circle', 'Circle', SH, 200, 200, ['#e86a5c'], (c) => S(200, 200, `<circle cx="100" cy="100" r="90" fill="${c[0]}"/>`));
  {
    const blob = (seed, n, r0, r1) => {
      const r = rng(seed); const p = [];
      for (let i = 0; i < n; i++) p.push(pol(100, 100, r0 + r() * (r1 - r0), (i * 360) / n + r() * 14));
      return smooth(p, true);
    };
    const b1 = blob(3, 6, 64, 92), b2 = blob(21, 6, 62, 90), b3 = blob(12, 5, 68, 92);
    add('blob-1', 'Blob', SH, 200, 200, ['#c7b8f5'], (c) => S(200, 200, `<path d="${b1}" fill="${c[0]}"/>`));
    add('blob-2', 'Blob 2', SH, 200, 200, ['#9fd8c5'], (c) => S(200, 200, `<path d="${b2}" fill="${c[0]}"/>`));
    add('blob-3', 'Blob 3', SH, 200, 200, ['#ffc58a'], (c) => S(200, 200, `<path d="${b3}" fill="${c[0]}"/>`));
  }
  {
    const d = 'M48 138C22 138 12 112 28 96C24 70 50 54 72 64C80 34 122 26 138 54C160 44 186 62 180 88C198 96 196 128 172 136C168 137.5 164 138 160 138Z';
    add('cloud', 'Cloud', SH, 200, 160, ['#bfe3f8'], (c) => S(200, 160, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const arc = (r) => `M${100 - r} 108A${r} ${r} 0 0 1 ${100 + r} 108`;
    add('rainbow', 'Rainbow', SH, 200, 124, ['#ef6f6c', '#f7b267', '#7dc4a5'], (c) => S(200, 124,
      `<g fill="none" stroke-width="22" stroke-linecap="round"><path d="${arc(78)}" stroke="${c[0]}"/><path d="${arc(56)}" stroke="${c[1]}"/><path d="${arc(34)}" stroke="${c[2]}"/></g>`));
  }
  add('arch', 'Arch', SH, 160, 200, ['#e8956b'], (c) => S(160, 200, `<path d="M18 190V80A62 62 0 0 1 142 80V190Z" fill="${c[0]}"/>`));
  add('moon', 'Crescent moon', SH, 200, 200, ['#ffd66b'], (c) => S(200, 200,
    `<path d="M128 18A84 84 0 1 0 186 132A70 70 0 1 1 128 18Z" fill="${c[0]}"/>`));
  {
    const d = roundPoly([[124, 10], [42, 114], [96, 114], [76, 190], [160, 82], [106, 82], [134, 10]], [4, 6, 3, 6, 6, 3, 4]);
    add('bolt', 'Lightning bolt', SH, 200, 200, ['#ffd23f'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    let d = '';
    for (let i = 0; i < 3; i++) d += 'M' + pt(pol(100, 100, 74, -90 + i * 60)) + 'L' + pt(pol(100, 100, 74, 90 + i * 60));
    add('asterisk', 'Asterisk', SH, 200, 200, ['#ff6b4a'], (c) => S(200, 200, `<path d="${d}" stroke="${c[0]}" stroke-width="38" stroke-linecap="round"/>`));
  }
  {
    let pet = '';
    for (let i = 0; i < 12; i++) pet += `<ellipse cx="100" cy="47" rx="17" ry="40" transform="rotate(${i * 30} 100 100)"/>`;
    add('daisy', 'Daisy', SH, 200, 200, ['#ffffff', '#f6c445'], (c) => S(200, 200,
      `<g fill="${c[0]}" stroke="#000" stroke-opacity=".08" stroke-width="1.5">${pet}</g><circle cx="100" cy="100" r="30" fill="${c[1]}"/><circle cx="100" cy="100" r="30" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="5"/>`));
  }
  add('smiley-face', 'Smiley', SH, 200, 200, ['#ffd84d', '#2b2b2b'], (c) => S(200, 200,
    `<circle cx="100" cy="100" r="88" fill="${c[0]}"/><ellipse cx="72" cy="80" rx="9" ry="15" fill="${c[1]}"/><ellipse cx="128" cy="80" rx="9" ry="15" fill="${c[1]}"/><path d="M58 116Q100 162 142 116" fill="none" stroke="${c[1]}" stroke-width="10" stroke-linecap="round"/>`));
  add('droplet', 'Droplet', SH, 160, 200, ['#5bb3f0'], (c) => S(160, 200,
    `<path d="M80 10C80 10 20 86 20 128A60 60 0 0 0 140 128C140 86 80 10 80 10Z" fill="${c[0]}"/><path d="M44 132A36 36 0 0 0 66 162" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/>`));
  add('half-circle', 'Half circle', SH, 200, 110, ['#e76f51'], (c) => S(200, 110, `<path d="M10 102A90 90 0 0 1 190 102Z" fill="${c[0]}"/>`));
  {
    const n = 4.6;
    const d = poly(samp((t) => { const a = t * 2 * PI, co = Math.cos(a), si = Math.sin(a); return [100 + 88 * Math.sign(co) * Math.pow(Math.abs(co), 2 / n), 100 + 88 * Math.sign(si) * Math.pow(Math.abs(si), 2 / n)]; }, 96).slice(0, -1), true);
    add('squircle', 'Squircle', SH, 200, 200, ['#5fb3a8'], (c) => S(200, 200, `<path d="${d}" fill="${c[0]}"/>`));
  }
  add('pill', 'Pill capsule', SH, 200, 170, ['#ff8fab', '#fff1f4'], (c) => S(200, 170,
    `<g transform="rotate(-35 100 85)"><path d="M100 53H47A32 32 0 0 0 47 117H100Z" fill="${c[0]}"/><path d="M100 53H153A32 32 0 0 1 153 117H100Z" fill="${c[1]}"/><path d="M15 85A32 32 0 0 1 47 53H153A32 32 0 0 1 185 85A32 32 0 0 1 153 117H47A32 32 0 0 1 15 85Z" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="2"/><path d="M38 70H90" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/></g>`));

  /* ================================================================== DOODLES */
  const DO = 'Doodles';
  const loopD = smooth(wob(samp((t) => [45 + 10 * t + 22 * Math.sin(t), 58 + 36 * Math.cos(t)], 60, -0.5 * PI, 6.5 * PI), 1.6, 11));
  add('loop-squiggle', 'Loop squiggle', DO, 280, 110, ['#ff5fa2'], (c) => S(280, 110, `<path d="${loopD}" ${DS(c[0])}/>`));
  {
    const d = poly(jit(samp((t) => [16 + 216 * t, t * 10 % 2 < 1 ? 22 : 68], 10).map((p, i) => [p[0], i % 2 ? 68 : 22]), 3, 5));
    add('zigzag', 'Zigzag', DO, 248, 90, ['#9ad62a'], (c) => S(248, 90, `<path d="${d}" ${DS(c[0])}/>`));
  }
  const wavyD = smooth(wob(samp((t) => [16 + 216 * t, 45 + 22 * Math.sin(t * 2.5 * 2 * PI)], 30), 1.4, 3));
  add('wavy-line', 'Wavy line', DO, 248, 90, ['#2ec4d6'], (c) => S(248, 90, `<path d="${wavyD}" ${DS(c[0])}/>`));
  {
    const d = smooth(wob(samp((t) => pol(90, 90, 5 + 70 * t, t * 1080 - 90), 60), 1.2, 9));
    add('spiral', 'Spiral', DO, 180, 180, ['#7b5cff'], (c) => S(180, 180, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  const starOutlineD = (() => { const p = starPts(100, 106, 88, 38, 5); return poly(jit(p.concat([p[0], lerp(p[0], p[1], 0.4)]), 3.2, 17)); })();
  add('star-outline', 'Star outline', DO, 200, 200, ['#ffffff'], (c) => S(200, 200, `<path d="${starOutlineD}" ${DS(c[0])}/>`));
  const scribStarD = (() => {
    const o = (r, rot) => [0, 2, 4, 1, 3, 0].map((i) => pol(100, 106, r, -90 + rot + i * 72));
    return poly(jit(o(88, 0), 4, 31).concat(jit(o(80, 7).slice(1), 5, 32)));
  })();
  add('scribble-star', 'Scribble star', DO, 200, 200, ['#2ec4d6'], (c) => S(200, 200, `<path d="${scribStarD}" ${DS(c[0], 6)}/>`));
  {
    const d = smooth(wob(samp((t) => { const a = rad(-150 + t * 420), k = 1 + 0.08 * t; return [110 + 90 * k * Math.cos(a), 74 + 52 * k * Math.sin(a) + 8 * t]; }, 44), 1.5, 4));
    add('circle-scribble', 'Circle it', DO, 220, 150, ['#ff3b30'], (c) => S(220, 150, `<path d="${d}" ${DS(c[0], 6)}/>`));
  }
  {
    const d = taper(samp((t) => [16 + 208 * t, 50 - 22 * Math.sin(t * PI * 0.85) + 4 * t], 26), (t) => 2.5 + 17 * Math.sin(PI * Math.pow(t, 0.6)));
    add('underline-swoosh', 'Swoosh underline', DO, 240, 70, ['#ff5fa2'], (c) => S(240, 70, `<path d="${d}" fill="${c[0]}"/>`));
  }
  {
    const a = smooth(wob(samp((t) => [16 + 208 * t, 24 + 7 * Math.sin(t * PI)], 10), 1.2, 6));
    const b = smooth(wob(samp((t) => [40 + 168 * t, 50 + 5 * Math.sin(t * PI)], 8), 1.2, 7));
    add('underline-double', 'Double underline', DO, 240, 70, ['#ffb000'], (c) => S(240, 70, `<path d="${a}${b}" ${DS(c[0], 7)}/>`));
  }
  {
    const p = wob(samp((t) => [(1 - t) * (1 - t) * 24 + 2 * (1 - t) * t * 36 + t * t * 172, (1 - t) * (1 - t) * 156 + 2 * (1 - t) * t * 36 + t * t * 50], 14), 1.4, 2);
    add('arrow-curved', 'Curved arrow', DO, 200, 180, ['#1d1d1b'], (c) => S(200, 180, `<path d="${smooth(p)}${arrowHead(p[p.length - 3], p[p.length - 1], 28)}" ${DS(c[0])}/>`));
  }
  {
    const p = [[18, 128], [52, 122], [92, 108], [124, 82], [130, 52], [110, 34], [88, 46], [92, 76], [120, 98], [160, 104], [196, 92], [224, 72]];
    const q = wob(p, 1, 5);
    add('arrow-loopy', 'Loopy arrow', DO, 240, 150, ['#ff5fa2'], (c) => S(240, 150, `<path d="${smooth(q)}${arrowHead(q[q.length - 2], q[q.length - 1], 26, 34)}" ${DS(c[0])}/>`));
  }
  {
    const p = wob(samp((t) => [18 + 178 * t, 70 - 26 * t + 8 * Math.sin(t * PI)], 10), 1.2, 8);
    add('arrow-straight', 'Hand arrow', DO, 220, 100, ['#2f6fed'], (c) => S(220, 100, `<path d="${smooth(p)}${arrowHead(p[p.length - 2], p[p.length - 1], 28, 36)}" ${DS(c[0])}/>`));
  }
  add('sparkles-cluster', 'Sparkles', DO, 200, 200, ['#ffc21a'], (c) => S(200, 200,
    `<path d="${sparkle(78, 110, 62, 0.14)}${sparkle(156, 52, 30, 0.14)}${sparkle(158, 150, 18, 0.14)}" ${DS(c[0], 7)}/>`));
  const heartD = (() => {
    const p = samp((t) => { const s = Math.sin(t); return [100 + 5.4 * 16 * s * s * s, 92 - 5.4 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }, 56, -0.3, 2 * PI + 0.22);
    return smooth(wob(p, 1.6, 12));
  })();
  add('heart-doodle', 'Heart doodle', DO, 200, 200, ['#ff4f8b'], (c) => S(200, 200, `<path d="${heartD}" ${DS(c[0])}/>`));
  {
    const ring = wcirc(100, 100, 40, 40, -80, 1.06, 3);
    const r = rng(41); let rays = '';
    for (let i = 0; i < 10; i++) { const a = i * 36 - 90 + (r() * 8 - 4), l = i % 2 ? 16 : 26; rays += 'M' + pt(pol(100, 100, 56 + r() * 3, a)) + 'L' + pt(pol(100, 100, 58 + l, a + r() * 4 - 2)); }
    add('sun-doodle', 'Sun doodle', DO, 200, 200, ['#ffa400'], (c) => S(200, 200, `<path d="${ring}${rays}" ${DS(c[0])}/>`));
  }
  {
    let d = '';
    for (let i = 0; i < 7; i++) {
      const a = (i * 360) / 7 - 90;
      d += smooth(wob([pol(100, 100, 25, a - 24), pol(100, 100, 55, a - 17), pol(100, 100, 80, a), pol(100, 100, 55, a + 17), pol(100, 100, 25, a + 24)], 1.3, 50 + i));
    }
    d += wcirc(100, 100, 19, 19, -40, 1.1, 8, 0.8, 16);
    add('flower-doodle', 'Flower doodle', DO, 200, 200, ['#ff7eb6'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const d = wcirc(100, 100, 80, 78, -120, 1.05, 21, 1.4) + 'M76 70L77 92M124 69L124 91' +
      smooth(wob([[58, 116], [76, 140], [102, 148], [128, 138], [144, 114]], 1, 3));
    add('smiley-doodle', 'Smiley doodle', DO, 200, 200, ['#1d1d1b'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0])}/>`));
  }
  {
    const d = poly(jit([[22, 40], [80, 38], [140, 41], [82, 110], [20, 42]], 1.6, 3)) +
      smooth(jit([[82, 110], [81, 148], [82, 186]], 1.2, 4)) + smooth(jit([[48, 192], [82, 186], [116, 191]], 1.2, 6)) +
      smooth(jit([[38, 58], [80, 55], [124, 58]], 1, 8)) + wcirc(70, 70, 11, 11, 0, 1.05, 9, 0.6, 14) + 'M50 24L98 98';
    add('martini-doodle', 'Martini doodle', DO, 160, 210, ['#1d1d1b'], (c) => S(160, 210, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const d = smooth(wob([[40, 122], [44, 84], [68, 56], [104, 46], [140, 56], [162, 84], [166, 122]], 1.2, 2)) +
      smooth(wob([[40, 122], [100, 127], [166, 121]], 1, 3)) +
      smooth(wob([[66, 120], [32, 122], [10, 132], [22, 142], [64, 138], [100, 128]], 1, 4)) +
      smooth(wob([[104, 50], [86, 82], [80, 124]], 0.8, 5)) + smooth(wob([[104, 50], [126, 82], [130, 124]], 0.8, 6)) +
      wcirc(104, 44, 6, 5, 0, 1, 7, 0.3, 10);
    add('cap-doodle', 'Cap doodle', DO, 180, 160, ['#2f6fed'], (c) => S(180, 160, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const d = poly(jit([[38, 128], [30, 58], [68, 98], [100, 40], [132, 98], [170, 58], [162, 128]], 2.2, 8)) +
      poly(jit([[34, 128], [166, 127], [164, 154], [36, 155], [34, 126]], 2, 9));
    add('crown-doodle', 'Crown doodle', DO, 200, 180, ['#ffb800'], (c) => S(200, 180,
      `<path d="${d}" ${DS(c[0], 7)}/><g fill="${c[0]}"><circle cx="29" cy="46" r="8"/><circle cx="100" cy="27" r="8"/><circle cx="171" cy="46" r="8"/><circle cx="70" cy="141" r="5"/><circle cx="100" cy="141" r="5"/><circle cx="130" cy="141" r="5"/></g>`));
  }
  {
    const d = poly(jit([[72, 28], [40, 40], [12, 76], [38, 98], [54, 84], [54, 178], [148, 178], [148, 84], [164, 98], [190, 76], [160, 40], [128, 28]], 2, 5)) +
      smooth(jit([[128, 28], [114, 46], [100, 50], [86, 46], [72, 28]], 1, 6));
    add('tshirt-doodle', 'T-shirt doodle', DO, 200, 200, ['#ff5fa2'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const p = [[120, 14], [50, 108], [94, 108], [74, 188], [152, 86], [106, 86], [130, 14]];
    const d = poly(jit(p.concat([p[0], lerp(p[0], p[1], 0.25)]), 2.4, 13));
    add('bolt-doodle', 'Lightning doodle', DO, 200, 200, ['#ffd000'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const b1 = taper(samp((t) => [60 + 7 * t, 22 + 96 * t + 3 * Math.sin(t * PI)], 8), (t) => 20 - 12 * t);
    const b2 = taper(samp((t) => [116 - 3 * t, 24 + 94 * t], 8), (t) => 20 - 12 * t);
    add('exclaim-doodle', 'Exclamation !!', DO, 180, 180, ['#ff3b30'], (c) => S(180, 180,
      `<g fill="${c[0]}"><path d="${b1}"/><path d="${b2}"/><circle cx="68" cy="150" r="10"/><circle cx="113" cy="148" r="10"/></g>`));
  }
  {
    const comma = taper([[-11, 2], [-14, -14], [-10, -28], [-1, -38], [11, -44]], (t) => 22 - 19 * t);
    const q = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><circle cx="0" cy="0" r="14"/><path d="${comma}"/></g>`;
    add('quotes-doodle', 'Quote marks', DO, 220, 120, ['#1d1d1b'], (c) => S(220, 120,
      `<g fill="${c[0]}">${q(40, 86, 0)}${q(84, 86, 0)}${q(136, 36, 180)}${q(180, 36, 180)}</g>`));
  }
  {
    const pl = (x, y, s, r) => { const j = jit([[x - s, y], [x + s, y], [x, y - s], [x, y + s]], s * 0.08, r); return 'M' + pt(j[0]) + 'L' + pt(j[1]) + 'M' + pt(j[2]) + 'L' + pt(j[3]); };
    const d = pl(64, 70, 30, 1) + pl(146, 46, 18, 2) + pl(140, 140, 24, 3) + pl(52, 152, 12, 4) + pl(176, 100, 9, 5);
    add('plus-cluster', 'Plus marks', DO, 200, 200, ['#2ec4d6'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0])}/>`));
  }
  {
    const d = [[-135, 70, 118], [-90, 64, 130], [-45, 72, 116]].map(([a, r0, r1], i) => 'M' + pt(pol(100, 148, r0, a + i)) + 'L' + pt(pol(100, 148, r1, a - i))).join('');
    add('emphasis-marks', 'Emphasis marks', DO, 200, 120, ['#ff5fa2'], (c) => S(200, 120, `<path d="${d}" ${DS(c[0], 9)}/>`));
  }
  {
    const d = smooth(wob([[14, 96], [54, 58], [100, 46], [146, 56], [186, 94]], 1, 2)) +
      smooth(wob([[18, 98], [60, 126], [100, 134], [140, 126], [184, 96]], 1, 3)) +
      wcirc(100, 90, 30, 30, -90, 1.03, 4, 0.8, 18) +
      'M40 70L28 52M70 53L62 32M100 46L100 24M130 52L138 31M160 67L172 49';
    add('eye-doodle', 'Eye doodle', DO, 200, 150, ['#2f6fed'], (c) => S(200, 150,
      `<path d="${d}" ${DS(c[0], 6)}/><circle cx="100" cy="90" r="13" fill="${c[0]}"/><circle cx="106" cy="84" r="4" fill="#fff"/>`));
  }
  add('music-notes', 'Music notes', DO, 220, 190, ['#7b5cff'], (c) => S(220, 190,
    `<g fill="${c[0]}"><ellipse cx="40" cy="152" rx="16" ry="11" transform="rotate(-22 40 152)"/><ellipse cx="116" cy="136" rx="16" ry="11" transform="rotate(-22 116 136)"/><ellipse cx="178" cy="120" rx="14" ry="10" transform="rotate(-22 178 120)"/><path d="M52 58L130 40L130 56L52 74Z"/></g><path d="M53 148L52 60M129 132L130 44M190 116L190 40C194 56 212 62 210 86" ${DS(c[0], 7)}/>`));
  {
    let p = [];
    const arc = (cx, cy, r, a0, a1) => { const n = Math.max(3, Math.round(Math.abs(a1 - a0) / 14)); p = p.concat(samp((t) => pol(cx, cy, r, a0 + (a1 - a0) * t), n)); };
    arc(58, 104, 26, 100, 255); arc(94, 76, 33, 190, 325); arc(136, 76, 28, 215, 350); arc(160, 104, 25, 255, 445);
    p.push([110, 131], [58, 130]);
    const d = poly(wob(p, 1.2, 6)) + 'L' + pt(lerp(p[0], p[1], 0.6));
    add('cloud-doodle', 'Cloud doodle', DO, 200, 160, ['#2ec4d6'], (c) => S(200, 160, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    const x = poly(jit([[128, 30], [178, 88]], 2, 3)) + poly(jit([[178, 32], [126, 86]], 2, 4));
    const trail = smooth(wob([[16, 172], [46, 158], [62, 132], [92, 118], [118, 100]], 1, 2));
    add('x-marks', 'X marks the spot', DO, 200, 190, ['#e63946'], (c) => S(200, 190,
      `<path d="${x}" ${DS(c[0], 11)}/><path d="${trail}" ${DS(c[0], 6)} stroke-dasharray="1 15"/>`));
  }
  // chalk set
  const chalk = (inner) => `<g filter="url(#ck)">${inner}</g>`;
  add('chalk-loop', 'Chalk loop', DO, 280, 110, ['#ff8fc8'], (c) => S(280, 110, chalk(`<path d="${loopD}" ${DS(c[0], 9)}/>`), CHALK));
  add('chalk-star', 'Chalk star', DO, 200, 200, ['#ffffff'], (c) => S(200, 200, chalk(`<path d="${starOutlineD}" ${DS(c[0], 9)}/>`), CHALK));
  add('chalk-squiggle', 'Chalk squiggle', DO, 248, 90, ['#c6f432'], (c) => S(248, 90, chalk(`<path d="${wavyD}" ${DS(c[0], 10)}/>`), CHALK));
  add('chalk-scribble-star', 'Chalk scribble star', DO, 200, 200, ['#5ee0f0'], (c) => S(200, 200, chalk(`<path d="${scribStarD}" ${DS(c[0], 8)}/>`), CHALK));
  add('chalk-heart', 'Chalk heart', DO, 200, 200, ['#ff6fa8'], (c) => S(200, 200, chalk(`<path d="${heartD}" ${DS(c[0], 9)}/>`), CHALK));

  /* =========================================================== PAPER & OFFICE */
  const PO = 'Paper & Office';
  const CLIP = 'M24 58V142A11 11 0 0 0 46 142V38A17 17 0 0 0 12 38V158A23 23 0 0 0 58 158V50';
  const metalClip = (dark, stops, wire = 6) => {
    const st = stops.map((s, i) => `<stop offset="${f(i / (stops.length - 1))}" stop-color="${s}"/>`).join('');
    return S(70, 200,
      `<g filter="url(#sh)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${CLIP}" stroke="${dark}" stroke-width="${wire + 2}"/><path d="${CLIP}" stroke="url(#m)" stroke-width="${wire}"/><path d="${CLIP}" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" transform="translate(-1.2 -1)"/></g>`,
      `<linearGradient id="m" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="70" y2="200">${st}</linearGradient>` + shadowF('sh', 2, 2, 3, 0.35));
  };
  add('clip-silver', 'Silver paper clip', PO, 70, 200, [], () => metalClip('#6f7680', ['#f7f8fa', '#a4abb5', '#eef1f4', '#868d97', '#e8ebef', '#aab1ba', '#f7f8fa', '#9aa1ab']));
  add('clip-gold', 'Gold paper clip', PO, 70, 200, [], () => metalClip('#94701f', ['#fff1c2', '#d4a23a', '#fbe6a0', '#b4832a', '#f7d97f', '#c9952f', '#fff1c2', '#c28f2c']));
  add('clip-plastic', 'Plastic paper clip', PO, 70, 200, ['#ff6fa8'], (c) => S(70, 200,
    `<g filter="url(#sh)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${CLIP}" stroke="${c[0]}" stroke-width="8"/><path d="${CLIP}" stroke="#000" stroke-opacity=".12" stroke-width="8" transform="translate(.8 .8)" stroke-dasharray="0"/><path d="${CLIP}" stroke="${c[0]}" stroke-width="6.5"/><path d="${CLIP}" stroke="#fff" stroke-opacity=".55" stroke-width="2" transform="translate(-1.4 -1.2)"/></g>`,
    shadowF('sh', 2, 2, 3, 0.3)));
  {
    const H = 'M42 98L50 26Q52 14 64 14H96Q108 14 110 26L118 98';
    const H2 = 'M46 96L58 44Q60 36 68 36H92Q100 36 102 44L114 96';
    add('binder-clip', 'Binder clip', PO, 160, 180, [], () => S(160, 180,
      `<g filter="url(#sh)"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${H2}" stroke="#4b5059" stroke-width="6"/><path d="${H2}" stroke="#9aa1ab" stroke-width="4"/><path d="${H}" stroke="#5f666f" stroke-width="7"/><path d="${H}" stroke="url(#m)" stroke-width="5"/><path d="${H}" stroke="#fff" stroke-opacity=".75" stroke-width="1.4" transform="translate(-1 -.8)"/></g>` +
      `<path d="M28 96Q29 88 37 88H123Q131 88 132 96L136 160Q137 168 129 168H31Q23 168 24 160Z" fill="url(#b)"/><path d="M27 158H133" stroke="#fff" stroke-opacity=".14" stroke-width="2"/>` +
      `<path d="M30 92H130" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>` +
      `<rect x="30" y="86" width="22" height="16" rx="7" fill="url(#t)"/><rect x="108" y="86" width="22" height="16" rx="7" fill="url(#t)"/>` +
      `<path d="M34 108L31 150" stroke="#fff" stroke-opacity=".14" stroke-width="5" stroke-linecap="round"/></g>`,
      `<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".3" stop-color="#9aa1ab"/><stop offset=".55" stop-color="#eef1f4"/><stop offset=".8" stop-color="#7d848e"/><stop offset="1" stop-color="#dfe3e8"/></linearGradient>` +
      `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a4d"/><stop offset=".18" stop-color="#232325"/><stop offset="1" stop-color="#0e0e10"/></linearGradient>` +
      `<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6a6e"/><stop offset=".45" stop-color="#2b2b2e"/><stop offset="1" stop-color="#111"/></linearGradient>` + shadowF('sh', 3, 2, 4, 0.35)));
  }
  {
    const T = tapeShape(8, 232, 12, 52, 3);
    const gloss = '<rect x="8" y="12" width="224" height="10" fill="#fff" opacity=".18"/>';
    const tape = (fill, extra = '') => `<path d="${T}" fill="${fill}" opacity=".86"/>${extra}`;
    add('washi-plain', 'Washi tape', PO, 240, 64, ['#f6a5c0'], (c) => S(240, 64, `<g clip-path="url(#cp)">${tape(c[0])}${gloss}</g>`, `<clipPath id="cp"><path d="${T}"/></clipPath>`));
    add('washi-stripes', 'Striped washi', PO, 240, 64, ['#a8d8ea', '#ffffff'], (c) => S(240, 64,
      `<g clip-path="url(#cp)" opacity=".88">${tape(c[0])}<rect width="240" height="64" fill="url(#p)"/>${gloss}</g>`,
      `<clipPath id="cp"><path d="${T}"/></clipPath><pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="16" fill="${c[1]}" opacity=".85"/></pattern>`));
    add('washi-dots', 'Dotted washi', PO, 240, 64, ['#ffd166', '#ffffff'], (c) => S(240, 64,
      `<g clip-path="url(#cp)" opacity=".9">${tape(c[0])}<rect width="240" height="64" fill="url(#p)"/>${gloss}</g>`,
      `<clipPath id="cp"><path d="${T}"/></clipPath><pattern id="p" width="14" height="14" patternUnits="userSpaceOnUse" x="2" y="4"><circle cx="3.5" cy="3.5" r="2.6" fill="${c[1]}"/><circle cx="10.5" cy="10.5" r="2.6" fill="${c[1]}"/></pattern>`));
    add('washi-grid', 'Grid washi', PO, 240, 64, ['#b9e4c9', '#4f9d69'], (c) => S(240, 64,
      `<g clip-path="url(#cp)" opacity=".88">${tape(c[0])}<rect width="240" height="64" fill="url(#p)"/>${gloss}</g>`,
      `<clipPath id="cp"><path d="${T}"/></clipPath><pattern id="p" width="10" height="10" patternUnits="userSpaceOnUse" x="3" y="2"><path d="M0 .5H10M.5 0V10" stroke="${c[1]}" stroke-opacity=".55" stroke-width="1"/></pattern>`));
  }
  {
    const r = rng(77);
    const p = [[12, 14], [228, 15]];
    for (let y = 19; y < 50; y += 4) p.push([228 - r() * 7, y]);
    p.push([227, 51], [12, 50]);
    for (let y = 46; y > 16; y -= 4) p.push([12 + r() * 7, y]);
    const T = poly(p, true);
    let fib = '';
    for (let i = 0; i < 7; i++) { const y = 18 + i * 5 + r() * 3; fib += `M${f(14 + r() * 30)} ${f(y)}H${f(150 + r() * 70)}`; }
    add('tape-masking', 'Masking tape', PO, 240, 64, ['#e9dcbc'], (c) => S(240, 64,
      `<g clip-path="url(#cp)"><path d="${T}" fill="${c[0]}" opacity=".9"/><path d="${fib}" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/><path d="${fib}" stroke="#000" stroke-opacity=".04" stroke-width="2" transform="translate(0 2)"/><rect x="0" y="44" width="240" height="8" fill="#000" opacity=".04"/></g>`,
      `<clipPath id="cp"><path d="${T}"/></clipPath>`));
  }
  {
    const T = tapeShape(10, 210, 12, 52, 9, 4, 4);
    add('tape-clear', 'Clear tape', PO, 220, 64, [], () => S(220, 64,
      `<path d="${T}" fill="url(#g)" stroke="#000" stroke-opacity=".12" stroke-width="1"/><g clip-path="url(#cp)"><rect x="10" y="14" width="200" height="6" fill="#fff" opacity=".55"/><path d="M40 52L64 12M150 52L168 12" stroke="#fff" stroke-opacity=".35" stroke-width="10"/></g>`,
      `<clipPath id="cp"><path d="${T}"/></clipPath><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#e9eef2" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>`));
  }
  add('push-pin', 'Push pin', PO, 120, 150, ['#e8384f'], (c) => S(120, 150,
    `<ellipse cx="74" cy="132" rx="20" ry="6" fill="#000" opacity=".28" filter="url(#bl)"/>` +
    `<path d="M58 104L64 131" stroke="url(#n)" stroke-width="3.2" stroke-linecap="round"/>` +
    `<g transform="rotate(-14 60 80)">` +
    `<ellipse cx="60" cy="100" rx="25" ry="9" fill="${c[0]}"/><ellipse cx="60" cy="100" rx="25" ry="9" fill="#000" opacity=".25"/>` +
    `<path d="M47 56V96A13 5 0 0 0 73 96V56Z" fill="${c[0]}"/><path d="M47 56V96A13 5 0 0 0 73 96V56Z" fill="url(#cyl)"/>` +
    `<path d="M24 38V48A36 13 0 0 0 96 48V38Z" fill="${c[0]}"/><path d="M24 38V48A36 13 0 0 0 96 48V38Z" fill="url(#cyl)"/>` +
    `<ellipse cx="60" cy="38" rx="36" ry="13" fill="${c[0]}"/><ellipse cx="60" cy="38" rx="36" ry="13" fill="url(#top)"/>` +
    `<ellipse cx="46" cy="34" rx="11" ry="4" fill="#fff" opacity=".55"/></g>`,
    `<linearGradient id="cyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".35" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>` +
    `<radialGradient id="top" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></radialGradient>` +
    `<linearGradient id="n" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef0f3"/><stop offset="1" stop-color="#7d848e"/></linearGradient>` +
    `<filter id="bl" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>`));
  add('staple', 'Staple', PO, 160, 50, [], () => S(160, 50,
    `<g transform="rotate(-6 80 25)"><rect x="22" y="25" width="118" height="7" rx="3.5" fill="#000" opacity=".25" filter="url(#bl)"/><rect x="20" y="20" width="120" height="7" rx="3" fill="url(#m)"/><rect x="18" y="19" width="7" height="9" rx="2" fill="#6b7280"/><rect x="135" y="19" width="7" height="9" rx="2" fill="#6b7280"/><path d="M26 21.5H134" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/></g>`,
    `<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#b3b9c2"/><stop offset="1" stop-color="#7a818b"/></linearGradient><filter id="bl" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>`));
  add('sticky-note', 'Sticky note', PO, 200, 200, ['#ffe680'], (c) => S(200, 200,
    `<path d="M22 24H186V170Q184 190 166 194H22Z" fill="#000" opacity=".22" filter="url(#bl)"/><path d="M150 178Q176 182 190 196L160 192Z" fill="#000" opacity=".2" filter="url(#bl)"/>` +
    `<path d="M14 14H186V160Q182 178 164 186H14Z" fill="${c[0]}"/><path d="M14 14H186V160Q182 178 164 186H14Z" fill="url(#g)"/>` +
    `<path d="M186 160Q182 178 164 186Q170 172 170 160Q178 162 186 160Z" fill="#fff" opacity=".45"/><path d="M186 160Q182 178 164 186Q170 172 170 160Q178 162 186 160Z" fill="#000" opacity=".06"/><rect x="14" y="14" width="172" height="22" fill="#000" opacity=".035"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient><filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>`));
  {
    const d = tornRect(16, 18, 184, 202, 12, [3, 2.5, 3, 2.5], 6);
    add('paper-torn', 'Torn paper', PO, 200, 220, ['#fbf8f1'], (c) => S(200, 220,
      `<g filter="url(#sh)"><path d="${d}" fill="${c[0]}"/></g><path d="${d}" fill="url(#g)"/>`,
      shadowF('sh', 3, 1, 3, 0.25) + `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>`));
  }
  {
    const d = tornRect(14, 22, 186, 218, 33, [5, 0, 0, 0], 6);
    let lines = '';
    for (let y = 54; y < 216; y += 18) lines += `M14 ${y}H186`;
    add('paper-notebook', 'Notebook paper', PO, 200, 230, ['#fffdf7'], (c) => S(200, 230,
      `<g filter="url(#sh)"><path d="${d}" fill="${c[0]}"/></g><g clip-path="url(#cp)"><path d="${lines}" stroke="#9ec3e6" stroke-width="1.3"/><path d="M42 14V222" stroke="#ec8c8c" stroke-width="1.6"/></g>`,
      shadowF('sh', 3, 1, 3, 0.25) + `<clipPath id="cp"><path d="${d}"/></clipPath>`));
  }
  {
    const d = tornRect(14, 14, 186, 188, 58, [0, 3.5, 3.5, 0], 6);
    add('paper-graph', 'Graph paper', PO, 200, 200, ['#fbfbf6'], (c) => S(200, 200,
      `<g filter="url(#sh)"><path d="${d}" fill="${c[0]}"/></g><path d="${d}" fill="url(#p)"/><path d="${d}" fill="url(#p2)"/>`,
      shadowF('sh', 3, 1, 3, 0.25) +
      `<pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse" x="14" y="14"><path d="M0 .4H12M.4 0V12" stroke="#a9cbe3" stroke-width=".8"/></pattern><pattern id="p2" width="60" height="60" patternUnits="userSpaceOnUse" x="14" y="14"><path d="M0 .6H60M.6 0V60" stroke="#8bb6d6" stroke-width="1.3"/></pattern>`));
  }
  {
    const d = tornRect(10, 16, 250, 54, 91, [2.2, 5, 2.2, 5], 5);
    const rim = tornRect(8.5, 14, 251.5, 56.5, 92, [2.6, 5.5, 2.6, 5.5], 4);
    add('paper-strip', 'Torn strip', PO, 260, 70, ['#a8c09a'], (c) => S(260, 70,
      `<g filter="url(#sh)"><path d="${rim}" fill="#fbfaf4"/><path d="${d}" fill="${c[0]}"/></g>`, shadowF('sh', 2, 1, 2, 0.22)));
  }
  {
    const d = 'M18 10H151A9 9 0 0 0 169 10H202Q210 10 210 18V92Q210 100 202 100H169A9 9 0 0 0 151 100H18Q10 100 10 92V64A9 9 0 0 0 10 46V18Q10 10 18 10Z';
    add('ticket-stub', 'Ticket stub', PO, 220, 110, ['#ff8a5c'], (c) => S(220, 110,
      `<g filter="url(#sh)"><path d="${d}" fill="${c[0]}"/></g><path d="M160 26V86" stroke="#fff" stroke-opacity=".75" stroke-width="3.5" stroke-linecap="round" stroke-dasharray=".1 8"/>` +
      `<rect x="26" y="22" width="120" height="66" rx="5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/><rect x="31" y="27" width="110" height="56" rx="3" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>` +
      `<path d="${sparkle(86, 55, 16)}" fill="#fff" opacity=".7"/><path d="${sparkle(60, 46, 6)}${sparkle(112, 66, 7)}" fill="#fff" opacity=".55"/><path d="${sparkle(185, 55, 11)}" fill="#fff" opacity=".7"/>`,
      shadowF('sh', 2, 1, 2, 0.25)));
  }
  {
    let holes = '';
    for (let x = 10; x <= 150.1; x += 14) holes += `<circle cx="${x}" cy="10" r="5"/><circle cx="${x}" cy="180" r="5"/>`;
    for (let y = 24; y <= 166.1; y += 14.2) holes += `<circle cx="10" cy="${f(y)}" r="5"/><circle cx="150" cy="${f(y)}" r="5"/>`;
    add('stamp-blank', 'Postage stamp', PO, 160, 190, ['#7fb2d9'], (c) => S(160, 190,
      `<g filter="url(#sh)"><g mask="url(#mk)"><rect x="10" y="10" width="140" height="170" fill="#fffaf0"/><rect x="22" y="22" width="116" height="146" fill="${c[0]}"/><rect x="22" y="22" width="116" height="146" fill="url(#g)"/><rect x="27" y="27" width="106" height="136" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/></g></g>`,
      `<mask id="mk"><rect width="160" height="190" fill="#fff"/><g fill="#000">${holes}</g></mask><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient>` + shadowF('sh', 2, 1, 2, 0.25)));
  }
  add('envelope', 'Envelope', PO, 220, 150, ['#e8cfa4'], (c) => S(220, 150,
    `<g filter="url(#sh)"><rect x="12" y="14" width="196" height="120" rx="4" fill="${c[0]}"/></g>` +
    `<path d="M12 134L94 74Q110 64 126 74L208 134Z" fill="#000" opacity=".07"/><path d="M12 18L90 80L12 132Z" fill="#000" opacity=".03"/><path d="M208 18L130 80L208 132Z" fill="#000" opacity=".03"/>` +
    `<path d="M13 15L102 84Q110 90 118 84L207 15Z" fill="${c[0]}"/><path d="M13 15L102 84Q110 90 118 84L207 15" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.2"/><path d="M13 15L102 84Q110 90 118 84L207 15Z" fill="url(#g)"/>`,
    shadowF('sh', 3, 1, 3, 0.25) + `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`));
  add('polaroid', 'Polaroid frame', PO, 180, 214, ['#ffffff'], (c) => S(180, 214,
    `<g filter="url(#sh)"><path d="M12 12H168V200H12ZM24 24V156H156V24Z" fill="${c[0]}" fill-rule="evenodd"/></g><path d="M12 12H168V200H12ZM24 24V156H156V24Z" fill="url(#g)" fill-rule="evenodd"/><rect x="24" y="24" width="132" height="132" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="1.5"/>`,
    shadowF('sh', 3.5, 1, 4, 0.28) + `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient>`));
  add('price-tag', 'Price tag', PO, 230, 120, ['#d9b48a'], (c) => S(230, 120,
    `<g filter="url(#sh)"><path d="M68 18H206Q214 18 214 26V94Q214 102 206 102H68Q62 102 58 98L26 66Q20 60 26 54L58 22Q62 18 68 18Z${circ(52, 60, 7)}" fill="${c[0]}" fill-rule="evenodd"/></g>` +
    `<path d="M72 28H200Q204 28 204 32V88Q204 92 200 92H72" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-dasharray="6 5"/>` +
    `<path d="M46 60C34 50 20 36 10 30C4 26 4 18 12 16" fill="none" stroke="#9c7b54" stroke-width="2.5" stroke-linecap="round"/><path d="M58 60C50 70 40 74 30 72" fill="none" stroke="#9c7b54" stroke-width="2.5" stroke-linecap="round"/>`,
    shadowF('sh', 2.5, 1, 2, 0.25)));
  add('string-tag', 'String tag', PO, 140, 230, ['#e6cf9f'], (c) => S(140, 230,
    `<g filter="url(#sh)"><path d="M44 50H96L120 72V214Q120 220 114 220H26Q20 220 20 214V72Z${circ(70, 78, 6)}" fill="${c[0]}" fill-rule="evenodd"/></g>` +
    `<circle cx="70" cy="78" r="12" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="5"/>` +
    `<path d="M70 72C60 50 66 28 80 20C92 12 108 18 104 32C100 44 82 40 86 26C90 12 110 6 124 12" fill="none" stroke="#b5544a" stroke-width="2.5" stroke-linecap="round"/>`,
    shadowF('sh', 2.5, 1, 3, 0.25)));

  /* ================================================================== OBJECTS */
  const OB = 'Objects';
  add('coffee-cup', 'Coffee to go', OB, 180, 222, ['#f4efe6', '#b07a4f'], (c) => S(180, 222,
    `<path d="M40 64L55 204Q56 210 62 210H118Q124 210 125 204L140 64Z" fill="${c[0]}" ${OL}/><path d="M44.1 102H135.9L129.7 160H50.3Z" fill="${c[1]}" ${OL}/>` +
    `<path d="${heart(90, 131, 0.34)}" fill="#fff" opacity=".9"/>` +
    `<path d="M44 50L50 30Q52 24 58 24H122Q128 24 130 30L136 50Z" fill="#fff" ${OL}/><rect x="30" y="48" width="120" height="18" rx="7" fill="#fff" ${OL}/><path d="M104 36H118" ${OL} fill="none"/>`));
  add('mug', 'Mug', OB, 220, 200, ['#9ad0ec', '#ff6b8b'], (c) => S(220, 200,
    `<path d="M148 90C200 84 200 158 146 152" fill="none" stroke="${K}" stroke-width="30" stroke-linecap="round"/><path d="M148 90C200 84 200 158 146 152" fill="none" stroke="${c[0]}" stroke-width="18" stroke-linecap="round"/>` +
    `<path d="M28 64H154V160Q154 188 126 188H56Q28 188 28 160Z" fill="${c[0]}" ${OL}/><path d="${heart(91, 124, 0.52)}" fill="${c[1]}"/>` +
    `<path d="M62 50C52 40 72 32 62 16M92 50C82 40 102 32 92 16M122 50C112 40 132 32 122 16" fill="none" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`));
  add('camera', 'Retro camera', OB, 220, 170, ['#f1e8d8', '#3b3b3b'], (c) => S(220, 170,
    `<rect x="34" y="28" width="30" height="22" rx="4" fill="#3b3b3b" ${OL}/><path d="M126 46L134 22H178L186 46Z" fill="${c[0]}" ${OL}/>` +
    `<rect x="14" y="44" width="192" height="112" rx="16" fill="${c[0]}" ${OL}/><rect x="14" y="76" width="192" height="54" fill="${c[1]}" ${OL}/>` +
    `<rect x="160" y="54" width="32" height="14" rx="3" fill="#fff" ${OL}/><circle cx="36" cy="62" r="5" fill="#e8384f"/>` +
    `<circle cx="104" cy="102" r="44" fill="#e7e7e7" ${OL}/><circle cx="104" cy="102" r="30" fill="#2b2b2b" ${OL}/><circle cx="104" cy="102" r="16" fill="#46516a"/><circle cx="94" cy="92" r="6" fill="#fff" opacity=".85"/><circle cx="112" cy="110" r="3" fill="#fff" opacity=".5"/>`));
  {
    let sp = '';
    for (let x = 22; x < 220; x += 16) sp += `<rect x="${x}" y="30" width="9" height="9" rx="2"/><rect x="${x}" y="91" width="9" height="9" rx="2"/>`;
    const fr = (x, o) => `<rect x="${x}" y="45" width="60" height="40" rx="3" fill="%C0%" opacity="${o}"/>`;
    add('film-strip', 'Film strip', OB, 240, 130, ['#f4a261'], (c) => S(240, 130,
      `<g transform="rotate(-7 120 65)"><rect x="14" y="23" width="212" height="84" rx="3" fill="#232323"/><g fill="#f4efe6">${sp}</g>` +
      (fr(24, 1) + fr(90, 0.85) + fr(156, 0.7)).replace(/%C0%/g, c[0]) +
      `<path d="M24 85L54 62L70 74L84 64V85ZM90 85L112 66L130 78L150 60V85ZM156 85L176 70L196 80L216 66V85Z" fill="#000" opacity=".22"/><circle cx="66" cy="56" r="5" fill="#fff" opacity=".6"/><circle cx="196" cy="56" r="5" fill="#fff" opacity=".6"/></g>`));
  }
  add('cassette', 'Cassette tape', OB, 220, 152, ['#f26b5b', '#fff3e2'], (c) => S(220, 152,
    `<rect x="12" y="16" width="196" height="122" rx="12" fill="${c[0]}" ${OL}/><path d="M52 138L62 110H158L168 138" fill="${c[0]}" ${OL}/><path d="M55 136L63 113H157L165 136Z" fill="#000" opacity=".12"/>` +
    `<rect x="30" y="30" width="160" height="66" rx="8" fill="${c[1]}" stroke="${K}" stroke-width="4"/><path d="M30 40H190" stroke="${c[0]}" stroke-width="5" opacity=".6"/>` +
    `<rect x="60" y="50" width="100" height="34" rx="17" fill="#2b2b2b"/><path d="M82 67H138" stroke="#6b4a3a" stroke-width="10"/>` +
    `<g fill="#fff" stroke="${K}" stroke-width="3"><circle cx="82" cy="67" r="11"/><circle cx="138" cy="67" r="11"/></g><g fill="${K}"><circle cx="82" cy="67" r="4"/><circle cx="138" cy="67" r="4"/><circle cx="24" cy="28" r="3"/><circle cx="196" cy="28" r="3"/><circle cx="24" cy="126" r="3"/><circle cx="196" cy="126" r="3"/><circle cx="82" cy="126" r="5"/><circle cx="138" cy="126" r="5"/></g>`));
  {
    let gr = '';
    for (let r = 82; r >= 44; r -= 7) gr += circ(100, 100, r);
    add('vinyl', 'Vinyl record', OB, 200, 200, ['#ff7a59'], (c) => S(200, 200,
      `<path d="${circ(100, 100, 90)}${circ(100, 100, 4)}" fill="#1d1d1b" fill-rule="evenodd"/><path d="${gr}" fill="none" stroke="#3a3a3a" stroke-width="1.4"/>` +
      `<path d="M100 100L36 36A90 90 0 0 1 70 15Z M100 100L164 164A90 90 0 0 1 130 185Z" fill="#fff" opacity=".1"/>` +
      `<path d="${circ(100, 100, 32)}${circ(100, 100, 4)}" fill="${c[0]}" fill-rule="evenodd"/><path d="${circ(100, 100, 24)}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><circle cx="100" cy="100" r="90" fill="none" stroke="#000" stroke-width="3"/>`));
  }
  {
    const L = 'M24 30H106Q114 30 112 40L106 70Q100 92 78 92H54Q32 92 26 72L18 42Q16 30 24 30Z';
    const R = mirror(L, 240);
    const br = 'M112 42Q120 34 128 42';
    add('sunglasses', 'Sunglasses', OB, 240, 110, ['#ff4f79', '#3a2b4f'], (c) => S(240, 110,
      `<g fill="none" stroke-linejoin="round" stroke-linecap="round"><path d="${L}${R}${br}M18 38L6 34M222 38L234 34" stroke="${K}" stroke-width="18"/><path d="${L}${R}${br}M18 38L6 34M222 38L234 34" stroke="${c[0]}" stroke-width="8"/></g>` +
      `<path d="${L}${R}" fill="${c[1]}"/><path d="${L}${R}" fill="url(#g)"/><path d="M36 50L52 38M44 62L68 42M170 52L186 40M178 64L198 46" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>`,
      `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".7" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>`));
  }
  add('lipstick', 'Lipstick', OB, 120, 220, ['#d7263d', '#2f2f35'], (c) => S(120, 220,
    `<path d="M40 100V56Q40 48 47 44L74 28Q82 23 82 32V100Z" fill="${c[0]}" ${OL}/><path d="M50 58V92" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>` +
    `<rect x="34" y="94" width="52" height="30" rx="3" fill="#e9b949" ${OL}/><path d="M42 100V118" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>` +
    `<rect x="28" y="122" width="64" height="86" rx="8" fill="${c[1]}" ${OL}/><rect x="28" y="140" width="64" height="7" fill="#e9b949"/><path d="M38 154V196" stroke="#fff" stroke-opacity=".22" stroke-width="5" stroke-linecap="round"/>`));
  add('cherries', 'Cherries', OB, 200, 200, ['#e3263e', '#5cb85c'], (c) => S(200, 200,
    `<path d="M62 120C68 86 92 56 122 34M134 128C132 92 128 62 122 34" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M122 34C138 10 172 12 184 24C162 44 136 44 122 34Z" fill="${c[1]}" ${OL}/><path d="M130 32C148 28 160 26 174 24" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="60" cy="146" r="34" fill="${c[0]}" ${OL}/><circle cx="138" cy="152" r="32" fill="${c[0]}" ${OL}/><ellipse cx="46" cy="134" rx="9" ry="6" transform="rotate(-35 46 134)" fill="#fff" opacity=".6"/><ellipse cx="125" cy="140" rx="8" ry="5.5" transform="rotate(-35 125 140)" fill="#fff" opacity=".6"/>`));
  {
    let w = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45 - 90, d1 = 15, d2 = 18;
      w += 'M' + pt(pol(100, 100, 13, a - d1)) + 'L' + pt(pol(100, 100, 64, a - d2)) + `A64 64 0 0 1 ${pt(pol(100, 100, 64, a + d2))}L${pt(pol(100, 100, 13, a + d1))}Z`;
    }
    add('lemon-slice', 'Lemon slice', OB, 200, 200, ['#ffcc29', '#ffe36e'], (c) => S(200, 200,
      `<circle cx="100" cy="100" r="88" fill="${c[0]}" ${OL}/><circle cx="100" cy="100" r="76" fill="#fffbe6"/><path d="${w}" fill="${c[1]}" stroke="${c[1]}" stroke-width="5" stroke-linejoin="round"/><path d="M60 52A60 60 0 0 1 100 40" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`));
  }
  {
    const r = rng(5); let seeds = '';
    const hw = (y) => (y < 100 ? 64 : 64 - (y - 100) * 0.62);
    for (let y = 92; y < 180; y += 20) for (let x = 100 - 80 + ((y / 20) % 2) * 13; x < 180; x += 26) {
      if (Math.abs(x - 100) < hw(y) - 14) seeds += `<ellipse cx="${f(x + r() * 4)}" cy="${f(y + r() * 4)}" rx="2.6" ry="4.6" transform="rotate(${f((x - 100) / 4)} ${f(x)} ${f(y)})"/>`;
    }
    const leaf = roundPoly(starPts(100, 68, 42, 13, 6, -90).map(([x, y]) => [x, 68 + (y - 68) * 0.45]), 3);
    add('strawberry', 'Strawberry', OB, 200, 210, ['#ef3b4f', '#4caf50'], (c) => S(200, 210,
      `<path d="M100 196C60 180 28 130 30 94C32 66 60 56 100 62C140 56 168 66 170 94C172 130 140 180 100 196Z" fill="${c[0]}" ${OL}/><g fill="#ffe7a3">${seeds}</g>` +
      `<path d="M50 96C48 110 52 124 58 134" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="${leaf}" fill="${c[1]}" ${OL}/><path d="M100 60Q102 40 112 28" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/>`));
  }
  {
    const r = rng(19);
    const pal = ['#ffffff', '#eef2f7', '#8a94a3', '#d8f0ff', '#ffe1f3', '#6b7483', '#fdfdfd'];
    let tiles = '';
    for (let i = 0; i < 34; i++) {
      const gx = Math.floor(r() * 11), gy = Math.floor(r() * 11);
      const x = 18 + gx * 15 + 1, y = 44 + gy * 15 + 1;
      tiles += `<rect x="${x}" y="${y}" width="13" height="13" fill="${pal[Math.floor(r() * pal.length)]}"/>`;
    }
    add('disco-ball', 'Disco ball', OB, 200, 220, [], () => S(200, 220,
      `<path d="M100 2V34" stroke="#8a8f98" stroke-width="3"/><rect x="90" y="30" width="20" height="12" rx="3" fill="#8a8f98"/>` +
      `<g clip-path="url(#cp)"><rect x="0" y="30" width="200" height="200" fill="#5b6472"/><rect x="18" y="44" width="165" height="165" fill="url(#p)"/>${tiles}<circle cx="100" cy="126" r="82" fill="url(#sh)"/></g>` +
      `<circle cx="100" cy="126" r="82" fill="none" stroke="#4b5563" stroke-width="3"/><path d="${sparkle(64, 86, 16)}${sparkle(146, 168, 10)}${sparkle(164, 58, 9)}" fill="#fff"/>`,
      `<clipPath id="cp"><circle cx="100" cy="126" r="82"/></clipPath><pattern id="p" width="15" height="15" patternUnits="userSpaceOnUse" x="18" y="44"><rect x="1" y="1" width="13" height="13" fill="#c3cad3"/></pattern>` +
      `<radialGradient id="sh" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>`));
  }
  add('cocktail', 'Cocktail', OB, 200, 220, ['#ff7aa2', '#ffd23f'], (c) => S(200, 220,
    `<path d="M70 20L96 100" stroke="${K}" stroke-width="4" stroke-linecap="round"/><circle cx="76" cy="40" r="13" fill="#d7263d" ${OL}/>` +
    `<path d="M28 62Q100 66 172 62Q168 128 100 134Q32 128 28 62Z" fill="#fff" opacity=".6"/><path d="M35 78Q100 84 165 78Q158 126 100 130Q42 126 35 78Z" fill="${c[0]}"/>` +
    `<path d="M28 62Q100 66 172 62Q168 128 100 134Q32 128 28 62Z" fill="none" ${OL}/><path d="M48 90Q52 108 66 118" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M100 134V196" ${OL}/><ellipse cx="100" cy="200" rx="40" ry="9" fill="#fff" ${OL}/>` +
    `<circle cx="160" cy="60" r="24" fill="${c[1]}" ${OL}/><circle cx="160" cy="60" r="16" fill="#fffbe6"/><path d="M160 46V74M146 60H174M150 50L170 70M170 50L150 70" stroke="${c[1]}" stroke-width="3"/>`));
  {
    const seal = scallop(110, 92, 22, 10, 1.4);
    add('envelope-heart', 'Love letter', OB, 220, 160, ['#fbeee0', '#e0233d'], (c) => S(220, 160,
      `<rect x="14" y="20" width="192" height="124" rx="8" fill="${c[0]}" ${OL}/><path d="M18 140L88 86M202 140L132 86" stroke="${K}" stroke-width="4" stroke-linecap="round" opacity=".55"/>` +
      `<path d="M18 24L110 94L202 24Z" fill="${c[0]}" ${OL}/><path d="M24 28L110 94L196 28Z" fill="#000" opacity=".05"/>` +
      `<path d="${seal}" fill="${c[1]}" ${OL}/><path d="${heart(110, 93, 0.25)}" fill="#000" opacity=".22"/>`));
  }
  add('paper-plane', 'Paper plane', OB, 220, 170, ['#ffffff'], (c) => S(220, 170,
    `<path d="M10 158C40 160 62 142 54 126C46 112 28 124 40 136C52 148 80 140 100 124" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 9"/>` +
    `<path d="M210 18L56 72L118 92Z" fill="${c[0]}" ${OL}/><path d="M210 18L118 92L142 140Z" fill="${c[0]}" ${OL}/><path d="M210 18L118 92L142 140Z" fill="#000" opacity=".12"/><path d="M118 92L142 140L110 118Z" fill="${c[0]}" ${OL}/><path d="M118 92L142 140L110 118Z" fill="#000" opacity=".28"/>`));
  add('gift-box', 'Gift box', OB, 200, 210, ['#7cc6fe', '#ff5d8f'], (c) => S(200, 210,
    `<path d="M100 68C70 26 36 46 54 66C64 76 88 74 100 68ZM100 68C130 26 164 46 146 66C136 76 112 74 100 68Z" fill="${c[1]}" ${OL}/>` +
    `<rect x="34" y="98" width="132" height="98" rx="6" fill="${c[0]}" ${OL}/><rect x="34" y="102" width="132" height="10" fill="#000" opacity=".1"/><rect x="88" y="98" width="24" height="98" fill="${c[1]}" ${OL}/>` +
    `<rect x="24" y="68" width="152" height="34" rx="6" fill="${c[0]}" ${OL}/><rect x="88" y="68" width="24" height="34" fill="${c[1]}" ${OL}/><rect x="89" y="56" width="22" height="16" rx="6" fill="${c[1]}" ${OL}/>` +
    `<path d="M36 80H76" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>`));
  add('balloon', 'Balloon', OB, 140, 240, ['#ff4d6d'], (c) => S(140, 240,
    `<path d="M70 168C60 186 80 196 66 212C58 222 74 228 70 236" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M62 158L78 158L82 170L58 170Z" fill="${c[0]}" ${OL}/><path d="M70 12C112 12 128 50 126 82C124 122 94 150 74 158H66C46 150 16 122 14 82C12 50 28 12 70 12Z" fill="${c[0]}" ${OL}/>` +
    `<ellipse cx="44" cy="62" rx="9" ry="20" transform="rotate(22 44 62)" fill="#fff" opacity=".5"/><circle cx="56" cy="34" r="4" fill="#fff" opacity=".5"/>`));
  {
    const cand = (x) => `<rect x="${x - 6}" y="50" width="12" height="40" rx="2" fill="#fff" ${OL}/><path d="M${x - 6} 62L${x + 6} 56M${x - 6} 76L${x + 6} 70" stroke="%C1%" stroke-width="3"/><path d="M${x} 50V44" stroke="${K}" stroke-width="3"/><path d="M${x} 22C${x + 9} 32 ${x + 8} 42 ${x} 42C${x - 8} 42 ${x - 9} 32 ${x} 22Z" fill="#ffcf3f" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>`;
    add('cake', 'Birthday cake', OB, 220, 220, ['#f7d7a8', '#ff8fc1'], (c) => S(220, 220,
      `<ellipse cx="110" cy="194" rx="96" ry="14" fill="#fff" ${OL}/><path d="M34 100H186V180Q186 190 176 190H44Q34 190 34 180Z" fill="${c[0]}" ${OL}/><rect x="34" y="144" width="152" height="12" fill="${c[1]}" ${OL}/>` +
      (cand(72) + cand(110) + cand(148)).replace(/%C1%/g, c[1]) +
      `<path d="M30 104Q30 88 46 88H174Q190 88 190 104V112Q190 124 180 124Q170 124 170 114Q170 134 156 134Q142 134 142 116Q142 126 130 126Q118 126 118 114Q118 140 102 140Q86 140 86 118Q86 128 74 128Q62 128 62 114Q62 132 48 132Q34 132 34 118Q30 116 30 104Z" fill="${c[1]}" ${OL}/>` +
      `<g stroke-width="4" stroke-linecap="round"><path d="M52 164L58 170" stroke="#4dabf7"/><path d="M84 172L92 168" stroke="#ffd43b"/><path d="M128 166L134 172" stroke="#69db7c"/><path d="M160 172L168 168" stroke="#4dabf7"/><path d="M60 102L68 98" stroke="#fff"/><path d="M150 100L158 104" stroke="#fff"/><path d="M104 104L110 98" stroke="#fff"/></g>`));
  }
  add('candle', 'Candle', OB, 120, 230, ['#ffb3c7'], (c) => S(120, 230,
    `<circle cx="60" cy="56" r="42" fill="#ffd93d" opacity=".22"/><path d="M60 18C76 40 80 56 74 68C70 76 50 76 46 68C40 56 44 40 60 18Z" fill="#ff9f1c" ${OL}/><path d="M60 40C67 52 68 60 64 66C62 69 58 69 56 66C52 60 54 52 60 40Z" fill="#ffe066"/>` +
    `<path d="M60 74V92" stroke="${K}" stroke-width="4" stroke-linecap="round"/><path d="M36 92H84V208Q84 214 78 214H42Q36 214 36 208Z" fill="${c[0]}" ${OL}/>` +
    `<path d="M39 95H81V104Q81 112 75 112Q70 112 70 104Q70 120 62 120Q55 120 55 108Q55 114 49 114Q43 114 43 106Q39 106 39 100Z" fill="#fff" opacity=".4"/><path d="M46 124V196" stroke="#fff" stroke-opacity=".4" stroke-width="5" stroke-linecap="round"/>`));
  add('key', 'Vintage key', OB, 220, 120, ['#f2b84b'], (c) => S(220, 120,
    `<path d="M76 52H202Q210 52 210 60V96H198V84H188V96H176V68H76Z" fill="${c[0]}" ${OL}/><rect x="78" y="44" width="12" height="32" rx="3" fill="${c[0]}" ${OL}/>` +
    `<path d="${circ(46, 60, 34)}${circ(46, 60, 13)}" fill="${c[0]}" fill-rule="evenodd" ${OL}/><path d="${circ(46, 60, 23)}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3"/><path d="M28 44A24 24 0 0 1 44 34M96 58H170" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>`));
  {
    const UW = 'M108 82C90 40 58 14 30 22C6 30 10 70 30 88C50 104 86 100 108 90Z';
    const LW = 'M108 96C86 100 52 110 46 136C40 160 68 168 84 156C98 146 106 122 108 102Z';
    add('butterfly', 'Butterfly', OB, 220, 180, ['#ff9f43', '#ffe3b3'], (c) => S(220, 180,
      `<path d="${UW}${mirror(UW, 220)}${LW}${mirror(LW, 220)}" fill="${c[0]}" ${OL}/>` +
      `<g fill="${c[1]}"><circle cx="50" cy="50" r="11"/><circle cx="170" cy="50" r="11"/><circle cx="72" cy="134" r="8"/><circle cx="148" cy="134" r="8"/><circle cx="80" cy="74" r="6"/><circle cx="140" cy="74" r="6"/></g>` +
      `<rect x="102" y="54" width="16" height="100" rx="8" fill="${K}"/><path d="M104 54C98 36 88 26 80 22M116 54C122 36 132 26 140 22" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/><circle cx="79" cy="21" r="5" fill="${K}"/><circle cx="141" cy="21" r="5" fill="${K}"/>`));
  }
  add('tulip', 'Tulip', OB, 140, 240, ['#ff5c8a', '#4a9e5c'], (c) => S(140, 240,
    `<path d="M70 110C72 150 68 190 70 230" fill="none" stroke="${K}" stroke-width="16" stroke-linecap="round"/><path d="M70 110C72 150 68 190 70 230" fill="none" stroke="${c[1]}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M68 210C40 200 22 168 24 136C48 150 64 176 68 210Z" fill="${c[1]}" ${OL}/><path d="M72 186C96 178 114 154 114 124C92 136 76 158 72 186Z" fill="${c[1]}" ${OL}/>` +
    `<path d="M34 46L54 66L70 36L86 66L106 46C114 92 100 120 70 120C40 120 26 92 34 46Z" fill="${c[0]}" ${OL}/><path d="M54 66C56 92 62 108 70 118M86 66C84 92 78 108 70 118" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/><path d="M44 66C44 82 48 96 56 104" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>`));
  add('shopping-bag', 'Shopping bag', OB, 180, 220, ['#ffc2d1', '#ff4f79'], (c) => S(180, 220,
    `<path d="M58 84V56Q58 24 90 24Q122 24 122 56V84" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M26 70H154L166 202Q166 210 158 210H22Q14 210 14 202Z" fill="${c[0]}" ${OL}/><path d="M28 73H152L154 92H26Z" fill="#000" opacity=".08"/>` +
    `<circle cx="58" cy="86" r="4.5" fill="${K}"/><circle cx="122" cy="86" r="4.5" fill="${K}"/><path d="${heart(90, 148, 0.62)}" fill="${c[1]}"/>`));
  add('headphones', 'Headphones', OB, 220, 200, ['#7b61ff', '#ffd6e8'], (c) => S(220, 200,
    `<path d="M40 128V104Q40 24 110 24Q180 24 180 104V128" fill="none" stroke="${K}" stroke-width="22" stroke-linecap="round"/><path d="M40 128V104Q40 24 110 24Q180 24 180 104V128" fill="none" stroke="${c[0]}" stroke-width="10" stroke-linecap="round"/>` +
    `<rect x="54" y="116" width="22" height="64" rx="10" fill="${c[1]}" ${OL}/><rect x="144" y="116" width="22" height="64" rx="10" fill="${c[1]}" ${OL}/>` +
    `<rect x="18" y="106" width="46" height="84" rx="20" fill="${c[0]}" ${OL}/><rect x="156" y="106" width="46" height="84" rx="20" fill="${c[0]}" ${OL}/><path d="M30 124V160M168 124V160" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>`));

  /* ============================================================ RETRO & Y2K */
  const RY = 'Retro & Y2K';
  const CHROME = '<linearGradient id="cr" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#dde2ea"/><stop offset=".47" stop-color="#8e97a5"/><stop offset=".53" stop-color="#3f4652"/><stop offset=".68" stop-color="#a9b2bf"/><stop offset=".86" stop-color="#f4f6fa"/><stop offset="1" stop-color="#b3bcc9"/></linearGradient>' +
    '<linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#7c8593"/><stop offset="1" stop-color="#ffffff"/></linearGradient>' +
    '<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>';
  const chrome = (d, hl = '') =>
    `<path d="${d}" fill="url(#cr)"/><path d="${d}" fill="none" stroke="url(#rim)" stroke-width="5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#3b414b" stroke-opacity=".6" stroke-width="1.5" stroke-linejoin="round"/>${hl}`;
  {
    const d = roundPoly(starPts(100, 106, 92, 42, 5), [10, 6]);
    add('chrome-star', 'Chrome star', RY, 200, 200, [], () => S(200, 200,
      chrome(d, `<ellipse cx="82" cy="78" rx="12" ry="5" transform="rotate(-30 82 78)" fill="#fff" filter="url(#bl)"/><path d="${sparkle(132, 70, 14)}" fill="#fff"/>`), CHROME));
  }
  {
    const d = heart(100, 104, 1.76);
    add('chrome-heart', 'Chrome heart', RY, 200, 200, [], () => S(200, 200,
      chrome(d, `<ellipse cx="58" cy="62" rx="16" ry="7" transform="rotate(-40 58 62)" fill="#fff" filter="url(#bl)"/><path d="${sparkle(144, 52, 13)}" fill="#fff"/>`), CHROME));
  }
  {
    const d = sparkle(100, 100, 90, 0.1);
    add('chrome-sparkle', 'Chrome sparkle', RY, 200, 200, [], () => S(200, 200,
      chrome(d, `<ellipse cx="94" cy="60" rx="3" ry="16" fill="#fff" filter="url(#bl)"/>`), CHROME));
  }
  add('smiley-classic', 'Classic smiley', RY, 200, 200, ['#ffd400', '#1d1d1b'], (c) => S(200, 200,
    `<circle cx="100" cy="100" r="86" fill="${c[0]}" stroke="${c[1]}" stroke-width="5"/><ellipse cx="74" cy="76" rx="9" ry="18" fill="${c[1]}"/><ellipse cx="126" cy="76" rx="9" ry="18" fill="${c[1]}"/>` +
    `<path d="M48 114Q100 170 152 114M42 108L56 120M158 108L144 120" fill="none" stroke="${c[1]}" stroke-width="7" stroke-linecap="round"/>`));
  add('peace', 'Peace sign', RY, 200, 200, ['#7c5cff'], (c) => S(200, 200,
    `<g fill="none" stroke="${c[0]}" stroke-width="20"><circle cx="100" cy="100" r="74"/><path d="M100 28V172M100 100L48 152M100 100L152 152"/></g>`));
  add('checker-patch', 'Checkerboard', RY, 200, 200, ['#ff6fb5', '#fff0f7'], (c) => S(200, 200,
    `<rect x="14" y="14" width="172" height="172" rx="34" fill="${c[1]}"/><rect x="14" y="14" width="172" height="172" rx="34" fill="url(#p)"/><rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="2"/>`,
    `<pattern id="p" width="57.33" height="57.33" patternUnits="userSpaceOnUse" x="14" y="14"><rect width="28.67" height="28.67" fill="${c[0]}"/><rect x="28.67" y="28.67" width="28.67" height="28.67" fill="${c[0]}"/></pattern>`));
  {
    let pet = '';
    for (let i = 0; i < 6; i++) { const p = pol(100, 100, 52, i * 60 - 90); pet += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="36"/>`; }
    add('y2k-flower', 'Y2K flower', RY, 200, 200, ['#b48cff', '#fff36b'], (c) => S(200, 200,
      `<g fill="${c[0]}">${pet}</g><circle cx="100" cy="100" r="32" fill="${c[1]}"/><ellipse cx="72" cy="38" rx="12" ry="6" transform="rotate(-30 72 38)" fill="#fff" opacity=".4"/><ellipse cx="90" cy="88" rx="9" ry="5" transform="rotate(-30 90 88)" fill="#fff" opacity=".6"/>`));
  }
  add('sun-70s', '70s sunset', RY, 200, 112, ['#ffcf3f', '#ff9640', '#ff5e5b'], (c) => S(200, 112,
    `<g clip-path="url(#cp)"><rect x="0" y="0" width="200" height="50" fill="${c[0]}"/><rect x="0" y="57" width="200" height="20" fill="${c[1]}"/><rect x="0" y="83" width="200" height="11" fill="${c[2]}"/><rect x="0" y="99" width="200" height="5" fill="${c[2]}"/></g>`,
    `<clipPath id="cp"><path d="M8 104A92 92 0 0 1 192 104Z"/></clipPath>`));
  {
    const base = samp((t) => [30 + 200 * t, 80 + 32 * Math.cos(t * PI)], 40);
    const band = (o) => smooth(base.map((p, i) => {
      const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [p[0] - ((b[1] - a[1]) / l) * o, p[1] + ((b[0] - a[0]) / l) * o];
    }).filter((p, i) => i % 2 === 0));
    add('groovy-rainbow', 'Groovy waves', RY, 260, 160, ['#ff6b6b', '#ffb347', '#6ecbb5'], (c) => S(260, 160,
      `<g fill="none" stroke-width="26" stroke-linecap="round"><path d="${band(-26)}" stroke="${c[0]}"/><path d="${band(0)}" stroke="${c[1]}"/><path d="${band(26)}" stroke="${c[2]}"/></g>`));
  }
  {
    const r = rng(63); const p = [];
    for (let i = 0; i < 7; i++) p.push(pol(100, 100, 68 + r() * 22, (i * 360) / 7 + r() * 12));
    const d = smooth(p, true);
    add('holo-blob', 'Holographic blob', RY, 200, 200, [], () => S(200, 200,
      `<path d="${d}" fill="url(#h1)"/><path d="${d}" fill="url(#h2)"/><path d="${d}" fill="url(#h3)"/><path d="${sparkle(136, 66, 13)}" fill="#fff"/><ellipse cx="70" cy="70" rx="20" ry="9" transform="rotate(-35 70 70)" fill="#fff" opacity=".7" filter="url(#bl)"/>`,
      `<linearGradient id="h1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc6ec"/><stop offset=".3" stop-color="#c9b8ff"/><stop offset=".55" stop-color="#9ee9ff"/><stop offset=".78" stop-color="#c2ffd9"/><stop offset="1" stop-color="#fff1a8"/></linearGradient>` +
      `<linearGradient id="h2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ee6" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#7fd8ff" stop-opacity=".55"/></linearGradient>` +
      `<radialGradient id="h3" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`));
  }
  {
    const d = roundPoly(starPts(100, 100, 92, 46, 8, -90), [4, 3]);
    add('star-8-gradient', 'Gradient star', RY, 200, 200, ['#ff6ec7', '#7873f5'], (c) => S(200, 200,
      `<path d="${d}" fill="url(#g)"/><path d="${sparkle(78, 74, 10)}" fill="#fff" opacity=".85"/>`,
      `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`));
  }
  add('planet', 'Planet', RY, 220, 180, ['#ff9a8b', '#ffd36e'], (c) => S(220, 180,
    `<g transform="rotate(-18 110 92)"><ellipse cx="110" cy="92" rx="96" ry="24" fill="none" stroke="${c[1]}" stroke-width="10"/></g>` +
    `<circle cx="110" cy="92" r="54" fill="${c[0]}"/><path d="M50 76Q110 64 170 82M50 110Q110 98 170 118" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="7" clip-path="url(#pc)"/><circle cx="110" cy="92" r="54" fill="url(#sp)"/>` +
    `<g transform="rotate(-18 110 92)"><path d="M14 92A96 24 0 0 0 206 92" fill="none" stroke="${c[1]}" stroke-width="10" stroke-linecap="round"/></g>` +
    `<path d="${sparkle(28, 30, 10)}${sparkle(196, 150, 8)}${sparkle(190, 24, 5)}" fill="${c[1]}"/>`,
    `<clipPath id="pc"><circle cx="110" cy="92" r="54"/></clipPath><radialGradient id="sp" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>`));
  add('lips', 'Lips', RY, 220, 130, ['#e0234e'], (c) => S(220, 130,
    `<path d="M12 64C40 40 70 18 92 22C100 24 106 30 110 34C114 30 120 24 128 22C150 18 180 40 208 64C180 66 150 62 110 66C70 62 40 66 12 64Z" fill="${c[0]}"/>` +
    `<path d="M12 64C40 66 70 62 110 66C150 62 180 66 208 64C186 96 150 116 110 116C70 116 34 96 12 64Z" fill="${c[0]}"/><path d="M12 64C40 40 70 18 92 22C100 24 106 30 110 34C114 30 120 24 128 22C150 18 180 40 208 64C180 66 150 62 110 66C70 62 40 66 12 64Z" fill="#000" opacity=".1"/>` +
    `<path d="M16 64C40 66 70 62 110 66C150 62 180 66 204 64" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="88" cy="94" rx="22" ry="6" transform="rotate(-4 88 94)" fill="#fff" opacity=".45"/><ellipse cx="140" cy="40" rx="10" ry="4" transform="rotate(-12 140 40)" fill="#fff" opacity=".4"/>`));
  {
    const UW = 'M108 82C90 40 58 14 30 22C6 30 10 70 30 88C50 104 86 100 108 90Z';
    const LW = 'M108 96C86 100 52 110 46 136C40 160 68 168 84 156C98 146 106 122 108 102Z';
    const W = UW + mirror(UW, 220) + LW + mirror(LW, 220);
    add('butterfly-chrome', 'Chrome butterfly', RY, 220, 180, [], () => S(220, 180,
      chrome(W) + `<rect x="103" y="56" width="14" height="96" rx="7" fill="url(#cr)" stroke="#3b414b" stroke-opacity=".6" stroke-width="1.5"/><path d="M104 56C98 38 88 28 80 24M116 56C122 38 132 28 140 24" fill="none" stroke="#7c8593" stroke-width="3.5" stroke-linecap="round"/>` +
      `<ellipse cx="48" cy="40" rx="12" ry="5" transform="rotate(-25 48 40)" fill="#fff" filter="url(#bl)"/><ellipse cx="172" cy="40" rx="12" ry="5" transform="rotate(25 172 40)" fill="#fff" filter="url(#bl)"/><path d="${sparkle(64, 128, 9)}${sparkle(184, 70, 8)}" fill="#fff"/>`, CHROME));
  }

  /* ============================================================ PIXEL & WEB */
  const PW = 'Pixel & Web';

  // mix a #rgb / #rrggbb colour toward white (t > 0) or black (t < 0); other formats pass through
  function tint(col, t) {
    let h = String(col).trim().replace(/^#/, '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(h)) return col;
    return '#' + [0, 2, 4].map((i) => {
      const n = parseInt(h.slice(i, i + 2), 16);
      return Math.round(t > 0 ? n + (255 - n) * t : n * (1 + t)).toString(16).padStart(2, '0');
    }).join('');
  }

  // pixel art -> crisp <rect>s. rows: strings with one char per cell ('.' = empty); pal: { char: colour },
  // a colour may carry an opacity as '#000/.3'. Horizontal runs of one char become a single rect, identical
  // runs on consecutive rows merge vertically, and rects are grouped per colour to keep the markup small.
  function pix(rows, pal, s, ox = 0, oy = 0) {
    const runs = [];
    let prev = {};
    rows.forEach((row, y) => {
      const cur = {};
      for (let x = 0; x < row.length;) {
        const ch = row[x];
        let e = x + 1;
        while (e < row.length && row[e] === ch) e++;
        if (pal[ch]) {
          const k = x + ',' + e + ch;
          const r = prev[k] || { x, n: e - x, y, h: 0, col: pal[ch] };
          if (!prev[k]) runs.push(r);
          r.h++;
          cur[k] = r;
        }
        x = e;
      }
      prev = cur;
    });
    const g = {};
    for (const r of runs) (g[r.col] = g[r.col] || []).push(`<rect x="${f(ox + r.x * s)}" y="${f(oy + r.y * s)}" width="${f(r.n * s)}" height="${f(r.h * s)}"/>`);
    return '<g shape-rendering="crispEdges">' + Object.keys(g).map((k) => {
      const [col, op] = k.split('/');
      return `<g fill="${col}"${op ? ` fill-opacity="${op}"` : ''}>${g[k].join('')}</g>`;
    }).join('') + '</g>';
  }
  // palette mapping every used char to one colour (silhouettes / drop shadows)
  const silPal = (rows, col) => { const p = {}; rows.join('').replace(/[^. ]/g, (ch) => (p[ch] = col)); return p; };

  // build a char grid: ops are fills [ch, x, y, w, h] or stamps [rows, x, y] ('.' in a stamp is see-through)
  function pgrid(w, h, ops) {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const set = (x, y, ch) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = ch; };
    for (const o of ops) {
      if (Array.isArray(o[0])) o[0].forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') set(o[1] + i, o[2] + j, ch); }));
      else for (let j = 0; j < o[4]; j++) for (let i = 0; i < o[3]; i++) set(o[1] + i, o[2] + j, o[0]);
    }
    return g.map((r) => r.join(''));
  }
  // wrap every filled cell in a 1-cell outline (4-neighbour, so corners stay soft); grid grows 1 cell per side
  function pout(rows, ch = 'K') {
    const at = (x, y) => (rows[y - 1] || '')[x - 1] || '.';
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0) + 2, o = [];
    for (let y = 0; y < rows.length + 2; y++) {
      let s = '';
      for (let x = 0; x < w; x++) {
        const c = at(x, y);
        s += c !== '.' ? c : (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') ? ch : '.';
      }
      o.push(s);
    }
    return o;
  }
  // pixel sticker: s = cell size, palFn(c) -> palette, shadow = drop-shadow offset in cells
  function addPx(id, name, rows, s, colors, palFn, shadow = 0) {
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0) * s + shadow * s, h = rows.length * s + shadow * s;
    const sp = silPal(rows, '#000/.28');
    add(id, name, PW, w, h, colors, (c) => S(w, h, (shadow ? pix(rows, sp, s, shadow * s, shadow * s) : '') + pix(rows, palFn(c), s)));
  }

  {
    const ARROW = [
      'K...........',
      'KK..........',
      'KWK.........',
      'KWWK........',
      'KWWWK.......',
      'KWWWWK......',
      'KWWWWWK.....',
      'KWWWWWWK....',
      'KWWWWWWWK...',
      'KWWWWWWWWK..',
      'KWWWWWWWWWK.',
      'KWWWWWWKKKKK',
      'KWWWKWWK....',
      'KWWK.KWWK...',
      'KWK..KWWK...',
      'KK....KWWK..',
      'K.....KWWK..',
      '.......KWWK.',
      '.......KWWK.',
      '........KK..',
    ];
    const cur = (c) => ({ K: c[1], W: c[0] });
    addPx('px-cursor', 'Pixel cursor', ARROW, 10, ['#ffffff', '#000000'], cur);
    addPx('px-cursor-shadow', 'Cursor with shadow', ARROW, 11, ['#ffffff', '#000000'], cur, 1);
    const HAND = [
      '.....KK..........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWK.........',
      '....KWWKKK.......',
      '....KWWKWWKKK....',
      '....KWWKWWKWWKK..',
      '....KWWKWWKWWKWK.',
      '.KK.KWWWWWWWWKWWK',
      'KWWKKWWWWWWWWWWWK',
      'KWWWKWWWWWWWWWWWK',
      '.KWWKWWWWWWWWWWWK',
      '..KWWWWWWWWWWWWWK',
      '..KWWWWWWWWWWWWWK',
      '...KWWWWWWWWWWWK.',
      '...KWWWWWWWWWWWK.',
      '....KWWWWWWWWWK..',
      '....KWWWWWWWWWK..',
      '.....KWWWWWWWK...',
      '.....KKKKKKKKK...',
    ];
    addPx('px-hand', 'Pointing hand cursor', HAND, 10, ['#ffffff', '#000000'], cur);
    const GLASS = [
      'KKKKKKKKKKKKK',
      'KWWWWWWWWWWWK',
      'KKKKKKKKKKKKK',
      '.KWWWWWWWWWK.',
      '.KWSSSSSSSWK.',
      '.KWWSSSSSWWK.',
      '..KWWSSSWWK..',
      '...KWWSWWK...',
      '....KWSWK....',
      '.....KSK.....',
      '....KWSWK....',
      '...KWWSWWK...',
      '..KWWWSWWWK..',
      '.KWWWWSWWWWK.',
      '.KWWWSSSWWWK.',
      '.KWSSSSSSSWK.',
      'KKKKKKKKKKKKK',
      'KWWWWWWWWWWWK',
      'KKKKKKKKKKKKK',
    ];
    addPx('px-hourglass', 'Hourglass cursor', GLASS, 12, ['#e0a526'], (c) => ({ K: K, W: '#ffffff', S: c[0] }));
  }
  {
    const PC = pgrid(32, 30, [
      ['K', 4, 0, 24, 20], ['B', 5, 1, 22, 18], ['H', 5, 1, 22, 1], ['H', 5, 1, 1, 17], ['D', 26, 1, 1, 18], ['D', 5, 18, 22, 1],
      ['K', 7, 3, 18, 13], ['S', 8, 4, 16, 11], ['h', 9, 5, 2, 1], ['h', 9, 6, 1, 1],
      ['s', 12, 7, 10, 7], ['W', 11, 6, 10, 7], ['T', 11, 6, 10, 2], ['W', 19, 6, 1, 1], ['g', 12, 9, 6, 1], ['g', 12, 11, 4, 1],
      ['G', 23, 16, 2, 1],
      ['K', 11, 20, 10, 2], ['D', 12, 20, 8, 1],
      ['K', 1, 22, 30, 8], ['B', 2, 23, 28, 6], ['H', 2, 23, 28, 1], ['H', 2, 23, 1, 5], ['D', 29, 23, 1, 6], ['D', 2, 28, 28, 1],
      ['K', 17, 25, 10, 1], ['D', 17, 26, 10, 1], ['G', 4, 26, 2, 1], ['D', 8, 25, 1, 2], ['D', 10, 25, 1, 2], ['D', 12, 25, 1, 2],
    ]);
    addPx('px-computer', 'Retro computer', PC, 7, ['#e3d8bb', '#2a5bd7'], (c) => ({
      K: K, B: c[0], H: tint(c[0], 0.6), D: tint(c[0], -0.2), S: c[1], h: tint(c[1], 0.4), s: tint(c[1], -0.35),
      W: '#ffffff', T: '#0b1f7a', g: '#a9b3c6', G: '#35c75a',
    }));
  }
  {
    const FOLDER = pout(pgrid(22, 16, [
      ['b', 0, 0, 8, 2], ['b', 0, 2, 22, 14],
      ['K', 0, 4, 22, 1], ['Y', 0, 5, 22, 11], ['H', 0, 5, 22, 1], ['d', 0, 15, 22, 1], ['d', 21, 5, 1, 11],
    ]));
    addPx('px-folder', 'Pixel folder', FOLDER, 9, ['#dcd44a'], (c) => ({
      K: K, Y: c[0], b: tint(c[0], -0.22), H: tint(c[0], 0.5), d: tint(c[0], -0.12),
    }));
  }
  {
    const DOC = pgrid(17, 22, [[[
      'KKKKKKKKKKKK.....',
      'KWWWWWWWWWWKK....',
      'KWWWWWWWWWWKgK...',
      'KWWWWWWWWWWKggK..',
      'KWWWWWWWWWWKgggK.',
      'KWWWWWWWWWWKKKKKK',
    ], 0, 0], ['K', 0, 6, 17, 16], ['W', 1, 6, 15, 15], ['p', 15, 6, 1, 15],
    ['L', 3, 8, 11, 1], ['L', 3, 10, 9, 1], ['L', 3, 12, 11, 1], ['L', 3, 14, 7, 1], ['L', 3, 16, 10, 1], ['L', 3, 18, 8, 1]]);
    addPx('px-document', 'Pixel document', DOC, 10, ['#7d9be8'], (c) => ({ K: K, W: '#ffffff', g: '#d6dae3', p: '#e9ecf2', L: c[0] }));
  }
  {
    const FLOPPY = pgrid(22, 22, [
      ['K', 0, 0, 22, 22], ['C', 1, 1, 20, 20], ['h', 1, 1, 19, 1], ['h', 1, 1, 1, 19], ['d', 20, 1, 1, 20], ['d', 1, 20, 20, 1],
      ['M', 5, 1, 12, 7], ['m', 5, 7, 12, 1], ['m', 16, 1, 1, 7], ['k', 12, 2, 3, 4],
      ['W', 3, 11, 16, 10], ['L', 5, 13, 12, 1], ['L', 5, 15, 12, 1], ['L', 5, 17, 8, 1], ['k', 1, 18, 1, 2],
      ['.', 20, 0, 2, 1], ['.', 21, 1, 1, 1], ['K', 20, 1, 1, 1], ['K', 21, 2, 1, 1],
    ]);
    addPx('px-floppy', 'Floppy disk', FLOPPY, 10, ['#3d5fd9'], (c) => ({
      K: K, C: c[0], h: tint(c[0], 0.3), d: tint(c[0], -0.3), M: '#d2d7de', m: '#9aa1ab', k: '#3a3f47', W: '#ffffff', L: '#b9c4d8',
    }));
  }
  {
    const HEART = [
      '..KKK...KKK..',
      '.KRRRK.KRRRK.',
      'KRWWRRKRRRRRK',
      'KRWRRRRRRRRRK',
      'KRRRRRRRRRRRK',
      'KRRRRRRRRRRdK',
      '.KRRRRRRRRdK.',
      '..KRRRRRRdK..',
      '...KRRRRdK...',
      '....KRRdK....',
      '.....KdK.....',
      '......K......',
    ];
    addPx('px-heart', 'Pixel heart', HEART, 15, ['#ff4f8b'], (c) => ({ K: K, R: c[0], d: tint(c[0], -0.22), W: '#ffffff' }));
    const STAR = [
      '........K........',
      '.......KYK.......',
      '.......KYK.......',
      '......KYYYK......',
      '......KYYYK......',
      'KKKKKKYYYYYKKKKKK',
      '.KYWWYYYYYYYYYYK.',
      '..KYWYYYYYYYYYK..',
      '...KYYYYYYYYYK...',
      '....KYYYYYYYK....',
      '....KYYYYYYYK....',
      '...KYYYYYYYYYK...',
      '...KYYYYKYYYYK...',
      '..KYYYYK.KYYYYK..',
      '..KYYKK...KKYYK..',
      '.KYKK.......KKYK.',
      '.KK...........KK.',
    ];
    addPx('px-star', 'Pixel star', STAR, 12, ['#ffd23f'], (c) => ({ K: K, Y: c[0], d: tint(c[0], -0.2), W: '#ffffff' }));
    const SMILEY = [
      '.....KKKKKK.....',
      '...KKYYYYYYKK...',
      '..KYWWYYYYYYYK..',
      '.KYWYYYYYYYYYYK.',
      '.KYYYKYYYYKYYYK.',
      'KYYYYKYYYYKYYYYK',
      'KYYYYKYYYYKYYYYK',
      'KYYYYYYYYYYYYYYK',
      'KYYYYYYYYYYYYYdK',
      'KYYKYYYYYYYYKYdK',
      'KYYYKYYYYYYKYYdK',
      '.KYYYKKKKKKYYdK.',
      '.KYYYYYYYYYYYdK.',
      '..KYYYYYYYYddK..',
      '...KKddddddKK...',
      '.....KKKKKK.....',
    ];
    addPx('px-smiley', 'Pixel smiley', SMILEY, 13, ['#ffd400', '#1d1d1b'], (c) => ({ K: c[1], Y: c[0], d: tint(c[0], -0.15), W: '#ffffff' }));
    const SPARK = pgrid(19, 19, [[[
      '.......K.......',
      '......KYK......',
      '......KYK......',
      '......KYK......',
      '.....KYYYK.....',
      '....KKYYYKK....',
      '.KKKYYYWYYYKKK.',
      'KYYYYYWWWYYYYYK',
      '.KKKYYYWYYYKKK.',
      '....KKYYYKK....',
      '.....KYYYK.....',
      '......KYK......',
      '......KYK......',
      '......KYK......',
      '.......K.......',
    ], 0, 4], [['..K..', '.KYK.', 'KYWYK', '.KYK.', '..K..'], 14, 0], [['.K.', 'KYK', '.K.'], 15, 13]]);
    addPx('px-sparkle', 'Pixel sparkle', SPARK, 11, ['#ffe14d'], (c) => ({ K: K, Y: c[0], W: '#ffffff' }));
  }
  {
    const X = ['KK..KK', '.KKKK.', '..KK..', '.KKKK.', 'KK..KK'];
    const WIN = pgrid(56, 42, [
      ['G', 0, 0, 56, 42], ['l', 0, 0, 55, 1], ['l', 0, 0, 1, 41], ['K', 0, 41, 56, 1], ['K', 55, 0, 1, 42],
      ['W', 1, 1, 53, 1], ['W', 1, 1, 1, 39], ['D', 1, 40, 54, 1], ['D', 54, 1, 1, 40],
      ['T', 3, 3, 50, 10],
      ['W', 41, 4, 10, 1], ['W', 41, 4, 1, 7], ['K', 41, 11, 11, 1], ['K', 51, 4, 1, 8], ['D', 42, 10, 9, 1], ['D', 50, 5, 1, 6], ['G', 42, 5, 8, 5], [X, 43, 5],
    ]);
    addPx('px-window', 'Retro dialog window', WIN, 4, ['#000080', '#c0c0c0'], (c) => ({
      K: K, W: '#ffffff', T: c[0], G: c[1], l: tint(c[1], 0.55), D: tint(c[1], -0.33),
    }));
  }
  {
    const ops = [['K', 1, 0, 54, 1], ['K', 1, 13, 54, 1], ['K', 0, 1, 1, 12], ['K', 55, 1, 1, 12], ['W', 1, 1, 54, 12], ['g', 1, 1, 54, 1], ['g', 1, 1, 1, 12]];
    for (let i = 0; i < 7; i++) ops.push(['F', 3 + i * 5, 3, 4, 8], ['f', 3 + i * 5, 3, 4, 2], ['e', 3 + i * 5, 10, 4, 1]);
    addPx('px-progress', 'Loading bar', pgrid(56, 14, ops), 4, ['#4f7cff'], (c) => ({
      K: K, W: '#ffffff', g: '#c9ccd3', F: c[0], f: tint(c[0], 0.35), e: tint(c[0], -0.25),
    }));
  }
  {
    const dot = (ch) => ['.' + ch.repeat(3) + '.', ch.repeat(5), ch.repeat(5), ch.repeat(5), '.' + ch.repeat(3) + '.'];
    const BR = pgrid(56, 44, [
      ['K', 0, 0, 56, 44], ['W', 1, 1, 54, 42], ['T', 1, 1, 54, 8], ['K', 1, 9, 54, 1],
      [dot('r'), 3, 3], [dot('y'), 9, 3], [dot('n'), 15, 3],
      ['K', 22, 2, 31, 6], ['W', 23, 3, 29, 4], ['a', 25, 4, 12, 2],
      ['K', 48, 10, 1, 33], ['g', 49, 10, 6, 33], ['s', 50, 12, 4, 10],
    ]);
    addPx('px-browser', 'Browser window', BR, 4, ['#c9b8ff', '#ffffff'], (c) => ({
      K: K, W: c[1], T: c[0], r: '#ff5f57', y: '#febc2e', n: '#28c840', a: '#d5d9e0', g: '#eceef2', s: '#b4bac6',
    }));
  }
  {
    const SPEECH = pout(pgrid(24, 17, [
      ['W', 2, 0, 20, 1], ['W', 1, 1, 22, 1], ['W', 0, 2, 24, 10], ['W', 1, 12, 22, 1], ['W', 2, 13, 20, 1],
      ['W', 3, 14, 5, 1], ['W', 3, 15, 3, 1], ['W', 3, 16, 1, 1],
      ['g', 7, 6, 2, 2], ['g', 11, 6, 2, 2], ['g', 15, 6, 2, 2],
    ]));
    addPx('px-speech', 'Pixel speech bubble', SPEECH, 8, ['#ffffff', '#9aa0aa'], (c) => ({ K: K, W: c[0], g: c[1] }), 1);
    const HRT = ['.WW.WW.', 'WWWWWWW', 'WWWWWWW', '.WWWWW.', '..WWW..', '...W...'];
    const ONE = ['.W.', 'WW.', '.W.', '.W.', '.W.', 'WWW'];
    const NOTIF = pout(pgrid(22, 15, [
      ['R', 2, 0, 18, 1], ['R', 1, 1, 20, 1], ['R', 0, 2, 22, 8], ['R', 1, 10, 20, 1], ['R', 2, 11, 18, 1],
      ['R', 8, 12, 6, 1], ['R', 9, 13, 4, 1], ['R', 10, 14, 2, 1],
      [HRT, 5, 3], [ONE, 14, 3],
    ]));
    addPx('px-notification', 'Like notification', NOTIF, 8, ['#ff3b5c'], (c) => ({ K: K, R: c[0], W: '#ffffff' }), 1);
  }
  {
    const ops = [['K', 6, 0, 6, 1], ['K', 6, 1, 1, 1], ['K', 11, 1, 1, 1], ['K', 1, 2, 16, 4], ['L', 2, 3, 14, 1], ['G', 2, 4, 14, 1]];
    for (let y = 6; y <= 20; y++) {
      const i = Math.floor((y - 6) / 6);
      ops.push(['K', 2 + i, y, 14 - 2 * i, 1], ['G', 3 + i, y, 12 - 2 * i, 1]);
      if (y > 6 && y < 20) ops.push(['D', 6, y, 1, 1], ['D', 9, y, 1, 1], ['D', 12, y, 1, 1]);
      if (y > 6 && y < 18) ops.push(['L', 5, y, 1, 1]);
    }
    ops.push(['K', 4, 21, 10, 1]);
    addPx('px-trash', 'Pixel trash bin', pgrid(18, 22, ops), 10, ['#c4c9d1'], (c) => ({ K: K, G: c[0], L: tint(c[0], 0.6), D: tint(c[0], -0.3) }));
  }
  {
    const NOTE = pout([
      '....NNNNNNNNNN',
      '....NNNNNNNNNN',
      '....NN......NN',
      '....NN......NN',
      '....NN......NN',
      '....NN......NN',
      '....NN......NN',
      '....NN......NN',
      '....NN......NN',
      '..NNNN....NNNN',
      '.NWNNN...NWNNN',
      'NNNNNN..NNNNNN',
      'NNNNN...NNNNN.',
      '.NNN.....NNN..',
    ]);
    addPx('px-music', 'Pixel music note', NOTE, 12, ['#7b5cff'], (c) => ({ K: K, N: c[0], W: tint(c[0], 0.6) }));
  }
  {
    const TRI = ['WW....', 'WWW...', 'WWWW..', 'WWWWW.', 'WWWWWW', 'WWWWW.', 'WWWW..', 'WWW...', 'WW....'];
    const PLAY = pout(pgrid(24, 17, [
      ['R', 2, 0, 20, 1], ['R', 1, 1, 22, 1], ['R', 0, 2, 24, 13], ['R', 1, 15, 22, 1], ['R', 2, 16, 20, 1],
      ['h', 2, 1, 6, 1], ['h', 1, 2, 1, 4], ['d', 2, 15, 20, 1], ['d', 22, 4, 1, 11],
      [TRI, 10, 4],
    ]));
    addPx('px-play', 'Play button', PLAY, 8, ['#ff2d55'], (c) => ({ K: K, R: c[0], h: tint(c[0], 0.4), d: tint(c[0], -0.2), W: '#ffffff' }));
  }
  {
    const ops = [['W', 0, 0, 20, 14]];
    for (let x = 0; x < 20; x++) {
      const m = Math.min(x, 19 - x), yv = Math.floor(m * 0.7);
      if (yv) ops.push(['F', x, 0, 1, yv]);
      ops.push(['K', x, yv, 1, 1]);
      if (m <= 6) ops.push(['g', x, 13 - Math.floor(m * 0.6), 1, 1]);
    }
    ops.push([['.R..R.', 'RRRRRR', 'RRRRRR', '.RRRR.', '..RR..'], 7, 5]);
    addPx('px-mail', 'Pixel mail', pout(pgrid(20, 14, ops)), 10, ['#ffffff', '#ff3b5c'], (c) => ({ K: K, W: c[0], F: tint(c[0], -0.07), g: '#c9ccd3', R: c[1] }));
  }
  {
    const ops = [];
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d <= 4.4) ops.push(['B', x, y, 1, 1]);
      else if (d <= 6.6) ops.push(['F', x, y, 1, 1]);
      else if (Math.abs(x - y) <= 1 && x + y >= 22) ops.push(['H', x, y, 1, 1]);
    }
    ops.push(['W', 4, 4, 2, 1], ['W', 4, 5, 1, 1], ['b', 8, 10, 2, 1], ['b', 10, 8, 1, 2]);
    addPx('px-magnifier', 'Pixel magnifier', pout(pgrid(18, 18, ops)), 10, ['#5b6270'], (c) => ({
      K: K, F: c[0], B: '#bfe9ff', b: '#8fd3f5', W: '#ffffff', H: '#8a5a33',
    }));
  }

  /* --------------------------------------------- cartoon shapes & objects */
  add('googly-eyes', 'Googly eyes', SH, 240, 160, ['#ffffff', '#1d1d1b'], (c) => S(240, 160,
    `<g stroke="${K}" stroke-width="8"><ellipse cx="70" cy="82" rx="54" ry="66" transform="rotate(-8 70 82)" fill="${c[0]}"/>` +
    `<ellipse cx="168" cy="78" rx="56" ry="68" transform="rotate(6 168 78)" fill="${c[0]}"/></g>` +
    `<circle cx="50" cy="96" r="24" fill="${c[1]}"/><circle cx="144" cy="92" r="25" fill="${c[1]}"/>` +
    `<circle cx="43" cy="87" r="6.5" fill="#fff"/><circle cx="137" cy="83" r="7" fill="#fff"/>`));
  add('cartoon-eye', 'Cartoon eye', SH, 160, 190, ['#ffffff', '#1d1d1b'], (c) => S(160, 190,
    `<ellipse cx="80" cy="95" rx="62" ry="81" fill="${c[0]}" stroke="${K}" stroke-width="8"/>` +
    `<path d="M30 124A58 77 0 0 0 124 152" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="10" stroke-linecap="round"/>` +
    `<ellipse cx="104" cy="110" rx="30" ry="36" fill="${c[1]}"/><circle cx="94" cy="96" r="9" fill="#fff"/><circle cx="114" cy="126" r="4" fill="#fff" opacity=".8"/>`));
  {
    const parts = (a) => a.map((p) => (p.length === 3 ? `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}"/>` : `<rect x="${p[0]}" y="${p[1]}" width="${p[2]}" height="${p[3]}" rx="${p[3] / 2}"/>`)).join('');
    // flat puffy cloud: hairline outline, cream base showing along the lower-right edges of a white top layer
    const puff = (id, a, c0, c1) => {
      const sh = parts(a);
      return `<g fill="${tint(c1, -0.1)}" stroke="${tint(c1, -0.1)}" stroke-width="3">${sh}</g><g fill="${c1}">${sh}</g>` +
        `<clipPath id="${id}">${sh}</clipPath><g clip-path="url(#${id})"><g fill="${c0}" transform="translate(-3 -6)">${sh}</g></g>`;
    };
    const WIDE = [[48, 86, 28], [88, 64, 38], [138, 56, 44], [184, 76, 32], [206, 94, 20], [28, 76, 190, 38]];
    const SMALL = [[46, 64, 24], [80, 46, 32], [116, 60, 24], [22, 56, 118, 38]];
    const BACK = [[124, 62, 24], [160, 42, 32], [198, 58, 24], [100, 56, 124, 32]];
    const FRONT = [[46, 116, 28], [86, 92, 40], [134, 88, 36], [170, 112, 26], [18, 110, 174, 44]];
    add('cloud-puffy', 'Puffy cloud', SH, 240, 130, ['#ffffff', '#f3ead7'], (c) => S(240, 130, puff('a', WIDE, c[0], c[1])));
    add('cloud-puffy-small', 'Small puffy cloud', SH, 160, 110, ['#ffffff', '#f3ead7'], (c) => S(160, 110, puff('a', SMALL, c[0], c[1])));
    add('cloud-cluster', 'Cloud cluster', SH, 240, 170, ['#ffffff', '#f3ead7'], (c) => S(240, 170, puff('a', BACK, c[0], c[1]) + puff('b', FRONT, c[0], c[1])));
  }
  {
    const ear = roundPoly([[24, 104], [36, 14], [96, 60]], 12);
    const earIn = roundPoly([[42, 82], [47, 38], [80, 62]], 8);
    add('cat-face', 'Kawaii cat', SH, 220, 200, ['#7ab8f5', '#1d1d1b'], (c) => S(220, 200,
      `<g fill="${c[0]}"><path d="${ear}"/><path d="${mirror(ear, 220)}"/><ellipse cx="110" cy="122" rx="94" ry="72"/></g>` +
      `<g fill="#ffb3c7"><path d="${earIn}"/><path d="${mirror(earIn, 220)}"/></g>` +
      `<g fill="#ff8fb1" opacity=".55"><ellipse cx="60" cy="142" rx="16" ry="10"/><ellipse cx="160" cy="142" rx="16" ry="10"/></g>` +
      `<g fill="${c[1]}"><ellipse cx="74" cy="118" rx="10" ry="13"/><ellipse cx="146" cy="118" rx="10" ry="13"/></g><g fill="#fff"><circle cx="77" cy="113" r="3.5"/><circle cx="149" cy="113" r="3.5"/></g>` +
      `<path d="M104 132H116L110 139Z" fill="#ff8fb1" stroke="#ff8fb1" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M96 142Q103 152 110 142Q117 152 124 142" ${DS(c[1], 4)}/>` +
      `<path d="M6 120L38 127M6 142L38 139M214 120L182 127M214 142L182 139" ${DS(c[1], 3.5)}/>`));
  }
  add('heart-sparkle', 'Sparkling heart', SH, 220, 210, ['#ff9ad5', '#ff2f7e', '#ffd84d'], (c) => S(220, 210,
    `<path d="${heart(110, 116, 1.72)}" fill="url(#g)"/><path d="${heart(104, 106, 1.25)}" fill="#fff" opacity=".1"/>` +
    `<ellipse cx="64" cy="76" rx="20" ry="11" transform="rotate(-40 64 76)" fill="#fff" opacity=".6"/><circle cx="90" cy="60" r="5.5" fill="#fff" opacity=".6"/>` +
    `<path d="${sparkle(186, 38, 26)}${sparkle(28, 48, 16)}${sparkle(198, 160, 13)}" fill="${c[2]}"/><path d="${sparkle(186, 38, 9)}" fill="#fff"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`));
  add('star-sticker', 'Sticker star', SH, 200, 200, ['#ffd23f'], (c) => {
    const d = roundPoly(starPts(100, 106, 84, 44, 5), [14, 8]);
    return S(200, 200,
      `<g filter="url(#sh)"><path d="${d}" fill="#fff" stroke="#fff" stroke-width="18" stroke-linejoin="round"/></g>` +
      `<path d="${d}" fill="${c[0]}" stroke="${tint(c[0], -0.14)}" stroke-width="4" stroke-linejoin="round"/>` +
      `<ellipse cx="74" cy="92" rx="15" ry="8" transform="rotate(-30 74 92)" fill="#fff" opacity=".5"/><circle cx="96" cy="70" r="5" fill="#fff" opacity=".5"/>`,
      shadowF('sh', 3, 0, 4, 0.25));
  });
  add('sun-face', 'Smiley sun', SH, 220, 220, ['#ffd23f', '#ff9f1c', '#1d1d1b'], (c) => {
    let rays = '';
    for (let i = 0; i < 12; i++) rays += roundPoly([pol(110, 110, 66, i * 30 - 101), pol(110, 110, 104, i * 30 - 90), pol(110, 110, 66, i * 30 - 79)], 5);
    return S(220, 220,
      `<path d="${rays}" fill="${c[1]}"/><circle cx="110" cy="110" r="72" fill="${c[0]}"/>` +
      `<g fill="${c[2]}"><ellipse cx="86" cy="100" rx="7.5" ry="11"/><ellipse cx="134" cy="100" rx="7.5" ry="11"/></g>` +
      `<g fill="#ff7a8a" opacity=".55"><ellipse cx="68" cy="126" rx="13" ry="8"/><ellipse cx="152" cy="126" rx="13" ry="8"/></g>` +
      `<path d="M88 130Q110 152 132 130" ${DS(c[2], 6)}/><ellipse cx="78" cy="70" rx="14" ry="7" transform="rotate(-38 78 70)" fill="#fff" opacity=".35"/>`);
  });
  {
    let d = '';
    [104, 80, 56, 32].forEach((R, i) => { d += smooth(wob(samp((t) => pol(120, 136, R, 180 + t * 180), 36), 1.1, 40 + i)); });
    d += smooth(jit([[16, 136], [52, 137.5], [88, 135.5]], 0.8, 7)) + smooth(jit([[152, 135.5], [188, 137.5], [224, 136]], 0.8, 9));
    add('rainbow-outline', 'Rainbow doodle', 'Doodles', 240, 150, ['#ff7eb6'], (c) => S(240, 150, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    // hand-drawn 4-point twinkle: concave quadratic sides, start overlaps the end like a pen stroke
    const tw = (cx, cy, s, seed, k = 0.14) => {
      const tips = [[0, -1], [1, 0], [0, 1], [-1, 0]], p = [];
      for (let i = 0; i < 4; i++) {
        const a = tips[i], b = tips[(i + 1) % 4], q = [(a[0] + b[0]) * k, (a[1] + b[1]) * k];
        for (let j = 0; j < 8; j++) {
          const t = j / 8, u = 1 - t;
          p.push([cx + s * (u * u * a[0] + 2 * u * t * q[0] + t * t * b[0]), cy + s * (u * u * a[1] + 2 * u * t * q[1] + t * t * b[1])]);
        }
      }
      return smooth(wob(p.concat(p.slice(0, 3)), s * 0.025, seed));
    };
    const d = tw(92, 110, 78, 3) + tw(166, 40, 24, 5);
    add('sparkle-outline', 'Twinkle outline', 'Doodles', 200, 200, ['#ffffff'], (c) => S(200, 200, `<path d="${d}" ${DS(c[0], 7)}/>`));
  }
  {
    let d = '';
    [[60, 52, -6], [60, 144, 5], [60, 236, -3]].forEach(([cx, cy, rot], i) => {
      d += wcirc(cx, cy, 45, 44, -100 + i * 40, 1.06, 60 + i, 1.1);
      const e = (x, y) => pol(cx, cy, Math.hypot(x, y), (Math.atan2(y, x) * 180) / PI + rot);
      d += 'M' + pt(e(-15, -14)) + 'L' + pt(e(-15, -4)) + 'M' + pt(e(15, -14)) + 'L' + pt(e(15, -4));
      d += smooth(samp((t) => e(-22 + 44 * t, 8 + 14 * Math.sin(PI * t)), 10));
    });
    add('smiley-chain', 'Smiley stack', 'Doodles', 120, 290, ['#ffffff'], (c) => S(120, 290, `<path d="${d}" ${DS(c[0], 6)}/>`));
  }
  add('magnet', 'Magnet', OB, 210, 210, ['#e8384f'], (c) => S(210, 210,
    `<g transform="rotate(-25 105 105)"><path d="M31 172V96A74 74 0 0 1 179 96V172H135V96A30 30 0 0 0 75 96V172Z" fill="${c[0]}" ${OL}/>` +
    `<path d="M44 132V96A61 61 0 0 1 84 39" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="7" stroke-linecap="round"/>` +
    `<rect x="31" y="140" width="44" height="32" fill="url(#sv)" ${OL}/><rect x="135" y="140" width="44" height="32" fill="url(#sv)" ${OL}/></g>`,
    `<linearGradient id="sv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e3e7ed"/><stop offset=".4" stop-color="#ffffff"/><stop offset=".72" stop-color="#a7b0bc"/><stop offset="1" stop-color="#d9dee5"/></linearGradient>`));
  add('app-icon', 'App icon tile', OB, 200, 200, ['#8f7bff', '#4f2fe0'], (c) => S(200, 200,
    `<rect x="16" y="12" width="168" height="168" rx="44" fill="url(#g)" filter="url(#sh)"/>` +
    `<path d="M16 96V56A44 44 0 0 1 60 12H140A44 44 0 0 1 184 56V78C140 62 70 64 16 96Z" fill="#fff" opacity=".16"/>` +
    `<rect x="17.5" y="13.5" width="165" height="165" rx="42.5" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>` + shadowF('sh', 4, 0, 6, 0.28)));
  add('tv-retro', 'Retro TV', OB, 220, 210, ['#ff8a5c', '#7fd0e8'], (c) => S(220, 210,
    `<path d="M110 58L70 16M110 58L152 12" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/><circle cx="70" cy="16" r="7" fill="${c[0]}" ${OL}/><circle cx="152" cy="12" r="7" fill="${c[0]}" ${OL}/>` +
    `<path d="M50 186L42 202M170 186L178 202" stroke="${K}" stroke-width="8" stroke-linecap="round"/>` +
    `<rect x="16" y="56" width="188" height="130" rx="24" fill="${c[0]}" ${OL}/><rect x="32" y="72" width="122" height="98" rx="20" fill="url(#g)" ${OL}/>` +
    `<path d="M48 108C49 94 57 87 70 85" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="7" stroke-linecap="round"/>` +
    `<circle cx="180" cy="96" r="11" fill="#fff3e2" ${OL}/><circle cx="180" cy="128" r="11" fill="#fff3e2" ${OL}/>` +
    `<path d="M180 88V96M180 120V128M168 154H192M168 164H192" stroke="${K}" stroke-width="4" stroke-linecap="round"/>`,
    `<linearGradient id="g" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${tint(c[1], 0.35)}"/><stop offset="1" stop-color="${tint(c[1], -0.2)}"/></linearGradient>`));

  /* ---------------------------------------------- namespace ids per sticker */
  // SVG ids are scoped to each image document, but if the editor ever inlines the
  // markup into the DOM, ids would collide; prefix them with the sticker id.
  out.forEach((s) => {
    const raw = s.svg;
    const p = 'st-' + s.id + '-';
    s.svg = (c) => raw(s.colors.map((d, i) => (c && c[i]) || d))
      .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
      .replace(/href="#([^"]+)"/g, `href="#${p}$1"`);
  });

  window.STICKERS = out;
})();
