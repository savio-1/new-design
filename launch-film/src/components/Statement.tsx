/* Statement type — 60% of the piece. It appears on the cut at full
   opacity; the only concession is a 7-frame clip-path wipe per line
   with a 3-frame stagger, kept barely perceptible. Never centered:
   left rag, tight leading, max 3 lines. */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { useFrameCtx } from './Frame';

export const Statement: React.FC<{
  lines: string[];
  at?: number;           /* local frame it cuts in */
  size?: number;         /* @1080 units; default = full statement size */
  x?: number; y?: number; /* top-left, in fraction of W/H */
  color?: string;
  wipe?: boolean;
}> = ({ lines, at = 0, size, x = 0.08, y, color = C.ink, wipe = true }) => {
  const f = useCurrentFrame();
  const { u, wide, W, H } = useFrameCtx();
  if (f < at) return null;
  /* ~11.5% of frame width at 1:1; clamped off the height on wide so a
     two-line statement still sits inside the frame. */
  const base = size ?? (wide ? H * 0.126 : W * 0.115);
  /* Fit the longest line: huge, but never off the right edge.
     0.53em ≈ Geist 700 average advance at -0.03em tracking. */
  const maxChars = Math.max(...lines.map((l) => l.length));
  const fs = Math.min(base, (W * (1 - x) - W * 0.05) / (maxChars * 0.53));
  const top = y ?? (0.5 - (lines.length * fs * 0.95) / H / 2);
  return (
    <div style={{
      position: 'absolute', left: x * W, top: top * H,
      fontWeight: 700, fontSize: fs, lineHeight: 0.95,
      letterSpacing: '-0.03em', color, whiteSpace: 'pre',
    }}>
      {lines.map((ln, i) => {
        const p = wipe
          ? interpolate(f, [at + i * 3, at + i * 3 + 7], [100, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            })
          : 0;
        return (
          <div key={i} style={{ clipPath: `inset(0 0 ${p}% 0)` }}>{ln}</div>
        );
      })}
    </div>
  );
};
