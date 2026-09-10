/* Object tracker for pinning text to something in the footage.
 *
 * The user marks a region of the picture at one reference frame — a box, a polygon drawn point by
 * point around the object, or a single point. We then follow that region through the clip and report,
 * per frame, where it went, how much bigger it got and how far it turned.
 *
 * How it works — the same shape as a real 2D tracker, because one correlated patch is not enough:
 *   1. FEATURES. Inside the region we detect up to 48 corners (Shi-Tomasi: the smaller eigenvalue of
 *      the local gradient structure tensor), spaced apart so they cover the object rather than
 *      crowding one edge. Featureless regions are rejected up front with a message.
 *   2. FLOW. Every frame each feature is followed from the previous frame by pyramidal Lucas-Kanade
 *      optical flow (three levels, 11x11 window), which is accurate to a fraction of a pixel and
 *      copes with large motion because the coarse level sees it as small motion.
 *   3. VALIDATION. Each tracked feature is then checked against the patch it had ON THE REFERENCE
 *      FRAME, warped by the current scale and rotation. Features that no longer match (occluded,
 *      blurred, drifted onto a neighbouring texture) are dropped, so drift cannot accumulate — this
 *      is what a single-patch tracker has no way to do.
 *   4. CONSENSUS. A similarity transform (translation + uniform scale + rotation) is least-squares
 *      fitted from the surviving features' reference positions to their current ones, with two
 *      rounds of outlier rejection on the residuals. The object's position, size and angle come from
 *      that fit, never from any one feature, so a few bad features cannot pull the track off.
 *   5. RECOVERY. When too few features survive, new ones are detected inside the region where it now
 *      is and added to the model; when confidence stays low for several frames the track is declared
 *      lost at that point rather than wandering off.
 *
 * Output: one key per analysed frame, { t, x, y, s, r, ncc } — x, y in video-plane units (-1..1
 * across the video, y up), s = size relative to the reference frame, r = rotation in degrees.
 */
(function (global) {
  'use strict';

  const ANALYSIS_W = 480;     // width of the greyscale copy everything is measured on
  const PYR = 4;              // pyramid levels for the optical flow (the top level sees big motion as small)
  const FB_TOL = 1.5;         // forward-backward check: a feature must return to within this many pixels
  const REACQ_NCC = 0.62;     // how well the whole region must match to be re-acquired after being lost
  const HALF = 5;             // LK window half-size (11x11)
  const PATCH = 7;            // validation patch half-size (15x15)
  const MAX_FEAT = 48;
  const MIN_FEAT = 4;
  const NCC_KEEP = 0.45;      // a feature must still look like its reference patch this much
  const CONF_LOST = 0.3;      // below this confidence the object is not really there any more
  const LOST_FRAMES = 5;      // consecutive bad frames before a direction gives up
  const BACK_FRAMES = 600;    // frames buffered for the backward pass (20 s at 30 fps)
  const STEP = 1 / 30;        // nominal frame step (seek fallback, and the key spacing tolerance)
  const abortError = () => new DOMException('Tracking cancelled', 'AbortError');

  /* ---------------------------------------------------------------- images */

  /* Bilinear sample of a greyscale byte image. */
  function samp(img, W, H, x, y) {
    if (x < 0) x = 0; else if (x > W - 1.001) x = W - 1.001;
    if (y < 0) y = 0; else if (y > H - 1.001) y = H - 1.001;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    const i = y0 * W + x0;
    const a = img[i], b = img[i + 1], c = img[i + W], d = img[i + W + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /* Half-size copy by 2x2 average. */
  function halve(src, W, H) {
    const w = Math.max(1, W >> 1), h = Math.max(1, H >> 1);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const r0 = (y * 2) * W, r1 = Math.min(H - 1, y * 2 + 1) * W;
      for (let x = 0; x < w; x++) {
        const c0 = x * 2, c1 = Math.min(W - 1, x * 2 + 1);
        out[y * w + x] = (src[r0 + c0] + src[r0 + c1] + src[r1 + c0] + src[r1 + c1] + 2) >> 2;
      }
    }
    return { d: out, W: w, H: h };
  }

  function pyramid(grey, W, H) {
    const levels = [{ d: grey, W, H }];
    for (let i = 1; i < PYR; i++) {
      const p = levels[i - 1];
      if (p.W < 40 || p.H < 40) break;
      levels.push(halve(p.d, p.W, p.H));
    }
    return levels;
  }

  /* ---------------------------------------------------------------- patches */

  /* Read a (2n+1)^2 patch centred on (cx, cy), with the linear part [[a,-b],[b,a]] applied, and
   * return it zero-mean and unit-norm so NCC is a dot product. */
  function warpedPatch(img, W, H, cx, cy, n, a, b, out) {
    let k = 0, mean = 0;
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const v = samp(img, W, H, cx + a * i - b * j, cy + b * i + a * j);
        out[k++] = v;
        mean += v;
      }
    }
    mean /= k;
    let ss = 0;
    for (let i = 0; i < k; i++) { const v = out[i] - mean; out[i] = v; ss += v * v; }
    if (ss <= 1e-6) return false;
    const inv = 1 / Math.sqrt(ss);
    for (let i = 0; i < k; i++) out[i] *= inv;
    return true;
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  /* ---------------------------------------------------------------- features */

  /* Shi-Tomasi corner score map inside a bounding box, then greedy non-maximum suppression. */
  function detect(level, W, H, inside, bbox, want, avoid, minDist) {
    const { d } = level;
    const x0 = Math.max(2, Math.floor(bbox.x0)), x1 = Math.min(W - 3, Math.ceil(bbox.x1));
    const y0 = Math.max(2, Math.floor(bbox.y0)), y1 = Math.min(H - 3, Math.ceil(bbox.y1));
    const cand = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inside(x, y)) continue;
        let sxx = 0, syy = 0, sxy = 0;
        for (let j = -2; j <= 2; j++) {
          const row = (y + j) * W;
          for (let i = -2; i <= 2; i++) {
            const p = row + x + i;
            const gx = (d[p + 1] - d[p - 1]) * 0.5;
            const gy = (d[p + W] - d[p - W]) * 0.5;
            sxx += gx * gx; syy += gy * gy; sxy += gx * gy;
          }
        }
        const half = (sxx + syy) / 2;
        const diff = Math.sqrt(Math.max(0, ((sxx - syy) / 2) * ((sxx - syy) / 2) + sxy * sxy));
        const score = half - diff;         // smaller eigenvalue: strong in BOTH directions
        if (score > 1) cand.push({ x, y, score });
      }
    }
    cand.sort((p, q) => q.score - p.score);
    const out = [];
    const md2 = minDist * minDist;
    const far = (p, list) => list.every((o) => (o.x - p.x) * (o.x - p.x) + (o.y - p.y) * (o.y - p.y) >= md2);
    for (const c of cand) {
      if (out.length >= want) break;
      if (c.score < cand[0].score * 0.02) break;
      if (!far(c, out) || !far(c, avoid || [])) continue;
      out.push(c);
    }
    return out;
  }

  /* ---------------------------------------------------------------- optical flow */

  /* Pyramidal Lucas-Kanade: follow the point (px, py) from `prev` to `cur`, starting from a guess.
   * Translation only per level; the pyramid is what lets it handle motion of many pixels. */
  function flow(prev, cur, px, py, guessX, guessY) {
    return flowLevels(prev, cur, px, py, guessX, guessY, Math.min(prev.length, cur.length) - 1, 0);
  }
  function flowLevels(prev, cur, px, py, guessX, guessY, top, bottom) {
    let gx = guessX, gy = guessY;
    for (let l = top; l >= bottom; l--) {
      const P = prev[l], C = cur[l];
      const f = 1 / (1 << l);
      const tx = px * f, ty = py * f;
      let cx = gx * f, cy = gy * f;      // gx, gy stay in level-0 units throughout
      // Structure matrix of the template window (constant across iterations)
      let sxx = 0, syy = 0, sxy = 0;
      const n = (2 * HALF + 1) * (2 * HALF + 1);
      const Ix = new Float32Array(n), Iy = new Float32Array(n), T = new Float32Array(n);
      let k = 0;
      for (let j = -HALF; j <= HALF; j++) {
        for (let i = -HALF; i <= HALF; i++) {
          const x = tx + i, y = ty + j;
          const a = samp(P.d, P.W, P.H, x + 1, y), b = samp(P.d, P.W, P.H, x - 1, y);
          const c = samp(P.d, P.W, P.H, x, y + 1), e = samp(P.d, P.W, P.H, x, y - 1);
          const ix = (a - b) * 0.5, iy = (c - e) * 0.5;
          Ix[k] = ix; Iy[k] = iy; T[k] = samp(P.d, P.W, P.H, x, y);
          sxx += ix * ix; syy += iy * iy; sxy += ix * iy;
          k++;
        }
      }
      const det = sxx * syy - sxy * sxy;
      if (det < 1e-4) continue;            // no texture at this level: leave the guess alone
      for (let iter = 0; iter < 5; iter++) {
        let bx = 0, by = 0;
        let k2 = 0;
        for (let j = -HALF; j <= HALF; j++) {
          for (let i = -HALF; i <= HALF; i++) {
            const it = samp(C.d, C.W, C.H, cx + i, cy + j) - T[k2];
            bx += Ix[k2] * it; by += Iy[k2] * it;
            k2++;
          }
        }
        const dx = -(syy * bx - sxy * by) / det;
        const dy = -(sxx * by - sxy * bx) / det;
        cx += dx; cy += dy;
        if (Math.abs(dx) + Math.abs(dy) < 0.01) break;
        if (Math.abs(cx - tx) > 60 || Math.abs(cy - ty) > 60) break;   // diverged
      }
      gx = cx / f; gy = cy / f;
    }
    return { x: gx, y: gy };
  }

  /* Dominant motion of the whole frame between prev and cur (the camera move), from LK on a grid of
   * points at the coarsest level; the median makes it immune to the moving object itself. Used as the
   * starting guess for every feature, so a sudden camera jerk does not throw the object's features
   * outside their search windows. */
  function globalMotion(prev, cur) {
    const top = Math.min(prev.length, cur.length) - 1;
    const P = prev[top];
    const f = 1 << top;
    const dxs = [], dys = [];
    for (let j = 1; j <= 3; j++) {
      for (let i = 1; i <= 4; i++) {
        const x = (P.W * i) / 5, y = (P.H * j) / 4;
        const px = x * f, py = y * f;
        const r = flowLevels(prev, cur, px, py, px, py, top, top);   // single coarse level, cheap
        const dx = r.x - px, dy = r.y - py;
        if (Math.abs(dx) < P.W * f * 0.3 && Math.abs(dy) < P.H * f * 0.3) { dxs.push(dx); dys.push(dy); }
      }
    }
    if (dxs.length < 5) return null;
    dxs.sort((a, b) => a - b); dys.sort((a, b) => a - b);
    const mx = dxs[dxs.length >> 1], my = dys[dys.length >> 1];
    let agree = 0;
    for (let i = 0; i < dxs.length; i++) if (Math.abs(dxs[i] - mx) < 3 * f && Math.abs(dys[i] - my) < 3 * f) agree++;
    return agree >= dxs.length * 0.5 ? { x: mx, y: my } : null;
  }

  /* ---------------------------------------------------------------- similarity fit */

  /* Least-squares similarity (uniform scale + rotation + translation) mapping src -> dst.
   * Returns { a, b, tx, ty, s, deg } where [x', y'] = [a*x - b*y + tx, b*x + a*y + ty]. */
  function fitSimilarity(list, transOnly) {
    let n = 0, msx = 0, msy = 0, mdx = 0, mdy = 0;
    for (const f of list) { msx += f.mx; msy += f.my; mdx += f.x; mdy += f.y; n++; }
    if (!n) return null;
    msx /= n; msy /= n; mdx /= n; mdy /= n;
    let num1 = 0, num2 = 0, den = 0;
    for (const f of list) {
      const sx = f.mx - msx, sy = f.my - msy, dx = f.x - mdx, dy = f.y - mdy;
      num1 += sx * dx + sy * dy;
      num2 += sx * dy - sy * dx;
      den += sx * sx + sy * sy;
    }
    let a, b;
    // A cluster only a few pixels across cannot say anything reliable about scale or angle — measured
    // on a rotating, zooming shot both estimates run away and take the track with them. A point
    // tracker therefore reports position only; box and shape regions are wide enough to fit all three.
    const spread = Math.sqrt(den / n);
    if (transOnly || n < 3 || spread < 6) { a = 1; b = 0; }
    else { a = num1 / den; b = num2 / den; }
    const s = Math.hypot(a, b);
    if (!(s > 0.05) || !isFinite(s)) return null;
    return { a, b, tx: mdx - (a * msx - b * msy), ty: mdy - (b * msx + a * msy), s, deg: (Math.atan2(b, a) * 180) / Math.PI };
  }

  const applySim = (m, x, y) => ({ x: m.a * x - m.b * y + m.tx, y: m.b * x + m.a * y + m.ty });

  /* Fit, then throw out the features that disagree and fit again. */
  function robustFit(feats, transOnly) {
    let list = feats.filter((f) => f.active);
    if (list.length < 1) return null;
    let m = fitSimilarity(list, transOnly);
    for (let pass = 0; pass < 2 && m && list.length >= 3; pass++) {
      const res = list.map((f) => {
        const p = applySim(m, f.mx, f.my);
        return Math.hypot(p.x - f.x, p.y - f.y);
      });
      const sorted = res.slice().sort((x, y) => x - y);
      const med = sorted[sorted.length >> 1];
      const lim = Math.max(1.2, med * 2.5);
      const keep = list.filter((f, i) => res[i] <= lim);
      if (keep.length < 3 || keep.length === list.length) {
        list.forEach((f, i) => { f.residual = res[i]; });
        break;
      }
      list.forEach((f, i) => { f.residual = res[i]; if (res[i] > lim) f.outlier = true; });
      list = keep;
      m = fitSimilarity(list, transOnly);
    }
    return m ? { m, inliers: list.length } : null;
  }

  /* ---------------------------------------------------------------- regions */

  /* A region in analysis pixels, with a test for what is inside it and an anchor point. */
  function regionInPixels(region, W, H) {
    const toPx = (u, v) => ({ x: ((u + 1) / 2) * W, y: ((1 - v) / 2) * H });
    if (region.type === 'poly' && region.points && region.points.length >= 3) {
      const pts = region.points.map((p) => toPx(p.x, p.y));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      let cx = 0, cy = 0;
      for (const p of pts) { cx += p.x; cy += p.y; }
      cx /= pts.length; cy /= pts.length;
      const anchor = region.x == null ? { x: cx, y: cy } : toPx(region.x, region.y);
      return {
        pts, anchor,
        bbox: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) },
        inside: (x, y) => pointInPoly(x, y, pts),
      };
    }
    if (region.type === 'point') {
      const c = toPx(region.x, region.y);
      const r = Math.max(11, (region.w || 0.08) * W * 0.25);
      return {
        anchor: c, transOnly: true, radius: r,   // too small a neighbourhood to judge size or angle
        bbox: { x0: c.x - r, x1: c.x + r, y0: c.y - r, y1: c.y + r },
        inside: (x, y) => (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) <= r * r,
      };
    }
    const c = toPx(region.x, region.y);
    const hw = Math.max(6, (region.w || 0.14) * W * 0.25), hh = Math.max(6, (region.h || 0.12) * H * 0.25);
    return {
      anchor: c,
      bbox: { x0: c.x - hw, x1: c.x + hw, y0: c.y - hh, y1: c.y + hh },
      inside: (x, y) => Math.abs(x - c.x) <= hw && Math.abs(y - c.y) <= hh,
    };
  }

  function pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ---------------------------------------------------------------- one direction of tracking */

  function makeTracker(refPyr, model, region, W, H) {
    const transOnly = region.transOnly;
    // Each direction gets its own copy of the feature state.
    const feats = model.map((f) => ({ mx: f.mx, my: f.my, x: f.mx, y: f.my, ref: f.ref, active: true, ncc: 1, original: true }));
    const scratch = new Float32Array((2 * PATCH + 1) * (2 * PATCH + 1));
    const initial = feats.length;
    let prev = refPyr;
    let sim = { a: 1, b: 0, tx: 0, ty: 0, s: 1, deg: 0 };
    let vel = { x: 0, y: 0, ds: 0 };
    let bad = 0, lost = false, lastT = null, lostAt = null;
    // A coarse picture of the whole region on the reference frame, for finding it again after a loss.
    const thumb = regionThumb(refPyr, region);

    /* Look for the region anywhere in the frame; on a hit, rebuild the model there. */
    function reacquire(pyr, t) {
      if (!thumb) return false;
      const rad0 = (sim.deg * Math.PI) / 180;
      const hit = findThumb(thumb, pyr, sim.s * Math.cos(rad0), sim.s * Math.sin(rad0));
      if (!hit || hit.ncc < REACQ_NCC) return false;
      // The size and angle the search preferred, position from the match.
      const ns = sim.s * hit.scale, ndeg = sim.deg + hit.ddeg;
      const rad = (ndeg * Math.PI) / 180;
      const na = ns * Math.cos(rad), nb = ns * Math.sin(rad);
      const c = applySim({ a: na, b: nb, tx: 0, ty: 0 }, thumb.cx, thumb.cy);
      sim = { a: na, b: nb, tx: hit.x - c.x, ty: hit.y - c.y, s: ns, deg: ndeg };
      vel = { x: 0, y: 0, ds: 0 };
      // First try to wake the ORIGINAL features: each is looked for near where the new transform puts
      // it. Those carry true reference positions, so the very next fit corrects any error in the
      // guessed size and angle — features seeded from the guess could only perpetuate it.
      let awake = 0;
      for (const f of feats) {
        f.active = false;
        if (!f.original) continue;
        const g = applySim(sim, f.mx, f.my);
        let best = -2, bx = g.x, by = g.y;
        for (let j = -6; j <= 6; j += 2) for (let i = -6; i <= 6; i += 2) {
          if (!warpedPatch(pyr[0].d, W, H, g.x + i, g.y + j, PATCH, na, nb, scratch)) continue;
          const v = dot(f.ref, scratch);
          if (v > best) { best = v; bx = g.x + i; by = g.y + j; }
        }
        if (best > 0.6) { f.active = true; f.x = bx; f.y = by; f.ncc = best; awake++; }
      }
      let added = awake;
      if (awake < Math.max(MIN_FEAT, initial * 0.3)) {
        const inv = invert(sim);
        const box = warpBBox(region.bbox, sim);
        const cur = feats.filter((f) => f.active).map((f) => ({ x: f.x, y: f.y }));
        const fresh = detect(pyr[0], W, H, (x, y) => { const p = applySim(inv, x, y); return region.inside(p.x, p.y); }, box, MAX_FEAT - awake, cur, 6);
        for (const cnd of fresh) {
          const patch = new Float32Array(scratch.length);
          if (!warpedPatch(pyr[0].d, W, H, cnd.x, cnd.y, PATCH, na, nb, patch)) continue;
          const p = applySim(inv, cnd.x, cnd.y);
          feats.push({ mx: p.x, my: p.y, x: cnd.x, y: cnd.y, ref: patch, active: true, ncc: 1 });
          added++;
        }
      }
      if (added < MIN_FEAT) return false;
      lost = false; bad = 0; prev = pyr; lastT = t;
      return true;
    }

    return {
      get lost() { return lost; },
      get lostAt() { return lostAt; },
      step(pyr, t) {
        if (lost) {
          // Keep looking: an object that was hidden or left the frame often comes back.
          if (reacquire(pyr, t)) {
            const anchor = applySim(sim, region.anchor.x, region.anchor.y);
            return { t, x: (2 * anchor.x) / W - 1, y: 1 - (2 * anchor.y) / H, s: sim.s, r: sim.deg, ncc: REACQ_NCC, features: feats.filter((f) => f.active).length, reacquired: true };
          }
          return null;
        }
        const gap = lastT == null ? 1 : Math.min(4, Math.max(1, Math.abs(t - lastT) / STEP));
        // Predict this frame's transform by continuing the last frame's motion.
        const pred = {
          a: sim.a, b: sim.b,
          tx: sim.tx + vel.x * gap, ty: sim.ty + vel.y * gap,
          s: sim.s + vel.ds * gap, deg: sim.deg,
        };
        // The camera's own move this frame, so a jerk does not throw the features out of range.
        const gm = globalMotion(prev, pyr);

        // 1. Optical flow for every live feature. Start from where the whole frame moved when that is
        //    known, otherwise from the object's own predicted motion; then check the flow BACKWARDS —
        //    a feature that does not land back on itself was matched to something else and is dropped.
        for (const f of feats) {
          if (!f.active) continue;
          const g = gm ? { x: f.x + gm.x, y: f.y + gm.y } : applySim(pred, f.mx, f.my);
          const p = flow(prev, pyr, f.x, f.y, g.x, g.y);
          const back = flow(pyr, prev, p.x, p.y, f.x, f.y);
          if (Math.hypot(back.x - f.x, back.y - f.y) > FB_TOL * gap) { f.active = false; continue; }
          f.x = p.x; f.y = p.y;
          f.outlier = false;
        }

        // 2. Validate against the reference patch, warped by the current scale and rotation. A
        //    feature that has slipped is nudged back by a tiny local search before being dropped.
        const rad = (pred.deg * Math.PI) / 180;
        const wa = pred.s * Math.cos(rad), wb = pred.s * Math.sin(rad);
        let live = 0, nccSum = 0;
        for (const f of feats) {
          if (!f.active) continue;
          let best = -2, bx = f.x, by = f.y;
          for (let j = -1; j <= 1; j++) {
            for (let i = -1; i <= 1; i++) {
              const ok = warpedPatch(pyr[0].d, W, H, f.x + i, f.y + j, PATCH, wa, wb, scratch);
              const v = ok ? dot(f.ref, scratch) : -2;
              if (v > best) { best = v; bx = f.x + i; by = f.y + j; }
            }
          }
          f.ncc = best;
          const strayed = transOnly && region.radius
            && Math.hypot(f.mx - region.anchor.x, f.my - region.anchor.y) > region.radius * 1.25;
          if (best < NCC_KEEP || strayed || f.x < 3 || f.y < 3 || f.x > W - 4 || f.y > H - 4) {
            f.active = false;
          } else {
            f.x = f.x * 0.5 + bx * 0.5;        // half a step towards the better-matching spot
            f.y = f.y * 0.5 + by * 0.5;
            live++; nccSum += best;
          }
        }

        // 3. Consensus: one similarity transform from the features that agree.
        const fit = live >= 1 ? robustFit(feats, transOnly) : null;
        for (const f of feats) if (f.outlier && f.residual > 6) f.active = false;

        const need = Math.max(3, Math.min(initial, Math.round(initial * 0.4)));
        const conf = fit ? Math.min(1, fit.inliers / need) * (nccSum / Math.max(1, live)) : 0;
        if (!fit || fit.inliers < 1 || conf < CONF_LOST) {
          if (++bad >= LOST_FRAMES) { lost = true; lostAt = t; return null; }
          prev = pyr; lastT = t;
          return null;
        }
        bad = 0;
        const shaky = conf < CONF_LOST + 0.15 || fit.inliers < 4;   // partly hidden: keep following, write nothing

        // Keep the fit sane: scale and angle move smoothly, never jump.
        const m = fit.m;
        const rate = Math.pow(1.12, gap);          // at most 12 % of size change per frame
        const sClamped = Math.max(0.15, Math.min(8, Math.max(sim.s / rate, Math.min(sim.s * rate, m.s))));
        const dDeg = ((m.deg - sim.deg + 540) % 360) - 180;
        const deg = sim.deg + Math.max(-12 * gap, Math.min(12 * gap, dDeg));
        const nrad = (deg * Math.PI) / 180;
        const next = { a: sClamped * Math.cos(nrad), b: sClamped * Math.sin(nrad), tx: m.tx, ty: m.ty, s: sClamped, deg };
        // Re-centre the translation so the anchor lands where the raw fit put it.
        const rawAnchor = applySim(m, region.anchor.x, region.anchor.y);
        const tmp = applySim({ a: next.a, b: next.b, tx: 0, ty: 0 }, region.anchor.x, region.anchor.y);
        next.tx = rawAnchor.x - tmp.x; next.ty = rawAnchor.y - tmp.y;

        vel = {
          x: (next.tx - sim.tx) / gap * 0.6 + vel.x * 0.4,
          y: (next.ty - sim.ty) / gap * 0.6 + vel.y * 0.4,
          ds: (next.s - sim.s) / gap * 0.6 + vel.ds * 0.4,
        };
        sim = next;
        prev = pyr;
        lastT = t;

        // 4. Recovery: top the model back up with features from where the object is now.
        if (live < Math.max(MIN_FEAT, initial * 0.5)) {
          const cur = feats.filter((f) => f.active).map((f) => ({ x: f.x, y: f.y }));
          const inv = invert(sim);
          const now = applySim(sim, region.anchor.x, region.anchor.y);
          const rr = region.radius || 0;
          const box = transOnly && rr ? { x0: now.x - rr, x1: now.x + rr, y0: now.y - rr, y1: now.y + rr } : warpBBox(region.bbox, sim);
          const within = transOnly && rr
            ? (x, y) => (x - now.x) * (x - now.x) + (y - now.y) * (y - now.y) <= rr * rr
            : (x, y) => { const p = applySim(inv, x, y); return region.inside(p.x, p.y); };
          const fresh = detect(pyr[0], W, H, within, box, Math.min(MAX_FEAT - live, 16), cur, transOnly ? 4 : 7);
          for (const c of fresh) {
            const patch = new Float32Array(scratch.length);
            if (!warpedPatch(pyr[0].d, W, H, c.x, c.y, PATCH, wa, wb, patch)) continue;
            const p = applySim(inv, c.x, c.y);
            feats.push({ mx: p.x, my: p.y, x: c.x, y: c.y, ref: patch, active: true, ncc: 1 });
          }
        }

        if (shaky) return null;
        const anchor = applySim(sim, region.anchor.x, region.anchor.y);
        return {
          t,
          x: (2 * anchor.x) / W - 1,
          y: 1 - (2 * anchor.y) / H,
          s: sim.s, r: sim.deg, ncc: conf,
          features: live,
        };
      },
    };
  }

  function invert(m) {
    const den = m.a * m.a + m.b * m.b;
    const a = m.a / den, b = -m.b / den;
    return { a, b, tx: -(a * m.tx - b * m.ty), ty: -(b * m.tx + a * m.ty) };
  }
  function warpBBox(bb, m) {
    const cs = [
      applySim(m, bb.x0, bb.y0), applySim(m, bb.x1, bb.y0),
      applySim(m, bb.x1, bb.y1), applySim(m, bb.x0, bb.y1),
    ];
    return {
      x0: Math.min(...cs.map((c) => c.x)), x1: Math.max(...cs.map((c) => c.x)),
      y0: Math.min(...cs.map((c) => c.y)), y1: Math.max(...cs.map((c) => c.y)),
    };
  }

  /* ---------------------------------------------------------------- re-acquisition */

  /* The marked region at 1/4 resolution, normalised, with its centre in level-0 pixels. */
  function regionThumb(pyr, region) {
    const lvl = Math.min(2, pyr.length - 1);
    const L = pyr[lvl], f = 1 / (1 << lvl);
    const bb = region.bbox;
    const w = Math.round((bb.x1 - bb.x0) * f), h = Math.round((bb.y1 - bb.y0) * f);
    if (w < 4 || h < 4) return null;
    const hw = Math.min(14, w >> 1), hh = Math.min(14, h >> 1);   // cap the search cost
    const sp = Math.max(1, Math.max(w / (2 * hw), h / (2 * hh)));
    const cx = ((bb.x0 + bb.x1) / 2) * f, cy = ((bb.y0 + bb.y1) / 2) * f;
    const n = (2 * hw + 1) * (2 * hh + 1);
    const out = new Float32Array(n);
    let k = 0, mean = 0;
    for (let j = -hh; j <= hh; j++) for (let i = -hw; i <= hw; i++) { const v = samp(L.d, L.W, L.H, cx + i * sp, cy + j * sp); out[k++] = v; mean += v; }
    mean /= n;
    let ss = 0;
    for (let i = 0; i < n; i++) { out[i] -= mean; ss += out[i] * out[i]; }
    if (ss < 1e-6) return null;
    const inv = 1 / Math.sqrt(ss);
    for (let i = 0; i < n; i++) out[i] *= inv;
    return { data: out, hw, hh, sp, lvl, cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2 };
  }
  /* Exhaustive NCC search for the thumbnail over the whole frame at its level, sampled at the object's
   * last known size and angle (a, b = s·cos, s·sin) and at a few sizes around it, since the object
   * may have grown or shrunk while it was hidden. */
  function findThumb(th, pyr, a, b) {
    const lvl = Math.min(th.lvl, pyr.length - 1);
    const L = pyr[lvl], f = 1 << lvl;
    const n = th.data.length;
    const buf = new Float32Array(n);
    let best = -2, bx = 0, by = 0, bs = 1, bd = 0;
    for (const sc of [0.85, 1, 1.18]) for (const dd of [-10, 0, 10]) {
      const rr = (dd * Math.PI) / 180, ca = Math.cos(rr), sa = Math.sin(rr);
      const a2 = a * ca - b * sa, b2 = a * sa + b * ca;         // rotate the last known angle by dd
      const wa = a2 * sc * th.sp, wb = b2 * sc * th.sp;
      const reach = Math.ceil(Math.max(th.hw, th.hh) * Math.hypot(wa, wb));
      for (let y = reach; y < L.H - reach; y += 2) {
        for (let x = reach; x < L.W - reach; x += 2) {
          let k = 0, mean = 0;
          for (let j = -th.hh; j <= th.hh; j++) for (let i = -th.hw; i <= th.hw; i++) { const v = samp(L.d, L.W, L.H, x + wa * i - wb * j, y + wb * i + wa * j); buf[k++] = v; mean += v; }
          mean /= n;
          let d = 0, ss = 0;
          for (let i = 0; i < n; i++) { const v = buf[i] - mean; d += th.data[i] * v; ss += v * v; }
          const v = ss > 1e-6 ? d / Math.sqrt(ss) : -1;
          if (v > best) { best = v; bx = x; by = y; bs = sc; bd = dd; }
        }
      }
    }
    return { ncc: best, x: bx * f, y: by * f, scale: bs, ddeg: bd };
  }

  /* ---------------------------------------------------------------- object proposals */

  /* Things in a frame worth tracking: cells of strong corners are grouped into connected regions and
   * returned as boxes (video-plane units), best first. Not object recognition — texture is what a
   * tracker can hold on to, and this finds where the texture is. */
  function suggest(grey, W, H, max) {
    const CELL = Math.max(6, Math.round(W / 48));
    const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    const count = new Uint16Array(cols * rows);
    const pts = detect({ d: grey }, W, H, () => true, { x0: 2, x1: W - 3, y0: 2, y1: H - 3 }, 900, [], Math.max(3, CELL / 3));
    if (pts.length < 8) return [];
    for (const p of pts) count[Math.floor(p.y / CELL) * cols + Math.floor(p.x / CELL)]++;
    // A cell counts when it has corners AND at least one neighbour does: that joins the parts of an
    // object without bridging across quiet gaps to the next thing.
    const on = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (count[k] < 1) continue;
      let nb = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue;
        const rr = r + j, cc = c + i;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && count[rr * cols + cc] >= 1) nb++;
      }
      on[k] = count[k] >= 2 || nb >= 2 ? 1 : 0;
    }
    const seen = new Uint8Array(on.length);
    const boxes = [];
    const maxArea = cols * rows * 0.3;
    for (let start = 0; start < on.length; start++) {
      if (!on[start] || seen[start]) continue;
      const stack = [start];
      seen[start] = 1;
      let x0 = cols, x1 = -1, y0 = rows, y1 = -1, feats = 0, cells = 0;
      while (stack.length) {
        const k = stack.pop();
        const r = Math.floor(k / cols), c = k % cols;
        x0 = Math.min(x0, c); x1 = Math.max(x1, c); y0 = Math.min(y0, r); y1 = Math.max(y1, r);
        feats += count[k]; cells++;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          const kk = rr * cols + cc;
          if (on[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); }
        }
      }
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      if (feats < 8 || cells < 4) continue;
      if (cw * ch > maxArea) continue;                 // a region that big is scenery, not an object
      if (cw < 2 || ch < 2) continue;                  // a lone edge is not trackable in both directions
      boxes.push({ feats, fill: cells / (cw * ch), cells,
        x0: Math.max(0, x0 * CELL), y0: Math.max(0, y0 * CELL), x1: Math.min(W, (x1 + 1) * CELL), y1: Math.min(H, (y1 + 1) * CELL) });
    }
    // compact, well-filled regions with many features first
    boxes.sort((a, b) => b.feats * b.fill - a.feats * a.fill);
    // drop proposals mostly inside a better one
    const kept = [];
    for (const b of boxes) {
      const inside = kept.some((k) => {
        const ix = Math.max(0, Math.min(b.x1, k.x1) - Math.max(b.x0, k.x0)), iy = Math.max(0, Math.min(b.y1, k.y1) - Math.max(b.y0, k.y0));
        return (ix * iy) / ((b.x1 - b.x0) * (b.y1 - b.y0)) > 0.6;
      });
      if (!inside) kept.push(b);
      if (kept.length >= (max || 6)) break;
    }
    // a little margin so the box reads as "around" the object
    return kept.map((b) => {
      const mx = CELL * 0.5, my = CELL * 0.5;
      const bx0 = Math.max(0, b.x0 - mx), bx1 = Math.min(W, b.x1 + mx), by0 = Math.max(0, b.y0 - my), by1 = Math.min(H, b.y1 + my);
      return { x: ((bx0 + bx1) / 2 / W) * 2 - 1, y: 1 - ((by0 + by1) / 2 / H) * 2, w: ((bx1 - bx0) / W) * 2, h: ((by1 - by0) / H) * 2, features: b.feats };
    });
  }

  /* Object proposals for the frame the video is currently showing. */
  function suggestObjects(video, width, height, max) {
    const W = ANALYSIS_W, H = Math.max(32, Math.round((ANALYSIS_W * height) / Math.max(1, width)));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, W, H);
    const px = ctx.getImageData(0, 0, W, H).data;
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    return suggest(g, W, H, max);
  }

  /* ---------------------------------------------------------------- driver */

  /**
   * Track a region through the clip.
   * opts = {
   *   video, width, height,      // the element to read frames from and the video's pixel size
   *   seek(t) -> Promise,        // position the video and resolve when the frame is ready
   *   region: { type: 'box' | 'poly' | 'point', t, x, y, w, h, points },  // video-plane units
   *   from, to, onProgress(frac, key, dir), signal, forceSeek,
   * }
   * Resolves { keys, lostForward, lostBackward, mode, stats }.
   */
  async function track(opts) {
    const { video, seek, region } = opts;
    const W = ANALYSIS_W, H = Math.max(32, Math.round((ANALYSIS_W * opts.height) / Math.max(1, opts.width)));
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const stats = { frames: 0, computeMs: 0, greyMs: 0, features: 0 };
    const grey = () => {
      const t0 = performance.now();
      ctx.drawImage(video, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      const g = new Uint8Array(W * H);
      for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
      stats.greyMs += performance.now() - t0;
      return g;
    };

    await seek(region.t);
    const refPyr = pyramid(grey(), W, H);
    const reg = regionInPixels(region, W, H);

    // Seed the model on the reference frame.
    const want = region.type === 'point' ? 16 : MAX_FEAT;
    const minDist = region.type === 'point' ? 4 : Math.max(5, Math.round(Math.min(reg.bbox.x1 - reg.bbox.x0, reg.bbox.y1 - reg.bbox.y0) / 6));
    let found = detect(refPyr[0], W, H, reg.inside, reg.bbox, want, [], minDist);
    if (found.length < MIN_FEAT) {
      // Fall back to a grid over the region so a soft-edged object still tracks, if it has any texture.
      const grid = [];
      const stepX = Math.max(4, (reg.bbox.x1 - reg.bbox.x0) / 5), stepY = Math.max(4, (reg.bbox.y1 - reg.bbox.y0) / 5);
      for (let y = reg.bbox.y0; y <= reg.bbox.y1; y += stepY) {
        for (let x = reg.bbox.x0; x <= reg.bbox.x1; x += stepX) {
          if (x > 3 && y > 3 && x < W - 4 && y < H - 4 && reg.inside(x, y)) grid.push({ x, y, score: 0 });
        }
      }
      found = found.concat(grid).slice(0, want);
    }
    const model = [];
    for (const f of found) {
      const patch = new Float32Array((2 * PATCH + 1) * (2 * PATCH + 1));
      if (!warpedPatch(refPyr[0].d, W, H, f.x, f.y, PATCH, 1, 0, patch)) continue;
      model.push({ mx: f.x, my: f.y, ref: patch });
    }
    if (model.length < 1) {
      throw new Error('There is nothing to track in that area — mark something with edges or texture (a logo, a screen corner, a pattern), not a flat surface.');
    }
    stats.features = model.length;
    // A point tracker reports translation only, so its anchor must be the centre of the features it
    // actually follows: otherwise the object growing under it reads as the point sliding away.
    if (reg.transOnly && model.length) {
      let cx = 0, cy = 0;
      for (const f of model) { cx += f.mx; cy += f.my; }
      reg.anchor = { x: cx / model.length, y: cy / model.length };
    }

    const total = Math.max(1, Math.round((opts.to - opts.from) / STEP));
    let done = 0;
    const keys = [{ t: region.t, x: region.x != null ? region.x : (2 * reg.anchor.x) / W - 1, y: region.y != null ? region.y : 1 - (2 * reg.anchor.y) / H, s: 1, r: 0, ncc: 1 }];
    keys[0].x = (2 * reg.anchor.x) / W - 1;
    keys[0].y = 1 - (2 * reg.anchor.y) / H;

    const fwd = makeTracker(refPyr, model, reg, W, H);
    const back = makeTracker(refPyr, model, reg, W, H);
    const checkAbort = () => { if (opts.signal && opts.signal.aborted) throw abortError(); };
    const run = (st, pyr, t, dir, rate) => {
      const t0 = performance.now();
      const key = st.step(pyr, t);
      stats.computeMs += performance.now() - t0;
      stats.frames++;
      done++;
      if (key) keys.push(key);
      if (opts.onProgress) opts.onProgress(Math.min(1, done / total), Object.assign({ t, ncc: 0, features: 0 }, key, { rate }), dir);
    };

    const canPlay = typeof video.requestVideoFrameCallback === 'function' && !opts.forceSeek;
    if (canPlay) {
      // Backward part: play up to the reference frame keeping the frames, then walk them in reverse.
      const buffer = [];
      const backFrom = Math.max(opts.from, region.t - BACK_FRAMES * STEP);
      let rate = 0.5;
      const onRate = (r) => { rate = r; stats.rate = r; };
      if (region.t - backFrom > STEP * 0.5) {
        await playRange(video, seek, backFrom, region.t, opts.signal, (t) => {
          buffer.push({ t, g: grey() });
          if (buffer.length > BACK_FRAMES) buffer.shift();
          if (opts.onProgress) opts.onProgress(Math.min(0.45, (0.45 * (t - backFrom)) / Math.max(STEP, region.t - backFrom)), { t, ncc: 0, features: 0, reading: true, rate }, 0);
        }, onRate);
      }
      // Forward part: live from the reference frame to the end.
      if (opts.to - region.t > STEP * 0.5) {
        await playRange(video, seek, region.t, opts.to, opts.signal, (t) => {
          if (t > region.t + STEP * 0.5) run(fwd, pyramid(grey(), W, H), t, +1, rate);
        }, onRate);
      }
      for (let i = buffer.length - 1; i >= 0; i--) {
        checkAbort();
        if (buffer[i].t < region.t - STEP * 0.5) run(back, pyramid(buffer[i].g, W, H), buffer[i].t, -1);
        buffer[i].g = null;
        if ((i & 7) === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } else {
      for (const [st, dir] of [[fwd, +1], [back, -1]]) {
        let t = region.t;
        for (;;) {
          t = Math.round((t + dir * STEP) * 1e4) / 1e4;
          if (dir > 0 ? t > opts.to + 1e-6 : t < opts.from - 1e-6) break;
          checkAbort();
          await seek(t);
          run(st, pyramid(grey(), W, H), t, dir);
        }
      }
    }

    keys.sort((a, b) => a.t - b.t);
    smooth(keys);
    return { keys, lostForward: fwd.lost, lostBackward: back.lost, lostAtForward: fwd.lostAt, lostAtBackward: back.lostAt, mode: canPlay ? 'play' : 'seek', stats };
  }

  /* Play from `from` to `to`, calling onFrame(mediaTime) for every distinct frame.
   *
   * Playing at 1x only works if reading and analysing a frame fits inside a frame period; when it does
   * not the browser simply presents the next frame and the tracker never sees the ones in between,
   * which is what makes a tracker wander. So this plays SLOWER than real time, and slows down further
   * whenever it notices a frame went by unseen: correctness first, and the status line says the rate.
   */
  function playRange(video, seek, from, to, signal, onFrame, onRate) {
    return new Promise((resolve, reject) => {
      seek(from).then(() => {
        const wasMuted = video.muted, wasLoop = video.loop, wasRate = video.playbackRate;
        let rate = 0.5, drops = 0, lastMedia = -1;
        video.muted = true; video.loop = false; video.playbackRate = rate;
        if (onRate) onRate(rate);
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
        const onPause = () => { if (!finished) finish(); };
        const cb = (now, meta) => {
          if (finished) return;
          if (signal && signal.aborted) { finish(abortError()); return; }
          const t = meta.mediaTime;
          const fresh = lastMedia < 0 || t - lastMedia > STEP * 0.6;
          if (fresh) {
            // A jump of more than one frame means the machine cannot keep up: play slower.
            if (lastMedia >= 0 && t - lastMedia > STEP * 1.6) {
              if (++drops >= 1 && rate > 0.13) { rate /= 2; video.playbackRate = rate; drops = 0; if (onRate) onRate(rate); }
            }
            lastMedia = t;
            try {
              if (t <= to + 1e-4) onFrame(t);
            } catch (e) { finish(e); return; }
          }
          if (t >= to - 1e-4) { finish(); return; }
          handle = video.requestVideoFrameCallback(cb);
        };
        video.addEventListener('ended', onEnded);
        handle = video.requestVideoFrameCallback(cb);
        video.play().then(() => video.addEventListener('pause', onPause)).catch((e) => finish(e));
      }, reject);
    });
  }

  /* Light smoothing: the consensus fit is already steady, this only takes off sampling jitter. */
  function smooth(keys) {
    const n = keys.length;
    if (n < 3) return;
    const sx = new Float32Array(n), sy = new Float32Array(n), ss = new Float32Array(n), sr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = keys[Math.max(0, i - 1)], b = keys[i], c = keys[Math.min(n - 1, i + 1)];
      sx[i] = a.x * 0.2 + b.x * 0.6 + c.x * 0.2;
      sy[i] = a.y * 0.2 + b.y * 0.6 + c.y * 0.2;
    }
    for (let i = 0; i < n; i++) {
      let accS = 0, accR = 0, wsum = 0;
      for (let k = -2; k <= 2; k++) {
        const j = Math.min(n - 1, Math.max(0, i + k));
        const w = k === 0 ? 0.4 : Math.abs(k) === 1 ? 0.2 : 0.1;
        accS += (keys[j].s == null ? 1 : keys[j].s) * w;
        accR += (keys[j].r || 0) * w;
        wsum += w;
      }
      ss[i] = accS / wsum; sr[i] = accR / wsum;
    }
    for (let i = 0; i < n; i++) {
      keys[i].x = Math.round(sx[i] * 1e4) / 1e4;
      keys[i].y = Math.round(sy[i] * 1e4) / 1e4;
      keys[i].s = Math.round(ss[i] * 1e4) / 1e4;
      keys[i].r = Math.round(sr[i] * 100) / 100;
    }
  }

  global.Tracker = { track, suggestObjects, STEP, ANALYSIS_W };
})(window);
