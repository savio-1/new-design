/* The responsive wrapper. Everything is authored in a 1080-unit space
   scaled off the shorter edge — no hardcoded pixels anywhere below —
   and each scene switches square/wide layout on one boolean. */
import React, { createContext, useContext } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { FONT } from '../fonts';

export type Ctx = {
  wide: boolean;
  /** units: multiply an @1080 design value by this */
  u: number;
  W: number;
  H: number;
  fps: number;
};

const FrameCtx = createContext<Ctx>({ wide: false, u: 1, W: 1080, H: 1080, fps: 60 });
export const useFrameCtx = () => useContext(FrameCtx);

export const Frame: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => {
  const { width, height, fps } = useVideoConfig();
  const ctx: Ctx = {
    wide: width > height,
    u: Math.min(width, height) / 1080,
    W: width, H: height, fps,
  };
  return (
    <FrameCtx.Provider value={ctx}>
      <AbsoluteFill style={{ background: bg, fontFamily: `${FONT}, sans-serif`, overflow: 'hidden' }}>
        {children}
      </AbsoluteFill>
    </FrameCtx.Provider>
  );
};
