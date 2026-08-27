import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import './fonts';

export const Root: React.FC = () => (
  <>
    <Composition id="MainSquare" component={Main}
      durationInFrames={720} fps={60} width={1080} height={1080} />
    <Composition id="MainWide" component={Main}
      durationInFrames={720} fps={60} width={1920} height={1080} />
  </>
);
