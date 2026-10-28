---
phase: 07-hosting-and-csp-hardening
plan: 02
status: complete
requirements: [SEC-05, SEC-06, SEC-07, VER-06]
actuals:
  tasks: 3
  commits: 6
---

# Phase 7 Plan 2: Every route clean Summary

Seven routes and states load with zero CSP violations under the unchanged policy, wallet text can only ever be text, every export route passes axe in both schemes, and the submit flow completes with the keyboard.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | a7a9149 | Load every route and state under the CSP with zero violations, and drop the unused background video |
| 2 | 5ccd131 | Make wallet text provably inert: lint bans dangerouslySetInnerHTML, a hostile mock walks every route |
| 3 | d253301 | Give the Disconnect buttons the bordered look that passes contrast in the light scheme |
| 3 | 53f2344 | Walk the whole submit flow with Tab, Enter and Space only |
| fix | 5e23333 | Turn off the browser cache in the WalletConnect export spec |

## What exists

- `csp.cy.js` walks home, submit to an outcome, My jobs, a job detail with a result, Earnings, the no-wallet browser path (the WalletConnect module loads) and the 404 page. No source was added to the policy.
- `react/no-danger` is an error, tested through the ESLint API. Profiles `hostileText` (hostile jobs, estimate rejected with a hostile -32602) and `hostileSubmit` (submit rejected the same way) feed `hostile.cy.js` (6 cases). Re-introducing `dangerouslySetInnerHTML` in the estimate panel failed the walk, then was reverted.
- `keyboard-submit.cy.js`: Tab, Enter and Space only, no `.click(`, ending on the focused "Job submitted" heading.
- The existing axe specs already cover every export route and state in both schemes, so none were added. `cypress/dev/relay-a11y.cy.js` runs axe over the seven WalletConnect screens on the dev server in both schemes (manual: the fake relay is not in the export).

## Deviations

- [Rule 1] That run found `btn-outline-secondary` under the contrast threshold in the light scheme. Both Disconnect buttons now use `btn border`, as Cancel does; 14 of 14 states pass.
- [Rule 1] Immutable static files (07-01) made the WalletConnect export spec read chunks from the cache; it now disables the cache.

## Gaps for a human
- Look at the pairing, Wallet offline and Disconnected screens in light and dark with `?gnusWc=`; axe passes, nobody has judged the QR panel by eye.

## Self-Check: PASSED
