"""Bundle Collage Studio into one HTML file you can copy to any computer and double-click.

    python3 studio/tools/build_single_file.py            # writes studio/dist/collage-studio.html

Everything local (scripts, styles, bundled photos) is inlined. Fonts, the canvas
library and the background-removal model still load from the internet the first
time they're needed.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
OUT = os.path.join(SRC, 'dist', 'collage-studio.html')

src = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
head = src[src.index('<head>') + 6:src.index('</head>')]
body = src[src.index('<body>') + 6:src.index('</body>')]
local = re.findall(r'<script src="((?!https)[^"]+)"></script>', body)
body = re.sub(r'\s*<script src="(?!https)[^"]+"></script>', '', body)
head = re.sub(r'\s*<link rel="stylesheet" href="studio.css" />', '', head)
css = open(os.path.join(SRC, 'studio.css'), encoding='utf-8').read()
js = ''.join('<script>\n' + open(os.path.join(SRC, f), encoding='utf-8').read() + '\n</script>\n' for f in local)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(f'<!DOCTYPE html>\n<html lang="en">\n<head>{head}<style>\n{css}\n</style>\n</head>\n<body>{body.rstrip()}\n{js}</body>\n</html>\n')
print('wrote', os.path.relpath(OUT), f'({os.path.getsize(OUT) // 1024} KB) with', ', '.join(local))
