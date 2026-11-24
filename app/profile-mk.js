/* Profile: what you publish to the Marketplace shows in Published the
   moment you submit it, with where its review stands, and stays there
   once it is listed. */
(function () {
  if (typeof PUBS === 'undefined' || typeof paintPublished !== 'function' || !window.cqReview) return;
  var CR = window.cqReview;
  var inShell = window.parent !== window;
  var go = function (m) { if (inShell) parent.postMessage(m, '*'); };

  if (typeof KIND !== 'undefined' && !KIND.agent) KIND.agent = { label: 'Agent', tone: 'indigo', icon: '#ic-pp_agent' };
  if (typeof PUB_TONE !== 'undefined') { PUB_TONE.Rejected = 'red'; PUB_TONE['In review'] = 'orange'; }
  var f = document.getElementById('pfPubFilter');
  if (f && !f.querySelector('[data-k="agent"]')) {
    var b = document.createElement('button');
    b.dataset.k = 'agent'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.textContent = 'Agents';
    var after = f.querySelector('[data-k="all"]');
    after.insertAdjacentElement('afterend', b);
  }

  var mine = [];
  function sync() {
    for (var i = PUBS.length - 1; i >= 0; i--) if (PUBS[i]._mk) PUBS.splice(i, 1);
    mine = CR.items().filter(function (w) { return w.flow === 'publish'; }).sort(function (a, b) { return (b.requestedAt || 0) - (a.requestedAt || 0); });
    mine.slice().reverse().forEach(function (w) {
      var s = CR.stageOf(w);
      PUBS.unshift({ _mk: true, ref: w.ref, kind: w.kind, name: w.name,
        desc: (s.state === 'done' ? '' : CR.stateLabel(w, s) + ' · ' + CR.stepText(w, s) + '. ') + (w.desc || ''),
        v: '1.0', installs: 0, rating: null, status: s.state === 'done' ? 'Listed' : s.state === 'rejected' ? 'Rejected' : 'In review', ws: 'finance', when: 'Today' });
    });
  }
  var _paint = paintPublished;
  paintPublished = function () {
    _paint();
    /* Ours open the review tracker instead of the listing tools. */
    document.querySelectorAll('#pfPubGrid .cq-card').forEach(function (card) {
      var name = (card.querySelector('.cq-card__title') || {}).textContent;
      var w = mine.filter(function (x) { return x.name === name; })[0];
      if (!w) return;
      var acts = card.querySelector('.pf-pub__acts');
      if (acts && !CR.isDone(w)) acts.innerHTML = '<button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-mk-track="' + w.ref + '">Track review</button>';
    });
  };
  document.addEventListener('click', function (e) {
    var pub = e.target.closest('button');
    if (pub && /Publish to marketplace/i.test(pub.textContent || '') && !pub.closest('[data-mk-track]')) { e.stopPropagation(); e.preventDefault(); go({ cqNav: 'agents.html', cqFocus: 'publish' }); return; }
    var t = e.target.closest('[data-mk-track]');
    if (!t) return;
    e.stopPropagation();
    var w = CR.find(t.getAttribute('data-mk-track'));
    if (w) go({ cqNav: w.kind === 'agent' ? 'agents.html' : 'automations.html', cqFocus: 'req:' + w.ref });
  }, true);

  var sig = '';
  function refresh() {
    var now = CR.items().filter(function (w) { return w.flow === 'publish'; }).map(function (w) { var s = CR.stageOf(w); return w.ref + s.i + s.state; }).join('|');
    if (now === sig) return;
    sig = now; sync(); paintPublished();
  }
  CR.onChange(refresh); setInterval(refresh, 800);

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.cqFocus === 'published') { var b = document.querySelector('[data-tab="published"]'); if (b) b.click(); }
  });

  var NAV = { agents: 'agents.html', automations: 'automations.html', monitoring: 'monitoring.html' };
  document.querySelectorAll('[aria-label="Platform"] button[title]').forEach(function (b) {
    var url = NAV[(b.getAttribute('title') || '').trim().toLowerCase()];
    if (!url) return;
    b.addEventListener('click', function (e) { e.stopImmediatePropagation(); go({ cqNav: url }); }, true);
  });
  var market = document.querySelector('.cq-rail-market, .rail-market');
  if (market) market.addEventListener('click', function (e) { e.stopImmediatePropagation(); go({ cqNav: 'marketplace.html' }); }, true);
})();

/* Created vs Published, across every workspace this person belongs to.
   Created is everything they built, wherever it lives; Published is the
   part of it they put on the Marketplace. Both filter by workspace. */
(function () {
  if (typeof PANES === 'undefined' || typeof PUBS === 'undefined' || !window.cqReview) return;
  var CR = window.cqReview;
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var inShell = window.parent !== window;
  var go = function (m) { if (inShell) parent.postMessage(m, '*'); };
  var WSL = (typeof WS !== 'undefined' ? WS : []).map(function (w) { return { id: w.id, name: w.name, role: w.role }; });
  var wsName = function (id) { var w = WSL.filter(function (x) { return x.id === id; })[0]; return w ? w.name : id; };
  var KL = function (k) { return (KIND[k] || { label: k }).label; };

  var CREATED = [
    { kind: 'agent', name: 'Country Rate Checker', ws: 'finance', desc: 'Checks the rates we quote in each country against the approved price list.', edited: '2 days ago', runs: 342, pub: 'crc' },
    { kind: 'agent', name: 'Spare Parts Stock Planner', ws: 'finance', desc: 'Works out how many of each spare part to keep on the shelf.', edited: 'Yesterday', runs: 128, pub: 'spsp' },
    { kind: 'agent', name: 'Returns Note Reader', ws: 'finance', desc: 'Reads handwritten returns notes and pulls out the order number and reason.', edited: 'Last week', runs: 77, pub: 'rnr' },
    { kind: 'automation', name: 'Invoice Extraction Pipeline', ws: 'finance', desc: 'Reads supplier invoices, pulls line items and posts the approved ones to NetSuite.', edited: '3 days ago', runs: 1204, pub: 'iep' },
    { kind: 'automation', name: 'Invoice triage', ws: 'finance', desc: 'Pulls the day’s invoices, checks them against POs and flags the ones that differ.', edited: 'Nov 2025', runs: 2210 },
    { kind: 'automation', name: 'Ticket Triage & First Reply', ws: 'cs', desc: 'Sorts new tickets by urgency and drafts the first reply.', edited: 'Today', runs: 96, pub: 'ttfr' },
    { kind: 'assistant', name: 'Support triage assistant', ws: 'cs', desc: 'Reads a ticket, sets priority and routes it.', edited: 'Feb 2026', runs: 3120 },
    { kind: 'assistant', name: 'Campaign brief writer', ws: 'marketing', desc: 'Turns a product launch into a one-page campaign brief.', edited: '5 days ago', runs: 58 },
    { kind: 'context', name: 'Brand voice context', ws: 'marketing', desc: 'Tone, vocabulary and the words we never use.', edited: 'Apr 2026', runs: 410 },
    { kind: 'automation', name: 'Weekly digest', ws: 'marketing', desc: 'A Monday summary of what changed across the workspace.', edited: 'Sept 2025', runs: 52 },
    { kind: 'skill', name: 'PDF summariser', ws: 'design', desc: 'Turns long PDFs into a page of findings.', edited: 'Jun 2026', runs: 890 },
    { kind: 'skill', name: 'Token linter', ws: 'design', desc: 'Flags hard-coded colours and spacing in component code.', edited: '2 weeks ago', runs: 34 },
    { kind: 'integration', name: 'Snowflake connector', ws: 'data', desc: 'Read-only access to warehouse tables with row-level policies.', edited: 'Aug 2026', runs: 15 }
  ];
  /* Where a created artifact stands on the Marketplace. */
  function market(c) {
    var req = CR.items().filter(function (w) { return w.flow === 'publish' && w.name === c.name; })[0];
    if (req) { var s = CR.stageOf(req); return s.state === 'done' ? ['Published', 'green', req] : s.state === 'rejected' ? ['Rejected', 'red', req] : ['In review', 'orange', req]; }
    var p = PUBS.filter(function (x) { return !x._mk && x.name === c.name; })[0];
    if (p) return [p.status === 'Listed' ? 'Published' : p.status, p.status === 'Listed' ? 'green' : p.status === 'In review' ? 'orange' : 'grey', null];
    return ['Not published', 'grey', null];
  }

  var css = document.createElement('style');
  css.textContent = [
    '.pf-ws{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:-4px 0 4px}',
    '.pf-ws__l{color:var(--text-teritiary);font:400 12px/16px var(--font-geist);margin-right:2px}',
    '.pf-ws button{height:28px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border-radius:14px;border:1px solid var(--strokes-card-default);color:var(--text-secondary);font:500 12px/16px var(--font-geist)}',
    '.pf-ws button .d{width:8px;height:8px;border-radius:50%}',
    '.pf-ws button .n{color:var(--text-teritiary);font-weight:400}',
    '.pf-ws button[aria-pressed="true"]{background:var(--backgrounds-badge-blue);border-color:var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    '.pf-ws button[aria-pressed="true"] .n{color:inherit;opacity:.75}',
    '.pf-ws__role{margin-left:2px;padding:0 5px;border-radius:4px;background:var(--backgrounds-card-bg-4);color:var(--text-teritiary);font:400 10px/14px var(--font-geist)}',
    '.pf-split{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:4px}',
    '.pf-split div{padding:12px 14px;border-radius:12px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);display:flex;flex-direction:column;gap:2px}',
    '.pf-split b{font:500 22px/28px var(--font-geist-mono,monospace)}',
    '.pf-split span{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}'
  ].join('\n');
  document.head.appendChild(css);

  /* The tab, before Published. */
  var pubBtn = document.querySelector('#pfTabs [data-tab="published"]');
  var cBtn = document.createElement('button');
  cBtn.dataset.tab = 'created'; cBtn.setAttribute('role', 'tab'); cBtn.setAttribute('aria-selected', 'false');
  cBtn.innerHTML = 'Created <span class="pf-count" id="pfCreCount"></span>';
  pubBtn.parentNode.insertBefore(cBtn, pubBtn);
  PANES.created = 'pfCreated';

  var pubPane = $('pfPublished');
  var pane = document.createElement('div');
  pane.className = 'pf-pane pf-pub'; pane.id = 'pfCreated'; pane.hidden = true; pane.setAttribute('role', 'tabpanel');
  pane.innerHTML = '<div class="pf-split" id="pfCreSplit"></div>' +
    '<div class="pf-bar"><div class="cq-seg" id="pfCreFilter" role="tablist" aria-label="Filter created artifacts"><span class="cq-seg__thumb" aria-hidden="true"></span></div>' +
    '<span class="pf-bar__spacer"></span><span class="cq-caption-reg" id="pfCreNote" style="color:var(--text-teritiary)"></span></div>' +
    '<div class="pf-ws" id="pfCreWs"></div>' +
    '<div class="cq-card-grid cq-card-grid--3up" id="pfCreGrid"></div>';
  pubPane.parentNode.insertBefore(pane, pubPane);

  var cKind = 'all', cWs = 'all', pWs = 'all';
  function wsRow(id, list, cur, attr) {
    var count = function (ws) { return list.filter(function (x) { return ws === 'all' || x.ws === ws; }).length; };
    var dot = function (id) { var w = (typeof WS !== 'undefined' ? WS : []).filter(function (x) { return x.id === id; })[0]; return w ? '<span class="d" style="background:' + w.hue + '"></span>' : ''; };
    $(id).innerHTML = '<span class="pf-ws__l">Workspace</span>' +
      '<button type="button" ' + attr + '="all" aria-pressed="' + (cur === 'all') + '">All <span class="n">' + count('all') + '</span></button>' +
      WSL.filter(function (w) { return count(w.id); }).map(function (w) {
        return '<button type="button" ' + attr + '="' + w.id + '" aria-pressed="' + (cur === w.id) + '">' + dot(w.id) + E(w.name) + ' <span class="n">' + count(w.id) + '</span>' +
          '<span class="pf-ws__role">' + E(w.role) + '</span></button>';
      }).join('');
  }
  function paintCreated() {
    var kinds = ['all'].concat(CREATED.map(function (c) { return c.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; }));
    var seg = $('pfCreFilter');
    seg.innerHTML = '<span class="cq-seg__thumb" aria-hidden="true"></span>' + kinds.map(function (k) {
      return '<button data-ck="' + k + '" role="tab" class="' + (k === cKind ? 'is-active' : '') + '" aria-selected="' + (k === cKind) + '">' + (k === 'all' ? 'All' : KL(k) + 's') + '</button>';
    }).join('');
    requestAnimationFrame(function () { if (typeof cqSegSync === 'function') cqSegSync(seg); });
    var inKind = CREATED.filter(function (c) { return cKind === 'all' || c.kind === cKind; });
    wsRow('pfCreWs', inKind, cWs, 'data-cws');
    var rows = inKind.filter(function (c) { return cWs === 'all' || c.ws === cWs; });
    var nPub = CREATED.filter(function (c) { return market(c)[0] === 'Published'; }).length;
    var nRev = CREATED.filter(function (c) { return market(c)[0] === 'In review'; }).length;
    $('pfCreSplit').innerHTML = '<div><b>' + CREATED.length + '</b><span>Created, across ' + WSL.filter(function (w) { return CREATED.some(function (c) { return c.ws === w.id; }); }).length + ' workspaces</span></div>' +
      '<div><b>' + nPub + '</b><span>Published to the Marketplace</span></div><div><b>' + nRev + '</b><span>In review to publish</span></div>';
    $('pfCreGrid').innerHTML = rows.length ? rows.map(function (c) {
      var m = market(c);
      var act = m[0] === 'Not published'
        ? (c.pub ? '<button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-cpub="' + c.kind + '|' + E(c.name) + '">Publish</button>' : '')
        : m[2] && m[0] !== 'Published' ? '<button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-mk-track="' + E(m[2].ref) + '">Track review</button>'
        : '<button class="cq-btn cq-btn--s cq-btn--ghost" type="button" data-ctab="published">See listing</button>';
      return '<article class="cq-card cq-card--auto"><div class="cq-card__title-row">' + tile(c.kind) +
        '<div class="cq-card__t"><span class="cq-card__title cq-body2-med cq-truncate">' + E(c.name) + '</span><span class="cq-caption-reg">' + KL(c.kind) + ' · ' + E(wsName(c.ws)) + '</span></div>' +
        '<span class="cq-badge cq-caption-med" data-tone="' + m[1] + '">' + m[0] + '</span></div>' +
        '<p class="cq-card__desc">' + E(c.desc) + '</p>' +
        '<div class="cq-card__foot"><span class="pf-pub__meta cq-caption-reg">Edited ' + E(c.edited) + ' · ' + c.runs.toLocaleString('en-GB') + ' runs</span>' +
        '<span class="pf-pub__acts"><button class="cq-btn cq-btn--s cq-btn--ghost" type="button" data-copen="' + c.kind + '">Open</button>' + act + '</span></div></article>';
    }).join('') : '<div class="pf-empty cq-body2-reg">Nothing created here yet.</div>';
    $('pfCreNote').textContent = rows.length + ' of ' + CREATED.length + ' shown';
    $('pfCreCount').textContent = CREATED.length;
    if (typeof cqSegSync === 'function') requestAnimationFrame(function () { cqSegSync($('pfTabs')); });
  }

  /* Published gets the same workspace filter. */
  var pubBar = pubPane.querySelector('.pf-bar');
  var pRow = document.createElement('div'); pRow.className = 'pf-ws'; pRow.id = 'pfPubWs';
  pubBar.insertAdjacentElement('afterend', pRow);
  var _paint = paintPublished;
  paintPublished = function () {
    var all = PUBS.slice();
    wsRow('pfPubWs', all, pWs, 'data-pws');
    if (pWs !== 'all') { PUBS.length = 0; all.filter(function (p) { return p.ws === pWs; }).forEach(function (p) { PUBS.push(p); }); }
    try { _paint(); } finally { if (pWs !== 'all') { PUBS.length = 0; all.forEach(function (p) { PUBS.push(p); }); } }
    $('pfPubCount').textContent = PUBS.length;
    if (!$('pfCreated').hidden || true) paintCreated();
  };

  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-ck]'))) { cKind = x.dataset.ck; return paintCreated(); }
    if ((x = t.closest('[data-cws]'))) { cWs = x.dataset.cws; return paintCreated(); }
    if ((x = t.closest('[data-pws]'))) { pWs = x.dataset.pws; return paintPublished(); }
    if ((x = t.closest('[data-cpub]'))) {
      e.stopPropagation();
      var kp = x.dataset.cpub.split('|');
      return go({ cqNav: kp[0] === 'automation' ? 'automations.html' : 'agents.html', cqFocus: 'publish:' + kp.slice(1).join('|') });
    }
    if ((x = t.closest('[data-copen]'))) { var k = x.dataset.copen; if (k === 'agent' || k === 'automation') go({ cqNav: k === 'agent' ? 'agents.html' : 'automations.html' }); return; }
    if ((x = t.closest('[data-ctab]'))) { var b = document.querySelector('#pfTabs [data-tab="published"]'); if (b) b.click(); }
  });
  paintPublished();
})();
