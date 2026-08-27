import React from 'react';
import {NOISE_URL} from './grain';

// §0.1 / §5 — three visually distinct treatments, three components. The
// matte → emissive → shaded progression is the film's argument; never merge
// them into one component with modes.

const grainLayer = (size: number): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  backgroundImage: NOISE_URL,
  backgroundSize: Math.max(48, size * 0.9),
  mixBlendMode: 'overlay',
  opacity: 0.32, // ≈8% effective speckle after the saturate(0) noise midtones
});

export const MatteSphere: React.FC<{
  size: number;
  from: string;
  to: string;
  angle: number;
}> = ({size, from, to, angle}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(${angle}deg, ${from}, ${to})`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
      position: 'relative',
    }}
  >
    <div style={grainLayer(size)} />
  </div>
);

// Bright core + hard rim + soft halo. rim/halo are independently animatable
// (beat 1's ignition brings the rim first, then blooms the halo).
export const EmissiveSphere: React.FC<{
  size: number;
  hue: string;
  rimOpacity?: number;
  haloStrength?: number; // 1 = spec
  conicOpacity?: number; // beat 4: the seven hues rotating beneath the lift
  conicAngle?: number;
  hues?: string[];
}> = ({size, hue, rimOpacity = 1, haloStrength = 1, conicOpacity = 0, conicAngle = 0, hues = []}) => {
  const halo = size * 2.6;
  return (
    <div style={{position: 'relative', width: size, height: size}}>
      <div
        style={{
          position: 'absolute',
          left: size / 2 - halo / 2,
          top: size / 2 - halo / 2,
          width: halo,
          height: halo,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hue} 0%, transparent 68%)`,
          opacity: 0.45 * haloStrength,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -halo * 0.28,
          top: -halo * 0.28,
          width: size + halo * 0.56,
          height: size + halo * 0.56,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hue} 0%, transparent 62%)`,
          opacity: 0.12 * haloStrength,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.75) 26%, ${hue} 74%)`,
        }}
      >
        {conicOpacity > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `conic-gradient(from ${conicAngle}deg, ${[...hues, hues[0]].join(', ')})`,
              opacity: conicOpacity,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0) 62%)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: -1.25,
          borderRadius: '50%',
          border: `2.5px solid rgba(210,240,255,0.95)`,
          opacity: rimOpacity,
        }}
      />
    </div>
  );
};

// True spherical shading — the only sphere that reads as a physical object,
// and it appears only in beat 6.
export const ShadedSphere: React.FC<{size: number; body: string}> = ({size, body}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 32% 28%, #FFFFFF 0%, ${body} 52%, color-mix(in srgb, ${body} 78%, #000) 100%)`,
      position: 'relative',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: size * 0.32 - size * 0.07,
        top: size * 0.28 - size * 0.07,
        width: size * 0.14,
        height: size * 0.14,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.85)',
        filter: 'blur(4px)',
      }}
    />
    {/* bounce light on the lower-right limb */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.18)',
      }}
    />
    <div style={{...{
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      backgroundImage: NOISE_URL,
      backgroundSize: Math.max(48, size * 0.9),
      mixBlendMode: 'overlay',
      opacity: 0.18,
    } as React.CSSProperties}} />
  </div>
);
