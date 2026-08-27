import React from 'react';
import {useCurrentFrame} from 'remotion';
import {BLOCKS} from '../data/blocks';
import {OrbitCore} from '../components/OrbitCore';
import {OrbitRing, RINGS, ringPoint} from '../components/OrbitRing';
import {IconTile} from '../components/IconTile';
import {BlockIcon} from '../components/Glyphs';
import {GlassCard, Badge} from '../components/GlassCard';
import {Pill} from '../components/Pill';
import {SparkGlyph, GearGlyph} from '../components/Glyphs';
import {C} from '../tokens';
import {clamp01, cubicInOut, expoOut, lerp, remap} from '../motion';

// Beat 4 — Attach (f372–503) — and the orbit's after-life: it recedes behind
// the beat-5 flow and returns to full strength for the close. Sequence: from
// 372, duration 348 (runs to f720 so the loop ends on the orbit).

const CORE = {x: 269, y: 351};

// 3 / 2 / 2 across the rings; the orbital period is exactly 12s so f719 lands
// where f0 of the orbit began (§8 beat 4).
const ICON_RINGS = [0, 0, 0, 1, 1, 2, 2];
const ICON_PHASE = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3, 0.9, 0.9 + Math.PI, 2.5, 2.5 + Math.PI];

export const B4Attach: React.FC = () => {
  const lf = useCurrentFrame();
  const f = lf + 372;

  const coreIn = expoOut((lf - 6) / 14); // dissolve in from the bundle, f378–392
  // Recede behind the beat-5 flow (f504–512), return for the close (f624–648).
  const recede = remap(f, 504, 512, 0, 1) * (1 - remap(f, 624, 648, 0, 1));
  const ringStrength = lerp(1, 0.15, recede);
  const iconStrength = lerp(1, 0.25, recede);
  const coreScale = lerp(1, 0.9, recede) * lerp(0.85, 1, coreIn);
  const coreOp = coreIn * lerp(1, 0.5, recede);

  // Beat 6: the orbit drifts gently toward the stage centre (f640–660).
  const drift = -12 * cubicInOut((f - 640) / 20);

  // Core pulse when the agent card docks (~f466).
  const pulse = clamp01((lf - 92) / 16);
  const pulseScale = 1 + 0.08 * Math.sin(Math.PI * pulse) * (pulse < 1 ? 1 : 0);

  // Agent card: docks f440–470, leaves with the recede (f504–512).
  const agentIn = expoOut((lf - 68) / 22);
  const agentOp = agentIn * (1 - remap(f, 504, 512, 0, 1));
  const agentY = lerp(700, 566, agentIn);

  const orbitIcons = BLOCKS.map((b, j) => {
    const ring = RINGS[ICON_RINGS[j]];
    const phi = ICON_PHASE[j] + ring.dir * ((f / 720) * Math.PI * 2);
    const {x, y, depth} = ringPoint(ring, phi);
    const appear = expoOut((lf - (26 + j * 6)) / 12);
    const behind = depth < 0;
    const depthOp = remap(depth, -0.35, 0.1, 0.55, 1);
    const depthScale = remap(depth, -0.35, 0.1, 0.9, 1);
    return {b, j, x, y, behind, appear, depthOp, depthScale};
  });

  const renderIcon = ({b, j, x, y, appear, depthOp, depthScale}: (typeof orbitIcons)[number]) => {
    const op = appear * depthOp * iconStrength;
    if (op <= 0.01) return null;
    return (
      <div
        key={b.name}
        style={{
          position: 'absolute',
          left: CORE.x + x - 22.88,
          top: CORE.y + y - 22.88,
          transform: `scale(${depthScale * lerp(0.6, 1, appear)})`,
          opacity: op,
        }}
      >
        <IconTile>
          <BlockIcon name={b.name} size={26} />
        </IconTile>
      </div>
    );
  };

  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${drift}px)`}}>
      {/* rings */}
      <div style={{position: 'absolute', left: CORE.x, top: CORE.y}}>
        {RINGS.map((ring, r) => (
          <OrbitRing
            key={r}
            ring={ring}
            progress={(lf - (14 + r * 6)) / 22}
            opacity={ringStrength}
          />
        ))}
      </div>

      {/* far-side icons behind the core */}
      {orbitIcons.filter((icon) => icon.behind).map(renderIcon)}

      {/* core + pulse */}
      {coreOp > 0 ? (
        <>
          {pulse > 0 && pulse < 1 ? (
            <div
              style={{
                position: 'absolute',
                left: CORE.x - 35,
                top: CORE.y - 35,
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: `1px solid ${C.white}`,
                opacity: 0.4 * (1 - pulse),
                transform: `scale(${lerp(1, 1.6, pulse)})`,
              }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              left: CORE.x - 35,
              top: CORE.y - 35,
              transform: `scale(${coreScale * pulseScale})`,
              opacity: coreOp,
            }}
          >
            <OrbitCore />
          </div>
        </>
      ) : null}

      {/* near-side icons in front of the core */}
      {orbitIcons.filter((icon) => !icon.behind).map(renderIcon)}

      {/* agent card */}
      {agentOp > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 270,
            top: agentY,
            transform: 'translate(-50%, -50%)',
            opacity: agentOp,
          }}
        >
          <div style={{position: 'absolute', left: 20, top: -28}}>
            <Pill label="Agent" icon={<GearGlyph size={14} />} />
          </div>
          <GlassCard
            title="Invoice Validator"
            desc="Grounded in Support Ops context"
            right={
              <Badge>
                <SparkGlyph size={11} color={C.ink} />
                Gemini
              </Badge>
            }
          />
        </div>
      ) : null}
    </div>
  );
};
