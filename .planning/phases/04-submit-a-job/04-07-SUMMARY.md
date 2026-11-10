---
phase: 04-submit-a-job
plan: 07
status: complete
requirements: [DEF-05, EST-02, EST-03, EST-04, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07, SUB-08]
actuals:
  tasks: 2
  commits: 1
---

# Phase 4 Plan 7: Submit accessibility sweep Summary

Every submit state has zero axe WCAG 2.1 A and AA violations in light and dark, outcomes take focus on their heading, and the paid-but-not-processed banner stays an alert.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1, 2 | c4e49d1 | Sweep every submit state with axe in light and dark; neutral secondary buttons, outcome banner without a tinted background |

## What exists

- `a11y-submit.cy.js`: 17 states times 2 schemes (empty, invalid JSON, preview, estimate loading, Price unavailable, Not enough GNUS, Gas not estimated with no paying wallet, stale, storage message, Confirm with the Cancel note, reject, Job submitted, Paid but not processed, Payment not confirmed, Payment status unknown, Waiting after a reload, no-record note), each scheme proven by `matchMedia` and the body background, no rule disabled.
- Focus and announcement checks: the h2 of four outcomes and the Waiting screen holds focus; the banner is still a visible `role=alert` after 10 s; the confirm and the other outcomes are `role=status`; input and submit error lines are alerts.

## Fixes the sweep forced

- `btn-outline-secondary` is the theme's bright green on white (contrast fail in light); secondary buttons are now `btn border`, which follows the body colours in both schemes.
- The Paid but not processed banner dropped `alert-warning`: the burn hash `<code>` is pink and failed on the tint. It is a bordered box with `border-warning` now.

## Deviations

- Both tasks live in one spec file and the fixes touched the same components, so they are one commit. No theme file changed.

## Gaps for a human

- Open the dev server with the mock (`NEXT_PUBLIC_GNUS_MOCK=1`) in light and dark and look at the form, the estimate, the confirm screen and the Paid but not processed banner; axe does not judge layout. The keyboard-only walk of the submit flow is phase 7 (VER-06).

## Self-Check: PASSED
