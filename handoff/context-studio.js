/* ═══════════════════════════════════════════════════════════════════
   CONTEXT STUDIO — page behaviour. Loads after cogentiq.js, which
   defines $ and root and owns the rail and the theme toggle.

   1 · HERO dot highlight — a bright copy of the dot grid revealed
       through a 150px mask centred on the cursor, written to --mx/--my
       once per animation frame and faded 0 -> .5 over 450ms.
   2 · EXPLAINER CARD — minimised on arrival, opens itself after
       4500ms. The header toggles it and cancels the timer.
   3 · BUNDLE GRID -> DETAIL PANEL — click a card to open the 420px
       panel (280ms slide); closes on the x, outside click, Escape, or
       re-clicking the card.
   4 · SEARCH — filters the grid live on input.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Context bundles ────────────────────────────────────────────── */
/* An artifact is one cell of the bundle's selection matrix: a type, the
   layer it was picked from, and the pinned version. Types carry the same
   icons and one-liners the create screen lists them with. */
const TYPES = {
  glossary:  { label: 'Glossary',        note: 'Standard terms and definitions',   icon: 'cx-book20'   },
  ontology:  { label: 'Ontology',        note: 'Relationships and hierarchies',    icon: 'cx-branch20' },
  data:      { label: 'Data Binding',    note: 'Connections to data sources',      icon: 'cx-db20'     },
  prompts:   { label: 'Prompts',         note: 'Pre-configured prompt templates',  icon: 'cx-edit20'   },
  tools:     { label: 'Tool Binding',    note: 'Integrations with external APIs',  icon: 'cx-tool20'   },
  rules:     { label: 'Rules & Policies', note: 'Business rules and governance',   icon: 'cx-shield20' },
};
/* House order for the three context layers, narrowest scope first:
   Solution > Organization > Domain. Everything that lists the layers
   reads this array, so the hierarchy is stated in one place. */
const LAYERS = [
  { key: 'solution',     label: 'Solution'     },
  { key: 'organization', label: 'Organization' },
  { key: 'domain',       label: 'Domain'       },
];

const BUNDLES = [
  { icon: 'cx-b-indigo', size: 24, name: 'Customer Support',          desc: 'This bundle is created for Microsoft business data reference', count: '12 artifacts', book: false, owner: 'S',
    creator: 'Savio Govindu', created: 'Aug 12, 2026', updated: 'Aug 28, 2026',
    artifacts: [
      { layer: 'domain',       type: 'glossary', name: 'Customer Glossary',        version: 'v2.1' },
      { layer: 'domain',       type: 'ontology', name: 'Support Ontology',         version: 'v1.4' },
      { layer: 'organization', type: 'data',     name: 'Zendesk Tickets',          version: 'v3.0' },
      { layer: 'organization', type: 'prompts',  name: 'Tier-1 Reply Templates',   version: 'v1.2' },
      { layer: 'organization', type: 'tools',    name: 'Zendesk API',              version: 'v2.0' },
      { layer: 'solution',     type: 'rules',    name: 'Refund Approval Policy',   version: 'v1.1' },
    ] },
  { icon: 'cx-b-green',  size: 23, name: 'Customer Support Bundle',   desc: 'This bundle is created for Microsoft business data reference', count: '7 artifacts',  book: true,  owner: 'S',
    creator: 'Savio Govindu', created: 'Jul 28, 2026', updated: 'Aug 19, 2026',
    artifacts: [
      { layer: 'domain',       type: 'glossary', name: 'Customer Glossary',        version: 'v2.0' },
      { layer: 'organization', type: 'data',     name: 'CRM Accounts',            version: 'v1.7' },
      { layer: 'organization', type: 'tools',    name: 'Teams Notifier',          version: 'v1.0' },
      { layer: 'solution',     type: 'rules',    name: 'Escalation Rules',        version: 'v2.3' },
    ] },
  { icon: 'cx-b-lgreen', size: 23, name: 'Customer Support Bundle',   desc: 'This bundle is created for Microsoft business data reference', count: '7 artifacts',  book: true,  owner: 'S',
    creator: 'Priya Nair', created: 'Jul 28, 2026', updated: 'Aug 14, 2026',
    artifacts: [
      { layer: 'domain',       type: 'glossary', name: 'Product Glossary',        version: 'v1.9' },
      { layer: 'domain',       type: 'ontology', name: 'Product Taxonomy',        version: 'v1.1' },
      { layer: 'organization', type: 'data',     name: 'Product Inventory',       version: 'v12.0' },
      { layer: 'solution',     type: 'prompts',  name: 'Returns Playbook',        version: 'v1.0' },
    ] },
  { icon: 'cx-b-orange', size: 24, name: 'Marketing Analytics Bundle', desc: 'Comprehensive insights for campaign performance',             count: '12 artifacts', book: true,  owner: 'M',
    creator: 'Maya Fernandes', created: 'Jun 30, 2026', updated: 'Aug 25, 2026',
    artifacts: [
      { layer: 'domain',       type: 'glossary', name: 'Marketing Glossary',      version: 'v3.2' },
      { layer: 'domain',       type: 'ontology', name: 'Channel Ontology',        version: 'v2.0' },
      { layer: 'organization', type: 'data',     name: 'Campaign Warehouse',      version: 'v4.1' },
      { layer: 'organization', type: 'tools',    name: 'GA4 Connector',           version: 'v1.6' },
      { layer: 'solution',     type: 'prompts',  name: 'Attribution Briefs',      version: 'v1.3' },
      { layer: 'solution',     type: 'rules',    name: 'Brand Voice Policy',      version: 'v2.2' },
    ] },
  { icon: 'cx-b-purple', size: 24, name: 'Marketing Analytics',       desc: 'Comprehensive insights for campaign performance',              count: '12 artifacts', book: true,  owner: 'M',
    creator: 'Maya Fernandes', created: 'Jun 18, 2026', updated: 'Aug 21, 2026',
    artifacts: [
      { layer: 'domain',       type: 'glossary', name: 'Marketing Glossary',      version: 'v3.1' },
      { layer: 'organization', type: 'data',     name: 'Ad Spend Ledger',         version: 'v2.8' },
      { layer: 'organization', type: 'prompts',  name: 'Weekly Digest Prompt',    version: 'v1.5' },
      { layer: 'solution',     type: 'rules',    name: 'Spend Guardrails',        version: 'v1.0' },
    ] },
  { icon: 'cx-b-blue',   size: 24, name: 'Customer Support Bundle',   desc: 'This bundle is created for Microsoft business data reference', count: '7 artifacts',  book: true,  owner: 'S',
    creator: 'Savio Govindu', created: 'Aug 02, 2026', updated: 'Aug 29, 2026',
    artifacts: [
      { layer: 'domain',       type: 'ontology', name: 'Account Hierarchy',       version: 'v1.2' },
      { layer: 'organization', type: 'data',     name: 'Entitlements Table',      version: 'v1.9' },
      { layer: 'organization', type: 'tools',    name: 'Jira Bridge',             version: 'v3.4' },
      { layer: 'solution',     type: 'rules',    name: 'SLA Policy',              version: 'v2.1' },
    ] },
];

function bundleCard(b) {
  return `
    <button class="bundle-card" data-i="${b.i}" aria-haspopup="dialog">
      <span class="bc-head">
        <svg class="ic" width="${b.size}" height="${b.size}" viewBox="0 0 ${b.size} ${b.size}"><use href="#${b.icon}"/></svg>
        <span class="name t-body2-med">${b.name}</span>
      </span>
      <span class="bc-body">
        <span class="desc t-caption1-reg">${b.desc}</span>
        <span class="bc-foot">
          <span class="bc-chip">${b.count}</span>
          <span class="bc-avatar"><svg class="ic" width="16" height="16" viewBox="0 0 16 16"><use href="#cx-avatar16"/></svg><span>${b.owner}</span></span>
        </span>
      </span>
    </button>`;
}

BUNDLES.forEach((b, i) => { b.i = i; });
let selected = null;

function renderBundles(query) {
  const q = (query || '').trim().toLowerCase();
  const hits = BUNDLES.filter((b) => !q || b.name.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q));
  $('bundleGrid').innerHTML = hits.map(bundleCard).join('');
  $('bundlesEmpty').classList.toggle('is-visible', hits.length === 0);
  markSelected();
}

function markSelected() {
  $('bundleGrid').querySelectorAll('.bundle-card').forEach((el) => {
    el.classList.toggle('is-selected', Number(el.dataset.i) === selected);
  });
}

$('bundleSearch').addEventListener('input', (e) => renderBundles(e.target.value));

/* ── Bundle detail panel ─────────────────────────────────────────────
   The panel reads the bundle's selection matrix: artifacts grouped by
   the layer they were picked from, each showing its type and the pinned
   version — the same shape the create screen builds. */
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function metaRows(b) {
  const initial = esc(b.creator.trim().charAt(0).toUpperCase());
  return [
    ['Created by', `<span class="v who t-body2-reg"><span class="who-avatar"><svg class="ic" width="20" height="20" viewBox="0 0 16 16"><use href="#cx-avatar16"/></svg><span>${initial}</span></span>${esc(b.creator)}</span>`],
    /* One row for both dates: created is the fixed fact, updated the one
       that moves, so the pair reads as a span rather than two lookups. */
    ['Created · updated', `<span class="v t-body2-reg">${esc(b.created)} <span style="color:var(--text-teritiary)">→</span> ${esc(b.updated)}</span>`],
  ].map(([k, v]) => `<div class="row"><span class="k t-body2-reg">${k}</span>${v}</div>`).join('');
}

function artifactGroups(b) {
  return LAYERS.map((layer) => {
    const items = b.artifacts.filter((a) => a.layer === layer.key);
    if (!items.length) return '';
    const rows = items.map((a) => {
      const t = TYPES[a.type];
      return `<div class="art-row">
        <svg class="ic art-ic" width="20" height="20" viewBox="0 0 20 20"><use href="#${t.icon}"/></svg>
        <span class="art-text">
          <span class="nm t-body2-med">${esc(a.name)}</span>
          <span class="ty t-caption1-reg">${esc(t.label)} · ${esc(t.note)}</span>
        </span>
        <span class="ver-pill t-caption1-reg">${esc(a.version)}</span>
      </div>`;
    }).join('');
    return `<div class="layer-group">
      <div class="layer-head">
        <span class="pl-badge t-caption1-med" data-layer="${layer.key}">${layer.label}</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

function openPanel(i) {
  const b = BUNDLES[i];
  if (!b) return;
  selected = i;
  markSelected();
  $('panelIcon').querySelector('use').setAttribute('href', '#' + b.icon);
  $('panelTitle').textContent = b.name;
  $('panelDesc').textContent = b.desc;
  $('panelMeta').innerHTML = metaRows(b);
  $('panelArtHeader').textContent = `ARTIFACTS · ${b.artifacts.length}`;
  $('panelArtifacts').innerHTML = artifactGroups(b)
    || '<p class="panel-empty t-body2-reg">No artifacts in this bundle yet.</p>';
  $('panel').classList.add('is-open');
  $('panel').setAttribute('aria-hidden', 'false');
  $('scrim').classList.add('is-open');
  $('panelClose').focus();
}

function closePanel() {
  selected = null;
  markSelected();
  $('panel').classList.remove('is-open');
  $('panel').setAttribute('aria-hidden', 'true');
  $('scrim').classList.remove('is-open');
}

$('bundleGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.bundle-card');
  if (!card) return;
  const i = Number(card.dataset.i);
  if (i === selected) { closePanel(); return; }
  openPanel(i);
});
$('panelClose').addEventListener('click', closePanel);
$('scrim').addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected !== null) closePanel();
});

/* ── Hero: the dot grid lights up under the pointer ──────────────────
   Coordinates are written to custom properties on the glow layer and
   read by its mask, so the pool follows the cursor without a re-layout.
   Reads are throttled to one per frame. */
(() => {
  const hero = $('hero'), glow = $('heroGlow');
  let queued = false, x = 0, y = 0;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    x = e.clientX - r.left; y = e.clientY - r.top;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      glow.style.setProperty('--mx', x + 'px');
      glow.style.setProperty('--my', y + 'px');
    });
  });
})();

/* ── The explainer opens itself once the page has settled ────────────
   Collapsed on arrival so the artifact list owns the sidebar, then
   revealed after a beat and left open. A manual toggle cancels the
   timer, so the card never reopens over someone who just closed it. */
(() => {
  const card = $('ctxInfo'), body = $('ctxBody'), btn = $('ctxToggle');
  let timer = null;

  function setOpen(open) {
    card.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
  }

  btn.addEventListener('click', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    setOpen(!card.classList.contains('is-open'));
  });

  /* Content can reflow (fonts, wrapping) while open — keep the cap true. */
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (card.classList.contains('is-open')) body.style.maxHeight = body.scrollHeight + 'px';
    }).observe(body);
  }

  setOpen(false);
  timer = setTimeout(() => { timer = null; setOpen(true); }, 4500);
})();

renderBundles('');
