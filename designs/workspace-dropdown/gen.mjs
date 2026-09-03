import { writeFileSync } from 'node:fs';

const ws = [
  { n: 'Finance',      l: 'F', c: '#f59e0b', a: 12, s: 4, g: 3, active: true },
  { n: 'Supply Chain', l: 'S', c: '#14b8a6', a: 15, s: 2, g: 5 },
  { n: 'Marketing',    l: 'M', c: '#ec4899', a: 8,  s: 6, g: 2 },
  { n: 'Sales Ops',    l: 'S', c: '#38bdf8', a: 6,  s: 3, g: 4 },
  { n: 'HR',           l: 'H', c: '#8b5cf6', a: 3,  s: 5, g: 0 },
  { n: 'Legal',        l: 'L', c: '#a3e635', a: 1,  s: 2, g: 0 },
];
const tot = w => w.a + w.s + w.g;

const T = { bg: '#0b0b0d', panel: '#16161a', border: '#2a2a30', row: '#1f1f25', t1: '#f2f2f5', t2: '#8b8b96', t3: '#5c5c66', blue: '#3d7bfd' };
const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;

const svg = (d, size = 14, color = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">${d}</svg>`;
const ICO = {
  auto:  '<circle cx="3" cy="8" r="1.5"></circle><circle cx="13" cy="4" r="1.5"></circle><circle cx="13" cy="12" r="1.5"></circle><path d="M4.5 8h3M7.5 8V4h4M7.5 8v4h4"></path>',
  asst:  '<path d="M8 2.5l1.3 3.2L12.5 7l-3.2 1.3L8 11.5 6.7 8.3 3.5 7l3.2-1.3z"></path><path d="M12.5 11l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"></path>',
  agent: '<rect x="3" y="5" width="10" height="8" rx="2"></rect><path d="M8 2.5V5M6 9h.01M10 9h.01M6 11.5h4"></path>',
  check: '<path d="M3.5 8.5l3 3 6-7"></path>',
  chevUp:'<path d="M4 10l4-4 4 4"></path>',
  chevDn:'<path d="M4 6l4 4 4-4"></path>',
  gear:  '<circle cx="8" cy="8" r="2"></circle><path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"></path>',
  sort:  '<path d="M3 4h10M5 8h6M7 12h2"></path>',
};

const avatar = (w, size = 24, fs = 12) =>
  `<div style="width: ${size}px; height: ${size}px; border-radius: ${Math.round(size/4)}px; background: ${w.c}; color: #141416; font-size: ${fs}px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${w.l}</div>`;

const trigger = () => `
<div style="position: absolute; top: 24px; right: 24px; height: 40px; padding: 0 12px 0 10px; border-radius: 10px; background: #1c1c22; border: 1.5px solid ${T.blue}; box-shadow: 0 0 0 3px rgba(61,123,253,0.18); display: flex; align-items: center; gap: 8px; color: ${T.t1}; font-size: 14px; font-weight: 500;">
  ${avatar(ws[0], 20, 11)}
  <span>Finance</span>
  ${svg(ICO.chevUp, 14, T.t2)}
</div>`;

const panelOpen = (width, extraTop = '') => `
<div style="position: absolute; top: 72px; right: 24px; width: ${width}px; background: ${T.panel}; border: 1px solid ${T.border}; border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); overflow: hidden; display: flex; flex-direction: column;">
${extraTop}`;
const panelClose = (footer = true) => `
${footer ? `<div style="border-top: 1px solid ${T.border}; padding: 10px 14px; display: flex; align-items: center; gap: 8px; color: ${T.t2}; font-size: 13px;">${svg(ICO.gear, 14, T.t2)}<span>Manage workspaces</span></div>` : ''}
</div>`;

const shell = (title, body, w, h) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    body { margin: 0; font-family: ${font}; -webkit-font-smoothing: antialiased; }
    a { color: #3d7bfd; } a:hover { color: #6a9bff; }
  </style>
</helmet>
<div style="position: relative; width: ${w}px; height: ${h}px; background: ${T.bg}; color: ${T.t1}; overflow: hidden;">
  <div style="position: absolute; top: 28px; left: 24px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.t3}; font-weight: 600;">${title}</div>
  ${trigger()}
  ${body}
</div>
</x-dc>
</body>
</html>
`;

const rowBase = (w, inner, extra = '') =>
  `<div style="display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 14px; background: ${w.active ? T.row : 'transparent'}; ${extra}">${avatar(w)}${inner}</div>`;

const checkOrSpace = w => w.active ? svg(ICO.check, 14, T.blue) : `<div style="width: 14px; height: 14px;"></div>`;
const num = (v, dimZero = true) => `<span style="font-variant-numeric: tabular-nums; color: ${v === 0 && dimZero ? T.t3 : T.t2};">${v}</span>`;

/* ---------- Option A: Icon counts inline ---------- */
const A = (() => {
  const rows = ws.map(w => rowBase(w, `
    <span style="flex: 1; font-size: 14px; font-weight: 500; color: ${T.t1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${w.n}</span>
    <div style="display: flex; align-items: center; gap: 12px; font-size: 12px;">
      <div style="display: flex; align-items: center; gap: 4px; color: ${w.a === 0 ? T.t3 : T.t2};">${svg(ICO.auto, 13)}${num(w.a)}</div>
      <div style="display: flex; align-items: center; gap: 4px; color: ${w.s === 0 ? T.t3 : T.t2};">${svg(ICO.asst, 13)}${num(w.s)}</div>
      <div style="display: flex; align-items: center; gap: 4px; color: ${w.g === 0 ? T.t3 : T.t2};">${svg(ICO.agent, 13)}${num(w.g)}</div>
    </div>
    ${checkOrSpace(w)}`)).join('\n');
  const body = panelOpen(340) + `<div style="display: flex; flex-direction: column; padding: 6px 0;">${rows}</div>` + panelClose();
  return shell('A · Icon counts inline', body, 480, 500);
})();

/* ---------- Option B: Summary caption under name ---------- */
const B = (() => {
  const rows = ws.map(w => rowBase(w, `
    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;">
      <span style="font-size: 14px; font-weight: 500; color: ${T.t1};">${w.n}</span>
      <span style="font-size: 12px; color: ${T.t2}; font-variant-numeric: tabular-nums;">${w.a} automations · ${w.s} assistants · ${w.g} agents</span>
    </div>
    ${checkOrSpace(w)}`, 'min-height: 52px;')).join('\n');
  const body = panelOpen(372) + `<div style="display: flex; flex-direction: column; padding: 6px 0;">${rows}</div>` + panelClose();
  return shell('B · Caption breakdown', body, 480, 520);
})();

/* ---------- Option C: Compare columns + sort ---------- */
const C = (() => {
  const sorted = [...ws].sort((x, y) => tot(y) - tot(x));
  const col = (v, max) => `<span style="width: 36px; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; color: ${v === 0 ? T.t3 : v === max ? T.t1 : T.t2}; font-weight: ${v === max ? 600 : 400};">${v}</span>`;
  const maxA = Math.max(...ws.map(w => w.a)), maxS = Math.max(...ws.map(w => w.s)), maxG = Math.max(...ws.map(w => w.g));
  const header = `
  <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px 6px 14px;">
    <div style="flex: 1; display: flex; align-items: center; gap: 6px; color: ${T.t2}; font-size: 12px;">${svg(ICO.sort, 13, T.t2)}<span>Most artifacts</span>${svg(ICO.chevDn, 12, T.t3)}</div>
    <div style="display: flex; align-items: center;">
      <div style="width: 36px; display: flex; justify-content: flex-end; color: ${T.t3};">${svg(ICO.auto, 13)}</div>
      <div style="width: 36px; display: flex; justify-content: flex-end; color: ${T.t3};">${svg(ICO.asst, 13)}</div>
      <div style="width: 36px; display: flex; justify-content: flex-end; color: ${T.t3};">${svg(ICO.agent, 13)}</div>
    </div>
    <div style="width: 14px;"></div>
  </div>
  <div style="height: 1px; background: ${T.border}; margin: 0 14px;"></div>`;
  const rows = sorted.map(w => rowBase(w, `
    <span style="flex: 1; font-size: 14px; font-weight: 500; color: ${T.t1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${w.n}</span>
    <div style="display: flex; align-items: center;">${col(w.a, maxA)}${col(w.s, maxS)}${col(w.g, maxG)}</div>
    ${checkOrSpace(w)}`)).join('\n');
  const body = panelOpen(360, header) + `<div style="display: flex; flex-direction: column; padding: 6px 0;">${rows}</div>` + panelClose();
  return shell('C · Compare columns', body, 480, 540);
})();

/* ---------- Option D: Single total + proportion bar, hover reveals detail ---------- */
const D = (() => {
  const CA = '#3d7bfd', CS = '#a78bfa', CG = '#fb923c';
  const bar = w => {
    const t = tot(w) || 1;
    const seg = (v, c) => v ? `<div style="flex: ${v}; background: ${c}; height: 3px; border-radius: 2px;"></div>` : '';
    return `<div style="display: flex; gap: 2px; width: 120px;">${seg(w.a, CA)}${seg(w.s, CS)}${seg(w.g, CG)}</div>`;
  };
  const hoverIdx = 1; // Supply Chain shows the hover state: bar swaps for the labelled split
  const dot = c => `<span style="width: 6px; height: 6px; border-radius: 3px; background: ${c}; flex-shrink: 0;"></span>`;
  const split = w => `<div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: ${T.t2}; font-variant-numeric: tabular-nums; height: 3px; line-height: 3px;">
        <div style="display: flex; align-items: center; gap: 4px;">${dot(CA)}<span>${w.a}</span></div>
        <div style="display: flex; align-items: center; gap: 4px;">${dot(CS)}<span>${w.s}</span></div>
        <div style="display: flex; align-items: center; gap: 4px;">${dot(CG)}<span>${w.g}</span></div>
      </div>`;
  const rows = ws.map((w, i) => {
    const hovered = i === hoverIdx;
    return rowBase(w, `
    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0;">
      <span style="font-size: 14px; font-weight: 500; color: ${T.t1};">${w.n}</span>
      ${hovered ? split(w) : bar(w)}
    </div>
    <span style="font-size: 13px; font-variant-numeric: tabular-nums; color: ${T.t2};">${tot(w)}</span>
    ${checkOrSpace(w)}`, `min-height: 52px;${hovered ? ` background: ${T.row};` : ''}`);
  }).join('\n');
  const legend = `<div style="border-top: 1px solid ${T.border}; padding: 8px 14px; display: flex; align-items: center; gap: 12px; font-size: 11px; color: ${T.t3};">
    <div style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 3px; background: ${CA};"></span>Automations</div>
    <div style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 3px; background: ${CS};"></span>Assistants</div>
    <div style="display: flex; align-items: center; gap: 5px;"><span style="width: 6px; height: 6px; border-radius: 3px; background: ${CG};"></span>Agents</div>
  </div>`;
  const body = panelOpen(320) + `<div style="display: flex; flex-direction: column; padding: 6px 0;">${rows}</div>` + legend + panelClose();
  return shell('D · Total + proportion bar', body, 480, 580);
})();

writeFileSync('Main.dc.html', A);
writeFileSync('OptionB.dc.html', B);
writeFileSync('OptionC.dc.html', C);
writeFileSync('OptionD.dc.html', D);

const canvas = {
  artboards: [
    { file: 'Main.dc.html',    title: 'A · Icon counts inline',    x: 0,    y: 0, w: 480, h: 500 },
    { file: 'OptionB.dc.html', title: 'B · Caption breakdown',     x: 580,  y: 0, w: 480, h: 520 },
    { file: 'OptionC.dc.html', title: 'C · Compare columns',       x: 1160, y: 0, w: 480, h: 540 },
    { file: 'OptionD.dc.html', title: 'D · Total + proportion bar',x: 1740, y: 0, w: 480, h: 580 },
  ],
  annotations: [
    { id: 'note-a', x: 0,    y: 640, w: 480, text: 'A · Icon counts inline\n\nWhy: every number visible in one glance, rows stay one line tall.\nTradeoff: three icon+number pairs per row is the densest of the four; the icons must be learned once.' },
    { id: 'note-b', x: 580,  y: 640, w: 480, text: 'B · Caption breakdown\n\nWhy: plain words, nothing to decode, and the row still reads as a normal workspace switcher. Least "admin dashboard" feeling.\nTradeoff: taller rows and numbers are not column-aligned, so comparing across workspaces takes a little more reading.' },
    { id: 'note-c', x: 1160, y: 640, w: 480, text: 'C · Compare columns\n\nWhy: built for the actual question ("which workspace has the most?"): sorted by total, aligned columns, the top value per column is brighter.\nTradeoff: the header and sort control make it feel like a small table rather than a menu; widest panel.' },
    { id: 'note-d', x: 1740, y: 640, w: 480, text: 'D · Total + proportion bar\n\nWhy: one number per row plus a thin bar showing the mix; exact split only on hover (shown on Supply Chain). Most minimal at rest.\nTradeoff: mix is not readable without hovering, and the bar needs the legend at the bottom.' },
    { id: 'note-data', x: 0, y: 820, w: 700, text: 'Counts shown are sample values for the mockup, not real workspace data. Active workspace (Finance) is highlighted with a check; the trigger shows its open state.' },
  ],
  launch: { view: 'canvas' },
};
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2));
console.log('written');
