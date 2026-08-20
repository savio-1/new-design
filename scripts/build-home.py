#!/usr/bin/env python3
"""Build almaconnect-home.html from almaconnect-home.src.html.

Replaces @video:<name> tokens with base64 data URIs of assets/videos/<name>.mp4
and @svg:<name> tokens with data URIs of assets/logo/<name>.svg so the published
page is fully self-contained (the artifact host blocks external asset requests).
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "almaconnect-home.src.html"
OUT = ROOT / "almaconnect-home.html"
VIDEO_DIR = ROOT / "assets" / "videos"
LOGO_DIR = ROOT / "assets" / "logo"
IMG_DIR = ROOT / "assets" / "img"


def data_uri(path: Path, mime: str) -> str:
    if not path.exists():
        sys.exit(f"missing asset: {path}")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    html, videos = re.subn(
        r"@video:([\w-]+)",
        lambda m: data_uri(VIDEO_DIR / f"{m.group(1)}.mp4", "video/mp4"),
        html,
    )
    html, svgs = re.subn(
        r"@svg:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.svg", "image/svg+xml"),
        html,
    )
    html, imgs = re.subn(
        r"@img:([\w-]+)",
        lambda m: data_uri(IMG_DIR / f"{m.group(1)}.jpg", "image/jpeg"),
        html,
    )

    OUT.write_text(html, encoding="utf-8")
    print(f"built {OUT.name}: {videos} video(s), {svgs} svg(s), {imgs} img(s) inlined, "
          f"{OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
