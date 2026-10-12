"""A board of ways to set "Powered by cogentiq" as its own element under
the client's logo — with and without a divider, as a chip, as a band —
each shown collapsed and open on the panel's real markup and CSS."""
import base64, re, pathlib

SRC  = pathlib.Path('/home/user/new-design/cogentiq/index.html')
MARK = pathlib.Path(__file__).with_name('lattice-mark.svg')
OUT  = pathlib.Path('/tmp/claude-0/-home-user-new-design/77d479b4-7c7c-5ee6-b028-4c05d7724b85/scratchpad/nav/nav-credit-variations.html')
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

aside = re.sub(r'\s+id="[^"]*"', '', aside)
aside = aside.replace('aria-expanded="true"', 'aria-expanded="false"')
brand_re = re.compile(r'<div class="rail-brand">.*?</div>', re.S)
head_end = re.compile(r'(<button class="rail-collapse".*?</button>)(\s*</div>)', re.S)

LOGO = 'data:image/svg+xml;base64,' + base64.b64encode(MARK.read_bytes()).decode()
CQ = '<svg viewBox="0 0 20 17.5" aria-hidden="true"><use href="#ic-logoonly"/></svg>'
NAME, DESC = 'Lattice', 'Agentic AI platform'
lockup = (f'<div class="rail-brand"><span class="rail-logo lk-logo"><img src="{LOGO}" alt="" /></span>'
          f'<span class="rail-lbl lk-text"><span class="lk-name">{NAME}</span>'
          f'<span class="lk-desc">{DESC}</span></span></div>')
credit = (f'<div class="lk-credit"><span class="lk-by"><span class="lk-pre">Powered by</span>'
          f'{CQ}<b>cogentiq</b></span></div>')

def rail(open_):
    a = aside.replace('<aside class="rail"', f'<aside class="rail{" is-open" if open_ else ""}"', 1)
    a = brand_re.sub(lambda _: lockup, a, count=1)
    a = head_end.sub(lambda m: m.group(1) + '\n      ' + credit + m.group(2), a, count=1)
    return a

V = [
  dict(key='1', title='1 · Plain, open only',
       why='The credit tucked under the logo, no divider. Collapsed, the logo stands alone.',
       spec='no divider · credit shown open only'),
  dict(key='2', title='2 · Plain, mark stays',
       why='The same, but a small cogentiq mark stays under the logo when the panel is collapsed, so the credit is never fully gone.',
       spec='no divider · mark under the logo when collapsed'),
  dict(key='3', title='3 · Divider below',
       why='A hairline closes the whole block — logo, name and credit — and sets it off from the navigation. One unit, then the menu.',
       spec='divider under the credit · mark when collapsed'),
  dict(key='4', title='4 · Divider between',
       why='A hairline between the client\'s lockup and the credit, so "Powered by" reads as a footnote to the header rather than part of it.',
       spec='divider above the credit · mark when collapsed'),
  dict(key='5', title='5 · Chip',
       why='The credit in a small pill under the logo. It reads as a badge, quiet but unmistakably cogentiq\'s. Collapsed, it shrinks to a round chip.',
       spec='pill · round chip when collapsed'),
  dict(key='6', title='6 · Band',
       why='A full-width strip under the logo row, text centred. The most visible of the six, and the most separate from the client\'s name.',
       spec='full-width strip · mark in a strip when collapsed'),
]

CSS = '''
html, body { height: auto; }
body { overflow: auto; padding: 32px 32px 56px; }
.bd-head { display: flex; align-items: flex-end; gap: 24px; margin: 0 4px 24px; flex-wrap: wrap; }
.bd-head h1 { margin: 0; font: 500 24px/32px var(--font-geist); letter-spacing: -0.96px; color: var(--text-primary); }
.bd-head p { margin: 4px 0 0; max-width: 760px; color: var(--text-teritiary); font: 400 14px/20px var(--font-geist); letter-spacing: -0.3px; }
.bd-mode { margin-left: auto; display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--backgrounds-seg-control-tabs-1); }
.bd-mode button { padding: 4px 12px; border-radius: 8px; color: var(--text-secondary); font: 500 13px/20px var(--font-geist); }
.bd-mode button[aria-pressed="true"] { background: var(--backgrounds-card-bg-2); color: var(--text-primary); }
.bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(392px, 1fr)); gap: 20px; }
.bd-card { display: flex; flex-direction: column; gap: 14px; padding: 20px; border-radius: 14px;
  border: 1px solid var(--strokes-type-default); background: var(--backgrounds-page-bg-3); }
.bd-title { font: 500 16px/24px var(--font-geist); letter-spacing: -0.5px; color: var(--text-primary); }
.bd-why { margin: -8px 0 0; min-height: 57px; color: var(--text-secondary); font: 400 13px/19px var(--font-geist); letter-spacing: -0.2px; }
.bd-spec { color: var(--text-teritiary); font: 400 12px/16px var(--font-geist-mono); }
.bd-pair { display: flex; gap: 16px; align-items: flex-start; }
.bd-cap { display: block; margin-bottom: 6px; color: var(--text-teritiary); font: 500 11px/14px var(--font-geist); letter-spacing: .2px; text-transform: uppercase; }
.bd-card .rail { position: relative; inset: auto; z-index: auto; height: 530px; transition: none;
  border-radius: 10px; box-shadow: inset 0 0 0 1px var(--strokes-line-1); }

/* ── The lockup, the same in all six: a mark that is 28px while the panel
   is crunched and 32px open, with two lines beside it. 32 is the height
   of the two lines, so mark and text read as one row. ── */
.rail-brand { gap: 10px; }
.lk-logo { background: none; width: 28px; height: 28px; border-radius: 15%; }
.rail.is-open .lk-logo { width: 32px; height: 32px; }
.lk-logo img { width: 100%; height: 100%; display: block; object-fit: cover; }
.lk-text { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.lk-text > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lk-name { font: 500 14px/16px var(--font-geist); letter-spacing: -0.42px; color: var(--text-primary); }
.lk-desc { font: 400 11px/13px var(--font-geist); letter-spacing: -0.11px; color: var(--text-secondary); }

/* ── The credit. A third row of the head, under the logo, on its own. ── */
.rail-head { flex-wrap: wrap; row-gap: 5px; }
.lk-credit { flex: 0 0 100%; min-width: 0; display: flex; }
.lk-by { display: inline-flex; align-items: center; gap: 4px;
  font: 400 10.5px/12px var(--font-geist); letter-spacing: -0.1px; color: var(--text-teritiary); white-space: nowrap; }
.lk-by svg { flex: none; width: 10px; height: 8.75px; }
.lk-by b { font-weight: 500; color: var(--text-secondary); letter-spacing: -0.3px; }
/* crunched: only the mark can fit, centred under the logo */
.rail:not(.is-open) .lk-credit { justify-content: center; }
.rail:not(.is-open) .lk-pre, .rail:not(.is-open) .lk-by b { display: none; }
.rail:not(.is-open) .lk-by svg { width: 13px; height: 11.4px; }

/* 1 — open only */
.v-1 .rail:not(.is-open) .lk-credit { display: none; }

/* 3 — a hairline closing the block */
.v-3 .rail-head { padding-bottom: 12px; border-bottom: 1px solid var(--strokes-line-1); }

/* 4 — a hairline between lockup and credit */
.v-4 .rail-head { row-gap: 8px; }
.v-4 .lk-credit { padding-top: 8px; border-top: 1px solid var(--strokes-line-1); }

/* 5 — a pill. Fill and edge are the two that read on white as well as
   on the dark rail. */
.v-5 .rail-head { row-gap: 8px; }
.v-5 .lk-by { padding: 3px 9px 3px 7px; border-radius: 99px;
  background: var(--backgrounds-page-bg-2); box-shadow: inset 0 0 0 1px var(--strokes-type-default); }
.v-5 .rail:not(.is-open) .lk-by { width: 24px; height: 24px; padding: 0; justify-content: center; }

/* 6 — a strip the width of the panel's content */
.v-6 .rail-head { row-gap: 8px; }
.v-6 .lk-credit { padding: 6px 8px; border-radius: 8px; justify-content: center;
  background: var(--backgrounds-page-bg-2); box-shadow: inset 0 0 0 1px var(--strokes-type-default); }
.v-6 .rail:not(.is-open) .lk-credit { padding: 6px 0; }
'''

def card(v):
    return f'''
  <section class="bd-card v-{v['key']}">
    <div class="bd-title">{v['title']}</div>
    <p class="bd-why">{v['why']}</p>
    <div class="bd-pair">
      <div><span class="bd-cap">Collapsed</span>{rail(False)}</div>
      <div><span class="bd-cap">Open</span>{rail(True)}</div>
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
<title>Navigation credit variations</title>
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
    <h1>"Powered by cogentiq" · six ways</h1>
    <p>Each is the same panel, collapsed and open, with the credit set on its own under the client's logo.
      The mark and the two lines beside it are identical in all six, so the only thing that changes is how
      the credit is held: with or without a divider, as a chip, as a band, and what it does when the panel is
      collapsed.</p>
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
