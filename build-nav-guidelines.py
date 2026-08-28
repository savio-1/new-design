#!/usr/bin/env python3
"""Build the left-navigation handoff page.

Everything it shows is lifted out of model-hub.html at build time — the
tokens, the rail CSS, the markup, the sprite symbols and the behaviour
code. Nothing here is retyped, so the page cannot drift from the
component it documents, and the code blocks on it are the code that runs.

    nav-guidelines.src.html   the page      (edit)
    model-hub.html            the component (edit)
    nav-guidelines.html       generated — do not edit
"""
import pathlib, re, sys

here = pathlib.Path(__file__).parent
src  = (here / 'model-hub.html').read_text()


def between(start, end, *, keep_end=False):
    i = src.index(start)
    j = src.index(end, i + len(start))
    return src[i:j + (len(end) if keep_end else 0)].rstrip()


RAIL_CSS   = between('    /* ── Platform panel (left rail) ', '    /* ── Main content ')
RAIL_HTML  = between('  <aside class="rail"', '</aside>', keep_end=True)
UPSELL_HTML= between('<!-- Shown when Context Studio', '<!-- Ask Tiq —')
# The preview positions itself with this shared helper, so the handoff is
# incomplete without it — copying the behaviour block alone would not run.
DEPS_JS    = between('/* ══ Context Studio · the preview clip',
                     'function positionTiqBar()')
RAIL_JS    = between('const railEl = document.querySelector',
                     "railExposeOnly(railActive ? railActive.closest('.rail-group') : null);",
                     keep_end=True)
BTN_CSS    = between('    .btn-primary {', '    .btn-tonal {')
TYPE_RAMP  = between('    /* Body1/Med, Body2/Reg', '    /* ══════════════════════════════════════════════════════════════\n       RESET')

# Only the symbols the navigation actually references.
needed = sorted(set(re.findall(r'href="#(ic-[a-z0-9_]+)"', RAIL_HTML + UPSELL_HTML)))
symbols = []
for name in needed:
    m = re.search(r'<symbol id="%s".*?</symbol>' % re.escape(name), src, re.S)
    if not m:
        sys.exit(f'sprite symbol missing: {name}')
    symbols.append(m.group(0))
SPRITE = '<svg class="sprite" aria-hidden="true">' + ''.join(symbols) + '</svg>'

parts = {
    'TYPE_RAMP':  TYPE_RAMP,
    'RAIL_CSS':   RAIL_CSS,
    'BTN_CSS':    BTN_CSS,
    'SPRITE':     SPRITE,
    'RAIL_HTML':  RAIL_HTML,
    'UPSELL_HTML':UPSELL_HTML,
    'DEPS_JS':    DEPS_JS,
    'RAIL_JS':    RAIL_JS,
}

esc = lambda t: t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

out = (here / 'nav-guidelines.src.html').read_text()
for key, val in parts.items():
    out = out.replace('{{%s}}' % key, val)
    out = out.replace('{{%s_ESC}}' % key, esc(val))

# The tokens come from the library, not from a second copy here — the two
# are verified identical, and one source is the point of having a system.
for name in ('cogentiq-design-system.css', 'docs-chrome.css'):
    tag = f'  <link rel="stylesheet" href="{name}" />'
    if tag not in out:
        sys.exit(f'nav-guidelines.src.html: missing link for {name}')
    css = (here / name).read_text()
    font = re.search(r'@import url\("([^"]+)"\);\n?', css)
    body = css.replace(font.group(0), '') if font else css
    link = f'  <link rel="stylesheet" href="{font.group(1)}" />\n' if font else ''
    out = out.replace(tag, link + '  <style>\n' + body.rstrip() + '\n  </style>')

# Every class the extracted markup uses must appear in the CSS this page
# ships. This catches a class with no rules at all; it cannot catch a class
# that has a modifier rule but no base rule — .btn-primary was exactly that
# — so the rendered check in the test harness covers the rest.
styled = '\n'.join(
    re.findall(r'<style>([\s\S]*?)</style>', out))
missing = sorted({
    c for c in re.findall(r'class="([^"]+)"', RAIL_HTML + UPSELL_HTML)
    for c in c.split()
    if not re.search(r'[.\s,]%s[\s,{:.\[]' % re.escape(c), styled)
})
if missing:
    sys.exit(f'unstyled classes in the extracted markup: {missing}')

left = re.findall(r'\{\{[A-Z_]+\}\}', out)
if left:
    sys.exit(f'unfilled placeholders: {sorted(set(left))}')

(here / 'nav-guidelines.html').write_text(out)
print(f'nav-guidelines.html  ·  {len(out):,} bytes  ·  {len(needed)} sprite symbols')
