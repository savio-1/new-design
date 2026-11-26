/* Marketplace requests: one page where the whole workspace tracks what it
   has asked to add from the Marketplace or publish to it, whatever the
   kind (agents, automations, assistants, tools, skills, guardrails).
   Built on the platform page's own frame: the rail and header stay, the
   body is replaced. Open requests sit in the table; added, live and
   rejected ones move to History. A row opens its tracker on the right. */
(function () {
  if (!window.cqReview) return;
  var CR = window.cqReview;
  var inShell = window.parent !== window;
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var post = function (m) { if (inShell) parent.postMessage(m, '*'); };

  /* ── The page's frame: title, rail, body ── */
  document.title = 'Cogentiq Builder · Marketplace requests';
  var head = document.querySelector('.cq-page__header');
  if (head) {
    var t = head.querySelector('.cq-subhead2-med'), sub = head.querySelector('.hdr-sub');
    if (t) t.textContent = 'Marketplace requests';
    if (sub) sub.textContent = 'Everything your workspace asked to add from the Marketplace or publish to it, in one place.';
  }
  var bar = document.querySelector('.cq-page__bar');
  if (bar) bar.style.display = 'none';
  var content = document.querySelector('.cq-page__content');
  if (!content) return;
  Array.prototype.forEach.call(content.children, function (c) { c.style.display = 'none'; });
  var rootEl = document.createElement('div');
  rootEl.className = 'rq';
  content.appendChild(rootEl);
  document.querySelectorAll('[aria-label="Platform"] .is-active').forEach(function (b) { b.classList.remove('is-active'); b.removeAttribute('aria-current'); });
  var railMe = document.querySelector('[aria-label="Platform"] [title="Marketplace requests"]'); if (railMe) railMe.classList.add('is-active');

  var KIND = {
    agent: ['Agent', 'Agents', '<rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r=".9" fill="currentColor"/><circle cx="10" cy="9" r=".9" fill="currentColor"/>', 'indigo'],
    automation: ['Automation', 'Automations', '<circle cx="3.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="3.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.1 8h3m0-4.5h2.9M8 12.5h2.9M8 3.5v9" stroke="currentColor" stroke-width="1.2"/>', 'green'],
    assistant: ['Assistant', 'Assistants', '<path d="M3 3.5h10v7H7l-3 2.5v-2.5H3v-7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', 'cyan'],
    tool: ['Tool', 'Tools', '<path d="M9.8 2.2a3.3 3.3 0 0 0-3.9 4.4L2.3 10.2a1.3 1.3 0 0 0 1.8 1.8l3.6-3.6a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.6-.5-.5-1.6 2-2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', 'purple'],
    skill: ['Skill', 'Skills', '<path d="m8 2 1.7 3.6 3.8.5-2.8 2.6.7 3.8L8 10.7l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', 'orange'],
    guardrail: ['Guardrail', 'Guardrails', '<path d="M8 1.75 13 3.5v4c0 3-2.2 5.4-5 6.75C5.2 12.9 3 10.5 3 7.5v-4L8 1.75Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>', 'red']
  };
  function kindOf(w) { return KIND[w.kind] ? w.kind : 'agent'; }
  function icon(w, size) { var k = KIND[kindOf(w)]; return '<span class="rq-ic rq-ic--' + k[3] + '"' + (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '') + '><svg width="16" height="16" viewBox="0 0 16 16" fill="none">' + k[2] + '</svg></span>'; }

  /* ── What teammates asked for, alongside your own ── */
  var now = Date.now(), H = 3600000;
  var TEAM = [
    { ref: 'team:salesforce', kind: 'tool', flow: 'add', name: 'Salesforce account lookup', desc: 'Looks up an account, its owner and open opportunities in Salesforce.', publisher: 'Daniel Okafor', requester: 'Nina Foster', workspace: 'Finance', requestedAt: now - 5 * H, approvals: { xadm: { by: 'Hitesh Vijay', at: now - 4 * H } } },
    { ref: 'team:faq', kind: 'assistant', flow: 'add', name: 'Finance FAQ assistant', desc: 'Answers policy questions for the finance team from the handbook.', publisher: 'Cogentiq', requester: 'Priya Nair', workspace: 'Finance', requestedAt: now - 40 * 60000 },
    { ref: 'team:vendor', kind: 'agent', flow: 'publish', name: 'Vendor risk screener', desc: 'Screens new vendors against sanctions lists and payment history.', requester: 'Sofia Patel', workspace: 'Finance', requestedAt: now - 3 * H, industry: 'Banking & Financial Services', func: 'Finance', sharedSummary: '19 of 24 details shared', approvals: { xadm: { by: 'Priya Nair', at: now - 2.5 * H } } },
    { ref: 'team:splitter', kind: 'skill', flow: 'publish', name: 'Invoice line splitter', desc: 'Splits a combined invoice line into its cost centres.', requester: 'Marcus Diaz', workspace: 'Finance', requestedAt: now - 30 * H, industry: 'Cross-industry', func: 'Finance', approvals: { xadm: { by: 'Priya Nair', at: now - 29 * H }, iadm: { by: 'Hitesh Vijay', at: now - 26 * H } } },
    { ref: 'team:pii', kind: 'guardrail', flow: 'add', name: 'PII redaction', desc: 'Masks names, emails and account numbers in every result.', publisher: 'Cogentiq', requester: 'Arjun Mehta', workspace: 'Finance', requestedAt: now - 50 * H, approvals: { xadm: { by: 'Hitesh Vijay', at: now - 49 * H, rejected: true, note: 'Use the workspace’s own PII rule instead' } } },
    { ref: 'team:recon', kind: 'automation', flow: 'add', name: 'Bank reconciliation run', desc: 'Matches bank lines to ledger entries every morning and flags the rest.', publisher: 'Lena Brooks', requester: 'Marcus Diaz', workspace: 'Finance', requestedAt: now - 72 * H, status: 'added', approvals: { xadm: { by: 'Hitesh Vijay', at: now - 71 * H }, iadm: { by: 'Priya Nair', at: now - 70 * H } } }
  ];
  TEAM.forEach(function (w) { w.sample = true; w.status = w.status || (w.flow === 'add' ? 'requested' : undefined); w.team = true; });

  function all() {
    var mine = CR.items().filter(function (w) { return w.flow === 'publish' || w.status === 'requested' || (w.status === 'added' && w.requestedAt); });
    return mine.concat(TEAM).sort(function (a, b) { return (b.requestedAt || 0) - (a.requestedAt || 0); });
  }
  /* Open, or history: live, added or rejected. */
  function stateOf(w) {
    var s = CR.stageOf(w);
    if (s.state === 'rejected') return ['history', 'Rejected', s];
    if (w.flow === 'publish') return s.state === 'done' ? ['history', 'Live', s] : ['open', null, s];
    if (w.status === 'added') return ['history', 'Added', s];
    return ['open', s.state === 'done' ? 'Ready' : null, s];
  }
  function when(t) {
    var m = Math.round((Date.now() - (t || Date.now())) / 60000);
    return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago';
  }

  var css = document.createElement('style');
  css.textContent = [
    '.rq{display:flex;flex-direction:column;gap:16px;padding:0 0 40px}',
    '.rq-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}',
    '.rq-stat{padding:12px 14px;border-radius:12px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);display:flex;flex-direction:column;gap:2px}',
    '.rq-stat b{font:500 22px/28px var(--font-geist)}',
    '.rq-stat span{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.rq-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
    '.rq-sp{flex:1 1 auto}',
    '.rq-dd{position:relative}',
    '.rq-dd__btn{height:32px;display:inline-flex;align-items:center;gap:8px;padding:0 10px 0 12px;border-radius:8px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);color:var(--text-primary);cursor:pointer;font:500 13px/18px var(--font-geist)}',
    '.rq-dd__btn:hover,.rq-dd__btn[aria-expanded="true"]{border-color:var(--strokes-card-selected)}',
    '.rq-dd__btn .l{color:var(--text-teritiary);font-weight:400}',
    '.rq-dd__menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:220px;padding:4px;border-radius:10px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 8px 24px rgba(0,0,0,.3)}',
    '.rq-dd__menu[hidden]{display:none}',
    '.rq-dd__menu button{width:100%;padding:8px 10px;border:0;border-radius:6px;background:none;cursor:pointer;text-align:left;color:var(--text-primary);font:400 13px/18px var(--font-geist)}',
    '.rq-dd__menu button:hover{background:var(--backgrounds-card-bg-4)}',
    '.rq-dd__menu button[aria-checked="true"]{background:var(--backgrounds-button-tonal-1);color:var(--text-coloured-blue)}',
    '.rq-chips{display:flex;gap:6px;flex-wrap:wrap}',
    '.rq-ic{width:32px;height:32px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center}',
    '.rq-ic--indigo{background:var(--backgrounds-badge-indigo);color:var(--text-coloured-indigo)}',
    '.rq-ic--green{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.rq-ic--cyan{background:var(--backgrounds-badge-cyan,var(--backgrounds-badge-blue));color:var(--text-coloured-cyan,var(--text-coloured-blue))}',
    '.rq-ic--purple{background:var(--backgrounds-badge-purple,#17092b);color:var(--text-coloured-purple,#c9a3ff)}',
    '.rq-ic--orange{background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.rq-ic--red{background:var(--backgrounds-badge-red);color:var(--text-coloured-red)}',
    '.rq-art{display:flex;align-items:center;gap:10px;min-width:0}',
    '.rq-art .tx{display:flex;flex-direction:column;min-width:0}',
    '.rq-art b{font:500 13px/18px var(--font-geist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.rq-art small{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.rq-who{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
    '.rq-who i{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font:600 10px/1 var(--font-geist);font-style:normal}',
    '.rq-you{margin-left:2px;padding:0 5px;border-radius:4px;background:var(--backgrounds-card-bg-4);color:var(--text-teritiary);font:400 10px/14px var(--font-geist)}',
    '.rq-end{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 8px;border-radius:11px;font:500 11px/14px var(--font-geist)}',
    '.rq-end.is-ok{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.rq-end.is-rej{background:var(--backgrounds-badge-red);color:var(--text-coloured-red)}',
    '.rq-empty{padding:40px 16px;text-align:center;color:var(--text-teritiary);font:400 13px/18px var(--font-geist);border:1px dashed var(--strokes-card-default);border-radius:12px}',
    '.rq-acts{display:flex;gap:8px;flex-wrap:wrap}',
    '@media (max-width:1100px){.rq-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}'
  ].join('\n');
  document.head.appendChild(css);

  var V = { view: 'open', kind: 'all', flow: 'all', sel: null, dd: false };
  var HUE = ['#5860ed', '#0d99ff', '#14ae5c', '#dd7c0e', '#9747ff', '#e91e63', '#00a2c2'];
  var hue = function (n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return HUE[h % HUE.length]; };

  function paint() {
    var list = all();
    var open = list.filter(function (w) { return stateOf(w)[0] === 'open'; });
    var hist = list.filter(function (w) { return stateOf(w)[0] === 'history'; });
    var ready = open.filter(function (w) { return stateOf(w)[1] === 'Ready'; }).length;
    var base = V.view === 'open' ? open : hist;
    var rows = base.filter(function (w) { return (V.kind === 'all' || kindOf(w) === V.kind) && (V.flow === 'all' || (w.flow === 'publish' ? 'publish' : 'add') === V.flow); });
    /* Every type has its tab, whether or not anything is in it yet. */
    var kinds = ['agent', 'automation', 'assistant', 'tool', 'skill', 'guardrail'];
    var FLOWS = [['all', 'All requests'], ['add', 'Adding to workspace'], ['publish', 'Publishing to Marketplace']];
    var flowName = FLOWS.filter(function (f) { return f[0] === V.flow; })[0][1];
    var chip = function (attr, v, label, n, on) { return '<button type="button" class="cqr-chip" data-rq-' + attr + '="' + v + '" aria-pressed="' + on + '">' + label + (n != null ? ' <span class="n">' + n + '</span>' : '') + '</button>'; };
    rootEl.innerHTML =
      '<div class="rq-bar"><div class="cqr-switch" role="tablist" aria-label="Requests">' +
          '<button type="button" role="tab" data-rq-view="open" aria-selected="' + (V.view === 'open') + '">Open <span class="n">' + open.length + '</span></button>' +
          '<button type="button" role="tab" data-rq-view="history" aria-selected="' + (V.view === 'history') + '">History <span class="n">' + hist.length + '</span></button></div>' +
        '<div class="rq-chips">' + chip('kind', 'all', 'All types', null, V.kind === 'all') + kinds.map(function (k) { return chip('kind', k, KIND[k][1], base.filter(function (w) { return kindOf(w) === k; }).length, V.kind === k); }).join('') + '</div>' +
        '<span class="rq-sp"></span>' +
        '<div class="rq-dd"><button type="button" class="rq-dd__btn" data-rq-dd aria-haspopup="menu" aria-expanded="' + !!V.dd + '"><span class="l">Show</span>' + flowName +
          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<div class="rq-dd__menu" role="menu"' + (V.dd ? '' : ' hidden') + '>' + FLOWS.map(function (f) {
            return '<button type="button" role="menuitemradio" aria-checked="' + (V.flow === f[0]) + '" data-rq-flow="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div></div>' +
      '</div>' +
      (rows.length ? '<table class="cqr-table"><thead><tr><th>Artifact</th><th>Requested by</th><th>Requested</th><th>Status</th><th>Request</th><th></th></tr></thead><tbody>' +
        rows.map(function (w) {
          var st = stateOf(w), s = st[2], who = w.requester || 'Savio Govindu';
          var status = st[1] === 'Live' || st[1] === 'Added' ? '<span class="rq-end is-ok">✓ ' + st[1] + '</span>' : st[1] === 'Rejected' ? '<span class="rq-end is-rej">✕ Rejected</span>' : CR.statusCell(w, s);
          var act = st[1] === 'Ready' ? '<button type="button" class="cqr-act" data-rq-add="' + E(w.ref) + '">Add</button>'
            : '<button type="button" class="cqr-act cqr-act--ghost" data-rq-open="' + E(w.ref) + '">' + (st[0] === 'open' ? 'Track' : 'View') + '</button>';
          return '<tr data-rq-open="' + E(w.ref) + '"' + (V.sel === w.ref ? ' class="is-sel"' : '') + '>' +
            '<td><span class="rq-art">' + icon(w) + '<span class="tx"><b>' + E(w.name) + '</b><small>' + KIND[kindOf(w)][0] + (w.flow === 'publish' ? '' : ' · by ' + E(w.publisher || 'the publisher')) + '</small></span></span></td>' +
            '<td><span class="rq-who"><i style="background:' + hue(who) + '">' + E(who[0]) + '</i>' + E(who) + (w.team ? '' : '<span class="rq-you">You</span>') + '</span></td>' +
            '<td>' + when(w.requestedAt) + '</td>' +
            '<td class="cqr-st-td">' + status + '</td>' +
            '<td class="cqr-fit">' + CR.typeTag(w) + '</td>' +
            '<td class="cqr-fit" style="text-align:right">' + act + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<div class="rq-empty">' + (V.view === 'open' ? 'Nothing open right now. Requests from anyone in the workspace show up here as soon as they are made.' : 'Nothing in history yet.') + '</div>');
    paintDrawer();
  }

  /* ── The tracker, on the right ── */
  var drawer = document.createElement('aside');
  drawer.className = 'cqr-drawer'; drawer.setAttribute('aria-label', 'Request');
  document.body.appendChild(drawer);
  function find(ref) { return all().filter(function (w) { return w.ref === ref; })[0]; }
  function paintDrawer() {
    var w = V.sel && find(V.sel);
    if (!w) { drawer.classList.remove('is-open'); return; }
    var st = stateOf(w), page = w.kind === 'agent' ? 'agents.html' : w.kind === 'automation' ? 'automations.html' : null;
    var acts = [];
    if (st[1] === 'Ready') acts.push('<button type="button" class="cqr-btn cqr-btn--primary" data-rq-add="' + E(w.ref) + '">Add to workspace</button>');
    if (st[1] === 'Added' && page) acts.push('<button type="button" class="cqr-btn cqr-btn--primary" data-rq-go="' + page + '|' + E(w.ref) + '">Open in ' + KIND[w.kind][1] + '</button>');
    if (st[1] === 'Live') acts.push('<button type="button" class="cqr-btn cqr-btn--primary" data-rq-go="marketplace.html|">View on Marketplace</button>');
    if (st[0] === 'open' && !w.team) acts.push('<button type="button" class="cqr-btn cqr-btn--ghost" data-rq-withdraw="' + E(w.ref) + '">Withdraw</button>');
    drawer.innerHTML = '<div class="cqr-drawer__head">' + CR.pill(w) + '<button type="button" class="cqr-drawer__x" data-rq-close aria-label="Close"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></div>' +
      '<div class="cqr-drawer__body">' +
        '<div class="cqr-sec"><span class="rq-art">' + icon(w, 36) + '<span class="tx"><b style="font-size:16px;line-height:22px">' + E(w.name) + '</b><small>' + KIND[kindOf(w)][0] + ' · ' + (w.flow === 'publish' ? E(w.workspace || CR.HOME) + ' → Marketplace' : 'Marketplace → ' + E(w.workspace || CR.HOME)) + '</small></span></span>' +
          (w.desc ? '<p style="margin:0;color:var(--text-secondary);font:400 13px/18px var(--font-geist)">' + E(w.desc) + '</p>' : '') +
          '<div><div class="cqr-kv"><span>Requested by</span><b>' + E(w.requester || 'Savio Govindu') + '</b></div>' +
            (w.flow === 'publish' ? (w.industry ? '<div class="cqr-kv"><span>Industry · Domain</span><b>' + E(w.industry + ' · ' + (w.func || '—')) + '</b></div>' : '')
                                  : '<div class="cqr-kv"><span>Publisher</span><b>' + E(w.publisher || '—') + '</b></div>') + '</div>' +
          (acts.length ? '<div class="rq-acts">' + acts.join('') + '</div>' : '') + '</div>' +
        '<div class="cqr-sec"><span class="cqr-sec__l">Review stages</span>' + CR.trackerHTML(w, { links: true }) + '</div>' +
      '</div>';
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
  }

  function add(ref) {
    var w = find(ref); if (!w) return;
    w.status = 'added'; w.added = Date.now();
    if (!w.team) post({ cqWsUpdate: w });
    var page = w.kind === 'agent' ? 'agents.html' : w.kind === 'automation' ? 'automations.html' : null;
    say(w.name + ' was added to your workspace' + (page && w.needs && w.needs.length ? '. Finish its setup in ' + KIND[w.kind][1] + '.' : '.'),
      page ? { label: 'Open in ' + KIND[w.kind][1], run: function () { post({ cqNav: page, cqFocus: w.ref }); } } : null);
    paint();
  }
  /* A small notice, top right, in the platform's own manner. */
  function say(msg, action) {
    var t = $('rqToast');
    if (!t) { t = document.createElement('div'); t.id = 'rqToast'; document.body.appendChild(t);
      t.style.cssText = 'position:fixed;top:64px;right:20px;z-index:500;width:360px;padding:12px 14px;border-radius:12px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 10px 30px rgba(0,0,0,.35);color:var(--text-primary);font:400 13px/18px var(--font-geist);display:flex;flex-direction:column;gap:8px'; }
    t.innerHTML = '<span>' + E(msg) + '</span>' + (action ? '<button type="button" class="cqr-btn cqr-btn--primary" style="align-self:flex-start" data-rq-toast>' + E(action.label) + '</button>' : '');
    t.hidden = false;
    t.onclick = function (e) { if (action && e.target.closest('[data-rq-toast]')) { t.hidden = true; action.run(); } };
    clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 6000);
  }

  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('[data-rq-view]'))) { V.view = x.getAttribute('data-rq-view'); V.kind = 'all'; return paint(); }
    if ((x = t.closest('[data-rq-kind]'))) { V.kind = x.getAttribute('data-rq-kind'); return paint(); }
    if ((x = t.closest('[data-rq-flow]'))) { V.flow = x.getAttribute('data-rq-flow'); V.dd = false; return paint(); }
    if (t.closest('[data-rq-dd]')) { V.dd = !V.dd; return paint(); }
    if (V.dd && !t.closest('.rq-dd')) { V.dd = false; paint(); }
    if ((x = t.closest('[data-rq-add]'))) { e.stopPropagation(); return add(x.getAttribute('data-rq-add')); }
    if ((x = t.closest('[data-rq-withdraw]'))) { var r = x.getAttribute('data-rq-withdraw'); post({ cqWsRemove: r }); V.sel = null; say('The request was withdrawn.'); return setTimeout(paint, 150); }
    if ((x = t.closest('[data-rq-go]'))) { var g = x.getAttribute('data-rq-go').split('|'); return post(g[1] ? { cqNav: g[0], cqFocus: g[1] } : { cqNav: g[0] }); }
    if (t.closest('[data-rq-close]')) { V.sel = null; return paint(); }
    if ((x = t.closest('[data-rq-open]'))) { V.sel = x.getAttribute('data-rq-open'); return paint(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V.sel) { V.sel = null; paint(); } });
  /* Open straight onto a request when another page sends you here. */
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (typeof d.cqFocus === 'string' && d.cqFocus.indexOf('req:') === 0) {
      var ref = d.cqFocus.slice(4);
      setTimeout(function () { var w = find(ref); if (w) { V.view = stateOf(w)[0]; V.kind = 'all'; V.flow = 'all'; V.sel = ref; paint(); } }, 120);
    }
  });
  var sig = '';
  setInterval(function () {
    var s = all().map(function (w) { var x = stateOf(w); return w.ref + x[0] + (x[1] || '') + x[2].i + x[2].state; }).join('|');
    if (s !== sig) { sig = s; paint(); }
  }, 600);
  CR.onChange(function () { sig = ''; });
  paint();
})();
