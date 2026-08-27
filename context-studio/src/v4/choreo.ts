import {SPHERES} from './tokens';
import {worldForScreen} from './camera';
import {clamp01, cubicIn, cubicInOut, lerp, osc, rand, randRange, remap, sineInOut} from '../motion';

// ---- Grid (§0.2) -----------------------------------------------------------
export const GRID = {cols: 9, rows: 5, pitchX: 0.207, pitchY: 0.385, dia: 0.049};
export const HERO = {c: 4, r: 2};

export type Cell = {
  key: string;
  c: number;
  r: number;
  px: number;
  py: number;
  from: string;
  to: string;
  angle: number;
  fadeStart: number;
  isHero: boolean;
  sevenIdx: number; // -1 for plain grid spheres
};

// Which grid cells the seven named spheres start from (all near centre).
const SEVEN_CELLS: Array<[number, number]> = [
  [3, 2], // ontology
  [4, 1], // glossary
  [5, 2], // tools
  [3, 1], // prompts
  [5, 1], // rules
  [3, 3], // policies
  [5, 3], // data
];

export const buildCells = (): Cell[] => {
  const cells: Cell[] = [];
  for (let c = 0; c < GRID.cols; c++) {
    for (let r = 0; r < GRID.rows; r++) {
      const i = c * GRID.rows + r;
      const sevenIdx = SEVEN_CELLS.findIndex(([sc, sr]) => sc === c && sr === r);
      const isHero = c === HERO.c && r === HERO.r;
      // blue/indigo/violet dominant; roughly one teal and one green per nine
      const mod = i % 9;
      const hue = mod === 4 ? 172 : mod === 8 ? 146 : randRange(i * 3 + 1, 208, 285);
      const spec = sevenIdx >= 0 ? SPHERES[sevenIdx] : null;
      cells.push({
        key: `${c}-${r}`,
        c,
        r,
        px: 0.5 + (c - HERO.c) * GRID.pitchX,
        py: 0.5 + (r - HERO.r) * GRID.pitchY,
        from: spec ? spec.from : `hsl(${hue}, 68%, 52%)`,
        to: spec ? spec.to : `hsl(${(hue + 32) % 360}, 78%, 74%)`,
        angle: spec ? spec.angle : randRange(i * 7 + 2, 0, 360),
        fadeStart: 6 + rand(i * 13 + 5) * 52,
        isHero,
        sevenIdx,
      });
    }
  }
  return cells;
};

export const CELLS = buildCells();

export const gridDrift = (f: number, i: number): [number, number] => {
  const period = i % 2 === 0 ? 6.5 : 13;
  const p1 = rand(i * 19 + 3) * Math.PI * 2;
  return [0.006 * osc(f, period, p1), 0.009 * osc(f, period, p1 + 1.3)];
};

// ---- The seven (beats 2–3) ---------------------------------------------------
// Depths per §8; scatter targets authored in SCREEN space at zoom 1.62 and
// converted to world coords once.
const DEPTHS = [0.18, 0.34, 0.55, 0.78, 0.42, 0.68, 0.91]; // by SPHERES order
const SCREEN_TARGETS: Array<[number, number]> = [
  [0.3, 0.6], // ontology
  [0.44, 0.36], // glossary
  [0.72, 0.34], // tools
  [0.83, 0.64], // prompts
  [0.62, 0.58], // rules
  [0.22, 0.38], // policies
  [0.5, 0.7], // data
];

export const sevenTarget = (i: number): {x: number; y: number; d: number} => {
  const d = DEPTHS[i];
  const [sx, sy] = SCREEN_TARGETS[i];
  return {x: worldForScreen(sx, d, 1.62), y: worldForScreen(sy, d, 1.62), d};
};

export type SphereState = {
  x: number;
  y: number;
  d: number;
  scale: number;
  opacity: number;
};

const GATHER_START = 342;
const GATHER_DUR = 72;

export const sevenState = (f: number, i: number, aspect: number): SphereState => {
  const cell = CELLS.find((c) => c.sevenIdx === i)!;
  const tgt = sevenTarget(i);
  const gp = cubicInOut((f - 150) / 40); // scatter travel f150–190
  const [gdx, gdy] = gridDrift(Math.min(f, 150), cell.c * GRID.rows + cell.r);
  let x = lerp(cell.px + gdx, tgt.x, gp);
  let y = lerp(cell.py + gdy, tgt.y, gp);
  let d = lerp(0.5, tgt.d, gp);
  // idle drift while named
  if (f > 190 && f < GATHER_START) {
    const ph = rand(i * 23 + 11) * Math.PI * 2;
    x += 0.004 * osc(f, 6.5, ph) * remap(f, 190, 210, 0, 1);
    y += 0.005 * osc(f, 13, ph + 0.9) * remap(f, 190, 210, 0, 1);
  }
  // the gather: inward spiral, angular speed rising as radius falls (§8 B3)
  if (f >= GATHER_START) {
    const t = clamp01((f - GATHER_START) / GATHER_DUR);
    const u0 = tgt.x - 0.5;
    const v0 = (tgt.y - 0.5) * aspect;
    const r0 = Math.hypot(u0, v0);
    const a0 = Math.atan2(v0, u0);
    const r = r0 * (1 - cubicIn(t));
    const a = a0 + t * Math.PI * 2.4 * (1 + 1.8 * t);
    x = 0.5 + r * Math.cos(a);
    y = 0.5 + (r * Math.sin(a)) / aspect;
    d = lerp(tgt.d, 0.5, sineInOut(t));
  }
  // absorption f414–428, staggered 2 frames
  const ab = remap(f, 414 + i * 2, 422 + i * 2, 0, 1);
  const enter = gridEnter(f, cell);
  return {
    x,
    y,
    d,
    scale: enter.scale * lerp(1, 0.15, ab),
    opacity: enter.opacity * (1 - ab) * heroDim(f, cell),
  };
};

// ---- Shared grid entry/dim -----------------------------------------------------
export const gridEnter = (f: number, cell: Cell): {scale: number; opacity: number} => {
  const p = clamp01((f - cell.fadeStart) / 10);
  return {scale: lerp(0.88, 1, sineInOut(p)), opacity: p};
};

// Neighbours dim 12% as the hero ignites (f96–120).
export const heroDim = (f: number, cell: Cell): number => {
  const near = Math.abs(cell.c - HERO.c) <= 1 && Math.abs(cell.r - HERO.r) <= 1 && !cell.isHero;
  if (!near) return 1;
  return 1 - 0.12 * remap(f, 96, 120, 0, 1);
};

// Plain grid spheres fade out as beat 2's push scatters the field.
export const gridExit = (f: number): number => 1 - remap(f, 152, 200, 0, 1);

// ---- The core --------------------------------------------------------------------
export type CoreState = {
  x: number;
  y: number;
  matteOpacity: number;
  emissiveOpacity: number;
  rimOpacity: number;
  haloStrength: number;
  conicOpacity: number;
  scale: number;
};

export const coreState = (
  f: number,
  spring450: number, // remotion spring evaluated by the caller at f-450
): CoreState => {
  // position: centre, drifting subtly, then the beat-5 arc into the node
  const drift = f < 616 ? 0.008 * osc(f, 13, 1.1) : 0;
  const tp = cubicInOut((f - 616) / 32);
  const x = lerp(0.5 + drift, 0.648, tp);
  const y = lerp(0.5 + 0.006 * osc(f, 6.5, 2.3), 0.47, tp) - 0.03 * Math.sin(Math.PI * tp);

  // ignition f96–120: rim first, then halo
  const rimOpacity = remap(f, 96, 104, 0, 1);
  const haloIn = remap(f, 104, 120, 0, 1);
  const matteOpacity = 1 - remap(f, 100, 116, 0, 1);
  // flash f450: halo lifts to 1.8× then settles over 30f
  const flashHalo = remap(f, 450, 456, 0, 1) * (1 - remap(f, 456, 480, 0, 1));
  const travelHalo = remap(f, 616, 648, 0, 1);
  const haloStrength = haloIn * (1 + 0.8 * flashHalo + 0.7 * travelHalo);

  // scale: grows eating the seven, springs on the flash, breathes, shrinks in
  const eat = 1 + 0.35 * sineInOut((f - 414) / 14 > 1 ? 1 : clamp01((f - 414) / 14));
  const flash = f >= 450 ? (1.35 + 0.2 * spring450) / 1.35 : 1;
  const breathe = 1 + 0.025 * osc(f, 3.25, 0) * remap(f, 486, 500, 0, 1);
  const travel = lerp(1, 0.52, tp);
  const scale = eat * flash * breathe * travel;

  const conicOpacity = 0.55 * remap(f, 450, 470, 0, 1);
  const emissiveOpacity = remap(f, 96, 110, 0, 1) * (1 - remap(f, 690, 714, 0, 1));

  return {x, y, matteOpacity, emissiveOpacity, rimOpacity, haloStrength, conicOpacity, scale};
};
