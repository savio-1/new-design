import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Pill} from '../components/Pill';
import {Connector} from '../components/Connector';
import {GlassCard, Badge} from '../components/GlassCard';
import {PlayGlyph, GearGlyph, CheckGlyph, SparkGlyph, PeopleGlyph} from '../components/Glyphs';
import {C, CARD, TYPE} from '../tokens';
import {clamp01, expoOut, lerp, osc, remap} from '../motion';

// Beat 5 — Grounded (f504–623) + the bottom-up exit that opens beat 6
// (f624–648). Sequence: from 504, duration 144. The orbit stays faintly
// visible behind this flow — the agent runs *inside* the context.

const W = 320;
const X = 270 - W / 2;

const Exec: React.FC = () => (
  <div
    style={{
      width: W,
      height: 124,
      borderRadius: CARD.radius,
      background: CARD.bg,
      backdropFilter: `blur(${CARD.blur})`,
      WebkitBackdropFilter: `blur(${CARD.blur})`,
      boxShadow: CARD.shadow,
      padding: CARD.padding,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'Geist',
        fontWeight: 500,
        fontSize: 12,
        letterSpacing: -0.3,
        color: C.inkMuted,
      }}
    >
      <SparkGlyph size={11} color={C.inkMuted} />
      Finished execution
    </div>
    <div
      style={{
        fontFamily: TYPE.cardTitle.family,
        fontWeight: TYPE.cardTitle.weight,
        fontSize: TYPE.cardTitle.size,
        lineHeight: `${TYPE.cardTitle.lineHeight}px`,
        letterSpacing: TYPE.cardTitle.tracking,
        color: TYPE.cardTitle.color,
      }}
    >
      Invoice Validator
    </div>
    <div
      style={{
        fontFamily: TYPE.cardDesc.family,
        fontWeight: TYPE.cardDesc.weight,
        fontSize: TYPE.cardDesc.size,
        lineHeight: `${TYPE.cardDesc.lineHeight}px`,
        letterSpacing: TYPE.cardDesc.tracking,
        color: TYPE.cardDesc.color,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      Reviews invoices for accuracy before posting
    </div>
    <div style={{marginTop: 4}}>
      <Badge>
        <SparkGlyph size={11} color={C.ink} />
        Gemini
      </Badge>
    </div>
  </div>
);

export const B5Grounded: React.FC = () => {
  const lf = useCurrentFrame();
  const f = lf + 504;
  const {fps} = useVideoConfig();

  const bob = 3 * osc(f, 4, Math.PI / 4) * clamp01((f - 600) / 12) * (1 - remap(f, 624, 636, 0, 1));

  // Bottom-up exit for beat 6: index 0 = result … 4 = trigger.
  const exit = (k: number) => remap(f, 624 + k * 3, 636 + k * 3, 0, 1);
  const groupStyle = (enterP: number, fromY: number, k: number): React.CSSProperties => {
    const out = exit(k);
    return {
      position: 'absolute',
      left: 0,
      transform: `translateY(${lerp(fromY, 0, enterP) + bob}px) scale(${lerp(1, 0.94, out)})`,
      opacity: enterP * (1 - out),
      width: 540,
    };
  };

  const triggerIn = expoOut((f - 512) / 18);
  const conn1 = clamp01((f - 530) / 14);
  const agentIn = expoOut((f - 544) / 22);
  const conn2 = clamp01((f - 566) / 14);
  const resultIn = expoOut((f - 580) / 20);
  const tick = spring({frame: f - 596, fps, config: {damping: 9, stiffness: 130, mass: 0.6}});

  return (
    <>
      {/* Trigger */}
      <div style={groupStyle(triggerIn, -36, 4)}>
        <div style={{position: 'absolute', left: X + 18, top: 106}}>
          <Pill label="Trigger" icon={<PlayGlyph size={14} />} />
        </div>
        <div style={{position: 'absolute', left: X, top: 134}}>
          <GlassCard width={W} height={56} title="New invoice received" icon={null} />
        </div>
      </div>

      {/* Connector 1 */}
      <div style={{...groupStyle(1, 0, 3), left: 269, top: 190}}>
        <Connector height={88} progress={conn1} />
      </div>

      {/* Agent */}
      <div style={groupStyle(agentIn, 30, 2)}>
        <div style={{position: 'absolute', left: X + 18, top: 278}}>
          <Pill label="Agent" icon={<GearGlyph size={14} />} />
        </div>
        <div style={{position: 'absolute', left: X, top: 306}}>
          <Exec />
        </div>
      </div>

      {/* Connector 2 */}
      <div style={{...groupStyle(1, 0, 1), left: 269, top: 430}}>
        <Connector height={88} progress={conn2} />
      </div>

      {/* Result */}
      <div style={groupStyle(resultIn, 30, 0)}>
        <div style={{position: 'absolute', left: X + 18, top: 518}}>
          <Pill label="Result" icon={<CheckGlyph size={13} />} />
        </div>
        <div style={{position: 'absolute', left: X, top: 546}}>
          <GlassCard
            width={W}
            height={56}
            title="Approved"
            icon={<PeopleGlyph size={20} color={C.ink} />}
            right={
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: C.success,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${tick})`,
                }}
              >
                <CheckGlyph size={13} color={C.white} strokeWidth={2.2} />
              </div>
            }
          />
        </div>
      </div>
    </>
  );
};
