#!/usr/bin/env python3
"""Profile and Personal access tokens, built on the design system.

Both take checkpoints.html as their shell -- its tokens, the inlined
component library, its sprite and its header -- and put their own
content and behaviour under it. The platform panel and the shared
chrome are added afterwards by port-panel.py and inject-shell.py, the
same way every other page gets them.
"""
import pathlib, re

PAGES = pathlib.Path('/home/user/new-design/cogentiq')
T = (PAGES / 'checkpoints.html').read_text()

# ── the shell: everything before the page div, minus the panel bits the
#    port will put back, minus the checkpoints-only title/description ──
head = T[:T.index('<!-- ══ The page ══ -->')]
head = re.sub(r'<aside class="rail".*?</aside>\s*', '', head, flags=re.S)
head = re.sub(r'<div class="upsell" id="upsell".*?\n</div>\s*', '', head, flags=re.S)
head = re.sub(r'<!-- The big view.*?<div class="filmbox" id="filmBox".*?\n</div>\s*', '', head, flags=re.S)
assert 'aria-label="Platform"' not in head and 'id="filmBox"' not in head

header = re.search(r'<header class="cq-page__header">.*?</header>', T, re.S).group(0)
AVATAR = re.search(r'class="hdr-avatar" src="(data:[^"]+)"', T).group(1)
has_i_moon = 'id="i-moon"' in head
SUN, MOON = ('#i-sun', '#i-moon') if has_i_moon else ('#ic-sun', '#ic-moon')

def page(title, desc, header_title, header_sub, css, body, js):
    h = head
    h = re.sub(r'<title>[^<]*</title>', f'<title>{title}</title>', h, count=1)
    h = re.sub(r'(<meta name="description" content=")[^"]*(")', r'\g<1>' + desc + r'\2', h, count=1)
    hd = re.sub(r'<div class="hdr-left">.*?</div>',
                f'<div class="hdr-left"><span class="cq-subhead2-med">{header_title}</span>'
                f'<span class="hdr-sub cq-caption-reg">{header_sub}</span></div>', header, count=1, flags=re.S)
    return (h + '\n<style>\n' + CSS_COMMON + css + '\n</style>\n\n<!-- ══ The page ══ -->\n'
            '<div class="cq-page">\n  <div class="cq-page__main">\n    <div class="cq-page__frame">\n\n'
            + hd + '\n\n      <div class="cq-page__body">\n        <section class="cq-page__col">\n'
            + body + '\n        </section>\n      </div>\n    </div>\n  </div>\n</div>\n\n<script>\n'
            + JS_COMMON + js + '\n</script>\n</body>\n</html>\n')

CSS_COMMON = '''
/* ── Header: a title and one line under it, as the catalogue pages do ── */
.hdr-left { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.hdr-left .cq-subhead2-med { color: var(--text-primary); white-space: nowrap; }
.hdr-sub { color: var(--text-teritiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Badge tones the library does not ship. Same recipe as its own:
      a tinted fill, a stroke a step stronger, ink mixed toward the text
      colour so it reads on both grounds. ── */
.cq-badge[data-tone="red"]    { background: color-mix(in srgb, var(--red-500) 13%, transparent);    border-color: color-mix(in srgb, var(--red-500) 42%, transparent);    color: color-mix(in srgb, var(--red-500) 78%, var(--text-primary)); }
.cq-badge[data-tone="orange"] { background: color-mix(in srgb, var(--orange-500) 14%, transparent); border-color: color-mix(in srgb, var(--orange-500) 45%, transparent); color: color-mix(in srgb, var(--orange-600) 78%, var(--text-primary)); }
.cq-badge[data-tone="grey"]   { background: var(--backgrounds-card-bg-4); border-color: var(--strokes-line-1); color: var(--text-secondary); }

/* ── Text input, on the search field's own tokens ── */
.ac-input {
  display: flex; align-items: center; height: 36px; padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--backgrounds-type-search-default);
  border: 1px solid var(--strokes-type-default, var(--strokes-line-1));
  color: var(--text-primary);
}
.ac-input:focus-within { border-color: var(--strokes-type-focus, var(--backgrounds-button-primary)); }
.ac-input input { flex: 1 1 auto; min-width: 0; background: none; border: 0; outline: 0; color: inherit; font: inherit; }
.ac-input input::placeholder { color: var(--text-teritiary); }
.ac-input.is-mono input { font: 400 var(--fs-body-3)/var(--lh-body-3) var(--font-geist-mono, ui-monospace, monospace); }

/* ── Cards ── */
.ac-card {
  background: var(--backgrounds-card-bg-5); border: 1px solid var(--strokes-line-3);
  border-radius: var(--radius-lg); overflow: hidden;
}
.ac-card__head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px; border-bottom: 1px solid var(--strokes-line-3);
}
.ac-card__head .cq-body1-med { color: var(--text-primary); }
.ac-card__sub { color: var(--text-teritiary); }

/* ── Modal on the library's scrim ── */
.cq-modal.ac-modal { width: 480px; max-width: calc(100vw - 48px); }
.ac-modal__body { display: flex; flex-direction: column; gap: 16px; padding: 16px; overflow: auto; }
.ac-modal__body[hidden], .ac-modal [hidden] { display: none !important; }
.cq-modal.ac-modal { max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.ac-modal__body .cq-field__label { color: var(--text-secondary); }
.ac-help { color: var(--text-teritiary); }
.ac-choice {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
  border-radius: var(--radius-md); border: 1px solid var(--strokes-line-3);
  background: var(--backgrounds-card-bg-5); cursor: pointer; text-align: left; width: 100%;
}
.ac-choice:hover { border-color: var(--strokes-line-1); }
.ac-choice.is-on { border-color: var(--strokes-card-selected); background: var(--backgrounds-table-select); }
.ac-choice .cq-checkbox { margin-top: 1px; }
.ac-choice__t { color: var(--text-primary); }
.ac-choice__d { color: var(--text-teritiary); }
.ac-choices { display: flex; flex-direction: column; gap: 8px; }
.ac-danger.cq-btn--primary { background: var(--red-500); }
.ac-danger.cq-btn--primary:hover:not(:disabled) { background: var(--red-600); }

/* ── The token, shown once ── */
.ac-reveal {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  border-radius: var(--radius-md); border: 1px dashed var(--strokes-card-selected);
  background: var(--backgrounds-table-select);
  font: 400 var(--fs-body-3)/var(--lh-body-3) var(--font-geist-mono, ui-monospace, monospace);
  color: var(--text-primary); word-break: break-all;
}
.ac-reveal code { flex: 1 1 auto; min-width: 0; }
.ac-mono { font: 400 var(--fs-body-3)/var(--lh-body-3) var(--font-geist-mono, ui-monospace, monospace); }
.ac-toast {
  position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 8px); z-index: 300;
  padding: 8px 14px; border-radius: var(--radius-md);
  background: var(--backgrounds-card-bg-3); border: 1px solid var(--strokes-card-default);
  color: var(--text-primary); box-shadow: var(--shadow-pop); opacity: 0;
  font: 400 var(--fs-body-2)/var(--lh-body-2) var(--font-geist, inherit);
  transition: opacity .16s ease, transform .16s ease; pointer-events: none;
}
.ac-toast.is-on { opacity: 1; transform: translate(-50%, 0); }
'''

JS_COMMON = '''
const root = document.documentElement;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ── Theme, the same contract every page keeps: data-mode on <html>,
      the header toggle flips it, the shared chrome reads it. ── */
function applyMode(mode) {
  root.dataset.mode = mode;
  const dark = mode !== 'light';
  const use = document.querySelector('#themeToggle use');
  if (use) use.setAttribute('href', dark ? '__SUN__' : '__MOON__');
  const t = $('themeToggle');
  if (t) { t.title = dark ? 'Switch to light mode' : 'Switch to dark mode'; t.setAttribute('aria-label', t.title); }
}
$('themeToggle').addEventListener('click', () => {
  const next = root.dataset.mode === 'light' ? 'dark' : 'light';
  applyMode(next);
  try { localStorage.setItem('cq-theme', next); } catch (e) {}
});
let stored = null;
try { stored = localStorage.getItem('cq-theme'); } catch (e) {}
applyMode(stored === 'light' ? 'light' : 'dark');

/* Going to another page: inside the shell that is a message, standalone
   it is a link -- the same rule the shared chrome follows. */
function go(url) {
  if (window.parent !== window) parent.postMessage({ cqNav: url }, '*');
  else location.href = url;
}
let toastT;
function toast(msg) {
  let el = $('acToast');
  if (!el) { el = document.createElement('div'); el.id = 'acToast'; el.className = 'ac-toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), 1800);
}
function openScrim(id) { $(id).classList.add('is-open'); }
function closeScrim(id) { $(id).classList.remove('is-open'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.cq-scrim.is-open').forEach(s => s.classList.remove('is-open'));
});
document.querySelectorAll('.cq-scrim').forEach(s => s.addEventListener('click', e => { if (e.target === s) s.classList.remove('is-open'); }));
'''.replace('__SUN__', SUN).replace('__MOON__', MOON)

ICON = dict(
 plus='<svg class=\"cq-ic\" width=\"20\" height=\"20\" viewBox="0 0 20 20" fill="none"><path d="M10 4.5v11M4.5 10h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
 pencil='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m11.3 2.6 2.1 2.1-7.9 7.9H3.4v-2.1l7.9-7.9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="m9.7 4.2 2.1 2.1" stroke="currentColor" stroke-width="1.4"/></svg>',
 trash='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.3h10M6.2 4.3V2.9h3.6v1.4M4.2 4.3l.6 8.2c0 .5.4.9.9.9h4.6c.5 0 .9-.4.9-.9l.6-8.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 tick='<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 4.9 8.6 9.5 3.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 chevL='<svg class=\"cq-ic\" width=\"16\" height=\"16\" viewBox="0 0 16 16" fill="none"><path d="m9.8 3.5-4.3 4.5 4.3 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 chevR='<svg class=\"cq-ic\" width=\"16\" height=\"16\" viewBox="0 0 16 16" fill="none"><path d="m6.2 3.5 4.3 4.5-4.3 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 copy='<svg class=\"cq-ic\" width=\"16\" height=\"16\" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 5.5V3.9a1.4 1.4 0 0 0-1.4-1.4H3.9a1.4 1.4 0 0 0-1.4 1.4v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6" stroke="currentColor" stroke-width="1.4"/></svg>',
 x='<svg class=\"cq-ic\" width=\"20\" height=\"20\" viewBox="0 0 20 20" fill="none"><path d="m5.5 5.5 9 9m0-9-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
 search='<svg class=\"cq-ic\" width=\"20\" height=\"20\" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="m13.2 13.2 3.3 3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
 key='<svg class=\"cq-ic\" width=\"20\" height=\"20\" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="13" r="3.8" stroke="currentColor" stroke-width="1.5"/><path d="m9.9 10.1 6.9-6.9M14 5.3l2.1 2.1M12 7.3l2.1 2.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 arrow='<svg class=\"cq-ic\" width=\"16\" height=\"16\" viewBox="0 0 16 16" fill="none"><path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
)

# ═════════════════════════════════════════════════════════════════════
#  Personal access tokens
# ═════════════════════════════════════════════════════════════════════
PAT_CSS = '''
.pt-bar { display: flex; align-items: center; gap: 12px; }
.pt-bar .cq-search { width: 300px; }
.pt-bar__spacer { flex: 1 1 auto; }
.pt-sel { display: none; align-items: center; gap: 8px; color: var(--text-secondary); }
.pt-sel.is-on { display: flex; }
.pt-sel .cq-btn--ghost.is-danger { color: color-mix(in srgb, var(--red-500) 80%, var(--text-primary)); }

.cq-table.pt-table { --cq-cols: 44px minmax(190px, 1.2fr) 222px minmax(170px, 1fr) 176px 124px 84px; margin-top: 16px; }
.pt-table .cq-thead > .cq-cell--check,
.pt-table .cq-row  > .cq-cell--check { padding: 12px 0 12px 14px; justify-content: flex-start; }
.pt-table .cq-thead > * { text-align: left; }
.pt-table .cq-row { height: 64px; cursor: default; }
.pt-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pt-name .cq-body2-med { color: var(--text-primary); }
.pt-name .cq-caption-reg { color: var(--text-teritiary); }
.pt-token { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: var(--radius-sm);
  background: var(--backgrounds-page-bg-3); border: 1px solid var(--strokes-line-3); color: var(--text-secondary); }
.pt-scopes { display: flex; flex-wrap: wrap; gap: 4px; }
.pt-dates { display: flex; flex-direction: column; gap: 2px; }
.pt-dates .cq-body2-reg { color: var(--text-primary); }
.pt-dates .cq-caption-reg { color: var(--text-teritiary); }
.pt-acts { display: flex; align-items: center; gap: 2px; justify-content: flex-end; padding-right: 8px; }
.pt-acts .cq-icon-btn { opacity: .55; }
.cq-row:hover .pt-acts .cq-icon-btn { opacity: 1; }
.pt-acts .is-danger:hover { color: color-mix(in srgb, var(--red-500) 80%, var(--text-primary)); }
.pt-row-revoked .pt-name .cq-body2-med, .pt-row-revoked .pt-token { text-decoration: line-through; text-decoration-color: var(--text-teritiary); }
.pt-row-revoked .pt-scopes .cq-badge { opacity: .55; }

.pt-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 4px 0; color: var(--text-teritiary); }
.pt-foot__nav { display: flex; align-items: center; gap: 4px; }
.pt-empty { padding: 48px 16px; text-align: center; color: var(--text-teritiary); }

.pt-exp { display: flex; gap: 6px; flex-wrap: wrap; }
.pt-exp .cq-btn { height: 30px; }
.pt-exp .cq-btn.is-on { background: var(--backgrounds-button-tonal-1); color: var(--text-button-tonal-1); box-shadow: none; }
'''

PAT_BODY = '''
          <div class="cq-page__content cq-scroll-y">

            <div class="pt-bar">
              <label class="cq-search">''' + ICON['search'] + '''
                <input id="ptQ" class="cq-body2-reg" type="search" placeholder="Search tokens" aria-label="Search tokens" />
              </label>
              <div class="pt-sel" id="ptSel">
                <span class="cq-body2-reg" id="ptSelCount">0 selected</span>
                <button class="cq-btn cq-btn--m cq-btn--ghost" id="ptRevokeSel" type="button">Revoke</button>
                <button class="cq-btn cq-btn--m cq-btn--ghost is-danger" id="ptDeleteSel" type="button">Delete</button>
              </div>
              <div class="pt-bar__spacer"></div>
              <button class="cq-btn cq-btn--m cq-btn--primary" id="ptNew" type="button">''' + ICON['plus'] + '''New token</button>
            </div>

            <div class="cq-table pt-table" role="table" aria-label="Personal access tokens">
              <div class="cq-thead" role="row">
                <div class="cq-cell cq-cell--check"><span class="cq-checkbox" id="ptAll" role="checkbox" aria-checked="false" tabindex="0" aria-label="Select all on this page">''' + ICON['tick'] + '''</span></div>
                <div>Name</div>
                <div>Token</div>
                <div>Scopes</div>
                <div>Created / expires</div>
                <div>Status</div>
                <div></div>
              </div>
              <div id="ptRows"></div>
            </div>

            <div class="pt-foot">
              <span class="cq-caption-reg" id="ptRange">1–10 of 24</span>
              <div class="pt-foot__nav">
                <button class="cq-btn cq-btn--s cq-btn--icon cq-btn--ghost" id="ptPrev" type="button" aria-label="Previous page">''' + ICON['chevL'] + '''</button>
                <button class="cq-btn cq-btn--s cq-btn--icon cq-btn--ghost" id="ptNext" type="button" aria-label="Next page">''' + ICON['chevR'] + '''</button>
              </div>
            </div>

          </div>

<!-- ── New / edit token ── -->
<div class="cq-scrim" id="ptDlg" role="dialog" aria-modal="true" aria-labelledby="ptDlgTitle">
  <div class="cq-modal ac-modal">
    <div class="cq-modal__head">
      <span class="cq-body1-med" id="ptDlgTitle">New token</span>
      <button class="cq-icon-btn" type="button" data-close="ptDlg" aria-label="Close">''' + ICON['x'] + '''</button>
    </div>
    <div class="ac-modal__body" id="ptForm">
      <label class="cq-field">
        <span class="cq-field__label cq-body2-reg">Name</span>
        <span class="ac-input"><input id="ptName" class="cq-body2-reg" type="text" placeholder="What will use this token?" maxlength="60" /></span>
        <span class="ac-help cq-caption-reg">Shown in this list only. Pick something you will recognise later.</span>
      </label>
      <div class="cq-field">
        <span class="cq-field__label cq-body2-reg">Expiration</span>
        <div class="pt-exp" id="ptExp">
          <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-days="30">30 days</button>
          <button class="cq-btn cq-btn--s cq-btn--outline is-on" type="button" data-days="90">90 days</button>
          <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-days="180">180 days</button>
          <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-days="365">1 year</button>
          <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-days="0">No expiry</button>
        </div>
        <span class="ac-help cq-caption-reg" id="ptExpNote"></span>
      </div>
      <div class="cq-field">
        <span class="cq-field__label cq-body2-reg">Scopes</span>
        <div class="ac-choices" id="ptScopes"></div>
      </div>
    </div>
    <div class="ac-modal__body" id="ptDone" hidden>
      <p class="cq-body2-reg" style="margin:0;color:var(--text-secondary)">Copy it now. For your security it is shown once and cannot be recovered — you can always create another.</p>
      <div class="ac-reveal"><code id="ptRevealed"></code>
        <button class="cq-btn cq-btn--s cq-btn--tonal-1" id="ptCopy" type="button">''' + ICON['copy'] + '''Copy</button></div>
    </div>
    <div class="cq-modal__foot">
      <button class="cq-btn cq-btn--m cq-btn--ghost" type="button" data-close="ptDlg" id="ptCancel">Cancel</button>
      <button class="cq-btn cq-btn--m cq-btn--primary" type="button" id="ptSave">Create token</button>
    </div>
  </div>
</div>

<!-- ── Delete ── -->
<div class="cq-scrim" id="ptDel" role="dialog" aria-modal="true" aria-labelledby="ptDelTitle">
  <div class="cq-modal ac-modal" style="width:420px">
    <div class="cq-modal__head"><span class="cq-body1-med" id="ptDelTitle">Delete token</span>
      <button class="cq-icon-btn" type="button" data-close="ptDel" aria-label="Close">''' + ICON['x'] + '''</button></div>
    <div class="ac-modal__body"><p class="cq-body2-reg" id="ptDelBody" style="margin:0;color:var(--text-secondary)"></p></div>
    <div class="cq-modal__foot">
      <button class="cq-btn cq-btn--m cq-btn--ghost" type="button" data-close="ptDel">Cancel</button>
      <button class="cq-btn cq-btn--m cq-btn--primary ac-danger" type="button" id="ptDelGo">Delete</button>
    </div>
  </div>
</div>
'''

PAT_JS = r'''
/* ── Data. Dates are relative to today so the statuses stay true. ── */
const DAY = 86400000, NOW = Date.now();
const SCOPES = [
  ['read',   'Read',   'Read models, skills, integrations and documents'],
  ['write',  'Write',  'Create and change anything read allows'],
  ['run',    'Run',    'Start automations and talk to assistants'],
  ['deploy', 'Deploy', 'Publish assistants and automations'],
  ['admin',  'Admin',  'Manage workspace members and settings'],
];
const TONE = { read: 'blue', write: 'indigo', run: 'cyan', deploy: 'green', admin: 'orange' };
const seeds = [
  ['CI deploy',           -212, 153,  ['read','write','deploy']],
  ['Local dev',           -44,  46,   ['read','write','run']],
  ['Notebook sync',       -180, 9,    ['read']],
  ['Slack alerts',        -300, -35,  ['read','run']],
  ['Data warehouse pull', -8,   82,   ['read']],
  ['Staging smoke tests', -120, 245,  ['read','run']],
  ['Old laptop',          -400, -190, ['read','write'], 'revoked'],
  ['Grafana',             -60,  305,  ['read']],
  ['Release bot',         -95,  0,    ['read','write','deploy','admin']],
  ['Design QA',           -21,  69,   ['read','run']],
  ['Migration script',    -3,   27,   ['read','write']],
  ['Support console',     -260, 12,   ['read','run']],
  ['Airflow',             -140, 225,  ['read','write','run']],
  ['Contractor · Priya',  -30,  -2,   ['read'], 'revoked'],
  ['Weekly digest',       -75,  290,  ['read']],
  ['Playwright e2e',      -18,  72,   ['read','run','deploy']],
  ['Postman',             -330, -120, ['read','write']],
  ['Zapier',              -50,  315,  ['read','run']],
  ['Backup job',          -200, 165,  ['read']],
  ['Field demo iPad',     -12,  6,    ['read','run']],
  ['dbt runner',          -88,  277,  ['read','write']],
  ['Intern · Marco',      -110, -60,  ['read']],
  ['Vercel preview',      -6,   84,   ['read','deploy']],
  ['Audit export',        -365, -1,   ['read','admin']],
];
const B62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const rnd = n => Array.from({ length: n }, () => B62[Math.floor(Math.random() * 62)]).join('');
let tokens = seeds.map((s, i) => ({
  id: 't' + (i + 1), name: s[0],
  created: NOW + s[1] * DAY,
  expires: s[2] === 0 ? null : NOW + s[2] * DAY,
  scopes: s[3], revoked: s[4] === 'revoked',
  mask: 'kcpat.' + rnd(3) + '******' + rnd(4),
}));

const fmt = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
function status(t) {
  if (t.revoked) return ['Revoked', 'red'];
  if (t.expires === null) return ['Active', 'green'];
  const d = Math.ceil((t.expires - NOW) / DAY);
  if (d < 0) return ['Expired', 'grey'];
  if (d <= 14) return ['Expiring soon', 'orange'];
  return ['Active', 'green'];
}
function expiresLine(t) {
  if (t.expires === null) return 'No expiry';
  const d = Math.ceil((t.expires - NOW) / DAY);
  if (d < 0) return `Expired ${fmt(t.expires)}`;
  if (d === 0) return 'Expires today';
  return `Expires ${fmt(t.expires)} · ${d}d`;
}

/* ── List: search, paging, selection ── */
const PAGE = 10;
let q = '', pageNo = 0, selected = new Set();
const visible = () => tokens.filter(t => !q || t.name.toLowerCase().includes(q));
function render() {
  const all = visible();
  const pages = Math.max(1, Math.ceil(all.length / PAGE));
  pageNo = Math.min(pageNo, pages - 1);
  const slice = all.slice(pageNo * PAGE, pageNo * PAGE + PAGE);
  $('ptRows').innerHTML = slice.length ? slice.map(t => {
    const [label, tone] = status(t);
    return `<div class="cq-row${selected.has(t.id) ? ' is-selected' : ''}${t.revoked ? ' pt-row-revoked' : ''}" role="row" data-id="${t.id}">
      <div class="cq-cell cq-cell--check"><span class="cq-checkbox${selected.has(t.id) ? ' is-checked' : ''}" role="checkbox" aria-checked="${selected.has(t.id)}" tabindex="0" data-sel="${t.id}" aria-label="Select ${esc(t.name)}">__TICK__</span></div>
      <div class="cq-cell"><div class="pt-name"><span class="cq-body2-med cq-truncate">${esc(t.name)}</span><span class="cq-caption-reg cq-truncate">${t.scopes.length} scope${t.scopes.length === 1 ? '' : 's'}</span></div></div>
      <div class="cq-cell"><span class="pt-token ac-mono cq-caption-reg">${t.mask}</span></div>
      <div class="cq-cell"><div class="pt-scopes">${t.scopes.map(s => `<span class="cq-badge cq-caption-med" data-tone="${TONE[s]}">${s}</span>`).join('')}</div></div>
      <div class="cq-cell"><div class="pt-dates"><span class="cq-body2-reg">Created ${fmt(t.created)}</span><span class="cq-caption-reg">${expiresLine(t)}</span></div></div>
      <div class="cq-cell"><span class="cq-badge cq-caption-med" data-tone="${tone}">${label}</span></div>
      <div class="cq-cell pt-acts">
        <button class="cq-icon-btn cq-icon-btn--sm" type="button" data-edit="${t.id}" title="Edit" aria-label="Edit ${esc(t.name)}">__PENCIL__</button>
        <button class="cq-icon-btn cq-icon-btn--sm is-danger" type="button" data-del="${t.id}" title="Delete" aria-label="Delete ${esc(t.name)}">__TRASH__</button>
      </div>
    </div>`;
  }).join('') : `<div class="pt-empty cq-body2-reg">No tokens match “${esc(q)}”.</div>`;
  const a = all.length ? pageNo * PAGE + 1 : 0, b = Math.min(all.length, (pageNo + 1) * PAGE);
  $('ptRange').textContent = `${a}–${b} of ${all.length}`;
  $('ptPrev').disabled = pageNo === 0;
  $('ptNext').disabled = pageNo >= pages - 1;
  const onPage = slice.filter(t => selected.has(t.id)).length;
  $('ptAll').classList.toggle('is-checked', slice.length > 0 && onPage === slice.length);
  $('ptAll').setAttribute('aria-checked', String(slice.length > 0 && onPage === slice.length));
  $('ptSel').classList.toggle('is-on', selected.size > 0);
  $('ptSelCount').textContent = `${selected.size} selected`;
}
$('ptQ').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); pageNo = 0; render(); });
$('ptPrev').addEventListener('click', () => { pageNo--; render(); });
$('ptNext').addEventListener('click', () => { pageNo++; render(); });
$('ptAll').addEventListener('click', () => {
  const slice = visible().slice(pageNo * PAGE, pageNo * PAGE + PAGE);
  const every = slice.every(t => selected.has(t.id));
  slice.forEach(t => every ? selected.delete(t.id) : selected.add(t.id));
  render();
});
$('ptRows').addEventListener('click', e => {
  const sel = e.target.closest('[data-sel]');
  if (sel) { const id = sel.dataset.sel; selected.has(id) ? selected.delete(id) : selected.add(id); render(); return; }
  const ed = e.target.closest('[data-edit]'); if (ed) return openEdit(ed.dataset.edit);
  const de = e.target.closest('[data-del]'); if (de) return openDelete([de.dataset.del]);
});
$('ptRows').addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && e.target.matches('[data-sel]')) { e.preventDefault(); e.target.click(); }
});
$('ptAll').addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); $('ptAll').click(); } });
$('ptRevokeSel').addEventListener('click', () => {
  tokens.forEach(t => { if (selected.has(t.id)) t.revoked = true; });
  toast(`${selected.size} token${selected.size === 1 ? '' : 's'} revoked`); selected.clear(); render();
});
$('ptDeleteSel').addEventListener('click', () => openDelete([...selected]));

/* ── Create / edit ── */
let editing = null, expDays = 90, chosen = new Set(['read']);
function paintScopes() {
  $('ptScopes').innerHTML = SCOPES.map(([k, t, d]) => `
    <button class="ac-choice${chosen.has(k) ? ' is-on' : ''}" type="button" data-scope="${k}" role="checkbox" aria-checked="${chosen.has(k)}">
      <span class="cq-checkbox${chosen.has(k) ? ' is-checked' : ''}">__TICK__</span>
      <span><span class="ac-choice__t cq-body2-med">${t}</span><br><span class="ac-choice__d cq-caption-reg">${d}</span></span>
    </button>`).join('');
}
function paintExp() {
  $('ptExp').querySelectorAll('[data-days]').forEach(b => b.classList.toggle('is-on', +b.dataset.days === expDays));
  $('ptExpNote').textContent = expDays ? `The token stops working on ${fmt(NOW + expDays * DAY)}.` : 'The token works until you revoke it. Prefer an expiry for anything shared.';
}
function openDialog(title, saveLabel) {
  $('ptDlgTitle').textContent = title; $('ptSave').textContent = saveLabel;
  $('ptForm').hidden = false; $('ptDone').hidden = true; $('ptSave').hidden = false; $('ptCancel').textContent = 'Cancel';
  paintScopes(); paintExp(); openScrim('ptDlg'); setTimeout(() => $('ptName').focus(), 30);
}
$('ptNew').addEventListener('click', () => { editing = null; $('ptName').value = ''; expDays = 90; chosen = new Set(['read']); openDialog('New token', 'Create token'); });
function openEdit(id) {
  const t = tokens.find(x => x.id === id); if (!t) return;
  editing = t; $('ptName').value = t.name; chosen = new Set(t.scopes);
  expDays = t.expires === null ? 0 : Math.max(30, Math.ceil((t.expires - t.created) / DAY));
  if (![30, 90, 180, 365, 0].includes(expDays)) expDays = 90;
  openDialog('Edit token', 'Save changes');
}
$('ptExp').addEventListener('click', e => { const b = e.target.closest('[data-days]'); if (b) { expDays = +b.dataset.days; paintExp(); } });
$('ptScopes').addEventListener('click', e => {
  const b = e.target.closest('[data-scope]'); if (!b) return;
  const k = b.dataset.scope; chosen.has(k) ? chosen.delete(k) : chosen.add(k);
  if (!chosen.size) chosen.add('read');           /* a token with no scope does nothing */
  paintScopes();
});
$('ptSave').addEventListener('click', () => {
  const name = $('ptName').value.trim();
  if (!name) { $('ptName').focus(); $('ptName').closest('.ac-input').style.borderColor = 'var(--red-500)'; return; }
  $('ptName').closest('.ac-input').style.borderColor = '';
  if (editing) {
    editing.name = name; editing.scopes = SCOPES.map(s => s[0]).filter(k => chosen.has(k));
    editing.expires = expDays ? editing.created + expDays * DAY : null;
    closeScrim('ptDlg'); toast('Token updated'); render(); return;
  }
  const t = { id: 't' + Date.now(), name, created: NOW, expires: expDays ? NOW + expDays * DAY : null,
              scopes: SCOPES.map(s => s[0]).filter(k => chosen.has(k)), revoked: false, mask: '' };
  const full = 'kcpat.' + rnd(40);
  t.mask = full.slice(0, 9) + '******' + full.slice(-4);
  tokens.unshift(t); q = ''; $('ptQ').value = ''; pageNo = 0; render();
  $('ptForm').hidden = true; $('ptDone').hidden = false; $('ptSave').hidden = true;
  $('ptDlgTitle').textContent = 'Token created'; $('ptCancel').textContent = 'Done';
  $('ptRevealed').textContent = full;
});
$('ptCopy').addEventListener('click', () => {
  const v = $('ptRevealed').textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Copied'), () => toast('Select the token and copy it'));
});

/* ── Delete ── */
let pending = [];
function openDelete(ids) {
  pending = ids; const names = ids.map(id => (tokens.find(t => t.id === id) || {}).name).filter(Boolean);
  $('ptDelBody').textContent = ids.length === 1
    ? `Delete “${names[0]}”? Anything still using it will stop working immediately. This cannot be undone.`
    : `Delete ${ids.length} tokens? Anything still using them will stop working immediately. This cannot be undone.`;
  openScrim('ptDel');
}
$('ptDelGo').addEventListener('click', () => {
  tokens = tokens.filter(t => !pending.includes(t.id)); pending.forEach(id => selected.delete(id));
  closeScrim('ptDel'); toast(pending.length === 1 ? 'Token deleted' : `${pending.length} tokens deleted`); pending = []; render();
});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeScrim(b.dataset.close)));
render();
'''.replace('__TICK__', ICON['tick']).replace('__PENCIL__', ICON['pencil']).replace('__TRASH__', ICON['trash'])

# ═════════════════════════════════════════════════════════════════════
#  Profile
# ═════════════════════════════════════════════════════════════════════
PROF_CSS = '''
.pf-wrap { display: flex; flex-direction: column; gap: 16px; }
.pf-id { display: flex; align-items: center; gap: 16px; padding: 20px; }
.pf-id img { width: 64px; height: 64px; border-radius: 50%; flex: none; }
.pf-id__who { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pf-id__name { color: var(--text-primary); }
.pf-id__mail { color: var(--text-secondary); }
.pf-id__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pf-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
.pf-kv { display: flex; flex-direction: column; gap: 3px; padding: 14px 16px; border-top: 1px solid var(--strokes-line-3); border-right: 1px solid var(--strokes-line-3); }
.pf-kv:nth-child(-n+4) { border-top: 0; }
.pf-kv:nth-child(4n) { border-right: 0; }
.pf-kv .cq-caption-reg { color: var(--text-teritiary); }
.pf-kv .cq-body2-reg { color: var(--text-primary); }
.pf-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--strokes-line-3); }
.pf-row:first-of-type { border-top: 0; }
.pf-row__ic { width: 32px; height: 32px; border-radius: var(--radius-md); flex: none; display: flex; align-items: center; justify-content: center;
  background: var(--backgrounds-card-bg-4); color: var(--text-secondary); }
.pf-row__ic .cq-ic { width: 18px; height: 18px; }
.pf-row__t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pf-row__t .cq-body2-med { color: var(--text-primary); }
.pf-row__t .cq-caption-reg { color: var(--text-teritiary); }
.pf-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* ── Workspaces: one row per membership, each with its own role ── */
.pf-ws .ac-card__head { flex-wrap: wrap; }
.pf-ws__legend { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 10px 16px; border-bottom: 1px solid var(--strokes-line-3); background: var(--backgrounds-page-bg-3); }
.pf-ws__legend span { display: inline-flex; align-items: center; gap: 6px; color: var(--text-teritiary); }
.cq-table.pf-ws-table { --cq-cols: minmax(240px, 1.5fr) minmax(210px, 1.1fr) 110px 140px 150px 128px; border: 0; border-radius: 0; }
.pf-ws-table .cq-thead > * { text-align: left; }
.pf-ws-table .cq-row { height: 64px; cursor: default; }
.pf-ws-table .cq-row.is-current { background: var(--backgrounds-table-select); }
.pf-ws-table .cq-cell:last-child { justify-content: flex-end; }
.ws-who { display: flex; align-items: center; gap: 12px; min-width: 0; }
.ws-mark { width: 32px; height: 32px; border-radius: var(--radius-md); flex: none; display: flex; align-items: center; justify-content: center;
  color: #fff; font: 500 var(--fs-body-2)/1 var(--font-inter, inherit); }
.ws-who__t, .ws-role { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ws-who__t .cq-body2-med { color: var(--text-primary); }
.ws-who__t .cq-caption-reg, .ws-role .cq-caption-reg, .ws-muted { color: var(--text-teritiary); }
.ws-role .cq-badge { align-self: flex-start; }
.pf-ws-table .cq-cell .cq-body2-reg { color: var(--text-primary); }
.ws-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-500); display: inline-block; margin-right: 6px; }
.ws-current { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); }
.ws-current .cq-ic { width: 16px; height: 16px; color: var(--green-500); }

@media (max-width: 1100px) { .pf-grid { grid-template-columns: repeat(2, 1fr); } .pf-kv:nth-child(-n+4) { border-top: 1px solid var(--strokes-line-3); } .pf-kv:nth-child(-n+2) { border-top: 0; } .pf-kv:nth-child(4n) { border-right: 1px solid var(--strokes-line-3); } .pf-kv:nth-child(2n) { border-right: 0; } }
@media (max-width: 900px) { .pf-two { grid-template-columns: 1fr; } }
'''

PROF_BODY = '''
          <div class="cq-page__content cq-scroll-y">
            <div class="pf-wrap">

              <section class="ac-card pf-id" aria-label="Who you are">
                <img src="''' + AVATAR + '''" alt="" />
                <div class="pf-id__who">
                  <span class="pf-id__name cq-subhead1-med" id="pfName">Savio Govindu</span>
                  <span class="pf-id__mail cq-body2-reg">savio.govindu@fractal.ai</span>
                  <div class="pf-id__tags" id="pfTags"></div>
                </div>
                <button class="cq-btn cq-btn--m cq-btn--tonal-1" id="pfEdit" type="button">''' + ICON['pencil'] + '''Edit profile</button>
              </section>

              <section class="ac-card" aria-label="About you">
                <div class="ac-card__head"><span class="cq-body1-med">About</span><span class="ac-card__sub cq-caption-reg">Shared with every workspace you belong to</span></div>
                <div class="pf-grid" id="pfGrid"></div>
              </section>

              <section class="ac-card pf-ws" aria-label="Your workspaces">
                <div class="ac-card__head"><span class="cq-body1-med">Workspaces</span><span class="ac-card__sub cq-caption-reg" id="pfWsSub"></span></div>
                <div class="pf-ws__legend cq-caption-reg" id="pfLegend"></div>
                <div class="cq-table pf-ws-table" role="table" aria-label="Workspaces you belong to">
                  <div class="cq-thead" role="row">
                    <div class="cq-cell cq-caption-reg">Workspace</div>
                    <div class="cq-cell cq-caption-reg">Your role</div>
                    <div class="cq-cell cq-caption-reg">Members</div>
                    <div class="cq-cell cq-caption-reg">Joined</div>
                    <div class="cq-cell cq-caption-reg">Last active</div>
                    <div class="cq-cell cq-caption-reg"></div>
                  </div>
                  <div id="pfWsRows"></div>
                </div>
              </section>

              <div class="pf-two">
                <section class="ac-card" aria-label="Security">
                  <div class="ac-card__head"><span class="cq-body1-med">Security</span></div>
                  <div class="pf-row"><span class="pf-row__ic"><svg class="cq-ic" viewBox="0 0 20 20" fill="none"><rect x="4" y="8.5" width="12" height="8" rx="1.6" stroke="currentColor" stroke-width="1.5"/><path d="M7 8.5V6.5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.5"/></svg></span>
                    <div class="pf-row__t"><span class="cq-body2-med">Password</span><span class="cq-caption-reg">Last changed 42 days ago</span></div>
                    <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-toast="Password change is not wired in this mockup">Change</button></div>
                  <div class="pf-row"><span class="pf-row__ic"><svg class="cq-ic" viewBox="0 0 20 20" fill="none"><path d="M10 2.8 4 5.2v4.6c0 3.6 2.6 6.4 6 7.4 3.4-1 6-3.8 6-7.4V5.2L10 2.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m7.4 10 1.8 1.8 3.4-3.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                    <div class="pf-row__t"><span class="cq-body2-med">Two-factor authentication</span><span class="cq-caption-reg">Authenticator app</span></div>
                    <span class="cq-badge cq-caption-med" data-tone="green">Enabled</span></div>
                  <div class="pf-row"><span class="pf-row__ic"><svg class="cq-ic" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="9.5" rx="1.6" stroke="currentColor" stroke-width="1.5"/><path d="M7 16.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
                    <div class="pf-row__t"><span class="cq-body2-med">Active sessions</span><span class="cq-caption-reg">3 devices · this one in Bengaluru</span></div>
                    <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-toast="Session list is not wired in this mockup">View</button></div>
                </section>

                <section class="ac-card" aria-label="Access">
                  <div class="ac-card__head"><span class="cq-body1-med">Access</span></div>
                  <div class="pf-row"><span class="pf-row__ic">''' + ICON['key'] + '''</span>
                    <div class="pf-row__t"><span class="cq-body2-med">Personal access tokens</span><span class="cq-caption-reg">19 active · 3 expiring soon · 2 revoked</span></div>
                    <button class="cq-btn cq-btn--s cq-btn--tonal-1" id="pfTokens" type="button">Manage''' + ICON['arrow'] + '''</button></div>
                  <div class="pf-row"><span class="pf-row__ic"><svg class="cq-ic" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 8h13M3.5 12h13M10 3c-2.2 2.2-2.2 11.8 0 14M10 3c2.2 2.2 2.2 11.8 0 14" stroke="currentColor" stroke-width="1.5"/></svg></span>
                    <div class="pf-row__t"><span class="cq-body2-med">Sign-in method</span><span class="cq-caption-reg">Single sign-on · fractal.ai</span></div>
                    <span class="cq-badge cq-caption-med" data-tone="blue">SSO</span></div>
                  <div class="pf-row"><span class="pf-row__ic"><svg class="cq-ic" viewBox="0 0 20 20" fill="none"><path d="M5 8.2a5 5 0 0 1 10 0v3.2l1.4 2.1H3.6L5 11.4V8.2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.2 16a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" stroke-width="1.5"/></svg></span>
                    <div class="pf-row__t"><span class="cq-body2-med">Notifications</span><span class="cq-caption-reg">Email digest daily · in-app for mentions</span></div>
                    <button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-toast="Notification settings are not wired in this mockup">Edit</button></div>
                </section>
              </div>

            </div>
          </div>

<div class="cq-scrim" id="pfDlg" role="dialog" aria-modal="true" aria-labelledby="pfDlgTitle">
  <div class="cq-modal ac-modal">
    <div class="cq-modal__head"><span class="cq-body1-med" id="pfDlgTitle">Edit profile</span>
      <button class="cq-icon-btn" type="button" data-close="pfDlg" aria-label="Close">''' + ICON['x'] + '''</button></div>
    <div class="ac-modal__body" id="pfForm"></div>
    <div class="cq-modal__foot">
      <button class="cq-btn cq-btn--m cq-btn--ghost" type="button" data-close="pfDlg">Cancel</button>
      <button class="cq-btn cq-btn--m cq-btn--primary" type="button" id="pfSave">Save changes</button>
    </div>
  </div>
</div>
'''

PROF_JS = r'''
const me = {
  name: 'Savio Govindu', email: 'savio.govindu@fractal.ai', title: 'Product designer', team: 'Design',
  location: 'Bengaluru, India', tz: 'Asia/Kolkata (GMT+5:30)', lang: 'English (UK)', since: 'March 2025',
};
const FIELDS = [
  ['name', 'Full name', true], ['email', 'Email', false], ['title', 'Job title', true], ['team', 'Team', true],
  ['location', 'Location', true], ['tz', 'Time zone', true], ['lang', 'Language', true], ['since', 'Member since', false],
];
// Roles are per workspace: the same person is an admin in one and a
// viewer in another. Each role says what it lets you do.
const ROLES = {
  Admin:  { tone: 'orange', can: 'Manage members, billing and settings' },
  Editor: { tone: 'indigo', can: 'Create and edit anything in the workspace' },
  Member: { tone: 'blue',   can: 'Use and run what the workspace shares' },
  Viewer: { tone: 'grey',   can: 'Read only' },
};
const WS = [
  { id: 'marketing', name: 'Marketing',        about: 'Campaign assistants and content automations', role: 'Member', members: 42, joined: 'Jan 2026', active: 'Today',        hue: '#7c5cff' },
  { id: 'finance',   name: 'Finance',          about: 'Close, forecasting and spend analysis',       role: 'Admin',  members: 18, joined: 'Mar 2025', active: 'Yesterday',    hue: '#2f7bff' },
  { id: 'design',    name: 'Design systems',   about: 'Tokens, components and review bots',         role: 'Editor', members: 9,  joined: 'Sept 2025', active: '3 days ago',  hue: '#e8632b' },
  { id: 'cs',        name: 'Customer success', about: 'Support triage and renewal playbooks',       role: 'Admin',  members: 23, joined: 'Nov 2025', active: 'Last week',    hue: '#159f7a' },
  { id: 'data',      name: 'Data platform',    about: 'Warehouse models and pipeline monitors',     role: 'Viewer', members: 64, joined: 'Jun 2026', active: '2 weeks ago',  hue: '#0aa2c0' },
];
let current = 'marketing';

function paintWs() {
  $('pfWsRows').innerHTML = WS.map(w => `<div class="cq-row${w.id === current ? ' is-current' : ''}" role="row" data-id="${w.id}">
    <div class="cq-cell"><div class="ws-who"><span class="ws-mark" style="background:${w.hue}">${w.name[0]}</span>
      <div class="ws-who__t"><span class="cq-body2-med cq-truncate">${esc(w.name)}</span><span class="cq-caption-reg cq-truncate">${esc(w.about)}</span></div></div></div>
    <div class="cq-cell"><div class="ws-role"><span class="cq-badge cq-caption-med" data-tone="${ROLES[w.role].tone}">${w.role}</span><span class="cq-caption-reg cq-truncate">${ROLES[w.role].can}</span></div></div>
    <div class="cq-cell"><span class="cq-body2-reg">${w.members}</span></div>
    <div class="cq-cell"><span class="cq-body2-reg">${w.joined}</span></div>
    <div class="cq-cell"><span class="cq-body2-reg">${w.id === current ? '<span class="ws-dot"></span>Now' : w.active}</span></div>
    <div class="cq-cell">${w.id === current
      ? '<span class="ws-current cq-caption-med">__TICK__ Current</span>'
      : `<button class="cq-btn cq-btn--s cq-btn--outline" type="button" data-switch="${w.id}">Switch</button>`}</div>
  </div>`).join('');
  const byRole = {};
  WS.forEach(w => { byRole[w.role] = (byRole[w.role] || 0) + 1; });
  const adminIn = byRole.Admin || 0;
  $('pfWsSub').textContent = `${WS.length} workspaces · admin in ${adminIn} · roles are set by each workspace's admins`;
  $('pfLegend').innerHTML = Object.entries(ROLES).map(([r, d]) => `<span><span class="cq-badge cq-caption-med" data-tone="${d.tone}">${r}</span>${d.can}</span>`).join('');
  $('pfTags').innerHTML = `<span class="cq-badge cq-caption-med" data-tone="blue">${WS.length} workspaces</span>`
    + Object.keys(ROLES).filter(r => byRole[r]).map(r => `<span class="cq-badge cq-caption-med" data-tone="${ROLES[r].tone}">${r} in ${byRole[r]}</span>`).join('');
  document.querySelectorAll('[data-switch]').forEach(b => b.addEventListener('click', () => switchTo(b.dataset.switch)));
}
function switchTo(id) {
  current = id;
  const w = WS.find(x => x.id === id);
  const pill = document.querySelector('.ws-pill');
  if (pill) { const a = pill.querySelector('.cq-avatar'); const n = pill.querySelector('.cq-body2-reg'); if (a) a.textContent = w.name[0]; if (n) n.textContent = w.name; }
  paintWs(); toast(`Switched to ${w.name} · you are ${w.role === 'Admin' || w.role === 'Editor' ? 'an' : 'a'} ${w.role.toLowerCase()} here`);
}
function paint() {
  $('pfGrid').innerHTML = FIELDS.map(([k, l]) => `<div class="pf-kv"><span class="cq-caption-reg">${l}</span><span class="cq-body2-reg">${esc(me[k])}</span></div>`).join('');
  $('pfName').textContent = me.name;
}
$('pfEdit').addEventListener('click', () => {
  $('pfForm').innerHTML = FIELDS.filter(f => f[2]).map(([k, l]) => `
    <label class="cq-field"><span class="cq-field__label cq-body2-reg">${l}</span>
      <span class="ac-input"><input class="cq-body2-reg" type="text" data-k="${k}" value="${esc(me[k])}" /></span></label>`).join('')
    + `<span class="ac-help cq-caption-reg">Your email and membership date are managed by your workspace admins.</span>`;
  openScrim('pfDlg'); setTimeout(() => $('pfForm').querySelector('input').focus(), 30);
});
$('pfSave').addEventListener('click', () => {
  $('pfForm').querySelectorAll('input[data-k]').forEach(i => { if (i.value.trim()) me[i.dataset.k] = i.value.trim(); });
  paint(); closeScrim('pfDlg'); toast('Profile saved');
});
$('pfTokens').addEventListener('click', () => go('pat-tokens.html'));
document.querySelectorAll('[data-toast]').forEach(b => b.addEventListener('click', () => toast(b.dataset.toast)));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeScrim(b.dataset.close)));
paint(); paintWs();
'''.replace('__TICK__', ICON['tick'])

(PAGES / 'pat-tokens.html').write_text(page(
    'Cogentiq Builder · Personal access tokens',
    'The tokens that let scripts and tools act as you: what each can do, when it stops working, and a way to make more.',
    'Personal access tokens', 'Tokens that let scripts and tools act as you.', PAT_CSS, PAT_BODY, PAT_JS))
(PAGES / 'profile.html').write_text(page(
    'Cogentiq Builder · Profile',
    'Who you are on Cogentiq: your details, how you sign in, and what has access as you.',
    'Profile', 'Your details, your workspaces and what has access as you.', PROF_CSS, PROF_BODY, PROF_JS))
for n in ['pat-tokens.html', 'profile.html']:
    t = (PAGES / n).read_text()
    assert t.count('<!--') == t.count('-->'), n
    print(f'{n:18} {len(t):>8,} bytes')
