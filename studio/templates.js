/* Collage Studio — templates and presets.
   Coordinates are in canvas pixels. Text can be placed by its centre with
   cx / cy; the editor measures the text and resolves x / y on load. */
(function () {
  'use strict';

  const yr = new Date().getFullYear(), mo = new Date().getMonth(), dy = new Date().getDate();
  const txt = (text, o) => Object.assign({ type: 'text', text }, o);
  const stk = (stickerId, x, y, w, h, o = {}) => Object.assign({ type: 'sticker', stickerId, x, y, width: w, height: h }, o);
  const img = (x, y, w, h, o = {}) => Object.assign({ type: 'image', x, y, width: w, height: h }, o);
  const shp = (shape, x, y, w, h, o = {}) => Object.assign({ type: 'shape', shape, x, y, width: w, height: h }, o);
  const nat = (kind, x, y, w, h, o = {}) => Object.assign({ type: 'nature', kind, x, y, width: w, height: h }, o);
  const rib = (path, x, y, w, h, o = {}) => Object.assign({ type: 'ribbon', path, x, y, width: w, height: h }, o);
  const cam = (style, o = {}) => Object.assign({ type: 'camera', style, x: 0, y: 0, width: 1080, height: 1350 }, o);
  const arrow = (x, y, w, h, o = {}) => rib('hook', x, y, w, h, Object.assign({ line: true, thickness: 2.5, color: 'rgba(255,255,255,0.85)', text: '', arrowEnd: true }, o));
  const soft = { on: true, color: '#000000', opacity: 0.22, blur: 30, x: 0, y: 14 };
  const lifted = { on: true, color: '#000000', opacity: 0.3, blur: 14, x: 0, y: 7 };
  const deep = { on: true, color: '#0b1f18', opacity: 0.45, blur: 40, x: 0, y: 22 };
  const grid = (color, size, thick = 1.5) => ({ type: 'grid', color, size, thick, opacity: 1 });
  // a big-head figure: outfit body (neck anchor at 150,18 of 300×520) plus an oversized face slot
  const figure = (id, cx, cy, H, o = {}) => {
    const k = H / 520, bw = 300 * k, bx = cx - bw / 2, by = cy - H / 2;
    const nx = bx + 150 * k, ny = by + 18 * k, hw = bw * 0.66, hh = hw * 1.18;
    return [
      Object.assign({ type: 'sticker', stickerId: id, x: bx, y: by, width: bw, height: H }, o),
      { type: 'image', x: nx - hw / 2, y: ny - hh * 0.92, width: hw, height: hh, rotation: o.rotation || 0, name: 'Face — add a selfie, then Remove background', frame: { style: 'circle', size: 0 }, placeholder: ['#ecd2bb', '#c99d7d'] },
    ];
  };

  const TEMPLATES = [
    {
      id: 'every-shade', name: 'Every Shade', tags: ['Post', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#1f5a4a', pattern: grid('rgba(255,255,255,0.09)', 54), texture: 12 },
        elements: [
          shp('rect', 118, 214, 790, 1010, { rotation: -4, fill: '#e3ddcd', texture: 45, shadow: soft, pattern: { type: 'lined', color: 'rgba(70,90,120,0.16)', size: 34, thick: 1.2, color2: 'rgba(0,0,0,0)' } }),
          shp('rect', 232, 150, 760, 1060, { rotation: 3, fill: '#ece6d8', texture: 40, shadow: soft }),
          shp('rounded', 170, 150, 740, 1060, { radius: 26, fill: '#f4f0e6', texture: 55, shadow: deep }),
          stk('clip-silver', 210, 86, 64, 184, { rotation: -14 }),
          stk('binder-clip', 850, 700, 124, 140, { rotation: 90 }),
          txt('Transit', { cx: 540, cy: 236, fontFamily: 'Instrument Serif', italic: true, fontSize: 30, fill: '#2a2420' }),
          txt('Every', { cx: 470, cy: 452, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 1 }),
          stk('star-chunky', 682, 338, 130, 130, { rotation: 12, colors: ['#4f7f62'] }),
          txt('Shade', { cx: 596, cy: 604, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 0.92, bg: { style: 'select', color: '#cfc9f3', borderColor: '#7b6cf0', padX: 10, padY: 2, gap: 0, borderWidth: 2 } }),
          stk('heart-puffy', 196, 650, 112, 112, { rotation: -14, colors: ['#8c7cf0'] }),
          txt('deserves', { cx: 540, cy: 758, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 1 }),
          txt('Attention', { cx: 540, cy: 912, fontFamily: 'Instrument Serif', fontSize: 178, fill: '#2a2420', lineHeight: 0.92, bg: { style: 'select', color: '#b9d2c2', borderColor: '#1f5a4a', padX: 10, padY: 2, gap: 0, borderWidth: 2 } }),
          txt('Choose what suits you.', { cx: 604, cy: 1036, fontFamily: 'Instrument Serif', fontSize: 44, fill: '#2a2420' }),
          txt('See all colors →', { cx: 440, cy: 1150, rotation: -2, fontFamily: 'Instrument Serif', fontSize: 42, fill: '#2a2420', bg: { style: 'tape', color: '#d8cfba', padX: 36, padY: 14 } }),
        ],
      }),
    },
    {
      id: 'hi-im', name: 'Hi, I’m…', tags: ['Post', 'Profile'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#f3f2ee', pattern: grid('rgba(40,40,40,0.13)', 108, 2) },
        elements: [
          img(250, 110, 600, 740, { frame: { style: 'stamp', color: '#9ab83e', size: 42 }, placeholder: ['#f6dccf', '#e7b29f'], shadow: { on: true, color: '#000000', opacity: 0.12, blur: 20, x: 0, y: 8 } }),
          txt('Hi,\nI’m Emily', { cx: 330, cy: 210, rotation: -5, fontFamily: 'Instrument Serif', fontSize: 104, lineHeight: 0.92, fill: '#2148c0', bg: { style: 'box', color: '#ffa53c', padX: 34, padY: 24, radius: 28 } }),
          txt('Founder &\nCreative Director', { cx: 330, cy: 880, rotation: 3, fontFamily: 'Instrument Serif', fontSize: 82, lineHeight: 0.95, fill: '#2148c0', bg: { style: 'box', color: '#c9b6f2', padX: 34, padY: 20, radius: 28 } }),
          { type: 'badge', x: 748, y: 668, width: 290, height: 290, rotation: -8, fill: '#d7ef5a', textColor: '#2148c0', ringText: '5+ years experience', ringFont: 'Bricolage Grotesque', ringWeight: 500, ringSize: 0.115, ringSpacing: 0.04, ringRadius: 0.7, ringFill: false, ringStart: -40, center: 'asterisk', centerSize: 0.24 },
          stk('sparkle-4', 880, 90, 90, 90, { colors: ['#ffa53c'] }),
        ],
      }),
    },
    {
      id: 'everyday-things', name: 'Everyday things', tags: ['Post', 'Photo'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#56632c' },
        overlay: { grain: 22 },
        elements: [
          img(0, 0, 1080, 1350, { name: 'Background photo', placeholder: ['#7d8a3c', '#4b5823'] }),
          txt('everyday things\nto personalise', { cx: 540, cy: 330, fontFamily: 'Fredoka', fontWeight: 600, fontSize: 98, lineHeight: 0.92, fill: '#f6f27a', shadow: { on: true, color: '#000000', opacity: 0.25, blur: 16, x: 0, y: 4 } }),
          txt('(to make life more fun!)', { cx: 540, cy: 458, fontFamily: 'Space Mono', fontSize: 34, fill: '#f4f1e4' }),
          stk('chalk-loop', -60, 20, 330, 130, { rotation: 32 }),
          stk('chalk-star', 850, 70, 210, 210, { rotation: 14 }),
          stk('chalk-scribble-star', 130, 560, 150, 150, { rotation: -8 }),
          stk('chalk-squiggle', 740, 920, 340, 124, { rotation: -42 }),
        ],
      }),
    },
    {
      id: 'main-character', name: 'Main character', tags: ['Post', 'Collage'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#efe5d9', texture: 25 },
        elements: [
          stk('paper-strip', 420, 150, 600, 162, { rotation: 7, colors: ['#9db38b'] }),
          img(150, 260, 640, 820, { frame: { style: 'polaroid', color: '#ffffff', size: 30, bottom: 3.4 }, placeholder: ['#e9e6e1', '#cfcac2'], shadow: soft }),
          txt('candid', { cx: 470, cy: 1030, fontFamily: 'Young Serif', fontSize: 36, fill: '#2b2a26' }),
          img(724, 392, 270, 330, { rotation: 7, frame: { style: 'border', color: '#f6c4cd', size: 20 }, placeholder: ['#8fb7e3', '#3d6fb8'], shadow: lifted }),
          img(684, 716, 270, 330, { rotation: 7, frame: { style: 'border', color: '#f6c4cd', size: 20 }, placeholder: ['#8fb7e3', '#3d6fb8'], shadow: lifted }),
          txt('main\ncharacter\nenergy', { cx: 300, cy: 236, rotation: -7, fontFamily: 'Leckerli One', fontSize: 92, lineHeight: 0.86, fill: '#2b2a26', bg: { style: 'sticker', color: '#fdf3a2', padX: 24 } }),
          txt('Take control of\nyour story.', { x: 110, y: 760, align: 'left', fontFamily: 'Young Serif', fontSize: 62, lineHeight: 1.05, fill: '#2b2a26', bg: { style: 'lines', color: '#9db38b', padX: 16, padY: 6, gap: 4 } }),
          stk('smiley-doodle', 812, 150, 150, 150, { rotation: 10, colors: ['#2b2a26'] }),
          stk('martini-doodle', 110, 1090, 130, 170, { rotation: -6, colors: ['#2b2a26'] }),
        ],
      }),
    },
    {
      id: 'thrifthaus', name: 'Thrift Haus', tags: ['Post', 'Collage', 'Event'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#0d0d0d' },
        elements: [
          shp('rect', 60, 120, 560, 590, { rotation: -2, fill: '#2f6fed' }),
          txt('AN EVENING\nWITH', { x: 96, y: 160, rotation: -2, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 70, lineHeight: 0.95, fill: '#101010' }),
          txt('ThriftHaus', { x: 90, y: 300, rotation: -2, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 132, fill: '#ffffff' }),
          txt('THRIFTHAUS', { cx: 400, cy: 262, rotation: -6, fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 26, fill: '#101010', bg: { style: 'oval', color: '#ff9ad5', padX: 30, padY: 18 } }),
          txt('20% OFF\nEVERYTHING', { x: 100, y: 540, rotation: -2, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 70, lineHeight: 0.95, fill: '#101010' }),
          stk('cap-doodle', 110, 440, 120, 106, { colors: ['#f6f27a'] }),
          shp('rect', 600, 230, 420, 280, { rotation: 5, fill: '#f06b2c' }),
          txt('NESTLED IN THE HEART OF THE CITY, OUR MODERN THRIFT STORE SERVES AS A VIBRANT HUB WHERE PRE-LOVED GARMENTS ARE GIVEN A SECOND CHANCE AT LIFE.', { x: 632, y: 262, width: 360, autoWidth: false, rotation: 5, align: 'left', fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 25, lineHeight: 1.08, fill: '#101010' }),
          txt('TH', { cx: 930, cy: 128, rotation: 8, fontFamily: 'Instrument Serif', italic: true, fontSize: 92, fill: '#101010', bg: { style: 'scallop', color: '#9b8cf2', padX: 44, padY: 52 } }),
          stk('sun-doodle', 880, 520, 150, 150, { colors: ['#2fb84a'] }),
          img(560, 600, 470, 470, { rotation: 4, placeholder: ['#bcd8f2', '#6aa3d8'] }),
          txt('ThriftHaus', { cx: 800, cy: 760, rotation: 4, fontFamily: 'Instrument Serif', italic: true, fontSize: 100, fill: '#ffffff', opacity: 0.92 }),
          img(70, 780, 430, 470, { rotation: -3, placeholder: ['#a9cbe8', '#e9d7b6'] }),
          txt('TH', { cx: 160, cy: 820, fontFamily: 'Instrument Serif', italic: true, fontSize: 52, fill: '#101010', bg: { style: 'scallop', color: '#f6f27a', padX: 28, padY: 32 } }),
          stk('flower-doodle', 470, 1010, 140, 140, { colors: ['#101010'] }),
          txt('THANK YOU', { cx: 410, cy: 1230, rotation: -3, fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 58, fill: '#101010', bg: { style: 'box', color: '#f4f06a', padX: 30, padY: 14 } }),
          txt('THRIFTHAUS', { cx: 830, cy: 1180, rotation: -4, fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 46, fill: '#101010', bg: { style: 'oval', color: '#ff9ad5', padX: 54, padY: 34 } }),
          stk('cap-doodle', 30, 1170, 160, 140, { rotation: -10, colors: ['#ff6a2a'] }),
        ],
      }),
    },
    {
      id: 'monthly-planner', name: 'Monthly planner', tags: ['Planner', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#e9e2d3', pattern: { type: 'dots', color: 'rgba(0,0,0,0.18)', size: 36, thick: 1.6 }, texture: 30 },
        elements: [
          shp('rounded', 70, 120, 940, 900, { radius: 24, fill: '#fffdf7', texture: 40, shadow: soft }),
          { type: 'calendar', x: 110, y: 160, width: 860, height: 820, year: yr, month: mo, marked: [dy, Math.min(dy + 5, 27), Math.max(dy - 6, 2)], markStyle: 'scribble', accent: '#e4572e', lineColor: 'rgba(29,27,24,0.14)', titleFont: 'Instrument Serif', titleSize: 0.19, bodyFont: 'DM Sans', bodyWeight: 500, weekendAccent: true },
          stk('washi-stripes', 10, 120, 250, 66, { rotation: -32, colors: ['#f6a5c0', '#ffffff'] }),
          stk('washi-dots', 820, 108, 250, 66, { rotation: 30, colors: ['#9ad1f5', '#ffffff'] }),
          txt('this month', { x: 120, y: 1058, align: 'left', fontFamily: 'Caveat', fontWeight: 700, fontSize: 56, fill: '#e4572e' }),
          { type: 'checklist', x: 120, y: 1128, width: 520, fontFamily: 'Caveat', fontSize: 44, lineHeight: 1.45, items: '[x] Plan the shoot\n[ ] Book the studio\n[ ] Post every Friday' },
          stk('sticky-note', 700, 1060, 270, 250, { rotation: 4, colors: ['#d7ef5a'], shadow: lifted }),
          txt('don’t forget\nto rest ♡', { cx: 835, cy: 1180, rotation: 4, fontFamily: 'Caveat', fontWeight: 700, fontSize: 50, lineHeight: 1, fill: '#1d1b18' }),
          stk('push-pin', 800, 1036, 70, 88, { colors: ['#e4572e'] }),
        ],
      }),
    },
    {
      id: 'save-the-date', name: 'Save the date', tags: ['Event', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f4eee3', texture: 45 },
        elements: [
          txt('Save the Date', { cx: 540, cy: 200, fontFamily: 'Great Vibes', fontSize: 150, fill: '#3d4a2f' }),
          txt('ANNA  &  LEO', { cx: 540, cy: 345, fontFamily: 'Cormorant Garamond', fontWeight: 600, fontSize: 46, letterSpacing: 0.32, fill: '#3d4a2f' }),
          img(290, 420, 500, 600, { frame: { style: 'arch', size: 0 }, placeholder: ['#d8e4d2', '#9fb68f'] }),
          shp('arch', 270, 400, 540, 640, { fill: 'transparent', stroke: '#3d4a2f', strokeWidth: 2 }),
          txt('14 · 02 · 2027', { cx: 540, cy: 1110, fontFamily: 'Cormorant Garamond', fontWeight: 500, fontSize: 64, letterSpacing: 0.08, fill: '#3d4a2f' }),
          txt('Lisbon, Portugal — invitation to follow', { cx: 540, cy: 1190, fontFamily: 'Cormorant Garamond', italic: true, fontSize: 36, fill: '#3d4a2f' }),
          stk('sparkles-cluster', 800, 400, 150, 150, { colors: ['#c9a74a'] }),
          stk('heart-doodle', 170, 900, 110, 110, { rotation: -12, colors: ['#c96f5f'] }),
        ],
      }),
    },
    {
      id: 'big-sale', name: 'Big sale', tags: ['Sale', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f7d046', pattern: { type: 'diagonal', color: 'rgba(29,27,24,0.07)', size: 60 } },
        elements: [
          txt('BIG\nSALE', { cx: 470, cy: 400, fontFamily: 'Anton', fontSize: 330, lineHeight: 0.86, fill: '#1d1b18' }),
          txt('50%\nOFF', { cx: 840, cy: 250, rotation: 12, fontFamily: 'Archivo Black', fontSize: 78, lineHeight: 0.9, fill: '#ffffff', bg: { style: 'burst', color: '#f2542d', padX: 74, padY: 74 } }),
          txt('THIS WEEKEND ONLY', { cx: 470, cy: 725, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 36, letterSpacing: 0.12, fill: '#f7d046', bg: { style: 'pill', color: '#1d1b18', padX: 40, padY: 18 } }),
          img(250, 820, 580, 430, { frame: { style: 'rounded', radius: 36, size: 0 }, placeholder: ['#ffe9a8', '#f0b44a'], shadow: { on: true, color: '#1d1b18', opacity: 1, blur: 0, x: 14, y: 14 } }),
          stk('arrow-loopy', 30, 760, 240, 150, { rotation: 25, colors: ['#1d1b18'] }),
          stk('sparkles-cluster', 840, 760, 160, 160, { colors: ['#1d1b18'] }),
          stk('shopping-bag', 790, 1010, 170, 208, { rotation: 10, colors: ['#ff9ad5', '#f2542d'] }),
          txt('shop.yourstore.com', { cx: 540, cy: 1300, fontFamily: 'Space Mono', fontSize: 28, fill: '#1d1b18' }),
        ],
      }),
    },
    {
      id: 'quote-card', name: 'Quote card', tags: ['Quote', 'Post'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#efe6d2', texture: 55 },
        elements: [
          stk('quotes-doodle', 110, 150, 230, 126, { colors: ['#c45a3b'] }),
          txt('Bloom where\nyou are\nplanted.', { x: 110, y: 320, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 140, lineHeight: 0.95, fill: '#2a2420' }),
          stk('underline-swoosh', 110, 750, 420, 120, { colors: ['#c45a3b'] }),
          txt('— Mary Engelbreit', { x: 120, y: 880, align: 'left', fontFamily: 'Space Mono', fontSize: 30, fill: '#2a2420' }),
          stk('flower-doodle', 760, 640, 220, 220, { rotation: 12, colors: ['#2f5d50'] }),
          stk('daisy', 860, 140, 120, 120, { colors: ['#ffffff', '#f6c445'] }),
        ],
      }),
    },
    {
      id: 'open-studio', name: 'Retro event', tags: ['Event', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#ffefd6', pattern: { type: 'waves', color: 'rgba(255,138,61,0.25)', size: 80, thick: 5 }, texture: 20 },
        elements: [
          stk('sun-70s', 90, 900, 900, 504, { colors: ['#ffcf3f', '#ff9640', '#ff5e5b'] }),
          txt('friday nights · 7pm · free', { cx: 540, cy: 210, fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 52, uppercase: true, letterSpacing: 0.1, curve: 32, fill: '#1d1b18' }),
          txt('OPEN\nSTUDIO', { cx: 530, cy: 560, fontFamily: 'Shrikhand', fontSize: 190, lineHeight: 0.92, fill: '#ff5e5b', stroke: { width: 5, color: '#1d1b18' }, echo: { on: true, color: '#1d1b18', dx: 0.05, dy: 0.06, steps: 12 } }),
          { type: 'badge', x: 790, y: 740, width: 230, height: 230, rotation: 14, shape: 'burst', fill: '#7c5cff', textColor: '#ffffff', ringText: 'bring a friend · ', ringRepeat: true, ringSep: '', ringFont: 'Space Mono', ringWeight: 700, ringRadius: 0.66, ringSize: 0.085, center: 'text', centerText: 'FREE', centerFont: 'Shrikhand', centerWeight: 400, centerSize: 0.22, centerColor: '#ffffff' },
          stk('peace', 90, 760, 150, 150, { rotation: -14, colors: ['#2bb3a3'] }),
          txt('123 Maker Lane', { cx: 540, cy: 860, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 32, fill: '#1d1b18' }),
        ],
      }),
    },
    {
      id: 'photo-dump', name: 'Photo dump', tags: ['Collage', 'Photo', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f3efe6', pattern: { type: 'grid', color: 'rgba(0,0,0,0.08)', size: 54, thick: 1.2 }, texture: 30 },
        elements: [
          txt('weekend dump', { cx: 540, cy: 130, rotation: -2, fontFamily: 'Permanent Marker', fontSize: 92, fill: '#1d1b18' }),
          img(80, 250, 460, 540, { rotation: -6, frame: { style: 'polaroid', color: '#ffffff', size: 24, bottom: 3.6 }, placeholder: ['#f3d9d0', '#e3b4a6'], shadow: soft }),
          img(560, 220, 440, 520, { rotation: 5, frame: { style: 'polaroid', color: '#ffffff', size: 24, bottom: 3.6 }, placeholder: ['#d8e4d2', '#b4c9aa'], shadow: soft }),
          img(300, 700, 480, 560, { rotation: -1, frame: { style: 'polaroid', color: '#ffffff', size: 24, bottom: 3.6 }, placeholder: ['#dad6ef', '#b9b2de'], shadow: soft }),
          stk('washi-plain', 200, 236, 200, 54, { rotation: -16, colors: ['#f6a5c0'] }),
          stk('washi-grid', 700, 200, 200, 54, { rotation: 12, colors: ['#b9e4c9', '#4f9d69'] }),
          stk('tape-masking', 440, 680, 200, 54, { rotation: -3 }),
          txt('sunday market', { cx: 300, cy: 740, rotation: -6, fontFamily: 'Caveat', fontWeight: 600, fontSize: 44, fill: '#1d1b18' }),
          txt('golden hour ☼', { cx: 780, cy: 700, rotation: 5, fontFamily: 'Caveat', fontWeight: 600, fontSize: 44, fill: '#1d1b18' }),
          txt('us, obviously', { cx: 540, cy: 1200, rotation: -1, fontFamily: 'Caveat', fontWeight: 600, fontSize: 48, fill: '#1d1b18' }),
          stk('heart-doodle', 880, 900, 120, 120, { rotation: 12, colors: ['#ff4f8b'] }),
          stk('sparkles-cluster', 90, 940, 140, 140, { colors: ['#ffb000'] }),
        ],
      }),
    },
    {
      id: 'mood-board', name: 'Mood board', tags: ['Collage', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f6f1e7', texture: 30 },
        elements: [
          txt('mood board', { x: 70, y: 70, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 120, fill: '#2a2420' }),
          txt('AW 26 — QUIET LUXURY', { x: 76, y: 210, align: 'left', fontFamily: 'Space Mono', fontSize: 24, letterSpacing: 0.12, fill: '#2a2420' }),
          img(70, 290, 520, 640, { placeholder: ['#d9c9b0', '#a88f6c'] }),
          img(620, 110, 390, 380, { placeholder: ['#c7c2b8', '#8d877c'] }),
          img(620, 520, 390, 410, { frame: { style: 'arch', size: 0 }, placeholder: ['#e3d5c3', '#b9a283'] }),
          img(70, 960, 330, 320, { placeholder: ['#b8b09d', '#7f7764'] }),
          img(430, 960, 300, 320, { frame: { style: 'circle', size: 0 }, placeholder: ['#efe2d0', '#cdb396'] }),
          ...[['#e8dccb', 'Oat'], ['#a88f6c', 'Camel'], ['#5c5346', 'Bark'], ['#2a2420', 'Ink']].map(([c, n], i) => [
            shp('ellipse', 770 + (i % 2) * 130, 980 + Math.floor(i / 2) * 160, 100, 100, { fill: c, stroke: 'rgba(0,0,0,0.12)', strokeWidth: 1.5 }),
            txt(n + '\n' + c.toUpperCase(), { cx: 820 + (i % 2) * 130, cy: 1112 + Math.floor(i / 2) * 160, fontFamily: 'Space Mono', fontSize: 15, lineHeight: 1.2, fill: '#2a2420' }),
          ]).flat(),
          stk('clip-gold', 560, 260, 54, 156, { rotation: 10 }),
        ],
      }),
    },
    {
      id: 'story-new-post', name: 'New post story', tags: ['Story'], width: 1080, height: 1920,
      build: () => ({
        width: 1080, height: 1920,
        background: { color: '#f2edff', color2: '#c9b6f2', gradient: 'radial' },
        overlay: { grain: 15 },
        elements: [
          txt('NEW POST', { cx: 540, cy: 330, fontFamily: 'Unbounded', fontWeight: 900, fontSize: 132, fill: '#5b4cf5', fill2: '#ff7ab6', gradient: 'linear', gradAngle: 90 }),
          txt('fresh on the feed ✦', { cx: 540, cy: 450, fontFamily: 'Instrument Serif', italic: true, fontSize: 64, fill: '#3b2f6b' }),
          img(190, 560, 700, 900, { frame: { style: 'arch', size: 0 }, placeholder: ['#ffffff', '#d9cff7'], shadow: soft }),
          stk('star-8-gradient', 790, 500, 200, 200, { rotation: 12 }),
          stk('chrome-sparkle', 120, 1320, 160, 160),
          stk('arrow-curved', 660, 1490, 200, 180, { rotation: 30, colors: ['#3b2f6b'] }),
          txt('tap to see more', { cx: 540, cy: 1720, fontFamily: 'Gochi Hand', fontSize: 70, fill: '#3b2f6b', bg: { style: 'pill', color: '#ffffff', padX: 46, padY: 18 } }),
        ],
      }),
    },
    {
      id: 'admit-one', name: 'Film club ticket', tags: ['Event', 'Post'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#1d1b18' },
        overlay: { grain: 30, vignette: 25 },
        elements: [
          shp('ticket', 110, 300, 860, 480, { rotation: -6, radius: 26, fill: '#ff8a5c', texture: 35, shadow: deep }),
          shp('line', 640, 310, 460, 30, { rotation: 84, stroke: 'rgba(29,27,24,0.55)', strokeWidth: 4, dash: 1.5 }),
          txt('FILM CLUB', { x: 170, y: 390, rotation: -6, align: 'left', fontFamily: 'Rye', fontSize: 78, fill: '#1d1b18' }),
          txt('Friday 8PM\nRooftop cinema', { x: 182, y: 520, rotation: -6, align: 'left', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 40, lineHeight: 1.2, fill: '#1d1b18' }),
          txt('ADMIT\nONE', { cx: 858, cy: 468, rotation: -96, fontFamily: 'Anton', fontSize: 74, lineHeight: 0.9, letterSpacing: 0.05, fill: '#1d1b18' }),
          txt('Nº 0042', { x: 186, y: 668, rotation: -6, align: 'left', fontFamily: 'Space Mono', fontSize: 26, fill: '#1d1b18' }),
          stk('film-strip', 640, 40, 300, 163, { rotation: 12, colors: ['#f6f1e7'] }),
          txt('popcorn provided', { cx: 540, cy: 930, fontFamily: 'Caveat', fontWeight: 700, fontSize: 60, fill: '#f6f1e7' }),
          stk('arrow-loopy', 160, 820, 220, 136, { rotation: -30, colors: ['#f6f1e7'] }),
        ],
      }),
    },
    {
      id: 'cafe-menu', name: 'Café chalkboard', tags: ['Post', 'Event'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#22362c', texture: 0 },
        overlay: { grain: 40, vignette: 35 },
        elements: [
          txt('today’s menu', { cx: 540, cy: 170, fontFamily: 'Covered By Your Grace', fontSize: 130, fill: '#f6f1e7' }),
          stk('chalk-squiggle', 380, 250, 320, 116, { colors: ['#f7d046'] }),
          txt('flat white ............ 3.8\noat latte .............. 4.2\nmatcha ................. 4.5\nlemon cake ............. 3.9\ncinnamon bun .......... 3.6', { x: 150, y: 430, align: 'left', fontFamily: 'Gaegu', fontWeight: 700, fontSize: 54, lineHeight: 1.55, fill: '#f6f1e7' }),
          stk('coffee-cup', 800, 900, 180, 222, { rotation: 8 }),
          stk('lemon-slice', 130, 990, 160, 160, { rotation: -18 }),
          stk('chalk-heart', 860, 330, 120, 120, { rotation: 14 }),
          txt('open 8 – 4 · every day', { cx: 540, cy: 1240, fontFamily: 'Space Mono', fontSize: 32, fill: '#f6f1e7', opacity: 0.85 }),
        ],
      }),
    },
    {
      id: 'birthday', name: 'Happy birthday', tags: ['Event', 'Post'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#ffd6e0', pattern: { type: 'polka', color: '#ffffff', size: 110 } },
        elements: [
          txt('happy\nbirthday', { cx: 540, cy: 400, rotation: -4, fontFamily: 'Bagel Fat One', fontSize: 190, lineHeight: 0.88, fill: '#ff4f79', stroke: { width: 6, color: '#ffffff' }, echo: { on: true, color: '#7a1f3d', dx: 0.03, dy: 0.04, steps: 6 } }),
          txt('to the best human ever', { cx: 540, cy: 700, rotation: 2, fontFamily: 'Instrument Serif', italic: true, fontSize: 56, fill: '#7a1f3d', bg: { style: 'tape', color: '#fff6b0', padX: 40, padY: 16 } }),
          stk('cake', 340, 790, 400, 400),
          stk('balloon', 80, 760, 150, 257, { rotation: -10, colors: ['#5b4cf5'] }),
          stk('balloon', 850, 700, 150, 257, { rotation: 8, colors: ['#f7d046'] }),
          stk('balloon', 900, 860, 130, 223, { rotation: 14 }),
          stk('sparkles-cluster', 80, 110, 170, 170, { colors: ['#ffffff'] }),
          stk('plus-cluster', 860, 100, 160, 160, { colors: ['#5b4cf5'] }),
          stk('sparkle-4', 760, 1180, 100, 100, { colors: ['#ffffff'] }),
        ],
      }),
    },
    {
      id: 'y2k', name: 'Y2K vibes', tags: ['Post', 'Collage'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#d7f0ff', color2: '#ffc6ef', gradient: 'linear', angle: 160 },
        overlay: { grain: 14 },
        elements: [
          stk('holo-blob', 120, 260, 840, 840, { opacity: 0.85 }),
          img(270, 380, 540, 600, { frame: { style: 'squircle', size: 0 }, placeholder: ['#ffffff', '#e2d6ff'], outline: { on: false } }),
          txt('it’s a vibe', { cx: 540, cy: 200, fontFamily: 'Rubik Bubbles', fontSize: 150, fill: '#ff4fd8', stroke: { width: 4, color: '#ffffff' } }),
          stk('chrome-star', 800, 330, 200, 200, { rotation: 12 }),
          stk('butterfly-chrome', 90, 830, 250, 205, { rotation: -14 }),
          stk('y2k-flower', 820, 900, 180, 180, { colors: ['#b48cff', '#fff36b'] }),
          stk('lips', 120, 360, 170, 100, { rotation: -16 }),
          txt('★ 2000 forever ★', { cx: 540, cy: 1130, fontFamily: 'Syncopate', fontWeight: 700, fontSize: 40, letterSpacing: 0.1, fill: '#5b4cf5' }),
          stk('chrome-heart', 460, 1180, 160, 160),
        ],
      }),
    },
    {
      id: 'weekly-story', name: 'This week', tags: ['Story', 'Planner'], width: 1080, height: 1920,
      build: () => ({
        width: 1080, height: 1920,
        background: { color: '#fbf8f1', pattern: { type: 'lined', color: 'rgba(70,110,160,0.22)', size: 60, thick: 1.5 }, texture: 30 },
        elements: [
          txt('this week', { x: 180, y: 160, align: 'left', fontFamily: 'Instrument Serif', italic: true, fontSize: 170, fill: '#1d1b18' }),
          { type: 'calendar', layout: 'strip', x: 90, y: 420, width: 900, height: 300, year: yr, month: mo, day: dy, accent: '#5b4cf5', cellColor: '#efe9fb', titleFont: 'Instrument Serif', bodyFont: 'Instrument Sans', titleAlign: 'left' },
          txt('priorities', { x: 180, y: 800, align: 'left', fontFamily: 'Caveat', fontWeight: 700, fontSize: 64, fill: '#5b4cf5' }),
          { type: 'checklist', x: 180, y: 900, width: 700, fontFamily: 'Caveat', fontSize: 56, lineHeight: 1.5, boxStyle: 'round', items: '[x] Finish the brand deck\n[ ] Shoot product flat-lays\n[ ] Reply to emails\n[ ] Yoga ×3' },
          stk('sticky-note', 590, 1340, 380, 360, { rotation: 5, colors: ['#ffe680'], shadow: lifted }),
          txt('notes:\ndrink more\nwater!!', { x: 640, y: 1410, rotation: 5, align: 'left', fontFamily: 'Gochi Hand', fontSize: 56, lineHeight: 1.1, fill: '#1d1b18' }),
          { type: 'calendar', layout: 'page', x: 130, y: 1350, width: 360, height: 430, rotation: -4, year: yr, month: mo, day: dy, accent: '#e4572e', monthCase: 'upper', titleSpacing: 0.12, shadow: lifted },
          stk('washi-dots', 230, 1320, 180, 48, { rotation: -10, colors: ['#ffd166', '#ffffff'] }),
          stk('clip-plastic', 900, 1300, 50, 143, { rotation: 8, colors: ['#5b4cf5'] }),
        ],
      }),
    },
    {
      id: 'testimonial', name: 'Review card', tags: ['Quote', 'Post'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#c9b6f2', pattern: { type: 'plus', color: 'rgba(255,255,255,0.45)', size: 70, thick: 2 } },
        elements: [
          shp('rounded', 110, 170, 860, 740, { radius: 40, fill: '#fffdf7', shadow: { on: true, color: '#3b2f6b', opacity: 1, blur: 0, x: 16, y: 16 }, stroke: '#3b2f6b', strokeWidth: 4 }),
          ...[0, 1, 2, 3, 4].map(i => stk('star-chunky', 330 + i * 86, 230, 74, 74, { colors: ['#ffb547'] })),
          txt('“Honestly the best\nlatte in the city —\nand the people are\neven better.”', { cx: 540, cy: 520, fontFamily: 'DM Serif Display', fontSize: 64, lineHeight: 1.12, fill: '#1d1b18' }),
          img(330, 740, 110, 110, { frame: { style: 'circle', size: 0 }, placeholder: ['#f6dccf', '#e7b29f'] }),
          txt('Maya R.\nregular since 2021', { x: 466, y: 752, align: 'left', fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 32, lineHeight: 1.25, fill: '#1d1b18' }),
          stk('sparkle-4', 860, 90, 120, 120, { colors: ['#ffffff'] }),
          stk('heart-puffy', 90, 860, 130, 130, { rotation: -12, colors: ['#ff7ab6'] }),
        ],
      }),
    },
    {
      id: 'coming-soon', name: 'Coming soon', tags: ['Post', 'Event'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#151413' },
        overlay: { grain: 35, vignette: 30 },
        elements: [
          stk('blob-1', -120, -60, 560, 560, { colors: ['#5b4cf5'], opacity: 0.9 }),
          stk('blob-3', 640, 920, 560, 560, { colors: ['#ff8a3d'], opacity: 0.9 }),
          txt('coming\nsoon', { cx: 540, cy: 600, fontFamily: 'Instrument Serif', italic: true, fontSize: 280, lineHeight: 0.82, fill: '#f6f1e7' }),
          stk('circle-scribble', 230, 330, 640, 436, { rotation: -4, colors: ['#d7ef5a'] }),
          txt('something new is brewing', { cx: 540, cy: 960, fontFamily: 'Space Mono', fontSize: 34, letterSpacing: 0.06, fill: '#f6f1e7' }),
          txt('01 . 11', { cx: 540, cy: 1060, fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 70, fill: '#151413', bg: { style: 'pill', color: '#d7ef5a', padX: 44, padY: 14 } }),
          stk('sparkles-cluster', 820, 160, 160, 160, { colors: ['#f6f1e7'] }),
        ],
      }),
    },
    {
      id: 'estilos', name: 'Halftone duo', tags: ['Post', 'Collage', 'Photo'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f2418c' },
        overlay: { creases: 55, paper: 22, grain: 14 },
        elements: [
          txt('Ryane  |  Designer Gráfico 2026', { cx: 540, cy: 70, fontFamily: 'Poppins', fontWeight: 600, fontSize: 30, letterSpacing: 0.12, fill: '#ffe3ef' }),
          img(-30, 250, 580, 800, { rotation: -2, frame: { style: 'papercut', color: '#f4f1ea', size: 26 }, filters: { grayscale: 100, contrast: 25, brightness: 12, halftone: 35 }, placeholder: ['#d9d6d2', '#9d9893'], name: 'Halftone photo (left)' }),
          img(520, 110, 590, 830, { rotation: 3, frame: { style: 'papercut', color: '#f4f1ea', size: 26 }, filters: { grayscale: 100, contrast: 25, brightness: 12, halftone: 35 }, placeholder: ['#e4e1dd', '#a8a39e'], name: 'Halftone photo (right)' }),
          txt('estilos de\ndesign', { cx: 520, cy: 1110, fontFamily: 'Gabarito', fontWeight: 900, fontSize: 150, lineHeight: 0.85, letterSpacing: -0.03, fill: '#151413', bg: { style: 'sticker', color: '#ffffff', padX: 20, borderWidth: 7, borderColor: '#151413' } }),
          stk('heart-sparkle', 820, 1110, 160, 153, { rotation: 12 }),
          txt('arrasta pro lado  →', { cx: 540, cy: 1300, fontFamily: 'Poppins', fontWeight: 600, fontSize: 28, letterSpacing: 0.08, fill: '#ffe3ef' }),
        ],
      }),
    },
    {
      id: 'postfolio', name: 'Postfólio', tags: ['Post', 'Collage', 'Profile'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#ee5aa5', pattern: { type: 'check', color: 'rgba(255,255,255,0.09)', size: 135 } },
        overlay: { grain: 12 },
        elements: [
          shp('rect', 0, 390, 340, 460, { fill: '#f9b9d9', shadow: lifted }),
          img(30, 425, 280, 390, { placeholder: ['#7b1f6a', '#ff7ab6'], name: 'Your work 1' }),
          shp('rect', 370, 410, 340, 440, { fill: '#fbefd9', shadow: lifted }),
          img(400, 445, 280, 370, { placeholder: ['#2a2420', '#8c877c'], name: 'Your work 2' }),
          shp('rect', 740, 390, 340, 460, { fill: '#f9b9d9', shadow: lifted }),
          img(770, 425, 280, 390, { placeholder: ['#4b1c8f', '#c9b6f2'], name: 'Your work 3' }),
          stk('star-chunky', 230, 330, 140, 140, { rotation: -8, colors: ['#f9b9d9'] }),
          img(390, 560, 330, 790, { filters: { grayscale: 100, contrast: 20 }, placeholder: ['#3b3a37', '#8c8a85'], name: 'Cut-out person — add a photo, then Remove background' }),
          txt('POSTFÓLIO', { cx: 540, cy: 210, fontFamily: 'Anton', fontSize: 230, letterSpacing: -0.01, fill: '#2a2420', bg: { style: 'sticker', color: '#fbefd9', padX: 26, borderWidth: 6, borderColor: '#2a2420' } }),
          stk('cloud-puffy', 30, 240, 200, 108, { rotation: -4 }),
          stk('cloud-puffy-small', 900, 250, 150, 103),
          shp('rounded', 250, 800, 260, 260, { radius: 56, fill: '#3d0f2c', shadow: soft, rotation: -3 }),
          txt('Ps', { cx: 378, cy: 928, rotation: -3, fontFamily: 'Gabarito', fontWeight: 800, fontSize: 165, fill: '#f283b4' }),
          stk('googly-eyes', 760, 960, 270, 180, { rotation: 6, outline: { on: true, color: '#fbefd9', width: 12 } }),
        ],
      }),
    },
    {
      id: 'ferramentas', name: 'Tools I use', tags: ['Post', 'Photo'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#9ccaf2', color2: '#eaf4ff', gradient: 'linear', angle: 180 },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: ['#a9d0f5', '#f6e7ef'], name: 'Background photo (sky & flowers)' }),
          txt('ferramentas de', { cx: 480, cy: 110, rotation: -1, fontFamily: 'Nunito', fontWeight: 600, fontSize: 58, fill: '#ffffff', bg: { style: 'box', color: '#2f6fed', padX: 24, padY: 6, borderWidth: 3, borderColor: '#ffffff' } }),
          txt('design', { cx: 540, cy: 280, fontFamily: 'Fredoka', fontWeight: 600, fontSize: 250, fill: '#f283b4', bg: { style: 'sticker', color: '#ffffff', padX: 26 }, shadow: { on: true, color: '#3b5f8f', opacity: 0.18, blur: 22, x: 0, y: 8 } }),
          stk('cat-face', 290, 330, 130, 118, { rotation: -10 }),
          txt('que eu uso', { cx: 540, cy: 445, rotation: -2, fontFamily: 'Nunito', fontWeight: 600, fontSize: 58, fill: '#ffffff', bg: { style: 'box', color: '#3aa655', padX: 28, padY: 10, stitch: true, borderColor: '#ffffff', borderWidth: 2.5 } }),
          stk('magnet', 700, 415, 86, 86, { rotation: 20 }),
          stk('star-chunky', 870, -30, 250, 250, { rotation: 14, colors: ['#ffc928'], outline: { on: true, color: '#ffffff', width: 14 } }),
          img(220, 560, 640, 500, { frame: { style: 'border', color: '#ece4d2', size: 44, radius: 30 }, placeholder: ['#3a3f4a', '#9aa3b2'], shadow: soft, name: 'Screen' }),
          txt('e você também devia!', { cx: 600, cy: 990, fontFamily: 'Nunito', fontWeight: 600, fontSize: 32, fill: '#ffffff', bg: { style: 'box', color: '#2f6fed', padX: 14, padY: 4 } }),
          stk('daisy', 120, 1080, 130, 130, { colors: ['#ffffff', '#f6c445'] }),
          stk('daisy', 860, 1110, 110, 110, { colors: ['#ff8fb8', '#f6c445'] }),
          stk('tulip', 770, 920, 90, 154, { rotation: 8 }),
          shp('pill', 380, 1230, 320, 56, { fill: '#f283b4', stroke: '#ffffff', strokeWidth: 3 }),
          shp('line', 430, 1238, 220, 40, { stroke: '#ffffff', strokeWidth: 3, arrowEnd: true }),
        ],
      }),
    },
    {
      id: 'creative-partner', name: 'Creative partner', tags: ['Story', 'Post', 'Photo'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#1d6fe8', color2: '#a6d6ff', gradient: 'linear', angle: 180 },
        overlay: { grain: 18 },
        elements: [
          shp('ellipse', -360, 960, 1800, 820, { rotation: -5, fill: '#4fae3a', fill2: '#2c7d22', gradient: 'linear', gradAngle: 180, texture: 35 }),
          txt('AGENT TWO\nBECOME MY\nCREATIVE\nPARTNER', { cx: 540, cy: 230, fontFamily: 'Rubik Mono One', fontSize: 94, lineHeight: 0.95, fill: '#ffffff', shadow: { on: true, color: '#0b3a8f', opacity: 0.3, blur: 20, x: 0, y: 6 } }),
          txt('here’s what actually happened..', { cx: 540, cy: 470, fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 40, fill: '#ffffff' }),
          stk('px-computer', 30, 330, 150, 141, { rotation: -6 }),
          stk('px-folder', 860, 20, 120, 90, { rotation: 8 }),
          stk('px-cursor', 800, 380, 84, 140),
          img(250, 540, 580, 800, { placeholder: ['#ff8fc8', '#b45bd6'], shadow: { on: true, color: '#0b2a14', opacity: 0.35, blur: 30, x: 0, y: 18 }, name: 'Cut-out person — add a photo, then Remove background' }),
          stk('arrow-curved', 150, 500, 130, 117, { rotation: -100, colors: ['#ffffff'] }),
          txt('not a prompt\nbut a real\ncreative\nconversation', { cx: 190, cy: 760, rotation: -4, fontFamily: 'Gloria Hallelujah', fontSize: 38, lineHeight: 1.0, fill: '#ffffff' }),
          stk('sparkle-outline', 230, 800, 160, 160, { rotation: -10 }),
          stk('smiley-chain', 830, 850, 110, 266),
          txt('invideo', { x: 770, y: 680, align: 'left', fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 34, fill: '#ffffff' }),
          txt('Agent two', { x: 770, y: 715, align: 'left', fontFamily: 'Instrument Sans', fontWeight: 600, fontSize: 64, fill: '#ffffff' }),
          stk('flower-cog', 90, 1180, 110, 110, { colors: ['#e23b2e'] }),
          stk('flower-cog', 880, 1060, 90, 90, { colors: ['#e23b2e'] }),
        ],
      }),
    },
    {
      id: 'hi-kimberly', name: 'Meet the agent', tags: ['Story', 'Profile', 'Photo'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#2847a8' },
        elements: [
          img(0, 0, 1080, 1350, { filters: { contrast: 15, duotone: true, duoDark: '#1b2a8f', duoLight: '#a9c4ff', halftone: 15 }, placeholder: ['#3556c0', '#93aef0'], name: 'Background photo (blue halftone)' }),
          img(270, 260, 560, 1090, { placeholder: ['#d9c1a8', '#7d5a45'], outline: { on: true, style: 'scribble', color: '#f7c62f', width: 34 }, name: 'Cut-out person — add a photo, then Remove background' }),
          shp('arch', 230, 220, 640, 1160, { fill: 'transparent', stroke: '#f7c62f', strokeWidth: 12, name: 'Guide outline (delete once your cut-out is in)' }),
          txt('HI, I’M\nKIMBERLY\nBLOOM', { cx: 220, cy: 420, rotation: -3, fontFamily: 'Permanent Marker', fontSize: 62, lineHeight: 1, fill: '#1d1b18', bg: { style: 'rough', color: '#f7d046', padX: 12, padY: 2, gap: 2 } }),
          stk('arrow-curved', 220, 560, 130, 117, { rotation: 20, colors: ['#ffffff'] }),
          txt('I’M A\nSELLER’S &\nBUYER’S AGENT', { cx: 860, cy: 1080, rotation: 2, fontFamily: 'Permanent Marker', fontSize: 54, lineHeight: 1, fill: '#1d1b18', bg: { style: 'rough', color: '#f7d046', padX: 12, padY: 2, gap: 2 } }),
          stk('arrow-straight', 770, 870, 150, 68, { rotation: -150, colors: ['#ffffff'] }),
        ],
      }),
    },
    // ── "Meet our…" on crumpled poster paper ──
    ...[
      { id: 'meet-women', name: 'Meet our women', paper: '#2d3fd3', ink: '#ffffff', words: ['MEET', 'OUR', 'WOMEN'], corners: ['THE WOMEN', 'BEHIND BACKSPACE'], caption: '[BEFORE BACKSPACE]', layout: 'grid' },
      { id: 'meet-team', name: 'Meet the team', paper: '#d8402d', ink: '#fff4ea', words: ['MEET', 'THE', 'TEAM'], corners: ['THE TEAM', 'BEHIND THE STUDIO'], caption: '[EST. 2019]', layout: 'single' },
      { id: 'our-story', name: 'Our small story', paper: '#f2cf3d', ink: '#1d1b18', words: ['OUR', 'SMALL', 'STORY'], corners: ['CHAPTER 01', 'SINCE 2021'], caption: '[WHERE IT STARTED]', layout: 'strip' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Photo'], width: 1080, height: 1350,
      build: () => {
        const label = (text, o) => txt(text, Object.assign({ fontFamily: 'Inter', fontWeight: 500, fontSize: 26, letterSpacing: 0.02, fill: v.ink }, o));
        const prints = [
          shp('rect', 300, 372, 400, 560, { rotation: -3, fill: '#d9d2c4', texture: 50, shadow: lifted }),
          shp('rect', 334, 384, 380, 520, { rotation: 2.5, fill: '#ebe5d8', texture: 45, shadow: lifted }),
          shp('rect', 352, 404, 376, 500, { rotation: 0.5, fill: '#f4efe4', texture: 40, shadow: soft }),
        ];
        const bw = { grayscale: 100, contrast: 12, fade: 18, grain: 25 };
        const photos = v.layout === 'grid'
          ? [[372, 424], [546, 424], [372, 650], [546, 650]].map(([x, y], k) => img(x, y, 166, 218, { rotation: 0.5, filters: bw, placeholder: [['#cfcac2', '#8f8a83'], ['#d8d3cb', '#9a958d'], ['#c9c4bc', '#858079'], ['#d3cec6', '#938e87']][k] }))
          : v.layout === 'single'
            ? [img(372, 424, 340, 444, { rotation: 0.5, filters: bw, placeholder: ['#d3cec6', '#8a857e'] })]
            : [0, 1, 2].map(k => img(392, 424 + k * 148, 300, 140, { rotation: 0.5, filters: bw, placeholder: ['#d3cec6', '#8a857e'] }));
        return {
          width: 1080, height: 1350,
          background: { color: v.paper, crumple: 70, crumpleSeed: 7 },
          overlay: { grain: 12 },
          elements: [
            label(v.corners[0], { x: 100, y: 78, align: 'left' }), label(v.corners[1], { x: 980 - 330, y: 78, width: 330, autoWidth: false, align: 'right' }),
            label(v.corners[0], { x: 100, y: 1250, align: 'left' }), label(v.corners[1], { x: 980 - 330, y: 1250, width: 330, autoWidth: false, align: 'right' }),
            txt(v.words[0], { cx: 180, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            txt(v.words[1], { cx: 512, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            txt(v.words[2], { cx: 820, cy: 292, fontFamily: 'Inter', fontWeight: 800, fontSize: 76, fill: v.ink }),
            ...prints, ...photos,
            txt(v.caption, { cx: 540, cy: 1000, fontFamily: 'Inter', fontWeight: 600, fontSize: 32, fill: v.ink }),
          ],
        };
      },
    })),

    // ── childhood note: grid-paper note between two taped-on photos ──
    ...[
      { id: 'note-blue', name: 'Childhood notes', bg: '#1f3fe0', note: 'grid', a: 'SAULO', b: 'ANA', ta: 'SAULO: QUEIMADA, BETIS,\nESCONDE-ESCONDE', tb: 'ANA: JOGAR FUTEBOL, FAZER\nCOMIDINHAS DE BRINCADEIRA,\nSOLTAR PIPA E PULAR ELÁSTICO', brand: ['CREARE', 'ESPAÇO CRIATIVO'] },
      { id: 'note-green', name: 'Favourite snacks', bg: '#14824a', note: 'lined', a: 'MAYA', b: 'LEO', ta: 'MAYA: MANGO SLICES,\nPOPCORN AT THE CINEMA', tb: 'LEO: GRANDMA’S BISCUITS,\nCHOCOLATE MILK AND\nANYTHING WITH CHEESE', brand: ['LITTLE CO.', 'FAMILY ARCHIVE'] },
      { id: 'note-pink', name: 'First dream job', bg: '#f0418f', note: 'dots', a: 'JOÃO', b: 'BIA', ta: 'JOÃO: ASTRONAUT,\nTHEN A PIZZA CHEF', tb: 'BIA: VET, BALLERINA\nAND, FOR ONE SUMMER,\nA PROFESSIONAL MERMAID', brand: ['STUDIO 22', 'THEN & NOW'] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Photo'], width: 1080, height: 1350,
      build: () => {
        const pattern = v.note === 'grid' ? { type: 'grid', color: 'rgba(40,60,90,0.16)', size: 20, thick: 1 } : v.note === 'lined' ? { type: 'lined', color: 'rgba(60,110,170,0.3)', size: 50, thick: 1.4, color2: 'rgba(0,0,0,0)' } : { type: 'dots', color: 'rgba(0,0,0,0.22)', size: 26, thick: 1.6 };
        const photo = { frame: { style: 'border', color: '#f7f6f2', size: 22, texture: 30 }, filters: { fade: 15, grain: 30, contrast: 6 }, shadow: lifted };
        const tag = (t, o) => txt(t, Object.assign({ fontFamily: 'Gochi Hand', fontSize: 46, fill: v.bg, bg: { style: 'folded', color: '#d6d6d3', padX: 42, padY: 12 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 10, x: 0, y: 4 } }, o));
        const brand = (t, o) => txt(t, Object.assign({ fontFamily: 'Inter', fontWeight: 600, fontSize: 28, letterSpacing: 0.02, fill: 'rgba(255,255,255,0.88)' }, o));
        return {
          width: 1080, height: 1350,
          background: { color: v.bg },
          overlay: { grain: 22 },
          elements: [
            brand(v.brand[0], { x: 80, y: 40, align: 'left' }),
            brand(v.brand[1], { x: 1000 - 380, y: 40, width: 380, autoWidth: false, align: 'right' }),
            img(-40, 60, 420, 540, Object.assign({ rotation: 4, placeholder: ['#e9d8c8', '#a78c76'] }, photo)),
            tag(v.a, { cx: 330, cy: 112, rotation: 14 }),
            shp('torn', 150, 380, 690, 470, { tornSides: 'b', fill: '#f6f5f1', pattern, texture: 35, shadow: lifted, seed: 11 }),
            shp('ellipse', 790, 462, 28, 28, { fill: v.bg }),
            shp('ellipse', 790, 650, 28, 28, { fill: v.bg }),
            txt(v.ta, { cx: 480, cy: 520, fontFamily: 'Gochi Hand', fontSize: 46, lineHeight: 1.12, fill: '#1d1b18' }),
            txt(v.tb, { cx: 480, cy: 692, fontFamily: 'Gochi Hand', fontSize: 46, lineHeight: 1.12, fill: '#1d1b18' }),
            img(600, 830, 420, 530, Object.assign({ rotation: -6, placeholder: ['#e7d7cf', '#b3988b'] }, photo)),
            tag(v.b, { cx: 610, cy: 1080, rotation: -12 }),
            brand(v.brand[0], { x: 80, y: 1255, align: 'left' }),
          ],
        };
      },
    })),

    // ── POV note: polaroid with tape over a blurred photo, cursive on a ripped notebook page ──
    ...[
      { id: 'pov-red', name: 'Creator POV', ink: '#c4232b', tape: '#d9262c', pattern: 'lined', bubble: 'Your product is SOLD OUT!\nCongrats — everything was snapped\nup faster than you expected.', body: 'Creator POV: You refresh your\nstore and see it — SOLD OUT.\n\nThe late nights, the hustle, the\ndoubts… suddenly feel worth it.\nBecause this is what growth\nlooks like.' },
      { id: 'pov-blue', name: 'Day one vs today', ink: '#1f3fa8', tape: '#3f73e8', pattern: 'dots', bubble: 'New order! That’s 1,000\norders since you launched.', body: 'Day 1: one sale, from my mum.\nToday: a thousand little parcels\npacked at this same desk.\n\nKeep going. Small steps\nstill count.' },
      { id: 'pov-green', name: 'Note to self', ink: '#1f6b3a', tape: '#3aa655', pattern: 'graph', bubble: 'Reminder: you planned\nto rest today.', body: 'Note to self:\nyou don’t have to earn rest.\n\nLog off, make tea,\ncall someone you love.\nThe work will still be here\ntomorrow.' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Quote', 'Photo', 'Paper'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#3b2f27' },
        overlay: { vignette: 25 },
        elements: [
          img(0, 0, 1080, 1350, { filters: { blur: 22, brightness: -12, saturation: -10 }, placeholder: ['#6b5646', '#2e241d'], name: 'Background photo (blurred)' }),
          img(220, 110, 560, 520, { rotation: -1.5, frame: { style: 'polaroid', color: '#f7f5f0', size: 22, bottom: 2.4, texture: 25 }, placeholder: ['#b8a18b', '#6a5544'], shadow: soft }),
          stk('washi-plain', 360, 70, 240, 66, { rotation: -4, colors: [v.tape] }),
          txt(v.bubble, { x: 268, y: 200, rotation: -1.5, align: 'left', fontFamily: 'Newsreader', fontWeight: 600, fontSize: 22, lineHeight: 1.2, fill: '#1d1b18', bg: { style: 'speech', color: '#ffffff', padX: 18, padY: 12, radius: 22 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 10, x: 0, y: 4 } }),
          shp('notebook', 110, 560, 840, 680, { fill: '#f3efe6', pattern: { type: v.pattern === 'lined' ? 'lined' : v.pattern, color: 'rgba(60,60,60,0.22)', size: v.pattern === 'lined' ? 52 : 30, thick: 1.2, color2: 'rgba(0,0,0,0)' }, texture: 35, rim: '#ffffff', shadow: soft, seed: 4 }),
          txt(v.body, { cx: 560, cy: 905, fontFamily: 'Allura', fontSize: 58, lineHeight: 1.0, fill: v.ink }),
        ],
      }),
    })),

    // ── VIDEO: newspaper clipping — the photo gets circled while the camera moves ──
    ...[
      { id: 'news-pullback', name: 'Pull-back reveal', head: 'That’s me!', last: 'me!', mark: 'circle', caption: 'That’s me!', cam: { move: 'pullback', zoom: 4.2, start: 0, dur: 1.9, rotate: 8, blur: 0.8, shake: 0.25 }, markAt: 1.7, headAt: 2.2 },
      { id: 'news-crash', name: 'Crash zoom', head: 'Front page!', last: 'page!', mark: 'arrow', caption: 'I made the papers', cam: { move: 'crash', zoom: 2.6, start: 0.5, dur: 2.6, rotate: 5, blur: 0.9, shake: 0.2 }, markAt: 1.2, headAt: 0.1 },
      { id: 'news-snap', name: 'Snap zoom', head: 'Spotted!', last: 'Spotted!', mark: 'circle', caption: 'Guess who…', cam: { move: 'snap', zoom: 2.1, start: 1.3, dur: 3.5, rotate: -3, blur: 0.6, shake: 0.6 }, markAt: 1.6, headAt: 0.1 },
      { id: 'news-cuts', name: 'Hard cuts', head: 'Breaking: me', last: 'me', mark: 'tick', caption: 'Plot twist', cam: { move: 'cuts', zoom: 3.6, start: 0, dur: 1.6, rotate: 6, blur: 0, shake: 0.35 }, markAt: 1.75, headAt: 2.1 },
      { id: 'news-push', name: 'Slow push-in', head: 'Local legend', last: 'legend', mark: 'scribble', caption: 'Small town, big dreams', cam: { move: 'pushin', zoom: 1.7, start: 0, dur: 5, rotate: 3, blur: 0.3, shake: 0.2 }, markAt: 1.4, headAt: 0.3 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Photo'], width: 1080, height: 1350, video: true,
      build: () => {
        const R2 = -3, red = '#dc2626';
        const filler = 'A random line of text to fill this newspaper, because every page needs a story. This one starts with a photo nobody expected to see again, a date scribbled on the back, and a face that looks a lot like mine. ';
        const col = (x, y, w, h, n) => txt((filler + filler + filler).slice(0, n), { x, y, width: w, autoWidth: false, align: 'left', fontFamily: 'Newsreader', fontSize: 23, lineHeight: 1.22, fill: '#2a2826', rotation: R2, name: 'Column' });
        const markEl = {
          circle: rib('scribble', 105, 350, 430, 470, { key: 'mark', line: true, thickness: 13, color: red, opacity: 0.92, text: '', rotation: R2, anim: { enter: 'draw', delay: v.markAt, speed: 0.75 } }),
          scribble: rib('scribble', 85, 330, 470, 520, { key: 'mark', line: true, thickness: 10, color: red, opacity: 0.9, text: '', rotation: R2 - 4, anim: { enter: 'draw', delay: v.markAt, speed: 0.6 } }),
          arrow: rib('bend', 470, 300, 260, 200, { key: 'mark', line: true, thickness: 11, color: red, text: '', arrowStart: true, rotation: R2 + 8, anim: { enter: 'draw', delay: v.markAt, speed: 0.9 } }),
          tick: rib('tick', 400, 420, 180, 150, { key: 'mark', line: true, thickness: 16, color: red, opacity: 0.92, text: '', rotation: R2, anim: { enter: 'draw', delay: v.markAt, speed: 1 } }),
        }[v.mark];
        return {
          width: 1080, height: 1350,
          background: { color: '#1e1c1a' },
          overlay: { vignette: 45, grain: 18 },
          anim: { duration: 5, fps: 30 },
          camera: Object.assign({ target: 'photo' }, v.cam),
          elements: [
            shp('rect', -90, -70, 1260, 1500, { fill: '#e8e5de', texture: 70, crumple: 24, seed: 3, rotation: R2, name: 'Newspaper' }),
            shp('line', 20, 60, 1060, 20, { stroke: '#1d1b18', strokeWidth: 3, rotation: R2 }),
            txt(v.head, { key: 'head', x: 40, y: 95, align: 'left', fontFamily: 'Libre Caslon Display', fontSize: 150, fill: '#141414', rotation: R2, anim: { enter: 'typewriter', delay: v.headAt, speed: 1.4 } }),
            shp('line', 30, 280, 1060, 20, { stroke: '#1d1b18', strokeWidth: 3, rotation: R2 }),
            rib('swipe', 640, 228, 380, 60, { line: true, thickness: 22, color: red, opacity: 0.88, text: '', rotation: R2, anim: { enter: 'draw', delay: v.headAt + 0.9, speed: 1.2 }, name: 'Marker underline' }),
            img(40, 330, 560, 640, { key: 'photo', rotation: R2, filters: { saturation: -35, contrast: 12, fade: 8, noise: 25 }, placeholder: ['#7b746a', '#3b3631'], name: 'Your photo' }),
            markEl,
            col(640, 330, 390, 640, 520),
            col(40, 1010, 320, 330, 260),
            col(385, 995, 320, 330, 260),
            col(730, 975, 320, 330, 260),
            txt(v.caption, { cx: 540, cy: 1185, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.6, blur: 10, x: 0, y: 2 }, name: 'Caption' }),
          ],
        };
      },
    })),

    // ── VIDEO: typing with a caret, highlighted words and a camera that rides along ──
    ...[
      { id: 'type-follow', name: 'Type & follow', text: 'SHE HELPED CREATE THE TECHNOLOGY WE USE EVERY DAY', marks: ['TECHNOLOGY'], style: 'select', font: 'Archivo', weight: 700, size: 30, ink: '#2b2b2b', bg: { color: '#d8d2c2', pattern: { type: 'graph', color: 'rgba(60,70,90,0.14)', size: 60, thick: 1.2 }, texture: 40, crumple: 18 }, overlay: { grain: 25, vignette: 25 }, cam: { move: 'follow', zoom: 4.2, start: 0.9, dur: 0.45, shake: 0.15, blur: 0.5 }, cx: 540, cy: 675 },
      { id: 'type-marker', name: 'Typed note', text: 'I didn’t plan to start a business.\nI just wanted to make something I loved.', marks: ['something I loved'], style: 'marker', color: '#f6e05e', speed: 1.5, font: 'Instrument Serif', weight: 400, size: 66, ink: '#1d1b18', align: 'left', width: 820, bg: { color: '#f5f1e6', pattern: { type: 'lined', color: 'rgba(70,110,160,0.25)', size: 54, thick: 1.4 }, texture: 45 }, overlay: { grain: 12 }, cam: { move: 'pushin', zoom: 1.35, start: 0, dur: 5, shake: 0.2, blur: 0.2 }, cx: 540, cy: 640 },
      { id: 'type-crash', name: 'Type & crash zoom', text: 'Nobody talks about\nthe quiet part.', marks: ['quiet'], style: 'underline', color: '#ef4444', font: 'Inter', weight: 800, size: 78, ink: '#111111', bg: { color: '#fafafa', texture: 20 }, overlay: { grain: 10 }, cam: { move: 'crash', zoom: 2.6, start: 1.7, dur: 2.4, rotate: 4, blur: 0.8 }, cx: 540, cy: 660 },
      { id: 'type-terminal', name: 'Terminal', text: '> booting creativity…\n> loading ideas: 100%\n> ready to make something new', marks: ['something new'], style: 'select', color: 'rgba(93,255,138,0.25)', handle: '#5dff8a', speed: 1.5, font: 'VT323', weight: 400, size: 62, ink: '#5dff8a', align: 'left', width: 860, bg: { color: '#0b0f0c' }, overlay: { grain: 30, vignette: 45 }, cam: { move: 'drift', zoom: 1.18, rotate: 1, shake: 0.5, blur: 0.3 }, cx: 540, cy: 660 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => ({
        width: 1080, height: 1350,
        background: v.bg, overlay: v.overlay,
        anim: { duration: 5, fps: 30 },
        camera: Object.assign({ target: 'type' }, v.cam),
        elements: [
          txt(v.text, Object.assign({
            key: 'type', cx: v.cx, cy: v.cy, align: v.align || 'center', fontFamily: v.font, fontWeight: v.weight, fontSize: v.size, lineHeight: 1.2, fill: v.ink,
            anim: { enter: 'typewriter', delay: 0.35, speed: v.speed || 1 },
            typing: { caret: true, marks: v.marks, style: v.style, color: v.color, handle: v.handle, caretColor: v.handle },
          }, v.width ? { autoWidth: false, width: v.width } : {})),
        ],
      }),
    })),

    // ── VIDEO: match cut — one word stays put while everything around it changes ──
    ...[
      { id: 'match-highlight', name: 'Keyword match cut', paper: '#ecebe7', crumple: 50, ink: '#2a2a2a', dim: '#6a6a6a', style: 'marker', color: '#f2df45', slot: 0.2, cam: { move: 'jolt', zoom: 1.3, rotate: 2, cut: 0.2, wander: 0, blur: 0.4 } },
      { id: 'match-dark', name: 'Night edition', paper: '#121212', crumple: 0, ink: '#ececec', dim: '#8a8a8a', style: 'marker', color: '#ff4fa3', slot: 0.25, cam: { move: 'pushin', zoom: 1.6, start: 0, dur: 5, shake: 0.4, blur: 0.4 } },
      { id: 'match-news', name: 'Newsprint flicker', paper: '#e8e2d2', crumple: 20, ink: '#1f1c17', dim: '#5e574b', style: 'underline', color: '#d62828', slot: 0.14, serif: true, cam: { move: 'jolt', zoom: 1.45, rotate: 3, cut: 0.14, wander: 0, blur: 0.5, shake: 0.2 } },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Video', 'Quote'], width: 1080, height: 1350, video: true,
      build: () => {
        const KW = 'motivation';
        const A = [
          ['The Impact of Motivation\non Athletic Performance', 'In this piece, we explore motivation for athletes', 'potential. The discussion covers the different types of', 'Archivo Black', 'Inter'],
          ['Understanding Motivation\nin the Workplace', 'The piece delves into how motivation and habit', 'influence productivity. It also considers how teams', 'Fraunces', 'Newsreader'],
          ['The Role of Motivation\nin Achieving Goals', 'It examines how motivation acts as a quiet engine', 'behind achievement. It discusses the role of habits', 'Space Grotesk', 'DM Sans'],
          ['Motivation and Learning:\nWhat Really Works', 'A closer look at intrinsic motivation in education', 'explores the concept of curiosity and its effect on', 'Newsreader', 'Instrument Sans'],
          ['Why Motivation Fades\n(and How to Keep It)', 'Research shows motivation is less about willpower', 'and more about small, repeatable systems that make', 'Bricolage Grotesque', 'Space Grotesk'],
          ['Finding Motivation\nin Hard Seasons', 'Small wins build motivation in ways that last', 'longer than any pep talk. The article highlights practical', 'DM Serif Display', 'Fraunces'],
        ];
        const body = 'resilience and focus over time. It also covers the psychological strategies coaches use to boost confidence, and the importance of rest in sustaining performance. Recent studies suggest that steady routines matter more than bursts of energy, especially when the goal is far away.';
        const els = [];
        A.forEach(([title, line, after, tf, bf], i) => {
          const time = { start: 0, cycle: { slot: v.slot, index: i, count: A.length } };
          const f = v.serif ? ['Newsreader', 'Newsreader'] : [tf, bf];
          els.push(
            txt('Home / Articles', { x: 60, y: 300, align: 'left', fontFamily: f[1], fontWeight: 500, fontSize: 30, fill: v.dim, time, lblur: { motion: 10 } }),
            txt(title, { x: 60, y: 360, align: 'left', fontFamily: f[0], fontWeight: f[0] === 'Fraunces' || f[0] === 'Newsreader' ? 700 : f[0] === 'Bricolage Grotesque' ? 800 : f[0] === 'Space Grotesk' ? 700 : 400, fontSize: 60, lineHeight: 1.05, fill: v.ink, time, lblur: { motion: 7 } }),
            txt(line, { cx: 540, cy: 675, autoWidth: false, width: 2400, align: 'center', anchor: KW, fontFamily: f[1], fontWeight: 600, fontSize: 48, fill: v.ink, time, typing: { caret: false, blink: false, marks: [KW], style: v.style, color: v.color }, name: 'Keyword line' }),
            txt(after, { cx: 540, cy: 745, autoWidth: false, width: 2400, align: 'center', fontFamily: f[1], fontWeight: 500, fontSize: 44, fill: v.ink, time, lblur: { motion: 5 } }),
            txt(body, { x: -40, y: 790, autoWidth: false, width: 1160, align: 'left', fontFamily: f[1], fontWeight: 500, fontSize: 40, lineHeight: 1.3, fill: v.dim, time, lblur: { motion: 16, gauss: 1.5 } }),
          );
        });
        return {
          width: 1080, height: 1350,
          background: { color: v.paper, crumple: v.crumple, crumpleSeed: 8, texture: v.crumple ? 25 : 0 },
          overlay: { vignette: 38, grain: 20 },
          anim: { duration: 5, fps: 30 },
          camera: v.cam,
          elements: els,
        };
      },
    })),

    // ── life-sim garden: cut-out photo on a painted lawn with game-menu choices ──
    ...[
      { id: 'garden-menu', name: 'Choose an action', sky: ['#1f6dd0', '#bfe7f6'], hill: ['#b5d65e', '#5fae37', '#2c6a1f', '#cdea7c'], profile: 'left', flower: ['#e3262c', '#8e0d15', '#3d7a2c', '#163c13', '#4d0a0c'], bloom: 'cluster', gem: ['#2fd16a', '#0c7a3c', '#a6ffbf'], ink: '#22307a', pill: '#f3eee6',
        items: [['Gossip', 'icon-lips'], ['Flirt', 'icon-heart-glossy'], ['Change Outfit', 'icon-cap'], ['Ask About Mood', 'icon-chat-bubbles'], ['Talk About Pet', 'icon-cat-sketch'], ['More Choices…', null]] },
      { id: 'garden-golden', name: 'Weekend plans', sky: ['#f39a5b', '#ffe6a8'], hill: ['#d4d86a', '#8fb23f', '#4b6e22', '#ecf09a'], profile: 'right', flower: ['#ffd23f', '#d89a10', '#4e7a2c', '#203f14', '#7a4a10'], bloom: 'daisy', gem: ['#ff9a3d', '#b85a10', '#ffe0b0'], ink: '#6b2f12', pill: '#fff4e0',
        items: [['Brunch', 'icon-coffee-glossy'], ['Nap', 'icon-house'], ['Go Thrifting', 'icon-cap'], ['Call Mum', 'icon-chat-bubbles'], ['Make a Playlist', 'icon-music-glossy'], ['More Plans…', null]] },
      { id: 'garden-dusk', name: 'Date night choices', sky: ['#8a6fd8', '#ffc3d8'], hill: ['#8cc06a', '#3f8a46', '#1d4f2a', '#b8e08a'], profile: 'double', flower: ['#ff8fc1', '#c24a86', '#3d7a3c', '#173d1c', '#ffe066'], bloom: 'cluster', gem: ['#ff6fb5', '#a8245f', '#ffd0e6'], ink: '#4a1f5c', pill: '#fff0f6',
        items: [['Compliment', 'icon-heart-glossy'], ['Hold Hands', 'icon-lips'], ['Share Dessert', 'icon-coffee-glossy'], ['Slow Dance', 'icon-music-glossy'], ['Stargaze', 'icon-sparkle-green'], ['More Choices…', null]] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Photo', 'Garden'], width: 1080, height: 1350,
      build: () => {
        const slots = [[340, 430], [740, 430], [290, 524], [790, 524], [250, 618], [830, 618]];
        const pills = v.items.flatMap(([label, icon], i) => {
          const [cx, cy] = slots[i], W = 280;
          const out = [txt(label, { cx, cy, autoWidth: false, width: W, align: 'center', fontFamily: 'Nunito', fontWeight: 700, fontSize: 26, fill: v.ink, bg: { style: 'glossy', color: v.pill, padX: 24, padY: 12 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 16, x: 0, y: 6 }, name: 'Choice' })];
          if (icon) out.push(stk(icon, cx - W / 2 - 40, cy - 36, 72, 72, { name: 'Choice icon' }));
          return out;
        });
        return {
          width: 1080, height: 1350,
          background: { color: v.sky[0], color2: v.sky[1], gradient: 'linear', angle: 180 },
          overlay: { grain: 22 },
          elements: [
            nat('cloud', 690, 150, 320, 160, { opacity: v.id === 'garden-menu' ? 0 : 0.85, name: 'Cloud' }),
            nat('hill', 0, 640, 1080, 710, { colors: v.hill, profile: v.profile, seed: 4 }),
            nat('flowers', 200, 1105, 330, 120, { colors: v.flower, bloom: v.bloom, seed: 2 }),
            nat('flowers', 690, 975, 330, 100, { colors: v.flower, bloom: v.bloom, seed: 7 }),
            img(380, 470, 320, 860, { name: 'Your photo — press Remove background to cut yourself out', placeholder: ['#e6e1d6', '#c9bfae'], frame: { style: 'rounded', radius: 30, size: 0 }, shadow: { on: true, style: 'cast', angle: 55, length: 0.35, blur: 16, opacity: 0.45, x: 0, y: 0, color: '#000000' } }),
            stk('crystal-gem', 497, 190, 86, 172, { colors: v.gem, anim: { loop: 'float', amount: 0.6 } }),
            ...pills,
          ],
        };
      },
    })),

    // ── text riding a looping ribbon over a photo ──
    ...[
      { id: 'ribbon-fest', name: 'Ribbon festival', path: 'loop', band: '#e6ef7d', ink: '#1d1b18', ph: ['#5d8a4a', '#2f4d2a'], title: 'PET FEST', sub: '14–15 JUNE · CITY PARK', font: 'Unbounded', words: 'a cosy offline festival for pets and their people, with activities, new friends and useful meetups', doodle: '#e6ef7d' },
      { id: 'ribbon-sounds', name: 'Summer sounds', path: 'double', band: '#ff7ab6', ink: '#ffffff', ph: ['#6fb4e8', '#2c5fa8'], title: 'SUMMER\nSOUNDS', sub: 'LIVE MUSIC · EVERY FRIDAY', font: 'Bricolage Grotesque', words: 'SUMMER SOUNDS ✦ LIVE ON THE ROOF ✦ BRING A FRIEND', upper: true, doodle: '#ffd23f' },
      { id: 'ribbon-market', name: 'Saturday market', path: 'scurve', band: '#ff8a3d', ink: '#1d1b18', ph: ['#c9a27a', '#6b4b33'], title: 'MARKET\nDAY', sub: 'SATURDAYS 8–1 · OLD TOWN SQUARE', font: 'Archivo Black', words: 'fresh flowers · sourdough · coffee · local honey · good people', border: '#1d1b18', doodle: '#fff3d6' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Event', 'Post', 'Ribbon'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.ph[1] },
        overlay: { grain: 12 },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, name: 'Background photo' }),
          stk('sparkle-4', 800, 40, 170, 170, { colors: [v.doodle], rotation: 12 }),
          stk('sparkle-4', 930, 190, 90, 90, { colors: [v.doodle], rotation: -8 }),
          rib(v.path, -70, 210, 1220, 650, { color: v.band, text: v.words, textColor: v.ink, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 34, uppercase: !!v.upper, thickness: 100, letterSpacing: 0.04, border: { width: v.border ? 6 : 0, color: v.border || '#1d1b18' }, anim: { loop: 'flow', speed: 0.6 } }),
          txt(v.title, { cx: 540, cy: 1040, fontFamily: v.font, fontWeight: v.font === 'Unbounded' ? 800 : v.font === 'Bricolage Grotesque' ? 800 : 400, fontSize: v.title.includes('\n') ? 130 : 150, lineHeight: 0.92, fill: v.band, stroke: v.border ? { width: 6, color: v.border } : undefined }),
          txt(v.sub, { cx: 540, cy: 1230, fontFamily: 'Space Mono', fontWeight: 700, fontSize: 30, letterSpacing: 0.06, fill: '#ffffff', bg: { style: 'pill', color: 'rgba(20,20,20,0.35)', padX: 26, padY: 10 } }),
          stk('flower-doodle', 70, 1150, 150, 150, { colors: [v.doodle], rotation: -10 }),
          stk('sun-doodle', 880, 1140, 140, 140, { colors: [v.doodle] }),
        ],
      }),
    })),

    // ── motion-blurred sport photo with a step-by-step arrow trail ──
    ...[
      { id: 'first-squat', name: 'From the first squat', head: 'FROM\nTHE\nFIRST SQUAT\nTO\nFOREVER.', steps: ['BODY', 'MIND', 'SOUL', 'BODY'], f: { grayscale: 100, contrast: 28, brightness: -6, motion: 55, noise: 55, vignette: 35 }, ph: ['#6b6b6b', '#1c1c1c'], bg: '#151515' },
      { id: 'run-club', name: 'Run club', head: 'MILE ONE\nTO MILE\nONE\nHUNDRED.', steps: ['START', 'PUSH', 'BREATHE', 'FINISH'], f: { contrast: 18, saturation: -20, warmth: 25, motion: 60, noise: 40, vignette: 30 }, ph: ['#a0583a', '#2a140d'], bg: '#1d0f0a' },
      { id: 'dance-studio', name: 'Every rehearsal', head: 'EVERY\nREHEARSAL\nCOUNTS.', steps: ['COUNT', 'MOVE', 'FEEL', 'REPEAT'], f: { contrast: 15, duotone: true, duoDark: '#22104a', duoLight: '#d7c6ff', motion: 65, motionAngle: 90, noise: 45 }, ph: ['#7b67c9', '#1d1238'], bg: '#160c2c' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Photo', 'Quote', 'Sport'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg },
        overlay: { grain: 30, vignette: 20 },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, filters: v.f, name: 'Action photo' }),
          txt(v.head, { x: 100, y: 70, align: 'left', fontFamily: 'Archivo Black', fontSize: 96, lineHeight: 0.86, fill: '#f2f2ef' }),
          txt(v.steps[0], { x: 92, y: 560, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(130, 610, 190, 160),
          txt(v.steps[1], { x: 336, y: 752, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(430, 800, 200, 160),
          txt(v.steps[2], { x: 640, y: 942, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
          arrow(722, 990, 180, 160),
          txt(v.steps[3], { x: 912, y: 1132, align: 'left', fontFamily: 'Archivo', fontWeight: 700, fontSize: 30, letterSpacing: 0.02, fill: '#f2f2ef' }),
        ],
      }),
    })),

    // ── shot through a phone camera: fisheye photo with the camera interface on top ──
    ...[
      { id: 'pov-camera', name: 'Creators wanted', style: 'iphone', head: 'Bloggers,\nlet’s team up', sub: 'Now inviting creators', brand: 'WILD TRIP', f: { fisheye: 42, saturation: 10, warmth: 8 }, ph: ['#9cc4d8', '#4f7a3a'], font: 'Gloock', size: 118 },
      { id: 'pov-tapes', name: 'Summer tapes', style: 'camcorder', head: 'SUMMER\nTAPES ’26', sub: 'press play on the good days', brand: 'VOL. 03', f: { noise: 45, fade: 18, warmth: 15, contrast: 8 }, ph: ['#e6b98a', '#7a4a2e'], font: 'VT323', size: 170 },
      { id: 'pov-behind', name: 'Behind the scenes', style: 'minimal', head: 'Behind\nthe scenes', sub: 'Day 03 · Lisbon', brand: 'ON SET', f: { fisheye: 30, fade: 12, contrast: 6 }, ph: ['#d9c7b0', '#5f5246'], font: 'Instrument Serif', size: 140 },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Photo', 'Story', 'Camera'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#000000' },
        elements: [
          img(0, 0, 1080, 1350, { placeholder: v.ph, filters: v.f, name: 'Your photo' }),
          cam(v.style, v.style === 'iphone' ? { lens: true, grid: true } : v.style === 'camcorder' ? { lens: false, grid: false, date: 'JUL 21 2026' } : { lens: true, grid: true }),
          txt(v.brand, { cx: 540, cy: v.style === 'camcorder' ? 300 : 175, fontFamily: v.style === 'camcorder' ? 'VT323' : 'Instrument Sans', fontWeight: v.style === 'camcorder' ? 400 : 600, fontSize: v.style === 'camcorder' ? 44 : 24, letterSpacing: 0.18, fill: '#ffffff' }),
          txt(v.head, { cx: 540, cy: v.style === 'camcorder' ? 470 : 380, fontFamily: v.font, fontSize: v.size, lineHeight: v.style === 'camcorder' ? 0.8 : 0.95, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.25, blur: 24, x: 0, y: 4 } }),
          txt(v.sub, { cx: 540, cy: v.style === 'camcorder' ? 660 : 560, fontFamily: v.style === 'camcorder' ? 'VT323' : 'Inter', fontWeight: v.style === 'camcorder' ? 400 : 500, fontSize: v.style === 'camcorder' ? 52 : 44, fill: '#ffffff' }),
        ],
      }),
    })),

    // ── save the date, written on a giant wall calendar ──
    ...[
      { id: 'date-green', name: 'Save the date (calendar)', head: 'SAVE\nTHE\nDATE', headInk: '#173d12', l1: 'POWDERFINGER +\nSILVERCHAIR SHOW', l2: '@ Wharf Events', mark: '#5cf06a', price: '$25pp', pen: ['#3fd16a', '#25302a'] },
      { id: 'date-pink', name: 'Birthday dinner', head: 'BIRTHDAY\nDINNER', headInk: '#8f1d4f', l1: 'MAYA TURNS 30 —\nDRESS UP, OBVIOUSLY', l2: '@ Lola’s, 8pm', mark: '#ff8ac8', price: 'RSVP!', pen: ['#ff6fb5', '#3a2030'] },
      { id: 'date-blue', name: 'Deadline day', head: 'DEAD\nLINE', headInk: '#1b2f8f', l1: 'PORTFOLIO DUE\nBY MIDNIGHT', l2: 'don’t panic', mark: '#7fd3ff', price: '11:59', pen: ['#3fa9f5', '#1d2a3a'] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Event', 'Planner'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: '#f3f2ee', texture: 55, crumple: 18, crumpleSeed: 21 },
        elements: [
          // one giant cell (the 19th) sits in the middle of the frame; the notes are written inside it
          { type: 'calendar', x: -1271, y: -1146, width: 4000, height: 3600, rotation: -10, year: 2026, month: 4, layout: 'grid', showTitle: false, showWeekdays: false, numberPos: 'corner-right', numberScale: 0.3, lineColor: '#2a2f3a', color: '#2a2f3a', bodyFont: 'Space Mono', bodyWeight: 400, marked: [] },
          txt(v.head, { cx: 431, cy: 537, rotation: -10, align: 'left', fontFamily: 'Archivo Black', fontSize: 96, lineHeight: 0.9, fill: v.headInk }),
          txt(v.l1, { cx: 592, cy: 702, rotation: -20, fontFamily: 'Covered By Your Grace', fontSize: 58, lineHeight: 1.0, fill: '#1d1b18' }),
          txt(v.l2, { cx: 629, cy: 797, rotation: -20, fontFamily: 'Caveat', fontWeight: 600, fontSize: 62, fill: '#1d1b18', bg: { style: 'marker', color: v.mark, padX: 18, padY: 0, gap: 0 } }),
          txt(v.price, { cx: 735, cy: 845, rotation: -10, fontFamily: 'Caveat', fontWeight: 600, fontSize: 54, fill: '#1d1b18', bg: { style: 'scribble', color: '#1d1b18', padX: 34, padY: 24, borderWidth: 3 } }),
          stk('highlighter', 500, 980, 660, 309, { rotation: -10, colors: v.pen }),
        ],
      }),
    })),

    // ── torn notebook papers layered over a photo ──
    ...[
      { id: 'tip-green', name: 'Brand tip', back: '#cfe0ef', backPat: 'dots', front: '#d9eecf', line: 'rgba(90,170,90,0.6)', tape: ['#f2b8cc', '#c86a8a'], flower: '#9cc3ef', title: 'Polish your\nbrand look', body: 'Consistency builds recognition. Stick to the same colours, fonts and style across your posts. It makes your brand instantly recognisable and builds trust.' },
      { id: 'tip-pink', name: 'Reels tip', back: '#f6cfdc', backPat: 'grid', front: '#fbf3c8', line: 'rgba(214,170,60,0.6)', tape: ['#bfe3f2', '#5b9ec4'], flower: '#ff8fb8', title: 'Hook them in\nthree seconds', body: 'Open with the result, not the setup. Show the finished look first, then rewind and walk people through how you got there.' },
      { id: 'tip-lilac', name: 'Caption tip', back: '#dcd3f6', backPat: 'dots', front: '#f4efe6', line: 'rgba(120,110,180,0.5)', tape: ['#d7ef5a', '#8aa12a'], flower: '#f7d046', title: 'Write captions\nlike texts', body: 'Short lines, one idea each, the way you’d message a friend. End with a question so people have a reason to reply.' },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Paper', 'Quote'], width: 1080, height: 1080,
      build: () => ({
        width: 1080, height: 1080,
        background: { color: '#6b5a50' },
        elements: [
          img(0, 0, 1080, 1080, { placeholder: ['#9b7d6c', '#4a3a31'], name: 'Background photo' }),
          shp('torn', 250, 130, 700, 500, { tornSides: 'tb', fill: v.back, pattern: { type: v.backPat, color: 'rgba(70,110,170,0.35)', size: 22, thick: 1.4 }, rim: '#ffffff', texture: 25, shadow: soft, seed: 12 }),
          shp('torn', 200, 210, 640, 690, { tornSides: 'l', fill: v.front, pattern: { type: 'lined', color: v.line, size: 34, thick: 1.6, color2: 'rgba(0,0,0,0)' }, rim: '#ffffff', texture: 25, shadow: soft, seed: 15 }),
          stk('washi-grid', 140, 190, 210, 56, { rotation: -2, colors: v.tape }),
          stk('flower-cog', 620, 170, 110, 110, { colors: [v.flower] }),
          txt(v.title, { x: 262, y: 300, align: 'left', fontFamily: 'Instrument Serif', fontSize: 92, lineHeight: 0.95, fill: '#151413' }),
          txt(v.body, { x: 262, y: 520, width: 540, autoWidth: false, align: 'left', fontFamily: 'Inter', fontWeight: 400, fontSize: 31, lineHeight: 1.32, fill: '#151413' }),
        ],
      }),
    })),
    // ── big-head outfit line-up ──
    ...[
      { id: 'zapato', name: 'One shoe for each', bg: '#7a3a2c', ink: '#f3d6b0', title: 'UN\nZAPATO\nPARA CADA', swipe: 'deslizar  >>', brand: 'White.',
        figs: ['girl-striped-cardigan', 'girl-trench-walk', 'girl-blazer-coffee', 'girl-leather-bag', 'girl-polka-shirt'], shoes: [['shoe-suede-clog', ['#8a5a3a', '#c9a679', '#d8c08a'], 250, 146], ['shoe-suede-clog', ['#b5a48e', '#d3bf9c', '#d8c08a'], 270, 158]] },
      { id: 'jacket-mood', name: 'A jacket for every mood', bg: '#4b5a3a', ink: '#eadfc4', title: 'ONE\nJACKET FOR\nEVERY MOOD', swipe: 'swipe  >>', brand: 'Northside.',
        figs: ['boy-hoodie-cargo', 'boy-denim-chinos', 'boy-varsity-jeans', 'boy-puffer-joggers', 'boy-camel-coat'], shoes: [['shoe-m-dad-sneaker', null, 250, 158], ['shoe-m-chelsea', null, 180, 167]] },
      { id: 'what-we-wore', name: 'What we wore', bg: '#1d2a4a', ink: '#f2e9d8', title: 'WHAT WE\nWORE THIS\nWEEK', swipe: 'swipe  >>', brand: 'Studio Notes.',
        figs: ['girl-hoodie-sneakers', 'boy-rugby-skate', 'girl-floral-slip', 'boy-linen-shorts', 'girl-knit-vest'], shoes: [['shoe-chunky-sneaker', null, 250, 140], ['shoe-penny-loafer', null, 290, 119]] },
    ].map(v => ({
      id: v.id, name: v.name, tags: ['Post', 'Collage', 'Fashion'], width: 1080, height: 1350,
      build: () => ({
        width: 1080, height: 1350,
        background: { color: v.bg },
        overlay: { grain: 10 },
        elements: [
          stk(v.shoes[0][0], 50, 640, v.shoes[0][2] * 0.85, v.shoes[0][3] * 0.85, Object.assign({ rotation: -6 }, v.shoes[0][1] ? { colors: v.shoes[0][1] } : {})),
          ...figure(v.figs[0], 200, 400, 380, { rotation: -3 }),
          ...figure(v.figs[1], 540, 330, 330),
          ...figure(v.figs[2], 880, 400, 380, { rotation: 3 }),
          txt(v.title, { cx: 540, cy: 670, fontFamily: 'Josefin Sans', fontWeight: 300, fontSize: 74, lineHeight: 1.22, letterSpacing: 0.02, fill: v.ink }),
          txt(v.swipe, { cx: 540, cy: 990, fontFamily: 'Instrument Sans', fontWeight: 500, fontSize: 34, letterSpacing: 0.02, fill: v.ink }),
          ...figure(v.figs[3], 180, 1135, 400, { rotation: -2 }),
          ...figure(v.figs[4], 900, 1135, 400, { rotation: 2 }),
          stk(v.shoes[1][0], 690, 1210, v.shoes[1][2], v.shoes[1][3], Object.assign({ rotation: 4 }, v.shoes[1][1] ? { colors: v.shoes[1][1] } : {})),
          txt(v.brand, { cx: 540, cy: 1290, fontFamily: 'Instrument Serif', italic: true, fontSize: 56, fill: v.ink }),
        ],
      }),
    })),
  ];

  const TEXT_PRESETS = [
    { name: 'Serif headline', el: { text: 'Every shade', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 1 } },
    { name: 'Lavender selection', el: { text: 'Shade', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 0.92, bg: { style: 'select', color: '#cfc9f3', borderColor: '#7b6cf0', padX: 10, padY: 2, gap: 0, borderWidth: 2 } } },
    { name: 'Sage selection', el: { text: 'Attention', fontFamily: 'Instrument Serif', fontSize: 130, lineHeight: 0.92, bg: { style: 'select', color: '#b9d2c2', borderColor: '#1f5a4a', padX: 10, padY: 2, gap: 0, borderWidth: 2 } } },
    { name: 'Sticker script', el: { text: 'main character', fontFamily: 'Leckerli One', fontSize: 84, fill: '#2b2a26', bg: { style: 'sticker', color: '#fdf3a2', padX: 22 } } },
    { name: 'Line highlight', el: { text: 'Take control of\nyour story.', fontFamily: 'Young Serif', fontSize: 58, align: 'left', lineHeight: 1.05, fill: '#2b2a26', bg: { style: 'lines', color: '#9db38b', padX: 16, padY: 6, gap: 4 } } },
    { name: 'Tag box', el: { text: 'Hi, I’m Emily', fontFamily: 'Instrument Serif', fontSize: 88, fill: '#2148c0', bg: { style: 'box', color: '#ffa53c', padX: 32, padY: 20, radius: 26 } } },
    { name: 'Pill label', el: { text: 'THRIFT HAUS', fontFamily: 'Familjen Grotesk', fontWeight: 700, fontSize: 40, fill: '#101010', bg: { style: 'pill', color: '#ff9ad5', padX: 36, padY: 16 } } },
    { name: 'Oval label', el: { text: 'NEW IN', fontFamily: 'Familjen Grotesk', fontWeight: 600, fontSize: 40, fill: '#101010', bg: { style: 'oval', color: '#d7ef5a', padX: 50, padY: 30 } } },
    { name: 'Washi tape', el: { text: 'See all colors →', fontFamily: 'Instrument Serif', fontSize: 46, fill: '#2a2420', bg: { style: 'tape', color: '#d8cfba', padX: 36, padY: 14 } } },
    { name: 'Retro 3D', el: { text: 'Groovy', fontFamily: 'Shrikhand', fontSize: 120, fill: '#ff7ab6', stroke: { width: 4, color: '#1d1b18' }, echo: { on: true, color: '#1d1b18', dx: 0.06, dy: 0.06, steps: 10 } } },
    { name: 'Outline caps', el: { text: 'OUTLINE', fontFamily: 'Anton', fontSize: 130, fill: 'transparent', stroke: { width: 3, color: '#1d1b18' }, letterSpacing: 0.02 } },
    { name: 'Neon glow', dark: true, el: { text: 'neon nights', fontFamily: 'Pacifico', fontSize: 90, fill: '#fff5fd', shadow: { on: true, color: '#ff4fd8', opacity: 1, blur: 28, x: 0, y: 0 } } },
    { name: 'Marker', el: { text: 'highlight this', fontFamily: 'Caveat', fontWeight: 700, fontSize: 90, fill: '#1d1b18', bg: { style: 'marker', color: '#f7d046', padX: 14, padY: 0, gap: 0 } } },
    { name: 'Chunky rounded', dark: true, el: { text: 'everyday things', fontFamily: 'Fredoka', fontWeight: 600, fontSize: 96, lineHeight: 0.92, fill: '#f6f27a' } },
    { name: 'Mono caption', el: { text: '(to make life more fun!)', fontFamily: 'Space Mono', fontSize: 34, fill: '#1d1b18' } },
    { name: 'Speech bubble', el: { text: 'hey you!', fontFamily: 'Gochi Hand', fontSize: 70, fill: '#1d1b18', bg: { style: 'speech', color: '#ffffff', borderWidth: 4, borderColor: '#1d1b18', padX: 40, padY: 24, radius: 40 } } },
    { name: 'Scallop badge', el: { text: 'TH', fontFamily: 'Instrument Serif', italic: true, fontSize: 100, fill: '#101010', bg: { style: 'scallop', color: '#9b8cf2', padX: 48, padY: 56 } } },
    { name: 'Curved arch', el: { text: 'good things take time', fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 56, uppercase: true, letterSpacing: 0.08, curve: 38, fill: '#e4572e' } },
    { name: 'Burst sale', el: { text: '50%\nOFF', fontFamily: 'Archivo Black', fontSize: 70, lineHeight: 0.9, fill: '#ffffff', bg: { style: 'burst', color: '#f2542d', padX: 70, padY: 70 } } },
    { name: 'Ticket', el: { text: 'ADMIT ONE', fontFamily: 'Space Mono', fontWeight: 700, fontSize: 40, letterSpacing: 0.1, fill: '#1d1b18', bg: { style: 'ticket', color: '#ffb547', padX: 50, padY: 24, radius: 10 } } },
    { name: 'Swoosh underline', el: { text: 'lovely', fontFamily: 'DM Serif Display', italic: true, fontSize: 110, fill: '#1d1b18', bg: { style: 'underline', color: '#ff5fa2', padX: 6, padY: 0, gap: 0 } } },
    { name: 'Gradient heavy', el: { text: 'SUMMER', fontFamily: 'Unbounded', fontWeight: 900, fontSize: 104, fill: '#ff8a3d', fill2: '#ff4fa0', gradient: 'linear', gradAngle: 90 } },
    { name: 'Typewriter note', el: { text: 'dear diary,', fontFamily: 'Special Elite', fontSize: 50, fill: '#1d1b18', bg: { style: 'box', color: '#fffdf7', padX: 28, padY: 16 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 14, x: 0, y: 6 } } },
    { name: 'Condensed caps', el: { text: 'THE EDIT', fontFamily: 'Bebas Neue', fontSize: 170, letterSpacing: 0.02, fill: '#1d1b18' } },
    { name: 'Circled', el: { text: 'this one!', fontFamily: 'Caveat', fontWeight: 700, fontSize: 80, fill: '#1d1b18', bg: { style: 'scribble', color: '#ff3b30', padX: 46, padY: 34, borderWidth: 5 } } },
    { name: 'Torn note', el: { text: 'notes to self', fontFamily: 'Instrument Serif', italic: true, fontSize: 60, fill: '#1d1b18', bg: { style: 'torn', color: '#fbf8f1', padX: 38, padY: 26 }, shadow: { on: true, color: '#000000', opacity: 0.2, blur: 18, x: 0, y: 8 } } },
    { name: 'Bubble pop', el: { text: 'pop!', fontFamily: 'Rubik Bubbles', fontSize: 130, fill: '#ff7ab6' } },
    { name: 'Wet paint', el: { text: 'DRIP', fontFamily: 'Rubik Wet Paint', fontSize: 130, fill: '#5b4cf5' } },
    { name: 'Elegant script', el: { text: 'with love', fontFamily: 'Great Vibes', fontSize: 110, fill: '#1d1b18' } },
    { name: 'Blackletter-ish', el: { text: 'Cowboy Club', fontFamily: 'Rye', fontSize: 80, fill: '#8b3a1f' } },
    { name: 'Pixel', el: { text: 'LEVEL UP', fontFamily: 'Press Start 2P', fontSize: 46, fill: '#1d1b18', bg: { style: 'box', color: '#d7ef5a', padX: 24, padY: 20 } } },
    { name: 'Stacked display', el: { text: 'BIG\nNEWS', fontFamily: 'Dela Gothic One', fontSize: 120, lineHeight: 0.95, fill: '#1f3fd1' } },
    { name: 'Poster double outline', el: { text: 'POSTFÓLIO', fontFamily: 'Anton', fontSize: 150, letterSpacing: -0.01, fill: '#2a2420', bg: { style: 'sticker', color: '#fbefd9', padX: 22, borderWidth: 5, borderColor: '#2a2420' } } },
    { name: 'Bubble sticker', el: { text: 'estilos de\ndesign', fontFamily: 'Gabarito', fontWeight: 900, fontSize: 110, lineHeight: 0.85, letterSpacing: -0.03, fill: '#151413', bg: { style: 'sticker', color: '#ffffff', padX: 18, borderWidth: 6, borderColor: '#151413' } } },
    { name: 'Rounded pop', el: { text: 'design', fontFamily: 'Fredoka', fontWeight: 600, fontSize: 150, fill: '#f283b4', bg: { style: 'sticker', color: '#ffffff', padX: 20 }, shadow: { on: true, color: '#000000', opacity: 0.18, blur: 18, x: 0, y: 6 } } },
    { name: 'Blue label', el: { text: 'ferramentas de', fontFamily: 'Nunito', fontWeight: 600, fontSize: 56, fill: '#ffffff', bg: { style: 'box', color: '#2f6fed', padX: 22, padY: 6, borderWidth: 3, borderColor: '#ffffff' } } },
    { name: 'Stitched label', el: { text: 'que eu uso', fontFamily: 'Nunito', fontWeight: 600, fontSize: 56, fill: '#ffffff', bg: { style: 'box', color: '#3aa655', padX: 26, padY: 10, stitch: true, borderColor: '#ffffff', borderWidth: 2.5 } } },
    { name: 'Marker blocks', el: { text: 'HI, I’M\nKIMBERLY\nBLOOM', fontFamily: 'Permanent Marker', fontSize: 58, lineHeight: 1, fill: '#1d1b18', bg: { style: 'rough', color: '#f7d046', padX: 12, padY: 2, gap: 2 } } },
    { name: 'Wide heavy', dark: true, el: { text: 'CREATIVE\nPARTNER', fontFamily: 'Rubik Mono One', fontSize: 92, lineHeight: 0.95, fill: '#ffffff', shadow: { on: true, color: '#0b3a8f', opacity: 0.35, blur: 20, x: 0, y: 6 } } },
    { name: 'Chalk note', dark: true, el: { text: 'not a prompt\nbut a real\nconversation', fontFamily: 'Gloria Hallelujah', fontSize: 40, lineHeight: 1.05, fill: '#ffffff' } },
    { name: 'Tracked caption', el: { text: 'Ryane | Designer Gráfico 2026', fontFamily: 'Poppins', fontWeight: 600, fontSize: 30, letterSpacing: 0.12, fill: '#ffffff', shadow: { on: true, color: '#000000', opacity: 0.25, blur: 8, x: 0, y: 2 } }, dark: true },
  ];

  const PAPER_PRESETS = [
    { name: 'Notebook page', el: W => ({ shape: 'rounded', radius: W * 0.014, width: W * 0.56, height: W * 0.72, fill: '#fbf8f1', texture: 45, shadow: soft, pattern: { type: 'lined', color: 'rgba(70,110,160,0.28)', size: W * 0.036, thick: 1.4 } }) },
    { name: 'Graph paper', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.62, fill: '#fbfbf6', texture: 25, shadow: soft, pattern: { type: 'graph', color: 'rgba(70,130,170,0.32)', size: W * 0.05, thick: 1.2 } }) },
    { name: 'Dot grid', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.62, fill: '#f6f2e8', texture: 30, shadow: soft, pattern: { type: 'dots', color: 'rgba(0,0,0,0.28)', size: W * 0.03, thick: 1.6 } }) },
    { name: 'Sticky note', el: W => ({ shape: 'rect', width: W * 0.3, height: W * 0.3, fill: '#ffe680', texture: 30, shadow: lifted }) },
    { name: 'Torn scrap', el: W => ({ shape: 'torn', width: W * 0.46, height: W * 0.3, fill: '#fbf8f1', texture: 50, shadow: soft, seed: 9 }) },
    { name: 'Kraft card', el: W => ({ shape: 'rounded', radius: W * 0.02, width: W * 0.46, height: W * 0.3, fill: '#c8a97e', texture: 80, shadow: soft }) },
    { name: 'Index card', el: W => ({ shape: 'rect', width: W * 0.5, height: W * 0.32, fill: '#fffdf7', texture: 30, shadow: soft, pattern: { type: 'lined', color: 'rgba(80,130,190,0.35)', size: W * 0.028, thick: 1.2 } }) },
    { name: 'Gingham square', el: W => ({ shape: 'rect', width: W * 0.4, height: W * 0.4, fill: '#ffffff', pattern: { type: 'gingham', color: '#f29bb4', size: W * 0.03 } }) },
    { name: 'Ticket', el: W => ({ shape: 'ticket', radius: 14, width: W * 0.5, height: W * 0.22, fill: '#ff8a5c', texture: 25 }) },
    { name: 'Cutting mat', el: W => ({ shape: 'rounded', radius: W * 0.02, width: W * 0.6, height: W * 0.6, fill: '#1f5a4a', pattern: { type: 'grid', color: 'rgba(255,255,255,0.16)', size: W * 0.04, thick: 1.4 } }) },
    { name: 'Stamp sheet', el: W => ({ shape: 'stamp', width: W * 0.32, height: W * 0.4, fill: '#fbf8f1', texture: 40, shadow: lifted }) },
    { name: 'Speech card', el: W => ({ shape: 'speech', radius: W * 0.04, width: W * 0.46, height: W * 0.3, fill: '#ffffff', stroke: '#1d1b18', strokeWidth: 4 }) },
  ];

  const cal = o => Object.assign({ type: 'calendar', year: yr, month: mo, day: dy, width: 860, height: 760 }, o);
  const PLANNER_PRESETS = [
    { group: 'Calendars', name: 'Classic grid', el: cal({ marked: [dy], markStyle: 'circle', accent: '#e4572e' }) },
    { group: 'Calendars', name: 'Minimal', el: cal({ layout: 'minimal', titleAlign: 'center', marked: [dy], accent: '#1d1b18', dayFormat: 'initial', headerLine: true }) },
    { group: 'Calendars', name: 'Soft cells', el: cal({ showLines: false, cellColor: '#f1ebdd', cellRadius: 0.3, accent: '#7fa88a', marked: [dy, dy + 3 > 28 ? 2 : dy + 3], titleFont: 'Fraunces', titleWeight: 600, bodyFont: 'DM Sans' }) },
    { group: 'Calendars', name: 'Bold poster', el: cal({ bgColor: '#f7d046', radius: 34, titleFont: 'Anton', monthCase: 'upper', bodyFont: 'Space Mono', bodyWeight: 700, accent: '#f2542d', lineColor: 'rgba(29,27,24,0.35)', marked: [dy] }) },
    { group: 'Calendars', name: 'Scribbled dates', el: cal({ layout: 'minimal', titleFont: 'Caveat', titleWeight: 700, bodyFont: 'Gaegu', bodyWeight: 700, markStyle: 'scribble', accent: '#ff3b30', marked: [3, 14, dy], titleAlign: 'center' }) },
    { group: 'Calendars', name: 'Love dates', el: cal({ layout: 'minimal', titleFont: 'Great Vibes', titleAlign: 'center', bodyFont: 'Josefin Sans', markStyle: 'heart', accent: '#ff7ab6', marked: [14, dy] }) },
    { group: 'Calendars', name: 'Midnight', dark: true, el: cal({ bgColor: '#1d1b18', radius: 30, color: '#f6f1e7', accent: '#d7ef5a', accentText: '#1d1b18', lineColor: 'rgba(246,241,231,0.2)', titleFont: 'Bricolage Grotesque', titleWeight: 700, bodyFont: 'Bricolage Grotesque', weekendAccent: true, marked: [dy] }) },
    { group: 'Calendars', name: 'Week strip', el: cal({ layout: 'strip', width: 900, height: 280, accent: '#5b4cf5', titleFont: 'Instrument Serif', bodyFont: 'Instrument Sans' }) },
    { group: 'Calendars', name: 'Week pills', el: cal({ layout: 'strip', width: 900, height: 280, showTitle: false, cellColor: '#f1ebdd', accent: '#ff8a3d', titleFont: 'Bricolage Grotesque', titleWeight: 700, bodyFont: 'Bricolage Grotesque' }) },
    { group: 'Calendars', name: 'Tear-off date', el: cal({ layout: 'page', width: 420, height: 500, accent: '#e4572e', titleFont: 'Instrument Serif', bodyFont: 'Instrument Sans', monthCase: 'upper', titleSpacing: 0.12, shadow: lifted }) },
    { group: 'Calendars', name: 'Date block', el: cal({ layout: 'page', width: 420, height: 500, accent: '#1f5a4a', cellColor: '#f4f0e6', titleFont: 'Anton', bodyFont: 'Space Mono', monthCase: 'upper', shadow: lifted }) },
    { group: 'Checklists', name: 'To-do', el: { type: 'checklist', width: 620, fontFamily: 'Caveat', fontSize: 56 } },
    { group: 'Checklists', name: 'Circles', el: { type: 'checklist', width: 620, fontFamily: 'Instrument Sans', fontSize: 42, boxStyle: 'circle', fillChecked: true, boxColor: '#5b4cf5', items: '[x] Plan the shoot\n[ ] Edit photos\n[ ] Post on Friday' } },
    { group: 'Checklists', name: 'Hearts', el: { type: 'checklist', width: 620, fontFamily: 'Gaegu', fontWeight: 700, fontSize: 52, boxStyle: 'heart', fillChecked: true, boxColor: '#ff5fa2', items: '[x] Self care Sunday\n[ ] Read 20 pages\n[ ] Text my bestie' } },
    { group: 'Checklists', name: 'Ruled notes', el: { type: 'checklist', width: 700, fontFamily: 'Special Elite', fontSize: 40, ruled: true, boxStyle: 'square', items: '[ ] Groceries\n[x] Laundry\n[ ] Pay rent\n[ ] Book tickets' } },
    { group: 'Badges', name: 'Years experience', el: { type: 'badge', width: 300, height: 300, fill: '#d7ef5a', textColor: '#2148c0', ringText: '5+ years experience', ringFill: false, ringStart: -40 } },
    { group: 'Badges', name: 'New in', el: { type: 'badge', width: 300, height: 300, shape: 'scallop', fill: '#ff9ad5', textColor: '#101010', ringText: 'new in', ringRepeat: true, ringSep: '  ✦  ', center: 'text', centerText: 'NEW', centerFont: 'Instrument Serif', centerWeight: 400, centerItalic: true, centerSize: 0.3, ringFont: 'Familjen Grotesk', ringWeight: 600 } },
    { group: 'Badges', name: 'Sale', el: { type: 'badge', width: 300, height: 300, shape: 'burst', fill: '#f7d046', textColor: '#1d1b18', ringText: 'limited time only', ringRadius: 0.66, ringSize: 0.08, center: 'text', centerText: '50%', centerFont: 'Archivo Black', centerSize: 0.26, ringFont: 'Space Mono', ringWeight: 700 } },
    { group: 'Badges', name: 'Handmade', el: { type: 'badge', width: 300, height: 300, shape: 'flower', fill: '#c9b6f2', textColor: '#3b2f6b', ringText: 'handmade with love', ringFont: 'Fraunces', ringWeight: 600, center: 'heart', centerColor: '#ff5fa2' } },
    { group: 'Badges', name: 'Open daily', el: { type: 'badge', width: 300, height: 300, fill: '#1d1b18', textColor: '#f6f1e7', ringText: 'open daily · 9 to 5', ringFont: 'Space Mono', ringWeight: 400, innerRing: true, center: 'star', centerColor: '#f7d046', centerSize: 0.22 } },
    { group: 'Badges', name: 'Est. stamp', el: { type: 'badge', width: 300, height: 300, shape: 'none', textColor: '#1d1b18', ringText: 'studio · collective · ', ringRepeat: true, ringSep: '', ringFont: 'Bricolage Grotesque', ringWeight: 700, center: 'text', centerText: 'EST.\n' + yr, centerFont: 'Bricolage Grotesque', centerSize: 0.15, innerRing: true } },
  ];

  const PHOTO_LAYOUTS = [
    {
      name: 'Photo booth strip (3)',
      build: d => {
        const W = d.width, s = W / 1080, x = d.width / 2 - 150 * s, y = d.height / 2 - 450 * s;
        return [
          { type: 'shape', shape: 'rect', x, y, width: 300 * s, height: 900 * s, fill: '#f7c6cf', shadow: soft },
          ...[0, 1, 2].map(i => ({ type: 'image', x: x + 22 * s, y: y + (22 + i * 282) * s, width: 256 * s, height: 262 * s, placeholder: ['#e7e1d4', '#cfc5b1'] })),
        ];
      },
    },
    {
      name: 'Polaroid pile (3)',
      build: d => {
        const s = d.width / 1080, cx = d.width / 2, cy = d.height / 2;
        const P = (dx, dy, r, tint) => ({ type: 'image', x: cx + dx * s, y: cy + dy * s, width: 380 * s, height: 450 * s, rotation: r, placeholder: tint, frame: { style: 'polaroid', color: '#ffffff', size: 20 * s, bottom: 3.6 }, shadow: soft });
        return [
          P(-470, -330, -8, ['#f3d9d0', '#e3b4a6']), P(-40, -380, 5, ['#d8e4d2', '#b4c9aa']), P(-230, -40, -2, ['#dad6ef', '#b9b2de']),
          { type: 'sticker', stickerId: 'washi-stripes', x: cx - 120 * s, y: cy - 70 * s, width: 220 * s, height: 58 * s, rotation: -6 },
        ];
      },
    },
    {
      name: 'Grid 2 × 2',
      build: d => {
        const g = d.width * 0.03, w = (d.width - g * 3) / 2, hh = (d.height - g * 3) / 2;
        return [0, 1, 2, 3].map(i => ({ type: 'image', x: g + (i % 2) * (w + g), y: g + Math.floor(i / 2) * (hh + g), width: w, height: hh, frame: { style: 'rounded', radius: d.width * 0.02, size: 0 }, placeholder: [['#e7e1d4', '#cfc5b1'], ['#f3d9d0', '#e3b4a6'], ['#d8e4d2', '#b4c9aa'], ['#dad6ef', '#b9b2de']][i] }));
      },
    },
    {
      name: 'Stamp trio',
      build: d => {
        const s = d.width / 1080, cy = d.height / 2;
        return [-1, 0, 1].map(i => ({ type: 'image', x: d.width / 2 - 140 * s + i * 310 * s, y: cy - 170 * s + (i === 0 ? -30 : 20) * s, width: 280 * s, height: 340 * s, rotation: i * 4, frame: { style: 'stamp', color: ['#7fb2d9', '#9ab83e', '#f6a5c0'][i + 1], size: 22 * s }, shadow: lifted, placeholder: ['#f6dccf', '#e7b29f'] }));
      },
    },
    {
      name: 'Film frames (3)',
      build: d => {
        const s = d.width / 1080, w = 900 * s, x = d.width / 2 - w / 2, y = d.height / 2 - 200 * s;
        return [0, 1, 2].map(i => ({ type: 'image', x: x + i * 300 * s, y, width: 300 * s, height: 400 * s, frame: { style: 'film', color: '#1d1b18', size: 8 * s }, placeholder: ['#d3e3ee', '#a9c6db'] }));
      },
    },
  ];

  const BACKGROUNDS = [
    { name: 'Crumpled blue', bg: { color: '#2d3fd3', crumple: 70, crumpleSeed: 3 }, overlay: { grain: 10 } },
    { name: 'Crumpled red', bg: { color: '#d8402d', crumple: 70, crumpleSeed: 4 }, overlay: { grain: 10 } },
    { name: 'Crumpled yellow', bg: { color: '#f2cf3d', crumple: 65, crumpleSeed: 5 }, overlay: { grain: 10 } },
    { name: 'Crumpled pink', bg: { color: '#f27bb3', crumple: 65, crumpleSeed: 6 }, overlay: { grain: 10 } },
    { name: 'Crumpled green', bg: { color: '#1f8a4c', crumple: 70, crumpleSeed: 7 }, overlay: { grain: 10 } },
    { name: 'Crumpled orange', bg: { color: '#f07a2a', crumple: 65, crumpleSeed: 8 }, overlay: { grain: 10 } },
    { name: 'Crumpled lilac', bg: { color: '#b9a6ee', crumple: 60, crumpleSeed: 9 }, overlay: { grain: 10 } },
    { name: 'Crumpled navy', bg: { color: '#1c2a5a', crumple: 75, crumpleSeed: 10 }, overlay: { grain: 10 } },
    { name: 'Crumpled black', bg: { color: '#1a1918', crumple: 80, crumpleSeed: 11 }, overlay: { grain: 10 } },
    { name: 'Crumpled kraft', bg: { color: '#c39a6b', crumple: 70, crumpleSeed: 12 }, overlay: { grain: 10 } },
    { name: 'Crumpled cream', bg: { color: '#efe8da', crumple: 55, crumpleSeed: 13 }, overlay: { grain: 10 } },
    { name: 'Crumpled white', bg: { color: '#f7f6f2', crumple: 50, crumpleSeed: 14 }, overlay: { grain: 10 } },
    { name: 'Cutting mat', bg: { color: '#1f5a4a', pattern: grid('rgba(255,255,255,0.10)', 54), texture: 12 } },
    { name: 'Grid paper', bg: { color: '#f3f2ee', pattern: grid('rgba(40,40,40,0.13)', 108, 2) } },
    { name: 'Graph paper', bg: { color: '#f6f5ef', pattern: { type: 'graph', color: 'rgba(70,130,170,0.3)', size: 90, thick: 1.4 }, texture: 20 } },
    { name: 'Notebook', bg: { color: '#fbf8f1', pattern: { type: 'lined', color: 'rgba(70,110,160,0.28)', size: 46, thick: 1.5 }, texture: 30 } },
    { name: 'Dot journal', bg: { color: '#f3efe6', pattern: { type: 'dots', color: 'rgba(0,0,0,0.25)', size: 36, thick: 1.8 }, texture: 25 } },
    { name: 'Cream paper', bg: { color: '#f2eadb', texture: 55 } },
    { name: 'Kraft', bg: { color: '#c8a97e', texture: 85 } },
    { name: 'Gingham', bg: { color: '#ffffff', pattern: { type: 'gingham', color: '#f29bb4', size: 44 } } },
    { name: 'Checkerboard', bg: { color: '#f6f1e7', pattern: { type: 'check', color: '#1d1b18', size: 90 } } },
    { name: 'Lilac check', bg: { color: '#ece6ff', pattern: { type: 'check', color: '#c9b6f2', size: 70 } } },
    { name: 'Blueprint', bg: { color: '#1f3fd1', pattern: grid('rgba(255,255,255,0.22)', 60) } },
    { name: 'Mint stripes', bg: { color: '#dff3e9', pattern: { type: 'stripes', color: 'rgba(43,179,163,0.22)', size: 70 } } },
    { name: 'Retro waves', bg: { color: '#ffefd6', pattern: { type: 'waves', color: '#ff8a3d', size: 70, thick: 6 } } },
    { name: 'Polka', bg: { color: '#ffd6e0', pattern: { type: 'polka', color: '#ffffff', size: 90 } } },
    { name: 'Halftone', bg: { color: '#ffffff', pattern: { type: 'halftone', color: '#1d1b18', size: 26 } } },
    { name: 'Sunset', bg: { color: '#ff8a3d', color2: '#ff7ab6', gradient: 'linear', angle: 160 }, overlay: { grain: 18 } },
    { name: 'Lilac haze', bg: { color: '#f2edff', color2: '#c9b6f2', gradient: 'radial' }, overlay: { grain: 12 } },
    { name: 'Midnight film', bg: { color: '#141312' }, overlay: { grain: 35, vignette: 30 } },
    { name: 'Diagonal', bg: { color: '#f7d046', pattern: { type: 'diagonal', color: 'rgba(29,27,24,0.12)', size: 60 } } },
    { name: 'Plus grid', bg: { color: '#1d1b18', pattern: { type: 'plus', color: 'rgba(255,255,255,0.3)', size: 60, thick: 2 } } },
  ];

  // families of variations show as one card in the panel and open into all their styles
  const GROUPS = {
    'Newspaper reveal': ['news-pullback', 'news-crash', 'news-snap', 'news-cuts', 'news-push'],
    'Typing': ['type-follow', 'type-marker', 'type-crash', 'type-terminal'],
    'Match cut': ['match-highlight', 'match-dark', 'match-news'],
    'Life-sim garden': ['garden-menu', 'garden-golden', 'garden-dusk'],
    'Ribbon poster': ['ribbon-fest', 'ribbon-sounds', 'ribbon-market'],
    'Motion blur': ['first-squat', 'run-club', 'dance-studio'],
    'Camera view': ['pov-camera', 'pov-tapes', 'pov-behind'],
    'Meet the team': ['meet-women', 'meet-team', 'our-story'],
    'Grid-paper notes': ['note-blue', 'note-green', 'note-pink'],
    'Polaroid POV': ['pov-red', 'pov-blue', 'pov-green'],
    'Wall calendar': ['date-green', 'date-pink', 'date-blue'],
    'Notebook tip': ['tip-green', 'tip-pink', 'tip-lilac'],
    'Outfit line-up': ['zapato', 'jacket-mood', 'what-we-wore'],
  };
  const ORDER = ['every-shade', ...Object.values(GROUPS).flat()];
  for (const [g, ids] of Object.entries(GROUPS)) for (const id of ids) { const t = TEMPLATES.find(x => x.id === id); if (t) t.group = g; }
  const rank = t => ORDER.includes(t.id) ? ORDER.indexOf(t.id) : 1000;
  TEMPLATES.sort((a, b) => rank(a) - rank(b));
  window.STUDIO_TEMPLATES = TEMPLATES;
  window.STUDIO_TEXT_PRESETS = TEXT_PRESETS;
  window.STUDIO_PAPER_PRESETS = PAPER_PRESETS;
  window.STUDIO_PLANNER_PRESETS = PLANNER_PRESETS;
  window.STUDIO_PHOTO_LAYOUTS = PHOTO_LAYOUTS;
  window.STUDIO_BACKGROUNDS = BACKGROUNDS;
})();
