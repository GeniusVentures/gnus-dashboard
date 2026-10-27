# Roadmap: GNUS Dashboard

## Overview

v1 turns the Next.js app with a Node/koffi server into a static SPA that asks GeniusWallet for everything through the wallet-owned `gnus_*` contract. The work runs mock-first: delete the server, explorer, Web3Modal, OrderForm and Redux and lock the secrets out (Phase 1); build the one typed contract client and a mock wallet with real faults (Phase 2); then the connect screen, submit, my jobs and earnings on the in-wallet path (Phases 3-5); then the browser path over WalletConnect (Phase 6); then hosting and a strict CSP (Phase 7); and last the device walks and the cutover from EC2 (Phase 8). Every phase finishes against the mock. Where real data waits on the wallet's milestone v4.0 or on the SDK, the UI shows a designed "not available yet" or "price unavailable" state and the live check is recorded as a gap, never skipped.

**Phase order.** SUMMARY.md's eight phases, with two changes. Earnings is folded into My jobs (SUMMARY allows it): four requirements over one read method, built on the same null-safe display. SUMMARY's Phase 8 is split into Phase 7 (hosting, CSP, a11y: finishable now on a preview deploy with the mock) and Phase 8 (device walks and cutover: they wait on wallet releases and SDK-CA). The split keeps the externally blocked work from holding the hardening phase open. Eight phases is above the standard granularity band; the alternative of folding Phase 2 into Phase 3 makes one 20-requirement phase and hides the contract layer that everything else tests against.

**Parallelism.** Phases 4 and 5 both need only Phase 3 and can run side by side. Each code-committing executor needs its own worktree. Phase 6's transport code can start after Phase 3, but its expiry recovery reuses Phase 4's key recovery, and its event handling feeds Phase 5's views. Host setup (DEP-02) and the self-hosted fonts (SEC-07) in Phase 7 can start any time after Phase 1. Phase 8 lines up with the wallet's Phase 48 so both sides walk together.

**Cross-repo.** The wallet's Phase 46 pins the dashboard's release origin. That origin is chosen here (Phase 7, DEP-02) and has to be decided before the wallet's release build. See "Dependencies (not dashboard work)" in REQUIREMENTS.md for every external wait and what the UI shows meanwhile.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Teardown and static shell** - The app exports to static files with no server, no secrets and no old payment path, and a merge to main cannot break the live site
- [ ] **Phase 2: Contract client and mock wallet** - One typed `gnus_*` client and a mock wallet with real faults, so every later phase builds and tests without a wallet
- [ ] **Phase 3: Connect and identity** - The user sees which account earns, which wallet pays and which network, and every wallet state has its own screen
- [ ] **Phase 4: Submit a job** - The user loads a job, sees its cost, submits through one wallet confirm and always sees what happened to the payment
- [ ] **Phase 5: My jobs and earnings** - The user finds every job with its true status, live, and sees what the node account holds and earned
- [ ] **Phase 6: WalletConnect browser flow** - The dashboard in a desktop browser pairs with GeniusWallet and works the same as inside it
- [ ] **Phase 7: Hosting and CSP hardening** - The export runs on the pinned origin with a strict CSP, no third-party code, and an a11y pass
- [ ] **Phase 8: Device walks and cutover** - Walked end to end on every wallet platform and over WalletConnect; the origin moves off EC2 only when the gate passes

## Phase Details

### Phase 1: Teardown and static shell
**Goal**: The app builds to a static `out/` with no server, no secrets, and none of the old server, explorer, Web3Modal, OrderForm, price pill or Redux code, and merging the branch to `main` can no longer take the live EC2 site down.
**Depends on**: Nothing (first phase)
**Waits on (external)**: Nothing. Rotating the leaked key is a human action tracked under DEP-04; it does not block this phase.
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07, SHELL-08, SHELL-09, SEC-01, SEC-02, SEC-03, DEP-01
**Success Criteria** (what must be TRUE):
  1. `yarn build` writes `out/`, and a plain static file server shows every v1 placeholder route and the custom 404 page, with no Node process, API route, koffi or native SDK file in the source or the build.
  2. The explorer, Web3Modal, OrderForm, the price and gas pill and Redux are gone from the source and the navigation, the theme renders as today (revised 2026-10-27 overnight: no switch exists), and a search of the source finds no `bridgeOut` or `/api/processing/` call.
  3. The private key, the account key and the keyed RPC URL are gone from source, and CI goes red on a planted key in the source or in `out/` and on a high advisory not in the allowlist.
  4. The workflow at the branch head has no EC2 `pm2 restart` path, so merging the branch to `main` cannot restart the live app on a static export; the live EC2 app keeps serving the old build.
  5. Jest and Cypress pass on the slimmed app, with the test counts before and after the teardown written down.
**Plans**: 6 plans
- [ ] 01-01-PLAN.md - Baseline counts, explorer teardown (tracer, group 1), EC2 deploy guard
- [ ] 01-02-PLAN.md - Delete the server SDK path with its secrets (group 2), then Web3Modal and OrderForm (group 3)
- [ ] 01-03-PLAN.md - Delete the price and gas pill (group 4), delete Redux (group 5)
- [ ] 01-04-PLAN.md - Prune dead dependencies in batches, one lockfile, Node 22 and Next 14.2.35 pins (group 6)
- [ ] 01-05-PLAN.md - Static export with placeholder routes and a 404 page, Cypress over out/ (group 7)
- [ ] 01-06-PLAN.md - Secret gate, audit gate with allowlist, CI workflow proven locally

### Phase 2: Contract client and mock wallet
**Goal**: The dashboard has one typed client for the `gnus_*` contract, with transport detection and a mock wallet that behaves like the real one, faults included, so every later phase builds and tests without a wallet.
**Depends on**: Phase 1
**Waits on (external)**: Wallet v4.0 Phase 43 for a run of the conformance suite against a real wallet; recorded as a gap until then. Nothing else.
**Requirements**: RPC-01, RPC-02, RPC-03, RPC-04, RPC-05, RPC-06, RPC-07, RPC-08, CONN-01, SEC-04, DISP-01
**Success Criteria** (what must be TRUE):
  1. The contract conformance suite passes in CI against the mock for every method, event and error code in the contract snapshot, and every error code maps to one typed error with one message and one action.
  2. A mock reply with a numeric amount, a swapped address format or a missing field fails with "Wallet contract mismatch" naming the wallet's version; 9007199254740993 and 1e21 format exactly with the wallet's decimals, and the shared `Amount` renders null as "Not available yet", never 0.
  3. With the mock injecting `window.gnus` at 0, 500 and 4000 ms and twice, with and without the user-agent marker, detection picks the transport the contract's rules give and keeps it for the session.
  4. A developer can pick any fault profile on the dev server and in tests, and the production export contains no mock code (CI goes red on a planted import).
  5. `tsc` passes with `strict` on over `lib/gnus/` and all new code.
**Plans**: TBD

### Phase 3: Connect and identity
**Goal**: A user who opens the dashboard sees which account earns, which wallet pays and which network they are on, and every wallet state (connecting, starting up, not responding, denied, switching, old wallet, no wallet) has its own screen and its own next step.
**Depends on**: Phase 2
**Waits on (external)**: Wallet v4.0 Phases 43 and 44 for the real connect prompt and account events; the mock covers them until then.
**Requirements**: CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CONN-08, CONN-09, CONN-10, CONN-11
**Success Criteria** (what must be TRUE):
  1. Inside the wallet (mock), the header shows "Earning as" with the SDK address and "Paying from" with the EVM address, each with a working copy button, plus the network; a payer without an EVM address reads "No paying wallet"; the navigation offers Submit, My jobs and Earnings.
  2. On first load the page shows "Confirm in your wallet" for as long as the mock's connect prompt stays open, and a rejected or revoked origin shows "Allow this site in GeniusWallet" with Connect again.
  3. Each mock fault (SDK starting, no reply or disconnect, old wallet, account switching) puts the page in its own named state with its own words and action, never a bare spinner, and estimate and submit stay disabled while switching.
  4. After a mock account or network switch nothing from the old account stays on screen, a reply delayed across the switch is dropped (test), and a network that is not this build's shows a banner.
  5. A browser with no GeniusWallet shows "GeniusWallet required" with a way to get the wallet and no submit control.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Submit a job
**Goal**: A user can load, upload or paste a job, see what it costs, submit it through one wallet confirm, and always see what happened to the payment, including after a reload.
**Depends on**: Phase 3
**Waits on (external)**: SDK-CA (until it lands a live estimate is "Price unavailable" and the priced path runs on the mock), SDK-COSTERR (reason text), SDK-JOBID (job id); wallet v4.0 Phases 43 and 44 for a real native confirm. Each live check is recorded as a gap.
**Requirements**: DEF-01, DEF-02, DEF-03, DEF-04, DEF-05, EST-01, EST-02, EST-03, EST-04, EST-05, SUB-01, SUB-02, SUB-03, SUB-04, SUB-05, SUB-06, SUB-07, SUB-08
**Success Criteria** (what must be TRUE):
  1. A user loads the example job, uploads a file or pastes JSON, sees a preview of exactly what will be sent, and gets an estimate of cost, balance and gas in the wallet's units; bad input keeps Estimate disabled with a plain error.
  2. On the mock's live-like profile (`-32010`) the page says "Price unavailable" and blocks submit; not enough GNUS blocks submit and shows both amounts; null gas reads "Gas not estimated"; an edited job needs a new estimate.
  3. Submitting shows "Confirm in your wallet" until the wallet answers; a reject returns to the job with nothing spent; success shows the burn hash, the job id or "Job id pending", and a link to the job.
  4. A paid-but-not-processed result, in either shape, shows a persistent banner with the burn hash, a copy button and a pointer to the wallet and no retry button, and every other error shows its own message.
  5. Reloading at each step of a submit ends with the true outcome on screen and exactly one burn in the mock, and a second click or a second tab never opens a second confirm.
**Plans**: TBD
**UI hint**: yes

### Phase 5: My jobs and earnings
**Goal**: A user can find every job they submitted and see its true status, updated live, and can see what their node account holds and has earned, with "Not available yet" wherever the SDK has no data.
**Depends on**: Phase 3 (runs alongside Phase 4)
**Waits on (external)**: SDK-JOBID, SDK-STATUS, SDK-RESULT and SDK-EARNINGS for live ids, states, results and earnings (nulls are the expected live state; the mock covers populated data); wallet v4.0 Phase 43 for real lists. Each live check is recorded as a gap.
**Requirements**: JOBS-01, JOBS-02, JOBS-03, JOBS-04, JOBS-05, JOBS-06, JOBS-07, EARN-01, EARN-02, EARN-03, EARN-04, DISP-02
**Success Criteria** (what must be TRUE):
  1. My jobs lists the current account's jobs newest first with paging, the status in true words, time, cost, origin and a short id; a new account sees an empty state, a failed list an error state, and paid-but-not-processed rows stay marked.
  2. Opening a job, also by refreshing a `/jobs/detail?hash=` link, shows every field; the result reads "Result not available yet" while null, and CIDs open in the system browser when present.
  3. Searching by job id or burn hash finds the job whether or not it is loaded.
  4. A `gnus_jobUpdated` event changes the row and the open detail without a reload, returning to the tab or reconnecting refetches, and the page never polls fast.
  5. Earnings shows the node account's balance and processing state, "Not available yet" for counts and earned amounts, a note that child accounts are not included, the last-updated time and a working Refresh.
**Plans**: TBD
**UI hint**: yes

### Phase 6: WalletConnect browser flow
**Goal**: A user in a desktop browser pairs the dashboard with GeniusWallet over WalletConnect and uses every screen as inside the wallet, with honest offline, expiry and unsupported-wallet handling.
**Depends on**: Phase 4 (expiry recovery reuses the stored idempotency key) and Phase 5 (job events over the session feed its views)
**Waits on (external)**: Wallet v4.0 Phase 47 for a real pairing; a Reown project id restricted to the dashboard origin (Braian). Until then the transport is tested against the mock relay adapter and the real pairing is a recorded gap.
**Requirements**: WC-01, WC-02, WC-03, WC-04, WC-05, WC-06, WC-07, WC-08
**Success Criteria** (what must be TRUE):
  1. In a desktop browser the user pairs by scanning a QR code or copying the `wc:` URI, and after a reload the session comes back without pairing again; inside the wallet (mock) no WalletConnect chunk loads and no request reaches a WalletConnect host.
  2. A wallet that goes quiet shows "Wallet offline" with Retry after 60 s on a read, and a submit that expires on the page is recovered by its key with one burn (mock relay adapter with latency, drops and zombie requests).
  3. A session without the `gnus_*` methods (MetaMask, an old wallet) shows "GeniusWallet required" or "Update GeniusWallet", and ending the session in the wallet moves the page to Disconnected with Reconnect.
  4. Account, network and job events over the session update the page as in the wallet, and identity always comes from `gnus_getAccounts`.
  5. One real pairing with a GeniusWallet build round-trips every read method with named params, or the missing build is recorded as a gap naming wallet Phase 47.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Hosting and CSP hardening
**Goal**: The static export is served from the pinned origin with headers as code and a strict CSP, nothing on the page loads or runs code from another host, wallet text can never become markup, and every route passes an accessibility check.
**Depends on**: Phase 6 (the CSP has to cover the WalletConnect relay)
**Waits on (external)**: Braian's choice of host and pinned origin (also needed by the wallet's Phase 46 release build); wallet v4.0 Phase 47 for a GeniusWallet pairing under the enforced CSP. Until then the preview proves the relay connection under the CSP and the GeniusWallet pairing is a recorded gap.
**Requirements**: SEC-05, SEC-06, SEC-07, DEP-02, DEP-03, VER-06
**Success Criteria** (what must be TRUE):
  1. A preview deploy on the chosen host serves the export with headers as code: refreshing any route or a job detail link works, unknown paths get `404.html`, static chunks are cached and HTML is not.
  2. Every page loads with zero CSP violations (self-hosted fonts and icons, tooltip injection fixed, video local or removed), first report-only on the preview, then enforced with the WalletConnect connect panel working under it.
  3. CI runs a Cypress smoke against `out/` served by `scripts/serve-out.js` with the production headers.
  4. The mock's hostile-text profile shows as plain text on every page, and lint fails on `dangerouslySetInnerHTML`.
  5. Every route passes an automated WCAG 2.1 AA check, and a keyboard-only user can complete the submit flow on the mock.
**Plans**: TBD

### Phase 8: Device walks and cutover
**Goal**: The dashboard is walked end to end in the wallet on every platform it ships on and over WalletConnect, and the live origin moves from EC2 to the static build only when the cutover gate passes, with EC2 kept for rollback.
**Depends on**: Phase 7
**Waits on (external)**: Wallet v4.0 Phases 46, 47 and 48; a GeniusWallet store release with `gnus_*`; SDK-CA for live estimate and submit; Braian for the key rotation, the access-log check and the host. Until the wallet builds exist the walk script runs against the mock in the Android emulator's browser and desktop browsers, and the in-wallet and live steps are recorded as gaps. An unmet gate item leaves DEP-04 and DEP-05 blocked with the item and its owner listed.
**Requirements**: VER-01, VER-02, VER-03, VER-04, VER-05, DEP-04, DEP-05
**Success Criteria** (what must be TRUE):
  1. On the Android emulator the walk passes: open from the wallet, connect, paste and file-pick a job, estimate, confirm and reject a submit, read jobs and earnings, open an external link and copy an address.
  2. The same walk passes in the wallet on macOS, Windows and Linux; on iOS it passes on a device or is recorded as a blocked gap with its reason.
  3. The same walk passes from a desktop browser over WalletConnect.
  4. Every walk record names which steps ran live and which on mock or dev-mock costs, with the SDK id or wallet phase behind each.
  5. The origin moves to the static build only when every gate item is checked; EC2 stays up through the rollback window, and the rollback has been rehearsed on the preview.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1, 2, 3, then 4 and 5 in parallel, then 6, 7, 8.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Teardown and static shell | 0/TBD | Not started | - |
| 2. Contract client and mock wallet | 0/TBD | Not started | - |
| 3. Connect and identity | 0/TBD | Not started | - |
| 4. Submit a job | 0/TBD | Not started | - |
| 5. My jobs and earnings | 0/TBD | Not started | - |
| 6. WalletConnect browser flow | 0/TBD | Not started | - |
| 7. Hosting and CSP hardening | 0/TBD | Not started | - |
| 8. Device walks and cutover | 0/TBD | Not started | - |
