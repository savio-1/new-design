#!/usr/bin/env python3
"""Clone a speaker from a short reference recording and read text in that voice.

Uses Coqui XTTS-v2, which clones zero-shot: it needs no training run, just a
clean reference clip of roughly 15-60 seconds. Everything runs locally.

    python clone_voice.py --ref me.wav --text "Hello, this is my cloned voice."
    python clone_voice.py --ref me.m4a --text-file script.txt --out narration.wav

The XTTS-v2 weights are covered by the Coqui Public Model License, which
permits non-commercial use only. Check it before shipping anything built here.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
import wave

os.environ.setdefault("COQUI_TOS_AGREED", "1")

TARGET_SR = 22050          # XTTS operates at 22.05 kHz
MIN_REF_SECONDS = 6.0
IDEAL_REF_SECONDS = 15.0


def fail(message):
    print("error: " + message, file=sys.stderr)
    sys.exit(1)


def prepare_reference(src, workdir):
    """Convert any input to clean mono 22.05 kHz WAV: trim silence, normalise level.

    XTTS conditions on whatever it is given, so room tone and clipping in the
    reference get baked into every line the clone speaks.
    """
    if not os.path.isfile(src):
        fail("reference file not found: " + src)
    if shutil.which("ffmpeg") is None:
        fail("ffmpeg is required to read and clean the reference audio")

    out = os.path.join(workdir, "reference.wav")
    filters = ",".join([
        # drop anything below 60 Hz: rumble, handling noise, HVAC
        "highpass=f=60",
        # strip leading and trailing silence, but keep pauses inside the take
        "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:"
        "detection=peak,areverse,"
        "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:"
        "detection=peak,areverse",
        # broadcast loudness normalisation, so level is consistent run to run
        "loudnorm=I=-18:TP=-2:LRA=11",
    ])
    cmd = [
        "ffmpeg", "-nostdin", "-y", "-loglevel", "error",
        "-i", src, "-vn", "-ac", "1", "-ar", str(TARGET_SR),
        "-af", filters, "-c:a", "pcm_s16le", out,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.isfile(out):
        fail("ffmpeg could not decode the reference:\n" + result.stderr.strip())

    with wave.open(out) as w:
        seconds = w.getnframes() / float(w.getframerate())
    if seconds < MIN_REF_SECONDS:
        fail("reference is only %.1fs of speech after trimming silence; "
             "XTTS needs at least %.0fs" % (seconds, MIN_REF_SECONDS))
    if seconds < IDEAL_REF_SECONDS:
        print("note: %.1fs of reference audio — %.0fs or more clones noticeably "
              "better" % (seconds, IDEAL_REF_SECONDS))
    else:
        print("reference: %.1fs of speech, cleaned to mono %d Hz" % (seconds, TARGET_SR))
    return out


def read_text(args):
    if args.text_file:
        if not os.path.isfile(args.text_file):
            fail("text file not found: " + args.text_file)
        with open(args.text_file, encoding="utf-8") as fh:
            text = fh.read()
    else:
        text = args.text
    text = " ".join(text.split())
    if not text:
        fail("no text to speak")
    return text


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", required=True,
                    help="reference recording of the speaker (wav, mp3, m4a, ...)")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--text", help="text to speak")
    group.add_argument("--text-file", help="file containing the text to speak")
    ap.add_argument("--out", default="cloned.wav", help="output wav (default: cloned.wav)")
    ap.add_argument("--lang", default="en",
                    help="language of the text: en, es, fr, de, it, pt, pl, tr, ru, "
                         "nl, cs, ar, zh-cn, hu, ko, ja, hi (default: en)")
    ap.add_argument("--speed", type=float, default=1.0,
                    help="delivery speed, 0.8 to 1.2 stays natural (default: 1.0)")
    args = ap.parse_args()

    text = read_text(args)

    import warnings
    warnings.filterwarnings("ignore")
    import torch
    from TTS.api import TTS

    workdir = tempfile.mkdtemp(prefix="clone-")
    try:
        reference = prepare_reference(args.ref, workdir)

        print("loading XTTS-v2 (first run takes a moment)...")
        started = time.time()
        # Coqui ships its configs as pickled objects, so the checkpoint has to be
        # loaded with weights_only=False. Only do this for weights you trust.
        original_load = torch.load
        torch.load = lambda *a, **kw: original_load(*a, **{**kw, "weights_only": False})
        try:
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)
        finally:
            torch.load = original_load
        print("model ready in %.1fs" % (time.time() - started))

        words = len(text.split())
        print("speaking %d words in %s..." % (words, args.lang))
        started = time.time()
        tts.tts_to_file(
            text=text,
            speaker_wav=reference,
            language=args.lang,
            speed=args.speed,
            file_path=args.out,
            split_sentences=True,
        )
        elapsed = time.time() - started

        with wave.open(args.out) as w:
            duration = w.getnframes() / float(w.getframerate())
        print("wrote %s — %.1fs of audio in %.1fs (%.1fx real time)"
              % (args.out, duration, elapsed, elapsed / max(duration, 0.01)))
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    main()
