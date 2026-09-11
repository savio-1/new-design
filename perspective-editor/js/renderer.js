/* WebGL compositor: video plane as a fixed backdrop, plus perspective-transformed text quads seen
 * through an animatable camera with depth of field. */
(function (global) {
  'use strict';

  const VERT = `
    attribute vec2 aPos;
    attribute vec2 aUV;
    uniform mat4 uMVP;
    uniform vec2 uSize;
    varying vec2 vUV;
    void main() {
      vUV = aUV;
      gl_Position = uMVP * vec4(aPos * uSize, 0.0, 1.0);
    }`;

  const FRAG = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uTex;
    uniform float uOpacity;
    uniform vec2 uBlur;      // blur radius in UV units (x, y)
    uniform vec4 uTint;      // solid colour override when uTint.a > 0
    uniform vec4 uMaskBox;   // subject mask: centre.xy, half size.xy, in device pixels (y up)
    uniform vec2 uMaskEdge;  // corner radius, feather (device pixels)
    uniform float uMaskCut;  // 1 = erase this layer wherever the mask covers it
    void main() {
      vec4 c;
      if (uBlur.x <= 0.00001) {
        c = texture2D(uTex, vUV);
      } else {
        // 37-tap disk blur (three rings + centre): cheap, and soft enough for a defocus look
        c = texture2D(uTex, vUV) * 1.5;
        float total = 1.5;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 0.5235988; // 30 degrees
          vec2 d = vec2(cos(a), sin(a));
          c += texture2D(uTex, vUV + d * uBlur);
          c += texture2D(uTex, vUV + d * uBlur * 0.66) * 1.1;
          c += texture2D(uTex, vUV + d * uBlur * 0.33) * 1.2;
          total += 3.3;
        }
        c /= total;
      }
      if (uTint.a > 0.0) { c = vec4(uTint.rgb * c.a, c.a) * uTint.a; }
      if (uMaskCut > 0.5) {
        // Rounded-box coverage: this layer sits behind the subject, so it is erased inside the mask.
        vec2 pt = gl_FragCoord.xy - uMaskBox.xy;
        vec2 ext = max(uMaskBox.zw - uMaskEdge.x, vec2(0.0));
        vec2 q = abs(pt) - ext;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uMaskEdge.x;
        float cover = 1.0 - smoothstep(0.0, max(uMaskEdge.y, 0.75), d);
        c *= 1.0 - cover;
      }
      gl_FragColor = c * uOpacity;
    }`;

  const D2R = Math.PI / 180;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
      if (!gl) throw new Error('WebGL is not available in this browser.');
      this.gl = gl;
      this.fovDeg = 45;
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (global.TextRender) TextRender.setMaxTexture(Math.min(this.maxTex, 8192));
      this.maxRB = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      this.texCache = new Map(); // canvas -> { tex }
      this.mediaTex = new Map(); // layer id -> { tex, el } for video / image layers
      this.TEX_LIMIT = 900;
      this.lastQuads = [];
      this.bgColor = [0.07, 0.07, 0.08];
      this._initGL();
    }

    _initGL() {
      const gl = this.gl;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      this.prog = prog;
      this.loc = {
        aPos: gl.getAttribLocation(prog, 'aPos'),
        aUV: gl.getAttribLocation(prog, 'aUV'),
        uMVP: gl.getUniformLocation(prog, 'uMVP'),
        uSize: gl.getUniformLocation(prog, 'uSize'),
        uTex: gl.getUniformLocation(prog, 'uTex'),
        uOpacity: gl.getUniformLocation(prog, 'uOpacity'),
        uBlur: gl.getUniformLocation(prog, 'uBlur'),
        uTint: gl.getUniformLocation(prog, 'uTint'),
        uMaskBox: gl.getUniformLocation(prog, 'uMaskBox'),
        uMaskEdge: gl.getUniformLocation(prog, 'uMaskEdge'),
        uMaskCut: gl.getUniformLocation(prog, 'uMaskCut'),
      };

      const quad = new Float32Array([
        -0.5, -0.5, 0, 1,
         0.5, -0.5, 1, 1,
        -0.5,  0.5, 0, 0,
         0.5,  0.5, 1, 0,
      ]);
      this.quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

      const loop = new Float32Array([
        -0.5, -0.5, 0, 1,
         0.5, -0.5, 1, 1,
         0.5,  0.5, 1, 0,
        -0.5,  0.5, 0, 0,
      ]);
      this.loopBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.loopBuf);
      gl.bufferData(gl.ARRAY_BUFFER, loop, gl.STATIC_DRAW);

      this.polyBuf = gl.createBuffer();   // rewritten every frame for tracker outlines

      this.videoTex = this._createTexture();
      this.whiteTex = this._createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.whiteTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
    }

    _createTexture() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }

    resize(w, h) {
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
    }

    get aspect() { return this.canvas.width / Math.max(1, this.canvas.height); }
    /* Distance from the default camera to the video plane so the plane fills the frame exactly. */
    get camDist() { return 1 / Math.tan((this.fovDeg * Math.PI) / 360); }

    /* The resting camera: on the axis, looking at the video plane. */
    defaultCamera() {
      return { x: 0, y: 0, z: this.camDist, yaw: 0, pitch: 0, roll: 0, focus: this.camDist, aperture: 0 };
    }

    /* View matrix for a camera {x,y,z,yaw,pitch,roll} (degrees). Camera looks down its local -Z. */
    viewMatrix(cam) {
      let m = M4.translation(-cam.x, -cam.y, -cam.z);
      if (cam.yaw) m = M4.multiply(M4.rotationY(-cam.yaw * D2R), m);
      if (cam.pitch) m = M4.multiply(M4.rotationX(-cam.pitch * D2R), m);
      if (cam.roll) m = M4.multiply(M4.rotationZ(-cam.roll * D2R), m);
      return m;
    }

    _proj() {
      return M4.perspective(this.fovDeg * D2R, this.aspect, 0.02, 100);
    }

    /* Distance of a world point along the camera's view axis. */
    viewDepth(cam, x, y, z) {
      const p = M4.transformPoint(this.viewMatrix(cam), x, y, z);
      return -p.z;
    }

    /* World units per screen pixel for a point at view depth `depth`. */
    worldPerPixelAtDepth(depth) {
      const visibleH = 2 * Math.max(0.05, depth) * Math.tan((this.fovDeg * Math.PI) / 360);
      return visibleH / this.canvas.height;
    }

    /* World units per pixel for dragging a layer under a camera. */
    worldPerPixel(layer, cam) {
      const c = cam || this.defaultCamera();
      const tr = layer.transform;
      return this.worldPerPixelAtDepth(this.viewDepth(c, tr.x, tr.y, tr.z));
    }

    _textureFor(canvas) {
      const gl = this.gl;
      let entry = this.texCache.get(canvas);
      if (entry) {
        this.texCache.delete(canvas);
        this.texCache.set(canvas, entry);
        return entry.tex;
      }
      const tex = this._createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      this.texCache.set(canvas, { tex });
      if (this.texCache.size > this.TEX_LIMIT) {
        const [k, v] = this.texCache.entries().next().value;
        gl.deleteTexture(v.tex);
        this.texCache.delete(k);
      }
      return tex;
    }

    clearTextures() {
      for (const v of this.texCache.values()) this.gl.deleteTexture(v.tex);
      this.texCache.clear();
    }

    _drawQuad(mvp, w, h, tex, opacity, blurUV, tint, mode, mask) {
      const gl = this.gl, L = this.loc;
      gl.bindBuffer(gl.ARRAY_BUFFER, mode === 'loop' ? this.loopBuf : this.quadBuf);
      gl.enableVertexAttribArray(L.aPos);
      gl.vertexAttribPointer(L.aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(L.aUV);
      gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, 16, 8);
      gl.uniformMatrix4fv(L.uMVP, false, mvp);
      gl.uniform2f(L.uSize, w, h);
      gl.uniform1f(L.uOpacity, opacity);
      gl.uniform2f(L.uBlur, blurUV ? blurUV[0] : 0, blurUV ? blurUV[1] : 0);
      gl.uniform4fv(L.uTint, tint || [0, 0, 0, 0]);
      if (mask) {
        gl.uniform4f(L.uMaskBox, mask.cx, mask.cy, mask.hw, mask.hh);
        gl.uniform2f(L.uMaskEdge, mask.radius, mask.feather);
        gl.uniform1f(L.uMaskCut, 1);
      } else {
        gl.uniform1f(L.uMaskCut, 0);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(L.uTex, 0);
      if (mode === 'loop') gl.drawArrays(gl.LINE_LOOP, 0, 4);
      else gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* Texture for a media layer's element (video frames re-uploaded every frame, images once). */
    _mediaTexture(id, el, isVideo) {
      const gl = this.gl;
      let entry = this.mediaTex.get(id);
      if (!entry) { entry = { tex: this._createTexture(), el: null, uploaded: false }; this.mediaTex.set(id, entry); }
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      if (isVideo || entry.el !== el || !entry.uploaded) {
        try {
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          entry.el = el; entry.uploaded = true;
        } catch (e) { return null; }
      }
      return entry.tex;
    }
    dropMediaTexture(id) {
      const e = this.mediaTex.get(id);
      if (e) { this.gl.deleteTexture(e.tex); this.mediaTex.delete(id); }
    }

    _uploadVideo(video) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Render a frame.
     * opts = { video, videoReady, layers, time, frameHeightPx, selectedIds, camera, media, trackTransform, outlines }
     *   media: { scale, x, y, locked, bg:[r,g,b] }
     *   videoAspect: width / height of the footage being shown when it differs from the frame (letterboxed)
     *   trackTransform(layer): the transform to draw a layer with when it is pinned to a motion track (or null)
     *   outlines: [{ x, y, w, h, color, cross }] boxes in video-plane units drawn over the footage while editing
     *   camera: { x, y, z, yaw, pitch, roll, focus, aperture } — absolute; defaults to the resting camera.
     */
    render(opts) {
      const gl = this.gl;
      const W = this.canvas.width, H = this.canvas.height;
      gl.viewport(0, 0, W, H);
      gl.clearColor(this.bgColor[0], this.bgColor[1], this.bgColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.prog);

      const proj = this._proj();
      const defaultCam = this.defaultCamera();
      const cam = Object.assign(defaultCam, opts.camera || {});
      const media = Object.assign({ scale: 1, x: 0, y: 0, z: 0, locked: false, bg: null }, opts.media || {});
      if (media.bg) { gl.clearColor(media.bg[0], media.bg[1], media.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); }

      const view = this.viewMatrix(cam);
      const VP = M4.multiply(proj, view);

      // Video plane at z = 0. At 100 % it fills the frustum of the resting camera exactly. Normally it is
      // part of the 3D scene (so a dolly zooms it, like a scaled footage layer in After Effects); when
      // locked it is drawn from the resting camera and only the text moves.
      const planeVP = media.locked ? M4.multiply(proj, this.viewMatrix(this.defaultCamera())) : VP;
      const planeZ = media.locked ? 0 : (media.z || 0);
      const planeMVP = M4.multiply(planeVP, M4.translation(media.x, media.y, planeZ));
      // The footage sits at its own depth and goes soft outside the sharp band like any other layer.
      const sharpNear0 = cam.sharpNear == null ? 0.9 : cam.sharpNear;
      const sharpFar0 = cam.sharpFar == null ? 3.2 : cam.sharpFar;
      const planeBlur = (depth, w, h) => {
        const ap = cam.aperture || 0;
        if (!(ap > 0) || media.locked) return null;
        let amount = 0;
        if (depth < sharpNear0) amount = Math.min(1, (sharpNear0 - depth) / Math.max(0.15, sharpNear0 * 0.85));
        else if (sharpFar0 > 0 && depth > sharpFar0) amount = Math.min(1, (depth - sharpFar0) / Math.max(0.4, sharpFar0 * 0.9));
        if (amount <= 0) return null;
        const soft = amount * amount * (3 - 2 * amount);
        const blurWorld = ap * 0.045 * soft;          // gentler than text: a whole picture blurs a lot faster to the eye
        return [blurWorld / w, blurWorld / h];
      };
      // Everything is queued and then drawn far-to-near, so the footage, media layers and words cover
      // each other by depth (the footage itself can now sit at any depth).
      const items = [];
      if (opts.video && opts.videoReady && this._uploadVideo(opts.video) && opts.videoVisible !== false) {
        let pw = 2 * this.aspect * media.scale, ph = 2 * media.scale;
        // another video on the footage track may have a different shape: it is fitted inside the frame
        const va = opts.videoAspect;
        if (va && Math.abs(va - this.aspect) > 1e-3) { if (va > this.aspect) ph = pw / va; else pw = ph * va; }
        const pd = -M4.transformPoint(media.locked ? this.viewMatrix(this.defaultCamera()) : view, media.x, media.y, planeZ).z;
        if (pd > 0.05) {
          const blur = planeBlur(pd, pw, ph), op = media.opacity == null ? 1 : media.opacity;
          items.push({ depth: media.locked ? 1e9 : pd, draw: () => this._drawQuad(planeMVP, pw, ph, this.videoTex, op, blur, null) });
        }
      }

      // Subject mask. It is pinned to the video plane (coordinates are fractions of the video's own
      // half-width and half-height) and projected to device pixels, so it tracks the footage as the
      // camera moves. Layers flagged `behindSubject` are erased inside it.
      this.lastMask = null;
      const mk = opts.mask;
      if (mk && mk.enabled) {
        const cx = mk.x * this.aspect * media.scale, cy = mk.y * media.scale;
        const hwWorld = Math.max(0.01, mk.w) * this.aspect * media.scale;
        const hhWorld = Math.max(0.01, mk.h) * media.scale;
        const c0 = this._toScreen(planeMVP, cx, cy);
        const cX = this._toScreen(planeMVP, cx + hwWorld, cy);
        const cY = this._toScreen(planeMVP, cx, cy + hhWorld);
        if (!c0.behind && !cX.behind && !cY.behind) {
          const hw = Math.abs(cX.x - c0.x), hh = Math.abs(cY.y - c0.y);
          const small = Math.min(hw, hh);
          this.lastMask = {
            cx: c0.x, cy: H - c0.y, hw, hh,
            radius: Math.max(0, (mk.roundness == null ? 0.5 : mk.roundness)) * small,
            feather: Math.max(0.75, (mk.feather == null ? 0.06 : mk.feather) * small),
            world: { cx, cy, hw: hwWorld, hh: hhWorld, mvp: planeMVP },
          };
        }
      }
      const selected = new Set(opts.selectedIds || []);
      const aperture = cam.aperture || 0;
      // Sharp band: text is crisp between these distances from the lens and softens outside it.
      const sharpNear = cam.sharpNear == null ? 0.9 : cam.sharpNear;
      const sharpFar = cam.sharpFar == null ? 3.2 : cam.sharpFar;
      const fade = cam.fade || null; // { near, farStart, farEnd } in view depth

      this.lastQuads = [];
      const t = opts.time;
      const frameH = opts.frameHeightPx || H;

      for (const layer of opts.layers) {
        if (layer.hidden) continue;
        if (t < layer.start || t >= layer.end) continue;
        // A layer pinned to a motion track is drawn where the footage carries it; with the video locked
        // to the resting camera it must be seen from that same camera, or it would slide off its anchor.
        const pinned = opts.trackTransform ? opts.trackTransform(layer) : null;
        const tr = pinned || layer.transform;
        const VPbase = pinned && media.locked ? planeVP : VP;
        const viewBase = pinned && media.locked ? this.viewMatrix(this.defaultCamera()) : view;

        // ---- video / image layers: one textured quad in the scene, with the same entrance / exit
        //      animation, depth of field, fade and subject-mask treatment as a word.
        if (layer.type === 'media') {
          if (layer.kind === 'audio') continue;
          const asset = opts.mediaFor ? opts.mediaFor(layer) : null;
          if (!asset || !asset.ready || !asset.el) continue;
          const tex = this._mediaTexture(layer.id, asset.el, asset.kind === 'video');
          if (!tex) continue;
          const aw = asset.width || 16, ah = asset.height || 9;
          const qw = Math.max(0.02, layer.fitWidth || 1), qh = qw * (ah / aw);
          const layerM = M4.compose(tr.x, tr.y, tr.z, tr.rx, tr.ry, tr.rz, tr.scale, tr.scale, tr.scale);
          const VPL = M4.multiply(VPbase, layerM);
          const viewL = M4.multiply(viewBase, layerM);
          const dur = layer.end - layer.start, lt = t - layer.start;
          const st = Anim.evaluate(layer, lt, dur, { index: 0, count: 1, text: layer.name || '' });
          const opacity = st.opacity * (layer.opacity == null ? 1 : layer.opacity);
          if (opacity <= 0.001) continue;
          const fw = qh * 0.35;                       // "font size" stand-in for the animation offsets
          let gm = M4.translation(st.tx * fw, st.ty * fw, st.tz * fw);
          if (st.rz) gm = M4.multiply(gm, M4.rotationZ(st.rz * D2R));
          if (st.ry) gm = M4.multiply(gm, M4.rotationY(st.ry * D2R));
          if (st.rx) gm = M4.multiply(gm, M4.rotationX(st.rx * D2R));
          if (st.sx !== 1 || st.sy !== 1) gm = M4.multiply(gm, M4.scaling(Math.max(0.0001, st.sx), Math.max(0.0001, st.sy), 1));
          const mvp = M4.multiply(VPL, gm);
          const hw = qw * 0.5, hh = qh * 0.5;
          const corners = [this._toScreen(mvp, -hw, -hh), this._toScreen(mvp, hw, -hh), this._toScreen(mvp, hw, hh), this._toScreen(mvp, -hw, hh)];
          if (corners.some((p) => p.behind)) continue;
          const depth = -M4.transformPoint(viewL, st.tx * fw, st.ty * fw, st.tz * fw).z;
          let fadeMul = 1;
          if (fade) {
            if (fade.near > 0) fadeMul *= Math.min(1, Math.max(0, (depth - fade.near * 0.4) / (fade.near * 0.6)));
            if (fade.farEnd > fade.farStart) fadeMul *= 1 - Math.min(1, Math.max(0, (depth - fade.farStart) / (fade.farEnd - fade.farStart)));
          }
          if (fadeMul <= 0.002) continue;
          let blurWorld = st.blur * fw;
          if (aperture > 0) {
            let amount = 0;
            if (depth < sharpNear) amount = Math.min(1, (sharpNear - depth) / Math.max(0.15, sharpNear * 0.85));
            else if (sharpFar > 0 && depth > sharpFar) amount = Math.min(1, (depth - sharpFar) / Math.max(0.4, sharpFar * 0.9));
            if (amount > 0) { const soft = amount * amount * (3 - 2 * amount); blurWorld += aperture * 0.045 * soft * Math.max(1, st.sx); }
          }
          const blurUV = blurWorld > 0.0005 ? [blurWorld / (qw * Math.max(0.05, st.sx)), blurWorld / (qh * Math.max(0.05, st.sy))] : null;
          const mOp = Math.min(1, opacity * fadeMul), mMask = layer.behindSubject ? this.lastMask : null;
          items.push({ depth, draw: () => this._drawQuad(mvp, qw, qh, tex, mOp, blurUV, null, null, mMask) });
          this.lastQuads.push({ layerId: layer.id, quads: [corners] });
          if (selected.has(layer.id)) {
            const primary = opts.selectedIds && opts.selectedIds[0] === layer.id;
            items.push({ depth: -1e9, draw: () => this._drawQuad(VPL, qw * 1.02, qh * 1.02, this.whiteTex, 1, null, primary ? [1, 0.55, 0.1, 0.95] : [1, 0.75, 0.45, 0.7], 'loop') });
          }
          continue;
        }
        // Rasterise text at a resolution that matches how much the camera magnifies it, so words close
        // to the lens stay crisp. Bucketed so a slow dolly re-rasterises only a few times.
        // The magnification is the camera closing in AND the layer's own scale (a pinned word grows with
        // the tracked object; the Scale slider goes to 400 %) — both must be rasterised for, or the
        // texture is stretched and the edges go soft.
        const depthL = -M4.transformPoint(viewBase, tr.x, tr.y, tr.z).z;
        const mag = Math.min(12, Math.max(1, (this.camDist / Math.max(0.05, depthL)) * Math.max(1, tr.scale || 1)));
        const bucket = Math.min(12, Math.pow(1.5, Math.ceil(Math.log(mag) / Math.log(1.5) - 1e-6)));
        const lay = this._layoutFor(layer, Math.round(frameH * bucket));
        const dur = layer.end - layer.start;
        const lt = t - layer.start;
        const layerM = M4.compose(tr.x, tr.y, tr.z, tr.rx, tr.ry, tr.rz, tr.scale, tr.scale, tr.scale);
        const VPL = M4.multiply(VPbase, layerM);
        const viewL = M4.multiply(viewBase, layerM);
        const fw = lay.fontWorld;
        const count = lay.groups.length;
        const quads = [];

        for (const g of lay.groups) {
          const st = Anim.evaluate(layer, lt, dur, { index: g.index, count, text: g.text });
          const opacity = st.opacity * (layer.style.opacity == null ? 1 : layer.style.opacity);
          if (opacity <= 0.001) continue;

          let gm = M4.translation(g.cx + st.tx * fw, g.cy + st.ty * fw, st.tz * fw);
          const pivot = st.pivotY ? st.pivotY * g.h : 0;
          if (pivot) gm = M4.multiply(gm, M4.translation(0, pivot, 0));
          if (st.rz) gm = M4.multiply(gm, M4.rotationZ(st.rz * D2R));
          if (st.ry) gm = M4.multiply(gm, M4.rotationY(st.ry * D2R));
          if (st.rx) gm = M4.multiply(gm, M4.rotationX(st.rx * D2R));
          if (pivot) gm = M4.multiply(gm, M4.translation(0, -pivot, 0));
          if (st.sx !== 1 || st.sy !== 1) gm = M4.multiply(gm, M4.scaling(Math.max(0.0001, st.sx), Math.max(0.0001, st.sy), 1));
          const mvp = M4.multiply(VPL, gm);

          // Cull anything that crosses behind the lens.
          const hw = g.w * 0.42, hh = g.h * 0.42;
          const corners = [
            this._toScreen(mvp, -hw, -hh), this._toScreen(mvp, hw, -hh),
            this._toScreen(mvp, hw, hh), this._toScreen(mvp, -hw, hh),
          ];
          if (corners.some((p) => p.behind)) continue;

          const depth = -M4.transformPoint(viewL, g.cx + st.tx * fw, g.cy + st.ty * fw, st.tz * fw).z;

          // Distance fade: text about to pass behind the lens dissolves instead of popping, and text
          // left far behind the camera fades like fog.
          let fadeMul = 1;
          if (fade) {
            if (fade.near > 0) fadeMul *= Math.min(1, Math.max(0, (depth - fade.near * 0.4) / (fade.near * 0.6)));
            if (fade.farEnd > fade.farStart) fadeMul *= 1 - Math.min(1, Math.max(0, (depth - fade.farStart) / (fade.farEnd - fade.farStart)));
          }
          if (fadeMul <= 0.002) continue;

          // Depth of field as a band: crisp between sharpNear and sharpFar, softening on both sides.
          // A word entering close to the lens is soft, sharpens as it reaches the band, and softens
          // again once it falls far behind.
          let blurWorld = st.blur * fw;
          if (aperture > 0) {
            let amount = 0;
            if (depth < sharpNear) amount = Math.min(1, (sharpNear - depth) / Math.max(0.15, sharpNear * 0.85));
            else if (sharpFar > 0 && depth > sharpFar) amount = Math.min(1, (depth - sharpFar) / Math.max(0.4, sharpFar * 0.9));
            if (amount > 0) {
              const soft = amount * amount * (3 - 2 * amount); // smoothstep so the band edges are gentle
              blurWorld += aperture * 0.3 * soft * fw * Math.max(1, st.sx);
            }
          }
          let blurUV = null;
          if (blurWorld > 0.0005) {
            blurUV = [blurWorld / (g.w * Math.max(0.05, st.sx)), blurWorld / (g.h * Math.max(0.05, st.sy))];
          }

          const tex = this._textureFor(g.canvas);
          const tOp = Math.min(1, opacity * fadeMul), tMask = layer.behindSubject ? this.lastMask : null;
          const gw = g.w, gh = g.h;
          items.push({ depth, draw: () => this._drawQuad(mvp, gw, gh, tex, tOp, blurUV, null, null, tMask) });
          quads.push(corners);
        }
        this.lastQuads.push({ layerId: layer.id, quads });

        if (selected.has(layer.id)) {
          const pad = fw * 0.25;
          const bw = lay.blockW + pad * 2, bh = lay.blockH + pad * 2;
          const primary = opts.selectedIds && opts.selectedIds[0] === layer.id;
          items.push({ depth: -1e9, draw: () => this._drawQuad(VPL, bw, bh, this.whiteTex, 1, null, primary ? [1, 0.55, 0.1, 0.95] : [1, 0.75, 0.45, 0.7], 'loop') });
        }
      }

      // Far to near. Ties (a word sitting exactly on the footage) keep their layer order.
      items.sort((a, b) => b.depth - a.depth);
      for (const it of items) it.draw();

      // Mask outline, so the shape can be placed while editing.
      if (this.lastMask && opts.showMask) {
        const m = this.lastMask.world;
        const outline = M4.multiply(m.mvp, M4.translation(m.cx, m.cy, 0));
        this._drawQuad(outline, m.hw * 2, m.hh * 2, this.whiteTex, 1, null, [0.35, 0.85, 1, 0.9], 'loop');
      }

      // Tracker outlines: plotted in video-plane units, so they ride on the footage exactly like a
      // pinned word. Any shape — a box's four corners, a hand-drawn polygon, a point's cross.
      this.lastOutlines = [];
      for (const o of opts.outlines || []) {
        const col = o.color || [1, 0.85, 0.2, 0.95];
        const toPlane = (p) => ({ x: p.x * this.aspect * media.scale, y: p.y * media.scale });
        if (o.pts && o.pts.length >= 2) this._drawPath(planeMVP, o.pts.map(toPlane), col, o.closed !== false);
        for (const seg of o.marks || []) this._drawPath(planeMVP, seg.map(toPlane), col, false);
        const screen = (o.handles || []).map((p) => {
          const q = toPlane(p);
          const s2 = this._toScreen(planeMVP, q.x, q.y);
          return { x: s2.x, y: s2.y, behind: s2.behind };
        });
        const c = toPlane(o.anchor || { x: 0, y: 0 });
        const sc = this._toScreen(planeMVP, c.x, c.y);
        this.lastOutlines.push({ id: o.id, cx: sc.x, cy: sc.y, behind: sc.behind, handles: screen });
      }
    }

    /* Draw a polyline (or closed polygon) of plane-space points in one colour. */
    _drawPath(mvp, pts, color, closed) {
      const gl = this.gl, L = this.loc;
      const n = pts.length;
      if (n < 2) return;
      const data = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        data[i * 4] = pts[i].x; data[i * 4 + 1] = pts[i].y;
        data[i * 4 + 2] = 0; data[i * 4 + 3] = 0;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.polyBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(L.aPos);
      gl.vertexAttribPointer(L.aPos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(L.aUV);
      gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, 16, 8);
      gl.uniformMatrix4fv(L.uMVP, false, mvp);
      gl.uniform2f(L.uSize, 1, 1);
      gl.uniform1f(L.uOpacity, 1);
      gl.uniform2f(L.uBlur, 0, 0);
      gl.uniform4fv(L.uTint, color);
      gl.uniform1f(L.uMaskCut, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.whiteTex);
      gl.uniform1i(L.uTex, 0);
      gl.drawArrays(closed ? gl.LINE_LOOP : gl.LINE_STRIP, 0, n);
    }

    /* Where a screen pixel lands on the video plane, in the plane's own units (x across the video
     * half-width, y across the half-height, y up). Exact: the camera ray is intersected with z = 0. */
    planePointAtScreen(px, py, cam, media) {
      const c = cam || this.defaultCamera();
      const m = Object.assign({ x: 0, y: 0, z: 0, scale: 1 }, media || {});
      const pz = m.locked ? 0 : (m.z || 0);
      const ndcX = (px / this.canvas.width) * 2 - 1, ndcY = 1 - (py / this.canvas.height) * 2;
      const tanH = Math.tan((this.fovDeg * D2R) / 2);
      const R = M4.multiply(M4.multiply(M4.rotationY((c.yaw || 0) * D2R), M4.rotationX((c.pitch || 0) * D2R)), M4.rotationZ((c.roll || 0) * D2R));
      const d = M4.transformPoint(R, ndcX * tanH * this.aspect, ndcY * tanH, -1);
      if (d.z > -1e-6) return null;                       // looking away from the plane
      const k = (pz - c.z) / d.z;
      if (!(k > 0)) return null;
      return {
        x: (c.x + d.x * k - m.x) / (this.aspect * Math.max(0.001, m.scale)),
        y: (c.y + d.y * k - m.y) / Math.max(0.001, m.scale),
      };
    }


    _toScreen(mvp, x, y) {
      const p = M4.transformPoint(mvp, x, y, 0);
      return { x: ((p.x + 1) / 2) * this.canvas.width, y: ((1 - p.y) / 2) * this.canvas.height, behind: p.w <= 0.001 };
    }

    _layoutFor(layer, frameH) {
      const key = `${frameH}|${layer.split}|${layer.text}|${JSON.stringify(layer.style)}`;
      if (!layer._layout || layer._layout.key !== key) {
        layer._layout = Object.assign({ key }, TextRender.layout(layer, frameH));
      }
      return layer._layout;
    }

    /* Topmost layer id whose glyphs contain the screen point, or null. */
    hitTest(px, py) {
      for (let i = this.lastQuads.length - 1; i >= 0; i--) {
        const entry = this.lastQuads[i];
        for (const q of entry.quads) {
          if (pointInPoly(px, py, q)) return entry.layerId;
        }
      }
      return null;
    }
  }

  function pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  global.Renderer = Renderer;
})(window);
