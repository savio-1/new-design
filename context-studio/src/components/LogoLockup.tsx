import React from 'react';
import {C} from '../tokens';
import {Triangle} from './Glyphs';

// Static lockup at (21, 24), 134 × 36. Never animates.
export const LogoLockup: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 21,
      top: 24,
      width: 134,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: C.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Triangle size={22} variant="gradient" />
    </div>
    <div
      style={{
        fontFamily: 'Geist',
        fontWeight: 500,
        fontSize: 19,
        letterSpacing: -0.4,
        color: C.white,
      }}
    >
      cogentiq
    </div>
  </div>
);
