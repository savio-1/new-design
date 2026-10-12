"""Lift the homescreen's left panel into one standalone file, with the
brand lockup rebuilt for client deployments: the client's logo, and
beside it their name, a description, and "Powered by cogentiq"."""
import io, re, pathlib

SRC = pathlib.Path('/home/user/new-design/cogentiq/index.html')
OUT = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85/scratchpad/nav/client-navigation.html')
s = SRC.read_text()

sc = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<script>(.*?)</script>', s, re.S)]
st = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<style>(.*?)</style>', s, re.S)
      if not any(a < m.start() < z for a, z, _ in sc)]
page_css = st[0][2]
rail_css = next(b for _, _, b in st if '/* ── Platform panel (left rail)' in b[:200])
rail_js  = next(b for _, _, b in sc if 'Platform panel — one component, two widths' in b[:600])

# tokens, light tokens, type ramps and reset: everything above the app shell
base = page_css[:page_css.index('APP SHELL')]
base = base[:base.rindex('/* ═')]

# markup
a0 = s.index('<aside class="rail"'); a1 = s.index('</aside>', a0) + len('</aside>')
aside = s[a0:a1]
u0 = s.rindex('<div', 0, s.index('id="upsell"'))
u1 = s.index('\n</div>', u0) + len('\n</div>')
upsell = s[u0:u1]

# only the sprite symbols this markup uses
sp0 = s.rindex('<svg', 0, s.index('class="sprite"') + 20)
sp1 = s.index('</svg>\n', s.index('<defs', sp0) if '<defs' in s[sp0:sp0+400] else sp0)
sprite_src = s[sp0:s.index('<!-- ', sp0) if False else None]
used = set(re.findall(r'href="#([\w-]+)"', aside + upsell)) | {'ic-logoonly'}
symbols = {m.group(1): m.group(0) for m in
           re.finditer(r'<symbol id="([\w-]+)"[^>]*>.*?</symbol>', s, re.S)}
missing = sorted(u for u in used if u not in symbols)
assert not missing, missing
# gradients/defs a symbol might point at
defs = re.findall(r'<(?:linearGradient|radialGradient|clipPath|mask)\b[^>]*id="([\w-]+)"', s)
sprite = ('<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n'
          + '\n'.join(symbols[u] for u in sorted(used)) + '\n</svg>')
refs = {r for r in re.findall(r'url\(#([\w-]+)\)', sprite) if ('id="%s"' % r) not in sprite}
if refs:
    extra = []
    for r in refs:
        m = re.search(r'<(linearGradient|radialGradient|clipPath|mask|filter|pattern)\b[^>]*id="%s"[^>]*>.*?</\1>' % re.escape(r), s, re.S)
        assert m, r
        extra.append(m.group(0))
    sprite = sprite.replace('aria-hidden="true">\n', 'aria-hidden="true">\n<defs>' + ''.join(extra) + '</defs>\n', 1)

# placeTiqBar positions the Context Studio card; it lives in the model
# hub's script and no other page ships it.
hub = pathlib.Path('/home/user/new-design/cogentiq/model-hub.html').read_text()
p0 = hub.index('function placeTiqBar(')
p1 = hub.index('\n}\n', p0) + 3
place = hub[p0:p1]

# ── the lockup ─────────────────────────────────────────────────────
old_brand = re.search(r'<div class="rail-brand">.*?</div>', aside, re.S).group(0)
import base64
MARK = pathlib.Path(__file__).with_name('lattice-mark.svg')
if not MARK.exists():
    MARK = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85/scratchpad/nav/lattice-mark.svg')
LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(MARK.read_bytes()).decode()
new_brand = f'''<div class="rail-brand">
        <!-- ═══ CLIENT BRANDING · edit the four marked lines ═══════════
             1. logo        – any square image, shown at 40 × 40px
             2. name        – the product name the client knows it by
             3. description – one short line under the name
             4. leave "Powered by cogentiq" as it is                  -->
        <span class="rail-logo rail-logo--client">
          <img src="{LOGO}" alt="Lattice" />                                   <!-- 1 -->
        </span>
        <span class="rail-lbl rail-lockup">
          <span class="rail-lockup__name">Lattice</span>                  <!-- 2 -->
          <span class="rail-lockup__desc">Agentic AI platform</span> <!-- 3 -->
          <span class="rail-lockup__by">Powered by
            <svg viewBox="0 0 20 17.5" aria-hidden="true"><use href="#ic-logoonly"/></svg><b>cogentiq</b></span>
        </span>
      </div>'''
aside = aside.replace(old_brand, new_brand, 1)
# Open on arrival, so the lockup is the first thing seen; it behaves
# as the product's does from there — closes on leave, peeks on hover.
aside = aside.replace('<aside class="rail"', '<aside class="rail is-open"', 1)

LOCKUP_CSS = '''
/* ══════════════════════════════════════════════════════════════════
   Client lockup — the client's mark, and beside it three lines:
   their name, what it is, and who it runs on. The three are set tight
   and sized so the block is the mark's own height, which is what makes
   mark and text read as one row rather than a mark with a caption.
   ══════════════════════════════════════════════════════════════════ */
.rail-brand { gap: 10px; }
/* 40px in both states, so nothing jumps when the panel opens; the
   crunched panel centres it over its 36px column. */
/* Square, not the product's circle: a client's mark arrives in its own
   tile, and a circle would cut the corners off it. The radius matches
   the Lattice tile's own (18 of 120), so the clip never shows. */
.rail-logo--client { width: 40px; height: 40px; border-radius: 6px; background: none; }
.rail-logo--client img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rail-lockup {
  display: flex; flex-direction: column; justify-content: center; gap: 0;
  min-width: 0;
}
.rail-lockup > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rail-lockup__name {
  font: 500 14px/16px var(--font-geist); letter-spacing: -0.42px;
  color: var(--text-primary);
}
.rail-lockup__desc {
  font: 400 11px/13px var(--font-geist); letter-spacing: -0.11px;
  color: var(--text-secondary);
}
.rail-lockup__by {
  display: flex; align-items: center; gap: 3px; margin-top: 1px;
  font: 400 10px/11px var(--font-geist); letter-spacing: -0.1px;
  color: var(--text-teritiary);
}
.rail-lockup__by svg { flex: none; width: 9px; height: 8px; }
.rail-lockup__by b { font-weight: 500; color: var(--text-secondary); letter-spacing: -0.3px; }
'''

DEMO_JS = '''
/* Standalone only: in the product the shell routes these to their pages.
   Here a click simply moves the marker, so the panel can be clicked
   through without going anywhere. */
document.querySelectorAll('.rail-btn').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.rail-btn.is-active').forEach(function (x) {
      x.classList.remove('is-active'); x.removeAttribute('aria-current');
    });
    b.classList.add('is-active'); b.setAttribute('aria-current', 'page');
  });
});
'''

def dedent(t):
    lines = t.strip('\n').rstrip().split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
    return '\n'.join(l[pad:] if l.strip() else '' for l in lines)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Client navigation</title>
<!-- Dark is the default. For light, set data-mode="light" on <html>. -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400&display=swap" rel="stylesheet" />
<style>
{dedent(base)}

{dedent(rail_css)}
{LOCKUP_CSS}
</style>
</head>
<body>
{sprite}

{aside}

{upsell}

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>
<script>
{place}
</script>
<script>
{rail_js.strip()}
</script>
<script>{DEMO_JS}</script>
</body>
</html>
'''
OUT.write_text(html)
print(f'{OUT.name}: {len(html):,} bytes · {len(used)} symbols · refs {sorted(refs)}')
