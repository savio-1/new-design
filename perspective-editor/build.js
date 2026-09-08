#!/usr/bin/env node
/* Bundles the editor into a single self-contained HTML file: dist/perspective.html
 *
 *   node build.js            -> dist/perspective.html (complete document)
 *   node build.js --fragment out.html
 *                            -> body-only fragment (no doctype/html/head/body wrappers), with <title>
 *                               and <style> first — the shape expected by hosts that wrap the page.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const inlineCss = html.replace(
  /<link rel="stylesheet" href="style\.css">/,
  () => `<style>\n${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}\n</style>`
);
const inlined = inlineCss.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(root, src), 'utf8');
  if (code.includes('</script')) throw new Error(`${src} contains a closing script tag`);
  return `<script>\n${code}\n</script>`;
});

const args = process.argv.slice(2);
const fragIdx = args.indexOf('--fragment');
if (fragIdx >= 0) {
  const out = args[fragIdx + 1] || 'perspective-fragment.html';
  const title = (inlined.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
  const fontLink = (inlined.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/) || [''])[0];
  const style = (inlined.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const body = (inlined.match(/<body>([\s\S]*)<\/body>/) || ['', ''])[1];
  fs.writeFileSync(out, `${title}\n${fontLink}\n${style}\n${body}`);
  console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
} else {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', 'perspective.html');
  fs.writeFileSync(out, inlined);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
}
