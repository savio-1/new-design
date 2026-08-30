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

import panel_source as PS

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


def inject_panel(out):
    """Put the real panel in the library's own page, on the library's own
    classes. Lifted from the product and renamed rather than rewritten, so a
    rule the library is missing shows up as a broken demo rather than as
    nothing at all."""
    html = {k: PS.namespaced(PS.for_library(v)) for k, v in
            (('PANEL_HTML', PS.RAIL_HTML), ('UPSELL_HTML', PS.UPSELL_HTML),
             ('COACH_HTML', PS.COACH_HTML))}
    for key, val in html.items():
        out = out.replace('{{%s}}' % key, val)

    sprite, _ = PS.sprite(PS.RAIL_HTML, PS.UPSELL_HTML, PS.COACH_HTML)
    coach = PS.COACH_JS.replace(
        'setTimeout(startCoach, 1200);',
        "/* Docs: on request, not on a timer — see the section's control. */\n"
        "document.getElementById('dsCoach').addEventListener('click', () => {\n"
        "  endCoach();\n"
        "  document.getElementById('s-panel').scrollIntoView({ block: 'start' });\n"
        "  setTimeout(startCoach, 220);\n"
        "});")
    js = '\n\n'.join(PS.namespaced(b) for b in (PS.DEPS_JS, PS.RAIL_JS, coach))
    # The page's own script runs first and defines $; the panel's goes after
    # it so its listeners bind to markup that is already in the document.
    out = out.replace('</body>',
        sprite + '\n<script>\n'
        '/* ══ The platform panel, lifted from the product page ══════════\n'
        '   Class names are rewritten into this library\'s namespace at\n'
        '   build time; nothing else about it is changed. */\n'
        + js + '\n</script>\n</body>')
    return out

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
    if page == 'design-system':
        out = inject_panel(out)
    left = re.findall(r'\{\{[A-Z_]+\}\}', out)
    if left:
        sys.exit(f'{page}: unfilled placeholders {sorted(set(left))}')
    (here / f'{page}.html').write_text(out)
    print(f'{page}.html  ·  {len(out):,} bytes')
