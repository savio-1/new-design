# Data contract

Two collections. Both JSON files in this folder were **dumped from the running
reference screen**, so they are exactly what it renders — not a transcription.

## Automation — `automations.json`

| Field | Type | Notes |
|---|---|---|
| `name` | string | Card title and table row name. Truncates with ellipsis. |
| `type` | `"Job" \| "Live"` | How it was published — the publish dialog's *Run automation as*. Drives the footer chip and the sidebar TYPE filter. |
| `desc` | string | One sentence. Card clamps to 2 lines, table to 1. No length limit needed — both truncate in CSS. |
| `status` | `"Active" \| "Paused" \| "Draft"` | Table Status column; `Paused` also drives the card flag. |
| `hue` | string | A CSS var **name as a string**, e.g. `"var(--text-coloured-indigo)"`. Used only as a key into `WASH` — see below. |
| `pending` | integer | Runs currently awaiting human approval. `> 0` drives the `Awaiting approval` flag, the `Review N` button and the panel's AWAITING APPROVAL section. |
| `trigger` | string | Human-readable, e.g. `"Email received · AP inbox"`. Panel only. |
| `schedule` | string | Human-readable, e.g. `"Every hour, :05"`. Panel only. |
| `by` | string | Owner's display name. Avatar shows `by[0]` uppercased. |
| `tags` | string[] | **0, 1 or 2** in the reference. Each must have an entry in `TAG_TONE` or it falls back to blue. |
| `runs` | integer | Runs in the last 7 days. `0` renders as `—`. |
| `ok` | number | Success rate, percent, one decimal. Tinted green ≥ 97, orange < 92. |
| `avg` | string | Pre-formatted, e.g. `"1m 12s"`. `"—"` when never run. |
| `cost` | string | Pre-formatted, e.g. `"$0.06"`. |
| `last` | string | Pre-formatted relative time, e.g. `"7m ago"`, `"just now"`, `"never"`. |
| `lastN` | integer | The same last-run time **in minutes**, for sorting and for the running test. Drafts use `999999`. |
| `created` | string | Display date. Panel only. |
| `version` | string | e.g. `"v14"`, or `"draft"`. Panel only. |
| `steps` | Step[] | Panel's checkpoint count only — the card and table no longer draw the flow. |

### Step

| Field | Type | Notes |
|---|---|---|
| `k` | StepKind | See `enums.json` → `stepKind`. Only `"checkpoint"` is load-bearing on this screen; the rest are carried for the builder and the sibling canvas screen. |
| `l` | string | Short label. |
| `s` | string | Short sub-label / config hint. |

### Derived, never stored

```js
isRunning(a)  =  a.status === 'Active' && a.lastN <= 5
cpCount(a)    =  a.steps.filter(s => s.k === 'checkpoint').length
```

Sidebar counts, the tab count and the footer total are all computed from the
collection at boot. Don't ship them as fields.

### `hue` and the wash

`hue` is a lookup key, not a colour to render. `WASH` in `js/screen.js` maps it
to the gradient's two stops as **space-separated RGB components** plus the
mark's ink for each theme:

```js
'var(--text-coloured-indigo)': { one: '88 96 237', two: '151 71 255',
                                 ink: '#454de0', inkD: '#c2c5fa' }
```

Triplets rather than hex because every gradient stop is
`rgb(<triplet> / <alpha>)` — see HANDOFF §5.2 for why that matters. If your
backend would rather send a semantic name (`"indigo"`), swap the keys; just
keep one stable hue per automation so a card's colour doesn't change between
renders.

## Template — `marketplace.json`

Same shape as an automation minus the operational fields, plus:

| Field | Type | Notes |
|---|---|---|
| `cat` | string | Category. Drives the sidebar CATEGORY group and the head badge. |
| `by` | string | **Publisher**, not an owner. |
| `installs` | integer | Rendered by `fmtInstalls` → `4.2k installs`. |
| `updated` | string | Display date, panel only. Also the `Recently updated` sort key — parsed with `Date.parse`, so keep it parseable. |

Templates have no `status`, `pending`, `runs`, `ok`, `avg`, `cost`, `last`,
`lastN` or `version`, and carry **no flag**.
