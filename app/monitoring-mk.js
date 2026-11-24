/* Monitoring, for a workspace admin: a Marketplace approvals tab beside
   Activity, Usage & Performance, Cost and Adoption. It lists what this
   workspace publishes to, or adds from, the Marketplace, and puts the
   stage the workspace admin decides in front of them. */
(function () {
  var tabs = document.getElementById('monTabs');
  var act = document.getElementById('monActivity');
  if (!tabs || !act || !window.cqReview) return;
  var CR = window.cqReview;
  var inShell = window.parent !== window;
  var $ = function (id) { return document.getElementById(id); };

  var css = document.createElement('style');
  css.textContent = [
    '.mon-mk-n{min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:#f24822;color:#fff;font:600 10px/1 var(--font-geist)}',
    '.mon-mk-n:empty{display:none}',
    '.mon-mk{display:flex;flex-direction:column;gap:16px}',
    '.mon-mk[hidden]{display:none}',
    '.mon-mk__intro{display:flex;flex-direction:column;gap:4px}',
    '.mon-mk__intro h2{margin:0;font:500 18px/24px var(--font-geist);letter-spacing:-.7px;color:var(--text-primary)}',
    '.mon-mk__intro p{margin:0;max-width:760px;color:var(--text-secondary);font:400 14px/20px var(--font-geist)}'
  ].join('\n');
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.dataset.mk = '1'; btn.setAttribute('role', 'tab'); btn.setAttribute('aria-selected', 'false');
  btn.innerHTML = 'Marketplace approvals<span class="mon-mk-n" id="monMkN"></span>';
  tabs.appendChild(btn);

  var pane = document.createElement('div');
  pane.className = 'mon-mk'; pane.id = 'monMk'; pane.hidden = true;
  pane.innerHTML = '<div class="mon-mk__intro"><h2>Marketplace approvals</h2>' +
    '<p>As a workspace admin you approve stage 2 when this workspace publishes to the Marketplace, and stage 5 when it adds something from it. ' +
    'Policy checks and travel run on their own; the platform admin approves the other side in the Admin panel.</p></div><div id="monMkQ"></div>';
  act.parentNode.insertBefore(pane, act);
  var queue = CR.mountQueue($('monMkQ'), 'ws');

  var now = Date.now(), H = 3600000;
  CR.addSamples([
    { ref: 'smp:expense', kind: 'agent', flow: 'add', name: 'Expense Policy Checker', desc: 'Checks expense claims against policy and explains anything it holds back.',
      publisher: 'Sofia Patel', requester: 'Nina Foster', workspace: 'Finance', requestedAt: now - 2 * H, model: 'GPT-4.1', shared: ['SharePoint'],
      approvals: { xadm: { by: 'Hitesh Vijay', at: now - 1.5 * H } } },
    { ref: 'smp:close', kind: 'automation', flow: 'publish', name: 'Month-end Close Checklist', desc: 'Runs the month-end close checklist and chases owners for anything still open.',
      requester: 'Marcus Diaz', workspace: 'Finance', requestedAt: now - 30 * 60000, industry: 'Banking & Financial Services', func: 'Finance', sharedSummary: '24 of 30 details shared · keys and links kept private' }
  ]);

  function setActive(mine) {
    tabs.querySelectorAll(':scope > button').forEach(function (b) {
      var on = mine ? b === btn : b.classList.contains('is-active') && b !== btn;
      if (mine) { b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); }
    });
    if (!mine) { btn.classList.remove('is-active'); btn.setAttribute('aria-selected', 'false'); }
    if (typeof cqSegSync === 'function') cqSegSync(tabs);
  }
  function show(on) {
    pane.hidden = !on;
    ['monActivity', 'monAdoption', 'monEmpty'].forEach(function (id) { var el = $(id); if (el && on) { el.hidden = true; el.classList.remove('is-out'); } });
    var f = $('barFilters'), n = $('barNote');
    if (f) f.style.visibility = on ? 'hidden' : '';
    if (n && on) n.hidden = true;
    if (!on) queue.close();
  }
  btn.addEventListener('click', function () { setActive(true); show(true); queue.paint(); });
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (b) { setActive(false); show(false); }
  }, true);
  function count() { $('monMkN').textContent = CR.pendingFor('ws').length || ''; if (typeof cqSegSync === 'function' && btn.classList.contains('is-active')) cqSegSync(tabs); }
  CR.onChange(count); setInterval(count, 800); count();

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (typeof d.cqFocus === 'string' && d.cqFocus.indexOf('mkapp:') === 0) {
      var ref = d.cqFocus.slice(6);
      setActive(true); show(true);
      setTimeout(function () { queue.open(ref); }, 60);
    }
  });

  /* The rail reaches the pages of this app. */
  var NAV = { agents: 'agents.html', automations: 'automations.html', monitoring: 'monitoring.html' };
  document.querySelectorAll('[aria-label="Platform"] button[title]').forEach(function (b) {
    var url = NAV[(b.getAttribute('title') || '').trim().toLowerCase()];
    if (!url || b.classList.contains('is-active')) return;
    b.addEventListener('click', function (e) { e.stopImmediatePropagation(); if (inShell) parent.postMessage({ cqNav: url }, '*'); }, true);
  });
  var market = document.querySelector('.cq-rail-market, .rail-market');
  if (market) market.addEventListener('click', function (e) { e.stopImmediatePropagation(); if (inShell) parent.postMessage({ cqNav: 'marketplace.html' }, '*'); }, true);
})();
