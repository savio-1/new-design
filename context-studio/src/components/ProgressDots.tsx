import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {usePanel} from '../layout';

// Act markers: dot 1 = beats 1–2, dot 2 = beats 3–4, dot 3 = beats 5–6.
const ACT_STARTS = [0, 252, 504];

export const ProgressDots: React.FC = () => {
  const f = useCurrentFrame();
  const {dotsY} = usePanel();
  return (
    <div
      style={{
        position: 'absolute',
        left: 253,
        top: dotsY,
        display: 'flex',
        gap: 13,
      }}
    >
      {ACT_STARTS.map((start, i) => {
        const next = ACT_STARTS[i + 1] ?? Infinity;
        const activeIn =
          i === 0 ? 1 : interpolate(f, [start - 6, start + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const activeOut =
          next === Infinity
            ? 0
            : interpolate(f, [next - 6, next + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const active = activeIn * (1 - activeOut);
        return (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: C.white,
              opacity: 0.4 + 0.6 * active,
            }}
          />
        );
      })}
    </div>
  );
};
