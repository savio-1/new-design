#!/usr/bin/env python3
"""Assemble the Monitoring v2 pages into standalone HTML files.

v1 kept each screen as one hand-maintained 250KB file and then needed a
second script to copy the podium between two of them, because the shared
parts had already drifted. Here the shared parts live in src/ once and
every page is assembled from them, so a change to the stylesheet or the
rail reaches every page by rebuilding rather than by re-copying.

The output is still a single self-contained file per page — no server, no
relative asset to lose — because that is what the artifact shell and a
plain double-click both need.

    python3 monitoring-v2/build.py
"""

from pathlib import Path

SRC = Path(__file__).parent / "src"
OUT = Path(__file__).parent


def read(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


# Which rail leaf is the current page, per output file. The rail carries
# only Monitoring's own screens, so this is the whole nav state.
PAGES = {
    "monitoring.html": {
        "body": "monitoring.body.html",
        "title": "Cogentiq Monitoring — Activity",
        "description": (
            "Executions, failures and human checkpoints for the workspace's "
            "automations — the Activity lens of the Monitoring module."
        ),
        "rail": "MON",
        "artifact_title": "Cogentiq Activity Monitor",
    },
}

HEAD = """<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{description}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400&display=swap" rel="stylesheet" />

  <style>
{base}
  </style>
  <style>
{page}
  </style>
  <style>
{pm}
  </style>
"""


def build_rail(current: str) -> str:
    """Fill the rail template's active-state slots for one page."""
    rail = read("rail.html")
    for key in ("MON", "CK", "LB"):
        active = "is-active" if key == current else ""
        current_attr = 'aria-current="page"' if key == current else ""
        rail = rail.replace(f"__RAIL_ACT_{key}__", active)
        rail = rail.replace(f"__RAIL_CUR_{key}__", current_attr)
    return rail


def build(name: str, spec: dict) -> None:
    body = read(spec["body"])
    body = body.replace("__SPRITE__", read("sprite.html"))
    body = body.replace("__SPRITE_EXTRA__", read("sprite-extra.html"))
    body = body.replace("__RAIL__", build_rail(spec["rail"]))
    body = body.replace("__AVATAR__", read("avatar.txt").strip())

    head = HEAD.format(
        title=spec["title"],
        description=spec["description"],
        base=read("cq-base.css"),
        page=read("mv2.css"),
        pm=read("pm.css"),
    )

    doc = (
        "<!doctype html>\n<html lang=\"en\" data-mode=\"dark\">\n<head>\n  "
        + head
        + "</head>\n<body>\n"
        + body
        + "\n<script>\n"
        + read("mv2.js")
        + "\n</script>\n<script>\n"
        + read("shell.js")
        + "\n</script>\n</body>\n</html>\n"
    )

    path = OUT / name
    path.write_text(doc, encoding="utf-8")
    print(f"  {name}  {len(doc) / 1024:.0f}KB")
    build_artifact(name, spec, head, body)


def build_artifact(name: str, spec: dict, head: str, body: str) -> None:
    """The same page, shaped for the Artifact wrapper.

    The wrapper supplies <!doctype>, <html>, <head> and <body>, so the file
    must carry only the page's own <title>, styles, markup and scripts. The
    dark default that build() puts on the <html> tag is set by the page's
    own boot code instead, which is where the stored preference is read
    anyway.
    """
    head = head.replace(
        f"<title>{spec['title']}</title>", f"<title>{spec['artifact_title']}</title>"
    )
    head = head.replace('<meta charset="UTF-8" />\n  ', "")
    head = head.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  ', ""
    )
    frag = (
        head
        + "\n"
        + body
        + "\n<script>\n"
        + read("mv2.js")
        + "\n</script>\n<script>\n"
        + read("shell.js")
        + "\n</script>\n"
    )
    out = OUT / "artifact" / name
    out.parent.mkdir(exist_ok=True)
    out.write_text(frag, encoding="utf-8")
    print(f"  artifact/{name}  {len(frag) / 1024:.0f}KB")


if __name__ == "__main__":
    print("monitoring-v2 →")
    for page_name, page_spec in PAGES.items():
        build(page_name, page_spec)
