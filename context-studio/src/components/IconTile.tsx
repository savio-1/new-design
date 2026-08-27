import React from 'react';
import {C} from '../tokens';

// 45.76 white square, r12, holding a 28px logo. Used for the integration
// logos in beat 1 and the seven block icons on the orbit.
export const IconTile: React.FC<{children: React.ReactNode; size?: number}> = ({
  children,
  size = 45.76,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 12,
      background: C.white,
      boxShadow: '0px 4px 8px rgba(0,0,0,0.10)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

export const Monogram: React.FC<{text: string}> = ({text}) => (
  <div
    style={{
      fontFamily: 'Geist',
      fontWeight: 500,
      fontSize: text.length > 1 ? 15 : 20,
      letterSpacing: -0.5,
      color: C.ink,
    }}
  >
    {text}
  </div>
);
