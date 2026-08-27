# Context Studio — 12s launch animation

Built to `contextstudiostoryboard.md`: 720 frames @60fps, seven beats,
hard cuts with one blank frame at every boundary, statements that appear
rather than animate, badge pops with speed-dashes, a ticking counter,
and a dark close.

## Render

```
npm install
npx remotion render src/index.ts MainSquare out/context-studio-1x1.mp4  --codec=h264 --crf=16
npx remotion render src/index.ts MainWide   out/context-studio-16x9.mp4 --codec=h264 --crf=16
```

In an environment whose Chromium rejects old headless (this container's
Playwright build does), add:

```
--chrome-mode=chrome-for-testing --browser-executable=/opt/pw-browsers/chromium
```

`npx remotion studio` opens the editor for scrubbing.

## Where things live

- `src/tokens.ts` — the single re-skin point. Colours are the Cogentiq
  design system's own (light theme for the statement field, dark ground
  for the close, palette ramps for the seven accents).
- `src/motion.ts` — the primitives: pop, dash trail, snap-attach,
  ring pulse, converge bezier, seeded jitter.
- `src/components/BlockTile.tsx` — `tileRect()` is read by beats 4 *and*
  5, which is what keeps the 4→5 cut continuous.
- `public/fonts/` — Geist (variable), served locally so renders never
  need the network.

## Decisions taken from the spec's open items

1. Colours: Cogentiq tokens rather than the placeholder palette.
2. Font: Geist (the Cogentiq face), bundled.
3. 1:1 leads; 16:9 renders from the same scenes on one boolean.
4. Beat 2 copy: "Bye bye, guesswork." (first option). Beat 7 as written.
5. Silent.
6. The logo lockup is a placeholder diamond + wordmark until the brand
   SVG lands.
