import React from 'react';
import {useCurrentFrame} from 'remotion';
import {INTEGRATIONS} from '../data/integrations';
import {IconTile, Monogram} from '../components/IconTile';
import {Pill} from '../components/Pill';
import {clamp01, expoOut, lerp, osc, randRange, remap} from '../motion';

// Beat 1 — Scatter (f0–119) + the tile collapse that opens beat 2 (f120–132).
// Sequence: from 0, duration 134. Local frame == global frame.

const CENTER = {x: 269, y: 330};

const entryStart = (i: number) => 8 + i * 4;
const TRAVEL = 26;

const nearestEdgeStart = (x: number, y: number): [number, number] => {
  const d = [x, 540 - x, y, 700 - y]; // left, right, top, bottom (stage-ish bounds)
  const min = Math.min(...d);
  if (min === d[0]) return [-90, y];
  if (min === d[1]) return [630, y];
  if (min === d[2]) return [x, -90];
  return [x, 720];
};

export const B1Scatter: React.FC = () => {
  const f = useCurrentFrame();

  // Collapse order: outside in (rank by distance from centre, descending).
  const ranked = INTEGRATIONS.map((t, i) => ({
    i,
    d: Math.hypot(t.x - CENTER.x, t.y - CENTER.y),
  }))
    .sort((a, b) => b.d - a.d)
    .map((e, rank) => ({...e, rank}));
  const rankOf = (i: number) => ranked.find((e) => e.i === i)!.rank;

  const counterOp =
    remap(f, 30, 38, 0, 1) * (1 - remap(f, 102, 110, 0, 1));
  const sources = Math.round(lerp(12, 47, clamp01((f - 38) / 62)));

  return (
    <>
      {INTEGRATIONS.map((t, i) => {
        const t0 = entryStart(i);
        const p = expoOut((f - t0) / TRAVEL);
        if (f < t0) return null;
        const [sx, sy] = nearestEdgeStart(t.x, t.y);
        const x = lerp(sx, t.x, p);
        const y = lerp(sy, t.y, p);
        // Arrival rotation settles over the last 8 frames of travel; adjacent
        // tiles alternate direction.
        const rotAmp = randRange(i * 3 + 2, 4, 8) * (i % 2 === 0 ? 1 : -1);
        const settle = clamp01((f - t0 - (TRAVEL - 8)) / 8);
        const rot = rotAmp * (1 - settle);
        const bobRamp = clamp01((f - t0 - TRAVEL) / 12);
        const bob = 3 * osc(f, 4, randRange(i * 11 + 4, 0, Math.PI * 2)) * bobRamp;
        // Collapse inward from f120, staggered 1 frame apart from the outside in.
        const c0 = 120 + rankOf(i);
        const cp = expoOut((f - c0) / 10);
        const cx = lerp(x, CENTER.x, cp * 0.5);
        const cy = lerp(y + bob, CENTER.y, cp * 0.5);
        const scale = lerp(1, 0.5, cp);
        const opacity = clamp01(p * 3) * (1 - cp);
        if (opacity <= 0) return null;
        return (
          <div
            key={t.name}
            style={{
              position: 'absolute',
              left: cx - 22.88,
              top: cy - 22.88,
              transform: `rotate(${rot}deg) scale(${scale})`,
              opacity,
            }}
          >
            <IconTile>
              <Monogram text={t.mono} />
            </IconTile>
          </div>
        );
      })}
      {counterOp > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 350,
            top: 556,
            opacity: counterOp,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Pill label={`Sources · ${sources}`} docked={false} />
        </div>
      ) : null}
    </>
  );
};
