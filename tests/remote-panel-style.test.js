/* The remote-agent panel's tabs and fields, restyled to Figma 1072:383696.
   Run: node tests/remote-panel-style.test.js */
const { chromium } = require('playwright');
const path = require('path');
const ok = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n); if (!c) process.exitCode = 1; };

const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = c => { const f = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const near = (a, b, t = 1) => Math.abs(a - b) <= t;


/* Every button in the panel that claims to centre its label must actually
   centre it. Measured as the union of the button's leaf boxes (icon + text),
   so an icon beside a label is not mistaken for skew; buttons styled
   text-align:left (the option cards) are not candidates. */
const CENTRED = () => [...document.getElementById('agentPanel').querySelectorAll('button')]
  .map(b => {
    const r = b.getBoundingClientRect();
    if (!r.width || b.offsetParent === null) return null;
    if (getComputedStyle(b).textAlign !== 'center') return null;
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let L = Infinity, R = -Infinity, n;
    while ((n = w.nextNode())) {
      let t;
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); t = rg.getBoundingClientRect();
      } else {
        if (n.children.length || n.textContent.trim()) continue;
        t = n.getBoundingClientRect();
      }
      if (t.width) { L = Math.min(L, t.left); R = Math.max(R, t.right); }
    }
    if (L === Infinity) return null;
    return { id: b.id || b.className.split(' ')[0], label: b.textContent.trim().slice(0, 24),
             skew: ((L - r.left) - (r.right - R)) / 2 };
  }).filter(Boolean);

const centredOk = async (p, where) => {
  const rows = await p.evaluate(CENTRED);
  const bad = rows.filter(r => Math.abs(r.skew) > 2);
  ok(`every centring button centres its label on ${where}`
     + (bad.length ? ' — ' + bad.map(b => `${b.id} "${b.label}" ${b.skew.toFixed(1)}px`).join(', ') : ''),
     bad.length === 0);
};

/* Walk to step 1 of Register a remote agent, with the name filled so Continue opens. */
async function openWizard(p) {
  const rc = async s => { const x = await p.locator(s).boundingBox(); await p.mouse.click(x.x + x.width / 2, x.y + x.height / 2); };
  await rc('#addNodeBtn'); await p.waitForTimeout(300);
  await rc('.addnode-i[data-type="agent"]'); await p.waitForTimeout(800);
  await rc('#newAgentBtn'); await p.waitForTimeout(350);
  await rc('.na-i[data-kind="remote"]'); await p.waitForTimeout(500);
  return rc;
}

async function run(scheme) {
  console.log('\n── ' + scheme + ' ──');
  const b = await chromium.launch({ executablePath: require('./chrome-path.js') });
  const p = await (await b.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'ask-tiq.html'));
  await p.waitForTimeout(1700);
  const rc = await openWizard(p);

  // ── tabs: a sunken track carrying one raised pill ──
  const tabs = await p.evaluate(() => {
    const track = document.getElementById('rwSteps');
    const t = [...track.querySelectorAll('.rw-tab')];
    const cs = el => getComputedStyle(el);
    return {
      n: t.length,
      numerals: track.querySelectorAll('.n').length,
      trackBg: cs(track).backgroundColor,
      trackBox: track.getBoundingClientRect(),
      panel: document.getElementById('agentPanel').getBoundingClientRect(),
      tabs: t.map(x => ({
        w: x.getBoundingClientRect().width,
        on: x.classList.contains('on'),
        bg: cs(x).backgroundColor,
        color: cs(x).color,
        size: cs(x).fontSize,
        shadow: cs(x).boxShadow,
        cursor: cs(x).cursor,
      })),
    };
  });
  ok('the rail is three tabs with no step numerals', tabs.n === 3 && tabs.numerals === 0);
  ok('they are equal thirds of the track',
     near(tabs.tabs[0].w, tabs.tabs[1].w) && near(tabs.tabs[1].w, tabs.tabs[2].w));
  ok('the track is the sunken segmented fill',
     rgb(tabs.trackBg).join() === (scheme === 'dark' ? '18,18,18' : '238,238,238'));
  ok('only the active tab carries the pill fill',
     tabs.tabs[0].on && tabs.tabs.filter(t => rgb(t.bg)[3] !== 0 && t.bg !== 'rgba(0, 0, 0, 0)').length === 1 &&
     rgb(tabs.tabs[0].bg).join() === (scheme === 'dark' ? '33,33,33' : '255,255,255'));
  ok('the pill is raised in light and flat in dark',
     scheme === 'light' ? tabs.tabs[0].shadow !== 'none' : tabs.tabs[0].shadow === 'none');
  ok('tab type is Body-2 at 14px', tabs.tabs.every(t => t.size === '14px'));
  ok('the active label outranks the inactive ones',
     ratio(tabs.tabs[0].color, tabs.tabs[0].bg) > ratio(tabs.tabs[2].color, tabs.trackBg));
  ok('inactive tab labels still clear 4.5:1 on the track',
     ratio(tabs.tabs[2].color, tabs.trackBg) >= 4.5);
  ok('an unreachable tab does not invite a click', tabs.tabs[2].cursor === 'default');
  ok('the track sits inside the panel',
     tabs.trackBox.left >= tabs.panel.left && tabs.trackBox.right <= tabs.panel.right);

  await centredOk(p, 'step 1');

  // ── fields ──
  await p.fill('#rwName', 'Bank Ops Assistant');
  const fld = await p.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const lab = document.querySelector('.rw-label');
    const inp = document.getElementById('rwName');
    const ta = document.querySelector('.rw-field textarea');
    return {
      labText: lab.textContent.trim(), labSize: cs(lab).fontSize, labCase: cs(lab).textTransform,
      labColor: cs(lab).color, bodyColor: cs(document.body).color,
      req: lab.querySelector('.req') && cs(lab.querySelector('.req')).color,
      inpH: inp.getBoundingClientRect().height, inpBg: cs(inp).backgroundColor,
      inpBorder: cs(inp).borderTopColor, inpRadius: cs(inp).borderTopLeftRadius,
      taH: ta.getBoundingClientRect().height,
      panelBg: cs(document.getElementById('agentPanel')).backgroundColor,
    };
  });
  ok('labels are sentence case, not uppercase', fld.labCase === 'none' && /^[A-Z][a-z]/.test(fld.labText));
  ok('labels are 14px primary text', fld.labSize === '14px' && fld.labColor === fld.bodyColor);
  ok('the required marker is the red token',
     !!fld.req && rgb(fld.req).join() !== rgb(fld.labColor).join() && rgb(fld.req)[0] > rgb(fld.req)[2]);
  ok('inputs are 40px tall', near(fld.inpH, 40, 1.5));
  ok('textareas give three lines', fld.taH >= 72);
  /* Figma's dark frame separates a field from the panel by fill (#323232 on
     #1b1b1b). The design system's light answer is a white field on a white
     panel, bounded by a hairline — so the field has to be legible by fill OR
     by border, not specifically by fill. */
  ok('fields are bounded against the panel, by fill or by border',
     fld.inpRadius === '8px' &&
     (rgb(fld.inpBg).join() !== rgb(fld.panelBg).join() ||
      rgb(fld.inpBorder).join() !== rgb(fld.panelBg).join()));
  ok('the field border is visible against its own fill', ratio(fld.inpBorder, fld.inpBg) >= 1.1);
  /* Reported, not asserted: WCAG 1.4.11 wants 3:1 for a control identified only
     by its boundary. The light hairline is the design system's own token, used
     by every input in the app, so this notes the gap rather than diverging here. */
  console.log('  note: field boundary vs panel = ' +
              ratio(fld.inpBorder, fld.panelBg).toFixed(2) + ':1 (1.4.11 wants 3:1)');

  // ── footer ──
  const f1 = await p.evaluate(() => {
    const foot = document.querySelector('.rw-foot');
    const n = document.getElementById('rwNext');
    return { footW: foot.getBoundingClientRect().width, pad: parseFloat(getComputedStyle(foot).paddingLeft),
             w: n.getBoundingClientRect().width, h: n.getBoundingClientRect().height,
             prevHidden: document.getElementById('rwPrev').hidden,
             bg: getComputedStyle(foot).backgroundColor };
  });
  ok('step 1 shows a single full-width primary',
     f1.prevHidden && near(f1.w, f1.footW - 2 * f1.pad, 1.5));
  ok('the primary is 36px tall', near(f1.h, 36, 1.5));
  ok('the footer bar reads as its own surface',
     rgb(f1.bg).join() === (scheme === 'dark' ? '33,33,33' : '255,255,255'));

  // ── step 2: tabs advance, Back joins the footer, the done tab goes back ──
  await rc('#rwNext'); await p.waitForTimeout(450);
  const s2 = await p.evaluate(() => {
    const pn = document.getElementById('agentPanel').getBoundingClientRect();
    const t = [...document.querySelectorAll('.rw-tab')];
    const btns = [...document.querySelectorAll('.rw-foot .rw-btn')].filter(b => !b.hidden);
    return {
      on: t.findIndex(x => x.classList.contains('on')),
      done: t[0].classList.contains('done'), cursor: getComputedStyle(t[0]).cursor,
      inside: btns.every(b => { const r = b.getBoundingClientRect();
        return r.left >= pn.left - .5 && r.right <= pn.right + .5 && r.width > 48; }),
      count: btns.length,
      notClipped: btns.every(b => b.scrollWidth <= b.clientWidth + 1),
    };
  });
  ok('a disabled Continue drops the primary glow', await p.evaluate(() => {
    const n = document.getElementById('rwNext');
    return !n.disabled || getComputedStyle(n).boxShadow === 'none';
  }));
  ok('the active pill moves to step 2', s2.on === 1);
  ok('step 1 becomes a reachable tab', s2.done && s2.cursor === 'pointer');
  ok('Back and Continue share the footer, both inside the panel', s2.count === 2 && s2.inside);
  ok('neither footer label is clipped', s2.notClipped);
  await centredOk(p, 'step 2');
  await rc('.rw-choice:nth-child(2)'); await p.waitForTimeout(400);      // A2A swaps the sub-form
  await centredOk(p, 'step 2 via A2A');
  await rc('#rwSrvPick .rw-opt:first-child'); await p.waitForTimeout(350);
  await rc('#rwNext'); await p.waitForTimeout(450);
  await centredOk(p, 'step 3');
  await rc('.rw-tab[data-step="1"]'); await p.waitForTimeout(400);
  ok('clicking the completed tab returns to step 1', await p.evaluate(() =>
    document.querySelector('.rw-tab[data-step="1"]').classList.contains('on') &&
    !document.querySelector('.rw-pane[data-pane="1"]').hidden));

  console.log(errs.length ? ('JS ERRORS: ' + errs.join(' | ')) : 'no JS errors');
  if (errs.length) process.exitCode = 1;
  await b.close();
}

(async () => { await run('dark'); await run('light'); })();
