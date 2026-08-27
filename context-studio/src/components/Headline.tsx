import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, TYPE} from '../tokens';
import {clamp01, expoOut} from '../motion';
import {usePanel} from '../layout';
import {Triangle} from './Glyphs';

type Slot = {start: number; end: number; lines?: string[]; lockup?: boolean};

// Beat starts per §7; the closing lockup swaps in at f648, not at the beat-6
// boundary (§8 beat 6).
const SLOTS: Slot[] = [
  {start: 0, end: 120, lines: ['Your enterprise context', 'lives everywhere.']},
  {start: 120, end: 252, lines: ['Bring it into', 'Context Studio.']},
  {start: 252, end: 372, lines: ['Combine it into', 'one context.']},
  {start: 372, end: 504, lines: ['Attach it to any agent.']},
  {start: 504, end: 648, lines: ['Now it answers', 'like it works here.']},
  {start: 648, end: 720, lockup: true},
];

const Line: React.FC<{
  children: React.ReactNode;
  inStart: number;
  outStart: number;
  f: number;
  height: number;
}> = ({children, inStart, outStart, f, height}) => {
  const pIn = expoOut(clamp01((f - inStart) / 10));
  const pOut = clamp01((f - outStart) / 8);
  // Incoming masks up from below; outgoing masks down and fades. The two
  // headlines never crossfade on top of each other (§6).
  const clipTop = pOut * 100;
  const clipBottom = (1 - pIn) * 100;
  return (
    <div
      style={{
        height,
        clipPath: `inset(${clipTop}% 0 ${clipBottom}% 0)`,
        transform: `translateY(${(1 - pIn) * 14 + pOut * 12}px)`,
        opacity: pIn * (1 - pOut),
      }}
    >
      {children}
    </div>
  );
};

export const Headline: React.FC = () => {
  const f = useCurrentFrame();
  const {headlineY} = usePanel();
  const h = TYPE.headline;
  return (
    <div
      style={{
        position: 'absolute',
        left: (540 - 387) / 2,
        top: headlineY,
        width: 387,
        textAlign: 'center',
        fontFamily: h.family,
        fontWeight: h.weight,
        fontSize: h.size,
        lineHeight: `${h.lineHeight}px`,
        letterSpacing: h.tracking,
        color: h.color,
      }}
    >
      {SLOTS.map((slot, si) => {
        // Outgoing finishes right at the boundary; incoming starts on it.
        const inStart = si === 0 ? 4 : slot.start;
        const outStart = slot.end >= 720 ? Infinity : slot.end - 10;
        if (f < inStart - 2 || f > slot.end + 2) return null;
        return (
          <div key={si} style={{position: 'absolute', left: 0, right: 0, top: 0}}>
            {slot.lockup ? (
              <>
                <Line inStart={inStart} outStart={outStart} f={f} height={44}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background: C.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Triangle size={20} variant="gradient" />
                    </div>
                    <span style={{fontSize: 36, letterSpacing: -1.44}}>cogentiq</span>
                  </div>
                </Line>
                <Line inStart={inStart + 3} outStart={outStart} f={f} height={30}>
                  <span
                    style={{
                      fontFamily: 'Geist',
                      fontWeight: 400,
                      fontSize: 20,
                      letterSpacing: -0.4,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    Context Studio
                  </span>
                </Line>
              </>
            ) : (
              slot.lines!.map((line, li) => (
                <Line
                  key={li}
                  inStart={inStart + li * 3}
                  outStart={outStart + li * 3}
                  f={f}
                  height={h.lineHeight}
                >
                  {line}
                </Line>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};
