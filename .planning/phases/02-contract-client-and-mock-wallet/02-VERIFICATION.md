---
phase: 02-contract-client-and-mock-wallet
verified: 2026-10-27T00:30:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run the conformance suite against a real wallet: GNUS_CONTRACT_FACTORY=<module> yarn jest __tests__/contract, with a factory whose create(profile) returns { transport } for the real wallet"
    expected: "gnus-contract.test.js passes; gnus-errors.test.js skips profiles the wallet cannot produce by name and warns on rows not observed"
    why_human: "Recorded gap by design. Needs wallet v4.0 Phase 43 and a reachable wallet transport. The suite is already pluggable (env var, factory contract, [needs controls] cases skip by name) but has never run against anything but the mock."
  - test: "NEXT_PUBLIC_GNUS_MOCK=1 yarn dev in a browser; open /?gnusInject=4000 and /?gnusMock=nope"
    expected: "window.gnus appears after the delay and answers; an unknown profile surfaces a visible error"
    why_human: "Needs a browser on the dev server. Jest (app-mock.test.jsx, select.test.js) covers the install, the delay and the unknown profile, and Cypress covers injection at 500 ms and twice, but nobody ran the dev server. 02-07-SUMMARY records this as not run."
---

# Phase 2: Contract client and mock wallet Verification Report

**Phase Goal:** One typed client for the `gnus_*` contract, with transport detection and a mock wallet that behaves like the real one, faults included, so every later phase builds and tests without a wallet.
**Verified:** 2026-10-27
**Status:** human_needed
**Re-verification:** No, initial verification

## Commands run (all by the verifier, Git Bash, Node 22.19.0, vendored yarn 1.22.22)

| Command | Result |
| ------- | ------ |
| `yarn tsc -p tsconfig.strict.json` | exit 0 |
| `yarn build` | exit 0; 7 static pages, `out/` written |
| `yarn test --ci` | exit 0; 17 suites, 314 tests, 1 snapshot, all pass |
| `bash scripts/check-secrets.sh` (gitleaks 8.30.1 at /tmp/tmp.eEwBBCmxnP) | exit 0; source and `out/` clean |
| `bash scripts/check-secrets.sh --self-test` | exit 0; 7 fixtures detected, clean tree passes |
| `bash scripts/check-secrets.sh --mock-import-test` | exit 0; planted import detected, clean build passes |
| `yarn test:e2e` | exit 0; Cypress 8/8 (static-shell 6, mock-wallet 2) |
| `git status` after all runs | clean |
| Claude attribution in `git log b13b31e..HEAD` (author, trailers, body) | none found |

`yarn tsc --listFiles` confirms the strict program contains every `lib/gnus/**/*.ts` file and `sub-components/shared/Amount.tsx`.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Conformance suite passes in CI against the mock for every method, event and error code; every code maps to one typed error with one message and one action | VERIFIED | `__tests__/contract/gnus-contract.test.js` covers all six methods, the four events, bad params and an unknown method. `gnus-errors.test.js` has an 18-row `EXPECTED_ROWS` table (4001, 4100, 4200, 4900, -32602 and `idempotency_key_reused`, -32603 and `balance_unavailable`, -32005 x3, -32010 to -32015, -32015 `account_changed`) and an `afterAll` that fails on the mock if a row was not observed. `lib/gnus/errors.ts` has one `TABLE` giving kind, message and action per code and reason; unknown codes fall to one `UNKNOWN` row. `ci.yml` runs `yarn test --ci`. All pass. |
| 2 | Numeric amount, swapped address or missing field fails with "Wallet contract mismatch" naming the wallet's version; 9007199254740993 and 1e21 format exactly; `Amount` renders null as "Not available yet" | VERIFIED | `client.ts` safeParses every reply and throws `GnusContractMismatchError`, message "Wallet contract mismatch (wallet contract version N)", version read from the raw payload so a failed parse still names it. `client.test.js` includes a version-2 reply that names 2. Mock profiles `malformedNumericAmount`, `malformedSwappedAddress` and `malformedMissingField` are tested. `baseUnitsSchema` is `^\d+$` on strings, so JSON numbers are rejected. `formatAmount` is BigInt-only (the only `BigInt` in `lib/`, `sub-components/` and `pages/` is in `amount.ts`) and divides by `unit.decimals`. `bigAmounts` profile asserts 0.009007199254740993 and 1000, and 9007199254740993 and 1000000000000000000000 at 0 decimals. `Amount.tsx` returns "Not available yet" for null; `Amount.test.jsx` has the null-never-0 test. |
| 3 | Mock injecting at 0, 500, 4000 ms and twice, with and without the UA marker, picks the contract's transport and keeps it | VERIFIED | `select.test.js` `TABLE` has all 8 combinations on fake timers. `select.ts`: listener attached before the first read of `window.gnus`; marker UA waits with no timer, so it never falls back; plain UA falls back at 3000 ms; the one allowed change is a late injection with no WalletConnect session, and the session check is made at that moment (tested). Injected twice stays "injected" with no extra switch. `injected.ts` re-subscribes listeners on re-injection. |
| 4 | Any fault profile selectable on the dev server and in tests; production export has no mock code, CI red on a planted import | VERIFIED | `profiles.ts` has 24 named profiles; `?gnusMock=<profile>&gnusInject=<ms or twice>` parsed in `install.ts`, loaded by `_app.tsx` only under `NEXT_PUBLIC_GNUS_MOCK === "1"` (`next.config.js` forces "0" otherwise). The unflagged `out/` contains no `installMock`, `__GNUS_MOCK__`, `gnusMock` or `MockProvider` (grep). `--mock-import-test` plants `pages/mock-import-probe.tsx`, builds without the flag, requires exit 1 with `mock-marker`, removes it, rebuilds and requires exit 0; it passed. `ci.yml` runs it, the self-test and the gate. The marker is read from `provider.ts`, so it cannot drift. The dev-server run in a browser was not done (see human item 2). |
| 5 | `tsc` passes with `strict` over `lib/gnus/` and all new code | VERIFIED | `tsconfig.strict.json` has `strict: true`, includes `lib/**/*.ts` and `sub-components/shared/Amount.tsx` (the only new component; no new pages). `ci.yml` runs it first. Exit 0. |

**Score:** 5/5 truths verified (0 behavior-unverified).

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| RPC-01 typed client, one `Transport` interface, injected and mock implementations | SATISFIED | `transport/types.ts` (`request`, `on`, `removeListener`, `close`); `client.ts` sends `{method, params}` with named params; `injected.ts`; the mock is a provider behind the injected transport. |
| RPC-02 zod at the one boundary, mismatch error with `version` | SATISFIED | `client.ts` `call` and `on` wrapper; `eventSchemas` for all four events; mismatch via `onMismatch`. |
| RPC-03 branded SDK and EVM addresses | SATISFIED | `address.ts` branded schemas, no converter; `address.typecheck.ts`; `address.test.js`. |
| RPC-04 decimal strings end to end | SATISFIED | See truth 2. No hardcoded 18 in `lib/` outside the mock's `unit` fixture. |
| RPC-05 every code to a typed error | SATISFIED | See truth 1. |
| RPC-06 mock implements the whole contract with fault profiles | SATISFIED | Profiles cover late injection, every error code, switching, nulls, both paid-but-not-processed shapes, a 3-minute confirm, replayed idempotency key, concurrent `-32005`, amounts above 2^53. Shared by Jest, Cypress (`mock-wallet.cy.js` imports the same `installMock`) and the dev server flag. |
| RPC-07 conformance suite runnable against a real transport without code changes | SATISFIED in code; live run is a recorded gap | `GNUS_CONTRACT_FACTORY` env var in both suites. Not run against a real wallet (human item 1). |
| RPC-08 strict TypeScript | SATISFIED | Truth 5. |
| CONN-01 detection rules | SATISFIED | Truth 3. |
| SEC-04 mock only in dev and test builds, CI proves it | SATISFIED | Truth 4. |
| DISP-01 shared `Amount` over `string \| null` | SATISFIED | `Amount.tsx` and test. It is not yet used by any page; the pages are still Phase 1 placeholders, and Phases 3 to 5 own the screens. |

No orphaned requirements: every Phase 2 ID in the REQUIREMENTS.md traceability table appears in a plan.

### Anti-Patterns

No `TBD`, `FIXME` or `XXX` in `lib/`, `sub-components/shared/`, `pages/`, `__tests__/` or `cypress/` (the only hit is the `mktemp` template in `check-secrets.sh`). The mock's fixed-amount shortcut is marked with a `ponytail:` comment. No stubs found; `Amount` has no page consumer by design.

### Notes (not gaps)

- The error-conformance mismatch assertion only checks `toContain("1")`, which is weak on its own; `client.test.js` backs it with exact "version 1" and "version 2" assertions.
- `Amount.tsx` and `formatAmount` throw on a malformed base. That is intended: the client has already parsed.
- Skipped-by-name `[needs controls]` cases mean a real-wallet run will exercise fewer events than the mock. That is a property of the plan, not a defect.

## Gaps Summary

No code gaps. All five success criteria hold against the code and every gate in the full suite command passed when run independently. Status is `human_needed` for two items: the real-wallet conformance run (recorded gap, waits on wallet v4.0 Phase 43) and the browser check of the dev-server mock flag.

---

_Verified: 2026-10-27_
_Verifier: Claude (gsd-verifier)_
