import {continueRender, delayRender, staticFile} from 'remotion';

// Geist isn't in this version of @remotion/google-fonts, so the woff2 files
// from the `geist` npm package are served from public/fonts and the render
// waits on them via delayRender.
const load = (file: string, weight: string) => {
  const face = new FontFace('Geist', `url('${staticFile(`fonts/${file}`)}') format('woff2')`, {
    weight,
    style: 'normal',
  });
  return face.load().then((f) => {
    (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
  });
};

if (typeof document !== 'undefined') {
  const handle = delayRender('Loading Geist');
  Promise.all([load('Geist-Medium.woff2', '500'), load('Geist-Regular.woff2', '400')])
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error('Geist failed to load', err);
      continueRender(handle);
    });
}
