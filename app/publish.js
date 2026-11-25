/* Publishing from the artifact's own screen. The ⋯ on an agent or
   automation card (and row) offers Edit as new version, Duplicate and
   Publish to Marketplace. Publishing opens the same form as the
   Marketplace's publish flow, with this artifact already chosen: the name
   and description come from it, the publisher adds About, Industry and
   Domain and decides which details go along. Submitting sends it for
   review; the request is tracked under Requests › Publishing to
   Marketplace on this page. */
(function () {
  var PAGE = typeof AUTOS !== 'undefined' ? 'automation' : (typeof AGENTS !== 'undefined' ? 'agent' : null);
  if (!PAGE) return;
  var inShell = window.parent !== window;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var say = function (m, act) { if (window.mkwsSay) window.mkwsSay(m, act); };

  /* ── Details per resource, as the Marketplace's publish dialog has them ── */
  var SETS = {
    agent: 'agent_goal agent_backstory task_description expected_output llm_model tools_list guardrails_list max_iter',
    apiTool: 'connection_id connection_payload pydantic_output_schema',
    customTool: 'tool_class_name custom_tool_code requirements_text custom_variables',
    modelInt: 'model custom_llm_provider api_key base_url api_version',
    apiInt: 'endpoint auth_type request_method bearer_token timeout',
    skill: 'skill_name skill_description management_tag adls_directory',
    guardrail: 'guardrail_name guardrail_type guardrail_desc guardrail_content attached_tool'
  };
  var WHY = {};
  [['Secret', 'api_key password username bearer_token client_secret client_id tenant_id sas_token access_token custom_variables access_key_id secret_access_key'],
   ['Link', 'endpoint base_url account_url site_id drive_id adls_directory document_path connection_id connection_payload llm_connection_id bucket_name bucket_url'],
   ['Data', 'files knowledge_base']].forEach(function (p) { p[1].split(' ').forEach(function (k) { WHY[k] = p[0]; }); });
  var WORDS = { llm: 'LLM', id: 'ID', url: 'URL', api: 'API', iter: 'iterations', adls: 'ADLS', pydantic: 'Pydantic', desc: 'description' };
  var LABEL = { adls_directory: 'Skill files', pydantic_output_schema: 'Output schema', custom_llm_provider: 'Provider',
    connection_id: 'Connection', connection_payload: 'Connection payload', max_iter: 'Max iterations', llm_model: 'LLM model' };
  function label(k) { if (LABEL[k]) return LABEL[k]; var s = k.split('_').map(function (w) { return WORDS[w] || w; }).join(' '); return s[0].toUpperCase() + s.slice(1); }
  function res(rk, id, name, type, set, extra) {
    var r = { rk: rk, id: id, name: name, type: type, fields: SETS[set].split(' ').map(function (k) { return { k: k, label: label(k), why: WHY[k] || '' }; }) };
    for (var x in (extra || {})) r[x] = extra[x];
    return r;
  }
  var PROVIDER = function (m) { m = String(m || '').toLowerCase(); return /gpt|openai|o1|o3/.test(m) ? 'OpenAI' : /claude|haiku|sonnet|opus/.test(m) ? 'Anthropic' : /gemini/.test(m) ? 'Google' : /mistral/.test(m) ? 'Mistral AI' : /llama/.test(m) ? 'Meta' : 'Model provider'; };

  /* What goes up with each artifact, read off the artifact itself. */
  function resourcesOf(a) {
    var out = [];
    if (PAGE === 'agent') {
      out.push(res('agents', 'self', a.name, 'Standalone agent', 'agent'));
      (a.tools || []).forEach(function (t, i) { out.push(res('tools', 't' + i, t, /forecast|custom/i.test(t) ? 'Custom tool' : 'API tool', /forecast|custom/i.test(t) ? 'customTool' : 'apiTool')); });
      (a.skills || []).forEach(function (t, i) { out.push(res('skills', 's' + i, t, 'Skill', 'skill')); });
      (a.guards || []).forEach(function (t, i) { out.push(res('guardrails', 'g' + i, t, 'Guardrail', 'guardrail')); });
      if (a.model && a.model !== '—') out.push(res('models', 'm1', a.model, 'Model integration · ' + PROVIDER(a.model), 'modelInt'));
    } else {
      var seen = {};
      /* Steps that reach outside the automation run on an integration. */
      var INTEG = { email: 'API integration', webhook: 'Webhook integration', notify: 'Messaging integration', sync: 'API integration', data: 'Data integration', action: 'API integration', trigger: 'Event integration' };
      (a.steps || []).forEach(function (s, i) {
        var key = s.k + ':' + (s.s || s.l);
        if (seen[key]) return; seen[key] = 1;
        if (s.k === 'agent') out.push(res('agents', 'a' + i, s.l, 'Standalone agent', 'agent'));
        else if (s.k === 'tool' || s.k === 'doc') out.push(res('tools', 't' + i, s.l, s.k === 'doc' ? 'Doc extractor tool' : 'API tool', 'apiTool', { on: s.s }));
        else if (s.k === 'model') out.push(res('models', 'm' + i, s.s, 'Model integration · ' + PROVIDER(s.s), 'modelInt', { used: s.l }));
        else if (INTEG[s.k]) out.push(res('integrations', 'i' + i, (!s.s || /\d/.test(s.s)) ? s.l : s.s, INTEG[s.k], 'apiInt', { used: s.l }));
        else if (s.k === 'checkpoint' || s.k === 'guard') out.push(res('guardrails', 'c' + i, s.l, s.k === 'guard' ? 'Guardrail' : 'Human checkpoint', 'guardrail'));
      });
    }
    return out;
  }

  var WORKSPACES = ['Marketing', 'Design systems', 'Customer success', 'Data platform', 'Sales'];
  var INDUSTRIES = ['Banking & Financial Services', 'Insurance', 'Healthcare & Life Sciences', 'Retail & CPG', 'Manufacturing', 'Technology, Media & Telecom', 'Cross-industry'];
  var FUNCTIONS = ['Marketing', 'Sales', 'Finance', 'Human Resources', 'Operations', 'Customer Service', 'IT'];
  var TABS = [['agents', 'Agents'], ['tools', 'Tools'], ['integrations', 'Integrations'], ['models', 'Models'], ['skills', 'Skills'], ['guardrails', 'Guardrails']];
  var IC = {
    close: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12 4.5 6.5 10l5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.25" y="7" width="9.5" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.75 14.75 13.5H1.25L8 1.75Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.25v3.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".8" fill="currentColor"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.5 3.5l3 3M3 13l.6-2.7 7.3-7.3a1.4 1.4 0 0 1 2 2l-7.3 7.3L3 13Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    dup: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" stroke="currentColor" stroke-width="1.3"/></svg>',
    store: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 6.5V13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6.5M1.75 3.5l1-1.75h10.5l1 1.75v1a2 2 0 0 1-4 0 2 2 0 0 1-4.25 0 2 2 0 0 1-4.25 0v-1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.5 14v-3.5h3V14" stroke="currentColor" stroke-width="1.3"/></svg>',
    share: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="3.5" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="m5.8 7 4.4-2.5M5.8 9l4.4 2.5" stroke="currentColor" stroke-width="1.3"/></svg>',
    agent: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r=".9" fill="currentColor"/><circle cx="10" cy="9" r=".9" fill="currentColor"/></svg>',
    flow: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9 1.75 3.5 9H8l-1 5.25L12.5 7H8l1-5.25Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    tool: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.8 2.2a3.3 3.3 0 0 0-3.9 4.4L2.3 10.2a1.3 1.3 0 0 0 1.8 1.8l3.6-3.6a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.6-.5-.5-1.6 2-2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    plug: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2v3M10 2v3M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0V5ZM8 11v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    brain: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="1.1" opacity=".6"/></svg>',
    skill: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m8 2 1.7 3.6 3.8.5-2.8 2.6.7 3.8L8 10.7l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    guard: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.75 13 3.5v4c0 3-2.2 5.4-5 6.75C5.2 12.9 3 10.5 3 7.5v-4L8 1.75Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
  };
  var RK_IC = { agents: IC.agent, tools: IC.tool, integrations: IC.plug, models: IC.brain, skills: IC.skill, guardrails: IC.guard };

  var css = document.createElement('style');
  css.textContent = [
    ':root{--cqp-warn-bg:#241101;--cqp-warn-edge:#502500;--cqp-warn-fg:#ffc470}',
    ':root[data-mode="light"]{--cqp-warn-bg:#fff4e5;--cqp-warn-edge:#fcd19c;--cqp-warn-fg:#ce7012}',
    /* the card menu */
    '.cqp-cm{position:fixed;z-index:260;min-width:220px;padding:4px;border-radius:10px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 8px 24px rgba(0,0,0,.28);display:flex;flex-direction:column}',
    '.cqp-cm[hidden]{display:none}',
    '.cqp-cm button{display:flex;align-items:center;gap:8px;height:34px;padding:0 10px;border:0;border-radius:6px;background:none;cursor:pointer;text-align:left;color:var(--text-primary);font:400 14px/20px var(--font-geist);letter-spacing:-.4px;white-space:nowrap}',
    '.cqp-cm button svg{flex:none;color:var(--text-secondary)}',
    '.cqp-cm button:hover,.cqp-cm button:focus-visible{background:var(--backgrounds-card-bg-4);outline:none}',
    '.cqp-cm hr{border:0;border-top:1px solid var(--strokes-card-default);margin:4px 2px}',
    '.cqp-cm .is-pub svg{color:var(--text-coloured-blue)}',
    /* the dialog */
    '.cqp{position:fixed;inset:0;z-index:250;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(18,18,18,.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
    '.cqp[hidden]{display:none}',
    '.cqp-dlg{width:min(640px,100%);height:min(760px,calc(100vh - 48px));display:flex;flex-direction:column;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);border-radius:12px;box-shadow:0 4px 12px rgba(33,33,33,.16);color:var(--text-primary);font-family:var(--font-geist)}',
    '.cqp-dlg[hidden]{display:none}',
    '.cqp-dlg button{font-family:inherit}',
    '.cqp-hdr{flex:none;display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--strokes-card-default)}',
    '.cqp-hdr h2{flex:1 1 auto;margin:0;font:500 16px/24px var(--font-geist);letter-spacing:-.64px}',
    '.cqp-x{width:28px;height:28px;border-radius:6px;border:0;background:none;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center}',
    '.cqp-x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.cqp-body{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:16px;padding:16px 24px}',
    '.cqp-ftr{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 16px;border-top:1px solid var(--strokes-card-default)}',
    '.cqp-acts{display:flex;gap:12px;margin-left:auto}',
    '.cqp-btn{height:36px;padding:0 12px;border-radius:8px;border:0;cursor:pointer;font:500 14px/20px var(--font-geist);letter-spacing:-.56px;white-space:nowrap}',
    '.cqp-btn--tonal{background:var(--backgrounds-button-tonal-2);color:var(--text-button-tonal-2)}',
    '.cqp-btn--primary{background:var(--backgrounds-button-primary);color:#fff}',
    '.cqp-link{border:0;background:none;padding:0;cursor:pointer;color:var(--text-coloured-blue);font:500 12px/16px var(--font-geist)}',
    '.cqp-link:hover{text-decoration:underline}',
    '.cqp-hint{margin:0;color:var(--text-teritiary);font:400 12px/16px var(--font-geist);letter-spacing:-.24px}',
    '.cqp-art{display:flex;align-items:center;gap:12px}',
    '.cqp-art .t{display:block;font:500 14px/20px var(--font-geist)}',
    '.cqp-art .s{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqp-tile{flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;color:#fff;background:linear-gradient(135deg,#0d99ff,#7b61ff)}',
    '.cqp-tile--automation{background:linear-gradient(135deg,#14ae5c,#0d99ff)}',
    '.cqp-tile svg{width:22px;height:22px}',
    '.cqp-f{position:relative;display:flex;flex-direction:column;gap:4px;min-width:0}',
    '.cqp-f__l{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font:400 14px/20px var(--font-geist);letter-spacing:-.56px}',
    '.cqp-f__l .req{color:var(--text-coloured-red,#dc3412)}',
    '.cqp-in{width:100%;box-sizing:border-box;padding:12px;border-radius:8px;background:var(--backgrounds-type-default-bg-1,var(--backgrounds-card-bg-2));border:1px solid var(--strokes-type-default,var(--strokes-card-default));color:var(--text-primary);font:400 14px/20px var(--font-geist);letter-spacing:-.56px;outline:none}',
    '.cqp-in::placeholder{color:var(--text-teritiary);opacity:1}',
    '.cqp-in:focus{border-color:var(--strokes-card-selected,#0d99ff)}',
    'textarea.cqp-in{height:120px;resize:none;display:block}',
    '.cqp-in.is-locked{background:var(--backgrounds-card-bg-5,var(--backgrounds-card-bg-4));border-color:var(--strokes-line-3,var(--strokes-card-default));color:var(--text-button-tonal-2);padding-right:36px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cqp-lockwrap{position:relative}',
    '.cqp-lock{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-teritiary);pointer-events:none;display:inline-flex}',
    '.cqp-f.has-error .cqp-in{border-color:var(--text-coloured-red,#dc3412)}',
    '.cqp-row{display:flex;gap:16px}',
    '.cqp-menu.cqp-menu--down{bottom:auto;top:calc(100% + 4px)}',
    '.cqp-dest{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.cqp-opt{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:10px;border:1px solid var(--strokes-card-default);background:none;cursor:pointer;text-align:left;color:inherit}',
    '.cqp-opt:hover{border-color:#5a5a5a}',
    '.cqp-opt.is-on{border-color:var(--strokes-card-selected,#0d99ff);background:var(--backgrounds-badge-blue)}',
    '.cqp-opt i{flex:none;width:16px;height:16px;margin-top:2px;border-radius:50%;border:1.5px solid var(--strokes-line-1)}',
    '.cqp-opt.is-on i{border:5px solid var(--backgrounds-button-primary)}',
    '.cqp-opt b{display:block;font:500 14px/20px var(--font-geist)}',
    '.cqp-opt span span{display:block;margin-top:2px;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqp-row>.cqp-f{flex:1 0 0}',
    '.cqp-dd{display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer}',
    '.cqp-dd span{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-teritiary)}',
    '.cqp-dd.has-value span{color:var(--text-primary)}',
    '.cqp-menu{position:absolute;left:0;right:0;bottom:calc(100% + 4px);z-index:5;max-height:220px;overflow:auto;margin:0;padding:4px;list-style:none;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.25)}',
    '.cqp-menu li{padding:8px;border-radius:6px;cursor:pointer;font:400 14px/20px var(--font-geist)}',
    '.cqp-menu li:hover{background:var(--backgrounds-card-bg-4)}',
    '.cqp-menu li.is-on{background:var(--backgrounds-button-tonal-1);color:var(--text-coloured-blue)}',
    '.cqp-cta{display:flex;align-items:center;gap:12px;width:100%;padding:12px;text-align:left;cursor:pointer;color:inherit;background:none;border:1px solid var(--strokes-card-default);border-radius:8px}',
    '.cqp-cta:hover{border-color:#5a5a5a;background:rgba(255,255,255,.03)}',
    '.cqp-ico{width:32px;height:32px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-card-bg-4);color:var(--text-button-tonal-2)}',
    '.cqp-cta .txt{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}',
    '.cqp-cta .t{font:400 14px/20px var(--font-geist)}',
    '.cqp-cta .s{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqp-cta .s .warn{color:var(--cqp-warn-fg)}',
    '.cqp-cta .go{display:inline-flex;align-items:center;gap:2px;color:var(--text-coloured-blue);font:500 12px/16px var(--font-geist)}',
    '.cqp-over{position:fixed;inset:0;z-index:251;background:rgba(18,18,18,.45)}',
    '.cqp-over[hidden]{display:none}',
    '.cqp-dlg--share{position:fixed;z-index:252;left:50%;top:calc(50% + 12px);transform:translate(-50%,-50%);width:min(580px,calc(100vw - 32px));max-height:calc(100vh - 72px)}',
    '.cqp-tabs{display:flex;flex-wrap:wrap;gap:6px}',
    '.cqp-chip{position:relative;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;cursor:pointer;background:none;border:1px solid var(--strokes-card-default);color:var(--text-secondary);font:500 12px/16px var(--font-geist)}',
    '.cqp-chip .n{color:var(--text-teritiary);font-weight:400}',
    '.cqp-chip[aria-selected="true"]{background:var(--backgrounds-button-tonal-1);border-color:var(--strokes-card-selected,#0d99ff);color:var(--text-coloured-blue)}',
    '.cqp-chip.flag::after{content:"";position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:var(--cqp-warn-fg);box-shadow:0 0 0 2px var(--backgrounds-page-bg-2)}',
    '.cqp-list{border:1px solid var(--strokes-card-default);border-radius:8px}',
    '.cqp-res+.cqp-res{border-top:1px solid var(--strokes-card-default)}',
    '.cqp-res__h{width:100%;display:flex;align-items:center;gap:12px;padding:12px;text-align:left;cursor:pointer;background:none;border:0;color:inherit;border-radius:8px}',
    '.cqp-res__h:hover{background:rgba(255,255,255,.03)}',
    '.cqp-res__h .txt{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}',
    '.cqp-res__h .t{font:400 14px/20px var(--font-geist)}',
    '.cqp-res__h .s{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqp-res__n{flex:none;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqp-res__n.all{color:var(--text-coloured-blue)}',
    '.cqp-res__h .chev{flex:none;color:var(--text-teritiary);transition:transform .15s;display:inline-flex}',
    '.cqp-res.is-open .chev{transform:rotate(180deg)}',
    '.cqp-res__p{display:flex;flex-direction:column;gap:6px;padding:0 12px 12px 56px}',
    '.cqp-res__p[hidden]{display:none}',
    '.cqp-cb{display:flex;align-items:center;gap:8px;min-width:0;padding:4px 0;cursor:pointer;font:400 12px/16px var(--font-geist)}',
    '.cqp-cb .l{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cqp-cb input{accent-color:var(--backgrounds-button-primary);width:16px;height:16px;margin:0;flex:none}',
    '.cqp-all{padding-bottom:6px;border-bottom:1px dashed var(--strokes-line-3,var(--strokes-card-default));font-weight:500}',
    '.cqp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}',
    '.cqp-why{flex:none;padding:0 5px;border-radius:4px;border:1px solid var(--strokes-card-default);color:var(--text-teritiary);font:400 10px/14px var(--font-geist)}',
    '.cqp-why--secret{border-color:var(--cqp-warn-edge);color:var(--cqp-warn-fg)}',
    '.cqp-warn{display:flex;gap:8px;align-items:flex-start;margin:0;padding:8px 10px;border-radius:8px;border:1px solid var(--cqp-warn-edge);background:var(--cqp-warn-bg);color:var(--cqp-warn-fg);font:400 12px/16px var(--font-geist)}',
    '.cqp-warn svg{flex:none;margin-top:1px}',
    '@media (max-width:560px){.cqp-row{flex-direction:column}.cqp-grid{grid-template-columns:1fr}.cqp-res__p{padding-left:12px}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ── The ⋯ menu on a card or row ── */
  var cm = document.createElement('div');
  cm.className = 'cqp-cm'; cm.hidden = true; cm.setAttribute('role', 'menu');
  document.body.appendChild(cm);
  var cmItem = null;
  function closeMenu() { cm.hidden = true; cmItem = null; }
  function openMenu(btn, item) {
    cmItem = item;
    cm.innerHTML =
      '<button type="button" role="menuitem" data-cqp="edit">' + IC.edit + 'Edit as new version</button>' +
      '<button type="button" role="menuitem" data-cqp="dup">' + IC.dup + 'Duplicate</button><hr />' +
      '<button type="button" role="menuitem" class="is-pub" data-cqp="publish">' + IC.store + 'Publish to Marketplace</button>';
    cm.hidden = false;
    var r = btn.getBoundingClientRect(), w = cm.offsetWidth, h = cm.offsetHeight;
    var left = Math.min(Math.max(8, r.right - w), innerWidth - w - 8);
    var top = r.bottom + 4 + h > innerHeight - 8 ? r.top - h - 4 : r.bottom + 4;
    cm.style.left = left + 'px'; cm.style.top = Math.max(8, top) + 'px';
    var first = cm.querySelector('button'); if (first) first.focus({ preventScroll: true });
  }
  /* The page's own artifact behind a card, or null for a Marketplace listing. */
  function itemAt(host) {
    var i = +host.dataset.i;
    if (PAGE === 'agent') return (typeof state === 'undefined' || state.src === 'workspace') && AGENTS[i] ? { a: AGENTS[i], i: i } : null;
    return AUTOS[i] ? { a: AUTOS[i], i: i } : null;
  }
  document.addEventListener('click', function (e) {
    var more = e.target.closest('[data-more]');
    if (more) {
      var host = more.closest('[data-i]');
      var it = host && itemAt(host);
      if (!it) return;
      e.stopPropagation(); e.preventDefault();
      if (!cm.hidden && cmItem && cmItem.a === it.a) return closeMenu();
      return openMenu(more, it);
    }
    var b = e.target.closest('[data-cqp]');
    if (b && cmItem) { e.stopPropagation(); var it2 = cmItem; closeMenu(); return act(b.dataset.cqp, it2); }
    if (!cm.hidden && !e.target.closest('.cqp-cm')) closeMenu();
  }, true);
  window.addEventListener('scroll', function () { if (!cm.hidden) closeMenu(); }, true);
  window.addEventListener('resize', closeMenu);

  function nextVersion(a) { var m = /v(\d+)/.exec(a.version || ''); return 'v' + (m ? +m[1] + 1 : 2); }
  function rerender() {
    if (PAGE === 'agent' && typeof render === 'function') render();
    if (PAGE === 'automation' && typeof renderAutos === 'function') renderAutos();
  }
  function act(k, it) {
    var a = it.a;
    if (k === 'publish') return open(a);
    if (k === 'edit') {
      if (PAGE === 'agent' && window.agb && window.agb.editVersion) return window.agb.editVersion(it.i);
      if (typeof openPanel === 'function') openPanel(it.i);
      return say(a.name + ' opened as ' + nextVersion(a) + ' draft. The live version keeps running until you publish it.');
    }
    if (k === 'dup') {
      var c = JSON.parse(JSON.stringify(a));
      c.name = a.name + ' (copy)';
      if (PAGE === 'agent') { c.state = 'draft'; c.status = 'draft'; c.updated = 'just now'; c.runs = 0; c.usedBy = []; delete c.ref; delete c.parent; }
      else { c.runs = 0; c.pending = 0; c.last = 'just now'; c.lastN = 0; c.version = 'v1'; c.status = 'Paused'; }
      var arr = PAGE === 'agent' ? AGENTS : AUTOS;
      arr.splice(arr.indexOf(a) + 1, 0, c);
      rerender();
      return say(c.name + ' was added to your ' + (PAGE === 'agent' ? 'agents' : 'automations'));
    }
  }

  /* ── Publish to Marketplace, for this artifact ── */
  var P = null;
  var root = document.createElement('div');
  root.className = 'cqp'; root.hidden = true;
  root.innerHTML = '<div class="cqp-dlg" id="cqpDlg" role="dialog" aria-modal="true" aria-labelledby="cqpTitle"></div>';
  document.body.appendChild(root);
  var $ = function (id) { return document.getElementById(id); };

  function defaults() { var on = {}; P.res.forEach(function (r) { on[r.id] = new Set(r.fields.filter(function (f) { return !f.why; }).map(function (f) { return f.k; })); }); return on; }
  function counts() {
    var c = { shared: 0, total: 0, priv: 0 };
    P.res.forEach(function (r) { r.fields.forEach(function (f) { c.total++; if (P.on[r.id].has(f.k)) { c.shared++; if (f.why) c.priv++; } }); });
    return c;
  }
  function plural(n, w) { return n + ' ' + (n === 1 ? w.replace(/s$/, '') : w); }
  function joinList(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function summary() {
    var c = counts();
    var kinds = TABS.map(function (t) { return [P.res.filter(function (r) { return r.rk === t[0]; }).length, t[1].toLowerCase()]; })
      .filter(function (x) { return x[0]; }).map(function (x) { return plural(x[0], x[1]); }).join(', ');
    return {
      html: E(kinds) + (c.priv ? ' · <span class="warn">' + c.priv + ' private ' + (c.priv === 1 ? 'detail' : 'details') + ' shared</span>' : ' · keys and links kept private'),
      text: c.shared + ' of ' + c.total + ' details shared' + (c.priv ? ' · ' + c.priv + ' private ' + (c.priv === 1 ? 'detail' : 'details') + ' included' : ' · keys and links kept private')
    };
  }

  function open(a) {
    P = { a: a, res: resourcesOf(a), dest: 'marketplace', ws: '', about: '', industry: '', func: '', share: false, tab: 'agents', open: null, dd: null, err: {} };
    P.on = defaults();
    var firstTab = TABS.filter(function (t) { return P.res.some(function (r) { return r.rk === t[0]; }); })[0];
    if (firstTab) P.tab = firstTab[0];
    root.hidden = false;
    paint();
    var ta = root.querySelector('textarea'); if (ta) ta.focus({ preventScroll: true });
  }
  function close() { root.hidden = true; P = null; }

  function paint() {
    if (!P) return;
    if (P.share) return paintShare();
    var a = P.a, sum = summary(), kindWord = PAGE === 'agent' ? 'Agent' : 'Automation';
    var meta = kindWord + (a.version ? ' · ' + a.version : '') + (a.updated ? ' · Edited ' + a.updated : a.last ? ' · Last run ' + a.last : '');
    var dd = function (key, lbl, all, val) {
      return '<div class="cqp-f' + (P.err[key] ? ' has-error' : '') + '"><span class="cqp-f__l"><span>' + lbl + ' <span class="req">*</span></span></span>' +
        '<button type="button" class="cqp-in cqp-dd' + (val ? ' has-value' : '') + '" data-cqp-dd="' + key + '"><span>' + E(val || 'Select ' + lbl.toLowerCase()) + '</span>' + IC.down + '</button>' +
        (P.dd === key ? '<ul class="cqp-menu' + (key === 'ws' ? ' cqp-menu--down' : '') + '" role="listbox">' + all.map(function (v) { return '<li role="option" class="' + (v === val ? 'is-on' : '') + '" data-cqp-opt="' + key + '" data-v="' + E(v) + '">' + E(v) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    };
    $('cqpDlg').innerHTML =
      '<div class="cqp-hdr"><h2 id="cqpTitle">Publish</h2><button type="button" class="cqp-x" data-cqpa="close" aria-label="Close">' + IC.close + '</button></div>' +
      '<div class="cqp-body">' +
        '<div class="cqp-art"><span class="cqp-tile cqp-tile--' + PAGE + '">' + (PAGE === 'agent' ? IC.agent : IC.flow) + '</span><span><span class="t">' + E(a.name) + '</span><span class="s">' + E(meta) + '</span></span></div>' +
        /* Where it goes: the Marketplace, or one workspace. */
        '<div class="cqp-f"><span class="cqp-f__l">Publish to</span><div class="cqp-dest">' +
          '<button type="button" class="cqp-opt' + (P.dest === 'marketplace' ? ' is-on' : '') + '" data-cqp-dest="marketplace"><i></i><span><b>Marketplace</b><span>Anyone in the organisation can find it and add it to their workspace.</span></span></button>' +
          '<button type="button" class="cqp-opt' + (P.dest === 'workspace' ? ' is-on' : '') + '" data-cqp-dest="workspace"><i></i><span><b>A workspace</b><span>Everyone in the workspace you choose can find and run it.</span></span></button>' +
        '</div></div>' +
        (P.dest === 'workspace' ? dd('ws', 'Workspace', WORKSPACES, P.ws) : '') +
        '<div class="cqp-f"><span class="cqp-f__l">Name</span><span class="cqp-lockwrap"><input class="cqp-in is-locked" value="' + E(a.name) + '" readonly /><span class="cqp-lock">' + IC.lock + '</span></span>' +
          '<p class="cqp-hint">Comes from the ' + PAGE + '. Rename it in the builder to change it here.</p></div>' +
        '<div class="cqp-f"><span class="cqp-f__l">Description</span><span class="cqp-lockwrap"><input class="cqp-in is-locked" value="' + E(a.desc) + '" readonly /><span class="cqp-lock">' + IC.lock + '</span></span>' +
          '<p class="cqp-hint">Shows under its name ' + (P.dest === 'workspace' ? 'in the workspace' : 'on the Marketplace card') + '. Edit it in the builder to change it here.</p></div>' +
        (P.dest === 'workspace' ? '' :
        '<div class="cqp-f' + (P.err.about ? ' has-error' : '') + '"><span class="cqp-f__l"><span>About <span class="req">*</span></span><button type="button" class="cqp-link" data-cqpa="example">Example</button></span>' +
          '<textarea class="cqp-in" data-cqp-in="about" placeholder="Describe what this ' + PAGE + ' does, how to use it...">' + E(P.about) + '</textarea>' +
          '<p class="cqp-hint">Help people understand what it does, where to use it, when it works best, and example use cases.</p></div>' +
        '<div class="cqp-row">' + dd('industry', 'Industry', INDUSTRIES, P.industry) + dd('func', 'Domain', FUNCTIONS, P.func) + '</div>') +
        /* What goes along, wherever it is published. */
        '<div class="cqp-f"><span class="cqp-f__l" style="font-weight:500">What\'s included</span>' +
          '<button type="button" class="cqp-cta" data-cqpa="share"><span class="cqp-ico">' + IC.share + '</span>' +
          '<span class="txt"><span class="t">Customize what\'s shared ' + (P.dest === 'workspace' ? 'with ' + E(P.ws || 'the workspace') : 'to Marketplace') + '</span><span class="s">' + sum.html + '</span></span>' +
          '<span class="go">Customize ' + IC.right + '</span></button></div>' +
      '</div>' +
      '<div class="cqp-ftr"><p class="cqp-hint">' + (P.dest === 'workspace' ? 'The workspace admin there approves it before people can run it.' : 'Goes to your workspace admin, then the platform admin, before it is listed.') + '</p><div class="cqp-acts">' +
        '<button type="button" class="cqp-btn cqp-btn--tonal" data-cqpa="close">Cancel</button>' +
        '<button type="button" class="cqp-btn cqp-btn--primary" data-cqpa="publish">' + (P.dest === 'workspace' ? 'Publish to workspace' : 'Publish to marketplace') + '</button></div></div>';
  }
  /* Customize what's shared is the dialog's second page: it takes the
     form's place, with a back arrow to return to it. */
  function paintShare() {
    if (!P.share) return paint();
    var sh = $('cqpDlg');
    var list = P.res.filter(function (r) { return r.rk === P.tab; });
    var rows = list.map(function (r) {
      var on = P.on[r.id], n = on.size, t = r.fields.length, isOpen = P.open === r.id;
      var secrets = r.fields.filter(function (f) { return f.why === 'Secret' && on.has(f.k); }).map(function (f) { return f.label; });
      var warn = (r.rk === 'models' || r.rk === 'integrations') && secrets.length
        ? '<p class="cqp-warn">' + IC.warn + '<span>You\'re sharing the ' + E(joinList(secrets)) + ' for ' + E(r.name) + '. ' +
          (r.rk === 'models' ? 'Anyone who adds this ' + PAGE + ' can run ' + E(r.name) + ' on your key, and you pay for every run.'
                             : 'Anyone who adds this ' + PAGE + ' can act as your account through it, and their activity shows under your name.') + '</span></p>' : '';
      var sub = r.type + (r.used ? ' · used by ' + r.used : '') + (r.on ? ' · runs on ' + r.on : '');
      return '<div class="cqp-res' + (isOpen ? ' is-open' : '') + '">' +
        '<button type="button" class="cqp-res__h" data-cqp-res="' + r.id + '" aria-expanded="' + isOpen + '"><span class="cqp-ico">' + RK_IC[r.rk] + '</span>' +
          '<span class="txt"><span class="t">' + E(r.name) + '</span><span class="s">' + E(sub) + '</span></span>' +
          '<span class="cqp-res__n' + (n === t ? ' all' : '') + '">' + (n === t ? 'All ' + t : n + ' of ' + t) + '</span><span class="chev">' + IC.down + '</span></button>' +
        '<div class="cqp-res__p"' + (isOpen ? '' : ' hidden') + '>' +
          '<label class="cqp-cb cqp-all"><input type="checkbox" data-cqp-all="' + r.id + '"' + (n === t ? ' checked' : '') + ' /><span class="l">Select all</span></label>' +
          '<div class="cqp-grid">' + r.fields.map(function (f) {
            return '<label class="cqp-cb" title="' + f.k + '"><input type="checkbox" data-cqp-f="' + r.id + '|' + f.k + '"' + (on.has(f.k) ? ' checked' : '') + ' />' +
              '<span class="l">' + E(f.label) + '</span>' + (f.why ? '<span class="cqp-why' + (f.why === 'Secret' ? ' cqp-why--secret' : '') + '">' + f.why + '</span>' : '') + '</label>';
          }).join('') + '</div>' + warn +
        '</div></div>';
    }).join('');
    sh.innerHTML =
      '<div class="cqp-hdr"><button type="button" class="cqp-x" data-cqpa="share-back" aria-label="Back to publish">' + IC.back + '</button><h2 id="cqpTitle">Customize what\'s shared</h2>' +
        '<button type="button" class="cqp-x" data-cqpa="close" aria-label="Close">' + IC.close + '</button></div>' +
      '<div class="cqp-body">' +
        '<p class="cqp-hint">Tick the details people get when they add this ' + PAGE + '. Keys, links, account details and your data start unticked and stay private.</p>' +
        '<div class="cqp-tabs" role="tablist">' + TABS.filter(function (t) { return P.res.some(function (r) { return r.rk === t[0]; }); }).map(function (t) {
          var flag = P.res.some(function (r) { return r.rk === t[0] && r.fields.some(function (f) { return f.why && P.on[r.id].has(f.k); }); });
          return '<button type="button" role="tab" class="cqp-chip' + (flag ? ' flag' : '') + '" data-cqp-tab="' + t[0] + '" aria-selected="' + (P.tab === t[0]) + '">' + t[1] +
            ' <span class="n">' + P.res.filter(function (r) { return r.rk === t[0]; }).length + '</span></button>';
        }).join('') + '</div>' +
        '<div class="cqp-list">' + rows + '</div>' +
      '</div>' +
      '<div class="cqp-ftr"><button type="button" class="cqp-link" data-cqpa="reset">Reset to defaults</button>' +
        '<div class="cqp-acts"><button type="button" class="cqp-btn cqp-btn--primary" data-cqpa="share-back">Save and go back</button></div></div>';
  }
  function submit() {
    if (P.dest === 'workspace') {
      P.err = { ws: !P.ws };
      if (P.err.ws) return paint();
      var nm = P.a.name, ws = P.ws, shared = summary().text.split(' · ')[0];
      close();
      return say(nm + ' was sent to the ' + ws + ' workspace with ' + shared + '. Its workspace admin approves it before people there can run it.');
    }
    P.err = { about: !P.about.trim(), industry: !P.industry, func: !P.func };
    if (P.err.about || P.err.industry || P.err.func) return paint();
    var a = P.a, now = Date.now();
    var secrets = P.res.filter(function (r) { return r.fields.some(function (f) { return f.why === 'Secret' && P.on[r.id].has(f.k); }); }).map(function (r) { return r.name; });
    var slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var item = { ref: 'pub:' + PAGE + ':' + slug + ':' + now, kind: PAGE, flow: 'publish', status: 'requested',
      name: a.name, desc: a.desc, about: P.about.trim(), industry: P.industry, func: P.func, publisher: 'You', requester: 'Savio Govindu', workspace: 'Finance',
      model: a.model || undefined, secrets: secrets, sharedSummary: summary().text, requestedAt: now, added: now, needs: [], config: { done: {} } };
    if (inShell) parent.postMessage({ cqWsAdd: item }, '*');
    close();
    say('Sent for review. ' + a.name + ' goes to your workspace admin before it is listed on the Marketplace.',
      { label: 'Track', run: function () { if (window.mkwsTrack) window.mkwsTrack(item.ref); } });
  }

  root.addEventListener('click', function (e) {
    if (!P) return;
    var t = e.target, b = t.closest('[data-cqpa]'), x;
    if (P.dd && !t.closest('[data-cqp-dd], .cqp-menu')) { P.dd = null; paint(); if (!b) return; }
    if ((x = t.closest('[data-cqp-opt]'))) { P[x.dataset.cqpOpt] = x.dataset.v; P.err[x.dataset.cqpOpt] = false; P.dd = null; return paint(); }
    if ((x = t.closest('[data-cqp-dest]'))) { P.dest = x.dataset.cqpDest; P.err = {}; P.dd = null; return paint(); }
    if ((x = t.closest('[data-cqp-dd]'))) { P.dd = P.dd === x.dataset.cqpDd ? null : x.dataset.cqpDd; return paint(); }
    if ((x = t.closest('[data-cqp-tab]'))) { P.tab = x.dataset.cqpTab; P.open = null; return paintShare(); }
    if ((x = t.closest('[data-cqp-res]'))) { P.open = P.open === x.dataset.cqpRes ? null : x.dataset.cqpRes; return paintShare(); }
    if (t === root) return close();
    if (!b) return;
    var k = b.dataset.cqpa;
    if (k === 'close') return close();
    if (k === 'share') { P.share = true; paint(); $('cqpDlg').querySelector('.cqp-body').scrollTop = 0; return; }
    if (k === 'share-back') { P.share = false; return paint(); }
    if (k === 'reset') { P.on = defaults(); return paintShare(); }
    if (k === 'example') {
      P.about = P.a.desc + ' Works best for ' + (PAGE === 'agent' ? 'teams that handle this every day' : 'recurring, high-volume work') + '. Example: "Run it on last week\'s batch and flag anything that needs a person."';
      P.err.about = false; return paint();
    }
    if (k === 'publish') return submit();
  });
  root.addEventListener('change', function (e) {
    if (!P) return;
    var t = e.target;
    if (t.dataset.cqpAll) { var r = P.res.filter(function (x) { return x.id === t.dataset.cqpAll; })[0]; P.on[r.id] = new Set(t.checked ? r.fields.map(function (f) { return f.k; }) : []); return paintShare(); }
    if (t.dataset.cqpF) { var p = t.dataset.cqpF.split('|'); if (t.checked) P.on[p[0]].add(p[1]); else P.on[p[0]].delete(p[1]); return paintShare(); }
  });
  root.addEventListener('input', function (e) {
    if (!P || !e.target.dataset.cqpIn) return;
    P.about = e.target.value;
    if (P.err.about && P.about.trim()) { P.err.about = false; e.target.closest('.cqp-f').classList.remove('has-error'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!cm.hidden) { e.stopPropagation(); return closeMenu(); }
    if (!P) return;
    e.stopPropagation();
    if (P.dd) { P.dd = null; return paint(); }
    if (P.share) { P.share = false; return paint(); }
    close();
  }, true);

  /* From the Profile: publish a named artifact, or point to the ⋯ menu. */
  window.addEventListener('message', function (e) {
    var f = (e.data || {}).cqFocus;
    if (typeof f !== 'string' || f.indexOf('publish') !== 0) return;
    var name = f.slice(8), arr = PAGE === 'agent' ? AGENTS : AUTOS;
    var a = name && arr.filter(function (x) { return x.name === name; })[0];
    setTimeout(function () {
      if (a) open(a);
      else say('To publish, open the ⋯ on a' + (PAGE === 'agent' ? 'n agent' : 'n automation') + ' and choose Publish to Marketplace.');
    }, 300);
  });

  window.cqPublish = { open: open };
})();
