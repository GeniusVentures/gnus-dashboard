# GNUS Dashboard

## What This Is

gnus-dashboard is the GNUS processing dashboard: a user submits compute jobs to the SuperGenius network, sees each job's status and results, and sees what their own node processed and earned. One static build runs in two places: inside GeniusWallet, in a WebView that injects a `window.gnus` bridge to the wallet's GeniusSDK, and in a normal desktop browser, talking to GeniusWallet over WalletConnect. Today it is a Next.js 14 app with a Node server that wraps a native SDK through koffi; v1 turns it into a static SPA that asks the wallet for everything.

## Core Value

A user can submit a job and see what happened to it, with the wallet paying and processing in one confirmed call, and never a fake or misleading number on screen.

## Requirements

### Validated

<!-- What the current code already does (brownfield, from .planning/codebase/). Kept as a record; most of it is replaced in v1. -->

- ✓ Job order form: build a job from fields or upload a JSON file, estimate it, pay with ERC1155 `bridgeOut` on Polygon Amoy from a Web3Modal wallet, then submit to the server SDK — existing (`sub-components/job-order/OrderForm.tsx`; payment is not bound to the job)
- ✓ Landing page with live-looking block and transaction tables — existing (the data is random, generated in `BlockchainInfo.tsx`)
- ✓ Analytics page with gauges, map and device mix — existing (static data under `data/charts`, `data/map`)
- ✓ GNUS price and gas display — existing (`usePrices.tsx`, CoinGecko/CoinPaprika plus `/api/gas/gasPrice`)
- ✓ Protobuf decoding of SuperGenius transactions on the server — existing, never called (`CheckTransactions` has no caller)

### Active

- [ ] Static SPA: `output: 'export'`, no API routes, no koffi, no native SDK, no server process
- [ ] One `request({method, params})` client with two transports: injected `window.gnus`, and WalletConnect to GeniusWallet; one provider per session
- [ ] Connect flow that shows the node account and the paying wallet as two labelled identities, and handles wallet offline, SDK not ready and account switch as states
- [ ] Submit a job in the SDK's processing-definition schema through `gnus_estimate` and `gnus_submitJob`, with an idempotency key and a recoverable "paid but not processed" state
- [ ] My jobs: list and detail from `gnus_listJobs` / `gnus_getJob`, live-updated
- [ ] Node earnings from `gnus_getEarnings`, with "not available yet" for fields the SDK cannot provide
- [ ] Remove the literal private key and keyed RPC URL from source; static hosting on one pinned https origin with a strict CSP

### Out of Scope

- Network explorer (blocks, transactions, addresses, analytics gauges, map) — out of v1 by Braian's call; today's versions show random or hardcoded data
- Submitting from a browser that has no GeniusWallet (MetaMask only) — the contract needs a GeniusWallet provider to submit; such users get read-only views at most
- Aggregating children's earnings into a main's view — waits on SDK per-account earnings history (SDK-EARNINGS)
- Two devices as one identity (phone pays, desktop earns) — needs an account-link step signed on both sides that nothing supports yet
- Bundling the export into the wallet behind a custom scheme — the wallet loads a pinned https origin instead
- Running the dashboard's own SDK node or any custodial processing for users — the wallet owns identity, payment and processing

## Context

- **Brownfield.** `.planning/codebase/` maps the current app. ARCHITECTURE.md lists the exact client seams that hit the Node server (`useIPFS.tsx`, `usePrices.tsx`, `OrderForm.tsx`).
- **The contract is owned by the wallet.** The `gnus_*` methods, params, results, error codes and events are defined by GeniusWallet's GSD milestone v4.0: `C:\Users\User\AppData\Roaming\Claude\side-session-notes\local_94695261-420f-43a3-ba9b-3d1ab4973f54\gnus-rpc-contract.md`, canonical copy in GeniusWallet `.planning/research/v4.0-gnus-rpc-contract.md` (branch `claude/gsd-dashboard-bridge-milestone-b6a5e7`). A snapshot is in `research/gnus-rpc-contract.md` here. Change requests go to the wallet side, not into a local fork.
- **Prior work.** A spike on 2026-10-26 ran a bridge test page from this repo (`public/bridge-test.html`, untracked in the main checkout) inside GeniusWallet on Windows and Linux against the real SDK; findings in `research/webview-bridge-spike.md`. Identity edge cases (payer vs node account, address formats, burn-then-fail, reload double-burn): `research/wallet-identity.md`.
- **SDK gaps.** Live cost is always 0 (SDK-CA), Process returns no job id (SDK-JOBID), there is no per-job status, result or earnings query (SDK-STATUS, SDK-RESULT, SDK-EARNINGS). The dashboard ships with those fields null and fills them when the wallet starts returning them. Development runs against a mock `window.gnus` provider that implements the contract.
- **Unmerged remote branches** touch the same code: `origin/develop` (adds unit, integration and e2e tests), `origin/security/credential-management`, `origin/security/authentication-validation`, `origin/security/logging-rate-limiting`, `origin/security/cicd-dependencies`, `origin/security/epic-17`, `origin/chore/update-dependencies`. Local `main` is at the merge of PR #3.

## Constraints

- **Tech stack**: Next.js 14 pages router, React 18, TypeScript (strict off), Yarn Classic 1.x (`yarn.lock` authoritative). Keep the stack; v1 is a re-architecture of the data path, not a framework migration.
- **Static only**: nothing in v1 may need a Node server at runtime. Dynamic routes need a static-export-compatible shape.
- **Two address formats**: SDK address `0x` + 128 hex, EVM address `0x` + 40 hex; never mixed, never converted.
- **Amounts**: decimal strings end to end; no JS `Number` for token amounts.
- **Security**: the repo is public and has a literal private key in `functions/ipfs/node.ts`. It leaves source in v1; rotating it is a human action outside this project.
- **WebView**: the page must work when `window.gnus` arrives late (`gnus#initialized`), must not mount Web3Modal when `window.gnus` exists, and must open external links and downloads in the system browser.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static SPA behind one `request()` interface, `window.gnus` in the wallet and WalletConnect in a browser (Braian, 2026-10-26) | The wallet already holds the user's keys, SDK and node; a server that runs its own SDK key gives free unauthenticated compute and no per-user identity | — Pending |
| The wallet owns the `gnus_*` contract (Braian, 2026-10-26) | One implementation of identity, payment and processing; the dashboard is a client of it | — Pending |
| `gnus_submitJob` is atomic in the wallet; the dashboard never calls `bridgeOut` (D, overnight 2026-10-26) | Splitting pay and submit across providers is how the current app lets payment and job drift apart | — Pending |
| Network explorer out of v1 (Braian, 2026-10-26) | Today's explorer data is fake; the SDK read side is not ready | — Pending |
| Planning run in auto mode overnight; choices marked (D) in STATE.md (2026-10-26) | Braian asked for both repos to run on GSD overnight with the session answering its own questions | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-26 after initialization*
