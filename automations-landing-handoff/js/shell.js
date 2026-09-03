/* Generated from automations-landing.html — product chrome shared with the
   other module screens: platform-rail navigation, the light/dark choice and
   its cross-page sync, and the profile menu. Not specific to this screen. */
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
    'monitor': 'monitoring.html',
    'monitoring': 'monitoring.html'
  };
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
  if (brand && !/index\.html$|\/cogentiq\/?$/.test(location.pathname)) {
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
        '<button type="button" data-pref="light" aria-pressed="false">' + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.1" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.6v1.5M8 12.9v1.5M14.4 8h-1.5M3.1 8H1.6M12.53 3.47l-1.06 1.06M4.53 11.47l-1.06 1.06M12.53 12.53l-1.06-1.06M4.53 4.53 3.47 3.47" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' + 'Light</button>' +
        '<button type="button" data-pref="dark" aria-pressed="false">' + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>' + 'Dark</button>' +
        '<button type="button" data-pref="system" aria-pressed="false">' + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.9" y="2.9" width="12.2" height="8.2" rx="1.3" stroke="currentColor" stroke-width="1.4"/><path d="M5.8 13.9h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' + 'System</button>' +
      '</div>' +
      '<div class="cq-pm-rule"></div>' +
      '<a class="cq-pm-cta" href="#" data-act="assistant" target="_blank" rel="noopener noreferrer">' +
        'Assistant platform' + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.5 3.5h-3v9h9v-3M9.5 3.5h3v3M12.5 3.5 7.5 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' + '</a>' +
      '<button type="button" class="cq-pm-row cq-pm-last is-danger" data-act="signout">' + '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.2 13.3H3.6a1 1 0 0 1-1-1V3.7a1 1 0 0 1 1-1h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.4 10.6 13 8l-2.6-2.6M13 8H6.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span class="lbl">Sign out</span></button>';
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
    menu.addEventListener('click', function (e) {
      var row = e.target.closest('[data-act]');
      if (!row) return;
      if (row.dataset.act === 'assistant') e.preventDefault();
      setOpen(false);
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
