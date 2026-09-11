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
  const defaultMedia = () => ({ bg: '#0f0f12', scale: 1, x: 0, y: 0, z: 0, opacity: 1, locked: false });
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
    tracks: [],           // motion trackers: { id, name, color, ref: {t,x,y,w,h}, keys: [{id,t,x,y,s,manual}], lost: {fwd,back} }
    selectedTrackId: null,    // tracker being edited in the Media panel
    selectedTrackKeyId: null, // selected tracker keyframe (exclusive with the other selections)
    trackEdit: false,     // dragging on the preview places / corrects the selected tracker
    tracking: null,       // { controller } while a tracker is being analysed
    suggestions: [],      // object proposals shown on the preview after "Find objects"
    snap: false,          // quantise drags in the 3D views to the grid
    snapStep: 0.1,
    video: { file: null, url: null, width: 0, height: 0, duration: 0, ready: false, thumbs: [] },
    clips: [],            // pieces of the source video laid end to end: { id, in, out } in source seconds
    selectedClipId: null,
    aspect: 9 / 16,
    duration: 120,        // the open timeline's length in seconds — content may run past it
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
    timeCur: $('#timeCur'),
    timeTotal: $('#timeTotal'),
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
    timeline: $('#timeline'),
    guides: $('#previewGuides'),
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
  /* Where the footage track ends: the end of its last piece; 0 without any. */
  function mainLen() {
    let T = 0;
    for (const c of state.clips) T = Math.max(T, clipEnd(c));
    return T;
  }
  /* Where the content ends: the last piece of footage, the last layer or the last camera key. */
  function contentEnd() {
    let T = mainLen();
    for (const l of state.layers) if (l.end > T) T = l.end;
    for (const k of state.camera.keys) if (k.t > T) T = k.t;
    return T;
  }
  /* Playback loops, and export defaults, at the end of the content (at least a second in). */
  function playEnd() { return Math.max(1, Math.min(duration(), round(contentEnd(), 3))); }
  /* The timeline is open: at least `state.duration` long (two minutes to begin with) so there is room
   * to move pieces around, and longer whenever the content runs past that. */
  function duration() { return Math.max(state.duration || 120, Math.ceil(contentEnd() + 1e-6)); }
  const limitFor = (l) => (l && l.type === 'media' ? 3600 : duration());
  const hasFootage = () => state.video.ready || state.clips.length > 0;

  /* ---- clips ---------------------------------------------------------------
   * The footage track holds pieces of video: { id, asset, in, out, start } — `in`/`out` in the source's
   * own seconds, `start` where the piece sits on the timeline. `asset` is null for the main video and an
   * asset id for another video added to the track. Pieces never overlap and may leave gaps. Text and
   * camera keys live in TIMELINE time; anything bound to the main footage (tracks, the subject mask)
   * lives in its SOURCE time and is mapped through here. */
  const clipLen = (c) => c.out - c.in;
  const clipEnd = (c) => c.start + clipLen(c);
  const newClipId = () => `C${Math.random().toString(36).slice(2, 7)}`;
  const clipSource = (c) => (c.asset ? assets.get(c.asset) || null : null);
  const clipEl = (c) => (c.asset ? (clipSource(c) ? clipSource(c).el : null) : els.video);
  const clipReady = (c) => (c.asset ? !!(clipSource(c) && clipSource(c).ready) : state.video.ready);
  const clipSrcDuration = (c) => (c.asset ? (clipSource(c) ? clipSource(c).duration : c.out) : state.video.duration);
  const clipName = (c) => (c.asset ? ((clipSource(c) && clipSource(c).name) || 'Video') : (state.video.file ? state.video.file.name.replace(/\.[^.]+$/, '') : 'Video'));
  function sortClips() { state.clips.sort((a, b) => a.start - b.start); }
  /* Saved pieces may lack a start (older projects laid them end to end) — give them one, and check them
   * against the real length of their source. */
  function normalizeClips(list, D, asset) {
    let acc = 0;
    const out = [];
    for (const c of list) {
      const len = D == null ? (c.out || 0) - (c.in || 0) : Math.min(D, c.out == null ? D : c.out) - clamp(c.in || 0, 0, D);
      const start = c.start == null ? acc : Math.max(0, c.start);
      const inn = D == null ? c.in || 0 : clamp(c.in || 0, 0, D);
      const piece = { id: c.id || newClipId(), asset: asset === undefined ? c.asset || null : asset, in: round(inn, 4), out: round(inn + len, 4), start: round(start, 4) };
      if (piece.out - piece.in >= 0.05) out.push(piece);
      acc = start + Math.max(0, len);
    }
    return out;
  }
  /* After a move, shift the moved piece to the nearest free spot so pieces never overlap. */
  function settleClip(c) {
    for (let guard = 0; guard < 8; guard++) {
      const hit = state.clips.find((o) => o !== c && o.start < clipEnd(c) - 1e-6 && clipEnd(o) > c.start + 1e-6);
      if (!hit) break;
      const mid = c.start + clipLen(c) / 2, omid = hit.start + clipLen(hit) / 2;
      if (mid < omid && hit.start - clipLen(c) >= 0) c.start = round(hit.start - clipLen(c), 4);
      else c.start = round(clipEnd(hit), 4);
    }
    sortClips();
  }
  /* Push later pieces right so nothing overlaps (when a piece grows or a new one is placed). */
  function packClips() {
    sortClips();
    for (let i = 1; i < state.clips.length; i++) {
      const p = state.clips[i - 1], c = state.clips[i];
      if (c.start < clipEnd(p) - 1e-6) c.start = round(clipEnd(p), 4);
    }
  }
  /* Which piece is under timeline time t (null in a gap), and the source time there. */
  function locate(t) {
    for (let i = 0; i < state.clips.length; i++) {
      const c = state.clips[i];
      if (t >= c.start - 1e-6 && t < clipEnd(c) - 1e-6) return { clip: c, index: i, start: c.start, src: clamp(c.in + (t - c.start), c.in, c.out - 1e-4) };
    }
    return { clip: null, index: -1, start: 0, src: null };
  }
  /* Source time of the MAIN video at timeline time t; null in a gap or over another video. Without any
   * footage the timeline is its own source time. */
  function srcTime(t) {
    if (!state.clips.length) return t;
    const loc = locate(t);
    return loc.clip && !loc.clip.asset ? loc.src : null;
  }
  /* Source time to edit footage-bound things at: the playhead's, or the nearest moment of footage. */
  function srcAtPlayhead() {
    const s = srcTime(clock.time);
    if (s != null) return s;
    let best = 0, bd = Infinity;
    for (const c of state.clips) {
      if (c.asset) continue;
      const before = clock.time < c.start;
      const d = before ? c.start - clock.time : clock.time - clipEnd(c);
      if (d < bd) { bd = d; best = before ? c.in : c.out - 1e-4; }
    }
    return best;
  }
  /* Every timeline time at which a main-video source time is shown (a piece can be used more than once). */
  function timelineTimesOf(src) {
    if (!state.clips.length) return [src];
    const out = [];
    for (const c of state.clips) if (!c.asset && src >= c.in - 1e-6 && src <= c.out + 1e-6) out.push(c.start + (src - c.in));
    return out;
  }
  function splitClipAt(t) {
    const loc = locate(t);
    if (!loc.clip) { toast('Move the playhead onto a piece of video to split it'); return false; }
    const c = loc.clip;
    if (loc.src - c.in < 0.1 || c.out - loc.src < 0.1) { toast('Move the playhead a little further from the cut'); return false; }
    const right = { id: newClipId(), asset: c.asset || null, in: round(loc.src, 4), out: c.out, start: round(c.start + (loc.src - c.in), 4) };
    c.out = round(loc.src, 4);
    state.clips.splice(loc.index + 1, 0, right);
    state.selectedClipId = right.id;
    return true;
  }
  function deleteClip(id) {
    const i = state.clips.findIndex((c) => c.id === id);
    if (i < 0) return false;
    const c = state.clips[i];
    if (!c.asset && state.clips.filter((o) => !o.asset).length <= 1) { toast('That is the only piece of the video — trim it, or use Remove in the Media tab', true); return false; }
    const t = clock.time;
    state.clips.splice(i, 1);
    if (c.asset && !state.clips.some((o) => o.asset === c.asset)) releaseAsset(c.asset);
    state.selectedClipId = null;
    afterClipsChanged(t);
    toast('Piece removed — it leaves a gap; drag the other pieces to close it');
    return true;
  }
  /* Re-seat the playhead and the media after the footage track changed. */
  function afterClipsChanged(t) {
    sortClips();
    clock.time = clamp(t == null ? clock.time : t, 0, duration());
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
  /* One clock drives everything. The <video> and <audio> elements follow it — seeking when it seeks,
   * playing when it plays, and nudged back whenever they drift more than a few frames — so any number
   * of videos, images and sounds stay in step, and the timeline can run past the main video. */
  const clock = {
    _t: 0, _playing: false, _last: 0,
    get time() { return this._t; },
    set time(v) {
      this._t = clamp(v, 0, duration());
      syncMedia(this._t, this._playing, true);
      invalidate();
    },
    get playing() { return this._playing; },
    play() {
      if (this._t >= playEnd() - 0.001) this._t = 0;
      this._playing = true;
      this._last = performance.now();
      syncMedia(this._t, true, true);
      updatePlayButton();
    },
    pause() {
      this._playing = false;
      syncMedia(this._t, false, false);
      updatePlayButton();
    },
    toggle() { this.playing ? this.pause() : this.play(); },
    tick(now) {
      if (!this._playing) return;
      this._t += (now - this._last) / 1000;
      this._last = now;
      if (this._t >= playEnd()) {
        if (state.loop) this._t = 0;
        else { this._t = playEnd(); this.pause(); return; }
      }
      syncMedia(this._t, true, false);
    },
  };

  /* Runtime media: the elements behind the main video and every media layer (never saved). */
  const assets = new Map();   // layer id -> { kind, el, url, file, ready, width, height, duration, poster }
  /* Follow an element's own frames. The preview is redrawn when the video presents a frame, rather
   * than only on the display's beat, so the picture advances at the clip's cadence instead of being
   * resampled at whatever moment the frame loop happens to run — which is what makes motion judder.
   * The counter also lets the renderer upload each decoded frame exactly once. Without
   * requestVideoFrameCallback (Firefox) nothing is counted and the renderer uploads as it always did. */
  function watchVideoFrames(el) {
    if (!el || el.__vfWatch || typeof el.requestVideoFrameCallback !== 'function') return;
    el.__vfWatch = true;
    el.__frameId = 0;
    const step = () => {
      el.__frameId++;
      invalidate();
      el.requestVideoFrameCallback(step);
    };
    el.requestVideoFrameCallback(step);
  }
  const DRIFT_HOLD = 0.04;   // s — closer than this to the clock, leave the element alone
  const DRIFT_SEEK = 0.5;    // s — further than this it is in the wrong place, not merely drifting
  function driveEl(el, desired, shouldPlay, force, muted) {
    el.muted = !!muted;
    const atRate = (r) => { if (Math.abs(el.playbackRate - r) > 0.001) el.playbackRate = r; };
    if (desired == null) { if (!el.paused) el.pause(); atRate(1); return; }
    if (el.seeking && !force) return;
    const drift = el.currentTime - desired;   // positive: the element is ahead of the clock
    if (shouldPlay) {
      if (force || Math.abs(drift) > DRIFT_SEEK) {
        el.currentTime = desired;
        atRate(1);
      } else if (Math.abs(drift) > DRIFT_HOLD) {
        // Ease back into step by running fractionally slow or fast. Seeking a playing video flushes
        // the decoder and stalls the picture for a moment, which reads as a stutter every few seconds.
        el.preservesPitch = true;
        atRate(clamp(1 - drift * 0.6, 0.94, 1.06));
      } else atRate(1);
      if (el.paused) el.play().catch(() => {});
    } else {
      if (!el.paused) el.pause();
      atRate(1);
      if (Math.abs(drift) > 0.02 || force) el.currentTime = desired;
    }
  }
  function syncMedia(t, playing, force) {
    if (state.tracking || state.exporting) return;
    const loc = locate(t);
    if (state.video.ready) {
      const onMain = !!(loc.clip && !loc.clip.asset);
      driveEl(els.video, onMain ? loc.src : null, playing && onMain, force, state.muted);
    }
    // other videos on the footage track: the one under the playhead runs, the rest wait
    const seen = new Set();
    for (const c of state.clips) {
      if (!c.asset || seen.has(c.asset)) continue;
      seen.add(c.asset);
      const a = assets.get(c.asset);
      if (!a || !a.ready) continue;
      const on = !!(loc.clip && loc.clip.asset === c.asset);
      a.el.volume = 1;
      driveEl(a.el, on ? loc.src : null, playing && on, force, state.muted);
    }
    for (const l of state.layers) {
      if (l.type !== 'media' || l.kind === 'image') continue;
      const a = assets.get(l.id);
      if (!a || !a.ready) continue;
      const active = !l.hidden && t >= l.start && t < l.end;
      const desired = active ? clamp((l.srcIn || 0) + (t - l.start), 0, Math.max(0, a.duration - 0.02)) : null;
      a.el.volume = clamp(l.volume == null ? 1 : l.volume, 0, 1);
      driveEl(a.el, desired, playing && active, force, state.muted || l.muted);
    }
  }
  /* Source time a media layer shows at timeline time t (null when it is not on). */
  function mediaSrcTime(l, t) {
    const a = assets.get(l.id);
    if (!a || t < l.start || t >= l.end) return null;
    return clamp((l.srcIn || 0) + (t - l.start), 0, Math.max(0, a.duration - 0.02));
  }
  const isMedia = (l) => !!(l && l.type === 'media');

  /* Load a file into an element for layer `id`. Resolves the asset once its size / length is known. */
  function loadAsset(id, file, kind) {
    const url = URL.createObjectURL(file);
    const el = kind === 'image' ? new Image() : document.createElement(kind);
    const asset = { id, kind, el, url, file, ready: false, width: 0, height: 0, duration: 0, poster: null };
    assets.set(id, asset);
    return new Promise((resolve, reject) => {
      const fail = () => { assets.delete(id); URL.revokeObjectURL(url); reject(new Error(`This browser cannot open ${file.name}`)); };
      if (kind === 'image') {
        el.onload = () => { asset.width = el.naturalWidth; asset.height = el.naturalHeight; asset.ready = true; asset.poster = url; resolve(asset); };
        el.onerror = fail;
        el.src = url;
        return;
      }
      el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.loop = false; el.muted = true;
      if (kind === 'video') el.playsInline = true;
      el.addEventListener('loadedmetadata', () => {
        watchVideoFrames(el);
        asset.width = el.videoWidth || 0; asset.height = el.videoHeight || 0;
        asset.duration = el.duration && isFinite(el.duration) ? el.duration : 10;
        asset.ready = true;
        resolve(asset);
        if (kind === 'video') posterFor(asset);
      }, { once: true });
      el.addEventListener('error', fail, { once: true });
      el.src = url;
      el.load();
    });
  }
  /* One small frame from the start of a video layer, for its bar on the timeline. */
  function posterFor(asset) {
    const el = asset.el;
    const grab = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 88; c.height = 50;
        c.getContext('2d').drawImage(el, 0, 0, 88, 50);
        asset.poster = c.toDataURL('image/jpeg', 0.6);
        renderTimeline();
      } catch (e) { /* not drawable yet */ }
    };
    if (el.readyState >= 2) grab(); else el.addEventListener('loadeddata', grab, { once: true });
  }
  /* Add a media file as a new layer at the playhead. */
  async function addMediaFile(file, kindHint) {
    if (!file) return;
    const type = file.type || '';
    const kind = kindHint || (type.startsWith('image/') ? 'image' : type.startsWith('audio/') ? 'audio' : 'video');
    const t = round(clock.time, 3);
    const name = file.name.replace(/\.[^.]+$/, '');
    const l = addLayer({
      type: 'media', kind, name, text: name, start: t, end: t + 5, srcIn: 0, muted: false, volume: 1, opacity: 1,
      fitWidth: kind === 'audio' ? 0 : 1.2, media: { fileName: file.name },
      transform: { x: 0, y: 0, z: kind === 'audio' ? 0 : 0.4, rx: 0, ry: 0, rz: 0, scale: 1 },
      split: 'whole',
      anim: { in: { type: 'fade', duration: 0.3, easing: 'easeOut', stagger: 0, fit: false, hold: 0 }, out: { type: 'fade', duration: 0.3, easing: 'easeIn', stagger: 0 }, loop: { type: 'none', speed: 1 } },
    }, { noClamp: true });
    toast(`Loading ${file.name}…`);
    try {
      const a = await loadAsset(l.id, file, kind);
      if (kind !== 'image') l.end = round(l.start + a.duration, 3);
      l.media = { fileName: file.name, width: a.width, height: a.height, duration: a.duration };
      commit();
      syncMedia(clock.time, clock.playing, true);
      refreshAll();
      toast(`${file.name} added as a ${kind} layer${kind !== 'audio' ? ' — drag it in the 3D layout to place it in depth' : ''}`);
    } catch (e) {
      state.layers = state.layers.filter((x) => x !== l);
      state.selectedIds = [];
      refreshAll();
      toast(e.message, true);
    }
  }
  /* Re-attach a file to a media layer whose file is not loaded (after opening a saved project). */
  async function relinkMedia(l, file) {
    if (!isMedia(l) || !file) return;
    try {
      const a = await loadAsset(l.id, file, l.kind);
      l.media = Object.assign({}, l.media, { fileName: file.name, width: a.width, height: a.height, duration: a.duration });
      renderer.dropMediaTexture(l.id);
      commit();
      syncMedia(clock.time, clock.playing, true);
      refreshAll();
      toast(`${file.name} linked to ${l.name}`);
    } catch (e) { toast(e.message, true); }
  }
  /* A copy of a layer's element, so a duplicate or a split piece can show a different moment. */
  function cloneAsset(fromId, toId) {
    const a = assets.get(fromId);
    if (!a) return;
    if (a.kind === 'image') { assets.set(toId, Object.assign({}, a, { id: toId })); return; }
    const el = document.createElement(a.kind);
    el.preload = 'auto'; el.crossOrigin = 'anonymous'; el.loop = false; el.muted = true;
    if (a.kind === 'video') el.playsInline = true;
    el.src = a.url;
    el.load();
    assets.set(toId, Object.assign({}, a, { id: toId, el }));
  }
  function releaseAsset(id) {
    const a = assets.get(id);
    if (a && a.el && a.el.pause) a.el.pause();
    renderer.dropMediaTexture(id);
    // the asset object itself is kept so undo can bring the layer back with its file
  }

  function updatePlayButton() {
    els.btnPlay.classList.toggle('playing', clock.playing);
  }

  /* ------------------------------------------------------------------ camera */
  function layerDepth(cam, l) {
    return renderer.viewDepth(cam, l.transform.x, l.transform.y, l.transform.z);
  }
  const planeZ = () => (state.media.locked ? 0 : (state.media.z || 0));
  function planeDepth(cam) {
    return Math.max(0.1, renderer.viewDepth(cam, state.media.x, state.media.y, planeZ()));
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
    const st = srcTime(t);
    if (st == null) return null;   // no footage under the playhead: nothing to mask
    const shape = maskShapeAt(st) || MASK_DEFAULT;
    return Object.assign({ enabled: true, roundness: state.mask.roundness, feather: state.mask.feather }, shape);
  }
  /* The mask key at the playhead, creating one from the current shape when there is none. */
  function maskKeyAtPlayhead() {
    const t = round(srcAtPlayhead(), 2);
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

  /* ---- motion tracks -----------------------------------------------------
   * A track follows something in the footage: a marked region (a box, a hand-drawn shape, or a single
   * point) is analysed frame by frame, giving a position in video-plane units, a size `s` relative to
   * the reference frame, and a rotation `r`. A word pinned to a track keeps its own transform as
   * OFFSETS from that point — rotated and scaled with it — so it rides the footage and grows as the
   * real camera closes in. */
  const TRACK_FIELDS = ['x', 'y', 's', 'r'];
  const TRACK_COLORS = [[1, 0.84, 0.2], [0.45, 0.9, 1], [1, 0.55, 0.65], [0.6, 1, 0.5], [0.85, 0.65, 1], [1, 0.7, 0.35]];
  const TRACK_MODES = { box: 'Box', poly: 'Shape', point: 'Point' };
  const getTrack = (id) => state.tracks.find((k) => k.id === id);
  const selectedTrack = () => getTrack(state.selectedTrackId);
  const trackOfKey = (id) => state.tracks.find((tr) => tr.keys.some((k) => k.id === id));
  const getTrackKey = (id) => { const tr = trackOfKey(id); return tr ? tr.keys.find((k) => k.id === id) : null; };
  const selectedTrackKey = () => getTrackKey(state.selectedTrackKeyId);
  const trackColorCss = (tr) => `rgb(${tr.color.map((c) => Math.round(c * 255)).join(',')})`;
  /* A polygon tracker is ready to analyse once it is closed; the others once they have been placed. */
  const trackReady = (tr) => (tr.mode === 'poly' ? !!(tr.closed && tr.ref.points && tr.ref.points.length >= 3) : !!tr.placed);

  function trackAt(id, t) {
    const tr = getTrack(id);
    if (!tr) return null;
    const st = srcTime(t);
    if (st == null) return null;
    const v = trackAtSource(tr, st);
    if (v.s == null) v.s = 1;
    if (v.r == null) v.r = 0;
    return v;
  }
  /* The raw track at a SOURCE time, with the tracker's stabilisation applied: a Gaussian window over
   * the neighbouring frames takes the measurement jitter off without lagging behind real motion. */
  function trackAtSource(tr, st) {
    const raw = Camera.evaluateOn(tr.keys, st, TRACK_FIELDS) || { x: tr.ref.x, y: tr.ref.y, s: 1, r: 0 };
    const amount = tr.smooth == null ? 0.3 : tr.smooth;
    if (amount <= 0.01 || !trackIsAuto(tr)) return raw;
    const sigma = amount * 6;                          // frames; 100 % ≈ ±6 frames
    const N = Math.min(12, Math.ceil(sigma * 2));
    const out = { x: 0, y: 0, s: 0, r: 0 };
    let wsum = 0;
    for (let k = -N; k <= N; k++) {
      const w = Math.exp(-(k * k) / (2 * sigma * sigma));
      const v = Camera.evaluateOn(tr.keys, st + k * Tracker.STEP, TRACK_FIELDS);
      if (!v) continue;
      out.x += w * v.x; out.y += w * v.y; out.s += w * (v.s == null ? 1 : v.s); out.r += w * (v.r || 0);
      wsum += w;
    }
    if (!wsum) return raw;
    return { x: out.x / wsum, y: out.y / wsum, s: out.s / wsum, r: out.r / wsum };
  }
  /* The tracked point in world units at time t, with the factor and angle a pinned word inherits. */
  function anchorAt(id, t) {
    const pt = trackAt(id, t);
    if (!pt) return null;
    const m = state.media;
    return {
      x: m.x + pt.x * renderer.aspect * m.scale, y: m.y + pt.y * m.scale,
      k: Math.max(0.05, pt.s * m.scale), s: pt.s, deg: pt.r,
    };
  }
  function isPinned(l) { return !!(l.track && l.track.id && getTrack(l.track.id)); }
  const followsRotation = (l) => !!(l.track && l.track.rotate);
  /* The transform a layer is actually drawn with at time t (its own transform unless it is pinned). */
  function effectiveTransform(l, t) {
    const tr = l.transform;
    if (!isPinned(l)) return tr;
    const a = anchorAt(l.track.id, t == null ? clock.time : t);
    if (!a) return tr;
    const deg = followsRotation(l) ? a.deg : 0;
    const rad = (deg * Math.PI) / 180, c = Math.cos(rad), sn = Math.sin(rad);
    return {
      x: a.x + (c * tr.x - sn * tr.y) * a.k,
      y: a.y + (sn * tr.x + c * tr.y) * a.k,
      z: tr.z + planeZ(), rx: tr.rx, ry: tr.ry, rz: tr.rz + deg, scale: tr.scale * a.k,
    };
  }
  /* Pin a layer to a track (or unpin with null) without letting it move on screen at time t. */
  function pinLayer(l, trackId, t) {
    const abs = effectiveTransform(l, t);
    const rotate = l.track ? l.track.rotate : true;
    l.track = { id: trackId && getTrack(trackId) ? trackId : null, rotate: rotate == null ? true : rotate };
    if (!l.track.id) {
      Object.assign(l.transform, { x: round(abs.x, 4), y: round(abs.y, 4), z: round(abs.z, 4), rz: round(abs.rz, 3), scale: round(abs.scale, 4) });
      return;
    }
    const a = anchorAt(trackId, t);
    const deg = followsRotation(l) ? a.deg : 0;
    const rad = (-deg * Math.PI) / 180, c = Math.cos(rad), sn = Math.sin(rad);
    const dx = (abs.x - a.x) / a.k, dy = (abs.y - a.y) / a.k;
    l.transform.x = round(c * dx - sn * dy, 4);
    l.transform.y = round(sn * dx + c * dy, 4);
    l.transform.z = round(abs.z - planeZ(), 4);
    l.transform.rz = round(abs.rz - deg, 3);
    l.transform.scale = round(abs.scale / a.k, 4);
  }
  let nextTrack = 1;
  function newTrack(mode) {
    const color = TRACK_COLORS[(state.tracks.length) % TRACK_COLORS.length];
    const t = round(srcAtPlayhead(), 3);
    const tr = {
      id: `T${nextTrack++}_${Math.random().toString(36).slice(2, 6)}`,
      name: `Tracker ${state.tracks.length + 1}`, color,
      mode: mode || 'box',       // box | poly | point
      ref: { t, x: 0, y: 0, w: 0.14, h: 0.12, points: [] },
      closed: false,             // polygon finished
      keys: [Camera.defaultKey(t, { x: 0, y: 0, s: 1, r: 0, manual: true, easing: 'linear' })],
      lost: null,
      placed: false,             // until placed on the preview, placing moves the reference frame itself
      smooth: 0.3,               // stabilisation of the analysed track (0 = raw)
    };
    state.tracks.push(tr);
    return tr;
  }
  const trackIsAuto = (tr) => tr.keys.filter((k) => !k.manual).length > 2;
  /* The tracker key at the playhead, creating one from the interpolated position when there is none. */
  function trackKeyAtPlayhead(tr) {
    const t = round(srcAtPlayhead(), 3);
    const tol = trackIsAuto(tr) ? Tracker.STEP * 0.51 : 0.05;
    let key = tr.keys.find((k) => Math.abs(k.t - t) <= tol);
    let created = false;
    if (!key) {
      const pt = Camera.evaluateOn(tr.keys, t, TRACK_FIELDS) || { x: tr.ref.x, y: tr.ref.y, s: 1, r: 0 };
      if (pt.s == null) pt.s = 1;
      if (pt.r == null) pt.r = 0;
      key = Camera.defaultKey(t, { x: pt.x, y: pt.y, s: pt.s, r: pt.r, manual: true, easing: 'linear' });
      created = true;
      if (!tr.placed) {
        // a tracker that has not been placed yet simply moves its reference frame to the playhead
        tr.keys = [key];
        tr.ref.t = t;
      } else tr.keys = Camera.sorted(tr.keys.concat([key]));
    }
    return { key, created };
  }
  /* Nudge a track at time t by (dx, dy) in plane units, a size factor ds and a rotation dr. On an
   * analysed track the correction is blended into the neighbouring frames so one fix leaves no spike. */
  function correctTrack(tr, key, dx, dy, ds, dr) {
    key.manual = true;
    const auto = trackIsAuto(tr);
    const manualTimes = tr.keys.filter((k) => k.manual && k !== key).map((k) => k.t);
    const before = Math.max(-Infinity, ...manualTimes.filter((x) => x < key.t)), after = Math.min(Infinity, ...manualTimes.filter((x) => x > key.t));
    const spanL = Math.min(1.2, key.t - before), spanR = Math.min(1.2, after - key.t);
    for (const k of tr.keys) {
      let w = 1;
      if (k !== key) {
        if (!auto || k.manual) continue;
        const d = k.t - key.t;
        w = d < 0 ? 1 - Math.abs(d) / Math.max(0.01, spanL) : 1 - d / Math.max(0.01, spanR);
        if (w <= 0) continue;
      }
      k.x = round(clamp(k.x + dx * w, -1.5, 1.5), 4);
      k.y = round(clamp(k.y + dy * w, -1.5, 1.5), 4);
      if (ds && ds !== 1) k.s = round(clamp((k.s == null ? 1 : k.s) * Math.pow(ds, w), 0.1, 8), 4);
      if (dr) k.r = round((k.r || 0) + dr * w, 3);
    }
  }

  /* ---- the marked shape, carried by the track ---------------------------
   * Plane x is in half-width units and y in half-height units, so a rotation has to be applied in a
   * common unit: x is converted to half-height units, rotated, and converted back. */
  function trackShapeAt(tr, t) {
    const pt = trackAt(tr.id, t) || { x: tr.ref.x, y: tr.ref.y, s: 1, r: 0 };
    const A = Math.max(0.01, renderer.aspect);
    const rad = (pt.r * Math.PI) / 180, c = Math.cos(rad) * pt.s, sn = Math.sin(rad) * pt.s;
    const map = (p) => {
      const dx = (p.x - tr.ref.x) * A, dy = p.y - tr.ref.y;
      return { x: pt.x + (c * dx - sn * dy) / A, y: pt.y + (sn * dx + c * dy) };
    };
    const anchor = { x: pt.x, y: pt.y };
    if (tr.mode === 'poly') {
      const pts = (tr.ref.points || []).map(map);
      return { anchor, pts, closed: !!tr.closed, handles: pts, marks: cross(anchor, 0.02 * pt.s, A) };
    }
    if (tr.mode === 'point') {
      const r = 0.035 * pt.s;
      return { anchor, pts: circle(anchor, r, A), closed: true, handles: [anchor], marks: cross(anchor, r * 1.7, A) };
    }
    const hw = tr.ref.w / 2, hh = tr.ref.h / 2;
    const corners = [
      { x: tr.ref.x - hw, y: tr.ref.y - hh }, { x: tr.ref.x + hw, y: tr.ref.y - hh },
      { x: tr.ref.x + hw, y: tr.ref.y + hh }, { x: tr.ref.x - hw, y: tr.ref.y + hh },
    ].map(map);
    return { anchor, pts: corners, closed: true, handles: corners, marks: cross(anchor, Math.min(hw, hh) * 0.7 * pt.s, A) };
  }
  const cross = (c, r, A) => [
    [{ x: c.x - r / A, y: c.y }, { x: c.x + r / A, y: c.y }],
    [{ x: c.x, y: c.y - r }, { x: c.x, y: c.y + r }],
  ];
  function circle(c, r, A) {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      pts.push({ x: c.x + (Math.cos(a) * r) / A, y: c.y + Math.sin(a) * r });
    }
    return pts;
  }
  /* Outlines drawn over the footage while a tracker is being placed or looked at. */
  function trackOutlines(t) {
    if (state.exporting) return [];
    const out = [];
    for (const sg of state.suggestions || []) {
      const hw = sg.w / 2, hh = sg.h / 2;
      out.push({ id: 'suggestion', closed: true, color: [1, 1, 1, 0.8], anchor: { x: sg.x, y: sg.y }, handles: [],
        pts: [{ x: sg.x - hw, y: sg.y - hh }, { x: sg.x + hw, y: sg.y - hh }, { x: sg.x + hw, y: sg.y + hh }, { x: sg.x - hw, y: sg.y + hh }] });
    }
    if (!state.tracks.length) return out;
    for (const tr of state.tracks) {
      const sel = tr.id === state.selectedTrackId;
      if (!sel && !state.trackEdit) continue;
      const sh = trackShapeAt(tr, t);
      const alpha = sel ? 0.95 : 0.3;
      out.push({
        id: tr.id, pts: sh.pts, closed: sh.closed, marks: sh.marks,
        handles: sel && state.trackEdit ? sh.handles : [], anchor: sh.anchor,
        color: tr.color.concat([alpha]),
      });
    }
    return out;
  }

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
  const fitDolly = () => round(renderer.camDist * (1 - state.media.scale) - planeZ(), 3);

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
    els.guides.style.width = els.canvas.style.width; els.guides.style.height = els.canvas.style.height;
    els.guides.width = Math.round(w * dpr); els.guides.height = Math.round(h * dpr);
    invalidate();
  }

  /* Alignment guides over the preview while words are dragged: the frame's centre lines, lines through
   * the moving words, and a green line whenever they line up with another word's centre or edge. */
  let previewGuide = null;   // { ids, axis } during a move drag
  const GUIDE_C = 'rgba(242,140,40,0.8)', ALIGN_C = 'rgba(120,230,160,0.95)', CENTRE_C = 'rgba(255,255,255,0.25)';
  function layerScreenBox(id) {
    const entry = renderer.lastQuads.find((q) => q.layerId === id);
    if (!entry) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of entry.quads) for (const p of q) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    if (!isFinite(x0)) return null;
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function clearPreviewGuides() {
    const g = els.guides;
    g.getContext('2d').clearRect(0, 0, g.width, g.height);
    g.classList.add('hidden');
  }
  function drawPreviewGuides() {
    const g = els.guides, c = g.getContext('2d');
    const W = g.width, H = g.height;
    if (!W || !H) return;
    const k = W / Math.max(1, els.canvas.width);   // renderer buffer px -> overlay px
    c.clearRect(0, 0, W, H);
    g.classList.remove('hidden');
    const ids = previewGuide.ids;
    let box = null;
    for (const id of ids) {
      const b = layerScreenBox(id);
      if (!b) continue;
      box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
    }
    if (!box) return;
    const mine = { x: [(box.x0 + box.x1) / 2 * k, box.x0 * k, box.x1 * k], y: [(box.y0 + box.y1) / 2 * k, box.y0 * k, box.y1 * k] };
    const cx = mine.x[0], cy = mine.y[0];
    const dpr = W / Math.max(1, g.clientWidth || W);
    const tol = 4 * dpr;
    const line = (x0, y0, x1, y1, colour, width, dash) => { c.strokeStyle = colour; c.lineWidth = width; c.setLineDash(dash || []); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]); };
    const label = (text, x, y, colour) => { c.fillStyle = colour; c.font = `${11 * dpr}px Inter, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(text, x, y); };
    const axis = previewGuide.axis;
    // the frame's centre lines light up when the words are centred
    const onX = Math.abs(cx - W / 2) <= tol, onY = Math.abs(cy - H / 2) <= tol;
    line(W / 2, 0, W / 2, H, onX ? ALIGN_C : CENTRE_C, (onX ? 1.5 : 1) * dpr, onX ? null : [3 * dpr, 5 * dpr]);
    line(0, H / 2, W, H / 2, onY ? ALIGN_C : CENTRE_C, (onY ? 1.5 : 1) * dpr, onY ? null : [3 * dpr, 5 * dpr]);
    if (onX) label('centred', W / 2 + 5 * dpr, 6 * dpr, ALIGN_C);
    if (onY) label('centred', 6 * dpr, H / 2 + 5 * dpr, ALIGN_C);
    // lines through the moving words; with Shift only the path they are held to
    if (axis !== 'x') line(cx, 0, cx, H, GUIDE_C, (axis === 'y' ? 1.8 : 1) * dpr, [5 * dpr, 4 * dpr]);
    if (axis !== 'y') line(0, cy, W, cy, GUIDE_C, (axis === 'x' ? 1.8 : 1) * dpr, [5 * dpr, 4 * dpr]);
    // alignment with other words: centres and edges
    for (const entry of renderer.lastQuads) {
      if (ids.includes(entry.layerId)) continue;
      const o = layerScreenBox(entry.layerId);
      if (!o) continue;
      for (const ox of [o.cx, o.x0, o.x1].map((v) => v * k)) if (mine.x.some((mx) => Math.abs(mx - ox) <= tol)) line(ox, 0, ox, H, ALIGN_C, 1.3 * dpr);
      for (const oy of [o.cy, o.y0, o.y1].map((v) => v * k)) if (mine.y.some((my) => Math.abs(my - oy) <= tol)) line(0, oy, W, oy, ALIGN_C, 1.3 * dpr);
    }
  }

  function mediaForRender() {
    return { scale: state.media.scale, x: state.media.x, y: state.media.y, z: state.media.z || 0, opacity: state.media.opacity == null ? 1 : state.media.opacity, locked: !!state.media.locked, bg: hexToRgb01(state.media.bg) };
  }

  function draw(time) {
    renderer.fovDeg = state.fov;
    renderer.render(Object.assign(videoForRender(time), {
      layers: state.layers,
      time,
      frameHeightPx: els.canvas.height,
      selectedIds: state.exporting ? [] : state.selectedIds,
      camera: cameraAt(time),
      media: mediaForRender(),
      mask: maskForRender(time),
      showMask: !state.exporting && state.mask.enabled && state.mask.show,
      trackTransform: (l) => (isPinned(l) ? effectiveTransform(l, time) : null),
      outlines: trackOutlines(time),
      mediaFor: (l) => assets.get(l.id) || null,
    }));
  }
  /* The footage under the playhead: the main video or another piece on the footage track. */
  function videoForRender(time) {
    const loc = locate(time);
    const c = loc.clip;
    if (!c || !clipReady(c)) return { video: null, videoReady: false, videoVisible: false, videoAspect: null };
    const el = clipEl(c), src = clipSource(c);
    // The frame counter is only trusted while the clip is actually running. Scrubbing and export seek
    // the element and draw immediately, before it has announced the new frame, so there the picture is
    // re-read every time rather than risking a repeat of the one before.
    const live = !!(el && !el.paused && !state.exporting);
    return { video: el, videoReady: !!(el && el.readyState >= 2), videoVisible: true, videoFrameId: live ? el.__frameId : null, videoAspect: src && src.width && src.height ? src.width / src.height : null };
  }

  function frame(now) {
    if (!state.exporting && !state.tracking) {   // while a tracker runs, the frame budget belongs to it
      clock.tick(now);
      if (clock.playing || needsRender) {
        needsRender = false;
        if (state.view !== 'layout') { draw(clock.time); if (previewGuide) drawPreviewGuides(); }
        updateTimeUI();
        if (layoutVisible()) layoutView.draw();
      }
    }
    requestAnimationFrame(frame);
  }

  /* Written every frame while the clip plays, so each field is only touched when it really changed —
   * a stray innerHTML or style write costs a layout and shows up as uneven motion. */
  const shown = { cur: '', total: '', x: null, hidden: null, cam: '' };
  function updateTimeUI() {
    const t = clock.time, T = duration();
    const cur = fmtTime(t), total = fmtTime(playEnd());
    if (cur !== shown.cur) { els.timeCur.textContent = cur; shown.cur = cur; }
    if (total !== shown.total) { els.timeTotal.textContent = total; shown.total = total; }
    const trackW = tlWidth();
    const namesW = 150;
    if (clock.playing) followPlayhead(t);
    const x = (t / Math.max(0.001, T)) * trackW - tl.scroll;
    const left = Math.round(namesW + x);
    if (left !== shown.x) { els.playhead.style.left = `${left}px`; shown.x = left; }
    const hide = x < -1 || x > tlVisible() + 1;
    if (hide !== shown.hidden) { els.playhead.classList.toggle('hidden', hide); shown.hidden = hide; }
    const cam = cameraAt(t);
    const zoom = (renderer.camDist * state.media.scale) / planeDepth(cam);
    const readout = `Camera ${cam.z.toFixed(2)} from video · footage ${Math.round(zoom * 100)}%`;
    if (readout !== shown.cam) { els.camReadout.textContent = readout; shown.cam = readout; }
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
    if (!opts.noClamp) {
      l.start = clamp(l.start, 0, Math.max(0, duration() - 0.1));
      l.end = clamp(l.end, l.start + 0.1, duration());
    }
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
    if (state.selectedClipId && !state.selectedIds.length && !state.selectedKeyId && !state.selectedMaskKeyId && !state.selectedTrackKeyId) {
      if (!deleteClip(state.selectedClipId)) return;
      commit();
      refreshAll();
      return;
    }
    if (state.selectedTrackKeyId) {
      const tr = trackOfKey(state.selectedTrackKeyId);
      if (tr) tr.keys = tr.keys.filter((k) => k.id !== state.selectedTrackKeyId);
      state.selectedTrackKeyId = null;
      if (tr && !tr.keys.length) tr.keys = [Camera.defaultKey(tr.ref.t, { x: tr.ref.x, y: tr.ref.y, s: 1, manual: true, easing: 'linear' })];
      syncTrackControls();
    } else if (state.selectedMaskKeyId) {
      state.mask.keys = state.mask.keys.filter((k) => k.id !== state.selectedMaskKeyId);
      state.selectedMaskKeyId = null;
      if (!state.mask.keys.length) { state.mask.enabled = false; syncMaskControls(); toast('Last mask key removed — the subject mask is off'); }
    } else if (state.selectedKeyId) {
      state.camera.keys = state.camera.keys.filter((k) => k.id !== state.selectedKeyId);
      state.selectedKeyId = null;
    } else if (state.selectedIds.length) {
      const ids = new Set(state.selectedIds);
      for (const l of state.layers) if (ids.has(l.id) && isMedia(l)) releaseAsset(l.id);
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
      if (isMedia(l)) cloneAsset(l.id, copy.id);
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
    state.selectedTrackKeyId = null;
    if (id) state.selectedClipId = null;
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
    state.selectedTrackKeyId = null;
    state.selectedClipId = null;
    state.selectedKeyId = id;
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectMaskKey(id) {
    state.selectedIds = [];
    state.selectedKeyId = null;
    state.selectedTrackKeyId = null;
    state.selectedClipId = null;
    state.selectedMaskKeyId = id;
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectTrackKey(id) {
    state.selectedIds = [];
    state.selectedKeyId = null;
    state.selectedMaskKeyId = null;
    state.selectedClipId = null;
    state.selectedTrackKeyId = id;
    const tr = trackOfKey(id);
    if (tr) state.selectedTrackId = tr.id;
    syncTrackControls();
    refreshInspector();
    renderTimeline();
    invalidate();
  }
  function selectTrack(id) {
    state.selectedTrackId = id;
    if (!id) state.trackEdit = false;
    syncTrackControls();
    invalidate();
  }
  function selectAll() {
    state.selectedKeyId = null;
    state.selectedMaskKeyId = null;
    state.selectedTrackKeyId = null;
    state.selectedIds = state.layers.map((l) => l.id);
    refreshInspector();
    renderTimeline();
    invalidate();
  }

  function snapshot() {
    return JSON.stringify({ layers: state.layers, camera: state.camera, media: state.media, mask: state.mask, tracks: state.tracks, clips: state.clips, selectedIds: state.selectedIds, selectedKeyId: state.selectedKeyId, selectedMaskKeyId: state.selectedMaskKeyId, selectedTrackId: state.selectedTrackId }, stripper);
  }
  function commit() {
    const snap = snapshot();
    if (snap === state.lastCommitted) return;
    if (state.lastCommitted != null) state.undo.push(state.lastCommitted);
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    state.lastCommitted = snap;
    updateUndoButtons();
    scheduleAutosave();
  }
  function restore(snap) {
    const data = JSON.parse(snap);
    state.layers = data.layers;
    state.camera = Object.assign(defaultCamera(), data.camera || {});
    state.media = Object.assign(defaultMedia(), data.media || {});
    state.mask = Object.assign(defaultMask(), data.mask || {});
    state.tracks = data.tracks || [];
    if (data.clips && data.clips.length) { state.clips = data.clips.filter((c) => (c.asset ? assets.has(c.asset) : state.video.ready)); afterClipsChanged(); }
    state.selectedTrackId = getTrack(data.selectedTrackId) ? data.selectedTrackId : null;
    state.selectedTrackKeyId = null;
    if (!state.selectedTrackId) state.trackEdit = false;
    state.selectedIds = (data.selectedIds || []).filter((id) => getLayer(id));
    state.selectedKeyId = getKey(data.selectedKeyId) ? data.selectedKeyId : null;
    state.selectedMaskKeyId = getMaskKey(data.selectedMaskKeyId) ? data.selectedMaskKeyId : null;
    state.lastCommitted = snap;
    syncCameraControls();
    syncMediaControls();
    syncMaskControls();
    syncTrackControls();
    refreshAll();
    scheduleAutosave();
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

  /* Timeline zoom. Every track draws into a `.tl-inner` strip that is `tlWidth()` px wide and shifted
   * left by the scroll, so the whole open timeline can be seen at once or zoomed into. */
  const tl = { zoom: null, scroll: 0 };   // zoom: px per second, null = fit the whole timeline in view
  /* Width of the track area. Measuring forces layout, so it is measured when the timeline is built or
   * resized rather than on every frame of playback. */
  let rulerW = 0;
  function measureTimeline() { rulerW = els.ruler.clientWidth || rulerW || 600; return rulerW; }
  const tlVisible = () => rulerW || measureTimeline();
  function tlWidth() { const vis = tlVisible(); return tl.zoom ? Math.max(vis, tl.zoom * duration()) : vis; }
  function tlInner(host) {
    let inner = host.firstElementChild;
    if (!inner || !inner.classList.contains('tl-inner')) { inner = document.createElement('div'); inner.className = 'tl-inner'; host.textContent = ''; host.appendChild(inner); }
    return inner;
  }
  function applyTimelineZoom() {
    const W = tlWidth(), vis = tlVisible();
    tl.scroll = clamp(tl.scroll, 0, Math.max(0, W - vis));
    els.timeline.style.setProperty('--tl-w', `${W}px`);
    els.timeline.style.setProperty('--tl-off', `${-tl.scroll}px`);
    const sc = $('#tlScroll');
    if (sc) {
      sc.firstElementChild.style.width = `${W}px`;
      sc.classList.toggle('hidden', W <= vis + 1);
      if (Math.abs(sc.scrollLeft - tl.scroll) > 1) sc.scrollLeft = tl.scroll;
    }
  }
  /* z = px per second (null fits everything); anchorPx keeps the moment under that x where it is. */
  function setTimelineZoom(z, anchorPx) {
    const vis = measureTimeline(), fitZoom = vis / duration();
    const before = tl.zoom || fitZoom;
    const tAtAnchor = anchorPx != null ? (tl.scroll + anchorPx) / before : null;
    tl.zoom = z != null && z > fitZoom * 1.001 ? Math.min(z, 400) : null;
    const after = tl.zoom || fitZoom;
    if (tAtAnchor != null) tl.scroll = tAtAnchor * after - anchorPx;
    applyTimelineZoom();
    renderTimeline();
  }
  /* Keep the playhead in view while it moves. */
  function followPlayhead(t) {
    if (!tl.zoom) return;
    const W = tlWidth(), vis = tlVisible();
    const x = (t / duration()) * W;
    if (x < tl.scroll || x > tl.scroll + vis - 2) { tl.scroll = clamp(x - vis * 0.15, 0, W - vis); applyTimelineZoom(); }
  }
  els.timeline.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = els.ruler.getBoundingClientRect();
      const anchor = clamp(e.clientX - rect.left, 0, rect.width);
      setTimelineZoom((tl.zoom || tlVisible() / duration()) * Math.exp(-e.deltaY * 0.002), anchor);
    } else if (tl.zoom && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
      e.preventDefault();
      tl.scroll += e.deltaX || e.deltaY;
      applyTimelineZoom();
      updateTimeUI();
    }
  }, { passive: false });
  $('#tlZoomIn').addEventListener('click', () => setTimelineZoom((tl.zoom || tlVisible() / duration()) * 1.6, tlVisible() / 2));
  $('#tlZoomOut').addEventListener('click', () => setTimelineZoom((tl.zoom || tlVisible() / duration()) / 1.6, tlVisible() / 2));
  $('#tlZoomFit').addEventListener('click', () => setTimelineZoom(null));
  $('#tlScroll').addEventListener('scroll', (e) => { const sc = e.target.scrollLeft; if (Math.abs(sc - tl.scroll) > 1) { tl.scroll = sc; applyTimelineZoom(); updateTimeUI(); } });

  function renderRuler() {
    const W = tlWidth(), T = duration();
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
    // past the end of the content the timeline is open room
    html += `<div class="tl-after" style="left:${(playEnd() / T) * 100}%"><span>end</span></div>`;
    tlInner(els.ruler).innerHTML = html;
  }

  function barStyle(l) {
    const T = duration();
    return `left:${(l.start / T) * 100}%; width:${Math.max(0.2, ((l.end - l.start) / T) * 100)}%`;
  }
  function animShade(l) {
    const dur = l.end - l.start;
    const n = (l._layout && l._layout.groups.length) || 1;
    const inW = clamp(((l.anim.in.duration + Anim.staggerFor(l, dur, n) * (n - 1)) / dur) * 100, 0, 100);
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
    tlInner(els.camTrack).innerHTML = html;
  }

  /* A span [a, b] in SOURCE time drawn on the timeline: one bar per clip that shows part of it. */
  function sourceSpanBars(a, b, cls, style) {
    const T = duration();
    if (!state.clips.length) return `<div class="${cls}" style="left:${(a / T) * 100}%; width:${Math.max(0.2, ((b - a) / T) * 100)}%; ${style}"></div>`;
    let html = '';
    for (const c of state.clips) {
      if (c.asset) continue;
      const lo = Math.max(a, c.in), hi = Math.min(b, c.out);
      if (hi > lo) html += `<div class="${cls}" style="left:${((c.start + lo - c.in) / T) * 100}%; width:${Math.max(0.2, ((hi - lo) / T) * 100)}%; ${style}"></div>`;
    }
    return html;
  }
  /* A key at SOURCE time drawn wherever that moment appears on the timeline. */
  function sourceKeyDiamonds(k, cls, title) {
    const T = duration();
    return timelineTimesOf(k.t).map((tt) => `<div class="tl-key ${cls}" data-id="${k.id}" style="left:${(tt / T) * 100}%" title="${title}"></div>`).join('');
  }

  function renderMaskTrack() {
    $('#tlMask').classList.toggle('hidden', !state.mask.enabled);
    if (!state.mask.enabled) return;
    const keys = Camera.sorted(state.mask.keys);
    let html = '';
    if (keys.length > 1) html += sourceSpanBars(keys[0].t, keys[keys.length - 1].t, 'tl-key-line', '');
    for (const k of keys) html += sourceKeyDiamonds(k, k.id === state.selectedMaskKeyId ? 'selected' : '', `${fmtTime(k.t)} · ${Math.round(k.w * 100)}×${Math.round(k.h * 100)}`);
    tlInner($('#maskTrack')).innerHTML = html;
  }

  function renderVideoTrack() {
    const host = $('#videoTrack');
    if (!host) return;
    $('#tlVideo').classList.toggle('hidden', !hasFootage());
    $('#btnSplit').classList.toggle('hidden', !hasFootage());
    if (!state.clips.length) { tlInner(host).innerHTML = ''; return; }
    const T = duration();
    const trackW = tlWidth();
    let html = '';
    state.clips.forEach((c, i) => {
      const len = clipLen(c);
      const left = (c.start / T) * 100, width = (len / T) * 100;
      const pxW = (len / T) * trackW;
      const src = clipSource(c), ready = clipReady(c);
      // thumbnails whose source time falls inside this piece, spaced by time
      const vw = c.asset ? (src ? src.width : 16) : state.video.width, vh = c.asset ? (src ? src.height : 9) : state.video.height;
      const thumbH = 34, thumbW = Math.round((thumbH * vw) / Math.max(1, vh));
      const list = c.asset ? ((src && src.thumbs) || []) : (state.video.thumbs || []);
      const thumbs = list.filter((th) => th.t >= c.in && th.t <= c.out)
        .map((th) => `<img src="${th.url}" style="left:${Math.round(((th.t - c.in) / len) * pxW - thumbW / 2)}px" alt="">`).join('');
      const name = clipName(c);
      html += `<div class="tl-clip${c.id === state.selectedClipId ? ' selected' : ''}${c.asset ? ' other' : ''}${ready ? '' : ' missing'}" data-id="${c.id}" style="left:${left}%; width:${width}%" title="${escapeHtml(name)} · ${fmtTime(c.in)} – ${fmtTime(c.out)} (${fmtTime(len)}) at ${fmtTime(c.start)} — drag to move, drag the ends to trim">
        <div class="thumbs">${thumbs}</div>
        <span class="lbl">${state.clips.length > 1 ? `${i + 1} · ` : ''}${c.asset ? escapeHtml(name) + ' · ' : ''}${ready ? `${fmtTime(c.in)}–${fmtTime(c.out)}` : 'file not loaded'}</span>
        <div class="h l"></div><div class="h r"></div></div>`;
    });
    tlInner(host).innerHTML = html;
  }

  function renderTrackRows() {
    const host = $('#tlTracks');
    let html = '';
    for (const tr of state.tracks) {
      const keys = Camera.sorted(tr.keys);
      const col = trackColorCss(tr);
      let row = '';
      if (keys.length > 1) row += sourceSpanBars(keys[0].t, keys[keys.length - 1].t, 'tl-span', `background:${col}`);
      for (const k of keys) {
        if (!k.manual && trackIsAuto(tr)) continue;   // analysed frames are the bar; only hand-set keys are diamonds
        const isRef = Math.abs(k.t - tr.ref.t) < 1e-3;
        row += sourceKeyDiamonds(k, `${k.id === state.selectedTrackKeyId ? 'selected' : ''}${isRef ? ' ref' : ''}`, `${fmtTime(k.t)} · ${isRef ? 'reference frame' : 'correction'} · size ${Math.round((k.s || 1) * 100)}%`);
      }
      html += `<div class="tl-trk${tr.id === state.selectedTrackId ? ' selected' : ''}" data-id="${tr.id}">
        <div class="tl-name" title="${escapeHtml(tr.name)} — click to edit, double-click the track to add a correction key"><i class="sw" style="background:${col}"></i><span class="nm">${escapeHtml(tr.name)}</span></div>
        <div class="tl-track"><div class="tl-inner">${row}</div></div></div>`;
    }
    host.innerHTML = html;
  }

  function renderTimeline() {
    measureTimeline();
    applyTimelineZoom();
    renderRuler();
    renderVideoTrack();
    renderCameraTrack();
    renderMaskTrack();
    renderTrackRows();
    const rows = state.layers.slice().reverse();
    els.tlEmpty.classList.toggle('hidden', rows.length > 0);
    $('#layerCount').textContent = rows.length ? `(${rows.length})` : '';
    $$('.tl-row', els.tlBody).forEach((r) => r.remove());
    const primary = state.selectedIds[0];
    for (const l of rows) {
      const row = document.createElement('div');
      const sel = isSelected(l.id);
      const media = isMedia(l);
      const asset = media ? assets.get(l.id) : null;
      row.className = `tl-row${sel ? ' selected' : ''}${sel && l.id !== primary ? ' secondary' : ''}${l.hidden ? ' hidden-layer' : ''}${media ? ` media-row kind-${l.kind}` : ''}`;
      row.dataset.id = l.id;
      const { inW, outW } = animShade(l);
      const kindIcon = media ? (l.kind === 'audio' ? '♪' : l.kind === 'image' ? '▣' : '▶') : '';
      const poster = asset && asset.poster ? `<img class="poster" src="${asset.poster}" alt="">` : '';
      const label = media ? `${escapeHtml(l.name || 'Media')}${asset ? '' : ' · file not loaded — Relink in the inspector'}` : escapeHtml((l.text || '').replace(/\n/g, ' '));
      row.innerHTML = `
        <div class="tl-name">
          <button class="tl-eye" title="Show / hide">${l.hidden ? EYE_OFF : EYE_ON}</button>
          ${media ? `<span class="kind">${kindIcon}</span>` : ''}
          <span class="nm">${escapeHtml(l.name || l.text || 'Text')}</span>
        </div>
        <div class="tl-track"><div class="tl-inner">
          <div class="tl-bar${poster ? ' has-poster' : ''}${media && !asset ? ' missing' : ''}" style="${barStyle(l)}">
            ${poster}
            <div class="anim-in" style="width:${inW}%"></div>
            <div class="anim-out" style="width:${outW}%"></div>
            <span>${label}</span>
            <div class="h l"></div><div class="h r"></div>
          </div>
        </div></div>`;
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
    const pxPerSec = () => tlWidth() / duration();
    const timeFromEvent = (e) => {
      const rect = tlInner(els.ruler).getBoundingClientRect();
      return clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * duration(), 0, duration());
    };
    const snapTargets = (excludeIds, excludeClipId) => {
      const targets = [clock.time, 0, playEnd()];
      state.layers.forEach((o) => { if (!excludeIds.has(o.id)) targets.push(o.start, o.end); });
      state.clips.forEach((c) => { if (c.id !== excludeClipId) targets.push(c.start, clipEnd(c)); });
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

    // Video pieces: click selects, dragging the body moves, the edges trim, double-click splits
    const videoTrack = $('#videoTrack');
    videoTrack.addEventListener('pointerdown', (e) => {
      const clipNode = e.target.closest('.tl-clip');
      if (!clipNode) { clock.time = timeFromEvent(e); drag = { mode: 'scrub' }; videoTrack.setPointerCapture(e.pointerId); return; }
      const c = state.clips.find((x) => x.id === clipNode.dataset.id);
      if (!c) return;
      if (state.selectedClipId !== c.id) { state.selectedClipId = c.id; select(null); renderVideoTrack(); }
      if (e.target.classList.contains('h')) drag = { mode: e.target.classList.contains('l') ? 'clipL' : 'clipR', id: c.id, x0: e.clientX, in0: c.in, out0: c.out, start0: c.start, moved: false };
      else drag = { mode: 'clipMove', id: c.id, x0: e.clientX, start0: c.start, moved: false };
      videoTrack.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    videoTrack.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.tl-clip') || e.target.classList.contains('h')) return;
      clock.time = timeFromEvent(e);
      if (splitClipAt(clock.time)) { commit(); renderTimeline(); toast('Split — drag a piece to move it, drag its ends to trim, Delete removes it'); }
    });
    videoTrack.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode !== 'clipL' && drag.mode !== 'clipR' && drag.mode !== 'clipMove') return;
      const c = state.clips.find((x) => x.id === drag.id);
      if (!c) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      const D = clipSrcDuration(c);
      const i = state.clips.indexOf(c);
      const prev = state.clips[i - 1], next = state.clips[i + 1];
      if (drag.mode === 'clipMove') {
        const targets = snapTargets(new Set(), c.id);
        const len = clipLen(c);
        let s = Math.max(0, drag.start0 + dt);
        const a = snap(s, targets), b = snap(s + len, targets);
        if (a !== s) s = a; else if (b !== s + len) s = b - len;
        c.start = round(Math.max(0, s), 3);
      } else if (drag.mode === 'clipL') {
        // the tail stays put: trimming the head moves the start with it
        const minIn = Math.max(0, drag.in0 - drag.start0 + (prev ? clipEnd(prev) : 0));
        c.in = round(clamp(drag.in0 + dt, minIn, c.out - 0.1), 3);
        c.start = round(drag.start0 + (c.in - drag.in0), 3);
      } else {
        const maxOut = Math.min(D, next ? c.in + (next.start - c.start) : D);
        c.out = round(clamp(drag.out0 + dt, c.in + 0.1, maxOut), 3);
      }
      renderVideoTrack(); renderRuler(); renderCameraTrack(); renderMaskTrack(); renderTrackRows();
      for (const l of state.layers) updateBar(l);
      updateTimeUI();
    });
    const endClipDrag = (e) => {
      if (!drag) return;
      if (drag.mode === 'clipMove') {
        const c = state.clips.find((x) => x.id === drag.id);
        if (drag.moved && c) { settleClip(c); afterClipsChanged(clock.time); commit(); renderTimeline(); syncMedia(clock.time, clock.playing, true); }
        else if (e && e.type === 'pointerup') clock.time = timeFromEvent(e);   // a plain click puts the playhead there
        drag = null;
        return;
      }
      if (drag.mode === 'clipL' || drag.mode === 'clipR') {
        if (drag.moved) { afterClipsChanged(clock.time); commit(); renderTimeline(); syncMedia(clock.time, clock.playing, true); }
        drag = null;
        return;
      }
      if (drag.mode === 'scrub') drag = null;
    };
    videoTrack.addEventListener('pointerup', endClipDrag);
    videoTrack.addEventListener('pointercancel', endClipDrag);

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

    // Tracker rows
    const tlTracks = $('#tlTracks');
    tlTracks.addEventListener('pointerdown', (e) => {
      const rowEl = e.target.closest('.tl-trk');
      if (!rowEl) return;
      if (e.target.closest('.tl-name')) { selectTrack(rowEl.dataset.id); showTab('track'); return; }
      const key = e.target.closest('.tl-key');
      if (key) {
        selectTrackKey(key.dataset.id);
        const k = getTrackKey(key.dataset.id);
        drag = { mode: 'trackKey', id: k.id, x0: e.clientX, t0: k.t, moved: false };
        tlTracks.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else {
        selectTrack(rowEl.dataset.id);
        clock.time = timeFromEvent(e);
        drag = { mode: 'scrub' };
        tlTracks.setPointerCapture(e.pointerId);
      }
    });
    tlTracks.addEventListener('dblclick', (e) => {
      const rowEl = e.target.closest('.tl-trk');
      if (!rowEl || e.target.closest('.tl-key') || e.target.closest('.tl-name')) return;
      const tr = getTrack(rowEl.dataset.id);
      if (!tr) return;
      clock.time = round(timeFromEvent(e), 2);
      const { key } = trackKeyAtPlayhead(tr);
      key.manual = true;
      commit();
      selectTrackKey(key.id);
      toast('Correction key added — drag the point on the preview to where it belongs');
    });
    tlTracks.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode !== 'trackKey') return;
      const k = getTrackKey(drag.id);
      if (!k) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      k.t = round(clamp(snap(drag.t0 + dt, snapTargets(new Set())), 0, duration()), 3);
      renderTrackRows();
      refreshTrackKeyValues();
      invalidate();
    });
    const endTrackDrag = () => {
      if (drag && drag.mode === 'trackKey' && drag.moved) { const tr = trackOfKey(drag.id); if (tr) tr.keys = Camera.sorted(tr.keys); commit(); }
      drag = null;
    };
    tlTracks.addEventListener('pointerup', endTrackDrag);
    tlTracks.addEventListener('pointercancel', endTrackDrag);

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
      const targets = snapTargets(new Set(drag.ids));
      if (drag.mode === 'move') {
        const o = drag.orig[drag.id];
        const len = o.end - o.start;
        const T = limitFor(getLayer(drag.id));
        let s = clamp(o.start + dt, 0, T - len);
        const snappedStart = snap(s, targets), snappedEnd = snap(s + len, targets);
        if (snappedStart !== s) s = snappedStart; else if (snappedEnd !== s + len) s = snappedEnd - len;
        let delta = s - o.start;
        for (const id of drag.ids) {
          const oo = drag.orig[id];
          delta = clamp(delta, -oo.start, limitFor(getLayer(id)) - oo.end);
        }
        for (const id of drag.ids) {
          const l = getLayer(id), oo = drag.orig[id];
          l.start = oo.start + delta; l.end = oo.end + delta;
          updateBar(l);
        }
      } else {
        const l = getLayer(drag.id), o = drag.orig[drag.id];
        if (drag.mode === 'trimL') {
          const ns = clamp(snap(o.start + dt, targets), 0, l.end - 0.1);
          if (isMedia(l) && l.kind !== 'image') l.srcIn = round(Math.max(0, (l.srcIn || 0) + (ns - l.start)), 3);   // trimming the head keeps the same frame at the cut
          l.start = ns;
        } else l.end = clamp(snap(o.end + dt, targets), l.start + 0.1, limitFor(l));
        updateBar(l);
      }
      refreshInspectorValues();
      invalidate();
    });

    const endDrag = () => {
      if (drag && (drag.mode === 'move' || drag.mode === 'trimL' || drag.mode === 'trimR') && drag.moved) { commit(); renderTimeline(); syncMedia(clock.time, clock.playing, true); }
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
        { type: 'sub', label: 'Motion tracking' },
        { type: 'select', path: 'track.id', label: 'Pinned to', hint: 'Follow a tracked point in the footage: the word stays on that object while the real camera moves, and grows as the camera closes in. Create trackers in step 1 · Media.',
          options: () => [{ value: '', label: state.tracks.length ? 'Nothing — fixed in the scene' : 'No trackers yet (step 1 · Media)' }].concat(state.tracks.map((tr) => ({ value: tr.id, label: tr.name }))) },
        { type: 'toggle', path: 'track.rotate', label: 'Follow rotation', hint: 'Turn the word with the tracked object as well as moving and scaling with it' },
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
        { type: 'buttons', buttons: [
          { label: 'Words appear one by one', action: (l) => { l.split = 'word'; l.anim.in = { type: 'fade', duration: 0.25, easing: 'easeOut', stagger: 0.4, fit: true, hold: 0.5 }; l.anim.out = { type: 'none', duration: 0.3, easing: 'easeIn', stagger: 0 }; } },
          { label: 'Type it out', action: (l) => { l.split = 'char'; l.anim.in = { type: 'typewriter', duration: 0.05, easing: 'linear', stagger: 0.06, fit: true, hold: 0.5 }; l.anim.out = { type: 'none', duration: 0.3, easing: 'easeIn', stagger: 0 }; } },
        ] },
        { type: 'sub', label: 'In' },
        { type: 'select', path: 'anim.in.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'in') },
        { type: 'range', path: 'anim.in.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.in.easing', label: 'Easing', options: easingOptions },
        { type: 'toggle', path: 'anim.in.fit', label: 'Fit to layer length', hint: 'Spread the words (or letters) over the layer\'s whole time, so the last one has appeared before the layer ends however many there are. Make the layer longer or shorter on the timeline to set the pace.' },
        { type: 'range', path: 'anim.in.hold', label: 'Hold at end', min: 0, max: 4, step: 0.05, scale: 1, unit: 's', hint: 'With Fit on: how long the complete text stays before the layer ends' },
        { type: 'range', path: 'anim.in.stagger', label: 'Gap per word', min: 0, max: 2, step: 0.01, scale: 1, unit: 's', hint: 'With Fit off: fixed delay between words/letters. Around 0.3–0.6 s per word paces a spoken line — but words that would start after the layer ends are never shown.' },
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

  const POSITION_FIELDS = LAYER_SCHEMA.find((sec) => sec.title === 'Position in 3D').fields;
  const MEDIA_SCHEMA = [
    {
      title: 'Media',
      fields: [
        { type: 'buttons', buttons: [{ label: 'Relink file…', action: (l) => { pendingRelink = l; $('#relinkInput').click(); } }] },
        { type: 'range', path: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01, scale: 100, unit: '%', showIf: (l) => l.kind !== 'audio' },
        { type: 'range', path: 'fitWidth', label: 'Width', min: 0.1, max: 8, step: 0.01, scale: 100, unit: '', hint: 'Width in scene units. The frame is about 2 × its aspect ratio wide at the resting camera, so 1.0 is roughly half the frame for 16:9 footage.', showIf: (l) => l.kind !== 'audio' },
        { type: 'range', path: 'srcIn', label: 'Trim start', min: 0, max: 600, step: 0.01, scale: 1, unit: 's', hint: 'Where in the file this layer begins', showIf: (l) => l.kind !== 'image' },
        { type: 'toggle', path: 'muted', label: 'Mute', showIf: (l) => l.kind !== 'image' },
        { type: 'range', path: 'volume', label: 'Volume', min: 0, max: 1.5, step: 0.01, scale: 100, unit: '%', showIf: (l) => l.kind !== 'image' },
      ],
    },
    // a sound has no place in the scene: its position controls are hidden
    { title: 'Position in 3D', fields: POSITION_FIELDS.map((f) => (['range', 'select', 'toggle'].includes(f.type) ? Object.assign({}, f, { showIf: (l) => l.kind !== 'audio' }) : f)) },
    {
      title: 'Animation',
      collapsed: true,
      fields: [
        { type: 'sub', label: 'In' },
        { type: 'select', path: 'anim.in.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'in') },
        { type: 'range', path: 'anim.in.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.in.easing', label: 'Easing', options: easingOptions },
        { type: 'sub', label: 'Out' },
        { type: 'select', path: 'anim.out.type', label: 'Type', grouped: true, options: animOptions, onChange: (l) => onAnimTypeChange(l, 'out') },
        { type: 'range', path: 'anim.out.duration', label: 'Duration', min: 0.05, max: 3, step: 0.05, scale: 1, unit: 's' },
        { type: 'select', path: 'anim.out.easing', label: 'Easing', options: easingOptions },
        { type: 'sub', label: 'While visible' },
        { type: 'select', path: 'anim.loop.type', label: 'Motion', options: () => Object.entries(Anim.Loops).map(([value, d]) => ({ value, label: d.label })) },
        { type: 'range', path: 'anim.loop.speed', label: 'Speed', min: 0.1, max: 4, step: 0.1, scale: 1, unit: '×' },
      ],
    },
    {
      title: 'Timing',
      fields: [
        { type: 'two', fields: [
          { type: 'number', path: 'start', label: 'Start (s)', step: 0.05, min: 0, delta: true, onChange: (l) => { l.start = clamp(l.start, 0, l.end - 0.1); } },
          { type: 'number', path: 'end', label: 'End (s)', step: 0.05, min: 0, delta: true, onChange: (l) => { l.end = clamp(l.end, l.start + 0.1, limitFor(l)); } },
        ] },
        { type: 'buttons', buttons: [
          { label: 'Start at playhead', action: (l) => { const len = l.end - l.start; l.start = clamp(clock.time, 0, limitFor(l) - 0.1); l.end = l.start + len; } },
          { label: 'Split at playhead', action: (l) => splitLayerAt(l, clock.time) },
        ] },
      ],
    },
  ];
  let pendingRelink = null;

  const KEY_SCHEMA = [
    {
      title: 'Keyframe',
      fields: [
        { type: 'number', path: 't', label: 'Time (s)', step: 0.05, min: 0, onChange: (k) => { k.t = clamp(k.t, 0, duration()); } },
        { type: 'select', path: 'easing', label: 'Ease in', options: () => Object.entries(Camera.EASING_LABELS).map(([value, label]) => ({ value, label })), hint: 'How the camera arrives at this key from the previous one', onChange: (k) => { if (k.easing === 'custom' && !(Array.isArray(k.curve) && k.curve.length === 4)) k.curve = Camera.DEFAULT_CURVE.slice(); } },
        { type: 'curve', path: 'curve', label: 'Speed curve', hint: 'Drag the two handles: a flat start means the camera sets off slowly, a flat end means it eases to a stop; steep means fast. Applies to the move INTO this key.', showIf: (k) => k.easing === 'custom' },
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

  const TRACK_KEY_SCHEMA = [
    {
      title: 'Tracker keyframe',
      fields: [
        { type: 'number', path: 't', label: 'Time (s)', step: 0.05, min: 0, onChange: (k) => { k.t = clamp(k.t, 0, duration()); } },
        { type: 'range', path: 'x', label: 'Point X', min: -1.2, max: 1.2, step: 0.002, scale: 100, unit: '' },
        { type: 'range', path: 'y', label: 'Point Y', min: -1.2, max: 1.2, step: 0.002, scale: 100, unit: '' },
        { type: 'range', path: 's', label: 'Size', min: 0.2, max: 4, step: 0.005, scale: 100, unit: '%', hint: 'How big the tracked object is here compared with the frame the tracker was placed on' },
        { type: 'range', path: 'r', label: 'Rotation', min: -180, max: 180, step: 0.5, scale: 1, unit: '°', hint: 'How far the object has turned since the reference frame' },
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
    mediaControls: [],
    get: () => selected(),
    apply(field, primary, value, isFinal) {
      const targets = selectedLayers();
      const oldPrimary = getPath(primary, field.path);
      for (const l of targets) {
        if (field.perLayer && l !== primary) continue;
        if (field.path === 'track.id') { pinLayer(l, value || null, clock.time); l._layout = null; continue; }
        if (field.path === 'track.rotate') {
          // keep the word where it is on screen: re-derive its offsets under the new setting
          const abs = effectiveTransform(l, clock.time);
          l.track = Object.assign({ id: null }, l.track, { rotate: !!value });
          if (isPinned(l)) {
            const a = anchorAt(l.track.id, clock.time);
            const deg = value ? a.deg : 0;
            const rad = (-deg * Math.PI) / 180, cc = Math.cos(rad), ss = Math.sin(rad);
            const dx = (abs.x - a.x) / a.k, dy = (abs.y - a.y) / a.k;
            l.transform.x = round(cc * dx - ss * dy, 4);
            l.transform.y = round(ss * dx + cc * dy, 4);
            l.transform.rz = round(abs.rz - deg, 3);
          }
          continue;
        }
        let v = value;
        if (field.delta && l !== primary && typeof value === 'number' && typeof oldPrimary === 'number') {
          v = (getPath(l, field.path) || 0) + (value - oldPrimary);
        }
        setPath(l, field.path, v);
        if (field.onChange) field.onChange(l);
        if (field.path === 'start' || field.path === 'end') {
          const lim = limitFor(l);
          l.start = clamp(l.start, 0, Math.max(0, lim - 0.1));
          l.end = clamp(l.end, l.start + 0.1, lim);
          updateBar(l);
        }
        if (isMedia(l) && (field.path === 'srcIn' || field.path === 'muted' || field.path === 'volume' || field.path === 'hidden')) syncMedia(clock.time, clock.playing, true);
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

  const trackKeyCtx = {
    controls: [],
    get: () => selectedTrackKey(),
    apply(field, key, value, isFinal) {
      const tr = trackOfKey(key.id);
      if (!tr) return;
      if (field.path === 'x' || field.path === 'y' || field.path === 's') {
        // slider edits are corrections too, so they blend into the analysed frames around them
        const dx = field.path === 'x' ? value - key.x : 0, dy = field.path === 'y' ? value - key.y : 0, ds = field.path === 's' ? value / Math.max(0.01, key.s) : 1;
        correctTrack(tr, key, dx, dy, ds);
      } else {
        setPath(key, field.path, value);
        if (field.onChange) field.onChange(key);
        if (field.path === 't') tr.keys = Camera.sorted(tr.keys);
      }
      renderTrackRows();
      syncTrackControls();
      invalidate();
      if (isFinal) { commit(); refreshTrackKeyValues(); }
    },
    buttonAction(action) {
      const k = selectedTrackKey();
      if (!k) return;
      action(k);
      commit();
      refreshTrackKeyValues();
      renderTrackRows();
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
    } else if (f.type === 'curve') {
      // A cubic-Bezier speed curve editor: x is time between the two keys, y is how far the camera has got.
      const box = document.createElement('div');
      box.className = 'curve-wrap';
      const cv = document.createElement('canvas');
      cv.className = 'curve-canvas';
      const presets = document.createElement('div');
      presets.className = 'curve-presets';
      const readout = document.createElement('div');
      readout.className = 'curve-readout';
      const PRESETS = [['Gentle', [0.4, 0, 0.2, 1]], ['Slow start', [0.7, 0, 0.9, 0.6]], ['Slow finish', [0.1, 0.4, 0.3, 1]], ['Snappy', [0.6, 0, 0.1, 1]], ['Overshoot', [0.3, 1.3, 0.6, 1]], ['Anticipate', [0.5, -0.3, 0.6, 1]], ['Linear', [0.33, 0.33, 0.67, 0.67]]];
      for (const [name, c] of PRESETS) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = name;
        b.addEventListener('click', () => { const k = target(); if (k) ctx.apply(f, k, c.slice(), true); });
        presets.appendChild(b);
      }
      box.appendChild(cv); box.appendChild(presets); box.appendChild(readout);
      wrap.appendChild(box);
      const PAD = 14;
      let handle = null;
      const geom = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth || 240, h = cv.clientHeight || 130;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        return { dpr, w: cv.width, h: cv.height, pad: PAD * dpr };
      };
      const toPx = (g, x, y) => ({ px: g.pad + x * (g.w - 2 * g.pad), py: g.h - g.pad - y * (g.h - 2 * g.pad) });
      const fromPx = (g, px, py) => ({ x: clamp((px - g.pad) / (g.w - 2 * g.pad), 0, 1), y: (g.h - g.pad - py) / (g.h - 2 * g.pad) });
      const curveOf = (k) => (Array.isArray(k.curve) && k.curve.length === 4 ? k.curve : Camera.DEFAULT_CURVE);
      const drawCurve = (k) => {
        const g = geom(), c2 = cv.getContext('2d');
        const cur = curveOf(k);
        c2.clearRect(0, 0, g.w, g.h);
        c2.strokeStyle = '#26262e'; c2.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const a = toPx(g, i / 4, 0), b = toPx(g, i / 4, 1);
          c2.beginPath(); c2.moveTo(a.px, a.py); c2.lineTo(b.px, b.py); c2.stroke();
          const a2 = toPx(g, 0, i / 4), b2 = toPx(g, 1, i / 4);
          c2.beginPath(); c2.moveTo(a2.px, a2.py); c2.lineTo(b2.px, b2.py); c2.stroke();
        }
        // linear reference
        const o = toPx(g, 0, 0), e = toPx(g, 1, 1);
        c2.strokeStyle = '#3a3a44'; c2.setLineDash([4 * g.dpr, 4 * g.dpr]);
        c2.beginPath(); c2.moveTo(o.px, o.py); c2.lineTo(e.px, e.py); c2.stroke(); c2.setLineDash([]);
        // the curve
        const fn = Camera.cubicBezier(clamp(cur[0], 0, 1), cur[1], clamp(cur[2], 0, 1), cur[3]);
        c2.strokeStyle = '#f28c28'; c2.lineWidth = 2 * g.dpr;
        c2.beginPath();
        for (let i = 0; i <= 60; i++) { const x = i / 60, q = toPx(g, x, fn(x)); if (i) c2.lineTo(q.px, q.py); else c2.moveTo(q.px, q.py); }
        c2.stroke();
        // handles
        const h1 = toPx(g, cur[0], cur[1]), h2 = toPx(g, cur[2], cur[3]);
        c2.strokeStyle = '#7ad7ff'; c2.lineWidth = 1.2 * g.dpr;
        c2.beginPath(); c2.moveTo(o.px, o.py); c2.lineTo(h1.px, h1.py); c2.moveTo(e.px, e.py); c2.lineTo(h2.px, h2.py); c2.stroke();
        for (const hh of [h1, h2]) { c2.fillStyle = '#7ad7ff'; c2.beginPath(); c2.arc(hh.px, hh.py, 5 * g.dpr, 0, Math.PI * 2); c2.fill(); }
        c2.fillStyle = '#6f6f7a'; c2.font = `${10 * g.dpr}px Inter, sans-serif`; c2.textAlign = 'left';
        c2.fillText('time →', g.pad, g.h - 3 * g.dpr);
        c2.save(); c2.translate(9 * g.dpr, g.h - g.pad); c2.rotate(-Math.PI / 2); c2.fillText('progress →', 0, 0); c2.restore();
        readout.textContent = `cubic-bezier(${cur.map((v) => round(v, 2)).join(', ')})`;
      };
      const pick = (e) => {
        const k = target(); if (!k) return null;
        const g = geom(), r = cv.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * g.w, py = ((e.clientY - r.top) / r.height) * g.h;
        const cur = curveOf(k);
        const d1 = Math.hypot(px - toPx(g, cur[0], cur[1]).px, py - toPx(g, cur[0], cur[1]).py);
        const d2 = Math.hypot(px - toPx(g, cur[2], cur[3]).px, py - toPx(g, cur[2], cur[3]).py);
        return { g, px, py, which: d1 <= d2 ? 0 : 1 };
      };
      cv.addEventListener('pointerdown', (e) => { const h = pick(e); if (!h) return; handle = h.which; cv.setPointerCapture(e.pointerId); e.preventDefault(); });
      cv.addEventListener('pointermove', (e) => {
        if (handle == null) return;
        const k = target(); if (!k) return;
        const g = geom(), r = cv.getBoundingClientRect();
        const q = fromPx(g, ((e.clientX - r.left) / r.width) * g.w, ((e.clientY - r.top) / r.height) * g.h);
        const cur = curveOf(k).slice();
        cur[handle * 2] = round(q.x, 3); cur[handle * 2 + 1] = round(clamp(q.y, -0.6, 1.6), 3);
        ctx.apply(f, k, cur, false);
        drawCurve(k);
      });
      const done = () => { if (handle == null) return; handle = null; const k = target(); if (k) ctx.apply(f, k, curveOf(k).slice(), true); };
      cv.addEventListener('pointerup', done);
      cv.addEventListener('pointercancel', done);
      update = (k) => { const show = !f.showIf || f.showIf(k); wrap.classList.toggle('hidden', !show); if (show) drawCurve(k); };
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
    const baseUpdate = update;
    if (f.showIf && f.type !== 'curve') update = (k) => { const show = f.showIf(k); wrap.classList.toggle('hidden', !show); if (show) baseUpdate(k); };
    ctx.controls.push({ update, field: f, el: wrap });
    return wrap;
  }

  function refreshInspector() {
    const l = selected();
    const k = selectedKey();
    const mk = selectedMaskKey();
    const tk = selectedTrackKey();
    els.inspectorEmpty.classList.toggle('hidden', !!(l || k || mk || tk));
    els.inspectorBody.classList.toggle('hidden', !l);
    els.cameraKeyBody.classList.toggle('hidden', !k);
    $('#maskKeyBody').classList.toggle('hidden', !mk);
    $('#trackKeyBody').classList.toggle('hidden', !tk);
    if (l) refreshInspectorValues();
    if (k) refreshKeyValues();
    if (mk) refreshMaskKeyValues();
    if (tk) refreshTrackKeyValues();
    updateLayoutHint();
  }
  function refreshTrackKeyValues() {
    const k = selectedTrackKey();
    if (!k) return;
    for (const c of trackKeyCtx.controls) c.update(k);
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
    const media = isMedia(l);
    els.sections.classList.toggle('hidden', media);
    $('#mediaSections').classList.toggle('hidden', !media);
    if (n > 1) els.multiTitle.textContent = `${n} layers selected`;
    for (const c of media ? layerCtx.mediaControls : layerCtx.controls) {
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
    /* Buffer pixel -> video-plane units. The camera ray is intersected with the video plane, so this
     * is exact under any dolly, pan or tilt — a tracker point has to land where the user clicked. */
    const planeFromBuffer = (p) => {
      const cam = state.media.locked ? renderer.defaultCamera() : cameraAt(clock.time);
      return renderer.planePointAtScreen(p.x, p.y, cam, state.media);
    };
    /* Plane units at time t -> the tracker's reference-frame units (undo its position, size, angle). */
    const refFromPlane = (tr, t, pl) => {
      const pt = trackAt(tr.id, t);
      const A = Math.max(0.01, renderer.aspect), sc = Math.max(0.05, pt.s);
      const rad = (pt.r * Math.PI) / 180, c = Math.cos(rad) / sc, sn = Math.sin(rad) / sc;
      const dx = (pl.x - pt.x) * A, dy = pl.y - pt.y;
      return { x: tr.ref.x + (c * dx + sn * dy) / A, y: tr.ref.y + (-sn * dx + c * dy) };
    };
    /* Index of the shape handle under a buffer pixel, or -1. */
    const handleAt = (trk, p) => {
      const o = (renderer.lastOutlines || []).find((x) => x.id === trk.id);
      if (!o) return -1;
      let best = -1, bd = 14 * (els.canvas.width / Math.max(1, els.canvas.clientWidth));
      o.handles.forEach((h, i) => {
        if (h.behind) return;
        const d = Math.hypot(h.x - p.x, h.y - p.y);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    };

    c.addEventListener('pointerdown', (e) => {
      if (state.exporting || state.tracking) return;
      const p = toBuffer(e);
      if (state.suggestions && state.suggestions.length) {
        const pl = planeFromBuffer(p);
        const hit = pl && state.suggestions.find((sg) => Math.abs(pl.x - sg.x) <= sg.w / 2 && Math.abs(pl.y - sg.y) <= sg.h / 2);
        if (hit) { adoptSuggestion(hit); return; }
        state.suggestions = [];
        invalidate();
      }
      const trk = state.trackEdit ? selectedTrack() : null;
      if (trk) {
        clock.pause();
        const pl = planeFromBuffer(p);
        if (!pl) return;

        // Drawing a shape: every click adds a corner; clicking the first one again closes it.
        if (trk.mode === 'poly' && !trk.closed) {
          const pts = trk.ref.points;
          if (pts.length >= 3 && handleAt(trk, p) === 0) { finishShape(trk); return; }
          if (!pts.length) { trk.ref.t = round(srcAtPlayhead(), 3); trk.keys = [Camera.defaultKey(trk.ref.t, { x: 0, y: 0, s: 1, r: 0, manual: true, easing: 'linear' })]; }
          pts.push({ x: round(pl.x, 4), y: round(pl.y, 4) });
          recentreShape(trk);
          trk.placed = true;
          syncTrackControls();
          invalidate();
          return;
        }

        // Dragging a handle reshapes the marked region itself.
        const hi = handleAt(trk, p);
        if (hi >= 0 && trackReady(trk)) {
          drag = { mode: 'trackHandle', tr: trk, idx: hi, moved: false };
          c.setPointerCapture(e.pointerId);
          c.classList.add('grabbing');
          return;
        }

        // A box that has not been placed is drawn by dragging out a rectangle.
        if (trk.mode === 'box' && !trk.placed) {
          drag = { mode: 'trackBox', tr: trk, p0: pl, moved: false };
          trk.ref.t = round(srcAtPlayhead(), 3);
          trk.keys = [Camera.defaultKey(trk.ref.t, { x: 0, y: 0, s: 1, r: 0, manual: true, easing: 'linear' })];
          c.setPointerCapture(e.pointerId);
          c.classList.add('grabbing');
          return;
        }

        const { key, created } = trackKeyAtPlayhead(trk);
        drag = { mode: 'track', tr: trk, key, created, x0: p.x, y0: p.y, wpp: planePixels(), moved: false, fresh: !trk.placed };
        // Placing a point (or centring an existing box) puts the mark where you clicked.
        if (drag.fresh) {
          correctTrack(trk, key, pl.x - key.x, pl.y - key.y, 1, 0);
          trk.ref.x = key.x; trk.ref.y = key.y; trk.ref.t = key.t;
          trk.placed = true;
          drag.moved = true;
          syncTrackControls();
          invalidate();
        }
        drag.tx = key.x; drag.ty = key.y;   // where the point was when the drag began
        c.setPointerCapture(e.pointerId);
        c.classList.add('grabbing');
        return;
      }
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
        // Ctrl/Cmd-click adds to the selection; Shift does too unless the layer is already selected,
        // in which case Shift-drag moves along one axis.
        if (e.ctrlKey || e.metaKey || (e.shiftKey && !isSelected(id))) { select(id, { toggle: true }); return; }
        if (!isSelected(id)) select(id);
        const cam = cameraAt(clock.time);
        drag = {
          mode: e.altKey ? 'rotate' : 'move', x0: p.x, y0: p.y, moved: false,
          items: selectedLayers().map((l) => {
            const a = isPinned(l) ? anchorAt(l.track.id, clock.time) : null;
            const eff = effectiveTransform(l, clock.time);
            const wpp = renderer.worldPerPixelAtDepth(renderer.viewDepth(state.media.locked && a ? renderer.defaultCamera() : cam, eff.x, eff.y, eff.z));
            return { l, t0: JSON.parse(JSON.stringify(l.transform)), wpp: wpp / (a ? a.k : 1) };
          }),
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
        c.classList.toggle('hover', !state.maskEdit && !state.trackEdit && !!renderer.hitTest(p.x, p.y));
        return;
      }
      if (drag.mode === 'trackBox') {
        const pl = planeFromBuffer(p);
        if (!pl) return;
        const tr = drag.tr, a = drag.p0;
        tr.ref.w = round(clamp(Math.abs(pl.x - a.x), 0.02, 1.6), 4);
        tr.ref.h = round(clamp(Math.abs(pl.y - a.y), 0.02, 1.6), 4);
        tr.ref.x = round((pl.x + a.x) / 2, 4);
        tr.ref.y = round((pl.y + a.y) / 2, 4);
        tr.keys[0].x = tr.ref.x; tr.keys[0].y = tr.ref.y;
        if (Math.abs(pl.x - a.x) > 0.02 || Math.abs(pl.y - a.y) > 0.02) drag.moved = true;
        syncTrackControls();
        invalidate();
        return;
      }
      if (drag.mode === 'trackHandle') {
        const pl = planeFromBuffer(p);
        if (!pl) return;
        const tr = drag.tr;
        const rp = refFromPlane(tr, clock.time, pl);
        drag.moved = true;
        if (tr.mode === 'poly') {
          tr.ref.points[drag.idx] = { x: round(rp.x, 4), y: round(rp.y, 4) };
          recentreShape(tr);
        } else if (tr.mode === 'point') {
          const key = trackKeyAtPlayhead(tr).key;
          correctTrack(tr, key, pl.x - key.x, pl.y - key.y, 1, 0);
        } else {
          // the opposite corner stays put while this one moves
          const hw = tr.ref.w / 2, hh = tr.ref.h / 2;
          const fixed = { x: tr.ref.x + (drag.idx === 1 || drag.idx === 2 ? -hw : hw), y: tr.ref.y + (drag.idx >= 2 ? -hh : hh) };
          tr.ref.w = round(clamp(Math.abs(rp.x - fixed.x), 0.02, 1.6), 4);
          tr.ref.h = round(clamp(Math.abs(rp.y - fixed.y), 0.02, 1.6), 4);
          const cx = (rp.x + fixed.x) / 2, cy = (rp.y + fixed.y) / 2;
          const key = trackKeyAtPlayhead(tr).key;
          correctTrack(tr, key, cx - tr.ref.x - (key.x - tr.ref.x), cy - tr.ref.y - (key.y - tr.ref.y), 1, 0);
          tr.ref.x = round(cx, 4); tr.ref.y = round(cy, 4);
        }
        syncTrackControls();
        refreshTrackKeyValues();
        invalidate();
        return;
      }
      if (drag.mode === 'track') {
        const dxu = ((p.x - drag.x0) * drag.wpp) / (renderer.aspect * state.media.scale);
        const dyu = -((p.y - drag.y0) * drag.wpp) / state.media.scale;
        if (Math.abs(p.x - drag.x0) + Math.abs(p.y - drag.y0) > 1.5) drag.moved = true;
        const nx = drag.tx + dxu, ny = drag.ty + dyu;
        correctTrack(drag.tr, drag.key, nx - drag.key.x, ny - drag.key.y, 1, 0);
        if (drag.fresh) { drag.tr.ref.x = drag.key.x; drag.tr.ref.y = drag.key.y; }
        syncTrackControls();
        refreshTrackKeyValues();
        invalidate();
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
      let dx = p.x - drag.x0, dy = p.y - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      // Shift locks the move to whichever axis the pointer clearly set off along
      if (e.shiftKey) {
        if (!drag.axis && Math.hypot(dx, dy) > 6) drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        if (drag.axis === 'x') dy = 0; else if (drag.axis === 'y') dx = 0;
      } else drag.axis = null;
      const mods = { alt: e.altKey };
      for (const it of drag.items) {
        if (drag.mode === 'move') {
          it.l.transform.x = round(snapV(it.t0.x + dx * it.wpp, mods), 3);
          it.l.transform.y = round(snapV(it.t0.y - dy * it.wpp, mods), 3);
        } else {
          it.l.transform.ry = clamp(round(it.t0.ry + dx * 0.25, 1), -90, 90);
          it.l.transform.rx = clamp(round(it.t0.rx - dy * 0.25, 1), -90, 90);
        }
      }
      if (drag.mode === 'move') previewGuide = { ids: drag.items.map((it) => it.l.id), axis: drag.axis };
      refreshInspectorValues();
      invalidate();
      if (layoutVisible()) layoutView.draw();
    });
    const end = () => {
      if (previewGuide) { previewGuide = null; clearPreviewGuides(); }
      if (drag && drag.mode === 'track' && !drag.moved && drag.created) {
        // a click without a drag should not leave a stray correction key behind
        drag.tr.keys = drag.tr.keys.filter((k) => k !== drag.key);
      }
      if (drag && drag.mode === 'trackBox') {
        const tr = drag.tr;
        if (!drag.moved) { tr.ref.x = round(drag.p0.x, 4); tr.ref.y = round(drag.p0.y, 4); tr.keys[0].x = tr.ref.x; tr.keys[0].y = tr.ref.y; }
        tr.placed = true;
        syncTrackControls();
      }
      if (drag && drag.moved) { commit(); if (drag.mode === 'track' || drag.mode === 'trackHandle' || drag.mode === 'trackBox') renderTrackRows(); }
      drag = null;
      c.classList.remove('grabbing');
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);

    c.addEventListener('dblclick', (e) => {
      const p = toBuffer(e);
      const trk = state.trackEdit ? selectedTrack() : null;
      if (trk && trk.mode === 'poly' && !trk.closed) { finishShape(trk); return; }
      const id = renderer.hitTest(p.x, p.y);
      if (id) { select(id); focusTextInput(); }
    });

    let wheelTimer = 0;
    c.addEventListener('wheel', (e) => {
      const trk = state.trackEdit ? selectedTrack() : null;
      if (trk && !state.exporting && !state.tracking) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.0015);
        if (!trackIsAuto(trk) && trk.mode !== 'poly') {
          // before analysis the wheel sizes the region that will be followed
          if (!e.shiftKey) trk.ref.w = round(clamp(trk.ref.w * factor, 0.02, 1.6), 4);
          trk.ref.h = round(clamp(trk.ref.h * factor, 0.02, 1.6), 4);
        } else {
          // afterwards it corrects how big the pinned words are here
          const { key } = trackKeyAtPlayhead(trk);
          correctTrack(trk, key, 0, 0, factor, 0);
        }
        syncTrackControls();
        refreshTrackKeyValues();
        invalidate();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { commit(); renderTrackRows(); }, 400);
        return;
      }
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
        if (isMedia(l)) { l.fitWidth = clamp(round((l.fitWidth || 1) * factor, 4), 0.1, 8); continue; }
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
  /* Grid snapping for positions in scene units; Alt held while dragging overrides it. */
  const snapV = (v, mods) => (state.snap && !(mods && mods.alt) ? Math.round(v / state.snapStep) * state.snapStep : v);
  function setSnap(on) {
    state.snap = !!on;
    layoutView.snap = state.snap;
    $('#btnSnap').classList.toggle('on', state.snap);
    if (layoutVisible()) layoutView.draw();
  }
  function layerFootprint(l, tr) {
    const e = tr || l.transform;
    if (isMedia(l)) {
      const a = assets.get(l.id);
      const w = l.fitWidth || 1, h = w * (a && a.width ? a.height / a.width : 9 / 16);
      return { w: w * (e.scale || 1), h: h * (e.scale || 1) };
    }
    const lay = l._layout;
    const w = lay ? lay.blockW : (l.text || 'text').length * l.style.size * 1.1;
    const h = lay ? lay.blockH : l.style.size * 2.2;
    return { w: w * (e.scale || 1), h: h * (e.scale || 1) };
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
        time: t, cam, camDist: d, fov: state.fov, aspect: frameAspect(), hasVideo: hasFootage(),
        video: { scale: state.media.scale, x: state.media.x, y: state.media.y, z: planeZ(), locked: state.media.locked },
        hasFootage: hasFootage(),
        layers: state.layers.filter((l) => !(isMedia(l) && l.kind === 'audio')).map((l) => { const e = effectiveTransform(l, t); return Object.assign({
          id: l.id, text: l.text, x: e.x, y: e.y, z: e.z, pinned: isPinned(l),
          active: t >= l.start && t < l.end, hidden: l.hidden, selected: isSelected(l.id), primary: state.selectedIds[0] === l.id,
        }, layerFootprint(l, e)); }),
        keys: state.camera.keys.map((k) => ({ id: k.id, t: k.t, x: k.x, y: k.y, z: d - k.dolly, selected: k.id === state.selectedKeyId })),
        path: cameraPath(),
      };
    },
    onSelectLayer(id, additive) { select(id, { toggle: additive }); },
    onSelectKey(id) { selectKey(id); },
    onDeselect() { select(null); },
    onLayerDragStart(ids) {
      dragStartPositions = Object.fromEntries(ids.map((id) => {
        const l = getLayer(id);
        const a = isPinned(l) ? anchorAt(l.track.id, clock.time) : null;
        return [id, { x: l.transform.x, y: l.transform.y, z: l.transform.z, k: a ? a.k : 1 }];
      }));
    },
    onLayerDragMove(ids, delta, mods) {
      for (const id of ids) {
        const l = getLayer(id), o = dragStartPositions && dragStartPositions[id];
        if (!l || !o) continue;
        // a pinned word's x/y are offsets from its anchor, so a world-space drag is divided by the anchor scale
        l.transform.x = round(clamp(snapV(o.x + delta.dx / o.k, mods), -4, 4), 3);
        l.transform.y = round(clamp(snapV(o.y + delta.dy / o.k, mods), -2.5, 2.5), 3);
        l.transform.z = round(clamp(snapV(o.z + delta.dz, mods), -3, 10), 3);
      }
      refreshInspectorValues();
      invalidate();
      updateLayoutHint();
    },
    onLayerDragEnd(moved) { dragStartPositions = null; if (moved) commit(); },
    onCameraDragMove(p, mods) {
      clock.pause();
      const key = keyAtPlayhead();
      if (state.selectedKeyId !== key.id) selectKey(key.id);
      key.x = round(clamp(snapV(p.x, mods), -3, 3), 3);
      key.y = round(clamp(snapV(p.y, mods), -2, 2), 3);
      key.dolly = round(renderer.camDist - clamp(snapV(p.z, mods), -2, 14), 3);
      refreshKeyValues();
      renderCameraTrack();
      invalidate();
      updateLayoutHint();
    },
    onCameraDragEnd() { commit(); },
    onKeyDragMove(id, p, mods) {
      const k = getKey(id);
      if (!k) return;
      k.x = round(clamp(snapV(p.x, mods), -3, 3), 3);
      k.y = round(clamp(snapV(p.y, mods), -2, 2), 3);
      k.dolly = round(renderer.camDist - clamp(snapV(p.z, mods), -2, 14), 3);
      refreshKeyValues();
      invalidate();
    },
    onKeyDragEnd(moved) { if (moved) commit(); },
    onDoubleClickLayer(id) { select(id); focusTextInput(); },
  });

  function updateLayoutHint() {
    const l = selected();
    const k = selectedKey();
    if (l) { const e = effectiveTransform(l, clock.time); els.layoutHint.textContent = `${(l.text || '').split('\n')[0]} · depth ${e.z.toFixed(2)} · x ${e.x.toFixed(2)} · y ${e.y.toFixed(2)}${isPinned(l) ? ' · pinned to ' + (getTrack(l.track.id).name) : ''}`; }
    else if (k) els.layoutHint.textContent = `Camera key at ${k.t.toFixed(2)}s · ${(renderer.camDist - k.dolly).toFixed(2)} from video`;
    else els.layoutHint.textContent = layoutView.mode === 'top' ? 'Top view — drag words left/right and nearer/further; drag the camera to keyframe it at the playhead. Shift = one axis · wheel to zoom · guide lines show alignment.'
      : layoutView.mode === 'side' ? 'Side view — drag words up/down and nearer/further. Shift = one axis · wheel to zoom · guide lines show alignment.'
      : `Isometric view — drags move ${layoutView.isoPlane === 'height' ? 'up/down' : 'across the floor (left/right and nearer/further)'}; hold Ctrl for the other, Shift for one axis. Wheel to zoom.`;
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
    $('#isoPlane').classList.toggle('hidden', b.dataset.mode !== 'iso');
    updateLayoutHint();
  });
  $('#isoPlane').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#isoPlane button').forEach((x) => x.classList.toggle('on', x === b));
    layoutView.isoPlane = b.dataset.plane;
    updateLayoutHint();
  });
  $('#btnLayoutFit').addEventListener('click', () => { layoutView.fit(); layoutView.draw(); });
  $('#btnSnap').addEventListener('click', () => { setSnap(!state.snap); toast(state.snap ? `Snap on — positions land on a ${state.snapStep} grid (hold Alt to bypass)` : 'Snap off'); });
  $('#snapStep').addEventListener('change', (e) => { state.snapStep = Number(e.target.value) || 0.1; layoutView.gridStep = state.snapStep; if (layoutVisible()) layoutView.draw(); });
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
    if (selectedLayers().every(isMedia)) { toast('Text styles apply to words — select some text', true); return; }
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
  $('#fovSelect').addEventListener('change', (e) => { state.fov = Number(e.target.value); invalidate(); if (layoutVisible()) layoutView.draw(); scheduleAutosave(); });
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
    const shape = maskShapeAt(srcAtPlayhead()) || MASK_DEFAULT;
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
      state.mask.keys = [Camera.defaultKey(round(srcAtPlayhead(), 2), Object.assign({}, MASK_DEFAULT))];
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

  /* ---- motion tracking panel -------------------------------------------- */
  /* Recompute a shape's anchor from its points. Only while it is still being drawn or has never been
   * analysed: moving the anchor of a tracked shape would shift everything pinned to it. */
  function recentreShape(tr) {
    const pts = tr.ref.points || [];
    if (!pts.length) return;
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    tr.ref.x = round(cx / pts.length, 4);
    tr.ref.y = round(cy / pts.length, 4);
    const k = tr.keys.find((x) => Math.abs(x.t - tr.ref.t) < 1e-3) || tr.keys[0];
    if (k) { k.x = tr.ref.x; k.y = tr.ref.y; }
  }
  function finishShape(tr) {
    if (!tr.ref.points || tr.ref.points.length < 3) { toast('Click at least three points around the object', true); return; }
    tr.closed = true;
    if (!trackIsAuto(tr)) recentreShape(tr);
    syncTrackControls();
    commit();
    invalidate();
    toast(state.video.ready ? 'Shape closed — press Track motion' : 'Shape closed');
  }

  function trackStatusText(tr) {
    const auto = trackIsAuto(tr);
    if (!auto) {
      if (tr.mode === 'poly' && !tr.closed) return `${(tr.ref.points || []).length} points — drawing`;
      if (!tr.placed) return 'not marked yet';
      return tr.keys.length > 1 ? `${tr.keys.length} hand keys` : 'not tracked yet';
    }
    const ks = Camera.sorted(tr.keys);
    const fixes = tr.keys.filter((k) => k.manual).length - 1;
    return `${fmtTime(ks[0].t)}–${fmtTime(ks[ks.length - 1].t)}${fixes > 0 ? ` · ${fixes} fix${fixes > 1 ? 'es' : ''}` : ''}${tr.lost && (tr.lost.fwd || tr.lost.back) ? ' · lost ' + (tr.lost.fwd && tr.lost.back ? 'both ends' : tr.lost.fwd ? 'at the end' : 'at the start') : ''}`;
  }
  const TRACK_HELP = {
    box: 'Drag out a rectangle over a detailed part of the object (a logo, a screen corner). Wheel resizes it, drag a corner to reshape.',
    poly: 'Click points around the object; click the first point again (or double-click) to close the shape. Drag a point to adjust it.',
    point: 'Click the detail to follow. Everything textured near the point is used, so aim at a corner or a marking.',
  };
  function syncTrackControls() {
    const tr = selectedTrack();
    const list = $('#trackList');
    list.innerHTML = state.tracks.map((x) => `<div class="track-item${x.id === state.selectedTrackId ? ' on' : ''}" data-id="${x.id}"><i class="sw" style="background:${trackColorCss(x)}"></i><span class="tn">${escapeHtml(x.name)}</span><span class="ts">${escapeHtml(trackStatusText(x))}</span></div>`).join('');
    $('#trackFields').classList.toggle('hidden', !tr);
    $('#btnTrackText').disabled = !tr;
    if (tr) {
      const nameEl = $('#trackName');
      if (document.activeElement !== nameEl) nameEl.value = tr.name;
      $('#trackBoxW').value = tr.ref.w; $('#trackBoxWNum').value = Math.round(tr.ref.w * 100);
      $('#trackBoxH').value = tr.ref.h; $('#trackBoxHNum').value = Math.round(tr.ref.h * 100);
      $('#trackBoxFields').classList.toggle('hidden', tr.mode === 'poly');
      $('#btnTrackFinish').classList.toggle('hidden', !(tr.mode === 'poly' && !tr.closed));
      $('#trackHelp').textContent = `${TRACK_MODES[tr.mode] || 'Box'} · ${TRACK_HELP[tr.mode] || TRACK_HELP.box}`;
      $('#btnTrackRun').textContent = trackIsAuto(tr) ? 'Track again' : 'Track motion';
      const ready = trackReady(tr);
      $('#btnTrackRun').disabled = !state.video.ready || !!state.tracking || !ready;
      $('#btnTrackRun').title = !state.video.ready ? 'Tracking needs a video — without one, key the point by hand'
        : !ready ? 'Mark the object on the preview first' : 'Follow the marked object through the clip';
      $$('#trackModeNew button').forEach((b) => b.classList.toggle('on', b.dataset.mode === tr.mode));
      const sm = tr.smooth == null ? 0.3 : tr.smooth;
      $('#trackSmooth').value = sm;
      if (document.activeElement !== $('#trackSmoothNum')) $('#trackSmoothNum').value = Math.round(sm * 100);
    }
    $('#btnTrackAdjust').classList.toggle('on', !!state.trackEdit);
    els.canvas.classList.toggle('track-edit', !!state.trackEdit);
    $('#trackProgress').classList.toggle('hidden', !state.tracking);
    renderTrackRows();
  }
  $('#trackList').addEventListener('click', (e) => {
    const item = e.target.closest('.track-item');
    if (!item) return;
    selectTrack(item.dataset.id);
  });
  let newTrackMode = 'box';
  $('#trackModeNew').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    newTrackMode = b.dataset.mode;
    const tr = selectedTrack();
    // Switching mode on a tracker that has not been analysed re-marks it in the new way.
    if (tr && !trackIsAuto(tr)) {
      tr.mode = newTrackMode;
      tr.placed = false; tr.closed = false; tr.ref.points = [];
      state.trackEdit = true;
      clock.pause();
      commit();
    }
    syncTrackControls();
    invalidate();
    $$('#trackModeNew button').forEach((x) => x.classList.toggle('on', x.dataset.mode === newTrackMode));
  });
  $('#btnTrackFinish').addEventListener('click', () => { const tr = selectedTrack(); if (tr) finishShape(tr); });
  $('#trackSmooth').addEventListener('input', (e) => { const tr = selectedTrack(); if (!tr) return; tr.smooth = Number(e.target.value); $('#trackSmoothNum').value = Math.round(tr.smooth * 100); invalidate(); });
  $('#trackSmooth').addEventListener('change', () => commit());
  $('#trackSmoothNum').addEventListener('change', (e) => { const tr = selectedTrack(); if (!tr) return; tr.smooth = clamp((Number(e.target.value) || 0) / 100, 0, 1); syncTrackControls(); commit(); invalidate(); });

  /* "Find objects": texture clusters in the current frame, offered as boxes to click. */
  $('#btnTrackSuggest').addEventListener('click', () => {
    if (!state.video.ready) { toast('Load a video first — object detection looks at the footage', true); return; }
    if (state.tracking) return;
    clock.pause();
    let boxes = [];
    try { boxes = Tracker.suggestObjects(els.video, state.video.width, state.video.height, 6); } catch (e) { toast(e.message, true); return; }
    state.suggestions = boxes;
    state.trackEdit = false;
    syncTrackControls();
    invalidate();
    toast(boxes.length ? `${boxes.length} thing${boxes.length > 1 ? 's' : ''} worth tracking in this frame — click one on the preview to make a tracker` : 'Nothing clearly trackable in this frame — try another moment, or mark the object by hand', !boxes.length);
  });
  /* Turn a clicked proposal into a box tracker on this frame. */
  function adoptSuggestion(sg) {
    const tr = newTrack('box');
    tr.ref = { t: round(srcAtPlayhead(), 3), x: round(sg.x, 4), y: round(sg.y, 4), w: round(sg.w, 4), h: round(sg.h, 4), points: [] };
    tr.keys = [Camera.defaultKey(tr.ref.t, { x: tr.ref.x, y: tr.ref.y, s: 1, r: 0, manual: true, easing: 'linear' })];
    tr.placed = true;
    state.suggestions = [];
    state.selectedTrackId = tr.id;
    state.trackEdit = false;
    syncTrackControls();
    commit();
    invalidate();
    showTab('track');
    toast(`${tr.name} marked on the object — press Track motion`);
  }
  $('#btnNewTrack').addEventListener('click', () => {
    if (state.tracking) return;
    const tr = newTrack(newTrackMode);
    state.selectedTrackId = tr.id;
    state.trackEdit = true;
    clock.pause();
    syncTrackControls();
    commit();
    invalidate();
    toast(TRACK_HELP[tr.mode]);
  });
  $('#btnTrackAdjust').addEventListener('click', () => {
    const tr = selectedTrack();
    if (!tr) return;
    state.trackEdit = !state.trackEdit;
    if (state.trackEdit) clock.pause();
    syncTrackControls();
    invalidate();
    toast(state.trackEdit ? TRACK_HELP[tr.mode] : 'Back to editing text');
  });
  $('#trackName').addEventListener('input', (e) => { const tr = selectedTrack(); if (tr) { tr.name = e.target.value; renderTrackRows(); } });
  $('#trackName').addEventListener('change', () => { commit(); syncTrackControls(); refreshInspectorValues(); });
  const bindTrackBox = (id, field) => {
    const range = $(`#${id}`), num = $(`#${id}Num`);
    const write = (v, final) => { const tr = selectedTrack(); if (!tr) return; tr.ref[field] = round(clamp(v, 0.03, 0.6), 4); syncTrackControls(); invalidate(); if (final) commit(); };
    range.addEventListener('input', (e) => write(Number(e.target.value), false));
    range.addEventListener('change', (e) => write(Number(e.target.value), true));
    num.addEventListener('change', (e) => write((Number(e.target.value) || 0) / 100, true));
  };
  bindTrackBox('trackBoxW', 'w');
  bindTrackBox('trackBoxH', 'h');
  $('#btnTrackDelete').addEventListener('click', () => {
    const tr = selectedTrack();
    if (!tr || state.tracking) return;
    for (const l of state.layers) if (l.track && l.track.id === tr.id) pinLayer(l, null, clock.time);
    state.tracks = state.tracks.filter((x) => x !== tr);
    state.selectedTrackId = null; state.selectedTrackKeyId = null; state.trackEdit = false;
    syncTrackControls();
    commit();
    refreshAll();
  });
  $('#btnTrackPin').addEventListener('click', () => {
    const tr = selectedTrack();
    const targets = selectedLayers();
    if (!tr) return;
    if (!targets.length) { toast('Select the words to pin first (click them in the preview or timeline)', true); return; }
    for (const l of targets) { pinLayer(l, tr.id, clock.time); l._layout = null; }
    commit();
    refreshAll();
    toast(`${targets.length} word${targets.length > 1 ? 's' : ''} pinned to ${tr.name}`);
  });
  $('#btnTrackText').addEventListener('click', () => {
    const tr = selectedTrack();
    if (!tr) { toast('Create or pick a tracker first', true); return; }
    let t = clock.time;
    let dur = Math.min(5, duration() - t);
    if (dur < 0.5) { t = Math.max(0, duration() - 5); dur = duration() - t; }
    const l = addLayer({
      text: 'Pinned text', name: 'Pinned text', start: t, end: t + dur,
      style: { font: 'Instrument Serif', weight: 400, italic: true, size: 0.07, shadow: { blur: 0.05, x: 0, y: 0.02, color: '#000000', opacity: 0.6 } },
      transform: { x: 0, y: 0, z: 0.02, rx: 0, ry: 0, rz: 0, scale: 1 },
      split: 'word',
      anim: { in: { type: 'fade', duration: 0.25, easing: 'easeOut', stagger: 0.4, fit: true, hold: 0.6 }, out: { type: 'none', duration: 0.3, easing: 'easeIn', stagger: 0 }, loop: { type: 'none', speed: 1 } },
      track: { id: tr.id },
    });
    // sit just above the marked region rather than on top of it
    const a = anchorAt(tr.id, t);
    const sh = trackShapeAt(tr, t);
    const top = sh.pts.length ? Math.max(...sh.pts.map((q) => q.y)) - sh.anchor.y : 0.06;
    l.transform.y = round(((top * state.media.scale) + 0.06) / (a ? a.k : 1), 3);
    state.trackEdit = false;
    syncTrackControls();
    commit();
    refreshAll();
    focusTextInput();
    toast('Pinned — the words appear one by one and follow the tracker');
  });

  async function runTracking(tr) {
    if (!state.video.ready) { toast('Tracking needs a video', true); return; }
    if (state.tracking) return;
    clock.pause();
    const wasTime = clock.time;
    const controller = new AbortController();
    state.tracking = { controller, id: tr.id };
    state.trackEdit = false;
    syncTrackControls();
    const status = $('#trackStatus'), bar = $('#trackBarFill');
    bar.style.width = '0%';
    status.textContent = 'Reading the reference frame…';
    const preview = [];   // keys as they arrive, so the bar grows live
    try {
      const res = await Tracker.track({
        video: els.video, width: state.video.width, height: state.video.height,
        seek: seekVideo,
        region: { type: tr.mode, t: tr.ref.t, x: tr.ref.x, y: tr.ref.y, w: tr.ref.w, h: tr.ref.h, points: tr.ref.points },
        from: 0, to: Math.min(duration(), state.video.duration),
        signal: controller.signal,
        forceSeek: $('#trackStepEvery').checked,
        onProgress: (frac, key, dir) => {
          bar.style.width = `${Math.round(frac * 100)}%`;
          const rate = key.rate && key.rate !== 1 ? ` · ${key.rate}× speed` : '';
          status.textContent = key.reading ? `Reading frames · ${fmtTime(key.t)}${rate}`
            : `${dir > 0 ? 'Forwards' : 'Backwards'} · ${fmtTime(key.t)} · ${key.features || 0} features · ${Math.round((key.ncc || 0) * 100)}%${rate}`;
          preview.push(key);
        },
      });
      // a fresh analysis supersedes earlier corrections; only the reference frame stays a hand key
      tr.keys = Camera.sorted(res.keys.map((k) => Camera.defaultKey(k.t, { x: k.x, y: k.y, s: k.s, r: k.r || 0, manual: Math.abs(k.t - tr.ref.t) < 1e-4, easing: 'linear' })));
      tr.lost = { fwd: res.lostForward, back: res.lostBackward };
      tr.placed = true;
      const ks = tr.keys;
      const msg = `${tr.name}: tracked ${fmtTime(ks[0].t)}–${fmtTime(ks[ks.length - 1].t)} from ${res.stats.features} features`
        + ((res.lostForward || res.lostBackward) ? ' — lost the object where the bar ends; add a correction key there or re-mark it' : '');
      toast(msg);
      tr._stats = res.stats; tr._mode = res.mode;
    } catch (e) {
      if (e.name === 'AbortError') toast('Tracking cancelled');
      else toast(`Tracking failed: ${e.message}`, true);
    } finally {
      state.tracking = null;
      await seekVideo(wasTime);
      clock.time = wasTime;
      syncTrackControls();
      commit();
      refreshAll();
    }
  }
  $('#btnTrackRun').addEventListener('click', () => { const tr = selectedTrack(); if (tr) runTracking(tr); });
  $('#btnTrackCancel').addEventListener('click', () => { if (state.tracking) state.tracking.controller.abort(); });
  $('#btnDeleteTrackKey').addEventListener('click', deleteSelected);

  function syncMediaControls() {
    $('#bgColor').value = state.media.bg;
    $('#bgHex').value = state.media.bg;
    $('#mediaScale').value = state.media.scale;
    $('#mediaScaleNum').value = Math.round(state.media.scale * 100);
    $('#mediaX').value = state.media.x; $('#mediaXNum').value = Math.round(state.media.x * 100);
    $('#mediaY').value = state.media.y; $('#mediaYNum').value = Math.round(state.media.y * 100);
    $('#mediaZ').value = state.media.z || 0; $('#mediaZNum').value = round(state.media.z || 0, 2);
    $('#mediaOpacity').value = state.media.opacity == null ? 1 : state.media.opacity; $('#mediaOpacityNum').value = Math.round((state.media.opacity == null ? 1 : state.media.opacity) * 100);
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
  bindMediaRange('#mediaZ', '#mediaZNum', 'z', 1);
  bindMediaRange('#mediaOpacity', '#mediaOpacityNum', 'opacity', 100);
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
    dur = Math.min(dur, 3600 - start);
    const built = activeTemplate.build(text, start, dur, frameAspect(), { camDist: renderer.camDist, hasVideo: state.video.ready });
    const layers = Array.isArray(built) ? built : built.layers;
    const cameraKeys = Array.isArray(built) ? [] : (built.cameraKeys || []);
    if (!layers.length) { toast('Please enter some text first', true); return; }
    if ($('#tplReplace').checked) { state.layers = state.layers.filter(isMedia); state.camera.keys = []; }
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
    renderer.dropVideoTexture();
    const url = URL.createObjectURL(file);
    state.video = { file, url, width: 0, height: 0, duration: 0, ready: false };
    clock.pause();
    const v = els.video;
    v.muted = state.muted;
    v.loop = false;
    v.src = url;
    v.load();
    toast(`Loading ${file.name}…`);
  }
  function removeVideo() {
    if (!state.video.ready && !state.video.url) return;
    if (state.video.url) URL.revokeObjectURL(state.video.url);
    els.video.removeAttribute('src');
    els.video.load();
    renderer.dropVideoTexture();
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false, thumbs: [] };
    state.clips = state.clips.filter((c) => c.asset); state.selectedClipId = null;
    clock._t = Math.min(clock._t, duration());
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
    state.aspect = v.videoWidth / v.videoHeight;   // keep the canvas shape in step with the footage
    state.video.thumbs = [];
    const D = round(state.video.duration, 4);
    const others = state.clips.filter((c) => c.asset);
    if (pendingMainClips) {
      // a project being opened (or a video re-imported): its pieces of this video, checked against the real length
      const restored = normalizeClips(pendingMainClips.filter((c) => !c.asset), D, null);
      pendingMainClips = null;
      state.clips = others.concat(restored.length ? restored : [{ id: newClipId(), asset: null, in: 0, out: D, start: 0 }]);
    } else state.clips = others.concat([{ id: newClipId(), asset: null, in: 0, out: D, start: 0 }]);
    packClips();
    state.selectedClipId = null;
    v.loop = false;
    for (const l of state.layers) l._layout = null;
    $('#expAudioWrap').classList.remove('hidden');
    v.currentTime = 0;
    syncMediaControls();
    fitPreview();
    renderTimeline();
    refreshInspectorValues();
    commit();
    if (layoutVisible()) { layoutView.fitted = false; layoutView.draw(); }
    toast(`${state.video.file.name} · ${v.videoWidth}×${v.videoHeight} · ${fmtTime(v.duration)}`);
    makeThumbnails();
  });

  /* A strip of small frames for the clip bars. Seeks through the source once, then puts the playhead
   * back. `target` is state.video (the main footage) or another video on the footage track; jobs queue
   * so two sources are never seeked at once. */
  let thumbChain = Promise.resolve();
  function makeThumbnails(target) {
    thumbChain = thumbChain.then(() => makeThumbnailsNow(target || state.video)).catch(() => {});
    return thumbChain;
  }
  async function makeThumbnailsNow(target) {
    const isMain = target === state.video;
    if (isMain ? !state.video.ready : !target.ready) return;
    if (state.tracking || state.exporting || !target.url) return;
    const D = target.duration;
    const n = Math.min(24, Math.max(6, Math.round(D / 1.5)));
    const c = document.createElement('canvas');
    const h = 72, w = Math.max(16, Math.round((h * target.width) / Math.max(1, target.height)));
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const thumbs = [];
    const file = target.file;
    const stillHere = () => (isMain ? state.video.file === file : assets.get(target.id) === target);
    // Read the frames from a second, offscreen element: seeking the one the preview is showing would
    // jump the picture all over the clip and blank it between seeks.
    const v = await offscreenVideo(target.url);
    if (!v) return;
    try {
      for (let i = 0; i < n; i++) {
        if (!stillHere() || state.tracking || state.exporting) return;   // the video changed under us
        // Two decoders on one file compete for the machine. While the clip is playing, take the
        // frames slowly so the strip builds in the background without stuttering what is on screen.
        if (clock.playing) await new Promise((r) => setTimeout(r, 350));
        const t = (D * (i + 0.5)) / n;
        await seekEl(v, t);
        try { ctx.drawImage(v, 0, 0, w, h); thumbs.push({ t, url: c.toDataURL('image/jpeg', 0.6) }); } catch (e) { break; }
      }
    } finally {
      v.removeAttribute('src');
      v.load();
    }
    if (!stillHere()) return;
    target.thumbs = thumbs;
    renderVideoTrack();
  }
  /* A detached <video> on the same file, ready to be seeked. Resolves null if it cannot be opened. */
  function offscreenVideo(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'auto'; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
      let done = false;
      const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); resolve(ok ? v : null); };
      const timer = setTimeout(() => finish(false), 15000);
      v.addEventListener('loadeddata', () => finish(true), { once: true });
      v.addEventListener('error', () => finish(false), { once: true });
      v.src = url;
      v.load();
    });
  }
  watchVideoFrames(els.video);
  els.video.addEventListener('loadeddata', invalidate);
  els.video.addEventListener('seeked', invalidate);

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
  /* Another video on the footage track, placed after the last piece. */
  async function appendVideoFile(file) {
    if (!file) return;
    if (!hasFootage()) { loadVideoFile(file); return; }
    const id = `A${Math.random().toString(36).slice(2, 7)}`;
    toast(`Loading ${file.name}…`);
    try {
      const a = await loadAsset(id, file, 'video');
      a.name = file.name.replace(/\.[^.]+$/, '');
      a.thumbs = [];
      const c = { id: newClipId(), asset: id, in: 0, out: round(a.duration, 4), start: round(mainLen(), 4) };
      state.clips.push(c);
      sortClips();
      state.selectedClipId = c.id;
      select(null);
      commit();
      refreshAll();
      syncMedia(clock.time, clock.playing, true);
      toast(`${file.name} added after the footage — drag it along the track to move it`);
      makeThumbnails(a);
    } catch (e) { toast(e.message, true); }
  }
  $('#btnAppendVideo').addEventListener('click', () => $('#appendVideoInput').click());
  $('#btnAppendVideo2').addEventListener('click', () => $('#appendVideoInput').click());
  $('#appendVideoInput').addEventListener('change', (e) => { appendVideoFile(e.target.files[0]); e.target.value = ''; });
  $('#btnAddVideoLayer').addEventListener('click', () => $('#videoLayerInput').click());
  $('#btnAddImageLayer').addEventListener('click', () => $('#imageLayerInput').click());
  $('#btnAddAudioLayer').addEventListener('click', () => $('#audioLayerInput').click());
  $('#videoLayerInput').addEventListener('change', (e) => { addMediaFile(e.target.files[0], 'video'); e.target.value = ''; });
  $('#imageLayerInput').addEventListener('change', (e) => { addMediaFile(e.target.files[0], 'image'); e.target.value = ''; });
  $('#audioLayerInput').addEventListener('change', (e) => { addMediaFile(e.target.files[0], 'audio'); e.target.value = ''; });
  $('#relinkInput').addEventListener('change', (e) => { const l = pendingRelink; pendingRelink = null; if (l && e.target.files[0]) relinkMedia(l, e.target.files[0]); e.target.value = ''; });

  ['dragenter', 'dragover'].forEach((ev) => els.wrap.addEventListener(ev, (e) => { e.preventDefault(); els.dropHint.classList.add('active'); }));
  ['dragleave', 'drop'].forEach((ev) => els.wrap.addEventListener(ev, (e) => { e.preventDefault(); els.dropHint.classList.remove('active'); }));
  els.wrap.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.json')) loadProjectFile(file);
    else if ((file.type || '').startsWith('image/') || (file.type || '').startsWith('audio/') || state.video.ready) addMediaFile(file);
    else loadVideoFile(file);
  });

  /* ------------------------------------------------------------------ projects
   * Work lives in projects kept in this browser (IndexedDB) together with their media files. A project
   * exists from the moment you start one and is saved by itself a moment after every change, so
   * closing the tab, reloading, or an update of Perspective never loses anything. The home screen
   * lists them; a project can also be saved to / opened from a .json file. */
  const APP_BUILD = '2026-09-11.1';
  const project = { id: null, name: '', created: 0, loading: false, dirty: false, timer: 0, saving: null, savedFiles: new Set(), lastSaved: 0 };
  let pendingMainClips = null;   // pieces of the main video waiting for it to load (a project being opened)

  function projectData() {
    return {
      app: 'perspective-editor', version: 4,
      name: project.name,
      aspect: state.aspect, duration: state.duration, fov: state.fov,
      videoName: state.video.file ? state.video.file.name : null,
      videoWidth: state.video.ready ? state.video.width : null,
      videoHeight: state.video.ready ? state.video.height : null,
      camera: state.camera,
      media: state.media,
      mask: state.mask,
      tracks: state.tracks,
      clips: state.clips,
      layers: state.layers,
      assets: assetManifest(),
    };
  }
  /* Media files the project uses: the main video, media layers, and other videos on the footage track. */
  function assetManifest() {
    const list = [];
    if (state.video.file) list.push({ id: 'main', kind: 'video', name: state.video.file.name, type: state.video.file.type || '' });
    for (const l of state.layers) {
      const a = isMedia(l) ? assets.get(l.id) : null;
      if (a && a.file) list.push({ id: l.id, kind: a.kind, name: a.file.name, type: a.file.type || '' });
    }
    const seen = new Set();
    for (const c of state.clips) {
      if (!c.asset || seen.has(c.asset)) continue;
      seen.add(c.asset);
      const a = assets.get(c.asset);
      if (a && a.file) list.push({ id: c.asset, kind: 'video', name: a.file.name, type: a.file.type || '', clip: true });
    }
    return list;
  }
  function fileForAsset(id) {
    if (id === 'main') return state.video.file;
    const a = assets.get(id);
    return a ? a.file : null;
  }
  function captureThumb() {
    try {
      const src = els.canvas;
      if (!src.width || !src.height) return null;
      const w = 320, h = Math.max(1, Math.round((w * src.height) / src.width));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(src, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.7);
    } catch (e) { return null; }
  }
  function setSaveStatus(text, cls) {
    const el = $('#saveStatus');
    el.textContent = text;
    el.className = `save-status ${cls || ''}`;
  }
  const timeAgo = (ms) => {
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
    return new Date(ms).toLocaleDateString();
  };
  const safeName = (s) => (s || '').replace(/[^\w\- ]+/g, '').trim() || 'perspective-project';

  /* Save the open project now: its state, a thumbnail, and any media file not stored yet. */
  function saveNow(reason) {
    if (!project.id || project.loading) return Promise.resolve();
    if (project.saving) { project.dirty = true; return project.saving; }
    project.dirty = false;
    clearTimeout(project.timer);
    setSaveStatus('Saving…', 'saving');
    const id = project.id;
    project.saving = (async () => {
      try {
        const data = JSON.stringify(projectData(), stripper);
        const manifest = assetManifest();
        const rec = {
          id, name: project.name || 'Untitled project', created: project.created || Date.now(), updated: Date.now(), build: APP_BUILD,
          data, thumb: captureThumb(),
          summary: { length: playEnd(), layers: state.layers.filter((l) => !isMedia(l)).length, media: manifest.length, hasVideo: !!state.video.file, aspect: frameAspect() },
        };
        await Projects.put(rec);
        // media files: store the ones not stored yet, drop the ones no longer used
        const inUse = new Set();
        for (const m of manifest) {
          const key = `${id}/${m.id}`;
          inUse.add(key);
          if (project.savedFiles.has(key)) continue;
          const file = fileForAsset(m.id);
          if (!file) continue;
          await Projects.putFile({ key, project: id, asset: m.id, name: file.name, type: file.type || '', kind: m.kind, blob: file });
          project.savedFiles.add(key);
        }
        for (const key of Array.from(project.savedFiles)) if (!inUse.has(key)) { await Projects.deleteFile(key); project.savedFiles.delete(key); }
        project.lastSaved = Date.now();
        if (project.id === id) setSaveStatus(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'saved');
      } catch (e) {
        console.error(e);
        setSaveStatus('Could not save', 'error');
        toast(`Could not save the project: ${e.message}`, true);
      } finally {
        project.saving = null;
        if (project.dirty) scheduleAutosave();
      }
    })();
    return project.saving;
  }
  function scheduleAutosave() {
    if (!project.id || project.loading) return;
    project.dirty = true;
    setSaveStatus('Unsaved changes', 'dirty');
    clearTimeout(project.timer);
    project.timer = setTimeout(() => saveNow('auto'), 1200);
  }

  /* Empty the editor: no footage, layers, tracks or keys; the default camera; the open two-minute timeline. */
  function resetState() {
    clock.pause();
    if (state.video.url) URL.revokeObjectURL(state.video.url);
    els.video.removeAttribute('src'); els.video.load();
    renderer.dropVideoTexture();
    for (const a of assets.values()) { if (a.el && a.el.pause) a.el.pause(); renderer.dropMediaTexture(a.id); if (a.url) URL.revokeObjectURL(a.url); }
    assets.clear();
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false, thumbs: [] };
    state.layers = []; state.clips = []; state.tracks = []; state.suggestions = [];
    state.camera = defaultCamera(); state.media = defaultMedia(); state.mask = defaultMask();
    state.selectedIds = []; state.selectedKeyId = null; state.selectedMaskKeyId = null; state.selectedTrackId = null; state.selectedTrackKeyId = null; state.selectedClipId = null;
    state.maskEdit = false; state.trackEdit = false;
    state.aspect = 9 / 16; state.duration = 120; state.fov = 45;
    state.undo = []; state.redo = []; state.lastCommitted = snapshot();
    pendingMainClips = null;
    clock._t = 0;
    tl.zoom = null; tl.scroll = 0;
    updateUndoButtons();
    syncCameraControls(); syncMediaControls(); syncMaskControls(); syncTrackControls();
    $('#expAudioWrap').classList.add('hidden');
    fitPreview();
    refreshAll();
  }

  /* Put a saved project's data into the editor. The main video's pieces wait for it to load. */
  function applyProjectData(data) {
    if (!Array.isArray(data.layers)) throw new Error('Not a Perspective project');
    state.layers = data.layers.map((l) => { const m = Presets.deepMerge(Presets.defaultLayer(), l); m.id = m.id || uid(); return m; });
    state.camera = Object.assign(defaultCamera(), data.camera || {});
    if (data.camera && data.camera.sharpNear == null) { state.camera.sharpNear = 0.9; state.camera.sharpFar = 3.6; }
    if (state.camera.farFade >= 8 && state.camera.farFade < FADE_OFF) state.camera.farFade = FADE_OFF; // 8 used to mean "off"
    state.camera.keys = (state.camera.keys || []).map((k) => Camera.defaultKey(k.t || 0, k));
    state.media = Object.assign(defaultMedia(), data.media || {});
    state.mask = Object.assign(defaultMask(), data.mask || {});
    state.mask.keys = (state.mask.keys || []).map((k) => Camera.defaultKey(k.t || 0, k));
    state.tracks = (data.tracks || []).map((tr, i) => Object.assign(
      { name: `Tracker ${i + 1}`, color: TRACK_COLORS[i % TRACK_COLORS.length], mode: 'box', closed: true, lost: null, placed: true, smooth: 0.3 },
      tr,
      { ref: Object.assign({ t: 0, x: 0, y: 0, w: 0.14, h: 0.12, points: [] }, tr.ref), keys: (tr.keys || []).map((k) => Camera.defaultKey(k.t || 0, k)) },
    ));
    state.selectedTrackId = null; state.selectedTrackKeyId = null; state.trackEdit = false;
    const clips = Array.isArray(data.clips) ? data.clips : [];
    pendingMainClips = clips.some((c) => !c.asset) ? clips : null;
    // pieces of other videos whose files are already loaded stay; the main video's pieces return with it
    state.clips = normalizeClips(clips.filter((c) => c.asset && assets.has(c.asset)), null).map((c) => { const a = assets.get(c.asset); c.out = Math.min(c.out, a.duration || c.out); return c; });
    if (state.video.ready && pendingMainClips) {
      state.clips = state.clips.concat(normalizeClips(pendingMainClips.filter((c) => !c.asset), round(state.video.duration, 4), null));
      pendingMainClips = null;
      packClips();
    }
    if ((data.version || 1) < 3 && !data.media) state.media.locked = true; // older projects were built with a fixed backdrop
    if (data.videoWidth && data.videoHeight) state.aspect = data.videoWidth / data.videoHeight;
    else if (data.aspect) state.aspect = data.aspect;
    state.duration = Math.max(120, Number(data.duration) || 0);   // older projects were exactly as long as their content
    if (data.fov) state.fov = data.fov;
    state.selectedIds = []; state.selectedKeyId = null; state.selectedMaskKeyId = null; state.selectedClipId = null;
    state.undo = []; state.redo = []; state.lastCommitted = null;
    commit();
    syncCameraControls();
    syncMediaControls();
    syncMaskControls();
    syncTrackControls();
    fitPreview();
    refreshAll();
  }

  function aspectToLabel(a) {
    const map = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 0.8 };
    let best = '16:9', bd = Infinity;
    for (const [k, v] of Object.entries(map)) { const d = Math.abs(v - a); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function exportProjectFile() {
    const blob = new Blob([JSON.stringify(projectData(), stripper, 2)], { type: 'application/json' });
    saveFile(blob, `${safeName(project.name)}.json`);
    if (!downloadsCap) toast('Project file saved — media is not embedded; it stays in this browser\'s project store');
  }
  function untitledName(list) {
    const used = new Set(list.map((p) => p.name));
    for (let n = 1; ; n++) { const nm = n === 1 ? 'Untitled project' : `Untitled project ${n}`; if (!used.has(nm)) return nm; }
  }
  function beginProject(id, name, created) {
    project.loading = true;
    resetState();
    project.id = id; project.name = name; project.created = created || Date.now();
    project.savedFiles = new Set();
    $('#projectName').value = project.name;
  }
  async function newProject(opts = {}) {
    const list = await Projects.list();
    beginProject(Projects.newId(), opts.name || untitledName(list));
    if (opts.demo) {
      const demo = Presets.TEMPLATES.find((t) => t.id === 'reveal');
      const built = demo.build(demo.sample, 0.2, 6, frameAspect(), { camDist: renderer.camDist, hasVideo: false });
      for (const l of built.layers) addLayer(l, { select: false });
      state.camera.keys = built.cameraKeys || [];
      if (built.cameraSettings) Object.assign(state.camera, built.cameraSettings);
      if (built.mediaSettings) Object.assign(state.media, built.mediaSettings);
      state.media.bg = '#141419';
      state.selectedIds = [];
      state.lastCommitted = snapshot();
      syncCameraControls(); syncMediaControls();
    }
    project.loading = false;
    hideHome();
    showTab('media');
    refreshAll();
    clock.time = 0;
    if (opts.demo) clock.play();
    await saveNow('new');
    toast(opts.demo ? 'New project from the demo — it saves itself as you work' : 'New project — import a video or add text; it saves itself as you work');
  }
  async function openProject(id) {
    const rec = await Projects.get(id);
    if (!rec) { toast('That project is no longer here', true); renderHome(); return; }
    let data;
    try { data = JSON.parse(rec.data); } catch (e) { toast('This project cannot be read', true); return; }
    beginProject(rec.id, rec.name || 'Untitled project', rec.created);
    hideHome();
    try {
      const files = await Projects.filesOf(id);
      for (const f of files) project.savedFiles.add(f.key);
      const byAsset = new Map(files.map((f) => [f.asset || f.key.slice(id.length + 1), f]));
      const asFile = (f, fallback) => (f.blob instanceof File ? f.blob : new File([f.blob], f.name || fallback || 'media', { type: f.type || '' }));
      // media layers and other videos on the footage track load first, so their pieces are kept
      for (const m of data.assets || []) {
        if (m.id === 'main') continue;
        const f = byAsset.get(m.id);
        if (!f || !f.blob) continue;
        try {
          const a = await loadAsset(m.id, asFile(f, m.name), m.kind || 'video');
          a.name = (f.name || m.name || 'Video').replace(/\.[^.]+$/, '');
          a.thumbs = [];
        } catch (e) { /* the layer shows "file not loaded" and can be relinked */ }
      }
      applyProjectData(data);
      for (const l of state.layers) { const a = isMedia(l) ? assets.get(l.id) : null; if (a) l.media = Object.assign({}, l.media, { width: a.width, height: a.height, duration: a.duration }); }
      const main = byAsset.get('main');
      if (main && main.blob) loadVideoFile(asFile(main, data.videoName));
      else if (data.videoName) toast(`Re-import "${data.videoName}" to see the video — its pieces are kept`);
      for (const c of state.clips) { const a = clipSource(c); if (a && a.ready && !(a.thumbs && a.thumbs.length)) makeThumbnails(a); }
    } catch (e) {
      console.error(e);
      toast(`Could not open the project completely: ${e.message}`, true);
    } finally {
      project.loading = false;
    }
    setSaveStatus(`Saved ${timeAgo(rec.updated || Date.now())}`, 'saved');
    refreshAll();
  }
  /* A .json project file becomes a new project (its media is re-imported by hand). */
  async function loadProjectFile(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.layers)) throw new Error('Not a Perspective project');
      const list = await Projects.list();
      beginProject(Projects.newId(), data.name || file.name.replace(/\.json$/i, '') || untitledName(list));
      try { applyProjectData(data); } finally { project.loading = false; }
      hideHome();
      refreshAll();
      await saveNow('import');
      toast(`Opened ${project.name}${data.videoName ? ' — re-import the video; its pieces are kept' : ''}`);
    } catch (e) {
      project.loading = false;
      toast(`Could not open project: ${e.message}`, true);
    }
  }
  async function renameProject(id, name) {
    name = (name || '').trim();
    if (!name) return;
    if (id === project.id) { project.name = name; $('#projectName').value = name; await saveNow('rename'); return; }
    const rec = await Projects.get(id);
    if (rec) { rec.name = name; await Projects.put(rec); }
  }
  async function deleteProject(id) {
    await Projects.remove(id);
    if (id === project.id) { project.id = null; project.name = ''; project.dirty = false; clearTimeout(project.timer); }
    renderHome();
  }
  async function duplicateProject(id) {
    if (id === project.id) await saveNow('dup');
    const rec = await Projects.get(id);
    if (!rec) return;
    const copy = Object.assign({}, rec, { id: Projects.newId(), name: `${rec.name} copy`, created: Date.now(), updated: Date.now() });
    await Projects.put(copy);
    await Projects.copyFiles(id, copy.id);
    renderHome();
  }
  async function exportStoredProject(id) {
    if (id === project.id) { exportProjectFile(); return; }
    const rec = await Projects.get(id);
    if (rec) saveFile(new Blob([rec.data], { type: 'application/json' }), `${safeName(rec.name)}.json`);
  }

  /* ---- home screen ---- */
  const home = $('#home');
  function hideHome() {
    home.classList.add('hidden');
    document.body.classList.remove('at-home');
    requestAnimationFrame(() => { fitPreview(); renderTimeline(); if (layoutVisible()) { layoutView.resize(); layoutView.draw(); } });
  }
  async function goHome() {
    clock.pause();
    if (project.id) await saveNow('home');
    await renderHome();
    home.classList.remove('hidden');
    document.body.classList.add('at-home');
  }
  async function renderHome() {
    const list = await Projects.list();
    const host = $('#homeList');
    $('#homeEmpty').classList.toggle('hidden', list.length > 0);
    $('#homeStore').textContent = Projects.usingMemory() ? 'This browser window cannot keep projects between visits (storage is unavailable) — save a project file to keep one.' : '';
    $('#btnHomeBack').classList.toggle('hidden', !project.id);
    host.innerHTML = list.map((p) => {
      const s = p.summary || {};
      const meta = [s.length ? fmtTime(s.length).slice(0, 5) : null, s.layers ? `${s.layers} word${s.layers > 1 ? 's' : ''}` : null, s.hasVideo ? 'video' : null].filter(Boolean).join(' · ');
      const cur = p.id === project.id;
      return `<div class="proj${cur ? ' current' : ''}" data-id="${p.id}">
        <button class="proj-thumb${s.aspect > 1 ? ' wide' : ''}" data-open="${p.id}" title="Open">${p.thumb ? `<img src="${p.thumb}" alt="">` : '<span class="proj-blank">P</span>'}</button>
        <div class="proj-body">
          <div class="proj-name" title="${escapeHtml(p.name || '')}">${escapeHtml(p.name || 'Untitled project')}${cur ? ' <em>· open</em>' : ''}</div>
          <div class="proj-meta muted">${escapeHtml(meta || 'empty')} · ${timeAgo(p.updated || p.created || Date.now())}</div>
        </div>
        <div class="proj-actions">
          <button class="btn small primary" data-open="${p.id}">Open</button>
          <button class="btn small ghost" data-rename="${p.id}" title="Rename">Rename</button>
          <button class="btn small ghost" data-dup="${p.id}" title="Make a copy">Duplicate</button>
          <button class="btn small ghost" data-export="${p.id}" title="Save a copy as a .json file">File</button>
          <button class="btn small ghost danger" data-del="${p.id}" title="Delete">Delete</button>
        </div></div>`;
    }).join('');
  }
  $('#homeList').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.open) openProject(b.dataset.open);
    else if (b.dataset.rename) { const rec = await Projects.get(b.dataset.rename); const nm = prompt('Project name', rec ? rec.name : ''); if (nm != null) { await renameProject(b.dataset.rename, nm); renderHome(); } }
    else if (b.dataset.dup) duplicateProject(b.dataset.dup);
    else if (b.dataset.export) exportStoredProject(b.dataset.export);
    else if (b.dataset.del) { const rec = await Projects.get(b.dataset.del); if (rec && confirm(`Delete "${rec.name}"? This cannot be undone.`)) deleteProject(b.dataset.del); }
  });
  $('#btnNewProject').addEventListener('click', () => newProject());
  $('#btnNewDemo').addEventListener('click', () => newProject({ demo: true }));
  $('#btnHomeOpenFile').addEventListener('click', () => $('#projectInput').click());
  $('#btnHomeBack').addEventListener('click', () => { if (project.id) hideHome(); });
  $('#btnHome').addEventListener('click', goHome);
  $('#btnSave').addEventListener('click', async () => { await saveNow('manual'); toast('Project saved'); });
  $('#btnSaveFile').addEventListener('click', exportProjectFile);
  $('#btnLoad').addEventListener('click', () => $('#projectInput').click());
  $('#projectInput').addEventListener('change', (e) => { if (e.target.files[0]) loadProjectFile(e.target.files[0]); e.target.value = ''; });
  $('#projectName').addEventListener('change', (e) => renameProject(project.id, e.target.value || project.name));
  $('#projectName').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  // whatever happens to the tab, the last change is written out
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && project.dirty) saveNow('hidden'); });
  window.addEventListener('pagehide', () => { if (project.dirty) saveNow('pagehide'); });

  /* ------------------------------------------------------------------ transport & tabs */
  $('#btnAddText').addEventListener('click', addBlankText);
  els.btnPlay.addEventListener('click', () => clock.toggle());
  /* Cut a layer in two at time t; the second piece continues where the first stopped. */
  function splitLayerAt(l, t) {
    if (!(t > l.start + 0.1 && t < l.end - 0.1)) return null;
    const copy = JSON.parse(JSON.stringify(l, stripper));
    copy.id = uid();
    copy.start = round(t, 3);
    if (isMedia(l) && l.kind !== 'image') copy.srcIn = round((l.srcIn || 0) + (t - l.start), 3);
    l.end = round(t, 3);
    state.layers.splice(state.layers.indexOf(l) + 1, 0, copy);
    if (isMedia(l)) cloneAsset(l.id, copy.id);
    return copy;
  }
  const splitHere = () => {
    clock.pause();
    const t = clock.time;
    const targets = selectedLayers();
    if (targets.length) {
      const made = targets.map((l) => splitLayerAt(l, t)).filter(Boolean);
      if (!made.length) { toast('Move the playhead inside the selected layer to split it', true); return; }
      state.selectedIds = made.map((c) => c.id);
      commit(); refreshAll(); syncMedia(t, false, true);
      toast(`Split ${made.length} layer${made.length > 1 ? 's' : ''} at ${fmtTime(t)}`);
      return;
    }
    if (!hasFootage()) { toast('Select a layer, or load a video, to split at the playhead', true); return; }
    if (splitClipAt(t)) { commit(); renderTimeline(); toast(`Split at ${fmtTime(t)} — drag the ends of a piece to trim it, Delete removes it`); }
  };
  $('#btnSplit').addEventListener('click', splitHere);
  $('#btnSplit2').addEventListener('click', splitHere);
  $('#btnStepBack').addEventListener('click', () => { clock.pause(); clock.time = clock.time - 1 / 30; });
  $('#btnStepFwd').addEventListener('click', () => { clock.pause(); clock.time = clock.time + 1 / 30; });
  $('#btnLoop').addEventListener('click', (e) => { state.loop = !state.loop; e.currentTarget.classList.toggle('active', state.loop); });
  $('#btnMute').addEventListener('click', (e) => { state.muted = !state.muted; syncMedia(clock.time, clock.playing, false); e.currentTarget.classList.toggle('active', state.muted); e.currentTarget.title = state.muted ? 'Unmute' : 'Mute'; });
  $('#aspectSelect').addEventListener('change', (e) => {
    const [w, h] = e.target.value.split(':').map(Number);
    state.aspect = w / h;
    fitPreview();
    if (layoutVisible()) layoutView.draw();
    scheduleAutosave();
  });
  $('#durationInput').addEventListener('change', (e) => {
    state.duration = clamp(Number(e.target.value) || 120, 10, 3600);
    e.target.value = state.duration;
    if (clock.time > duration()) clock.time = 0;
    tl.zoom = null;
    scheduleAutosave();
    refreshAll();
  });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);

  function showTab(name) {
    $$('.tab', $('#leftTabs')).forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    for (const n of ['media', 'text', 'camera', 'track', 'mask']) $(`#tab-${n}`).classList.toggle('hidden', n !== name);
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
    $('#expEnd').value = round(playEnd(), 2);
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
      audio: hasFootage() && $('#expAudio').checked,
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

  function seekVideo(t) { return seekEl(els.video, t); }
  function seekEl(v, t) {
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
      if (!realtime) {
        const seeks = [];
        const loc = locate(t);
        if (loc.clip && clipReady(loc.clip)) seeks.push(seekEl(clipEl(loc.clip), loc.src));
        for (const l of state.layers) {
          if (!isMedia(l) || l.kind !== 'video' || l.hidden) continue;
          const a = assets.get(l.id), st = mediaSrcTime(l, t);
          if (a && a.ready && st != null) seeks.push(seekEl(a.el, st));
        }
        await Promise.all(seeks);
      }
      renderer.render(Object.assign(videoForRender(t), {
        layers: state.layers, time: t, frameHeightPx: cfg.h, selectedIds: [], camera: cameraAt(t), media,
        mask: maskForRender(t), showMask: false,
        trackTransform: (l) => (isPinned(l) ? effectiveTransform(l, t) : null),
        mediaFor: (l) => assets.get(l.id) || null,
      }));
    };

    const t0 = performance.now();
    try {
      let result;
      const common = { canvas: els.canvas, width: cfg.w, height: cfg.h, fps: cfg.fps, start: cfg.start, end: cfg.end, quality: cfg.quality, renderFrame, onProgress, signal: abort.signal };
      if (Exporter.hasWebCodecs()) {
        // the audio for a clip-edited timeline is the pieces of source audio the range covers, joined
        const segs = [];
        const byFile = new Map();
        for (const c of state.clips) {
          const file = c.asset ? (clipSource(c) && clipSource(c).file) : state.video.file;
          if (!file) continue;
          const lo = Math.max(cfg.start, c.start), hi = Math.min(cfg.end, clipEnd(c));
          if (hi <= lo) continue;
          const piece = { in: c.in + (lo - c.start), out: c.in + (hi - c.start), at: lo - cfg.start };
          if (!c.asset) segs.push(piece);
          if (!byFile.has(file)) byFile.set(file, []);
          byFile.get(file).push(piece);
        }
        // ...and every media layer with sound, placed where it sits on the timeline
        const sources = [];
        for (const [file, pieces] of byFile) sources.push({ file, gain: 1, pieces });
        for (const l of state.layers) {
          if (!isMedia(l) || l.kind === 'image' || l.hidden || l.muted) continue;
          const a = assets.get(l.id);
          if (!a || !a.file) continue;
          const lo = Math.max(cfg.start, l.start), hi = Math.min(cfg.end, l.end);
          if (hi <= lo) continue;
          sources.push({ file: a.file, gain: l.volume == null ? 1 : l.volume, pieces: [{ in: (l.srcIn || 0) + (lo - l.start), out: (l.srcIn || 0) + (hi - l.start), at: lo - cfg.start }] });
        }
        result = await Exporter.exportWebCodecs(Object.assign(common, { audioFile: state.video.file, includeAudio: cfg.audio, fileHandle, audioSegments: segs, audioSources: sources }));
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
    if (!home.classList.contains('hidden')) return;   // the home screen has no editor shortcuts
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow('manual').then(() => toast('Project saved')); return; }
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
      case 'Escape':
        if (state.suggestions.length) { state.suggestions = []; invalidate(); }
        else if (state.trackEdit) { state.trackEdit = false; syncTrackControls(); invalidate(); }
        else select(null);
        break;
      case 'Enter': {
        const tr = state.trackEdit ? selectedTrack() : null;
        if (tr && tr.mode === 'poly' && !tr.closed) { e.preventDefault(); finishShape(tr); }
        break;
      }
      case 'Delete': case 'Backspace': {
        // While drawing a shape, Backspace takes back the last point.
        const tr = state.trackEdit ? selectedTrack() : null;
        if (tr && tr.mode === 'poly' && !tr.closed && (tr.ref.points || []).length) {
          e.preventDefault();
          tr.ref.points.pop();
          if (!trackIsAuto(tr)) recentreShape(tr);
          syncTrackControls();
          invalidate();
          break;
        }
        if (targets.length || state.selectedKeyId || state.selectedMaskKeyId || state.selectedTrackKeyId || state.selectedClipId) { e.preventDefault(); deleteSelected(); }
        break;
      }
      case 'Home': clock.pause(); clock.time = 0; break;
      case 'End': clock.pause(); clock.time = playEnd(); break;
      case ',': clock.pause(); clock.time = clock.time - 1 / 30; break;
      case '.': clock.pause(); clock.time = clock.time + 1 / 30; break;
      case 't': case 'T': addBlankText(); break;
      case 'g': case 'G': if (!mod) { setSnap(!state.snap); toast(state.snap ? `Snap on (${state.snapStep} grid)` : 'Snap off'); } break;
      case 's': case 'S': if (!mod) splitHere(); break;
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
    buildSections(TRACK_KEY_SCHEMA, $('#trackKeySections'), trackKeyCtx);
    buildSections(MEDIA_SCHEMA, $('#mediaSections'), Object.assign(Object.create(layerCtx), { controls: layerCtx.mediaControls }));
    new ResizeObserver(() => { measureTimeline(); fitPreview(); renderTimeline(); if (layoutVisible()) { layoutView.resize(); layoutView.draw(); } }).observe(els.views);
    new ResizeObserver(() => { measureTimeline(); updateTimeUI(); }).observe(els.timeline);
    fitPreview();

    state.selectedIds = [];
    state.lastCommitted = snapshot();
    updateUndoButtons();
    syncCameraControls();
    syncMediaControls();
    syncMaskControls();
    syncTrackControls();
    refreshAll();
    updatePlayButton();
    setView('split');
    requestAnimationFrame(frame);
    startAtHome();
  }
  /* Launch on the home screen with every project. After an update of Perspective, say so — everything
   * was saved as it was worked on, and the projects are all there. */
  async function startAtHome() {
    let lastBuild = null;
    try { lastBuild = localStorage.getItem('perspective.build'); localStorage.setItem('perspective.build', APP_BUILD); } catch (e) { /* storage may be blocked */ }
    const list = await Projects.list();
    $('#homeBanner').classList.toggle('hidden', !(lastBuild && lastBuild !== APP_BUILD && list.length));
    await goHome();
  }
  init();
  // Debug / automation hook (read-only use).
  window.__perspective = { state, renderer, cameraAt, clock, layoutView, maskForRender, trackAt, effectiveTransform, runTracking, pinLayer, newTrack, seekVideo, invalidate, trackShapeAt, finishShape, syncTrackControls, refreshAll, assets, addMediaFile, mainLen, duration, playEnd, contentEnd, locate, syncMedia, splitLayerAt, appendVideoFile, settleClip, project, saveNow, newProject, openProject, goHome, renderHome, resetState, tl, setTimelineZoom, loadVideoFile, commit };
})();
