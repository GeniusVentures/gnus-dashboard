---
phase: 01-teardown-and-static-shell
verified: 2026-10-26T23:10:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Push the branch (or open a PR) and let .github/workflows/ci.yml run on ubuntu-latest"
    expected: "Every step green: frozen install, build, jest --ci, yarn test:e2e (start-server-and-test, no wmic), gitleaks 8.30.1 install with sha256 check, check-secrets.sh, check-secrets.sh --self-test, check-audit.js"
    why_human: "Remote CI was never run (by design, no push). Locally the Windows gitleaks binary and the manual serve-out + cypress sequence were used. The Linux gitleaks tarball install and `yarn test:e2e` on a Linux runner are unexecuted."
  - test: "After the first CI run, confirm a planted fixture turns the CI job red on the runner (a throwaway PR with a fake 64-hex PRIVATE_KEY literal)"
    expected: "ci job fails at the secret gate, not before"
    why_human: "Red-on-planted-key is proven locally (exit 1 on four fixture kinds) but not inside GitHub Actions."
  - test: "Merge-commit check for DEP-01 when the branch is merged to main"
    expected: "aws-ec2-deploy.yml in the merge commit still has only workflow_dispatch and the exit 1 first step"
    why_human: "REQUIREMENTS DEP-01 says 'checked by reading the workflow in the merge commit'; that commit does not exist yet. Whether the live EC2 app is still serving the old build is outside the repo."
---

# Phase 1: Teardown and static shell Verification Report

**Phase Goal:** The app builds to a static `out/` with no server, no secrets, and none of the old server, explorer, Web3Modal, OrderForm, price pill or Redux code, and merging the branch to `main` can no longer take the live EC2 site down.
**Verified:** 2026-10-26
**Branch:** gsd/dashboard-v1 at 65de894 (working tree clean before and after verification)
**Status:** human_needed (all five success criteria verified by running the code; remote CI run is the only open item)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `yarn build` writes `out/`; a plain static server shows every v1 placeholder route and the custom 404; no Node process, API route, koffi or native SDK file in source or build | VERIFIED | Ran `yarn build` from a deleted `out/`: exit 0, 7 static pages (`/`, `/404`, `/earnings`, `/jobs`, `/jobs/detail`, `/submit`, `_app`), no `Server`/`API` routes in the route table. `out/` has `index.html`, `submit.html`, `jobs.html`, `jobs/detail.html`, `earnings.html`, `404.html`. No `.node/.dll/.so/.wasm` in `out/`; no tracked native file in the repo; no `pages/api`, `functions/`, `store/`. `next.config.js` is `output: "export"`, `images.unoptimized`, no rewrites/redirects/headers. Served by `scripts/serve-out.js` (plain `http` module, path-traversal guarded): known routes 200, `/nope/x` 404 with "Page not found" title, `/api/gas/gasPrice` 404. |
| 2 | Explorer, Web3Modal, OrderForm, price/gas pill and Redux gone from source and nav; theme renders as today; no `bridgeOut` or `/api/processing/` call in source | VERIFIED | Case-insensitive grep over `pages layouts sub-components widgets data styles __tests__ cypress scripts` plus `package.json`/configs for `bridgeOut`, `api/processing`, `koffi`, `pages/api`, `web3modal`, `appkit`, `reduxjs`, `react-redux`, `usePrices`, `coingecko`, `coinpaprika`, `libp2p`, `protobuf`, `OrderForm`, `secure_storage`: zero hits (only `blastapi`/`sgns_key` strings inside `scripts/check-secrets.sh` as gate patterns). `data/` holds only `navbars/navbarRoutes.ts` (Submit a job, My jobs, Earnings). Zero `koffi/web3/ethers/redux/libp2p/protobuf/walletconnect/wagmi/viem` entries in `yarn.lock`. `out/` contains none of those strings. Theme: base `store/appSlice.js` `changeSkin` was never dispatched (`git grep changeSkin a3dd2e6` finds only its own definition) and no stylesheet selects on `data-theme`, so deleting Redux changes nothing; `pages/_app.tsx` still imports `styles/theme.scss`; `ToggleSwitch` (toast only, unrelated to theme) remains in the navbar as before. |
| 3 | Private key, account key and keyed RPC URL gone from source; CI goes red on a planted key in source or `out/` and on a high advisory not in the allowlist | VERIFIED (locally) | Greps above find no key material. Ran `bash scripts/check-secrets.sh` with gitleaks 8.30.1: "no leaks found", exit 0. `--self-test`: 4 fixtures detected (source key literal, keyed RPC URL, 64-hex in `out/`, `bridge-test` file in `out/`), exit 0, no leftover files (`git status` clean). My own independent plants (fresh random `const PRIVATE_KEY = "0x<64hex>"` in `sub-components/`, `out/bridge-test.html`, 64-hex in `out/zz.html`): each exit 1, gate output did not echo the key; clean tree exit 0 again. Audit gate: real `node scripts/check-audit.js` exit 0 ("audit ok") with no "unused allowlist" warnings, so all 14 allowlist entries match live advisories (the allowlist is load-bearing, not vacuous); a planted non-allowlisted high advisory exits 1; a truncated stream (no `auditSummary`) fails closed, exit 1. Every allowlist entry has a one-line reason. |
| 4 | Workflow at branch head has no EC2 `pm2 restart` path; merging to `main` cannot restart the live app | VERIFIED | `aws-ec2-deploy.yml` triggers: `workflow_dispatch` only (the `push: main` trigger present at a3dd2e6 was removed in 55e6288). First step `exit 1`; the SSH/`pm2 restart` step has `if: ref_name == main or develop` with no status function, so GitHub wraps it in implicit `success()` and it is skipped after the failed step. The only other workflow, `ci.yml` (push to main + pull_request, `contents: read`), has no deploy, ssh, or pm2. See Info note below: the dead `ssh`/`pm2 restart` text is still in the file. |
| 5 | Jest and Cypress pass on the slimmed app, counts before and after written down | VERIFIED | `yarn test --ci`: 4 suites, 24 tests, 1 snapshot, all passing. Cypress run by hand (serve-out.js started, `yarn cy:run`, server stopped and confirmed down): `static-shell.cy.js` 6 of 6 passing, exit 0; every test asserts zero `/api/` requests and the nav entries. Counts recorded in 01-01 (baseline 137 Jest tests / 20 suites, 0 Cypress specs) and 01-05/01-06 (24 Jest tests, 1 Cypress spec / 6 tests) SUMMARYs, with a reconciliation line per plan. |

**Score:** 5/5 truths verified, 0 behavior-unverified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.js` | static export | VERIFIED | `output: "export"`, no rewrites/redirects/headers |
| `pages/{index,submit/index,jobs/index,jobs/detail,earnings/index,404}.tsx` | 5 placeholders and a 404 | VERIFIED | Use `sub-components/shared/Placeholder.tsx`; all emitted to `out/`; Cypress asserts h1 and title for each |
| `data/navbars/navbarRoutes.ts` | v1 nav only | VERIFIED | 3 entries; wired into `NavbarDefault.tsx` (Cypress checks the links exist and the old ones do not) |
| `scripts/serve-out.js` | plain static host for Cypress | VERIFIED | Exact file, `.html`, `/index.html`, else 404 page; traversal guard |
| `scripts/check-secrets.sh` + `.gitleaks.toml` | secret gate with self-test | VERIFIED | Run, see truth 3 |
| `scripts/check-audit.js` + `audit-allowlist.json` | audit gate | VERIFIED | Run, see truth 3; unit-tested in `__tests__/scripts/check-audit.test.js` |
| `.github/workflows/ci.yml` | frozen install, build, tests, e2e, gates | VERIFIED (read) / unrun remotely | Actions pinned by SHA; gitleaks tarball sha256-checked; order matches summary |
| `.nvmrc` (22), `package.json` engines `>=22 <23`, `next` 14.2.35 | pins | VERIFIED | `yarn.lock` is the only lockfile; `package-lock.json` not tracked; `yarn check --integrity` in sync; `yarn install --frozen-lockfile --offline --ignore-scripts` succeeds (no `git+ssh` entries left) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `package.json` `test:e2e` | `serve-out.js` + `cy:run` | start-server-and-test | WIRED (script string correct) | Cannot run on this Windows 11 box (needs `wmic.exe`); the tests themselves pass when run by hand |
| `ci.yml` | `check-secrets.sh`, `check-audit.js` | `run:` steps | WIRED | Present and ordered after e2e |
| `NavbarDefault` | `navbarRoutes` | import | WIRED | Cypress finds the three links on every route |
| `_app.tsx` | `styles/theme.scss` | import | WIRED | Theme CSS built into `out/_next` (76.6 kB css chunk) |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SHELL-01 static `out/`, no server/API/rewrites | SATISFIED | truth 1 |
| SHELL-02 server SDK path, koffi, native binaries, protobuf, libp2p, their deps gone | SATISFIED | no tracked dirs/files, zero lock entries |
| SHELL-03 explorer gone | SATISFIED | only 5 placeholder pages remain; nav is 3 entries |
| SHELL-04 Web3Modal, OrderForm, `bridgeOut`, `/api/processing` gone | SATISFIED | grep zero |
| SHELL-05 price/gas pill gone | SATISFIED | no `usePrices`, CoinGecko, CoinPaprika anywhere |
| SHELL-06 Redux gone, theme as today | SATISFIED | no redux in source or lock; theme import intact |
| SHELL-07 pruned deps, single lockfile, frozen install, Node pin | SATISFIED for end state | Group-by-group "green between groups" is recorded in the SUMMARYs and commit trail (e705668, 1f669de, a37ea29, 5a3d4a4); I did not replay each historical commit |
| SHELL-08 five routes plus custom 404 | SATISFIED | out/ and Cypress |
| SHELL-09 Jest and Cypress green, counts recorded | SATISFIED | truth 5 |
| SEC-01 key, account key, keyed RPC URL gone | SATISFIED | gitleaks clean, greps clean (key still in git history: accepted, DEP-04) |
| SEC-02 CI fails on planted secret in source or `out/` | SATISFIED locally; runner proof pending | human item 1 and 2 |
| SEC-03 audit gate with reasoned allowlist | SATISFIED locally; runner proof pending | truth 3 |
| DEP-01 EC2 workflow disabled | SATISFIED on branch; merge-commit read pending | human item 3 |

No orphaned requirements: all 13 mapped to Phase 1 appear in the plans.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build | `yarn build` | exit 0, 7 static pages | PASS |
| Jest | `yarn test --ci` | 24/24, 4 suites | PASS |
| Cypress over out/ | serve-out.js + `yarn cy:run` | 6/6 passing, exit 0 | PASS |
| Secret gate clean | `check-secrets.sh` | exit 0 | PASS |
| Secret gate red | 3 manual plants + `--self-test` | exit 1 each, self-test passes | PASS |
| Audit gate | `check-audit.js` (real, planted, truncated) | 0 / 1 / 1 | PASS |
| Frozen install | `yarn install --frozen-lockfile --offline --ignore-scripts` | success | PASS |

### Probe Execution

No `probe-*.sh` declared or present. Skipped.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | | Grep for `TBD/FIXME/XXX/TODO/HACK` over pages, layouts, sub-components, widgets, data, scripts, tests, cypress, next.config.js and .github: zero hits. Placeholders are intentional v1 stubs that render a real h1 and an honest "not available yet" line | Info | Placeholders are the specified deliverable (SHELL-08), not hidden stubs |

Attribution check: `git log a3dd2e6..HEAD` has 23 commits, all authored by braianxde; no `Co-Authored-By`, "Claude", "Anthropic", "Generated with" or robot marker in any message. Clean.

### Info notes (not gaps)

1. `aws-ec2-deploy.yml` still contains the old `ssh ... pm2 restart gnus-dashboard` step text after the `exit 1` guard. It is unreachable (no push trigger, first step fails, later step is skipped by implicit `success()`), so the criterion holds. A reader who wants the text itself gone would delete the dead step at cutover (DEP-05); a manual dispatch with a fixed guard step is the only way to re-arm it.
2. `jest.config.js` keeps dead module aliases and `collectCoverageFrom` globs for `functions/`, `store/`, `hooks/`, `context/`, `components/`, and a 70% global coverage threshold. Coverage is not enabled by `yarn test`, so nothing breaks, but turning on `--coverage` would be measured against paths that no longer exist.
3. `jest-axe` is a devDependency with no use in `__tests__` yet (Phase 7 a11y work will use it). `@popperjs/core` peer warning for bootstrap is pre-existing and non-blocking.
4. `yarn test:e2e` exits 1 on this Windows 11 machine because `start-server-and-test` shells out to `wmic.exe` while stopping the server. The tests pass first. Not a code defect; Ubuntu CI is expected to be unaffected, which is part of human item 1.
5. The 64-hex check in `out/` matches only quoted 64-hex literals. A dependency that later ships a public 64-hex constant would trip it; the script header says to add an exact-value exception then. It does not trip today.
6. The leaked key still exists in git history and on the live server until rotated: known, accepted, tracked as DEP-04. Not counted against Phase 1.

### Human Verification Required

1. **First CI run on GitHub Actions.** Push or open a PR, confirm all `ci.yml` steps pass on ubuntu-latest (Linux gitleaks install and sha256 check, `yarn test:e2e` without the wmic problem).
2. **Planted-key red on the runner.** A throwaway PR with a fake key literal should fail at the secret gate.
3. **Merge-commit read of the deploy workflow** at merge time, per DEP-01's wording, and a glance that the live EC2 app still serves the old build.

### Gaps Summary

No gaps. Every Phase 1 success criterion and all 13 requirements hold in the code, checked by running the build, Jest, Cypress, both gates (including independent planted fixtures) and by grep. The phase is `human_needed` only because the GitHub Actions run, which was deliberately never triggered, has not confirmed the same commands on a Linux runner.

---

_Verified: 2026-10-26_
_Verifier: Claude (gsd-verifier)_
