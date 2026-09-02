#!/usr/bin/env python3
"""Rebuild the CogentIQ Platform shell with the Context module in it.

The platform artifact is a two-iframe shell holding every page as a
base64 srcdoc; pages navigate by postMessage('cqNav'). This script
re-encodes the existing pages with 'context' added to their rail map,
appends the platform's own shared wiring block to the Context page, and
writes the shell back out.
"""
import base64, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
P    = os.path.join(HERE, 'plat')
PG   = os.path.join(P, 'pages')

ORDER = ['index.html', 'automations.html', 'integrations.html', 'model-hub.html',
         'skills.html', 'doc-store.html', 'monitoring.html', 'checkpoints.html',
         'leaderboard.html']

rd = lambda p: open(p, encoding='utf8').read()

# ── the wiring block, lifted from a page that already carries it ──────
# It owns the rail links, the light/dark relay and the profile menu, so
# the Context page gets the platform behaviour by inheriting it rather
# than by a second implementation.
src = rd(os.path.join(PG, 'skills.html'))
i = src.rindex('<style>', 0, src.index('/* ── Combined product · shared shell wiring'))
j = src.index('</script>', i) + len('</script>')
wiring = src[i:j]
assert 'cq-pm-wrap' in wiring and 'cqNav' in wiring

# Context is reachable from two rail rows: the Library entry and the
# Context Studio offering above it.
ANCHOR = "    'doc store': 'doc-store.html',\n"
CTX    = ANCHOR + "    'context': 'context.html',\n    'context studio': 'context.html',\n"

def with_context_route(page_html):
    assert page_html.count(ANCHOR) == 1, 'rail map anchor not unique'
    return page_html.replace(ANCHOR, CTX, 1)

wiring = with_context_route(wiring)

# ── the Context page ──────────────────────────────────────────────────
# The page ships as an artifact fragment — the artifact host supplies the
# document skeleton. A srcdoc frame does not, so wrap it here: everything
# up to the single closing </style> is head, the rest is body.
frag = rd('/home/user/new-design/context-studio.html')
assert 'cq-pm-wrap' not in frag, 'already wired?'
assert frag.count('</style>') == 1
cut  = frag.index('</style>') + len('</style>')
ctx  = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n'
        + frag[:cut].strip()
        + '\n</head>\n<body>\n'
        + frag[cut:].strip()
        + '\n\n' + wiring
        + '\n\n</body>\n</html>\n')

pages = {}
for name in ORDER:
    pages[name] = with_context_route(rd(os.path.join(PG, name)))
pages['context.html'] = ctx

# Keep the Context entry beside the rest of the Library pages.
keys = ORDER[:ORDER.index('doc-store.html') + 1] + ['context.html'] + ORDER[ORDER.index('doc-store.html') + 1:]
enc  = {k: base64.b64encode(pages[k].encode('utf8')).decode('ascii') for k in keys}

# The split that produced these halves cut either side of the literal's
# own declaration, so put the declaration back around the new map.
shell = (rd(os.path.join(P, 'shell.head.html'))
         + 'var PAGES = ' + json.dumps(enc) + ';'
         + rd(os.path.join(P, 'shell.tail.html')))
out = '/home/user/new-design/cogentiq-platform.html'
open(out, 'w', encoding='utf8').write(shell)

print('pages:', ', '.join(keys))
print('context.html bytes:', len(pages['context.html']))
print('shell bytes:', len(shell))
for k in keys:
    assert "'context': 'context.html'" in pages[k], k + ' has no Context route'
print('every page routes to Context: ok')
