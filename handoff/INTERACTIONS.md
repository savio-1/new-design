# Interactions and motion

Durations and easings as built. Everything is CSS transition or
`requestAnimationFrame`; there is no animation library.

## Motion tokens in use

| Purpose | Duration | Easing |
|---|---|---|
| Colour / border / shadow on hover | 150ms | `ease` |
| Panel slide-in, rail width | 260–280ms | `cubic-bezier(.4, 0, .2, 1)` |
| Explainer card open/close | 280ms | `cubic-bezier(.4, 0, .2, 1)` |
| Card lift | 150ms | `ease` |

`@media (prefers-reduced-motion: reduce)` is **not** yet handled — add it
when you implement. The two things to neutralise are the panel slide and
the hero's pointer glow.

## Platform panel (left rail)

68px crunched, 240px open. Opens on `mouseenter` after a **140ms** delay
and closes on `mouseleave` after **200ms** — the asymmetry stops a
cursor crossing the rail from flashing it open. Width animates over
260ms. The collapse button closes it immediately.

Only one category is open at a time: clicking a group head closes the
others (`aria-expanded` on `.cq-rail-ghead`).

## Header

The theme toggle swaps sun/moon and rewrites its own `title` and
`aria-label` to name the destination mode, not the current one.

## Context sidebar — explainer card

Starts **collapsed** and opens itself after **4.5s**, once the page has
settled, so it reads as an invitation rather than a wall. Once the user
touches it the timer is cancelled and their choice stands. Open and
close animate `max-height` over 280ms; the card's `gap` lives on the
body's `margin-top` instead, because a flex `gap` still applies at zero
height and left a stray gap under the collapsed card. A `ResizeObserver`
keeps the max-height honest if the content reflows.

## Studio — hero

The dot grid **lights up under the pointer**. Two stacked grids: a base
layer and a brighter copy masked by a radial gradient whose centre
follows the cursor. The cursor position is written to `--mx` / `--my` on
the glow layer and read by its mask, so nothing re-layouts; reads are
throttled to one per frame with `requestAnimationFrame`. The glow fades
to `opacity: .5` on hover and back out on leave.

Tile captions stay white in both themes — the hero keeps its own ground.

## Cards

Hover darkens the border to `--strokes-card-hover` and adds
`--shadow-card-hover`. Bundle cards also lift 2px; glossary cards do not
— list cards stay put. Selected cards take the accent border plus a 1px
ring.

## Detail panels

420px, fixed to the right edge, sliding in from `translateX(100%)` over
280ms with `visibility` switched on the same transition so a closed
panel is not focusable. The scrim behind is **transparent**: this is a
detail view, not a modal, so the list stays readable and the scrim only
catches the outside click. Escape closes. Clicking the open card closes
it again.

Opening moves focus to the panel's close button. The panel overlays the
header — as it does on Model hub and Skills — so the theme toggle is not
reachable while a panel is open.

## Glossary — filters

Three popovers, one open at a time. The button's chevron flips to
`#ic-arrowup` while open, and focus lands in the search field where
there is one.

- **Tags** — search, a create action, and a multi-select checkbox list.
- **Created by** — search and a multi-select list with avatars.
- **Any time** — single choice, ticked; picking one closes the popover.

Selected counts show as a badge on the button, which takes the
`has-count` state. Escape or an outside click closes.

The card/table toggle is `aria-pressed` on two buttons; the hidden view
uses the `hidden` attribute, which needs the
`[hidden] { display: none !important; }` rule in the reset because
`display: grid` otherwise wins over the UA default.

## Create bundle — selection matrix

Cells are **48px tall whether empty or filled**; the filled state is one
row, not a stack, so nothing reflows on pick. Empty cells are dashed;
hover takes the neutral grey and the solid border.

The picker is a 404px popover positioned against the clicked cell,
repositioned on resize and on scroll (captured, because the scroll
happens on `.cb-scroll`, not the window). It stays open after a pick so
a second choice is one click away — Escape closes it and returns focus
to the cell.

Note for reimplementation: the option list re-renders on click, which
detaches the clicked node. The outside-click handler therefore checks
`e.target.isConnected` before closing, or a pick would close the picker
by looking like a click on nothing.

Required fields turn red only after they have been touched and left
empty (`blur`), never while typing.

## View transitions

`go()` is an instant swap — no cross-fade. Two dense screens dissolved
through each other read as blur rather than motion, since the rail and
header are identical on every view. The scroll position resets to the
top on each change.
