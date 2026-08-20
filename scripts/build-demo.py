#!/usr/bin/env python3
"""Build floema-hero-demo.html from floema-hero-demo.src.html.

Replaces @img:<name> tokens with base64 data URIs of assets/img/floema/<name>.jpg
so the published page is fully self-contained.
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "floema-hero-demo.src.html"
OUT = ROOT / "floema-hero-demo.html"
IMG_DIR = ROOT / "assets" / "img" / "floema"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    def inline(match: re.Match) -> str:
        path = IMG_DIR / f"{match.group(1)}.jpg"
        if not path.exists():
            sys.exit(f"missing asset: {path}")
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:image/jpeg;base64,{data}"

    built, count = re.subn(r"@img:([\w-]+)", inline, html)
    OUT.write_text(built, encoding="utf-8")
    print(f"built {OUT.name}: {count} image token(s) inlined, "
          f"{OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
