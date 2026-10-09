/* Collage Studio — on-device background removal.
   Runs BRIA's RMBG-1.4 segmentation model (quantised ONNX, ~44 MB) with
   ONNX Runtime Web in the browser; photos never leave the device. The model is
   downloaded once and kept in IndexedDB. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender;
  const ORT_VERSION = '1.16.3';
  const ORT_JS = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.js`;
  const WASM_FILE = 'ort-wasm-simd.wasm';
  const WASM_SOURCES = [`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/${WASM_FILE}`, `vendor/${WASM_FILE}`];
  const MODEL_URL = 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx';
  const MODEL_KEY = 'rmbg-1.4-quantized';
  const SIZE = 1024;

  /* ───────── model cache (IndexedDB) ───────── */

  function idb() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('collage-studio-models', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('models');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function cacheGet(k) {
    const d = await idb();
    return new Promise((res, rej) => { const q = d.transaction('models').objectStore('models').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  }
  async function cachePut(k, v) {
    const d = await idb();
    return new Promise((res, rej) => { const t = d.transaction('models', 'readwrite'); t.objectStore('models').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  }

  /* ───────── loading ───────── */

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }
  async function fetchBytes(url, onProgress) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} for ${url}`);
    const total = +r.headers.get('content-length') || 0;
    if (!r.body || !r.body.getReader) return new Uint8Array(await r.arrayBuffer());
    const reader = r.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress) onProgress(got, total);
    }
    const out = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
  // A self-hosted copy can ship the model as base64 text parts next to the
  // page (window.STUDIO_MODEL_PARTS = n → models/rmbg.part0.txt …).
  async function fetchParts(n, onProgress) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = await (await fetch(`models/rmbg.part${i}.txt`)).text();
      const bin = atob(t.trim());
      const u = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);
      parts.push(u);
      onProgress((i + 1) / n);
    }
    const len = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  async function firstOk(sources, fn) {
    let err;
    for (const s of sources) { try { return await fn(s); } catch (e) { err = e; } }
    throw err;
  }

  let sessionP = null;
  function session(progress) {
    if (sessionP) return sessionP;
    sessionP = (async () => {
      if (!window.ort) await loadScript(ORT_JS);
      const ort = window.ort;
      const wasm = await firstOk(WASM_SOURCES, u => fetchBytes(u));
      const wasmUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
      ort.env.wasm.wasmPaths = { [WASM_FILE]: wasmUrl };
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;
      ort.env.wasm.proxy = false;
      let model = null;
      try { model = await cacheGet(MODEL_KEY); } catch (e) { /* storage unavailable */ }
      if (!model) {
        progress('download', 0);
        try {
          model = await fetchBytes(MODEL_URL, (got, total) => progress('download', total ? got / total : 0));
        } catch (e) {
          if (!window.STUDIO_MODEL_PARTS) throw e;
          model = await fetchParts(window.STUDIO_MODEL_PARTS, f => progress('download', f));
        }
        try { await cachePut(MODEL_KEY, model); } catch (e) { /* storage full or blocked */ }
      }
      progress('prepare', 1);
      return ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    })();
    sessionP.catch(() => { sessionP = null; });
    return sessionP;
  }

  /* ───────── inference ───────── */

  // returns a canvas the size of the source with the background made transparent
  async function cutout(img, progress) {
    const sess = await session(progress);
    progress('detect', 1);
    await new Promise(r => setTimeout(r, 60)); // let the status paint before the busy loop
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, SIZE, SIZE);
    const px = x.getImageData(0, 0, SIZE, SIZE).data;
    const n = SIZE * SIZE, input = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      input[i] = px[i * 4] / 255 - 0.5;
      input[n + i] = px[i * 4 + 1] / 255 - 0.5;
      input[2 * n + i] = px[i * 4 + 2] / 255 - 0.5;
    }
    const ort = window.ort;
    const out = await sess.run({ [sess.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
    const m = out[sess.outputNames[0]].data;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { if (m[i] < lo) lo = m[i]; if (m[i] > hi) hi = m[i]; }
    const span = hi - lo || 1;
    const mask = x.createImageData(SIZE, SIZE);
    for (let i = 0; i < n; i++) {
      const v = (m[i] - lo) / span;
      mask.data[i * 4 + 3] = Math.round(v * 255);
    }
    x.putImageData(mask, 0, 0);
    // scale the mask to full resolution and use it as the photo's alpha
    const outC = document.createElement('canvas');
    outC.width = iw; outC.height = ih;
    const o = outC.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, 0, 0, iw, ih);
    o.globalCompositeOperation = 'destination-in';
    o.imageSmoothingQuality = 'high';
    o.drawImage(c, 0, 0, iw, ih);
    return outC;
  }

  // bounding box of the opaque pixels, or null if nothing survived
  function opaqueBounds(canvas) {
    const w = canvas.width, h = canvas.height;
    const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let xx = 0; xx < w; xx++) {
        if (d[(y * w + xx) * 4 + 3] > 12) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const pad = 2;
    return { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), w: Math.min(w, x1 + pad + 1) - Math.max(0, x0 - pad), h: Math.min(h, y1 + pad + 1) - Math.max(0, y0 - pad) };
  }

  /* ───────── placement ───────── */

  // where image pixel (u, v) lands inside a box drawn with cover-fit (see render drawCover)
  function coverMap(iw, ih, rect, crop) {
    crop = crop || {};
    const sc = Math.max(rect.w / iw, rect.h / ih) * (crop.zoom || 1);
    const dx = rect.x + (rect.w - iw * sc) * (crop.x ?? 0.5), dy = rect.y + (rect.h - ih * sc) * (crop.y ?? 0.5);
    return { sc, dx, dy };
  }
  function rot(dx, dy, deg) {
    const a = (deg || 0) * Math.PI / 180;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
  }
  // the trimmed cut-out as a new image element sitting exactly where the subject was
  function placeCutout(src, b, frame) {
    const { iw, ih, rect, crop, flipX, flipY, x, y, rotation } = frame;
    const { sc, dx, dy } = coverMap(iw, ih, rect, crop);
    // only keep what was visible through the frame
    const vu0 = Math.max(b.x, (rect.x - dx) / sc), vu1 = Math.min(b.x + b.w, (rect.x + rect.w - dx) / sc);
    const vv0 = Math.max(b.y, (rect.y - dy) / sc), vv1 = Math.min(b.y + b.h, (rect.y + rect.h - dy) / sc);
    if (vu1 <= vu0 || vv1 <= vv0) return null;
    const cw = Math.round(vu1 - vu0), ch = Math.round(vv1 - vv0);
    const c = document.createElement('canvas');
    c.width = Math.max(1, cw); c.height = Math.max(1, ch);
    c.getContext('2d').drawImage(src, Math.round(vu0), Math.round(vv0), cw, ch, 0, 0, cw, ch);
    let lx = dx + vu0 * sc, ly = dy + vv0 * sc;
    const w = cw * sc, h = ch * sc;
    if (flipX) lx = rect.x + rect.w - (lx - rect.x) - w;
    if (flipY) ly = rect.y + rect.h - (ly - rect.y) - h;
    const [ox, oy] = rot(lx, ly, rotation);
    return { canvas: c, x: x + ox, y: y + oy, width: w, height: h, rotation: rotation || 0 };
  }

  /* ───────── public actions ───────── */

  // colour adjustments carry over to the cut-out; frame-wide vignette and grain don't
  function lookOnly(f) { const o = S.clone(f || {}); delete o.vignette; delete o.grain; return o; }

  let busy = false;
  function reporter() {
    let firstDownload = true;
    return (stage, f) => {
      if (stage === 'download') {
        const pct = Math.round(f * 100);
        S.hint(`Downloading the background-removal model… ${pct}%${firstDownload ? ' · first time only (44 MB)' : ''}`);
      } else if (stage === 'prepare') S.hint('Preparing the model…');
      else if (stage === 'detect') S.hint('Finding the subject…');
      S.emit('bgremove', stage, f);
    };
  }
  async function guard(fn) {
    if (busy) { S.emit('toast', 'Background removal is already running'); return; }
    busy = true;
    S.emit('bgremove', 'start');
    try { return await fn(); }
    catch (e) {
      console.error(e);
      S.emit('toast', /fetch|load|network|Failed/i.test(String(e && e.message))
        ? 'Couldn’t download the background-removal model. Check your connection and try again.'
        : 'Background removal failed on this photo.');
    } finally {
      busy = false;
      S.hint('');
      S.emit('bgremove', 'end');
    }
  }
  S.isRemovingBackground = () => busy;
  S.isBackgroundRemovalCached = async () => { try { return !!(await cacheGet(MODEL_KEY)); } catch (e) { return false; } };

  // mode 'replace': the photo becomes the cut-out (restorable).
  // mode 'layer': keep the photo and add the cut-out as a new layer on top.
  S.removeBackground = function (id, mode = 'replace') {
    return guard(async () => {
      const el = S.elById(id);
      if (!el || el.type !== 'image' || !el.assetId) return;
      const img = R.assetImage(el.assetId);
      if (!img) throw new Error('image not loaded');
      const cut = await cutout(img, reporter());
      const b = opaqueBounds(cut);
      if (!b) { S.emit('toast', 'No clear subject found in this photo'); return; }
      const g = R.frameGeometry(el);
      const placed = placeCutout(cut, b, { iw: cut.width, ih: cut.height, rect: g.rect, crop: el.crop, flipX: el.flipX, flipY: el.flipY, x: el.x, y: el.y, rotation: el.rotation });
      if (!placed) { S.emit('toast', 'The subject is outside the visible part of the photo'); return; }
      const assetId = S.addAsset(placed.canvas.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[assetId]; R.assetImage(assetId); });
      if (mode === 'layer') {
        const idx = S.doc.elements.indexOf(el);
        const nel = S.mk('image', { assetId, x: placed.x, y: placed.y, width: placed.width, height: placed.height, rotation: placed.rotation, filters: lookOnly(el.filters), flipX: !!el.flipX, flipY: !!el.flipY, name: 'Cut-out' });
        S.addElement(nel, { index: idx + 1, center: false });
        S.emit('toast', 'Cut-out added above the photo — move text between them for a layered look');
      } else {
        S.changeEl(el, e => {
          e.bgRemoved = { assetId: e.assetId, x: e.x, y: e.y, width: e.width, height: e.height, rotation: e.rotation, crop: S.clone(e.crop || {}), frame: S.clone(e.frame || {}) };
          e.assetId = assetId;
          e.x = placed.x; e.y = placed.y; e.width = placed.width; e.height = placed.height;
          e.crop = { zoom: 1, x: 0.5, y: 0.5 };
          e.frame = Object.assign({}, e.frame, { style: 'none', radius: 0 });
        });
        S.attachTransformer();
        S.emit('doc');
        S.emit('toast', 'Background removed');
      }
    });
  };

  S.restoreBackground = function (id) {
    const el = S.elById(id);
    if (!el || !el.bgRemoved) return;
    S.changeEl(el, e => {
      const o = e.bgRemoved;
      Object.assign(e, { assetId: o.assetId, x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation, crop: o.crop, frame: o.frame });
      delete e.bgRemoved;
    });
    S.attachTransformer();
    S.emit('doc');
  };

  // pull the subject out of the canvas background photo into its own layer
  S.cutoutBackgroundSubject = function () {
    return guard(async () => {
      const d = S.doc, bg = d.background;
      if (!bg.assetId) return;
      const img = R.assetImage(bg.assetId);
      if (!img) throw new Error('image not loaded');
      const cut = await cutout(img, reporter());
      const b = opaqueBounds(cut);
      if (!b) { S.emit('toast', 'No clear subject found in this photo'); return; }
      const placed = placeCutout(cut, b, { iw: cut.width, ih: cut.height, rect: { x: 0, y: 0, w: d.width, h: d.height }, crop: bg.crop, flipX: bg.flipX, flipY: false, x: 0, y: 0, rotation: 0 });
      if (!placed) return;
      const assetId = S.addAsset(placed.canvas.toDataURL('image/png'));
      await new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = S.assets[assetId]; R.assetImage(assetId); });
      const nel = S.mk('image', { assetId, x: placed.x, y: placed.y, width: placed.width, height: placed.height, filters: lookOnly(bg.filters), opacity: bg.imageOpacity ?? 1, name: 'Subject cut-out' });
      S.addElement(nel, { center: false });
      S.emit('toast', 'Subject added as a layer on top — send text behind it with ⌘[');
    });
  };
})();
