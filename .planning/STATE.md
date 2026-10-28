---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Static dashboard on the gnus_* contract
current_phase: 7
current_phase_name: "Hosting and CSP hardening"
status: waiting_on_human
stopped_at: "2026-10-28: Phases 1-6 done, phase 7 executed except 07-04 (CSP enforcement), which waits on a hosted pairing. Linux walk passed in the wallet and over WalletConnect from Chromium. Cloudflare, the Reown projects and the pinned origin do not exist yet. Branch pushed."
last_updated: "2026-10-28T17:00:00.000Z"
last_activity: 2026-10-28
last_activity_desc: Phase 7 executed locally; the Cloudflare deploy workflow is complete and has never run
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 40
  completed_plans: 39
  percent: 75
resume_file: null
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-26)

**Core value:** A user can submit a job and see what happened to it, with the wallet paying and processing in one confirmed call, and never a fake or misleading number on screen.
**Current focus:** Phase 7 - Hosting and CSP hardening

## Current Position

Phase: 7 of 8 (Hosting and CSP hardening)
Plan: 3 of 4 in current phase (07-04 waits on a human)
Status: Waiting on a human (Phases 1-6 done and verified locally; phase 7 executed except enforcement; the deploy workflow has never run)
Numbers: Jest 834, Cypress 189, CSP check 7 of 7 routes with zero violations.
Linux walk (2026-10-28, loopback origin): in the wallet and over WalletConnect from Chromium (pair, connect, header, disconnect) passed. A live spend is untested until SDK-CA; the hosted origin, the Reown ids and CSP enforcement are untested.
Last activity: 2026-10-28 - Phase 7 executed locally

Progress: [#######...] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full log in PROJECT.md Key Decisions. Every item below was taken overnight in auto mode and is open to Braian's review.

- D1: `@tanstack/react-query` for server state keyed by `sdkAddress`, plus one small React context for provider and session; Redux deleted. (D) overnight, not reviewed by Braian
- D1b: The dashboard never decides which EVM chains may estimate or submit. The wallet burns on Amoy, BNB Testnet and Sepolia and answers `-32013 bridge_unavailable` for any other; the header shows the reported network, and only a different SDK network (`NEXT_PUBLIC_GNUS_SDK_NETWORK`, default staging) shows a banner and blocks. (Braian, 2026-10-28)
- D1a: The account-switch epoch is the react-query key `[kind, network, sdkAddress]`; `gnus_accountsChanged` and `switching` flips cancel and remove old keys; a delayed-response-across-a-switch test is required. (D) overnight, not reviewed by Braian
- D2: `@walletconnect/sign-client` 2.26.0, pinned, dynamic import only; no AppKit, no UniversalProvider. (D) overnight, not reviewed by Braian
- D3: Stay on Next 14.2.x for v1; Next 16 is a follow-up (PLAT-01). (D) overnight, not reviewed by Braian
- D4: Base v1 on `gsd/dashboard-v1` and merge no remote branch; port by hand. (D) overnight, not reviewed by Braian
- D5: Job detail is a query-param route (`/jobs/detail?id=` or `?hash=`), read after `router.isReady`. (D) overnight, not reviewed by Braian
- D6: Delete `OrderForm.tsx`, `data/orderForm/*` and all explorer pages; job input is upload or paste of a processing-definition JSON plus one bundled example. (D) overnight, not reviewed by Braian
- D7: Cut over EC2 only after a wallet release with `gnus_*`; keep EC2 for rollback; keep the existing origin. (D) overnight, not reviewed by Braian
- Validation: zod at the single trust boundary; `strict: true` once the legacy surface is gone, with `tsconfig.strict.json` over `lib/gnus` and new pages until then. (D) overnight, not reviewed by Braian
- Job schema: no local copy; the wallet answers `-32602`; the dashboard checks only a JSON object with the top-level keys. (D) overnight, not reviewed by Braian
- CSP: `script-src 'self'`; ship report-only first. (D) overnight, not reviewed by Braian
- `trailingSlash`: decided with the host; deep-link refresh tested on the real host. (D) overnight, not reviewed by Braian
- Price and gas pill: deleted in v1 (SHELL-05). (D) overnight, not reviewed by Braian
- U5: paid-but-not-processed shows the burn hash, a copy button and a pointer to the wallet; no retry button until the wallet adds `gnus_retryProcess`. (D) overnight, not reviewed by Braian
- Submit draft: the idempotency key binds to a SHA-256 of the sent JSON; localStorage holds the key, hash, label and timestamps, never the job body. A reload cannot restore the typed job; loading the same job again finds the same key. (Braian, 2026-10-28)
- Explorer link for the burn hash on the submit result is in v1 (was v2 JOBX-03). (Braian, 2026-10-28)
- Job status words, the 30 s poll only while a job can change, and the IPFS gateway constant (`ipfs.io`, for Braian to confirm) live in `lib/jobs.ts`. `yarn lint` (every external link through `ExternalLink`) runs in CI. (D) overnight, not reviewed by Braian
- Phase 6: the secret gate lists the 17 public curve constants that `@noble/curves` ships in the WalletConnect chunk by exact value in `.gitleaks.toml`, and `check-secrets.sh` reads that list; the WC-01 export test watches the module chunk because a build without a Reown id never fetches Reown's client. (D) not reviewed by Braian
- Phase 7: policy and headers live in `scripts/headers.js` only; `CSP_ENFORCED` stays false until a hosted pairing passes under report-only. Three prerendered style attributes became classes instead of opening `style-src-attr`. Disconnect buttons use `btn border` (outline-secondary failed light contrast). (D) not reviewed by Braian
- Roadmap: Earnings folded into My jobs; SUMMARY's Phase 8 split into hosting/CSP (Phase 7) and device walks plus cutover (Phase 8); "Load example" only, no example download. (D) overnight, not reviewed by Braian

### Pending Todos

None yet.

### Blockers/Concerns

- SDK-CA: live cost is always 0, so a real submit cannot be walked end to end; the UI ships "Price unavailable" until it lands.
- Cloudflare Pages is chosen but nothing exists on it: no account, token, project, domain or Reown project ids. The origin is still undecided and the wallet's Phase 46 release pinning needs it. The deploy workflow skips itself until the secrets exist.
- The leaked private key stays valid until a human rotates it and moves funds off the server account (DEP-04 gate).
- The contract is a hand transcription with no machine-readable fixtures; `version` is the tripwire.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-10-26
Stopped at: Requirements and roadmap written; Phase 1 ready to plan
Resume file: None
