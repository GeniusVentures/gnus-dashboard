# Requirements: GNUS Dashboard

**Defined:** 2026-10-26
**Core Value:** A user can submit a job and see what happened to it, with the wallet paying and processing in one confirmed call, and never a fake or misleading number on screen.

The `gnus_*` contract is owned by GeniusWallet (`research/gnus-rpc-contract.md`). Every requirement below builds to it; a gap goes to the wallet side as a change request, never into a local fork. Every requirement is completable against the mock wallet (RPC-06); where real data waits on the wallet or the SDK, the "Dependencies" table says what the UI shows meanwhile, and the live check is recorded as a gap, never skipped.

## v1 Requirements

### Static shell and teardown

- [ ] **SHELL-01**: `yarn build` produces a static `out/` (`output: 'export'`, `images.unoptimized`) and the app runs from those files alone: no Node server process, no `pages/api` routes, rewrites, redirects or `headers()`.
- [ ] **SHELL-02**: The server-side SDK path is deleted: `functions/`, `pages/api/`, koffi, the native SDK binaries under `data/`, the protobuf and libp2p code, and every dependency only they used.
- [ ] **SHELL-03**: The network explorer is deleted: block, transaction and address pages, the analytics gauges, the map, the random "live" tables, their data folders, and their navigation entries.
- [ ] **SHELL-04**: The old pay-and-submit path is deleted: Web3Modal/AppKit, `OrderForm.tsx`, `data/orderForm/*` and the dashboard-side `bridgeOut` call; no source file calls `bridgeOut` or `/api/processing/*`.
- [ ] **SHELL-05**: The GNUS price and gas pill (`usePrices.tsx`, the CoinGecko and CoinPaprika calls) is deleted.
- [ ] **SHELL-06**: Redux (`@reduxjs/toolkit`, `react-redux`, `store/`) is removed, and the theme skin it held keeps working.
- [ ] **SHELL-07**: Dead dependencies are pruned in groups with the build and tests green between groups; `package-lock.json` is deleted, `yarn.lock` is the only lockfile, CI installs with `--frozen-lockfile`, and `.nvmrc` plus `engines` pin the Node version.
- [ ] **SHELL-08**: Each v1 route (`/`, `/submit`, `/jobs`, `/jobs/detail`, `/earnings`) exists in the export as a placeholder page, and an unknown path shows a custom 404 page.
- [ ] **SHELL-09**: Jest and Cypress run green on the slimmed app, with the test counts recorded before and after the teardown.

### Security

- [ ] **SEC-01**: The literal Ethereum private key (`functions/ipfs/node.ts`), the SuperGenius account key (`data/secure_storage.json`) and the keyed BlastAPI RPC URL (`pages/api/gas/gasPrice.ts`) are gone from the source tree. Rotating the leaked key is a human action, tracked as a cutover gate item (DEP-04).
- [ ] **SEC-02**: CI fails when the source tree or the built `out/` contains a private key, API token, keyed RPC URL or `bridge-test.html` (gitleaks on the repo plus a grep of `out/`), proven by a planted fixture.
- [ ] **SEC-03**: CI runs a dependency audit that fails on high or critical advisories, with a recorded allowlist (one reason per entry) for Next 14 advisories that only Next 16 fixes.
- [ ] **SEC-04**: The mock wallet is reachable only in dev and test builds (build-time `NEXT_PUBLIC_GNUS_MOCK`), and a CI check fails if the production export contains mock code, proven by a planted import.
- [ ] **SEC-05**: Wallet-sourced text (error messages, origins, job results) renders as plain text on every page: a lint rule bans `dangerouslySetInnerHTML`, and a mock profile with script and HTML payloads renders inert.
- [ ] **SEC-06**: The production site sends a strict Content-Security-Policy (`script-src 'self'`, no third-party script, font or analytics hosts, WalletConnect relay hosts only in `connect-src`), first report-only, then enforced once a WalletConnect pairing passes under it.
- [ ] **SEC-07**: Every page loads with zero CSP violations: fonts and icons are self-hosted, the `react-tooltip` style injection is fixed, and any video is served from the origin or removed.

### Contract client

- [ ] **RPC-01**: All wallet calls go through one typed client in `lib/gnus/` that sends `request({method, params})` with named params over one `Transport` interface (`request`, `on`, `removeListener`, `close`), with injected and mock implementations.
- [ ] **RPC-02**: Every wallet result and event payload is parsed with zod at that one boundary; a reply that does not match the contract shows "Wallet contract mismatch" with the wallet's contract `version`.
- [ ] **RPC-03**: SDK addresses (`0x` + 128 hex) and EVM addresses (`0x` + 40 hex) are separate branded types that are never converted into each other; parse tests cover both formats.
- [ ] **RPC-04**: Amounts stay decimal strings end to end: zod rejects numeric amounts, `BigInt` appears only in `lib/gnus/amount.ts`, display divides by `unit.decimals` from `gnus_getAccounts` (never a hardcoded 18, never a 1e18 rescale), and 9007199254740993 and 1e21 format exactly.
- [ ] **RPC-05**: Every contract error code (4001, 4100, 4200, 4900, -32602 including `idempotency_key_reused`, -32603, -32005 with each `data.reason`, -32010 to -32015) maps in one module to a typed `GnusError` with one user message and one action.
- [ ] **RPC-06**: A mock `window.gnus` implements the whole contract with selectable fault profiles: late injection (0, 500 and 4000 ms, and twice), every error code, `switching` windows, nulls everywhere the contract allows, both paid-but-not-processed shapes, a confirm that waits minutes, a replayed idempotency key, `-32005` on concurrent calls, and amounts above 2^53. The dev server, Jest and Cypress share it.
- [ ] **RPC-07**: A contract conformance suite (`__tests__/contract`) runs in CI against the mock and can be pointed at a real wallet transport without code changes.
- [ ] **RPC-08**: TypeScript `strict: true` covers `lib/gnus/` and every new page and component (through `tsconfig.strict.json` until the legacy surface is gone), and `tsc` passes.

### Connect and identity

- [ ] **CONN-01**: The page attaches its `gnus#initialized` listener before reading `window.gnus`. With the ` GeniusWallet/<version> gnus/<version>` user-agent marker it waits for the injection and never falls back to WalletConnect; without the marker it takes `window.gnus` when present or within 3 s, else the browser path. The choice is locked for the session, except that a late injection wins when no WalletConnect session is active.
- [ ] **CONN-02**: The header shows two labelled identities, "Earning as" (`node.sdkAddress`) and "Paying from" (`payer.evmAddress`), each shortened with a copy button that also works where the clipboard API is missing, plus a network label (`network.sdk`, `evmChainId`). A null payer address reads "No paying wallet". Identity comes only from `gnus_getAccounts`.
- [ ] **CONN-03**: The first wallet call has no timeout: while the wallet's connect prompt is open the page shows "Confirm in your wallet". A rejected prompt (`4001`) or a revoked origin (`4100`) shows "Allow this site in GeniusWallet" with a Connect again action.
- [ ] **CONN-04**: SDK not ready (`4900`) shows "GeniusWallet is starting up" and retries with backoff, with no error toast.
- [ ] **CONN-05**: A wallet that stops answering or sends `disconnect` puts the page in "GeniusWallet isn't responding" with Retry, never a bare spinner.
- [ ] **CONN-06**: An old or unsupported wallet (`4200`, or a contract `version` the dashboard does not support) shows "Update GeniusWallet".
- [ ] **CONN-07**: While `switching` is true or after `-32015`, estimate and submit are disabled with "Switching account" and come back on `gnus_accountsChanged`.
- [ ] **CONN-08**: On `gnus_accountsChanged` every piece of the old account's data (jobs, earnings, draft estimate) is dropped and re-read under keys `[kind, network, sdkAddress]`; a reply that arrives after the switch never shows under the new account.
- [ ] **CONN-09**: On `gnus_networkChanged` the network label updates, account data re-reads under the new network, and a banner shows when the wallet's network is not the one this build serves.
- [ ] **CONN-10**: A browser with no GeniusWallet shows a "GeniusWallet required" screen that says why, links to getting the wallet, and has no submit control.
- [ ] **CONN-11**: The new navigation and layout offer Submit, My jobs and Earnings under the identity header, with no explorer entries.

### Shared display

- [ ] **DISP-01**: Every amount and count on screen goes through one `Amount` component over `string | null`: null renders "Not available yet" (or the field's own wording), never "0" or blank, and a unit test fails if null ever formats to 0.
- [ ] **DISP-02**: Every external link the page shows inside the wallet (CID gateway links first) goes through one `ExternalLink` component that opens the system browser.

### Job input

- [ ] **DEF-01**: User can upload a processing-definition JSON file; it is read and parsed in the page only and refused above a size cap.
- [ ] **DEF-02**: User can paste processing-definition JSON into a text field, a first-class path for wallet WebViews without a file chooser.
- [ ] **DEF-03**: User can load a bundled example job with one click ("Load example").
- [ ] **DEF-04**: Before estimating, the user sees a read-only formatted preview of the exact job object that estimate and submit will send.
- [ ] **DEF-05**: Input that is not JSON, not an object, or lacks the top-level `inputs`, `outputs` and `passes` keys shows a plain error and keeps Estimate disabled; deeper schema errors come from the wallet's `-32602` and show its message.

### Estimate

- [ ] **EST-01**: User gets an estimate by an explicit action (never per keystroke), with at most one estimate in flight and a loading state, showing cost, payer balance and gas with the wallet's symbols and decimals.
- [ ] **EST-02**: `-32010` shows "Price unavailable" (with the reason when the wallet sends one) and blocks submit; a zero cost is never shown as free.
- [ ] **EST-03**: A cost above the balance (compared as integers, never `Number`) or `-32011` shows "Not enough GNUS" with both amounts and blocks submit.
- [ ] **EST-04**: `gas: null` shows "Gas not estimated" and submit stays allowed.
- [ ] **EST-05**: Editing the job marks the estimate stale and requires a new one, and the panel says the wallet confirms the final amount.

### Submit

- [ ] **SUB-01**: An idempotency key (`crypto.randomUUID()`) is created at the review step, bound to a hash of the job body, and written to `localStorage` with the job before `gnus_submitJob` is called. It is reused on any retry of the same job, replaced on any edit, and dropped after about 23 h.
- [ ] **SUB-02**: Submit is disabled while a submit is in flight, a `-32005` (`submit_in_flight`, `confirm_open`) shows "A confirm is already open in your wallet", and the dashboard never retries `gnus_submitJob` on its own.
- [ ] **SUB-03**: While the wallet's confirm is open the page shows "Confirm in your wallet" with no timeout (over WalletConnect: open GeniusWallet on your phone); a dashboard-side Cancel says the wallet prompt stays open.
- [ ] **SUB-04**: A rejected confirm (`4001`) returns the user to the job with the form and the same key intact, saying nothing was spent.
- [ ] **SUB-05**: A `submitted` result shows the `burnTxHash` always, the `jobId` when not null ("Job id pending" otherwise), and a link to the job's detail. The page branches on `status`, never on the call merely returning.
- [ ] **SUB-06**: `status: bridgedNotProcessed` and `-32014` become one "Paid but not processed" state: a persistent banner (not a toast) saying the payment went through and the network did not start the job, the burn hash with a copy button, a pointer to the wallet, and no retry button.
- [ ] **SUB-07**: Each other failure (`-32013` nothing spent, `-32012` payer cannot sign, `4100`, `4900`, `-32015`, `-32602` including `idempotency_key_reused`) shows its own message and next step from the RPC-05 table.
- [ ] **SUB-08**: After a reload at any step (before confirm, during confirm, after a lost response), the page finds the stored key, calls `gnus_getJob({idempotencyKey})` and shows the real outcome, or the job ready to submit again with the same key if the wallet never saw it. A test reloads at each step and asserts exactly one burn in the mock.

### My jobs

- [ ] **JOBS-01**: User sees the jobs of the current `sdkAddress` from `gnus_listJobs`, newest first, with cursor paging, an empty state for a new account and an error state for a failed list.
- [ ] **JOBS-02**: Each row shows the status, submitted time, cost, origin and a short id (`jobId`, else `burnTxHash`).
- [ ] **JOBS-03**: Status badges cover every contract state in true words: `submitted` reads "Submitted to the network" (never "running", never a progress bar), and `unknown` and `bridgedNotProcessed` have their own badges; paid-but-not-processed rows stay marked.
- [ ] **JOBS-04**: Job detail at `/jobs/detail?id=` or `?hash=` (read after `router.isReady`) shows every `Job` field from `gnus_getJob`, also after a refresh of the deep link.
- [ ] **JOBS-05**: The detail's result block shows "Result not available yet" while `result` is null; when present it lists `cids` as gateway links and `data` and `error` as plain text.
- [ ] **JOBS-06**: User can search by job id or burn hash: a filter over loaded pages, and an exact `gnus_getJob` lookup when the job is not loaded.
- [ ] **JOBS-07**: A `gnus_jobUpdated` event updates the matching row and open detail in place; the list and detail also refetch on ready, reconnect and tab focus, with a slow poll only while a non-terminal job is on screen.

### Earnings

- [ ] **EARN-01**: The Earnings page shows the node account's SGNUS `balance`, labelled as the node account's (not the paying wallet's), and whether the node is processing.
- [ ] **EARN-02**: `jobsProcessed`, `earned.total` and `earned.history` read "Not available yet" with one line of explanation while null, never 0 or an empty table; the history table renders when the wallet sends data.
- [ ] **EARN-03**: A scope note says the figures cover this account only, not its child accounts.
- [ ] **EARN-04**: The page shows when it was last updated, refreshes on account change, and has a manual Refresh.

### WalletConnect

- [ ] **WC-01**: WalletConnect code loads only by dynamic import after the transport decision picks the browser path; inside the wallet no WalletConnect chunk loads and no request reaches a WalletConnect or Reown host.
- [ ] **WC-02**: In a browser the user connects by scanning an SVG QR code or copying the `wc:` URI. The proposal asks for the `gnus_*` methods and events as optional `eip155` methods on `eip155:80002`, through pinned `@walletconnect/sign-client` 2.26.0 (no AppKit or UniversalProvider, `telemetryEnabled: false`, a fresh pairing each time, a Reown project id restricted to the dashboard origin).
- [ ] **WC-03**: After a reload the page restores the existing session and checks it with `ping`; a session that does not answer shows "Wallet offline" with Retry.
- [ ] **WC-04**: Reads time out on the page after 60 s (request expiry 300 s) into "Wallet offline"; submit and the first connect call use a 900 s expiry; a submit that expires on the page is recovered with `gnus_getJob({idempotencyKey})` with one burn. A mock relay adapter with latency, dropped events and zombie requests covers these cases.
- [ ] **WC-05**: `session_delete` or `disconnect` moves the page to Disconnected; in a browser the user can disconnect and reconnect, and inside the wallet there is no disconnect control.
- [ ] **WC-06**: A session whose approved namespaces lack the `gnus_*` methods the dashboard needs (MetaMask, an older GeniusWallet) shows the "GeniusWallet required" or "Update GeniusWallet" screen, never a broken submit.
- [ ] **WC-07**: Account, network and job events over the session drive the same updates as on the injected path, and identity is read with `gnus_getAccounts`, never from the session's accounts.
- [ ] **WC-08**: One real pairing with a GeniusWallet build round-trips every read method with named params and shows the approved namespaces include the `gnus_*` methods and events; until that build exists, the check is recorded as a gap naming wallet phase 47.

### Hosting and cutover

- [ ] **DEP-01**: The EC2 deploy workflow (`.github/workflows/aws-ec2-deploy.yml`) is disabled or replaced on this branch, so no merge to `main` runs `pm2 restart` on a static export (checked by reading the workflow in the merge commit), and the live EC2 app keeps serving the old build until cutover.
- [ ] **DEP-02**: The export is published to the chosen static host on the pinned origin with headers as code (CSP; immutable `_next/static`, no-cache HTML), `trailingSlash` set to match the host, and deep-link refresh of every route, the job detail query route and `404.html` working on a preview deploy.
- [ ] **DEP-03**: `scripts/serve-out.js` serves `out/` with the production headers, and a Cypress smoke runs against it in CI under the real CSP.
- [ ] **DEP-04**: The origin moves from EC2 to the static build only after a written cutover gate passes: a GeniusWallet release with `gnus_*` in the stores, SDK-CA fixed (live cost non-zero), `gnus_submitJob` proven on a device, the leaked key rotated by a human, access logs checked for third-party `/api/processing/*` callers, CSP enforced, EC2 `data/` backed up and funds moved off the server account. Each unmet item is recorded with its owner.
- [ ] **DEP-05**: The EC2 instance stays running through a stated rollback window after cutover, and a rollback that repoints the origin to EC2 has been rehearsed on the preview.

### Verification

- [ ] **VER-01**: Android walk in the wallet (GW_Test AVD): open the dashboard from the wallet, injection after `gnus#initialized`, connect, paste and file-pick a job, estimate, confirm and reject a submit, read jobs and earnings, open an external link, copy an address.
- [ ] **VER-02**: The same walk on iOS on a device, or recorded as a blocked gap with its reason (the simulator is blocked by device-only SDK libraries).
- [ ] **VER-03**: The same walk in the wallet on macOS, Windows and Linux.
- [ ] **VER-04**: The same walk from a desktop browser over WalletConnect.
- [ ] **VER-05**: Each walk record names the steps that ran live and those that ran on mock or dev-mock costs, with the SDK id or wallet phase that blocked the live step; no step is silently skipped.
- [ ] **VER-06**: Every route passes an automated WCAG 2.1 AA check (axe in Cypress), and the submit flow works keyboard-only.

## v2 Requirements

Deferred. Tracked but not in the current roadmap. The items marked "if capacity allows" are the research's should-haves; pulling one into v1 needs a roadmap update.

### Job building

- **BUILD-01**: Guided, template-driven job builder that produces the processing-definition JSON live.
- **BUILD-02**: JSON editor with schema-aware, path-level errors, once the wallet publishes a versioned schema.
- **BUILD-03**: Draft persistence for a job before the review step.

### Job tracking

- **JOBX-01**: Per-job timeline (submitted, burn, queued, processing, completed) with "not reported yet" for steps without data. If capacity allows.
- **JOBX-02**: "Needs attention" nav badge counting paid-but-not-processed jobs. If capacity allows.
- **JOBX-03**: Explorer link for `burnTxHash` on the Polygon Amoy explorer. If capacity allows.
- **JOBX-04**: Copy-as-support-bundle (jobId, burnTxHash, sdkAddress, network, times, error code). If capacity allows.
- **JOBX-05**: Estimate-versus-confirmed cost difference on job detail.
- **JOBX-06**: In-page notice when a job completes, after SDK-STATUS lands.

### Recovery and accounts

- **REC-01**: `gnus_retryProcess({burnTxHash})` recovery flow with its own confirm, once contract question U5 is resolved and the wallet adds the method.
- **PAY-01**: Payout address display, after SDK-PAYOUT.

### Platform

- **PLAT-01**: Upgrade to Next 16 (follow-up to D3), sooner if the audit gate cannot be waived.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Network explorer (blocks, transactions, addresses, analytics gauges, map) | Braian's call on 2026-10-26; today's data is random or hardcoded and the SDK read side is not ready |
| Submitting from a browser with no GeniusWallet (MetaMask only) | The contract needs a GeniusWallet provider to submit (U2); such users get the "GeniusWallet required" screen |
| Aggregating children's earnings into a main's view | Waits on SDK-EARNINGS; the wallet ignores `includeChildren` in v1, so the page shows a scope note instead |
| Two devices as one identity (phone pays, desktop earns) | Needs an account-link step signed on both sides that nothing supports (U3) |
| Bundling the export into the wallet behind a custom scheme | The wallet loads one pinned https origin per network |
| Retry button for paid-but-not-processed before U5 resolves | Resubmitting with the same key returns the first result and never re-runs Process, and a new key spends again; v1 shows the burn hash and points to the wallet |
| GNUS price and gas pill | Direct CoinGecko and CoinPaprika calls get rate-limited and add third-party hosts to the CSP; deleted in v1 (Braian to confirm) |
| Dashboard-side payment (`bridgeOut` through Web3Modal) | Splitting pay and submit across providers is how the current app lets payment and job drift apart |
| Running the dashboard's own SDK node or any custodial processing | The wallet owns identity, payment and processing |
| A local copy of the processing-definition schema | The wallet's `-32602` is authoritative and a copy drifts; the page checks only the top-level shape |
| Showing 0 for unknown values, progress bars, or treating `submitted` as running | Fake numbers are against the core value |
| Automatic retry of `gnus_submitJob` | A retry can spend again; only a user action with the same key is safe |
| Tight polling of the wallet | Over WalletConnect it wakes the phone and trips the wallet's rate limit; events plus refetch on focus instead |
| OS, email or push notifications | Need a server; the app is static |
| Merging the unmerged remote branches | D4: they re-add `pages/api` or only touch code v1 deletes; useful pieces are ported by hand |
| Downloading the example job as a file | Downloads need wallet WebView handling on every platform; "Load example" covers the need |

## Dependencies (not dashboard work)

Each row is work another project owns. The dashboard builds against the mock until it lands; the live check is then run and, until it can be, recorded as a gap.

| Dependency | Owner | Requirements that wait on it | Meanwhile |
|------------|-------|------------------------------|-----------|
| v4.0 Phase 43: `gnus_*` RPC handler and job record | GeniusWallet | RPC-07 against a real wallet; the live steps of VER-01 to VER-05 | Everything runs on the mock (RPC-06); the real-wallet conformance run is a recorded gap |
| v4.0 Phase 44: consent and limits | GeniusWallet | Real connect prompt (CONN-03), real native confirm (SUB-03), real `-32005` limits (SUB-02) | The mock simulates the prompt, a minutes-long confirm, `4001`, `4100` and `-32005` |
| v4.0 Phase 45: hardened bridge transports | GeniusWallet | None directly; VER-01 to VER-03 run on hardened builds | The dashboard uses no iframes and no `postMessage`, so nothing changes on its side |
| v4.0 Phase 46: in-wallet dashboard screen | GeniusWallet | VER-01, VER-02, VER-03; DEP-02 shares the pinned origin with it | Late-injection mock profiles in a desktop browser with the user-agent marker set |
| v4.0 Phase 47: dashboard over WalletConnect | GeniusWallet | WC-08, VER-04 | The WalletConnect transport is tested against the mock relay adapter (WC-04) |
| v4.0 Phase 48: wallet device walks | GeniusWallet | VER-01 to VER-04 run alongside it | The walk script runs against the mock in desktop and emulator browsers |
| GeniusWallet store release with `gnus_*` | GeniusWallet | DEP-04 | EC2 keeps serving the old app |
| SDK-CA (live cost is always 0) | SuperGenius SDK | Live EST-01 and SUB-05; live submit steps in VER; DEP-04 | "Price unavailable", submit blocked (EST-02); the priced path runs on the mock |
| SDK-COSTERR (cost error codes) | SuperGenius SDK | The reason text in EST-02 | Generic "Price unavailable" |
| SDK-JOBID (Process returns a job id) | SuperGenius SDK | `jobId` in SUB-05, JOBS-04 by id, JOBS-06 by id | Burn hash is the job key; "Job id pending" |
| SDK-STATUS (per-job status) | SuperGenius SDK | Live states in JOBS-03 and JOBS-07 | "Submitted to the network", no progress UI |
| SDK-RESULT (result by job id) | SuperGenius SDK | JOBS-05 | "Result not available yet" |
| SDK-EARNINGS (per-account history) | SuperGenius SDK | EARN-02 | "Not available yet" per field |
| SDK-ASYNC (non-blocking cost and process) | SuperGenius SDK | None (EST-01 always shows a loading state) | Loading state on every estimate |
| SDK-PAYOUT (payout address getter) | SuperGenius SDK | None in v1 (PAY-01 in v2) | Not shown |
| Host and pinned origin | Braian, with the wallet team | DEP-02, SEC-06, and the wallet's Phase 46 release pinning | Local `scripts/serve-out.js` with the production headers (DEP-03) |
| Reown project id restricted to the origin | Braian | WC-02 live, WC-08 | A dev project id on localhost |
| Rotating the leaked private key, moving funds off the server account | Braian (human action) | DEP-04 | Key removed from source (SEC-01); still valid until rotated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 1 | Pending |
| SHELL-02 | Phase 1 | Pending |
| SHELL-03 | Phase 1 | Pending |
| SHELL-04 | Phase 1 | Pending |
| SHELL-05 | Phase 1 | Pending |
| SHELL-06 | Phase 1 | Pending |
| SHELL-07 | Phase 1 | Pending |
| SHELL-08 | Phase 1 | Pending |
| SHELL-09 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 2 | Pending |
| SEC-05 | Phase 7 | Pending |
| SEC-06 | Phase 7 | Pending |
| SEC-07 | Phase 7 | Pending |
| RPC-01 | Phase 2 | Pending |
| RPC-02 | Phase 2 | Pending |
| RPC-03 | Phase 2 | Pending |
| RPC-04 | Phase 2 | Pending |
| RPC-05 | Phase 2 | Pending |
| RPC-06 | Phase 2 | Pending |
| RPC-07 | Phase 2 | Pending |
| RPC-08 | Phase 2 | Pending |
| CONN-01 | Phase 2 | Pending |
| CONN-02 | Phase 3 | Pending |
| CONN-03 | Phase 3 | Pending |
| CONN-04 | Phase 3 | Pending |
| CONN-05 | Phase 3 | Pending |
| CONN-06 | Phase 3 | Pending |
| CONN-07 | Phase 3 | Pending |
| CONN-08 | Phase 3 | Pending |
| CONN-09 | Phase 3 | Pending |
| CONN-10 | Phase 3 | Pending |
| CONN-11 | Phase 3 | Pending |
| DISP-01 | Phase 2 | Pending |
| DISP-02 | Phase 5 | Pending |
| DEF-01 | Phase 4 | Pending |
| DEF-02 | Phase 4 | Pending |
| DEF-03 | Phase 4 | Pending |
| DEF-04 | Phase 4 | Pending |
| DEF-05 | Phase 4 | Pending |
| EST-01 | Phase 4 | Pending |
| EST-02 | Phase 4 | Pending |
| EST-03 | Phase 4 | Pending |
| EST-04 | Phase 4 | Pending |
| EST-05 | Phase 4 | Pending |
| SUB-01 | Phase 4 | Pending |
| SUB-02 | Phase 4 | Pending |
| SUB-03 | Phase 4 | Pending |
| SUB-04 | Phase 4 | Pending |
| SUB-05 | Phase 4 | Pending |
| SUB-06 | Phase 4 | Pending |
| SUB-07 | Phase 4 | Pending |
| SUB-08 | Phase 4 | Pending |
| JOBS-01 | Phase 5 | Pending |
| JOBS-02 | Phase 5 | Pending |
| JOBS-03 | Phase 5 | Pending |
| JOBS-04 | Phase 5 | Pending |
| JOBS-05 | Phase 5 | Pending |
| JOBS-06 | Phase 5 | Pending |
| JOBS-07 | Phase 5 | Pending |
| EARN-01 | Phase 5 | Pending |
| EARN-02 | Phase 5 | Pending |
| EARN-03 | Phase 5 | Pending |
| EARN-04 | Phase 5 | Pending |
| WC-01 | Phase 6 | Pending |
| WC-02 | Phase 6 | Pending |
| WC-03 | Phase 6 | Pending |
| WC-04 | Phase 6 | Pending |
| WC-05 | Phase 6 | Pending |
| WC-06 | Phase 6 | Pending |
| WC-07 | Phase 6 | Pending |
| WC-08 | Phase 6 | Pending |
| DEP-01 | Phase 1 | Pending |
| DEP-02 | Phase 7 | Pending |
| DEP-03 | Phase 7 | Pending |
| DEP-04 | Phase 8 | Pending |
| DEP-05 | Phase 8 | Pending |
| VER-01 | Phase 8 | Pending |
| VER-02 | Phase 8 | Pending |
| VER-03 | Phase 8 | Pending |
| VER-04 | Phase 8 | Pending |
| VER-05 | Phase 8 | Pending |
| VER-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 85 total
- Mapped to phases: 85
- Unmapped: 0

---
*Requirements defined: 2026-10-26*
*Last updated: 2026-10-26 after roadmap creation*
