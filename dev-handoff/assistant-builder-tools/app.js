/* Assistant Builder — Tools panel & Human checkpoint (prototype logic).
   See README.md › "Data contract" for the config this produces. */

(() => {
  // Segment control
  document.querySelectorAll('.segment-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.segment-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    });
  });

  // Zoom menu
  const zoomTrigger = document.getElementById('zoom-trigger');
  const zoomMenu = document.getElementById('zoom-menu');
  const zoomValue = document.getElementById('zoom-value');
  const setZoomOpen = (open) => {
    zoomMenu.hidden = !open;
    zoomTrigger.setAttribute('aria-expanded', String(open));
  };
  zoomTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    setZoomOpen(zoomMenu.hidden);
  });
  zoomMenu.querySelectorAll('.zoom-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      zoomMenu.querySelectorAll('.zoom-option').forEach((o) => o.setAttribute('aria-selected', String(o === opt)));
      zoomValue.textContent = opt.dataset.zoom;
      setZoomOpen(false);
    });
  });

  // Tools panel
  const panel = document.getElementById('tools-panel');
  document.getElementById('close-panel').addEventListener('click', () => { panel.hidden = true; });
  document.querySelector('[data-open-tools]').addEventListener('click', () => {
    panel.hidden = false;
    setOptionsOpen(true);
    search.focus();
  });

  // Tool combobox
  const combo = document.getElementById('tool-combo');
  const search = document.getElementById('tool-search');
  const optionsWrap = document.getElementById('tool-options-wrap');
  const options = [...optionsWrap.querySelectorAll('.option')];
  const empty = optionsWrap.querySelector('.options-empty');
  const setOptionsOpen = (open) => {
    optionsWrap.hidden = !open;
    combo.classList.toggle('is-open', open);
    search.setAttribute('aria-expanded', String(open));
  };
  search.addEventListener('focus', () => setOptionsOpen(true));
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    options.forEach((o) => {
      const match = o.textContent.toLowerCase().includes(q);
      o.hidden = !match;
      if (match) shown++;
    });
    empty.hidden = shown > 0;
    setOptionsOpen(true);
  });
  // ── Selected tool pills + human checkpoint ────────────────
  // Mirrors the assistant config: hitl_enabled + tools{ [assistant_tools.id]: { verify_input, verify_output } }.
  const CONDITION_MAX = 500;
  const CHECKS = [
    { key: 'verify_input', label: 'Before', hint: 'Before it runs' },
    { key: 'verify_output', label: 'After', hint: 'After it runs' },
  ];
  const catalog = new Map(options.map((o) => [o.dataset.toolId, {
    name: o.querySelector('.option-main > span:last-child').textContent.trim(),
    iconHTML: o.querySelector('.option-icon').outerHTML,
  }]));
  const newRule = () => ({
    verify_input: { enabled: false, condition: '' },
    verify_output: { enabled: false, condition: '' },
  });
  const state = { hitl: true, tools: new Map() };

  // Example setup so the checkpoint list isn't empty on first view.
  const seed = (i, fn) => { const r = newRule(); fn(r); state.tools.set(options[i].dataset.toolId, r); };
  seed(0, (r) => {
    r.verify_input = { enabled: true, condition: 'The retrieval query is about employee PII' };
    r.verify_output.enabled = true;
  });
  seed(2, (r) => {
    r.verify_output = { enabled: true, condition: 'The result contains a client phone number or home address' };
  });
  seed(4, () => {});

  const pills = document.getElementById('tool-pills');
  const hitlSwitch = document.getElementById('hitl-switch');
  const hcBody = document.getElementById('hc-body');
  const hcList = document.getElementById('hc-list');
  const nodeText = document.getElementById('tools-node-text');

  const esc = (str) => str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasPause = (rule) => rule.verify_input.enabled || rule.verify_output.enabled;
  const pencil = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M7.6 2.4l2 2L4.2 9.8H2.2v-2l5.4-5.4z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>';
  const cross = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3.5 3.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  // Only tools with a pause are written; a condition is null unless its pause is on and non-blank.
  const getConfig = () => {
    const tools = {};
    state.tools.forEach((rule, id) => {
      if (!hasPause(rule)) return;
      tools[id] = {};
      CHECKS.forEach(({ key }) => {
        const cp = rule[key];
        tools[id][key] = { enabled: cp.enabled, condition: cp.enabled && cp.condition.trim() ? cp.condition.trim() : null };
      });
    });
    return { hitl_enabled: state.hitl, tools };
  };
  window.getToolsConfig = getConfig;

  const pillHTML = (id) => {
    const { name, iconHTML } = catalog.get(id);
    return `<span class="pill t-caption" data-id="${id}">${iconHTML}<span class="pill-name">${esc(name)}</span>
      <button class="pill-remove" type="button" data-action="remove" aria-label="Remove ${esc(name)}">${cross}</button></span>`;
  };

  const rowHTML = (id, rule) => {
    const { name, iconHTML } = catalog.get(id);
    const active = CHECKS.filter((c) => rule[c.key].enabled);
    return `
      <div class="hc-item" data-id="${id}">
        <div class="hc-row">
          <span class="hc-tool t-body3">${iconHTML}<span class="pill-name">${esc(name)}</span></span>
          ${active.length
            ? `<button class="cond-btn cond-btn--edit t-caption" type="button" data-action="conditions"
                       aria-label="Edit condition for ${esc(name)}">${pencil}Edit</button>`
            : `<button class="cond-btn t-caption" type="button" data-action="conditions"
                       aria-label="Add condition for ${esc(name)}">+ Add condition</button>`}
        </div>
        ${active.length ? `
          <div class="cond-preview">
            ${active.map((c) => {
              const text = rule[c.key].condition.trim();
              return `
                <div class="cond-line">
                  <span class="cond-tag cond-tag--${c.label.toLowerCase()} t-caption">${c.label}</span>
                  <span class="cond-text t-caption${text ? '' : ' cond-text--any'}"${text ? ` title="${esc(text)}"` : ''}>${text ? esc(text) : 'Every call'}</span>
                </div>`;
            }).join('')}
          </div>` : ''}
      </div>`;
  };

  const renderSummary = () => {
    const n = state.tools.size;
    const paused = [...state.tools.values()].filter(hasPause).length;
    nodeText.textContent = n
      ? `${n} tool${n === 1 ? '' : 's'} connected${state.hitl && paused ? ` · ${paused} with checkpoint` : ''}`
      : 'Connect actions to perform';
  };

  const render = () => {
    const ids = [...state.tools.keys()];
    pills.innerHTML = ids.map(pillHTML).join('');
    hitlSwitch.setAttribute('aria-checked', String(state.hitl));
    hcBody.hidden = !state.hitl;
    hcList.innerHTML = ids.length
      ? ids.map((id) => rowHTML(id, state.tools.get(id))).join('')
      : '<p class="hc-empty t-caption">Select tools above to add checkpoints.</p>';
    options.forEach((o) => o.setAttribute('aria-selected', String(state.tools.has(o.dataset.toolId))));
    renderSummary();
  };

  options.forEach((o) => {
    o.addEventListener('click', () => {
      const id = o.dataset.toolId;
      if (state.tools.has(id)) state.tools.delete(id);
      else state.tools.set(id, newRule());
      render();
    });
  });

  hitlSwitch.addEventListener('click', () => { state.hitl = !state.hitl; render(); });

  pills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove"]');
    if (!btn) return;
    state.tools.delete(btn.closest('.pill').dataset.id);
    render();
  });

  hcList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="conditions"]');
    if (btn) openConditions(btn.closest('.hc-item').dataset.id);
  });

  // ── Condition modal ───────────────────────────────────────
  // Edits a draft copy of one tool's rule; Save commits it, Cancel/Escape/backdrop discards it.
  const modal = document.getElementById('cond-modal');
  const modalBody = document.getElementById('cond-body');
  const modalIcon = document.getElementById('cond-icon');
  const modalTitle = document.getElementById('cond-title');
  let editing = null; // { id, draft, returnFocus }

  const conditionHint = (text) => (text.trim()
    ? 'An AI check decides if a call matches. If unsure, it pauses.'
    : 'Empty: pauses on every call.');

  const modalSectionHTML = (c, cp) => `
    <section class="mc" data-key="${c.key}">
      <div class="mc-head">
        <div class="mc-copy">
          <p class="t-body3 w-500" id="mc-${c.key}">Pause ${c.hint.toLowerCase()}</p>
          <p class="t-caption muted">${c.key === 'verify_input'
            ? 'A person approves the call before the tool executes.'
            : 'A person reviews the result before the assistant uses it. Not used for SQL writes.'}</p>
        </div>
        <button class="switch" type="button" role="switch" aria-checked="${cp.enabled}" aria-labelledby="mc-${c.key}"></button>
      </div>
      ${cp.enabled ? `
      <textarea class="t-body3" id="cond-${c.key}" rows="3" maxlength="${CONDITION_MAX}"
                placeholder="Only pause when… e.g. the query is about employee PII"
                aria-label="Pause ${c.hint.toLowerCase()} only when">${esc(cp.condition)}</textarea>
      <div class="mc-meta t-caption">
        <span data-role="hint">${conditionHint(cp.condition)}</span>
        <span class="mc-count" data-role="count">${cp.condition.length}/${CONDITION_MAX}</span>
      </div>` : ''}
    </section>`;

  const renderModal = () => {
    const { name, iconHTML } = catalog.get(editing.id);
    modalIcon.innerHTML = iconHTML;
    modalTitle.textContent = name;
    modalBody.innerHTML = CHECKS.map((c) => modalSectionHTML(c, editing.draft[c.key])).join('<div class="modal-divider"></div>');
  };

  const openConditions = (id) => {
    const rule = state.tools.get(id);
    editing = {
      id,
      draft: { verify_input: { ...rule.verify_input }, verify_output: { ...rule.verify_output } },
      returnFocus: document.activeElement,
    };
    renderModal();
    modal.hidden = false;
    (modalBody.querySelector('textarea') || modalBody.querySelector('.switch')).focus();
  };

  const closeConditions = (save) => {
    if (!editing) return;
    const { id, draft, returnFocus } = editing;
    if (save) {
      const rule = state.tools.get(id);
      CHECKS.forEach(({ key }) => { rule[key] = { enabled: draft[key].enabled, condition: draft[key].condition }; });
      render();
    }
    modal.hidden = true;
    editing = null;
    const back = hcList.querySelector(`[data-id="${id}"] [data-action="conditions"]`) || returnFocus;
    if (back && back.isConnected) back.focus();
  };

  modalBody.addEventListener('click', (e) => {
    const sw = e.target.closest('.switch');
    if (!sw) return;
    const key = sw.closest('.mc').dataset.key;
    editing.draft[key].enabled = !editing.draft[key].enabled;
    renderModal();
    const section = modalBody.querySelector(`[data-key="${key}"]`);
    (editing.draft[key].enabled ? section.querySelector('textarea') : section.querySelector('.switch')).focus();
  });

  modalBody.addEventListener('input', (e) => {
    if (e.target.tagName !== 'TEXTAREA') return;
    const section = e.target.closest('.mc');
    const cp = editing.draft[section.dataset.key];
    cp.condition = e.target.value.slice(0, CONDITION_MAX);
    section.querySelector('[data-role="count"]').textContent = `${cp.condition.length}/${CONDITION_MAX}`;
    section.querySelector('[data-role="hint"]').textContent = conditionHint(cp.condition);
  });

  document.getElementById('cond-save').addEventListener('click', () => closeConditions(true));
  modal.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => closeConditions(false)));
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeConditions(false); });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeConditions(false); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { closeConditions(true); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the dialog.
    const f = [...modal.querySelectorAll('button, textarea')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  render();

  // Close popovers on outside click / Escape
  document.addEventListener('click', (e) => {
    if (!zoomMenu.contains(e.target) && !zoomTrigger.contains(e.target)) setZoomOpen(false);
    if (!combo.contains(e.target) && !e.target.closest('[data-open-tools]')) setOptionsOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setZoomOpen(false); setOptionsOpen(false); }
  });
})();
