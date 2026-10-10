/* Collage Studio — video export.
   Renders the animation frame by frame with the same canvas renderer used for
   images, encodes with WebCodecs (H.264 → MP4, or VP9 → WebM) and muxes the
   result in the browser. Browsers without WebCodecs fall back to recording the
   canvas in real time with MediaRecorder. */
(function () {
  'use strict';

  const S = window.Studio, R = window.StudioRender;
  const LIBS = {
    mp4: 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.5/build/mp4-muxer.js',
    webm: 'https://cdn.jsdelivr.net/npm/webm-muxer@5.0.4/build/webm-muxer.js',
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const even = n => Math.max(2, Math.round(n / 2) * 2);
  S.even = even;

  function loadScript(src) {
    return new Promise((res, rej) => {
      if ([...document.scripts].some(s => s.src === src)) return res();
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  // best encoder this browser offers for the size: H.264 first (plays everywhere), then VP9, then VP8
  async function pickEncoder(width, height, fps, bitrate, prefer) {
    if (!('VideoEncoder' in window)) return null;
    const avc = ['avc1.640034', 'avc1.640033', 'avc1.640032', 'avc1.64002a', 'avc1.640028', 'avc1.4d0034', 'avc1.42e034'];
    const vp = ['vp09.00.51.08', 'vp09.00.50.08', 'vp09.00.41.08', 'vp8'];
    const order = prefer === 'webm' ? [['webm', vp], ['mp4', avc]] : [['mp4', avc], ['webm', vp]];
    for (const [kind, list] of order) {
      for (const codec of list) {
        const cfg = { codec, width, height, bitrate, framerate: fps, latencyMode: 'quality' };
        if (kind === 'mp4') cfg.avc = { format: 'avc' };
        try {
          const r = await VideoEncoder.isConfigSupported(cfg);
          if (r.supported) return { kind, cfg: r.config || cfg };
        } catch (e) { /* try the next codec */ }
      }
    }
    return null;
  }
  S.videoFormats = async function (width, height, fps) {
    const out = [];
    const m = await pickEncoder(width, height, fps, 8e6, 'mp4');
    if (m) out.push(m.kind);
    const w = await pickEncoder(width, height, fps, 8e6, 'webm');
    if (w && !out.includes(w.kind)) out.push(w.kind);
    if (!out.length && window.MediaRecorder) out.push('webm-realtime');
    return out;
  };

  S.exportVideo = async function ({ width, height, fps = 30, duration = 5, bitrate, format = 'mp4', onProgress = () => {}, signal }) {
    const doc = S.doc;
    width = even(width); height = even(height);
    bitrate = bitrate || Math.round(width * height * fps * 0.1);
    await R.preload(doc);
    const enc = await pickEncoder(width, height, fps, bitrate, format);
    if (!enc) return recordRealtime({ width, height, fps, duration, bitrate, onProgress, signal });
    await loadScript(LIBS[enc.kind]);
    const Lib = enc.kind === 'mp4' ? window.Mp4Muxer : window.WebMMuxer;
    const muxer = enc.kind === 'mp4'
      ? new Lib.Muxer({ target: new Lib.ArrayBufferTarget(), video: { codec: 'avc', width, height }, fastStart: 'in-memory' })
      : new Lib.Muxer({ target: new Lib.ArrayBufferTarget(), video: { codec: enc.cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width, height, frameRate: fps } });
    let failure = null;
    const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e; } });
    encoder.configure(enc.cfg);
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const frames = Math.max(1, Math.round(duration * fps));
    const us = 1e6 / fps;
    const hasVid = R.hasVideo(doc);
    R.playing = false; R.pauseVideos();
    try {
      for (let i = 0; i < frames; i++) {
        if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (failure) throw failure;
        // video layers are seeked to their exact frame first
        if (hasVid) await R.syncVideos(doc, i / fps, i === 0);
        R.renderDoc(doc, { canvas: c, time: i / fps });
        const frame = new VideoFrame(c, { timestamp: Math.round(i * us), duration: Math.round(us) });
        encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 4) await sleep(4);
        onProgress((i + 1) / frames, 'render');
        if (i % 2 === 0) await sleep(0);
      }
      onProgress(1, 'finish');
      await encoder.flush();
      if (failure) throw failure;
      muxer.finalize();
    } finally {
      if (encoder.state !== 'closed') encoder.close();
    }
    const type = enc.kind === 'mp4' ? 'video/mp4' : 'video/webm';
    return { blob: new Blob([muxer.target.buffer], { type }), ext: enc.kind, width, height };
  };

  // fallback: draw frames on a timer and record the canvas stream
  async function recordRealtime({ width, height, fps, duration, bitrate, onProgress, signal }) {
    if (!window.MediaRecorder) throw new Error('This browser can’t encode video');
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const stream = c.captureStream(fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = res; });
    await R.syncVideos(S.doc, 0, true);
    R.playing = true;
    R.renderDoc(S.doc, { canvas: c, time: 0 });
    rec.start();
    const t0 = performance.now();
    await new Promise(res => {
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        if (t >= duration || (signal && signal.aborted)) return res();
        R.liveSyncVideos(S.doc, t);
        R.renderDoc(S.doc, { canvas: c, time: t });
        onProgress(t / duration, 'render');
        requestAnimationFrame(step);
      };
      step();
    });
    rec.stop();
    R.playing = false; R.pauseVideos();
    await done;
    if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const type = (mime || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm', width, height };
  }
})();
