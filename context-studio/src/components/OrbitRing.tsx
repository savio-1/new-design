import React from 'react';
import {C} from '../tokens';
import {clamp01} from '../motion';

// The three atom ellipses (§6), expressed as semi-axes + rotation about the
// core centre. The two large ellipses are the same shape mirrored.
export type Ring = {rx: number; ry: number; rotDeg: number; dir: 1 | -1};

// Scaled to 0.85 of the Figma ellipses so the orbit clears the agent card
// that docks beneath it in beat 4 (the reference panel has no card there).
export const RINGS: Ring[] = [
  {rx: 93.5, ry: 162.2, rotDeg: 0, dir: 1},
  {rx: 177.8, ry: 121.8, rotDeg: 62, dir: -1},
  {rx: 177.8, ry: 121.8, rotDeg: -62, dir: 1},
];

export const ringPoint = (
  ring: Ring,
  phi: number,
): {x: number; y: number; depth: number} => {
  const lx = ring.rx * Math.cos(phi);
  const ly = ring.ry * Math.sin(phi);
  const th = (ring.rotDeg * Math.PI) / 180;
  return {
    x: lx * Math.cos(th) - ly * Math.sin(th),
    y: lx * Math.sin(th) + ly * Math.cos(th),
    depth: Math.sin(phi), // < 0 reads as the far side of the orbit
  };
};

export const OrbitRing: React.FC<{ring: Ring; progress: number; opacity: number}> = ({
  ring,
  progress,
  opacity,
}) => {
  const p = clamp01(progress);
  const pad = 4;
  const w = ring.rx * 2 + pad * 2;
  const h = ring.ry * 2 + pad * 2;
  return (
    <svg
      width={w}
      height={h}
      style={{
        position: 'absolute',
        left: -w / 2,
        top: -h / 2,
        transform: `rotate(${ring.rotDeg}deg)`,
        overflow: 'visible',
      }}
    >
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={ring.rx}
        ry={ring.ry}
        fill="none"
        stroke={C.white}
        strokeOpacity={0.35 * opacity}
        strokeWidth={1}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};
