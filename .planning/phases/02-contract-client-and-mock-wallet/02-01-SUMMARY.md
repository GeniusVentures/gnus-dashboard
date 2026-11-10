---
phase: 02-contract-client-and-mock-wallet
plan: 01
status: complete
requirements: [RPC-01, RPC-02, RPC-03, RPC-08]
---

# Phase 2 Plan 1: Tracer, wire rules, mock profiles, strict typecheck Summary

One thin `gnus_getAccounts` slice from the mock through detection, injected transport, client and zod, then the address/amount wire rules, the mock profile registry and a strict typecheck in CI.

**Tasks:** 3/3. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Tracer | 32ddbc7 | feat(02): tracer, gnus_getAccounts from the mock through select, injected transport, client and zod |
| 2 Wire rules | 23035d9 | feat(02): address, tx hash and amount wire schemas with parse and brand checks (RPC-03) |
| 3 Profiles + CI | d36e576 | feat(02): mock profile registry and strict typecheck in CI (D-05, D-07) |

## zod

`npm view zod@4.6.7`: version 4.6.7, repository `git+https://github.com/colinhacks/zod.git`, dist.integrity `sha512-g8W2D2kU...CGwg==`. yarn.lock integrity equals it. Installed package has 0 dependencies. `package.json` pins `"zod": "4.6.7"`. `yarn install --frozen-lockfile` passes.

`jitless` was present in the installed zod (`node_modules/zod/v4/core/`), so `z.config({ jitless: true })` is in `schema.ts`.

## Numbers

- Jest after the plan: 6 suites, 41 tests, 1 snapshot (phase 1 end: 4 suites, 24 tests). New: `tracer.test.js` 9 tests, `address.test.js` 8 tests.
- `yarn tsc -p tsconfig.strict.json`: clean. `address.typecheck.ts` holds 5 `@ts-expect-error` brand checks.
- `yarn build`: green. `yarn test:e2e`: 6 Cypress tests passing. Secret gate: no leaks, exit 0. `yarn install --frozen-lockfile`: green.

## Deviations from Plan

1. **[Environment] Gitleaks extraction.** Git Bash `tar -xf` is GNU tar and cannot read a zip. The binary was downloaded to a scratch folder, SHA-256 checked (d29144de...afc4e), and extracted with `C:\Windows\System32\tar.exe -xf`. `unzip` was not used. The `GITLEAKS` variable pointed at that binary for the gate.
2. **errors.ts.** `GnusError` takes an optional fourth constructor argument (`override`) so `GnusContractMismatchError` can set its own kind, action and message while the fields stay `readonly`. The public three-argument shape from the plan is unchanged.
3. The tracer's unused `hasActiveWalletConnectSession` option is accepted but not read yet (plan 04 uses it); `_options` is underscore-named for that reason.

## Known Stubs

`createMockProvider` rejects every method except `gnus_getAccounts` with 4200, as the plan specifies; plan 05 implements the rest.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits 32ddbc7, 23035d9, d36e576 present in `git log`; author braianwegmann@gmail.com; no trailer; tree clean outside `.planning`.
