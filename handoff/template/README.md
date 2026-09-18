# Cogentiq · Agents — design handoff

The Agents landing page and the "Register a remote agent" flow, as a
working static prototype. No build step, no dependencies: open
`index.html` in a browser.

    open index.html          # macOS
    start index.html         # Windows
    python3 -m http.server   # or serve the folder, if you prefer

Everything is vanilla HTML/CSS/JS so it can be read straight across into
whatever the app is built in. Nothing here is meant to ship as-is — it is
a specification you can run.

---

## What's in the box

```
index.html                  markup for the page, the drawer and all three modals
Cogentiq-Agents.standalone.html   the same thing as one self-contained file,
                            for anyone who just wants to click and look
css/
  01-tokens.css             design tokens, light and dark
  02-components.css         the shared design system (.cq-*)
  03-agents-page.css        this page's own components (.ag-*)
  04-agents-wizard.css      the registration modal's components
js/
  01-data.js                seed data + image constants — replace with API responses
  02-app.js                 all rendering and interaction
  03-theme-shell.js         theme toggle and platform-rail chrome
assets/
  marks/                    agent + orchestrator marks, 7 hues, 96px for a 40px slot
  logos/                    model-provider logos
  img/avatar.png            header avatar
```

Load order matters: the CSS files cascade in numbered order, and
`02-app.js` reads the constants `01-data.js` defines.

---

## Theming

`data-mode="light"` or `data-mode="dark"` on `<html>` switches the theme.
Nothing else is needed — every colour in the page resolves through a
token, and both themes are defined in `01-tokens.css`:

```css
:root                    { --backgrounds-page-bg-1: #121212; … }   /* dark  */
:root[data-mode="light"] { --backgrounds-page-bg-1: #ffffff; … }   /* light */
```

If you are porting this, port the tokens first and the rest follows.
`01-tokens.css` holds the shared set; `03-agents-page.css` opens with a
second `:root` block adding the few this page needs on top (the orange
and red badge families, the `--ag-well*` surfaces, `--ag-required`).
Both are token definitions — those are the two places to look for a
colour. Literal colours elsewhere are limited to `#fff` on coloured
grounds, shadow rgba, and a couple of gradients.

Token families, by what they name rather than what they look like:

| Family | Used for |
| --- | --- |
| `--backgrounds-page-bg-1..4` | page and panel grounds, back to front |
| `--backgrounds-card-bg-2..5` | card and well surfaces |
| `--backgrounds-type-*` | input and search field grounds |
| `--strokes-line-1/3`, `--strokes-card-*`, `--strokes-type-*` | borders and rules |
| `--text-primary/secondary/teritiary` | text, in descending emphasis |
| `--text-coloured-*` | accent text (blue, cyan, green, indigo, orange…) |
| `--radius-sm/md/lg` | 6 / 8 / 12px |
| `--ag-well*`, `--ag-required` | page-local surfaces and the required-field red |

`--text-teritiary` is spelled that way in the source design system. Kept
as-is so the two do not drift.

---

## Motion

There is no animation library and no keyframe soup. Two rules cover
almost everything:

- **State changes**: `transition: <property> .15s ease` — hover borders,
  background tints, text colour, icon colour.
- **Things that rotate or scale**: `.2s cubic-bezier(.4, 0, .2, 1)` —
  dropdown chevrons (`transform: rotate(180deg)`), radio dots
  (`transform: scale(0)` → `scale(1)`).

Named exceptions, all in CSS:

| What | Where | Behaviour |
| --- | --- | --- |
| Validation spinner | `.ag-spin` | `@keyframes ag-spin`, 0.7s linear infinite — the only keyframe animation this page uses |
| Card lift on hover | `.ag-card:hover` | `translateY(-2px)` plus a two-layer shadow, with a lighter shadow in the light theme |
| Toast | `.ag-toast` | `opacity .18s` + `transform .22s cubic-bezier(.2,.8,.2,1)`, driven by two classes: `.is-open` flips `display`, then `.is-shown` on the next frame runs the transition |

Two honest gaps:

- **Modals do not animate.** `.cq-scrim.is-open` flips `display: none`
  to `flex`, so the overlay and its `backdrop-filter: blur(3px)` appear
  in one frame. A fade wants the same two-class trick the toast uses,
  since you cannot transition `display`.
- **`02-components.css` carries keyframes this page never uses** —
  `cq-flag-sheen`, `cq-coach-*`, `cq-tiq-*`, and the conic-gradient spin.
  They belong to design-system components that are not on this screen.
  Safe to drop when you port only what Agents needs.

`prefers-reduced-motion: reduce` is honoured — the card lift and the
design system's animated pieces all opt out under it. Keep that when you
add motion.

The only JS-driven timing is the fake validation delay in `takeSpec()`
(900ms) — a real implementation replaces it with the actual request.

---

## The three registration routes

The modal is three steps: **Details → Connection → Review**. The
connection method chosen in step 2 decides what step 3 asks for, and that
is the only thing that varies between the routes.

| | Step 2 asks for | Step 3 shows |
| --- | --- | --- |
| **Connect it directly** *(default)* | an integration, picked from a dropdown | the agent preview — nothing to fill in |
| **It is already an agent** | an A2A server | an agent-card dropdown, then its auth |
| **It is a plain API** | an OpenAPI spec or manifest, uploaded and validated | the agent preview — nothing to fill in |

An **integration** is one agent card: an address, a credential, and the
shape of the call, registered once and reused. Creating one opens a
nested modal (`#intScrim`). A **server** publishes several cards, so that
route is the only one that still has a choice to make on the last step.

Only one agent card per agent, everywhere. To combine several, register
them separately and compose them in an orchestrator.

### The one function to read first

`draft()` in `02-app.js` returns the agent the wizard would create, as it
currently stands. The preview, the review rows and the registration all
read it, so what the last step shows and what gets created cannot drift
apart. If you change what an agent is, change it there.

Other load-bearing pieces:

| Function | Does |
| --- | --- |
| `paintWiz()` | single render pass for the whole modal — step visibility, validity, button state |
| `stepOK()` / `stepHint()` | whether the current step is answered, and what to say if not |
| `pickItems()` | the agent cards on offer (server route only) |
| `render()` | the landing page grid or table |
| `openPanel(i)` | the agent detail drawer |
| `markFor(agent)` | *(in `01-data.js`)* hashes the agent name to one of seven hues, so a card keeps its colour between renders |

### Conditional fields

Three attribute patterns drive show/hide, all resolved in one pass:

```html
<div data-only="direct">        <!-- shown when wiz.proto === 'direct'   -->
<div data-cauth-only="bearer">  <!-- shown when wiz.cardAuth === 'bearer' -->
<div data-niauth-only="apikey"> <!-- shown when wiz.niAuth === 'apikey'   -->
```

Each has a paired CSS rule so `[hidden]` beats the element's own
`display`. Adding a case means adding markup only.

---

## Data shapes

`01-data.js` holds four collections. Replace them with API responses and
nothing downstream needs to change.

```js
// an agent in the workspace
{ name, type: 'agent'|'orchestrator'|'remote', state: 'running'|'idle'|'review'|'failing'|'draft',
  desc, by, tags: [], updated, runs,
  model, tools, skills, guards,              // workspace agents
  conn: 'a2a'|'direct'|'rest',               // remote agents
  endpoint, server, auth, cards: [], agentSkills: [],
  reqMethod, reqPath, msgField, respField }  // direct connections only

// an A2A server, which publishes several cards
{ id, name, url, updated, cards: [{ name, desc, skills: [], auth, path }] }

// an integration — one agent card: where it is, how to authenticate, how to call it
{ id, name, url, desc, auth, timeout, skills: [], method, path, msg, resp }

// an operation read off an uploaded OpenAPI document
{ op, skill, desc }
```

---

## Notes for whoever builds this

- **Accessibility is started, not finished.** Roles, `aria-expanded`,
  `aria-selected` and `aria-disabled` are in place on the custom
  dropdowns and the stepper. Full keyboard navigation inside the
  dropdown lists (arrow keys, type-ahead) is not — the tag picker's
  Enter handling is the only keyboard affordance implemented, as a
  pattern to copy.
- **The dropdowns expand in flow**, not as floating layers. That is
  deliberate: the modal body scrolls, and an absolutely-positioned
  popover gets clipped the moment the field sits low enough. If you
  swap in a portal-based popover, check the low-field case.
- **Validation is illustrative.** `takeSpec()` accepts any file and
  reports a fixed result after 900ms. Real parsing replaces it.
- **Secrets are plain state.** Tokens and keys sit in `wiz` and in
  `INTEGRATIONS` in memory, and credentials entered in the integration
  modal are stored on the object. Obviously not how it ships.
- **Marks are hashed from the agent name**, so renaming an agent changes
  its colour. If colour should be stable across a rename, hash an id
  instead — one line in `markFor()`.
- **Breakpoints are unfinished.** The card grid is a fixed two columns
  (`repeat(2, minmax(0, 1fr))`) at every width, and there is not a single
  width media query in the page CSS — the rail, the sidebar filters and
  the detail drawer keep their desktop widths all the way down. Designed
  and checked at 1280px and up; phone and tablet need design work that
  has not been done, starting with dropping the grid to one column.

---

## Source of truth

This folder is generated from the single-file prototype `agents.html` in
the same repository, which is what the live artifact publishes. Changes
made here will not flow back — edit the prototype and regenerate, or take
this folder as the fork point and retire the prototype.
