/* Render templates as contact sheets (12 moments across the video) into OUT/sheet_<id>.jpg.
     IDS=te-build,sc-phrases node studio/tools/dev/run.js studio/tools/dev/contact_sheet.js */
const fs = require('fs'), path = require('path');
module.exports = async (page, OUT) => {
  const ids = (process.env.IDS || 'te-build').split(',');
  for (const id of ids) {
    const url = await page.evaluate(async (id) => {
      const S = window.Studio, R = window.StudioRender;
      const t = window.STUDIO_TEMPLATES.find(x => x.id === id);
      document.body.classList.remove('at-home'); const h = document.querySelector('#home'); if (h) h.hidden = true;
      S.loadDoc(t.build(), null, { name: t.name });
      await R.preload(S.doc); await new Promise(r => setTimeout(r, 600)); await R.preload(S.doc);
      const D = (S.doc.anim && S.doc.anim.duration) || 5, n = 12, w = 320, hh = Math.round(w * S.doc.height / S.doc.width);
      const c = document.createElement('canvas'); c.width = w * 4; c.height = hh * 3; const x = c.getContext('2d');
      for (let i = 0; i < n; i++) {
        const tm = t.video ? (i + 0.5) / n * D : null;
        x.drawImage(R.renderDoc(S.doc, { scale: w / S.doc.width, time: tm }), (i % 4) * w, Math.floor(i / 4) * hh);
        x.fillStyle = '#f0f'; x.font = '14px sans-serif'; x.fillText(tm == null ? 'still' : tm.toFixed(2), (i % 4) * w + 4, Math.floor(i / 4) * hh + 16);
      }
      return c.toDataURL('image/jpeg', 0.85);
    }, id);
    fs.writeFileSync(path.join(OUT, 'sheet_' + id + '.jpg'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('sheet', id);
  }
};
