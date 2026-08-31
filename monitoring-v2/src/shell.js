/* ══════════════════════════════════════════════════════════════════════
   Shell wiring — the profile menu and the theme preference.
   ──────────────────────────────────────────────────────────────────────
   Lifted from the product's shared shell, with the cross-module page
   table removed: these pages are a standalone module, so there is
   nowhere outside Monitoring to navigate to and no PAGES map to hold.
   What is left is what still belongs to the product rather than to this
   screen — the account menu and the light/dark/system choice.

   Two theme keys, not one: 'cq-theme' stays the resolved light|dark that
   the page's own boot code reads, and the preference beside it may also
   be 'system', which neither of those two values can express.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  var root = document.documentElement;
  var K_MODE = 'cq-theme', K_PREF = 'cq-theme-pref';
  var syncedMode = null, pref = 'dark';
  var media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function resolve(p) {
    if (p === 'light' || p === 'dark') return p;
    return media && media.matches ? 'dark' : 'light';
  }

  function paintMode(mode) {
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
  }

  /* The header toggle is a direct light/dark choice, so when it fires it
     lands as an explicit preference and stops following the system. */
  new MutationObserver(function () {
    var mode = root.dataset.mode === 'light' ? 'light' : 'dark';
    if (mode === syncedMode) return;
    syncedMode = mode;
    write(K_MODE, mode);
    if (pref === 'system') { pref = mode; write(K_PREF, mode); syncSeg(); }
  }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });

  if (media && media.addEventListener) {
    media.addEventListener('change', function () {
      if (pref === 'system') paintMode(resolve('system'));
    });
  }

  var avatar = document.querySelector('.hdr-avatar');
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

    var SUN = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.1" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.6v1.5M8 12.9v1.5M14.4 8h-1.5M3.1 8H1.6M12.53 3.47l-1.06 1.06M4.53 11.47l-1.06 1.06M12.53 12.53l-1.06-1.06M4.53 4.53 3.47 3.47" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    var MOON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    var SYS = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.9" y="2.9" width="12.2" height="8.2" rx="1.3" stroke="currentColor" stroke-width="1.4"/><path d="M5.8 13.9h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    var menu = document.createElement('div');
    menu.className = 'cq-pm';
    menu.setAttribute('role', 'menu');
    menu.innerHTML =
      '<button type="button" class="cq-pm-id" data-act="profile" aria-label="Your profile">' +
        '<img src="' + avatar.getAttribute('src') + '" alt="" />' +
        '<span class="who"><span class="nm">Savio Govindu</span>' +
        '<span class="em">savio.govindu@fractal.ai</span></span></button>' +
      '<div class="cq-pm-rule"></div>' +
      '<div class="cq-pm-sec"><h4>Theme</h4></div>' +
      '<div class="cq-pm-seg" role="group" aria-label="Theme">' +
        '<button type="button" data-pref="light" aria-pressed="false">' + SUN + 'Light</button>' +
        '<button type="button" data-pref="dark" aria-pressed="false">' + MOON + 'Dark</button>' +
        '<button type="button" data-pref="system" aria-pressed="false">' + SYS + 'System</button>' +
      '</div>' +
      '<div class="cq-pm-rule"></div>' +
      '<button type="button" class="cq-pm-row cq-pm-last is-danger" data-act="signout">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6.2 13.3H3.6a1 1 0 0 1-1-1V3.7a1 1 0 0 1 1-1h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10.4 10.6 13 8l-2.6-2.6M13 8H6.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
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
      if (e.target.closest('[data-act]')) setOpen(false);
    });
  }

  var p = read(K_PREF);
  setPref(p === 'light' || p === 'dark' || p === 'system' ? p : (read(K_MODE) === 'light' ? 'light' : 'dark'), true);
})();
