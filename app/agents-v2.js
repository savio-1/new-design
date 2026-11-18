/* ════════════════════════════════════════════════════════════════════
   AGENTS · LANDING + BUILDER
   Runs on the bundled Agents page, before the workspace bridge.

   Landing (Figma "Agents- landing", Cogentiq Builder 980:355439):
   no type sidebar or filter row; Workspace | Marketplace on the left,
   search and New agent on the right; three columns of compact cards —
   mark and name, one line of description, then the model and what is
   bound to it, against the owner. Orchestrators carry their corner tag
   and lead with a sub-agent chip.

   Builder (Figma "After publishing", 1063:84473): the agent as a node
   map on a dotted canvas — Instructions above, Model and Context to the
   left, Tools and Guardrails to the right, the agent in the middle with
   its goal and backstory. A top bar with the breadcrumb, Test and
   Publish; a bottom bar with zoom, notes, undo and redo; a Test panel
   with a log stream. Four states, as in the frames: first time creating,
   tested, published (view-only), editing again after publishing.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  if (typeof AGENTS === 'undefined') return;
  var SVG = /*AGX_SVG*/{};
  var IN_SHELL = window.parent !== window;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var byId = function (id) { return document.getElementById(id); };
  document.body.classList.add('agx');

  /* ════════════════════════════════════════════════════════════════
     STYLES
     ════════════════════════════════════════════════════════════════ */
  var css = document.createElement('style');
  css.textContent = String.raw`
/* ── Landing ── */
body.agx .cq-page__sidebar, body.agx .hdr-sub, body.agx .filter-row, body.agx .ag-count { display: none !important; }
/* As the frame has it: the header and the tab row share one surface,
   split by a separator under the header; the cards sit below on the page. */
body.agx .cq-page__header { background: var(--backgrounds-card-bg-2); border-bottom: 1px solid var(--strokes-line-1); }
body.agx .cq-page__bar {
  height: 52px; padding: 8px 24px; gap: 12px; justify-content: space-between;
  background: var(--backgrounds-card-bg-2); border-bottom: 0; filter: none;
}
body.agx .cq-page__bar .bar-actions { gap: 12px; }
body.agx #srcTabs > button { gap: 4px; }
body.agx .cq-page__bar .cq-search { width: 320px; height: 36px; }
body.agx .new-btn > svg:last-child { display: none; }
body.agx .seg-count { color: inherit; font: inherit; background: none; border: 0; padding: 0; min-width: 0; height: auto; }
body.agx .seg-count::before { content: "("; }
body.agx .seg-count::after { content: ")"; }
body.agx .cq-page__content { padding: 16px 24px 32px; background: var(--backgrounds-page-bg-4); }
body.agx .ag-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 1180px) { body.agx .ag-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px)  { body.agx .ag-grid { grid-template-columns: minmax(0, 1fr); } }

body.agx .ag-card {
  min-height: 128px; padding: 16px; gap: 0; border-radius: 12px;
  background: var(--backgrounds-card-bg-2);
  border: 1px solid var(--strokes-line-3);
  box-shadow: 0 1px 2px rgba(33, 33, 33, .08);
}
body.agx .ag-card::before { display: none; }
body.agx .ag-card:hover { border-color: var(--strokes-line-1); }
body.agx .ag-card__top { gap: 8px; }
body.agx .ag-mark { width: 32px; height: 32px; border-radius: 8px; }
body.agx .ag-card__name { font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px; }
body.agx .ag-card__desc {
  display: block; -webkit-line-clamp: unset; min-height: 0; margin-top: 6px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font: 400 12px/22px var(--font-geist); letter-spacing: -0.24px; color: var(--text-teritiary);
}
body.agx .ag-card__foot { margin-top: auto; padding-top: 12px; }
body.agx .ag-card__tags { gap: 6px; }
body.agx .ag-card__kind {
  padding: 2px 6px 3px; border: 0; border-radius: 0 12px 0 6px;
  background: var(--backgrounds-page-bg-4); color: var(--text-secondary);
  font: 400 10px/14px var(--font-geist); letter-spacing: -0.2px;
}
:root[data-mode="light"] body.agx .ag-card__kind { background: var(--backgrounds-page-bg-3); }
body.agx .ag-card:has(.ag-card__kind) .ag-card__top { padding-right: 72px; }
body.agx .ag-cap {
  height: 24px; min-width: 24px; padding: 4px 8px; gap: 4px; border-radius: 80px;
  background: var(--backgrounds-card-bg-4); color: var(--text-secondary);
  font: 400 12px/16px var(--font-geist); letter-spacing: -0.24px;
}
body.agx .ag-cap .cq-ic { width: 16px; height: 16px; color: var(--text-secondary); }
body.agx .ag-cap--logo { width: 24px; padding: 4px; border-radius: 6px; }
body.agx .ag-cap--logo img, body.agx .ag-cap--logo svg { width: 16px; height: 16px; }
body.agx .ag-cap--text { border-radius: 6px; }
body.agx .ag-cap--member { max-width: 150px; }
body.agx .ag-cap--member span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
body.agx .ag-card__end .cq-avatar { width: 20px; height: 20px; }

/* ── Builder ── */
.agb { --agb-dot: #323232; --agb-wire: #4a4a4a; }
:root[data-mode="light"] .agb { --agb-dot: #d4d4d4; --agb-wire: #bdbdbd; }
.agb {
  position: fixed; inset: 0; z-index: 260; display: flex; flex-direction: column;
  background: var(--backgrounds-page-bg-4); color: var(--text-primary); font-family: var(--font-geist);
  -webkit-font-smoothing: antialiased; opacity: 0; transition: opacity .18s ease;
}
.agb.is-shown { opacity: 1; }
:where(.agb) button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
:where(.agb) :focus-visible { outline: 2px solid var(--strokes-type-focus); outline-offset: 2px; }
.agb svg { display: block; flex: none; }

.agb-bar {
  position: relative; z-index: 5; flex: none; height: 48px;
  display: flex; align-items: center; justify-content: space-between; padding: 8px 16px;
  background: var(--backgrounds-page-bg-2); border-bottom: 1px solid var(--strokes-line-1);
  backdrop-filter: blur(9px);
}
.agb-crumb { display: flex; align-items: center; gap: 8px; min-width: 0; }
.agb-back {
  width: 26px; height: 26px; flex: none; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; background: var(--backgrounds-card-bg-2); border: 1px solid var(--strokes-type-default) !important;
  color: var(--text-secondary); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .12));
}
.agb-back:hover { color: var(--text-primary); }
.agb-trail { display: flex; align-items: center; gap: 2px; min-width: 0; }
.agb-root { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px; color: var(--text-teritiary);
  font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px; border-radius: 6px; }
.agb-root:hover { color: var(--text-secondary); }
.agb-sep { color: var(--text-disabled-tonal-2, #616161); font: 400 12px/16px var(--font-geist); }
.agb-title { display: inline-flex; align-items: center; gap: 10px; padding: 2px 4px; min-width: 0; }
.agb-name { color: var(--text-primary); font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 360px; outline: 0; border-radius: 4px; }
.agb-name[contenteditable="true"] { padding: 0 4px; box-shadow: 0 0 0 1px var(--strokes-type-focus); }
.agb-rename { color: var(--text-secondary); border-radius: 4px; }
.agb-rename:hover { color: var(--text-primary); }
.agb-actions { display: flex; align-items: center; gap: 8px; }
.agb-btn { height: 32px; min-width: 80px; padding: 6px 12px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px; white-space: nowrap; }
.agb-btn--test { background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.agb-btn--test.is-on { box-shadow: inset 0 0 0 1px var(--strokes-card-selected); }
.agb-btn--primary { background: var(--backgrounds-button-primary); color: var(--text-button-white); }
.agb-btn--primary:hover { filter: brightness(1.08); }
.agb-btn:disabled { background: var(--backgrounds-disabled-tonal-2); color: var(--text-disabled-tonal-2); cursor: not-allowed; filter: none; }
.agb-more { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.agb-more:hover { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-menu {
  position: absolute; top: 44px; right: 16px; z-index: 30; min-width: 200px; padding: 4px;
  background: var(--backgrounds-card-bg-3); border: 1px solid var(--strokes-card-default); border-radius: 12px; box-shadow: var(--shadow-pop);
}
.agb-menu button { width: 100%; height: 34px; padding: 0 10px; border-radius: 8px; text-align: left; display: flex; align-items: center; gap: 8px;
  color: var(--text-secondary); font: 400 14px/20px var(--font-geist); letter-spacing: -0.56px; }
.agb-menu button:hover { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-menu .is-danger { color: var(--text-coloured-red, #ff6b5c); }
.agb-setupchip { height: 24px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border-radius: 12px;
  background: var(--backgrounds-badge-orange); border: 1px solid var(--strokes-colour-orange); color: var(--text-coloured-orange);
  font: 500 12px/16px var(--font-geist); white-space: nowrap; }

/* The pill under the bar: view-only, or what setup still needs */
#agbBanner { position: absolute; inset: 0; pointer-events: none; }
#agbBanner > * { pointer-events: auto; }
.agb-banner {
  position: absolute; left: 50%; top: 48px; transform: translateX(-50%); z-index: 4;
  display: flex; align-items: center; gap: 4px; padding: 6px 16px; border-radius: 0 0 8px 8px;
  background: var(--backgrounds-button-tonal-1); filter: drop-shadow(0 2px 2px rgba(18, 18, 18, .16));
  font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px; color: var(--text-primary); white-space: nowrap;
}
.agb-banner > span { padding: 2px 4px; }
.agb-banner--warn { background: var(--backgrounds-badge-orange); color: var(--text-coloured-orange); box-shadow: inset 0 0 0 1px var(--strokes-colour-orange); }
.agb-banner__btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px;
  background: var(--backgrounds-button-primary); color: var(--text-button-white); font: 500 12px/16px var(--font-geist); letter-spacing: -0.24px; }

/* Canvas */
.agb-canvas {
  position: relative; flex: 1 1 auto; min-height: 0; overflow: auto;
  background-color: var(--backgrounds-page-bg-4);
  background-image: radial-gradient(circle, var(--agb-dot) 1px, transparent 1.2px);
  background-size: 16px 16px;
}
.agb-world { position: relative; min-width: 100%; min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 140px 40px 160px; }
.agb-stage { position: relative; width: 848px; display: grid; grid-template-columns: 256px 256px 256px; column-gap: 40px; align-items: start; transform-origin: center top; }
.agb-wires { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.agb-wires path { fill: none; stroke: var(--agb-wire); stroke-width: 1.5; }
.agb-col { position: relative; display: flex; flex-direction: column; }
.agb-col--side { padding-top: 59px; }
.agb-col--side > .agb-node:first-child { min-height: 170px; padding-bottom: 24px; }
.agb-col--mid > .agb-node:first-child { min-height: 115px; }

.agb-node { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 256px; }
.agb-label { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px 4px; border-radius: 8px; border: 1px solid;
  font: 500 12px/16px var(--font-geist); letter-spacing: -0.48px; white-space: nowrap; }
.agb-label .req { color: #dc3412; }
.agb-label--model { background: var(--agb-indigo-bg, #06082a); border-color: #292fa3; color: #a0a5f7; }
.agb-label--context { background: var(--backgrounds-badge-light-green); border-color: var(--strokes-colour-light-green); color: var(--text-coloured-light-green); }
.agb-label--tools { background: #160524; border-color: #4b0d87; color: #bb7fff; }
.agb-label--instr { background: #261200; border-color: #683509; color: #dd7c0e; }
.agb-label--guard { background: #200403; border-color: #660e0b; color: #dc3412; }
:root[data-mode="light"] .agb-label--model { background: #f0f1fe; border-color: #c2c5fa; color: #454de0; }
:root[data-mode="light"] .agb-label--tools { background: #f9f5ff; border-color: #e4ccff; color: #8638e5; }
:root[data-mode="light"] .agb-label--instr { background: #fff4e5; border-color: #fcd19c; color: #ce7012; }
:root[data-mode="light"] .agb-label--guard { background: #fff5f5; border-color: #ffc7c2; color: #dc3412; }
.agb-box {
  width: 100%; min-height: 34px; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px;
  background: var(--backgrounds-card-bg-2); border: 1px solid var(--strokes-line-3);
  box-shadow: 0 1px 3px 1px rgba(33, 33, 33, .08); text-align: left;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.agb.is-edit .agb-box.is-pick { cursor: pointer; }
.agb.is-edit .agb-box.is-pick:hover, .agb-box.is-active {
  border-color: var(--strokes-type-focus); box-shadow: 0 0 0 2.5px rgba(13, 153, 255, .3);
}
.agb-box.is-warn { border-color: var(--strokes-colour-orange); box-shadow: 0 0 0 2.5px rgba(221, 124, 14, .22); }
.agb-ph { flex: 1 1 auto; min-width: 0; color: var(--text-teritiary); font: 400 12px/16px var(--font-geist); letter-spacing: -0.24px; }
.agb-val { flex: 1 1 auto; min-width: 0; white-space: pre-line; color: var(--text-primary); font: 400 12px/16px var(--font-geist); letter-spacing: -0.24px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.agb-model { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 6px; color: var(--text-primary); font: 500 12px/16px var(--font-geist); }
/* Top right corner of the box, as in the frame: 12px in, 8px down. */
.agb-plus { flex: none; align-self: flex-start; margin-left: auto; width: 20px; height: 20px; padding: 2px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--backgrounds-button-primary); color: #fff; }
.agb.is-view .agb-plus, .agb.is-view .agb-edit { display: none; }
.agb-list { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.agb-chip { max-width: 100%; height: 24px; display: inline-flex; align-items: center; gap: 5px; padding: 0 8px; border-radius: 6px;
  background: var(--backgrounds-card-bg-4); color: var(--text-secondary); font: 400 12px/16px var(--font-geist); letter-spacing: -0.24px; }
.agb-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agb-chip.is-warn { background: var(--backgrounds-badge-orange); color: var(--text-coloured-orange); box-shadow: inset 0 0 0 1px var(--strokes-colour-orange); }
/* A tool that waits on an integration the publisher kept: its own row,
   with the integration named and Connect at the end. */
.agb-list.is-rows { flex-direction: column; flex-wrap: nowrap; }
.agb-need { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 8px; row-gap: 1px;
  padding: 6px 8px; border-radius: 8px; background: var(--backgrounds-card-bg-4); }
.agb-need.is-warn { background: var(--backgrounds-badge-orange); box-shadow: inset 0 0 0 1px var(--strokes-colour-orange); }
.agb-need .nm { color: var(--text-primary); font: 500 12px/16px var(--font-geist); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agb-need .via { grid-column: 1; color: var(--text-teritiary); font: 400 11px/14px var(--font-geist); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agb-need.is-warn .via { color: var(--text-coloured-orange); }
.agb-need .act { grid-column: 2; grid-row: 1 / span 2; }
.agb-connect { padding: 3px 8px; border-radius: 6px; background: var(--backgrounds-button-primary); color: #fff !important; font: 500 11px/14px var(--font-geist); white-space: nowrap; }
.agb-need .ok { color: var(--text-coloured-green); font: 500 11px/14px var(--font-geist); white-space: nowrap; }
.agb-mcol { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
.agb.is-setup .agb-world { padding-right: 400px; }
.agb-mneed { display: block; width: 100%; margin-top: 4px; color: var(--text-coloured-orange); font: 400 11px/14px var(--font-geist); }
/* Setup: the details the publisher kept private, filled in beside the canvas */
.agb-setup__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 12px 4px; }
.agb-setup__lede { margin: 0 4px 12px; color: var(--text-secondary); font: 400 12px/17px var(--font-geist); }
.agb-setup .mkws-res__shared { padding-left: 14px; margin-top: -6px; }
.agb-chip .ok { color: var(--text-coloured-green); }

/* The agent in the middle */
.agb-agent { position: relative; display: flex; flex-direction: column; align-items: center; width: 256px; }
.agb-tab { display: inline-flex; align-items: flex-start; gap: 6px; height: 26px; padding: 6px 10px 4px; border-radius: 8px 8px 0 0;
  background-image: linear-gradient(188deg, #454de0 8.8%, #5860ed 54.4%, #c2c5fa 100%); color: #fff;
  font: 500 12px/16px var(--font-geist); letter-spacing: -0.24px; box-shadow: 0 1px 3px 1px rgba(33, 33, 33, .08); max-width: 240px; }
.agb-tab span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agb-card { width: 256px; display: flex; flex-direction: column; gap: 8px; padding: 8px 12px; border-radius: 12px;
  background: var(--backgrounds-card-bg-2); border: 1px solid var(--strokes-line-3); box-shadow: 0 1px 3px 1px rgba(33, 33, 33, .08); }
.agb-field { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.agb-field__head { display: flex; align-items: center; justify-content: space-between; }
.agb-field__k { color: var(--text-teritiary); font: 500 10px/14px var(--font-geist); letter-spacing: -0.2px; }
.agb-field__v { color: var(--text-secondary); font: 400 12px/16px var(--font-geist); letter-spacing: -0.24px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agb-field__v.is-empty { color: var(--text-teritiary); }
.agb-edit { border-radius: 6px; color: var(--text-button-tonal-1); }
.agb-rule { height: 1px; background: var(--strokes-line-3); }

/* The bottom bar */
.agb-tools {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 4;
  display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 12px;
  background: var(--backgrounds-card-bg-2); box-shadow: 0 1px 4px 2px rgba(33, 33, 33, .12), 0 1px 4px rgba(33, 33, 33, .08);
}
.agb-zoom { position: relative; display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 8px;
  background: var(--backgrounds-card-bg-2); border: 1px solid var(--strokes-card-default) !important; color: var(--text-button-tonal-2);
  font: 400 14px/20px var(--font-geist); letter-spacing: -0.56px; }
.agb-vr { width: 1px; height: 20px; background: var(--strokes-line-1); }
.agb-tbtn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; color: var(--text-button-tonal-2);
  font: 500 14px/20px var(--font-geist); letter-spacing: -0.56px; }
.agb-tbtn:hover:not(:disabled), .agb-ibtn:hover:not(:disabled) { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-tbtn.is-on { background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.agb-ibtn { padding: 4px; border-radius: 8px; color: var(--text-button-tonal-2); }
.agb-ibtn:disabled { color: var(--text-disabled-tonal-2); cursor: default; }
.agb-zpop { position: absolute; bottom: calc(100% + 8px); left: 0; min-width: 120px; padding: 4px; border-radius: 10px;
  background: var(--backgrounds-card-bg-3); border: 1px solid var(--strokes-card-default); box-shadow: var(--shadow-pop); }
.agb-zpop button { width: 100%; height: 30px; padding: 0 10px; border-radius: 6px; text-align: left; font: 400 13px/20px var(--font-geist); color: var(--text-secondary); }
.agb-zpop button:hover, .agb-zpop button.is-on { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-notes { position: absolute; left: 50%; bottom: 68px; transform: translateX(-50%); z-index: 4; width: 340px; padding: 12px; border-radius: 12px;
  background: #fff5c2; color: #3a3000; box-shadow: var(--shadow-pop); display: flex; flex-direction: column; gap: 6px; }
.agb-notes b { font: 500 12px/16px var(--font-geist); }
.agb-notes textarea { width: 100%; min-height: 90px; resize: vertical; border: 0; outline: 0; background: transparent; color: inherit;
  font: 400 13px/18px var(--font-geist); }

/* Picker and inline editor */
.agb-pop {
  position: absolute; z-index: 20; width: 280px; padding: 8px; border-radius: 12px;
  background: var(--backgrounds-card-bg-3); border: 1px solid var(--strokes-card-default); box-shadow: var(--shadow-pop);
  display: flex; flex-direction: column; gap: 6px;
}
.agb-pop__h { padding: 4px 6px 2px; color: var(--text-teritiary); font: 500 11px/14px var(--font-geist); letter-spacing: .2px; text-transform: uppercase; }
.agb-pop__list { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; }
.agb-opt { flex: none; height: 34px; padding: 0 8px; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-align: left;
  color: var(--text-secondary); font: 400 13px/18px var(--font-geist); letter-spacing: -0.4px; }
.agb-opt:hover { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-opt.is-on { color: var(--text-primary); }
.agb-opt .box { width: 16px; height: 16px; flex: none; border-radius: 4px; border: 1px solid var(--strokes-checkbox-default); display: inline-flex; align-items: center; justify-content: center; }
.agb-opt.is-on .box { background: var(--backgrounds-checkbox-focus); border-color: var(--backgrounds-checkbox-focus); color: #fff; }
.agb-opt .tick { margin-left: auto; color: var(--text-coloured-blue); visibility: hidden; }
.agb-opt.is-on .tick { visibility: visible; }
.agb-opt .lg { width: 18px; height: 18px; flex: none; display: inline-flex; align-items: center; justify-content: center; }
.agb-pop textarea { width: 100%; min-height: 110px; resize: vertical; padding: 8px 10px; border-radius: 8px; outline: 0;
  background: var(--backgrounds-type-default-bg-1); border: 1px solid var(--strokes-type-default); color: var(--text-primary);
  font: 400 13px/18px var(--font-geist); letter-spacing: -0.3px; }
.agb-pop textarea:focus { border-color: var(--strokes-type-focus); }
.agb-pop__foot { display: flex; justify-content: flex-end; gap: 6px; }
.agb-mini { height: 28px; padding: 0 10px; border-radius: 6px; font: 500 12px/16px var(--font-geist); }
.agb-mini--ghost { color: var(--text-secondary); }
.agb-mini--ghost:hover { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-mini--primary { background: var(--backgrounds-button-primary); color: #fff; }

/* Test panel */
.agb-test { position: absolute; top: 48px; right: 0; bottom: 0; z-index: 6; width: 360px; padding: 8px; display: flex;
  transform: translateX(100%); transition: transform .24s cubic-bezier(.2, .8, .2, 1); }
.agb-test.is-open { transform: none; }
.agb-test__in { width: 344px; height: 100%; display: flex; flex-direction: column; gap: 16px; padding: 8px 0; border-radius: 16px;
  background: var(--backgrounds-card-bg-5); border: 1px solid var(--strokes-line-3);
  box-shadow: 0 1px 2px rgba(18, 18, 18, .2), 0 2px 6px 1px rgba(18, 18, 18, .12); overflow: hidden; }
.agb-test__head { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px 12px; border-bottom: 1px solid var(--strokes-line-1); }
.agb-test__head b { font: 500 16px/24px var(--font-geist); letter-spacing: -0.64px; }
.agb-x { padding: 4px; border-radius: 6px; color: var(--text-secondary); }
.agb-x:hover { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-test__body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 0 16px 12px; }
.agb-log { flex: none; display: flex; flex-direction: column; gap: 12px; padding: 12px 0 10px; border-radius: 16px;
  background: var(--backgrounds-card-bg-5); border: 1px solid var(--strokes-line-3); box-shadow: 0 1px 2px rgba(18, 18, 18, .2), 0 2px 6px 1px rgba(18, 18, 18, .12);
  max-height: 58%; overflow: hidden; }
.agb-log__head { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
.agb-log__t { display: flex; align-items: center; gap: 6px; font: 500 16px/24px var(--font-geist); letter-spacing: -0.64px; }
.agb-log__bar { height: 6px; border-radius: 9999px; background: var(--strokes-line-1); overflow: hidden; }
.agb-log__bar i { display: block; height: 100%; width: 0; border-radius: 9999px; transition: width .4s ease;
  background-image: linear-gradient(90deg, #bde3ff 0%, #0d99ff 50%, #007be5 100%); }
.agb-log__filters { display: flex; gap: 8px; padding: 0 16px; flex-wrap: wrap; }
.agb-badge { padding: 4px 8px; border-radius: 80px; background: var(--strokes-line-1); color: var(--text-secondary); font: 500 12px/16px var(--font-geist); letter-spacing: -0.24px; }
.agb-badge.is-on { background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.agb-log__rows { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 0 16px 2px; }
.agb-log__sec { color: var(--text-secondary); font: 600 12px/16px var(--font-geist-mono); letter-spacing: -0.24px; }
.agb-log__row { display: flex; gap: 12px; align-items: flex-start; animation: agb-in .25s ease both; }
@keyframes agb-in { from { opacity: 0; transform: translateY(4px); } }
.agb-log__time { flex: none; color: var(--text-teritiary); font: 400 12px/16px var(--font-geist-mono); }
.agb-log__lvl { flex: none; width: 72px; padding: 4px 8px; border-radius: 6px; text-align: center; font: 600 12px/16px var(--font-geist-mono); letter-spacing: -0.24px; }
.agb-log__lvl[data-l="OK"] { background: rgba(139, 195, 74, .1); color: #85e0a3; }
.agb-log__lvl[data-l="LOG"] { background: rgba(13, 153, 255, .1); color: #44aaf3; }
.agb-log__lvl[data-l="INFO"] { background: rgba(151, 71, 255, .1); color: #bb7fff; }
.agb-log__lvl[data-l="WARNING"] { background: rgba(221, 124, 14, .1); color: #dd7c0e; }
.agb-log__lvl[data-l="ERROR"] { background: rgba(242, 72, 34, .2); color: #dc3412; }
:root[data-mode="light"] .agb-log__lvl[data-l="OK"] { color: #14ae5c; }
:root[data-mode="light"] .agb-log__lvl[data-l="LOG"] { color: #007be5; }
:root[data-mode="light"] .agb-log__lvl[data-l="INFO"] { color: #8638e5; }
.agb-log__msg { flex: 1 1 auto; min-width: 0; color: var(--text-primary); font: 400 12px/16px var(--font-geist-mono); letter-spacing: -0.24px; padding-top: 4px; }
.agb-out { flex: 1 1 auto; min-height: 80px; display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px; overflow-y: auto;
  background: var(--backgrounds-page-bg-2); }
.agb-out.is-empty { align-items: center; justify-content: center; color: var(--text-secondary); font: 400 14px/20px var(--font-geist); }
.agb-msg { max-width: 92%; padding: 8px 12px; border-radius: 12px; font: 400 13px/19px var(--font-geist); letter-spacing: -0.3px; }
.agb-msg--you { align-self: flex-end; background: var(--backgrounds-button-tonal-1); color: var(--text-primary); }
.agb-msg--agent { align-self: flex-start; background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agb-msg--agent b { display: block; margin-bottom: 2px; color: var(--text-teritiary); font: 500 11px/14px var(--font-geist); }
.agb-input { flex: none; display: flex; flex-direction: column; gap: 4px; }
.agb-input > span { font: 400 14px/20px var(--font-geist); letter-spacing: -0.56px; }
.agb-input__box { height: 97px; display: flex; flex-direction: column; justify-content: space-between; padding: 8px 12px; border-radius: 8px;
  background: var(--backgrounds-type-default-bg-1); border: 1px solid var(--strokes-type-default); }
.agb-input__box:focus-within { border-color: var(--strokes-type-focus); }
.agb-input textarea { flex: 1 1 auto; resize: none; border: 0; outline: 0; background: none; color: var(--text-primary); font: 400 14px/20px var(--font-geist); letter-spacing: -0.56px; }
.agb-input textarea::placeholder { color: var(--text-teritiary); }
.agb-send { align-self: flex-end; padding: 4px; border-radius: 20px; background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.agb-send:disabled { opacity: .5; cursor: default; }

/* Publish — a three-step dialog */
.agp-scrim { position: fixed; inset: 0; z-index: 280; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--scrim); }
.agp { width: min(680px, 100%); max-height: calc(100vh - 48px); display: flex; flex-direction: column; border-radius: 12px; overflow: hidden;
  background: var(--backgrounds-card-bg-2); border: 1px solid var(--strokes-card-default); box-shadow: var(--shadow-tiq); color: var(--text-primary); font-family: var(--font-geist); }
:where(.agp-scrim) button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.agp__head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--strokes-line-1); }
.agp__head b { font: 500 14px/20px var(--font-geist); letter-spacing: -0.4px; }
.agp__body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 184px minmax(0, 1fr); }
.agp__side { display: flex; flex-direction: column; justify-content: space-between; gap: 16px; padding: 8px; border-right: 1px solid var(--strokes-line-1); }
.agp__steps { display: flex; flex-direction: column; gap: 2px; }
.agp__step { height: 30px; padding: 0 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font: 400 13px/18px var(--font-geist); text-align: left; }
.agp__step i { width: 18px; height: 18px; flex: none; border-radius: 4px; border: 1px solid var(--strokes-line-1); display: inline-flex; align-items: center; justify-content: center; font: 400 11px/1 var(--font-geist); font-style: normal; }
.agp__step.is-on { background: var(--backgrounds-card-bg-4); color: var(--text-primary); }
.agp__step.is-on i { border-color: var(--text-button-tonal-1); background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.agp__step.is-done i { border-color: var(--text-coloured-green); color: var(--text-coloured-green); }
.agp__prev { display: flex; flex-direction: column; gap: 6px; padding: 8px; }
.agp__prev small { color: var(--text-secondary); font: 400 12px/16px var(--font-geist); }
.agp__card { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 10px; background: var(--backgrounds-card-bg-4); }
.agp__thumb { height: 72px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--backgrounds-page-bg-3); }
.agp__thumb img { width: 32px; height: 32px; border-radius: 8px; }
.agp__card b { font: 500 13px/18px var(--font-geist); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agp__card span { color: var(--text-teritiary); font: 400 12px/16px var(--font-geist); }
.agp__main { display: flex; flex-direction: column; gap: 18px; padding: 20px 24px; overflow-y: auto; }
.agp__f { display: flex; flex-direction: column; gap: 6px; }
.agp__l { display: flex; justify-content: space-between; color: var(--text-secondary); font: 500 13px/18px var(--font-geist); }
.agp__l .req { color: #f24822; }
.agp__l small { color: var(--text-teritiary); font: 400 12px/18px var(--font-geist); }
.agp__in { width: 100%; height: 34px; padding: 0 10px; border-radius: 6px; outline: 0; background: var(--backgrounds-type-default-bg-1);
  border: 1px solid transparent; color: var(--text-primary); font: 400 13px/18px var(--font-geist); }
textarea.agp__in { height: 96px; padding: 8px 10px; resize: none; }
select.agp__in { appearance: none; -webkit-appearance: none; cursor: pointer; }
.agp__in:focus { border-color: var(--strokes-type-focus); }
.agp__in.is-bad { border-color: #f24822; }
.agp__err { color: #ff8a73; font: 400 12px/16px var(--font-geist); }
:root[data-mode="light"] .agp__err { color: #dc3412; }
.agp__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.agp__chip { height: 26px; padding: 0 9px; border-radius: 6px; border: 1px solid var(--strokes-line-1) !important; color: var(--text-secondary); font: 400 12px/16px var(--font-geist); }
.agp__chip.is-on { background: var(--backgrounds-button-primary); border-color: var(--backgrounds-button-primary) !important; color: #fff; }
.agp__radio { display: flex; gap: 10px; padding: 12px; border-radius: 10px; border: 1px solid var(--strokes-line-1) !important; text-align: left; align-items: flex-start; width: 100%; }
.agp__radio.is-on { border-color: var(--strokes-card-selected) !important; background: var(--backgrounds-table-select); }
.agp__radio i { width: 16px; height: 16px; margin-top: 2px; flex: none; border-radius: 50%; border: 1px solid var(--strokes-checkbox-default); }
.agp__radio.is-on i { border: 5px solid var(--backgrounds-button-primary); }
.agp__radio b { display: block; font: 500 13px/18px var(--font-geist); }
.agp__radio span { color: var(--text-secondary); font: 400 12px/16px var(--font-geist); }
.agp__check { display: flex; gap: 10px; align-items: flex-start; text-align: left; width: 100%; padding: 4px 0; }
.agp__check .box { width: 16px; height: 16px; margin-top: 2px; flex: none; border-radius: 4px; border: 1px solid var(--strokes-checkbox-default); display: inline-flex; align-items: center; justify-content: center; }
.agp__check.is-on .box { background: var(--backgrounds-checkbox-focus); border-color: var(--backgrounds-checkbox-focus); color: #fff; }
.agp__check b { display: block; font: 500 13px/18px var(--font-geist); }
.agp__check span { color: var(--text-secondary); font: 400 12px/16px var(--font-geist); }
.agp__note { display: flex; gap: 8px; padding: 10px 12px; border-radius: 8px; background: var(--backgrounds-badge-orange); border: 1px solid var(--strokes-colour-orange);
  color: var(--text-coloured-orange); font: 400 12px/17px var(--font-geist); }
.agp__sum { display: flex; flex-direction: column; border: 1px solid var(--strokes-line-1); border-radius: 10px; }
.agp__sum div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; border-top: 1px solid var(--strokes-line-3); font: 400 13px/18px var(--font-geist); }
.agp__sum div:first-child { border-top: 0; }
.agp__sum span { color: var(--text-teritiary); }
.agp__sum em { font-style: normal; color: var(--text-primary); text-align: right; }
.agp__foot { flex: none; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--strokes-line-1); }
.agp__btn { height: 30px; padding: 0 12px; border-radius: 6px; font: 500 13px/18px var(--font-geist); }
.agp__btn--ghost { border: 1px solid var(--strokes-line-1) !important; color: var(--text-secondary); }
.agp__btn--primary { background: var(--backgrounds-button-primary); color: #fff; }

@media (prefers-reduced-motion: reduce) { .agb, .agb-test, .agb-log__row { transition: none; animation: none; } }
`;
  document.head.appendChild(css);

  /* ════════════════════════════════════════════════════════════════
     LANDING
     ════════════════════════════════════════════════════════════════ */
  /* Labels as the frame has them. */
  (function () {
    var ws = document.querySelector('#srcTabs [data-src="workspace"]');
    if (ws && ws.firstChild && ws.firstChild.nodeType === 3) ws.firstChild.textContent = 'Workspace ';
    var nb = byId('newBtn');
    if (nb) nb.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ' New agent '; });
    if (typeof cqSegSync === 'function') setTimeout(function () { cqSegSync(byId('srcTabs')); }, 0);
  })();

  /* An orchestrator leads with who it commands. */
  var _caps = capsHTML;
  capsHTML = function (a) {
    if (a.type !== 'orchestrator' || !a.members || !a.members.length) return _caps(a);
    var logo = logoOf(a.model);
    var first = a.members[0];
    return (logo ? '<span class="ag-cap ag-cap--logo" title="' + E(a.model) + '">' + logoHTML(logo, 16) + '</span>' : '') +
      '<span class="ag-cap ag-cap--member" title="' + E(a.members.map(function (m) { return m.name; }).join(', ')) + '">' + ic('ic-pp_agent', 16) + '<span>' + E(first.name) + '</span></span>' +
      (a.members.length > 1 ? '<span class="ag-cap">+' + (a.members.length - 1) + '</span>' : '');
  };

  /* A workspace agent opens in the builder; the marketplace tab keeps its panel. */
  var _open = openPanel;
  openPanel = function (i) {
    if (state.src === 'workspace' && AGENTS[i]) return openBuilder(AGENTS[i], { mode: 'view' });
    return _open(i);
  };
  /* New agent → a blank builder; the orchestrator and remote rows keep theirs. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('#newPop [data-new="agent"]');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (typeof setMenu === 'function') setMenu(false);
    openBuilder(null, { mode: 'edit' });
  }, true);
  render();

  /* ════════════════════════════════════════════════════════════════
     BUILDER DATA
     ════════════════════════════════════════════════════════════════ */
  var MODELS = ['GPT-4.1', 'GPT-4o', 'GPT-4o mini', 'Claude 3.5 Sonnet', 'Gemini 2.5 Pro', 'Mistral Large 2'];
  var uniq = function (xs) { return xs.filter(function (x, i) { return x && xs.indexOf(x) === i; }); };
  var TOOL_CATALOG = function () {
    return uniq([].concat.apply([], AGENTS.concat(MARKET).map(function (a) { return a.tools || []; }))
      .concat(['Web search', 'SQL query', 'Email sender', 'Calendar lookup', 'Slack poster'])).sort();
  };
  var GUARD_CATALOG = function () {
    return uniq([].concat.apply([], AGENTS.concat(MARKET).map(function (a) { return a.guards || []; }))
      .concat(['PII filter', 'Toxicity check', 'Topic boundary', 'Prompt injection shield'])).sort();
  };
  var CONTEXT_CATALOG = ['Doc store · Policies', 'Doc store · Contracts', 'Doc store · Brand guidelines',
    'Knowledge base · Support articles', 'Knowledge base · Product docs', 'SharePoint · Team site'];

  /* Every agent the builder opens gets the builder's fields, made up once
     from what the card already knows. */
  function prime(a) {
    if (a._b) return a;
    a._b = true;
    a.goal = a.goal || a.desc || '';
    a.backstory = a.backstory || (a.goal ? 'Built for the ' + ((a.tags && a.tags[0]) || 'operations') + ' team, it works quietly in the background and hands back results people can act on.' : '');
    a.instructions = a.instructions != null ? a.instructions
      : (a.skills && a.skills.length ? 'Steps to follow:\n' + a.skills.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') : '');
    a.context = a.context || [];
    a.tools = a.tools || []; a.guards = a.guards || []; a.skills = a.skills || [];
    a.status = a.status || (a.state === 'draft' ? 'draft' : 'published');
    return a;
  }

  /* ════════════════════════════════════════════════════════════════
     BUILDER STATE
     ════════════════════════════════════════════════════════════════ */
  var B = null;   /* { a, mode, isNew, tested, setup, zoom, past, future, notes, pick } */

  function snapshot(a) {
    return JSON.stringify({ name: a.name, goal: a.goal, backstory: a.backstory, instructions: a.instructions,
      model: a.model, tools: a.tools, context: a.context, guards: a.guards });
  }
  function commit() {
    B.past.push(B.last);
    if (B.past.length > 50) B.past.shift();
    B.future = [];
    B.last = snapshot(B.a);
    B.tested = false;
    paint();
  }
  function restore(s) { var o = JSON.parse(s); Object.keys(o).forEach(function (k) { B.a[k] = o[k]; }); }

  function openBuilder(a, opts) {
    opts = opts || {};
    var isNew = !a;
    if (isNew) {
      a = prime({ name: 'Untitled agent', type: 'agent', state: 'draft', desc: '', goal: '', backstory: '', instructions: '',
        model: '—', tools: [], skills: [], guards: [], context: [], usedBy: [], by: 'Savio Govindu', tags: [], updated: 'just now', runs: 0 });
      a.status = 'draft';
    } else prime(a);
    B = { a: a, mode: opts.mode || 'view', isNew: isNew, tested: false, setup: opts.setup || null,
      zoom: 100, past: [], future: [], notes: '', pick: null };
    B.last = snapshot(a);
    if (B.setup) B.mode = 'edit';
    if (a.status === 'draft' && !B.setup) B.mode = 'edit';
    build();
  }

  /* ════════════════════════════════════════════════════════════════
     BUILDER VIEW
     ════════════════════════════════════════════════════════════════ */
  var root = null;
  function build() {
    if (root) root.remove();
    root = document.createElement('div');
    root.className = 'agb';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Agent builder');
    root.innerHTML =
      '<header class="agb-bar">' +
        '<div class="agb-crumb">' +
          '<button class="agb-back" data-b="close" aria-label="Back to agents">' + SVG['arrow-left'] + '</button>' +
          '<span class="agb-trail">' +
            '<button class="agb-root" data-b="close">' + SVG.assistant + 'Agents</button>' +
            '<span class="agb-sep">/</span>' +
            '<span class="agb-title"><span class="agb-name" id="agbName"></span>' +
            '<button class="agb-rename" data-b="rename" aria-label="Rename">' + SVG['edit-title'] + '</button></span>' +
          '</span>' +
          '<span id="agbSetupChip"></span>' +
        '</div>' +
        '<div class="agb-actions" id="agbActions"></div>' +
        '<div id="agbBanner"></div>' +
        '<div class="agb-menu" id="agbMenu" hidden></div>' +
      '</header>' +
      '<main class="agb-canvas" id="agbCanvas"><div class="agb-world"><div class="agb-stage" id="agbStage"></div></div></main>' +
      '<div class="agb-tools">' +
        '<button class="agb-zoom" data-b="zoom" aria-haspopup="menu">' + SVG.zoom + '<span id="agbZoom">100%</span>' + SVG['arrow-down'] + '</button>' +
        '<span class="agb-vr"></span>' +
        '<button class="agb-tbtn" data-b="notes" id="agbNotesBtn">' + SVG.write + 'Notes</button>' +
        '<span class="agb-vr"></span>' +
        '<button class="agb-ibtn" data-b="undo" id="agbUndo" aria-label="Undo">' + SVG.undo + '</button>' +
        '<button class="agb-ibtn" data-b="redo" id="agbRedo" aria-label="Redo">' + SVG.redo + '</button>' +
      '</div>' +
      '<div id="agbNotes"></div>' +
      '<aside class="agb-test" id="agbTest" aria-label="Test">' +
        '<div class="agb-test__in">' +
          '<div class="agb-test__head"><b>Test</b><button class="agb-x" data-b="test-close" aria-label="Close test">' + SVG.close + '</button></div>' +
          '<div class="agb-test__body">' +
            '<div class="agb-log" id="agbLog" hidden>' +
              '<div class="agb-log__head"><span class="agb-log__t">' + SVG.logstream + 'Log stream</span>' +
              '<span class="agb-log__bar"><i id="agbProg"></i></span></div>' +
              '<div class="agb-log__filters" id="agbFilters"></div>' +
              '<div class="agb-log__rows" id="agbRows"></div>' +
            '</div>' +
            '<div class="agb-out is-empty" id="agbOut">Enter an input to test</div>' +
            '<label class="agb-input"><span>Input</span>' +
              '<span class="agb-input__box"><textarea id="agbIn" rows="2" placeholder="Enter input"></textarea>' +
              '<button class="agb-send" data-b="send" id="agbSend" aria-label="Run test">' + SVG.send + '</button></span>' +
            '</label>' +
          '</div>' +
        '</div>' +
      '</aside>' +
      '<aside class="agb-test agb-setup" id="agbSetup" aria-label="Fill in details">' +
        '<div class="agb-test__in">' +
          '<div class="agb-test__head"><b>Fill in details</b><button class="agb-x" data-b="setup-close" aria-label="Close">' + SVG.close + '</button></div>' +
          '<div class="agb-setup__body" id="agbSetupBody"></div>' +
        '</div>' +
      '</aside>';
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('is-shown'); });
    paint();
    var f = root.querySelector('.agb-back');
    if (f) f.focus({ preventScroll: true });
  }

  function setupState() {
    if (!B.setup || !window.mkws) return null;
    var w = window.mkws.get(B.setup);
    if (!w) return null;
    return { w: w, left: window.mkws.remaining(B.setup), needs: w.needs || [], T: window.mkws.totals(B.setup) };
  }

  function paint() {
    if (!root || !B) return;
    var a = B.a, edit = B.mode === 'edit', S = setupState();
    root.classList.toggle('is-edit', edit);
    root.classList.toggle('is-view', !edit);
    byId('agbName').textContent = a.name;

    /* The four states of the bar, as in the frames. */
    var acts = '<button class="agb-btn agb-btn--test' + (byId('agbTest') && byId('agbTest').classList.contains('is-open') ? ' is-on' : '') + '" data-b="test">Test</button>';
    if (S) acts = '<button class="agb-btn agb-btn--test' + (setupOpen() ? ' is-on' : '') + '" data-b="setup">Fill in details</button>' + acts;
    if (S) {
      acts += '<button class="agb-btn agb-btn--primary" data-b="finish"' + (S.left.length ? ' disabled' : '') + '>Finish setup</button>';
    } else if (edit) {
      var canPublish = B.tested && hasModel();
      acts += '<button class="agb-btn agb-btn--primary" data-b="publish"' + (canPublish ? '' : ' disabled') +
        ' title="' + (canPublish ? 'Publish this agent' : 'Run a test first. Publish unlocks once a test passes.') + '">Publish</button>';
    }
    if (!(edit && B.isNew && !S)) acts += '<button class="agb-more" data-b="more" aria-label="More options">' + SVG.options + '</button>';
    byId('agbActions').innerHTML = acts;

    byId('agbSetupChip').innerHTML = S
      ? '<span class="agb-setupchip">' + (S.T.left ? 'Setup · ' + S.T.done + ' of ' + S.T.total + ' filled in' : 'Setup complete') + '</span>' : '';

    var banner = '';
    if (S && S.left.length) {
      banner = '<div class="agb-banner agb-banner--warn"><span>Configure before it can be used: fill in ' + S.T.left + ' private ' +
        (S.T.left === 1 ? 'detail' : 'details') + '</span>' + (setupOpen() ? '' : '<button class="agb-banner__btn" data-b="setup">Fill in</button>') + '</div>';
    } else if (!edit) {
      banner = '<div class="agb-banner"><span>View-only mode. Click edit to make changes</span>' +
        '<button class="agb-banner__btn" data-b="edit">' + SVG['edit-white'] + 'Edit</button></div>';
    }
    byId('agbBanner').innerHTML = banner;

    byId('agbUndo').disabled = !edit || !B.past.length;
    byId('agbRedo').disabled = !edit || !B.future.length;
    byId('agbZoom').textContent = B.zoom + '%';
    byId('agbNotesBtn').classList.toggle('is-on', !!byId('agbNotes').firstChild);

    paintStage(S);
  }

  function hasModel() { return B.a.model && B.a.model !== '—'; }
  function listAnd(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }

  function node(kind, labelCls, icon, label, req, boxHTML, opts) {
    opts = opts || {};
    return '<div class="agb-node" data-node="' + kind + '">' +
      '<span class="agb-label ' + labelCls + '">' + icon + label + (req ? ' <span class="req">*</span>' : '') + '</span>' +
      '<div class="agb-box' + (opts.pick ? ' is-pick' : '') + (opts.warn ? ' is-warn' : '') + (B.pick === kind ? ' is-active' : '') + '"' +
        (opts.pick ? ' data-pick="' + kind + '" role="button" tabindex="' + (B.mode === 'edit' ? 0 : -1) + '"' : '') + '>' +
        boxHTML +
        (opts.plus === false ? '' : '<span class="agb-plus" aria-hidden="true">' + SVG.plus + '</span>') +
      '</div></div>';
  }

  function paintStage(S) {
    var a = B.a;
    var left = function (n) { return window.mkws.left(B.setup, n); };
    /* A tool's own details come first; otherwise those of the integration it runs on. */
    var needByTool = {};
    if (S) S.needs.forEach(function (n) { if (n.kind === 'integration') (n.used || []).forEach(function (t) { needByTool[t] = n; }); });
    if (S) S.needs.forEach(function (n) { if (n.kind === 'tool') needByTool[n.name] = n; });
    var modelNeed = S && S.needs.filter(function (n) { return n.kind === 'model'; })[0];
    var modelLeft = modelNeed ? left(modelNeed) : [];
    var selfNeed = S && S.needs.filter(function (n) { return n.kind === 'agent'; })[0];
    var selfLeft = selfNeed ? left(selfNeed) : [];

    var modelBox = '<span class="agb-mcol">' + (hasModel()
      ? '<span class="agb-model">' + (logoOf(a.model) ? logoHTML(logoOf(a.model), 16) : '') + E(a.model) + '</span>'
      : '<span class="agb-ph">Choose the model</span>') +
      (modelLeft.length ? '<span class="agb-mneed">' + E(listAnd(modelLeft.map(function (f) { return f.label; }))) + ' to fill in</span>' : '') + '</span>';
    var chips = function (list, emptyText, need) {
      if (!list.length) return '<span class="agb-ph">' + emptyText + '</span>';
      var rows = need && list.some(function (t) { return need[t]; });
      return '<span class="agb-list' + (rows ? ' is-rows' : '') + '">' + list.map(function (t) {
        var n = need && need[t];
        if (!rows) return '<span class="agb-chip" title="' + E(t) + '"><span>' + E(t) + '</span></span>';
        var l = n ? left(n).length : 0;
        return '<span class="agb-need' + (l ? ' is-warn' : '') + '" title="' + E(t) + '">' +
          '<span class="nm">' + E(t) + '</span>' +
          '<span class="via">' + (n ? E(n.kind === 'tool' ? 'Tool details' : n.name) + (l ? ' · ' + l + ' to fill in' : ' · filled in') : 'Shared by the publisher') + '</span>' +
          '<span class="act">' + (n ? (l ? '<button class="agb-connect" data-jump="' + E(n.key) + '">Fill in</button>' : '<span class="ok">✓ Done</span>') : '') + '</span>' +
        '</span>';
      }).join('') + '</span>';
    };
    var text = function (v, ph) { return v ? '<span class="agb-val">' + E(v) + '</span>' : '<span class="agb-ph">' + ph + '</span>'; };

    var toolsWarn = S && a.tools.some(function (t) { return needByTool[t] && left(needByTool[t]).length; });

    byId('agbStage').innerHTML =
      '<svg class="agb-wires" id="agbWires" aria-hidden="true"></svg>' +
      '<div class="agb-col agb-col--side">' +
        node('model', 'agb-label--model', SVG.model, 'Model', true, modelBox, { pick: true, warn: !!modelLeft.length }) +
        node('context', 'agb-label--context', SVG.context, 'Context', false, chips(a.context, 'Add context to your assistant'), { pick: true }) +
      '</div>' +
      '<div class="agb-col agb-col--mid">' +
        node('instructions', 'agb-label--instr', SVG.instructions, 'Instructions', false, '<span class="agb-mcol">' + text(a.instructions, 'Write task specific instructions') +
          (selfLeft.length ? '<span class="agb-mneed">' + E(listAnd(selfLeft.map(function (f) { return f.label; }))) + ' to fill in</span>' : '') + '</span>', { pick: true, warn: !!selfLeft.length }) +
        '<div class="agb-agent" id="agbAgent">' +
          '<span class="agb-tab" id="agbTab">' + SVG.robot + '<span>' + E(a.name) + '</span></span>' +
          '<div class="agb-card" id="agbCard">' +
            field('goal', 'Goal', a.goal, 'What should this agent achieve?') +
            '<div class="agb-rule"></div>' +
            field('backstory', 'Backstory', a.backstory, 'Who is it, and how should it behave?') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="agb-col agb-col--side">' +
        node('tools', 'agb-label--tools', SVG.tools, 'Tools', false, chips(a.tools, 'Connect actions to perform', needByTool), { pick: true, warn: toolsWarn }) +
        node('guardrails', 'agb-label--guard', SVG.guardrails, 'Guardrails', false, chips(a.guards, 'Set boundaries on what it can say'), { pick: true }) +
      '</div>';
    byId('agbStage').style.transform = B.zoom === 100 ? '' : 'scale(' + (B.zoom / 100) + ')';
    requestAnimationFrame(wires);
  }
  function field(k, label, v, ph) {
    return '<div class="agb-field"><div class="agb-field__head"><span class="agb-field__k">' + label + '</span>' +
      '<button class="agb-edit" data-pick="' + k + '" aria-label="Edit ' + label.toLowerCase() + '">' + SVG.edit + '</button></div>' +
      '<span class="agb-field__v' + (v ? '' : ' is-empty') + '" title="' + E(v) + '">' + E(v || ph) + '</span></div>';
  }

  /* Wires, measured off the laid-out nodes. */
  function wires() {
    var st = byId('agbStage'); if (!st) return;
    var scale = B.zoom / 100;
    var o = st.getBoundingClientRect();
    var rel = function (el) {
      var r = el.getBoundingClientRect();
      return { l: (r.left - o.left) / scale, r: (r.right - o.left) / scale, t: (r.top - o.top) / scale, b: (r.bottom - o.top) / scale,
        cy: ((r.top + r.bottom) / 2 - o.top) / scale, cx: ((r.left + r.right) / 2 - o.left) / scale };
    };
    var box = function (k) { var n = st.querySelector('[data-node="' + k + '"] .agb-box'); return n ? rel(n) : null; };
    var card = rel(byId('agbCard')), tab = rel(byId('agbTab'));
    var elbow = function (x1, y1, x2, y2) {
      var mx = (x1 + x2) / 2, dy = y2 - y1, r = Math.min(10, Math.abs(dy) / 2, Math.abs(x2 - x1) / 2), s = dy > 0 ? 1 : -1;
      if (Math.abs(dy) < 1) return 'M' + x1 + ' ' + y1 + 'H' + x2;
      return 'M' + x1 + ' ' + y1 + 'H' + (mx - r) + 'Q' + mx + ' ' + y1 + ' ' + mx + ' ' + (y1 + s * r) +
        'V' + (y2 - s * r) + 'Q' + mx + ' ' + y2 + ' ' + (mx + (x2 > x1 ? r : -r)) + ' ' + y2 + 'H' + x2;
    };
    var p = [];
    ['model', 'context'].forEach(function (k) { var b = box(k); if (b) p.push(elbow(b.r, b.cy, card.l, card.cy)); });
    ['tools', 'guardrails'].forEach(function (k) { var b = box(k); if (b) p.push(elbow(card.r, card.cy, b.l, b.cy)); });
    var ins = box('instructions'); if (ins) p.push('M' + ins.cx + ' ' + ins.b + 'V' + tab.t);
    byId('agbWires').innerHTML = p.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
  }

  /* ════════════════════════════════════════════════════════════════
     PICKERS
     ════════════════════════════════════════════════════════════════ */
  function closePick() { var p = byId('agbPop'); if (p) p.remove(); if (B) { B.pick = null; } }
  function openPick(kind, anchor) {
    if (B.mode !== 'edit') return;
    closePick();
    B.pick = kind;
    var a = B.a, html = '';
    var multi = function (title, all, sel) {
      return '<span class="agb-pop__h">' + title + '</span><div class="agb-pop__list">' + all.map(function (v) {
        var on = sel.indexOf(v) >= 0;
        return '<button class="agb-opt' + (on ? ' is-on' : '') + '" data-v="' + E(v) + '"><span class="box">' + (on ? '✓' : '') + '</span>' + E(v) + '</button>';
      }).join('') + '</div><div class="agb-pop__foot"><button class="agb-mini agb-mini--primary" data-pop="done">Done</button></div>';
    };
    if (kind === 'model') {
      html = '<span class="agb-pop__h">Choose the model</span><div class="agb-pop__list">' + MODELS.map(function (m) {
        var lg = logoOf(m);
        return '<button class="agb-opt' + (a.model === m ? ' is-on' : '') + '" data-v="' + E(m) + '"><span class="lg">' + (lg ? logoHTML(lg, 16) : '') + '</span>' + E(m) +
          '<svg class="tick" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      }).join('') + '</div>';
    } else if (kind === 'tools') html = multi('Tools', TOOL_CATALOG(), a.tools);
    else if (kind === 'guardrails') html = multi('Guardrails', GUARD_CATALOG(), a.guards);
    else if (kind === 'context') html = multi('Context', CONTEXT_CATALOG, a.context);
    else {
      var label = { instructions: 'Instructions', goal: 'Goal', backstory: 'Backstory' }[kind];
      html = '<span class="agb-pop__h">' + label + '</span><textarea id="agbText" placeholder="' +
        ({ instructions: 'Write task specific instructions', goal: 'What should this agent achieve?', backstory: 'Who is it, and how should it behave?' }[kind]) + '">' +
        E(a[kind]) + '</textarea><div class="agb-pop__foot"><button class="agb-mini agb-mini--ghost" data-pop="cancel">Cancel</button>' +
        '<button class="agb-mini agb-mini--primary" data-pop="save">Save</button></div>';
    }
    var pop = document.createElement('div');
    pop.className = 'agb-pop'; pop.id = 'agbPop'; pop.dataset.kind = kind;
    pop.innerHTML = html;
    byId('agbCanvas').appendChild(pop);
    var cv = byId('agbCanvas').getBoundingClientRect(), r = anchor.getBoundingClientRect();
    var left = Math.min(Math.max(8, r.left - cv.left + byId('agbCanvas').scrollLeft), cv.width - 296);
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom - cv.top + byId('agbCanvas').scrollTop + 8) + 'px';
    paintActive();
    var t = byId('agbText'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
  }
  function paintActive() {
    root.querySelectorAll('.agb-box').forEach(function (b) { b.classList.toggle('is-active', b.dataset.pick === (B && B.pick)); });
  }

  /* ════════════════════════════════════════════════════════════════
     TEST
     ════════════════════════════════════════════════════════════════ */
  var LOGS = [], filter = 'all', running = false;
  function setupOpen() { var p = byId('agbSetup'); return !!(p && p.classList.contains('is-open')); }
  function toggleSetup(on, jump) {
    var p = byId('agbSetup');
    if (!p || !B || !B.setup) return;
    on = on == null ? !p.classList.contains('is-open') : on;
    if (on) {
      byId('agbTest').classList.remove('is-open');
      if (!p.classList.contains('is-open')) byId('agbSetupBody').innerHTML =
        '<p class="agb-setup__lede">Everything this agent uses came with it. These are the details its publisher kept private; fill them in and finish setup to start using it.</p>' +
        window.mkws.formHTML(B.setup);
    }
    p.classList.toggle('is-open', on);
    root.classList.toggle('is-setup', on);
    paint();
    if (on && jump) setTimeout(function () {
      var el = p.querySelector('[data-mkws-res="' + B.setup + '|' + jump + '"]');
      if (!el) return;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      var f = [].filter.call(el.querySelectorAll('.mkws-in'), function (x) { return !x.value; })[0];
      if (f) f.focus({ preventScroll: true });
    }, 260);
  }
  function toggleTest(on) {
    var p = byId('agbTest');
    on = on == null ? !p.classList.contains('is-open') : on;
    if (on && byId('agbSetup')) { byId('agbSetup').classList.remove('is-open'); root.classList.remove('is-setup'); }
    p.classList.toggle('is-open', on);
    paint();
    if (on) setTimeout(function () { byId('agbIn').focus(); }, 200);
  }
  function now() { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function paintLogs() {
    var counts = { all: LOGS.filter(function (l) { return !l.sec; }).length };
    ['INFO', 'WARNING', 'ERROR'].forEach(function (k) { counts[k] = LOGS.filter(function (l) { return l.l === k; }).length; });
    byId('agbFilters').innerHTML = [['all', 'All'], ['INFO', 'Info'], ['WARNING', 'Warning'], ['ERROR', 'Errors']].map(function (f) {
      return '<button class="agb-badge' + (filter === f[0] ? ' is-on' : '') + '" data-filter="' + f[0] + '">' + f[1] + ' (' + counts[f[0]] + ')</button>';
    }).join('');
    byId('agbRows').innerHTML = LOGS.filter(function (l) { return l.sec ? filter === 'all' : (filter === 'all' || l.l === filter); }).map(function (l) {
      return l.sec ? '<span class="agb-log__sec">' + E(l.sec) + '</span>'
        : '<div class="agb-log__row"><span class="agb-log__time">' + l.t + '</span><span class="agb-log__lvl" data-l="' + l.l + '">' + l.l + '</span><span class="agb-log__msg">' + E(l.m) + '</span></div>';
    }).join('');
    var rows = byId('agbRows'); rows.scrollTop = rows.scrollHeight;
  }
  function run() {
    if (running) return;
    var input = byId('agbIn').value.trim();
    if (!input) { byId('agbIn').focus(); return; }
    running = true;
    byId('agbSend').disabled = true;
    var a = B.a, S = setupState();
    LOGS = []; filter = 'all';
    byId('agbLog').hidden = false;
    var out = byId('agbOut');
    out.classList.remove('is-empty');
    out.innerHTML = '<div class="agb-msg agb-msg--you">' + E(input) + '</div>';
    byId('agbIn').value = '';
    var steps = [];
    var add = function (l, m) { steps.push({ l: l, m: m }); };
    steps.push({ sec: 'SETUP' });
    add('OK', 'Agent initialised successfully');
    add('LOG', 'Loading agent definition: ' + a.name);
    if (!hasModel()) add('ERROR', 'No model selected. Choose a model to run this agent.');
    else {
      add('INFO', 'Model: ' + a.model);
      add('LOG', a.tools.length ? a.tools.length + ' tool' + (a.tools.length > 1 ? 's' : '') + ' loaded: ' + a.tools.join(', ') : 'No tools connected');
      if (a.guards.length) add('INFO', 'Guardrails on: ' + a.guards.join(', '));
      if (S) S.left.filter(function (n) { return n.kind !== 'model'; }).forEach(function (n) { add('WARNING', n.name + ' not connected. ' + (n.used || []).join(', ') + ' will skip'); });
      if (!a.instructions) add('WARNING', 'No instructions set. The agent will rely on its goal only');
      steps.push({ sec: 'RUN' });
      add('LOG', 'Calling ' + a.model);
      add('OK', 'Response ready');
    }
    var failed = !hasModel();
    var i = 0, total = steps.length;
    (function tick() {
      if (!root) { running = false; return; }
      var s = steps[i++];
      if (s.sec) LOGS.push({ sec: s.sec }); else LOGS.push({ t: now(), l: s.l, m: s.m });
      byId('agbProg').style.width = Math.round(i / total * 100) + '%';
      paintLogs();
      if (i < total) return setTimeout(tick, 320);
      running = false;
      byId('agbSend').disabled = false;
      if (failed) {
        out.insertAdjacentHTML('beforeend', '<div class="agb-msg agb-msg--agent"><b>' + E(a.name) + '</b>The test could not run: this agent has no model yet.</div>');
        return;
      }
      out.insertAdjacentHTML('beforeend', '<div class="agb-msg agb-msg--agent"><b>' + E(a.name) + '</b>' +
        E(reply(a, input)) + '</div>');
      out.scrollTop = out.scrollHeight;
      if (B.mode === 'edit') { B.tested = true; paint(); }
    })();
  }
  function reply(a, input) {
    var goal = (a.goal || 'help with this').replace(/\.$/, '');
    return 'Here is what I found for “' + input.slice(0, 80) + '”. Working to my goal (' + goal.charAt(0).toLowerCase() + goal.slice(1) +
      ')' + (a.tools.length ? ', I used ' + listAnd(a.tools.slice(0, 2)) : '') + '. Two items need a closer look, and I have drafted a short summary you can share.';
  }

  /* ════════════════════════════════════════════════════════════════
     PUBLISH — three steps, after the reference dialog
     ════════════════════════════════════════════════════════════════ */
  var CATS = ['Finance', 'HR', 'IT', 'Marketing', 'Operations', 'Sales'];
  var DOMS = ['CPG', 'Financial services', 'Insurance', 'Media', 'Pharma', 'Telco'];
  var P = null;
  function openPublish() {
    var a = B.a;
    P = { step: 1, name: a.name === 'Untitled agent' ? '' : a.name, desc: a.isDesc ? a.desc : (a.goal || ''), cat: '', doms: [],
      where: 'workspace', shareConn: false, shareModel: false, tried: false };
    var el = document.createElement('div');
    el.className = 'agp-scrim'; el.id = 'agp';
    document.body.appendChild(el);
    paintPublish();
  }
  function paintPublish() {
    var el = byId('agp'); if (!el) return;
    var a = B.a;
    var steps = [[1, 'Describe your agent'], [2, 'Choose who can use it'], [3, 'Review and publish']];
    var bad = { name: P.tried && !P.name.trim(), desc: P.tried && !P.desc.trim(), cat: P.tried && !P.cat };
    var main = '';
    if (P.step === 1) {
      main =
        '<div class="agp__f"><span class="agp__l"><span>Name <span class="req">*</span></span><small>' + P.name.length + '/100</small></span>' +
          '<input class="agp__in' + (bad.name ? ' is-bad' : '') + '" id="agpName" maxlength="100" value="' + E(P.name) + '" placeholder="Give your agent a name" />' +
          (bad.name ? '<span class="agp__err">Name must not be empty</span>' : '') + '</div>' +
        '<div class="agp__f"><span class="agp__l"><span>Description <span class="req">*</span></span></span>' +
          '<textarea class="agp__in' + (bad.desc ? ' is-bad' : '') + '" id="agpDesc" placeholder="What does this agent do? Be specific, so people know what to expect.">' + E(P.desc) + '</textarea>' +
          (bad.desc ? '<span class="agp__err">Description must not be empty</span>' : '') + '</div>' +
        '<div class="agp__f"><span class="agp__l"><span>Includes</span></span><div class="agp__chips">' +
          ['Model · ' + (hasModel() ? a.model : 'none'), a.tools.length + ' tools', a.guards.length + ' guardrails', a.context.length + ' context sources']
            .map(function (t) { return '<span class="agp__chip">' + E(t) + '</span>'; }).join('') + '</div></div>' +
        '<div class="agp__f"><span class="agp__l"><span>Category <span class="req">*</span></span></span>' +
          '<select class="agp__in' + (bad.cat ? ' is-bad' : '') + '" id="agpCat"><option value="">Select a category</option>' +
          CATS.map(function (c) { return '<option' + (P.cat === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
          (bad.cat ? '<span class="agp__err">Choose a category</span>' : '') + '</div>' +
        '<div class="agp__f"><span class="agp__l"><span>Domains</span></span><div class="agp__chips">' +
          DOMS.map(function (d) { return '<button class="agp__chip' + (P.doms.indexOf(d) >= 0 ? ' is-on' : '') + '" data-dom="' + E(d) + '">' + E(d) + '</button>'; }).join('') + '</div></div>';
    } else if (P.step === 2) {
      var conns = a.tools.length ? a.tools.slice(0, 3).join(', ') + (a.tools.length > 3 ? '…' : '') : 'none';
      main =
        '<div class="agp__f"><span class="agp__l"><span>Who can use it</span></span>' +
          '<button class="agp__radio' + (P.where === 'workspace' ? ' is-on' : '') + '" data-where="workspace"><i></i><span><b>This workspace</b><span>Everyone in Finance can find and run it under Agents.</span></span></button>' +
          '<button class="agp__radio' + (P.where === 'marketplace' ? ' is-on' : '') + '" data-where="marketplace"><i></i><span><b>Marketplace</b><span>Anyone in the organisation can find it and add it to their own workspace.</span></span></button>' +
        '</div>' +
        (P.where === 'marketplace'
          ? '<div class="agp__f"><span class="agp__l"><span>Share with people who add it</span></span>' +
              '<button class="agp__check' + (P.shareConn ? ' is-on' : '') + '" data-share="conn"><span class="box">' + (P.shareConn ? '✓' : '') + '</span><span><b>My connections</b><span>Tools it uses: ' + E(conns) + '. They run on your signed-in accounts.</span></span></button>' +
              '<button class="agp__check' + (P.shareModel ? ' is-on' : '') + '" data-share="model"><span class="box">' + (P.shareModel ? '✓' : '') + '</span><span><b>My model deployment</b><span>' + E(hasModel() ? a.model : 'No model chosen') + ', with its API key. Usage is charged to their workspace.</span></span></button>' +
              ((P.shareConn || P.shareModel)
                ? '<div class="agp__note">Your keys and sign-ins stay hidden, but everything people run through this agent goes through your accounts and can show in your logs. You can stop sharing at any time.</div>'
                : '<div class="agp__note" style="background:var(--backgrounds-card-bg-4);border-color:var(--strokes-line-1);color:var(--text-secondary)">Nothing is shared. People who add it connect their own accounts and choose a model before it can be used.</div>') +
            '</div>' : '');
    } else {
      var shared = P.where === 'marketplace' ? [P.shareConn ? 'connections' : '', P.shareModel ? 'model' : ''].filter(Boolean) : [];
      main =
        '<div class="agp__f"><span class="agp__l"><span>Review</span></span><div class="agp__sum">' +
          [['Name', P.name], ['Category', P.cat], ['Domains', P.doms.join(', ') || '—'], ['Model', hasModel() ? a.model : '—'],
           ['Tools', a.tools.length ? a.tools.join(', ') : '—'], ['Guardrails', a.guards.length ? a.guards.join(', ') : '—'],
           ['Who can use it', P.where === 'marketplace' ? 'Marketplace' : 'This workspace'],
           ['Shared', P.where === 'marketplace' ? (shared.length ? 'Your ' + shared.join(' and ') : 'Nothing') : '—']]
            .map(function (r) { return '<div><span>' + r[0] + '</span><em>' + E(r[1]) + '</em></div>'; }).join('') +
        '</div></div>';
    }
    byId('agp').innerHTML =
      '<div class="agp" role="dialog" aria-modal="true" aria-label="Publish agent">' +
        '<div class="agp__head"><b>Publish agent</b><button class="agb-x" data-agp="close" aria-label="Close">' + SVG.close + '</button></div>' +
        '<div class="agp__body">' +
          '<div class="agp__side"><div class="agp__steps">' + steps.map(function (s) {
            return '<button class="agp__step' + (P.step === s[0] ? ' is-on' : P.step > s[0] ? ' is-done' : '') + '" data-agp-step="' + s[0] + '"><i>' + (P.step > s[0] ? '✓' : s[0]) + '</i>' + s[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="agp__prev"><small>Preview</small><div class="agp__card"><div class="agp__thumb"><img src="' + markFor(B.a) + '" alt="" /></div>' +
            '<b>' + E(P.name || 'Untitled agent') + '</b><span>By Savio Govindu</span></div></div></div>' +
          '<div class="agp__main">' + main + '</div>' +
        '</div>' +
        '<div class="agp__foot">' +
          '<button class="agp__btn agp__btn--ghost" data-agp="' + (P.step === 1 ? 'close' : 'back') + '">' + (P.step === 1 ? 'Cancel' : 'Back') + '</button>' +
          '<button class="agp__btn agp__btn--primary" data-agp="next">' + (P.step === 3 ? 'Publish' : 'Next') + '</button>' +
        '</div>' +
      '</div>';
  }
  function publishNext() {
    if (P.step === 1) {
      P.tried = true;
      if (!P.name.trim() || !P.desc.trim() || !P.cat) return paintPublish();
      P.tried = false; P.step = 2; return paintPublish();
    }
    if (P.step === 2) { P.step = 3; return paintPublish(); }
    var a = B.a;
    a.name = P.name.trim(); a.desc = P.desc.trim(); a.isDesc = true; a.goal = a.goal || a.desc;
    a.tags = [P.cat.toLowerCase()];
    a.status = 'published'; a.state = 'idle'; a.updated = 'just now';
    a.published = { where: P.where, shareConn: P.shareConn, shareModel: P.shareModel };
    if (B.isNew) { AGENTS.unshift(a); B.isNew = false; }
    byId('agp').remove(); P = null;
    B.mode = 'view'; B.tested = false; B.past = []; B.future = []; B.last = snapshot(a);
    render();
    paint();
    say(a.name + (a.published.where === 'marketplace' ? ' is published to the Marketplace' : ' is published to this workspace'));
  }

  function say(msg) { if (window.mkwsSay) window.mkwsSay(msg); else if (typeof toast === 'function') toast(msg); }

  function closeBuilder() {
    if (!root) return;
    closePick();
    var r = root; root = null;
    r.classList.remove('is-shown');
    setTimeout(function () { r.remove(); if (window.mkwsPlace) window.mkwsPlace(); }, 180);
    var ref = B && B.a; B = null;
    render();
    if (ref) {
      var k = AGENTS.indexOf(ref);
      var el = k >= 0 && document.querySelector('#agGrid .ag-card[data-i="' + k + '"]');
      if (el) el.focus({ preventScroll: false });
    }
  }

  /* ════════════════════════════════════════════════════════════════
     EVENTS
     ════════════════════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    if (!root || !root.contains(e.target)) {
      /* The publish dialog sits outside the builder root. */
      var g = byId('agp');
      if (g && g.contains(e.target)) return onPublishClick(e);
      return;
    }
    var t = e.target.closest('[data-b], [data-pick], [data-jump], [data-filter], [data-pop], .agb-opt, [data-menu], [data-z]');
    var pop = byId('agbPop');
    if (pop && !pop.contains(e.target) && !(t && t.dataset.pick)) closePick();
    if (!e.target.closest('#agbMenu, [data-b="more"]')) { var m = byId('agbMenu'); if (m) m.hidden = true; }
    if (!e.target.closest('.agb-zpop, [data-b="zoom"]')) { var zp = root.querySelector('.agb-zpop'); if (zp) zp.remove(); }
    if (!t) return;
    var b = t.dataset.b;
    if (t.dataset.jump) { e.stopPropagation(); return toggleSetup(true, t.dataset.jump); }
    if (t.dataset.filter) { filter = t.dataset.filter; return paintLogs(); }
    if (t.dataset.z) { B.zoom = +t.dataset.z; var zp2 = root.querySelector('.agb-zpop'); if (zp2) zp2.remove(); return paint(); }
    if (t.dataset.menu) { byId('agbMenu').hidden = true; return menuAct(t.dataset.menu); }
    if (t.classList.contains('agb-opt')) return pickOpt(t);
    if (t.dataset.pop) return popAct(t.dataset.pop);
    if (t.dataset.pick && !b) {
      if (B.mode !== 'edit') return;
      if (byId('agbPop') && B.pick === t.dataset.pick) return closePick();
      return openPick(t.dataset.pick, t);
    }
    if (b === 'close') return closeBuilder();
    if (b === 'edit') { B.mode = 'edit'; B.tested = false; return paint(); }
    if (b === 'test') return toggleTest();
    if (b === 'test-close') return toggleTest(false);
    if (b === 'setup') return toggleSetup();
    if (b === 'setup-close') return toggleSetup(false);
    if (b === 'send') return run();
    if (b === 'publish') return openPublish();
    if (b === 'finish') return finishSetup();
    if (b === 'rename') return rename();
    if (b === 'undo' && B.past.length) { B.future.push(B.last); B.last = B.past.pop(); restore(B.last); return paint(); }
    if (b === 'redo' && B.future.length) { B.past.push(B.last); B.last = B.future.pop(); restore(B.last); return paint(); }
    if (b === 'notes') return toggleNotes();
    if (b === 'zoom') {
      var zpop = document.createElement('div'); zpop.className = 'agb-zpop';
      zpop.innerHTML = [50, 75, 100, 125, 150].map(function (z) { return '<button data-z="' + z + '" class="' + (B.zoom === z ? 'is-on' : '') + '">' + z + '%</button>'; }).join('');
      t.appendChild(zpop); return;
    }
    if (b === 'more') {
      var menu = byId('agbMenu');
      var S = setupState();
      menu.innerHTML = (B.mode === 'view' ? '<button data-menu="edit">Edit agent</button>' : '') +
        '<button data-menu="dup">Duplicate</button><button data-menu="versions">Version history</button>' +
        (S ? '<button data-menu="discard" class="is-danger">Discard from workspace</button>' : '<button data-menu="delete" class="is-danger">Delete agent</button>');
      menu.hidden = !menu.hidden; return;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!root) return;
    if (e.key === 'Escape') {
      if (byId('agp')) { byId('agp').remove(); P = null; e.stopPropagation(); return; }
      if (byId('agbPop')) { closePick(); paintActive(); e.stopPropagation(); return; }
      if (byId('agbTest').classList.contains('is-open')) { toggleTest(false); e.stopPropagation(); return; }
      if (setupOpen()) { toggleSetup(false); e.stopPropagation(); return; }
      closeBuilder(); e.stopPropagation(); return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.agb-box[data-pick]')) { e.preventDefault(); openPick(e.target.dataset.pick, e.target); }
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'agbIn') { e.preventDefault(); run(); }
    if (e.key === 'Enter' && e.target.id === 'agbName' ) { e.preventDefault(); e.target.blur(); }
  }, true);
  document.addEventListener('input', function (e) {
    if (!P) return;
    if (e.target.id === 'agpName') { P.name = e.target.value; var c = byId('agp').querySelector('.agp__l small'); if (c) c.textContent = P.name.length + '/100'; byId('agp').querySelector('.agp__card b').textContent = P.name || 'Untitled agent'; }
    if (e.target.id === 'agpDesc') P.desc = e.target.value;
  });
  document.addEventListener('change', function (e) { if (P && e.target.id === 'agpCat') P.cat = e.target.value; });
  window.addEventListener('resize', function () { if (root) wires(); });

  function onPublishClick(e) {
    var t = e.target.closest('[data-agp], [data-agp-step], [data-dom], [data-where], [data-share]');
    if (!t) { if (e.target.id === 'agp') { byId('agp').remove(); P = null; } return; }
    if (t.dataset.agp === 'close') { byId('agp').remove(); P = null; return; }
    if (t.dataset.agp === 'back') { P.step--; return paintPublish(); }
    if (t.dataset.agp === 'next') return publishNext();
    if (t.dataset.agpStep) { var s = +t.dataset.agpStep; if (s < P.step) { P.step = s; paintPublish(); } return; }
    if (t.dataset.dom) { var d = t.dataset.dom, i = P.doms.indexOf(d); i >= 0 ? P.doms.splice(i, 1) : P.doms.push(d); return paintPublish(); }
    if (t.dataset.where) { P.where = t.dataset.where; return paintPublish(); }
    if (t.dataset.share) { if (t.dataset.share === 'conn') P.shareConn = !P.shareConn; else P.shareModel = !P.shareModel; return paintPublish(); }
  }

  function pickOpt(t) {
    var kind = byId('agbPop').dataset.kind, v = t.dataset.v, a = B.a;
    if (kind === 'model') {
      a.model = v;
      closePick(); return commit();
    }
    var list = kind === 'tools' ? a.tools : kind === 'guardrails' ? a.guards : a.context;
    var i = list.indexOf(v);
    i >= 0 ? list.splice(i, 1) : list.push(v);
    t.classList.toggle('is-on', i < 0);
    t.querySelector('.box').textContent = i < 0 ? '✓' : '';
    B.past.push(B.last); B.future = []; B.last = snapshot(a); B.tested = false;
    var pop = byId('agbPop');
    paint();
    if (pop && !pop.isConnected) byId('agbCanvas').appendChild(pop);
    paintActive();
  }
  function popAct(act) {
    if (act === 'done' || act === 'cancel') { closePick(); paintActive(); return; }
    if (act === 'save') {
      var kind = byId('agbPop').dataset.kind;
      B.a[kind] = byId('agbText').value.trim();
      closePick(); commit();
    }
  }
  function rename() {
    if (B.mode !== 'edit') { B.mode = 'edit'; paint(); }
    var n = byId('agbName');
    n.contentEditable = 'true'; n.focus();
    var range = document.createRange(); range.selectNodeContents(n);
    var sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    n.onblur = function () {
      n.contentEditable = 'false';
      var v = n.textContent.trim() || 'Untitled agent';
      if (v !== B.a.name) { B.a.name = v; commit(); } else paint();
    };
  }
  function toggleNotes() {
    var h = byId('agbNotes');
    if (h.firstChild) { B.notes = h.querySelector('textarea').value; h.innerHTML = ''; }
    else h.innerHTML = '<div class="agb-notes"><b>Notes</b><textarea placeholder="Jot down what to change next time…">' + E(B.notes) + '</textarea></div>';
    byId('agbNotesBtn').classList.toggle('is-on', !!h.firstChild);
    var ta = h.querySelector('textarea'); if (ta) ta.focus();
  }
  function menuAct(k) {
    var a = B.a;
    if (k === 'edit') { B.mode = 'edit'; return paint(); }
    if (k === 'discard') { var ref = B.setup; closeBuilder(); if (window.mkws) window.mkws.discard(ref); return; }
    if (k === 'delete') {
      var i = AGENTS.indexOf(a); if (i >= 0) AGENTS.splice(i, 1);
      closeBuilder(); say(a.name + ' was deleted'); return;
    }
    if (k === 'dup') say('A copy of ' + a.name + ' is in your drafts');
    if (k === 'versions') say('Version history: v3 published 2 days ago · v2 · v1');
  }
  function finishSetup() {
    var S = setupState(); if (!S || S.left.length) return;
    var ref = B.setup;
    closeBuilder();
    window.mkws.finish(ref);
  }

  /* For the workspace bridge: a marketplace agent that still needs setup
     opens here, with what is missing marked on the nodes. */
  window.agb = {
    openSetup: function (ref) {
      var k = AGENTS.findIndex(function (a) { return a.ref === ref; });
      if (k < 0) return false;
      var a = prime(AGENTS[k]);
      a.status = 'draft';
      openBuilder(a, { mode: 'edit', setup: ref });
      if (window.mkws) window.mkws.onchange = function (r) { if (B && B.setup === r) paint(); };
      setTimeout(function () { toggleSetup(true); }, 120);
      return true;
    },
    refresh: function () { if (root && B) paint(); },
    isOpen: function () { return !!root; }
  };
})();
