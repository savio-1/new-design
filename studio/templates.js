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
  const soft = { on: true, color: '#000000', opacity: 0.22, blur: 30, x: 0, y: 14 };
  const lifted = { on: true, color: '#000000', opacity: 0.3, blur: 14, x: 0, y: 7 };
  const deep = { on: true, color: '#0b1f18', opacity: 0.45, blur: 40, x: 0, y: 22 };
  const grid = (color, size, thick = 1.5) => ({ type: 'grid', color, size, thick, opacity: 1 });

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

  window.STUDIO_TEMPLATES = TEMPLATES;
  window.STUDIO_TEXT_PRESETS = TEXT_PRESETS;
  window.STUDIO_PAPER_PRESETS = PAPER_PRESETS;
  window.STUDIO_PLANNER_PRESETS = PLANNER_PRESETS;
  window.STUDIO_PHOTO_LAYOUTS = PHOTO_LAYOUTS;
  window.STUDIO_BACKGROUNDS = BACKGROUNDS;
})();
