---
phase: 2
slug: contract-client-and-mock-wallet
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-27
---

# Phase 2 - Validation Strategy

> Per-phase validation contract. Every task in 02-01 to 02-07 carries an automated verify; this file says which command proves which roadmap success criterion, and what VERIFICATION must record as a gap.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.0.5 (jest-environment-jsdom, `next/jest` with babel-jest, Testing Library); Cypress 14.5.3 over `out/` served by `scripts/serve-out.js`; `tsc` from the `typescript` devDependency for `tsconfig.strict.json`; gitleaks 8.30.1 (SHA-256 pinned, fetched into a temp dir when not installed) for the secret gate |
| **Config file** | `jest.config.js` (02-05 adds the `__tests__/contract/factories/` ignore), `jest.setup.js`, `cypress.config.js`, `tsconfig.strict.json` (02-01), `.gitleaks.toml`, `scripts/check-secrets.sh` (02-07 extends) |
| **Quick run command** | `yarn jest --ci <test file>` |
| **Full suite command** | `yarn tsc -p tsconfig.strict.json && yarn build && yarn test --ci && bash scripts/check-secrets.sh`; from 02-07 add `yarn test:e2e`, `bash scripts/check-secrets.sh --self-test` and `bash scripts/check-secrets.sh --mock-import-test` |
| **Estimated runtime** | strict tsc 5-15 s; build 60-180 s (phase 1 measure); Jest 20-60 s; Cypress 30-90 s; `--mock-import-test` two builds, 2-6 min |

Every `<verify>` runs under Git Bash from the repo root, with the vendored Yarn Classic and Node 22.

The gitleaks bootstrap used in each plan's last verify (identical to phase 1):
`{ [ -n "${GITLEAKS:-}" ] || { command -v gitleaks >/dev/null && GITLEAKS=gitleaks; } || { D=$(mktemp -d) && curl -sSfL -o "$D/gl.zip" https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_windows_x64.zip && echo "d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e  $D/gl.zip" | sha256sum -c --status - && unzip -q -o "$D/gl.zip" gitleaks.exe -d "$D" && GITLEAKS="$D/gitleaks.exe"; }; } && export GITLEAKS`

---

## Sampling Rate

- **After every task commit:** that task's `<automated>` command.
- **After every plan:** its last task runs the full gate: strict tsc, `yarn build`, `yarn test --ci`, the secret and out/ gate, and a clean tree outside `.planning`. 02-07 adds Cypress and the planted-import test.
- **Before `/gsd-verify-work`:** the full suite command with every 02-07 addition, all green, plus `yarn install --frozen-lockfile`.
- **Max feedback latency:** about 5 minutes for a plan gate (the build dominates); 02-07 Task 2 about 10 minutes (three builds). Accepted: no faster command proves what is in `out/`.

## Baseline rule

Phase 1 ended at 4 Jest suites, 24 tests, 1 snapshot, and 1 Cypress spec with 6 tests (01-06-SUMMARY). Each plan SUMMARY records the Jest totals after it. A failure outside the plan's own files is a regression unless the SUMMARY of a sibling in the same wave explains it (parallel plans 02-02, 02-03, 02-04 and then 02-05, 02-07 add tests side by side; check `git log` before calling a sibling's test a regression).

---

## Success Criteria to Checks

| Roadmap criterion | Proven by | Command (in the task's verify) |
|-------------------|-----------|--------------------------------|
| 1. Conformance suite passes in CI against the mock for every method, event and error code; every code maps to one typed error with one message and one action | 02-03 Task 1, 02-05 Task 2, 02-06 Task 2 | `yarn jest --ci __tests__/lib/gnus/errors.test.js` (28 coded rows: every code and every reason in the snapshot); `yarn jest --ci __tests__/contract` (six methods, four events, invalid params; 18 code and reason rows driven through mock profiles, with an `afterAll` coverage check that fails on a dropped row); CI runs it inside `yarn test --ci` |
| 2. Numeric amount, swapped address or missing field fails as "Wallet contract mismatch" naming the wallet's version; 9007199254740993 and 1e21 format exactly with the wallet's decimals; `Amount` renders null as "Not available yet", never 0 | 02-01 Task 1, 02-02 Tasks 1-2, 02-03 Task 2, 02-06 Task 2 | `tracer.test.js`, `schema.test.js`, `client.test.js` (mismatch cases with version); `amount.test.js` and `Amount.test.jsx` ("null never formats to 0"); `gnus-errors.test.js` (three malformed mock profiles name version "1"; bigAmounts formatted with `unit.decimals` read from getAccounts); BigInt-only-in-amount.ts grep |
| 3. Mock injecting at 0, 500 and 4000 ms and twice, with and without the UA marker: detection picks the contract's transport and keeps it | 02-04 Tasks 1-2 | `yarn jest --ci __tests__/lib/gnus/select.test.js` (eight-row timing by marker table, late-injection switch with and without an active WalletConnect session, check-then-listen gap, dispose); `injected.test.js` (re-subscription after a second injection, no import-time read) |
| 4. A developer picks any fault profile on the dev server and in tests; the production export has no mock code; CI red on a planted import | 02-01 Task 3, 02-04 Task 1, 02-06 Task 1, 02-07 Tasks 1-2 | profile registry and unknown-name error; `mockOptionsFromSearch` cases; `app-mock.test.jsx` (flag on installs from the URL, flag off installs nothing); flag-on build contains the marker, production build does not; `yarn test:e2e` (Cypress shares the module); `check-secrets.sh --self-test` and `--mock-import-test` (planted import red, clean build green); ci.yml last step |
| 5. `tsc` passes with `strict` on over `lib/gnus/` and all new code | 02-01 Tasks 1 and 3, 02-03 Task 2, every plan gate | `yarn tsc -p tsconfig.strict.json` (include `lib/**/*.ts` plus `sub-components/shared/Amount.tsx`); `address.typecheck.ts` brand checks; ci.yml step after the frozen install |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | RPC-01, RPC-02, RPC-08 | T-02-SC, T-02-01, T-02-04, T-02-05 | official zod tarball; replies parsed; listener before read | tracer (end to end), install check | `yarn install --frozen-lockfile`, registry and integrity checks, `yarn jest --ci __tests__/lib/gnus/tracer.test.js`, strict tsc, `yarn build` | created in task, before code | pending |
| 02-01-02 | 01 | 1 | RPC-03, RPC-04 | T-02-02, T-02-03 | two address brands never mix; amounts digits-only | unit (TDD), compile-time | `yarn jest --ci __tests__/lib/gnus/address.test.js`, strict tsc, four `@ts-expect-error` lines | created in task | pending |
| 02-01-03 | 01 | 1 | RPC-08, RPC-06 | T-02-06 | unknown profile refused | unit, CI parse, full gate | ci.yml order check, strict tsc, build, `yarn test --ci`, secret gate | extends tracer.test.js | pending |
| 02-02-01 | 02 | 2 | RPC-02, RPC-03, RPC-04 | T-02-07, T-02-09, T-02-11 | numbers, swapped or uppercase hex, missing fields rejected | unit (TDD) | `yarn jest --ci __tests__/lib/gnus/schema.test.js`, strict tsc, no regex in schema.ts | created in task | pending |
| 02-02-02 | 02 | 2 | RPC-01, RPC-02 | T-02-08, T-02-10 | events parsed before handlers; mismatch names version | unit (TDD), full gate | `yarn jest --ci` client, schema, tracer; strict tsc, build, `yarn test --ci`, secret gate | created in task | pending |
| 02-03-01 | 03 | 2 | RPC-05 | T-02-12, T-02-13 | burn hash validated; wallet text never displayed | unit (TDD) | `yarn jest --ci __tests__/lib/gnus/errors.test.js`, strict tsc, every code and reason present in errors.ts | created in task | pending |
| 02-03-02 | 03 | 2 | RPC-04, DISP-01, RPC-08 | T-02-14, T-02-15, T-02-16 | null never 0; exact big amounts | unit and component (TDD), full gate | `yarn jest --ci` amount and Amount tests, strict tsc incl. Amount.tsx, BigInt grep, build, `yarn test --ci`, secret gate | created in task | pending |
| 02-04-01 | 04 | 2 | CONN-01, RPC-06 | T-02-17, T-02-18, T-02-20, T-02-21 | one locked provider per session; only isGeniusWallet counts | unit (TDD), table | `yarn jest --ci __tests__/lib/gnus/select.test.js`, strict tsc | created in task | pending |
| 02-04-02 | 04 | 2 | RPC-01 | T-02-19 | listeners follow re-injection; no import-time read | unit (TDD), full gate | `yarn jest --ci` injected, select, tracer; strict tsc, build, `yarn test --ci`, secret gate | created in task | pending |
| 02-05-01 | 05 | 3 | RPC-06 | T-02-22, T-02-23a, T-02-26 | one burn per key; SDK gaps null by default | unit (TDD) | `yarn jest --ci __tests__/lib/gnus/mock.test.js` plus earlier transport tests, strict tsc, ponytail note present | created in task | pending |
| 02-05-02 | 05 | 3 | RPC-07 | T-02-24, T-02-25 | pluggable factory, skipped cases named | conformance, full gate | `yarn jest --ci __tests__/contract`, strict tsc, build, `yarn test --ci`, secret gate | created in task | pending |
| 02-06-01 | 06 | 4 | RPC-06 | T-02-27, T-02-29 | both paid-but-not-processed shapes; no double burn under slow confirm | unit (TDD) | `yarn jest --ci __tests__/lib/gnus/mock.test.js __tests__/contract`, strict tsc, every profile name present | extends mock.test.js | pending |
| 02-06-02 | 06 | 4 | RPC-05, RPC-07, RPC-02, RPC-04 | T-02-28, T-02-30 | every code observed; drift is a named mismatch | conformance, full gate | `yarn jest --ci __tests__/contract __tests__/lib/gnus`, strict tsc, BigInt grep, build, `yarn test --ci`, secret gate | created in task | pending |
| 02-07-01 | 07 | 3 | RPC-06, SEC-04 | T-02-23, T-02-31 | mock only behind the build-time flag | unit, build content, e2e | `yarn jest --ci __tests__/pages/app-mock.test.jsx`, flag-on build has the marker, production build does not, `yarn test:e2e` | created in task | pending |
| 02-07-02 | 07 | 3 | SEC-04 | T-02-23, T-02-32, T-02-33 | planted import turns the gate red | gate self-test, planted import, CI parse | `check-secrets.sh`, `--self-test`, `--mock-import-test`, no probe left, ci.yml last step, strict tsc, `yarn test --ci` | extends the phase 1 script | pending |

Status values: pending, green, red, flaky.

---

## Wave 0 Requirements

None separate. The Jest, Cypress and gate infrastructure exists from phase 1. Every new test file is written inside the task that needs it, before the code it checks (TDD tasks and the tracer), so `wave_0_complete` is true from the start:

- `__tests__/lib/gnus/tracer.test.js` (02-01 Task 1, extended in Task 3)
- `__tests__/lib/gnus/address.test.js` and `lib/gnus/address.typecheck.ts` (02-01 Task 2)
- `__tests__/lib/gnus/schema.test.js`, `client.test.js` (02-02)
- `__tests__/lib/gnus/errors.test.js`, `amount.test.js`, `__tests__/components/Amount.test.jsx` (02-03)
- `__tests__/lib/gnus/select.test.js`, `injected.test.js` (02-04)
- `__tests__/lib/gnus/mock.test.js` (02-05, extended in 02-06)
- `__tests__/contract/gnus-contract.test.js` and `factories/mock.js` (02-05), `gnus-errors.test.js` (02-06)
- `__tests__/pages/app-mock.test.jsx`, `cypress/e2e/mock-wallet.cy.js` (02-07 Task 1)
- `check-secrets.sh` mock-marker fixture and `--mock-import-test` (02-07 Task 2)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dev server profile picker and its error overlay | RPC-06 | Next's dev compilation and overlay are not exercised by Jest or the export | 02-07 Task 1 `<human-check>`: `NEXT_PUBLIC_GNUS_MOCK=1 yarn dev`, open `/?gnusMock=today&gnusInject=4000`, call `window.gnus.request` in the console; `/?gnusMock=nope` shows the profile list |
| Remote CI runs the strict typecheck and the planted-import step | RPC-08, SEC-04 | Nothing is pushed (phase 1 D-02 still holds) | on the first push: the `yarn tsc -p tsconfig.strict.json` step and the last `--mock-import-test` step are green on ubuntu-latest |

## Contract snapshot drift

The snapshot `.planning/research/gnus-rpc-contract.md` changed while this phase was planned (2026-10-27 wallet update: nullable `estimate.balance`, submit `-32603 balance_unavailable`, job record written at burn time as `bridgedNotProcessed`, `getJob` null on no match and per-origin key lookup, a reasons table for -32011, -32012, -32603 and -32015). The plans follow that version. An executor that finds a newer snapshot updates the schema, table or mock row in the owning file and records it in its SUMMARY; it does not fork the contract.

## Gaps that VERIFICATION must record

- Real-wallet conformance run (RPC-07, roadmap "Waits on"): not possible until GeniusWallet v4.0 Phase 43 ships a transport. The seam is `GNUS_CONTRACT_FACTORY=<factory module> yarn jest __tests__/contract`; cases a real wallet cannot be driven into are skipped by name.
- Remote CI not run; every new CI step was run locally under Git Bash with the Windows gitleaks binary.
- Contract questions for the wallet side, decided here so work could continue (each is a change request, not a local fork):
  - `gas.gasPriceGwei` is parsed as a plain decimal (`\d+(\.\d+)?`), not base units, matching GeniusWallet's draft `gnus_amounts.dart`; the snapshot only says "decimal string".
  - `unit.decimals` is bounded 0 to 36 by the dashboard as a sanity guard; not in the contract.
  - Any reason the wallet adds after the 2026-10-27 snapshot falls back to its code's default row until the table gets a row for it.
- Mock simplifications marked `ponytail:` in the source: balance never drops after a burn; idempotency compares `JSON.stringify(job)`, so key order counts.

---

## Multi-Source Coverage Audit

| Source | ID | Item | Plan | Status |
|--------|----|------|------|--------|
| GOAL | - | One typed client, transport detection, a mock that behaves like the wallet with faults, so later phases build and test without a wallet | 01-07 | COVERED |
| REQ | RPC-01 | One typed client over one Transport (request, on, removeListener, close), injected and mock implementations | 01, 02, 04 | COVERED |
| REQ | RPC-02 | zod at the one boundary; mismatch shows "Wallet contract mismatch" with version | 01, 02, 06 | COVERED |
| REQ | RPC-03 | Branded SDK and EVM addresses, never converted; parse tests for both | 01 | COVERED |
| REQ | RPC-04 | Decimal strings end to end; numbers rejected; BigInt only in amount.ts; divide by unit.decimals; 2^53+1 and 1e21 exact | 01, 02, 03, 06 | COVERED |
| REQ | RPC-05 | Every code incl. reasons maps in one module to a typed GnusError with one message and one action | 03, 06 | COVERED |
| REQ | RPC-06 | Mock with every fault D-05 lists; dev server, Jest and Cypress share it | 01, 04, 05, 06, 07 | COVERED |
| REQ | RPC-07 | Conformance suite in `__tests__/contract`, CI against the mock, pointable at a real transport | 05, 06 | COVERED (real-wallet run is a recorded gap) |
| REQ | RPC-08 | strict over lib/gnus and new code via tsconfig.strict.json, in CI | 01, 03 | COVERED |
| REQ | CONN-01 | Listener before read; UA marker waits and never falls back; 3 s otherwise; locked, late injection wins without a WC session | 04 | COVERED |
| REQ | SEC-04 | Mock only in dev and test builds via NEXT_PUBLIC_GNUS_MOCK; CI fails on mock code in out/, proven by a planted import | 07 | COVERED |
| REQ | DISP-01 | One Amount over string or null; null is "Not available yet"; a test fails if null formats to 0 | 03 | COVERED |
| CONTEXT | D-01 | lib/gnus layout; pure select.ts | 01, 04 | COVERED |
| CONTEXT | D-02 | zod 4 at the single boundary; GnusContractMismatchError with version; amounts regex strings | 01, 02 | COVERED |
| CONTEXT | D-03 | amount.ts only BigInt file; formatAmount exact; Amount over string or null | 01, 03 | COVERED |
| CONTEXT | D-04 | One error table incl. -32005 reasons, -32010 to -32015, idempotency_key_reused, and the reasons table added to the snapshot on 2026-10-27 | 03, 06 | COVERED |
| CONTEXT | D-05 | Mock with named fault profiles; NEXT_PUBLIC_GNUS_MOCK; extend the phase 1 gate script with a marker check and planted import | 01, 04, 05, 06, 07 | COVERED |
| CONTEXT | D-06 | Conformance suite with a transport factory; real-wallet run a recorded gap | 05, 06 | COVERED |
| CONTEXT | D-07 | tsconfig.strict.json checked in CI; main tsconfig unchanged | 01, 03 | COVERED |
| CONTEXT | D-08 | zod@4 the only new dependency; no react-query | 01 | COVERED |
| RESEARCH | Pitfall 2 | Detection race, double injection | 04 | COVERED |
| RESEARCH | Pitfall 5 | Null as 0; mock serves today's nulls | 03, 05 | COVERED |
| RESEARCH | Pitfall 6 | Number on amounts | 01, 02, 03 | COVERED |
| RESEARCH | Pitfall 7 | Two address formats | 01, 02 | COVERED |
| RESEARCH | Pitfall 17 | Mock too kind | 05, 06 | COVERED |
| RESEARCH | STACK zod and CSP | jitless zod under `script-src 'self'` | 01 | COVERED |
| RESEARCH | STACK one owner | No local copy of the SDK job schema | 02 | COVERED |

Excluded by scope: WalletConnect transport (phase 6), session context, react-query and pages (phase 3), idempotency key storage in the page (phase 4), machine-readable wallet fixtures (CONTEXT deferred).

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered (tests written inside their tasks, before the code)
- [x] No watch-mode flags
- [x] Feedback latency stated (plan gate about 5 minutes, build-bound)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
