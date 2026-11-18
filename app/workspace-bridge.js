/* ════════════════════════════════════════════════════════════════════
   WORKSPACE BRIDGE
   Appended to the Automations and Agents landing pages when they are
   bundled into the Marketplace app. The pages themselves are untouched:
   this script runs after theirs, reads the workspace the shell holds,
   and adds what was taken from the Marketplace to the page's own
   inventory, drawn with the page's own card.

   Adding from the Marketplace is a request. It waits in its own
   Requested category, beside the page's own tabs, while the workspace
   admins review it and the workspace policies are checked; a tracker
   shows where it stands. Once every check passes it can be added.

   Added, it is drawn as any other card, with a Marketplace tag in its
   footer, in one of two states:
     ready        the publisher shared every detail it needs. The card
                  opens the page's own detail panel, as any other.
     needs setup  the publisher kept some details private: keys, links,
                  task details. An alert icon sits beside the name;
                  opening the card asks for configuration first, and its
                  Continue leads to a form with a field per detail.
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
    '.mkws-dlg:focus{outline:none}',
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


    /* Field-level setup: one card per resource, a field per private detail */
    '.mkws-form{display:flex;flex-direction:column;gap:12px}',
    '.mkws-res{border:1px solid var(--strokes-line-1);border-radius:12px;background:var(--backgrounds-page-bg-2);overflow:hidden}',
    '.mkws-res__head{display:flex;align-items:center;gap:12px;padding:12px 14px}',
    '.mkws-res.is-done .mkws-step__ic{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.mkws-res__st{flex:none;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;color:var(--text-coloured-orange);font:500 var(--fs-caption,12px)/16px var(--font-geist)}',
    '.mkws-res.is-done .mkws-res__st{color:var(--text-coloured-green)}',
    '.mkws-res__shared{margin:-4px 0 0;padding:0 14px 12px 58px;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.mkws-res__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px;padding:12px 14px 14px;border-top:1px solid var(--strokes-line-3)}',
    '.mkws-res__grid--one{grid-template-columns:minmax(0,1fr)}',
    '.mkws-f{display:flex;flex-direction:column;gap:6px;min-width:0;margin:0}',
    '.mkws-f--wide{grid-column:1/-1}',
    '.mkws-f__l{display:flex;align-items:center;gap:6px;color:var(--text-secondary);font:500 12px/16px var(--font-geist)}',
    '.mkws-f__l .ok{margin-left:auto;display:inline-flex;color:var(--text-coloured-green)}',
    '.mkws-f__l .ok[hidden]{display:none}',
    '.mkws-why{padding:0 5px;border-radius:4px;border:1px solid var(--strokes-line-1);color:var(--text-teritiary);font:400 10px/14px var(--font-geist)}',
    '.mkws-why--secret{border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.mkws-in{display:block;width:100%;height:34px;margin:0;padding:0 10px;box-sizing:border-box;border-radius:8px;background:var(--backgrounds-type-default-bg-1);',
    '  border:1px solid var(--strokes-type-default);color:var(--text-primary);font:400 13px/18px var(--font-geist);letter-spacing:-.2px}',
    'textarea.mkws-in{height:64px;padding:8px 10px;resize:vertical}',
    '.mkws-in::placeholder{color:var(--text-teritiary);opacity:1}',
    '.mkws-in:focus{outline:none;border-color:var(--strokes-type-focus)}',
    '.mkws-up{width:100%;height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:8px;cursor:pointer;background:none;',
    '  border:1px dashed var(--strokes-line-1) !important;color:var(--text-secondary) !important;font:500 12px/16px var(--font-geist) !important}',
    '.mkws-up:hover{border-color:var(--strokes-card-selected) !important;color:var(--text-primary) !important}',
    '.mkws-up.is-set{justify-content:flex-start;padding:0 10px;border-style:solid !important;color:var(--text-coloured-green) !important}',

    /* Requested from the Marketplace: its own category, with a tracker */
    '.mkreq-on > :not(.cq-page__bar):not(#mkreqPane){display:none !important}',
    '.mkreq-on .cq-page__bar .cq-search,.mkreq-on .cq-page__bar #newBtn,.mkreq-on .cq-page__bar #newWrap{visibility:hidden}',
    'body.mkreq-body .cq-page__sidebar{display:none}',
    '.mkreq-pane{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:20px;padding:24px}',
    '.mkreq-pane[hidden]{display:none}',
    '.mkreq-head h2{margin:0;color:var(--text-primary)}',
    '.mkreq-head p{margin:4px 0 0;max-width:720px;color:var(--text-secondary)}',
    '.mkreq-list{display:flex;flex-direction:column;gap:10px}',
    '.mkreq-row{width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) minmax(220px,280px) 16px;align-items:center;column-gap:20px;',
    '  padding:16px 20px;border-radius:12px;text-align:left;cursor:pointer;font:inherit;color:inherit;',
    '  background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-card-default);',
    '  transition:border-color .15s ease,box-shadow .2s ease,transform .2s ease}',
    '.mkreq-row:hover{border-color:var(--strokes-card-selected);transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.18)}',
    '.mkreq-row:focus-visible{outline:2px solid var(--strokes-type-focus);outline-offset:2px}',
    '@media (max-width:900px){.mkreq-row{grid-template-columns:40px minmax(0,1fr) 16px}.mkreq-row .mkreq-mini{display:none}}',
    '.mkreq-row .mkreq-mark{width:40px;height:40px;border-radius:10px}',
    '.mkreq-row .mkreq-id{gap:3px}',
    '.mkreq-row .mkreq-id .mkreq-pill{align-self:flex-start;height:22px;margin-bottom:6px;padding:0 8px;font-size:11px}',
    '.mkreq-mark{width:36px;height:36px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.mkreq-id{display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.mkreq-id .t{color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkreq-id .s{color:var(--text-teritiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mkreq-mini{display:flex;flex-direction:column;gap:6px;min-width:0}',
    '.mkreq-mini .l{color:var(--text-secondary);font:400 12px/16px var(--font-geist)}',
    '.mkreq-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}',
    '.mkreq-bars i{height:4px;border-radius:2px;background:var(--backgrounds-card-bg-4)}',
    '.mkreq-bars i.is-done{background:var(--text-coloured-green)}',
    '.mkreq-bars i.is-wait{background:var(--text-coloured-orange)}',
    '.mkreq-pill.is-wait,.mkreq-tag.is-wait{background:var(--backgrounds-badge-orange);border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.is-wait > .mkreq-dot{border-color:var(--strokes-colour-orange);background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.mkreq-bars i.is-now{background:linear-gradient(90deg,var(--backgrounds-card-bg-4) 0,var(--text-coloured-blue) 50%,var(--backgrounds-card-bg-4) 100%);background-size:200% 100%;animation:mkreq-run 1.4s linear infinite}',
    '@keyframes mkreq-run{from{background-position:100% 0}to{background-position:-100% 0}}',
    '.mkreq-pill{justify-self:start;height:24px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border-radius:12px;white-space:nowrap;',
    '  background:var(--backgrounds-badge-blue);border:1px solid var(--strokes-colour-blue);color:var(--text-coloured-blue);font:500 12px/16px var(--font-geist)}',
    '.mkreq-pill.is-ready{background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',
    '.mkreq-chev{color:var(--text-teritiary);display:inline-flex}',
    '.mkreq-spin{width:10px;height:10px;flex:none;border-radius:50%;border:1.6px solid currentColor;border-right-color:transparent;animation:mkreq-rot .8s linear infinite}',
    '@keyframes mkreq-rot{to{transform:rotate(360deg)}}',
    '.mkreq-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:64px 24px;border:1px dashed var(--strokes-line-1);border-radius:12px;text-align:center;color:var(--text-secondary)}',
    '.mkreq-empty .cq-btn{height:36px}',
    /* The tracker */
    '.mkreq-panel{z-index:240;font-family:var(--font-geist);color:var(--text-primary);padding:0}',
    ':where(.mkreq-panel) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}',
    '.mkreq-panel .cq-panel__section{gap:12px}',
    '.mkreq-p__bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:16px 16px 0}',
    '.mkreq-p__x{width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-secondary)}',
    '.mkreq-p__x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.mkreq-p__title{display:flex;align-items:center;gap:12px;min-width:0}',
    '.mkreq-p__acts{display:flex;gap:8px}',
    '.mkreq-p__acts .cq-btn{height:36px}',
    '.mkreq-p__acts .cq-btn--primary{flex:1 1 auto;justify-content:center}',
    '.mkreq-row.is-sel{border-color:var(--strokes-card-selected);box-shadow:0 0 0 1px var(--strokes-card-selected)}',
    '.mkreq-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-line-1)}',
    '.mkreq-item .mkreq-id{flex:1 1 auto}',
    '.mkreq-steps{display:flex;flex-direction:column;margin:0;padding:0;list-style:none}',
    '.mkreq-step{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);column-gap:12px;padding-bottom:18px}',
    '.mkreq-step:last-child{padding-bottom:0}',
    '.mkreq-step::before{content:"";position:absolute;left:11px;top:28px;bottom:4px;width:2px;border-radius:1px;background:var(--strokes-line-1)}',
    '.mkreq-step:last-child::before{display:none}',
    '.mkreq-step.is-done::before{background:var(--strokes-colour-green)}',
    '.mkreq-dot{width:24px;height:24px;box-sizing:border-box;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;',
    '  border:1.5px solid var(--strokes-line-1);background:var(--backgrounds-card-bg-2);color:var(--text-teritiary);font:500 11px/1 var(--font-geist)}',
    '.is-done > .mkreq-dot{border-color:var(--strokes-colour-green);background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.is-now > .mkreq-dot{border-color:var(--strokes-colour-blue);background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.mkreq-step__b{display:flex;flex-direction:column;gap:2px;min-width:0;padding-top:2px}',
    '.mkreq-step__t{display:flex;align-items:center;gap:8px;color:var(--text-primary)}',
    '.is-todo .mkreq-step__t{color:var(--text-teritiary)}',
    '.mkreq-step__s{color:var(--text-secondary)}',
    '.mkreq-tag{height:20px;display:inline-flex;align-items:center;gap:5px;padding:0 7px;border-radius:10px;font:500 11px/1 var(--font-geist);',
    '  background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.mkreq-tag.is-ok{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.mkreq-checks{margin:8px 0 0;padding:8px 10px;list-style:none;display:flex;flex-direction:column;gap:6px;border-radius:10px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-line-3)}',
    '.mkreq-checks li{display:grid;grid-template-columns:16px minmax(0,1fr);gap:8px;align-items:start;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.mkreq-checks li b{display:block;font-weight:500;color:var(--text-secondary)}',
    '.mkreq-checks li.is-ok{color:var(--text-secondary)}',
    '.mkreq-checks li.is-ok b{color:var(--text-primary)}',
    '.mkreq-checks .ci{width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;margin-top:0}',
    '.mkreq-checks li.is-ok .ci{color:var(--text-coloured-green)}',
    '.mkreq-checks li.is-now .ci{color:var(--text-coloured-blue)}',
    '.mkreq-checks .ci i{width:8px;height:8px;border-radius:50%;border:1.5px solid var(--strokes-line-1)}',

    /* A toast for the page that has none of its own */
    /* Notification tidbit · design system "Single line, Button=No" */
    '.mkws-tidbit{position:fixed;top:64px;right:20px;z-index:400;width:380px;max-width:calc(100vw - 40px);',
    '  display:flex;align-items:center;gap:8px;padding:12px;border-radius:12px;',
    '  background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-card-default);border-bottom:0;',
    '  box-shadow:0 4px 8px rgba(0,0,0,.5),0 12px 28px rgba(0,0,0,.35);',
    '  opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .18s ease,transform .22s cubic-bezier(.2,.8,.2,1)}',
    ':root[data-mode="light"] .mkws-tidbit{box-shadow:0 4px 8px rgba(18,18,18,.32)}',
    '.mkws-tidbit.is-shown{opacity:1;transform:none;pointer-events:auto}',
    '.mkws-tidbit__ic{position:relative;flex:none;width:20px;height:20px}',
    '.mkws-tidbit__ic img{position:absolute;display:block}',
    '.mkws-tidbit__ic .v{left:2.5px;top:2.5px}',
    '.mkws-tidbit__ic .t{left:5px;top:5px}',
    '.mkws-tidbit__text{flex:1 1 auto;min-width:0;color:var(--text-primary);font:400 14px/20px var(--font-geist);letter-spacing:-.56px}',
    '.mkws-tidbit__close{flex:none;padding:4px;border-radius:6px;background:none;border:0;cursor:pointer;display:inline-flex}',
    '.mkws-tidbit__close:hover{background:var(--backgrounds-card-bg-4)}',
    '.mkws-tidbit__close img{display:block}',
    '@media (prefers-reduced-motion: reduce){.mkws-tidbit{transition:none;transform:none}}',
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
  /* Notifications are the design system's single-line tidbit, top right:
     the success mark, the line, and a close at the end. */
  var TIDBIT_IC = /*TIDBIT_IC*/{};
  function hideSay() {
    var t = byId('mkwsToast');
    clearTimeout(tT);
    if (t) t.classList.remove('is-shown');
  }
  function say(msg) {
    var t = byId('mkwsToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mkwsToast'; t.className = 'mkws-tidbit'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
      t.addEventListener('click', function (e) { if (e.target.closest('[data-say-close]')) hideSay(); });
      t.addEventListener('mouseenter', function () { clearTimeout(tT); });
      t.addEventListener('mouseleave', function () { tT = setTimeout(hideSay, 2000); });
    }
    t.innerHTML =
      '<span class="mkws-tidbit__ic"><img class="v" src="' + TIDBIT_IC.vector + '" width="15" height="15" alt="" />' +
        '<img class="t" src="' + TIDBIT_IC.tick + '" width="10" height="10" alt="" /></span>' +
      '<span class="mkws-tidbit__text">' + E(msg) + '</span>' +
      '<button type="button" class="mkws-tidbit__close" data-say-close aria-label="Close notification">' +
        '<img src="' + TIDBIT_IC.close + '" width="16" height="16" alt="" /></button>';
    placeSay();
    requestAnimationFrame(function () { t.classList.add('is-shown'); });
    clearTimeout(tT);
    tT = setTimeout(hideSay, 4000);
  }
  /* Top right, clear of whatever action bar is on screen: the page's own
     bar, or the builder's while it is open. */
  function placeSay() {
    var t = byId('mkwsToast'); if (!t) return;
    var builder = document.querySelector('.agb-bar');
    var bar = builder || document.querySelector('.cq-page__bar');
    t.style.top = bar ? Math.round(bar.getBoundingClientRect().bottom + 12) + 'px' : '';
  }
  /* A click anywhere else is the reader moving on: the notice steps aside,
     so it can never sit on top of the menu or button they reach for. */
  document.addEventListener('pointerdown', function (e) {
    var t = byId('mkwsToast');
    if (t && t.classList.contains('is-shown') && !t.contains(e.target)) hideSay();
  }, true);
  window.mkwsSay = say;
  window.mkwsPlace = placeSay;
  /* The Agents page's own notices take the same form. */
  if (PAGE === 'agent' && typeof toast === 'function') toast = function (msg) { say(msg); };

  /* ── Small helpers ── */
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function cfg(w) { if (!w.config) w.config = { done: {} }; if (!w.config.done) w.config.done = {}; return w.config; }
  /* A need is one resource, with the details its publisher kept private. */
  function fkey(n, f) { return n.key + '|' + f.k; }
  function needLeft(w, n) { var c = cfg(w); return (n.fields || []).filter(function (f) { return !c.done[fkey(n, f)]; }); }
  function needDone(w, n) { return !needLeft(w, n).length; }
  function remaining(w) { return (w.needs || []).filter(function (n) { return !needDone(w, n); }); }
  function totals(w) {
    var t = 0, l = 0;
    (w.needs || []).forEach(function (n) { t += (n.fields || []).length; l += needLeft(w, n).length; });
    return { total: t, left: l, done: t - l };
  }
  function wsByRef(ref) { for (var i = 0; i < WS.length; i++) if (WS[i].ref === ref) return WS[i]; return null; }
  /* In the workspace: added, past review. Requested: still on its way. */
  function mine() { return WS.filter(function (w) { return w.kind === PAGE && (w.status || 'added') === 'added'; }).sort(function (a, b) { return (b.added || 0) - (a.added || 0); }); }
  function reqs() { return WS.filter(function (w) { return w.kind === PAGE && w.status === 'requested'; }).sort(function (a, b) { return (b.requestedAt || 0) - (a.requestedAt || 0); }); }
  function needLabel(n) { return n.name; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function listAnd(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
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
     THE FORM — a card per resource, a field per private detail
     ════════════════════════════════════════════════════════════════ */
  var PH = {
    api_key: 'sk-…', base_url: 'https://your-resource.openai.azure.com', endpoint: 'https://api.example.com/v1',
    tenant_id: '00000000-0000-0000-0000-000000000000', client_id: 'Application (client) ID', client_secret: 'Client secret value',
    site_id: 'contoso.sharepoint.com,…', drive_id: 'b!…', bearer_token: 'Paste a token', connection_id: 'Your connection',
    connection_payload: '{ "query": "…" }', llm_connection_id: 'Your LLM connection', document_path: '/Shared Documents/…',
    bucket_name: 'my-bucket', bucket_url: 'https://my-bucket.s3.amazonaws.com', access_key_id: 'AKIA…', secret_access_key: 'Secret access key',
    custom_variables: 'KEY=value', task_description: 'What should it do, step by step?', expected_output: 'What a good result looks like',
    guardrail_content: 'The rules it enforces'
  };
  var LONG = { task_description: 1, expected_output: 1, guardrail_content: 1, custom_tool_code: 1, connection_payload: 1, agent_backstory: 1 };
  var UPLOAD = { knowledge_base: 'knowledge-base.zip', files: 'reference-docs.zip' };
  var KIND_IC = { integration: IC.plug, model: IC.brain, tool: IC.tool, agent: IC.agent, skill: IC.skill, guardrail: IC.guard };
  var KIND_ORDER = [['agent', 'AGENTS'], ['tool', 'TOOLS'], ['integration', 'INTEGRATIONS'], ['model', 'MODELS'], ['skill', 'SKILLS'], ['guardrail', 'GUARDRAILS']];

  function fieldHTML(w, n, f) {
    var id = w.ref + '|' + n.key + '|' + f.k;
    var v = cfg(w).done[fkey(n, f)] || '';
    var why = f.why ? '<span class="mkws-why' + (f.why === 'Secret' ? ' mkws-why--secret' : '') + '">' + E(f.why) + '</span>' : '';
    var ok = '<span class="ok"' + (v ? '' : ' hidden') + '>' + IC.check + '</span>';
    var ctl;
    if (f.why === 'Data') ctl = '<button type="button" class="mkws-up' + (v ? ' is-set' : '') + '" data-mkws-upload="' + E(id) + '">' + (v ? IC.check + E(v) : 'Upload files') + '</button>';
    else if (LONG[f.k]) ctl = '<textarea class="mkws-in" data-mkws-field="' + E(id) + '" placeholder="' + E(PH[f.k] || '') + '">' + E(v) + '</textarea>';
    else ctl = '<input class="mkws-in" type="' + (f.why === 'Secret' ? 'password' : 'text') + '" data-mkws-field="' + E(id) + '" value="' + E(v) + '" placeholder="' +
      E(PH[f.k] || 'Enter ' + f.label.toLowerCase()) + '" autocomplete="off" spellcheck="false" />';
    return '<label class="mkws-f' + (LONG[f.k] ? ' mkws-f--wide' : '') + '"><span class="mkws-f__l">' + E(f.label) + why + ok + '</span>' + ctl + '</label>';
  }
  function stText(left, tot) { return left ? left + ' of ' + tot + ' to fill in' : IC.check + 'Done'; }
  function resHTML(w, n, compact) {
    var left = needLeft(w, n).length;
    var sub = n.type + (n.used && n.used.length ? ' · used by ' + n.used.join(', ') : '') + (n.on && n.on.length ? ' · runs on ' + n.on.join(', ') : '');
    return '<div class="mkws-res' + (left ? '' : ' is-done') + '" data-mkws-res="' + E(w.ref + '|' + n.key) + '">' +
      '<div class="mkws-res__head"><span class="mkws-step__ic">' + (KIND_IC[n.kind] || IC.plug) + '</span>' +
        '<span class="mkws-step__id"><span class="t cq-body2-med">' + E(n.name) + '</span><span class="s cq-caption-reg">' + E(sub) + '</span></span>' +
        '<span class="mkws-res__st" data-mkws-st>' + stText(left, n.fields.length) + '</span></div>' +
      (n.sharedFields && n.sharedFields.length ? '<p class="mkws-res__shared">Shared by the publisher: ' + E(n.sharedFields.join(', ')) + '</p>' : '') +
      '<div class="mkws-res__grid' + (compact ? ' mkws-res__grid--one' : '') + '">' + n.fields.map(function (f) { return fieldHTML(w, n, f); }).join('') + '</div>' +
    '</div>';
  }
  function formHTML(w, compact) {
    return '<div class="mkws-form" data-mkws-form="' + E(w.ref) + '">' + (w.needs || []).map(function (n) { return resHTML(w, n, compact); }).join('') + '</div>';
  }
  function progHTML(T) {
    return '<span class="mkws-prog__bar"><i style="width:' + (T.total ? Math.round(T.done / T.total * 100) : 100) + '%"></i></span>' + T.done + ' of ' + T.total + ' filled in';
  }
  function noteHTML(w) {
    var T = totals(w), left = remaining(w);
    return T.left
      ? '<div class="mkws-note cq-caption-reg">' + IC.warn + '<span>' + plural(T.left, 'detail') + ' left in ' + listAnd(left.map(function (n) { return n.name; })) +
        '. Until they are filled in it stays in your workspace as a draft and cannot run.</span></div>'
      : '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>Every detail is filled in. Finish setup to start using it.</span></div>';
  }
  /* Typing never repaints: only the counts and ticks around the field move. */
  function patch(w) {
    (w.needs || []).forEach(function (n) {
      var el = document.querySelector('[data-mkws-res="' + w.ref + '|' + n.key + '"]');
      if (!el) return;
      var left = needLeft(w, n).length;
      el.classList.toggle('is-done', !left);
      el.querySelector('[data-mkws-st]').innerHTML = stText(left, n.fields.length);
      var ic = el.querySelector('.mkws-step__ic');
      if (ic) ic.innerHTML = left ? (KIND_IC[n.kind] || IC.plug) : IC.check;
    });
    var T = totals(w);
    document.querySelectorAll('[data-mkws-prog="' + w.ref + '"]').forEach(function (el) { el.innerHTML = progHTML(T); });
    document.querySelectorAll('[data-mkws-finish="' + w.ref + '"]').forEach(function (b) { b.disabled = T.left > 0; });
    document.querySelectorAll('[data-mkws-left="' + w.ref + '"]').forEach(function (el) { el.innerHTML = noteHTML(w); });
    if (window.mkws && typeof window.mkws.onchange === 'function') window.mkws.onchange(w.ref);
  }
  function setField(id, v, el) {
    var p = id.split('|'), w = wsByRef(p[0]);
    if (!w) return;
    var k = p[1] + '|' + p[2];
    if (v) cfg(w).done[k] = v; else delete cfg(w).done[k];
    var ok = el && el.closest('.mkws-f') && el.closest('.mkws-f').querySelector('.ok');
    if (ok) ok.hidden = !v;
    saveQuiet(w);
    patch(w);
  }

  /* ── The panel section, ready items only ── */
  function paintSec(w) {
    var sec = byId('mkwsSec');
    if (!sec) return;
    if (!w || !w.ready) { sec.hidden = true; sec.innerHTML = ''; return; }
    sec.hidden = false;
    var inc = w.included || [];
    sec.innerHTML =
      '<span class="cq-section-label cq-caption-med">FROM THE MARKETPLACE</span>' +
      '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>' +
        (w.needs && w.needs.length ? 'Every detail is filled in. Ready to use.' : 'Ready to use. The publisher shared every detail it needs.') + '</span></div>' +
      '<div>' +
        '<div class="mkws-kv"><span class="k">Publisher</span><span class="v">' + E(w.publisher) + '</span></div>' +
        (inc.length ? '<div class="mkws-kv"><span class="k">Came with</span><span class="v">' + E(plural(inc.length, 'resource')) + '</span></div>' : '') +
        ((w.needs || []).length ? '<div class="mkws-kv"><span class="k">Filled in by you</span><span class="v">' + E(w.needs.map(function (n) { return n.name; }).join(', ')) + '</span></div>' : '') +
        ((w.secrets || []).length ? '<div class="mkws-kv"><span class="k">Publisher’s keys</span><span class="v">' + E(w.secrets.join(', ')) + '</span></div>' : '') +
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
    var T = totals(w);
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
          '<p class="mkws-dlg__text cq-body2-reg" id="mkwsDlgD"><b>' + E(w.name) + '</b> came with everything it uses. ' +
            E(w.publisher) + ' kept some details private when publishing it, so fill in your own before the first run.</p>' +
        '</div>' +
        '<span class="mkws-dlg__label cq-caption-med">TO FILL IN · ' + T.left + ' OF ' + T.total + ' DETAILS</span>' +
        '<div class="mkws-steps">' + needs.map(function (n) {
          var left = needLeft(w, n), done = !left.length;
          return '<div class="mkws-step' + (done ? ' is-done' : '') + '">' +
            '<span class="mkws-step__ic">' + (done ? IC.check : KIND_IC[n.kind] || IC.plug) + '</span>' +
            '<span class="mkws-step__id"><span class="t cq-body2-med">' + E(n.name) + '</span>' +
            '<span class="s cq-caption-reg">' + E(done ? n.type + ' · filled in' : left.map(function (f) { return f.label; }).join(', ')) + '</span></span>' +
            (done ? '<span class="mkws-ok">' + IC.check + 'Done</span>' : '<span class="mkws-res__st">' + left.length + ' to fill in</span>') +
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
    var T = totals(w);
    var pills = function (arr, ic) {
      return '<div class="mkws-pills">' + arr.map(function (n) { return '<span class="mkws-pill2">' + ic + E(n) + '</span>'; }).join('') + '</div>';
    };
    var inc = (w.included || []);
    var groups = KIND_ORDER.map(function (k) {
      var list = (w.needs || []).filter(function (n) { return n.kind === k[0]; });
      return list.length ? '<div class="mkws-cfg__group"><span class="mkws-cfg__label cq-caption-med">' + k[1] + '</span>' +
        '<div class="mkws-form">' + list.map(function (n) { return resHTML(w, n); }).join('') + '</div></div>' : '';
    }).join('');

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
        '<span class="mkws-prog cq-caption-reg" data-mkws-prog="' + E(w.ref) + '">' + progHTML(T) + '</span>' +
        '<button type="button" class="cq-btn cq-btn--ghost" data-mkws-discard="' + E(w.ref) + '">Discard</button>' +
        '<button type="button" class="cq-btn cq-btn--primary" data-mkws-finish="' + E(w.ref) + '"' + (T.left ? ' disabled' : '') + '>Finish setup</button>' +
      '</div>' +
      '<div class="mkws-cfg__body">' +
        '<div class="mkws-cfg__grid">' +
          '<div class="mkws-cfg__main">' +
            '<div>' +
              '<h2 class="mkws-cfg__h cq-subhead1-med">Fill in what the publisher kept private</h2>' +
              '<p class="mkws-cfg__lede cq-body2-reg">Every agent, tool, integration and model this ' + WORD + ' uses came with it. ' +
                'Only the details below were kept private when it was published. Add your own and it can be used straight away.</p>' +
            '</div>' +
            '<div data-mkws-left="' + E(w.ref) + '">' + noteHTML(w) + '</div>' +
            groups +
          '</div>' +
          '<aside class="mkws-side">' +
            '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">ABOUT</span><p class="cq-body2-reg">' + E(w.desc) + '</p></div>' +
            (inc.length ? '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">CAME WITH IT · ' + inc.length + '</span>' +
              pills(inc.map(function (r) { return r.name; }), IC.check) + '</div>' : '') +
            ((w.secrets || []).length ? '<div class="mkws-side__sec"><span class="mkws-side__label cq-caption-med">RUNS ON THE PUBLISHER’S KEYS</span>' + pills(w.secrets, IC.plug) + '</div>' : '') +
          '</aside>' +
        '</div>' +
      '</div>';
    if (!el.contains(document.activeElement)) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
  }

  /* ── Changes go to the shell, which keeps them for every page ── */
  function save(w) { post({ cqWsUpdate: w }); lastJSON = ''; }
  /* The shell echoes the change back; nothing on screen needs redrawing. */
  function saveQuiet(w) { post({ cqWsUpdate: w }); lastJSON = JSON.stringify(WS); }
  function discard(ref, msg) {
    var w = wsByRef(ref);
    WS = WS.filter(function (x) { return x.ref !== ref; });
    post({ cqWsRemove: ref });
    closeDialog(true);
    if (cfgRef === ref) closeConfig();
    if (openRef === ref) closePanel();
    sync();
    if (w) say(msg || w.name + ' was discarded from this workspace');
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
    if ((t = e.target.closest('[data-mkws-upload]'))) {
      e.stopPropagation(); e.preventDefault();
      if (t.classList.contains('is-busy')) return;
      var id = t.getAttribute('data-mkws-upload');
      t.classList.add('is-busy'); t.textContent = 'Uploading…';
      setTimeout(function () {
        var name = UPLOAD[id.split('|')[2]] || 'files.zip';
        t.classList.remove('is-busy'); t.classList.add('is-set'); t.innerHTML = IC.check + E(name);
        setField(id, name, t);
      }, 700);
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
  document.addEventListener('input', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-mkws-field]');
    if (t) setField(t.getAttribute('data-mkws-field'), t.value.trim(), t);
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
        paintReqs(true);
        if (trackRef) { var tw = wsByRef(trackRef); if (tw && tw.status === 'requested') paintTrack(tw); else closeTrack(true); }
        if (cfgRef) { var w = wsByRef(cfgRef); if (w && !w.ready) paintConfig(w); else if (!w) closeConfig(); }
      }
    }
    if (typeof d.cqFocus === 'string') {
      var ref = d.cqFocus;
      if (ref.indexOf('req:') === 0) setTimeout(function () { reqShow(true); openTrack(ref.slice(4)); }, 120);
      else setTimeout(function () { focusOn(ref); }, 120);
    }
  });
  /* What the agent builder needs to drive setup from its own canvas. */
  window.mkws = {
    get: wsByRef,
    remaining: function (ref) { var w = wsByRef(ref); return w ? remaining(w) : []; },
    left: function (ref, n) { var w = wsByRef(ref); return w ? needLeft(w, n) : []; },
    totals: function (ref) { var w = wsByRef(ref); return w ? totals(w) : { total: 0, left: 0, done: 0 }; },
    formHTML: function (ref) { var w = wsByRef(ref); return w ? formHTML(w, true) : ''; },
    onchange: null,
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

  /* ════════════════════════════════════════════════════════════════
     REQUESTED — what was asked for from the Marketplace. It sits in a
     category of its own until it clears admin review and the workspace
     policies; only then can it be added.
     ════════════════════════════════════════════════════════════════ */
  var ADMIN_MS = 6000, CHECK_MS = 1200;
  var ADMINS = ['Priya Nair', 'Arjun Mehta'];
  var STEP_NAMES = ['Requested', 'Admin review', 'Workspace policy check', 'Ready to add to workspace'];
  var STAGE_LABEL = ['Requested', 'Waiting for admin review', 'Checking workspace policies', 'Ready to add'];
  var CLOCK = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.8V8l2.2 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function checksOf(w) {
    var c = [['Publisher verified', w.publisher + ' is a verified Marketplace publisher']];
    if (w.shared && w.shared.length) c.push(['Integrations allowed', listAnd(w.shared) + (w.shared.length === 1 ? ' is' : ' are') + ' on the workspace allow-list']);
    if (w.model) c.push(['Model allowed', w.model + ' is approved for use in this workspace']);
    c.push(['Credential policy', w.secrets && w.secrets.length
      ? 'Publisher keys in ' + listAnd(w.secrets) + ' are allowed by the credential policy'
      : 'No publisher keys or sign-ins included']);
    c.push(['Data residency', 'Runs in your workspace region, EU West']);
    return c;
  }
  /* A review takes people, and people take time: a request waits at admin
     review until someone approves it (approvedAt). The policy checks run
     from that moment. */
  var REVIEW_MS = 4000;   /* the prototype's stand-in for a review that takes days */
  function approvedAt(w) { return w.approvedAt || (w.requestedAt || Date.now()) + REVIEW_MS; }
  function stageOf(w) {
    var n = checksOf(w).length;
    if (Date.now() < approvedAt(w)) return { step: 1, checks: 0, n: n, waiting: true };
    var k = Math.floor((Date.now() - approvedAt(w)) / CHECK_MS);
    return k < n ? { step: 2, checks: k, n: n } : { step: 3, checks: n, n: n };
  }
  function clock(t) { return new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  var SPIN = '<span class="mkreq-spin" aria-hidden="true"></span>';
  var CHEV = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var REQ_IC = '<svg class="cq-ic" width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><use href="#' + (PAGE === 'agent' ? 'ic-pp_agent' : 'ic-pp_automation') + '"/></svg>';

  var seg = byId(PAGE === 'agent' ? 'srcTabs' : 'auTabs');
  var col = seg && seg.closest('.cq-page__col');
  var reqOn = false, lastReqSig = '', trackRef = null, trackFocus = null;
  if (seg && col) {
    var rb = document.createElement('button');
    rb.setAttribute('role', 'tab'); rb.setAttribute('aria-selected', 'false'); rb.setAttribute('data-mkreq', '');
    rb.innerHTML = 'Requested <span class="' + (PAGE === 'agent' ? 'seg-count' : 'au-seg-count') + '" id="mkreqN">0</span>';
    seg.appendChild(rb);
    var pane = document.createElement('div');
    pane.id = 'mkreqPane'; pane.className = 'mkreq-pane cq-scroll-y'; pane.hidden = true; pane.setAttribute('role', 'tabpanel');
    col.appendChild(pane);
    setTimeout(segSync, 0);
  }
  function segSync() { if (seg && typeof cqSegSync === 'function') cqSegSync(seg); }
  function reqShow(on) {
    if (!seg || !col) return;
    reqOn = on;
    col.classList.toggle('mkreq-on', on);
    document.body.classList.toggle('mkreq-body', on);
    byId('mkreqPane').hidden = !on;
    var mine2 = seg.querySelector('[data-mkreq]');
    if (on) {
      seg.querySelectorAll(':scope > button').forEach(function (b) {
        var me = b === mine2; b.classList.toggle('is-active', me); b.setAttribute('aria-selected', String(me));
      });
      if (typeof closePanel === 'function') closePanel();
      paintReqs(true);
    } else {
      mine2.classList.remove('is-active'); mine2.setAttribute('aria-selected', 'false');
      closeTrack(true);
    }
    segSync();
  }
  function bars(s) {
    return '<span class="mkreq-bars" aria-hidden="true">' + [0, 1, 2, 3].map(function (i) {
      var done = i < s.step || s.step === 3;
      return '<i class="' + (done ? 'is-done' : i === s.step ? (s.waiting ? 'is-wait' : 'is-now') : '') + '"></i>';
    }).join('') + '</span>';
  }
  function pillHTML(s) {
    return s.step === 3 ? '<span class="mkreq-pill is-ready">' + IC.check + 'Ready to add</span>'
      : s.waiting ? '<span class="mkreq-pill is-wait">' + CLOCK + STAGE_LABEL[s.step] + '</span>'
      : '<span class="mkreq-pill">' + SPIN + STAGE_LABEL[s.step] + '</span>';
  }
  function reqRow(w) {
    var s = stageOf(w);
    return '<button type="button" class="mkreq-row" data-mkreq-open="' + E(w.ref) + '">' +
      '<span class="mkreq-mark">' + REQ_IC + '</span>' +
      '<span class="mkreq-id">' + pillHTML(s) + '<span class="t cq-body1-med">' + E(w.name) + '</span>' +
        '<span class="s cq-caption-reg">Published by ' + E(w.publisher) + ' · requested ' + E(when(w.requestedAt)) + '</span></span>' +
      '<span class="mkreq-mini">' + bars(s) + '<span class="l">Step ' + Math.min(s.step + 1, 4) + ' of 4 · ' + E(STEP_NAMES[s.step]) + '</span></span>' +
      '<span class="mkreq-chev">' + CHEV + '</span>' +
    '</button>';
  }
  function reqSig() { return reqs().map(function (w) { var s = stageOf(w); return w.ref + s.step + '.' + s.checks; }).join('|') + (reqOn ? '+' : '-'); }
  function paintReqs(force) {
    var list = reqs();
    var n = byId('mkreqN');
    if (n && n.textContent !== String(list.length)) { n.textContent = list.length; segSync(); }
    var sig = reqSig();
    if (!force && sig === lastReqSig) return;
    lastReqSig = sig;
    var p = byId('mkreqPane');
    if (!reqOn || !p) return;
    var focused = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-mkreq-open');
    p.innerHTML =
      '<div class="mkreq-head"><h2 class="cq-subhead1-med">Requested from the Marketplace</h2>' +
        '<p class="cq-body2-reg">Each ' + WORD + ' you request is sent to your workspace admins for review, then checked against your workspace policies. ' +
        'Once every check passes, it is ready to be added to your workspace.</p></div>' +
      (list.length ? '<div class="mkreq-list">' + list.map(reqRow).join('') + '</div>'
        : '<div class="mkreq-empty"><span class="cq-body1-med" style="color:var(--text-primary)">No requests yet</span>' +
          '<span class="cq-body2-reg">' + (PAGE === 'agent' ? 'Agents' : 'Automations') + ' you add from the Marketplace wait here while they are reviewed.</span>' +
          '<button type="button" class="cq-btn cq-btn--tonal" data-mkreq-browse>Browse the Marketplace</button></div>');
    if (focused) { var f = p.querySelector('[data-mkreq-open="' + focused + '"]'); if (f) f.focus({ preventScroll: true }); }
    markSel();
  }

  /* The tracker opens in the page's right-hand panel, as any detail does. */
  function trackPanel() {
    var el = byId('mkreqPanel');
    if (el) return el;
    el = document.createElement('aside');
    el.className = 'cq-panel mkreq-panel'; el.id = 'mkreqPanel';
    el.setAttribute('aria-label', 'Request status'); el.setAttribute('aria-hidden', 'true');
    var host = byId('panel') || byId('auPanel');
    (host ? host.parentNode : document.body).appendChild(el);
    return el;
  }
  function markSel() {
    document.querySelectorAll('.mkreq-row').forEach(function (r) { r.classList.toggle('is-sel', r.getAttribute('data-mkreq-open') === trackRef); });
  }
  function openTrack(ref) {
    var w = wsByRef(ref);
    if (!w) return;
    if (w.status !== 'requested') { reqShow(false); var first = seg && seg.querySelector(':scope > button:not([data-mkreq])'); if (first) first.click(); focusOn(ref); return; }
    if (typeof closePanel === 'function') closePanel();
    if (!trackRef) trackFocus = document.activeElement;
    trackRef = ref;
    var el = trackPanel();
    paintTrack(w);
    markSel();
    requestAnimationFrame(function () { el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); });
  }
  function closeTrack(quiet) {
    var el = byId('mkreqPanel');
    trackRef = null;
    markSel();
    if (!el) return;
    el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
    if (!quiet && trackFocus && trackFocus.focus) trackFocus.focus({ preventScroll: true });
  }
  function paintTrack(w) {
    var el = byId('mkreqPanel'); if (!el) return;
    var s = stageOf(w), T = totals(w), t0 = w.requestedAt || Date.now();
    var checks = checksOf(w);
    var stepCls = function (i) { return i < s.step || s.step === 3 ? 'is-done' : i === s.step ? (s.waiting ? 'is-wait' : 'is-now') : 'is-todo'; };
    var dot = function (i) { var c = stepCls(i); return '<span class="mkreq-dot">' + (c === 'is-done' ? IC.check : c === 'is-now' ? SPIN : c === 'is-wait' ? CLOCK : (i + 1)) + '</span>'; };
    var checkList = '<ul class="mkreq-checks">' + checks.map(function (c, i) {
      var st = i < s.checks ? 'is-ok' : i === s.checks && s.step === 2 ? 'is-now' : '';
      return '<li class="' + st + '"><span class="ci">' + (st === 'is-ok' ? IC.check : st === 'is-now' ? SPIN : '<i></i>') + '</span>' +
        '<span><b>' + E(c[0]) + '</b>' + E(c[1]) + '</span></li>';
    }).join('') + '</ul>';
    var steps = [
      ['Requested', 'You requested it from the Marketplace · Today, ' + clock(t0), ''],
      ['Admin review', s.step > 1 ? 'Approved by ' + ADMINS[0] + ' · ' + clock(approvedAt(w))
        : 'Sent to your workspace admins, ' + listAnd(ADMINS) + '. Reviews usually take 1 to 2 business days, and you will be notified once it is approved.',
        s.step === 1 ? '<span class="mkreq-tag is-wait">' + CLOCK + 'Waiting</span>' : '<span class="mkreq-tag is-ok">' + IC.check + 'Approved</span>'],
      ['Workspace policy check', s.step < 2 ? 'Runs once an admin approves the request'
        : s.step === 2 ? 'Checking ' + s.n + ' workspace policies · ' + s.checks + ' passed' : 'Passed all ' + s.n + ' workspace policies',
        s.step < 2 ? '' : s.step === 2 ? '<span class="mkreq-tag">' + SPIN + 'Checking</span>' : '<span class="mkreq-tag is-ok">' + IC.check + 'Passed</span>'],
      ['Ready to add to workspace', s.step === 3 ? 'Every check passed. Add it to your workspace to start using it.' : 'Once every check passes', '']
    ];
    var after = T.total
      ? '<div class="mkws-note cq-caption-reg">' + IC.warn + '<span>After it is added, fill in ' + plural(T.total, 'detail') + ' in ' +
        listAnd((w.needs || []).map(function (n) { return n.name; })) + '. The publisher kept these private.</span></div>'
      : '<div class="mkws-note is-ok cq-caption-reg">' + IC.check + '<span>The publisher shared every detail it needs, so it is ready to use as soon as it is added.</span></div>';
    el.innerHTML =
      '<div class="mkreq-p__bar">' + pillHTML(s) +
        '<button type="button" class="mkreq-p__x" data-mkreq-close aria-label="Close" title="Close">' +
          '<svg class="cq-ic" width="20" height="20" viewBox="0 0 20 20"><use href="#ic-pp_closepanel"/></svg></button>' +
      '</div>' +
      '<div class="cq-panel__section">' +
        '<div class="mkreq-p__title"><span class="mkreq-mark">' + REQ_IC + '</span>' +
          '<span class="mkreq-id"><span class="t cq-body1-med">' + E(w.name) + '</span>' +
          '<span class="s cq-caption-reg">' + (PAGE === 'agent' ? 'Agent' : 'Automation') + ' · published by ' + E(w.publisher) + '</span></span></div>' +
        (w.desc ? '<p class="cq-caption-reg" style="margin:0;color:var(--text-secondary)">' + E(w.desc) + '</p>' : '') +
        '<div class="mkreq-p__acts">' +
          '<button type="button" class="cq-btn cq-btn--primary" data-mkreq-add="' + E(w.ref) + '"' + (s.step === 3 ? '' : ' disabled') + '>Add to workspace</button>' +
          '<button type="button" class="cq-btn cq-btn--ghost" data-mkreq-withdraw="' + E(w.ref) + '">Withdraw request</button>' +
        '</div>' +
      '</div>' +
      '<div class="cq-panel__section"><span class="cq-section-label cq-caption-med">REQUEST STATUS</span>' +
        '<ol class="mkreq-steps">' + steps.map(function (st, i) {
          return '<li class="mkreq-step ' + stepCls(i) + '">' + dot(i) +
            '<span class="mkreq-step__b"><span class="mkreq-step__t cq-body2-med">' + E(st[0]) + st[2] + '</span>' +
            '<span class="mkreq-step__s cq-caption-reg">' + E(st[1]) + '</span>' + (i === 2 && s.step >= 2 ? checkList : '') + '</span></li>';
        }).join('') + '</ol>' +
      '</div>' +
      '<div class="cq-panel__section"><span class="cq-section-label cq-caption-med">AFTER IT IS ADDED</span>' + after + '</div>';
  }
  function addReq(ref) {
    var w = wsByRef(ref);
    if (!w || stageOf(w).step < 3) return;
    w.status = 'added'; w.added = Date.now();
    save(w);
    closeTrack(true);
    sync();
    reqShow(false);
    var first = seg && seg.querySelector(':scope > button:not([data-mkreq])');
    if (first) first.click();
    paintReqs(true);
    setTimeout(function () { focusOn(ref); }, 60);
    var T = totals(w);
    say(T.total ? w.name + ' is in your workspace. Fill in ' + plural(T.total, 'detail') + ' to start using it'
                : w.name + ' is in your workspace and ready to use');
  }
  /* The review moves on its own; the list and tracker follow it. */
  setInterval(function () {
    if (!reqs().length && !trackRef) return;
    var sig = reqSig();
    if (sig === lastReqSig) return;
    paintReqs();
    if (trackRef) { var w = wsByRef(trackRef); if (w) paintTrack(w); }
    /* Say so once a request clears every check. */
    reqs().forEach(function (r) {
      if (stageOf(r).step === 3 && !readySaid[r.ref]) { readySaid[r.ref] = true; say(r.name + ' is ready to add to your workspace'); }
    });
  }, 400);
  var readySaid = {};

  document.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-mkreq]')) { e.stopPropagation(); e.preventDefault(); reqShow(true); return; }
    if (reqOn && seg && e.target.closest('#' + seg.id + ' > button:not([data-mkreq])')) reqShow(false);
    if ((t = e.target.closest('[data-mkreq-open]'))) { e.stopPropagation(); openTrack(t.getAttribute('data-mkreq-open')); return; }
    if (e.target.closest('[data-mkreq-close]')) { e.stopPropagation(); closeTrack(); return; }
    if ((t = e.target.closest('[data-mkreq-add]'))) { e.stopPropagation(); addReq(t.getAttribute('data-mkreq-add')); return; }
    if ((t = e.target.closest('[data-mkreq-withdraw]'))) {
      e.stopPropagation();
      var w = wsByRef(t.getAttribute('data-mkreq-withdraw'));
      closeTrack(true);
      if (w) discard(w.ref, 'Request for ' + w.name + ' was withdrawn');
      paintReqs(true);
      return;
    }
    if (e.target.closest('[data-mkreq-browse]')) { e.stopPropagation(); post({ cqNav: 'marketplace.html' }); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && trackRef) { e.stopPropagation(); closeTrack(); }
  }, true);
  window.addEventListener('resize', segSync);

  post({ cqWsRequest: true });
})();
