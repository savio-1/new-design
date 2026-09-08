/* Perspective — application: state, UI, interactions, export flow. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round = (v, d = 2) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

  /* ------------------------------------------------------------------ state */
  const state = {
    layers: [],
    selectedId: null,
    video: { file: null, url: null, width: 0, height: 0, duration: 0, ready: false },
    aspect: 9 / 16,
    duration: 10,
    fov: 45,
    loop: true,
    muted: false,
    exporting: false,
    undo: [],
    redo: [],
    lastCommitted: null,
  };

  const els = {
    canvas: $('#preview'),
    wrap: $('#previewWrap'),
    video: $('#video'),
    dropHint: $('#dropHint'),
    tlBody: $('#tlBody'),
    tlEmpty: $('#tlEmpty'),
    ruler: $('#ruler'),
    playhead: $('#playhead'),
    timeLabel: $('#timeLabel'),
    btnPlay: $('#btnPlay'),
    inspectorEmpty: $('#inspectorEmpty'),
    inspectorBody: $('#inspectorBody'),
    sections: $('#inspectorSections'),
    layerName: $('#layerName'),
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

  function draw(time) {
    renderer.fovDeg = state.fov;
    renderer.render({
      video: state.video.ready ? els.video : null,
      videoReady: state.video.ready && els.video.readyState >= 2,
      layers: state.layers,
      time,
      frameHeightPx: els.canvas.height,
      selectedId: state.exporting ? null : state.selectedId,
    });
  }

  function frame(now) {
    if (!state.exporting) {
      clock.tick(now);
      if (clock.playing || needsRender) {
        needsRender = false;
        draw(clock.time);
        updateTimeUI();
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
  }

  /* ------------------------------------------------------------------ layers & undo */
  let nextId = 1;
  const uid = () => `L${nextId++}_${Math.random().toString(36).slice(2, 6)}`;
  const getLayer = (id) => state.layers.find((l) => l.id === id);
  const selected = () => getLayer(state.selectedId);

  function addLayer(partial, opts = {}) {
    const l = Presets.deepMerge(Presets.defaultLayer(), partial || {});
    l.id = uid();
    l.start = clamp(l.start, 0, Math.max(0, duration() - 0.1));
    l.end = clamp(l.end, l.start + 0.1, duration());
    state.layers.push(l);
    if (opts.select !== false) state.selectedId = l.id;
    return l;
  }

  function addBlankText() {
    let t = clock.time;
    let dur = Math.min(3, duration() - t);
    if (dur < 0.5) { t = 0; dur = Math.min(3, duration()); }
    const l = addLayer({ text: 'Your text', name: 'Text', start: t, end: t + dur });
    commit();
    refreshAll();
    focusTextInput();
    return l;
  }

  function deleteLayer(id) {
    const i = state.layers.findIndex((l) => l.id === id);
    if (i < 0) return;
    state.layers.splice(i, 1);
    if (state.selectedId === id) state.selectedId = null;
    commit();
    refreshAll();
  }

  function duplicateLayer(id) {
    const src = getLayer(id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src, stripper));
    copy.id = uid();
    copy.name = `${src.name} copy`;
    copy.transform.y -= 0.12;
    const i = state.layers.indexOf(src);
    state.layers.splice(i + 1, 0, copy);
    state.selectedId = copy.id;
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

  function select(id) {
    if (state.selectedId === id) return;
    state.selectedId = id;
    refreshInspector();
    renderTimeline();
    invalidate();
  }

  function snapshot() {
    return JSON.stringify({ layers: state.layers, selectedId: state.selectedId }, stripper);
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
    state.selectedId = getLayer(data.selectedId) ? data.selectedId : null;
    state.lastCommitted = snap;
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

  function renderTimeline() {
    renderRuler();
    const rows = state.layers.slice().reverse();
    els.tlEmpty.classList.toggle('hidden', rows.length > 0);
    $('#layerCount').textContent = rows.length ? `(${rows.length})` : '';
    // Remove old rows
    $$('.tl-row', els.tlBody).forEach((r) => r.remove());
    for (const l of rows) {
      const row = document.createElement('div');
      row.className = `tl-row${l.id === state.selectedId ? ' selected' : ''}${l.hidden ? ' hidden-layer' : ''}`;
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

    const seekFromEvent = (e) => {
      const rect = els.ruler.getBoundingClientRect();
      const t = clamp(((e.clientX - rect.left) / rect.width) * duration(), 0, duration());
      clock.time = t;
      updateTimeUI();
    };

    els.ruler.addEventListener('pointerdown', (e) => {
      els.ruler.setPointerCapture(e.pointerId);
      drag = { mode: 'scrub' };
      seekFromEvent(e);
    });
    els.ruler.addEventListener('pointermove', (e) => { if (drag && drag.mode === 'scrub') seekFromEvent(e); });
    els.ruler.addEventListener('pointerup', () => { drag = null; });

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
      if (name) select(name.closest('.tl-row').dataset.id);
    });

    els.tlBody.addEventListener('pointerdown', (e) => {
      const bar = e.target.closest('.tl-bar');
      if (!bar) {
        if (e.target.closest('.tl-track')) {
          // click on empty track: seek + deselect
          const rect = els.ruler.getBoundingClientRect();
          clock.time = clamp(((e.clientX - rect.left) / rect.width) * duration(), 0, duration());
          select(null);
          drag = { mode: 'scrub' };
          els.tlBody.setPointerCapture(e.pointerId);
        }
        return;
      }
      const id = bar.closest('.tl-row').dataset.id;
      const l = getLayer(id);
      select(id);
      const mode = e.target.classList.contains('h') ? (e.target.classList.contains('l') ? 'trimL' : 'trimR') : 'move';
      drag = { mode, id, x0: e.clientX, start0: l.start, end0: l.end, moved: false };
      els.tlBody.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    els.tlBody.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') {
        const rect = els.ruler.getBoundingClientRect();
        clock.time = clamp(((e.clientX - rect.left) / rect.width) * duration(), 0, duration());
        return;
      }
      const l = getLayer(drag.id);
      if (!l) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      const T = duration();
      const len = drag.end0 - drag.start0;
      const snapTargets = [clock.time, 0, T];
      state.layers.forEach((o) => { if (o.id !== l.id) snapTargets.push(o.start, o.end); });
      const snap = (v) => {
        const tol = 6 / pxPerSec();
        let best = v, bd = tol;
        for (const s of snapTargets) { const d = Math.abs(s - v); if (d < bd) { bd = d; best = s; } }
        return best;
      };
      if (drag.mode === 'move') {
        let s = clamp(drag.start0 + dt, 0, T - len);
        const snappedStart = snap(s), snappedEnd = snap(s + len);
        if (snappedStart !== s) s = snappedStart; else if (snappedEnd !== s + len) s = snappedEnd - len;
        s = clamp(s, 0, T - len);
        l.start = s; l.end = s + len;
      } else if (drag.mode === 'trimL') {
        l.start = clamp(snap(drag.start0 + dt), 0, l.end - 0.1);
      } else {
        l.end = clamp(snap(drag.end0 + dt), l.start + 0.1, T);
      }
      updateBar(l);
      refreshInspectorValues();
      invalidate();
    });

    const endDrag = () => {
      if (drag && drag.mode !== 'scrub' && drag.moved) { commit(); renderTimeline(); }
      drag = null;
    };
    els.tlBody.addEventListener('pointerup', endDrag);
    els.tlBody.addEventListener('pointercancel', endDrag);
  })();

  /* ------------------------------------------------------------------ inspector */
  const controls = []; // { update(layer), el, path }
  let inspectorBuilt = false;

  function animOptions() {
    const groups = {};
    for (const [k, def] of Object.entries(Anim.Animations)) {
      (groups[def.group] = groups[def.group] || []).push({ value: k, label: def.label });
    }
    return groups;
  }

  const SCHEMA = [
    {
      title: 'Text',
      fields: [
        { type: 'textarea', path: 'text', label: 'Text', wide: true },
        { type: 'select', path: 'style.font', label: 'Font', options: () => TextRender.FONTS.map((f) => ({ value: f.family, label: f.family, style: `font-family:'${f.family}'` })), onChange: (l) => normaliseWeight(l) },
        { type: 'two', fields: [
          { type: 'select', path: 'style.weight', label: 'Weight', options: (l) => weightOptions(l) },
          { type: 'toggle', path: 'style.italic', label: 'Italic' },
        ] },
        { type: 'range', path: 'style.size', label: 'Size', min: 0.02, max: 0.6, step: 0.005, scale: 100, unit: '%' },
        { type: 'color', path: 'style.color', label: 'Fill', allowNone: true },
        { type: 'segment', path: 'style.align', label: 'Align', options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }] },
        { type: 'range', path: 'style.letterSpacing', label: 'Tracking', min: -0.1, max: 0.5, step: 0.005, scale: 100, unit: '' },
        { type: 'range', path: 'style.lineHeight', label: 'Line height', min: 0.7, max: 2, step: 0.05, scale: 1, unit: '' },
        { type: 'segment', path: 'split', label: 'Animate by', options: [{ value: 'whole', label: 'Block' }, { value: 'word', label: 'Words' }, { value: 'char', label: 'Letters' }] },
      ],
    },
    {
      title: 'Look',
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
      title: 'Position & 3D',
      fields: [
        { type: 'range', path: 'transform.x', label: 'X', min: -3, max: 3, step: 0.01, scale: 1, unit: '' },
        { type: 'range', path: 'transform.y', label: 'Y', min: -1.5, max: 1.5, step: 0.01, scale: 1, unit: '' },
        { type: 'range', path: 'transform.z', label: 'Depth (Z)', min: -2, max: 0.9, step: 0.01, scale: 1, unit: '' },
        { type: 'range', path: 'transform.rx', label: 'Tilt X', min: -90, max: 90, step: 1, scale: 1, unit: '°' },
        { type: 'range', path: 'transform.ry', label: 'Turn Y', min: -90, max: 90, step: 1, scale: 1, unit: '°' },
        { type: 'range', path: 'transform.rz', label: 'Roll Z', min: -180, max: 180, step: 1, scale: 1, unit: '°' },
        { type: 'range', path: 'transform.scale', label: 'Scale', min: 0.1, max: 4, step: 0.01, scale: 100, unit: '%' },
        { type: 'buttons', buttons: [
          { label: 'Centre', action: (l) => { l.transform.x = 0; l.transform.y = 0; l.transform.z = 0; } },
          { label: 'Reset rotation', action: (l) => { l.transform.rx = 0; l.transform.ry = 0; l.transform.rz = 0; l.transform.scale = 1; } },
        ] },
      ],
    },
    {
      title: 'Animation',
      fields: [
        { type: 'sub', label: 'In' },
        { type: 'select', path: 'anim.in.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'in') },
        { type: 'range', path: 'anim.in.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.in.easing', label: 'Easing', options: () => Object.entries(Anim.EASING_LABELS).map(([value, label]) => ({ value, label })) },
        { type: 'range', path: 'anim.in.stagger', label: 'Stagger', min: 0, max: 0.6, step: 0.01, scale: 1, unit: 's', hint: 'Delay between words/letters' },
        { type: 'sub', label: 'Out' },
        { type: 'select', path: 'anim.out.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'out') },
        { type: 'range', path: 'anim.out.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.out.easing', label: 'Easing', options: () => Object.entries(Anim.EASING_LABELS).map(([value, label]) => ({ value, label })) },
        { type: 'range', path: 'anim.out.stagger', label: 'Stagger', min: 0, max: 0.6, step: 0.01, scale: 1, unit: 's' },
        { type: 'sub', label: 'While visible' },
        { type: 'select', path: 'anim.loop.type', label: 'Motion', options: () => Object.entries(Anim.Loops).map(([value, d]) => ({ value, label: d.label })) },
        { type: 'range', path: 'anim.loop.speed', label: 'Speed', min: 0.1, max: 4, step: 0.1, scale: 1, unit: '×' },
      ],
    },
    {
      title: 'Timing',
      fields: [
        { type: 'two', fields: [
          { type: 'number', path: 'start', label: 'Start', step: 0.05, min: 0, unit: 's', onChange: (l) => { l.start = clamp(l.start, 0, l.end - 0.1); } },
          { type: 'number', path: 'end', label: 'End', step: 0.05, min: 0, unit: 's', onChange: (l) => { l.end = clamp(l.end, l.start + 0.1, duration()); } },
        ] },
        { type: 'buttons', buttons: [
          { label: 'Start at playhead', action: (l) => { const len = l.end - l.start; l.start = clamp(clock.time, 0, duration() - 0.1); l.end = clamp(l.start + len, l.start + 0.1, duration()); } },
          { label: 'End at playhead', action: (l) => { l.end = clamp(clock.time, l.start + 0.1, duration()); } },
        ] },
      ],
    },
  ];

  function weightOptions(l) {
    const f = TextRender.FONTS.find((x) => x.family === l.style.font);
    const ws = f ? f.weights : [400, 700];
    const names = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 900: 'Black' };
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

  function buildInspector() {
    if (inspectorBuilt) return;
    inspectorBuilt = true;
    const CHEV = '<svg viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    for (const sec of SCHEMA) {
      const section = document.createElement('div');
      section.className = 'section';
      const head = document.createElement('button');
      head.className = 'section-head';
      head.type = 'button';
      head.innerHTML = `<span>${sec.title}</span>${CHEV}`;
      head.addEventListener('click', () => section.classList.toggle('collapsed'));
      const body = document.createElement('div');
      body.className = 'section-body';
      for (const f of sec.fields) body.appendChild(buildField(f));
      section.appendChild(head);
      section.appendChild(body);
      els.sections.appendChild(section);
    }
  }

  function applyChange(field, l, value, isFinal) {
    setPath(l, field.path, value);
    if (field.onChange) field.onChange(l);
    l._layout = null;
    if (field.path === 'start' || field.path === 'end') updateBar(l);
    if (field.path === 'text' || field.path === 'name') {
      const row = $(`.tl-row[data-id="${l.id}"] .tl-bar span`, els.tlBody);
      if (row) row.textContent = (l.text || '').replace(/\n/g, ' ');
    }
    invalidate();
    if (isFinal) {
      commit();
      refreshInspectorValues();
      if (field.path === 'text' || field.path.startsWith('anim') || field.path === 'split') renderTimeline();
    }
  }

  function buildField(f) {
    const wrap = document.createElement('div');
    if (f.type === 'sub') {
      wrap.className = 'subhead';
      wrap.textContent = f.label;
      return wrap;
    }
    if (f.type === 'two') {
      wrap.className = 'two';
      for (const sub of f.fields) wrap.appendChild(buildField(sub));
      return wrap;
    }
    if (f.type === 'buttons') {
      wrap.className = 'two';
      for (const b of f.buttons) {
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.type = 'button';
        btn.textContent = b.label;
        btn.addEventListener('click', () => {
          const l = selected();
          if (!l) return;
          b.action(l);
          l._layout = null;
          commit();
          refreshAll();
        });
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

    if (f.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.rows = 3;
      ta.spellcheck = false;
      ta.placeholder = 'Type your text…';
      ta.addEventListener('input', () => { const l = selected(); if (l) applyChange(f, l, ta.value, false); });
      ta.addEventListener('change', () => { const l = selected(); if (l) applyChange(f, l, ta.value, true); });
      ta.id = 'textInput';
      wrap.appendChild(ta);
      update = (l) => { if (document.activeElement !== ta) ta.value = getPath(l, f.path) || ''; };
    } else if (f.type === 'select') {
      const sel = document.createElement('select');
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
        const l = selected();
        if (!l) return;
        const raw = sel.value;
        const v = /^-?\d+(\.\d+)?$/.test(raw) && f.path === 'style.weight' ? Number(raw) : raw;
        applyChange(f, l, v, true);
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
      r.addEventListener('input', () => { const l = selected(); if (!l) return; n.value = round(r.value * f.scale, 2); applyChange(f, l, Number(r.value), false); });
      r.addEventListener('change', () => { const l = selected(); if (l) applyChange(f, l, Number(r.value), true); });
      n.addEventListener('change', () => {
        const l = selected(); if (!l) return;
        const v = clamp(Number(n.value) / f.scale, f.min, f.max);
        r.value = v; n.value = round(v * f.scale, 2);
        applyChange(f, l, v, true);
      });
      rw.appendChild(r); rw.appendChild(n);
      wrap.appendChild(rw);
      update = (l) => { const v = Number(getPath(l, f.path)) || 0; r.value = v; if (document.activeElement !== n) n.value = round(v * f.scale, 2); };
    } else if (f.type === 'number') {
      const n = document.createElement('input');
      n.type = 'number'; n.step = f.step; if (f.min != null) n.min = f.min;
      n.addEventListener('change', () => { const l = selected(); if (l) applyChange(f, l, Number(n.value), true); });
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
        none.addEventListener('change', () => { const l = selected(); if (!l) return; applyChange(f, l, none.checked ? 'transparent' : c.value, true); });
      }
      c.addEventListener('input', () => { const l = selected(); if (!l) return; hex.value = c.value; if (none) none.checked = false; applyChange(f, l, c.value, false); });
      c.addEventListener('change', () => { const l = selected(); if (l) applyChange(f, l, c.value, true); });
      hex.addEventListener('change', () => {
        const l = selected(); if (!l) return;
        let v = hex.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map((ch) => ch + ch).join('');
        if (!/^#[0-9a-f]{6}$/i.test(v)) { hex.value = c.value; return; }
        c.value = v.toLowerCase(); if (none) none.checked = false;
        applyChange(f, l, v.toLowerCase(), true);
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
      cb.addEventListener('change', () => { const l = selected(); if (l) applyChange(f, l, cb.checked, true); });
      wrap.appendChild(lbl);
      update = (l) => { cb.checked = !!getPath(l, f.path); };
    } else if (f.type === 'segment') {
      const seg = document.createElement('div');
      seg.className = 'segment';
      for (const o of f.options) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = o.label; b.dataset.value = o.value;
        b.addEventListener('click', () => { const l = selected(); if (l) applyChange(f, l, o.value, true); });
        seg.appendChild(b);
      }
      wrap.appendChild(seg);
      update = (l) => { const v = getPath(l, f.path); $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.value === String(v))); };
    }
    controls.push({ update });
    return wrap;
  }

  function refreshInspector() {
    const l = selected();
    els.inspectorEmpty.classList.toggle('hidden', !!l);
    els.inspectorBody.classList.toggle('hidden', !l);
    if (!l) return;
    buildInspector();
    refreshInspectorValues();
  }
  function refreshInspectorValues() {
    const l = selected();
    if (!l || !inspectorBuilt) return;
    if (document.activeElement !== els.layerName) els.layerName.value = l.name || '';
    for (const c of controls) c.update(l);
  }
  function focusTextInput() {
    const ta = $('#textInput');
    if (ta) { ta.focus(); ta.select(); }
  }

  els.layerName.addEventListener('input', () => { const l = selected(); if (l) { l.name = els.layerName.value; const nm = $(`.tl-row[data-id="${l.id}"] .nm`, els.tlBody); if (nm) nm.textContent = l.name || l.text; } });
  els.layerName.addEventListener('change', () => commit());
  $('#btnDelete').addEventListener('click', () => { if (state.selectedId) deleteLayer(state.selectedId); });
  $('#btnDuplicate').addEventListener('click', () => { if (state.selectedId) duplicateLayer(state.selectedId); });
  $('#btnLayerUp').addEventListener('click', () => { if (state.selectedId) moveLayer(state.selectedId, +1); });
  $('#btnLayerDown').addEventListener('click', () => { if (state.selectedId) moveLayer(state.selectedId, -1); });

  /* ------------------------------------------------------------------ canvas interaction */
  (function canvasInteractions() {
    const c = els.canvas;
    let drag = null;
    const toBuffer = (e) => {
      const rect = c.getBoundingClientRect();
      return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
    };

    c.addEventListener('pointerdown', (e) => {
      if (state.exporting) return;
      const p = toBuffer(e);
      const id = renderer.hitTest(p.x, p.y);
      if (id) {
        select(id);
        const l = getLayer(id);
        drag = { id, mode: e.altKey ? 'rotate' : 'move', x0: p.x, y0: p.y, t0: JSON.parse(JSON.stringify(l.transform)), moved: false };
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
        c.classList.toggle('hover', !!renderer.hitTest(p.x, p.y));
        return;
      }
      const l = getLayer(drag.id);
      if (!l) return;
      const dx = p.x - drag.x0, dy = p.y - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      if (drag.mode === 'move') {
        const wpp = renderer.worldPerPixel(Math.min(l.transform.z, renderer.camDist - 0.2));
        l.transform.x = round(drag.t0.x + dx * wpp, 3);
        l.transform.y = round(drag.t0.y - dy * wpp, 3);
      } else {
        l.transform.ry = clamp(round(drag.t0.ry + dx * 0.25, 1), -90, 90);
        l.transform.rx = clamp(round(drag.t0.rx - dy * 0.25, 1), -90, 90);
      }
      refreshInspectorValues();
      invalidate();
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
      const l = selected();
      if (!l || state.exporting) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      l.style.size = clamp(round(l.style.size * factor, 4), 0.02, 0.6);
      l._layout = null;
      refreshInspectorValues();
      invalidate();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(commit, 400);
    }, { passive: false });
  })();

  /* ------------------------------------------------------------------ templates & styles */
  const TEMPLATE_PREVIEWS = {
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
    let l = selected();
    if (!l) {
      let t = clock.time;
      let dur = Math.min(3, duration() - t);
      if (dur < 0.5) { t = 0; dur = Math.min(3, duration()); }
      l = addLayer({ text: preset.name, name: preset.name, start: t, end: t + dur });
      toast(`Created a new layer with the ${preset.name} style`);
    } else {
      toast(`Applied ${preset.name}`);
    }
    l.style = Presets.deepMerge(l.style, preset.style);
    normaliseWeight(l);
    l._layout = null;
    commit();
    refreshAll();
  }

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
    $('#tplDuration').value = round(Math.min(t.id === 'kinetic' ? 8 : 5, remaining), 2);
    $('#tplReplace').checked = false;
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
    const layers = activeTemplate.build(text, start, dur, frameAspect());
    if (!layers.length) { toast('Please enter some text first', true); return; }
    if ($('#tplReplace').checked) state.layers = [];
    let first = null;
    for (const l of layers) { const added = addLayer(l, { select: false }); if (!first) first = added; }
    state.selectedId = first ? first.id : null;
    commit();
    refreshAll();
    tplDialog.close();
    clock.time = start;
    clock.play();
    toast(`Inserted ${layers.length} layer${layers.length > 1 ? 's' : ''} from ${activeTemplate.name}`);
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

  els.video.addEventListener('loadedmetadata', () => {
    const v = els.video;
    if (!v.videoWidth || !v.videoHeight) return;
    state.video.width = v.videoWidth;
    state.video.height = v.videoHeight;
    state.video.duration = v.duration && isFinite(v.duration) ? v.duration : 10;
    state.video.ready = true;
    // keep layers inside the new duration
    for (const l of state.layers) {
      l.end = Math.min(l.end, state.video.duration);
      l.start = Math.min(l.start, Math.max(0, l.end - 0.1));
      l._layout = null;
    }
    $('#noVideoFields').classList.add('hidden');
    $('#expAudioWrap').classList.remove('hidden');
    els.dropHint.classList.add('hidden');
    v.currentTime = 0;
    fitPreview();
    renderTimeline();
    refreshInspectorValues();
    commit();
    toast(`${state.video.file.name} · ${v.videoWidth}×${v.videoHeight} · ${fmtTime(v.duration)}`);
  });
  els.video.addEventListener('loadeddata', invalidate);
  els.video.addEventListener('seeked', invalidate);
  els.video.addEventListener('play', updatePlayButton);
  els.video.addEventListener('pause', updatePlayButton);
  els.video.addEventListener('ended', updatePlayButton);
  els.video.addEventListener('error', () => {
    const err = els.video.error;
    toast(`This browser cannot decode that video${err && err.code === 4 ? ' (unsupported codec — try MP4/H.264)' : ''}.`, true);
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false };
    els.dropHint.classList.remove('hidden');
    $('#noVideoFields').classList.remove('hidden');
    fitPreview();
  });

  $('#btnImport').addEventListener('click', () => $('#fileInput').click());
  $('#btnImport2').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => { loadVideoFile(e.target.files[0]); e.target.value = ''; });

  // Drag & drop
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
      app: 'perspective-editor', version: 1,
      aspect: state.aspect, duration: state.duration, fov: state.fov,
      videoName: state.video.file ? state.video.file.name : null,
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
      if (data.aspect) { state.aspect = data.aspect; $('#aspectSelect').value = aspectToLabel(data.aspect); }
      if (data.duration) { state.duration = data.duration; $('#durationInput').value = data.duration; }
      if (data.fov) { state.fov = data.fov; $('#fovSelect').value = String(data.fov); }
      state.selectedId = null;
      state.undo = []; state.redo = []; state.lastCommitted = null;
      commit();
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

  /* ------------------------------------------------------------------ transport */
  $('#btnAddText').addEventListener('click', addBlankText);
  els.btnPlay.addEventListener('click', () => clock.toggle());
  $('#btnStepBack').addEventListener('click', () => { clock.pause(); clock.time = clock.time - 1 / 30; });
  $('#btnStepFwd').addEventListener('click', () => { clock.pause(); clock.time = clock.time + 1 / 30; });
  $('#btnLoop').addEventListener('click', (e) => { state.loop = !state.loop; els.video.loop = state.loop; e.currentTarget.classList.toggle('active', state.loop); });
  $('#btnMute').addEventListener('click', (e) => { state.muted = !state.muted; els.video.muted = state.muted; e.currentTarget.classList.toggle('active', state.muted); e.currentTarget.title = state.muted ? 'Unmute' : 'Mute'; });
  $('#fovSelect').addEventListener('change', (e) => { state.fov = Number(e.target.value); invalidate(); });
  $('#aspectSelect').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split(':').map(Number);
    state.aspect = w / h;
    fitPreview();
  });
  $('#durationInput').addEventListener('change', (e) => {
    state.duration = clamp(Number(e.target.value) || 10, 1, 600);
    e.target.value = state.duration;
    for (const l of state.layers) { l.end = Math.min(l.end, state.duration); l.start = Math.min(l.start, Math.max(0, l.end - 0.1)); }
    if (clock.time > state.duration) clock.time = 0;
    commit();
    refreshAll();
  });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);

  $('#leftTabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    $$('.tab', $('#leftTabs')).forEach((t) => t.classList.toggle('active', t === b));
    $('#tab-templates').classList.toggle('hidden', b.dataset.tab !== 'templates');
    $('#tab-styles').classList.toggle('hidden', b.dataset.tab !== 'styles');
  });

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

    // progress UI
    $('#progTitle').textContent = 'Exporting…';
    $('#progStage').textContent = 'Preparing…';
    $('#progBar').style.width = '0%';
    $('#progEta').textContent = '';
    $('#progCancel').classList.remove('hidden');
    $('#progDownload').classList.add('hidden');
    $('#progClose').classList.add('hidden');
    progDialog.showModal();
    const onCancel = () => abort.abort();
    $('#progCancel').onclick = onCancel;

    const onProgress = (info) => {
      if (info.stage) $('#progStage').textContent = info.stage;
      if (info.progress != null) $('#progBar').style.width = `${Math.round(info.progress * 100)}%`;
      if (info.eta != null && isFinite(info.eta)) $('#progEta').textContent = info.eta > 1 ? `About ${fmtEta(info.eta)} remaining` : 'Almost done…';
    };

    renderer.resize(cfg.w, cfg.h);
    renderer.fovDeg = state.fov;
    const renderFrame = async (t, realtime) => {
      if (state.video.ready && !realtime) await seekVideo(t);
      renderer.render({
        video: state.video.ready ? els.video : null,
        videoReady: state.video.ready && els.video.readyState >= 2,
        layers: state.layers, time: t, frameHeightPx: cfg.h, selectedId: null,
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
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); if (state.selectedId) duplicateLayer(state.selectedId); return; }
    const l = selected();
    switch (e.key) {
      case ' ': e.preventDefault(); clock.toggle(); break;
      case 'Escape': select(null); break;
      case 'Delete': case 'Backspace': if (l) { e.preventDefault(); deleteLayer(l.id); } break;
      case 'Home': clock.pause(); clock.time = 0; break;
      case 'End': clock.pause(); clock.time = duration(); break;
      case ',': clock.pause(); clock.time = clock.time - 1 / 30; break;
      case '.': clock.pause(); clock.time = clock.time + 1 / 30; break;
      case 't': case 'T': addBlankText(); break;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
        if (!l) {
          e.preventDefault();
          clock.pause();
          clock.time = clock.time + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) * (e.shiftKey ? 1 : 1 / 30);
          break;
        }
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.01;
        if (e.key === 'ArrowLeft') l.transform.x -= step;
        if (e.key === 'ArrowRight') l.transform.x += step;
        if (e.key === 'ArrowUp') l.transform.y += step;
        if (e.key === 'ArrowDown') l.transform.y -= step;
        l.transform.x = round(l.transform.x, 3); l.transform.y = round(l.transform.y, 3);
        refreshInspectorValues(); invalidate();
        clearTimeout(nudgeTimer); nudgeTimer = setTimeout(commit, 400);
        break;
      }
      default: break;
    }
  });
  let nudgeTimer = 0;

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
    buildInspector();
    new ResizeObserver(() => { fitPreview(); renderTimeline(); }).observe(els.wrap);
    fitPreview();

    // Demo content so the first impression shows the effect
    const demo = Presets.TEMPLATES.find((t) => t.id === 'kinetic');
    const layers = demo.build(demo.sample, 0.3, 9, frameAspect());
    for (const l of layers) addLayer(l, { select: false });
    state.selectedId = null;
    state.lastCommitted = snapshot();
    updateUndoButtons();
    refreshAll();
    updatePlayButton();
    requestAnimationFrame(frame);
    clock.play();
  }
  init();
})();
