const root = document.documentElement;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ic = (id, n) => `<svg class="cq-ic" width="${n || 16}" height="${n || 16}" viewBox="0 0 16 16"><use href="#${id}"/></svg>`;
const initial = n => String(n).trim().charAt(0).toUpperCase();

const state = { src: 'workspace', q: '', type: 'all', view: 'card', owners: new Set(), tags: new Set(), st: 'any', sel: -1 };
const list = () => state.src === 'marketplace' ? MARKET : AGENTS;

const matchQ = a => {
  const q = state.q.trim().toLowerCase();
  return !q || `${a.name} ${a.desc} ${a.by} ${a.endpoint || ''} ${(a.tags || []).join(' ')}`.toLowerCase().includes(q);
};
const matchType  = a => state.type === 'all' || a.type === state.type;
const matchOwner = a => !state.owners.size || state.owners.has(a.by);
const matchTag   = a => !state.tags.size || (a.tags || []).some(t => state.tags.has(t));
const matchState = a => state.st === 'any' || a.state === state.st;

const filtered = (src) => (src || list()).map((a, i) => ({ a, i }))
  .filter(({ a }) => matchQ(a) && matchType(a) && matchOwner(a) && matchTag(a) && matchState(a));

function render() {
  const rows = filtered();
  const card = state.view === 'card';

  $('agGrid').hidden = !card || !rows.length;
  $('agTable').hidden = card || !rows.length;
  $('agEmpty').hidden = !!rows.length;

  if (card) $('agGrid').innerHTML = rows.map(({ a, i }) => cardHTML(a, i)).join('');
  else      $('agRows').innerHTML = rows.map(({ a, i }) => rowHTML(a, i)).join('');

  if (state.sel >= 0) {
    const el = document.querySelector(`${card ? '.ag-card' : '.cq-row'}[data-i="${state.sel}"]`);
    if (el) el.classList.add('is-selected');
  }

  const total = list().length;
  $('agCount').innerHTML = rows.length === total
    ? `<b>${total}</b> ${state.src === 'marketplace' ? 'agents in the marketplace' : 'agents in this workspace'}`
    : `<b>${rows.length}</b> of ${total} agents`;

  counts();
}

/* Sidebar counts follow the collection on show, so switching to the
   marketplace re-counts rather than leaving the workspace's numbers
   lying beside a different list. */
function counts() {
  const L = list();
  const n = f => L.filter(f).length;
  $('nAll').textContent    = L.length;
  $('nAgent').textContent  = n(a => a.type === 'agent');
  $('nOrch').textContent   = n(a => a.type === 'orchestrator');
  $('nRemote').textContent = n(a => a.type === 'remote');
  $('wsCount').textContent = AGENTS.length;
  $('mkCount').textContent = MARKET.length;
}

/* ════════════════════════════════════════════════════════════════════
   FILTER POPOVERS
   ════════════════════════════════════════════════════════════════════ */
function closeAllPops() {
  document.querySelectorAll('.cq-pop.is-open').forEach(p => p.classList.remove('is-open'));
  document.querySelectorAll('.cq-dropdown.is-open').forEach(b => { b.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); });
}
function wirePop(btnId, popId) {
  $(btnId).addEventListener('click', e => {
    e.stopPropagation();
    const open = $(popId).classList.contains('is-open');
    closeAllPops();
    if (!open) {
      $(popId).classList.add('is-open');
      $(btnId).classList.add('is-open');
      $(btnId).setAttribute('aria-expanded', 'true');
    }
  });
  $(popId).addEventListener('click', e => e.stopPropagation());
}
wirePop('ownerBtn', 'ownerPop');
wirePop('tagBtn', 'tagPop');
wirePop('stateBtn', 'statePop');
document.addEventListener('click', closeAllPops);

function multiList(hostId, values, set, searchId, badgeId, repaint) {
  const q = ($(searchId).value || '').toLowerCase();
  const shown = values.filter(v => v.toLowerCase().includes(q));
  $(hostId).innerHTML = shown.length ? shown.map(v => `
    <button class="cq-option ${set.has(v) ? 'is-checked' : ''}" data-v="${esc(v)}">
      <span class="cq-checkbox ${set.has(v) ? 'is-checked' : ''}">${ic('i-check', 12)}</span>
      <span class="cq-option__label">${esc(v)}</span>
    </button>`).join('') : '<p class="cq-pop__empty cq-body2-reg">Nothing matches</p>';
  $(badgeId).textContent = set.size;
  $(badgeId).closest('.cq-dropdown').classList.toggle('has-count', set.size > 0);
  $(hostId).onclick = e => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    set.has(b.dataset.v) ? set.delete(b.dataset.v) : set.add(b.dataset.v);
    repaint(); render();
  };
}
const OWNERS = () => [...new Set(list().map(a => a.by))].sort();
const TAGS   = () => [...new Set(list().flatMap(a => a.tags || []))].sort();
const paintOwners = () => multiList('ownerList', OWNERS(), state.owners, 'ownerSearch', 'ownerBadge', paintOwners);
const paintTags   = () => multiList('tagList', TAGS(), state.tags, 'tagSearch', 'tagBadge', paintTags);
$('ownerSearch').addEventListener('input', paintOwners);
$('tagSearch').addEventListener('input', paintTags);

const STATES = [['any', 'Any status'], ...Object.entries(STATE).map(([k, v]) => [k, v.label])];
function paintStates() {
  $('stateList').innerHTML = STATES.map(([k, l]) => `
    <button class="cq-option ${state.st === k ? 'is-picked' : ''}" data-k="${k}">
      <span class="cq-option__label">${l}</span>
      <svg class="cq-ic cq-option__tick" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-tick"/></svg>
    </button>`).join('');
  $('stateLabel').textContent = STATES.find(s => s[0] === state.st)[1];
}
$('stateList').addEventListener('click', e => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  state.st = b.dataset.k;
  paintStates(); render(); closeAllPops();
});

/* ════════════════════════════════════════════════════════════════════
   TYPE, SOURCE, VIEW
   ════════════════════════════════════════════════════════════════════ */
$('sideType').addEventListener('click', e => {
  const b = e.target.closest('[data-type]');
  if (!b) return;
  $('sideType').querySelectorAll('.cq-nav-item').forEach(n => {
    const on = n === b;
    n.classList.toggle('is-active', on);
    n.setAttribute('aria-selected', String(on));
  });
  state.type = b.dataset.type;
  state.sel = -1; closePanel(); render();
});

function cqSegSync(seg) {
  if (!seg) return;
  const thumb = seg.querySelector(':scope > .cq-seg__thumb');
  const active = seg.querySelector(':scope > button.is-active');
  if (!thumb || !active) return;
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.transform = `translateX(${active.offsetLeft - 4}px)`;
}
$('srcTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-src]');
  if (!b) return;
  $('srcTabs').querySelectorAll('[data-src]').forEach(x => {
    const on = x === b;
    x.classList.toggle('is-active', on);
    x.setAttribute('aria-selected', String(on));
  });
  state.src = b.dataset.src;
  /* The two collections have different people and different tags, so a
     filter carried across would silently hide everything. */
  state.owners.clear(); state.tags.clear(); state.st = 'any';
  state.sel = -1; closePanel();
  $('agQ').placeholder = state.src === 'marketplace' ? 'Search the marketplace' : 'Search agents';
  /* Creating an agent belongs to the workspace, not the marketplace. */
  $('newWrap').hidden = state.src === 'marketplace';
  paintOwners(); paintTags(); paintStates();
  cqSegSync($('srcTabs')); render();
});
addEventListener('resize', () => cqSegSync($('srcTabs')));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => cqSegSync($('srcTabs')));

$('agQ').addEventListener('input', e => { state.q = e.target.value; state.sel = -1; closePanel(); render(); });

function setView(v) {
  state.view = v;
  $('viewCardBtn').classList.toggle('is-active', v === 'card');
  $('viewListBtn').classList.toggle('is-active', v === 'list');
  $('viewCardBtn').setAttribute('aria-pressed', String(v === 'card'));
  $('viewListBtn').setAttribute('aria-pressed', String(v === 'list'));
  render();
}
$('viewCardBtn').addEventListener('click', () => setView('card'));
$('viewListBtn').addEventListener('click', () => setView('list'));

/* ════════════════════════════════════════════════════════════════════
   THE CREATE MENU
   ════════════════════════════════════════════════════════════════════ */
let menuOpen = false;
function setMenu(on) {
  menuOpen = on;
  $('newBtn').setAttribute('aria-expanded', String(on));
  $('newPop').classList.toggle('is-open', on);
}
$('newBtn').addEventListener('click', e => { e.stopPropagation(); const next = !menuOpen; closeAllPops(); setMenu(next); });
$('newPop').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('[data-new]');
  if (!b) return;
  setMenu(false);
  if (b.dataset.new === 'remote') openWiz();
  else toast(b.dataset.new === 'agent' ? 'Opening the agent builder…' : 'Opening the orchestrator builder…');
});
document.addEventListener('click', () => { if (menuOpen) setMenu(false); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (menuOpen) { setMenu(false); $('newBtn').focus(); }
  closeAllPops();
});

/* ════════════════════════════════════════════════════════════════════
   DETAIL PANEL
   ════════════════════════════════════════════════════════════════════ */
const kv = (k, v) => `<div class="cq-kv"><span class="cq-kv__k">${esc(k)}</span><span class="cq-kv__v">${v}</span></div>`;
const section = (label, body) =>
  `<div class="cq-panel__section"><span class="cq-section-label cq-caption-med">${label}</span>${body}</div>`;

function openPanel(i) {
  const a = list()[i];
  if (!a) return;
  state.sel = i;
  document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  const el = document.querySelector(`${state.view === 'card' ? '.ag-card' : '.cq-row'}[data-i="${i}"]`);
  if (el) el.classList.add('is-selected');

  const market = state.src === 'marketplace';
  const s = STATE[a.state];

  $('pBadges').innerHTML = badge(TYPE[a.type].tone, TYPE[a.type].label) +
    (market ? `<span class="cq-tag">${a.installs} installs</span>`
            : `<span class="cq-status" data-tone="${s.tone}"><span class="cq-status--dot"></span>${s.label}</span>`);
  $('pIc').outerHTML = `<img class="ag-panel-mark" id="pIc" src="${markFor(a)}" alt="" width="40" height="40" />`;
  $('pName').textContent = a.name;
  $('pKind').textContent = a.type === 'remote'
    ? `Runs on ${a.server}` : `Built in Cogentiq · by ${a.by}`;
  $('pDesc').textContent = a.desc;

  /* A marketplace agent is not yours yet, so the leading action adds it
     to the workspace rather than running it. */
  $('pRunLbl').textContent = market ? 'Add to workspace' : 'Run agent';
  $('pEditLbl').textContent = market ? 'Preview' : (a.type === 'remote' ? 'Connection' : 'Edit');

  const out = [];

  if (a.problem) {
    out.push(section('NEEDS ATTENTION',
      `<p class="cq-caption-reg" style="margin:0;color:var(--text-coloured-red)">${esc(a.problem)}</p>`));
  }

  if (a.type === 'remote') {
    const direct = a.conn === 'direct';
    const protocolLabel = a.conn === 'rest' ? 'REST via managed adapter'
      : direct ? 'Direct connection, manifest defined by you'
      : 'A2A, called directly';
    const note = a.conn === 'rest'
      ? `<p class="ag-note cq-caption-reg" style="margin-top:8px">This service is not A2A-native. Cogentiq wraps it in a managed adapter and publishes it on the Cogentiq Managed A2A server.</p>`
      : direct
      ? `<p class="ag-note cq-caption-reg" style="margin-top:8px">No discovery and no auto-built adapter — Cogentiq calls this endpoint exactly as mapped below.</p>`
      : '';
    out.push(section('CONNECTION',
      kv('Endpoint', `<span class="ag-mono">${esc(a.endpoint)}</span>`) +
      kv(direct ? 'Connection' : 'A2A server', esc(a.server)) +
      kv('Protocol', protocolLabel) +
      kv('Auth', esc(a.auth)) +
      kv(direct ? 'Skill' : 'Agent cards', (a.cards || []).map(esc).join(', ') || '—') +
      (direct ? kv('Request', `<span class="ag-mono">${esc(a.reqMethod || 'POST')} ${esc(a.reqPath || '—')}</span>`) : '') +
      (direct ? kv('Message field', `<span class="ag-mono">${esc(a.msgField || '—')}</span>`) : '') +
      (direct ? kv('Response field', `<span class="ag-mono">${esc(a.respField || '—')}</span>`) : '') +
      (direct && a.ctxField ? kv('Session field', `<span class="ag-mono">${esc(a.ctxField)}</span>`) : '') +
      note));
    out.push(section('SKILLS PUBLISHED',
      `<div class="ag-skills">${(a.agentSkills || []).map(k => `<span class="cq-tag" data-tone="cyan">${esc(k)}</span>`).join('') || '<span class="cq-caption-reg cq-text-tertiary">None declared</span>'}</div>`));
  } else {
    out.push(section('CONFIGURATION',
      kv('Model', esc(a.model)) +
      (a.parent ? kv('Orchestrated by', esc(a.parent)) : '')));

    /* A count answers "how many"; the names answer "which" — which is
       the question somebody opening an agent actually has. */
    const bound = (label, icon, list, tone) => (list && list.length)
      ? section(`${label} · ${list.length}`,
          `<div class="ag-pills">${list.map(n =>
            `<span class="ag-pill">${ic(icon, 13)}${esc(n)}</span>`).join('')}</div>`)
      : '';
    out.push(bound('TOOLS', 'i-wrench', a.tools));
    out.push(bound('SKILLS', 'ic-pp_skill', a.skills));
    out.push(bound('GUARDRAILS', 'ic-pp_guardrails', a.guards));
  }

  if (a.members) {
    out.push(section(`SUB-AGENTS · ${a.members.length}`,
      `<div>${a.members.map(m => `
        <div class="ag-member">
          <span class="cq-avatar">${initial(m.name)}</span>
          <span class="ag-member__id">
            <span class="cq-body2-reg cq-truncate">${esc(m.name)}</span>
            <span class="ag-member__role cq-caption-reg cq-truncate">${esc(m.role)}</span>
          </span>
          ${m.remote ? badge('cyan', 'Remote', 'i-globe') : ''}
        </div>`).join('')}</div>`));
  }

  /* An agent is rarely run by hand — it is wired into something. Knowing
     what breaks if you change it belongs next to the agent itself. */
  const uses = a.usedBy || [];
  if (!market) {
    out.push(section(`USED BY · ${uses.length}`, uses.length
      ? `<div>${uses.map(u => `
          <div class="ag-member">
            <span class="ag-used__ic">${ic(u.kind === 'automation' ? 'i-flow' : 'ic-pp_aiassistant', 15)}</span>
            <span class="ag-member__id">
              <span class="cq-body2-reg cq-truncate">${esc(u.name)}</span>
              <span class="ag-member__role cq-caption-reg cq-truncate">${u.kind === 'automation' ? 'Automation' : 'Assistant'}</span>
            </span>
          </div>`).join('')}</div>`
      : `<p class="ag-note cq-caption-reg">Nothing uses this agent yet. It can still be run on its own.</p>`));
  }

  out.push(section('ABOUT',
    (market ? kv('Publisher', esc(a.by)) + kv('Installs', String(a.installs))
            : kv('Runs (30d)', a.runs.toLocaleString()) + kv('Created by', esc(a.by))) +
    kv('Last updated', esc(a.updated)) +
    kv('Tags', (a.tags || []).map(t => `<span class="cq-tag" data-tone="${tone(t)}">${esc(t)}</span>`).join(' ') || '—')));

  $('pBody').innerHTML = out.join('');
  $('panel').classList.add('is-open');
  $('panel').setAttribute('aria-hidden', 'false');
}
function closePanel() {
  $('panel').classList.remove('is-open');
  $('panel').setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  state.sel = -1;
}
$('panelClose').addEventListener('click', closePanel);
$('pRun').addEventListener('click', () => {
  const a = list()[state.sel];
  if (!a) return;
  if (state.src === 'marketplace') return toast(`${a.name} added to this workspace.`);
  if (a.state === 'error')  return toast('This agent cannot run until its connection is fixed.');
  if (a.state === 'review') return toast('Waiting on governance approval — it will run once approved.');
  toast(`Running ${a.name}…`);
});
$('pEdit').addEventListener('click', () => toast('Opening the builder…'));

/* One handler per view: an activation opens the panel; the kebab takes
   its own action without opening it. */
function wireInventory(hostId, sel) {
  $(hostId).addEventListener('click', e => {
    const host = e.target.closest(sel);
    if (!host) return;
    if (e.target.closest('[data-more]')) { e.stopPropagation(); return toast('Duplicate · Export · Archive'); }
    openPanel(+host.dataset.i);
  });
  $(hostId).addEventListener('keydown', e => {
    const host = e.target.closest(sel);
    if (!host || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    openPanel(+host.dataset.i);
  });
}
wireInventory('agGrid', '.ag-card');
wireInventory('agRows', '.cq-row');

/* ── Toast ── */
let toastT;
function toast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('is-open');
  requestAnimationFrame(() => $('toast').classList.add('is-shown'));
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    $('toast').classList.remove('is-shown');
    setTimeout(() => $('toast').classList.remove('is-open'), 220);
  }, 3200);
}

/* ════════════════════════════════════════════════════════════════════
   REGISTER A REMOTE AGENT
   Three steps, because registering something that already runs has
   three real questions: which server and how it speaks, which of the
   things it publishes to take, and what to call the result.
   ════════════════════════════════════════════════════════════════════ */
const wiz = {
  step: 1, proto: 'direct', srvId: null, pick: null, regOpen: false, found: null, regAuth: {},
  integId: null, integOpen: false, niAuth: 'bearer',
  cardAuth: 'bearer', csOpen: false, restFile: null, restOk: false
};
/* Human label for each auth type, shared by the review and the panel so
   neither has to keep its own copy of the mapping. */
const AUTH_LABEL = {
  bearer: 'Bearer token', apikey: 'API key', oauth: 'OAuth 2.0',
  basic: 'Basic auth', mtls: 'mTLS (client certificate)', none: 'None'
};
/* The reverse, for reading a card's declared mechanism back into the
   radio that asks for its credential — so the badge on the card and the
   option selected under it never disagree. */
const AUTH_KEY = {
  'API key (Bearer)': 'apikey', 'API key': 'apikey', 'OAuth 2.0': 'oauth',
  'mTLS': 'mtls', 'mTLS (client certificate)': 'mtls', 'Basic auth': 'basic', 'None': 'none'
};
const slugify = s => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'skill';
const curServer = () => SERVERS.find(s => s.id === wiz.srvId);
const curInteg = () => INTEGRATIONS.find(i => i.id === wiz.integId);

/* What validating an uploaded API document reports back. A prototype
   cannot parse a file it was handed, but the shape of the answer — the
   spec version, the server it names, and how many operations came out
   of it — is what the step is really showing. */
const SPEC_RESULT = { version: 'OpenAPI 3.0.3', url: 'https://api.weatherco.com/v2', auth: 'API key (declared in the spec)' };

function openWiz() {
  Object.assign(wiz, {
    step: 1, proto: 'direct', srvId: null, pick: null, regOpen: false, found: null, regAuth: {},
    integId: null, integOpen: false, niAuth: 'bearer',
    cardAuth: 'bearer', csOpen: false, restFile: null, restOk: false
  });
  [
    'regName', 'regUrl', 'wizName', 'wizDesc', 'srvSearch', 'csSearch',
    'cardBearer', 'cardApiKey', 'cardApiKeyHeader', 'cardUsername', 'cardPassword',
    'cardClientId', 'cardClientSecret', 'cardCert'
  ].forEach(id => { $(id).value = ''; });
  setSrvOpen(false);
  setIntegOpen(false);
  setCsOpen(false);
  $('cardApiKeyHeader').value = 'X-API-Key';
  paintRestFile();
  paintCardAuth();
  $('wizScrim').classList.add('is-open');
  paintWiz();
  setTimeout(() => $('wizNext').focus(), 60);
}
const closeWiz = () => $('wizScrim').classList.remove('is-open');
$('wizX').addEventListener('click', closeWiz);
$('wizCancel').addEventListener('click', closeWiz);
$('wizScrim').addEventListener('click', e => { if (e.target === $('wizScrim')) closeWiz(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  /* The sheet sits over the wizard, so it goes first. */
  if ($('intScrim').classList.contains('is-open')) return closeInt();
  if ($('cmpScrim').classList.contains('is-open')) return closeCmp();
  if ($('wizScrim').classList.contains('is-open')) closeWiz();
});

/* The comparison sheet opens over the wizard and closes back to it, so
   the choice it explains never leaves the screen. */
const closeCmp = () => $('cmpScrim').classList.remove('is-open');
$('cmpOpen').addEventListener('click', () => $('cmpScrim').classList.add('is-open'));
$('cmpX').addEventListener('click', closeCmp);
$('cmpDone').addEventListener('click', closeCmp);
$('cmpScrim').addEventListener('click', e => { if (e.target === $('cmpScrim')) closeCmp(); });

$('protoCards').addEventListener('click', e => {
  const b = e.target.closest('[data-proto]');
  if (!b) return;
  wiz.proto = b.dataset.proto;
  wiz.pick = null;
  paintWiz();
});

/* Matches the way people type: every word has to appear somewhere, in
   any order. A plain substring test fails "partner 7" against "Partner
   Server 7", which is exactly the query someone would use. */
function matches(hay, q) {
  const t = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!t.length) return true;
  const h = hay.toLowerCase();
  return t.every(w => h.includes(w));
}

/* ── The server combobox ──
   One field and a searchable list. The field carries the answer; the
   list only exists while it is open, so the step's height never depends
   on how many servers the workspace has. */
let srvOpen = false;
function setSrvOpen(on) {
  srvOpen = on;
  $('srvPop').classList.toggle('is-open', on);
  $('srvField').setAttribute('aria-expanded', String(on));
  if (on) {
    $('srvSearch').value = '';
    paintServers();
    setTimeout(() => {
      $('srvSearch').focus();
      $('srvPop').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
  }
}
function paintServers() {
  const cur = curServer();
  $('srvName').textContent = cur ? cur.name : 'Choose a server';
  $('srvName').classList.toggle('is-empty', !cur);
  $('srvSub').textContent = cur
    ? `${cur.url} · ${cur.cards.length} agent card${cur.cards.length === 1 ? '' : 's'}`
    : `${SERVERS.length} registered`;

  const q = $('srvSearch').value || '';
  const shown = SERVERS.filter(x => matches(`${x.name} ${x.url}`, q));
  $('srvList').innerHTML = shown.length ? shown.map(x => `
    <button class="ag-opt ${wiz.srvId === x.id ? 'is-on' : ''}" data-srv="${x.id}" role="option"
            aria-selected="${wiz.srvId === x.id}">
      <span class="ag-opt__ic">${ic(x.managed ? 'ic-logoonly' : 'i-server', 18)}</span>
      <span class="ag-opt__id">
        <span class="ag-opt__name cq-body2-med">${esc(x.name)}</span>
        <span class="ag-opt__sub cq-caption-reg"><span class="ag-mono">${esc(x.url)}</span> · ${x.cards.length} agent card${x.cards.length === 1 ? '' : 's'}</span>
      </span>
      <svg class="cq-ic ag-opt__tick" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-tick"/></svg>
    </button>`).join('')
    : `<p class="ag-combo__empty cq-caption-reg">No server matches “${esc(q.trim())}”.</p>`;
}
$('srvField').addEventListener('click', e => { e.stopPropagation(); setSrvOpen(!srvOpen); });
$('srvPop').addEventListener('click', e => e.stopPropagation());
$('srvSearch').addEventListener('input', paintServers);
$('srvList').addEventListener('click', e => {
  const b = e.target.closest('[data-srv]');
  if (!b) return;
  wiz.srvId = b.dataset.srv;
  /* A different server publishes different cards, so a selection made
     against the old one cannot carry over. */
  wiz.pick = null;
  setSrvOpen(false);
  paintWiz();
});
document.addEventListener('click', () => { if (srvOpen) setSrvOpen(false); });

/* ── The integration select ──
   Same shape as the server combobox — one field, a list underneath —
   but the list is richer because an integration's name alone does not
   say what it points at, and the create action lives in the field. */
function setIntegOpen(on) {
  wiz.integOpen = on;
  $('intSel').classList.toggle('is-open', on);
  $('intField').setAttribute('aria-expanded', String(on));
  if (on) paintIntegs();
}

function paintIntegs() {
  const cur = curInteg();
  $('intName').textContent = cur ? cur.name : 'Select integration';
  $('intName').classList.toggle('is-empty', !cur);

  let sub = $('intVal').querySelector('.ag-sel__sub');
  if (cur && !sub) {
    sub = document.createElement('span');
    sub.className = 'ag-sel__sub cq-caption-reg';
    $('intVal').querySelector('.ag-sel__txt').appendChild(sub);
  }
  if (sub) sub.textContent = cur ? `${cur.url} · ${cur.auth}` : '';
  if (sub && !cur) sub.remove();

  $('intList').innerHTML = INTEGRATIONS.length ? INTEGRATIONS.map(x => `
    <button class="ag-opt ${wiz.integId === x.id ? 'is-on' : ''}" data-integ="${esc(x.id)}" role="option"
            aria-selected="${wiz.integId === x.id}" type="button">
      <span class="ag-opt__ic">${ic('i-link', 18)}</span>
      <span class="ag-opt__id">
        <span class="ag-opt__name cq-body2-med">${esc(x.name)}</span>
        <span class="ag-opt__sub cq-caption-reg">${esc(x.desc)}</span>
      </span>
      <svg class="cq-ic ag-opt__tick" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-tick"/></svg>
    </button>`).join('')
    : '<p class="ag-sel__empty cq-caption-reg">No integrations yet — create one to get started.</p>';
}

$('intField').addEventListener('click', e => { e.stopPropagation(); setIntegOpen(!wiz.integOpen); });
$('intPop').addEventListener('click', e => e.stopPropagation());
$('intList').addEventListener('click', e => {
  const b = e.target.closest('[data-integ]');
  if (!b) return;
  wiz.integId = b.dataset.integ;
  /* A different integration publishes different cards, so a selection
     made against the old one cannot carry over. */
  wiz.pick = null;
  setIntegOpen(false);
  paintWiz();
});
document.addEventListener('click', () => { if (wiz.integOpen) setIntegOpen(false); });

/* ── Creating one ──
   Over the wizard, not instead of it: the half-filled registration
   behind this modal is still there when it closes. */
const closeInt = () => $('intScrim').classList.remove('is-open');
function openInt() {
  wiz.niAuth = 'bearer';
  ['niName', 'niDesc', 'niUrl', 'niBearer', 'niApiKey', 'niClientId', 'niClientSecret',
   'niTokenUrl', 'niUsername', 'niPassword', 'niCert', 'niKey', 'niPath'].forEach(id => { $(id).value = ''; });
  $('niTimeout').value = '60';
  $('niApiKeyHeader').value = 'X-API-Key';
  $('niMethod').value = 'POST';
  $('niMessage').value = '$.query';
  $('niResponse').value = '$.answer';
  paintNiAuth();
  $('intScrim').classList.add('is-open');
  setTimeout(() => $('niName').focus(), 60);
}
function paintNiAuth() {
  $('niAuthRadios').querySelectorAll('[data-niauth]').forEach(b =>
    b.classList.toggle('is-on', b.dataset.niauth === wiz.niAuth));
  document.querySelectorAll('[data-niauth-only]').forEach(el => {
    el.hidden = el.dataset.niauthOnly !== wiz.niAuth;
  });
}
$('intNew').addEventListener('click', e => { e.stopPropagation(); setIntegOpen(false); openInt(); });
$('intX').addEventListener('click', closeInt);
$('niCancel').addEventListener('click', closeInt);
$('intScrim').addEventListener('click', e => { if (e.target === $('intScrim')) closeInt(); });
$('niAuthRadios').addEventListener('click', e => {
  const b = e.target.closest('[data-niauth]');
  if (!b) return;
  wiz.niAuth = b.dataset.niauth;
  paintNiAuth();
});
$('niSave').addEventListener('click', () => {
  const name = $('niName').value.trim();
  const url = $('niUrl').value.trim();
  const path = $('niPath').value.trim();
  if (!name) return toast('Give the integration a name.');
  if (!url) return toast('Give the integration a base URL.');
  if (!path) return toast('Give the request a path.');
  const integ = {
    id: 'i' + Date.now(),
    name,
    desc: $('niDesc').value.trim() || `Connection to ${url.replace(/^https?:\/\//, '')}.`,
    url,
    auth: AUTH_LABEL[wiz.niAuth],
    timeout: +$('niTimeout').value || 60,
    /* An integration is one agent card, so it carries the skill that
       card exposes and the shape of the call behind it. */
    skills: [slugify(name)],
    method: $('niMethod').value,
    path,
    msg: $('niMessage').value.trim() || '$.query',
    resp: $('niResponse').value.trim() || '$.answer'
  };
  INTEGRATIONS = [integ, ...INTEGRATIONS];
  /* Created from the picker, so it is the answer to the picker. */
  wiz.integId = integ.id;
  closeInt();
  paintWiz();
  toast(`${name} created.`);
});

/* The discovered cards, before the server is saved. Auth is editable
   here and nowhere else — this is the one moment somebody has the
   server's own documentation open beside them. */
function paintFound() {
  const has = !!wiz.found;
  $('regFound').hidden = !has;
  $('regEmpty').hidden = has;
  if (!has) return;
  $('regFoundN').textContent = wiz.found.length;
  $('regCards').innerHTML = wiz.found.map((c, i) => `
    <div class="ag-pick">
      <span class="ag-pick__id">
        <span class="ag-pick__name cq-body2-med">${esc(c.name)}</span>
        <span class="ag-pick__sub ag-mono">${esc(c.path)}</span>
        <span class="ag-pick__sub cq-caption-reg">${esc(c.desc)}</span>
      </span>
      <label class="cq-field ag-pick__auth">
        <span class="cq-field__label cq-caption-med">Auth</span>
        <span class="cq-control">
          <select data-auth="${i}">${AUTHS.map(a => `<option ${(wiz.regAuth[i] || c.auth) === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
          ${ic('ic-pp_chevron', 14)}
        </span>
      </label>
    </div>`).join('');
}
$('regOpen').addEventListener('click', () => { wiz.regOpen = true; wiz.found = null; paintWiz(); setTimeout(() => $('regName').focus(), 40); });
$('regCancel').addEventListener('click', () => { wiz.regOpen = false; wiz.found = null; paintWiz(); });
$('regDiscover').addEventListener('click', () => {
  if (!$('regName').value.trim() || !$('regUrl').value.trim()) return toast('Enter a server name and URL first.');
  wiz.found = DISCO.map(c => Object.assign({}, c));
  wiz.regAuth = {};
  paintFound();
  toast(`${wiz.found.length} agent cards discovered on ${$('regUrl').value.trim()}`);
});
$('regCards').addEventListener('change', e => {
  const sel = e.target.closest('[data-auth]');
  if (sel) wiz.regAuth[sel.dataset.auth] = sel.value;
});
$('regSave').addEventListener('click', () => {
  if (!wiz.found) return toast('Discover the server’s agent cards first.');
  const srv = {
    id: 'srv' + Date.now(),
    name: $('regName').value.trim(),
    url: $('regUrl').value.trim().replace(/^https?:\/\//, ''),
    updated: 'just now',
    cards: wiz.found.map((c, i) => Object.assign({}, c, { auth: wiz.regAuth[i] || c.auth }))
  };
  SERVERS = [srv, ...SERVERS];
  Object.assign(wiz, { srvId: srv.id, picks: new Set(), regOpen: false, found: null });
  paintWiz();
  toast(`${srv.name} registered — ${srv.cards.length} agent cards discovered.`);
});

/* ── The agent cards on offer ──
   Only the server route has a choice left to make here. An integration
   is itself one agent card, and an API document describes one agent
   whose skills are its operations — both are already decided by the
   time this step opens. */
function pickItems() {
  if (wiz.proto !== 'a2a') return [];
  const s = curServer();
  return s ? s.cards.map(c => ({ id: c.name, name: c.name, sub: c.path, desc: c.desc, skills: c.skills, tail: c.auth })) : [];
}

function setCsOpen(on) {
  wiz.csOpen = on;
  $('csSel').classList.toggle('is-open', on);
  $('csField').setAttribute('aria-expanded', String(on));
  if (on) { $('csSearch').value = ''; setTimeout(() => $('csSearch').focus(), 40); }
  paintPicks();
}

function paintPicks() {
  const items = pickItems();
  /* Switching servers changes what is on offer; a selection that is no
     longer one of them is not a selection. */
  if (wiz.pick && !items.some(it => it.id === wiz.pick)) wiz.pick = null;
  const q = $('csSearch').value || '';
  const shown = items.filter(it => matches(`${it.name} ${it.desc} ${it.skills.join(' ')}`, q));
  const chosen = items.find(it => it.id === wiz.pick);

  $('step3Note').textContent =
    'One card per agent. To combine several, register them separately and compose them in an orchestrator.';

  $('csName').textContent = chosen ? chosen.name : 'Select an agent card';
  $('csName').classList.toggle('is-empty', !chosen);
  $('csName').classList.toggle('ag-mono', !!(chosen && chosen.mono));
  $('csSub').hidden = !(chosen && (chosen.sub || chosen.desc));
  if (chosen) $('csSub').textContent = chosen.sub || chosen.desc;

  /* The search only earns its row once there is more to search than fits
     on screen — a direct connection offers exactly one card. */
  $('csSearchWrap').hidden = items.length < 6;

  $('csList').innerHTML = shown.length ? shown.map(it => `
    <button class="ag-opt ${wiz.pick === it.id ? 'is-on' : ''}" data-pick="${esc(it.id)}" type="button"
            role="option" aria-selected="${wiz.pick === it.id}">
      <span class="ag-opt__ic">${ic('ic-pp_agent', 18)}</span>
      <span class="ag-opt__id">
        <span class="ag-opt__name ${it.mono ? 'ag-mono' : 'cq-body2-med'}">${esc(it.name)}</span>
        ${it.sub ? `<span class="ag-opt__sub ag-mono">${esc(it.sub)}</span>` : ''}
        <span class="ag-opt__sub cq-caption-reg">${esc(it.desc)}</span>
        <span class="ag-skills">${it.skills.map(k => `<span class="cq-tag" data-tone="cyan">${esc(k)}</span>`).join('')}</span>
      </span>
      ${it.tail ? badge('grey', it.tail, 'i-key') : ''}
      <svg class="cq-ic ag-opt__tick" width="16" height="16" viewBox="0 0 16 16"><use href="#ic-tick"/></svg>
    </button>`).join('')
    : `<p class="ag-sel__empty cq-caption-reg">${items.length
        ? `Nothing matches “${esc(q.trim())}”.`
        : 'Choose a server on the previous step to see the agent cards it publishes.'}</p>`;

  paintCardAuth();
}

/* The credential belongs to the card, so it is asked for once a card is
   chosen and not before — there is nothing to authenticate against yet. */
function paintCardAuth() {
  const chosen = pickItems().find(it => it.id === wiz.pick);
  $('cardAuth').hidden = !chosen;
  if (chosen) $('cardAuthSub').textContent = `How Cogentiq proves it may call ${chosen.name}.`;
  $('cardAuthRadios').querySelectorAll('[data-cauth]').forEach(b =>
    b.classList.toggle('is-on', b.dataset.cauth === wiz.cardAuth));
  document.querySelectorAll('[data-cauth-only]').forEach(el => {
    el.hidden = el.dataset.cauthOnly !== wiz.cardAuth;
  });

  /* Fetching the card needs the credential, so the document only appears
     once there is one — before that there is nothing honest to show. */
  const ready = !!chosen && cardAuthOK();
  $('cardJsonBox').hidden = !ready;
  if (ready) paintJson('card', `Fetched from <b>${esc(curServer().url)}${esc(chosen.sub || '')}</b>`, cardJSON());
}

$('csField').addEventListener('click', e => { e.stopPropagation(); setCsOpen(!wiz.csOpen); });
$('csPop').addEventListener('click', e => e.stopPropagation());
$('csSearch').addEventListener('input', paintPicks);
$('csList').addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (!b) return;
  wiz.pick = b.dataset.pick;
  /* The card says which mechanism it wants, so start there rather than
     making someone read the badge and match it by hand. */
  const chosen = pickItems().find(it => it.id === wiz.pick);
  if (chosen && AUTH_KEY[chosen.tail]) wiz.cardAuth = AUTH_KEY[chosen.tail];
  setCsOpen(false);
  paintWiz();
});
document.addEventListener('click', () => { if (wiz.csOpen) setCsOpen(false); });
$('cardAuthRadios').addEventListener('click', e => {
  const b = e.target.closest('[data-cauth]');
  if (!b) return;
  wiz.cardAuth = b.dataset.cauth;
  paintWiz();
});
['cardBearer', 'cardApiKey', 'cardUsername', 'cardPassword', 'cardClientId', 'cardClientSecret', 'cardCert']
  .forEach(id => $(id).addEventListener('input', paintWiz));

/* ── The API document ──
   Everything a plain API needs is already in its own spec, so the step
   takes the file and reads it rather than re-asking for its contents. */
function paintRestFile() {
  const f = wiz.restFile;
  $('restDropWrap').hidden = !!f;
  $('restFile').hidden = !f;
  if (!f) return;
  $('restFileName').textContent = f.name;
  $('restSpin').hidden = f.state !== 'checking';
  const sub = $('restFileSub');
  sub.classList.toggle('is-ok', f.state === 'ok');
  sub.classList.toggle('is-bad', f.state === 'bad');
  sub.textContent =
    f.state === 'checking' ? 'Validating…' :
    f.state === 'ok' ? `Valid ${SPEC_RESULT.version} · ${REST_OPS.length} operations · ${SPEC_RESULT.url}`
                     : 'Could not read this file — expected OpenAPI 3.x or an agent manifest.';
}

function takeSpec(name) {
  wiz.restFile = { name, state: 'checking' };
  wiz.restOk = false;
  wiz.pick = null;
  paintWiz();
  /* Validation is work, and work that finishes instantly reads as work
     that never happened — the spinner is the only reason to believe it. */
  setTimeout(() => {
    if (!wiz.restFile || wiz.restFile.name !== name) return;
    wiz.restFile.state = 'ok';
    wiz.restOk = true;
    paintWiz();
  }, 900);
}

const specInput = Object.assign(document.createElement('input'), {
  type: 'file', accept: '.json,.yaml,.yml', hidden: true
});
document.body.appendChild(specInput);
specInput.addEventListener('change', () => {
  const f = specInput.files && specInput.files[0];
  if (f) takeSpec(f.name);
  specInput.value = '';
});
$('restDrop').addEventListener('click', () => specInput.click());
$('restSample').addEventListener('click', () => takeSpec('weatherco-openapi.json'));
$('restFileX').addEventListener('click', () => {
  wiz.restFile = null; wiz.restOk = false; wiz.pick = null;
  paintWiz();
});
['dragover', 'dragleave', 'drop'].forEach(type =>
  $('restDrop').addEventListener(type, e => {
    e.preventDefault();
    $('restDrop').classList.toggle('is-over', type === 'dragover');
    if (type !== 'drop') return;
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) takeSpec(f.name);
  }));

/* ── The agent this wizard would create, as it stands ──
   The preview, the review rows and the registration itself all read
   this one function, so what the last step shows and what the
   workspace gets cannot drift apart. */
function draft() {
  const name = $('wizName').value.trim();
  const desc = $('wizDesc').value.trim();
  const base = {
    name, type: 'remote',
    /* Registered, not live — it enters governance review first. */
    state: 'review',
    by: 'You', tags: [], updated: 'just now', runs: 0
  };

  if (wiz.proto === 'a2a') {
    const s = curServer();
    const card = s ? s.cards.find(c => c.name === wiz.pick) : null;
    return Object.assign(base, {
      conn: 'a2a',
      desc: desc || (card ? card.desc : `A2A client over ${s ? s.name : 'the server'}.`),
      endpoint: s ? s.url : '',
      server: s ? s.name : '',
      auth: AUTH_LABEL[wiz.cardAuth],
      cards: card ? [card.name] : [],
      agentSkills: card ? card.skills : []
    });
  }

  if (wiz.proto === 'direct') {
    const i = curInteg();
    return Object.assign(base, i ? {
      conn: 'direct',
      desc: desc || i.desc,
      endpoint: i.url.replace(/^https?:\/\//, ''),
      server: i.name,
      auth: i.auth,
      cards: [i.name],
      agentSkills: i.skills,
      reqMethod: i.method, reqPath: i.path, msgField: i.msg, respField: i.resp
    } : { conn: 'direct', desc, endpoint: '', server: '', auth: '—', cards: [], agentSkills: [] });
  }

  /* One agent for the whole document, with a skill per operation — the
     spec is the definition, so there is nothing left to choose. */
  return Object.assign(base, {
    conn: 'rest',
    desc: desc || `Wraps ${SPEC_RESULT.url} as an agent, with one skill for each of its ${REST_OPS.length} operations.`,
    endpoint: SPEC_RESULT.url.replace(/^https?:\/\//, ''),
    server: 'Cogentiq Managed A2A',
    auth: SPEC_RESULT.auth,
    cards: [name],
    agentSkills: REST_OPS.map(o => o.skill)
  });
}

/* ── The Agent Card itself ──
   Every route ends holding one: the server returns it, the managed
   adapter generates it from the uploaded spec, or it is built from the
   integration. Same document either way — an A2A Agent Card — so the
   three routes can be read against each other. */
function cardJSON() {
  if (wiz.proto === 'a2a') {
    const s = curServer();
    const c = s && s.cards.find(x => x.name === wiz.pick);
    if (!c) return {};
    return {
      name: c.name,
      description: c.desc,
      version: '1.0.0',
      url: `https://${s.url}${c.path.replace(/\.json$/, '')}`,
      provider: { organization: s.name },
      capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
      authentication: { schemes: [AUTH_LABEL[wiz.cardAuth]] },
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: c.skills.map(id => ({
        id,
        name: id.split('.').pop().replace(/^./, ch => ch.toUpperCase()),
        description: c.desc,
        tags: id.split('.')
      }))
    };
  }

  if (wiz.proto === 'direct') {
    const i = curInteg();
    if (!i) return {};
    return {
      name: i.name,
      description: i.desc,
      version: '1.0.0',
      url: i.url,
      capabilities: { streaming: false, pushNotifications: false },
      authentication: { schemes: [i.auth] },
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: i.skills.map(id => ({ id, name: i.name, description: i.desc, tags: id.split('.') })),
      /* The part a direct connection maps by hand — kept on the card so
         the adapter can rebuild the call from this document alone. */
      adapter: {
        request: { method: i.method, path: i.path, message: i.msg },
        response: { text: i.resp },
        timeoutSeconds: i.timeout
      }
    };
  }

  return {
    name: $('wizName').value.trim() || 'Untitled agent',
    description: $('wizDesc').value.trim()
      || `Generated from ${wiz.restFile ? wiz.restFile.name : 'the uploaded document'}.`,
    version: '1.0.0',
    url: `${SPEC_RESULT.url}/a2a`,
    provider: { organization: 'Cogentiq Managed A2A' },
    capabilities: { streaming: false, pushNotifications: false },
    authentication: { schemes: [SPEC_RESULT.auth] },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: REST_OPS.map(o => ({
      id: o.skill,
      name: o.op,
      description: o.desc,
      tags: o.skill.split('.')
    }))
  };
}

/* Colours the values by type. The JSON is generated here, so this only
   ever sees what JSON.stringify produced — no parser needed. */
const jsonHTML = obj => esc(JSON.stringify(obj, null, 2))
  .replace(/^(\s*)(&quot;[^&]*?&quot;)(:)/gm, '$1<span class="ag-json__k">$2</span>$3')
  .replace(/: (&quot;.*?&quot;)/g, ': <span class="ag-json__s">$1</span>')
  .replace(/: (-?\d+\.?\d*)/g, ': <span class="ag-json__n">$1</span>')
  .replace(/: (true|false|null)/g, ': <span class="ag-json__b">$1</span>')
  .replace(/^(\s*)(&quot;.*?&quot;)(,?)$/gm, '$1<span class="ag-json__s">$2</span>$3');

function paintJson(prefix, source, obj) {
  $(prefix + 'JsonSrc').innerHTML = source;
  $(prefix + 'JsonBody').innerHTML = jsonHTML(obj);
}

/* Copy buttons, for the two blocks that carry a card. */
['card', 'prev'].forEach(prefix => {
  $(prefix + 'JsonCopy').addEventListener('click', async () => {
    const btn = $(prefix + 'JsonCopy');
    try {
      await navigator.clipboard.writeText(JSON.stringify(cardJSON(), null, 2));
      btn.textContent = 'Copied';
    } catch {
      /* file:// and older browsers refuse the clipboard; say so rather
         than leaving the button looking like it worked. */
      btn.textContent = 'Press ⌘C';
      const r = document.createRange();
      r.selectNodeContents($(prefix + 'JsonBody'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  });
});

function paintReview() {
  const a = draft();
  const skills = a.agentSkills || [];

  $('agentPreview').innerHTML = `
    <img class="ag-prev__mark" src="${markFor(a)}" alt="" />
    <span class="ag-prev__id">
      <span class="ag-prev__top">
        <span class="ag-prev__name cq-body1-med">${esc(a.name || 'Untitled agent')}</span>
        ${badge('grey', 'Remote')}
        ${badge('orange', 'In review')}
      </span>
      <span class="ag-prev__desc cq-body2-reg">${esc(a.desc)}</span>
      ${skills.length ? `<span class="ag-prev__skills">${skills.map(k =>
        `<span class="cq-tag" data-tone="cyan">${esc(k)}</span>`).join('')}</span>` : ''}
    </span>`;

  const rows = [];
  if (a.conn === 'a2a') {
    rows.push(kv('Protocol', 'A2A, called directly'));
    rows.push(kv('A2A server', esc(a.server || '—')));
  } else if (a.conn === 'direct') {
    rows.push(kv('Protocol', 'Direct connection'));
    rows.push(kv('Integration', esc(a.server || '—')));
  } else {
    rows.push(kv('Protocol', 'REST via managed adapter'));
    rows.push(kv('Served from', esc(a.server)));
    rows.push(kv('API document', esc(wiz.restFile ? wiz.restFile.name : '—')));
  }
  rows.push(kv('Endpoint', `<span class="ag-mono">${esc(a.endpoint || '—')}</span>`));
  if (a.reqPath) rows.push(kv('Request', `<span class="ag-mono">${esc(a.reqMethod)} ${esc(a.reqPath)}</span>`));
  rows.push(kv('Auth', esc(a.auth)));
  $('wizReview').innerHTML = rows.join('');

  paintJson('prev',
    a.conn === 'direct'
      ? `Built from the <b>${esc(a.server)}</b> integration`
      : `Generated by the managed adapter from <b>${esc(wiz.restFile ? wiz.restFile.name : 'the uploaded document')}</b>`,
    cardJSON());
}

/* Whether the step in front of you is answered. The Continue button
   reads this rather than each step deciding for itself, so a new step
   has one place to declare what "done" means. */
/* The credential the chosen auth mechanism actually needs. "None" needs
   nothing, which is the whole point of offering it. */
function cardAuthOK() {
  const a = wiz.cardAuth;
  if (a === 'none') return true;
  if (a === 'bearer') return !!$('cardBearer').value.trim();
  if (a === 'apikey') return !!$('cardApiKey').value.trim();
  if (a === 'mtls') return !!$('cardCert').value.trim();
  if (a === 'oauth') return !!$('cardClientId').value.trim() && !!$('cardClientSecret').value.trim();
  return !!$('cardUsername').value.trim() && !!$('cardPassword').value.trim();
}

function stepOK() {
  if (wiz.step === 1) return !!$('wizName').value.trim();
  if (wiz.step === 2) {
    if (wiz.proto === 'a2a') return !!curServer();
    if (wiz.proto === 'direct') return !!curInteg();
    return wiz.restOk;
  }
  /* Only the server route still has a question on the last step. */
  if (wiz.proto !== 'a2a') return true;
  return !!wiz.pick && cardAuthOK();
}
function stepHint() {
  if (wiz.step === 1) return stepOK() ? '' : 'Give the agent a name.';
  if (wiz.step === 2) {
    if (wiz.proto === 'a2a') return curServer() ? '' : 'Choose a server, or register a new one.';
    if (wiz.proto === 'direct') return curInteg() ? '' : 'Choose an integration, or create a new one.';
    if (!wiz.restFile) return 'Upload the API document that describes this service.';
    return wiz.restOk ? '' : 'Wait for the document to finish validating.';
  }
  if (wiz.proto !== 'a2a') return '';
  if (!wiz.pick) return 'Select an agent card.';
  return cardAuthOK() ? '' : 'Enter the credentials for this card.';
}

function paintWiz() {
  document.querySelectorAll('.ag-pane').forEach(p => { p.hidden = +p.dataset.pane !== wiz.step; });
  document.querySelectorAll('[data-only]').forEach(el => { el.hidden = el.dataset.only !== wiz.proto; });
  $('regForm').hidden = !(wiz.proto === 'a2a' && wiz.regOpen);
  /* An integration is one agent card and a spec describes one agent, so
     only the server route has a card left to choose — and where that
     choice is still being made, it is the whole step. */
  $('pickerGroup').hidden = wiz.proto !== 'a2a';
  $('previewGroup').hidden = wiz.proto === 'a2a';

  $('wizSteps').querySelectorAll('[data-step]').forEach(b => {
    const on = +b.dataset.step === wiz.step;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  cqSegSync($('wizSteps'));

  document.querySelectorAll('[data-proto]').forEach(b => b.classList.toggle('is-on', b.dataset.proto === wiz.proto));

  /* The card select is the last thing every route does. Only the
     manifest above it is route-specific. */

  if (wiz.step === 2) { paintServers(); paintFound(); paintIntegs(); paintRestFile(); }
  if (wiz.step === 3) {
    paintPicks();
    if (wiz.proto !== 'a2a') paintReview();
  }

  /* A step is a fresh screen, so it starts at its own top — otherwise
     step 3 opens scrolled to wherever step 2 was left. */
  $('wizBody').scrollTop = 0;
  $('wizBack').hidden = wiz.step === 1;
  $('wizNext').textContent = wiz.step === 3 ? 'Register agent' : 'Continue';
  $('wizNext').setAttribute('aria-disabled', String(!stepOK()));
  $('wizHint').textContent = stepHint();
}

[
  'wizName'
].forEach(id => $(id).addEventListener('input', paintWiz));
$('wizSteps').addEventListener('click', e => {
  const b = e.target.closest('[data-step]');
  /* Only backwards: a later step has nothing to show until the one
     before it has been answered. */
  if (!b || +b.dataset.step >= wiz.step) return;
  wiz.step = +b.dataset.step;
  paintWiz();
});
$('wizBack').addEventListener('click', () => { wiz.step = Math.max(1, wiz.step - 1); paintWiz(); });
$('wizNext').addEventListener('click', () => {
  if (!stepOK()) return toast(stepHint());
  if (wiz.step < 3) { wiz.step += 1; return paintWiz(); }
  createRemote();
});

function createRemote() {
  const a = draft();
  AGENTS = [a, ...AGENTS];

  closeWiz();
  state.src = 'workspace'; state.type = 'remote'; state.q = ''; state.st = 'any';
  state.owners.clear(); state.tags.clear();
  $('agQ').value = '';
  $('newWrap').hidden = false;
  $('srcTabs').querySelectorAll('[data-src]').forEach(b => b.classList.toggle('is-active', b.dataset.src === 'workspace'));
  $('sideType').querySelectorAll('.cq-nav-item').forEach(n => n.classList.toggle('is-active', n.dataset.type === 'remote'));
  paintOwners(); paintTags(); paintStates();
  cqSegSync($('srcTabs'));
  render();
  openPanel(0);
  toast(`${a.name} registered — awaiting governance approval.`);
}

/* ════════════════════════════════════════════════════════════════════
   PLATFORM PANEL: hover to open, one category open at a time
   ════════════════════════════════════════════════════════════════════ */
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

/* ── Theme ── */
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

/* ── Boot ── */
/* The menu shows the mark of the thing each option will make, in colour:
   this is a chooser, not an inventory, so there is nothing to keep calm. */
$('markAgent').src = MARK.single.blue;
$('markOrch').src  = MARK.orch.purple;

paintOwners();
paintTags();
paintStates();
render();
cqSegSync($('srcTabs'));
