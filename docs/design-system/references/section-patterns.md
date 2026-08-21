# Section Pattern Catalog

Source: AngelList reference designs — Figma `wPFGlGLF2kGdcC06My35za`, frames: homepage (1:4, 1:8360), venture-funds (1:1495), syndicates-for-managers (1:2866), start-rolling (1:3972), scout-funds (1:4763), investor-venture-funds (1:6144), partnerships (1:6917), blog (1:7411), learn (1:7784), data-center (1:8121), help (1:7712).

All measurements at 1440px canvas, 1344px container. Colors below are written as **AlmaConnect tokens** (see SKILL.md §1); the reference's original value is noted where useful. When building an AlmaConnect section that matches a pattern here, inherit the layout verbatim and only re-skin content.

---

## P0 · Global nav (node 1:1478)
- 68px tall (69 with border), `--surface` white, bottom hairline. Container 1344px.
- Left: logo (82×24) → 46px gap → text links 16px/24 ink, ~24px apart (Products, Pricing, Resources).
- Right: text link "Sign in" (40px hit area) + filled button 40px h, 6px radius, 16px x-padding ("Get started" — ink fill in reference; use `--accent` for AlmaConnect's "Book a demo").
- No shadow; sticky.

## P1 · Homepage hero (nodes 1:9, hero of 1:8)
- Top offset ≈112px below nav inside a ~710px-tall block, all left-aligned, no image.
- Stack: announcement pill → 76px gap → Display XL H1 → 44px gap → 28px/36.4 sub-headline (2 lines, ~549px wide) → 40px gap → primary button 52px h.
- Announcement pill: `--ink` bg, 44px h, radius 9999, 24px x-pad, 16px gradient text (reference gradient `#FFB1B1→#CDCBFF` at 231°; AlmaConnect: `#7FE8DE→#BFF0EA`), 20px arrow icon.
- H1: 112px / 100.8px lh, tracking −1.68px, Regular weight, ink. Max 2 lines, ~903px wide.
- Alt hero (1:8430, "Build with AngelList"): full-bleed accent-colored band, centered white Display XL + small sub + white button. Use only for campaign/dark closing moments.

## P2 · Editorial 4-card product row (node 1:20)
- 4 columns × 324px, 16px gaps (= 1344). Each column bordered by hairline **top and bottom** only.
- Column anatomy, top→bottom: 18px/25.2 label (wght 600) with 24px padding-y → image block 432px tall, 12px radius, overflow clipped, photo/UI crop → 48px circular ⊕ button bottom-right of image (12px inset, rgba(69,71,67,0.35) bg, 2px backdrop-blur, 20px white glyph) → 20px gap → 3-line two-tone description (15.875px/24: lead phrase full ink wght 600, rest `--ink-65`).
- This is the AlmaConnect product-router pattern; the eyebrow label becomes the buyer ("For prospect research teams") or the product name.

## P3 · Partner logo strip + banner (bottom of 1:8)
- Centered 20px/28 statement line ("Better together. AngelList partners with industry leaders.").
- Below: 5 logos in equal cells separated by **vertical hairlines**, logos ≤28px tall, monochrome ink.
- Below: full-width dark pill banner (radius 9999, `--ink`, 44px) with gradient text + arrow — the same pill grammar as P1 scaled to container width.
- AlmaConnect: works for the "Trusted by 500+ institutions" strip; for a filterable wall, keep this restrained strip on the homepage and put the tabbed wall on /customers.

## P4 · Statement H2 + vertical-tab explainer (node 1:84 top)
- Eyebrow 16px `--ink` ("Software for Venture & Private Equity") → 40px gap → Display M 44px/1.2 statement paragraph spanning ~600–640px, 3–5 lines, Regular weight.
- Below, 2-col: left 324px = vertical tab list (24px/1.4 items, ~40px row height, hairline between rows, active = full ink + 2px underline, inactive `--ink-45`), plus small caption + small ink button at bottom; right ≈ 880–920px = light grey/tint panel (`#EFEFEC` in reference; use `--tint-sand` or `--ground` darkened) containing a floating white product-UI mock (12px radius card, browser dots, small charts) — no screenshots of real photography here, only crafted UI.
- AlmaConnect: "What AlmaConnect does — Find / Watch / Bring together" as the three tabs.

## P5 · Full-bleed mint feature band (node 1:84 bottom; syndicates 1:3802)
- Full-width `--tint-mint` band (reference `#D8EFDC`), 72–96px pad. Two variants:
  a) 1/3 text (Heading M title 24px wght 600 + 16px body ≤430px + underlined text-link) : 2/3 media — arched/oval-masked portrait photos in a row, separated by vertical hairlines.
  b) Centered 44px H2 + 20px sub-line, then 3 columns: each = tint image panel with a small white UI card centered on a vertical ink connector line + tiny ink chip label (`INVITES`, `TAX DOCUMENTS` style) → 20px title (wght 600) → 16px `--ink-65` body. Center ink button below.
- AlmaConnect: News+Data Mine cross-sell band, or "How it works" 3-step.

## P6 · Stat patterns (nodes 1:1310, 1:8443)
- Variant A (3-up band): three centered stat blocks in a row — numeral ~110–130px/1.0 wght 350, caption 16px `--ink-65` below. Full band top/bottom hairlines optional.
- Variant B (editorial grid): left column = eyebrow + Display M + 16px body (~330px) + linked report card (dark thumbnail, caption, tag chip, hairline under); right ≈ 640px = hairline-separated rows: one huge numeral (~200px) with caption, then a 2×2 of ~110px numerals with captions. Hairlines above each row.
- Numerals always ink, never accent. Tabular lining figures.

## P7 · Split explainer w/ annotated panel (venture-funds 1:2617, hero 1:1544)
- Left ~421px: Display M 2-line heading → 24px gap → 16px/24 body (65% after lead) → accent text-link with arrow.
- Right ~665px: `--tint-sand` panel (reference `#F3EAE0`), containing a mini-diagram: dark ink card (photo avatar + label), 1px ink connector with arrowhead, white result card (12px radius, dotted shadow edge) listing 5 checklist rows (16px, green check dots).
- Hero variant (1:1544): left = 4px accent tick + 16px eyebrow, Display L (64px) title, 3-line 18px body, accent-filled button 52px; right = flowchart of small white cards + ink chip labels (`DEPLOY`, `INVESTMENTS`) on vertical connector lines, sand result card bottom-right.
- AlmaConnect: the "How we find people other tools miss" differentiation diagram (constituent → search-term permutations → verified match).

## P8 · Full-bleed photo testimonial (node 1:1357)
- Full-width photo band ~742px tall, subject right-of-center. Overlaid top-left: 16px "Testimonials" label; mid-left: 44px/1.2 quote in pale tint (`#CDEBDD` reference; use `#BFF0EA`), ≤3 lines ~510px; below: 16px attribution same pale tint. Bottom-left: two 44px circular prev/next buttons (translucent dark).
- Use only with strong real photography; otherwise use P13.

## P9 · Pricing tier panels (node 1:2658)
- Section on `--ground`: Display M title + 16px sub, right-aligned accent "Compare plans →" on the same line.
- 3 white panels (`--surface`, no border, no shadow, no radius in reference — flat white blocks; 12px radius acceptable), equal width w/ 24–32px gaps, 32px inner padding.
- Panel anatomy: 32px plan name → 16px wght 600 "Best for…" line → 14px `--ink-65` description → hairline → 20px accent sub-plan name → 13px caption → 16px price formula → 13px note → hairline → key:value rows (16px, values right-aligned, accent for highlights like "Unlimited") → 13px footnote.
- Below panels: centered 16px `--ink-65` assumptions lines → ink button + underlined text-link pair.

## P10 · FAQ (node 1:2746)
- 2-col: left 324px = "FAQ" Display M, pinned top; right ~890px = rows of 20px questions (ink, wght 400–600) with right chevron, 76px row height, hairline between and after.
- 5–7 questions max per page.

## P11 · Blog / resource layouts (1:7411, 1:1378)
- "Latest articles" (1:1378): Display M title (2 stacked words) → 4-up grid: thumbnail 16:10 (12px radius or square in reference) → 18px/1.4 title ink → tag chip → hairline bottom.
- Featured + list (1:7468): left ~512px = large 4:3 media card + 28px title + 16px sub + 13px date + author row (32px avatar, name, role caption); right ~514px = 3 stacked text-only entries (28px title, 16px sub, 13px date) separated by hairlines. Section title 32px w/ right-aligned accent "See all →".
- AlmaConnect: Guides column, News-page article modules.

## P12 · Card library grid (data-center 1:8122)
- Centered 32px page title + 14px sub. Then 4-col grid of white cards (1px hairline border, 12px radius, 16px pad): cover art block (dark or accent-tinted, 4:3) → tag chip → 16px wght 600 title → 13px `--ink-65` body → accent "Read the report →" pinned bottom. Rows top-aligned; incomplete last row centered.

## P13 · Testimonial card row (start-rolling 1:4493)
- Section title Display M + accent follow-link. 4-up (bleeds off right edge, carousel): white cards, 1px hairline border, 12px radius, 24px pad — 48px avatar + name (16px wght 600) + handle caption + icon top-right → 16px/24 quote with accent inline links. 44px square outline prev/next buttons below-left.
- AlmaConnect default for named customer quotes (swap handle → title, institution).

## P14 · Mission split (node 1:8455)
- Left: accent eyebrow → Display M 4-line statement → accent button. Right: `--tint-sand` panel with line-art illustration + orbiting partner logos.

## P15 · Timeline "Our Story" (node 1:8361)
- Display M title → hairline → rows: 13px year left (col ~200px) · 2px ink left-rule on text block · 20px/1.5 body where the key phrase carries an `--accent-tint` wash highlight. Hairline between rows. 8–9 rows max.

## P16 · Dark band (partnerships 1:6918)
- Full-bleed `--ink` band ~672px. Left: dot + 16px pale label → Display XL (~96px, 2 stacked words) in pale tint (#CDCBFF reference → #BFF0EA) → 16px body ~510px in white/80 → small pale-tint filled button (ink text).
- Right: two vertical marquee columns of pill chips (radius 9999, rgba(255,255,255,0.06) fill, 24px icon + 24px text at low opacity) scrolling opposite directions.
- AlmaConnect: closing "See what we'd find about your alumni" band or integrations showcase.

## P17 · Icon feature trio (start-rolling 1:3973)
- 32px section title left-aligned → 3 equal columns: 32px outline line-art icon (1.5px ink stroke) → 14px label → 16px/24 `--ink-65` body 2–3 lines. Section bounded by hairlines. No cards, no fills — pure editorial columns.

## P18 · Footer (node 1:1410)
- On `--ground`. 5 columns 16px links (column heads same size as links — differentiation by position): Get started / per-persona columns / Resources. 44px row spacing.
- Below: logo glyph → hairline → legal row (Terms · Privacy · Disclosures · © line) left, 3 social squares (40px, light fill) right → 13px `--ink-45` multi-paragraph disclaimer → thin full-width `--ink` bar at very bottom.
- AlmaConnect columns: Get started / Products (all four!) / Company / Guides / Contact-block as selectable text.
