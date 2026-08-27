import React from 'react';
import {interpolateColors, useCurrentFrame, useVideoConfig} from 'remotion';
import {FIELD, TEXT} from './tokens';
import {NOISE_URL_FINE, grainOffset} from './grain';
import {clamp01, expoOut, lerp, osc, rand, randRange, remap} from '../motion';

// ---- Field ----------------------------------------------------------------
// Option A: dark → dawn lift over f470–569, mint bloom in beat 6, plus the
// 12-frame brightness flash at the beat-4 ignition.
export const Field: React.FC = () => {
  const f = useCurrentFrame();
  const top = interpolateColors(f, [470, 569], [FIELD.darkTop, FIELD.dawnTop]);
  const bottom = interpolateColors(f, [470, 569], [FIELD.darkBottom, FIELD.dawnBottom]);
  const flash = remap(f, 450, 456, 0, 1) * (1 - remap(f, 456, 462, 0, 1));
  return (
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${top}, ${bottom})`}}>
      {flash > 0 ? (
        <div style={{position: 'absolute', inset: 0, background: '#BFD8FF', opacity: 0.14 * flash}} />
      ) : null}
    </div>
  );
};

export const MintBloom: React.FC = () => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  const op = 0.18 * remap(f, 696, 724, 0, 1);
  if (op <= 0) return null;
  const d = width * 0.9;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0.18 * width - d / 2,
        top: `calc(98% - ${d / 2}px)`,
        width: d,
        height: d,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${FIELD.mint} 0%, transparent 65%)`,
        opacity: op,
      }}
    />
  );
};

export const GlobalGrain: React.FC = () => {
  const f = useCurrentFrame();
  const [ox, oy] = grainOffset(f);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: NOISE_URL_FINE,
        backgroundSize: 128,
        backgroundPosition: `${ox}px ${oy}px`,
        mixBlendMode: 'overlay',
        opacity: 0.16, // ≈4% effective
        zIndex: 3000,
        pointerEvents: 'none',
      }}
    />
  );
};

// ---- Radar rings ------------------------------------------------------------
// Static triplet (beat 1) or a single emitting ring; the emitter is composed
// by the caller with its own timing.
export const RadarRings: React.FC<{drawProgress?: [number, number, number]}> = ({
  drawProgress = [1, 1, 1],
}) => {
  const {width} = useVideoConfig();
  const radii = [0.065, 0.113, 0.158].map((r) => r * width);
  const ops = [0.5, 0.38, 0.28];
  const max = radii[2] + 2;
  return (
    <svg width={max * 2} height={max * 2} style={{display: 'block', overflow: 'visible'}}>
      {radii.map((r, i) => (
        <circle
          key={i}
          cx={max}
          cy={max}
          r={r}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={ops[i]}
          strokeWidth={1}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp01(drawProgress[i])}
          transform={`rotate(-90 ${max} ${max})`}
        />
      ))}
    </svg>
  );
};

export const EmitRing: React.FC<{t: number; baseR: number; opacity?: number}> = ({
  t,
  baseR,
  opacity = 0.55,
}) => {
  if (t <= 0 || t >= 1) return null;
  const r = baseR * lerp(0.2, 2.4, t);
  return (
    <div
      style={{
        position: 'absolute',
        left: -r,
        top: -r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.9)',
        opacity: opacity * (1 - t),
      }}
    />
  );
};

// ---- Tiny squares -----------------------------------------------------------
const SQUARES = [
  {x: 0.31, y: 0.22, green: false},
  {x: 0.57, y: 0.68, green: true},
  {x: 0.81, y: 0.31, green: false},
  {x: 0.12, y: 0.57, green: false},
  {x: 0.69, y: 0.12, green: false},
];

export const Squares: React.FC<{appearAt?: number}> = ({appearAt = 40}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const inP = remap(f, appearAt, appearAt + 12, 0, 1);
  if (inP <= 0) return null;
  return (
    <>
      {SQUARES.map((s, i) => {
        const size = i % 2 === 0 ? 3 : 2;
        const period = i % 2 === 0 ? 3.25 : 6.5;
        const tw = remap(osc(f, period, randRange(i * 17 + 3, 0, Math.PI * 2)), -1, 1, 0.6, 0.9);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x * width,
              top: s.y * height,
              width: size,
              height: size,
              background: s.green ? '#5FE0A8' : '#FFFFFF',
              opacity: tw * inP,
              zIndex: 1500,
            }}
          />
        );
      })}
    </>
  );
};

// ---- Planes + UI fragments (the clutter) -----------------------------------
export const Plane: React.FC<{w: number; h: number; rx: number; ry: number; rz: number}> = ({
  w,
  h,
  rx,
  ry,
  rz,
}) => (
  <div
    style={{
      width: w,
      height: h,
      background: 'linear-gradient(135deg, rgba(30,36,64,0.55), rgba(64,74,110,0.4))',
      transform: `perspective(1200px) rotate3d(${rx}, ${ry}, 0, ${rz}deg)`,
      boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.12)',
      borderRadius: 6,
    }}
  />
);

export const UIFragment: React.FC<{kind: number; w: number}> = ({kind, w}) => {
  const bar = (bw: string, mt: number) => (
    <div style={{width: bw, height: w * 0.055, borderRadius: w * 0.03, background: 'rgba(140,150,170,0.55)', marginTop: mt}} />
  );
  if (kind === 1) {
    return (
      <div style={{width: w, height: w * 0.22, borderRadius: w * 0.11, background: '#3B82F6', opacity: 0.92}} />
    );
  }
  if (kind === 2) {
    return (
      <div style={{display: 'flex', gap: w * 0.06, alignItems: 'center'}}>
        <div style={{width: w * 0.26, height: w * 0.26, borderRadius: '50%', background: '#E8ECF4'}} />
        <div
          style={{
            width: w * 0.26,
            height: w * 0.26,
            borderRadius: '50%',
            background: '#34C77B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: w * 0.14,
            fontFamily: 'Geist',
          }}
        >
          ›
        </div>
      </div>
    );
  }
  if (kind === 3) {
    return (
      <div style={{width: w * 0.4, height: w * 0.4, borderRadius: w * 0.08, background: '#FFFFFF', padding: w * 0.06, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: w * 0.04}}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{borderRadius: w * 0.03, background: ['#5860ED', '#0D99FF', '#F2B84B', '#34C77B'][i], opacity: 0.85}} />
        ))}
      </div>
    );
  }
  return (
    <div style={{width: w, borderRadius: 10, background: '#FFFFFF', padding: w * 0.09}}>
      {bar('62%', 0)}
      {bar('88%', w * 0.05)}
      {bar('74%', w * 0.05)}
    </div>
  );
};

// ---- Trail bars --------------------------------------------------------------
export const TrailBar: React.FC<{
  length: number;
  height: number;
  hue: string;
  angleDeg: number;
}> = ({length, height, hue, angleDeg}) => (
  <div
    style={{
      position: 'absolute',
      width: length,
      height,
      left: 0,
      top: -height / 2,
      transformOrigin: '0 50%',
      transform: `rotate(${angleDeg}deg)`,
      borderRadius: height / 2,
      background: `linear-gradient(90deg, ${hue}, transparent)`,
      opacity: 0.18,
      filter: 'blur(6px)',
    }}
  />
);

// ---- Swoosh -------------------------------------------------------------------
export const Swoosh: React.FC<{path: string; draw: number; fade: number}> = ({path, draw, fade}) => {
  const {width, height} = useVideoConfig();
  if (draw <= 0 || fade >= 1) return null;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{position: 'absolute', inset: 0, zIndex: 900, opacity: 0.7 * (1 - fade)}}
    >
      <path
        d={path}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - clamp01(draw)}
        strokeLinecap="round"
      />
    </svg>
  );
};

// ---- Sparkle -------------------------------------------------------------------
export const Sparkle: React.FC<{t: number; size: number}> = ({t, size}) => {
  if (t <= 0) return null;
  const pop = t < 0.5 ? expoOut(t * 2) * 1.25 : lerp(1.25, 1, (t - 0.5) * 2);
  const fade = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{transform: `scale(${pop})`, opacity: fade, display: 'block'}}
    >
      <path
        d="M8 0 C8.6 5.4 10.6 7.4 16 8 C10.6 8.6 8.6 10.6 8 16 C7.4 10.6 5.4 8.6 0 8 C5.4 7.4 7.4 5.4 8 0 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

// ---- Label ---------------------------------------------------------------------
export const Label: React.FC<{text: string; opacity: number}> = ({text, opacity}) => {
  const {width, height} = useVideoConfig();
  if (opacity <= 0.01) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: '112%',
        left: '50%',
        transform: 'translateX(-50%)',
        height: 0.026 * height,
        padding: `0 ${0.008 * width}px`,
        borderRadius: 0.013 * height,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'Geist',
        fontWeight: 400,
        fontSize: 0.011 * width,
        color: 'rgba(255,255,255,0.9)',
        whiteSpace: 'nowrap',
        opacity,
      }}
    >
      {text}
    </div>
  );
};

// ---- Caption --------------------------------------------------------------------
// In: 14-frame clip-path wipe up + 8-frame fade. Out: 10-frame fade, no move.
export const Caption: React.FC<{
  inAt: number;
  outAt: number;
  x?: number; // left fraction; undefined = centred
  right?: number; // right-aligned block ending at this fraction
  y: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({inAt, outAt, x, right, y, opacity = 1, children}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const wipe = clamp01((f - inAt) / 14);
  const fadeIn = clamp01((f - inAt) / 8);
  const fadeOut = clamp01((f - outAt) / 10);
  if (fadeIn <= 0 || fadeOut >= 1) return null;
  const pos: React.CSSProperties =
    right !== undefined
      ? {right: (1 - right) * width, textAlign: 'right'}
      : x !== undefined
        ? {left: x * width}
        : {left: 0, width: '100%', textAlign: 'center'};
  return (
    <div
      style={{
        position: 'absolute',
        top: y * height,
        ...pos,
        fontFamily: TEXT.family,
        fontWeight: TEXT.weight,
        fontSize: TEXT.size * width,
        letterSpacing: TEXT.tracking,
        color: TEXT.onDark,
        clipPath: `inset(${(1 - expoOut(wipe)) * 100}% 0 0 0)`,
        transform: `translateY(${(1 - expoOut(wipe)) * 0.012 * height}px)`,
        opacity: fadeIn * (1 - fadeOut) * opacity,
        zIndex: 2000,
      }}
    >
      {children}
    </div>
  );
};

// ---- Lockup -----------------------------------------------------------------------
export const Lockup: React.FC<{inAt: number; right: number; y: number}> = ({inAt, right, y}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const p = remap(f, inAt, inAt + 18, 0, 1);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: (1 - right) * width,
        top: y * height,
        textAlign: 'right',
        opacity: p,
        zIndex: 2000,
      }}
    >
      <div style={{fontFamily: 'Geist', fontWeight: 500, fontSize: 0.018 * width, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.95)'}}>
        cogentiq
      </div>
      <div style={{fontFamily: 'Geist', fontWeight: 400, fontSize: 0.013 * width, color: 'rgba(255,255,255,0.7)', marginTop: 0.004 * height}}>
        Context Studio
      </div>
    </div>
  );
};

// Deterministic scatter helper kept here so scenes stay declarative.
export const seededPhase = (i: number) => rand(i * 31 + 7) * Math.PI * 2;
