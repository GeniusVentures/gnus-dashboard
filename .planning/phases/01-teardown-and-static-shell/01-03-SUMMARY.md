---
phase: 01-teardown-and-static-shell
plan: 03
status: complete
---

# Phase 1 Plan 3: Price pill and Redux Summary

The GNUS price and gas pill, its tooltip, the dead test helpers and Redux are deleted in two commits; build exit 0 and `yarn jest --ci` exit 0 after each.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Group 4 | 0b97673 | refactor(01): delete the price and gas pill (group 4) |
| 2 Group 5 | 60bdb13 | refactor(01): delete Redux (group 5) |

## Results after each group

| Point | `yarn build` | `yarn jest --ci` |
|-------|--------------|------------------|
| Before (01-02 after group 3) | exit 0 | exit 1 (2 helper files as empty suites), 8 suites, 31 tests, 0 failed |
| After group 4 | exit 0, shared First Load JS 205 kB | exit 0, 3 suites, 13 tests, 1 snapshot, 0 failed |
| After group 5 | exit 0, shared First Load JS 198 kB | exit 0, 3 suites, 13 tests, 1 snapshot, 0 failed |

The Jest gate is now exit 0 outright: the two empty-suite helper files from the 01-01 baseline are deleted. Remaining suites: `__tests__/basic.test.js`, `__tests__/e2e/basic-smoke.test.js`, `__tests__/pages/placeholders.test.jsx`.

## Deleted tests

| File | Baseline tests | Reason |
|------|----------------|--------|
| `__tests__/components/navbar/Price.test.jsx` | 10 | deleted pill |
| `__tests__/context/prices/PricesContext.test.jsx` | 3 | deleted context |
| `__tests__/hooks/prices/usePrices.test.js` | 5 | deleted hook |

Arithmetic: 31 - (10 + 3 + 5) = 13. Group 5: none deleted, none added (no test covered Redux).

## Deleted helpers (not tests)

- `__tests__/utils/`: `index.js`, `mockFactory.js`, `standardTestPatterns.js`, `testData.js`, `testHelpers.js`, `testSetup.js`. `standardTestPatterns.js` and `testHelpers.js` were the two 0-test failing suites.
- `__tests__/mocks/`: `nextRouter.js`, `reactToastify.js`, `server.js`, `web3Modal.js`.
- Kept: `__tests__/utils/jest.polyfills.js`, `__tests__/mocks/fileMock.js` (referenced by `jest.config.js`).

## Deleted source

Group 4: `hooks/prices/usePrices.tsx`, `context/prices/PricesContext.tsx`, `sub-components/navbar/Price.tsx`. `pages/_app.tsx`: PricesWrapper unwrapped, the `price-gas-tooltip` Tooltip element, its react-tooltip import and CSS import removed. `layouts/navbars/NavbarDefault.tsx`: Price import and its Nav block removed.

Group 5: `store/store.js`, `store/appSlice.js`, `app.config`, `app.config.js`. `pages/_app.tsx`: react-redux Provider and store import removed, children unwrapped.

## Theme (revised D-05)

Nothing replaces the slice. After group 5 the built global CSS bundle has the same hash as after group 4 (`css/210f963003a5c6a3.css`), and `pages/_app.tsx` still imports `../styles/theme.scss`. Nothing sets or reads `data-theme`.

## Deviations from Plan

None. As in 01-02, the chained verify command was run in its parts (build, Jest, path absence, pattern greps, all clean) rather than as a single `&&` chain.

## Notes

- The tree-wide grep for `bridgeOut` and `/api/processing/` outside `.planning` is empty.
- `__tests__/README.md` still describes the old test layout; outside this plan's files and not touched.
- `react-redux`, `@reduxjs/toolkit`, `react-tooltip` and other dependencies are still in `package.json`; 01-04 prunes them.

## Self-Check

Both commits in `git log`; deleted paths absent; commit author braianwegmann@gmail.com; no trailer in either message.
