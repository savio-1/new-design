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
    tracks: [],           // motion trackers: { id, name, color, ref: {t,x,y,w,h}, keys: [{id,t,x,y,s,manual}], lost: {fwd,back} }
    selectedTrackId: null,    // tracker being edited in the Media panel
    selectedTrackKeyId: null, // selected tracker keyframe (exclusive with the other selections)
    trackEdit: false,     // dragging on the preview places / corrects the selected tracker
    tracking: null,       // { controller } while a tracker is being analysed
    suggestions: [],      // object proposals shown on the preview after "Find objects" 
    video: { file: null, url: null, width: 0, height: 0, duration: 0, ready: false, thumbs: [] },
    clips: [],            // pieces of the source video laid end to end: { id, in, out } in source seconds
    selectedClipId: null,
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
    if (!state.video.ready) return state.duration;
    return state.clips.length ? state.clips.reduce((a, c) => a + (c.out - c.in), 0) : state.video.duration;
  }

  /* ---- clips ---------------------------------------------------------------
   * The timeline is the clips laid end to end. Text and camera keys live in TIMELINE time; anything
   * bound to the footage (tracks, the subject mask) lives in SOURCE time and is mapped through here. */
  const clipLen = (c) => c.out - c.in;
  function clipStart(i) { let a = 0; for (let k = 0; k < i; k++) a += clipLen(state.clips[k]); return a; }
  /* Which clip a timeline time falls in, and the source time there. */
  function locate(t) {
    const cs = state.clips;
    if (!cs.length) return { clip: null, index: -1, src: t, start: 0 };
    let acc = 0;
    for (let i = 0; i < cs.length; i++) {
      const len = clipLen(cs[i]);
      if (t < acc + len - 1e-6 || i === cs.length - 1) {
        return { clip: cs[i], index: i, start: acc, src: clamp(cs[i].in + (t - acc), cs[i].in, cs[i].out - 1e-4) };
      }
      acc += len;
    }
    return { clip: cs[cs.length - 1], index: cs.length - 1, start: acc, src: cs[cs.length - 1].out - 1e-4 };
  }
  const srcTime = (t) => (state.clips.length ? locate(t).src : t);
  /* Every timeline time at which a source time is shown (a piece can be used more than once). */
  function timelineTimesOf(src) {
    if (!state.clips.length) return [src];
    const out = [];
    let acc = 0;
    for (const c of state.clips) {
      if (src >= c.in - 1e-6 && src <= c.out + 1e-6) out.push(acc + (src - c.in));
      acc += clipLen(c);
    }
    return out;
  }
  function splitClipAt(t) {
    const loc = locate(t);
    if (!loc.clip) return false;
    const c = loc.clip;
    if (loc.src - c.in < 0.1 || c.out - loc.src < 0.1) { toast('Move the playhead a little further from the cut'); return false; }
    const right = { id: `C${Math.random().toString(36).slice(2, 7)}`, in: round(loc.src, 4), out: c.out };
    c.out = round(loc.src, 4);
    state.clips.splice(loc.index + 1, 0, right);
    state.selectedClipId = right.id;
    return true;
  }
  function deleteClip(id) {
    if (state.clips.length <= 1) { toast('That is the only piece of video — trim it instead', true); return false; }
    const i = state.clips.findIndex((c) => c.id === id);
    if (i < 0) return false;
    const t = clock.time;
    state.clips.splice(i, 1);
    state.selectedClipId = null;
    afterClipsChanged(Math.min(t, duration() - 0.01));
    return true;
  }
  /* Keep everything on the timeline inside the new length, and re-seat the playhead. */
  function afterClipsChanged(t) {
    const T = duration();
    for (const l of state.layers) { l.end = Math.min(l.end, T); l.start = Math.min(l.start, Math.max(0, l.end - 0.1)); }
    clampCameraKeys(T);
    clock.time = clamp(t == null ? clock.time : t, 0, T);
    els.video.loop = false;
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
    _t: 0, _playing: false, _last: 0, _clip: 0,
    get time() {
      if (!state.video.ready) return this._t;
      if (!state.clips.length) return els.video.currentTime;
      const i = clamp(this._clip, 0, state.clips.length - 1), c = state.clips[i];
      return clipStart(i) + clamp(els.video.currentTime - c.in, 0, clipLen(c));
    },
    set time(v) {
      v = clamp(v, 0, duration());
      if (state.video.ready) {
        const loc = locate(v);
        if (loc.clip) this._clip = loc.index;
        els.video.currentTime = loc.src;
      } else this._t = v;
      invalidate();
    },
    get playing() { return state.video.ready ? !(els.video.paused || els.video.ended) : this._playing; },
    play() {
      if (state.video.ready) {
        if (els.video.ended || this.time >= duration() - 0.01) this.time = 0;
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
      if (state.video.ready) {
        // Jump across clip boundaries while playing; the <video> itself only knows the source.
        if (!state.clips.length || els.video.paused) return;
        const i = clamp(this._clip, 0, state.clips.length - 1), c = state.clips[i];
        if (els.video.currentTime >= c.out - 0.02 || els.video.ended) {
          if (i + 1 < state.clips.length) { this._clip = i + 1; els.video.currentTime = state.clips[i + 1].in; }
          else if (state.loop) { this._clip = 0; els.video.currentTime = state.clips[0].in; if (els.video.ended) els.video.play().catch(() => {}); }
          else { els.video.pause(); els.video.currentTime = c.out - 1e-3; updatePlayButton(); }
        }
        return;
      }
      if (!this._playing) return;
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
    const shape = maskShapeAt(srcTime(t)) || MASK_DEFAULT;
    return Object.assign({ enabled: true, roundness: state.mask.roundness, feather: state.mask.feather }, shape);
  }
  /* The mask key at the playhead, creating one from the current shape when there is none. */
  function maskKeyAtPlayhead() {
    const t = round(srcTime(clock.time), 2);
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
    const v = trackAtSource(tr, srcTime(t));
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
      z: tr.z, rx: tr.rx, ry: tr.ry, rz: tr.rz + deg, scale: tr.scale * a.k,
    };
  }
  /* Pin a layer to a track (or unpin with null) without letting it move on screen at time t. */
  function pinLayer(l, trackId, t) {
    const abs = effectiveTransform(l, t);
    const rotate = l.track ? l.track.rotate : true;
    l.track = { id: trackId && getTrack(trackId) ? trackId : null, rotate: rotate == null ? true : rotate };
    if (!l.track.id) {
      Object.assign(l.transform, { x: round(abs.x, 4), y: round(abs.y, 4), rz: round(abs.rz, 3), scale: round(abs.scale, 4) });
      return;
    }
    const a = anchorAt(trackId, t);
    const deg = followsRotation(l) ? a.deg : 0;
    const rad = (-deg * Math.PI) / 180, c = Math.cos(rad), sn = Math.sin(rad);
    const dx = (abs.x - a.x) / a.k, dy = (abs.y - a.y) / a.k;
    l.transform.x = round(c * dx - sn * dy, 4);
    l.transform.y = round(sn * dx + c * dy, 4);
    l.transform.rz = round(abs.rz - deg, 3);
    l.transform.scale = round(abs.scale / a.k, 4);
  }
  let nextTrack = 1;
  function newTrack(mode) {
    const color = TRACK_COLORS[(state.tracks.length) % TRACK_COLORS.length];
    const t = round(srcTime(clock.time), 3);
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
    const t = round(srcTime(clock.time), 3);
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
      trackTransform: (l) => (isPinned(l) ? effectiveTransform(l, time) : null),
      outlines: trackOutlines(time),
    });
  }

  function frame(now) {
    if (!state.exporting && !state.tracking) {   // while a tracker runs, the frame budget belongs to it
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
  }
  function restore(snap) {
    const data = JSON.parse(snap);
    state.layers = data.layers;
    state.camera = Object.assign(defaultCamera(), data.camera || {});
    state.media = Object.assign(defaultMedia(), data.media || {});
    state.mask = Object.assign(defaultMask(), data.mask || {});
    state.tracks = data.tracks || [];
    if (state.video.ready && data.clips && data.clips.length) { state.clips = data.clips; afterClipsChanged(); }
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
    els.camTrack.innerHTML = html;
  }

  /* A span [a, b] in SOURCE time drawn on the timeline: one bar per clip that shows part of it. */
  function sourceSpanBars(a, b, cls, style) {
    const T = duration();
    if (!state.clips.length) return `<div class="${cls}" style="left:${(a / T) * 100}%; width:${Math.max(0.2, ((b - a) / T) * 100)}%; ${style}"></div>`;
    let html = '', acc = 0;
    for (const c of state.clips) {
      const lo = Math.max(a, c.in), hi = Math.min(b, c.out);
      if (hi > lo) html += `<div class="${cls}" style="left:${((acc + lo - c.in) / T) * 100}%; width:${Math.max(0.2, ((hi - lo) / T) * 100)}%; ${style}"></div>`;
      acc += clipLen(c);
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
    $('#maskTrack').innerHTML = html;
  }

  function renderVideoTrack() {
    const host = $('#videoTrack');
    if (!host) return;
    if (!state.video.ready || !state.clips.length) { host.innerHTML = ''; return; }
    const T = duration();
    const trackW = host.clientWidth || 600;
    let html = '', acc = 0;
    const name = state.video.file ? state.video.file.name.replace(/\.[^.]+$/, '') : 'Video';
    state.clips.forEach((c, i) => {
      const len = clipLen(c);
      const left = (acc / T) * 100, width = (len / T) * 100;
      const pxW = (len / T) * trackW;
      // thumbnails whose source time falls inside this piece, spaced by time
      const thumbH = 34, thumbW = Math.round((thumbH * state.video.width) / Math.max(1, state.video.height));
      const thumbs = state.video.thumbs.filter((th) => th.t >= c.in && th.t <= c.out)
        .map((th) => `<img src="${th.url}" style="left:${Math.round(((th.t - c.in) / len) * pxW - thumbW / 2)}px" alt="">`).join('');
      html += `<div class="tl-clip${c.id === state.selectedClipId ? ' selected' : ''}" data-id="${c.id}" style="left:${left}%; width:${width}%" title="${escapeHtml(name)} · ${fmtTime(c.in)} – ${fmtTime(c.out)} (${fmtTime(len)})">
        <div class="thumbs">${thumbs}</div>
        <span class="lbl">${state.clips.length > 1 ? `${i + 1} · ` : ''}${fmtTime(c.in)}–${fmtTime(c.out)}</span>
        <div class="h l"></div><div class="h r"></div></div>`;
      acc += len;
    });
    host.innerHTML = html;
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
        <div class="tl-track">${row}</div></div>`;
    }
    host.innerHTML = html;
  }

  function renderTimeline() {
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

    // Video clips: click selects, edges trim, double-click splits
    const videoTrack = $('#videoTrack');
    videoTrack.addEventListener('pointerdown', (e) => {
      const clipEl = e.target.closest('.tl-clip');
      if (!clipEl) { clock.time = timeFromEvent(e); drag = { mode: 'scrub' }; videoTrack.setPointerCapture(e.pointerId); return; }
      const c = state.clips.find((x) => x.id === clipEl.dataset.id);
      if (!c) return;
      if (state.selectedClipId !== c.id) { state.selectedClipId = c.id; select(null); renderVideoTrack(); }
      if (e.target.classList.contains('h')) {
        drag = { mode: e.target.classList.contains('l') ? 'clipL' : 'clipR', id: c.id, x0: e.clientX, in0: c.in, out0: c.out, moved: false };
        videoTrack.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else {
        clock.time = timeFromEvent(e);
        drag = { mode: 'scrub' };
        videoTrack.setPointerCapture(e.pointerId);
      }
    });
    videoTrack.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.tl-clip') || e.target.classList.contains('h')) return;
      clock.time = timeFromEvent(e);
      if (splitClipAt(clock.time)) { commit(); renderTimeline(); toast('Split — drag the ends of a piece to trim it, Delete removes it'); }
    });
    videoTrack.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'scrub') { clock.time = timeFromEvent(e); return; }
      if (drag.mode !== 'clipL' && drag.mode !== 'clipR') return;
      const c = state.clips.find((x) => x.id === drag.id);
      if (!c) return;
      const dt = (e.clientX - drag.x0) / pxPerSec();
      if (Math.abs(e.clientX - drag.x0) > 2) drag.moved = true;
      const D = state.video.duration;
      if (drag.mode === 'clipL') c.in = round(clamp(drag.in0 + dt, 0, c.out - 0.1), 3);
      else c.out = round(clamp(drag.out0 + dt, c.in + 0.1, D), 3);
      renderVideoTrack(); renderRuler(); renderCameraTrack(); renderMaskTrack(); renderTrackRows();
      for (const l of state.layers) updateBar(l);
      updateTimeUI();
    });
    const endClipDrag = () => {
      if (drag && (drag.mode === 'clipL' || drag.mode === 'clipR')) {
        if (drag.moved) { afterClipsChanged(clock.time); commit(); renderTimeline(); }
        drag = null;
        return;
      }
      if (drag && drag.mode === 'scrub') drag = null;
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
          if (!pts.length) { trk.ref.t = round(srcTime(clock.time), 3); trk.keys = [Camera.defaultKey(trk.ref.t, { x: 0, y: 0, s: 1, r: 0, manual: true, easing: 'linear' })]; }
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
          trk.ref.t = round(srcTime(clock.time), 3);
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
        if (e.shiftKey || e.ctrlKey || e.metaKey) { select(id, { toggle: true }); return; }
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
  function layerFootprint(l, tr) {
    const lay = l._layout;
    const e = tr || l.transform;
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
        time: t, cam, camDist: d, fov: state.fov, aspect: frameAspect(), hasVideo: state.video.ready,
        video: { scale: state.media.scale, x: state.media.x, y: state.media.y, locked: state.media.locked },
        layers: state.layers.map((l) => { const e = effectiveTransform(l, t); return Object.assign({
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
    onLayerDragMove(ids, delta) {
      for (const id of ids) {
        const l = getLayer(id), o = dragStartPositions && dragStartPositions[id];
        if (!l || !o) continue;
        // a pinned word's x/y are offsets from its anchor, so a world-space drag is divided by the anchor scale
        l.transform.x = round(clamp(o.x + delta.dx / o.k, -4, 4), 3);
        l.transform.y = round(clamp(o.y + delta.dy / o.k, -2.5, 2.5), 3);
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
    if (l) { const e = effectiveTransform(l, clock.time); els.layoutHint.textContent = `${(l.text || '').split('\n')[0]} · depth ${e.z.toFixed(2)} · x ${e.x.toFixed(2)} · y ${e.y.toFixed(2)}${isPinned(l) ? ' · pinned to ' + (getTrack(l.track.id).name) : ''}`; }
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
    const shape = maskShapeAt(srcTime(clock.time)) || MASK_DEFAULT;
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
      state.mask.keys = [Camera.defaultKey(round(srcTime(clock.time), 2), Object.assign({}, MASK_DEFAULT))];
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
    tr.ref = { t: round(srcTime(clock.time), 3), x: round(sg.x, 4), y: round(sg.y, 4), w: round(sg.w, 4), h: round(sg.h, 4), points: [] };
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
    state.video = { file: null, url: null, width: 0, height: 0, duration: 0, ready: false, thumbs: [] };
    state.clips = []; state.selectedClipId = null;
    $('#tlVideo').classList.add('hidden');
    $('#btnSplit').classList.add('hidden');
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
    state.video.thumbs = [];
    state.clips = [{ id: `C${Math.random().toString(36).slice(2, 7)}`, in: 0, out: round(state.video.duration, 4) }];
    state.selectedClipId = null;
    clock._clip = 0;
    v.loop = false;
    for (const l of state.layers) {
      l.end = Math.min(l.end, state.video.duration);
      l.start = Math.min(l.start, Math.max(0, l.end - 0.1));
      l._layout = null;
    }
    clampCameraKeys(state.video.duration);
    $('#expAudioWrap').classList.remove('hidden');
    $('#tlVideo').classList.remove('hidden');
    $('#btnSplit').classList.remove('hidden');
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

  /* A strip of small frames for the clip bars. Seeks through the clip once, then puts the playhead back. */
  async function makeThumbnails() {
    if (!state.video.ready || state.tracking || state.exporting) return;
    const v = els.video, D = state.video.duration;
    const n = Math.min(24, Math.max(6, Math.round(D / 1.5)));
    const c = document.createElement('canvas');
    const h = 72, w = Math.max(16, Math.round((h * state.video.width) / Math.max(1, state.video.height)));
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const was = clock.time, wasPlaying = clock.playing;
    if (wasPlaying) clock.pause();
    const thumbs = [];
    const file = state.video.file;
    for (let i = 0; i < n; i++) {
      if (state.video.file !== file || state.tracking || state.exporting) return;   // the video changed under us
      const t = (D * (i + 0.5)) / n;
      await seekVideo(t);
      try { ctx.drawImage(v, 0, 0, w, h); thumbs.push({ t, url: c.toDataURL('image/jpeg', 0.6) }); } catch (e) { break; }
    }
    if (state.video.file !== file) return;
    state.video.thumbs = thumbs;
    await seekVideo(srcTime(was));
    clock.time = was;
    renderVideoTrack();
    if (wasPlaying) clock.play();
  }
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
      tracks: state.tracks,
      clips: state.clips,
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
      state.tracks = (data.tracks || []).map((tr, i) => Object.assign(
        { name: `Tracker ${i + 1}`, color: TRACK_COLORS[i % TRACK_COLORS.length], mode: 'box', closed: true, lost: null, placed: true, smooth: 0.3 },
        tr,
        { ref: Object.assign({ t: 0, x: 0, y: 0, w: 0.14, h: 0.12, points: [] }, tr.ref), keys: (tr.keys || []).map((k) => Camera.defaultKey(k.t || 0, k)) },
      ));
      state.selectedTrackId = null; state.selectedTrackKeyId = null; state.trackEdit = false;
      if (state.video.ready && Array.isArray(data.clips) && data.clips.length) {
        const D = state.video.duration;
        state.clips = data.clips.map((c) => ({ id: c.id || `C${Math.random().toString(36).slice(2, 7)}`, in: clamp(c.in || 0, 0, D), out: clamp(c.out || D, 0, D) })).filter((c) => c.out - c.in >= 0.05);
        if (!state.clips.length) state.clips = [{ id: `C${Math.random().toString(36).slice(2, 7)}`, in: 0, out: D }];
        afterClipsChanged(0);
      }
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
      syncTrackControls();
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
  const splitHere = () => {
    if (!state.video.ready) { toast('Load a video to split it', true); return; }
    clock.pause();
    if (splitClipAt(clock.time)) { commit(); renderTimeline(); toast(`Split at ${fmtTime(clock.time)} — drag the ends of a piece to trim it, Delete removes it`); }
  };
  $('#btnSplit').addEventListener('click', splitHere);
  $('#btnSplit2').addEventListener('click', splitHere);
  $('#btnStepBack').addEventListener('click', () => { clock.pause(); clock.time = clock.time - 1 / 30; });
  $('#btnStepFwd').addEventListener('click', () => { clock.pause(); clock.time = clock.time + 1 / 30; });
  $('#btnLoop').addEventListener('click', (e) => { state.loop = !state.loop; els.video.loop = state.loop && !state.clips.length; e.currentTarget.classList.toggle('active', state.loop); });
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
      if (state.video.ready && !realtime) await seekVideo(srcTime(t));
      renderer.render({
        video: state.video.ready ? els.video : null,
        videoReady: state.video.ready && els.video.readyState >= 2,
        layers: state.layers, time: t, frameHeightPx: cfg.h, selectedIds: [], camera: cameraAt(t), media,
        mask: maskForRender(t), showMask: false,
        trackTransform: (l) => (isPinned(l) ? effectiveTransform(l, t) : null),
      });
    };

    const t0 = performance.now();
    try {
      let result;
      const common = { canvas: els.canvas, width: cfg.w, height: cfg.h, fps: cfg.fps, start: cfg.start, end: cfg.end, quality: cfg.quality, renderFrame, onProgress, signal: abort.signal };
      if (Exporter.hasWebCodecs()) {
        // the audio for a clip-edited timeline is the pieces of source audio the range covers, joined
        const segs = [];
        if (state.clips.length) {
          let acc = 0;
          for (const c of state.clips) {
            const lo = Math.max(cfg.start, acc), hi = Math.min(cfg.end, acc + clipLen(c));
            if (hi > lo) segs.push({ in: c.in + (lo - acc), out: c.in + (hi - acc) });
            acc += clipLen(c);
          }
        }
        result = await Exporter.exportWebCodecs(Object.assign(common, { audioFile: state.video.file, includeAudio: cfg.audio, fileHandle, audioSegments: segs }));
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
      case 'End': clock.pause(); clock.time = duration(); break;
      case ',': clock.pause(); clock.time = clock.time - 1 / 30; break;
      case '.': clock.pause(); clock.time = clock.time + 1 / 30; break;
      case 't': case 'T': addBlankText(); break;
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
    syncTrackControls();
    refreshAll();
    updatePlayButton();
    setView('split');
    requestAnimationFrame(frame);
    clock.play();
  }
  init();
  // Debug / automation hook (read-only use).
  window.__perspective = { state, renderer, cameraAt, clock, layoutView, maskForRender, trackAt, effectiveTransform, runTracking, pinLayer, newTrack, seekVideo, invalidate, trackShapeAt, finishShape, syncTrackControls, refreshAll };
})();
