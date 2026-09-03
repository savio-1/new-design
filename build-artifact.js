#!/usr/bin/env node
/* Build the Artifact source from ask-tiq.html.
   Artifacts wrap the published file in their own <!doctype>/<head>/<body>, so
   the source must be body-level content — this strips the outer document
   scaffolding and leaves everything else byte-identical. ask-tiq.html stays the
   single source of truth; run this, then publish artifact/ask-tiq.artifact.html.

   Usage: node build-artifact.js [--local-fonts]
     --local-fonts  point Geist at ./fonts/geist.css instead of Google Fonts,
                    for offline verification runs only. */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = fs.readFileSync(path.join(root, 'ask-tiq.html'), 'utf8');
const localFonts = process.argv.includes('--local-fonts');

let out = src;
// drop only the document scaffolding; <title>/<meta>/<link>/<style> stay put —
// the publisher reads the title from the file, and browsers honour <link> and
// <style> in body. Anchored so a stray "<body" inside a string can't match.
const strip = [
  /^\s*<!DOCTYPE html>\s*\n/i,
  /^\s*<html[^>]*>\s*\n/i,
  /^\s*<head>\s*\n/im,
  /^\s*<\/head>\s*\n/im,
  /^\s*<body[^>]*>\s*\n/im,
  /\n\s*<\/body>\s*(?=\n?\s*<\/html>)/i,
  /\n\s*<\/html>\s*$/i,
];
for (const re of strip) {
  if (!re.test(out)) throw new Error('scaffolding pattern not found: ' + re);
  out = out.replace(re, '\n');
}
// only a line-leading tag counts — prose or a comment mentioning <html> is fine
const survivor = out.split('\n').find(l =>
  /^\s*<\/?(?:!DOCTYPE|html|head|body)\b/i.test(l));
if (survivor) throw new Error('scaffolding survived the strip: ' + survivor.trim().slice(0, 60));
if (!/<title>[^<]+<\/title>/.test(out.slice(0, 8192))) {
  throw new Error('no <title> in the first 8KB — the artifact would lose its name');
}

if (localFonts) {
  out = out.replace(
    /<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet" \/>/,
    '<link href="fonts/geist.css" rel="stylesheet" />');
}

const dir = path.join(root, 'artifact');
fs.mkdirSync(dir, { recursive: true });
const dest = path.join(dir, 'ask-tiq.artifact.html');
fs.writeFileSync(dest, out);
console.log(`wrote ${path.relative(root, dest)}  (${out.length} bytes${localFonts ? ', local fonts' : ''})`);
