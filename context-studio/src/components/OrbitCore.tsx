import React from 'react';
import {C} from '../tokens';
import {Triangle} from './Glyphs';

// Frosted circle, 70 units, holding the cogentiq triangle. Positioned by the
// parent at (269, 351).
export const OrbitCore: React.FC<{size?: number}> = ({size = 70}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.25)',
      backdropFilter: 'blur(12.5px)',
      WebkitBackdropFilter: 'blur(12.5px)',
      boxShadow: '0px 8px 12px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Triangle size={size * 0.5} color={C.white} variant="outline" />
  </div>
);
