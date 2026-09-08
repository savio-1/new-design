/*!
 * ImageMotionExport — frame-exact MP4 / WebM / GIF export for an ImageMotion scene.
 * Video uses WebCodecs (VideoEncoder) muxed by mp4-muxer / webm-muxer; GIF uses gifenc.
 * Load those first from jsdelivr (UMD builds):
 *   mp4-muxer@5/build/mp4-muxer.min.js       → window.Mp4Muxer
 *   webm-muxer@5/build/webm-muxer.min.js     → window.WebMMuxer
 *   gifenc@1.0.3/dist/gifenc.min.js          → CommonJS build: define `var exports = {}` before it and
 *                                              copy `exports` to window.gifenc afterwards (see index.html)
 *
 *   const blob = await ImageMotionExport.record({ im, renderer, format: 'mp4', fps: 30, duration: 8, background, onProgress });
 *   await ImageMotionExport.save(blob, 'hero.mp4');
 *
 * This file contains no literal HTML tags so it can be inlined in a page.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ImageMotionExport = api;
})(typeof window !== 'undefined' ? window : this, function (root) {
  'use strict';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tick = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? setTimeout(r, 0) : setTimeout(r, 0)));

  const MIME = { mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif' };

  function support() {
    const webcodecs = typeof root.VideoEncoder === 'function' && typeof root.VideoFrame === 'function';
    return {
      webcodecs,
      mp4: webcodecs && !!root.Mp4Muxer,
      webm: (webcodecs && !!root.WebMMuxer) || typeof root.MediaRecorder === 'function',
      gif: !!(root.gifenc && root.gifenc.GIFEncoder),
      mediaRecorder: typeof root.MediaRecorder === 'function',
    };
  }

  /** Reasonable bitrate for the frame size: ~0.1 bit per pixel per frame at 30fps, capped. */
  function bitrateFor(width, height, fps, quality = 'high') {
    const bpp = { low: 0.045, medium: 0.075, high: 0.12, max: 0.2 }[quality] || 0.12;
    return Math.min(120e6, Math.max(1.5e6, Math.round(width * height * fps * bpp)));
  }

  async function pickCodec(format, width, height, fps, bitrate) {
    const list = format === 'mp4'
      ? [['avc1.640034', 'avc'], ['avc1.640033', 'avc'], ['avc1.64002A', 'avc'], ['avc1.640028', 'avc'], ['hvc1.1.6.L153.B0', 'hevc'], ['av01.0.08M.08', 'av1']]
      : [['vp09.00.10.08', 'V_VP9'], ['av01.0.08M.08', 'V_AV1'], ['vp8', 'V_VP8']];
    for (const [codec, mux] of list) {
      try {
        const cfg = { codec, width, height, bitrate, framerate: fps };
        if (mux === 'avc') cfg.avc = { format: 'avc' };
        if (mux === 'hevc') cfg.hevc = { format: 'hevc' };
        const s = await root.VideoEncoder.isConfigSupported(cfg);
        if (s.supported) return { codec, mux, cfg: s.config || cfg };
      } catch (_) { /* try the next one */ }
    }
    return null;
  }

  /**
   * Render frames deterministically (im.seek) and encode them.
   * opts: { im, renderer, format, fps, duration, start, quality, background, onProgress(frac, stage), signal }
   */
  async function record(opts) {
    const { im, renderer, format = 'mp4', fps = 30, duration = 8, start = 0, quality = 'high', background, onProgress, signal } = opts;
    const wasPlaying = im.playing; const t0 = im.t;
    im.pause();
    const savedMouse = { ...im.mouse }; Object.assign(im.mouse, { x: 0, y: 0, tx: 0, ty: 0 });
    const width = renderer.canvas.width, height = renderer.canvas.height;
    const total = Math.max(1, Math.round(duration * fps));
    const step = 1 / fps;
    const abort = () => { if (signal?.aborted) throw Object.assign(new Error('Export cancelled'), { code: 'cancelled' }); };
    const eachFrame = async (fn) => {
      for (let k = 0; k < total; k++) {
        abort();
        im.seek(start + k * step);
        renderer.render({ background });
        await fn(k);
        onProgress?.((k + 1) / total, 'encoding');
        if (k % 3 === 2) await tick();
      }
    };
    try {
      if (format === 'gif') return await recordGif({ renderer, fps, total, eachFrame, width, height });
      if (!support().webcodecs) {
        if (format === 'webm' && support().mediaRecorder) return await recordMediaRecorder({ renderer, fps, total, eachFrame, width, height, bitrate: bitrateFor(width, height, fps, quality) });
        throw Object.assign(new Error('This browser has no WebCodecs support. Use Chrome or Edge for MP4/WebM export, or export a GIF.'), { code: 'unsupported' });
      }
      const bitrate = bitrateFor(width, height, fps, quality);
      const pick = await pickCodec(format, width, height, fps, bitrate);
      if (!pick) throw Object.assign(new Error(`No ${format.toUpperCase()} encoder is available for ${width}×${height}@${fps} in this browser.`), { code: 'unsupported' });
      let muxer, target;
      if (format === 'mp4') {
        target = new root.Mp4Muxer.ArrayBufferTarget();
        muxer = new root.Mp4Muxer.Muxer({ target, video: { codec: pick.mux, width, height }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
      } else {
        target = new root.WebMMuxer.ArrayBufferTarget();
        muxer = new root.WebMMuxer.Muxer({ target, video: { codec: pick.mux, width, height, frameRate: fps }, firstTimestampBehavior: 'offset' });
      }
      let encodeError = null;
      const encoder = new root.VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { encodeError = e; } });
      encoder.configure({ ...pick.cfg, width, height, bitrate, framerate: fps, latencyMode: 'quality' });
      const usec = 1e6 / fps;
      await eachFrame(async (k) => {
        if (encodeError) throw encodeError;
        const frame = new root.VideoFrame(renderer.canvas, { timestamp: Math.round(k * usec), duration: Math.round(usec) });
        encoder.encode(frame, { keyFrame: k % (fps * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 4) { await sleep(4); if (encodeError) throw encodeError; }
      });
      onProgress?.(1, 'finishing');
      await encoder.flush(); encoder.close();
      if (encodeError) throw encodeError;
      muxer.finalize();
      return new Blob([target.buffer], { type: MIME[format] });
    } finally {
      Object.assign(im.mouse, savedMouse);
      im.seek(t0);
      if (wasPlaying) im.play();
    }
  }

  async function recordGif({ renderer, fps, total, eachFrame, width, height }) {
    const g = root.gifenc;
    if (!g || !g.GIFEncoder) throw Object.assign(new Error('GIF encoder (gifenc) is not loaded.'), { code: 'unsupported' });
    const gif = g.GIFEncoder();
    const delay = Math.round(1000 / fps);
    const ctx = renderer.canvas.getContext('2d');
    await eachFrame(async () => {
      const { data } = ctx.getImageData(0, 0, width, height);
      const palette = g.quantize(data, 256, { format: 'rgb565' });
      const index = g.applyPalette(data, palette, 'rgb565');
      gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
    });
    gif.finish();
    return new Blob([gif.bytes()], { type: MIME.gif });
  }

  /** Real-time fallback when WebCodecs is missing (Firefox/Safari): WebM only. */
  async function recordMediaRecorder({ renderer, fps, total, eachFrame, bitrate }) {
    const stream = renderer.canvas.captureStream(0);
    const track = stream.getVideoTracks()[0];
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => root.MediaRecorder.isTypeSupported(m));
    const rec = new root.MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => (rec.onstop = res));
    rec.start(200);
    await eachFrame(async () => { track.requestFrame?.(); await sleep(1000 / fps); });
    rec.stop(); await done;
    return new Blob(chunks, { type: 'video/webm' });
  }

  /** Save a Blob: through the claude.ai downloads capability when the page runs inside an Artifact, else an anchor download. */
  async function save(blob, filename) {
    if (root.claude && typeof root.claude.use === 'function') {
      try {
        const d = await root.claude.use('downloads');
        if (d) { await d.save({ filename, data: blob }); return 'saved'; }
      } catch (e) { if (e && e.code === 'declined') return 'declined'; throw e; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'saved';
  }

  return { record, save, support, bitrateFor, pickCodec, MIME };
});
