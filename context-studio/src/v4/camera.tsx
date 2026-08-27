import React, {createContext, useContext} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {cubicInOut, sineInOut, track, Track} from '../motion';

// §4 — the 2.5D camera rig. Everything hangs off this.
export type Camera = {x: number; y: number; zoom: number; focus: number; aperture: number};

const ZOOM: Track = [
  [0, 1.0, sineInOut],
  [149, 1.045],
  [150, 1.045, cubicInOut],
  [176, 1.62],
  [330, 1.62, cubicInOut],
  [342, 1.28],
];

const APERTURE: Track = [
  [0, 0.15],
  [150, 0.15, cubicInOut],
  [176, 0.85],
  [330, 0.85, sineInOut],
  [342, 0.5],
  [450, 0.5, sineInOut],
  [470, 0.3],
  // beat 5's clutter pass rides a temporary wide-open aperture so the
  // depth-0.9 planes hit the reference's 18–26px blur
  [576, 0.3, sineInOut],
  [588, 1.0],
  [610, 1.0, sineInOut],
  [624, 0.4],
  [690, 0.4, sineInOut],
  [714, 0.25],
];

// Beat 2's four rack-focus moves (§8), then settle.
const FOCUS: Track = [
  [0, 0.5],
  [210, 0.5, sineInOut],
  [232, 0.18],
  [240, 0.18, sineInOut],
  [262, 0.42],
  [270, 0.42, sineInOut],
  [292, 0.68],
  [300, 0.68, sineInOut],
  [318, 0.91],
  [319, 0.91, sineInOut],
  [329, 0.5],
];

const X: Track = [
  [0, 0],
  [570, 0, cubicInOut],
  [590, 0.14],
];

export const getCamera = (f: number): Camera => ({
  x: track(f, X),
  y: 0,
  zoom: track(f, ZOOM),
  focus: track(f, FOCUS),
  aperture: track(f, APERTURE),
});

const CamCtx = createContext<Camera | null>(null);

export const CameraProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  return <CamCtx.Provider value={getCamera(f)}>{children}</CamCtx.Provider>;
};

export const useCamera = (): Camera => {
  const c = useContext(CamCtx);
  if (!c) throw new Error('useCamera outside CameraProvider');
  return c;
};

const PARALLAX = 0.55;

export type Solved = {scale: number; blur: number; dim: number; z: number; dx: number; dy: number};

export const solve = (cam: Camera, depth: number): Solved => {
  // Pan shifts every depth (base) plus a depth-dependent differential, so a
  // depth-0.5 hero still slides when the camera drifts (§8 beat 5).
  const dx = -cam.x * (0.5 + (depth - 0.5) * PARALLAX);
  const dy = -cam.y * (0.5 + (depth - 0.5) * PARALLAX);
  const scale = cam.zoom * (0.72 + depth * 0.56);
  const blur = Math.min(28, Math.abs(depth - cam.focus) * 46 * cam.aperture);
  const dim = 1 - Math.abs(depth - cam.focus) * 0.35;
  const z = Math.round(depth * 1000);
  return {scale, blur, dim, z, dx, dy};
};

// Positions an element (authored at natural pixel size, centred on its own
// origin) at world-fraction (x, y) and depth d, through the rig.
export const Depth: React.FC<{
  d: number;
  x: number;
  y: number;
  opacity?: number;
  extraBlur?: number;
  children: React.ReactNode;
}> = ({d, x, y, opacity = 1, extraBlur = 0, children}) => {
  const cam = useCamera();
  const {width, height} = useVideoConfig();
  const s = solve(cam, d);
  const sx = 0.5 + (x - 0.5) * s.scale + s.dx;
  const sy = 0.5 + (y - 0.5) * s.scale + s.dy;
  const blur = Math.min(28, s.blur + extraBlur);
  const op = Math.max(0, s.dim * opacity);
  if (op <= 0.004) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: sx * width,
        top: sy * height,
        transform: `translate(-50%, -50%) scale(${s.scale})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        opacity: op,
        zIndex: s.z,
      }}
    >
      {children}
    </div>
  );
};

// World coordinate that lands on a given SCREEN fraction under a known
// zoom/depth — used to author beat-2 scatter targets in screen space.
export const worldForScreen = (screen: number, depth: number, zoom: number): number =>
  0.5 + (screen - 0.5) / (zoom * (0.72 + depth * 0.56));
