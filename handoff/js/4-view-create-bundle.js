'use strict';
/* ══ VIEW: Create bundle ═══════════════════════════════════════════ */
(function () {
/* ── Create new bundle ───────────────────────────────────────────────
   A bundle is a matrix of artifact TYPE × LAYER with at most one
   artifact per cell, each pinned to a version. */


const TYPES = [
  { key: 'glossary', label: 'Glossary',         note: 'Standard terms and definitions',  icon: 'cx-glossary' },
  { key: 'ontology', label: 'Ontology',         note: 'Relationships and hierarchies',   icon: 'cx-ontology' },
  { key: 'data',     label: 'Data Binding',     note: 'Connections to data sources',     icon: 'cx-databind' },
  { key: 'prompts',  label: 'Prompts',          note: 'Pre-configured prompt templates', icon: 'cx-prompts'  },
  { key: 'tools',    label: 'Tool Binding',     note: 'Integrations with external APIs',  icon: 'cx-toolbind' },
  { key: 'rules',    label: 'Rules & Policies', note: 'Business rules and governance',   icon: 'cx-rules'    },
];

/* Keyed for lookup — the picker renders an artifact with the icon and
   colour of the type it belongs to. */
const TYPE_BY_KEY = Object.fromEntries(TYPES.map((t) => [t.key, t]));

/* The artifacts on offer, per type. Versions are newest-first; the one
   flagged `latest` gets the badge. Replace with your API payload — the
   render functions read nothing else. */
const CATALOG = {
  glossary: [
    { name: 'Customer Glossary',  sub: 'Standard business terms and definitions',
      versions: [ { v: 'v2.1', date: 'Aug 12, 2026', latest: true }, { v: 'v2.0', date: 'Jul 28, 2026' }, { v: 'v1.4', date: 'Jun 02, 2026' } ] },
    { name: 'Marketing Glossary', sub: 'Campaign and channel vocabulary',
      versions: [ { v: 'v3.2', date: 'Aug 20, 2026', latest: true }, { v: 'v3.1', date: 'Jul 11, 2026' }, { v: 'v3.0', date: 'May 30, 2026' } ] },
    { name: 'Product Inventory',  sub: 'List of available items with stock counts',
      versions: [ { v: 'v12.0', date: 'Aug 25, 2026', latest: true }, { v: 'v11.4', date: 'Aug 01, 2026' } ] },
    { name: 'Employee Directory', sub: 'Contact details and roles of all staff',
      versions: [ { v: 'v5.0', date: 'Aug 09, 2026', latest: true }, { v: 'v4.8', date: 'Jul 04, 2026' } ] },
  ],
  ontology: [
    { name: 'Support Ontology',  sub: 'Ticket, case and resolution relationships',
      versions: [ { v: 'v1.4', date: 'Aug 14, 2026', latest: true }, { v: 'v1.3', date: 'Jul 22, 2026' } ] },
    { name: 'Channel Ontology',  sub: 'Paid, owned and earned channel hierarchy',
      versions: [ { v: 'v2.0', date: 'Aug 03, 2026', latest: true }, { v: 'v1.9', date: 'Jun 18, 2026' } ] },
    { name: 'Account Hierarchy', sub: 'Parent, subsidiary and site structure',
      versions: [ { v: 'v1.2', date: 'Jul 30, 2026', latest: true } ] },
  ],
  data: [
    { name: 'Zendesk Tickets',    sub: 'Live ticket stream with SLA fields',
      versions: [ { v: 'v3.0', date: 'Aug 22, 2026', latest: true }, { v: 'v2.7', date: 'Jul 15, 2026' } ] },
    { name: 'Campaign Warehouse', sub: 'Spend, impressions and conversions',
      versions: [ { v: 'v4.1', date: 'Aug 18, 2026', latest: true }, { v: 'v4.0', date: 'Jul 09, 2026' } ] },
    { name: 'Entitlements Table', sub: 'Plan, seat and feature entitlements',
      versions: [ { v: 'v1.9', date: 'Aug 06, 2026', latest: true } ] },
  ],
  prompts: [
    { name: 'Tier-1 Reply Templates', sub: 'First-response drafts by ticket reason',
      versions: [ { v: 'v1.2', date: 'Aug 11, 2026', latest: true }, { v: 'v1.1', date: 'Jul 19, 2026' } ] },
    { name: 'Attribution Briefs',     sub: 'Weekly performance narrative prompts',
      versions: [ { v: 'v1.3', date: 'Aug 24, 2026', latest: true } ] },
    { name: 'Returns Playbook',       sub: 'Step-by-step returns handling prompts',
      versions: [ { v: 'v1.0', date: 'Jul 02, 2026', latest: true } ] },
  ],
  tools: [
    { name: 'Zendesk API',   sub: 'Read and update tickets',
      versions: [ { v: 'v2.0', date: 'Aug 16, 2026', latest: true }, { v: 'v1.8', date: 'Jun 27, 2026' } ] },
    { name: 'GA4 Connector', sub: 'Query campaign and audience reports',
      versions: [ { v: 'v1.6', date: 'Aug 21, 2026', latest: true } ] },
    { name: 'Jira Bridge',   sub: 'Raise and track engineering escalations',
      versions: [ { v: 'v3.4', date: 'Aug 05, 2026', latest: true }, { v: 'v3.3', date: 'Jul 12, 2026' } ] },
  ],
  rules: [
    { name: 'Refund Approval Policy', sub: 'Thresholds and approver matrix',
      versions: [ { v: 'v1.1', date: 'Aug 13, 2026', latest: true } ] },
    { name: 'Escalation Rules',       sub: 'When and how to escalate a case',
      versions: [ { v: 'v2.3', date: 'Aug 19, 2026', latest: true }, { v: 'v2.2', date: 'Jul 08, 2026' } ] },
    { name: 'Brand Voice Policy',     sub: 'Tone, claims and disclosure rules',
      versions: [ { v: 'v2.2', date: 'Aug 23, 2026', latest: true } ] },
  ],
};

/* selection[typeKey][layerKey] = { name, version } — one per cell, which
   is what "Max 1 of each type per layer" means. */
const selection = {};
TYPES.forEach((t) => { selection[t.key] = {}; });


/* ── Matrix ──────────────────────────────────────────────────────── */
function cellInner(typeKey, layerKey) {
  const picked = selection[typeKey][layerKey];
  if (!picked) {
    return `<span class="lbl t-body2-reg">Select</span>
            <svg class="ic plus" width="20" height="20" viewBox="0 0 20 20"><use href="#cb-plus"/></svg>`;
  }
  const t = TYPE_BY_KEY[typeKey];
  return `<svg class="ic" width="16" height="16" viewBox="0 0 16 16"
               style="color:var(--type-ink-${typeKey})"><use href="#${t.icon}"/></svg>
          <span class="cb-picked">
            <span class="nm t-body2-med">${esc(picked.name)}</span>
            <span class="cb-ver">${esc(picked.version)}</span>
          </span>
          <span class="cb-clear" role="button" tabindex="0" data-clear="1"
                aria-label="Remove ${esc(picked.name)}">
            <svg class="ic" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-close"/></svg>
          </span>`;
}

function renderMatrix() {
  const spine = `
    <div class="cb-col cb-col--spine" data-col="type">
      <div class="cb-col-head">
        <div class="row">
          <svg class="ic" width="20" height="20" viewBox="0 0 16 16"><use href="#cx-studio"/></svg>
          <span class="ttl t-subhead2-med">Artifact type</span>
        </div>
        <span class="sub t-body2-reg">Select an artifact from any type</span>
      </div>
      ${TYPES.map((t) => `
        <div class="cb-type">
          <div class="row">
            <svg class="ic" width="20" height="20" viewBox="0 0 16 16" style="color:var(--type-ink-${t.key})"><use href="#${t.icon}"/></svg>
            <span class="nm t-body1-med">${esc(t.label)}</span>
          </div>
          <span class="sub t-caption1-reg">${esc(t.note)}</span>
        </div>`).join('')}
    </div>`;

  const cols = LAYERS.map((layer, li) => `
    <div class="cb-col cb-col--layer${li === 0 ? ' is-first' : ''}${li === LAYERS.length - 1 ? ' is-last' : ''}" data-col="${layer.key}">
      <div class="cb-col-head">
        <div class="row">
          <svg class="cb-dia" viewBox="0 0 43 28" aria-hidden="true"><use href="#${layer.dia}"/></svg>
          <span class="ttl t-subhead2-med">${esc(layer.longLabel)}</span>
        </div>
        <span class="sub t-body2-reg">${esc(layer.note)}</span>
      </div>
      ${TYPES.map((t) => {
        const filled = !!selection[t.key][layer.key];
        return `<div class="cb-cellwrap">
          <button class="cb-cell${filled ? ' is-filled' : ''}"
                  data-type="${t.key}" data-layer="${layer.key}"
                  aria-haspopup="dialog"
                  aria-label="${esc(t.label)}, ${esc(layer.longLabel)}">
            ${cellInner(t.key, layer.key)}
          </button>
        </div>`;
      }).join('')}
    </div>`).join('');

  $('matrix').innerHTML = spine + cols;
}

function refreshCount() {
  const n = TYPES.reduce((sum, t) => sum + Object.keys(selection[t.key]).length, 0);
  $('selCount').textContent = n;
  $('createBtn').disabled = !(n > 0 && $('bundleName').value.trim() && $('bundleDesc').value.trim());
  return n;
}

/* ── Picker ──────────────────────────────────────────────────────── */
let open = null;        /* { typeKey, layerKey, cell } */
let expanded = null;    /* index of the expanded artifact */

function artifactRows(typeKey, layerKey, query) {
  const q = (query || '').trim().toLowerCase();
  const list = (CATALOG[typeKey] || []).filter(
    (a) => !q || a.name.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q));
  if (!list.length) return '<p class="cb-pop-empty t-body2-reg">No artifacts match that search.</p>';

  const current = selection[typeKey][layerKey];
  const type = TYPE_BY_KEY[typeKey];
  return list.map((a, i) => {
    const isOpen = expanded === i;
    /* One row is marked as where a pick would land: the version already
       pinned in this cell, or the latest when nothing is pinned yet. */
    const pinned = current && current.name === a.name ? current.version : null;
    const marked = pinned || (a.versions.find((v) => v.latest) || {}).v;
    const vers = a.versions.map((v) => `
      <button class="cb-ver-row${v.v === marked ? ' is-current' : ''}"
              data-pick="${i}" data-v="${esc(v.v)}">
        <span class="v t-body2-med">${esc(v.v)}</span>
        <span class="spacer"></span>
        ${v.latest ? '<span class="cb-latest t-caption1-med">Latest</span>' : ''}
        <span class="date t-body2-reg">${esc(v.date)}</span>
      </button>`).join('');
    return `<div class="cb-art${isOpen ? ' is-expanded' : ''}" data-i="${i}">
      <button class="cb-art-head" data-toggle="${i}" aria-expanded="${isOpen}">
        <svg class="ic" width="20" height="20" viewBox="0 0 16 16"
             style="color:var(--type-ink-${typeKey})"><use href="#${type.icon}"/></svg>
        <span class="cb-art-text">
          <span class="nm t-body1-med">${esc(a.name)}</span>
          <span class="sub t-caption1-reg">${esc(a.sub)}</span>
        </span>
        <span class="cb-art-count t-body2-reg">${a.versions.length} vers.</span>
        <svg class="ic cb-art-chev" width="16" height="16" viewBox="0 0 16 16"><use href="#cb-chevright"/></svg>
      </button>
      <div class="cb-vers" data-vers="${i}">${vers}</div>
    </div>`;
  }).join('');
}

function paintPicker() {
  $('popList').innerHTML = artifactRows(open.typeKey, open.layerKey, $('popSearch').value);
  /* Height is measured after paint so the version list animates from a
     real number rather than a guess. */
  const box = $('popList').querySelector(`.cb-vers[data-vers="${expanded}"]`);
  if (box) box.style.maxHeight = box.scrollHeight + 'px';
}

/* The popover is fixed-position: it sits under its cell, flips above
   when there is no room below, and shifts inside the viewport edges. */
function placePicker() {
  const pop = $('pop');
  const r = open.cell.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  const M = 12;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(M, Math.min(left, window.innerWidth - w - M));
  let top = r.bottom + 8;
  if (top + h > window.innerHeight - M) {
    const above = r.top - 8 - h;
    top = above >= M ? above : Math.max(M, window.innerHeight - h - M);
  }
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
}

function openPicker(cell) {
  closePicker();
  open = { typeKey: cell.dataset.type, layerKey: cell.dataset.layer, cell };
  expanded = null;
  cell.classList.add('is-open');
  $('popSearch').value = '';
  const pop = $('pop');
  pop.classList.add('is-open');
  paintPicker();
  placePicker();
  requestAnimationFrame(() => pop.classList.add('is-shown'));
  $('popSearch').focus();
}

function closePicker() {
  if (!open) return;
  open.cell.classList.remove('is-open');
  $('pop').classList.remove('is-open', 'is-shown');
  open = null;
  expanded = null;
}

function pick(artIndex, version) {
  const art = (CATALOG[open.typeKey] || [])[artIndex];
  if (!art) return;
  selection[open.typeKey][open.layerKey] = { name: art.name, version };
  const { typeKey, layerKey } = open;
  closePicker();
  renderMatrix();
  refreshCount();
  /* Keep the keyboard on the cell that was just filled. */
  const cell = $('matrix').querySelector(`.cb-cell[data-type="${typeKey}"][data-layer="${layerKey}"]`);
  if (cell) cell.focus();
}

/* ── Wiring ──────────────────────────────────────────────────────── */
$('matrix').addEventListener('click', (e) => {
  const clear = e.target.closest('[data-clear]');
  if (clear) {
    const cell = clear.closest('.cb-cell');
    delete selection[cell.dataset.type][cell.dataset.layer];
    closePicker();
    renderMatrix();
    refreshCount();
    return;
  }
  const cell = e.target.closest('.cb-cell');
  if (!cell) return;
  if (open && open.cell === cell) { closePicker(); return; }
  openPicker(cell);
});

/* The remove affordance inside a cell is a span (a button inside a
   button is invalid), so it takes its own keyboard handling. */
$('matrix').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const clear = e.target.closest('[data-clear]');
  if (!clear) return;
  e.preventDefault();
  clear.click();
});

$('popList').addEventListener('click', (e) => {
  /* This handler re-renders the list, which detaches e.target. The
     document-level outside-click handler below would then see a node
     that is no longer inside #pop and close the picker, so the event
     stops here. */
  e.stopPropagation();
  const ver = e.target.closest('[data-pick]');
  if (ver) { pick(Number(ver.dataset.pick), ver.dataset.v); return; }
  const head = e.target.closest('[data-toggle]');
  if (!head) return;
  const i = Number(head.dataset.toggle);
  expanded = expanded === i ? null : i;
  paintPicker();
  placePicker();
});

$('popSearch').addEventListener('input', () => { expanded = null; paintPicker(); placePicker(); });
$('popNew').addEventListener('click', () => { /* hook up your create-artifact flow */ });

document.addEventListener('click', (e) => {
  if (!open) return;
  /* A node detached by a re-render cannot be tested for containment;
     it came from inside the picker, so it is never an outside click. */
  if (!e.target.isConnected) return;
  if (e.target.closest('#pop, .cb-cell')) return;
  closePicker();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && open) { const c = open.cell; closePicker(); c.focus(); }
});
window.addEventListener('resize', () => { if (open) placePicker(); });
/* Capture phase: the scroll happens on .cb-scroll, not the window. */
window.addEventListener('scroll', () => { if (open) placePicker(); }, true);

/* Required fields turn red only once they have been used and left empty. */
[['bundleName', 'fieldName'], ['bundleDesc', 'fieldDesc']].forEach(([input, field]) => {
  $(input).addEventListener('input', () => { $(field).classList.remove('is-invalid'); refreshCount(); });
  $(input).addEventListener('blur', () => {
    $(field).classList.toggle('is-invalid', !$(input).value.trim());
  });
});

$('createBtn').addEventListener('click', () => { /* hook up your submit */ });

renderMatrix();
refreshCount();
})();
