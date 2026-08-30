# Coastal Kodachrome — film look LUT

A creative look LUT built to match a set of reference frames: sun-bleached
Mediterranean coastline, turquoise rock pools, tanned skin, pale cream skies.

| File | Use |
| --- | --- |
| `CoastalKodachrome.cube` | The look at full strength. This is the one you want. |
| `CoastalKodachrome_Soft.cube` | The same look at 65%, for footage that is already close. |
| `preview.html` | Drop a frame in and see the LUT applied, with a before/after wipe. |
| `generate_lut.py` | The generator. Every parameter of the look lives here. |
| `verify.py` / `qc.py` | Accuracy and quality checks (see below). |

**Format:** 33×33×33 Iridas `.cube`, Rec.709 / sRGB in → Rec.709 / sRGB out.
Apply it to footage that is already in Rec.709, *after* any camera-to-Rec.709
conversion — not directly onto log or raw.

## What the look does

Measured off the reference frames and reproduced by the pipeline:

- **Matte floor.** Nothing reaches black. Pure black lands at `14, 17, 17`,
  with a faint green-cyan bias — the print-like lifted shadow.
- **Rolled ceiling.** Nothing clips. Pure white lands at `240, 237, 232`,
  cream rather than blue-white.
- **Low contrast** with a wide, flat midtone shelf.
- **Highlights desaturate toward cream** as they climb, because blue rolls
  off its shoulder first and red holds longest. This is what keeps the skies
  pale instead of blue.
- **Foliage reads olive**, rotated toward yellow rather than emerald.
- **Shallow water reads turquoise** — cyan pulled toward green and boosted.
- **Deep ocean reads soft navy-teal**, desaturated.
- **Skin holds a warm tan**; reds stay deep and muted rather than vivid.

The pipeline mirrors how film actually behaves rather than stacking arbitrary
adjustment layers: decode to scene linear → exposure and white balance →
dye-layer channel crosstalk → per-channel highlight shoulder → re-encode →
hue-selective grade → midtone contrast → per-channel floor/ceiling remap →
highlight chroma rolloff → global saturation.

## Using it

**DaVinci Resolve** — put the `.cube` in
`~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/LUT/`
(macOS) or `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\LUT\`
(Windows), right-click the LUT list → *Refresh*, then drag it onto a node.
Dial it back with the node's **Key → Output Gain**.

**Premiere Pro** — *Lumetri Color → Creative → Look → Browse*. The
**Intensity** slider dials it back.

**Final Cut Pro** — add the *Custom LUT* effect, *Load Custom LUT…*, and use
**Mix** to dial it back.

**After Effects** — *Effect → Utility → Apply Color LUT*.

Since every host can dial a LUT down, no variant above 100% is shipped:
extrapolating past the calibrated look amplifies hue-zone artifacts into
visible territory without making the look better.

## Retuning it

Edit the `PARAMS` block at the top of `generate_lut.py` and re-run:

```
python3 generate_lut.py     # rewrites the .cube files (no dependencies)
python3 build_preview.py    # re-bakes the LUT into preview.html
```

Then check your changes:

```
python3 verify.py                      # look accuracy vs the reference frames
python3 qc.py CoastalKodachrome.cube   # format, range, monotonicity, banding
```

`verify.py` runs a set of patches — skin, sandstone, turquoise, deep ocean,
foliage, sky, and a grey ramp — through the transform and prints the delta
against the values read off the reference frames. The current build is within
**11/255 worst-case**, and within 5/255 on skin, rock, neutrals and highlights.

`qc.py` checks the generated `.cube` itself: entry count, value range,
per-axis monotonicity, and the largest jump between neighbouring grid nodes
(the banding risk). Both shipped LUTs pass with no reversal above 8-bit
quantisation and no banding risk.

### A note on monotonicity

`qc.py` reports axis reversals by *magnitude*, not count. Hue rotation is not
monotonic in RGB by construction, so any hue-selective look LUT reverses
slightly where two hue zones meet. What matters is whether it is visible. The
full-strength LUT's largest reversal is 1.16/255 — below one 8-bit code value.
If you push the hue-zone parameters much harder, re-run `qc.py` and keep that
number under about 1.5/255.

## Preview page

`preview.html` is self-contained — open it straight from disk, no server. Drop
in one of the reference frames and drag across the image to move the wipe.
The LUT is baked in as an 8-bit volume for preview purposes only; the `.cube`
files carry full float precision. Rendering is verified to match the reference
pipeline to within 1/255.

## Emulsion Bench

`../film/emulsion-bench.html` is a live grading bench built on this same
pipeline. Rather than baking `.cube` files, it runs the whole film pipeline in
a fragment shader, so every stage is editable in place: exposure, brightness,
contrast, highlights/shadows/whites/blacks, fade, clarity, temperature, tint,
saturation, vibrance, split toning, grain, halation, diffusion, vignette and
five blur types. It ships 14 film stocks, Coastal Kodachrome among them.

The shader port is verified against `generate_lut.py` to within 1/255 — the two
are the same transform, so a look dialled in on the bench matches the `.cube`.
