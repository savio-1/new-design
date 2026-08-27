import React from 'react';
import {C} from '../tokens';
import {clamp01} from '../motion';

// 1px vertical white line, draws top-to-bottom via stroke-dashoffset.
export const Connector: React.FC<{height?: number; progress: number}> = ({
  height = 88,
  progress,
}) => {
  const p = clamp01(progress);
  return (
    <svg width={2} height={height} style={{display: 'block'}}>
      <line
        x1={1}
        y1={0}
        x2={1}
        y2={height}
        stroke={C.white}
        strokeOpacity={0.6}
        strokeWidth={1}
        strokeDasharray={height}
        strokeDashoffset={height * (1 - p)}
      />
    </svg>
  );
};
