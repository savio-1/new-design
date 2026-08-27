import React, {createContext, useContext} from 'react';
import {useVideoConfig} from 'remotion';

// Everything is authored in Figma panel units (540 wide). The whole panel is
// scaled by S = width / 540 in one place — never hardcode output pixels.
export type PanelLayout = {
  W: number; // always 540
  H: number; // panel height in units (804 for 2:3, 540 for 1:1)
  stageTop: number;
  stageH: number; // canonical stage is 500 units (y 100–600); shorter formats compress it
  headlineY: number;
  dotsY: number;
};

const PanelCtx = createContext<PanelLayout | null>(null);

export const usePanel = (): PanelLayout => {
  const l = useContext(PanelCtx);
  if (!l) throw new Error('usePanel outside <Panel>');
  return l;
};

export const Panel: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  const S = width / 540;
  const H = height / S;
  const isTall = H >= 800;
  const headlineY = isTall ? 628 : H - 176;
  const dotsY = isTall ? 764 : H - 40;
  const stageTop = isTall ? 100 : 80;
  const stageH = headlineY - 28 - stageTop;
  const layout: PanelLayout = {W: 540, H, stageTop, stageH, headlineY, dotsY};
  return (
    <PanelCtx.Provider value={layout}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 540,
          height: H,
          transform: `scale(${S})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </PanelCtx.Provider>
  );
};

// Scene content is authored for the canonical stage (x 0–540, y 100–600).
// StageArea maps that box into the panel's actual stage region.
export const StageArea: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {stageTop, stageH} = usePanel();
  const k = stageH / 500;
  const tx = 270 * (1 - k);
  const ty = stageTop - 100 * k;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 540,
        height: 804,
        transform: `translate(${tx}px, ${ty}px) scale(${k})`,
        transformOrigin: 'top left',
      }}
    >
      {children}
    </div>
  );
};
