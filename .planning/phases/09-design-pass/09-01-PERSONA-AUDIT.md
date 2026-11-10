# 09-01 — Persona audit (evidence for the design pass)

Screenshots: http://slave:8099/2026-11-10/140035-ui-*.png (mock wallet, populated
profile, desktop 1400px + mobile 390px, 2026-11-10). Critiques gathered page by
page; consolidated per persona.

## 🫣 Beginner
- "Earning as / Paying from" is architecture language; the landing explains it
  only as quoted jargon and still needs the sentence to make the header readable.
- "Network: staging, chain 80002" leaks environment labels and means nothing.
- The job form opens on a raw JSON textarea with no guidance about what a job is.
- No faucet, no onboarding: a new user with 0 GNUS can do nothing and nothing
  tells them that up front.
- Copy feedback exists (good) but reads as an underlined 2003 link.

## 🧙 Expert
- Two-step flows have no step affordance (paste → estimate → pay are three
  disconnected lumps; the estimate result has no place to appear).
- Stale validation error survives input edits; error/success/disabled states
  carry no colour semantics.
- Paying and earning identities are jammed into one header row with nav — no
  grouping, no wallet menu, no disconnect affordance on the WC path header.
- Manual Refresh sits next to a timestamp, implying it refreshes the timestamp.
- No active nav state; no way to tell which page you are on.

## 🎨 Designer
- `$primary` mint #36edb5 with white text fails contrast; the same mint paints
  links, nav, buttons and footer — the accent is spent everywhere at once.
- Hot-pink-ish addresses (the code element styling) fight the teal; nothing
  bridges them.
- No type scale beyond bootstrap defaults; labels bold + values regular
  inverts the emphasis on data pages.
- Pages are left-hugging with 40-85% dead space; no max-width column, no
  centred empty states, two bare `<hr>`s stand in for an earnings history.
- Footer socials are visually heavier than any primary action.

## 🔧 QA/Ops
- Stale drawer state survives close/open (pairing sheet input + error text).
- Empty states have no structure to grow into (no list/table skeleton).
- Environment label ("staging") shown unconditionally — needs a dev-only flag.
