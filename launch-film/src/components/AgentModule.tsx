/* The agent — a large outlined badge with a label plate. Its state
   change is the payoff of beat 6 and it must feel like a switch
   flipping: on one frame the outline goes from soft neutral to the
   accent gradient and the status line is different text. No tween. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../tokens';
import { useFrameCtx } from './Frame';
import { Glyph } from './Glyph';
import { ringPulse } from '../motion';

export const AgentModule: React.FC<{
  x: number; y: number;          /* badge center, px */
  activateAt: number;            /* local frame the switch flips */
  ringAt?: number;               /* local frame of the docking pulse */
}> = ({ x, y, activateAt, ringAt }) => {
  const f = useCurrentFrame();
  const { u } = useFrameCtx();
  const D = 230 * u, sw = 8 * u;
  const on = f >= activateAt;
  const ring = ringAt !== undefined ? ringPulse(f, ringAt) : { scale: 1, opacity: 0 };
  return (
    <>
      {/* docking pulse */}
      {ring.opacity > 0 && (
        <div style={{
          position: 'absolute', left: x - D / 2, top: y - D / 2, width: D, height: D,
          borderRadius: '50%', border: `${5 * u}px solid ${C.accent}`,
          transform: `scale(${ring.scale})`, opacity: ring.opacity,
        }} />
      )}
      {/* the badge; SVG so the activated stroke can be a gradient */}
      <svg width={D} height={D} viewBox="0 0 230 230"
        style={{ position: 'absolute', left: x - D / 2, top: y - D / 2 }}>
        <defs>
          <linearGradient id="agentOn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0d99ff" />
            <stop offset="100%" stopColor="#9747ff" />
          </linearGradient>
        </defs>
        <circle cx="115" cy="115" r={115 - 4}
          fill={C.cardBg}
          stroke={on ? 'url(#agentOn)' : C.inkSoft}
          strokeWidth={8} />
      </svg>
      <div style={{
        position: 'absolute', left: x - D / 2, top: y - D / 2, width: D, height: D,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Glyph icon="agent" size={D * 0.42} color={on ? C.ink : C.inkSoft} sw={1.7} />
      </div>
      {/* label plate */}
      <div style={{
        position: 'absolute', left: x, top: y + D / 2 + 26 * u,
        transform: 'translateX(-50%)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 30 * u, fontWeight: 600, color: C.ink }}>Support Agent</div>
        <div style={{
          fontSize: 22 * u, fontWeight: 500, marginTop: 6 * u,
          color: on ? C.accent : C.inkSoft, fontVariantNumeric: 'tabular-nums',
        }}>
          {on ? '7 context sources attached' : 'No context attached'}
        </div>
      </div>
    </>
  );
};
