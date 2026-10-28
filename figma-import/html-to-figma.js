#!/usr/bin/env node
// Convert rendered HTML pages into .figma.json bundles that the
// "HTML → Figma importer" plugin (./plugin) turns into editable layers.
//
//   node figma-import/html-to-figma.js page.html [more.html ...] [options]
//
// Options
//   --width <px>        viewport width (default 1440)
//   --height <px>       viewport height (default 900)
//   --screen            capture only the viewport (app shells with their own
//                       scroll areas); default captures the whole page
//   --selector <css>    convert one element instead of the whole page
//   --out <dir>         output folder (default figma-import/exports)
//   --name <text>       frame name (single input only; default: page title)
//   --theme light|dark  emulate prefers-color-scheme
//   --themes            capture dark AND light; colours become Figma variables
//                       with Dark/Light modes (tokens read from CSS custom
//                       properties). Light is switched on with --light-js
//                       (default: data-mode="light" on <html>), dark with --dark-js
//   --collection <name> variable collection name (default "Theme")
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const o = { files: [], width: 1440, height: 900, screen: false, selector: null, out: path.join(__dirname, 'exports'), name: null, theme: null, themes: false, collection: 'Theme', darkJs: "document.documentElement.setAttribute('data-mode','dark')", lightJs: "document.documentElement.setAttribute('data-mode','light')" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--width') o.width = +argv[++i];
    else if (a === '--height') o.height = +argv[++i];
    else if (a === '--screen') o.screen = true;
    else if (a === '--selector') o.selector = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--name') o.name = argv[++i];
    else if (a === '--theme') o.theme = argv[++i];
    else if (a === '--themes') o.themes = true;
    else if (a === '--collection') o.collection = argv[++i];
    else if (a === '--dark-js') o.darkJs = argv[++i];
    else if (a === '--light-js') o.lightJs = argv[++i];
    else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 22).join('\n')); process.exit(0); }
    else o.files.push(a);
  }
  return o;
}

async function freeze(page) {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try { const t = a.effect.getComputedTiming(); if (isFinite(t.endTime)) a.finish(); else a.pause(); } catch (e) {}
    }
  });
  await page.waitForTimeout(300);
}

// One extraction of the page as it currently looks, rasters included.
async function pass(page, opts) {
  const data = await page.evaluate(extract, { rootSel: opts.selector, full: !opts.screen });
  // masked subtrees are painted on their own, transparent everywhere else
  const rasters = [];
  (function find(n) { if (n.ras) rasters.push(n); (n.c || []).forEach(find); })(data.root);
  for (const n of rasters) {
    const box = await page.evaluate(id => {
      const el = document.querySelector(`[data-raster="${id}"]`);
      const st = document.createElement('style'); st.id = 'x-iso';
      st.textContent = `*{visibility:hidden!important} [data-raster="${id}"],[data-raster="${id}"] *{visibility:visible!important} html,body{background:transparent!important}`;
      document.head.appendChild(st);
      const r = el.getBoundingClientRect(), H = Math.max(innerHeight, document.documentElement.scrollHeight);
      const x = Math.max(0, r.left), y = Math.max(0, r.top + scrollY);
      return { x, y, w: Math.min(innerWidth, r.right) - x, h: Math.min(H, r.bottom + scrollY) - y };
    }, n.ras);
    const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h }, omitBackground: true, fullPage: !opts.screen });
    await page.evaluate(() => document.getElementById('x-iso').remove());
    n.i = data.images.length;
    data.images.push('data:image/png;base64,' + buf.toString('base64'));
    delete n.ras;
  }
  await page.evaluate(() => document.querySelectorAll('[data-raster]').forEach(e => e.removeAttribute('data-raster')));
  return data;
}

async function convert(browser, file, opts) {
  const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height }, reducedMotion: 'reduce', deviceScaleFactor: 2, colorScheme: opts.themes ? 'dark' : (opts.theme || 'no-preference') });
  const page = await ctx.newPage();
  const url = /^https?:\/\//.test(file) ? file : 'file://' + path.resolve(file);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (!opts.screen) {
    // walk down the page so scroll-triggered reveals fire, then come back up
    await page.evaluate(async () => {
      const step = innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      scrollTo(0, 0);
    });
  }
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;caret-color:transparent!important}' });
  if (opts.themes) await page.evaluate(js => { new Function(js)(); }, opts.darkJs);
  await page.waitForTimeout(opts.themes ? 400 : 0);
  await freeze(page);
  // keys that let the dark and light passes find the same element
  await page.evaluate(() => document.querySelectorAll('*').forEach((e, i) => e.setAttribute('data-x-k', 'k' + i)));
  const dark = await pass(page, opts);
  let light = null;
  if (opts.themes) {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(js => { new Function(js)(); }, opts.lightJs);
    await page.waitForTimeout(600);
    await freeze(page);
    light = await pass(page, opts);
  }
  await ctx.close();
  const toImg = u => { const m = u.match(/^data:([^;]+);base64,(.*)$/s); return m ? { type: m[1], data: m[2] } : null; };
  const bundle = { format: 'html-to-figma@1', name: opts.name || dark.title || path.basename(file), source: path.basename(file), width: dark.root.w, height: dark.root.h, images: dark.images.map(toImg), root: dark.root };
  if (light) {
    bundle.images.push(...light.images.map(toImg));
    bundle.theme = { collection: opts.collection, modes: ['Dark', 'Light'], tokens: mergeTokens(dark.tokens, light.tokens) };
    pairThemes(dark.root, light.root, dark.images.length);
  }
  stripKeys(bundle.root);
  return bundle;
}

const CLEAR = '00000000';
const full = h => (h && h.length === 6 ? h + 'ff' : h || CLEAR);

function mergeTokens(d, l) {
  return Object.keys(d).map(n => ({ n, d: full(d[n]), l: full(l[n] !== undefined ? l[n] : d[n]) }));
}

// Walk the dark tree and record, next to every colour, what the same
// paint looks like in light mode. Missing light paints read as clear.
function pairThemes(dark, light, imgOffset) {
  const byKey = new Map();
  (function index(n) { if (n.k) byKey.set(n.k, n); (n.c || []).forEach(index); })(light);
  const svgColors = s => [...s.matchAll(/#([0-9a-f]{6})\b/gi)].map(m => m[1].toLowerCase());
  const svgShape = s => s.replace(/#[0-9a-f]{6}\b/gi, '#').replace(/(stop-|fill-|stroke-)?opacity="[\d.]+"/g, '');
  const split = list => { list = list || []; return { solid: list.find(p => p.t === 'S'), grads: list.filter(p => 'LRA'.includes(p.t)) }; };
  (function walk(n) {
    const l = byKey.get(n.k);
    if (n.fl) {
      const D = split(n.fl), L = split(l && l.fl);
      if (D.solid) D.solid.l = L.solid ? L.solid.c : CLEAR;
      D.grads.forEach((g, i) => {
        const lg = L.grads[i];
        g.s.forEach((st, j) => { st[2] = lg && lg.s.length === g.s.length ? lg.s[j][1] : (lg ? st[1] : CLEAR); });
      });
    }
    if (n.b) n.b.l = l && l.b ? l.b.c : CLEAR;
    if (n.fx) n.fx.forEach((e, i) => { if (e.c) { const le = l && l.fx && l.fx.filter(x => x.t === e.t)[n.fx.filter(x => x.t === e.t).indexOf(e)]; e.l = le ? le.c : CLEAR; } });
    if (n.t === 'T' && l && l.t === 'T' && l.sg.length === n.sg.length) n.sg.forEach((sg, i) => { sg[2].l = l.sg[i][2].c; });
    if (n.t === 'S' && l && l.t === 'S') {
      if (svgShape(n.svg) === svgShape(l.svg)) {
        const dc = svgColors(n.svg), lc = svgColors(l.svg), vm = {};
        if (dc.length === lc.length) dc.forEach((c, i) => { if (!(c in vm)) vm[c] = lc[i]; });
        n.vm = vm;
      } else n.svgL = l.svg; // the icon itself changes between themes
    }
    if (n.t === 'I' && n.raster && l && l.t === 'I' && l.i >= 0) n.il = l.i + imgOffset;
    (n.c || []).forEach(walk);
  })(dark);
}

function stripKeys(n) { delete n.k; delete n.raster; (n.c || []).forEach(stripKeys); }

if (require.main === module) {
  (async () => {
    const opts = parseArgs(process.argv.slice(2));
    if (!opts.files.length) { console.error('usage: node figma-import/html-to-figma.js page.html [more.html ...] [--width 1440] [--screen --height 900]'); process.exit(1); }
    fs.mkdirSync(opts.out, { recursive: true });
    const browser = await chromium.launch();
    for (const f of opts.files) {
      const t0 = Date.now();
      const bundle = await convert(browser, f, opts);
      const out = path.join(opts.out, path.basename(f).replace(/\.html?$/i, '') + '.figma.json');
      fs.writeFileSync(out, JSON.stringify(bundle));
      console.log(`${out}  ${countNodes(bundle.root)} layers, ${bundle.images.length} images, ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    await browser.close();
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { convert };

function countNodes(n) { return 1 + (n.c || []).reduce((s, k) => s + countNodes(k), 0); }

// ---------------------------------------------------------------- in-page
function extract({ rootSel, full }) {
  const root = rootSel ? document.querySelector(rootSel) : document.documentElement;
  const rr = root.getBoundingClientRect();
  const RW = rootSel ? rr.width : Math.max(document.documentElement.clientWidth, rr.width);
  const RH = rootSel ? rr.height : full ? Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight) : document.documentElement.clientHeight;
  const R = v => Math.round(v * 10) / 10;
  const images = [], imgIdx = new Map();
  let rasterN = 0;
  const addImg = url => { if (!imgIdx.has(url)) { imgIdx.set(url, images.length); images.push(url); } return imgIdx.get(url); };

  // --- colour: normalise anything the browser accepts via a 1px canvas
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const colCache = new Map();
  function color(s) {
    if (!s) return null;
    s = s.trim();
    if (colCache.has(s)) return colCache.get(s);
    let out = null;
    const m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]);
      out = hex(+m[1], +m[2], +m[3], a);
    } else if (s === 'transparent') out = null;
    else {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      out = hex(d[0], d[1], d[2], d[3] / 255);
    }
    colCache.set(s, out);
    return out;
  }
  function hex(r, g, b, a) {
    if (a <= 0.003) return null;
    const h = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return h(r) + h(g) + h(b) + (a < 0.997 ? h(a * 255) : '');
  }

  function splitTop(s, sep = ',') {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === sep && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function splitColorRest(part) {
    // "rgb(1, 2, 3) 40%" -> ["rgb(1, 2, 3)", "40%"]
    if (/^[a-z-]+\(/i.test(part)) {
      let depth = 0;
      for (let i = 0; i < part.length; i++) {
        if (part[i] === '(') depth++;
        if (part[i] === ')') { depth--; if (depth === 0) return [part.slice(0, i + 1), part.slice(i + 1).trim()]; }
      }
    }
    const i = part.indexOf(' ');
    return i < 0 ? [part, ''] : [part.slice(0, i), part.slice(i + 1).trim()];
  }
  const isColorish = p => /^(rgb|rgba|hsl|hsla|#|color\(|oklab|oklch|lab|lch|hwb|transparent|currentcolor|[a-z]+$|[a-z]+\s+[\d.-])/i.test(p) && !/^(to |at |circle|ellipse|closest|farthest|from |in )/i.test(p) && !/^-?[\d.]/.test(p);

  function stops(parts, L) {
    const out = [];
    for (const p of parts) {
      if (/^in /i.test(p)) continue;
      const [c, rest] = splitColorRest(p);
      if (!isColorish(c)) continue; // colour hint, skip
      const poss = rest ? rest.split(/\s+/) : [];
      const toPos = v => v.endsWith('%') ? parseFloat(v) / 100 : v.endsWith('px') ? parseFloat(v) / (L || 1) : parseFloat(v);
      const col = color(c) || '00000000';
      if (poss.length === 0) out.push([null, col]);
      for (const v of poss) out.push([toPos(v), col]);
    }
    if (!out.length) return out;
    if (out[0][0] === null) out[0][0] = 0;
    if (out[out.length - 1][0] === null) out[out.length - 1][0] = 1;
    for (let i = 1; i < out.length; i++) if (out[i][0] !== null && out[i][0] < out[i - 1][0]) out[i][0] = out[i - 1][0];
    for (let i = 0; i < out.length; i++) {
      if (out[i][0] !== null) continue;
      let j = i; while (out[j][0] === null) j++;
      const a = out[i - 1][0], b = out[j][0];
      for (let k = i; k < j; k++) out[k][0] = a + (b - a) * (k - i + 1) / (j - i + 1);
    }
    // Figma needs 0..1; clamp but keep the colour at the edge
    return out.map(([p, c]) => [Math.round(Math.max(0, Math.min(1, p)) * 1000) / 1000, c]);
  }
  function inv(m) { // [a,b,c,d,e,f] = [[a,b,c],[d,e,f]]
    const [a, b, c, d, e, f] = m, det = a * e - b * d;
    if (Math.abs(det) < 1e-9) return [1, 0, 0, 0, 1, 0];
    return [e / det, -b / det, (b * f - c * e) / det, -d / det, a / det, (c * d - a * f) / det].map(v => Math.round(v * 10000) / 10000);
  }
  function lenTo(v, ref) { if (!v) return null; v = v.trim(); if (v.endsWith('%')) return parseFloat(v) / 100 * ref; if (v.endsWith('px')) return parseFloat(v); const n = parseFloat(v); return isNaN(n) ? null : n; }
  function posKw(v, ref) { const k = { left: 0, top: 0, center: .5, right: 1, bottom: 1 }; return v in k ? k[v] * ref : lenTo(v, ref); }

  // gradient in the tile box (tx,ty,tw,th) inside a node of size (w,h)
  function gradient(fn, args, tile, w, h) {
    const parts = splitTop(args);
    const nm = (x, y) => [(tile.x + x) / w, (tile.y + y) / h];
    const tw = tile.w, th = tile.h;
    if (/linear/.test(fn)) {
      let ang = 180;
      const p0 = parts[0];
      if (/^-?[\d.]+(deg|turn|rad|grad)$/.test(p0)) {
        const v = parseFloat(p0);
        ang = p0.endsWith('turn') ? v * 360 : p0.endsWith('rad') ? v * 180 / Math.PI : p0.endsWith('grad') ? v * .9 : v;
        parts.shift();
      } else if (/^to /.test(p0)) {
        const k = p0.slice(3).split(/\s+/).sort().join(' ');
        const map = { top: 0, right: 90, bottom: 180, left: 270 };
        if (k in map) ang = map[k];
        else {
          const dx = k.includes('right') ? 1 : -1, dy = k.includes('bottom') ? 1 : -1;
          // corner-to-corner: perpendicular to the other diagonal
          ang = Math.atan2(dx * th, -dy * tw) * 180 / Math.PI; // angle measured from up, clockwise
          ang = (Math.atan2(dx / tw, -dy / th) * 180 / Math.PI);
        }
        parts.shift();
      }
      const t = ang * Math.PI / 180, sx = Math.sin(t), sy = -Math.cos(t);
      const L = Math.abs(tw * sx) + Math.abs(th * sy);
      const c = [tw / 2, th / 2];
      const a = nm(c[0] - sx * L / 2, c[1] - sy * L / 2), b = nm(c[0] + sx * L / 2, c[1] + sy * L / 2);
      const d = [b[0] - a[0], b[1] - a[1]];
      const n = [(-sy * L) / w, (sx * L) / h];
      const M = [d[0], n[0], a[0] - .5 * n[0], d[1], n[1], a[1] - .5 * n[1]];
      return { t: 'L', m: inv(M), s: stops(parts, L) };
    }
    if (/radial/.test(fn)) {
      let shape = 'ellipse', size = 'farthest-corner', at = [tw / 2, th / 2], rx = null, ry = null;
      if (!isColorish(parts[0]) || /^(circle|ellipse|closest|farthest|at )/.test(parts[0])) {
        const spec = parts.shift();
        const [s1, s2] = spec.split(/\s*\bat\b\s*/);
        if (s2 !== undefined) { const ps = s2.trim().split(/\s+/); at = [posKw(ps[0], tw), posKw(ps[1] || 'center', th)]; }
        const toks = (s1 || '').trim().split(/\s+/).filter(Boolean);
        const lens = [];
        for (const tk of toks) {
          if (tk === 'circle' || tk === 'ellipse') shape = tk;
          else if (/^(closest|farthest)-(side|corner)$/.test(tk)) size = tk;
          else lens.push(tk);
        }
        if (lens.length === 1) { rx = ry = lenTo(lens[0], tw); shape = 'circle'; }
        if (lens.length === 2) { rx = lenTo(lens[0], tw); ry = lenTo(lens[1], th); }
      }
      if (rx === null) {
        const dx = [at[0], tw - at[0]], dy = [at[1], th - at[1]];
        const fx = size.startsWith('closest') ? Math.min(...dx) : Math.max(...dx);
        const fy = size.startsWith('closest') ? Math.min(...dy) : Math.max(...dy);
        if (shape === 'circle') {
          rx = ry = size.endsWith('corner') ? Math.hypot(fx, fy) : (size.startsWith('closest') ? Math.min(fx, fy) : Math.max(fx, fy));
        } else if (size.endsWith('corner')) { rx = fx * Math.SQRT2; ry = fy * Math.SQRT2; }
        else { rx = fx; ry = fy; }
      }
      rx = Math.max(rx, .5); ry = Math.max(ry, .5);
      const c = nm(at[0], at[1]);
      const M = [2 * rx / w, 0, c[0] - rx / w, 0, 2 * ry / h, c[1] - ry / h];
      return { t: 'R', m: inv(M), s: stops(parts, rx) };
    }
    if (/conic/.test(fn)) {
      let from = 0, at = [tw / 2, th / 2];
      if (/^(from|at)\b/.test(parts[0])) {
        const spec = parts.shift();
        const fm = spec.match(/from\s+(-?[\d.]+)(deg|turn)/); if (fm) from = fm[2] === 'turn' ? fm[1] * 360 : +fm[1];
        const am = spec.match(/at\s+(\S+)(?:\s+(\S+))?/); if (am) at = [posKw(am[1], tw), posKw(am[2] || 'center', th)];
      }
      const c = nm(at[0], at[1]);
      const t = (from - 90) * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
      // gradient space (0.5,0.5) -> centre, rotated so 0 sits at CSS "from"
      const sxn = 1, M = [co * sxn, -si, 0, si, co, 0];
      M[2] = c[0] - (M[0] * .5 + M[1] * .5); M[5] = c[1] - (M[3] * .5 + M[4] * .5);
      return { t: 'A', m: inv(M), s: stops(parts, 360) };
    }
    return null;
  }

  function bgPaints(cs, w, h) {
    const out = [];
    const bc = color(cs.backgroundColor);
    if (bc) out.push({ t: 'S', c: bc });
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      const layers = splitTop(bi);
      const sizes = splitTop(cs.backgroundSize), posx = splitTop(cs.backgroundPositionX), posy = splitTop(cs.backgroundPositionY);
      const layerPaints = [];
      layers.forEach((L, i) => {
        const m = L.match(/^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/s);
        const sz = (sizes[i % sizes.length] || 'auto').split(/\s+/);
        if (m) {
          let tw = w, th = h;
          if (sz[0] !== 'auto' && sz[0] !== 'cover' && sz[0] !== 'contain') { tw = lenTo(sz[0], w) || w; th = sz[1] && sz[1] !== 'auto' ? lenTo(sz[1], h) || h : h; }
          const px = posx[i % posx.length] || '0%', py = posy[i % posy.length] || '0%';
          const ox = px.endsWith('%') ? (w - tw) * parseFloat(px) / 100 : lenTo(px, w) || 0;
          const oy = py.endsWith('%') ? (h - th) * parseFloat(py) / 100 : lenTo(py, h) || 0;
          const g = gradient(m[2], m[3], { x: ox, y: oy, w: tw, h: th }, w, h);
          if (g && g.s.length >= 1) layerPaints.push(g);
        } else {
          const u = L.match(/^url\("?(.*?)"?\)$/s);
          if (u && u[1].startsWith('data:image') && !u[1].startsWith('data:image/svg')) {
            layerPaints.push({ t: 'I', i: addImg(u[1]), f: sz[0] === 'contain' ? 'FIT' : 'FILL' });
          }
        }
      });
      out.push(...layerPaints.reverse()); // CSS first layer is on top; Figma last is on top
    }
    return out;
  }

  function shadows(s) {
    if (!s || s === 'none') return [];
    return splitTop(s).map(part => {
      const inset = /\binset\b/.test(part);
      part = part.replace(/\binset\b/, '').trim();
      const cm = part.match(/(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+\([^)]*\))/i);
      const c = cm ? color(cm[1]) : '000000';
      const nums = part.replace(cm ? cm[1] : '', '').trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
      if (!c) return null;
      return { t: inset ? 'IS' : 'DS', c, x: nums[0] || 0, y: nums[1] || 0, r: nums[2] || 0, s: nums[3] || 0 };
    }).filter(Boolean);
  }
  function filters(f, bf) {
    const out = [];
    if (f && f !== 'none') {
      for (const m of f.matchAll(/(drop-shadow|blur)\(((?:[^()]|\([^)]*\))*)\)/g)) {
        if (m[1] === 'blur') out.push({ t: 'LB', r: parseFloat(m[2]) * 2 });
        else { const s = shadows(m[2])[0]; if (s) out.push(s); }
      }
    }
    if (bf && bf !== 'none') { const m = bf.match(/blur\(([\d.]+)px\)/); if (m) out.push({ t: 'BB', r: parseFloat(m[1]) * 2 }); }
    return out;
  }

  function radius(cs, w, h) {
    const one = v => { const p = v.split(' ')[0]; return Math.min(p.endsWith('%') ? parseFloat(p) / 100 * Math.min(w, h) : parseFloat(p) || 0, Math.min(w, h) / 2); };
    const r = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(one).map(R);
    if (r.every(v => v === 0)) return 0;
    return r.every(v => v === r[0]) ? r[0] : r;
  }
  function border(cs) {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => {
      const st = cs['border' + s + 'Style'], w = parseFloat(cs['border' + s + 'Width']) || 0;
      return st === 'none' || st === 'hidden' || w === 0 ? [0, null] : [w, color(cs['border' + s + 'Color'])];
    });
    const lit = sides.filter(s => s[0] > 0 && s[1]);
    if (!lit.length) return null;
    const c = lit[0][1];
    const ws = sides.map(s => (s[1] ? s[0] : 0));
    const dashed = ['Top', 'Right', 'Bottom', 'Left'].some(s => cs['border' + s + 'Style'] === 'dashed');
    return ws.every(v => v === ws[0]) ? { c, w: ws[0], d: dashed ? 1 : 0 } : { c, w: ws, d: dashed ? 1 : 0 };
  }

  const hidden = cs => cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse' || parseFloat(cs.opacity) === 0;
  const clips = cs => cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || (cs.contain || '').includes('paint');

  function rotation(cs) {
    const t = cs.transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const [a, b] = m[1].split(',').map(parseFloat);
    const ang = Math.atan2(b, a) * 180 / Math.PI;
    return Math.abs(ang) < 0.3 ? 0 : R(ang);
  }

  function rectOf(el) { return el.getBoundingClientRect(); }
  const visibleRect = r => r.width > 0.5 && r.height > 0.5 && r.right > 0 && r.bottom > 0 && r.left < RW && r.top < RH;

  // --- text
  const inlineDisplays = new Set(['inline', 'contents']);
  const atomic = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'IFRAME', 'svg', 'PICTURE', 'OBJECT']);
  function hasBox(cs) {
    return !!(color(cs.backgroundColor) || (cs.backgroundImage !== 'none' && !/text/.test(cs.webkitBackgroundClip || cs.backgroundClip)) || border(cs) || (cs.boxShadow && cs.boxShadow !== 'none'));
  }
  function isInlineFlow(node) {
    if (node.nodeType === 3) return true;
    if (node.nodeType !== 1) return true;
    if (node.tagName === 'BR') return true;
    const cs = getComputedStyle(node);
    if (cs.display === 'none') return true;
    if (!inlineDisplays.has(cs.display) || atomic.has(node.tagName) || cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (hasBox(cs)) return false;
    return [...node.childNodes].every(isInlineFlow);
  }
  const hasText = nodes => nodes.some(n => (n.nodeType === 3 ? /\S/.test(n.data) : n.nodeType === 1 && /\S/.test(n.textContent)));

  function fontOf(cs) {
    const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    return { f: fam, w: parseInt(cs.fontWeight) || 400, i: cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique') ? 1 : 0 };
  }
  function segStyle(el) {
    const cs = getComputedStyle(el);
    const f = fontOf(cs);
    const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
    let c = color(fill);
    let grad = null;
    if (/text/.test(cs.webkitBackgroundClip || '') || /text/.test(cs.backgroundClip || '')) {
      const r = rectOf(el);
      grad = bgPaints(cs, r.width, r.height).filter(p => p.t !== 'I');
      if (!grad.length) grad = null;
    }
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const dec = (cs.textDecorationLine || '').includes('underline') ? 'U' : (cs.textDecorationLine || '').includes('line-through') ? 'S' : '';
    const tc = { uppercase: 'U', lowercase: 'L', capitalize: 'T' }[cs.textTransform] || '';
    return { f: f.f, w: f.w, i: f.i, z: parseFloat(cs.fontSize), c, g: grad, ls: R(ls), d: dec, tc, o: 1 };
  }
  function collectSegs(nodes, segs) {
    for (const n of nodes) {
      if (n.nodeType === 3) {
        const pcs = getComputedStyle(n.parentElement);
        let s = n.data;
        if (!/^pre/.test(pcs.whiteSpace) && pcs.whiteSpace !== 'break-spaces') s = s.replace(/[\t\n\r ]+/g, ' ');
        if (s) segs.push({ s, st: segStyle(n.parentElement) });
      } else if (n.nodeType === 1) {
        if (n.tagName === 'BR') { segs.push({ s: '\n', st: null }); continue; }
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        collectSegs([...n.childNodes], segs);
      }
    }
  }
  function textNode(nodes, ownerEl, wholeEl) {
    const segs = [];
    collectSegs(nodes, segs);
    let out = '', ranges = [];
    for (const sg of segs) {
      let s = sg.s;
      if (!out || /[ \n]$/.test(out)) s = s.replace(/^ +/, '');
      if (!s) continue;
      const st = sg.st || (ranges.length ? ranges[ranges.length - 1].st : segStyle(ownerEl));
      ranges.push({ a: out.length, b: out.length + s.length, st });
      out += s;
    }
    const trimmed = out.replace(/[ \n]+$/, '');
    if (!trimmed.trim()) return null;
    ranges = ranges.filter(r => r.a < trimmed.length).map(r => ({ ...r, b: Math.min(r.b, trimmed.length) }));
    // merge equal neighbours
    const merged = [];
    for (const r of ranges) {
      const p = merged[merged.length - 1];
      if (p && JSON.stringify(p.st) === JSON.stringify(r.st)) p.b = r.b; else merged.push({ ...r });
    }
    const range = document.createRange();
    range.setStartBefore(nodes[0]); range.setEndAfter(nodes[nodes.length - 1]);
    const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    const bb = range.getBoundingClientRect();
    const tops = [];
    for (const r of rects) if (!tops.some(t => Math.abs(t - r.top) < 3)) tops.push(r.top);
    const nLines = Math.max(1, tops.length);
    const ocs = getComputedStyle(ownerEl);
    let lh = parseFloat(ocs.lineHeight);
    if (isNaN(lh)) lh = nLines > 1 ? (bb.height / nLines) : bb.height;
    const align = { center: 'C', right: 'R', end: 'R', justify: 'J' }[ocs.textAlign] || 'L';
    const node = { t: 'T', ch: trimmed, sg: merged.map(r => [r.a, r.b, r.st]), lh: R(lh), al: align };
    const blockLines = Math.round((bb.height + (lh - Math.min(lh, bb.height / nLines))) / lh) || nLines;
    const n = Math.max(nLines, 1);
    const contentTop = bb.top + bb.height / 2 - (n * lh) / 2;
    if (n > 1) {
      // wrap at the box the browser wrapped at
      let x = bb.left, w = bb.width;
      if (wholeEl) {
        const er = rectOf(wholeEl), ecs = getComputedStyle(wholeEl);
        const pl = parseFloat(ecs.paddingLeft) + parseFloat(ecs.borderLeftWidth), pr = parseFloat(ecs.paddingRight) + parseFloat(ecs.borderRightWidth);
        x = er.left + pl; w = er.width - pl - pr;
        if (w < bb.width) { x = bb.left; w = bb.width; }
      }
      Object.assign(node, { x, y: contentTop, w: Math.ceil(w) + 2, h: n * lh, wrap: 1 });
    } else {
      Object.assign(node, { x: bb.left, y: contentTop, w: bb.width, h: lh, al: 'L' });
    }
    return node;
  }

  // --- svg
  const svgProps = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'opacity'];
  function svgMarkup(svg, r) {
    const clone = svg.cloneNode(true);
    const origs = [svg, ...svg.querySelectorAll('*')], clones = [clone, ...clone.querySelectorAll('*')];
    const rootColor = '#' + (color(getComputedStyle(svg).color) || '000000').slice(0, 6);
    const shapeTags = /^(path|rect|circle|ellipse|line|polyline|polygon|text|tspan|g|use|svg)$/i;
    for (let i = 0; i < origs.length; i++) {
      const o = origs[i], c = clones[i];
      if (!shapeTags.test(o.tagName)) {
        if (/^stop$/i.test(o.tagName)) {
          const cs = getComputedStyle(o), h = color(cs.stopColor) || '00000000';
          c.setAttribute('stop-color', '#' + h.slice(0, 6));
          const a = (h.length > 6 ? parseInt(h.slice(6), 16) / 255 : 1) * (parseFloat(cs.stopOpacity) || 0);
          if (a !== 1) c.setAttribute('stop-opacity', String(Math.round(a * 1000) / 1000)); else c.removeAttribute('stop-opacity');
          c.removeAttribute('style');
        }
        if (/^foreignObject$/i.test(o.tagName)) c.setAttribute('data-x-remove', '1');
        continue;
      }
      const cs = getComputedStyle(o);
      if (cs.display === 'none' || cs.visibility === 'hidden') { c.setAttribute('data-x-remove', '1'); continue; }
      const DEF = { 'stroke-dasharray': 'none', 'stroke-opacity': '1', 'fill-opacity': '1', 'fill-rule': 'nonzero', 'opacity': '1', 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' };
      let fo = parseFloat(cs.getPropertyValue('fill-opacity')) || 1, so = parseFloat(cs.getPropertyValue('stroke-opacity')) || 1;
      for (const p of svgProps) {
        if (i === 0 && p === 'opacity') continue;
        let v = cs.getPropertyValue(p);
        if (!v) continue;
        c.removeAttribute(p);
        if (DEF[p] === v) continue;
        if (p === 'stroke-width' && cs.stroke === 'none') continue;
        if ((p === 'fill' || p === 'stroke') && v !== 'none' && !v.startsWith('url(')) {
          const h = color(v);
          if (!h) { v = 'none'; }
          else {
            v = '#' + h.slice(0, 6);
            if (h.length > 6) { const a = parseInt(h.slice(6), 16) / 255; if (p === 'fill') fo *= a; else so *= a; }
          }
        }
        if (p === 'fill-opacity') v = String(Math.round(fo * 1000) / 1000);
        if (p === 'stroke-opacity') v = String(Math.round(so * 1000) / 1000);
        if (DEF[p] === v) continue;
        v = v.replace(/url\("?(#[^")]+)"?\)/, 'url($1)');
        c.setAttribute(p, v);
      }
      if (fo !== 1 && !c.hasAttribute('fill-opacity')) c.setAttribute('fill-opacity', String(Math.round(fo * 1000) / 1000));
      if (so !== 1 && !c.hasAttribute('stroke-opacity')) c.setAttribute('stroke-opacity', String(Math.round(so * 1000) / 1000));
      const tr = cs.transform;
      if (i > 0 && tr && tr !== 'none' && !o.getAttribute('transform')) {
        const box = cs.transformBox, org = cs.transformOrigin.split(' ').map(parseFloat);
        // CSS transforms on svg children (rare): apply about transform-origin
        c.setAttribute('transform', `translate(${org[0]} ${org[1]}) ${tr} translate(${-org[0]} ${-org[1]})`);
      }
      c.removeAttribute('class'); c.removeAttribute('style');
    }
    clone.querySelectorAll('[data-x-remove]').forEach(n => n.remove());
    // inline <use>
    const vb = (svg.getAttribute('viewBox') || `0 0 ${r.w} ${r.h}`).split(/[\s,]+/).map(Number);
    for (const u of [...clone.querySelectorAll('use')]) {
      const id = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace(/^#/, '');
      const ref = document.getElementById(id);
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      for (const p of svgProps) if (u.hasAttribute(p)) g.setAttribute(p, u.getAttribute(p));
      if (!ref) { u.replaceWith(g); continue; }
      const ux = parseFloat(u.getAttribute('x') || 0), uy = parseFloat(u.getAttribute('y') || 0);
      let tr = `translate(${ux} ${uy})`;
      let kids;
      if (ref.tagName.toLowerCase() === 'symbol') {
        const svb = ref.getAttribute('viewBox');
        if (svb) {
          const s = svb.split(/[\s,]+/).map(Number);
          const uw = parseFloat(u.getAttribute('width')) || vb[2], uh = parseFloat(u.getAttribute('height')) || vb[3];
          const k = Math.min(uw / s[2], uh / s[3]);
          tr += ` translate(${(uw - s[2] * k) / 2} ${(uh - s[3] * k) / 2}) scale(${k}) translate(${-s[0]} ${-s[1]})`;
        }
        // the symbol's own presentation attributes beat what the <use> inherits
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for (const a of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'opacity']) if (ref.hasAttribute(a)) inner.setAttribute(a, ref.getAttribute(a));
        [...ref.childNodes].forEach(k => inner.appendChild(k.cloneNode(true)));
        kids = [inner];
      } else kids = [ref.cloneNode(true)];
      if (!/^translate\(0 0\)$/.test(tr)) g.setAttribute('transform', tr.replace(/^translate\(0 0\) /, ''));
      kids.forEach(k => g.appendChild(k));
      // defs referenced from the sprite (gradients) travel with it
      u.replaceWith(g);
    }
    // gradients/clipPaths referenced by url(#id) that live outside this svg
    let html = clone.outerHTML;
    const need = new Set([...html.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]));
    const defs = [];
    for (const id of need) {
      if (clone.querySelector('#' + CSS.escape(id))) continue;
      const d = document.getElementById(id);
      if (d) defs.push(d.outerHTML);
    }
    if (defs.length) clone.insertAdjacentHTML('afterbegin', '<defs>' + defs.join('') + '</defs>');
    clone.setAttribute('width', R(r.w)); clone.setAttribute('height', R(r.h));
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${R(r.w)} ${R(r.h)}`);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.removeAttribute('class'); clone.removeAttribute('style');
    for (const a of ['data-x-k', 'data-raster']) { clone.removeAttribute(a); clone.querySelectorAll(`[${a}]`).forEach(n => n.removeAttribute(a)); }
    const refd = new Set([...clone.outerHTML.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(m => m[1] || m[2]));
    clone.querySelectorAll('[id]').forEach(n => { if (!refd.has(n.id)) n.removeAttribute('id'); });
    clone.querySelectorAll('[data-figma-bg-blur-radius]').forEach(n => n.removeAttribute('data-figma-bg-blur-radius'));
    html = clone.outerHTML.replace(/currentColor/gi, rootColor).replace(/<!--[\s\S]*?-->/g, '').replace(/\s{2,}/g, ' ').replace(/>\s+</g, '><');
    return html;
  }

  // --- pseudo-elements with a painted box (absolute ones only)
  function pseudo(el, which, er) {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.content === 'normal' || hidden(cs)) return null;
    if (cs.position !== 'absolute') return null;
    const w = parseFloat(cs.width), h = parseFloat(cs.height);
    if (!(w > 0.5 && h > 0.5)) return null;
    const ecs = getComputedStyle(el);
    let x = er.left + parseFloat(ecs.borderLeftWidth) + (parseFloat(cs.left) || 0);
    let y = er.top + parseFloat(ecs.borderTopWidth) + (parseFloat(cs.top) || 0);
    if (cs.left === 'auto' && cs.right !== 'auto') x = er.right - parseFloat(ecs.borderRightWidth) - parseFloat(cs.right) - w;
    if (cs.top === 'auto' && cs.bottom !== 'auto') y = er.bottom - parseFloat(ecs.borderBottomWidth) - parseFloat(cs.bottom) - h;
    const tm = (cs.transform || '').match(/matrix\(([^)]+)\)/);
    if (tm) { const v = tm[1].split(',').map(parseFloat); x += v[4]; y += v[5]; }
    const fills = bgPaints(cs, w, h), b = border(cs), fx = [...shadows(cs.boxShadow), ...filters(cs.filter, cs.backdropFilter)];
    if (!fills.length && !b && !fx.length) return null;
    const n = { t: 'F', nm: which.replace('::', ''), x, y, w, h, fl: fills };
    const rd = radius(cs, w, h); if (rd) n.r = rd;
    if (b) n.b = b;
    if (fx.length) n.fx = fx;
    if (parseFloat(cs.opacity) < 1) n.op = R(parseFloat(cs.opacity) * 100) / 100;
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') n.bm = cs.mixBlendMode;
    n.z = cs.zIndex === 'auto' ? 0 : +cs.zIndex;
    return n;
  }

  function nameOf(el) {
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/)[0];
    return el.id ? el.id : cls ? cls : el.tagName.toLowerCase();
  }
  function sortKey(cs) {
    const pos = cs.position !== 'static';
    const z = cs.zIndex === 'auto' ? null : +cs.zIndex;
    if (z !== null && (pos || cs.display.includes('flex') || cs.display.includes('grid'))) return z < 0 ? z - 1 : (z > 0 ? 1000 + z : 1);
    return pos ? 1 : 0;
  }

  // Returns a list of [key, node] with absolute coordinates.
  function walk(el, inheritedKey) {
    const cs = getComputedStyle(el);
    if (hidden(cs) && cs.display === 'none') return [];
    if (cs.display === 'none') return [];
    const tag = el.tagName.toUpperCase();
    if (['SCRIPT', 'STYLE', 'HEAD', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'TEMPLATE'].includes(tag)) return [];
    if (cs.visibility === 'hidden' && !el.querySelector('*')) return [];
    const r = rectOf(el);
    const ek = el.getAttribute('data-x-k') || ''; // stable across the dark and light passes
    const key = inheritedKey !== undefined ? inheritedKey : sortKey(cs);
    const opacity = parseFloat(cs.opacity);
    if (opacity === 0) return [];
    const rot = rotation(cs);
    let box = { x: r.left, y: r.top, w: r.width, h: r.height };
    if (rot && el.offsetWidth) { box = { x: r.left + r.width / 2 - el.offsetWidth / 2, y: r.top + r.height / 2 - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight }; }

    const masked = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
    if (masked && !(el instanceof SVGElement)) {
      // masks have no Figma equivalent that survives export: paint this subtree on its own
      if (!visibleRect(r)) return [];
      const id = 'r' + (rasterN++);
      el.setAttribute('data-raster', id);
      const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(RW, r.right), y1 = Math.min(RH, r.bottom);
      return [[key, { t: 'I', k: ek, nm: nameOf(el), x: x0, y: y0, w: x1 - x0, h: y1 - y0, ras: id, raster: 1, fit: 'FILL' }]];
    }
    if (tag === 'SVG') {
      if (!visibleRect(r) || cs.visibility === 'hidden') return [];
      const n = { t: 'S', k: ek, nm: nameOf(el), x: box.x, y: box.y, w: box.w, h: box.h, svg: svgMarkup(el, box) };
      if (rot) n.rot = rot;
      if (opacity < 1) n.op = R(opacity * 100) / 100;
      const fx = filters(cs.filter, 'none'); if (fx.length) n.fx = fx;
      return [[key, n]];
    }
    if (tag === 'IMG' || tag === 'CANVAS') {
      if (!visibleRect(r) || cs.visibility === 'hidden') return [];
      let url = null;
      try { url = tag === 'IMG' ? el.currentSrc || el.src : el.toDataURL('image/png'); } catch (e) {}
      if (!url || !url.startsWith('data:image')) {
        // non-data src: rasterise via canvas
        try { const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight; c.getContext('2d').drawImage(el, 0, 0); url = c.toDataURL('image/png'); } catch (e) { url = null; }
      }
      const fit = cs.objectFit === 'contain' || cs.objectFit === 'scale-down' ? 'FIT' : 'FILL';
      const n = { t: 'I', k: ek, nm: nameOf(el), x: box.x, y: box.y, w: box.w, h: box.h, i: url ? addImg(url) : -1, fit };
      const rd = radius(cs, box.w, box.h); if (rd) n.r = rd;
      if (rot) n.rot = rot;
      if (opacity < 1) n.op = R(opacity * 100) / 100;
      const fx = [...shadows(cs.boxShadow), ...filters(cs.filter, 'none')]; if (fx.length) n.fx = fx;
      return [[key, n]];
    }

    const fills = cs.visibility === 'hidden' ? [] : bgPaints(cs, box.w, box.h);
    const textClip = /text/.test(cs.webkitBackgroundClip || '') || /text/.test(cs.backgroundClip || '');
    const visFills = textClip ? fills.filter(p => p.t === 'S' && false) : fills;
    const b = cs.visibility === 'hidden' ? null : border(cs);
    const fx = cs.visibility === 'hidden' ? [] : [...shadows(cs.boxShadow), ...filters(cs.filter, cs.backdropFilter)];
    const clip = clips(cs) && tag !== 'HTML' && tag !== 'BODY';
    const visual = visFills.length || b || fx.length;
    const stacking = cs.position !== 'static' && cs.zIndex !== 'auto';
    const keepFrame = visual || clip || opacity < 1 || rot || stacking || (cs.mixBlendMode && cs.mixBlendMode !== 'normal') || el === root;

    // children
    const kids = [];
    const childNodes = [...el.childNodes];
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      const val = el.value || el.getAttribute('placeholder') || '';
      if (val && cs.visibility !== 'hidden') {
        const pcs = el.value ? cs : getComputedStyle(el, '::placeholder');
        const st = segStyle(el); st.c = color(pcs.color);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
        const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
        kids.push([0, { t: 'T', k: ek + ':in', ch: val, sg: [[0, val.length, st]], lh: R(lh), al: 'L', x: r.left + pl, y: r.top + r.height / 2 - lh / 2, w: 10, h: lh }]);
      }
    } else {
      const allInline = childNodes.every(isInlineFlow);
      if (allInline && hasText(childNodes) && cs.visibility !== 'hidden') {
        const t = textNode(childNodes, el, el);
        if (t) { t.k = ek + ':t'; kids.push([0, t]); }
      } else {
        let run = [], runN = 0;
        const flush = () => {
          if (run.length && hasText(run)) { const t = textNode(run, el, null); if (t) { t.k = ek + ':r' + (runN++); kids.push([0, t]); } }
          run = [];
        };
        for (const ch of childNodes) {
          if (isInlineFlow(ch)) { if (ch.nodeType === 3 || ch.nodeType === 1) run.push(ch); continue; }
          flush();
          if (ch.nodeType === 1) kids.push(...walk(ch, keepFrame ? undefined : (stacking ? key : undefined)));
        }
        flush();
      }
    }
    if (cs.visibility !== 'hidden') {
      const before = pseudo(el, '::before', r), after = pseudo(el, '::after', r);
      if (before) before.k = ek + ':b';
      if (after) after.k = ek + ':a';
      if (before) kids.unshift([before.z < 0 ? -1 : (before.z > 0 ? 1000 + before.z : 1), before]);
      if (after) kids.push([after.z < 0 ? -1 : (after.z > 0 ? 1000 + after.z : 1), after]);
    }
    kids.forEach(k => { if (k[1].z !== undefined) delete k[1].z; });

    // stable sort by paint order
    const sorted = kids.map((k, i) => [k[0], i, k[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(k => [k[0], k[2]]);

    if (!keepFrame) {
      // groups worth keeping for readability: named containers with several children
      const named = (el.id || (typeof el.className === 'string' && el.className.trim())) && sorted.length >= 2 && visibleRect(r);
      if (!named) return sorted.map(([k, n]) => [inheritedKey !== undefined ? inheritedKey : k, n]);
    }
    if (!visibleRect(r) && !sorted.length) return [];
    if (!visibleRect(r) && !clip) return sorted.map(([k, n]) => [inheritedKey !== undefined ? inheritedKey : k, n]);
    const n = { t: 'F', k: ek, nm: nameOf(el), x: box.x, y: box.y, w: box.w, h: box.h };
    if (visFills.length) n.fl = visFills;
    const rd = radius(cs, box.w, box.h); if (rd) n.r = rd;
    if (b) n.b = b;
    if (fx.length) n.fx = fx;
    if (clip) n.cl = 1;
    if (opacity < 1) n.op = R(opacity * 100) / 100;
    if (rot) n.rot = rot;
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') n.bm = cs.mixBlendMode;
    if (!keepFrame) n.grp = 1;
    n.c = sorted.map(([, c]) => c);
    return [[key, n]];
  }

  // make child coordinates relative to parent, round
  function relativise(n, px, py) {
    const ax = n.x, ay = n.y;
    n.x = R(ax - px); n.y = R(ay - py); n.w = R(n.w); n.h = R(n.h);
    if (n.c) { n.c.forEach(k => relativise(k, ax, ay)); if (!n.c.length) delete n.c; }
    return n;
  }
  const top = walk(root);
  let rootNode = top.length === 1 && top[0][1].t === 'F' ? top[0][1] : { t: 'F', nm: 'page', x: 0, y: 0, w: RW, h: RH, c: top.map(t => t[1]) };
  rootNode.x = rootSel ? rr.left : 0; rootNode.y = rootSel ? rr.top : 0; rootNode.w = RW; rootNode.h = RH; rootNode.cl = 1;
  if (!rootNode.fl || !rootNode.fl.length) {
    const bc = color(getComputedStyle(document.body).backgroundColor) || color(getComputedStyle(document.documentElement).backgroundColor) || 'ffffff';
    rootNode.fl = [{ t: 'S', c: bc }];
  }
  relativise(rootNode, rootNode.x, rootNode.y);
  rootNode.x = 0; rootNode.y = 0;
  // colour tokens: every custom property whose computed value is a colour
  const tokenNames = new Set();
  const scan = rules => {
    for (const rule of rules) {
      if (rule.style) for (let i = 0; i < rule.style.length; i++) if (rule.style[i].startsWith('--')) tokenNames.add(rule.style[i]);
      if (rule.cssRules) scan(rule.cssRules);
    }
  };
  for (const sh of document.styleSheets) { try { scan(sh.cssRules); } catch (e) { /* cross-origin sheet */ } }
  const rootCs = getComputedStyle(document.documentElement);
  const tokens = {};
  for (const name of [...tokenNames].sort()) {
    const v = rootCs.getPropertyValue(name).trim();
    if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|color\(|oklch\(|oklab\(|transparent$)/i.test(v)) tokens[name.slice(2)] = color(v) || '00000000';
  }
  return { root: rootNode, images, title: document.title, tokens };
}
