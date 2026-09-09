/* Perspective — application: state, UI, interactions, camera, 3D layout, export flow. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, d = 2) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  /* ------------------------------------------------------------------ state */
  const defaultCamera = () => ({ aperture: 0.55, sharpNear: 0.9, sharpFar: 3.6, farFade: FADE_OFF, keys: [] });
  const FADE_OFF = 12;   // the top of the Fade far words range means "never fade"
  const defaultMedia = () => ({ bg: '#0f0f12', scale: 1, x: 0, y: 0, locked: false });
  const defaultMask = () => ({ enabled: false, roundness: 0.55, feather: 0.08, show: true, keys: [] });
  const MASK_FIELDS = ['x', 'y', 'w', 'h'];
  const state = {
    layers: [],
    selectedIds: [],       // ordered; the first entry is the primary selection
    selectedKeyId: null,      // selected camera keyframe (exclusive with the other selections)
    selectedMaskKeyId: null,  // selected subject-mask keyframe
    camera: defaultCamera(),
    media: defaultMedia(),
    mask: defaultMask(),
    maskEdit: false,      // dragging on the preview moves the mask instead of the text
    video: { file: null, url: null, width: 0, height: 0, duration: 0, ready: false },
    aspect: 9 / 16,
    duration: 10,
    fov: 45,
    loop: true,
    muted: false,
    exporting: false,
    view: 'preview',       // preview | split | layout
    undo: [],
    redo: [],
    lastCommitted: null,
  };

  const els = {
    canvas: $('#preview'),
    wrap: $('#previewWrap'),
    views: $('#views'),
    layoutWrap: $('#layoutWrap'),
    layoutCanvas: $('#layoutCanvas'),
    layoutHint: $('#layoutHint'),
    layoutTools: $('#layoutTools'),
    video: $('#video'),
    dropHint: $('#dropHint'),
    tlBody: $('#tlBody'),
    tlEmpty: $('#tlEmpty'),
    ruler: $('#ruler'),
    playhead: $('#playhead'),
    timeLabel: $('#timeLabel'),
    camReadout: $('#camReadout'),
    btnPlay: $('#btnPlay'),
    inspectorEmpty: $('#inspectorEmpty'),
    inspectorBody: $('#inspectorBody'),
    cameraKeyBody: $('#cameraKeyBody'),
    sections: $('#inspectorSections'),
    keySections: $('#cameraKeySections'),
    layerName: $('#layerName'),
    multiTitle: $('#multiTitle'),
    camTrack: $('#camTrack'),
    toast: $('#toast'),
  };

  let renderer;
  try {
    renderer = new Renderer(els.canvas);
  } catch (e) {
    alert(e.message);
    throw e;
  }

  /* ------------------------------------------------------------------ helpers */
  function frameAspect() {
    return state.video.ready ? state.video.width / state.video.height : state.aspect;
  }
  function duration() {
    return state.video.ready ? state.video.duration : state.duration;
  }
  function fmtTime(t) {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
  }
  let toastTimer = 0;
  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), isError ? 5000 : 2600);
  }
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  }
  const stripper = (k, v) => (k.startsWith('_') ? undefined : v);
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function hexToRgb01(hex) {
    let h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  function normaliseHex(v) {
    v = String(v || '').trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map((ch) => ch + ch).join('');
    return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null;
  }

  /* When hosted inside a claude.ai artifact, plain <a download> links are blocked; the page must hand
   * files to the viewer through the `downloads` capability instead. Resolved lazily; null elsewhere. */
  let downloadsCap = null;
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then((d) => { downloadsCap = d; }).catch(() => {});
  }
  async function saveFile(blob, filename) {
    if (downloadsCap) {
      try {
        await downloadsCap.save({ filename, data: blob });
        toast(`Saved ${filename}`);
      } catch (e) {
        if (e && e.code === 'declined') return;
        toast(`Could not save the file: ${(e && (e.message || e.code)) || e}`, true);
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  /* ------------------------------------------------------------------ clock */
  const clock = {
    _t: 0, _playing: false, _last: 0,
    get time() { return state.video.ready ? els.video.currentTime : this._t; },
    set time(v) {
      v = clamp(v, 0, duration());
      if (state.video.ready) els.video.currentTime = v; else this._t = v;
      invalidate();
    },
    get playing() { return state.video.ready ? !(els.video.paused || els.video.ended) : this._playing; },
    play() {
      if (state.video.ready) {
        if (els.video.ended || els.video.currentTime >= duration() - 0.01) els.video.currentTime = 0;
        els.video.play().catch((e) => toast('Playback blocked: ' + e.message, true));
      } else {
        if (this._t >= duration() - 0.001) this._t = 0;
        this._playing = true;
        this._last = performance.now();
      }
      updatePlayButton();
    },
    pause() {
      if (state.video.ready) els.video.pause(); else this._playing = false;
      updatePlayButton();
    },
    toggle() { this.playing ? this.pause() : this.play(); },
    tick(now) {
      if (state.video.ready || !this._playing) return;
      this._t += (now - this._last) / 1000;
      this._last = now;
      if (this._t >= duration()) {
        if (state.loop) this._t = this._t % duration();
        else { this._t = duration(); this.pause(); }
      }
    },
  };
  function updatePlayButton() {
    els.btnPlay.classList.toggle('playing', clock.playing);
  }

  /* ------------------------------------------------------------------ camera */
  function layerDepth(cam, l) {
    return renderer.viewDepth(cam, l.transform.x, l.transform.y, l.transform.z);
  }
  function planeDepth(cam) {
    return Math.max(0.1, renderer.viewDepth(cam, state.media.x, state.media.y, 0));
  }

  /* Absolute camera for the renderer at time t: keyframe offsets + focus + fade. */
  function cameraAt(t) {
    const d = renderer.camDist;
    const k = Camera.evaluate(state.camera.keys, t);
    const far = state.camera.farFade == null ? FADE_OFF : state.camera.farFade;
    const sharpNear = state.camera.sharpNear == null ? 0.9 : state.camera.sharpNear;
    const sharpFar = state.camera.sharpFar == null ? 3.6 : state.camera.sharpFar;
    return {
      x: k.x, y: k.y, z: d - k.dolly, yaw: k.yaw, pitch: k.pitch, roll: k.roll,
      aperture: state.camera.aperture,
      // The sharp band travels with the camera: crisp between these distances from the lens.
      sharpNear, sharpFar: Math.max(sharpFar, sharpNear + 0.2),
      fade: { near: 0.28, farStart: far, farEnd: far >= FADE_OFF ? 0 : far * 1.35 },
    };
  }

  /* ---- subject mask ---------------------------------------------------- */
  const getMaskKey = (id) => state.mask.keys.find((k) => k.id === id);
  const selectedMaskKey = () => getMaskKey(state.selectedMaskKeyId);
  const MASK_DEFAULT = { x: 0, y: -0.15, w: 0.45, h: 0.85 };

  /* The mask shape at time t, or null when there are no keys. */
  function maskShapeAt(t) {
    return Camera.evaluateOn(state.mask.keys, t, MASK_FIELDS);
  }
  function maskForRender(t) {
    if (!state.mask.enabled) return null;
    const shape = maskShapeAt(t) || MASK_DEFAULT;
    return Object.assign({ enabled: true, roundness: state.mask.roundness, feather: state.mask.feather }, shape);
  }
  /* The mask key at the playhead, creating one from the current shape when there is none. */
  function maskKeyAtPlayhead() {
    const t = round(clock.time, 2);
    let key = state.mask.keys.find((k) => Math.abs(k.t - t) <= 0.05);
    if (!key) {
      const shape = maskShapeAt(t) || MASK_DEFAULT;
      key = Camera.defaultKey(t, Object.assign({}, shape));
      state.mask.keys = Camera.sorted(state.mask.keys.concat([key]));
    }
    return key;
  }

  const getKey = (id) => state.camera.keys.find((k) => k.id === id);
  const selectedKey = () => getKey(state.selectedKeyId);

  /* Keys past the end of the timeline are pulled back to the end (keeping only the last of them) so a
   * camera move still completes instead of freezing on its first key. */
  function clampCameraKeys(T) {
    const inside = state.camera.keys.filter((k) => k.t <= T);
    const beyond = state.camera.keys.filter((k) => k.t > T).sort((a, b) => b.t - a.t);
    if (beyond.length) {
      const last = beyond[0];
      last.t = T;
      if (!inside.some((k) => Math.abs(k.t - T) < 0.02)) inside.push(last);
    }
    state.camera.keys = Camera.sorted(inside);
  }

  function addCameraKey(t, patch) {
    const cur = Camera.evaluate(state.camera.keys, t);
    const key = Camera.defaultKey(t, Object.assign({ x: cur.x, y: cur.y, dolly: cur.dolly, yaw: cur.yaw, pitch: cur.pitch, roll: cur.roll, focus: cur.focus }, patch || {}));
    key.x = round(key.x, 3); key.y = round(key.y, 3); key.dolly = round(key.dolly, 3);
    key.yaw = round(key.yaw, 1); key.pitch = round(key.pitch, 1); key.roll = round(key.roll, 1);
    state.camera.keys = state.camera.keys.filter((k) => Math.abs(k.t - t) > 0.02).concat([key]);
    state.camera.keys = Camera.sorted(state.camera.keys);
    return key;
  }
  /* The key at the playhead, creating one when there is none within 50 ms. */
  function keyAtPlayhead() {
    const t = round(clock.time, 2);
    let key = state.camera.keys.find((k) => Math.abs(k.t - t) <= 0.05);
    if (!key) key = addCameraKey(t);
    return key;
  }
  /* Dolly that makes the scaled video fill the frame exactly. */
  const fitDolly = () => round(renderer.camDist * (1 - state.media.scale), 3);

  function applyCameraMove(move) {
    const sel = selectedLayers();
    let s, e;
    if (sel.length) {
      s = Math.min(...sel.map((l) => l.start));
      e = Math.max(...sel.map((l) => l.end));
    } else {
      s = clamp(clock.time, 0, Math.max(0, duration() - 0.5));
      e = Math.min(duration(), s + 3);
    }
    if (e - s < 0.2) { toast('The range is too short for a camera move', true); return; }
    const pool = sel.length ? sel : state.layers.filter((l) => !l.hidden && l.start < e && l.end > s);
    const ctx = { maxZ: pool.length ? Math.max(...pool.map((l) => l.transform.z)) : null, fitDolly: fitDolly() };
    const keys = move.build(s, e, renderer.camDist, ctx);
    state.camera.keys = Camera.replaceRange(state.camera.keys, s, e, keys);
    state.selectedKeyId = null;
    commit();
    refreshAll();
    clock.pause();
    clock.time = s;
    clock.play();
    toast(`${move.name} · ${fmtTime(s)} → ${fmtTime(e)}`);
  }

  /* ------------------------------------------------------------------ render loop */
  let needsRender = true;
  function invalidate() { needsRender = true; }

  function fitPreview() {
    const availW = els.wrap.clientWidth - 36, availH = els.wrap.clientHeight - 36;
    if (availW <= 0 || availH <= 0) return;
    const aspect = frameAspect();
    let w = availW, h = w / aspect;
    if (h > availH) { h = availH; w = h * aspect; }
    els.canvas.style.width = `${Math.round(w)}px`;
    els.canvas.style.height = `${Math.round(h)}px`;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.resize(Math.round(w * dpr), Math.round(h * dpr));
    invalidate();
  }

  function mediaForRender() {
    return { scale: state.media.scale, x: state.media.x, y: state.media.y, locked: !!state.media.locked, bg: hexToRgb01(state.media.bg) };
  }

  function draw(time) {
    renderer.fovDeg = state.fov;
    renderer.render({
      video: state.video.ready ? els.video : null,
      videoReady: state.video.ready && els.video.readyState >= 2,
      layers: state.layers,
      time,
      frameHeightPx: els.canvas.height,
      selectedIds: state.exporting ? [] : state.selectedIds,
      camera: cameraAt(time),
      media: mediaForRender(),
      mask: maskForRender(time),
      showMask: !state.exporting && state.mask.enabled && state.mask.show,
    });
  }

  function frame(now) {
    if (!state.exporting) {
      clock.tick(now);
      if (clock.playing || needsRender) {
        needsRender = false;
        if (state.view !== 'layout') draw(clock.time);
        updateTimeUI();
        if (layoutVisible()) layoutView.draw();
      }
    }
    requestAnimationFrame(frame);
  }

  function updateTimeUI() {
    const t = clock.time, T = duration();
    els.timeLabel.innerHTML = `${fmtTime(t)} <span class="muted">/ ${fmtTime(T)}</span>`;
    const trackW = els.ruler.clientWidth;
    const namesW = 150;
    els.playhead.style.left = `${namesW + (t / Math.max(0.001, T)) * trackW}px`;
    const cam = cameraAt(t);
    const zoom = (renderer.camDist * state.media.scale) / planeDepth(cam);
    els.camReadout.textContent = `Camera ${cam.z.toFixed(2)} from video · footage ${Math.round(zoom * 100)}%`;
  }

  /* ------------------------------------------------------------------ layers, selection & undo */
  let nextId = 1;
  const uid = () => `L${nextId++}_${Math.random().toString(36).slice(2, 6)}`;
  const getLayer = (id) => state.layers.find((l) => l.id === id);
  const selected = () => getLayer(state.selectedIds[0]);
  const selectedLayers = () => state.selectedIds.map(getLayer).filter(Boolean);
  const isSelected = (id) => state.selectedIds.includes(id);

  function addLayer(partial, opts = {}) {
    const l = Presets.deepMerge(Presets.defaultLayer(), partial || {});
    l.id = uid();
    l.start = clamp(l.start, 0, Math.max(0, duration() - 0.1));
    l.end = clamp(l.end, l.start + 0.1, duration());
    state.layers.push(l);
    if (opts.select !== false) { state.selectedIds = [l.id]; state.selectedKeyId = null; }
    return l;
  }

  const SHARP_GAP = 1.6;   // a comfortable distance in front of the lens, matching the sharp band
  function addBlankText() {
    let t = clock.time;
    let dur = Math.min(4, duration() - t);
    if (dur < 0.5) { t = 0; dur = Math.min(4, duration()); }
    // Place the new word just in front of the camera's current position so it is visible right away.
    const cam = cameraAt(clock.time);
    const z = round(clamp(cam.z - SHARP_GAP, -3, 10), 2);
    const k = Math.max(0.3, (cam.z - z) / renderer.camDist);
    const l = addLayer({
      text: 'Your text', name: 'Text', start: t, end: t + dur,
      style: { font: 'Helvetica Neue', weight: 800, size: round(0.1 * k, 3) },
      transform: { x: round(cam.x, 2), y: round(cam.y, 2), z, rx: 0, ry: 0, rz: 0, scale: 1 },
      anim: { in: { type: 'none' }, out: { type: 'none' } },
    });
    commit();
    refreshAll();
    focusTextInput();
    return l;
  }

  function deleteSelected() {
    if (state.selectedMaskKeyId) {
      state.mask.keys = state.mask.keys.filter((k) => k.id !== state.selectedMaskKeyId);
      state.selectedMaskKeyId = null;
      if (!state.mask.keys.length) { state.mask.enabled = false; syncMaskControls(); toast('Last mask key removed — the subject mask is off'); }
    } else if (state.selectedKeyId) {
      state.camera.keys = state.camera.keys.filter((k) => k.id !== state.selectedKeyId);
      state.selectedKeyId = null;
    } else if (state.selectedIds.length) {
      const ids = new Set(state.selectedIds);
      state.layers = state.layers.filter((l) => !ids.has(l.id));
      state.selectedIds = [];
    } else return;
    commit();
    refreshAll();
  }

  function duplicateSelected() {
    const src = selectedLayers();
    if (!src.length) return;
    const ids = [];
    for (const l of src) {
      const copy = JSON.parse(JSON.stringify(l, stripper));
      copy.id = uid();
      copy.name = `${l.name} copy`;
      copy.transform.y -= 0.12;
      const i = state.layers.indexOf(l);
      state.layers.splice(i + 1, 0, copy);
      ids.push(copy.id);
    }
    state.selectedIds = ids;
    commit();
    refreshAll();
  }

  function moveLayer(id, dir) {
    const i = state.layers.findIndex((l) => l.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= state.layers.length) return;
    const [l] = state.layers.splice(i, 1);
    state.layers.splice(j, 0, l);
    commit();
    refreshAll();
  }

  /* Selection: select(id) replaces; select(id, {toggle:true}) adds/removes; select(null) clears. */
  function select(id, opts = {}) {
    state.selectedKeyId = null;
    state.selectedMaskKeyId = null;
    if (opts.toggle && id) {
      if (isSelected(id)) state.selectedIds = state.selectedIds.filter((x) => x !== id);
      else state.selectedIds = state.selectedIds.concat([id]);
    } else if (id == null) {
      if (!state.selectedIds.length && !state.selectedKeyId) return;
      state.selectedIds = [];
    } else {
      if (state.selectedIds.length === 1 && state.selectedIds[0] === id) return;
      state.selectedIds = [id];
    }
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectKey(id) {
    state.selectedIds = [];
    state.selectedMaskKeyId = null;
    state.selectedKeyId = id;
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectMaskKey(id) {
    state.selectedIds = [];
    state.selectedKeyId = null;
    state.selectedMaskKeyId = id;
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectAll() {
    state.selectedKeyId = null;
    state.selectedMaskKeyId = null;
    state.selectedIds = state.layers.map((l) => l.id);
    refreshInspector();
    renderTimeline();
    invalidate();
  }

  function snapshot() {
    return JSON.stringify({ layers: state.layers, camera: state.camera, media: state.media, mask: state.mask, selectedIds: state.selectedIds, selectedKeyId: state.selectedKeyId, selectedMaskKeyId: state.selectedMaskKeyId }, stripper);
  }
  function commit() {
    const snap = snapshot();
    if (snap === state.lastCommitted) return;
    if (state.lastCommitted != null) state.undo.push(state.lastCommitted);
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    state.lastCommitted = snap;
    updateUndoButtons();
  }
  function restore(snap) {
    const data = JSON.parse(snap);
    state.layers = data.layers;
    state.camera = Object.assign(defaultCamera(), data.camera || {});
    state.media = Object.assign(defaultMedia(), data.media || {});
    state.mask = Object.assign(defaultMask(), data.mask || {});
    state.selectedIds = (data.selectedIds || []).filter((id) => getLayer(id));
    state.selectedKeyId = getKey(data.selectedKeyId) ? data.selectedKeyId : null;
    state.selectedMaskKeyId = getMaskKey(data.selectedMaskKeyId) ? data.selectedMaskKeyId : null;
    state.lastCommitted = snap;
    syncCameraControls();
    syncMediaControls();
    syncMaskControls();
    refreshAll();
  }
  function undo() {
    if (!state.undo.length) return;
    state.redo.push(state.lastCommitted);
    restore(state.undo.pop());
    updateUndoButtons();
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(state.lastCommitted);
    restore(state.redo.pop());
    updateUndoButtons();
  }
  function updateUndoButtons() {
    $('#btnUndo').disabled = !state.undo.length;
    $('#btnRedo').disabled = !state.redo.length;
  }

  function refreshAll() {
    renderTimeline();
    refreshInspector();
    invalidate();
    if (layoutVisible()) layoutView.draw();
  }

  /* ------------------------------------------------------------------ timeline */
  const EYE_ON = '<svg viewBox="0 0 20 20"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="2.5" fill="currentColor"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 20 20"><path d="M3 3l14 14M2 10s3-5 8-5c1.2 0 2.3.3 3.3.7M18 10s-3 5-8 5c-1.2 0-2.3-.3-3.3-.7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  function renderRuler() {
    const W = els.ruler.clientWidth, T = duration();
    if (W <= 0) return;
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
    const step = steps.find((s) => (W / T) * s >= 64) || 300;
    let html = '';
    for (let t = 0; t <= T + 1e-6; t += step) {
      const x = (t / T) * W;
      html += `<div class="tl-tick" style="left:${x}px">${t < 60 ? round(t, 2) + 's' : fmtTime(t).slice(0, 5)}</div>`;
      const mid = t + step / 2;
      if (mid < T && (W / T) * step >= 110) html += `<div class="tl-tick minor" style="left:${(mid / T) * W}px"></div>`;
    }
    els.ruler.innerHTML = html;
  }

  function barStyle(l) {
    const T = duration();
    return `left:${(l.start / T) * 100}%; width:${Math.max(0.2, ((l.end - l.start) / T) * 100)}%`;
  }
  function animShade(l) {
    const dur = l.end - l.start;
    const n = (l._layout && l._layout.groups.length) || 1;
    const inW = clamp(((l.anim.in.duration + l.anim.in.stagger * (n - 1)) / dur) * 100, 0, 100);
    const outW = clamp(((l.anim.out.duration + l.anim.out.stagger * (n - 1)) / dur) * 100, 0, 100);
    return { inW: l.anim.in.type === 'none' ? 0 : inW, outW: l.anim.out.type === 'none' ? 0 : outW };
  }

  function renderCameraTrack() {
    const T = duration();
    const keys = Camera.sorted(state.camera.keys);
    let html = '';
    if (keys.length > 1) {
      const a = (keys[0].t / T) * 100, b = (keys[keys.length - 1].t / T) * 100;
      html += `<div class="tl-key-line" style="left:${a}%; width:${b - a}%"></div>`;
    }
    for (const k of keys) {
      html += `<div class="tl-key${k.id === state.selectedKeyId ? ' selected' : ''}" data-id="${k.id}" style="left:${(k.t / T) * 100}%" title="${fmtTime(k.t)} · dolly ${round(k.dolly)} · yaw ${round(k.yaw, 1)}°"></div>`;
    }
    els.camTrack.innerHTML = html;
  }

  function renderMaskTrack() {
    $('#tlMask').classList.toggle('hidden', !state.mask.enabled);
    if (!state.mask.enabled) return;
    const T = duration();
    const keys = Camera.sorted(state.mask.keys);
    let html = '';
    if (keys.length > 1) {
      const a = (keys[0].t / T) * 100, b = (keys[keys.length - 1].t / T) * 100;
      html += `<div class="tl-key-line" style="left:${a}%; width:${b - a}%"></div>`;
    }
    for (const k of keys) {
      html += `<div class="tl-key${k.id === state.selectedMaskKeyId ? ' selected' : ''}" data-id="${k.id}" style="left:${(k.t / T) * 100}%" title="${fmtTime(k.t)} · ${Math.round(k.w * 100)}×${Math.round(k.h * 100)}"></div>`;
    }
    $('#maskTrack').innerHTML = html;
  }

  function renderTimeline() {
    renderRuler();
    renderCameraTrack();
    renderMaskTrack();
    const rows = state.layers.slice().reverse();
    els.tlEmpty.classList.toggle('hidden', rows.length > 0);
    $('#layerCount').textContent = rows.length ? `(${rows.length})` : '';
    $$('.tl-row', els.tlBody).forEach((r) => r.remove());
    const primary = state.selectedIds[0];
    for (const l of rows) {
      const row = document.createElement('div');
      const sel = isSelected(l.id);
      row.className = `tl-row${sel ? ' selected' : ''}${sel && l.id !== primary ? ' secondary' : ''}${l.hidden ? ' hidden-layer' : ''}`;
      row.dataset.id = l.id;
      const { inW, outW } = animShade(l);
      row.innerHTML = `
        <div class="tl-name">
          <button class="tl-eye" title="Show / hide">${l.hidden ? EYE_OFF : EYE_ON}</button>
          <span class="nm">${escapeHtml(l.name || l.text || 'Text')}</span>
        </div>
        <div class="tl-track">
          <div class="tl-bar" style="${barStyle(l)}">
            <div class="anim-in" style="width:${inW}%"></div>
            <div class="anim-out" style="width:${outW}%"></div>
            <span>${escapeHtml((l.text || '').replace(/\n/g, ' '))}</span>
            <div class="h l"></div><div class="h r"></div>
          </div>
        </div>`;
      els.tlBody.appendChild(row);
    }
    updateTimeUI();
  }

  function updateBar(l) {
    const row = $(`.tl-row[data-id="${l.id}"]`, els.tlBody);
    if (!row) return;
    const bar = $('.tl-bar', row);
    bar.style.cssText = barStyle(l);
    const { inW, outW } = animShade(l);
    $('.anim-in', bar).style.width = `${inW}%`;
    $('.anim-out', bar).style.width = `${outW}%`;
  }

  // Timeline pointer interactions
  (function timelineInteractions() {
    let drag = null;
    const pxPerSec = () => els.ruler.clientWidth / duration();
    const timeFromEvent = (e) => {
      const rect = els.ruler.getBoundingClientRect();
      return clamp(((e.clientX - rect.left) / rect.width) * duration(), 0, duration());
    };
    const snapTargets = (excludeIds) => {
      const targets = [clock.time, 0, duration()];
      state.layers.forEach((o) => { if (!excludeIds.has(o.id)) targets.push(o.start, o.end); });
      return targets;
    };
    const snap = (v, targets) => {
      const tol = 6 / pxPerSec();
      let best = v, bd = tol;
      for (const s of targets) { const d = Math.abs(s - v); if (d < bd) { bd = d; best = s; } }
      return best;
    };

    els.ruler.addEventListener('pointerdown', (e) => {
      els.ruler.setPointerCapture(e.pointerId);
      drag = { mode: 'scrub' };
      clock.time = timeFromEvent(e);
      updateTimeUI();
    });
    els.ruler.addEventListener('pointermove', (e) => { if (drag && drag.mode === 'scrub') { clock.time = timeFromEvent(e); updateTimeUI(); } });
    els.ruler.addEventListener('pointerup', () => { drag = null; });

    // Camera track
    els.camTrack.addEventListener('pointerdown', (e) => {
      const key = e.target.closest('.tl-key');
      if (key) {
        selectKey(key.dataset.id);
        const k = getKey(key.dataset.id);
        drag = { mode: 'key', id: k.id, x0: e.clientX, t0: k.t, moved: false };
        els.camTrack.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else {
        clock.time = timeFromEvent(e);
        drag = { mode: 'scrub' };
        els.camTrack.setPointerCapture(e.pointerId);
      }
    });
    els.camTrack.addEventListener('dblclick', (e) => {
      if (e.target.closest('.tl-key')) return;
      const k = addCameraKey(round(timeFromEvent(e), 2));
      commit();
      selectKey(k.id);
      toast('Camera keyframe added — adjust it in the inspector or drag the camera in the 3D layout');
    });
    els.camTrack.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode !== 'key') return;
      const k = getKey(drag.id);
      if (!k) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      k.t = round(clamp(snap(drag.t0 + dt, snapTargets(new Set())), 0, duration()), 3);
      renderCameraTrack();
      refreshKeyValues();
      invalidate();
    });
    const endKeyDrag = () => {
      if (drag && drag.mode === 'key' && drag.moved) { state.camera.keys = Camera.sorted(state.camera.keys); commit(); }
      drag = null;
    };
    els.camTrack.addEventListener('pointerup', endKeyDrag);
    els.camTrack.addEventListener('pointercancel', endKeyDrag);

    // Mask track
    const maskTrack = $('#maskTrack');
    maskTrack.addEventListener('pointerdown', (e) => {
      const key = e.target.closest('.tl-key');
      if (key) {
        selectMaskKey(key.dataset.id);
        const k = getMaskKey(key.dataset.id);
        drag = { mode: 'maskKey', id: k.id, x0: e.clientX, t0: k.t, moved: false };
        maskTrack.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else {
        clock.time = timeFromEvent(e);
        drag = { mode: 'scrub' };
        maskTrack.setPointerCapture(e.pointerId);
      }
    });
    maskTrack.addEventListener('dblclick', (e) => {
      if (e.target.closest('.tl-key')) return;
      clock.time = round(timeFromEvent(e), 2);
      const k = maskKeyAtPlayhead();
      commit();
      selectMaskKey(k.id);
      renderMaskTrack();
      toast('Mask keyframe added — move the shape here and it will animate');
    });
    maskTrack.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode !== 'maskKey') return;
      const k = getMaskKey(drag.id);
      if (!k) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      k.t = round(clamp(snap(drag.t0 + dt, snapTargets(new Set())), 0, duration()), 3);
      renderMaskTrack();
      refreshMaskKeyValues();
      invalidate();
    });
    const endMaskDrag = () => {
      if (drag && drag.mode === 'maskKey' && drag.moved) { state.mask.keys = Camera.sorted(state.mask.keys); commit(); }
      drag = null;
    };
    maskTrack.addEventListener('pointerup', endMaskDrag);
    maskTrack.addEventListener('pointercancel', endMaskDrag);

    // Layer rows
    els.tlBody.addEventListener('click', (e) => {
      const eye = e.target.closest('.tl-eye');
      if (eye) {
        const l = getLayer(eye.closest('.tl-row').dataset.id);
        l.hidden = !l.hidden;
        commit();
        refreshAll();
        return;
      }
      const name = e.target.closest('.tl-name');
      if (name) select(name.closest('.tl-row').dataset.id, { toggle: e.shiftKey || e.ctrlKey || e.metaKey });
    });

    els.tlBody.addEventListener('pointerdown', (e) => {
      const bar = e.target.closest('.tl-bar');
      if (!bar) {
        if (e.target.closest('.tl-track')) {
          clock.time = timeFromEvent(e);
          select(null);
          drag = { mode: 'scrub' };
          els.tlBody.setPointerCapture(e.pointerId);
        }
        return;
      }
      const id = bar.closest('.tl-row').dataset.id;
      if (e.shiftKey || e.ctrlKey || e.metaKey) { select(id, { toggle: true }); return; }
      if (!isSelected(id)) select(id);
      const mode = e.target.classList.contains('h') ? (e.target.classList.contains('l') ? 'trimL' : 'trimR') : 'move';
      const ids = mode === 'move' ? state.selectedIds.slice() : [id];
      drag = {
        mode, id, ids, x0: e.clientX, moved: false,
        orig: Object.fromEntries(ids.map((i) => { const l = getLayer(i); return [i, { start: l.start, end: l.end }]; })),
      };
      els.tlBody.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    els.tlBody.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode === 'key') return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      const T = duration();
      const targets = snapTargets(new Set(drag.ids));
      if (drag.mode === 'move') {
        const o = drag.orig[drag.id];
        const len = o.end - o.start;
        let s = clamp(o.start + dt, 0, T - len);
        const snappedStart = snap(s, targets), snappedEnd = snap(s + len, targets);
        if (snappedStart !== s) s = snappedStart; else if (snappedEnd !== s + len) s = snappedEnd - len;
        let delta = s - o.start;
        for (const id of drag.ids) {
          const oo = drag.orig[id];
          delta = clamp(delta, -oo.start, T - oo.end);
        }
        for (const id of drag.ids) {
          const l = getLayer(id), oo = drag.orig[id];
          l.start = oo.start + delta; l.end = oo.end + delta;
          updateBar(l);
        }
      } else {
        const l = getLayer(drag.id), o = drag.orig[drag.id];
        if (drag.mode === 'trimL') l.start = clamp(snap(o.start + dt, targets), 0, l.end - 0.1);
        else l.end = clamp(snap(o.end + dt, targets), l.start + 0.1, T);
        updateBar(l);
      }
      refreshInspectorValues();
      invalidate();
    });

    const endDrag = () => {
      if (drag && (drag.mode === 'move' || drag.mode === 'trimL' || drag.mode === 'trimR') && drag.moved) { commit(); renderTimeline(); }
      drag = null;
    };
    els.tlBody.addEventListener('pointerup', endDrag);
    els.tlBody.addEventListener('pointercancel', endDrag);
  })();

  /* ------------------------------------------------------------------ inspector (schema driven) */
  function animOptions() {
    const groups = {};
    for (const [k, def] of Object.entries(Anim.Animations)) {
      (groups[def.group] = groups[def.group] || []).push({ value: k, label: def.label });
    }
    return groups;
  }
  const easingOptions = () => Object.entries(Anim.EASING_LABELS).map(([value, label]) => ({ value, label }));

  const LAYER_SCHEMA = [
    {
      title: 'Text',
      fields: [
        { type: 'textarea', path: 'text', label: 'Text', wide: true, perLayer: true },
        { type: 'select', path: 'style.font', label: 'Font', options: () => TextRender.FONTS.map((f) => ({ value: f.family, label: f.family + (f.local ? ' ·' : ''), style: `font-family:'${f.family}'` })), onChange: (l) => normaliseWeight(l) },
        { type: 'two', fields: [
          { type: 'select', path: 'style.weight', label: 'Weight', options: (l) => weightOptions(l), numeric: true },
          { type: 'toggle', path: 'style.italic', label: 'Italic' },
        ] },
        { type: 'range', path: 'style.size', label: 'Size', min: 0.02, max: 0.6, step: 0.005, scale: 100, unit: '%' },
        { type: 'color', path: 'style.color', label: 'Fill', allowNone: true },
        { type: 'segment', path: 'style.align', label: 'Align', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] },
        { type: 'range', path: 'style.letterSpacing', label: 'Tracking', min: -0.1, max: 0.5, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'style.lineHeight', label: 'Line height', min: 0.7, max: 2, step: 0.05, scale: 1, unit: '' },
      ],
    },
    {
      title: 'Position in 3D',
      fields: [
        { type: 'range', path: 'transform.z', label: 'Depth', min: -3, max: 10, step: 0.01, scale: 1, unit: '', delta: true, hint: 'Distance out from the video. Bigger = further from the video and closer to the viewer; the resting camera sits at about 2.4, so anything beyond that needs the camera pulled back' },
        { type: 'range', path: 'transform.x', label: 'Left / right', min: -3, max: 3, step: 0.01, scale: 1, unit: '', delta: true },
        { type: 'range', path: 'transform.y', label: 'Down / up', min: -1.5, max: 1.5, step: 0.01, scale: 1, unit: '', delta: true },
        { type: 'sub', label: 'Rotation' },
        { type: 'range', path: 'transform.rx', label: 'Tilt', min: -90, max: 90, step: 1, scale: 1, unit: '°', delta: true },
        { type: 'range', path: 'transform.ry', label: 'Turn', min: -90, max: 90, step: 1, scale: 1, unit: '°', delta: true },
        { type: 'range', path: 'transform.rz', label: 'Roll', min: -180, max: 180, step: 1, scale: 1, unit: '°', delta: true },
        { type: 'range', path: 'transform.scale', label: 'Scale', min: 0.1, max: 4, step: 0.01, scale: 100, unit: '%' },
        { type: 'buttons', buttons: [
          { label: 'Face the camera', action: (l) => { l.transform.rx = 0; l.transform.ry = 0; l.transform.rz = 0; } },
          { label: 'Centre on screen', action: (l) => { l.transform.x = 0; l.transform.y = 0; } },
        ] },
        { type: 'sub', label: 'Subject mask' },
        { type: 'toggle', path: 'behindSubject', label: 'Behind subject', hint: 'Erase this word wherever the subject mask covers it, so it reads as passing behind the person. Turn the mask on in step 1.' },
      ],
    },
    {
      title: 'Look',
      collapsed: true,
      fields: [
        { type: 'range', path: 'style.opacity', label: 'Opacity', min: 0, max: 1, step: 0.01, scale: 100, unit: '%' },
        { type: 'sub', label: 'Stroke' },
        { type: 'range', path: 'style.stroke.width', label: 'Width', min: 0, max: 0.12, step: 0.0025, scale: 100, unit: '' },
        { type: 'color', path: 'style.stroke.color', label: 'Colour' },
        { type: 'sub', label: 'Shadow' },
        { type: 'range', path: 'style.shadow.opacity', label: 'Opacity', min: 0, max: 1, step: 0.01, scale: 100, unit: '%' },
        { type: 'range', path: 'style.shadow.blur', label: 'Blur', min: 0, max: 0.6, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'style.shadow.x', label: 'Offset X', min: -0.25, max: 0.25, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'style.shadow.y', label: 'Offset Y', min: -0.25, max: 0.25, step: 0.005, scale: 100, unit: '' },
        { type: 'color', path: 'style.shadow.color', label: 'Colour' },
        { type: 'sub', label: '3D extrusion' },
        { type: 'range', path: 'style.extrude.depth', label: 'Depth', min: 0, max: 0.25, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'style.extrude.angle', label: 'Angle', min: 0, max: 360, step: 5, scale: 1, unit: '°' },
        { type: 'color', path: 'style.extrude.color', label: 'Colour' },
        { type: 'sub', label: 'Background box' },
        { type: 'toggle', path: 'style.box.enabled', label: 'Enabled' },
        { type: 'color', path: 'style.box.color', label: 'Colour' },
        { type: 'range', path: 'style.box.opacity', label: 'Opacity', min: 0, max: 1, step: 0.01, scale: 100, unit: '%' },
        { type: 'range', path: 'style.box.padding', label: 'Padding', min: 0, max: 1, step: 0.01, scale: 100, unit: '' },
        { type: 'range', path: 'style.box.radius', label: 'Radius', min: 0, max: 1.5, step: 0.01, scale: 100, unit: '' },
      ],
    },
    {
      title: 'Animation',
      collapsed: true,
      fields: [
        { type: 'segment', path: 'split', label: 'Animate by', options: [{ value: 'whole', label: 'Block' }, { value: 'word', label: 'Words' }, { value: 'char', label: 'Letters' }] },
        { type: 'sub', label: 'In' },
        { type: 'select', path: 'anim.in.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'in') },
        { type: 'range', path: 'anim.in.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.in.easing', label: 'Easing', options: easingOptions },
        { type: 'range', path: 'anim.in.stagger', label: 'Stagger', min: 0, max: 0.6, step: 0.01, scale: 1, unit: 's', hint: 'Delay between words/letters' },
        { type: 'sub', label: 'Out' },
        { type: 'select', path: 'anim.out.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'out') },
        { type: 'range', path: 'anim.out.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.out.easing', label: 'Easing', options: easingOptions },
        { type: 'range', path: 'anim.out.stagger', label: 'Stagger', min: 0, max: 0.6, step: 0.01, scale: 1, unit: 's' },
        { type: 'sub', label: 'While visible' },
        { type: 'select', path: 'anim.loop.type', label: 'Motion', options: () => Object.entries(Anim.Loops).map(([value, d]) => ({ value, label: d.label })) },
        { type: 'range', path: 'anim.loop.speed', label: 'Speed', min: 0.1, max: 4, step: 0.1, scale: 1, unit: '×' },
      ],
    },
    {
      title: 'Timing',
      collapsed: true,
      fields: [
        { type: 'two', fields: [
          { type: 'number', path: 'start', label: 'Start (s)', step: 0.05, min: 0, delta: true, onChange: (l) => { l.start = clamp(l.start, 0, l.end - 0.1); } },
          { type: 'number', path: 'end', label: 'End (s)', step: 0.05, min: 0, delta: true, onChange: (l) => { l.end = clamp(l.end, l.start + 0.1, duration()); } },
        ] },
        { type: 'buttons', buttons: [
          { label: 'Start at playhead', action: (l) => { const len = l.end - l.start; l.start = clamp(clock.time, 0, duration() - 0.1); l.end = clamp(l.start + len, l.start + 0.1, duration()); } },
          { label: 'End at playhead', action: (l) => { l.end = clamp(clock.time, l.start + 0.1, duration()); } },
        ] },
      ],
    },
  ];

  const KEY_SCHEMA = [
    {
      title: 'Keyframe',
      fields: [
        { type: 'number', path: 't', label: 'Time (s)', step: 0.05, min: 0, onChange: (k) => { k.t = clamp(k.t, 0, duration()); } },
        { type: 'select', path: 'easing', label: 'Ease in', options: () => Object.entries(Camera.EASING_LABELS).map(([value, label]) => ({ value, label })), hint: 'How the camera arrives at this key' },
      ],
    },
    {
      title: 'Camera position',
      fields: [
        { type: 'range', path: 'dolly', label: 'Dolly', min: -12, max: 3.5, step: 0.01, scale: 1, unit: '', hint: 'Positive = closer to the video (zooms it in); negative = further back, which is what makes room for deep text' },
        { type: 'range', path: 'x', label: 'Left / right', min: -2, max: 2, step: 0.01, scale: 1, unit: '' },
        { type: 'range', path: 'y', label: 'Down / up', min: -1.5, max: 1.5, step: 0.01, scale: 1, unit: '' },
        { type: 'range', path: 'yaw', label: 'Pan', min: -90, max: 90, step: 0.5, scale: 1, unit: '°' },
        { type: 'range', path: 'pitch', label: 'Tilt', min: -60, max: 60, step: 0.5, scale: 1, unit: '°' },
        { type: 'range', path: 'roll', label: 'Roll', min: -45, max: 45, step: 0.5, scale: 1, unit: '°' },
        { type: 'buttons', buttons: [
          { label: 'Fit video to frame', action: (k) => { k.dolly = fitDolly(); k.x = 0; k.y = 0; k.yaw = 0; k.pitch = 0; k.roll = 0; } },
          { label: 'Copy previous key', action: (k) => { const ks = Camera.sorted(state.camera.keys); const i = ks.indexOf(k); if (i > 0) for (const f of Camera.FIELDS) k[f] = ks[i - 1][f]; } },
        ] },
      ],
    },
  ];

  const MASK_KEY_SCHEMA = [
    {
      title: 'Mask keyframe',
      fields: [
        { type: 'number', path: 't', label: 'Time (s)', step: 0.05, min: 0, onChange: (k) => { k.t = clamp(k.t, 0, duration()); } },
        { type: 'select', path: 'easing', label: 'Ease in', options: () => Object.entries(Camera.EASING_LABELS).map(([value, label]) => ({ value, label })) },
        { type: 'range', path: 'x', label: 'Centre X', min: -1.2, max: 1.2, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'y', label: 'Centre Y', min: -1.2, max: 1.2, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'w', label: 'Width', min: 0.03, max: 1.3, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'h', label: 'Height', min: 0.03, max: 1.3, step: 0.005, scale: 100, unit: '' },
      ],
    },
  ];

  function weightOptions(l) {
    const f = TextRender.FONTS.find((x) => x.family === l.style.font);
    const ws = f ? f.weights : [400, 700];
    const names = { 100: 'Ultra Light', 200: 'Thin', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Heavy', 900: 'Black' };
    return ws.map((w) => ({ value: w, label: names[w] || String(w) }));
  }
  function normaliseWeight(l) {
    const f = TextRender.FONTS.find((x) => x.family === l.style.font);
    if (!f) return;
    if (!f.weights.includes(Number(l.style.weight))) {
      l.style.weight = f.weights.reduce((a, b) => (Math.abs(b - l.style.weight) < Math.abs(a - l.style.weight) ? b : a));
    }
    l.style.weight = Number(l.style.weight);
  }
  function onAnimTypeChange(l, which) {
    const def = Anim.Animations[l.anim[which].type];
    if (!def) return;
    if (def.defaultEasing) l.anim[which].easing = def.defaultEasing;
    if (def.forceSplit) l.split = def.forceSplit;
  }

  /* Layer context: edits apply to every selected layer. Absolute fields copy the value; fields marked
   * `delta` shift each layer by the same amount the primary moved; `perLayer` fields touch only the primary. */
  const layerCtx = {
    controls: [],
    get: () => selected(),
    apply(field, primary, value, isFinal) {
      const targets = selectedLayers();
      const oldPrimary = getPath(primary, field.path);
      for (const l of targets) {
        if (field.perLayer && l !== primary) continue;
        let v = value;
        if (field.delta && l !== primary && typeof value === 'number' && typeof oldPrimary === 'number') {
          v = (getPath(l, field.path) || 0) + (value - oldPrimary);
        }
        setPath(l, field.path, v);
        if (field.onChange) field.onChange(l);
        if (field.path === 'start' || field.path === 'end') {
          l.start = clamp(l.start, 0, Math.max(0, duration() - 0.1));
          l.end = clamp(l.end, l.start + 0.1, duration());
          updateBar(l);
        }
        l._layout = null;
        if (field.path === 'text') {
          const row = $(`.tl-row[data-id="${l.id}"] .tl-bar span`, els.tlBody);
          if (row) row.textContent = (l.text || '').replace(/\n/g, ' ');
        }
      }
      invalidate();
      if (layoutVisible()) layoutView.draw();
      if (isFinal) {
        commit();
        refreshInspectorValues();
        if (field.path === 'text' || field.path.startsWith('anim') || field.path === 'split') renderTimeline();
      }
    },
    buttonAction(action) {
      const targets = selectedLayers();
      if (!targets.length) return;
      for (const l of targets) { action(l); l._layout = null; }
      commit();
      refreshAll();
    },
  };

  const keyCtx = {
    controls: [],
    get: () => selectedKey(),
    apply(field, key, value, isFinal) {
      setPath(key, field.path, value);
      if (field.onChange) field.onChange(key);
      if (field.path === 't') { state.camera.keys = Camera.sorted(state.camera.keys); renderCameraTrack(); }
      invalidate();
      if (layoutVisible()) layoutView.draw();
      if (isFinal) { commit(); refreshKeyValues(); renderCameraTrack(); }
    },
    buttonAction(action) {
      const k = selectedKey();
      if (!k) return;
      action(k);
      commit();
      refreshKeyValues();
      renderCameraTrack();
      invalidate();
      if (layoutVisible()) layoutView.draw();
    },
  };

  const maskCtx = {
    controls: [],
    get: () => selectedMaskKey(),
    apply(field, key, value, isFinal) {
      setPath(key, field.path, value);
      if (field.onChange) field.onChange(key);
      if (field.path === 't') { state.mask.keys = Camera.sorted(state.mask.keys); }
      renderMaskTrack();
      syncMaskControls();
      invalidate();
      if (isFinal) { commit(); refreshMaskKeyValues(); }
    },
    buttonAction(action) {
      const k = selectedMaskKey();
      if (!k) return;
      action(k);
      commit();
      refreshMaskKeyValues();
      renderMaskTrack();
      invalidate();
    },
  };

  const CHEV = '<svg viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function buildSections(schema, container, ctx) {
    for (const sec of schema) {
      const section = document.createElement('div');
      section.className = `section${sec.collapsed ? ' collapsed' : ''}`;
      const head = document.createElement('button');
      head.className = 'section-head';
      head.type = 'button';
      head.innerHTML = `<span>${sec.title}</span>${CHEV}`;
      head.addEventListener('click', () => section.classList.toggle('collapsed'));
      const body = document.createElement('div');
      body.className = 'section-body';
      for (const f of sec.fields) body.appendChild(buildField(f, ctx));
      section.appendChild(head);
      section.appendChild(body);
      container.appendChild(section);
    }
  }

  function buildField(f, ctx) {
    const wrap = document.createElement('div');
    if (f.type === 'sub') {
      wrap.className = 'subhead';
      wrap.textContent = f.label;
      return wrap;
    }
    if (f.type === 'two') {
      wrap.className = 'two';
      for (const sub of f.fields) wrap.appendChild(buildField(sub, ctx));
      return wrap;
    }
    if (f.type === 'buttons') {
      wrap.className = 'two';
      for (const b of f.buttons) {
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.type = 'button';
        btn.textContent = b.label;
        btn.addEventListener('click', () => ctx.buttonAction(b.action));
        wrap.appendChild(btn);
      }
      return wrap;
    }

    wrap.className = `ctl${f.wide ? ' wide' : ''}`;
    if (!f.wide) {
      const label = document.createElement('label');
      label.textContent = f.label;
      if (f.hint) label.title = f.hint;
      wrap.appendChild(label);
    }
    let update;
    const target = () => ctx.get();

    if (f.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.rows = 3;
      ta.spellcheck = false;
      ta.placeholder = 'Type your text…';
      ta.addEventListener('input', () => { const l = target(); if (l) ctx.apply(f, l, ta.value, false); });
      ta.addEventListener('change', () => { const l = target(); if (l) ctx.apply(f, l, ta.value, true); });
      ta.id = 'textInput';
      wrap.appendChild(ta);
      update = (l) => { if (document.activeElement !== ta) ta.value = getPath(l, f.path) || ''; };
    } else if (f.type === 'select') {
      const sel = document.createElement('select');
      if (f.hint) sel.title = f.hint;
      const fill = (l) => {
        const cur = getPath(l, f.path);
        sel.innerHTML = '';
        const opts = typeof f.options === 'function' ? f.options(l) : f.options;
        if (f.grouped) {
          for (const [g, list] of Object.entries(opts)) {
            const og = document.createElement('optgroup');
            og.label = g;
            for (const o of list) og.appendChild(new Option(o.label, o.value));
            sel.appendChild(og);
          }
        } else {
          for (const o of opts) {
            const opt = new Option(o.label, o.value);
            if (o.style) opt.style.cssText = o.style;
            sel.appendChild(opt);
          }
        }
        sel.value = String(cur);
      };
      sel.addEventListener('change', () => {
        const l = target();
        if (!l) return;
        ctx.apply(f, l, f.numeric ? Number(sel.value) : sel.value, true);
      });
      wrap.appendChild(sel);
      update = fill;
    } else if (f.type === 'range') {
      const rw = document.createElement('div');
      rw.className = 'range-wrap';
      const r = document.createElement('input');
      r.type = 'range'; r.min = f.min; r.max = f.max; r.step = f.step;
      const n = document.createElement('input');
      n.type = 'number'; n.step = f.step * f.scale; n.min = f.min * f.scale; n.max = f.max * f.scale;
      n.title = f.unit ? `Unit: ${f.unit}` : '';
      r.addEventListener('input', () => { const l = target(); if (!l) return; n.value = round(r.value * f.scale, 2); ctx.apply(f, l, Number(r.value), false); });
      r.addEventListener('change', () => { const l = target(); if (l) ctx.apply(f, l, Number(r.value), true); });
      n.addEventListener('change', () => {
        const l = target(); if (!l) return;
        const v = clamp(Number(n.value) / f.scale, f.min, f.max);
        r.value = v; n.value = round(v * f.scale, 2);
        ctx.apply(f, l, v, true);
      });
      rw.appendChild(r); rw.appendChild(n);
      wrap.appendChild(rw);
      update = (l) => { const raw = getPath(l, f.path); const v = Number(raw == null ? (f.path === 'focus' ? renderer.camDist : 0) : raw) || 0; r.value = v; if (document.activeElement !== n) n.value = round(v * f.scale, 2); };
    } else if (f.type === 'number') {
      const n = document.createElement('input');
      n.type = 'number'; n.step = f.step; if (f.min != null) n.min = f.min;
      n.addEventListener('change', () => { const l = target(); if (l) ctx.apply(f, l, Number(n.value), true); });
      wrap.appendChild(n);
      update = (l) => { if (document.activeElement !== n) n.value = round(getPath(l, f.path), 2); };
    } else if (f.type === 'color') {
      const cw = document.createElement('div');
      cw.className = 'color-wrap';
      const c = document.createElement('input'); c.type = 'color';
      const hex = document.createElement('input'); hex.type = 'text'; hex.className = 'hex'; hex.spellcheck = false;
      cw.appendChild(c); cw.appendChild(hex);
      let none = null;
      if (f.allowNone) {
        const lbl = document.createElement('label');
        lbl.className = 'none';
        none = document.createElement('input'); none.type = 'checkbox';
        lbl.appendChild(none); lbl.appendChild(document.createTextNode('None'));
        cw.appendChild(lbl);
        none.addEventListener('change', () => { const l = target(); if (!l) return; ctx.apply(f, l, none.checked ? 'transparent' : c.value, true); });
      }
      c.addEventListener('input', () => { const l = target(); if (!l) return; hex.value = c.value; if (none) none.checked = false; ctx.apply(f, l, c.value, false); });
      c.addEventListener('change', () => { const l = target(); if (l) ctx.apply(f, l, c.value, true); });
      hex.addEventListener('change', () => {
        const l = target(); if (!l) return;
        const v = normaliseHex(hex.value);
        if (!v) { hex.value = c.value; return; }
        c.value = v; if (none) none.checked = false;
        ctx.apply(f, l, v, true);
      });
      wrap.appendChild(cw);
      update = (l) => {
        const v = getPath(l, f.path) || '#000000';
        const isNone = v === 'transparent';
        if (none) none.checked = isNone;
        if (!isNone) { c.value = v.length === 7 ? v : '#ffffff'; hex.value = c.value; } else { hex.value = 'none'; }
      };
    } else if (f.type === 'toggle') {
      const lbl = document.createElement('label');
      lbl.className = 'toggle';
      const cb = document.createElement('input'); cb.type = 'checkbox';
      lbl.appendChild(cb);
      const span = document.createElement('span'); span.className = 'muted'; span.textContent = f.label === 'Italic' ? 'Italic' : 'On';
      lbl.appendChild(span);
      cb.addEventListener('change', () => { const l = target(); if (l) ctx.apply(f, l, cb.checked, true); });
      wrap.appendChild(lbl);
      update = (l) => { cb.checked = !!getPath(l, f.path); };
    } else if (f.type === 'segment') {
      const seg = document.createElement('div');
      seg.className = 'segment';
      for (const o of f.options) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = o.label; b.dataset.value = o.value;
        b.addEventListener('click', () => { const l = target(); if (l) ctx.apply(f, l, o.value, true); });
        seg.appendChild(b);
      }
      wrap.appendChild(seg);
      update = (l) => { const v = getPath(l, f.path); $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.value === String(v))); };
    }
    ctx.controls.push({ update, field: f, el: wrap });
    return wrap;
  }

  function refreshInspector() {
    const l = selected();
    const k = selectedKey();
    const mk = selectedMaskKey();
    els.inspectorEmpty.classList.toggle('hidden', !!(l || k || mk));
    els.inspectorBody.classList.toggle('hidden', !l);
    els.cameraKeyBody.classList.toggle('hidden', !k);
    $('#maskKeyBody').classList.toggle('hidden', !mk);
    if (l) refreshInspectorValues();
    if (k) refreshKeyValues();
    if (mk) refreshMaskKeyValues();
    updateLayoutHint();
  }
  function refreshMaskKeyValues() {
    const k = selectedMaskKey();
    if (!k) return;
    for (const c of maskCtx.controls) c.update(k);
  }
  function refreshInspectorValues() {
    const l = selected();
    if (!l) return;
    const n = state.selectedIds.length;
    els.layerName.classList.toggle('hidden', n > 1);
    els.multiTitle.classList.toggle('hidden', n <= 1);
    if (n > 1) els.multiTitle.textContent = `${n} words selected`;
    if (document.activeElement !== els.layerName) els.layerName.value = l.name || '';
    for (const c of layerCtx.controls) {
      c.update(l);
      if (c.field.perLayer) c.el.style.opacity = n > 1 ? 0.55 : 1;
    }
  }
  function refreshKeyValues() {
    const k = selectedKey();
    if (!k) return;
    for (const c of keyCtx.controls) c.update(k);
  }
  function focusTextInput() {
    const ta = $('#textInput');
    if (ta) { ta.focus(); ta.select(); }
  }

  els.layerName.addEventListener('input', () => { const l = selected(); if (l) { l.name = els.layerName.value; const nm = $(`.tl-row[data-id="${l.id}"] .nm`, els.tlBody); if (nm) nm.textContent = l.name || l.text; } });
  els.layerName.addEventListener('change', () => commit());
  $('#btnDelete').addEventListener('click', deleteSelected);
  $('#btnDeleteKey').addEventListener('click', deleteSelected);
  $('#btnDuplicate').addEventListener('click', duplicateSelected);
  $('#btnLayerUp').addEventListener('click', () => { if (selected()) moveLayer(selected().id, +1); });
  $('#btnLayerDown').addEventListener('click', () => { if (selected()) moveLayer(selected().id, -1); });

  /* ------------------------------------------------------------------ preview canvas interaction */
  (function canvasInteractions() {
    const c = els.canvas;
    let drag = null;
    const toBuffer = (e) => {
      const rect = c.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
    };

    /* World units per screen pixel on the video plane, for dragging the mask. */
    const planePixels = () => {
      const cam = cameraAt(clock.time);
      const depth = state.media.locked ? renderer.camDist : planeDepth(cam);
      return renderer.worldPerPixelAtDepth(depth);
    };

    c.addEventListener('pointerdown', (e) => {
      if (state.exporting) return;
      const p = toBuffer(e);
      if (state.maskEdit && state.mask.enabled) {
        const k = maskKeyAtPlayhead();
        if (state.selectedMaskKeyId !== k.id) selectMaskKey(k.id);
        drag = { mode: 'mask', key: k, x0: p.x, y0: p.y, kx: k.x, ky: k.y, wpp: planePixels(), moved: false };
        c.setPointerCapture(e.pointerId);
        c.classList.add('grabbing');
        return;
      }
      const id = renderer.hitTest(p.x, p.y);
      if (id) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) { select(id, { toggle: true }); return; }
        if (!isSelected(id)) select(id);
        const cam = cameraAt(clock.time);
        drag = {
          mode: e.altKey ? 'rotate' : 'move', x0: p.x, y0: p.y, moved: false,
          items: selectedLayers().map((l) => ({ l, t0: JSON.parse(JSON.stringify(l.transform)), wpp: renderer.worldPerPixel(l, cam) })),
        };
        c.setPointerCapture(e.pointerId);
        c.classList.add('grabbing');
      } else {
        select(null);
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (state.exporting) return;
      const p = toBuffer(e);
      if (!drag) {
        c.classList.toggle('hover', !state.maskEdit && !!renderer.hitTest(p.x, p.y));
        return;
      }
      if (drag.mode === 'mask') {
        drag.moved = true;
        const dxu = ((p.x - drag.x0) * drag.wpp) / (renderer.aspect * state.media.scale);
        const dyu = -((p.y - drag.y0) * drag.wpp) / state.media.scale;
        drag.key.x = round(clamp(drag.kx + dxu, -1.2, 1.2), 4);
        drag.key.y = round(clamp(drag.ky + dyu, -1.2, 1.2), 4);
        syncMaskControls();
        refreshMaskKeyValues();
        invalidate();
        return;
      }
      const dx = p.x - drag.x0, dy = p.y - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      for (const it of drag.items) {
        if (drag.mode === 'move') {
          it.l.transform.x = round(it.t0.x + dx * it.wpp, 3);
          it.l.transform.y = round(it.t0.y - dy * it.wpp, 3);
        } else {
          it.l.transform.ry = clamp(round(it.t0.ry + dx * 0.25, 1), -90, 90);
          it.l.transform.rx = clamp(round(it.t0.rx - dy * 0.25, 1), -90, 90);
        }
      }
      refreshInspectorValues();
      invalidate();
      if (layoutVisible()) layoutView.draw();
    });
    const end = () => {
      if (drag && drag.moved) commit();
      drag = null;
      c.classList.remove('grabbing');
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('dblclick', (e) => {
      const p = toBuffer(e);
      const id = renderer.hitTest(p.x, p.y);
      if (id) { select(id); focusTextInput(); }
    });

    let wheelTimer = 0;
    c.addEventListener('wheel', (e) => {
      if (state.maskEdit && state.mask.enabled && !state.exporting) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        const k = maskKeyAtPlayhead();
        if (!e.shiftKey) k.w = round(clamp(k.w * factor, 0.03, 1.3), 4);
        k.h = round(clamp(k.h * factor, 0.03, 1.3), 4);
        syncMaskControls();
        refreshMaskKeyValues();
        invalidate();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(commit, 400);
        return;
      }
      const targets = selectedLayers();
      if (!targets.length || state.exporting) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      for (const l of targets) {
        l.style.size = clamp(round(l.style.size * factor, 4), 0.02, 0.6);
        l._layout = null;
      }
      refreshInspectorValues();
      invalidate();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(commit, 400);
    }, { passive: false });
  })();

  /* ------------------------------------------------------------------ 3D layout view */
  function layoutVisible() { return state.view !== 'preview'; }
  function layerFootprint(l) {
    const lay = l._layout;
    const w = lay ? lay.blockW : (l.text || 'text').length * l.style.size * 1.1;
    const h = lay ? lay.blockH : l.style.size * 2.2;
    return { w: w * (l.transform.scale || 1), h: h * (l.transform.scale || 1) };
  }
  function cameraPath() {
    const keys = Camera.sorted(state.camera.keys);
    if (keys.length < 2) return [];
    const t0 = keys[0].t, t1 = keys[keys.length - 1].t;
    const pts = [];
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const c = cameraAt(t0 + ((t1 - t0) * i) / n);
      pts.push({ x: c.x, y: c.y, z: c.z });
    }
    return pts;
  }
  let dragStartPositions = null;
  const layoutView = new LayoutView(els.layoutCanvas, {
    scene() {
      const t = clock.time;
      const cam = cameraAt(t);
      const d = renderer.camDist;
      return {
        time: t, cam, camDist: d, fov: state.fov, aspect: frameAspect(), hasVideo: state.video.ready,
        video: { scale: state.media.scale, x: state.media.x, y: state.media.y, locked: state.media.locked },
        layers: state.layers.map((l) => Object.assign({
          id: l.id, text: l.text, x: l.transform.x, y: l.transform.y, z: l.transform.z,
          active: t >= l.start && t < l.end, hidden: l.hidden, selected: isSelected(l.id), primary: state.selectedIds[0] === l.id,
        }, layerFootprint(l))),
        keys: state.camera.keys.map((k) => ({ id: k.id, t: k.t, x: k.x, y: k.y, z: d - k.dolly, selected: k.id === state.selectedKeyId })),
        path: cameraPath(),
      };
    },
    onSelectLayer(id, additive) { select(id, { toggle: additive }); },
    onSelectKey(id) { selectKey(id); },
    onDeselect() { select(null); },
    onLayerDragStart(ids) {
      dragStartPositions = Object.fromEntries(ids.map((id) => { const l = getLayer(id); return [id, { x: l.transform.x, y: l.transform.y, z: l.transform.z }]; }));
    },
    onLayerDragMove(ids, delta) {
      for (const id of ids) {
        const l = getLayer(id), o = dragStartPositions && dragStartPositions[id];
        if (!l || !o) continue;
        l.transform.x = round(clamp(o.x + delta.dx, -4, 4), 3);
        l.transform.y = round(clamp(o.y + delta.dy, -2.5, 2.5), 3);
        l.transform.z = round(clamp(o.z + delta.dz, -3, 10), 3);
      }
      refreshInspectorValues();
      invalidate();
      updateLayoutHint();
    },
    onLayerDragEnd(moved) { dragStartPositions = null; if (moved) commit(); },
    onCameraDragMove(p) {
      clock.pause();
      const key = keyAtPlayhead();
      if (state.selectedKeyId !== key.id) selectKey(key.id);
      key.x = round(clamp(p.x, -3, 3), 3);
      key.y = round(clamp(p.y, -2, 2), 3);
      key.dolly = round(renderer.camDist - clamp(p.z, -2, 14), 3);
      refreshKeyValues();
      renderCameraTrack();
      invalidate();
      updateLayoutHint();
    },
    onCameraDragEnd() { commit(); },
    onKeyDragMove(id, p) {
      const k = getKey(id);
      if (!k) return;
      k.x = round(clamp(p.x, -3, 3), 3);
      k.y = round(clamp(p.y, -2, 2), 3);
      k.dolly = round(renderer.camDist - clamp(p.z, -2, 14), 3);
      refreshKeyValues();
      invalidate();
    },
    onKeyDragEnd(moved) { if (moved) commit(); },
    onDoubleClickLayer(id) { select(id); focusTextInput(); },
  });

  function updateLayoutHint() {
    const l = selected();
    const k = selectedKey();
    if (l) els.layoutHint.textContent = `${(l.text || '').split('\n')[0]} · depth ${l.transform.z.toFixed(2)} · x ${l.transform.x.toFixed(2)} · y ${l.transform.y.toFixed(2)}`;
    else if (k) els.layoutHint.textContent = `Camera key at ${k.t.toFixed(2)}s · ${(renderer.camDist - k.dolly).toFixed(2)} from video`;
    else els.layoutHint.textContent = layoutView.mode === 'top' ? 'Top view — drag words left/right and nearer/further. Drag the camera to keyframe it at the playhead.' : 'Side view — drag words up/down and nearer/further.';
  }

  function setView(view) {
    state.view = view;
    $$('#viewSwitch button').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
    els.views.classList.toggle('split', view === 'split');
    els.wrap.classList.toggle('hidden', view === 'layout');
    els.layoutWrap.classList.toggle('hidden', view === 'preview');
    els.layoutTools.classList.toggle('hidden', view === 'preview');
    requestAnimationFrame(() => {
      fitPreview();
      if (layoutVisible()) { layoutView.resize(); layoutView.fitted = false; layoutView.draw(); updateLayoutHint(); }
    });
  }
  $('#viewSwitch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });
  $('#layoutMode').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#layoutMode button').forEach((x) => x.classList.toggle('on', x === b));
    layoutView.setMode(b.dataset.mode);
    updateLayoutHint();
  });
  $('#btnLayoutFit').addEventListener('click', () => { layoutView.fit(); layoutView.draw(); });
  $('#btnOpenLayout').addEventListener('click', () => setView(state.view === 'preview' ? 'split' : state.view));

  /* ------------------------------------------------------------------ templates, styles, moves */
  const TEMPLATE_PREVIEWS = {
    reveal: '<span>and</span><span>done</span><span>right?</span>',
    spiral: '<span>this</span><span>one</span><span>spirals</span><span>out</span>',
    tunnel: '<span>straight</span><span>through</span><span>it</span><span>all</span>',
    corridor: '<span>walk</span><span>past</span><span>every</span><span>word</span>',
    orbit: '<span>look</span><span>around</span><span>the</span><span>idea</span>',
    steps: '<span>one</span><span>step</span><span>at</span><span>a time</span>',
    punch: '<span>punchy</span><span>lines</span>',
    kinetic: "<span>here's</span><span>how you</span><span>can do</span><span>this</span>",
    stack: '<span>MAKE</span><span>IT</span><span>BOLD</span>',
    flyTitle: '<span>NEW SEASON</span><span>Available now</span>',
    caption: '<span>Recorded on location</span>',
    flipWords: '<span>Faster</span><span>Smarter</span>',
    floor: '<span>A long time ago in a studio far away</span>',
    wall: '<span>Designed for people who move</span>',
    lowerThird: '<span>Alex Rivera</span><span>CREATIVE DIRECTOR</span>',
    scatter: '<span><b>A</b><b>S</b><b>S</b><b>E</b><b>M</b><b>B</b><b>L</b><b>E</b></span>',
    neon: '<span>OPEN LATE</span>',
    bouncy: '<span><b>WOW</b> <b>THAT</b> <b>WAS</b></span>',
    quote: '<span>Simplicity is the ultimate sophistication</span><span>— LEONARDO</span>',
  };

  function buildTemplateGrid() {
    const grid = $('#templateGrid');
    grid.innerHTML = '';
    for (const t of Presets.TEMPLATES) {
      const card = document.createElement('button');
      card.className = 'template-card';
      card.type = 'button';
      card.innerHTML = `
        <div class="tp-preview ${t.previewClass}">${TEMPLATE_PREVIEWS[t.id] || `<span>${escapeHtml(t.sample)}</span>`}</div>
        <div class="tp-meta"><strong>${t.name}</strong><small>${t.description}</small>
          <div class="tp-tags">${t.tags.map((x) => `<em>${x}</em>`).join('')}</div></div>`;
      card.addEventListener('click', () => openTemplateDialog(t));
      grid.appendChild(card);
    }
  }

  function buildStyleGrid() {
    const grid = $('#styleGrid');
    grid.innerHTML = '';
    for (const s of Presets.STYLES) {
      const card = document.createElement('button');
      card.className = 'style-card';
      card.type = 'button';
      const prev = document.createElement('div');
      prev.className = 'sc-preview';
      const span = document.createElement('span');
      span.textContent = 'Aa Text';
      Object.assign(span.style, s.css);
      prev.appendChild(span);
      card.appendChild(prev);
      const nm = document.createElement('div');
      nm.className = 'sc-name';
      nm.textContent = s.name;
      card.appendChild(nm);
      card.addEventListener('click', () => applyStylePreset(s));
      grid.appendChild(card);
    }
  }

  function applyStylePreset(preset) {
    let targets = selectedLayers();
    if (!targets.length) {
      const l = addBlankText();
      l.text = preset.name; l.name = preset.name;
      targets = [l];
      toast(`Created a new word with the ${preset.name} style`);
    } else {
      toast(`Applied ${preset.name}${targets.length > 1 ? ` to ${targets.length} words` : ''}`);
    }
    for (const l of targets) {
      const size = l.style.size;
      l.style = Presets.deepMerge(l.style, preset.style);
      l.style.size = size;
      normaliseWeight(l);
      l._layout = null;
    }
    commit();
    refreshAll();
  }

  function buildMoveGrid() {
    const grid = $('#moveGrid');
    grid.innerHTML = '';
    for (const m of Camera.MOVES) {
      const card = document.createElement('button');
      card.className = 'move-card';
      card.type = 'button';
      card.innerHTML = `<strong>${m.name}</strong><small>${m.description}</small>`;
      card.addEventListener('click', () => applyCameraMove(m));
      grid.appendChild(card);
    }
  }

  // Left-panel collapsible sections (Templates, Styles)
  $$('.panel.left .section-head').forEach((h) => h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed')));

  /* ------------------------------------------------------------------ camera & media controls */
  function syncCameraControls() {
    $('#camAperture').value = state.camera.aperture;
    $('#camApertureNum').value = Math.round(state.camera.aperture * 100);
    const sn = state.camera.sharpNear == null ? 0.9 : state.camera.sharpNear;
    const sf = state.camera.sharpFar == null ? 3.6 : state.camera.sharpFar;
    $('#camSharpNear').value = sn; $('#camSharpNearNum').value = round(sn, 2);
    $('#camSharpFar').value = sf; $('#camSharpFarNum').value = round(sf, 2);
    const far = state.camera.farFade == null ? FADE_OFF : state.camera.farFade;
    $('#camFarFade').value = far;
    $('#camFarFadeNum').value = far >= FADE_OFF ? 'off' : round(far, 1);
    $('#fovSelect').value = String(state.fov);
  }
  $('#camAperture').addEventListener('input', (e) => { state.camera.aperture = Number(e.target.value); $('#camApertureNum').value = Math.round(state.camera.aperture * 100); invalidate(); });
  $('#camAperture').addEventListener('change', commit);
  $('#camApertureNum').addEventListener('change', (e) => { state.camera.aperture = clamp(Number(e.target.value) / 100, 0, 1); syncCameraControls(); commit(); invalidate(); });
  const bindSharp = (rangeId, numId, key) => {
    $(rangeId).addEventListener('input', (e) => {
      state.camera[key] = Number(e.target.value);
      if (state.camera.sharpFar < state.camera.sharpNear + 0.2) {
        if (key === 'sharpNear') state.camera.sharpFar = round(state.camera.sharpNear + 0.2, 2);
        else state.camera.sharpNear = round(Math.max(0.2, state.camera.sharpFar - 0.2), 2);
      }
      syncCameraControls();
      invalidate();
      if (layoutVisible()) layoutView.draw();
    });
    $(rangeId).addEventListener('change', commit);
    $(numId).addEventListener('change', (e) => {
      const min = Number($(rangeId).min), max = Number($(rangeId).max);
      state.camera[key] = clamp(Number(e.target.value) || min, min, max);
      syncCameraControls(); commit(); invalidate();
    });
  };
  bindSharp('#camSharpNear', '#camSharpNearNum', 'sharpNear');
  bindSharp('#camSharpFar', '#camSharpFarNum', 'sharpFar');
  $('#camFarFade').addEventListener('input', (e) => { state.camera.farFade = Number(e.target.value); $('#camFarFadeNum').value = state.camera.farFade >= FADE_OFF ? 'off' : round(state.camera.farFade, 1); invalidate(); if (layoutVisible()) layoutView.draw(); });
  $('#camFarFade').addEventListener('change', commit);
  $('#camFarFadeNum').addEventListener('change', (e) => { const v = Number(e.target.value); state.camera.farFade = isFinite(v) && v > 0 ? clamp(v, 1, FADE_OFF) : FADE_OFF; syncCameraControls(); commit(); invalidate(); });
  $('#fovSelect').addEventListener('change', (e) => { state.fov = Number(e.target.value); invalidate(); if (layoutVisible()) layoutView.draw(); });
  $('#btnClearCamera').addEventListener('click', () => {
    if (!state.camera.keys.length) return;
    state.camera.keys = [];
    state.selectedKeyId = null;
    commit();
    refreshAll();
    toast('Camera keyframes removed');
  });
  const addKeyHere = () => { const k = keyAtPlayhead(); commit(); selectKey(k.id); toast(`Camera keyframe at ${fmtTime(k.t)}`); };
  $('#btnAddKey').addEventListener('click', addKeyHere);
  $('#btnAddKey2').addEventListener('click', addKeyHere);
  $('#btnFitVideo').addEventListener('click', () => {
    const k = keyAtPlayhead();
    k.dolly = fitDolly(); k.x = 0; k.y = 0; k.yaw = 0; k.pitch = 0; k.roll = 0;
    commit();
    selectKey(k.id);
    toast(`Camera set so the video fills the frame at ${fmtTime(k.t)}`);
  });

  function syncMaskControls() {
    const on = state.mask.enabled;
    $('#maskEnabled').checked = on;
    $('#maskFields').classList.toggle('hidden', !on);
    $('#maskShow').checked = !!state.mask.show;
    $('#maskRound').value = state.mask.roundness;
    $('#maskRoundNum').value = Math.round(state.mask.roundness * 100);
    $('#maskFeather').value = state.mask.feather;
    $('#maskFeatherNum').value = Math.round(state.mask.feather * 100);
    const shape = maskShapeAt(clock.time) || MASK_DEFAULT;
    for (const [f, id] of [['x', 'maskX'], ['y', 'maskY'], ['w', 'maskW'], ['h', 'maskH']]) {
      $(`#${id}`).value = shape[f];
      const num = $(`#${id}Num`);
      if (document.activeElement !== num) num.value = Math.round(shape[f] * 100);
    }
    $('#btnMaskAdjust').classList.toggle('on', !!state.maskEdit);
    els.canvas.classList.toggle('mask-edit', !!state.maskEdit);
    renderMaskTrack();
  }
  /* Shape sliders always write to the key at the playhead, so adjusting at a new time animates the mask
   * the same way dragging the camera does. */
  const bindMaskShape = (id, field) => {
    const range = $(`#${id}`), num = $(`#${id}Num`);
    const write = (v, final) => {
      const k = maskKeyAtPlayhead();
      k[field] = round(v, 4);
      if (state.selectedMaskKeyId && state.selectedMaskKeyId !== k.id) state.selectedMaskKeyId = k.id;
      syncMaskControls();
      refreshMaskKeyValues();
      invalidate();
      if (final) commit();
    };
    range.addEventListener('input', (e) => write(Number(e.target.value), false));
    range.addEventListener('change', (e) => write(Number(e.target.value), true));
    num.addEventListener('change', (e) => {
      const min = Number(range.min), max = Number(range.max);
      write(clamp((Number(e.target.value) || 0) / 100, min, max), true);
    });
  };
  bindMaskShape('maskX', 'x');
  bindMaskShape('maskY', 'y');
  bindMaskShape('maskW', 'w');
  bindMaskShape('maskH', 'h');
  const bindMaskGlobal = (id, key, scale) => {
    const range = $(`#${id}`), num = $(`#${id}Num`);
    range.addEventListener('input', (e) => { state.mask[key] = Number(e.target.value); num.value = Math.round(state.mask[key] * scale); invalidate(); });
    range.addEventListener('change', commit);
    num.addEventListener('change', (e) => { state.mask[key] = clamp((Number(e.target.value) || 0) / scale, Number(range.min), Number(range.max)); syncMaskControls(); commit(); invalidate(); });
  };
  bindMaskGlobal('maskRound', 'roundness', 100);
  bindMaskGlobal('maskFeather', 'feather', 100);
  $('#maskEnabled').addEventListener('change', (e) => {
    state.mask.enabled = e.target.checked;
    if (state.mask.enabled && !state.mask.keys.length) {
      state.mask.keys = [Camera.defaultKey(round(clock.time, 2), Object.assign({}, MASK_DEFAULT))];
      toast('Subject mask on — place it over the person, then mark words “Behind subject”');
    }
    if (!state.mask.enabled) state.maskEdit = false;
    syncMaskControls();
    commit();
    refreshAll();
  });
  $('#maskShow').addEventListener('change', (e) => { state.mask.show = e.target.checked; commit(); invalidate(); });
  $('#btnMaskAdjust').addEventListener('click', () => {
    if (!state.mask.enabled) { toast('Turn the subject mask on first', true); return; }
    state.maskEdit = !state.maskEdit;
    syncMaskControls();
    toast(state.maskEdit ? 'Drag on the preview to move the mask, wheel to resize' : 'Back to editing text');
  });
  const addMaskKey = () => {
    if (!state.mask.enabled) { toast('Turn the subject mask on first', true); return; }
    const k = maskKeyAtPlayhead();
    commit();
    selectMaskKey(k.id);
    renderMaskTrack();
    toast(`Mask keyframe at ${fmtTime(k.t)}`);
  };
  $('#btnMaskKey').addEventListener('click', addMaskKey);
  $('#btnMaskKey2').addEventListener('click', addMaskKey);
  $('#btnDeleteMaskKey').addEventListener('click', deleteSelected);

  function syncMediaControls() {
    $('#bgColor').value = state.media.bg;
    $('#bgHex').value = state.media.bg;
    $('#mediaScale').value = state.media.scale;
    $('#mediaScaleNum').value = Math.round(state.media.scale * 100);
    $('#mediaX').value = state.media.x; $('#mediaXNum').value = Math.round(state.media.x * 100);
    $('#mediaY').value = state.media.y; $('#mediaYNum').value = Math.round(state.media.y * 100);
    $('#mediaIn3D').checked = !state.media.locked;
    $('#aspectSelect').value = aspectToLabel(state.aspect);
    $('#durationInput').value = state.duration;
    updateMediaUI();
  }
  function updateMediaUI() {
    const has = state.video.ready;
    $('#mediaEmpty').classList.toggle('hidden', has);
    $('#mediaInfo').classList.toggle('hidden', !has);
    $('#noVideoFields').classList.toggle('hidden', has);
    els.dropHint.classList.toggle('hidden', has);
    if (has) {
      $('#mediaName').textContent = state.video.file ? state.video.file.name : 'Video';
      $('#mediaMeta').textContent = `${state.video.width}×${state.video.height} · ${fmtTime(state.video.duration)}`;
    }
  }
  const bindMediaRange = (rangeId, numId, key, scale) => {
    $(rangeId).addEventListener('input', (e) => { state.media[key] = Number(e.target.value); $(numId).value = Math.round(state.media[key] * scale); invalidate(); if (layoutVisible()) layoutView.draw(); });
    $(rangeId).addEventListener('change', commit);
    $(numId).addEventListener('change', (e) => { const min = Number($(rangeId).min), max = Number($(rangeId).max); state.media[key] = clamp(Number(e.target.value) / scale, min, max); syncMediaControls(); commit(); invalidate(); });
  };
  bindMediaRange('#mediaScale', '#mediaScaleNum', 'scale', 100);
  bindMediaRange('#mediaX', '#mediaXNum', 'x', 100);
  bindMediaRange('#mediaY', '#mediaYNum', 'y', 100);
  $('#mediaIn3D').addEventListener('change', (e) => { state.media.locked = !e.target.checked; commit(); invalidate(); });
  $('#bgColor').addEventListener('input', (e) => { state.media.bg = e.target.value; $('#bgHex').value = e.target.value; invalidate(); });
  $('#bgColor').addEventListener('change', commit);
  $('#bgHex').addEventListener('change', (e) => { const v = normaliseHex(e.target.value); if (v) { state.media.bg = v; syncMediaControls(); commit(); invalidate(); } else e.target.value = state.media.bg; });

  // Template dialog
  const tplDialog = $('#templateDialog');
  let activeTemplate = null;
  function openTemplateDialog(t) {
    activeTemplate = t;
    $('#tplName').textContent = t.name;
    $('#tplDesc').textContent = t.description;
    $('#tplText').value = t.sample;
    let start = round(clock.time, 2);
    let remaining = duration() - start;
    if (remaining < 1) { start = 0; remaining = duration(); }
    $('#tplStart').value = start;
    $('#tplDuration').value = round(Math.min(t.id === 'kinetic' ? 8 : 6, remaining), 2);
    $('#tplReplace').checked = true;
    tplDialog.showModal();
    setTimeout(() => { $('#tplText').focus(); $('#tplText').select(); }, 30);
  }
  $('#templateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeTemplate) return;
    const text = $('#tplText').value;
    let start = clamp(Number($('#tplStart').value) || 0, 0, Math.max(0, duration() - 0.5));
    let dur = Math.max(0.5, Number($('#tplDuration').value) || 3);
    if (!state.video.ready && start + dur > state.duration) {
      state.duration = round(start + dur, 2);
      $('#durationInput').value = state.duration;
    }
    dur = Math.min(dur, duration() - start);
    const built = activeTemplate.build(text, start, dur, frameAspect(), { camDist: renderer.camDist, hasVideo: state.video.ready });
    const layers = Array.isArray(built) ? built : built.layers;
    const cameraKeys = Array.isArray(built) ? [] : (built.cameraKeys || []);
    if (!layers.length) { toast('Please enter some text first', true); return; }
    if ($('#tplReplace').checked) { state.layers = []; state.camera.keys = []; }
    const ids = [];
    for (const l of layers) ids.push(addLayer(l, { select: false }).id);
    if (cameraKeys.length) state.camera.keys = Camera.replaceRange(state.camera.keys, start, start + dur, cameraKeys);
    const replaced = $('#tplReplace').checked;
    if (!Array.isArray(built)) {
      if (built.cameraSettings) Object.assign(state.camera, built.cameraSettings);
      if (built.mediaSettings) Object.assign(state.media, built.mediaSettings);
      // A flat template composes for the resting camera, so starting fresh returns the footage to 100 %.
      else if (replaced) Object.assign(state.media, { scale: 1, x: 0, y: 0 });
    } else if (replaced) {
      Object.assign(state.media, { scale: 1, x: 0, y: 0 });
    }
    syncCameraControls();
    syncMediaControls();
    state.selectedIds = [];
    state.selectedKeyId = null;
    commit();
    refreshAll();
    if (layoutVisible()) { layoutView.fitted = false; layoutView.draw(); }
    tplDialog.close();
    clock.time = start;
    clock.play();
    toast(`Inserted ${layers.length} word${layers.length > 1 ? 's' : ''}${cameraKeys.length ? ' with a camera move' : ''} from ${activeTemplate.name}`);
  });
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ------------------------------------------------------------------ video import */
  function loadVideoFile(file) {
    if (!file) return;
    if (state.video.url) URL.revokeObjectURL(state.video.url);
    const url = URL.createObjectURL(file);
    state.video = { file, url, width: 0, height: 0, duration: 0, ready: false };
    clock.pause();
    const v = els.video;
    v.muted = state.muted;
    v.loop = state.loop;
    v.src = url;
    v.load();
    toast(`Loading ${file.name}…`);
  }
  function removeVideo() {
    if (!state.video.ready && !state.video.url) return;
    if (state.video.url) URL.revokeObjectURL(state.video.url);
    els.video.removeAttribute('src');
    els.video.load();
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false };
    clock._t = Math.min(clock._t, state.duration);
    syncMediaControls();
    fitPreview();
    refreshAll();
    toast('Video removed — working on the plain background');
  }

  els.video.addEventListener('loadedmetadata', () => {
    const v = els.video;
    if (!v.videoWidth || !v.videoHeight) return;
    state.video.width = v.videoWidth;
    state.video.height = v.videoHeight;
    state.video.duration = v.duration && isFinite(v.duration) ? v.duration : 10;
    state.video.ready = true;
    for (const l of state.layers) {
      l.end = Math.min(l.end, state.video.duration);
      l.start = Math.min(l.start, Math.max(0, l.end - 0.1));
      l._layout = null;
    }
    clampCameraKeys(state.video.duration);
    $('#expAudioWrap').classList.remove('hidden');
    v.currentTime = 0;
    syncMediaControls();
    fitPreview();
    renderTimeline();
    refreshInspectorValues();
    commit();
    if (layoutVisible()) { layoutView.fitted = false; layoutView.draw(); }
    toast(`${state.video.file.name} · ${v.videoWidth}×${v.videoHeight} · ${fmtTime(v.duration)}`);
  });
  els.video.addEventListener('loadeddata', invalidate);
  els.video.addEventListener('seeked', invalidate);
  els.video.addEventListener('play', updatePlayButton);
  els.video.addEventListener('pause', updatePlayButton);
  els.video.addEventListener('ended', updatePlayButton);
  els.video.addEventListener('error', () => {
    if (!state.video.url) return;
    const err = els.video.error;
    toast(`This browser cannot decode that video${err && err.code === 4 ? ' (unsupported codec — try MP4/H.264)' : ''}.`, true);
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false };
    syncMediaControls();
    fitPreview();
  });

  const pickVideo = () => $('#fileInput').click();
  $('#btnImport').addEventListener('click', pickVideo);
  $('#btnImport2').addEventListener('click', pickVideo);
  $('#btnReplace').addEventListener('click', pickVideo);
  $('#btnRemoveVideo').addEventListener('click', removeVideo);
  $('#fileInput').addEventListener('change', (e) => { loadVideoFile(e.target.files[0]); e.target.value = ''; });

  ['dragenter', 'dragover'].forEach((ev) => els.wrap.addEventListener(ev, (e) => { e.preventDefault(); els.dropHint.classList.add('active'); }));
  ['dragleave', 'drop'].forEach((ev) => els.wrap.addEventListener(ev, (e) => { e.preventDefault(); els.dropHint.classList.remove('active'); }));
  els.wrap.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.json')) loadProjectFile(file);
    else loadVideoFile(file);
  });

  /* ------------------------------------------------------------------ project save / load */
  function saveProject() {
    const data = {
      app: 'perspective-editor', version: 3,
      aspect: state.aspect, duration: state.duration, fov: state.fov,
      videoName: state.video.file ? state.video.file.name : null,
      camera: state.camera,
      media: state.media,
      mask: state.mask,
      layers: state.layers,
    };
    const blob = new Blob([JSON.stringify(data, stripper, 2)], { type: 'application/json' });
    saveFile(blob, 'perspective-project.json');
    if (!downloadsCap) toast('Project saved (video is not embedded — re-import it when opening)');
  }
  async function loadProjectFile(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.layers)) throw new Error('Not a Perspective project');
      state.layers = data.layers.map((l) => { const m = Presets.deepMerge(Presets.defaultLayer(), l); m.id = m.id || uid(); return m; });
      state.camera = Object.assign(defaultCamera(), data.camera || {});
      if (data.camera && data.camera.sharpNear == null) { state.camera.sharpNear = 0.9; state.camera.sharpFar = 3.6; }
      if (state.camera.farFade >= 8 && state.camera.farFade < FADE_OFF) state.camera.farFade = FADE_OFF; // 8 used to mean "off"
      state.camera.keys = (state.camera.keys || []).map((k) => Camera.defaultKey(k.t || 0, k));
      state.media = Object.assign(defaultMedia(), data.media || {});
      state.mask = Object.assign(defaultMask(), data.mask || {});
      state.mask.keys = (state.mask.keys || []).map((k) => Camera.defaultKey(k.t || 0, k));
      if ((data.version || 1) < 3 && !data.media) state.media.locked = true; // older projects were built with a fixed backdrop
      if (data.aspect) state.aspect = data.aspect;
      if (data.duration) state.duration = data.duration;
      if (data.fov) state.fov = data.fov;
      state.selectedIds = []; state.selectedKeyId = null; state.selectedMaskKeyId = null;
      state.undo = []; state.redo = []; state.lastCommitted = null;
      commit();
      syncCameraControls();
      syncMediaControls();
      syncMaskControls();
      fitPreview();
      refreshAll();
      toast(`Opened project${data.videoName ? ` — re-import "${data.videoName}" to see the video` : ''}`);
    } catch (e) {
      toast(`Could not open project: ${e.message}`, true);
    }
  }
  function aspectToLabel(a) {
    const map = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 0.8 };
    let best = '16:9', bd = Infinity;
    for (const [k, v] of Object.entries(map)) { const d = Math.abs(v - a); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  $('#btnSave').addEventListener('click', saveProject);
  $('#btnLoad').addEventListener('click', () => $('#projectInput').click());
  $('#projectInput').addEventListener('change', (e) => { if (e.target.files[0]) loadProjectFile(e.target.files[0]); e.target.value = ''; });

  /* ------------------------------------------------------------------ transport & tabs */
  $('#btnAddText').addEventListener('click', addBlankText);
  els.btnPlay.addEventListener('click', () => clock.toggle());
  $('#btnStepBack').addEventListener('click', () => { clock.pause(); clock.time = clock.time - 1 / 30; });
  $('#btnStepFwd').addEventListener('click', () => { clock.pause(); clock.time = clock.time + 1 / 30; });
  $('#btnLoop').addEventListener('click', (e) => { state.loop = !state.loop; els.video.loop = state.loop; e.currentTarget.classList.toggle('active', state.loop); });
  $('#btnMute').addEventListener('click', (e) => { state.muted = !state.muted; els.video.muted = state.muted; e.currentTarget.classList.toggle('active', state.muted); e.currentTarget.title = state.muted ? 'Unmute' : 'Mute'; });
  $('#aspectSelect').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split(':').map(Number);
    state.aspect = w / h;
    fitPreview();
    if (layoutVisible()) layoutView.draw();
  });
  $('#durationInput').addEventListener('change', (e) => {
    state.duration = clamp(Number(e.target.value) || 10, 1, 600);
    e.target.value = state.duration;
    for (const l of state.layers) { l.end = Math.min(l.end, state.duration); l.start = Math.min(l.start, Math.max(0, l.end - 0.1)); }
    clampCameraKeys(state.duration);
    if (clock.time > state.duration) clock.time = 0;
    commit();
    refreshAll();
  });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);

  function showTab(name) {
    $$('.tab', $('#leftTabs')).forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    for (const n of ['media', 'text', 'camera']) $(`#tab-${n}`).classList.toggle('hidden', n !== name);
  }
  $('#leftTabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) showTab(b.dataset.tab); });

  /* ------------------------------------------------------------------ export */
  const expDialog = $('#exportDialog');
  const progDialog = $('#progressDialog');

  function evenDims(w, h) { return [Math.round(w / 2) * 2, Math.round(h / 2) * 2]; }
  function dimsForShortSide(s, aspect) {
    return aspect >= 1 ? evenDims(s * aspect, s) : evenDims(s, s / aspect);
  }
  function resolutionOptions() {
    const aspect = frameAspect();
    const opts = [];
    if (state.video.ready) opts.push({ id: 'orig', label: `Original (${state.video.width}×${state.video.height})`, w: state.video.width, h: state.video.height });
    const names = { 720: '720p HD', 1080: '1080p Full HD', 1440: '1440p QHD', 2160: '2160p 4K UHD' };
    for (const s of [720, 1080, 1440, 2160]) {
      const [w, h] = dimsForShortSide(s, aspect);
      opts.push({ id: String(s), label: `${names[s]} (${w}×${h})`, w, h });
    }
    const limit = Math.min(renderer.maxTex, renderer.maxRB);
    for (const o of opts) o.disabled = Math.max(o.w, o.h) > limit;
    return opts;
  }

  function openExportDialog() {
    clock.pause();
    const sel = $('#expRes');
    sel.innerHTML = '';
    for (const o of resolutionOptions()) {
      const opt = new Option(o.label + (o.disabled ? ' — exceeds GPU limit' : ''), o.id);
      opt.disabled = o.disabled;
      opt.dataset.w = o.w; opt.dataset.h = o.h;
      sel.appendChild(opt);
    }
    sel.value = '1080';
    $('#expStart').value = 0;
    $('#expEnd').value = round(duration(), 2);
    $('#expEnd').max = round(duration(), 2);
    $('#expAudioWrap').classList.toggle('hidden', !state.video.ready);
    const canStream = typeof window.showSaveFilePicker === 'function' && Exporter.hasWebCodecs();
    $('#expStreamWrap').classList.toggle('hidden', !canStream);
    $('#expStream').checked = false;
    const engine = Exporter.hasWebCodecs()
      ? 'Encoder: WebCodecs (H.264 MP4, frame-accurate, hardware accelerated where available).'
      : Exporter.hasMediaRecorder()
        ? 'This browser lacks WebCodecs — falling back to real-time MediaRecorder capture (WebM). Use Chrome or Edge for MP4 and 4K.'
        : 'This browser cannot export video. Please use a recent Chrome or Edge.';
    $('#expEngine').textContent = engine;
    updateExportSummary();
    expDialog.showModal();
  }
  function updateExportSummary() {
    const sel = $('#expRes');
    const opt = sel.selectedOptions[0];
    if (!opt) return;
    const w = Number(opt.dataset.w), h = Number(opt.dataset.h);
    const fps = Number($('#expFps').value);
    const s = Number($('#expStart').value) || 0, e = Number($('#expEnd').value) || duration();
    const frames = Math.max(0, Math.round((e - s) * fps));
    const mbps = Exporter.estimateBitrate(w, h, fps, $('#expQuality').value) / 1e6;
    const mb = (mbps * (e - s)) / 8;
    $('#exportSummary').textContent = `${w}×${h} · ${fps} fps · ${frames} frames · ≈${mbps.toFixed(0)} Mbps (≈${mb.toFixed(0)} MB)`;
    if (sel.value === '2160' && !$('#expStreamWrap').classList.contains('hidden')) $('#expStream').checked = true;
  }
  ['#expRes', '#expFps', '#expQuality', '#expStart', '#expEnd'].forEach((s) => $(s).addEventListener('input', updateExportSummary));
  $('#btnExport').addEventListener('click', openExportDialog);

  $('#exportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const opt = $('#expRes').selectedOptions[0];
    const cfg = {
      w: Number(opt.dataset.w), h: Number(opt.dataset.h),
      fps: Number($('#expFps').value),
      quality: $('#expQuality').value,
      start: clamp(Number($('#expStart').value) || 0, 0, duration()),
      end: clamp(Number($('#expEnd').value) || duration(), 0, duration()),
      audio: state.video.ready && $('#expAudio').checked,
      stream: $('#expStream').checked && !$('#expStreamWrap').classList.contains('hidden'),
    };
    if (cfg.end - cfg.start < 0.1) { toast('Export range is too short', true); return; }
    let fileHandle = null;
    if (cfg.stream) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: `perspective-${cfg.w}x${cfg.h}.mp4`,
          types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        toast('Could not open the save dialog; exporting to memory instead.');
      }
    }
    expDialog.close();
    runExport(cfg, fileHandle);
  });

  function seekVideo(t) {
    const v = els.video;
    return new Promise((resolve) => {
      if (Math.abs(v.currentTime - t) < 0.0005 && v.readyState >= 2) return resolve();
      let done = false;
      const finish = () => { if (done) return; done = true; v.removeEventListener('seeked', finish); clearTimeout(timer); resolve(); };
      const timer = setTimeout(finish, 3000);
      v.addEventListener('seeked', finish);
      v.currentTime = t;
    });
  }

  async function runExport(cfg, fileHandle) {
    clock.pause();
    const wasTime = clock.time;
    const prevW = els.canvas.width, prevH = els.canvas.height;
    state.exporting = true;
    const abort = new AbortController();
    let lastUrl = null;

    $('#progTitle').textContent = 'Exporting…';
    $('#progStage').textContent = 'Preparing…';
    $('#progBar').style.width = '0%';
    $('#progEta').textContent = '';
    $('#progCancel').classList.remove('hidden');
    $('#progDownload').classList.add('hidden');
    $('#progClose').classList.add('hidden');
    progDialog.showModal();
    $('#progCancel').onclick = () => abort.abort();

    const onProgress = (info) => {
      if (info.stage) $('#progStage').textContent = info.stage;
      if (info.progress != null) $('#progBar').style.width = `${Math.round(info.progress * 100)}%`;
      if (info.eta != null && isFinite(info.eta)) $('#progEta').textContent = info.eta > 1 ? `About ${fmtEta(info.eta)} remaining` : 'Almost done…';
    };

    renderer.resize(cfg.w, cfg.h);
    renderer.fovDeg = state.fov;
    const media = mediaForRender();
    const renderFrame = async (t, realtime) => {
      if (state.video.ready && !realtime) await seekVideo(t);
      renderer.render({
        video: state.video.ready ? els.video : null,
        videoReady: state.video.ready && els.video.readyState >= 2,
        layers: state.layers, time: t, frameHeightPx: cfg.h, selectedIds: [], camera: cameraAt(t), media,
        mask: maskForRender(t), showMask: false,
      });
    };

    const t0 = performance.now();
    try {
      let result;
      const common = { canvas: els.canvas, width: cfg.w, height: cfg.h, fps: cfg.fps, start: cfg.start, end: cfg.end, quality: cfg.quality, renderFrame, onProgress, signal: abort.signal };
      if (Exporter.hasWebCodecs()) {
        result = await Exporter.exportWebCodecs(Object.assign(common, { audioFile: state.video.file, includeAudio: cfg.audio, fileHandle }));
      } else if (Exporter.hasMediaRecorder()) {
        if (state.video.ready) els.video.muted = true;
        result = await Exporter.exportMediaRecorder(Object.assign(common, { video: state.video.ready ? els.video : null }));
        els.video.muted = state.muted;
      } else {
        throw new Error('This browser cannot export video. Use a recent Chrome or Edge.');
      }
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      $('#progTitle').textContent = 'Export complete';
      $('#progBar').style.width = '100%';
      $('#progCancel').classList.add('hidden');
      $('#progClose').classList.remove('hidden');
      if (result.blob) {
        const a = $('#progDownload');
        const filename = `perspective-${cfg.w}x${cfg.h}.${result.ext}`;
        if (downloadsCap) {
          a.removeAttribute('href');
          a.removeAttribute('download');
          a.onclick = (ev) => { ev.preventDefault(); saveFile(result.blob, filename); };
        } else {
          lastUrl = URL.createObjectURL(result.blob);
          a.href = lastUrl;
          a.download = filename;
          a.onclick = null;
        }
        a.textContent = `${downloadsCap ? 'Save' : 'Download'} ${result.ext.toUpperCase()} (${(result.blob.size / 1048576).toFixed(1)} MB)`;
        a.classList.remove('hidden');
        $('#progStage').textContent = `${cfg.w}×${cfg.h} · ${cfg.fps} fps · ${result.codec || result.mime}${result.audio ? ' · with audio' : ' · no audio'} · rendered in ${secs}s`;
      } else {
        $('#progStage').textContent = `Saved to disk · ${cfg.w}×${cfg.h} · ${cfg.fps} fps · ${result.codec}${result.audio ? ' · with audio' : ''} · rendered in ${secs}s`;
      }
      $('#progEta').textContent = '';
    } catch (err) {
      console.error(err);
      $('#progTitle').textContent = err.name === 'AbortError' ? 'Export cancelled' : 'Export failed';
      $('#progStage').textContent = err.name === 'AbortError' ? 'Nothing was saved.' : (err.message || String(err));
      $('#progCancel').classList.add('hidden');
      $('#progClose').classList.remove('hidden');
    } finally {
      state.exporting = false;
      renderer.resize(prevW, prevH);
      if (state.video.ready) await seekVideo(wasTime); else clock.time = wasTime;
      invalidate();
    }
    $('#progClose').onclick = () => { progDialog.close(); if (lastUrl) setTimeout(() => URL.revokeObjectURL(lastUrl), 60000); };
  }
  function fmtEta(s) {
    if (s < 60) return `${Math.ceil(s)} s`;
    return `${Math.floor(s / 60)} min ${Math.ceil(s % 60)} s`;
  }

  /* ------------------------------------------------------------------ keyboard */
  function isTyping() {
    const a = document.activeElement;
    if (!a) return false;
    if (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable) return true;
    return $$('dialog[open]').length > 0;
  }
  let nudgeTimer = 0;
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); return; }
    if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); openExportDialog(); return; }
    if (isTyping()) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); return; }
    const targets = selectedLayers();
    switch (e.key) {
      case ' ': e.preventDefault(); clock.toggle(); break;
      case 'Escape': select(null); break;
      case 'Delete': case 'Backspace': if (targets.length || state.selectedKeyId || state.selectedMaskKeyId) { e.preventDefault(); deleteSelected(); } break;
      case 'Home': clock.pause(); clock.time = 0; break;
      case 'End': clock.pause(); clock.time = duration(); break;
      case ',': clock.pause(); clock.time = clock.time - 1 / 30; break;
      case '.': clock.pause(); clock.time = clock.time + 1 / 30; break;
      case 't': case 'T': addBlankText(); break;
      case 'k': case 'K': addKeyHere(); break;
      case 'm': case 'M': if (state.mask.enabled) { state.maskEdit = !state.maskEdit; syncMaskControls(); } break;
      case 'l': case 'L': setView(state.view === 'preview' ? 'split' : state.view === 'split' ? 'layout' : 'preview'); break;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
        if (!targets.length) {
          e.preventDefault();
          clock.pause();
          clock.time = clock.time + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) * (e.shiftKey ? 1 : 1 / 30);
          break;
        }
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.01;
        for (const l of targets) {
          if (e.key === 'ArrowLeft') l.transform.x -= step;
          if (e.key === 'ArrowRight') l.transform.x += step;
          if (e.key === 'ArrowUp') l.transform.y += step;
          if (e.key === 'ArrowDown') l.transform.y -= step;
          l.transform.x = round(l.transform.x, 3); l.transform.y = round(l.transform.y, 3);
        }
        refreshInspectorValues(); invalidate();
        if (layoutVisible()) layoutView.draw();
        clearTimeout(nudgeTimer); nudgeTimer = setTimeout(commit, 400);
        break;
      }
      default: break;
    }
  });

  /* ------------------------------------------------------------------ fonts */
  function onFontsReady() {
    TextRender.clearCache();
    renderer.clearTextures();
    for (const l of state.layers) l._layout = null;
    invalidate();
  }
  TextRender.preloadFonts().then(onFontsReady);
  if (document.fonts) document.fonts.addEventListener('loadingdone', onFontsReady);

  /* ------------------------------------------------------------------ init */
  function init() {
    buildTemplateGrid();
    buildStyleGrid();
    buildMoveGrid();
    buildSections(LAYER_SCHEMA, els.sections, layerCtx);
    buildSections(KEY_SCHEMA, els.keySections, keyCtx);
    buildSections(MASK_KEY_SCHEMA, $('#maskKeySections'), maskCtx);
    new ResizeObserver(() => { fitPreview(); renderTimeline(); if (layoutVisible()) { layoutView.resize(); layoutView.draw(); } }).observe(els.views);
    fitPreview();

    // Demo content so the first impression shows the camera-reveal effect on the plain background.
    const demo = Presets.TEMPLATES.find((t) => t.id === 'reveal');
    const built = demo.build(demo.sample, 0.2, 6, frameAspect(), { camDist: renderer.camDist, hasVideo: false });
    for (const l of built.layers) addLayer(l, { select: false });
    state.camera.keys = built.cameraKeys || [];
    if (built.cameraSettings) Object.assign(state.camera, built.cameraSettings);
    if (built.mediaSettings) Object.assign(state.media, built.mediaSettings);
    state.media.bg = '#141419';
    state.selectedIds = [];
    state.lastCommitted = snapshot();
    updateUndoButtons();
    syncCameraControls();
    syncMediaControls();
    syncMaskControls();
    refreshAll();
    updatePlayButton();
    setView('split');
    requestAnimationFrame(frame);
    clock.play();
  }
  init();
  // Debug / automation hook (read-only use).
  window.__perspective = { state, renderer, cameraAt, clock, layoutView, maskForRender };
})();
