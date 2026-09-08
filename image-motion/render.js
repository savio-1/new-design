/*!
 * ImageMotionRenderer — draws an ImageMotion scene (plus the text on its stage) into a canvas.
 * Used for frame-exact video export. Reproduces the CSS 3D maths exactly: perspective at the
 * stage centre, transform order translate · rotateX · rotateY · rotateZ · scale, y down, z toward
 * the viewer. Cards are drawn with WebGL2 (rounded corners, soft shadow, depth blur via mip bias);
 * text is rasterised from the live DOM so line breaks and fonts match the preview.
 *
 *   const r = new ImageMotionRenderer({ im, stage, width: 1920, height: 1080, scale: 2 });
 *   im.seek(t); r.render({ background }); // r.canvas now holds the frame
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ImageMotionRenderer = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DEG2RAD = Math.PI / 180;

  /* ─────────────── backgrounds ───────────────
     bg = { type: 'solid', color } | { type: 'gradient', kind: 'linear'|'radial', angle, stops: [{ at, color }] } | css string */
  function backgroundCss(bg) {
    if (!bg) return '#000';
    if (typeof bg === 'string') return bg;
    if (bg.type === 'gradient' && bg.stops?.length) {
      const stops = bg.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(', ');
      return bg.kind === 'radial' ? `radial-gradient(circle farthest-corner at 50% 50%, ${stops})` : `linear-gradient(${bg.angle ?? 180}deg, ${stops})`;
    }
    return bg.color || '#000';
  }
  function paintBackground(ctx, bg, W, H) {
    ctx.save();
    if (!bg || typeof bg === 'string' || bg.type !== 'gradient' || !bg.stops?.length) {
      ctx.fillStyle = typeof bg === 'string' ? bg : bg?.color || '#000';
      ctx.fillRect(0, 0, W, H); ctx.restore(); return;
    }
    let g;
    if (bg.kind === 'radial') g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W / 2, H / 2));
    else {
      // CSS linear-gradient: 0deg points up, 90deg right; the line length is |W sin a| + |H cos a|
      const a = ((bg.angle ?? 180) * Math.PI) / 180;
      const L = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
      const dx = (Math.sin(a) * L) / 2, dy = (-Math.cos(a) * L) / 2;
      g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    }
    for (const s of bg.stops) g.addColorStop(clamp(s.at, 0, 1), s.color);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  /** Parse the simple `linear-gradient(Ndeg, c1, c2, …)` strings ImageMotion uses for placeholders. */
  function parseGradient(str) {
    const m = /linear-gradient\(\s*(-?[\d.]+)deg\s*,(.+)\)\s*$/.exec(str || '');
    if (!m) return null;
    const parts = m[2].split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);
    return { type: 'gradient', kind: 'linear', angle: parseFloat(m[1]), stops: parts.map((c, i) => ({ at: parts.length === 1 ? 0 : i / (parts.length - 1), color: c.replace(/\s+\d+%$/, '') })) };
  }

  /* ─────────────── matrices (column-major 4x4, CSS conventions) ─────────────── */
  function mat4Identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function mat4Mul(a, b) {                       // a · b
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  const T = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const S = (s) => new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);
  const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
  /** CSS: translate3d · rotateX · rotateY · rotateZ · scale */
  function cardMatrix(p) {
    let m = T(p.x, p.y, p.z);
    m = mat4Mul(m, RX(p.rx * DEG2RAD));
    m = mat4Mul(m, RY(p.ry * DEG2RAD));
    m = mat4Mul(m, RZ(p.rz * DEG2RAD));
    m = mat4Mul(m, S(p.s));
    return m;
  }

  const VS = `#version 300 es
  in vec2 aPos;
  uniform mat4 uModel; uniform vec2 uHalf; uniform float uP; uniform vec2 uHalfStage; uniform float uA; uniform float uB;
  out vec2 vLocal;
  void main() {
    vec2 local = aPos * uHalf * 2.0;
    vec4 wp = uModel * vec4(local, 0.0, 1.0);
    float d = uP - wp.z;                                   // distance to the camera plane (camera sits at z = P)
    gl_Position = vec4(wp.x * uP / uHalfStage.x, -wp.y * uP / uHalfStage.y, uA * d + uB, d);
    vLocal = local;
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 vLocal;
  uniform vec2 uHalf; uniform vec2 uBox; uniform float uRadius; uniform sampler2D uTex; uniform vec4 uUV;
  uniform float uOpacity; uniform float uBias; uniform int uShadow; uniform float uSoft; uniform vec4 uTint; uniform int uUseTint;
  out vec4 o;
  float rrect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    if (uShadow == 1) {
      float d = rrect(vLocal, uBox, uRadius);
      float a = (1.0 - smoothstep(-uSoft, uSoft, d)) * uOpacity;
      o = vec4(0.0, 0.0, 0.0, a);
      return;
    }
    float d = rrect(vLocal, uHalf, uRadius);
    float aa = max(fwidth(d), 1e-4);
    float edge = clamp(0.5 - d / aa, 0.0, 1.0);
    vec2 uv = (vLocal / (uHalf * 2.0) + 0.5) * uUV.xy + uUV.zw;
    vec4 c = uUseTint == 1 ? uTint : texture(uTex, uv, uBias);
    float a = c.a * edge * uOpacity;
    o = vec4(c.rgb * a, a);                                 // premultiplied
  }`;

  class ImageMotionRenderer {
    constructor({ im, stage, width, height, scale = 1, shadow = true, textRoots = null }) {
      this.im = im; this.stage = stage;
      this.shadow = shadow;
      this.textRoots = textRoots;                           // () => Element[] to rasterise, in draw order
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.gl = null; this.glCanvas = document.createElement('canvas');
      this.textures = new Map();
      this.setSize(width, height, scale);
      this._initGL();
    }
    setSize(width, height, scale = 1) {
      this.W = width; this.H = height; this.scale = scale;
      const w = Math.max(2, Math.round(width * scale) & ~1), h = Math.max(2, Math.round(height * scale) & ~1);
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
      return this;
    }
    destroy() { if (this.gl) { for (const t of this.textures.values()) this.gl.deleteTexture(t.tex); this.gl.getExtension('WEBGL_lose_context')?.loseContext(); } this.textures.clear(); }

    /* ── WebGL setup ── */
    _initGL() {
      const gl = this.glCanvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
      if (!gl) { console.warn('ImageMotionRenderer: WebGL2 unavailable, cards will not be drawn'); return; }
      this.gl = gl;
      const prog = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
        const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('ImageMotionRenderer shader: ' + gl.getShaderInfoLog(sh));
        gl.attachShader(prog, sh);
      }
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('ImageMotionRenderer link: ' + gl.getProgramInfoLog(prog));
      gl.useProgram(prog); this.prog = prog;
      this.u = {};
      for (const n of ['uModel', 'uHalf', 'uBox', 'uP', 'uHalfStage', 'uA', 'uB', 'uRadius', 'uTex', 'uUV', 'uOpacity', 'uBias', 'uShadow', 'uSoft', 'uTint', 'uUseTint']) this.u[n] = gl.getUniformLocation(prog, n);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      // 1x1 white fallback texture
      this.white = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.white);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }
    _texture(card) {
      const gl = this.gl;
      const img = card.img;
      const usable = img && img.style.display !== 'none' && img.complete && img.naturalWidth > 0;
      const key = usable ? 'img:' + img.currentSrc : 'bg:' + (card.inner.style.background || '#444');
      let t = this.textures.get(key);
      if (t) return t;
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      let w = 1, h = 1, ok = true;
      try {
        if (usable) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); w = img.naturalWidth; h = img.naturalHeight; }
        else {
          const c = document.createElement('canvas'); c.width = 256; c.height = 320;
          const cx = c.getContext('2d');
          const g = parseGradient(card.inner.style.background);
          paintBackground(cx, g || card.inner.style.background || '#444', 256, 320);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); w = 256; h = 320;
        }
      } catch (e) { ok = false; }                          // tainted cross-origin image
      if (!ok) { gl.deleteTexture(tex); t = { tex: null, w: 1, h: 1, tint: [0.35, 0.36, 0.42, 1] }; this.textures.set(key, t); return t; }
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t = { tex, w, h }; this.textures.set(key, t);
      if (this.textures.size > 256) { const first = this.textures.keys().next().value; const old = this.textures.get(first); if (old.tex) gl.deleteTexture(old.tex); this.textures.delete(first); }
      return t;
    }

    /** Motion box rect in design px, relative to the stage. */
    motionRect() {
      const el = this.im.el;
      return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    }

    _drawCards(box) {
      const gl = this.gl; if (!gl) return;
      const im = this.im, cfg = im.cfg, sc = this.scale;
      const gw = Math.max(2, Math.round(box.w * sc)), gh = Math.max(2, Math.round(box.h * sc));
      if (this.glCanvas.width !== gw || this.glCanvas.height !== gh) { this.glCanvas.width = gw; this.glCanvas.height = gh; }
      gl.viewport(0, 0, gw, gh);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.prog);
      const P = cfg.perspective;
      const near = P * 0.02, far = P * 24;
      gl.uniform1f(this.u.uP, P); gl.uniform2f(this.u.uHalfStage, box.w / 2, box.h / 2);
      gl.uniform1f(this.u.uA, (far + near) / (far - near)); gl.uniform1f(this.u.uB, (-2 * far * near) / (far - near));
      gl.uniform1i(this.u.uTex, 0); gl.activeTexture(gl.TEXTURE0);
      const radius = cfg.radius;
      const cards = im.cards.filter((c) => c.pose && c.pose.o > 0.002).sort((a, b) => a.pose.z - b.pose.z);
      for (const c of cards) {
        const p = c.pose;
        const M = cardMatrix(p);
        const hw = c.w / 2, hh = c.h / 2;
        const r = Math.min(radius, hw, hh);
        // soft shadow: 0 18px 40px -18px rgba(0,0,0,.55) → inset 18, offset 18, blur ~40
        if (this.shadow && cfg.shadow) {
          const soft = 22, inset = 18;
          const Ms = mat4Mul(M, T(0, inset, -0.6));
          gl.uniformMatrix4fv(this.u.uModel, false, Ms);
          gl.uniform2f(this.u.uHalf, Math.max(1, hw - inset + soft), Math.max(1, hh - inset + soft));
          gl.uniform2f(this.u.uBox, Math.max(1, hw - inset), Math.max(1, hh - inset));
          gl.uniform1f(this.u.uRadius, r); gl.uniform1f(this.u.uSoft, soft);
          gl.uniform1i(this.u.uShadow, 1); gl.uniform1f(this.u.uOpacity, 0.5 * p.o);
          gl.depthMask(false); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.depthMask(true);
        }
        const t = this._texture(c);
        gl.uniformMatrix4fv(this.u.uModel, false, M);
        gl.uniform2f(this.u.uHalf, hw, hh); gl.uniform2f(this.u.uBox, hw, hh);
        gl.uniform1f(this.u.uRadius, r);
        gl.uniform1i(this.u.uShadow, 0); gl.uniform1f(this.u.uOpacity, p.o);
        gl.uniform1f(this.u.uBias, p.blur > 0.01 ? Math.log2(1 + p.blur * 0.8) : 0);
        if (t.tex) {
          gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(this.u.uUseTint, 0);
          const ia = t.w / t.h, ca = c.w / c.h;                 // object-fit: cover
          if (ia > ca) { const s = ca / ia; gl.uniform4f(this.u.uUV, s, 1, (1 - s) / 2, 0); } else { const s = ia / ca; gl.uniform4f(this.u.uUV, 1, s, 0, (1 - s) / 2); }
        } else { gl.bindTexture(gl.TEXTURE_2D, this.white); gl.uniform1i(this.u.uUseTint, 1); gl.uniform4f(this.u.uTint, ...t.tint); gl.uniform4f(this.u.uUV, 1, 1, 0, 0); }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    /* ── DOM text → canvas ── */
    _effectiveOpacity(el) {
      let o = 1, e = el;
      while (e && e !== this.stage) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity); e = e.parentElement; }
      return o;
    }
    _rgba(color, alpha) {
      const m = /rgba?\(([^)]+)\)/.exec(color);
      if (!m) return color;
      const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      const a = (parts[3] ?? 1) * alpha;
      return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
    }
    _drawText(el, stageRect, ps) {
      const ctx = this.ctx;
      const op = this._effectiveOpacity(el); if (op <= 0.003) return;
      const cs = getComputedStyle(el);
      const toDesign = (r) => ({ x: (r.left - stageRect.left) / ps, y: (r.top - stageRect.top) / ps, w: r.width / ps, h: r.height / ps });
      const box = toDesign(el.getBoundingClientRect());
      if (box.w <= 0 || box.h <= 0) return;
      // ticker items live inside a masked list: reproduce the vertical fade
      let mask = 1;
      const tk = el.closest('.im-ticker');
      if (tk) { const tr = toDesign(tk.getBoundingClientRect()); const rel = (box.y + box.h / 2 - tr.y) / tr.h; mask = clamp(Math.min(rel / 0.25, (1 - rel) / 0.25), 0, 1); }
      const alpha = op * mask; if (alpha <= 0.003) return;
      // background (buttons)
      const bgc = cs.backgroundColor;
      if (bgc && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|transparent/.test(bgc)) {
        ctx.fillStyle = this._rgba(bgc, alpha);
        const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, box.h / 2, box.w / 2);
        ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, rad); ctx.fill();
      }
      const size = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      try { ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; } catch (_) { /* older browsers */ }
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = this._rgba(cs.color, alpha);
      const ascent = ctx.measureText('Hg').fontBoundingBoxAscent || size * 0.8;
      const tt = cs.textTransform;
      const xform = (s) => tt === 'uppercase' ? s.toUpperCase() : tt === 'lowercase' ? s.toLowerCase() : tt === 'capitalize' ? s.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s;
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent; if (!text.trim()) continue;
        const lines = [];                                     // { top, left, chars }
        for (let i = 0; i < text.length; i++) {
          range.setStart(node, i); range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          const top = Math.round(r.top * 2) / 2;
          let line = lines[lines.length - 1];
          if (!line || Math.abs(line.top - top) > r.height * 0.5) { line = { top, left: r.left, chars: '' }; lines.push(line); }
          else line.left = Math.min(line.left, r.left);
          line.chars += text[i];
        }
        for (const ln of lines) {
          const x = (ln.left - stageRect.left) / ps, y = (ln.top - stageRect.top) / ps + ascent;
          ctx.fillText(xform(ln.chars.replace(/\s+$/, '')), x, y);
        }
      }
    }

    /** Draw the current frame. `background` is a bg object/css string; text is read from the live DOM. */
    render({ background = '#000' } = {}) {
      const ctx = this.ctx, sc = this.scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      paintBackground(ctx, background, this.canvas.width, this.canvas.height);
      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      const box = this.motionRect();
      if (this.gl) {
        this._drawCards(box);
        ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
        ctx.drawImage(this.glCanvas, box.x, box.y, box.w, box.h);
        ctx.restore();
      }
      const stageRect = this.stage.getBoundingClientRect();
      const ps = stageRect.width / (this.stage.offsetWidth || 1);   // preview scale (CSS transform on the stage)
      const roots = this.textRoots ? this.textRoots() : [...this.stage.querySelectorAll('.im-ticker__item'), ...this.stage.querySelectorAll('.layer')];
      for (const el of roots) this._drawText(el, stageRect, ps);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return this.canvas;
    }
  }

  ImageMotionRenderer.backgroundCss = backgroundCss;
  ImageMotionRenderer.paintBackground = paintBackground;
  ImageMotionRenderer.parseGradient = parseGradient;
  return ImageMotionRenderer;
});
