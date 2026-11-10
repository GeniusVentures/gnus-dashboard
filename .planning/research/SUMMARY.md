# Project Research Summary

**Project:** GNUS Dashboard v1
**Domain:** Static SPA client of a wallet-owned JSON-RPC contract (`gnus_*`), served in a wallet WebView and in a desktop browser
**Researched:** 2026-10-26
**Confidence:** MEDIUM-HIGH

> Written by the orchestrator from the synthesizer's inline return (its file write was refused, GSD issue #222 self-heal).

## Executive Summary

The dashboard is a thin client of GeniusWallet. The wallet owns identity, payment and processing through the `gnus_*` contract (`research/gnus-rpc-contract.md`). The dashboard detects a transport, asks the wallet for accounts, jobs and earnings, submits a job through one atomic `gnus_submitJob`, and shows every state honestly. Build it as a framework-free typed client (`lib/gnus/`) behind one `Transport` interface (injected `window.gnus`, lazy WalletConnect, mock), with a keyed server-state cache on top and a mock provider that implements the contract including its faults. v1 is mostly deletion: about 60 of 77 runtime dependencies go, with the Node/koffi server, the explorer, Web3Modal and the 1066-line `OrderForm.tsx`. Four libraries come in.

Recommended: keep Next 14.2.35 and React 18.3.1 pinned and export statically. Add `@walletconnect/sign-client` 2.26.0 (lazy), `@tanstack/react-query` 5, `zod` 4 and `qrcode.react`. Build against the mock first and WalletConnect last (the only piece that needs the wallet team and a real device). Base v1 on `gsd/dashboard-v1` with no remote branch merged. Job detail is a query-param route. Cut over the deployed EC2 app only after a wallet release with `gnus_*` support.

Main risks are money and honesty: a second burn from a mishandled idempotency key; a spent payment shown as success or lost (`bridgedNotProcessed`); null shown as 0 and JS `Number` on amounts; SDK and EVM addresses mixed; stale data after an account switch; a merge to `main` that crash-loops the live EC2 app. The live SDK still returns cost 0 (SDK-CA), so real submit is blocked on SDK fixes; the UI ships with designed "price unavailable" and "not available yet" states.

## Decisions Recorded (orchestrator, overnight 2026-10-26)

| # | Decision | Notes |
|---|----------|-------|
| D1 | `@tanstack/react-query` for server state keyed by `sdkAddress`, plus one small React context for provider/session. Delete Redux (`@reduxjs/toolkit`, `react-redux`, `store/`). | Overrides ARCHITECTURE.md's Redux slices. Redux only held the theme skin. |
| D1a | The account-switch epoch counter maps to react-query keys `[kind, network, sdkAddress]`; `gnus_accountsChanged` and `switching` flips cancel and remove old keys. | A delayed-response-across-a-switch test is still required. |
| D2 | `@walletconnect/sign-client` 2.26.0, pinned, dynamic import only. No AppKit, no UniversalProvider. | UniversalProvider sends unapproved methods as HTTP RPC calls to `rpc.walletconnect.org`. |
| D3 | Stay on Next 14.2.x for v1; Next 16 is a follow-up. | The audit gate needs an allowlist. |
| D4 | Base v1 on `gsd/dashboard-v1`, merge no remote branch. Port by hand: delete `package-lock.json`, `reactStrictMode`, CSP origin list as an inventory. | `origin/develop` and `origin/security/epic-17` are already ancestors of `main`; the rest only touch code v1 deletes. |
| D5 | Job detail is a query-param route (`/jobs/detail?id=` or `?hash=`), read after `router.isReady`. | Needs no host rewrite. |
| D6 | Delete `OrderForm.tsx`, `data/orderForm/*` and all explorer pages. Job input is upload or paste of a processing-definition JSON plus one bundled example. | Field builder deferred. |
| D7 | Cut over EC2 only after a wallet release with `gnus_*`. Keep EC2 for rollback; keep the existing origin. | |

Resolutions where researchers disagreed (overturnable):
- Validation: zod at the single trust boundary. `strict: true` once the legacy surface is gone (fallback `tsconfig.strict.json` over `lib/gnus` and new pages).
- Job schema: no local copy; the wallet answers `-32602`. The dashboard only checks a JSON object with the top-level keys.
- CSP: `script-src 'self'` works (the export has no executable inline scripts). Ship report-only first.
- `trailingSlash`: decide with the host; test deep-link refresh on the real host.
- Price and gas pill: deleted in v1 (Braian to confirm).

## Contract Gaps: Closed vs Open

Closed by the 2026-10-26 contract update (do not re-raise): `unit: {symbol, decimals}` (U1 partly resolved; the wallet's burn-as-is is the reference); `version` in `gnus_getAccounts`; user-agent marker `GeniusWallet/<app version> gnus/<contract version>`; `Job.idempotencyKey` and `gnus_getJob({idempotencyKey})`; same key with a different body returns `-32602` `idempotency_key_reused`; `-32005` with `data.reason` (`rate_limited`, `confirm_open`, `submit_in_flight`); account switch is `-32015` (FEATURES.md and ARCHITECTURE.md still say 4901, read as `-32015`); WalletConnect events on `eip155:80002`, 60 s page-side reads with 300 s expiry, 900 s for submit and the first connect; an expired submit is recovered with `gnus_getJob({idempotencyKey})`.

Still open:
- U5, recovery of `bridgedNotProcessed`: v1 shows the burn hash, a plain message and a copy button, points to the wallet, no retry button. `gnus_retryProcess({burnTxHash})` slots in later if the wallet adds it.
- U2, U3, U4: out of v1 or assumed.
- SDK-CA, SDK-COSTERR, SDK-JOBID, SDK-STATUS, SDK-RESULT, SDK-EARNINGS, SDK-PAYOUT, SDK-ASYNC: all open, none is dashboard work.
- Payer with `evmAddress: null` cannot be a WalletConnect session account (CAIP-10 needs an EVM address): the wallet must say what that user sees.
- Named params over the relay and the approved-namespace echo of `gnus_*`: needs a real-wallet check.
- Machine-readable contract fixtures: not yet requested from the wallet milestone.
- Deep-link scheme for "Open GeniusWallet" from the browser path.

## Key Findings

### Recommended Stack

Keep: Next 14.2.35 (pinned), React 18.3.1, TypeScript 5.9, Bootstrap/react-bootstrap/Sass, Jest, Cypress 14, Yarn Classic. Add four runtime libraries; delete server, native, libp2p, protobuf, web3 and explorer dependencies. Wallet-facing code lives in `lib/gnus/` (schema, transport, injected, walletconnect, client, mock). Amounts are decimal strings with native `BigInt`; idempotency keys use `crypto.randomUUID()`. No `ethers`, `uuid` or `axios`.

- Next.js 14.2.35, pages router, `output: 'export'`, `images.unoptimized`; no `headers()`, rewrites, redirects or API routes.
- `@walletconnect/sign-client` 2.26.0, lazy chunk (~137 KB gzip), fails closed on unapproved methods; `telemetryEnabled: false`, optional namespaces only, never reuse `pairingTopic`.
- `@tanstack/react-query` 5: account-keyed cache, event-driven `setQueryData`, `useInfiniteQuery` for cursors, `useMutation` with `retry: 0` for submit, `networkMode: 'always'`, no persistence of job or earnings data.
- `zod` 4: contract as code, branded `SdkAddress`/`EvmAddress`, rejects numbers where strings are required; a mismatch raises "wallet contract mismatch" with the wallet's version.
- `qrcode.react` 4: SVG QR for the `wc:` URI, no CSP exception.
- Host with headers-as-code (Cloudflare Pages `_headers`, CloudFront policy or nginx) plus `scripts/serve-out.js` so e2e runs under the real CSP. Host choice is Braian's.
- Mock `window.gnus` (~150 lines, `lib/gnus/mock`) shared by dev server, Jest and Cypress; a build-time constant and a CI grep of `out/` keep it out of production.

### Expected Features

Must have (table stakes):
- Transport auto-detect (UA marker, `window.gnus`, 3 s `gnus#initialized` wait, else WalletConnect), one provider per session.
- Two labelled identities, "Earning as" (`sdkAddress`) and "Paying from" (`evmAddress`), plus a network label.
- Connection state machine: detecting, connecting, ready, wallet offline, SDK not ready, switching, denied, unsupported or old wallet, disconnected. Re-read everything on `gnus_accountsChanged`.
- JSON upload and paste of a processing definition, a preview of the exact job, one bundled example.
- Estimate: cost, balance and gas with decimals from `unit`; insufficient-balance and `-32010` "price unavailable" states; never show zero as free.
- Submit: idempotency key persisted before the call, in-flight guard, "confirm in your wallet", rejected state, success keyed on `burnTxHash`, persistent paid-but-not-processed surface.
- My jobs: cursor list and detail, status badges including `unknown` and `bridgedNotProcessed`, search by id or hash, live updates with a refetch backstop.
- Earnings: balance and `isProcessing`, null as "Not available yet", a scope note for children.
- A read-only or unsupported screen for browsers without GeniusWallet.

Should have: job templates / "load example" (the one v1 differentiator). If capacity allows: per-job timeline, "needs attention" nav badge, explorer link for the burn hash, copy-as-support-bundle.

Defer (v2+): guided job builder, children aggregation, payout address, two-device linking, OS/push notifications, explorer, price and gas display, a `gnus_retryProcess` flow.

### Architecture Approach

Layered and mock-first. Pages stay thin (a gate plus one feature component); hooks wrap react-query; `lib/gnus/client.ts` produces typed, zod-parsed calls; a `Transport` interface (`request`, `on`, `removeListener`, `close`) has injected, WalletConnect and mock implementations; a pure `select.ts` picks one and locks it. Detection happens only in an effect; initial state is `detecting`, identical on server and client. The first `gnus_getAccounts` has no timeout (it may wait on a native connect prompt). Events are hints, not truth: upsert on `gnus_jobUpdated`, refetch on ready, reconnect and `visibilitychange`, poll slowly only while a non-terminal job is shown.

Components:
1. `lib/gnus/` (schema, errors, address, amount, client, transport/select/injected/walletconnect, mock): the only code that knows the wire format.
2. Session context plus react-query provider: the `phase` state machine, the only thing components branch on.
3. `hooks/gnus/*` (`useWalletSession`, `useJobs`, `useJob`, `useEarnings`, `useSubmitJob`): the only wallet-data imports for pages.
4. `sub-components/{wallet,submit,jobs,earnings,shared}`: presentation; shared `Amount` and `AddressLabel` render null as "Not available yet".
5. Contract conformance suite (`__tests__/contract`): runs against the mock now and the real wallet later.

Routes: `/`, `/submit`, `/jobs`, `/jobs/detail`, `/earnings`, `404`.

### Critical Pitfalls

1. Double burn: create the key at the review step bound to a job hash, write it to `localStorage` before the call, reuse it on retry, drop it after about 23 h; recover on reload with `gnus_getJob({idempotencyKey})`; test reload at each step asserting one burn.
2. Paid-but-not-processed shown as success, failure or lost: normalise `status: bridgedNotProcessed` and `-32014` into one state; a persistent row and banner, never a toast; no auto-retry and no retry button until U5 resolves.
3. Null as 0 and amounts through `Number`: one `Amount` component over `string | null`, BigInt only in `amount.ts`, zod rejects numeric amounts, `strict` on, tests at 2^53+1 and 1e21, the mock serves nulls like the real wallet.
4. Web3Modal or a second provider inside the wallet, and the mobile detection race: dynamic WalletConnect import only after the decision; attach the listener first, then read `window.gnus`; re-read per call and re-subscribe on each `gnus#initialized`; a late injection with no active WalletConnect session wins; use the UA marker; mobile was never run in the spike, so a device walk is mandatory.
5. Stale or mixed identity: two branded address types never converted; keys on `[network, sdkAddress]`; identity from `gnus_getAccounts`, never from WalletConnect session accounts; block submit on `switching` and `-32015`.
6. Cutover breaks the live site: a static export merged to `main` triggers the EC2 workflow and `pm2 next start` crash-loops; replace or disable the workflow before or with the merge; keep the old origin and EC2 instance for rollback.

Also: secrets in the bundle (CI grep of `out/`, gitleaks, keep `bridge-test.html` out of `public/`); CSP breaking WalletConnect (report-only first, then a real pairing test); estimate spam (explicit action, one request in flight); mobile WebView limits (paste-JSON first-class, `ExternalLink` component, copy fallback); a mock that is too kind (fault profiles in CI).

## Implications for Roadmap

Eight phases. P2 before any UI, P3 before the features, P4-P6 independent leaves over P3, WalletConnect after the in-wallet slices, hardening and cutover last.

1. **Teardown and static shell.** `output: 'export'`, `images.unoptimized`; Redux removed; server, koffi, `functions`, `pages/api`, explorer, Web3Modal, `OrderForm`, protobuf and libp2p deleted; dead deps pruned in groups with build and tests between; `package-lock.json` gone; `.nvmrc` and `engines`; EC2 deploy workflow disabled or replaced in the same commit as any merge to `main`; jest infra fixed; placeholder pages and a custom `404.tsx`; secret and `out/` scan gate; test baseline before and after. Avoids pitfalls 1, 12, 13, 16.
2. **Contract layer, transports and mock.** `lib/gnus/` schema (zod, branded addresses, decimal strings), `GnusError` mapping incl. `-32015` and `-32005` reasons, typed client, `select.ts` (UA marker, 3 s wait, late injection), injected transport, mock with fault scenarios and a null profile, contract conformance suite, `strict: true`. Avoids pitfalls 2, 5, 6, 7, 17.
3. **Session, connect UI and identity.** react-query provider plus session context; `ConnectionGate`, identity chips, network label; all wallet-state banners; no-timeout first call with "confirm in your wallet"; account switch by key invalidation; new nav and layout; mock behind `NEXT_PUBLIC_GNUS_MOCK`; read-only screen for browsers without GeniusWallet. Avoids pitfalls 7, 8.
4. **Submit job.** `JobDefinitionInput` (upload, paste, one example); `EstimatePanel` (explicit action); `useSubmitJob` with persisted idempotency key; all result and error states; persistent `bridgedNotProcessed` surface with burn hash and copy; reload recovery via `getJob({idempotencyKey})`. Avoids pitfalls 3, 4, 6, 15.
5. **My jobs and live updates.** `useInfiniteQuery` list; `/jobs/detail` query-param route; `burnTxHash` key fallback; honest status badges; search; `gnus_jobUpdated` into `setQueryData`; refetch on ready, reconnect and focus; null-safe result block. Parallel with 4 and 6.
6. **Earnings.** Balance and `isProcessing`; `jobsProcessed` and `earned.*` as "Not available yet"; scope note; last-updated time; manual refresh. May fold into 5.
7. **WalletConnect transport and browser flow.** Lazy sign-client transport (optional namespaces, `telemetryEnabled: false`); QR and copy-URI connect panel; session restore plus `ping`; expiry rules; `session_delete` as `disconnect`; unsupported-wallet detection from approved namespaces; "wallet offline" state; acceptance: one real pairing with GeniusWallet. Avoids pitfalls 9, 10.
8. **Hardening, hosting and cutover.** Host and headers; strict CSP report-only then enforced under a real pairing; self-hosted fonts and icons; video shipped or dropped; `react-tooltip` style injection fixed; Cypress smoke against `out/` under the real CSP; mock-excluded and secret CI checks; a11y pass; Android, iOS, Windows and Linux device walks; cutover gate checklist and rollback window. Avoids pitfalls 11, 12, 13, 14, 16.

### Research Flags

- Phase 7 (largest unverified area): custom methods and events over sign-client with the Dart wallet, named-params round trip, approved-namespace echo, exact expiry bounds, payer with null EVM address, deep link.
- Phase 8: CSP origin list for the installed SDK versions, host header mechanism, pinned origin, WebKitGTK/Android/iOS behaviour, `trailingSlash` against the real host.
- Phase 4 (light): same-key replay UX with a live wallet, the 23 h key expiry, file chooser on the Android build.
- Standard patterns, skip research: phases 1, 2, 3, 5, 6.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions from npm; export rules and bundle sizes built and measured; sign-client source read. CSP origin list and host choice MEDIUM. |
| Features | MEDIUM | Contract and identity model HIGH; peer patterns MEDIUM; Golem, Render, Bittensor LOW. |
| Architecture | HIGH on structure | Redux to react-query is a decision, not tested. WalletConnect transport details MEDIUM. |
| Pitfalls | MEDIUM-HIGH | Repo-derived HIGH; WalletConnect expiry and CSP MEDIUM; mobile WebView LOW-MEDIUM (never run on a device). |

### Gaps to Address

- U5: ship the plain message and burn hash; revisit when the wallet answers.
- Real WalletConnect round trip: spike early in phase 7 planning.
- Hosting and pinned origin: Braian and the wallet team decide; blocks headers, `trailingSlash` and the wallet release build; raise before phase 8 planning.
- Mobile WebView limits: device time in phase 8; paste-JSON and `ExternalLink` land in phases 4 and 5.
- Price and gas display: deleted by default in v1; confirm with Braian.
- Contract fixtures: ask the wallet milestone; until then schemas are a hand transcription and `version` is the tripwire.
- Next 14 EOL: audit gate needs a recorded allowlist; Next 16 follow-up right after phase 1 if a gate cannot be waived.
- Cost still 0 live (SDK-CA): real submit cannot be walked end to end until fixed.

## Sources

Primary (HIGH): `research/gnus-rpc-contract.md`, `PROJECT.md`; local Next 14.2.35 export builds (rules, inline-script check, bundle sizes, `npm audit`); source reads of `@walletconnect/sign-client` and `universal-provider` 2.26.0; npm registry versions 2026-10-26; Next.js static export, support policy and v16 upgrade docs; Reown dApp Sign API; zod; TanStack Query network mode; repo reads and branch analysis.
Secondary (MEDIUM): Akash and io.net docs; EIP-1193; MetaMask provider docs; WalletConnect Sign RPC and expiry docs; Reown CSP page.
Tertiary (LOW): Golem, Render, Bittensor dashboard behaviour; Android and iOS WebView behaviour (no device run).

---
*Research completed: 2026-10-26. Ready for roadmap: yes.*
