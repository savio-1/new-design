# Rendered states

Two sources, and they are not the same age.

- **`00*`, `10`, `11`** are rendered from this prototype at 1440×900,
  2× — the built page is ahead of the Figma landing frame (two-up grid,
  corner kind chips, named capability pills, USED BY).
- **`01`–`09`** are exported from Figma, 1440×821, one per state of the
  registration wizard, in the section
  [Remote agent registration — dark](https://www.figma.com/design/Cq3g1NA1RzLfySk1EM2n2V/Cogentiq--Builder?node-id=3705-150833).

| File | What it shows |
| --- | --- |
| `00-agents-landing-dark.png` | the page, dark, card view |
| `00b-agents-landing-light.png` | the same in the light theme |
| `10-detail-panel.png` | the drawer: named tools, skills, guardrails, and USED BY |
| `11-list-view.png` | the list view, which keeps the run status the cards drop |
| `01-details.png` | step 1 — name and description |
| `02-connection-direct.png` | step 2 — three routes, "Connect it directly" selected by default |
| `03-integration-list.png` | step 2 — the integration list open, with New integration |
| `04-new-integration.png` | the nested New integration modal over the dimmed wizard |
| `05-review-direct.png` | step 3 — preview, Agent Card JSON, connection facts |
| `06-connection-a2a.png` | step 2 — the A2A server list open |
| `07-review-a2a.png` | step 3 — card dropdown, authentication, the fetched card |
| `08-connection-plain-api.png` | step 2 — spec uploaded and validated |
| `09-review-plain-api.png` | step 3 — the agent the adapter generated |

The Figma frames show the wizard over the *older* three-up landing page,
because that frame is what exists in the library. Read the modal from
Figma and the page behind it from `00-agents-landing-dark.png`.
