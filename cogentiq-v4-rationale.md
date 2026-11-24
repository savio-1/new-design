# Cogentiq page, variation D: what changed and why

`cogentiq-v4.html` is a refined version of the current design (`cogentiq-v3.html`, unchanged). The colours, typography, components and animations stay the same. The copy was tightened, not rewritten.

**Priorities, in order**
1. Search visibility (SEO), including AI assistants and answer engines.
2. More enquiries and demo requests.
3. As little friction as possible before someone shares their details.
4. A lighter, easier-to-scan page with a clear visual hierarchy.
5. Measurement, so every change can be judged on data.

## What the decisions are based on

**Analytics, Nov 4 to 18:**
- 389 visitors and 491 pageviews.
- 70.7% bounce rate.
- 63 clicks on calls to action. 56 of them (89%) were "watch" clicks (34 on the floating product tour button, 22 on the hero video). Only 2 were "Book a demo".
- Reading: visitors are curious, but the page doesn't turn that curiosity into a request, and there was no step lighter than a sales call.

**Audit of the live page** (fractal.ai/products/cogentiq):
- Section titles aren't marked as headings. Subtext lines are tagged as section headings (H2) instead, one of them six times.
- Most text appears twice in the code because Framer keeps separate desktop and mobile copies.
- 63 of 64 images have no description (alt text).
- The only structured data is "Organization".
- There's no `llms.txt`.
- "Book a demo" goes to the general contact form, so Cogentiq enquiries can't be told apart from other enquiries.

## 1. SEO and AI crawlers (the top priority)

| Change | Why |
|---|---|
| Title: "Cogentiq: Enterprise Agentic AI Platform \| Fractal". Meta description (152 characters) starts with a plain definition. | Leads with the main search phrase ("enterprise agentic AI platform"). The description fits Google's limit, so it isn't cut off. |
| Canonical link, a robots tag, and full link-preview tags for LinkedIn and X, using the share image the live page already uses. | One official URL for search engines, and correct previews when the page is shared. |
| Structured data (schema.org): Organization, WebPage, BreadcrumbList, SoftwareApplication (with the five steps listed), and FAQPage (all 25 questions). | Tells Google and AI tools what Cogentiq is, where it sits in the site and what it answers. The FAQ can earn extra space in search results and is what answer engines quote. |
| The FAQ is written into the page itself, not drawn by script. | Many AI crawlers don't run JavaScript. Before, they saw none of the 25 answers. |
| Removed the hidden "Variation A" copies of the H1, headings, a card grid and a whole section. | Crawlers read hidden duplicates, which diluted the page's meaning. The H1 used to read as two headlines run together. |
| Heading order fixed: one H1, an H2 per section, H3 for cards. The hero diagram's labels are now plain labels, not headings. | A clean outline helps search engines and AI tools split the page into sections. The diagram labels used to read as headings like "Agent control plane 1Govern". |
| A one-sentence definition under the H1: "Cogentiq is Fractal's agentic AI platform for building, running and governing enterprise agents on the systems you already run." | This is the sentence AI assistants and search snippets lift. It also tells a first-time visitor what the product is, which helps the bounce rate. |
| Section headings now use the words people search with, keeping the same intent: "Why AI agent pilots stall", "See an enterprise agent run, end to end", "What the agentic AI platform does", "AI agent governance on every run, by default", "Cloud agnostic: AWS, Azure or Google Cloud", "Agentic AI solution packs, by function and industry", "Cogentiq FAQ: what a buying committee asks". | Each heading now carries a search phrase without changing the message. |
| One name for each step everywhere: connect, contextualize, build, run, govern. | The copy said "understand" in one place and "Context" in another. Consistent names help readers and AI tools. |
| Internal links to 9 live Cogentiq solution pages, 3 case studies, 2 articles, the AWS Marketplace news, the Resource Hub and the real legal pages. Each solution pack links to its product page (for example Finance → Cogentiq Invoice to Cash). | Turns this page into the hub of the Cogentiq family, so link value flows between the pages and crawlers find them. |
| Real case studies and articles replace the placeholders ("Case study headline, up to 80 characters", posts linking to `#`). | Placeholder text and dead links hurt credibility and SEO. |
| A draft `llms.txt` for the root of fractal.ai. | A plain-text map of Cogentiq for AI assistants. fractal.ai currently has none (it returns "not found"). |

## 1a. Governance, monitoring and observability

**Why add it:** the live page never says "monitoring" or "observability". Buyers search for these terms ("AI agent observability", "agent monitoring", "agent tracing", "AI governance platform"), and every competing platform covers them.

**What the research shows** (11 vendor pages read: Datadog, Arize, LangSmith, W&B Weave, Salesforce Agentforce, Microsoft Foundry, IBM watsonx.governance, Credo AI, Dynatrace, Databricks, Dataiku):
- They split the topic three ways:
  - governance is control and risk
  - monitoring is performance over time
  - observability explains a single run
- Platform vendors cover it as a pillar of the platform page rather than a separate page.
- Vendors without strong product screens use pillars, lifecycle loops and stylised diagrams.
- The main risk is showing an invented dashboard or invented numbers.

| Change | Why |
|---|---|
| The section is labelled **"AI agent governance, monitoring and observability"** (for search), above a stronger heading: **"Full control and full visibility of every agent"**. The earlier animated checkpoint flow was removed because it told one example agent's story. | It extends the section people already reach instead of adding a page. The label carries all three search terms; the heading carries the benefit. |
| The four governance cards become **three pillars: Govern, Monitor, Observe**, each with one promise and four specifics. The old cards' content (policy inheritance, least privilege, evaluations, cost limits) is kept inside the pillars. | The same split buyers see on competitor pages, without making the section any longer. |
| **"Every run, traced end to end":** a generic, stylised run trace (request, retrieval, tool call, policy check, human approval, response, audit trail). Steps draw in order; labelled illustrative; links to the product tour's monitoring view. | Shows observability without a product screenshot and without any example agent or process, so it reads as capability. |
| Three new FAQ answers: the difference between governance, monitoring and observability; how agents are monitored in production; whether you can see why an agent made a decision. They're also in the FAQ structured data. | AI answer engines quote clear question-and-answer pairs, and these target the new search terms. |
| The Govern platform card and the structured data's feature list now name monitoring and run traces. Pillar copy is three short points each. | The same terms everywhere, and less text to read. |

**Please confirm before launch:** that alerts on drift, latency and blocked runs, step-level run traces, and cost per agent, team and workspace are all available or on the near-term roadmap. The page states them as current capabilities.

## 1b. Hero: the buttons are visible without scrolling

- Before this round, the buttons sat 673–728 px down on a 1366×768 laptop. With the browser toolbar, that's below the fold.
- Now they end at about 550 px at every common laptop size (1280×720 to 1920×1080). Changes:
  - less padding above the hero
  - a smaller logo
  - a wider headline (three lines instead of four)
  - the text column aligned to the top instead of centred against the diagram
- The keywords and security badges below the buttons now have room to breathe:
  - a divider with 56 px of space above it
  - the three pills now sit under the headline, in the live page's style
  - wider gaps between the badges

## 1b+. Latest refinements

- **Hero link:** "Get the platform overview" (with a document icon) and one line on what's inside replaces "Not ready to talk?". It offers something of value instead of assuming the visitor isn't ready.
- **Proof row:** the keywords and badges now sit closer to the buttons.
- **After the cost curve:** "Why the curve flattens: every new agent reuses the connectors, context and controls already in place…", followed by the demo and overview. It's generic, not a promise to tailor the curve to each visitor.
- **End of the tour:** the message is on the left and both buttons on the right.
- **Before-and-after report:** `cogentiq-v4-improvements.pdf` compares today's live page with variation D, using the data behind each change.

## 1c. The 2-page overview is now business-led

- "How Cogentiq helps your business" replaces the problem-led version. It covers:
  - what Cogentiq is
  - four things it does for a business
  - how it works in five steps
  - what it gives each team
  - where it helps, by function and industry
  - governed, monitored and observable by default
  - enterprise readiness
  - three steps to start
- It uses the page's own wording and invents no figures.

## 2. More enquiries and demos

| Change | Why |
|---|---|
| The hero's main button stays "Book a 30 minute demo", now larger, with more space around it, a soft shadow, and full width on phones. "Watch the product tour" is the second choice. | The demo should be the first thing the eye lands on. The tour stays because the data shows people want it. |
| A demo ask at the end of the product tour ("That was one claim, end to end"), after the cost curve, and after governance (a review session for risk teams). | This is where interest peaks: 89% of clicks were "watch" clicks, so the ask goes where watching ends. |
| The floating button switches from "See it run" to "Book a demo" once the tour has been seen, and hides where it would repeat buttons already on screen. | The most-clicked element on the page (34 clicks) now leads to a demo once it has done its first job. |
| "Discuss this pack" on each solution pack opens the demo form with that pack already filled in. | Visitors who know their use case go straight to a pre-filled request. |

## 3. Minimal friction before people share their details

| Change | Why |
|---|---|
| **The 2-page overview, "How Cogentiq helps your business"** (`cogentiq-overview.pdf`). It asks for a work email only, then downloads at once and sends a copy by email. | Most visitors aren't ready for a call. One field is the lowest barrier there is, and the instant download rewards them right away. |
| One document everywhere (hero, after the cost curve, after the tour, governance, the nudge and the header). | One clear offer instead of several briefs. |
| The demo request now needs only an email. "What would you like to see?" is optional. The request is recorded at step 1, and name, company, role and stage come afterwards as optional details, with a Skip button. | Every required field loses people. Taking the request at the email means no lead is lost if someone leaves at step 2. |
| One gentle nudge per visit, past the middle of the page, offering the overview. It doesn't show to anyone who has already asked for something, and it can be closed. | Catches interested readers before they leave, without getting in the way. |

## 4. A lighter page with clear hierarchy

| Change | Why |
|---|---|
| Hero order: headline “Intelligence is universal. Your business isn’t.” → subtext “Your Enterprise. Your Harness. Your Advantage.” → three pills → two buttons → overview link → then, below a divider, the security badges. | A distinct brand message first; the buttons stay the clear focal point and end at about 500 px on a 1366×768 laptop. |
| Three pills in the live page's style (amber Lato tags on a faint slate tint): Enterprise grade, Built to scale, Ontology grounded. The plain definition of Cogentiq now lives in the title, meta description, structured data and the first FAQ answer rather than the hero. | Keeps a design the team likes. Note: the H1 no longer contains “enterprise agent platform”, so the title tag and description carry that keyword. |
| "Illustrative and synthetic data" appears once per group of visuals instead of on every card (removed 10+ times). | The same caption on every card was visual noise. |
| More space between each section's intro and its content, and narrower intro lines. | Gives the eye room, without adding length or changing the layout. |
| Blog and videos moved below the demo form. Navigation is in story order and highlights the section in view. The "Where do you want to start?" block was removed: it repeated the navigation without adding value. | The page ends on the ask, with fewer blocks to scroll past. |

## 5. Measurement

Every call to action pushes an event to Google Tag Manager, which already runs on the live site:
- `cta_click`, labelled with which button and where it sits
- `section_view`
- `tab_switch`, for the cost-curve tabs and the tour tabs
- `faq_open`
- `overview_open` and `overview_request`
- `demo_request`, `demo_details` and `demo_details_skipped`
- `pack_select`
- `nudge_shown` and `nudge_dismissed`
- `float_cta_switch`

Adding `?debug-events` to the URL prints them in the browser console. Suggested key events (conversions) in Google Analytics: `demo_request` and `overview_request`. **Suggested two-week target:** demo requests at 1–2% of visitors (from about 0.5% clicking "Book a demo" now), plus overview requests as a second, lighter conversion.

## What did not change

- Colours, fonts, components and the animated visuals.
- The section structure (only reordered).
- The copy's message. Edits are limited to headings, one new sentence, two FAQ answers and short captions.

## Before launch: decisions and site-wide fixes

1. **The pen-test badge:** the live page says "Pen tested by The SecOps Group", while this design (as requested earlier) says UltraViolet Cyber. Confirm which is correct; the overview PDF uses UltraViolet Cyber.
2. **Connect the forms.** The overview and demo forms are front-end only. Send them to your CRM or email tool, and host `cogentiq-overview.pdf` on the site.
3. **Duplicate titles across the site.** Several live Cogentiq pages share the generic title "Enterprise AI Solutions & AI Consulting Services | Fractal Analytics": both Underwriting pages, Digital Commerce, Campaign Assist and all three case studies. Give each a unique title and description.
4. **In Framer:**
   - set each heading's tag on its text layer
   - use one responsive text layer instead of separate desktop and mobile copies
   - add alt text to every image
   - paste the structured data into the page's custom code (head)
   - set the title and description in the page's SEO settings
5. **Publish `llms.txt`** at https://fractal.ai/llms.txt.
6. **Confirm these claims** before they go in the PDF and on the page:
   - "Agent twelve costs less to build than agent two did"
   - "six to eight weeks" to a first production agent (FAQ)
   - the certification and security-questionnaire availability under NDA
7. **Remaining placeholders:** the Recognition section (client logos and awards) and the video thumbnails still need real content.
