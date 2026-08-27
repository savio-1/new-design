import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import './fonts';
import {C} from './tokens';
import {Panel, StageArea} from './layout';
import {MeshGradient} from './gradient/MeshGradient';
import {Sparkles} from './components/Sparkles';
import {LogoLockup} from './components/LogoLockup';
import {ProgressDots} from './components/ProgressDots';
import {Headline} from './components/Headline';
import {B1Scatter} from './scenes/B1Scatter';
import {B23BlocksCombine} from './scenes/B23BlocksCombine';
import {B4Attach} from './scenes/B4Attach';
import {B5Grounded} from './scenes/B5Grounded';
import {Film as V4Film} from './v4/Film';

const Main: React.FC = () => (
  <AbsoluteFill style={{background: C.ink}}>
    <Panel>
      <MeshGradient />
      <Sparkles />
      <StageArea>
        {/* B4 renders below B23's dissolving bundle and below B5's flow. */}
        <Sequence from={372} durationInFrames={348}>
          <B4Attach />
        </Sequence>
        <Sequence from={0} durationInFrames={134}>
          <B1Scatter />
        </Sequence>
        <Sequence from={120} durationInFrames={272}>
          <B23BlocksCombine />
        </Sequence>
        <Sequence from={504} durationInFrames={144}>
          <B5Grounded />
        </Sequence>
      </StageArea>
      <LogoLockup />
      <Headline />
      <ProgressDots />
    </Panel>
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main23"
      component={Main}
      durationInFrames={720}
      fps={60}
      width={1080}
      height={1620}
    />
    <Composition
      id="Main11"
      component={Main}
      durationInFrames={720}
      fps={60}
      width={1080}
      height={1080}
    />
    {/* Storyboard v4 — the sphere film (Option A, seven spheres) */}
    <Composition
      id="Main169"
      component={V4Film}
      durationInFrames={780}
      fps={60}
      width={1920}
      height={1080}
    />
    <Composition
      id="V4Square"
      component={V4Film}
      durationInFrames={780}
      fps={60}
      width={1080}
      height={1080}
    />
  </>
);
