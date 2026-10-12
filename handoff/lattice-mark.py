"""The Lattice mark, redrawn as a vector from the client's banner.

Measured off the banner at 7x: a 120-unit tile, a diamond lattice of
7 rows on a half-step grid (11.65 across, 15.25 down) centred in it,
nodes at every crossing — small at the ends, teal on the odd rows,
white on the two inner rows — and one yellow-green node with a halo
at the centre. Lines and nodes are drawn a touch heavier than the
banner's, which is set at ~120px; this is shown at 40.
"""
import pathlib, sys

DX, DY, C = 11.65, 15.25, 60.0
x = lambda i: round(C + DX * (i - 3), 2)
y = lambda j: round(C + DY * (j - 3), 2)
nodes = [(i, j) for j in range(7) for i in range(7) if (i + j) % 2 == 0]

TILE, EDGE = '#06232d', '#0f3c44'
LINE, SPOKE = '#4aa293', '#3d9a6f'
END, TEAL, WHITE, HUB = '#74c6b6', '#64c5b1', '#d3ebe6', '#c8f13b'

lines = []
for i, j in nodes:
    for di in (-1, 1):
        k = i + di
        if 0 <= k <= 6 and j + 1 <= 6:
            spoke = (3, 3) in ((i, j), (k, j + 1))
            lines.append(f'<line x1="{x(i)}" y1="{y(j)}" x2="{x(k)}" y2="{y(j+1)}" '
                         f'stroke="{SPOKE if spoke else LINE}"/>')

dots = []
for i, j in nodes:
    if (i, j) == (3, 3):
        continue
    end = j in (0, 6) or i in (0, 6)
    if end:
        dots.append(f'<circle cx="{x(i)}" cy="{y(j)}" r="1.7" fill="{END}"/>')
    elif j in (2, 4):
        dots.append(f'<circle cx="{x(i)}" cy="{y(j)}" r="2.9" fill="{WHITE}"/>')
    else:
        dots.append(f'<circle cx="{x(i)}" cy="{y(j)}" r="2.7" fill="{TEAL}"/>')

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
       f'<rect x="0.75" y="0.75" width="118.5" height="118.5" rx="18" fill="{TILE}" stroke="{EDGE}" stroke-width="1.2"/>'
       f'<g stroke-width="1.5" stroke-linecap="round">{"".join(lines)}</g>'
       f'{"".join(dots)}'
       f'<circle cx="60" cy="60" r="8.5" fill="{HUB}" fill-opacity=".22"/>'
       f'<circle cx="60" cy="60" r="5" fill="{HUB}"/>'
       f'</svg>')
pathlib.Path(sys.argv[1]).write_text(svg)
print(len(svg), 'bytes,', len(lines), 'lines,', len(nodes), 'nodes')
