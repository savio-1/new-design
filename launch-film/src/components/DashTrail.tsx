/* Speed dashes — 3 short rounded strokes in the mover's accent,
   trailing its entry vector, each alive 10 frames, staggered 2. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useFrameCtx } from './Frame';
import { clamp01 } from '../motion';

const LENGTHS = [40, 64, 28];

export const DashTrail: React.FC<{
  at: number;
  x: number; y: number;          /* where the mover lands (px) */
  vx: number; vy: number;        /* its travel vector (px) */
  accent: string;
}> = ({ at, x, y, vx, vy, accent }) => {
  const f = useCurrentFrame();
  const { u } = useFrameCtx();
  const len = Math.hypot(vx, vy) || 1;
  const ux = vx / len, uy = vy / len;
  const angle = Math.atan2(vy, vx) * (180 / Math.PI);
  return (
    <>
      {LENGTHS.map((L, i) => {
        const t = clamp01((f - (at + 2 + i * 2)) / 10);
        if (t <= 0 || t >= 1) return null;
        /* Behind the badge, sliding 30% of its travel, fading out. */
        const back = 0.55 + 0.12 * i - t * 0.3;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: x + ux * len * back, top: y + uy * len * back + (i - 1) * 14 * u,
            width: L * u, height: 7 * u, borderRadius: 99,
            background: accent, opacity: 1 - t,
            transform: `rotate(${angle}deg)`,
          }} />
        );
      })}
    </>
  );
};
