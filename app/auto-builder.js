/* The automation builder, for an automation added from the Marketplace.
   It follows the Cogentiq Builder's automation canvas: a top bar with the
   trail and actions, a dotted canvas with Start, the agents and
   checkpoints joined top to bottom, and the bottom bar. A node that still
   needs details carries an amber "to fill in" badge; selecting it opens
   the right panel with just its fields. With nothing selected the panel
   lists what is left. Finish setup unlocks once everything is filled in. */
(function () {
  if (typeof AUTOS === 'undefined' || !window.mkws) return;
  var M = window.mkws;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };

  var IC = {
    back: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flow: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="3.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.1 8h3m0-4.5h2.9M8 12.5h2.9M8 3.5v9" stroke="currentColor" stroke-width="1.2"/></svg>',
    play: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3.5v9l7-4.5-7-4.5Z" fill="#14ae5c"/></svg>',
    stop: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="#dc3412"/></svg>',
    agent: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r=".9" fill="currentColor"/><circle cx="10" cy="9" r=".9" fill="currentColor"/></svg>',
    hitl: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 13.5a4.5 4.5 0 0 1 9 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    tool: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9.8 2.2a3.3 3.3 0 0 0-3.9 4.4L2.3 10.2a1.3 1.3 0 0 0 1.8 1.8l3.6-3.6a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.6-.5-.5-1.6 2-2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    skill: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m8 2 1.7 3.6 3.8.5-2.8 2.6.7 3.8L8 10.7l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    guard: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.75 13 3.5v4c0 3-2.2 5.4-5 6.75C5.2 12.9 3 10.5 3 7.5v-4L8 1.75Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    brain: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="1.1" opacity=".6"/></svg>',
    plug: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2v3M10 2v3M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0V5ZM8 11v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1.75 14.75 13.5H1.25L8 1.75Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.25v3.25" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".8" fill="currentColor"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3.5v9M3.5 8h9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
    zoom: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="m13.2 13.2 3.3 3.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notes: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    undo: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M7 5 3.5 8.5 7 12M4 8.5h8a4 4 0 0 1 0 8H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    redo: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M13 5l3.5 3.5L13 12M16 8.5H8a4 4 0 0 0 0 8h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    store: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2.5 6.5V13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6.5M1.75 3.5l1-1.75h10.5l1 1.75v1a2 2 0 0 1-4 0 2 2 0 0 1-4.25 0 2 2 0 0 1-4.25 0v-1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
  };
  var KIND_IC = { integration: IC.plug, model: IC.brain, tool: IC.tool, agent: IC.agent, skill: IC.skill, guardrail: IC.guard };

  var css = document.createElement('style');
  css.textContent = [
    '.aub{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;background:var(--backgrounds-page-bg-1);color:var(--text-primary);font-family:var(--font-geist);opacity:0;transition:opacity .18s ease}',
    '.aub.is-shown{opacity:1}',
    '.aub button{font-family:inherit}',
    /* top bar */
    '.aub-top{flex:none;height:48px;display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--backgrounds-card-bg-5);border-bottom:1px solid var(--strokes-line-1);position:relative;z-index:5}',
    '.aub-back{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--strokes-type-default);background:var(--backgrounds-card-bg-2);color:var(--text-secondary);cursor:pointer}',
    '.aub-back:hover{color:var(--text-primary)}',
    '.aub-trail{display:flex;align-items:center;gap:6px;min-width:0;font:500 14px/20px var(--font-geist);letter-spacing:-.56px}',
    '.aub-trail .m{display:inline-flex;align-items:center;gap:4px;color:var(--text-teritiary);cursor:pointer}',
    '.aub-trail .sep{color:var(--text-teritiary);font-size:12px}',
    '.aub-trail .c{color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aub-tag{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 6px;border-radius:6px;background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue);font:500 11px/14px var(--font-geist);white-space:nowrap}',
    '.aub-sp{flex:1 1 auto}',
    '.aub-prog{display:inline-flex;align-items:center;gap:8px;color:var(--text-teritiary);font:400 12px/16px var(--font-geist);white-space:nowrap}',
    '.aub-prog i{display:block;width:80px;height:4px;border-radius:2px;background:var(--backgrounds-card-bg-4);overflow:hidden}',
    '.aub-prog i b{display:block;height:100%;background:var(--text-coloured-green);transition:width .2s ease}',
    '.aub-btn{height:32px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 14px/20px var(--font-geist);letter-spacing:-.56px;white-space:nowrap}',
    '.aub-btn--ghost{background:none;color:var(--text-secondary)}',
    '.aub-btn--ghost:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.aub-btn--primary{background:var(--backgrounds-button-primary);color:#fff}',
    '.aub-btn--primary:disabled{background:var(--backgrounds-disabled-tonal-2);color:var(--text-disabled-tonal-2);cursor:default}',
    /* canvas */
    '.aub-main{flex:1 1 auto;min-height:0;display:flex}',
    '.aub-canvas{position:relative;flex:1 1 auto;min-width:0;overflow:hidden;cursor:grab;background:var(--backgrounds-page-bg-1)}',
    '.aub-canvas.is-panning{cursor:grabbing}',
    '.aub-dots{position:absolute;inset:-2000px;background-image:radial-gradient(circle,var(--strokes-line-3) 1.1px,transparent 1.2px);background-size:16px 16px;pointer-events:none}',
    '.aub-stage{position:absolute;left:0;top:0;transform-origin:0 0}',
    '.aub-wires{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.aub-wires path{fill:none;stroke:var(--strokes-line-1);stroke-width:1.5}',
    '.aub-node{position:absolute;display:flex;flex-direction:column;gap:4px;align-items:flex-start}',
    '.aub-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px 5px 10px;border-radius:999px;background:var(--backgrounds-card-bg-5);border:1px solid var(--strokes-line-1);font:500 14px/20px var(--font-geist);letter-spacing:-.56px;box-shadow:0 2px 10px rgba(0,0,0,.25)}',
    '.aub-badges{display:flex;align-items:center;gap:6px;width:100%}',
    '.aub-b{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 6px;border-radius:8px;font:500 12px/16px var(--font-geist);letter-spacing:-.48px;border:1px solid transparent}',
    '.aub-b--agent{background:var(--backgrounds-badge-indigo);border-color:var(--strokes-colour-indigo);color:var(--text-coloured-indigo)}',
    '.aub-b--hitl{background:var(--backgrounds-badge-pink);border-color:var(--strokes-colour-pink);color:var(--text-coloured-pink)}',
    '.aub-b--todo{margin-left:auto;background:var(--backgrounds-badge-orange);border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.aub-b--ok{margin-left:auto;background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',
    '.aub-card{width:320px;box-sizing:border-box;padding:16px;border-radius:12px;background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-line-3);display:flex;flex-direction:column;gap:12px;cursor:pointer;box-shadow:var(--shadow-card,0 8px 28px rgba(0,0,0,.3));transition:border-color .2s ease,transform .2s ease}',
    '.aub-card:hover{border-color:var(--strokes-line-1);transform:translateY(-1px)}',
    '.aub-node.is-todo .aub-card{border-color:var(--strokes-colour-orange)}',
    '.aub-node.is-sel .aub-card{border-color:var(--backgrounds-button-primary);box-shadow:0 0 0 1px var(--backgrounds-button-primary),0 0 26px rgba(13,153,255,.2)}',
    '.aub-card .t{font:500 14px/20px var(--font-geist);letter-spacing:-.56px}',
    '.aub-card .s{margin-top:4px;color:var(--text-secondary);font:400 12px/16px var(--font-geist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aub-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.aub-chip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:80px;border:1px solid var(--strokes-line-1);color:var(--text-teritiary);font:500 12px/16px var(--font-geist)}',
    '.aub-chip.is-todo{border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    /* bottom bar */
    '.aub-bar{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:8px;padding:8px;border-radius:12px;background:var(--backgrounds-card-bg-2);box-shadow:var(--shadow-bar,0 10px 34px rgba(0,0,0,.4))}',
    '.aub-add{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:var(--backgrounds-button-primary);border:0;cursor:pointer}',
    '.aub-div{width:1px;height:20px;background:var(--strokes-line-1)}',
    '.aub-zoom{position:relative}',
    '.aub-zoom > button{display:flex;align-items:center;gap:8px;height:30px;padding:0 6px;border-radius:8px;background:var(--backgrounds-type-default-bg-2,var(--backgrounds-card-bg-4));border:1px solid var(--strokes-card-default);color:var(--text-secondary);cursor:pointer;font:400 14px/20px var(--font-geist)}',
    '.aub-zmenu{position:absolute;left:0;bottom:calc(100% + 8px);min-width:140px;padding:4px;border-radius:10px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 8px 24px rgba(0,0,0,.3)}',
    '.aub-zmenu[hidden]{display:none}',
    '.aub-zmenu button{width:100%;padding:6px 10px;border:0;border-radius:6px;background:none;text-align:left;cursor:pointer;color:var(--text-primary);font:400 13px/18px var(--font-geist)}',
    '.aub-zmenu button:hover{background:var(--backgrounds-card-bg-4)}',
    '.aub-zmenu button.is-on{color:var(--text-coloured-blue)}',
    '.aub-tb{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 8px;border-radius:8px;border:0;background:none;color:var(--text-secondary);cursor:pointer;font:500 14px/20px var(--font-geist)}',
    '.aub-tb:hover{background:var(--backgrounds-card-bg-4)}',
    /* right panel */
    '.aub-side{flex:none;width:380px;display:flex;flex-direction:column;background:var(--backgrounds-card-bg-5);border-left:1px solid var(--strokes-line-3);min-height:0}',
    '.aub-side__h{flex:none;display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--strokes-line-3)}',
    '.aub-side__h h3{flex:1 1 auto;min-width:0;margin:0;font:500 16px/24px var(--font-geist);letter-spacing:-.64px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aub-x{width:28px;height:28px;border-radius:6px;border:0;background:none;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center}',
    '.aub-x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.aub-side__b{flex:1 1 auto;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px}',
    '.aub-lbl{color:var(--text-teritiary);font:500 12px/16px var(--font-geist);letter-spacing:.02em}',
    '.aub-p{margin:0;color:var(--text-secondary);font:400 13px/18px var(--font-geist)}',
    '.aub-list{display:flex;flex-direction:column;gap:8px}',
    '.aub-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);cursor:pointer;text-align:left;color:inherit}',
    '.aub-item:hover{border-color:var(--strokes-card-selected)}',
    '.aub-item .ic{width:28px;height:28px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-badge-indigo);color:var(--text-coloured-indigo)}',
    '.aub-item .tx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}',
    '.aub-item .tx b{font:500 13px/18px var(--font-geist)}',
    '.aub-item .tx small{color:var(--text-teritiary);font:400 12px/16px var(--font-geist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.aub-came{display:flex;flex-wrap:wrap;gap:6px}',
    '.aub-came span{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:13px;background:var(--backgrounds-card-bg-4);color:var(--text-secondary);font:400 12px/16px var(--font-geist)}',
    '.aub-side .mkws-res{background:var(--backgrounds-card-bg-2)}',
    '.aub-allset{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:var(--backgrounds-badge-green);border:1px solid var(--strokes-colour-green);color:var(--text-coloured-green);font:400 13px/18px var(--font-geist)}'
  ].join('\n');
  document.head.appendChild(css);

  var B = null; /* { ref, nodes, sel, zoom, pan } */

  /* The flow, read off the automation: Start, its agents in order, any
     human checkpoints, End. Tools go to the agents in turn; the model and
     the integrations behind an agent's tools sit with that agent. */
  function buildNodes(w) {
    var agents = (w.agents && w.agents.length ? w.agents : [w.name]);
    var tools = w.tools || [], needs = w.needs || [];
    var nodes = [{ id: 'start', type: 'start' }];
    agents.forEach(function (name, i) {
      var my = tools.filter(function (_, j) { return j % agents.length === i; });
      var keys = needs.filter(function (n) {
        if (n.kind === 'model') return true;
        if (n.kind === 'tool') return my.indexOf(n.name) >= 0;
        if (n.kind === 'integration') return (n.used || []).some(function (t) { return my.indexOf(t) >= 0; });
        if (n.kind === 'agent') return n.name === name;
        return i === 0;
      }).map(function (n) { return n.key; });
      nodes.push({ id: 'a' + i, type: 'agent', name: name, tools: my,
        skills: (w.skills || []).filter(function (_, j) { return j % agents.length === i; }),
        guards: i === 0 ? (w.guards || []) : [], keys: keys });
    });
    (w.checkpoints || []).forEach(function (c, i) { nodes.push({ id: 'h' + i, type: 'hitl', name: c, keys: [] }); });
    nodes.push({ id: 'end', type: 'end' });
    return nodes;
  }
  function need(w, key) { return (w.needs || []).filter(function (n) { return n.key === key; })[0]; }
  function leftOf(w, node) {
    var n = 0;
    (node.keys || []).forEach(function (k) { var x = need(w, k); if (x) n += M.left(w.ref, x).length; });
    return n;
  }

  function modelLeft(w, n) {
    return (n.keys || []).some(function (k) { var x = k.indexOf('model:') === 0 && need(w, k); return x && M.left(w.ref, x).length; });
  }
  function nodeHTML(w, n) {
    if (n.type === 'start') return '<div class="aub-node" data-aub-node="start"><span class="aub-pill">' + IC.play + 'Start</span></div>';
    if (n.type === 'end') return '<div class="aub-node" data-aub-node="end"><span class="aub-pill">' + IC.stop + 'End</span></div>';
    var left = leftOf(w, n);
    var badge = n.type === 'agent' ? '<span class="aub-b aub-b--agent">' + IC.agent + 'Agent</span>' : '<span class="aub-b aub-b--hitl">' + IC.hitl + 'Human check point</span>';
    var st = n.keys.length ? (left ? '<span class="aub-b aub-b--todo" data-aub-st>' + IC.warn + left + ' to fill in</span>' : '<span class="aub-b aub-b--ok" data-aub-st>' + IC.check + 'Ready</span>') : '';
    var sub = n.type === 'agent' ? (n.tools.length ? 'Uses ' + n.tools.join(', ') : 'Runs on ' + (w.model || 'the shared model')) : 'Waits for a person to approve before it carries on';
    var meta = n.type === 'agent'
      ? '<div class="aub-meta">' + (w.model ? '<span class="aub-chip' + (modelLeft(w, n) ? ' is-todo' : '') + '" data-aub-model>' + IC.brain + E(w.model) + '</span>' : '') +
          '<span class="aub-chip">' + IC.tool + n.tools.length + '</span><span class="aub-chip">' + IC.skill + n.skills.length + '</span><span class="aub-chip">' + IC.guard + n.guards.length + '</span></div>'
      : '';
    return '<div class="aub-node' + (left ? ' is-todo' : '') + (B.sel === n.id ? ' is-sel' : '') + '" data-aub-node="' + n.id + '">' +
      '<div class="aub-badges">' + badge + st + '</div>' +
      '<div class="aub-card" data-aub-pick="' + n.id + '"><div><div class="t">' + E(n.name) + '</div><div class="s">' + E(sub) + '</div></div>' + meta + '</div></div>';
  }

  function open(ref) {
    var w = M.get(ref);
    if (!w) return false;
    close(true);
    B = { ref: ref, nodes: buildNodes(w), sel: null, zoom: 100, pan: { x: 0, y: 0 } };
    var first = B.nodes.filter(function (n) { return leftOf(w, n); })[0];
    var root = document.createElement('section');
    root.className = 'aub'; root.id = 'aub';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Automation builder');
    root.innerHTML =
      '<header class="aub-top agb-bar">' +
        '<button type="button" class="aub-back" data-aub-close aria-label="Back to Automations">' + IC.back + '</button>' +
        '<nav class="aub-trail"><span class="m" data-aub-close>' + IC.flow + 'Automations</span><span class="sep">/</span><span class="c">' + E(w.name) + '</span></nav>' +
        '<span class="aub-tag">' + IC.store + 'From the Marketplace</span>' +
        '<span class="aub-sp"></span>' +
        '<span class="aub-prog" id="aubProg"></span>' +
        '<button type="button" class="aub-btn aub-btn--ghost" data-aub-discard>Discard</button>' +
        '<button type="button" class="aub-btn aub-btn--primary" id="aubFinish" data-aub-finish>Finish setup</button>' +
      '</header>' +
      '<div class="aub-main">' +
        '<div class="aub-canvas" id="aubCanvas"><div class="aub-dots" id="aubDots"></div>' +
          '<div class="aub-stage" id="aubStage"><svg class="aub-wires" id="aubWires"></svg><div id="aubNodes"></div></div>' +
          '<div class="aub-bar">' +
            '<button type="button" class="aub-add" data-aub-add aria-label="Add node">' + IC.plus + '</button><span class="aub-div"></span>' +
            '<div class="aub-zoom"><button type="button" data-aub-zoom>' + IC.zoom + '<span id="aubZoomL">100%</span>' + IC.down + '</button>' +
              '<div class="aub-zmenu" id="aubZMenu" hidden>' + [50, 75, 100, 125, 150].map(function (z) { return '<button type="button" data-aub-z="' + z + '">' + z + '%</button>'; }).join('') + '</div></div>' +
            '<span class="aub-div"></span><button type="button" class="aub-tb" data-aub-notes>' + IC.notes + 'Notes</button><span class="aub-div"></span>' +
            '<button type="button" class="aub-tb" aria-label="Undo">' + IC.undo + '</button><button type="button" class="aub-tb" aria-label="Redo" style="opacity:.5">' + IC.redo + '</button>' +
          '</div>' +
        '</div>' +
        '<aside class="aub-side" id="aubSide" aria-label="Configure"></aside>' +
      '</div>';
    document.body.appendChild(root);
    paintNodes();
    centre();
    if (first) B.sel = first.id;
    paintNodes(); paintSide(); paintTop();
    M.onchange = function (r) { if (B && r === B.ref) refresh(); };
    requestAnimationFrame(function () { root.classList.add('is-shown'); });
    return true;
  }
  function close(quiet) {
    var el = $('aub');
    if (el) el.remove();
    if (!quiet && B) { var w = M.get(B.ref); if (w && !w.ready && window.mkwsSay) window.mkwsSay(w.name + ' is saved as a draft. Open it again to finish setup.'); }
    B = null;
  }

  /* Nodes run top to bottom down the middle of the canvas. */
  function paintNodes() {
    var w = M.get(B.ref); if (!w) return close(true);
    var host = $('aubNodes');
    host.innerHTML = B.nodes.map(function (n) { return nodeHTML(w, n); }).join('');
    var y = 40, xs = [];
    host.querySelectorAll('.aub-node').forEach(function (el) {
      el.style.top = y + 'px';
      el.style.left = (-el.offsetWidth / 2) + 'px';
      xs.push({ el: el, top: y, h: el.offsetHeight });
      y += el.offsetHeight + 56;
    });
    var d = '';
    for (var i = 0; i < xs.length - 1; i++) {
      var y1 = xs[i].top + xs[i].h + 2, y2 = xs[i + 1].top - 4;
      d += 'M0 ' + y1 + 'V' + y2 + 'M-5 ' + (y2 - 6) + 'L0 ' + y2 + 'L5 ' + (y2 - 6);
    }
    $('aubWires').innerHTML = '<path d="' + d + '"/>';
    B.height = y;
  }
  function centre() {
    var c = $('aubCanvas');
    B.pan = { x: c.clientWidth / 2, y: Math.max(24, (c.clientHeight - B.height * B.zoom / 100) / 2) };
    place();
  }
  function place() {
    var s = B.zoom / 100;
    $('aubStage').style.transform = 'translate(' + B.pan.x + 'px,' + B.pan.y + 'px) scale(' + s + ')';
    $('aubDots').style.transform = 'translate(' + (B.pan.x % 16) + 'px,' + (B.pan.y % 16) + 'px)';
    $('aubZoomL').textContent = B.zoom + '%';
  }

  function paintTop() {
    var T = M.totals(B.ref);
    $('aubProg').innerHTML = (T.left ? T.done + ' of ' + T.total + ' filled in' : 'All details filled in') + '<i><b style="width:' + (T.total ? Math.round(T.done / T.total * 100) : 100) + '%"></b></i>';
    $('aubFinish').disabled = T.left > 0;
  }
  /* The right panel: what is left, or the selected node's own fields. */
  function paintSide() {
    var w = M.get(B.ref), side = $('aubSide');
    var n = B.sel && B.nodes.filter(function (x) { return x.id === B.sel; })[0];
    if (!n || n.type === 'start' || n.type === 'end') {
      var todo = B.nodes.filter(function (x) { return leftOf(w, x); });
      side.innerHTML = '<div class="aub-side__h"><h3>Finish setup</h3></div><div class="aub-side__b">' +
        '<p class="aub-p">' + E(w.name) + ' came with everything it uses. ' + E(w.publisher || 'The publisher') + ' kept a few details private, so fill in your own on the nodes marked below.</p>' +
        (todo.length ? '<span class="aub-lbl">TO FILL IN</span><div class="aub-list">' + todo.map(function (x) {
          return '<button type="button" class="aub-item" data-aub-pick="' + x.id + '"><span class="ic">' + IC.agent + '</span><span class="tx"><b>' + E(x.name) + '</b><small>' +
            E(x.keys.map(function (k) { var q = need(w, k); return q && M.left(w.ref, q).length ? q.name : null; }).filter(Boolean).join(', ')) + '</small></span>' +
            '<span class="aub-b aub-b--todo">' + leftOf(w, x) + '</span></button>';
        }).join('') + '</div>'
          : '<div class="aub-allset">' + IC.check + '<span>Every detail is filled in. Finish setup to start using it.</span></div>') +
        '</div>';
      return;
    }
    var came = [];
    if (n.type === 'agent') {
      if (w.model) came.push([IC.brain, w.model]);
      n.tools.forEach(function (t) { came.push([IC.tool, t]); });
      n.skills.forEach(function (t) { came.push([IC.skill, t]); });
      n.guards.forEach(function (t) { came.push([IC.guard, t]); });
    }
    side.innerHTML = '<div class="aub-side__h">' + (n.type === 'agent' ? '<span class="aub-b aub-b--agent">' + IC.agent + 'Agent</span>' : '<span class="aub-b aub-b--hitl">' + IC.hitl + 'Check point</span>') +
        '<h3>' + E(n.name) + '</h3><button type="button" class="aub-x" data-aub-desel aria-label="Close">' + IC.close + '</button></div>' +
      '<div class="aub-side__b">' +
        (n.keys.length ? '<span class="aub-lbl">YOUR DETAILS</span><p class="aub-p">Kept private by the publisher. Fill them in to run this node.</p>' +
          '<div class="mkws-form">' + n.keys.map(function (k) { return M.resHTML(w.ref, k); }).join('') + '</div>'
          : '<p class="aub-p">' + (n.type === 'hitl' ? 'A person approves the result here before the automation carries on. Nothing to fill in.' : 'Nothing to fill in. The publisher shared everything this agent needs.') + '</p>') +
        (came.length ? '<span class="aub-lbl">CAME WITH IT</span><div class="aub-came">' + came.map(function (c) { return '<span>' + c[0] + E(c[1]) + '</span>'; }).join('') + '</div>' : '') +
      '</div>';
  }
  /* Typing changes counts only: node badges, the bar and the progress. */
  function refresh() {
    var w = M.get(B.ref); if (!w) return;
    B.nodes.forEach(function (n) {
      var el = document.querySelector('[data-aub-node="' + n.id + '"]');
      if (!el || !n.keys || !n.keys.length) return;
      var left = leftOf(w, n);
      el.classList.toggle('is-todo', !!left);
      var st = el.querySelector('[data-aub-st]');
      var mc = el.querySelector('[data-aub-model]'); if (mc) mc.classList.toggle('is-todo', !!modelLeft(w, n));
      if (st) { st.className = 'aub-b ' + (left ? 'aub-b--todo' : 'aub-b--ok'); st.innerHTML = left ? IC.warn + left + ' to fill in' : IC.check + 'Ready'; }
    });
    paintTop();
  }
  function select(id) {
    B.sel = id;
    document.querySelectorAll('.aub-node').forEach(function (el) { el.classList.toggle('is-sel', el.getAttribute('data-aub-node') === id); });
    paintSide();
  }

  document.addEventListener('click', function (e) {
    if (!B) return;
    var t = e.target, x;
    if (!t.closest('#aub')) return;
    if (!t.closest('.aub-zoom')) { var zm = $('aubZMenu'); if (zm) zm.hidden = true; }
    if (t.closest('[data-aub-close]')) return close();
    if (t.closest('[data-aub-discard]')) { var r = B.ref; close(true); M.discard(r); return; }
    if (t.closest('[data-aub-finish]')) { var r2 = B.ref; if (M.totals(r2).left) return; close(true); M.finish(r2); return; }
    if ((x = t.closest('[data-aub-pick]'))) return select(x.getAttribute('data-aub-pick'));
    if (t.closest('[data-aub-desel]')) return select(null);
    if (t.closest('[data-aub-zoom]')) { $('aubZMenu').hidden = !$('aubZMenu').hidden; return; }
    if ((x = t.closest('[data-aub-z]'))) { B.zoom = +x.getAttribute('data-aub-z'); $('aubZMenu').hidden = true; return place(); }
    if (t.closest('[data-aub-add]')) { if (window.mkwsSay) window.mkwsSay('Finish setup first, then add nodes to change the flow.'); return; }
    if (t.closest('[data-aub-notes]')) { if (window.mkwsSay) window.mkwsSay('Notes open here once the automation is set up.'); return; }
    if (t.closest('.aub-canvas') && !t.closest('.aub-node, .aub-bar') && !B.moved) select(null);
  });
  /* Drag the canvas to pan. */
  document.addEventListener('pointerdown', function (e) {
    if (!B || !e.target.closest('.aub-canvas') || e.target.closest('.aub-node, .aub-bar')) return;
    var c = $('aubCanvas'), sx = e.clientX, sy = e.clientY, px = B.pan.x, py = B.pan.y;
    B.moved = false;
    c.classList.add('is-panning');
    function mv(ev) { var dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 3) B.moved = true; B.pan = { x: px + dx, y: py + dy }; place(); }
    function up() { c.classList.remove('is-panning'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setTimeout(function () { if (B) B.moved = false; }, 0); }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  document.addEventListener('keydown', function (e) {
    if (!B || e.key !== 'Escape') return;
    e.stopPropagation();
    if (B.sel) return select(null);
    close();
  }, true);
  window.addEventListener('resize', function () { if (B) centre(); });

  window.aub = { openSetup: open, close: close, isOpen: function () { return !!B; } };
})();
