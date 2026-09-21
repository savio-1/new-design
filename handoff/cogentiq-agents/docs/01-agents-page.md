# The Agents page

Everything the workspace can run, in one list: agents built in Cogentiq,
orchestrators that compose them, and remote agents registered from
outside. The Marketplace tab shows agents not installed yet.

Renders: [`design/00-agents-landing-dark.png`](../design/00-agents-landing-dark.png),
[`design/00b-agents-landing-light.png`](../design/00b-agents-landing-light.png),
[`design/10-detail-panel.png`](../design/10-detail-panel.png),
[`design/11-list-view.png`](../design/11-list-view.png).

---

## Layout

```
┌ platform rail ─┬ page ─────────────────────────────────────────────┐
│ 68px, fixed    │ header: title · search · New agent                │
│                ├ sidebar ─┬ content ───────────────────────────────┤
│                │ 240px    │ tabs (In workspace / Marketplace)      │
│                │ TYPE     │ filter row  ·  card / list toggle      │
│                │ filters  │ card grid, two columns                 │
└────────────────┴──────────┴────────────────────────────────────────┘
```

At a 1440px window that gives a 1074px grid and 529px cards. The detail
drawer is `position: fixed` against the right edge of the viewport at
`--panel-w: 420px`; it overlays the grid rather than pushing it.

Designed and checked at 1280px and up. There is no width media query in
the page CSS yet — see [04-implementation-notes](04-implementation-notes.md).

---

## The card grid

**Two columns, always** — `grid-template-columns: repeat(2, minmax(0, 1fr))`
with a 16px gap. The count is stated rather than left to `auto-fill`:
each card carries a name, a description, a model row and capability
chips, and at three up the name truncates almost as soon as it is
written.

### Card anatomy

| Part | Rule |
| --- | --- |
| Mark | 40px, hashed from the agent name to one of seven hues (`markFor()`), so a card keeps its colour between renders |
| Name | `.cq-body1-med`, one line, ellipsis |
| Kind chip | top-right corner, square outer edge, `0 13px 0 12px` radius — **only for `orchestrator` and `remote`**; a plain agent shows nothing |
| Description | `.cq-body2-reg`, two lines, ellipsis |
| Model | provider logo, or the pill "No model" when unset |
| Capability chips | tools · skills · guardrails, each an icon plus a **count**, hidden when zero, `title` lists the names |
| Owner avatar + `…` | bottom right |

The card carries no run status. Status lives in the list view and the
drawer; on a card it competed with the name for the first read.

`.ag-card:has(.ag-card__kind) .ag-card__top { padding-right: 96px }`
keeps a long name from running under the corner chip.

### Selection and hover

Hover lifts the card 2px with a two-layer shadow (lighter in the light
theme), and `prefers-reduced-motion: reduce` disables the lift. Clicking
a card opens the drawer and marks the card `.is-selected` (1px accent
border).

---

## Filters, search and tabs

State lives in one object; every control writes to it and calls
`render()`:

```js
const state = {
  src: 'workspace' | 'marketplace',
  q: '',                 // free text
  type: 'all' | 'agent' | 'orchestrator' | 'remote',
  view: 'card' | 'list',
  owners: Set<string>,   // "Created by"
  tags:   Set<string>,
  st: 'any' | 'running' | 'idle' | 'review' | 'failing' | 'draft',
  sel: number            // index of the open drawer, -1 for none
};
```

- **Search** matches name, description, owner, endpoint and tags, case
  insensitive.
- **Type counts** in the sidebar are counts of the current source, not of
  the filtered result.
- **Marketplace** swaps the collection (`MARKET` instead of `AGENTS`),
  hides the New agent button, and replaces the status pill in the drawer
  with an install count.
- Every filter is additive; the empty result shows the "nothing matches"
  state with a reset.

---

## The detail drawer

Opens from a card or a row. Sections, in order, and when they appear:

| Section | Shown for | Contents |
| --- | --- | --- |
| Header | all | mark, name, type badge, status pill (or install count), one-line origin — "Built in Cogentiq · by Priya Nair" or "Runs on Acme Bank A2A" |
| Actions | all | **Run agent** / **Add to workspace** (marketplace), and **Edit** / **Connection** (remote) / **Preview** (marketplace) |
| NEEDS ATTENTION | agents with `problem` | the failure, in red |
| CONNECTION | remote only | endpoint, server or integration, protocol, auth, agent card, and for a direct connection the request shape: method, path, message field, response field |
| SKILLS PUBLISHED | remote only | the skill ids from the agent card, as cyan tags |
| CONFIGURATION | built agents | model, and the orchestrator that owns it |
| TOOLS · SKILLS · GUARDRAILS | any that has them | **named pills, not counts** — the name is the useful part; the count sits in the section head |
| USED BY | all | the automations and assistants that call this agent, each with its kind; when empty, "Nothing uses this agent yet. It can still be run on its own." |
| ABOUT | all | runs in the last 30 days, last updated, tags |

The three capability sections and USED BY are the same data the card
chips count, so they cannot disagree.

---

## States to build

| State | Where it comes from |
| --- | --- |
| Loading | not designed — see open questions |
| Empty workspace | not designed |
| No filter matches | designed, in the prototype |
| Agent failing | red status pill, NEEDS ATTENTION in the drawer |
| Agent in review | orange status pill; a freshly registered remote agent lands here |
| No model | grey "No model" pill in place of the provider logo |
| Marketplace agent | install count instead of status, "Add to workspace" as the leading action |
