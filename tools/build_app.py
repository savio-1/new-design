#!/usr/bin/env python3
"""Bundle the Marketplace app into one HTML file.

  marketplace.html            the Marketplace page (edited directly)
  app/automations.src.html    the Automations landing page, verbatim
  app/agents.src.html         the Agents landing page, verbatim
  app/workspace-bridge.js     appended to the two landing pages
  app/shell.html              hosts the three in frames

Writes cogentiq-marketplace-app.html at the repo root, and with --publish
DIR also a copy without the document wrapper, for the artifact service.
"""
import base64, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'


def with_bridge(src: str, bridge: str) -> str:
    tag = '<script>\n' + bridge + '\n</script>\n'
    i = src.rfind('</body>')
    return src[:i] + tag + src[i:] if i >= 0 else src + tag


def b64(s: str) -> str:
    return base64.b64encode(s.encode('utf-8')).decode('ascii')


def main():
    bridge = (APP / 'workspace-bridge.js').read_text(encoding='utf-8')
    pages = {
        'marketplace.html': (ROOT / 'marketplace.html').read_text(encoding='utf-8'),
        'automations.html': with_bridge((APP / 'automations.src.html').read_text(encoding='utf-8'), bridge),
        'agents.html': with_bridge((APP / 'agents.src.html').read_text(encoding='utf-8'), bridge),
    }
    shell = (APP / 'shell.html').read_text(encoding='utf-8')
    blob = json.dumps({k: b64(v) for k, v in pages.items()})
    assert shell.count('/*PAGES*/') == 1
    out = shell.replace('/*PAGES*/', blob)
    (ROOT / 'cogentiq-marketplace-app.html').write_text(out, encoding='utf-8')
    print('wrote', ROOT / 'cogentiq-marketplace-app.html', f'{len(out) / 1e6:.2f} MB')

    if '--publish' in sys.argv:
        dest = Path(sys.argv[sys.argv.index('--publish') + 1])
        dest.parent.mkdir(parents=True, exist_ok=True)
        body = re.sub(r'^\s*<!doctype html>\s*', '', out, flags=re.I)
        for t in ('html', 'head', 'body'):
            body = re.sub(r'</?%s(?:\s[^>]*)?>' % t, '', body)
        dest.write_text(body, encoding='utf-8')
        print('wrote', dest)


if __name__ == '__main__':
    main()
