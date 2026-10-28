---
phase: 03-connect-and-identity
plan: 06
status: complete
requirements: [CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CONN-09, CONN-10, CONN-11]
actuals:
  tasks: 2
  commits: 2
---

# Phase 3 Plan 6: Accessibility sweep Summary

Every screen and banner phase 3 adds has zero axe WCAG 2.1 A and AA violations in light and dark, each scheme proven applied, and the connect recovery works by keyboard.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 599bc1e | Sweep every state with axe in light and dark; fix lang, social link names, form and brand colours |
| 2 | 6ea1a4b | Keyboard walk: Tab to Connect again with a visible focus ring, Enter reconnects, tab order of the header |

## What exists

- `cypress.config.js` has a node task that returns the text of `axe-core/axe.min.js` (4.10.2, already in the tree); `a11y.cy.js` injects it into the page under test only, with no rule disabled.
- 12 states times 2 schemes: ready home, connecting, denied, starting up, update GeniusWallet, GeniusWallet required, not responding, failed, switching banner, wrong-network banner, copy-failed field, 404. The scheme is set through `Emulation.setEmulatedMedia`; each run asserts `matchMedia` agrees and the body is `rgb(255, 255, 255)` in light and `rgb(0, 0, 0)` in dark.
- Keyboard: Tab reaches Connect again within 15 presses, it matches `:focus-visible` with a 2px outline, Enter starts the prompt; on the ready page Tab visits the brand, both copy buttons, then Submit a job, My jobs, Earnings.

## Fixes the sweep forced (no colour outside the planned set)

- `<html lang="en">` through a new `pages/_document.tsx`; `aria-label` on the seven social links.
- Brand and menu toggle use the emphasis colour (the toggler was 4.2:1 on black).
- `.form-control`, `.form-select` and `.form-label` were fixed white on translucent black; they now read the mode-aware body colours with a `--fc-secondary-color` border. `$border-color` was white; it is now gray-300 (gray-700 in dark).

## Deviations

- Files beyond the plan: `_document.tsx`, `Socials.tsx`, `_form.scss`.
- The spec sets the scheme inside the command queue (`cy.then`), not at definition time.

## Gaps for a human

- Open the dev server with the mock in light and dark and look at the header, a state screen, both banners and the footer. Inside the real wallet this waits on wallet v4.0 phases 43 and 44.

## Self-Check: PASSED
