/* ══════════════════════════════════════════════════════════════════════
   MONITORING v2 · Activity
   ──────────────────────────────────────────────────────────────────────
   Charts are hand-drawn inline SVG — no library. Every renderer sizes
   itself off its host's measured width, so nothing is drawn while its
   pane is hidden (a hidden pane has no width to scale against) and
   everything redraws on resize and after the webfont swaps in.

   Why each form is what it is — the reasoning, not just the result:

   · Executions over time → smooth multi-line, one line per automation.
     Identity is the job (which automation is moving), so this is the
     one categorical chart on the page, capped at 4 series.
   · Error rate → its own panel under the volume plot, sharing the x
     domain. v1 drew volume and error rate on one plot with two y-scales;
     the alignment of two scales is arbitrary, so such a chart invents a
     correlation. Two stacked panels, one y each, say the same thing
     honestly.
   · Failure share → one segmented track + rows, not a donut. A ring is
     only readable at a glance, and these four shares sit close together.
   · When runs happen → heatmap. A grid of magnitudes is what a heatmap
     is for, and a sequential one-hue ramp is the safe encoding.
   · Duration → a stage strip per row, not another number. "4.2s" says
     how long; the strip says which stage owned it.
   · The five headline figures → a stat strip. A single value is a
     figure, never a one-bar bar chart.

   Every value a tooltip shows is also on the page without hovering —
   axis ticks, direct labels, or the row it belongs to.
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

/* Four automations — slots 1..4 in fixed order. A 5th would fold into
   "Other" rather than take a generated hue. */
var SERIES = [
  { key: 'invoice',  name: 'Invoice sync',      slot: 1, base: 50, amp: 20, seed: 11 },
  { key: 'lead',     name: 'Lead router',       slot: 2, base: 37, amp: 16, seed: 23 },
  { key: 'doc',      name: 'Doc extraction',    slot: 3, base: 27, amp: 13, seed: 37 },
  { key: 'onboard',  name: 'Onboarding bot',    slot: 4, base: 18, amp: 9,  seed: 51 }
];

/* A working-day shape: quiet overnight, a morning ramp, an afternoon
   peak. Shared by every series so the curves read as one workload. */
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
    var v = s.base * dayShape(h) + (r() - 0.45) * s.amp;
    s.vals.push(Math.max(0, Math.round(v)));
  }
});

/* Error rate, in percent — one series, its own panel. */
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
/* Failures derived from the same arrays, so the strip, the error panel
   and the failure card can never disagree. */
var totalFail = (function () {
  var f = 0;
  for (var h = 0; h < HOURS; h++) {
    var hourTotal = SERIES.reduce(function (a, s) { return a + s.vals[h]; }, 0);
    f += hourTotal * ERR[h] / 100;
  }
  return Math.round(f);
})();

/* ── Small helpers ────────────────────────────────────────────────────
   Every insertion of a name or label goes through text(), never an
   innerHTML string: series and automation names are data, and data is
   never markup. */
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
  var s = el('svg', { class: 'cq-ic', width: size || 16, height: size || 16, viewBox: '0 0 ' + (size || 16) + ' ' + (size || 16) }, parent);
  el('use', { href: '#' + id }, s);
  return s;
}
var fmt = function (n) { return n.toLocaleString('en-US'); };
var pct = function (n, d) { return n.toFixed(d === undefined ? 1 : d) + '%'; };
var cat = function (slot) { return 'var(--cat-' + slot + ')'; };

/* Monotone cubic through the points — a smooth curve that never
   overshoots into a value the data does not contain, which a plain
   cardinal spline will happily do (and then reads as a dip that isn't
   there). */
function mono(pts) {
  var n = pts.length;
  if (n < 2) return '';
  if (n === 2) return 'M' + pts[0][0] + ',' + pts[0][1] + 'L' + pts[1][0] + ',' + pts[1][1];
  var dx = [], dy = [], m = [], i;
  for (i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); dy.push(pts[i + 1][1] - pts[i][1]); }
  var slope = dx.map(function (d, k) { return d ? dy[k] / d : 0; });
  m.push(slope[0]);
  for (i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m.push(0);
    else {
      var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]));
    }
  }
  m.push(slope[n - 2]);
  var d = 'M' + pts[0][0] + ',' + pts[0][1];
  for (i = 0; i < n - 1; i++) {
    var h = dx[i];
    d += 'C' + (pts[i][0] + h / 3) + ',' + (pts[i][1] + m[i] * h / 3) +
         ' ' + (pts[i + 1][0] - h / 3) + ',' + (pts[i + 1][1] - m[i + 1] * h / 3) +
         ' ' + pts[i + 1][0] + ',' + pts[i + 1][1];
  }
  return d;
}

/* Clean axis ticks — 0 / 10 / 20, never 0 / 8.33 / 16.67. */
function ticks(max, count) {
  var raw = max / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  var stepN = norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1;
  var step = stepN * mag, out = [];
  for (var v = 0; v <= max + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}

/* ── Tooltip ──────────────────────────────────────────────────────────
   One node for the whole page. Values lead and labels follow: the
   reader already knows which series they are pointing at and wants the
   number, which is the legend's hierarchy inverted. */
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
  /* Place it clear of the pointer, then pull it back inside the viewport
     rather than letting it run off the right or bottom edge. */
  var r = tip.getBoundingClientRect();
  var left = x + 14, top = y - r.height / 2;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  top = Math.max(8, Math.min(top, innerHeight - r.height - 8));
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function tipHide() { tip.classList.remove('is-on'); }

/* ══ 1 · STAT STRIP ═══════════════════════════════════════════════════ */
var STATS = [
  { icon: 'i-zap',    label: 'Executions today', value: fmt(totalExec),
    delta: '12.4%', dir: 'good', vs: 'vs yesterday' },
  { icon: 'i-check',  label: 'Success rate',
    value: pct(100 - totalFail / totalExec * 100), delta: '0.4pp', dir: 'good', vs: 'vs yesterday' },
  { icon: 'i-alert',  label: 'Failed runs', value: fmt(totalFail),
    delta: '6', dir: 'good', down: true, vs: 'vs yesterday' },
  { icon: 'i-dollar', label: 'Cost today', value: '$127.40',
    delta: '8.1%', dir: 'bad', vs: 'vs yesterday' }
];

function renderStrip() {
  var host = $('mvStrip');
  STATS.forEach(function (s) {
    var cell = html('div', 'mv-stat', host);
    var top = html('div', 'mv-stat__top', cell);
    icon(top, s.icon, 14);
    text(html('span', 'mv-eyebrow', top), s.label);

    var val = html('div', 'mv-stat__val', cell);
    text(val, s.value);
    if (s.unit) text(html('small', null, val), s.unit);

    var foot = html('div', 'mv-stat__foot', cell);
    var d = html('span', 'mv-delta', foot);
    d.dataset.dir = s.dir;
    /* The arrow is the direction the number moved; the colour is whether
       that direction is good here. Fewer failures is an arrow down and
       still green — the two channels are not the same thing. */
    var up = s.down ? false : (s.dir === 'good' ? true : true);
    if (s.down) up = false;
    icon(d, up ? 'i-arrow-up' : 'i-arrow-down', 12).setAttribute('viewBox', '0 0 12 12');
    text(html('span', null, d), s.delta);
    text(html('span', 'mv-delta__vs', foot), s.vs);
  });
}

/* ══ 2 · VOLUME + ERROR RATE (one card, two panels, shared x) ═════════ */
var focusKey = null;   /* legend hover → emphasis */

function drawVolume() {
  var host = $('mvVolPlot');
  if (!host) return;
  var W = host.clientWidth;
  if (W < 80) return;

  var padL = 42, padR = 16, padT = 14, plotH = 214, axisH = 22;
  var H = padT + plotH + axisH;
  var plotW = W - padL - padR;

  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
    'aria-label': 'Executions per hour by automation, last 24 hours' });

  /* The haze is a blurred copy of each line; clip it so a 13px blur
     cannot bleed out over the card's padding and pick up its edge. */
  var defs = el('defs', null, svg);
  var clip = el('clipPath', { id: 'mvVolClip' }, defs);
  el('rect', { x: padL - 10, y: padT - 10, width: plotW + 20, height: plotH + 20 }, clip);

  var maxV = 0;
  SERIES.forEach(function (s) { s.vals.forEach(function (v) { if (v > maxV) maxV = v; }); });
  var tk = ticks(maxV * 1.12, 4), top = tk[tk.length - 1];
  var x = function (i) { return padL + (plotW * i) / (HOURS - 1); };
  var y = function (v) { return padT + plotH - (v / top) * plotH; };

  /* Three gridlines, not five. Solid hairlines, one step off the
     surface — never dashed: dashing reads as a threshold. */
  tk.forEach(function (t) {
    el('line', { class: 'mv-gridline', x1: padL, x2: padL + plotW, y1: y(t), y2: y(t) }, svg);
    text(el('text', { class: 'mv-tick', x: padL - 9, y: y(t) + 4, 'text-anchor': 'end' }, svg), fmt(t));
  });

  var hazeG = el('g', { 'clip-path': 'url(#mvVolClip)' }, svg);
  var lineG = el('g', null, svg);

  SERIES.forEach(function (s) {
    var d = mono(s.vals.map(function (v, i) { return [x(i), y(v)]; }));
    el('path', { class: 'mv-haze', d: d, stroke: cat(s.slot) }, hazeG);
    s._line = el('path', { class: 'mv-line', d: d, stroke: cat(s.slot) }, lineG);
    s._label = null;
  });

  /* Four hour marks. The tooltip names the exact hour, so the axis only
     has to orient the reader. */
  for (var h = 0; h < HOURS; h += 6) {
    text(el('text', { class: 'mv-tick', x: x(h), y: padT + plotH + 17,
      'text-anchor': h === 0 ? 'start' : 'middle' }, svg), hourLabel(h));
  }

  /* ── Crosshair ──
     The reader aims at an hour, never at a 2px line, so the hit area is
     the whole plot and the crosshair snaps to the nearest hour. */
  var cross = el('g', { opacity: 0 }, svg);
  var cLine = el('line', { class: 'mv-crosshair', y1: padT, y2: padT + plotH }, cross);
  var cDots = SERIES.map(function (s) {
    return el('circle', { class: 'mv-ring', r: 4.5, stroke: cat(s.slot) }, cross);
  });
  var hit = el('rect', { class: 'mv-hit', x: padL - 12, y: padT - 8,
    width: plotW + 24, height: plotH + 12 }, svg);

  function at(ev) {
    var box = svg.getBoundingClientRect();
    var px = (ev.clientX - box.left) * (W / box.width);
    return Math.max(0, Math.min(HOURS - 1, Math.round(((px - padL) / plotW) * (HOURS - 1))));
  }
  hit.addEventListener('pointermove', function (ev) {
    var i = at(ev);
    cross.setAttribute('opacity', 1);
    cLine.setAttribute('x1', x(i)); cLine.setAttribute('x2', x(i));
    SERIES.forEach(function (s, k) {
      cDots[k].setAttribute('cx', x(i)); cDots[k].setAttribute('cy', y(s.vals[i]));
    });
    tipShow(ev.clientX, ev.clientY, hourLabel(i) + ' – ' + hourLabel((i + 1) % 24),
      SERIES.map(function (s) { return { color: cat(s.slot), name: s.name, value: fmt(s.vals[i]) }; }),
      { name: 'Total runs', value: fmt(SERIES.reduce(function (a, s) { return a + s.vals[i]; }, 0)) });
  });
  hit.addEventListener('pointerleave', function () { cross.setAttribute('opacity', 0); tipHide(); });

  host.replaceChildren(svg);
  applyFocus();
}

/* Legend hover → emphasis. One series in its own hue, the rest dimmed:
   the most underused form, and the honest answer to "which line is
   Lead router". */
function applyFocus() {
  SERIES.forEach(function (s) {
    var on = !focusKey || focusKey === s.key;
    if (s._line) s._line.style.opacity = on ? 1 : 0.18;
  });
  document.querySelectorAll('#mvVolLegend .mv-legend__item').forEach(function (it) {
    it.classList.toggle('is-dim', !!focusKey && it.dataset.key !== focusKey);
  });
}

function renderVolLegend() {
  var host = $('mvVolLegend');
  SERIES.forEach(function (s) {
    var it = html('span', 'mv-legend__item', host);
    it.dataset.key = s.key;
    html('i', 'mv-legend__key', it).style.background = cat(s.slot);
    text(it, s.name);
    it.addEventListener('pointerenter', function () { focusKey = s.key; applyFocus(); });
    it.addEventListener('pointerleave', function () { focusKey = null; applyFocus(); });
  });
}

/* ══ 3 · FAILURE SHARE ════════════════════════════════════════════════ */
var FAILS = [
  { name: 'Doc extraction',  reason: 'Timeout · model call',      w: 17 },
  { name: 'Invoice sync',    reason: 'Schema mismatch',           w: 11 },
  { name: 'Lead router',     reason: 'Rate limited · CRM',        w: 8 },
  { name: 'Onboarding bot',  reason: 'Guardrail blocked output',  w: 6 }
];
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

  FAILS.forEach(function (f, i) {
    var seg = html('div', 'mv-track__seg', track);
    seg.style.flex = f.n + ' 1 0';
    seg.style.background = 'var(--fail-' + (FAILS.length - i) + ')';
    seg.setAttribute('role', 'presentation');
    segs.push(seg);
  });

  FAILS.forEach(function (f, i) {
    var row = html('div', 'mv-row', rows);
    html('i', 'mv-row__sw', row).style.background = 'var(--fail-' + (FAILS.length - i) + ')';
    var nm = html('div', 'mv-row__nm', row);
    text(nm, f.name);
    text(html('span', null, nm), f.reason);
    text(html('span', 'mv-row__v mv-num', row), f.n);
    text(html('span', 'mv-row__sh mv-num', row), pct(f.n / sum * 100, 0));

    /* Hovering a row lights its segment, and hovering a segment lights
       its row — the two are one control. */
    function on() {
      track.classList.add('is-hovering');
      segs[i].classList.add('is-on');
      row.style.background = 'var(--backgrounds-card-bg-4)';
    }
    function off() {
      track.classList.remove('is-hovering');
      segs[i].classList.remove('is-on');
      row.style.background = '';
    }
    row.addEventListener('pointerenter', on);
    row.addEventListener('pointerleave', off);
    segs[i].addEventListener('pointerenter', function (ev) {
      on();
      tipShow(ev.clientX, ev.clientY, 'Failed runs today',
        [{ color: 'var(--fail-' + (FAILS.length - i) + ')', name: f.name, value: fmt(f.n) }],
        { name: 'Share of failures', value: pct(f.n / sum * 100, 0) });
    });
    segs[i].addEventListener('pointerleave', function () { off(); tipHide(); });
  });

  text($('mvFailNote'), fmt(sum) + ' of ' + fmt(totalExec) + ' failed');
}

/* ══ 4 · LIVE EXECUTIONS ══════════════════════════════════════════════ */
var LIVE = [
  { nm: 'Invoice sync',     id: 'run_8f21c4', st: 'ok',   dur: 3.4, cost: 0.18, ago: '12s ago',  stages: [.28, .34, .22, .16] },
  { nm: 'Doc extraction',   id: 'run_8f21c1', st: 'fail', dur: 8.9, cost: 0.41, ago: '38s ago',  stages: [.18, .22, .18, .42] },
  { nm: 'Lead router',      id: 'run_8f21be', st: 'run',  dur: 2.1, cost: 0.09, ago: 'running',  stages: [.4, .35, .25] },
  { nm: 'Onboarding bot',   id: 'run_8f21bb', st: 'ok',   dur: 5.2, cost: 0.27, ago: '1m ago',   stages: [.22, .41, .2, .17] },
  { nm: 'Invoice sync',     id: 'run_8f21b7', st: 'ok',   dur: 3.1, cost: 0.17, ago: '2m ago',   stages: [.3, .3, .24, .16] },
  { nm: 'Lead router',      id: 'run_8f21b2', st: 'run',  dur: 1.4, cost: 0.06, ago: 'running',  stages: [.55, .45] }
];
var ST_LABEL = { ok: 'Success', fail: 'Failed', run: 'Running' };
var STAGE_NAMES = ['Trigger', 'Retrieve', 'Model', 'Write'];

function renderLive() {
  var host = $('mvLiveRows');
  var slowest = LIVE.reduce(function (a, r) { return Math.max(a, r.dur); }, 0);

  LIVE.forEach(function (r) {
    var row = html('div', 'mv-trow', host);

    var c1 = html('div', 'mv-cell', row);
    var nm = html('div', 'mv-nm', c1);
    text(html('b', null, nm), r.nm);
    text(html('span', null, nm), r.id);

    var c2 = html('div', 'mv-cell', row);
    var st = html('span', 'mv-st', c2);
    st.dataset.s = r.st;
    html('i', null, st);
    text(html('span', null, st), ST_LABEL[r.st]);

    /* Stage strip · width proportional to this run's share of the
       slowest run, so a long run is visibly long before you read it. */
    var c3 = html('div', 'mv-cell', row);
    var strip = html('div', r.st === 'fail' ? 'mv-stages mv-stages--fail' : 'mv-stages', c3);
    strip.style.width = Math.max(22, (r.dur / slowest) * 100) + '%';
    r.stages.forEach(function (frac, k) {
      var s = html('div', 'mv-stages__s', strip);
      s.style.flex = frac + ' 1 0';
      s.setAttribute('aria-hidden', 'true');
      s.addEventListener('pointerenter', function (ev) {
        var last = k === r.stages.length - 1;
        tipShow(ev.clientX, ev.clientY, r.id, [{
          color: r.st === 'fail' && last ? 'var(--st-bad-mark)' : 'var(--heat-' + (k + 2) + ')',
          name: STAGE_NAMES[k] || 'Stage ' + (k + 1),
          value: (r.dur * frac).toFixed(1) + 's'
        }], { name: 'Total', value: r.dur.toFixed(1) + 's' });
      });
      s.addEventListener('pointerleave', tipHide);
    });

    text(html('div', 'mv-cell mv-cell--r mv-num', row), r.dur.toFixed(1) + 's');
    var c5 = html('div', 'mv-cell mv-cell--r', row);
    c5.style.color = 'var(--text-teritiary)';
    c5.style.fontSize = '12px';
    text(c5, r.ago);

    var c7 = html('div', 'mv-cell mv-cell--r', row);
    var btn = html('button', 'cq-btn cq-btn--tonal-2 cq-btn--s', c7);
    btn.type = 'button';
    text(btn, r.st === 'fail' ? 'Trace' : 'View');
  });

  text($('mvLiveNote'), 'Showing ' + LIVE.length + ' of ' + fmt(totalExec) + ' today');
}

/* ══ 5 · APPROVALS ════════════════════════════════════════════════════ */
var APPROVALS = [
  { nm: 'Vendor contract · Acme Co.',   who: 'Invoice sync',    wait: '18m', tone: 'warn' },
  { nm: 'Refund over $5,000',           who: 'Billing agent',   wait: '42m', tone: 'bad' },
  { nm: 'Outbound email · 240 leads',   who: 'Lead router',     wait: '6m',  tone: 'ok' }
];

function renderApprovals() {
  var host = $('mvApprList');
  APPROVALS.forEach(function (a) {
    var t = html('div', 'mv-appr__t', host);
    var top = html('div', 'mv-appr__top', t);
    icon(top, 'i-shield', 16).style.color = 'var(--text-teritiary)';
    text(html('div', 'mv-appr__nm', top), a.nm);
    var w = html('span', 'mv-appr__wait mv-num', top);
    w.style.color = a.tone === 'bad' ? 'var(--st-bad)' : a.tone === 'warn' ? 'var(--st-warn)' : 'var(--text-teritiary)';
    text(w, 'waiting ' + a.wait);

    var meta = html('div', 'mv-appr__meta', t);
    text(html('span', null, meta), a.who);

    var acts = html('div', 'mv-appr__acts', t);
    var rev = html('button', 'cq-btn cq-btn--primary cq-btn--s', acts);
    rev.type = 'button'; text(rev, 'Review');
    var skip = html('button', 'cq-btn cq-btn--tonal-2 cq-btn--s', acts);
    skip.type = 'button'; text(skip, 'Reassign');
  });
}

/* ══ 7 · TABS ═════════════════════════════════════════════════════════ */
function showTab(tab, label) {
  var isActivity = tab === 'activity';
  $('mvActivity').hidden = !isActivity;
  $('mvEmpty').hidden = isActivity;
  if (!isActivity) {
    var t = $('mvEmptyTitle');
    while (t.firstChild) t.removeChild(t.firstChild);
    text(t, label.trim());
  }
  /* Drawn on the way in: a hidden pane has no width to size an SVG
     against, so a chart drawn there comes out 0 wide. */
  if (isActivity) drawVolume();
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

/* Period control — changes the x-domain, not the data slice, which is
   why it may live in the card rather than the page filter row. */
document.querySelectorAll('#mvVolPeriod button').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('#mvVolPeriod button').forEach(function (o) {
      o.setAttribute('aria-pressed', String(o === b));
    });
  });
});

/* ══ 8 · SHELL ════════════════════════════════════════════════════════ */
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
    var open = head.getAttribute('aria-expanded') === 'true';
    head.setAttribute('aria-expanded', String(!open));
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
  /* The ring on a marker is painted in the surface colour, and the
     surface just changed. */
  if (!$('mvActivity').hidden) drawVolume();
};
$('themeToggle').addEventListener('click', function () {
  var next = root.dataset.mode === 'dark' ? 'light' : 'dark';
  window.applyMode(next);
  try { localStorage.setItem('cq-theme', next); } catch (e) { /* private mode */ }
});
var stored = null;
try { stored = localStorage.getItem('cq-theme'); } catch (e) { /* private mode */ }

/* ══ 9 · BOOT ═════════════════════════════════════════════════════════ */
renderStrip();
renderVolLegend();
renderFailures();
renderLive();
renderApprovals();
window.applyMode(stored === 'light' ? 'light' : 'dark');
drawVolume();

var rT;
window.addEventListener('resize', function () {
  clearTimeout(rT);
  rT = setTimeout(function () { if (!$('mvActivity').hidden) drawVolume(); }, 120);
});
/* Geist arrives after first paint and every label measured before then
   was measured against the fallback face. */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
  drawVolume();
});
})();
