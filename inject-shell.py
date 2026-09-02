#!/usr/bin/env python3
"""Inject the product-wide chrome into all five pages.

What lives here is what spans pages and therefore belongs to none of
them: rail routing, the light/dark choice, and the profile menu with the
dashboard background picker. One definition, five pages, so the chrome
cannot drift page to page the way the panel did.
"""
import pathlib, re

HERE = pathlib.Path(__file__).parent
PAGES = pathlib.Path('/home/user/new-design/cogentiq')

CSS = '''
/* ── Profile menu ────────────────────────────────────────────────
   Built on the page's own popover tokens rather than colours of its
   own, so it themes itself with everything else and matches the tag
   and date popovers already in the product. */
.cq-pm-wrap { position: relative; display: inline-flex; }
.cq-pm-trigger {
  display: inline-flex; padding: 0; border: 0; background: none;
  border-radius: 999px; cursor: pointer; line-height: 0;
  box-shadow: 0 0 0 0 var(--text-coloured-blue);
  transition: box-shadow .16s ease;
}
.cq-pm-trigger[aria-expanded="true"] { box-shadow: 0 0 0 2px var(--text-coloured-blue); }
.cq-pm-trigger:focus-visible { outline: 2px solid var(--text-coloured-blue); outline-offset: 2px; }

.cq-pm {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 400;
  width: 212px; max-width: calc(100vw - 32px);
  display: none; flex-direction: column;
  padding: 6px 0 8px;
  background: var(--backgrounds-card-bg-3);
  border: 1px solid var(--strokes-card-default, var(--strokes-line-1));
  border-radius: 12px;
  box-shadow: var(--shadow-pop);
  color: var(--text-secondary);
  font: 400 13px/1.45 var(--font-geist, Geist, system-ui, sans-serif);
  transform: translateY(-4px); opacity: 0;
  transition: opacity .13s ease, transform .13s ease;
}
.cq-pm.is-open { display: flex; }
.cq-pm.is-shown { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) { .cq-pm { transition: none; } }

/* The name and address are the way to Profile, so the block is the
   control rather than sitting above a row that repeats it. */
.cq-pm-id {
  width: calc(100% - 16px); margin: 0 8px; padding: 8px 6px;
  display: flex; align-items: center; gap: 10px;
  border: 0; border-radius: 8px; background: none;
  font: inherit; text-align: left; cursor: pointer;
}
.cq-pm-id:hover { background: color-mix(in srgb, var(--text-primary) 7%, transparent); }
.cq-pm-id:hover .nm { color: var(--text-primary); }
.cq-pm-id:focus-visible { outline: 2px solid var(--text-coloured-blue); outline-offset: -2px; }
.cq-pm-id img { width: 34px; height: 34px; border-radius: 999px; flex: none; }
.cq-pm-id .who { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cq-pm-id .nm { color: var(--text-primary); font-weight: 500; font-size: 13.5px; }
.cq-pm-id .em {
  color: var(--text-teritiary, var(--text-secondary)); font-size: 11.5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* 12px of air above and below each rule. The blocks either side carry no
   padding of their own into that gap, so the measure is the gap. */
.cq-pm-rule { height: 1px; margin: 12px 8px; background: var(--strokes-line-1); }
.cq-pm-sec { padding: 0 14px; }
.cq-pm-sec h4 {
  margin: 0 0 7px; font-size: 10.5px; font-weight: 500; letter-spacing: .09em;
  text-transform: uppercase; color: var(--text-teritiary, var(--text-secondary));
}

.cq-pm-row {
  width: calc(100% - 16px); margin: 0 8px; height: 36px;
  display: flex; align-items: center; gap: 9px;
  padding: 0 8px; border: 0; border-radius: 8px;
  background: none; color: var(--text-secondary);
  font: inherit; text-align: left; cursor: pointer; text-decoration: none;
}
.cq-pm-row:hover { background: color-mix(in srgb, var(--text-primary) 7%, transparent); color: var(--text-primary); }
.cq-pm-row:focus-visible { outline: 2px solid var(--text-coloured-blue); outline-offset: -2px; }
.cq-pm-row .lbl { flex: 1 1 auto; min-width: 0; }
.cq-pm-row svg { flex: none; }
.cq-pm-row.is-danger:hover { color: var(--text-coloured-red, #f24822); }

/* What the forum is for, said once at the end of the row rather than on
   a second line: the menu's rows are one line tall and a lone two-line
   row breaks the rhythm of the rest. */
.cq-pm-note {
  flex: none; font-size: 11.5px;
  color: var(--text-teritiary, var(--text-secondary));
}
.cq-pm-row:hover .cq-pm-note { color: var(--text-secondary); }

/* Assistant platform leaves the product, so it is the one thing in here
   that is a button rather than a row: tonal-1, the weight the product
   gives an action that is offered rather than routine. It sits last,
   past a divider, because it is the one item that goes somewhere else
   entirely rather than acting on this account.
   Hover is mixed from the two tonal tokens rather than taking the
   hover token, which three of the five pages do not define. */
.cq-pm-cta {
  height: 36px; margin: 0 14px;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  border: 0; border-radius: 8px;
  background: var(--backgrounds-button-tonal-1);
  color: var(--text-button-tonal-1);
  font: 500 13px/1 var(--font-geist, Geist, system-ui, sans-serif);
  text-decoration: none; cursor: pointer;
  transition: background .14s ease;
}
.cq-pm-cta:hover {
  background: color-mix(in srgb, var(--backgrounds-button-tonal-1) 84%, var(--text-button-tonal-1));
}
.cq-pm-cta:focus-visible { outline: 2px solid var(--text-coloured-blue); outline-offset: 2px; }
.cq-pm-cta svg { flex: none; }

/* Theme: three exclusive choices, so a segmented control rather than
   three rows — the options are short and comparing them is the point. */
/* The track has to read as a recess in both themes. page-bg-2 is #ffffff
   in light -- the same as the menu's own surface -- so the track vanished
   there; page-bg-3 is the one that stays a step off the card either way,
   and the hairline keeps its edge where the two are closest. */
.cq-pm-seg { display: flex; gap: 3px; margin: 0 14px; padding: 3px;
  background: var(--backgrounds-page-bg-3);
  border: 1px solid var(--strokes-line-1);
  border-radius: 9px; }
.cq-pm-seg button {
  flex: 1 1 0; height: 30px; border: 0; border-radius: 7px;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  background: none; color: var(--text-secondary);
  font: 500 12px/1 var(--font-geist, Geist, system-ui, sans-serif);
  cursor: pointer; transition: background .14s ease, color .14s ease;
}
.cq-pm-seg button svg { flex: none; width: 15px; height: 15px; }
.cq-pm-seg button:hover { color: var(--text-primary); }
.cq-pm-seg button[aria-pressed="true"] {
  background: var(--backgrounds-card-bg-3); color: var(--text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .18), 0 0 0 1px var(--strokes-line-1);
}
.cq-pm-seg button:focus-visible { outline: 2px solid var(--text-coloured-blue); outline-offset: 1px; }

'''

ICON = {
 'sun': '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.1" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.6v1.5M8 12.9v1.5M14.4 8h-1.5M3.1 8H1.6M12.53 3.47l-1.06 1.06M4.53 11.47l-1.06 1.06M12.53 12.53l-1.06-1.06M4.53 4.53 3.47 3.47" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 'moon': '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
 'system': '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.9" y="2.9" width="12.2" height="8.2" rx="1.3" stroke="currentColor" stroke-width="1.4"/><path d="M5.8 13.9h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 'forum': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9.9 9.2H4.7l-2 1.7V3.4a.9.9 0 0 1 .9-.9h6.3a.9.9 0 0 1 .9.9v4.9a.9.9 0 0 1-.9.9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12.2 5.6h.3a.9.9 0 0 1 .9.9v6.9l-2-1.7H6.6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
 'key': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5.6" cy="10.4" r="3.1" stroke="currentColor" stroke-width="1.4"/><path d="M7.9 8.1 13.4 2.6M11.2 4.8l1.7 1.7M9.6 6.4l1.7 1.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'ext': '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 3.5h-3v9h9v-3M9.5 3.5h3v3M12.5 3.5 7.5 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'out': '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.2 13.3H3.6a1 1 0 0 1-1-1V3.7a1 1 0 0 1 1-1h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.4 10.6 13 8l-2.6-2.6M13 8H6.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

SNIPPET = '''
<style>__CSS__</style>
<script>
/* ── Combined product · shared shell wiring ──────────────────────
   The platform rail, the light/dark choice and the profile menu belong
   to the product rather than to any one page, so all three are wired
   here: one definition, every page. */
(function () {
  var PAGES = {
    'home': 'index.html',
    'automations': 'automations.html',
    'skills': 'skills.html',
    'skill': 'skills.html',
    'integrations': 'integrations.html',
    'model hub': 'model-hub.html',
    'doc store': 'doc-store.html',
    'context': 'context.html',
    'context studio': 'context.html',
    'monitor': 'monitoring.html',
    'monitoring': 'monitoring.html'
  };
  var HERE = (location.pathname.split('/').pop() || 'index.html');
  var root = document.documentElement;
  var inShell = window.parent !== window;
  var $ = function (id) { return document.getElementById(id); };

  function go(url) {
    if (inShell) parent.postMessage({ cqNav: url }, '*');
    else window.location.href = url;
  }

  document.querySelectorAll('[aria-label="Platform"] button[title]').forEach(function (btn) {
    var url = PAGES[(btn.getAttribute('title') || '').trim().toLowerCase()];
    if (!url || btn.classList.contains('is-active')) return;
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function () { go(url); });
  });
  var brand = document.querySelector('.rail-brand, .cq-rail-brand');
  if (brand && !/index\\.html$|\\/cogentiq\\/?$/.test(location.pathname)) {
    brand.style.cursor = 'pointer';
    brand.addEventListener('click', function () { go('index.html'); });
  }

  /* ── State that spans pages ────────────────────────────────────
     Standalone it rides in localStorage; inside the shell the shell
     holds it, because srcdoc frames each get their own opaque store.
     Two theme keys, not one: 'cq-theme' stays the resolved light/dark
     the pages' own code already reads at boot, and the preference —
     which may be 'system' — sits beside it. */
  var K_MODE = 'cq-theme', K_PREF = 'cq-theme-pref';
  var syncedMode = null, pref = 'dark';
  var media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function resolve(p) {
    if (p === 'light' || p === 'dark') return p;
    return media && media.matches ? 'dark' : 'light';
  }

  function paintMode(mode) {
    /* Claim the value before writing it: MutationObserver delivers on a
       microtask, so a flag set around the write would already be back to
       false by the time the callback ran, and the frame would echo the
       shell's own broadcast straight back at it. */
    syncedMode = mode;
    if (root.dataset.mode !== mode) {
      if (typeof window.applyMode === 'function') window.applyMode(mode);
      else root.dataset.mode = mode;
    }
  }

  function setPref(p, quiet) {
    pref = p;
    write(K_PREF, p);
    var mode = resolve(p);
    write(K_MODE, mode);
    paintMode(mode);
    syncSeg();
    if (!quiet && inShell) parent.postMessage({ cqThemePref: p, cqTheme: mode }, '*');
  }

  /* The page's own toggle still works and still means something: it is a
     direct light/dark choice, so it lands as an explicit preference. */
  new MutationObserver(function () {
    var mode = root.dataset.mode === 'light' ? 'light' : 'dark';
    if (mode === syncedMode) return;
    syncedMode = mode;
    write(K_MODE, mode);
    if (pref === 'system') { pref = mode; write(K_PREF, mode); syncSeg(); }
    if (inShell) parent.postMessage({ cqTheme: mode, cqThemePref: pref }, '*');
  }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

  if (media && media.addEventListener) {
    media.addEventListener('change', function () { if (pref === 'system') paintMode(resolve('system')); });
  }

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.cqThemePref) { pref = d.cqThemePref; syncSeg(); }
    if (d.cqTheme === 'light' || d.cqTheme === 'dark') paintMode(d.cqTheme);
  });

  /* ── The menu ──────────────────────────────────────────────────
     Attached to the header avatar that is already on every page, so the
     five headers keep their own markup and gain the same menu. */
  var avatar = document.querySelector('.header-avatar, .hdr-avatar');
  var seg = null;

  function syncSeg() {
    if (!seg) return;
    seg.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.pref === pref));
    });
  }

  if (avatar) {
    var wrap = document.createElement('div');
    wrap.className = 'cq-pm-wrap';
    avatar.parentNode.insertBefore(wrap, avatar);

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cq-pm-trigger';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Your account');
    wrap.appendChild(trigger);
    trigger.appendChild(avatar);

    var menu = document.createElement('div');
    menu.className = 'cq-pm';
    menu.setAttribute('role', 'menu');
    menu.innerHTML =
      '<button type="button" class="cq-pm-id" data-act="profile" ' +
        'aria-label="Your profile">' +
        '<img src="' + avatar.getAttribute('src') + '" alt="" />' +
        '<span class="who"><span class="nm">Savio Govindu</span>' +
        '<span class="em">savio.govindu@fractal.ai</span></span>' +
      '</button>' +
      '<div class="cq-pm-rule"></div>' +
      '<div class="cq-pm-sec"><h4>Theme</h4></div>' +
      '<div class="cq-pm-seg" role="group" aria-label="Theme">' +
        '<button type="button" data-pref="light" aria-pressed="false" title="Light" aria-label="Light">' + __IC_SUN__ + '</button>' +
        '<button type="button" data-pref="dark" aria-pressed="false" title="Dark" aria-label="Dark">' + __IC_MOON__ + '</button>' +
        '<button type="button" data-pref="system" aria-pressed="false" title="System" aria-label="System">' + __IC_SYS__ + '</button>' +
      '</div>' +
      '<div class="cq-pm-rule"></div>' +
      '<button type="button" class="cq-pm-row" data-act="forum">' + __IC_FORUM__ +
        '<span class="lbl">Forum</span></button>' +
      '<button type="button" class="cq-pm-row" data-act="tokens">' + __IC_KEY__ +
        '<span class="lbl">Access tokens</span></button>' +
      '<button type="button" class="cq-pm-row is-danger" data-act="signout">' + __IC_OUT__ +
        '<span class="lbl">Sign out</span></button>' +
      '<div class="cq-pm-rule"></div>' +
      '<a class="cq-pm-cta" href="#" data-act="assistant" ' +
        'target="_blank" rel="noopener noreferrer">' +
        'Assistant platform' + __IC_EXT__ + '</a>';
    wrap.appendChild(menu);

    seg = menu.querySelector('.cq-pm-seg');

    var open = false;
    function setOpen(on) {
      open = on;
      trigger.setAttribute('aria-expanded', String(on));
      if (on) {
        menu.classList.add('is-open');
        requestAnimationFrame(function () { menu.classList.add('is-shown'); });
      } else {
        menu.classList.remove('is-shown');
        setTimeout(function () { if (!open) menu.classList.remove('is-open'); }, 130);
      }
    }
    trigger.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!open); });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { if (open) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); trigger.focus(); }
    });

    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-pref]');
      if (b) setPref(b.dataset.pref);
    });
    var DEST = { profile: 'profile.html', tokens: 'pat-tokens.html' };
    menu.addEventListener('click', function (e) {
      var row = e.target.closest('[data-act]');
      if (!row) return;
      if (row.dataset.act === 'assistant') e.preventDefault();
      setOpen(false);
      var to = DEST[row.dataset.act];
      if (to && to !== HERE && !(inShell && document.title.indexOf(to === 'profile.html' ? 'Profile' : 'access tokens') > -1)) go(to);
    });
  }

  /* ── Boot ──────────────────────────────────────────────────────
     Inside the shell the stored answer comes back over the wire, so ask
     and paint on the reply rather than reading a store this frame does
     not share. */
  if (inShell) {
    parent.postMessage({ cqThemeRequest: true }, '*');
    syncSeg();
  } else {
    var p = read(K_PREF);
    setPref(p === 'light' || p === 'dark' || p === 'system' ? p : (read(K_MODE) === 'light' ? 'light' : 'dark'), true);
  }
})();
</script>
'''

def build():
    s = SNIPPET
    s = s.replace('__CSS__', CSS)
    for key, tok in (('sun', '__IC_SUN__'), ('moon', '__IC_MOON__'), ('system', '__IC_SYS__')):
        s = s.replace(tok, "'" + ICON[key] + "'")
    s = s.replace('__IC_FORUM__', "'" + ICON['forum'] + "'")
    s = s.replace('__IC_KEY__', "'" + ICON['key'] + "'")
    s = s.replace('__IC_EXT__', "'" + ICON['ext'] + "'")
    s = s.replace('__IC_OUT__', "'" + ICON['out'] + "'")
    return s

MARK = '/* ── Combined product · shared shell wiring'
snippet = build()
for name in sorted(q.name for q in PAGES.glob('*.html')):
    f = PAGES / name
    s = f.read_text()
    i = s.find(MARK)
    if i < 0:                       # a page that has never had the chrome
        m = re.search(r'\s*</body>\s*(?:</html>)?\s*$', s)
        s = (s[:m.start()] if m else s.rstrip()) + '\n' + snippet + '\n</body>\n</html>\n'
        f.write_text(s)
        print(f'{name:20} {len(s):,} bytes (first injection)')
        continue
    start = s.rfind('<script>', 0, i)
    # a <style> may sit immediately above from a previous run
    pre = s[:start].rstrip()
    if pre.endswith('</style>'):
        start = s.rfind('<style>', 0, pre.rfind('</style>'))
    end = s.index('</script>', i) + len('</script>')
    s = s[:start] + s[end:]
    assert MARK not in s, name
    # Some pages arrive without their closing </html> -- the artifact
    # viewer's wrapper swallows it -- so the tail is matched loosely and
    # written back complete either way.
    m = re.search(r'\s*</body>\s*(?:</html>)?\s*$', s)
    s = (s[:m.start()] if m else s.rstrip()) + '\n' + snippet + '\n</body>\n</html>\n'
    f.write_text(s)
    print(f'{name:20} {len(s):,} bytes')
