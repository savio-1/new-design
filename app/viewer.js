/* Seeing what you approve. From a request in the Admin panel or in
   Monitoring, "View artifact" opens it read-only: an agent or an
   automation in the builder's canvas, a tool, skill or guardrail in a
   modal. The admin can approve or reject from the viewer's header. */
(function () {
  if (!window.cqReview) return;
  var CR = window.cqReview;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };

  var IC = {
    close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    agent: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5V5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="6" cy="9" r=".9" fill="currentColor"/><circle cx="10" cy="9" r=".9" fill="currentColor"/></svg>',
    flow: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3.5" cy="8" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="3.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><circle cx="12.5" cy="12.5" r="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M5.1 8h3m0-4.5h2.9M8 12.5h2.9M8 3.5v9" stroke="currentColor" stroke-width="1.2"/></svg>',
    tool: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M9.8 2.2a3.3 3.3 0 0 0-3.9 4.4L2.3 10.2a1.3 1.3 0 0 0 1.8 1.8l3.6-3.6a3.3 3.3 0 0 0 4.4-3.9l-2 2-1.6-.5-.5-1.6 2-2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    skill: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m8 2 1.7 3.6 3.8.5-2.8 2.6.7 3.8L8 10.7l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5L8 2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    guard: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.75 13 3.5v4c0 3-2.2 5.4-5 6.75C5.2 12.9 3 10.5 3 7.5v-4L8 1.75Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    plug: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2v3M10 2v3M4.5 5h7v2.5a3.5 3.5 0 0 1-7 0V5ZM8 11v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    brain: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="1.1" opacity=".6"/></svg>',
    doc: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="2" width="9" height="12" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 6h4M6 8.5h4M6 11h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    hitl: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 13.5a4.5 4.5 0 0 1 9 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    play: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3.5v9l7-4.5-7-4.5Z" fill="#14ae5c"/></svg>',
    stop: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="#dc3412"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>',
    lock: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3.25" y="7" width="9.5" height="6.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
  };

  /* What the artifact is made of. A request carries some of it; the rest
     is filled from what each sample artifact is known to use. */
  var KNOWN = {
    'Lead Scoring Agent': { model: 'GPT-4.1', tools: ['CRM lookup', 'Firmographic enrichment'], skills: ['Score a lead', 'Explain a score'], guards: ['No personal data in notes'] },
    'Churn Risk Predictor': { model: 'Claude Sonnet', tools: ['Usage history reader', 'Support ticket history'], skills: ['Rate churn risk'], guards: ['Hide account owner details'] },
    'Expense Policy Checker': { model: 'GPT-4.1', tools: ['Receipt reader', 'Policy lookup'], skills: ['Match a claim to policy'], guards: ['Never approve over the limit'] },
    'Contract Review Flow': { model: 'Claude Sonnet', agents: ['Clause extractor', 'Risk scorer', 'Summary writer'], tools: ['Contract reader', 'Clause library'], checkpoints: ['Legal review of high-risk contracts'] },
    'Month-end Close Checklist': { model: 'GPT-4o mini', agents: ['Checklist tracker', 'Owner nudger'], tools: ['NetSuite close tasks', 'Teams messenger'], checkpoints: ['Controller sign-off'] }
  };
  function parts(w) {
    var k = KNOWN[w.name] || {};
    var p = {
      model: w.model || k.model || 'GPT-4.1',
      tools: (w.tools && w.tools.length ? w.tools : k.tools) || ['Knowledge search', 'Document reader'],
      skills: (w.skills && w.skills.length ? w.skills : k.skills) || ['Summarise a result'],
      guards: (w.guards && w.guards.length ? w.guards : k.guards) || ['Toxicity check'],
      agents: (w.agents && w.agents.length ? w.agents : k.agents) || ['Intake agent', 'Worker agent', 'Summary agent'],
      checkpoints: (w.checkpoints && w.checkpoints.length ? w.checkpoints : k.checkpoints) || ['Human review before results are sent']
    };
    p.goal = w.desc || '';
    p.backstory = 'Built by the ' + (w.workspace || CR.HOME) + ' team' + (w.publisher ? ', published by ' + w.publisher : '') + '. It keeps to its tools and asks before acting on anything unusual.';
    p.steps = ['Read the request and what it refers to', 'Use its tools to gather what it needs', 'Return a short result with its reasoning'];
    return p;
  }

  /* Field by field: what the publisher shared and what stays hidden. A
     publish request made here carries it; for the others it is read off
     the artifact, with private details (keys, links, data) hidden. */
  var SETS = {
    agent: 'agent_goal agent_backstory task_description expected_output llm_model tools_list guardrails_list max_iter',
    apiTool: 'connection_id connection_payload pydantic_output_schema',
    modelInt: 'model custom_llm_provider api_key base_url api_version',
    apiInt: 'endpoint auth_type request_method bearer_token timeout',
    skill: 'skill_name skill_description management_tag adls_directory',
    guardrail: 'guardrail_name guardrail_type guardrail_desc guardrail_content attached_tool'
  };
  var WHY = {};
  [['Secret', 'api_key bearer_token client_secret client_id access_key_id secret_access_key custom_variables'],
   ['Link', 'endpoint base_url site_id drive_id adls_directory connection_id connection_payload bucket_name bucket_url'],
   ['Data', 'files knowledge_base']].forEach(function (p) { p[1].split(' ').forEach(function (k) { WHY[k] = p[0]; }); });
  var WORDS = { llm: 'LLM', id: 'ID', url: 'URL', api: 'API', iter: 'iterations', adls: 'ADLS', pydantic: 'Pydantic', desc: 'description' };
  var LABEL = { adls_directory: 'Skill files', pydantic_output_schema: 'Output schema', custom_llm_provider: 'Provider', connection_id: 'Connection', connection_payload: 'Connection payload', max_iter: 'Max iterations', llm_model: 'LLM model' };
  function label(k) { if (LABEL[k]) return LABEL[k]; var t = k.split('_').map(function (w) { return WORDS[w] || w; }).join(' '); return t[0].toUpperCase() + t.slice(1); }
  function sharingOf(w) {
    if (w.sharing && w.sharing.length) return w.sharing;
    var p = parts(w), keys = w.secrets || [], hidden = {};
    (w.needs || []).forEach(function (n) { (n.fields || []).forEach(function (f) { hidden[n.name + '|' + f.label] = 1; }); });
    var res = function (rk, name, type, set) {
      return { rk: rk, name: name, type: type, fields: SETS[set].split(' ').map(function (k) {
        var why = WHY[k] || '', lb = label(k);
        var shared = w.needs ? !hidden[name + '|' + lb] && (!why || keys.indexOf(name) >= 0) : (!why || (why === 'Secret' && keys.indexOf(name) >= 0));
        return { label: lb, why: why, shared: shared };
      }) };
    };
    var out = [];
    (w.kind === 'automation' ? p.agents : [w.name]).forEach(function (a) { out.push(res('agents', a, 'Standalone agent', 'agent')); });
    p.tools.forEach(function (t) { out.push(res('tools', t, 'API tool', 'apiTool')); });
    (w.shared || []).forEach(function (n) { out.push(res('integrations', n, 'Integration', 'apiInt')); });
    out.push(res('models', p.model, 'Model integration', 'modelInt'));
    p.skills.forEach(function (t) { out.push(res('skills', t, 'Skill', 'skill')); });
    p.guards.forEach(function (t) { out.push(res('guardrails', t, 'Guardrail', 'guardrail')); });
    return out;
  }
  var GROUPS = [['agents', 'Agents', 'agent'], ['tools', 'Tools', 'tool'], ['integrations', 'Integrations', 'plug'], ['models', 'Models', 'brain'], ['skills', 'Skills', 'skill'], ['guardrails', 'Guardrails', 'guard']];

  var css = document.createElement('style');
  css.textContent = [
    '.cqv{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(18,18,18,.65);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);color:var(--text-primary);font-family:var(--font-geist);opacity:0;transition:opacity .18s ease}',
    '.cqv-box{width:min(1240px,100%);height:min(820px,100%);display:flex;flex-direction:column;overflow:hidden;border-radius:14px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 24px 60px rgba(0,0,0,.5);transform:translateY(8px) scale(.99);transition:transform .22s cubic-bezier(.2,.8,.2,1)}',
    '.cqv.is-shown .cqv-box{transform:none}',
    '.cqv-tabs{display:flex;gap:20px;padding:0 16px;border-bottom:1px solid var(--strokes-line-3);flex:none}',
    '.cqv-tabs button{position:relative;padding:12px 0;border:0;background:none;cursor:pointer;color:var(--text-teritiary);font:500 13px/18px var(--font-geist)}',
    '.cqv-tabs button[aria-selected="true"]{color:var(--text-primary)}',
    '.cqv-tabs button[aria-selected="true"]::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px 2px 0 0;background:var(--text-coloured-blue)}',
    '.cqv-pane{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}',
    '.cqv-pane > *{flex:none}',
    '.cqv-sum{display:flex;gap:8px}',
    '.cqv-sum div{flex:1 1 0;padding:10px 12px;border-radius:10px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2)}',
    '.cqv-sum b{display:block;font:500 18px/24px var(--font-geist)}',
    '.cqv-sum span{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqv-warn{display:flex;gap:8px;padding:8px 10px;border-radius:8px;background:var(--backgrounds-badge-orange);border:1px solid var(--strokes-colour-orange);color:var(--text-coloured-orange);font:400 12px/16px var(--font-geist)}',
    '.cqv-grp{color:var(--text-teritiary);font:500 11px/16px var(--font-geist);letter-spacing:.04em;margin-top:4px}',
    '.cqv-res{border-radius:10px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);overflow:hidden}',
    '.cqv-res.is-hl{border-color:var(--strokes-card-selected,#0d99ff)}',
    '.cqv-res__h{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:0;background:none;cursor:pointer;text-align:left;color:inherit}',
    '.cqv-res__ic{width:28px;height:28px;flex:none;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:var(--backgrounds-card-bg-4);color:var(--text-secondary)}',
    '.cqv-res__h .tx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}',
    '.cqv-res__h b{font:500 13px/18px var(--font-geist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cqv-res__h small{color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqv-res__n{flex:none;color:var(--text-teritiary);font:400 12px/16px var(--font-geist)}',
    '.cqv-res__chev{flex:none;color:var(--text-teritiary);transition:transform .15s}',
    '.cqv-res.is-open .cqv-res__chev{transform:rotate(180deg)}',
    '.cqv-res__f{display:flex;flex-direction:column;padding:0 12px 8px}',
    '.cqv-fr{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px dashed var(--strokes-line-3);font:400 12px/16px var(--font-geist)}',
    '.cqv-fr .l{flex:1 1 auto;min-width:0}',
    '.cqv-why{padding:0 5px;border-radius:4px;border:1px solid var(--strokes-card-default);color:var(--text-teritiary);font:400 10px/14px var(--font-geist)}',
    '.cqv-why.is-secret{border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.cqv-st{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:10px;font:500 11px/14px var(--font-geist);white-space:nowrap}',
    '.cqv-st.is-on{background:var(--backgrounds-badge-green);color:var(--text-coloured-green)}',
    '.cqv-st.is-off{background:var(--backgrounds-card-bg-4);color:var(--text-teritiary)}',
    '.cqv-st.is-key{background:var(--backgrounds-badge-orange);color:var(--text-coloured-orange)}',
    '.cqv.is-shown{opacity:1}',
    '.cqv button{font-family:inherit}',
    '.cqv-top{flex:none;height:52px;display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--backgrounds-card-bg-5);border-bottom:1px solid var(--strokes-line-1)}',
    '.cqv-back{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--strokes-type-default,var(--strokes-card-default));background:var(--backgrounds-card-bg-2);color:var(--text-secondary);cursor:pointer}',
    '.cqv-title{display:flex;align-items:center;gap:8px;min-width:0;font:500 15px/20px var(--font-geist);letter-spacing:-.5px}',
    '.cqv-title .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cqv-tag{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:6px;background:var(--backgrounds-card-bg-4);color:var(--text-secondary);font:500 12px/16px var(--font-geist);white-space:nowrap}',
    '.cqv-tag--view{background:var(--backgrounds-badge-blue);color:var(--text-coloured-blue)}',
    '.cqv-sp{flex:1 1 auto}',
    '.cqv-btn{height:32px;padding:0 14px;border-radius:8px;border:0;cursor:pointer;font:500 14px/20px var(--font-geist);letter-spacing:-.5px}',
    '.cqv-btn--ghost{background:none;color:var(--text-secondary);border:1px solid var(--strokes-card-default)}',
    '.cqv-btn--ghost:hover{color:var(--text-primary)}',
    '.cqv-btn--primary{background:var(--backgrounds-button-primary);color:#fff}',
    '.cqv-main{flex:1 1 auto;min-height:0;display:flex}',
    '.cqv-canvas{position:relative;flex:1 1 auto;min-width:0;overflow:auto;background-color:var(--backgrounds-page-bg-1,#121212);background-image:radial-gradient(circle,var(--strokes-line-3) 1.1px,transparent 1.2px);background-size:16px 16px}',
    '.cqv-stage{position:relative;margin:32px auto 48px;padding:0}',
    '.cqv-wires{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
    '.cqv-wires path{fill:none;stroke:var(--strokes-line-1);stroke-width:1.5}',
    '.cqv-node{position:absolute;display:flex;flex-direction:column;gap:4px;align-items:flex-start}',
    '.cqv-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px 5px 10px;border-radius:999px;background:var(--backgrounds-card-bg-5);border:1px solid var(--strokes-line-1);font:500 14px/20px var(--font-geist)}',
    '.cqv-b{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 6px;border-radius:8px;font:500 12px/16px var(--font-geist);border:1px solid transparent}',
    '.cqv-b--agent{background:var(--backgrounds-badge-indigo);border-color:var(--strokes-colour-indigo);color:var(--text-coloured-indigo)}',
    '.cqv-b--hitl{background:var(--backgrounds-badge-pink,var(--backgrounds-badge-red));border-color:var(--strokes-colour-pink,var(--strokes-colour-red));color:var(--text-coloured-pink,var(--text-coloured-red))}',
    '.cqv-b--model{background:var(--backgrounds-badge-blue);border-color:var(--strokes-colour-blue);color:var(--text-coloured-blue)}',
    '.cqv-b--tool{background:var(--backgrounds-badge-purple);border-color:var(--strokes-colour-purple);color:var(--text-coloured-purple)}',
    '.cqv-b--guard{background:var(--backgrounds-badge-red);border-color:var(--strokes-colour-red);color:var(--text-coloured-red)}',
    '.cqv-b--skill{background:var(--backgrounds-badge-green);border-color:var(--strokes-colour-green);color:var(--text-coloured-green)}',
    '.cqv-b--steps{background:var(--backgrounds-badge-orange);border-color:var(--strokes-colour-orange);color:var(--text-coloured-orange)}',
    '.cqv-card{box-sizing:border-box;padding:14px 16px;border-radius:12px;background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-line-3);display:flex;flex-direction:column;gap:10px;box-shadow:0 8px 28px rgba(0,0,0,.25)}',
    '.cqv-card.is-click{cursor:pointer}',
    '.cqv-card.is-click:hover{border-color:var(--strokes-line-1)}',
    '.cqv-node.is-sel .cqv-card{border-color:var(--backgrounds-button-primary);box-shadow:0 0 0 1px var(--backgrounds-button-primary)}',
    '.cqv-card .t{font:500 14px/20px var(--font-geist)}',
    '.cqv-card .s{color:var(--text-secondary);font:400 12px/16px var(--font-geist)}',
    '.cqv-card .k{color:var(--text-teritiary);font:400 11px/14px var(--font-geist)}',
    '.cqv-card ol{margin:0;padding-left:16px;color:var(--text-primary);font:400 12px/18px var(--font-geist)}',
    '.cqv-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.cqv-chip{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:7px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-4);color:var(--text-primary);cursor:pointer;font:400 12px/16px var(--font-geist)}',
    '.cqv-chip:hover{border-color:var(--strokes-card-selected)}',
    '.cqv-chip svg{color:var(--text-teritiary)}',
    '.cqv-side{flex:none;width:420px;display:flex;flex-direction:column;min-height:0;background:var(--backgrounds-card-bg-5);border-left:1px solid var(--strokes-line-3)}',
    '.cqv-lbl{color:var(--text-teritiary);font:500 12px/16px var(--font-geist);letter-spacing:.02em}',
    '.cqv-p{margin:0;color:var(--text-secondary);font:400 13px/19px var(--font-geist)}',
    '.cqv-kv{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--strokes-line-3);font:400 13px/18px var(--font-geist)}',
    '.cqv-kv span{color:var(--text-teritiary)}',
    '.cqv-kv b{font-weight:500;text-align:right}',
    '.cqv-note{width:100%;box-sizing:border-box;min-height:64px;resize:vertical;padding:8px 10px;border-radius:8px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-type-default-bg-1,var(--backgrounds-card-bg-2));color:var(--text-primary);font:400 13px/18px var(--font-geist)}',
    /* the modal, for tools, skills and guardrails */
    '.cqv-modal{position:fixed;inset:0;z-index:910;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(18,18,18,.65)}',
    '.cqv-dlg{width:min(520px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;border-radius:12px;background:var(--backgrounds-page-bg-2);border:1px solid var(--strokes-card-default);box-shadow:0 16px 40px rgba(0,0,0,.45)}',
    '.cqv-dlg__h{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--strokes-line-3)}',
    '.cqv-dlg__h h3{flex:1 1 auto;margin:0;font:500 16px/24px var(--font-geist)}',
    '.cqv-dlg__b{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px}',
    '.cqv-x{width:28px;height:28px;border-radius:6px;border:0;background:none;cursor:pointer;color:var(--text-secondary);display:inline-flex;align-items:center;justify-content:center}',
    '.cqv-x:hover{background:var(--backgrounds-card-bg-4);color:var(--text-primary)}',
    '.cqv-field{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--backgrounds-card-bg-2);border:1px solid var(--strokes-line-3);font:400 13px/18px var(--font-geist)}',
    '.cqv-field span{flex:1 1 auto;color:var(--text-teritiary)}',
    '.cqv-field b{font-weight:400;color:var(--text-primary)}',
    '.cqv-field.is-priv b{color:var(--text-teritiary);display:inline-flex;align-items:center;gap:4px}',
    '.cqr-open{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--strokes-card-default);background:var(--backgrounds-card-bg-2);color:var(--text-primary);cursor:pointer;font:500 13px/18px var(--font-geist);align-self:flex-start}',
    '.cqr-open:hover{border-color:var(--strokes-card-selected)}'
  ].join('\n');
  document.head.appendChild(css);

  var V = null; /* { w, role, p, sel } */

  function stageFor(w, role) { var s = CR.stageOf(w); return s.state === 'waiting' && s.stages[s.i].role === role ? s.stages[s.i] : null; }

  function open(w, role) {
    if (!w) return;
    close();
    V = { w: w, role: role, p: parts(w), sel: null, tab: 'shared', open: {}, sh: sharingOf(w) };
    if (V.sh[0]) V.open[V.sh[0].name] = true;
    var st = stageFor(w, role);
    var el = document.createElement('section');
    el.className = 'cqv'; el.id = 'cqv';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Review ' + w.name);
    el.innerHTML = '<div class="cqv-box">' +
      '<header class="cqv-top">' +
        '' +
        '<span class="cqv-title">' + (w.kind === 'automation' ? IC.flow : IC.agent) + '<span class="n">' + E(w.name) + '</span></span>' +
        '<span class="cqv-tag cqv-tag--view">' + IC.eye + 'View only</span>' +
        '<span class="cqv-tag">' + E(w.workspace || CR.HOME) + '</span>' + CR.typeTag(w) +
        '<span class="cqv-sp"></span>' +
        (st ? '<button type="button" class="cqv-btn cqv-btn--ghost" data-cqv-decide="0">Reject</button><button type="button" class="cqv-btn cqv-btn--primary" data-cqv-decide="1">Approve</button>'
            : CR.pill(w)) +
        '<button type="button" class="cqv-x" data-cqv-close aria-label="Close">' + IC.close + '</button>' +
      '</header>' +
      '<div class="cqv-main"><div class="cqv-canvas" id="cqvCanvas"><div class="cqv-stage" id="cqvStage"><svg class="cqv-wires" id="cqvWires"></svg></div></div>' +
        '<aside class="cqv-side" id="cqvSide"></aside></div></div>';
    document.body.appendChild(el);
    if (w.kind === 'automation') paintFlow(); else paintAgent();
    paintSide();
    /* The agent layout is wide: fit it to the canvas. */
    requestAnimationFrame(function () {
      var c = $('cqvCanvas'), st2 = $('cqvStage'); if (!c || !st2) return;
      var z = Math.min(1, (c.clientWidth - 48) / st2.offsetWidth); if (z < 1) st2.style.zoom = z.toFixed(3);
    });
    requestAnimationFrame(function () { el.classList.add('is-shown'); });
  }
  function close() { var el = $('cqv'); if (el) el.remove(); closeModal(); V = null; }

  function chips(list, kind) {
    var ic = { tool: IC.tool, skill: IC.skill, guardrail: IC.guard }[kind];
    return '<div class="cqv-chips">' + list.map(function (n) { return '<button type="button" class="cqv-chip" data-cqv-item="' + kind + '|' + E(n) + '">' + ic + E(n) + '</button>'; }).join('') + '</div>';
  }
  /* An agent, laid out as the builder lays it out: model and skills on the
     left, the agent in the middle under its instructions, tools and
     guardrails on the right. */
  function paintAgent() {
    var p = V.p, s = $('cqvStage'), W = 1000;
    s.style.width = W + 'px'; s.style.height = '560px';
    var box = function (x, y, w, badge, inner, id) {
      return '<div class="cqv-node" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px" data-cqv-box="' + id + '">' + badge + '<div class="cqv-card" style="width:100%">' + inner + '</div></div>';
    };
    s.insertAdjacentHTML('beforeend',
      box(350, 0, 300, '<span class="cqv-b cqv-b--steps">' + IC.doc + 'Instructions</span>', '<span class="k">Steps to follow</span><ol>' + p.steps.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ol>', 'ins') +
      box(350, 190, 300, '<span class="cqv-b cqv-b--agent">' + IC.agent + E(V.w.name) + '</span>', '<div><span class="k">Goal</span><div class="s" style="color:var(--text-primary)">' + E(p.goal) + '</div></div><div><span class="k">Backstory</span><div class="s">' + E(p.backstory) + '</div></div>', 'agent') +
      box(0, 140, 260, '<span class="cqv-b cqv-b--model">' + IC.brain + 'Model</span>', '<div class="t">' + E(p.model) + '</div><span class="s">Model integration</span>', 'model') +
      box(0, 330, 260, '<span class="cqv-b cqv-b--skill">' + IC.skill + 'Skills</span>', chips(p.skills, 'skill'), 'skills') +
      box(740, 140, 260, '<span class="cqv-b cqv-b--tool">' + IC.tool + 'Tools</span>', chips(p.tools, 'tool'), 'tools') +
      box(740, 330, 260, '<span class="cqv-b cqv-b--guard">' + IC.guard + 'Guardrails</span>', chips(p.guards, 'guardrail'), 'guards'));
    requestAnimationFrame(function () {
      var r = function (id) { var el = s.querySelector('[data-cqv-box="' + id + '"] .cqv-card'); return { x: el.parentNode.offsetLeft, y: el.parentNode.offsetTop + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; };
      var a = r('agent'), ins = r('ins'), d = '';
      d += 'M' + (a.x + a.w / 2) + ' ' + (ins.y + ins.h) + 'V' + (a.y - 28);
      ['model', 'skills'].forEach(function (k) { var b = r(k); d += 'M' + (b.x + b.w) + ' ' + (b.y + b.h / 2) + 'H' + (b.x + b.w + 22) + 'V' + (a.y + a.h / 2) + 'H' + a.x; });
      ['tools', 'guards'].forEach(function (k) { var b = r(k); d += 'M' + b.x + ' ' + (b.y + b.h / 2) + 'H' + (b.x - 22) + 'V' + (a.y + a.h / 2) + 'H' + (a.x + a.w); });
      $('cqvWires').innerHTML = '<path d="' + d + '"/>';
    });
  }
  /* An automation, top to bottom: Start, its agents, its checkpoints, End. */
  function paintFlow() {
    var p = V.p, s = $('cqvStage');
    var nodes = [{ id: 'start' }].concat(p.agents.map(function (a, i) { return { id: 'a' + i, type: 'agent', name: a, tools: p.tools.filter(function (_, j) { return j % p.agents.length === i; }) }; }))
      .concat(p.checkpoints.map(function (c, i) { return { id: 'h' + i, type: 'hitl', name: c }; })).concat([{ id: 'end' }]);
    V.nodes = nodes;
    s.style.width = '420px';
    var y = 0, html = '';
    nodes.forEach(function (n) {
      var inner;
      if (n.id === 'start') inner = '<span class="cqv-pill">' + IC.play + 'Start</span>';
      else if (n.id === 'end') inner = '<span class="cqv-pill">' + IC.stop + 'End</span>';
      else if (n.type === 'agent') inner = '<span class="cqv-b cqv-b--agent">' + IC.agent + 'Agent</span><div class="cqv-card is-click" data-cqv-pick="' + n.id + '" style="width:320px"><div class="t">' + E(n.name) + '</div>' +
          '<div class="s">' + (n.tools.length ? 'Uses ' + E(n.tools.join(', ')) : 'Runs on ' + E(p.model)) + '</div>' +
          '<div class="cqv-chips"><span class="cqv-chip" style="cursor:default">' + IC.brain + E(p.model) + '</span>' + n.tools.map(function (t) { return '<button type="button" class="cqv-chip" data-cqv-item="tool|' + E(t) + '">' + IC.tool + E(t) + '</button>'; }).join('') + '</div></div>';
      else inner = '<span class="cqv-b cqv-b--hitl">' + IC.hitl + 'Human check point</span><div class="cqv-card" style="width:320px"><div class="t">' + E(n.name) + '</div><div class="s">Waits for a person to approve before it carries on</div></div>';
      html += '<div class="cqv-node" data-cqv-node="' + n.id + '" style="top:' + y + 'px">' + inner + '</div>';
      y += 1;
    });
    s.insertAdjacentHTML('beforeend', html);
    requestAnimationFrame(function () {
      var yy = 0, d = '', prev = null;
      s.querySelectorAll('.cqv-node').forEach(function (el) {
        el.style.top = yy + 'px'; el.style.left = (210 - el.offsetWidth / 2) + 'px';
        if (prev) { var y1 = prev.top + prev.h + 2, y2 = yy - 4; d += 'M210 ' + y1 + 'V' + y2 + 'M205 ' + (y2 - 6) + 'L210 ' + y2 + 'L215 ' + (y2 - 6); }
        prev = { top: yy, h: el.offsetHeight };
        yy += el.offsetHeight + 52;
      });
      s.style.height = yy + 'px';
      $('cqvWires').innerHTML = '<path d="' + d + '"/>';
    });
  }

  /* The right side: what was submitted and what the admin is deciding,
     or the selected agent of an automation. */
  function paintSide() {
    var w = V.w, p = V.p, side = $('cqvSide'), st = stageFor(w, V.role);
    var tabs = '<div class="cqv-tabs" role="tablist"><button type="button" role="tab" data-cqv-tab="shared" aria-selected="' + (V.tab === 'shared') + '">What’s shared</button>' +
      '<button type="button" role="tab" data-cqv-tab="req" aria-selected="' + (V.tab === 'req') + '">Request</button></div>';
    if (V.tab === 'req') {
      side.innerHTML = tabs + '<div class="cqv-pane">' +
        '<span class="cqv-lbl">ABOUT</span><p class="cqv-p">' + E(w.about || w.desc) + '</p>' +
        '<div>' +
          '<div class="cqv-kv"><span>Workspace</span><b>' + E(w.workspace || CR.HOME) + '</b></div>' +
          '<div class="cqv-kv"><span>Requested by</span><b>' + E(w.requester || 'Savio Govindu') + '</b></div>' +
          (w.publisher ? '<div class="cqv-kv"><span>Publisher</span><b>' + E(w.publisher) + '</b></div>' : '') +
          (w.industry ? '<div class="cqv-kv"><span>Industry · Domain</span><b>' + E(w.industry + ' · ' + (w.func || '—')) + '</b></div>' : '') +
        '</div>' +
        (st ? '<span class="cqv-lbl">YOUR DECISION · ' + E(st.name.toUpperCase()) + '</span><textarea class="cqv-note" id="cqvNote" placeholder="Note for the requester (optional)">' + E(V.note || '') + '</textarea>' +
              '<p class="cqv-p">Approve or reject from the top bar.</p>' : '') +
        '</div>';
      return;
    }
    var all = 0, on = 0, keys = [];
    V.sh.forEach(function (r) { r.fields.forEach(function (f) { all++; if (f.shared) { on++; if (f.why === 'Secret') keys.push(r.name); } }); });
    keys = keys.filter(function (k, i) { return keys.indexOf(k) === i; });
    var html = '<div class="cqv-sum"><div><b>' + on + '</b><span>Shared</span></div><div><b>' + (all - on) + '</b><span>Kept hidden</span></div><div><b>' + V.sh.length + '</b><span>Resources</span></div></div>' +
      (keys.length ? '<div class="cqv-warn">' + IC.lock + '<span>The publisher’s keys are shared for ' + E(keys.join(', ')) + '. Anyone who adds it runs on their account.</span></div>' : '') +
      '<p class="cqv-p">' + (w.flow === 'publish' ? 'What the publisher chose to send with it. Hidden details are filled in by whoever adds it.' : 'What the publisher shared. Hidden details are filled in by your workspace after it is added.') + '</p>';
    GROUPS.forEach(function (g) {
      var list = V.sh.filter(function (r) { return r.rk === g[0]; });
      if (!list.length) return;
      html += '<span class="cqv-grp">' + g[1].toUpperCase() + '</span>';
      list.forEach(function (r) {
        var n = r.fields.filter(function (f) { return f.shared; }).length, open = !!V.open[r.name];
        html += '<div class="cqv-res' + (open ? ' is-open' : '') + (V.hl === r.name ? ' is-hl' : '') + '" data-cqv-res-box="' + E(r.name) + '">' +
          '<button type="button" class="cqv-res__h" data-cqv-res="' + E(r.name) + '"><span class="cqv-res__ic">' + (IC[g[2]] || IC.tool) + '</span>' +
            '<span class="tx"><b>' + E(r.name) + '</b><small>' + E(r.type) + '</small></span><span class="cqv-res__n">' + n + ' of ' + r.fields.length + ' shared</span>' +
            '<svg class="cqv-res__chev" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          (open ? '<div class="cqv-res__f">' + r.fields.map(function (f) {
            var st2 = f.shared ? (f.why === 'Secret' ? '<span class="cqv-st is-key">' + IC.eye + 'Shared key</span>' : '<span class="cqv-st is-on">' + IC.eye + 'Shared</span>') : '<span class="cqv-st is-off">' + IC.lock + 'Hidden</span>';
            return '<div class="cqv-fr"><span class="l">' + E(f.label) + '</span>' + (f.why ? '<span class="cqv-why' + (f.why === 'Secret' ? ' is-secret' : '') + '">' + E(f.why) + '</span>' : '') + st2 + '</div>';
          }).join('') + '</div>' : '') + '</div>';
      });
    });
    side.innerHTML = tabs + '<div class="cqv-pane" id="cqvPane">' + html + '</div>';
  }
  /* From the canvas: open that resource's fields on the right. */
  function focusRes(name) {
    if (!V.sh.some(function (r) { return r.name === name; })) return;
    V.tab = 'shared'; V.open[name] = true; V.hl = name; paintSide();
    var el = document.querySelector('[data-cqv-res-box="' + name.replace(/"/g, '\\"') + '"]'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* A tool, skill or guardrail opens in a modal. */
  var DESC = { tool: 'Calls out to a connected system and hands the result back to the agent.', skill: 'A reusable instruction set the agent follows for this kind of task.', guardrail: 'A rule checked on every run; a result that breaks it is held back.' };
  var FIELDS = {
    tool: [['Type', 'API tool'], ['Output schema', 'Shared'], ['Connection', null], ['Connection payload', null]],
    skill: [['Skill name', 'Shared'], ['Description', 'Shared'], ['Management tag', 'Shared'], ['Skill files', null]],
    guardrail: [['Type', 'Content rule'], ['Description', 'Shared'], ['Rules', 'Shared'], ['Applies to', 'Every run']]
  };
  function openModal(kind, name) {
    closeModal();
    var ic = { tool: IC.tool, skill: IC.skill, guardrail: IC.guard }[kind];
    var cls = { tool: 'cqv-b--tool', skill: 'cqv-b--skill', guardrail: 'cqv-b--guard' }[kind];
    var m = document.createElement('div');
    m.className = 'cqv-modal'; m.id = 'cqvModal';
    m.innerHTML = '<div class="cqv-dlg" role="dialog" aria-modal="true" aria-label="' + E(name) + '">' +
      '<div class="cqv-dlg__h"><span class="cqv-b ' + cls + '">' + ic + kind.charAt(0).toUpperCase() + kind.slice(1) + '</span><h3>' + E(name) + '</h3><button type="button" class="cqv-x" data-cqv-mclose aria-label="Close">' + IC.close + '</button></div>' +
      '<div class="cqv-dlg__b"><p class="cqv-p">' + DESC[kind] + ' Used by ' + E(V.w.name) + '.</p>' +
        '<span class="cqv-lbl">DETAILS</span>' +
        (function () {
          var r = V.sh.filter(function (x) { return x.name === name; })[0];
          if (!r) return FIELDS[kind].map(function (f) { return '<div class="cqv-field' + (f[1] ? '' : ' is-priv') + '"><span>' + f[0] + '</span><b>' + (f[1] ? E(f[1]) : IC.lock + 'Kept private') + '</b></div>'; }).join('');
          return r.fields.map(function (f) { return '<div class="cqv-field' + (f.shared ? '' : ' is-priv') + '"><span>' + E(f.label) + (f.why ? ' · ' + E(f.why) : '') + '</span><b>' + (f.shared ? IC.eye + ' Shared' : IC.lock + 'Hidden') + '</b></div>'; }).join('');
        })() +
        '<p class="cqv-p">Private details stay with the publisher and are filled in by whoever adds it.</p>' +
      '</div></div>';
    document.body.appendChild(m);
  }
  function closeModal() { var m = $('cqvModal'); if (m) m.remove(); }

  document.addEventListener('click', function (e) {
    var t = e.target, x;
    if ($('cqvModal') && (t.id === 'cqvModal' || t.closest('[data-cqv-mclose]'))) return closeModal();
    if (!V) return;
    if ((x = t.closest('[data-cqv-item]'))) { var k = x.getAttribute('data-cqv-item').split('|'); e.stopPropagation(); focusRes(k.slice(1).join('|')); return openModal(k[0], k.slice(1).join('|')); }
    if ((x = t.closest('[data-cqv-tab]'))) { var nt = $('cqvNote'); if (nt) V.note = nt.value; V.tab = x.getAttribute('data-cqv-tab'); return paintSide(); }
    if ((x = t.closest('[data-cqv-res]'))) { var rn = x.getAttribute('data-cqv-res'); V.open[rn] = !V.open[rn]; V.hl = null; return paintSide(); }
    if (t.id === 'cqv') return close();
    if (t.closest('[data-cqv-close]')) return close();
    if ((x = t.closest('[data-cqv-pick]'))) {
      V.sel = x.getAttribute('data-cqv-pick');
      document.querySelectorAll('.cqv-node').forEach(function (n) { n.classList.toggle('is-sel', n.getAttribute('data-cqv-node') === V.sel); });
      var node = (V.nodes || []).filter(function (n) { return n.id === V.sel; })[0];
      return node ? focusRes(node.name) : paintSide();
    }
    if (t.closest('[data-cqv-desel]')) { V.sel = null; document.querySelectorAll('.cqv-node.is-sel').forEach(function (n) { n.classList.remove('is-sel'); }); return paintSide(); }
    if ((x = t.closest('[data-cqv-decide]'))) {
      var st = stageFor(V.w, V.role); if (!st) return;
      var ok = x.getAttribute('data-cqv-decide') === '1', note = ($('cqvNote') || {}).value || V.note || '', name = V.w.name;
      CR.decide(V.w.ref, st.k, ok, note.trim());
      close();
      if (window.mkwsSay) window.mkwsSay((ok ? 'Approved ' : 'Rejected ') + name);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('cqvModal')) { e.stopPropagation(); return closeModal(); }
    if (V) { e.stopPropagation(); close(); }
  }, true);

  window.cqView = { open: open, close: close };
})();
