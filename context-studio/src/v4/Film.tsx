import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CameraProvider, Depth} from './camera';
import {CELLS, GRID, coreState, gridDrift, gridEnter, gridExit, heroDim, sevenState} from './choreo';
import {MatteSphere, EmissiveSphere, ShadedSphere} from './spheres';
import {
  Caption,
  EmitRing,
  Field,
  GlobalGrain,
  Label,
  Lockup,
  MintBloom,
  Plane,
  RadarRings,
  Sparkle,
  Squares,
  Swoosh,
  TrailBar,
  UIFragment,
} from './elements';
import {SPHERES} from './tokens';
import {Triangle} from '../components/Glyphs';
import {clamp01, lerp, osc, randRange, remap, sineInOut} from '../motion';

// Rack windows for beat 2's caption word emphasis.
const RACKS: Array<[number, number]> = [
  [210, 237],
  [240, 267],
  [270, 297],
  [300, 318],
];

const CLUTTER = Array.from({length: 10}, (_, i) => ({
  isPlane: i < 6,
  kind: (i % 4) + 1,
  start: 582 + (i * 3) % 12,
  py: 0.12 + ((i * 0.83) % 1) * 0.72,
  depth: 0.88 + ((i * 0.37) % 1) * 0.08,
  w: 0.14 + ((i * 0.53) % 1) * 0.12, // planes; fragments use 0.06–0.10
  h: 0.09 + ((i * 0.29) % 1) * 0.07,
}));

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const {width: W, height: H, fps} = useVideoConfig();
  const aspect = H / W;
  const dia = GRID.dia * W;

  const sp450 = f >= 450 ? spring({frame: f - 450, fps, config: {damping: 11, stiffness: 190}}) : 0;
  const core = coreState(f, sp450);
  const hero = CELLS.find((c) => c.isHero)!;
  const heroEnter = gridEnter(f, hero);

  // Beat-6 crossfade: emissive → shaded at the node position.
  const shadedIn = remap(f, 690, 714, 0, 1);
  const nodeIgnite = remap(f, 644, 656, 0, 1);
  const nodeIn = remap(f, 570, 590, 0, 1);
  const nodeRingFade = 1 - shadedIn;

  return (
    <AbsoluteFill style={{background: '#0A0C18', overflow: 'hidden'}}>
      <Field />
      <MintBloom />
      <CameraProvider>
        {/* ---- plain grid spheres ---- */}
        {CELLS.map((cell, ci) => {
          if (cell.isHero || cell.sevenIdx >= 0) return null;
          const enter = gridEnter(f, cell);
          const opacity = enter.opacity * gridExit(f) * heroDim(f, cell);
          if (opacity <= 0.01) return null;
          const [dx, dy] = gridDrift(f, ci);
          return (
            <Depth key={cell.key} d={0.5} x={cell.px + dx} y={cell.py + dy} opacity={opacity}>
              <div style={{transform: `scale(${enter.scale})`}}>
                <MatteSphere size={dia} from={cell.from} to={cell.to} angle={cell.angle} />
              </div>
            </Depth>
          );
        })}

        {/* ---- static radar rings, lower-left, clipped by the frame (beat 1) ---- */}
        {f < 210 ? (
          <Depth d={0.5} x={0.086} y={0.885} opacity={gridExit(f)}>
            <div style={{transform: 'translate(-50%, -50%)', position: 'absolute'}}>
              <RadarRings
                drawProgress={[
                  clamp01((f - 30) / 16),
                  clamp01((f - 35) / 16),
                  clamp01((f - 40) / 16),
                ]}
              />
            </div>
          </Depth>
        ) : null}

        {/* ---- the seven ---- */}
        {SPHERES.map((s, i) => {
          const st = sevenState(f, i, aspect);
          if (st.opacity <= 0.01) return null;
          const prev = sevenState(f - 1, i, aspect);
          const vx = (st.x - prev.x) * W;
          const vy = (st.y - prev.y) * H;
          const speed = Math.hypot(vx, vy);
          const labelOp =
            remap(f, 168 + i * 6, 180 + i * 6, 0, 1) * (1 - remap(f, 330, 344, 0, 1));
          return (
            <Depth key={s.id} d={st.d} x={st.x} y={st.y} opacity={st.opacity}>
              {speed > 5 && f > 344 ? (
                <TrailBar
                  length={Math.min(speed * 5, 0.11 * W)}
                  height={dia * 0.55}
                  hue={s.from}
                  angleDeg={(Math.atan2(-vy, -vx) * 180) / Math.PI}
                />
              ) : null}
              <div style={{transform: `translate(-50%, -50%) scale(${st.scale})`, position: 'absolute', width: dia, height: dia}}>
                <MatteSphere size={dia} from={s.from} to={s.to} angle={s.angle} />
                <Label text={s.label} opacity={labelOp} />
              </div>
            </Depth>
          );
        })}

        {/* ---- the core: matte → emissive, absorbs the seven, travels ---- */}
        <Depth d={0.5} x={core.x} y={core.y}>
          {/* beat-4 radar emits */}
          {[0, 1, 2].map((k) => (
            <EmitRing key={k} t={clamp01((f - 458 - k * 8) / 28)} baseR={dia * 0.95} />
          ))}
          <div style={{transform: `translate(-50%, -50%) scale(${core.scale * heroEnter.scale})`, position: 'absolute', width: dia, height: dia}}>
            {core.matteOpacity > 0 ? (
              <div style={{position: 'absolute', inset: 0, opacity: core.matteOpacity * heroEnter.opacity}}>
                <MatteSphere size={dia} from="#3D7BFF" to="#8E7BFA" angle={120} />
              </div>
            ) : null}
            {core.emissiveOpacity > 0 ? (
              <div style={{position: 'absolute', inset: 0, opacity: core.emissiveOpacity}}>
                <EmissiveSphere
                  size={dia}
                  hue="#7FB4FF"
                  rimOpacity={core.rimOpacity}
                  haloStrength={core.haloStrength}
                  conicOpacity={core.conicOpacity}
                  conicAngle={(f / (6.5 * 60)) * 360}
                  hues={SPHERES.map((s) => s.from)}
                />
              </div>
            ) : null}
          </div>
        </Depth>

        {/* ---- beat-5 clutter: planes + UI fragments sweeping the foreground ---- */}
        {CLUTTER.map((cl, i) => {
          const t = clamp01((f - cl.start) / 34);
          if (t <= 0 || t >= 1) return null;
          const x = lerp(1.5, -0.5, t);
          return (
            <Depth key={i} d={cl.depth} x={x} y={cl.py} opacity={0.6}>
              {cl.isPlane ? (
                <Plane
                  w={cl.w * W}
                  h={cl.h * W}
                  rx={randRange(i * 5 + 1, -0.6, 0.6)}
                  ry={randRange(i * 5 + 2, -1, 1)}
                  rz={randRange(i * 5 + 3, -24, 24)}
                />
              ) : (
                <UIFragment kind={cl.kind} w={(0.06 + ((i * 0.61) % 1) * 0.04) * W} />
              )}
            </Depth>
          );
        })}

        {/* ---- assistant node → shaded sphere ---- */}
        {nodeIn > 0 ? (
          <Depth d={0.5} x={0.648} y={0.47} opacity={nodeIn}>
            {/* concentric rings */}
            {[
              {r: 0.035 * W, base: 0.12, lit: 0.32},
              {r: 0.052 * W, base: 0.07, lit: 0.18},
            ].map((ring, k) => (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  left: -ring.r,
                  top: -ring.r,
                  width: ring.r * 2,
                  height: ring.r * 2,
                  borderRadius: '50%',
                  border: '1px solid #FFFFFF',
                  opacity: lerp(ring.base, ring.lit, nodeIgnite) * nodeRingFade,
                }}
              />
            ))}
            {/* node radar emits on ignition */}
            {[0, 1, 2].map((k) => (
              <EmitRing key={k} t={clamp01((f - 652 - k * 8) / 28)} baseR={0.045 * W} />
            ))}
            {/* the mark: white while dormant, flipping dark once the core arrives */}
            {shadedIn < 1 ? (
              <div style={{position: 'absolute', transform: 'translate(-50%, -50%)', opacity: (1 - shadedIn) * lerp(0.4, 1, nodeIgnite), zIndex: 4}}>
                <Triangle
                  size={0.016 * W}
                  color={nodeIgnite > 0.5 ? '#101426' : '#FFFFFF'}
                  variant="fill"
                />
              </div>
            ) : null}
            {/* beat 6: the resolved, physical object */}
            {shadedIn > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) scale(${lerp(0.75, 1, sineInOut(shadedIn)) * (1 + 0.02 * osc(f, 3.25, 0.7) * remap(f, 714, 730, 0, 1))})`,
                  opacity: shadedIn,
                  zIndex: 5,
                }}
              >
                <ShadedSphere size={0.085 * W} body="#4E6EF2" />
              </div>
            ) : null}
            <div style={{position: 'absolute', left: -0.030 * W, top: -0.031 * W, zIndex: 6}}>
              <Sparkle t={clamp01((f - 716) / 36)} size={0.012 * W} />
            </div>
          </Depth>
        ) : null}
      </CameraProvider>

      {/* ---- swooshes: one at a time, ever ---- */}
      <Swoosh
        path={`M ${-0.05 * W} ${0.18 * H} C ${0.35 * W} ${0.02 * H} ${0.3 * W} ${0.75 * H} ${0.62 * W} ${0.62 * H} S ${0.95 * W} ${0.5 * H} ${1.05 * W} ${0.85 * H}`}
        draw={(f - 356) / 24}
        fade={clamp01((f - 386) / 14)}
      />
      <Swoosh
        path={`M ${-0.04 * W} ${0.34 * H} C ${0.3 * W} ${0.3 * H} ${0.5 * W} ${0.62 * H} ${0.72 * W} ${0.66 * H} S ${0.95 * W} ${0.78 * H} ${1.04 * W} ${0.88 * H}`}
        draw={(f - 704) / 36}
        fade={clamp01((f - 744) / 16)}
      />

      <Squares appearAt={40} />

      {/* ---- the running line ---- */}
      <Caption inAt={48} outAt={150} y={0.28}>
        Context lives in pieces
      </Caption>
      <Caption inAt={168} outAt={330} y={0.17}>
        {['ontology', 'rules', 'policies', 'data'].map((w, k) => {
          const [s, e] = RACKS[k];
          const em = remap(f, s - 6, s, 0, 1) * (1 - remap(f, e, e + 6, 0, 1));
          return (
            <span key={w} style={{opacity: 0.62 + 0.38 * em}}>
              {w}
              {k < 3 ? ', ' : ''}
            </span>
          );
        })}
      </Caption>
      <Caption inAt={342} outAt={436} y={0.24}>
        bring them together
      </Caption>
      <Caption inAt={466} outAt={574} y={0.482} opacity={0.8}>
        into one context
      </Caption>
      <Caption inAt={590} outAt={684} y={0.74}>
        attach it to your assistant
      </Caption>
      <Caption inAt={722} outAt={9999} right={0.94} y={0.47}>
        now it knows your business
      </Caption>
      <Lockup inAt={740} right={0.94} y={0.56} />

      <GlobalGrain />
    </AbsoluteFill>
  );
};
