/* ═══════════════════════════════════════════════════════════════════
   COGENTIQ DESIGN SYSTEM — shared behaviour
   Load with `defer`, BEFORE the page script.

   PLATFORM PANEL (left rail)
     - Hover opens it 68px -> 240px after a 140ms delay; leaving closes
       it after 200ms. The delays stop it flickering as the cursor
       crosses. Width transitions 260ms cubic-bezier(.4,0,.2,1).
     - Labels are laid out at full width the whole time and clipped by
       the rail, so opening never reflows a row.
     - The collapse button closes it immediately.
     - Category headers toggle on click, ONE OPEN AT A TIME. Chevron
       rotates 180deg over 220ms.

   THEME
     - The header toggle swaps data-mode on <html> and remembers the
       choice in localStorage under "cq-theme" (try/catch for private
       mode). Light is the default.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';
const $ = (id) => document.getElementById(id);
const root = document.documentElement;

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
