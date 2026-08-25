#!/usr/bin/env python3
"""Build almaconnect-news.html from almaconnect-news.src.html.

Same pipeline as build-home.py: replaces @png:<name> (assets/logo/<name>.png)
and @svg:<name> (assets/logo/<name>.svg) tokens with base64 data URIs, and
inlines almaconnect.css, so the published page is fully self-contained — the
artifact host blocks external asset requests. The Google Fonts stylesheet is
the one external request left, which the host does allow.
"""

import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "almaconnect-news.src.html"
OUT = ROOT / "almaconnect-news.html"
CSS = ROOT / "almaconnect.css"
LOGO_DIR = ROOT / "assets" / "logo"


def data_uri(path: Path, mime: str) -> str:
    if not path.exists():
        sys.exit(f"missing asset: {path}")
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"


def main() -> None:
    html = SRC.read_text(encoding="utf-8")

    # the design system stylesheet becomes an inline <style> block
    if not CSS.exists():
        sys.exit(f"missing stylesheet: {CSS}")
    css = CSS.read_text(encoding="utf-8")
    html, sheets = re.subn(
        r'<link rel="stylesheet" href="almaconnect\.css">',
        lambda _: (
            "<style>\n/* ---- almaconnect.css (design system, inlined) ---- */\n"
            + css
            + "\n</style>"
        ),
        html,
    )
    if sheets != 1:
        sys.exit(f"expected 1 almaconnect.css link, found {sheets}")

    html, pngs = re.subn(
        r"@png:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.png", "image/png"), html)
    html, svgs = re.subn(
        r"@svg:([\w-]+)",
        lambda m: data_uri(LOGO_DIR / f"{m.group(1)}.svg", "image/svg+xml"), html)

    leftover = re.findall(r"@(?:img|png|svg|video):[\w-]+", html)
    if leftover:
        sys.exit(f"unresolved asset tokens: {sorted(set(leftover))}")

    OUT.write_text(html, encoding="utf-8")
    print(f"built {OUT.name}: stylesheet inlined, {pngs} png, {svgs} svg, "
          f"{OUT.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
