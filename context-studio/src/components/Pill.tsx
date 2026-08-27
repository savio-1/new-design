import React from 'react';
import {TYPE} from '../tokens';

// The Trigger / Agent / Result label. Docked to the top edge of the card it
// labels, so only the top corners are rounded.
export const Pill: React.FC<{
  label: string;
  icon?: React.ReactNode;
  docked?: boolean;
}> = ({label, icon, docked = true}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 28,
      padding: '0 14px',
      borderRadius: docked ? '14px 14px 0 0' : 14,
      background: 'rgba(255,255,255,0.25)',
      backdropFilter: 'blur(12.5px)',
      WebkitBackdropFilter: 'blur(12.5px)',
      fontFamily: TYPE.pill.family,
      fontWeight: TYPE.pill.weight,
      fontSize: TYPE.pill.size,
      lineHeight: `${TYPE.pill.lineHeight}px`,
      letterSpacing: TYPE.pill.tracking,
      color: TYPE.pill.color,
      whiteSpace: 'nowrap',
    }}
  >
    {icon}
    {label}
  </div>
);
