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

  /* ---------- hero: the change feed as a row of people ----------
     Eleven people on a ring. The one in the middle is in front at full
     size, named on the photo; the others step back to either side,
     smaller, turned toward the middle and veiled, and fade out past the
     third. Every position is a continuous function of one number, pos, so
     a drag moves the whole row by fractions of a card and a release
     settles it on the nearest person. It advances by itself every few
     seconds, under the pointer too; a drag or a click on a side card
     takes over. Reduced motion: no auto-advance and no transitions. */
  (function () {
    var root = document.getElementById('heroMine');
    if (!root) return;
    var stage = document.getElementById('mineStage');
    var info = document.getElementById('mineInfo');
    var tagEl = info.querySelector('.fi__tag');
    var whenEl = info.querySelector('.fi__when');
    var fromEl = info.querySelector('.fi__from');
    var toEl = info.querySelector('.fi__to span');
    var metaEl = info.querySelector('.fi__meta');
    var listEl = document.getElementById('mineList');

    /* illustrative people: from → to is what the last refresh found */
    var PEOPLE = [
      { name: 'Sarah Okafor', photo: '@asset:portrait-okafor.jpg', edu: 'MBA ’04', tag: 'Promotion', hue: 'peach',
        from: 'Chief Operating Officer', to: 'Chief Executive Officer', meta: 'Meridian Health · your ID 88-04231 · 100% match · Sep 2026' },
      { name: 'Camila Reyes', photo: '@asset:portrait-reyes.jpg', edu: 'BS ’07', tag: 'New title', hue: 'lilac',
        from: 'Director of Product', to: 'VP Product', meta: 'Northwind Labs · your ID 61-22094 · 100% match · Sep 2026' },
      { name: 'Richard Hale', photo: '@asset:portrait-hale.jpg', edu: 'MBA ’98', tag: 'New employer', hue: 'sky',
        from: 'Halcyon Systems', to: 'Arden Cloud', meta: 'SVP Platform · your ID 40-77102 · 100% match · Aug 2026' },
      { name: 'Elizabeth Chen', photo: '@asset:portrait-chen.jpg', edu: 'BA ’06', tag: 'Held for review', hue: 'sand',
        from: 'Elizabeth Smith', to: 'Elizabeth Chen', meta: 'Partial name match · 86% · your ID 52-30417 · you review it once' },
      { name: 'Amara Otieno', photo: '@asset:portrait-otieno.jpg', edu: 'Postdoc ’19', tag: 'New record', hue: 'aqua',
        from: '', to: 'Research Scientist, Lattice Bio', meta: 'Lists your institution · not in your file · added as a new record' },
      { name: 'Daniel Brooks', photo: '@asset:portrait-brooks.jpg', edu: 'BS ’03', tag: 'Location', hue: 'aqua',
        from: 'Denver, CO', to: 'Seattle, WA', meta: 'Engineering Director, Fernway · your ID 33-90215 · Jul 2026' },
      { name: 'John Smith', photo: '@asset:portrait-smith.jpg', edu: 'BA ’98', tag: 'Promotion', hue: 'peach',
        from: 'Senior Associate', to: 'Partner', meta: 'Baird & Lowe · your ID 77-10982 · 1 of 3 John Smiths in your file' },
      { name: 'James Whitfield', photo: '@asset:portrait-whitfield.jpg', edu: 'BS ’09', tag: 'New employer', hue: 'sky',
        from: 'Quarry Data', to: 'Fernway', meta: 'Head of Engineering · your ID 73-11845 · 100% match · Mar 2026' },
      { name: 'Margaret Lowell', photo: '@asset:portrait-lowell.jpg', edu: 'BA ’86', tag: 'New title', hue: 'lilac',
        from: 'Dean of Business', to: 'Provost', meta: 'Ashford College · your ID 21-60478 · 100% match · Jun 2026' },
      { name: 'Kwame Asante', photo: '@asset:portrait-asante.jpg', edu: 'MSc ’15', tag: 'New employer', hue: 'sky',
        from: 'Lattice Bio', to: 'Meridian Health', meta: 'Data Scientist · your ID 90-11532 · 100% match · Sep 2026' },
      { name: 'Nia Thompson', photo: '@asset:portrait-thompson.jpg', edu: 'BA ’15', tag: 'New title', hue: 'lilac',
        from: 'Senior Designer', to: 'Design Director', meta: 'Brightline · your ID 66-40219 · 100% match · Aug 2026' }
    ];
    var N = PEOPLE.length;

    /* the same people as text, for anyone not seeing the carousel */
    listEl.innerHTML = PEOPLE.map(function (p) {
      return '<li>' + p.name + ' (' + p.edu + '), ' + p.tag.toLowerCase() + ': ' + (p.from ? p.from + ' to ' : '') + p.to + '. ' + p.meta + '.</li>';
    }).join('');

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    var cards = PEOPLE.map(function (p) {
      var el = document.createElement('div');
      el.className = 'fc';
      el.innerHTML = '<img alt="" src="' + p.photo + '">' +
        '<span class="fc__name">' + esc(p.name) + '<small>' + esc(p.edu) + '</small></span>';
      stage.appendChild(el);
      return el;
    });

    /* one row of the slot table per step out from the middle; every value
       in between is interpolated, so fractional positions are smooth */
    var T = [
      { x: 0,    s: 1,    r: 0,  z: 0,    v: 0,    o: 1 },
      { x: 0.66, s: 0.8,  r: 30, z: -60,  v: 0.16, o: 1 },
      { x: 1.14, s: 0.64, r: 38, z: -120, v: 0.3,  o: 0.95 },
      { x: 1.5,  s: 0.52, r: 42, z: -170, v: 0.44, o: 0.6 },
      { x: 1.76, s: 0.44, r: 44, z: -210, v: 0.6,  o: 0 }
    ];
    function at(d) {
      var a = Math.min(Math.abs(d), T.length - 1), i = Math.floor(a), f = a - i, A = T[i], B = T[Math.min(i + 1, T.length - 1)];
      function m(k) { return A[k] + (B[k] - A[k]) * f; }
      return { x: m('x'), s: m('s'), r: m('r'), z: m('z'), v: m('v'), o: m('o') };
    }

    var pos = 0, cw = 260, shown = -1;
    function wrap(d) { d = ((d % N) + N) % N; return d > N / 2 ? d - N : d; }
    function render() {
      cw = stage.offsetWidth || cw;
      var front = ((Math.round(pos) % N) + N) % N;
      cards.forEach(function (el, i) {
        var d = wrap(i - pos), k = at(d), sg = d < 0 ? -1 : 1;
        el.style.transform = 'translate3d(' + (sg * k.x * cw).toFixed(1) + 'px,0,' + k.z.toFixed(1) + 'px) rotateY(' + (sg * k.r).toFixed(2) + 'deg) scale(' + k.s.toFixed(3) + ')';
        el.style.opacity = k.o.toFixed(3);
        el.style.setProperty('--veil', k.v.toFixed(3));
        el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
        el.classList.toggle('is-front', i === front && Math.abs(d) < 0.5);
      });
      if (front !== shown) showInfo(front);
      /* the dotted sphere behind turns with the row */
      document.dispatchEvent(new CustomEvent('mine:pos', { detail: { pos: pos, dragging: !!drag } }));
    }

    /* the two lines under the front card, cross-faded on change */
    var swapT;
    var HUES = ['peach', 'lilac', 'sky', 'sand', 'aqua'];
    function fillInfo(p) {
      /* a trailing month and year in the meta line is the date of the change */
      var m = p.meta.match(/^(.*) · ([A-Z][a-z]{2} \d{4})$/);
      HUES.forEach(function (h) { info.classList.toggle('is-' + h, h === p.hue); });
      tagEl.className = 'hchip fi__tag hchip--' + p.hue;
      tagEl.textContent = p.tag;
      whenEl.textContent = m ? 'Since last refresh · ' + m[2] : 'This refresh';
      fromEl.textContent = p.from;
      toEl.textContent = p.to;
      metaEl.textContent = m ? m[1] : p.meta;
    }
    function showInfo(i) {
      var first = shown < 0;
      shown = i;
      /* the dotted sphere behind the row ripples in this change's hue */
      document.dispatchEvent(new CustomEvent('mine:change', { detail: { hue: PEOPLE[i].hue } }));
      if (first || reduced) { fillInfo(PEOPLE[i]); return; }
      info.classList.add('is-swap');
      clearTimeout(swapT);
      swapT = setTimeout(function () { fillInfo(PEOPLE[shown]); info.classList.remove('is-swap'); }, 220);
    }

    /* drag the row; a still click on a side card brings it forward */
    var drag = null;
    root.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, p0: pos, moved: false, vx: 0, lx: e.clientX, lt: performance.now(), card: e.target.closest('.fc') };
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }   // a page scroll
        drag.moved = true;
        stage.classList.add('is-dragging');
      }
      var now = performance.now();
      drag.vx = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
      drag.lx = e.clientX; drag.lt = now;
      pos = drag.p0 - dx / (cw * 0.66);
      render();
    });
    function release() {
      if (!drag) return;
      var d = drag; drag = null;
      stage.classList.remove('is-dragging');
      if (d.moved) {
        /* a flick carries on a card or two in the direction it was thrown */
        pos = Math.round(pos - Math.max(-2, Math.min(2, d.vx * 1.6)));
      } else if (d.card) {
        var i = cards.indexOf(d.card);
        pos = Math.round(pos + wrap(i - pos));
      }
      elapsed = 0;
      render();
    }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    /* the row keeps moving under the pointer too; only a drag holds it */
    var hold = false;

    render();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(render, 100); });
    if (reduced) return;

    /* the dwell: a clock that only runs while the row is seen and free */
    var DWELL = 3200, elapsed = 0, raf = 0, last = 0, running = false;
    function frame(now) {
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      if (!hold && !drag) {
        elapsed += dt;
        if (elapsed >= DWELL) { elapsed = 0; pos = Math.round(pos) + 1; render(); }
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    var visible = true;
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); });
      }, { threshold: 0.1 }).observe(root);
    } else { start(); }
  })();

  /* ---------- hero: the dotted sphere behind the carousel ----------
     The News globe's dot language, carried to this page so every product
     hero shares it: ink dots on a sphere, smaller and fainter with depth,
     only the near face drawn; a turquoise scan band crossing it every few
     seconds (here, a refresh passing over your alumni); and a ring that
     runs outward from behind the front card whenever a new change comes
     forward, in that change's hue. Even Fibonacci points rather than a
     land mask — the map is News's idea; this sphere is just people.
     Dots are bucketed by depth and drawn one path per bucket, as on News. */
  (function () {
    var cv = document.getElementById('mineDots');
    var root = document.getElementById('heroMine');
    var stage = document.getElementById('mineStage');
    if (!cv || !cv.getContext || !root || !stage) return;
    var ctx = cv.getContext('2d'), TAU = Math.PI * 2, RAD = Math.PI / 180;

    var N = 2400, GOLD = Math.PI * (3 - Math.sqrt(5));
    var ux = new Float32Array(N), uy = new Float32Array(N), uz = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), th = i * GOLD;
      ux[i] = Math.cos(th) * r; uy[i] = y; uz[i] = Math.sin(th) * r;
    }

    /* six ink buckets by depth, three scan buckets, three ripple buckets */
    var NB = 6, NT = NB + 6;
    var bx = [], by = [], bn = new Int32Array(NT);
    for (var q = 0; q < NT; q++) { bx.push(new Float32Array(N)); by.push(new Float32Array(N)); }
    var ALPHA = [0.12, 0.18, 0.26, 0.34, 0.44, 0.54, 0.34, 0.54, 0.76, 0.40, 0.62, 0.86];
    var RADII = [0.9, 1.0, 1.1, 1.22, 1.35, 1.5, 1.25, 1.45, 1.65, 1.35, 1.6, 1.85];
    var HUE_RGB = { aqua: '0, 163, 150', lilac: '155, 95, 208', sky: '47, 111, 191', peach: '196, 112, 60', sand: '208, 138, 33' };
    var ripHue = HUE_RGB.aqua, ripAt = -1e9, RIP_MS = 2200;
    var SCAN_CYCLE = 8000, SCAN_SWEEP = 0.6, SCAN_W = 0.18;
    /* no spin of its own: the sphere turns with the carousel, one STEP of
       yaw per card, eased toward the row's position the way the cards'
       own transition eases, and tracking it directly during a drag */
    var PITCH = -16 * RAD, YAW0 = 0.6, STEP = 0.42, yaw = YAW0, yawTo = YAW0, follow = false;

    var W = 0, H = 0, cx = 0, cy = 0, R = 0, dpr = 1;
    function size() {
      /* the canvas runs past the illustration box above and below, so the
         sphere is measured against the canvas itself */
      var rb = cv.getBoundingClientRect(), sb = stage.getBoundingClientRect();
      if (!rb.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rb.width; H = rb.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = sb.top - rb.top + sb.height * 0.5;
      R = Math.min(W * 0.52, sb.height * 1.45, cy - 8, H - cy - 8);
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var sy = Math.sin(yaw), cyw = Math.cos(yaw), sp = Math.sin(PITCH), cp = Math.cos(PITCH);
      var phase = (now % SCAN_CYCLE) / SCAN_CYCLE;
      var scanning = !reduced && phase < SCAN_SWEEP;
      var scanX = scanning ? -1.25 + (phase / SCAN_SWEEP) * 2.5 : 9;
      /* the ripple is fixed in view space: it starts at the point of the
         sphere facing us, right behind the front card */
      var age = (now - ripAt) / RIP_MS, ripOn = !reduced && age >= 0 && age < 1;
      var ripCos = ripOn ? Math.cos(age * 1.6) : 0, ripFade = 1 - age;
      bn.fill(0);
      for (var i = 0; i < N; i++) {
        var x1 = ux[i] * cyw + uz[i] * sy;
        var z1 = uz[i] * cyw - ux[i] * sy;
        var y2 = uy[i] * cp - z1 * sp;
        var z2 = uy[i] * sp + z1 * cp;
        if (z2 <= 0.02) continue;
        var b = (z2 * NB) | 0; if (b > NB - 1) b = NB - 1;
        if (scanning) {
          var d = (x1 - scanX) / SCAN_W;
          if (d > -1 && d < 1) { d = 1 - (d < 0 ? -d : d); var lit = d * d * z2; if (lit > 0.16) b = NB + (lit > 0.6 ? 2 : lit > 0.34 ? 1 : 0); }
        }
        if (ripOn) {
          var dd = z2 - ripCos; if (dd < 0) dd = -dd;    // angle from the view axis
          if (dd < 0.07) { var rl = (1 - dd / 0.07) * ripFade; if (rl > 0.16) b = NB + 3 + (rl > 0.6 ? 2 : rl > 0.34 ? 1 : 0); }
        }
        var k = bn[b]++;
        bx[b][k] = cx + x1 * R; by[b][k] = cy - y2 * R;
      }
      for (var b2 = 0; b2 < NT; b2++) {
        var n = bn[b2]; if (!n) continue;
        var rr = RADII[b2];
        var ink = b2 < NB ? '4, 48, 43' : b2 < NB + 3 ? '0, 172, 159' : ripHue;
        ctx.fillStyle = 'rgba(' + ink + ', ' + ALPHA[b2] + ')';
        ctx.beginPath();
        for (var j = 0; j < n; j++) { var px = bx[b2][j], py = by[b2][j]; ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
        ctx.fill();
      }
    }

    document.addEventListener('mine:pos', function (e) {
      yawTo = YAW0 - e.detail.pos * STEP;
      follow = e.detail.dragging;
    });
    document.addEventListener('mine:change', function (e) {
      ripHue = HUE_RGB[e.detail && e.detail.hue] || HUE_RGB.aqua;
      ripAt = performance.now();
    });

    size(); draw(performance.now());
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); draw(performance.now()); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); draw(performance.now()); });
    if (reduced) return;

    var raf = 0, last = 0, running = false, visible = true;
    function frame(now) {
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      yaw = follow ? yawTo : yaw + (yawTo - yaw) * (1 - Math.exp(-dt / 170));
      draw(now);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); });
      }, { threshold: 0.05 }).observe(root);
    } else { start(); }
  })();
})();

/* phone menu: open and close the sheet under the bar */
(function () {
  var nav = document.getElementById('siteNav');
  var burger = nav && nav.querySelector('.nav__burger'), mnav = document.getElementById('mnav');
  if (!burger || !mnav) return;
  function setMenu(open) {
    mnav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-scrolled', open || window.scrollY > 12);
  }
  burger.addEventListener('click', function () { setMenu(mnav.hidden); });
  [].slice.call(mnav.querySelectorAll('a')).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); burger.focus(); } });
})();
