#!/usr/bin/env python3
"""Render the hero sky in a set of candidate ramps, one file each.

Every stop is a design-system rung, named in the comment beside it, so
what gets picked can be read back as tokens rather than as hex someone
has to trace. The seven slots are the ramp top-to-bottom; the names they
carry in the stylesheet are positions, not hues.
"""
import pathlib, re

SRC = pathlib.Path('/home/user/new-design/cogentiq/index.html').read_text()
OUT = pathlib.Path('variants')

# ── The palette, straight out of the page's own token block ────────────
P = {}
for m in re.finditer(r'--([a-z]+)-(\d{3})\s*:\s*(#[0-9a-fA-F]{6})\s*;', SRC):
    P[f'{m.group(1)}-{m.group(2)}'] = m.group(3)

def ramp(*names):
    return [(n, P[n]) for n in names]

VARIANTS = {
 # ── Cool, no warm end ────────────────────────────────────────────────
 '1-blue-indigo': dict(
   label='Blue → Indigo',
   dark  = ramp('blue-500','blue-600','blue-700','indigo-600','indigo-700','indigo-800','indigo-900'),
   light = ramp('blue-450','blue-500','blue-600','indigo-500','indigo-450','indigo-400','indigo-300'),
   bloom = ('rgba(90, 170, 255, .42)', 'rgba(88, 96, 237, .34)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(135, 142, 252, .24)')),

 '2-blue-indigo-purple': dict(
   label='Blue → Indigo → Purple',
   dark  = ramp('blue-500','blue-600','blue-700','indigo-600','indigo-700','purple-700','purple-800'),
   light = ramp('blue-450','blue-500','blue-600','indigo-500','indigo-450','purple-500','purple-450'),
   bloom = ('rgba(90, 170, 255, .42)', 'rgba(151, 71, 255, .34)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(187, 127, 255, .26)')),

 '3-blue-purple': dict(
   label='Blue → Purple',
   dark  = ramp('blue-500','blue-600','blue-700','purple-600','purple-700','purple-800','purple-900'),
   light = ramp('blue-450','blue-500','blue-600','purple-500','purple-450','purple-400','purple-300'),
   bloom = ('rgba(90, 170, 255, .42)', 'rgba(151, 71, 255, .36)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(187, 127, 255, .26)')),

 '4-blue-indigo-pink-orange': dict(
   label='Blue → Indigo → Pink → Orange',
   dark  = ramp('blue-500','blue-600','blue-700','indigo-600','pink-500','pink-400','orange-500'),
   light = ramp('blue-450','blue-500','blue-600','indigo-450','pink-400','pink-300','orange-400'),
   bloom = ('rgba(90, 170, 255, .42)', 'rgba(233, 30, 99, .32)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(240, 77, 132, .24)')),

 '5-blue-cyan-indigo': dict(
   label='Cyan → Blue → Indigo',
   dark  = ramp('cyan-450','blue-500','blue-600','blue-700','indigo-600','indigo-700','indigo-800'),
   light = ramp('cyan-400','blue-400','blue-500','blue-600','indigo-500','indigo-450','indigo-400'),
   bloom = ('rgba(53, 202, 240, .40)', 'rgba(69, 77, 224, .34)'),
   bloomL= ('rgba(117, 215, 240, .28)', 'rgba(135, 142, 252, .24)')),

 '6-blue-indigo-orange': dict(
   label='Blue → Indigo → Orange',
   dark  = ramp('blue-500','blue-600','blue-700','indigo-600','indigo-700','orange-800','orange-600'),
   light = ramp('blue-450','blue-500','blue-600','indigo-500','indigo-450','orange-500','orange-400'),
   bloom = ('rgba(90, 170, 255, .42)', 'rgba(252, 158, 36, .32)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(255, 196, 112, .26)')),

 '7-indigo-purple': dict(
   label='Indigo → Purple',
   dark  = ramp('indigo-450','indigo-500','indigo-600','indigo-700','purple-600','purple-700','purple-800'),
   light = ramp('indigo-400','indigo-450','indigo-500','purple-500','purple-450','purple-400','purple-300'),
   bloom = ('rgba(135, 142, 252, .42)', 'rgba(151, 71, 255, .34)'),
   bloomL= ('rgba(160, 165, 247, .28)', 'rgba(187, 127, 255, .26)')),

 '8-blue-indigo-purple-deep': dict(
   label='Blue → Indigo → Purple (deep)',
   dark  = ramp('blue-500','blue-600','blue-800','indigo-700','indigo-800','purple-800','purple-900'),
   light = ramp('blue-400','blue-500','blue-600','indigo-500','indigo-600','purple-500','purple-450'),
   bloom = ('rgba(13, 153, 255, .40)', 'rgba(124, 43, 218, .34)'),
   bloomL= ('rgba(120, 190, 255, .28)', 'rgba(151, 71, 255, .24)')),
}

SLOTS = ['cyan','blue','indigo','purple','pink','orange','amber']

def block(stops, blooms, indent='      '):
    out = []
    for slot, (name, hexv) in zip(SLOTS, stops):
        out.append(f'{indent}--sky-{slot}:{" " * (7 - len(slot))}{hexv};   /* {name} */')
    out.append(f'{indent}--sky-bloom:      {blooms[0]};')
    out.append(f'{indent}--sky-bloom-warm: {blooms[1]};')
    return '\n'.join(out)

# The current values, to be swapped out wholesale.
DARK_RE  = re.compile(r'( {6}--sky-cyan:.*?--sky-amber:[^\n]*\n)', re.S)
BLOOM_D  = re.compile(r' {6}--sky-bloom:      rgba\(90, 170, 255, \.42\);\n {6}--sky-bloom-warm: rgba\(255, 60, 160, \.34\);\n')
BLOOM_L  = re.compile(r' {6}--sky-bloom:      rgba\(120, 190, 255, \.28\);\n {6}--sky-bloom-warm: rgba\(255, 90, 175, \.24\);\n')

OUT.mkdir(exist_ok=True)
for key, v in VARIANTS.items():
    s = SRC
    # two --sky-cyan..--sky-amber runs: dark first, then light
    runs = list(DARK_RE.finditer(s))
    assert len(runs) == 2, len(runs)
    s = s[:runs[1].start()] + block(v['light'], v['bloomL']) + '\n' + s[runs[1].end():]
    runs = list(DARK_RE.finditer(s))
    s = s[:runs[0].start()] + block(v['dark'], v['bloom']) + '\n' + s[runs[0].end():]
    # the old bloom declarations that sat below each run
    s = BLOOM_D.sub('', s); s = BLOOM_L.sub('', s)
    s = s.replace('<title>', f'<!-- variant: {v["label"]} -->\n  <title>', 1)
    (OUT / f'{key}.html').write_text(s)
    print(f'{key:28} {v["label"]}')
