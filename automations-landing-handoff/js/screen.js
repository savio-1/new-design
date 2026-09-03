/* Generated from automations-landing.html — screen logic: data, render,
   filters, popovers, lens switching, detail panel, theme. */
const root = document.documentElement;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const inShell = window.parent !== window;
function go(url) {
  if (inShell) parent.postMessage({ cqNav: url }, '*');
  else window.location.href = url;
}

/* ════════════════════════════════════════════════════════════════════
   STEP KINDS
   A step's kind decides its icon and its tone, so the same kind reads
   the same everywhere it appears — card strip, list row, panel rail.
   Checkpoints are the one kind that carries a fill of its own, because
   they are the thing this page's second tab is about.
   ════════════════════════════════════════════════════════════════════ */
const KIND = {
  trigger:    { ic: '#i-bolt',    tone: 'blue',   name: 'Trigger' },
  schedule:   { ic: '#i-clock',   tone: 'blue',   name: 'Schedule' },
  email:      { ic: '#i-mail',    tone: 'blue',   name: 'Trigger' },
  webhook:    { ic: '#i-api',     tone: 'blue',   name: 'Webhook' },
  model:      { ic: '#i-spark',   tone: 'indigo', name: 'Model' },
  agent:      { ic: '#ic-pp_agent', tone: 'indigo', name: 'Agent' },
  tool:       { ic: '#i-gears',   tone: 'cyan',   name: 'Tool' },
  data:       { ic: '#i-db',      tone: 'cyan',   name: 'Data' },
  sync:       { ic: '#i-refresh', tone: 'cyan',   name: 'Sync' },
  branch:     { ic: '#i-branch',  tone: 'purple', name: 'Decision' },
  guard:      { ic: '#ic-pp_guardrails', tone: 'purple', name: 'Guardrail' },
  checkpoint: { ic: '#i-shield',  tone: 'orange', name: 'Human checkpoint' },
  action:     { ic: '#i-extlink', tone: 'green',  name: 'Action' },
  notify:     { ic: '#i-chat',    tone: 'green',  name: 'Notify' },
  doc:        { ic: '#i-doc',     tone: 'grey',   name: 'Document' }
};

/* Avatars carry a single letter — the name sits beside them wherever one
   is shown, so a second initial only crowded a 20px circle. Derived from
   the name rather than stored, so the two can never disagree.

   They also carry one colour rather than a per-person palette: a hue that
   means nothing is just noise on a wall of cards. .cq-avatar's own default
   is Indigo/500, so there is nothing to set — the overrides came off. */
const initial = name => String(name).trim().charAt(0).toUpperCase();

/* ════════════════════════════════════════════════════════════════════
   THE INVENTORY
   `steps` is the automation, in order — the card previews the first
   three of them and the panel shows the rest. `pending` is how many of
   this automation's checkpoint runs are sitting in the approvals tab;
   the fifteen of them add up to the 12 that tab counts.
   ════════════════════════════════════════════════════════════════════ */
const AUTOS = [
  {
    name: 'Invoice Extraction Pipeline', type: 'Live',
    desc: 'Reads supplier invoices out of the AP inbox, pulls line items and totals, and posts the approved ones to NetSuite.',
    status: 'Active', hue: 'var(--text-coloured-indigo)', pending: 5,
    trigger: 'Email received · AP inbox', schedule: 'On arrival',
    by: 'Sarah Chen', tags: ['finance'], runs: 1284, ok: 98.2,
    avg: '1m 12s', cost: '$0.06', last: '7m ago', lastN: 7, created: 'Mar 4, 2026', version: 'v14',
    steps: [
      { k: 'email',      l: 'Invoice in',     s: 'ap@acme.co' },
      { k: 'model',      l: 'Extract fields', s: 'gpt-4o ocr' },
      { k: 'tool',       l: 'Match to PO',    s: 'netsuite' },
      { k: 'branch',     l: 'Over $10k?',     s: 'amount gate' },
      { k: 'checkpoint', l: 'Finance OK',     s: 'ap controllers' },
      { k: 'action',     l: 'Post to ERP',    s: 'create bill' }
    ]
  },
  {
    name: 'Customer Onboarding', type: 'Live',
    desc: 'Takes a signed order through provisioning, welcome mail and the first success check-in, pausing once for account review.',
    status: 'Active', hue: 'var(--text-coloured-blue)', pending: 4,
    trigger: 'Webhook · Salesforce opportunity won', schedule: 'On event',
    by: 'Mike Torres', tags: ['crm', 'onboarding'], runs: 412, ok: 96.8,
    avg: '4m 05s', cost: '$0.21', last: '14m ago', lastN: 14, created: 'Jan 18, 2026', version: 'v27',
    steps: [
      { k: 'webhook',    l: 'Deal won',       s: 'salesforce' },
      { k: 'data',       l: 'Build account',  s: 'postgres' },
      { k: 'agent',      l: 'Draft welcome',  s: 'onboarding' },
      { k: 'checkpoint', l: 'CS review',      s: 'success team' },
      { k: 'notify',     l: 'Send welcome',   s: 'sendgrid' },
      { k: 'sync',       l: 'Sync HubSpot',   s: 'contacts' },
      { k: 'schedule',   l: 'Day-7 nudge',    s: '+7 days' }
    ]
  },
  {
    name: 'Data Pipeline Sync', type: 'Job',
    desc: 'Hourly warehouse sync — pulls the source deltas, validates the schema, and lands them in Snowflake.',
    status: 'Active', hue: 'var(--text-coloured-cyan)', pending: 0,
    trigger: 'Schedule · hourly', schedule: 'Every hour, :05',
    by: 'Anna Park', tags: [], runs: 168, ok: 99.4,
    avg: '5m 12s', cost: '$1.23', last: '31m ago', lastN: 31, created: 'Nov 2, 2025', version: 'v9',
    steps: [
      { k: 'schedule', l: 'Hourly run',     s: 'cron 5 * *' },
      { k: 'data',     l: 'Pull deltas',    s: '6 sources' },
      { k: 'guard',    l: 'Schema check',   s: 'strict' },
      { k: 'action',   l: 'Land data',      s: 'snowflake' }
    ]
  },
  {
    name: 'Contract Review Agent', type: 'Live',
    desc: 'Reads an inbound contract against the playbook, flags non-standard clauses, and routes anything material to legal.',
    status: 'Active', hue: 'var(--purple-450)', pending: 3,
    trigger: 'Doc store · new file in /contracts', schedule: 'On upload',
    by: 'Priya Nair', tags: ['legal'], runs: 96, ok: 94.7,
    avg: '2m 48s', cost: '$0.44', last: '1h ago', lastN: 60, created: 'Apr 22, 2026', version: 'v6',
    steps: [
      { k: 'doc',        l: 'Contract in',    s: '/contracts' },
      { k: 'model',      l: 'Read clauses',  s: 'claude 200k' },
      { k: 'tool',       l: 'Playbook diff',  s: '38 rules' },
      { k: 'checkpoint', l: 'Legal OK',       s: 'counsel' },
      { k: 'checkpoint', l: 'CFO OK',         s: 'if > $250k' },
      { k: 'action',     l: 'File copy',      s: 'doc store' }
    ]
  },
  {
    name: 'Lead Scoring Engine', type: 'Live',
    desc: 'Scores every new lead on fit and intent, enriches the record, and hands the top band straight to an AE.',
    status: 'Active', hue: 'var(--text-coloured-green)', pending: 0,
    trigger: 'Webhook · form submission', schedule: 'On event',
    by: 'James Liu', tags: ['scoring'], runs: 2140, ok: 97.9,
    avg: '3m 51s', cost: '$0.09', last: '22m ago', lastN: 22, created: 'Feb 9, 2026', version: 'v31',
    steps: [
      { k: 'webhook',    l: 'Form in',        s: 'marketo' },
      { k: 'data',       l: 'Enrich',         s: 'clearbit' },
      { k: 'model',      l: 'Score fit',      s: 'fit v3' },
      { k: 'checkpoint', l: 'AE assign',      s: 'sales ops' },
      { k: 'sync',       l: 'Write to CRM',   s: 'salesforce' }
    ]
  },
  {
    name: 'Stripe Payment Handler', type: 'Live',
    desc: 'Reconciles Stripe events against invoices, retries soft failures, and escalates disputes for a human call.',
    status: 'Active', hue: 'var(--orange-600)', pending: 0,
    trigger: 'Webhook · stripe events', schedule: 'On event',
    by: 'Sarah Chen', tags: ['finance', 'payments'], runs: 3610, ok: 99.1,
    avg: '0m 42s', cost: '$0.02', last: '1m ago', lastN: 1, created: 'Oct 14, 2025', version: 'v22',
    steps: [
      { k: 'webhook',    l: 'Stripe event',   s: 'charge.*' },
      { k: 'branch',     l: 'Dispute?',       s: 'event type' },
      { k: 'data',       l: 'Match invoice',  s: 'ledger' },
      { k: 'tool',       l: 'Retry charge',   s: 'max 3' },
      { k: 'checkpoint', l: 'Dispute OK',     s: 'finance ops' },
      { k: 'notify',     l: 'Notify team',   s: '#billing' }
    ]
  },
  {
    name: 'Vendor Onboarding Flow', type: 'Live',
    desc: 'Collects vendor documents, runs the compliance screen, and opens the supplier record once procurement approves.',
    status: 'Active', hue: 'var(--text-coloured-indigo)', pending: 0,
    trigger: 'Form · vendor intake', schedule: 'On submission',
    by: 'Tom Weber', tags: ['procurement'], runs: 74, ok: 91.9,
    avg: '6m 20s', cost: '$0.38', last: '3h ago', lastN: 180, created: 'May 30, 2026', version: 'v4',
    steps: [
      { k: 'trigger',    l: 'Intake in',      s: 'vendor form' },
      { k: 'doc',        l: 'Collect docs',   s: 'w-9 + coi' },
      { k: 'guard',      l: 'Sanctions',      s: 'ofac list' },
      { k: 'model',      l: 'Risk summary',   s: 'gpt-4o' },
      { k: 'checkpoint', l: 'Buyer OK',       s: 'procurement' },
      { k: 'action',     l: 'Open supplier',  s: 'coupa' }
    ]
  },
  {
    name: 'Expense Audit Bot', type: 'Job',
    desc: 'Samples submitted expenses, checks them against policy, and queues the exceptions for a manager decision.',
    status: 'Active', hue: 'var(--text-coloured-cyan)', pending: 0,
    trigger: 'Schedule · weekdays 07:00', schedule: 'Mon–Fri, 07:00',
    by: 'Anna Park', tags: [], runs: 132, ok: 95.5,
    avg: '2m 04s', cost: '$0.11', last: '6h ago', lastN: 360, created: 'Jun 11, 2026', version: 'v8',
    steps: [
      { k: 'schedule',   l: 'Daily 07:00',    s: 'weekdays' },
      { k: 'data',       l: 'Pull expenses',  s: 'expensify' },
      { k: 'model',      l: 'Policy check',   s: 'audit v2' },
      { k: 'checkpoint', l: 'Manager OK',     s: 'cost centre' },
      { k: 'notify',     l: 'Send digest',    s: 'email' }
    ]
  },
  {
    name: 'Email Campaign Trigger', type: 'Job',
    desc: 'Watches segment membership and fires the matching lifecycle campaign, holding back anyone in an active sequence.',
    status: 'Active', hue: 'var(--text-coloured-blue)', pending: 0,
    trigger: 'Segment change · lifecycle', schedule: 'Every 15 min',
    by: 'James Liu', tags: ['email'], runs: 862, ok: 98.6,
    avg: '0m 34s', cost: '$0.03', last: '8m ago', lastN: 8, created: 'Dec 6, 2025', version: 'v17',
    steps: [
      { k: 'trigger', l: 'Segment move',   s: 'lifecycle' },
      { k: 'branch',  l: 'In sequence?',   s: 'suppression' },
      { k: 'model',   l: 'Pick variant',   s: 'bandit' },
      { k: 'notify',  l: 'Send campaign',  s: 'braze' }
    ]
  },
  {
    name: 'Slack Notification Bot', type: 'Live',
    desc: 'Turns pipeline and incident events into one readable Slack post per channel, deduped across sources.',
    status: 'Active', hue: 'var(--text-coloured-green)', pending: 0,
    trigger: 'Event bus · ops topics', schedule: 'On event',
    by: 'Mike Torres', tags: ['ops'], runs: 4980, ok: 99.7,
    avg: '0m 08s', cost: '$0.00', last: 'just now', lastN: 0, created: 'Sep 1, 2025', version: 'v11',
    steps: [
      { k: 'trigger', l: 'Ops event',      s: 'event bus' },
      { k: 'model',   l: 'Summarise',      s: 'haiku' },
      { k: 'notify',  l: 'Post to Slack',  s: '4 channels' }
    ]
  },
  {
    name: 'Report Generator', type: 'Job',
    desc: 'Builds the weekly executive pack from the warehouse, with a review stop before it reaches the distribution list.',
    status: 'Paused', hue: 'var(--orange-600)', pending: 0,
    trigger: 'Schedule · Mondays 06:00', schedule: 'Weekly, Mon 06:00',
    by: 'Priya Nair', tags: ['reporting'], runs: 24, ok: 87.5,
    avg: '6m 47s', cost: '$2.05', last: '6d ago', lastN: 8640, created: 'Aug 19, 2025', version: 'v19',
    steps: [
      { k: 'schedule',   l: 'Weekly run',     s: 'mon 06:00' },
      { k: 'data',       l: 'Query data',     s: '11 queries' },
      { k: 'model',      l: 'Commentary',     s: 'gpt-4o' },
      { k: 'checkpoint', l: 'Exec OK',        s: 'chief of staff' },
      { k: 'action',     l: 'Publish pack',   s: 'doc store' }
    ]
  },
  {
    name: 'HubSpot Contact Sync', type: 'Job',
    desc: 'Two-way contact sync between HubSpot and the warehouse, with conflict resolution on the newest write.',
    status: 'Active', hue: 'var(--text-coloured-cyan)', pending: 0,
    trigger: 'Schedule · every 30 min', schedule: 'Every 30 min',
    by: 'Tom Weber', tags: [], runs: 96, ok: 88.5,
    avg: '1m 55s', cost: '$0.14', last: '24m ago', lastN: 24, created: 'Jul 7, 2025', version: 'v13',
    steps: [
      { k: 'schedule', l: 'Every 30 min',   s: 'cron' },
      { k: 'sync',     l: 'Pull HubSpot',   s: 'contacts' },
      { k: 'branch',   l: 'Conflict?',      s: 'newest wins' },
      { k: 'data',     l: 'Upsert rows',    s: 'snowflake' }
    ]
  },
  {
    name: 'PDF Text Extractor', type: 'Live',
    desc: 'A shared building block — takes any PDF and returns clean text and tables for the automations downstream of it.',
    status: 'Active', hue: 'var(--purple-450)', pending: 0,
    trigger: 'Called by other automations', schedule: 'On call',
    by: 'Anna Park', tags: ['utility'], runs: 1490, ok: 93.1,
    avg: '0m 26s', cost: '$0.01', last: '2h ago', lastN: 120, created: 'Jun 2, 2025', version: 'v7',
    steps: [
      { k: 'trigger', l: 'File in',        s: 'sub-flow' },
      { k: 'tool',    l: 'OCR pages',      s: 'tesseract' },
      { k: 'model',   l: 'Structure',      s: 'haiku' }
    ]
  },
  {
    name: 'Ticket Triage Agent', type: 'Live',
    desc: 'Reads an incoming support ticket, sets priority and queue, and drafts the first reply for an agent to send.',
    status: 'Draft', hue: 'var(--text-coloured-indigo)', pending: 0,
    trigger: 'Webhook · Zendesk ticket created', schedule: 'Not scheduled',
    by: 'Mike Torres', tags: ['support'], runs: 0, ok: 0,
    avg: '—', cost: '—', last: 'never', lastN: 999999, created: 'Aug 26, 2026', version: 'draft',
    steps: [
      { k: 'webhook',    l: 'Ticket in',      s: 'zendesk' },
      { k: 'model',      l: 'Classify',       s: 'gpt-4o-mini' },
      { k: 'checkpoint', l: 'Agent review',   s: 'tier 1' },
      { k: 'action',     l: 'Set queue',      s: 'zendesk' }
    ]
  },
  {
    name: 'Churn Alert Notifier', type: 'Job',
    desc: 'Watches usage decay against the churn model and opens a save-play task for the owning CSM.',
    status: 'Draft', hue: 'var(--text-coloured-green)', pending: 0,
    trigger: 'Schedule · daily 08:00', schedule: 'Not scheduled',
    by: 'Sarah Chen', tags: [], runs: 0, ok: 0,
    avg: '—', cost: '—', last: 'never', lastN: 999999, created: 'Aug 28, 2026', version: 'draft',
    steps: [
      { k: 'schedule', l: 'Daily 08:00',    s: 'not armed' },
      { k: 'data',     l: 'Usage rollup',   s: 'warehouse' },
      { k: 'model',    l: 'Churn risk',     s: 'risk v4' },
      { k: 'action',   l: 'Save play',      s: 'task' }
    ]
  }
];

/* ════ Small helpers ════ */
const STATUS_TONE = { Active: 'green', Paused: 'grey', Draft: 'grey' };

/* Tags are grey at rest and take their colour when the card they sit on
   is hovered or selected — the .cq-tag / .cq-tint pair the system
   publishes. The tone is fixed per tag, as on the Model Hub, so a word
   does not change colour depending on where it lands in a list. */
const TAG_TONE = {
  crm: 'blue',        growth: 'blue',      scoring: 'blue',    email: 'blue',
  sales: 'indigo',    legal: 'indigo',     compliance: 'indigo', approvals: 'indigo',
  review: 'indigo',
  data: 'cyan',       monitoring: 'cyan',  sync: 'cyan',       enrichment: 'cyan',
  ocr: 'cyan',        etl: 'cyan',
  finance: 'green',   payments: 'green',   procurement: 'green', reporting: 'green',
  exec: 'green',      audit: 'green',
  ops: 'light-green', support: 'light-green', onboarding: 'light-green',
  triage: 'light-green', csat: 'light-green', oncall: 'light-green',
  alerts: 'light-green', slack: 'light-green', operations: 'light-green',
  utility: 'light-green', retention: 'light-green'
};
const tone = t => TAG_TONE[t] || 'blue';
const fmt = n => n.toLocaleString('en-US');
const cpCount = a => a.steps.filter(s => s.k === 'checkpoint').length;
/* "Running currently" is not a stored flag: an automation is running if
   it is active and its last run is inside the last few minutes, which
   is what the sidebar count and the canvas badge both read. */
const isRunning = a => a.status === 'Active' && a.lastN <= 5;

function statusPill(a) {
  const glyph = a.status === 'Active' ? '<span class="cq-status--dot"></span>'
    : a.status === 'Paused' ? '<svg class="cq-ic" width="12" height="12" viewBox="0 0 16 16"><use href="#i-pause"/></svg>'
    : '<svg class="cq-ic" width="12" height="12" viewBox="0 0 16 16"><use href="#i-pencil"/></svg>';
  return `<span class="cq-status" data-tone="${STATUS_TONE[a.status]}">${glyph}${a.status}</span>`;
}

/* ════════════════════════════════════════════════════════════════════
   THE WASH
   Two stops per card, taken from the 300 level of the system's own ramps
   — the level the pastels in the reference sit at — plus the ink the mark
   takes when it lights. Keyed off the hue each automation already
   carries, so a card's colour is its own and stays put between renders.

   Literal values rather than tokens: these are one gradient read across
   both themes, tuned by --al-lift rather than by swapping the stops.
   ════════════════════════════════════════════════════════════════════ */
const WASH = {
  /* one / two: the gradient's two stops at full chroma — the 500 level of
     the system's ramps, with a neighbour for the second so the wash turns
     slightly across the corner rather than reading as one flat tint.
     Given as space-separated RGB components, not hex, because every stop
     is rgb(<hue> / <alpha>): the alpha is the only thing the gradient
     interpolates, so nothing is dragged through black on the way out.
     ink / inkD: the mark's colour on white and on #1b1b1b. */
  'var(--text-coloured-indigo)':      { one: '88 96 237',   two: '151 71 255',  ink: '#454de0', inkD: '#c2c5fa' },
  'var(--text-coloured-blue)':        { one: '13 153 255',  two: '53 202 240',  ink: '#007be5', inkD: '#bde3ff' },
  'var(--text-coloured-cyan)':        { one: '53 202 240',  two: '20 174 92',   ink: '#00a2c2', inkD: '#cef0f8' },
  'var(--text-coloured-green)':       { one: '20 174 92',   two: '124 179 66',  ink: '#009951', inkD: '#aff4c6' },
  'var(--purple-450)':                { one: '151 71 255',  two: '240 79 168',  ink: '#8638e5', inkD: '#e4ccff' },
  'var(--orange-600)':                { one: '252 158 36',  two: '255 196 112', ink: '#dd7c0e', inkD: '#fcd19c' },
  'var(--text-coloured-red)':         { one: '255 92 71',   two: '252 158 36',  ink: '#dc3412', inkD: '#ffc7c2' },
  'var(--text-coloured-light-green)': { one: '124 179 66',  two: '175 244 198', ink: '#689f38', inkD: '#c5e1a5' }
};
const wash = hue => WASH[hue] || WASH['var(--text-coloured-blue)'];

function washHTML(x) {
  const w = wash(x.hue);
  return `<span class="al-wash" style="--al-1:${w.one};--al-2:${w.two}" aria-hidden="true"></span>`;
}
function markHTML(x) {
  const w = wash(x.hue);
  return `<span class="al-mark" style="--al-1:${w.one};--al-ink:${w.ink};--al-ink-d:${w.inkD}">
    <svg class="cq-ic" width="18" height="18" viewBox="0 0 16 16"><use href="#ic-pp_automation"/></svg>
  </span>`;
}

/* ── The flag ──
   Three conditions are worth interrupting a scan: someone is blocked on
   this automation, it is running right now, or it has been stopped. The
   quiet majority carries none, and the first match wins so a card never
   wears two. */
const FLAGS = [
  { is: a => a.pending > 0,         label: 'Awaiting approval', tone: 'wait' },
  { is: a => isRunning(a),          label: 'Running',           tone: 'live' },
  { is: a => a.status === 'Paused', label: 'Paused',            tone: 'off'  }
];
function flag(a) {
  const f = FLAGS.find(f => f.is(a));
  return f ? `<span class="al-flag" data-tone="${f.tone}"><i></i>${f.label}</span>` : '';
}

/* ── The type ──
   Job or Live, and nothing else. No step count and no checkpoint note:
   how a flow is built is the builder's business, and whether a person
   stands in it is already the card's flag when anyone is actually
   waiting — said twice it was just noise in the corner of every card. */
function typeHTML(x) {
  return `<span class="al-type">
    <svg class="cq-ic" width="11" height="11" viewBox="0 0 16 16"><use href="${x.type === 'Job' ? '#i-clock' : '#i-bolt'}"/></svg>
    ${x.type}
  </span>`;
}

function cardHTML(a, i) {
  return `
  <article class="au-card cq-tint" tabindex="0" role="button" data-i="${i}"
           aria-label="${esc(a.name)} — open the automation">
    ${washHTML(a)}
    <div class="al-head">
      ${markHTML(a)}
      <span class="al-head__end">${flag(a)}</span>
    </div>
    <div class="au-card__body">
      <span class="au-card__name cq-body1-med cq-truncate">${esc(a.name)}</span>
      <span class="au-card__desc cq-caption-reg">${esc(a.desc)}</span>
    </div>
    <div class="au-card__foot">
      <span class="au-tags">
        ${typeHTML(a)}
        ${a.tags.map(t => `<span class="cq-tag" data-tone="${tone(t)}">${esc(t)}</span>`).join('')}
      </span>
      <span class="au-card__end">
        <span class="cq-avatar" title="${esc(a.by)}">${initial(a.by)}</span>
        <button class="cq-icon-btn cq-icon-btn--sm" aria-label="More actions" data-more="1">
          <svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#i-dots"/></svg>
        </button>
      </span>
    </div>
  </article>`;
}

/* ════════════════════════════════════════════════════════════════════
   LIST VIEW
   The same nodes at row scale. On a table row the dark board would read
   as a gap rather than as a canvas, so here the nodes sit on the row's
   own ground and keep only their hue.
   ════════════════════════════════════════════════════════════════════ */
function rowHTML(a, i) {
  const okColor = a.runs === 0 ? '' : a.ok >= 97 ? 'color:var(--text-coloured-green)'
    : a.ok < 92 ? 'color:var(--text-coloured-orange)' : '';
  return `
  <div class="cq-row cq-tint" tabindex="0" role="button" data-i="${i}">
    <div class="cq-cell">
      <span class="au-row-ic" style="color:${a.hue}">
        <svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-pp_automation"/></svg>
      </span>
      <span class="au-row__name">
        <span class="cq-body2-med cq-truncate">${esc(a.name)}</span>
        <span class="au-row__desc cq-caption-reg cq-truncate" title="${esc(a.desc)}">${esc(a.desc)}</span>
      </span>
    </div>
    <div class="cq-cell au-cell--num">${a.runs ? fmt(a.runs) : '—'}</div>
    <div class="cq-cell au-cell--num" style="${okColor}">${a.runs ? a.ok.toFixed(1) + '%' : '—'}</div>
    <div class="cq-cell cq-cell--muted cq-caption-reg">${esc(a.last)}</div>
    <div class="cq-cell">${statusPill(a)}</div>
    <div class="cq-cell au-cell--end">${a.pending
      ? `<button class="cq-btn cq-btn--sm cq-btn--primary" data-review="1">Review ${a.pending}</button>`
      : `<button class="cq-icon-btn cq-icon-btn--sm" aria-label="More actions" data-more="1"><svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#i-dots"/></svg></button>`}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════
   THE MARKETPLACE
   Published automations to start from. `steps` is shaped exactly like an
   automation's, so the same canvas thumbnail renders it.
   ════════════════════════════════════════════════════════════════════ */
const MARKET = [
  { name: 'Invoice Intake & Approval', type: 'Live', cat: 'Finance', by: 'Cogentiq', installs: 4200,
    hue: 'var(--text-coloured-indigo)', tags: ['finance', 'ocr'], updated: 'Aug 12, 2026',
    desc: 'Reads invoices from a shared inbox, extracts totals, and holds anything over a threshold for a controller.',
    steps: [{ k: 'email', l: 'Invoice in', s: 'shared inbox' }, { k: 'model', l: 'Extract fields', s: 'gpt-4o ocr' },
            { k: 'branch', l: 'Over limit?', s: 'amount gate' }, { k: 'checkpoint', l: 'Finance OK', s: 'controllers' },
            { k: 'action', l: 'Post to ERP', s: 'create bill' }] },
  { name: 'Purchase Order Matching', type: 'Live', cat: 'Finance', by: 'Cogentiq', installs: 2800,
    hue: 'var(--text-coloured-cyan)', tags: ['finance', 'procurement'], updated: 'Jul 30, 2026',
    desc: 'Matches incoming invoices to open purchase orders and queues the exceptions for a buyer to settle.',
    steps: [{ k: 'webhook', l: 'Invoice in', s: 'ap feed' }, { k: 'data', l: 'Find PO', s: 'erp lookup' },
            { k: 'tool', l: 'Three-way match', s: 'qty + price' }, { k: 'checkpoint', l: 'Buyer OK', s: 'exceptions' },
            { k: 'action', l: 'Close PO', s: 'erp write' }] },
  { name: 'Lead Enrichment & Routing', type: 'Live', cat: 'Sales', by: 'Clearbit', installs: 6100,
    hue: 'var(--text-coloured-green)', tags: ['sales', 'enrichment'], updated: 'Aug 20, 2026',
    desc: 'Enriches every inbound lead, scores it against your fit model, and routes the top band to an owner.',
    steps: [{ k: 'webhook', l: 'Form in', s: 'any form' }, { k: 'data', l: 'Enrich', s: 'clearbit' },
            { k: 'model', l: 'Score fit', s: 'fit model' }, { k: 'sync', l: 'Route to CRM', s: 'owner rules' }] },
  { name: 'Quote Approval Chain', type: 'Live', cat: 'Sales', by: 'Cogentiq', installs: 1900,
    hue: 'var(--purple-450)', tags: ['sales', 'approvals'], updated: 'Jun 18, 2026',
    desc: 'Takes a drafted quote through discount review and countersignature, escalating by deal size.',
    steps: [{ k: 'trigger', l: 'Quote drafted', s: 'cpq' }, { k: 'model', l: 'Check discount', s: 'policy' },
            { k: 'checkpoint', l: 'Manager OK', s: 'if > 15%' }, { k: 'checkpoint', l: 'VP OK', s: 'if > 30%' },
            { k: 'action', l: 'Send for sign', s: 'docusign' }] },
  { name: 'Ticket Triage & First Reply', type: 'Live', cat: 'Support', by: 'Zendesk', installs: 5400,
    hue: 'var(--text-coloured-blue)', tags: ['support', 'triage'], updated: 'Aug 24, 2026',
    desc: 'Classifies an incoming ticket, sets priority and queue, and drafts a first reply for an agent to send.',
    steps: [{ k: 'webhook', l: 'Ticket in', s: 'zendesk' }, { k: 'model', l: 'Classify', s: 'gpt-4o-mini' },
            { k: 'branch', l: 'Urgent?', s: 'sla rules' }, { k: 'checkpoint', l: 'Agent review', s: 'tier 1' },
            { k: 'action', l: 'Set queue', s: 'zendesk' }] },
  { name: 'CSAT Follow-up', type: 'Job', cat: 'Support', by: 'Cogentiq', installs: 1200,
    hue: 'var(--text-coloured-light-green)', tags: ['support', 'csat'], updated: 'May 9, 2026',
    desc: 'Sends a survey after resolution, reads the free text, and opens a task on anything below par.',
    steps: [{ k: 'schedule', l: 'On resolve', s: '+1 day' }, { k: 'notify', l: 'Send survey', s: 'email' },
            { k: 'model', l: 'Read replies', s: 'sentiment' }, { k: 'action', l: 'Open task', s: 'if low' }] },
  { name: 'Vendor Compliance Screen', type: 'Live', cat: 'Operations', by: 'Cogentiq', installs: 980,
    hue: 'var(--orange-600)', tags: ['operations', 'compliance'], updated: 'Aug 2, 2026',
    desc: 'Collects vendor documents, runs the sanctions screen, and opens the supplier record on approval.',
    steps: [{ k: 'trigger', l: 'Intake in', s: 'vendor form' }, { k: 'doc', l: 'Collect docs', s: 'w-9 + coi' },
            { k: 'guard', l: 'Sanctions', s: 'ofac list' }, { k: 'model', l: 'Risk summary', s: 'gpt-4o' },
            { k: 'checkpoint', l: 'Buyer OK', s: 'procurement' }, { k: 'action', l: 'Open supplier', s: 'erp' }] },
  { name: 'Incident Digest', type: 'Job', cat: 'Operations', by: 'PagerDuty', installs: 3300,
    hue: 'var(--text-coloured-red)', tags: ['operations', 'oncall'], updated: 'Aug 16, 2026',
    desc: 'Turns a night of alerts into one readable morning summary, grouped by service and root cause.',
    steps: [{ k: 'schedule', l: 'Daily 07:00', s: 'weekdays' }, { k: 'data', l: 'Pull alerts', s: 'pagerduty' },
            { k: 'model', l: 'Group + write', s: 'gpt-4o' }, { k: 'notify', l: 'Post digest', s: '#oncall' }] },
  { name: 'Warehouse Sync Monitor', type: 'Job', cat: 'Data', by: 'Snowflake', installs: 2100,
    hue: 'var(--text-coloured-cyan)', tags: ['data', 'monitoring'], updated: 'Jul 21, 2026',
    desc: 'Watches every scheduled load for freshness and row-count drift, and pages the owner when one slips.',
    steps: [{ k: 'schedule', l: 'Every hour', s: 'cron' }, { k: 'data', l: 'Check loads', s: '18 tables' },
            { k: 'guard', l: 'Freshness', s: 'thresholds' }, { k: 'branch', l: 'Drifted?', s: 'row counts' },
            { k: 'notify', l: 'Page owner', s: 'pagerduty' }] }
];

const MK_CATS = ['Finance', 'Sales', 'Support', 'Operations', 'Data'];
const MK_SORTS = [['installs', 'Most installed'], ['name', 'Name A–Z'], ['updated', 'Recently updated']];
const ALL_PUBS = [...new Set(MARKET.map(m => m.by))].sort();
const fmtInstalls = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);

function marketCardHTML(m, i) {
  return `
  <article class="au-card cq-tint" tabindex="0" role="button" data-mk="${i}"
           aria-label="${esc(m.name)} — open the template">
    ${washHTML(m)}
    <div class="al-head">
      ${markHTML(m)}
      <span class="al-head__end"><span class="cq-badge" data-tone="grey">${esc(m.cat)}</span></span>
    </div>
    <div class="au-card__body">
      <span class="au-card__name cq-body1-med cq-truncate">${esc(m.name)}</span>
      <span class="au-card__desc cq-caption-reg">${esc(m.desc)}</span>
    </div>
    <div class="au-card__foot">
      <span class="au-tags">
        ${typeHTML(m)}
        <span class="cq-avatar" title="${esc(m.by)}">${initial(m.by)}</span>
        <span class="au-mk__by cq-caption-reg cq-truncate">${esc(m.by)}</span>
        <span class="au-mk__dot"></span>
        <span class="au-mk__n cq-caption-reg">${fmtInstalls(m.installs)} installs</span>
      </span>
      <span class="au-card__end">
        <button class="cq-btn cq-btn--sm cq-btn--tonal" data-use="${i}">Use template</button>
      </span>
    </div>
  </article>`;
}

const mkState = { q: '', cat: 'all', pubs: new Set(), sort: 'installs' };

function mkFiltered() {
  const q = mkState.q.toLowerCase();
  return MARKET.map((m, i) => ({ m, i })).filter(({ m }) =>
    (mkState.cat === 'all' || m.cat === mkState.cat) &&
    (!mkState.pubs.size || mkState.pubs.has(m.by)) &&
    (!q || (m.name + ' ' + m.desc + ' ' + m.tags.join(' ') + ' ' + m.by).toLowerCase().includes(q))
  ).sort((x, y) => mkState.sort === 'name' ? x.m.name.localeCompare(y.m.name)
    : mkState.sort === 'updated' ? Date.parse(y.m.updated) - Date.parse(x.m.updated)
    : y.m.installs - x.m.installs);
}

function renderMarket() {
  const rows = mkFiltered();
  $('mkGrid').innerHTML = rows.map(({ m, i }) => marketCardHTML(m, i)).join('');
  $('mkGrid').hidden = !rows.length;
  $('mkEmpty').hidden = rows.length > 0;
  $('mkFoot').innerHTML = rows.length
    ? `Showing <b>${rows.length}</b> of <b>${MARKET.length}</b> published automations` : '';
  markSelected();
}

/* The category rows are built from the data, so a new template cannot
   leave a count behind. */
$('sideMarket').innerHTML = [
  `<button class="cq-nav-item is-active" data-cat="all">
     <svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#i-spark"/></svg>
     <span class="cq-nav-item__label">All templates</span>
     <span class="au-side__n">${MARKET.length}</span>
   </button>`,
  `<span class="au-side__label cq-caption-med" style="padding-top:14px">CATEGORY</span>`,
  ...MK_CATS.map(c => `
   <button class="cq-nav-item" data-cat="${c}">
     <svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#i-layers"/></svg>
     <span class="cq-nav-item__label">${c}</span>
     <span class="au-side__n">${MARKET.filter(m => m.cat === c).length}</span>
   </button>`)
].join('');
$('sideMarket').addEventListener('click', e => {
  const btn = e.target.closest('.cq-nav-item[data-cat]');
  if (!btn) return;
  mkState.cat = btn.dataset.cat;
  $('sideMarket').querySelectorAll('.cq-nav-item').forEach(b => b.classList.toggle('is-active', b === btn));
  renderMarket();
});

/* ════════════════════════════════════════════════════════════════════
   AUTOMATIONS STATE
   scope comes from the sidebar, the three dropdowns narrow it further,
   and the search runs over the lot.
   ════════════════════════════════════════════════════════════════════ */
const auState = { q: '', scope: 'all', type: 'all', tags: new Set(), by: new Set(), when: 'any', view: 'card' };
const WHENS = [['any', 'All time'], ['1d', 'Last 24 hours'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']];
const WHEN_MAX = { any: Infinity, '1d': 1440, '7d': 10080, '30d': 43200 };
const ALL_TAGS = [...new Set(AUTOS.flatMap(a => a.tags))].sort();
const ALL_BY = [...new Set(AUTOS.map(a => a.by))].sort();

function inScope(a) {
  const s = auState.scope;
  if (s === 'all') return true;
  if (s === 'waiting') return a.pending > 0;
  if (s === 'running') return isRunning(a);
  return a.status === s;
}

function auFiltered() {
  const q = auState.q.toLowerCase();
  return AUTOS.map((a, i) => ({ a, i })).filter(({ a }) =>
    inScope(a) &&
    (auState.type === 'all' || a.type === auState.type) &&
    (!auState.tags.size || a.tags.some(t => auState.tags.has(t))) &&
    (!auState.by.size || auState.by.has(a.by)) &&
    a.lastN <= WHEN_MAX[auState.when] &&
    (!q || (a.name + ' ' + a.desc + ' ' + a.tags.join(' ') + ' ' + a.by).toLowerCase().includes(q))
  ).sort((x, y) => x.a.lastN - y.a.lastN);
}

function renderAutos() {
  const rows = auFiltered();
  const card = auState.view === 'card';
  $('auGrid').innerHTML = card ? rows.map(({ a, i }) => cardHTML(a, i)).join('') : '';
  $('auRows').innerHTML = card ? '' : rows.map(({ a, i }) => rowHTML(a, i)).join('');
  $('auGrid').hidden = !card || !rows.length;
  $('auTable').hidden = card || !rows.length;
  $('auEmpty').hidden = rows.length > 0;
  const pend = rows.reduce((n, { a }) => n + a.pending, 0);
  $('auCount').innerHTML = rows.length
    ? `Showing <b>${rows.length}</b> of <b>${AUTOS.length}</b> automations${pend ? ` · <b>${pend}</b> waiting on a person` : ''}`
    : '';
  markSelected();
}

/* ── The sidebar. Two dimensions, each single-select and each with its
      own "all": the scope narrows by what is happening, the type by how
      the automation was published. They combine. ── */
$('sideAutos').addEventListener('click', e => {
  const btn = e.target.closest('.cq-nav-item[data-scope]');
  if (!btn) return;
  auState.scope = btn.dataset.scope;
  $('sideAutos').querySelectorAll('.cq-nav-item').forEach(b => b.classList.toggle('is-active', b === btn));
  renderAutos();
});
$('sideType').addEventListener('click', e => {
  const btn = e.target.closest('.cq-nav-item[data-type]');
  if (!btn) return;
  auState.type = btn.dataset.type;
  $('sideType').querySelectorAll('.cq-nav-item').forEach(b => b.classList.toggle('is-active', b === btn));
  renderAutos();
});

function setView(view) {
  auState.view = view;
  const card = view === 'card';
  $('viewCardBtn').classList.toggle('is-active', card);
  $('viewListBtn').classList.toggle('is-active', !card);
  $('viewCardBtn').setAttribute('aria-pressed', String(card));
  $('viewListBtn').setAttribute('aria-pressed', String(!card));
  renderAutos();
}
$('viewCardBtn').addEventListener('click', () => setView('card'));
$('viewListBtn').addEventListener('click', () => setView('list'));

/* ════════════════════════════════════════════════════════════════════
   DETAIL PANEL — the whole flow, in order
   ════════════════════════════════════════════════════════════════════ */
/* The panel serves both lenses, so what is open is a kind as well as an
   index — the marketplace grid and the inventory grid both index from
   zero, and only the kind tells them apart. */
const open = { kind: null, i: -1 };

/* The card's canvas already shows the flow, so the panel does not draw
   it again. What it draws instead is the one thing on this automation a
   reader can act on: the human checkpoints currently holding runs, one
   block each, with the counts adding up to the number the card quotes. */
function paintWaiting(a) {
  const cps = a.steps.filter(st => st.k === 'checkpoint');
  if (!a.pending || !cps.length) {
    $('pnWaitSec').hidden = true;
    $('pnWait').innerHTML = '';
    return;
  }
  /* Front-loaded, so the per-checkpoint counts sum back to a.pending
     rather than each rounding up to the same number. */
  const share = cps.map((_, k) =>
    Math.floor(a.pending / cps.length) + (k < a.pending % cps.length ? 1 : 0));

  $('pnWait').innerHTML = cps.map((st, k) => {
    const n = share[k];
    if (!n) return '';
    return `
    <div class="au-ck">
      <div class="au-ck__box">
        <div class="au-ck__top">
          <span class="au-ck__ic"><svg class="cq-ic" width="15" height="15" viewBox="0 0 16 16"><use href="#i-shield"/></svg></span>
          <span class="au-ck__id">
            <span class="au-ck__name cq-body2-med cq-truncate">${esc(st.l)}</span>
            <span class="au-ck__sub cq-caption-reg cq-truncate">Human checkpoint · ${esc(st.s)}</span>
          </span>
        </div>
        <div class="au-ck__wait">
          <svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16"><use href="#i-clock"/></svg>
          <span class="cq-caption-med">${n} run${n > 1 ? 's' : ''} awaiting approval</span>
          <button class="cq-btn cq-btn--sm cq-btn--primary" data-goapprovals="1">Review</button>
        </div>
      </div>
    </div>`;
  }).join('');
  $('pnWaitSec').hidden = false;
}

function paintKv(rows) {
  $('pnKv').innerHTML = rows.map(([k, v]) =>
    `<div class="cq-kv"><span class="cq-kv__k">${esc(k)}</span><span class="cq-kv__v">${esc(v)}</span></div>`).join('');
}

function showPanel() {
  $('auPanel').classList.add('is-open');
  $('auPanel').setAttribute('aria-hidden', 'false');
  markSelected();
}

function openTemplate(i) {
  const m = MARKET[i];
  if (!m) return;
  open.kind = 'mk'; open.i = i;
  $('pnName').textContent = m.name;
  $('pnDesc').textContent = m.desc;
  $('pnIc').style.color = m.hue;
  $('pnStatus').outerHTML =
    `<span class="cq-status" id="pnStatus" data-tone="grey">${esc(m.cat)}</span>`;
  $('pnRun').hidden = true;
  $('pnPrimaryLabel').textContent = 'Use template';
  $('pnPrimaryIcon').setAttribute('href', '#i-plus');
  /* A template holds no runs, so it never has anything awaiting. */
  paintWaiting({ pending: 0, steps: [] });
  paintKv([
    ['Publisher', m.by], ['Category', m.cat],
    ['Installs', fmtInstalls(m.installs)],
    ['Steps', String(m.steps.length)],
    ['Human checkpoints', String(cpCount(m)) + (cpCount(m) ? '' : ' — none')],
    ['Last updated', m.updated]
  ]);
  $('pnTags').innerHTML = m.tags.map(t =>
    `<span class="cq-tag is-tinted" data-tone="${tone(t)}">${esc(t)}</span>`).join('');
  showPanel();
}

function openPanel(i) {
  const a = AUTOS[i];
  if (!a) return;
  open.kind = 'auto'; open.i = i;
  $('pnName').textContent = a.name;
  $('pnDesc').textContent = a.desc;
  $('pnIc').style.color = a.hue;
  $('pnStatus').outerHTML = statusPill(a).replace('class="cq-status"', 'class="cq-status" id="pnStatus"');
  $('pnRun').hidden = a.status === 'Draft';
  $('pnPrimaryLabel').textContent = 'Open in builder';
  $('pnPrimaryIcon').setAttribute('href', '#i-pencil');

  paintWaiting(a);

  paintKv([
    ['Type', a.type], ['Trigger', a.trigger], ['Schedule', a.schedule], ['Owner', a.by],
    ['Steps', String(a.steps.length)],
    ['Human checkpoints', cpCount(a) ? String(cpCount(a)) : 'None'],
    ['Runs · 7 days', a.runs ? fmt(a.runs) : 'No runs yet'],
    ['Success rate', a.runs ? a.ok.toFixed(1) + '%' : '—'],
    ['Avg runtime', a.avg], ['Avg cost per run', a.cost],
    ['Last run', a.last], ['Created', a.created], ['Version', a.version]
  ]);

  $('pnTags').innerHTML = a.tags.map(t =>
    `<span class="cq-tag is-tinted" data-tone="${tone(t)}">${esc(t)}</span>`).join('');
  showPanel();
}

function closePanel() {
  open.kind = null; open.i = -1;
  $('auPanel').classList.remove('is-open');
  $('auPanel').setAttribute('aria-hidden', 'true');
  markSelected();
}

function markSelected() {
  document.querySelectorAll('#auGrid .au-card, #auRows .cq-row').forEach(el =>
    el.classList.toggle('is-selected', open.kind === 'auto' && Number(el.dataset.i) === open.i));
  document.querySelectorAll('#mkGrid .au-card').forEach(el =>
    el.classList.toggle('is-selected', open.kind === 'mk' && Number(el.dataset.mk) === open.i));
}

function wireOpen(container) {
  container.addEventListener('click', e => {
    /* The checkpoint queue is its own screen in the product, so a row
       that has someone waiting links out to it rather than swapping this
       page's content under the reader. */
    if (e.target.closest('[data-review]')) { e.stopPropagation(); go('checkpoints.html'); return; }
    if (e.target.closest('[data-more]')) { e.stopPropagation(); return; }
    const host = e.target.closest('[data-i]');
    if (host) openPanel(Number(host.dataset.i));
  });
  container.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const host = e.target.closest('[data-i]');
    if (!host) return;
    e.preventDefault();
    openPanel(Number(host.dataset.i));
  });
}
wireOpen($('auGrid'));
wireOpen($('auRows'));

$('mkGrid').addEventListener('click', e => {
  /* "Use template" is the card's own action, not a way into the panel. */
  if (e.target.closest('[data-use]')) { e.stopPropagation(); return; }
  const host = e.target.closest('[data-mk]');
  if (host) openTemplate(Number(host.dataset.mk));
});
$('mkGrid').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const host = e.target.closest('[data-mk]');
  if (!host) return;
  e.preventDefault();
  openTemplate(Number(host.dataset.mk));
});

$('pnClose').addEventListener('click', closePanel);
$('pnWait').addEventListener('click', e => {
  if (e.target.closest('[data-goapprovals]')) { closePanel(); go('checkpoints.html'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && open.i >= 0) closePanel(); });
/* The panel overlays the content rather than insetting it, so clicking
   past it has to dismiss it — otherwise the right-hand third of the
   screen is simply unreachable while it is open. The card and row that
   opened it are excluded, or the same click would close it again. */
document.addEventListener('click', e => {
  if (open.i < 0) return;
  if (e.target.closest('#auPanel, .au-card, #auRows .cq-row')) return;
  closePanel();
});

/* ════════════════════════════════════════════════════════════════════
   FILTER POPOVERS
   The Model Hub's design, composed from the cq- primitives it also uses:
   a trigger carrying a count badge and a chevron that flips to its up
   mark, and a panel whose first row is a search when the list is long
   enough to want one — the multi-selects get one, the single-pick ranges
   do not. Opening one closes the rest, and focus lands in the search so
   a filter can simply be typed.
   ════════════════════════════════════════════════════════════════════ */
const POPS = [];

function closeAllPops() {
  POPS.forEach(f => {
    $(f.pop).classList.remove('is-open');
    $(f.btn).classList.remove('is-open');
    $(f.btn).setAttribute('aria-expanded', 'false');
    if (f.chev) $(f.chev).setAttribute('href', '#ic-arrowdown');
  });
}

function togglePop(btnId) {
  const f = POPS.find(x => x.btn === btnId);
  const wasOpen = $(f.pop).classList.contains('is-open');
  closeAllPops();
  if (wasOpen) return;
  $(f.pop).classList.add('is-open');
  $(f.btn).classList.add('is-open');
  $(f.btn).setAttribute('aria-expanded', 'true');
  if (f.chev) $(f.chev).setAttribute('href', '#ic-arrowup');
  if (f.search) $(f.search).focus();
}

function registerPop(f) {
  POPS.push(f);
  $(f.btn).addEventListener('click', e => { e.stopPropagation(); togglePop(f.btn); });
  /* Clicks inside a popover are the popover's own business — without this
     the document's click-away handler would close a multi-select on the
     first tick, so a second value could never be added. */
  $(f.pop).addEventListener('click', e => e.stopPropagation());
}

/* A multi-select: checkbox rows, a live count on the trigger, and — for
   the people lists — the same avatar the cards carry. */
function wireMulti({ btn, pop, list, badge, chev, search, items, set, avatar, noun, redraw }) {
  const paint = () => {
    const typed = search ? $(search).value.trim() : '';
    const q = typed.toLowerCase();
    const rows = items().filter(v => v.toLowerCase().includes(q));
    $(list).innerHTML = rows.length
      ? rows.map(v => `
        <button class="cq-option${set.has(v) ? ' is-checked' : ''}" data-v="${esc(v)}">
          <span class="cq-checkbox"><svg viewBox="0 0 12 12"><use href="#ic-tick"/></svg></span>
          ${avatar ? `<span class="cq-avatar">${initial(v)}</span>` : ''}
          <span class="cq-option__label">${esc(v)}</span>
        </button>`).join('')
      : `<p class="cq-pop__empty cq-body2-reg">No ${noun} match “${esc(typed)}”.</p>`;
    $(badge).textContent = set.size;
    $(btn).classList.toggle('has-count', set.size > 0);
  };
  registerPop({ btn, pop, chev, search });
  $(list).addEventListener('click', e => {
    const opt = e.target.closest('[data-v]');
    if (!opt) return;
    const v = opt.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v);
    paint();
    redraw();
  });
  if (search) $(search).addEventListener('input', paint);
  paint();
}

/* A single pick: a tick against the chosen row, and the trigger takes
   its label. */
function wireSingle({ btn, pop, list, label, chev, opts, prefix = '', get, onPick }) {
  const paint = () => {
    $(list).innerHTML = opts.map(([id, text]) => `
      <button class="cq-option${get() === id ? ' is-picked' : ''}" data-v="${id}">
        <span class="cq-option__label">${text}</span>
        <svg class="cq-ic cq-option__tick" width="16" height="16" viewBox="0 0 16 16"><use href="#i-check"/></svg>
      </button>`).join('');
    $(label).textContent = prefix + opts.find(o => o[0] === get())[1];
  };
  registerPop({ btn, pop, chev });
  $(list).addEventListener('click', e => {
    const opt = e.target.closest('[data-v]');
    if (!opt) return;
    onPick(opt.dataset.v);
    paint();
    closeAllPops();
  });
  paint();
}

wireMulti({
  btn: 'tagBtn', pop: 'tagPop', list: 'tagList', badge: 'tagBadge',
  chev: 'tagChev', search: 'tagSearch', items: () => ALL_TAGS, set: auState.tags,
  noun: 'tags', redraw: renderAutos
});
wireMulti({
  btn: 'byBtn', pop: 'byPop', list: 'byList', badge: 'byBadge',
  chev: 'byChev', search: 'bySearch', items: () => ALL_BY, set: auState.by,
  avatar: true, noun: 'people', redraw: renderAutos
});
wireSingle({
  btn: 'whenBtn', pop: 'whenPop', list: 'whenList', label: 'whenLabel',
  chev: 'whenChev', opts: WHENS, get: () => auState.when,
  onPick: v => { auState.when = v; renderAutos(); }
});
wireSingle({
  btn: 'mkSortBtn', pop: 'mkSortPop', list: 'mkSortList', label: 'mkSortLabel',
  chev: 'mkSortChev', opts: MK_SORTS, prefix: 'Sort by: ', get: () => mkState.sort,
  onPick: v => { mkState.sort = v; renderMarket(); }
});
wireMulti({
  btn: 'mkPubBtn', pop: 'mkPubPop', list: 'mkPubList', badge: 'mkPubBadge',
  chev: 'mkPubChev', search: 'mkPubSearch', items: () => ALL_PUBS, set: mkState.pubs,
  avatar: true, noun: 'publishers', redraw: renderMarket
});

document.addEventListener('click', closeAllPops);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllPops(); });

/* ════ The two lenses ════ */
function cqSegSync(seg) {
  if (!seg) return;
  const thumb = seg.querySelector(':scope > .cq-seg__thumb');
  const active = seg.querySelector(':scope > button.is-active');
  if (!thumb || !active) return;
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}
/* One function decides the whole switch, so the panes, the sidebar
   groups, the search and the action button can never disagree about
   which lens is showing. */
let lens = 'automations';

function paint() {
  const market = lens === 'marketplace';

  $('paneAutomations').hidden = market;
  $('paneMarket').hidden = !market;

  $('sideAutos').hidden = market;
  $('sideType').hidden = market;
  $('sideMarket').hidden = !market;

  /* One search field, two subjects: it carries whichever is up. */
  const q = $('auQ');
  q.placeholder = market ? 'Search the marketplace' : 'Search automations';
  q.value = market ? mkState.q : auState.q;
  $('newBtn').hidden = market;
  if (market) closePanel();
}

function showTab(tab) {
  lens = tab;
  $('auTabs').querySelectorAll('[data-tab]').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  cqSegSync($('auTabs'));
  paint();
}
$('auTabs').addEventListener('click', e => {
  const btn = e.target.closest('[data-tab]');
  if (btn) showTab(btn.dataset.tab);
});
$('auQ').addEventListener('input', e => {
  const v = e.target.value;
  if (!$('paneMarket').hidden) { mkState.q = v; renderMarket(); }
  else { auState.q = v; renderAutos(); }
});
addEventListener('resize', () => cqSegSync($('auTabs')));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => cqSegSync($('auTabs')));

/* ════ Platform panel: hover to open, one category open at a time ════ */
const rail = $('rail');
let railT;
rail.addEventListener('mouseenter', () => { clearTimeout(railT); railT = setTimeout(() => rail.classList.add('is-open'), 140); });
rail.addEventListener('mouseleave', () => { clearTimeout(railT); railT = setTimeout(() => rail.classList.remove('is-open'), 200); });
$('railCollapse').addEventListener('click', e => { e.stopPropagation(); rail.classList.remove('is-open'); });
rail.querySelectorAll('.cq-rail-ghead[aria-expanded]').forEach(head => {
  head.addEventListener('click', () => {
    const open = head.getAttribute('aria-expanded') === 'true';
    rail.querySelectorAll('.cq-rail-ghead[aria-expanded]').forEach(h => h.setAttribute('aria-expanded', 'false'));
    head.setAttribute('aria-expanded', String(!open));
  });
});

/* ════ Theme ════ */
function applyMode(mode) {
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
  const dark = mode === 'dark';
  $('themeIcon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  $('themeToggle').title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  $('themeToggle').setAttribute('aria-label', $('themeToggle').title);
}
$('themeToggle').addEventListener('click', () => {
  const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
  applyMode(next);
  try { localStorage.setItem('cq-theme', next); } catch (e) { /* private mode */ }
});
let stored = null;
try { stored = localStorage.getItem('cq-theme'); } catch (e) { /* private mode */ }
applyMode(stored === 'light' ? 'light' : 'dark');

/* ════ Boot ════
   The sidebar counts are read off the data rather than written into the
   markup, so a change to the inventory cannot leave them lying. */
$('nAll').textContent = AUTOS.length;
$('nWaiting').textContent = AUTOS.filter(a => a.pending > 0).length;
$('nRunning').textContent = AUTOS.filter(isRunning).length;
$('nTypeAll').textContent = AUTOS.length;
$('nJob').textContent = AUTOS.filter(a => a.type === 'Job').length;
$('nLive').textContent = AUTOS.filter(a => a.type === 'Live').length;
document.querySelectorAll('#auTabs .au-seg-count')[0].textContent = AUTOS.length;
$('mkCount').textContent = MARKET.length;

renderAutos();
renderMarket();
paint();
cqSegSync($('auTabs'));
