(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav: contract to a glass pill, mega menu on hover ---------- */
  (function () {
    var nav = document.getElementById('siteNav');
    if (!nav) return;
    var triggers = [].slice.call(nav.querySelectorAll('[data-menu]'));
    var megas = [].slice.call(nav.querySelectorAll('.mega'));
    var closeT;

    function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 12); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function open(name) {
      clearTimeout(closeT);
      megas.forEach(function (m) { m.classList.toggle('is-active', m.dataset.group === name); });
      triggers.forEach(function (t) { t.setAttribute('aria-expanded', String(t.dataset.menu === name)); });
      nav.classList.add('is-open');
    }
    function close() {
      nav.classList.remove('is-open');
      triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
      closeT = setTimeout(function () { megas.forEach(function (m) { m.classList.remove('is-active'); }); }, 450);
    }

    triggers.forEach(function (t) {
      t.addEventListener('mouseenter', function () { open(t.dataset.menu); });
      t.addEventListener('click', function () {
        if (t.getAttribute('aria-expanded') === 'true') { close(); } else { open(t.dataset.menu); }
      });
      t.addEventListener('focus', function () { open(t.dataset.menu); });
    });
    nav.addEventListener('mouseleave', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // a plain link in the bar closes the panel rather than leaving it hanging
    [].slice.call(nav.querySelectorAll('[data-plain]')).forEach(function (a) {
      a.addEventListener('mouseenter', close);
    });
  })();

  /* ---------- blur-in: split words, reveal on first sight, then the
       shimmer sweeps as the last word lands ---------- */
  (function () {
    var TARGETS = 'h1, h2, h3.t-h2, .hero__sub';
    var STEP = 46, RUN = 620, CAP = 900;

    function wrap(el, out) {
      [].slice.call(el.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          var parts = node.textContent.split(/(\s+)/);
          if (parts.length === 1 && !parts[0].trim()) return;
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'bw';
            w.textContent = part;
            frag.appendChild(w);
            out.push(w);
          });
          el.replaceChild(frag, node);
        } else if (node.nodeType === 1 && node.tagName !== 'BR') {
          wrap(node, out);   // recurse, so .shine keeps its identity
        }
      });
    }

    var targets = [].slice.call(document.querySelectorAll(TARGETS));
    // mark the shimmers this sequences, so the plain observer skips them
    targets.forEach(function (t) {
      [].slice.call(t.querySelectorAll('.shine--once')).forEach(function (sh) { sh.setAttribute('data-seq', ''); });
    });
    if (reduced || !('IntersectionObserver' in window)) return;

    targets.forEach(function (t) {
      var words = [];
      wrap(t, words);
      if (!words.length) return;
      words.forEach(function (w, i) { w.style.setProperty('--bd', Math.min(i * STEP, CAP) + 'ms'); });
      t._bwLast = Math.min((words.length - 1) * STEP, CAP);
    });

    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = entry.target;
        bio.unobserve(t);
        t.classList.add('is-in');
        setTimeout(function () {
          t.classList.add('bi--done');
          [].slice.call(t.querySelectorAll('.shine--once')).forEach(function (sh) { sh.classList.add('is-lit'); });
        }, (t._bwLast || 0) + RUN);
      });
    }, { threshold: 0.35 });
    targets.forEach(function (t) { bio.observe(t); });
  })();

  /* ---------- any shimmer not sequenced above sweeps once on first sight ---------- */
  (function () {
    var once = [].slice.call(document.querySelectorAll('.shine--once:not([data-seq])'));
    if (!once.length || reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-lit');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    once.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- .rise ---------- */
  (function () {
    var els = [].slice.call(document.querySelectorAll('.rise'));
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, n) {
        if (!entry.isIntersecting) return;
        setTimeout(function () { entry.target.classList.add('is-in'); }, n * 60);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- problem paragraph: words light to ink in reading order ---------- */
  (function () {
    var body = document.getElementById('problemBody');
    if (!body) return;

    var units = [];
    [].slice.call(body.querySelectorAll('p')).forEach(function (p) {
      [].slice.call(p.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          var parts = node.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
            units.push(s);
          });
          p.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          units.push(node);   // a .chip lights as one unit
        }
      });
    });

    if (reduced) { units.forEach(function (u) { u.classList.add('lit'); }); return; }

    function light() {
      var vh = window.innerHeight;
      units.forEach(function (u) {
        var r = u.getBoundingClientRect();
        u.classList.toggle('lit', r.top < vh * 0.72);
      });
    }
    light();
    window.addEventListener('scroll', light, { passive: true });
    window.addEventListener('resize', light);
  })();

  /* ---------- how it works: card accordion ------------------------------
     Same mechanic as the homepage's .solution__cards — hover, focus or
     click opens a card — with an auto-advance on top so the section
     demonstrates itself. The pointer always wins: entering the row stops
     the cycle, leaving it starts again. */
  (function () {
    var row = document.getElementById('hiwRow');
    if (!row) return;
    var cards = [].slice.call(row.querySelectorAll('.hiwc'));
    if (!cards.length) return;
    var i = 0, timer = null, held = false;
    var DWELL = 4200;
    var stacked = window.matchMedia('(max-width: 900px)');

    function open(n) {
      i = (n + cards.length) % cards.length;
      cards.forEach(function (c, k) {
        var on = k === i;
        c.classList.toggle('is-open', on);
        c.querySelector('.hiwc__btn').setAttribute('aria-expanded', String(on));
      });
    }
    function start() {
      if (reduced || held || stacked.matches) return;   // stacked: all cards are open
      clearInterval(timer);
      timer = setInterval(function () { open(i + 1); }, DWELL);
    }
    function stop() { clearInterval(timer); }

    cards.forEach(function (card, k) {
      card.addEventListener('mouseenter', function () { open(k); });
      card.addEventListener('click', function () { held = false; open(k); start(); });
      // focus opens the card, but only a keyboard focus should hold the
      // cycle: focusin fires on a plain mouse click too
      card.querySelector('.hiwc__btn').addEventListener('focus', function (e) {
        open(k);
        if (e.target.matches(':focus-visible')) { held = true; stop(); }
      });
      card.querySelector('.hiwc__btn').addEventListener('blur', function () { held = false; start(); });
    });

    // the pointer takes over while it is inside the row
    row.addEventListener('mouseenter', stop);
    row.addEventListener('mouseleave', function () { if (!held) start(); });

    open(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0.25 }).observe(row);
    } else { start(); }
  })();

  /* ---------- testimonial carousel arrows ---------- */
  (function () {
    var track = document.getElementById('tstmTrack');
    if (!track) return;
    [].slice.call(document.querySelectorAll('.tstm__arrow')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = track.querySelector('.tcard');
        if (!card) return;
        var step = card.getBoundingClientRect().width + 24;
        track.scrollBy({ left: step * (+btn.dataset.dir), behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  })();



  /* ---------- THE DARK BAND: three panels travelling horizontally ----------
     The section is three viewports tall and its inner frame pins for the
     middle two, so the vertical scroll the reader already has drives the
     horizontal travel — no scroll hijacking, and the page still scrolls at
     its own speed.

     The mapping is deliberately not linear. A linear sweep never lets a
     panel come to rest, so the timeline is DWELL / TRAVEL / DWELL / TRAVEL
     / DWELL: two thirds of the scroll is spent holding a panel still and
     one third moving between them, with the moves smoothstepped so they
     start and end soft.

     Nothing in the frame reads layout: the band's top and the pin's travel
     are cached on resize, and only scrollY moves per frame. Below 901px and
     under reduced motion the pin never engages — .is-pinned is never added
     and the panels are a plain vertical stack. */
  (function () {
    var band = document.querySelector('[data-hband]');
    if (!band) return;
    var track = band.querySelector('.hband__track');
    var panels = [].slice.call(band.querySelectorAll('.hpanel'));
    var ticks = [].slice.call(band.querySelectorAll('.hband__tick'));
    var N = panels.length;
    if (!track || N < 2 || ticks.length !== N) return;

    var DWELL = 0.24;                        /* share of the scroll a panel holds still for */
    var TRAVEL = (1 - N * DWELL) / (N - 1);  /* what is left, split between the handovers */

    var wide = window.matchMedia('(min-width: 901px)');
    var pinned = false, top = 0, span = 1, vw = 0;
    var queued = false, lastOff = -1;

    /* progress 0..1 → panel offset 0..N-1, flat through each dwell */
    function offsetAt(p) {
      var x = p;
      for (var i = 0; i < N; i++) {
        if (x <= DWELL || i === N - 1) return i;
        x -= DWELL;
        if (x <= TRAVEL) {
          var t = x / TRAVEL;
          return i + t * t * (3 - 2 * t);
        }
        x -= TRAVEL;
      }
      return N - 1;
    }

    function clear() {
      track.style.transform = '';
      panels.forEach(function (el) { el.style.opacity = ''; });
      ticks.forEach(function (b) {
        b.classList.remove('is-on');
        b.querySelector('i > b').style.transform = '';
      });
      lastOff = -1;
    }

    function measure() {
      var on = wide.matches && !reduced;
      if (on !== pinned) {
        pinned = on;
        band.classList.toggle('is-pinned', on);
        if (!on) clear();
      }
      if (!pinned) return;
      top = band.getBoundingClientRect().top + window.pageYOffset;
      span = band.offsetHeight - window.innerHeight;
      if (span < 1) span = 1;
      vw = window.innerWidth;
    }

    function apply() {
      queued = false;
      if (!pinned) return;
      var p = (window.pageYOffset - top) / span;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var i;

      /* the rail fills per third of the band, so it keeps moving through a
         dwell — it tracks the scroll itself, not the eased travel, and so
         it is written before the travel's no-op guard */
      var seg = 1 / N;
      var cur = Math.min(N - 1, Math.floor(p / seg));
      for (i = 0; i < N; i++) {
        var f = (p - i * seg) / seg;
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        ticks[i].classList.toggle('is-on', i === cur);
        ticks[i].querySelector('i > b').style.transform = 'scaleX(' + f.toFixed(4) + ')';
      }

      var off = offsetAt(p);
      if (Math.abs(off - lastOff) < 0.0004) return;
      lastOff = off;

      track.style.transform = 'translate3d(' + (-off * vw).toFixed(2) + 'px,0,0)';

      /* the panel leaving and the panel arriving cross-fade, so the
         half-and-half moment mid-handover reads as a transition rather
         than as two competing columns */
      for (i = 0; i < N; i++) {
        var d = Math.abs(off - i);
        panels[i].style.opacity = d >= 1 ? '0' : Math.pow(1 - d, 0.55).toFixed(3);
      }
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }

    /* a tick jumps to the middle of that panel's dwell */
    ticks.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        if (!pinned) { panels[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        var at = i * (DWELL + TRAVEL) + DWELL * 0.5;
        window.scrollTo({ top: Math.round(top + span * at), behavior: 'smooth' });
      });
    });

    measure();
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { measure(); lastOff = -1; apply(); }, 140);
    });
    if (wide.addEventListener) {
      wide.addEventListener('change', function () { measure(); lastOff = -1; apply(); });
    }
  })();

  /* ---------- the volume bars: one row open at a time ----------
     Hover or tab to a row and it opens; the first rests open so the
     pattern is visible before anything is touched, and it yields as soon
     as the pointer enters the stack. Driven from JS rather than :hover
     alone so aria-expanded tells the truth — a CSS-only version would
     leave every row claiming to be collapsed. */
  (function () {
    var wrap = document.querySelector('[data-bars]');
    if (!wrap) return;
    var rows = [].slice.call(wrap.querySelectorAll('.bar'));
    if (!rows.length) return;
    var rest = rows.indexOf(wrap.querySelector('.bar.is-open'));
    if (rest < 0) rest = 0;

    function open(i) {
      rows.forEach(function (row, n) {
        var on = n === i;
        row.classList.toggle('is-open', on);
        row.querySelector('.bar__head').setAttribute('aria-expanded', String(on));
      });
    }

    rows.forEach(function (row, i) {
      row.addEventListener('mouseenter', function () { open(i); });
      /* focusin, not :focus-visible: opening on click is the point here —
         there is no auto-advance for a stray click to interrupt */
      row.addEventListener('focusin', function () { open(i); });
      row.querySelector('.bar__head').addEventListener('click', function () { open(i); });
    });
    wrap.addEventListener('mouseleave', function () {
      if (!wrap.contains(document.activeElement)) open(rest);
    });
    open(rest);
  })();

  /* ---------- FAQ ---------- */
  (function () {
    var list = document.getElementById('faqList');
    if (!list) return;
    [].slice.call(list.querySelectorAll('.faq__q')).forEach(function (q) {
      q.addEventListener('click', function () {
        var row = q.closest('.faq__row');
        var open = row.classList.toggle('is-open');
        q.setAttribute('aria-expanded', String(open));
      });
    });
  })();

  /* ---------- hero directory: one record open at a time ----------
     The directory demonstrates itself: records open on their employment
     history in turn, and the change card lands once the window is in
     view. The pointer wins — hovering a row opens it and holds the cycle,
     leaving the window lets it run again. Reduced motion: one record open,
     the card shown, nothing moves. */
  (function () {
    var rows = [].slice.call(document.querySelectorAll('#dirRows .drow'));
    var toast = document.getElementById('dirToast');
    if (!rows.length) return;
    var i = 1, timer = null, hold = false;
    var DWELL = 3600;

    function open(n) {
      i = (n + rows.length) % rows.length;
      rows.forEach(function (r, k) { r.classList.toggle('is-open', k === i); });
    }
    function start() {
      if (reduced || hold) return;
      clearInterval(timer);
      timer = setInterval(function () { open(i + 1); }, DWELL);
    }
    function stop() { clearInterval(timer); }

    rows.forEach(function (r, k) {
      r.addEventListener('mouseenter', function () { hold = true; stop(); open(k); });
      r.addEventListener('click', function () { open(k); });
    });
    var box = rows[0].parentNode;
    box.addEventListener('mouseleave', function () { hold = false; start(); });

    open(1);
    if (reduced || !('IntersectionObserver' in window)) {
      if (toast) toast.classList.add('is-on');
      return;
    }
    var shown = false;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          start();
          if (!shown && toast) { shown = true; setTimeout(function () { toast.classList.add('is-on'); }, 900); }
        } else { stop(); }
      });
    }, { threshold: 0.3 }).observe(box);
  })();
})();
