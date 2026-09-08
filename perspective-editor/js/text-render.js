/* Text layout + rasterisation to 2D canvases that become WebGL textures.
 *
 * World units: the video plane is 2 units tall (y in [-1, 1]). A layer's font size is a fraction of
 * the frame height, so a texture rendered for a frame of `frameHeightPx` pixels has fontPx = size * frameHeightPx.
 */
(function (global) {
  'use strict';

  const FONTS = [
    { family: 'Inter', weights: [400, 700, 900], italic: false, category: 'Sans' },
    { family: 'Archivo Black', weights: [400], italic: false, category: 'Sans' },
    { family: 'Anton', weights: [400], italic: false, category: 'Sans' },
    { family: 'Bebas Neue', weights: [400], italic: false, category: 'Sans' },
    { family: 'Oswald', weights: [400, 700], italic: false, category: 'Sans' },
    { family: 'Montserrat', weights: [400, 700, 900], italic: true, category: 'Sans' },
    { family: 'Space Grotesk', weights: [400, 700], italic: false, category: 'Sans' },
    { family: 'Instrument Serif', weights: [400], italic: true, category: 'Serif' },
    { family: 'Playfair Display', weights: [400, 700, 900], italic: true, category: 'Serif' },
    { family: 'DM Serif Display', weights: [400], italic: true, category: 'Serif' },
    { family: 'Cormorant Garamond', weights: [400, 700], italic: true, category: 'Serif' },
    { family: 'Bangers', weights: [400], italic: false, category: 'Display' },
    { family: 'Pacifico', weights: [400], italic: false, category: 'Script' },
    { family: 'Caveat', weights: [400, 700], italic: false, category: 'Script' },
    { family: 'Permanent Marker', weights: [400], italic: false, category: 'Display' },
  ];

  const MAX_TEX = 4096;
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');

  /* Simple LRU cache of rasterised groups. */
  const cache = new Map();
  const CACHE_LIMIT = 600;
  function cacheGet(key) {
    const v = cache.get(key);
    if (v) { cache.delete(key); cache.set(key, v); }
    return v;
  }
  function cacheSet(key, v) {
    cache.set(key, v);
    if (cache.size > CACHE_LIMIT) {
      const first = cache.keys().next().value;
      cache.delete(first);
    }
  }
  function clearCache() { cache.clear(); }

  function fontString(style, fontPx) {
    return `${style.italic ? 'italic ' : ''}${style.weight || 400} ${fontPx}px "${style.font}", sans-serif`;
  }

  function hexToRgba(hex, alpha) {
    let h = (hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha == null ? 1 : alpha})`;
  }

  function styleKey(style) {
    return JSON.stringify(style);
  }

  function setupCtx(ctx, style, fontPx) {
    ctx.font = fontString(style, fontPx);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(style.letterSpacing || 0) * fontPx}px`;
  }

  function measureWidth(ctx, str) {
    return ctx.measureText(str).width;
  }

  /* Amount of empty space around glyphs so shadows, extrusion, and shader blur never clip. */
  function paddingFor(style, fontPx) {
    const sh = style.shadow || {};
    const ex = style.extrude || {};
    const st = style.stroke || {};
    const bx = style.box || {};
    let em = 0.55 + (sh.blur || 0) + Math.max(Math.abs(sh.x || 0), Math.abs(sh.y || 0)) + (ex.depth || 0) + (st.width || 0);
    if (bx.enabled) em += (bx.padding || 0);
    return Math.ceil(em * fontPx);
  }

  /* Draw a string with the full style stack at baseline position (x, y). */
  function paintText(ctx, str, x, y, style, fontPx, bbox) {
    const sh = style.shadow || {};
    const ex = style.extrude || {};
    const st = style.stroke || {};
    const bx = style.box || {};

    if (bx.enabled && bbox) {
      const p = (bx.padding || 0) * fontPx;
      const r = Math.min((bx.radius || 0) * fontPx, (bbox.h + 2 * p) / 2);
      ctx.save();
      ctx.fillStyle = hexToRgba(bx.color, bx.opacity == null ? 1 : bx.opacity);
      roundRect(ctx, bbox.x - p, bbox.y - p, bbox.w + 2 * p, bbox.h + 2 * p, r);
      ctx.fill();
      ctx.restore();
    }

    // Shadow pass
    if ((sh.opacity || 0) > 0 && ((sh.blur || 0) > 0 || sh.x || sh.y)) {
      ctx.save();
      ctx.shadowColor = hexToRgba(sh.color, sh.opacity);
      ctx.shadowBlur = (sh.blur || 0) * fontPx;
      ctx.shadowOffsetX = (sh.x || 0) * fontPx;
      ctx.shadowOffsetY = (sh.y || 0) * fontPx;
      ctx.fillStyle = style.color;
      ctx.globalAlpha = 1;
      ctx.fillText(str, x, y);
      ctx.restore();
    }

    // Extrusion pass (fake 3D depth)
    if ((ex.depth || 0) > 0) {
      const depthPx = ex.depth * fontPx;
      const ang = ((ex.angle == null ? 45 : ex.angle) * Math.PI) / 180;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const steps = Math.max(1, Math.ceil(depthPx));
      ctx.save();
      ctx.fillStyle = ex.color || '#000';
      for (let i = steps; i >= 1; i--) {
        const k = (i / steps) * depthPx;
        ctx.fillText(str, x + dx * k, y + dy * k);
      }
      ctx.restore();
    }

    // Fill
    if (style.color && style.color !== 'transparent') {
      ctx.fillStyle = style.color;
      ctx.fillText(str, x, y);
    }

    // Stroke
    if ((st.width || 0) > 0) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = st.width * fontPx;
      ctx.strokeStyle = st.color || '#000';
      ctx.strokeText(str, x, y);
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Rasterise one group of text (possibly several lines for the "whole" split) into a canvas. */
  function rasterise(lines, style, fontPx, metrics) {
    // lines: [{ str, x, baseline }] in unpadded px space; returns canvas + unscaled px dims
    const pad = paddingFor(style, fontPx);
    const W = metrics.w + pad * 2;
    const H = metrics.h + pad * 2;
    const scale = Math.min(1, MAX_TEX / Math.max(W, H));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(W * scale));
    canvas.height = Math.max(1, Math.ceil(H * scale));
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    setupCtx(ctx, style, fontPx);

    const bbox = style.box && style.box.enabled ? {
      x: pad, y: pad + metrics.boxTop, w: metrics.w, h: metrics.boxH,
    } : null;

    // Box drawn once behind all lines
    if (bbox) paintText(ctx, '', 0, 0, { box: style.box }, fontPx, bbox);

    for (const ln of lines) {
      paintText(ctx, ln.str, pad + ln.x, pad + ln.baseline, style, fontPx, null);
    }
    return { canvas, pxW: W, pxH: H, pad };
  }

  /**
   * Lay out a layer's text into glyph groups.
   * Returns { groups: [{ key, canvas, w, h, cx, cy, index }], blockW, blockH, fontPx }
   *   w, h, cx, cy are in world units relative to the layer origin (y up).
   */
  function layout(layer, frameHeightPx) {
    const style = layer.style;
    const fontPx = Math.max(4, Math.round(style.size * frameHeightPx));
    const pxPerUnit = frameHeightPx / 2;
    setupCtx(mctx, style, fontPx);

    const lineAdv = (style.lineHeight || 1.1) * fontPx;
    const capM = mctx.measureText('H');
    const capH = capM.actualBoundingBoxAscent || fontPx * 0.7;
    const fullM = mctx.measureText('Hgj');
    const ascent = fullM.fontBoundingBoxAscent || fontPx * 0.9;
    const descent = fullM.fontBoundingBoxDescent || fontPx * 0.25;

    const rawLines = (layer.text || '').split('\n');
    const lineInfos = rawLines.map((str) => ({ str, width: measureWidth(mctx, str) }));
    const blockW = Math.max(1, ...lineInfos.map((l) => l.width));
    const blockH = rawLines.length * lineAdv;
    const align = style.align || 'center';
    lineInfos.forEach((l, i) => {
      l.x = align === 'left' ? 0 : align === 'right' ? blockW - l.width : (blockW - l.width) / 2;
      l.center = i * lineAdv + lineAdv / 2;
      l.baseline = l.center + capH / 2;
    });

    const split = layer.split || 'whole';
    const groups = [];
    const keyBase = styleKey(style) + '|' + fontPx;

    const toWorld = (pxW, pxH, cxPx, cyPx) => ({
      w: pxW / pxPerUnit,
      h: pxH / pxPerUnit,
      cx: (cxPx - blockW / 2) / pxPerUnit,
      cy: -(cyPx - blockH / 2) / pxPerUnit,
    });

    if (split === 'whole') {
      const key = keyBase + '|W|' + (layer.text || '');
      let r = cacheGet(key);
      if (!r) {
        r = rasterise(
          lineInfos.map((l) => ({ str: l.str, x: l.x, baseline: l.baseline })),
          style, fontPx,
          { w: blockW, h: blockH, boxTop: lineInfos[0].center - (ascent - descent) / 2 - descent, boxH: blockH - lineAdv + ascent + descent }
        );
        cacheSet(key, r);
      }
      groups.push(Object.assign({ key, canvas: r.canvas, index: 0, text: layer.text }, toWorld(r.pxW, r.pxH, blockW / 2, blockH / 2)));
    } else {
      let index = 0;
      lineInfos.forEach((l) => {
        const tokens = [];
        if (split === 'word') {
          const re = /\S+/g;
          let m;
          while ((m = re.exec(l.str))) tokens.push({ str: m[0], start: m.index });
        } else {
          for (let i = 0; i < l.str.length; i++) {
            if (l.str[i] !== ' ') tokens.push({ str: l.str[i], start: i });
          }
        }
        tokens.forEach((tok) => {
          const prefixW = measureWidth(mctx, l.str.slice(0, tok.start));
          const w = measureWidth(mctx, tok.str);
          const key = keyBase + '|G|' + tok.str;
          let r = cacheGet(key);
          if (!r) {
            r = rasterise(
              [{ str: tok.str, x: 0, baseline: lineAdv / 2 + capH / 2 }],
              style, fontPx,
              { w, h: lineAdv, boxTop: lineAdv / 2 - (ascent - descent) / 2 - descent, boxH: ascent + descent }
            );
            cacheSet(key, r);
          }
          groups.push(Object.assign(
            { key, canvas: r.canvas, index: index++, text: tok.str },
            toWorld(r.pxW, r.pxH, l.x + prefixW + w / 2, l.center)
          ));
        });
      });
      if (!groups.length) {
        // Empty text: keep an invisible placeholder so the layer can still be selected.
        const key = keyBase + '|E';
        let r = cacheGet(key);
        if (!r) { r = rasterise([{ str: ' ', x: 0, baseline: lineAdv / 2 }], style, fontPx, { w: fontPx, h: lineAdv, boxTop: 0, boxH: lineAdv }); cacheSet(key, r); }
        groups.push(Object.assign({ key, canvas: r.canvas, index: 0, text: '' }, toWorld(r.pxW, r.pxH, blockW / 2, blockH / 2)));
      }
    }

    return {
      groups,
      fontPx,
      fontWorld: fontPx / pxPerUnit,
      blockW: blockW / pxPerUnit,
      blockH: blockH / pxPerUnit,
    };
  }

  /* Kick off loading of every font face so canvas rendering uses the real fonts. */
  function preloadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const jobs = [];
    for (const f of FONTS) {
      for (const w of f.weights) {
        jobs.push(document.fonts.load(`${w} 24px "${f.family}"`).catch(() => {}));
        if (f.italic) jobs.push(document.fonts.load(`italic ${w} 24px "${f.family}"`).catch(() => {}));
      }
    }
    return Promise.all(jobs);
  }

  global.TextRender = { FONTS, layout, clearCache, preloadFonts, fontString, hexToRgba };
})(window);
