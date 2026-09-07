#!/usr/bin/env python3
"""Assemble the developer handoff zip.

Everything in it is lifted out of the working files rather than written
alongside them, so the snippets a developer copies cannot drift from the
page they were taken from. Run it after any change to the library or the
page and the bundle regenerates.
"""
import io, os, re, shutil, zipfile
from datetime import date

OUT = 'cogentiq-model-hub-handoff'
LIB = io.open('cogentiq-design-system.css', encoding='utf-8').read()
PAGE = io.open('model-hub.html', encoding='utf-8').read()


def between(text, start, end, keep_end=False):
    i = text.index(start)
    j = text.index(end, i + len(start))
    out = text[i:j + (len(end) if keep_end else 0)]
    assert out.strip(), 'empty slice for %r' % start[:40]
    return out.rstrip() + '\n'


# ── The tagging CSS, straight out of the library ─────────────────────
TAG_CSS = '\n'.join([
    between(LIB, '/* ── Action menu ─', '/* ═══════════════════════════════════════════════════════════════════\n   8 · TAGS'),
    between(LIB, '/* ── Removable tag ─', '/* ═══════════════════════════════════════════════════════════════════\n   9 · AVATAR'),
])

# ── The tagging JS, straight out of the page ─────────────────────────
# Three slices, so the file is the tagging code and nothing else: the
# surfaces, the two renderers that draw the filter popover, and the
# handlers that drive them.
TAG_JS = '\n'.join([
    between(PAGE, '/* ══ Tagging ══', '/* Tag filter popover */'),
    between(PAGE, 'function renderTagPop() {', 'function peopleList()'),
    "/* ── The handlers ─────────────────────────────────────────────── */",
    between(PAGE, "$('cardArea').addEventListener('click', e => {", "$('modelSearch')"),
    between(PAGE, "$('tagPop').addEventListener('click', e => {", "$('peoplePop')"),
])

# ── The markup skeletons ─────────────────────────────────────────────
TAG_HTML = (
    '<!-- ═══ The 3-dot menu and the tag picker ═══════════════════════\n'
    '     Both position:fixed at the document root, placed from the\n'
    '     button that opens them. Anchoring either inside a card works\n'
    '     until the grid scrolls, and then it rides off its anchor. -->\n'
    + between(PAGE, '  <div class="menu" id="cardMenu" role="menu">', '<div class="tag-picker" id="tagPicker"></div>', keep_end=True)
    + '\n\n<!-- ═══ The tags filter popover: two panes + a pinned foot ═══ -->\n'
    + between(PAGE, '                  <div class="tag-pop" id="tagPop">',
              '                      <div id="tagManageError"></div>\n                    </div>\n                  </div>', keep_end=True)
)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, 'w', encoding='utf-8').write(text)


README = '''# Cogentiq — Model hub · developer handoff

Generated {date} from the working prototype.

## What is in here

| File | What it is |
|---|---|
| `model-hub.html` | The page, working. One file, no build step, no dependencies — open it in a browser. This is the behavioural source of truth: where this document and the page disagree, the page is right. |
| `design-system.html` | The component reference. Every token with both theme values, every component live, and the rules behind them. Open the **Tagging** section for the three surfaces this handoff is about. |
| `page-guidelines.html` | The frame every module shares — shell, spacing, the panel, where things go. |
| `cogentiq-design-system.css` | The library. This is the file you link. Token names match the Figma variables one-for-one. |
| `HANDOFF.md` | The spec: page structure, the tagging feature in full, what is real and what is mocked. |
| `tagging/tagging.css` | The tagging CSS, lifted out of the library so you can read it in one place. Ship the library, not this. |
| `tagging/tagging.js` | The tagging behaviour, lifted out of the page. Vanilla, %d lines, no dependencies. |
| `tagging/tagging.html` | The markup skeletons for the menu, the picker and the two-pane filter. |

## Getting started

    <link rel="stylesheet" href="cogentiq-design-system.css">
    <html data-mode="light">        <!-- omit for dark, the product default -->
      <body class="cq"> … </body>

Dark is the default. Every component is written against tokens only, so
both themes come free — never hard-code a colour in a screen. If a value
is missing, add a token to the library rather than a literal to the
page.

## Reading order

1. `design-system.html` → **Tagging**. Play with all three surfaces;
   they share one list, so a rename in the manage pane changes the card
   and the filter as you watch.
2. `HANDOFF.md` → the spec, including every state and edge case.
3. `model-hub.html` → the real thing, in context.

## One thing to fix before you ship

The destructive colour family (`--text-coloured-red`,
`--backgrounds-button-danger`, `--backgrounds-badge-red`,
`--strokes-colour-red`) is **derived**, not read from Figma. The library
has `Text/Coloured- red` and `Strokes/Colour/Red` published but neither
returned a value, so these follow Figma's brand red through the same
construction the other five colour families use. Replace the four pairs
in `cogentiq-design-system.css` once someone can read the real values —
nothing outside the delete affordances depends on them.
'''.replace('{date}', date.today().isoformat())


HANDOFF = '''# Model hub — implementation spec

Written against the prototype in `model-hub.html`. Where the two
disagree, the prototype is right; it is the thing that was designed
against, and it runs.

---

## 1 · The page

A single scrolling column inside the shared shell.

    platform panel (68px gutter, overlays on hover)
    └─ header — title, count, search, New model
       filter row — Tags · Created by · Any time · grid/table toggle
       provider rail (left) + card grid or table (right)
       detail panel (right, on select)

Card grid and table are two views of one list; the toggle at the right
of the filter row switches them and nothing else changes. Selection is
shared: selecting in either opens the same detail panel.

**Not in scope for this handoff**, and documented in
`page-guidelines.html` instead: the platform panel, the Context Studio
offer, Tiq, the New model modal.

---

## 2 · Tagging

Three surfaces. All three read and write **one tag vocabulary**, and
that is the load-bearing fact: a tag renamed in the manage pane must
change on the cards, in the detail panel and in the active filter, in
the same frame. Anything less and the page holds two names for one
thing.

### 2.1 The tag vocabulary

A tag is a name and a tone. It belongs to the **platform**, not to the
model hub — the same list is meant to appear in every module.

    Tag { id, name, tone }        tone ∈ blue | indigo | green | cyan | light-green

The prototype fakes the registry as `TAG_FILTERS` (the seeded list)
unioned with every tag already on a model, computed by `allTags()`.
Replace both with your real store. Nothing else needs to change.

**There are no usage counts anywhere, on purpose.** An earlier revision
showed "12 models" beside each tag. It was removed because the number
can only be counted from the records the current screen knows about,
which for a platform-wide tag is a smaller — and more reassuring —
figure than the truth. If you have a real cross-platform count, putting
it back on the manage row is the right place for it; a count of just
this module's records is worse than none.

### 2.2 Surface A — the card's action menu

`.cq-menu`, opened by the 3-dot on a card.

| Row | Does |
|---|---|
| Edit | Opens the model modal |
| Add tags | Opens surface B, anchored to the same button |
| — | separator |
| Delete | Deletes the model (destructive styling) |

Rules:

- **A menu row fires and closes. A filter row toggles and stays.** They
  look close enough that mixing commands and filters in one surface
  teaches people the wrong thing about both. Keep them separate.
- The menu is `position: fixed` at the document root, placed from the
  button's rect by `placeSurface()`. It flips above the button when
  there is not room below. Anchoring it inside the card works until the
  grid scrolls, and then it rides off its anchor.
- The 3-dot lives inside a `<button>` (the card), so it cannot be a
  button itself. It carries `role="button" tabindex="0"` and Enter/Space
  are wired by hand. **If you rebuild the card as a `<div
  role="button">`, make the 3-dot a real `<button>` and delete that
  handler** — it only exists to work around the nesting.

### 2.3 Surface B — the tag picker

`.cq-tag-picker`, opened by Add tags. Anchored to the same button.

    ┌─────────────────────────────────┐
    │ [Retention ×] [Social ×] Add…   │  ← .cq-tag-field
    ├─────────────────────────────────┤
    │ + Create "Q3 launch"            │  ← only when nothing matches
    │ ☑ Retention                     │
    │ ☐ Branding                      │
    └─────────────────────────────────┘

| Interaction | Result |
|---|---|
| Click a row | Toggles that tag on the record, immediately |
| Click a chip's × | Removes that tag, immediately |
| Type | Filters the list |
| Type something new | Pins a **Create** row above the list |
| Enter on typed text | Creates the tag **and** applies it |
| Backspace on empty input | Removes the last chip |
| Escape | Closes |

Rules:

- **There is no Save.** Every toggle commits and the card behind updates
  as you go. Tagging is cheap and reversible; a Save button makes it
  read like a form and hides the result until you are done.
- **Create is pinned above the list, not below.** When what you typed
  matches nothing, the row you want is the one you are about to make —
  at the bottom of a scrolling list it is the one row you cannot see.
- Creating from here also applies the tag. That is the only reason you
  would create one here.
- A chip carries the card fill (`--backgrounds-card-bg-2`). Without it,
  in light mode the tag's `#eeeeee` stroke sits on the field's `#f5f5f5`
  ground and is not a border anyone can see.

### 2.4 Surface C — the tags filter, and its manage pane

The filter dropdown is two panes in one popover.

**Filter pane** — search, `+ Tag`, the checkable list, and a pinned
`Modify tags` foot.

- `+ Tag` opens a create row at the top of the list. Enter commits,
  Escape cancels, a name that already exists is refused inline. It adds
  the tag to the vocabulary **only** — it does not put it on anything.
  Tagging a record is what surface B is for.
- `Modify tags` sits in `.cq-pop__foot`, **outside** the scrolling list.
  With forty tags in the list, an item at the end of it is unreachable
  without scrolling somewhere you had no reason to go.

**Manage pane** — the same list, each row with rename and delete.

- Switching panes **swaps in place**; it does not open a second window.
  The surface, its position and its width all hold, so it reads as going
  deeper rather than starting again. A back arrow returns.
- **Rename** turns the row into an input at the row's own height. Enter
  commits, Escape cancels. A duplicate name is refused with an inline
  message and the input stays open.
- **Delete** turns the row into an inline confirm — `Delete "X"? It
  comes off everything across the platform that carries it.` — with
  Cancel and a destructive Delete.
- Both edits stay **in the row**. A dialog for either would cover the
  list you are working down and lose your place in it.
- Row actions hold their space and fade in on hover. Laying them out on
  hover reflows the row and slides its contents out from under the
  pointer.
- Closing the popover resets it to the filter pane, so it opens where
  you left it rather than deep in a manage list.

### 2.5 Rename — the one operation that must be atomic

A rename touches four things. Miss any and the page holds two names for
one tag:

    1. the tag in the vocabulary
    2. every record carrying it
    3. its tone mapping
    4. the active filter selection

`renameTag()` does all four in one pass and then repaints every surface
through `afterTagChange()`. Delete is the same shape. **Do not
reimplement these piecemeal per surface.**

### 2.6 Events to wire server-side

| Event | Payload | Scope |
|---|---|---|
| `tag.create` | `{ name }` | platform |
| `tag.rename` | `{ id, name }` | platform — fans out to every record |
| `tag.delete` | `{ id }` | platform — fans out to every record |
| `record.tag.add` | `{ recordId, tagId }` | this record |
| `record.tag.remove` | `{ recordId, tagId }` | this record |

Rename and delete are platform-wide and want a confirm-then-commit
round trip; the other three are optimistic in the prototype and should
stay that way — they are cheap and reversible.

**Uniqueness is enforced case-insensitively** in the prototype and
should be enforced the same way server-side, since that is what the
inline "already exists" message promises.

---

## 3 · Accessibility

Done in the prototype:

- The 3-dot carries `role="button"`, `tabindex="0"`, `aria-label` and
  `aria-haspopup="menu"`, with Enter/Space wired by hand.
- The menu is `role="menu"` with `role="menuitem"` rows.
- `+ Tag` reflects `aria-expanded`.
- Every chip's × and every rename/delete button has an `aria-label`
  naming the tag.
- Escape closes the menu, the picker and an open rename or confirm.
- The rename input takes focus and selects its text on open; the create
  row takes focus on open.

**Not done — please add:**

- Focus is not trapped in the menu or the picker, and does not return to
  the trigger on close.
- Arrow-key roving between menu items.
- No live region announces a create, rename or delete.

---

## 4 · Theming and tokens

Both themes come from tokens; there are no hard-coded colours in any of
the tagging CSS. Tokens the tagging surfaces introduce:

| Token | Dark | Light | Note |
|---|---|---|---|
| `--text-coloured-red` | `#f57e64` | `#f24822` | **derived** |
| `--backgrounds-button-danger` | `#f24822` | `#f24822` | **derived**, one value both themes, like the primary fill |
| `--backgrounds-button-hover-danger` | `#d93b18` | `#d93b18` | **derived** |
| `--backgrounds-badge-red` | `#2b0d07` | `#fff4f1` | **derived** |
| `--strokes-colour-red` | `#5c1a0c` | `#ffdbd2` | **derived** |

See the README: these five are the one thing to replace before shipping.

---

## 5 · Scrollbars

Popover lists get a thin bar on a transparent track. The default one is
heavy and paints a dark track that, on a 277px popover, reads as a
second border.

Two mechanisms, layered on purpose:

    ::-webkit-scrollbar rules      ← older WebKit
    scrollbar-width / -color       ← Chrome 121+, Edge, Firefox, Safari 18.2+

Engines that understand the standard properties ignore the `-webkit-`
ones, so there is no conflict; older WebKit falls through to them.
Engines with neither keep their default, which is a fallback, not a bug.

---

## 6 · What is mocked

- All model data is in-memory (`MODELS`) and resets on reload.
- The tag vocabulary is `TAG_FILTERS` ∪ every tag on a model.
- No network, no persistence, no auth.
- Tones are assigned from a fixed map (`TAG_TONE`) and cycle for tags
  created at runtime. If tone is meaningful to you, it belongs on the
  tag record server-side.
- The GSAP icon animation on the platform panel degrades to no motion,
  with no errors, if the CDN does not load.
'''


def build():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    for f in ('model-hub.html', 'design-system.html', 'page-guidelines.html',
              'cogentiq-design-system.css'):
        shutil.copy(f, os.path.join(OUT, f))

    write(os.path.join(OUT, 'tagging/tagging.css'),
          '/* Tagging — the CSS, lifted verbatim from\n'
          '   cogentiq-design-system.css. It is here so you can read it in\n'
          '   one place; ship the library, not this file. */\n\n' + TAG_CSS)
    write(os.path.join(OUT, 'tagging/tagging.js'),
          '/* Tagging — the reference implementation, lifted verbatim from\n'
          '   model-hub.html. Vanilla, no dependencies, no build step. The\n'
          '   store it talks to (MODELS, TAG_FILTERS, state.tags) is the\n'
          '   prototype\'s; swap those three for your own and the surfaces\n'
          '   behave the same. */\n\n' + TAG_JS)
    write(os.path.join(OUT, 'tagging/tagging.html'), TAG_HTML)

    write(os.path.join(OUT, 'README.md'), README % TAG_JS.count('\n'))
    write(os.path.join(OUT, 'HANDOFF.md'), HANDOFF)

    zp = OUT + '.zip'
    if os.path.exists(zp):
        os.remove(zp)
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, _, files in os.walk(OUT):
            for f in sorted(files):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, '.'))
    shutil.rmtree(OUT)
    print('%s  ·  %.1f MB' % (zp, os.path.getsize(zp) / 1e6))


if __name__ == '__main__':
    build()
