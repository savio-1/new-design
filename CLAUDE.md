# CLAUDE.md — context for every new chat

This repo (`savio-1/new-design`) holds the work from ~60 Claude Code chats (Jul–Oct 2026) by **Savio Govindu**, a product/UI designer at **Fractal**. Most of it is for **Cogentiq**, Fractal's agentic-AI builder platform. The rest is creative/animation tools and a few website recreations.

More detail lives in:
- `context/chat-history.md` — one entry per past chat: goal, files, user feedback, links, open items.
- `context/design-system.md` — full Cogentiq token tables, components, layout rules, gotchas.

Read those files when a request touches past work ("continue the monitoring page", "use the same style as the marketplace").

---

## 1. How this repo works

- **One branch per chat.** Every chat's work sits on its own `claude/<name>` branch; nothing is merged and there is no `main`. The default branch is `claude/guideline-html-conversion-zhnsv8` (3 old July pages: `index.html` August Health style reference, `direction-1.html` AlmaConnect hero, `fillout-hero.html`). Every branch carries those 3 files.
- To continue past work, **fetch the branch it lives on** (`git fetch origin <branch>` then `git show origin/<branch>:<file>` or check it out). The tables below and `context/chat-history.md` say which branch has what.
- Some branches have `.claude/skills/` installed: GSAP skills (`greensock/gsap-skills`) and the "caveman" skills (`npx skills add JuliusBrussee/caveman`). Container installs (plugins, MCP servers, skills) do **not** persist between cloud sessions.

## 2. How Savio likes to work (follow these)

**Deliverables**
- Almost always wants a **live link**. Publish a private claude.ai artifact proactively, and **keep updating the same URL**.
- A **variation = a new link.** "Don't change the existing link" is a frequent rule. Never modify a reference artifact they point to unless asked.
- Often asks "give me the html": one **self-contained single HTML file** (assets/fonts inlined, works from `file://`).
- **Dev handoff = a zip** of runnable HTML + split CSS/JS + assets + README/spec md. MD files alone are not acceptable. Hold the handoff until all pages are linked.
- Multi-page modules: **one base page with in-app navigation**, not a separate link per page.
- Comparison boards ("options page") when exploring variations. Keep their intro text minimal: just a heading, then the options.
- Figma: builds directly in Figma through the MCP, "pixel perfect" at **1440px** frame width, using the Cogentiq design system. Has said **"don't ask for permission every time"**; treat Figma design actions in a chat as pre-approved once they say so. Tell them the file name, page and link of anything created.
- Can't use a terminal. Do all git work yourself and give click-only instructions when they must act.
- Don't open pull requests unless asked. Commit messages: short plain-English sentences about the design decision.

**Communication**
- Messages are short and informal with typos; read for intent. If a message looks cut off mid-sentence, ask.
- Feedback arrives as numbered lists with exact px values (6px gap, 14px type, 32px button). **Apply every item literally**, then confirm each.
- References: Figma node links, screenshots, screen recordings, Pinterest pins, websites. For videos, extract frames (`ffmpeg -i in.mov -vf "fps=4,scale=440:-1,tile=4x7" sheet.png`) and look at all of them. "Add all variations" means every distinct design.
- Replies should be short and plain. No jargon (e.g. "say less": one hint, no contrast-ratio talk in UI copy).
- Sometimes says "don't design yet / first confirm with me". Respect that and wait.
- Never overwrite edits they made by hand in Figma.

**Fidelity: the #1 source of frustration**
- When they say "exact", match the reference exactly (fonts, colours, spacing, motion). Don't reinterpret. Past corrections: "I asked for the animation that's in the pinterest pin. Exact one", "You changed the entire design… just replace the content", "the font is changed", "you've just made a scale-in effect, I want the strokes animated".
- The opposite case: when a screenshot is a *wireframe*, apply the design system. Don't copy it literally ("You've just recreated the screenshot").
- Verify changes actually landed before saying done ("re-do, changes not implemented yet", "I don't see anything changed"). Finish whole batches ("only 14 slides are added").
- Check for regressions you introduce (black fills inside icons, hard-coded blue icons, missing details).

**Visual taste**
- Minimal, calm, compact. Remove strokes, dividers, redundant headings, subtext, badges and counts when in doubt. "Too many elements" leads to a revert.
- Typography: **Geist** (UI) and **Geist Mono** (ids, numbers). Tight tracking and line-height on headlines. Only titles in primary/white; supporting text in secondary grey.
- Avatars: **first initial only** (indigo-500), no person names on cards.
- Buttons are rectangles with an **8px radius**, not pills (pills only for tags/compact chips).
- Icons grey/monochrome by default; colour only where it carries meaning.
- Colour from **design-system tokens only**, never invented hex. Subtle gradients, "not completely vibrant"; little pink/magenta; orange is liked. Gradients must have **no hard edges or banding** (fade to the same hue at alpha 0, never to `transparent`); prefer a blurred "hump" edge.
- Motion: **smooth, eased, periodic with rests**, never constant or busy. Shimmer over moving dots. Crossfades, not fade-out/fade-in (Attio-style). Not too fast; it often needs to be ~30% slower. Respect `prefers-reduced-motion`.
- AI surfaces should feel alive: shimmer on the current step, word-by-word streaming, natural narration of real progress ("searching… found 4 definitions"). Progressive disclosure: collapsed by default.
- Light mode must be as polished as dark: watch white-on-white contrast and grey shadow "clouds".
- Copy: natural and crisp. **No em dashes.** Use their supplied wording almost verbatim (fix grammar only). Replace real brand names in demos with made-up ones.
- Fonts in shipped work: free Google Fonts only, never commercial or trial fonts.
- Loves rich control panels on generative/animation tools: sliders **plus** typed number inputs, presets, randomise, alignment guides, multi-layer editing, Alt-drag duplicate, Ctrl+C/V, canvas presets (16:9, 9:16, 1:1, 4:5, custom), export PNG/GIF/MP4/WebM up to 4K.

## 3. Cogentiq: product map

Cogentiq (sometimes "CogentIQ") is an enterprise agentic-AI builder. The AI assistant is **Tiq** ("Ask Tiq", "Write with Tiq"). Demo user: "Hey, Savio". Demo white-label client: **Lattice** ("Agentic AI platform", "Powered by cogentiq").

**Left rail** (68px crunched, 240px open on hover as an overlay, one category open at a time):
Marketplace · Home · **Build**: Automations, Agents, Assistants · **Context Studio** (separately sold offering, "Try" pill; "Give your agents what your company knows.") · **Library**: Tools, Skills, Integrations, Doc store (formerly "C drive"), Context, Model Hub, Guardrails · Evaluate · Monitor (Monitoring) · Resources. Avatar menu: Profile, Personal access tokens (always spelled out), Settings, Forum, Assistant platform.

**The combined product (latest, canonical):** branch `claude/cogentiq-combine-pages-rv39kk`, folder `cogentiq/`, live at https://claude.ai/code/artifact/d8e226d8-7179-4084-b412-b8353781c334 (deep links like `#monitoring`). Pages: `index.html` (Home, "Aurora Crown"), `skills`, `integrations`, `doc-store`, `model-hub`, `automations`, `context`, `monitoring`, `checkpoints`, `leaderboard`, `profile`, `pat-tokens`, `settings` (Appearance with white-label branding: 9 preset colours, stored in `localStorage['cq-brand']`). `cogentiq/README.md` maps each page to its source branch. Several sessions publish to this artifact, so **always rebase on the live version before republishing** and never force.

Pipeline: `port-panel.py` → `inject-shell.py` → `build-shell.py` (bundles all pages as base64 srcdoc frames into the one artifact). Preview: `python3 -m http.server 8000 --directory cogentiq`. Cross-page nav uses `parent.postMessage({cqNav:url})`; the `PAGES` map must list every page.

**Areas outside the combined shell**

| Area | Branch | Entry / notes |
|---|---|---|
| Agents landing + remote (A2A) agent wizard + handoff zip | `gifted-lovelace-6sv7eb` | `agents.html`, `handoff/cogentiq-agents.zip`, reusable `handoff/template/` |
| Ask Tiq / automation builder canvas | `ask-tiq-assistant-screen-krswsl` | `ask-tiq.html` · https://claude.ai/code/artifact/2d4b7fa1-3e46-4145-95e2-43e71d2fe24a |
| Assistants hub (end-user app) | `ai-assistant-page-design-lf4dtg` | `ai-assistants.html` |
| Assistant Builder + Tools-panel HITL settings | `vigilant-hypatia-ma7bbr` | `assistant-builder.html` · https://claude.ai/artifact/1CW1BYRk9gUtVkfCaFHRQA |
| Assistant live-task reasoning + follow-up questions + handoff | `gracious-davinci-l444je` | `claims-assistant-live-task.html` · https://claude.ai/artifact/DxeCjcKDcShnQiUhfHafW9 · spec https://claude.ai/artifact/4gkamfcMeLTYSuJ7MGtpLv |
| Claims Review assistant loading/reasoning (earlier) | `streaming-text-component-gigj7q` | `cogentiq-loading.html` · https://claude.ai/code/artifact/08b227d0-d07e-49fd-a822-b73b38268eeb |
| Marketplace | `vigilant-galileo-5v6j2y` | `marketplace.html` · https://claude.ai/artifact/JoQSbonvnPRj4p6iGcTHLG |
| Enterprise marketing landing page | `clever-carson-un6k35` | `cogentiq.html` · https://claude.ai/artifact/Mmxh8xMDvea3tsTujus1Pm |
| Context Studio module + handoff | `cogentiq-design-page-bkho2s` | `context-studio.html`, `handoff/`, zip |
| Context Studio launch films (Remotion) | `storyboard-animation-ingkdr`, `context-studio-nav-variations-74s193` | `context-studio/`, `launch-film/` |
| Context intro animation (24s loop) | `animation-video-reference-xmmz9z` | `cogentiq-context-intro.html` · https://claude.ai/code/artifact/68918488-0df9-49b1-882d-e227317300af |
| Ontology graph (2 directions) | `context-reasoning-simplify-k3re3d` (ego network + `ONTOLOGY_GRAPH_CONTEXT.md`), `graph-curved-lines-miqpuh` (curved fan) | `ontology-graph.html` · https://claude.ai/code/artifact/b1d1ac55-2bc8-40e4-abca-ca55868931cc |
| Monitoring v1 (Activity/Adoption, checkpoints review modal, leaderboard) | `monitoring-screen-activity-lbl7sp` | `monitoring.html`, `MONITORING-HANDOFF.md` |
| Monitoring v2 (minimal alternative) | `caveman-skills-install-lx8fcy` | `monitoring-v2/` |
| Automations landing + handoff | `automations-page-landing-lg6cn4` | `automations-landing.html`, `automations-landing-handoff/` |
| Automation run / flow animations | `automation-run-animation-ngno9e`, `automation-flow-animation-c7a4nq` | `automation-run.html`, `automation-flow.html` |
| Data Collator node panel | `data-collator-node-redesign-6ug8k2` | `data-collator.html` |
| Homepage variants | `cogentiq-home-page-ak5084`, `gradient-design-refinements-jez1nb`, `landing-page-animations-coape2`, `homepage-gradient-background-5nsx17` (Aurora Crown chosen), `fervent-gates-wpz3ou` (prompt-first) | see chat history |
| Login with animated illustration | `animate-left-illustration-5ogldy` | `cogentiq-login.html` |
| Workspace switcher options | `admiring-knuth-29oir5` | `designs/workspace-dropdown/` |
| Automation gradient icon | `automation-icon-gradients-jyclr6` | `icons/automation-icon.html` |
| Artifact landing-page guidelines | `figma-design-guidelines-z68u27` | `ARTIFACT_LANDING_PAGE_GUIDELINES.md` |
| Design review deck (21 slides, editable, PDF/PPTX export) | `serene-meitner-0pb7e3` (not pushed) | https://claude.ai/artifact/TzHTeSLEQzLrZ61wMVEBGA |

Not built yet: Tools, Guardrails, Evaluate, Resources pages; Monitoring's Usage & Performance and Cost tabs are placeholders.

**Product facts**
- Automations: types **Job** and **Live**; canvas nodes Start → Trigger / Agent / Model / Tool / Code / Decision / Human checkpoint / Data Collator / Action → End. Node colours: Agent indigo, Code cyan, Decision orange, Data Collator purple `#9747ff`.
- Context: types Glossary, Ontology, Data Binding, Tool Binding, Prompts, Rules & Policies; layers **Solution › Organization › Domain** (Solution overrides Org overrides Domain).
- Monitoring tabs: Activity, Usage & Performance, Cost, Adoption.
- Assistant HITL spec: `tools` keyed by `assistant_tools.id`; per tool `verify_input` / `verify_output`; conditions are LLM-judged and fail closed, can only add pauses; mutating SQL always pauses.

## 4. Design system (cheat sheet; full tables in `context/design-system.md`)

- **Canonical CSS:** `design-system/cogentiq-design-system.css` on `claude/cogentiq-combine-pages-rv39kk`. Docs artifacts: Design System https://claude.ai/code/artifact/edb3664e-d248-4a96-9e7b-894bad13157d · Page Guidelines https://claude.ai/code/artifact/32738800-342f-461d-9792-9852122f7dae · Nav guidelines https://claude.ai/code/artifact/78c121d8-096d-4b13-a2f3-581fcc07c03e · Model Hub (origin of the DS) https://claude.ai/code/artifact/e9b6ca99-1c80-499d-b1ed-b1b3fdcceaaf. Raw Figma variable exports: `Dark.tokens.json` / `Light.tokens.json` on `cogentiq-home-page-ak5084`.
- Usage: `<body class="cq">`; **dark is the default**, `<html data-mode="light">` for light; theme in `localStorage['cq-theme']`. Library classes use `cq-*`; page-local classes get their own prefix. Token names mirror the Figma variables (keep the `--text-teritiary` misspelling).
- **Key colours (dark / light):** page bg-1 `#121212`/`#fafafa`, bg-2 `#212121`/`#fff`, bg-3 `#1b1b1b`/`#f5f5f5`; stroke `#424242`/`#eeeeee`; text primary `#fff`/`#121212`, secondary `#bdbdbd`/`#616161`, tertiary `#8c8c8c`. **Only UI accent: Blue/500 `#0d99ff`** (focus `#007be5`). Identity hues: indigo `#5860ed`, purple `#9747ff`, cyan `#35caf0`/`#00a2c2`, green `#14ae5c`, orange `#fc9e24`/`#dd7c0e`, red `#f24822`, pink `#e91e63`, yellow `#ffca28`.
- **Tiq gradient:** `#0D99FF → #5860ED → #F24822 → #FFCA28 → white`. Hero sky shipped: Orange/500 → Red/500 → Blue/500 (`--sky-*`).
- Radius 6 / 8 (buttons, inputs) / 12 (cards, modals) / 14 (prompt bars). Spacing on a 4px base; card gap 12, card padding 16.
- Layout: rail 68/240, sidebar 240, header 48, filters bar 60, detail panel 420, Tiq dock 360. Grids use `minmax(0,1fr)`; `--cq-card-min` 340px gives 3 per row, 430px gives 2.
- Icons: the Figma Iconography page (design-system file node `496-227152`) is the source of truth, Tabler Icons as fallback. Inline `<svg class="sprite">` + `<use href="#ic-…">` with `currentColor`; each file needs its own sprite.
- Motion: hover 150ms ease; panels 260–280ms `cubic-bezier(.4,0,.2,1)`; rail 120–140ms in, 200–220ms out.

**Figma files**
| File | Key |
|---|---|
| Cogentiq--Builder (product screens) | `Cq3g1NA1RzLfySk1EM2n2V` |
| Cogentiq design system (icons `496-227152`, buttons `497-233715`) | `HimR0mebP9NQmNK0LQ9MQC` |
| AI-assistant <> User | `d2Aeg6YIYnO838TlkmAkRP` |
| Cogentiq design system (copy) with the deck slides on Atoms `497:242302` | `PBFDyLHrj2bROH2fh5lCPm` |

Savio has a Full seat in the Fractal Analytics Figma org. Their personal Starter team hits the MCP call limit, so build in the org files. `use_figma` calls can time out at 60s but still apply; read back to verify.

## 5. Build, publish, verify

- Prototypes: a single self-contained HTML file, vanilla JS, no build step (GSAP/Three.js from cdnjs when needed). Support both themes, give `body` a token background, and never hard-code colours. Shape mock data like the future API. Never hand-edit generated files.
- Publishing artifacts: the host wraps the file in its own doctype/head/body, so build scripts strip the scaffolding but keep `<title>` (`build-artifact.js` / `build-artifact.py`). Update in place by URL. If refused because a newer version exists, read it, re-apply only your change, and republish.
- Handoff zip layout: `README.md`, spec md (`HANDOFF.md`/`INTERACTIONS.md`/`docs/01..04`), `reference/*.html` (source of truth), `index.html`, `css/01-tokens 02-system 03-screen`, `js/01-data 02-app 03-theme-shell`, `assets/`, `design/*.png`, `data/*.json` + `schema.md`. Template: `handoff/template/` on `gifted-lovelace-6sv7eb`.
- Verify with Playwright (`executablePath: '/opt/pw-browsers/chromium'`): check both themes, listen for `pageerror`, measure with `getBoundingClientRect` rather than eyeballing, rebuild text measurement after `document.fonts.ready`. Google Fonts failing offline can be ignored.
- Gotchas: `filter` creates a stacking context (popovers end up under cards); `card-bg-5` is white in light mode, so nested tiles need `page-bg-3`; `.cq-btn` `display` overrides `[hidden]`; clicks inside popovers need `stopPropagation`; an undefined CSS var silently kills a gradient; transition replays need a `.no-anim` reset frame; namespace ids when inlining one page into another.

## 6. Other projects

| Project | Branch | Entry |
|---|---|---|
| **Collage Studio** (Instagram collage/Reels editor, ~280 templates; has its own CLAUDE.md + HANDOFF.md) | `charming-mendel-rchh9w` | `studio/index.html` · https://claude.ai/artifact/WSEaiShKsrkDT4mFzVpkES |
| Perspective (3D text over video editor) | `caveman-installation-4z7lal` | `perspective-editor/` · https://claude.ai/code/artifact/584d5a1f-3207-4b42-850a-56dd7fa186f3 |
| Gradient Studio (gradient map + text/image/video layers) | `caveman-installation-qhbun0` | `gradient-studio.html` · https://claude.ai/artifact/53Qg6ZjqYkd2YCfsF7uDQb |
| ImageMotion Studio (30 image animation templates, export) | `image-animation-control-panel-82dtze` | `image-motion/` · https://claude.ai/code/artifact/76a796b2-8d3d-4142-8182-d072b64f2fce |
| Gradient Shape Studio (+ GSAP hover effects) | `shape-generator-interface-g6oby9` | `shape-generator.html` · https://claude.ai/code/artifact/c6a872b3-3ea4-4f3e-ac23-24b58c7be226 |
| Animation Studio (Light Rails clone) | `animation-functionalities-ui-18hpmi` | `animations.html` · https://claude.ai/code/artifact/178eff0b-4d33-4460-ba42-aba70e18def8 |
| Flow Pattern Studio | `pattern-animation-controls-xwbei2` | `pattern-animation.html` · https://claude.ai/code/artifact/c4f538df-b419-49d8-b831-73d8d56a52cf |
| Neon beams (WebGL) | `neon-gradient-animation-71nulo` | `neon-beams.html` · https://claude.ai/code/artifact/ff2da443-d870-463d-b563-7253a3efd517 |
| Prism Trace / triangular light | `triangular-light-animation-xmqa8n` | `triangular-light.html` · https://claude.ai/code/artifact/452dcef9-3eec-4bd8-9e24-566e603d63d9 |
| Glyph Field Studio (ASCII) | `ascii-animation-control-panel-rluj09` | `ascii-animation.html` · https://claude.ai/code/artifact/f7e022ad-24ad-44eb-b660-cf2a9a1732fd |
| Abyssal Descent 3D ocean | `eager-noether-d57tw0` | `ocean.html` · https://claude.ai/artifact/CBjPskATxYfDaxSgyU2c2P |
| Verdance 3D flower-garden scroll site | `lucid-carson-r5hgvx` | `verdance.html` · https://claude.ai/artifact/7qm8qDzi5CoV6qLAXKXpvJ |
| Personal floral-garden love-letter page (mobile) | `sharp-pasteur-7xdpkk` | `floral-garden.html` · https://claude.ai/artifact/6heQynBwVJMCePiDeQiz7Y |
| Eight Wonders 3D globe | `adoring-ritchie-vd3evo` | `wonders/index.html` |
| Alaro smart-camera site | `trusting-archimedes-px8129` | `alaro/index.html` |
| Readback TTS + XTTS-v2 voice cloning | `nifty-hawking-f7k2au` | `audio-generator.html`, `voice/clone_voice.py` |
| Coastal Kodachrome LUT + Emulsion Bench | `film-look-lut-reference-8hsbhr` | `luts/`, `film/emulsion-bench.html` |
| IRU website (React/Vite, GitHub Pages) | `iru-website-react-wtaq5i` | `src/App.jsx` |
| AlmaConnect redesign (turquoise `#00c4b5`, Nunito Sans) | default branch, `higher-life-foundation-redesign-sa33bb` | `direction-1.html`; Figma `qEcoNqSdCDchxK7oCFux9F` |

## 7. Open items / waiting on Savio (as of 2026-10-12)

- **Client nav (Lattice):** six "Powered by cogentiq" credit variations sent (`handoff/nav-credit-variations.html` on `cogentiq-combine-pages-rv39kk`); no pick yet.
- **Assistant Builder HITL:** more Tools-panel changes promised. Open questions: HITL switch in Tools vs Guardrails; keep or clear rules when review is off; remove the demo tools?
- **Automation icon:** pick A/Glow, B/Bleed or C/Prism, then make more variants.
- **Login illustrations:** waiting for more Figma nodes.
- **Storyboard v4 film:** Option A vs B, copy sign-off, real mark/wordmark SVGs, 9:16 cut.
- **Data Collator:** confirm the node's brand colour (invented violet vs purple `#9747ff`) and the full operation catalogue.
- **PAT tokens:** personal vs service tokens.
- **Session-timeout modal (Figma `otQ54rVHiFpo0fjqcKI6z7`):** rebind to the real library; `#949494` text fails AA.
- **Model Hub:** the red tokens are derived from `#f24822`; replace with the real Figma values. Accessibility gaps (focus trap and return, arrow keys).
- Savio said (10-12) they may move to a **new Claude account and new GitHub account**; see `PASTE-THIS-FIRST.md` on `charming-mendel-rchh9w`.
