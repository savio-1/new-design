# Platform panel

The left navigation, extracted verbatim from the published component
(artifact 6761014c) and dropped into every page by `../port-panel.py`.

| part | what it is |
| --- | --- |
| `rail.css` | the panel, its offer card and the big view |
| `rail.html` | the markup, before the two local amendments below |
| `rail.js` | open/peek, one-group-at-a-time, entitlements, the offer |
| `deps.js` | the offer card' preview film: a built clip, 14 stills and a webfont |
| `sprite.svg` | the symbols the markup references |
| `upsell.html`, `filmbox.html`, `gsap.html` | the offer card, the big view, the one dependency |
| `tokens.css` | the component' own token block — unused, every page already has these |

Two amendments the component predates, applied by the port:
the `C drive` row reads `Doc store`, and `Monitor` has a `Monitoring` row.

`deps.js` is 494KB of the 545KB — the film ships only where it already
ran (model-hub); the other nine get the same card without the media well.
Copied ten times it put every page near a megabyte and the shell began
revealing documents that were still parsing.
