/* Large 2D diagram of the 3D scene — top view (X × depth), side view (depth × Y) or an isometric view
 * (all three axes) — with draggable handles for words, the camera at the playhead, and camera keyframes.
 * While something is dragged it draws guide lines: the scene's centre axes, lines through the moving
 * thing along each axis, and alignment lines whenever it lines up with another word, the camera or a key.
 * Pure view: the app supplies the scene and receives edits through callbacks. */
(function (global) {
  'use strict';

  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // Isometric axes on screen (unit zoom): X runs down-right, depth (Z) runs down-left, Y straight up.
  const ISO_C = Math.cos(Math.PI / 6), ISO_S = Math.sin(Math.PI / 6);
  const ISO_AXES = { x: { h: ISO_C, v: ISO_S }, z: { h: -ISO_C, v: ISO_S }, y: { h: 0, v: -1 } };
  const GUIDE = 'rgba(242,140,40,0.7)', ALIGN = 'rgba(120,230,160,0.95)', CENTRE = 'rgba(255,255,255,0.22)';

  class LayoutView {
    /**
     * canvas   — <canvas> element sized by CSS
     * hooks    — { scene(): SceneData, onSelectLayer(id, additive), onSelectKey(id), onDeselect(),
     *              onLayerDragStart(ids), onLayerDragMove(ids, {dx,dy,dz}, mods), onLayerDragEnd(moved),
     *              onCameraDragMove({x,y,z}, mods), onCameraDragEnd(), onKeyDragMove(id, {x,y,z}, mods), onKeyDragEnd(moved),
     *              onDoubleClickLayer(id) }
     * SceneData — { time, cam:{x,y,z,yaw,pitch,focus,fade}, camDist, fov, aspect, hasVideo,
     *               video:{scale,x,y,z,locked}, layers:[{id,text,x,y,z,w,h,active,hidden,selected,primary}],
     *               keys:[{id,t,x,y,z,selected}], path:[{x,y,z}] }
     */
    constructor(canvas, hooks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.hooks = hooks;
      this.mode = 'top';        // top | side | iso
      this.isoPlane = 'floor';  // what a plain drag moves in the isometric view: floor (X·depth) | height (Y)
      this.zoom = 120;          // px per world unit
      this.center = { h: 0, v: 1.2 }; // drawn-axis coords at canvas centre (h = horizontal, v = vertical)
      this.hover = null;
      this.drag = null;
      this.fitted = false;
      this.snap = false;        // quantise dragged positions to the grid (the app applies it; drawn here)
      this.gridStep = 0.1;      // world units
      this._bind();
    }

    /* ---- coordinate helpers ------------------------------------------------- */
    // world -> (h, v) drawn axes for the current mode. In the isometric view these are the unit-zoom
    // screen coordinates of the projected point (v grows downwards, like the top view).
    _axes(x, y, z) {
      if (this.mode === 'top') return { h: x, v: z };
      if (this.mode === 'side') return { h: z, v: y };
      return { h: (x - z) * ISO_C, v: (x + z) * ISO_S - y };
    }
    _toPx(h, v) {
      const W = this.canvas.width, H = this.canvas.height;
      if (this.mode === 'side') return { px: W / 2 + (h - this.center.h) * this.zoom, py: H / 2 - (v - this.center.v) * this.zoom };
      return { px: W / 2 + (h - this.center.h) * this.zoom, py: H / 2 + (v - this.center.v) * this.zoom };
    }
    _fromPx(px, py) {
      const W = this.canvas.width, H = this.canvas.height;
      const h = this.center.h + (px - W / 2) / this.zoom;
      const v = this.mode === 'side' ? this.center.v - (py - H / 2) / this.zoom : this.center.v + (py - H / 2) / this.zoom;
      return { h, v };
    }
    worldPt(x, y, z) { const a = this._axes(x, y, z); return this._toPx(a.h, a.v); }
    /* Screen delta -> world delta in the isometric view, along one axis or in the chosen plane. */
    _isoDelta(dh, dv, axis, plane) {
      if (axis) { const a = ISO_AXES[axis], k = dh * a.h + dv * a.v; return { dx: axis === 'x' ? k : 0, dy: axis === 'y' ? k : 0, dz: axis === 'z' ? k : 0 }; }
      if (plane === 'height') return { dx: 0, dy: -dv, dz: 0 };
      return { dx: (dh / ISO_C + dv / ISO_S) / 2, dy: 0, dz: (dv / ISO_S - dh / ISO_C) / 2 };
    }

    setMode(mode) { this.mode = mode; this.fitted = false; this.draw(); }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(this.canvas.clientWidth * dpr), h = Math.round(this.canvas.clientHeight * dpr);
      if (w && h && (this.canvas.width !== w || this.canvas.height !== h)) {
        this.canvas.width = w; this.canvas.height = h; this.fitted = false;
      }
      this.dpr = dpr;
    }

    _floorY(s) { return Math.min(-1.1, (s.video.y || 0) - s.video.scale - 0.1); }

    fit() {
      const s = this.hooks.scene();
      const pts = [];
      const S = s.video.scale, vz = s.video.z || 0;
      pts.push(this._axes(s.video.x - s.aspect * S, s.video.y - S, vz), this._axes(s.video.x + s.aspect * S, s.video.y + S, vz));
      if (this.mode === 'iso') pts.push(this._axes(s.video.x - s.aspect * S, s.video.y + S, vz), this._axes(s.video.x + s.aspect * S, s.video.y - S, vz), this._axes(s.cam.x, this._floorY(s), s.cam.z));
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
      const top = this.mode === 'top', iso = this.mode === 'iso';

      c.clearRect(0, 0, W, H);
      c.fillStyle = '#0d0d11';
      c.fillRect(0, 0, W, H);
      c.font = `${11 * dpr}px Inter, sans-serif`;
      c.textBaseline = 'middle';

      if (iso) this._drawIsoGrid(s, dpr);
      else this._drawFlatGrid(s, dpr);

      if (this.drag && this.drag.kind !== 'pan') this._drawGuides(s, dpr);

      // far fade & focus bands, camera frustum
      if (iso) this._drawCameraIso(s, dpr); else this._drawCamera(s, dpr);

      // video plane
      const S = s.video.scale;
      const vz = s.video.z || 0;
      c.lineCap = 'round';
      const lbl = s.hasVideo ? (S > 1.01 ? `Video · ${Math.round(S * 100)}%` : 'Video') : 'Background';
      c.font = `600 ${11 * dpr}px Inter, sans-serif`;
      if (iso) {
        const corners = [
          this.worldPt(s.video.x - s.aspect * S, s.video.y - S, vz), this.worldPt(s.video.x + s.aspect * S, s.video.y - S, vz),
          this.worldPt(s.video.x + s.aspect * S, s.video.y + S, vz), this.worldPt(s.video.x - s.aspect * S, s.video.y + S, vz),
        ];
        c.beginPath(); corners.forEach((q, i) => (i ? c.lineTo(q.px, q.py) : c.moveTo(q.px, q.py))); c.closePath();
        c.fillStyle = s.hasVideo ? 'rgba(255,107,107,0.14)' : 'rgba(138,138,150,0.12)';
        c.fill();
        c.strokeStyle = s.hasVideo ? '#ff6b6b' : '#8a8a96';
        c.lineWidth = 2.5 * dpr;
        c.stroke();
        c.fillStyle = s.hasVideo ? '#ff8f8f' : '#a0a0ac';
        c.textAlign = 'left';
        c.fillText(lbl, corners[2].px + 8 * dpr, corners[2].py);
      } else {
        const a = top ? this.worldPt(s.video.x - s.aspect * S, 0, vz) : this.worldPt(0, s.video.y - S, vz);
        const b = top ? this.worldPt(s.video.x + s.aspect * S, 0, vz) : this.worldPt(0, s.video.y + S, vz);
        c.strokeStyle = s.hasVideo ? '#ff6b6b' : '#8a8a96';
        c.lineWidth = 6 * dpr;
        c.beginPath(); c.moveTo(a.px, a.py); c.lineTo(b.px, b.py); c.stroke();
        c.fillStyle = s.hasVideo ? '#ff8f8f' : '#a0a0ac';
        c.textAlign = 'left';
        if (top) c.fillText(lbl, b.px + 8 * dpr, b.py); else c.fillText(lbl, a.px - 8 * dpr - c.measureText(lbl).width, (a.py + b.py) / 2);
      }

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
      const fy = this._floorY(s);
      for (const k of s.keys) {
        const q = this.worldPt(k.x, k.y, k.z);
        if (iso) this._dropLine(q, this.worldPt(k.x, fy, k.z), 'rgba(90,200,250,0.25)', dpr);
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
        if (iso) this._dropLine(q, this.worldPt(l.x, fy, l.z), l.selected ? 'rgba(242,140,40,0.4)' : 'rgba(255,255,255,0.13)', dpr);
        const behind = top || iso ? l.z > s.cam.z - 0.02 : false;
        const alpha = (!l.active || behind) ? 0.35 : 1;
        c.globalAlpha = alpha;
        const label = (l.text || '').split('\n')[0].slice(0, 18) || 'text';
        const textW = c.measureText(label).width;
        const { w, h } = this._boxSize(l, textW, dpr);
        const x0 = q.px - w / 2, y0 = q.py - h / 2;
        const hovered = this.hover && this.hover.kind === 'layer' && this.hover.id === l.id;
        c.fillStyle = l.selected ? (l.primary ? '#f28c28' : '#d69a5c') : '#2a2a33';
        c.strokeStyle = l.selected ? '#ffd2a3' : hovered ? '#8f8f9a' : '#4a4a56';
        c.lineWidth = (hovered ? 2 : 1.2) * dpr;
        roundRect(c, x0, y0, w, h, 6 * dpr);
        c.fill(); c.stroke();
        c.fillStyle = l.selected ? '#1a0d00' : '#e8e8ee';
        c.textAlign = 'center';
        if (this.mode === 'side') { c.textAlign = 'left'; c.fillText(label, x0 + w + 6 * dpr, q.py); }
        else c.fillText(label, q.px, q.py + 0.5 * dpr);
        c.globalAlpha = 1;
      }

      // camera body drawn last so it stays clickable on top
      const cp = this.worldPt(s.cam.x, s.cam.y, s.cam.z);
      if (iso) this._dropLine(cp, this.worldPt(s.cam.x, fy, s.cam.z), 'rgba(90,200,250,0.35)', dpr);
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

      if (iso) this._drawCompass(dpr);
    }

    _boxSize(l, textW, dpr) {
      if (this.mode === 'top') return { w: Math.max(l.w * this.zoom, textW + 18 * dpr), h: 22 * dpr };
      if (this.mode === 'side') return { w: 22 * dpr, h: Math.max(l.h * this.zoom, 22 * dpr) };
      return { w: Math.max(l.w * this.zoom * ISO_C, textW + 18 * dpr), h: 22 * dpr };
    }
    _dropLine(from, to, colour, dpr) {
      const c = this.ctx;
      c.strokeStyle = colour; c.lineWidth = 1 * dpr; c.setLineDash([3 * dpr, 3 * dpr]);
      c.beginPath(); c.moveTo(from.px, from.py); c.lineTo(to.px, to.py); c.stroke();
      c.setLineDash([]);
      c.fillStyle = colour;
      c.beginPath(); c.arc(to.px, to.py, 2.2 * dpr, 0, Math.PI * 2); c.fill();
    }

    _drawFlatGrid(s, dpr) {
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      const top = this.mode === 'top';
      const step = this.zoom > 220 ? 0.25 : this.zoom > 90 ? 0.5 : 1;
      const tl = this._fromPx(0, 0), br = this._fromPx(W, H);
      const hMin = Math.min(tl.h, br.h), hMax = Math.max(tl.h, br.h), vMin = Math.min(tl.v, br.v), vMax = Math.max(tl.v, br.v);
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
    }

    /* The floor of the isometric view: a grid on a plane just under the video, X across and depth away. */
    _drawIsoGrid(s, dpr) {
      const c = this.ctx;
      const fy = this._floorY(s);
      let xMin = -3, xMax = 3, zMin = -2, zMax = Math.max(6, s.camDist + 2);
      for (const l of s.layers) if (!l.hidden) { xMin = Math.min(xMin, l.x - 1); xMax = Math.max(xMax, l.x + 1); zMin = Math.min(zMin, l.z - 1); zMax = Math.max(zMax, l.z + 1); }
      zMax = Math.max(zMax, s.cam.z + 1.5); zMin = Math.min(zMin, s.cam.z - 1);
      xMin = Math.floor(Math.min(xMin, s.cam.x - 1)); xMax = Math.ceil(Math.max(xMax, s.cam.x + 1)); zMin = Math.floor(zMin); zMax = Math.ceil(zMax);
      const step = this.zoom > 260 ? 0.25 : this.zoom > 110 ? 0.5 : 1;
      const line = (a, b, colour, width) => { c.strokeStyle = colour; c.lineWidth = width; c.beginPath(); c.moveTo(a.px, a.py); c.lineTo(b.px, b.py); c.stroke(); };
      // floor fill
      const f = [this.worldPt(xMin, fy, zMin), this.worldPt(xMax, fy, zMin), this.worldPt(xMax, fy, zMax), this.worldPt(xMin, fy, zMax)];
      c.fillStyle = 'rgba(255,255,255,0.018)';
      c.beginPath(); f.forEach((q, i) => (i ? c.lineTo(q.px, q.py) : c.moveTo(q.px, q.py))); c.closePath(); c.fill();
      if (this.snap && this.gridStep * this.zoom >= 7) {
        const g = this.gridStep;
        for (let x = Math.ceil(xMin / g) * g; x <= xMax + 1e-9; x += g) line(this.worldPt(x, fy, zMin), this.worldPt(x, fy, zMax), '#15151a', 1);
        for (let z = Math.ceil(zMin / g) * g; z <= zMax + 1e-9; z += g) line(this.worldPt(xMin, fy, z), this.worldPt(xMax, fy, z), '#15151a', 1);
      }
      for (let x = Math.ceil(xMin / step) * step; x <= xMax + 1e-9; x += step) {
        const major = Math.abs(x - Math.round(x)) < 1e-6;
        line(this.worldPt(x, fy, zMin), this.worldPt(x, fy, zMax), major ? '#25252e' : '#19191f', 1);
      }
      for (let z = Math.ceil(zMin / step) * step; z <= zMax + 1e-9; z += step) {
        const major = Math.abs(z - Math.round(z)) < 1e-6;
        line(this.worldPt(xMin, fy, z), this.worldPt(xMax, fy, z), major ? '#25252e' : '#19191f', 1);
        if (major) {
          const q = this.worldPt(xMax, fy, z);
          c.fillStyle = '#5c5c68'; c.textAlign = 'left'; c.font = `${10 * dpr}px Inter, sans-serif`;
          c.fillText(z === 0 ? 'video plane' : `${z.toFixed(0)}`, q.px + 6 * dpr, q.py);
        }
      }
      // the video plane's foot on the floor, and the centre line x = 0
      line(this.worldPt(0, fy, zMin), this.worldPt(0, fy, zMax), 'rgba(255,255,255,0.09)', 1.2 * dpr);
      const vz = s.video.z || 0;
      line(this.worldPt(xMin, fy, vz), this.worldPt(xMax, fy, vz), 'rgba(255,107,107,0.35)', 1.2 * dpr);
    }

    _drawCompass(dpr) {
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      const ox = W - 48 * dpr, oy = H - 64 * dpr, L = 22 * dpr;
      const arrow = (dir, colour, label) => {
        c.strokeStyle = colour; c.fillStyle = colour; c.lineWidth = 1.6 * dpr;
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + dir.h * L, oy + dir.v * L); c.stroke();
        c.font = `600 ${10 * dpr}px Inter, sans-serif`; c.textAlign = 'center';
        c.fillText(label, ox + dir.h * (L + 9 * dpr), oy + dir.v * (L + 9 * dpr));
      };
      arrow(ISO_AXES.x, '#ff8f8f', 'x');
      arrow(ISO_AXES.y, '#9be89b', 'y');
      arrow(ISO_AXES.z, '#9edcff', 'depth');
    }

    /* Guide lines while something is being dragged. */
    _dragPoint(s) {
      const d = this.drag;
      if (!d) return null;
      if (d.kind === 'camera') return { x: s.cam.x, y: s.cam.y, z: s.cam.z, name: 'camera' };
      if (d.kind === 'key') { const k = s.keys.find((x) => x.id === d.id); return k ? { x: k.x, y: k.y, z: k.z, name: `key ${k.t.toFixed(1)}s` } : null; }
      if (d.kind === 'layer') { const l = s.layers.find((x) => x.id === d.ids[0]); return l ? { x: l.x, y: l.y, z: l.z, name: (l.text || '').split('\n')[0].slice(0, 18) } : null; }
      return null;
    }
    _otherPoints(s) {
      const d = this.drag, out = [];
      for (const l of s.layers) if (!l.hidden && !(d.kind === 'layer' && d.ids.includes(l.id))) out.push({ x: l.x, y: l.y, z: l.z });
      if (d.kind !== 'camera') out.push({ x: s.cam.x, y: s.cam.y, z: s.cam.z });
      for (const k of s.keys) if (!(d.kind === 'key' && d.id === k.id)) out.push({ x: k.x, y: k.y, z: k.z });
      return out;
    }
    _drawGuides(s, dpr) {
      const p = this._dragPoint(s);
      if (!p) return;
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      const d = this.drag;
      const tol = 5 * dpr / this.zoom;   // world units within which two things count as aligned
      const others = this._otherPoints(s);
      const q = this.worldPt(p.x, p.y, p.z);
      c.save();
      c.font = `${10 * dpr}px Inter, sans-serif`;
      const dash = (a, b, colour, width, pattern) => { c.strokeStyle = colour; c.lineWidth = width; c.setLineDash(pattern || [5 * dpr, 4 * dpr]); c.beginPath(); c.moveTo(a.px, a.py); c.lineTo(b.px, b.py); c.stroke(); c.setLineDash([]); };
      const tag = (text, x, y, colour, align) => { c.fillStyle = colour; c.textAlign = align || 'left'; c.fillText(text, x, y); };

      if (this.mode !== 'iso') {
        const top = this.mode === 'top';
        const a = this._axes(p.x, p.y, p.z);
        const vz = s.video.z || 0;
        // centre axes of the scene: x = 0 (or y = 0) and the video plane's depth
        const centres = top
          ? [{ ax: 'h', val: 0, label: 'centre' }, { ax: 'v', val: vz, label: 'video plane' }]
          : [{ ax: 'h', val: vz, label: 'video plane' }, { ax: 'v', val: 0, label: 'centre' }];
        for (const cen of centres) {
          const on = Math.abs((cen.ax === 'h' ? a.h : a.v) - cen.val) <= tol;
          const colour = on ? ALIGN : CENTRE;
          if (cen.ax === 'h') { const { px } = this._toPx(cen.val, 0); dash({ px, py: 0 }, { px, py: H }, colour, (on ? 1.6 : 1) * dpr, on ? [] : [3 * dpr, 5 * dpr]); if (on) tag(cen.label, px + 6 * dpr, 14 * dpr, colour); }
          else { const { py } = this._toPx(0, cen.val); dash({ px: 0, py }, { px: W, py }, colour, (on ? 1.6 : 1) * dpr, on ? [] : [3 * dpr, 5 * dpr]); if (on) tag(cen.label, W - 8 * dpr, py - 8 * dpr, colour, 'right'); }
        }
        // lines through the moving thing along both drawn axes (only the locked one when Shift holds an axis)
        if (d.axis !== 'h') dash({ px: q.px, py: 0 }, { px: q.px, py: H }, GUIDE, (d.axis === 'v' ? 1.8 : 1.1) * dpr);
        if (d.axis !== 'v') dash({ px: 0, py: q.py }, { px: W, py: q.py }, GUIDE, (d.axis === 'h' ? 1.8 : 1.1) * dpr);
        // alignment with other words, the camera and the keys
        for (const o of others) {
          const b = this._axes(o.x, o.y, o.z);
          const oq = this._toPx(b.h, b.v);
          if (Math.abs(b.h - a.h) <= tol) { dash({ px: oq.px, py: 0 }, { px: oq.px, py: H }, ALIGN, 1.4 * dpr, []); c.fillStyle = ALIGN; c.beginPath(); c.arc(oq.px, oq.py, 3.5 * dpr, 0, Math.PI * 2); c.fill(); }
          if (Math.abs(b.v - a.v) <= tol) { dash({ px: 0, py: oq.py }, { px: W, py: oq.py }, ALIGN, 1.4 * dpr, []); c.fillStyle = ALIGN; c.beginPath(); c.arc(oq.px, oq.py, 3.5 * dpr, 0, Math.PI * 2); c.fill(); }
        }
        // readouts at the edges
        const hName = top ? 'x' : 'depth', vName = top ? 'depth' : 'y';
        tag(`${hName} ${a.h.toFixed(2)}`, q.px + 6 * dpr, H - 10 * dpr, GUIDE);
        tag(`${vName} ${a.v.toFixed(2)}`, 8 * dpr, q.py - 9 * dpr, GUIDE);
      } else {
        const fy = this._floorY(s);
        const R = 30;
        const axisLine = (axis, colour, width, pattern) => {
          const a = axis === 'x' ? this.worldPt(p.x - R, p.y, p.z) : axis === 'z' ? this.worldPt(p.x, p.y, p.z - R) : this.worldPt(p.x, p.y - R, p.z);
          const b = axis === 'x' ? this.worldPt(p.x + R, p.y, p.z) : axis === 'z' ? this.worldPt(p.x, p.y, p.z + R) : this.worldPt(p.x, p.y + R, p.z);
          dash(a, b, colour, width, pattern);
        };
        // the centre lines of the floor (x = 0, video plane depth) light up when the thing sits on them
        const onX = Math.abs(p.x) <= tol, onZ = Math.abs(p.z - (s.video.z || 0)) <= tol, onY = Math.abs(p.y) <= tol;
        dash(this.worldPt(0, fy, -R), this.worldPt(0, fy, R), onX ? ALIGN : CENTRE, (onX ? 1.6 : 1) * dpr, onX ? [] : [3 * dpr, 5 * dpr]);
        dash(this.worldPt(-R, fy, s.video.z || 0), this.worldPt(R, fy, s.video.z || 0), onZ ? ALIGN : CENTRE, (onZ ? 1.6 : 1) * dpr, onZ ? [] : [3 * dpr, 5 * dpr]);
        if (onY) { dash(this.worldPt(p.x - 1.5, 0, p.z), this.worldPt(p.x + 1.5, 0, p.z), ALIGN, 1.4 * dpr, []); }
        // lines through the moving thing along the three axes; the held one (Shift) is drawn strong
        const plane = d.plane || this.isoPlane;
        for (const ax of ['x', 'z', 'y']) {
          const locked = d.axis === ax;
          const inPlane = plane === 'height' ? ax === 'y' : ax !== 'y';
          if (d.axis && !locked) continue;
          axisLine(ax, GUIDE, (locked ? 1.9 : inPlane ? 1.1 : 0.7) * dpr, inPlane || locked ? undefined : [2 * dpr, 6 * dpr]);
        }
        // alignment with other things, axis by axis
        for (const o of others) {
          const oq = this.worldPt(o.x, o.y, o.z);
          let hit = false;
          if (Math.abs(o.x - p.x) <= tol) { dash(this.worldPt(o.x, o.y, o.z - R), this.worldPt(o.x, o.y, o.z + R), ALIGN, 1.4 * dpr, []); hit = true; }
          if (Math.abs(o.z - p.z) <= tol) { dash(this.worldPt(o.x - R, o.y, o.z), this.worldPt(o.x + R, o.y, o.z), ALIGN, 1.4 * dpr, []); hit = true; }
          if (Math.abs(o.y - p.y) <= tol) { dash(this.worldPt(o.x - R, o.y, o.z), this.worldPt(o.x + R, o.y, o.z), ALIGN, 0.8 * dpr, [2 * dpr, 4 * dpr]); hit = true; }
          if (hit) { c.fillStyle = ALIGN; c.beginPath(); c.arc(oq.px, oq.py, 3.5 * dpr, 0, Math.PI * 2); c.fill(); }
        }
        const foot = this.worldPt(p.x, fy, p.z);
        dash(q, foot, GUIDE, 1 * dpr, [2 * dpr, 3 * dpr]);
        tag(`x ${p.x.toFixed(2)} · y ${p.y.toFixed(2)} · depth ${p.z.toFixed(2)}`, q.px + 14 * dpr, q.py - 16 * dpr, GUIDE);
      }
      c.restore();
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

    /* The camera in the isometric view: a pyramid to the frame it sees, with the sharp band as slabs. */
    _drawCameraIso(s, dpr) {
      const c = this.ctx;
      const cam = s.cam;
      const yaw = cam.yaw * D2R, pitch = cam.pitch * D2R;
      const f = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
      const r = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
      const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };   // r × f
      const halfV = Math.tan((s.fov * D2R) / 2), halfH = halfV * s.aspect;
      const rect = (dist) => {
        const cx = cam.x + f.x * dist, cy = cam.y + f.y * dist, cz = cam.z + f.z * dist;
        const w = halfH * dist, h = halfV * dist;
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => this.worldPt(cx + r.x * w * sx + u.x * h * sy, cy + r.y * w * sx + u.y * h * sy, cz + r.z * w * sx + u.z * h * sy));
      };
      const poly = (pts, fill, stroke, width, dash) => {
        c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.px, q.py) : c.moveTo(q.px, q.py))); c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); }
      };
      const len = Math.max(1.2, cam.z + 1.5);
      const far = rect(len);
      const p0 = this.worldPt(cam.x, cam.y, cam.z);
      c.strokeStyle = 'rgba(90,200,250,0.45)'; c.lineWidth = 1.1 * dpr;
      c.beginPath(); for (const q of far) { c.moveTo(p0.px, p0.py); c.lineTo(q.px, q.py); } c.stroke();
      poly(far, 'rgba(90,200,250,0.05)', 'rgba(90,200,250,0.45)', 1.1 * dpr);
      if (cam.aperture > 0 && cam.sharpNear != null) {
        const near = rect(cam.sharpNear);
        poly(near, 'rgba(120,230,160,0.08)', 'rgba(120,230,160,0.85)', 1.2 * dpr, [5 * dpr, 4 * dpr]);
        c.fillStyle = 'rgba(120,230,160,0.85)'; c.font = `${10 * dpr}px Inter, sans-serif`; c.textAlign = 'left';
        c.fillText('sharp from', near[1].px + 5 * dpr, near[1].py);
        if (cam.sharpFar > cam.sharpNear && cam.sharpFar < 12) {
          const farS = rect(cam.sharpFar);
          poly(farS, 'rgba(120,230,160,0.05)', 'rgba(120,230,160,0.5)', 1.2 * dpr, [5 * dpr, 4 * dpr]);
          c.fillStyle = 'rgba(120,230,160,0.6)'; c.fillText('sharp to', farS[1].px + 5 * dpr, farS[1].py);
        }
      }
      if (cam.fade && cam.fade.farEnd > 0) {
        const fd = rect(cam.fade.farStart);
        poly(fd, null, 'rgba(255,255,255,0.3)', 1 * dpr, [2 * dpr, 4 * dpr]);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.font = `${10 * dpr}px Inter, sans-serif`; c.textAlign = 'left';
        c.fillText('fade', fd[1].px + 5 * dpr, fd[1].py);
      }
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
      this.ctx.font = `600 ${12 * dpr}px Inter, sans-serif`;
      for (let i = s.layers.length - 1; i >= 0; i--) {
        const l = s.layers[i];
        if (l.hidden) continue;
        const q = this.worldPt(l.x, l.y, l.z);
        const label = (l.text || '').split('\n')[0].slice(0, 18) || 'text';
        const textW = this.ctx.measureText(label).width;
        const { w, h } = this._boxSize(l, textW, dpr);
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
        const s = this.hooks.scene();
        if (h.kind === 'camera') {
          this.drag = { kind: 'camera', moved: false, start0: w, base: { x: s.cam.x, y: s.cam.y, z: s.cam.z } };
        } else if (h.kind === 'key') {
          this.hooks.onSelectKey(h.id);
          const k = s.keys.find((x) => x.id === h.id);
          this.drag = { kind: 'key', id: h.id, moved: false, start0: w, base: { x: k.x, y: k.y, z: k.z } };
        } else {
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
          this.center = { h: d.center0.h - dh, v: this.mode === 'side' ? d.center0.v + dv : d.center0.v - dv };
          this.draw();
          return;
        }
        cv.style.cursor = 'grabbing';
        const mods = { shift: e.shiftKey, snap: this.snap, step: this.gridStep, alt: e.altKey };
        if (d.start0 == null) d.start0 = w;
        const dh0 = w.h - d.start0.h, dv0 = w.v - d.start0.v;
        if (this.mode === 'iso') {
          // Plain drags move on the floor (X · depth) or in height (Y) — the segment picks which, and
          // Ctrl/Cmd flips it for the duration of the drag. Shift locks to whichever axis the pointer
          // set off along.
          d.plane = (e.ctrlKey || e.metaKey) ? (this.isoPlane === 'floor' ? 'height' : 'floor') : this.isoPlane;
          if (e.shiftKey) {
            if (!d.axis && Math.hypot(dh0, dv0) * this.zoom > 6) {
              const n = Math.hypot(dh0, dv0);
              let best = 'x', bd = -1;
              for (const ax of ['x', 'y', 'z']) { const a = ISO_AXES[ax]; const dot = Math.abs((dh0 * a.h + dv0 * a.v) / n); if (dot > bd) { bd = dot; best = ax; } }
              d.axis = best;
            }
          } else d.axis = null;
          const delta = this._isoDelta(dh0, dv0, d.axis, d.plane);
          if (d.kind === 'camera') this.hooks.onCameraDragMove({ x: d.base.x + delta.dx, y: d.base.y + delta.dy, z: d.base.z + delta.dz }, mods);
          else if (d.kind === 'key') this.hooks.onKeyDragMove(d.id, { x: d.base.x + delta.dx, y: d.base.y + delta.dy, z: d.base.z + delta.dz }, mods);
          else if (d.kind === 'layer') this.hooks.onLayerDragMove(d.ids, delta, mods);
          this.draw();
          return;
        }
        // Shift locks the drag to one axis: whichever the pointer clearly moved along first.
        let wh = w.h, wv = w.v;
        if (e.shiftKey) {
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
