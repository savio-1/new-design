import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {osc, randRange, remap} from '../motion';
import {usePanel} from '../layout';

type Spark = {x: number; y: number};

const POSITIONS: Spark[] = [
  {x: 353, y: 185},
  {x: 273, y: 145},
  {x: 453, y: 325},
  {x: 133, y: 195},
  {x: 473, y: 165},
  {x: 53, y: 185},
  {x: 413, y: 215},
  {x: 473, y: 445},
  {x: 83, y: 515},
  {x: 73, y: 395},
];

const Diamond: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path
      d="M8 0 C8.8 5.2 10.8 7.2 16 8 C10.8 8.8 8.8 10.8 8 16 C7.2 10.8 5.2 8.8 0 8 C5.2 7.2 7.2 5.2 8 0 Z"
      fill={C.white}
    />
  </svg>
);

export const Sparkles: React.FC = () => {
  const f = useCurrentFrame();
  const {H} = usePanel();
  const yScale = H / 804;
  return (
    <>
      {POSITIONS.map((p, i) => {
        const size = randRange(i * 7 + 1, 4, 8);
        const isDiamond = i % 3 !== 1;
        const period = i % 2 === 0 ? 4 : 3; // both divide 12s
        const phase = randRange(i * 13 + 5, 0, Math.PI * 2);
        const twinkle = remap(osc(f, period, phase), -1, 1, 0.3, 1.0);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x - size / 2,
              top: p.y * yScale - size / 2,
              width: size,
              height: size,
              opacity: twinkle,
            }}
          >
            {isDiamond ? (
              <Diamond size={size} />
            ) : (
              <div
                style={{width: size, height: size, borderRadius: '50%', background: C.white}}
              />
            )}
          </div>
        );
      })}
    </>
  );
};
