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
    if (pub && /Publish to marketplace/i.test(pub.textContent || '') && !pub.closest('[data-mk-track]')) { e.stopPropagation(); e.preventDefault(); go({ cqNav: 'marketplace.html', cqFocus: 'publish' }); return; }
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
