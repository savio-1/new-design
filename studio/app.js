/* Collage Studio — editor core.
   Owns the document, the Konva stage, selection, snapping, transforms, text
   editing, crop mode, history and import. The panels live in ui.js and talk to
   this module through window.Studio. */
(function () {
  'use strict';

  const R = window.StudioRender;
  const S = window.Studio = {};
  const $ = (q, r = document) => r.querySelector(q);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = (p = 'e') => p + Math.random().toString(36).slice(2, 10);
  S.uid = uid;
  S.clone = clone;

  /* ───────────────────────── events ───────────────────────── */

  const listeners = {};
  S.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  const emit = (ev, ...a) => (listeners[ev] || []).forEach(f => f(...a));

  /* ───────────────────────── element defaults ───────────────────────── */

  const now = new Date();
  const BASE = {
    x: 0, y: 0, width: 200, height: 200, rotation: 0, opacity: 1, locked: false, hidden: false, blend: 'normal', name: '',
    shadow: { on: false, color: '#000000', opacity: 0.28, blur: 24, x: 0, y: 12 },
  };
  const DEFAULTS = {
    text: {
      text: 'Your text', fontFamily: 'Instrument Serif', fontSize: 96, fontWeight: 400, italic: false, fill: '#1d1b18',
      fill2: '#5b4cf5', gradient: 'none', gradAngle: 90, align: 'center', lineHeight: 1.1, letterSpacing: 0,
      uppercase: false, underline: false, strike: false, autoWidth: true, curve: 0,
      bg: { style: 'none', color: '#f7d046', padX: 18, padY: 6, radius: 0, gap: 6, borderWidth: 0, borderColor: '#1d1b18' },
      stroke: { width: 0, color: '#1d1b18' },
      echo: { on: false, color: '#1d1b18', dx: 0.05, dy: 0.05, steps: 1 },
    },
    image: {
      assetId: null, crop: { zoom: 1, x: 0.5, y: 0.5 }, filters: {}, flipX: false, flipY: false, placeholder: null,
      frame: { style: 'none', color: '#ffffff', size: 22, radius: 0, bottom: 3.6, texture: 0 },
      outline: { on: false, color: '#ffffff', width: 12 },
    },
    sticker: { stickerId: null, colors: null, flipX: false, flipY: false, outline: { on: false, color: '#ffffff', width: 10 } },
    shape: {
      shape: 'rect', fill: '#7fa88a', fill2: '#2f5d50', gradient: 'none', gradAngle: 180, stroke: '#1d1b18', strokeWidth: 0,
      dash: 0, radius: 0, points: 5, inner: 0.48, depth: 0.1, seed: 3, texture: 0, flipX: false, flipY: false,
      pattern: { type: 'none', color: 'rgba(29,27,24,0.18)', size: 32, thick: 1.5, opacity: 1 },
      arrowStart: false, arrowEnd: false, wavy: false,
    },
    calendar: {
      layout: 'grid', year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), startMonday: false, marked: [],
      markStyle: 'circle', color: '#1d1b18', accent: '#e4572e', accentText: '#ffffff', lineColor: '', cellColor: '',
      bgColor: '', radius: 0, cellRadius: 0.2, titleFont: 'Instrument Serif', titleWeight: 400, bodyFont: 'Instrument Sans',
      bodyWeight: 500, showTitle: true, showYear: true, titleAlign: 'left', monthCase: 'normal', dayFormat: 'short',
      showLines: true, weekendAccent: false, numberPos: 'center', showAdjacent: false, headerLine: false, titleSpacing: 0, titleSize: 0.17,
    },
    badge: {
      shape: 'circle', fill: '#d7ef5a', borderWidth: 0, borderColor: '#1d1b18', ringText: '5+ years experience', ringFont: 'Bricolage Grotesque',
      ringWeight: 500, ringSize: 0.1, ringSpacing: 0.06, ringRadius: 0.72, ringStart: 0, ringRepeat: false, ringFill: true, ringUpper: true,
      ringSep: '  •  ', textColor: '#1f3fd1', center: 'asterisk', centerText: 'NEW', centerFont: 'Bricolage Grotesque', centerWeight: 700,
      centerSize: 0.26, centerColor: '', innerRing: false,
    },
    ribbon: {
      path: 'wave', points: null, closed: false, sharp: false, thickness: 90, color: '#e9f07a', ends: 'round', line: false,
      arrowEnd: false, arrowStart: false, headStyle: 'open', dash: 0, border: { width: 0, color: '#1d1b18' },
      text: 'your words travel along the ribbon', repeat: true, sep: '   ✦   ', fontFamily: 'Space Mono', fontWeight: 700, italic: false,
      fontSize: 34, textColor: '#1d1b18', letterSpacing: 0.04, uppercase: false, offset: 0, flip: false, align: 'center', textShift: 0,
    },
    camera: {
      style: 'iphone', grid: true, lens: true, lensColor: '#000000', brackets: true, color: '#ffffff', accent: '#ffd60a',
      modes: 'CINEMATIC, VIDEO, PHOTO, PORTRAIT, PANO', activeMode: 2, zooms: '0.5, 1×, 2, 5', activeZoom: 1, thumb: true,
      rec: 'REC', timecode: '00:12:47', date: 'OCT 10 2026', mode: 'SP ▶', scanlines: true, fontFamily: '',
    },
    nature: { kind: 'hill', colors: null, seed: 1, density: 1, params: {}, flipX: false },
    flashes: {
      pack: 'hustle', images: [], rate: 8, blur: 60, angle: 0, drift: 50, zoom: 30, overlap: 0, strobe: 0, gaps: 0,
      tone: 'color', tint: '#ff5a1f', contrast: 10, saturation: 0, seed: 0, still: 0,
    },
    checklist: {
      items: '[x] Morning walk\n[ ] Water the plants\n[ ] Call grandma\n[ ] Finish moodboard', fontFamily: 'Caveat', fontSize: 48,
      fontWeight: 500, italic: false, fill: '#1d1b18', lineHeight: 1.55, boxStyle: 'square', boxColor: '#1d1b18', checkColor: '#e4572e',
      fillChecked: false, checkOnFill: '#ffffff', strikeChecked: true, dimChecked: true, ruled: false,
    },
  };
  S.DEFAULTS = DEFAULTS;

  function deepMerge(a, b) {
    if (!b) return a;
    for (const k of Object.keys(b)) {
      const v = b[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], v);
      else a[k] = Array.isArray(v) ? v.slice() : (v && typeof v === 'object' ? clone(v) : v);
    }
    return a;
  }
  S.deepMerge = deepMerge;
  S.mk = function (type, over = {}) {
    const el = deepMerge(deepMerge(clone(BASE), clone(DEFAULTS[type] || {})), over);
    el.type = type;
    el.id = uid();
    return el;
  };
  // fill in defaults for elements loaded from templates / older files
  function normalize(el) {
    const full = deepMerge(deepMerge(clone(BASE), clone(DEFAULTS[el.type] || {})), el);
    if (!full.id) full.id = uid();
    return full;
  }

  /* ───────────────────────── document & state ───────────────────────── */

  let doc = blankDoc(1080, 1350, '#f6f1e7');
  let assets = {};
  // built-in demo photos (speed-flash templates) are always available under fixed ids
  if (window.StudioFlashes && window.StudioFlashes.DEMO) for (const [k, v] of Object.entries(window.StudioFlashes.DEMO)) assets['demo-' + k] = v.src;
  let sel = [];
  let playing = false;
  let pathEdit = null;
  let spotEdit = null;
  const elMap = new Map();
  S.view = { scale: 1, x: 0, y: 0, fit: true };
  S.settings = { grid: false, snapGrid: false, guides: true, gridSize: 40 };
  try { Object.assign(S.settings, JSON.parse(localStorage.getItem('studio.settings') || '{}')); } catch (e) { /* storage blocked */ }
  function saveSettings() { try { localStorage.setItem('studio.settings', JSON.stringify(S.settings)); } catch (e) { /* ignore */ } }
  S.saveSettings = saveSettings;
  S.docName = 'Untitled design';
  S.tool = 'select';
  S.eraser = { shape: 'circle', size: 60, mode: 'erase' };

  function blankDoc(w, h, color) {
    return {
      width: w, height: h,
      background: { color, color2: '#ffffff', gradient: 'none', angle: 180, assetId: null, filters: {}, crop: { zoom: 1, x: 0.5, y: 0.5 }, imageOpacity: 1, texture: 0, pattern: { type: 'none', color: 'rgba(29,27,24,0.14)', size: 40, thick: 1.5, opacity: 1, color2: '' } },
      overlay: { grain: 0, vignette: 0, tint: '#ff8a3d', tintAmount: 0, paper: 0, leak: 0, creases: 0 },
      anim: { duration: 5, fps: 30 },
      elements: [],
    };
  }
  S.blankDoc = blankDoc;
  Object.defineProperty(S, 'doc', { get: () => doc });
  R.animDoc = doc;
  Object.defineProperty(S, 'assets', { get: () => assets });
  Object.defineProperty(S, 'sel', { get: () => sel.slice() });
  S.elById = id => elMap.get(id);
  S.selEls = () => sel.map(id => elMap.get(id)).filter(Boolean);
  R.setAssets(assets);

  S.elLabel = function (el) {
    if (el.name) return el.name;
    switch (el.type) {
      case 'text': return (el.text || 'Text').split('\n')[0].slice(0, 28) || 'Text';
      case 'sticker': { const d = R.stickerDef(el.stickerId); return d ? d.name : 'Sticker'; }
      case 'image': return el.assetId ? (R.isVideoAsset(el.assetId) ? 'Video' : 'Photo') : 'Photo placeholder';
      case 'shape': return (R.SHAPES[el.shape] || {}).label || 'Shape';
      case 'calendar': return R.MONTHS[el.month] + ' calendar';
      case 'badge': return 'Badge · ' + (el.ringText || '').slice(0, 16);
      case 'checklist': return 'Checklist';
      case 'ribbon': return el.line ? 'Curved line' : (el.text ? 'Ribbon · ' + el.text.slice(0, 18) : 'Ribbon');
      case 'camera': return (R.CAMERA_STYLES[el.style] || 'Camera') + ' overlay';
      case 'nature': { const N = window.StudioNature; return (N && N.KINDS[el.kind] && N.KINDS[el.kind].label) || 'Nature'; }
      case 'flashes': { const P = window.StudioFlashes && window.StudioFlashes.PACKS[el.pack]; return 'Speed flashes' + (P ? ' · ' + P.label : el.pack === 'mine' ? ' · your photos' : ''); }
    }
    return el.type;
  };

  /* ───────────────────────── auto-sizing ───────────────────────── */

  function rotVec(dx, dy, deg) {
    const a = deg * Math.PI / 180;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  }
  // keep text/checklist boxes sized to their content. `keep` pins the edge the
  // text is aligned to so typing grows the box the way you'd expect.
  function autosize(el, keep = true) {
    if (el.type === 'text') {
      // sequence modes (captions, roll, word by word) only ever show one piece: size the box to the longest
      const pcs = R.seqPieces(el);
      const L = pcs && pcs.length ? R.layoutText(Object.assign({}, el, { text: pcs.reduce((a, b) => (R.layoutText(Object.assign({}, el, { text: b, autoWidth: true })).boxW > R.layoutText(Object.assign({}, el, { text: a, autoWidth: true })).boxW ? b : a)) })) : R.layoutText(el);
      const nw = (el.autoWidth || L.curved) ? L.boxW : el.width;
      const nh = L.boxH;
      if (el.cx != null || el.cy != null) { placeCentre(el, nw, nh); keep = false; }
      if (keep) {
        const k = L.curved ? 0.5 : el.align === 'center' ? 0.5 : el.align === 'right' ? 1 : 0;
        const dw = nw - el.width, dh = L.curved ? nh - el.height : 0;
        const [ox, oy] = rotVec(-dw * k, -dh * 0.5, el.rotation || 0);
        el.x += ox; el.y += oy;
      }
      el.width = nw; el.height = nh;
    } else if (el.type === 'checklist') {
      el.height = R.layoutChecklist(el).boxH;
    } else if (el.cx != null || el.cy != null) placeCentre(el, el.width, el.height);
  }
  // cx / cy name the visual centre, so account for rotation about the top-left origin
  function placeCentre(el, w, h) {
    const [hx, hy] = rotVec(w / 2, h / 2, el.rotation || 0);
    if (el.cx != null) { el.x = el.cx - hx; delete el.cx; }
    if (el.cy != null) { el.y = el.cy - hy; delete el.cy; }
  }
  S.autosize = autosize;

  /* ───────────────────────── Konva stage ───────────────────────── */

  const area = $('#stage-area');
  const overlayEl = $('#overlay-layer');
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  Konva.dragButtons = [0];
  const stage = new Konva.Stage({ container: 'stage', width: area.clientWidth || 800, height: area.clientHeight || 600 });
  S.stage = stage;
  const bgLayer = new Konva.Layer({ listening: false });
  const layer = new Konva.Layer();
  const uiLayer = new Konva.Layer();
  stage.add(bgLayer, layer, uiLayer);

  const artShadow = new Konva.Rect({ x: 0, y: 0, fill: '#fff', shadowColor: 'rgba(30,25,15,1)', shadowOpacity: 0.16, shadowBlur: 40, shadowOffsetY: 10, listening: false });
  const bgShape = new Konva.Shape({
    listening: false,
    sceneFunc: (c) => {
      const ctx = c._context;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, doc.width, doc.height); ctx.clip();
      R.drawBackground(ctx, doc, { editor: true }); ctx.restore();
    },
  });
  // the camera moves an inner group; the outer one clips to the canvas frame
  const bgFrame = new Konva.Group({ clipX: 0, clipY: 0, clipWidth: 1080, clipHeight: 1350 });
  const bgCam = new Konva.Group();
  bgCam.add(bgShape); bgFrame.add(bgCam);
  bgLayer.add(artShadow, bgFrame);

  const artFrame = new Konva.Group({ clipX: 0, clipY: 0, clipWidth: 1080, clipHeight: 1350 });
  const art = new Konva.Group();
  artFrame.add(art);
  layer.add(artFrame);
  const overlayShape = new Konva.Shape({
    listening: false,
    sceneFunc: (c) => { const ctx = c._context; if (doc.overlay && doc.overlay.rgb > 0) R.rgbSplit(ctx, doc.overlay.rgb / 100 * doc.width * 0.006 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)); ctx.save(); R.drawOverlay(ctx, doc); ctx.restore(); },
  });

  // grid + guides drawn in one shape so they stay crisp at any zoom
  let guideLines = [];
  let showMid = false;
  const guideShape = new Konva.Shape({
    listening: false,
    sceneFunc: (c) => {
      const ctx = c._context, s = stage.scaleX();
      ctx.save();
      if (S.settings.grid) {
        const g = S.settings.gridSize;
        ctx.beginPath();
        for (let x = g; x < doc.width; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, doc.height); }
        for (let y = g; y < doc.height; y += g) { ctx.moveTo(0, y); ctx.lineTo(doc.width, y); }
        ctx.lineWidth = 1 / s; ctx.strokeStyle = 'rgba(91,76,245,0.22)'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(doc.width / 2, 0); ctx.lineTo(doc.width / 2, doc.height);
        ctx.moveTo(0, doc.height / 2); ctx.lineTo(doc.width, doc.height / 2);
        ctx.strokeStyle = 'rgba(91,76,245,0.45)'; ctx.stroke();
      }
      if (showMid && S.settings.guides) {
        ctx.setLineDash([5 / s, 5 / s]); ctx.lineWidth = 1 / s; ctx.strokeStyle = 'rgba(255,46,136,0.45)';
        ctx.beginPath();
        ctx.moveTo(doc.width / 2, 0); ctx.lineTo(doc.width / 2, doc.height);
        ctx.moveTo(0, doc.height / 2); ctx.lineTo(doc.width, doc.height / 2);
        ctx.stroke(); ctx.setLineDash([]);
      }
      for (const g of guideLines) {
        ctx.beginPath(); ctx.moveTo(g.x1, g.y1); ctx.lineTo(g.x2, g.y2);
        ctx.lineWidth = (g.kind === 'center' ? 1.5 : 1) / s;
        ctx.strokeStyle = g.kind === 'center' ? '#ff2e88' : g.kind === 'grid' ? '#5b4cf5' : '#ff6a3d';
        ctx.stroke();
        if (g.kind !== 'center') {
          ctx.fillStyle = ctx.strokeStyle;
          for (const [x, y] of [[g.x1, g.y1], [g.x2, g.y2]]) { ctx.beginPath(); ctx.arc(x, y, 2.5 / s, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.restore();
    },
  });
  const hoverRect = new Konva.Rect({ listening: false, stroke: '#5b4cf5', strokeWidth: 1.5, strokeScaleEnabled: false, visible: false });
  const marquee = new Konva.Rect({ listening: false, fill: 'rgba(91,76,245,0.08)', stroke: '#5b4cf5', strokeWidth: 1, strokeScaleEnabled: false, visible: false });

  const tr = new Konva.Transformer({
    rotateAnchorOffset: 26,
    anchorSize: 10,
    anchorCornerRadius: 5,
    anchorStroke: '#5b4cf5',
    anchorFill: '#ffffff',
    anchorStrokeWidth: 1.5,
    borderStroke: '#5b4cf5',
    borderStrokeWidth: 1.5,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 4,
    flipEnabled: false,
    ignoreStroke: true,
    padding: 0,
    boundBoxFunc: (oldB, newB) => (Math.abs(newB.width) < 8 || Math.abs(newB.height) < 8) ? oldB : newB,
    anchorStyleFunc: (a) => {
      const n = a.name();
      if (n.includes('middle-left') || n.includes('middle-right')) { a.width(6); a.height(20); a.offsetX(3); a.offsetY(10); a.cornerRadius(3); }
      if (n.includes('top-center') || n.includes('bottom-center')) { a.width(20); a.height(6); a.offsetX(10); a.offsetY(3); a.cornerRadius(3); }
      if (n.includes('rotater')) { a.cornerRadius(10); a.fill('#5b4cf5'); a.stroke('#ffffff'); }
    },
  });
  uiLayer.add(guideShape, hoverRect, tr, marquee);

  /* ───────────────────────── view (zoom / pan) ───────────────────────── */

  function applyView() {
    stage.scale({ x: S.view.scale, y: S.view.scale });
    stage.position({ x: S.view.x, y: S.view.y });
    stage.batchDraw();
    emit('view');
    positionOverlays();
  }
  S.fit = function () {
    const aw = stage.width(), ah = stage.height();
    const pad = aw < 600 ? 24 : 64;
    const s = Math.min((aw - pad * 2) / doc.width, (ah - pad * 2) / doc.height);
    S.view.scale = Math.max(0.02, s);
    S.view.x = (aw - doc.width * S.view.scale) / 2;
    S.view.y = (ah - doc.height * S.view.scale) / 2;
    S.view.fit = true;
    applyView();
  };
  S.zoomAt = function (scale, px, py) {
    scale = clamp(scale, 0.05, 8);
    if (px == null) { px = stage.width() / 2; py = stage.height() / 2; }
    const wx = (px - S.view.x) / S.view.scale, wy = (py - S.view.y) / S.view.scale;
    S.view.scale = scale;
    S.view.x = px - wx * scale;
    S.view.y = py - wy * scale;
    S.view.fit = false;
    applyView();
  };
  S.zoomBy = f => S.zoomAt(S.view.scale * f);
  new ResizeObserver(() => {
    stage.size({ width: area.clientWidth, height: area.clientHeight });
    if (S.view.fit) S.fit(); else applyView();
  }).observe(area);

  area.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = area.getBoundingClientRect();
      const f = Math.exp(-e.deltaY * (e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 50 ? 0.01 : 0.0025));
      S.zoomAt(S.view.scale * f, e.clientX - rect.left, e.clientY - rect.top);
    } else {
      if (cropState) { cropWheel(e); return; }
      S.view.x -= e.deltaX; S.view.y -= e.deltaY; S.view.fit = false; applyView();
    }
  }, { passive: false });

  function docPoint(clientX, clientY) {
    const rect = area.getBoundingClientRect();
    return { x: (clientX - rect.left - S.view.x) / S.view.scale, y: (clientY - rect.top - S.view.y) / S.view.scale };
  }
  S.docPoint = docPoint;

  /* ───────────────────────── nodes ───────────────────────── */

  const nodes = new Map();
  function makeNode(el) {
    const id = el.id;
    const n = new Konva.Shape({
      id,
      sceneFunc: (c) => {
        const e = elMap.get(id);
        if (!e) return;
        const ctx = c._context;
        ctx.save();
        try { R.drawElement(ctx, e, { editor: true }); } catch (err) { console.error(err); }
        ctx.restore();
      },
      hitFunc: (c, shape) => { c.beginPath(); c.rect(0, 0, shape.width(), shape.height()); c.closePath(); c.fillStrokeShape(shape); },
    });
    n.on('mouseenter', () => { if (!dragging && !sel.includes(id)) showHover(n); area.style.cursor = elMap.get(id)?.locked ? 'default' : 'move'; });
    n.on('mouseleave', () => { hoverRect.visible(false); uiLayer.batchDraw(); area.style.cursor = ''; });
    n.on('dragstart', onDragStart);
    n.on('dragmove', onDragMove);
    n.on('dragend', onDragEnd);
    n.on('dblclick dbltap', () => onDouble(id));
    syncNode(el, n);
    return n;
  }
  function syncNode(el, n = nodes.get(el.id)) {
    if (!n) return;
    n.setAttrs({
      x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation || 0, scaleX: 1, scaleY: 1,
      opacity: el.opacity ?? 1, visible: !el.hidden, draggable: !el.locked && !(cropState && cropState.id === el.id) && !(pathEdit && pathEdit.id === el.id) && !(spotEdit && spotEdit.id === el.id) && S.tool === 'select' && !playing,
      globalCompositeOperation: el.blend && el.blend !== 'normal' ? el.blend : 'source-over',
    });
  }
  function rebuild() {
    art.destroyChildren();
    nodes.clear();
    elMap.clear();
    for (const el of doc.elements) {
      elMap.set(el.id, el);
      const n = makeNode(el);
      nodes.set(el.id, n);
      art.add(n);
    }
    artFrame.add(overlayShape);
    overlayShape.moveToTop();
    sizeArt();
    sel = sel.filter(id => elMap.has(id));
    attachTransformer();
    layer.batchDraw();
  }
  function sizeArt() {
    artFrame.clip({ x: 0, y: 0, width: doc.width, height: doc.height });
    bgFrame.clip({ x: 0, y: 0, width: doc.width, height: doc.height });
    artShadow.size({ width: doc.width, height: doc.height });
    artShadow.fill(doc.background.color || '#fff');
    bgLayer.batchDraw();
  }
  function reorderNodes() {
    doc.elements.forEach((el, i) => { const n = nodes.get(el.id); if (n) n.zIndex(i); });
    overlayShape.moveToTop();
  }
  function redraw() { layer.batchDraw(); bgLayer.batchDraw(); uiLayer.batchDraw(); }
  S.redraw = redraw;

  let lastFontsVersion = R.fontsVersion;
  R.onRedraw(() => {
    // fonts arriving change text metrics, so boxes are re-measured on every async redraw
    let moved = false;
    for (const el of doc.elements) {
      if (el.type !== 'text' && el.type !== 'checklist') continue;
      const w = el.width, h = el.height;
      autosize(el);
      if (Math.abs(w - el.width) > 0.01 || Math.abs(h - el.height) > 0.01) { syncNode(el); moved = true; }
    }
    if (moved) { tr.forceUpdate(); positionOverlays(); }
    if (R.fontsVersion !== lastFontsVersion) { lastFontsVersion = R.fontsVersion; emit('fonts'); }
    redraw();
  });

  /* ───────────────────────── history & autosave ───────────────────────── */

  const hist = { stack: [], idx: -1 };
  function snapshot() { return JSON.stringify(doc); }
  S.commit = function () {
    const s = snapshot();
    if (hist.stack[hist.idx] === s) return;
    hist.stack.length = hist.idx + 1;
    hist.stack.push(s);
    if (hist.stack.length > 150) hist.stack.shift();
    hist.idx = hist.stack.length - 1;
    emit('history');
    emit('change');
    scheduleSave();
  };
  function restore(s) {
    doc = JSON.parse(s);
    R.animDoc = doc;
    rebuild();
    emit('doc');
    emit('selection');
    emit('history');
    scheduleSave();
  }
  S.undo = () => { if (textEdit) finishTextEdit(); if (hist.idx > 0) { hist.idx--; restore(hist.stack[hist.idx]); } };
  S.redo = () => { if (hist.idx < hist.stack.length - 1) { hist.idx++; restore(hist.stack[hist.idx]); } };
  S.canUndo = () => hist.idx > 0;
  S.canRedo = () => hist.idx < hist.stack.length - 1;

  const DB = {
    open() {
      if (this.p) return this.p;
      this.p = new Promise((res, rej) => {
        try {
          const r = indexedDB.open('collage-studio', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
      return this.p;
    },
    async get(k) { const d = await this.open(); return new Promise((res, rej) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
    async set(k, v) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
    async del(k) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); },
  };
  let saveTimer = null;
  function usedAssets() {
    const ids = new Set();
    if (doc.background.assetId) ids.add(doc.background.assetId);
    for (const el of doc.elements) {
      if (el.assetId) ids.add(el.assetId);
      if (el.studio && el.studio.cutId) ids.add(el.studio.cutId);
      if (el.bgRemoved && el.bgRemoved.assetId) ids.add(el.bgRemoved.assetId);
      if (el.type === 'flashes') for (const a of el.images || []) ids.add(a);
    }
    for (const id of S.uploads) ids.add(id);
    const out = {};
    for (const id of ids) if (assets[id]) out[id] = assets[id];
    return out;
  }
  S.uploads = [];
  // every design is its own project in this browser: the full data lives under
  // 'project:<id>' and a light index (name, size, thumbnail, status) under 'projects'
  S.projectId = null;
  let projList = null;
  async function projects() {
    if (projList) return projList;
    let list = await DB.get('projects').catch(() => null);
    if (!Array.isArray(list)) {
      list = [];
      // carry over the single autosave from before projects existed
      const old = await DB.get('autosave').catch(() => null);
      if (old && old.doc && old.doc.elements && old.doc.elements.length) {
        const id = uid('p');
        await DB.set('project:' + id, old).catch(() => {});
        list.push({ id, name: old.name || 'Untitled design', status: 'draft', created: old.savedAt || Date.now(), savedAt: old.savedAt || Date.now(), w: old.doc.width, h: old.doc.height, thumb: null });
      }
      await DB.set('projects', list).catch(() => {});
    }
    projList = list;
    return list;
  }
  function projThumb() {
    try {
      const s = 360 / Math.max(doc.width, doc.height);
      return R.renderDoc(doc, { scale: s }).toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }
  }
  async function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    const id = S.projectId;
    if (!id) return;
    const now = Date.now();
    await DB.set('project:' + id, { doc, assets: usedAssets(), uploads: S.uploads, name: S.docName, savedAt: now }).catch(() => {});
    const list = await projects();
    let it = list.find(p => p.id === id);
    if (!it) { it = { id, status: 'draft', created: now }; list.unshift(it); }
    Object.assign(it, { name: S.docName, savedAt: now, w: doc.width, h: doc.height, video: S.hasAnimation(), layers: doc.elements.length });
    const th = projThumb();
    if (th) it.thumb = th;
    await DB.set('projects', list).catch(() => {});
    DB.set('lastProject', id).catch(() => {});
    emit('projects');
  }
  function scheduleSave() {
    if (!S.projectId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 800);
  }
  S.scheduleSave = scheduleSave;
  S.saveNow = saveNow;
  S.projects = {
    list: projects,
    get: id => DB.get('project:' + id).catch(() => null),
    last: () => DB.get('lastProject').catch(() => null),
    async update(id, patch) {
      const list = await projects(), it = list.find(p => p.id === id);
      if (!it) return;
      Object.assign(it, patch);
      if (patch.name != null) {
        const data = await DB.get('project:' + id).catch(() => null);
        if (data) { data.name = patch.name; await DB.set('project:' + id, data).catch(() => {}); }
        if (id === S.projectId) { S.docName = patch.name; emit('name'); }
      }
      await DB.set('projects', list).catch(() => {});
      emit('projects');
    },
    async duplicate(id) {
      if (id === S.projectId) await saveNow();
      const list = await projects(), it = list.find(p => p.id === id), data = await DB.get('project:' + id).catch(() => null);
      if (!it || !data) return null;
      const nid = uid('p'), now = Date.now(), name = it.name + ' copy';
      await DB.set('project:' + nid, Object.assign({}, data, { name, savedAt: now }));
      list.unshift(Object.assign({}, it, { id: nid, name, status: 'draft', created: now, savedAt: now }));
      await DB.set('projects', list).catch(() => {});
      emit('projects');
      return nid;
    },
    async remove(id) {
      const list = await projects(), i = list.findIndex(p => p.id === id);
      if (i < 0) return;
      const [it] = list.splice(i, 1);
      const data = await DB.get('project:' + id).catch(() => null);
      await DB.del('project:' + id).catch(() => {});
      await DB.set('projects', list).catch(() => {});
      if (id === S.projectId) { clearTimeout(saveTimer); S.projectId = null; }
      emit('projects');
      // handed back so the deletion can be undone
      return { it, data, index: i };
    },
    async restore(r) {
      if (!r || !r.data) return;
      const list = await projects();
      await DB.set('project:' + r.it.id, r.data).catch(() => {});
      list.splice(Math.min(r.index, list.length), 0, r.it);
      await DB.set('projects', list).catch(() => {});
      emit('projects');
    },
    status: () => { const it = projList && projList.find(p => p.id === S.projectId); return it ? it.status : 'draft'; },
    async markSaved() {
      if (!S.projectId) return;
      await saveNow();
      await S.projects.update(S.projectId, { status: 'saved' });
    },
  };

  // uploaded fonts used in the design travel inside the project file so it opens anywhere
  function usedFamilies() {
    const fam = new Set();
    for (const el of doc.elements) for (const k of ['fontFamily', 'titleFont', 'bodyFont', 'ringFont', 'centerFont']) if (el[k]) fam.add(el[k]);
    return [...fam].filter(f => window.StudioFonts.BY_NAME[f] && window.StudioFonts.BY_NAME[f].custom);
  }
  S.projectData = () => ({ app: 'collage-studio', version: 1, name: S.docName, doc, assets: usedAssets(), uploads: S.uploads, fonts: window.StudioFonts.packFamilies(usedFamilies()) });

  /* ───────────────────────── load / new ───────────────────────── */

  S.loadDoc = function (d, newAssets, opts = {}) {
    if (textEdit) finishTextEdit(true);
    endCrop();
    const base = blankDoc(d.width || 1080, d.height || 1350, (d.background && d.background.color) || '#ffffff');
    doc = deepMerge(base, { ...d, elements: [] });
    doc.elements = (d.elements || []).map(normalize);
    R.animDoc = doc;
    if (newAssets) Object.assign(assets, newAssets);
    for (const el of doc.elements) autosize(el, false);
    sel = [];
    rebuild();
    S.fit();
    if (!opts.keepHistory) { hist.stack = []; hist.idx = -1; }
    // a brand-new design gets its own project; opening one keeps its id
    if (opts.project) { clearTimeout(saveTimer); S.projectId = opts.project === 'new' ? uid('p') : opts.project; if (opts.project === 'new') S.uploads.splice(0); emit('project'); }
    if (opts.name) S.docName = opts.name;
    S.commit();
    // just opening a design shouldn't count as editing it
    if (opts.project && opts.project !== 'new') { clearTimeout(saveTimer); saveTimer = null; }
    emit('doc');
    emit('selection');
    if (opts.name) { S.docName = opts.name; emit('name'); }
    // fonts may arrive after the first paint; re-measure when they do
    R.preload(doc).then(() => { R.requestRedraw(); });
  };
  S.newDoc = function (w, h, color, extra = {}, opts = {}) {
    const d = blankDoc(w, h, color);
    deepMerge(d, extra);
    S.loadDoc(d, null, Object.assign({ name: 'Untitled design' }, opts));
  };
  S.resizeCanvas = function (w, h, scaleContent) {
    const sx = w / doc.width, sy = h / doc.height;
    if (scaleContent) {
      const s = Math.min(sx, sy);
      const ox = (w - doc.width * s) / 2, oy = (h - doc.height * s) / 2;
      for (const el of doc.elements) {
        el.x = el.x * s + ox; el.y = el.y * s + oy;
        scaleElement(el, s, s);
      }
    } else {
      const ox = (w - doc.width) / 2, oy = (h - doc.height) / 2;
      for (const el of doc.elements) { el.x += ox; el.y += oy; }
    }
    doc.width = w; doc.height = h;
    rebuild();
    S.fit();
    S.commit();
    emit('doc');
  };

  /* ───────────────────────── selection ───────────────────────── */

  function attachTransformer() {
    const ns = sel.map(id => nodes.get(id)).filter(n => n && n.visible());
    const els = sel.map(id => elMap.get(id)).filter(Boolean);
    const anyLocked = els.some(e => e.locked);
    let anchors = ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'];
    let keepRatio = true;
    if (els.length === 1) {
      const e = els[0];
      if (e.type === 'text') anchors = (e.curve && Math.abs(e.curve) >= 1) ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'];
      if (e.type === 'checklist') anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'];
      if (e.type === 'sticker' || e.type === 'badge') anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      if (e.type === 'shape' && e.shape === 'line') anchors = ['middle-left', 'middle-right'];
    } else if (els.length > 1) {
      anchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    }
    if (anyLocked || cropState || S.tool === 'erase') anchors = [];
    if (pathEdit || spotEdit) { tr.nodes([]); tr.visible(false); uiLayer.batchDraw(); positionOverlays(); return; }
    tr.setAttrs({
      enabledAnchors: anchors, keepRatio, rotateEnabled: !anyLocked && !cropState && S.tool !== 'erase',
      shouldOverdrawWholeArea: ns.length > 1, borderDash: anyLocked ? [4, 4] : null,
    });
    tr.nodes(textEdit ? [] : ns);
    tr.visible(!textEdit);
    hoverRect.visible(false);
    uiLayer.batchDraw();
    positionOverlays();
  }
  S.select = function (ids, opts = {}) {
    if (textEdit && !(ids.length === 1 && ids[0] === textEdit.id)) finishTextEdit();
    if (cropState && !(ids.length === 1 && ids[0] === cropState.id)) endCrop();
    if (pathEdit && !(ids.length === 1 && ids[0] === pathEdit.id)) endPathEdit();
    if (spotEdit && !(ids.length === 1 && ids[0] === spotEdit.id)) endSpotEdit();
    sel = ids.filter(id => elMap.has(id));
    attachTransformer();
    if (!opts.silent) emit('selection');
  };
  S.toggleSelect = function (id) {
    S.select(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };
  function showHover(n) {
    hoverRect.setAttrs({ x: n.x(), y: n.y(), width: n.width(), height: n.height(), rotation: n.rotation(), visible: true });
    uiLayer.batchDraw();
  }
  S.hover = function (id) {
    const n = id && nodes.get(id);
    if (n && !sel.includes(id)) showHover(n); else hoverRect.visible(false);
    uiLayer.batchDraw();
  };

  /* ───────────────────────── pointer on stage ───────────────────────── */

  let marqueeStart = null;
  let panning = null;
  const keys = { space: false, alt: false, shift: false, ctrl: false };
  S.keys = keys;

  stage.on('mousedown touchstart', e => {
    const evt = e.evt;
    if (keys.space || evt.button === 1 || S.tool === 'hand') {
      panning = { x: evt.clientX ?? evt.touches?.[0]?.clientX, y: evt.clientY ?? evt.touches?.[0]?.clientY, vx: S.view.x, vy: S.view.y };
      area.style.cursor = 'grabbing';
      return;
    }
    if (evt.button === 2) return;
    // editing always happens on the still layout, not mid-animation
    if (R.playTime != null) S.stopPreview();
    const t = e.target;
    if (S.tool === 'erase') { eraseStart(evt, t); return; }
    if (spotEdit) {
      if (t.getParent && t.getParent() === spotGroup) return;
      if (t.id && t.id() === spotEdit.id) { addSpotAt(layer.getRelativePointerPosition()); return; }
      endSpotEdit();
    }
    if (cropState) {
      if (t.id && t.id() === cropState.id) { cropDragStart(evt); return; }
      endCrop();
    }
    if (t === stage) {
      if (!evt.shiftKey) S.select([]);
      const p = layer.getRelativePointerPosition();
      marqueeStart = { x: p.x, y: p.y, add: evt.shiftKey, base: sel.slice() };
      marquee.setAttrs({ x: p.x, y: p.y, width: 0, height: 0, visible: false });
      return;
    }
    if (t.getParent && t.getParent() && t.getParent().className === 'Transformer') return;
    const id = t.id && t.id();
    if (!id || !elMap.has(id)) return;
    if (evt.shiftKey || evt.metaKey || evt.ctrlKey) {
      S.toggleSelect(id);
      // a node removed from the selection shouldn't drag
      if (!sel.includes(id)) t.stopDrag && setTimeout(() => t.stopDrag(), 0);
    } else if (!sel.includes(id)) S.select([id]);
  });
  window.addEventListener('mousemove', e => {
    if (panning) {
      S.view.x = panning.vx + (e.clientX - panning.x);
      S.view.y = panning.vy + (e.clientY - panning.y);
      S.view.fit = false;
      applyView();
      return;
    }
    if (cropDrag) { cropDragMove(e); return; }
    if (S.tool === 'erase') moveBrush(e);
    if (erasing) { eraseMove(e); return; }
    if (marqueeStart) {
      const p = docPoint(e.clientX, e.clientY);
      const x = Math.min(p.x, marqueeStart.x), y = Math.min(p.y, marqueeStart.y);
      const w = Math.abs(p.x - marqueeStart.x), h = Math.abs(p.y - marqueeStart.y);
      if (w * S.view.scale > 3 || h * S.view.scale > 3) {
        marquee.setAttrs({ x, y, width: w, height: h, visible: true });
        const hits = [];
        for (const el of doc.elements) {
          if (el.hidden || el.locked) continue;
          const r = nodes.get(el.id).getClientRect({ relativeTo: art });
          if (r.x < x + w && r.x + r.width > x && r.y < y + h && r.y + r.height > y) hits.push(el.id);
        }
        const ids = marqueeStart.add ? [...new Set([...marqueeStart.base, ...hits])] : hits;
        sel = ids; attachTransformer();
        uiLayer.batchDraw();
      }
    }
  });
  window.addEventListener('mouseup', () => {
    if (panning) { panning = null; area.style.cursor = keys.space || S.tool === 'hand' ? 'grab' : ''; }
    if (cropDrag) { cropDrag = null; S.commit(); }
    if (erasing) { erasing = null; S.commit(); emit('values'); }
    if (marqueeStart) {
      marqueeStart = null;
      if (marquee.visible()) { marquee.visible(false); uiLayer.batchDraw(); emit('selection'); }
    }
  });
  stage.on('contextmenu', e => {
    e.evt.preventDefault();
    const t = e.target;
    const id = t.id && t.id();
    if (id && elMap.has(id) && !sel.includes(id)) S.select([id]);
    else if (t === stage) S.select([]);
    emit('contextmenu', e.evt.clientX, e.evt.clientY);
  });

  /* ───────────────────────── snapping ───────────────────────── */

  function snapTargets(exclude) {
    const v = [{ p: 0, kind: 'edge' }, { p: doc.width / 2, kind: 'center' }, { p: doc.width, kind: 'edge' }];
    const h = [{ p: 0, kind: 'edge' }, { p: doc.height / 2, kind: 'center' }, { p: doc.height, kind: 'edge' }];
    if (S.settings.guides) {
      for (const el of doc.elements) {
        if (exclude.has(el.id) || el.hidden) continue;
        const r = nodes.get(el.id).getClientRect({ relativeTo: art });
        if (r.width > doc.width * 3) continue;
        v.push({ p: r.x, kind: 'obj', r }, { p: r.x + r.width / 2, kind: 'obj', r }, { p: r.x + r.width, kind: 'obj', r });
        h.push({ p: r.y, kind: 'obj', r }, { p: r.y + r.height / 2, kind: 'obj', r }, { p: r.y + r.height, kind: 'obj', r });
      }
    }
    return { v, h };
  }
  function nearestGrid(p) { const g = S.settings.gridSize; return Math.round(p / g) * g; }
  // returns the correction (dx, dy) to apply and the guide lines to show
  function computeSnap(box, exclude, axes = { x: true, y: true }) {
    const thr = 7 / S.view.scale;
    const T = snapTargets(exclude);
    const res = { dx: 0, dy: 0, lines: [] };
    const solve = (edges, targets, isX) => {
      let best = null;
      for (const e of edges) {
        for (const t of targets) {
          if (t.kind !== 'center' && t.kind !== 'edge' && !S.settings.guides) continue;
          const d = t.p - e;
          if (Math.abs(d) < thr && (!best || Math.abs(d) < Math.abs(best.d) - 0.01 || (Math.abs(Math.abs(d) - Math.abs(best.d)) < 0.01 && t.kind === 'center'))) best = { d, t };
        }
        if (S.settings.snapGrid) {
          const gp = nearestGrid(e), d = gp - e;
          if (Math.abs(d) < thr && (!best || Math.abs(d) < Math.abs(best.d) - 0.01)) best = { d, t: { p: gp, kind: 'grid' } };
        }
      }
      return best;
    };
    const ex = [box.x, box.x + box.width / 2, box.x + box.width];
    const ey = [box.y, box.y + box.height / 2, box.y + box.height];
    const bx = axes.x && solve(ex, T.v, true);
    const by = axes.y && solve(ey, T.h, false);
    if (bx) res.dx = bx.d;
    if (by) res.dy = by.d;
    const nb = { x: box.x + res.dx, y: box.y + res.dy, width: box.width, height: box.height };
    // draw every alignment that holds after snapping (not just the winning one)
    const nex = [nb.x, nb.x + nb.width / 2, nb.x + nb.width], ney = [nb.y, nb.y + nb.height / 2, nb.y + nb.height];
    const seen = new Set();
    if (bx) for (const t of T.v) for (const e of nex) if (Math.abs(t.p - e) < 0.5) {
      const key = 'v' + Math.round(t.p) + t.kind; if (seen.has(key)) continue; seen.add(key);
      if (t.kind === 'obj') res.lines.push({ x1: t.p, y1: Math.min(t.r.y, nb.y), x2: t.p, y2: Math.max(t.r.y + t.r.height, nb.y + nb.height), kind: 'obj' });
      else res.lines.push({ x1: t.p, y1: 0, x2: t.p, y2: doc.height, kind: t.kind === 'center' ? 'center' : 'edge' });
    }
    if (by) for (const t of T.h) for (const e of ney) if (Math.abs(t.p - e) < 0.5) {
      const key = 'h' + Math.round(t.p) + t.kind; if (seen.has(key)) continue; seen.add(key);
      if (t.kind === 'obj') res.lines.push({ x1: Math.min(t.r.x, nb.x), y1: t.p, x2: Math.max(t.r.x + t.r.width, nb.x + nb.width), y2: t.p, kind: 'obj' });
      else res.lines.push({ x1: 0, y1: t.p, x2: doc.width, y2: t.p, kind: t.kind === 'center' ? 'center' : 'edge' });
    }
    if (bx && bx.t.kind === 'grid') res.lines.push({ x1: bx.t.p, y1: 0, x2: bx.t.p, y2: doc.height, kind: 'grid' });
    if (by && by.t.kind === 'grid') res.lines.push({ x1: 0, y1: by.t.p, x2: doc.width, y2: by.t.p, kind: 'grid' });
    return res;
  }

  /* ───────────────────────── dragging ───────────────────────── */

  let dragging = null;
  const measureTag = document.createElement('div');
  measureTag.className = 'measure-tag';
  measureTag.style.display = 'none';
  overlayEl.appendChild(measureTag);
  function showMeasure(text, box) {
    const sx = box.x * S.view.scale + S.view.x + box.width * S.view.scale / 2;
    const sy = (box.y + box.height) * S.view.scale + S.view.y + 12;
    measureTag.textContent = text;
    measureTag.style.left = sx + 'px';
    measureTag.style.top = sy + 'px';
    measureTag.style.display = 'block';
  }
  function hideMeasure() { measureTag.style.display = 'none'; }

  function unionRect(ns) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) {
      const r = n.getClientRect({ relativeTo: art });
      x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.width); y1 = Math.max(y1, r.y + r.height);
    }
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }
  function onDragStart(e) {
    const n = e.target;
    if (!sel.includes(n.id())) S.select([n.id()]);
    if (e.evt && e.evt.altKey) leaveCopiesBehind();
    const ns = sel.map(id => nodes.get(id)).filter(Boolean);
    const box = unionRect(ns);
    dragging = { node: n, rel: { x: box.x - n.x(), y: box.y - n.y(), w: box.width, h: box.height }, ids: new Set(sel), start: ns.map(m => [m, m.x(), m.y()]) };
    hoverRect.visible(false);
    showMid = true;
    emit('dragstart');
  }
  // Alt-drag: drop a copy at the starting position and keep dragging the original
  function leaveCopiesBehind() {
    for (const id of sel) {
      const el = elMap.get(id);
      if (!el || el.locked) continue;
      const c = clone(el);
      c.id = uid();
      doc.elements.splice(doc.elements.indexOf(el), 0, c);
      elMap.set(c.id, c);
      const cn = makeNode(c);
      nodes.set(c.id, cn);
      art.add(cn);
    }
    reorderNodes();
    S.hint('Duplicating — release to drop the copy', 1200);
  }
  function onDragMove(e) {
    const n = e.target;
    if (!dragging || dragging.node !== n) return;
    // keep the rest of a multi-selection in lockstep
    const s0 = dragging.start.find(s => s[0] === n);
    const ddx = n.x() - s0[1], ddy = n.y() - s0[2];
    let box = { x: n.x() + dragging.rel.x, y: n.y() + dragging.rel.y, width: dragging.rel.w, height: dragging.rel.h };
    guideLines = [];
    if (!keys.ctrl && (S.settings.guides || S.settings.snapGrid)) {
      const snap = computeSnap(box, dragging.ids);
      if (snap.dx || snap.dy) { n.x(n.x() + snap.dx); n.y(n.y() + snap.dy); box.x += snap.dx; box.y += snap.dy; }
      guideLines = snap.lines;
    }
    if (keys.shift) {
      // constrain to the dominant axis
      const tx = n.x() - s0[1], ty = n.y() - s0[2];
      if (Math.abs(tx) > Math.abs(ty)) n.y(s0[2]); else n.x(s0[1]);
      box = { x: n.x() + dragging.rel.x, y: n.y() + dragging.rel.y, width: dragging.rel.w, height: dragging.rel.h };
    }
    const fdx = n.x() - s0[1], fdy = n.y() - s0[2];
    for (const [m, x, y] of dragging.start) if (m !== n) m.position({ x: x + fdx, y: y + fdy });
    void ddx; void ddy;
    showMeasure(`X ${Math.round(box.x)}  Y ${Math.round(box.y)}`, box);
    uiLayer.batchDraw();
    positionOverlays(true);
  }
  function onDragEnd() {
    if (!dragging) return;
    for (const [m] of dragging.start) {
      const el = elMap.get(m.id());
      if (el) { el.x = m.x(); el.y = m.y(); }
    }
    dragging = null;
    guideLines = []; showMid = false;
    hideMeasure();
    uiLayer.batchDraw();
    S.commit();
    positionOverlays();
    emit('values');
  }

  /* ───────────────────────── transforming ───────────────────────── */

  function scaleElement(el, sx, sy) {
    const s = Math.sqrt(Math.abs(sx * sy));
    if (el.type === 'text') {
      el.fontSize = Math.max(4, el.fontSize * s);
      if (el.bg) { el.bg.padX *= s; el.bg.padY *= s; el.bg.gap *= s; el.bg.radius *= s; el.bg.borderWidth *= s; }
      if (el.stroke) el.stroke.width *= s;
      if (!el.autoWidth) el.width *= s;
      autosize(el, false);
    } else if (el.type === 'checklist') {
      el.fontSize = Math.max(4, el.fontSize * s); el.width *= s; autosize(el, false);
    } else {
      el.width *= sx; el.height *= sy;
      if (el.type === 'image' && el.frame) { el.frame.size *= s; el.frame.radius *= s; if (el.outline) el.outline.width *= s; }
      if (el.type === 'sticker' && el.outline) el.outline.width *= s;
      if (el.type === 'badge' && el.borderWidth) el.borderWidth *= s;
      if (el.type === 'shape' && el.radius) el.radius *= s;
      if (el.type === 'ribbon') { el.thickness *= s; el.fontSize *= s; if (el.border) el.border.width *= s; }
    }
  }
  S.scaleElement = scaleElement;

  let transforming = false;
  tr.on('transformstart', () => { transforming = true; hoverRect.visible(false); emit('dragstart'); });
  tr.on('transform', () => {
    const anchor = tr.getActiveAnchor() || '';
    const side = anchor === 'middle-left' || anchor === 'middle-right';
    const vert = anchor === 'top-center' || anchor === 'bottom-center';
    for (const n of tr.nodes()) {
      const el = elMap.get(n.id());
      if (!el) continue;
      const sx = n.scaleX(), sy = n.scaleY();
      el.x = n.x(); el.y = n.y(); el.rotation = n.rotation();
      if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6) continue;
      if ((el.type === 'text' || el.type === 'checklist') && side) {
        el.width = Math.max(20, n.width() * sx);
        if (el.type === 'text') el.autoWidth = false;
        autosize(el, false);
      } else if (el.type === 'text' || el.type === 'checklist') {
        scaleElement(el, sx, sx);
      } else if (el.type === 'shape' && el.shape === 'line') {
        el.width = Math.max(10, n.width() * sx);
      } else if (side || vert) {
        el.width = Math.max(4, n.width() * sx); el.height = Math.max(4, n.height() * sy);
      } else {
        scaleElement(el, sx, sy);
      }
      n.setAttrs({ width: el.width, height: el.height, scaleX: 1, scaleY: 1 });
    }
    const box = tr.nodes().length ? unionRect(tr.nodes()) : null;
    if (box) {
      const els = tr.nodes().map(n => elMap.get(n.id()));
      if (anchor === 'rotater') showMeasure(`${Math.round(((els[0].rotation % 360) + 360) % 360)}°`, box);
      else if (els.length === 1) showMeasure(`${Math.round(els[0].width)} × ${Math.round(els[0].height)}`, box);
    }
    positionOverlays(true);
  });
  tr.on('transformend', () => {
    transforming = false;
    for (const n of tr.nodes()) {
      const el = elMap.get(n.id());
      if (!el) continue;
      el.x = n.x(); el.y = n.y(); el.rotation = Math.round(n.rotation() * 100) / 100;
      syncNode(el, n);
    }
    guideLines = [];
    hideMeasure();
    tr.forceUpdate();
    uiLayer.batchDraw();
    S.commit();
    positionOverlays();
    emit('values');
  });
  // snap resize handles to the canvas, other elements and the grid
  tr.anchorDragBoundFunc(function (oldAbs, newAbs) {
    const ns = tr.nodes();
    if (keys.ctrl || ns.length !== 1 || (!S.settings.guides && !S.settings.snapGrid)) { guideLines = []; return newAbs; }
    const rot = ((ns[0].rotation() % 90) + 90) % 90;
    if (rot > 0.5 && rot < 89.5) return newAbs;
    const anchor = tr.getActiveAnchor() || '';
    if (anchor === 'rotater') return newAbs;
    const p = { x: (newAbs.x - S.view.x) / S.view.scale, y: (newAbs.y - S.view.y) / S.view.scale };
    const axes = { x: !anchor.includes('center'), y: !anchor.includes('middle') };
    const snap = computeSnap({ x: p.x, y: p.y, width: 0, height: 0 }, new Set([ns[0].id()]), axes);
    guideLines = snap.lines;
    return { x: (p.x + snap.dx) * S.view.scale + S.view.x, y: (p.y + snap.dy) * S.view.scale + S.view.y };
  });

  /* ───────────────────────── floating quick bar ───────────────────────── */

  const quick = document.createElement('div');
  quick.className = 'ctx-quick';
  quick.style.display = 'none';
  overlayEl.appendChild(quick);
  S.quickBar = quick;
  function positionOverlays(hideQuick) {
    if (textEdit) positionTextEditor();
    if (hideQuick || !sel.length || textEdit || dragging || transforming || playing || S.tool === 'erase') { quick.style.display = 'none'; return; }
    const ns = sel.map(id => nodes.get(id)).filter(n => n && n.visible());
    if (!ns.length) { quick.style.display = 'none'; return; }
    const r = tr.getClientRect();
    let x = r.x + r.width / 2, y = r.y - 40;
    if (y < 52) y = r.y + r.height + 52 + 6;
    x = clamp(x, 140, stage.width() - 140);
    y = clamp(y, 52, stage.height() - 8);
    quick.style.left = x + 'px'; quick.style.top = y + 'px';
    quick.style.display = 'flex';
    emit('quick');
  }
  S.positionOverlays = positionOverlays;

  /* ───────────────────────── path editing (ribbons) ───────────────────────── */

  const pathGroup = new Konva.Group();
  uiLayer.add(pathGroup);
  function startPathEdit(id) {
    const el = elMap.get(id);
    if (!el || el.type !== 'ribbon' || el.locked) return;
    if (textEdit) finishTextEdit();
    endCrop();
    if (!el.points) {
      const pre = R.RIBBON_PATHS[el.path] || R.RIBBON_PATHS.wave;
      el.points = pre.pts.map(p => p.slice()); el.closed = !!pre.closed; el.sharp = !!pre.sharp;
    }
    pathEdit = { id };
    if (!sel.includes(id) || sel.length !== 1) { sel = [id]; emit('selection'); }
    syncNode(el);
    buildPathHandles();
    attachTransformer();
    S.hint('Drag points to reshape · click a small dot to add a point · double-click a point to remove it · Esc when done', 4200);
    emit('pathedit', true);
  }
  function endPathEdit() {
    if (!pathEdit) return;
    const el = elMap.get(pathEdit.id);
    pathEdit = null;
    pathGroup.destroyChildren();
    if (el) syncNode(el);
    attachTransformer();
    emit('pathedit', false);
  }
  S.startPathEdit = startPathEdit;
  S.endPathEdit = endPathEdit;
  S.isEditingPath = () => !!pathEdit;
  // re-fit the box around the points so selection and snapping follow the new shape
  function refitPath(el) {
    const lp = el.points.map(([u, v]) => [u * el.width, v * el.height]);
    let x0 = Math.min(...lp.map(p => p[0])), x1 = Math.max(...lp.map(p => p[0]));
    let y0 = Math.min(...lp.map(p => p[1])), y1 = Math.max(...lp.map(p => p[1]));
    if (x1 - x0 < 20) { const c = (x0 + x1) / 2; x0 = c - 10; x1 = c + 10; }
    if (y1 - y0 < 20) { const c = (y0 + y1) / 2; y0 = c - 10; y1 = c + 10; }
    const [ox, oy] = rotVec(x0, y0, el.rotation || 0);
    el.x += ox; el.y += oy;
    el.width = x1 - x0; el.height = y1 - y0;
    el.points = lp.map(([x, y]) => [(x - x0) / el.width, (y - y0) / el.height]);
  }
  function buildPathHandles() {
    pathGroup.destroyChildren();
    if (!pathEdit) return;
    const el = elMap.get(pathEdit.id), n = nodes.get(pathEdit.id);
    if (!el || !n) return;
    const s = S.view.scale, T = n.getTransform();
    const pts = el.points.map(([u, v]) => T.point({ x: u * el.width, y: v * el.height }));
    const line = new Konva.Line({ points: pts.flatMap(p => [p.x, p.y]).concat(el.closed ? [pts[0].x, pts[0].y] : []), stroke: '#5b4cf5', strokeWidth: 1 / s, dash: [4 / s, 4 / s], listening: false });
    pathGroup.add(line);
    const finish = () => { refitPath(el); syncNode(el); buildPathHandles(); layer.batchDraw(); S.commit(); emit('values'); };
    // midpoints add a point
    const segs = el.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const m = new Konva.Circle({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, radius: 4.5 / s, fill: 'rgba(91,76,245,0.55)', stroke: '#fff', strokeWidth: 1 / s, hitStrokeWidth: 8 / s });
      m.on('mousedown touchstart', ev => {
        ev.cancelBubble = true;
        const inv = n.getTransform().copy().invert(), lp = inv.point({ x: m.x(), y: m.y() });
        el.points.splice(i + 1, 0, [lp.x / el.width, lp.y / el.height]);
        layer.batchDraw(); buildPathHandles(); S.commit();
      });
      m.on('mouseenter', () => { area.style.cursor = 'copy'; });
      m.on('mouseleave', () => { area.style.cursor = ''; });
      pathGroup.add(m);
    }
    pts.forEach((p, i) => {
      const c = new Konva.Circle({ x: p.x, y: p.y, radius: 7 / s, fill: '#ffffff', stroke: '#5b4cf5', strokeWidth: 2 / s, draggable: true, hitStrokeWidth: 10 / s });
      c.on('mousedown touchstart', ev => { ev.cancelBubble = true; });
      c.on('dragmove', () => {
        const inv = n.getTransform().copy().invert(), lp = inv.point(c.position());
        el.points[i] = [lp.x / el.width, lp.y / el.height];
        const flat = line.points(); flat[i * 2] = c.x(); flat[i * 2 + 1] = c.y();
        if (el.closed && i === 0) { flat[flat.length - 2] = c.x(); flat[flat.length - 1] = c.y(); }
        line.points(flat);
        layer.batchDraw();
      });
      c.on('dragend', finish);
      c.on('dblclick dbltap', () => { if (el.points.length > 2) { el.points.splice(i, 1); finish(); } });
      c.on('mouseenter', () => { area.style.cursor = 'move'; });
      c.on('mouseleave', () => { area.style.cursor = ''; });
      pathGroup.add(c);
    });
    uiLayer.batchDraw();
  }
  S.on('view', () => { if (pathEdit) buildPathHandles(); });
  S.on('values', () => { if (pathEdit && !pathGroup.findOne('Circle')?.isDragging()) buildPathHandles(); });

  /* ───────────────────────── blur spots (photos) ───────────────────────── */

  const spotGroup = new Konva.Group();
  uiLayer.add(spotGroup);
  function spotEl() { return spotEdit && elMap.get(spotEdit.id); }
  S.startBlurSpots = function (id) {
    const el = elMap.get(id);
    if (!el || el.type !== 'image' || !el.assetId || el.locked) return;
    if (textEdit) finishTextEdit();
    endCrop(); endPathEdit();
    if (R.playTime != null) S.stopPreview();
    spotEdit = { id };
    if (!sel.includes(id) || sel.length !== 1) { sel = [id]; emit('selection'); }
    syncNode(el);
    buildSpotHandles();
    attachTransformer();
    S.hint('Click the photo to add a blur spot · drag a spot to move it · drag its ring handle to resize · double-click to remove · Esc when done', 4500);
    emit('spotedit', true);
  };
  function endSpotEdit() {
    if (!spotEdit) return;
    const el = spotEl();
    spotEdit = null;
    spotGroup.destroyChildren();
    if (el) syncNode(el);
    attachTransformer();
    uiLayer.batchDraw();
    emit('spotedit', false);
  }
  S.endBlurSpots = endSpotEdit;
  S.isEditingSpots = () => !!spotEdit;
  function spotPts(el) {
    if (!el.filters) el.filters = {};
    if (!el.filters.blurPts) el.filters.blurPts = [];
    if (!el.filters.blurArea || el.filters.blurArea === 'all') el.filters.blurArea = 'spots';
    return el.filters.blurPts;
  }
  function addSpotAt(p) {
    const el = spotEl(), n = nodes.get(el.id), map = R.imageBoxMap(el);
    if (!map) return;
    const lp = n.getTransform().copy().invert().point(p), q = map.toImg(lp.x, lp.y);
    if (q.u < 0 || q.u > 1 || q.v < 0 || q.v > 1) return;
    spotPts(el).push({ x: q.u, y: q.v, r: 0.12 });
    el.filters = Object.assign({}, el.filters);
    layer.batchDraw(); buildSpotHandles(); S.commit(); emit('values'); emit('spotedit', true);
  }
  function buildSpotHandles() {
    spotGroup.destroyChildren();
    const el = spotEl(), n = el && nodes.get(el.id), map = el && R.imageBoxMap(el);
    if (!el || !n || !map) return;
    const s = S.view.scale, T = n.getTransform();
    const pts = (el.filters && el.filters.blurPts) || [];
    const commit = () => { el.filters = Object.assign({}, el.filters, { blurPts: pts.map(p => Object.assign({}, p)) }); layer.batchDraw(); buildSpotHandles(); S.commit(); emit('values'); };
    pts.forEach((p, i) => {
      const bc = map.toBox(p.x, p.y), c = T.point(bc), rr = p.r * map.unit;
      const ring = new Konva.Circle({ x: c.x, y: c.y, radius: rr, stroke: '#ffffff', strokeWidth: 2 / s, dash: [6 / s, 5 / s], shadowColor: '#000', shadowBlur: 3, shadowOpacity: 0.6, listening: false });
      const dot = new Konva.Circle({ x: c.x, y: c.y, radius: 8 / s, fill: '#5b4cf5', stroke: '#fff', strokeWidth: 2 / s, draggable: true, hitStrokeWidth: 10 / s });
      const knob = new Konva.Circle({ x: c.x + rr, y: c.y, radius: 6 / s, fill: '#ffffff', stroke: '#5b4cf5', strokeWidth: 2 / s, draggable: true, hitStrokeWidth: 10 / s });
      dot.on('mousedown touchstart', ev => { ev.cancelBubble = true; });
      knob.on('mousedown touchstart', ev => { ev.cancelBubble = true; });
      dot.on('dragmove', () => { ring.position(dot.position()); knob.position({ x: dot.x() + ring.radius(), y: dot.y() }); uiLayer.batchDraw(); });
      dot.on('dragend', () => { const lp = T.copy().invert().point(dot.position()), q = map.toImg(lp.x, lp.y); pts[i] = Object.assign({}, p, { x: Math.min(1, Math.max(0, q.u)), y: Math.min(1, Math.max(0, q.v)) }); commit(); });
      knob.on('dragmove', () => { const r2 = Math.max(10 / s, Math.hypot(knob.x() - dot.x(), knob.y() - dot.y())); ring.radius(r2); uiLayer.batchDraw(); });
      knob.on('dragend', () => { pts[i] = Object.assign({}, p, { r: Math.max(0.01, ring.radius() / map.unit) }); commit(); });
      dot.on('dblclick dbltap', () => { pts.splice(i, 1); commit(); emit('spotedit', true); });
      dot.on('mouseenter', () => { area.style.cursor = 'move'; }); dot.on('mouseleave', () => { area.style.cursor = ''; });
      knob.on('mouseenter', () => { area.style.cursor = 'ew-resize'; }); knob.on('mouseleave', () => { area.style.cursor = ''; });
      spotGroup.add(ring, dot, knob);
    });
    uiLayer.batchDraw();
  }
  S.on('view', () => { if (spotEdit) buildSpotHandles(); });
  S.on('values', () => { if (spotEdit && !spotGroup.find('Circle').some(c => c.isDragging())) buildSpotHandles(); });

  /* ───────────────────────── text editing ───────────────────────── */

  let textEdit = null;
  function onDouble(id) {
    const el = elMap.get(id);
    if (!el || el.locked) return;
    if (el.type === 'text') S.editText(id);
    else if (el.type === 'image') { if (el.assetId) startCrop(id); else S.pickImages({ replaceId: id }); }
    else if (el.type === 'ribbon') startPathEdit(id);
    else emit('focusInspector', el);
  }
  // in videos, text is typed into the side panel: animated text can't be edited in place
  S.isVideoText = el => !!(el && el.type === 'text' && (R.hasAnim(el) || S.hasAnimation()));
  S.editText = function (id) {
    const el = elMap.get(id);
    if (!el) return;
    if (S.isVideoText(el)) { if (R.playTime != null) S.stopPreview(); if (!sel.includes(id) || sel.length !== 1) S.select([id]); emit('focusText', id); }
    else S.startTextEdit(id);
  };
  S.startTextEdit = function (id) {
    const el = elMap.get(id);
    if (!el || el.type !== 'text') return;
    if (textEdit) finishTextEdit();
    sel = [id];
    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.spellcheck = false;
    ta.value = el.text;
    overlayEl.appendChild(ta);
    textEdit = { id, ta, before: el.text };
    attachTransformer();
    emit('selection');
    positionTextEditor();
    ta.focus();
    ta.select();
    ta.addEventListener('input', () => {
      el.text = ta.value;
      autosize(el);
      syncNode(el);
      layer.batchDraw();
      positionTextEditor();
      emit('values');
    });
    ta.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); finishTextEdit(); }
    });
    ta.addEventListener('blur', () => setTimeout(() => { if (textEdit && textEdit.ta === ta) finishTextEdit(); }, 0));
  };
  function positionTextEditor() {
    if (!textEdit) return;
    const el = elMap.get(textEdit.id), n = nodes.get(textEdit.id);
    if (!el || !n) return;
    const L = R.layoutText(el);
    const ta = textEdit.ta;
    const m = n.getAbsoluteTransform().getMatrix();
    const meta = window.StudioFonts.BY_NAME[el.fontFamily];
    ta.style.font = `${el.italic ? 'italic ' : ''}${meta ? window.StudioFonts.nearestWeight(el.fontFamily, el.fontWeight) : el.fontWeight} ${el.fontSize}px "${el.fontFamily}"`;
    ta.style.letterSpacing = (el.letterSpacing || 0) * el.fontSize + 'px';
    ta.style.textTransform = el.uppercase ? 'uppercase' : 'none';
    ta.style.textAlign = el.align;
    ta.style.caretColor = el.fill && el.fill !== 'transparent' ? el.fill : '#5b4cf5';
    const curved = L.curved;
    ta.style.color = curved ? 'rgba(0,0,0,.0)' : 'transparent';
    ta.style.whiteSpace = el.autoWidth || curved ? 'pre' : 'pre-wrap';
    const lh = L.lineBg ? L.slot : L.lh;
    ta.style.lineHeight = lh + 'px';
    const top = L.lineBg ? -(el.bg.gap || 0) / 2 : L.padY;
    const w = Math.max(20, L.boxW - L.padX * 2 + (el.autoWidth ? el.fontSize : 2));
    const lines = Math.max(1, (L.lines.length || 1));
    let left = L.padX - (el.autoWidth ? (el.align === 'center' ? el.fontSize / 2 : el.align === 'right' ? el.fontSize : 0) : 0);
    ta.style.width = w + 'px';
    ta.style.height = (lines * lh + 4) + 'px';
    if (curved) { left = 0; ta.style.width = L.boxW + 'px'; ta.style.background = 'rgba(255,255,255,.75)'; ta.style.color = el.fill; ta.style.height = (lh + 4) + 'px'; }
    ta.style.transform = `matrix(${m.join(',')}) translate(${left}px, ${curved ? L.boxH / 2 - lh / 2 : top}px)`;
  }
  function finishTextEdit(silent) {
    if (!textEdit) return;
    const { id, ta, before } = textEdit;
    textEdit = null;
    ta.remove();
    const el = elMap.get(id);
    if (el && !el.text.trim() && !silent) {
      // an emptied text box is removed rather than left invisible
      doc.elements = doc.elements.filter(e => e.id !== id);
      sel = [];
      rebuild();
      S.commit();
      emit('selection');
      return;
    }
    attachTransformer();
    if (el && el.text !== before) S.commit();
    emit('selection');
  }
  S.finishTextEdit = finishTextEdit;
  S.isEditingText = () => !!textEdit;

  /* ───────────────────────── eraser ───────────────────────── */

  let erasing = null;
  const brush = document.createElement('div');
  brush.className = 'eraser-brush';
  brush.style.display = 'none';
  overlayEl.appendChild(brush);
  S.setTool = function (tool) {
    if (textEdit) finishTextEdit();
    endCrop();
    S.tool = tool;
    for (const el of doc.elements) syncNode(el);
    area.style.cursor = tool === 'erase' ? 'none' : tool === 'hand' ? 'grab' : '';
    if (pathEdit) endPathEdit();
    area.classList.toggle('erasing', tool === 'erase');
    if (tool !== 'erase') brush.style.display = 'none';
    attachTransformer();
    if (tool === 'erase') S.hint(sel.length ? 'Paint over the selected layer to erase it' : 'Click a layer to start erasing it', 2600);
    emit('tool', tool);
  };
  function moveBrush(e) {
    const rect = area.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) { brush.style.display = 'none'; return; }
    const d = S.eraser.size * S.view.scale;
    brush.style.display = 'block';
    brush.style.width = brush.style.height = d + 'px';
    brush.style.borderRadius = S.eraser.shape === 'circle' ? '50%' : '2px';
    brush.style.left = (e.clientX - rect.left - d / 2) + 'px';
    brush.style.top = (e.clientY - rect.top - d / 2) + 'px';
    brush.classList.toggle('restore', S.eraser.mode === 'restore');
  }
  S.refreshBrush = () => { if (S.tool === 'erase' && lastPointer) moveBrush(lastPointer); };
  let lastPointer = null;
  window.addEventListener('pointermove', e => { lastPointer = { clientX: e.clientX, clientY: e.clientY }; });
  function localPoint(el, evt) {
    const n = nodes.get(el.id);
    const rect = area.getBoundingClientRect();
    const p = n.getAbsoluteTransform().copy().invert().point({ x: evt.clientX - rect.left, y: evt.clientY - rect.top });
    return [p.x / el.width, p.y / el.height];
  }
  function eraseStart(evt, target) {
    // keep erasing the selected layer while the brush is over it; otherwise take the layer under the brush
    const hitId = target && target.id && target.id();
    let el = hitId && elMap.has(hitId) ? elMap.get(hitId) : null;
    if (sel.length === 1) { const cur = elMap.get(sel[0]); if (cur && (!el || hitsEl(cur, evt))) el = cur; }
    if (!el) { emit('toast', 'Click a layer to erase it'); return; }
    if (el.locked) { emit('toast', 'Unlock this layer to erase it'); return; }
    if (sel[0] !== el.id || sel.length !== 1) S.select([el.id]);
    const [u, v] = localPoint(el, evt);
    const st = { m: S.eraser.mode, s: S.eraser.shape, r: S.eraser.size / 2 / el.width, p: [round4(u), round4(v)] };
    if (!el.erase) el.erase = [];
    el.erase.push(st);
    erasing = { el, st, last: [u, v] };
    layer.batchDraw();
  }
  function hitsEl(el, evt) {
    const [u, v] = localPoint(el, evt);
    return u >= 0 && u <= 1 && v >= 0 && v <= 1;
  }
  const round4 = v => Math.round(v * 10000) / 10000;
  function eraseMove(e) {
    const { el, st, last } = erasing;
    const [u, v] = localPoint(el, e);
    const minStep = (S.eraser.size * 0.12) / el.width;
    if (Math.hypot((u - last[0]) * el.width / el.height, v - last[1]) < minStep * Math.min(1, el.width / el.height) && Math.abs(u - last[0]) < minStep) return;
    st.p.push(round4(u), round4(v));
    erasing.last = [u, v];
    layer.batchDraw();
  }
  S.clearErase = function (id) {
    const el = elMap.get(id);
    if (!el || !el.erase) return;
    delete el.erase;
    redraw(); S.commit(); emit('values');
  };

  /* ───────────────────────── playback ───────────────────────── */

  let playStart = 0, raf = 0;
  S.isPlaying = () => playing;
  S.hasAnimation = () => doc.elements.some(R.hasAnim) || R.hasCamera(doc) || R.hasVideo(doc);
  function applyCamera(t) {
    const cam = t != null ? R.camAt(doc, t) : null;
    const a = cam ? { x: doc.width / 2, y: doc.height / 2, offsetX: cam.fx, offsetY: cam.fy, scaleX: cam.z, scaleY: cam.z, rotation: cam.r }
      : { x: 0, y: 0, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0 };
    art.setAttrs(a); bgCam.setAttrs(a);
    bgLayer.batchDraw();
  }
  S.applyCamera = applyCamera;
  S.play = function () {
    if (playing) return;
    if (textEdit) finishTextEdit();
    endCrop();
    playing = true;
    R.playing = true;
    const D = doc.anim.duration;
    playStart = performance.now() - ((R.playTime || 0) % D) * 1000;
    for (const el of doc.elements) syncNode(el);
    tr.visible(false); hoverRect.visible(false); quick.style.display = 'none';
    uiLayer.batchDraw();
    const tick = now => {
      if (!playing) return;
      const t = ((now - playStart) / 1000) % doc.anim.duration;
      R.playTime = t;
      applyCamera(t);
      layer.batchDraw();
      if (R.isVideoAsset(doc.background.assetId)) bgLayer.batchDraw();
      emit('time', t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    emit('playstate', true);
  };
  S.pause = function () {
    if (!playing) return;
    playing = false;
    R.playing = false;
    R.pauseVideos();
    cancelAnimationFrame(raf);
    for (const el of doc.elements) syncNode(el);
    tr.visible(true);
    attachTransformer();
    emit('playstate', false);
  };
  // show one moment of the animation without playing (null = the finished layout used for editing)
  S.seek = function (t) {
    R.playTime = t;
    applyCamera(t);
    layer.batchDraw(); bgLayer.batchDraw();
    emit('time', t);
  };
  S.stopPreview = function () { S.pause(); R.playTime = null; applyCamera(null); layer.batchDraw(); bgLayer.batchDraw(); emit('time', null); };

  /* ───────────────────────── crop mode ───────────────────────── */

  let cropState = null, cropDrag = null;
  const hintEl = $('#stage-hint');
  S.hint = function (msg, ms) {
    hintEl.textContent = msg || '';
    hintEl.classList.toggle('show', !!msg);
    clearTimeout(S.hint._t);
    if (ms) S.hint._t = setTimeout(() => hintEl.classList.remove('show'), ms);
  };
  function startCrop(id) {
    const el = elMap.get(id);
    if (!el || !el.assetId) return;
    cropState = { id };
    sel = [id];
    syncNode(el);
    attachTransformer();
    S.hint('Crop mode — drag to reposition, scroll to zoom, Esc or click outside to finish');
    emit('selection');
  }
  S.startCrop = startCrop;
  function endCrop() {
    if (!cropState) return;
    const el = elMap.get(cropState.id);
    cropState = null;
    if (el) syncNode(el);
    attachTransformer();
    S.hint('');
  }
  S.endCrop = endCrop;
  S.isCropping = () => !!cropState;
  function cropMetrics(el) {
    const img = R.assetImage(el.assetId);
    if (!img) return null;
    const g = R.frameGeometry(el);
    const { w: iw, h: ih } = R.mediaSize(img), r = g.rect;
    const sc = Math.max(r.w / iw, r.h / ih) * (el.crop.zoom || 1);
    return { ox: iw * sc - r.w, oy: ih * sc - r.h };
  }
  function cropDragStart(evt) {
    const el = elMap.get(cropState.id);
    cropDrag = { x: evt.clientX, y: evt.clientY, cx: el.crop.x ?? 0.5, cy: el.crop.y ?? 0.5 };
  }
  function cropDragMove(e) {
    const el = elMap.get(cropState.id);
    const m = cropMetrics(el);
    if (!m) return;
    const [lx, ly] = rotVec((e.clientX - cropDrag.x) / S.view.scale, (e.clientY - cropDrag.y) / S.view.scale, -(el.rotation || 0));
    const fx = el.flipX ? -1 : 1, fy = el.flipY ? -1 : 1;
    if (m.ox > 0.5) el.crop.x = clamp(cropDrag.cx - fx * lx / m.ox, 0, 1);
    if (m.oy > 0.5) el.crop.y = clamp(cropDrag.cy - fy * ly / m.oy, 0, 1);
    layer.batchDraw();
    emit('values');
  }
  function cropWheel(e) {
    const el = elMap.get(cropState.id);
    el.crop.zoom = clamp((el.crop.zoom || 1) * Math.exp(-e.deltaY * 0.002), 1, 6);
    layer.batchDraw();
    emit('values');
    clearTimeout(cropWheel.t);
    cropWheel.t = setTimeout(() => S.commit(), 300);
  }

  /* ───────────────────────── mutations ───────────────────────── */

  // generic property setter used by every inspector control
  S.change = function (target, path, value, live) {
    const objs = target === 'doc' ? [doc] : S.selEls();
    for (const o of objs) {
      setPath(o, path, value);
      if (target !== 'doc') {
        autosize(o);
        syncNode(o);
      }
    }
    if (target === 'doc') { if (path.startsWith('background.color')) artShadow.fill(doc.background.color); if (path.startsWith('camera') && R.playTime != null) applyCamera(R.playTime); }
    if (target !== 'doc' && /^(curve|type|locked|shape)$/.test(path)) attachTransformer();
    tr.forceUpdate();
    redraw();
    positionOverlays(live);
    if (textEdit) positionTextEditor();
    if (!live) S.commit();
    emit('values', path);
  };
  S.changeEl = function (el, fn, live) {
    fn(el);
    autosize(el);
    syncNode(el);
    tr.forceUpdate();
    redraw();
    if (!live) S.commit();
    emit('values');
  };
  S.touchAll = function () { for (const el of doc.elements) { autosize(el); syncNode(el); } sizeArt(); tr.forceUpdate(); redraw(); };
  function getPath(o, p) { return p.split('.').reduce((a, k) => a == null ? undefined : a[k], o); }
  function setPath(o, p, v) {
    const ks = p.split('.');
    let t = o;
    for (let i = 0; i < ks.length - 1; i++) {
      if (t[ks[i]] == null || typeof t[ks[i]] !== 'object') t[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      t = t[ks[i]];
    }
    t[ks[ks.length - 1]] = v;
  }
  S.getPath = getPath;
  S.setPath = setPath;

  S.addElement = function (el, opts = {}) {
    el = normalize(el);
    if (opts.center !== false && el.x === 0 && el.y === 0 && el.cx == null) {
      el.cx = doc.width / 2; el.cy = doc.height / 2;
    }
    autosize(el, false);
    if (opts.at) { el.x = opts.at.x - el.width / 2; el.y = opts.at.y - el.height / 2; }
    if (opts.index != null) doc.elements.splice(opts.index, 0, el); else doc.elements.push(el);
    elMap.set(el.id, el);
    const n = makeNode(el);
    nodes.set(el.id, n);
    art.add(n);
    reorderNodes();
    if (opts.select !== false) S.select([el.id]);
    layer.batchDraw();
    if (opts.commit !== false) S.commit();
    R.preload({ elements: [el] }).then(() => R.requestRedraw());
    return el;
  };
  S.addElements = function (els) {
    const ids = [];
    for (const e of els) ids.push(S.addElement(e, { select: false, commit: false, center: false }).id);
    S.select(ids);
    S.commit();
  };
  S.removeSelected = function () {
    if (!sel.length) return;
    const set = new Set(sel);
    doc.elements = doc.elements.filter(e => !set.has(e.id));
    sel = [];
    rebuild();
    S.commit();
    emit('selection');
  };
  S.removeIds = function (ids) {
    const set = new Set(ids);
    doc.elements = doc.elements.filter(e => !set.has(e.id));
    sel = sel.filter(id => !set.has(id));
    rebuild();
    S.commit();
    emit('selection');
  };
  S.duplicate = function (offset = 24) {
    const els = S.selEls();
    if (!els.length) return;
    const copies = els.map(e => { const c = clone(e); c.id = uid(); c.x += offset; c.y += offset; c.locked = false; return c; });
    const maxIdx = Math.max(...els.map(e => doc.elements.indexOf(e)));
    doc.elements.splice(maxIdx + 1, 0, ...copies);
    rebuild();
    S.select(copies.map(c => c.id));
    S.commit();
  };
  let clipboard = null, pasteCount = 0;
  S.copy = function () { const els = S.selEls(); if (els.length) { clipboard = clone(els); pasteCount = 0; return true; } return false; };
  S.cut = function () { if (S.copy()) S.removeSelected(); };
  S.hasClipboard = () => !!clipboard;
  S.paste = function () {
    if (!clipboard) return;
    pasteCount++;
    const copies = clipboard.map(e => { const c = clone(e); c.id = uid(); c.x += 24 * pasteCount; c.y += 24 * pasteCount; return c; });
    doc.elements.push(...copies);
    rebuild();
    S.select(copies.map(c => c.id));
    S.commit();
  };
  S.order = function (op) {
    const els = S.selEls();
    if (!els.length) return;
    const arr = doc.elements;
    const set = new Set(els.map(e => e.id));
    if (op === 'front') doc.elements = [...arr.filter(e => !set.has(e.id)), ...arr.filter(e => set.has(e.id))];
    else if (op === 'back') doc.elements = [...arr.filter(e => set.has(e.id)), ...arr.filter(e => !set.has(e.id))];
    else if (op === 'forward') {
      for (let i = arr.length - 2; i >= 0; i--) if (set.has(arr[i].id) && !set.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    } else if (op === 'backward') {
      for (let i = 1; i < arr.length; i++) if (set.has(arr[i].id) && !set.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
    }
    reorderNodes();
    layer.batchDraw();
    S.commit();
    emit('doc');
  };
  S.moveLayer = function (id, toIndex) {
    const i = doc.elements.findIndex(e => e.id === id);
    if (i < 0) return;
    const [el] = doc.elements.splice(i, 1);
    doc.elements.splice(clamp(toIndex, 0, doc.elements.length), 0, el);
    reorderNodes();
    layer.batchDraw();
    S.commit();
    emit('doc');
  };
  S.align = function (op) {
    const els = S.selEls().filter(e => !e.locked);
    if (!els.length) return;
    const ns = els.map(e => nodes.get(e.id));
    const ref = els.length === 1 ? { x: 0, y: 0, width: doc.width, height: doc.height } : unionRect(ns);
    for (const el of els) {
      const r = nodes.get(el.id).getClientRect({ relativeTo: art });
      let dx = 0, dy = 0;
      if (op === 'left') dx = ref.x - r.x;
      if (op === 'hcenter') dx = ref.x + ref.width / 2 - (r.x + r.width / 2);
      if (op === 'right') dx = ref.x + ref.width - (r.x + r.width);
      if (op === 'top') dy = ref.y - r.y;
      if (op === 'vcenter') dy = ref.y + ref.height / 2 - (r.y + r.height / 2);
      if (op === 'bottom') dy = ref.y + ref.height - (r.y + r.height);
      el.x += dx; el.y += dy;
      syncNode(el);
    }
    tr.forceUpdate(); redraw(); S.commit(); positionOverlays(); emit('values');
  };
  S.distribute = function (axis) {
    const els = S.selEls().filter(e => !e.locked);
    if (els.length < 3) return;
    const items = els.map(e => ({ e, r: nodes.get(e.id).getClientRect({ relativeTo: art }) }));
    const k = axis === 'x' ? 'x' : 'y', d = axis === 'x' ? 'width' : 'height';
    items.sort((a, b) => a.r[k] - b.r[k]);
    const first = items[0].r, last = items[items.length - 1].r;
    const total = items.reduce((s, i) => s + i.r[d], 0);
    const gap = (last[k] + last[d] - first[k] - total) / (items.length - 1);
    let pos = first[k];
    for (const it of items) { it.e[k] += pos - it.r[k]; pos += it.r[d] + gap; syncNode(it.e); }
    tr.forceUpdate(); redraw(); S.commit(); positionOverlays(); emit('values');
  };
  S.toggleLock = function (ids = sel) {
    const els = ids.map(id => elMap.get(id)).filter(Boolean);
    const to = !els.every(e => e.locked);
    els.forEach(e => { e.locked = to; syncNode(e); });
    attachTransformer(); redraw(); S.commit(); emit('doc'); emit('selection');
  };
  S.toggleHidden = function (id) {
    const el = elMap.get(id);
    if (!el) return;
    el.hidden = !el.hidden;
    syncNode(el);
    if (el.hidden) sel = sel.filter(x => x !== id);
    attachTransformer(); redraw(); S.commit(); emit('doc'); emit('selection');
  };
  S.nudge = function (dx, dy) {
    const els = S.selEls().filter(e => !e.locked);
    if (!els.length) return;
    els.forEach(e => { e.x += dx; e.y += dy; syncNode(e); });
    tr.forceUpdate(); redraw(); positionOverlays();
    clearTimeout(S.nudge.t); S.nudge.t = setTimeout(() => S.commit(), 250);
    emit('values');
  };
  S.flip = function (axis) {
    for (const el of S.selEls()) {
      if (el.type === 'text') continue;
      if (axis === 'x') el.flipX = !el.flipX; else el.flipY = !el.flipY;
    }
    redraw(); S.commit(); emit('values');
  };
  S.selectAll = () => S.select(doc.elements.filter(e => !e.hidden && !e.locked).map(e => e.id));

  /* ───────────────────────── images ───────────────────────── */

  const fileInput = $('#file-input');
  let pickOpts = {};
  S.pickImages = function (opts = {}) { pickOpts = opts; fileInput.value = ''; fileInput.click(); };
  fileInput.addEventListener('change', () => { if (fileInput.files.length) S.importFiles([...fileInput.files], pickOpts); });

  function readImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const MAX = 2400;
        let w = img.naturalWidth, h = img.naturalHeight;
        const s = Math.min(1, MAX / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const alpha = /png|webp|gif|svg/.test(file.type);
        res({ src: c.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.92), w, h });
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read image')); };
      img.src = url;
    });
  }
  // videos are kept whole (muted, like on Instagram) so they can sit under the design
  const VIDEO_MAX_MB = 120;
  function readVideo(file) {
    return new Promise((res, rej) => {
      if (file.size > VIDEO_MAX_MB * 1048576) { rej(new Error(`Videos up to ${VIDEO_MAX_MB} MB work best — trim this one first`)); return; }
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true; v.preload = 'metadata';
      v.onloadedmetadata = () => {
        const w = v.videoWidth, h = v.videoHeight, duration = v.duration;
        URL.revokeObjectURL(url);
        if (!w || !h) { rej(new Error('This browser can’t play that video')); return; }
        const fr = new FileReader();
        fr.onload = () => {
          let src = String(fr.result);
          // some systems report no type for .mov; browsers read it as mp4
          if (src.startsWith('data:;') || src.startsWith('data:application/octet-stream')) src = 'data:video/mp4;' + src.slice(src.indexOf('base64'));
          if (src.startsWith('data:video/quicktime')) src = 'data:video/mp4;' + src.slice(src.indexOf('base64'));
          res({ src, w, h, duration, video: true });
        };
        fr.onerror = () => rej(new Error('Could not read video'));
        fr.readAsDataURL(file);
      };
      v.onerror = () => { URL.revokeObjectURL(url); rej(new Error('This browser can’t play that video')); };
      v.src = url;
    });
  }
  const isVideoFile = f => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name);
  // a design should run as long as its video, within the 30 s export limit
  function fitDurationToVideo(dur) {
    if (!dur || !isFinite(dur)) return;
    const want = Math.min(30, Math.round(dur * 10) / 10);
    if (want > doc.anim.duration + 0.05) { doc.anim.duration = want; emit('toast', `Design length set to ${want}s to match the video`); emit('values'); }
  }
  S.addAsset = function (src) { const id = uid('a'); assets[id] = src; return id; };
  S.importFiles = async function (files, opts = {}) {
    const imgs = files.filter(f => f.type.startsWith('image/') || (!opts.imagesOnly && isVideoFile(f)));
    if (!imgs.length) return;
    const added = [];
    for (const f of imgs) {
      try {
        const vid = isVideoFile(f);
        if (vid) emit('toast', 'Loading video…');
        const { src, w, h, duration } = vid ? await readVideo(f) : await readImage(f);
        const id = S.addAsset(src);
        if (vid) await R.assetVideo(id).promise;
        S.uploads.unshift(id);
        added.push({ id, w, h, video: vid, duration });
      } catch (e) { emit('toast', (e && e.message && !/^Could not read image$/.test(e.message) ? e.message : 'Couldn’t open ' + f.name)); }
    }
    if (!added.length) return;
    emit('uploads');
    if (opts.uploadOnly) { scheduleSave(); if (opts.onAdded) opts.onAdded(added); return added; }
    if (opts.startFromPhoto) {
      const a = added[0];
      const long = 1440, s = long / Math.max(a.w, a.h);
      const W = Math.round(a.w * s), H = Math.round(a.h * s);
      const d = blankDoc(W, H, '#ffffff');
      d.background.assetId = a.id;
      if (a.video) d.anim = { duration: Math.min(30, Math.round(a.duration * 10) / 10) || 5, fps: 30 };
      S.loadDoc(d, null, { name: a.video ? 'Video edit' : 'Photo edit', project: opts.newProject ? 'new' : undefined });
      if (opts.newProject) { S.uploads.splice(0, 0, ...added.map(x => x.id)); scheduleSave(); }
      if (opts.onStart) opts.onStart();
      return added;
    }
    if (opts.asBackground) { S.setBackgroundImage(added[0].id); return added; }
    if (opts.replaceId && elMap.get(opts.replaceId)) {
      const el = elMap.get(opts.replaceId);
      el.assetId = added[0].id; el.crop = { zoom: 1, x: 0.5, y: 0.5 };
      if (added[0].video) { el.video = { trim: 0, speed: 1 }; fitDurationToVideo(added[0].duration); if (el.studio) el.studio.on = false; }
      redraw(); S.commit(); emit('doc'); positionOverlays();
      emit('replaced', el);
      return added;
    }
    const ids = [];
    added.forEach((a, i) => {
      const box = Math.min(doc.width, doc.height) * 0.6;
      const s = Math.min(box / a.w, box / a.h);
      const el = S.mk('image', { assetId: a.id, width: a.w * s, height: a.h * s });
      if (a.video) { el.video = { trim: 0, speed: 1 }; fitDurationToVideo(a.duration); }
      const at = opts.at || { x: doc.width / 2, y: doc.height / 2 };
      el.x = at.x - el.width / 2 + i * 30; el.y = at.y - el.height / 2 + i * 30;
      ids.push(S.addElement(el, { select: false, commit: false, center: false }).id);
    });
    S.select(ids);
    S.commit();
    return added;
  };
  S.setBackgroundImage = function (assetId) {
    doc.background.assetId = assetId;
    doc.background.crop = { zoom: 1, x: 0.5, y: 0.5 };
    if (R.isVideoAsset(assetId)) fitDurationToVideo(R.assetVideo(assetId).v.duration);
    redraw(); S.commit(); emit('values'); emit('doc');
  };
  S.addImageFromAsset = function (assetId) {
    const img = R.assetImage(assetId);
    const m = R.mediaSize(img) || { w: 800, h: 800 }, w = m.w, h = m.h;
    const box = Math.min(doc.width, doc.height) * 0.6, s = Math.min(box / w, box / h);
    const el = S.addElement(S.mk('image', { assetId, width: w * s, height: h * s }));
    if (R.isVideoAsset(assetId)) fitDurationToVideo(R.assetVideo(assetId).v.duration);
    return el;
  };

  // drag & drop: files from the desktop, stickers / presets from the panels
  const veil = $('#drop-veil');
  let dragDepth = 0;
  area.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; if ([...e.dataTransfer.types].includes('Files')) veil.classList.add('show'); });
  area.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; veil.classList.remove('show'); } });
  area.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  area.addEventListener('drop', e => {
    e.preventDefault();
    dragDepth = 0; veil.classList.remove('show');
    const at = docPoint(e.clientX, e.clientY);
    const files = [...(e.dataTransfer.files || [])];
    if (files.length) {
      const rect = area.getBoundingClientRect();
      const hit = stage.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      const el = hit && elMap.get(hit.id());
      if (el && el.type === 'image' && files.length === 1) S.importFiles(files, { replaceId: el.id });
      else S.importFiles(files, { at });
      return;
    }
    const data = e.dataTransfer.getData('application/x-studio');
    if (data) {
      try { emit('dropPayload', JSON.parse(data), at); } catch (err) { /* ignore */ }
    }
  });
  const CLIP_TAG = 'collage-studio/layers:';
  function typingTarget(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  function onCopy(e, cut) {
    if (typingTarget(e.target) || !sel.length) return;
    S.copy();
    try { e.clipboardData.setData('text/plain', CLIP_TAG + JSON.stringify(clipboard)); e.preventDefault(); } catch (err) { /* internal clipboard still works */ }
    if (cut) S.removeSelected();
    emit('toast', `${cut ? 'Cut' : 'Copied'} ${clipboard.length} layer${clipboard.length > 1 ? 's' : ''}`);
  }
  window.addEventListener('copy', e => onCopy(e, false));
  window.addEventListener('cut', e => onCopy(e, true));
  window.addEventListener('paste', e => {
    if (typingTarget(e.target) || document.body.classList.contains('at-home')) return;
    const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (text && text.startsWith(CLIP_TAG)) {
      e.preventDefault();
      try {
        const els = JSON.parse(text.slice(CLIP_TAG.length));
        // layers copied from another tab may reference photos this tab doesn't have
        const usable = els.filter(el => !el.assetId || assets[el.assetId]);
        if (usable.length) { clipboard = usable; S.paste(); } else if (clipboard) S.paste();
      } catch (err) { if (clipboard) S.paste(); }
      return;
    }
    const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); S.importFiles(files); return; }
    if (text && text.trim()) {
      e.preventDefault();
      S.addElement(S.mk('text', { text: text.trim().slice(0, 2000), fontSize: Math.round(doc.width * 0.05), fontFamily: 'Instrument Sans', lineHeight: 1.25 }));
      return;
    }
    if (clipboard) { e.preventDefault(); S.paste(); }
  });

  /* ───────────────────────── keyboard ───────────────────────── */

  window.addEventListener('keydown', e => {
    // the editor sits behind the home page; its shortcuts wait until a design is open
    if (document.body.classList.contains('at-home')) return;
    if (e.key === ' ' ) keys.space = !isTyping(e);
    keys.alt = e.altKey; keys.shift = e.shiftKey; keys.ctrl = e.ctrlKey || e.metaKey;
    if (keys.space && !panning) area.style.cursor = 'grab';
    if (isTyping(e)) return;
    if (document.querySelector('.modal-back')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (e.key === ' ') { e.preventDefault(); return; }
    if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? S.redo() : S.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); S.redo(); return; }
    if (mod && k === 'd') { e.preventDefault(); S.duplicate(); return; }
    // ⌘C / ⌘X / ⌘V arrive as copy / cut / paste events below so the system clipboard is used too
    if (mod && (k === 'c' || k === 'x' || k === 'v')) return;
    if (mod && k === 'a') { e.preventDefault(); S.selectAll(); return; }
    if (mod && k === 'l') { e.preventDefault(); S.toggleLock(); return; }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); S.zoomBy(1.2); return; }
    if (mod && k === '-') { e.preventDefault(); S.zoomBy(1 / 1.2); return; }
    if (mod && k === '0') { e.preventDefault(); S.fit(); return; }
    if (mod && k === '1') { e.preventDefault(); S.zoomAt(1); return; }
    if (mod && e.key === ']') { e.preventDefault(); S.order(e.shiftKey ? 'front' : 'forward'); return; }
    if (mod && e.key === '[') { e.preventDefault(); S.order(e.shiftKey ? 'back' : 'backward'); return; }
    if (mod && k === 's') { e.preventDefault(); if (S.projectId) S.projects.markSaved().then(() => emit('toast', 'Saved to your designs')); return; }
    if (mod && k === 'e') { e.preventDefault(); emit('export'); return; }
    if (mod) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { if (sel.length) { e.preventDefault(); S.removeSelected(); } return; }
    if (e.key === 'Escape') { if (playing) S.pause(); else if (pathEdit) endPathEdit(); else if (spotEdit) endSpotEdit(); else if (S.tool !== 'select') S.setTool('select'); else if (cropState) endCrop(); else S.select([]); return; }
    if (k === 'e') { S.setTool(S.tool === 'erase' ? 'select' : 'erase'); return; }
    if (k === 'v' && S.tool !== 'select') { S.setTool('select'); return; }
    if (k === 'h') { S.setTool(S.tool === 'hand' ? 'select' : 'hand'); return; }
    if (S.tool === 'erase' && (e.key === '[' || e.key === ']')) { S.eraser.size = clamp(S.eraser.size * (e.key === ']' ? 1.2 : 1 / 1.2), 4, 800); S.refreshBrush(); emit('tool', 'erase'); return; }
    if (k === 'p') { playing ? S.pause() : S.play(); return; }
    if (e.key === 'Enter') {
      if (cropState) { endCrop(); return; }
      const els = S.selEls();
      if (els.length === 1 && els[0].type === 'text') { e.preventDefault(); S.editText(els[0].id); }
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { e.preventDefault(); S.nudge(-step, 0); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); S.nudge(step, 0); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); S.nudge(0, -step); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); S.nudge(0, step); return; }
    if (k === 'g') { S.settings.grid = !S.settings.grid; saveSettings(); redraw(); emit('settings'); return; }
    if (k === 't') { emit('addText'); return; }
    if (e.key === '?') { emit('help'); return; }
  });
  window.addEventListener('keyup', e => {
    if (e.key === ' ') { keys.space = false; if (!panning) area.style.cursor = S.tool === 'erase' ? 'none' : ''; }
    keys.alt = e.altKey; keys.shift = e.shiftKey; keys.ctrl = e.ctrlKey || e.metaKey;
  });
  window.addEventListener('blur', () => { keys.space = keys.alt = keys.shift = keys.ctrl = false; });
  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  /* ───────────────────────── export ───────────────────────── */

  S.render = async function (opts = {}) {
    if (textEdit) finishTextEdit();
    await R.preload(doc);
    return R.renderDoc(doc, opts);
  };

  S.emit = emit;
  S.redrawUI = () => uiLayer.batchDraw();
  S.applySettings = () => { redraw(); };
  S.rebuild = rebuild;
  S.syncNode = syncNode;
  S.attachTransformer = attachTransformer;
  S.nodeRect = id => { const n = nodes.get(id); return n ? n.getClientRect({ relativeTo: art }) : null; };
})();
