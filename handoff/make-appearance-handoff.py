"""Split the generated Settings page into a plain HTML/CSS/JS handoff."""
import io, re, pathlib, shutil

SRC = pathlib.Path('/home/user/new-design/cogentiq/settings.html')
OUT = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85/scratchpad/cogentiq-appearance-handoff')
if OUT.exists():
    shutil.rmtree(OUT)
(OUT / 'css').mkdir(parents=True)
(OUT / 'js').mkdir()

s = SRC.read_text()

def blocks(tag):
    out = []
    for m in re.finditer(r'<%s>(.*?)</%s>' % (tag, tag), s, re.S):
        out.append((m.start(), m.end(), m.group(1)))
    return out

st, sc = blocks('style'), blocks('script')
assert len(st) == 5 and len(sc) == 3, (len(st), len(sc))

ds, frame1, mixed, rail_css, menu_css = [b[2] for b in st]
page_js, rail_js, menu_js = [b[2] for b in sc]

# CSS_COMMON and the page's own rules share one block; the page's start
# at .st-wrap, the first selector SET_CSS defines.
cut = mixed.index('.st-wrap {')
frame2, page_css = mixed[:cut], mixed[cut:]

def dedent(t):
    lines = t.strip('\n').rstrip().split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
    return '\n'.join(l[pad:] if l.strip() else '' for l in lines) + '\n'

FILES = {
    'css/cogentiq-design-system.css': dedent(ds),
    'css/page-frame.css':             dedent(frame1) + '\n\n' + dedent(frame2),
    'css/settings.css':               dedent(page_css),
    'css/platform-rail.css':          dedent(rail_css),
    'css/profile-dropdown.css':       dedent(menu_css),
    'js/settings.js':                 dedent(page_js),
    'js/platform-rail.js':            dedent(rail_js),
    'js/profile-dropdown.js':         dedent(menu_js),
}
for name, text in FILES.items():
    (OUT / name).write_text(text)

# The page keeps everything that is not a style or a script, with links
# to the files above put where the blocks were.
LINK = {
    0: '<link rel="stylesheet" href="css/cogentiq-design-system.css" />',
    1: '<link rel="stylesheet" href="css/page-frame.css" />',
    2: '<link rel="stylesheet" href="css/settings.css" />',
    3: '<link rel="stylesheet" href="css/platform-rail.css" />',
    4: '<link rel="stylesheet" href="css/profile-dropdown.css" />',
}
SRCS = {0: 'js/settings.js', 1: 'js/platform-rail.js', 2: 'js/profile-dropdown.js'}

cuts = []
for i, (a, b, _) in enumerate(st):
    cuts.append((a, b, LINK[i]))
for i, (a, b, _) in enumerate(sc):
    cuts.append((a, b, '<script src="%s"></script>' % SRCS[i]))
cuts.sort()

out, at = [], 0
for a, b, rep in cuts:
    out.append(s[at:a]); out.append(rep); at = b
out.append(s[at:])
html = ''.join(out)
# page-frame.css now carries both halves, so the second link is the page's.
html = html.replace('<link rel="stylesheet" href="css/page-frame.css" />\n<link rel="stylesheet" href="css/settings.css" />',
                    '<link rel="stylesheet" href="css/settings.css" />', 1)
(OUT / 'settings.html').write_text(html)

for p in sorted(OUT.rglob('*')):
    if p.is_file():
        print(f'{str(p.relative_to(OUT)):36} {p.stat().st_size:>8,} bytes')
