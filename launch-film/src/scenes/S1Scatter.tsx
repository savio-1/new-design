/* Beat 1 — Scatter. Enterprise context today: a pile of disconnected
   fragments, overfilling the frame, while a counter runs away. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { useFrameCtx } from '../components/Frame';
import { CounterChip } from '../components/CounterChip';
import { FRAGMENTS } from '../data/fragments';
import { arrive, seeded } from '../motion';

const N = 22;

export const S1Scatter: React.FC = () => {
  const f = useCurrentFrame();
  const ctx = useFrameCtx();
  const { u, W, H } = ctx;

  /* Slow, almost imperceptible drift through the hold. */
  const drift = arrive(f, 60, 35);

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translateY(${-H * 0.04 * drift}px) rotate(${0.6 * drift}deg)`,
      }}>
        {Array.from({ length: N }, (_, i) => {
          const label = FRAGMENTS[i % FRAGMENTS.length];
          /* Seeded scatter: positions bleed past all four edges. */
          const cx = seeded(`x${i}`, -0.06, 0.88) * W;
          const cy = seeded(`y${i}`, -0.04, 0.92) * H;
          const rot = seeded(`r${i}`, -14, 14);
          const at = Math.max(0, Math.round(i * 1.9 + seeded(`j${i}`, -4, 4)));
          const p = arrive(f, at, 22);
          if (p <= 0) return null;
          return (
            <div key={i} style={{
              position: 'absolute', left: cx, top: cy,
              display: 'flex', alignItems: 'center', gap: 12 * u,
              padding: `${16 * u}px ${20 * u}px`, borderRadius: 14 * u,
              background: C.cardBg, border: `${1.5 * u}px solid ${C.cardEdge}`,
              boxShadow: `0 ${2 * u}px ${8 * u}px rgba(18,18,18,0.05)`,
              fontSize: 23 * u, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap',
              transform: `translateY(${(1 - p) * 130}%) rotate(${rot}deg)`,
            }}>
              <span style={{
                flex: 'none', width: 20 * u, height: 20 * u, borderRadius: 5 * u,
                border: `${2 * u}px solid ${C.inkSoft}`,
              }} />
              {label}
            </div>
          );
        })}
      </div>
      <CounterChip from={1284} to={9417} start={6} end={90} x={W * 0.08} y={H * 0.055} />
    </>
  );
};
