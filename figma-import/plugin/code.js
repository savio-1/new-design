// Builds editable Figma layers from .figma.json bundles written by
// figma-import/html-to-figma.js. The UI reads the files; this side does
// the drawing, one frame per bundle, placed to the right of the canvas.
figma.showUI(__html__, { width: 360, height: 300 });

// <shared> — also embedded by ../claude-session.js
const BM = { multiply: 'MULTIPLY', screen: 'SCREEN', overlay: 'OVERLAY', darken: 'DARKEN', lighten: 'LIGHTEN', 'color-dodge': 'COLOR_DODGE', 'color-burn': 'COLOR_BURN', 'hard-light': 'HARD_LIGHT', 'soft-light': 'SOFT_LIGHT', difference: 'DIFFERENCE', exclusion: 'EXCLUSION', hue: 'HUE', saturation: 'SATURATION', color: 'COLOR', luminosity: 'LUMINOSITY', 'plus-lighter': 'LINEAR_DODGE' };
const WEIGHT_NAMES = { 100: ['Thin', 'Hairline'], 200: ['ExtraLight', 'Extra Light', 'UltraLight'], 300: ['Light'], 400: ['Regular', 'Normal', 'Book'], 500: ['Medium'], 600: ['SemiBold', 'Semi Bold', 'DemiBold'], 700: ['Bold'], 800: ['ExtraBold', 'Extra Bold', 'Heavy'], 900: ['Black'] };

const rgb = h => ({ r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 });
const al = h => (h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1);

let availableFonts = null;
const fontCache = new Map();
async function resolveFont(family, weight, italic) {
  const key = family + '|' + weight + '|' + italic;
  if (fontCache.has(key)) return fontCache.get(key);
  if (!availableFonts) {
    availableFonts = new Map();
    for (const f of await figma.listAvailableFontsAsync()) {
      if (!availableFonts.has(f.fontName.family)) availableFonts.set(f.fontName.family, []);
      availableFonts.get(f.fontName.family).push(f.fontName.style);
    }
  }
  let fam = availableFonts.has(family) ? family : null;
  if (!fam) {
    const lower = family.toLowerCase();
    for (const k of availableFonts.keys()) if (k.toLowerCase() === lower) { fam = k; break; }
  }
  if (!fam) fam = 'Inter';
  const styles = availableFonts.get(fam) || ['Regular'];
  const order = [100, 200, 300, 400, 500, 600, 700, 800, 900].sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight) || b - a);
  let style = styles.includes('Regular') ? 'Regular' : styles[0];
  search: for (const w of order) {
    for (const nm of WEIGHT_NAMES[w]) {
      const it = nm === 'Regular' || nm === 'Normal' ? 'Italic' : nm + ' Italic';
      if (italic && styles.includes(it)) { style = it; break search; }
      if (styles.includes(nm)) { style = nm; break search; }
    }
  }
  const font = { family: fam, style };
  await figma.loadFontAsync(font);
  fontCache.set(key, font);
  return font;
}

function makeImages(bundle, warnings) {
  return bundle.images.map((img, i) => {
    if (!img) return null;
    try {
      return figma.createImage(figma.base64Decode(img.data)).hash;
    } catch (e) {
      warnings.push(`image ${i} (${img.type}) could not be added: ${e.message}`);
      return null;
    }
  });
}

const full = h => (h && h.length === 6 ? h + 'ff' : h || '00000000');
const rgba = h => Object.assign(rgb(h), { a: al(h) });
const hexOf = c => [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

function tokenPath(n) {
  const m = n.match(/^(backgrounds|strokes|text|shadow|effects|gradient)-(.+)$/);
  if (m) return m[1] + '/' + m[2];
  const p = n.match(/^([a-z]+)-(\d+)$/);
  if (p) return 'palette/' + p[1] + '/' + p[2];
  return 'other/' + n;
}

// Colour variables with one mode per theme. Tokens from the page keep their
// names; any colour no token covers gets a derived variable, so every paint
// on the frame follows the mode switch.
async function themeKit(theme) {
  const V = figma.variables;
  let col = (await V.getLocalVariableCollectionsAsync()).find(c => c.name === theme.collection);
  if (!col) col = V.createVariableCollection(theme.collection);
  if (!col.modes.some(m => m.name === theme.modes[0])) col.renameMode(col.modes[0].modeId, theme.modes[0]);
  for (const name of theme.modes) if (!col.modes.some(m => m.name === name)) col.addMode(name);
  const modeIds = theme.modes.map(name => col.modes.find(m => m.name === name).modeId);
  const existing = new Map();
  for (const id of col.variableIds) { const v = await V.getVariableByIdAsync(id); if (v) existing.set(v.name, v); }
  const upsert = (name, type, values, scopes) => {
    let v = existing.get(name);
    if (!v) { v = V.createVariable(name, col, type); if (scopes) v.scopes = scopes; existing.set(name, v); }
    values.forEach((val, i) => v.setValueForMode(modeIds[i], val));
    return v;
  };
  const byPair = new Map();
  const remember = (key, v) => { if (!byPair.has(key)) byPair.set(key, []); byPair.get(key).push(v); };
  const COLOR_SCOPES = ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
  for (const t of theme.tokens) remember(t.d + '|' + t.l, upsert(tokenPath(t.n), 'COLOR', [rgba(t.d), rgba(t.l)], COLOR_SCOPES));
  const shown = theme.modes.map((name, i) => upsert('mode/is-' + name.toLowerCase(), 'BOOLEAN', theme.modes.map((_, j) => i === j)));
  const PREF = { fill: ['backgrounds/', 'palette/'], stroke: ['strokes/', 'palette/'], text: ['text/', 'palette/'], icon: ['text/', 'strokes/', 'palette/'], effect: ['palette/'] };
  const colorVar = (d, l, role) => {
    d = full(d); l = full(l === undefined || l === null ? d : l);
    const key = d + '|' + l, found = byPair.get(key);
    if (found) {
      for (const pre of PREF[role] || []) { const v = found.find(x => x.name.startsWith(pre)); if (v) return v; }
      return found[0];
    }
    const v = upsert(`derived/${role}/${d}-${l}`, 'COLOR', [rgba(d), rgba(l)], COLOR_SCOPES);
    remember(key, v);
    return v;
  };
  return { col, modeIds, colorVar, shown };
}

function builder(H, fonts, warnings, kit) {
  const V = figma.variables;
  const solid = (c, l, role) => {
    if (!kit) return { type: 'SOLID', color: rgb(c), opacity: al(c) };
    return V.setBoundVariableForPaint({ type: 'SOLID', color: rgb(c), opacity: 1 }, 'color', kit.colorVar(c, l, role));
  };
  const paint = (p, role) => {
    if (p.t === 'S') return solid(p.c, p.l, role);
    if (p.t === 'I') return H[p.i] ? { type: 'IMAGE', imageHash: H[p.i], scaleMode: p.f || 'FILL' } : { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } };
    let s = p.s; if (s.length === 1) s = [s[0], [1, s[0][1], s[0][2]]];
    const m = p.m;
    return { type: { L: 'GRADIENT_LINEAR', R: 'GRADIENT_RADIAL', A: 'GRADIENT_ANGULAR' }[p.t], gradientTransform: [[m[0], m[1], m[2]], [m[3], m[4], m[5]]], gradientStops: s.map(([q, c, l]) => {
      const stop = { position: q, color: rgba(c) };
      if (kit) stop.boundVariables = { color: V.createVariableAlias(kit.colorVar(c, l, role)) };
      return stop;
    }) };
  };
  const eff = e => {
    if (e.t === 'DS' || e.t === 'IS') {
      const out = { type: e.t === 'DS' ? 'DROP_SHADOW' : 'INNER_SHADOW', color: rgba(e.c), offset: { x: e.x, y: e.y }, radius: e.r, spread: e.s, visible: true, blendMode: 'NORMAL' };
      return kit ? V.setBoundVariableForEffect(out, 'color', kit.colorVar(e.c, e.l, 'effect')) : out;
    }
    return { type: e.t === 'LB' ? 'LAYER_BLUR' : 'BACKGROUND_BLUR', radius: e.r, visible: true };
  };
  // vectors from an SVG: bind each solid paint, using the light colour map
  const bindVectors = (node, vm) => {
    if (!kit) return;
    for (const v of node.findAll(x => 'fills' in x)) {
      for (const prop of ['fills', 'strokes']) {
        const list = v[prop];
        if (!Array.isArray(list) || !list.some(pp => pp.type === 'SOLID')) continue;
        v[prop] = list.map(pp => {
          if (pp.type !== 'SOLID') return pp;
          const h = hexOf(pp.color);
          return V.setBoundVariableForPaint(Object.assign({}, pp), 'color', kit.colorVar(h, vm ? vm[h] || h : h, 'icon'));
        });
      }
    }
  };
  const showIn = (node, mode) => { if (kit) node.setBoundVariable('visible', kit.shown[mode]); };
  let count = 0;
  const common = (f, n) => {
    if (n.op !== undefined) f.opacity = n.op;
    if (n.bm && BM[n.bm]) f.blendMode = BM[n.bm];
    if (n.fx) {
      try { f.effects = n.fx.map(eff); } catch (e) {
        try { f.effects = n.fx.map(eff).map(x => { delete x.spread; return x; }); } catch (e2) { warnings.push(`effects on ${n.nm}: ${e2.message}`); }
      }
    }
    if (n.rot) {
      const a = n.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = n.x + n.w / 2, cy = n.y + n.h / 2;
      f.relativeTransform = [[c, -s, cx - (c * n.w / 2 - s * n.h / 2)], [s, c, cy - (s * n.w / 2 + c * n.h / 2)]];
    } else { f.x = n.x; f.y = n.y; }
    count++;
  };
  const radius = (f, r) => {
    if (r === undefined) return;
    if (Array.isArray(r)) { f.topLeftRadius = r[0]; f.topRightRadius = r[1]; f.bottomRightRadius = r[2]; f.bottomLeftRadius = r[3]; } else f.cornerRadius = r;
  };
  function build(n, parent) {
    if (n.t === 'F') {
      const f = figma.createFrame(); parent.appendChild(f); f.name = n.nm;
      f.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
      f.fills = (n.fl || []).map(p => paint(p, 'fill')); f.clipsContent = !!n.cl; radius(f, n.r);
      if (n.b) {
        f.strokes = [solid(n.b.c, n.b.l, 'stroke')]; f.strokeAlign = 'INSIDE';
        if (Array.isArray(n.b.w)) { f.strokeTopWeight = n.b.w[0]; f.strokeRightWeight = n.b.w[1]; f.strokeBottomWeight = n.b.w[2]; f.strokeLeftWeight = n.b.w[3]; } else f.strokeWeight = n.b.w;
        if (n.b.d) f.dashPattern = [4, 4];
      }
      common(f, n);
      (n.c || []).forEach(k => build(k, f));
      return f;
    }
    if (n.t === 'I') {
      const img = (i, name) => {
        const r = figma.createRectangle(); parent.appendChild(r); r.name = name;
        r.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
        r.fills = [i >= 0 && H[i] ? { type: 'IMAGE', imageHash: H[i], scaleMode: n.fit || 'FILL' } : { type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
        radius(r, n.r); common(r, n);
        return r;
      };
      const r = img(n.i, n.nm);
      if (n.il !== undefined && kit) { showIn(r, 0); showIn(img(n.il, n.nm + ' (light)'), 1); }
      return r;
    }
    if (n.t === 'S') {
      let f;
      try { f = figma.createNodeFromSvg(n.svg); } catch (e) {
        warnings.push(`svg ${n.nm}: ${e.message}`);
        f = figma.createFrame(); f.fills = []; f.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
      }
      parent.appendChild(f); f.name = n.nm === 'svg' ? 'icon' : n.nm; f.fills = []; common(f, n);
      bindVectors(f, n.vm);
      if (n.svgL && kit) {
        try {
          const lf = figma.createNodeFromSvg(n.svgL); parent.appendChild(lf); lf.name = f.name + ' (light)'; lf.fills = []; common(lf, n); bindVectors(lf, null);
          showIn(f, 0); showIn(lf, 1);
        } catch (e) { warnings.push(`light svg ${n.nm}: ${e.message}`); }
      }
      return f;
    }
    if (n.t === 'T') {
      const t = figma.createText(); parent.appendChild(t);
      const fontOf = s => fonts.get(s.f + '|' + s.w + '|' + s.i);
      t.fontName = fontOf(n.sg[0][2]);
      t.characters = n.ch;
      for (const [a, b, s] of n.sg) {
        t.setRangeFontName(a, b, fontOf(s)); t.setRangeFontSize(a, b, s.z);
        t.setRangeFills(a, b, s.g ? s.g.map(p => paint(p, 'text')) : s.c ? [solid(s.c, s.l, 'text')] : []);
        if (s.ls) t.setRangeLetterSpacing(a, b, { unit: 'PIXELS', value: s.ls });
        if (s.d) t.setRangeTextDecoration(a, b, s.d === 'U' ? 'UNDERLINE' : 'STRIKETHROUGH');
        if (s.tc) t.setRangeTextCase(a, b, { U: 'UPPER', L: 'LOWER', T: 'TITLE' }[s.tc]);
      }
      t.lineHeight = { unit: 'PIXELS', value: n.lh };
      t.textAlignHorizontal = { L: 'LEFT', C: 'CENTER', R: 'RIGHT', J: 'JUSTIFIED' }[n.al] || 'LEFT';
      if (n.wrap) { t.resize(n.w, n.h); t.textAutoResize = 'HEIGHT'; } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
      common(t, n);
      return t;
    }
    return null;
  }
  return { build, count: () => count };
}

async function importBundle(bundle, x, y, hashes) {
  const warnings = [];
  const H = hashes || makeImages(bundle, warnings);
  const fonts = new Map();
  const want = [];
  (function walk(n) { if (n.t === 'T') n.sg.forEach(([, , s]) => want.push(s)); (n.c || []).forEach(walk); })(bundle.root);
  for (const s of want) {
    const k = s.f + '|' + s.w + '|' + s.i;
    if (!fonts.has(k)) fonts.set(k, await resolveFont(s.f, s.w, s.i));
  }
  const kit = bundle.theme ? await themeKit(bundle.theme) : null;
  const b = builder(H, fonts, warnings, kit);
  const root = Object.assign({}, bundle.root, { nm: bundle.name, x, y });
  const frame = b.build(root, figma.currentPage);
  if (kit) frame.setExplicitVariableModeForCollection(kit.col, kit.modeIds[0]);
  return { frame, layers: b.count(), warnings };
}
// </shared>

figma.ui.onmessage = async msg => {
  if (msg.type !== 'import') return;
  let x = 0;
  const kids = figma.currentPage.children;
  if (kids.length) x = Math.max(...kids.map(k => k.x + k.width)) + 200;
  const made = [];
  for (const bundle of msg.bundles) {
    if (!bundle || bundle.format !== 'html-to-figma@1') { figma.ui.postMessage({ type: 'log', text: 'Skipped a file that is not an html-to-figma bundle.' }); continue; }
    figma.ui.postMessage({ type: 'log', text: `Building “${bundle.name}”…` });
    try {
      const t0 = Date.now();
      const r = await importBundle(bundle, x, 0);
      made.push(r.frame);
      x += r.frame.width + 200;
      figma.ui.postMessage({ type: 'log', text: `✓ ${bundle.name}: ${r.layers} layers in ${((Date.now() - t0) / 1000).toFixed(1)}s` + (r.warnings.length ? ` (${r.warnings.length} warnings)` : '') });
      r.warnings.slice(0, 5).forEach(w => figma.ui.postMessage({ type: 'log', text: '  ⚠ ' + w }));
    } catch (e) {
      figma.ui.postMessage({ type: 'log', text: `✗ ${bundle.name}: ${e.message}` });
    }
  }
  if (made.length) { figma.currentPage.selection = made; figma.viewport.scrollAndZoomIntoView(made); }
  figma.ui.postMessage({ type: 'done' });
};
