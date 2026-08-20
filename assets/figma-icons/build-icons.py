"""Build a clean, inline-able icon set from the Figma exports.

Three sources, in descending order of directness:
  CLEAN  - per-layer exports that are already a single tidy glyph.
  DIRTY  - whole-node exports, which carry the surrounding canvas; we keep only
           the coloured elements whose coordinates fall inside the viewBox.
  FRAG   - icons Figma exports as separate vector fragments, reassembled at the
           inset geometry the design context documents.
Colours bind to currentColor so one glyph can serve every state; brand marks
keep their own colours.
"""
import re, json

CTX   = {'#2C2C2C', '#272727', '#121212', '#212121'}
GREYS = ('#BDBDBD', '#8C8C8C')
P     = '%'

CLEAN = ['book14', 'bookrow14', 'ontology', 'warehouse', 'summarylogo', 'thinking']
DIRTY = ['docsearch', 'skill', 'search', 'file', 'web', 'clock', 'ppt', 'edit',
         'chev16', 'chev12', 'chevr12', 'chevup16']
KEEP_COLOR = {'summarylogo', 'thinking', 'logo'}

def nums(s):
    return [float(x) for x in re.findall(r'-?\d+\.?\d*(?:e-?\d+)?', s)]

def viewbox(src):
    return re.search(r'viewBox="([^"]+)"', src).group(1)

def namespace(body, tag):
    """Internal ids repeat across exports; scope them so inlining many icons
    in one document does not cross-wire clip paths and gradients."""
    for i in set(re.findall(r'id="(clip[^"]*|paint[^"]*|filter[^"]*|mask[^"]*)"', body)):
        body = body.replace(f'id="{i}"', f'id="{tag}_{i}"').replace(f'url(#{i})', f'url(#{tag}_{i})')
    return body

def strip_ids(body):
    return re.sub(r'\sid="(Vector[^"]*|Frame|book-icon|Group[^"]*|[A-Za-z ]*\d*)"', '', body)

def bind(body):
    for g in GREYS:
        body = body.replace(g, 'currentColor')
    return body

def inner_svg(src):
    body = re.sub(r'^.*?<svg[^>]*>', '', src, flags=re.S)
    return re.sub(r'</svg>\s*$', '', body).strip()

def place(box, outer, inner):
    """outer = (top,right,bottom,left) as % of the frame; inner = (vert, horiz),
    each ('%', v) or ('px', v) — the stroke bleed Figma adds around a fragment,
    already baked into that fragment's viewBox, so only its origin shifts."""
    t, r, b, l = outer
    x = l / 100 * box
    y = t / 100 * box
    w = box - x - r / 100 * box
    h = box - y - b / 100 * box
    (vu, vv), (hu, hv) = inner
    dy = vv / 100 * h if vu == P else vv
    dx = hv / 100 * w if hu == P else hv
    return round(x - dx, 5), round(y - dy, 5)

def frag(path, outer, inner, box=16):
    """Every path in the fragment, moved as a group. A fragment can hold
    several paths; keeping only the first is how an icon becomes a lone dot."""
    src = open(path).read()
    dx, dy = place(box, outer, inner)
    parts = []
    for m in re.finditer(r'<path\b([^>]*?)/?>', src):
        a = m.group(1)
        d = re.search(r'\sd="([^"]*)"', a)
        if not d:
            continue
        if re.search(r'stroke="', a):
            sw = re.search(r'stroke-width="([^"]*)"', a)
            parts.append(f'<path d="{d.group(1)}" stroke="currentColor" '
                         f'stroke-width="{sw.group(1) if sw else "1.5"}" fill="none" '
                         f'stroke-linecap="round" stroke-linejoin="round"/>')
        else:
            parts.append(f'<path d="{d.group(1)}" fill="currentColor"/>')
    return f'<g transform="translate({dx} {dy})">' + ''.join(parts) + '</g>'

def compose(box, frags):
    return {'vb': f'0 0 {box} {box}', 'body': '\n'.join(frag(*f, box=box) for f in frags)}

def flat(path, name):
    src = open(path).read()
    body = strip_ids(inner_svg(src))
    if name not in KEEP_COLOR:
        body = bind(body)
    return {'vb': viewbox(src), 'body': namespace(body, name)}

out = {}

for name in CLEAN:
    out[name] = flat(f'{name}.svg', name)

for name in DIRTY:
    src = open(f'{name}.svg').read()
    vb = viewbox(src)
    W = float(vb.split()[2])
    kept = []
    for m in re.finditer(r'<(path|circle|rect|line|ellipse)\b([^>]*?)/?>', src):
        tag, attrs = m.groups()
        st = re.search(r'stroke="([^"]*)"', attrs)
        fl = re.search(r'fill="([^"]*)"', attrs)
        d  = re.search(r'\sd="([^"]*)"', attrs)
        coords = nums(d.group(1)) if d else nums(attrs)
        if not coords or not all(-8 <= c <= W + 8 for c in coords):
            continue
        if not ((st and st.group(1) not in CTX) or
                (fl and fl.group(1) not in CTX and fl.group(1) not in ('none', 'white', '#FFFFFF'))):
            continue
        kept.append(bind(f'<{tag}{attrs}/>'))
    out[name] = {'vb': vb, 'body': strip_ids('\n'.join(kept))}

BLEED28 = ((P, -28.13), (P, -28.13))
BLEED15 = ((P, -15), (P, -15))

out['code'] = compose(16, [
    ('frag/code_a.svg', (33.33, 70.83, 33.33, 12.5),  ((P, -14.06), (P, -28.13))),
    ('frag/code_b.svg', (33.33, 12.5,  33.33, 70.83), ((P, -14.06), (P, -28.13))),
    ('frag/code_c.svg', (16.67, 41.67, 16.67, 41.67), ((P, -7.03),  (P, -28.13))),
])
out['expand'] = compose(16, [
    ('frag/exp_a.svg', (16.67, 16.67, 66.67, 66.67), BLEED28),
    ('frag/exp_b.svg', (16.67, 16.67, 58.33, 58.33), BLEED15),
    ('frag/exp_c.svg', (66.67, 66.67, 16.67, 16.67), BLEED28),
    ('frag/exp_b.svg', (58.33, 58.33, 16.67, 16.67), BLEED15),
    ('frag/exp_d.svg', (66.67, 16.67, 16.67, 66.67), BLEED28),
    ('frag/exp_e.svg', (58.33, 16.67, 16.67, 58.33), BLEED15),
    ('frag/exp_f.svg', (16.67, 66.67, 66.67, 16.67), BLEED28),
    ('frag/exp_e.svg', (16.67, 58.33, 58.33, 16.67), BLEED15),
])
out['arrowleft'] = compose(16, [
    ('frag/al.svg', (25, 37.5, 25, 37.5), ((P, -9.38), (P, -18.75))),
])
out['assets'] = compose(20, [
    ('frag/assets.svg', (15, 15, 15, 15), ((P, -5.36), (P, -5.36))),
])
out['search20'] = compose(20, [
    ('frag/s20a.svg', (12.5, 29.17, 29.17, 12.5), ((P, -6.43), (P, -6.43))),
    ('frag/s20b.svg', (62.5, 12.5,  12.5,  62.5), BLEED15),
])
out['plus'] = compose(20, [
    ('frag/pl_a.svg', (20.83, 50, 20.83, 50), ((P, -6.43), ('px', -0.75))),
    ('frag/pl_b.svg', (50, 20.83, 50, 20.83), (('px', -0.75), (P, -6.43))),
])
out['write'] = compose(16, [
    ('frag/wr_a.svg', (20.83, 12.5,  20.83, 12.5),  ((P, -8.04),    (P, -6.25))),
    ('frag/wr_b.svg', (62.5,  50,    37.5,  29.17), (('px', -0.75), (P, -22.5))),
    ('frag/wr_c.svg', (50,    29.17, 50,    58.33), (('px', -0.75), (P, -37.5))),
    ('frag/wr_d.svg', (50,    54.17, 50,    41.67), (('px', -0.75), (P, -112.5))),
    ('frag/wr_e.svg', (62.48, 8.31,  8.33,  62.5),  ((P, -16.06),   (P, -16.06))),
])
out['mic'] = compose(20, [
    ('frag/mc_a.svg', (8.33,  37.5,  45.83, 37.5),  ((P, -8.18),    (P, -15))),
    ('frag/mc_b.svg', (41.67, 20.83, 29.17, 20.83), ((P, -12.86),   (P, -6.43))),
    ('frag/mc_c.svg', (87.5,  33.33, 12.5,  33.33), (('px', -0.75), (P, -11.25))),
    ('frag/mc_d.svg', (70.83, 50,    12.5,  50),    ((P, -22.5),    ('px', -0.75))),
])
out['logo']        = flat('frag/logo.svg', 'logo')
out['messageplus'] = flat('frag/msgp.svg', 'messageplus')

json.dump(out, open('icons.json', 'w'), indent=1)
print(f"{len(out)} icons")
