/* Seed data and image constants. Swap these for real API responses;
   nothing below this file reads anything else. */

/* ════════════════════════════════════════════════════════════════════
   THE AGENT MARKS
   The product's own icon set, embedded so the page carries no external
   requests. Two glyphs — one agent, and the node tree an orchestrator
   is — across seven hues. Each is a 96px tile drawn for a 40px slot,
   so it stays sharp on a retina screen.

   Grey at rest and full colour on hover is done in CSS with a
   grayscale filter rather than by shipping two sets: one asset, one
   transition, and the two states can never drift apart.
   ════════════════════════════════════════════════════════════════════ */
const HUES = ['blue', 'purple', 'pink', 'cyan', 'indigo', 'orange', 'green'];
const MARK = {
 single: {
  blue: 'assets/marks/single-blue.png',
  purple: 'assets/marks/single-purple.png',
  pink: 'assets/marks/single-pink.png',
  cyan: 'assets/marks/single-cyan.png',
  indigo: 'assets/marks/single-indigo.png',
  orange: 'assets/marks/single-orange.png',
  green: 'assets/marks/single-green.png'
 },
 orch: {
  blue: 'assets/marks/orch-blue.png',
  purple: 'assets/marks/orch-purple.png',
  pink: 'assets/marks/orch-pink.png',
  cyan: 'assets/marks/orch-cyan.png',
  indigo: 'assets/marks/orch-indigo.png',
  orange: 'assets/marks/orch-orange.png',
  green: 'assets/marks/orch-green.png'
 },
};

/* A hue per agent, derived from its name rather than stored, so a card
   keeps its colour between renders and two people never see a different
   wall. Remote agents take the single glyph — hosted elsewhere is where
   it runs, not what it is. */
function markFor(a) {
  let h = 0;
  for (const ch of a.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MARK[a.type === 'orchestrator' ? 'orch' : 'single'][HUES[h % HUES.length]];
}

/* ════════════════════════════════════════════════════════════════════
   MODEL PROVIDER MARKS
   Taken from the Model hub, so a model reads the same wherever it is
   named. Each mark is a share of its slot — the fraction the Figma
   component gives it — centred in the tile by .ag-model.
   ════════════════════════════════════════════════════════════════════ */
const LOGO_SRC = {
  claude: "assets/logos/claude.png",
  gemini: "assets/logos/gemini.png",
  azure: "assets/logos/azure.png",
  mistral: "assets/logos/mistral.png"
};

const LOGO_GEOM = {
  gemini:  { w: 0.80, ratio: 1 },
  claude:  { w: 0.80, ratio: 1 },
  openai:  { w: 0.80, ratio: 1 },
  azure:   { w: 0.70, ratio: 1 },
  mistral: { w: 0.90, ratio: 903 / 1280 }
};
/* Which mark a model wears, matched on the family rather than the exact
   name — a version bump should not silently drop the logo. */
const MODEL_LOGO = [
  [/^gpt|^o[134]\b/i, 'openai'], [/claude/i, 'claude'], [/gemini/i, 'gemini'],
  [/azure/i, 'azure'], [/mistral|mixtral/i, 'mistral']
];
const logoOf = model => (MODEL_LOGO.find(([re]) => re.test(model)) || [])[1] || null;

function logoHTML(logo, slot) {
  const g = LOGO_GEOM[logo];
  if (!g) return '';
  const size = `width:${(slot * g.w).toFixed(2)}px;height:${(slot * g.w * g.ratio).toFixed(2)}px`;
  return logo === 'openai'
    ? `<svg viewBox="0 0 12.6261 12.8" style="${size};color:var(--logo-openai)"><use href="#ic-openai"/></svg>`
    : `<img src="${LOGO_SRC[logo]}" alt="" style="${size}">`;
}

/* ════════════════════════════════════════════════════════════════════
   TYPES
   Three, and the difference is what a thing does to other agents: an
   orchestrator commands them, an agent stands on its own, and a remote
   agent is either of those running on somebody else's machine. Remote
   is a type here rather than a second axis because that is how the
   sidebar asks the question.
   ════════════════════════════════════════════════════════════════════ */
const TYPE = {
  agent:        { label: 'Agent',        ic: 'ic-pp_agent', tone: 'blue' },
  orchestrator: { label: 'Orchestrator', ic: 'i-orch',      tone: 'indigo' },
  remote:       { label: 'Remote',       ic: 'i-globe',     tone: 'cyan' }
};
const STATE = {
  running: { label: 'Running',  tone: 'green' },
  idle:    { label: 'Idle',     tone: 'grey' },
  review:  { label: 'In review', tone: 'orange' },
  error:   { label: 'Failing',  tone: 'red' },
  draft:   { label: 'Draft',    tone: 'grey' }
};
/* Category tags take a tone from the tag itself, so one subject reads
   the same colour on every card it appears on. */
const TAG_TONE = {
  documents: 'blue', data: 'cyan', 'supply-chain': 'indigo', pricing: 'light-green',
  ops: 'green', azure: 'blue', api: 'indigo', risk: 'blue', research: 'cyan',
  legal: 'indigo', enrichment: 'green', finance: 'light-green'
};
const tone = t => TAG_TONE[t] || 'blue';

const AUTHS = ['API key (Bearer)', 'OAuth 2.0', 'mTLS', 'Basic auth', 'None'];

/* ════════════════════════════════════════════════════════════════════
   A2A SERVERS
   A server is a host that publishes Agent Cards — the descriptors at
   /.well-known/agents/<name>.json saying what an agent is called, what
   it can do, and how to authenticate against it.
   ════════════════════════════════════════════════════════════════════ */
let SERVERS = [
  { id: 'srv1', name: 'Acme Bank A2A', url: 'agents.acmebank.com/a2a', updated: '2d ago', cards: [
    { name: 'Fraud Signals', desc: 'Scores transactions for fraud patterns and explains the risk.', skills: ['fraud.score', 'fraud.explain'], auth: 'API key (Bearer)', path: '/.well-known/agents/fraud-signals.json' },
    { name: 'KYC Verifier', desc: 'Identity, PEP and sanctions screening for a customer.', skills: ['kyc.verify'], auth: 'OAuth 2.0', path: '/.well-known/agents/kyc-verifier.json' },
    { name: 'Dispute Assistant', desc: 'Drafts chargeback and dispute resolutions.', skills: ['dispute.draft'], auth: 'API key (Bearer)', path: '/.well-known/agents/dispute-assistant.json' },
    { name: 'Statement Summarizer', desc: 'Summarizes account statements into highlights.', skills: ['stmt.summarize'], auth: 'None', path: '/.well-known/agents/statement-summarizer.json' }
  ] },
  { id: 'srv2', name: 'Nova AI Research', url: 'a2a.nova-ai.io', updated: '5d ago', cards: [
    { name: 'Market Research', desc: 'Synthesizes competitive intel and category trends on demand.', skills: ['research.market'], auth: 'OAuth 2.0', path: '/.well-known/agents/market-research.json' },
    { name: 'Patent Scout', desc: 'Finds and clusters prior art across patent corpora.', skills: ['patent.search'], auth: 'OAuth 2.0', path: '/.well-known/agents/patent-scout.json' }
  ] },
  { id: 'srv0', name: 'Cogentiq Managed A2A', url: 'a2a.cogentiq.io/managed', updated: 'always on', managed: true, cards: [
    { name: 'Weather Intelligence', desc: 'REST weather service, adapted and served as A2A.', skills: ['weather.forecast'], auth: 'API key (Bearer)', path: '/.well-known/agents/weather-intelligence.json' },
    { name: 'Legal Clause Lookup', desc: 'Clause retrieval over a REST corpus, adapted to A2A.', skills: ['clause.lookup'], auth: 'API key (Bearer)', path: '/.well-known/agents/legal-clause-lookup.json' }
  ] }
];

/* What a fresh server returns on discovery. In the product this is the
   live response; here it is fixed, so everything after "Discover"
   behaves exactly as it would against a real host. */
const DISCO = [
  { name: 'Fraud Signals', desc: 'Scores transactions for fraud patterns and explains the risk.', skills: ['fraud.score'], auth: 'API key (Bearer)', path: '/.well-known/agents/fraud-signals.json' },
  { name: 'KYC Verifier', desc: 'Identity, PEP and sanctions screening for a customer.', skills: ['kyc.verify'], auth: 'OAuth 2.0', path: '/.well-known/agents/kyc-verifier.json' },
  { name: 'Dispute Assistant', desc: 'Drafts chargeback and dispute resolutions.', skills: ['dispute.draft'], auth: 'API key (Bearer)', path: '/.well-known/agents/dispute-assistant.json' },
  { name: 'Statement Summarizer', desc: 'Summarizes account statements into highlights.', skills: ['stmt.summarize'], auth: 'None', path: '/.well-known/agents/statement-summarizer.json' }
];

/* The operations a REST service exposes, read off its OpenAPI document.
   Each one taken becomes a skill on the Agent Card Cogentiq generates. */
const REST_OPS = [
  { op: 'GET /forecast/{city}',   skill: 'weather.forecast', desc: 'Ten-day forecast for a named city.' },
  { op: 'GET /current/{city}',    skill: 'weather.current',  desc: 'Current conditions and observations.' },
  { op: 'GET /alerts',            skill: 'weather.alerts',   desc: 'Active severe-weather alerts by region.' },
  { op: 'POST /historical/query', skill: 'weather.history',  desc: 'Historical series for a place and range.' }
];

/* Integrations the workspace already holds. An integration is an address
   plus a credential, registered once and reused by every agent that
   points at it — so connecting directly is picking one, not retyping it. */
let INTEGRATIONS = [
  { id: 'i1', name: 'Acme Claims Agent', url: 'https://agents.acme.internal:8443',
    desc: 'Assess a claim and assign a severity band.', auth: 'Bearer token', timeout: 60,
    skills: ['claims.triage'], method: 'POST', path: '/v1/chat', msg: '$.query', resp: '$.answer' },
  { id: 'i2', name: 'Northwind Pricing', url: 'https://pricing.northwind.io',
    desc: 'Price a basket of SKUs for a named account.', auth: 'API key', timeout: 30,
    skills: ['pricing.quote'], method: 'POST', path: '/quote', msg: '$.input', resp: '$.result' },
  { id: 'i3', name: 'Ledger Core', url: 'https://ledger.fin.internal/v2',
    desc: 'Return the posted balance for an account and period.', auth: 'mTLS (client certificate)', timeout: 45,
    skills: ['ledger.balance'], method: 'GET', path: '/balance', msg: '$.q', resp: '$.balance' },
  { id: 'i4', name: 'Partner Sandbox', url: 'https://sandbox.partner.dev',
    desc: 'Returns whatever it is sent, for wiring checks.', auth: 'None', timeout: 60,
    skills: ['sandbox.echo'], method: 'POST', path: '/echo', msg: '$.text', resp: '$.text' }
];

const mem = (name, role, remote) => ({ name, role, remote: !!remote });

/* ════════════════════════════════════════════════════════════════════
   THE INVENTORY
   A workspace agent carries a model and what is bound to it; a remote
   one carries the endpoint, the protocol and the server it came from.
   ════════════════════════════════════════════════════════════════════ */
let AGENTS = [
  { name: 'Country Rate Checker', type: 'agent', state: 'running',
    desc: 'Checks the rates we quote in each country against the approved price list and flags anything that has drifted.',
    model: 'GPT-4o mini', tools: 1, skills: 2, guards: 1, by: 'Priya Nair', tags: ['pricing'], updated: '18m ago', runs: 412,
    parent: 'Spare Parts Stock Planner' },

  { name: 'Spare Parts Stock Planner', type: 'agent', state: 'running',
    desc: 'Works out how many of each spare part to keep on the shelf so orders get filled without tying up cash in stock.',
    model: 'Claude 3.5 Sonnet', tools: 2, skills: 3, guards: 0, by: 'Rahul Menon', tags: ['supply-chain'], updated: '2h ago', runs: 1284 },

  { name: 'Returns Note Reader', type: 'agent', state: 'error',
    desc: 'Reads handwritten returns notes and pulls out the order number and reason. Not working — its model is unreachable.',
    model: '—', tools: 0, skills: 0, guards: 0, by: 'Marcus Lee', tags: [], updated: '3d ago', runs: 0,
    problem: 'The model this agent uses has been returning errors since 6 March, and no tools have been connected to it yet.' },

  { name: 'Spreadsheet Reader', type: 'agent', state: 'idle',
    desc: 'Opens a CSV or spreadsheet, works out what each column holds, and hands back clean rows anything else can use.',
    model: 'GPT-4o mini', tools: 1, skills: 1, guards: 0, by: 'Anna Park', tags: ['data'], updated: '1d ago', runs: 96 },

  { name: 'Document Sorter', type: 'agent', state: 'running',
    desc: 'Sorts incoming documents into the right category — invoice, contract, claim — and says how sure it is about each one.',
    model: 'GPT-4o', tools: 1, skills: 2, guards: 1, by: 'Sarah Chen', tags: ['documents'], updated: '42m ago', runs: 2140 },

  { name: 'Invoice Field Extractor', type: 'agent', state: 'running',
    desc: 'Pulls supplier, date, line items and totals out of scanned invoices and puts them into the same shape every time.',
    model: 'GPT-4o', tools: 2, skills: 3, guards: 1, by: 'Sarah Chen', tags: ['documents', 'azure'], updated: '1h ago', runs: 870 },

  { name: 'Data Clean-Up Crew', type: 'orchestrator', state: 'running',
    desc: 'Cleans a messy dataset by handing it to a filter agent and a checker, then reconciling what the two send back.',
    model: 'GPT-4o', tools: 0, skills: 1, guards: 2, by: 'Anna Park', tags: ['data'], updated: '20m ago', runs: 318,
    members: [mem('Row Filter', 'Drops rows that fail the rules'), mem('Column Checker', 'Catches wrong types and out-of-range values')] },

  { name: 'Row Filter', type: 'agent', state: 'idle',
    desc: 'Goes through a dataset row by row and keeps only the ones that match the rules it was given.',
    model: 'GPT-4o mini', tools: 1, skills: 1, guards: 0, by: 'Anna Park', tags: ['data'], updated: '20m ago', runs: 318,
    parent: 'Data Clean-Up Crew' },

  { name: 'Claims Intake Desk', type: 'orchestrator', state: 'review',
    desc: 'Takes whatever a claim arrives as — a PDF, an email, an API response — and sends each part to the agent that handles it.',
    model: 'Claude 3.5 Sonnet', tools: 1, skills: 2, guards: 1, by: 'Mike Torres', tags: ['documents', 'api'], updated: '4h ago', runs: 54,
    members: [mem('Invoice Field Extractor', 'Reads the attached documents'),
              mem('API Response Reader', 'Tidies up data from other systems'),
              mem('Market Research Assistant', 'Adds outside context', true)] },

  { name: 'API Response Reader', type: 'agent', state: 'running',
    desc: 'Takes the raw reply from another system and turns it into fields with names a person would recognise.',
    model: 'GPT-4o', tools: 3, skills: 2, guards: 1, by: 'Sarah Chen', tags: ['api'], updated: '4h ago', runs: 612,
    parent: 'Claims Intake Desk' },

  { name: 'Results Table Builder', type: 'agent', state: 'draft',
    desc: 'Lays out whatever data it is handed as a readable table, with sensible headings and totals. Still a draft.',
    model: 'GPT-4o mini', tools: 0, skills: 1, guards: 0, by: 'Marcus Lee', tags: [], updated: '6d ago', runs: 0 },

  { name: 'Error Log Investigator', type: 'agent', state: 'running',
    desc: 'Reads through error logs, spots what is unusual, works out how serious it is and explains the likely cause.',
    model: 'Claude 3.5 Sonnet', tools: 2, skills: 3, guards: 2, by: 'Elena Vogt', tags: ['ops'], updated: '9m ago', runs: 4820 },

  /* ── Registered from outside ── */
  { name: 'Fraud Risk Scorer', type: 'remote', conn: 'a2a', state: 'running',
    desc: 'Acme Bank\u2019s own agent. Give it a transaction and it tells you how risky it looks, and why.',
    endpoint: 'agents.acmebank.com/a2a', server: 'Acme Bank A2A', auth: 'API key (Bearer)',
    cards: ['Fraud Signals'], agentSkills: ['fraud.score', 'fraud.explain'],
    by: 'Acme Bank', tags: ['risk'], updated: '30m ago', runs: 9240 },

  { name: 'Market Research Assistant', type: 'remote', conn: 'a2a', state: 'idle',
    desc: 'Nova AI\u2019s research agent. Ask it about a market or a competitor and it comes back with a written summary.',
    endpoint: 'a2a.nova-ai.io/research', server: 'Nova AI Research', auth: 'OAuth 2.0',
    cards: ['Market Research'], agentSkills: ['research.market'],
    by: 'Nova AI', tags: ['research'], updated: '2d ago', runs: 188 },

  { name: 'Weather Lookup', type: 'remote', conn: 'rest', state: 'running',
    desc: 'A weather service we buy in. It was a plain API, so Cogentiq wrapped it up as an agent anything here can talk to.',
    endpoint: 'api.weatherco.com/v2', server: 'Cogentiq Managed A2A', auth: 'API key (Bearer)',
    cards: ['Weather Intelligence'], agentSkills: ['weather.forecast', 'weather.current'],
    by: 'WeatherCo', tags: ['enrichment'], updated: '4h ago', runs: 1520 },

  { name: 'Contract Clause Finder', type: 'remote', conn: 'rest', state: 'review',
    desc: 'Searches LawStack\u2019s clause library and returns the wording that matches. Waiting on approval before it can be used.',
    endpoint: 'api.lawstack.io/clauses', server: 'Cogentiq Managed A2A', auth: 'API key (Bearer)',
    cards: ['Legal Clause Lookup'], agentSkills: ['clause.lookup'],
    by: 'LawStack', tags: ['legal'], updated: '6d ago', runs: 0 },

  { name: 'Delivery Tracker', type: 'remote', conn: 'rest', state: 'error',
    desc: 'Looks up where a shipment has got to. Currently failing — the courier is rejecting our key.',
    endpoint: 'track.shipfast.com/api', server: 'Cogentiq Managed A2A', auth: 'API key (Bearer)',
    cards: ['Logistics Tracker'], agentSkills: ['shipment.track'],
    by: 'ShipFast', tags: ['supply-chain'], updated: '1d ago', runs: 76,
    problem: 'The last twelve calls were refused by ShipFast. The stored API key has most likely been rotated at their end.' }
];

/* Agents published to the org marketplace — the other side of a
   workspace agent's "Publish" action. Not installed here until added. */
const MARKET = [
  { name: 'Contract Risk Reviewer', type: 'agent', state: 'idle',
    desc: 'Reads a contract and points out the terms that differ from what we normally accept, with the clause to look at.',
    model: 'Claude 3.5 Sonnet', tools: 3, skills: 4, guards: 2, by: 'Legal Ops', tags: ['legal', 'documents'], updated: '3d ago', runs: 0, installs: 42 },
  { name: 'Unusual Spend Spotter', type: 'agent', state: 'idle',
    desc: 'Watches what the company spends and raises the payments that do not look like the usual pattern, with a reason.',
    model: 'GPT-4o', tools: 2, skills: 2, guards: 1, by: 'Finance Guild', tags: ['finance'], updated: '1w ago', runs: 0, installs: 118 },
  { name: 'Supplier Problem Room', type: 'orchestrator', state: 'idle',
    desc: 'When a supplier is late or a route is blocked, it pulls together what happened, what to do, and a note to send them.',
    model: 'GPT-4o', tools: 1, skills: 3, guards: 2, by: 'Supply Chain CoE', tags: ['supply-chain', 'ops'], updated: '2w ago', runs: 0, installs: 67,
    members: [mem('Disruption Watch', 'Notices when something has gone wrong'),
              mem('Route Planner', 'Works out the way around it'),
              mem('Supplier Note Writer', 'Drafts the message to send')] },
  { name: 'Support Ticket Sorter', type: 'agent', state: 'idle',
    desc: 'Reads a new support ticket, decides how urgent it is and sends it to the team that should be handling it.',
    model: 'GPT-4o mini', tools: 2, skills: 2, guards: 1, by: 'Support Guild', tags: ['ops'], updated: '4d ago', runs: 0, installs: 203 },
  { name: 'Invoice Matcher', type: 'agent', state: 'idle',
    desc: 'Checks an invoice against the order and the delivery note, and escalates the ones that do not line up.',
    model: 'GPT-4o mini', tools: 3, skills: 2, guards: 1, by: 'Finance Guild', tags: ['finance', 'documents'], updated: '5d ago', runs: 0, installs: 91 },
  { name: 'Prior Art Finder', type: 'remote', conn: 'a2a', state: 'idle',
    desc: 'Nova AI\u2019s patent agent, ready to connect. Give it an idea and it finds the existing patents closest to it.',
    endpoint: 'a2a.nova-ai.io/patents', server: 'Nova AI Research', auth: 'OAuth 2.0',
    cards: ['Patent Scout'], agentSkills: ['patent.search'],
    by: 'Nova AI', tags: ['research'], updated: '1w ago', runs: 0, installs: 24 }
];

/* ════════════════════════════════════════════════════════════════════
   CARD — the library's .cq-card, composed as the Model hub composes it:
   a logo tile beside the name, one line of description, then the tags
   against the owner.
   ════════════════════════════════════════════════════════════════════ */
const badge = (t, text, glyph) => `<span class="cq-badge" data-tone="${t}">${glyph ? ic(glyph, 11) : ''}${esc(text)}</span>`;

/* Only the two kinds that are not the default wear a badge. Sixteen
   cards each saying "Agent" tells nobody anything. */
const typeBadge = a => a.type === 'agent' ? '' : badge(TYPE[a.type].tone, TYPE[a.type].label, TYPE[a.type].ic);

/* ── What the agent brings ──
   The model it thinks with, and how much is wired to it. A model's name
   is a string most people cannot place; its mark they can. The counts
   sit beside it because "three tools" is the question somebody actually
   has about an agent they are about to hand work to.

   A remote agent has no model of its own — it is somebody else's — so it
   says how Cogentiq reaches it instead. */
function capsHTML(a) {
  if (a.type === 'remote') {
    const connLabel = a.conn === 'rest' ? 'Hosted API' : a.conn === 'direct' ? 'Direct connect' : 'A2A agent';
    return `<span class="ag-cap ag-cap--text" title="${esc(a.endpoint)}">${connLabel}</span>` +
      (a.agentSkills && a.agentSkills.length
        ? `<span class="ag-cap" title="${a.agentSkills.length} skill${a.agentSkills.length > 1 ? 's' : ''}">${ic('ic-pp_skill', 14)}${a.agentSkills.length}</span>` : '');
  }
  const logo = logoOf(a.model);
  const out = [logo
    ? `<span class="ag-cap ag-cap--logo" title="${esc(a.model)}">${logoHTML(logo, 18)}</span>`
    : `<span class="ag-cap ag-cap--text" title="${esc(a.model)}">${esc(a.model === '—' ? 'No model' : a.model)}</span>`];
  if (a.tools)  out.push(`<span class="ag-cap" title="${a.tools} tool${a.tools > 1 ? 's' : ''}">${ic('i-wrench', 14)}${a.tools}</span>`);
  if (a.skills) out.push(`<span class="ag-cap" title="${a.skills} skill${a.skills > 1 ? 's' : ''}">${ic('ic-pp_skill', 14)}${a.skills}</span>`);
  if (a.guards) out.push(`<span class="ag-cap" title="${a.guards} guardrail${a.guards > 1 ? 's' : ''}">${ic('ic-pp_guardrails', 14)}${a.guards}</span>`);
  return out.join('');
}

function cardHTML(a, i) {
  const s = STATE[a.state];
  const market = state.src === 'marketplace';
  return `
  <article class="cq-card ag-card cq-tint" tabindex="0" role="button" data-i="${i}"
           aria-label="${esc(a.name)} — open details">
    <span class="ag-card__top">
      <img class="ag-mark" src="${markFor(a)}" alt="" width="32" height="32" />
      <span class="ag-card__name cq-body1-med" title="${esc(a.name)}">${esc(a.name)}</span>
      <span class="ag-badges">${typeBadge(a)}</span>
    </span>
    <span class="ag-card__desc" title="${esc(a.desc)}">${esc(a.desc)}</span>
    <span class="ag-card__foot">
      <span class="ag-card__tags">${capsHTML(a)}</span>
      <span class="ag-card__end">
        ${market
          ? `<span class="cq-tag">${a.installs} installs</span>`
          : `<span class="cq-status" data-tone="${s.tone}"><span class="cq-status--dot"></span>${s.label}</span>`}
        <span class="cq-avatar" title="${esc(a.by)}">${initial(a.by)}</span>
        <button class="cq-icon-btn cq-icon-btn--sm" data-more="1" aria-label="Options for ${esc(a.name)}">
          ${ic('i-dots', 16)}
        </button>
      </span>
    </span>
  </article>`;
}

/* ── Table view — the same inventory, one row deep ── */
function rowHTML(a, i) {
  const s = STATE[a.state];
  const mid = a.type === 'remote' ? a.endpoint : (a.model === '—' ? 'Not configured' : a.model);
  return `
  <div class="cq-row cq-tint" tabindex="0" role="button" data-i="${i}" aria-label="${esc(a.name)}">
    <div class="cq-cell">
      <img class="ag-row-mark" src="${markFor(a)}" alt="" width="28" height="28" />
      <span class="ag-row__name">
        <span class="nm"><span class="cq-body2-med cq-truncate">${esc(a.name)}</span></span>
        <span class="ag-row__desc cq-caption-reg cq-truncate" title="${esc(a.desc)}">${esc(a.desc)}</span>
      </span>
    </div>
    <div class="cq-cell">${badge(TYPE[a.type].tone, TYPE[a.type].label)}</div>
    <div class="cq-cell ag-cell--mono"><span title="${esc(mid)}">${esc(mid)}</span></div>
    <div class="cq-cell">
      <span class="cq-avatar">${initial(a.by)}</span>
      <span class="cq-body2-reg cq-truncate">${esc(a.by)}</span>
    </div>
    <div class="cq-cell">
      ${state.src === 'marketplace'
        ? `<span class="cq-tag">${a.installs} installs</span>`
        : `<span class="cq-status" data-tone="${s.tone}"><span class="cq-status--dot"></span>${s.label}</span>`}
    </div>
    <div class="cq-cell ag-cell--end">
      <button class="cq-icon-btn cq-icon-btn--sm" data-more="1" aria-label="Options for ${esc(a.name)}">${ic('i-dots', 16)}</button>
    </div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   STATE + RENDER
   ════════════════════════════════════════════════════════════════════ */
