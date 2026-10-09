#!/usr/bin/env python3
"""Build dist/almaconnect-site.html: the whole site in one offline file.

Six pages travel inside it (home, the four product pages and About), each
exactly as the artifact host serves it: same skeleton, CSS, images, video
and scripts. The only changes are routing and fonts:

  * every link that means another of the six pages (artifact URLs, the
    placeholder almaconnect.com URLs, the homepage's #news-style anchors)
    becomes an in-file route, so the navs, footers and product cards move
    between pages without leaving the file;
  * the Google Fonts <link> is dropped and the same Geist + Nunito Sans
    woff2 files (assets/fonts/) ride along as data URIs;
  * About, which never had a phone menu, gets the same burger + sheet the
    product pages use.

The shell shows one page at a time in a full-window iframe (each page keeps
its own CSS and scripts, which would collide in a single document). The
address bar carries #news, #about and so on, so Back works and a page can
be linked to directly.

Sources: almaconnect-home.html (run build-home.py first) and site/*.html,
the sub-pages exactly as the artifact host serves them. The product pages
are edited elsewhere, so before every build re-read each live artifact and
copy it over its site/ file; a stale copy ships an old page. Live links:
  news         https://claude.ai/artifact/4FuQxzHfutUX6ecVaou7SR
  data-mine    https://claude.ai/artifact/JbRjpKSwrjefLHLfrQ8Exb
  institutions https://claude.ai/artifact/MY79nGkgJoV2iDvx5sNX7v
  corporates   https://claude.ai/artifact/3cGaDiZzdxPSgRSVAnrwBu
  about        https://claude.ai/artifact/F9yvG7aMzGqXqnRiuDMRbV
Run:  python3 scripts/build-site.py
"""
import base64, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'
OUT = ROOT / 'dist' / 'almaconnect-site.html'

PAGES = [  # route, source, wrap in the host skeleton?
    ('home', ROOT / 'almaconnect-home.html', True),
    ('news', SITE / 'news.html', False),
    ('data-mine', SITE / 'data-mine.html', False),
    ('institutions', SITE / 'institutions.html', False),
    ('corporates', SITE / 'corporates.html', False),
    ('about', SITE / 'about.html', False),
]

# every URL that stands for one of the six pages (query strings ignored)
ABSOLUTE = {
    'https://claude.ai/artifact/Uy7WfWmyWdeuYsQvkcd7U6': 'home',
    'https://claude.ai/code/artifact/e27c6863-2000-46f4-bdf7-a037cc551a6b': 'home',
    'https://almaconnect.com/products': 'home',
    'https://claude.ai/artifact/4FuQxzHfutUX6ecVaou7SR': 'news',
    'https://claude.ai/code/artifact/1a602129-77d6-402e-bf2e-355bed9eecba': 'news',
    'https://news.almaconnect.com/': 'news',
    'https://claude.ai/artifact/JbRjpKSwrjefLHLfrQ8Exb': 'data-mine',
    'https://claude.ai/code/artifact/8e79e40f-611d-4591-8c15-07d5a55f3194': 'data-mine',
    'https://almaconnect.com/data-mine': 'data-mine',
    'https://claude.ai/artifact/MY79nGkgJoV2iDvx5sNX7v': 'institutions',
    'https://claude.ai/code/artifact/a64e9ef9-b598-4ba8-8b6c-e7b7b14c12f1': 'institutions',
    'https://almaconnect.com/institutions': 'institutions',
    'https://claude.ai/artifact/3cGaDiZzdxPSgRSVAnrwBu': 'corporates',
    'https://claude.ai/code/artifact/151ee804-4b69-409e-b10f-16a1b2631fa8': 'corporates',
    'https://almaconnect.com/corporates': 'corporates',
    'https://claude.ai/code/artifact/72a0f7f2-38fd-4589-8cab-de08f007e0d0': 'about',
    'https://claude.ai/artifact/F9yvG7aMzGqXqnRiuDMRbV': 'about',
    'https://almaconnect.com/about': 'about',
}
# home and About were built with in-page anchors standing in for the pages
ANCHORS = {
    '#news': 'news', '#data-mine': 'data-mine',
    '#network-institutions': 'institutions', '#network-corporates': 'corporates',
    '#about': 'about',
}
PAGE_ANCHORS = {
    'home': {**ANCHORS, '#company': 'about'},
    'about': {**ANCHORS, '#all-products': 'home'},
}

FONT_LINK = re.compile(r'<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>\n?')
SKELETON_HEAD = re.compile(r'<head>', re.I)


def route_for(page, tag, href):
    base = href.split('?')[0]
    if base in ABSOLUTE:
        return ABSOLUTE[base]
    if href in PAGE_ANCHORS.get(page, {}):
        return PAGE_ANCHORS[page][href]
    if page == 'about' and href == '#':
        # the logo goes home; the "About" entry in its own mega menu is itself
        return 'home' if 'AlmaConnect home' in tag else 'about'
    return None


def wire_links(page, html):
    count = 0

    def fix(m):
        nonlocal count
        tag = m.group(0)
        hm = re.search(r'\shref="([^"]*)"', tag)
        if not hm:
            return tag
        r = route_for(page, tag, hm.group(1))
        if not r:
            return tag
        count += 1
        tag = tag.replace(hm.group(0), ' href="#%s" data-route="%s"' % (r, r))
        return re.sub(r'\s(?:target|rel)="[^"]*"', '', tag)

    return re.sub(r'<a\b[^>]*>', fix, html), count


# ---- the phone menu About never had (same markup as the product pages) ----
MNAV_CSS = """<style>
/* phone menu, added for the site bundle: below 1000px the bar's links stand down */
.nav__burger { display: none; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; place-items: center; }
.nav__burger:hover { background: rgba(4, 48, 43, 0.06); }
.nav__burger path { transition: transform 0.3s var(--ease), opacity 0.2s ease; transform-origin: 12px 12px; }
.nav__burger[aria-expanded="true"] .b1 { transform: translateY(5px) rotate(45deg); }
.nav__burger[aria-expanded="true"] .b2 { opacity: 0; }
.nav__burger[aria-expanded="true"] .b3 { transform: translateY(-5px) rotate(-45deg); }
.mnav { margin: 10px 16px 0; padding: 18px 22px 22px; background: var(--surface); border: 1px solid var(--hairline); border-radius: var(--r-panel); box-shadow: 0 18px 40px rgba(4, 48, 43, 0.12); max-height: calc(100vh - var(--nav-h) - 40px); overflow-y: auto; color: var(--ink); }
.mnav[hidden] { display: none; }
.mnav__label { margin: 14px 0 4px; font-family: var(--font-body); font-size: 12px; letter-spacing: -0.03em; color: var(--ink-65); }
.mnav__label:first-child { margin-top: 0; }
.mnav__link { display: block; padding: 9px 0; font-family: var(--font-display); font-size: 18px; letter-spacing: -0.03em; color: var(--ink); }
.mnav__login { display: block; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--hairline); font-family: var(--font-body); font-size: 16px; font-weight: 600; letter-spacing: -0.03em; color: var(--ink); }
@media (max-width: 1000px) { .nav__burger { display: grid; } .nav__right { gap: 6px; } }
@media (min-width: 1001px) { .mnav { display: none !important; } }
@media (max-width: 620px) {
  .nav__bar { padding-inline: 16px; }
  .nav__logo img { height: 26px; }
  .nav__login { display: none; }
  .btn--nav { height: 40px; padding-inline: 16px; font-size: 14px; }
}
</style>
"""
BURGER = """      <button class="nav__burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path class="b1" d="M4 7h16"/><path class="b2" d="M4 12h16"/><path class="b3" d="M4 17h16"/></svg>
      </button>
"""
ABOUT_MNAV = """  <nav class="mnav" id="mnav" aria-label="Menu" hidden>
    <a class="mnav__link" href="#home" data-route="home">Home</a>
    <p class="mnav__label">Products</p>
    <a class="mnav__link" href="#news" data-route="news">AlmaConnect News</a>
    <a class="mnav__link" href="#data-mine" data-route="data-mine">AlmaConnect Data Mine</a>
    <a class="mnav__link" href="#institutions" data-route="institutions">Alumni Network for Institutions</a>
    <a class="mnav__link" href="#corporates" data-route="corporates">Alumni Network for Corporates</a>
    <p class="mnav__label">Company</p>
    <a class="mnav__link" href="#about" data-route="about" aria-current="page">About</a>
    <a class="mnav__link" href="#customers">Customers</a>
    <a class="mnav__link" href="#contact">Contact</a>
    <a class="mnav__login" href="#login">Log in</a>
  </nav>

"""
MNAV_JS = """<script>
/* phone menu: open and close the sheet under the bar */
(function () {
  var nav = document.getElementById('siteNav');
  var burger = nav && nav.querySelector('.nav__burger'), mnav = document.getElementById('mnav');
  if (!burger || !mnav) return;
  function setMenu(open) {
    mnav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-scrolled', open || window.scrollY > 12);
  }
  burger.addEventListener('click', function () { setMenu(mnav.hidden); });
  [].slice.call(mnav.querySelectorAll('a')).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); burger.focus(); } });
})();
</script>
"""


def add_about_menu(html):
    head_end = html.index('<header class="nav" id="siteNav">')
    style_end = html.rfind('</style>', 0, head_end) + len('</style>')
    html = html[:style_end] + '\n' + MNAV_CSS + html[style_end:]
    start = html.index('<header class="nav" id="siteNav">')
    m = re.search(r'(<div class="nav__right">.*?)(    </div>\n  </div>\n)', html[start:], re.S)
    a, b = m.span(2)
    html = html[:start + a] + BURGER + '    </div>\n  </div>\n\n' + ABOUT_MNAV + html[start + b:]
    return html + MNAV_JS


ROUTER_JS = """<script>
/* site bundle: links to another page ask the shell to show it */
(function () {
  var here = %s;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-route]');
    if (!a) return;
    e.preventDefault();
    var r = a.getAttribute('data-route');
    if (r === here) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    parent.postMessage({ acRoute: r }, '*');
  }, true);
})();
</script>
"""


def fonts_css():
    css = (ROOT / 'assets' / 'fonts' / 'fonts.css').read_text()
    def inline(m):
        data = (ROOT / 'assets' / 'fonts' / m.group(1)).read_bytes()
        return 'url(data:font/woff2;base64,%s)' % base64.b64encode(data).decode()
    return re.sub(r'url\(([\w.-]+\.woff2)\)', inline, css)


def main():
    skeleton = (SITE / '_host-skeleton.html').read_text()
    pages, report = {}, []
    for route, src, wrap in PAGES:
        html = src.read_text()
        if wrap:
            html = skeleton + html
        html, fonts_removed = FONT_LINK.subn('', html)
        html = SKELETON_HEAD.sub('<head><!--AC_FONTS-->', html, count=1)
        if route == 'about' and 'nav__burger' not in html:
            html = add_about_menu(html)
        html, links = wire_links(route, html)
        html += ROUTER_JS % json.dumps(route)
        title = re.search(r'<title>([^<]*)</title>', html).group(1).strip()
        pages[route] = {'title': title, 'html': html}
        report.append((route, title, links, fonts_removed, len(html)))

    data = json.dumps({'fonts': fonts_css(), 'pages': pages}).replace('<', '\\u003c')
    shell = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>AlmaConnect</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #f2efea; }
  #ac-view { display: block; width: 100%; height: 100%; border: 0; }
</style>
</head>
<body>
<!-- AlmaConnect site bundle: home, News, Data Mine, Institutions, Corporates
     and About in one file. Built by scripts/build-site.py; do not edit. -->
<iframe id="ac-view" title="AlmaConnect"></iframe>
<noscript>This file shows the AlmaConnect site and needs JavaScript turned on.</noscript>
<script type="application/json" id="ac-data">""" + data + """</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById('ac-data').textContent);
  var FONTS = '<style>' + DATA.fonts + '</style>';
  var frame = document.getElementById('ac-view');
  var current = null;
  function wanted() {
    var r = location.hash.replace(/^#\\/?/, '');
    return DATA.pages[r] ? r : 'home';
  }
  function show(r) {
    if (r === current) return;
    current = r;
    var p = DATA.pages[r];
    frame.srcdoc = p.html.replace('<!--AC_FONTS-->', FONTS);
    document.title = p.title;
  }
  frame.addEventListener('load', function () { try { frame.contentWindow.focus(); } catch (e) {} });
  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow) return;
    var r = e.data && e.data.acRoute;
    if (!DATA.pages[r]) return;
    if (location.hash === '#' + r) show(r); else location.hash = r;
  });
  window.addEventListener('hashchange', function () { show(wanted()); });
  show(wanted());
})();
</script>
</body>
</html>
"""
    OUT.write_text(shell)
    for r in report:
        print('%-13s %-32s links->routes %3d  font links removed %d  %5.2f MB' % (r[0], r[1], r[2], r[3], r[4] / 1e6))
    print('wrote %s  %.2f MB' % (OUT.relative_to(ROOT), OUT.stat().st_size / 1e6))


if __name__ == '__main__':
    main()
