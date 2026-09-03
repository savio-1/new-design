'use strict';
/* ── The explainer opens itself once the page has settled ────────────
   Collapsed on arrival so the artifact list owns the sidebar, then
   revealed after a beat and left open. A manual toggle cancels the
   timer, so the card never reopens over someone who just closed it. */
(() => {
  const card = $('ctxInfo'), body = $('ctxBody'), btn = $('ctxToggle');
  let timer = null;

  function setOpen(open) {
    card.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
  }

  btn.addEventListener('click', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    setOpen(!card.classList.contains('is-open'));
  });

  /* Content can reflow (fonts, wrapping) while open — keep the cap true. */
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (card.classList.contains('is-open')) body.style.maxHeight = body.scrollHeight + 'px';
    }).observe(body);
  }

  setOpen(false);
  timer = setTimeout(() => { timer = null; setOpen(true); }, 4500);
})();

/* ── Platform panel: hover to open, one category open at a time ──── */
const rail = $('rail');
let railT;
rail.addEventListener('mouseenter', () => {
  clearTimeout(railT); railT = setTimeout(() => rail.classList.add('is-open'), 140);
});
rail.addEventListener('mouseleave', () => {
  clearTimeout(railT); railT = setTimeout(() => rail.classList.remove('is-open'), 200);
});
$('railCollapse').addEventListener('click', (e) => {
  e.stopPropagation(); rail.classList.remove('is-open');
});
rail.querySelectorAll('.cq-rail-ghead[aria-expanded]').forEach((head) => {
  head.addEventListener('click', () => {
    const open = head.getAttribute('aria-expanded') === 'true';
    rail.querySelectorAll('.cq-rail-ghead[aria-expanded]').forEach((h) => h.setAttribute('aria-expanded', 'false'));
    head.setAttribute('aria-expanded', String(!open));
  });
});

/* ── Theme ──────────────────────────────────────────────────────── */
function applyMode(mode) {
  root.dataset.mode = mode;
  const dark = mode === 'dark';
  $('themeIcon').querySelector('use').setAttribute('href', dark ? '#ic-sun' : '#ic-moon');
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  $('themeToggle').setAttribute('title', label);
  $('themeToggle').setAttribute('aria-label', label);
}
$('themeToggle').addEventListener('click', () => {
  const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
  applyMode(next);
  try { localStorage.setItem('cq-theme', next); } catch (e) { /* private mode */ }
});
let stored = null;
try { stored = localStorage.getItem('cq-theme'); } catch (e) { /* private mode */ }
applyMode(stored === 'dark' ? 'dark' : 'light');
go('studio');
