---
phase: 04-submit-a-job
plan: 02
status: complete
requirements: [SUB-02, SUB-08]
actuals:
  tasks: 2
  commits: 1
---

# Phase 4 Plan 2: Mock submit support Summary

The mock holds a confirm open until a test answers it, counts confirms, writes submit intents the way the wallet does, and has a profile where the wallet stops after the burn.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1, 2 | 418e9d5 | Mock wallet: a confirm the test answers, submit intents, a wallet that stops mid-submit |

## What exists

- Profile `manualConfirm`: `gnus_submitJob` waits for `controls.answerConfirm(approve)`; a switch or revoke still aborts it (-32015, 4100). `controls.confirmCount()` counts confirms opened on every profile.
- Intents per idempotency key, written after an approved confirm, given the hash at the burn, dropped when the job record is written. `gnus_getJob` by key answers the `pending` shape for an unresolved intent of the current node account, and `null` before the confirm is answered.
- A same-key submit with an unresolved intent answers `-32603 submission_outcome_unknown` with its fields, or `idempotency_key_reused` for another body.
- Profile `walletStopsMidSubmit`: one burn, the call never answers, the in-flight slot is freed. `submissionOutcomeUnknown` now leaves an intent with a null hash.
- `reinject()` keeps confirms, intents and the open confirm, so a reload test can answer through a new facade.
- 12 Jest tests in `__tests__/lib/gnus/mock-submit.test.js`.

## Deviations

- The two tasks edit the same hunks in `provider.ts`, so they went in as one commit rather than two.
- `walletStops` is a new `submitOutcome` value and `manual` a new `confirm` value; both are documented in `profiles.ts`.

## Gaps for a human

- None for this plan. The real wallet's intent timing (D-24) comes from reading its handler; a run against a real wallet waits on wallet v4.0 phases 43 and 44.

## Self-Check: PASSED
