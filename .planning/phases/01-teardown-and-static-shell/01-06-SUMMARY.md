---
phase: 01-teardown-and-static-shell
plan: 06
status: complete
---

# Phase 1 Plan 6: Secret gate, audit gate, CI workflow Summary

A gitleaks plus grep secret gate with a self-test, a dependency audit gate with 14 reasoned allowlist entries, and a SHA-pinned CI workflow, all proven by running the same commands locally.

**Tasks:** 3/3. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Secret gate | 92d3455 | ci(01): secret gate for source and out/ (SEC-02) |
| 2 Audit gate | 3a0decc | ci(01): dependency audit gate with allowlist (SEC-03) |
| 3 CI workflow | c08b443 | ci(01): CI workflow with frozen install, tests and gates |

## Secret gate (SEC-02)

gitleaks 8.30.1 Windows release downloaded to a temp dir outside the repo; SHA-256 d29144de...afc4e matched. The scan takes about 1 s on the source tree.

- `bash scripts/check-secrets.sh`: exit 0 on the real tree (source scan 3.58 MB, no leaks; out/ clean).
- Setup errors: `GITLEAKS=/nonexistent` exits 2 ("gitleaks not found"); with out/ moved away it exits 2 ("out/ is missing").
- `--self-test` output: `detected: private-key literal in source`, `detected: keyed RPC URL in source`, `detected: 64-hex string in out/`, `detected: bridge-test page in out/`, then `secret self-test passed: 4 fixtures detected, clean tree passes`. Fixture values come from /dev/urandom at run time; the test also asserts that gate output never echoes the planted value. No fixture file or folder is left behind (checked in the repo root and out/).
- Real-leak evidence (files taken from BASE 27bcdd5, in a temp folder that was deleted): per-rule counts hex-private-key 1 (functions/ipfs/node.ts), sgns-key 1 (data/secure_storage.json), keyed-rpc-url 1 (pages/api/gas/gasPrice.ts). Values never printed.

## Audit gate (SEC-03)

`yarn audit --groups dependencies --json` through the vendored Yarn.

| | High | Critical | Unique GHSA ids |
|---|------|----------|-----------------|
| Before the lock refresh (summary line) | 20 | 3 | 22 |
| After the refresh | 11 | 3 | 14 |

Fixed in yarn.lock, not allowlisted: `yarn upgrade sass` (sass 1.106.1, immutable 5.1.9), then removal of the stale picomatch, source-map-js and nanoid entries and `yarn install` (picomatch 2.3.2, source-map-js 1.2.2, nanoid 3.3.20). No direct range changed, no `resolutions`. The built CSS bundle keeps its 76.6 kB size but its hash changed (210f963003a5c6a3 to 6d3e6ff69860c63d) because sass moved.

Remaining and allowlisted (14 entries, each with a reason naming the feature, why a static export is not reached, and the fixing version): 12 next advisories (App Router Server Functions and Server Actions DoS and SSRF, WebSocket upgrade SSRF, i18n middleware bypass, rewrites SSRF, Windows-hosted server RCE, two image-optimization RCEs) fixed only in next 15.x, and 2 postcss advisories (sourceMappingURL file read) in the postcss 8.4.31 that next pins exactly. None affects code that ships in `out/`. Note: the 01-04 commit message said three Next advisories were fixed inside 14.2.x; the advisory database today lists patches for all of them only in 15.x, so 14.2.35 still shows them and they sit on the allowlist. That is a decision for the cutover: moving to Next 15 would remove 12 of the 14 entries.

Jest: `__tests__/scripts/check-audit.test.js` 6 tests, written first and red (module missing), then green. `node scripts/check-audit.js`: "audit ok", exit 0. `yarn install --frozen-lockfile` leaves the staged yarn.lock unchanged.

## CI workflow

`.github/workflows/ci.yml` parses; triggers push to main and pull_request; `permissions: contents: read`; both actions pinned by commit SHA; steps in order frozen install, build, Jest, `yarn test:e2e`, gitleaks install with checksum, secret gate, self-test, audit.

Local run of the same commands (exit codes):

| Step | Command | Exit |
|------|---------|------|
| 7 | gitleaks Linux tarball download, `sha256sum -c` against 551f6fc8...470eb, extract (not executed) | 0, 0, 0 |
| 3 | `yarn install --frozen-lockfile` | 0 |
| 4 | `yarn build` | 0 |
| 5 | `yarn test --ci` (4 suites, 24 tests, 1 snapshot) | 0 |
| 6 | Cypress over serve-out.js, 1 spec, 6 tests passing | 0 (see gap) |
| 8 | `bash scripts/check-secrets.sh` | 0 |
| 9 | `bash scripts/check-secrets.sh --self-test` | 0 |
| 10 | `node scripts/check-audit.js` | 0 |

remote CI not run (D-02); proven by running the same commands locally.

## Final totals

Jest `yarn test --ci`: 4 suites, 24 tests (18 from 01-05 plus 6 audit cases), 1 snapshot, exit 0. Cypress: 1 spec, 6 tests, all passing.

## Deviations from Plan

1. **[Rule 3 - Blocking] Audit test runs in jsdom.** The plan asks for an `@jest-environment node` docblock, but `jest.setup.js` (outside this plan's files) touches `window` and fails every suite in a node environment. The docblock is omitted; the test uses plain functions only.
2. **[Environment gap] `yarn test:e2e` exits 1 locally** because start-server-and-test calls `wmic.exe` to stop the server and Windows 11 has none (see 01-05 SUMMARY). The Cypress tests pass first. Step 6 was run as the manual equivalent. Ubuntu CI is not affected, but this is unproven on the real runner until a push.
3. `scripts/check-secrets.sh` fixture check for the bridge-test file passes an unrelated random value to the "output must not echo the secret" assertion, because the file name itself legitimately appears in the failure line.
4. The EXIT trap expands the temp folder name when it is set, since a local variable is unbound when the trap fires under `set -u`.
5. The chained verify blocks were run in their parts; gitleaks was present from Task 1 so the Gap line was never written.
6. The `check-secrets.sh` file mode is not set executable in git; CI calls it with `bash`.

## Threat flags

None beyond the plan's register. The allowlist is the accepted residual risk: 14 advisories in `next` and its pinned `postcss`, all server-side or build-time.

## Self-Check

Commits found in `git log`; author braianwegmann@gmail.com on all; `grep -ic claude` over the commit messages since 82c9e24 is 0 (checked before return); no fixture or leftover server left behind.
