'use strict';
/* ══ VIEW: Glossary ════════════════════════════════════════════════ */
(function () {
/* ── Glossary ────────────────────────────────────────────────────────
   A catalogue of term sets. The list furniture is the Model hub / Skills
   pattern; clicking an entry opens the detail panel. */


/* Demo fixtures — replace with your API payload. `versions` are
   newest-first; the one flagged `latest` gets the badge. */
const GLOSSARIES = [
  { name: 'Risk & Compliance Terms', layer: 'domain', terms: 24, by: 'Hemavathi', updated: 'Jul 28, 2026',
    tags: ['Risk', 'Compliance'],
    desc: 'Standard enterprise risk, regulatory compliance definitions and controls lexicon. Includes critical audit vocabulary.',
    versions: [
      { v: 'v3.0', latest: true, status: 'published', terms: 24, updated: 'Jul 28, 2026' },
      { v: 'v2.0', status: 'published', terms: 20, updated: 'Mar 15, 2026' },
      { v: 'v1.0', status: 'draft',     terms: 18, updated: 'Jan 10, 2026' },
    ] },
  { name: 'Privacy & Security Concepts', layer: 'solution', terms: 20, by: 'Marcus', updated: 'Aug 12, 2026',
    tags: ['Privacy', 'Security'],
    desc: 'Core concepts and regulations surrounding data protection and user privacy rights across industries.',
    versions: [
      { v: 'v2.1', latest: true, status: 'published', terms: 20, updated: 'Aug 12, 2026' },
      { v: 'v2.0', status: 'published', terms: 17, updated: 'May 04, 2026' },
    ] },
  { name: 'Operational Risk Processes', layer: 'domain', terms: 18, by: 'Leila', updated: 'Jun 30, 2026',
    tags: ['Risk', 'Operations'],
    desc: 'Essential workflows and controls to mitigate operational risks within financial institutions.',
    versions: [
      { v: 'v1.4', latest: true, status: 'published', terms: 18, updated: 'Jun 30, 2026' },
      { v: 'v1.3', status: 'published', terms: 16, updated: 'Feb 18, 2026' },
    ] },
  { name: 'Regulatory Frameworks', layer: 'organization', terms: 22, by: 'Samuel', updated: 'Aug 05, 2026',
    tags: ['Compliance'],
    desc: 'Comprehensive overview of global regulatory standards impacting compliance operations.',
    versions: [
      { v: 'v2.2', latest: true, status: 'published', terms: 22, updated: 'Aug 05, 2026' },
      { v: 'v2.1', status: 'draft', terms: 21, updated: 'Jul 09, 2026' },
    ] },
  { name: 'Data Governance Policies', layer: 'domain', terms: 19, by: 'Anika', updated: 'Jul 14, 2026',
    tags: ['Governance', 'Data'],
    desc: 'Guidelines and best practices for managing data integrity, access, and compliance across organizations.',
    versions: [
      { v: 'v1.9', latest: true, status: 'published', terms: 19, updated: 'Jul 14, 2026' },
      { v: 'v1.8', status: 'published', terms: 19, updated: 'Apr 22, 2026' },
    ] },
  { name: 'Cybersecurity Measures', layer: 'domain', terms: 15, by: 'Jamal', updated: 'Aug 19, 2026',
    tags: ['Security'],
    desc: 'Key technologies and protocols designed to safeguard information systems against threats and intrusion.',
    versions: [
      { v: 'v1.2', latest: true, status: 'published', terms: 15, updated: 'Aug 19, 2026' },
    ] },
  { name: 'Telemedicine Innovations', layer: 'solution', terms: 12, by: 'Maya', updated: 'Aug 22, 2026',
    tags: ['Healthcare'],
    desc: 'Advancements in remote healthcare services enabling patient consultation and monitoring via video.',
    versions: [
      { v: 'v1.1', latest: true, status: 'draft', terms: 12, updated: 'Aug 22, 2026' },
      { v: 'v1.0', status: 'published', terms: 10, updated: 'Jun 11, 2026' },
    ] },
  { name: 'Medical Device Compliance', layer: 'solution', terms: 14, by: 'Ravi', updated: 'Aug 09, 2026',
    tags: ['Healthcare', 'Compliance'],
    desc: 'Standards and certifications required to ensure the safety and effectiveness of medical equipment.',
    versions: [
      { v: 'v3.0', latest: true, status: 'published', terms: 14, updated: 'Aug 09, 2026' },
      { v: 'v2.4', status: 'published', terms: 13, updated: 'Mar 02, 2026' },
    ] },
  { name: 'Clinical Trial Vocabulary', layer: 'solution', terms: 18, by: 'Maya', updated: 'Jul 21, 2026',
    tags: ['Healthcare', 'Research'],
    desc: 'Terminology used across trial phases, endpoints, consent and adverse-event reporting.',
    versions: [
      { v: 'v1.5', latest: true, status: 'published', terms: 18, updated: 'Jul 21, 2026' },
    ] },
  { name: 'Financial Reporting Terms', layer: 'organization', terms: 20, by: 'Samuel', updated: 'Aug 16, 2026',
    tags: ['Finance', 'Compliance'],
    desc: 'Statement, disclosure and audit terminology as used in quarterly and annual reporting.',
    versions: [
      { v: 'v4.0', latest: true, status: 'published', terms: 20, updated: 'Aug 16, 2026' },
      { v: 'v3.6', status: 'published', terms: 19, updated: 'May 28, 2026' },
    ] },
  { name: 'Customer Support Lexicon', layer: 'organization', terms: 16, by: 'Hemavathi', updated: 'Aug 25, 2026',
    tags: ['Support'],
    desc: 'Ticket states, severity language and resolution vocabulary shared by every support surface.',
    versions: [
      { v: 'v2.0', latest: true, status: 'published', terms: 16, updated: 'Aug 25, 2026' },
    ] },
  { name: 'Supply Chain Definitions', layer: 'domain', terms: 21, by: 'Anika', updated: 'Jun 05, 2026',
    tags: ['Operations', 'Data'],
    desc: 'Sourcing, logistics and inventory terms standardised across planning and fulfilment.',
    versions: [
      { v: 'v1.7', latest: true, status: 'published', terms: 21, updated: 'Jun 05, 2026' },
      { v: 'v1.6', status: 'draft', terms: 20, updated: 'Feb 27, 2026' },
    ] },
];

const DATE_RANGES = [
  { key: 'any',  label: 'Any time' },
  { key: '30',   label: 'Last 30 days' },
  { key: '90',   label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
];

/* An avatar tint per author, keyed off the name so a person keeps the
   same colour on every surface. */
const AV_TINTS = ['#0d99ff', '#14ae5c', '#5860ed', '#9747ff', '#dd7c0e', '#00a2c2', '#e91e63'];
function tint(name) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n = (n + name.charCodeAt(i)) % AV_TINTS.length;
  return AV_TINTS[n];
}

const state = {
  layer: 'all',
  query: '',
  tags: new Set(),
  people: new Set(),
  range: 'any',
  view: 'grid',
  selected: null,
};

const ALL_TAGS = [...new Set(GLOSSARIES.flatMap((g) => g.tags))].sort();
const ALL_AUTHORS = [...new Set(GLOSSARIES.map((g) => g.by))].sort();

/* Dates are display strings in the fixtures, so the range filter parses
   them. With real data, filter on the timestamp instead. */
function monthsAgo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return Infinity;
  const now = new Date('2026-09-02');
  return (now - d) / (1000 * 60 * 60 * 24);
}

function visible() {
  const q = state.query.trim().toLowerCase();
  return GLOSSARIES.filter((g) => {
    if (state.layer !== 'all' && g.layer !== state.layer) return false;
    if (q && !g.name.toLowerCase().includes(q) && !g.desc.toLowerCase().includes(q)) return false;
    if (state.tags.size && !g.tags.some((t) => state.tags.has(t))) return false;
    if (state.people.size && !state.people.has(g.by)) return false;
    if (state.range !== 'any') {
      const days = monthsAgo(g.updated);
      if (state.range === '30' && days > 30) return false;
      if (state.range === '90' && days > 92) return false;
      if (state.range === 'year' && new Date(g.updated).getFullYear() !== 2026) return false;
    }
    return true;
  });
}

/* ── Layer tabs ──────────────────────────────────────────────────── */
function renderTabs() {
  const counts = { all: GLOSSARIES.length };
  LAYERS.forEach((l) => { counts[l.key] = GLOSSARIES.filter((g) => g.layer === l.key).length; });
  const tab = (key, label, dot) => `
    <button class="gl-tab t-body2-reg${state.layer === key ? ' is-active' : ''}"
            role="tab" aria-selected="${state.layer === key}" data-layer="${key}">
      ${dot ? `<span class="gl-dot" data-layer="${key}"></span>` : ''}
      ${label}
      <span class="gl-tab-count t-caption1-reg">${counts[key]}</span>
    </button>`;
  $('glTabs').innerHTML = tab('all', 'All', false)
    + LAYERS.map((l) => tab(l.key, esc(l.label), true)).join('');
}

/* ── Cards and table ─────────────────────────────────────────────── */
function author(g) {
  return `<span class="gl-who">
    <span class="av" style="background:${tint(g.by)}">${esc(g.by.charAt(0))}</span>
    <span class="nm2 t-caption1-reg">${esc(g.by)}</span>
  </span>`;
}
function badge(layer) {
  const l = LAYERS.find((x) => x.key === layer);
  return `<span class="gl-badge t-caption1-med" data-layer="${layer}">
    <span class="gl-dot"></span>${esc(l ? l.label : layer)}
  </span>`;
}

function render() {
  const list = visible();
  $('glCount').textContent = list.length;

  $('glGrid').hidden = state.view !== 'grid';
  $('glTableWrap').hidden = state.view !== 'table';

  if (!list.length) {
    const msg = '<p class="gl-empty t-body2-reg">No glossaries match these filters.</p>';
    $('glGrid').innerHTML = msg;
    $('glTableRows').innerHTML = msg;
    return;
  }

  $('glGrid').innerHTML = list.map((g) => `
    <button class="gl-card${state.selected === g.name ? ' is-selected' : ''}" data-name="${esc(g.name)}" aria-haspopup="dialog">
      <span class="gl-card-top">
        ${badge(g.layer)}
        <span class="terms t-caption1-reg">${g.versions.length} vers.</span>
      </span>
      <span class="nm t-body1-med">${esc(g.name)}</span>
      <p class="desc t-caption1-reg">${esc(g.desc)}</p>
      ${author(g)}
    </button>`).join('');

  $('glTableRows').innerHTML = list.map((g) => `
    <button class="gl-trow${state.selected === g.name ? ' is-selected' : ''}" data-name="${esc(g.name)}">
      <span class="gl-tcell">
        <span class="gl-tname">
          <span class="nm t-body2-med">${esc(g.name)}</span>
          <span class="desc t-caption1-reg">${esc(g.desc)}</span>
        </span>
      </span>
      <span class="gl-tcell">${badge(g.layer)}</span>
      <span class="gl-tcell num t-body2-reg">${g.terms}</span>
      <span class="gl-tcell">${author(g)}</span>
      <span class="gl-tcell date t-body2-reg">${esc(g.updated)}</span>
    </button>`).join('');
}

/* ── Detail panel ────────────────────────────────────────────────── */
function openPanel(name) {
  const g = GLOSSARIES.find((x) => x.name === name);
  if (!g) return;
  state.selected = name;
  const l = LAYERS.find((x) => x.key === g.layer);
  $('gpPanelBadge').dataset.layer = g.layer;
  $('gpPanelLayer').textContent = l ? l.label : g.layer;
  $('gpPanelTitle').textContent = g.name;
  $('gpPanelDesc').textContent = g.desc;
  $('gpPanelVersions').innerHTML = g.versions.map((v) => `
    <div class="gl-ver">
      <div class="gl-ver-top">
        <span class="v t-body1-med">${esc(v.v)}</span>
        ${v.latest ? '<span class="gl-latest t-caption1-med">Latest</span>' : ''}
        <span class="spacer"></span>
        <span class="gl-status t-caption1-med" data-s="${esc(v.status)}">${v.status === 'published' ? 'Published' : 'Draft'}</span>
      </div>
      <div class="gl-ver-meta">
        <span class="t-caption1-reg">${v.terms} terms</span>
        <span class="t-caption1-reg">Updated on ${esc(v.updated)}</span>
      </div>
    </div>`).join('');
  $('gpPanel').classList.add('is-open');
  $('gpPanel').setAttribute('aria-hidden', 'false');
  $('scrim').classList.add('is-open');
  render();
  $('gpPanelClose').focus();
}

function closePanel() {
  state.selected = null;
  $('gpPanel').classList.remove('is-open');
  $('gpPanel').setAttribute('aria-hidden', 'true');
  $('scrim').classList.remove('is-open');
  render();
}

/* ── Filter popovers ─────────────────────────────────────────────── */
const POPS = [
  { btn: 'tagsBtn', pop: 'tagsPop', chev: 'tagsChev', focus: 'tagSearch' },
  { btn: 'whoBtn',  pop: 'whoPop',  chev: 'whoChev',  focus: 'whoSearch' },
  { btn: 'dateBtn', pop: 'datePop', chev: 'dateChev' },
];
function closePops() {
  POPS.forEach((f) => {
    $(f.pop).classList.remove('is-open');
    $(f.btn).classList.remove('is-open');
    $(f.btn).setAttribute('aria-expanded', 'false');
    $(f.chev).firstElementChild.setAttribute('href', '#ic-arrowdown');
  });
}
POPS.forEach((f) => {
  $(f.btn).addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = $(f.pop).classList.contains('is-open');
    closePops();
    if (wasOpen) return;
    $(f.pop).classList.add('is-open');
    $(f.btn).classList.add('is-open');
    $(f.btn).setAttribute('aria-expanded', 'true');
    $(f.chev).firstElementChild.setAttribute('href', '#ic-arrowup');
    if (f.focus) $(f.focus).focus();
  });
});

/* Tags and Created by are checkbox lists with a search; Any time is a
   single ticked choice. Same three shapes the Model hub uses. */
function renderTagsPop() {
  const q = $('tagSearch').value.trim().toLowerCase();
  const hits = ALL_TAGS.filter((t) => !q || t.toLowerCase().includes(q));
  $('tagsList').innerHTML = hits.length
    ? hits.map((t) => `
        <button class="tag-opt t-body2-reg${state.tags.has(t) ? ' is-checked' : ''}" data-tag="${esc(t)}">
          <span class="box"><svg viewBox="0 0 20 20"><use href="#ic-tick"/></svg></span>
          <span class="lbl">${esc(t)}</span>
        </button>`).join('')
    : `<p class="pop-empty t-body2-reg">No tags match “${esc($('tagSearch').value)}”.</p>`;
}
function renderWhoPop() {
  const q = $('whoSearch').value.trim().toLowerCase();
  const hits = ALL_AUTHORS.filter((a) => !q || a.toLowerCase().includes(q));
  $('whoList').innerHTML = hits.length
    ? hits.map((a) => `
        <button class="tag-opt t-body2-reg${state.people.has(a) ? ' is-checked' : ''}" data-who="${esc(a)}">
          <span class="box"><svg viewBox="0 0 20 20"><use href="#ic-tick"/></svg></span>
          <span class="av" style="background:${tint(a)}">${esc(a.charAt(0))}</span>
          <span class="lbl">${esc(a)}</span>
        </button>`).join('')
    : `<p class="pop-empty t-body2-reg">No people match “${esc($('whoSearch').value)}”.</p>`;
}
function renderDatePop() {
  $('dateList').innerHTML = DATE_RANGES.map((r) => `
    <button class="tag-opt t-body2-reg${state.range === r.key ? ' is-picked' : ''}" data-range="${r.key}">
      <span class="lbl">${esc(r.label)}</span>
      <svg class="ic tick" width="20" height="20" viewBox="0 0 20 20"><use href="#ic-tick"/></svg>
    </button>`).join('');
}

function syncCounts() {
  $('tagsCount').textContent = state.tags.size;
  $('tagsBtn').classList.toggle('has-count', state.tags.size > 0);
  $('whoCount').textContent = state.people.size;
  $('whoBtn').classList.toggle('has-count', state.people.size > 0);
}

/* ── Wiring ──────────────────────────────────────────────────────── */
$('glTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.gl-tab');
  if (!t) return;
  state.layer = t.dataset.layer;
  renderTabs();
  render();
});

$('glSearch').addEventListener('input', (e) => { state.query = e.target.value; render(); });

$('tagsList').addEventListener('click', (e) => {
  const o = e.target.closest('[data-tag]');
  if (!o) return;
  e.stopPropagation();
  const t = o.dataset.tag;
  state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t);
  syncCounts(); renderTagsPop(); render();
});
$('tagSearch').addEventListener('input', renderTagsPop);
$('tagSearch').addEventListener('click', (e) => e.stopPropagation());
$('tagNew').addEventListener('click', (e) => e.stopPropagation());

/* Multi-select, so the popover stays open as choices are made. */
$('whoList').addEventListener('click', (e) => {
  const o = e.target.closest('[data-who]');
  if (!o) return;
  e.stopPropagation();
  const a = o.dataset.who;
  state.people.has(a) ? state.people.delete(a) : state.people.add(a);
  syncCounts(); renderWhoPop(); render();
});
$('whoSearch').addEventListener('input', renderWhoPop);
$('whoSearch').addEventListener('click', (e) => e.stopPropagation());
$('dateList').addEventListener('click', (e) => {
  const o = e.target.closest('[data-range]');
  if (!o) return;
  state.range = o.dataset.range;
  $('dateLabel').textContent = (DATE_RANGES.find((r) => r.key === state.range) || {}).label;
  renderDatePop(); closePops(); render();
});

$('viewGrid').addEventListener('click', () => setView('grid'));
$('viewTable').addEventListener('click', () => setView('table'));
function setView(v) {
  state.view = v;
  $('viewGrid').classList.toggle('is-active', v === 'grid');
  $('viewTable').classList.toggle('is-active', v === 'table');
  $('viewGrid').setAttribute('aria-pressed', String(v === 'grid'));
  $('viewTable').setAttribute('aria-pressed', String(v === 'table'));
  render();
}

/* One handler for both views: the card and the row carry the same key. */
function onPick(e) {
  const el = e.target.closest('[data-name]');
  if (!el) return;
  const name = el.dataset.name;
  if (state.selected === name) { closePanel(); return; }
  openPanel(name);
}
$('glGrid').addEventListener('click', onPick);
$('glTableRows').addEventListener('click', onPick);

$('gpPanelClose').addEventListener('click', closePanel);
$('scrim').addEventListener('click', () => { closePops(); closePanel(); });
document.addEventListener('click', (e) => {
  if (e.target.closest('.filter-group')) return;
  closePops();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closePops();
  if (state.selected) closePanel();
});

/* Left as no-ops for you to wire. */
$('newGlossary').addEventListener('click', () => {});
$('panelOpen').addEventListener('click', () => {});

renderTabs();
renderTagsPop();
renderWhoPop();
renderDatePop();
syncCounts();
render();
})();
