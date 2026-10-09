/* Collage Studio — panels, inspector, popovers and dialogs. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender, F = window.StudioFonts;
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ───────────────────────── icons ───────────────────────── */

  const ICONS = {
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
    undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    grid: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M3 15h18M9 3v18M15 3v18',
    magnet: 'M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4zM6 8h4M14 8h4',
    guides: 'M12 3v18M3 12h18M8 8h8v8H8z',
    resize: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.5 2.5 0 0 1 4.9.6c0 1.7-2.4 2.1-2.4 3.7M12 17h.01',
    folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
    layout: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 9h18M9 21V9',
    type: 'M5 7V5h14v2M12 5v14M9 19h6',
    sticker: 'M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5zM15 3v4a2 2 0 0 0 2 2h4M8.5 13h.01M15.5 13h.01M9.5 16.5s1 1 2.5 1 2.5-1 2.5-1',
    shapes: 'M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM14 14h7v7h-7zM17.5 3 21 9h-7z',
    image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM21 15l-5-5L5 21',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01',
    palette: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 21 9.8C21 6 17 3 12 3zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
    layers: 'M12 3 2 8l10 5 10-5zM2 16l10 5 10-5M2 12l10 5 10-5',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
    lock: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 8 0v4',
    unlock: 'M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V7a4 4 0 0 1 7.9-1',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    copy: 'M11 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    front: 'M4 14V5a1 1 0 0 1 1-1h9M9.5 8h9A1.5 1.5 0 0 1 20 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 18.5v-9A1.5 1.5 0 0 1 9.5 8z',
    back: 'M5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4zM20 10v9a1 1 0 0 1-1 1h-9',
    forward: 'M12 19V5M6 11l6-6 6 6', backward: 'M12 5v14M6 13l6 6 6-6',
    alignL: 'M4 4v16M8 6h12v4H8zM8 14h7v4H8z', alignC: 'M12 4v16M6 6h12v4H6zM8 14h8v4H8z', alignR: 'M20 4v16M4 6h12v4H4zM9 14h7v4H9z',
    alignT: 'M4 4h16M6 8h4v12H6zM14 8h4v7h-4z', alignM: 'M4 12h16M6 6h4v12H6zM14 8h4v8h-4z', alignB: 'M4 20h16M6 4h4v12H6zM14 9h4v7h-4z',
    distH: 'M4 4v16M20 4v16M10 7h4v10h-4z', distV: 'M4 4h16M4 20h16M7 10h10v4H7z',
    flipH: 'M12 3v18M16 7l5 5-5 5zM8 7l-5 5 5 5z', flipV: 'M3 12h18M7 16l5 5 5-5zM7 8l5-5 5 5z',
    crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
    replace: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    tl: 'M4 6h16M4 12h10M4 18h14', tc: 'M4 6h16M7 12h10M5 18h14', tr: 'M4 6h16M10 12h10M6 18h14',
    italic: 'M19 4h-9M14 20H5M15 4 9 20', underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 20h16', strike: 'M16 4H9a3 3 0 0 0-2.8 4M14 12a4 4 0 0 1 0 8H6M4 12h16',
    upper: 'M3 18 7 6l4 12M4.5 14h5M13 18l4-12 4 12M14.5 14h5',
    x: 'M6 6l12 12M18 6 6 18', edit: 'M4 20h4L19 9l-4-4L4 16z', check: 'M5 12l5 5 9-11',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
    wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5',
    eraser: 'M7 21h10M5.6 13.4l7-7a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12.4 19H8.6l-3-3a1.8 1.8 0 0 1 0-2.6zM9 10l6 6',
    play: 'M7 4.5v15l12.5-7.5z', pause: 'M8 5v14M16 5v14',
    film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
    square: 'M5 5h14v14H5z', circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', stop: 'M6 6h12v12H6z',
    shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    bgimg: 'M3 15l6-6 4 4 3-3 5 5M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    paste: 'M9 4h6v3H9zM15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2',
  };
  const FILLED_DOTS = new Set(['more']);
  function icon(name) {
    const d = ICONS[name] || '';
    const sw = FILLED_DOTS.has(name) ? 3.2 : 1.8;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }
  function hydrateIcons(root = document) { $$('i[data-icon]', root).forEach(i => { if (!i.firstChild) i.innerHTML = icon(i.dataset.icon); }); }

  /* ───────────────────────── tiny DOM helper ───────────────────────── */

  function h(tag, attrs, ...kids) {
    const [t, ...cls] = tag.split('.');
    const el = document.createElement(t || 'div');
    if (cls.length) el.className = cls.join(' ');
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }
  const ic = name => h('i', { 'data-icon': name, html: icon(name) });

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  S.on('toast', toast);

  /* ───────────────────────── palettes ───────────────────────── */

  const PALETTE = [
    '#1d1b18', '#4a4640', '#8c877c', '#d3cec3', '#f6f1e7', '#ffffff', '#efe6d2', '#c8a97e',
    '#2f5d50', '#1f5a4a', '#7fa88a', '#b9d7a8', '#d7ef5a', '#c8d64a', '#9ab83e', '#5f7a2e',
    '#f7d046', '#ffb547', '#ff8a3d', '#f2542d', '#e84a5f', '#ff7ab6', '#f7b4c8', '#ffd6e0',
    '#c9b6f2', '#9b8cf2', '#6c5ce7', '#3b4cca', '#1f3fd1', '#5aa9e6', '#9ad1f5', '#7bd3c4',
  ];
  const GRADIENTS = [
    ['#ff8a3d', '#ff7ab6', 'linear', 135], ['#f7d046', '#ff8a3d', 'linear', 180], ['#9ad1f5', '#c9b6f2', 'linear', 160],
    ['#e9e3ff', '#c9b6f2', 'radial', 0], ['#d7ef5a', '#7bd3c4', 'linear', 135], ['#1f3fd1', '#6c5ce7', 'linear', 160],
    ['#fff6e5', '#ffd6e0', 'radial', 0], ['#1d1b18', '#4b3f72', 'linear', 180], ['#ffefd6', '#f7b4c8', 'linear', 200],
    ['#b9d7a8', '#2f5d50', 'linear', 180], ['#ff7ab6', '#6c5ce7', 'linear', 120], ['#fef9ef', '#e8dcc4', 'radial', 0],
  ];

  function docColors() {
    const set = new Set();
    const add = c => { if (c && typeof c === 'string' && !/^rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') set.add(c.toLowerCase()); };
    add(S.doc.background.color);
    for (const el of S.doc.elements) {
      add(el.fill); add(el.color); add(el.accent); add(el.textColor); add(el.stroke && el.stroke.color); add(el.bg && el.bg.style !== 'none' && el.bg.color);
      if (el.colors) el.colors.forEach(add);
    }
    return [...set].slice(0, 16);
  }

  /* ───────────────────────── color utils ───────────────────────── */

  const cx = document.createElement('canvas').getContext('2d');
  function parseColor(c) {
    if (!c || c === 'transparent') return { hex: '#ffffff', a: 0 };
    cx.fillStyle = '#000'; cx.fillStyle = c;
    const v = cx.fillStyle;
    if (v[0] === '#') return { hex: v, a: 1 };
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return { hex: '#000000', a: 1 };
    const p = m[1].split(',').map(parseFloat);
    const hex = '#' + p.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    return { hex, a: p[3] ?? 1 };
  }
  function toColor(hex, a) {
    if (a >= 0.999) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.round(a * 100) / 100})`;
  }

  /* ───────────────────────── popovers ───────────────────────── */

  let openPop = null;
  function closePop() { if (openPop) { const p = openPop; openPop = null; p.el.remove(); p.onClose && p.onClose(); } }
  function popover(anchor, content, opts = {}) {
    closePop();
    const el = h('div.pop' + (opts.cls ? '.' + opts.cls : ''), null, content);
    $('#popover-root').append(el);
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let x = opts.side === 'left' ? r.left - pw - 8 : r.left;
    let y = r.bottom + 6;
    if (opts.at) { x = opts.at.x; y = opts.at.y; }
    if (x + pw > innerWidth - 8) x = innerWidth - pw - 8;
    if (y + ph > innerHeight - 8) y = Math.max(8, (opts.at ? opts.at.y : r.top) - ph - 6);
    el.style.left = Math.max(8, x) + 'px'; el.style.top = Math.max(8, y) + 'px';
    openPop = { el, onClose: opts.onClose, anchor };
    return el;
  }
  document.addEventListener('mousedown', e => {
    if (openPop && !openPop.el.contains(e.target) && !(openPop.anchor && openPop.anchor.contains && openPop.anchor.contains(e.target))) closePop();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openPop) { closePop(); e.stopPropagation(); } }, true);

  function colorPopover(anchor, value, onPick, opts = {}) {
    let { hex, a } = parseColor(value);
    let committed = false;
    const emitC = live => onPick(a === 0 && opts.allowNone ? 'transparent' : toColor(hex, a), live);
    const hexIn = h('input', { type: 'text', value: hex });
    const native = h('input', { type: 'color', value: hex });
    const alpha = h('input', { type: 'range', min: 0, max: 100, value: Math.round(a * 100) });
    const alphaLbl = h('span', null, Math.round(a * 100) + '%');
    const sync = () => { hexIn.value = hex; native.value = hex; alpha.value = Math.round(a * 100); alphaLbl.textContent = Math.round(a * 100) + '%'; $$('.pal button', el).forEach(b => b.classList.toggle('on', b.dataset.c === hex && a === 1)); };
    const swatch = c => h('button', { 'data-c': c, title: c, style: { background: c }, onclick: () => { hex = c; a = 1; sync(); emitC(false); committed = true; } });
    const kids = [h('div.pal', null, PALETTE.map(swatch))];
    const dc = docColors().filter(c => c[0] === '#' && !PALETTE.includes(c));
    if (dc.length) kids.push(h('h4', null, 'In this design'), h('div.pal', null, dc.map(swatch)));
    const row = h('div.hexrow', null, native, hexIn);
    if (window.EyeDropper) row.append(h('button.btn.icon', { title: 'Pick from screen', onclick: async () => { try { const r = await new window.EyeDropper().open(); hex = r.sRGBHex; a = 1; sync(); emitC(false); } catch (e) { /* cancelled */ } } }, ic('sparkle')));
    if (opts.allowNone) row.append(h('button.btn', { title: 'No colour', onclick: () => { a = 0; sync(); emitC(false); } }, 'None'));
    kids.push(row, h('div.alpha', null, 'Opacity', alpha, alphaLbl));
    const el = popover(anchor, kids, { onClose: () => { if (!committed) emitC(false); } });
    native.addEventListener('input', () => { hex = native.value; if (a === 0) a = 1; sync(); emitC(true); committed = false; });
    native.addEventListener('change', () => { emitC(false); committed = true; });
    hexIn.addEventListener('change', () => { const p = parseColor(hexIn.value.trim()); hex = p.hex; a = p.a || 1; sync(); emitC(false); committed = true; });
    alpha.addEventListener('input', () => { a = alpha.value / 100; alphaLbl.textContent = alpha.value + '%'; emitC(true); committed = false; });
    alpha.addEventListener('change', () => { emitC(false); committed = true; });
    sync();
    committed = true;
  }

  const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
  let fontCat = 'All';
  function fontPopover(anchor, current, onPick) {
    const search = h('input.search', { placeholder: 'Search 120+ fonts', type: 'text' });
    const chips = h('div.chips');
    const list = h('div.font-list');
    const upload = h('button.btn', { style: { marginTop: '8px', width: '100%' }, title: 'Add .otf, .ttf, .woff, .woff2 files or a .zip of them', onclick: () => pickFonts(fam => { draw(); if (fam) { onPick(fam); closePop(); } }) }, ic('upload'), 'Upload your own fonts');
    const draw = () => {
      const cats = ['All', ...(F.customFamilies().length ? [F.CUSTOM_CAT] : []), ...F.CATEGORIES];
      if (!cats.includes(fontCat)) fontCat = 'All';
      chips.replaceChildren(...cats.map(c => h('button.chip' + (c === fontCat ? '.on' : ''), { onclick: () => { fontCat = c; draw(); } }, c)));
      const q = search.value.trim().toLowerCase();
      const items = F.FONTS.filter(f => (fontCat === 'All' || f.cat === fontCat) && (!q || f.family.toLowerCase().includes(q)));
      list.replaceChildren(...items.map(f => h('button.font-item' + (f.family === current ? '.on' : ''), {
        style: { fontFamily: `"${f.family}", ${f.cat === 'Serif' ? 'serif' : 'sans-serif'}` },
        onclick: () => { onPick(f.family); closePop(); },
      }, h('span', null, f.family), h('small', null, f.cat + (f.weights.length > 1 ? ' · ' + f.weights.length : ''),
        f.custom ? h('span.font-del', { title: `Remove ${f.family} from this browser`, onclick: async e => { e.stopPropagation(); await F.removeFamily(f.family); toast(`Removed ${f.family}`); draw(); } }, ' ✕') : null))));
      if (!items.length) list.append(h('div.hint', { style: { padding: '12px' } }, 'No fonts match.'));
    };
    search.addEventListener('input', draw);
    draw();
    popover(anchor, [search, chips, list, upload], { cls: 'font-pop', side: anchor.closest && anchor.closest('.inspector') ? 'left' : undefined });
    setTimeout(() => { search.focus(); const on = $('.font-item.on', list); if (on) on.scrollIntoView({ block: 'center' }); }, 0);
  }

  // font upload: files or zips → registered in this browser only
  function pickFonts(done) {
    const inp = h('input', { type: 'file', accept: '.otf,.ttf,.woff,.woff2,.zip,font/*,application/zip', multiple: true, hidden: true });
    document.body.append(inp);
    inp.addEventListener('change', async () => {
      const files = [...inp.files];
      inp.remove();
      if (!files.length) return;
      toast('Adding fonts…');
      try {
        const { families, skipped } = await F.importFonts(files);
        const names = Object.keys(families);
        if (!names.length) { toast('No usable fonts found — use .otf, .ttf, .woff or .woff2 files'); done && done(null); return; }
        R.fontsVersion++; R.requestRedraw();
        fontCat = F.CUSTOM_CAT;
        toast(`Added ${names.map(n => `${n} (${families[n]} style${families[n] > 1 ? 's' : ''})`).join(', ')}${skipped ? ` · ${skipped} file${skipped > 1 ? 's' : ''} skipped` : ''}`);
        done && done(names.length === 1 ? names[0] : null);
        if (tab === 'text') renderPanel();
      } catch (err) { console.error(err); toast('Couldn’t read those font files'); }
    });
    inp.click();
  }
  S.pickFonts = pickFonts;

  function menu(at, items) {
    const kids = items.map(it => it === '-' ? h('hr') : h('button', { onclick: () => { closePop(); it.run(); }, disabled: it.disabled }, ic(it.icon || 'plus'), it.label, it.kbd ? h('kbd', null, it.kbd) : null));
    popover(at.nodeType ? at : { getBoundingClientRect: () => ({ left: at.x, right: at.x, top: at.y, bottom: at.y }) }, kids, { cls: 'menu', at: at.nodeType ? null : at });
  }

  /* ───────────────────────── modals ───────────────────────── */

  function modal(content, opts = {}) {
    closeModal();
    const box = h('div.modal' + (opts.small ? '.small' : ''), null,
      opts.closable === false ? null : h('button.modal-x', { onclick: closeModal, title: 'Close' }, ic('x')), content);
    const back = h('div.modal-back', { onmousedown: e => { if (e.target === back && opts.closable !== false) closeModal(); } }, box);
    $('#modal-root').append(back);
    const esc = e => { if (e.key === 'Escape' && opts.closable !== false) closeModal(); };
    document.addEventListener('keydown', esc);
    back._esc = esc;
    return box;
  }
  function closeModal() {
    const b = $('.modal-back');
    if (b) { document.removeEventListener('keydown', b._esc); b.remove(); }
  }
  function confirmBox(title, body, okLabel, onOk) {
    modal([h('h1', { style: { fontSize: '20px' } }, title), h('p.lead', null, body),
      h('div.btn-row', null, h('button.btn', { onclick: closeModal }, 'Cancel'), h('button.btn.primary', { onclick: () => { closeModal(); onOk(); } }, okLabel))], { small: true });
  }

  /* ───────────────────────── thumbnails ───────────────────────── */

  const thumbCache = new Map();
  async function docThumb(key, docObj, width = 260) {
    if (thumbCache.has(key)) return thumbCache.get(key);
    const p = (async () => {
      await R.preload(docObj);
      const s = width / docObj.width;
      const c = R.renderDoc(docObj, { scale: s });
      return c;
    })();
    thumbCache.set(key, p);
    return p;
  }
  function prepDoc(d) {
    const dd = S.clone(d);
    dd.elements = (dd.elements || []).map(e => { const full = S.deepMerge(S.deepMerge(S.clone(baseFor(e.type)), {}), e); if (!full.id) full.id = S.uid(); S.autosize(full, false); return full; });
    dd.background = S.deepMerge(S.blankDoc(dd.width, dd.height, '#fff').background, dd.background || {});
    dd.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, dd.overlay || {});
    return dd;
  }
  function baseFor(type) { const e = S.mk(type); delete e.id; return e; }

  function elThumb(el, maxW, maxH, pad = 4) {
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const bw = el.width + pad * 2, bh = el.height + pad * 2;
    const s = Math.min(maxW / bw, maxH / bh);
    c.width = Math.ceil(bw * s * dpr); c.height = Math.ceil(bh * s * dpr);
    c.style.width = Math.ceil(bw * s) + 'px';
    const draw = () => {
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.scale(s * dpr, s * dpr); ctx.translate(pad, pad);
      R.drawElement(ctx, el, {});
    };
    draw();
    R.preload({ elements: [el] }).then(() => { if (el.type === 'text') S.autosize(el, false); draw(); });
    return c;
  }

  /* ───────────────────────── controls ───────────────────────── */

  let bindings = [];
  function val(t, path) { return t === 'doc' ? S.getPath(S.doc, path) : S.getPath(S.selEls()[0] || {}, path); }
  function refreshValues() { for (const b of bindings) { try { b(); } catch (e) { /* control gone */ } } }
  S.on('values', refreshValues);

  function decimals(step) { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; }
  function num(t, path, o = {}) {
    const scale = o.scale || 1, step = o.step || 1;
    const get = () => { const v = o.get ? o.get() : val(t, path); return (v == null ? (o.def ?? 0) : v) * scale; };
    const set = (v, live) => {
      if (o.min != null) v = Math.max(o.min, v);
      if (o.max != null && !o.soft) v = Math.min(o.max, v);
      if (o.set) o.set(v / scale, live); else S.change(t, path, v / scale, live);
    };
    const inp = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': o.label || path });
    const lbl = o.label ? h('span.lbl', { title: 'Drag to adjust' }, o.label) : null;
    const box = h('div.num' + (o.small ? '.small' : ''), null, lbl, inp, o.unit ? h('span.unit', null, o.unit) : null);
    let slider = null;
    if (o.slider) slider = h('input.slider', { type: 'range', min: o.min ?? 0, max: o.max ?? 100, step, 'aria-label': o.label || path });
    const fmt = v => (Math.round(v * 10 ** decimals(step)) / 10 ** decimals(step)).toString();
    const upd = () => {
      const v = get();
      if (document.activeElement !== inp) inp.value = fmt(v);
      if (slider && document.activeElement !== slider) slider.value = v;
    };
    inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) set(v, false); upd(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const v = (parseFloat(inp.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
        set(v, false); inp.value = fmt(clamp(v, o.min ?? -Infinity, o.max ?? Infinity));
      }
      if (e.key === 'Enter') inp.blur();
    });
    if (slider) {
      slider.addEventListener('input', () => { set(parseFloat(slider.value), true); inp.value = fmt(parseFloat(slider.value)); });
      slider.addEventListener('change', () => set(parseFloat(slider.value), false));
    }
    if (lbl) {
      lbl.addEventListener('pointerdown', e => {
        e.preventDefault();
        const x0 = e.clientX, v0 = get();
        lbl.setPointerCapture(e.pointerId);
        const mv = ev => { const v = v0 + Math.round((ev.clientX - x0) / 2) * step; set(v, true); inp.value = fmt(clamp(v, o.min ?? -Infinity, o.max ?? Infinity)); };
        const up = () => { lbl.removeEventListener('pointermove', mv); lbl.removeEventListener('pointerup', up); set(parseFloat(inp.value), false); };
        lbl.addEventListener('pointermove', mv); lbl.addEventListener('pointerup', up);
      });
    }
    bindings.push(upd); upd();
    return h('div.ctl', null, slider, box);
  }
  function colorCtl(t, path, o = {}) {
    const sw = h('span');
    const code = h('code');
    const btn = h('button.swatch-btn', { type: 'button' }, h('span.sw', null, sw), code);
    const upd = () => { const v = val(t, path); sw.style.background = v || 'transparent'; code.textContent = (!v || v === 'transparent') ? 'None' : (v[0] === '#' ? v.toUpperCase() : v); };
    btn.addEventListener('click', () => colorPopover(btn, val(t, path), (v, live) => (o.set ? o.set(v, live) : S.change(t, path, v, live)), o));
    bindings.push(upd); upd();
    return btn;
  }
  function selectCtl(t, path, options, o = {}) {
    const s = h('select.sel', { 'aria-label': o.label || path }, options.map(([v, l]) => h('option', { value: String(v) }, l)));
    const upd = () => { if (document.activeElement !== s) s.value = String(val(t, path) ?? o.def ?? ''); };
    s.addEventListener('change', () => { let v = s.value; if (o.number) v = parseFloat(v); if (o.set) o.set(v); else S.change(t, path, v, false); });
    bindings.push(upd); upd();
    return s;
  }
  function seg(t, path, options, o = {}) {
    const wrap = h('div.seg');
    const btns = options.map(([v, label, title]) => {
      const b = h('button', { type: 'button', title: title || (typeof label === 'string' && !ICONS[label] ? label : String(v)) }, ICONS[label] ? ic(label) : label);
      b.addEventListener('click', () => { if (o.set) o.set(v); else S.change(t, path, v, false); upd(); });
      b._v = v;
      return b;
    });
    wrap.append(...btns);
    const upd = () => { const cur = o.get ? o.get() : val(t, path); btns.forEach(b => b.classList.toggle('on', b._v === cur)); };
    bindings.push(upd); upd();
    return wrap;
  }
  function toggle(t, path, label, o = {}) {
    const sw = h('button.switch', { type: 'button', role: 'switch', 'aria-label': label });
    const upd = () => { const on = !!(o.get ? o.get() : val(t, path)); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on); };
    sw.addEventListener('click', () => { const v = !(o.get ? o.get() : val(t, path)); if (o.set) o.set(v); else S.change(t, path, v, false); upd(); });
    bindings.push(upd); upd();
    return h('div.toggle-row', null, h('label', null, label), sw);
  }
  function textCtl(t, path, o = {}) {
    const ta = h('textarea.txt', { rows: o.rows || 3, placeholder: o.placeholder || '', spellcheck: false });
    const upd = () => { if (document.activeElement !== ta) ta.value = val(t, path) ?? ''; };
    let timer;
    ta.addEventListener('input', () => { S.change(t, path, ta.value, true); clearTimeout(timer); timer = setTimeout(() => S.commit(), 500); });
    ta.addEventListener('blur', () => S.commit());
    bindings.push(upd); upd();
    return ta;
  }
  function inputCtl(t, path, o = {}) {
    const inp = h('input.sel', { type: 'text', placeholder: o.placeholder || '' });
    const upd = () => { if (document.activeElement !== inp) inp.value = val(t, path) ?? ''; };
    inp.addEventListener('input', () => S.change(t, path, inp.value, true));
    inp.addEventListener('change', () => S.commit());
    bindings.push(upd); upd();
    return inp;
  }
  function fontCtl(t, famPath, weightPath) {
    const label = h('span');
    const btn = h('button.font-btn', { type: 'button' }, label, ic('backward'));
    const upd = () => { const f = val(t, famPath); label.textContent = f; label.style.fontFamily = `"${f}"`; };
    btn.addEventListener('click', () => fontPopover(btn, val(t, famPath), fam => {
      if (weightPath) {
        const w = val(t, weightPath) || 400;
        S.change(t, weightPath, F.nearestWeight(fam, w), true);
      }
      S.change(t, famPath, fam, false);
      renderInspector();
    }));
    bindings.push(upd); upd();
    return btn;
  }
  function weightCtl(t, famPath, weightPath) {
    const fam = val(t, famPath);
    const meta = F.BY_NAME[fam];
    const ws = meta ? meta.weights : [400, 700];
    return selectCtl(t, weightPath, ws.map(w => [w, `${w} · ${WEIGHT_NAMES[w]}`]), { number: true });
  }
  const row = (label, ...ctl) => h('div.row', null, h('label', null, label), h('div.ctl', null, ...ctl));
  const full = (...ctl) => h('div.row.full', null, ...ctl);
  const two = (a, b) => h('div.row.two', null, a, b);

  const secOpen = new Map();
  function sec(title, kids, open = true) {
    const key = title;
    const d = h('details.sec', { open: secOpen.has(key) ? secOpen.get(key) : open }, h('summary', null, title), h('div.sec-body', null, kids));
    d.addEventListener('toggle', () => secOpen.set(key, d.open));
    return d;
  }

  /* ───────────────────────── inspector ───────────────────────── */

  const insp = $('#inspector');
  function renderInspector() {
    bindings = [];
    const els = S.selEls();
    const parts = [];
    if (!els.length) parts.push(...canvasInspector());
    else if (els.length > 1) parts.push(...multiInspector(els));
    else {
      const el = els[0];
      const head = h('div.insp-head', null, h('h2', null, typeLabel(el)), el.locked ? h('span.pill', null, 'Locked') : null);
      parts.push(head);
      if (el.type === 'text') parts.push(...textInspector());
      if (el.type === 'image') parts.push(...imageInspector(el));
      if (el.type === 'sticker') parts.push(...stickerInspector(el));
      if (el.type === 'shape') parts.push(...shapeInspector(el));
      if (el.type === 'calendar') parts.push(...calendarInspector(el));
      if (el.type === 'badge') parts.push(...badgeInspector());
      if (el.type === 'checklist') parts.push(...checklistInspector());
      parts.push(animSection(el), effectsSection(el), arrangeSection(el));
    }
    const top = insp.scrollTop;
    insp.replaceChildren(...parts.filter(Boolean));
    insp.scrollTop = top;
    hydrateIcons(insp);
  }
  S.renderInspector = renderInspector;
  function typeLabel(el) {
    return { text: 'Text', image: el.assetId ? 'Photo' : 'Photo placeholder', sticker: 'Sticker', shape: 'Shape', calendar: 'Calendar', badge: 'Badge', checklist: 'Checklist' }[el.type] || 'Element';
  }

  function textInspector() {
    const T = 'sel';
    const el = S.selEls()[0];
    const curved = el.curve && Math.abs(el.curve) >= 1;
    const styleChips = h('div.chips', { style: { margin: '0' } });
    const drawChips = () => styleChips.replaceChildren(...Object.entries(R.TEXT_BG).map(([k, l]) => h('button.chip' + ((S.selEls()[0]?.bg?.style || 'none') === k ? '.on' : ''), { onclick: () => { S.change(T, 'bg.style', k, false); drawChips(); renderInspector(); } }, l)));
    drawChips();
    const bgStyle = el.bg.style || 'none';
    const lineStyle = ['lines', 'select', 'marker', 'underline'].includes(bgStyle);
    const fills = [
      row('Colour', colorCtl(T, 'fill', { allowNone: true })),
      row('Gradient', selectCtl(T, 'gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'gradient', v); renderInspector(); } })),
    ];
    if (el.gradient && el.gradient !== 'none') fills.push(row('To', colorCtl(T, 'fill2')), row('Angle', num(T, 'gradAngle', { min: 0, max: 360, slider: true, unit: '°' })));
    const out = [
      sec('Text', [
        full(textCtl(T, 'text', { rows: 3 })),
        full(fontCtl(T, 'fontFamily', 'fontWeight')),
        two(num(T, 'fontSize', { label: 'Size', min: 4, max: 2000, step: 1 }), weightCtl(T, 'fontFamily', 'fontWeight')),
        full(h('div.btn-row', null,
          seg(T, 'align', [['left', 'tl', 'Align left'], ['center', 'tc', 'Align centre'], ['right', 'tr', 'Align right']]),
          styleToggle('italic', 'italic', 'Italic'), styleToggle('underline', 'underline', 'Underline'),
          styleToggle('strike', 'strike', 'Strikethrough'), styleToggle('uppercase', 'upper', 'Uppercase'))),
        ...fills,
        row('Line height', num(T, 'lineHeight', { min: 0.5, max: 3, step: 0.05, slider: true })),
        row('Spacing', num(T, 'letterSpacing', { min: -10, max: 60, step: 0.5, scale: 100, slider: true, unit: '%' })),
        row('Curve', num(T, 'curve', { min: -100, max: 100, step: 1, slider: true, set: (v, live) => { S.change(T, 'curve', v, live); if (!live) S.attachTransformer(); } })),
        el.autoWidth || curved ? null : toggle(T, 'autoWidth', 'Auto width (no wrapping)'),
      ]),
      sec('Text style', [
        full(styleChips),
        bgStyle !== 'none' ? row(bgStyle === 'sticker' ? 'Outline' : 'Fill', colorCtl(T, 'bg.color', { allowNone: true })) : null,
        bgStyle !== 'none' ? row(bgStyle === 'sticker' ? 'Thickness' : 'Padding X', num(T, 'bg.padX', { min: 0, max: 200, slider: true })) : null,
        bgStyle !== 'none' && bgStyle !== 'sticker' ? row('Padding Y', num(T, 'bg.padY', { min: 0, max: 200, slider: true })) : null,
        ['box', 'lines', 'ticket', 'speech'].includes(bgStyle) ? row('Radius', num(T, 'bg.radius', { min: 0, max: 200, slider: true })) : null,
        lineStyle ? row('Line gap', num(T, 'bg.gap', { min: -40, max: 120, slider: true })) : null,
        bgStyle !== 'none' ? row(bgStyle === 'select' ? 'Accent' : 'Border', colorCtl(T, 'bg.borderColor')) : null,
        bgStyle !== 'none' ? row(bgStyle === 'select' ? 'Line' : 'Border W', num(T, 'bg.borderWidth', { min: 0, max: 40, slider: true, step: 0.5 })) : null,
        ['box', 'pill', 'lines'].includes(bgStyle) ? toggle(T, 'bg.stitch', 'Stitched dashed edge') : null,
      ]),
      sec('Outline & 3D', [
        row('Outline', num(T, 'stroke.width', { min: 0, max: 40, step: 0.5, slider: true })),
        row('Colour', colorCtl(T, 'stroke.color')),
        toggle(T, 'echo.on', 'Hard shadow / 3D', { set: v => { S.change(T, 'echo.on', v); renderInspector(); } }),
        ...(el.echo.on ? [
          row('Shadow', colorCtl(T, 'echo.color')),
          row('Offset X', num(T, 'echo.dx', { min: -50, max: 50, step: 0.5, scale: 100, slider: true, unit: '%' })),
          row('Offset Y', num(T, 'echo.dy', { min: -50, max: 50, step: 0.5, scale: 100, slider: true, unit: '%' })),
          row('Depth', num(T, 'echo.steps', { min: 1, max: 30, step: 1, slider: true })),
        ] : []),
      ], false),
    ];
    return out;
  }
  function styleToggle(path, iconName, title) {
    const b = h('button.btn.icon', { type: 'button', title }, ic(iconName));
    const upd = () => b.classList.toggle('on', !!val('sel', path));
    b.addEventListener('click', () => { S.change('sel', path, !val('sel', path)); upd(); });
    bindings.push(upd); upd();
    return b;
  }

  function filterThumbs(el, target) {
    const grid = h('div.filter-grid');
    const img = target === 'doc' ? R.assetImage(S.doc.background.assetId) : R.assetImage(el.assetId);
    const assetId = target === 'doc' ? S.doc.background.assetId : el.assetId;
    let small = null;
    if (img) {
      small = document.createElement('canvas');
      const s = 120 / Math.max(img.naturalWidth, img.naturalHeight);
      small.width = Math.max(1, Math.round(img.naturalWidth * s)); small.height = Math.max(1, Math.round(img.naturalHeight * s));
      small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
    }
    const fpath = target === 'doc' ? 'background.filters' : 'filters';
    const cur = JSON.stringify(S.getPath(target === 'doc' ? S.doc : el, fpath) || {});
    for (const [k, p] of Object.entries(R.FILTER_PRESETS)) {
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      const x = c.getContext('2d');
      if (small) {
        const src = R.filteredSource('thumb:' + assetId, small, p.f);
        const sc = Math.max(96 / small.width, 96 / small.height);
        x.drawImage(src, (96 - small.width * sc) / 2, (96 - small.height * sc) / 2, small.width * sc, small.height * sc);
      } else { x.fillStyle = '#ddd'; x.fillRect(0, 0, 96, 96); }
      const on = JSON.stringify(p.f) === cur;
      grid.append(h('button.filter-tile' + (on ? '.on' : ''), { onclick: () => { S.change(target, fpath, S.clone(p.f)); renderInspector(); } }, c, p.label));
    }
    return grid;
  }
  function filterSliders(t, base) {
    const items = [['brightness', 'Brightness', -100, 100], ['contrast', 'Contrast', -100, 100], ['saturation', 'Saturation', -100, 100],
      ['warmth', 'Warmth', -100, 100], ['fade', 'Fade', 0, 100], ['grayscale', 'Mono', 0, 100], ['sepia', 'Sepia', 0, 100],
      ['vignette', 'Vignette', 0, 100], ['grain', 'Grain', 0, 100], ['blur', 'Blur', 0, 40]];
    const out = items.map(([k, l, a, b]) => row(l, num(t, base + '.' + k, { min: a, max: b, slider: true, def: 0 })));
    const f = S.getPath(t === 'doc' ? S.doc : S.selEls()[0] || {}, base) || {};
    out.push(h('div.hint', { style: { marginTop: '6px' } }, 'Print effects'),
      row('Halftone', num(t, base + '.halftone', { min: 0, max: 100, slider: true, def: 0 })),
      row('Photocopy', num(t, base + '.threshold', { min: 0, max: 100, slider: true, def: 0 })),
      toggle(t, base + '.duotone', 'Duotone', { set: v => { S.change(t, base + '.duotone', v); if (v && !f.duoDark) { S.change(t, base + '.duoDark', '#1b2a8f', true); S.change(t, base + '.duoLight', '#a9c4ff'); } renderInspector(); } }));
    if (f.duotone || f.threshold || f.halftone) out.push(row('Ink', colorCtl(t, base + '.duoDark')), row('Paper', colorCtl(t, base + '.duoLight')));
    return out;
  }

  function frameTiles(el) {
    const grid = h('div.frame-grid');
    for (const [k, l] of Object.entries(R.FRAMES)) {
      const demo = S.mk('image', { assetId: el.assetId, width: 100, height: k === 'polaroid' ? 120 : 100, frame: { style: k, color: k === 'film' ? '#1d1b18' : el.frame.color === '#ffffff' && ['circle', 'heart', 'star', 'blob', 'scallop', 'flower', 'squircle', 'sparkle', 'arch', 'ticket', 'rounded', 'none'].includes(k) ? '#ffffff' : (el.frame.color || '#fff'), size: ['none', 'rounded', 'circle', 'arch', 'blob', 'heart', 'star', 'scallop', 'flower', 'ticket', 'squircle', 'sparkle'].includes(k) ? 0 : 7, radius: k === 'rounded' ? 14 : 0 }, crop: el.crop, filters: el.filters, placeholder: el.placeholder });
      demo.id = el.id;
      const c = elThumb(demo, 56, 56, 2);
      c.style.width = '100%';
      grid.append(h('button.frame-tile' + ((el.frame.style || 'none') === k ? '.on' : ''), {
        onclick: () => {
          const cur = S.selEls()[0];
          const needsBorder = ['polaroid', 'stamp', 'film', 'torn', 'border'].includes(k);
          S.changeEl(cur, e => {
            e.frame.style = k;
            if (needsBorder && !(e.frame.size > 2)) e.frame.size = Math.round(Math.min(e.width, e.height) * 0.05);
            if (!needsBorder && ['circle', 'heart', 'star', 'blob', 'scallop', 'flower', 'squircle', 'sparkle', 'arch'].includes(k)) e.frame.size = 0;
            if (k === 'film' && e.frame.color === '#ffffff') e.frame.color = '#1d1b18';
            if (k !== 'film' && e.frame.color === '#1d1b18') e.frame.color = '#ffffff';
            if (k === 'rounded' && !e.frame.radius) e.frame.radius = Math.round(Math.min(e.width, e.height) * 0.08);
          });
          renderInspector();
        },
      }, c, l));
    }
    return grid;
  }

  function bgRemovalControls(el) {
    const busy = S.isRemovingBackground();
    if (el.bgRemoved) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('div.btn-row', null,
          h('button.btn', { onclick: () => S.restoreBackground(el.id) }, ic('undo'), 'Restore background'),
          h('button.btn' + (el.outline && el.outline.on ? '.on' : ''), { onclick: () => { S.change('sel', 'outline.on', !(el.outline && el.outline.on)); renderInspector(); } }, ic('sticker'), 'Sticker border')));
    }
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
      h('div.btn-row', null,
        h('button.btn.primary', { disabled: busy, onclick: () => S.removeBackground(el.id, 'replace') }, ic('wand'), busy ? 'Working…' : 'Remove background'),
        h('button.btn', { disabled: busy, title: 'Keep the photo and add the cut-out subject as a new layer on top', onclick: () => S.removeBackground(el.id, 'layer') }, ic('layers'), 'Cut out to layer')),
      h('div.hint', null, 'Finds the subject automatically. Runs on your device — the first use downloads a 44 MB model.'));
  }

  function imageInspector(el) {
    const T = 'sel';
    const fs = el.frame.style || 'none';
    const bordered = ['polaroid', 'stamp', 'film', 'torn', 'border'].includes(fs);
    return [
      sec('Photo', [
        full(h('div.btn-row', null,
          h('button.btn', { onclick: () => S.pickImages({ replaceId: el.id }) }, ic('replace'), el.assetId ? 'Replace' : 'Add photo'),
          el.assetId ? h('button.btn', { onclick: () => S.startCrop(el.id) }, ic('crop'), 'Crop') : null,
          el.assetId ? h('button.btn', { onclick: () => { S.setBackgroundImage(el.assetId); toast('Set as background'); } }, ic('bgimg'), 'As bg') : null)),
        el.assetId ? bgRemovalControls(el) : null,
        el.assetId ? row('Zoom', num(T, 'crop.zoom', { min: 1, max: 5, step: 0.01, slider: true })) : null,
        el.assetId ? row('Pan X', num(T, 'crop.x', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })) : null,
        el.assetId ? row('Pan Y', num(T, 'crop.y', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })) : null,
        el.assetId ? null : row('Tint', colorCtl(T, 'placeholder.0', { set: (v, live) => S.changeEl(S.selEls()[0], e => { e.placeholder = [v, (e.placeholder || [])[1] || '#cfc5b1']; }, live) })),
        h('div.hint', null, 'Double-click the photo to crop. Drop a file onto it to replace.'),
      ]),
      sec('Frame', [
        full(frameTiles(el)),
        fs !== 'none' ? row('Frame', colorCtl(T, 'frame.color')) : null,
        fs !== 'none' ? row(bordered ? 'Border' : 'Edge', num(T, 'frame.size', { min: 0, max: 200, slider: true })) : null,
        ['none', 'rounded', 'border', 'polaroid', 'ticket'].includes(fs) ? row('Radius', num(T, 'frame.radius', { min: 0, max: 400, slider: true })) : null,
        fs === 'polaroid' ? row('Bottom', num(T, 'frame.bottom', { min: 1, max: 8, step: 0.1, slider: true, unit: '×' })) : null,
        bordered ? row('Paper', num(T, 'frame.texture', { min: 0, max: 100, slider: true })) : null,
      ]),
      el.assetId ? sec('Filters', [full(filterThumbs(el, 'sel')), ...filterSliders(T, 'filters'),
        full(h('button.btn', { onclick: () => { S.change(T, 'filters', {}); renderInspector(); } }, 'Reset adjustments'))]) : null,
      fs === 'none' && el.assetId ? sec('Cut-out border', [
        toggle(T, 'outline.on', 'Sticker border'),
        row('Style', selectCtl(T, 'outline.style', Object.entries(R.OUTLINE_STYLES), { def: 'smooth' })),
        row('Colour', colorCtl(T, 'outline.color')),
        row('Width', num(T, 'outline.width', { min: 1, max: 80, slider: true })),
        h('div.hint', null, 'Follows the subject’s shape on cut-outs (after Remove background) and transparent PNGs.'),
      ], !!(el.outline && el.outline.on) || !!el.bgRemoved) : null,
    ];
  }

  function stickerInspector(el) {
    const T = 'sel';
    const def = R.stickerDef(el.stickerId);
    const cols = def ? def.colors : [];
    const colorRows = cols.map((c, i) => row(i === 0 ? 'Colour' : `Colour ${i + 1}`, colorCtl(T, 'colors.' + i, {
      set: (v, live) => S.changeEl(S.selEls()[0], e => { if (!e.colors || e.colors.length !== cols.length) e.colors = cols.slice(); e.colors[i] = v; }, live),
    })));
    // the getter falls back to defaults until the sticker is recoloured
    if (!el.colors || el.colors.length !== cols.length) el.colors = cols.slice();
    return [
      sec('Sticker', [
        h('div.hint', null, def ? def.name : el.stickerId),
        ...colorRows,
        cols.length ? full(h('button.btn', { onclick: () => { S.change(T, 'colors', cols.slice()); } }, 'Reset colours')) : h('div.hint', null, 'This sticker keeps its original colours.'),
      ]),
      sec('Die-cut outline', [
        toggle(T, 'outline.on', 'Sticker border'),
        row('Style', selectCtl(T, 'outline.style', Object.entries(R.OUTLINE_STYLES), { def: 'smooth' })),
        row('Colour', colorCtl(T, 'outline.color')),
        row('Width', num(T, 'outline.width', { min: 1, max: 80, slider: true })),
      ], !!el.outline.on),
    ];
  }

  function shapeInspector(el) {
    const T = 'sel';
    const k = el.shape;
    const opts = Object.entries(R.SHAPES).map(([v, s]) => [v, s.label]);
    if (k === 'line') {
      return [sec('Line', [
        row('Colour', colorCtl(T, 'stroke')),
        row('Weight', num(T, 'strokeWidth', { min: 1, max: 80, slider: true })),
        row('Dashes', num(T, 'dash', { min: 0, max: 6, step: 0.5, slider: true })),
        toggle(T, 'arrowEnd', 'Arrow at end'),
        toggle(T, 'arrowStart', 'Arrow at start'),
        toggle(T, 'wavy', 'Wavy line'),
      ])];
    }
    const fill = [
      row('Shape', selectCtl(T, 'shape', opts.filter(o => o[0] !== 'line'), { set: v => { S.change(T, 'shape', v); renderInspector(); } })),
      row('Fill', colorCtl(T, 'fill', { allowNone: true })),
      row('Gradient', selectCtl(T, 'gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'gradient', v); renderInspector(); } })),
    ];
    if (el.gradient && el.gradient !== 'none') fill.push(row('To', colorCtl(T, 'fill2')), row('Angle', num(T, 'gradAngle', { min: 0, max: 360, slider: true, unit: '°' })));
    fill.push(row('Stroke', colorCtl(T, 'stroke', { allowNone: true })), row('Stroke W', num(T, 'strokeWidth', { min: 0, max: 60, step: 0.5, slider: true })), row('Dashes', num(T, 'dash', { min: 0, max: 6, step: 0.5, slider: true })));
    if (['rect', 'rounded', 'triangle', 'pentagon', 'hexagon', 'star', 'ticket', 'speech'].includes(k)) fill.push(row('Corners', num(T, 'radius', { min: 0, max: 400, slider: true })));
    if (['star', 'burst', 'scallop', 'flower'].includes(k)) fill.push(row('Points', num(T, 'points', { min: 3, max: 40, slider: true })));
    if (['star', 'burst'].includes(k)) fill.push(row('Inner', num(T, 'inner', { min: 10, max: 95, scale: 100, slider: true, unit: '%' })));
    if (['scallop', 'flower'].includes(k)) fill.push(row('Depth', num(T, 'depth', { min: 1, max: 50, scale: 100, slider: true, unit: '%' })));
    if (k === 'torn') {
      const sides = (el.tornSides || 'trbl');
      fill.push(row('Torn edges', h('div.seg', null, [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([c, l]) => h('button' + (sides.includes(c) ? '.on' : ''), {
        onclick: () => { const cur = S.selEls()[0].tornSides || 'trbl'; let nx = cur.includes(c) ? cur.replace(c, '') : cur + c; if (!nx) nx = c; S.change(T, 'tornSides', 'trbl'.split('').filter(x => nx.includes(x)).join('')); renderInspector(); },
      }, l)))));
    }
    if (['torn', 'notebook'].includes(k)) fill.push(row('Torn rim', colorCtl(T, 'rim', { allowNone: true })));
    if (['blob', 'torn', 'notebook'].includes(k)) fill.push(full(h('button.btn', { onclick: () => S.change(T, 'seed', Math.floor(Math.random() * 1000)) }, ic('shuffle'), 'Shuffle shape')));
    return [
      sec('Shape', fill),
      sec('Pattern & paper', [
        row('Pattern', selectCtl(T, 'pattern.type', Object.entries(R.PATTERNS))),
        row('Colour', colorCtl(T, 'pattern.color')),
        row('Size', num(T, 'pattern.size', { min: 4, max: 300, slider: true })),
        row('Line', num(T, 'pattern.thick', { min: 0.5, max: 12, step: 0.5, slider: true })),
        row('Paper grain', num(T, 'texture', { min: 0, max: 100, slider: true })),
        row('Crumpled', num(T, 'crumple', { min: 0, max: 100, slider: true, def: 0 })),
      ], !!(el.texture || el.crumple || (el.pattern && el.pattern.type !== 'none'))),
    ];
  }

  function calendarInspector(el) {
    const T = 'sel';
    const lay = el.layout || 'grid';
    const months = R.MONTHS.map((m, i) => [i, m]);
    const miniCal = () => {
      const e = S.selEls()[0];
      const first = new Date(e.year, e.month, 1).getDay();
      const off = e.startMonday ? (first + 6) % 7 : first;
      const days = new Date(e.year, e.month + 1, 0).getDate();
      const names = e.startMonday ? 'MTWTFSS' : 'SMTWTFS';
      const grid = h('div.mini-cal', null, [...names].map(n => h('span', null, n)));
      for (let i = 0; i < off; i++) grid.append(h('span'));
      const marked = new Set(e.marked || []);
      for (let d = 1; d <= days; d++) {
        const on = (lay === 'grid' || lay === 'minimal') ? marked.has(d) : (lay === 'strip' || lay === 'page') ? e.day === d : false;
        grid.append(h('button' + (on ? '.on' : ''), {
          onclick: () => {
            if (lay === 'page' || lay === 'strip') {
              if (lay === 'strip' && e.day !== d) S.change(T, 'day', d);
              else if (lay === 'strip') { const m = new Set(e.marked || []); m.has(d) ? m.delete(d) : m.add(d); S.change(T, 'marked', [...m]); }
              else S.change(T, 'day', d);
            } else {
              const m = new Set(e.marked || []); m.has(d) ? m.delete(d) : m.add(d);
              S.change(T, 'marked', [...m].sort((a, b) => a - b));
            }
            calHolder.replaceChildren(miniCal());
          },
        }, d));
      }
      return grid;
    };
    const calHolder = h('div', null, miniCal());
    const relayout = v => { S.change(T, 'layout', v); renderInspector(); };
    return [
      sec('Calendar', [
        full(seg(T, 'layout', [['grid', 'Grid'], ['minimal', 'Minimal'], ['strip', 'Week'], ['page', 'Date']], { set: relayout })),
        two(selectCtl(T, 'month', months, { number: true, set: v => { S.change(T, 'month', v); calHolder.replaceChildren(miniCal()); } }), num(T, 'year', { min: 1900, max: 2200, step: 1, set: (v, live) => { S.change(T, 'year', Math.round(v), live); if (!live) calHolder.replaceChildren(miniCal()); } })),
        h('div.hint', null, lay === 'page' ? 'Pick the date to show:' : lay === 'strip' ? 'Pick the highlighted day (click again to add a dot):' : 'Tap days to mark them:'),
        full(calHolder),
        lay !== 'page' ? row('Mark', selectCtl(T, 'markStyle', [['circle', 'Filled circle'], ['ring', 'Ring'], ['scribble', 'Scribble circle'], ['heart', 'Heart'], ['star', 'Star'], ['flower', 'Flower'], ['square', 'Square'], ['cross', 'Cross out']])) : null,
        lay !== 'page' ? toggle(T, 'startMonday', 'Week starts Monday', { set: v => { S.change(T, 'startMonday', v); calHolder.replaceChildren(miniCal()); } }) : null,
      ]),
      sec('Colours', [
        row('Text', colorCtl(T, 'color')),
        row('Accent', colorCtl(T, 'accent')),
        row('On accent', colorCtl(T, 'accentText')),
        lay === 'grid' ? row('Grid lines', colorCtl(T, 'lineColor', { allowNone: true })) : null,
        row('Cells', colorCtl(T, 'cellColor', { allowNone: true })),
        row('Background', colorCtl(T, 'bgColor', { allowNone: true })),
        row('Radius', num(T, 'radius', { min: 0, max: 200, slider: true })),
      ]),
      sec('Typography', [
        h('div.hint', null, 'Title / numbers font'),
        full(fontCtl(T, 'titleFont', 'titleWeight')),
        h('div.hint', null, 'Labels / days font'),
        full(fontCtl(T, 'bodyFont', 'bodyWeight')),
        lay !== 'page' ? toggle(T, 'showTitle', 'Show month title') : null,
        lay !== 'page' ? toggle(T, 'showYear', 'Show year') : null,
        lay !== 'page' ? row('Title', seg(T, 'titleAlign', [['left', 'tl', 'Left'], ['center', 'tc', 'Centre']])) : null,
        row('Case', seg(T, 'monthCase', [['normal', 'Aa'], ['upper', 'AA']])),
        lay === 'grid' || lay === 'minimal' ? row('Weekdays', seg(T, 'dayFormat', [['initial', 'M'], ['short', 'MON'], ['long', 'Monday']])) : null,
        lay === 'grid' || lay === 'minimal' ? row('Title size', num(T, 'titleSize', { min: 5, max: 40, scale: 100, slider: true, unit: '%' })) : null,
        row('Title track', num(T, 'titleSpacing', { min: -10, max: 60, scale: 100, slider: true, unit: '%' })),
      ], false),
      lay === 'grid' || lay === 'minimal' ? sec('Grid', [
        lay === 'grid' ? toggle(T, 'showLines', 'Grid lines') : null,
        toggle(T, 'showWeekdays', 'Weekday names', { get: () => S.selEls()[0].showWeekdays !== false }),
        toggle(T, 'headerLine', 'Rule under weekdays'),
        toggle(T, 'weekendAccent', 'Accent weekends'),
        toggle(T, 'showAdjacent', 'Show neighbouring days'),
        lay === 'grid' ? row('Numbers', seg(T, 'numberPos', [['center', 'Centre'], ['corner', 'Top left'], ['corner-right', 'Top right']])) : null,
        row('Number size', num(T, 'numberScale', { min: 20, max: 200, scale: 100, slider: true, unit: '%', def: 1 })),
        row('Cell radius', num(T, 'cellRadius', { min: 0, max: 50, scale: 100, slider: true, unit: '%' })),
      ], false) : null,
    ];
  }

  function badgeInspector() {
    const T = 'sel';
    const el = S.selEls()[0];
    return [
      sec('Ring text', [
        full(inputCtl(T, 'ringText', { placeholder: 'Text around the circle' })),
        full(fontCtl(T, 'ringFont', 'ringWeight')),
        row('Colour', colorCtl(T, 'textColor')),
        row('Size', num(T, 'ringSize', { min: 3, max: 25, step: 0.5, scale: 100, slider: true, unit: '%' })),
        row('Spacing', num(T, 'ringSpacing', { min: -10, max: 80, scale: 100, slider: true, unit: '%' })),
        row('Radius', num(T, 'ringRadius', { min: 30, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Rotate', num(T, 'ringStart', { min: -180, max: 180, slider: true, unit: '°' })),
        toggle(T, 'ringFill', 'Spread around full circle'),
        toggle(T, 'ringRepeat', 'Repeat text'),
        toggle(T, 'ringUpper', 'Uppercase'),
      ]),
      sec('Badge', [
        row('Shape', selectCtl(T, 'shape', [['circle', 'Circle'], ['scallop', 'Scallop'], ['flower', 'Flower'], ['burst', 'Starburst'], ['none', 'None']])),
        row('Fill', colorCtl(T, 'fill', { allowNone: true })),
        row('Border', colorCtl(T, 'borderColor')),
        row('Border W', num(T, 'borderWidth', { min: 0, max: 40, slider: true })),
        toggle(T, 'innerRing', 'Inner ring line'),
      ]),
      sec('Centre', [
        row('Centre', selectCtl(T, 'center', [['asterisk', 'Asterisk'], ['star', 'Star'], ['sparkle', 'Sparkle'], ['heart', 'Heart'], ['flower', 'Flower'], ['text', 'Text'], ['none', 'Nothing']], { set: v => { S.change(T, 'center', v); renderInspector(); } })),
        el.center === 'text' ? full(textCtl(T, 'centerText', { rows: 2 })) : null,
        el.center === 'text' ? full(fontCtl(T, 'centerFont', 'centerWeight')) : null,
        row('Size', num(T, 'centerSize', { min: 5, max: 80, scale: 100, slider: true, unit: '%' })),
        row('Colour', colorCtl(T, 'centerColor')),
      ]),
    ];
  }

  function checklistInspector() {
    const T = 'sel';
    return [
      sec('Checklist', [
        full(textCtl(T, 'items', { rows: 5 })),
        h('div.hint', null, 'One item per line. Start a line with [x] to tick it.'),
        full(fontCtl(T, 'fontFamily', 'fontWeight')),
        two(num(T, 'fontSize', { label: 'Size', min: 6, max: 400 }), num(T, 'lineHeight', { label: 'Line', min: 1, max: 4, step: 0.05 })),
        row('Text', colorCtl(T, 'fill')),
        row('Boxes', seg(T, 'boxStyle', [['square', '□'], ['round', '▢'], ['circle', '○'], ['heart', '♡'], ['star', '☆']])),
        row('Box colour', colorCtl(T, 'boxColor')),
        row('Tick', colorCtl(T, 'checkColor')),
        toggle(T, 'fillChecked', 'Fill ticked boxes'),
        toggle(T, 'strikeChecked', 'Strike through done items'),
        toggle(T, 'dimChecked', 'Fade done items'),
        toggle(T, 'ruled', 'Ruled lines'),
      ]),
    ];
  }

  const SHADOWS = {
    none: { on: false },
    soft: { on: true, color: '#000000', opacity: 0.22, blur: 30, x: 0, y: 14 },
    lifted: { on: true, color: '#000000', opacity: 0.35, blur: 12, x: 0, y: 6 },
    hard: { on: true, color: '#1d1b18', opacity: 1, blur: 0, x: 10, y: 10 },
    glow: { on: true, color: '#fff36b', opacity: 0.9, blur: 30, x: 0, y: 0 },
  };
  function effectsSection(el) {
    const T = 'sel';
    const presetOf = () => { const s = S.selEls()[0]?.shadow || {}; if (!s.on) return 'none'; for (const [k, p] of Object.entries(SHADOWS)) if (p.on && p.blur === s.blur && p.x === s.x && p.y === s.y && p.opacity === s.opacity) return k; return 'custom'; };
    return sec('Effects', [
      el.erase && el.erase.length ? full(h('div.btn-row', null, h('button.btn', { onclick: () => { S.clearErase(el.id); renderInspector(); } }, ic('eraser'), 'Restore erased areas'), h('button.btn', { onclick: () => S.setTool('erase') }, ic('eraser'), 'Keep erasing'))) : null,
      row('Opacity', num(T, 'opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
      row('Blend', selectCtl(T, 'blend', [['normal', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['color-burn', 'Colour burn'], ['soft-light', 'Soft light'], ['difference', 'Difference'], ['luminosity', 'Luminosity']])),
      row('Shadow', seg(T, 'shadow', [['none', 'None'], ['soft', 'Soft'], ['lifted', 'Lift'], ['hard', 'Hard'], ['glow', 'Glow']], { get: presetOf, set: v => { S.change(T, 'shadow', Object.assign({}, S.selEls()[0].shadow, SHADOWS[v])); renderInspector(); } })),
      ...(el.shadow.on ? [
        row('Colour', colorCtl(T, 'shadow.color')),
        row('Strength', num(T, 'shadow.opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Blur', num(T, 'shadow.blur', { min: 0, max: 120, slider: true })),
        row('Offset X', num(T, 'shadow.x', { min: -100, max: 100, slider: true })),
        row('Offset Y', num(T, 'shadow.y', { min: -100, max: 100, slider: true })),
      ] : []),
    ], el.shadow.on || el.opacity < 1);
  }

  function alignGrid() {
    return h('div.align-grid', null,
      [['left', 'alignL', 'Align left'], ['hcenter', 'alignC', 'Centre horizontally'], ['right', 'alignR', 'Align right'],
        ['top', 'alignT', 'Align top'], ['vcenter', 'alignM', 'Centre vertically'], ['bottom', 'alignB', 'Align bottom']]
        .map(([op, i, t]) => h('button', { title: t, onclick: () => S.align(op) }, ic(i))));
  }
  function arrangeSection(el) {
    const T = 'sel';
    const ratioLocked = el.type === 'sticker' || el.type === 'badge';
    const setW = (v, live) => S.changeEl(S.selEls()[0], e => { const r = e.height / e.width; if (e.type === 'text') { e.autoWidth = false; } e.width = Math.max(4, v); if (ratioLocked) e.height = e.width * r; }, live);
    const setH = (v, live) => S.changeEl(S.selEls()[0], e => { const r = e.width / e.height; e.height = Math.max(4, v); if (ratioLocked) e.width = e.height * r; }, live);
    const sizeEditable = el.type !== 'text' && el.type !== 'checklist';
    return sec('Position & layer', [
      h('div.hint', null, 'Align to canvas'),
      alignGrid(),
      two(num(T, 'x', { label: 'X', step: 1, soft: true }), num(T, 'y', { label: 'Y', step: 1, soft: true })),
      two(num(T, 'width', { label: 'W', min: 4, set: setW }), sizeEditable ? num(T, 'height', { label: 'H', min: 4, set: setH }) : num(T, 'height', { label: 'H', set: () => {} })),
      two(num(T, 'rotation', { label: '∠', unit: '°', step: 1, soft: true, set: (v, live) => S.change(T, 'rotation', ((v % 360) + 360) % 360 > 180 ? ((v % 360) + 360) % 360 - 360 : ((v % 360) + 360) % 360, live) }),
        h('div.btn-row', null, el.type !== 'text' ? h('button.btn.icon', { title: 'Flip horizontal', onclick: () => S.flip('x') }, ic('flipH')) : null,
          el.type !== 'text' ? h('button.btn.icon', { title: 'Flip vertical', onclick: () => S.flip('y') }, ic('flipV')) : null)),
      h('div.btn-row', null,
        h('button.btn.icon', { title: 'Bring to front (⇧⌘])', onclick: () => S.order('front') }, ic('front')),
        h('button.btn.icon', { title: 'Bring forward (⌘])', onclick: () => S.order('forward') }, ic('forward')),
        h('button.btn.icon', { title: 'Send backward (⌘[)', onclick: () => S.order('backward') }, ic('backward')),
        h('button.btn.icon', { title: 'Send to back (⇧⌘[)', onclick: () => S.order('back') }, ic('back')),
        h('button.btn.icon', { title: el.locked ? 'Unlock (⌘L)' : 'Lock (⌘L)', onclick: () => S.toggleLock() }, ic(el.locked ? 'unlock' : 'lock'))),
      h('div.btn-row', null,
        h('button.btn', { onclick: () => S.duplicate() }, ic('copy'), 'Duplicate'),
        h('button.btn.danger', { onclick: () => S.removeSelected() }, ic('trash'), 'Delete')),
    ], true);
  }

  function multiInspector(els) {
    return [
      h('div.insp-head', null, h('h2', null, `${els.length} elements`)),
      sec('Arrange', [
        h('div.hint', null, 'Align to each other'),
        alignGrid(),
        els.length >= 3 ? h('div.btn-row', null, h('button.btn', { onclick: () => S.distribute('x') }, ic('distH'), 'Space horizontally'), h('button.btn', { onclick: () => S.distribute('y') }, ic('distV'), 'Space vertically')) : null,
        row('Opacity', num('sel', 'opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        h('div.btn-row', null,
          h('button.btn.icon', { title: 'Bring to front', onclick: () => S.order('front') }, ic('front')),
          h('button.btn.icon', { title: 'Bring forward', onclick: () => S.order('forward') }, ic('forward')),
          h('button.btn.icon', { title: 'Send backward', onclick: () => S.order('backward') }, ic('backward')),
          h('button.btn.icon', { title: 'Send to back', onclick: () => S.order('back') }, ic('back')),
          h('button.btn.icon', { title: 'Lock', onclick: () => S.toggleLock() }, ic('lock'))),
        h('div.btn-row', null, h('button.btn', { onclick: () => S.duplicate() }, ic('copy'), 'Duplicate'), h('button.btn.danger', { onclick: () => S.removeSelected() }, ic('trash'), 'Delete')),
      ]),
    ];
  }

  function canvasInspector() {
    const T = 'doc';
    const d = S.doc;
    const bg = d.background;
    const grad = bg.gradient && bg.gradient !== 'none';
    return [
      h('div.insp-head', null, h('h2', null, 'Canvas'), h('span.pill', null, `${d.width} × ${d.height}`)),
      sec('Background', [
        row('Colour', colorCtl(T, 'background.color')),
        row('Gradient', selectCtl(T, 'background.gradient', [['none', 'None'], ['linear', 'Linear'], ['radial', 'Radial']], { set: v => { S.change(T, 'background.gradient', v); renderInspector(); } })),
        grad ? row('To', colorCtl(T, 'background.color2')) : null,
        grad ? row('Angle', num(T, 'background.angle', { min: 0, max: 360, slider: true, unit: '°' })) : null,
        full(h('div.btn-row', null,
          h('button.btn', { onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), bg.assetId ? 'Replace photo' : 'Background photo'),
          bg.assetId ? h('button.btn', { onclick: () => { S.change(T, 'background.assetId', null); renderInspector(); } }, ic('trash'), 'Remove') : null,
          h('button.btn', { onclick: () => openSizeModal() }, ic('resize'), 'Resize'))),
      ]),
      bg.assetId ? sec('Background photo', [
        full(h('button.btn.primary', { disabled: S.isRemovingBackground(), title: 'Copies the main subject onto its own layer so you can tuck text behind it', onclick: () => S.cutoutBackgroundSubject() }, ic('wand'), S.isRemovingBackground() ? 'Working…' : 'Cut out subject to a layer')),
        h('div.hint', null, 'Great for putting text behind a person. Runs on your device.'),
        row('Opacity', num(T, 'background.imageOpacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Zoom', num(T, 'background.crop.zoom', { min: 1, max: 5, step: 0.01, slider: true })),
        row('Pan X', num(T, 'background.crop.x', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        row('Pan Y', num(T, 'background.crop.y', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
        full(filterThumbs(null, 'doc')),
        ...filterSliders(T, 'background.filters'),
      ]) : null,
      sec('Pattern', [
        row('Pattern', selectCtl(T, 'background.pattern.type', Object.entries(R.PATTERNS))),
        row('Colour', colorCtl(T, 'background.pattern.color')),
        row('Size', num(T, 'background.pattern.size', { min: 4, max: 300, slider: true })),
        row('Line', num(T, 'background.pattern.thick', { min: 0.5, max: 12, step: 0.5, slider: true })),
        row('Opacity', num(T, 'background.pattern.opacity', { min: 0, max: 100, scale: 100, slider: true, unit: '%' })),
      ], bg.pattern && bg.pattern.type !== 'none'),
      sec('Finish', [
        row('Paper', num(T, 'background.texture', { min: 0, max: 100, slider: true })),
        row('Crumpled', num(T, 'background.crumple', { min: 0, max: 100, slider: true, def: 0 })),
        d.background.crumple ? full(h('button.btn', { onclick: () => S.change(T, 'background.crumpleSeed', Math.floor(Math.random() * 1e6)) }, ic('shuffle'), 'New creases')) : null,
        row('Film grain', num(T, 'overlay.grain', { min: 0, max: 100, slider: true })),
        row('Vignette', num(T, 'overlay.vignette', { min: 0, max: 100, slider: true })),
        row('Tint', colorCtl(T, 'overlay.tint')),
        row('Tint amt', num(T, 'overlay.tintAmount', { min: 0, max: 100, slider: true })),
        row('Paper on top', num(T, 'overlay.paper', { min: 0, max: 100, slider: true, def: 0 })),
        row('Poster folds', num(T, 'overlay.creases', { min: 0, max: 100, slider: true, def: 0 })),
        row('Light leak', num(T, 'overlay.leak', { min: 0, max: 100, slider: true, def: 0 })),
      ]),
      sec('Tips', [h('div.hint', { html: 'Drag to move · <span class="kbd">Shift</span> to lock an axis · <span class="kbd">Alt</span>-drag to duplicate · hold <span class="kbd">Ctrl</span> to skip snapping · <span class="kbd">E</span> eraser · <span class="kbd">Space</span>-drag to pan · double-click text to edit, photos to crop · paste images straight in with <span class="kbd">⌘V</span>.' })], false),
    ];
  }

  /* ───────────────────────── left panels ───────────────────────── */

  const panel = $('#panel');
  let tab = 'templates';
  function setTab(t) {
    tab = t;
    $$('#rail button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    renderPanel();
    if (t === 'background') S.select([]);
  }
  $('#rail').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    const narrow = matchMedia('(max-width: 920px)').matches;
    if (narrow && tab === b.dataset.tab && panel.classList.contains('open')) { panel.classList.remove('open'); return; }
    setTab(b.dataset.tab);
    if (narrow) { panel.classList.add('open'); insp.classList.remove('open'); }
  });

  function renderPanel() {
    const fn = { templates: templatesPanel, text: textPanel, stickers: stickersPanel, shapes: shapesPanel, photos: photosPanel, planner: plannerPanel, animate: animatePanel, background: backgroundPanel, layers: layersPanel }[tab];
    panel.replaceChildren(...fn().filter(Boolean));
    hydrateIcons(panel);
  }
  S.on('fonts', () => { if (tab === 'layers') renderPanel(); });

  function dragPayload(node, payload) {
    node.draggable = true;
    node.addEventListener('dragstart', e => { e.dataTransfer.setData('application/x-studio', JSON.stringify(payload)); e.dataTransfer.effectAllowed = 'copy'; });
  }
  S.on('dropPayload', (p, at) => {
    if (p.kind === 'sticker') addSticker(p.id, at);
    else if (p.kind === 'element') S.addElement(p.el, { at });
    else if (p.kind === 'asset') { const el = S.addImageFromAsset(p.id); S.changeEl(el, e => { e.x = at.x - e.width / 2; e.y = at.y - e.height / 2; }); }
  });

  // templates
  let tplTag = 'All';
  function templateCard(t, onPick, width = 260, opts = {}) {
    const thumb = h('div.thumb.skeleton', { style: { aspectRatio: `${t.width} / ${t.height}` } });
    const main = h('button.tpl-main', { onclick: () => onPick(t), title: opts.pieces ? `Use “${t.name}”` : t.name }, thumb, h('div.meta', null, t.name, h('small', null, `${t.width} × ${t.height}`)));
    const card = h('div.tpl', null, main,
      opts.pieces ? h('button.tpl-pieces', { title: `Browse the layers in “${t.name}” and add the ones you want`, onclick: () => openPieces(t) }, ic('layers'), 'Pieces') : null);
    docThumb('tpl:' + t.id, templateDoc(t), width).then(c => {
      const img = new Image();
      img.src = c.toDataURL('image/jpeg', 0.85);
      thumb.classList.remove('skeleton');
      thumb.replaceChildren(img);
    });
    return card;
  }
  // a template's measured document; built once so pieces and thumbnails agree
  const tplDocs = new Map();
  function templateDoc(t) {
    if (!tplDocs.has(t.id)) tplDocs.set(t.id, prepDoc(t.build()));
    return tplDocs.get(t.id);
  }

  // map template coordinates onto the current canvas: scale to fit, centre the template's frame
  function fitTemplate(t) {
    const d = S.doc, td = templateDoc(t);
    const k = Math.min(d.width / td.width, d.height / td.height);
    return { k, ox: (d.width - td.width * k) / 2, oy: (d.height - td.height * k) / 2 };
  }
  function pieceFor(t, src, at) {
    const { k, ox, oy } = fitTemplate(t);
    const el = S.clone(src);
    el.id = S.uid();
    if (k !== 1) S.scaleElement(el, k, k);
    el.x = src.x * k + ox; el.y = src.y * k + oy;
    if (at) { el.x = at.x - el.width / 2; el.y = at.y - el.height / 2; }
    return el;
  }
  function addTemplateLayers(t, els) {
    const list = (els || templateDoc(t).elements).map(e => pieceFor(t, e));
    S.addElements(list);
    toast(`Added ${list.length} layer${list.length > 1 ? 's' : ''} from “${t.name}”`);
  }
  function useTemplateBackground(t) {
    const td = templateDoc(t);
    S.doc.background = S.deepMerge(S.blankDoc(1, 1, '#fff').background, S.clone(td.background));
    S.doc.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, S.clone(td.overlay || {}));
    S.touchAll(); S.commit(); renderInspector();
    toast(`Using the background from “${t.name}”`);
  }
  function replaceWithTemplate(t) {
    closeModal();
    S.loadDoc(prepDoc(t.build()), null, { name: t.name });
    toast(`“${t.name}” loaded — make it yours`);
  }

  function useTemplate(t) {
    if (!S.doc.elements.length) { replaceWithTemplate(t); return; }
    const n = templateDoc(t).elements.length;
    const choice = (iconName, title, sub, run, primary) => h('button.big-btn' + (primary ? '.accent' : ''), { onclick: () => { closeModal(); run(); } },
      ic(iconName), h('div', null, h('b', { style: { display: 'block' } }, title), h('small', { style: { opacity: 0.8 } }, sub)));
    const box = modal([
      h('h1', { style: { fontSize: '22px' } }, `Use “${t.name}”`),
      h('p.lead', null, 'Your canvas already has a design. How do you want to use this template?'),
      choice('plus', 'Add to my design', `Adds its ${n} layers on top, scaled to fit. Your layers stay as they are.`, () => addTemplateLayers(t), true),
      choice('layers', 'Pick pieces', 'Browse its layers and add only the ones you want.', () => openPieces(t)),
      choice('palette', 'Use just its background', 'Swap in its backdrop, pattern and finish. Nothing else changes.', () => useTemplateBackground(t)),
      choice('replace', 'Replace my design', 'Start over with this template. You can undo with ⌘Z.', () => replaceWithTemplate(t)),
    ], { small: true });
    box.style.width = 'min(460px, 100%)';
    hydrateIcons(box);
  }

  // pieces view: every layer of one template as a tile you can click or drag onto the canvas
  let piecesOf = null;
  function openPieces(t) {
    closeModal();
    piecesOf = t.id;
    if (tab !== 'templates') setTab('templates'); else renderPanel();
    if (matchMedia('(max-width: 920px)').matches) panel.classList.add('open');
    panel.scrollTop = 0;
  }
  function piecesPanel(t) {
    const td = templateDoc(t);
    const grid = h('div.piece-grid');
    // background tile first
    const bgThumb = h('div.piece-thumb');
    docThumb('bg-of:' + t.id, Object.assign({}, td, { elements: [] }), 140).then(c => bgThumb.replaceChildren(c));
    grid.append(h('button.piece', { title: 'Use this background on your canvas', onclick: () => useTemplateBackground(t) }, bgThumb, h('span', null, 'Background')));
    td.elements.slice().reverse().forEach(src => {
      const demo = S.clone(src); demo.rotation = 0;
      const tile = h('button.piece', { title: 'Click to add · drag onto the canvas', onclick: () => { S.addElement(pieceFor(t, src), { center: false }); toast(`Added ${S.elLabel(src)}`); } },
        h('div.piece-thumb', null, elThumb(demo, 128, 96, 8)), h('span', null, S.elLabel(src)));
      tile.draggable = true;
      tile.addEventListener('dragstart', e => {
        const el = pieceFor(t, src);
        e.dataTransfer.setData('application/x-studio', JSON.stringify({ kind: 'element', el }));
        e.dataTransfer.effectAllowed = 'copy';
      });
      grid.append(tile);
    });
    return [
      h('button.back-link', { onclick: () => { piecesOf = null; renderPanel(); } }, ic('backward'), 'All templates'),
      h('h2', null, t.name),
      h('p.sub', null, `${td.elements.length} layers. Click one to add it where it sits in the template, or drag it to where you want it.`),
      h('div.btn-row', { style: { marginBottom: '12px' } },
        h('button.btn.primary', { onclick: () => addTemplateLayers(t) }, ic('plus'), 'Add all layers'),
        h('button.btn', { onclick: () => useTemplate(t) }, ic('layout'), 'More options')),
      grid,
    ];
  }

  function templatesPanel() {
    const T = window.STUDIO_TEMPLATES || [];
    if (piecesOf) { const t = T.find(x => x.id === piecesOf); if (t) return piecesPanel(t); piecesOf = null; }
    const tags = ['All', ...new Set(T.flatMap(t => t.tags || []))];
    const grid = h('div.tpl-grid');
    const draw = () => { grid.replaceChildren(...T.filter(t => tplTag === 'All' || (t.tags || []).includes(tplTag)).map(t => templateCard(t, useTemplate, 260, { pieces: true }))); hydrateIcons(grid); };
    const chips = h('div.chips');
    const drawChips = () => chips.replaceChildren(...tags.map(tg => h('button.chip' + (tg === tplTag ? '.on' : ''), { onclick: () => { tplTag = tg; drawChips(); draw(); } }, tg)));
    drawChips(); draw();
    return [h('h2', null, 'Templates'), h('p.sub', null, 'Use a whole template, add it to your design, or open its Pieces to grab single layers.'), chips, grid];
  }

  // text
  function addText(over) {
    const el = S.mk('text', over);
    const added = S.addElement(el);
    return added;
  }
  S.on('addText', () => addText({ text: 'Your text', fontSize: Math.round(S.doc.width * 0.08) }));
  function textPanel() {
    const W = S.doc.width;
    const presets = window.STUDIO_TEXT_PRESETS || [];
    const grid = h('div.preset-grid');
    for (const p of presets) {
      const el = S.mk('text', S.clone(p.el));
      S.autosize(el, false);
      const c = elThumb(el, 128, 64, 12);
      const tile = h('button.preset' + (p.dark ? '.dark' : ''), { title: p.name, onclick: () => { const e = S.clone(p.el); scaleTextPreset(e, W / 1080); addText(e); } }, c);
      const payload = S.clone(p.el); scaleTextPreset(payload, W / 1080);
      dragPayload(tile, { kind: 'element', el: S.mk('text', payload) });
      grid.append(tile);
    }
    return [
      h('h2', null, 'Text'),
      h('button.big-btn', { onclick: () => addText({ text: 'Add a heading', fontFamily: 'Instrument Serif', fontSize: Math.round(W * 0.11) }), style: { fontFamily: '"Instrument Serif"', fontSize: '28px' } }, 'Add a heading'),
      h('button.big-btn', { onclick: () => addText({ text: 'Add a subheading', fontFamily: 'Bricolage Grotesque', fontWeight: 600, fontSize: Math.round(W * 0.05) }), style: { fontFamily: '"Bricolage Grotesque"', fontWeight: 600, fontSize: '18px' } }, 'Add a subheading'),
      h('button.big-btn', { onclick: () => addText({ text: 'Add a little body text', fontFamily: 'Instrument Sans', fontSize: Math.round(W * 0.032), lineHeight: 1.35 }), style: { fontFamily: '"Instrument Sans"', fontSize: '14px' } }, 'Add a little body text'),
      h('button.big-btn', { onclick: () => S.addElement(S.mk('badge', { width: W * 0.3, height: W * 0.3 })), style: { fontSize: '14px' } }, ic('sparkle'), 'Add circular text badge'),
      h('h3', null, 'Your fonts'),
      F.customFamilies().length
        ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, F.customFamilies().map(fam => h('button.big-btn', {
          style: { fontFamily: `"${fam}", sans-serif`, fontSize: '20px', marginBottom: 0 },
          onclick: () => { const meta = F.BY_NAME[fam]; addText({ text: fam, fontFamily: fam, fontWeight: meta && meta.weights.includes(500) ? 500 : F.nearestWeight(fam, 400), fontSize: Math.round(W * 0.08) }); },
        }, fam)))
        : h('p.hint', null, 'Upload fonts you own (or a .zip of them). They stay in this browser and are saved inside project files.'),
      h('button.btn', { style: { marginTop: '8px', width: '100%' }, onclick: () => pickFonts(() => renderPanel()) }, ic('upload'), 'Upload fonts'),
      h('h3', null, 'Text styles'),
      h('p.sub', null, 'Click to add or drag onto the canvas.'),
      grid,
    ];
  }
  function scaleTextPreset(e, s) {
    if (e.fontSize) e.fontSize = Math.round(e.fontSize * s);
    if (e.bg) for (const k of ['padX', 'padY', 'gap', 'radius', 'borderWidth']) if (e.bg[k]) e.bg[k] *= s;
    if (e.stroke && e.stroke.width) e.stroke.width *= s;
  }

  // stickers
  let stkCat = 'All', stkQuery = '';
  const svgUrlCache = new Map();
  function stickerUrl(def) { let u = svgUrlCache.get(def.id); if (!u) { u = R.svgDataUrl(def.svg(def.colors)); svgUrlCache.set(def.id, u); } return u; }
  function addSticker(id, at) {
    const def = R.stickerDef(id);
    if (!def) return;
    if (def.neck) { addFigure(def, at); return; }
    const base = Math.min(S.doc.width, S.doc.height) * 0.24;
    const s = base / Math.max(def.w, def.h);
    const el = S.mk('sticker', { stickerId: id, colors: def.colors.slice(), width: def.w * s, height: def.h * s });
    S.addElement(el, at ? { at } : {});
  }
  // big-head figure: an outfit body plus an oversized face slot sitting on its neck
  function figureEls(def, at, scale = 1) {
    const H = Math.min(S.doc.width, S.doc.height) * 0.42 * scale, k = H / def.h;
    const bw = def.w * k, bh = H;
    const cx = at ? at.x : S.doc.width / 2, cy = at ? at.y : S.doc.height / 2 + bh * 0.12;
    const bx = cx - bw / 2, by = cy - bh / 2;
    const body = S.mk('sticker', { stickerId: def.id, colors: def.colors.slice(), x: bx, y: by, width: bw, height: bh, name: def.name });
    const nx = bx + def.neck[0] * k, ny = by + def.neck[1] * k;
    const hw = bw * 0.66, hh = hw * 1.18;
    const head = S.mk('image', {
      x: nx - hw / 2, y: ny - hh * 0.92, width: hw, height: hh, name: 'Face — add a selfie, then Remove background',
      frame: { style: 'circle', size: 0 }, placeholder: ['#ecd2bb', '#c99d7d'],
    });
    return [body, head];
  }
  function addFigure(def, at) {
    S.addElements(figureEls(def, at));
    if (!S.settings.faceTipShown) {
      S.settings.faceTipShown = true; S.saveSettings();
      toast('Double-click the face circle to add a selfie, then press Remove background');
    }
  }
  S.figureEls = figureEls;
  // a selfie dropped into a face slot is cut out straight away
  S.on('replaced', el => {
    if (el && el.type === 'image' && /^Face/.test(el.name || '') && S.removeBackground) {
      toast('Cutting out the face…');
      S.removeBackground(el.id, 'replace');
    }
  });

  function stickersPanel() {
    const all = window.STICKERS || [];
    const cats = ['All', ...new Set(all.map(s => s.cat))];
    const search = h('input.search', { placeholder: 'Search stickers', value: stkQuery });
    const chips = h('div.chips');
    const body = h('div');
    const draw = () => {
      chips.replaceChildren(...cats.map(c => h('button.chip' + (c === stkCat ? '.on' : ''), { onclick: () => { stkCat = c; draw(); } }, c)));
      const q = stkQuery.trim().toLowerCase();
      const list = all.filter(s => (stkCat === 'All' || s.cat === stkCat) && (!q || s.name.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q) || s.id.includes(q)));
      const groups = new Map();
      for (const s of list) { if (!groups.has(s.cat)) groups.set(s.cat, []); groups.get(s.cat).push(s); }
      body.replaceChildren(...[...groups].flatMap(([cat, items]) => [
        h('h3', null, cat),
        h('div.stk-grid', null, items.map(s => {
          const b = h('button.stk' + (/chalk|star-outline|paper-plane|polaroid|tape-clear|sparkle-outline|smiley-chain|px-cursor|px-hand|cloud-/i.test(s.id) ? '.dark' : ''), { title: s.name, onclick: () => addSticker(s.id) }, h('img', { src: stickerUrl(s), alt: s.name, loading: 'lazy' }));
          dragPayload(b, { kind: 'sticker', id: s.id });
          return b;
        })),
      ]));
      if (!list.length) body.append(h('p.hint', null, 'No stickers match.'));
    };
    search.addEventListener('input', () => { stkQuery = search.value; draw(); });
    draw();
    const hasOutfits = all.some(st => st.neck);
    return [h('h2', null, 'Stickers'), search, chips,
      hasOutfits && (stkCat === 'All' || /^Outfits/.test(stkCat)) ? h('p.hint', { style: { margin: '8px 0 0' } }, 'Outfits come with a face slot on top — add a selfie to it and press Remove background for the big-head look.') : null,
      body];
  }

  // shapes
  function shapesPanel() {
    const W = S.doc.width;
    const colors = ['#7fa88a', '#f7d046', '#ff8a3d', '#c9b6f2', '#ff7ab6', '#5aa9e6', '#d7ef5a', '#e84a5f'];
    let ci = 0;
    const grid = h('div.shape-grid');
    for (const [k, s] of Object.entries(R.SHAPES)) {
      if (k === 'line') continue;
      const fill = colors[ci++ % colors.length];
      const make = () => {
        const sz = W * 0.3;
        const w = ['pill', 'ticket', 'arrow', 'parallelogram', 'speech', 'torn'].includes(k) ? sz * 1.5 : sz;
        const hh = k === 'halfcircle' ? sz / 2 : k === 'arch' ? sz * 1.3 : ['pill', 'ticket', 'arrow', 'parallelogram'].includes(k) ? sz * 0.55 : sz;
        return S.mk('shape', { shape: k, fill, width: w, height: hh, radius: k === 'rounded' ? sz * 0.16 : k === 'ticket' ? 18 : 0, points: k === 'burst' ? 18 : k === 'scallop' ? 16 : k === 'flower' ? 8 : 5, inner: k === 'burst' ? 0.8 : 0.48, depth: k === 'flower' ? 0.28 : 0.08, texture: k === 'torn' ? 30 : 0 });
      };
      const demo = make();
      const tile = h('button.stk', { title: s.label, onclick: () => S.addElement(make()) }, elThumb(demo, 54, 54, 6));
      dragPayload(tile, { kind: 'element', el: make() });
      grid.append(tile);
    }
    const lines = h('div.shape-grid');
    const lineDefs = [
      ['Line', {}], ['Arrow', { arrowEnd: true }], ['Double arrow', { arrowEnd: true, arrowStart: true }], ['Dashed', { dash: 2 }],
      ['Wavy', { wavy: true }], ['Wavy arrow', { wavy: true, arrowEnd: true }], ['Dotted', { dash: 0.5 }], ['Thick', { strokeWidth: 18 }],
    ];
    for (const [name, o] of lineDefs) {
      const make = () => S.mk('shape', Object.assign({ shape: 'line', stroke: '#1d1b18', strokeWidth: 8, width: W * 0.4, height: 60 }, o));
      const tile = h('button.stk', { title: name, onclick: () => S.addElement(make()) }, elThumb(make(), 54, 40, 4));
      dragPayload(tile, { kind: 'element', el: make() });
      lines.append(tile);
    }
    const papers = window.STUDIO_PAPER_PRESETS || [];
    const pgrid = h('div.preset-grid');
    for (const p of papers) {
      const make = () => S.mk('shape', S.clone(p.el(W)));
      const tile = h('button.preset', { title: p.name, onclick: () => S.addElement(make()) }, elThumb(make(), 120, 80, 14), h('div.hint', null, p.name));
      dragPayload(tile, { kind: 'element', el: make() });
      pgrid.append(tile);
    }
    return [h('h2', null, 'Shapes'), h('h3', null, 'Basic shapes'), grid, h('h3', null, 'Lines & arrows'), lines, h('h3', null, 'Paper & cards'), pgrid];
  }

  // photos
  function photosPanel() {
    const W = S.doc.width;
    const dz = h('div.drop-zone', null, h('div', { style: { fontWeight: 650, color: 'var(--ink)', marginBottom: '4px' } }, 'Drop photos here'), 'or ', h('a', { href: '#', onclick: e => { e.preventDefault(); S.pickImages({ uploadOnly: false }); } }, 'browse your files'), h('div.hint', { style: { marginTop: '6px' } }, 'You can also paste an image with ⌘V'));
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); S.importFiles([...e.dataTransfer.files], { uploadOnly: true }); });
    const ups = h('div.upl-grid', null, S.uploads.filter(id => S.assets[id]).map(id => {
      const b = h('button.upl', { title: 'Add to canvas', onclick: () => S.addImageFromAsset(id) }, h('img', { src: S.assets[id], alt: '' }),
        h('span.upl-bg', { onclick: e => { e.stopPropagation(); S.setBackgroundImage(id); toast('Set as background'); } }, 'Use as bg'));
      dragPayload(b, { kind: 'asset', id });
      return b;
    }));
    const frames = h('div.frame-grid');
    const sel = S.selEls();
    const target = sel.length === 1 && sel[0].type === 'image' ? sel[0] : null;
    const tints = [['#e7e1d4', '#cfc5b1'], ['#f3d9d0', '#e3b4a6'], ['#d8e4d2', '#b4c9aa'], ['#dad6ef', '#b9b2de'], ['#f4e6c2', '#e6cf93'], ['#d3e3ee', '#a9c6db']];
    let ti = 0;
    for (const [k, l] of Object.entries(R.FRAMES)) {
      const tint = tints[ti++ % tints.length];
      const make = () => {
        const sz = W * 0.42;
        const bordered = ['polaroid', 'stamp', 'film', 'torn', 'border'].includes(k);
        return S.mk('image', {
          width: sz, height: k === 'polaroid' ? sz * 1.2 : k === 'arch' ? sz * 1.3 : k === 'film' ? sz * 0.8 : sz,
          placeholder: tint,
          frame: { style: k, color: k === 'film' ? '#1d1b18' : k === 'stamp' ? '#9ab83e' : '#ffffff', size: bordered ? Math.round(sz * 0.05) : 0, radius: k === 'rounded' ? sz * 0.08 : 0 },
          shadow: bordered ? { on: true, color: '#000000', opacity: 0.22, blur: 26, x: 0, y: 12 } : undefined,
        });
      };
      const demo = make();
      const tile = h('button.frame-tile', {
        title: target ? `Apply ${l} frame to the selected photo` : `Add ${l} photo frame`,
        onclick: () => {
          if (target) {
            S.changeEl(target, e => { const n = make(); e.frame = n.frame; e.frame.size = ['polaroid', 'stamp', 'film', 'torn', 'border'].includes(k) ? Math.round(Math.min(e.width, e.height) * 0.05) : 0; if (k === 'polaroid') e.height = Math.max(e.height, e.width * 1.18); });
            renderInspector();
          } else S.addElement(make());
        },
      }, elThumb(demo, 56, 56, 2), l);
      if (!target) dragPayload(tile, { kind: 'element', el: make() });
      frames.append(tile);
    }
    const layouts = (window.STUDIO_PHOTO_LAYOUTS || []).map(L => h('button.big-btn', { onclick: () => S.addElements(L.build(S.doc).map(e => S.mk(e.type, e))) }, ic('layout'), L.name));
    return [
      h('h2', null, 'Photos'),
      dz,
      h('div.btn-row', { style: { marginTop: '8px' } },
        h('button.btn', { onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), 'Photo as background'),
        h('button.btn', { onclick: () => S.addElement(S.mk('image', { width: W * 0.5, height: W * 0.5 })) }, ic('plus'), 'Empty frame')),
      S.uploads.length ? h('h3', null, 'Your uploads') : null,
      S.uploads.length ? ups : null,
      h('h3', null, target ? 'Frames — applies to selected photo' : 'Photo frames'),
      frames,
      layouts.length ? h('h3', null, 'Collage layouts') : null,
      ...layouts,
    ];
  }
  S.on('uploads', () => { if (tab === 'photos') renderPanel(); });
  S.on('bgremove', stage => { if (stage === 'start' || stage === 'end') { renderInspector(); quickBar(); hydrateIcons(S.quickBar); } });

  // planner
  function plannerPanel() {
    const W = S.doc.width;
    const presets = window.STUDIO_PLANNER_PRESETS || [];
    const groups = new Map();
    for (const p of presets) { if (!groups.has(p.group)) groups.set(p.group, []); groups.get(p.group).push(p); }
    const out = [h('h2', null, 'Calendar & planner'), h('p.sub', null, 'Month grids, week strips, tear-off dates, checklists and circular badges.')];
    for (const [g, items] of groups) {
      out.push(h('h3', null, g));
      const grid = h('div.preset-grid');
      for (const p of items) {
        const make = () => S.mk(p.el.type, S.clone(p.el), W);
        const demoEl = make();
        scaleTo(demoEl, W);
        const tile = h('button.preset' + (p.dark ? '.dark' : ''), { title: p.name, onclick: () => { const e = make(); scaleTo(e, W); S.addElement(e); } }, elThumb(demoEl, 128, 96, 6), h('div.hint', null, p.name));
        const de = make(); scaleTo(de, W);
        dragPayload(tile, { kind: 'element', el: de });
        grid.append(tile);
      }
      out.push(grid);
    }
    return out;
  }
  function scaleTo(e, W) {
    const s = W / 1080;
    if (s === 1) return;
    e.width *= s; e.height *= s;
    if (e.fontSize) e.fontSize *= s;
  }

  // background
  function backgroundPanel() {
    const bgs = window.STUDIO_BACKGROUNDS || [];
    const sw = h('div.color-row', null, PALETTE.map(c => h('button', { style: { background: c }, title: c, onclick: () => { S.change('doc', 'background.gradient', 'none', true); S.change('doc', 'background.color', c); renderInspector(); } })));
    const grads = h('div.color-row', null, GRADIENTS.map(([a, b, t, ang]) => h('button', {
      style: { background: t === 'radial' ? `radial-gradient(${a}, ${b})` : `linear-gradient(${ang}deg, ${a}, ${b})` },
      onclick: () => { S.changeEl(S.doc, () => {}, true); Object.assign(S.doc.background, { color: a, color2: b, gradient: t, angle: ang }); S.touchAll(); S.commit(); renderInspector(); },
    })));
    const grid = h('div.tpl-grid');
    for (const b of bgs) {
      const d = prepDoc({ width: 300, height: 300, background: b.bg, overlay: b.overlay || {}, elements: [] });
      const thumb = h('div.thumb', { style: { aspectRatio: '1' } });
      docThumb('bg:' + b.name, d, 150).then(c => thumb.replaceChildren(c));
      grid.append(h('button.tpl', {
        onclick: () => {
          const keepImg = S.doc.background.assetId;
          S.doc.background = S.deepMerge(S.blankDoc(1, 1, '#fff').background, S.clone(b.bg));
          if (keepImg && b.keepPhoto) S.doc.background.assetId = keepImg;
          S.doc.overlay = S.deepMerge(S.blankDoc(1, 1, '#fff').overlay, S.clone(b.overlay || {}));
          S.touchAll(); S.commit(); renderInspector();
        },
      }, thumb, h('div.meta', null, b.name)));
    }
    return [
      h('h2', null, 'Canvas'),
      h('p.sub', null, 'Pick a backdrop, then fine-tune it on the right.'),
      h('div.btn-row', null,
        h('button.btn', { onclick: () => openSizeModal() }, ic('resize'), 'Resize canvas'),
        h('button.btn', { onclick: () => S.pickImages({ asBackground: true }) }, ic('bgimg'), 'Photo')),
      h('h3', null, 'Colours'), sw,
      h('h3', null, 'Gradients'), grads,
      h('h3', null, 'Paper, patterns & mats'), grid,
    ];
  }

  // layers
  let dragLayer = null;
  function layersPanel() {
    const els = S.doc.elements.slice().reverse();
    const list = h('div.layers');
    const sel = new Set(S.sel);
    for (const el of els) {
      const thumbEl = S.clone(el); thumbEl.rotation = 0; thumbEl.shadow = { on: false };
      const nameSpan = h('span', null, S.elLabel(el));
      const item = h('div.layer' + (sel.has(el.id) ? '.sel' : '') + (el.hidden ? '.hidden-el' : ''), {
        draggable: true,
        onclick: e => { if (e.target.closest('.lbtn')) return; if (e.shiftKey || e.metaKey) S.toggleSelect(el.id); else S.select([el.id]); },
        onmouseenter: () => S.hover(el.id), onmouseleave: () => S.hover(null),
        ondblclick: e => {
          if (e.target.closest('.lbtn')) return;
          const inp = h('input', { value: el.name || S.elLabel(el) });
          nameSpan.replaceChildren(inp); inp.focus(); inp.select();
          const done = () => { S.changeEl(el, x => { x.name = inp.value.trim(); }); renderPanel(); };
          inp.addEventListener('blur', done); inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') inp.blur(); ev.stopPropagation(); });
        },
      },
      h('div.lthumb', null, elThumb(thumbEl, 30, 30, 2)),
      h('div.lname', null, nameSpan, h('div.ltype', null, typeLabel(el))),
      h('button.lbtn' + (el.locked ? '.on' : ''), { title: el.locked ? 'Unlock' : 'Lock', onclick: () => S.toggleLock([el.id]) }, ic(el.locked ? 'lock' : 'unlock')),
      h('button.lbtn' + (el.hidden ? '' : '.on'), { title: el.hidden ? 'Show' : 'Hide', onclick: () => S.toggleHidden(el.id) }, ic(el.hidden ? 'eyeOff' : 'eye')));
      item.addEventListener('dragstart', e => { dragLayer = el.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', el.id); });
      item.addEventListener('dragover', e => {
        if (!dragLayer) return;
        e.preventDefault();
        const r = item.getBoundingClientRect(), top = e.clientY < r.top + r.height / 2;
        item.classList.toggle('drag-over-top', top); item.classList.toggle('drag-over-bottom', !top);
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over-top', 'drag-over-bottom'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over-top', 'drag-over-bottom');
        if (!dragLayer || dragLayer === el.id) return;
        const r = item.getBoundingClientRect(), top = e.clientY < r.top + r.height / 2;
        const arr = S.doc.elements.filter(x => x.id !== dragLayer);
        let idx = arr.findIndex(x => x.id === el.id);
        if (top) idx += 1; // list is reversed: "above" means a higher index
        S.moveLayer(dragLayer, idx);
        dragLayer = null;
      });
      list.append(item);
    }
    return [
      h('h2', null, 'Layers'),
      h('p.sub', null, 'Top of the list is the front. Drag to reorder, double-click to rename.'),
      els.length ? list : h('p.hint', null, 'Nothing here yet — add text, stickers or photos.'),
      h('h3', null, 'Background'),
      h('div.layer', { onclick: () => { S.select([]); setTab('background'); } }, h('div.lthumb', { style: { background: S.doc.background.color } }), h('div.lname', null, 'Canvas background', h('div.ltype', null, `${S.doc.width} × ${S.doc.height}`))),
    ];
  }

  /* ───────────────────────── quick bar & context menu ───────────────────────── */

  function quickBar() {
    const q = S.quickBar;
    const els = S.selEls();
    if (!els.length) { q.replaceChildren(); return; }
    const el = els[0];
    const b = (i, t, fn) => h('button', { title: t, onclick: fn }, ic(i));
    const kids = [];
    if (els.length === 1 && el.type === 'text' && !el.locked) kids.push(b('edit', 'Edit text', () => S.startTextEdit(el.id)));
    if (els.length === 1 && el.type === 'image' && !el.locked) {
      kids.push(b('replace', el.assetId ? 'Replace photo' : 'Add photo', () => S.pickImages({ replaceId: el.id })));
      if (el.assetId) kids.push(b('crop', 'Crop', () => S.startCrop(el.id)));
      if (el.assetId && !el.bgRemoved) kids.push(b('wand', 'Remove background', () => S.removeBackground(el.id, 'replace')));
    }
    if (kids.length) kids.push(h('div.sep'));
    kids.push(b('copy', 'Duplicate (⌘D)', () => S.duplicate()), b(el.locked ? 'unlock' : 'lock', el.locked ? 'Unlock' : 'Lock', () => S.toggleLock()),
      b('front', 'Bring to front', () => S.order('front')), b('trash', 'Delete', () => S.removeSelected()),
      b('more', 'More', e => contextMenu({ x: e.clientX, y: e.clientY })));
    q.replaceChildren(...kids);
  }
  function contextMenu(at) {
    const els = S.selEls();
    if (!els.length) {
      menu(at, [
        { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => S.paste(), disabled: !S.hasClipboard() },
        { label: 'Select all', icon: 'layers', kbd: '⌘A', run: () => S.selectAll() },
        '-',
        { label: 'Add text', icon: 'type', kbd: 'T', run: () => S.emit('addText') },
        { label: 'Add photo', icon: 'image', run: () => S.pickImages({}) },
        { label: 'Canvas settings', icon: 'palette', run: () => setTab('background') },
      ]);
      return;
    }
    const el = els[0];
    const items = [];
    if (els.length === 1 && el.type === 'text') items.push({ label: 'Edit text', icon: 'edit', kbd: '↵', run: () => S.startTextEdit(el.id) });
    if (els.length === 1 && el.type === 'image') {
      items.push({ label: el.assetId ? 'Replace photo' : 'Add photo', icon: 'replace', run: () => S.pickImages({ replaceId: el.id }) });
      if (el.assetId) items.push({ label: 'Crop', icon: 'crop', run: () => S.startCrop(el.id) }, { label: 'Use as background', icon: 'bgimg', run: () => S.setBackgroundImage(el.assetId) });
      if (el.assetId && !el.bgRemoved) items.push({ label: 'Remove background', icon: 'wand', run: () => S.removeBackground(el.id, 'replace') }, { label: 'Cut out subject to a layer', icon: 'layers', run: () => S.removeBackground(el.id, 'layer') });
      if (el.bgRemoved) items.push({ label: 'Restore background', icon: 'undo', run: () => S.restoreBackground(el.id) });
    }
    if (items.length) items.push('-');
    items.push(
      { label: 'Duplicate', icon: 'copy', kbd: '⌘D', run: () => S.duplicate() },
      { label: 'Copy', icon: 'copy', kbd: '⌘C', run: () => S.copy() },
      { label: 'Paste', icon: 'paste', kbd: '⌘V', run: () => S.paste(), disabled: !S.hasClipboard() },
      '-',
      { label: 'Bring to front', icon: 'front', kbd: '⇧⌘]', run: () => S.order('front') },
      { label: 'Bring forward', icon: 'forward', kbd: '⌘]', run: () => S.order('forward') },
      { label: 'Send backward', icon: 'backward', kbd: '⌘[', run: () => S.order('backward') },
      { label: 'Send to back', icon: 'back', kbd: '⇧⌘[', run: () => S.order('back') },
      '-',
      { label: 'Centre on canvas', icon: 'guides', run: () => { S.align('hcenter'); S.align('vcenter'); } },
      { label: el.locked ? 'Unlock' : 'Lock', icon: el.locked ? 'unlock' : 'lock', kbd: '⌘L', run: () => S.toggleLock() },
      { label: 'Hide', icon: 'eyeOff', run: () => els.forEach(e => S.toggleHidden(e.id)) },
      { label: 'Delete', icon: 'trash', kbd: '⌫', run: () => S.removeSelected() },
    );
    menu(at, items);
  }
  S.on('contextmenu', (x, y) => contextMenu({ x, y }));
  S.on('quick', () => { quickBar(); hydrateIcons(S.quickBar); });

  /* ───────────────────────── top bar ───────────────────────── */

  function updateTop() {
    $('#btn-undo').disabled = !S.canUndo();
    $('#btn-redo').disabled = !S.canRedo();
    $('#tg-grid').classList.toggle('on', S.settings.grid);
    $('#tg-snapgrid').classList.toggle('on', S.settings.snapGrid);
    $('#tg-guides').classList.toggle('on', S.settings.guides);
    $('#gridsize-label').textContent = S.settings.gridSize;
    $('#size-label').textContent = `${S.doc.width} × ${S.doc.height}`;
    $('#btn-zoom-fit').textContent = Math.round(S.view.scale * 100) + '%';
  }
  $('#btn-undo').onclick = () => S.undo();
  $('#btn-redo').onclick = () => S.redo();
  $('#tg-grid').onclick = () => { S.settings.grid = !S.settings.grid; S.saveSettings(); S.redraw(); updateTop(); };
  $('#tg-snapgrid').onclick = () => { S.settings.snapGrid = !S.settings.snapGrid; if (S.settings.snapGrid) S.settings.grid = true; S.saveSettings(); S.redraw(); updateTop(); toast(S.settings.snapGrid ? 'Snapping to the grid' : 'Grid snapping off'); };
  $('#tg-guides').onclick = () => { S.settings.guides = !S.settings.guides; S.saveSettings(); updateTop(); toast(S.settings.guides ? 'Smart guides on' : 'Smart guides off (canvas edges & centre still snap)'); };
  $('#btn-gridsize').onclick = e => menu(e.currentTarget, [10, 20, 30, 40, 60, 80, 108, 120].map(g => ({ label: `${g}px grid`, icon: S.settings.gridSize === g ? 'check' : 'grid', run: () => { S.settings.gridSize = g; S.settings.grid = true; S.saveSettings(); S.redraw(); updateTop(); } })));
  $('#btn-zoom-in').onclick = () => S.zoomBy(1.2);
  $('#btn-zoom-out').onclick = () => S.zoomBy(1 / 1.2);
  $('#btn-zoom-fit').onclick = () => S.fit();
  $('#btn-size').onclick = () => openSizeModal();
  $('#btn-export').onclick = () => openExport();
  $('#btn-home').onclick = () => openHome();
  $('#btn-help').onclick = () => openHelp();
  $('#btn-project').onclick = e => menu(e.currentTarget, [
    { label: 'Save project file', icon: 'download', run: saveProject },
    { label: 'Open project file…', icon: 'folder', run: () => { $('#project-input').value = ''; $('#project-input').click(); } },
    '-',
    { label: 'Export image…', icon: 'image', kbd: '⌘E', run: openExport },
  ]);
  const nameInput = $('#doc-name');
  nameInput.addEventListener('input', () => { S.docName = nameInput.value || 'Untitled design'; S.scheduleSave(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') nameInput.blur(); e.stopPropagation(); });
  S.on('name', () => { nameInput.value = S.docName; });
  S.on('history', updateTop);
  S.on('view', updateTop);
  S.on('settings', updateTop);
  S.on('help', () => openHelp());
  S.on('export', () => openExport());

  function slug() { return (S.docName || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design'; }
  // Embedded hosts (the shared Claude link) block page-started downloads but
  // offer a confirmed save; everywhere else a plain download link is used.
  let dlCap = null;
  function downloadsCap() {
    if (!dlCap) dlCap = window.claude && typeof window.claude.use === 'function' ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
    return dlCap;
  }
  downloadsCap();
  async function download(blob, name) {
    const dl = await downloadsCap();
    if (dl) {
      try { await dl.save({ filename: name, data: blob }); return 'saved'; }
      catch (e) {
        const code = e && e.code;
        if (code === 'declined') { toast('Save cancelled'); return 'declined'; }
        if (code === 'rate_limited') { toast('A save prompt is already open'); return 'busy'; }
        if (code === 'too_large') { toast('That file is too large to save here — try a smaller size'); return 'failed'; }
        // anything else: fall back to an ordinary download below
      }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'started';
  }
  function saveProject() {
    const blob = new Blob([JSON.stringify(S.projectData())], { type: 'application/json' });
    download(blob, slug() + '.studio.json').then(r => { if (r === 'saved' || r === 'started') toast('Project file saved'); });
  }
  $('#project-input').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.doc) throw new Error('bad');
      if (data.fonts && data.fonts.length) { await F.unpackFamilies(data.fonts); R.fontsVersion++; }
      S.uploads.splice(0, S.uploads.length, ...(data.uploads || []));
      S.loadDoc(data.doc, data.assets || {}, { name: data.name || f.name.replace(/\.studio\.json$|\.json$/, '') });
      toast('Project opened');
    } catch (err) { toast('That file isn’t a Collage Studio project'); }
  });

  /* ───────────────────────── dialogs ───────────────────────── */

  const SIZES = [
    ['Square post', 1080, 1080], ['Portrait post', 1080, 1350], ['Story / Reel', 1080, 1920], ['Landscape', 1920, 1080],
    ['Pinterest pin', 1000, 1500], ['A4 poster', 1240, 1754], ['X / Twitter', 1600, 900], ['Wallpaper', 1170, 2532],
  ];
  function sizeTiles(cur, onPick) {
    return h('div.size-grid', null, SIZES.map(([n, w, hh]) => {
      const s = 30 / Math.max(w, hh);
      return h('button.size-opt' + (cur && cur[0] === w && cur[1] === hh ? '.on' : ''), { onclick: e => { $$('.size-opt', e.currentTarget.parentNode).forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); onPick(w, hh); } },
        h('div.ratio', { style: { width: w * s + 'px', height: hh * s + 'px' } }), n, h('small', null, `${w}×${hh}`));
    }));
  }
  function openSizeModal() {
    let W = S.doc.width, H = S.doc.height, scale = true;
    const wIn = h('input', { type: 'text', value: W }), hIn = h('input', { type: 'text', value: H });
    const box = modal([
      h('h1', null, 'Canvas size'),
      h('p.lead', null, 'Pick a format or type your own. Elements can scale with the canvas.'),
      sizeTiles([W, H], (w, hh) => { W = w; H = hh; wIn.value = w; hIn.value = hh; }),
      h('div.custom-size', null, h('div.num', null, h('span.lbl', null, 'W'), wIn, h('span.unit', null, 'px')), '×', h('div.num', null, h('span.lbl', null, 'H'), hIn, h('span.unit', null, 'px'))),
      h('div.toggle-row', { style: { marginTop: '12px' } }, h('label', null, 'Scale elements to fit the new size'), (() => { const s = h('button.switch.on', { onclick: () => { scale = !scale; s.classList.toggle('on', scale); } }); return s; })()),
      h('div.btn-row', { style: { marginTop: '16px' } }, h('button.btn', { onclick: closeModal }, 'Cancel'), h('button.btn.primary', {
        onclick: () => {
          const w = clamp(parseInt(wIn.value, 10) || W, 64, 6000), hh = clamp(parseInt(hIn.value, 10) || H, 64, 6000);
          closeModal(); S.resizeCanvas(w, hh, scale); updateTop();
        },
      }, 'Apply')),
    ], { small: true });
    box.style.width = 'min(560px, 100%)';
  }

  function openHome(first) {
    let W = 1080, H = 1350, color = '#f6f1e7';
    const colors = ['#ffffff', '#f6f1e7', '#efe6d2', '#1f5a4a', '#1d1b18', '#f7b4c8', '#c9b6f2', '#d7ef5a', '#9ad1f5', '#ff8a3d'];
    const crow = h('div.color-row', null, colors.map(c => h('button' + (c === color ? '.on' : ''), { style: { background: c }, onclick: e => { color = c; $$('button', crow).forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); } })));
    const pd = h('div.photo-drop', { onclick: () => { closeModal(); S.pickImages({ startFromPhoto: true }); } },
      h('div', { style: { marginBottom: '6px' } }, ic('upload')), h('b', null, 'Choose a photo'), h('div.hint', null, 'or drop it here — the canvas takes its shape'));
    pd.addEventListener('dragover', e => { e.preventDefault(); pd.classList.add('over'); });
    pd.addEventListener('dragleave', () => pd.classList.remove('over'));
    pd.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); closeModal(); S.importFiles([...e.dataTransfer.files], { startFromPhoto: true }); });
    const tpls = h('div.home-tpls', null, (window.STUDIO_TEMPLATES || []).map(t => templateCard(t, tt => { closeModal(); S.loadDoc(prepDoc(tt.build()), null, { name: tt.name }); }, 220)));
    const resumeSlot = h('div');
    const kids = [
      h('h1', { html: 'What are we <em>making</em> today?' }),
      h('p.lead', null, 'Start blank, start from a photo, or remix a template. Everything is layered and editable.'),
      resumeSlot,
      h('div.home-cols', null,
        h('div.home-card', null, h('h3', null, 'Blank canvas'), h('p', null, 'Choose a size and a starting colour.'),
          sizeTiles([W, H], (w, hh) => { W = w; H = hh; }), crow,
          h('button.btn.primary', { style: { width: '100%', height: '38px' }, onclick: () => { closeModal(); S.newDoc(W, H, color); updateTop(); } }, 'Create blank design')),
        h('div.home-card', null, h('h3', null, 'Start from a photo'), h('p', null, 'Your photo becomes the background; add stickers and type on top.'), pd)),
      h('h3', { style: { margin: '0 0 12px', fontSize: '15px' } }, 'Templates'),
      tpls,
    ];
    modal(kids, { closable: !first });
    S.loadAutosave().then(save => {
      if (!save || !save.doc || !save.doc.elements) return;
      const c = h('canvas');
      const btn = h('button.resume', { onclick: () => { closeModal(); resumeFrom(save); } }, c, h('div', null, h('b', null, 'Continue where you left off'), h('span', null, `${save.name || 'Untitled design'} · ${new Date(save.savedAt).toLocaleString()}`)));
      resumeSlot.append(btn);
      R.setAssets(Object.assign(S.assets, save.assets || {}));
      docThumb('resume:' + save.savedAt, prepDoc(save.doc), 128).then(t => { c.width = t.width; c.height = t.height; c.getContext('2d').drawImage(t, 0, 0); });
    });
  }
  function resumeFrom(save) {
    S.uploads.splice(0, S.uploads.length, ...(save.uploads || []));
    S.loadDoc(save.doc, save.assets || {}, { name: save.name || 'Untitled design' });
    updateTop();
  }

  // export resolutions are named by their short side, so "4K" means 2160 px on the short edge (3840 × 2160 landscape)
  const RES = [['1×', 0], ['HD 720', 720], ['Full HD 1080', 1080], ['2K 1440', 1440], ['4K 2160', 2160]];
  function sizeFor(short, mult) {
    const d = S.doc, s0 = Math.min(d.width, d.height);
    const k = short ? short / s0 : (mult || 1);
    return { w: S.even(d.width * k), h: S.even(d.height * k), k };
  }
  async function openExport(startTab) {
    let mode = startTab || (S.hasAnimation() ? 'video' : 'image');
    let fmt = 'png', res = 1080, transparent = false, quality = 0.92;
    let vfmt = 'mp4', vres = 1080, fps = S.doc.anim.fps || 30, vq = 'high';
    let ctrl = null;
    S.pause();
    const preview = h('div.export-preview', null, h('div.hint', null, 'Rendering preview…'));
    const box = modal([]);
    const tabs = h('div.seg.export-tabs');
    const opts = h('div');
    box.style.width = 'min(500px, 100%)';
    box.append(h('h1', null, 'Export'), h('p.lead', null, 'Download your design as an image or, if it’s animated, as a video — up to 4K.'), tabs, preview, opts);
    const segBtn = (cur, v, l, set) => h('button' + (cur === v ? '.on' : ''), { onclick: () => { set(v); draw(); } }, l);
    const drawTabs = () => tabs.replaceChildren(segBtn(mode, 'image', 'Image', v => { mode = v; }), segBtn(mode, 'video', 'Video', v => { mode = v; }));
    function draw() {
      drawTabs();
      if (mode === 'image') {
        const sz = sizeFor(res);
        opts.replaceChildren(...[
          row('Format', h('div.seg', null, segBtn(fmt, 'png', 'PNG', v => { fmt = v; }), segBtn(fmt, 'jpeg', 'JPG', v => { fmt = v; transparent = false; }), segBtn(fmt, 'webp', 'WEBP', v => { fmt = v; }))),
          row('Size', h('div.seg', null, RES.map(([l, v]) => segBtn(res, v, l, x => { res = x; })))),
          fmt !== 'jpeg' ? h('div.toggle-row', null, h('label', null, 'Transparent background'), h('button.switch' + (transparent ? '.on' : ''), { onclick: () => { transparent = !transparent; draw(); } })) : null,
          fmt !== 'png' ? row('Quality', h('input.slider', { type: 'range', min: 50, max: 100, value: Math.round(quality * 100), oninput: e => { quality = e.target.value / 100; } })) : null,
          h('div.hint', null, `${sz.w} × ${sz.h} px · ${fmt.toUpperCase()}`),
          h('div.btn-row', { style: { marginTop: '14px' } },
            navigator.clipboard && window.ClipboardItem ? h('button.btn', { onclick: copyImage }, ic('copy'), 'Copy image') : null,
            h('button.btn.primary', { onclick: doImage, style: { height: '38px' } }, ic('download'), 'Download image')),
        ].filter(Boolean));
      } else {
        const sz = sizeFor(vres);
        const anim = S.hasAnimation();
        opts.replaceChildren(...[
          anim ? null : h('div.hint', { style: { marginBottom: '8px', color: 'var(--ink)' } }, 'Nothing is animated yet. Open the Animate tab (or press “Animate everything”) to bring layers to life — or export a still video.'),
          anim ? null : h('button.btn', { style: { marginBottom: '10px' }, onclick: () => { closeModal(); setTab('animate'); } }, ic('film'), 'Go to Animate'),
          row('Format', h('div.seg', null, segBtn(vfmt, 'mp4', 'MP4', v => { vfmt = v; }), segBtn(vfmt, 'webm', 'WEBM', v => { vfmt = v; }))),
          row('Size', h('div.seg', null, RES.slice(1).map(([l, v]) => segBtn(vres, v, l.split(' ')[0], x => { vres = x; })))),
          row('Frame rate', h('div.seg', null, [24, 30, 60].map(f => segBtn(fps, f, f + ' fps', x => { fps = x; })))),
          row('Quality', h('div.seg', null, segBtn(vq, 'standard', 'Standard', v => { vq = v; }), segBtn(vq, 'high', 'High', v => { vq = v; }), segBtn(vq, 'max', 'Max', v => { vq = v; }))),
          row('Length', num('doc', 'anim.duration', { min: 1, max: 30, step: 0.5, slider: true, unit: 's', set: (v, live) => { S.change('doc', 'anim.duration', v, live); if (!live) draw(); } })),
          h('div.hint', null, `${sz.w} × ${sz.h} px · ${fps} fps · ${S.doc.anim.duration}s · loops seamlessly`),
          h('div.progress', { hidden: true }, h('div')),
          h('div.hint.vstatus'),
          h('div.btn-row', { style: { marginTop: '14px' } },
            h('button.btn.vcancel', { hidden: true, onclick: () => ctrl && ctrl.abort() }, 'Cancel'),
            h('button.btn.primary.vgo', { onclick: doVideo, style: { height: '38px' } }, ic('film'), 'Render video')),
        ].filter(Boolean));
      }
      hydrateIcons(opts);
    }
    async function doImage(e) {
      const btn = e.currentTarget; btn.disabled = true; btn.lastChild.textContent = 'Rendering…';
      try {
        const sz = sizeFor(res);
        const c = await S.render({ scale: sz.k, transparent: transparent && fmt !== 'jpeg', time: null });
        const blob = await new Promise(r => c.toBlob(r, 'image/' + fmt, quality));
        const name = `${slug()}.${fmt === 'jpeg' ? 'jpg' : fmt}`;
        const url = URL.createObjectURL(blob);
        preview.replaceChildren(h('div.export-result', null, h('img', { src: url, alt: name }),
          h('div.hint', null, `${name} · ${c.width} × ${c.height}. If nothing downloaded, use Save again, or right-click / long-press the image to save it.`),
          h('button.btn', { onclick: () => download(blob, name) }, ic('download'), 'Save again')));
        hydrateIcons(preview);
        const r = await download(blob, name);
        if (r === 'saved' || r === 'started') toast(`Exported ${c.width} × ${c.height}`);
      } catch (err) { console.error(err); toast('Export failed — try a smaller size'); }
      btn.disabled = false; btn.lastChild.textContent = 'Download image';
    }
    async function copyImage() {
      try {
        const c = await S.render({ scale: Math.min(sizeFor(res).k, 2), transparent, time: null });
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        toast('Image copied to clipboard');
      } catch (err) { toast('Your browser blocked clipboard access'); }
    }
    async function doVideo() {
      const bar = $('.progress', opts), fill = $('.progress > div', opts), status = $('.vstatus', opts), go = $('.vgo', opts), cancel = $('.vcancel', opts);
      const sz = sizeFor(vres);
      const bpp = { standard: 0.07, high: 0.12, max: 0.2 }[vq];
      ctrl = new AbortController();
      bar.hidden = false; cancel.hidden = false; go.disabled = true;
      const t0 = performance.now();
      try {
        const out = await S.exportVideo({
          width: sz.w, height: sz.h, fps, duration: S.doc.anim.duration, format: vfmt,
          bitrate: Math.min(80e6, Math.round(sz.w * sz.h * fps * bpp)), signal: ctrl.signal,
          onProgress: (f, stage) => {
            fill.style.width = Math.round(f * 100) + '%';
            const el = (performance.now() - t0) / 1000;
            status.textContent = stage === 'finish' ? 'Finishing the file…' : `Rendering frames… ${Math.round(f * 100)}%` + (f > 0.05 ? ` · about ${Math.max(1, Math.round(el / f - el))}s left` : '');
          },
        });
        const name = `${slug()}.${out.ext}`;
        const url = URL.createObjectURL(out.blob);
        preview.replaceChildren(h('div.export-result', null, h('video', { src: url, controls: true, autoplay: true, loop: true, muted: true, playsInline: true }),
          h('div.hint', null, `${name} · ${out.width} × ${out.height} · ${(out.blob.size / 1e6).toFixed(1)} MB. If nothing downloaded, use Save again, or right-click the video and choose “Save video as”.`),
          h('button.btn', { onclick: () => download(out.blob, name) }, ic('download'), 'Save again')));
        hydrateIcons(preview);
        download(out.blob, name);
        status.textContent = out.ext !== vfmt ? `Your browser can’t encode ${vfmt.toUpperCase()}, so this was saved as ${out.ext.toUpperCase()}.` : 'Done.';
        toast('Video exported');
      } catch (err) {
        console.error(err);
        status.textContent = err.name === 'AbortError' ? 'Cancelled.' : 'Video export failed. Try a smaller size or a lower frame rate.';
      }
      cancel.hidden = true; go.disabled = false; ctrl = null;
    }
    draw();
    const c = await S.render({ scale: Math.min(1, 520 / Math.max(S.doc.width, S.doc.height)), time: null });
    if (!preview.querySelector('.export-result')) preview.replaceChildren(c);
  }

  function openHelp() {
    const k = (keys, label) => [h('span', null, label), h('span', null, keys.split(' ').map(x => h('span.kbd', null, x)).reduce((a, b) => [a, ' ', b]))];
    modal([
      h('h1', null, 'Shortcuts'),
      h('p.lead', null, 'Snapping: elements snap to the canvas edges and centre lines (pink), to other elements (orange) and to the grid when grid-snap is on.'),
      h('div.help-grid', null,
        k('Drag', 'Move — snaps to guides'), k('Shift drag', 'Move along one axis'), k('Alt drag', 'Duplicate while dragging'), k('Ctrl drag', 'Move without snapping'),
        k('E', 'Eraser (Esc to leave)'), k('[ ]', 'Eraser size'), k('P', 'Play / pause animation'),
        k('Arrows', 'Nudge 1px (Shift: 10px)'), k('Space drag', 'Pan the canvas'), k('⌘ scroll', 'Zoom'), k('⌘0', 'Fit to screen'),
        k('Dbl-click', 'Edit text · crop a photo'), k('T', 'Add text'), k('G', 'Toggle grid'),
        k('⌘D', 'Duplicate'), k('⌘C ⌘V', 'Copy & paste'), k('⌘Z', 'Undo'), k('⇧⌘Z', 'Redo'), k('⌘] ⌘[', 'Forward / backward'),
        k('⌘L', 'Lock'), k('⌘A', 'Select all'), k('⌫', 'Delete'), k('⌘E', 'Export'), k('Esc', 'Deselect / finish')),
    ], { small: true });
  }

  /* ───────────────────────── animation ───────────────────────── */

  function animSection(el) {
    const T = 'sel';
    const an = el.anim || {};
    const loop = an.loop || 'none', enter = an.enter || 'none';
    const setA = (k, v, live) => { S.change(T, 'anim.' + k, v, live); if (!live && (k === 'loop' || k === 'enter')) renderInspector(); updateTimeline(); };
    const enterOpts = Object.entries(R.ANIM_ENTER).filter(([k]) => k !== 'typewriter' || el.type === 'text');
    return sec('Animation', [
      row('Loop', selectCtl(T, 'anim.loop', Object.entries(R.ANIM_LOOPS), { def: 'none', set: v => setA('loop', v) })),
      row('Entrance', selectCtl(T, 'anim.enter', enterOpts, { def: 'none', set: v => setA('enter', v) })),
      loop !== 'none' || enter !== 'none' ? row('Speed', num(T, 'anim.speed', { min: 0.25, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('speed', v, l) })) : null,
      loop !== 'none' && loop !== 'spin' && loop !== 'blink' ? row('Amount', num(T, 'anim.amount', { min: 0.1, max: 4, step: 0.05, slider: true, def: 1, unit: '×', set: (v, l) => setA('amount', v, l) })) : null,
      enter !== 'none' ? row('Delay', num(T, 'anim.delay', { min: 0, max: 10, step: 0.05, slider: true, def: 0, unit: 's', set: (v, l) => setA('delay', v, l) })) : null,
      loop === 'spin' ? toggle(T, 'anim.reverse', 'Spin anticlockwise') : null,
      loop !== 'none' ? toggle(T, 'anim.sync', 'Start in sync with other layers') : null,
      full(h('div.btn-row', null,
        h('button.btn', { onclick: () => (S.isPlaying() ? S.pause() : S.play()) }, ic('play'), 'Preview'),
        h('button.btn', { onclick: () => { setTab('animate'); } }, ic('film'), 'All animation'))),
    ], loop !== 'none' || enter !== 'none');
  }

  // one-click looks for the whole design
  const ANIM_PRESETS = [
    { name: 'Stop-motion', sub: 'Everything boils like hand-made frames', apply: (el, i) => ({ loop: 'wiggle', amount: el.type === 'image' && el.width > S.doc.width * 0.8 ? 0 : 1, speed: 1 }) },
    { name: 'Gentle float', sub: 'Stickers drift, text settles in', apply: (el, i) => el.type === 'text' ? { enter: 'rise', delay: i * 0.12, loop: 'none' } : { loop: el.type === 'sticker' ? 'float' : 'sway', amount: 0.7 } },
    { name: 'Pop in', sub: 'Layers pop in one after another', apply: (el, i) => ({ enter: 'pop', delay: 0.15 + i * 0.12, loop: el.type === 'sticker' ? 'jiggle' : 'none', amount: 0.6 }) },
    { name: 'Party', sub: 'Bouncy stickers, spinning stars', apply: (el, i) => el.type === 'sticker' ? { loop: /star|sparkle|sun|flower|asterisk|burst/i.test(el.stickerId) ? 'spin' : 'bounce', speed: 1 } : el.type === 'text' ? { loop: 'pulse', amount: 0.6 } : { loop: 'jiggle', amount: 0.4 } },
    { name: 'Typewriter story', sub: 'Text types itself out', apply: (el, i) => el.type === 'text' ? { enter: 'typewriter', delay: 0.2 + i * 0.5, speed: 0.4 } : { enter: 'fade', delay: i * 0.1 } },
    { name: 'Drop & sway', sub: 'Things fall in and keep swinging', apply: (el, i) => ({ enter: 'drop', delay: i * 0.1, loop: el.type === 'sticker' ? 'swing' : 'none', amount: 0.8 }) },
  ];
  function animatePanel() {
    const D = S.doc.anim;
    const presets = h('div.anim-presets', null, ANIM_PRESETS.map(p => h('button.big-btn', {
      onclick: () => {
        const targets = S.doc.elements.filter(e => !e.locked && !e.hidden);
        // large full-bleed photos act as backdrops and stay still
        targets.forEach((el, i) => { el.anim = Object.assign({ loop: 'none', enter: 'none', speed: 1, amount: 1, delay: 0 }, p.apply(el, i)); if (el.anim.amount === 0) el.anim = { loop: 'none', enter: 'none' }; });
        S.touchAll(); S.commit(); renderInspector(); updateTimeline(); S.play();
        toast(`“${p.name}” applied to ${targets.length} layers`);
      },
    }, h('b', null, p.name), h('small', null, p.sub))));
    return [
      h('h2', null, 'Animate'),
      h('p.sub', null, 'Bring layers to life, then export a looping video up to 4K. Pick a look for everything, or set each layer in the right-hand panel.'),
      h('div.btn-row', null,
        h('button.btn.primary', { onclick: () => (S.isPlaying() ? S.pause() : S.play()) }, ic(S.isPlaying() ? 'pause' : 'play'), S.isPlaying() ? 'Pause' : 'Play'),
        h('button.btn', { onclick: () => openExport('video') }, ic('film'), 'Export video')),
      h('h3', null, 'Animate everything'),
      presets,
      h('button.btn', { style: { marginTop: '8px', width: '100%' }, onclick: () => { S.doc.elements.forEach(e => { delete e.anim; }); S.stopPreview(); S.touchAll(); S.commit(); renderInspector(); updateTimeline(); toast('Animations removed'); } }, ic('trash'), 'Remove all animation'),
      h('h3', null, 'Timing'),
      row('Length', num('doc', 'anim.duration', { min: 1, max: 30, step: 0.5, slider: true, unit: 's', set: (v, live) => { S.change('doc', 'anim.duration', v, live); updateTimeline(); } })),
      row('Frame rate', selectCtl('doc', 'anim.fps', [[24, '24 fps'], [30, '30 fps'], [60, '60 fps']], { number: true })),
      h('p.hint', null, 'Loops repeat a whole number of times within the length, so exported videos loop seamlessly.'),
      h('h3', null, 'Animated layers'),
      ...(() => {
        const list = S.doc.elements.filter(R.hasAnim).slice().reverse();
        if (!list.length) return [h('p.hint', null, 'No layers are animated yet.')];
        return list.map(el => h('div.layer', { onclick: () => S.select([el.id]) },
          h('div.lname', null, S.elLabel(el), h('div.ltype', null, [el.anim.enter && el.anim.enter !== 'none' ? R.ANIM_ENTER[el.anim.enter] : null, el.anim.loop && el.anim.loop !== 'none' ? R.ANIM_LOOPS[el.anim.loop] : null].filter(Boolean).join(' · ')))));
      })(),
    ];
  }

  // floating timeline under the canvas whenever something moves
  const tl = $('#timeline');
  function updateTimeline() {
    const show = S.hasAnimation() || S.isPlaying();
    tl.hidden = !show;
    if (!show) return;
    const D = S.doc.anim.duration;
    if (!tl.firstChild) {
      tl.append(
        h('button.play', { title: 'Play / pause (P)', onclick: () => (S.isPlaying() ? S.pause() : S.play()) }, ic('play')),
        h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Animation time', oninput: e => { S.pause(); S.seek(e.target.value / 1000 * S.doc.anim.duration); } }),
        h('span.time'),
        h('button.btn', { title: 'Back to the editing layout', onclick: () => S.stopPreview() }, ic('stop'), 'Edit'),
        h('button.btn', { onclick: () => openExport('video') }, ic('film'), 'Export'));
      hydrateIcons(tl);
    }
    const t = R.playTime;
    $('input', tl).value = t == null ? 0 : Math.round(t / D * 1000);
    $('.time', tl).textContent = t == null ? `edit · ${D}s` : `${t.toFixed(1)} / ${D}s`;
    const pb = $('.play', tl);
    const want = S.isPlaying() ? 'pause' : 'play';
    if (pb.dataset.state !== want) { pb.dataset.state = want; pb.replaceChildren(ic(want)); }
  }
  let tlRaf = 0;
  S.on('time', () => { if (!tlRaf) tlRaf = requestAnimationFrame(() => { tlRaf = 0; updateTimeline(); }); });
  S.on('playstate', playing => {
    updateTimeline();
    $('#btn-play').classList.toggle('on', playing);
    $('#btn-play').replaceChildren(ic(playing ? 'pause' : 'play'));
    if (tab === 'animate') renderPanel();
  });
  S.on('change', updateTimeline);
  S.on('doc', updateTimeline);
  $('#btn-play').onclick = () => {
    if (!S.hasAnimation() && !S.isPlaying()) { toast('Nothing is animated yet — pick a look in Animate'); setTab('animate'); if (matchMedia('(max-width: 920px)').matches) panel.classList.add('open'); return; }
    S.isPlaying() ? S.pause() : S.play();
  };

  /* ───────────────────────── eraser bar ───────────────────────── */

  const ebar = $('#eraser-bar');
  function updateEraserBar() {
    const on = S.tool === 'erase';
    ebar.hidden = !on;
    $('#tg-eraser').classList.toggle('on', on);
    if (!on) return;
    const E = S.eraser;
    const segE = (cur, v, label, set) => h('button' + (cur === v ? '.on' : ''), { title: typeof label === 'string' ? label : '', onclick: () => { set(v); S.refreshBrush(); updateEraserBar(); } }, ICONS[label] ? ic(label) : label);
    const size = h('input', { type: 'range', min: 4, max: 400, value: Math.round(E.size), 'aria-label': 'Eraser size', oninput: e => { E.size = +e.target.value; val.textContent = E.size + 'px'; S.refreshBrush(); } });
    const val = h('span.val', null, Math.round(E.size) + 'px');
    const cur = S.selEls()[0];
    ebar.replaceChildren(
      h('label', null, 'Eraser'),
      h('div.seg', null, segE(E.shape, 'circle', 'circle', v => { E.shape = v; }), segE(E.shape, 'square', 'square', v => { E.shape = v; })),
      size, val,
      h('div.seg', null, segE(E.mode, 'erase', 'Erase', v => { E.mode = v; }), segE(E.mode, 'restore', 'Restore', v => { E.mode = v; })),
      cur && cur.erase && cur.erase.length ? h('button.btn', { onclick: () => { S.clearErase(cur.id); updateEraserBar(); } }, 'Reset layer') : null,
      h('button.btn.primary', { onclick: () => S.setTool('select') }, 'Done'));
    [...ebar.childNodes].forEach(n => { if (n.nodeType === 3 && n.textContent === 'null') n.remove(); });
    hydrateIcons(ebar);
  }
  S.on('tool', updateEraserBar);
  S.on('selection', () => { if (S.tool === 'erase') updateEraserBar(); });
  S.on('values', () => { if (S.tool === 'erase') { const c = S.selEls()[0]; const has = !!(c && c.erase && c.erase.length); if (has !== !!$('#eraser-bar .btn:not(.primary)')) updateEraserBar(); } });
  $('#tg-eraser').onclick = () => S.setTool(S.tool === 'erase' ? 'select' : 'erase');

  /* ───────────────────────── wiring ───────────────────────── */

  let lastSelKey = '';
  S.on('selection', () => {
    const key = S.sel.join(',');
    const els = S.selEls();
    // re-render the inspector only when the selection really changes
    if (key !== lastSelKey || !els.length) renderInspector();
    lastSelKey = key;
    if (tab === 'layers') renderPanel();
    if (tab === 'photos') renderPanel();
    quickBar(); hydrateIcons(S.quickBar);
    if (matchMedia('(max-width: 920px)').matches) {
      insp.classList.toggle('open', els.length > 0);
      if (els.length) panel.classList.remove('open');
    }
  });
  S.on('doc', () => { renderInspector(); if (tab === 'layers' || tab === 'background') renderPanel(); updateTop(); });
  S.on('change', () => { if (tab === 'layers') { clearTimeout(S._lt); S._lt = setTimeout(renderPanel, 120); } });

  hydrateIcons();
  renderPanel();
  renderInspector();
  updateTop();
  S.ui = { openHome, openExport, openSizeModal, setTab, toast, renderPanel };

  // first run: restore the last session silently, otherwise show the start screen
  F.injectStylesheets();
  F.customReady.then(() => { if (F.customFamilies().length) { R.fontsVersion++; R.requestRedraw(); } });
  S.loadAutosave().then(save => {
    if (save && save.doc && save.doc.elements && save.doc.elements.length) { resumeFrom(save); }
    else {
      const T = window.STUDIO_TEMPLATES || [];
      if (T.length) S.loadDoc(prepDoc(T[0].build()), null, { name: T[0].name });
      openHome(false);
    }
  }).catch(() => openHome(false));
})();
