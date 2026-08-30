#!/usr/bin/env python3
"""Bundle the five CogentIQ pages into the one published artifact.

Each page ships whole, base64'd into a srcdoc frame, so the product is a
single file. The shell owns what spans pages: which one is showing, the
crossfade between them, and the light/dark choice — srcdoc frames get
their own opaque storage, so the theme has to live out here.
"""
import base64, json, pathlib

SRC = pathlib.Path('/home/user/new-design/cogentiq')
PAGES = ['index.html', 'integrations.html', 'model-hub.html', 'skills.html', 'doc-store.html']

blobs = {}
for name in PAGES:
    s = (SRC / name).read_text()
    assert 'cqNav' in s, f'{name}: shell wiring missing'
    blobs[name] = base64.b64encode(s.encode('utf-8')).decode('ascii')

SHELL = '''<title>CogentIQ Platform</title>
<style>
  :root { color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; background: #121212; overflow: hidden; }
  body[data-mode="light"] { background: #f5f5f5; }

  .stage { position: fixed; inset: 0; }
  .stage iframe {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    border: 0; display: block;
    background: transparent;
    opacity: 0;
    transform: translate3d(0, 6px, 0);
    transition: opacity .13s ease-in, transform 0s linear .13s;
    pointer-events: none;
    will-change: opacity, transform;
  }
  /* Two dense screens dissolved through each other read as blur, not as
     motion — the rail and header are identical on every page, so the
     text would double-expose. So the outgoing page leaves first and the
     incoming one rises into place after it. The gap between them is one
     frame of the app's own ground, which is why the body carries the
     page background in both themes: there is nothing lighter behind. */
  .stage iframe.is-live {
    opacity: 1;
    transform: translate3d(0, 0, 0);
    transition: opacity .2s ease-out, transform .28s cubic-bezier(.22, .8, .3, 1);
    pointer-events: auto;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .stage iframe, .stage iframe.is-live { transition: none; transform: none; }
  }

</style>

<div class="stage" id="stage">
  <iframe id="a" title="CogentIQ"></iframe>
  <iframe id="b" title="CogentIQ"></iframe>
</div>

<script>
(function () {
  var PAGES = __PAGES__;
  var frames = [document.getElementById('a'), document.getElementById('b')];
  var live = 0;
  var current = null;
  var busy = false;
  var theme = 'dark';

  function decode(b64) {
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function tellTheme(frame) {
    try { frame.contentWindow.postMessage({ cqTheme: theme }, '*'); } catch (e) { /* not ready */ }
  }
  function setTheme(mode) {
    theme = mode;
    document.body.dataset.mode = mode;
    frames.forEach(tellTheme);
  }

  /* A frame that is still parsing paints white for a beat, and fading
     that in is the jitter. So the incoming page loads hidden, gets the
     current theme, and only then crosses over. */
  function show(name, instant) {
    if (!PAGES[name]) name = 'index.html';
    if (busy || name === current) return;
    busy = true;

    var incoming = frames[instant ? live : 1 - live];
    var outgoing = frames[live];

    var reveal = function () {
      tellTheme(incoming);
      /* Two frames of grace: one for the swapped-in document to lay out,
         one for the browser to paint it, so the page rises in already
         drawn rather than arriving mid-paint. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          incoming.classList.add('is-live');
          live = frames.indexOf(incoming);
          current = name;
          busy = false;
          try { history.replaceState(null, '', '#' + name.replace('.html', '')); } catch (e) {}
        });
      });
    };

    var settle = function () {
      incoming.removeEventListener('load', settle);
      if (instant) return reveal();
      outgoing.classList.remove('is-live');
      /* Wait out the outgoing fade rather than racing it. */
      setTimeout(reveal, 140);
    };

    incoming.addEventListener('load', settle);
    incoming.srcdoc = decode(PAGES[name]);
  }

  window.addEventListener('message', function (e) {
    var data = e.data || {};
    if (typeof data.cqNav === 'string') show(data.cqNav);
    if (data.cqTheme === 'light' || data.cqTheme === 'dark') setTheme(data.cqTheme);
    if (data.cqThemeRequest) frames.forEach(tellTheme);
  });

  var initial = 'index.html';
  try {
    var h = (location.hash || '').replace(/^#\\/?/, '');
    if (h && PAGES[h + '.html']) initial = h + '.html';
  } catch (e) {}
  setTheme(theme);
  show(initial, true);
})();
</script>
'''

out = SHELL.replace('__PAGES__', json.dumps(blobs))
pathlib.Path('cogentiq-platform.html').write_text(out)
print(f'cogentiq-platform.html · {len(out) / 1e6:.2f} MB · {len(PAGES)} pages')
