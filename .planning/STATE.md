---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Static dashboard on the gnus_* contract
current_phase: 5
current_phase_name: "My jobs and earnings"
status: ready_to_execute
stopped_at: "2026-10-28: Phase 4 executed (7 plans) on the mock. Needs a human look at light and dark, and a run against a real wallet. Phase 5 is planned and can execute next. Nothing pushed."
last_updated: "2026-10-28T12:00:00.000Z"
last_activity: 2026-10-28
last_activity_desc: Phase 4 executed on the mock; draft binds to a job hash, explorer link accepted for v1
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 32
  completed_plans: 26
  percent: 50
resume_file: null
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-26)

**Core value:** A user can submit a job and see what happened to it, with the wallet paying and processing in one confirmed call, and never a fake or misleading number on screen.
**Current focus:** Phase 1 - Teardown and static shell

## Current Position

Phase: 5 of 8 (My jobs and earnings)
Plan: 0 of 6 in current phase
Status: Ready to execute (Phases 1-4 done and verified locally; remote CI not run)
Last activity: 2026-10-28 - Phase 4 executed on the mock

Progress: [#####.....] 50%

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
- Roadmap: Earnings folded into My jobs; SUMMARY's Phase 8 split into hosting/CSP (Phase 7) and device walks plus cutover (Phase 8); "Load example" only, no example download. (D) overnight, not reviewed by Braian

### Pending Todos

None yet.

### Blockers/Concerns

- SDK-CA: live cost is always 0, so a real submit cannot be walked end to end; the UI ships "Price unavailable" until it lands.
- Host and pinned origin are undecided: they block Phase 7 and the wallet's Phase 46 release pinning. Raise before Phase 7 planning.
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
