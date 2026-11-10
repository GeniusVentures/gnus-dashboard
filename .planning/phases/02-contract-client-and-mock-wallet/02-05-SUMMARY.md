---
phase: 02-contract-client-and-mock-wallet
plan: 05
status: complete
requirements: [RPC-06, RPC-07]
actuals:
  tokens: 11500
  tasks: 2
  commits: 2
---

# Phase 2 Plan 5: In-memory mock wallet and contract conformance suite Summary

The mock now implements all six `gnus_*` methods and four events in memory (parameter rules, 24 h idempotency, in-flight guard, paging, four data profiles, five controls), and `__tests__/contract` asserts the contract snapshot against it through a factory module that `GNUS_CONTRACT_FACTORY` can swap for another transport.

**Tasks:** 2/2. **Date:** 2026-10-27.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Mock wallet | 7defff2 | feat(02): mock wallet implements every gnus_* method and event in memory (RPC-06) |
| 2 Conformance suite | 774ba9d | test(02): contract conformance suite over a pluggable transport factory (RPC-07) |

## Conformance cases (`gnus-contract.test.js`, 23)

- Methods (9): getAccounts, estimate, submitJob (node account, not payer), replay (one job left), key reused, two concurrent submits, listJobs newest first with a limit-1 cursor walk, getJob by hash/key/id plus null, getEarnings.
- Invalid parameters (10): string job, old model/input shape, submit without a key, estimate with a string job, limit 0, limit 101, cursor "", getJob with no selector, getJob with two selectors (all `invalidParams`), unknown method (`unsupportedMethod`).
- Events (4, need `controls`, skipped by name as `[needs controls] ...` on a target without them): accountsChanged after switchAccount (then listJobs empty), networkChanged, jobUpdated, disconnect. No onMismatch call in any.
- Checked with a factory that returns no `controls`: 19 passed, 4 skipped, the four names listed.

## Mock profiles and controls

today (SDK gaps null), populated, allNulls (payer cannot sign, submit is -32012 `no_wallet`), bigAmounts (balance `9007199254740993`, cost `1000000000000000000000`, earned.total `18446744073709551617`). Controls: `switchAccount`, `setNetwork`, `advanceJob`, `disconnect`, `burnCount`, plus the earlier `emit`, `reinject`, `calls`.

## Numbers

- Jest after the plan: 15 suites, 264 tests, 1 snapshot (before: 13 suites, 189 tests). New: `mock.test.js` 52, `gnus-contract.test.js` 23.
- `tsc -p tsconfig.strict.json`, `yarn build`, secret gate (no leaks), `--self-test` (6 fixtures), `yarn test:e2e` (Cypress 6 passing), `yarn install --frozen-lockfile`: green. Tree clean outside `.planning`.

## Deviations from Plan

None in scope. Run sequentially after 02-04 and before 02-07 at the orchestrator's request. The mock's `submitJob` also rejects -32012 when the payer cannot sign: reason `no_wallet` when the payer has no EVM address, no reason otherwise (changed from `view_only` in 02-06 so the bare -32012 contract row is observable).

## Known Stubs

None. The real-wallet run of the suite is a recorded gap until wallet v4.0 phase 43.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits 7defff2 and 774ba9d present; author braianwegmann@gmail.com; no trailer; files in `files_modified` only.
