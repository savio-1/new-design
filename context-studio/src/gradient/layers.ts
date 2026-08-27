// The five mesh layers, lifted verbatim from Figma node 991:104969 (§4 of the
// storyboard). All values in panel units (540 × 804).
export type MeshLayer = {
  w: number;
  h: number;
  x: number;
  y: number;
  rot: number;
  skewX: number;
  blurPx: number;
  innerW: number;
  innerH: number;
  opacity: number;
  blend: 'normal' | 'overlay' | 'plus-lighter' | 'soft-light';
  gradient: string;
  // drift amplitudes (panel units / degrees / scale fraction) + period (s) + phase
  drift: {rot: number; tx: number; ty: number; scale: number; period: number; phase: number};
};

const WARM = (deg: number) =>
  `linear-gradient(${deg}deg, #FFFFFF 18.45%, #5860ED 28.81%, #F24822 69.94%, #FFCA28 87.27%)`;

export const MESH_LAYERS: MeshLayer[] = [
  {
    w: 785.6,
    h: 956.8,
    x: -124.1,
    y: -85.7,
    rot: -2.29,
    skewX: 0,
    blurPx: 24,
    innerW: 749.2,
    innerH: 927.6,
    opacity: 0.2,
    blend: 'normal',
    gradient: WARM(96.81),
    drift: {rot: 2.5, tx: 14, ty: 10, scale: 0.02, period: 12, phase: 0},
  },
  {
    w: 1297.7,
    h: 1289.3,
    x: -374.8,
    y: -262.5,
    rot: -36.2,
    skewX: 0,
    blurPx: 32,
    innerW: 944.9,
    innerH: 906.2,
    opacity: 0.3,
    blend: 'normal',
    gradient: `linear-gradient(100.60deg, #0D99FF 16.30%, #5860ED 35.14%, #F24822 67.97%, #FFCA28 85.36%)`,
    drift: {rot: 4, tx: 22, ty: 16, scale: 0.03, period: 12, phase: Math.PI / 3},
  },
  {
    w: 624.5,
    h: 900.6,
    x: -145.0,
    y: -41.4,
    rot: -6.37,
    skewX: 1.63,
    blurPx: 26,
    innerW: 509.1,
    innerH: 852.4,
    opacity: 0.4,
    blend: 'overlay',
    gradient: WARM(95.05),
    drift: {rot: 3, tx: 12, ty: 20, scale: 0.02, period: 6, phase: 0},
  },
  {
    w: 1849.9,
    h: 1923.6,
    x: -659.0,
    y: -617.0,
    rot: -33.68,
    skewX: 1.63,
    blurPx: 48,
    innerW: 1109.6,
    innerH: 1603.1,
    opacity: 0.5,
    blend: 'plus-lighter',
    gradient: WARM(95.84),
    drift: {rot: 5, tx: 30, ty: 24, scale: 0.04, period: 12, phase: (2 * Math.PI) / 3},
  },
  {
    w: 1277.8,
    h: 1160.5,
    x: -405.9,
    y: -49.6,
    rot: 10.42,
    skewX: 1.63,
    blurPx: 20,
    innerW: 1149.3,
    innerH: 963.9,
    opacity: 0.99,
    blend: 'soft-light',
    gradient: WARM(100.0),
    drift: {rot: 6, tx: 26, ty: 18, scale: 0.05, period: 6, phase: Math.PI},
  },
];
