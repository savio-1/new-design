// Smoke test: open Collage Studio, render every template (still + one animated frame), report errors.
//   node studio/tools/smoke_test.js [path/to/page.html]
// Needs Playwright (npm i -D playwright, or a global install) and a Chromium build.
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

(async () => {
  const page = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
  const opts = {};
  if (process.env.PLAYWRIGHT_CHROMIUM) opts.executablePath = process.env.PLAYWRIGHT_CHROMIUM;
  else if (require('fs').existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')) opts.executablePath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (process.env.HTTPS_PROXY) opts.proxy = { server: process.env.HTTPS_PROXY };
  const browser = await chromium.launch(opts);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const tab = await ctx.newPage();
  const errors = [];
  tab.on('pageerror', e => errors.push(e.message));
  await tab.goto('file://' + page);
  await tab.waitForTimeout(3000);
  const result = await tab.evaluate(async () => {
    const S = window.Studio, R = window.StudioRender, out = { count: 0, failed: [] };
    for (const t of window.STUDIO_TEMPLATES) {
      try {
        S.loadDoc(t.build(), null, { name: t.name });
        await R.preload(S.doc);
        R.renderDoc(S.doc, { scale: 0.2 });
        if (t.video) R.renderDoc(S.doc, { scale: 0.2, time: 1.2 });
        out.count++;
      } catch (e) { out.failed.push(t.id + ': ' + e.message); }
    }
    return out;
  });
  console.log(`rendered ${result.count} templates`);
  if (result.failed.length) console.log('failed:\n  ' + result.failed.join('\n  '));
  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  await browser.close();
  process.exit(result.failed.length || errors.length ? 1 : 0);
})();
