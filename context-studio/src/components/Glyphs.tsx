import React from 'react';
import {C, MESH_STOPS} from '../tokens';

// The cogentiq triangle mark. The reference panels draw it as an outlined
// triangle with an inner triangle hinted — outline is the default; `fill`
// gives the solid variant.
export const Triangle: React.FC<{
  size?: number;
  color?: string;
  variant?: 'outline' | 'fill' | 'gradient';
}> = ({size = 18, color = C.ink, variant = 'outline'}) => {
  const gid = `tri-grad-${size}`;
  const strokeCol = variant === 'gradient' ? `url(#${gid})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {variant === 'gradient' ? (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.g_blue} />
            <stop offset="40%" stopColor={C.g_indigo} />
            <stop offset="75%" stopColor={C.g_orange} />
            <stop offset="100%" stopColor={C.g_yellow} />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M12 4 L21 20 L3 20 Z"
        fill={variant === 'fill' ? color : 'none'}
        stroke={strokeCol}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {variant !== 'fill' ? (
        <path
          d="M12 10.5 L15.8 17 L8.2 17 Z"
          fill="none"
          stroke={strokeCol}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
};

// Miniature mesh-gradient blob cluster + triangle, inside a white tile — the
// icon of every glass card. The gradient angle rotates per block (i * 51°).
export const MeshTile: React.FC<{size?: number; angle?: number}> = ({
  size = 32,
  angle = 96,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: C.white,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: '-20%',
        top: '-20%',
        width: '140%',
        height: '140%',
        borderRadius: '50%',
        background: `linear-gradient(${angle}deg, ${MESH_STOPS})`,
        filter: `blur(${size * 0.16}px)`,
        opacity: 0.9,
      }}
    />
    <div style={{position: 'relative', display: 'flex'}}>
      <Triangle size={size * 0.55} color={C.white} variant="fill" />
    </div>
  </div>
);

const stroke = {
  fill: 'none',
  stroke: C.ink,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Minimal ink glyphs for the seven blocks (open item #2 — swap for the design
// system icons once the mapping is confirmed).
export const BlockIcon: React.FC<{name: string; size?: number}> = ({name, size = 28}) => {
  const s = {width: size, height: size};
  switch (name) {
    case 'Ontology':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <circle cx="14" cy="6" r="3.2" {...stroke} />
          <circle cx="6.5" cy="21" r="3.2" {...stroke} />
          <circle cx="21.5" cy="21" r="3.2" {...stroke} />
          <path d="M12.5 8.8 L8 18.2 M15.5 8.8 L20 18.2 M9.7 21 L18.3 21" {...stroke} />
        </svg>
      );
    case 'Glossary':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <path d="M6 5.5 C6 4.7 6.7 4 7.5 4 H22 V21 H7.5 C6.7 21 6 21.7 6 22.5 V5.5 Z" {...stroke} />
          <path d="M6 22.5 C6 23.3 6.7 24 7.5 24 H22 V21" {...stroke} />
          <path d="M10.5 9.5 H17.5 M10.5 13.5 H15.5" {...stroke} />
        </svg>
      );
    case 'Tool Binding':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <path d="M11 14 a4.5 4.5 0 0 1 4.5 -4.5 h3 a4.5 4.5 0 0 1 0 9 h-1.5" {...stroke} />
          <path d="M17 14 a4.5 4.5 0 0 1 -4.5 4.5 h-3 a4.5 4.5 0 0 1 0 -9 h1.5" {...stroke} />
        </svg>
      );
    case 'Data Binding':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <ellipse cx="14" cy="7" rx="8" ry="3.2" {...stroke} />
          <path d="M6 7 V21 C6 22.8 9.6 24.2 14 24.2 C18.4 24.2 22 22.8 22 21 V7" {...stroke} />
          <path d="M6 14 C6 15.8 9.6 17.2 14 17.2 C18.4 17.2 22 15.8 22 14" {...stroke} />
        </svg>
      );
    case 'Prompts':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <path d="M5 8 C5 6.3 6.3 5 8 5 H20 C21.7 5 23 6.3 23 8 V16 C23 17.7 21.7 19 20 19 H12 L7 23.5 V19 H8 C6.3 19 5 17.7 5 16 Z" {...stroke} />
          <path d="M10 10.5 H18 M10 14 H15" {...stroke} />
        </svg>
      );
    case 'Rules':
      return (
        <svg {...s} viewBox="0 0 28 28">
          <path d="M5 7 L7 9 L10.5 5.5 M14 7.5 H23" {...stroke} />
          <path d="M5 15 L7 17 L10.5 13.5 M14 15.5 H23" {...stroke} />
          <path d="M5 23 L7 25 L10.5 21.5 M14 23.5 H23" {...stroke} />
        </svg>
      );
    case 'Policies':
    default:
      return (
        <svg {...s} viewBox="0 0 28 28">
          <path d="M14 3.5 L23 7 V13 C23 19 19.5 23 14 25 C8.5 23 5 19 5 13 V7 Z" {...stroke} />
          <path d="M10 13.5 L13 16.5 L18.5 10.5" {...stroke} />
        </svg>
      );
  }
};

export const PlayGlyph: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = C.white,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path d="M5 3.5 L12 8 L5 12.5 Z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

export const GearGlyph: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = C.white,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="2.4" fill="none" stroke={color} strokeWidth={1.5} />
    <path
      d="M8 1.5 V3.6 M8 12.4 V14.5 M1.5 8 H3.6 M12.4 8 H14.5 M3.4 3.4 L4.9 4.9 M11.1 11.1 L12.6 12.6 M12.6 3.4 L11.1 4.9 M4.9 11.1 L3.4 12.6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
);

export const CheckGlyph: React.FC<{size?: number; color?: string; strokeWidth?: number}> = ({
  size = 16,
  color = C.white,
  strokeWidth = 1.8,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path
      d="M3.5 8.5 L6.8 11.8 L12.8 4.8"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SparkGlyph: React.FC<{size?: number; color?: string}> = ({
  size = 12,
  color = C.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path
      d="M8 1 C8.7 5.2 10.8 7.3 15 8 C10.8 8.7 8.7 10.8 8 15 C7.3 10.8 5.2 8.7 1 8 C5.2 7.3 7.3 5.2 8 1 Z"
      fill={color}
    />
  </svg>
);

export const PeopleGlyph: React.FC<{size?: number; color?: string}> = ({
  size = 16,
  color = C.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <circle cx="6" cy="5.5" r="2.4" fill="none" stroke={color} strokeWidth={1.4} />
    <path d="M1.8 13.5 C2.2 10.8 3.9 9.5 6 9.5 C8.1 9.5 9.8 10.8 10.2 13.5" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <path d="M10.6 3.6 A2.4 2.4 0 1 1 10.6 7.4 M11.6 9.7 C13.3 10.1 14.1 11.5 14.4 13.5" fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
  </svg>
);
