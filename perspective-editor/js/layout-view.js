/* Large 2D diagram of the 3D scene (top view: X × depth, side view: depth × Y) with draggable handles
 * for words, the camera at the playhead, and camera keyframes. Pure view: the app supplies the scene
 * and receives edits through callbacks. */
(function (global) {
  'use strict';

  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  class LayoutView {
    /**
     * canvas   — <canvas> element sized by CSS
     * hooks    — { scene(): SceneData, onSelectLayer(id, additive), onSelectKey(id), onDeselect(),
     *              onLayerDragStart(ids), onLayerDragMove(ids, {dx,dy,dz}), onLayerDragEnd(),
     *              onCameraDragMove({x,y,z}), onCameraDragEnd(), onKeyDragMove(id, {x,y,z}), onKeyDragEnd(),
     *              onDoubleClickLayer(id), onDoubleClickEmpty() }
     * SceneData — { time, cam:{x,y,z,yaw,pitch,focus,fade}, camDist, fov, aspect, hasVideo,
     *               video:{scale,x,y,locked}, layers:[{id,text,x,y,z,w,h,active,hidden,selected,primary}],
     *               keys:[{id,t,x,y,z,selected}], path:[{x,y,z}] }
     */
    constructor(canvas, hooks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.hooks = hooks;
      this.mode = 'top';
      this.zoom = 120;          // px per world unit
      this.center = { h: 0, v: 1.2 }; // world coords at canvas centre (h = horizontal axis, v = vertical axis)
      this.hover = null;
      this.drag = null;
      this.fitted = false;
      this.snap = false;        // quantise dragged positions to the grid (the app applies it; drawn here)
      this.gridStep = 0.1;      // world units
      this._bind();
    }

    /* ---- coordinate helpers ------------------------------------------------- */
    // world -> (h, v) axes for current mode
    _axes(x, y, z) {
      return this.mode === 'top' ? { h: x, v: z } : { h: z, v: y };
    }
    _toPx(h, v) {
      const W = this.canvas.width, H = this.canvas.height;
      if (this.mode === 'top') return { px: W / 2 + (h - this.center.h) * this.zoom, py: H / 2 + (v - this.center.v) * this.zoom };
      return { px: W / 2 + (h - this.center.h) * this.zoom, py: H / 2 - (v - this.center.v) * this.zoom };
    }
    _fromPx(px, py) {
      const W = this.canvas.width, H = this.canvas.height;
      const h = this.center.h + (px - W / 2) / this.zoom;
      const v = this.mode === 'top' ? this.center.v + (py - H / 2) / this.zoom : this.center.v - (py - H / 2) / this.zoom;
      return { h, v };
    }
    worldPt(x, y, z) { const a = this._axes(x, y, z); return this._toPx(a.h, a.v); }

    setMode(mode) { this.mode = mode; this.fitted = false; this.draw(); }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
      if (w && h && (this.canvas.width !== w || this.canvas.height !== h)) {
        this.canvas.width = w; this.canvas.height = h; this.fitted = false;
      }
      this.dpr = dpr;
    }

    fit() {
      const s = this.hooks.scene();
      const pts = [];
      const S = s.video.scale;
      pts.push(this._axes(s.video.x - s.aspect * S, s.video.y - S, s.video.z || 0), this._axes(s.video.x + s.aspect * S, s.video.y + S, s.video.z || 0));
      pts.push(this._axes(s.cam.x, s.cam.y, s.cam.z));
      for (const p of s.path) pts.push(this._axes(p.x, p.y, p.z));
      for (const l of s.layers) if (!l.hidden) pts.push(this._axes(l.x, l.y, l.z));
      pts.push(this._axes(0, 0, s.camDist));
      let minH = Infinity, maxH = -Infinity, minV = Infinity, maxV = -Infinity;
      for (const p of pts) { minH = Math.min(minH, p.h); maxH = Math.max(maxH, p.h); minV = Math.min(minV, p.v); maxV = Math.max(maxV, p.v); }
      const padH = Math.max(0.6, (maxH - minH) * 0.18), padV = Math.max(0.6, (maxV - minV) * 0.18);
      minH -= padH; maxH += padH; minV -= padV; maxV += padV;
      const W = this.canvas.width, H = this.canvas.height;
      this.zoom = clamp(Math.min(W / (maxH - minH), H / (maxV - minV)), 30, 600);
      this.center = { h: (minH + maxH) / 2, v: (minV + maxV) / 2 };
      this.fitted = true;
    }

    /* ---- drawing ------------------------------------------------------------ */
    draw() {
      this.resize();
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      if (!W || !H) return;
      const s = this.hooks.scene();
      if (!this.fitted) this.fit();
      const dpr = this.dpr || 1;
      const top = this.mode === 'top';

      c.clearRect(0, 0, W, H);
      c.fillStyle = '#0d0d11';
      c.fillRect(0, 0, W, H);

      // grid
      const step = this.zoom > 220 ? 0.25 : this.zoom > 90 ? 0.5 : 1;
      const tl = this._fromPx(0, 0), br = this._fromPx(W, H);
      const hMin = Math.min(tl.h, br.h), hMax = Math.max(tl.h, br.h), vMin = Math.min(tl.v, br.v), vMax = Math.max(tl.v, br.v);
      c.font = `${11 * dpr}px Inter, sans-serif`;
      c.textBaseline = 'middle';
      // the snap grid, when it is on and fine enough to see
      if (this.snap && this.gridStep * this.zoom >= 7) {
        c.strokeStyle = '#161619';
        c.lineWidth = 1;
        const g = this.gridStep;
        for (let v = Math.ceil(vMin / g) * g; v <= vMax; v += g) { const { py } = this._toPx(0, v); c.beginPath(); c.moveTo(0, py); c.lineTo(W, py); c.stroke(); }
        for (let h = Math.ceil(hMin / g) * g; h <= hMax; h += g) { const { px } = this._toPx(h, 0); c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke(); }
      }
      c.lineWidth = 1;
      for (let v = Math.ceil(vMin / step) * step; v <= vMax; v += step) {
        const { py } = this._toPx(0, v);
        const major = Math.abs(v - Math.round(v)) < 1e-6;
        c.strokeStyle = major ? '#24242c' : '#19191f';
        c.beginPath(); c.moveTo(0, py); c.lineTo(W, py); c.stroke();
        if (major) {
          c.fillStyle = '#5c5c68';
          c.textAlign = 'left';
          c.fillText(v === 0 ? (top ? 'video plane' : '0') : `${v.toFixed(0)}`, 8 * dpr, py - 8 * dpr);
        }
      }
      for (let h = Math.ceil(hMin / step) * step; h <= hMax; h += step) {
        const { px } = this._toPx(h, 0);
        const major = Math.abs(h - Math.round(h)) < 1e-6;
        c.strokeStyle = major ? '#24242c' : '#19191f';
        c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke();
      }

      // far fade & focus bands, camera frustum
      this._drawCamera(s, dpr);

      // video plane
      const S = s.video.scale;
      const vz = s.video.z || 0;
      const a = top ? this.worldPt(s.video.x - s.aspect * S, 0, vz) : this.worldPt(0, s.video.y - S, vz);
      const b = top ? this.worldPt(s.video.x + s.aspect * S, 0, vz) : this.worldPt(0, s.video.y + S, vz);
      c.lineCap = 'round';
      c.strokeStyle = s.hasVideo ? '#ff6b6b' : '#8a8a96';
      c.lineWidth = 6 * dpr;
      c.beginPath(); c.moveTo(a.px, a.py); c.lineTo(b.px, b.py); c.stroke();
      c.fillStyle = s.hasVideo ? '#ff8f8f' : '#a0a0ac';
      c.font = `600 ${11 * dpr}px Inter, sans-serif`;
      c.textAlign = 'left';
      const lbl = s.hasVideo ? (S > 1.01 ? `Video · ${Math.round(S * 100)}%` : 'Video') : 'Background';
      if (top) c.fillText(lbl, b.px + 8 * dpr, b.py); else c.fillText(lbl, a.px - 8 * dpr - c.measureText(lbl).width, (a.py + b.py) / 2);

      // camera path + keys
      if (s.path.length > 1) {
        c.strokeStyle = 'rgba(90,200,250,0.45)';
        c.lineWidth = 2 * dpr;
        c.setLineDash([6 * dpr, 5 * dpr]);
        c.beginPath();
        s.path.forEach((p, i) => { const q = this.worldPt(p.x, p.y, p.z); i ? c.lineTo(q.px, q.py) : c.moveTo(q.px, q.py); });
        c.stroke();
        c.setLineDash([]);
      }
      for (const k of s.keys) {
        const q = this.worldPt(k.x, k.y, k.z);
        const r = (k.selected ? 8 : 6) * dpr;
        c.save();
        c.translate(q.px, q.py); c.rotate(Math.PI / 4);
        c.fillStyle = k.selected ? '#f28c28' : '#5ac8fa';
        c.strokeStyle = '#0d0d11'; c.lineWidth = 1.5 * dpr;
        c.fillRect(-r, -r, 2 * r, 2 * r); c.strokeRect(-r, -r, 2 * r, 2 * r);
        c.restore();
        c.fillStyle = '#6f8b98';
        c.font = `${10 * dpr}px Inter, sans-serif`;
        c.textAlign = 'center';
        c.fillText(`${k.t.toFixed(1)}s`, q.px, q.py + 15 * dpr);
      }

      // words
      c.font = `600 ${12 * dpr}px Inter, sans-serif`;
      for (const l of s.layers) {
        if (l.hidden) continue;
        const q = this.worldPt(l.x, l.y, l.z);
        const behind = top ? l.z > s.cam.z - 0.02 : false;
        const alpha = (!l.active || behind) ? 0.35 : 1;
        c.globalAlpha = alpha;
        const label = (l.text || '').split('\n')[0].slice(0, 18) || 'text';
        const textW = c.measureText(label).width;
        let w, h;
        if (top) { w = Math.max(l.w * this.zoom, textW + 18 * dpr); h = 22 * dpr; }
        else { w = 22 * dpr; h = Math.max(l.h * this.zoom, 22 * dpr); }
        const x0 = q.px - w / 2, y0 = q.py - h / 2;
        const hovered = this.hover && this.hover.kind === 'layer' && this.hover.id === l.id;
        c.fillStyle = l.selected ? (l.primary ? '#f28c28' : '#d69a5c') : '#2a2a33';
        c.strokeStyle = l.selected ? '#ffd2a3' : hovered ? '#8f8f9a' : '#4a4a56';
        c.lineWidth = (hovered ? 2 : 1.2) * dpr;
        roundRect(c, x0, y0, w, h, 6 * dpr);
        c.fill(); c.stroke();
        c.fillStyle = l.selected ? '#1a0d00' : '#e8e8ee';
        c.textAlign = 'center';
        if (top) c.fillText(label, q.px, q.py + 0.5 * dpr);
        else { c.textAlign = 'left'; c.fillText(label, x0 + w + 6 * dpr, q.py); }
        c.globalAlpha = 1;
      }

      // camera body drawn last so it stays clickable on top
      const cp = this.worldPt(s.cam.x, s.cam.y, s.cam.z);
      const hoveredCam = this.hover && this.hover.kind === 'camera';
      c.fillStyle = '#5ac8fa';
      c.strokeStyle = hoveredCam ? '#ffffff' : '#0d2733';
      c.lineWidth = 2 * dpr;
      c.beginPath(); c.arc(cp.px, cp.py, 11 * dpr, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#0d2733';
      c.beginPath(); c.arc(cp.px, cp.py, 4 * dpr, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9edcff';
      c.font = `600 ${11 * dpr}px Inter, sans-serif`;
      c.textAlign = 'left';
      c.fillText(`Camera · ${s.time.toFixed(2)}s`, cp.px + 16 * dpr, cp.py - 4 * dpr);
      c.fillStyle = '#6f8b98';
      c.font = `${10 * dpr}px Inter, sans-serif`;
      c.fillText(`${(s.cam.z).toFixed(2)} from video`, cp.px + 16 * dpr, cp.py + 10 * dpr);
    }

    _drawCamera(s, dpr) {
      const c = this.ctx;
      const top = this.mode === 'top';
      const cam = s.cam;
      // Half-angle of the frustum in the drawn plane, and the camera's forward / right axes there.
      const half = top ? Math.atan(Math.tan((s.fov * D2R) / 2) * s.aspect) : (s.fov * D2R) / 2;
      const ang = (top ? cam.yaw : cam.pitch) * D2R;
      // The renderer's camera looks along (-sin(yaw), sin(pitch), -cos) — mirror that here.
      const fwd = (dist, a) => top
        ? { x: cam.x - Math.sin(a) * dist, y: cam.y, z: cam.z - Math.cos(a) * dist }
        : { x: cam.x, y: cam.y + Math.sin(a) * dist, z: cam.z - Math.cos(a) * dist };
      // Sideways step across the frame at a given distance (perpendicular to forward).
      const across = (pt, w) => top
        ? [{ x: pt.x - Math.cos(ang) * w, y: pt.y, z: pt.z + Math.sin(ang) * w }, { x: pt.x + Math.cos(ang) * w, y: pt.y, z: pt.z - Math.sin(ang) * w }]
        : [{ x: pt.x, y: pt.y - Math.cos(ang) * w, z: pt.z - Math.sin(ang) * w }, { x: pt.x, y: pt.y + Math.cos(ang) * w, z: pt.z + Math.sin(ang) * w }];

      // Frustum
      const len = Math.max(1.2, cam.z + 1.5);
      const p0 = this.worldPt(cam.x, cam.y, cam.z);
      const e1 = fwd(len, ang - half), e2 = fwd(len, ang + half);
      const p1 = this.worldPt(e1.x, e1.y, e1.z), p2 = this.worldPt(e2.x, e2.y, e2.z);
      c.fillStyle = 'rgba(90,200,250,0.07)';
      c.beginPath(); c.moveTo(p0.px, p0.py); c.lineTo(p1.px, p1.py); c.lineTo(p2.px, p2.py); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(90,200,250,0.5)';
      c.lineWidth = 1.2 * dpr;
      c.beginPath(); c.moveTo(p0.px, p0.py); c.lineTo(p1.px, p1.py); c.moveTo(p0.px, p0.py); c.lineTo(p2.px, p2.py); c.stroke();

      // A line across the frustum at distance `dist` from the lens.
      const band = (dist, colour, label, dash) => {
        const centre = fwd(dist, ang);
        const ends = across(centre, Math.tan(half) * dist);
        const q = [this.worldPt(ends[0].x, ends[0].y, ends[0].z), this.worldPt(ends[1].x, ends[1].y, ends[1].z)];
        c.strokeStyle = colour;
        c.setLineDash(dash || [5 * dpr, 4 * dpr]);
        c.lineWidth = 1.3 * dpr;
        c.beginPath(); c.moveTo(q[0].px, q[0].py); c.lineTo(q[1].px, q[1].py); c.stroke();
        c.setLineDash([]);
        if (label) {
          c.fillStyle = colour;
          c.font = `${10 * dpr}px Inter, sans-serif`;
          c.textAlign = 'left';
          c.fillText(label, q[1].px + 5 * dpr, q[1].py);
        }
        return q;
      };

      // Sharp band: the depth range in which text is in focus.
      if (cam.aperture > 0 && cam.sharpNear != null) {
        const nearQ = band(cam.sharpNear, 'rgba(120,230,160,0.85)', 'sharp from');
        if (cam.sharpFar > cam.sharpNear && cam.sharpFar < 12) {
          const farQ = band(cam.sharpFar, 'rgba(120,230,160,0.5)', 'sharp to');
          c.fillStyle = 'rgba(120,230,160,0.07)';
          c.beginPath();
          c.moveTo(nearQ[0].px, nearQ[0].py); c.lineTo(nearQ[1].px, nearQ[1].py);
          c.lineTo(farQ[1].px, farQ[1].py); c.lineTo(farQ[0].px, farQ[0].py);
          c.closePath(); c.fill();
        }
      }

      // Where far words start to dissolve.
      if (cam.fade && cam.fade.farEnd > 0) band(cam.fade.farStart, 'rgba(255,255,255,0.3)', 'fade', [2 * dpr, 4 * dpr]);
    }

    /* ---- interaction -------------------------------------------------------- */
    _pointer(e) {
      const r = this.canvas.getBoundingClientRect();
      return { px: ((e.clientX - r.left) / r.width) * this.canvas.width, py: ((e.clientY - r.top) / r.height) * this.canvas.height };
    }
    _hit(p) {
      const s = this.hooks.scene();
      const dpr = this.dpr || 1;
      const cp = this.worldPt(s.cam.x, s.cam.y, s.cam.z);
      if (Math.hypot(cp.px - p.px, cp.py - p.py) <= 14 * dpr) return { kind: 'camera' };
      for (const k of s.keys) {
        const q = this.worldPt(k.x, k.y, k.z);
        if (Math.hypot(q.px - p.px, q.py - p.py) <= 10 * dpr) return { kind: 'key', id: k.id };
      }
      const top = this.mode === 'top';
      this.ctx.font = `600 ${12 * dpr}px Inter, sans-serif`;
      for (let i = s.layers.length - 1; i >= 0; i--) {
        const l = s.layers[i];
        if (l.hidden) continue;
        const q = this.worldPt(l.x, l.y, l.z);
        const label = (l.text || '').split('\n')[0].slice(0, 18) || 'text';
        const textW = this.ctx.measureText(label).width;
        let w, h;
        if (top) { w = Math.max(l.w * this.zoom, textW + 18 * dpr); h = 22 * dpr; }
        else { w = 22 * dpr; h = Math.max(l.h * this.zoom, 22 * dpr); }
        if (Math.abs(p.px - q.px) <= w / 2 + 3 * dpr && Math.abs(p.py - q.py) <= h / 2 + 3 * dpr) return { kind: 'layer', id: l.id };
      }
      return null;
    }
    _worldFromAxes(h, v, base) {
      // Fill a world point from the two drawn axes, keeping the third coordinate from `base`.
      return this.mode === 'top' ? { x: h, y: base.y, z: v } : { x: base.x, y: v, z: h };
    }

    _bind() {
      const cv = this.canvas;
      cv.addEventListener('pointerdown', (e) => {
        const p = this._pointer(e);
        const h = this._hit(p);
        cv.setPointerCapture(e.pointerId);
        const w = this._fromPx(p.px, p.py);
        if (!h) {
          if (!(e.shiftKey || e.ctrlKey || e.metaKey)) this.hooks.onDeselect();
          this.drag = { kind: 'pan', start: { px: p.px, py: p.py }, center0: Object.assign({}, this.center), moved: false };
          return;
        }
        if (h.kind === 'camera') {
          this.drag = { kind: 'camera', moved: false, start0: w };
        } else if (h.kind === 'key') {
          this.hooks.onSelectKey(h.id);
          this.drag = { kind: 'key', id: h.id, moved: false, start0: w };
        } else {
          const s = this.hooks.scene();
          const layer = s.layers.find((l) => l.id === h.id);
          // Ctrl/Cmd-click adds to the selection; Shift does too, unless the word is already selected —
          // then Shift-drag means "move along one axis".
          const additive = e.ctrlKey || e.metaKey || (e.shiftKey && !layer.selected);
          if (!layer.selected || additive) this.hooks.onSelectLayer(h.id, additive);
          const ids = this.hooks.scene().layers.filter((l) => l.selected).map((l) => l.id);
          this.hooks.onLayerDragStart(ids);
          this.drag = { kind: 'layer', ids, start: w, moved: false, start0: w };
        }
        e.preventDefault();
      });
      cv.addEventListener('pointermove', (e) => {
        const p = this._pointer(e);
        if (!this.drag) {
          const h = this._hit(p);
          const changed = JSON.stringify(h) !== JSON.stringify(this.hover);
          this.hover = h;
          cv.style.cursor = h ? 'grab' : 'default';
          if (changed) this.draw();
          return;
        }
        const d = this.drag;
        d.moved = true;
        const w = this._fromPx(p.px, p.py);
        if (d.kind === 'pan') {
          const dh = (p.px - d.start.px) / this.zoom, dv = (p.py - d.start.py) / this.zoom;
          this.center = { h: d.center0.h - dh, v: this.mode === 'top' ? d.center0.v - dv : d.center0.v + dv };
          this.draw();
          return;
        }
        cv.style.cursor = 'grabbing';
        // Shift locks the drag to one axis: whichever the pointer clearly moved along first.
        const mods = { shift: e.shiftKey, snap: this.snap, step: this.gridStep };
        if (d.kind !== 'pan' && d.start0 == null) d.start0 = w;
        let wh = w.h, wv = w.v;
        if (e.shiftKey && d.start0) {
          const dh0 = w.h - d.start0.h, dv0 = w.v - d.start0.v;
          if (!d.axis && Math.hypot(dh0, dv0) * this.zoom > 6) d.axis = Math.abs(dh0) >= Math.abs(dv0) ? 'h' : 'v';
          if (d.axis === 'h') wv = d.start0.v; else if (d.axis === 'v') wh = d.start0.h;
        } else d.axis = null;
        if (d.kind === 'camera') {
          const s = this.hooks.scene();
          this.hooks.onCameraDragMove(this._worldFromAxes(wh, wv, s.cam), mods);
        } else if (d.kind === 'key') {
          const s = this.hooks.scene();
          const k = s.keys.find((x) => x.id === d.id);
          if (k) this.hooks.onKeyDragMove(d.id, this._worldFromAxes(wh, wv, k), mods);
        } else if (d.kind === 'layer') {
          const dh = wh - d.start.h, dv = wv - d.start.v;
          const delta = this.mode === 'top' ? { dx: dh, dy: 0, dz: dv } : { dx: 0, dy: dv, dz: dh };
          this.hooks.onLayerDragMove(d.ids, delta, mods);
        }
        this.draw();
      });
      const end = () => {
        if (!this.drag) return;
        const d = this.drag;
        this.drag = null;
        cv.style.cursor = 'default';
        if (d.kind === 'camera') this.hooks.onCameraDragEnd(d.moved);
        else if (d.kind === 'key') this.hooks.onKeyDragEnd(d.moved);
        else if (d.kind === 'layer') this.hooks.onLayerDragEnd(d.moved);
        this.draw();
      };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('dblclick', (e) => {
        const p = this._pointer(e);
        const h = this._hit(p);
        if (h && h.kind === 'layer') this.hooks.onDoubleClickLayer(h.id);
        else if (!h) { this.fit(); this.draw(); }
      });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const p = this._pointer(e);
        const before = this._fromPx(p.px, p.py);
        const factor = Math.exp(-e.deltaY * 0.0012);
        this.zoom = clamp(this.zoom * factor, 25, 900);
        const after = this._fromPx(p.px, p.py);
        this.center = { h: this.center.h + (before.h - after.h), v: this.center.v + (before.v - after.v) };
        this.fitted = true;
        this.draw();
      }, { passive: false });
    }
  }

  function vals(o) { return [o.x, o.y, o.z]; }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  global.LayoutView = LayoutView;
})(window);
