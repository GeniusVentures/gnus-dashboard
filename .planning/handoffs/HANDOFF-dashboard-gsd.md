# Handoff: gnus-dashboard GSD, overnight run 2026-10-26/27

Worktree `C:\Users\User\Documents\Projects\GNUS\gnus-dashboard-gsd`, branch `gsd/dashboard-v1`, cut from local
`main` 479b95f (the codebase map commit). Nothing pushed, no PR, no remote CI run. The main checkout
`gnus-dashboard` (with its untracked spike test page) was not touched. All commits braianwegmann@gmail.com,
no Claude attribution.

Braian asked for both repos to run on GSD overnight with the session answering its own questions. The
project was initialised with `/gsd-new-project --auto`; every choice is marked (D) in STATE.md Decisions,
research/SUMMARY.md and the phase CONTEXT files. None is reviewed yet.

## What exists now

- PROJECT.md, config.json, research/ (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY, plus snapshots of the
  wallet-owned contract and the spike notes), REQUIREMENTS.md (85 reqs, 13 categories), ROADMAP.md (8 phases).
- Phase 1 done: static export (`out/`, no server), explorer/server SDK/Web3Modal/OrderForm/price pill/Redux
  deleted, secrets removed from the tree (still in git history), EC2 deploy workflow manual-only and failing
  on purpose until cutover, gitleaks + out/ secret gate and audit gate with self-tests, `yarn test:e2e` runs
  on Windows. Reviewed (CR-01 dev server on 0.0.0.0 fixed + 4 warnings).
- Phase 2 done: `lib/gnus/` typed client, zod schemas, error table (28 rows), exact amounts (BigInt only in
  amount.ts), detection rules, mock wallet with 20 fault profiles, conformance suite, mock-exclusion gate.
  Reviewed (7 warnings fixed). Jest 18 suites / 327 tests, Cypress 8, strict tsc clean.
- Both phases verified human_needed: remote CI never ran; real-wallet conformance waits on the wallet's
  transport (wallet phases 45-47); dev-server browser check with the mock not done.

## Needs Braian

1. Review the (D) decisions (research/SUMMARY.md D1-D7 and resolutions).
2. Hosting and the pinned https origin (blocks phase 7 and the wallet's release allowlist).
3. Delete the price and gas pill for good? (done in phase 1 on that assumption)
4. Who owns the Reown project id; who rotates the leaked key and moves funds off the server account (DEP-04).
5. 14 audit advisories are allowlisted (12 `next`, 2 its `postcss`); they need Next 15.
6. Phase 3 (connect and identity) is the first user-facing UI; not started on purpose.

## Next

`/gsd-discuss-phase 3`, then plan and execute. Phases 4 and 5 can run in parallel after 3.
