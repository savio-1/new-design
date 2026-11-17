/* ════════════════════════════════════════════════════════════════════
   WORKSPACE BRIDGE
   Appended to the Automations and Agents landing pages when they are
   bundled into the Marketplace app. The pages themselves are untouched:
   this script runs after theirs, reads the workspace the shell holds,
   and adds what was taken from the Marketplace to the page's own
   inventory, drawn with the page's own card.

   Two states, decided in the Marketplace when the item was added:
     ready        everything it needs was shared by the publisher. It
                  lands as a normal card with a Marketplace label.
     needs setup  the publisher kept some connections or their model.
                  The card says so, lists what is missing, and offers
                  Discard or Configure. Configure opens the item, where
                  each missing piece is added in place.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var PAGE = typeof AUTOS !== 'undefined' ? 'automation'
           : typeof AGENTS !== 'undefined' ? 'agent' : null;
  if (!PAGE) return;

  var inShell = window.parent !== window;
  var post = function (m) { if (inShell) parent.postMessage(m, '*'); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var byId = function (id) { return document.getElementById(id); };
  var WS = [];            /* every item the shell holds, both kinds */
  var lastJSON = '';
  var pendingFocus = null;
  var openRef = null;     /* the marketplace item open in the panel, by ref */

  var MODEL_CHOICES = ['GPT-4.1', 'GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 2.5 Pro', 'Mistral Large 2'];

  /* ── Glyphs the two pages do not both carry ── */
  var IC = {
    store: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5.5h11l-.8 7.2a1.5 1.5 0 0 1-1.5 1.3H4.8a1.5 1.5 0 0 1-1.5-1.3L2.5 5.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.6 9.8a1 1 0 0 1-.87 1.5H2.4a1 1 0 0 1-.87-1.5l5.6-9.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.2v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".8" fill="currentColor"/></svg>',
    plug: '<svg class="cq-ic" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_integrations"/></svg>',
    brain: '<svg class="cq-ic" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_brain"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ── Styles. Written against the pages' own tokens, so both themes
        follow the page; orange is the system's "waiting on someone". ── */
  var css = document.createElement('style');
  css.textContent = [
    '.mkws-flag{height:22px;padding:0 9px 0 8px;border-radius:9999px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;',
    '  font:500 var(--fs-caption)/1 var(--font-geist);letter-spacing:-.24px;',
    '  background:var(--backgrounds-badge-blue);border:1px solid var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    '.mkws-flag svg{flex:none}',
    '.ag-card__kind.mkws-kind{display:inline-flex;align-items:center;gap:5px;background:var(--backgrounds-badge-blue);',
    '  border-color:var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    ':root[data-mode="light"] .ag-card__kind.mkws-kind{background:var(--backgrounds-badge-blue)}',
    /* The setup block on a card */
    '.mkws-setup{position:relative;z-index:1;margin-top:12px;padding:10px 12px;border-radius:10px;display:flex;flex-direction:column;gap:8px;',
    '  background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange);text-align:left}',
    '.mkws-setup__head{display:flex;align-items:center;gap:6px;color:var(--text-coloured-orange);font:500 var(--fs-caption)/16px var(--font-geist);letter-spacing:-.24px}',
    '.mkws-setup__head svg{flex:none}',
    '.mkws-setup__list{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}',
    '.mkws-chip{height:22px;display:inline-flex;align-items:center;gap:5px;padding:0 8px;border-radius:6px;',
    '  background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-line-1);color:var(--text-secondary);',
    '  font:400 var(--fs-caption)/1 var(--font-geist);letter-spacing:-.24px;white-space:nowrap}',
    '.mkws-chip svg{flex:none;color:var(--text-teritiary)}',
    '.mkws-chip.is-done{color:var(--text-teritiary);text-decoration:line-through}',
    '.mkws-chip.is-done svg{color:var(--text-coloured-green)}',
    '.mkws-setup__actions{display:flex;justify-content:flex-end;gap:6px}',
    '.mkws-setup__actions .cq-btn{height:28px;padding:0 10px;font-size:13px}',
    '.mkws-card.is-flash{animation:mkws-flash 1.6s ease-out 1}',
    '@keyframes mkws-flash{0%{box-shadow:0 0 0 0 rgba(13,153,255,.0)}20%{box-shadow:0 0 0 4px rgba(13,153,255,.45)}100%{box-shadow:0 0 0 0 rgba(13,153,255,0)}}',
    '@media (prefers-reduced-motion: reduce){.mkws-card.is-flash{animation:none;outline:2px solid var(--strokes-card-selected)}}',
    /* The list-view pill */
    '.mkws-pill{height:24px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:12px;white-space:nowrap;',
    '  background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange);font:500 var(--fs-caption)/16px var(--font-geist)}',
    /* The panel section */
    '.mkws-sec{display:flex;flex-direction:column;gap:12px}',
    '.mkws-lede{margin:0;color:var(--text-secondary)}',
    '.mkws-note{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:10px;',
    '  background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.mkws-note svg{flex:none;margin-top:1px}',
    '.mkws-note.is-ok{background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',
    '.mkws-steps{display:flex;flex-direction:column;border:1px solid var(--strokes-line-3);border-radius:10px;overflow:hidden}',
    '.mkws-step{display:flex;align-items:center;gap:10px;padding:10px 12px;border-top:1px solid var(--strokes-line-3)}',
    '.mkws-step:first-child{border-top:0}',
    '.mkws-step__ic{width:28px;height:28px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;',
    '  background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.mkws-step.is-done .mkws-step__ic{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.mkws-step__id{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}',
    '.mkws-step__id .t{color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkws-step__id .s{color:var(--text-teritiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkws-ok{display:inline-flex;align-items:center;gap:4px;color:var(--text-coloured-green);font:500 var(--fs-caption)/16px var(--font-geist);white-space:nowrap}',
    '.mkws-step .cq-btn{height:28px;padding:0 10px;font-size:13px;flex:none}',
    '.mkws-sel{flex:none;height:28px;max-width:170px;padding:0 26px 0 10px;border-radius:8px;cursor:pointer;',
    '  background:var(--backgrounds-type-default-bg-1) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 16 16\' fill=\'none\'%3E%3Cpath d=\'m4 6 4 4 4-4\' stroke=\'%238c8c8c\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E") no-repeat right 8px center;',
    '  border:1px solid var(--strokes-type-default);color:var(--text-primary);appearance:none;-webkit-appearance:none;',
    '  font:400 13px/1 var(--font-geist);letter-spacing:-.4px}',
    '.mkws-sel:focus-visible{outline:2px solid var(--strokes-type-focus);outline-offset:1px}',
    '.mkws-sel option{background:var(--backgrounds-page-bg-2);color:var(--text-primary)}',
    '.mkws-actions{display:flex;justify-content:flex-end;gap:8px}',
    '.mkws-actions .cq-btn{height:32px}',
    '.mkws-kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--strokes-line-3)}',
    '.mkws-kv:last-child{border-bottom:0}',
    '.mkws-kv .k{color:var(--text-teritiary);font:500 var(--fs-caption)/16px var(--font-geist)}',
    '.mkws-kv .v{color:var(--text-secondary);text-align:right;font:400 13px/18px var(--font-geist)}',
    '.mkws-sec.is-flash{animation:mkws-secflash 1.4s ease-out 1}',
    '@keyframes mkws-secflash{0%,30%{background:rgba(252,158,36,.12)}100%{background:transparent}}',
    /* A toast for the page that has none of its own */
    '.mkws-toast{position:fixed;left:50%;bottom:28px;z-index:200;transform:translate(-50%,8px);opacity:0;pointer-events:none;',
    '  padding:10px 16px;border-radius:8px;background:var(--text-primary);color:var(--backgrounds-page-bg-1);',
    '  font:500 14px/20px var(--font-geist);letter-spacing:-.4px;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .18s ease,transform .18s ease}',
    '.mkws-toast.is-shown{opacity:1;transform:translate(-50%,0)}'
  ].join('\n');
  document.head.appendChild(css);

  /* ── Navigation the page's own wiring leaves out ── */
  var NAV = { agents: 'agents.html', automations: 'automations.html' };
  document.querySelectorAll('[aria-label="Platform"] button[title]').forEach(function (btn) {
    var url = NAV[(btn.getAttribute('title') || '').trim().toLowerCase()];
    if (!url || btn.classList.contains('is-active') || btn.style.cursor === 'pointer') return;
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function () { post({ cqNav: url }); });
  });
  var market = document.querySelector('.cq-rail-market');
  if (market) {
    market.style.cursor = 'pointer';
    market.addEventListener('click', function () { post({ cqNav: 'marketplace.html' }); });
  }

  /* ── Toast ── */
  var tT;
  function say(msg) {
    if (PAGE === 'agent' && typeof toast === 'function') return toast(msg);
    var t = byId('mkwsToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mkwsToast'; t.className = 'mkws-toast'; t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('is-shown'); });
    clearTimeout(tT);
    tT = setTimeout(function () { t.classList.remove('is-shown'); }, 2800);
  }

  /* ── Small helpers ── */
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function cfg(w) { if (!w.config) w.config = { done: {}, model: '' }; if (!w.config.done) w.config.done = {}; return w.config; }
  function needDone(w, n) { var c = cfg(w); return n.kind === 'model' ? !!c.model : !!c.done[n.key]; }
  function remaining(w) { return (w.needs || []).filter(function (n) { return !needDone(w, n); }); }
  function wsByRef(ref) { for (var i = 0; i < WS.length; i++) if (WS[i].ref === ref) return WS[i]; return null; }
  function mine() { return WS.filter(function (w) { return w.kind === PAGE; }).sort(function (a, b) { return (b.added || 0) - (a.added || 0); }); }
  function needLabel(n) { return n.kind === 'model' ? 'A model' : n.name + ' integration'; }

  function setupBlock(w) {
    var needs = w.needs || [];
    var left = remaining(w).length;
    return '<div class="mkws-setup" data-mkws-ref="' + E(w.ref) + '">' +
      '<span class="mkws-setup__head">' + IC.warn + (left
        ? 'Configure before it can be used' + (needs.length > 1 ? ' · ' + left + ' of ' + needs.length + ' left' : '')
        : 'Everything is added · finish setup to start using it') + '</span>' +
      '<ul class="mkws-setup__list">' + needs.map(function (n) {
        var done = needDone(w, n);
        return '<li class="mkws-chip' + (done ? ' is-done' : '') + '">' + (done ? IC.check : n.kind === 'model' ? IC.brain : IC.plug) + E(needLabel(n)) + '</li>';
      }).join('') + '</ul>' +
      '<span class="mkws-setup__actions">' +
        '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-discard="' + E(w.ref) + '">Discard</button>' +
        '<button type="button" class="cq-btn cq-btn--tonal" data-mkws-config="' + E(w.ref) + '">Configure</button>' +
      '</span></div>';
  }
  var FLAG = '<span class="mkws-flag" title="Added from the Marketplace">' + IC.store + 'Marketplace</span>';

  /* ════════════════════════════════════════════════════════════════
     AUTOMATIONS
     ════════════════════════════════════════════════════════════════ */
  if (PAGE === 'automation') {
    var HUE = ['var(--text-coloured-indigo)', 'var(--text-coloured-blue)', 'var(--text-coloured-cyan)',
               'var(--text-coloured-green)', 'var(--purple-450)', 'var(--orange-600)'];
    var toItem = function (w, rank) {
      var h = hash(w.name);
      var steps = [];
      var src = (w.shared && w.shared[0]) || ((w.needs || []).filter(function (n) { return n.kind !== 'model'; })[0] || {}).name || 'webhook';
      steps.push({ k: 'trigger', l: 'Trigger', s: String(src).toLowerCase() });
      (w.agents || []).forEach(function (n) { steps.push({ k: 'agent', l: n, s: 'agent' }); });
      (w.tools || []).slice(0, 2).forEach(function (n) { steps.push({ k: 'tool', l: n, s: 'tool' }); });
      (w.checkpoints || []).forEach(function () { steps.push({ k: 'checkpoint', l: 'Human review', s: 'before results go out' }); });
      steps.push({ k: 'notify', l: 'Send result', s: 'workspace' });
      return {
        _mk: true, ref: w.ref, name: w.name, type: h % 3 === 0 ? 'Job' : 'Live', desc: w.desc,
        status: w.ready ? 'Active' : 'Draft', hue: HUE[h % HUE.length], pending: 0,
        trigger: w.ready ? 'Event · ' + src : 'Not set until configured', schedule: w.ready ? 'On event' : 'Not scheduled',
        by: w.publisher, tags: (w.tags || []).slice(0, 2), runs: 0, ok: 0, avg: '—', cost: '—',
        last: 'never', lastN: -1 - rank, created: 'Today', version: 'v1 · Marketplace', steps: steps
      };
    };

    /* The page's own functions, wrapped rather than replaced. */
    var _flag = flag;
    flag = function (a) { return a && a._mk ? FLAG : _flag(a); };
    var _inScope = inScope;
    inScope = function (a) { return a._mk && auState.scope === 'running' ? false : _inScope(a); };
    var _card = cardHTML;
    cardHTML = function (a, i) {
      var h = _card(a, i);
      if (!a._mk) return h;
      h = h.replace('class="au-card cq-tint"', 'class="au-card cq-tint mkws-card" data-mkws="' + E(a.ref) + '"');
      var w = wsByRef(a.ref);
      if (w && !w.ready) h = h.replace('<div class="au-card__foot">', setupBlock(w) + '<div class="au-card__foot">');
      return h;
    };
    var _row = rowHTML;
    rowHTML = function (a, i) {
      var h = _row(a, i);
      if (!a._mk) return h;
      var w = wsByRef(a.ref);
      if (w && !w.ready) h = h.replace(statusPill(a), '<span class="mkws-pill">' + IC.warn + 'Needs setup</span>');
      return h.replace('<span class="cq-body2-med cq-truncate">', '<span class="cq-body2-med cq-truncate" style="display:inline-flex;align-items:center;gap:6px">');
    };

    /* The panel: one section of our own, placed under the head. */
    var head = document.querySelector('#auPanel .au-panel__head');
    var sec = document.createElement('div');
    sec.className = 'cq-panel__section mkws-sec'; sec.id = 'mkwsSec'; sec.hidden = true;
    if (head) head.insertAdjacentElement('afterend', sec);

    var _open = openPanel;
    openPanel = function (i) {
      _open(i);
      var a = AUTOS[i];
      openRef = a && a._mk ? a.ref : null;
      paintSec(openRef ? wsByRef(openRef) : null);
      if (openRef) {
        var w = wsByRef(openRef);
        if (w && !w.ready) { byId('pnPrimaryLabel').textContent = 'Configure'; byId('pnPrimaryIcon').setAttribute('href', '#i-gears'); }
      }
    };
    var _tpl = openTemplate;
    openTemplate = function (i) { openRef = null; paintSec(null); _tpl(i); };
    var _close = closePanel;
    closePanel = function () { openRef = null; _close(); };

    var sync = function () {
      var openWas = open.kind === 'auto' && AUTOS[open.i] ? AUTOS[open.i].ref || AUTOS[open.i].name : null;
      for (var i = AUTOS.length - 1; i >= 0; i--) if (AUTOS[i]._mk) AUTOS.splice(i, 1);
      var list = mine();
      for (var j = list.length - 1; j >= 0; j--) AUTOS.unshift(toItem(list[j], list.length - j));
      renderAutos();
      counts();
      if (openWas) {
        var k = AUTOS.findIndex(function (a) { return (a.ref || a.name) === openWas; });
        if (k >= 0) openPanel(k); else closePanel();
      }
    };
    var counts = function () {
      var real = AUTOS.filter(function (a) { return !a._mk; });
      byId('nAll').textContent = AUTOS.length;
      byId('nTypeAll').textContent = AUTOS.length;
      byId('nJob').textContent = AUTOS.filter(function (a) { return a.type === 'Job'; }).length;
      byId('nLive').textContent = AUTOS.filter(function (a) { return a.type === 'Live'; }).length;
      byId('nRunning').textContent = real.filter(isRunning).length;
      var c = document.querySelector('#auTabs .au-seg-count');
      if (c) c.textContent = AUTOS.length;
      cqSegSync(byId('auTabs'));
    };
    var findIndex = function (ref) { return AUTOS.findIndex(function (a) { return a.ref === ref; }); };
    var cardEl = function (ref) { return document.querySelector('#auGrid [data-mkws="' + CSS.escape(ref) + '"], #auRows .cq-row[data-i="' + findIndex(ref) + '"]'); };
    var showAll = function () {
      /* A focused item has to be on screen: clear whatever is filtering it out. */
      if (lens !== 'automations') showTab('automations');
      if (auState.scope !== 'all') { var b = document.querySelector('#sideAutos [data-scope="all"]'); if (b) b.click(); }
      if (auState.type !== 'all') { var t = document.querySelector('#sideType [data-type="all"]'); if (t) t.click(); }
      if (auState.q) { auState.q = ''; byId('auQ').value = ''; renderAutos(); }
    };
    var openByRef = function (ref) { var k = findIndex(ref); if (k >= 0) openPanel(k); };
  }

  /* ════════════════════════════════════════════════════════════════
     AGENTS
     ════════════════════════════════════════════════════════════════ */
  if (PAGE === 'agent') {
    var toItem = function (w) {
      var c = cfg(w);
      var model = w.ready ? (w.modelShared ? w.model : (c.model || w.model || '—')) : (w.modelShared ? w.model : '—');
      return {
        _mk: true, ref: w.ref, name: w.name, type: 'agent', state: w.ready ? 'idle' : 'draft',
        desc: w.desc, model: model || '—',
        tools: w.tools || [], skills: w.skills || [], guards: w.guards || [],
        usedBy: [], by: w.publisher, tags: (w.tags || []).slice(0, 2), updated: 'just now', runs: 0
      };
    };
    var _card2 = cardHTML;
    cardHTML = function (a, i) {
      var h = _card2(a, i);
      if (!a._mk || state.src === 'marketplace') return h;
      h = h.replace('class="cq-card ag-card cq-tint"', 'class="cq-card ag-card cq-tint mkws-card" data-mkws="' + E(a.ref) + '"');
      h = h.replace('<span class="ag-card__top">',
        '<span class="ag-card__kind mkws-kind cq-caption-med" title="Added from the Marketplace">' + IC.store + 'Marketplace</span><span class="ag-card__top">');
      var w = wsByRef(a.ref);
      if (w && !w.ready) h = h.replace('<span class="ag-card__foot">', setupBlock(w) + '<span class="ag-card__foot">');
      return h;
    };
    var _row2 = rowHTML;
    rowHTML = function (a, i) {
      var h = _row2(a, i);
      if (!a._mk || state.src === 'marketplace') return h;
      var w = wsByRef(a.ref);
      if (w && !w.ready) h = h.replace(/<span class="cq-status" data-tone="grey"><span class="cq-status--dot"><\/span>Draft<\/span>/,
        '<span class="mkws-pill">' + IC.warn + 'Needs setup</span>');
      return h;
    };
    var _open2 = openPanel;
    openPanel = function (i) {
      _open2(i);
      var a = list()[i];
      openRef = a && a._mk && state.src !== 'marketplace' ? a.ref : null;
      var w = openRef ? wsByRef(openRef) : null;
      if (!w) return;
      var holder = document.createElement('div');
      holder.className = 'cq-panel__section mkws-sec'; holder.id = 'mkwsSec';
      byId('pBody').insertBefore(holder, byId('pBody').firstChild);
      paintSec(w);
      if (!w.ready) byId('pRunLbl').textContent = 'Configure';
    };
    var _close2 = closePanel;
    closePanel = function () { openRef = null; _close2(); };

    var sync = function () {
      var openWas = state.src === 'workspace' && state.sel >= 0 && AGENTS[state.sel] ? AGENTS[state.sel].ref || AGENTS[state.sel].name : null;
      for (var i = AGENTS.length - 1; i >= 0; i--) if (AGENTS[i]._mk) AGENTS.splice(i, 1);
      var listed = mine();
      for (var j = listed.length - 1; j >= 0; j--) AGENTS.unshift(toItem(listed[j]));
      render();
      if (openWas) {
        var k = AGENTS.findIndex(function (a) { return (a.ref || a.name) === openWas; });
        if (k >= 0 && state.src === 'workspace') openPanel(k); else closePanel();
      }
    };
    var findIndex = function (ref) { return AGENTS.findIndex(function (a) { return a.ref === ref; }); };
    var cardEl = function (ref) { return document.querySelector('#agGrid [data-mkws="' + CSS.escape(ref) + '"], #agRows .cq-row[data-i="' + findIndex(ref) + '"]'); };
    var showAll = function () {
      if (state.src !== 'workspace') { var b = document.querySelector('#srcTabs [data-src="workspace"]'); if (b) b.click(); }
      if (state.type !== 'all') { var t = document.querySelector('#sideType [data-type="all"]'); if (t) t.click(); }
      if (state.q) { state.q = ''; byId('agQ').value = ''; render(); }
    };
    var openByRef = function (ref) { var k = findIndex(ref); if (k >= 0) openPanel(k); };

    /* Run on an item that is not set up yet goes to the setup instead. */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#pRun')) return;
      var w = openRef ? wsByRef(openRef) : null;
      if (!w || w.ready) return;
      e.stopPropagation(); e.preventDefault();
      focusSec();
    }, true);
  }

  if (PAGE === 'automation') {
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#pnPrimary, #pnRun')) return;
      var w = openRef ? wsByRef(openRef) : null;
      if (!w || w.ready) return;
      e.stopPropagation(); e.preventDefault();
      focusSec();
    }, true);
  }

  /* ════════════════════════════════════════════════════════════════
     THE SETUP SECTION — the same in both panels
     ════════════════════════════════════════════════════════════════ */
  function paintSec(w) {
    var sec = byId('mkwsSec');
    if (!sec) return;
    if (!w) { sec.hidden = true; sec.innerHTML = ''; return; }
    sec.hidden = false;
    var c = cfg(w);
    var word = PAGE === 'agent' ? 'agent' : 'automation';
    if (w.ready) {
      var shared = (w.shared || []).slice();
      if (w.model && w.modelShared) shared.push(w.model);
      sec.innerHTML =
        '<span class="cq-section-label cq-caption-med">FROM THE MARKETPLACE</span>' +
        '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>' +
          (w.needs && w.needs.length ? 'Configured and ready to use.' : 'Ready to use. Everything it needs was shared by the publisher.') + '</span></div>' +
        '<div>' +
          '<div class="mkws-kv"><span class="k">Publisher</span><span class="v">' + E(w.publisher) + '</span></div>' +
          (shared.length ? '<div class="mkws-kv"><span class="k">Runs on publisher’s</span><span class="v">' + E(shared.join(', ')) + '</span></div>' : '') +
          (c.model ? '<div class="mkws-kv"><span class="k">Model</span><span class="v">' + E(c.model) + '</span></div>' : '') +
          '<div class="mkws-kv"><span class="k">Added</span><span class="v">' + E(when(w.added)) + '</span></div>' +
        '</div>';
      return;
    }
    var needs = w.needs || [];
    var left = remaining(w).length;
    sec.innerHTML =
      '<span class="cq-section-label cq-caption-med">SETUP · ' + (needs.length - left) + ' OF ' + needs.length + ' DONE</span>' +
      '<div class="mkws-note cq-caption-reg">' + IC.warn + '<span>This ' + word + ' needs to be configured before it can be used. ' +
        E(w.publisher) + ' did not share ' + (needs.length === 1 ? 'this' : 'these') + ' with it, so add your own.</span></div>' +
      '<div class="mkws-steps">' + needs.map(function (n) {
        var done = needDone(w, n);
        var sub, action;
        if (n.kind === 'model') {
          sub = done ? 'Using ' + c.model : 'Publisher tested with ' + (n.tested || 'GPT-4.1');
          action = '<select class="mkws-sel" data-mkws-model="' + E(w.ref) + '" aria-label="Choose a model">' +
            '<option value="">Choose a model</option>' +
            MODEL_CHOICES.map(function (m) { return '<option' + (c.model === m ? ' selected' : '') + '>' + E(m) + '</option>'; }).join('') +
            '</select>';
        } else {
          sub = done ? 'Connected to your ' + n.name + ' account' : 'Integration' + (n.used && n.used.length ? ' · used by ' + n.used.join(', ') : '');
          action = done ? '<span class="mkws-ok">' + IC.check + 'Connected</span>'
            : '<button type="button" class="cq-btn cq-btn--tonal" data-mkws-connect="' + E(n.key) + '">Connect</button>';
        }
        return '<div class="mkws-step' + (done ? ' is-done' : '') + '">' +
          '<span class="mkws-step__ic">' + (done ? IC.check : n.kind === 'model' ? IC.brain : IC.plug) + '</span>' +
          '<span class="mkws-step__id"><span class="t cq-body2-med">' + E(n.kind === 'model' ? 'Model' : n.name) + '</span>' +
          '<span class="s cq-caption-reg">' + E(sub) + '</span></span>' + action + '</div>';
      }).join('') + '</div>' +
      '<div class="mkws-actions">' +
        '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-discard="' + E(w.ref) + '">Discard</button>' +
        '<button type="button" class="cq-btn cq-btn--primary" data-mkws-finish="' + E(w.ref) + '"' + (left ? ' disabled' : '') + '>Finish setup</button>' +
      '</div>';
  }
  function when(t) {
    if (!t) return 'Today';
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function focusSec() {
    var sec = byId('mkwsSec');
    if (!sec) return;
    sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    sec.classList.remove('is-flash'); void sec.offsetWidth; sec.classList.add('is-flash');
  }

  /* ── Changes go to the shell, which keeps them for every page ── */
  function save(w) {
    post({ cqWsUpdate: w });
    lastJSON = '';
  }
  function discard(ref) {
    var w = wsByRef(ref);
    WS = WS.filter(function (x) { return x.ref !== ref; });
    post({ cqWsRemove: ref });
    if (openRef === ref) closePanel();
    sync();
    if (w) say(w.name + ' was discarded from this workspace');
  }

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-mkws-discard]'))) {
      e.stopPropagation(); e.preventDefault();
      discard(t.getAttribute('data-mkws-discard'));
      return;
    }
    if ((t = e.target.closest('[data-mkws-config]'))) {
      e.stopPropagation(); e.preventDefault();
      openByRef(t.getAttribute('data-mkws-config'));
      setTimeout(focusSec, 60);
      return;
    }
    if ((t = e.target.closest('[data-mkws-connect]'))) {
      e.stopPropagation(); e.preventDefault();
      var w = openRef ? wsByRef(openRef) : null;
      if (!w || t.disabled) return;
      var key = t.getAttribute('data-mkws-connect');
      t.disabled = true; t.textContent = 'Connecting…';
      setTimeout(function () {
        cfg(w).done[key] = true;
        save(w);
        paintSec(w);
        refreshCard(w);
        var n = (w.needs || []).filter(function (x) { return x.key === key; })[0];
        say((n ? n.name : 'Account') + ' connected');
      }, 900);
      return;
    }
    if ((t = e.target.closest('[data-mkws-finish]'))) {
      e.stopPropagation(); e.preventDefault();
      var w2 = wsByRef(t.getAttribute('data-mkws-finish'));
      if (!w2 || remaining(w2).length) return;
      w2.ready = true;
      save(w2);
      sync();
      say(w2.name + ' is configured and ready to use');
      return;
    }
  }, true);
  document.addEventListener('change', function (e) {
    var s = e.target.closest('[data-mkws-model]');
    if (!s) return;
    var w = wsByRef(s.getAttribute('data-mkws-model'));
    if (!w) return;
    cfg(w).model = s.value;
    save(w);
    paintSec(w);
    refreshCard(w);
  });

  /* Repaint the one card without re-rendering the list under the panel. */
  function refreshCard(w) {
    var el = cardEl(w.ref);
    var block = el && el.querySelector('.mkws-setup');
    if (block) block.outerHTML = setupBlock(w);
  }

  /* ── Arrivals ── */
  function focusOn(ref) {
    showAll();
    var el = cardEl(ref);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  }
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (Array.isArray(d.cqWorkspace)) {
      var json = JSON.stringify(d.cqWorkspace);
      if (json !== lastJSON) {
        lastJSON = json;
        WS = JSON.parse(json);
        sync();
      }
    }
    if (typeof d.cqFocus === 'string') {
      pendingFocus = d.cqFocus;
      setTimeout(function () { if (pendingFocus) { focusOn(pendingFocus); pendingFocus = null; } }, 120);
    }
  });
  post({ cqWsRequest: true });
})();
