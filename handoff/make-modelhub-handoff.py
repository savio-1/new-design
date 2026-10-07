"""Split the generated Model Hub page into a plain HTML/CSS/JS handoff.

Cuts are made at the section headers the page already carries, and the
pieces are linked back in the order they were found — nothing is moved,
because a stylesheet's later rule wins and a script's later statement
runs second.
"""
import io, re, pathlib, shutil

SRC = pathlib.Path('/home/user/new-design/cogentiq/model-hub.html')
OUT = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85'
                   '/scratchpad/cogentiq-modelhub-handoff')
if OUT.exists():
    shutil.rmtree(OUT)
for d in ('css', 'js', 'film'):
    (OUT / d).mkdir(parents=True)

s = SRC.read_text()
blocks = lambda tag: [(m.start(), m.end(), m.group(1))
                      for m in re.finditer(r'<%s>(.*?)</%s>' % (tag, tag), s, re.S)]
sc = blocks('script')
# The clip travels as a template literal holding a whole HTML document,
# <style> and <script> of its own included. Those are text, not blocks
# of this page, so anything inside a script's span is not one.
st = [b for b in blocks('style') if not any(a < b[0] < z for a, z, _ in sc)]
assert len(st) == 3 and len(sc) == 3, (len(st), len(sc))

def at(text, marker, after=0):
    i = text.index(marker, after)
    return text.rindex('\n', 0, i) + 1 if i else 0

# ── The page's own stylesheet, cut at its own headers ──────────────
css = st[0][2]
c_rail  = at(css, '/* ── Platform panel (left rail)')
c_ctx   = at(css, '/* ── Upsell, anchored beside the panel')
c_main  = at(css, '/* ── Main content ──')
CSS_PARTS = [
    ('css/tokens.css',            css[:c_rail]),       # variables, reset, app shell
    ('css/platform-rail.css',     css[c_rail:c_ctx]),
    ('css/context-studio.css',    css[c_ctx:c_main]),  # offer, film, expand, coach mark
    ('css/model-hub.css',         css[c_main:]),       # header, cards, detail panel, Tiq bar
]
CSS_TAIL = [
    ('css/platform-rail-shared.css', st[1][2]),        # ported later, so it wins
    ('css/profile-dropdown.css',  st[2][2]),
]

# ── The page's own script, cut the same way ────────────────────────
js = sc[0][2]
j_clip  = at(js, '/* ══ Context Studio · the preview clip')
j_rail  = at(js, '/* ═══', j_clip + 100)
while 'Platform panel' not in js[j_rail:j_rail + 240]:
    j_rail = at(js, '/* ═══', j_rail + 100)
j_coach = at(js, '/* ── First run · the tooltip')
j_theme = at(js, '/* ═══', j_coach + 100)
JS_PARTS = [
    ('js/model-hub.js',           js[:j_clip]),        # data, render, modals, Tiq
    ('js/context-studio.js',      js[j_clip:j_rail]),  # the clip, the offer, hover to play
    ('js/platform-rail.js',       js[j_rail:j_coach]),
    ('js/context-studio-coach.js', js[j_coach:j_theme]),
    ('js/theme.js',               js[j_theme:]),
]
JS_TAIL = [
    ('js/platform-rail-shared.js', sc[1][2]),
    ('js/profile-dropdown.js',    sc[2][2]),
]
for name, text in JS_PARTS + JS_TAIL:
    assert text.strip(), name

def dedent(t):
    lines = t.strip('\n').rstrip().split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
    return '\n'.join(l[pad:] if l.strip() else '' for l in lines) + '\n'

for name, text in CSS_PARTS + CSS_TAIL + JS_PARTS + JS_TAIL:
    (OUT / name).write_text(dedent(text))

# The film, lifted out of its template literal so it can be opened on
# its own. The page still carries it as a string — see the README.
clip = dict(JS_PARTS)['js/context-studio.js']
m = re.search(r'const CINEMA_HTML = `(.*?)`;\n', clip, re.S)
assert m
(OUT / 'film/context-studio.html').write_text(
    '<!-- A copy of CINEMA_HTML from js/context-studio.js, lifted out so it\n'
    '     can be opened on its own. The page does not load this file. -->\n'
    + m.group(1).replace('\\`', '`').replace('\\$', '$') + '\n')

# ── The page, with links where the blocks were ─────────────────────
cuts = [(a, b, '<link rel="stylesheet" href="%s" />' % n)
        for (a, b, _), (n, _) in zip(st, [CSS_PARTS[0]] + CSS_TAIL)]
cuts += [(a, b, '<script src="%s"></script>' % n)
         for (a, b, _), (n, _) in zip(sc, [JS_PARTS[0]] + JS_TAIL)]
cuts.sort()
out, pos = [], 0
for a, b, rep in cuts:
    out.append(s[pos:a]); out.append(rep); pos = b
out.append(s[pos:])
html = ''.join(out)
# the three further pieces of each original block follow their first
html = html.replace('<link rel="stylesheet" href="css/tokens.css" />',
    '\n  '.join('<link rel="stylesheet" href="%s" />' % n for n, _ in CSS_PARTS), 1)
html = html.replace('<script src="js/model-hub.js"></script>',
    '\n'.join('<script src="%s"></script>' % n for n, _ in JS_PARTS), 1)
(OUT / 'model-hub.html').write_text(html)

for p in sorted(OUT.rglob('*')):
    if p.is_file():
        print(f'{str(p.relative_to(OUT)):34} {p.stat().st_size:>9,}')
