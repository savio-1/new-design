/* Camera keyframes for the text world.
 *
 * A key = { id, t, x, y, dolly, yaw, pitch, roll, focus, easing }
 *   x / y    truck / pedestal offsets from the resting camera (world units)
 *   dolly    distance moved toward the video plane (positive = closer; the resting camera sits at camDist)
 *   yaw/pitch/roll   degrees
 *   focus    focus distance from the lens (world units) — used only when autofocus is off; null = plane
 *   easing   how the camera eases INTO this key from the previous one
 */
(function (global) {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const EASINGS = {
    linear: (t) => t,
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    smooth: (t) => t * t * (3 - 2 * t),
    strongInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    slowIn: (t) => t * t * t,
    slowOut: (t) => 1 - Math.pow(1 - t, 3),
    hold: (t) => (t >= 1 ? 1 : 0),
    custom: (t) => t,   // replaced per key by its own curve, see easeFor()
  };
  const EASING_LABELS = {
    linear: 'Linear', easeInOut: 'Ease in-out', easeIn: 'Ease in', easeOut: 'Ease out', smooth: 'Smooth',
    strongInOut: 'Strong in-out', slowIn: 'Slow start', slowOut: 'Slow finish', hold: 'Hold then jump', custom: 'Custom curve…',
  };

  /* Cubic Bezier easing through (0,0) (x1,y1) (x2,y2) (1,1) — the same curve CSS uses. x is time,
   * y is progress; the x->t inversion is by Newton steps with a bisection fallback. */
  function cubicBezier(x1, y1, x2, y2) {
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1, B = (a1, a2) => 3 * a2 - 6 * a1, C = (a1) => 3 * a1;
    const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const dx = calc(t, x1, x2) - x;
        const sl = slope(t, x1, x2);
        if (Math.abs(dx) < 1e-6) break;
        if (Math.abs(sl) < 1e-6) break;
        t -= dx / sl;
      }
      if (t < 0 || t > 1 || Math.abs(calc(t, x1, x2) - x) > 1e-4) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (calc(t, x1, x2) < x) lo = t; else hi = t; }
      }
      return calc(t, y1, y2);
    };
  }
  const DEFAULT_CURVE = [0.4, 0, 0.2, 1];
  const curveCache = new Map();
  /* The easing function a key arrives with. */
  function easeFor(key) {
    if (key && key.easing === 'custom') {
      const c = Array.isArray(key.curve) && key.curve.length === 4 ? key.curve : DEFAULT_CURVE;
      const k = c.join(',');
      let f = curveCache.get(k);
      if (!f) { f = cubicBezier(clamp01(c[0]), c[1], clamp01(c[2]), c[3]); curveCache.set(k, f); }
      return f;
    }
    return EASINGS[key && key.easing] || EASINGS.easeInOut;
  }

  let counter = 1;
  const uid = () => `K${counter++}_${Math.random().toString(36).slice(2, 6)}`;

  function defaultKey(t, patch) {
    return Object.assign({ id: uid(), t, x: 0, y: 0, dolly: 0, yaw: 0, pitch: 0, roll: 0, focus: null, easing: 'easeInOut' }, patch || {});
  }

  const FIELDS = ['x', 'y', 'dolly', 'yaw', 'pitch', 'roll'];

  function sorted(keys) {
    return keys.slice().sort((a, b) => a.t - b.t);
  }

  /* Interpolated camera offsets at time t. */
  function evaluate(keys, t) {
    const out = { x: 0, y: 0, dolly: 0, yaw: 0, pitch: 0, roll: 0, focus: null };
    if (!keys || !keys.length) return out;
    const ks = sorted(keys);
    if (t <= ks[0].t) return pick(ks[0]);
    if (t >= ks[ks.length - 1].t) return pick(ks[ks.length - 1]);
    for (let i = 0; i < ks.length - 1; i++) {
      const a = ks[i], b = ks[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = Math.max(0.0001, b.t - a.t);
        const p = easeFor(b)(clamp01((t - a.t) / span));
        for (const f of FIELDS) out[f] = a[f] + (b[f] - a[f]) * p;
        out.focus = a.focus == null || b.focus == null ? (b.focus == null ? a.focus : b.focus) : a.focus + (b.focus - a.focus) * p;
        return out;
      }
    }
    return pick(ks[ks.length - 1]);
  }
  function pick(k) {
    const o = { focus: k.focus == null ? null : k.focus };
    for (const f of FIELDS) o[f] = k[f];
    return o;
  }

  /* Remove keys inside [start, end] and insert the new ones. */
  function replaceRange(keys, start, end, newKeys) {
    const kept = (keys || []).filter((k) => k.t < start - 0.001 || k.t > end + 0.001);
    return sorted(kept.concat(newKeys));
  }

  /* ---- Camera moves: generators over a time range ---------------------- */
  const K = (t, patch) => defaultKey(t, patch);
  const rand = (i, s) => Anim.hashRand(i, s);

  function orbit(start, end, camDist, dir, degrees) {
    const n = 6;
    const keys = [];
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1);
      const a = (-degrees / 2 + degrees * p) * dir;
      const rad = (a * Math.PI) / 180;
      keys.push(K(start + (end - start) * p, {
        x: Math.sin(rad) * camDist,
        dolly: camDist * (1 - Math.cos(rad)),
        yaw: a,
        easing: i === 0 ? 'linear' : i === 1 ? 'easeOut' : i === n - 1 ? 'easeIn' : 'linear',
      }));
    }
    return keys;
  }

  const MOVES = [
    {
      id: 'static', name: 'Hold still',
      description: 'Locks the camera on the resting position for this range.',
      build: (s, e) => [K(s, {}), K(e, {})],
    },
    {
      id: 'dollyIn', name: 'Dolly in',
      description: 'Glides toward the text so it grows and gains depth.',
      build: (s, e) => [K(s, { dolly: -0.1 }), K(e, { dolly: 0.55, easing: 'smooth' })],
    },
    {
      id: 'dollyOut', name: 'Dolly out',
      description: 'Starts close and settles back to the resting distance.',
      build: (s, e) => [K(s, { dolly: 0.6 }), K(e, { dolly: 0, easing: 'smooth' })],
    },
    {
      id: 'pushThrough', name: 'Push through',
      description: 'Slowly approaches, then flies past the words so they blur and leave the frame — the reference exit.',
      build: (s, e, camDist) => [
        K(s, { dolly: -0.05 }),
        K(s + (e - s) * 0.72, { dolly: 0.4, easing: 'easeInOut' }),
        K(e, { dolly: camDist + 0.35, easing: 'easeIn' }),
      ],
    },
    {
      id: 'orbitLeft', name: 'Orbit left',
      description: 'Sweeps around the text, revealing parallax between words at different depths.',
      build: (s, e, camDist) => orbit(s, e, camDist, -1, 40),
    },
    {
      id: 'orbitRight', name: 'Orbit right',
      description: 'The same sweep, mirrored.',
      build: (s, e, camDist) => orbit(s, e, camDist, 1, 40),
    },
    {
      id: 'crane', name: 'Crane up',
      description: 'Rises while tilting down onto the text.',
      build: (s, e) => [K(s, { y: -0.15, pitch: 4, dolly: 0 }), K(e, { y: 0.35, pitch: -9, dolly: 0.25, easing: 'smooth' })],
    },
    {
      id: 'reveal', name: 'Pull-back reveal',
      description: 'Starts with the lens in front of the nearest word, then tracks back so each word is revealed as the camera passes it.',
      build: (s, e, camDist, ctx) => {
        const nearest = ctx && ctx.maxZ != null ? ctx.maxZ : 0.6;
        return [
          K(s, { dolly: nearest + 0.25, x: 0.03 }),
          K(s + (e - s) * 0.7, { dolly: 0, x: 0, easing: 'easeOut' }),
          K(e, { dolly: -0.35, x: -0.02, easing: 'smooth' }),
        ];
      },
    },
    {
      id: 'trackBack', name: 'Tracking shot · back',
      description: 'A steady pull back for footage where the real camera walks backwards; far words fade as they fall behind.',
      build: (s, e, camDist, ctx) => {
        const nearest = ctx && ctx.maxZ != null ? ctx.maxZ : 0.6;
        return [K(s, { dolly: nearest + 0.2, easing: 'linear' }), K(e, { dolly: -0.8, easing: 'linear' })];
      },
    },
    {
      id: 'trackIn', name: 'Tracking shot · forward',
      description: 'A steady push forward for footage where the real camera walks toward the subject.',
      build: (s, e) => [K(s, { dolly: -0.8, easing: 'linear' }), K(e, { dolly: 0.9, easing: 'linear' })],
    },
    {
      id: 'drift', name: 'Handheld drift',
      description: 'Subtle wandering so the text feels filmed rather than pasted on.',
      build: (s, e) => {
        const n = 7;
        const keys = [];
        for (let i = 0; i < n; i++) {
          keys.push(K(s + ((e - s) * i) / (n - 1), {
            x: rand(i, 31) * 0.035, y: rand(i, 32) * 0.03, dolly: rand(i, 33) * 0.05,
            yaw: rand(i, 34) * 1.8, pitch: rand(i, 35) * 1.2, roll: rand(i, 36) * 0.8, easing: 'smooth',
          }));
        }
        return keys;
      },
    },
    {
      id: 'whipIn', name: 'Whip in',
      description: 'Swings in fast from the side with a little overshoot.',
      build: (s, e) => [
        K(s, { x: -1.2, yaw: -28 }),
        K(s + Math.min(0.6, (e - s) * 0.35), { x: 0.05, yaw: 1.5, easing: 'easeOut' }),
        K(e, { x: 0, yaw: 0, easing: 'smooth' }),
      ],
    },
  ];

  /* Interpolate an arbitrary set of numeric fields across a key list (used by the subject mask). */
  function evaluateOn(keys, t, fields) {
    const out = {};
    if (!keys || !keys.length) return null;
    const ks = sorted(keys);
    const first = ks[0], last = ks[ks.length - 1];
    if (t <= first.t) { for (const f of fields) out[f] = first[f]; return out; }
    if (t >= last.t) { for (const f of fields) out[f] = last[f]; return out; }
    for (let i = 0; i < ks.length - 1; i++) {
      const A = ks[i], B = ks[i + 1];
      if (t >= A.t && t <= B.t) {
        const span = Math.max(0.0001, B.t - A.t);
        const p = easeFor(B)(clamp01((t - A.t) / span));
        for (const f of fields) out[f] = A[f] + (B[f] - A[f]) * p;
        return out;
      }
    }
    for (const f of fields) out[f] = last[f];
    return out;
  }

  global.Camera = { EASINGS, EASING_LABELS, FIELDS, DEFAULT_CURVE, cubicBezier, easeFor, defaultKey, evaluate, evaluateOn, replaceRange, sorted, MOVES };
})(window);
