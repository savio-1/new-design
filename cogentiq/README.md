# CogentIQ — combined product

**Live link:** <https://claude.ai/code/artifact/d8e226d8-7179-4084-b412-b8353781c334> —
every page in one place, switched via the platform rail.

The CogentIQ pages, built in separate sessions, combined into one navigable product.
Open `index.html` (the Homepage) and use the left platform rail to switch pages:

| Rail entry | File | Source branch |
| --- | --- | --- |
| Home | `index.html` | `claude/cogentiq-home-page-ak5084` |
| Library → Skills | `skills.html` | `claude/agent-skills-display-rtnlpv` |
| Library → Integrations | `integrations.html` | `claude/integrations-page-logo-banner-1br4l4` |
| Library → Doc store | `doc-store.html` | `claude/tender-ptolemy-05du00` |
| Library → Model Hub | `model-hub.html` | `claude/model-hub-page-80b7di` |
| Build → Automations | `automations.html` | added later, from the published artifact |
| Library → Context | `context.html` | added later, from the published artifact |
| Monitor → Monitoring | `monitoring.html` | added later, from the published artifact |

`checkpoints.html` and `leaderboard.html` ship too but have no rail row of
their own; they are reached from inside the pages that link them.

Each page is fully self-contained (no external assets). A small script appended to
each file wires up what spans pages: the platform rail's buttons route to the
sibling files, the cogentiq wordmark links back to Home, and the light/dark
choice is shared — switch it on any page and every other page opens that way.

`build-shell.py` bundles every page in this folder into the single published
artifact, and `inject-shell.py` writes the shared chrome into each of them --
rail routing, the theme choice and the profile menu. Both walk the folder, so
adding a page here is enough; nothing lists the pages by hand.
Inside that shell the theme lives in the shell itself (srcdoc frames each get
their own opaque storage) and page switches run as a sequential dissolve.

`design-system/` holds the handoff pages, generated from `cogentiq/model-hub.html`
by `build-nav-guidelines.py` and `build-design-system.py` — edit the page, then
rebuild; never edit the generated HTML.

To view locally: `python3 -m http.server 8000 --directory cogentiq` and open
<http://localhost:8000/>. Opening the files directly from disk also works.
