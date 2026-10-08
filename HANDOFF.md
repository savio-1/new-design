# AlmaConnect website — session handoff

Read this first in a new session. It records where everything lives, how the
work is built and checked, what state it is in, what the user has asked for
and rejected, and what comes next.

Last updated 2026-10-07 — all four product-card hover animations built.

---

## 1. Where things live

| What | Where |
|---|---|
| Repo / branch | `savio-1/new-design` · branch **`claude/almaconnect-design-review-48vnbb`** — develop, commit and push only here. No PR unless asked. |
| Homepage source | `almaconnect-home.src.html` (~4,250 lines) — **edit this** |
| Homepage build | `almaconnect-home.html` — generated, ~2.2MB, all assets inlined. **Never edit.** |
| Build | `python3 scripts/build-home.py` |
| Live homepage (artifact) | https://claude.ai/artifact/Uy7WfWmyWdeuYsQvkcd7U6 (older form: `https://claude.ai/code/artifact/e27c6863-2000-46f4-bdf7-a037cc551a6b`) — private to the user |
| Illustration board (artifact) | https://claude.ai/code/artifact/c7c71d5f-ec62-4096-b254-83d48ff91765 — built by `scripts/build-illustration-board.py` → `dist/illustration-system.html` |
| Figma homepage | https://www.figma.com/design/wPFGlGLF2kGdcC06My35za/Website?node-id=49-2 — page "AlmaConnect — Homepage" (`45:2`), wrapper frame `49:2`. Page 1 is the AngelList reference; do not touch it. |
| Design-system skill bundle | `dist/almaconnect-design/` (`SKILL.md`, `CONTEXT.md`, `almaconnect.css`, `references/*.md`) → zipped as `dist/almaconnect-design.zip`. Mirrored to `docs/design-system/`. |
| Verify the card animations | `NODE_PATH=/opt/node22/lib/node_modules node scripts/verify-cards.js` |
| Install real fonts locally | `bash scripts/setup-fonts.sh` (run once per container) |

**Republishing the artifact from a new session:** pass the URL above as `url`
to the Artifact tool. A conversation that has not read or published it is
refused once and handed the live source; diff it against
`git show HEAD:almaconnect-home.html` (ignoring the host's `<!doctype…><body>`
wrapper) to confirm nothing changed outside git, then publish again.

**Commit trailer** (current): end commit messages with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
`Claude-Session: <session url>`. Never put model IDs anywhere else in the repo.

---

## 2. Resuming — the first five minutes

```bash
cd /home/user/new-design
git fetch origin claude/almaconnect-design-review-48vnbb && git checkout claude/almaconnect-design-review-48vnbb
bash scripts/setup-fonts.sh          # Geist + Nunito Sans for headless Chromium
python3 scripts/build-home.py        # src → almaconnect-home.html
NODE_PATH=/opt/node22/lib/node_modules node scripts/verify-cards.js
```

Playwright is installed globally (`/opt/node22/lib/node_modules`) and Chromium
lives at `/opt/pw-browsers/chromium` — always pass `executablePath`. Never run
`playwright install`. `ffmpeg` is available via the scratchpad's
`node_modules/ffmpeg-static/ffmpeg` in the old session only; `npm i ffmpeg-static`
again if a video reference needs frames extracted.

Expected `verify-cards.js` output: fonts `Geist` / `Nunito Sans`; News rail
starts moving ~0.3s after hover and every step prints matching
`centred/lit` names; Data Mine `rest scale=1.075`, `drift reversals=0`, then
records A → B → C open in turn; Institutions beat 1 holds ~0.6s then beats
2 and 3 follow; Corporates rest frame at hover, scores 1→3, others clear, link →
job card grows 52→96 with bottom held at 148, docked gap 10px, profile bottom 324 < plus 337, no truncated text; `LAYOUT card1..4:ok`.

---

## 3. Build pipeline

`build-home.py` inlines assets as base64, because the artifact host blocks
external requests (only Google Fonts is allowed):

| Token in source | Resolves to |
|---|---|
| `@img:name` | `assets/img/floema/name.jpg` |
| `@png:name` | `assets/logo/name.png` |
| `@svg:name` | `assets/logo/name.svg` |
| `@video:name` | `assets/videos/name.mp4` |

---

## 4. The page today

| # | Section (class) | State |
|---|---|---|
| — | Load intro (`.intro`) | Four keywords cycle one at a time in Geist 18, blur-in/blur-out, ~2.9s, then the page |
| — | Nav (`.nav`) | Wonderful-style; on scroll contracts to a centred glass pill (`rgba(242,239,234,.82)`, blur 20). Links hide below 1000px — no mobile menu yet |
| 01 | Hero (`.hero`) | 88px headline, line 2 shimmers; auto-drifting staircase of portraits |
| 02 | Trusted by (`.trusted`) | 12 placeholder wordmarks in white cells, cycling |
| 03 | **Products (`.personas`)** | Four cards, 3:4 media (298×397), each with a **hover animation** — see §5 |
| 04 | Problem (`.problem`) | Scroll-lit paragraph with tinted keyword pills |
| 05 | Solution (`.solution`) | Full-bleed photo, scroll-morph frame, three-card accordion; each open card shows an illustrated scene that loops (6s) — see §5b |
| 05b | Benefits (`.benefits`) | `--ink` ground, segmented tabs with sliding thumb, auto-advancing accordion with gradient progress lines; the panel shows one illustrated scene per benefit (12) that plays once as its row opens — see §5b |
| 06 | Testimonials (`.tstm`) | Looping carousel, 1.5 cards in view, hover washes each card in its hue; stat band |
| 07 | Integrations + privacy (`.duo`) | Orbiting logos; three drawn certification marks |
| 09 | Closing CTA (`.close`) + footer | Aurora wash into near-black |

Headlines and section subtext blur in word by word on first view, then
shimmer once. Every effect has a `prefers-reduced-motion` path.

---

## 5. Product-card hover animations (the active work)

All four share the grained gradient ground (`.pcard__wash` + `.pcard__grain`,
hue per card: aqua / lilac / sky / peach). The reveal button `.pcard__plus`
owns the bottom-right corner (y ≥ 337, x ≥ 238) — keep artwork clear of it.
At rest each card shows a designed still; hover plays the animation.

### 01 · AlmaConnect News — `.nstack` (aqua) ✅
- A rail of **12 person cards = 6 people listed twice**, so the loop closes on
  identical content. 3 in view; ends dissolve via a mask.
- Card: white, radius **12**, height 110, padding 12. Face 36px r10 on the
  left; name (Geist 14) and institution (Nunito 12, `--ink-65`) as one unit,
  5px apart, centred on the face; **12px** gap; news line Nunito **13**/1.42,
  `--ink-80`, clamped to 2 lines with ellipsis. Tracking **−0.035em**.
- Middle card lit (opacity 1, scale 1, shadow); others 0.4 / 0.93.
- Timing: **13.2s** cycle, 2.2s per card (1.6s parked + 0.6s glide), explicit
  plateau keyframes. Animation is **always attached but paused**; hover sets
  `running`, leaving freezes it in place. Offset `-1.4s` so the first glide
  starts 0.2s after hover. Per-card delays `6n+1…6n+6`: −5.8, −3.6, −1.4,
  −12.4, −10.2, −8s.

### 02 · Data Mine — `.dmine` (lilac) ✅
- **12 avatars** over **12 skeleton rows** (pitch 65, rows 56 tall, r12).
  Avatars are **siblings** of the rows inside `.dmstage`, absolutely placed
  where they will sit in their row.
- 10.5s loop that **opens and closes on the resting frame** (list assembled,
  record A open), hover-only so each hover replays from the top:
  record A settles at once → avatars burst out (soft landing) → **slow
  constant-speed glide** a few px with one gentle perpendicular arc (no
  reversals — the user rejected two earlier "jiggly" versions) → converge on
  three alternating curves → rows fade in → records **A, B, C open in turn**
  (scale 1.075, shadow, real name/role replaces skeleton) while the stage
  walks up one row each time and the others recede to 0.6 → stage rolls back.
- Records: A Chris Doyle (VP Engineering · Corven Group), B Jonas Ek
  (Partner · Halden & Co), C Amara Boateng (Data lead… "Head of Data · Kelso Labs").

### 03 · Network for Institutions — `.inst` (sky) ✅
- Three beats on one 7.5s seamless loop, entered at −1.5s so the first change
  lands ~0.45s after hover. A white label pill cross-fades with the stage.
  1. **Mentors in your area** — six overlapped 48px faces + "+18", chip below
  2. **Alumni living nearby** — three 56px records with distance chips
  3. **Events happening around you** — two dated event cards with "who's going"
- All text on white; nothing set on the gradient.

### 04 · Network for Corporates — `.corp` (peach) ✅
- **The right job for you** (user's brief: a stack of jobs with the profile
  below; match the profile with one job; show a message option). Three white
  job rows (52 tall, r12, y 22/80/138): 32px tinted letter logo, title (Geist
  14) + company (Nunito 12), and a score chip that is hidden at rest —
  Design Lead · Halden & Co 72%, **Product Designer · Corven Group 94%**
  (mint chip), UX Researcher · Kelso Labs 68%. Below, Rosa Keller's profile
  card (p2, 44px face, "Product designer · Ex-Corven", peach skill chips
  Design systems / Figma / 8 yrs) at y 206–324.
- 7.6s hover-only loop, opens and closes on the rest frame: scores pop on
  rows 1→3 (first at 0.15s) → the Corven row lifts (scale 1.03, 2px accent
  ring) while the other two dim to .4 → they clear (fade, ±12px) as the
  Corven row moves down 16px and the profile rises 48px to meet it, 10px
  apart → an accent check badge pops on the join → the **job card** grows
  upward from 52 to 96px (rising 44px on the same curve so its bottom edge
  holds the seam at y 148) to reveal a full-width accent **Message recruiter**
  button (ink text) under the title row, which pulses once → holds to 5.9s →
  everything settles back. The profile keeps its skill chips throughout.
- The CTA belongs to the job, not the person (user correction) — don't move
  it back to the profile card.
- Rejected before this: a "boomerang shortlist" deck flying into slots, and
  a ring of company marks around the person ("not good").

## 5b. Section illustrations (Solution + Benefits)

The user asked for the remaining sections to get simple, realistic motion in
the same language — max 5–8s, easy to read, static where that suits. Hero,
trusted-by, problem, testimonials, integrations and the closing band were
left alone (they already move or are text). Shared kit in the CSS under
"section illustrations": `.ill` slot → `.ill__stage` drawn at a fixed size
(`--w/--h`) and scaled to fit by a small script (`[data-fit]`, never above
1); `ik-card / ik-row / ik-face / ik-name / ik-meta / ik-text / ik-chip /
ik-btn / ik-check / ik-field / ik-swap (ik-old → ik-new) / ik-date`. Spans
inside a stage are blocks via `:where(.ill__stage) span`. Resting styles
are the finished frame (reduced motion shows it).

- **Solution** (stage 560×232; ≤620px re-flows to 280×300 with the slot at
  300px): *Find them* (aqua) — three faces found on the web (Amara, Marcus,
  Chris) on the left, their records (initials, class, ID) on the right in a
  different order; one at a time a curved accent line draws from a face
  to its own record, the face rings and the record checks (straight lines
  were tried and rejected — keep the curves).
  *Watch* (lilac) — twelve US/UK news logos (NYT, BBC, The Guardian,
  CNN, FT, Bloomberg, Forbes, The Economist, Reuters, AP, NPR, CNBC) in
  white bubbles (44–52px) scattered at uneven spacing but balanced — six
  per half, clear space above and below the pill (a circular ring was
  rejected as too regular); phones 44px, own scatter — round a 32px "Searching 400,000+ news
  sources" pill with a spinner; each bubble bobs ±3px on its own slow sine,
  and one at a time (scattered order, 0.5s apart, 6s round) a bubble takes
  an accent ring. No names or matching — the user
  only wants it to say we search the news (a marquee + shortlist version
  was rejected as too much). *Bring them back* (sky) — Directory / Events / Jobs / Mentorship tiles
  lift one at a time (1.5s each). 6s loops, only while the card is open;
  keyframes generated so every element leaves together.
- **Benefits** (stage 440×440; 340×420 on phones; each tab has its own
  grained ground — aqua/lilac/sky/peach): News — person-first search
  results that don't mention the school; "Is this your John Smith?"
  checklist ticks to "Verified match"; alert routed down to Elena Vargas,
  shared inbox greyed. Data Mine — Chris Doyle's record fields fill in;
  two Chris Doyles, only the ID-matched one checks; "Approve" writes a note
  into the CRM while old entries are "Kept". Institutions — directory
  filters + results; event "Register" → "Registered", 18 → 19 going;
  mentor match line + job post. Corporates — Rosa Keller rejoins Corven;
  Andre Diaz's referrals; Elena's post reactions 48 → 212. One-shot
  entrances (0.3–1.4s) when the row opens.

### What the user wants from these animations (learned the hard way)
- Movement must be **noticeable within ~0.3s** of hover. A loop that opens on a
  hold reads as broken ("the news animation is not working" was a 3.4s hold).
- **Smooth, not jittery.** Particle motion = slow, constant velocity, no
  direction reversals.
- **Faster rather than slower** overall; holds ~1–2s.
- Hover should **not blink or cut** — make the loop start and end on the rest frame.
- Keep it clean and breathable; people's faces carry the card.

---

## 6. The cast (one face, one name, page-wide)

| Portrait | Name | Portrait | Name |
|---|---|---|---|
| p1 | Dan Whitlock | p7 | Chris Doyle |
| p2 | Rosa Keller | p9 | Elena Vargas |
| p4 | Amara Boateng | p10 | Marcus Bell |
| p6 | Andre Diaz | p11 | Jonas Ek |

**p3, p5, p8 are reserved** — they stand in beside real named testimonial
authors (Nicole Melmed, Christi Hendry, Katie Bokenkamp) and must never appear
in artwork. `av_n.jpg` is a face crop of `p_(n+1).jpg` — same person; check
crops, not filenames. All names, news lines and institutions in artwork are
invented placeholders.

---

## 7. Design system essentials

Full spec: `dist/almaconnect-design/SKILL.md` + `almaconnect.css` +
`references/*.md`. The essentials:

- **Type** — closed ladder. Geist 88/64/48/32/24/16/14 (350 at ≥32px, 400 at
  ≤24px; −4% tracking at ≥48px, −3% below). Nunito Sans 24/20/18/16/14/12 at
  400, −3%. Buttons 600, nav 500. Tracking must be set **on elements** — an
  `em` on `body` inherits as pixels. Card animations use −0.035em as a local exception.
- **Colour** — `--accent #00c4b5`, `--accent-dark #00a396`, `--ink #04302b`,
  `--ink-80/65/45`, `--ground #f2efea`, `--panel #edebe4`, `--deep #10261e`,
  tints/on-colours aqua/lilac/sky/peach/mint/sand. **Turquoise fills take ink
  text** (white on `#00c4b5`/`#00a396` ≈ 3:1, fails AA). Gradient pills use the
  light end of the hue with ink text.
- **Radii** — button 10, card 12, panel 16, pill 9999.
- **Shadows** — never on page cards; only inside artwork.
- **Illustration system** — `references/illustration-system.md`: 28 grained
  grounds, 5 glass treatments (solid/frost/rim/halo/tile), 19 constructions,
  portrait-frame rules, the hover patterns above, the cast. The user rejected
  decorative background patterns as "amateurish".

---

## 8. Figma state

Built with the Figma MCP (`use_figma` — load the `figma-use` skill resource
first). File `wPFGlGLF2kGdcC06My35za`, page `45:2`, wrapper `49:2`
(1440×7279, all 11 sections, auto-layout). Variables: **AlmaConnect / Color**
(27, `VariableID:45:4`–`45:30`) and **AlmaConnect / Layout** (14,
`46:3`–`46:16`); 16 text styles; one effect style. Photography uploaded via
`upload_assets` (hashes reusable). Product illustrations there are **dashed
placeholders** — the user said they would draw illustrations in Figma and
have me match their style; that has not happened yet.

Known Figma limits: Geist has no variable weight axis there, so 350 maps to
**Light** at ≥32px and **Regular** at ≤24px. `layoutGrow` takes integers only.
`createAutoLayout()` frames ship a **white fill** — clear it. The Figma MCP
connection drops between calls; reload tools via ToolSearch and continue.

---

## 9. How to verify (the habit that mattered most)

Measure in the browser; never trust a still.

- **Motion:** sample computed `transform`/`opacity` over time after a *real*
  hover. "It animates" is not a check — the News bug looked fine in stills.
- **Sync:** for staggered loops, check *which* element is centred and *which*
  is lit at the same instant.
- **Contrast:** sample **rendered pixels**, not computed colours.
- **Layout:** probe every artwork child for overflow/clipping and for
  collision with `.pcard__plus`; compare section heights before/after to prove
  no reflow (`personas` 971, page 8055 at 1440×1100).
- **Fonts:** run `setup-fonts.sh` first or every text measurement is wrong.

---

## 10. Traps that each cost a round

1. A **negative `animation-delay` runs the animation forward** from that
   offset — card *j* lit at `t=(j−2)·step` needs `delay = −(cycle − ((j−2) mod n)·step)`.
2. The **`animation:` shorthand resets `animation-delay` and
   `animation-play-state`** — longhands must come after it.
3. **Specificity**: `.a .b { animation: … }` beats a later `.b { animation-delay: … }`.
4. A positioned child's **`z-index` escapes** a parent without its own
   stacking context — the lifted Data Mine row painted over the avatar layer.
5. One element **can't run two transform animations** — put the second on a
   child (or use the independent `translate`/`scale` properties).
6. **Per-keyframe `animation-timing-function`** overrides the element's; leave
   it unset on a segment to keep per-element curves.
7. A loop that **opens on a hold reads as broken**; offset or start in motion.
8. Hover-only animation **snaps** on start/stop unless the loop's 0%/100%
   equals the static rest styles.
9. **Landscape photo tiles over-crop portrait sources** — match the source aspect (~0.75–0.8).
10. `getBoundingClientRect()` reports **scaled** size — don't mistake 108×0.93 for a bug.
11. `<span>` with `position:relative` is not block — set `display` explicitly.
12. `background` shorthand resets `background-clip` (shimmer text needs `background-image`).
13. Never change nav-bar geometry when its menu opens — it oscillates under the pointer.
14. IntersectionObserver fires under the load overlay — gate reveals with `afterIntro()`.
15. `--ink-45` at 12–14px measures **2.6:1** — fails AA (still used page-wide; see §11).

---

## 11. Open items

| Item | Note |
|---|---|
| `shot-*.jpg`, `acc*.jpg` | No longer used on the page — the Solution and Benefits slots are illustrated scenes now. `shot-find`/`shot-watch` were another company's UI; the files are still in `assets/img/floema/` and can be deleted. |
| `--ink-45` contrast | 2.6:1 at small sizes, page-wide. Token-level decision: move captions to `--ink-65`. |
| Mobile nav | Links hide below 1000px; nothing replaces them. |
| Intro replay | Plays every load; session-gate it and allow click-to-skip before real traffic. |
| News logos | `assets/logo/news-*.svg` (NYT, BBC, CNN, Guardian, FT, Forbes, Bloomberg, Economist, AP, Reuters, NPR, CNBC) come from Wikimedia and are the outlets' trademarks — get permission or swap for neutral marks before launch. |
| Placeholders | Stock portraits beside real testimonial names; invented names/news; fake wordmarks; drawn SOC 2 / GDPR / DPF marks (need real artwork + legal sign-off); third-party logos need press kits. |
| Figma illustrations | User planned to draw them in Figma for me to follow; not yet done. |

---

## 12. Working with this user

- Directs section by section, often with reference screenshots or screen
  recordings (`.mov` — extract frames with ffmpeg and read them). Replicate the
  *mechanics* of a reference with AlmaConnect's own copy, palette and people.
- Gives short, direct feedback ("this is not good", "jiggling — not good");
  fix the specific thing and re-verify rather than redesigning everything.
- Each iteration: edit src → build → measure/screenshot → republish the same
  artifact → commit + push → short summary with the link.
- Ambiguous numeric asks: measure the current value first (the "12px gap" was
  resolved by measuring 8.8px and reading it as the gap below the pair).
