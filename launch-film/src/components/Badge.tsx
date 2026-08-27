/* The circular badges — the piece's only "characters". Thick ink
   outline, accent fill, white glyph; they pop in with overshoot from
   just past the nearest edge, trailing speed-dashes. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { useFrameCtx } from './Frame';
import { Glyph } from './Glyph';
import { pop } from '../motion';
import { DashTrail } from './DashTrail';

export const Badge: React.FC<{
  accent: string; icon: string;
  d: number;                     /* diameter, @1080 units */
  x: number; y: number;          /* center, actual px */
  at: number;                    /* local frame of the pop */
  from: { x: number; y: number };/* entry vector (px offset it travels) */
  bobAt?: number; bobPhase?: number;
}> = ({ accent, icon, d, x, y, at, from, bobAt, bobPhase = 0 }) => {
  const f = useCurrentFrame();
  const { u, fps } = useFrameCtx();
  const { scale, squash, p } = pop(f, fps, at);
  if (f < at) return null;
  const dx = from.x * (1 - p), dy = from.y * (1 - p);
  /* Slight arc on the way in. */
  const arc = Math.sin(p * Math.PI) * 0.12;
  const bob = bobAt !== undefined && f >= bobAt
    ? Math.sin(((f - bobAt) / 84) * Math.PI * 2 + bobPhase) * 4 * u
    : 0;
  const D = d * u;
  return (
    <>
      <DashTrail at={at} x={x} y={y} vx={from.x} vy={from.y} accent={accent} />
      <div style={{
        position: 'absolute', left: x - D / 2 + dx + from.y * arc, top: y - D / 2 + dy - from.x * arc + bob,
        width: D, height: D, borderRadius: '50%',
        background: accent, border: `${6 * u}px solid ${C.stroke}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${scale}) scaleY(${squash})`,
      }}>
        <Glyph icon={icon} size={D * 0.46} />
      </div>
    </>
  );
};
