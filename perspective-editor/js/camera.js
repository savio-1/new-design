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
  };
  const EASING_LABELS = { linear: 'Linear', easeInOut: 'Ease in-out', easeIn: 'Ease in', easeOut: 'Ease out', smooth: 'Smooth' };

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
        const p = (EASINGS[b.easing] || EASINGS.easeInOut)(clamp01((t - a.t) / span));
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
      description: 'Opens very close and out of focus, then pulls back until everything is sharp.',
      build: (s, e) => [K(s, { dolly: 1.3, yaw: 6 }), K(e, { dolly: 0, yaw: 0, easing: 'easeOut' })],
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

  global.Camera = { EASINGS, EASING_LABELS, FIELDS, defaultKey, evaluate, replaceRange, sorted, MOVES };
})(window);
