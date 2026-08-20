#!/usr/bin/env python3
"""Build almaconnect-home.html from almaconnect-home.src.html.

Replaces @video:<name> tokens with base64 data URIs of the matching
assets/videos/<name>.mp4 so the published page is fully self-contained
(the artifact host blocks external asset requests).
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "almaconnect-home.src.html"
OUT = ROOT / "almaconnect-home.html"
VIDEO_DIR = ROOT / "assets" / "videos"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    def inline(match: re.Match) -> str:
        name = match.group(1)
        path = VIDEO_DIR / f"{name}.mp4"
        if not path.exists():
            sys.exit(f"missing video asset: {path}")
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:video/mp4;base64,{data}"

    built, count = re.subn(r"@video:([\w-]+)", inline, html)
    OUT.write_text(built, encoding="utf-8")
    print(f"built {OUT.name}: {count} video(s) inlined, {OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
