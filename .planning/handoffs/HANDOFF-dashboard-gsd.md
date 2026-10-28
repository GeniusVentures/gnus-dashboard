# Handoff: gnus-dashboard GSD, 2026-10-28

Worktree `C:\Users\User\Documents\Projects\GNUS\gnus-dashboard-gsd`, branch `gsd/dashboard-v1`, cut from local
`main` 479b95f. The branch is pushed to origin; PR #36 is open. The main checkout `gnus-dashboard` was not touched.
All commits are authored braianwegmann@gmail.com with no Claude attribution. Every scoping choice marked (D)
in STATE.md and the phase CONTEXT files is still unreviewed by Braian.

## What is built

Phases 1-6 are done and verified locally. Phase 7 is executed except 07-04.
- 1: static export (`out/`), no server, no secrets in the tree, gitleaks and audit gates, EC2 deploy manual-only.
- 2: typed `gnus_*` client (zod, exact amounts, error table), mock wallet with fault profiles, conformance suite.
- 3: connect and identity, every wallet state has its own screen.
- 4: submit a job: load, estimate, one wallet confirm, outcome screens, recovery after a reload.
- 5: My jobs (with earnings folded in), job detail by deep link, live events, null-first display.
- 6: WalletConnect pairing for a desktop browser; the export keeps WalletConnect out of the wallet's WebView.
- 7: headers as code (`scripts/headers.js`), CSP, self-hosted fonts, axe on every route, keyboard-only submit,
  Cloudflare Pages deploy workflow (has never run). 07-04 (enforce the CSP) waits for a hosted pairing.

## Numbers

Jest 834, Cypress 189, CSP check 7 of 7 routes with zero violations (also with the policy enforced, tried and
reverted).

## Linux walk, 2026-10-28

Wallet on the slave box, dashboard on a loopback origin (no hosted origin exists).
- In the wallet: connect, reject, approve, revoke, redirect lock all passed; the estimate shows
  "Price unavailable" because SDK-CA is not fixed.
- Over WalletConnect from Chromium: pair, gnus connect, header, disconnect passed.
- Not walked: a live spend, the Reown Verify frame and relay under the CSP, Windows, Android, iOS, macOS.

## Braian's checklist

1. Cloudflare: create a Direct Upload Pages project. Pick the domain; the wallet's release build pins it
   (wallet phase 46 shows the placeholder `https://gnus-dashboard-staging.invalid` until then).
2. GitHub secrets `CLOUDFLARE_API_TOKEN` (Pages Edit only, nothing wider) and `CLOUDFLARE_ACCOUNT_ID`; variable
   `CLOUDFLARE_PAGES_PROJECT`. Until all three are set the deploy step skips itself.
3. GitHub environments `production` and `preview`, each with `NEXT_PUBLIC_WC_PROJECT_ID`.
4. Two Reown projects (production, preview), each with its domain verified.
5. After the first deploy, pair the Linux wallet with the hosted preview under report-only. With zero CSP
   reports, set `CSP_ENFORCED = true` in `scripts/headers.js`, deploy, and check `curl -sI` shows
   `Content-Security-Policy`. Then pair again and use Submit (estimate), My jobs, a job detail and Earnings.
6. Choose the IPFS gateway for result links. `lib/jobs.ts` uses `ipfs.io` as a placeholder.
7. Rotate the leaked key that is still in git history and move funds off the server account. It stays valid
   until you do, and the cutover gate (DEP-04) needs it done.

## Waiting on others

SDK-CA (live cost is always 0), SDK-JOBID, SDK-STATUS, SDK-RESULT, SDK-EARNINGS, and a GeniusWallet store
release with `gnus_*`. SDK asks are written up at https://claude.ai/artifact/MpV91q6AHVqZh2Nwuk5K3T.
14 audit advisories stay allowlisted until Next 15.

## Next

Phase 8 (device walks and cutover) is unplanned and waits on wallet phase 48 and the items above.
