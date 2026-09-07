"""Build dist/illustration-system.html — the illustration vocabulary board.
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

T = {k: tile(k) for k in ['p7', 'p11', 'p6', 'p2', 'p4', 'p8']}
A = {k: tile(k, h=760, q=84) for k in ['p6', 'p11']}   # arch portraits, taller crop
F = {k: face(k) for k in ['p7', 'p11', 'p6', 'p9', 'p10', 'p1', 'p2', 'p4', 'p8']}

# ---------------------------------------------------------------- glyphs
def sv(inner, w=24):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{inner}</svg>')

G = {
 'mail':  sv('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>'),
 'db':    sv('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
 'cal':   sv('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
 'bank':  sv('<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M12 3l9 5H3z"/>'),
 'users': sv('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5A3.2 3.2 0 0 1 16 12M18 20c0-2.6-.9-4.3-2.4-5.2"/>'),
 'chart': sv('<path d="M4 19V5M4 19h16"/><path d="M8 15l3.5-4.5L15 14l4-6"/>'),
 'check': sv('<path d="M4 12.5l5 5L20 6.5"/>'),
 'play':  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
 'share': sv('<path d="M4 17c0-5 4-8 10-8V5l6 6-6 6v-4c-5 0-8 1.4-10 4z"/>'),
 'srch':  sv('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
 'spark': sv('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'),
 'pin':   sv('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
 'bell':  sv('<path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z"/><path d="M10 18a2.2 2.2 0 0 0 4 0"/>'),
 'note':  sv('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>'),
 'wave':  ('<svg viewBox="0 0 96 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">'
           + ''.join(f'<path d="M{4+i*7} {12-h} v{h*2}"/>' for i, h in
                     enumerate([3,6,9,5,10,7,4,8,10,6,3,5,8,4]))+'</svg>'),
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
 # rises — white at the top, hue arriving below
 ('Rise · aqua', 'g-rise-aqua', 'linear-gradient(180deg,#fff 0%,#fff 38%,#e0f7f4 70%,#7fe8de 100%)'),
 ('Rise · peach', 'g-rise-peach', 'linear-gradient(180deg,#fff 0%,#fff 38%,#fce9dc 70%,#f7bf95 100%)'),
 ('Rise · lilac', 'g-rise-lilac', 'linear-gradient(180deg,#fff 0%,#fff 38%,#f5edfd 70%,#cdb1f2 100%)'),
 ('Rise · sky', 'g-rise-sky', 'linear-gradient(180deg,#fff 0%,#fff 38%,#ebf4fd 70%,#9ec9f5 100%)'),
 ('Rise · dawn', 'g-rise-dawn', 'radial-gradient(60% 50% at 8% 100%,rgba(247,191,149,.9),transparent 70%),radial-gradient(60% 50% at 96% 100%,rgba(111,224,211,.8),transparent 70%),linear-gradient(180deg,#fff 0%,#fff 34%,#fce9dc 62%,#e5f6f0 100%)'),
 # vertical blends running into a deep end
 ('Tide — the house blend', 'g-tide', 'linear-gradient(180deg,#ebf4fd 0%,#e5f6f0 32%,#7fe8de 62%,#00a396 84%,#10261e 100%)'),
 ('Abyss', 'g-abyss', 'linear-gradient(180deg,#dbeafd 0%,#9ec9f5 36%,#3f86d8 70%,#1b3a2e 100%)'),
 ('Ember', 'g-ember', 'linear-gradient(180deg,#fdf4e3 0%,#f7bf95 44%,#cdb1f2 78%,#8b56c4 100%)'),
 ('Meadow', 'g-meadow', 'linear-gradient(180deg,#ebf4fd 0%,#e5f6f0 42%,#7fe8de 100%)'),
 ('Dusk', 'g-dusk', 'linear-gradient(180deg,#f5edfd 0%,#fce9dc 48%,#fdf4e3 100%)'),
 # horizontal spans
 ('Span · cool', 'g-span-cool', 'linear-gradient(90deg,#cdb1f2 0%,#9ec9f5 50%,#7fe8de 100%)'),
 ('Span · warm', 'g-span-warm', 'linear-gradient(90deg,#fdf4e3 0%,#f7bf95 55%,#cdb1f2 100%)'),
 # blooms
 ('Aurora', 'g-aurora', 'radial-gradient(50% 60% at 18% 30%,rgba(205,177,242,.95),transparent 70%),radial-gradient(55% 60% at 80% 25%,rgba(158,201,245,.9),transparent 70%),radial-gradient(60% 55% at 50% 100%,rgba(127,232,222,.85),transparent 72%),linear-gradient(165deg,#cdb1f2,#9ec9f5 50%,#e0f7f4)'),
 ('Sea glass', 'g-seaglass', 'radial-gradient(55% 60% at 12% 20%,rgba(127,232,222,.9),transparent 70%),radial-gradient(50% 55% at 88% 80%,rgba(158,201,245,.85),transparent 70%),linear-gradient(160deg,#e0f7f4,#ebf4fd 55%,#e5f6f0)'),
 ('Blush', 'g-blush', 'radial-gradient(55% 60% at 15% 85%,rgba(247,191,149,.85),transparent 70%),radial-gradient(50% 60% at 85% 15%,rgba(205,177,242,.85),transparent 70%),linear-gradient(150deg,#f5edfd,#fce9dc 60%,#fdf4e3)'),
 # painterly — several blooms over a blend, the reference's own recipe
 ('Veil', 'g-veil', 'radial-gradient(70% 60% at 18% 88%,rgba(247,191,149,.78),transparent 70%),radial-gradient(60% 55% at 86% 18%,rgba(158,201,245,.9),transparent 70%),radial-gradient(72% 62% at 50% 42%,rgba(205,177,242,.55),transparent 74%),linear-gradient(160deg,#dbeafd,#f5edfd 55%,#fce9dc)'),
 ('Drift', 'g-drift', 'radial-gradient(60% 60% at 86% 14%,rgba(127,232,222,.9),transparent 70%),radial-gradient(66% 62% at 8% 92%,rgba(205,177,242,.82),transparent 72%),linear-gradient(140deg,#ebf4fd,#e0f7f4 45%,#f5edfd)'),
 ('Opal', 'g-opal', 'radial-gradient(50% 50% at 24% 24%,rgba(127,232,222,.55),transparent 70%),radial-gradient(55% 50% at 80% 28%,rgba(205,177,242,.5),transparent 70%),radial-gradient(62% 58% at 54% 96%,rgba(253,244,227,.95),transparent 74%),#f4f7f6'),
 ('Ridge', 'g-ridge', 'radial-gradient(84% 52% at 50% 100%,rgba(247,191,149,.85),transparent 72%),radial-gradient(70% 48% at 12% 96%,rgba(205,177,242,.8),transparent 70%),linear-gradient(180deg,#10261e 0%,#2f6fbf 42%,#9ec9f5 74%,#fce9dc 100%)'),
 ('Halo', 'g-halo', 'radial-gradient(46% 48% at 50% 44%,rgba(255,255,255,.94),transparent 72%),linear-gradient(150deg,#7fe8de,#9ec9f5 46%,#cdb1f2)'),
 ('Cove', 'g-cove', 'radial-gradient(48% 62% at 52% 40%,rgba(253,244,227,.9),transparent 74%),linear-gradient(90deg,#00a396,#7fe8de 28%,#ebf4fd 62%,#fdf4e3)'),
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
  --grain:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");
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
.frame::before{content:"";position:absolute;inset:0;background-image:var(--grain);opacity:.14;mix-blend-mode:overlay;pointer-events:none}
.frame::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(4,48,43,.05);pointer-events:none}
.nm{font-size:14px}
.nm code{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--ink-45);letter-spacing:0;margin-left:6px}
.frame .card{position:absolute;left:14%;right:14%;top:26%;bottom:-8%;background:#fff;border-radius:24px}
.frame .card.mid{top:22%;bottom:22%}
GROUND_CSS

/* ---- glass system, shown live over a blend ---- */
.glass-row{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}
.gl{aspect-ratio:1;border-radius:28px;position:relative;overflow:hidden;background:linear-gradient(180deg,#dbeafd 0%,#9ec9f5 36%,#3f86d8 70%,#1b3a2e 100%)}
.gl::before{content:"";position:absolute;inset:0;background-image:var(--grain);opacity:.14;mix-blend-mode:overlay}
.gl .c{position:absolute;left:14%;right:14%;top:15%;bottom:31%;border-radius:24px;display:grid;place-items:center;font-size:14px;color:var(--ink-65)}
.c--solid{background:#fff}
.c--frost{background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);border:1px solid rgba(255,255,255,.75)}
.c--rim{background:#fff;border:6px solid rgba(255,255,255,.38);background-clip:padding-box}
.c--halo{background:#fff;box-shadow:0 0 0 10px rgba(255,255,255,.30),0 18px 40px rgba(4,48,43,.14)}
.c--tile{left:auto;right:auto;top:auto;bottom:auto;width:72px;height:72px;border-radius:18px;background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.8);box-shadow:0 14px 30px rgba(4,48,43,.10);inset:auto;position:absolute}
.gl .cap{position:absolute;left:16px;right:16px;bottom:12px;font-size:12px;color:#fff;opacity:.9;line-height:1.35}

/* ---- compositions ---- */
.comps{display:grid;grid-template-columns:repeat(2,1fr);gap:24px 24px}
.cf{aspect-ratio:4/3;border-radius:28px;position:relative;overflow:hidden;background:var(--g);font-family:"Nunito Sans",sans-serif}
.cf::before{content:"";position:absolute;inset:0;background-image:var(--grain);opacity:.13;mix-blend-mode:overlay;pointer-events:none;border-radius:inherit}
.cf .cap{position:absolute;left:18px;right:18px;bottom:12px;font-size:12px;color:var(--capc,var(--ink-45));z-index:6;line-height:1.35}
.cd{position:absolute;background:#fff;border-radius:24px;padding:28px;overflow:hidden;z-index:2}
.cd--frost{background:rgba(255,255,255,.74);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);border:1px solid rgba(255,255,255,.78)}
.cd--rim{border:6px solid rgba(255,255,255,.38);background-clip:padding-box}
.cd--halo{box-shadow:0 0 0 10px rgba(255,255,255,.30),0 18px 40px rgba(4,48,43,.12)}
.ttl{font-size:24px;font-weight:600;line-height:1.2;margin:0}
.ttl.sm{font-size:18px}
.meta{font-size:14px;color:var(--ink-65);margin:4px 0 0}
.ava{border-radius:50%;object-fit:cover;display:block}
.photo{border-radius:16px;object-fit:cover;display:block;width:100%}
.sk{height:11px;border-radius:99px;background:var(--skc,var(--panel))}
.sk+.sk{margin-top:9px}
.bar{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:2px;background:var(--acc)}
.sec{position:relative;padding-left:16px;margin-top:10px}
.h{font-size:16px;font-weight:600;margin:16px 0 8px;display:flex;align-items:center;gap:8px}
.badge{width:22px;height:22px;border-radius:50%;background:var(--tint);color:var(--on);font-size:12px;display:grid;place-items:center}
.btn{margin-top:18px;height:48px;border-radius:12px;display:grid;place-items:center;font-size:16px;font-weight:600;color:#fff;background:var(--bg)}
.btn--ink{background:var(--ink);color:#fff;margin-top:16px;height:44px;border-radius:10px;width:64%}
.pill{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px 0 6px;border-radius:99px;border:1px solid var(--hair);font-size:14px;background:#fff}
.pill img{width:22px;height:22px;border-radius:50%}
.pill .x{color:var(--ink-45);margin-left:2px}
.tag{position:absolute;left:14px;top:14px;height:30px;padding:0 12px;border-radius:99px;background:rgba(4,48,43,.42);color:#fff;font-size:14px;display:grid;place-items:center}
.row{display:flex;align-items:center;gap:12px;font-size:16px;margin-top:11px}
.row .ava{width:36px;height:36px}
.row .m{margin-left:auto;font-size:14px;color:var(--ink-45)}
.field{display:flex;align-items:center;gap:14px;margin-top:14px;font-size:14px;color:var(--ink-65)}
.ctrl{height:40px;padding:0 14px;border-radius:12px;border:1px solid var(--hair);display:flex;align-items:center;gap:10px;color:var(--ink);font-size:16px}
.tog{margin-left:auto;width:44px;height:26px;border-radius:99px;background:var(--acc);position:relative;flex:none}
.tog::after{content:"";position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff}
.tog--off{background:var(--panel)}
.tog--off::after{right:auto;left:3px}
.gbar{height:10px;border-radius:99px;background:var(--tint);position:relative;overflow:hidden;margin-top:9px}
.gbar::after{content:"";position:absolute;right:0;top:0;bottom:0;width:22%;border-radius:99px;background:linear-gradient(90deg,var(--acc),var(--lift))}
.sat{position:absolute;width:68px;height:68px;border-radius:18px;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.85);box-shadow:0 14px 30px rgba(4,48,43,.10);display:grid;place-items:center;z-index:3;color:var(--ink)}
.sat img{width:34px;height:34px}
.sat svg{width:30px;height:30px}
.conn{position:absolute;width:6px;background:#fff;border-radius:3px;z-index:3}
.inp{height:56px;border-radius:14px;border:1px solid var(--hair);display:flex;align-items:center;padding:0 16px;font-size:18px;gap:12px}
.inp .pre{width:44px;height:40px;border-radius:10px;background:var(--panel);display:grid;place-items:center;font-size:16px;margin-left:-8px}
.inp .chev{margin-left:auto;color:var(--ink-45)}

/* ---- banner family: open frame, arch portrait, notched word pills ---- */
.cf--open{background:none;overflow:visible;margin-top:52px}
.cf--open::before{display:none}
.cf--wide{aspect-ratio:3/2}
.gnd{position:absolute;inset:0;border-radius:28px;overflow:hidden;background:var(--g);z-index:0}
.gnd::after{content:"";position:absolute;inset:0;background-image:var(--grain);opacity:.16;mix-blend-mode:overlay}
.band{position:absolute;left:0;right:0;top:40%;height:28%;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.band--rules{background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 2px,transparent 2px 15px)}
.band--slats{background:repeating-linear-gradient(180deg,rgba(255,255,255,.42) 0 6px,transparent 6px 19px)}
.arch{position:absolute;overflow:hidden;border-radius:999px 999px 22px 22px;z-index:1;
  box-shadow:inset 0 0 0 3px rgba(255,255,255,.6);
  -webkit-mask-image:linear-gradient(180deg,#000 66%,transparent 99%);
  mask-image:linear-gradient(180deg,#000 66%,transparent 99%)}
.arch img{width:100%;height:100%;object-fit:cover;object-position:50% 8%;display:block}
.np{position:absolute;z-index:4;display:flex;align-items:center;gap:0;left:50%;transform:translateX(-50%)}
.np>*{background:#fff;height:46px;border-radius:99px;display:flex;align-items:center;padding:0 17px;font-size:21px;font-weight:600;white-space:nowrap;color:var(--ink)}
.np .ic{width:46px;padding:0;justify-content:center;background:var(--tint);color:var(--on)}
.np .ic svg{width:23px;height:23px}
.np .n-r{-webkit-mask-image:radial-gradient(5px 11px at right center,transparent 90%,#000 100%);mask-image:radial-gradient(5px 11px at right center,transparent 90%,#000 100%)}
.np .n-lr{-webkit-mask-image:radial-gradient(5px 11px at right center,transparent 90%,#000 100%),radial-gradient(5px 11px at left center,transparent 90%,#000 100%);-webkit-mask-composite:source-in;mask-image:radial-gradient(5px 11px at right center,transparent 90%,#000 100%),radial-gradient(5px 11px at left center,transparent 90%,#000 100%);mask-composite:intersect}
.np .n-l{-webkit-mask-image:radial-gradient(5px 11px at left center,transparent 90%,#000 100%);mask-image:radial-gradient(5px 11px at left center,transparent 90%,#000 100%)}

/* ---- app shell / device ---- */
.shell{position:absolute;border-radius:26px;background:#f3f4f3;overflow:hidden;z-index:2;box-shadow:0 0 0 8px rgba(255,255,255,.34)}
.shell__bar{height:46px;display:flex;align-items:center;gap:8px;padding:0 14px;font-size:15px;font-weight:600}
.shell__bar img{width:21px;height:21px}
.shell__bar .sp{margin-left:auto;color:var(--ink-45);font-size:18px}
.dbtn{background:var(--ink);color:#fff;height:30px;border-radius:9px;display:flex;align-items:center;padding:0 12px;font-size:13px;font-weight:600;gap:6px}
.shell__body{background:#fff;border-radius:18px 18px 0 0;margin:0 7px;padding:14px 14px 0;height:calc(100% - 46px)}
.shead{display:flex;align-items:baseline;gap:10px}
.shead .lnk{margin-left:auto;color:var(--on);font-size:13px;font-weight:600}
.evwrap{display:grid;grid-template-columns:44px 1fr;gap:6px 9px;margin-top:12px}
.gut{font-size:12px;color:var(--ink-65);text-align:right;padding-top:9px}
.gut .day{display:block;width:28px;height:28px;border-radius:50%;background:var(--tint);color:var(--ink);display:grid;place-items:center;margin:4px 0 0 auto;font-size:15px;font-weight:600}
.ev{border-radius:12px;padding:10px 12px;background:#f3f4f3}
.ev--next{background:#fff;border:1px solid var(--acc);padding:0;overflow:hidden}
.ev--next .hd{background:var(--tint);padding:6px 12px;font-size:12px;font-weight:600}
.ev--next .bd{padding:10px 12px}
.evn{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}
.evn .dot{width:8px;height:8px;border-radius:50%;background:var(--acc);flex:none}
.evn .mi{margin-left:auto;color:var(--ink-45);font-weight:400}
.evm{font-size:12px;color:var(--ink-65);margin:3px 0 0}
.ghosts{display:flex;gap:8px;margin-top:9px}
.ghosts span{flex:1;height:28px;border:1px solid var(--hair);border-radius:8px;display:grid;place-items:center;font-size:12px}
.phone{position:absolute;border-radius:40px;background:#fff;overflow:hidden;z-index:2;border:9px solid rgba(255,255,255,.78);background-clip:padding-box;box-shadow:0 0 0 1px rgba(255,255,255,.5),0 24px 60px rgba(4,48,43,.18)}
.phone .nub{width:54px;height:8px;border-radius:99px;background:var(--panel);margin:12px auto 0}
.phone .ph{font-size:20px;font-weight:600;padding:8px 18px 12px}
.phone .pb{background:#f5f6f5;height:100%;padding:14px 16px;overflow:hidden}
.pdate{font-size:12px;font-weight:600;margin:0 0 7px}
.pdate span{color:var(--ink-45);font-weight:400;margin-left:6px}
.prow{background:#fff;border-radius:12px;padding:10px 12px 10px 14px;position:relative;overflow:hidden;margin-bottom:9px}
.prow .lb{position:absolute;left:0;top:0;bottom:0;width:5px}

/* ---- hub ---- */
.hub{position:absolute;inset:0;z-index:2}
.hub .core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:96px;height:96px;border-radius:30px;background:linear-gradient(150deg,var(--acc),var(--lift));display:grid;place-items:center;box-shadow:0 18px 40px rgba(4,48,43,.18)}
.hub .core img{width:52px;height:52px;filter:brightness(0) invert(1)}
.hub svg.spokes{position:absolute;inset:0;width:100%;height:100%}

/* ---- rim screen pair ---- */
.screen{position:absolute;border:13px solid rgba(255,255,255,.92);border-radius:34px;background:#fff;background-clip:padding-box;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;gap:4px;z-index:2;box-shadow:0 0 0 8px rgba(255,255,255,.26)}
.screen .cell{position:relative;overflow:hidden}
.screen .cell img{width:100%;height:100%;object-fit:cover;display:block}
.screen .cell .tag{left:10px;top:10px;height:26px;font-size:13px}
.gpill{position:absolute;z-index:5;height:56px;border-radius:99px;background:linear-gradient(90deg,var(--acc),var(--lift));display:flex;align-items:center;gap:14px;padding:0 24px;color:#fff;box-shadow:0 14px 30px rgba(4,48,43,.18)}
.gpill svg{height:22px}
.gpill .ib{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.28);display:grid;place-items:center}
.gpill .ib svg{width:20px;height:20px}

/* ---- checks, tabs, roster ---- */
.chk{display:flex;align-items:center;gap:11px;font-size:15px;color:var(--ink-65);margin-top:10px}
.chk svg{width:20px;height:20px;color:var(--on);flex:none}
.tabs{display:flex;gap:22px;font-size:16px;border-bottom:1px solid var(--hair);margin-top:14px}
.tabs span{padding-bottom:9px;color:var(--ink-45)}
.tabs span.on{color:var(--ink);font-weight:600;box-shadow:inset 0 -2px 0 var(--acc)}
.rrow{display:flex;align-items:center;gap:14px;margin-top:15px;font-size:18px;font-weight:600}
.rrow .av{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 3px var(--ring,var(--tint))}
.rrow .av img{width:100%;height:100%;object-fit:cover;display:block}
.rpill{margin-left:auto;margin-right:14px;height:32px;border-radius:9px;padding:0 14px;display:grid;place-items:center;font-size:15px;font-weight:400;background:var(--tint);color:var(--on)}
.lgrow{display:flex;align-items:center;gap:14px;margin-top:16px;font-size:20px;font-weight:600}
.lgrow .lt{width:40px;height:40px;border-radius:11px;background:var(--tint);color:var(--on);display:grid;place-items:center;flex:none}
.lgrow .lt svg{width:22px;height:22px}
.dash{position:absolute;inset:0;z-index:1;width:100%;height:100%}
.brandrow{display:flex;align-items:center;gap:16px;font-size:15px;font-weight:600;letter-spacing:.02em}
.brandrow .sep{width:1px;height:30px;background:var(--hair)}
.brandrow img{width:30px;height:30px}
.brandrow .sq{width:32px;height:32px;border-radius:9px;background:var(--tint);color:var(--on);display:grid;place-items:center}
.brandrow .sq svg{width:18px;height:18px}
.scrub{display:flex;align-items:center;gap:8px;margin-top:12px}
.scrub .ring{width:20px;height:20px;border-radius:50%;border:3px solid var(--acc);flex:none}
.scrub i{height:9px;border-radius:99px;background:var(--panel);display:block}
.pbtn{width:62px;height:62px;border-radius:50%;background:linear-gradient(150deg,var(--acc),var(--lift));display:grid;place-items:center;color:#fff;box-shadow:0 14px 30px rgba(4,48,43,.18)}
.pbtn svg{width:26px;height:26px}
.tline{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink-65)}
.tline svg{width:15px;height:15px}
.ttl2{font-size:20px;font-weight:600;margin:2px 0 0}

table{width:100%;border-collapse:collapse;font-size:16px;line-height:1.5;margin-top:8px}
th,td{text-align:left;padding:12px 14px 12px 0;border-bottom:1px solid var(--hair);vertical-align:top}
th{font-size:14px;font-weight:400;color:var(--ink-45)}
td b{font-weight:600}
</style>

<div class="wrap">
  <h1>Product illustration vocabulary</h1>
  <p class="lede">Three things carry these: the person, the ground behind them, and UI kept to a hint. Twenty-eight grounds and five glass treatments below, then nineteen compositions built the way the references are — on our palette, with our people, in Nunito Sans.</p>

  <h2>Grounds</h2>
  <p class="rule">All from the tokens, all carrying a fine grain. <b>Tonal singles</b> for most cards. <b>Rises</b> when the card should stand in the colour and bleed off the bottom. <b>Blends</b> run into a deep end — Tide is sky into our own teal. <b>Spans</b> run sideways. <b>Blooms</b> and <b>painterly</b> grounds layer several soft lights over a blend; those are what the references actually use behind a person.</p>
  <div class="grid">
GROUND_HTML
  </div>

  <h2>Glass</h2>
  <p class="rule">Five treatments for a card on a ground. <b>Solid</b> is the default. <b>Frost</b> when a second card sits behind the hero. <b>Rim</b> is a white card wearing a translucent border that lets the ground through. <b>Halo</b> rings the card in soft white light — the reference's dialog. <b>Tile</b> is the floating satellite.</p>
  <div class="glass-row">
    <div class="gl"><div class="c c--solid">Solid</div><div class="cap">Solid — the default</div></div>
    <div class="gl"><div class="c c--frost">Frost</div><div class="cap">Frost — 72% white, 20px blur, 1px light rim</div></div>
    <div class="gl"><div class="c c--rim">Rim</div><div class="cap">Rim — 6px translucent border, ground shows through</div></div>
    <div class="gl"><div class="c c--halo">Halo</div><div class="cap">Halo — 10px white glow ring, plus a soft drop</div></div>
    <div class="gl"><div class="c c--tile" style="left:calc(50% - 36px);top:calc(50% - 36px)"><img src="MARK" style="width:34px"></div><div class="cap">Tile — 68px satellite, glass, soft shadow</div></div>
  </div>

  <h2>Compositions</h2>
  <p class="rule">Each is one reference's construction, rebuilt with our people, our product and our grounds. Pick one, change the person, the moment and the hue. A–F came first; G onward are built from the second set of references.</p>
  <div class="comps">

    <!-- A · Composer -->
    <div class="cf g-rise-aqua" style="--tint:var(--tint-aqua);--on:var(--on-aqua);--acc:#00a396;--lift:#7fe8de;--skc:#e0f7f4">
      <div class="cd" style="left:10%;right:10%;top:12%;bottom:-6%">
        <div style="display:flex;align-items:center;gap:18px">
          <img class="ava" src="FACE_p9" style="width:84px;height:84px">
          <div><p class="ttl">Grace Okafor</p><div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px;color:var(--ink-65)">Cc <span class="pill"><img src="MARK">alerts<span class="x">&times;</span></span></div></div>
        </div>
        <div style="margin-top:22px"><div class="sk" style="width:72%"></div><div class="sk" style="width:88%"></div><div class="sk" style="width:64%"></div></div>
        <p style="font-size:16px;line-height:1.45;margin:14px 0 0">Named CFO at Meridian Health this morning — verified, and she's yours.</p>
        <div class="btn" style="--bg:linear-gradient(90deg,#00a396,#7fe8de)">Send to gift officer</div>
      </div>
      <div class="cap">A · Composer — the alert as a message · ref r8</div>
    </div>

    <!-- B · Recap -->
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

    <!-- C · Layered pair -->
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

    <!-- D · Glass split -->
    <div class="cf g-mint" style="--tint:var(--tint-mint);--on:var(--on-mint)">
      <div class="cd" style="left:16%;right:16%;top:-10%;height:52%;padding:26px 28px">
        <div style="display:grid;grid-template-columns:1fr 128px;gap:12px;margin-top:22px">
          <div class="inp"><span class="pre" style="width:auto;padding:0 12px;font-size:14px;color:var(--ink-65)">Class of</span>2012<span style="color:var(--ink-45)">|</span></div>
          <div class="inp">Region <span class="chev">&#8964;</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:22px;font-size:20px;font-weight:600">Industry <span style="color:var(--on-mint);font-weight:400">Healthcare <span style="font-size:14px">&#8964;</span></span></div>
      </div>
      <div class="conn" style="left:calc(50% - 3px);top:41%;height:8%"></div>
      <div class="cd cd--frost" style="left:22%;right:22%;top:50%;bottom:-8%;display:grid;place-items:start center;padding-top:24px">
        <div style="text-align:center"><img class="ava" src="FACE_p10" style="width:88px;height:88px;margin:0 auto"><p class="ttl sm" style="margin-top:14px;color:var(--ink-65);font-weight:400;font-size:24px">Mentor</p></div>
      </div>
      <div class="cap">D · Glass split — a filter, and who it finds · ref r4</div>
    </div>

    <!-- E · Rim settings -->
    <div class="cf g-abyss" style="--tint:var(--tint-sky);--on:var(--on-sky);--acc:#3f86d8;--capc:rgba(255,255,255,.85)">
      <div class="cd cd--rim" style="left:12%;right:12%;top:7%;bottom:5%;padding:26px 30px">
        <p class="ttl" style="font-size:28px">Alert routing</p>
        <div class="field" style="margin-top:18px"><div class="ctrl">3 <span style="color:var(--ink-45)">&#8963;</span></div>Alerts per day</div>
        <div class="field"><div class="ctrl" style="color:var(--ink-65)">Verified only <span style="color:var(--ink-45)">&#8964;</span></div>Confidence <div class="tog"></div></div>
        <div class="row" style="margin-top:18px"><img class="ava" src="FACE_p7">Daniel Reyes<span class="m">Gift officer · East</span></div>
        <div class="row"><img class="ava" src="FACE_p9">Grace Okafor<span class="m">Gift officer · West</span></div>
        <div class="row"><img class="ava" src="FACE_p11">Tom Becker<span class="m">Major gifts</span></div>
      </div>
      <div class="cap">E · Rim settings — the white card wears the ground · ref r7</div>
    </div>

    <!-- F · Chip email -->
    <div class="cf g-rise-dawn" style="--tint:var(--tint-peach);--on:var(--on-peach)">
      <div class="cd cd--frost" style="left:8%;right:22%;top:32%;bottom:-6%;padding:26px 28px">
        <div style="display:flex;align-items:center;gap:12px;font-size:18px">To: <span class="pill"><img src="FACE_p1">Daniel Reyes<span class="x">&times;</span></span></div>
        <div style="display:flex;align-items:center;gap:12px;font-size:18px;margin-top:10px">Cc: <span class="pill"><img src="MARK">alerts@almaconnect.com<span class="x">&times;</span></span></div>
        <div style="height:1px;background:var(--hair);margin:18px 0"></div>
        <p style="font-size:16px;line-height:1.45;margin:0">Thanks again for your time today.</p>
        <p style="font-size:16px;line-height:1.45;margin:14px 0 0">Can you set up a call with Grace before the campaign closes?</p>
      </div>
      <div class="sat" style="right:14%;top:18%"><img src="MARK"></div>
      <div class="sat" style="right:4%;top:40%">GLYPH_mail</div>
      <div class="cap">F · Chip email — frost, chips, satellites · ref r6</div>
    </div>

    <!-- G · Banner, warm -->
    <div class="cf cf--open cf--wide g-veil" style="--tint:var(--tint-mint);--on:var(--on-mint)">
      <div class="gnd"><div class="band band--rules"></div></div>
      <div class="arch" style="left:31%;width:38%;top:-22%;height:106%"><img src="ARCH_p6"></div>
      <div class="np" style="top:47%"><span class="ic n-r">GLYPH_pin</span><span class="n-lr">Alum</span><span class="n-l">Located</span></div>
      <div class="cap">G · Banner — a person, a ground, two words</div>
    </div>

    <!-- H · Banner, cool -->
    <div class="cf cf--open cf--wide g-halo" style="--tint:var(--tint-sky);--on:var(--on-sky);--capc:var(--ink-65)">
      <div class="gnd"><div class="band band--slats" style="top:43%;height:24%"></div></div>
      <div class="arch" style="left:31%;width:38%;top:-22%;height:106%"><img src="ARCH_p11"></div>
      <div class="np" style="top:47%"><span class="ic n-r">GLYPH_spark</span><span class="n-lr">Mentor</span><span class="n-l">Matched</span></div>
      <div class="cap">H · Banner — same construction, cool ground, slat band</div>
    </div>

    <!-- I · App shell -->
    <div class="cf g-seaglass" style="--tint:var(--tint-sky);--on:var(--on-sky);--acc:#3f86d8">
      <div class="shell" style="left:7%;right:-11%;top:10%;bottom:-11%">
        <div class="shell__bar"><img src="MARK">AlmaConnect<span class="sp">&#8942;</span><span class="dbtn">+ New list</span></div>
        <div class="shell__body">
          <div class="shead"><p class="ttl" style="font-size:20px">Prospects</p><span class="lnk">+ New segment</span></div>
          <div class="evwrap">
            <div class="gut">Today<span class="day">13</span></div>
            <div class="ev ev--next">
              <div class="hd">Next up</div>
              <div class="bd">
                <div class="evn"><span class="dot"></span>Rohan Mehta<span class="mi">&#8942;</span></div>
                <p class="evm">VP Finance · Meridian Health</p>
                <p class="evm">Verified 2 hours ago</p>
                <div class="ghosts"><span>Open profile</span><span>Assign</span></div>
              </div>
            </div>
            <div class="gut">Tue<span class="day" style="background:var(--panel)">14</span></div>
            <div class="ev"><div class="evn"><span class="dot" style="background:#cdb1f2"></span>Anika Rao<span class="mi">&#8942;</span></div><p class="evm">Board seat · Corven Group</p></div>
          </div>
        </div>
      </div>
      <div class="cap">I · App shell — the product itself, cropped at two edges</div>
    </div>

    <!-- J · Device -->
    <div class="cf g-rise-sky" style="--tint:var(--tint-sky);--on:var(--on-sky);--acc:#3f86d8">
      <div class="phone" style="left:19%;right:19%;top:8%;bottom:-15%">
        <div class="nub"></div>
        <p class="ph">Updates</p>
        <div class="pb">
          <p class="pdate">Wednesday, Oct 13 <span>Today</span></p>
          <div class="prow"><div class="lb" style="background:#3f86d8"></div><p style="margin:0;font-size:16px;font-weight:600">Priya Sharma</p><p style="margin:2px 0 0;font-size:12px;color:var(--ink-65)">Promoted to Partner · Halden &amp; Co</p></div>
          <p class="pdate">Thursday, Oct 14</p>
          <div class="prow"><div class="lb" style="background:#f7bf95"></div><div class="sk" style="width:78%"></div><div class="sk" style="width:60%"></div></div>
          <div class="prow"><div class="lb" style="background:#cdb1f2"></div><div class="sk" style="width:72%"></div><div class="sk" style="width:52%"></div></div>
        </div>
      </div>
      <div class="cap">J · Device — a feed, bleeding off the bottom</div>
    </div>

    <!-- K · Hub -->
    <div class="cf g-drift" style="--tint:var(--tint-aqua);--on:var(--on-aqua);--acc:#00a396;--lift:#7fe8de">
      <div class="hub">
        <svg class="spokes" viewBox="0 0 100 100" preserveAspectRatio="none" stroke="rgba(255,255,255,.85)" stroke-width=".5" fill="none">
          <path d="M50 50 L20 17M50 50 L80 17M50 50 L11 50M50 50 L89 50M50 50 L20 83M50 50 L80 83"/>
        </svg>
        <div class="sat" style="left:9%;top:8%">GLYPH_db</div>
        <div class="sat" style="right:9%;top:8%">GLYPH_bank</div>
        <div class="sat" style="left:2%;top:calc(50% - 34px)">GLYPH_mail</div>
        <div class="sat" style="right:2%;top:calc(50% - 34px)">GLYPH_chart</div>
        <div class="sat" style="left:9%;bottom:8%">GLYPH_cal</div>
        <div class="sat" style="right:9%;bottom:8%">GLYPH_users</div>
        <div class="core"><img src="MARK"></div>
      </div>
      <div class="cap">K · Hub — one system, six places it reaches</div>
    </div>

    <!-- L · Roster -->
    <div class="cf g-meadow" style="--tint:var(--tint-mint);--on:var(--on-mint);--acc:#00a396">
      <div class="cd cd--halo" style="left:9%;right:9%;top:13%;bottom:13%;padding:22px 24px">
        <p class="ttl">Chapter admins</p>
        <div class="tabs"><span class="on">All people</span><span>Groups</span></div>
        <div class="rrow"><span class="av" style="--ring:var(--tint-aqua)"><img src="FACE_p2"></span>Marta Ruiz<span class="rpill" style="background:#e9f3cf;color:#5d7a1f">Admin</span><span class="tog"></span></div>
        <div class="rrow"><span class="av" style="--ring:var(--tint-sky)"><img src="FACE_p11"></span>Owen Hale<span class="rpill" style="background:var(--tint-sky);color:var(--on-sky)">Member</span><span class="tog"></span></div>
        <div class="rrow"><span class="av" style="--ring:var(--tint-sand)"><img src="FACE_p1"></span>Lars Hansen<span class="rpill" style="background:var(--panel);color:var(--ink-45)">Viewer</span><span class="tog tog--off"></span></div>
      </div>
      <div class="cap">L · Roster — faces on tint, one pill each</div>
    </div>

    <!-- M · Offset pair -->
    <div class="cf g-cove" style="--tint:var(--tint-mint);--on:var(--on-mint);--acc:#00a396">
      <div class="cd" style="left:5%;right:30%;top:9%;bottom:30%;padding:22px 24px">
        <div class="brandrow"><span class="sq">GLYPH_bank</span>NORTHFIELD<span class="sep"></span><img src="MARK">AlmaConnect</div>
        <p class="ttl" style="margin-top:18px;font-size:22px">We found Northfield on AlmaConnect</p>
        <p class="meta" style="font-size:15px;margin-top:8px">Request to join your institution's workspace.</p>
        <div class="btn btn--ink">Request to join</div>
      </div>
      <div class="cd cd--frost" style="left:46%;right:4%;top:52%;bottom:8%;padding:18px 20px">
        <div style="display:flex;align-items:center;gap:11px;font-size:17px;font-weight:600"><span class="tog" style="margin:0"></span>Domain control</div>
        <div class="chk">GLYPH_check Domain verified</div>
        <div class="chk">GLYPH_check Request sent to admin</div>
        <div class="chk">GLYPH_check Routed to IT</div>
      </div>
      <div class="cap">M · Offset pair — a white card, a frost card over its corner</div>
    </div>

    <!-- N · Rim screen pair -->
    <div class="cf g-span-cool" style="--acc:#00a396;--lift:#7fe8de;--capc:rgba(255,255,255,.9)">
      <div class="screen" style="left:8%;right:8%;top:14%;bottom:26%">
        <div class="cell"><img src="TILE_p7"><div class="tag">Marcus</div></div>
        <div class="cell"><img src="TILE_p11"><div class="tag">Owen</div></div>
      </div>
      <div class="gpill" style="left:50%;transform:translateX(-50%);bottom:20%"><span class="ib">GLYPH_users</span>GLYPH_wave</div>
      <div class="cap">N · Screen pair — two people in one rim frame</div>
    </div>

    <!-- O · Fan-out -->
    <div class="cf g-halo" style="--tint:var(--tint-aqua);--on:var(--on-aqua);--acc:#00a396;--lift:#7fe8de;--capc:var(--ink-65)">
      <svg class="dash" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.9)" stroke-width=".55" stroke-dasharray="2.4 2.4">
        <path d="M50 44 V56 M50 56 H18 V70 M50 56 V70 M50 56 H82 V70"/>
      </svg>
      <div class="cd" style="left:14%;right:14%;top:8%;height:32%;padding:16px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,1fr);gap:8px">
        <img class="photo" src="TILE_p6" style="height:100%;min-height:0"><img class="photo" src="TILE_p2" style="height:100%;min-height:0"></div>
      <div class="gpill" style="left:50%;transform:translateX(-50%);top:36%;height:46px;padding:0 20px"><span class="ib" style="width:30px;height:30px">GLYPH_share</span>Matched</div>
      <div class="sat" style="left:11%;bottom:12%">GLYPH_db</div>
      <div class="sat" style="left:calc(50% - 34px);bottom:12%"><img src="MARK"></div>
      <div class="sat" style="right:11%;bottom:12%">GLYPH_mail</div>
      <div class="cap">O · Fan-out — one match, three places it lands</div>
    </div>

    <!-- P · Dialog -->
    <div class="cf g-lilac" style="--tint:#ede0fb;--on:var(--on-lilac);--acc:#9b5fd0;--lift:#cdb1f2">
      <div class="cd cd--halo" style="left:9%;right:9%;top:9%;bottom:9%;padding:24px 26px">
        <div style="display:flex;align-items:center;gap:12px"><span class="lt" style="width:40px;height:40px;border-radius:11px;background:var(--tint);color:var(--on);display:grid;place-items:center">GLYPH_share</span><p class="ttl">Share this list</p></div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:18px;font-size:15px;color:var(--ink-65)">Who has access<span class="ctrl" style="height:36px;font-size:15px">Only your team <span style="color:var(--ink-45)">&#8964;</span></span></div>
        <p class="ttl sm" style="margin-top:18px">Sharing rules</p>
        <div class="chk" style="color:var(--ink)">GLYPH_check Include contact details</div>
        <div class="chk" style="color:var(--ink);padding-left:22px">GLYPH_check Hide giving history</div>
        <div class="chk" style="color:var(--ink);padding-left:22px">GLYPH_check Expire the link in 7 days</div>
        <div class="btn" style="--bg:linear-gradient(90deg,#8b56c4,#b98fe6);margin-top:16px">Share list</div>
      </div>
      <div class="cap">P · Dialog — halo card, one gradient button</div>
    </div>

    <!-- Q · Toggle list -->
    <div class="cf g-abyss" style="--tint:var(--tint-sky);--on:var(--on-sky);--acc:#3f86d8;--capc:rgba(255,255,255,.85)">
      <div class="cd cd--halo" style="left:10%;right:10%;top:13%;bottom:15%;padding:22px 24px">
        <p class="ttl">Choose where updates land</p>
        <p class="meta" style="font-size:15px">Every verified alumni match, pushed on.</p>
        <div style="display:flex;margin-top:20px;font-size:14px;color:var(--ink-45)">Destination<span style="margin-left:auto">Push updates</span></div>
        <div class="lgrow"><span class="lt">GLYPH_db</span>Your CRM<span class="tog"></span></div>
        <div class="lgrow"><span class="lt">GLYPH_mail</span>Gift officers<span class="tog"></span></div>
        <div class="lgrow"><span class="lt">GLYPH_chart</span>Weekly report<span class="tog tog--off"></span></div>
      </div>
      <div class="cap">Q · Toggle list — sources on the left, switches on the right</div>
    </div>

    <!-- R · Media recap -->
    <div class="cf g-span-warm" style="--tint:var(--tint-peach);--on:var(--on-peach);--acc:#c4703c;--lift:#f7bf95;--skc:#f3ece6">
      <div class="cd cd--frost" style="left:4%;top:12%;width:50%;bottom:8%;padding:13px">
        <div style="position:relative;height:56%"><img class="photo" src="TILE_p6" style="height:100%"><div class="tag">Andre</div></div>
        <div class="scrub"><span class="ring"></span><i style="width:38%"></i><i style="width:16%"></i><i style="width:22%"></i></div>
        <div style="display:flex;justify-content:flex-start;margin-top:12px"><div class="pbtn">GLYPH_play</div></div>
      </div>
      <div class="cd" style="left:47%;right:4%;top:20%;bottom:14%;padding:20px 22px">
        <p class="ttl">Alumni panel</p>
        <p class="meta">with <span style="color:var(--on-peach)">Andre Diaz</span> and 2 guests</p>
        <div class="h">Summary</div>
        <div class="sec"><div class="bar"></div><div class="sk" style="width:92%"></div><div class="sk" style="width:74%"></div><div class="sk" style="width:86%"></div></div>
        <div class="h">Follow-ups <span class="badge">3</span></div>
      </div>
      <div class="cap">R · Media recap — a clip behind, the summary in front</div>
    </div>

    <!-- S · Agenda + detail -->
    <div class="cf g-blush" style="--tint:#ede0fb;--on:var(--on-lilac);--acc:#9b5fd0;--lift:#cdb1f2;--skc:#efe9f7">
      <div class="cd cd--frost" style="left:5%;right:22%;top:9%;bottom:17%;padding:16px 14px">
        <p style="font-size:12px;letter-spacing:.06em;color:var(--ink-65);margin:0 0 10px">THURS FEB 10</p>
        <div class="ev" style="background:#fff;border:1px solid var(--hair);margin-bottom:9px"><div class="tline">GLYPH_cal 9–10 AM</div><p class="ttl2">Prospect review</p></div>
        <div class="ev" style="background:#fff;border:1px solid var(--hair);margin-bottom:9px"><div class="tline">GLYPH_cal 1–2 PM</div><p class="ttl2">Chapter sync</p></div>
        <div class="ev" style="background:#fff;border:1px solid var(--hair)"><div style="display:flex;align-items:center"><div class="tline">GLYPH_cal 3–4 PM</div><span style="margin-left:auto;height:30px;border-radius:99px;padding:0 12px;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#fff;background:linear-gradient(90deg,#9b5fd0,#cdb1f2)">View recap</span></div><p class="ttl2">Quarterly check-in</p></div>
      </div>
      <div class="cd" style="left:37%;right:4%;top:13%;height:45%;padding:19px 21px">
        <div style="display:flex;align-items:flex-start"><div><p class="ttl">Q2 chapter review</p><p class="meta">with Maria Evans</p></div><span style="margin-left:auto;color:var(--ink-45)">GLYPH_share</span></div>
        <div style="margin-top:18px"><div class="sk" style="width:96%"></div><div class="sk" style="width:88%"></div><div class="sk" style="width:78%"></div><div class="sk" style="width:92%"></div></div>
      </div>
      <div class="cap">S · Agenda + detail — a list behind, one item pulled forward</div>
    </div>

  </div>

  <h2>The rules that make it one system</h2>
  <table>
    <tr><th style="width:26%">Rule</th><th>Why</th></tr>
    <tr><td><b>A person is the largest thing in the card</b></td><td>Avatar 84–96px, a photo tile taking a third of the card, or an arch portrait breaking the frame edge. The UI names the feature; the person is the reason to look.</td></tr>
    <tr><td><b>One hue per illustration</b></td><td>Ground, tinted controls, accent bar and button gradient all share it. A second hue is the fastest way off-system.</td></tr>
    <tr><td><b>UI is a hint</b></td><td>One title, one line of meta, skeleton lines for anything longer, at most one button. The app shell and device are the exception — they crop the real product at two edges rather than shrink it.</td></tr>
    <tr><td><b>Every ground carries grain</b></td><td>A fractal-noise overlay at 13–16%, blended overlay. It is most of the difference between a CSS gradient and artwork.</td></tr>
    <tr><td><b>Radii: frame 28 · card 24 · photo 16 · controls 12 · device 40 · pills 9999</b></td><td>One step softer than the site's own, so illustrations read as artwork.</td></tr>
    <tr><td><b>Glass has four jobs</b></td><td>Frost for a card behind the hero; rim for a white card on a deep blend; halo for a dialog that needs lifting off a busy ground; tile for a satellite. Solid otherwise.</td></tr>
    <tr><td><b>Bleed one edge when the card is standing in the colour</b></td><td>Rises, glass splits, shells and devices crop. Tonal singles usually don't.</td></tr>
    <tr><td><b>Nunito Sans, ladder sizes, no shadow on the flat card</b></td><td>24/18/16/14/12. 600 only on titles and buttons. Shadows belong to satellites, devices and the halo.</td></tr>
  </table>
</div>
'''
html = html.replace('GROUND_CSS', ground_css).replace('GROUND_HTML', ground_html).replace('MARK', MARK)
for k, v in G.items(): html = html.replace(f'GLYPH_{k}', v)
for k, v in A.items(): html = html.replace(f'ARCH_{k}', v)
for k, v in T.items(): html = html.replace(f'TILE_{k}', v)
for k, v in F.items(): html = html.replace(f'FACE_{k}', v)
assert not any(t in html for t in ('GLYPH_','TILE_','FACE_','ARCH_')), 'unresolved token'
OUT.write_text(html, encoding='utf-8')
print(f'wrote {OUT.name}: {len(html)/1024:.0f} KB, {len(GROUNDS)} grounds')
