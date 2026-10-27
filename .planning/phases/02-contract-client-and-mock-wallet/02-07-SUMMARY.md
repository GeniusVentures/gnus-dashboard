---
phase: 02-contract-client-and-mock-wallet
plan: 07
status: complete
requirements: [SEC-04, RPC-06]
actuals:
  tokens: 6500
  tasks: 2
  commits: 2
---

# Phase 2 Plan 7: Mock behind a build flag and the out/ mock gate Summary

`NEXT_PUBLIC_GNUS_MOCK=1` installs the mock from the query string (`?gnusMock=<profile>&gnusInject=<ms|twice>`) before first render; without it the guarded `require` folds away. The secret gate now fails on the mock marker in `out/`, and `--mock-import-test` plants an unguarded import to prove it, run last in CI.

**Tasks:** 2/2. **Date:** 2026-10-27.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Flag, _app, Cypress | 3e1158a | feat(02): mock behind NEXT_PUBLIC_GNUS_MOCK for the dev server, shared with Cypress (D-05) |
| 2 Gate and CI | ecfcc60 | ci(02): out/ gate fails on mock code, proven by a planted import (SEC-04) |

## out/ marker check (marker `__GNUS_MOCK__`, read from `provider.ts`)

| Build | Result |
|-------|--------|
| `NEXT_PUBLIC_GNUS_MOCK=1 yarn build` | marker found in one file, `out/_next/static/chunks/pages/_app-<hash>.js` |
| `yarn build` (production) | no file contains the marker; also none contains `gnusMock`, `gnusInject` or "Known profiles" |

## Gate runs

- `bash scripts/check-secrets.sh`: no leaks. `--self-test`: 7 fixtures detected (the new `mock marker in out/` is the 7th), clean tree passes.
- `--mock-import-test`: "mock import test passed: planted import detected, clean build passes". About 25 s (two production builds). Afterwards `pages/mock-import-probe.tsx` is gone and `out/` holds no probe or fixture file.
- `ci.yml`: the new step is last, after `node scripts/check-audit.js`.
- The marker is matched as a fixed string by bracketing each character (`sed 's/./[&]/g'`), because the check loop uses `grep -E`.

## Cypress

The TypeScript import `../../lib/gnus/mock/install` compiled under Cypress 14 with no config change. `mock-wallet.cy.js`: 2 passing (inject at 500 ms with one `gnus#initialized` and a parsed `gnus_getAccounts` reply; inject twice gives two events and a different `win.gnus`). Whole run: 8 passing across 2 specs, served from the production `out/`.

## Numbers

- Jest after the plan: 16 suites, 269 tests, 1 snapshot (after 02-05: 15 suites, 264 tests). New: `app-mock.test.jsx` 5.
- `tsc -p tsconfig.strict.json`, `yarn build`, `yarn install --frozen-lockfile`: green. Tree clean outside `.planning`.

## Deviations from Plan

None in scope. Run sequentially after 02-05 at the orchestrator's request.

## Human check not run

The dev-server check (`NEXT_PUBLIC_GNUS_MOCK=1 yarn dev`, delayed injection, error overlay for `?gnusMock=nope`) needs a browser and was not run. Jest covers the install, the delay and the unknown-profile throw.

## Known Stubs

None.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits 3e1158a and ecfcc60 present; author braianwegmann@gmail.com; no trailer; files in `files_modified` only.
