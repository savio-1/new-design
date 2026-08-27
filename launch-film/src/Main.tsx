/* The 12-second piece: seven beats, hard cuts, exactly one blank frame
   at every boundary (the last frame of each beat renders the field
   alone — "fully absent for 1 frame, then fully present"). */
import React from 'react';
import { Sequence, useCurrentFrame } from 'remotion';
import { C } from './tokens';
import { Frame } from './components/Frame';
import { S1Scatter } from './scenes/S1Scatter';
import { S2Problem } from './scenes/S2Problem';
import { S3Reveal } from './scenes/S3Reveal';
import { S4Blocks } from './scenes/S4Blocks';
import { S5Combine } from './scenes/S5Combine';
import { S6Attach } from './scenes/S6Attach';
import { S7Close } from './scenes/S7Close';

/* Beat boundaries per the board — frames @60fps. */
const BEATS: { from: number; len: number; S: React.FC }[] = [
  { from: 0,   len: 96, S: S1Scatter },  /* 0.00–1.60 scatter        */
  { from: 96,  len: 84, S: S2Problem },  /* 1.60–3.00 problem        */
  { from: 180, len: 96, S: S3Reveal },   /* 3.00–4.60 reveal         */
  { from: 276, len: 168, S: S4Blocks },  /* 4.60–7.40 seven blocks   */
  { from: 444, len: 108, S: S5Combine }, /* 7.40–9.20 combine        */
  { from: 552, len: 96, S: S6Attach },   /* 9.20–10.80 attach        */
  { from: 648, len: 72, S: S7Close },    /* 10.80–12.00 close · dark */
];

/* The one blank frame: each beat's last frame shows the field only.
   Beat 7 keeps its final frame — it is the loop's contrast cut. */
const BlankLast: React.FC<{ len: number; keep?: boolean; children: React.ReactNode }> =
  ({ len, keep, children }) => {
    const f = useCurrentFrame();
    if (!keep && f >= len - 1) return null;
    return <>{children}</>;
  };

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  /* Light for beats 1–6; the close cuts to the dark field. */
  const bg = f >= 648 ? C.bgDark : C.bgLight;
  return (
    <Frame bg={bg}>
      {BEATS.map(({ from, len, S }, i) => (
        <Sequence key={i} from={from} durationInFrames={len}>
          <BlankLast len={len} keep={i === BEATS.length - 1}>
            <S />
          </BlankLast>
        </Sequence>
      ))}
    </Frame>
  );
};
