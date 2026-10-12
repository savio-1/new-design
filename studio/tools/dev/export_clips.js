/* Export templates as videos (WebM in headless Chromium) into OUT/<id>.webm.
     IDS=te-build,te-wall node studio/tools/dev/run.js studio/tools/dev/export_clips.js */
const fs = require('fs'), path = require('path');
module.exports = async (page, OUT) => {
  for (const id of (process.env.IDS || 'te-build').split(',')) {
    const b64 = await page.evaluate(async (id) => {
      const S = window.Studio, R = window.StudioRender;
      const t = window.STUDIO_TEMPLATES.find(x => x.id === id);
      document.body.classList.remove('at-home'); const h = document.querySelector('#home'); if (h) h.hidden = true;
      S.loadDoc(t.build(), null, { name: t.name });
      await R.preload(S.doc); await new Promise(r => setTimeout(r, 500));
      const k = 720 / Math.min(S.doc.width, S.doc.height);
      const out = await S.exportVideo({ width: Math.round(S.doc.width * k), height: Math.round(S.doc.height * k), fps: 30, duration: S.doc.anim.duration, format: 'webm', bitrate: 6e6 });
      const buf = new Uint8Array(await out.blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
      return btoa(bin);
    }, id);
    fs.writeFileSync(path.join(OUT, id + '.webm'), Buffer.from(b64, 'base64'));
    console.log('exported', id);
  }
};
