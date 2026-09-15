# Voice cloning

`clone_voice.py` reads text in a cloned voice, using
[Coqui XTTS-v2](https://huggingface.co/coqui/XTTS-v2). Cloning is zero-shot —
there is no training run. The model conditions on a short reference recording
and speaks in that voice immediately.

Everything runs locally. No API key, no account, and no audio leaves the machine.

## Setup

Needs Python 3.10–3.12 and `ffmpeg` on PATH.

```sh
python3 -m venv tts-env
tts-env/bin/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
tts-env/bin/pip install "coqui-tts" "transformers<5"
tts-env/bin/pip install torchcodec --index-url https://download.pytorch.org/whl/cpu
```

Two pins matter and are easy to get wrong:

- **`transformers<5`** — v5 dropped `isin_mps_friendly`, which XTTS still imports.
- **torch and torchcodec from the CPU index** — the default PyPI wheels are
  CUDA-linked and fail on a machine with no GPU, with a misleading
  `Could not load this library` error that is really a missing `libnvrtc`.

The first run downloads ~1.8 GB of weights to `~/.local/share/tts/`.

## Use

```sh
tts-env/bin/python clone_voice.py --ref me.m4a --text "Hello, this is my voice."
tts-env/bin/python clone_voice.py --ref me.wav --text-file script.txt --out narration.wav
```

`--ref` takes any format ffmpeg can read. The script converts it to mono
22.05 kHz, filters rumble below 60 Hz, trims leading and trailing silence, and
normalises loudness to −18 LUFS before handing it to the model.

Other flags: `--lang` (17 languages, `en` by default), `--speed` (0.8–1.2 stays
natural), `--out`.

## Getting a good clone

The reference is the whole ballgame — the model copies what it hears, including
the room.

- **15–60 seconds.** Under 15s sounds thin. Past ~90s adds nothing zero-shot.
- **One continuous take**, no edits, fades, noise reduction, or compression.
- **Quiet room**, consistent mic distance, slightly off-axis to avoid plosives.
- **Natural delivery.** A careful, slowed-down read produces a careful,
  slowed-down clone.
- Check for clipping: peaks should sit near −3 dB, not at 0.

## Speed

Roughly 2.7× real time on 4 CPU cores — 17 seconds of audio takes about
46 seconds, plus ~40 seconds to load the model. A CUDA GPU brings this well
under real time. For long scripts, load the model once and loop rather than
invoking the script per line.

## Limits

Zero-shot cloning gets timbre and accent right and is recognisably the speaker,
but it flattens individual prosody and mispronounces unusual names. Closing that
gap means fine-tuning on 30+ minutes of audio, or a hosted professional clone.

## Licence

The XTTS-v2 weights are covered by the
[Coqui Public Model License](https://coqui.ai/cpml), which permits
**non-commercial use only**. The licence follows the weights, not this script —
check it before using the output in anything shipped.

Only clone a voice you own or have documented permission to use.
