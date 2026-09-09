/* Style presets (single-layer looks) and templates (multi-layer sequence generators). */
(function (global) {
  'use strict';

  const ORANGE = '#F28C28';
  const WHITE = '#FFFFFF';

  function deepMerge(base, patch) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const k of Object.keys(patch || {})) {
      const v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' && base[k] !== null) {
        out[k] = deepMerge(base[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  function defaultLayer() {
    return {
      id: null,
      name: 'Text',
      text: 'Your text',
      start: 0,
      end: 3,
      hidden: false,
      behindSubject: false,   // erased where the subject mask covers it
      split: 'whole',
      style: {
        font: 'Inter', weight: 900, italic: false,
        size: 0.1, color: WHITE, letterSpacing: 0, lineHeight: 1.1, align: 'center', opacity: 1,
        stroke: { width: 0, color: '#000000' },
        shadow: { blur: 0.06, x: 0, y: 0.03, color: '#000000', opacity: 0.45 },
        extrude: { depth: 0, color: '#6B2E00', angle: 45 },
        box: { enabled: false, color: '#000000', opacity: 0.65, padding: 0.25, radius: 0.15 },
      },
      transform: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
      anim: {
        in: { type: 'focus', duration: 0.5, easing: 'easeOut', stagger: 0.06 },
        out: { type: 'focus', duration: 0.4, easing: 'easeIn', stagger: 0.03 },
        loop: { type: 'none', speed: 1 },
      },
    };
  }

  /* ---- Style presets ---------------------------------------------------- */
  const STYLES = [
    {
      id: 'helvHeavy', name: 'Helvetica Heavy',
      style: { font: 'Helvetica Neue', weight: 800, italic: false, color: WHITE, letterSpacing: -0.02, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.08, x: 0.01, y: 0.04, color: '#000000', opacity: 0.5 }, box: { enabled: false } },
      css: { fontFamily: "'Helvetica Neue'", fontWeight: 800, color: WHITE, letterSpacing: '-.02em', textShadow: '0 2px 6px rgba(0,0,0,.55)' },
    },
    {
      id: 'francy', name: 'Francy',
      style: { font: 'Francy', weight: 400, italic: false, color: '#FFF3E0', letterSpacing: 0.01, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.08, x: 0, y: 0.04, color: '#000000', opacity: 0.5 }, box: { enabled: false } },
      css: { fontFamily: 'Francy', color: '#FFF3E0', fontSize: '1.2em' },
    },
    {
      id: 'helvThin', name: 'Helvetica Thin',
      style: { font: 'Helvetica Neue', weight: 200, italic: false, color: WHITE, letterSpacing: 0.06, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.05, x: 0, y: 0.02, color: '#000000', opacity: 0.45 }, box: { enabled: false } },
      css: { fontFamily: "'Helvetica Neue'", fontWeight: 200, color: WHITE, letterSpacing: '.06em', fontSize: '1.15em' },
    },
    {
      id: 'cleanBold', name: 'Clean Bold',
      style: { font: 'Inter', weight: 900, italic: false, color: WHITE, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.06, x: 0, y: 0.03, color: '#000000', opacity: 0.45 }, box: { enabled: false } },
      css: { fontFamily: 'Inter', fontWeight: 900, color: WHITE, textShadow: '0 2px 6px rgba(0,0,0,.5)' },
    },
    {
      id: 'editorial', name: 'Editorial Italic',
      style: { font: 'Instrument Serif', weight: 400, italic: true, color: WHITE, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.05, x: 0, y: 0.02, color: '#000000', opacity: 0.4 }, box: { enabled: false } },
      css: { fontFamily: 'Instrument Serif', fontStyle: 'italic', fontWeight: 400, color: WHITE, fontSize: '1.25em' },
    },
    {
      id: 'orange3d', name: 'Orange 3D',
      style: { font: 'Archivo Black', weight: 400, italic: false, color: ORANGE, stroke: { width: 0 }, extrude: { depth: 0.06, color: '#6B2E00', angle: 55 }, shadow: { blur: 0.08, x: 0.02, y: 0.05, color: '#000000', opacity: 0.4 }, box: { enabled: false } },
      css: { fontFamily: 'Archivo Black', color: ORANGE, textShadow: '1px 1px 0 #6B2E00, 2px 2px 0 #6B2E00, 3px 3px 0 #6B2E00, 4px 6px 8px rgba(0,0,0,.4)' },
    },
    {
      id: 'outline', name: 'Outline',
      style: { font: 'Montserrat', weight: 900, italic: false, color: 'transparent', stroke: { width: 0.035, color: WHITE }, extrude: { depth: 0 }, shadow: { opacity: 0 }, box: { enabled: false } },
      css: { fontFamily: 'Montserrat', fontWeight: 900, color: 'transparent', WebkitTextStroke: '1.5px #fff' },
    },
    {
      id: 'neon', name: 'Neon',
      style: { font: 'Space Grotesk', weight: 700, italic: false, color: '#EAFFFF', stroke: { width: 0.015, color: '#22D3EE' }, extrude: { depth: 0 }, shadow: { blur: 0.35, x: 0, y: 0, color: '#22D3EE', opacity: 1 }, box: { enabled: false } },
      css: { fontFamily: 'Space Grotesk', fontWeight: 700, color: '#EAFFFF', textShadow: '0 0 6px #22D3EE, 0 0 14px #22D3EE' },
    },
    {
      id: 'captionBox', name: 'Caption Box',
      style: { font: 'Space Grotesk', weight: 700, italic: false, color: WHITE, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { opacity: 0 }, box: { enabled: true, color: '#000000', opacity: 0.7, padding: 0.25, radius: 0.15 } },
      css: { fontFamily: 'Space Grotesk', fontWeight: 700, color: WHITE, background: 'rgba(0,0,0,.7)', padding: '2px 8px', borderRadius: '5px' },
    },
    {
      id: 'retroPop', name: 'Retro Pop',
      style: { font: 'Bangers', weight: 400, italic: false, color: '#FFD23F', letterSpacing: 0.02, stroke: { width: 0.012, color: '#1A1A1A' }, extrude: { depth: 0.08, color: '#D7263D', angle: 60 }, shadow: { opacity: 0 }, box: { enabled: false } },
      css: { fontFamily: 'Bangers', color: '#FFD23F', letterSpacing: '.02em', textShadow: '2px 2px 0 #D7263D, 3px 4px 0 #D7263D', fontSize: '1.2em' },
    },
    {
      id: 'elegant', name: 'Elegant Thin',
      style: { font: 'Cormorant Garamond', weight: 400, italic: true, color: '#F8F1E7', letterSpacing: 0.04, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.04, x: 0, y: 0.02, color: '#000000', opacity: 0.5 }, box: { enabled: false } },
      css: { fontFamily: 'Cormorant Garamond', fontStyle: 'italic', color: '#F8F1E7', letterSpacing: '.04em', fontSize: '1.25em' },
    },
    {
      id: 'stamp', name: 'Hard Shadow',
      style: { font: 'Anton', weight: 400, italic: false, color: WHITE, letterSpacing: 0.02, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0, x: 0.04, y: 0.05, color: '#000000', opacity: 1 }, box: { enabled: false } },
      css: { fontFamily: 'Anton', color: WHITE, letterSpacing: '.02em', textShadow: '3px 3px 0 #000', fontSize: '1.15em' },
    },
    {
      id: 'marker', name: 'Marker',
      style: { font: 'Permanent Marker', weight: 400, italic: false, color: '#FFF176', stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.05, x: 0, y: 0.03, color: '#000000', opacity: 0.6 }, box: { enabled: false } },
      css: { fontFamily: 'Permanent Marker', color: '#FFF176' },
    },
    {
      id: 'bebasWide', name: 'Tall Caps',
      style: { font: 'Bebas Neue', weight: 400, italic: false, color: WHITE, letterSpacing: 0.08, stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.06, x: 0, y: 0.02, color: '#000000', opacity: 0.5 }, box: { enabled: false } },
      css: { fontFamily: 'Bebas Neue', color: WHITE, letterSpacing: '.1em', fontSize: '1.3em' },
    },
    {
      id: 'script', name: 'Script',
      style: { font: 'Pacifico', weight: 400, italic: false, color: '#FFE0B2', stroke: { width: 0 }, extrude: { depth: 0 }, shadow: { blur: 0.08, x: 0, y: 0.03, color: '#7A2E00', opacity: 0.6 }, box: { enabled: false } },
      css: { fontFamily: 'Pacifico', color: '#FFE0B2' },
    },
  ];

  /* ---- Helpers for templates ------------------------------------------- */
  const rand = (i, s) => Anim.hashRand(i, s); // deterministic [-1, 1]

  function words(text) {
    return text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  }

  /* Split words into clusters of `min..max` words, balanced. */
  function cluster(list, min, max) {
    const out = [];
    let i = 0;
    let k = 0;
    while (i < list.length) {
      const remaining = list.length - i;
      let n = min + Math.abs(Math.round(rand(k++, 99) * (max - min)));
      if (remaining - n > 0 && remaining - n < min) n = remaining; // avoid a tiny leftover
      n = Math.min(n, remaining);
      out.push(list.slice(i, i + n));
      i += n;
    }
    return out;
  }

  const BOLD = { font: 'Helvetica Neue', weight: 800, italic: false };
  const SERIF = { font: 'Instrument Serif', weight: 400, italic: true };

  function L(patch) {
    return deepMerge(defaultLayer(), patch);
  }

  /* Depth-placement helpers ------------------------------------------------
   * Words in these templates are static objects in 3D; the camera reveals them. Two facts drive the
   * geometry: at `depth` units from the lens the visible half-height is depth / camDist, and a layer
   * whose `size` is s appears (s * camDist / depth) of the frame height. So to compose a shot we say
   * where a word should sit ON SCREEN (u, v in half-frame units, ±1 = frame edge) and how big it
   * should look AT a chosen depth, and convert. */
  const SHARP = 1.6;               // middle of the default sharp band: where a word reads crisply
  const HILITE = '#FFD65C';
  function round3(v) { return Math.round(v * 1000) / 1000; }
  function atScreen(u, v, depth, camDist, aspect) {
    const halfH = depth / camDist;
    return { x: round3(u * halfH * aspect), y: round3(v * halfH) };
  }
  function sizeAt(base, depth, camDist) {
    return round3(base * (depth / camDist));
  }
  /* Depth of a word that the camera (travelling from camA to camB over the shot) passes at progress p,
   * arriving `gap` units in front of the lens at that moment. */
  function zForReveal(camA, camB, p, gap) {
    return round3(camA + (camB - camA) * p - gap);
  }

  /* ---- Templates -------------------------------------------------------- */
  const TEMPLATES = [
    {
      id: 'reveal',
      name: 'Camera Reveal',
      description: 'Zoomed into the footage, the camera pulls back and reveals words placed at different depths — the After Effects 3D-camera look. Sets the video to 160 % so it keeps filling the frame.',
      sample: 'and done easy right?',
      tags: ['Camera', 'Static text'],
      previewClass: 'tp-reveal',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const S = 1.6;                       // video scale
        const camEnd = d * S;                // camera distance where the scaled video exactly fills the frame
        const pull = Math.min(2.2, camEnd * 0.55); // how far the camera travels back
        const n = ws.length;
        const layers = [];
        const xs = [-0.28, 0.2, -0.05, 0.3, -0.25];
        const ys = [0.18, 0.02, -0.16, -0.3, 0.3];
        ws.forEach((w, i) => {
          // later words sit closer to the final camera; all lie inside the pull-back so each is revealed
          const z = camEnd - pull + 0.35 + (i * (pull - 0.9)) / Math.max(1, n - 1);
          const depthAtEnd = camEnd - z;
          const k = depthAtEnd / d;          // keeps the designed apparent size at the end frame
          const big = i === n - 1;
          const wx = xs[i % xs.length] * Math.min(1.3, aspect) + rand(i, 41) * 0.03;
          const wy = ys[i % ys.length] + rand(i, 42) * 0.03;
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: (big ? 0.15 : 0.1) * k, color: big ? '#FFD65C' : WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.12, x: 0, y: 0.04, color: '#000000', opacity: 0.6 } }, BOLD),
            transform: { x: wx * k, y: wy * k, z, rx: 0, ry: 0, rz: 0, scale: 1 },
            anim: {
              in: { type: 'none', duration: 0.3, easing: 'easeOut', stagger: 0 },
              out: { type: 'none', duration: 0.3, easing: 'easeIn', stagger: 0 },
              loop: { type: 'none', speed: 1 },
            },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: d - (camEnd - pull), easing: 'linear' }),
          Camera.defaultKey(start + duration * 0.85, { dolly: d - camEnd, easing: 'easeOut' }),
          Camera.defaultKey(start + duration, { dolly: d - camEnd, easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.55, sharpNear: 0.9, sharpFar: 3.6, farFade: 12 }, mediaSettings: { scale: S, x: 0, y: 0, locked: false } };
      },
    },
    {
      id: 'spiral',
      name: 'Spiral Reveal',
      description: 'Words wrap around the centre in a vortex, each turned to follow the curve, winding outward and toward the lens. The camera pulls back through them with a slow roll.',
      sample: 'how do you do that 3D text',
      tags: ['Camera', 'Spiral'],
      previewClass: 'tp-spiral',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const S = 1.6, camEnd = d * S, pull = Math.min(2.4, camEnd * 0.6), camStart = camEnd - pull;
        const n = ws.length;
        // A vortex: the sentence winds out from a clear centre, small and deep at the eye of the
        // spiral, larger and nearer the lens at the outside, every word turned along the curve.
        // 100° per word: enough to open a real spiral, and never lands a later word back on top of
        // an earlier one (the closest any two turns come is 40°).
        const aStep = n <= 3 ? 62 : 100;
        // Pull the ring most of the way back to a circle in pixels, so a tall frame does not squash
        // the vortex into a narrow oval that makes neighbouring words collide.
        const ex = 1 - 0.7 * (1 - Math.min(1, 1 / Math.max(aspect, 0.01)));
        const ey = 1 - 0.7 * (1 - Math.min(1, aspect));
        const layers = [];
        ws.forEach((w, i) => {
          const f = n > 1 ? i / (n - 1) : 1;                 // 0 at the eye, 1 at the outside
          const p = 0.14 + 0.64 * f;                         // all seven are in place before the end
          // Later words are revealed further from the lens, so the big outer ones do not sweep in
          // enormous and half out of frame — each lands close to the size it settles at.
          const z = zForReveal(camStart, camEnd, p, SHARP + 0.9 * f);
          const depthEnd = camEnd - z;                       // depth in the settled last frame
          const deg = -105 + i * aStep;                      // starts low, winds anticlockwise
          const a = (deg * Math.PI) / 180;
          // The radius opens quickly at the eye so the inner words do not crowd each other.
          const R = 0.32 + 0.42 * Math.pow(f, 0.65);         // fraction of the frame, spirals out
          const last = i === n - 1;
          const pos = atScreen(Math.cos(a) * R * ex, Math.sin(a) * R * ey, depthEnd, d, aspect);
          // Turn each word along the tangent of the curve — this is what makes the ring read as a
          // spiral instead of a scatter, and words on the far side end up upside down.
          let roll = deg + 90;
          while (roll > 180) roll -= 360;
          while (roll < -180) roll += 360;
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: sizeAt(0.052 + 0.088 * f, depthEnd, d), color: last ? HILITE : WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.16, x: 0, y: 0.02, color: '#000000', opacity: 0.5 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: 0, rz: round3(roll), scale: 1 },
            anim: { in: { type: 'none' }, out: { type: 'none' }, loop: { type: 'none', speed: 1 } },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: round3(d - camStart), roll: -14, easing: 'linear' }),
          Camera.defaultKey(start + duration, { dolly: round3(d - camEnd), roll: 4, easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.6, sharpNear: 0.9, sharpFar: 4.2, farFade: 12 }, mediaSettings: { scale: S, x: 0, y: 0, locked: false } };
      },
    },
    {
      id: 'tunnel',
      name: 'Tunnel Fly-through',
      description: 'Words ring the centre at rising depths and the camera flies forward down the middle, each word sweeping out past the edge of the frame.',
      sample: 'straight through the middle of it all',
      tags: ['Camera', 'Fly-through'],
      previewClass: 'tp-tunnel',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const camStart = d + 2.2, camEnd = 1.75;           // pushes forward, stopping short of the video
        const n = ws.length;
        const layers = [];
        ws.forEach((w, i) => {
          const p = n > 1 ? 0.12 + (0.78 * i) / (n - 1) : 0.5;
          const z = zForReveal(camStart, camEnd, p, SHARP);
          const a = (i * 104) * Math.PI / 180;
          const R = 0.5 + (i % 2) * 0.14;
          const pos = atScreen(Math.cos(a) * R, Math.sin(a) * R, SHARP, d, aspect);
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: sizeAt(0.1, SHARP, d), color: i % 3 === 2 ? HILITE : WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.12, x: 0, y: 0.04, color: '#000000', opacity: 0.55 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: round3(-Math.cos(a) * 12), rz: 0, scale: 1 },
            anim: { in: { type: 'none' }, out: { type: 'none' }, loop: { type: 'none', speed: 1 } },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: round3(d - camStart), easing: 'linear' }),
          Camera.defaultKey(start + duration, { dolly: round3(d - camEnd), easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.7, sharpNear: 1, sharpFar: 3.2, farFade: 5.5 }, mediaSettings: { scale: 1, x: 0, y: 0, locked: true } };
      },
    },
    {
      id: 'corridor',
      name: 'Corridor Signs',
      description: 'Words hang left and right like signs along a street, angled toward the lens, while the camera tracks steadily forward past them.',
      sample: 'walk past every single word',
      tags: ['Camera', 'Left / right'],
      previewClass: 'tp-corridor',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const camStart = d + 1.9, camEnd = 1.8;
        const n = ws.length;
        const layers = [];
        ws.forEach((w, i) => {
          const p = n > 1 ? 0.12 + (0.78 * i) / (n - 1) : 0.5;
          const z = zForReveal(camStart, camEnd, p, SHARP);
          const left = i % 2 === 0;
          const pos = atScreen(left ? -0.6 : 0.6, round3(0.12 + rand(i, 61) * 0.3), SHARP, d, aspect);
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: sizeAt(0.105, SHARP, d), color: WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.14, x: left ? 0.03 : -0.03, y: 0.04, color: '#000000', opacity: 0.6 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: round3(left ? 32 : -32), rz: 0, scale: 1 },
            anim: { in: { type: 'none' }, out: { type: 'none' }, loop: { type: 'none', speed: 1 } },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: round3(d - camStart), easing: 'linear' }),
          Camera.defaultKey(start + duration, { dolly: round3(d - camEnd), easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.65, sharpNear: 1, sharpFar: 3, farFade: 5 }, mediaSettings: { scale: 1, x: 0, y: 0, locked: true } };
      },
    },
    {
      id: 'orbit',
      name: 'Orbit Cloud',
      description: 'Words float in a loose cloud at mixed depths while the camera arcs around them, so they slide past each other with real parallax.',
      sample: 'look around the whole idea',
      tags: ['Camera', 'Orbit'],
      previewClass: 'tp-orbit',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const pivot = 1.0;                 // depth of the cloud centre in front of the video
        const radius = 2.0;                // camera distance from the cloud centre
        const layers = [];
        ws.forEach((w, i) => {
          const z = round3(pivot + rand(i, 71) * 0.45);
          const depth = radius - (z - pivot);
          const big = i % 4 === 3;
          const pos = atScreen(round3(rand(i, 72) * 0.55), round3(rand(i, 73) * 0.45), depth, d, aspect);
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: sizeAt(big ? 0.125 : 0.095, depth, d), color: big ? HILITE : WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.12, x: 0, y: 0.04, color: '#000000', opacity: 0.55 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: round3(rand(i, 74) * 12), rz: round3(rand(i, 75) * 4), scale: 1 },
            anim: { in: { type: 'none' }, out: { type: 'none' }, loop: { type: 'none', speed: 1 } },
          }));
        });
        const cameraKeys = [];
        const steps = 6, sweep = 40;
        for (let i = 0; i < steps; i++) {
          const q = i / (steps - 1);
          const a = -sweep / 2 + sweep * q;
          const rad = (a * Math.PI) / 180;
          cameraKeys.push(Camera.defaultKey(start + duration * q, {
            x: round3(Math.sin(rad) * radius),
            dolly: round3(d - (pivot + Math.cos(rad) * radius)),
            yaw: round3(a),
            easing: i === 0 ? 'linear' : i === 1 ? 'easeOut' : i === steps - 1 ? 'easeIn' : 'linear',
          }));
        }
        return { layers, cameraKeys, cameraSettings: { aperture: 0.55, sharpNear: 1.1, sharpFar: 3.4, farFade: 12 }, mediaSettings: { scale: 1, x: 0, y: 0, locked: true } };
      },
    },
    {
      id: 'steps',
      name: 'Rising Steps',
      description: 'Words climb like a staircase into the distance while the camera cranes up and pulls back, revealing one step at a time.',
      sample: 'one step at a time',
      tags: ['Camera', 'Staircase'],
      previewClass: 'tp-steps',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const S = 1.5, camEnd = d * S, pull = Math.min(2.2, camEnd * 0.56), camStart = camEnd - pull;
        const n = ws.length;
        const layers = [];
        ws.forEach((w, i) => {
          const p = n > 1 ? 0.18 + (0.74 * i) / (n - 1) : 0.5;
          const z = zForReveal(camStart, camEnd, p, SHARP);
          const depthEnd = camEnd - z;
          const q = n > 1 ? i / (n - 1) : 0.5;
          const pos = atScreen(round3(-0.5 + q), round3(-0.45 + q * 0.9), depthEnd, d, aspect);
          layers.push(L({
            name: w, text: w, start, end: start + duration,
            style: Object.assign({ size: sizeAt(0.1, depthEnd, d), color: i === n - 1 ? HILITE : WHITE, letterSpacing: -0.02,
              shadow: { blur: 0.12, x: 0.02, y: 0.05, color: '#000000', opacity: 0.6 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: -13, rz: 0, scale: 1 },
            anim: { in: { type: 'none' }, out: { type: 'none' }, loop: { type: 'none', speed: 1 } },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: round3(d - camStart), y: -0.16, pitch: 4, easing: 'linear' }),
          Camera.defaultKey(start + duration, { dolly: round3(d - camEnd), y: 0.2, pitch: -5, easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.6, sharpNear: 0.9, sharpFar: 4.2, farFade: 12 }, mediaSettings: { scale: S, x: 0, y: 0, locked: false } };
      },
    },
    {
      id: 'punch',
      name: 'Centre Punch',
      description: 'One word at a time, dead centre, each sitting deeper than the last while the camera keeps pulling back — a punchy read that still has depth.',
      sample: 'quick sharp punchy lines',
      tags: ['Camera', 'One at a time'],
      previewClass: 'tp-punch',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const d = (cam && cam.camDist) || 2.414;
        const S = 1.7, camEnd = d * S, pull = Math.min(2.6, camEnd * 0.6), camStart = camEnd - pull;
        const n = ws.length;
        const each = duration / n;
        const layers = [];
        ws.forEach((w, i) => {
          const p = (i + 0.5) / n;
          const z = zForReveal(camStart, camEnd, p, SHARP);
          const pos = atScreen(round3(rand(i, 81) * 0.08), round3(rand(i, 82) * 0.1), SHARP, d, aspect);
          layers.push(L({
            name: w, text: w,
            start: round3(start + i * each), end: round3(start + (i + 1) * each + Math.min(0.1, each * 0.15)),
            style: Object.assign({ size: sizeAt(i % 2 ? 0.11 : 0.145, SHARP, d), color: i % 2 ? WHITE : HILITE, letterSpacing: -0.03,
              shadow: { blur: 0.14, x: 0, y: 0.05, color: '#000000', opacity: 0.6 } }, BOLD),
            transform: { x: pos.x, y: pos.y, z, rx: 0, ry: 0, rz: 0, scale: 1 },
            anim: {
              in: { type: 'focus', duration: Math.min(0.25, each * 0.3), easing: 'easeOut', stagger: 0 },
              out: { type: 'fade', duration: Math.min(0.18, each * 0.22), easing: 'easeIn', stagger: 0 },
              loop: { type: 'none', speed: 1 },
            },
          }));
        });
        const cameraKeys = [
          Camera.defaultKey(start, { dolly: round3(d - camStart), easing: 'linear' }),
          Camera.defaultKey(start + duration, { dolly: round3(d - camEnd), easing: 'linear' }),
        ];
        return { layers, cameraKeys, cameraSettings: { aperture: 0.55, sharpNear: 0.9, sharpFar: 3.4, farFade: 12 }, mediaSettings: { scale: S, x: 0, y: 0, locked: false } };
      },
    },
    {
      id: 'kinetic',
      name: 'Kinetic Words',
      description: 'Words fly in from the lens and settle at different depths while the camera drifts through them — the reference look.',
      sample: "here's how you can do this 3D text effect and it's much easier than you think",
      tags: ['Complex', 'Word by word'],
      previewClass: 'tp-kinetic',
      build(text, start, duration, aspect, cam) {
        const ws = words(text);
        if (!ws.length) return [];
        const camDist = (cam && cam.camDist) || 2.414;
        const clusters = cluster(ws, 3, 4);
        const weights = clusters.map((c) => c.length + 1.2);
        const totalW = weights.reduce((a, b) => a + b, 0);
        const layers = [];
        const cameraKeys = [];
        let t = start;
        clusters.forEach((cl, ci) => {
          const cdur = (duration * weights[ci]) / totalW;
          const n = cl.length;
          const step = (cdur * 0.5) / n;
          const baseY = 0.25 - Math.abs(rand(ci, 5)) * 0.45; // cluster centre height
          const lineStep = 0.3;
          const top = baseY + ((n - 1) * lineStep) / 2;
          const sign = ci % 2 === 0 ? 1 : -1;
          cl.forEach((w, i) => {
            const gi = ci * 10 + i;
            const serif = i % 2 === 1;
            const last = i === n - 1;
            const orange = (gi % 3 === 2) || (last && ci % 2 === 1);
            const size = (serif ? 0.14 : 0.11) * (last ? 1.25 : 1) * (1 + rand(gi, 7) * 0.08) * Math.min(1, 0.75 + aspect * 0.35);
            const xJit = (i % 2 === 0 ? -1 : 1) * (0.1 + Math.abs(rand(gi, 8)) * 0.12) * Math.min(1.4, aspect);
            layers.push(L({
              name: w,
              text: w,
              start: t + i * step,
              end: t + cdur,
              style: Object.assign({ size, color: orange ? ORANGE : WHITE,
                shadow: { blur: 0.08, x: 0.01, y: 0.04, color: '#000000', opacity: 0.5 } }, serif ? SERIF : BOLD),
              transform: {
                x: xJit + rand(gi, 9) * 0.1,
                y: top - i * lineStep + rand(gi, 10) * 0.04,
                z: 0.05 + Math.abs(rand(gi, 11)) * 0.5,
                rx: rand(gi, 12) * 6,
                ry: rand(gi, 13) * 22,
                rz: rand(gi, 14) * 7,
                scale: 1,
              },
              anim: {
                in: { type: i % 2 === 0 ? 'zoomThrough' : 'focus', duration: 0.55, easing: i % 2 === 0 ? 'expoOut' : 'easeOut', stagger: 0 },
                out: { type: 'fade', duration: 0.2, easing: 'easeIn', stagger: 0 },
                loop: { type: 'float', speed: 0.6 },
              },
            }));
          });
          // Camera: drift in with a slight orbit while the words appear, then push through them.
          cameraKeys.push(Camera.defaultKey(t, { x: 0.04 * sign, dolly: -0.1, yaw: -2.5 * sign, easing: 'linear' }));
          cameraKeys.push(Camera.defaultKey(t + cdur - 0.45, { x: -0.03 * sign, dolly: 0.3, yaw: 2.5 * sign, easing: 'easeInOut' }));
          cameraKeys.push(Camera.defaultKey(t + cdur - 0.02, { x: -0.03 * sign, dolly: camDist + 0.35, yaw: 2.5 * sign, easing: 'easeIn' }));
          t += cdur;
        });
        return { layers, cameraKeys, cameraSettings: { aperture: 0.7, sharpNear: 0.7, sharpFar: 2.6, farFade: 12 }, mediaSettings: { locked: true } };
      },
    },
    {
      id: 'stack',
      name: 'Stacked Headline',
      description: 'Big words stacked vertically on a tilted plane, sliding in from alternating sides.',
      sample: 'MAKE IT BOLD',
      tags: ['Complex', 'Perspective'],
      previewClass: 'tp-stack',
      build(text, start, duration) {
        const ws = words(text);
        return [L({
          name: 'Stack',
          text: ws.join('\n'),
          start, end: start + duration,
          split: 'word',
          style: { font: 'Anton', weight: 400, size: 0.16, lineHeight: 0.95, align: 'left', color: WHITE, letterSpacing: 0.01,
            shadow: { blur: 0.1, x: 0.03, y: 0.05, color: '#000000', opacity: 0.55 } },
          transform: { x: -0.15, y: 0, z: 0, rx: 4, ry: -28, rz: 0, scale: 1 },
          anim: {
            in: { type: 'slideLeft', duration: 0.6, easing: 'expoOut', stagger: 0.12 },
            out: { type: 'slideRight', duration: 0.5, easing: 'easeIn', stagger: 0.06 },
            loop: { type: 'none', speed: 1 },
          },
        })];
      },
    },
    {
      id: 'flyTitle',
      name: 'Fly-in Title',
      description: 'A headline flies in from the camera with motion blur, then a subtitle rises underneath.',
      sample: 'NEW SEASON\nAvailable now',
      tags: ['Complex', 'Title + subtitle'],
      previewClass: 'tp-fly',
      build(text, start, duration) {
        const lines = text.split('\n');
        const title = lines[0] || 'TITLE';
        const sub = lines.slice(1).join(' ') || '';
        const layers = [L({
          name: 'Title', text: title, start, end: start + duration,
          style: { font: 'Archivo Black', weight: 400, size: 0.14, color: WHITE, letterSpacing: -0.01,
            extrude: { depth: 0.04, color: '#222222', angle: 60 }, shadow: { blur: 0.1, x: 0, y: 0.05, color: '#000000', opacity: 0.5 } },
          transform: { x: 0, y: 0.08, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
          anim: {
            in: { type: 'zoomThrough', duration: 0.7, easing: 'expoOut', stagger: 0 },
            out: { type: 'zoomAway', duration: 0.5, easing: 'easeIn', stagger: 0 },
            loop: { type: 'sway3d', speed: 0.5 },
          },
        })];
        if (sub) {
          layers.push(L({
            name: 'Subtitle', text: sub, start: start + 0.45, end: start + duration,
            style: Object.assign({ size: 0.085, color: ORANGE, letterSpacing: 0.02 }, SERIF),
            transform: { x: 0, y: -0.14, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
            anim: {
              in: { type: 'rise', duration: 0.6, easing: 'easeOut', stagger: 0 },
              out: { type: 'fade', duration: 0.4, easing: 'easeIn', stagger: 0 },
              loop: { type: 'none', speed: 1 },
            },
          }));
        }
        return layers;
      },
    },
    {
      id: 'caption',
      name: 'Typewriter Caption',
      description: 'A boxed caption at the bottom that types itself out.',
      sample: 'Recorded on location in Tokyo',
      tags: ['Simple', 'Caption'],
      previewClass: 'tp-caption',
      build(text, start, duration) {
        const n = Math.max(1, text.replace(/\s/g, '').length);
        return [L({
          name: 'Caption', text, start, end: start + duration, split: 'char',
          style: { font: 'Space Grotesk', weight: 700, size: 0.05, color: WHITE, shadow: { opacity: 0 },
            box: { enabled: true, color: '#000000', opacity: 0.72, padding: 0.3, radius: 0.12 } },
          transform: { x: 0, y: -0.78, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
          anim: {
            in: { type: 'typewriter', duration: 0.05, easing: 'linear', stagger: Math.min(0.08, (duration * 0.4) / n) },
            out: { type: 'fade', duration: 0.3, easing: 'easeIn', stagger: 0 },
            loop: { type: 'none', speed: 1 },
          },
        })];
      },
    },
    {
      id: 'flipWords',
      name: 'Word Swap',
      description: 'Each word replaces the previous one in the centre with a 3D flip.',
      sample: 'Faster Smarter Bolder',
      tags: ['Complex', 'Sequential'],
      previewClass: 'tp-flip',
      build(text, start, duration) {
        const ws = words(text);
        if (!ws.length) return [];
        const each = duration / ws.length;
        return ws.map((w, i) => L({
          name: w, text: w, start: start + i * each, end: start + (i + 1) * each + (i === ws.length - 1 ? 0 : 0.001),
          style: { font: 'Montserrat', weight: 900, size: 0.16, color: i % 2 ? ORANGE : WHITE, letterSpacing: -0.02,
            shadow: { blur: 0.08, x: 0, y: 0.04, color: '#000000', opacity: 0.5 } },
          transform: { x: 0, y: 0, z: 0.1, rx: 0, ry: 0, rz: 0, scale: 1 },
          anim: {
            in: { type: 'flipX', duration: Math.min(0.45, each * 0.4), easing: 'backOut', stagger: 0 },
            out: { type: 'flipX', duration: Math.min(0.35, each * 0.3), easing: 'easeIn', stagger: 0 },
            loop: { type: 'none', speed: 1 },
          },
        }));
      },
    },
    {
      id: 'floor',
      name: 'Floor Crawl',
      description: 'Text laid flat on the ground plane, receding into the distance.',
      sample: 'A long time ago\nin a studio far, far away',
      tags: ['Complex', 'Perspective'],
      previewClass: 'tp-floor',
      build(text, start, duration) {
        return [L({
          name: 'Crawl', text, start, end: start + duration,
          style: { font: 'Anton', weight: 400, size: 0.13, lineHeight: 1.15, color: '#FFD23F', letterSpacing: 0.01, shadow: { opacity: 0 } },
          transform: { x: 0, y: -0.55, z: 0.1, rx: -62, ry: 0, rz: 0, scale: 1 },
          anim: {
            in: { type: 'slideDown', duration: Math.max(1, duration * 0.8), easing: 'linear', stagger: 0 },
            out: { type: 'fade', duration: 0.6, easing: 'easeIn', stagger: 0 },
            loop: { type: 'none', speed: 1 },
          },
        })];
      },
    },
    {
      id: 'wall',
      name: 'Wall Text',
      description: 'Left-aligned copy pinned to a wall angled away from the camera, popping in word by word.',
      sample: 'Designed for\npeople who move',
      tags: ['Complex', 'Perspective'],
      previewClass: 'tp-wall',
      build(text, start, duration) {
        return [L({
          name: 'Wall', text, start, end: start + duration, split: 'word',
          style: { font: 'Inter', weight: 900, size: 0.12, lineHeight: 1.05, align: 'left', color: WHITE, letterSpacing: -0.02,
            shadow: { blur: 0.12, x: 0.04, y: 0.06, color: '#000000', opacity: 0.6 } },
          transform: { x: 0.05, y: 0.05, z: 0, rx: 0, ry: 42, rz: 0, scale: 1 },
          anim: {
            in: { type: 'pop', duration: 0.5, easing: 'backOut', stagger: 0.1 },
            out: { type: 'focus', duration: 0.4, easing: 'easeIn', stagger: 0.04 },
            loop: { type: 'none', speed: 1 },
          },
        })];
      },
    },
    {
      id: 'lowerThird',
      name: 'Lower Third',
      description: 'Name and role in the bottom-left corner, sliding in from the left.',
      sample: 'Alex Rivera\nCreative Director',
      tags: ['Simple', 'Broadcast'],
      previewClass: 'tp-lower',
      build(text, start, duration, aspect) {
        const lines = text.split('\n');
        const name = lines[0] || 'Name';
        const role = lines.slice(1).join(' ');
        const x = -aspect + 0.55;
        const layers = [L({
          name: 'Name', text: name, start, end: start + duration,
          style: { font: 'Inter', weight: 900, size: 0.075, align: 'left', color: WHITE, shadow: { blur: 0.06, x: 0, y: 0.03, color: '#000000', opacity: 0.5 } },
          transform: { x: x + 0.3, y: -0.62, z: 0, rx: 0, ry: 12, rz: 0, scale: 1 },
          anim: {
            in: { type: 'slideRight', duration: 0.55, easing: 'expoOut', stagger: 0 },
            out: { type: 'slideRight', duration: 0.4, easing: 'easeIn', stagger: 0 },
            loop: { type: 'none', speed: 1 },
          },
        })];
        if (role) {
          layers.push(L({
            name: 'Role', text: role, start: start + 0.15, end: start + duration,
            style: { font: 'Space Grotesk', weight: 700, size: 0.042, align: 'left', color: WHITE, letterSpacing: 0.04, shadow: { opacity: 0 },
              box: { enabled: true, color: ORANGE, opacity: 1, padding: 0.35, radius: 0.1 } },
            transform: { x: x + 0.22, y: -0.76, z: 0, rx: 0, ry: 12, rz: 0, scale: 1 },
            anim: {
              in: { type: 'slideRight', duration: 0.55, easing: 'expoOut', stagger: 0 },
              out: { type: 'slideRight', duration: 0.4, easing: 'easeIn', stagger: 0 },
              loop: { type: 'none', speed: 1 },
            },
          }));
        }
        return layers;
      },
    },
    {
      id: 'scatter',
      name: 'Scatter Assemble',
      description: 'Letters fly in from everywhere and lock into place, then tumble away.',
      sample: 'ASSEMBLE',
      tags: ['Complex', 'Letter by letter'],
      previewClass: 'tp-scatter',
      build(text, start, duration) {
        return [L({
          name: 'Scatter', text, start, end: start + duration, split: 'char',
          style: { font: 'Archivo Black', weight: 400, size: 0.15, color: WHITE, letterSpacing: 0.02,
            extrude: { depth: 0.05, color: '#333333', angle: 50 }, shadow: { blur: 0.08, x: 0, y: 0.05, color: '#000000', opacity: 0.45 } },
          transform: { x: 0, y: 0, z: 0, rx: 0, ry: -12, rz: 0, scale: 1 },
          anim: {
            in: { type: 'scatter', duration: 0.9, easing: 'expoOut', stagger: 0.04 },
            out: { type: 'tumble', duration: 0.6, easing: 'easeIn', stagger: 0.03 },
            loop: { type: 'float', speed: 0.8 },
          },
        })];
      },
    },
    {
      id: 'neon',
      name: 'Neon Sign',
      description: 'A glowing sign that flickers on and pulses.',
      sample: 'OPEN LATE',
      tags: ['Simple', 'Glow'],
      previewClass: 'tp-neon',
      build(text, start, duration) {
        return [L({
          name: 'Neon', text, start, end: start + duration,
          style: { font: 'Bebas Neue', weight: 400, size: 0.2, color: '#FFF4FA', letterSpacing: 0.08,
            stroke: { width: 0.012, color: '#FF3D9A' }, shadow: { blur: 0.4, x: 0, y: 0, color: '#FF3D9A', opacity: 1 } },
          transform: { x: 0, y: 0.05, z: 0, rx: 0, ry: -18, rz: -3, scale: 1 },
          anim: {
            in: { type: 'glitch', duration: 0.8, easing: 'linear', stagger: 0 },
            out: { type: 'fade', duration: 0.3, easing: 'easeIn', stagger: 0 },
            loop: { type: 'flicker', speed: 1 },
          },
        })];
      },
    },
    {
      id: 'bouncy',
      name: 'Bouncy Pop',
      description: 'Comic-style words that pop and wobble, one after another.',
      sample: 'WOW THAT WAS FAST',
      tags: ['Simple', 'Word by word'],
      previewClass: 'tp-bouncy',
      build(text, start, duration) {
        return [L({
          name: 'Bouncy', text: words(text).join('  '), start, end: start + duration, split: 'word',
          style: { font: 'Bangers', weight: 400, size: 0.14, color: '#FFD23F', letterSpacing: 0.02,
            stroke: { width: 0.012, color: '#1A1A1A' }, extrude: { depth: 0.07, color: '#D7263D', angle: 60 }, shadow: { opacity: 0 } },
          transform: { x: 0, y: 0, z: 0.05, rx: 0, ry: 0, rz: -4, scale: 1 },
          anim: {
            in: { type: 'pop', duration: 0.5, easing: 'backOut', stagger: 0.14 },
            out: { type: 'drop', duration: 0.5, easing: 'easeIn', stagger: 0.05 },
            loop: { type: 'wobble', speed: 1.2 },
          },
        })];
      },
    },
    {
      id: 'quote',
      name: 'Elegant Quote',
      description: 'Serif italic lines that rise softly, with a small attribution.',
      sample: 'Simplicity is the\nultimate sophistication\n— Leonardo da Vinci',
      tags: ['Simple', 'Editorial'],
      previewClass: 'tp-quote',
      build(text, start, duration) {
        const lines = text.split('\n');
        const attrib = lines.length > 1 && /^[—-]/.test(lines[lines.length - 1].trim()) ? lines.pop() : '';
        const layers = [L({
          name: 'Quote', text: lines.join('\n'), start, end: start + duration, split: 'word',
          style: Object.assign({ size: 0.11, lineHeight: 1.15, color: '#F8F1E7', shadow: { blur: 0.05, x: 0, y: 0.02, color: '#000000', opacity: 0.45 } }, SERIF),
          transform: { x: 0, y: 0.08, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
          anim: {
            in: { type: 'rise', duration: 0.8, easing: 'easeOut', stagger: 0.08 },
            out: { type: 'fade', duration: 0.6, easing: 'easeIn', stagger: 0.03 },
            loop: { type: 'none', speed: 1 },
          },
        })];
        if (attrib) {
          layers.push(L({
            name: 'Attribution', text: attrib, start: start + 0.9, end: start + duration,
            style: { font: 'Space Grotesk', weight: 400, size: 0.045, color: ORANGE, letterSpacing: 0.1, shadow: { opacity: 0 } },
            transform: { x: 0, y: -0.28, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
            anim: {
              in: { type: 'fade', duration: 0.6, easing: 'easeOut', stagger: 0 },
              out: { type: 'fade', duration: 0.5, easing: 'easeIn', stagger: 0 },
              loop: { type: 'none', speed: 1 },
            },
          }));
        }
        return layers;
      },
    },
  ];

  global.Presets = { defaultLayer, deepMerge, STYLES, TEMPLATES, ORANGE, WHITE };
})(window);
