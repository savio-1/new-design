/* Minimal column-major 4x4 matrix helpers (WebGL convention). */
(function (global) {
  'use strict';

  const M4 = {
    identity() {
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    },

    multiply(a, b) {
      const out = new Float32Array(16);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          out[c * 4 + r] =
            a[r] * b[c * 4] +
            a[4 + r] * b[c * 4 + 1] +
            a[8 + r] * b[c * 4 + 2] +
            a[12 + r] * b[c * 4 + 3];
        }
      }
      return out;
    },

    perspective(fovYRad, aspect, near, far) {
      const f = 1 / Math.tan(fovYRad / 2);
      const nf = 1 / (near - far);
      const out = new Float32Array(16);
      out[0] = f / aspect;
      out[5] = f;
      out[10] = (far + near) * nf;
      out[11] = -1;
      out[14] = 2 * far * near * nf;
      return out;
    },

    translation(x, y, z) {
      const out = M4.identity();
      out[12] = x;
      out[13] = y;
      out[14] = z;
      return out;
    },

    scaling(x, y, z) {
      const out = M4.identity();
      out[0] = x;
      out[5] = y;
      out[10] = z;
      return out;
    },

    rotationX(rad) {
      const c = Math.cos(rad), s = Math.sin(rad);
      const out = M4.identity();
      out[5] = c; out[6] = s; out[9] = -s; out[10] = c;
      return out;
    },

    rotationY(rad) {
      const c = Math.cos(rad), s = Math.sin(rad);
      const out = M4.identity();
      out[0] = c; out[2] = -s; out[8] = s; out[10] = c;
      return out;
    },

    rotationZ(rad) {
      const c = Math.cos(rad), s = Math.sin(rad);
      const out = M4.identity();
      out[0] = c; out[1] = s; out[4] = -s; out[5] = c;
      return out;
    },

    /* Compose translate * rotZ * rotY * rotX * scale (degrees in). */
    compose(tx, ty, tz, rxDeg, ryDeg, rzDeg, sx, sy, sz) {
      const D = Math.PI / 180;
      let m = M4.translation(tx, ty, tz);
      if (rzDeg) m = M4.multiply(m, M4.rotationZ(rzDeg * D));
      if (ryDeg) m = M4.multiply(m, M4.rotationY(ryDeg * D));
      if (rxDeg) m = M4.multiply(m, M4.rotationX(rxDeg * D));
      if (sx !== 1 || sy !== 1 || sz !== 1) m = M4.multiply(m, M4.scaling(sx, sy, sz));
      return m;
    },

    transformPoint(m, x, y, z) {
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      return {
        x: (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
        y: (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
        z: (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
        w,
      };
    },
  };

  global.M4 = M4;
})(window);
