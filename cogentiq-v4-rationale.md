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
| **The 2-page overview, "What is Cogentiq?"** (`cogentiq-overview.pdf`). It asks for a work email only, then downloads at once and sends a copy by email. | Most visitors aren't ready for a call. One field is the lowest barrier there is, and the instant download rewards them right away. |
| One document everywhere (hero, after the cost curve, after the tour, governance, the nudge and the header). | One clear offer instead of several briefs. |
| The demo request now needs only an email. "What would you like to see?" is optional. The request is recorded at step 1, and name, company, role and stage come afterwards as optional details, with a Skip button. | Every required field loses people. Taking the request at the email means no lead is lost if someone leaves at step 2. |
| One gentle nudge per visit, past the middle of the page, offering the overview. It doesn't show to anyone who has already asked for something, and it can be closed. | Catches interested readers before they leave, without getting in the way. |

## 4. A lighter page with clear hierarchy

| Change | Why |
|---|---|
| Hero order: headline → one sentence → two buttons → overview link → then, below a divider, the proof (four quiet keywords and the security badges). | The keyword pills and the buttons were competing for attention. Separating them gives one clear focal point, the buttons. |
| Keywords cut from 6 to 4 ("Enterprise grade" and "Built to scale" removed) and shown as plain text instead of bordered pills. | Less visual weight. The four left are the specific ones. |
| "Illustrative and synthetic data" appears once per group of visuals instead of on every card (removed 10+ times). | The same caption on every card was visual noise. |
| More space between each section's intro and its content, and narrower intro lines. | Gives the eye room, without adding length or changing the layout. |
| Blog and videos moved below the demo form. Navigation is in story order and highlights the section in view. A "Where do you want to start?" choice sits under the hero. | The page ends on the ask. Visitors can jump straight to what they came for. |

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
