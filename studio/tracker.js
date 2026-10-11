/* Collage Studio — motion tracking.
   Pins a layer to something in a video: the clip is stepped through frame by frame, a cluster of textured points around
   the spot is followed with block matching (coarse-to-fine, sub-pixel), and a robust similarity transform (move, scale,
   turn) is fitted to them each step. The result is stored on the layer as el.track (see R.trackXform in render.js). */
(function () {
  'use strict';
  const S = window.Studio, R = window.StudioRender;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const AW = 512; // analysis width

  const seek = (v, time) => new Promise(res => {
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 3000);
    v.currentTime = time;
  });

  // a frame as a grey Float32 image, plus a half-size copy for the coarse search
  function grab(v, cv) {
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(v, 0, 0, cv.width, cv.height);
    const d = x.getImageData(0, 0, cv.width, cv.height).data, w = cv.width, h = cv.height, g = new Float32Array(w * h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    return { w, h, g, half: half({ w, h, g }) };
  }
  function half(f) {
    const w = f.w >> 1, h = f.h >> 1, g = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * 2 * f.w + x * 2;
      g[y * w + x] = (f.g[i] + f.g[i + 1] + f.g[i + f.w] + f.g[i + f.w + 1]) * 0.25;
    }
    return { w, h, g };
  }
  const px = (f, x, y) => f.g[clamp(y, 0, f.h - 1) * f.w + clamp(x, 0, f.w - 1)];
  function bil(f, x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const a = px(f, x0, y0), b = px(f, x0 + 1, y0), c = px(f, x0, y0 + 1), d = px(f, x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  // the patch around a point, mean removed (so a brightness change between frames doesn't matter)
  function patch(f, x, y, r) {
    const n = (2 * r + 1) * (2 * r + 1), p = new Float32Array(n);
    let k = 0, sum = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const v = bil(f, x + dx, y + dy); p[k++] = v; sum += v; }
    const m = sum / n; let e = 0;
    for (let i = 0; i < n; i++) { p[i] -= m; e += Math.abs(p[i]); }
    p.energy = e / n;
    return p;
  }
  function sadAt(f, T, r, cx, cy, best) {
    let sum = 0, k = 0;
    for (let dy = -r; dy <= r; dy++) { const row = clamp(cy + dy, 0, f.h - 1) * f.w; for (let dx = -r; dx <= r; dx++) sum += f.g[row + clamp(cx + dx, 0, f.w - 1)]; }
    const m = sum / T.length;
    let s = 0;
    for (let dy = -r; dy <= r; dy++) {
      const row = clamp(cy + dy, 0, f.h - 1) * f.w;
      for (let dx = -r; dx <= r; dx++) { s += Math.abs(f.g[row + clamp(cx + dx, 0, f.w - 1)] - m - T[k++]); if (s > best) return s; }
    }
    return s;
  }
  // where the patch T (taken from point p in frame a) went in frame b, searched around the guess g
  function match(a, b, p, g, r) {
    // coarse: half size, wide search
    const Th = patch(a.half, p.x / 2, p.y / 2, r);
    let bx = Math.round(g.x / 2), by = Math.round(g.y / 2), best = Infinity;
    const R1 = 10, cx0 = bx, cy0 = by;
    for (let dy = -R1; dy <= R1; dy++) for (let dx = -R1; dx <= R1; dx++) {
      const s = sadAt(b.half, Th, r, cx0 + dx, cy0 + dy, best);
      if (s < best) { best = s; bx = cx0 + dx; by = cy0 + dy; }
    }
    // fine: full size, small search around the coarse answer
    const T = patch(a, p.x, p.y, r), fx0 = bx * 2, fy0 = by * 2, R0 = 3;
    let fx = fx0, fy = fy0, fb = Infinity;
    const grid = new Map();
    for (let dy = -R0; dy <= R0; dy++) for (let dx = -R0; dx <= R0; dx++) {
      const s = sadAt(b, T, r, fx0 + dx, fy0 + dy, Infinity);
      grid.set(dx + ',' + dy, s);
      if (s < fb) { fb = s; fx = fx0 + dx; fy = fy0 + dy; }
    }
    // sub-pixel: a parabola through the best score and its neighbours, in each direction
    const at = (x, y) => grid.get((x - fx0) + ',' + (y - fy0)) ?? sadAt(b, T, r, x, y, Infinity);
    const par = (l, c, rr) => { const d = l - 2 * c + rr; return d > 1e-6 ? clamp(0.5 * (l - rr) / d, -0.5, 0.5) : 0; };
    const sx = par(at(fx - 1, fy), fb, at(fx + 1, fy)), sy = par(at(fx, fy - 1), fb, at(fx, fy + 1));
    return { x: fx + sx, y: fy + sy, err: fb / T.length, energy: T.energy };
  }
  // corners worth following near (cx, cy): strong texture in both directions (Shi–Tomasi), spread out
  function features(f, cx, cy, rad, want, keep) {
    const cand = [], step = 3, w = 4;
    for (let y = Math.max(w + 1, cy - rad); y < Math.min(f.h - w - 1, cy + rad); y += step) {
      for (let x = Math.max(w + 1, cx - rad); x < Math.min(f.w - w - 1, cx + rad); x += step) {
        if (Math.hypot(x - cx, y - cy) > rad) continue;
        let gxx = 0, gyy = 0, gxy = 0;
        for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
          const ix = (px(f, x + dx + 1, y + dy) - px(f, x + dx - 1, y + dy)) / 2, iy = (px(f, x + dx, y + dy + 1) - px(f, x + dx, y + dy - 1)) / 2;
          gxx += ix * ix; gyy += iy * iy; gxy += ix * iy;
        }
        const tr = gxx + gyy, det = gxx * gyy - gxy * gxy, lmin = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
        cand.push({ x, y, q: lmin });
      }
    }
    cand.sort((a, b) => b.q - a.q);
    const out = keep ? keep.slice() : [], minD = Math.max(6, rad / 5), floor = cand.length ? cand[0].q * 0.04 : 0;
    for (const c of cand) {
      if (out.length >= want) break;
      if (c.q <= floor || c.q < 20) break;
      if (out.every(o => Math.hypot(o.x - c.x, o.y - c.y) >= minD)) out.push({ x: c.x, y: c.y, vx: 0, vy: 0 });
    }
    return out;
  }
  // least-squares move / scale / turn taking anchors (positions on the reference frame) to where the points are now
  function fit(pairs) {
    let ax = 0, ay = 0, qx = 0, qy = 0;
    for (const m of pairs) { ax += m.ax; ay += m.ay; qx += m.qx; qy += m.qy; }
    const n = pairs.length; ax /= n; ay /= n; qx /= n; qy /= n;
    let sxx = 0, dot = 0, crs = 0;
    for (const m of pairs) { const px = m.ax - ax, py = m.ay - ay, X = m.qx - qx, Y = m.qy - qy; sxx += px * px + py * py; dot += px * X + py * Y; crs += px * Y - py * X; }
    const c = sxx > 1e-6 ? dot / sxx : 1, sn = sxx > 1e-6 ? crs / sxx : 0;
    return { ax, ay, qx, qy, c, s: sn, apply: (x, y) => ({ x: qx + c * (x - ax) - sn * (y - ay), y: qy + sn * (x - ax) + c * (y - ay) }) };
  }
  // one step: follow the points from frame a to b, then fit the reference → now transform to all of them (nothing is
  // chained from step to step, so scale and turn don't creep)
  function step(a, b, st, r) {
    const moved = [];
    for (const p of st.pts) {
      const g = { x: p.x + p.vx, y: p.y + p.vy };
      const q = match(a, b, p, g, r);
      if (q.err > Math.max(6, q.energy * 0.85) || q.x < 2 || q.y < 2 || q.x > b.w - 3 || q.y > b.h - 3) continue;
      moved.push({ ax: p.ax, ay: p.ay, qx: q.x, qy: q.y, vx: q.x - p.x, vy: q.y - p.y });
    }
    if (moved.length < 3) { st.lost++; return; }
    let F = fit(moved), good = moved;
    for (let it = 0; it < 2; it++) {
      const res = good.map(m => { const e = F.apply(m.ax, m.ay); return Math.hypot(e.x - m.qx, e.y - m.qy); });
      const lim = Math.max(1.5, median(res) * 2.5);
      const next = good.filter((m, i) => res[i] <= lim);
      if (next.length < 3 || next.length === good.length) break;
      good = next; F = fit(good);
    }
    st.T = F;
    st.c = F.apply(st.c0.x, st.c0.y);
    st.s = Math.hypot(F.c, F.s); st.r = Math.atan2(F.s, F.c) * 180 / Math.PI;
    st.rad = clamp(st.rad0 * st.s, 10, b.w / 2); st.lost = 0;
    st.pts = good.map(m => ({ x: m.qx, y: m.qy, vx: m.vx, vy: m.vy, ax: m.ax, ay: m.ay }));
  }
  // drift guard: compare how the spot looked on the reference frame (warped by the current estimate) with this frame and
  // nudge the move / scale / turn to where they line up best. Everything stays tied to the original look of the spot.
  function refTemplate(f, c0, rad) {
    const N = 21, R = clamp(rad, 14, 56), pts = [], vals = [];
    let sum = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const dx = (i / (N - 1) * 2 - 1) * R, dy = (j / (N - 1) * 2 - 1) * R, v = bil(f, c0.x + dx, c0.y + dy);
      pts.push(dx, dy); vals.push(v); sum += v;
    }
    const m = sum / vals.length;
    return { pts, vals: vals.map(v => v - m), R };
  }
  function refine(cur, st) {
    const RT = st.ref;
    if (!RT) return;
    const P = RT.pts, V = RT.vals, n = V.length;
    const cost = (cx, cy, sc, an, best) => {
      const ca = Math.cos(an) * sc, sa = Math.sin(an) * sc, smp = new Float32Array(n);
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const x = cx + ca * P[2 * i] - sa * P[2 * i + 1], y = cy + sa * P[2 * i] + ca * P[2 * i + 1];
        if (x < 1 || y < 1 || x > cur.w - 2 || y > cur.h - 2) return Infinity;
        smp[i] = bil(cur, x, y); sum += smp[i];
      }
      const m = sum / n;
      let e = 0;
      for (let i = 0; i < n; i++) { e += Math.abs(smp[i] - m - V[i]); if (e > best) return e; }
      return e;
    };
    let bx = st.c.x, by = st.c.y, bs = st.s, ba = st.r * Math.PI / 180, best = cost(bx, by, bs, ba, Infinity);
    if (!isFinite(best)) return;
    // two rounds, each a small search around the best so far: finer the second time
    for (const [dt, ds, da] of [[1, 0.01, 0.006], [0.4, 0.004, 0.0025]]) {
      const x0 = bx, y0 = by, s0 = bs, a0 = ba;
      for (let k = -2; k <= 2; k++) for (let q = -1; q <= 1; q++) for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
        const e = cost(x0 + i * dt, y0 + j * dt, s0 * (1 + k * ds), a0 + q * da, best);
        if (e < best) { best = e; bx = x0 + i * dt; by = y0 + j * dt; bs = s0 * (1 + k * ds); ba = a0 + q * da; }
      }
    }
    st.c = { x: bx, y: by }; st.s = bs; st.r = ba * 180 / Math.PI;
    const c = Math.cos(ba) * bs, sn = Math.sin(ba) * bs;
    st.T = { ax: st.c0.x, ay: st.c0.y, qx: bx, qy: by, c, s: sn, apply: (x, y) => ({ x: bx + c * (x - st.c0.x) - sn * (y - st.c0.y), y: by + sn * (x - st.c0.x) + c * (y - st.c0.y) }) };
  }

  // new points found on the current frame get anchors by mapping them back to the reference frame
  function anchorNew(st, list) {
    const F = st.T;
    for (const p of list) {
      if (p.ax != null) continue;
      if (!F) { p.ax = p.x; p.ay = p.y; continue; }
      const det = F.c * F.c + F.s * F.s, dx = p.x - F.qx, dy = p.y - F.qy;
      p.ax = F.ax + (F.c * dx + F.s * dy) / det; p.ay = F.ay + (-F.s * dx + F.c * dy) / det;
    }
    return list;
  }

  // track the layer el against a video ('bg' or a video layer id); returns el.track
  S.trackLayer = async function (el, { src, onProgress = () => {}, signal } = {}) {
    const doc = S.doc, map = R.videoSpaceMap(doc, src);
    if (!map) throw new Error('No video to track');
    const shown = R.assetImage(map.assetId);
    if (!shown || !shown.duration) throw new Error('The video isn’t ready yet');
    // a private copy of the clip to step through, so the editor's own playback never pulls it back
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = shown.currentSrc || shown.src;
    await new Promise((res, rej) => { if (v.readyState >= 2) return res(); v.onloadeddata = res; v.onerror = () => rej(new Error('Could not read the video')); setTimeout(res, 8000); });
    const vd = map.vd || {}, dur = v.duration, end = vd.end > 0 ? Math.min(dur, vd.end) : dur, ts = clamp(vd.trim || 0, 0, Math.max(0, end - 0.05));
    const fps = Math.min(30, Math.max(10, await R.clipFps(map.assetId))), dt = 1 / fps;
    const m0 = R.videoTarget(vd, null, v, map.start);
    const vw = v.videoWidth, vh = v.videoHeight, k = AW / Math.max(vw, vh);
    const cv = document.createElement('canvas'); cv.width = Math.round(vw * k); cv.height = Math.round(vh * k);
    // the spot: the layer's centre, and its size, in the video's picture
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2, rot = (el.rotation || 0) * Math.PI / 180;
    const ccx = el.x + (el.width / 2) * Math.cos(rot) - (el.height / 2) * Math.sin(rot), ccy = el.y + (el.width / 2) * Math.sin(rot) + (el.height / 2) * Math.cos(rot);
    const uv = map.fromCanvas(ccx, ccy);
    if (!(uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1)) throw new Error('Place the layer over the video first');
    const target = { x: uv.u * cv.width, y: uv.v * cv.height };
    const sizePx = Math.max(el.width, el.height) / map.unit * Math.max(cv.width, cv.height);
    const rad0 = clamp(sizePx * 0.6, 22, cv.width * 0.22), r = 6;
    const n = Math.max(1, Math.floor((end - ts) / dt + 1e-6) + 1), i0 = clamp(Math.round((m0 - ts) / dt), 0, n - 1);
    const pts = new Array(n);
    let done = 0;
    const newState = f => {
      const st = { c0: { x: target.x, y: target.y }, c: { x: target.x, y: target.y }, s: 1, r: 0, rad: rad0, rad0, lost: 0, T: null, pts: [], ref: refTemplate(f, target, rad0) };
      st.pts = anchorNew(st, features(f, Math.round(target.x), Math.round(target.y), Math.round(rad0), 24));
      if (st.pts.length < 4) { st.rad = st.rad0 = rad0 * 2; st.pts = anchorNew(st, features(f, Math.round(target.x), Math.round(target.y), Math.round(st.rad), 24)); }
      return st;
    };
    const advance = (prev, cur, st) => {
      step(prev, cur, st, r);
      refine(cur, st);
      // top up the points when too many have been lost (occlusion, leaving the frame)
      if (st.pts.length < 10) st.pts = anchorNew(st, features(cur, Math.round(st.c.x), Math.round(st.c.y), Math.round(st.rad), 24, st.pts));
      return [st.c.x / cv.width, st.c.y / cv.height, st.s, st.r];
    };
    const cancelled = () => signal && signal.aborted;
    // stepping by seeking: exact but slow (each seek decodes from the last key frame)
    const runSeek = async (from, to, dir) => {
      await seek(v, ts + from * dt + dt * 0.5);
      let prev = grab(v, cv);
      const st = newState(prev);
      pts[from] = [st.c.x / cv.width, st.c.y / cv.height, 1, 0];
      for (let i = from + dir; dir > 0 ? i <= to : i >= to; i += dir) {
        if (cancelled()) throw new DOMException('Cancelled', 'AbortError');
        await seek(v, ts + i * dt + dt * 0.5);
        const cur = grab(v, cv);
        pts[i] = advance(prev, cur, st);
        prev = cur;
        onProgress(++done / Math.max(1, n - 1));
        if (done % 4 === 0) await new Promise(res => setTimeout(res, 0));
      }
    };
    // forwards by playing the clip and catching every frame as it is shown: many times faster than seeking.
    // Playback slows down if the tracking can't keep up; frames that slip by are filled in afterwards.
    const runPlay = async from => {
      await seek(v, ts + from * dt + dt * 0.5);
      let prev = grab(v, cv);
      const st = newState(prev), got = [[ts + from * dt + dt * 0.5, st.c.x / cv.width, st.c.y / cv.height, 1, 0]];
      let rate = 0.5, lastM = got[0][0];
      await new Promise((resolve, reject) => {
        const finish = () => { v.pause(); resolve(); };
        const cb = (now, meta) => {
          if (cancelled()) { v.pause(); reject(new DOMException('Cancelled', 'AbortError')); return; }
          const m = meta.mediaTime;
          if (m > lastM + 1e-4) {
            const t0 = performance.now(), cur = grab(v, cv);
            got.push([m].concat(advance(prev, cur, st)));
            prev = cur; lastM = m;
            const spent = performance.now() - t0;
            if (spent > 0.75 * dt * 1000 / rate && rate > 0.2) { rate = Math.max(0.2, rate * 0.7); v.playbackRate = rate; }
            onProgress(clamp((m - ts) / Math.max(dt, end - ts), 0, 1));
          }
          if (m >= end - dt * 0.75 || v.ended) { finish(); return; }
          v.requestVideoFrameCallback(cb);
        };
        v.onended = finish;
        v.playbackRate = rate;
        v.requestVideoFrameCallback(cb);
        v.play().catch(reject);
      });
      // resample onto the even time grid
      let j = 0;
      for (let i = from; i < n; i++) {
        const tm = ts + i * dt + dt * 0.5;
        while (j < got.length - 2 && got[j + 1][0] < tm) j++;
        const A = got[j], B = got[Math.min(got.length - 1, j + 1)], k = B[0] > A[0] ? clamp((tm - A[0]) / (B[0] - A[0]), 0, 1) : 0;
        pts[i] = [1, 2, 3, 4].map(c => A[c] + (B[c] - A[c]) * k);
      }
    };
    if ('requestVideoFrameCallback' in v) await runPlay(i0);
    else await runSeek(i0, n - 1, 1);
    if (i0 > 0) await runSeek(i0, 0, -1);
    v.removeAttribute('src'); v.load();
    const track = { src, t0: ts + dt * 0.5, dt, pts, ref: pts[i0].slice(), scale: el.track ? el.track.scale !== false : true, rotate: el.track ? el.track.rotate !== false : true, blur: el.track ? el.track.blur !== false : true, at: Date.now() };
    return track;
  };
  // the videos a layer could be pinned to: video layers and a video background
  S.trackSources = function () {
    const out = [];
    if (S.doc.background.assetId && R.isVideoAsset(S.doc.background.assetId)) out.push(['bg', 'Background video']);
    S.doc.elements.forEach(e => { if (e.type === 'image' && e.assetId && R.isVideoAsset(e.assetId)) out.push([e.id, S.elLabel ? S.elLabel(e) : (e.name || 'Video')]); });
    return out;
  };
})();
