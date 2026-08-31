/* ══════════════════════════════════════════════════════════════════════
   MONITORING v2 · Activity
   ──────────────────────────────────────────────────────────────────────
   The two lists lead. Live executions and the checkpoints waiting on a
   human are what an operator opens this page to act on, so they sit
   directly under the figures; the failure breakdown and the heatmap are
   context you read after acting, and follow.

   Colour follows the entity, not the chart. Each automation owns one
   published Cogentiq hue — slot 1..4 — and wears it everywhere it
   appears: its tile in the run table, its segment in the failure track,
   its accent on a checkpoint tile. So "the orange one" means Lead router
   on every card, and removing a series never repaints the survivors.

   Everything a tooltip shows is also on the page without hovering, in a
   row, a legend or a scale.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var root = document.documentElement;
var svgNS = 'http://www.w3.org/2000/svg';

/* ── Deterministic data ───────────────────────────────────────────────
   A seeded generator, so the screen is identical on every reload and a
   visual diff means a real change rather than new random numbers. */
function rng(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

var HOURS = 24;
var hourLabel = function (h) { return String(h).padStart(2, '0') + ':00'; };

/* The four automations and the hue each one owns. `grad` is the system's
   gradient-tile class for that automation's icon; `tone` is the
   published badge family nearest the same hue. Orange has no badge
   family in the library, hence the null — and cyan has no gradient tile,
   hence the one mv-grad-* class, built in the library's own key. */
var SERIES = [
  { key: 'invoice', name: 'Invoice sync',   slot: 1, grad: 'cq-grad-blue',   tone: 'blue',   base: 50, amp: 20, seed: 11 },
  { key: 'lead',    name: 'Lead router',    slot: 2, grad: 'cq-grad-orange', tone: null,     base: 37, amp: 16, seed: 23 },
  { key: 'doc',     name: 'Doc extraction', slot: 3, grad: 'cq-grad-indigo', tone: 'indigo', base: 27, amp: 13, seed: 37 },
  { key: 'onboard', name: 'Onboarding bot', slot: 4, grad: 'mv-grad-cyan',   tone: 'cyan',   base: 18, amp: 9,  seed: 51 }
];
var BY_KEY = {};
SERIES.forEach(function (s) { BY_KEY[s.key] = s; });

/* A working-day shape: quiet overnight, a morning ramp, an afternoon
   peak. Shared by every series so the day reads as one workload. */
function dayShape(h) {
  if (h < 5) return 0.22;
  if (h < 9) return 0.22 + (h - 5) * 0.17;
  if (h < 12) return 0.9 + (h - 9) * 0.05;
  if (h < 15) return 1.05 - (h - 12) * 0.03;
  if (h < 19) return 0.96 - (h - 15) * 0.12;
  return 0.48 - (h - 19) * 0.05;
}

SERIES.forEach(function (s) {
  var r = rng(s.seed);
  s.vals = [];
  for (var h = 0; h < HOURS; h++) {
    s.vals.push(Math.max(0, Math.round(s.base * dayShape(h) + (r() - 0.45) * s.amp)));
  }
});

/* Error rate per hour. No longer plotted, but still the source of the
   day's failure count, so every figure stays derived rather than typed. */
var ERR = (function () {
  var r = rng(97), out = [];
  for (var h = 0; h < HOURS; h++) {
    var spike = (h === 14 || h === 15) ? 2.6 : 0;   /* the afternoon incident */
    out.push(+Math.max(0.3, 2.0 + (r() - 0.5) * 1.2 + spike).toFixed(2));
  }
  return out;
})();

var totalExec = SERIES.reduce(function (a, s) {
  return a + s.vals.reduce(function (x, y) { return x + y; }, 0);
}, 0);
var totalFail = (function () {
  var f = 0;
  for (var h = 0; h < HOURS; h++) {
    f += SERIES.reduce(function (a, s) { return a + s.vals[h]; }, 0) * ERR[h] / 100;
  }
  return Math.round(f);
})();
var peakErr = Math.max.apply(null, ERR);

/* ── Small helpers ────────────────────────────────────────────────────
   Every name and label goes in through text(), never an innerHTML
   string: automation names are data, and data is never markup. */
function el(tag, attrs, parent) {
  var n = document.createElementNS(svgNS, tag);
  if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function html(tag, cls, parent) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (parent) parent.appendChild(n);
  return n;
}
function text(node, str) { node.appendChild(document.createTextNode(String(str))); return node; }
function icon(parent, id, size) {
  var s = el('svg', { class: 'cq-ic', width: size || 16, height: size || 16,
    viewBox: '0 0 ' + (size || 16) + ' ' + (size || 16) }, parent);
  el('use', { href: '#' + id }, s);
  return s;
}
/* A gradient tile with a glyph on it — the rail's own device, reused at
   the sizes this page needs. */
function tile(parent, grad, iconId, size) {
  var t = html('span', 'mv-tile ' + grad, parent);
  if (size) t.style.setProperty('--tile', size + 'px');
  icon(t, iconId, 14);
  return t;
}
var fmt = function (n) { return n.toLocaleString('en-US'); };
var pct = function (n, d) { return n.toFixed(d === undefined ? 1 : d) + '%'; };
var cat = function (slot) { return 'var(--cat-' + slot + ')'; };

/* ── Tooltip ──────────────────────────────────────────────────────────
   One node for the page. Values lead and names follow — the reader
   already knows what they are pointing at and wants the number. */
var tip = $('mvTip');
function tipShow(x, y, headStr, rows, foot) {
  while (tip.firstChild) tip.removeChild(tip.firstChild);
  text(html('div', 'mv-tip__head', tip), headStr);
  rows.forEach(function (r) {
    var row = html('div', 'mv-tip__row', tip);
    if (r.color) html('span', 'mv-tip__key', row).style.background = r.color;
    text(html('span', 'mv-tip__nm', row), r.name);
    text(html('span', 'mv-tip__v', row), r.value);
  });
  if (foot) {
    html('div', 'mv-tip__rule', tip);
    var f = html('div', 'mv-tip__row', tip);
    text(html('span', 'mv-tip__nm', f), foot.name);
    text(html('span', 'mv-tip__v', f), foot.value);
  }
  tip.classList.add('is-on');
  var r = tip.getBoundingClientRect();
  var left = x + 14, top = y - r.height / 2;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  top = Math.max(8, Math.min(top, innerHeight - r.height - 8));
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function tipHide() { tip.classList.remove('is-on'); }

/* ══ 1 · STAT STRIP ═══════════════════════════════════════════════════
   Each figure takes one of the system's gradient tiles, so the row
   carries the product's colour instead of five grey glyphs. The tile hue
   is the figure's *subject*; sentiment is the delta's colour right
   underneath, and the two are never confused. */
var STATS = [
  { grad: 'cq-grad-blue',   icon: 'i-zap',    label: 'Executions today', value: fmt(totalExec),
    delta: '12.4%', dir: 'good', vs: 'vs yesterday' },
  { grad: 'cq-grad-green',  icon: 'i-check',  label: 'Success rate',
    value: pct(100 - totalFail / totalExec * 100), delta: '0.4pp', dir: 'good', vs: 'vs yesterday' },
  { grad: 'cq-grad-orange', icon: 'i-alert',  label: 'Failed runs', value: fmt(totalFail),
    delta: '6', dir: 'good', down: true, vs: 'vs yesterday' },
  { grad: 'cq-grad-indigo', icon: 'i-gauge',  label: 'Median duration', value: '4.2', unit: 's',
    delta: '0.3s', dir: 'bad', vs: 'vs 7-day median' },
  { grad: 'cq-grad-purple', icon: 'i-dollar', label: 'Cost today', value: '$127.40',
    delta: '8.1%', dir: 'bad', vs: 'vs yesterday' }
];

function renderStrip() {
  var host = $('mvStrip');
  STATS.forEach(function (s) {
    var cell = html('div', 'mv-stat', host);
    var top = html('div', 'mv-stat__top', cell);
    tile(top, s.grad, s.icon);
    text(html('span', 'mv-eyebrow', top), s.label);

    var val = html('div', 'mv-stat__val', cell);
    text(val, s.value);
    if (s.unit) text(html('small', null, val), s.unit);

    var foot = html('div', 'mv-stat__foot', cell);
    var d = html('span', 'mv-delta', foot);
    d.dataset.dir = s.dir;
    /* The arrow is which way the number moved; the colour is whether
       that direction is good here. Fewer failures is an arrow down and
       still green — two channels, two meanings. */
    icon(d, s.down ? 'i-arrow-down' : 'i-arrow-up', 12).setAttribute('viewBox', '0 0 12 12');
    text(html('span', null, d), s.delta);
    text(html('span', 'mv-delta__vs', foot), s.vs);
  });
}

/* ══ 2 · LIVE EXECUTIONS ══════════════════════════════════════════════
   The list an operator acts on, so it leads the page. Two things carry
   colour: the automation's own gradient tile, and the status pill, which
   uses the system's published badge families. */
var LIVE = [
  { key: 'invoice', id: 'run_8f21c4', st: 'ok',   trig: 'Webhook',  dur: 3.4, cost: 0.18, ago: '12s ago', stages: [.28, .34, .22, .16] },
  { key: 'doc',     id: 'run_8f21c1', st: 'fail', trig: 'Schedule', dur: 8.9, cost: 0.41, ago: '38s ago', stages: [.18, .22, .18, .42] },
  { key: 'lead',    id: 'run_8f21be', st: 'run',  trig: 'Webhook',  dur: 2.1, cost: 0.09, ago: 'running', stages: [.4, .35, .25] },
  { key: 'onboard', id: 'run_8f21bb', st: 'ok',   trig: 'Manual',   dur: 5.2, cost: 0.27, ago: '1m ago',  stages: [.22, .41, .2, .17] },
  { key: 'invoice', id: 'run_8f21b7', st: 'ok',   trig: 'Webhook',  dur: 3.1, cost: 0.17, ago: '2m ago',  stages: [.3, .3, .24, .16] },
  { key: 'lead',    id: 'run_8f21b2', st: 'run',  trig: 'Schedule', dur: 1.4, cost: 0.06, ago: 'running', stages: [.55, .45] },
  { key: 'doc',     id: 'run_8f21ae', st: 'ok',   trig: 'Schedule', dur: 6.7, cost: 0.33, ago: '3m ago',  stages: [.2, .26, .3, .24] },
  { key: 'onboard', id: 'run_8f21a9', st: 'fail', trig: 'Manual',   dur: 7.4, cost: 0.31, ago: '4m ago',  stages: [.19, .24, .21, .36] }
];
/* Status pill tones. Success and Running take published badge families;
   Failed has none to take — the library publishes blue, indigo, green,
   cyan and light-green only — so its ground and stroke are derived in
   exactly the same key, from the published red ramp. */
var ST = {
  ok:   { label: 'Success', tone: 'green', glyph: 'i-check' },
  fail: { label: 'Failed',  tone: 'red',   glyph: 'i-alert' },
  run:  { label: 'Running', tone: 'blue',  glyph: null }
};
var STAGE_NAMES = ['Trigger', 'Retrieve', 'Model', 'Write'];

function renderLive() {
  var host = $('mvLiveRows');
  var slowest = LIVE.reduce(function (a, r) { return Math.max(a, r.dur); }, 0);

  LIVE.forEach(function (r) {
    var s = BY_KEY[r.key], st = ST[r.st];
    var row = html('div', 'mv-trow', host);

    var c1 = html('div', 'mv-cell', row);
    tile(c1, s.grad, 'i-zap', 26);
    var nm = html('div', 'mv-nm', c1);
    text(html('b', null, nm), s.name);
    text(html('span', null, nm), r.id + ' · ' + r.trig);

    var c2 = html('div', 'mv-cell', row);
    var pill = html('span', 'cq-status mv-st', c2);
    pill.dataset.tone = st.tone;
    if (st.glyph) icon(pill, st.glyph, 13);
    else html('i', 'cq-status--dot mv-st__live', pill);
    text(html('span', null, pill), st.label);

    /* Stage strip · width proportional to this run's share of the
       slowest run, so a long run looks long before you read the number. */
    var c3 = html('div', 'mv-cell', row);
    var strip = html('div', r.st === 'fail' ? 'mv-stages mv-stages--fail' : 'mv-stages', c3);
    strip.style.width = Math.max(24, (r.dur / slowest) * 100) + '%';
    r.stages.forEach(function (frac, k) {
      var seg = html('div', 'mv-stages__s', strip);
      seg.style.flex = frac + ' 1 0';
      seg.setAttribute('aria-hidden', 'true');
      seg.addEventListener('pointerenter', function (ev) {
        var last = k === r.stages.length - 1;
        tipShow(ev.clientX, ev.clientY, r.id, [{
          color: r.st === 'fail' && last ? 'var(--st-bad-mark)' : 'var(--stage-' + (k + 1) + ')',
          name: STAGE_NAMES[k] || 'Stage ' + (k + 1),
          value: (r.dur * frac).toFixed(1) + 's'
        }], { name: 'Total', value: r.dur.toFixed(1) + 's' });
      });
      seg.addEventListener('pointerleave', tipHide);
    });

    text(html('div', 'mv-cell mv-cell--r mv-num', row), r.dur.toFixed(1) + 's');
    text(html('div', 'mv-cell mv-cell--r mv-num', row), '$' + r.cost.toFixed(2));
    text(html('div', 'mv-cell mv-cell--r mv-ago', row), r.ago);

    var c7 = html('div', 'mv-cell mv-cell--r', row);
    var btn = html('button', 'cq-btn cq-btn--tonal-2 cq-btn--s', c7);
    btn.type = 'button';
    text(btn, r.st === 'fail' ? 'Trace' : 'View');
  });

  text($('mvLiveNote'), 'Showing ' + LIVE.length + ' of ' + fmt(totalExec) + ' today');
}

/* ══ 3 · CHECKPOINTS ══════════════════════════════════════════════════
   The other list that leads. Each tile takes its automation's hue as a
   left accent, so a checkpoint reads as the same colour as the runs it
   came from. The wait time is the only thing on the tile that
   escalates, so it is the only status colour on it. */
var APPROVALS = [
  { nm: 'Refund over $5,000',           key: 'invoice', asked: 'Billing agent',  wait: '42m', tone: 'bad'  },
  { nm: 'Vendor contract · Acme Co.',   key: 'invoice', asked: 'Invoice sync',   wait: '18m', tone: 'warn' },
  { nm: 'Outbound email · 240 leads',   key: 'lead',    asked: 'Lead router',    wait: '6m',  tone: 'ok'   },
  { nm: 'Schema change · orders table', key: 'doc',     asked: 'Doc extraction', wait: '3m',  tone: 'ok'   }
];

function renderApprovals() {
  var host = $('mvApprList');
  APPROVALS.forEach(function (a) {
    var s = BY_KEY[a.key];
    var t = html('div', 'mv-appr__t', host);
    t.style.setProperty('--accent', cat(s.slot));

    var top = html('div', 'mv-appr__top', t);
    text(html('div', 'mv-appr__nm', top), a.nm);
    var w = html('span', 'mv-appr__wait mv-num', top);
    w.dataset.tone = a.tone;
    icon(w, 'i-clock', 13);
    text(html('span', null, w), a.wait);

    var meta = html('div', 'mv-appr__meta', t);
    var tag = html('span', 'cq-tag mv-tag', meta);
    if (s.tone) { tag.dataset.tone = s.tone; tag.classList.add('is-tinted'); }
    else tag.classList.add('mv-tag--orange');
    text(tag, a.asked);
    text(html('span', 'mv-appr__who', meta), 'needs your approval');

    var acts = html('div', 'mv-appr__acts', t);
    var rev = html('button', 'cq-btn cq-btn--primary cq-btn--s', acts);
    rev.type = 'button'; text(rev, 'Review');
    var re = html('button', 'cq-btn cq-btn--tonal-2 cq-btn--s', acts);
    re.type = 'button'; text(re, 'Reassign');
  });
}

/* ══ 4 · FAILURE SHARE ════════════════════════════════════════════════
   A segmented track, not a donut — four shares this close are not
   readable as arcs. The segments wear each automation's own hue rather
   than tints of one red: the categories here *are* the automations, they
   appear in the table above in exactly those colours, and "which one is
   failing" is the question the card answers. That these are failures is
   said by the card's title and its alert glyph, not by painting the
   whole card red. */
var FAILS = [
  { key: 'doc',     reason: 'Timeout · model call',     w: 17 },
  { key: 'invoice', reason: 'Schema mismatch',          w: 11 },
  { key: 'lead',    reason: 'Rate limited · CRM',       w: 8 },
  { key: 'onboard', reason: 'Guardrail blocked output', w: 6 }
];
/* Counts are apportioned from the same totalFail the strip shows, the
   last row absorbing the rounding, so the breakdown can never sum to a
   different number than the headline. */
(function apportion() {
  var wSum = FAILS.reduce(function (a, f) { return a + f.w; }, 0), run = 0;
  FAILS.forEach(function (f, i) {
    f.n = i === FAILS.length - 1 ? totalFail - run : Math.round(totalFail * f.w / wSum);
    run += f.n;
  });
})();

function renderFailures() {
  var track = $('mvFailTrack'), rows = $('mvFailRows');
  var sum = FAILS.reduce(function (a, f) { return a + f.n; }, 0);
  var segs = [];

  FAILS.forEach(function (f) {
    var seg = html('div', 'mv-track__seg', track);
    seg.style.flex = f.n + ' 1 0';
    seg.style.background = cat(BY_KEY[f.key].slot);
    seg.setAttribute('role', 'presentation');
    segs.push(seg);
  });

  FAILS.forEach(function (f, i) {
    var s = BY_KEY[f.key];
    var row = html('div', 'mv-row', rows);
    html('i', 'mv-row__sw', row).style.background = cat(s.slot);
    var nm = html('div', 'mv-row__nm', row);
    text(nm, s.name);
    text(html('span', null, nm), f.reason);
    text(html('span', 'mv-row__v mv-num', row), f.n);
    text(html('span', 'mv-row__sh mv-num', row), pct(f.n / sum * 100, 0));

    /* Row and segment are one control: hovering either lights both. */
    function on() {
      track.classList.add('is-hovering');
      segs[i].classList.add('is-on');
      row.classList.add('is-on');
    }
    function off() {
      track.classList.remove('is-hovering');
      segs[i].classList.remove('is-on');
      row.classList.remove('is-on');
    }
    row.addEventListener('pointerenter', on);
    row.addEventListener('pointerleave', off);
    segs[i].addEventListener('pointerenter', function (ev) {
      on();
      tipShow(ev.clientX, ev.clientY, 'Failed runs today',
        [{ color: cat(s.slot), name: s.name, value: fmt(f.n) }],
        { name: 'Share of failures', value: pct(f.n / sum * 100, 0) });
    });
    segs[i].addEventListener('pointerleave', function () { off(); tipHide(); });
  });

  text($('mvFailNote'), fmt(sum) + ' of ' + fmt(totalExec) + ' failed');

  var facts = $('mvFailFacts');
  [['26 of ' + fmt(sum), 'retried automatically'],
   [pct(peakErr), 'peak error rate, 14:00']].forEach(function (f) {
    var d = html('div', 'mv-fact', facts);
    text(html('b', null, d), f[0]);
    text(html('span', null, d), f[1]);
  });
}

/* ══ 5 · HEATMAP ══════════════════════════════════════════════════════
   Day × hour. Sequential, one hue, five levels, plus a neutral zero that
   sits outside the ramp because "no runs" is a surface, not a value. */
var DAYS = 14;
/* Fourteen days, not seven. Seven rows left two thirds of the card
   empty, and a fortnight is where a weekly rhythm actually becomes
   visible — you can see last Wednesday as well as this one. Rows are
   labelled with the weekday and the date, so the pattern and the
   specific incident day are both readable. */
var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var HEAT_ROWS = (function () {
  /* A fixed end date, so the grid is stable across reloads. */
  var end = new Date(2026, 7, 31), out = [];
  for (var i = DAYS - 1; i >= 0; i--) {
    var d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    out.push({ date: d, dow: d.getDay(),
               label: DOW[d.getDay()] + ' ' + d.getDate() });
  }
  return out;
})();
var HEAT = (function () {
  var r = rng(404);
  return HEAT_ROWS.map(function (row) {
    var weekend = row.dow === 0 || row.dow === 6;
    var out = [];
    for (var h = 0; h < 24; h++) {
      out.push(Math.max(0, Math.round(dayShape(h) * (weekend ? 0.28 : 1) * 46 * (0.65 + r() * 0.7))));
    }
    return out;
  });
})();
/* The afternoon incident, on the most recent Wednesday, so the heatmap
   and the peak-error-rate fact tell the same story about the same two
   hours. */
(function markIncident() {
  for (var i = HEAT_ROWS.length - 1; i >= 0; i--) {
    if (HEAT_ROWS[i].dow === 3) { HEAT[i][14] = -1; HEAT[i][15] = -1; return; }
  }
})();

function renderHeat() {
  var dowHost = $('mvHeatDow'), colHost = $('mvHeatCols');
  HEAT_ROWS.forEach(function (row) { text(html('span', null, dowHost), row.label); });
  dowHost.style.setProperty('--rows', DAYS);

  var maxV = 0;
  HEAT.forEach(function (row) { row.forEach(function (v) { if (v > maxV) maxV = v; }); });

  for (var h = 0; h < 24; h++) {
    var col = html('div', 'mv-heat__col', colHost);
    var hd = html('div', 'mv-heat__hd', col);
    if (h % 3 === 0) text(hd, String(h).padStart(2, '0'));
    for (var d = 0; d < DAYS; d++) {
      (function (d, h, col) {
        var v = HEAT[d][h];
        var cell = html('div', 'mv-heat__cell', col);
        if (v < 0) cell.dataset.bad = '1';
        else if (v > 0) cell.dataset.lv = Math.min(5, Math.ceil(v / maxV * 5));
        cell.addEventListener('pointerenter', function (ev) {
          tipShow(ev.clientX, ev.clientY, HEAT_ROWS[d].label + ' · ' + hourLabel(h),
            v < 0 ? [{ color: 'var(--st-bad-mark)', name: 'Failed window', value: 'incident' }]
                  : [{ color: 'var(--heat-3)', name: 'Runs', value: fmt(v) }]);
        });
        cell.addEventListener('pointerleave', tipHide);
      })(d, h, col);
    }
  }

  /* A continuous scale needs its legend. */
  var sc = $('mvHeatScale');
  text(html('span', null, sc), 'Fewer');
  for (var lv = 1; lv <= 5; lv++) html('i', null, sc).style.background = 'var(--heat-' + lv + ')';
  text(html('span', null, sc), 'More');
}

/* ══ 6 · TABS ═════════════════════════════════════════════════════════ */
function showTab(tab, label) {
  var isActivity = tab === 'activity';
  $('mvActivity').hidden = !isActivity;
  $('mvEmpty').hidden = isActivity;
  if (!isActivity) {
    var t = $('mvEmptyTitle');
    while (t.firstChild) t.removeChild(t.firstChild);
    text(t, label.trim());
  }
}
document.querySelectorAll('#mvTabs [data-tab]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('#mvTabs [data-tab]').forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    showTab(btn.dataset.tab, btn.textContent);
  });
});

/* ══ 7 · SHELL ════════════════════════════════════════════════════════ */
var rail = $('rail'), railT;
rail.addEventListener('mouseenter', function () {
  clearTimeout(railT); railT = setTimeout(function () { rail.classList.add('is-open'); }, 140);
});
rail.addEventListener('mouseleave', function () {
  clearTimeout(railT); railT = setTimeout(function () { rail.classList.remove('is-open'); }, 200);
});
$('railCollapse').addEventListener('click', function (e) {
  e.stopPropagation(); rail.classList.remove('is-open');
});
rail.querySelectorAll('.cq-rail-ghead[aria-expanded]').forEach(function (head) {
  head.addEventListener('click', function () {
    head.setAttribute('aria-expanded', String(head.getAttribute('aria-expanded') !== 'true'));
  });
});

/* Theme. Dark is the product default; the choice is remembered. */
window.applyMode = function (mode) {
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
  var dark = mode === 'dark';
  $('themeIcon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  $('themeToggle').title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  $('themeToggle').setAttribute('aria-label', $('themeToggle').title);
};
$('themeToggle').addEventListener('click', function () {
  var next = root.dataset.mode === 'dark' ? 'light' : 'dark';
  window.applyMode(next);
  try { localStorage.setItem('cq-theme', next); } catch (e) { /* private mode */ }
});
var stored = null;
try { stored = localStorage.getItem('cq-theme'); } catch (e) { /* private mode */ }

/* ══ 8 · BOOT ═════════════════════════════════════════════════════════ */
renderStrip();
renderLive();
renderApprovals();
renderFailures();
renderHeat();
window.applyMode(stored === 'light' ? 'light' : 'dark');
})();
