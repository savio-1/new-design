/* The context bundle — what the seven blocks become. A header row and
   seven accent dots in BLOCKS order, one per block, off the same array
   the tiles were built from. */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { BLOCKS, C } from '../tokens';
import { useFrameCtx } from './Frame';
import { Glyph } from './Glyph';

export const BUNDLE_W = 460, BUNDLE_H = 128;

export const BundleCard: React.FC<{
  x: number; y: number;          /* center, px */
  scale?: number; opacity?: number;
  /* local frame the dots begin lighting (beat 6); omit for all-lit */
  pulseAt?: number;
}> = ({ x, y, scale = 1, opacity = 1, pulseAt }) => {
  const f = useCurrentFrame();
  const { u } = useFrameCtx();
  const w = BUNDLE_W * u, h = BUNDLE_H * u;
  if (opacity <= 0 || scale <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h,
      borderRadius: 14 * u, background: C.cardBg,
      border: `${1.5 * u}px solid ${C.cardEdge}`,
      boxShadow: `0 ${4 * u}px ${18 * u}px rgba(18,18,18,0.07)`,
      padding: `${18 * u}px ${22 * u}px`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      transform: `scale(${scale})`, opacity,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 * u }}>
        <span style={{
          flex: 'none', width: 34 * u, height: 34 * u, borderRadius: 9 * u,
          background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Glyph icon="graph" size={20 * u} />
        </span>
        <span style={{ fontSize: 24 * u, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>Context bundle</span>
        <span style={{ fontSize: 24 * u, fontWeight: 500, color: C.inkSoft, whiteSpace: 'nowrap' }}>· Support Ops</span>
      </div>
      <div style={{ display: 'flex', gap: 10 * u, paddingLeft: 4 * u }}>
        {BLOCKS.map((b, i) => {
          /* Beat 6: dots light left→right, 3-frame stagger, with a bump. */
          const lit = pulseAt === undefined ? 1
            : interpolate(f, [pulseAt + i * 3, pulseAt + i * 3 + 6], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              });
          const bump = 1 + 0.5 * Math.sin(Math.PI * lit) * (pulseAt === undefined ? 0 : 1);
          return (
            <span key={b.id} style={{
              width: 13 * u, height: 13 * u, borderRadius: '50%',
              background: b.accent, opacity: 0.35 + 0.65 * lit,
              transform: `scale(${bump})`,
            }} />
          );
        })}
      </div>
    </div>
  );
};
