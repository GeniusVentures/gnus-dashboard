---
phase: 01-teardown-and-static-shell
plan: 05
status: complete
---

# Phase 1 Plan 5: Static export, v1 placeholders, Cypress smoke Summary

`yarn build` now writes a static `out/` with the five v1 placeholder routes and a custom 404; a dependency-free server serves it with plain-host rules and Cypress passes 6 tests over it.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Group 7 | 379112d | feat(01): static export with v1 placeholder routes and a 404 page (group 7) |
| 2 Harness | c180890 | test(01): Cypress smoke over the static export (group 7) |

## out/ contents

`out/index.html`, `submit.html`, `jobs.html`, `jobs/detail.html`, `earnings.html`, `404.html`. No `out/api`, no file name containing `[`, no .dll/.so/.dylib, `grep -rIl koffi out` empty, `out/fonts/hkModular/StartHere.html` absent. Routes in the build: `/`, `/404`, `/earnings`, `/jobs`, `/jobs/detail`, `/submit`; shared First Load JS 197 kB. `next.config.js` holds exactly `output`, `images`, `reactStrictMode`.

## Cypress

Cypress 14.5.3 (verify passed in 01-01). `cypress run` over `out/` served by `scripts/serve-out.js`: 1 spec, 6 tests, 6 passing, 0 failing (five routes with h1, document title and nav checks, plus the 404 status and page). Every test asserts zero `/api/` requests.

### Gap: `yarn test:e2e` exits 1 on this machine

start-server-and-test finishes the Cypress run, then crashes while stopping the server: `Error: spawn wmic.exe ENOENT` (its process-tree lookup uses wmic, which Windows 11 no longer ships). The tests pass first (the log shows "All specs passed"), but the command exits 1 and leaves `serve-out.js` running. I killed the leftover server by hand each time. Ubuntu CI is not affected. Locally the equivalent was run instead: start `serve-out.js`, `yarn cypress run`, stop the server (6/6 passing, exit 0). The script string required by the plan is in package.json unchanged. Fixing it needs a wrapper script or a dependency change outside this plan's files; flagged for Braian.

## serve-out.js checks (curl against port 4174)

| Request | Status |
|---------|--------|
| `/../package.json` (`--path-as-is`) | 404, body without the package name |
| `/%2e%2e/package.json` | 404 |
| `/%5c..%5cpackage.json` (backslashes) | 404 |
| `POST /` | 405 |
| `/jobs/detail` | 200 |
| `/no-such-page` | 404 (custom page) |
| malformed escape `/%E0%A4%A` | 400 |
| `HEAD /` | 200 |

Deviation from the sketch: the path is decoded from the raw request line, not from `new URL(...)`, because the URL parser silently normalises `..` segments and would hide the traversal guard from the test.

## Jest and Cypress reconciliation

| Step | Tests |
|------|-------|
| Baseline (01-01) | 137 |
| 01-01: delete BlockchainInfo (7), elapseTime (23), index (11); add placeholders (+1) | 97 |
| 01-02 group 2: node 3, processing 2, useIPFS 6, IPFSContext 1, gasPrice 3, getEstimate 4, submitJob 5, _app 26 = -50 | 47 |
| 01-02 group 3: OrderForm 11, job-order-flow 5 = -16 | 31 |
| 01-03 group 4: Price 10, PricesContext 3, usePrices 5 = -18 | 13 |
| 01-04 polyfill: assertion removed inside an existing test | 13 |
| 01-05: placeholders 1 -> 6 (five routes via it.each plus the 404 case) = +5 | 18 |

After: `yarn test --ci` = 3 suites, 18 tests, 1 snapshot, exit 0. Cypress: 0 specs before, 1 spec / 6 tests after.

## Deviations from Plan

1. **[Rule 3 - Blocking] `yarn test:e2e` wmic failure** (above); local proof used the manual equivalent.
2. **`data/navbars/navbarRoutes.ts`** entries use the existing `{ menuitem, link }` shape the navbar reads.
3. `scripts/` had been emptied by 01-04 (the test runner was its only file), so the directory was recreated for `serve-out.js`.
4. `.gitignore` had no trailing newline; one blank line was inserted before the two Cypress entries.
5. An uncommitted edit to `.planning/research/gnus-rpc-contract.md` appeared in the tree while this plan ran. It is not mine and was left unstaged.

## Known Stubs

The five placeholder pages show "This page is not available yet." on purpose (T-01-19); phases 3-5 replace them.

## Self-Check

Both commits in `git log`; author braianwegmann@gmail.com; no trailer; `.htaccess` and the font demo page deleted.
