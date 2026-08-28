#!/usr/bin/env python3
"""One extractor for the platform panel, shared by both documentation builds.

The panel lives in model-hub.html. Both docs pages show it live rather than
as a picture, so both lift the same source: markup, CSS, sprite and
behaviour. Extracting rather than copying is what keeps three files from
disagreeing about what a row is.

`namespaced()` additionally rewrites the lifted markup and behaviour into
the library's cq- classes, so the design system's demo runs on the library's
own CSS. That makes the demo a test of the port: if the port is missing a
rule, the demo shows it.
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).parent
SRC = (HERE / 'model-hub.html').read_text()


def between(start, end, *, keep_end=False, src=SRC):
    i = src.index(start)
    j = src.index(end, i + len(start))
    return src[i:j + (len(end) if keep_end else 0)].rstrip()


RAIL_CSS    = between('    /* ── Platform panel (left rail) ', '    /* ── Main content ')
BTN_CSS     = between('    .btn-primary {', '    .btn-tonal {')
TYPE_RAMP   = between('    /* Body1/Med, Body2/Reg',
                      '    /* ══════════════════════════════════════════════════════════════\n       RESET')
RAIL_HTML   = between('  <aside class="rail"', '</aside>', keep_end=True)
UPSELL_HTML = between('<!-- Shown when Context Studio', '<!-- Ask Tiq —')
COACH_HTML  = between('<span class="coach-ring"', '<!-- The big view the preview')
RAIL_JS     = between('const railEl = document.querySelector',
                      "railExposeOnly(railActive ? railActive.closest('.rail-group') : null);",
                      keep_end=True)
# The placement helper sits with the Tiq machinery; the clip with the offer
# it plays in. Neither is adjacent to the panel's own block.
# The coach mark sits past the panel's own block, with the first-run logic.
COACH_JS = between('/* ── First run · the tooltip ─────────────────────────────────────\n   Shown once,',
                   "setTimeout(startCoach, 1200);", keep_end=True)

DEPS_JS = (between('/* Both Tiq bars sit beside the surface that owns them',
                   'function positionTiqBar()')
           + '\n\n' +
           between('/* ══ Context Studio · the preview clip',
                   'const railEl = document.querySelector'))


def sprite(*markup):
    """Only the symbols the given markup references."""
    names = sorted(set(re.findall(r'href="#(ic-[a-z0-9_]+)"', ''.join(markup))))
    out = []
    for name in names:
        m = re.search(r'<symbol id="%s".*?</symbol>' % re.escape(name), SRC, re.S)
        if not m:
            sys.exit(f'sprite symbol missing: {name}')
        out.append(m.group(0))
    return '<svg class="sprite" aria-hidden="true">' + ''.join(out) + '</svg>', names


# ── cq- namespace ───────────────────────────────────────────────────────
# Longest first: .rail-tile-wrap must not be rewritten by the .rail rule.
_CLASSES = ['rail-tile-wrap', 'rail-ghead--leaf', 'rail-group--offering',
            'rail-head', 'rail-brand', 'rail-logo', 'rail-wordmark', 'rail-collapse',
            'rail-market', 'rail-rule--cs', 'rail-rule', 'rail-group', 'rail-stack',
            'rail-ghead', 'rail-chev--cs', 'rail-chev', 'rail-tile', 'rail-btn',
            'rail-lbl', 'rail-dot', 'rail-flag', 'rail-cs-note', 'rail',
            'upsell-media-note', 'upsell-media', 'upsell-expand', 'upsell-head',
            'upsell-title', 'upsell-body', 'upsell-actions', 'upsell-learn',
            'upsell-play', 'upsell', 'filmbox-stage', 'filmbox-close', 'filmbox',
            'coach-ring', 'coach-tip', 'coach-arrow', 'coach-x',
            'grad-blue', 'grad-purple', 'grad-indigo', 'grad-orange', 'grad-green',
            'grad-context', 'btn-primary']
_ALT = '|'.join(re.escape(c) for c in _CLASSES)


def for_library(markup):
    """Drop the elements that only exist for placement variants the library
    does not ship. Their `display: none` defaults live in the variant rules,
    so markup kept without them renders a chevron that discloses nothing and
    a caption that squashes the row."""
    markup = re.sub(r'\s*<!--[^>]*?F only:.*?-->', '', markup, flags=re.S)
    markup = re.sub(r'\s*<!--[^>]*?D only\..*?-->', '', markup, flags=re.S)
    markup = re.sub(r'\s*<svg class="ic rail-chev rail-chev--cs".*?</svg>', '', markup, flags=re.S)
    markup = re.sub(r'\s*<span class="rail-cs-note">.*?</span>', '', markup, flags=re.S)
    # The page sends the row past the categories with an attribute selector on
    # the variant; the library states it as a modifier, so the markup has to
    # carry that modifier or the row stays in category order.
    markup = markup.replace('class="rail-group" data-group="context-studio"',
                            'class="rail-group rail-group--offering" data-group="context-studio"')
    return markup


def namespaced(text):
    """Rewrite class attributes and CSS/JS selectors into the cq- namespace."""
    def attr(m):
        names = [('cq-' + c if c in _CLASSES else c) for c in m.group(2).split()]
        return f'{m.group(1)}"{" ".join(names)}"'
    text = re.sub(r'(class=)"([^"]*)"', attr, text)
    text = re.sub(r'\.(%s)(?![-\w])' % _ALT, lambda m: '.cq-' + m.group(1), text)
    # .ic is the page's icon class; the library calls it .cq-ic
    text = re.sub(r'(class=)"([^"]*)"', lambda m: m.group(1) + '"' + ' '.join(
        'cq-ic' if c == 'ic' else c for c in m.group(2).split()) + '"', text)
    text = re.sub(r'\.ic(?![-\w])', '.cq-ic', text)
    return text
