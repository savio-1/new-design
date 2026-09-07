"""Build dist/illustration-system.html — the revised vocabulary board.
Portraits are inlined as base64 because the artifact host blocks asset requests."""
import base64, io
from pathlib import Path
from PIL import Image

ROOT = Path('/home/user/new-design')
IMG = ROOT / 'assets/img/floema'
OUT = ROOT / 'dist/illustration-system.html'

def tile(name, h=520, q=80):
    """upper-body portrait tile, JPEG, base64"""
    im = Image.open(IMG / f'{name}.jpg').convert('RGB')
    w, hh = im.size
    im = im.resize((int(w * h / hh), h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

def face(name, size=112):
    """square face crop from the upper-centre of a portrait"""
    im = Image.open(IMG / f'{name}.jpg').convert('RGB')
    w, h = im.size
    side = min(w, int(h * 0.62)); left = (w - side) // 2; top = int(h * 0.05)
    im = im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=82, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

MARK = 'data:image/svg+xml;base64,' + base64.b64encode((ROOT / 'assets/logo/almac-green.svg').read_bytes()).decode()

T = {  # tiles
    'p7': tile('p7'), 'p11': tile('p11'), 'p6': tile('p6'),
}
F = {  # faces
    k: face(k) for k in ['p7', 'p11', 'p6', 'p9', 'p10', 'p1', 'p2']
}

# ---------------------------------------------------------------- grounds
GROUNDS = [
 # tonal singles
 ('Aqua', 'g-aqua', 'var(--tint-aqua)'),
 ('Lilac', 'g-lilac', 'var(--tint-lilac)'),
 ('Sky', 'g-sky', 'var(--tint-sky)'),
 ('Peach', 'g-peach', 'var(--tint-peach)'),
 ('Mint', 'g-mint', 'var(--tint-mint)'),
 ('Sand', 'g-sand', 'var(--tint-sand)'),
 # rises — white at the top, hue arriving below (r5, r6)
 ('Rise · aqua', 'g-rise-aqua', 'linear-gradient(180deg,#fff 0%,#fff 38%,#e0f7f4 70%,#7fe8de 100%)'),
 ('Rise · peach', 'g-rise-peach', 'linear-gradient(180deg,#fff 0%,#fff 38%,#fce9dc 70%,#f7bf95 100%)'),
 ('Rise · lilac', 'g-rise-lilac', 'linear-gradient(180deg,#fff 0%,#fff 38%,#f5edfd 70%,#cdb1f2 100%)'),
 ('Rise · sky', 'g-rise-sky', 'linear-gradient(180deg,#fff 0%,#fff 38%,#ebf4fd 70%,#9ec9f5 100%)'),
 ('Rise · dawn', 'g-rise-dawn', 'radial-gradient(60% 50% at 8% 100%,rgba(247,191,149,.9),transparent 70%),radial-gradient(60% 50% at 96% 100%,rgba(111,224,211,.8),transparent 70%),linear-gradient(180deg,#fff 0%,#fff 34%,#fce9dc 62%,#e5f6f0 100%)'),
 # vertical blends running into a deep end (r8)
 ('Tide — the house blend', 'g-tide', 'linear-gradient(180deg,#ebf4fd 0%,#e5f6f0 32%,#7fe8de 62%,#00a396 84%,#10261e 100%)'),
 ('Abyss', 'g-abyss', 'linear-gradient(180deg,#dbeafd 0%,#9ec9f5 36%,#3f86d8 70%,#1b3a2e 100%)'),
 ('Ember', 'g-ember', 'linear-gradient(180deg,#fdf4e3 0%,#f7bf95 44%,#cdb1f2 78%,#8b56c4 100%)'),
 ('Meadow', 'g-meadow', 'linear-gradient(180deg,#ebf4fd 0%,#e5f6f0 42%,#7fe8de 100%)'),
 ('Dusk', 'g-dusk', 'linear-gradient(180deg,#f5edfd 0%,#fce9dc 48%,#fdf4e3 100%)'),
 # horizontal spans
 ('Span · cool', 'g-span-cool', 'linear-gradient(90deg,#cdb1f2 0%,#9ec9f5 50%,#7fe8de 100%)'),
 ('Span · warm', 'g-span-warm', 'linear-gradient(90deg,#fdf4e3 0%,#f7bf95 55%,#cdb1f2 100%)'),
 # blooms (r9)
 ('Aurora', 'g-aurora', 'radial-gradient(50% 60% at 18% 30%,rgba(205,177,242,.95),transparent 70%),radial-gradient(55% 60% at 80% 25%,rgba(158,201,245,.9),transparent 70%),radial-gradient(60% 55% at 50% 100%,rgba(127,232,222,.85),transparent 72%),linear-gradient(165deg,#cdb1f2,#9ec9f5 50%,#e0f7f4)'),
 ('Sea glass', 'g-seaglass', 'radial-gradient(55% 60% at 12% 20%,rgba(127,232,222,.9),transparent 70%),radial-gradient(50% 55% at 88% 80%,rgba(158,201,245,.85),transparent 70%),linear-gradient(160deg,#e0f7f4,#ebf4fd 55%,#e5f6f0)'),
 ('Blush', 'g-blush', 'radial-gradient(55% 60% at 15% 85%,rgba(247,191,149,.85),transparent 70%),radial-gradient(50% 60% at 85% 15%,rgba(205,177,242,.85),transparent 70%),linear-gradient(150deg,#f5edfd,#fce9dc 60%,#fdf4e3)'),
 # deep
 ('Deep', 'g-deep', 'linear-gradient(180deg,#1b3a2e 0%,#10261e 60%,#050c0a 100%)'),
]

ground_css = '\n'.join(f'.{c}{{--g:{v}}}' for _, c, v in GROUNDS)
ground_html = '\n'.join(
    f'<div class="sw"><div class="frame {c}"><div class="card mid"></div></div><div class="nm">{n}<code>{c}</code></div></div>'
    for n, c, _ in GROUNDS)

# ---------------------------------------------------------------- page
html = r'''<title>Illustration Vocabulary</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Nunito+Sans:wght@200..1000&display=swap">
<style>
:root{
  --accent:#00c4b5;--accent-dark:#00a396;--accent-lift:#7fe8de;
  --ink:#04302b;--ink-65:rgba(6,48,43,.65);--ink-45:rgba(6,48,43,.45);
  --ground:#f2efea;--surface:#fff;--panel:#edebe4;--hair:rgba(153,159,153,.25);
  --deep:#10261e;--night:#050c0a;
  --tint-aqua:#e0f7f4;--on-aqua:#00806f;--tint-lilac:#f5edfd;--on-lilac:#9b5fd0;
  --tint-sky:#ebf4fd;--on-sky:#2f6fbf;--tint-peach:#fce9dc;--on-peach:#c4703c;
  --tint-mint:#e5f6f0;--on-mint:#2f9e77;--tint-sand:#fdf4e3;--on-sand:#d08a21;
  --ease:cubic-bezier(.22,1,.36,1);
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font-family:"Nunito Sans",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.03em;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:56px 32px 96px}
h1{font-family:Geist,"Helvetica Neue",Arial,sans-serif;font-weight:350;letter-spacing:-.04em;font-size:clamp(34px,3.34vw,48px);line-height:1.08;margin:0 0 12px}
h2{font-family:Geist,"Helvetica Neue",Arial,sans-serif;font-weight:350;letter-spacing:-.03em;font-size:32px;margin:72px 0 8px}
.lede{font-size:18px;line-height:1.55;color:var(--ink-65);max-width:62ch;margin:0}
.rule{font-size:16px;line-height:1.5;color:var(--ink-65);max-width:66ch;margin:0 0 28px}
.rule b{color:var(--ink);font-weight:600}

/* ---- grounds ---- */
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.sw{display:flex;flex-direction:column;gap:10px}
.frame{aspect-ratio:4/3;border-radius:28px;position:relative;overflow:hidden;background:var(--g)}
.frame::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(4,48,43,.05);pointer-events:none}
.nm{font-size:14px}
.nm code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--ink-45);letter-spacing:0;margin-left:6px}
.frame .card{position:absolute;left:14%;right:14%;top:26%;bottom:-8%;background:#fff;border-radius:24px}
.frame .card.mid{top:22%;bottom:22%}
GROUND_CSS

/* ---- glass system, shown live over a blend ---- */
.glass-row{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.gl{aspect-ratio:1;border-radius:28px;position:relative;overflow:hidden;background:linear-gradient(180deg,#dbeafd 0%,#9ec9f5 36%,#3f86d8 70%,#1b3a2e 100%)}
.gl .c{position:absolute;left:14%;right:14%;top:20%;bottom:20%;border-radius:24px;display:grid;place-items:center;font-size:14px;color:var(--ink-65)}
.c--solid{background:#fff}
.c--frost{background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);border:1px solid rgba(255,255,255,.75)}
.c--rim{background:#fff;border:6px solid rgba(255,255,255,.38);background-clip:padding-box}
.c--tile{left:auto;right:auto;top:auto;bottom:auto;width:72px;height:72px;border-radius:18px;background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.8);box-shadow:0 14px 30px rgba(4,48,43,.10);inset:auto;position:absolute}
.gl .cap{position:absolute;left:18px;bottom:14px;font-size:12px;color:#fff;opacity:.9}

/* ---- compositions ---- */
.comps{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.cf{aspect-ratio:4/3;border-radius:28px;position:relative;overflow:hidden;background:var(--g);font-family:"Nunito Sans",sans-serif}
.cf .cap{position:absolute;left:18px;bottom:12px;font-size:12px;color:var(--capc,var(--ink-45));z-index:5}
.cd{position:absolute;background:#fff;border-radius:24px;padding:28px;overflow:hidden}
.cd--frost{background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);border:1px solid rgba(255,255,255,.78)}
.cd--rim{border:6px solid rgba(255,255,255,.38);background-clip:padding-box}
.ttl{font-size:24px;font-weight:600;line-height:1.2;margin:0}
.ttl.sm{font-size:18px}
.meta{font-size:14px;color:var(--ink-65);margin:4px 0 0}
.body{font-size:16px;line-height:1.45;margin:14px 0 0}
.ava{border-radius:50%;object-fit:cover;display:block}
.photo{border-radius:16px;object-fit:cover;display:block;width:100%}
.sk{height:11px;border-radius:99px;background:var(--skc,var(--panel))}
.sk+.sk{margin-top:9px}
.bar{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:2px;background:var(--acc)}
.sec{position:relative;padding-left:16px;margin-top:10px}
.h{font-size:16px;font-weight:600;margin:16px 0 8px;display:flex;align-items:center;gap:8px}
.badge{width:22px;height:22px;border-radius:50%;background:var(--tint);color:var(--on);font-size:12px;display:grid;place-items:center}
.btn{margin-top:18px;height:48px;border-radius:12px;display:grid;place-items:center;font-size:16px;font-weight:600;color:#fff;background:var(--bg)}
.pill{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px 0 6px;border-radius:99px;border:1px solid var(--hair);font-size:14px;background:#fff}
.pill img{width:22px;height:22px;border-radius:50%}
.pill .x{color:var(--ink-45);margin-left:2px}
.tag{position:absolute;left:14px;top:14px;height:30px;padding:0 12px;border-radius:99px;background:rgba(4,48,43,.42);color:#fff;font-size:14px;display:grid;place-items:center}
.row{display:flex;align-items:center;gap:12px;font-size:16px;margin-top:11px}
.row .ava{width:36px;height:36px}
.row .m{margin-left:auto;font-size:14px;color:var(--ink-45)}
.field{display:flex;align-items:center;gap:14px;margin-top:14px;font-size:14px;color:var(--ink-65)}
.ctrl{height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--hair);display:flex;align-items:center;gap:10px;color:var(--ink);font-size:16px}
.tog{margin-left:auto;width:44px;height:26px;border-radius:99px;background:var(--acc);position:relative}
.tog::after{content:"";position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff}
.gbar{height:10px;border-radius:99px;background:var(--tint);position:relative;overflow:hidden;margin-top:9px}
.gbar::after{content:"";position:absolute;right:0;top:0;bottom:0;width:22%;border-radius:99px;background:linear-gradient(90deg,var(--acc),var(--lift))}
.sat{position:absolute;width:68px;height:68px;border-radius:18px;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 14px 30px rgba(4,48,43,.10);display:grid;place-items:center}
.sat img{width:34px;height:34px}
.sat svg{width:30px;height:30px}
.conn{position:absolute;width:6px;background:#fff;border-radius:3px}
.inp{height:56px;border-radius:14px;border:1px solid var(--hair);display:flex;align-items:center;padding:0 16px;font-size:18px;gap:12px}
.inp .pre{width:44px;height:40px;border-radius:10px;background:var(--panel);display:grid;place-items:center;font-size:16px;margin-left:-8px}
.inp .chev{margin-left:auto;color:var(--ink-45)}

table{width:100%;border-collapse:collapse;font-size:16px;line-height:1.5;margin-top:8px}
th,td{text-align:left;padding:12px 14px 12px 0;border-bottom:1px solid var(--hair);vertical-align:top}
th{font-size:14px;font-weight:400;color:var(--ink-45)}
td b{font-weight:600}
</style>

<div class="wrap">
  <h1>Product illustration vocabulary</h1>
  <p class="lede">Three things carry these: the person in the card, the ground behind it, and UI kept to a hint. Grounds and glass treatments below, then six compositions built the way the references are — on our palette, with our people, in Nunito Sans.</p>

  <h2>Grounds</h2>
  <p class="rule">Twenty-two, from the tokens. <b>Tonal singles</b> for most cards. <b>Rises</b> when the card should stand in the colour and bleed off the bottom. <b>Blends</b> run into a deep end — Tide is sky into our own teal. <b>Spans</b> run sideways. <b>Blooms</b> for a layered pair. <b>Deep</b> at most once a page.</p>
  <div class="grid">
GROUND_HTML
  </div>

  <h2>Glass</h2>
  <p class="rule">Four treatments for a card on a ground. <b>Solid</b> is the default. <b>Frost</b> when a second card sits behind the hero, or the card should belong to the ground. <b>Rim</b> is a white card wearing a translucent border that lets the ground through — the reference's availability card. <b>Tile</b> is the floating satellite: a system logo, a glyph.</p>
  <div class="glass-row">
    <div class="gl"><div class="c c--solid">Solid</div><div class="cap">Solid — the default</div></div>
    <div class="gl"><div class="c c--frost">Frost</div><div class="cap">Frost — 72% white, 20px blur, 1px light rim</div></div>
    <div class="gl"><div class="c c--rim">Rim</div><div class="cap">Rim — 6px translucent border, ground shows through</div></div>
    <div class="gl"><div class="c c--tile" style="left:calc(50% - 36px);top:calc(50% - 36px)"><img src="MARK" style="width:34px"></div><div class="cap">Tile — 68px satellite, glass, soft shadow</div></div>
  </div>

  <h2>Compositions</h2>
  <p class="rule">Each is one reference's construction, rebuilt with our people, our product and our grounds. The person is the largest thing in the card; the UI says which feature this is and stops there.</p>
  <div class="comps">

    <!-- A · Composer (r8): rise ground, big avatar, gradient button, card bleeds bottom -->
    <div class="cf g-rise-aqua" style="--tint:var(--tint-aqua);--on:var(--on-aqua);--acc:#00a396;--lift:#7fe8de;--skc:#e0f7f4">
      <div class="cd" style="left:10%;right:10%;top:12%;bottom:-6%">
        <div style="display:flex;align-items:center;gap:18px">
          <img class="ava" src="FACE_p9" style="width:84px;height:84px">
          <div><p class="ttl">Grace Okafor</p><div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px;color:var(--ink-65)">Cc <span class="pill"><img src="MARK">alerts<span class="x">×</span></span></div></div>
        </div>
        <div style="margin-top:22px"><div class="sk" style="width:72%"></div><div class="sk" style="width:88%"></div><div class="sk" style="width:64%"></div></div>
        <p class="body">Named CFO at Meridian Health this morning — verified, and she's yours.</p>
        <div class="btn" style="--bg:linear-gradient(90deg,#00a396,#7fe8de)">Send to gift officer</div>
      </div>
      <div class="cap">A · Composer — the alert as a message · ref r8</div>
    </div>

    <!-- B · Recap (r3): two portraits stacked, headed skeleton lists, tonal lilac -->
    <div class="cf g-lilac" style="--tint:#ede0fb;--on:var(--on-lilac);--acc:#cdb1f2;--skc:#eee8f7">
      <div class="cd" style="left:8%;right:8%;top:10%;bottom:10%;display:grid;grid-template-columns:150px 1fr;gap:26px;padding:22px;align-items:stretch">
        <div style="display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:12px;min-height:0"><img class="photo" src="TILE_p7" style="height:100%;min-height:0"><img class="photo" src="TILE_p11" style="height:100%;min-height:0"></div>
        <div>
          <p class="ttl sm">Mentorship match</p>
          <div class="h">Recap</div>
          <div class="sec"><div class="bar"></div><div class="sk" style="width:92%"></div><div class="sk" style="width:70%"></div><div class="sk" style="width:84%"></div></div>
          <div class="h">Next steps <span class="badge">3</span></div>
          <div class="sec"><div class="bar"></div><div class="sk" style="width:80%"></div><div class="sk" style="width:60%"></div></div>
        </div>
      </div>
      <div class="cap">B · Recap — two people, one outcome · ref r3</div>
    </div>

    <!-- C · Layered pair (r9): frosted media card behind, white detail card in front, aurora -->
    <div class="cf g-aurora" style="--tint:#e6dbfa;--on:var(--on-lilac);--acc:#9ec9f5;--lift:#7fe8de;--capc:var(--ink-65)">
      <div class="cd cd--frost" style="left:6%;top:14%;width:52%;bottom:22%;padding:16px">
        <div style="position:relative;height:100%"><img class="photo" src="TILE_p6" style="height:100%"><div class="tag">Priya</div></div>
      </div>
      <div class="cd" style="left:40%;right:6%;top:30%;bottom:10%">
        <p class="ttl">Alumni spotlight</p>
        <p class="meta">with <span style="color:var(--on-sky)">Grace Okafor</span> and 2 guests</p>
        <div class="h" style="margin-top:20px">Summary</div>
        <div class="sec"><div class="bar"></div><div class="gbar" style="width:96%"></div><div class="gbar" style="width:78%"></div><div class="gbar" style="width:88%"></div></div>
      </div>
      <div class="cap">C · Layered pair — frost behind, white in front · ref r9</div>
    </div>

    <!-- D · Glass split (r4): white card bleeding top, glass card below with a centred person -->
    <div class="cf g-mint" style="--tint:var(--tint-mint);--on:var(--on-mint)">
      <div class="cd" style="left:16%;right:16%;top:-10%;height:52%;padding:26px 28px">
        <div style="display:grid;grid-template-columns:1fr 128px;gap:12px;margin-top:22px">
          <div class="inp"><span class="pre" style="width:auto;padding:0 12px;font-size:14px;color:var(--ink-65)">Class of</span>2012<span style="color:var(--ink-45)">|</span></div>
          <div class="inp">Region <span class="chev">⌄</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:22px;font-size:20px;font-weight:600">Industry <span style="color:var(--on-mint);font-weight:400">Healthcare <span style="font-size:14px">⌄</span></span></div>
      </div>
      <div class="conn" style="left:calc(50% - 3px);top:41%;height:8%"></div>
      <div class="cd cd--frost" style="left:22%;right:22%;top:50%;bottom:-8%;display:grid;place-items:start center;padding-top:24px">
        <div style="text-align:center"><img class="ava" src="FACE_p10" style="width:88px;height:88px;margin:0 auto"><p class="ttl sm" style="margin-top:14px;color:var(--ink-65);font-weight:400;font-size:24px">Mentor</p></div>
      </div>
      <div class="cap">D · Glass split — a filter, and who it finds · ref r4</div>
    </div>

    <!-- E · Rim settings (r7): white card with translucent rim on a deep blend, avatar rows -->
    <div class="cf g-abyss" style="--tint:var(--tint-sky);--on:var(--on-sky);--acc:#3f86d8;--capc:rgba(255,255,255,.85)">
      <div class="cd cd--rim" style="left:12%;right:12%;top:7%;bottom:5%;padding:26px 30px">
        <p class="ttl" style="font-size:28px">Alert routing</p>
        <div class="field" style="margin-top:18px"><div class="ctrl">3 <span style="color:var(--ink-45)">⌃</span></div>Alerts per day</div>
        <div class="field"><div class="ctrl" style="color:var(--ink-65)">Verified only <span style="color:var(--ink-45)">⌄</span></div>Confidence <div class="tog"></div></div>
        <div class="row" style="margin-top:18px"><img class="ava" src="FACE_p7">Daniel Reyes<span class="m">Gift officer · East</span></div>
        <div class="row"><img class="ava" src="FACE_p9">Grace Okafor<span class="m">Gift officer · West</span></div>
        <div class="row"><img class="ava" src="FACE_p11">Tom Becker<span class="m">Major gifts</span></div>
      </div>
      <div class="cap">E · Rim settings — the white card wears the ground · ref r7</div>
    </div>

    <!-- F · Chip email (r6): frosted card with avatar chips, two glass satellites -->
    <div class="cf g-rise-dawn" style="--tint:var(--tint-peach);--on:var(--on-peach)">
      <div class="cd cd--frost" style="left:8%;right:22%;top:32%;bottom:-6%;padding:26px 28px">
        <div style="display:flex;align-items:center;gap:12px;font-size:18px">To: <span class="pill"><img src="FACE_p1">Daniel Reyes<span class="x">×</span></span></div>
        <div style="display:flex;align-items:center;gap:12px;font-size:18px;margin-top:10px">Cc: <span class="pill"><img src="MARK">alerts@almaconnect.com<span class="x">×</span></span></div>
        <div style="height:1px;background:var(--hair);margin:18px 0"></div>
        <p class="body" style="margin:0">Thanks again for your time today.</p>
        <p class="body">Can you set up a call with Grace before the campaign closes?</p>
      </div>
      <div class="sat" style="right:14%;top:18%"><img src="MARK"></div>
      <div class="sat" style="right:4%;top:40%"><svg viewBox="0 0 24 24" fill="none" stroke="#04302b" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/></svg></div>
      <div class="cap">F · Chip email — frost, chips, satellites · ref r6</div>
    </div>

  </div>

  <h2>The rules that make it one system</h2>
  <table>
    <tr><th style="width:26%">Rule</th><th>Why</th></tr>
    <tr><td><b>A person is the largest thing in the card</b></td><td>Avatar 84–96px, or a photo tile that takes a third of the card. The UI names the feature; the person is the reason to look.</td></tr>
    <tr><td><b>One hue per illustration</b></td><td>Ground, tinted controls, accent bar and button gradient all share it. A second hue is the fastest way off-system.</td></tr>
    <tr><td><b>UI is a hint</b></td><td>One title, one line of meta, skeleton lines for anything longer, at most one button. Never a full screen.</td></tr>
    <tr><td><b>Radii: frame 28 · card 24 · photo 16 · controls 12 · pills 9999</b></td><td>One step softer than the site's own so illustrations read as artwork.</td></tr>
    <tr><td><b>Glass has three jobs</b></td><td>Frost for a card behind the hero or one that belongs to the ground; rim for a white card on a deep blend; tile for a satellite. Solid otherwise.</td></tr>
    <tr><td><b>Bleed one edge when the card is standing in the colour</b></td><td>Rises and glass splits crop the card; tonal singles usually don't.</td></tr>
    <tr><td><b>Nunito Sans, ladder sizes, no shadow on the card</b></td><td>24/18/16/14/12. 600 only on titles and buttons. Shadows only on satellites.</td></tr>
  </table>
</div>
'''
html = html.replace('GROUND_CSS', ground_css).replace('GROUND_HTML', ground_html).replace('MARK', MARK)
for k, v in T.items(): html = html.replace(f'TILE_{k}', v)
for k, v in F.items(): html = html.replace(f'FACE_{k}', v)
OUT.write_text(html, encoding='utf-8')
print(f'wrote {OUT.name}: {len(html)/1024:.0f} KB, {len(GROUNDS)} grounds')
