# Artifact Landing Page — Design Guidelines

> **Scope:** These guidelines govern the **landing page of any artifact/module** in the Cogentiq platform (Marketplace, Model Hub, Tools, and equivalents). They are derived directly from the Figma source and use the platform's **exact design tokens**. Any new artifact landing page built to these rules should match the existing designs 1:1.

**Sources this guideline was built from**
| # | Page | File | Node |
|---|------|------|------|
| 1 | Marketplace — Agents | `Cogentiq – Builder` (`Cq3g1NA1RzLfySk1EM2n2V`) | `1687-430848` |
| 2 | Model Hub (3-col) | `AI assistant <> User` (`d2Aeg6YIYnO838TlkmAkRP`) | `3839-26441` |
| 3 | Model Hub (2-col + counts) | `AI assistant <> User` (`d2Aeg6YIYnO838TlkmAkRP`) | `5780-29932` |
| 4 | Tools | `AI assistant <> User` (`d2Aeg6YIYnO838TlkmAkRP`) | `6603-28498` |

All four share one design system. Token names below are the **verbatim Figma variable names** — reuse these names in code so the mapping stays traceable.

---

## 1. Design Philosophy

1. **Content-first, chrome-light.** Navigation and controls are quiet (greys, thin borders, no heavy shadows). Color and weight are spent on the content — the cards — and on the single primary action per screen.
2. **Card-driven catalogs.** Every artifact landing page is a *browsable catalog*: a contextual filter panel on the left, controls (tabs + search) across the top, and a responsive grid of uniform cards. Learn one card, understand them all.
3. **Flat, near-shadowless surfaces.** Separation comes mostly from **1px light borders** (`#f5f5f5`–`#eeeeee`) and background steps (`#fafafa` page → `#ffffff` card). Elevation is minimal: cards carry only a **whisper shadow** `0 1px 2px rgba(33,33,33,0.08)`; the heavier blur/inner-shadow effect (`secondary-effect`) is reserved for floating glass surfaces.
4. **Tight, calm density.** 4px-based spacing, compact 131px cards, 12–16px gaps. Information-dense but never cramped — generous line-height (20–24px) keeps it readable.
5. **One accent, colorful identifiers.** UI accent is a single **blue (`#0d99ff`)**. The wider color palette (purple, indigo, orange, green, cyan, pink, yellow) is reserved for **per-item identity** — the gradient icon tile on each card — never for chrome.
6. **Neutral, legible typography.** `Geist`, medium/regular weights, slightly negative letter-spacing. No display type; hierarchy is carried by size + weight + color, not by font changes.

---

## 2. Color Tokens

Light theme only. Values are exact from Figma.

### 2.1 Backgrounds
| Token | Hex | Use |
|-------|-----|-----|
| `Backgrounds/Page/bg-1` | `#fafafa` | App / page canvas (behind everything) |
| `Backgrounds/Page/bg-2` | `#ffffff` | Primary surface, header bar |
| `Backgrounds/Page/bg-3` | `#f5f5f5` | Recessed areas |
| `Backgrounds/Card/bg-2` … `bg-5` | `#ffffff` (`bg-4` = `#f5f5f5`) | Card fills |
| `Backgrounds/Seg control, Tabs -1` | `#eeeeee` | Segment-control / tab track |
| `Backgrounds/Type/Search/default` | `#f5f5f5` | Search field & text inputs |
| `Backgrounds/Button/Primary colour` | `#0d99ff` | Primary button fill |
| `Backgrounds/Button/Tonal-1` | `#e5f4ff` | Tonal (secondary) button fill |
| `Backgrounds/Badge/Indigo` | `#f4f5ff` | Tinted badge background (indigo example) |
| `Backgrounds/Checkbox/Default` | `#ffffff` | Checkbox fill |

### 2.2 Text
| Token | Hex | Use |
|-------|-----|-----|
| `Text/Primary` | `#121212` | Titles, primary content |
| `Text/Secondary` | `#616161` | Body, descriptions |
| `Text/Teritiary` *(sic)* | `#8c8c8c` | Meta, captions, placeholders |
| `Text/Button/White` | `#ffffff` | Text on primary button |
| `Text/Button/Tonal-1` | `#007be5` | Text on tonal button / links |
| `Text/Button/Tonal-2` | `#757575` | Muted button text |
| `Text/Coloured- blue` | `#0d99ff` | Blue accent text |
| `Text/Coloured- purple` | `#9747ff` | Purple accent text |
| `Text/Coloured- Green` | `#14ae5c` | Green accent text |
| `Text/Coloured- Indigo` | `#5860ed` | Indigo accent text |
| `Text/Coloured- Cyan` | `#00a2c2` | Cyan accent text |
| `Text/Coloured- pink` | `#e91e63` | Pink accent text |
| `Text/Coloured- orange` | `#dd7c0e` | Orange accent text |
| `Text/Coloured- Yellow` | `#ff8f00` | Yellow accent text |
| `Text/Coloured-light green` | `#689f38` | Light-green accent text |

### 2.3 Strokes / borders
| Token | Hex | Use |
|-------|-----|-----|
| `Strokes/Card/Default` / `Strokes/Line-1` | `#eeeeee` | **Default card & divider border (the workhorse)** |
| `Strokes/Type/Default` / `Strokes/Line-2` / `Grey/300` | `#e0e0e0` | Input borders, stronger dividers |
| `Strokes/Line-3` | `#f5f5f5` | Faintest divider |
| `Strokes/Card/Hover` | `#bdbdbd` | Card border on hover |
| `Strokes/Card/Selected` / `Strokes/Type/Focus` | `#0d99ff` | Selected / focused border |
| `Strokes/Icon/Default` | `#757575` | Default icon stroke |
| `Strokes/Checkbox/Default` | `#bdbdbd` | Checkbox border |

### 2.4 Accent / identity ramps (for icon tiles, badges, charts — not chrome)
Each hue exposes 300 (tint) / 500 (base) / 600 (deep), plus a matching `Gradient/*` used for card icon tiles.

| Hue | 300 | 500 | 600 | Extra |
|-----|-----|-----|-----|-------|
| Blue | `#bde3ff` | `#0d99ff` | `#007be5` | 400 `#80caff` |
| Purple | `#e4ccff` | `#9747ff` | `#8638e5` | |
| Indigo | `#c2c5fa` | `#5860ed` | `#454de0` | |
| Cyan | `#b6ecf7` | `#00a2c2` | `#0087a8` | 400 `#75d7f0` |
| Green | `#aff4c6` | `#14ae5c` | `#009951` | |
| Light Green | `#aed581` | `#8bc34a` | `#7cb342` | |
| Orange | `#fcd19c` | `#fc9e24` | `#dd7c0e` | 700 `#f79722`, 800 `#dd7c0e` |
| Pink | `#f8abc5` | `#e91e63` | `#d81b60` | |
| Yellow | `#ffecb3` (200) | `#ffc107` | — | 800 `#ffa000` |
| Red | — | `#f24822` | — | (error/destructive) |

**Rule:** the card icon tile uses a `Gradient/<hue>` fill; the hue is assigned per item/category, never semantically fixed. Chrome (buttons, links, selection) always uses **Blue**.

### 2.5 Semantic
- **Success:** Green `#14ae5c` · **Warning:** Orange/Yellow `#fc9e24` / `#ffa000` · **Error/Destructive:** Red `#f24822` · **Info/Accent:** Blue `#0d99ff`.

---

## 3. Typography

**Family:** `Geist` (all weights) — the platform font, **bundled in `/fonts`** (Regular 400, Medium 500, SemiBold 600, Bold 700; from the Cogentiq design system). Load via `@font-face`; do not rely on a system copy. Fallback stack: `"Geist", "Inter", system-ui, -apple-system, sans-serif`.
**Letter-spacing:** slightly negative throughout (Figma stores it in 1/1000 em steps; the values below are the practical equivalents).

| Style token | Size / Line-height | Weight | Typical use |
|-------------|-------------------|--------|-------------|
| `Subhead2/Med` | 18 / 24 | 500 Medium | Page title in header, section headers |
| `Body1/Semibold` | 16 / 24 | 600 SemiBold | Emphasised body / card titles (large) |
| `Body1/Med` | 16 / 24 | 500 Medium | Card title, prominent labels |
| `Body2/Reg` | 14 / 20 | 400 Regular | **Default body / card description** |
| `Body2/Med` | 14 / 20 | 500 Medium | Labels, list items, tabs |
| `Caption1/Reg` · `Caption/Reg` | 12 / 16 | 400 Regular | Meta text, ratings, counts |
| `Caption1/Med` · `Caption/Med` | 12 / 16 | 500 Medium | Section eyebrows ("INDUSTRY", "MODEL PROVIDERS"), tags |
| `Caption2/Reg` | 10 / 14 | 400 Regular | Micro labels |
| `Caption2/Med` | 10 / 14 | 500 Medium | Micro labels (emphasis) |

**Type scale (px):** 10 · 12 · 14 · 16 · 18. **Line-height scale:** 14 · 16 · 20 · 24.
**Hierarchy rule:** Title `Text/Primary` + Medium → Description `Text/Secondary` + Regular → Meta `Text/Teritiary` + Caption. Never change family for emphasis; change weight/size/color.

---

## 4. Spacing, Radius & Elevation

### 4.1 Spacing scale (4px base — measured from the frames)
`4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32`

| Context | Value |
|--------|-------|
| Grid gap between cards | **12px** |
| Card inner padding | **16px** |
| Main content horizontal padding | **32px** |
| Contextual sidebar padding | **12px** |
| Header title left inset | **16px** |
| Top filter/segment bar left inset | **24px** |
| Segment-control inner padding | **4px** |
| Gap between segment tabs | **4px** |
| Icon-to-text gap (card title row) | **~6–8px** |
| Section title → content | **8px** (e.g. sidebar eyebrow at y=24 → options at y=52) |

### 4.2 Corner radius (observed — not exposed as Figma variables; standardise on these)
| Element | Radius |
|--------|--------|
| Card | **12px** |
| Card icon tile | **10px** |
| Buttons, search field, inputs, dropdowns | **8px** |
| Segment-control track | **8px**, active pill **6px** |
| Tags / badges | **6px** (pill chips like "Tool templates" = fully rounded) |
| Avatar, circular icon buttons | **50% (circle)** |

### 4.3 Borders & elevation
- **Default separation = 1px solid border.** Cards use a very light **`#f5f5f5` (Strokes/Line-3)** border; general dividers use `#eeeeee` (Line-1); inputs/stronger dividers `#e0e0e0` (Line-2).
- **Cards carry one subtle shadow: `box-shadow: 0 1px 2px 0 rgba(33,33,33,0.08)`** (verified from source). It's a whisper — combined with the light border, not a replacement for it.
- Hover = border darkens to `#bdbdbd`; selected/focused = border `#0d99ff`.
- Heavier effect: `secondary-effect` = `background-blur 4px` + `inner-shadow #FFFFFF99 offset(0.2, 0.1) radius 1` — reserved for floating/glass surfaces, used rarely.

---

## 5. Layout & Grid (baseline width 1440px)

```
┌────┬──────────────────────────────────────────────────────────────┐
│    │  Header (48px): Page title (left) · bell · workspace · avatar │
│ 68 ├──────────────────────────────────────────────────────────────┤
│ px │  Top controls bar (48–52px): segment tabs · [right] search / + │  ← optional
│ nav├───────────────┬──────────────────────────────────────────────┤
│rail│ Contextual    │  Main content (32px h-padding)                │
│    │ panel         │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│    │ 264–288px     │  │  card   │ │  card   │ │  card   │  ← grid  │
│    │ (filters /    │  └─────────┘ └─────────┘ └─────────┘  12px gap│
│    │  categories)  │       (2 or 3 columns)                        │
└────┴───────────────┴──────────────────────────────────────────────┘
```

**Fixed regions (measured):**
- **Nav rail (`Platform panel`):** 68px wide, full height, fixed left. Vertical stack of 24px icons; brand mark top, tools mid, help/docs bottom. Active item = blue-tinted background pill.
- **Header:** 48px tall, `#ffffff`, bottom border `#eeeeee`. Left: page title (`Subhead2/Med`, 16px inset). Right: `User Container` (200×32) = 32px icon button (bell) · workspace dropdown (112×32) · 32px circular avatar, 12px gaps.
- **Top controls bar:** ~48–52px. Left-aligned **segment control** (36px tall). Right-aligned **search** (≈440px wide × 32px, later screens use larger) and/or a **primary button** ("+ New model").
- **Contextual left panel:** **264–288px** wide, 12px padding, eyebrow label in `Caption/Med` uppercase grey. Content is either a filter list (Marketplace: single-select rows with a check), a checkbox provider list (Model Hub), or an expandable category tree (Tools).
- **Main content region:** fills remaining width, **32px** left/right padding.

**Card grid rules:**
- Cards are equal-width, equal-height, top-aligned, wrapping.
- **12px gap** between cards, both axes.
- Column count is responsive to card min-width, **not fixed**:
  - *Compact catalog* (Marketplace, Tools) → **3 columns** (~329px cards at 1440).
  - *Detail-rich* (Model Hub with description + count badges) → **2 columns** (wider cards) or 3 when compact.
- Content may be **grouped into labelled sections** (Tools: "From Cogentiq", "Knowledge & Data sources" with a section icon + title, each its own grid). Model Hub shows a count header ("All models (18)").

**Breakpoint guidance** (design is 1440 baseline): reduce grid columns before shrinking cards — 3 → 2 → 1. Collapse the contextual panel to a drawer below ~1024px. Keep the 68px rail fixed.

---

## 6. Components

### 6.1 Card (the core unit) — exact spec, verified from Figma design context
- **Container:** `#ffffff`, **1px `#f5f5f5` border**, **12px radius**, **16px padding**, **`box-shadow: 0 1px 2px 0 rgba(33,33,33,0.08)`**. Compact height = **131px**; grows with description lines.
- **Structure & gaps (authoritative):** card is `flex-column`. Outer **gap 10px** between the [header + description] group and the tags-row; inside that group **gap 6px** between header row and description; header row is `flex`, **gap 8px**, `align-items:center`. Budget: 16 pad → header 34 → gap 6 → desc 32 → gap 10 → tags 17 → 16 pad = **131**.
- **Anatomy (top → bottom):**
  1. **Header row:** icon tile (left) + text column + optional trailing control (checkbox / `⋯` / hover "Insights").
     - **Icon tile:** **32×32**, ~8px radius, `Gradient/<hue>` fill (a pre-rendered asset from the design-system icon set), white glyph. Hue = item identity. **Not 40px.**
     - **Text column** (`flex-column`, centered) = **title** then **meta row**:
       - **Title:** **14px / 500 Medium / line-height 20 / letter-spacing −0.56px (≈ −0.04em)**, `Text/Primary`. Single line, **ellipsis-truncated** (use `minmax(0,1fr)` grid tracks so it truncates in-track, never overflows the grid). This is `Body2/Med` — **not** 16px.
       - **Meta row** (`flex`, gap 6, items-center): `[★ 12px `#ff8f00` + value]` (gap 2) · **1px × 10px divider `#e0e0e0`** · `[download glyph 12px `#757575` + count]` (gap 2). **All meta text is 10px Regular / line-height 14 / `Text/Teritiary` `#8c8c8c`** (`Caption2/Reg`) — not 12px.
  2. **Description:** **12px Regular / line-height 16 / `Text/Teritiary` `#8c8c8c`** (`Caption1/Reg`), `line-clamp: 2`. Tertiary grey, **not** secondary; 12px, **not** 14px.
     - *Model Hub variant:* description then a row of **count badges** (skills/tools/prompts icons + numbers) + a **model tag** chip (`gpt-4o-new`, `gemini-ultra-2.0`, `Custom`, `Internal`).
  3. **Tags-row** (`flex`, `justify-between`, items-center): tags (left, gap 6) + owner avatar **16px** (right).
- **Tags:** **10px Regular / line-height 14 / `Text/Teritiary` `#8c8c8c`**, background `#f5f5f5` (`Backgrounds/Card/bg-4`), **fully-rounded pill (radius 12)**, padding `1px 6px 2px`. Uniformly neutral (§6.6).
- **States:** hover → border `#bdbdbd` (+ reveal actions like "Insights"); selected → border `#0d99ff`; the checkbox variant supports multi-select.
- **Action-card variant (Tools):** right-aligned **tonal "+ Create" button** in the header, description below, and a `⚙ N actions` meta chip in the footer.

### 6.2 Segment control (primary in-page tabs)
- Track: `#eeeeee`, 8px radius, 4px inner padding, 36px tall.
- Tabs: 28px tall, `Body2/Med`. Active tab = white pill (`#ffffff`, 6px radius, subtle lift), inactive = transparent with `Text/Secondary`; active label may pair with an accent icon (e.g. purple "Agents").
- 4px gap between tabs. Used for the main mode switch ("Explore / Agents / Assistants / Tools / Skills / Guardrails", "Workspace / Marketplace").

### 6.3 Search field
- Two treatments in the system: **(a) catalog search** (the "Search for agents" field on the content header) = **white `#ffffff` fill + 1px `#e0e0e0` border**; **(b) filter/inline search** = `#f5f5f5` fill, borderless. Both: 8px radius, ~32–40px tall, leading magnifier icon (`#757575`), placeholder in `Text/Teritiary`. Right-aligned in the controls bar; width flexes (≈440px baseline).

### 6.4 Buttons
| Variant | Fill | Text | Border | Use |
|---------|------|------|--------|-----|
| **Primary** | `#0d99ff` | `#ffffff` | none | The one key action ("+ New model") |
| **Tonal** | `#e5f4ff` | `#007be5` | none | Secondary CTAs ("+ Create", "Switch to old UI") |
| **Ghost / icon** | transparent | `#757575` icon | none | Header bell, `⋯` menus |
- Radius 8px; height 32px (compact) / 40px (standard). Icon+label gap ~6px.

### 6.5 Contextual left-panel items
- **Eyebrow:** uppercase, `Caption/Med`, `Text/Teritiary`, 12px inset.
- **Filter row (single-select):** 34px tall, optional 16px leading icon, `Body2` label, trailing 16px check (`#0d99ff`) when active.
- **Checkbox row (multi-select):** leading brand/provider icon + label + trailing checkbox (`#ffffff` fill, `#bdbdbd` border, `#0d99ff` when checked).
- **Category tree (Tools):** expandable groups with chevron, colored group icon, indented children.

### 6.6 Badges / tags / pills
- **Tag** (card taxonomy): **10px `Caption2/Reg`, fully-rounded pill (radius 12), `#f5f5f5` bg, `Text/Teritiary` `#8c8c8c`** (verified from source). **Uniformly neutral — there is NO coloured/highlighted tag variant** on cards. Colour on cards lives only in the icon tile.
- **Count badge** (Model Hub): icon + number, 12px, tinted background (e.g. `Backgrounds/Badge/Indigo` `#f4f5ff` with `Text/Coloured- Indigo`).
- **Model tag:** monospace-ish plain chip, grey border/fill, `Caption`.
- **Filter chip** (Tools "Created" / "Tool templates"): fully-rounded pill; active = tonal blue.

### 6.7 Header user cluster
Notification bell (32px icon button; red dot when unread) · workspace dropdown (avatar-letter badge + name + chevron, 112×32) · user avatar (32px circle).

### 6.8 Icons
- Grid: **20px** default UI icons, **24px** in the nav rail, **16px** in body/lists, **12px** for inline meta (rating/download), **32px** for the card gradient tile.
- Default stroke `#757575` (`Strokes/Icon/Default`); accent icons take the item hue. Line style, ~1.5px stroke.
- **Source & sizing rules are in §10 (Iconography).**

---

## 7. Build Checklist (use for every new artifact landing page)

- [ ] Font: **Geist bundled via `@font-face`** (`/fonts`), not a system fallback.
- [ ] Page canvas `#fafafa`; surfaces `#ffffff`; separation via light borders (`#f5f5f5`–`#eeeeee`) + the card whisper-shadow `0 1px 2px rgba(33,33,33,.08)`.
- [ ] 68px nav rail + 48px header (title left, user cluster right).
- [ ] Segment control for mode switching; search right-aligned; **at most one** primary blue button.
- [ ] Contextual left panel 264–288px with an uppercase caption eyebrow.
- [ ] Card grid: 12px gaps, 16px card padding, 12px card radius, equal-height cards, 2–3 responsive columns.
- [ ] Each card (exact, §6.1): `Gradient/<hue>` **32px** tile + **14px/500** title + **12px `Text/Teritiary`** description + **10px** meta (orange star + divider) + footer (10px pill tags + 16px avatar); border `#f5f5f5` + whisper-shadow.
- [ ] Typography = `Geist`; Title `Text/Primary`/Medium, Body `Text/Secondary`/Regular, Meta & card text `Text/Teritiary`.
- [ ] Blue `#0d99ff` for all chrome/selection/links; multi-hue **only** on per-item icon tiles & badges.
- [ ] Hover = border `#bdbdbd`; selected/focus = border `#0d99ff`.
- [ ] Spacing snaps to the 4px scale (4/8/12/16/24/32).

---

## 8. Known variations across the four pages (so the guideline stays honest)

| Aspect | Marketplace | Model Hub | Tools |
|--------|-------------|-----------|-------|
| Left panel | Single-select industry filter (check) | Multi-select provider checkboxes | Expandable category tree |
| Columns | 3 | 2 (detailed) / 3 (compact) | 3 |
| Card body | Rating + downloads + tags + avatar | Description + count badges + model tag + `⋯` | `+ Create` + description + `N actions` |
| Extra controls | — | "Group by", "Created by me", "Admin view", "+ New model", "Switch to old UI" banner | "Created"/"Tool templates" pills, grouped sections |
| Segment tabs | Explore/Agents/Assistants/Tools/Skills/Guardrails | Workspace / Marketplace | Workspace / Marketplace |

These are **content variations on one shell** — the shell, tokens, card mechanics, and spacing are identical and are what this guideline standardises.

---

## 9. Calibration log

**Test 1 — Marketplace (node `1687-430848`).** Built `test-marketplace.html` from this guideline alone, rendered at 1440px, diffed against the Figma frame. Result: faithful match on layout, tokens, colours, and card mechanics. Fixes folded back into the spec above:

| Finding | Correction |
|--------|-----------|
| Cards rendered too tall | Card internal rhythm is **4–6px**, not 8–12px; description line-height ~18 clamped to 2 lines (§6.1). |
| Rating star was grey | Star is **orange `#ff8f00`**; rating & downloads split by a **1px × 12px `#e0e0e0` divider** (§6.1). |
| Title truncated at weight 600 | Card title weight is **500**; single-line + ellipsis; use `minmax(0,1fr)` grid tracks so long titles truncate inside the track instead of overflowing the grid (§6.1). |
| Search rendered solid grey | Catalog search is **white + 1px `#e0e0e0` border**; grey fill is only the inline/filter search variant (§6.3). |
| Tags coloured (incorrect assumption) | Tags are **uniformly neutral grey**; no highlighted variant (§6.6). |

**Test 2 — Marketplace card, authoritative pass (node `1695:433440` via `get_design_context`).** Pulled the card's real CSS/tokens instead of inferring from line-box heights, and bundled the actual Geist font. Corrections folded in:

| Finding | Correction |
|--------|-----------|
| Card had "no shadow, `#eeeeee` border" | Real: **1px `#f5f5f5` border + `box-shadow 0 1px 2px rgba(33,33,33,.08)`** (§1, §4.3, §6.1). |
| Icon tile 40px | Real: **32px** (§6.1, §6.8). |
| Title 16px (`Body1/Med`) | Real: **14px `Body2/Med`** (lh20, ls −0.56) (§3, §6.1). |
| Rating/downloads 12px | Real: **10px `Caption2/Reg`, `Text/Teritiary`** (§6.1). |
| Description 14px `Text/Secondary` | Real: **12px `Caption1/Reg`, line-height 16, `Text/Teritiary`** (§6.1). |
| Tags 12px / 6px radius / secondary | Real: **10px, fully-rounded pill, `Text/Teritiary`, `#f5f5f5`** (§6.1, §6.6). |
| Card gaps ~4–6px uniform | Real: **outer 10 / inner 6 / header 8** (§6.1). |
| Geist not bundled | **Geist now bundled** in `/fonts` via `@font-face` (§3). |

After Test 2 the render is pixel-faithful to the frame. Remaining approximation: the gradient **tile glyphs** are drawn placeholders — production should use the real tile assets / icons from the design system (§10).

---

## 10. Iconography & assets

**Source of truth:** Cogentiq design system — file **`Cogentiq design system`** (`HimR0mebP9NQmNK0LQ9MQC`), page **`↳ Iconography`**
→ https://www.figma.com/design/HimR0mebP9NQmNK0LQ9MQC/Cogentiq-design-system?node-id=496-227152

- **Always take icons from this page first.** It contains ~150 named line icons plus the coloured **AI-assistant / Agents gradient tiles**. Named icons include (not exhaustive): navigation & chrome — Home, Agent, Tool, Tools & skills, Guardrails, Skill, Integrations, Brain, AI assistant, Dashboard, Settings, Users, Notification bell (+ on), Search, Filter, Plus, Close, Tick, Options (vertical); actions — Upload, Edit, Delete, Download, Copy, Share, Save, Undo, Redo, Expand, Minimize, Like/Unlike, Bookmark; providers — Claude, Anthropic, Open ai, Gemini, Mistral ai, Azure Foundry, Hugging face; file types — pdf, docx, xls, csv, ppt, zip, json, html, md, py, js, ts, sql, png, jpg, ipynb, log, txt; misc — Web, Web search, Calendar, Clock, Key, Reload, Trend graph, Message history, Data, MCP, Folder, Cloud storage.
- **Sizes:** icons are authored at **20px** (default) and **24px**; the AI tiles at **Normal 24 / Big 32**. Match §6.8 sizing.
- **Extraction:** pull SVGs via `download_assets` / `get_design_context` on the icon node, commit the exact bytes (asset URLs expire ~7 days). Line icons use stroke `#757575` by default and can be recoloured to an accent hue; gradient tiles are pre-rendered per hue/glyph and are used as-is.
- **Fallback for anything missing:** use **Tabler Icons** — https://tabler.io/icons — matched to the same stroke weight/size, so new glyphs sit consistently with the Cogentiq set.

---

*Tokens transcribed verbatim from Figma variable collections; card spec verified via `get_design_context`; Geist bundled from the design system. Regenerate from source if the Figma library changes.*
