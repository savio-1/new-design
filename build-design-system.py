#!/usr/bin/env python3
"""Inline the stylesheets into the documentation pages.

Both docs read their own token values back out of the loaded stylesheet,
so they can never drift from the library they document. That needs
same-document rules — an external sheet is unreadable over file:// —
so each page ships self-contained and is built rather than edited.

    cogentiq-design-system.css   the library      (edit)
    docs-chrome.css              shared doc chrome (edit)
    *.src.html                   the pages        (edit)
    design-system.html           generated — do not edit
    page-guidelines.html         generated — do not edit
"""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
SHEETS = ['cogentiq-design-system.css', 'docs-chrome.css']
PAGES = ['design-system', 'page-guidelines']


def inline(css_name):
    css = (here / css_name).read_text()
    # The @import pulls Google Fonts; as an inlined <style> it would no
    # longer be the first at-rule, so hoist it to a <link> instead.
    font = re.search(r'@import url\("([^"]+)"\);\n?', css)
    body = css.replace(font.group(0), '') if font else css
    link = f'  <link rel="stylesheet" href="{font.group(1)}" />\n' if font else ''
    return link + '  <style>\n' + body.rstrip() + '\n  </style>'


blocks = {name: inline(name) for name in SHEETS}

for page in PAGES:
    src = here / f'{page}.src.html'
    if not src.exists():
        continue
    out = src.read_text()
    for name in SHEETS:
        tag = f'  <link rel="stylesheet" href="{name}" />'
        if tag not in out:
            sys.exit(f'{src.name}: missing link for {name}')
        out = out.replace(tag, blocks[name])
    (here / f'{page}.html').write_text(out)
    print(f'{page}.html  ·  {len(out):,} bytes')
