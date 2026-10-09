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

  /* ---------- hero: the change feed as a deck of person cards ----------
     One card per person: who they are, how they matched your file, what
     moved since the last refresh, and their history. The front card is lit
     and its progress line fills over the dwell; when it is full the card
     flies off and rejoins the back of the deck, and the next one rises.
     Drag the front card sideways to send it on yourself (short of the
     threshold it springs back); click a card peeking behind to bring it
     forward. Hovering the deck holds it. Reduced motion: no auto-advance,
     no transitions; dragging and clicking still work. */
  (function () {
    var root = document.getElementById('heroMine');
    if (!root) return;
    var deck = document.getElementById('mineDeck');
    var foot = document.getElementById('mineFoot');
    var idxEl = document.getElementById('mineIdx');
    var listEl = document.getElementById('mineList');

    var MATCH = ['Name', 'Employer', 'Class', 'Location'];
    /* illustrative people; hue follows the kind of change */
    var PEOPLE = [
      { name: 'Camila Reyes', photo: '@asset:face-reyes.jpg', meta: 'Your ID 61-22094 · BS ’07 · Oakland, CA',
        status: ['hchip--mint', '100% match'], hue: 'lilac', when: 'Since last refresh · Sep 2026', type: 'New title',
        from: 'Director of Product', to: 'VP Product, Northwind Labs',
        hist: [['VP Product, Northwind Labs', '2026 – now'], ['Director of Product, Northwind Labs', '2021 – 2026'], ['Product Manager, Brightline', '2014 – 2021']],
        attrs: 'all', action: 'Push to CRM' },
      { name: 'Richard Hale', photo: '@asset:face-hale.jpg', meta: 'Your ID 40-77102 · MBA ’98 · San Jose, CA',
        status: ['hchip--mint', '100% match'], hue: 'sky', when: 'Since last refresh · Aug 2026', type: 'New employer',
        from: 'Halcyon Systems', to: 'Arden Cloud',
        hist: [['SVP Platform, Arden Cloud', '2026 – now'], ['SVP Platform, Halcyon Systems', '2017 – 2026'], ['VP Engineering, Fernway', '2009 – 2017']],
        attrs: 'all', action: 'Push to CRM' },
      { name: 'Elizabeth Chen', photo: '@asset:face-chen.jpg', meta: 'Your ID 52-30417 · BA ’06 · Boston, MA',
        status: ['hchip--sand', '86% · review'], hue: 'sand', when: 'Partial name match · held for you', type: 'Surname',
        from: 'Elizabeth Smith', to: 'Elizabeth Chen',
        hist: [['Chief Technology Officer, Quarry Data', '2023 – now'], ['VP Engineering, Lantern Partners', '2015 – 2023'], ['Engineering Lead, Halcyon Systems', '2010 – 2015']],
        attrs: 'name-off', action: 'Confirm match' },
      { name: 'Sarah Okafor', photo: '@asset:face-okafor.jpg', meta: 'Your ID 88-04231 · MBA ’04 · Portland, OR',
        status: ['hchip--mint', '100% match'], hue: 'peach', when: 'Since last refresh · Sep 2026', type: 'Promotion',
        from: 'Chief Operating Officer', to: 'Chief Executive Officer',
        hist: [['Chief Executive Officer, Meridian Health', '2026 – now'], ['Chief Operating Officer, Meridian Health', '2019 – 2026'], ['VP Operations, Cascade Care', '2012 – 2019']],
        attrs: 'all', action: 'Push to CRM' },
      { name: 'Amara Otieno', photo: '@asset:face-otieno.jpg', meta: 'Postdoc ’19 · Nairobi, KE · no ID yet',
        status: ['hchip--aqua', 'New record'], hue: 'aqua', when: 'Not in your file · lists your institution', type: 'Found',
        from: 'No record', to: 'Research Scientist, Lattice Bio',
        hist: [['Research Scientist, Lattice Bio', '2022 – now'], ['Postdoctoral Fellow, your institution', '2019 – 2022']],
        attrs: 'none', action: 'Add record' },
      { name: 'Daniel Brooks', photo: '@asset:face-brooks.jpg', meta: 'Your ID 33-90215 · BS ’03 · Seattle, WA',
        status: ['hchip--mint', '100% match'], hue: 'aqua', when: 'Since last refresh · Jul 2026', type: 'Location',
        from: 'Denver, CO', to: 'Seattle, WA',
        hist: [['Engineering Director, Fernway', '2020 – now'], ['Senior Engineer, Fernway', '2015 – 2020'], ['Engineer, Quarry Data', '2003 – 2015']],
        attrs: 'all', action: 'Push to CRM' },
      { name: 'John Smith', photo: '@asset:face-smith.jpg', meta: 'Your ID 77-10982 · BA ’98 · 1 of 3 John Smiths',
        status: ['hchip--mint', '100% match'], hue: 'peach', when: 'Since last refresh · Jun 2026', type: 'Promotion',
        from: 'Senior Associate', to: 'Partner, Baird & Lowe',
        hist: [['Partner, Baird & Lowe', '2026 – now'], ['Senior Associate, Baird & Lowe', '2018 – 2026'], ['Associate, Keller Ames', '2011 – 2018']],
        attrs: 'all', action: 'Push to CRM' }
    ];

    /* the same cards as text, for anyone not seeing the deck */
    listEl.innerHTML = PEOPLE.map(function (p) {
      return '<li>' + p.name + ' (' + p.meta + '), ' + p.status[1] + ': ' + p.when + ' — ' + p.type.toLowerCase() + ', ' + p.from + ' to ' + p.to + '.</li>';
    }).join('');

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function cardHTML(p) {
      var attrs = p.attrs === 'none'
        ? '<span class="is-none">No record to match yet</span>'
        : MATCH.map(function (a, i) { return '<span' + (p.attrs === 'name-off' && i === 0 ? ' class="is-off"' : '') + '>' + a + '</span>'; }).join('');
      return '<div class="pc__body">' +
        '<div class="pc__top"><img class="pc__ava" alt="" src="' + p.photo + '">' +
          '<span class="pc__who"><span class="pc__name">' + esc(p.name) + '</span><span class="pc__meta">' + esc(p.meta) + '</span></span>' +
          '<span class="hchip ' + p.status[0] + '">' + esc(p.status[1]) + '</span></div>' +
        '<div class="pc__chg"><p class="pc__when"><span>' + esc(p.when) + '</span><span class="hchip">' + esc(p.type) + '</span></p>' +
          '<p class="pc__move"><span class="pc__from">' + esc(p.from) + '</span><span class="pc__arrow">→</span><span class="pc__to">' + esc(p.to) + '</span></p></div>' +
        '<p class="pc__lbl">Employment history</p>' +
        '<ul class="hist">' + p.hist.map(function (h) { return '<li><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></li>'; }).join('') + '</ul>' +
        '<div class="pc__foot"><span class="pc__attrs">' + attrs + '</span><span class="mbtn mbtn--ink">' + esc(p.action) + '</span></div>' +
        '</div><span class="pc__load"><i></i></span>';
    }

    var cards = PEOPLE.map(function (p) {
      var el = document.createElement('div');
      el.className = 'pc pc--' + p.hue;
      el.innerHTML = cardHTML(p);
      deck.appendChild(el);
      return el;
    });
    var order = cards.slice();          // order[0] is the front card
    var seen = 1;

    /* stack slots: each card behind rises and recedes a step */
    var SLOTS = [
      { y: 0, s: 1, o: 1 }, { y: -38, s: 0.95, o: 1 }, { y: -72, s: 0.9, o: 0.85 },
      { y: -102, s: 0.85, o: 0.55 }, { y: -122, s: 0.8, o: 0 }
    ];
    function slot(k) { return SLOTS[Math.min(k, SLOTS.length - 1)]; }
    function place(el, k) {
      var s = slot(k);
      el.style.transform = 'translate3d(0,' + s.y + 'px,0) scale(' + s.s + ')';
      el.style.opacity = s.o;
      el.style.zIndex = String(100 - k);
      el.classList.toggle('is-front', k === 0);
    }
    function layout() { order.forEach(place); }

    /* keep the deck and its foot centred on the front card's height */
    function size() {
      var front = order[0], h = front.offsetHeight, H = root.clientHeight, peek = 102, footH = foot.offsetHeight, gap = 22;
      var top = Math.max(peek + 8, (H - (peek + h + gap + footH)) / 2 + peek);
      deck.style.top = top + 'px';
      foot.style.top = (top + h + gap) + 'px';
    }

    /* the dwell clock */
    var DWELL = 4600, elapsed = 0, hold = false, visible = true, busy = false;
    function setLoad(f) {
      var bar = order[0].querySelector('.pc__load i');
      if (bar) bar.style.transform = 'scaleX(' + f.toFixed(4) + ')';
    }

    /* the front card leaves (dir -1 left, +1 right) and rejoins at the back */
    function advance(dir) {
      if (busy) return;
      busy = true;
      var out = order[0];
      out.classList.remove('is-grabbing');
      out.style.transform = 'translate3d(' + (dir * 120) + '%,40px,0) rotate(' + (dir * 9) + 'deg)';
      out.style.opacity = '0';
      setLoad(0);
      order.push(order.shift());
      order.forEach(function (el, k) { if (el !== out) place(el, k); });
      seen = seen % 412 + 1;
      idxEl.textContent = seen;
      elapsed = 0;
      size();
      setTimeout(function () {
        out.classList.add('is-snap');
        place(out, order.length - 1);
        void out.offsetWidth;
        out.classList.remove('is-snap');
        busy = false;
      }, reduced ? 0 : 460);
    }

    function bringForward(el) {
      var k = order.indexOf(el);
      if (k <= 0 || busy) return;
      setLoad(0);
      order = order.slice(k).concat(order.slice(0, k));
      seen = seen % 412 + 1;
      idxEl.textContent = seen;
      elapsed = 0;
      layout();
      size();
    }

    /* drag the front card */
    var drag = null;
    deck.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.pc');
      if (!el) return;
      if (el !== order[0]) { bringForward(el); return; }
      if (busy) return;
      drag = { el: el, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: performance.now(), vx: 0, moved: false };
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now(), ndx = e.clientX - drag.x, ndy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(ndx) < 5 && Math.abs(ndy) < 5) return;
        /* a mostly vertical touch is a page scroll, not a drag */
        if (e.pointerType === 'touch' && Math.abs(ndy) > Math.abs(ndx)) { drag = null; return; }
        drag.moved = true;
        drag.el.classList.add('is-grabbing');
      }
      drag.vx = (ndx - drag.dx) / Math.max(1, now - drag.t);
      drag.dx = ndx; drag.dy = ndy; drag.t = now;
      drag.el.style.transform = 'translate3d(' + ndx + 'px,' + (ndy * 0.3) + 'px,0) rotate(' + (ndx * 0.045) + 'deg)';
    });
    function release() {
      if (!drag) return;
      var d = drag; drag = null;
      d.el.classList.remove('is-grabbing');
      if (!d.moved) return;
      if (Math.abs(d.dx) > 110 || Math.abs(d.vx) > 0.6) advance(d.dx < 0 ? -1 : 1);
      else place(d.el, 0);
    }
    deck.addEventListener('pointerup', release);
    deck.addEventListener('pointercancel', release);

    root.addEventListener('mouseenter', function () { hold = true; });
    root.addEventListener('mouseleave', function () { hold = false; });

    layout();
    size();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    if (reduced) return;

    var raf = 0, last = 0, running = false;
    function frame(now) {
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      if (!hold && !drag && !busy) {
        elapsed += dt;
        setLoad(Math.min(1, elapsed / DWELL));
        if (elapsed >= DWELL) advance(-1);
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible = e.isIntersecting; if (visible && !document.hidden) start(); else stop(); });
      }, { threshold: 0.1 }).observe(root);
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
