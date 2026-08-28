# -*- coding: utf-8 -*-
import os, html, math

OUT_REPO = "/home/user/new-design"
SCRATCH = "/tmp/claude-0/-home-user-new-design/0b91a3e8-796f-5f32-a450-0020d16b9da8/scratchpad"

ACCENT = "#00C4B5"
INK = "#04302B"

# --- hexagon container -------------------------------------------------------
# pointy-top regular hexagon, centre (60,60), outer circumradius 54, corner radius 14
# built by stroking a polygon of circumradius 40 with a 28px round-join stroke
R = 40.0
def hexpts(r=R, cx=60.0, cy=60.0):
    pts = []
    for a in (90, 30, 330, 270, 210, 150):
        t = math.radians(a)
        pts.append((cx + r*math.cos(t), cy - r*math.sin(t)))
    return pts
HEXPATH = "M" + " L".join("%.2f %.2f" % p for p in hexpts()) + " Z"

def hexagon(fill="var(--hx, %s)" % ACCENT):
    return ('<path d="%s" fill="%s" stroke="%s" stroke-width="28" '
            'stroke-linejoin="round"/>' % (HEXPATH, fill, fill))

IC = "var(--ic, #FFFFFF)"
HX = "var(--hx, %s)" % ACCENT   # casing colour = hexagon fill

def g(body, sw=5.5):
    return ('<g fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" '
            'stroke-linejoin="round">%s</g>' % (IC, sw, body))

def dot(x, y, r):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (x, y, r, IC)

# --- the eleven marks --------------------------------------------------------
def m_agraph():
    return (g('<path d="M43 82 L60 36 L77 82"/><path d="M50.5 62 H69.5"/>')
            + dot(60, 36, 6.5) + dot(43, 82, 6.5) + dot(77, 82, 6.5))

def m_hub():
    return (g('<path d="M60 60 V32"/><path d="M60 60 L35.8 74"/><path d="M60 60 L84.2 74"/>')
            + dot(60, 32, 5.8) + dot(35.8, 74, 5.8) + dot(84.2, 74, 5.8) + dot(60, 60, 8))

def m_bridge():
    return (g('<path d="M34 76 Q60 34 86 76"/>')
            + dot(34, 76, 6.5) + dot(86, 76, 6.5) + dot(60, 55, 5))

def m_weave():
    return ('<mask id="wv-a" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">'
            '<rect width="120" height="120" fill="#fff"/>'
            '<circle cx="60" cy="52.25" r="8" fill="#000"/></mask>'
            '<mask id="wv-b" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">'
            '<rect width="120" height="120" fill="#fff"/>'
            '<circle cx="60" cy="67.75" r="8" fill="#000"/></mask>'
            '<g mask="url(#wv-a)">%s</g><g mask="url(#wv-b)">%s</g>'
            % (g('<circle cx="46" cy="60" r="16"/>'),
               g('<circle cx="74" cy="60" r="16"/>')))

def m_comb():
    def small(cx, cy, r=11.5):
        pts = hexpts(r, cx, cy)
        d = "M" + " L".join("%.2f %.2f" % p for p in pts) + " Z"
        return ('<path d="%s" fill="none" stroke="%s" stroke-width="4.6" '
                'stroke-linejoin="round"/>' % (d, IC))
    return small(47, 48) + small(73, 48) + small(60, 70)

def m_circle():
    unit = (dot(60, 32, 5.5)
            + '<path d="M51 49 a9 9 0 0 1 18 0" fill="none" stroke="%s" '
              'stroke-width="5" stroke-linecap="round"/>' % IC)
    out = ""
    for a in (0, 120, 240):
        out += '<g transform="rotate(%d 60 60)">%s</g>' % (a, unit)
    return out

def m_clasp():
    return g('<path d="M63.52 71.62 A14 14 0 1 1 46.38 54.48"/>'
             '<path d="M56.48 48.38 A14 14 0 1 1 73.62 65.52"/>', sw=6)

def m_orbit():
    ring = ('<g transform="rotate(-22 60 60)">'
            '<ellipse cx="60" cy="60" rx="31" ry="13" fill="none" stroke="%s" stroke-width="5"/>'
            '<circle cx="91" cy="60" r="9" fill="%s"/>'
            '<circle cx="91" cy="60" r="5.5" fill="%s"/>'
            '</g>' % (IC, HX, IC))
    return ring + dot(60, 60, 8)

def m_cap():
    return (g('<path d="M60 34 L88 47 L60 60 L32 47 Z"/>'
              '<path d="M45 53.5 V66 a15 9 0 0 0 30 0 V53.5"/>'
              '<path d="M88 47 V62"/>')
            + dot(88, 66, 4.2))

def m_lineage():
    return (g('<path d="M60 90 V50"/>'
              '<path d="M60 76 C60 64 50 62 42 58"/>'
              '<path d="M60 64 C60 54 70 51 78 47"/>')
            + dot(60, 45, 6.2) + dot(42, 58, 5.8) + dot(78, 47, 5.8))

def m_signal():
    return ('<g transform="translate(6 -2)">%s%s</g>'
            % (g('<path d="M35.84 63.09 A18 18 0 0 1 58.91 73.84"/>'
                 '<path d="M32.08 52.75 A29 29 0 0 1 69.25 70.08"/>'
                 '<path d="M28.32 42.41 A40 40 0 0 1 79.59 66.32"/>'),
               dot(42, 80, 6.8)))

CONCEPTS = [
 dict(fam="net", id="agraph", name="The A-graph",
      story="A network diagram that happens to spell the A of AlmaConnect — three people-nodes, two edges, one crossbar.",
      why="Monogram and network in one shape. Nothing else in the alumni-software category owns a letterform built out of nodes.",
      risk="The crossbar is the thinnest relationship on the page; it needs 1px of extra weight below 20px.",
      tags=["Monogram", "Network", "Distinct"], fn=m_agraph),
 dict(fam="net", id="hub", name="The Connector",
      story="One hub, three alumni nodes. The platform sits in the middle and everything reaches it.",
      why="Reads instantly at 16px and mirrors what the product literally does — one system, many relationships.",
      risk="Hub-and-spoke is a well-worn tech shape; the drawing has to be impeccably spaced to feel owned.",
      tags=["Platform", "Legible tiny"], fn=m_hub),
 dict(fam="net", id="bridge", name="The Bridge",
      story="Two people, an arc between them, a meeting point at the apex — students on one side, alumni on the other.",
      why="The clearest single-idea mark here: connection as a span, not a web. Ages well and never looks like an icon set.",
      risk="Arc marks are common in fintech; the node at the apex is what keeps it AlmaConnect's.",
      tags=["Connection", "Simple", "Timeless"], fn=m_bridge),
 dict(fam="net", id="weave", name="The Weave",
      story="Two rings genuinely interlocked — over at the top, under at the bottom. A bond, not an overlap.",
      why="It carries the handshake's meaning (two parties joined) with none of its clip-art baggage.",
      risk="The over/under gap is the whole idea and it is the first thing to close up at favicon size.",
      tags=["Bond", "Heritage"], fn=m_weave),
 dict(fam="net", id="comb", name="The Cohort",
      story="Three small hexagons inside the big one — a class, a chapter, a cohort inside the wider network.",
      why="The only concept that draws its icon from the container itself, so the mark feels structurally inevitable.",
      risk="Hexagon-inside-hexagon is the busiest option; it goes to mush below 24px.",
      tags=["Cohort", "Self-referential"], fn=m_comb),
 dict(fam="people", id="circle", name="The Circle",
      story="Three figures facing outward in a ring — a community that has no head of the table.",
      why="Warmest mark in the set and the most obviously about people rather than data.",
      risk="Three-people rosettes are the default community icon; it needs the hexagon to be memorable.",
      tags=["Community", "Warm"], fn=m_circle),
 dict(fam="people", id="clasp", name="The Clasp",
      story="Two open arcs turning toward each other and stopping a hair short — the handshake reduced to its gesture.",
      why="The most direct heir to the current mark: same meaning, a fraction of the detail, far better at small sizes.",
      risk="Two facing arcs can read as brackets or a broken link if the gap is set even slightly wrong.",
      tags=["Handshake", "Continuity"], fn=m_clasp),
 dict(fam="people", id="orbit", name="The Mentor",
      story="One alum orbiting the institution — or a mentee circling a mentor. Movement, not a static pair.",
      why="The only mark in the set with implied motion, which gives the brand somewhere to go in animation.",
      risk="An orbit around a centred dot can read as an eye; the break in the ring is what stops it.",
      tags=["Mentorship", "Motion"], fn=m_orbit),
 dict(fam="alma", id="cap", name="The Cap",
      story="A mortarboard flattened to a rhombus, a band and a tassel. Alma mater, said out loud.",
      why="Zero explanation needed — every audience decodes it in under a second.",
      risk="Also the most generic option in education software; hundreds of marks already use it.",
      tags=["Alumni", "Literal"], fn=m_cap),
 dict(fam="alma", id="lineage", name="The Lineage",
      story="A stem branching into three nodes — one institution, generations of graduates going out from it.",
      why="Growth and network at the same time, and it gives the brand a natural story about giving back.",
      risk="Trees are a crowded metaphor; the node ends are what keep it from looking like a wellness brand.",
      tags=["Growth", "Generations"], fn=m_lineage),
 dict(fam="alma", id="signal", name="The Signal",
      story="One graduate, three widening arcs — reach, engagement, news travelling through the network.",
      why="The best fit for the News and engagement side of the product; visibly about broadcast and reach.",
      risk="Reads as wi-fi before it reads as alumni. Strong as a sub-brand mark, risky as the master mark.",
      tags=["Reach", "News"], fn=m_signal),
]

FAMILIES = [
 dict(key="net", title="Network and connection",
      thesis="The mark shows the relationship rather than the person. These read as software, and they scale the best."),
 dict(key="people", title="People and community",
      thesis="The direct heirs to the handshake. These keep the human warmth of the current mark without its detail."),
 dict(key="alma", title="Alma mater and growth",
      thesis="These lean on the alumni story itself — the institution, the cohort, the years after graduation."),
]

# --- svg emitters ------------------------------------------------------------
def symbol_defs():
    out = []
    for c in CONCEPTS:
        out.append('<symbol id="mk-%s" viewBox="0 0 120 120">%s%s</symbol>'
                   % (c["id"], hexagon(), c["fn"]()))
    return ('<svg width="0" height="0" aria-hidden="true" style="position:absolute">'
            '<defs>%s</defs></svg>' % "".join(out))

def standalone(c, hx=ACCENT, ic="#FFFFFF"):
    body = (hexagon().replace("var(--hx, %s)" % ACCENT, hx)
            + c["fn"]().replace("var(--ic, #FFFFFF)", ic).replace("var(--hx, %s)" % ACCENT, hx))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" '
            'height="120" role="img" aria-label="AlmaConnect mark — %s">%s</svg>\n'
            % (c["name"], body))

os.makedirs(os.path.join(OUT_REPO, "logo-marks"), exist_ok=True)
for c in CONCEPTS:
    with open(os.path.join(OUT_REPO, "logo-marks", "%s.svg" % c["id"]), "w") as f:
        f.write(standalone(c))
    with open(os.path.join(OUT_REPO, "logo-marks", "%s-mono.svg" % c["id"]), "w") as f:
        f.write(standalone(c, hx=INK, ic="#FFFFFF"))

# --- page --------------------------------------------------------------------
def use(cid, size, cls="", style=""):
    return ('<svg class="mk %s" width="%s" height="%s" viewBox="0 0 120 120" style="%s" '
            'aria-hidden="true"><use href="#mk-%s"/></svg>' % (cls, size, size, style, cid))

def chip(t):
    return '<li>%s</li>' % html.escape(t)

def card(c):
    return """
<article class="card">
  <div class="stage">%s</div>
  <h3>%s</h3>
  <p class="story">%s</p>
  <ul class="tags">%s</ul>
  <dl class="notes">
    <dt>Why it works</dt><dd>%s</dd>
    <dt>Watch out</dt><dd>%s</dd>
  </dl>
  <div class="tests">
    <div class="test"><span class="tile">%s</span><span>16px</span></div>
    <div class="test"><span class="tile lite">%s</span><span>1-colour</span></div>
    <div class="test"><span class="tile dark">%s</span><span>reversed</span></div>
  </div>
</article>""" % (
    use(c["id"], 132), html.escape(c["name"]), html.escape(c["story"]),
    "".join(chip(t) for t in c["tags"]),
    html.escape(c["why"]), html.escape(c["risk"]),
    use(c["id"], 16), use(c["id"], 28, "v-mono"), use(c["id"], 28, "v-rev"))

def fam_section(f):
    cards = "".join(card(c) for c in CONCEPTS if c["fam"] == f["key"])
    n = len([c for c in CONCEPTS if c["fam"] == f["key"]])
    return """
<section class="family">
  <header class="fam-head">
    <h2>%s</h2>
    <p>%s</p>
    <span class="count">%d marks</span>
  </header>
  <div class="grid">%s</div>
</section>""" % (html.escape(f["title"]), html.escape(f["thesis"]), n, cards)

def lockup(cid, size=46):
    return ('<div class="lockup">%s<span class="wm"><b>Alma</b>Connect</span></div>'
            % use(cid, size))

container_spec = """
<section class="spec">
  <div class="spec-art">
    <svg viewBox="0 0 120 120" width="180" height="180" aria-hidden="true">
      %s
      <circle cx="60" cy="60" r="30" fill="none" stroke="#04302B" stroke-opacity=".28"
              stroke-width="1" stroke-dasharray="3 4"/>
      <line x1="6" y1="60" x2="114" y2="60" stroke="#04302B" stroke-opacity=".18" stroke-width="1"/>
      <line x1="60" y1="6" x2="60" y2="114" stroke="#04302B" stroke-opacity=".18" stroke-width="1"/>
    </svg>
  </div>
  <div class="spec-copy">
    <h2>The part that stays</h2>
    <p>Every concept below sits in the same container: a pointy-top hexagon, 108&nbsp;units across the
    flats, corner radius 14 &mdash; roughly a quarter of the circumradius, matching the softness of the
    mark you have today. Turquoise <code>#00C4B5</code> fill, white icon, no outline, no gradient.</p>
    <ul class="rules">
      <li><b>Safe zone.</b> The icon lives inside a 60-unit circle (dashed). Nothing crosses it, so every
      mark shares one optical weight when they sit side by side.</li>
      <li><b>One stroke weight.</b> 5.5 units, round caps and joins, at a 120-unit box. Counters stay open
      enough to survive a 16px favicon.</li>
      <li><b>What changes.</b> Only the white icon. The current clasped-hands drawing carries five
      overlapping strokes and closes up below about 24px &mdash; that is the problem each of these solves.</li>
    </ul>
  </div>
</section>""" % hexagon(ACCENT)

reco = """
<section class="reco">
  <h2>Where I would land</h2>
  <div class="reco-grid">
    <div class="pick">
      <span class="rank">First choice</span>
      %s
      <h3>The A-graph</h3>
      <p>It is the only mark that is both a monogram and a network, so it says AlmaConnect and says
      what AlmaConnect does in the same three nodes. It is unmistakable next to a mortarboard or a
      handshake, and the geometry is simple enough that it holds at favicon size and in a single colour.</p>
    </div>
    <div class="pick">
      <span class="rank">Runner-up</span>
      %s
      <h3>The Bridge</h3>
      <p>The safest strong option. One idea, three elements, no interpretation needed &mdash; and it is the
      easiest of the eleven to animate, embroider, emboss or hand to a printer at 8mm.</p>
    </div>
    <div class="pick">
      <span class="rank">If continuity matters most</span>
      %s
      <h3>The Clasp</h3>
      <p>If the handshake is equity you do not want to spend, this keeps the gesture and drops the
      detail. Existing users read it as the same brand, cleaned up, rather than a new one.</p>
    </div>
  </div>
  <div class="lockups">
    <span class="lk-label">Lockups &mdash; first choice</span>
    <div class="lk-row">
      %s
      <div class="lockup dark">%s<span class="wm"><b>Alma</b>Connect</span></div>
      <div class="lockup mono">%s<span class="wm"><b>Alma</b>Connect</span></div>
    </div>
  </div>
</section>""" % (use("agraph", 88), use("bridge", 88), use("clasp", 88),
                 lockup("agraph"), use("agraph", 46, "v-rev-flat"), use("agraph", 46, "v-mono"))

closing = """
<section class="closing">
  <h2>Before you commit to one</h2>
  <ol class="checks">
    <li><b>Print it at 8mm.</b> Anything whose counters fill in on a laser printer is out, whatever it
    looks like on screen.</li>
    <li><b>Put it in a browser tab</b> next to LinkedIn and Gmail. The tab is where the mark works hardest.</li>
    <li><b>Say it out loud.</b> If the support team cannot name the shape in one word on a call, it is
    not the mark.</li>
    <li><b>Test it against the sub-brands.</b> AlmaConnect News and the data products need to inherit the
    same container without a second drawing.</li>
    <li><b>Show alumni, not just staff.</b> The handshake reads differently to a 2004 graduate than it
    does to a product team.</li>
  </ol>
  <p class="fine">Eleven marks, one container. Each is a real SVG on the same 120-unit grid and the same
  5.5-unit stroke, exported alongside this page in <code>logo-marks/</code> in colour and single-colour.</p>
</section>"""

FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
        'family=Nunito+Sans:ital,opsz,wght@0,6..12,300..800;1,6..12,300..700&display=swap">')

CSS = """
<style>
:root{
  --ground:#F7F6F2; --surface:#FFFFFF; --panel:#F1EFE8;
  --ink:#04302B; --ink-65:rgba(6,48,43,.66); --ink-45:rgba(6,48,43,.46);
  --accent:#00C4B5; --accent-deep:#00A396; --tint:#E0F7F4;
  --hairline:rgba(120,140,134,.26); --deep:#04302B;
  --hx:#00C4B5; --ic:#FFFFFF;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#06231F; --surface:#0A2E29; --panel:#0C332D;
    --ink:#E8F5F2; --ink-65:rgba(232,245,242,.68); --ink-45:rgba(232,245,242,.44);
    --tint:rgba(0,196,181,.14); --hairline:rgba(120,220,208,.20); --deep:#021815;
  }
}
:root[data-theme="dark"]{
  --ground:#06231F; --surface:#0A2E29; --panel:#0C332D;
  --ink:#E8F5F2; --ink-65:rgba(232,245,242,.68); --ink-45:rgba(232,245,242,.44);
  --tint:rgba(0,196,181,.14); --hairline:rgba(120,220,208,.20); --deep:#021815;
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:"Nunito Sans","Helvetica Neue",Arial,sans-serif;
  font-weight:400; font-size:16px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1140px; margin:0 auto; padding:0 28px 96px}
h1,h2,h3{margin:0; text-wrap:balance; font-weight:400}
p{margin:0}
code{font-family:"Nunito Sans",monospace; font-weight:600; font-size:.92em;
  background:var(--tint); color:var(--ink); padding:1px 5px; border-radius:4px}

/* header */
.masthead{padding:72px 0 40px; border-bottom:1px solid var(--hairline)}
.eyebrow{font-size:12.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:var(--accent-deep); margin-bottom:22px; display:block}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .eyebrow{color:var(--accent)}}
:root[data-theme="dark"] .eyebrow{color:var(--accent)}
h1{font-size:clamp(40px,6vw,68px); line-height:1.02; letter-spacing:-.018em; font-weight:375; max-width:15ch}
.lede{margin-top:24px; max-width:60ch; font-size:19px; line-height:1.55; color:var(--ink-65)}
.meta{margin-top:32px; display:flex; flex-wrap:wrap; gap:10px 28px; font-size:13.5px; color:var(--ink-45);
  font-variant-numeric:tabular-nums}
.meta b{font-weight:600; color:var(--ink-65)}

/* container spec */
.spec{display:grid; grid-template-columns:220px 1fr; gap:48px; align-items:start;
  padding:56px 0; border-bottom:1px solid var(--hairline)}
.spec-art{background:var(--panel); border-radius:16px; padding:20px; display:grid; place-items:center}
.spec-copy h2{font-size:30px; letter-spacing:-.01em; margin-bottom:14px}
.spec-copy p{max-width:58ch; color:var(--ink-65)}
.rules{margin:26px 0 0; padding:0; list-style:none; display:grid; gap:14px; max-width:64ch}
.rules li{padding-left:18px; position:relative; color:var(--ink-65); font-size:15.5px}
.rules li::before{content:""; position:absolute; left:0; top:.62em; width:7px; height:7px;
  background:var(--accent); border-radius:2px}
.rules b{color:var(--ink); font-weight:700}

/* families */
.family{padding:56px 0 8px}
.fam-head{display:grid; grid-template-columns:1fr auto; gap:8px 24px; align-items:baseline;
  padding-bottom:20px; border-bottom:1px solid var(--hairline); margin-bottom:28px}
.fam-head h2{font-size:34px; letter-spacing:-.012em}
.fam-head p{grid-column:1; max-width:62ch; color:var(--ink-65); font-size:16px}
.count{grid-row:1; grid-column:2; font-size:12.5px; letter-spacing:.1em; text-transform:uppercase;
  font-weight:700; color:var(--ink-45); font-variant-numeric:tabular-nums}

.grid{display:grid; grid-template-columns:repeat(3,1fr); gap:20px}
.card{background:var(--surface); border:1px solid var(--hairline); border-radius:14px;
  padding:22px; display:flex; flex-direction:column; gap:14px}
.stage{background:var(--panel); border-radius:10px; height:184px; display:grid; place-items:center}
.card h3{font-size:21px; font-weight:700; letter-spacing:-.005em}
.story{color:var(--ink-65); font-size:15.5px}
.tags{display:flex; flex-wrap:wrap; gap:6px; margin:0; padding:0; list-style:none}
.tags li{font-size:12px; font-weight:600; letter-spacing:.02em; background:var(--tint);
  color:var(--accent-deep); padding:3px 9px; border-radius:999px}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .tags li{color:#7FE8DE}}
:root[data-theme="dark"] .tags li{color:#7FE8DE}
.notes{margin:0; display:grid; gap:9px; border-top:1px solid var(--hairline); padding-top:14px}
.notes dt{font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink-45)}
.notes dd{margin:3px 0 0; font-size:14.5px; line-height:1.45; color:var(--ink-65)}
.tests{margin-top:auto; padding-top:14px; border-top:1px solid var(--hairline);
  display:flex; gap:18px; align-items:flex-end}
.test{display:grid; gap:6px; justify-items:center}
.test span:last-child{font-size:11px; color:var(--ink-45); letter-spacing:.04em}
.tile{width:44px; height:36px; display:grid; place-items:center; border-radius:6px;
  background:var(--panel)}
.tile.lite{background:#F1EFE8}
.tile.dark{background:var(--deep)}
:root[data-theme="dark"] .tile.dark, .tile.dark{background:#04302B}

/* mark variants */
.mk{display:block}
.v-mono{--hx:#04302B; --ic:#FFFFFF}
.v-rev{--hx:#FFFFFF; --ic:#04302B}
.v-rev-flat{--hx:#FFFFFF; --ic:#04302B}

/* recommendation */
.reco{padding:64px 0 0; border-top:1px solid var(--hairline); margin-top:56px}
.reco>h2{font-size:34px; letter-spacing:-.012em; margin-bottom:28px}
.reco-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:20px}
.pick{background:var(--tint); border-radius:14px; padding:26px 24px; display:flex;
  flex-direction:column; gap:12px}
.rank{font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--accent-deep)}
:root[data-theme="dark"] .rank{color:#7FE8DE}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .rank{color:#7FE8DE}}
.pick h3{font-size:24px; font-weight:700}
.pick p{font-size:15.5px; color:var(--ink-65)}
.lockups{margin-top:40px; padding:32px; background:var(--surface); border:1px solid var(--hairline);
  border-radius:14px}
.lk-label{font-size:11.5px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--ink-45)}
.lk-row{margin-top:22px; display:flex; flex-wrap:wrap; gap:16px}
.lockup{display:flex; align-items:center; gap:12px; padding:16px 24px; border-radius:10px;
  background:var(--panel)}
.lockup.dark{background:#04302B}
.lockup.dark .wm{color:#FFFFFF}
.lockup.mono{background:var(--panel)}
.wm{font-size:23px; font-weight:400; letter-spacing:-.015em; color:var(--ink)}
.wm b{font-weight:700}

/* closing */
.closing{padding:64px 0 0}
.closing h2{font-size:30px; letter-spacing:-.01em; margin-bottom:22px}
.checks{margin:0; padding:0 0 0 1.1em; display:grid; gap:12px; max-width:70ch;
  color:var(--ink-65); font-size:16px}
.checks b{color:var(--ink); font-weight:700}
.checks li::marker{color:var(--accent); font-weight:700}
.fine{margin-top:28px; font-size:14px; color:var(--ink-45); max-width:70ch}

@media (max-width:940px){
  .grid,.reco-grid{grid-template-columns:repeat(2,1fr)}
  .spec{grid-template-columns:1fr; gap:28px}
}
@media (max-width:640px){
  .grid,.reco-grid{grid-template-columns:1fr}
  .wrap{padding:0 18px 64px}
  .masthead{padding-top:48px}
}
</style>
"""

BODY = """%s%s
<div class="wrap">
  <header class="masthead">
    <span class="eyebrow">AlmaConnect &middot; identity exploration</span>
    <h1>Eleven ways to fill the hexagon</h1>
    <p class="lede">The hexagon stays. The clasped hands inside it do not have to. Below are eleven
    replacement icons in three directions, each drawn on the same grid and the same stroke weight so
    they can be compared honestly rather than admired one at a time.</p>
    <div class="meta">
      <span><b>11</b> concepts</span>
      <span><b>3</b> directions</span>
      <span>Container: pointy-top hexagon, <b>#00C4B5</b></span>
      <span>Icon: white, <b>5.5</b>/120 stroke</span>
    </div>
  </header>
  %s
  %s
  %s
  %s
</div>
""" % (FONT, CSS, container_spec,
       "".join(fam_section(f) for f in FAMILIES), reco, closing)

BODY = symbol_defs() + BODY

with open(os.path.join(SCRATCH, "logo-marks-artifact.html"), "w") as f:
    f.write("<title>Eleven Ways to Fill the Hexagon</title>\n" + BODY)

with open(os.path.join(OUT_REPO, "logo-marks.html"), "w") as f:
    f.write('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<title>AlmaConnect — logo mark explorations</title>\n</head>\n<body>\n'
            + BODY + "</body>\n</html>\n")

print("wrote", len(CONCEPTS)*2, "svgs + 2 html files")
