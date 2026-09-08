/* Video export.
 *
 * Primary path: WebCodecs VideoEncoder (H.264 / VP9 / AV1) + mp4-muxer -> .mp4, frame-accurate, up to 4K.
 * Fallback:     MediaRecorder on canvas.captureStream() in real time -> .webm (or .mp4 where supported).
 */
(function (global) {
  'use strict';

  const hasWebCodecs = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && typeof Mp4Muxer !== 'undefined';
  const hasMediaRecorder = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;

  const H264_CANDIDATES = ['avc1.640034', 'avc1.640033', 'avc1.64002A', 'avc1.4D4028', 'avc1.42E01E'];

  async function pickVideoCodec(width, height, bitrate, fps) {
    const tryList = [
      ...H264_CANDIDATES.map((c) => ({ codec: c, mux: 'avc', extra: { avc: { format: 'avc' } } })),
      { codec: 'vp09.00.51.08', mux: 'vp9', extra: {} },
      { codec: 'av01.0.13M.08', mux: 'av1', extra: {} },
    ];
    for (const cand of tryList) {
      for (const hw of ['prefer-hardware', 'prefer-software']) {
        const config = Object.assign({
          codec: cand.codec, width, height, bitrate, framerate: fps,
          hardwareAcceleration: hw, latencyMode: 'quality', bitrateMode: 'variable',
        }, cand.extra);
        try {
          const res = await VideoEncoder.isConfigSupported(config);
          if (res.supported) return { config, mux: cand.mux };
        } catch (e) { /* try next */ }
      }
    }
    return null;
  }

  async function pickAudioCodec(sampleRate, channels) {
    if (typeof AudioEncoder === 'undefined') return null;
    const list = [
      { codec: 'mp4a.40.2', mux: 'aac' },
      { codec: 'opus', mux: 'opus' },
    ];
    for (const c of list) {
      const config = { codec: c.codec, sampleRate, numberOfChannels: channels, bitrate: 192000 };
      try {
        const res = await AudioEncoder.isConfigSupported(config);
        if (res.supported) return { config, mux: c.mux };
      } catch (e) { /* next */ }
    }
    return null;
  }

  async function decodeAudio(file, start, end) {
    if (!file) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ctx;
    try {
      ctx = new AC({ sampleRate: 48000 });
      const buf = await file.arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      const sr = audio.sampleRate;
      const channels = Math.min(2, audio.numberOfChannels);
      const s0 = Math.max(0, Math.floor(start * sr));
      const s1 = Math.min(audio.length, Math.floor(end * sr));
      if (s1 <= s0) return null;
      const planes = [];
      for (let c = 0; c < channels; c++) planes.push(audio.getChannelData(c).slice(s0, s1));
      return { sampleRate: sr, channels, planes, frames: s1 - s0 };
    } catch (e) {
      console.warn('Audio decode failed; exporting without audio.', e);
      return null;
    } finally {
      if (ctx && ctx.close) ctx.close().catch(() => {});
    }
  }

  function estimateBitrate(width, height, fps, quality) {
    const bpp = { standard: 0.07, high: 0.12, max: 0.2 }[quality] || 0.12;
    return Math.min(90e6, Math.max(2e6, Math.round(width * height * fps * bpp)));
  }

  /**
   * Export with WebCodecs.
   * opts = { canvas, width, height, fps, start, end, quality, renderFrame(t), audioFile, includeAudio,
   *          fileHandle (optional FileSystemFileHandle), onProgress(info), signal (AbortSignal) }
   * Resolves to { blob, mime, ext } (blob null when streamed to fileHandle).
   */
  async function exportWebCodecs(opts) {
    const { canvas, width, height, fps, start, end } = opts;
    const duration = end - start;
    const frameCount = Math.max(1, Math.round(duration * fps));
    const bitrate = estimateBitrate(width, height, fps, opts.quality);
    const report = (patch) => opts.onProgress && opts.onProgress(patch);
    const aborted = () => opts.signal && opts.signal.aborted;

    report({ stage: 'Preparing encoder…', progress: 0 });
    const vc = await pickVideoCodec(width, height, bitrate, fps);
    if (!vc) throw new Error(`No supported video encoder for ${width}×${height}. Try a lower resolution.`);

    let audio = null, ac = null;
    if (opts.includeAudio && opts.audioFile) {
      report({ stage: 'Decoding audio…' });
      audio = await decodeAudio(opts.audioFile, start, end);
      if (audio) ac = await pickAudioCodec(audio.sampleRate, audio.channels);
      if (audio && !ac) { console.warn('No audio encoder available; exporting silent video.'); audio = null; }
    }

    const useFile = !!opts.fileHandle;
    let writable = null, target;
    if (useFile) {
      writable = await opts.fileHandle.createWritable();
      target = new Mp4Muxer.FileSystemWritableFileStreamTarget(writable);
    } else {
      target = new Mp4Muxer.ArrayBufferTarget();
    }

    const muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: vc.mux, width, height, frameRate: fps },
      audio: audio ? { codec: ac.mux, sampleRate: audio.sampleRate, numberOfChannels: audio.channels } : undefined,
      fastStart: useFile ? false : 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    let encodeError = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => { encodeError = e; },
    });
    encoder.configure(vc.config);

    // ---- Audio ----
    if (audio) {
      const aenc = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => { encodeError = e; },
      });
      aenc.configure(ac.config);
      const CHUNK = 4096;
      for (let off = 0; off < audio.frames; off += CHUNK) {
        if (aborted()) break;
        const n = Math.min(CHUNK, audio.frames - off);
        const data = new Float32Array(n * audio.channels);
        for (let c = 0; c < audio.channels; c++) data.set(audio.planes[c].subarray(off, off + n), c * n);
        const ad = new AudioData({
          format: 'f32-planar', sampleRate: audio.sampleRate, numberOfFrames: n, numberOfChannels: audio.channels,
          timestamp: Math.round((off / audio.sampleRate) * 1e6), data,
        });
        aenc.encode(ad);
        ad.close();
        if (aenc.encodeQueueSize > 16) await new Promise((r) => setTimeout(r, 5));
      }
      await aenc.flush();
      aenc.close();
      audio.planes = null;
    }

    // ---- Video ----
    const t0 = performance.now();
    const usPerFrame = 1e6 / fps;
    const keyEvery = Math.max(1, Math.round(fps * 2));
    try {
      for (let i = 0; i < frameCount; i++) {
        if (aborted()) throw new DOMException('Export cancelled', 'AbortError');
        if (encodeError) throw encodeError;
        const t = start + i / fps;
        await opts.renderFrame(Math.min(t, end - 0.0001));
        const frame = new VideoFrame(canvas, { timestamp: Math.round(i * usPerFrame), duration: Math.round(usPerFrame) });
        encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
        frame.close();
        while (encoder.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
        if (i % 3 === 0 || i === frameCount - 1) {
          const elapsed = (performance.now() - t0) / 1000;
          const rate = (i + 1) / Math.max(0.001, elapsed);
          report({
            stage: `Rendering frame ${i + 1} / ${frameCount}`,
            progress: (i + 1) / frameCount,
            eta: (frameCount - i - 1) / Math.max(0.1, rate),
          });
        }
      }
      report({ stage: 'Finalising…', progress: 1 });
      await encoder.flush();
      encoder.close();
      if (encodeError) throw encodeError;
      muxer.finalize();
      if (writable) { await writable.close(); return { blob: null, mime: 'video/mp4', ext: 'mp4', codec: vc.config.codec, audio: !!audio }; }
      return { blob: new Blob([target.buffer], { type: 'video/mp4' }), mime: 'video/mp4', ext: 'mp4', codec: vc.config.codec, audio: !!audio };
    } catch (e) {
      try { encoder.close(); } catch (_) { /* ignore */ }
      if (writable) { try { await writable.abort(); } catch (_) { /* ignore */ } }
      throw e;
    }
  }

  /**
   * Real-time fallback with MediaRecorder. Plays the source video and records the canvas.
   * opts = { canvas, fps, start, end, video, renderFrame(t), onProgress, signal, quality, width, height }
   */
  function exportMediaRecorder(opts) {
    return new Promise((resolve, reject) => {
      const { canvas, fps, start, end, video } = opts;
      const report = (patch) => opts.onProgress && opts.onProgress(patch);
      const stream = canvas.captureStream(fps);
      if (video && video.captureStream) {
        try { video.captureStream().getAudioTracks().forEach((t) => stream.addTrack(t)); } catch (e) { /* ignore */ }
      }
      const mimes = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const rec = new MediaRecorder(stream, {
        mimeType: mime || undefined,
        videoBitsPerSecond: estimateBitrate(opts.width, opts.height, fps, opts.quality),
      });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = (e) => reject(e.error || new Error('MediaRecorder failed'));
      rec.onstop = () => {
        const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
        resolve({ blob: new Blob(chunks, { type: mime || 'video/webm' }), mime: mime || 'video/webm', ext, codec: mime, audio: stream.getAudioTracks().length > 0 });
      };

      let rafId = 0;
      let stopped = false;
      const duration = end - start;
      const wall0 = performance.now();
      const finish = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        if (video) video.pause();
        try { rec.stop(); } catch (e) { reject(e); }
      };
      const tick = async () => {
        if (stopped) return;
        if (opts.signal && opts.signal.aborted) { stopped = true; try { rec.stop(); } catch (_) { /* ignore */ } reject(new DOMException('Export cancelled', 'AbortError')); return; }
        const t = video ? video.currentTime : start + (performance.now() - wall0) / 1000;
        if (t >= end - 0.02 || (video && video.ended)) { finish(); return; }
        await opts.renderFrame(t, true);
        report({ stage: 'Recording in real time…', progress: Math.min(1, (t - start) / duration), eta: end - t });
        rafId = requestAnimationFrame(tick);
      };

      const begin = () => {
        rec.start(250);
        rafId = requestAnimationFrame(tick);
      };
      if (video) {
        video.currentTime = start;
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); video.play().then(begin).catch(reject); };
        video.addEventListener('seeked', onSeeked);
      } else {
        begin();
      }
    });
  }

  global.Exporter = { hasWebCodecs, hasMediaRecorder, exportWebCodecs, exportMediaRecorder, estimateBitrate };
})(window);
