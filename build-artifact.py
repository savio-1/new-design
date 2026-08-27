#!/usr/bin/env python3
"""Convert ontology-graph.html into the artifact-ready fragment.

The Artifact host wraps the published file in its own
`<!doctype html>...<head></head><body>` skeleton, so the standalone
document's wrapper tags have to come off. Everything else — <title>, the
Google Fonts <link>, the <style> block and all the markup/script — is kept
verbatim, which keeps ontology-graph.html the single source of truth and
this a pure mechanical strip.

    python3 build-artifact.py   # writes ontology-graph.artifact.html
"""
import pathlib
import re

SRC = pathlib.Path(__file__).parent / "ontology-graph.html"
OUT = pathlib.Path(__file__).parent / "ontology-graph.artifact.html"

html = SRC.read_text()

# drop the document wrapper tags; keep their contents
for pattern in (
    r"<!doctype html>\s*",
    r"</?html[^>]*>\s*",
    r"</?head[^>]*>\s*",
    r"</?body[^>]*>\s*",
    r'<meta[^>]*charset[^>]*>\s*',
    r'<meta[^>]*viewport[^>]*>\s*',
):
    html = re.sub(pattern, "", html, flags=re.IGNORECASE)

html = html.strip() + "\n"

if re.search(r"<(html|head|body)\b", html, re.IGNORECASE):
    raise SystemExit("wrapper tag survived the strip — check the patterns")
if "<title>" not in html[:8192]:
    raise SystemExit("<title> must land in the first 8KB for the host to find it")

OUT.write_text(html)
print(f"wrote {OUT.name} ({len(html):,} bytes)")
