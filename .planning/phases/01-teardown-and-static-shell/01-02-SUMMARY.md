---
phase: 01-teardown-and-static-shell
plan: 02
status: complete
---

# Phase 1 Plan 2: Server SDK path, secrets, Web3Modal and OrderForm Summary

The koffi/native SDK path, `pages/api/`, three secret-bearing files, the IPFS hook and context, Web3Modal and OrderForm are deleted in two commits; build exit 0 after each.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Group 2 | 622e16b | refactor(01): delete the server SDK path and its secrets (group 2) |
| 2 Group 3 | da5ed7d | refactor(01): delete Web3Modal and the order form (group 3) |

## Secrets (SEC-01, D-06)

Removed from the tree in the group 2 commit, named by file and kind only: a literal Ethereum private key (`functions/ipfs/node.ts`), the SuperGenius account key file (`data/secure_storage.json`), and a keyed RPC URL (`pages/api/gas/gasPrice`). No value appears in any commit message or in this file.

The key stays in git history (no rewrite, per D-06). Rotating it and moving any funds is the human cutover item DEP-04.

## Results after each group

| Point | `yarn build` | `yarn jest --ci` |
|-------|--------------|------------------|
| Before (01-01 after group 1) | exit 0 | 18 suites (2 helper-file failures), 97 tests, 0 failed |
| After group 2 | exit 0, routes `/`, `/404`, `/job-orders` | 10 suites (8 pass, 2 helper-file failures), 47 tests, 0 failed |
| After group 3 | exit 0, routes `/`, `/404` | 8 suites (6 pass, 2 helper-file failures), 31 tests, 0 failed |

Jest still exits 1 for the baseline reason only: `__tests__/utils/standardTestPatterns.js` and `testHelpers.js` are matched as suites with no tests. 01-03 deletes them.

Group 3 build: First Load JS shared 240 kB (was 921 kB after group 2, 1.06 MB after group 1); `_app` chunk 85 kB.

## Deleted tests

| File | Baseline tests | Group | Reason |
|------|----------------|-------|--------|
| `__tests__/functions/ipfs/node.test.js` | 3 | 2 | deleted koffi bridge |
| `__tests__/functions/messages/processing.test.js` | 2 | 2 | deleted message handlers |
| `__tests__/hooks/ipfs/useIPFS.test.js` | 6 | 2 | deleted hook |
| `__tests__/context/ipfs/IPFSContext.test.jsx` | 1 | 2 | deleted context |
| `__tests__/pages/api/gas/gasPrice.test.js` | 3 | 2 | deleted route |
| `__tests__/pages/api/processing/getEstimate.test.js` | 4 | 2 | deleted route |
| `__tests__/pages/api/processing/submitJob.test.js` | 5 | 2 | deleted route |
| `__tests__/pages/_app.test.tsx` | 26 | 2 | rendered its own mock app (Web3Modal, IPFS, Prices nesting); never imported the real `_app.tsx` |
| `__tests__/components/job-order/OrderForm.test.jsx` | 11 | 3 | deleted component |
| `__tests__/e2e/job-order-flow.test.js` | 5 | 3 | covered only the deleted order flow |

Arithmetic: group 2 removed 3+2+6+1+3+4+5+26 = 50, so 97 - 50 = 47. Group 3 removed 11+5 = 16, so 47 - 16 = 31. No test added.

## Deleted source

Group 2: `functions/`, `pages/api/` (6 routes), `data/GeniusSDK.dll`, `data/secure_storage.json`, `data/dev_config.json`, `data/ipfs/`, `data/prepared/`, `data/protobuf/`, `testProcess.json`, `hooks/ipfs/`, `context/ipfs/`. `pages/_app.tsx`: dotenv import and IPFS wrapper removed.

Group 3: `context/wallet/Web3Modal.tsx`, `config/config.ts`, `sub-components/job-order/`, `data/orderForm/`, `pages/job-orders/`, `global.d.ts`. `pages/_app.tsx`: Web3Modal wrapper removed. `data/navbars/navbarRoutes.ts`: now an empty array (Job Orders and Wallet entries removed; group 7 adds the v1 routes). `tsconfig.json`: OrderForm path removed from `include`.

## Deviations from Plan

- `data/navbars/navbarRoutes.ts` was also stripped of its now-unused `uuid` import, since the array is empty. In scope of the file the plan edits.
- The verify block was not run as one chained command; its parts were run separately: build, Jest, absence of every listed path, and the pattern greps (empty after each group), with the Jest exit judged by the 01-01 baseline rule.

## Known Stubs

`data/navbars/navbarRoutes.ts` is intentionally empty until group 7.

## Remaining references (by plan)

`__tests__/utils/` and `__tests__/mocks/web3Modal.js` still mention Web3Modal; 01-03 group 4 deletes them. `__tests__/README.md` still describes OrderForm; outside this plan's files.

## Self-Check

Both commits in `git log`; deleted paths absent; commit author braianwegmann@gmail.com; no trailer in either message.
