/* The block glyphs — 24-unit line icons, drawn to one 1.9-stroke
   language. Placeholders in the same sense as the palette: swap the
   paths when brand icons exist. */
import React from 'react';

const P: Record<string, React.ReactNode> = {
  graph: (<>
    <circle cx="6" cy="6" r="2.6" /><circle cx="18" cy="7.5" r="2.6" /><circle cx="12" cy="18" r="2.6" />
    <path d="M8.2 7.2 15.6 8.6M7 8.4 11 15.7M16.8 9.9 13 15.8" />
  </>),
  book: (<>
    <path d="M12 6.2C9.6 4.8 6.8 4.8 4.4 6v12.4c2.4-1.2 5.2-1.2 7.6.2 2.4-1.4 5.2-1.4 7.6-.2V6c-2.4-1.2-5.2-1.2-7.6.2Z" />
    <path d="M12 6.4v12" />
  </>),
  plug: (<>
    <path d="M9 3.5V8M15 3.5V8" />
    <path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0V8Z" />
    <path d="M12 16.5v4" />
  </>),
  database: (<>
    <ellipse cx="12" cy="6" rx="7" ry="2.8" />
    <path d="M5 6v12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6" />
    <path d="M5 12c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8" />
  </>),
  quote: (<>
    <path d="M5 13.5c0-3.6 1.8-6.3 4.6-7.7l.9 1.5C8.8 8.4 7.9 9.7 7.7 11c1.5.1 2.6 1.2 2.6 2.7A2.65 2.65 0 0 1 7.6 16.5c-1.6 0-2.6-1.3-2.6-3Z" fill="currentColor" stroke="none" />
    <path d="M13.5 13.5c0-3.6 1.8-6.3 4.6-7.7l.9 1.5c-1.7 1.1-2.6 2.4-2.8 3.7 1.5.1 2.6 1.2 2.6 2.7a2.65 2.65 0 0 1-2.7 2.8c-1.6 0-2.6-1.3-2.6-3Z" fill="currentColor" stroke="none" />
  </>),
  branch: (<>
    <circle cx="6.5" cy="5.5" r="2.4" /><circle cx="6.5" cy="18.5" r="2.4" /><circle cx="17.5" cy="9" r="2.4" />
    <path d="M6.5 8v8M6.5 13c0-3 5-2.4 8.2-3.4" />
  </>),
  shield: (<>
    <path d="M12 3.2 18.6 6v5.6c0 4.3-2.8 7.2-6.6 8.6-3.8-1.4-6.6-4.3-6.6-8.6V6L12 3.2Z" />
    <path d="m9 11.6 2.2 2.2 3.9-4" />
  </>),
  agent: (<>
    <path d="M8 6.5V4.5h4M2.5 12.5h2M19.5 12.5h2M14.5 11v2M9.5 11v2" transform="translate(0 .5)" />
    <rect x="5" y="7" width="14" height="11" rx="2.4" />
  </>),
};

export const Glyph: React.FC<{ icon: string; size: number; color?: string; sw?: number }> = ({
  icon, size, color = '#fff', sw = 1.9,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    style={{ display: 'block', color }}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {P[icon] ?? P.graph}
  </svg>
);
