# Assistant Builder: Tools panel & Human checkpoint (dev handoff)

A working HTML/CSS/JS prototype of the **Tools** side panel in the assistant builder. It covers selecting tools and configuring per-tool **human checkpoints** (HITL pauses).

- **Figma (base screen):** [AI assistant <> User, node 6411:208104](https://www.figma.com/design/d2Aeg6YIYnO838TlkmAkRP/AI-assistant-%3C%3E-User?node-id=6411-208104)
- **Live prototype:** https://claude.ai/artifact/1CW1BYRk9gUtVkfCaFHRQA (private; ask the owner for access)
- The base screen was built from Figma. The human-checkpoint flow has no Figma frame yet; this prototype is the design reference for it.

## Run it

No build step. Open `index.html` in a browser (Chrome, Edge, Safari or Firefox). The page is designed at **1440 × 821**.

```
assistant-builder-tools/
├── index.html      Markup: nav, canvas, Tools panel, condition modal
├── styles.css      Design tokens (:root) + all component styles
├── app.js          Prototype logic: selection, checkpoint state, modal, config output
├── assets/         Icons and images exported from Figma (SVG/PNG)
└── screenshots/    Every state of the flow (2x)
```

The canvas, nav bar and zoom toolbar are static context from the Figma frame. **The work to build is the Tools panel (right side) and the condition modal.**

---

## The flow

| # | Step | Screenshot |
|---|------|------------|
| 1 | The panel shows the **Select tools** search with a **+New Tool** button. | `02-panel-checkpoint-on.png` |
| 2 | Focusing the search opens the tool list. Clicking a tool toggles it; selected tools get a light-blue row and a tick, and the list stays open for multi-select. Typing filters by name. | `03-panel-tool-dropdown.png` |
| 3 | Selected tools appear as **pills** under the search. The **×** on a pill removes the tool. | `02-panel-checkpoint-on.png` |
| 4 | **Human checkpoint** card: one switch (`hitl_enabled`). When on, the card lists every selected tool, one row each. | `02-panel-checkpoint-on.png` |
| 5 | A row with no pause shows **+ Add condition**. Clicking it opens the condition modal for that tool. | `04-modal-add-condition-empty.png` |
| 6 | In the modal, turn on **Pause before it runs** and/or **Pause after it runs**. Turning one on shows its condition box (optional, max 500 characters, live counter). | `05-modal-condition-filled.png` |
| 7 | **Save** commits the changes and the row shows a preview: a **Before** (blue) or **After** (purple) tag plus the condition text, or *Every call* if the box was left empty. The button becomes **Edit**. | `06-panel-after-save-preview.png` |
| 8 | **Edit** reopens the modal with the saved values. Turning both pauses off and saving clears the row back to **+ Add condition**. | `07-modal-edit-both-pauses.png` |
| 9 | With the switch off, the tool list is hidden. Saved per-tool settings are kept and come back when it's turned on again. | `08-panel-checkpoint-off.png` |

The **Tools** node on the canvas mirrors the state, e.g. *"3 tools connected · 2 with checkpoint"* (the checkpoint count only shows while the switch is on).

### Modal behaviour

- It edits a **draft** copy. **Save** (or Ctrl/Cmd + Enter) commits it. **Cancel**, **×**, **Escape** or a click on the backdrop discard it.
- On open, focus goes to the first condition box, or to the first switch if none is on. Tab is trapped inside the dialog. On close, focus returns to the row's Add/Edit button.
- The helper text under a condition box changes as you type:
  - empty: *"Empty: pauses on every call."*
  - with text: *"An AI check decides if a call matches. If unsure, it pauses."*

---

## Data contract

The panel produces the assistant's `hitl_enabled` flag and `tools` object. In the prototype, `window.getToolsConfig()` returns it:

```json
{
  "hitl_enabled": true,
  "tools": {
    "3f6c2a1e-8b4d-4e5f-9a7c-1d2e3f4a5b6c": {
      "verify_input":  { "enabled": true, "condition": "The retrieval query is about employee PII" },
      "verify_output": { "enabled": true, "condition": null }
    },
    "c2d8f6e1-5a7b-4d9c-8e3f-6b1a2c4d5e7f": {
      "verify_input":  { "enabled": false, "condition": null },
      "verify_output": { "enabled": true, "condition": "The result contains a client phone number or home address" }
    }
  }
}
```

### Mapping UI → config

| UI | Field |
|----|-------|
| Human checkpoint switch | `hitl_enabled` |
| Modal: *Pause before it runs* switch | `tools[id].verify_input.enabled` |
| Modal: condition under it | `tools[id].verify_input.condition` |
| Modal: *Pause after it runs* switch | `tools[id].verify_output.enabled` |
| Modal: condition under it | `tools[id].verify_output.condition` |
| Preview tag **Before** / **After** | `verify_input` / `verify_output` enabled |
| Preview text *Every call* | enabled with `condition: null` |

### Rules the UI enforces (see `getConfig()` in `app.js`)

1. **Keys are platform tool IDs** (`assistant_tools.id` UUIDs from the assistant's `tool_list`), never display names, LangChain names or MCP wire names. The prototype uses placeholder UUIDs on each option's `data-tool-id`.
2. **Only tools with at least one pause are written.** No pauses anywhere gives `"tools": {}`.
3. **`condition` is `null` unless its checkpoint is enabled and the text is non-blank.** Text is trimmed, and an empty or whitespace-only value is stored as `null`.
4. **Condition max length is 500 characters** (`maxlength` + slice on input).
5. **Max 100 entries in `tools`.** The prototype catalog has 5 tools so this never triggers; the real tool picker should enforce it.
6. **Omitted checkpoints default to `{ enabled: false, condition: null }`.** The prototype always writes both checkpoints for a listed tool, for clarity.

### Backend behaviour the copy refers to (not implemented in the UI)

- **Mutating SQL** and **request_user_input** always pause while `hitl_enabled` is true, whatever the per-tool rules say. The checkpoint card says *"SQL writes always pause."*
- **`verify_output` never fires on mutating SQL**, because the write has already happened. The modal's *after* description says *"Not used for SQL writes."*
- **Conditions are judged by an LLM.** A match pauses, and an evaluation failure also pauses (fail closed). A condition can only **add** a pause; it can't skip a mandatory one.

---

## Design tokens

Defined on `:root` in `styles.css`. They're named from the Figma variables, so swap them for your design-system tokens.

| Token | Value | Used for |
|-------|-------|----------|
| `--text-primary` | `#121212` | Tool names, condition text |
| `--text-secondary` | `#616161` | Descriptions |
| `--text-tertiary` | `#8c8c8c` | Placeholders, *Every call*, counters |
| `--text-tonal-1` | `#007be5` | *+ Add condition*, **Before** tag text |
| `--text-tonal-2` | `#757575` | *Edit* button |
| `--text-purple` | `#9747ff` | **After** tag text |
| `--bg-primary` | `#0d99ff` | Switch on, Save, +New Tool |
| `--bg-tonal-1` | `#e5f4ff` | **Before** tag bg, link hover |
| `--bg-badge-purple` | `#f9f5ff` | **After** tag bg |
| `--bg-page-1` | `#fafafa` | Condition preview box |
| `--bg-field` | `#f5f5f5` | Inputs and textareas |
| `--bg-tonal-2` | `#f5f5f5` | Tool pills |
| `--stroke-default` | `#e0e0e0` | Panel, inputs, switch off |
| `--stroke-card` / `--stroke-line` | `#eeeeee` | Card borders, row dividers |
| `--stroke-focus` | `#0d99ff` | Focus border |

**Type:** Geist 400/500 (Google Fonts).

| Name | Size / line-height / tracking |
|------|-------------------------------|
| Body 2 | 16/24, −0.64px |
| Body 3 | 14/20, −0.56px |
| Caption | 12/16, −0.24px |

## Component specs

| Component | Spec |
|-----------|------|
| **Panel** | 344px wide inside an 8px gutter; radius 16; 16px side padding; sections 16px apart; body scrolls. |
| **Tool pill** | radius 80; padding 3/3/3/5; 16px icon; caption 500; 12px × button; 6px gap, wraps. |
| **Checkpoint card** | radius 12, 1px `--stroke-card`. Header padding 11; title Body 3/500; description Caption secondary. |
| **Switch** | 28×16 track, 12px knob, 0.15s slide; `role="switch"` + `aria-checked`. |
| **Tool row** | padding 10/12, 8px gap; 1px divider between rows. Name Body 3/500 with ellipsis. 20px icon box. |
| **Add / Edit button** | Caption 500, padding 3/8, radius 6. Add is blue with a blue-tonal hover; Edit is grey with a 12px pencil. |
| **Condition preview** | indented 28px (under the name); padding 8/10; radius 8; `--bg-page-1` with a 1px border. Lines use a 44px tag column + text, 8px gaps; text clamps to 2 lines with the full text in `title`. |
| **Before / After tag** | Caption 500, padding 0/6, radius 6. Before is blue tonal; After is purple badge. |
| **Modal** | 440px, radius 16, backdrop `rgba(18,18,18,.32)`. Head padding 16/16/12 with tool icon + name (Body 2/500) + description. Body padding 16 with 16px gaps; sections split by a 1px divider. Textarea min-height 76px, resizable, focus ring `0 0 0 2.5px rgba(13,153,255,.2)`. Footer: Cancel (outline) + Save (primary), right-aligned. Opens with a 0.14s fade/rise unless reduced motion is on. |

## Accessibility notes

- Switches use `role="switch"` with `aria-checked`. The modal is `role="dialog"` with `aria-modal`, `aria-labelledby` and `aria-describedby`.
- Add/Edit and pill-remove buttons have per-tool `aria-label`s (e.g. *"Add condition for QuantumCoder"*).
- Every interactive control has a visible `:focus-visible` ring.

## Prototype-only (replace in production)

- **Tool catalog:** the 5 hardcoded `<li class="option">` items in `index.html`, with placeholder UUIDs.
- **Example data:** the `seed(...)` calls at the top of the checkpoint section in `app.js`.
- **State:** held in memory only, with no persistence or API calls. `window.getToolsConfig()` is the hook to read it.
- **Static context:** **+New Tool**, **View all**, the canvas nodes, Launch chat, Draft and Publish are static or non-functional here.
