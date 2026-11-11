/* The pinned Chromium moves when the container is rebuilt, so resolve it
   rather than hardcoding a revision. */
const fs = require('fs'), path = require('path');
const ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const cand = [];
for (const d of fs.readdirSync(ROOT)) {
  if (!/^chromium(_headless_shell)?-/.test(d)) continue;
  for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome',
                     'chrome-linux64/headless_shell', 'chrome-linux/headless_shell']) {
    const f = path.join(ROOT, d, sub);
    if (fs.existsSync(f)) cand.push(f);
  }
}
if (!cand.length) throw new Error('no Chromium under ' + ROOT);
cand.sort();                       // prefer the full chrome build
module.exports = cand.find(f => f.endsWith('/chrome')) || cand[0];
