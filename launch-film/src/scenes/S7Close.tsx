/* Beat 7 — Close, on the dark field. Statement, lockup, and a few
   accent dots drifting in the negative space at whisper opacity. */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { BLOCKS, C } from '../tokens';
import { useFrameCtx } from '../components/Frame';
import { Statement } from '../components/Statement';
import { seeded } from '../motion';

export const S7Close: React.FC = () => {
  const f = useCurrentFrame();
  const { u, W, H, wide } = useFrameCtx();
  return (
    <>
      <Statement lines={['Context that knows', 'your enterprise.']} color={C.white} />
      {/* logo lockup — placeholder mark until the brand SVG lands */}
      {f >= 12 && (
        <div style={{
          position: 'absolute', left: W * 0.08, top: H * (wide ? 0.84 : 0.86),
          display: 'flex', alignItems: 'center', gap: 16 * u,
          color: C.white, fontSize: 30 * u,
        }}>
          <span style={{
            width: 22 * u, height: 22 * u, background: C.accent,
            transform: 'rotate(45deg)', borderRadius: 4 * u,
          }} />
          <span style={{ fontWeight: 700 }}>cogentiq</span>
          <span style={{ width: 1.5 * u, height: 30 * u, background: 'rgba(255,255,255,0.35)' }} />
          <span style={{ fontWeight: 400, opacity: 0.85 }}>Context Studio</span>
        </div>
      )}
      {/* drifting dots, ≤8% opacity */}
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: seeded(`dx${i}`, 0.15, 0.9) * W,
          top: seeded(`dy${i}`, 0.08, 0.7) * H + f * seeded(`dv${i}`, 0.1, 0.35) * u,
          width: 12 * u, height: 12 * u, borderRadius: '50%',
          background: BLOCKS[i * 2 % 7].accent, opacity: 0.07,
        }} />
      ))}
    </>
  );
};
