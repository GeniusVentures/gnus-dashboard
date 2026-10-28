---
phase: 04-submit-a-job
plan: 05
status: complete
requirements: [SUB-02, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07]
actuals:
  tasks: 3
  commits: 3
---

# Phase 4 Plan 5: Submit outcomes Summary

Every reply the wallet can give to a submit lands on one screen with its own words, and an unknown fate is looked up by key before anything is shown; the page never retries.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | d45e5c4 | One classifier for submit replies, errors and key lookups |
| 2 | 946a06c | Submit outcomes: confirm screen, every outcome screen, nothing-spent errors and the lookup by key |
| 3 | a361e07 | Walk every submit outcome profile on the export |

## What exists

- `lib/submit/outcome.ts`: pure `classifyResult`, `classifyError`, `classifyLookup` (50 table tests). Nothing-spent codes, unknown-fate lookup, and whether "Nothing was spent." follows are decided here; copy comes from errors.ts.
- Store: `showCancelNote`, `checkAgain`, `newKey`; settles the draft on any payment or unknown fate; reports only 4100 and 4900 to the session; an account switch clears an outcome screen that belongs to the old account.
- `SubmitPanel`: Confirm in your wallet with no timeout and a Cancel note; nothing-spent errors with the estimate's amounts for `-32011` and Start a new submit for `idempotency_key_reused`.
- `SubmitResult`: seven screens from one table; the h2 takes focus when the outcome changes; Paid but not processed is a `role="alert"` banner with the hash, copy button, explorer link and no retry.

## Deviations

- The no-record note reads "You can submit the same job again: the same submit is never paid twice." (D-20 had assumed the typed job survives a reload; with only a hash stored, after a reload the user loads the job again). CONTEXT updated.
- Jest runs the outcomes through `SubmitFlow` with real mock profiles plus wrapped providers (garbled submit reply, failing lookup); no separate fake client.

## Gaps for a human

- A real wallet's native confirm, and `-32014` against a live burn, wait on wallet v4.0 phases 43 and 44.

## Self-Check: PASSED
