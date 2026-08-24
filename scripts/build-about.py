#!/usr/bin/env python3
"""Build about.html from about.src.html.

Same pipeline as build-home.py — @img:/@png:/@video:/@svg: tokens become
base64 data URIs — plus one extra step: the <link> to
assets/css/almaconnect.css is replaced with an inline <style> block, so the
published page is fully self-contained (the artifact host blocks external
asset requests). The src keeps the link so the stylesheet stays the single
implementation of record.
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "about.src.html"
OUT = ROOT / "about.html"
IMG_DIR = ROOT / "assets" / "img" / "floema"
VIDEO_DIR = ROOT / "assets" / "videos"
LOGO_DIR = ROOT / "assets" / "logo"
CSS = ROOT / "assets" / "css" / "almaconnect.css"

CSS_LINK = '<link rel="stylesheet" href="assets/css/almaconnect.css">'


def data_uri(path: Path, mime: str) -> str:
    if not path.exists():
        sys.exit(f"missing asset: {path}")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    if CSS_LINK not in html:
        sys.exit("stylesheet link not found in src — expected: " + CSS_LINK)
    html = html.replace(
        CSS_LINK, "<style>\n" + CSS.read_text(encoding="utf-8") + "\n</style>")

    def img_uri(m: re.Match) -> str:
        # floema first, then the general image folder (e.g. still1)
        p = IMG_DIR / f"{m.group(1)}.jpg"
        if not p.exists():
            p = ROOT / "assets" / "img" / f"{m.group(1)}.jpg"
        return data_uri(p, "image/jpeg")

    html, imgs = re.subn(r"@img:([\w-]+)", img_uri, html)
    html, pngs = re.subn(
        r"@png:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.png", "image/png"), html)
    html, videos = re.subn(
        r"@video:([\w-]+)",
        lambda m: data_uri(VIDEO_DIR / f"{m.group(1)}.mp4", "video/mp4"), html)
    html, svgs = re.subn(
        r"@svg:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.svg", "image/svg+xml"), html)

    OUT.write_text(html, encoding="utf-8")
    print(f"built {OUT.name}: {imgs} img, {pngs} png, {videos} video, "
          f"{svgs} svg inlined, {OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
