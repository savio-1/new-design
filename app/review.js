/* ════════════════════════════════════════════════════════════════════
   MARKETPLACE REVIEW
   Shared by every page in the app. Anything that moves between a
   workspace and the Marketplace passes five stages, export then import:

     publishing (Finance → Marketplace)        adding (Marketplace → Finance)
     1 Export policy check   Finance policy    1 Export policy check   Marketplace policy
     2 Export admin approval Finance admin     2 Export admin approval Platform admin
     3 Travel                                  3 Travel
     4 Import policy check   Marketplace       4 Import policy check   Finance policy
     5 Import admin approval Platform admin    5 Import admin approval Finance admin

   Policy checks and travel run on their own; admin approvals wait for a
   person. Workspace admins approve from Monitoring, the platform admin
   from the Admin panel; the bell on every page says when one is waiting.
   The state lives with the shell (cqWorkspace); approvals are written
   back to it, so every page sees the same request.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.cqReview) return;
  var inShell = window.parent !== window;
  function post(m) { if (inShell) parent.postMessage(m, '*'); }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function byId(id) { return document.getElementById(id); }
  function listAnd(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function clock(t) { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }

  var HOME = 'Finance';
  var WS_ADMINS = ['Priya Nair', 'Arjun Mehta'];
  var PLATFORM_ADMIN = 'Hitesh Vijay';
  var AUTO_MS = 1500;
  var ITEMS = [];          /* requests from the shell */
  var SAMPLES = [];        /* other people's requests, for the admin views */
  var subs = [];

  /* ── The stages ── */
  function isPub(w) { return w.flow === 'publish'; }
  function stagesOf(w) {
    var ws = w.workspace || HOME;
    return isPub(w) ? [
      { k: 'xpol', name: 'Export policy check', who: ws + ' workspace policy', auto: true,
        checks: [['Sharing rules', 'Only the details marked shared leave the workspace'], ['Secrets', w.secrets && w.secrets.length ? 'Keys shared for ' + listAnd(w.secrets) + ' are allowed to leave' : 'No keys or sign-ins leave the workspace'], ['Data classification', 'Nothing classified confidential is attached']] },
      { k: 'xadm', name: 'Export admin approval', who: ws + ' workspace admin', role: 'ws', ws: ws },
      { k: 'travel', name: 'Travel', who: 'Packaged and moved to the Marketplace', auto: true },
      { k: 'ipol', name: 'Import policy check', who: 'Marketplace import policy', auto: true,
        checks: [['Listing complete', 'Name, description, about, industry and function are filled in'], ['No customer data', 'Nothing in the shared details holds customer or personal data'], ['Naming guidelines', 'The name and description follow the Marketplace guidelines']] },
      { k: 'iadm', name: 'Import admin approval', who: 'Platform admin', role: 'platform' }
    ] : [
      { k: 'xpol', name: 'Export policy check', who: 'Marketplace export policy', auto: true,
        checks: [['Publisher verified', (w.publisher || 'The publisher') + ' is a verified Marketplace publisher'], ['Listing current', 'This is the latest approved version']] },
      { k: 'xadm', name: 'Export admin approval', who: 'Platform admin', role: 'platform' },
      { k: 'travel', name: 'Travel', who: 'Copied into the ' + ws + ' workspace', auto: true },
      { k: 'ipol', name: 'Import policy check', who: ws + ' workspace policy', auto: true,
        checks: [['Integrations allowed', w.shared && w.shared.length ? listAnd(w.shared) + (w.shared.length === 1 ? ' is' : ' are') + ' on the allow-list' : 'Uses no integrations'], ['Model allowed', (w.model || 'Its model') + ' is approved here'], ['Credential policy', w.secrets && w.secrets.length ? 'Publisher keys in ' + listAnd(w.secrets) + ' are allowed' : 'No publisher keys included'], ['Data residency', 'Runs in the workspace region, EU West']] },
      { k: 'iadm', name: 'Import admin approval', who: ws + ' workspace admin', role: 'ws', ws: ws }
    ];
  }
  /* Where a request stands: the stage it is on, and whether that stage is
     running, waiting for a person, done or rejected. */
  function stageOf(w) {
    var S = stagesOf(w), t = w.requestedAt || Date.now(), now = Date.now(), ap = w.approvals || {}, times = [];
    for (var i = 0; i < S.length; i++) {
      var st = S[i];
      if (st.auto) {
        if (now < t + AUTO_MS) return { i: i, state: 'running', stages: S, times: times };
        t += AUTO_MS; times[i] = t;
      } else {
        var a = ap[st.k];
        if (!a) return { i: i, state: 'waiting', stages: S, times: times };
        if (a.rejected) return { i: i, state: 'rejected', stages: S, times: times, by: a.by, note: a.note };
        t = Math.max(t, a.at); times[i] = a.at;
      }
    }
    return { i: S.length, state: 'done', stages: S, times: times };
  }
  function doneLabel(w) { return isPub(w) ? 'Live on the Marketplace' : 'Ready to add'; }
  function stateLabel(w, s) {
    s = s || stageOf(w);
    if (s.state === 'done') return doneLabel(w);
    var st = s.stages[s.i];
    if (s.state === 'rejected') return 'Rejected at ' + st.name.toLowerCase();
    if (s.state === 'waiting') return 'Waiting for ' + (st.role === 'platform' ? 'platform admin' : st.ws + ' admin');
    return st.k === 'travel' ? 'In transit' : st.k === 'xpol' ? 'Checking export policy' : 'Checking import policy';
  }
  var IC = {
    check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clock: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.8V8l2.2 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    spin: '<span class="cqr-spin" aria-hidden="true"></span>',
    bell: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6.5a4 4 0 0 1 8 0v2.8l1.2 2.2H2.8L4 9.3V6.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.5 13a1.6 1.6 0 0 0 3 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  };
  /* The tag says only where it stands; the full line is its tooltip. */
  function shortLabel(w, s) {
    if (s.state === 'done') return isPub(w) ? 'Live' : 'Ready';
    if (s.state === 'rejected') return 'Rejected';
    if (s.state === 'waiting') return 'Waiting';
    return s.stages[s.i].k === 'travel' ? 'In transit' : 'Checking';
  }
  function pill(w, s) {
    s = s || stageOf(w);
    var cls = s.state === 'done' ? 'is-ok' : s.state === 'waiting' ? 'is-wait' : s.state === 'rejected' ? 'is-rej' : '';
    var ic = s.state === 'done' ? IC.check : s.state === 'waiting' ? IC.clock : s.state === 'rejected' ? IC.x : IC.spin;
    return '<span class="cqr-pill ' + cls + '" title="' + E(stateLabel(w, s)) + '">' + ic + E(shortLabel(w, s)) + '</span>';
  }
  function bars(w, s) {
    s = s || stageOf(w);
    return '<span class="cqr-bars" aria-hidden="true">' + s.stages.map(function (_, j) {
      var c = s.state === 'done' || j < s.i ? 'is-done' : j === s.i ? (s.state === 'waiting' ? 'is-wait' : s.state === 'rejected' ? 'is-rej' : 'is-now') : '';
      return '<i class="' + c + '"></i>';
    }).join('') + '</span>';
  }
  function stepText(w, s) {
    s = s || stageOf(w);
    return s.state === 'done' ? 'All 5 stages passed' : 'Stage ' + (s.i + 1) + ' of 5 · ' + s.stages[s.i].name;
  }
  /* The tracker. opts.role ('ws' | 'platform') adds Approve and Reject to
     the stage that role decides; opts.links adds, for the requester, a
     shortcut to where that admin reviews it. */
  function trackerHTML(w, opts) {
    opts = opts || {};
    var s = stageOf(w), t0 = w.requestedAt || Date.now(), ap = w.approvals || {};
    var rows = [['req', isPub(w) ? 'Submitted' : 'Requested', (isPub(w) ? 'Submitted to the Marketplace' : 'Requested from the Marketplace') + ' by ' + (w.requester || 'you') + ' · ' + clock(t0)]];
    var html = '<ol class="cqr-steps">' +
      '<li class="cqr-step is-done"><span class="cqr-dot">' + IC.check + '</span><span class="cqr-step__b"><span class="cqr-step__t">' + rows[0][1] + '</span><span class="cqr-step__s">' + E(rows[0][2]) + '</span></span></li>';
    s.stages.forEach(function (st, j) {
      var c = s.state === 'done' || j < s.i ? 'is-done' : j === s.i ? (s.state === 'waiting' ? 'is-wait' : s.state === 'rejected' ? 'is-rej' : 'is-now') : 'is-todo';
      var dot = c === 'is-done' ? IC.check : c === 'is-wait' ? IC.clock : c === 'is-rej' ? IC.x : c === 'is-now' ? IC.spin : (j + 1);
      var sub = st.who, tag = '', extra = '';
      if (c === 'is-done') {
        if (!st.auto) { var a = ap[st.k] || {}; sub = 'Approved by ' + (a.by || 'an admin') + ' · ' + clock(a.at || Date.now()) + (a.note ? ' · “' + a.note + '”' : ''); tag = '<span class="cqr-tag is-ok">' + IC.check + 'Approved</span>'; }
        else { sub = st.who + (s.times[j] ? ' · ' + clock(s.times[j]) : ''); tag = '<span class="cqr-tag is-ok">' + IC.check + (st.k === 'travel' ? 'Arrived' : 'Passed') + '</span>'; }
      } else if (c === 'is-now') {
        tag = '<span class="cqr-tag">' + IC.spin + (st.k === 'travel' ? 'Moving' : 'Checking') + '</span>';
      } else if (c === 'is-wait') {
        var who = st.role === 'platform' ? PLATFORM_ADMIN + ', platform admin' : listAnd(WS_ADMINS.concat(['you'])) + ', ' + st.ws + ' admins';
        sub = 'Waiting for ' + st.who + '. ' + who + (st.role === 'platform' ? ' has' : ' have') + ' been notified.';
        tag = '<span class="cqr-tag is-wait">' + IC.clock + 'Waiting</span>';
        if (opts.role && opts.role === st.role) {
          extra = '<div class="cqr-decide"><textarea class="cqr-note" data-cqr-note placeholder="Add a note for the requester (optional)"></textarea>' +
            '<div class="cqr-decide__acts"><button type="button" class="cqr-btn cqr-btn--ghost" data-cqr-reject="' + E(w.ref) + '|' + st.k + '">Reject</button>' +
            '<button type="button" class="cqr-btn cqr-btn--primary" data-cqr-approve="' + E(w.ref) + '|' + st.k + '">Approve</button></div></div>';
        } else if (opts.links) {
          extra = '<button type="button" class="cqr-link" data-cqr-goto="' + (st.role === 'platform' ? 'admin' : 'monitoring') + '|' + E(w.ref) + '">' +
            (st.role === 'platform' ? 'Review as platform admin in the Admin panel' : 'Review as ' + st.ws + ' admin in Monitoring') + ' →</button>';
        }
      } else if (c === 'is-rej') {
        sub = 'Rejected by ' + (s.by || 'an admin') + (s.note ? ' · “' + s.note + '”' : '');
        tag = '<span class="cqr-tag is-rej">' + IC.x + 'Rejected</span>';
      }
      if (st.checks && (c === 'is-done' || c === 'is-now')) {
        extra += '<ul class="cqr-checks">' + st.checks.map(function (k) {
          return '<li class="' + (c === 'is-done' ? 'is-ok' : '') + '"><span class="ci">' + (c === 'is-done' ? IC.check : IC.spin) + '</span><span><b>' + E(k[0]) + '</b>' + E(k[1]) + '</span></li>';
        }).join('') + '</ul>';
      }
      html += '<li class="cqr-step ' + c + '"><span class="cqr-dot">' + dot + '</span><span class="cqr-step__b"><span class="cqr-step__t">' +
        '<span class="cqr-n">' + (j + 1) + '</span>' + E(st.name) + tag + '</span><span class="cqr-step__s">' + E(sub) + '</span>' + extra + '</span></li>';
    });
    var last = s.state === 'done';
    html += '<li class="cqr-step ' + (last ? 'is-done' : 'is-todo') + '"><span class="cqr-dot">' + (last ? IC.check : '') + '</span><span class="cqr-step__b"><span class="cqr-step__t">' + doneLabel(w) + '</span>' +
      '<span class="cqr-step__s">' + (last ? (isPub(w) ? 'Anyone in your organisation can now find it and request it for their workspace.' : 'Every stage passed. It can be added to the workspace.') : 'Once all five stages pass') + '</span></span></li></ol>';
    return html;
  }

  /* ── Who has to act ── */
  function all() { return ITEMS.concat(SAMPLES); }
  function requests() { return all().filter(function (w) { return isPub(w) || w.status === 'requested' || w.approvals; }); }
  function pendingFor(role) {
    return requests().filter(function (w) { var s = stageOf(w); return s.state === 'waiting' && s.stages[s.i].role === role; });
  }
  function find(ref) { var a = all(); for (var i = 0; i < a.length; i++) if (a[i].ref === ref) return a[i]; return null; }
  function decide(ref, key, ok, note) {
    var w = find(ref); if (!w) return;
    w.approvals = w.approvals || {};
    w.approvals[key] = { by: 'You', at: Date.now(), rejected: !ok, note: note || '' };
    if (!w.sample) post({ cqWsUpdate: w });
    emit();
  }
  function emit() { subs.forEach(function (f) { try { f(); } catch (e) {} }); paintBells(); }

  /* ── Styles, against the platform's own tokens ── */
  var css = document.createElement('style');
  css.textContent = [
    ':root{--backgrounds-badge-orange:#241101;--strokes-colour-orange:#8a480f;--text-coloured-orange:#ffc470;--backgrounds-badge-red:#2b0a08;--strokes-colour-red:#771208;--text-coloured-red:#ffafa3}',
    ':root[data-mode="light"]{--backgrounds-badge-orange:#fff4e5;--strokes-colour-orange:#fcd19c;--text-coloured-orange:#8a480f;--backgrounds-badge-red:#fff5f5;--strokes-colour-red:#ffc7c2;--text-coloured-red:#dc3412}',
    '.cqr-spin{width:10px;height:10px;flex:none;display:inline-block;border-radius:50%;border:1.6px solid currentColor;border-right-color:transparent;animation:cqr-rot .8s linear infinite}',
    '@keyframes cqr-rot{to{transform:rotate(360deg)}}',
    '.cqr-pill{height:18px;display:inline-flex;align-items:center;gap:3px;padding:0 6px;border-radius:9px;white-space:nowrap;font:500 10px/12px var(--font-geist);letter-spacing:0;',
    '.cqr-pill svg{width:9px;height:9px}',
    '.cqr-pill .cqr-spin{width:7px;height:7px;border-width:1.3px}',
    '  background:var(--backgrounds-badge-blue);border:1px solid var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    '.cqr-pill.is-ok{background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',
    '.cqr-pill.is-wait{background:var(--backgrounds-badge-orange);border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.cqr-pill.is-rej{background:var(--backgrounds-badge-red,rgba(220,52,18,.12));border-color:var(--strokes-colour-red,rgba(220,52,18,.4));color:var(--text-coloured-red,#ff7a5c)}',
    '.cqr-bars{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;min-width:120px}',
    '.cqr-bars i{height:4px;border-radius:2px;background:var(--backgrounds-card-bg-4)}',
    '.cqr-bars i.is-done{background:var(--text-coloured-green)}',
    '.cqr-bars i.is-wait{background:var(--text-coloured-orange)}',
    '.cqr-bars i.is-rej{background:var(--text-coloured-red,#ff7a5c)}',
    '.cqr-bars i.is-now{background:var(--text-coloured-blue)}',
    '.cqr-steps{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}',
    '.cqr-step{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);column-gap:12px;padding-bottom:16px}',
    '.cqr-step:last-child{padding-bottom:0}',
    '.cqr-step::before{content:"";position:absolute;left:11px;top:28px;bottom:4px;width:2px;border-radius:1px;background:var(--strokes-line-1)}',
    '.cqr-step:last-child::before{display:none}',
    '.cqr-step.is-done::before{background:var(--strokes-colour-green)}',
    '.cqr-dot{width:24px;height:24px;box-sizing:border-box;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid var(--strokes-line-1);',
    '  background:var(--backgrounds-card-bg-2);color:var(--text-teritiary);font:500 11px/1 var(--font-geist)}',
    '.is-done > .cqr-dot{border-color:var(--strokes-colour-green);background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.is-now > .cqr-dot{border-color:var(--strokes-colour-blue);background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.is-wait > .cqr-dot{border-color:var(--strokes-colour-orange);background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.is-rej > .cqr-dot{border-color:var(--strokes-colour-red,rgba(220,52,18,.4));color:var(--text-coloured-red,#ff7a5c)}',
    '.cqr-step__b{display:flex;flex-direction:column;gap:2px;min-width:0;padding-top:2px}',
    '.cqr-step__t{display:flex;align-items:center;gap:8px;color:var(--text-primary);font:500 14px/20px var(--font-geist);letter-spacing:-.4px}',
    '.is-todo .cqr-step__t{color:var(--text-teritiary)}',
    '.cqr-n{color:var(--text-teritiary);font:400 11px/1 var(--font-geist-mono,monospace)}',
    '.cqr-step__s{color:var(--text-secondary);font:400 12px/16px var(--font-geist)}',
    '.cqr-tag{height:20px;display:inline-flex;align-items:center;gap:5px;padding:0 7px;border-radius:10px;font:500 11px/1 var(--font-geist);background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.cqr-tag.is-ok{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.cqr-tag.is-wait{background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.cqr-tag.is-rej{background:var(--backgrounds-badge-red,rgba(220,52,18,.12));color:var(--text-coloured-red,#ff7a5c)}',
    '.cqr-checks{margin:8px 0 0;padding:8px 10px;list-style:none;display:flex;flex-direction:column;gap:6px;border-radius:10px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-line-3)}',
    '.cqr-checks li{display:grid;grid-template-columns:16px minmax(0,1fr);gap:8px;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqr-checks li b{display:block;font-weight:500;color:var(--text-secondary)}',
    '.cqr-checks li.is-ok .ci{color:var(--text-coloured-green)}',
    '.cqr-checks .ci{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--text-coloured-blue)}',
    '.cqr-decide{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:10px;border-radius:10px;background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange)}',
    '.cqr-note{width:100%;box-sizing:border-box;min-height:56px;padding:8px 10px;border-radius:8px;resize:vertical;background:var(--backgrounds-type-default-bg-1);border:1px solid var(--strokes-type-default);',
    '  color:var(--text-primary);font:400 13px/18px var(--font-geist)}',
    '.cqr-note:focus{outline:none;border-color:var(--strokes-card-selected)}',
    '.cqr-decide__acts{display:flex;justify-content:flex-end;gap:8px}',
    '.cqr-btn{height:32px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 13px/18px var(--font-geist)}',
    '.cqr-btn--primary{background:var(--backgrounds-button-primary);color:#fff}',
    '.cqr-btn--ghost{background:none;border:1px solid var(--strokes-line-1);color:var(--text-primary)}',
    '.cqr-link{align-self:flex-start;margin-top:6px;padding:0;border:0;background:none;cursor:pointer;color:var(--text-coloured-blue);font:500 12px/16px var(--font-geist)}',
    '.cqr-link:hover{text-decoration:underline}',
    /* Menus off the header: bell and workspace switch */
    '.cqr-menu{position:fixed;z-index:500;width:360px;max-height:min(480px,calc(100vh - 80px));overflow-y:auto;padding:6px;border-radius:12px;',
    '  background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 12px 32px rgba(0,0,0,.35);font-family:var(--font-geist);color:var(--text-primary)}',
    '.cqr-menu[hidden]{display:none}',
    '.cqr-menu--ws{width:260px}',
    '.cqr-menu__h{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px;color:var(--text-teritiary);font:500 11px/16px var(--font-geist);letter-spacing:.04em;text-transform:uppercase}',
    '.cqr-mi{width:100%;display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border:0;border-radius:8px;background:none;cursor:pointer;text-align:left;color:inherit;font:400 13px/18px var(--font-geist)}',
    '.cqr-mi:hover{background:var(--backgrounds-card-bg-4)}',
    '.cqr-mi .av{width:20px;height:20px;flex:none;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:500 11px/1 var(--font-geist);color:#fff}',
    '.cqr-mi .tx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.cqr-mi .tx b{font-weight:500}',
    '.cqr-mi .tx small{color:var(--text-teritiary);font-size:12px;line-height:16px}',
    '.cqr-mi .ck{flex:none;color:var(--text-coloured-blue);display:inline-flex;margin-top:2px}',
    '.cqr-mi .ic{width:28px;height:28px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.cqr-mi--admin{align-items:center}',
    '.cqr-mi--admin .ic{background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.cqr-sep{height:1px;margin:6px 4px;background:var(--strokes-line-1)}',
    '.cqr-empty{padding:16px 10px;color:var(--text-teritiary);font:400 13px/18px var(--font-geist);text-align:center}',
    '.cqr-bell-dot{position:absolute;top:4px;right:4px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
    '  background:#f24822;color:#fff;font:600 10px/1 var(--font-geist);box-shadow:0 0 0 2px var(--backgrounds-card-bg-5,#1b1b1b);pointer-events:none}',
    /* The approvals queue (Admin panel, Monitoring) */
    '.cqr-q{display:flex;flex-direction:column;gap:16px}',
    '.cqr-q__bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.cqr-chip{height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border-radius:999px;cursor:pointer;background:none;border:1px solid var(--strokes-card-default);',
    '  color:var(--text-secondary);font:500 13px/18px var(--font-geist)}',
    '.cqr-chip .n{color:var(--text-teritiary);font-weight:400}',
    '.cqr-chip[aria-pressed="true"]{background:var(--backgrounds-badge-blue);border-color:var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    '.cqr-chip[aria-pressed="true"] .n{color:inherit;opacity:.75}',
    '.cqr-sp{flex:1 1 auto}',
    '.cqr-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--strokes-card-default);border-radius:12px;overflow:hidden;background:var(--backgrounds-card-bg-2)}',
    '.cqr-table th{text-align:left;padding:12px;background:var(--backgrounds-page-bg-3,var(--backgrounds-card-bg-5));color:var(--text-secondary);font:500 13px/18px var(--font-geist);border-bottom:1px solid var(--strokes-card-default)}',
    '.cqr-table td{padding:12px;border-bottom:1px solid var(--strokes-line-3);color:var(--text-primary);font:400 13px/18px var(--font-geist);vertical-align:middle}',
    '.cqr-table tr:last-child td{border-bottom:0}',
    '.cqr-table tbody tr{cursor:pointer}',
    '.cqr-table tbody tr:hover td{background:var(--backgrounds-card-bg-4)}',
    '.cqr-table tbody tr.is-sel td{background:var(--backgrounds-badge-blue)}',
    '.cqr-art{display:flex;align-items:center;gap:10px;min-width:0}',
    '.cqr-art .ic{width:32px;height:32px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.cqr-art .tx{display:flex;flex-direction:column;min-width:0}',
    '.cqr-art .tx b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cqr-art .tx small{color:var(--text-teritiary);font-size:12px}',
    '.cqr-dir{display:inline-flex;align-items:center;gap:6px;color:var(--text-secondary);white-space:nowrap}',
    '.cqr-stage{display:flex;flex-direction:column;gap:6px;min-width:150px}',
    '.cqr-stage small{color:var(--text-teritiary);font-size:12px}',
    '.cqr-act{height:30px;padding:0 12px;border-radius:8px;cursor:pointer;font:500 12px/16px var(--font-geist);background:var(--backgrounds-button-primary);color:#fff;border:0;white-space:nowrap}',
    '.cqr-act--ghost{background:none;border:1px solid var(--strokes-line-1);color:var(--text-primary)}',
    '.cqr-qempty{padding:40px 16px;text-align:center;color:var(--text-teritiary);border:1px dashed var(--strokes-line-1);border-radius:12px;font:400 14px/20px var(--font-geist)}',
    /* Detail drawer */
    '.cqr-drawer{position:fixed;top:57px;right:8px;bottom:8px;border-radius:0 0 12px 0;z-index:400;width:440px;max-width:100vw;display:flex;flex-direction:column;background:var(--backgrounds-page-bg-2);',
    '  border-left:1px solid var(--strokes-line-3);box-shadow:-8px 0 24px rgba(0,0,0,.25);transform:translateX(100%);transition:transform .26s cubic-bezier(.4,0,.2,1);font-family:var(--font-geist);color:var(--text-primary)}',
    '.cqr-drawer.is-open{transform:none}',
    '.cqr-drawer__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid var(--strokes-line-1)}',
    '.cqr-drawer__x{width:32px;height:32px;border-radius:8px;border:0;background:none;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center}',
    '.cqr-drawer__x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.cqr-drawer__body{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column}',
    '.cqr-sec{display:flex;flex-direction:column;gap:12px;padding:16px;border-bottom:1px solid var(--strokes-line-1)}',
    '.cqr-sec:last-child{border-bottom:0}',
    '.cqr-sec__l{color:var(--text-teritiary);font:500 11px/16px var(--font-geist);letter-spacing:.04em;text-transform:uppercase}',
    '.cqr-kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--strokes-line-3);font:400 13px/18px var(--font-geist)}',
    '.cqr-kv:last-child{border-bottom:0}',
    '.cqr-kv span{color:var(--text-teritiary)}',
    '.cqr-kv b{font-weight:400;text-align:right}',
    '@media (prefers-reduced-motion: reduce){.cqr-spin{animation:none}.cqr-drawer{transition:none}}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(css);

  /* ── The bell: what is waiting on you ── */
  var NAME_HUE = ['#5860ed', '#0d99ff', '#14ae5c', '#dd7c0e', '#9747ff', '#e91e63'];
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return NAME_HUE[h % NAME_HUE.length]; }
  function bellItems() {
    return pendingFor('ws').map(function (w) { return { w: w, role: 'ws' }; })
      .concat(pendingFor('platform').map(function (w) { return { w: w, role: 'platform' }; }));
  }
  var bellMenu = null, wsMenu = null;
  function placeMenu(menu, btn) {
    var r = btn.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    menu.style.left = Math.max(8, Math.round(Math.min(window.innerWidth - menu.offsetWidth - 8, r.right - menu.offsetWidth))) + 'px';
  }
  function paintBellMenu() {
    if (!bellMenu) return;
    var list = bellItems();
    bellMenu.innerHTML = '<div class="cqr-menu__h"><span>Approvals waiting on you</span><span>' + list.length + '</span></div>' +
      (list.length ? list.map(function (x) {
        var w = x.w, s = stageOf(w);
        var who = w.requester || 'Savio Govindu';
        return '<button type="button" class="cqr-mi" data-cqr-open="' + (x.role === 'platform' ? 'admin' : 'monitoring') + '|' + E(w.ref) + '">' +
          '<span class="av" style="background:' + hue(who) + '">' + E(who[0]) + '</span>' +
          '<span class="tx"><span><b>' + E(who) + '</b> ' + (isPub(w) ? 'wants to publish ' : 'wants to add ') + '<b>' + E(w.name) + '</b>' + (isPub(w) ? ' to the Marketplace' : ' to ' + (w.workspace || HOME)) + '</span>' +
          '<small>' + E(s.stages[s.i].name) + ' · as ' + (x.role === 'platform' ? 'platform admin' : (w.workspace || HOME) + ' admin') + '</small></span></button>';
      }).join('') : '<div class="cqr-empty">Nothing waiting on you</div>');
  }
  function paintBells() {
    var n = bellItems().length;
    document.querySelectorAll('button[title="Notifications"], .cqr-bell').forEach(function (b) {
      var d = b.querySelector('.cqr-bell-dot');
      if (!n) { if (d) d.remove(); return; }
      if (!d) { d = document.createElement('span'); d.className = 'cqr-bell-dot'; if (getComputedStyle(b).position === 'static') b.style.position = 'relative'; b.appendChild(d); }
      d.textContent = n;
    });
    if (bellMenu && !bellMenu.hidden) paintBellMenu();
  }
  function closeMenus() { if (bellMenu) bellMenu.hidden = true; if (wsMenu) wsMenu.hidden = true; }
  function openBell(btn) {
    if (!bellMenu) { bellMenu = document.createElement('div'); bellMenu.hidden = true; bellMenu.className = 'cqr-menu'; bellMenu.setAttribute('role', 'menu'); document.body.appendChild(bellMenu); }
    var was = !bellMenu.hidden && bellMenu.dataset.for === 'bell';
    closeMenus();
    if (was) return;
    bellMenu.dataset.for = 'bell';
    paintBellMenu();
    bellMenu.hidden = false;
    placeMenu(bellMenu, btn);
  }
  /* ── The workspace switch, with the Admin panel at its foot ── */
  var WORKSPACES = [['Finance', '#2f7bff', 'Admin'], ['Marketing', '#7c5cff', 'Member'], ['Design systems', '#e8632b', 'Editor'], ['Customer success', '#159f7a', 'Admin']];
  function openWs(btn) {
    if (!wsMenu) { wsMenu = document.createElement('div'); wsMenu.hidden = true; wsMenu.className = 'cqr-menu cqr-menu--ws'; wsMenu.setAttribute('role', 'menu'); document.body.appendChild(wsMenu); }
    var was = !wsMenu.hidden;
    closeMenus();
    if (was) return;
    var cur = ((btn.textContent || '').trim().split(/\s+/).slice(1).join(' ') || HOME);
    wsMenu.innerHTML = '<div class="cqr-menu__h"><span>Workspaces</span></div>' + WORKSPACES.map(function (w) {
      return '<button type="button" class="cqr-mi" data-cqr-ws="' + E(w[0]) + '"><span class="av" style="background:' + w[1] + '">' + E(w[0][0]) + '</span>' +
        '<span class="tx"><b>' + E(w[0]) + '</b><small>' + w[2] + '</small></span>' + (cur.indexOf(w[0]) === 0 || (w[0] === HOME && cur === 'MDLZ') ? '<span class="ck">' + IC.check + '</span>' : '') + '</button>';
    }).join('') + '<div class="cqr-sep"></div>' + (document.body.hasAttribute('data-cq-admin')
      ? '<button type="button" class="cqr-mi cqr-mi--admin" data-cqr-portal><span class="ic"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="3.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="3.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.1 8h3m0-4.5h2.9M8 12.5h2.9M8 3.5v9" stroke="currentColor" stroke-width="1.2"/></svg></span>' +
        '<span class="tx"><b>Switch to Builder portal</b><small>Back to your workspace</small></span></button>' :
      '<button type="button" class="cqr-mi cqr-mi--admin" data-cqr-admin><span class="ic"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.8 13.2 4v3.6c0 3-2.2 5.4-5.2 6.6-3-1.2-5.2-3.6-5.2-6.6V4L8 1.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="m5.8 8 1.6 1.6 2.9-3.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="tx"><b>Switch to Admin panel</b><small>Users, workspaces, roles and Marketplace approvals</small></span></button>');
    wsMenu.hidden = false;
    placeMenu(wsMenu, btn);
  }
  function go(page, focus) {
    closeMenus();
    if (inShell) parent.postMessage(focus ? { cqNav: page, cqFocus: focus } : { cqNav: page }, '*');
  }
  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ((x = t.closest('button[title="Notifications"], .cqr-bell'))) { e.preventDefault(); e.stopPropagation(); return openBell(x); }
    if ((x = t.closest('.ws-pill[title="Switch workspace"], .cqr-ws-pill'))) { e.preventDefault(); e.stopPropagation(); return openWs(x); }
    if ((x = t.closest('[data-cqr-open]'))) { e.stopPropagation(); var p = x.getAttribute('data-cqr-open').split('|'); return go(p[0] + '.html', 'mkapp:' + p[1]); }
    if ((x = t.closest('[data-cqr-goto]'))) { e.stopPropagation(); var q = x.getAttribute('data-cqr-goto').split('|'); return go(q[0] + '.html', 'mkapp:' + q[1]); }
    if (t.closest('[data-cqr-admin]')) { e.stopPropagation(); return go('admin.html', 'mkapp:'); }
    if (t.closest('[data-cqr-portal]')) { e.stopPropagation(); return go('marketplace.html'); }
    if ((x = t.closest('.hdr-avatar')) && !x.closest('.cq-pm-wrap, .cq-pm-trigger')) { e.stopPropagation(); return go('profile.html', 'published'); }
    if ((x = t.closest('[data-cqr-ws]'))) { e.stopPropagation(); closeMenus(); return; }
    if (!t.closest('.cqr-menu')) closeMenus();
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenus(); });
  window.addEventListener('resize', closeMenus);

  /* ── The queue, for the two admin views ── */
  function artIcon(kind) {
    return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' + (kind === 'automation'
      ? '<circle cx="3.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="3.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.1 8h5.8M8 3.5h2.9M8 12.5h2.9M8 3.5v9" stroke="currentColor" stroke-width="1.2"/>'
      : '<rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M8 5V2.8M6 9v.5M10 9v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>') + '</svg>';
  }
  function mountQueue(host, role) {
    var Q = { role: role, view: 'waiting', flow: 'all', sel: null };
    var drawer = document.createElement('aside');
    drawer.className = 'cqr-drawer'; drawer.setAttribute('aria-label', 'Request');
    document.body.appendChild(drawer);
    function mine(w) {
      var S = stagesOf(w);
      return S.some(function (st) { return st.role === role; });
    }
    function rows() {
      return requests().filter(mine).filter(function (w) {
        if (Q.flow !== 'all' && (isPub(w) ? 'publish' : 'add') !== Q.flow) return false;
        if (Q.view === 'waiting') { var s = stageOf(w); return s.state === 'waiting' && s.stages[s.i].role === role; }
        return true;
      }).sort(function (a, b) { return (b.requestedAt || 0) - (a.requestedAt || 0); });
    }
    function paint() {
      var waiting = requests().filter(mine).filter(function (w) { var s = stageOf(w); return s.state === 'waiting' && s.stages[s.i].role === role; }).length;
      var total = requests().filter(mine).length;
      var list = rows();
      var chip = function (attr, v, label, n, on) { return '<button type="button" class="cqr-chip" data-cqr-' + attr + '="' + v + '" aria-pressed="' + on + '">' + label + (n != null ? ' <span class="n">' + n + '</span>' : '') + '</button>'; };
      host.innerHTML = '<div class="cqr-q">' +
        '<div class="cqr-q__bar">' + chip('view', 'waiting', 'Waiting on you', waiting, Q.view === 'waiting') + chip('view', 'all', 'All requests', total, Q.view === 'all') +
          '<span class="cqr-sp"></span>' + chip('flow', 'all', 'All', null, Q.flow === 'all') + chip('flow', 'publish', 'Publishing to Marketplace', null, Q.flow === 'publish') + chip('flow', 'add', 'Adding to workspaces', null, Q.flow === 'add') + '</div>' +
        (list.length ? '<table class="cqr-table"><thead><tr><th>Artifact</th><th>Direction</th><th>Requested by</th><th>Stage</th><th>Status</th><th></th></tr></thead><tbody>' +
          list.map(function (w) {
            var s = stageOf(w), mineNow = s.state === 'waiting' && s.stages[s.i].role === role;
            return '<tr data-cqr-row="' + E(w.ref) + '"' + (Q.sel === w.ref ? ' class="is-sel"' : '') + '>' +
              '<td><span class="cqr-art"><span class="ic">' + artIcon(w.kind) + '</span><span class="tx"><b>' + E(w.name) + '</b><small>' + (w.kind === 'automation' ? 'Automation' : 'Agent') + '</small></span></span></td>' +
              '<td><span class="cqr-dir">' + (isPub(w) ? E(w.workspace || HOME) + ' → Marketplace' : 'Marketplace → ' + E(w.workspace || HOME)) + '</span></td>' +
              '<td>' + E(w.requester || 'Savio Govindu') + '</td>' +
              '<td><span class="cqr-stage">' + bars(w, s) + '<small>' + E(stepText(w, s)) + '</small></span></td>' +
              '<td>' + pill(w, s) + '</td>' +
              '<td style="text-align:right"><button type="button" class="cqr-act' + (mineNow ? '' : ' cqr-act--ghost') + '" data-cqr-row="' + E(w.ref) + '">' + (mineNow ? 'Review' : 'View') + '</button></td></tr>';
          }).join('') + '</tbody></table>'
          : '<div class="cqr-qempty">' + (Q.view === 'waiting' ? 'Nothing is waiting on you. New requests show up here and on the bell.' : 'No requests yet.') + '</div>') +
      '</div>';
      paintDrawer();
    }
    function paintDrawer() {
      var w = Q.sel && find(Q.sel);
      if (!w) { drawer.classList.remove('is-open'); return; }
      var keep = drawer.querySelector('[data-cqr-note]'), note = keep ? keep.value : '', focused = keep && document.activeElement === keep;
      drawer.innerHTML = '<div class="cqr-drawer__head">' + pill(w) + '<button type="button" class="cqr-drawer__x" data-cqr-close aria-label="Close">' + IC.x.replace('width="12" height="12"', 'width="18" height="18"') + '</button></div>' +
        '<div class="cqr-drawer__body">' +
          '<div class="cqr-sec"><span class="cqr-art"><span class="ic">' + artIcon(w.kind) + '</span><span class="tx"><b style="font-size:16px;line-height:24px">' + E(w.name) + '</b>' +
            '<small>' + (w.kind === 'automation' ? 'Automation' : 'Agent') + ' · ' + (isPub(w) ? E(w.workspace || HOME) + ' → Marketplace' : 'Marketplace → ' + E(w.workspace || HOME)) + '</small></span></span>' +
            (w.desc ? '<p style="margin:0;color:var(--text-secondary);font:400 13px/18px var(--font-geist)">' + E(w.desc) + '</p>' : '') +
            '<div>' + '<div class="cqr-kv"><span>Requested by</span><b>' + E(w.requester || 'Savio Govindu') + '</b></div>' +
              (isPub(w) ? '<div class="cqr-kv"><span>Industry · Function</span><b>' + E((w.industry || '—') + ' · ' + (w.func || '—')) + '</b></div>' +
                          '<div class="cqr-kv"><span>Shared</span><b>' + E(w.sharedSummary || '—') + '</b></div>'
                        : '<div class="cqr-kv"><span>Publisher</span><b>' + E(w.publisher || '—') + '</b></div>') +
              (w.secrets && w.secrets.length ? '<div class="cqr-kv"><span>Keys included</span><b>' + E(listAnd(w.secrets)) + '</b></div>' : '') +
            '</div></div>' +
          '<div class="cqr-sec"><span class="cqr-sec__l">Review stages</span>' + trackerHTML(w, { role: role }) + '</div>' +
        '</div>';
      var n2 = drawer.querySelector('[data-cqr-note]'); if (n2) { n2.value = note; if (focused) n2.focus(); }
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    }
    function onClick(e) {
      var t = e.target, x;
      if ((x = t.closest('[data-cqr-view]'))) { Q.view = x.getAttribute('data-cqr-view'); return paint(); }
      if ((x = t.closest('[data-cqr-flow]'))) { Q.flow = x.getAttribute('data-cqr-flow'); return paint(); }
      if ((x = t.closest('[data-cqr-row]'))) { Q.sel = x.getAttribute('data-cqr-row'); return paint(); }
    }
    host.addEventListener('click', onClick);
    drawer.addEventListener('click', function (e) {
      var t = e.target, x;
      if (t.closest('[data-cqr-close]')) { Q.sel = null; return paint(); }
      if ((x = t.closest('[data-cqr-approve], [data-cqr-reject]'))) {
        var ok = x.hasAttribute('data-cqr-approve'), p = x.getAttribute(ok ? 'data-cqr-approve' : 'data-cqr-reject').split('|');
        var note = (drawer.querySelector('[data-cqr-note]') || {}).value || '';
        decide(p[0], p[1], ok, note.trim());
        if (window.mkwsSay) window.mkwsSay((ok ? 'Approved ' : 'Rejected ') + (find(p[0]) || {}).name);
        return paint();
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && Q.sel) { Q.sel = null; paint(); } });
    var sig = '';
    subs.push(function () { sig = ''; paint(); });
    setInterval(function () {
      var now = requests().map(function (w) { var s = stageOf(w); return w.ref + s.i + s.state; }).join('|');
      if (now !== sig) { sig = now; paint(); }
    }, 500);
    paint();
    return { open: function (ref) { if (ref && find(ref)) { Q.view = 'all'; Q.sel = ref; } paint(); }, close: function () { Q.sel = null; paint(); }, paint: paint };
  }

  /* ── State from the shell ── */
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (Array.isArray(d.cqWorkspace)) {
      ITEMS = JSON.parse(JSON.stringify(d.cqWorkspace)).filter(function (w) { return w.kind === 'agent' || w.kind === 'automation'; });
      emit();
    }
  });
  /* Stages that run on their own move on even when nothing else changes. */
  var lastBell = '';
  setInterval(function () {
    var s = bellItems().map(function (x) { return x.w.ref + x.role; }).join('|');
    if (s !== lastBell) { lastBell = s; paintBells(); }
  }, 500);
  if (inShell) post({ cqWsRequest: true });

  window.cqReview = {
    stagesOf: stagesOf, stageOf: stageOf, stateLabel: stateLabel, pill: pill, bars: bars, stepText: stepText,
    trackerHTML: trackerHTML, isPub: isPub, isDone: function (w) { return stageOf(w).state === 'done'; },
    isRejected: function (w) { return stageOf(w).state === 'rejected'; },
    pendingFor: pendingFor, requests: requests, find: find, decide: decide, mountQueue: mountQueue,
    addSamples: function (list) { SAMPLES = SAMPLES.concat(list.map(function (w) { w.sample = true; return w; })); emit(); },
    onChange: function (f) { subs.push(f); }, items: function () { return ITEMS; }, HOME: HOME
  };
})();
