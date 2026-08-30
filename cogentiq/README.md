# CogentIQ — combined product

**Live link:** <https://claude.ai/code/artifact/d8e226d8-7179-4084-b412-b8353781c334> —
all five pages in one place, switched via the platform rail.

The five CogentIQ pages, built in separate sessions, combined into one navigable product.
Open `index.html` (the Homepage) and use the left platform rail to switch pages:

| Rail entry | File | Source branch |
| --- | --- | --- |
| Home | `index.html` | `claude/cogentiq-home-page-ak5084` |
| Library → Skills | `skills.html` | `claude/agent-skills-display-rtnlpv` |
| Library → Integrations | `integrations.html` | `claude/integrations-page-logo-banner-1br4l4` |
| Library → Context / Doc store | `doc-store.html` | `claude/tender-ptolemy-05du00` |
| Library → Model Hub | `model-hub.html` | `claude/model-hub-page-80b7di` |

Each page is fully self-contained (no external assets). A small script appended to
each file wires the shared platform rail's buttons to the sibling page files, and
the cogentiq wordmark links back to Home.

To view locally: `python3 -m http.server 8000 --directory cogentiq` and open
<http://localhost:8000/>. Opening the files directly from disk also works.
