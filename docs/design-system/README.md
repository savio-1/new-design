# AlmaConnect design system — repo mirror

The canonical `almaconnect-design` skill lives in the account's **synced** skill
directory (`~/.claude/skills/synced/almaconnect-design/`), which is outside this
repo — so nothing there is version-controlled, and a future sync can overwrite it.

This directory is a committed mirror taken at the time of the last update, so the
work survives. `assets/css/almaconnect.css` at the repo root is the **canonical
stylesheet** — `references/almaconnect.css` here and in the skill are copies of it.

If you change the design system:
1. edit `assets/css/almaconnect.css` and `docs/design-system/SKILL.md` here,
2. copy both into the synced skill directory,
3. commit.

`styleguide.html` at the repo root renders every class in the stylesheet — open it
to check a change end to end.
