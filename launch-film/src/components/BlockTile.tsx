/* One building-block tile, and the layout both beats 4 and 5 read tile
   positions from — the 4→5 cut only holds if the positions come from
   the same function, not the same numbers written twice. */
import React from 'react';
import { C, type Block } from '../tokens';
import { useFrameCtx, type Ctx } from './Frame';
import { Glyph } from './Glyph';

/* Square cut: 2-column grid, 3 + 4 (per the board). Wide cut: one row
   of 7, descriptors dropped. Centers in px, plus the tile box. */
export const tileRect = (i: number, ctx: Ctx) => {
  const { u, wide, W, H } = ctx;
  if (wide) {
    const w = W * 0.115, h = 208 * u, gap = W * 0.0135;
    const x0 = W / 2 - (7 * w + 6 * gap) / 2;
    return { x: x0 + i * (w + gap) + w / 2, y: H * 0.62, w, h };
  }
  const w = 470 * u, h = 128 * u;
  const col = i < 3 ? 0 : 1;
  const row = i < 3 ? i : i - 3;
  const x = (col === 0 ? W * 0.055 : W * 0.515) + w / 2;
  const y0 = 400 * u + (col === 0 ? 74 * u : 0); /* 3-tile column optically centered against 4 */
  return { x, y: y0 + row * (h + 20 * u) + h / 2, w, h };
};

export const centroid = (ctx: Ctx) => ({ x: ctx.W * 0.5, y: ctx.H * 0.62 });

export const BlockTile: React.FC<{
  block: Block;
  x: number; y: number;          /* center, px */
  scale?: number; rotate?: number; opacity?: number; squash?: number;
}> = ({ block, x, y, scale = 1, rotate = 0, opacity = 1, squash = 1 }) => {
  const ctx = useFrameCtx();
  const { u, wide } = ctx;
  const w = tileRect(0, ctx).w, h = tileRect(0, ctx).h;
  if (opacity <= 0 || scale <= 0) return null;
  return (
    <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h,
      borderRadius: 14 * u, background: C.cardBg,
      border: `${1.5 * u}px solid ${C.cardEdge}`,
      display: 'flex', alignItems: 'center', justifyContent: wide ? 'center' : 'flex-start',
      flexDirection: wide ? 'column' : 'row',
      gap: wide ? 14 * u : 18 * u, padding: wide ? 0 : `0 ${22 * u}px`,
      transform: `scale(${scale}) scaleY(${squash}) rotate(${rotate}deg)`,
      opacity,
      boxShadow: `0 ${2 * u}px ${10 * u}px rgba(18,18,18,0.04)`,
    }}>
      <span style={{
        flex: 'none', width: 56 * u, height: 56 * u, borderRadius: 14 * u,
        background: block.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Glyph icon={block.icon} size={30 * u} />
      </span>
      <div style={{ minWidth: 0, textAlign: wide ? 'center' : 'left' }}>
        <div style={{ fontSize: 27 * u, fontWeight: 600, color: C.ink, lineHeight: 1.15 }}>
          {block.label}
        </div>
        {!wide && (
          <div style={{ fontSize: 21 * u, fontWeight: 500, color: C.inkSoft, marginTop: 4 * u }}>
            {block.desc}
          </div>
        )}
      </div>
    </div>
  );
};
