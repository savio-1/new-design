/* Studio sticker pack: glossy "life-sim game" gems, UI pill and emoji-like icons.
 * Pushes into window.STICKERS (category 'Game & UI'). Every svg(c) is a standalone SVG.
 */
(function () {
  'use strict';
  const L = window.STICKERS || (window.STICKERS = []);
  const CAT = 'Game & UI';
  const f = (n) => +(+n).toFixed(1);

  // lighten (amt > 0) / darken (amt < 0) a #rrggbb colour
  function tint(hex, amt) {
    let h = String(hex || '#888888').replace('#', '');
    if (h.length === 3) h = h.split('').map((q) => q + q).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (!isFinite(n)) return hex;
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
    return '#' + ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  }
  const S = (w, h, body, defs) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs ? `<defs>${defs}</defs>` : '') + body + '</svg>';
  const lg = (id, x1, y1, x2, y2, stops) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? '' : ` stop-opacity="${a}"`}/>`).join('') + '</linearGradient>';
  const rg = (id, cx, cy, r, stops, fx, fy) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>` +
    stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? '' : ` stop-opacity="${a}"`}/>`).join('') + '</radialGradient>';
  const blurF = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
  // soft drop shadow ellipse under an icon
  const groundSh = (cx, cy, rx, ry, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#1a2440" opacity="${op || 0.22}" filter="url(#gsh)"/>`;
  const GSH = blurF('gsh', 3);
  const sparkle = (cx, cy, s, fill, op) => {
    const q = (x, y) => f(cx + x * s) + ' ' + f(cy + y * s);
    return `<path d="M${q(0, -1)}C${q(0.1, -0.3)} ${q(0.3, -0.1)} ${q(1, 0)}C${q(0.3, 0.1)} ${q(0.1, 0.3)} ${q(0, 1)}C${q(-0.1, 0.3)} ${q(-0.3, 0.1)} ${q(-1, 0)}C${q(-0.3, -0.1)} ${q(-0.1, -0.3)} ${q(0, -1)}Z" fill="${fill}"${op != null ? ` opacity="${op}"` : ''}/>`;
  };

  const add = (id, name, w, h, colors, raw) => {
    const p = 'sg-' + id + '-';
    L.push({
      id, name, cat: CAT, w, h, colors,
      svg: (c) => raw(colors.map((d, i) => (c && c[i]) || d))
        .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
        .replace(/href="#([^"]+)"/g, `href="#${p}$1"`),
    });
  };

  /* ------------------------------------------------------------ crystal gems */
  // faceted bipyramid: apexes top/bottom, girdle = front half of an ellipse
  function gem(W, H, top, bot, cx, gy, rx, ry, angles, c) {
    const [main, dark, light] = c;
    const P = angles.map((a) => [cx + rx * Math.cos((a * Math.PI) / 180), gy + ry * Math.sin((a * Math.PI) / 180)]);
    const n = P.length - 1;
    const pt = (p) => f(p[0]) + ' ' + f(p[1]);
    let body = '';
    // facet shading: left = lit, right = shaded; crown lighter than pavilion
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n; // 0 = left .. 1 = right
      const crown = t < 0.3 ? 'url(#cl)' : t < 0.55 ? 'url(#cm)' : t < 0.8 ? 'url(#cm2)' : 'url(#cd)';
      const pav = t < 0.3 ? 'url(#pm)' : t < 0.55 ? 'url(#pl)' : t < 0.8 ? 'url(#pd)' : 'url(#pd2)';
      body += `<path d="M${pt(top)}L${pt(P[i])}L${pt(P[i + 1])}Z" fill="${crown}"/>`;
      body += `<path d="M${pt(bot)}L${pt(P[i])}L${pt(P[i + 1])}Z" fill="${pav}"/>`;
    }
    // crisp facet edges
    let edges = '';
    for (let i = 0; i <= n; i++) edges += `M${pt(top)}L${pt(P[i])}L${pt(bot)}`;
    edges += 'M' + P.map(pt).join('L');
    const outline = `M${pt(top)}L${pt(P[0])}L${pt(bot)}L${pt(P[n])}Z`;
    const defs =
      lg('cl', 0, 0, 0.3, 1, [[0, tint(light, 0.55)], [1, light]]) +
      lg('cm', 0, 0, 0.2, 1, [[0, tint(main, 0.35)], [1, main]]) +
      lg('cm2', 0, 0, 0, 1, [[0, main], [1, tint(main, -0.12)]]) +
      lg('cd', 0, 0, 0, 1, [[0, tint(dark, 0.15)], [1, dark]]) +
      lg('pm', 0, 0, 0, 1, [[0, main], [1, tint(main, -0.25)]]) +
      lg('pl', 0, 0, 0, 1, [[0, light], [1, tint(main, -0.05)]]) +
      lg('pd', 0, 0, 0, 1, [[0, tint(dark, 0.1)], [1, tint(dark, -0.2)]]) +
      lg('pd2', 0, 0, 0, 1, [[0, dark], [1, tint(dark, -0.35)]]) +
      lg('gl', 0, 0, 1, 1, [[0, '#fff', 0.5], [0.45, '#fff', 0], [1, '#fff', 0]]) +
      rg('glow', 0.5, 0.5, 0.5, [[0, light, 0.45], [1, light, 0]]) + GSH;
    const hl = [lerp(top, P[0], 0.18), lerp(top, P[1], 0.2), lerp(P[0], P[1], 0.55), lerp(P[0], P[1], 0.25)];
    const hl2 = [lerp(bot, P[1], 0.62), lerp(bot, P[2], 0.66), lerp(bot, P[2], 0.5), lerp(bot, P[1], 0.45)];
    const art =
      `<ellipse cx="${cx}" cy="${f(gy)}" rx="${f(rx * 1.5)}" ry="${f((bot[1] - top[1]) * 0.55)}" fill="url(#glow)"/>` +
      groundSh(cx, f(H - 7), f(rx * 0.55), 3.5, 0.18) + body +
      `<path d="${outline}" fill="url(#gl)"/>` +
      `<path d="${edges}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="${outline}" fill="none" stroke="${tint(dark, -0.35)}" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M${hl.map(pt).join('L')}Z" fill="#fff" opacity=".55"/>` +
      `<path d="M${hl2.map(pt).join('L')}Z" fill="#fff" opacity=".22"/>` +
      sparkle(f(top[0] - rx * 0.28), f(top[1] + (gy - top[1]) * 0.42), f(rx * 0.22), '#fff', 0.95) +
      sparkle(f(cx + rx * 0.62), f(gy + (bot[1] - gy) * 0.22), f(rx * 0.13), '#fff', 0.8);
    return S(W, H, art, defs);
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  add('crystal-gem', 'Floating crystal', 120, 240, ['#2fd16a', '#0c7a3c', '#a6ffbf'], (c) =>
    gem(120, 240, [60, 8], [60, 222], 60, 98, 48, 13, [180, 145, 112, 68, 35, 0], c));
  add('crystal-gem-small', 'Crystal (small)', 120, 140, ['#2fd16a', '#0c7a3c', '#a6ffbf'], (c) =>
    gem(120, 140, [60, 8], [60, 124], 60, 52, 52, 15, [180, 150, 120, 90, 60, 30, 0], c));

  /* ------------------------------------------------------------------ UI pill */
  add('ui-pill', 'UI pill button', 360, 86, ['#fffdf7', '#efe6d2', '#d6c8a8'], (c) => {
    const [top, bottom, edge] = c;
    const defs =
      lg('bg', 0, 0, 0, 1, [[0, top], [1, bottom]]) +
      lg('in', 0, 0, 0, 1, [[0, '#000', 0], [0.6, '#000', 0], [1, tint(edge, -0.5), 0.16]]) +
      lg('hl', 0, 0, 1, 0, [[0, '#fff', 0], [0.15, '#fff', 0.95], [0.85, '#fff', 0.95], [1, '#fff', 0]]) +
      blurF('sh', 3.5);
    return S(360, 86,
      `<rect x="10" y="12" width="340" height="66" rx="33" fill="#5a4a2a" opacity=".22" filter="url(#sh)"/>` +
      `<rect x="6" y="5" width="348" height="70" rx="35" fill="${edge}"/>` +
      `<rect x="8" y="6.5" width="344" height="66" rx="33" fill="url(#bg)"/>` +
      `<rect x="8" y="6.5" width="344" height="66" rx="33" fill="url(#in)"/>` +
      `<rect x="30" y="11" width="300" height="3.2" rx="1.6" fill="url(#hl)"/>`, defs);
  });

  /* -------------------------------------------------------------------- lips */
  add('icon-lips', 'Glossy lips', 120, 120, ['#ff3b6b', '#b0103c', '#ffd0dc'], (c) => {
    const [m, d, hi] = c;
    const upper = 'M10 62C20 50 32 36 46 36C53 36 57 41 60 45C63 41 67 36 74 36C88 36 100 50 110 62C96 62 80 64 60 66C40 64 24 62 10 62Z';
    const lower = 'M10 62C24 64 40 66 60 67C80 66 96 64 110 62C100 80 82 94 60 94C38 94 20 80 10 62Z';
    const defs = lg('u', 0, 0, 0, 1, [[0, tint(m, 0.15)], [1, d]]) + lg('l', 0, 0, 0, 1, [[0, tint(d, -0.1)], [0.35, m], [1, tint(d, -0.15)]]) + GSH;
    return S(120, 120, groundSh(60, 106, 40, 5) +
      `<path d="${upper}" fill="url(#u)"/><path d="${lower}" fill="url(#l)"/>` +
      `<path d="M12 62C30 64 44 66.5 60 66.5C76 66.5 90 64 108 62" fill="none" stroke="${tint(d, -0.45)}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M38 76C46 72 56 72 64 74C58 80 46 81 38 76Z" fill="${hi}" opacity=".85"/>` +
      `<ellipse cx="76" cy="76" rx="5" ry="2.4" fill="#fff" opacity=".7"/>` +
      `<path d="M30 48C36 42 42 40 47 41" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M74 41C80 41 86 44 90 48" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>`, defs);
  });

  /* ------------------------------------------------------------------- heart */
  add('icon-heart-glossy', 'Glossy heart', 120, 120, ['#ff5fa2', '#c2185b', '#ffd6e8'], (c) => {
    const [m, d, hi] = c;
    const H = 'M60 104C54 99 12 76 12 45C12 29 24 18 38 18C48 18 56 24 60 32C64 24 72 18 82 18C96 18 108 29 108 45C108 76 66 99 60 104Z';
    const defs = rg('b', 0.38, 0.32, 0.75, [[0, tint(m, 0.35)], [0.55, m], [1, d]]) +
      rg('rim', 0.5, 0.5, 0.55, [[0.75, d, 0], [1, tint(d, -0.3), 0.6]]) + GSH + blurF('bl', 1.6);
    return S(120, 120, groundSh(60, 110, 34, 4.5) +
      `<path d="${H}" fill="url(#b)"/><path d="${H}" fill="url(#rim)"/>` +
      `<path d="M26 40C26 31 33 26 40 26C46 26 50 29 52 33C45 33 36 38 30 48C27 46 26 43 26 40Z" fill="${hi}" opacity=".9" filter="url(#bl)"/>` +
      `<ellipse cx="34" cy="36" rx="5" ry="3.4" transform="rotate(-35 34 36)" fill="#fff" opacity=".95"/>` +
      `<circle cx="88" cy="40" r="3.2" fill="#fff" opacity=".6"/>` +
      `<path d="M78 86C86 80 94 72 98 62" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>`, defs);
  });

  /* --------------------------------------------------------------------- cap */
  add('icon-cap', 'Baseball cap', 120, 120, ['#2f7de1', '#ff8a1f', '#174a96'], (c) => {
    const [blue, brim, dark] = c;
    // crown seen 3/4 from the front-left, bill pointing toward the viewer's lower left
    const crown = 'M34 78C26 52 40 26 68 24C94 22 110 44 108 68C108 74 106 78 104 80C86 72 58 72 34 78Z';
    const bill = 'M34 78C24 80 10 86 6 94C4 99 10 102 20 101C40 99 60 92 78 82C70 77 52 75 34 78Z';
    const billTop = 'M34 78C26 80 14 85 9 92C22 88 46 82 76 81C66 77 50 76 34 78Z';
    const defs = rg('cr', 0.4, 0.3, 0.8, [[0, tint(blue, 0.4)], [0.6, blue], [1, dark]]) +
      lg('br', 0, 0, 0.3, 1, [[0, tint(brim, 0.4)], [1, brim]]) + GSH;
    return S(120, 120, groundSh(60, 106, 46, 5) +
      `<path d="${crown}" fill="url(#cr)"/>` +
      `<path d="M68 24C60 40 58 58 62 74M68 24C84 34 94 52 96 74M68 24C52 32 42 50 42 76" fill="none" stroke="${tint(dark, -0.25)}" stroke-opacity=".5" stroke-width="1.8"/>` +
      `<path d="M66 26C59 41 57 57 60 73" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2" stroke-dasharray="3 3"/>` +
      `<ellipse cx="68" cy="24.5" rx="6" ry="3.2" fill="${tint(blue, -0.15)}"/><ellipse cx="67" cy="23.5" rx="3.6" ry="1.6" fill="#fff" opacity=".5"/>` +
      `<path d="M40 50C44 40 52 33 60 31" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M34 78C58 72 86 72 104 80C102 83 100 84 98 84C80 78 58 78 38 82Z" fill="${tint(dark, -0.4)}" opacity=".45"/>` +
      `<path d="${bill}" fill="${tint(brim, -0.35)}"/>` +
      `<path d="${billTop}" fill="url(#br)"/>` +
      `<path d="M14 89C28 84 44 81 60 80" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>`, defs);
  });

  /* ------------------------------------------------------------ chat bubbles */
  add('icon-chat-bubbles', 'Chat bubbles', 120, 120, ['#8fd3ff', '#cdeeff', '#3b8fd1'], (c) => {
    const [m, l, d] = c;
    const back = 'M58 16C78 10 104 18 106 38C108 52 98 60 86 62C80 64 72 63 66 61C56 62 46 56 44 46C40 30 46 20 58 16Z';
    const front = 'M16 58C16 44 30 36 50 36C72 36 86 44 86 60C86 76 70 84 50 84C44 84 38 83 33 81L18 92L22 77C18 72 16 66 16 58Z';
    const defs = lg('bf', 0, 0, 0, 1, [[0, tint(m, 0.3)], [1, tint(m, -0.12)]]) + lg('bb', 0, 0, 0, 1, [[0, '#fff'], [1, l]]) + GSH;
    return S(120, 120, groundSh(56, 106, 36, 4.5) +
      `<path d="${back}" fill="url(#bb)" stroke="${tint(d, 0.35)}" stroke-width="2"/>` +
      `<circle cx="100" cy="70" r="5" fill="url(#bb)" stroke="${tint(d, 0.35)}" stroke-width="2"/><circle cx="106" cy="80" r="3" fill="url(#bb)" stroke="${tint(d, 0.35)}" stroke-width="1.6"/>` +
      `<path d="M62 22C70 18 80 18 88 21" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="${front}" fill="url(#bf)" stroke="${d}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M26 52C30 45 38 42 46 41" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3.4" stroke-linecap="round"/>` +
      `<circle cx="36" cy="61" r="4.4" fill="#fff"/><circle cx="51" cy="61" r="4.4" fill="#fff"/><circle cx="66" cy="61" r="4.4" fill="#fff"/>`, defs);
  });

  /* -------------------------------------------------------------- sketch cat */
  add('icon-cat-sketch', 'Sketchy cat', 120, 120, ['#ffffff', '#b9bec7', '#3a3d45'], (c) => {
    const [w, g, k] = c;
    const body = 'M40 104C30 96 30 76 40 66C44 62 46 58 46 54L74 54C74 58 76 62 80 66C90 76 90 96 80 104Z';
    const head = 'M38 46C36 36 38 26 42 18L50 28C56 26 64 26 70 28L78 18C82 26 84 36 82 46C80 56 72 62 60 62C48 62 40 56 38 46Z';
    const tail = 'M80 98C92 98 102 92 102 82C102 74 96 72 92 76';
    const sk = (d, dx, dy, sw, op) => `<path d="${d}" transform="translate(${dx} ${dy})" fill="none" stroke="${k}" stroke-width="${sw}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const defs = lg('sh', 0, 0, 1, 0.3, [[0, g, 0], [0.55, g, 0], [1, g, 0.9]]);
    return S(120, 120,
      `<ellipse cx="60" cy="106" rx="30" ry="4" fill="${g}" opacity=".45"/>` +
      `<path d="${body}" fill="${w}"/><path d="${body}" fill="url(#sh)"/><path d="${head}" fill="${w}"/><path d="${head}" fill="url(#sh)"/>` +
      `<path d="M66 86C70 92 70 100 66 104M74 74L80 80" fill="none" stroke="${g}" stroke-width="5" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M44 22L48 30L50 28ZM76 22L72 30L70 28Z" fill="#f4b8c4"/>` +
      sk(body, 0, 0, 2.4, 0.9) + sk(body, 1.2, -0.8, 1.2, 0.5) + sk(head, 0, 0, 2.4, 0.9) + sk(head, -1, 0.8, 1.2, 0.5) +
      sk(tail, 0, 0, 2.4, 0.9) + sk(tail, 0.8, 1, 1.2, 0.5) +
      sk('M52 104L52 92M68 104L68 92', 0, 0, 1.8, 0.7) +
      `<path d="M50 42C51 40 54 40 55 42M65 42C66 40 69 40 70 42" fill="none" stroke="${k}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M58 48L62 48L60 50.5Z" fill="#e88aa0"/>` +
      sk('M60 50.5C60 53 57 54 55 53M60 50.5C60 53 63 54 65 53M36 48L48 50M36 53L48 52M84 48L72 50M84 53L72 52', 0, 0, 1.2, 0.75), defs);
  });

  /* ------------------------------------------------------------- mood orb */
  add('icon-plus-mood', 'Mood orb', 120, 120, ['#ffd23f', '#ff9a1f', '#3ccf6e'], (c) => {
    const [m, d, plus] = c;
    const defs = rg('o', 0.38, 0.32, 0.72, [[0, tint(m, 0.55)], [0.55, m], [1, d]]) +
      rg('p', 0.4, 0.35, 0.7, [[0, tint(plus, 0.35)], [1, tint(plus, -0.25)]]) + GSH + blurF('bl', 1.5);
    return S(120, 120, groundSh(56, 108, 34, 4.5) +
      `<circle cx="56" cy="62" r="42" fill="url(#o)"/>` +
      `<ellipse cx="42" cy="38" rx="17" ry="9" transform="rotate(-30 42 38)" fill="#fff" opacity=".7" filter="url(#bl)"/>` +
      `<ellipse cx="42" cy="58" rx="5" ry="7" fill="${tint(d, -0.55)}"/><ellipse cx="70" cy="58" rx="5" ry="7" fill="${tint(d, -0.55)}"/>` +
      `<circle cx="43.5" cy="55.5" r="1.8" fill="#fff"/><circle cx="71.5" cy="55.5" r="1.8" fill="#fff"/>` +
      `<path d="M38 74C46 86 66 86 74 74" fill="none" stroke="${tint(d, -0.55)}" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="32" cy="72" rx="6" ry="3.5" fill="#ff6b6b" opacity=".35"/><ellipse cx="80" cy="72" rx="6" ry="3.5" fill="#ff6b6b" opacity=".35"/>` +
      `<circle cx="94" cy="28" r="17" fill="#fff"/><circle cx="94" cy="28" r="14" fill="url(#p)"/>` +
      `<path d="M94 20V36M86 28H102" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="89" cy="21" rx="5" ry="2.6" transform="rotate(-30 89 21)" fill="#fff" opacity=".45"/>`, defs);
  });

  /* ---------------------------------------------------------- green sparkle */
  add('icon-sparkle-green', 'Green sparkle', 120, 120, ['#3ee07a', '#109a4a', '#d8ffe4'], (c) => {
    const [m, d, l] = c;
    const defs = rg('s', 0.4, 0.35, 0.7, [[0, l], [0.45, m], [1, d]]) + rg('g', 0.5, 0.5, 0.5, [[0, m, 0.45], [1, m, 0]]) + GSH;
    const big = (s, fill) => {
      const q = (x, y) => f(54 + x * s) + ' ' + f(58 + y * s);
      return `<path d="M${q(0, -1)}C${q(0.14, -0.3)} ${q(0.3, -0.14)} ${q(1, 0)}C${q(0.3, 0.14)} ${q(0.14, 0.3)} ${q(0, 1)}C${q(-0.14, 0.3)} ${q(-0.3, 0.14)} ${q(-1, 0)}C${q(-0.3, -0.14)} ${q(-0.14, -0.3)} ${q(0, -1)}Z" fill="${fill}"/>`;
    };
    return S(120, 120, `<circle cx="54" cy="58" r="50" fill="url(#g)"/>` + groundSh(54, 108, 22, 3.5, 0.16) +
      big(46, 'url(#s)') +
      `<path d="M54 18C56 36 58 44 64 50" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M54 58L54 12M54 58L100 58" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>` +
      sparkle(96, 22, 12, m) + sparkle(96, 22, 5, '#fff', 0.8) + sparkle(22, 96, 8, m) + sparkle(24, 24, 5, l), defs);
  });

  /* ------------------------------------------------------------------ house */
  add('icon-house', 'Glossy house', 120, 120, ['#ff6b5a', '#fff3dd', '#4fa3e8'], (c) => {
    const [roof, wall, acc] = c;
    const defs = lg('r', 0, 0, 0, 1, [[0, tint(roof, 0.25)], [1, tint(roof, -0.2)]]) +
      lg('w', 0, 0, 1, 1, [[0, '#fff'], [1, tint(wall, -0.12)]]) +
      lg('d', 0, 0, 0, 1, [[0, tint(acc, 0.2)], [1, tint(acc, -0.25)]]) + GSH;
    return S(120, 120, groundSh(60, 108, 44, 5) +
      `<rect x="78" y="22" width="12" height="24" rx="2" fill="${tint(roof, -0.3)}"/><rect x="76" y="19" width="16" height="6" rx="2" fill="${tint(roof, -0.15)}"/>` +
      `<path d="M24 56H96V100C96 103 94 105 91 105H29C26 105 24 103 24 100Z" fill="url(#w)"/>` +
      `<path d="M24 56H96V64C72 60 48 60 24 64Z" fill="#000" opacity=".08"/>` +
      `<path d="M8 60L57 19C59 17.5 61 17.5 63 19L112 60C114 62 113 66 110 66H10C7 66 6 62 8 60Z" fill="url(#r)"/>` +
      `<path d="M10 66H110C111 66 112 65.5 112.6 64.6L113 68C112 70 111 70 110 70H10C9 70 8 70 7 68L7.4 64.6C8 65.5 9 66 10 66Z" fill="${tint(roof, -0.35)}"/>` +
      `<circle cx="60" cy="46" r="7" fill="${wall}" stroke="${tint(roof, -0.3)}" stroke-width="2"/><path d="M60 41V51M55 46H65" stroke="${tint(roof, -0.3)}" stroke-width="1.6"/>` +
      `<path d="M18 58L57 25" stroke="#fff" stroke-opacity=".6" stroke-width="3.2" stroke-linecap="round"/>` +
      `<rect x="50" y="72" width="22" height="33" rx="10" fill="url(#d)"/><circle cx="66" cy="90" r="1.8" fill="#fff"/>` +
      `<rect x="31" y="70" width="14" height="14" rx="3" fill="url(#d)"/><rect x="77" y="70" width="14" height="14" rx="3" fill="url(#d)"/>` +
      `<path d="M38 70V84M31 77H45M84 70V84M77 77H91" stroke="${wall}" stroke-width="1.8"/>` +
      `<path d="M33 72L37 72M79 72L83 72" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`, defs);
  });

  /* ----------------------------------------------------------------- coffee */
  add('icon-coffee-glossy', 'Glossy coffee', 120, 120, ['#ffffff', '#7a4a2a', '#ff8fb1'], (c) => {
    const [cup, coffee, acc] = c;
    const defs = lg('c', 0, 0, 1, 0, [[0, tint(cup, -0.04)], [0.35, cup], [1, tint(cup, -0.22)]]) +
      rg('k', 0.4, 0.4, 0.6, [[0, tint(coffee, 0.35)], [1, tint(coffee, -0.3)]]) +
      lg('s', 0, 0, 0, 1, [[0, tint(acc, 0.2)], [1, tint(acc, -0.2)]]) + GSH;
    return S(120, 120, groundSh(58, 108, 42, 4.5) +
      `<path d="M44 30C40 24 48 20 44 12M58 30C54 24 62 20 58 12M72 30C68 24 76 20 72 12" fill="none" stroke="#c8ccd4" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>` +
      `<ellipse cx="58" cy="96" rx="46" ry="11" fill="url(#s)"/><ellipse cx="58" cy="93" rx="30" ry="6" fill="${tint(acc, -0.3)}" opacity=".35"/>` +
      `<path d="M86 52C100 50 104 62 98 70C94 76 86 76 82 74" fill="none" stroke="${tint(cup, -0.2)}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M86 52C100 50 104 62 98 70C94 76 86 76 82 74" fill="none" stroke="${cup}" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="M26 42H90C90 70 82 92 58 92C34 92 26 70 26 42Z" fill="url(#c)"/>` +
      `<ellipse cx="58" cy="42" rx="32" ry="8" fill="${tint(cup, -0.12)}"/><ellipse cx="58" cy="43" rx="27" ry="5.6" fill="url(#k)"/>` +
      `<path d="M50 42C54 39 62 39 66 42C62 45 54 45 50 42Z" fill="#fff" opacity=".55"/>` +
      `<path d="M34 52C34 66 38 78 46 84" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>` +
      `<path d="M58 66C55 61 47 64 52 70L58 75L64 70C69 64 61 61 58 66Z" fill="${acc}"/>`, defs);
  });

  /* ------------------------------------------------------------------ music */
  add('icon-music-glossy', 'Glossy music note', 120, 120, ['#9a6bff', '#ff6fb5', '#4a22b8'], (c) => {
    const [m, m2, d] = c;
    const defs = lg('n', 0, 0, 1, 1, [[0, tint(m, 0.3)], [0.6, m], [1, m2]]) + GSH;
    return S(120, 120, groundSh(58, 108, 36, 4.5) +
      `<path d="M40 30L96 18V80" fill="none" stroke="${tint(d, -0.2)}" stroke-width="4" opacity=".25" transform="translate(2 3)"/>` +
      `<path d="M38 32C38 29 40 27 43 26L91 15C95 14 98 17 98 21V78C98 88 89 95 79 95C70 95 64 90 64 83C64 75 72 69 82 69C84 69 86 69 88 70V36L48 45V88C48 98 39 105 29 105C20 105 14 100 14 93C14 85 22 79 32 79C34 79 36 79 38 80Z" fill="url(#n)" stroke="${d}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M44 34L88 24" stroke="#fff" stroke-opacity=".6" stroke-width="3.5" stroke-linecap="round"/>` +
      `<ellipse cx="26" cy="88" rx="6" ry="3.5" transform="rotate(-25 26 88)" fill="#fff" opacity=".7"/>` +
      `<ellipse cx="76" cy="77" rx="6" ry="3.5" transform="rotate(-25 76 77)" fill="#fff" opacity=".7"/>` +
      sparkle(104, 36, 7, '#fff', 0.9) + sparkle(20, 40, 5, m2, 0.9), defs);
  });
})();
