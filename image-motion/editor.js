/* ImageMotion Studio — editor logic. Depends on image-motion.js, render.js, export.js (loaded before). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

  /* ═══════════════════════ data ═══════════════════════ */
  /* Bundled portrait set. Photographer credits live in images/CREDITS.md. */
  const PEOPLE = [
    ['portrait-01', 'Unattributed'], ['portrait-02', 'Good Faces'], ['portrait-03', 'Brendan Franks'],
    ['portrait-04', 'Davide Aracri'], ['portrait-05', 'Ethan Haddox'], ['portrait-06', 'Jonathan Cosens'],
    ['portrait-07', 'Jorge Salvador'], ['portrait-08', 'M. Brauer'], ['portrait-09', 'Rainer Bleek'],
    ['portrait-10', 'Siavosh Hosseini'], ['portrait-11', 'Sophie Paterson'], ['portrait-12', 'Vicky Hladynets'],
  ];
  const people = () => PEOPLE.map(([file, credit]) => ({ src: `images/${file}.jpg`, alt: 'Portrait', label: credit }));

  const FONTS = [
    { name: 'Inter', css: "'Inter', system-ui, sans-serif", q: 'Inter:wght@100..900' },
    { name: 'Manrope', css: "'Manrope', system-ui, sans-serif", q: 'Manrope:wght@200..800' },
    { name: 'Space Grotesk', css: "'Space Grotesk', system-ui, sans-serif", q: 'Space+Grotesk:wght@300..700' },
    { name: 'Syne', css: "'Syne', system-ui, sans-serif", q: 'Syne:wght@400..800' },
    { name: 'Sora', css: "'Sora', system-ui, sans-serif", q: 'Sora:wght@100..800' },
    { name: 'Bricolage Grotesque', css: "'Bricolage Grotesque', system-ui, sans-serif", q: 'Bricolage+Grotesque:opsz,wght@12..96,200..800' },
    { name: 'Playfair Display', css: "'Playfair Display', Georgia, serif", q: 'Playfair+Display:ital,wght@0,400..900;1,400..900' },
    { name: 'Fraunces', css: "'Fraunces', Georgia, serif", q: 'Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900' },
    { name: 'DM Serif Display', css: "'DM Serif Display', Georgia, serif", q: 'DM+Serif+Display:ital@0;1' },
    { name: 'Instrument Serif', css: "'Instrument Serif', Georgia, serif", q: 'Instrument+Serif:ital@0;1' },
    { name: 'JetBrains Mono', css: "'JetBrains Mono', ui-monospace, monospace", q: 'JetBrains+Mono:wght@100..800' },
    { name: 'System sans', css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
    { name: 'System serif', css: "Georgia, 'Times New Roman', serif" },
  ];
  const fontCss = (name) => (FONTS.find((f) => f.name === name) || FONTS[0]).css;

  const SIZES = [
    { id: '16:9', label: 'Landscape', w: 1920, h: 1080 }, { id: '9:16', label: 'Story / Reel', w: 1080, h: 1920 }, { id: '1:1', label: 'Square', w: 1080, h: 1080 },
    { id: '4:5', label: 'Portrait post', w: 1080, h: 1350 }, { id: '3:4', label: 'Portrait', w: 1080, h: 1440 }, { id: '4:3', label: 'Classic', w: 1440, h: 1080 },
  ];
  const GRADIENTS = [
    { id: 'dusk', label: 'Dusk', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#2b1055' }, { at: 1, color: '#7597de' }] },
    { id: 'ember', label: 'Ember', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#f12711' }, { at: 1, color: '#f5af19' }] },
    { id: 'mint', label: 'Mint', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#0f2027' }, { at: 0.5, color: '#203a43' }, { at: 1, color: '#2c5364' }] },
    { id: 'grape', label: 'Grape', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#41295a' }, { at: 1, color: '#2f0743' }] },
    { id: 'peach', label: 'Peach', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#ee9ca7' }, { at: 1, color: '#ffdde1' }] },
    { id: 'slate', label: 'Slate', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#232526' }, { at: 1, color: '#414345' }] },
    { id: 'halo', label: 'Halo', kind: 'radial', angle: 0, stops: [{ at: 0, color: '#3a3a5a' }, { at: 1, color: '#0b0b12' }] },
    { id: 'sunrise', label: 'Sunrise', kind: 'linear', angle: 160, stops: [{ at: 0, color: '#ff9966' }, { at: 1, color: '#ff5e62' }] },
    { id: 'ocean', label: 'Ocean', kind: 'linear', angle: 135, stops: [{ at: 0, color: '#2193b0' }, { at: 1, color: '#6dd5ed' }] },
    { id: 'midnight', label: 'Midnight', kind: 'linear', angle: 180, stops: [{ at: 0, color: '#0f0c29' }, { at: 0.5, color: '#302b63' }, { at: 1, color: '#24243e' }] },
  ];
  const bgCss = (bg) => ImageMotionRenderer.backgroundCss(bg);

  /* ═══════════════════════ layers ═══════════════════════ */
  let uid = 1;
  const ROLE = {
    eyebrow: { size: 14, weight: 600, spacing: 0.18, lineHeight: 1.4, transform: 'uppercase', opacity: .7, auto: true },
    heading: { size: 84, weight: 800, spacing: -0.035, lineHeight: 1.0, transform: 'none', opacity: 1, auto: false },
    text:    { size: 24, weight: 400, spacing: 0, lineHeight: 1.5, transform: 'none', opacity: .78, auto: false },
    button:  { kind: 'button', size: 18, weight: 600, spacing: 0, lineHeight: 1, transform: 'none', opacity: 1, auto: true, radius: 999, padX: 28, padY: 15 },
  };
  /** Design scale relative to a 1920×1080 canvas: sizes in ROLE and presets are tuned for that. */
  const sizeK = () => Math.sqrt((state.canvas.w * state.canvas.h) / (1920 * 1080));
  function mkLayer(role, o = {}) {
    const k = sizeK(); const r = ROLE[role];
    const scaled = { ...r, size: Math.round(r.size * k) };
    if (r.padX) { scaled.padX = Math.round(r.padX * k); scaled.padY = Math.round(r.padY * k); }
    return { id: 'L' + (uid++), kind: 'text', role, text: 'New text', x: 20, y: 40, w: 60, align: 'center', font: 'Inter', italic: false, color: '', bg: '', fgColor: '', visible: true, ...scaled, ...o };
  }
  function copyBlock({ x = 20, w = 60, align = 'center', centerY = 50, font = 'Inter', items = [] }) {
    const k = sizeK();
    const layers = items.map((it) => { const o = { ...it }; if (o.size) o.size = Math.round(o.size * k); return mkLayer(it.role, { x, w: it.role === 'text' ? Math.max(20, w * 0.8) : w, align, font, ...o }); });
    return { layers, stack: { ids: layers.map((l) => l.id), x, w, align, centerY } };
  }

  /* Starter looks (mode + copy + colours). Card sizes are for 1920×1080 and get scaled. */
  const STARTERS = {
    'stepping-up': { label: 'Stepping up (video 1)', bg: { type: 'solid', color: '#050507' }, fg: '#ffffff', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'stack', count: 8, cardWidth: 260, cardHeight: 310, radius: 22, depthBlur: 0, parallax: .25, params: { groups: 2, period: 1.5, tilt: 28, gap: .46, lift: 1, spread: .24 } }, copy: { items: [{ role: 'eyebrow', text: 'We are' }, { role: 'heading', text: 'stepping up' }] } },
    'level-up': { label: 'Level up ring (video 1)', bg: { type: 'solid', color: '#050507' }, fg: '#ffffff', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'burst', count: 14, cardWidth: 210, cardHeight: 262, params: { radius: .36, period: 7, force: 2.6, spin: 1.2 } }, copy: { items: [{ role: 'eyebrow', text: 'So you can' }, { role: 'heading', text: 'level up' }] } },
    'expand': { label: 'Expand your reach (video 1)', bg: { type: 'gradient', kind: 'radial', angle: 0, stops: [{ at: 0, color: '#3a0a0e' }, { at: 1, color: '#1a0405' }] }, fg: '#ffffff', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'converge', count: 12, cardWidth: 240, cardHeight: 290, params: { period: 9, cluster: .1, hold: .45, stagger: .7 } }, copy: { w: 50, x: 25, items: [{ role: 'heading', text: 'EXPAND\nYOUR REACH', size: 96, spacing: -.02 }] } },
    'shuffle': { label: 'Shuffle collage (video 2)', bg: { type: 'solid', color: '#000000' }, fg: '#ffffff', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'shuffle', count: 13, cardWidth: 290, cardHeight: 330, sizeVariance: .3, aspectMix: true, radius: 12, depthBlur: 0, params: { period: 4, swap: .2, style: 'pop', idle: .8 } }, copy: { font: 'Manrope', items: [{ role: 'heading', text: 'MultiAdaptor 2.0', size: 84, weight: 700, spacing: -.02 }] } },
    'marketplace': { label: 'Marketplace float (video 3)', bg: { type: 'solid', color: '#f6f4f0' }, fg: '#111111', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'float', count: 9, cardWidth: 230, cardHeight: 264, sizeVariance: .35, aspectMix: true, radius: 28, depthBlur: 1.5, params: { amplitude: 16, sway: 4, depth: 420 } }, copy: { w: 50, x: 25, items: [{ role: 'heading', text: 'Get exclusive access to our marketplace', size: 90 }, { role: 'text', text: 'Unlimited tools to transform your health and change your life.' }, { role: 'button', text: 'Join the waitlist →' }] } },
    'tunnel': { label: 'Creative tunnel (video 4)', bg: { type: 'solid', color: '#e9e9e9' }, fg: '#111111', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'tunnel', count: 16, cardWidth: 320, cardHeight: 380, radius: 8, depthBlur: 2, parallax: .8, params: { width: 1.28, gap: 1.2, travel: 120, splay: 14, walls: 'sides', panelScale: 1.55, jitter: .45 } }, copy: { font: 'Instrument Serif', w: 46, x: 27, items: [{ role: 'heading', text: 'One platform.\nEvery creative outcome.', size: 88, weight: 400, spacing: -.01, lineHeight: 1.05 }, { role: 'text', text: 'Be the creative director. Let agents be your team.', size: 24 }, { role: 'button', text: 'Start a brief →', font: 'Inter' }] } },
    'split': { label: 'Split hero (motion on the right)', bg: { type: 'solid', color: '#f1ede4' }, fg: '#141414', motion: { x: 46, y: 6, w: 50, h: 88 }, im: { mode: 'sphere', count: 22, cardWidth: 180, cardHeight: 230, radius: 18, params: { radius: .42, spin: .22, tilt: 16, backFade: .8 } }, copy: { x: 7, w: 36, align: 'left', font: 'Fraunces', items: [{ role: 'eyebrow', text: 'Worldwide' }, { role: 'heading', text: 'A team on every continent', size: 92, weight: 600, spacing: -.02 }, { role: 'text', text: 'The animation lives in its own box, and every text layer can sit anywhere.', size: 24, font: 'Inter' }, { role: 'button', text: 'Meet the team →', font: 'Inter' }] } },
    'reel': { label: 'Hero reel (story)', bg: { type: 'gradient', kind: 'linear', angle: 180, stops: [{ at: 0, color: '#0f0c29' }, { at: 1, color: '#24243e' }] }, fg: '#ffffff', motion: { x: 0, y: 0, w: 100, h: 100 }, im: { mode: 'heroreel', count: 8, cardWidth: 200, cardHeight: 250, radius: 14, params: { period: 2.4, strip: 'bottom', thumb: .13, gap: 14, lift: 1.2, dim: .8, inset: .05 } }, copy: { centerY: 30, items: [{ role: 'eyebrow', text: 'Portfolio' }, { role: 'heading', text: 'Faces of the studio', size: 84 }] } },
  };

  /* ═══════════════════════ state ═══════════════════════ */
  const state = {
    canvas: { w: 1920, h: 1080, preset: '16:9' },
    page: { bg: { type: 'solid', color: '#050507' }, fg: '#ffffff', keepOff: true, zonePad: 40, showZones: false, snap: true },
    media: { source: 'people', urls: '', labels: '' },
    motion: { x: 0, y: 0, w: 100, h: 100 },
    layers: [], selected: null, stack: null,
    loop: 10,
  };
  const uploads = [];                                          // { src (data URL), label } — kept in memory only
  const canvas = $('canvas'), motionEl = $('motion'), guidesEl = $('guides'), zonesEl = $('zones'), frameEl = $('frame'), readoutEl = $('readout'), scaler = $('scaler'), viewport = $('viewport');
  const layerEls = new Map();
  let fit = 1;

  function readHash() { try { const m = location.hash.match(/cfg=([^&]+)/); if (!m) return null; return JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } }
  let hashTimer;
  function writeHash() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      const data = { v: 3, im: exportConfig(false), page: state.page, media: { source: state.media.source === 'upload' ? 'people' : state.media.source, urls: state.media.urls, labels: state.media.labels }, motion: state.motion, layers: state.layers, canvas: state.canvas, loop: state.loop };
      const b = btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      history.replaceState(null, '', '#cfg=' + b);
    }, 250);
  }
  function imagesFor() {
    const m = state.media;
    if (m.source === 'gradient') return [];
    if (m.source === 'upload') return uploads.length ? uploads.slice() : people();
    if (m.source === 'urls') { const list = m.urls.split('\n').map((s) => s.trim()).filter(Boolean).map((l) => { const [src, label] = l.split('|').map((s) => s.trim()); return { src, label }; }); return list.length ? list : people(); }
    return people();
  }
  const labelsFor = () => { const l = state.media.labels.split('\n').map((s) => s.trim()).filter(Boolean); return l.length ? l : null; };

  /* — boot — */
  const saved = readHash();
  let initialIm = { mode: 'orbit', count: 12, cardWidth: 260, cardHeight: 330, radius: 22 };
  if (saved && saved.v === 3 && Array.isArray(saved.layers)) {
    Object.assign(state.page, saved.page || {}); Object.assign(state.media, saved.media || {}); Object.assign(state.motion, saved.motion || {}); Object.assign(state.canvas, saved.canvas || {});
    state.layers = saved.layers; state.loop = saved.loop || 10;
    uid = 1 + Math.max(0, ...state.layers.map((l) => parseInt(l.id.slice(1), 10) || 0));
    initialIm = saved.im || initialIm;
  } else {
    const blk = copyBlock({ items: [{ role: 'eyebrow', text: 'Image motion' }, { role: 'heading', text: 'Level up your visuals' }, { role: 'text', text: 'Thirty motion templates, your images, free text placement — export MP4, WebM or GIF up to 4K.' }, { role: 'button', text: 'Get started →' }] });
    state.layers = blk.layers; state.stack = blk.stack;
  }
  applyCanvasSize(); applyPage(); renderMotionBox(); renderLayers();
  const im = ImageMotion.mount(motionEl, { ...initialIm, images: imagesFor(), labels: labelsFor(), avoidCenter: true });
  window.im = im;

  /* ═══════════════════════ canvas size & fit ═══════════════════════ */
  function applyCanvasSize() {
    canvas.style.width = state.canvas.w + 'px'; canvas.style.height = state.canvas.h + 'px';
    fitCanvas();
  }
  function fitCanvas() {
    const vw = viewport.clientWidth - 56, vh = viewport.clientHeight - 56;
    fit = Math.max(0.05, Math.min(vw / state.canvas.w, vh / state.canvas.h));
    canvas.style.transform = `scale(${fit})`;
    scaler.style.width = state.canvas.w * fit + 'px'; scaler.style.height = state.canvas.h * fit + 'px';
    document.documentElement.style.setProperty('--inv', (1 / fit).toFixed(4));
  }
  new ResizeObserver(() => { fitCanvas(); updateFrame(); updateAvoid(); }).observe(viewport);
  /** Change the design size; sizes in px (type, cards) follow so the look is preserved. */
  function setCanvasSize(w, h, preset) {
    const oldK = sizeK();
    state.canvas = { w: Math.round(w), h: Math.round(h), preset };
    const k = sizeK() / oldK;
    if (Math.abs(k - 1) > 0.001) {
      state.layers.forEach((l) => { l.size = Math.max(6, Math.round(l.size * k)); if (l.padX) { l.padX = Math.round(l.padX * k); l.padY = Math.round(l.padY * k); } });
      im.set({ cardWidth: Math.round(im.cfg.cardWidth * k), cardHeight: Math.round(im.cfg.cardHeight * k) });
    }
    applyCanvasSize(); renderLayers(); im.refresh(); updateFrame(); updateAvoid(); buildRatioSeg(); refreshAll(); afterChange();
  }

  /* ═══════════════════════ rendering ═══════════════════════ */
  function applyPage() {
    canvas.style.setProperty('--page-bg', bgCss(state.page.bg));
    canvas.style.setProperty('--page-fg', state.page.fg);
    zonesEl.hidden = !state.page.showZones;
  }
  function renderMotionBox() { const m = state.motion; motionEl.style.left = m.x + '%'; motionEl.style.top = m.y + '%'; motionEl.style.width = m.w + '%'; motionEl.style.height = m.h + '%'; }
  function layerStyle(l) {
    const el = layerEls.get(l.id);
    el.className = 'layer' + (l.kind === 'button' ? ' layer--button' : '') + (l.auto ? ' layer--auto' : '');
    el.style.left = l.x + '%'; el.style.top = l.y + '%'; el.style.width = l.auto ? '' : l.w + '%';
    el.style.textAlign = l.align; el.style.fontFamily = fontCss(l.font);
    el.style.fontWeight = l.weight; el.style.fontStyle = l.italic ? 'italic' : 'normal';
    el.style.fontSize = l.size + 'px'; el.style.letterSpacing = l.spacing + 'em'; el.style.lineHeight = l.lineHeight;
    el.style.textTransform = l.transform; el.style.opacity = l.opacity;
    el.style.color = l.kind === 'button' ? (l.fgColor || (state.page.bg.type === 'solid' ? state.page.bg.color : '#111')) : (l.color || '');
    if (l.kind === 'button') { el.style.background = l.bg || state.page.fg; el.style.padding = `${l.padY}px ${l.padX}px`; el.style.borderRadius = l.radius + 'px'; el.style.justifyContent = l.align === 'left' ? 'flex-start' : l.align === 'right' ? 'flex-end' : 'center'; }
    else { el.style.background = ''; el.style.padding = ''; el.style.borderRadius = ''; }
    if (l.visible) el.removeAttribute('data-hidden'); else el.setAttribute('data-hidden', '');
    if (!el.isContentEditable) el.textContent = l.text;
  }
  function renderLayers() {
    const ids = new Set(state.layers.map((l) => l.id));
    for (const [id, el] of layerEls) if (!ids.has(id)) { el.remove(); layerEls.delete(id); }
    state.layers.forEach((l, i) => {
      let el = layerEls.get(l.id);
      if (!el || (l.kind === 'button') !== (el.tagName === 'A')) {
        el?.remove(); el = document.createElement(l.kind === 'button' ? 'a' : 'div'); el.dataset.id = l.id;
        if (l.kind === 'button') { el.href = '#'; el.addEventListener('click', (e) => e.preventDefault()); el.draggable = false; }
        layerEls.set(l.id, el);
      }
      canvas.insertBefore(el, zonesEl); el.style.zIndex = 2 + i; layerStyle(l);
    });
    updateFrame(); updateZones();
  }
  const canvasRect = () => canvas.getBoundingClientRect();
  function rectOf(id) {
    const c = canvasRect();
    if (id === 'motion') { const m = state.motion; return { x: (m.x / 100) * c.width, y: (m.y / 100) * c.height, w: (m.w / 100) * c.width, h: (m.h / 100) * c.height }; }
    const el = layerEls.get(id); if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  }
  function layerById(id) { return state.layers.find((l) => l.id === id) || null; }
  function updateFrame() {
    const sel = state.selected; const r = sel ? rectOf(sel) : null; const l = layerById(sel);
    if (!r || (l && !l.visible)) { frameEl.hidden = true; return; }
    frameEl.hidden = false;
    // the frame lives inside the scaled canvas, so convert screen px → design px
    frameEl.style.left = r.x / fit + 'px'; frameEl.style.top = r.y / fit + 'px'; frameEl.style.width = r.w / fit + 'px'; frameEl.style.height = r.h / fit + 'px';
    frameEl.dataset.kind = sel === 'motion' ? 'motion' : l.kind;
    $('frameLabel').textContent = sel === 'motion' ? 'Image animation' : `${l.role} · ${l.font} ${l.weight}`;
  }
  function computeAvoidRects() {
    const m = rectOf('motion'); const rects = [];
    for (const l of state.layers) {
      if (!l.visible) continue;
      const r = rectOf(l.id); if (!r || !r.w) continue;
      const ix = Math.max(r.x, m.x), iy = Math.max(r.y, m.y), ax = Math.min(r.x + r.w, m.x + m.w), ay = Math.min(r.y + r.h, m.y + m.h);
      if (ax <= ix || ay <= iy) continue;
      rects.push({ x: ((ix + ax) / 2 - (m.x + m.w / 2)) / m.w, y: ((iy + ay) / 2 - (m.y + m.h / 2)) / m.h, w: (ax - ix) / m.w, h: (ay - iy) / m.h });
    }
    return rects;
  }
  function updateAvoid() { if (!window.im) return; im.set({ avoidCenter: state.page.keepOff, avoidRects: state.page.keepOff ? computeAvoidRects() : [], avoidPad: state.page.zonePad }); updateZones(); }
  function updateZones() {
    zonesEl.innerHTML = '';
    if (!state.page.showZones || !state.page.keepOff) return;
    const m = rectOf('motion'); const pad = state.page.zonePad * fit;
    for (const r of computeAvoidRects()) {
      const z = document.createElement('div'); z.className = 'zone';
      const w = r.w * m.w + pad * 2, h = r.h * m.h + pad * 2;
      z.style.left = (m.x + m.w / 2 + r.x * m.w - w / 2) / fit + 'px'; z.style.top = (m.y + m.h / 2 + r.y * m.h - h / 2) / fit + 'px'; z.style.width = w / fit + 'px'; z.style.height = h / fit + 'px';
      zonesEl.appendChild(z);
    }
  }
  function stackGroup(stack) {
    if (!stack) return;
    const c = canvasRect(); const gap = { eyebrow: 16, heading: 22, text: 30, button: 0 };
    const ls = stack.ids.map(layerById).filter(Boolean); if (!ls.length) return;
    const k = sizeK() * fit;
    let total = 0; const hs = ls.map((l) => { const r = rectOf(l.id); total += r.h; return r; });
    total += ls.slice(0, -1).reduce((s, l) => s + (gap[l.role] ?? 16) * k, 0);
    let y = (stack.centerY / 100) * c.height - total / 2;
    ls.forEach((l, i) => {
      l.y = round((y / c.height) * 100, 2);
      if (l.auto) { const w = (hs[i].w / c.width) * 100; l.x = round(stack.align === 'center' ? stack.x + stack.w / 2 - w / 2 : stack.align === 'right' ? stack.x + stack.w - w : stack.x, 2); }
      y += hs[i].h + (gap[l.role] ?? 16) * k;
    });
    renderLayers();
  }

  /* ═══════════════════════ selection, drag, snap ═══════════════════════ */
  function select(id) { state.selected = id; updateFrame(); rebuildLayerPanel(); if (id && id !== 'motion') showTab('text'); }
  function snapTargets(excludeId) {
    const c = canvasRect(); const W = c.width, H = c.height;
    const vs = [0, W / 2, W], hs = [0, H / 2, H];
    const add = (r) => { if (!r) return; vs.push(r.x, r.x + r.w / 2, r.x + r.w); hs.push(r.y, r.y + r.h / 2, r.y + r.h); };
    if (excludeId !== 'motion') add(rectOf('motion'));
    state.layers.forEach((l) => { if (l.id !== excludeId && l.visible) add(rectOf(l.id)); });
    return { vs, hs };
  }
  function snapAxis(edges, targets, TH = 6) {
    let best = { d: 0, at: null, dist: TH + 1 };
    for (const e of edges) for (const t of targets) { const d = t - e; if (Math.abs(d) < best.dist) best = { d, at: t, dist: Math.abs(d) }; }
    return best.at === null ? { d: 0, at: null } : best;
  }
  function showGuides(v, h) {
    guidesEl.innerHTML = '';
    const mk = (cls, pos, prop) => { const g = document.createElement('div'); g.className = 'guide ' + cls; g.style[prop] = pos / fit + 'px'; guidesEl.appendChild(g); };
    v.forEach((x) => mk('v', x, 'left')); h.forEach((y) => mk('h', y, 'top'));
  }
  function showReadout(r, text) { readoutEl.hidden = false; readoutEl.textContent = text; readoutEl.style.left = (r.x + r.w) / fit + 10 / fit + 'px'; readoutEl.style.top = Math.max(4, r.y / fit - 4) + 'px'; }
  let drag = null, lastPress = { id: null, t: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const editing = canvas.querySelector('.layer.is-editing');
    if (editing && !editing.contains(e.target)) editing.blur();
    const handle = e.target.closest('.handle');
    const layerEl = e.target.closest('.layer');
    if (handle && state.selected) start(e, state.selected, handle.dataset.dir);
    else if (layerEl) {
      if (layerEl.isContentEditable) return;
      const now = performance.now();
      if (lastPress.id === layerEl.dataset.id && now - lastPress.t < 380) { lastPress = { id: null, t: 0 }; beginEdit(layerEl); return; }
      lastPress = { id: layerEl.dataset.id, t: now };
      select(layerEl.dataset.id); start(e, layerEl.dataset.id, 'move');
    } else if (motionEl.contains(e.target) || e.target === motionEl) { select('motion'); start(e, 'motion', 'move'); }
    else select(null);
    function start(e, id, dir) { drag = { id, dir, sx: e.clientX, sy: e.clientY, r0: rectOf(id), moved: false }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const c = canvasRect(); const W = c.width, H = c.height;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
    drag.moved = true;
    let r = { ...drag.r0 }; const dir = drag.dir; const MIN = 40 * fit;
    if (dir === 'move') { r.x += dx; r.y += dy; }
    else {
      if (dir.includes('e')) r.w = Math.max(MIN, r.w + dx);
      if (dir.includes('s')) r.h = Math.max(MIN, r.h + dy);
      if (dir.includes('w')) { const nx = Math.min(r.x + dx, r.x + r.w - MIN); r.w += r.x - nx; r.x = nx; }
      if (dir.includes('n')) { const ny = Math.min(r.y + dy, r.y + r.h - MIN); r.h += r.y - ny; r.y = ny; }
    }
    const gv = [], gh = [];
    if (state.page.snap && !e.altKey) {
      const t = snapTargets(drag.id);
      if (dir === 'move') { const sx = snapAxis([r.x, r.x + r.w / 2, r.x + r.w], t.vs), sy = snapAxis([r.y, r.y + r.h / 2, r.y + r.h], t.hs); r.x += sx.d; r.y += sy.d; if (sx.at !== null) gv.push(sx.at); if (sy.at !== null) gh.push(sy.at); }
      else {
        if (dir.includes('e')) { const s = snapAxis([r.x + r.w], t.vs); r.w += s.d; if (s.at !== null) gv.push(s.at); }
        if (dir.includes('w')) { const s = snapAxis([r.x], t.vs); r.x += s.d; r.w -= s.d; if (s.at !== null) gv.push(s.at); }
        if (dir.includes('s')) { const s = snapAxis([r.y + r.h], t.hs); r.h += s.d; if (s.at !== null) gh.push(s.at); }
        if (dir.includes('n')) { const s = snapAxis([r.y], t.hs); r.y += s.d; r.h -= s.d; if (s.at !== null) gh.push(s.at); }
      }
    }
    if (Math.abs(r.x + r.w / 2 - W / 2) < .5 && !gv.length) gv.push(W / 2);
    if (Math.abs(r.y + r.h / 2 - H / 2) < .5 && !gh.length) gh.push(H / 2);
    showGuides(gv, gh);
    const pct = (v, tot) => round((v / tot) * 100, 1);
    if (drag.id === 'motion') { Object.assign(state.motion, { x: pct(r.x, W), y: pct(r.y, H), w: pct(r.w, W), h: pct(r.h, H) }); renderMotionBox(); showReadout(r, `${state.motion.x}%, ${state.motion.y}%  ·  ${state.motion.w}% × ${state.motion.h}%`); }
    else { const l = layerById(drag.id); if (!l) return; l.x = pct(r.x, W); l.y = pct(r.y, H); if (dir !== 'move') { l.w = pct(r.w, W); l.auto = false; } layerStyle(l); showReadout(r, dir === 'move' ? `${l.x}%, ${l.y}%` : `w ${l.w}%`); }
    updateFrame();
  });
  const endDrag = () => { if (!drag) return; const moved = drag.moved; drag = null; guidesEl.innerHTML = ''; readoutEl.hidden = true; if (moved) { updateAvoid(); refreshAll(); afterChange(); } };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  function beginEdit(el) {
    const l = layerById(el.dataset.id); if (!l) return;
    select(l.id);
    try { el.contentEditable = 'plaintext-only'; } catch (_) { el.contentEditable = 'true'; }
    if (!el.isContentEditable) el.contentEditable = 'true';
    el.classList.add('is-editing'); el.focus();
    const sel = window.getSelection(); if (sel) sel.selectAllChildren(el);
    const finish = () => { el.removeEventListener('blur', finish); el.removeEventListener('keydown', onKey); el.contentEditable = 'false'; el.classList.remove('is-editing'); l.text = el.innerText.replace(/\n$/, ''); layerStyle(l); updateFrame(); updateAvoid(); rebuildLayersList(); refreshAll(); afterChange(); };
    const onKey = (ev) => { if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey))) { ev.preventDefault(); el.blur(); } };
    el.addEventListener('blur', finish); el.addEventListener('keydown', onKey);
  }

  /* ═══════════════════════ panel builder ═══════════════════════ */
  const fmt = (v, step) => { const dec = (String(step).split('.')[1] || '').length; return Number(v).toFixed(dec); };
  function field(desc, get, set) {
    const wrap = document.createElement('div'); wrap.className = 'field';
    const row = document.createElement('div'); row.className = 'field__row'; row.innerHTML = `<label>${desc.label}</label>`; wrap.appendChild(row);
    let input;
    if (desc.type === 'range') {
      const val = document.createElement('span'); val.className = 'val'; row.appendChild(val);
      input = document.createElement('input'); input.type = 'range'; input.min = desc.min; input.max = desc.max; input.step = desc.step; input.value = get();
      val.textContent = fmt(get(), desc.step) + (desc.unit || '');
      input.addEventListener('input', () => { val.textContent = fmt(input.value, desc.step) + (desc.unit || ''); set(Number(input.value)); });
      wrap.appendChild(input); wrap.update = () => { input.value = get(); val.textContent = fmt(get(), desc.step) + (desc.unit || ''); };
    } else if (desc.type === 'select') {
      input = document.createElement('select');
      desc.options.forEach((o) => { const op = document.createElement('option'); op.value = String(o.value); op.textContent = o.label; input.appendChild(op); });
      input.value = String(get());
      input.addEventListener('change', () => { const o = desc.options.find((x) => String(x.value) === input.value); set(o ? o.value : input.value); });
      wrap.appendChild(input); wrap.update = () => { input.value = String(get()); };
    } else if (desc.type === 'boolean') {
      input = document.createElement('div'); input.className = 'switch' + (get() ? ' on' : ''); input.setAttribute('role', 'switch'); input.tabIndex = 0;
      const flip = () => { input.classList.toggle('on'); set(input.classList.contains('on')); };
      input.addEventListener('click', flip); input.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
      row.appendChild(input); wrap.update = () => input.classList.toggle('on', !!get());
    } else if (desc.type === 'color') {
      const box = document.createElement('div'); box.className = 'color';
      const c = document.createElement('input'); c.type = 'color'; const t = document.createElement('input'); t.type = 'text'; t.placeholder = desc.placeholder || '';
      const sync = () => { const v = get() || ''; t.value = v; c.value = /^#[0-9a-f]{6}$/i.test(v) ? v : (desc.fallback?.() || '#888888'); };
      sync();
      c.addEventListener('input', () => { t.value = c.value; set(c.value); }); t.addEventListener('change', () => { set(t.value); sync(); });
      box.append(c, t);
      if (desc.clearable) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = 'Auto'; b.title = 'Use the page colour'; b.onclick = () => { set(''); sync(); }; box.appendChild(b); }
      wrap.appendChild(box); wrap.update = sync;
    } else if (desc.type === 'text' || desc.type === 'textarea') {
      input = document.createElement(desc.type === 'text' ? 'input' : 'textarea');
      if (desc.type === 'text') input.type = 'text'; if (desc.mono) input.classList.add('mono');
      input.value = get(); if (desc.placeholder) input.placeholder = desc.placeholder;
      input.addEventListener(desc.live ? 'input' : 'change', () => set(input.value));
      wrap.appendChild(input); wrap.update = () => { if (document.activeElement !== input) input.value = get(); };
    } else if (desc.type === 'segment') {
      input = document.createElement('div'); input.className = 'segf';
      desc.options.forEach((o) => { const b = document.createElement('button'); b.textContent = o.label; b.title = o.title || ''; b.onclick = () => { set(o.value); wrap.update(); }; b.dataset.v = String(o.value); input.appendChild(b); });
      wrap.appendChild(input); wrap.update = () => input.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(get()))); wrap.update();
    }
    if (desc.hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = desc.hint; wrap.appendChild(h); }
    return wrap;
  }
  const registry = [];
  const add = (parent, desc, get, set, tag) => { const f = field(desc, get, set); parent.appendChild(f); f.tag = tag; registry.push(f); return f; };
  const refreshAll = () => registry.forEach((f) => f.update && f.update());
  const dropTag = (tag) => registry.splice(0, registry.length, ...registry.filter((f) => f.tag !== tag));
  function section(parent, title, opts = {}) {
    const s = document.createElement(opts.collapsible ? 'details' : 'div'); s.className = opts.collapsible ? 'adv' : 'sec';
    s.innerHTML = opts.collapsible ? `<summary>${title}</summary><div class="sec__body"></div>` : `<h3>${title}</h3><div class="sec__body"></div>`;
    parent.appendChild(s); return s.lastElementChild;
  }
  const imSet = (patch) => { im.set(patch); afterChange(); };
  const pageSet = (patch) => { Object.assign(state.page, patch); applyPage(); renderLayers(); updateAvoid(); afterChange(); };
  function layerSet(l, patch) { Object.assign(l, patch); layerStyle(l); updateFrame(); updateAvoid(); afterChange(); }
  function afterChange() { writeHash(); }
  function showTab(name) { document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name)); document.querySelectorAll('.tabbody').forEach((b) => b.classList.toggle('on', b.dataset.tab === name)); }
  document.querySelectorAll('#tabs button').forEach((b) => b.onclick = () => showTab(b.dataset.tab));

  /* ═══════════════════════ template rail ═══════════════════════ */
  function thumbSvg(mode) {
    // sample the mode's own frame function on a small synthetic scene and project the cards
    const W = 440, H = 320, n = 8, P = 1200;
    const rand = ImageMotion.utils.rng(3);
    const R = Array.from({ length: n }, () => Array.from({ length: 8 }, rand));
    const cfg = { ...ImageMotion.defaults, count: n, cardWidth: 64, cardHeight: 80 };
    const cards = Array.from({ length: n }, () => ({ w: 64, h: 80 }));
    const ctx = { W, H, n, t: 1.7, cfg, p: { ...mode.defaults }, R, data: null, mouse: { x: 0, y: 0 }, cards, inst: { _ticker: null } };
    let rects = [];
    try {
      ctx.data = mode.layout ? mode.layout(ctx) : null;
      for (let i = 0; i < n; i++) {
        const pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1, img: null, depth: true, blur: null, w: null, h: null };
        mode.frame(ctx, i, pose);
        if (pose.o < 0.05) continue;
        const d = P - pose.z; if (d <= 10) continue;
        const k = P / d, w = (pose.w ?? 64) * pose.s * k * Math.max(0.15, Math.abs(Math.cos(pose.ry * Math.PI / 180))), h = (pose.h ?? 80) * pose.s * k * Math.max(0.15, Math.abs(Math.cos(pose.rx * Math.PI / 180)));
        rects.push({ x: W / 2 + pose.x * k, y: H / 2 + pose.y * k, w, h, rz: pose.rz, o: pose.o, z: pose.z, i });
      }
    } catch (_) { rects = []; }
    rects.sort((a, b) => a.z - b.z);
    const hues = [262, 330, 200, 150, 30, 290, 190, 350];
    const body = rects.map((r) => `<rect x="${(r.x - r.w / 2).toFixed(1)}" y="${(r.y - r.h / 2).toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="6" fill="hsl(${hues[r.i % hues.length]} 70% 60%)" opacity="${r.o.toFixed(2)}" transform="rotate(${r.rz.toFixed(1)} ${r.x.toFixed(1)} ${r.y.toFixed(1)})"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  }
  const CAT_ORDER = ['Rings & orbits', 'Carousels & decks', 'Grids', 'Collage & float', 'Belts & streams', 'Depth & 3D', 'Text & lists'];
  function buildRail(filter = '') {
    const list = $('tplList'); list.innerHTML = '';
    const q = filter.trim().toLowerCase();
    for (const cat of CAT_ORDER) {
      const modes = ImageMotion.modes.filter((m) => (m.category || 'Other') === cat && (!q || (m.name + ' ' + m.description + ' ' + m.id).toLowerCase().includes(q)));
      if (!modes.length) continue;
      const wrap = document.createElement('div'); wrap.className = 'cat'; wrap.innerHTML = `<h3>${cat}</h3>`;
      for (const m of modes) {
        const b = document.createElement('button'); b.className = 'tpl' + (im.mode.id === m.id ? ' on' : ''); b.dataset.mode = m.id;
        b.innerHTML = `<span class="thumb">${thumbSvg(m)}</span><span><span class="t">${m.name}</span><span class="d">${m.description}</span></span>`;
        b.onclick = () => selectMode(m.id);
        wrap.appendChild(b);
      }
      list.appendChild(wrap);
    }
  }
  function selectMode(id) {
    im.setMode(id); im.restart(); updateAvoid();
    document.querySelectorAll('.tpl').forEach((b) => b.classList.toggle('on', b.dataset.mode === id));
    $('tname').textContent = im.mode.name;
    buildMotionTab(); rebuildLayersList(); afterChange();
  }
  $('tplSearch').addEventListener('input', (e) => buildRail(e.target.value));

  /* ═══════════════════════ Motion tab ═══════════════════════ */
  function buildMotionTab() {
    const root = $('tab-motion'); root.innerHTML = ''; dropTag('motion');
    const m = im.mode;
    const head = document.createElement('div'); head.className = 'sec';
    head.innerHTML = `<h3>${m.name}</h3><p class="hint" style="margin:0 0 8px">${m.description}</p>`;
    const starter = document.createElement('select');
    starter.innerHTML = '<option value="">Starter looks…</option>' + Object.entries(STARTERS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
    starter.addEventListener('change', () => { if (starter.value) applyStarter(starter.value); starter.value = ''; });
    head.appendChild(starter);
    root.appendChild(head);
    const b1 = section(root, 'Settings');
    m.schema.forEach((desc) => add(b1, desc, () => im.params[desc.key], (v) => imSet({ params: { [desc.key]: v } }), 'motion'));
    if (m.usesLabels) { const h = document.createElement('p'); h.className = 'hint'; h.textContent = 'This template reads the “Ticker list” in the Media tab.'; b1.appendChild(h); }
    const rowb = document.createElement('div'); rowb.className = 'btnrow';
    rowb.innerHTML = '<button class="btn sm" id="bReset">Reset settings</button><button class="btn sm" id="bSeed">Shuffle layout</button>';
    b1.appendChild(rowb);
    rowb.querySelector('#bReset').onclick = () => { im.resetParams(); buildMotionTab(); afterChange(); };
    rowb.querySelector('#bSeed').onclick = () => { imSet({ seed: Math.floor(Math.random() * 9999) }); refreshAll(); };
    const b2 = section(root, 'Cards');
    add(b2, { type: 'range', label: 'Count', min: 1, max: 40, step: 1 }, () => im.cfg.count, (v) => imSet({ count: v }), 'motion');
    add(b2, { type: 'range', label: 'Card width', min: 40, max: 900, step: 2, unit: 'px' }, () => im.cfg.cardWidth, (v) => imSet({ cardWidth: v }), 'motion');
    add(b2, { type: 'range', label: 'Card height', min: 40, max: 900, step: 2, unit: 'px' }, () => im.cfg.cardHeight, (v) => imSet({ cardHeight: v }), 'motion');
    if (!m.uniform) {
      add(b2, { type: 'range', label: 'Size variation', min: 0, max: 0.6, step: 0.01 }, () => im.cfg.sizeVariance, (v) => imSet({ sizeVariance: v }), 'motion');
      add(b2, { type: 'boolean', label: 'Mix aspect ratios' }, () => im.cfg.aspectMix, (v) => imSet({ aspectMix: v }), 'motion');
    }
    const b3 = section(root, 'Timing');
    add(b3, { type: 'range', label: 'Speed', min: 0, max: 3, step: 0.05, unit: '×' }, () => im.cfg.speed, (v) => imSet({ speed: v }), 'motion');
    add(b3, { type: 'range', label: 'Intensity', min: 0, max: 2.5, step: 0.05, unit: '×', hint: 'Scales drift, wobble and lift' }, () => im.cfg.intensity, (v) => imSet({ intensity: v }), 'motion');
    add(b3, { type: 'select', label: 'Easing', options: [['inOutCubic', 'Natural'], ['inOutSine', 'Smooth'], ['outExpo', 'Snappy'], ['outBack', 'Bounce'], ['inOutQuint', 'Punchy'], ['outQuart', 'Ease out'], ['inOutBack', 'Elastic'], ['linear', 'Linear']].map(([value, label]) => ({ value, label })) }, () => im.cfg.easing, (v) => imSet({ easing: v }), 'motion');
    const b4 = section(root, 'Camera & depth', { collapsible: true });
    add(b4, { type: 'range', label: 'Perspective', min: 300, max: 4000, step: 10, unit: 'px' }, () => im.cfg.perspective, (v) => imSet({ perspective: v }), 'motion');
    add(b4, { type: 'range', label: 'Depth fade', min: 0, max: 1, step: 0.05 }, () => im.cfg.depthFade, (v) => imSet({ depthFade: v }), 'motion');
    add(b4, { type: 'range', label: 'Depth blur', min: 0, max: 12, step: 0.5, unit: 'px' }, () => im.cfg.depthBlur, (v) => imSet({ depthBlur: v }), 'motion');
    add(b4, { type: 'range', label: 'Mouse parallax', min: 0, max: 2, step: 0.05, hint: 'Preview only; exports use a still camera' }, () => im.cfg.parallax, (v) => imSet({ parallax: v }), 'motion');
    add(b4, { type: 'boolean', label: 'Lift card on hover' }, () => im.cfg.hoverLift, (v) => imSet({ hoverLift: v }), 'motion');
    add(b4, { type: 'boolean', label: 'Pause on hover' }, () => im.cfg.hoverPause, (v) => imSet({ hoverPause: v }), 'motion');
    add(b4, { type: 'range', label: 'Seed', min: 1, max: 9999, step: 1 }, () => im.cfg.seed, (v) => imSet({ seed: v }), 'motion');
  }
  function applyStarter(key) {
    const p = STARTERS[key];
    state.page.bg = JSON.parse(JSON.stringify(p.bg)); state.page.fg = p.fg;
    Object.assign(state.motion, p.motion);
    const blk = copyBlock(p.copy); state.layers = blk.layers; state.stack = blk.stack; state.selected = null;
    const k = sizeK();
    const cfg = { ...ImageMotion.defaults, ...p.im }; delete cfg.autoplay; delete cfg.avoidRects;
    cfg.cardWidth = Math.round(cfg.cardWidth * k); cfg.cardHeight = Math.round(cfg.cardHeight * k);
    const { params, mode, ...rest } = cfg;
    im.setMode(mode, params); im.resetParams();
    im.set({ ...rest, params, images: imagesFor(), labels: labelsFor() }); im.restart();
    applyPage(); renderMotionBox(); renderLayers(); stackGroup(state.stack);
    document.fonts?.ready.then(() => { stackGroup(state.stack); updateAvoid(); });
    updateAvoid(); buildRail($('tplSearch').value); $('tname').textContent = im.mode.name; buildMotionTab(); buildStyleTab(); rebuildLayersList(); rebuildLayerPanel(); refreshAll(); afterChange();
  }

  /* ═══════════════════════ Media tab ═══════════════════════ */
  function buildMediaTab() {
    const root = $('tab-media'); root.innerHTML = ''; dropTag('media');
    const b1 = section(root, 'Images');
    add(b1, { type: 'segment', label: 'Source', options: [{ value: 'people', label: 'Portraits' }, { value: 'upload', label: 'Uploads' }, { value: 'urls', label: 'URLs' }, { value: 'gradient', label: 'Blank' }] }, () => state.media.source, (v) => { state.media.source = v; imSet({ images: imagesFor() }); buildMediaTab(); }, 'media');
    if (state.media.source === 'upload') {
      const drop = document.createElement('div'); drop.className = 'drop'; drop.innerHTML = 'Drop images here or <u>choose files</u>';
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.hidden = true;
      drop.onclick = () => inp.click();
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); }); drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
      inp.addEventListener('change', () => addFiles(inp.files));
      b1.append(drop, inp);
      const grid = document.createElement('div'); grid.className = 'media-grid';
      uploads.forEach((u, i) => { const d = document.createElement('div'); d.className = 'm'; d.innerHTML = `<img src="${u.src}" alt=""><button title="Remove">×</button>`; d.querySelector('button').onclick = () => { uploads.splice(i, 1); imSet({ images: imagesFor() }); buildMediaTab(); }; grid.appendChild(d); });
      b1.appendChild(grid);
      const h = document.createElement('p'); h.className = 'hint'; h.textContent = uploads.length ? `${uploads.length} image${uploads.length > 1 ? 's' : ''}. Uploads live in this tab only; they are not part of the share link.` : 'Until you add files the bundled portraits are shown.'; b1.appendChild(h);
    }
    if (state.media.source === 'urls') add(b1, { type: 'textarea', label: 'Image URLs', mono: true, placeholder: 'https://…/a.jpg | Caption\nhttps://…/b.jpg', hint: 'One per line, optional “| caption”. Remote images need CORS headers to appear in exports.' }, () => state.media.urls, (v) => { state.media.urls = v; imSet({ images: imagesFor() }); }, 'media');
    if (state.media.source === 'people') { const h = document.createElement('p'); h.className = 'hint'; h.textContent = '12 demo portraits. Credits are in images/CREDITS.md; replace them with your own before shipping.'; b1.appendChild(h); }
    add(b1, { type: 'boolean', label: 'Show captions under cards', hint: 'Preview only — captions are not drawn in exports' }, () => im.cfg.showLabels, (v) => imSet({ showLabels: v }), 'media');
    const b2 = section(root, 'Ticker list');
    add(b2, { type: 'textarea', label: 'Words (one per line)', mono: true, placeholder: ImageMotion.defaultLabels.join('\n'), hint: 'Used by the List ticker template.' }, () => state.media.labels, (v) => { state.media.labels = v; imSet({ labels: labelsFor() }); }, 'media');
  }
  function addFiles(files) {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    let pending = list.length;
    list.forEach((f) => {
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        // downscale to a sane texture size and re-encode, so exports stay fast and links stay small
        const max = 1600; const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        uploads.push({ src: c.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88), label: f.name.replace(/\.[^.]+$/, '') });
        URL.revokeObjectURL(url);
        if (--pending === 0) { state.media.source = 'upload'; imSet({ images: imagesFor() }); buildMediaTab(); toast(`${list.length} image${list.length > 1 ? 's' : ''} added`); }
      };
      img.onerror = () => { if (--pending === 0) buildMediaTab(); };
      img.src = url;
    });
  }

  /* ═══════════════════════ Style tab ═══════════════════════ */
  function buildStyleTab() {
    const root = $('tab-style'); root.innerHTML = ''; dropTag('style');
    const bg = state.page.bg;
    const b1 = section(root, 'Background');
    add(b1, { type: 'segment', label: 'Type', options: [{ value: 'solid', label: 'Colour' }, { value: 'gradient', label: 'Gradient' }] }, () => bg.type, (v) => {
      if (v === 'gradient' && bg.type !== 'gradient') { const g = GRADIENTS[0]; Object.assign(bg, { type: 'gradient', kind: g.kind, angle: g.angle, stops: g.stops.map((s) => ({ ...s })) }); }
      else if (v === 'solid') { bg.type = 'solid'; bg.color = bg.color || (bg.stops?.[0]?.color ?? '#050507'); }
      pageSet({}); buildStyleTab();
    }, 'style');
    if (bg.type === 'solid') add(b1, { type: 'color', label: 'Colour' }, () => bg.color, (v) => { bg.color = v; pageSet({}); }, 'style');
    else {
      const sw = document.createElement('div'); sw.className = 'swatches';
      GRADIENTS.forEach((g) => { const b = document.createElement('button'); b.title = g.label; b.style.background = bgCss(g); b.className = bg.presetId === g.id ? 'on' : ''; b.onclick = () => { Object.assign(bg, { kind: g.kind, angle: g.angle, stops: g.stops.map((s) => ({ ...s })), presetId: g.id }); pageSet({}); buildStyleTab(); }; sw.appendChild(b); });
      b1.appendChild(sw);
      add(b1, { type: 'segment', label: 'Shape', options: [{ value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }] }, () => bg.kind, (v) => { bg.kind = v; bg.presetId = null; pageSet({}); refreshAll(); }, 'style');
      add(b1, { type: 'range', label: 'Angle', min: 0, max: 360, step: 1, unit: '°' }, () => bg.angle || 0, (v) => { bg.angle = v; bg.presetId = null; pageSet({}); }, 'style');
      const stopsEl = document.createElement('div'); stopsEl.className = 'stops';
      const renderStops = () => {
        stopsEl.innerHTML = '';
        bg.stops.forEach((s, i) => {
          const row = document.createElement('div'); row.className = 'stop';
          row.innerHTML = `<input type="color" value="${s.color}"><input type="range" min="0" max="1" step="0.01" value="${s.at}"><button class="btn sm" title="Remove">×</button>`;
          const [c, r, x] = row.children;
          c.addEventListener('input', () => { s.color = c.value; bg.presetId = null; pageSet({}); });
          r.addEventListener('input', () => { s.at = Number(r.value); bg.presetId = null; pageSet({}); });
          x.onclick = () => { if (bg.stops.length <= 2) return; bg.stops.splice(i, 1); bg.presetId = null; pageSet({}); renderStops(); };
          x.disabled = bg.stops.length <= 2;
          stopsEl.appendChild(row);
        });
      };
      renderStops(); b1.appendChild(stopsEl);
      const addStop = document.createElement('button'); addStop.className = 'btn sm'; addStop.textContent = '+ Add colour stop';
      addStop.onclick = () => { if (bg.stops.length >= 5) return; const last = bg.stops[bg.stops.length - 1]; bg.stops.push({ at: 1, color: last.color }); bg.stops[bg.stops.length - 2].at = round((bg.stops.length - 2) / (bg.stops.length - 1), 2); bg.presetId = null; pageSet({}); renderStops(); };
      b1.appendChild(addStop);
    }
    add(b1, { type: 'color', label: 'Text colour', hint: 'Text and buttons without their own colour follow this' }, () => state.page.fg, (v) => pageSet({ fg: v }), 'style');
    const b2 = section(root, 'Cards');
    add(b2, { type: 'range', label: 'Corner radius', min: 0, max: 120, step: 1, unit: 'px' }, () => im.cfg.radius, (v) => imSet({ radius: v }), 'style');
    add(b2, { type: 'boolean', label: 'Drop shadow' }, () => im.cfg.shadow, (v) => imSet({ shadow: v }), 'style');
  }

  /* ═══════════════════════ Text tab ═══════════════════════ */
  let layersList, selBody;
  function buildTextTab() {
    const root = $('tab-text'); root.innerHTML = '';
    const b = section(root, 'Layers');
    const row = document.createElement('div'); row.className = 'btnrow';
    row.innerHTML = '<button class="btn sm" data-add="heading">+ Heading</button><button class="btn sm" data-add="text">+ Text</button><button class="btn sm" data-add="eyebrow">+ Label</button><button class="btn sm" data-add="button">+ Button</button>';
    row.querySelectorAll('button').forEach((btn) => btn.onclick = () => addLayer(btn.dataset.add));
    b.appendChild(row);
    layersList = document.createElement('div'); layersList.className = 'layers'; b.appendChild(layersList);
    selBody = section(root, 'Selected');
    rebuildLayersList(); rebuildLayerPanel();
  }
  function addLayer(role) {
    const texts = { heading: 'New heading', text: 'Supporting copy goes here. Drag it anywhere.', eyebrow: 'Label', button: 'Call to action →' };
    const l = mkLayer(role, { text: texts[role], x: role === 'heading' || role === 'text' ? 20 : 44, y: 42 + state.layers.length * 4, w: 60, align: 'center' });
    state.layers.push(l); renderLayers(); select(l.id); rebuildLayersList(); updateAvoid(); afterChange();
  }
  function removeLayer(id) { state.layers = state.layers.filter((l) => l.id !== id); if (state.selected === id) state.selected = null; renderLayers(); rebuildLayersList(); rebuildLayerPanel(); updateAvoid(); afterChange(); }
  function duplicateLayer(id) { const l = layerById(id); if (!l) return; const c = { ...l, id: 'L' + (uid++), y: Math.min(95, l.y + 6) }; state.layers.push(c); renderLayers(); select(c.id); rebuildLayersList(); updateAvoid(); afterChange(); }
  function rebuildLayersList() {
    if (!layersList) return;
    layersList.innerHTML = '';
    const rows = [...state.layers].reverse().map((l) => ({ id: l.id, glyph: { heading: 'H', text: 'T', eyebrow: 'L', button: 'B' }[l.role] || 'T', name: l.text.split('\n')[0] || '(empty)', l }));
    rows.push({ id: 'motion', glyph: '▦', name: `Image animation · ${im.mode.name}` });
    rows.forEach((r) => {
      const row = document.createElement('div'); row.className = 'layer-row' + (state.selected === r.id ? ' on' : '');
      row.innerHTML = `<span class="glyph">${r.glyph}</span><span class="name"></span>`; row.querySelector('.name').textContent = r.name;
      if (r.l) {
        const eye = document.createElement('button'); eye.className = 'icon' + (r.l.visible ? '' : ' off'); eye.textContent = '◉'; eye.title = 'Show / hide';
        eye.onclick = (e) => { e.stopPropagation(); r.l.visible = !r.l.visible; renderLayers(); updateAvoid(); rebuildLayersList(); afterChange(); };
        const del = document.createElement('button'); del.className = 'icon'; del.textContent = '×'; del.title = 'Delete layer'; del.onclick = (e) => { e.stopPropagation(); removeLayer(r.id); };
        row.append(eye, del);
      }
      row.onclick = () => select(r.id);
      layersList.appendChild(row);
    });
  }
  function anchorGrid(apply) {
    const wrap = document.createElement('div'); wrap.className = 'anchor-row';
    const g = document.createElement('div'); g.className = 'anchor';
    [['tl', 'Top left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['ml', 'Middle left'], ['mc', 'Centre'], ['mr', 'Middle right'], ['bl', 'Bottom left'], ['bc', 'Bottom centre'], ['br', 'Bottom right']].forEach(([k, t]) => { const b = document.createElement('button'); b.title = t; b.onclick = () => apply(k); g.appendChild(b); });
    wrap.appendChild(g); return wrap;
  }
  function placeRect(id, anchor, margin = 6) {
    const c = canvasRect(); const r = rectOf(id); if (!r) return;
    const wp = (r.w / c.width) * 100, hp = (r.h / c.height) * 100;
    const xs = { l: margin, c: 50 - wp / 2, r: 100 - margin - wp }, ys = { t: margin + 2, m: 50 - hp / 2, b: 100 - margin - 2 - hp };
    const target = id === 'motion' ? state.motion : layerById(id);
    const [v, h] = anchor.split('');
    if (anchor === 'mc' && id === 'motion') Object.assign(target, { x: 0, y: 0, w: 100, h: 100 });
    else { target.x = round(xs[h]); target.y = round(ys[v]); }
    if (id === 'motion') renderMotionBox(); else layerStyle(target);
    updateFrame(); updateAvoid(); refreshAll(); afterChange();
  }
  function rebuildLayerPanel() {
    if (!selBody) return;
    dropTag('layer'); selBody.innerHTML = ''; rebuildLayersList();
    const sel = state.selected;
    const addL = (desc, get, set) => add(selBody, desc, get, set, 'layer');
    if (!sel) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Click a text layer or the animation on the canvas, or pick one from the list above.'; selBody.appendChild(p); return; }
    if (sel === 'motion') {
      const m = state.motion; const ms = (patch) => { Object.assign(m, patch); renderMotionBox(); updateFrame(); updateAvoid(); afterChange(); };
      addL({ type: 'range', label: 'Left', min: -50, max: 100, step: .5, unit: '%' }, () => m.x, (v) => ms({ x: v }));
      addL({ type: 'range', label: 'Top', min: -50, max: 100, step: .5, unit: '%' }, () => m.y, (v) => ms({ y: v }));
      addL({ type: 'range', label: 'Width', min: 10, max: 200, step: .5, unit: '%' }, () => m.w, (v) => ms({ w: v }));
      addL({ type: 'range', label: 'Height', min: 10, max: 200, step: .5, unit: '%' }, () => m.h, (v) => ms({ h: v }));
      const row = anchorGrid((k) => placeRect('motion', k, 4));
      const quick = document.createElement('div'); quick.className = 'quick';
      [['Full bleed', { x: 0, y: 0, w: 100, h: 100 }], ['Left half', { x: 0, y: 0, w: 52, h: 100 }], ['Right half', { x: 48, y: 0, w: 52, h: 100 }], ['Top band', { x: 0, y: 0, w: 100, h: 46 }], ['Bottom band', { x: 0, y: 54, w: 100, h: 46 }], ['Inset', { x: 6, y: 8, w: 88, h: 84 }]].forEach(([label, box]) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { ms(box); refreshAll(); }; quick.appendChild(b); });
      row.appendChild(quick); selBody.appendChild(row);
      const h = document.createElement('p'); h.className = 'hint'; h.textContent = 'The box may extend past the canvas: cards clip at its edge, so oversize it for bleed. Motion settings live in the Motion tab.'; selBody.appendChild(h);
      return;
    }
    const l = layerById(sel); if (!l) return;
    const ls = (patch) => layerSet(l, patch);
    addL({ type: 'textarea', label: 'Text', live: true }, () => l.text, (v) => { ls({ text: v }); rebuildLayersList(); });
    addL({ type: 'select', label: 'Font', options: FONTS.map((f) => ({ value: f.name, label: f.name })) }, () => l.font, (v) => ls({ font: v }));
    addL({ type: 'range', label: 'Weight', min: 100, max: 900, step: 100 }, () => l.weight, (v) => ls({ weight: v }));
    addL({ type: 'range', label: 'Size', min: 8, max: 400, step: 1, unit: 'px' }, () => l.size, (v) => ls({ size: v }));
    addL({ type: 'range', label: 'Letter spacing', min: -0.1, max: 0.5, step: 0.005, unit: 'em' }, () => l.spacing, (v) => ls({ spacing: v }));
    addL({ type: 'range', label: 'Line height', min: 0.8, max: 2.2, step: 0.02 }, () => l.lineHeight, (v) => ls({ lineHeight: v }));
    addL({ type: 'segment', label: 'Align', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] }, () => l.align, (v) => ls({ align: v }));
    addL({ type: 'segment', label: 'Case', options: [{ value: 'none', label: 'Aa' }, { value: 'uppercase', label: 'AA' }, { value: 'capitalize', label: 'Aa Bb' }] }, () => l.transform, (v) => ls({ transform: v }));
    addL({ type: 'boolean', label: 'Italic' }, () => l.italic, (v) => ls({ italic: v }));
    if (l.kind === 'button') {
      addL({ type: 'color', label: 'Background', clearable: true, placeholder: 'page text colour', fallback: () => state.page.fg }, () => l.bg, (v) => ls({ bg: v }));
      addL({ type: 'color', label: 'Text colour', clearable: true, placeholder: 'page background', fallback: () => '#111111' }, () => l.fgColor, (v) => ls({ fgColor: v }));
      addL({ type: 'range', label: 'Padding X', min: 0, max: 80, step: 1, unit: 'px' }, () => l.padX, (v) => ls({ padX: v }));
      addL({ type: 'range', label: 'Padding Y', min: 0, max: 60, step: 1, unit: 'px' }, () => l.padY, (v) => ls({ padY: v }));
      addL({ type: 'range', label: 'Corner radius', min: 0, max: 999, step: 1, unit: 'px' }, () => l.radius, (v) => ls({ radius: v }));
    } else addL({ type: 'color', label: 'Colour', clearable: true, placeholder: 'page text colour', fallback: () => state.page.fg }, () => l.color, (v) => ls({ color: v }));
    addL({ type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.02 }, () => l.opacity, (v) => ls({ opacity: v }));
    addL({ type: 'boolean', label: 'Fit width to text' }, () => l.auto, (v) => { ls({ auto: v }); refreshAll(); });
    addL({ type: 'range', label: 'Width', min: 5, max: 100, step: .5, unit: '%' }, () => l.w, (v) => ls({ w: v, auto: false }));
    addL({ type: 'range', label: 'Left', min: -20, max: 100, step: .1, unit: '%' }, () => l.x, (v) => ls({ x: v }));
    addL({ type: 'range', label: 'Top', min: -20, max: 100, step: .1, unit: '%' }, () => l.y, (v) => ls({ y: v }));
    const row = anchorGrid((k) => placeRect(sel, k));
    const quick = document.createElement('div'); quick.className = 'quick';
    [['Centre horizontally', () => { const c = canvasRect(), r = rectOf(sel); ls({ x: round(50 - (r.w / c.width) * 50) }); }],
     ['Centre vertically', () => { const c = canvasRect(), r = rectOf(sel); ls({ y: round(50 - (r.h / c.height) * 50) }); }],
     ['Duplicate', () => duplicateLayer(sel)], ['Delete layer', () => removeLayer(sel)]].forEach(([label, fn], i) => { const b = document.createElement('button'); b.textContent = label; if (i === 3) b.classList.add('danger'); b.onclick = () => { fn(); refreshAll(); }; quick.appendChild(b); });
    row.appendChild(quick); selBody.appendChild(row);
  }

  /* ═══════════════════════ Canvas tab & ratio bar ═══════════════════════ */
  function buildRatioSeg() {
    const seg = $('ratioSeg'); seg.innerHTML = '';
    for (const s of SIZES) { const b = document.createElement('button'); b.textContent = s.id; b.title = `${s.label} · ${s.w}×${s.h}`; b.classList.toggle('on', state.canvas.preset === s.id); b.onclick = () => setCanvasSize(s.w, s.h, s.id); seg.appendChild(b); }
    const c = document.createElement('button'); c.textContent = state.canvas.preset === 'custom' ? `${state.canvas.w}×${state.canvas.h}` : 'Custom'; c.classList.toggle('on', state.canvas.preset === 'custom'); c.onclick = () => { showTab('canvas'); }; seg.appendChild(c);
  }
  function buildCanvasTab() {
    const root = $('tab-canvas'); root.innerHTML = ''; dropTag('canvas');
    const b1 = section(root, 'Canvas size');
    const sizes = document.createElement('div'); sizes.className = 'sizes';
    for (const s of SIZES) {
      const b = document.createElement('button'); b.classList.toggle('on', state.canvas.preset === s.id);
      const ar = s.w / s.h; const bw = ar >= 1 ? 30 : 30 * ar, bh = ar >= 1 ? 30 / ar : 30;
      b.innerHTML = `<span class="ar" style="width:${bw}px;height:${bh}px"></span><span>${s.id}</span><small>${s.label}<br>${s.w}×${s.h}</small>`;
      b.onclick = () => { setCanvasSize(s.w, s.h, s.id); buildCanvasTab(); };
      sizes.appendChild(b);
    }
    b1.appendChild(sizes);
    const two = document.createElement('div'); two.className = 'two';
    const w = field({ type: 'text', label: 'Width (px)' }, () => state.canvas.w, () => {}); const h = field({ type: 'text', label: 'Height (px)' }, () => state.canvas.h, () => {});
    const wi = w.querySelector('input'), hi = h.querySelector('input'); wi.type = hi.type = 'number'; wi.min = hi.min = 240; wi.max = hi.max = 4096;
    const applyCustom = () => { const cw = clamp(Number(wi.value) || state.canvas.w, 240, 4096), ch = clamp(Number(hi.value) || state.canvas.h, 240, 4096); setCanvasSize(cw, ch, 'custom'); buildCanvasTab(); };
    wi.addEventListener('change', applyCustom); hi.addEventListener('change', applyCustom);
    two.append(w, h); b1.appendChild(two);
    const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'This is the design size. Exports can render it at 1×, 1080p, 1440p or 4K. Changing the size scales text and cards to keep the look.'; b1.appendChild(hint);
    const b2 = section(root, 'Text safe zones');
    add(b2, { type: 'boolean', label: 'Keep cards off the text', hint: 'Collage templates route around every visible text layer' }, () => state.page.keepOff, (v) => pageSet({ keepOff: v }), 'canvas');
    add(b2, { type: 'range', label: 'Clearance', min: 0, max: 200, step: 2, unit: 'px' }, () => state.page.zonePad, (v) => pageSet({ zonePad: v }), 'canvas');
    add(b2, { type: 'boolean', label: 'Show zones' }, () => state.page.showZones, (v) => pageSet({ showZones: v }), 'canvas');
    const b3 = section(root, 'Editing');
    add(b3, { type: 'boolean', label: 'Snap while dragging', hint: 'Hold Alt to drag freely' }, () => state.page.snap, (v) => pageSet({ snap: v }), 'canvas');
  }

  /* ═══════════════════════ export ═══════════════════════ */
  function exportConfig(withLayout) {
    const c = im.getConfig();
    const out = { mode: c.mode };
    for (const k of Object.keys(ImageMotion.defaults)) {
      if (['mode', 'images', 'labels', 'autoplay', 'avoidRects', 'avoidPad', 'avoidCenter'].includes(k)) continue;
      if (JSON.stringify(c[k]) !== JSON.stringify(ImageMotion.defaults[k])) out[k] = c[k];
    }
    const md = ImageMotion.getMode(c.mode).defaults; const params = {};
    for (const k of Object.keys(c.params)) if (JSON.stringify(c.params[k]) !== JSON.stringify(md[k])) params[k] = c.params[k];
    if (Object.keys(params).length) out.params = params;
    if (withLayout) {
      if (state.page.keepOff) { out.avoidRects = computeAvoidRects().map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, round(v, 3)]))); out.avoidPad = state.page.zonePad; } else out.avoidCenter = false;
      if (state.media.source !== 'gradient') out.images = im.cfg.images.map((x) => (x.src && x.src.startsWith('data:') ? { ...x, src: '/path/to/' + (x.label || 'image').replace(/\W+/g, '-').toLowerCase() + '.jpg' } : x));
    }
    if (im.cfg.labels) out.labels = im.cfg.labels;
    return out;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function embedSnippet() {
    const used = [...new Set(state.layers.filter((l) => l.visible).map((l) => l.font))].map((n) => FONTS.find((f) => f.name === n)).filter((f) => f && f.q);
    const fontLink = used.length ? `<link href="https://fonts.googleapis.com/css2?${used.map((f) => 'family=' + f.q).join('&')}&display=swap" rel="stylesheet">\n` : '';
    const m = state.motion; const vis = state.layers.filter((l) => l.visible);
    const heading = vis.filter((l) => l.kind === 'text').sort((a, b) => b.size - a.size)[0];
    const css = [
      `.hero { position: relative; aspect-ratio: ${state.canvas.w} / ${state.canvas.h}; overflow: hidden; background: ${bgCss(state.page.bg)}; color: ${state.page.fg}; container-type: inline-size; }`,
      `.hero__motion { position: absolute; left: ${m.x}%; top: ${m.y}%; width: ${m.w}%; height: ${m.h}%; }`,
      `.hero__layer { position: absolute; margin: 0; white-space: pre-wrap; z-index: 1; }`,
      `.hero__button { display: inline-flex; align-items: center; text-decoration: none; white-space: nowrap; }`,
    ];
    const html = [];
    const cq = (px) => `${round((px / state.canvas.w) * 100, 3)}cqw`;              // px of the design → container-query width units
    vis.forEach((l, i) => {
      const cls = `hero__l${i + 1}`;
      const rules = [`left: ${l.x}%`, `top: ${l.y}%`, l.auto ? 'width: max-content; max-width: 100%' : `width: ${l.w}%`, `text-align: ${l.align}`, `font: ${l.italic ? 'italic ' : ''}${l.weight} ${cq(l.size)}/${l.lineHeight} ${fontCss(l.font)}`, `letter-spacing: ${l.spacing}em`];
      if (l.transform !== 'none') rules.push(`text-transform: ${l.transform}`);
      if (l.opacity !== 1) rules.push(`opacity: ${l.opacity}`);
      if (l.kind === 'button') rules.push(`background: ${l.bg || state.page.fg}`, `color: ${l.fgColor || '#111'}`, `padding: ${cq(l.padY)} ${cq(l.padX)}`, `border-radius: ${l.radius}px`, `justify-content: ${l.align === 'left' ? 'flex-start' : l.align === 'right' ? 'flex-end' : 'center'}`);
      else if (l.color) rules.push(`color: ${l.color}`);
      css.push(`.${cls} { ${rules.join('; ')}; }`);
      const tag = l.kind === 'button' ? 'a' : l === heading ? 'h1' : 'p';
      html.push(`  <${tag} class="hero__layer${l.kind === 'button' ? ' hero__button' : ''} ${cls}"${tag === 'a' ? ' href="#"' : ''}>${esc(l.text)}</${tag}>`);
    });
    const cfg = JSON.stringify(exportConfig(true), null, 2).replace(/\n/g, '\n  ');
    return `<link rel="stylesheet" href="image-motion/image-motion.css">\n${fontLink}<style>\n${css.join('\n')}\n</style>\n\n<section class="hero">\n  <div class="hero__motion" id="hero-motion"></div>\n${html.join('\n')}\n</section>\n\n<script src="image-motion/image-motion.js"><\/script>\n<script>\n  // Type sizes use cqw so they scale with the hero; card sizes are px for a ${state.canvas.w}px-wide hero.\n  const hero = ImageMotion.mount('#hero-motion', ${cfg});\n<\/script>`;
  }
  function copy(text, msg) { navigator.clipboard?.writeText(text).then(() => toast(msg), () => toast('Copy failed — select the code manually')); }
  let toastTimer; function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800); }

  $('btnCode').onclick = () => { $('codeEmbed').textContent = embedSnippet(); $('codeDlg').showModal(); };
  $('codeClose').onclick = () => $('codeDlg').close();
  $('copyEmbed').onclick = () => copy(embedSnippet(), 'Hero HTML copied');
  $('copyCfg').onclick = () => copy(JSON.stringify(exportConfig(true), null, 2), 'Config copied');
  $('btnLink').onclick = () => { writeHash(); setTimeout(() => copy(location.href, 'Link copied'), 300); };

  /* — export dialog — */
  const exp = { format: 'mp4', res: '1080', fps: 30, duration: state.loop, start: 0, quality: 'high' };
  let exportAbort = null;
  function resOptions() {
    const long = Math.max(state.canvas.w, state.canvas.h);
    const opts = [{ value: 'canvas', label: `Canvas · ${state.canvas.w}×${state.canvas.h}`, scale: 1 }];
    for (const [v, target, name] of [['720', 1280, '720p'], ['1080', 1920, '1080p'], ['1440', 2560, '1440p · 2K'], ['2160', 3840, '2160p · 4K']]) {
      const s = target / long; const w = Math.round(state.canvas.w * s) & ~1, h = Math.round(state.canvas.h * s) & ~1;
      if (exp.format === 'gif' && target > 1920) continue;
      opts.push({ value: v, label: `${name} · ${w}×${h}`, scale: s });
    }
    return opts;
  }
  function buildExportDialog() {
    const body = $('dlgBody'); body.innerHTML = '';
    const sup = ImageMotionExport.support();
    const fields = [];
    const f1 = field({ type: 'segment', label: 'Format', options: [{ value: 'mp4', label: 'MP4' }, { value: 'webm', label: 'WebM' }, { value: 'gif', label: 'GIF' }] }, () => exp.format, (v) => { exp.format = v; if (v === 'gif') { exp.fps = 20; if (['1440', '2160'].includes(exp.res)) exp.res = '1080'; } else if (exp.fps === 20) exp.fps = 30; buildExportDialog(); });
    const opts = resOptions(); if (!opts.find((o) => o.value === exp.res)) exp.res = 'canvas';
    const f2 = field({ type: 'select', label: 'Resolution', options: opts }, () => exp.res, (v) => { exp.res = v; });
    const f3 = field({ type: 'select', label: 'Frame rate', options: (exp.format === 'gif' ? [10, 20, 25] : [24, 25, 30, 50, 60]).map((v) => ({ value: v, label: v + ' fps' })) }, () => exp.fps, (v) => { exp.fps = v; });
    const two = document.createElement('div'); two.className = 'two';
    const f4 = field({ type: 'text', label: 'Duration (s)' }, () => exp.duration, (v) => { exp.duration = clamp(Number(v) || 1, 0.5, 120); });
    const f5 = field({ type: 'text', label: 'Start at (s)' }, () => exp.start, (v) => { exp.start = Math.max(0, Number(v) || 0); });
    two.append(f4, f5);
    const f6 = field({ type: 'select', label: 'Quality', options: [{ value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'max', label: 'Maximum' }] }, () => exp.quality, (v) => { exp.quality = v; });
    body.append(f1, f2, f3, two);
    if (exp.format !== 'gif') body.appendChild(f6);
    const note = document.createElement('p'); note.className = 'hint';
    if (exp.format === 'gif') note.textContent = 'GIFs are capped at 1080p and 256 colours per frame; keep them short.';
    else if (!sup.webcodecs) note.textContent = exp.format === 'mp4' ? 'MP4 export needs WebCodecs (Chrome or Edge). WebM will fall back to a real-time recording here.' : 'No WebCodecs here: WebM is recorded in real time at preview quality.';
    else note.textContent = 'Frames are rendered one by one from the same timeline as the preview, so the file matches what you see. Set the duration to a multiple of the template\'s cycle for a seamless loop.';
    body.appendChild(note);
    const prog = document.createElement('div'); prog.className = 'progress'; prog.innerHTML = '<i></i>'; prog.hidden = true;
    const status = document.createElement('div'); status.className = 'status';
    const row = document.createElement('div'); row.className = 'btnrow';
    const go = document.createElement('button'); go.className = 'btn primary'; go.textContent = 'Render & save';
    const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancel'; cancel.hidden = true;
    row.append(go, cancel); body.append(prog, status, row);
    go.onclick = async () => {
      const scale = opts.find((o) => o.value === exp.res)?.scale || 1;
      const renderer = new ImageMotionRenderer({ im, stage: canvas, width: state.canvas.w, height: state.canvas.h, scale });
      const ac = new AbortController(); exportAbort = ac;
      go.disabled = true; cancel.hidden = false; prog.hidden = false; status.className = 'status'; status.textContent = 'Rendering…';
      const t0 = performance.now();
      try {
        const blob = await ImageMotionExport.record({
          im, renderer, format: exp.format, fps: exp.fps, duration: exp.duration, start: exp.start, quality: exp.quality, background: state.page.bg, signal: ac.signal,
          onProgress: (p, stage) => { prog.firstElementChild.style.width = (p * 100).toFixed(1) + '%'; status.textContent = stage === 'finishing' ? 'Finishing file…' : `Rendering ${Math.round(p * 100)}% · ${renderer.canvas.width}×${renderer.canvas.height}`; },
        });
        const secs = ((performance.now() - t0) / 1000).toFixed(1);
        const name = `imagemotion-${im.mode.id}-${renderer.canvas.width}x${renderer.canvas.height}.${exp.format}`;
        status.textContent = `Done in ${secs}s · ${(blob.size / 1048576).toFixed(1)} MB · saving…`;
        const r = await ImageMotionExport.save(blob, name);
        status.className = 'status ' + (r === 'declined' ? '' : 'ok'); status.textContent = r === 'declined' ? 'Save cancelled.' : `Saved ${name} · ${(blob.size / 1048576).toFixed(1)} MB`;
      } catch (e) {
        status.className = 'status err'; status.textContent = e && e.code === 'cancelled' ? 'Export cancelled.' : (e && e.message) || String(e);
        console.error(e);
      } finally { renderer.destroy(); go.disabled = false; cancel.hidden = true; exportAbort = null; }
    };
    cancel.onclick = () => exportAbort?.abort();
  }
  $('btnExport').onclick = () => { exp.duration = state.loop; buildExportDialog(); $('exportDlg').showModal(); };
  $('dlgClose').onclick = () => { exportAbort?.abort(); $('exportDlg').close(); };

  /* ═══════════════════════ play bar ═══════════════════════ */
  const scrub = $('scrub'), timeEl = $('time'), loopInp = $('loopLen'), btnPlay = $('btnPlay');
  let scrubbing = false;
  const syncPlay = () => { btnPlay.textContent = im.playing ? '⏸' : '▶'; };
  btnPlay.onclick = () => { im.toggle(); syncPlay(); };
  $('btnRestart').onclick = () => im.restart();
  scrub.addEventListener('pointerdown', () => { scrubbing = true; });
  scrub.addEventListener('input', () => { im.seek(Number(scrub.value)); });
  scrub.addEventListener('pointerup', () => { scrubbing = false; });
  loopInp.value = state.loop;
  loopInp.addEventListener('change', () => { state.loop = clamp(Number(loopInp.value) || 10, 1, 120); scrub.max = state.loop; afterChange(); });
  scrub.max = state.loop;
  im.on('frame', () => { const t = im.t % state.loop; if (!scrubbing) scrub.value = t; timeEl.textContent = `${t.toFixed(2)} / ${state.loop.toFixed(2)} s`; });
  im.on('change', () => { renderExportHint(); });
  function renderExportHint() {}

  /* ═══════════════════════ top bar & keys ═══════════════════════ */
  $('btnRail').onclick = () => { document.body.classList.toggle('rail-hidden'); fitCanvas(); updateFrame(); };
  $('btnPanel').onclick = () => { document.body.classList.toggle('panel-hidden'); fitCanvas(); updateFrame(); };
  $('btnFit').onclick = () => { fitCanvas(); updateFrame(); };
  window.addEventListener('keydown', (e) => {
    const a = document.activeElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(a?.tagName) || a?.isContentEditable || document.querySelector('dialog[open]')) return;
    const sel = state.selected;
    if (e.key === 'Escape') { select(null); return; }
    if (e.key === ' ') { e.preventDefault(); im.toggle(); syncPlay(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel && sel !== 'motion') { e.preventDefault(); removeLayer(sel); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && sel && sel !== 'motion') { e.preventDefault(); duplicateLayer(sel); return; }
    if (e.key.startsWith('Arrow') && sel) {
      e.preventDefault();
      const c = canvasRect(); const step = (e.shiftKey ? 10 : 1);
      const dx = (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0) / c.width * 100, dy = (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) / c.height * 100;
      const t = sel === 'motion' ? state.motion : layerById(sel);
      t.x = round(t.x + dx, 2); t.y = round(t.y + dy, 2);
      if (sel === 'motion') renderMotionBox(); else layerStyle(t);
      updateFrame(); updateAvoid(); refreshAll(); afterChange(); return;
    }
    if (e.key.toLowerCase() === 'h') $('btnPanel').click();
    if (e.key.toLowerCase() === 't') $('btnRail').click();
    if (e.key.toLowerCase() === 'r') im.restart();
    if (e.key.toLowerCase() === 'e') $('btnExport').click();
  });

  /* ═══════════════════════ first paint ═══════════════════════ */
  buildRail(); buildRatioSeg(); buildMotionTab(); buildMediaTab(); buildStyleTab(); buildTextTab(); buildCanvasTab();
  $('tname').textContent = im.mode.name; syncPlay();
  if (state.stack) { stackGroup(state.stack); document.fonts?.ready.then(() => { stackGroup(state.stack); updateAvoid(); afterChange(); }); }
  fitCanvas(); updateAvoid();
  window.imStudio = { state, uploads, exportConfig, embedSnippet };
})();
