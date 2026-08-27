/* Beat 4 — the core informational beat. Seven tiles pop in on a
   16-frame stagger under a pinned statement, and the final held frame
   is the piece's screenshot frame. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { BLOCKS } from '../tokens';
import { useFrameCtx } from '../components/Frame';
import { Statement } from '../components/Statement';
import { BlockTile, tileRect } from '../components/BlockTile';
import { pop } from '../motion';

export const S4Blocks: React.FC = () => {
  const f = useCurrentFrame();
  const ctx = useFrameCtx();
  const { fps, wide, W, H } = ctx;
  return (
    <>
      <Statement lines={['Seven building blocks.']}
        size={(wide ? H * 0.126 : W * 0.115) * 0.55} y={wide ? 0.12 : 0.12} />
      {BLOCKS.map((b, i) => {
        const { x, y } = tileRect(i, ctx);
        const { scale, squash } = pop(f, fps, 12 + i * 16);
        return (
          <BlockTile key={b.id} block={b} x={x} y={y} scale={scale} squash={squash} />
        );
      })}
    </>
  );
};
