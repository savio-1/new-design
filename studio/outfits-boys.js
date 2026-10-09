/* Collage Studio: menswear "big-head" outfit bodies + shoes, bags and accessories.
 * Pushes onto window.STICKERS. Outfits are the body from the neck down (300x520,
 * neck anchor [150, 18]); the user's cut-out head sits on top.
 * Colours: outfits [top, bottoms, shoes, skin, (secondary)]; shading is derived
 * from those colours with tint() so recolouring keeps the light and shadow.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- helpers */
  const r = (n) => Math.round(n);
  const r1 = (n) => Math.round(n * 10) / 10;
  const pt = (p) => (r(p[0]) + ' ' + r(p[1])).replace(' -', '-');

  // lighten (a > 0, toward white) or darken (a < 0, toward a deep warm-neutral) a hex colour
  function tint(hex, a) {
    let h = String(hex || '#888888').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (!/^[0-9a-f]{6}/i.test(h) || isNaN(n)) return hex;
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const to = a < 0 ? [18, 12, 16] : [255, 255, 255], k = Math.min(1, Math.abs(a));
    return '#' + rgb.map((v, i) => Math.round(v + (to[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }

  // Catmull-Rom through points; a point [x, y, 1] is a sharp corner
  function seg(p, closed) {
    const n = p.length; let d = '';
    const g = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      if (p1[2] && p2[2]) { d += 'L' + pt(p2); continue; }
      const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(p2);
    }
    return d;
  }
  const open = (p) => 'M' + pt(p[0]) + seg(p);
  const shape = (p) => 'M' + pt(p[0]) + seg(p, true) + 'Z';
  const mir = (p) => [300 - p[0], p[1], p[2]];
  // symmetric closed shape from its right half (top-centre → bottom-centre)
  const sym = (R) => shape(R.concat(R.slice(1, -1).reverse().map(mir)));
  const MX = (s) => '<g transform="matrix(-1 0 0 1 300 0)">' + s + '</g>';

  // offset edges of a polyline (a, b are fractions of the local width)
  function edges(P, W, a = 0.5, b = -0.5) {
    const A = [], B = [], n = P.length;
    for (let i = 0; i < n; i++) {
      const p = P[i], q0 = P[Math.max(i - 1, 0)], q1 = P[Math.min(i + 1, n - 1)];
      const tx = q1[0] - q0[0], ty = q1[1] - q0[1], l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l, ny = tx / l, w = Array.isArray(W) ? W[i] : W;
      A.push([p[0] + nx * w * a, p[1] + ny * w * a]);
      B.push([p[0] + nx * w * b, p[1] + ny * w * b]);
    }
    return { A, B };
  }
  function band(P, W, a, b, cap) {
    const { A, B } = edges(P, W, a, b), Br = B.slice().reverse();
    const w0 = (Array.isArray(W) ? W[0] : W) * Math.abs(a - b) / 2;
    return 'M' + pt(A[0]) + seg(A) + 'L' + pt(Br[0]) + seg(Br) + (cap ? 'A' + r(w0) + ' ' + r(w0) + ' 0 0 0 ' + pt(A[0]) : '') + 'Z';
  }
  const tube = (P, W, cap) => band(P, W, 0.5, -0.5, cap);
  // a strip h long at the end of a tube (cuffs, hems)
  function cuff(P, W, h, grow = 1.06) {
    const n = P.length, p = P[n - 1], q = P[n - 2], l = Math.hypot(p[0] - q[0], p[1] - q[1]);
    const ux = (p[0] - q[0]) / l, uy = (p[1] - q[1]) / l, w = (Array.isArray(W) ? W[n - 1] : W) / 2 * grow;
    const c = [p[0] - ux * h, p[1] - uy * h];
    return 'M' + pt([p[0] - uy * w, p[1] + ux * w]) + 'L' + pt([p[0] + uy * w, p[1] - ux * w]) +
      'L' + pt([c[0] + uy * w, c[1] - ux * w]) + 'L' + pt([c[0] - uy * w, c[1] + ux * w]) + 'Z';
  }
  const endAng = (P) => { const n = P.length, p = P[n - 1], q = P[n - 2]; return Math.atan2(-(p[0] - q[0]), p[1] - q[1]) * 180 / Math.PI; };

  const F = (d, f, x = '') => `<path d="${d}" fill="${f}"${x}/>`;
  const S = (d, s, w = 1.2, x = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}"${x}/>`;
  const C = (x, y, rr, f, x2 = '') => `<circle cx="${r(x)}" cy="${r(y)}" r="${rr}" fill="${f}"${x2}/>`;
  const OUT = (c, w = 0.9) => ` stroke="${tint(c, -0.45)}" stroke-width="${w}"`;
  const Fo = (d, f, w) => F(d, f, OUT(f, w));
  const DASH = ' stroke-dasharray="2.2 1.8"';
  const ribs = (x0, x1, y0, y1, step, col, w = 0.7) => { let d = ''; for (let x = x0; x <= x1; x += step) d += `M${r(x)} ${y0}V${y1}`; return S(d, col, w); };

  // path minifier: absolute commands → compact relative ones (keeps output small)
  const NP = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  function minPath(d) {
    const tk = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e-?\d+)?/g) || [];
    let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, out = '', last = '', prevNum = '';
    const num = (v) => { v = Math.round(v * 10) / 10; let t = String(v === 0 ? 0 : v); return t.replace(/^(-?)0\./, '$1.'); };
    const sep = (n) => (/[a-zA-Z]$/.test(out) || n[0] === '-' || (n[0] === '.' && prevNum.includes('.')) ? '' : ' ');
    const emit = (c, nums) => {
      if (c !== last || c === 'm' || c === 'z' || c === 'M') out += c;
      for (const n of nums) { out += sep(n) + n; prevNum = n; }
      last = c;
    };
    while (i < tk.length) {
      if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++];
      const lc = cmd.toLowerCase(), rel = cmd !== cmd.toUpperCase(), k = NP[lc];
      if (lc === 'z') { emit('z', []); x = sx; y = sy; continue; }
      const a = tk.slice(i, i + k).map(Number); i += k;
      if (a.length < k || a.some(isNaN)) break;
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (lc === 'h') { const nx = a[0] + ox; emit('h', [num(nx - x)]); x = nx; }
      else if (lc === 'v') { const ny = a[0] + (rel ? y : 0); emit('v', [num(ny - y)]); y = ny; }
      else if (lc === 'a') { const nx = a[5] + ox, ny = a[6] + oy; emit('a', [num(a[0]), num(a[1]), num(a[2]), String(a[3]), String(a[4]), num(nx - x), num(ny - y)]); x = nx; y = ny; }
      else {
        const p = []; for (let j = 0; j < k; j += 2) p.push(num(a[j] + ox - x), num(a[j + 1] + oy - y));
        const nx = a[k - 2] + ox, ny = a[k - 1] + oy;
        if (lc === 'm' && !out) emit('M', [num(nx), num(ny)]); else emit(lc, p);
        x = nx; y = ny; if (lc === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
      }
    }
    return out;
  }

  // per-sticker builder: parts get a clip (for shading) and a thin same-hue outline
  function mk(id, w, h) {
    const defs = [], body = []; let n = 0;
    const o = {
      part(d, fill, inner, stroke) {
        const k = id + n++;
        let s = `<path id="${k}" d="${d}" fill="${fill}"${stroke !== 0 ? ` stroke="${stroke || tint(fill, -0.42)}" stroke-width="1.8"` : ''}/>`;
        if (inner) { defs.push(`<clipPath id="${k}c"><use href="#${k}"/></clipPath>`); s += `<g clip-path="url(#${k}c)">${inner}</g>`; }
        body.push(s); return o;
      },
      add(s) { body.push(s); return o; },
      def(s) { defs.push(s); return o; },
      out() { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs><g stroke-linecap="round" stroke-linejoin="round">${body.join('')}</g></svg>`.replace(/ d="([^"]+)"/g, (m, d) => ' d="' + minPath(d) + '"'); },
    };
    return o;
  }

  /* ------------------------------------------------------------ body bits */
  const neck = (b, sk) => b.add(F('M137 18H163L165 60H135Z', sk) + F('M135 30C143 40 157 40 165 30V60H135Z', tint(sk, -0.16)));

  // hand; local wrist at (0,0) pointing down (+y)
  function hand(x, y, ang, sk, kind, flip = 1, s = 1) {
    const st = ` stroke="${tint(sk, -0.38)}" stroke-width=".9"`;
    const ln = tint(sk, -0.3);
    let d;
    if (kind === 'fist') d = F('M-8 -3C-11 5-11 14-7 19C-2 23 6 22 9 16C11 10 10 2 8-3Z', sk, st) + S('M-6 9C-2 11 3 11 8 9M-6 14C-2 16 3 16 7 14', ln, 0.8) + F('M-8 1C-14 5-13 13-7 13C-6 9-6 5-6 2Z', tint(sk, 0.06), st);
    else if (kind === 'open') d = F('M-9 -3C-11 8-11 20-9 28C-7 33 5 33 8 28C10 20 10 8 8-3Z', sk, st) + S('M-4.5 20V30M-.5 21V31M3.5 20V30', ln, 0.8) + F('M8 5C14 6 18 10 17 14C14 16 10 14 8 12Z', sk, st);
    else d = F('M-8 -3C-10 7-10 16-8 22C-5 29 4 30 7 25C10 19 10 9 8-3Z', sk, st) + F('M-8 2C-13 7-13 14-10 18C-8 16-6 12-6 8Z', tint(sk, 0.05), st) + S('M-1 16C1 20 4 21 6 20', ln, 0.8);
    return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r(ang)}) scale(${flip * s} ${s})">${d}${F('M-8 -3H8V3C3 5-3 5-8 3Z', tint(sk, -0.14))}</g>`;
  }

  /* ---------------------------------------------------------------- shoes
   * Local frame: toe → +x, sole on y = 0, heel near x = -24, ankle near x = -3. */
  const GUM = '#d7a865', RUB = '#f3efe4';
  const SH = {
    dad: (c) => Fo('M-24 -14C-28 -4-25 0-18 0H40C48 0 50-7 47-13Z', tint(c, 0.6)) +
      F('M-25 -5C-25-1-22 0-18 0H40C46 0 49-3 48-6Z', tint(c, -0.42)) +
      S('M-22 -10C-14 -12-6 -8 4 -10S24 -12 34 -9 44 -10', tint(c, -0.16), 0.8) +
      Fo('M-22 -13C-26 -22-22 -32-11 -34L3 -35C9 -30 16 -25 28 -22C40 -19 47 -16 47 -12Z', c) +
      F('M-22 -13C-26 -22-22 -32-11 -34L-7 -26C-8 -20-6 -15-2 -13Z', tint(c, -0.13)) +
      F('M28 -22C40 -19 47 -16 47 -12H33C33 -16 32 -19 28 -22Z', tint(c, -0.12)) +
      F('M-4 -14C2 -24 14 -27 31 -20C19 -19 9 -16 5 -13Z', tint(c, -0.34)) +
      F('M-13 -34C-8 -38 0 -38 4 -35C-1 -33-8 -32-13 -34Z', tint(c, -0.6)) +
      Fo('M-1 -35C0 -41 7 -42 9 -34Z', c) +
      S('M3 -31l3 3M8 -28l3 3M13 -26l3 3', tint(c, -0.45), 1.3) +
      S('M-19 -24C-18 -28-15 -31-11 -32', tint(c, 0.6), 1.2),
    hi: (c) => Fo('M-20 -10C-22 -26-21 -40-17 -48L2 -49C3 -38 6 -28 14 -22C24 -17 34 -15 40 -11Z', c) +
      F('M-20 -10C-22 -26-21 -40-17 -48L-12 -48C-15 -36-15 -22-12 -10Z', tint(c, -0.16)) +
      F('M-17 -48C-10 -52-2 -52 2 -49C-4 -47-12 -46-17 -48Z', tint(c, -0.6)) +
      C(-7, -33, 5.5, RUB, OUT(RUB, 0.7)) + C(-7, -33, 2.4, tint(c, -0.1)) +
      S('M1 -46C3 -38 6 -30 13 -23', tint(c, -0.32), 4.5) +
      S('M-1 -45h6M0 -39h6M2 -33h6M6 -28h6', RUB, 1.5) +
      Fo('M-22 -11C-24 -3-22 0-16 0H42C48 0 49-6 46-11Z', RUB) +
      S('M-21 -5H47', tint(c, 0.1), 1.6) +
      Fo('M29 -11C33 -19 41 -18 46 -11Z', RUB) + S('M33 -13h9', tint(RUB, -0.22), 0.7) +
      S('M-16 -44C-17 -34-17 -22-15 -14', tint(c, 0.3), 1.2),
    loafer: (c) => Fo('M-22 -7V0H-9V-7Z', tint(c, -0.5)) +
      Fo('M-22 -5C-24 -14-20 -20-12 -20C-4 -19 4 -18 10 -19C24 -19 40 -15 46 -6C46 -3 44 -3 42 -3H-22Z', c) +
      F('M-22 -3.2H44C45 -1 44 0 42 0H-9V-1H-22Z', tint(c, -0.5)) +
      F('M-14 -20C-6 -23 4 -22 10 -19C3 -18-8 -18-14 -20Z', tint(c, -0.6)) +
      S('M10 -19C20 -21 32 -17 38 -9', tint(c, -0.35), 0.9) +
      Fo('M8 -18C12 -13 18 -12 24 -14L22 -19C17 -19 12 -19 8 -18Z', tint(c, -0.12)) +
      S('M14 -16h5', tint(c, -0.62), 1.2) +
      S('M28 -13C34 -12 38 -10 41 -7', tint(c, 0.32), 1.5) + S('M-19 -15C-18 -11-18 -8-17 -6', tint(c, 0.25), 1.1),
    sandal: (c, sk) => Fo('M-22 -5C-24 0-21 1-15 1H41C46 1 47-3 45-6Z', tint(c, 0.42)) +
      F('M-22 -2C-21 1-18 1-15 1H41C45 1 47-1 46-3Z', tint(c, -0.35)) +
      Fo('M-20 -6C-22 -15-17 -26-7 -28C0 -27 8 -19 20 -14C32 -11 42 -11 45 -7L44 -5H-20Z', sk) +
      S('M35 -11.5v5M39.5 -10.5v4', tint(sk, -0.3), 0.8) + F('M-20 -6C-21 -10-20 -14-18 -17L-14 -6Z', tint(sk, -0.12)) +
      Fo('M1 -24C7 -16 11 -11 12 -5H23C20 -12 14 -19 9 -25Z', c) +
      Fo('M-19 -19C-12 -24-4 -26 4 -25L5 -20C-3 -20-11 -17-18 -14Z', c) +
      Fo('M-13 -22h5v6h-5z', tint(c, 0.45)) + S('M5 -21C9 -16 12 -12 14 -7', tint(c, 0.3), 1),
    trail: (c) => {
      let lugs = ''; for (let x = -20; x < 44; x += 7) lugs += `M${x} -1h4v3h-4z`;
      return F(lugs, tint(c, -0.62)) + Fo('M-23 -12C-26 -3-23 0-17 0H41C48 0 50-6 47-12Z', tint(c, 0.62)) +
        F('M-23 -5C-23 -1-21 0-17 0H41C46 0 49-2 48-5Z', tint(c, -0.62)) +
        Fo('M-21 -11C-25 -22-21 -32-11 -34L3 -35C8 -29 16 -25 27 -22C39 -19 46 -16 46 -11Z', c) +
        F('M-21 -11C-25 -22-21 -32-11 -34L-6 -30C-10 -24-9 -16-4 -11Z', tint(c, -0.3)) +
        F('M30 -21C40 -18 46 -15 46 -11H29C31 -14 31 -18 30 -21Z', tint(c, -0.3)) +
        F('M-2 -11L8 -26L13 -24L5 -11ZM10 -11L18 -23L23 -21L17 -11Z', tint(c, -0.3)) +
        F('M-13 -34C-8 -38 0 -38 4 -35C-1 -33-8 -32-13 -34Z', tint(c, -0.62)) +
        S('M3 -31l4 2M8 -28l4 2M13 -26l4 2', tint(c, 0.75), 1.4) + C(19, -24, 1.8, tint(c, -0.5)) +
        S('M-15 -33C-19 -36-21 -39-18 -41', tint(c, -0.3), 1.8);
    },
    skate: (c) => Fo('M-24 -12V-3C-24 0-22 0-20 0H43C47 0 48-2 48-5L47 -12Z', RUB) +
      S('M-23 -4H48', tint(RUB, -0.3), 1) +
      Fo('M-23 -11C-27 -23-21 -35-10 -36L4 -36C8 -29 15 -25 27 -23C41 -21 48 -17 47 -11Z', c) +
      F('M-23 -11C-27 -23-21 -35-10 -36L-6 -36C-12 -30-14 -20-12 -11Z', tint(c, 0.1)) +
      Fo('M-15 -36C-10 -42 2 -42 6 -36C0 -34-9 -34-15 -36Z', tint(c, 0.14)) +
      S('M-17 -16C-9 -28 5 -29 11 -20C15 -26 23 -26 29 -20', RUB, 2.4) +
      S('M5 -32l4 2M9 -29l4 2M14 -27l4 2', RUB, 1.3) +
      Fo('M31 -12C34 -18 42 -18 47 -12Z', tint(c, -0.12)) + S('M-20 -26C-19 -30-16 -33-12 -34', tint(c, 0.35), 1.1),
    derby: (c) => Fo('M-22 -7V0H-8V-7Z', tint(c, -0.35)) +
      Fo('M-22 -6C-24 -17-20 -25-12 -25C-4 -25 2 -24 6 -23C18 -21 34 -17 44 -8C46 -6 45 -5 43 -5H-22Z', c) +
      Fo('M-22 -5.5H44C46 -5 46-2 44-2H-8V-1H-22Z', tint(c, -0.5)) +
      F('M-14 -25C-6 -28 2 -27 6 -24C0 -23-8 -23-14 -25Z', tint(c, -0.65)) +
      Fo('M-4 -24C2 -18 8 -14 14 -14L22 -17C16 -19 10 -22 4 -25Z', tint(c, 0.06)) +
      S('M3 -21l4-2M7 -18l4-2M11 -16l4-2', tint(c, -0.62), 1.1) +
      S('M-20 -9C-6 -10 20 -11 42 -7', tint(c, 0.18), 0.6, DASH) +
      F('M26 -16C33 -16 39 -12 41 -9C36 -10 30 -12 26 -14Z', tint(c, 0.4)) + S('M-19 -18C-18 -21-16 -23-13 -24', tint(c, 0.3), 1.1),
    chelsea: (c) => Fo('M-22 -9V0H-8V-9Z', tint(c, -0.2)) + S('M-22 -5H-8', tint(c, -0.4), 0.6) +
      Fo('M-21 -7C-23 -22-21 -42-18 -52L4 -52C4 -38 6 -26 16 -20C30 -16 40 -13 45 -7Z', c) +
      Fo('M-21 -6.5H45C46 -4 45 -2 43 -2H-8V-1H-21Z', tint(c, -0.45)) +
      Fo('M-13 -52H0L-6 -25Z', tint(c, -0.3)) + S('M-9.5 -50l2.4 18M-6.5 -50v21M-3.5 -50l-2 18', tint(c, -0.55), 0.6) +
      Fo('M-19 -52C-21 -58-17 -60-13 -58V-52Z', tint(c, -0.12)) +
      F('M-18 -52C-10 -54-2 -54 4 -52C-2 -50-12 -50-18 -52Z', tint(c, -0.62)) +
      F('M27 -16C35 -15 40 -12 42 -10C37 -10 31 -12 27 -14Z', tint(c, 0.38)) + S('M-17 -46C-18 -36-18 -24-17 -14', tint(c, 0.28), 1.3),
    desert: (c) => Fo('M-23 -8C-24 -2-22 0-17 0H42C47 0 48-4 46-8Z', GUM) + S('M-22 -3H46', tint(GUM, -0.2), 0.8) +
      Fo('M-21 -7C-23 -22-21 -36-17 -42L3 -42C5 -32 8 -24 18 -19C31 -15 41 -13 45 -8Z', c) +
      Fo('M-21 -7C-23 -22-21 -36-17 -42L3 -42C5 -32 7 -26 11 -20C9 -14 7 -10 5 -7Z', tint(c, 0.06)) +
      F('M-21 -7C-23 -22-21 -36-17 -42L-12 -42C-15 -30-15 -18-13 -7Z', tint(c, -0.12)) +
      F('M-17 -42C-10 -45-2 -45 3 -42C-3 -40-11 -40-17 -42Z', tint(c, -0.55)) +
      C(4, -35, 1.4, tint(c, -0.6)) + C(7, -27, 1.4, tint(c, -0.6)) +
      S('M4 -35C11 -37 15 -34 12 -31M7 -27C12 -29 16 -26 13 -23M12 -31l5 6M13 -23l3 6', tint(c, -0.5), 1.1) +
      S('M24 -15C32 -14 38 -12 41 -10', tint(c, 0.25), 1.4),
  };
  // place a shoe: origin on the ground under the ankle; dir -1 mirrors; rot lifts the heel (around the toe)
  const SC = 1.2; // shoes a little oversized on the figures
  const feet = (b, id, k, c, sk, L, R) => {
    b.def(`<g id="${id}-sh">${SH[k](c, sk)}</g>`);
    return b.add([[L, -1], [R, 1]].map(([[x, y, rot], dir]) => `<use href="#${id}-sh" transform="translate(${x} ${y}) scale(${dir * SC} ${SC})${rot ? ` rotate(${rot} 44 0)` : ''}"/>`).join(''));
  };

  /* -------------------------------------------------------------- trousers */
  function pants(b, c, o) {
    const R = o.R || o.L.map(mir), RW = o.RW || o.W;
    const a = edges(o.L, o.W), e = edges(R, RW), n = o.L.length, m = R.length, K = (p) => [p[0], p[1], 1];
    const P = [[150 - o.whw, o.wy, 1], ...a.A.slice(0, n - 1), K(a.A[n - 1]), K(a.B[n - 1]), ...a.B.slice(1, n - 1).reverse(),
      K(o.cr), ...e.A.slice(1, m - 1), K(e.A[m - 1]), K(e.B[m - 1]), ...e.B.slice(0, m - 1).reverse(), [150 + o.whw, o.wy, 1]];
    const sh = tint(c, -0.17), hi = tint(c, 0.12);
    const inner = F(band(o.L, o.W, -0.16, -0.75), sh) + F(band(R, RW, -0.22, -0.75), sh) +
      F(band(o.L, o.W, 0.36, 0.2), hi) + F(band(R, RW, 0.26, 0.1), hi) +
      F(`M140 ${o.cr[1] - 26}C146 ${o.cr[1] - 14} 148 ${o.cr[1]} 150 ${o.cr[1] + 4}C152 ${o.cr[1]} 154 ${o.cr[1] - 14} 158 ${o.cr[1] - 26}Z`, tint(c, -0.12)) +
      (o.extra || '');
    b.part(shape(P), c, inner);
    return { a, e, R, RW };
  }
  const ankle = (x, y, sk, w = 15, h = 18) => F(`M${r(x - w / 2)} ${r(y)}h${w}l-1 ${h}h${-w + 2}Z`, sk) + F(`M${r(x - w / 2)} ${r(y)}h${w}v4h${-w}Z`, tint(sk, -0.25));

  /* ------------------------------------------------------------ registry */
  const add = [];
  function outfit(id, name, colors, draw) {
    add.push({
      id, name, cat: 'Outfits · Boys', w: 300, h: 520, colors, neck: [150, 18],
      svg: (c) => { const g = (i) => (c && c[i]) || colors[i]; const b = mk(id, 300, 520); draw(b, g, id); return b.out(); },
    });
  }
  function item(id, name, w, h, colors, draw) {
    add.push({
      id, name, cat: 'Shoes & Bags', w, h, colors,
      svg: (c) => { const g = (i) => (c && c[i]) || colors[i]; const b = mk(id, w, h); draw(b, g, id); return b.out(); },
    });
  }
  const TEE = '#f4f0e6', STITCH = '#d39a4a', BRASS = '#c4913f';

  /* =============================================================== OUTFITS */

  // 1 — oversized hoodie, cargo pants, chunky sneakers; hands in the kangaroo pocket
  outfit('boy-hoodie-cargo', 'Hoodie & cargos', ['#7b8d6a', '#4a4a3f', '#f2f0ea', '#b07a55'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3);
    feet(b, id, 'dad', s, sk, [117, 506], [183, 506]);
    const pk = F('M91 318H120V366C112 371 100 371 92 366Z', tint(p, 0.04), OUT(p)) + F('M90 311H121V326H90Z', tint(p, 0.1), OUT(p)) + C(105.5, 320, 1.8, tint(p, -0.5)) +
      S('M94 402C110 407 130 407 146 402M100 454C110 449 122 455 140 449M98 469C112 463 124 471 144 465', tint(p, -0.32), 1.1);
    pants(b, p, { wy: 226, whw: 54, cr: [150, 288], L: [[123, 238], [120, 360], [118, 474]], W: [58, 53, 54], extra: pk + MX(pk) });
    // hood bunched behind the neck
    b.part('M102 58C94 24 116 4 150 4C184 4 206 24 198 58Z', tint(c, -0.12), F('M150 4C180 4 204 22 198 58H170Z', tint(c, -0.24)));
    neck(b, sk);
    const P1 = [[100, 64], [84, 150], [114, 204]], W1 = [40, 36, 33];
    b.part(sym([[150, 38, 1], [166, 33], [184, 34], [208, 48], [218, 72], [220, 150], [216, 236, 1], [150, 238, 1]]), c,
      F('M196 44C214 90 212 180 206 240H232V30Z', tint(c, -0.15)) + F('M80 60C94 100 96 170 92 240H70Z', tint(c, 0.1)) +
      S('M126 116C134 136 132 158 122 172M178 104C170 126 176 148 184 160M150 74V98', tint(c, -0.22), 1.3));
    b.part('M86 228H214C216 238 215 248 212 258H88C85 248 84 238 86 228Z', tint(c, -0.03), ribs(90, 210, 230, 257, 4.5, tint(c, -0.22)) + F('M180 226H220V262H180Z', tint(c, -0.15)));
    for (const P of [P1, P1.map(mir)])
      b.part(tube(P, W1, true), c, F(band(P, W1, -0.1, -0.8), tint(c, -0.16)) + F(band(P, W1, 0.44, 0.24), tint(c, 0.1)) + S(`M${r(P[1][0] - 4)} ${P[1][1] - 12}C${r(P[1][0] + 4)} ${P[1][1] - 4} ${r(P[1][0] + 8)} ${P[1][1] + 2} ${r(P[1][0] + 12)} ${P[1][1] + 12}`, tint(c, -0.28), 1.1));
    b.part('M114 164H186C188 192 194 214 202 230H98C106 214 112 192 114 164Z', c,
      F('M114 164H186V174H114Z', tint(c, -0.12)) + F('M186 164C188 192 194 214 202 230H188C184 210 182 188 182 164Z', tint(c, -0.17)) +
      S('M116 170C114 194 108 214 102 226M184 170C186 194 192 214 198 226', tint(c, 0.12), 1));
    // hood rim and drawstrings
    b.part('M114 34C118 60 136 72 150 74C164 72 182 60 186 34C180 27 173 27 168 30C166 47 158 57 150 57C142 57 134 47 132 30C127 27 120 27 114 34Z', c,
      F('M114 34C118 60 136 72 150 74C164 72 182 60 186 34V80H114Z', tint(c, -0.1)) + F('M168 30C166 47 158 57 150 57V74C164 72 182 60 186 34Z', tint(c, -0.16)));
    b.add(C(140, 64, 2.4, tint(c, -0.45)) + C(160, 64, 2.4, tint(c, -0.45)) +
      S('M140 64C138 82 141 96 139 112M160 64C162 80 159 92 161 106', tint(c, 0.62), 2.6) + S('M139 109V117M161 103V111', tint(c, -0.5), 3));
  });

  // 2 — denim jacket over a white tee, cropped chinos, suede loafers; walking with a phone
  outfit('boy-denim-chinos', 'Denim jacket & chinos', ['#5b7fa6', '#d8c3a0', '#7a4b2f', '#e3b18c'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3);
    const L = [[127, 232], [114, 354], [104, 452]], R = [[173, 232], [182, 356], [185, 470]], W = [52, 44, 38];
    b.add(ankle(104, 448, sk, 14, 18) + ankle(185, 466, sk, 15, 20));
    feet(b, id, 'loafer', s, sk, [111, 503, 18], [190, 507]);
    const pk = S('M106 214C112 226 116 236 116 246', tint(p, -0.35), 1.1) + S('M138 202V250C138 258 146 260 150 262', tint(p, -0.3), 1);
    const pa = pants(b, p, { wy: 200, whw: 50, cr: [150, 270], L, R, W, extra: pk + MX(S('M106 214C112 226 116 236 116 246', tint(p, -0.35), 1.1)) + S('M120 300C118 330 114 360 110 400M178 300C181 330 184 360 185 410', tint(p, 0.2), 1.2) + S('M104 360C114 366 122 366 130 362M164 362C174 368 186 368 194 362', tint(p, -0.25), 1) });
    b.part(cuff(L, W, 9), tint(p, -0.04)).part(cuff(R, W, 9), tint(p, -0.04));
    void pa;
    // arms (behind jacket body)
    const AL = [[106, 62], [96, 150], [100, 230]], AR = [[194, 62], [206, 150], [212, 228]], AW = [36, 32, 29];
    b.add(`<g transform="translate(214 236) rotate(-8)"><rect x="-8" y="6" width="15" height="28" rx="3.5" fill="#26262c"/><rect x="-6.5" y="8" width="12" height="24" rx="2.5" fill="#3d4250"/></g>`);
    for (const P of [AL, AR]) {
      b.part(tube(P, AW, true), c, F(band(P, AW, -0.1, -0.8), tint(c, -0.17)) + F(band(P, AW, 0.42, 0.2), tint(c, 0.14)) + S(`M${P[1][0] - 8} ${P[1][1] - 6}C${P[1][0] - 2} ${P[1][1]} ${P[1][0] + 2} ${P[1][1] + 2} ${P[1][0] + 8} ${P[1][1]}`, tint(c, -0.3), 1));
      b.part(cuff(P, AW, 12), tint(c, -0.06), S(cuff(P, AW, 10, 0.92), STITCH, 0.8, DASH));
    }
    b.add(hand(100, 230, endAng(AL), sk) + hand(212, 228, endAng(AR), sk, 'fist'));
    neck(b, sk);
    b.part(sym([[150, 38, 1], [161, 34], [168, 26], [186, 32], [200, 60], [196, 120], [194, 226, 1], [150, 228, 1]]), TEE,
      F('M150 40V230H170V40Z', tint(TEE, -0.08)) + S('M137 27C142 41 158 41 163 27', tint(TEE, -0.15), 3) + S('M144 110C148 130 146 160 140 180', tint(TEE, -0.12), 1.2));
    const half = [[137, 24], [118, 30], [92, 46, 1], [102, 72], [112, 100], [110, 150], [108, 216, 1], [136, 218, 1], [134, 120], [137, 44, 1]];
    const det = S('M94 78C110 82 124 82 137 80', STITCH, 0.9, DASH) + Fo('M110 92H132L131 104L121 109L111 104Z', tint(c, -0.05)) + C(121, 104, 2.2, BRASS) +
      S('M115 109V196M127 109V196', STITCH, 0.9, DASH) + F('M80 196H140V220H80Z', tint(c, -0.08)) + S('M80 199.5H140M80 215H140', STITCH, 0.8, DASH) +
      S('M101 140L106 182', tint(c, -0.42), 2) + F('M118 118C124 134 124 160 120 180C114 160 114 136 118 118Z', tint(c, 0.12));
    b.part(shape(half), c, det + F('M80 40C96 80 100 150 98 230H70V40Z', tint(c, 0.1)) + C(131, 132, 2.3, BRASS) + C(131, 166, 2.3, BRASS) + C(131, 207, 2.3, BRASS));
    b.part(shape(half.map(mir)), c, MX(det) + F('M186 40C200 80 204 150 202 230H230V40Z', tint(c, -0.16)) + F('M164 84H170V220H164Z', tint(c, -0.2)));
    const col = [[141, 20], [126, 24], [110, 34], [104, 44, 1], [122, 70, 1], [132, 52], [139, 34]];
    const cd = S('M109 46L122 64', STITCH, 0.8, DASH) + F('M104 44L122 70L125 62Z', tint(c, -0.15));
    b.part(shape(col), c, cd).part(shape(col.map(mir)), c, MX(cd) + F('M140 0H200V90H160Z', tint(c, -0.1)));
  });

  // 3 — varsity jacket, straight jeans, high-top sneakers; waving
  outfit('boy-varsity-jeans', 'Varsity jacket & jeans', ['#23365c', '#55779e', '#b9352d', '#8a5636', '#ede3cf'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3), sl = g(4);
    feet(b, id, 'hi', s, sk, [117, 506], [183, 506]);
    const jd = S('M100 232C110 244 118 250 122 262M200 232C190 244 182 250 178 262M138 226V262C138 270 146 272 150 274', STITCH, 0.9, DASH) +
      S('M95 280C94 340 96 420 97 470M205 280C206 340 204 420 203 470', STITCH, 0.8, DASH) +
      F('M110 300C118 330 118 360 114 390C106 360 104 330 110 300ZM190 300C182 330 182 360 186 390C194 360 196 330 190 300Z', tint(p, 0.18)) +
      S('M128 284C134 290 140 290 144 288M128 294C134 300 140 300 144 296M156 288C160 290 166 290 172 284', tint(p, 0.3), 1) +
      S('M100 456C112 452 124 458 140 452M100 470C112 464 126 472 142 466M160 452C174 458 188 452 200 456M158 466C174 472 188 464 200 470', tint(p, -0.3), 1);
    pants(b, p, { wy: 214, whw: 52, cr: [150, 276], L: [[124, 236], [121, 360], [119, 470]], W: [54, 48, 48], extra: jd });
    // raised arm (behind body)
    const AR = [[192, 64], [234, 100], [246, 48]], AW = [38, 34, 30];
    b.part(tube(AR, AW, true), sl, F(band(AR, AW, -0.15, -0.8), tint(sl, -0.14)) + S(open([[236, 104], [244, 70], [244, 56]]), tint(sl, 0.6), 1.5));
    b.part(cuff(AR, AW, 13), c, S(cuff(AR, AW, 8.5, 0.9), sl, 1.6) + ribs(220, 270, 30, 70, 3.2, tint(c, -0.3), 0.6));
    b.add(hand(246, 48, endAng(AR), sk, 'open', -1));
    const AL = [[106, 64], [96, 150], [92, 236]], WL = [38, 34, 30];
    b.part(tube(AL, WL, true), sl, F(band(AL, WL, -0.15, -0.8), tint(sl, -0.14)) + S('M94 90C90 110 88 130 90 140', tint(sl, 0.6), 1.5) + S('M90 142C96 148 100 150 106 150', tint(sl, -0.3), 1));
    b.part(cuff(AL, WL, 13), c, S(cuff(AL, WL, 8.5, 0.9), sl, 1.6) + ribs(70, 120, 220, 240, 3.2, tint(c, -0.3), 0.6));
    b.add(hand(92, 236, endAng(AL), sk));
    neck(b, sk);
    b.part(sym([[150, 52, 1], [163, 44], [176, 30], [200, 44, 1], [204, 66], [196, 100], [195, 150], [196, 212, 1], [150, 212, 1]]), c,
      F('M178 40C196 70 200 140 196 214H220V30Z', tint(c, -0.2)) + F('M102 50C106 80 108 150 106 212H90V40Z', tint(c, 0.1)) + S('M150 52V210', tint(c, -0.4), 1.2) +
      S('M130 120C136 140 136 160 130 176M170 120C166 136 166 150 170 162', tint(c, -0.3), 1.2));
    b.part('M102 204H198C200 212 200 222 198 232H102C100 222 100 212 102 204Z', c, S('M100 212H200M100 219H200', sl, 2.4) + ribs(104, 198, 204, 232, 3.4, tint(c, -0.3), 0.6));
    for (let y = 66; y < 200; y += 30) b.add(C(150, y, 3, sl, OUT(sl, 0.7)) + C(150, y, 1.2, tint(sl, -0.3)));
    // felt star patch
    const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 7 : 16; star.push([172 + Math.cos(a) * rr, 96 + Math.sin(a) * rr, 1]); }
    b.add(F(shape(star), sl, ` stroke="${s}" stroke-width="2.4" stroke-linejoin="round"`));
    b.part('M124 30C128 52 140 58 150 58C160 58 172 52 176 30C171 25 167 25 164 28C162 40 156 46 150 46C144 46 138 40 136 28C133 25 128 25 124 30Z', c,
      S('M125 36C132 52 142 55 150 55C158 55 168 52 175 36', sl, 2) + S('M127 40C133 49 141 51 150 51C159 51 167 49 173 40', s, 1.6));
  });

  // 4 — open linen shirt over a tank, knee shorts, sandals; holding an iced coffee
  function coffee(c1, c2, lite) {
    // drawn in a 140 x 260 frame
    const cup = 'M18 74H122L110 246C109 252 104 254 98 254H42C36 254 31 252 30 246Z';
    return S('M66 62L80 4', tint(c2, -0.35), 11) + S('M66 62L80 4', c2, 9) + S('M66 62L80 4', tint(c2, 0.3), 3) +
      F(cup, '#eef3f4', ' fill-opacity=".55"') +
      F('M23 108H117L110 246C109 252 104 254 98 254H42C36 254 31 252 30 246Z', c1) +
      F('M23 108H117L115 140C96 148 62 132 25 142Z', tint(c1, 0.55)) +
      F('M25 142C62 132 96 148 115 140L113 170C90 160 60 176 27 166Z', tint(c1, 0.3)) +
      F('M98 108H117L110 246C109 252 104 254 98 254Z', tint(c1, -0.2)) +
      (lite ? '' : F('M36 96l26-6 6 24-26 6zM72 92l24 2-2 24-24-2zM46 128l22-4 4 20-22 4z', '#ffffff', ' fill-opacity=".45" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.2"')) +
      F(cup, 'none', ` stroke="${tint(c1, -0.2)}" stroke-opacity=".55" stroke-width="2"`) +
      S('M32 90L44 236', '#ffffff', 5, ' stroke-opacity=".55"') +
      F('M10 62H130C134 62 134 76 130 76H10C6 76 6 62 10 62Z', '#f1f4f5', ` stroke="${tint(c1, -0.35)}" stroke-opacity=".5" stroke-width="1.5"`) +
      F('M22 62C22 30 118 30 118 62Z', '#f4f7f8', ' fill-opacity=".7" stroke="#b9c3c6" stroke-width="1.5"') +
      S('M34 54C40 42 56 38 70 38', '#ffffff', 3);
  }
  outfit('boy-linen-shorts', 'Linen shirt & shorts', ['#e6d8bb', '#3f5b78', '#6b4a33', '#d39a74', '#8a5a36'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3);
    // legs
    const LL = [[118, 330], [117, 410], [125, 480]], LW = [36, 33, 22];
    for (const P of [LL, LL.map(mir)]) b.part(tube(P, LW), sk, F(band(P, LW, -0.1, -0.7), tint(sk, -0.14)) + F(band(P, LW, 0.42, 0.25), tint(sk, 0.1)), tint(sk, -0.32));
    feet(b, id, 'sandal', s, sk, [117, 506], [183, 506]);
    const sd = S('M100 214L114 250M200 214L186 250', tint(p, -0.35), 1.2) + S('M134 214V256M166 214V256', tint(p, -0.22), 1) +
      F('M96 202H204V214H96Z', tint(p, -0.12)) + F('M112 202h5v14h-5zM183 202h5v14h-5zM147 202h6v14h-6z', tint(p, -0.25)) +
      S('M100 300C110 304 124 304 138 300M162 300C176 304 190 304 200 300', tint(p, -0.3), 1);
    const L = [[123, 230], [119, 300], [117, 352]], W = [60, 58, 58];
    pants(b, p, { wy: 202, whw: 50, cr: [150, 270], L, W, extra: sd });
    b.part(cuff(L, W, 11), tint(p, -0.05)).part(cuff(L.map(mir), W, 11), tint(p, -0.05));
    // arms: left hangs, right raised with the cup
    const AL = [[106, 62], [99, 150], [97, 234]], AR = [[194, 62], [216, 146], [236, 96]], AW = [30, 26, 22];
    for (const P of [AL, AR]) b.part(tube(P, AW, true), sk, F(band(P, AW, -0.15, -0.8), tint(sk, -0.15)) + F(band(P, AW, 0.45, 0.28), tint(sk, 0.1)), tint(sk, -0.32));
    b.add(hand(97, 234, endAng(AL), sk) + `<g transform="translate(222 30) scale(.4)">${coffee(g(4), '#4f9a6e', 1)}</g>` + hand(236, 96, endAng(AR), sk, 'fist', -1, 1.05));
    for (const P of [[[104, 56], [100, 104]], [[196, 56], [206, 102]]]) {
      const W2 = [44, 40];
      b.part(tube(P, W2, true), c, F(band(P, W2, -0.15, -0.8), tint(c, -0.16)) + F(cuff(P, W2, 9), tint(c, -0.07)) + S(cuff(P, W2, 9), tint(c, -0.3), 0.8));
    }
    neck(b, sk);
    b.part(sym([[150, 42, 1], [158, 38], [164, 30], [174, 30], [176, 60], [184, 120], [186, 214, 1], [150, 216, 1]]), TEE,
      F('M156 40C162 100 164 160 160 216H190V40Z', tint(TEE, -0.1)) + S('M140 31C142 42 158 42 160 31', tint(TEE, -0.16), 2.5) + S('M145 130C150 150 148 180 142 200', tint(TEE, -0.12), 1.1));
    const half = [[138, 24], [118, 32], [90, 48, 1], [96, 80], [108, 104], [106, 170], [104, 236], [118, 246, 1], [134, 240, 1], [136, 180], [139, 120], [140, 54, 1]];
    const det = S('M112 200C116 210 122 220 124 238M128 64C124 100 124 150 128 200', tint(c, -0.2), 1.1) + S('M100 106C104 140 104 190 102 230', tint(c, 0.25), 1.2);
    b.part(shape(half), c, det + F('M86 40C100 90 102 160 98 240H70V40Z', tint(c, 0.12)) + F('M134 50L140 54L136 240H130Z', tint(c, -0.1)) + C(134, 132, 2, tint(c, -0.3)) + C(134, 166, 2, tint(c, -0.3)) + C(134, 200, 2, tint(c, -0.3)));
    b.part(shape(half.map(mir)), c, MX(det) + F('M182 40C198 90 202 160 200 240H230V40Z', tint(c, -0.18)) + F('M166 50V240H172V50Z', tint(c, -0.12)));
    const col = [[141, 20], [126, 24], [110, 34], [106, 44, 1], [118, 50, 1], [126, 74, 1], [139, 40]];
    b.part(shape(col), c, F('M106 44L118 50L126 74L131 64Z', tint(c, -0.12))).part(shape(col.map(mir)), c, F('M150 0H220V100H150Z', tint(c, -0.12)));
  });

  // 5 — relaxed double-breasted suit over a white tee, loafers; hand in pocket
  outfit('boy-suit-tee', 'Relaxed suit & tee', ['#7a6552', '#7a6552', '#1f1d1c', '#f0c6a2'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3);
    feet(b, id, 'loafer', s, sk, [117, 506], [183, 506]);
    const crease = S('M118 300C117 360 115 420 113 488M182 300C183 360 185 420 187 488', tint(p, 0.2), 1.2) +
      S('M100 470C112 466 124 472 138 466M162 466C176 472 188 466 200 470', tint(p, -0.3), 1.1);
    pants(b, p, { wy: 240, whw: 54, cr: [150, 298], L: [[124, 250], [118, 372], [114, 488]], W: [60, 60, 64], extra: crease });
    // arms behind the jacket
    const AR = [[198, 66], [210, 152], [213, 242]], AL = AR.map(mir), AW = [42, 38, 34];
    for (const P of [AL, AR]) b.part(tube(P, AW, true), c, F(band(P, AW, -0.12, -0.8), tint(c, -0.17)) + F(band(P, AW, 0.44, 0.24), tint(c, 0.1)) + S(`M${P[1][0] - 6} ${P[1][1] - 10}C${P[1][0]} ${P[1][1] - 2} ${P[1][0] + 4} ${P[1][1] + 2} ${P[1][0] + 10} ${P[1][1] + 6}`, tint(c, -0.3), 1));
    b.add(hand(213, 242, endAng(AR), sk) + hand(87, 242, endAng(AL), sk));
    neck(b, sk);
    b.part(sym([[150, 38, 1], [160, 35], [166, 28], [184, 34], [196, 60], [194, 160, 1], [150, 160, 1]]), TEE, F('M156 40C160 80 160 120 158 160H190V40Z', tint(TEE, -0.1)) + S('M137 28C142 41 158 41 163 28', tint(TEE, -0.15), 3));
    const body = sym([[150, 150, 1], [170, 30], [208, 44, 1], [214, 66], [208, 110], [204, 200], [208, 292, 1], [150, 294, 1]]);
    b.part(body, c,
      F('M184 40C204 90 206 200 210 300H240V30Z', tint(c, -0.17)) + F('M96 44C104 90 102 200 96 300H60V30Z', tint(c, 0.1)) +
      F('M98 42L112 68L128 108L150 158L154 150L130 104L118 60Z', tint(c, -0.26)) + F('M202 42L188 68L172 108L150 158L146 150L170 104L182 60Z', tint(c, -0.3)) +
      S('M150 150L130 172V294', tint(c, -0.45), 1.3) + F('M130 172V294H136V170Z', tint(c, -0.1)) +
      C(138, 184, 3.2, tint(c, -0.4)) + C(166, 184, 3.2, tint(c, -0.4)) + C(138, 220, 3.2, tint(c, -0.4)) + C(166, 220, 3.2, tint(c, -0.4)) +
      Fo('M98 240H128V252C118 254 108 254 98 252Z', c) + Fo('M172 240H202V252C192 254 182 254 172 252Z', tint(c, -0.1)) +
      S('M180 126L198 123', tint(c, -0.45), 2) + S('M118 250C122 270 120 280 116 292M182 254C178 270 180 284 184 292', tint(c, -0.25), 1.1));
    const lap = [[138, 24], [124, 30], [110, 38], [95, 39, 1], [105, 56, 1], [116, 58, 1], [112, 66], [126, 106], [148, 152, 1], [140, 104], [137, 44, 1]];
    const ld = S('M116 58L136 44', tint(c, -0.4), 1) + S('M139 50C140 90 142 120 146 146', tint(c, 0.22), 1.4);
    b.part(shape(lap), tint(c, 0.05), ld).part(shape(lap.map(mir)), tint(c, -0.04), MX(ld) + F('M150 0H220V160H160Z', tint(c, -0.12)));
  });

  // 6 — puffer jacket, joggers, trail shoes; hands in pockets
  outfit('boy-puffer-joggers', 'Puffer & joggers', ['#d4602f', '#3c3e44', '#c4bfa6', '#a46d4b'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3);
    feet(b, id, 'trail', s, sk, [117, 506], [183, 506]);
    const L = [[124, 238], [121, 358], [121, 464]], W = [56, 48, 34];
    const jd = S('M100 274C108 278 116 274 122 280M98 312C110 318 118 312 126 318M102 410C112 416 124 410 134 416M104 432C114 438 126 432 134 438M106 450C116 444 128 450 136 444', tint(p, -0.35), 1.1) +
      S('M94 250L98 300', tint(p, -0.4), 1.6);
    pants(b, p, { wy: 226, whw: 54, cr: [150, 288], L, W, extra: jd + MX(jd) });
    for (const P of [L, L.map(mir)]) b.part(cuff(P, W, 16, 1.04), tint(p, -0.08), ribs(80, 220, 440, 480, 3.4, tint(p, -0.32), 0.7));
    // collar back + neck
    b.part('M120 28C124 12 176 12 180 28C168 38 132 38 120 28Z', tint(c, -0.32), 0);
    neck(b, sk);
    const body = sym([[150, 36, 1], [172, 34], [182, 40], [204, 48], [220, 66], [224, 120], [222, 228, 1], [150, 232, 1]]);
    let q1 = '', q2 = '', q3 = '';
    for (let y = 66; y < 232; y += 33) { q1 += `M60 ${y + 3}C110 ${y + 9} 190 ${y + 9} 240 ${y + 3}V${y + 14}C190 ${y + 20} 110 ${y + 20} 60 ${y + 14}Z`; q2 += `M60 ${y}C110 ${y + 6} 190 ${y + 6} 240 ${y}`; q3 += `M60 ${y - 9}C110 ${y - 3} 190 ${y - 3} 240 ${y - 9}V${y}C190 ${y + 6} 110 ${y + 6} 60 ${y}Z`; }
    const q = F(q1, tint(c, 0.14)) + F(q3, tint(c, -0.1)) + S(q2, tint(c, -0.38), 1.4);
    b.part(body, c, q + F('M196 44C214 100 214 180 210 240H240V30Z', tint(c, -0.16)) + F('M150 30H153V236H150Z', tint(c, -0.42)) + F('M80 230H220V240H80Z', tint(c, -0.2)));
    b.add(F('M146 44h8v12h-8z', tint(c, -0.45)) + F('M147.5 56h5l-1 9h-3z', tint(c, -0.45)));
    // puffy arms going into the hand pockets
    const AL = [[98, 64], [78, 144], [104, 196]], AW = [46, 42, 38];
    for (const P of [AL, AL.map(mir)]) {
      let a1 = '', a2 = ''; for (let y = 84; y < 200; y += 30) { a1 += `M40 ${y}C80 ${y + 5} 220 ${y + 5} 260 ${y}`; a2 += `M40 ${y + 3}C80 ${y + 8} 220 ${y + 8} 260 ${y + 3}V${y + 12}H40Z`; }
      const qq = F(a2, tint(c, 0.12)) + S(a1, tint(c, -0.36), 1.3);
      b.part(tube(P, AW, true), c, qq + F(band(P, AW, -0.2, -0.8), tint(c, -0.16)));
    }
    b.part('M98 176L112 172L120 222L104 226Z', tint(c, -0.06), S('M106 180L112 220', tint(c, -0.5), 1.4));
    b.part('M202 176L188 172L180 222L196 226Z', tint(c, -0.14), S('M194 180L188 220', tint(c, -0.5), 1.4));
    b.part('M120 28C132 38 168 38 180 28C182 40 180 52 176 60C162 66 138 66 124 60C120 52 118 40 120 28Z', c,
      F('M150 34V70H190V20Z', tint(c, -0.14)) + S('M122 44C138 52 162 52 178 44', tint(c, -0.36), 1.2) + F('M150 34H153V70H150Z', tint(c, -0.42)));
  });

  // 7 — striped rugby shirt, baggy jeans, skate shoes; holding a skateboard
  outfit('boy-rugby-skate', 'Rugby shirt & skateboard', ['#2e5a43', '#86a2c0', '#26272c', '#c58b64', '#efe5cf'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3), c2 = g(4);
    b.def(`<pattern id="${id}-st" patternUnits="userSpaceOnUse" width="10" height="30"><rect width="10" height="30" fill="${c}"/><rect y="15" width="10" height="15" fill="${c2}"/></pattern>`);
    const ST = `url(#${id}-st)`, OL = tint(c, -0.35), DK = tint(c, -0.6);
    feet(b, id, 'skate', s, sk, [117, 506], [183, 506]);
    const jd = S('M99 262C108 274 116 280 120 290M201 262C192 274 184 280 180 290M138 256V292C138 300 146 302 150 304', tint(p, -0.3), 1, DASH) +
      F('M106 320C116 350 116 380 110 410C100 380 98 350 106 320ZM194 320C184 350 184 380 190 410C200 380 202 350 194 320Z', tint(p, 0.22)) +
      S('M126 312C134 318 142 316 146 312M126 322C134 330 142 326 146 320M154 312C158 316 166 318 174 312', tint(p, 0.32), 1.1) +
      S('M90 458C104 452 118 462 140 454M90 476C106 468 122 480 142 470M160 454C182 462 196 452 210 458M158 470C178 480 194 468 210 476', tint(p, -0.3), 1.1);
    pants(b, p, { wy: 244, whw: 56, cr: [150, 306], L: [[123, 256], [117, 370], [115, 478]], W: [64, 64, 68], extra: jd });
    // skateboard hanging from the right hand
    b.add(`<g transform="translate(240 236) rotate(-7)">` +
      F('M-24 22C-24 4-14 -2 0 -2C14 -2 24 4 24 22V240C24 258 14 264 0 264C-14 264-24 258-24 240Z', '#d79a3a', OUT('#d79a3a', 1.1)) +
      F('M8 0C18 2 24 8 24 22V240C24 256 16 262 8 263Z', tint('#d79a3a', -0.18)) +
      C(0, 130, 15, 'none', ` stroke="${c}" stroke-width="7"`) + F('M-24 96H24V104H-24ZM-24 156H24V164H-24Z', c2) + C(0, 130, 5, c) +
      F('M-30 40h60v10h-60zM-30 212h60v10h-60z', '#d9d6cf', OUT('#d9d6cf', 0.8)) + F('M-8 34h16v22h-16zM-8 206h16v22h-16z', '#b8b5ae', OUT('#b8b5ae', 0.8)) +
      F('M-36 36h10v18h-10zM26 36h10v18h-10zM-36 208h10v18h-10zM26 208h10v18h-10z', '#efe8d6', OUT('#efe8d6', 0.9)) + '</g>');
    neck(b, sk);
    const AL = [[106, 62], [96, 150], [94, 236]], AR = [[194, 62], [208, 150], [222, 232]], AW = [36, 32, 28];
    for (const P of [AL, AR]) {
      b.part(tube(P, AW, true), ST, F(band(P, AW, -0.15, -0.8), DK, ' fill-opacity=".28"'), OL);
      b.part(cuff(P, AW, 12), c, ribs(60, 240, 200, 250, 3.2, tint(c, -0.35), 0.6), OL);
    }
    b.add(hand(94, 236, endAng(AL), sk) + hand(222, 232, endAng(AR), sk, 'fist'));
    b.part(sym([[150, 32, 1], [164, 28], [184, 32], [204, 46, 1], [208, 64], [204, 120], [206, 252, 1], [150, 254, 1]]), ST,
      F('M184 40C206 90 206 180 208 256H240V30Z', DK, ' fill-opacity=".26"') + F('M96 50C104 90 104 180 100 256H80V40Z', '#ffffff', ' fill-opacity=".1"') +
      S('M126 120C132 140 132 160 124 178M176 110C170 130 174 150 180 162', DK, 1.3, ' stroke-opacity=".4"') + F('M90 240H210V256H90Z', DK, ' fill-opacity=".22"'), OL);
    b.part('M142 30H158V96H142Z', RUB, S('M142 30H158V96', tint(RUB, -0.2), 1) + C(150, 52, 2.2, tint(RUB, -0.3)) + C(150, 72, 2.2, tint(RUB, -0.3)) + F('M152 30H158V96H152Z', tint(RUB, -0.08)), tint(RUB, -0.35));
    const col = [[150, 32], [134, 24], [118, 30, 1], [114, 42], [128, 68, 1], [144, 40]];
    b.part(shape(col), RUB, F('M114 42L128 68L134 56Z', tint(RUB, -0.1)), tint(RUB, -0.35)).part(shape(col.map(mir)), RUB, F('M150 0H200V80H150Z', tint(RUB, -0.12)), tint(RUB, -0.35));
  });

  // 8 — argyle sweater vest over a shirt, pleated trousers, derbies; tote on the shoulder
  outfit('boy-vest-pleats', 'Sweater vest & pleats', ['#c9b07a', '#6b5644', '#2e211a', '#dba57e', '#c4d6ea'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3), sh = g(4);
    feet(b, id, 'derby', s, sk, [117, 506], [183, 506]);
    const pl = S('M134 216C134 240 132 262 130 280M118 214C116 240 116 270 118 300M166 216C166 240 168 262 170 280M182 214C184 240 184 270 182 300', tint(p, -0.3), 1.1) +
      S('M118 300C117 360 116 420 116 486M182 300C183 360 184 420 184 486', tint(p, 0.2), 1.2) + S('M98 228L104 262M202 228L196 262', tint(p, -0.4), 1.2) +
      S('M100 472C112 468 124 474 138 468M162 468C176 474 188 468 200 472', tint(p, -0.3), 1);
    pants(b, p, { wy: 206, whw: 52, cr: [150, 282], L: [[124, 232], [120, 362], [118, 484]], W: [62, 54, 52], extra: pl });
    neck(b, sk);
    // shirt
    const AL = [[106, 62], [98, 150], [96, 234]], AW = [34, 31, 27];
    b.part(sym([[150, 36, 1], [166, 30], [184, 34], [202, 46, 1], [206, 64], [202, 120], [200, 214, 1], [150, 216, 1]]), sh,
      F('M180 40C198 80 202 160 200 220H230V30Z', tint(sh, -0.14)));
    b.part(tube(AL, AW, true), sh, F(band(AL, AW, -0.12, -0.8), tint(sh, -0.15)) + F(band(AL, AW, 0.44, 0.25), tint(sh, 0.15)) + S('M92 140C98 146 102 148 106 150', tint(sh, -0.3), 1));
    b.part(cuff(AL, AW, 14), tint(sh, 0.06), C(96, 226, 1.6, tint(sh, -0.35)));
    b.add(hand(96, 234, endAng(AL), sk));
    // vest with argyle
    let ar = ''; const dk = tint(c, -0.16), ln = tint(p, 0.15);
    for (let row = 0; row < 5; row++) for (let i = -3; i <= 3; i++) {
      const x = 150 + i * 24 + (row % 2 ? 12 : 0), y = 100 + row * 30;
      if ((i + row) % 2 === 0) ar += `M${x} ${y - 15}L${x + 12} ${y}L${x} ${y + 15}L${x - 12} ${y}Z`;
    }
    let dl = ''; for (let i = -6; i <= 6; i++) dl += `M${150 + i * 24} 70l120 150M${150 + i * 24} 70l-120 150`;
    b.part(sym([[150, 104, 1], [162, 76], [172, 36], [182, 32], [194, 42, 1], [190, 72], [182, 98], [190, 130], [194, 220, 1], [150, 222, 1]]), c,
      F(ar, dk) + S(dl, ln, 0.7, ' stroke-dasharray="3 3"') + F('M176 40C192 90 196 160 196 224H230V30Z', tint(c, -0.15)) +
      S('M150 104L168 34M150 104L132 34', tint(c, -0.1), 9) + ribs(100, 200, 200, 224, 3.2, tint(c, -0.3), 0.7) + S('M100 202H200', tint(c, -0.3), 1) +
      S('M186 40C186 70 180 92 184 102C186 104 190 108 192 110', tint(c, -0.1), 8) + MX(S('M186 40C186 70 180 92 184 102C186 104 190 108 192 110', tint(c, -0.1), 8)));
    // collar points over the vest
    const col = [[150, 40], [140, 24], [130, 26], [126, 36], [134, 66, 1], [148, 46]];
    b.part(shape(col), tint(sh, 0.08), F('M126 36L134 66L140 52Z', tint(sh, -0.1))).part(shape(col.map(mir)), tint(sh, 0.08), F('M150 0H190V80H150Z', tint(sh, -0.1)));
    // carrying a canvas tote by its handles
    const tote = '#ebe2cd', AR = [[196, 62], [209, 150], [215, 232]];
    b.part(tube(AR, AW, true), sh, F(band(AR, AW, -0.12, -0.8), tint(sh, -0.15)) + F(band(AR, AW, 0.44, 0.25), tint(sh, 0.15)) + S('M204 140C210 146 214 148 218 150', tint(sh, -0.3), 1));
    b.part(cuff(AR, AW, 14), tint(sh, 0.06), C(215, 224, 1.6, tint(sh, -0.35)));
    b.add(S('M200 292C202 264 210 248 216 246C222 248 232 264 236 292', tint(tote, -0.3), 5));
    b.part('M184 286H250L256 372C256 376 254 378 250 378H188C184 378 182 376 182 372Z', tote,
      F('M234 286H250L256 372C256 376 254 378 250 378H238Z', tint(tote, -0.12)) + F('M180 348H258V360H180Z', p) + S('M190 296C196 320 196 340 192 370', tint(tote, 0.4), 2) + S('M184 292H252', tint(tote, -0.3), 0.8, DASH));
    b.add(S('M194 296C196 266 206 248 215 246C224 248 236 266 240 296', tint(tote, -0.3), 6) + S('M194 296C196 266 206 248 215 246C224 248 236 266 240 296', tote, 4) +
      hand(215, 232, endAng(AR), sk, 'fist'));
  });

  // 9 — camel overcoat, black turtleneck & trousers, chelsea boots; walking, hands in pockets
  outfit('boy-camel-coat', 'Camel overcoat', ['#c39a6b', '#26262a', '#1c1b1b', '#f2c9a8', '#1e1e21'], (b, g, id) => {
    const c = g(0), p = g(1), s = g(2), sk = g(3), tn = g(4);
    const L = [[128, 240], [116, 370], [107, 452]], R = [[172, 240], [182, 372], [187, 474]], W = [50, 44, 40];
    feet(b, id, 'chelsea', s, sk, [118, 500, 16], [187, 507]);
    pants(b, p, { wy: 220, whw: 50, cr: [150, 290], L, R, W, extra: S('M116 380C114 410 110 440 108 460M182 380C184 410 186 440 187 470', tint(p, 0.22), 1.2) });
    neck(b, sk);
    b.part(sym([[150, 40, 1], [166, 34], [184, 36], [200, 60], [196, 160, 1], [150, 160, 1]]), tn, F('M156 40V160H200V40Z', tint(tn, -0.25)));
    // arms (in front) into coat pockets: drawn after the coat body below
    const body = sym([[150, 150, 1], [168, 30], [206, 44, 1], [212, 66], [208, 140], [214, 300], [222, 392, 1], [160, 392, 1], [150, 330, 1]]);
    b.part(body, c,
      F('M188 40C210 100 212 260 224 400H250V30Z', tint(c, -0.16)) + F('M94 44C102 120 96 260 86 400H60V30Z', tint(c, 0.12)) +
      S('M150 150L134 176V392', tint(c, -0.45), 1.3) + F('M134 176V392H140V172Z', tint(c, -0.1)) + C(141, 196, 3.4, tint(c, -0.45)) + C(141, 250, 3.4, tint(c, -0.45)) +
      S('M110 300C116 340 112 370 106 392M190 300C186 340 190 370 196 392M160 330C164 360 166 380 168 392', tint(c, -0.22), 1.2) + S('M172 112L190 109', tint(c, -0.45), 2));
    const AL = [[106, 66], [97, 160], [116, 236]], AW = [40, 36, 34];
    for (const P of [AL, AL.map(mir)]) b.part(tube(P, AW, true), c, F(band(P, AW, -0.12, -0.8), tint(c, -0.17)) + F(band(P, AW, 0.44, 0.24), tint(c, 0.12)) + F(cuff(P, AW, 18), tint(c, -0.05)) + S(cuff(P, AW, 18), tint(c, -0.3), 0.8));
    b.part('M100 232H134V246C122 248 110 248 100 246Z', c, F('M100 240H134V246H100Z', tint(c, -0.14)));
    b.part('M166 232H200V246C190 248 178 248 166 246Z', tint(c, -0.1), F('M166 240H200V246H166Z', tint(c, -0.22)));
    const lap = [[137, 26], [124, 36], [98, 46, 1], [106, 62, 1], [114, 60, 1], [112, 76], [146, 150, 1], [134, 96], [139, 42, 1]];
    b.part(shape(lap), c, F('M112 76L146 150L138 150L108 76Z', tint(c, -0.2)) + S('M118 70L144 132', tint(c, 0.25), 1.2));
    b.part(shape(lap.map(mir)), c, F('M188 76L154 150L170 150L200 76Z', tint(c, -0.22)) + F('M160 30V140H210V30Z', tint(c, -0.08)));
    b.part('M128 27C128 18 172 18 172 27L176 54C166 62 134 62 124 54Z', tn, ribs(126, 176, 16, 62, 4, tint(tn, 0.14), 0.9) + F('M150 10H180V62H150Z', tint(tn, -0.2)) + S('M124 40C140 46 160 46 176 40', tint(tn, 0.2), 1.2), tint(tn, 0.15));
  });

  /* ======================================================== SHOES & BAGS */
  const BOX = { dad: [-28, -43, 50, 2], hi: [-24, -53, 49, 1], chelsea: [-23, -61, 47, 1], desert: [-24, -46, 48, 1] };
  function shoeItem(id, name, kind, w, h, s, colors) {
    item(id, name, w, h, colors, (b, g) => {
      const bx = BOX[kind], tx = w / 2 - ((bx[0] + bx[2]) / 2) * s, ty = h / 2 - ((bx[1] + bx[3]) / 2) * s;
      b.add(`<g transform="translate(${r(tx)} ${r(ty)}) scale(${s})">${SH[kind](g(0))}</g>`);
    });
  }
  shoeItem('shoe-m-dad-sneaker', 'Chunky dad sneaker', 'dad', 300, 190, 3.7, ['#f2f0ea']);
  shoeItem('shoe-m-hightop', 'High-top canvas sneaker', 'hi', 280, 230, 3.6, ['#b9352d']);
  shoeItem('shoe-m-chelsea', 'Chelsea boot', 'chelsea', 270, 250, 3.6, ['#3b2a20']);
  shoeItem('shoe-m-desert-boot', 'Suede desert boot', 'desert', 280, 220, 3.6, ['#c4a27a']);

  item('shoe-m-slide', 'Slide sandal', 300, 170, ['#2b2d33', '#e9e2d3'], (b, g) => {
    const c = g(0), bed = g(1);
    b.part('M24 104C16 124 32 148 66 148H252C282 148 296 132 288 108Z', tint(bed, -0.25), F('M20 136H290V150H20Z', tint(bed, -0.45)) + S('M30 128C80 134 200 134 284 124', tint(bed, -0.1), 1.2));
    b.part('M24 104C22 84 52 76 96 78L238 86C278 88 296 100 288 110C278 120 246 120 206 118L86 122C50 124 26 118 24 104Z', bed,
      F('M50 92C80 86 150 88 226 96C200 104 120 106 56 106Z', tint(bed, -0.1)) + F('M24 104C40 118 70 122 120 120H40Z', tint(bed, 0.4)));
    b.part('M134 120C132 78 160 46 204 44C246 44 272 72 276 112C248 122 186 126 134 120Z', c,
      F('M134 120C132 84 150 56 180 48C162 74 158 98 162 122Z', tint(c, -0.55)) + F('M236 50C260 62 274 86 276 112C262 118 250 120 238 121C246 98 246 70 236 50Z', tint(c, -0.22)) +
      S('M166 72C180 56 200 50 224 52', tint(c, 0.4), 3) + S('M164 116C166 84 184 60 210 58C240 58 258 80 262 110', tint(c, 0.25), 1, DASH));
  });

  item('bag-m-tote', 'Canvas tote bag', 240, 300, ['#ebe2cd', '#2f4a6b'], (b, g) => {
    const c = g(0), a = g(1);
    b.add(S('M80 116C80 40 100 18 120 18C140 18 160 40 160 116', tint(a, -0.3), 15) + S('M80 116C80 40 100 18 120 18C140 18 160 40 160 116', tint(a, -0.15), 12));
    b.part('M30 112H210L218 280C218 288 214 292 206 292H34C26 292 22 288 22 280Z', c,
      F('M30 112H210V124H30Z', tint(c, -0.2)) + F('M176 112H210L218 280C218 288 214 292 206 292H186C192 230 186 160 176 112Z', tint(c, -0.13)) +
      F('M20 230H220V250H20Z', a) + F('M20 250H220V256H20Z', tint(a, -0.3)) +
      S('M70 140C76 180 72 220 64 260M150 136C158 170 160 200 154 228', tint(c, -0.14), 1.4) + S('M40 130C44 170 42 220 38 270', tint(c, 0.35), 3) +
      S('M30 120H210', tint(c, -0.35), 0.9, DASH));
    b.add(S('M64 230V116C64 34 92 4 120 4C148 4 176 34 176 116V230', tint(a, -0.35), 15) + S('M64 230V116C64 34 92 4 120 4C148 4 176 34 176 116V230', a, 12) +
      S('M64 230V116C64 40 92 9 120 9', tint(a, 0.3), 2) + S('M58 128H70M170 128H182', tint(a, 0.25), 1, DASH));
  });

  item('bag-m-sling', 'Crossbody sling bag', 300, 220, ['#3a3d44', '#c9a24a'], (b, g) => {
    const c = g(0), a = g(1);
    b.add(S('M52 132C40 60 90 14 150 14C210 14 260 60 248 132', tint(c, -0.35), 12) + S('M52 132C40 60 90 14 150 14C210 14 260 60 248 132', tint(c, 0.1), 9) +
      F('M222 46h24v18h-24z', a, OUT(a, 1)) + F('M228 50h12v10h-12z', tint(a, -0.4)));
    b.part('M40 136C40 112 70 100 150 100C230 100 260 112 260 136C260 176 222 206 150 206C78 206 40 176 40 136Z', c,
      F('M40 168C60 200 110 210 150 210C210 210 250 190 262 150V214H40Z', tint(c, -0.22)) + F('M70 112C110 106 190 106 230 112C190 118 110 118 70 112Z', tint(c, 0.15)) +
      Fo('M74 142C100 150 200 150 226 142C226 168 200 184 150 184C100 184 74 168 74 142Z', tint(c, 0.06)) +
      S('M44 128C80 118 220 118 256 128', tint(c, -0.55), 3) + S('M44 128C80 118 220 118 256 128', tint(c, 0.25), 1, ' stroke-dasharray="1.5 1.5"') +
      S('M76 144C100 152 200 152 224 144', tint(c, -0.55), 2.4) + S('M90 196C120 204 180 204 210 196', tint(c, 0.15), 1, DASH));
    b.add(F('M200 118h10v14h-10z', a, OUT(a, 0.8)) + S('M205 132v14', a, 2) + F('M200 146h10v6h-10z', a) +
      F('M182 146h8v14h-8z', a, OUT(a, 0.8)) + S('M186 160v10', a, 2) + F('M30 124h18v22h-18zM252 124h18v22h-18z', tint(c, -0.3)));
  });

  item('bag-m-backpack', 'Backpack', 240, 300, ['#4e6b52', '#d9a441'], (b, g) => {
    const c = g(0), a = g(1);
    b.add(S('M104 30C104 8 136 8 136 30', tint(c, -0.4), 7) + F('M40 70C30 120 34 220 44 280H64L58 70Z', tint(c, -0.35)) + F('M200 70C210 120 206 220 196 280H176L182 70Z', tint(c, -0.35)));
    b.part('M120 26C70 26 44 50 44 100V262C44 282 56 292 76 292H164C184 292 196 282 196 262V100C196 50 170 26 120 26Z', c,
      F('M170 30C190 50 196 80 196 110V292H176C184 220 184 120 170 30Z', tint(c, -0.16)) + F('M58 70C52 120 54 200 62 270H48V70Z', tint(c, 0.12)) +
      S('M52 104C80 66 160 66 188 104', tint(c, -0.5), 3) + S('M52 104C80 66 160 66 188 104', tint(c, 0.2), 1, DASH) +
      Fo('M66 170C66 158 74 152 88 152H152C166 152 174 158 174 170V256C174 270 166 276 152 276H88C74 276 66 270 66 256Z', tint(c, -0.06)) +
      S('M70 176C90 168 150 168 170 176', tint(c, -0.5), 2.2) + F('M66 230H174V276H66Z', tint(c, -0.14)) + F('M100 196h40v18h-40z', a, OUT(a, 0.8)) +
      S('M48 290C70 296 170 296 192 290', tint(c, -0.4), 4));
    b.add(S('M156 92v10M160 170v8', tint(c, -0.5), 1.5) + `<rect x="151" y="102" width="10" height="18" rx="4" fill="${a}"${OUT(a, 0.8)}/><rect x="155" y="178" width="10" height="16" rx="4" fill="${a}"${OUT(a, 0.8)}/>`);
  });

  item('acc-cap', 'Baseball cap', 260, 170, ['#20365a', '#f0e9da'], (b, g) => {
    const c = g(0), a = g(1);
    b.part('M120 128C150 116 210 118 246 134C252 140 246 152 234 154C200 156 160 150 120 146Z', tint(c, -0.1),
      F('M120 140C160 146 210 150 246 140V160H120Z', tint(c, -0.35)) + S('M126 132C160 124 214 128 240 138', tint(c, 0.25), 1.2) + S('M130 138C170 134 210 138 238 146', tint(c, -0.4), 0.9, DASH));
    b.part('M20 134C14 80 50 34 106 30C160 28 184 70 182 132C140 124 70 124 20 134Z', c,
      F('M140 34C170 50 186 90 182 132C170 130 158 128 150 128C158 96 154 60 140 34Z', tint(c, -0.18)) + F('M30 80C40 56 60 42 86 36C66 56 56 80 52 110Z', tint(c, 0.14)) +
      S('M106 30C88 56 76 96 76 126M106 30C122 54 128 92 126 126', tint(c, -0.4), 1.1) +
      C(56, 66, 2.4, tint(c, -0.45)) + C(98, 54, 2.4, tint(c, -0.45)) + S('M22 128C70 120 140 120 182 128', tint(c, -0.4), 2.5) +
      F('M134 74C146 72 160 74 168 80L166 104C156 100 144 98 134 98Z', a, OUT(a, 0.8)));
    b.add(F('M98 28C98 22 114 22 114 28C112 31 100 31 98 28Z', c, OUT(c, 0.9)));
  });

  item('acc-beanie', 'Beanie', 240, 210, ['#c2533a'], (b, g) => {
    const c = g(0);
    b.add(C(120, 22, 18, tint(c, 0.08), OUT(c, 1)) + S('M108 14l8 8M120 8v14M132 14l-8 8M104 26h10M126 26h10', tint(c, -0.25), 1.4));
    b.part('M30 140C26 80 66 34 120 34C174 34 214 80 210 140Z', c,
      ribs(30, 210, 30, 140, 9, tint(c, -0.2), 2.2) + F('M160 40C196 60 212 100 210 140H178C182 100 176 66 160 40Z', tint(c, -0.16)) + F('M44 90C56 60 80 44 104 40C80 60 66 90 62 120Z', tint(c, 0.14)));
    b.part('M24 130C70 120 170 120 216 130L220 186C170 196 70 196 20 186Z', tint(c, -0.04),
      ribs(22, 220, 120, 200, 6, tint(c, -0.26), 2.6) + F('M180 120H222V200H180Z', tint(c, -0.16)) + S('M24 132C70 122 170 122 216 132', tint(c, 0.25), 2) +
      F('M100 146h40v24h-40z', tint(c, 0.7), OUT(c, 0.8)));
  });

  item('acc-iced-coffee', 'Iced coffee', 140, 260, ['#8a5a36', '#4f9a6e'], (b, g) => b.add(coffee(g(0), g(1))));

  (window.STICKERS = window.STICKERS || []).push(...add);
})();
