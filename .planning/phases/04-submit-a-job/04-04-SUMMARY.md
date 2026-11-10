---
phase: 04-submit-a-job
plan: 04
status: complete
requirements: [EST-01, EST-02, EST-03, EST-04, EST-05, DEF-05]
actuals:
  tasks: 3
  commits: 3
---

# Phase 4 Plan 4: Estimate states Summary

Every estimate outcome has its words and its effect on Pay and submit, and amounts above 2^53 compare and show exactly.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 7b4098c | Compare base units as integers with exceeds() |
| 2 | af4a095 | Estimate states: price unavailable, not enough GNUS, null gas and balance, stale job, session reports |
| 3 | 344805a | Walk every estimate profile on the export |

## What exists

- `exceeds(amount, limit)` in `amount.ts`, the only place BigInt is used.
- Store: `stale` estimate state after an edit; `insufficient(estimate)`; `submitBlocker` returns the `-32012` message (`no_wallet` when the payer address is null) or `""` when the page already says why; 4100 and 4900 from an estimate go to the session, nothing else does.
- Panel: "Price unavailable" with the wallet's reason as text, "Not enough GNUS" with both amounts, "Balance not available", "Gas not estimated", `-32602` as errors.ts's words plus the wallet's text, "The job changed. Estimate again before you submit."
- Cypress `submit-estimate.cy.js`: today, costUnavailable, insufficientBalance, allNulls, bridgeUnavailable, bigAmounts, edit then re-estimate.

## Deviations

- None from the plan. `failing()` and `gated()` helpers were added to `__tests__/mocks/submit.js` to script wallet faults in Jest.

## Gaps for a human

- A live estimate always prices 0 until SDK-CA, so "Price unavailable" is what a real wallet shows today.

## Self-Check: PASSED
