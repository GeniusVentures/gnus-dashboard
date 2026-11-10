---
phase: 1
slug: teardown-and-static-shell
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-26
---

# Phase 1 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Every task in 01-01 to 01-06 carries an automated verify command; this file says which command proves which roadmap success criterion.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.0.5 (jest-environment-jsdom, `next/jest` with babel-jest); Cypress 14.5.3 (binary already cached; configured in 01-05); gitleaks 8.30.1 (external binary, SHA-256 pinned, 01-06); `yarn audit` from the vendored Yarn Classic 1.22.22 (01-06) |
| **Config file** | `jest.config.js`, `jest.setup.js`, `__tests__/utils/jest.polyfills.js`; `cypress.config.js` (01-05); `.gitleaks.toml` and `audit-allowlist.json` (01-06) |
| **Quick run command** | `yarn jest --ci <test file>` |
| **Full suite command** | 01-01 to 01-04: `yarn build && yarn jest --ci`. From 01-05: `yarn build && yarn test --ci && yarn test:e2e`. From 01-06 add: `bash scripts/check-secrets.sh && bash scripts/check-secrets.sh --self-test && node scripts/check-audit.js` |
| **Estimated runtime** | build 60-180 s, Jest 20-60 s, Cypress 30-90 s, gates 30-90 s. 01-01 Task 0 measures the real numbers. |

Jest is invoked as `yarn jest --ci` (one process over the config's testMatch) for every count, because the old `yarn test` runner splits files into three runs and skips new folders. 01-04 makes `yarn test` plain `jest`, after which both commands are the same.

---

## Sampling Rate

- **After every task commit:** that task's `<automated>` command. Every deletion group runs `yarn build` plus Jest before its commit (D-03).
- **After every plan:** the full suite command for that point in the phase.
- **Before `/gsd-verify-work`:** the full suite plus both gates plus the local run of every `ci.yml` step (01-06 Task 3), all green.
- **Max feedback latency:** about 5 minutes (build plus Jest). That is above the usual 60 s target, and accepted: D-03 requires a real build between every group, and no faster command proves the export.

---

## Baseline rule

01-01 Task 0 records, before any file changes: BASE sha, `node -v`, `yarn build` result, `yarn jest --ci` totals and a per-file table, the `yarn test` exit code, and one exact line `Cypress verify: passed` or `Cypress verify: failed` with the Cypress baseline of 0 specs (no config or spec is tracked).

If the baseline is red, the gate between groups is: no failure the baseline did not have, and each baseline failure is gone by the D-03 group that deletes its cause. A failure in kept code gets the smallest fix in its own commit before group 1.

Count reconciliation (01-05 Task 2): baseline total, minus every deleted test file with its baseline count (listed by name in the 01-01 to 01-04 SUMMARYs, D-04), plus every added test file, equals the after-teardown total. 01-06 adds `__tests__/scripts/check-audit.test.js` on top and records the final total.

## Cypress fallback

If 01-01 Task 0 records `Cypress verify: failed`, Cypress cannot launch headless on this machine. The harness is still written and committed, and CI runs it. Local gating then uses Jest plus `yarn build` plus a curl smoke against `scripts/serve-out.js`: every v1 route answers 200 with its h1, and an unknown path answers 404. The 01-05 and 01-06 verify commands read that line to pick the fallback, and VERIFICATION records it as a gap.

---

## Success Criteria to Checks

| Roadmap criterion | Proven by | Command (in the task's verify) |
|-------------------|-----------|--------------------------------|
| 1. `yarn build` writes `out/`; a plain static server shows every placeholder route and the custom 404; no Node process, API route, koffi or native SDK file in source or build | 01-02 Task 1, 01-04 Task 1, 01-05 Tasks 1-2 | `functions/` and `pages/api/` absent, no `.dll/.so/.dylib` tracked; koffi not installed; the six `out/*.html` files exist, no `out/api`, no native file or koffi string in `out/`; `yarn test:e2e` (Cypress over serve-out.js) incl. 404 status |
| 2. Explorer, Web3Modal, OrderForm, price and gas pill and Redux gone from source and navigation; theme renders as today (revised 2026-10-27 overnight: no switch exists); no `bridgeOut` or `/api/processing/` call in source | 01-01 Task 1, 01-02 Task 2, 01-03 Tasks 1-2, 01-05 Task 2 | per-group `test ! -e` and `git grep` checks; the tree-wide grep for the payment call and processing routes (01-03 Task 1); 01-03 Task 2 keeps the stylesheet imports in `_app.tsx` unchanged (nothing sets or reads `data-theme`, as before); Cypress nav check (no /analytics, /job-orders, /wallet) |
| 3. Private key, account key and keyed RPC URL gone from source; CI goes red on a planted key in source or `out/` and on an unlisted high advisory | 01-02 Task 1, 01-06 Tasks 1-3 | pattern grep for the key names and RPC host; `bash scripts/check-secrets.sh --self-test` (4 planted fixtures red, clean tree green) plus the real-leak evidence run from BASE; `yarn jest --ci __tests__/scripts/check-audit.test.js` (planted advisory) plus `node scripts/check-audit.js`; ci.yml structure check |
| 4. Workflow at the branch head has no EC2 `pm2 restart` path; live EC2 keeps the old build | 01-01 Task 2 | parsed `aws-ec2-deploy.yml`: only `workflow_dispatch`, unconditional guard step that exits 1 ahead of the unchanged deploy step. Live EC2 is unchanged by construction: nothing is pushed (D-02) |
| 5. Jest and Cypress pass on the slimmed app, counts before and after written down | 01-01 Task 0, 01-05 Task 2, 01-06 Task 3 | baseline table; `yarn test --ci` and `yarn test:e2e` green with the reconciliation table; final local CI run |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-00 | 01 | 1 | SHELL-09 | T-01-SC | frozen install, no tracked change | baseline | `git status` clean outside .planning, Baseline section and Cypress line present | n/a | pending |
| 01-01-01 | 01 | 1 | SHELL-03, SHELL-08 (/) | T-01-03 | explorer search input removed | build, Jest, path and grep checks | `yarn build && yarn jest --ci` plus `test ! -e` loop and grep | `__tests__/pages/placeholders.test.jsx` created in task | pending |
| 01-01-02 | 01 | 1 | DEP-01 | T-01-01, T-01-02 | no push trigger, guard exits 1 first | static parse | python yaml check of `aws-ec2-deploy.yml` | yes | pending |
| 01-02-01 | 02 | 2 | SHELL-02, SEC-01 | T-01-04 to T-01-07 | secrets and API routes gone, values never printed | build, Jest, grep | `yarn build && yarn jest --ci` plus absent paths and pattern grep | n/a | pending |
| 01-02-02 | 02 | 2 | SHELL-04 | T-01-08, T-01-09 | no second wallet provider, no payment call | build, Jest, grep | `yarn build && yarn jest --ci` plus absent paths and grep | n/a | pending |
| 01-03-01 | 03 | 3 | SHELL-05 | T-01-10 | no third-party price calls | build, Jest, grep | `yarn build && yarn jest --ci` plus tree-wide payment and processing-route grep | n/a | pending |
| 01-03-02 | 03 | 3 | SHELL-06 | n/a | N/A | build, Jest, grep | `yarn build && yarn jest --ci` plus absent store/ and app.config files and Redux grep | n/a | pending |
| 01-04-01 | 04 | 4 | SHELL-07, SHELL-02 | T-01-14 | exact remaining dependency set | build, Jest, node check | `yarn build && yarn jest --ci` plus exact dependency-set assertion | n/a | pending |
| 01-04-02 | 04 | 4 | SHELL-07 | T-01-SC, T-01-13, T-01-15 | one lockfile, frozen install unchanged | install, build, Jest | pins assertion, `yarn install --frozen-lockfile && git diff --quiet yarn.lock && yarn build && yarn test --ci` | n/a | pending |
| 01-05-01 | 05 | 5 | SHELL-01, SHELL-08 | T-01-17, T-01-18 | no scripted demo page, no SPA rewrite | build, Jest, out/ checks | `yarn build && yarn test --ci` plus out/ file and content checks and next.config assertion | placeholder test extended in task | pending |
| 01-05-02 | 05 | 5 | SHELL-09, SHELL-01 | T-01-16 | traversal and non-GET refused | e2e and curl | `yarn test:e2e` (or the recorded fallback) plus curl 404, 405 and 200 checks | Cypress config and spec created in task | pending |
| 01-06-01 | 06 | 6 | SEC-02 | T-01-20, T-01-21, T-01-24 | planted secrets go red, output redacted | gate self-test | `bash scripts/check-secrets.sh && bash scripts/check-secrets.sh --self-test` | created in task | pending |
| 01-06-02 | 06 | 6 | SEC-03 | T-01-22, T-01-23 | unlisted high fails, audit failure fails closed | unit (TDD) and live audit | `yarn jest --ci __tests__/scripts/check-audit.test.js && node scripts/check-audit.js` | created in task, before the script | pending |
| 01-06-03 | 06 | 6 | SHELL-07, SHELL-09, SEC-02, SEC-03 | T-01-25, T-01-26 | read-only token, SHA-pinned actions, checksum-verified binary | static parse and local run | python yaml check of `ci.yml`, then its steps 3 to 10 locally in order | created in task | pending |

Status values: pending, green, red, flaky.

---

## Wave 0 Requirements

The phase reuses the existing Jest setup. There is no separate Wave 0 plan; each new check is created inside the task that needs it, before the code it checks:

- [ ] Baseline measurement (01-01 Task 0). `wave_0_complete` stays false until it has run.
- [ ] `__tests__/pages/placeholders.test.jsx`: 01-01 Task 1, extended in 01-05 Task 1.
- [ ] `cypress.config.js` and `cypress/e2e/static-shell.cy.js`: 01-05 Task 2.
- [ ] `scripts/check-secrets.sh --self-test`: 01-06 Task 1.
- [ ] `__tests__/scripts/check-audit.test.js`: 01-06 Task 2, written and seen failing before `scripts/check-audit.js`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live EC2 app keeps serving the old build | DEP-01 | nothing is pushed tonight (D-02), so it cannot change; checking it needs only a read | optional: `curl -sI https://dashboard.gnus.ai` shows the same status before and after the phase |
| Remote CI is green and the EC2 workflow does not start | SHELL-07, SEC-02, SEC-03, DEP-01 | D-02 forbids pushing | on the first push of the branch: the CI workflow passes and no aws-ec2-deploy run appears |
| Leaked key rotated and funds moved | SEC-01 (DEP-04) | human action; the key stays in git history (D-06) | tracked on the cutover checklist, not in this phase |

## Gaps that VERIFICATION must record

- Remote CI not run (D-02); every workflow command was run locally instead.
- The private key, account key and RPC token stay in git history (D-06); rotation is DEP-04.
- If `Cypress verify: failed`, Cypress was not run locally; the curl fallback evidence stands in.
- D-05 revised 2026-10-27 overnight: no theme switch exists (`changeSkin` was never dispatched and no stylesheet selects on `data-theme`), so Redux is deleted with no replacement and the theme renders as today. A toggle control is a product decision outside this phase.

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 items created (set during execution)
- [x] No watch-mode flags
- [ ] Feedback latency measured in 01-01 Task 0 (target under 5 minutes)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
