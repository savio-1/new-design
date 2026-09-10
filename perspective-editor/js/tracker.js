/* Point tracker for pinning text to something in the footage.
 *
 * The user boxes a patch of the picture at one reference frame. We then step through the clip in both
 * directions and find where that patch went, frame by frame, by normalised cross-correlation on a
 * downscaled greyscale copy of the video. Two matches per frame:
 *   1. against the patch as it looked in the PREVIOUS frame — follows gradual changes of lighting and
 *      perspective, so the lock survives a moving camera;
 *   2. against the ORIGINAL reference patch at a few scales around the current one — anchors the
 *      result so frame-to-frame drift cannot accumulate, and gives the scale (how much bigger the
 *      object has become as the camera closes in), which is what sells the 3D feel.
 * Output: one key per analysed frame, { t, x, y, s } in video-plane units (x, y in −1…1 across the
 * video, y up; s = size relative to the reference frame).
 */
(function (global) {
  'use strict';

  const ANALYSIS_W = 640;       // analysis width in pixels; enough for a stable lock, cheap to search
  const STEP = 1 / 30;          // nominal frame step in seconds (seek fallback; also the key spacing tolerance)
  const LOST_NCC = 0.32;        // below this the patch is not in the picture any more
  const LOST_FRAMES = 3;        // consecutive misses before a direction gives up
  const MAX_BUFFER = 900;       // frames kept for the backward pass in playback mode (30 s at 30 fps)
  const abortError = () => new DOMException('Tracking cancelled', 'AbortError');

  /* Bilinear sample of a greyscale Float32 image. */
  function sample(img, W, H, x, y) {
    if (x < 0) x = 0; else if (x > W - 1.001) x = W - 1.001;
    if (y < 0) y = 0; else if (y > H - 1.001) y = H - 1.001;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i = y0 * W + x0;
    const a = img[i], b = img[i + 1], c = img[i + W], d = img[i + W + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /* Read a patch of `tw × th` samples centred on (cx, cy), spaced `sp` pixels apart, into out. */
  function readPatch(img, W, H, cx, cy, tw, th, sp, out) {
    const ox = cx - ((tw - 1) / 2) * sp, oy = cy - ((th - 1) / 2) * sp;
    let k = 0;
    for (let j = 0; j < th; j++) {
      const y = oy + j * sp;
      for (let i = 0; i < tw; i++) out[k++] = sample(img, W, H, ox + i * sp, y);
    }
  }

  /* Zero-mean, unit-norm copy of a patch (so NCC is a plain dot product later). */
  function normalise(src) {
    const n = src.length;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += src[i];
    mean /= n;
    let ss = 0;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = src[i] - mean; out[i] = v; ss += v * v; }
    const inv = ss > 1e-6 ? 1 / Math.sqrt(ss) : 0;
    for (let i = 0; i < n; i++) out[i] *= inv;
    return { data: out, flat: ss <= 1e-6 };
  }

  /* NCC between a normalised template and the frame patch at (cx, cy) with sample spacing sp. */
  function ncc(tmpl, img, W, H, cx, cy, tw, th, sp, scratch) {
    readPatch(img, W, H, cx, cy, tw, th, sp, scratch);
    const n = scratch.length;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += scratch[i];
    mean /= n;
    let dot = 0, ss = 0;
    for (let i = 0; i < n; i++) { const v = scratch[i] - mean; dot += tmpl[i] * v; ss += v * v; }
    return ss > 1e-6 ? dot / Math.sqrt(ss) : 0;
  }

  /* Best match of a template near (px, py): coarse grid, fine grid, then a parabolic sub-pixel fit. */
  function search(tmpl, img, W, H, px, py, radius, tw, th, sp, scratch) {
    let bx = px, by = py, best = -2;
    const coarse = radius > 14 ? 3 : radius > 6 ? 2 : 1;
    for (let dy = -radius; dy <= radius; dy += coarse) {
      for (let dx = -radius; dx <= radius; dx += coarse) {
        const v = ncc(tmpl, img, W, H, px + dx, py + dy, tw, th, sp, scratch);
        if (v > best) { best = v; bx = px + dx; by = py + dy; }
      }
    }
    // 3×3 neighbourhood at unit steps around the best coarse cell
    const grid = new Float32Array(9);
    let cx = bx, cy = by;
    for (let iter = 0; iter < coarse + 1; iter++) {
      let moved = false;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const v = (i === 0 && j === 0 && iter === 0) ? best : ncc(tmpl, img, W, H, cx + i, cy + j, tw, th, sp, scratch);
        grid[(j + 1) * 3 + (i + 1)] = v;
        if (v > best + 1e-6) { best = v; bx = cx + i; by = cy + j; moved = true; }
      }
      if (!moved) break;
      cx = bx; cy = by;
    }
    // Parabolic refinement along x and y from the centred 3×3 values.
    const c = grid[4];
    const l = grid[3], r = grid[5], u = grid[1], d = grid[7];
    let sx = 0, sy = 0;
    const denX = l - 2 * c + r, denY = u - 2 * c + d;
    if (denX < -1e-6) sx = Math.max(-0.5, Math.min(0.5, (0.5 * (l - r)) / denX));
    if (denY < -1e-6) sy = Math.max(-0.5, Math.min(0.5, (0.5 * (u - d)) / denY));
    return { x: bx + sx, y: by + sy, ncc: best };
  }

  /**
   * Track a patch through the clip.
   * opts = {
   *   video,               // HTMLVideoElement to read frames from
   *   width, height,       // the video's pixel size
   *   seek(t) -> Promise,  // position the video at t and resolve once the frame is ready
   *   ref: { t, x, y, w, h },   // reference box in video-plane units (x, y centre −1…1 y up; w, h as fractions of the video size)
   *   from, to,            // time range to cover
   *   onProgress(frac, key, dir),
   *   signal,              // AbortSignal
   * }
   * Frames are taken from real-time playback when the browser can hand them over
   * (requestVideoFrameCallback) — a 10 s clip tracks in about 10 s — and by seeking frame by frame
   * otherwise. Resolves { keys, lostForward, lostBackward, mode } — keys sorted by t.
   */
  async function track(opts) {
    const { video, seek, ref } = opts;
    const W = ANALYSIS_W, H = Math.max(16, Math.round((ANALYSIS_W * opts.height) / Math.max(1, opts.width)));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const stats = { frames: 0, computeMs: 0, greyMs: 0 };
    const grey = () => {
      const t0 = performance.now();
      ctx.drawImage(video, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const g = new Uint8ClampedArray(W * H);
      for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
      stats.greyMs += performance.now() - t0;
      return g;
    };
    const toPlane = (x, y) => ({ x: (2 * x) / W - 1, y: 1 - (2 * y) / H });
    const fromPlane = (u, v) => ({ x: ((u + 1) / 2) * W, y: ((1 - v) / 2) * H });

    // Template geometry: enough samples for a confident match, never so many that a frame is slow.
    const boxW = Math.max(10, ref.w * W), boxH = Math.max(10, ref.h * H);
    const sp0 = Math.max(1, Math.sqrt((boxW * boxH) / 1100));   // sample spacing at scale 1
    const tw = Math.max(7, Math.round(boxW / sp0)), th = Math.max(7, Math.round(boxH / sp0));
    const scratch = new Float32Array(tw * th);
    const baseRadius = Math.round(Math.min(26, Math.max(7, W * 0.04)));
    const SCALES = [0.94, 0.97, 1, 1.03, 1.06];

    await seek(ref.t);
    const refImg = grey();
    const p0 = fromPlane(ref.x, ref.y);
    const refRaw = new Float32Array(tw * th);
    readPatch(refImg, W, H, p0.x, p0.y, tw, th, sp0, refRaw);
    const refT = normalise(refRaw);
    if (refT.flat) throw new Error('That area has no detail to track — box something with edges or texture.');

    const total = Math.max(1, Math.round((opts.to - opts.from) / STEP));
    let done = 0;
    const keys = [{ t: ref.t, x: ref.x, y: ref.y, s: 1, ncc: 1 }];

    /* One direction of tracking: feed it frames in order and it appends keys. */
    function stepper(dir) {
      let pos = { x: p0.x, y: p0.y }, vel = { x: 0, y: 0 }, s = 1;
      let prevT = refT.data, lastT = ref.t, misses = 0, lost = false;
      return {
        get lost() { return lost; },
        step(img, t) {
          if (lost) return;
          const t0 = performance.now();
          // a skipped frame means more motion since the last one: widen the search to match
          const gap = Math.min(3, Math.max(1, Math.abs(t - lastT) / STEP));
          const radius = Math.round(baseRadius * gap);
          // ...and a bigger possible change of size, so widen the scale candidates too
          const scaleSpan = gap > 1.5 ? [0.85, 0.9, 0.94, 0.97, 1, 1.03, 1.06, 1.1, 1.15] : SCALES;
          const mid = (scaleSpan.length - 1) / 2;
          lastT = t;

          // 1. Follow the patch from the previous frame (tolerates gradual change).
          const pred = { x: pos.x + vel.x * 0.8 * gap, y: pos.y + vel.y * 0.8 * gap };
          const m1 = search(prevT, img, W, H, pred.x, pred.y, radius, tw, th, sp0 * s, scratch);

          // 2. Anchor to the reference patch at nearby scales.
          let best = null;
          for (let k = 0; k < scaleSpan.length; k++) {
            const sc = s * scaleSpan[k];
            if (sc < 0.2 || sc > 6) continue;
            const m = search(refT.data, img, W, H, m1.x, m1.y, 3, tw, th, sp0 * sc, scratch);
            const score = m.ncc - Math.abs(k - mid) * 0.01;    // prefer the current scale unless clearly better
            if (!best || score > best.score) best = { score, ncc: m.ncc, x: m.x, y: m.y, sc };
          }
          if (best && best.ncc > 0.5) {
            // refine the size between the candidates
            for (const f of [0.985, 1.015]) {
              const sc = best.sc * f;
              const m = search(refT.data, img, W, H, best.x, best.y, 1, tw, th, sp0 * sc, scratch);
              if (m.ncc > best.ncc + 0.002) best = { score: m.ncc, ncc: m.ncc, x: m.x, y: m.y, sc };
            }
          }

          let nx, ny, conf;
          if (best && best.ncc > 0.5) {
            // The reference still matches: lean on it so drift cannot build up, and take its scale.
            const wRef = 0.6;
            nx = m1.x * (1 - wRef) + best.x * wRef;
            ny = m1.y * (1 - wRef) + best.y * wRef;
            s = s * 0.5 + best.sc * 0.5;
            conf = Math.max(m1.ncc, best.ncc);
          } else {
            nx = m1.x; ny = m1.y;
            conf = m1.ncc;
          }

          let ok = true;
          if (conf < LOST_NCC || nx < 2 || ny < 2 || nx > W - 3 || ny > H - 3) {
            if (++misses >= LOST_FRAMES) { lost = true; return; }
            nx = pred.x; ny = pred.y;                              // coast for a frame or two
            ok = false;
          } else misses = 0;

          vel = { x: ((nx - pos.x) / gap) * 0.7 + vel.x * 0.3, y: ((ny - pos.y) / gap) * 0.7 + vel.y * 0.3 };
          pos = { x: nx, y: ny };
          const pl = toPlane(nx, ny);
          const key = { t, x: pl.x, y: pl.y, s, ncc: conf };
          if (ok) keys.push(key);

          // Next frame compares against how the patch looks now.
          const raw = new Float32Array(tw * th);
          readPatch(img, W, H, nx, ny, tw, th, sp0 * s, raw);
          const nt = normalise(raw);
          if (!nt.flat) prevT = nt.data;

          done++;
          stats.frames++;
          stats.computeMs += performance.now() - t0;
          if (opts.onProgress) opts.onProgress(Math.min(1, done / total), key, dir);
        },
      };
    }

    const checkAbort = () => { if (opts.signal && opts.signal.aborted) throw abortError(); };
    const fwd = stepper(+1), back = stepper(-1);
    const canPlay = typeof video.requestVideoFrameCallback === 'function' && !opts.forceSeek;

    if (canPlay) {
      // Backward part: play from `from` up to the reference, remembering the frames, then walk them in reverse.
      const buffer = [];
      if (ref.t - opts.from > STEP * 0.5) {
        await playRange(video, seek, opts.from, ref.t, opts.signal, (t) => {
          buffer.push({ t, img: grey() });
          if (buffer.length > MAX_BUFFER) buffer.shift();
          if (opts.onProgress) opts.onProgress(Math.min(0.5, (0.5 * (t - opts.from)) / Math.max(STEP, ref.t - opts.from)), { t, x: ref.x, y: ref.y, s: 1, ncc: 1 }, 0);
        });
      }
      // Forward part: live from the reference to the end.
      if (opts.to - ref.t > STEP * 0.5) {
        await playRange(video, seek, ref.t, opts.to, opts.signal, (t) => { if (t > ref.t + STEP * 0.5) fwd.step(grey(), t); });
      }
      for (let i = buffer.length - 1; i >= 0; i--) {
        checkAbort();
        if (buffer[i].t < ref.t - STEP * 0.5) back.step(buffer[i].img, buffer[i].t);
        if ((i & 7) === 0) await new Promise((r) => setTimeout(r, 0));   // keep the page responsive
      }
    } else {
      for (const [st, dir] of [[fwd, +1], [back, -1]]) {
        let t = ref.t;
        for (;;) {
          t = Math.round((t + dir * STEP) * 1e4) / 1e4;
          if (dir > 0 ? t > opts.to + 1e-6 : t < opts.from - 1e-6) break;
          checkAbort();
          await seek(t);
          st.step(grey(), t);
          if (st.lost) break;
        }
      }
    }

    keys.sort((a, b) => a.t - b.t);
    smooth(keys);
    return { keys, lostForward: fwd.lost, lostBackward: back.lost, mode: canPlay ? 'play' : 'seek', stats };
  }

  /* Play the video from `from` to `to`, calling onFrame(mediaTime) for every presented frame. */
  function playRange(video, seek, from, to, signal, onFrame) {
    return new Promise(async (resolve, reject) => {
      try { await seek(from); } catch (e) { reject(e); return; }
      const wasMuted = video.muted, wasLoop = video.loop, wasRate = video.playbackRate;
      video.muted = true; video.loop = false; video.playbackRate = 1;
      let handle = 0, finished = false;
      const finish = (err) => {
        if (finished) return;
        finished = true;
        video.pause();
        if (handle) video.cancelVideoFrameCallback(handle);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('pause', onPause);
        video.muted = wasMuted; video.loop = wasLoop; video.playbackRate = wasRate;
        if (err) reject(err); else resolve();
      };
      const onEnded = () => finish();
      const onPause = () => { if (!finished) finish(); };   // something else paused the video: stop cleanly with what we have
      const cb = (now, meta) => {
        if (finished) return;
        if (signal && signal.aborted) { finish(abortError()); return; }
        const t = meta.mediaTime;
        try {
          if (t <= to + 1e-4) onFrame(t);
        } catch (e) { finish(e); return; }
        if (t >= to - 1e-4) { finish(); return; }
        handle = video.requestVideoFrameCallback(cb);
      };
      video.addEventListener('ended', onEnded);
      handle = video.requestVideoFrameCallback(cb);
      video.play().then(() => video.addEventListener('pause', onPause)).catch((e) => finish(e));
    });
  }

  /* Light smoothing: scale is the noisiest estimate, position only needs the jitter taken off. */
  function smooth(keys) {
    const n = keys.length;
    if (n < 3) return;
    const sx = new Float32Array(n), sy = new Float32Array(n), ss = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[Math.min(n - 1, i + 1)];
      sx[i] = a.x * 0.15 + b.x * 0.7 + c.x * 0.15;
      sy[i] = a.y * 0.15 + b.y * 0.7 + c.y * 0.15;
    }
    // scale: 5-tap
    for (let i = 0; i < n; i++) {
      let acc = 0, wsum = 0;
      for (let k = -2; k <= 2; k++) {
        const j = Math.min(n - 1, Math.max(0, i + k));
        const w = k === 0 ? 0.4 : Math.abs(k) === 1 ? 0.2 : 0.1;
        acc += keys[j].s * w; wsum += w;
      }
      ss[i] = acc / wsum;
    }
    for (let i = 0; i < n; i++) {
      keys[i].x = Math.round(sx[i] * 1e4) / 1e4;
      keys[i].y = Math.round(sy[i] * 1e4) / 1e4;
      keys[i].s = Math.round(ss[i] * 1e4) / 1e4;
    }
  }

  global.Tracker = { track, STEP };
})(window);
