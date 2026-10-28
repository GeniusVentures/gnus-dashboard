---
phase: 03-connect-and-identity
plan: 02
status: complete
requirements: [CONN-03, RPC-02, RPC-05, RPC-06, RPC-07]
actuals:
  tasks: 2
  commits: 2
---

# Phase 3 Plan 2: Contract layer and mock consent Summary

`lib/gnus` now parses the wallet's 2026-10-28 contract and the mock follows its consent rules, so phases 4 and 5 never both edit `schema.ts` or `errors.ts`.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | ce48171 | Parse unconfirmed and pending jobs, outcome-unknown and bridge-unavailable errors |
| 2 | 1f4a555 | Mock the connect prompt, decline, revoke, unconfirmed and outcome-unknown submits, bridge_unavailable |

## What changed

- Submit status and `JOB_STATUSES` gain `unconfirmed`; `JOB_STATUSES` gains `pending`. `jobLookupSchema` (detail or pending, nullable) is what `getJob` parses; list and event jobs still need a burn hash.
- `-32603 submission_outcome_unknown` is kind `submissionOutcomeUnknown`; `GnusError.outcome` parses each field alone (null when bad), and `burnTxHash` is read for this reason too.
- Revised D-11: `-32013 bridge_unavailable` is kind `bridgeUnavailable`, "Not available on this network. Switch the network in GeniusWallet.", action `openWallet`. New mock profile `bridgeUnavailable` (estimate and submit).
- Mock: `connected` flag, `connectPrompt` profile (5 s auto-approve), `answerConnect` and `revokeOrigin` controls. The connection check runs after params, before readiness and switching, one prompt at a time (`-32005 confirm_open`); revoke aborts open spend confirms with 4100. `originRevoked` is now `originNotAllowed`; new profiles `unconfirmedSubmit` and `submissionOutcomeUnknown`.

## Deviations

- Added the `bridge_unavailable` row and profile (user override of D-11, recorded in 03-CONTEXT.md).
- The mock does not model the wallet's 3 prompts a minute limit; no test needs it.
- Readiness (`4900`) and switching checks moved from before the handlers to after param validation, as the wallet orders them. No existing test depended on the old order.

## Verification

- `yarn jest --ci`: 18 suites, 354 tests (was 331 before the phase).
- `yarn -s tsc -p tsconfig.strict.json`, `yarn -s build` clean; `check-secrets.sh` and `--mock-import-test` pass.

## Self-Check: PASSED
