/* ══ Motion primitives ════════════════════════════════════════════
   Implemented once; every scene composes these. Fast moves (16–26
   frames), long still holds, hard cuts — stillness is what makes the
   cuts land. At most two things animate at once. */

import { Easing, interpolate, random, spring } from 'remotion';

/* Entry — expo out. Anything arriving on screen. */
export const EASE_IN = Easing.bezier(0.16, 1, 0.3, 1);
/* Exit — expo in. Rarely used; beats hard-cut. */
export const EASE_OUT = Easing.bezier(0.7, 0, 0.84, 0);
/* Badge spring — lands around 1.1 before settling, which is the
   overshoot the pop wants. */
export const SPRING = { damping: 12, mass: 0.6, stiffness: 180 };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* Progress 0→1 from `at`, eased for arrival. */
export const arrive = (frame: number, at: number, dur: number) =>
  interpolate(frame, [at, at + dur], [0, 1], {
    easing: EASE_IN, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

/* badgePop — scale via spring (overshoots ~1.12), squash on landing. */
export const pop = (frame: number, fps: number, at: number) => {
  if (frame < at) return { scale: 0, squash: 1, p: 0 };
  const s = spring({ frame: frame - at, fps, config: SPRING });
  /* 2-frame squash as it lands, then settle. */
  const squash = interpolate(frame - at, [10, 12, 16], [1, 0.93, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale: s, squash, p: clamp01((frame - at) / 16) };
};

/* Quadratic bezier point. */
export const qBez = (
  t: number,
  p0: { x: number; y: number }, c: { x: number; y: number }, p1: { x: number; y: number },
) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});

/* snapAttach — travel a bezier over 20 frames, overshoot 8px past the
   target, return over 6. Returns position + progress for the ring. */
export const snap = (
  frame: number, at: number,
  from: { x: number; y: number }, to: { x: number; y: number },
  over = 8,
) => {
  const t = interpolate(frame, [at, at + 20], [0, 1], {
    easing: EASE_IN, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: from.x + dx * 0.5 - dy * 0.22, y: from.y + dy * 0.5 + dx * 0.22 };
  const p = qBez(t, from, c, to);
  /* Overshoot along the travel direction, then come back. */
  const o = interpolate(frame, [at + 14, at + 20, at + 26], [0, over, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { x: p.x + (dx / len) * o, y: p.y + (dy / len) * o, t };
};

/* Ring pulse — scale 1→1.35, opacity .5→0 over 12 frames. */
export const ringPulse = (frame: number, at: number, dur = 12) => {
  const t = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { scale: 1 + 0.35 * t, opacity: frame < at ? 0 : 0.5 * (1 - t) };
};

/* Seeded jitter — renders must be reproducible. */
export const seeded = (key: string, min: number, max: number) =>
  min + random(key) * (max - min);
