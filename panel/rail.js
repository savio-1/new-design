/* ═══════════════════════════════════════════════════════════════
   Platform panel — one component, two widths. Groups keep their own
   expanded state at either width, so crunching does not lose it.
   ═══════════════════════════════════════════════════════════════ */
const railEl = document.querySelector('.rail');

/* The panel opens on hover and lays itself over the page, so nothing
   reflows behind it — the page's 68px gutter is constant. The delays keep
   a cursor crossing the rail on its way somewhere else from flashing it
   open; opening is quicker than closing, so an accidental overshoot on
   the way back in does not shut it. */
function setRailOpen(on) {
  railEl.classList.toggle('is-open', on);
}

let railPeekTimer = null;
function railPeek(on) {
  clearTimeout(railPeekTimer);
  railPeekTimer = setTimeout(() => {
    /* The preview sits outside the panel, so reaching for its buttons reads
       as leaving. Hold the panel open while it is up. */
    if (!on && $('upsell').classList.contains('is-open')) return;
    setRailOpen(on);
  }, on ? 120 : 220);
}

railEl.addEventListener('mouseenter', () => railPeek(true));
railEl.addEventListener('mouseleave', () => railPeek(false));
/* Hover is not the only way in — tabbing into the panel opens it too. */
railEl.addEventListener('focusin', () => { clearTimeout(railPeekTimer); setRailOpen(true); });
railEl.addEventListener('focusout', e => {
  if (!railEl.contains(e.relatedTarget)) railPeek(false);
});
/* Dismisses the peek without having to move the pointer off the panel. */
$('railCollapse').addEventListener('click', () => {
  clearTimeout(railPeekTimer);
  setRailOpen(false);
});
/* One category open at a time. Opening an item — or a group header —
   collapses the rest, so the panel only ever shows the section you are
   working in. That matters more at 68px, not less: crunched, the icons
   carry no grouping of their own, so a short list is the only thing that
   stays readable. Pass null to collapse everything. */
function railExposeOnly(group) {
  document.querySelectorAll('.rail-group[data-group]').forEach(g => {
    /* A group with nothing under it is a label, not a disclosure. */
    if (!g.querySelector('.rail-stack')) return;
    g.querySelector('.rail-ghead').setAttribute('aria-expanded', String(g === group));
  });
}

document.querySelectorAll('.rail-ghead').forEach(h => {
  h.addEventListener('click', () => {
    const group = h.closest('.rail-group');
    if (!group.querySelector('.rail-stack')) return;
    railExposeOnly(h.getAttribute('aria-expanded') === 'true' ? null : group);
  });
});

/* Named rather than inline: rows can be added after load (F builds
   Context Studio's blocks), and they need the same behaviour. */
function bindRailItem(b) {
  b.addEventListener('click', () => {
    document.querySelectorAll('.rail-btn.is-active').forEach(x => {
      x.classList.remove('is-active');
      x.removeAttribute('aria-current');
    });
    b.classList.add('is-active');
    b.setAttribute('aria-current', 'page');
    /* Home sits outside every category, so it collapses all of them. */
    railExposeOnly(b.closest('.rail-group'));
  });
}
document.querySelectorAll('.rail-btn').forEach(bindRailItem);

/* ═══════════════════════════════════════════════════════════════
   Entitlements. Context Studio is sold separately: on the plan it
   behaves like any other category; off it, it stays in the panel and
   carries the flag — hiding an offering nobody has bought is how it
   stays unbought. Override with ?cs=owned to preview the owned state.
   ═══════════════════════════════════════════════════════════════ */
const OWNS_CONTEXT_STUDIO = new URLSearchParams(location.search).get('cs') === 'owned';
const ctxGroup = document.querySelector('.rail-group[data-group="context-studio"]');
ctxGroup.classList.toggle('is-locked', !OWNS_CONTEXT_STUDIO);
$('ctxStudio').title = OWNS_CONTEXT_STUDIO ? 'Context Studio' : 'Context Studio — not on your plan';

/* The card sits a little above the row it belongs to rather than level
   with it: anchored flush, a 416px card hangs a long way below a 24px
   row and reads as belonging to whatever is under it. */
const UPSELL_RISE = 28, UPSELL_GAP = 20;

function positionUpsell() {
  const bar = $('upsell');
  const row = $('ctxStudio').getBoundingClientRect();
  placeTiqBar(bar, railEl.getBoundingClientRect(),
              { top: row.top - UPSELL_RISE, left: row.left }, UPSELL_GAP);
}
function closeUpsell() {
  $('upsell').classList.remove('is-open', 'is-shown');
  /* Nothing to see, nothing running. */
  if (filmOffer) filmOffer.pause();
  /* The panel may have been held open for the preview, so release it — but
     only if the pointer has actually left the panel. Moving from this row
     to another one inside it must not collapse the whole thing. */
  if (!railEl.matches(':hover')) railPeek(false);
}
function openUpsell() {
  const el = $('upsell');
  el.classList.add('is-open');
  positionUpsell();
  /* Mounted here, not at boot: creating the iframe while .upsell was
     still display:none left its animations stuck at currentTime 0 even
     after cancel()+play() — a hidden iframe is never given a rendering
     opportunity to start ticking. The box is already visible by this
     line, so the clip is not made in the dark. From the top every time
     after that: the offer is most people's first frame. */
  if (!filmOffer) filmOffer = mountCinema($('upsellFilm'));
  else filmOffer.restart();
  requestAnimationFrame(() => el.classList.add('is-shown'));
}

/* The preview is a hover affair: it arrives while the eye is already on
   the row, rather than asking for a click on something the user has not
   been sold yet. Opening waits longer than closing, so running the cursor
   down the panel does not trigger it; closing waits long enough to cross
   the gap into the preview and reach the buttons. */
let upsellTimer = null;
function upsellHover(on) {
  clearTimeout(upsellTimer);
  upsellTimer = setTimeout(() => (on ? openUpsell() : closeUpsell()), on ? 300 : 240);
}
if (!OWNS_CONTEXT_STUDIO) {
  $('ctxStudio').addEventListener('mouseenter', () => upsellHover(true));
  $('ctxStudio').addEventListener('mouseleave', () => upsellHover(false));
  $('upsell').addEventListener('mouseenter', () => clearTimeout(upsellTimer));
  $('upsell').addEventListener('mouseleave', () => upsellHover(false));
}

/* ── The big view ───────────────────────────────────────────────
   A second mount rather than moving the card's iframe into the
   overlay: re-parenting an iframe reloads its document in every
   engine, so the clip would restart regardless — and this way the
   card keeps a clip of its own to come back to.
   Opening hands over rather than stacking: the card is dismissed, so
   there is no live preview sitting behind the backdrop running the
   same six seconds at a size nobody can see. */
let filmBig = null;
function filmBoxKeys(e) { if (e.key === 'Escape') closeFilmBox(); }
function openFilmBox() {
  const box = $('filmBox');
  box.classList.add('is-open');
  if (!filmBig) filmBig = mountCinema($('filmBoxStage'));
  else { filmBig.fit(); filmBig.restart(); }
  requestAnimationFrame(() => box.classList.add('is-shown'));
  document.addEventListener('keydown', filmBoxKeys);
  $('filmBoxClose').focus();
}
function closeFilmBox() {
  const box = $('filmBox');
  box.classList.remove('is-shown');
  if (filmBig) filmBig.pause();
  document.removeEventListener('keydown', filmBoxKeys);
  /* Held open for the fade, then taken out of the layout — leaving a
     full-viewport overlay in flow would swallow every click under it. */
  setTimeout(() => box.classList.remove('is-open'), 200);
}
$('upsellExpand').addEventListener('click', e => {
  e.stopPropagation();
  closeUpsell();               /* hand over, do not stack */
  openFilmBox();
});
$('filmBoxClose').addEventListener('click', closeFilmBox);
/* Only the backdrop itself, never a click that happened to bubble out
   of the stage. */
$('filmBox').addEventListener('click', e => {
  if (e.target === $('filmBox')) closeFilmBox();
});

$('ctxStudio').addEventListener('click', e => {
  e.stopPropagation();
  /* Opened into its blocks (F) the row is a disclosure like any other
     category, and the group handler above has already toggled it. The
     offer still arrives on the dwell, which is where it belongs. */
  if (ctxGroup.querySelector('.rail-stack')) return;
  if (!OWNS_CONTEXT_STUDIO) {
    /* Clicking should not fight the hover that is already opening it. */
    clearTimeout(upsellTimer);
    openUpsell();
    return;
  }
  /* Owned, it behaves like any other destination — and being its own
     category, opening it closes the rest. */
  document.querySelectorAll('.rail-btn.is-active').forEach(x => {
    x.classList.remove('is-active');
    x.removeAttribute('aria-current');
  });
  railExposeOnly(ctxGroup);
});
$('upsell').addEventListener('click', e => e.stopPropagation());
/* preventDefault only because the href is a placeholder — with a real
   destination this handler is just the close. */
$('upsellLearn').addEventListener('click', e => { e.preventDefault(); closeUpsell(); });
$('upsellGo').addEventListener('click', closeUpsell);
document.addEventListener('click', closeUpsell);
window.addEventListener('resize', positionUpsell);

/* ── Icon motion on hover ─────────────────────────────────────────
   One timeline per icon, built once and replayed rather than rebuilt,
   so running the cursor down the rail cannot leave a half-finished
   tween behind: restart() takes it to frame one whatever it was doing.
   Everything is set up inside matchMedia, so the whole thing reverts
   itself for anyone who asks for reduced motion. */
(function () {
  var g = window.gsap;
  if (!g) return;                       /* no GSAP, no motion, no errors */

  /* The glyph is inlined before anything is animated. Referenced
     through <use> its paths are shadow DOM, so one dasharray has to
     serve all of them — on a six-path icon like Skills or Model Hub
     the short strokes then snap in whole while only the longest
     actually draws, which is why those read as a bare scale. Cloning
     the symbol's own contents in gives every path its own length, and
     lets them stagger, so the icon assembles rather than appearing.
     Only done when GSAP is present: without it the markup keeps its
     <use> and nothing here has run. */
  function inlineGlyph(svg) {
    var use = svg.querySelector('use');
    if (!use) return [].slice.call(svg.querySelectorAll('path'));  /* already inlined */
    var href = use.getAttribute('href') || use.getAttribute('xlink:href');
    var sym = href && document.querySelector(href);
    /* A <use> scales the symbol's viewBox into its own viewport; a
       clone does not. Equal viewBoxes is what makes the swap safe, so
       it is checked rather than assumed. */
    if (!sym || sym.getAttribute('viewBox') !== svg.getAttribute('viewBox')) return [];
    /* The presentation attributes come across too. Every symbol here
       carries fill="none", and the paths inside rely on inheriting it
       — cloning only the children drops that, fill falls back to the
       SVG default of black, and the glyph fills in solid: interiors
       go black and anything drawn as a hole, like the robot's eyes,
       disappears against the background. */
    for (var a = 0; a < sym.attributes.length; a++) {
      var at = sym.attributes[a];
      if (at.name === 'id' || at.name === 'viewBox') continue;
      if (!svg.hasAttribute(at.name)) svg.setAttribute(at.name, at.value);
    }
    use.remove();
    for (var i = 0; i < sym.children.length; i++) {
      svg.appendChild(sym.children[i].cloneNode(true));
    }
    var out = [];
    svg.querySelectorAll('path').forEach(function (p) {
      out = out.concat(splitSubpaths(p));
    });
    return out;
  }

  /* One <path> is often several disconnected pieces — Automations is
     six, Monitor twelve — and SVG resets the dash pattern at the start
     of every subpath. So a single dasharray leaves each piece fully
     drawn almost immediately and the icon looks like it only scales,
     however carefully the offset is animated. Splitting the pieces
     into real paths gives each its own length, and lets them come in
     one after another.
     Safe only because these exports use absolute moves throughout: a
     relative 'm' is measured from the previous piece's end, so lifting
     it out on its own would move it. Checked, not assumed. */
  function splitSubpaths(path) {
    var d = path.getAttribute('d') || '';
    if (d.indexOf('m') !== -1) return [path];
    var parts = d.match(/M[^M]*/g);
    if (!parts || parts.length < 2) return [path];
    var made = [];
    parts.forEach(function (seg) {
      var c = path.cloneNode(false);
      c.setAttribute('d', seg.trim());
      path.parentNode.insertBefore(c, path);
      made.push(c);
    });
    path.remove();
    return made;
  }

  /* One builder for both, so a category's glyph and a leaf item's are
     literally the same animation. */
  function drawIn(svg) {
    var paths = inlineGlyph(svg);
    if (!paths || !paths.length) return null;
    return g.timeline({ paused: true })
      /* dasharray is SET, not tweened. Left out of a fromTo's to-vars
         GSAP reads it as "animate back to the natural value" and
         undoes the dashing part-way through. Function-based values
         give each path its own length. */
      .set(paths, { strokeDasharray: function (i, t) { return t.getTotalLength(); } })
      .fromTo(paths,
        { strokeDashoffset: function (i, t) { return t.getTotalLength(); } },
        { strokeDashoffset: 0, duration: .45, ease: 'power2.out',
          stagger: { amount: .22 },
          clearProps: 'strokeDasharray,strokeDashoffset' }, 0)
      /* A small pop on the whole glyph, peaking early and out of the
         way before the last stroke lands. */
      .fromTo(svg, { '--ic-s': 1 },
        { '--ic-s': 1.12, duration: .16, ease: 'power2.out' }, 0)
      .to(svg, { '--ic-s': 1, duration: .42, ease: 'elastic.out(1, .55)' }, .16);
  }

  g.matchMedia().add('(prefers-reduced-motion: no-preference)', function () {

    /* A leaf item's glyph, and a category's glyph inside its tile —
       the tile's own chevron is deliberately not in this list. */
    document.querySelectorAll('.rail-btn .ic, .rail-ghead .rail-tile .ic')
      .forEach(function (svg) {
        var tl = drawIn(svg);
        if (!tl) return;
        var row = svg.closest('.rail-btn, .rail-ghead');
        row.addEventListener('mouseenter', function () { tl.restart(); });
      });

    /* matchMedia reverts everything created in here when the query
       stops matching; the listeners are all it cannot see, so they are
       taken off explicitly. */
    return function () {
      document.querySelectorAll('.rail-btn .ic, .rail-ghead .rail-tile .ic')
        .forEach(function (el) { el.style.cssText = ''; });
    };
  });
})();

/* Open on the section this page belongs to, whichever item is marked
   active — the panel should never need a click to show you where you are. */
const railActive = document.querySelector('.rail-btn.is-active');
railExposeOnly(railActive ? railActive.closest('.rail-group') : null);
railExposeOnly(null);
