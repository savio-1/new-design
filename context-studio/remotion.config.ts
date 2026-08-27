import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// The remote container ships Chromium via Playwright; Remotion must not try to
// download its own headless shell (network is proxied).
Config.setBrowserExecutable(
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
);
Config.setChromiumOpenGlRenderer('angle-egl');
