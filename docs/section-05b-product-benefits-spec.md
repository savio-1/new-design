# Build spec — Section 05b: "Our data. Your people." (tabbed product benefits)

**For:** Claude Code
**Page:** AlmaConnect homepage (`/`)
**Position:** directly after Section 05 (product router), before Section 06 (differentiation)
**Design skill:** use `almaconnect-design` — tokens from `references/design-tokens.css`, colour rules from `references/color-system.md`. Do not invent colours or type sizes.

---

## 1. What this section is for

Section 05 (the router) tells visitors *that there are four products and which one is theirs*. This section tells them *what each product actually gives them*. It is the depth layer, not a second router — a visitor who already clicked through from 05 will never see it, and that's fine.

Because 05 already establishes "we have four products," this section can afford to show only one product at a time.

---

## 2. Layout

Two-column, 50/50, on `--ground`. Left = product visual. Right = tab list + content. Container 1344px, section padding 120px block.

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Our data. Your people.            ← centred H2    │
│                                                                      │
│  ┌────────────────────────┐   [News] [Data Mine] [Institutions]      │
│  │                        │   [Corporates]          ← pill row       │
│  │   product visual       │   ──────────────────────────────────     │
│  │   (screenshot / UI     │   Intro line (one sentence)              │
│  │    mock on tinted      │                                          │
│  │    panel)              │   ✓ Bold lead-in — benefit text          │
│  │                        │   ✓ Bold lead-in — benefit text          │
│  │                        │   ✓ Bold lead-in — benefit text          │
│  │                        │                                          │
│  │                        │   Learn more →                           │
│  └────────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Specifics

| Element | Spec |
|---|---|
| Section H2 | Display M (44px / 1.1 / wght 400), centred, 64px margin-bottom |
| Columns | `grid-template-columns: 1fr 1fr; gap: 64px; align-items: start` |
| Left panel | Fixed 4:3 or 1:1, `--r-panel` 16px radius, background `--tint-aqua`, contains a floating white UI card (12px radius) per the P4/P7 illustration style — **no photography** |
| Pill row | Horizontal, wraps on narrow, `gap: 8px`, 32px margin-bottom |
| Pill (idle) | `--surface` bg, 1px `--hairline`, `--ink-65` text, 15px, `padding: 10px 18px`, `border-radius: var(--r-pill)` |
| Pill (active) | `--ink` bg, white text, no border |
| Pill (hover) | `--accent-tint` bg, `--ink` text |
| Intro line | Body 16px, `--ink-65`, max-width 480px, 28px margin-bottom |
| Benefit row | Flex, `gap: 12px`, 20px between rows |
| Check icon | 20px, stroked circle-check, colour `--accent`, `flex: none`, 2px optical top offset |
| Benefit text | Body 16px/24. Lead-in `--ink` wght 600, remainder `--ink-65`. Use the `.twotone` pattern from the token sheet |
| Learn more link | 15px, `--accent`, arrow `→`, 32px margin-top, nudges 3px right on hover |

### Critical: fixed panel height

All four tab panels must occupy **identical height** so the page does not jump on switch. Enforce with `min-height` on the right column sized to the tallest panel, or by grid-stacking all four panels in the same cell with `visibility` toggling. Every tab has exactly three benefits of similar length, which makes this easy — **do not add a fourth benefit to any tab.**

### Responsive

- ≤1000px: stack to one column, visual **below** the content (the content is the point; the visual is support).
- ≤640px: pills scroll horizontally in a single row with `overflow-x: auto` and no scrollbar, or wrap to two rows — either is fine, but never shrink the text.

---

## 3. Behaviour

- Default active tab on load: **News**.
- Click/tap a pill → swap panel content. No page jump, no scroll change.
- Transition: content fades in over 200ms with a 4px upward translate. Pills transition background/colour over 150ms. Use the global ease `cubic-bezier(.22,1,.36,1)`.
- Left visual also swaps per tab, same transition.
- **Accessibility:** implement as a real tablist — `role="tablist"` on the pill row, `role="tab"` + `aria-selected` + `aria-controls` on each pill, `role="tabpanel"` + `aria-labelledby` on each panel. Arrow keys move between tabs, Enter/Space activates. Inactive panels get `hidden`.
- `prefers-reduced-motion: reduce` → no fade or translate, instant swap.
- No auto-rotation. The tabs never advance on their own.

---

## 4. Content — final copy

Use verbatim. Bold lead-ins are the two-tone device; everything after the em-dash is `--ink-65`.

### Section headline
**Our data. Your people.**

*(No sub-headline. If one is needed for rhythm, use: "Pick a product to see what it does." at Body size, `--ink-45`, centred.)*

---

### Tab 1 — `News` (default active)

**Intro:** Verified news about your constituents, within 24–48 hours of publication.

- **Person-first search** — We search for your alumni, not your institution's name, so you find stories that never mention you
- **Every match verified** — We read the article to confirm it's your John Smith before it reaches you
- **Routed, not dumped** — Alerts go to the gift officer who owns the relationship, not one shared inbox

**Link:** Explore AlmaConnect News →
**Visual:** news alert card — headline, constituent name, matched-employer line, a `--tint-mint` "Verified" pill

---

### Tab 2 — `Data Mine`

**Intro:** Current employment for every alum, matched to your constituent IDs.

- **Where they work now** — Employer, title and location for constituents whose records went quiet years ago
- **Matched by unique ID** — Every match carries your ID, so nothing lands on the wrong person
- **Written back to your CRM** — Updates flow into Raiser's Edge NXT or Salesforce as notes, on your approval — never overwriting what's there

**Link:** Explore Data Mine →
**Visual:** record card showing before/after employer, with the old role marked "Former" in `--tint-sand`

---

### Tab 3 — `Institutions`

**Intro:** Directory, events, jobs and mentorship in one alumni community.

- **A directory they actually use** — Searchable by class, city, industry and employer, on web and mobile
- **Events and chapters** — Registrations, reunions and regional groups without a second platform
- **Mentorship and jobs** — Alumni help each other, and you get engagement data you didn't have before

**Link:** Explore the Institutions Network →
**Visual:** directory search result — three alumni rows with class year and city filters

---

### Tab 4 — `Corporates`

**Intro:** Former employees stay in your network — as hires, referrals and advocates.

- **Boomerang hiring** — Your best candidates are people who already know how you work
- **Referrals at scale** — Alumni refer talent long after they leave
- **Employer brand that outlasts the exit** — People who left well say so publicly

**Link:** Explore the Corporates Network →
**Visual:** alumni network card — former employee profile with a "Referred 3 hires" stat

---

## 5. Rules that are easy to get wrong

1. **Pill labels are exactly** `News` · `Data Mine` · `Institutions` · `Corporates`. Not "News Tracker," not "Alumni Network for Institutions" — the short forms keep the row on one line, and the full names already appear in the router above.
2. **Order is fixed:** News first. It's the product most visitors arrive for and the default tab, so it's what everyone who doesn't click will see.
3. **Three benefits per tab. Never four.** The fixed-height requirement depends on it.
4. **Turquoise stays primary.** Check icons and the "Learn more" link are `--accent`. Support tints (`--tint-mint`, `--tint-sand`) appear only *inside the product visual*, as small status pills — never on the pills, text, or panel background. See `color-system.md` §4.
5. **No photography in the left panel.** UI mocks only, per the P4/P7 illustration style. Photography appears elsewhere on the page, not here.
6. **Sentence case everywhere,** including pills and the "Learn more" link.
7. This section does **not** repeat the buyer labels ("For prospect research teams") — that's the router's job in Section 05. Repeating them makes the two sections read as duplicates.

---

## 6. Acceptance checklist

- [ ] Switching tabs causes zero layout shift (measure: CLS contribution 0)
- [ ] Keyboard: Tab reaches the pill row, arrow keys move between pills, focus ring visible
- [ ] Screen reader announces the selected tab and its panel
- [ ] `prefers-reduced-motion` honoured
- [ ] Copy matches §4 exactly, including em-dashes and the two-tone bold split
- [ ] Renders correctly at 1440, 1024, 768 and 375px
- [ ] No colour used outside the tokens in `design-tokens.css`
