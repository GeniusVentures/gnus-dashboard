---
phase: 02-contract-client-and-mock-wallet
plan: 06
status: complete
requirements: [RPC-06, RPC-07, RPC-05, RPC-02, RPC-04]
actuals:
  tokens: 17000
  tasks: 2
  commits: 2
---

# Phase 2 Plan 6: Fault profiles and error conformance Summary

The mock has twenty named fault profiles (data in `profiles.ts`, one `preDispatch` check in `provider.ts`), and `gnus-errors.test.js` drives all 18 contract code and reason rows through the client, proves malformed replies are named mismatches and checks amounts above 2^53 format exactly.

**Tasks:** 2/2. **Date:** 2026-10-27.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Fault profiles | b511ee5 | feat(02): mock fault profiles for every error code, switching and both paid-but-not-processed shapes (D-05) |
| 2 Error conformance | 580a9cf | test(02): error conformance for every gnus_* code and reason (RPC-05, RPC-07) |

## Coverage table as run (mock factory, nothing skipped)

| Row | Profile | Typed kind |
|-----|---------|-----------|
| 4001 | connectRejected (getAccounts), rejectConfirm (submit, no job) | rejected |
| 4100 | originRevoked | unauthorized |
| 4200 | methodUnsupported (getEarnings) | unsupportedMethod |
| 4900 | sdkStarting | notReady |
| -32602 | today, string job | invalidParams |
| -32602 idempotency_key_reused | today, key reused with another job | idempotencyKeyReused |
| -32603 | internalError (estimate) | internal |
| -32603 balance_unavailable | balanceUnavailable (estimate balance null, submit refused) | internal |
| -32005 rate_limited | rateLimited, two concurrent estimates | rateLimited |
| -32005 confirm_open | confirmOpen | confirmOpen |
| -32005 submit_in_flight | slowConfirm, second submit at 10 s | submitInFlight |
| -32010 | costUnavailable (estimate and submit) | costUnavailable |
| -32011 | insufficientBalance | insufficientBalance |
| -32012 | payerCannotSign | payerCannotSign |
| -32013 | bridgeFailed (no job listed) | bridgeFailed |
| -32014 | bridgedNotProcessedError (`err.burnTxHash` equals the listed job's hash, status bridgedNotProcessed) | bridgedNotProcessed |
| -32015 | switching (estimate in the window, then accountsChanged and estimate works) | switching |
| -32015 account_changed | slowConfirm plus switchAccount (needs controls) | switching |

The `afterAll` check fails on the mock when any of the 18 is unobserved (proved by pointing the suite at a factory that returns null for originRevoked: it fails naming "4100"). On another target it prints the unobserved rows with `console.warn`. With a factory that has no `controls`: 24 passed, 1 skipped, `-32015:account_changed` named as not observed.

Also covered: bridgedNotProcessedStatus result shape; slow confirm pending at 179 s and resolved after 180 s; three malformed profiles give `GnusContractMismatchError` starting "Wallet contract mismatch" and containing "1"; bigAmounts with decimals 18 gives `0.009007199254740993` and `1000`, with decimals 0 gives `9007199254740993` and `1000000000000000000000`.

## Numbers

- Jest after the plan: 17 suites, 314 tests, 1 snapshot (after 02-07: 16 suites, 269 tests). New: 20 fault cases in `mock.test.js` (72 total there), `gnus-errors.test.js` 25 (24 run on a target without controls).
- `tsc -p tsconfig.strict.json`, `yarn build`, secret gate (no leaks), `--self-test` (7 fixtures), `--mock-import-test`, `node scripts/check-audit.js`, `yarn test:e2e` (8 passing), `yarn install --frozen-lockfile`: green. `BigInt` appears in `lib/` only in `amount.ts`; the production `out/` holds no mock marker. Tree clean outside `.planning`.

## Deviations from Plan

- **[Rule 1 - Contract detail] -32012 reason.** 02-05 sent `view_only` when the payer had an EVM address but could not sign. The 18-row list has bare -32012, so `payerCannotSign` now sends no reason (`no_wallet` is still sent when the payer has no EVM address). The 02-05 SUMMARY sentence was updated to match.
- The `-32005 rate_limited` and `submit_in_flight` and `-32015` rows run as standalone cases (fake timers), not in the row table; the coverage set is the same.
- Run sequentially after 02-07 at the orchestrator's request.

## Known Stubs

None.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits b511ee5 and 580a9cf present; author braianwegmann@gmail.com; no trailer; files in `files_modified` only (plus the 02-05 SUMMARY wording fix).
