/* Geist — the Cogentiq brand face, served from public/ rather than a
   CDN so renders never depend on the network. One variable file
   registered per weight the piece uses. */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const FONT = 'Geist';

export const fontsReady = Promise.all(
  (['400', '500', '600', '700'] as const).map((weight) =>
    loadFont({ family: FONT, url: staticFile('fonts/geist-latin.woff2'), weight }),
  ),
);
