/* ══ Design tokens ════════════════════════════════════════════════
   The single re-skin point. Values are the Cogentiq design system's
   own (see platform-panel.html, tokens section): the light theme for
   the statement field, the dark theme's ground for the close, and the
   palette ramps — identical in both product themes — for the accents.
   Change a colour here and it changes everywhere. */

export const C = {
  bgLight:  '#fafafa',   // backgrounds/page-bg-1 · light
  bgDark:   '#121212',   // backgrounds/page-bg-1 · dark
  ink:      '#121212',   // text/primary · light
  inkSoft:  '#8c8c8c',   // text/teritiary · light (spelling per Figma)
  stroke:   '#121212',   // badge outlines — 6px at 1080
  cardBg:   '#ffffff',
  cardEdge: '#eeeeee',   // strokes/card-default · light
  accent:   '#0d99ff',   // blue-500 · the product's primary
  white:    '#ffffff',
};

/* One accent per building block. Order is fixed and used everywhere —
   the tiles, the converge, the bundle dots and the attach all index
   into this array, so they cannot disagree about what exists.
   Accents are the Cogentiq ramps. Two purples sit at the ends the way
   the reference palette also carried two violets; every neighbour pair
   is distinct, which is what the row of dots needs. */
export const BLOCKS = [
  { id: 'ontology', label: 'Ontology',     desc: 'entities and how they relate', accent: '#9747ff', icon: 'graph'    }, // purple-500
  { id: 'glossary', label: 'Glossary',     desc: 'what your terms actually mean', accent: '#00a2c2', icon: 'book'    }, // coloured-cyan
  { id: 'tools',    label: 'Tool Binding', desc: 'the systems it can act in',    accent: '#fc9e24', icon: 'plug'     }, // orange-600
  { id: 'data',     label: 'Data Binding', desc: 'the sources it can read',      accent: '#0d99ff', icon: 'database' }, // blue-500
  { id: 'prompts',  label: 'Prompts',      desc: 'reusable instructions',        accent: '#5860ed', icon: 'quote'    }, // indigo-500
  { id: 'rules',    label: 'Rules',        desc: 'how decisions get made',       accent: '#14ae5c', icon: 'branch'   }, // green-500
  { id: 'policies', label: 'Policies',     desc: 'what it must never do',        accent: '#8638e5', icon: 'shield'   }, // purple-600
] as const;

export type Block = (typeof BLOCKS)[number];
