// Both grain layers are mandatory (§3): in-sphere speckle at 8% is what
// separates the reference look from a flat CSS gradient. feTurbulence with a
// fixed seed is deterministic in headless Chromium, so no PNG asset needed.
const noiseSvg = (seed: number, freq: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="128" height="128" filter="url(%23n)"/></svg>`;

export const NOISE_URL = `url('data:image/svg+xml;utf8,${noiseSvg(7, 0.9)}')`;
export const NOISE_URL_FINE = `url('data:image/svg+xml;utf8,${noiseSvg(3, 1.4)}')`;

// Seeded 2-frame reseed offsets for the global layer.
export const grainOffset = (f: number): [number, number] => {
  const step = Math.floor(f / 2);
  const a = Math.sin(step * 127.1 + 311.7) * 43758.5453;
  const b = Math.sin(step * 269.5 + 183.3) * 28001.8384;
  return [Math.floor((a - Math.floor(a)) * 128), Math.floor((b - Math.floor(b)) * 128)];
};
