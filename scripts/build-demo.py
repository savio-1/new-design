#!/usr/bin/env python3
"""Build floema-hero-demo.html from floema-hero-demo.src.html.

Replaces @img:<name> (assets/img/floema/<name>.jpg), @video:<name>
(assets/videos/<name>.mp4) and @svg:<name> (assets/logo/<name>.svg) tokens
with base64 data URIs so the published page is fully self-contained.
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "floema-hero-demo.src.html"
OUT = ROOT / "floema-hero-demo.html"
IMG_DIR = ROOT / "assets" / "img" / "floema"
VIDEO_DIR = ROOT / "assets" / "videos"
LOGO_DIR = ROOT / "assets" / "logo"


def data_uri(path: Path, mime: str) -> str:
    if not path.exists():
        sys.exit(f"missing asset: {path}")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    html, imgs = re.subn(
        r"@img:([\w-]+)",
        lambda m: data_uri(IMG_DIR / f"{m.group(1)}.jpg", "image/jpeg"), html)
    html, videos = re.subn(
        r"@video:([\w-]+)",
        lambda m: data_uri(VIDEO_DIR / f"{m.group(1)}.mp4", "video/mp4"), html)
    html, svgs = re.subn(
        r"@svg:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.svg", "image/svg+xml"), html)

    OUT.write_text(html, encoding="utf-8")
    print(f"built {OUT.name}: {imgs} img, {videos} video, {svgs} svg inlined, "
          f"{OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
