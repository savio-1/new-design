/* Studio sticker pack — "big-head" outfit bodies (girls) + shoes & bags.
 * Each outfit is a body from the neck down (no head) in a 300×520 viewBox with
 * `neck: [150, 18]` marking where a cut-out photo head attaches. Colours are
 * [top/main garment, bottoms, shoes, skin, (accent)]; every shade is derived
 * from them with tint() so recolouring keeps the shading.
 * Appends to window.STICKERS. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  const N = (v) => Math.round(v * 10) / 10;
  const pt = (p) => N(p[0]) + ',' + N(p[1]);

  function rgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return /^[0-9a-f]{6}/i.test(h) && !isNaN(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [136, 136, 136];
  }
  // tint(hex, amount): amount > 0 mixes toward white, < 0 toward black
  function tint(h, a) {
    const t = a > 0 ? 255 : 0, k = Math.min(1, Math.abs(a));
    return '#' + rgb(h).map((v) => Math.round(v + (t - v) * k).toString(16).padStart(2, '0')).join('');
  }

  const P = (d, fill, x) => `<path d="${d}" fill="${fill}"${x || ''}/>`;
  const ol = (c, w, a) => ` stroke="${tint(c, a == null ? -0.38 : a)}"` + (w && w !== 0.8 ? ` stroke-width="${w}"` : '');
  const op = (o) => ` opacity="${o}"`;
  const line = (d, c, w, x) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"${x || ''}/>`;
  const dash = (d, c, w) => line(d, c, w || 0.8, ' stroke-dasharray="2.4 2"');
  const circ = (x, y, r, fill, x2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${x2 || ''}/>`;
  const G = (tr, inner) => `<g transform="${tr}">${inner}</g>`;
  // mirror an absolute-coordinate path (x,y pairs written with commas) around x = 150
  const mir = (d) => d.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, x, y) => N(300 - x) + ',' + y);
  const both = (d, fill, x) => P(d, fill, x) + P(mir(d), fill, x);
  const bothL = (d, c, w, x) => line(d, c, w, x) + line(mir(d), c, w, x);
  const mp = (pts) => pts.map(([x, y]) => [300 - x, y]);

  // Catmull-Rom spline segments through p (continues from p[0])
  function seg(p) {
    let d = '';
    const n = p.length, g = (i) => p[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' +
        pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d;
  }
  // closed outline of a tapered tube along centreline pts with widths ws (limbs, sleeves, trouser legs)
  function tube(pts, ws) {
    const L = [], R = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const h = ws[i] / 2;
      L.push([pts[i][0] - ty * h, pts[i][1] + tx * h]);
      R.push([pts[i][0] + ty * h, pts[i][1] - tx * h]);
    }
    R.reverse();
    return 'M' + pt(L[0]) + seg(L) + 'L' + pt(R[0]) + seg(R) + 'Z';
  }
  // sleeve / arm: tube with a tapered cap toward the neck so the shoulder reads round
  function sleeve(pts, ws) {
    const [a, b] = pts, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    const k = a[0] < 150 ? 1 : -1;
    return tube([[a[0] - dx / l * 9 + k * 7, a[1] - dy / l * 9], ...pts], [ws[0] * 0.5, ...ws]);
  }
  // horizontal cylinder shading gradient
  const lg = (id, c, k) => {
    k = k || 1;
    return `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${tint(c, -0.2 * k)}"/>` +
      `<stop offset=".42" stop-color="${tint(c, 0.08 * k)}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${tint(c, -0.24 * k)}"/></linearGradient>`;
  };
  const SVG = (w, h, defs, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs ? `<defs>${defs}</defs>` : '') + `<g stroke-width=".8" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

  /* ------------------------------------------------------------- body parts */
  const neck = (sk) =>
    P('M141,18 L159,18 C159,27 160,34 166,42 L134,42 C140,34 141,27 141,18Z', sk) +
    P('M141,18 L159,18 L159,25 C154,30 146,30 141,25Z', tint(sk, -0.2));

  // wrist at (x,y), hand hangs along +y rotated by a°, fl = +1 thumb toward +x
  function hand(x, y, a, sk, fl, s) {
    s = s || 1;
    return G(`translate(${N(x)},${N(y)}) rotate(${a}) scale(${fl * s},${s})`,
      P('M4.5,1 C10,4 11.5,9 9.5,13 C8,15.5 5.5,14.5 5.2,11Z', tint(sk, -0.06), ol(sk, 0.6, -0.3)) +
      P('M-6.5,-2 C-8,6 -8.2,13 -6,18.5 C-3.6,23.5 3.6,23.5 6,19 C7.8,14 7.6,6 6.5,-2Z', sk, ol(sk, 0.6, -0.3)) +
      line('M-2.2,13 L-2.5,20.5 M1.7,13.5 L1.9,21', tint(sk, -0.24), 0.6));
  }

  /* shoes — local side view: heel at x≈0, toe at x≈106 pointing +x, ground y=0 */
  function shoe(kind, c, o) {
    o = o || {};
    let s = '';
    const nap = o.nap ? (d) => P(d, `url(#${o.nap})`) : () => '';
    if (kind === 'clog') {
      const so = o.sole || '#c9a679';
      if (o.foot) s += P('M8,-70 L32,-70 L33,-14 L7,-14Z', o.foot);
      s += P('M0,-14 L101,-14 C107,-14 109,-8 106,-4 L2,-4 C0,-6 -1,-10 0,-14Z', so, ol(so, 0.7)) +
        line('M8,-9 L18,-9 M30,-8 L44,-8 M60,-9 L72,-9 M84,-8 L96,-8', tint(so, -0.2), 0.8) +
        P('M2,-4 L106,-4 C106,-1 103,0 100,0 L4,0 C2,0 1,-2 2,-4Z', tint(so, -0.72));
      if (o.inside) s += P('M1,-14 C8,-19 22,-20 30,-18 L31,-14Z', tint(so, -0.3));
      const up = 'M26,-14 C25,-32 40,-47 61,-48 C84,-48 101,-36 107,-17 L106,-14Z';
      s += P(up, c, ol(c)) + nap(up) +
        P('M27,-14 C34,-22 56,-25 75,-23 C91,-21 101,-17 106,-14Z', tint(c, -0.2)) +
        P('M56,-42 C68,-46 85,-43 95,-33 C83,-38 69,-41 56,-42Z', tint(c, 0.25)) +
        dash('M31,-17 L104,-17', tint(c, 0.35)) +
        P('M26,-15 C26,-30 34,-42 45,-47 L54,-48 C43,-41 35,-30 35,-15Z', tint(c, -0.1), ol(c, 0.7)) +
        `<rect x="25" y="-33" width="11" height="8" rx="2" fill="none" stroke="${o.acc || '#d8c08a'}" stroke-width="1.8"/>`;
    } else if (kind === 'mule') {
      if (o.foot) s += P('M8,-70 L32,-70 L33,-40 C40,-32 56,-24 78,-14 L64,-6 C46,-10 28,-18 5,-23 C4,-30 6,-36 8,-42Z', o.foot);
      const hd = tint(c, -0.35);
      s += P('M3,0 L19,0 L21,-21 L2,-23Z', hd, ol(hd, 0.6)) +
        P('M1,-23 C24,-22 44,-12 62,-6 L101,-5 C106,-5 107,-1 103,0 L62,0 C44,-4 30,-12 21,-17 L21,-21Z', tint(c, -0.5));
      if (o.inside) s += P('M2,-23 C22,-22 38,-15 48,-10 L47,-7.5 C38,-12 22,-19 2,-21Z', tint(c, 0.2));
      const up = 'M44,-8 C46,-26 58,-36 73,-35 C89,-33 101,-19 106,-5 L62,-5Z';
      s += P(up, c, ol(c)) + nap(up) +
        P('M46,-8 C54,-14 76,-13 104,-6 L62,-5Z', tint(c, -0.2)) +
        P('M66,-31 C78,-34 91,-28 99,-17 C89,-25 77,-30 66,-31Z', tint(c, 0.28)) +
        P('M49,-22 C55,-29 65,-33 73,-34 L76,-27 C67,-26 58,-22 52,-17Z', tint(c, -0.14), ol(c, 0.6)) +
        `<rect x="56" y="-32" width="11" height="8" rx="1.5" transform="rotate(-18 61.5 -28)" fill="none" stroke="${o.acc || '#d6b56a'}" stroke-width="2"/>`;
    } else if (kind === 'loafer') {
      if (o.foot) s += P('M8,-70 L32,-70 L32,-22 L8,-22Z', o.foot);
      const so = o.sole || '#2c1e17';
      if (o.inside) s += P('M-1,-28 C12,-33 30,-30 42,-24 C30,-24 14,-26 -1,-26Z', tint(c, -0.55));
      const up = 'M0,-8 L-1,-28 C12,-31 27,-27 40,-23 C52,-31 66,-33 79,-29 C95,-23 105,-14 103,-8Z';
      s += P('M0,-8 L101,-8 C106,-8 107,-3 103,-2 L24,-3 L23,0 L1,0Z', so) +
        P(up, c, ol(c)) + nap(up) +
        P('M1,-8 C30,-13 76,-15 103,-8Z', tint(c, -0.22)) +
        P('M72,-27 C85,-25 96,-19 100,-12 C92,-18 82,-23 72,-27Z', tint(c, 0.28)) +
        P('M42,-24 C52,-31 64,-33 75,-30 L73,-23 C63,-26 53,-24 46,-19Z', tint(c, -0.12), ol(c, 0.6)) +
        `<ellipse cx="59" cy="-26.5" rx="5.5" ry="1.6" transform="rotate(-6 59 -26.5)" fill="${tint(c, -0.6)}"/>` +
        dash('M75,-29 C87,-26 97,-18 100,-10', tint(c, 0.4)) + line('M3,-27 C6,-18 8,-12 9,-8', tint(c, -0.3), 0.7);
    } else if (kind === 'sneaker') {
      if (o.foot) s += P('M8,-80 L32,-80 L33,-40 L7,-40Z', o.foot);
      const so = o.sole || tint(c, -0.04), ac = o.acc || tint(c, -0.2);
      s += P('M-3,-17 C-4,-8 -3,0 4,0 L99,0 C107,0 111,-6 109,-14 L105,-19 C80,-15 40,-16 -3,-17Z', so, ol(so, 0.8, -0.3)) +
        line('M2,-5 L104,-5', tint(so, -0.28), 1.3) + line('M8,-11 C40,-12 70,-12 100,-13', tint(so, -0.15), 0.7) +
        P('M33,-50 C36,-60 46,-62 50,-56 L48,-50Z', tint(c, -0.1), ol(c, 0.7, -0.3)) +
        P('M-2,-17 L-1,-47 C8,-51 18,-49 26,-45 C33,-51 41,-54 47,-52 C60,-41 80,-31 101,-25 C108,-23 109,-19 105,-17Z', c, ol(c, 0.8, -0.32)) +
        P('M80,-18 C88,-27 99,-27 106,-19Z', tint(c, -0.08), ol(c, 0.6, -0.3)) +
        P('M16,-18 C28,-36 50,-40 72,-31 C60,-29 46,-25 34,-18Z', ac, ol(ac, 0.6, -0.3)) +
        P('M-1,-43 L8,-49 L11,-28 L-1,-24Z', ac) +
        line('M38,-47 L47,-43 M45,-43 L54,-39 M52,-39 L61,-35 M59,-35 L68,-31', tint(c, -0.4), 1.5) +
        P('M84,-24 C92,-27 100,-25 104,-21 C97,-23 90,-24 84,-24Z', tint(c, 0.5));
    } else if (kind === 'mary') {
      if (o.foot) s += P('M8,-80 L32,-80 L34,-34 C46,-26 60,-24 74,-24 L74,-18 L5,-20Z', o.foot);
      if (o.inside) s += P('M0,-26 C14,-30 28,-26 36,-21 C24,-22 10,-23 0,-23Z', o.acc || '#c9a27c');
      s += P('M1,0 L17,0 L18,-7 L0,-7Z', tint(c, -0.25)) +
        P('M0,-7 L100,-7 C105,-7 106,-2 102,-1 L20,-2 L18,-7Z', tint(c, -0.3)) +
        P('M0,-7 L0,-26 C12,-28 24,-24 34,-20 C50,-26 70,-28 86,-23 C99,-18 105,-12 102,-7Z', c, ol(c, 0.8, 0.25)) +
        line('M70,-24 C83,-23 92,-19 97,-12', tint(c, 0.6), 2.4) + line('M4,-22 L4,-12', tint(c, 0.45), 1.6) +
        P('M24,-22 C25,-32 30,-40 36,-44 L43,-43 C37,-37 33,-29 33,-21Z', c, ol(c, 0.7, 0.25)) +
        circ(28.5, -24.5, 2.4, tint(c, 0.4));
    } else if (kind === 'sandal') {
      const sk = o.foot || '#dca27f', skc = o.skin || sk;
      s += P('M1,0 L14,0 L15,-12 L0,-13Z', tint(c, -0.3)) +
        P('M0,-13 C20,-12 40,-6 58,-4 L102,-4 C107,-4 107,0 102,0 L58,0 C40,-2 24,-6 15,-8 L14,-12Z', tint(c, -0.25)) +
        P('M8,-64 L32,-64 L32,-14 L3,-14 C2,-24 4,-30 8,-36Z', sk) + P('M30,-46 C42,-32 64,-20 92,-12 C101,-10 105,-7 103,-5 L58,-5 C40,-8 24,-12 2,-14 C2,-18 4,-22 6,-24 L30,-26Z', skc, ol(skc, 0.6, -0.3)) +
        line('M88,-11 L90,-6 M96,-9 L97,-5', tint(skc, -0.25), 0.7) +
        P('M6,-46 L34,-44 L34,-38 L6,-40Z', c, ol(c, 0.5)) +
        P('M30,-48 L50,-28 L45,-25 L27,-43Z', c, ol(c, 0.5)) +
        P('M70,-21 L80,-17 L78,-6 L68,-7Z', c, ol(c, 0.5)) + circ(10, -42, 1.8, '#d9bf86');
    }
    return s;
  }
  // shoe defined once per sticker, then placed at ankle x = ax on ground gy, pointing dir (±1),
  // foreshortened for a 3/4 stance
  const shoeDef = (id, kind, c, o) => `<defs><g id="${id}-f">${shoe(kind, c, o)}</g></defs>`;
  const useShoe = (id, ax, gy, dir, rot) =>
    `<use href="#${id}-f" transform="translate(${ax},${gy})${rot ? ` rotate(${rot})` : ''} scale(${dir * 0.58},0.92) translate(-20,0)"/>`;
  const feet = (id, kind, a, b, gy, c, o) => shoeDef(id, kind, c, o) + useShoe(id, a, gy, -1) + useShoe(id, b, gy, 1);

  /* bags & props (local coords) */
  function tote(c, hd, id) { // body 0..100 × 4..100, handles up to ≈-30
    const b = 'M2,4 L98,4 L91,92 C90,97 86,100 80,100 L20,100 C14,100 10,97 9,92Z';
    return line('M22,8 C20,-34 80,-34 78,8', tint(hd, -0.3), 5) + P(b, c, ol(c)) + P(b, `url(#${id}-wv)`) +
      P('M74,4 L98,4 L91,92 C90,97 86,100 80,100 L72,100Z', tint(c, -0.3), op(0.4)) +
      line('M8,40 L93,40 M10,64 L91,64', tint(c, -0.28), 1.2) +
      P('M1,3 L99,3 L98,15 L2,15Z', hd, ol(hd)) +
      line('M30,10 C28,-26 72,-26 70,10', hd, 5) + line('M33,6 C32,-20 68,-20 67,6', tint(hd, 0.25), 1) +
      `<rect x="25" y="6" width="10" height="14" rx="2" fill="${hd}"/><rect x="65" y="6" width="10" height="14" rx="2" fill="${hd}"/>`;
  }
  function baguette(c, hw) { // body 0..100 × 2..52, strap up to ≈-34
    return line('M9,9 C14,-40 86,-40 91,9', tint(c, -0.25), 4.5) +
      P('M2,12 C2,6 6,4 12,4 L88,4 C94,4 98,6 98,12 L98,44 C98,50 94,52 88,52 L12,52 C6,52 2,50 2,44Z', c, ol(c)) +
      P('M2,40 L98,40 L98,44 C98,50 94,52 88,52 L12,52 C6,52 2,50 2,44Z', tint(c, -0.22)) +
      P('M0,9 C0,5 4,3 10,3 L90,3 C96,3 100,5 100,9 L100,32 C100,37 96,39 91,39 L9,39 C4,39 0,37 0,32Z', tint(c, 0.06), ol(c)) +
      P('M6,7 C24,5 70,5 94,7 C70,9 30,9 6,7Z', tint(c, 0.35)) +
      dash('M4,9 C4,7 6,6 10,6 L90,6 C94,6 96,7 96,9 L96,31 C96,34 94,35 91,35 L9,35 C6,35 4,34 4,31Z', tint(c, 0.32), 0.9) +
      `<rect x="38" y="22" width="24" height="13" rx="3" fill="${hw}" stroke="${tint(hw, -0.35)}" stroke-width=".8"/>` +
      `<rect x="43" y="26" width="14" height="5" rx="1.5" fill="${tint(hw, -0.25)}"/>` +
      circ(9, 8, 3.6, 'none', ` stroke="${hw}" stroke-width="1.8"`) + circ(91, 8, 3.6, 'none', ` stroke="${hw}" stroke-width="1.8"`);
  }
  const cup = () => // centre x=0, bottom y=0
    P('M-13,0 L13,0 L16,-44 L-16,-44Z', '#f6f2ea', ol('#f6f2ea', 0.6, -0.3)) +
    P('M6,0 L13,0 L16,-44 L9,-44Z', '#dcd5c8') +
    P('M-15.4,-32 L15.4,-32 L14.1,-14 L-14.1,-14Z', '#b98a5a', ol('#b98a5a', 0.5)) +
    P('M-17.5,-44 L17.5,-44 L16.5,-49 L-16.5,-49Z', '#ffffff', ol('#e0dad0', 0.6, -0.2)) +
    P('M-11,-49 L11,-49 L9,-53 L-9,-53Z', '#f2eee6', ol('#e0dad0', 0.6, -0.2));

  /* ---------------------------------------------------------------- outfits */
  const add = [];
  function outfit(id, name, def, draw) {
    add.push({
      id, name, cat: 'Outfits · Girls', w: 300, h: 520, colors: def.slice(), neck: [150, 18],
      svg: (c) => {
        const col = (i, d) => (c && c[i]) || d;
        const r = draw(def.map((d, i) => col(i, d)), id);
        return SVG(300, 520, r[0], r[1]);
      },
    });
  }
  const tee = '#f3efe6';

  // 1 — striped oversized knit cardigan, sparkly mini skirt, clogs
  outfit('girl-striped-cardigan', 'Striped cardigan', ['#5b7fd0', '#2a2430', '#7b4f36', '#e2aa86', '#5d2c50'], ([t, b, sh, sk, st], id) => {
    const defs = lg(id + '-sk', sk) +
      `<pattern id="${id}-st" width="10" height="26" patternUnits="userSpaceOnUse"><rect y="4" width="10" height="9" fill="${st}"/><rect y="13" width="10" height="1.6" fill="${tint(t, 0.35)}"/></pattern>` +
      `<pattern id="${id}-sq" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="${tint(b, 0.35)}"/><circle cx="5.5" cy="5.5" r="1.1" fill="${tint(b, 0.62)}"/></pattern>` +
      `<pattern id="${id}-rb" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="1.5" height="10" fill="${tint(t, -0.3)}"/></pattern>`;
    const LL = [[135, 262], [133, 355], [133, 402], [132, 462]], LW = [30, 20, 22, 14];
    let s = P(tube(LL, LW), `url(#${id}-sk)`) + P(tube(mp(LL), LW), `url(#${id}-sk)`);
    s += feet(id, 'clog', 132, 168, 505, sh, { foot: `url(#${id}-sk)` });
    const sk1 = 'M116,200 L184,200 L199,284 C170,291 130,291 101,284Z';
    s += P(sk1, b, ol(b)) + P(sk1, `url(#${id}-sq)`) +
      P('M136,240 L126,288 L142,289Z', tint(b, -0.4), op(0.6)) + P('M166,240 L176,288 L160,289Z', tint(b, -0.4), op(0.6));
    s += P('M136,34 L164,34 L151,120 L149,120Z', sk) + neck(sk) + line('M141,40 Q150,66 159,40', '#e2c37a', 0.9);
    const body = 'M137,36 L106,47 C96,51 90,58 89,70 L87,224 L150,224 L150,116Z';
    s += both(body, t) + both(body, `url(#${id}-st)`) + both('M100,66 L118,68 L116,224 L96,224Z', tint(t, -0.45), op(0.3));
    const hem = 'M87,220 L213,220 L213,241 C180,246 120,246 87,241Z';
    s += P(hem, t, ol(t)) + P(hem, `url(#${id}-rb)`);
    s += line('M163,37 L149.5,117 L149.5,242', tint(t, 0.08), 8) + line('M137,37 L150.5,117 L150.5,242', tint(t, 0.12), 8) +
      line('M137.5,38 L150.5,116', tint(t, -0.3), 0.6);
    for (const y of [130, 156, 182, 208]) s += circ(150.5, y, 3.6, tint(st, 0.7), ol(st, 0.6, 0)) ;
    const sl = sleeve([[97, 62], [88, 136], [82, 212]], [36, 44, 40]);
    s += both(sl, t, ol(t)) + both(sl, `url(#${id}-st)`) + both(tube([[110, 78], [104, 140], [99, 206]], [5, 9, 7]), tint(t, -0.5), op(0.35)) +
      bothL('M81,66 C88,60 100,58 112,60', tint(t, -0.35), 0.8);
    const cuff = tube([[82, 208], [81, 232]], [34, 31]);
    s += both(cuff, t, ol(t)) + both(cuff, `url(#${id}-rb)`);
    s += hand(81, 230, 3, sk, 1) + hand(219, 230, -3, sk, -1);
    return [defs, s];
  });

  // 2 — beige trench jacket, white wide-leg jeans, suede loafers (walking)
  outfit('girl-trench-walk', 'Trench & white jeans', ['#cdb08a', '#f1ede3', '#8b5a3a', '#d9a07c'], ([t, b, sh, sk], id) => {
    const defs = lg(id + '-b', b, 0.6) + lg(id + '-t', t);
    let s = '';
    // back leg + lifted foot
    s += shoeDef(id, 'loafer', sh, {}) + useShoe(id, 194, 484, -1, -26);
    s += P(tube([[163, 232], [177, 352], [191, 470]], [44, 46, 50]), tint(b, -0.12), ol(b, 0.8, -0.3)) +
      line('M170,260 L183,352 L193,460', tint(b, -0.28), 0.9);
    s += useShoe(id, 112, 505, -1);
    const fl = tube([[137, 232], [124, 356], [110, 490]], [44, 48, 58]);
    s += P(fl, `url(#${id}-b)`, ol(b, 0.8, -0.3)) + line('M132,262 L122,356 L114,486', tint(b, 0.6), 1.4) +
      line('M110,330 Q122,326 136,334 M104,400 Q116,394 130,402', tint(b, -0.22), 1) +
      dash('M84,484 L138,480', tint(b, -0.3));
    s += P('M112,196 L188,196 L192,250 C170,262 130,262 108,250Z', b);
    s += P('M136,34 L164,34 L156,122 L144,122Z', tee) + neck(sk) + line('M139,42 Q150,49 161,42', tint(tee, -0.25), 1.2);
    // sleeve behind (left arm swings back)
    s += P(sleeve([[104, 58], [95, 138], [90, 212]], [30, 28, 25]), `url(#${id}-t)`, ol(t)) +
      line('M78,190 L102,192', tint(t, -0.3), 4) + hand(90, 210, 5, sk, 1);
    const half = 'M138,34 L105,46 C97,50 94,58 94,68 L98,168 L88,270 C110,277 130,279 150,279 L150,122Z';
    s += both(half, t, ol(t)) + both('M98,70 L112,74 L110,272 L90,270Z', tint(t, -0.4), op(0.3)) +
      both('M104,48 L132,44 L136,96 C122,100 110,100 102,98Z', tint(t, 0.04), ol(t, 0.7)) +
      both('M102,50 L127,40 L130,46 L105,57Z', t, ol(t, 0.7)) + circ(124, 44, 1.8, tint(t, -0.5)) + circ(176, 44, 1.8, tint(t, -0.5));
    const lap = 'M138,35 L116,49 L125,57 L111,67 L147,126 L150,124Z';
    s += both(lap, tint(t, 0.08), ol(t)) + bothL('M124,56 L140,104', tint(t, -0.25), 0.7);
    s += P('M96,160 L204,160 L203,178 L97,178Z', t, ol(t)) + P('M96,174 L204,174 L203,178 L97,178Z', tint(t, -0.25)) +
      `<rect x="122" y="160" width="16" height="18" rx="2" fill="none" stroke="${tint(t, -0.55)}" stroke-width="2"/>` +
      P('M134,168 L144,168 L146,214 L138,216Z', t, ol(t)) + bothL('M112,182 L108,240 M128,182 L126,250', tint(t, -0.25), 0.9);
    for (const y of [138, 156, 196, 222]) s += circ(134, y, 3.2, tint(t, -0.5)) + circ(166, y, 3.2, tint(t, -0.5));
    s += line('M150,124 L150,278', tint(t, -0.38), 0.9) + both('M104,206 L124,202 L126,212 L106,216Z', tint(t, -0.06), ol(t, 0.7)) +
      dash('M91,266 C112,272 188,272 209,266', tint(t, -0.3));
    // front sleeve, arm swinging forward
    s += P(sleeve([[196, 58], [207, 134], [198, 206]], [30, 28, 25]), `url(#${id}-t)`, ol(t)) +
      line('M186,186 L211,191', tint(t, -0.3), 4) + `<rect x="186" y="185" width="6" height="7" rx="1" fill="none" stroke="${tint(t, -0.6)}" stroke-width="1.2"/>` +
      hand(197, 204, 12, sk, -1);
    return [defs, s];
  });

  // 3 — grey blazer, red neck scarf, blue wide jeans, red clogs, takeaway coffee
  outfit('girl-blazer-coffee', 'Blazer & coffee', ['#8d9098', '#4f74a8', '#b83a2c', '#e0a684', '#c8362b'], ([t, b, sh, sk, sc], id) => {
    const defs = lg(id + '-b', b, 0.8) + lg(id + '-t', t);
    const gold = '#d9a24a';
    let s = feet(id, 'clog', 124, 176, 505, sh, { foot: sk });
    const jl = tube([[134, 236], [128, 360], [121, 486]], [44, 48, 58]);
    s += both(jl, `url(#${id}-b)`, ol(b)) + P('M110,200 L190,200 L192,252 C170,264 130,264 108,252Z', b) +
      bothL('M113,252 L104,370 L95,480', gold, 0.8, ' stroke-dasharray="2.4 2"') + bothL('M93,477 L148,477', gold, 0.8, ' stroke-dasharray="2.4 2"') +
      bothL('M110,340 Q122,334 136,342 M104,420 Q116,414 130,422', tint(b, -0.3), 1) + bothL('M131,270 L124,470', tint(b, 0.3), 1.2);
    s += P('M136,34 L164,34 L157,156 L143,156Z', tee) + neck(sk);
    // left arm
    s += P(sleeve([[104, 58], [98, 140], [99, 222]], [30, 28, 24]), `url(#${id}-t)`, ol(t)) + dash('M88,212 L110,213', tint(t, 0.3)) + hand(99, 220, 2, sk, 1);
    const half = 'M139,36 L106,46 C98,50 95,58 95,68 L97,168 L92,262 C112,265 132,266 150,266 L150,152Z';
    s += both(half, t, ol(t)) + both('M98,70 L114,72 L112,262 L93,262Z', tint(t, -0.4), op(0.3));
    s += both('M139,35 L118,49 L126,58 L113,68 L148,156 L150,154Z', tint(t, 0.1), ol(t)) + bothL('M126,58 L144,130', tint(t, -0.25), 0.7) +
      both('M102,214 L134,212 L134,222 L102,224Z', tint(t, 0.06), ol(t, 0.7)) + line('M110,112 L130,110', tint(t, -0.4), 2.4) +
      line('M150,154 L150,236 C148,248 144,258 138,265', tint(t, -0.4), 0.9) + circ(153, 172, 3.4, tint(t, -0.55));
    // scarf
    s += P('M139,28 C146,33 154,33 161,28 L163,40 C155,45 145,45 137,40Z', sc, ol(sc)) +
      P('M134,44 L117,64 L128,67 L139,48Z', sc, ol(sc)) + P('M138,46 L134,73 L144,71 L143,47Z', tint(sc, -0.18), ol(sc)) +
      P('M131,36 C135,32 144,34 145,40 C145,46 138,48 134,46 C131,44 129,39 131,36Z', tint(sc, -0.08), ol(sc)) +
      circ(152, 37, 1.1, tint(sc, 0.65)) + circ(158, 34, 1.1, tint(sc, 0.65)) + circ(125, 62, 1.1, tint(sc, 0.65)) + circ(138, 62, 1.1, tint(sc, 0.65));
    // right arm holding coffee
    s += P(sleeve([[196, 58], [211, 134]], [30, 27]), `url(#${id}-t)`, ol(t)) + circ(211, 134, 13.5, t);
    s += G('translate(181,140)', cup());
    s += P(tube([[212, 136], [192, 124]], [26, 22]), tint(t, -0.05), ol(t)) + dash('M196,113 L190,134', tint(t, 0.3));
    s += P('M186,112 C194,110 200,116 199,124 C198,132 192,136 186,134Z', sk, ol(sk, 0.6, -0.3));
    for (const y of [114, 119.5, 125, 130.5]) s += `<rect x="170" y="${y}" width="22" height="5.4" rx="2.7" fill="${sk}" stroke="${tint(sk, -0.3)}" stroke-width=".6"/>`;
    return [defs, s];
  });

  // 4 — brown leather jacket, navy wide trousers, mules, mini handbag
  outfit('girl-leather-bag', 'Leather jacket & mini bag', ['#6b3f26', '#262f4a', '#5a3622', '#d8a07a', '#7a2232'], ([t, b, sh, sk, bg], id) => {
    const defs = lg(id + '-b', b, 1.2) + lg(id + '-t', t, 1.3);
    let s = feet(id, 'mule', 124, 176, 505, sh, { foot: sk });
    const jl = tube([[134, 226], [128, 360], [121, 482]], [46, 50, 58]);
    s += both(jl, `url(#${id}-b)`, ol(b, 0.8, 0.15)) + P('M110,186 L190,186 L192,250 C170,262 130,262 108,250Z', b) +
      P('M111,186 L189,186 L189,198 L111,198Z', tint(b, -0.15)) + bothL('M132,232 L121,488', tint(b, 0.22), 1.2) +
      bothL('M136,200 L134,250', tint(b, 0.2), 0.9) + bothL('M112,200 C118,214 122,226 124,236', tint(b, 0.25), 0.9);
    s += P('M134,34 L166,34 L163,226 L137,226Z', tee) + P('M136,34 L164,34 L160,226 L156,226Z', tint(tee, -0.08)) + neck(sk) +
      line('M138,42 Q150,50 162,42', tint(tee, -0.25), 1.3);
    // right arm
    s += P(sleeve([[197, 58], [204, 140], [200, 214]], [30, 28, 25]), `url(#${id}-t)`, ol(t)) + line('M188,204 L212,206', tint(t, -0.3), 1) +
      hand(200, 212, -4, sk, -1);
    const half = 'M139,36 L104,46 C96,50 93,58 93,68 L96,212 L138,212 C137,160 137,120 140,60Z';
    s += both(half, t, ol(t)) + both('M96,70 L110,72 L110,212 L96,212Z', tint(t, -0.4), op(0.35)) +
      both('M96,208 L138,208 L138,226 L96,226Z', tint(t, -0.12), ol(t)) + both('M134,212 L140,212 L140,222 L134,222Z', '#c9b48a');
    s += both('M141,32 L119,42 L110,74 L129,64 L138,90 L141,60Z', tint(t, 0.08), ol(t)) +
      both('M106,96 L131,94 L131,106 L106,108Z', tint(t, 0.05), ol(t, 0.7)) + circ(118.5, 102, 1.6, '#c9b48a') + circ(181.5, 102, 1.6, '#c9b48a') +
      bothL('M110,150 L122,196', tint(t, -0.6), 1.6) + bothL('M106,74 C112,58 124,52 134,52', tint(t, -0.3), 0.8) +
      bothL('M100,60 Q110,52 122,50 M108,118 C110,140 112,166 110,196', tint(t, 0.45), 1.4, op(0.6));
    // left arm with mini bag
    s += P(sleeve([[104, 58], [97, 140], [100, 214]], [30, 28, 25]), `url(#${id}-t)`, ol(t)) + line('M88,204 L112,206', tint(t, -0.3), 1) +
      line('M94,124 C96,140 96,160 94,180', tint(t, 0.45), 1.4, op(0.6));
    s += line('M84,246 C84,222 116,222 116,246', tint(bg, -0.3), 3) +
      P('M80,242 L120,242 L125,276 C125,279 123,280 120,280 L80,280 C77,280 75,279 75,276Z', bg, ol(bg)) +
      P('M79,242 L121,242 L122,262 C110,266 90,266 78,262Z', tint(bg, 0.1), ol(bg)) +
      P('M81,246 L119,246 L119.4,250 L80.6,250Z', tint(bg, 0.4), op(0.5)) +
      `<rect x="95" y="258" width="10" height="7" rx="1.5" fill="#d6b56a"/>`;
    s += hand(100, 212, 2, sk, 1);
    return [defs, s];
  });

  // 5 — olive polka-dot oversized shirt, grey pleated midi skirt, taupe clogs (hand on hip)
  outfit('girl-polka-shirt', 'Polka-dot shirt & pleats', ['#6e7444', '#9c9ca0', '#a08c78', '#e3ad89', '#f2ecdc'], ([t, b, sh, sk, dt], id) => {
    const defs = lg(id + '-sk', sk) +
      `<pattern id="${id}-pd" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.1" fill="${dt}"/><circle cx="10.5" cy="10.5" r="2.1" fill="${dt}"/></pattern>`;
    const LL = [[136, 392], [134, 430], [133, 462]], LW = [22, 21, 14];
    let s = P(tube(LL, LW), `url(#${id}-sk)`) + P(tube(mp(LL), LW), `url(#${id}-sk)`);
    s += feet(id, 'clog', 133, 167, 505, sh, { foot: `url(#${id}-sk)` });
    s += P('M116,196 L184,196 L212,412 C170,420 130,420 88,412Z', b, ol(b));
    for (let i = 0; i < 10; i++) {
      const x0 = 116 + i * 6.8, x1 = 88 + i * 12.4;
      if (i % 2) s += P(`M${N(x0)},198 L${N(x0 + 6.8)},198 L${N(x1 + 12.4)},${N(412 + 6 * Math.sin((i + 0.5) / 10 * Math.PI))} L${N(x1)},${N(412 + 6 * Math.sin(i / 10 * Math.PI))}Z`, tint(b, -0.14));
      s += line(`M${N(x0)},200 L${N(x1)},${N(412 + 6 * Math.sin(i / 10 * Math.PI))}`, tint(b, -0.3), 0.6);
    }
    s += P('M138,34 L162,34 L150,60Z', sk) + neck(sk);
    const half = 'M139,34 L102,46 C94,50 90,58 90,68 L93,238 C100,246 114,250 128,246 C138,243 145,245 150,249 L150,40Z';
    s += both(half, t, ol(t)) + both(half, `url(#${id}-pd)`) + both('M94,72 L110,74 L110,244 L94,240Z', tint(t, -0.45), op(0.35)) +
      bothL('M112,180 C116,200 116,220 112,240 M132,200 L134,244', tint(t, -0.35), 1);
    s += P('M146,48 L154,48 L154,248 L146,248Z', t, ol(t, 0.6)) + P('M146,48 L154,48 L154,248 L146,248Z', `url(#${id}-pd)`, op(0.5));
    for (const y of [72, 102, 132, 162, 192, 222]) s += circ(150, y, 2.4, tint(dt, -0.1), ol(dt, 0.5, -0.4));
    const pk = 'M108,92 L132,92 L132,117 L120,121 L108,117Z';
    s += P(pk, t, ol(t)) + P(pk, `url(#${id}-pd)`) + line('M108,97 L132,97', tint(t, -0.35), 0.7);
    const cl = 'M140,31 L119,44 L132,66 L149,46Z';
    s += both(cl, t, ol(t)) + both(cl, `url(#${id}-pd)`) + bothL('M125,56 L132,66', tint(t, -0.35), 1);
    // left arm on hip
    const sl = sleeve([[104, 58], [86, 122]], [36, 32]);
    s += P(tube([[82, 128], [96, 168], [116, 190]], [17, 15, 13]), `url(#${id}-sk)`, ol(sk, 0.5, -0.25)) + hand(116, 189, -58, sk, -1);
    s += P(sl, t, ol(t)) + P(sl, `url(#${id}-pd)`);
    const rl = tube([[87, 118], [83, 136]], [34, 31]);
    s += P(rl, tint(t, 0.06), ol(t)) + P(rl, `url(#${id}-pd)`) + line('M70,126 L98,130', tint(t, -0.35), 0.8);
    // right arm hanging
    s += P(tube([[212, 130], [212, 180], [208, 214]], [17, 15, 13]), `url(#${id}-sk)`, ol(sk, 0.5, -0.25)) + hand(208, 212, 5, sk, -1);
    const sr = sleeve([[196, 58], [210, 126]], [36, 32]);
    s += P(sr, t, ol(t)) + P(sr, `url(#${id}-pd)`);
    const rr = tube([[210, 122], [212, 140]], [34, 31]);
    s += P(rr, tint(t, 0.06), ol(t)) + P(rr, `url(#${id}-pd)`) + line('M196,131 L227,131', tint(t, -0.35), 0.8);
    return [defs, s];
  });

  // 6 — floral slip dress, strappy sandals, straw tote in the crook of the arm
  outfit('girl-floral-slip', 'Floral slip dress & tote', ['#3a4a7a', '#f0a8b8', '#c99a6b', '#dca27f', '#d8b46a'], ([t, fl, sh, sk, st], id) => {
    const defs = lg(id + '-sk', sk) +
      `<pattern id="${id}-fl" width="30" height="30" patternUnits="userSpaceOnUse">` +
      `<g fill="${fl}"><circle cx="8" cy="4.4" r="2.8"/><circle cx="11.4" cy="6.9" r="2.8"/><circle cx="10.1" cy="10.9" r="2.8"/><circle cx="5.9" cy="10.9" r="2.8"/><circle cx="4.6" cy="6.9" r="2.8"/></g>` +
      `<circle cx="8" cy="8" r="1.7" fill="${tint(fl, 0.7)}"/><ellipse cx="15" cy="15" rx="3.2" ry="1.4" transform="rotate(35 15 15)" fill="${tint(t, 0.4)}"/>` +
      `<g fill="${tint(fl, 0.45)}"><circle cx="23" cy="21" r="1.9"/><circle cx="25.6" cy="23.4" r="1.9"/><circle cx="23" cy="25.8" r="1.9"/><circle cx="20.4" cy="23.4" r="1.9"/></g>` +
      `<circle cx="23" cy="23.4" r="1.1" fill="${tint(fl, -0.3)}"/><circle cx="26" cy="7" r="1" fill="${tint(t, 0.5)}"/></pattern>` +
      `<pattern id="${id}-wv" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,2 L4,2 M4,6 L8,6 M2,0 L2,4 M6,4 L6,8" stroke="${tint(st, -0.3)}" stroke-width="1.1"/></pattern>`;
    const LL = [[137, 370], [135, 420], [134, 462]], LW = [22, 22, 13];
    let s = P(tube(LL, LW), `url(#${id}-sk)`) + P(tube(mp(LL), LW), `url(#${id}-sk)`);
    s += feet(id, 'sandal', 134, 166, 505, sh, { foot: `url(#${id}-sk)`, skin: sk });
    s += P('M134,36 C124,42 114,46 108,50 C104,54 103,60 104,66 L110,120 L190,120 L196,66 C197,60 196,54 192,50 C186,46 176,42 166,36Z', sk, ol(sk, 0.6, -0.25)) +
      neck(sk) + bothL('M128,52 C134,54 140,54 145,52', tint(sk, -0.22), 0.8);
    // arms; the right hand carries the tote by its handles
    s += P(sleeve([[106, 60], [98, 140], [99, 220]], [24, 19, 14]), `url(#${id}-sk)`, ol(sk, 0.5, -0.25)) + hand(99, 218, 2, sk, 1);
    s += G('translate(172,240) scale(.6)', tote(st, tint(st, -0.55), id));
    s += P(sleeve([[194, 60], [203, 140], [202, 214]], [24, 19, 14]), `url(#${id}-sk)`, ol(sk, 0.5, -0.25)) + hand(202, 212, -3, sk, -1);
    const dr = 'M120,80 C132,92 168,92 180,80 L187,120 C187,140 179,158 176,176 C186,240 200,330 212,398 C180,410 120,410 88,398 C100,330 114,240 124,176 C121,158 113,140 113,120Z';
    s += P(dr, t, ol(t)) + P(dr, `url(#${id}-fl)`) +
      P('M134,190 C130,260 122,330 114,400 L126,402 C134,330 140,260 140,190Z', tint(t, 0.5), op(0.22)) +
      line('M160,200 C164,270 172,340 178,404 M146,230 C144,300 142,360 140,406', tint(t, -0.5), 2, op(0.35)) +
      P('M113,120 C130,128 170,128 187,120 L186,134 C170,140 130,140 114,134Z', tint(t, -0.4), op(0.2)) +
      line('M120,80 C132,92 168,92 180,80', tint(fl, 0.5), 1.6) + bothL('M121,82 L122,52', t, 2);
    return [defs, s];
  });

  // 7 — cream knit vest over white shirt, plaid mini skirt, white socks, black mary janes, phone
  outfit('girl-knit-vest', 'Knit vest & plaid skirt', ['#efe3c8', '#7d2e2e', '#1f1b1e', '#e4b090', '#fbfaf6'], ([t, b, sh, sk, sht], id) => {
    const defs = lg(id + '-sk', sk) + lg(id + '-sh', sht, 0.5) +
      `<pattern id="${id}-pl" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${b}"/>` +
      `<rect y="7" width="20" height="6" fill="${tint(b, -0.4)}" opacity=".6"/><rect x="7" width="6" height="20" fill="${tint(b, -0.4)}" opacity=".6"/>` +
      `<rect y="16" width="20" height="1" fill="${tint(b, 0.65)}"/><rect x="16" width="1" height="20" fill="${tint(b, 0.65)}"/></pattern>` +
      `<pattern id="${id}-rb" width="3.6" height="10" patternUnits="userSpaceOnUse"><rect width="1.3" height="10" fill="${tint(t, -0.22)}"/></pattern>`;
    const LL = [[136, 272], [133, 355], [133, 402], [132, 462]], LW = [28, 20, 22, 14];
    let s = P(tube(LL, LW), `url(#${id}-sk)`) + P(tube(mp(LL), LW), `url(#${id}-sk)`);
    const sock = tube([[133, 414], [132, 464]], [24, 15]);
    s += both(sock, '#f7f5f0', ol('#f7f5f0', 0.6, -0.25)) + bothL('M122,420 L144,420 M122,425 L144,425', '#dcd8cf', 0.9);
    s += feet(id, 'mary', 132, 168, 505, sh, { foot: '#f7f5f0' });
    const sk1 = 'M116,196 L184,196 L201,278 C170,284 130,284 99,278Z';
    s += P(sk1, `url(#${id}-pl)`, ol(b));
    for (let i = 0; i < 8; i++) {
      const x0 = 116 + i * 8.5, x1 = 99 + i * 12.75;
      s += line(`M${N(x0)},204 L${N(x1)},281`, tint(b, -0.55), 0.8);
      if (i % 2) s += P(`M${N(x0)},204 L${N(x0 + 8.5)},204 L${N(x1 + 12.75)},281 L${N(x1)},281Z`, tint(b, -0.6), op(0.25));
    }
    s += P('M108,196 L192,196 L194,212 C170,217 130,217 106,212Z', sht, ol(sht, 0.6, -0.25));
    s += P('M139,34 L104,46 C96,50 93,58 93,68 L96,200 L204,200 L207,68 C207,58 204,50 196,46 L161,34Z', `url(#${id}-sh)`, ol(sht, 0.6, -0.25)) + neck(sk);
    const half = 'M137,38 L122,42 C119,64 114,84 106,98 L108,202 L150,204 L150,114Z';
    s += both(half, t, ol(t, 0.7)) + both('M106,98 L120,104 L120,202 L108,202Z', tint(t, -0.3), op(0.35));
    let cab = '';
    for (let y = 104; y < 180; y += 12) cab += `M124,${y} C124,${y + 6} 131,${y + 6} 131,${y + 12} M131,${y} C131,${y + 4} 128,${y + 5} 127.5,${y + 6}`;
    s += line(cab, tint(t, -0.28), 1.3) + line(mir(cab), tint(t, -0.28), 1.3) + bothL('M120,104 L121,184 M135,104 L136,184', tint(t, -0.18), 0.8);
    const hem = 'M107,186 L193,186 L193,204 L107,204Z';
    s += P(hem, t, ol(t, 0.7)) + P(hem, `url(#${id}-rb)`) +
      bothL('M138,40 L150,112', t, 6) + bothL('M138,40 L150,112', tint(t, -0.22), 6, ' stroke-dasharray="1.2 2.4"') +
      bothL('M122,43 C119,64 114,84 106,98', tint(t, -0.12), 5);
    s += P('M147,112 L153,112 L153,98 L147,98Z', sht) + both('M140,31 L124,46 L136,62 L149,44Z', sht, ol(sht, 0.7, -0.3));
    // arms
    s += P(sleeve([[101, 58], [93, 140], [95, 214]], [28, 26, 24]), `url(#${id}-sh)`, ol(sht, 0.6, -0.25)) +
      P(tube([[95, 206], [95, 222]], [25, 24]), sht, ol(sht, 0.6, -0.3)) + hand(95, 220, 2, sk, 1);
    s += P(sleeve([[199, 58], [214, 134]], [28, 26]), `url(#${id}-sh)`, ol(sht, 0.6, -0.25)) + circ(214, 134, 12.6, tint(sht, -0.06)) +
      P(tube([[214, 136], [194, 150]], [25, 22]), tint(sht, -0.04), ol(sht, 0.6, -0.25)) + P(tube([[198, 147], [192, 151]], [23, 22]), sht, ol(sht, 0.6, -0.3));
    s += `<rect x="166" y="104" width="27" height="50" rx="6" fill="${tint(b, 0.55)}" stroke="${tint(b, -0.2)}" stroke-width=".8"/>` +
      `<rect x="170" y="108" width="11" height="13" rx="3" fill="${tint(b, 0.3)}"/>` + circ(173.5, 111.5, 2, '#2a2a2e') + circ(173.5, 117.5, 2, '#2a2a2e') + circ(178.5, 114.5, 1.6, '#2a2a2e');
    s += P('M186,138 C194,136 196,148 192,156 C188,160 184,158 183,154Z', sk, ol(sk, 0.6, -0.3));
    for (const y of [130, 136, 142, 148]) s += `<rect x="162" y="${y}" width="13" height="5.4" rx="2.7" fill="${sk}" stroke="${tint(sk, -0.3)}" stroke-width=".6"/>`;
    return [defs, s];
  });

  // 8 — oversized pastel hoodie, black biker shorts, chunky white sneakers (hands in pocket)
  outfit('girl-hoodie-sneakers', 'Hoodie & biker shorts', ['#c9b6e4', '#1f1e22', '#f4f2ee', '#e1a986'], ([t, b, sh, sk], id) => {
    const defs = lg(id + '-sk', sk) + lg(id + '-bk', b, 1) +
      `<pattern id="${id}-rb" width="4" height="10" patternUnits="userSpaceOnUse"><rect width="1.5" height="10" fill="${tint(t, -0.22)}"/></pattern>`;
    const LL = [[136, 300], [133, 360], [133, 404], [132, 450]], LW = [30, 21, 22, 15];
    let s = P(tube(LL, LW), `url(#${id}-sk)`) + P(tube(mp(LL), LW), `url(#${id}-sk)`);
    const sock = tube([[133, 430], [132, 470]], [21, 16]);
    s += both(sock, '#f7f5f0', ol('#f7f5f0', 0.6, -0.25)) + bothL('M123,434 L143,434 M123,438 L143,438', '#dcd8cf', 0.9);
    s += feet(id, 'sneaker', 132, 168, 505, sh, { foot: '#f7f5f0' });
    const sh1 = tube([[137, 240], [135, 318]], [38, 32]);
    s += both(sh1, `url(#${id}-bk)`, ol(b, 0.6, 0.2)) + P('M112,224 L188,224 L190,262 C170,272 130,272 110,262Z', b) +
      bothL('M128,262 C126,286 126,300 127,314', tint(b, 0.35), 1.4, op(0.6));
    s += P('M110,48 C108,30 126,22 150,22 C174,22 192,30 190,48Z', tint(t, -0.22)) + neck(sk);
    const half = 'M136,30 L100,44 C88,50 84,60 84,74 L85,240 L150,240 L150,40Z';
    s += both(half, t, ol(t)) + both('M86,76 L104,80 L104,240 L86,240Z', tint(t, -0.4), op(0.3));
    const hem = 'M85,236 L215,236 L215,256 C180,262 120,262 85,256Z';
    s += P(hem, t, ol(t)) + P(hem, `url(#${id}-rb)`);
    s += P('M112,42 C122,58 178,58 188,42 C191,58 174,72 150,72 C126,72 109,58 112,42Z', tint(t, 0.06), ol(t)) +
      line('M118,52 C130,64 170,64 182,52', tint(t, -0.25), 0.8) +
      bothL('M141,64 C140,84 139,100 140,116', tint(t, 0.55), 2.4) + both('M138.4,114 L141.8,114 L141.8,124 L138.4,124Z', tint(t, -0.45));
    const sl = sleeve([[95, 66], [80, 144], [92, 192], [114, 206]], [42, 40, 36, 30]);
    s += both(sl, t, ol(t)) + bothL('M80,126 C88,132 92,140 94,150 M86,174 C92,176 98,180 102,186', tint(t, -0.3), 1);
    s += P('M110,170 L190,170 C196,190 200,212 202,232 L98,232 C100,212 104,190 110,170Z', tint(t, 0.04), ol(t)) +
      bothL('M110,171 C104,190 100,212 98,231', tint(t, -0.5), 2.2) + dash('M100,228 L200,228', tint(t, -0.3)) +
      P('M168,96 C168,92 173,91 174,95 C175,91 180,92 180,96 C180,100 174,104 174,104 C174,104 168,100 168,96Z', tint(t, -0.35));
    return [defs, s];
  });

  /* ---------------------------------------------------------- shoes & bags */
  function item(id, name, w, h, def, draw) {
    add.push({
      id, name, cat: 'Shoes & Bags', w, h, colors: def.slice(),
      svg: (c) => {
        const col = (i, d) => (c && c[i]) || d;
        const r = draw(def.map((d, i) => col(i, d)), id);
        return SVG(w, h, r[0], r[1]);
      },
    });
  }
  const napPat = (id, c) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="${tint(c, 0.18)}"/><circle cx="3.5" cy="3" r=".5" fill="${tint(c, -0.16)}"/></pattern>`;
  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${N(rx * 0.06)}" fill="#000" opacity=".16"/>`;

  item('shoe-suede-clog', 'Suede clog', 360, 190, ['#a9774c', '#c9a679', '#d8c08a'], ([c, so, ac], id) =>
    [napPat(id + '-nap', c), shadow(178, 164, 150) + G('translate(28,166) rotate(-9) scale(2.9)', shoe('clog', c, { sole: so, acc: ac, inside: 1, nap: id + '-nap' }))]);

  item('shoe-red-clog-pair', 'Red suede clogs', 360, 230, ['#c0392b', '#c9a679', '#d8c08a'], ([c, so, ac], id) =>
    [napPat(id + '-nap', c), shadow(180, 214, 158) +
      G('translate(70,160) scale(2.45)', shoe('clog', tint(c, -0.12), { sole: tint(so, -0.1), acc: ac, inside: 1, nap: id + '-nap' })) +
      G('translate(22,212) rotate(-3) scale(2.65)', shoe('clog', c, { sole: so, acc: ac, inside: 1, nap: id + '-nap' }))]);

  item('shoe-penny-loafer', 'Suede penny loafer', 340, 140, ['#7a4a2c', '#2c1e17'], ([c, so], id) =>
    [napPat(id + '-nap', c), shadow(170, 124, 148) + G('translate(26,122) scale(2.8)', shoe('loafer', c, { sole: so, inside: 1, nap: id + '-nap' }))]);

  item('shoe-buckle-mule', 'Leather buckle mule', 340, 140, ['#5a3420', '#d6b56a'], ([c, ac]) =>
    ['', shadow(170, 124, 148) + G('translate(22,122) scale(2.8)', shoe('mule', c, { acc: ac, inside: 1 }))]);

  item('shoe-chunky-sneaker', 'Chunky sneaker', 340, 190, ['#f6f3ee', '#b9c6da', '#ebe5d8'], ([c, ac, so]) =>
    ['', shadow(170, 172, 150) + G('translate(32,170) scale(2.6)', shoe('sneaker', c, { acc: ac, sole: so }))]);

  item('shoe-mary-jane', 'Mary jane', 320, 160, ['#1f1b1d', '#c9a27c'], ([c, ln]) =>
    ['', shadow(160, 146, 140) + G('translate(16,144) scale(2.75)', shoe('mary', c, { acc: ln, inside: 1 }))]);

  item('bag-straw-tote', 'Straw tote', 240, 290, ['#d8b46a', '#7a4a2c'], ([c, hd], id) =>
    [`<pattern id="${id}-wv" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,2 L4,2 M4,6 L8,6 M2,0 L2,4 M6,4 L6,8" stroke="${tint(c, -0.3)}" stroke-width="1.1"/></pattern>`,
      G('translate(20,78) scale(2)', tote(c, hd, id))]);

  item('bag-mini-baguette', 'Mini baguette bag', 280, 240, ['#b8492f', '#d6b56a'], ([c, hw]) =>
    ['', G('translate(15,100) scale(2.5)', baguette(c, hw))]);

  (window.STICKERS = window.STICKERS || []).push(...add);
})();
