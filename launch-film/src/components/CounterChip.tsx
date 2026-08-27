/* The scatter counter — a pill chip whose number accelerates. Fixed
   digit pattern (x,xxx) across the whole range, so nothing flickers. */
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { useFrameCtx } from './Frame';

export const CounterChip: React.FC<{
  from: number; to: number; start: number; end: number; x: number; y: number;
}> = ({ from, to, start, end, x, y }) => {
  const f = useCurrentFrame();
  const { u } = useFrameCtx();
  const v = Math.round(interpolate(f, [start, end], [from, to], {
    easing: Easing.in(Easing.cubic),     /* accelerating */
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      display: 'flex', alignItems: 'center', gap: 10 * u,
      height: 52 * u, padding: `0 ${20 * u}px`, borderRadius: 999,
      background: C.cardBg, border: `${1.5 * u}px solid ${C.cardEdge}`,
      fontSize: 24 * u, fontWeight: 500, color: C.ink,
    }}>
      <span style={{ width: 10 * u, height: 10 * u, borderRadius: '50%', background: C.accent }} />
      Enterprise context
      <span style={{ color: C.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {v.toLocaleString('en-US')}
      </span>
    </div>
  );
};
