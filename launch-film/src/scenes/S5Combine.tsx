/* Beat 5 — Combine. The seven tiles reappear exactly where beat 4 left
   them (same tileRect — the continuity is the legibility), converge on
   a centroid as a deck, and compress into one Context Bundle card. */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { BLOCKS } from '../tokens';
import { useFrameCtx } from '../components/Frame';
import { Statement } from '../components/Statement';
import { BlockTile, tileRect, centroid } from '../components/BlockTile';
import { BundleCard } from '../components/BundleCard';
import { EASE_IN, ringPulse } from '../motion';
import { C } from '../tokens';

export const S5Combine: React.FC = () => {
  const f = useCurrentFrame();
  const ctx = useFrameCtx();
  const { u, wide, W, H } = ctx;
  const cen = centroid(ctx);
  /* Card floats through the hold. */
  const float = Math.sin(((f - 56) / 84) * Math.PI * 2) * 5 * u;
  const ring = ringPulse(f, 44);
  const cardIn = interpolate(f, [42, 56], [0, 1], {
    easing: EASE_IN, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <>
      <Statement lines={['Combine them into', 'one context.']} y={0.08} />
      {BLOCKS.map((b, i) => {
        /* converge: own bezier to the centroid, 26 frames, 3-frame
           stagger, scaling to 0.34, stacking as a deck. */
        const at = 8 + i * 3;
        const t = interpolate(f, [at, at + 26], [0, 1], {
          easing: EASE_IN, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const from = tileRect(i, ctx);
        const to = { x: cen.x, y: cen.y + (i - 3) * 6 * u };
        const cpx = (from.x + to.x) / 2 + (from.y - to.y) * 0.18;
        const cpy = (from.y + to.y) / 2 - (from.x - to.x) * 0.18;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cpx + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cpy + t * t * to.y;
        /* The deck hands over to the bundle card at f486 (local 42). */
        const gone = interpolate(f, [42, 50], [1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        return (
          <BlockTile key={b.id} block={b} x={x} y={y}
            scale={1 - t * 0.66}
            rotate={t * (i - 3)}
            opacity={gone} />
        );
      })}
      {/* compression pulse + the bundle */}
      {ring.opacity > 0 && (
        <div style={{
          position: 'absolute', left: cen.x - 230 * u, top: cen.y - 75 * u,
          width: 460 * u, height: 150 * u, borderRadius: 20 * u,
          border: `${4 * u}px solid ${C.accent}`,
          transform: `scale(${ring.scale})`, opacity: ring.opacity,
        }} />
      )}
      <BundleCard x={cen.x} y={cen.y + (f >= 56 ? float : 0)}
        scale={0.85 + 0.15 * cardIn} opacity={cardIn} />
    </>
  );
};
