#!/usr/bin/env python3
"""Rebuild the handoff package from the reference screen.

    python3 automations-landing-handoff/build.py

Regenerates css/, js/, assets/icons.svg and reference/ from
../automations-landing.html. The three markdown files (README, HANDOFF,
data/schema.md) and the JSON in data/ are hand-authored or dumped from a
browser — this script leaves them alone.

Run it after any change to the screen, so the split files cannot drift
from the file they came from.
"""
import re, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, '..', 'automations-landing.html')
s = open(SRC, encoding='utf8').read()

def blocks(tag):
    out = []
    for m in re.finditer(f'<{tag}>', s):
        out.append(s[m.end():s.index(f'</{tag}>', m.end())])
    return out

styles, scripts = blocks('style'), blocks('script')
if len(styles) != 3 or len(scripts) != 2:
    sys.exit(f'unexpected block count: {len(styles)} style, {len(scripts)} script — '
             'the reference changed shape; check this script before trusting it')

HEAD = ('/* Generated from automations-landing.html — the reference implementation is\n'
        '   the source of truth. This file is a split of it, not a rewrite: the rules\n'
        '   below are byte-identical to the block they came from. */\n\n')

cut = styles[0].index('/* ═══════════════════════════════════════════════════════════════════\n   3 · BASE')
parts = {'01-tokens.css': styles[0][:cut],
         '02-system.css': styles[0][cut:],
         '03-screen.css': styles[1] + '\n' + styles[2]}
for name, body in parts.items():
    open(f'{HERE}/css/{name}', 'w').write(HEAD + body.strip() + '\n')
assert parts['01-tokens.css'] + parts['02-system.css'] == styles[0], 'system css split lost content'

open(f'{HERE}/js/screen.js', 'w').write(
    '/* Generated from automations-landing.html — screen logic: data, render,\n'
    '   filters, popovers, lens switching, detail panel, theme. */\n' + scripts[0].strip() + '\n')
open(f'{HERE}/js/shell.js', 'w').write(
    '/* Generated from automations-landing.html — product chrome shared with the\n'
    '   other module screens: platform-rail navigation, the light/dark choice and\n'
    '   its cross-page sync, and the profile menu. Not specific to this screen. */\n'
    + scripts[1].strip() + '\n')

syms = []
for m in re.finditer(r'<svg class="sprite"[^>]*>', s):
    syms += re.findall(r'<symbol id="[^"]+".*?</symbol>', s[m.end():s.index('</svg>', m.start())], re.S)
ids = [re.match(r'<symbol id="([^"]+)"', x).group(1) for x in syms]
assert len(ids) == len(set(ids)), 'duplicate symbol id across sprites'
open(f'{HERE}/assets/icons.svg', 'w').write(
    '<!-- Generated from automations-landing.html. Inline this whole file once per\n'
    f'     document, then reference a glyph with <use href="#id">. {len(ids)} symbols. -->\n'
    '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">\n'
    + '\n'.join('  ' + x for x in syms) + '\n</svg>\n')

shutil.copy(SRC, f'{HERE}/reference/automations-landing.html')
print(f'rebuilt · {len(ids)} symbols · ' + ' '.join(
    f'{n} {os.path.getsize(f"{HERE}/css/{n}")//1024}KB' for n in parts))
