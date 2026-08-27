// The seven context blocks, in fixed order (§8 beat 2).
export type Block = {name: string; desc: string};

export const BLOCKS: Block[] = [
  {name: 'Ontology', desc: 'Defines your entities and how they relate'},
  {name: 'Glossary', desc: 'Fixes what every business term means'},
  {name: 'Tool Binding', desc: 'Connects the systems the agent can act in'},
  {name: 'Data Binding', desc: "Wires up the sources it's allowed to read"},
  {name: 'Prompts', desc: 'Reusable instructions for consistent behaviour'},
  {name: 'Rules', desc: 'Encodes how decisions get made'},
  {name: 'Policies', desc: 'Sets the limits it must never cross'},
];
