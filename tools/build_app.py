#!/usr/bin/env python3
"""Bundle the Marketplace app into one HTML file.

  marketplace.html            the Marketplace page (edited directly)
  app/automations.src.html    the Automations landing page, verbatim
  app/agents.src.html         the Agents landing page, verbatim
  app/workspace-bridge.js     appended to the two landing pages
  app/publish.js              the ⋯ menu and Publish to Marketplace on both
  app/auto-builder.js         the automation builder, for setup after adding
  app/review.js               the Marketplace review, appended to every page
  app/admin.html              the Admin panel
  app/monitoring.src.html     Monitoring, from the platform, with monitoring-mk.js
  app/profile.src.html        Profile, from the platform, with profile-mk.js
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


NEUTRAL = {'arrow-left', 'assistant', 'edit-title', 'options', 'card-options', 'close', 'zoom',
           'arrow-down', 'write', 'undo', 'redo'}


def builder_svgs() -> dict:
    """The builder's Figma icons, inlined. Ids are prefixed per icon so two
    on one page never share a clip path; the neutral ones take
    currentColor so they follow the theme."""
    out = {}
    for f in sorted((APP / 'assets' / 'builder').glob('*.svg')):
        name = f.stem
        s = f.read_text(encoding='utf-8')
        s = re.sub(r'\s(preserveAspectRatio|overflow|style)="[^"]*"', '', s)
        s = re.sub(r'id="([^"]+)"', lambda m: 'id="agx-%s-%s"' % (name, m.group(1)), s)
        s = re.sub(r'url\(#([^)]+)\)', lambda m: 'url(#agx-%s-%s)' % (name, m.group(1)), s)
        if name in NEUTRAL:
            s = re.sub(r'(stroke|fill)="#[0-9A-Fa-f]{3,8}"', r'\1="currentColor"', s)
        s = re.sub(r'>\s+<', '><', s).strip()
        out[name] = s
    return out


def b64(s: str) -> str:
    return base64.b64encode(s.encode('utf-8')).decode('ascii')


def main():
    bridge = (APP / 'workspace-bridge.js').read_text(encoding='utf-8')
    tb = APP / 'assets' / 'tidbit'
    uri = lambda f: 'data:image/svg+xml;base64,' + base64.b64encode((tb / f).read_bytes()).decode('ascii')
    assert bridge.count('/*TIDBIT_IC*/{}') == 1
    bridge = bridge.replace('/*TIDBIT_IC*/{}', json.dumps(
        {'vector': uri('done-vector.svg'), 'tick': uri('done-tick.svg'), 'close': uri('close.svg')}))
    agx = (APP / 'agents-v2.js').read_text(encoding='utf-8')
    assert agx.count('/*AGX_SVG*/{}') == 1
    agx = agx.replace('/*AGX_SVG*/{}', json.dumps(builder_svgs()))
    review = (APP / 'review.js').read_text(encoding='utf-8')
    pub = (APP / 'publish.js').read_text(encoding='utf-8')
    rd = lambda f: (APP / f).read_text(encoding='utf-8')
    admin = rd('admin.html')
    assert admin.count('/*TOKENS*/') == 1
    admin = admin.replace('/*TOKENS*/', rd('admin-tokens.css'))
    pages = {
        'marketplace.html': with_bridge((ROOT / 'marketplace.html').read_text(encoding='utf-8'), review),
        'automations.html': with_bridge(with_bridge(with_bridge(with_bridge(rd('automations.src.html'), review), bridge), pub), rd('auto-builder.js')),
        'agents.html': with_bridge(with_bridge(with_bridge(with_bridge(rd('agents.src.html'), agx), review), bridge), pub),
        'admin.html': with_bridge(admin, review),
        'monitoring.html': with_bridge(with_bridge(rd('monitoring.src.html'), review), rd('monitoring-mk.js')),
        'profile.html': with_bridge(with_bridge(rd('profile.src.html'), review), rd('profile-mk.js')),
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
