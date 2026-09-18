"""Split the single-file prototype into a dev handoff tree.

The prototype is one HTML file with inline <style>/<script> and every
image as a base64 data URI — fine to publish, hostile to hand over. This
unpacks it into linked CSS/JS and real asset files without touching a
line of the code itself, so the handoff and the published artifact stay
the same product.
"""
import re, os, base64, shutil

ROOT = '/home/user/new-design'
SRC = open(f'{ROOT}/agents.html').read()
OUT = f'{ROOT}/handoff/cogentiq-agents'

if os.path.exists(OUT):
    shutil.rmtree(OUT)
for d in ('css', 'js', 'assets/marks', 'assets/logos', 'assets/img'):
    os.makedirs(f'{OUT}/{d}', exist_ok=True)


def block(tag, n):
    """nth (0-based) <tag>…</tag>: inner text, start offset, end offset."""
    it = list(re.finditer(rf'<{tag}\b[^>]*>', SRC))
    m = it[n]
    end = SRC.index(f'</{tag}>', m.end())
    return SRC[m.end():end], m.start(), end + len(f'</{tag}>')


styles = [block('style', i) for i in range(3)]
scripts = [block('script', i) for i in range(2)]

# ── CSS ──────────────────────────────────────────────────────────────
# The first block holds the tokens and then the shared components; split
# it at the section marker the file already uses.
ds = styles[0][0]
cut = ds.rindex('/*', 0, ds.index('   3 · BASE'))
open(f'{OUT}/css/01-tokens.css', 'w').write(ds[:cut].strip() + '\n')
open(f'{OUT}/css/02-components.css', 'w').write(ds[cut:].strip() + '\n')
open(f'{OUT}/css/03-agents-page.css', 'w').write(styles[1][0].strip() + '\n')
open(f'{OUT}/css/04-agents-wizard.css', 'w').write(styles[2][0].strip() + '\n')

# ── Assets ───────────────────────────────────────────────────────────
saved = {}


def save(folder, name, uri, prefix=''):
    # Relative URLs inside JS resolve against the DOCUMENT, not the script
    # file — so these stay index.html-relative, with no ../ hop.
    ext, b64 = re.match(r'data:image/(\w+);base64,(.+)', uri, re.S).groups()
    rel = f'assets/{folder}/{name}.{ext}'
    open(f'{OUT}/{rel}', 'wb').write(base64.b64decode(b64))
    saved[rel] = os.path.getsize(f'{OUT}/{rel}')
    return prefix + rel


js = scripts[0][0]
HUES = ['blue', 'purple', 'pink', 'cyan', 'indigo', 'orange', 'green']
for group in ('single', 'orch'):
    body = re.search(rf'\n +{group}: \{{(.*?)\n +\}},', js, re.S).group(1)
    for hue in HUES:
        uri = re.search(rf"{hue}: '(data:image/[^']+)'", body).group(1)
        js = js.replace(uri, save('marks', f'{group}-{hue}', uri))

for prov in ('claude', 'gemini', 'azure', 'mistral'):
    uri = re.search(rf'{prov}: "(data:image/[^"]+)"', js).group(1)
    js = js.replace(uri, save('logos', prov, uri))

assert 'base64' not in js, 'base64 still present in app js'

# ── JS ───────────────────────────────────────────────────────────────
# Seed data splits off so a dev can swap it for a real API without
# reading the view code.
DATA_START = "/* ════════════════════════════════════════════════════════════════════\n   THE AGENT MARKS"
DATA_END = '\nconst state = {'
head, rest = js.split(DATA_START, 1)
data, app = rest.split(DATA_END, 1)

open(f'{OUT}/js/01-data.js', 'w').write(
    '/* Seed data and image constants. Swap these for real API responses;\n'
    '   nothing below this file reads anything else. */\n\n'
    + DATA_START + data.rstrip() + '\n')
open(f'{OUT}/js/02-app.js', 'w').write(
    head.strip() + '\n\n' + DATA_END.strip() + app.rstrip() + '\n')
open(f'{OUT}/js/03-theme-shell.js', 'w').write(scripts[1][0].strip() + '\n')

# ── HTML ─────────────────────────────────────────────────────────────
HEAD, SCRIPTS = '@@HEAD@@', '@@SCRIPTS@@'
html = SRC[:styles[0][1]] + HEAD + SRC[styles[2][2]:]
avatar = re.search(r'src="(data:image/[^"]+)"', html).group(1)
html = html.replace(avatar, save('img', 'avatar', avatar))

html = html.replace(SRC[scripts[1][1]:scripts[1][2]], SCRIPTS)
html = html.replace(SRC[scripts[0][1]:scripts[0][2]], '')

HEAD_HTML = """<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Cogentiq · Agents</title>
<meta name="description" content="Every agent, orchestrator and registered remote agent the workspace can use, as cards or a table." />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400&display=swap" rel="stylesheet" />

<link rel="stylesheet" href="css/01-tokens.css" />
<link rel="stylesheet" href="css/02-components.css" />
<link rel="stylesheet" href="css/03-agents-page.css" />
<link rel="stylesheet" href="css/04-agents-wizard.css" />"""

SCRIPT_TAGS = ('<script src="js/01-data.js"></script>\n'
               '<script src="js/02-app.js"></script>\n'
               '<script src="js/03-theme-shell.js"></script>')

body = html.split(HEAD, 1)[1].replace(SCRIPTS, SCRIPT_TAGS).strip()
open(f'{OUT}/index.html', 'w').write(
    f'<!DOCTYPE html>\n<html lang="en">\n<head>\n{HEAD_HTML}\n</head>\n<body>\n{body}\n</body>\n</html>\n')

print(f'{len(saved)} assets extracted')
for k in sorted(saved):
    print(f'  {k:38} {saved[k]:>7,} bytes')
print()
for f in sorted(os.listdir(f'{OUT}/css')):
    print(f'  css/{f:34} {os.path.getsize(f"{OUT}/css/{f}"):>7,} bytes')
for f in sorted(os.listdir(f'{OUT}/js')):
    print(f'  js/{f:35} {os.path.getsize(f"{OUT}/js/{f}"):>7,} bytes')
print(f'  {"index.html":38} {os.path.getsize(f"{OUT}/index.html"):>7,} bytes')
