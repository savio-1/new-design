# Implementation notes

What is real in the prototype, what is staged, and what still needs
deciding. Read this before estimating.

---

## Staged, not built

| Thing | What the prototype does | What the product needs |
| --- | --- | --- |
| Spec validation | `takeSpec()` accepts any file and reports a fixed result after 900ms | a real parse, server side, with the error path wired to the `error` state |
| Agent card fetch | reads the seed data | a credentialed request to the server's `.well-known` |
| Secrets | tokens and keys sit in `wiz` and on the integration object, in memory | the secret store; the UI posts once and holds a reference |
| Persistence | `AGENTS` is a module-level array; a refresh loses everything | the API |
| Search and filters | in-memory over the loaded list | fine to keep client-side until the list outgrows one page |
| Run / Edit / Connection actions | render the drawer, do nothing | routes into the rest of the product |
| Marketplace install | the button exists, does nothing | the install flow |

---

## Accessibility — started, not finished

In place:

- Roles and state on the custom controls: `role="tablist"` on the
  stepper and the source tabs, `aria-selected` on each, `aria-expanded`
  on every dropdown trigger, `aria-disabled` on the Continue button,
  `aria-hidden` on the closed drawer.
- Escape closes the wizard, the nested integration modal, the comparison
  sheet and any open popover, innermost first.
- Focus is moved on open where it helps: to Continue when the wizard
  opens, into the search box when a searchable list opens.
- `prefers-reduced-motion: reduce` is honoured throughout (7 rules).

Missing, and worth planning for:

- **Keyboard navigation inside the dropdown lists.** Arrow keys and
  type-ahead are not implemented; the tag picker's Enter handling is the
  only keyboard affordance written, as a pattern to copy.
- **Focus trapping** in the modals. Tab currently escapes to the page
  behind the scrim, and focus is not returned to what opened the modal
  when it closes.
- **Escape on the detail drawer.** It closes on its own X and on any
  filter change, but not on Escape.
- **Live regions.** The toast and the validation result are not
  announced.
- **Contrast of the tertiary text** on card grounds has not been
  measured against WCAG AA. Check `--text-teritiary` on
  `--backgrounds-card-bg-2` before shipping.

---

## Layout and breakpoints

The card grid is a fixed two columns
(`repeat(2, minmax(0, 1fr))`) at every width, and there is not a single
width media query in the page CSS — the rail, the sidebar filters and the
detail drawer keep their desktop widths all the way down. Designed and
checked at 1280px and up; phone and tablet need design work that has not
been done, starting with dropping the grid to one column.

The dropdowns **expand in flow**, not as floating layers. That is
deliberate: the modal body scrolls, and an absolutely-positioned popover
gets clipped the moment the field sits low enough. If you swap in a
portal-based popover, check the low-field case — the integration list at
step 2 is the one that hurts.

The wizard modal is 560px and its body scrolls; the JSON panel inside it
scrolls too, at `max-height: 260px`. On a 900px-tall window the review
step for the direct route sits at about 750px, so the connection facts
below the JSON need a scroll. That is intended, but if you would rather
they were visible, cap the JSON shorter or collapse it behind a toggle.

---

## Marks

`markFor(agent)` hashes the agent **name** to one of seven hues, so a
card keeps its colour between renders. Renaming an agent changes its
colour. If colour should survive a rename, hash an id instead — one line
in `markFor()`.

The marks ship as PNGs at 96px for a 40px slot (`assets/marks/`), two
families: `single-*` for agents, `orch-*` for orchestrators.

---

## Open questions for design

1. **Loading and empty states.** Only "no filter matches" is designed.
   The first-load skeleton and the genuinely-empty workspace are not.
2. **Error states in the wizard.** A failed card fetch (401, timeout,
   unreachable) and a failed registration have no design. The validation
   error state exists in CSS but has no frame.
3. **More than one card per agent.** The product decision today is one;
   if that changes, step 3 of route B becomes a multi-select and the
   preview grows a list.
4. **Editing a registered remote agent.** The drawer's Connection button
   has nowhere to go yet. Re-running the wizard pre-filled is the
   obvious answer, but the "changing a live agent's auth" case needs
   thought.
5. **Where governance approval happens**, and what the agent looks like
   while it waits, beyond the orange `In review` pill.

---

## Verifying a change

The prototype is checked with Playwright — the suites live outside this
folder, in the working repo, but the shape is worth copying:

- boot with no console errors, both themes
- the three routes end to end, asserting what `draft()` produces
- the landing page: card count, corner chips, named pills, used-by
- a diff of the single-file prototype against this split build, so the
  two cannot drift apart

That last one caught a real bug: asset URLs in JS resolve against the
**document**, not the script, so `../assets/…` from `js/02-app.js` 404s.
Paths in this build are document-relative for that reason.
