"""A board of lockup variations for the client navigation: each shown
crunched and open, side by side, on the panel's real markup and CSS."""
import base64, io, re, pathlib

SRC  = pathlib.Path('/home/user/new-design/cogentiq/index.html')
MARK = pathlib.Path(__file__).with_name('lattice-mark.svg')
OUT  = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85/scratchpad/nav/nav-variations.html')
s = SRC.read_text()

sc = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<script>(.*?)</script>', s, re.S)]
st = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r'<style>(.*?)</style>', s, re.S)
      if not any(a < m.start() < z for a, z, _ in sc)]
page_css = st[0][2]
rail_css = next(b for _, _, b in st if '/* ── Platform panel (left rail)' in b[:200])
base = page_css[:page_css.index('APP SHELL')]
base = base[:base.rindex('/* ═')]

a0 = s.index('<aside class="rail"'); a1 = s.index('</aside>', a0) + len('</aside>')
aside = s[a0:a1]
used = set(re.findall(r'href="#([\w-]+)"', aside)) | {'ic-logoonly'}
symbols = {m.group(1): m.group(0) for m in re.finditer(r'<symbol id="([\w-]+)"[^>]*>.*?</symbol>', s, re.S)}
sprite = ('<svg class="sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n'
          + '\n'.join(symbols[u] for u in sorted(used)) + '\n</svg>')

# a static specimen: no ids to collide, every category folded as the
# product shows them on Home, nothing to wire
aside = re.sub(r'\s+id="[^"]*"', '', aside)
aside = aside.replace('aria-expanded="true"', 'aria-expanded="false"')
brand_re = re.compile(r'<div class="rail-brand">.*?</div>', re.S)

LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(MARK.read_bytes()).decode()
CQ = '<svg viewBox="0 0 20 17.5" aria-hidden="true"><use href="#ic-logoonly"/></svg>'
NAME, DESC = 'Lattice', 'Agentic AI platform'
logo = f'<span class="rail-logo lk-logo"><img src="{LOGO}" alt="" /></span>'
by = f'<span class="lk-by">Powered by {CQ}<b>cogentiq</b></span>'

def lockup(lines):
    return (f'<div class="rail-brand">{logo}<span class="rail-lbl lk-text">'
            f'<span class="lk-name">{NAME}</span><span class="lk-desc">{DESC}</span>'
            + (by if lines == 3 else '') + '</span></div>')

def rail(v, open_):
    a = aside.replace('<aside class="rail"', f'<aside class="rail{" is-open" if open_ else ""}"', 1)
    a = brand_re.sub(lambda _: lockup(v['lines']), a, count=1)
    if v.get('credit') == 'under':
        a = a.replace('<div class="rail-group">', f'<div class="lk-credit">{by}</div>\n    <div class="rail-group">', 1)
    if v.get('credit') == 'foot':
        a = a.replace('</aside>', f'<div class="lk-foot">{CQ}<span class="rail-lbl">Powered by <b>cogentiq</b></span></div>\n  </aside>')
    return a

V = [
  dict(key='now', title='Current', lines=3,
       spec='40px collapsed · 40px open · credit beside the name',
       why='The baseline. Collapsed, the mark is the heaviest thing in the column — bigger than the 36px buttons under it.'),
  dict(key='a', title='A · Grows when it opens', lines=3,
       spec='28px collapsed · 40px open · credit beside the name',
       why='Collapsed it sits just above the 24px category tiles; open it gets the room for three lines. The mark changes size as the panel opens.'),
  dict(key='b', title='B · Credit in the footer', lines=2, credit='foot', rec=True,
       spec='28px in both states · name and description beside it · credit at the foot',
       why='Nothing changes size. Two lines fill the mark exactly, and "Powered by" goes where credits usually live. Collapsed, the foot keeps a small cogentiq mark.'),
  dict(key='c', title='C · Credit under the header', lines=2, credit='under',
       spec='32px in both states · name and description beside it · credit on its own line',
       why='Keeps the credit near the client\'s name without crowding it. 32px is the size the product\'s own logo was drawn at.'),
  dict(key='d', title='D · Header card', lines=3,
       spec='28px collapsed · 36px open, inside a card · credit beside the name',
       why='Open, the lockup sits in a soft card, so the mark and its three lines read as one unit. Collapsed, the card goes and the mark stays small.'),
]

CSS = '''
/* ── The board ─────────────────────────────────────────────────── */
html, body { height: auto; }
body { overflow: auto; padding: 32px 32px 56px; }
.bd-head { display: flex; align-items: flex-end; gap: 24px; margin: 0 4px 24px; flex-wrap: wrap; }
.bd-head h1 { margin: 0; font: 500 24px/32px var(--font-geist); letter-spacing: -0.96px; color: var(--text-primary); }
.bd-head p { margin: 4px 0 0; max-width: 720px; color: var(--text-teritiary); font: 400 14px/20px var(--font-geist); letter-spacing: -0.3px; }
.bd-mode { margin-left: auto; display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--backgrounds-seg-control-tabs-1); }
.bd-mode button { padding: 4px 12px; border-radius: 8px; color: var(--text-secondary); font: 500 13px/20px var(--font-geist); }
.bd-mode button[aria-pressed="true"] { background: var(--backgrounds-card-bg-2); color: var(--text-primary); }
.bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(392px, 1fr)); gap: 20px; }
.bd-card {
  display: flex; flex-direction: column; gap: 14px; padding: 20px;
  border-radius: 14px; border: 1px solid var(--strokes-type-default);
  background: var(--backgrounds-page-bg-3);
}
.bd-card.is-rec { border-color: var(--strokes-card-selected); }
.bd-title { display: flex; align-items: center; gap: 8px; font: 500 16px/24px var(--font-geist); letter-spacing: -0.5px; color: var(--text-primary); }
.bd-rec { padding: 2px 8px; border-radius: 99px; font: 500 11px/16px var(--font-geist);
  background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); }
.bd-why { margin: -8px 0 0; color: var(--text-secondary); font: 400 13px/19px var(--font-geist); letter-spacing: -0.2px; }
.bd-spec { color: var(--text-teritiary); font: 400 12px/16px var(--font-geist-mono); }
.bd-pair { display: flex; gap: 16px; align-items: flex-start; }
.bd-cap { display: block; margin-bottom: 6px; color: var(--text-teritiary); font: 500 11px/14px var(--font-geist); letter-spacing: .2px; text-transform: uppercase; }

/* the panel, pinned into the card instead of the viewport */
.bd-card .rail {
  position: relative; inset: auto; z-index: auto; height: 540px;
  transition: none; border-radius: 10px;
  box-shadow: inset 0 0 0 1px var(--strokes-line-1);
}
.bd-card .rail.is-open { box-shadow: inset 0 0 0 1px var(--strokes-line-1); }

/* ── Lockup, shared by every variation ─────────────────────────── */
.rail-brand { gap: 10px; }
.lk-logo { background: none; }
.lk-logo img { width: 100%; height: 100%; display: block; object-fit: cover; }
.lk-text { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.lk-text > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lk-name { font: 500 14px/16px var(--font-geist); letter-spacing: -0.42px; color: var(--text-primary); }
.lk-desc { font: 400 11px/13px var(--font-geist); letter-spacing: -0.11px; color: var(--text-secondary); }
.lk-by { display: flex; align-items: center; gap: 3px; margin-top: 1px;
  font: 400 10px/11px var(--font-geist); letter-spacing: -0.1px; color: var(--text-teritiary); }
.lk-by svg, .lk-foot svg { flex: none; width: 9px; height: 8px; }
.lk-by b, .lk-foot b { font-weight: 500; color: var(--text-secondary); letter-spacing: -0.3px; }
.size { --lk: 40px; }
.lk-logo { width: var(--lk); height: var(--lk); border-radius: calc(var(--lk) * .15); }

/* Current */
.v-now .rail { --lk: 40px; }
/* A — 28 collapsed, 40 open */
.v-a .rail { --lk: 28px; }
.v-a .rail.is-open { --lk: 40px; }
/* B — 28 throughout, two lines, the credit at the foot */
.v-b .rail { --lk: 28px; }
.v-b .lk-name { line-height: 15px; }
.v-b .lk-desc { line-height: 13px; }
.lk-foot {
  order: 2; margin-top: auto; padding-top: 14px; position: relative;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  color: var(--text-teritiary); font: 400 11px/14px var(--font-geist); letter-spacing: -0.1px;
}
.lk-foot::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 1px; background: var(--strokes-line-1); }
.lk-foot svg { width: 13px; height: 11.4px; }
.rail.is-open .lk-foot { justify-content: flex-start; }
.lk-foot .rail-lbl { flex: none; font: inherit; letter-spacing: inherit; color: inherit; }
/* C — 32 throughout, two lines, the credit on its own line */
.v-c .rail { --lk: 32px; }
.v-c .lk-name { line-height: 17px; }
.v-c .lk-desc { line-height: 14px; margin-top: 1px; }
.lk-credit { margin: -8px 0 -2px; }
.rail:not(.is-open) .lk-credit { display: none; }
.lk-credit .lk-by { margin: 0; font-size: 10.5px; }
/* D — 28 collapsed; open, 36 inside a card */
.v-d .rail { --lk: 28px; }
.v-d .rail.is-open { --lk: 36px; }
.v-d .rail.is-open .rail-brand {
  padding: 8px 10px 8px 8px; margin: -2px 0; border-radius: 10px;
  background: var(--backgrounds-card-bg-4); box-shadow: inset 0 0 0 1px var(--strokes-line-1);
}
.v-d .rail.is-open .lk-name { font-size: 13.5px; line-height: 15px; }
.v-d .rail.is-open .lk-desc { line-height: 12px; }
.v-d .rail.is-open .lk-by { margin-top: 1px; }
'''

def card(v):
    rec = '<span class="bd-rec">Recommended</span>' if v.get('rec') else ''
    return f'''
  <section class="bd-card v-{v['key']}{' is-rec' if v.get('rec') else ''}">
    <div class="bd-title">{v['title']}{rec}</div>
    <p class="bd-why">{v['why']}</p>
    <div class="bd-pair">
      <div><span class="bd-cap">Collapsed</span>{rail(v, False)}</div>
      <div><span class="bd-cap">Open</span>{rail(v, True)}</div>
    </div>
    <div class="bd-spec">{v['spec']}</div>
  </section>'''

def dedent(t):
    lines = t.strip('\n').rstrip().split('\n')
    pad = min((len(l) - len(l.lstrip()) for l in lines if l.strip()), default=0)
    return '\n'.join(l[pad:] if l.strip() else '' for l in lines)

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Navigation lockup variations</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400&display=swap" rel="stylesheet" />
<style>
{dedent(base)}

{dedent(rail_css)}
{CSS}
</style>
</head>
<body>
{sprite}
<header class="bd-head">
  <div>
    <h1>Client lockup · five ways</h1>
    <p>The same panel each time, collapsed and open. What changes is how big the client's mark is in each
      state, and where "Powered by cogentiq" lives. For scale: the category tiles are 24px, the Home and
      Marketplace buttons 36px.</p>
  </div>
  <div class="bd-mode" role="group" aria-label="Theme">
    <button type="button" data-m="dark" aria-pressed="true">Dark</button>
    <button type="button" data-m="light" aria-pressed="false">Light</button>
  </div>
</header>
<main class="bd-grid">{''.join(card(v) for v in V)}
</main>
<script>
document.querySelectorAll('.bd-mode button').forEach(function (b) {{
  b.addEventListener('click', function () {{
    document.documentElement.dataset.mode = b.dataset.m;
    document.querySelectorAll('.bd-mode button').forEach(function (x) {{ x.setAttribute('aria-pressed', String(x === b)); }});
  }});
}});
</script>
</body>
</html>
'''
OUT.write_text(html)
print(f'{OUT.name}: {len(html):,} bytes')
