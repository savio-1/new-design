import React from 'react';
import {C, CARD, TYPE} from '../tokens';
import {MeshTile} from './Glyphs';

// The `AI assistant cards` component. Focus = opacity 1, receded = 0.4 — the
// receded state is native to the design system, applied by the parent.
export const GlassCard: React.FC<{
  width?: number;
  height?: number;
  title: string;
  desc?: string;
  icon?: React.ReactNode;
  iconAngle?: number;
  right?: React.ReactNode;
  children?: React.ReactNode;
}> = ({width = 394, height = 78, title, desc, icon, iconAngle = 96, right, children}) => (
  <div
    style={{
      width,
      height,
      borderRadius: CARD.radius,
      background: CARD.bg,
      backdropFilter: `blur(${CARD.blur})`,
      WebkitBackdropFilter: `blur(${CARD.blur})`,
      boxShadow: CARD.shadow,
      padding: CARD.padding,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxSizing: 'border-box',
    }}
  >
    {icon === undefined ? <MeshTile size={32} angle={iconAngle} /> : icon}
    <div style={{flex: 1, minWidth: 0}}>
      <div
        style={{
          fontFamily: TYPE.cardTitle.family,
          fontWeight: TYPE.cardTitle.weight,
          fontSize: TYPE.cardTitle.size,
          lineHeight: `${TYPE.cardTitle.lineHeight}px`,
          letterSpacing: TYPE.cardTitle.tracking,
          color: TYPE.cardTitle.color,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>
      {desc ? (
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
          {desc}
        </div>
      ) : null}
      {children}
    </div>
    {right}
  </div>
);

export const Badge: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 9px',
      borderRadius: 11,
      background: 'rgba(18,18,18,0.08)',
      fontFamily: 'Geist',
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: -0.3,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);
