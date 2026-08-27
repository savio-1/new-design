// All periodic motion must use periods that divide 12s (12, 6, 4, 3) so the
// 720-frame loop closes seamlessly.
export const osc = (f: number, periodSec: number, phase = 0) =>
  Math.sin((f / 60 / periodSec) * Math.PI * 2 + phase);

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const expoOut = (t: number) => {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
};

export const expoInOut = (t: number) => {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
};

export const cubicInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Reproducible jitter — successive renders must match (guardrail §10).
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

export const randRange = (seed: number, min: number, max: number) =>
  min + rand(seed) * (max - min);

export const quadBezier = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number,
): [number, number] => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
};

export const remap = (
  v: number,
  inA: number,
  inB: number,
  outA: number,
  outB: number,
) => outA + (outB - outA) * clamp01((v - inA) / (inB - inA));
