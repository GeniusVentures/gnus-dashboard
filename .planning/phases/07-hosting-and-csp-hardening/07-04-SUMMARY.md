---
phase: 07-hosting-and-csp-hardening
plan: 04
status: waiting
requirements: [SEC-06]
actuals:
  tasks: 0
  commits: 1
---

# Phase 7 Plan 4: Enforce the CSP Summary

Not done, by design. The precondition holds no record of a GeniusWallet build from wallet phase 47 paired with a hosted dashboard under the report-only policy. Enforcement waits on two things: wallet phase 47 shipping a build, and the dashboard origin being registered and verified in Reown Cloud (which also needs the Cloudflare host and project ids from 07-03).

## What was prepared

| Commit | Subject |
|--------|---------|
| 65faf07 | Make the check-deploy tests independent of whether the CSP is enforced |

- Flipping is one line, `CSP_ENFORCED = true` in `scripts/headers.js`. The tests no longer name the report-only header, so nothing else changes.
- The flip was tried in the working tree and reverted. With it: the header tests (47) pass, `out/_headers` carries `Content-Security-Policy` and no report-only header, `yarn test:csp` passes all seven routes with zero violations, and `check-deploy.js` passes against `serve-out.js` in enforced mode. The policy text is the same in both modes.

## Gaps for a human

1. Wallet phase 47 build, a Reown project id, a verified origin: pair the Linux GeniusWallet with the hosted preview from a desktop browser under report-only, with zero CSP reports in the console and every read method answered.
2. Then set `CSP_ENFORCED = true`, deploy, and check `curl -sI` shows `Content-Security-Policy`. In desktop Chrome pair the Linux wallet, open Submit (estimate), My jobs, a job detail and Earnings, disconnect and reconnect; no CSP violation. Record whether the wallet was a release or a debug build.
3. The Reown Verify frame and the relay socket have only run against the policy as text; no browser has connected to either under it.

## Self-Check: PASSED
