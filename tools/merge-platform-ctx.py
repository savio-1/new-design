#!/usr/bin/env python3
"""Apply this turn's two changes onto the platform's own Context page.

Another session republished the platform with a refreshed left rail
(`rail-*` classes plus an appended platform-panel block) and two new
pages. Its Context page is therefore ahead of what build-app.py emits,
so the two edits are applied to that page rather than regenerating it,
which would drop the newer rail.
"""
import json, base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
P    = os.path.join(HERE, 'plat2')
PG   = os.path.join(P, 'pages')
rd   = lambda p: open(p, encoding='utf8').read()

EDITS = [
    # The panel's bare `.row` was setting justify-content: space-between on
    # the create-bundle matrix's icon+title lines, pushing every column and
    # row name to the right edge. Scope it to the panel's own container.
    ("""    .rows { display: flex; flex-direction: column; }
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--strokes-line-3);
    }
    .row:last-child { border-bottom: 0; }
    .row .k { color: var(--text-teritiary); }
    .row .v { color: var(--text-secondary); text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row .v.who { display: flex; align-items: center; gap: 6px; }""",
     """    /* Scoped to .rows: a bare `.row` is too common a name to own in a
       document that also holds the create-bundle matrix, whose column
       heads use `.row` for their icon + title line. */
    .rows { display: flex; flex-direction: column; }
    .rows .row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--strokes-line-3);
    }
    .rows .row:last-child { border-bottom: 0; }
    .rows .row .k { color: var(--text-teritiary); }
    .rows .row .v { color: var(--text-secondary); text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rows .row .v.who { display: flex; align-items: center; gap: 6px; }"""),

    # Page bars: title, count and description on one line.
    ("""    .filters-bar .title-block { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .filters-bar h1 { margin: 0; color: var(--text-primary); }""",
     """    /* One line: name, count, then the description in the space left over. */
    .filters-bar .title-block { flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
    .filters-bar h1 { flex: none; color: var(--text-primary); }"""),
    ("""    .filters-bar .desc { color: var(--text-teritiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }""",
     """    .filters-bar .desc { flex: 1 1 auto; min-width: 0; color: var(--text-teritiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }"""),
    ("""    .gl-bar-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .gl-title-row { display: flex; align-items: center; gap: 8px; }
    .gl-title-row h1 { margin: 0; color: var(--text-primary); }
    .gl-bar .desc { color: var(--text-teritiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }""",
     """    /* Title, count and description share one line — the same shape the
       page header uses for "Context" and its subtext. The description
       takes the leftover width and truncates rather than wrapping, so
       the bar keeps a single-row height at any viewport. */
    .gl-bar-text { flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 10px; }
    .gl-title-row { flex: none; display: flex; align-items: center; gap: 8px; }
    .gl-title-row h1 { color: var(--text-primary); }
    .gl-bar .desc { flex: 1 1 auto; min-width: 0; color: var(--text-teritiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }"""),

    # Crisper copy, sized for a shared line.
    ('<span class="desc t-body2-reg">Create context bundles your assistants can use.</span>',
     '<span class="desc t-body2-reg">Reusable context bundles for your assistants.</span>'),
    ('<span class="desc t-body2-reg">Business dictionary that explains key terms and ideas for shared understanding across the organization.</span>',
     '<span class="desc t-body2-reg">Shared definitions for key business terms.</span>'),
]

ctx = rd(os.path.join(PG, 'context.html'))
for old, new in EDITS:
    assert ctx.count(old) == 1, 'not found exactly once: ' + old.strip()[:70]
    ctx = ctx.replace(old, new, 1)

pages = {name: rd(os.path.join(PG, name)) for name in sorted(os.listdir(PG))}
pages['context.html'] = ctx
enc = {k: base64.b64encode(v.encode('utf8')).decode('ascii') for k, v in pages.items()}

shell = (rd(os.path.join(P, 'shell.head.html'))
         + 'var PAGES = ' + json.dumps(enc) + ';'
         + rd(os.path.join(P, 'shell.tail.html')))
open('/home/user/new-design/cogentiq-platform.html', 'w', encoding='utf8').write(shell)
print('pages:', ', '.join(pages))
print('context.html bytes:', len(ctx))
print('shell bytes:', len(shell))
