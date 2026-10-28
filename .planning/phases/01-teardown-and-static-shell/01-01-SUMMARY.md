---
phase: 01-teardown-and-static-shell
plan: 01
status: complete
---

# Phase 1 Plan 1: Baseline, explorer teardown, deploy guard Summary

Baseline measured (137 tests), the network explorer deleted in one commit with `/` as a placeholder, and the EC2 deploy workflow reduced to a manual dispatch that fails before any SSH.

**Tasks:** 3/3. **Date:** 2026-10-26.

## Baseline

Measured on the untouched tree before any file changed.

- BASE sha: 27bcdd5fe40921ece8786cd4f01a2bc3a0cb3e8b
- Node: v22.19.0 (Yarn Classic 1.22.22, vendored via `.yarnrc.yml`)
- Install: `yarn install --frozen-lockfile` exit 0 in 44.6 s, no tracked file changed. `yarn.lock` resolves `ethereumjs-abi` through `git+ssh://git@github.com/...`; with no SSH key the install fails ("Permission denied (publickey)"). It was run with an environment-only rewrite (`GIT_CONFIG_COUNT=1`, `url.https://github.com/.insteadOf=ssh://git@github.com/`), which writes nothing to the repo or global git config. Later plans that reinstall (01-04, 01-06) need the same env rewrite on a machine without an SSH key.
- `yarn build`: exit 0, 77.4 s. 15 routes: `/`, `/[...]`, `/404`, `/address/[address]`, `/analytics`, `/block/[block]`, `/job-orders`, `/transaction/[transaction]`, 6 dynamic `/api/*` functions. First Load JS shared 1.1 MB (`_app` chunk 940 kB).
- `yarn jest --ci`: exit 1, 16.7 s test time (23 s wall). 20 suites (18 passed, 2 failed), 137 tests (137 passed, 0 failed), 1 snapshot passed.
- `yarn test` (three runs through `scripts/test-runner.js`): exit 0. Unit 8 suites / 51 tests, integration 8 / 77, e2e 2 / 9: 18 suites, 137 tests, all passing.
- The 2 failed suites are not tests: `__tests__/utils/standardTestPatterns.js` and `__tests__/utils/testHelpers.js` are helper files that `jest.config.js` testMatch picks up and that are missing from `testPathIgnorePatterns` ("Your test suite must contain at least one test"). Cause: Price test helpers; plan 01-03 (group 4, price/gas pill) deletes both files. No fix in 01-01. Gate rule until then: `yarn build` exit 0, `yarn jest --ci` shows 0 failed tests and no failed suite other than these two.

### Per-file table (`yarn jest --ci`)

| File | Tests | Result |
|------|-------|--------|
| `__tests__/basic.test.js` | 8 | pass |
| `__tests__/components/dashboard/BlockchainInfo.test.jsx` | 7 | pass |
| `__tests__/components/job-order/OrderForm.test.jsx` | 11 | pass |
| `__tests__/components/navbar/Price.test.jsx` | 10 | pass |
| `__tests__/context/ipfs/IPFSContext.test.jsx` | 1 | pass |
| `__tests__/context/prices/PricesContext.test.jsx` | 3 | pass |
| `__tests__/e2e/basic-smoke.test.js` | 4 | pass |
| `__tests__/e2e/job-order-flow.test.js` | 5 | pass |
| `__tests__/functions/ipfs/node.test.js` | 3 | pass |
| `__tests__/functions/messages/processing.test.js` | 2 | pass |
| `__tests__/functions/time/elapseTime.test.js` | 23 | pass |
| `__tests__/hooks/ipfs/useIPFS.test.js` | 6 | pass |
| `__tests__/hooks/prices/usePrices.test.js` | 5 | pass |
| `__tests__/pages/_app.test.tsx` | 26 | pass |
| `__tests__/pages/api/gas/gasPrice.test.js` | 3 | pass |
| `__tests__/pages/api/processing/getEstimate.test.js` | 4 | pass |
| `__tests__/pages/api/processing/submitJob.test.js` | 5 | pass |
| `__tests__/pages/index.test.jsx` | 11 | pass |
| `__tests__/utils/standardTestPatterns.js` | 0 | fail (helper, no tests) |
| `__tests__/utils/testHelpers.js` | 0 | fail (helper, no tests) |
| Total | 137 | 18 suites pass, 2 fail |

### Cypress

Cypress verify: passed

Binary 14.5.3 verified at `C:\Users\User\AppData\Local\Cypress\Cache\14.5.3\Cypress` (`yarn cypress verify`, exit 0). Cypress baseline: 0 specs (no `cypress.config.*` and no spec file is tracked).

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 0 Baseline | none (measure only) | |
| 1 Group 1 explorer | 4dd708a | refactor(01): delete the network explorer (group 1) |
| 2 Deploy guard | 55e6288 | ci(01): disable the EC2 deploy until cutover (DEP-01) |

## After group 1

- `yarn build`: exit 0, 20.8 s. Routes: `/`, `/404`, `/job-orders`, 6 `/api/*`. `/` is 448 B (was 3.22 kB); First Load JS shared 1.06 MB (was 1.1 MB).
- `yarn jest --ci`: exit 1 for the same baseline reason. 18 suites (16 pass, 2 helper files with no tests, identical to baseline), 97 tests, 97 passed, 0 failed.
- `yarn test`: exit 0, 16 suites, 97 tests (28 unit + 60 integration + 9 e2e).
- Cypress: still 0 specs.

Reconciliation: 137 - 7 - 23 - 11 + 1 = 97.

### Deleted and added tests

| File | Baseline tests | Why |
|------|----------------|-----|
| `__tests__/components/dashboard/BlockchainInfo.test.jsx` | 7 | covered a deleted component |
| `__tests__/functions/time/elapseTime.test.js` | 23 | covered a deleted helper |
| `__tests__/pages/index.test.jsx` | 11 | asserted the old landing |
| `__tests__/pages/placeholders.test.jsx` (added) | +1 | `/` placeholder heading and text |

## Deployment guard

`aws-ec2-deploy.yml` parses with `on: workflow_dispatch` only; steps[0] "EC2 deploy disabled" has no `if:`, prints the DEP-04/DEP-05 message to stderr and runs `exit 1`; the original deploy step follows unchanged. Remote CI not run (D-02); proof is the parsed file.

## Deviations from Plan

1. **[Rule 3 - Blocking] Install needed an https git rewrite.** `yarn.lock` pins `ethereumjs-abi` at a `git+ssh` URL; this machine has no GitHub SSH key. Used `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_0`/`GIT_CONFIG_VALUE_0` environment variables for the install only. No file or git config changed.
2. **Gate reading.** The plan's gate says `yarn jest --ci` exits 0, but the baseline already exits 1 (two helper files in `__tests__/utils` counted as suites). Per the baseline rule, the gate was "no new failures"; both go away in 01-03.
3. Not touched: `__tests__/mocks/nextRouter.js` still names `/analytics` as a sample pathname (outside files_modified, harmless mock data).

## Known Stubs

`sub-components/shared/Placeholder.tsx` and `pages/index.tsx` are intentional placeholders; later phases replace them.

## Self-Check

Both commits found in `git log`; deleted paths absent; `grep -ic claude` over `27bcdd5..HEAD` messages is 0 (checked before return).
