/* Dev harness: open the studio in headless Chromium and run a test script against it.
     node studio/tools/dev/run.js studio/tools/dev/contact_sheet.js
   The script exports async (page, OUT) => {…}; OUT is the output folder (env OUT, default ./dev-out).
   Env: CHROME = path to a Chromium binary (default: Playwright's own), URL = page to open (default studio/index.html). */
const path = require('path'), fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.env.OUT || 'dev-out');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const exe = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
  const browser = await pw.chromium.launch({ executablePath: exe, proxy: proxy ? { server: proxy } : undefined });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(process.env.URL || 'file://' + path.join(ROOT, 'index.html'));
  await page.waitForTimeout(4000);
  const script = process.argv[2];
  if (script) await require(path.resolve(script))(page, OUT);
  await page.screenshot({ path: path.join(OUT, 'shot.png') });
  if (errs.length) console.log(errs.slice(0, 30).join('\n'));
  await browser.close();
})();
