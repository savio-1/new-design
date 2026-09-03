'use strict';
'use strict';
const $ = (id) => document.getElementById(id);
const root = document.documentElement;

/* ── Shared vocabulary ───────────────────────────────────────────────
   One LAYERS array for the whole app: the house order is Solution >
   Organization > Domain, narrowest scope first, and every list that
   shows the three layers renders from here. `label` is the short form
   the glossary tabs and badges use; `longLabel` is the column head on
   the create-bundle matrix. */
const LAYERS = [
  { key: 'solution',     label: 'Solution',     longLabel: 'Solution layer',     note: 'How a specific problem is solved',       dia: 'cb-dia-purple' },
  { key: 'organization', label: 'Organization', longLabel: 'Organization layer', note: 'How this enterprise works, specifically', dia: 'cb-dia-green'  },
  { key: 'domain',       label: 'Domain',       longLabel: 'Domain layer',       note: 'How the domain works, universally',      dia: 'cb-dia-blue'   },
];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ── Router ──────────────────────────────────────────────────────────
   Three views in one document. Switching hides one and shows another —
   no navigation, so the rail, the header chrome and any open panel
   state all survive. The sidebar reflects where you are; the create
   view takes the whole frame and swaps in its own header.

   Adding a view: give it a section with id `view-<name>`, add a case to
   VIEWS, and point something at `go('<name>')`. */
const VIEWS = {
  studio:   { el: 'view-studio',   side: 'Studio',   header: 'hdrContext', sidebar: true  },
  glossary: { el: 'view-glossary', side: 'Glossary', header: 'hdrContext', sidebar: true  },
  create:   { el: 'view-create',   side: null,       header: 'hdrCreate',  sidebar: false },
};
let view = 'studio';

function go(name) {
  const v = VIEWS[name];
  if (!v) return;
  view = name;
  Object.entries(VIEWS).forEach(([k, cfg]) => { $(cfg.el).hidden = k !== name; });
  $('hdrContext').hidden = v.header !== 'hdrContext';
  $('hdrCreate').hidden  = v.header !== 'hdrCreate';
  $('mainSection').hidden = !v.sidebar;
  document.querySelectorAll('.side-item').forEach((b) => {
    const on = v.side !== null && b.dataset.view === name;
    b.classList.toggle('is-active', on);
    b.classList.toggle('t-body2-med', on);
    b.classList.toggle('t-body2-reg', !on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  /* A view switch closes anything floating over the old one. */
  document.dispatchEvent(new CustomEvent('cq:viewchange', { detail: { view: name } }));
  const scroller = $(v.el).querySelector('.cq-scroll-y');
  if (scroller) scroller.scrollTop = 0;
}

document.querySelectorAll('.side-item[data-view]').forEach((b) => {
  b.addEventListener('click', () => go(b.dataset.view));
});
/* Anything with data-go navigates — the hero CTA, the breadcrumb, Cancel. */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) go(t.dataset.go);
});
