/* Beat 6 — Attach. The bundle continues from beat 5's centroid, snaps
   onto the agent, and the agent's state flips like a switch: gradient
   outline, new status line, dots lighting left to right. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useFrameCtx } from '../components/Frame';
import { Statement } from '../components/Statement';
import { BundleCard } from '../components/BundleCard';
import { AgentModule } from '../components/AgentModule';
import { centroid } from '../components/BlockTile';
import { snap } from '../motion';

export const S6Attach: React.FC = () => {
  const f = useCurrentFrame();
  const ctx = useFrameCtx();
  const { u, wide, W, H } = ctx;
  const agent = { x: W * (wide ? 0.72 : 0.7), y: H * 0.58 };
  /* Docks just inside the badge's lower-right edge. */
  const dockPt = { x: agent.x + 62 * u, y: agent.y + 72 * u };
  const start = centroid(ctx);
  const from = { x: wide ? W * 0.3 : W * 0.32, y: start.y };
  const s = snap(f, 8, from, dockPt, 8 * u);
  const scale = 1 - 0.5 * s.t;
  return (
    <>
      <Statement lines={['Attach it to any agent.']} y={0.12} />
      <AgentModule x={agent.x} y={agent.y} activateAt={30} ringAt={28} />
      <BundleCard x={s.x} y={s.y} scale={scale} pulseAt={38} />
    </>
  );
};
