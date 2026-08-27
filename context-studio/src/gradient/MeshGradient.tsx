import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {osc} from '../motion';
import {usePanel} from '../layout';
import {MESH_LAYERS} from './layers';

// The living field. Never cuts, never fades, never freezes. Drift periods all
// divide 12s so frame 719 ≈ frame 0.
export const MeshGradient: React.FC = () => {
  const f = useCurrentFrame();
  const {H} = usePanel();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 540,
        height: H,
        borderRadius: 24,
        overflow: 'hidden',
        background: C.ink,
        isolation: 'isolate',
      }}
    >
      {MESH_LAYERS.map((L, i) => {
        const {rot, tx, ty, scale, period, phase} = L.drift;
        const dRot = rot * osc(f, period, phase);
        const dx = tx * osc(f, period, phase + Math.PI / 2);
        const dy = ty * osc(f, period, phase + Math.PI / 5);
        const ds = 1 + scale * osc(f, period, phase + Math.PI / 3);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: L.x,
              top: L.y,
              width: L.w,
              height: L.h,
              opacity: L.opacity,
              mixBlendMode: L.blend as React.CSSProperties['mixBlendMode'],
              filter: L.blurPx ? `blur(${L.blurPx}px)` : undefined,
              transform: `translate(${dx}px, ${dy}px) rotate(${L.rot + dRot}deg) skewX(${L.skewX}deg) scale(${ds})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: L.innerW,
                height: L.innerH,
                borderRadius: 132,
                background: L.gradient,
              }}
            />
          </div>
        );
      })}
      {/* Soft white lift toward the centre — matches the pastel wash of the
          Figma export, which reads far lighter than the raw layer stack. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 120% 85% at 50% 42%, rgba(255,255,255,0.42), rgba(255,255,255,0) 72%)',
        }}
      />
    </div>
  );
};
