import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {BLOCKS} from '../data/blocks';
import {GlassCard} from '../components/GlassCard';
import {Pill} from '../components/Pill';
import {SparkGlyph} from '../components/Glyphs';
import {C, CARD, MESH_STOPS} from '../tokens';
import {clamp01, expoInOut, expoOut, lerp, osc, quadBezier, randRange, remap} from '../motion';

// Beats 2 + 3 share the seven cards (scroll → compressed stack → deck →
// bundle), so they live in one sequence: from 120, duration 272 (ends f392,
// after the bundle has dissolved into the orbit core).

const FOCUS_Y = 480;
const ROW = 90;
const enterAt = (i: number) => 8 + i * 18; // global f128 + 18i
const rise = (lf: number, t0: number) => expoOut((lf - t0) / 22);

const COMP_X = 270;
const compY = (i: number) => 176 + i * 58;
const COMP_SCALE = 0.72;
const COMPRESS_AT = 112; // global f232
const CONVERGE_AT = (i: number) => 136 + i * 3; // global f256 + 3i

const DECK = {x: 269, y: 330};
const deckY = (i: number) => DECK.y + (i - 3) * 6;
const BUNDLE_AT = 170; // global f290
const DISSOLVE_AT = 252; // global f372

export const B23BlocksCombine: React.FC = () => {
  const lf = useCurrentFrame();
  const f = lf + 120;

  const cp = expoInOut((lf - COMPRESS_AT) / 14);
  const bundleIn = expoOut((lf - BUNDLE_AT) / 16);
  const bundleOp =
    remap(lf, BUNDLE_AT, BUNDLE_AT + 8, 0, 1) *
    (1 - remap(lf, DISSOLVE_AT, DISSOLVE_AT + 14, 0, 1));
  const dissolve = expoInOut((lf - DISSOLVE_AT) / 20);
  const bob = 4 * osc(f, 4, 0) * clamp01((lf - BUNDLE_AT - 16) / 10);

  const pulseP = clamp01((lf - 176) / 12); // global f296–308

  return (
    <>
      {BLOCKS.map((b, i) => {
        const t0 = enterAt(i);
        if (lf < t0) return null;
        // Scroll phase: each later arrival shifts the stack up one row.
        let risen = 0;
        for (let k = i; k < 7; k++) risen += rise(lf, enterAt(k));
        const scrollY = FOCUS_Y + ROW - ROW * risen;
        const e = rise(lf, t0);
        const r = (FOCUS_Y - scrollY) / ROW; // rows above the focus band
        const rowOpacity = interpolate(r, [0, 1, 2.2, 3.2], [1, 0.4, 0.4, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const scrollOp = Math.min(lerp(0.4, 1, e), rowOpacity);
        const scrollScale = interpolate(r, [0, 1], [1, 0.96], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        // Compress: the whole stack settles so all seven are visible (f232–246).
        // Cards that have scrolled out above fade in near their slot instead of
        // flying down from under the logo.
        const srcY = Math.max(scrollY, compY(i) - 70);
        let x = lerp(270, COMP_X, cp);
        let y = lerp(srcY, compY(i), cp);
        let scale = lerp(scrollScale, COMP_SCALE, cp);
        let opacity = lerp(scrollOp, 1, cp);
        let rot = 0;

        // Converge: quadratic bezier into the deck (f256–290).
        const cvg = expoInOut((lf - CONVERGE_AT(i)) / 16);
        if (cvg > 0) {
          const from: [number, number] = [COMP_X, compY(i)];
          const to: [number, number] = [DECK.x, deckY(i)];
          const mid: [number, number] = [
            (from[0] + to[0]) / 2 + (i % 2 === 0 ? 44 : -44),
            (from[1] + to[1]) / 2,
          ];
          const [bx, by] = quadBezier(from, mid, to, cvg);
          x = bx;
          y = by;
          scale = lerp(COMP_SCALE, 0.34, cvg);
          rot = randRange(i * 5 + 9, -3, 3) * cvg;
        }

        // The deck fades as the bundle card takes over (f290–300).
        const deckFade = 1 - remap(lf, BUNDLE_AT, BUNDLE_AT + 10, 0, 1);
        opacity *= deckFade * clamp01((lf - t0) / 5);
        if (opacity <= 0) return null;

        return (
          <div
            key={b.name}
            style={{
              position: 'absolute',
              left: x - 197,
              top: y - 39,
              transform: `scale(${scale}) rotate(${rot}deg)`,
              opacity,
              zIndex: 10 + i,
            }}
          >
            <GlassCard title={b.name} desc={b.desc} iconAngle={96 + i * 51} />
          </div>
        );
      })}

      {/* Ring pulse from the bundle's centre (f296–308) */}
      {pulseP > 0 && pulseP < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: DECK.x - 197,
            top: DECK.y - 55,
            width: 394,
            height: 110,
            borderRadius: 24,
            border: `1px solid ${C.white}`,
            opacity: 0.5 * (1 - pulseP),
            transform: `scale(${lerp(1, 1.4, pulseP)})`,
          }}
        />
      ) : null}

      {/* Context Bundle card (f290 →, dissolving into the core over f372–386) */}
      {bundleOp > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: DECK.x,
            top: DECK.y + bob + dissolve * 21,
            transform: `translate(-50%, -50%) scale(${lerp(lerp(0.4, 1, bundleIn), 0.45, dissolve)})`,
            opacity: bundleOp,
            zIndex: 30,
          }}
        >
          <div style={{position: 'absolute', left: 20, top: -28}}>
            <Pill label="Context bundle" icon={<SparkGlyph size={12} color={C.white} />} />
          </div>
          <GlassCard title="Support Ops" desc="7 sources · ontology, rules, policies" width={394} height={110}>
            <div style={{display: 'flex', gap: 7, marginTop: 9}}>
              {BLOCKS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: `linear-gradient(${96 + i * 51}deg, ${MESH_STOPS})`,
                    boxShadow: CARD.shadow,
                  }}
                />
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
};
