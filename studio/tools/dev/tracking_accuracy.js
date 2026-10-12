const fs = require('fs');
/* Tracking accuracy against exact paths (clips from tracking_clips.py).
     CLIPS=dev-out CLIP=push MODE=object|detect|point|edge node studio/tools/dev/run.js studio/tools/dev/tracking_accuracy.js
     CLIP=plane (MODE plane). STEADY=0..100 overrides smoothing; RENDER=1 writes a contact sheet.
   Prints mean / max error of the text corners (canvas px, 1920 canvas) and jitter (frame-to-frame change of the error). */
// tracking v2 accuracy against exact paths: push-in with handshake (object pick) and perspective plane
module.exports = async (page, OUT) => {
  const clip = process.env.CLIP || 'push';
  const Hs = JSON.parse(fs.readFileSync((process.env.CLIPS || OUT) + '/' + clip + '.json'));
  await page.evaluate(() => { document.body.classList.remove('at-home'); document.querySelector('#home').hidden = true; window.Studio.loadDoc({ width: 1920, height: 1080, background: { color: '#eee' }, anim: { duration: 3, fps: 30 }, elements: [] }, null, { name: 't' }); });
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.evaluate(() => window.Studio.pickImages({}))]);
  await fc.setFiles((process.env.CLIPS || OUT) + '/' + clip + '.webm');
  await page.waitForTimeout(3000);
  if (process.env.RENDER) await page.evaluate(() => { window.__RENDER = 1; });
  const r = await page.evaluate(async ({ Hs, clip, mode, steady }) => {
    const S = window.Studio, R = window.StudioRender;
    const vid = S.doc.elements.find(e => e.type === 'image');
    S.changeEl(vid, e => { e.x = 0; e.y = 0; e.width = 1920; e.height = 1080; e.rotation = 0; e.crop = { zoom: 1, x: 0.5, y: 0.5 }; });
    const hp = (H, x, y) => { const w = H[2][0] * x + H[2][1] * y + H[2][2]; return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w]; };
    const inv = m => { const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2]; const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
      return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]]; };
    const toCan = (k, sx, sy) => { const p = hp(Hs[k], sx, sy); return { x: p[0] * 2, y: p[1] * 2 }; };
    const H0i = inv(Hs[0]), toSrc = (x, y) => hp(H0i, x / 2, y / 2);
    let region, textSrc;
    if (clip === 'push') {
      const box = [[1740, 700], [1900, 700], [1900, 850], [1740, 850]];
      region = { mode, pts: mode === 'point' ? [toCan(0, 1817, 772), toCan(0, 1870, 772)] : mode === 'edge' ? [toCan(0, 1550, 862), toCan(0, 2050, 862)] : box.map(p => toCan(0, p[0], p[1])) };
      if (mode === 'detect') { const c = toCan(0, 1817, 772); region = { mode: 'object', pts: await S.detectObject(vid.id, c.x, c.y) }; }
      textSrc = [1817, 600];
    } else {
      const box = [[1125, 442], [1500, 442], [1500, 642], [1125, 642]];
      region = { mode, pts: box.map(p => toCan(0, p[0], p[1])) };
      textSrc = [1312, 760];
    }
    const P = toCan(0, textSrc[0], textSrc[1]);
    const el = S.addElement({ type: 'text', text: 'The Film Look', fontFamily: 'Inter', fontSize: 70, fill: '#fff', x: 0, y: 0 }, { center: false });
    el.x = P.x - el.width / 2; el.y = P.y - el.height / 2;
    const t0 = performance.now();
    el.track = await S.trackLayer(el, { src: vid.id, region });
    if (steady != null) el.track.steady = steady;
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    const corners = [[el.x, el.y], [el.x + el.width, el.y], [el.x + el.width, el.y + el.height], [el.x, el.y + el.height], [el.x + el.width / 2, el.y + el.height / 2]];
    const errs = [], cen = [];
    for (let k = 0; k < 88; k++) {
      const t = (k + 0.5) / 30, X = R.trackXform(el, t, S.doc);
      let e = 0, ce = null;
      corners.forEach(([x, y], i) => {
        const p = X.H ? R.hpt(X.H, x, y) : X.M.transformPoint(new DOMPoint(x, y));
        const s = toSrc(x, y), g = toCan(k, s[0], s[1]), d = Math.hypot(p.x - g.x, p.y - g.y);
        e = Math.max(e, d); if (i === 4) ce = [p.x - g.x, p.y - g.y];
      });
      errs.push(e); cen.push(ce);
    }
    // jitter: frame-to-frame change of the error (what the eye sees as shaking against the object)
    const jit = []; for (let k = 1; k < cen.length; k++) jit.push(Math.hypot(cen[k][0] - cen[k - 1][0], cen[k][1] - cen[k - 1][1]));
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    let diag = null;
    if (el.track.mode === 'similar') {
      const tr = el.track, n = tr.pts.length, rs = tr.pts[0], sc0 = Math.hypot(Hs[0][0][0], Hs[0][1][0]), ro0 = Math.atan2(Hs[0][1][0], Hs[0][0][0]);
      const cS = toSrc(rs[0] * 1920, rs[1] * 1080);
      diag = [];
      for (let k = 0; k < Math.min(n, 88); k += 6) {
        const g = hp(Hs[k], cS[0], cS[1]), p = tr.pts[k];
        const sc = Math.hypot(Hs[k][0][0], Hs[k][1][0]) / sc0, ro = (Math.atan2(Hs[k][1][0], Hs[k][0][0]) - ro0) * 180 / Math.PI;
        diag.push([k, (p[0] * 960 - g[0]).toFixed(1), (p[1] * 540 - g[1]).toFixed(1), (p[2] / rs[2] / sc).toFixed(3), (p[3] - rs[3] - ro).toFixed(2)]);
      }
    }
    if (window.__RENDER) {
      el.fill = '#ffe9a8';
      const times = [0.05, 0.5, 1.0, 1.5, 2.0, 2.5, 2.8, 2.9], w = 480, h = 270, c = document.createElement('canvas'); c.width = w * 4; c.height = h * 2; const x = c.getContext('2d');
      for (let i = 0; i < times.length; i++) { await R.syncVideos(S.doc, times[i], i === 0); x.drawImage(R.renderDoc(S.doc, { scale: 0.25, time: times[i] }), (i % 4) * w, Math.floor(i / 4) * h); }
      window.__sheet = c.toDataURL('image/jpeg', 0.88);
    }
    return { diag, clip, mode, secs, region: region.pts.map(p => [Math.round(p.x), Math.round(p.y)]), meanErr: mean(errs).toFixed(2), maxErr: Math.max(...errs).toFixed(2), jitter: mean(jit).toFixed(2), maxJit: Math.max(...jit).toFixed(2), worst: errs.map((e, i) => [i, e.toFixed(1)]).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, { Hs, clip, mode: process.env.MODE || (clip === 'push' ? 'object' : 'plane'), steady: process.env.STEADY ? +process.env.STEADY : null });
  console.log(JSON.stringify(r));
  if (process.env.RENDER) fs.writeFileSync(OUT + '/track_' + clip + '.jpg', Buffer.from((await page.evaluate(() => window.__sheet)).split(',')[1], 'base64'));
};
