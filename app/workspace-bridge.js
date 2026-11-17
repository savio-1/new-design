/* ════════════════════════════════════════════════════════════════════
   WORKSPACE BRIDGE
   Appended to the Automations and Agents landing pages when they are
   bundled into the Marketplace app. The pages themselves are untouched:
   this script runs after theirs, reads the workspace the shell holds,
   and adds what was taken from the Marketplace to the page's own
   inventory, drawn with the page's own card.

   Every such card carries a Marketplace tag in its footer. Then one of
   two states, decided in the Marketplace when the item was added:
     ready        everything it needs was shared by the publisher. The
                  card opens the page's own detail panel, as any other.
     needs setup  the publisher kept some connections or their model.
                  An alert icon sits beside the name; opening the card
                  asks for configuration first, in a dialog, and its
                  Continue leads to the configuration screen.
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
  var openRef = null;     /* the marketplace item open in the side panel */
  var dlgRef = null;      /* … in the dialog */
  var cfgRef = null;      /* … on the configuration screen */
  var WORD = PAGE === 'agent' ? 'agent' : 'automation';

  var MODEL_CHOICES = ['GPT-4.1', 'GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 2.5 Pro', 'Mistral Large 2'];

  /* ── Glyphs. Integrations and the model use the pages' own sprite. ── */
  var IC = {
    store: '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5.5h11l-.8 7.2a1.5 1.5 0 0 1-1.5 1.3H4.8a1.5 1.5 0 0 1-1.5-1.3L2.5 5.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.6 9.8a1 1 0 0 1-.87 1.5H2.4a1 1 0 0 1-.87-1.5l5.6-9.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.2v3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".8" fill="currentColor"/></svg>',
    alert: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.8v3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="11" r=".85" fill="currentColor"/></svg>',
    plug: '<svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_integrations"/></svg>',
    brain: '<svg class="cq-ic" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_brain"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    tool: '<svg class="cq-ic" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_toolsskills"/></svg>',
    skill: '<svg class="cq-ic" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_skill"/></svg>',
    guard: '<svg class="cq-ic" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_guardrails"/></svg>',
    agent: '<svg class="cq-ic" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-pp_agent"/></svg>'
  };

  /* ── Styles, written against the pages' own tokens so both themes
        follow the page. Orange is the system's "waiting on someone". ── */
  var css = document.createElement('style');
  css.textContent = [
    /* The footer tag */
    '.mkws-tag{height:16px;flex:none;display:inline-flex;align-items:center;gap:4px;padding:0 6px;border-radius:6px;white-space:nowrap;',
    '  border:1px solid var(--strokes-colour-blue);background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue);',
    '  font:400 11px/1 var(--font-geist-mono);letter-spacing:-.11px}',
    '.mkws-tag svg{flex:none}',
    /* The alert beside the name */
    '.mkws-alert{flex:none;display:inline-flex;color:var(--text-coloured-orange)}',
    '.mkws-needs .ag-card__name{flex:0 1 auto}',
    '.mkws-namerow{display:flex;align-items:center;gap:6px;min-width:0}',
    '.mkws-namerow .au-card__name{min-width:0}',
    '.mkws-card.is-flash{animation:mkws-flash 1.6s ease-out 1}',
    '@keyframes mkws-flash{0%{box-shadow:0 0 0 0 rgba(13,153,255,0)}20%{box-shadow:0 0 0 4px rgba(13,153,255,.45)}100%{box-shadow:0 0 0 0 rgba(13,153,255,0)}}',
    '@media (prefers-reduced-motion: reduce){.mkws-card.is-flash{animation:none;outline:2px solid var(--strokes-card-selected)}}',
    /* The list-view pill */
    '.mkws-pill{height:24px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;border-radius:12px;white-space:nowrap;',
    '  background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange);font:500 var(--fs-caption)/16px var(--font-geist)}',

    /* Shared rows: one per missing piece */
    '.mkws-steps{display:flex;flex-direction:column;border:1px solid var(--strokes-line-1);border-radius:12px;overflow:hidden;background:var(--backgrounds-page-bg-2)}',
    '.mkws-step{display:flex;align-items:center;gap:12px;padding:12px 14px;border-top:1px solid var(--strokes-line-3)}',
    '.mkws-step:first-child{border-top:0}',
    '.mkws-step__ic{width:32px;height:32px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;',
    '  background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.mkws-step.is-done .mkws-step__ic{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.mkws-step__id{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.mkws-step__id .t{color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkws-step__id .s{color:var(--text-teritiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkws-ok{display:inline-flex;align-items:center;gap:4px;color:var(--text-coloured-green);font:500 var(--fs-caption)/16px var(--font-geist);white-space:nowrap}',
    '.mkws-step .cq-btn{height:32px;flex:none}',
    '.mkws-sel{flex:none;height:32px;width:190px;padding:0 28px 0 10px;border-radius:8px;cursor:pointer;',
    '  background:var(--backgrounds-type-default-bg-1) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 16 16\' fill=\'none\'%3E%3Cpath d=\'m4 6 4 4 4-4\' stroke=\'%238c8c8c\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E") no-repeat right 10px center;',
    '  border:1px solid var(--strokes-type-default);color:var(--text-primary);appearance:none;-webkit-appearance:none;',
    '  font:400 14px/1 var(--font-geist);letter-spacing:-.5px}',
    '.mkws-sel:focus-visible{outline:2px solid var(--strokes-type-focus);outline-offset:1px}',
    '.mkws-sel option{background:var(--backgrounds-page-bg-2);color:var(--text-primary)}',
    '.mkws-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:10px;',
    '  background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.mkws-note svg{flex:none;margin-top:2px}',
    '.mkws-note.is-ok{background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',

    /* The panel section, for ready items */
    '.mkws-sec{display:flex;flex-direction:column;gap:12px}',
    '.mkws-kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--strokes-line-3)}',
    '.mkws-kv:last-child{border-bottom:0}',
    '.mkws-kv .k{color:var(--text-teritiary);font:500 var(--fs-caption)/16px var(--font-geist)}',
    '.mkws-kv .v{color:var(--text-secondary);text-align:right;font:400 13px/18px var(--font-geist)}',

    /* Our surfaces sit on the body, outside the page's .cq scope, so they
       take its reset and type here — at zero specificity, under .cq-btn. */
    '.mkws-scrim,.mkws-cfg{font-family:var(--font-geist);color:var(--text-primary);-webkit-font-smoothing:antialiased}',
    ':where(.mkws-scrim,.mkws-cfg) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}',
    ':where(.mkws-scrim,.mkws-cfg) :focus-visible{outline:2px solid var(--strokes-type-focus);outline-offset:2px}',
    /* The dialog */
    '.mkws-scrim{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;',
    '  background:var(--scrim);opacity:0;transition:opacity .16s ease}',
    '.mkws-scrim.is-shown{opacity:1}',
    '.mkws-dlg{width:min(480px,100%);max-height:calc(100vh - 48px);overflow:auto;display:flex;flex-direction:column;gap:16px;padding:24px;',
    '  border-radius:16px;background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-card-default);box-shadow:var(--shadow-tiq);',
    '  transform:translateY(6px) scale(.98);transition:transform .2s cubic-bezier(.2,.8,.2,1)}',
    '.mkws-scrim.is-shown .mkws-dlg{transform:none}',
    /* Icon and heading on one row; the text below runs from the left edge. */
    '.mkws-dlg__intro{display:flex;flex-direction:column;gap:8px}',
    '.mkws-dlg__head{display:flex;align-items:center;gap:10px}',
    '.mkws-dlg__ic{width:32px;height:32px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;',
    '  background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.mkws-dlg__ic svg{width:18px;height:18px}',
    '.mkws-dlg__title{flex:1 1 auto;min-width:0;margin:0;color:var(--text-primary)}',
    '.mkws-dlg__text{margin:0;color:var(--text-secondary)}',
    '.mkws-x{flex:none;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-teritiary)}',
    '.mkws-x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.mkws-dlg__label{color:var(--text-teritiary)}',
    '.mkws-dlg__foot{display:flex;align-items:center;gap:8px}',
    '.mkws-dlg__foot .sp{flex:1 1 auto}',

    /* The configuration screen: the page frame, given over to setup */
    '.mkws-cfg{position:fixed;z-index:250;top:8px;right:8px;bottom:8px;left:var(--rail-w,68px);display:flex;flex-direction:column;',
    '  border:1px solid var(--strokes-line-3);border-radius:var(--radius-lg,12px);overflow:hidden;background:var(--backgrounds-page-bg-4);',
    '  opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .24s cubic-bezier(.2,.8,.2,1)}',
    '.mkws-cfg.is-shown{opacity:1;transform:none}',
    '.mkws-cfg__bar{flex:none;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px 0 12px;',
    '  background:var(--backgrounds-card-bg-5);border-bottom:1px solid var(--strokes-line-3)}',
    '.mkws-cfg__back{height:32px;display:inline-flex;align-items:center;gap:4px;padding:0 10px 0 6px;border-radius:8px;color:var(--text-secondary)}',
    '.mkws-cfg__back:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.mkws-cfg__sep{width:1px;height:20px;background:var(--strokes-line-1)}',
    '.mkws-cfg__title{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px}',
    '.mkws-cfg__title .n{color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkws-cfg__mark{width:32px;height:32px;flex:none;border-radius:9px;display:block}',
    '.mkws-cfg__mark--auto{display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.mkws-cfg__bar .cq-btn{height:36px}',
    '.mkws-cfg__body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:32px 24px 48px}',
    '.mkws-cfg__grid{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;align-items:start}',
    '@media (max-width:980px){.mkws-cfg__grid{grid-template-columns:minmax(0,1fr)}}',
    '.mkws-cfg__main{display:flex;flex-direction:column;gap:24px}',
    '.mkws-cfg__h{margin:0;color:var(--text-primary)}',
    '.mkws-cfg__lede{margin:4px 0 0;color:var(--text-secondary)}',
    '.mkws-cfg__group{display:flex;flex-direction:column;gap:10px}',
    '.mkws-cfg__label{display:flex;align-items:center;justify-content:space-between;color:var(--text-teritiary)}',
    '.mkws-prog{display:flex;align-items:center;gap:10px;color:var(--text-secondary)}',
    '.mkws-prog__bar{width:120px;height:6px;border-radius:3px;background:var(--backgrounds-card-bg-4);overflow:hidden}',
    '.mkws-prog__bar i{display:block;height:100%;border-radius:3px;background:var(--backgrounds-button-primary);transition:width .3s ease}',
    '.mkws-side{display:flex;flex-direction:column;border:1px solid var(--strokes-line-1);border-radius:12px;background:var(--backgrounds-page-bg-2);overflow:hidden}',
    '.mkws-side__sec{display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-top:1px solid var(--strokes-line-3)}',
    '.mkws-side__sec:first-child{border-top:0}',
    '.mkws-side__label{color:var(--text-teritiary)}',
    '.mkws-pills{display:flex;flex-wrap:wrap;gap:6px}',
    '.mkws-pill2{height:26px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border-radius:8px;',
    '  background:var(--backgrounds-card-bg-4);color:var(--text-secondary);font:400 12px/1 var(--font-geist);letter-spacing:-.24px}',
    '.mkws-pill2 .cq-ic{color:var(--text-teritiary)}',
    '.mkws-side p{margin:0;color:var(--text-secondary)}',

    /* A toast for the page that has none of its own */
    '.mkws-toast{position:fixed;left:50%;bottom:28px;z-index:400;transform:translate(-50%,8px);opacity:0;pointer-events:none;',
    '  padding:10px 16px;border-radius:8px;background:var(--text-primary);color:var(--backgrounds-page-bg-1);',
    '  font:500 14px/20px var(--font-geist);letter-spacing:-.4px;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .18s ease,transform .18s ease}',
    '.mkws-toast.is-shown{opacity:1;transform:translate(-50%,0)}',
    '@media (prefers-reduced-motion: reduce){.mkws-scrim,.mkws-dlg,.mkws-cfg{transition:none}}'
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
  function needsSetup(ref) { var w = wsByRef(ref); return !!(w && !w.ready); }

  var TAG = '<span class="mkws-tag" title="Added from the Marketplace">' + IC.store + 'Marketplace</span>';
  var ALERT = '<span class="mkws-alert" title="Needs to be configured before it can be used" aria-label="Needs configuration" role="img">' + IC.alert + '</span>';

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

    /* The page's own functions, wrapped rather than replaced. A
       marketplace item that still needs setup carries no flag of its
       own: the alert by the name says it. */
    var _flag = flag;
    flag = function (a) { return a && a._mk ? '' : _flag(a); };
    var _inScope = inScope;
    inScope = function (a) { return a._mk && auState.scope === 'running' ? false : _inScope(a); };
    var _card = cardHTML;
    cardHTML = function (a, i) {
      var h = _card(a, i);
      if (!a._mk) return h;
      var needs = needsSetup(a.ref);
      h = h.replace('class="au-card cq-tint"', 'class="au-card cq-tint mkws-card' + (needs ? ' mkws-needs' : '') + '" data-mkws="' + E(a.ref) + '"');
      if (needs) h = h.replace(/(<span class="au-card__name[^"]*">[^<]*<\/span>)/, '<span class="mkws-namerow">$1' + ALERT + '</span>');
      h = h.replace(/(<\/span>\s*<span class="au-card__end">)/, TAG + '$1');
      return h;
    };
    var _row = rowHTML;
    rowHTML = function (a, i) {
      var h = _row(a, i);
      if (!a._mk) return h;
      var needs = needsSetup(a.ref);
      h = h.replace('class="cq-row cq-tint"', 'class="cq-row cq-tint mkws-card' + (needs ? ' mkws-needs' : '') + '" data-mkws="' + E(a.ref) + '"');
      if (needs) h = h.replace(statusPill(a), '<span class="mkws-pill">' + IC.warn + 'Needs setup</span>');
      return h;
    };

    /* The panel, for ready items: one section of our own under the head. */
    var head = document.querySelector('#auPanel .au-panel__head');
    var sec = document.createElement('div');
    sec.className = 'cq-panel__section mkws-sec'; sec.id = 'mkwsSec'; sec.hidden = true;
    if (head) head.insertAdjacentElement('afterend', sec);

    var _open = openPanel;
    openPanel = function (i) {
      var a = AUTOS[i];
      if (a && a._mk && needsSetup(a.ref)) return openDialog(a.ref);
      _open(i);
      openRef = a && a._mk ? a.ref : null;
      paintSec(openRef ? wsByRef(openRef) : null);
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
        if (k >= 0 && !(AUTOS[k]._mk && needsSetup(AUTOS[k].ref))) openPanel(k); else closePanel();
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
    var cardEl = function (ref) { return document.querySelector('#auGrid [data-mkws="' + CSS.escape(ref) + '"], #auRows [data-mkws="' + CSS.escape(ref) + '"]'); };
    var showAll = function () {
      /* A focused item has to be on screen: clear whatever is filtering it out. */
      if (lens !== 'automations') showTab('automations');
      if (auState.scope !== 'all') { var b = document.querySelector('#sideAutos [data-scope="all"]'); if (b) b.click(); }
      if (auState.type !== 'all') { var t = document.querySelector('#sideType [data-type="all"]'); if (t) t.click(); }
      if (auState.q) { auState.q = ''; byId('auQ').value = ''; renderAutos(); }
    };
    var markFor2 = function () {
      return '<span class="mkws-cfg__mark mkws-cfg__mark--auto"><svg class="cq-ic" width="18" height="18" viewBox="0 0 16 16"><use href="#ic-pp_automation"/></svg></span>';
    };
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
      var needs = needsSetup(a.ref);
      h = h.replace('class="cq-card ag-card cq-tint"', 'class="cq-card ag-card cq-tint mkws-card' + (needs ? ' mkws-needs' : '') + '" data-mkws="' + E(a.ref) + '"');
      if (needs) h = h.replace(/(<span class="ag-card__name[^>]*>[^<]*<\/span>)/, '$1' + ALERT);
      h = h.replace(/(<\/span>\s*<span class="ag-card__end">)/, TAG + '$1');
      return h;
    };
    var _row2 = rowHTML;
    rowHTML = function (a, i) {
      var h = _row2(a, i);
      if (!a._mk || state.src === 'marketplace') return h;
      var needs = needsSetup(a.ref);
      h = h.replace('class="cq-row cq-tint"', 'class="cq-row cq-tint mkws-card' + (needs ? ' mkws-needs' : '') + '" data-mkws="' + E(a.ref) + '"');
      if (needs) h = h.replace(/<span class="cq-status" data-tone="grey"><span class="cq-status--dot"><\/span>Draft<\/span>/,
        '<span class="mkws-pill">' + IC.warn + 'Needs setup</span>');
      return h;
    };
    var _open2 = openPanel;
    openPanel = function (i) {
      var a = list()[i];
      if (a && a._mk && state.src !== 'marketplace' && needsSetup(a.ref)) return openDialog(a.ref);
      _open2(i);
      openRef = a && a._mk && state.src !== 'marketplace' ? a.ref : null;
      var w = openRef ? wsByRef(openRef) : null;
      if (!w) return;
      var holder = document.createElement('div');
      holder.className = 'cq-panel__section mkws-sec'; holder.id = 'mkwsSec';
      byId('pBody').insertBefore(holder, byId('pBody').firstChild);
      paintSec(w);
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
        if (k >= 0 && state.src === 'workspace' && !(AGENTS[k]._mk && needsSetup(AGENTS[k].ref))) openPanel(k); else closePanel();
      }
    };
    var cardEl = function (ref) { return document.querySelector('#agGrid [data-mkws="' + CSS.escape(ref) + '"], #agRows [data-mkws="' + CSS.escape(ref) + '"]'); };
    var showAll = function () {
      if (state.src !== 'workspace') { var b = document.querySelector('#srcTabs [data-src="workspace"]'); if (b) b.click(); }
      if (state.type !== 'all') { var t = document.querySelector('#sideType [data-type="all"]'); if (t) t.click(); }
      if (state.q) { state.q = ''; byId('agQ').value = ''; render(); }
    };
    var markFor2 = function (ref) {
      var a = AGENTS.filter(function (x) { return x.ref === ref; })[0];
      return a ? '<img class="mkws-cfg__mark" src="' + markFor(a) + '" alt="" width="32" height="32" />' : '';
    };
  }

  /* ════════════════════════════════════════════════════════════════
     ROWS — one per missing piece, shared by the screen
     ════════════════════════════════════════════════════════════════ */
  function stepsHTML(w) {
    var c = cfg(w);
    return '<div class="mkws-steps">' + (w.needs || []).map(function (n) {
      var done = needDone(w, n);
      var sub, action;
      if (n.kind === 'model') {
        sub = done ? 'Using ' + c.model : 'Not shared by the publisher · they tested with ' + (n.tested || 'GPT-4.1');
        action = '<select class="mkws-sel" data-mkws-model="' + E(w.ref) + '" aria-label="Choose a model">' +
          '<option value="">Choose a model</option>' +
          MODEL_CHOICES.map(function (m) { return '<option' + (c.model === m ? ' selected' : '') + '>' + E(m) + '</option>'; }).join('') +
          '</select>';
      } else {
        sub = done ? 'Connected to your ' + n.name + ' account'
          : 'Not shared by the publisher' + (n.used && n.used.length ? ' · used by ' + n.used.join(', ') : '');
        action = done ? '<span class="mkws-ok">' + IC.check + 'Connected</span>'
          : '<button type="button" class="cq-btn cq-btn--tonal" data-mkws-connect="' + E(n.key) + '" data-mkws-w="' + E(w.ref) + '">Connect</button>';
      }
      return '<div class="mkws-step' + (done ? ' is-done' : '') + '">' +
        '<span class="mkws-step__ic">' + (done ? IC.check : n.kind === 'model' ? IC.brain : IC.plug) + '</span>' +
        '<span class="mkws-step__id"><span class="t cq-body2-med">' + E(n.kind === 'model' ? 'Model' : n.name) + '</span>' +
        '<span class="s cq-caption-reg">' + E(sub) + '</span></span>' + action + '</div>';
    }).join('') + '</div>';
  }

  /* ── The panel section, ready items only ── */
  function paintSec(w) {
    var sec = byId('mkwsSec');
    if (!sec) return;
    if (!w || !w.ready) { sec.hidden = true; sec.innerHTML = ''; return; }
    sec.hidden = false;
    var c = cfg(w);
    var shared = (w.shared || []).slice();
    if (w.model && w.modelShared) shared.push(w.model);
    sec.innerHTML =
      '<span class="cq-section-label cq-caption-med">FROM THE MARKETPLACE</span>' +
      '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>' +
        (w.needs && w.needs.length ? 'Configured and ready to use.' : 'Ready to use. Everything it needs was shared by the publisher.') + '</span></div>' +
      '<div>' +
        '<div class="mkws-kv"><span class="k">Publisher</span><span class="v">' + E(w.publisher) + '</span></div>' +
        (shared.length ? '<div class="mkws-kv"><span class="k">Runs on publisher’s</span><span class="v">' + E(shared.join(', ')) + '</span></div>' : '') +
        ((w.needs || []).filter(function (n) { return n.kind !== 'model'; }).length
          ? '<div class="mkws-kv"><span class="k">Your connections</span><span class="v">' + E(w.needs.filter(function (n) { return n.kind !== 'model'; }).map(function (n) { return n.name; }).join(', ')) + '</span></div>' : '') +
        (c.model ? '<div class="mkws-kv"><span class="k">Model</span><span class="v">' + E(c.model) + '</span></div>' : '') +
        '<div class="mkws-kv"><span class="k">Added</span><span class="v">' + E(when(w.added)) + '</span></div>' +
      '</div>';
  }
  function when(t) {
    if (!t) return 'Today';
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /* ════════════════════════════════════════════════════════════════
     THE DIALOG — opening an item that is not set up yet
     ════════════════════════════════════════════════════════════════ */
  var lastFocus = null;
  function openDialog(ref) {
    var w = wsByRef(ref);
    if (!w) return;
    closeDialog(true);
    dlgRef = ref;
    lastFocus = document.activeElement;
    var needs = w.needs || [];
    var scrim = document.createElement('div');
    scrim.className = 'mkws-scrim'; scrim.id = 'mkwsDlg';
    scrim.innerHTML =
      '<div class="mkws-dlg" role="dialog" aria-modal="true" aria-labelledby="mkwsDlgT" aria-describedby="mkwsDlgD">' +
        '<div class="mkws-dlg__intro">' +
          '<div class="mkws-dlg__head">' +
            '<span class="mkws-dlg__ic">' + IC.warn + '</span>' +
            '<h2 class="mkws-dlg__title cq-subhead2-med" id="mkwsDlgT">Configure before it can be used</h2>' +
            '<button type="button" class="mkws-x" data-mkws-dlg-close aria-label="Close">' + IC.close + '</button>' +
          '</div>' +
          '<p class="mkws-dlg__text cq-body2-reg" id="mkwsDlgD"><b>' + E(w.name) + '</b> was added from the Marketplace. ' +
            E(w.publisher) + ' didn’t share ' + (needs.length === 1 ? 'one thing' : 'a few things') + ' it needs, so add your own before the first run.</p>' +
        '</div>' +
        '<span class="mkws-dlg__label cq-caption-med">TO BE ADDED · ' + remaining(w).length + ' OF ' + needs.length + '</span>' +
        '<div class="mkws-steps">' + needs.map(function (n) {
          var done = needDone(w, n);
          return '<div class="mkws-step' + (done ? ' is-done' : '') + '">' +
            '<span class="mkws-step__ic">' + (done ? IC.check : n.kind === 'model' ? IC.brain : IC.plug) + '</span>' +
            '<span class="mkws-step__id"><span class="t cq-body2-med">' + E(needLabel(n)) + '</span>' +
            '<span class="s cq-caption-reg">' + E(n.kind === 'model'
              ? (done ? 'Using ' + cfg(w).model : 'Publisher tested with ' + (n.tested || 'GPT-4.1'))
              : (done ? 'Connected' : n.used && n.used.length ? 'Used by ' + n.used.join(', ') : 'Your own account')) + '</span></span>' +
            (done ? '<span class="mkws-ok">' + IC.check + 'Done</span>' : '') +
          '</div>';
        }).join('') + '</div>' +
        '<div class="mkws-dlg__foot">' +
          '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-discard="' + E(w.ref) + '">Discard</button>' +
          '<span class="sp"></span>' +
          '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-dlg-close>Cancel</button>' +
          '<button type="button" class="cq-btn cq-btn--primary" data-mkws-continue="' + E(w.ref) + '">Continue</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('is-shown'); });
    var go = scrim.querySelector('[data-mkws-continue]');
    if (go) go.focus();
  }
  function closeDialog(quiet) {
    var s = byId('mkwsDlg');
    dlgRef = null;
    if (!s) return;
    s.remove();
    if (!quiet && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ════════════════════════════════════════════════════════════════
     THE CONFIGURATION SCREEN — Continue lands here
     ════════════════════════════════════════════════════════════════ */
  function openConfig(ref) {
    var w = wsByRef(ref);
    if (!w) return;
    closeDialog(true);
    if (typeof closePanel === 'function') closePanel();
    /* On the Agents page, configuring an agent happens in the builder. */
    if (PAGE === 'agent' && window.agb && window.agb.openSetup(ref)) return;
    cfgRef = ref;
    var el = byId('mkwsCfg');
    if (!el) {
      el = document.createElement('section');
      el.className = 'mkws-cfg'; el.id = 'mkwsCfg';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Configure');
      document.body.appendChild(el);
    }
    paintConfig(w);
    requestAnimationFrame(function () { el.classList.add('is-shown'); });
  }
  function closeConfig() {
    var el = byId('mkwsCfg');
    cfgRef = null;
    if (!el) return;
    el.classList.remove('is-shown');
    setTimeout(function () { if (!cfgRef) el.remove(); }, 200);
  }
  function paintConfig(w) {
    var el = byId('mkwsCfg');
    if (!el) return;
    var needs = w.needs || [];
    var left = remaining(w).length;
    var doneN = needs.length - left;
    var integ = needs.filter(function (n) { return n.kind !== 'model'; });
    var model = needs.filter(function (n) { return n.kind === 'model'; });
    var only = function (arr) { var c = { needs: arr, config: w.config, ref: w.ref }; return stepsHTML(c); };
    var pills = function (arr, ic) {
      return '<div class="mkws-pills">' + arr.map(function (n) { return '<span class="mkws-pill2">' + ic + E(n) + '</span>'; }).join('') + '</div>';
    };
    var inside = [];
    if (w.agents && w.agents.length) inside.push(['AGENTS · ' + w.agents.length, pills(w.agents, IC.agent)]);
    if (w.tools && w.tools.length) inside.push(['TOOLS · ' + w.tools.length, pills(w.tools, IC.tool)]);
    if (w.skills && w.skills.length) inside.push(['SKILLS · ' + w.skills.length, pills(w.skills, IC.skill)]);
    if (w.guards && w.guards.length) inside.push(['GUARDRAILS · ' + w.guards.length, pills(w.guards, IC.guard)]);
    var shared = (w.shared || []).slice();
    if (w.model && w.modelShared) shared.push(w.model);

    el.innerHTML =
      '<div class="mkws-cfg__bar">' +
        '<button type="button" class="mkws-cfg__back cq-body2-med" data-mkws-cfg-close>' + IC.back + (PAGE === 'agent' ? 'Agents' : 'Automations') + '</button>' +
        '<span class="mkws-cfg__sep"></span>' +
        '<span class="mkws-cfg__title">' + markFor2(w.ref) +
          '<span style="display:flex;flex-direction:column;min-width:0">' +
            '<span class="n cq-body1-med">Configure ' + E(w.name) + '</span>' +
            '<span class="cq-caption-reg" style="color:var(--text-teritiary)">From the Marketplace · published by ' + E(w.publisher) + '</span>' +
          '</span>' +
        '</span>' +
        '<span class="mkws-prog cq-caption-reg"><span class="mkws-prog__bar"><i style="width:' + (needs.length ? Math.round(doneN / needs.length * 100) : 100) + '%"></i></span>' + doneN + ' of ' + needs.length + ' done</span>' +
        '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-discard="' + E(w.ref) + '">Discard</button>' +
        '<button type="button" class="cq-btn cq-btn--primary" data-mkws-finish="' + E(w.ref) + '"' + (left ? ' disabled' : '') + '>Finish setup</button>' +
      '</div>' +
      '<div class="mkws-cfg__body">' +
        '<div class="mkws-cfg__grid">' +
          '<div class="mkws-cfg__main">' +
            '<div>' +
              '<h2 class="mkws-cfg__h cq-subhead1-med">Set up what the publisher didn’t share</h2>' +
              '<p class="mkws-cfg__lede cq-body2-reg">This ' + WORD + ' came with everything else it needs. Add the pieces below and it can be used straight away.</p>' +
            '</div>' +
            (left ? '<div class="mkws-note cq-caption-reg">' + IC.warn + '<span>' + left + ' of ' + needs.length + ' still to add. Until then it stays in your workspace as a draft and cannot run.</span></div>'
                  : '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>Everything is added. Finish setup to start using it.</span></div>') +
            (integ.length ? '<div class="mkws-cfg__group"><span class="mkws-cfg__label cq-caption-med">INTEGRATIONS</span>' + only(integ) + '</div>' : '') +
            (model.length ? '<div class="mkws-cfg__group"><span class="mkws-cfg__label cq-caption-med">MODEL</span>' + only(model) + '</div>' : '') +
          '</div>' +
          '<aside class="mkws-side">' +
            '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">ABOUT</span><p class="cq-body2-reg">' + E(w.desc) + '</p></div>' +
            inside.map(function (s) { return '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">' + s[0] + '</span>' + s[1] + '</div>'; }).join('') +
            (shared.length ? '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">SHARED BY THE PUBLISHER</span>' + pills(shared, IC.check) + '</div>' : '') +
          '</aside>' +
        '</div>' +
      '</div>';
    if (!el.contains(document.activeElement)) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  }

  /* ── Changes go to the shell, which keeps them for every page ── */
  function save(w) { post({ cqWsUpdate: w }); lastJSON = ''; }
  function discard(ref) {
    var w = wsByRef(ref);
    WS = WS.filter(function (x) { return x.ref !== ref; });
    post({ cqWsRemove: ref });
    closeDialog(true);
    if (cfgRef === ref) closeConfig();
    if (openRef === ref) closePanel();
    sync();
    if (w) say(w.name + ' was discarded from this workspace');
  }

  /* One capture listener for everything of ours, ahead of the page's own
     handlers — a card that needs setup opens the dialog, not the panel. */
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-mkws-discard]'))) {
      e.stopPropagation(); e.preventDefault();
      discard(t.getAttribute('data-mkws-discard'));
      return;
    }
    if ((t = e.target.closest('[data-mkws-continue]'))) {
      e.stopPropagation(); e.preventDefault();
      openConfig(t.getAttribute('data-mkws-continue'));
      return;
    }
    if (e.target.closest('[data-mkws-dlg-close]') || (e.target.id === 'mkwsDlg')) {
      e.stopPropagation(); e.preventDefault();
      closeDialog();
      return;
    }
    if (e.target.closest('[data-mkws-cfg-close]')) {
      e.stopPropagation(); e.preventDefault();
      closeConfig();
      return;
    }
    if ((t = e.target.closest('[data-mkws-connect]'))) {
      e.stopPropagation(); e.preventDefault();
      var w = wsByRef(t.getAttribute('data-mkws-w'));
      if (!w || t.disabled) return;
      var key = t.getAttribute('data-mkws-connect');
      t.disabled = true; t.textContent = 'Connecting…';
      setTimeout(function () {
        cfg(w).done[key] = true;
        save(w);
        if (cfgRef === w.ref) paintConfig(w);
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
      closeConfig();
      sync();
      focusOn(w2.ref, true);
      say(w2.name + ' is configured and ready to use');
      return;
    }
    /* A card or row that still needs setup: ask first. */
    if ((t = e.target.closest('.mkws-needs[data-mkws]')) && !e.target.closest('[data-more]')) {
      e.stopPropagation(); e.preventDefault();
      openDialog(t.getAttribute('data-mkws'));
      return;
    }
    /* Run or Configure on a panel that somehow holds one: the same ask. */
    if (e.target.closest('#pnPrimary, #pnRun, #pRun') && openRef && needsSetup(openRef)) {
      e.stopPropagation(); e.preventDefault();
      openDialog(openRef);
    }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (byId('mkwsDlg')) { e.stopPropagation(); closeDialog(); return; }
      if (cfgRef) { e.stopPropagation(); closeConfig(); return; }
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.mkws-needs[data-mkws]')) {
      e.stopPropagation(); e.preventDefault();
      openDialog(e.target.getAttribute('data-mkws'));
    }
    /* Keep Tab inside the dialog. */
    if (e.key === 'Tab' && byId('mkwsDlg')) {
      var f = byId('mkwsDlg').querySelectorAll('button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
  document.addEventListener('change', function (e) {
    var s = e.target.closest('[data-mkws-model]');
    if (!s) return;
    var w = wsByRef(s.getAttribute('data-mkws-model'));
    if (!w) return;
    cfg(w).model = s.value;
    save(w);
    if (cfgRef === w.ref) paintConfig(w);
  });

  function refreshCard() { /* the card shows no progress; nothing to repaint */ }

  /* ── Arrivals ── */
  function focusOn(ref, quiet) {
    if (!quiet) showAll();
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
        if (cfgRef) { var w = wsByRef(cfgRef); if (w && !w.ready) paintConfig(w); else if (!w) closeConfig(); }
      }
    }
    if (typeof d.cqFocus === 'string') {
      var ref = d.cqFocus;
      setTimeout(function () { focusOn(ref); }, 120);
    }
  });
  /* What the agent builder needs to drive setup from its own canvas. */
  window.mkws = {
    get: wsByRef,
    remaining: function (ref) { var w = wsByRef(ref); return w ? remaining(w) : []; },
    isDone: function (ref, n) { var w = wsByRef(ref); return !!(w && needDone(w, n)); },
    connect: function (ref, key, cb) {
      var w = wsByRef(ref); if (!w) return;
      setTimeout(function () {
        cfg(w).done[key] = true;
        save(w);
        var n = (w.needs || []).filter(function (x) { return x.key === key; })[0];
        say((n ? n.name : 'Account') + ' connected');
        if (cb) cb();
      }, 900);
    },
    setModel: function (ref, m) { var w = wsByRef(ref); if (!w) return; cfg(w).model = m; save(w); },
    finish: function (ref) {
      var w = wsByRef(ref); if (!w || remaining(w).length) return;
      w.ready = true;
      save(w);
      sync();
      focusOn(w.ref, true);
      say(w.name + ' is configured and ready to use');
    },
    discard: function (ref) { discard(ref); }
  };
  post({ cqWsRequest: true });
})();
