#!/usr/bin/env python3
"""Inline the stylesheet into the reference page.

design-system.html reads its own token values back out of the loaded
stylesheet, so the page can never drift from the library it documents.
That introspection needs same-document rules — an external sheet is
unreadable over file://, so the page ships self-contained and is built
from these two sources rather than edited directly.

    cogentiq-design-system.css   the library (edit this)
    design-system.src.html       the reference page (edit this)
    design-system.html           generated — do not edit
"""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
css = (here / 'cogentiq-design-system.css').read_text()
src = (here / 'design-system.src.html').read_text()

link = '  <link rel="stylesheet" href="cogentiq-design-system.css" />'
if link not in src:
    sys.exit('design-system.src.html: stylesheet link not found')

# The @import pulls Google Fonts; as an inlined <style> it must stay the
# first at-rule, so hoist it to a <link> instead.
font = re.search(r'@import url\("([^"]+)"\);\n?', css)
css_body = css.replace(font.group(0), '') if font else css
head = (f'  <link rel="stylesheet" href="{font.group(1)}" />\n' if font else '')

out = src.replace(link, head + '  <style>\n' + css_body.rstrip() + '\n  </style>')
(here / 'design-system.html').write_text(out)
print(f'design-system.html  ·  {len(out):,} bytes  ·  css inlined ({len(css_body):,})')
