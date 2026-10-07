// Verify the four product-card hover animations on the built homepage.
// Run:  NODE_PATH=/opt/node22/lib/node_modules node scripts/verify-cards.js
// Needs: python3 scripts/build-home.py first; fonts via scripts/setup-fonts.sh.
// Measures computed transforms/opacities after a REAL hover — stills lie about motion.
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '..', 'almaconnect-home.html');
const matY = (sel) => `+new DOMMatrix(getComputedStyle(document.querySelector('${sel}')).transform).m42.toFixed(0)`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  await p.goto(PAGE); await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelector('.personas').scrollIntoView());
  await p.waitForTimeout(800);
  const hover = async (n) => { await p.mouse.move(5, 5); await p.waitForTimeout(300); await p.hover(`.personas .pcard:nth-child(${n}) .pcard__media`); };

  // fonts actually resolved?
  console.log('FONTS', await p.evaluate(() => [...new Set([...document.querySelectorAll('.ncard__name,.ncard__news')].map(e => getComputedStyle(e).fontFamily.split(',')[0]))]));

  // 1 · NEWS — time to first movement, and the lit card must be the centred card
  await hover(1);
  const ys = []; for (let i = 0; i < 10; i++) { ys.push(await p.evaluate(matY('.nstack__rail'))); await p.waitForTimeout(100); }
  console.log('NEWS rail Y every 100ms:', ys.join(' '));
  const sync = [];
  for (let i = 0; i < 4; i++) {
    sync.push(await p.evaluate(() => {
      const st = document.querySelector('.nstack').getBoundingClientRect(), cs = [...document.querySelectorAll('.ncard')];
      const mid = cs.map((c, i) => ({ i, d: Math.abs(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2 - (st.top + st.height / 2)) })).sort((a, b) => a.d - b.d)[0].i;
      const lit = cs.map((c, i) => ({ i, o: +getComputedStyle(c).opacity })).sort((a, b) => b.o - a.o)[0].i;
      return `${cs[mid].querySelector('.ncard__name').textContent}/${cs[lit].querySelector('.ncard__name').textContent}`;
    }));
    await p.waitForTimeout(2200);
  }
  console.log('NEWS centred/lit per step (names must match):', sync.join('  '));

  // 2 · DATA MINE — rest frame, drift reversals, record sequence
  await hover(2);
  const r0 = await p.evaluate(() => +new DOMMatrix(getComputedStyle(document.querySelector('.dmrow--a')).transform).a.toFixed(3));
  await p.waitForTimeout(900);
  const pts = [];
  for (let i = 0; i < 24; i++) { pts.push(await p.evaluate(() => { const r = document.querySelector('.dmface img').getBoundingClientRect(); return [r.left, r.top]; })); await p.waitForTimeout(50); }
  let rev = 0, prev = null;
  for (let i = 1; i < pts.length; i++) { const d = [pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]]; if (prev && d[0]*prev[0] + d[1]*prev[1] < -0.01) rev++; if (Math.hypot(...d) > 0.01) prev = d; }
  console.log(`DATAMINE rest scale at hover=${r0} (1.075 = seamless)  drift reversals=${rev} (must be 0)`);
  const seq = [];
  for (let i = 0; i < 18; i++) {
    seq.push(await p.evaluate(() => { const o = s => +(+getComputedStyle(document.querySelector(s)).opacity).toFixed(1); return `A${o('.dmrow--a .dmrow__real')}B${o('.dmrow--b .dmrow__real')}C${o('.dmrow--c .dmrow__real')}`; }));
    await p.waitForTimeout(450);
  }
  console.log('DATAMINE open record every 0.45s:', seq.join(' '));

  // 3 · INSTITUTIONS — beat 1 must not blink at hover; beats in order
  await hover(3);
  const beats = [];
  for (let i = 0; i < 16; i++) {
    beats.push(await p.evaluate(() => [1, 2, 3].map(n => (+getComputedStyle(document.querySelector('.ibeat--' + n)).opacity).toFixed(1)).join('/')));
    await p.waitForTimeout(250);
  }
  console.log('INST beat opacities every 250ms (b1/b2/b3):', beats.join(' '));

  // artwork escaping the card on the left (the gradient wash bleeds 25% by design, so it is excluded)
  const clip = await p.evaluate(() => [...document.querySelectorAll('.pcard')].map((pc, i) => {
    const art = pc.querySelector('.pcard__art').getBoundingClientRect(), plus = pc.querySelector('.pcard__plus').getBoundingClientRect();
    let bad = 0; pc.querySelectorAll('.pcard__art *:not(.pcard__wash)').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.left < art.left - 40) bad++; });
    return `card${i + 1}:${bad ? bad + ' off-left' : 'ok'}`;
  }));
  console.log('LAYOUT', clip.join(' '));
  await b.close();
})();
