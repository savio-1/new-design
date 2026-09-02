#!/usr/bin/env python3
"""Put one platform panel on every CogentIQ page.

The panel is a published component (artifact 6761014c); its parts are
extracted verbatim into panel/ and dropped into each page here. Before
this, the ten pages carried three different rails: four on plain .rail,
six on the design system's .cq-rail port, and only model-hub with the
Context Studio offer's preview film. One component, ten pages.

Two things the component does not ship are kept, because they were asked
for after it was cut: the C drive row reads Doc store, and Monitor has a
Monitoring row under it.
"""
import pathlib, re, sys

HERE = pathlib.Path(__file__).parent
P = HERE / 'panel'
PAGES = pathlib.Path('/home/user/new-design/cogentiq')

RAIL_CSS   = (P / 'rail.css').read_text()
SPRITE     = (P / 'sprite.svg').read_text()
RAIL_HTML  = (P / 'rail.html').read_text()
UPSELL     = (P / 'upsell.html').read_text()
FILMBOX    = (P / 'filmbox.html').read_text()
GSAP       = (P / 'gsap.html').read_text()
DEPS_JS    = (P / 'deps.js').read_text()
RAIL_JS    = (P / 'rail.js').read_text()

# The component's offer card carries a preview film: a built clip with
# fourteen embedded stills and its own webfont, 494KB of the component's
# 545KB. Copied into ten pages it put every page near a megabyte, and
# the shell — which swaps pages as srcdoc — began revealing documents
# that were still parsing. So the film ships where it already ran, and
# the other nine get the same card without the media well, which is the
# card the product already showed on three of them. The navigation, which
# is what the panel is, is identical everywhere.
FILM_START = '/* ── The big view '
FILM_END = "$('ctxStudio').addEventListener('click'"

def lite_rail_js():
    j = RAIL_JS
    i, k = j.index(FILM_START), j.index(FILM_END)
    j = j[:i] + j[k:]
    j = j.replace("  if (!filmOffer) filmOffer = mountCinema($('upsellFilm'));\n"
                  "  else filmOffer.restart();\n", '')
    j = j.replace("  if (filmOffer) filmOffer.pause();\n", '')
    j = j.replace("  $('upsellExpand').addEventListener", "  /* no film here */ ($('upsellExpand') || {addEventListener: function () {}}).addEventListener")
    assert 'mountCinema' not in j and 'filmBox' not in j and 'filmBig' not in j, 'film not fully out'
    return j

def lite_upsell():
    return re.sub(r'\s*<!-- The preview film.*?</div>\n', '\n', UPSELL, flags=re.S)

RAIL_JS_LITE = lite_rail_js()
UPSELL_LITE = lite_upsell()

# ── the canonical rail ────────────────────────────────────────────────
canon = RAIL_HTML
assert 'title="C drive"' in canon
canon = canon.replace('title="C drive"', 'title="Doc store"')
canon = re.sub(r'(rail-lbl">)C drive(</span>)', r'\1Doc store\2', canon)

MON_ROW = ('        <button class="rail-btn" title="Monitoring">'
           '<svg class="ic" width="14" height="14" viewBox="0 0 14 14">'
           '<use href="#ic-pp_monitorcog"/></svg>'
           '<span class="rail-lbl">Monitoring</span></button>\n')
mon = re.search(r'(<div class="rail-group" data-group="monitor">.*?</button>\n)(\s*</div>)', canon, re.S)
assert mon, 'monitor group not found'
canon = canon[:mon.end(1)] + '      <div class="rail-stack">\n' + MON_ROW + '      </div>\n' + canon[mon.start(2):]
canon = canon.replace('aria-expanded="false" title="Monitor"', 'aria-expanded="false" title="Monitor"')
# the component ships Model Hub active; each page sets its own below
canon = canon.replace('<button class="rail-btn is-active" title="Model Hub" aria-current="page">',
                      '<button class="rail-btn" title="Model Hub">')
assert 'is-active' not in canon, 'canonical rail should start with nothing active'

ACTIVE = {
 'index.html': 'Home', 'automations.html': 'Automations', 'skills.html': 'Skills',
 'integrations.html': 'Integrations', 'model-hub.html': 'Model Hub',
 'doc-store.html': 'Doc store', 'context.html': 'Context',
 'monitoring.html': 'Monitoring', 'checkpoints.html': None, 'leaderboard.html': None,
}

def rail_for(page):
    r = canon
    title = ACTIVE.get(page)
    if title:
        old = '<button class="rail-btn" title="%s">' % title
        assert old in r, (page, title)
        r = r.replace(old, '<button class="rail-btn is-active" title="%s" aria-current="page">' % title, 1)
    return r

# ── the four shapes the old rail JS comes in ──────────────────────────
# ── the shapes the old rail JS comes in ───────────────────────────────
#    Anchored on the code rather than the comment above it: the six
#    namespaced pages label the same block four different ways.
CUTS = [
 # index: its own trimmed block
 ("const railEl = document.querySelector('.rail');",
  "$('ctxStudio').addEventListener('click', e => e.stopPropagation());"),
 # model-hub, skills, doc-store: the full component's block
 ("const railEl = document.querySelector('.rail');",
  "railExposeOnly(railActive ? railActive.closest('.rail-group') : null);"),
]
NS_START = re.compile(r"(?:/\*[^\n]*Platform panel[^\n]*\*/\n)?const rail = \$\('rail'\);")
NS_END = re.compile(r"/\*\s*[═─]{2,}\s*Theme\s*[═─]{2,}\s*\*/")

def cut_old_js(s, page):
    for start, end in CUTS:
        i = s.find(start)
        if i < 0:
            continue
        j = s.find(end, i)
        if j < 0:
            continue
        # Two things the removed block declared that page code outside it
        # still reads at its own top level -- model-hub's first-run coach
        # mark uses both. Same definitions the component gives them.
        keep = ("const railEl = document.querySelector('.rail');\n"
                "const OWNS_CONTEXT_STUDIO = "
                "new URLSearchParams(location.search).get('cs') === 'owned';\n")
        return s[:i] + keep + s[j + len(end):], (j - i)
    m = NS_START.search(s)
    if m:
        e = NS_END.search(s, m.end())
        assert e, f'{page}: namespaced rail JS has no Theme section after it'
        keep = "const rail = document.querySelector('.rail');\n"
        return s[:m.start()] + keep + s[e.start():], (e.start() - m.start())
    return s, 0   # a page built after the port never had its own rail JS

def merge_sprite(s, page):
    have = set(re.findall(r'<symbol id="(ic-[a-z0-9_]+)"', s))
    need = set(re.findall(r'href="#(ic-[a-z0-9_]+)"', rail_for(page) + UPSELL + FILMBOX))
    add = []
    for name in sorted(need - have):
        m = re.search(r'<symbol id="%s".*?</symbol>' % re.escape(name), SPRITE, re.S)
        assert m, f'{page}: sprite symbol {name} missing from the component'
        add.append(m.group(0))
    if not add:
        return s, []
    k = s.index('</svg>', s.index('<svg class="sprite"'))
    return s[:k] + ''.join(add) + s[k:], sorted(need - have)

WIRING = '/* ── Combined product · shared shell wiring'

BUNDLE_OPEN = '<style>\n/* ── Platform panel (left rail) '

def strip_previous_bundle(s):
    i = s.find(BUNDLE_OPEN)
    if i < 0:
        return s, False
    # the bundle runs: <style>…</style> [gsap tag] <script>(function () {…})();</script>
    j = s.index('</style>', i) + len('</style>')
    k = s.find('<script', j)
    assert k >= 0 and k - j < 200, 'bundle shape not recognised'
    if 'gsap' in s[k:s.index('>', k)]:           # the external tag first
        k = s.index('<script', s.index('>', k))
    end = s.index('</script>', k) + len('</script>')
    return s[:i] + s[end:], True

for page in sorted(p.name for p in PAGES.glob('*.html')):
    f = PAGES / page
    s = f.read_text()
    s, had = strip_previous_bundle(s)

    # 1 · the panel itself
    m = re.search(r'<aside class="(?:cq-)?rail"[^>]*>.*?</aside>', s, re.S)
    if m:
        s = s[:m.start()] + rail_for(page).rstrip() + s[m.end():]
    else:
        k = s.index('<div class="cq-page"')
        s = s[:k] + rail_for(page).rstrip() + '\n\n' + s[k:]

    # 2 · the offer card and the view it opens
    has_film = 'function mountCinema' in s or 'mountCinema =' in s
    card = UPSELL if has_film else UPSELL_LITE
    u = re.search(r'<div class="(?:cq-)?upsell" id="upsell".*?\n</div>', s, re.S)
    if u:
        s = s[:u.start()] + card + s[u.end():]
    else:
        k = s.index('</aside>') + len('</aside>')
        s = s[:k] + '\n\n' + card + s[k:]
    b = re.search(r'<div class="filmbox" id="filmBox".*?\n</div>', s, re.S)
    if has_film:
        s = (s[:b.start()] + FILMBOX + s[b.end():]) if b else (
            s[:s.index(card) + len(card)] + '\n\n' + FILMBOX + s[s.index(card) + len(card):])
    elif b:
        s = s[:b.start()].rstrip() + '\n' + s[b.end():]

    # 3 · symbols
    s, added = merge_sprite(s, page)

    # 4 · out with the old behaviour
    s, cut = cut_old_js(s, page)

    # 5 · in with the component's stylesheet and behaviour, ahead of the
    #     shared chrome so re-running inject-shell.py still finds its own
    #     block and nothing else.
    bundle = ['\n<style>\n', RAIL_CSS, '\n</style>\n']
    # The icon-draw motion on hover is gated on window.gsap. It is one
    # 72KB script from cdnjs, not embedded, so every page carries it.
    if 'gsap.min.js' not in s:
        bundle += ['\n', GSAP, '\n']
    # Wrapped, not appended raw: the component opens with its own
    # `const $ = ...` helper and every page already has one, and a
    # redeclaration at global scope is a SyntaxError that takes the
    # whole block down with it. Inside a function it keeps its own $ and
    # still sees the page globals it needs.
    bundle += ['\n<script>\n(function () {\n',
               'var $ = function (id) { return document.getElementById(id); };\n',
               RAIL_JS if has_film else RAIL_JS_LITE,
               '\n})();\n</script>\n']
    bundle = ''.join(bundle)

    i = s.find(WIRING)
    if i > 0:
        st = s.rfind('<script>', 0, i)
        pre = s[:st].rstrip()
        if pre.endswith('</style>'):
            st = s.rfind('<style>', 0, pre.rfind('</style>'))
        s = s[:st] + bundle + s[st:]
    else:
        m2 = re.search(r'\s*</body>\s*(?:</html>)?\s*$', s)
        s = (s[:m2.start()] if m2 else s.rstrip()) + bundle + '\n</body>\n</html>\n'

    assert s.count('<!--') == s.count('-->'), (
        f'{page}: HTML comments do not balance -- an unclosed comment makes '
        'the whole rest of the document inert, scripts included')
    f.write_text(s)
    print('%-22s %s cut %5d  film=%-5s symbols+=%-16s now %7d bytes'
          % (page, 'replaced' if had else 'ported  ', cut, has_film, added or '-', len(s)))
