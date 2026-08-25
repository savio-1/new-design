#!/usr/bin/env python3
"""Rasterise Natural Earth 110m land polygons into a run-length-encoded
land/water bitmask for the hero globe.

Source: nvkelso/natural-earth-vector ne_110m_land.geojson (Natural Earth,
public domain / CC0). Run once; the encoded mask is committed so the build
needs no network.

Output format (assets/data/land-mask.txt):
    <width>,<height>,<base36 run lengths joined by '.'>
Runs alternate water,land,water,… starting with water, read row-major from
the top-left cell (lon -180, lat +90).
"""

import json
import sys
from pathlib import Path

W, H = 540, 270          # 2/3 degree cells — finer than the dot grid needs
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "land.json")
OUT = Path(__file__).resolve().parent.parent / "assets" / "data" / "land-mask.txt"


def rings(geo):
    """Every linear ring in the feature collection, as [(lon, lat), …]."""
    for feat in geo["features"]:
        g = feat["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            for ring in poly:
                yield ring


def main():
    geo = json.loads(SRC.read_text())

    # edges bucketed by the rows they span, so each row only tests its own
    edges = [[] for _ in range(H)]
    total = 0
    for ring in rings(geo):
        for k in range(len(ring) - 1):
            x1, y1 = ring[k][0], ring[k][1]
            x2, y2 = ring[k + 1][0], ring[k + 1][1]
            if y1 == y2:
                continue                      # horizontal edges never cross a scanline
            total += 1
            # rows whose centre latitude falls inside this edge's span
            lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
            j0 = max(0, int((90 - hi) / 180 * H - 1))
            j1 = min(H - 1, int((90 - lo) / 180 * H + 1))
            for j in range(j0, j1 + 1):
                edges[j].append((x1, y1, x2, y2))

    bits = bytearray(W * H)
    for j in range(H):
        y = 90 - (j + 0.5) * 180 / H
        xs = []
        for x1, y1, x2, y2 in edges[j]:
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
        if not xs:
            continue
        xs.sort()
        # even-odd fill: inside between each pair, which handles holes
        for a, b in zip(xs[0::2], xs[1::2]):
            i0 = max(0, int((a + 180) / 360 * W + 0.5))
            i1 = min(W - 1, int((b + 180) / 360 * W - 0.5))
            for i in range(i0, i1 + 1):
                bits[j * W + i] = 1

    # run-length encode; continents are contiguous so this compresses hard
    runs, cur, n = [], 0, 0
    for b in bits:
        if b == cur:
            n += 1
        else:
            runs.append(n)
            cur, n = b, 1
    runs.append(n)

    def b36(v):
        if v == 0:
            return "0"
        d, s = "0123456789abcdefghijklmnopqrstuvwxyz", ""
        while v:
            s = d[v % 36] + s
            v //= 36
        return s

    payload = f"{W},{H},{'.'.join(b36(r) for r in runs)}"
    OUT.write_text(payload)
    land = sum(bits)
    print(f"edges {total} · grid {W}x{H} · land cells {land} "
          f"({land / (W * H) * 100:.1f}%) · runs {len(runs)} · {len(payload) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
