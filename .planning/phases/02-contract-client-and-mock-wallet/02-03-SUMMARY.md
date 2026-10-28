---
phase: 02-contract-client-and-mock-wallet
plan: 03
status: complete
requirements: [RPC-04, RPC-05, DISP-01, RPC-08]
---

# Phase 2 Plan 3: Error table and exact amounts Summary

One error table for every contract code and reason in `errors.ts`, exact base-unit formatting in `amount.ts` (the only BigInt file), and the shared `Amount` component that renders null as "Not available yet".

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Error table | 7fe9d36 | feat(02): error table for every gnus_* code and reason (RPC-05) |
| 2 Amounts + component | 660dbf5 | feat(02): exact amount formatting and the shared Amount component (RPC-04, DISP-01) |

## Decisions in code

- The table is one lookup keyed by code with an optional per-reason map. Reason and code lookups use `Object.hasOwn`, so a hostile reason such as `constructor` or `__proto__` falls back to the code's default row.
- 28 coded rows (13 code, 15 reason) are tested one by one; 17 distinct kinds across the code rows and the four RPC-05 reason rows. The contract snapshot lists no reason beyond the plan's table, so no row was added.
- `burnTxHash` is set only for -32014 and only when `txHashSchema` passes.
- `formatAmount` throws `RangeError` on bad base units or decimals, after checking `baseUnitsSchema` and `decimalsSchema`. Exact outputs tested at 2^53+1, 1e21 and 2^64+1.
- `grep -rl BigInt lib sub-components pages layouts widgets data` lists only `lib/gnus/amount.ts`.
- `tsconfig.strict.json` `include` now lists `lib/**/*.ts` and `sub-components/shared/Amount.tsx`.

## Numbers

- Jest after the plan: 11 suites, 149 tests, 1 snapshot (after 02-02: 8 suites, 85 tests). New: `errors.test.js` 43, `amount.test.js` 17, `Amount.test.jsx` 4.
- `tsc -p tsconfig.strict.json`, `yarn build`, secret gate (no leaks), `yarn install --frozen-lockfile`: green. Cypress: 6 passing.

## Deviations from Plan

None. Run after 02-02 rather than in parallel with it, at the orchestrator's request.

## Known Stubs

None.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits 7fe9d36 and 660dbf5 present; author braianwegmann@gmail.com; no trailer; tree clean outside `.planning`.
