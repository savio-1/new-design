// Storyboard v4 tokens (§3). Option A — Dawn: dark throughout, the field
// lifts to deep periwinkle with a mint bloom over the last four seconds.
export const FIELD = {
  darkTop: '#0E1120', // measured off Frame 1
  darkBottom: '#0A0C18',
  dawnTop: '#1A2145', // Option A, beats 5–6
  dawnBottom: '#101833',
  mint: '#7FE3C8', // the lower-left bloom in Frame 5
};

export const TEXT = {
  family: 'Geist',
  weight: 400,
  size: 0.0205, // × frame width → 39px at 1920
  tracking: '-0.005em',
  onDark: 'rgba(255,255,255,0.95)',
  onLight: '#101014',
};

// The seven. Two-tone gradients per the reference's sphere treatment —
// blue-dominant with exactly one warm accent (Policies).
export type SphereSpec = {id: string; label: string; from: string; to: string; angle: number};

export const SPHERES: SphereSpec[] = [
  {id: 'ontology', label: 'Ontology', from: '#2B6BFF', to: '#7B5CF0', angle: 145},
  {id: 'glossary', label: 'Glossary', from: '#0D99FF', to: '#9AD4FF', angle: 20},
  {id: 'tools', label: 'Tools', from: '#5860ED', to: '#C6B8FF', angle: 200},
  {id: 'prompts', label: 'Prompts', from: '#3AA6C9', to: '#8FE3D8', angle: 65},
  {id: 'rules', label: 'Rules', from: '#6C4BE8', to: '#E0A8FF', angle: 170},
  {id: 'policies', label: 'Policies', from: '#F27A3D', to: '#FFC98A', angle: 40},
  {id: 'data', label: 'Data', from: '#2F7BE8', to: '#DCEBFF', angle: 120},
];

export const CORE_HUE = {from: '#7FB4FF', rim: 'rgba(210,240,255,0.95)'};
