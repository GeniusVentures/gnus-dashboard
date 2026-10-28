# Phase 6: WalletConnect browser flow - Context

**Gathered:** 2026-10-28, autonomously. Decisions marked (D) are Claude's and open to Braian; the rest mirror
GeniusWallet phase 47 (`47-CONTEXT.md`, wallet branch `claude/gsd-dashboard-bridge-milestone-b6a5e7`).
**Status:** Ready for planning

<domain>
## Phase Boundary

The browser path: when detection picks `walletconnect`, the page pairs with GeniusWallet through
`@walletconnect/sign-client` (no AppKit, no UniversalProvider, PROJECT.md) and every screen from phases 3-5
works over the session through the same `Transport` interface. Done here: everything runs against a fake
relay over the mock wallet; one real pairing is WC-08 (gap until wallet phase 47 ships a build). Hosting,
headers and the CSP are phase 7; the hosted walk with the Linux wallet closes there.

</domain>

<contract_updates>
## Contract text to carry (wallet canonical copy, 2026-10-28)

The dashboard snapshot `.planning/research/gnus-rpc-contract.md` is behind the wallet's
`.planning/research/v4.0-gnus-rpc-contract.md`. The code already handles all of it; the text is not synced:
- `-32010`: "On `gnus_submitJob` also when the burn's gas estimate fails, before any confirm, except a chain
  with no bridgeOut, which is `-32013` (D, 2026-10-28)".
- New reason row: "`-32013` | `bridge_unavailable`: this network has no GNUS bridge; nothing was signed".
- Section 6, origins: "The wallet keys every caller on its transport (WebView or WalletConnect) plus its
  canonical origin: scheme and host lowercased, default port dropped, no path, query or fragment. Anything
  not http(s), or with userinfo, is `4100`. The same origin over the other transport is a different caller
  with its own connection." So a user connected in the WebView sees the connect prompt again over WalletConnect.
- Section 6, prompt limits: the connect prompt is a `4001` after 10 minutes unanswered; one prompt open in
  the wallet at a time across origins, at most 3 a minute per origin, else `-32005` `confirm_open` or
  `rate_limited` with no dialog; a submit whose origin is revoked before its burn answers `4100`.

Wallet phase 47 decisions not yet in the canonical text (47 D-06 says section 2 will record them):
- Reown's Dart side cannot send JSON-RPC error `data` or a `null` result. When an error has `data`, the
  WalletConnect error message is the JSON text `{"message": ..., "data": ...}`. A `null` result goes out as
  `{}`; no result in the contract is an empty object. The dashboard reverses both.
- The wallet holds a gnus request for its 10-minute prompt limit plus 60 s; an undeliverable reply is dropped,
  and a submit still completes, recovered by `gnus_getJob({ idempotencyKey })`.

</contract_updates>

<decisions>
## Implementation Decisions

### Mirrored from wallet phase 47 (not Claude's choice)
- **D-01:** Proposal: `optionalNamespaces.eip155` only, chains `["eip155:80002"]`, methods exactly the six
  `METHODS`, events `gnus_accountsChanged`, `gnus_networkChanged`, `gnus_jobUpdated`. A fresh pairing each
  connect (no `pairingTopic`), `telemetryEnabled: false`. The wallet approves only proposals asking for gnus
  methods it implements (47 D-01).
- **D-02:** `metadata.url` is `window.location.origin`, never a path or a constant: the wallet keys the
  caller on it and Reown Verify compares it with the attestation (47 D-02). Icons are absolute URLs on the
  same origin.
- **D-03:** The wallet refuses an unverified peer (47 D-03): Verify VALID is approved, SCAM or INVALID
  rejected, UNKNOWN rejected in release builds and accepted in debug builds for `localhost` and `127.0.0.1`
  only. So a hosted origin must be verified in its Reown Cloud project, and local work runs on
  `http://127.0.0.1:3000` (`yarn dev`) against a debug wallet. Source read of `@walletconnect/core` 2.26.0:
  the page registers its attestation through a hidden iframe at `https://verify.walletconnect.org/v3/attestation`
  on every proposal and request; phase 7's CSP must allow it in `frame-src`.
- **D-04:** Wire format (47 D-06), WalletConnect transport only: an error whose `message` parses as a JSON
  object with a string `message` and an object `data` becomes `{ code, message, data }`; anything else is kept
  as sent. A result that is a plain object with no own keys becomes `null`, for every method.
- **D-05:** Events (47 D-09, D-10, D-11): listen to raw `session_event`; deliver `params.event.data` when the
  topic is the current session, `chainId` is `eip155:80002` and the name is one of the three gnus events.
  `accountsChanged` and `chainChanged` are ignored: identity comes only from `gnus_getAccounts` (WC-07).
  `session_delete` and `session_expire` emit the contract's `disconnect` with `{ code, message }` (the
  wallet's reason when the event carries one, else `6000` "WalletConnect session ended").
- **D-06:** Expiries (contract section 2, 47 D-08): reads use request expiry 300 s and a 60 s page timer;
  `gnus_submitJob` 900 s; `gnus_getAccounts` 900 s until it has once succeeded on the session and again
  after any `4001` or `4100` answer (the calls on which the wallet prompts), else 60 s.
- **D-07:** First use shows two wallet dialogs (47 D-07): the session approval, then the connect prompt on
  the first `gnus_getAccounts`, during which the page shows the existing "Confirm in your wallet".

### Loading and configuration
- **D-08 (D):** On the browser path the store always dynamic-imports `lib/gnus/transport/walletconnect.ts`
  (the only importer of sign-client). The module reads `NEXT_PUBLIC_WC_PROJECT_ID`; empty means
  `unconfigured`, and the page shows today's "GeniusWallet required" unchanged, so CI and builds without an
  id pass every existing test. Inside the wallet the module is never imported (WC-01). `next.config.js`
  always defines the variable (`""` when unset) like the existing ones. Dev puts a dev Reown id in
  `.env.local` (gitignored); deploys set it from CI variables (phase 7). It is never committed.
- **D-09 (D):** The store takes a WalletConnect factory: production passes one over the real `SignClient`;
  Jest and the dev-only mock entry pass the fake relay. No `window` global seam. `SignClientLike` in
  `walletconnect.ts` is the subset used, and the real client must satisfy it under `tsc`.
- **D-10 (D):** `SessionState` gains `transport: "injected" | "walletconnect" | null`. New phases `pairing`
  and `disconnected`; new cause `offline` on `notResponding`.

### Screens and words
- **D-11 (D):** Pairing: heading "Connect GeniusWallet", body "Scan this code with GeniusWallet, or copy the
  link into GeniusWallet." An SVG QR (`qrcode.react` `QRCodeSVG`, no canvas or data URL) labelled
  "WalletConnect pairing code", a Copy link button through `lib/copyText.ts`, and the existing "Get
  GeniusWallet" link; no submit control. An expired proposal gets a new code automatically while the tab is
  visible, and on return when hidden.
- **D-12 (D):** A declined proposal: "GeniusWallet declined the connection." plus the wallet's message as
  plain text, cut at 200 characters, and Try again (new code).
- **D-13 (D):** Namespace check after approval (WC-06): eip155 must hold `eip155:80002`, all six methods
  and all three events. No gnus method at all: "GeniusWallet required", body "The wallet you connected is not
  GeniusWallet. Connect GeniusWallet instead."; some but not all: the existing "Update GeniusWallet". Either
  way the page ends that session so the next connect pairs fresh.
- **D-14 (D):** Restore (WC-03): after init, the newest unexpired session passing D-13 is pinged with a 10 s
  page timer; an answer attaches it and runs the connect call; no answer shows "Wallet offline", body
  "GeniusWallet didn't answer over WalletConnect. Open GeniusWallet, then retry.", with Retry (ping again)
  and Disconnect. Other stored sessions are ended (one provider per session, contract section 2).
- **D-15 (D):** Disconnect (WC-05): on the WalletConnect transport only, the header shows Disconnect; it
  ends the session and moves to `disconnected`: heading "Disconnected", body "This page is no longer
  connected to GeniusWallet.", action "Connect again" (new code). A wallet-side end lands on the same screen.
  Inside the wallet there is no disconnect control and `disconnect` keeps today's screen.
- **D-16 (D):** Confirm screens over WalletConnect add "Open GeniusWallet where you scanned the code." (SUB-03).

### Errors and recovery
- **D-17 (D):** `GnusOfflineError` beside `GnusContractMismatchError` in `errors.ts`: code null, kind
  `walletOffline`, message "GeniusWallet is offline.", action retry. Raised by a page timer and by an offline
  relay before sending. A method missing from the approved session is rejected by the transport as `4200`
  before anything is sent. The session machine maps `walletOffline` from any source to `notResponding/offline`.
- **D-18 (D):** An expired submit (WC-04) needs no new submit code: code null already makes phase 4's
  classifier look the draft up by its idempotency key, and "Check again" re-looks.
- **D-19 (D):** Late injection: `hasActiveWalletConnectSession` is true once a session is attached. A late
  injection with none closes the WalletConnect client (relay socket) and switches.

### Fake relay and tests
- **D-20 (D):** `lib/gnus/mock/relay.ts` (imports `./marker` like every mock module): a fake `SignClientLike`
  over the existing mock provider. It encodes D-04 exactly as the wallet does, sends events only for approved
  names on `eip155:80002`, and keeps sessions per window so a Jest "reload" restores one. Profiles: `approve`
  (default), `decline`, `notGenius`, `oldGenius`, `proposalExpires`, `offline`, `walletEnds`, `latency`,
  `dropEvents`, `zombie` (the page stops waiting, the wallet still runs the request later).
- **D-21 (D):** Dev server: `?gnusWc=<relay profile>` on the existing dev-only mock entry puts the fake relay
  on the browser path, so every WalletConnect screen can be looked at without a wallet.
- **D-22 (D):** Conformance (RPC-07): `__tests__/contract/factories/walletconnect.js` runs the whole contract
  suite through the real WalletConnect transport over the fake relay; it is mock-backed, so spend cases run.
- **D-23 (D):** WC-01 on `out/` (built without an id): the no-wallet browser path requests the chunk holding
  `relay.walletconnect.org`; with the mock injected, with and without the user-agent marker, it is never
  requested; no request on any path goes to a `walletconnect` or `reown` host.
- **D-24 (D):** Packages, exact pins: `@walletconnect/sign-client` 2.26.0 and `qrcode.react` 4.2.0. Checked on
  the registry 2026-10-28: sign-client repo WalletConnect/walletconnect-monorepo, maintainers reown-npm-org
  and cyberdrk, lockstep `@walletconnect/*` 2.26.0 deps; qrcode.react repo zpao/qrcode.react, no dependencies,
  peer react ^18. The audit gate must pass after the install.
- **D-25 (D):** Sync the contract snapshot from the wallet's canonical copy; if its section 2 still lacks the
  wire rule, append the 47 D-06 text above as a dated note naming wallet phase 47. No other local edit.

### Claude's Discretion
- File split inside `sub-components/wallet/`, QR size, the fake relay's internals, timer plumbing.

</decisions>

<canonical_refs>
## Canonical References

- GeniusWallet `.planning/phases/47-dashboard-over-walletconnect/47-CONTEXT.md`; `.planning/research/v4.0-gnus-rpc-contract.md` sections 2, 4, 5, 6
- `.planning/research/STACK.md` (WalletConnect section; its "verify is wallet-side" note is superseded by D-03)
- `.planning/research/PITFALLS.md` pitfalls 1, 9, 10, 11; `.planning/REQUIREMENTS.md` WC-01..08, CONN-01, CONN-10, SUB-03
- `lib/gnus/transport/types.ts`, `select.ts`, `injected.ts`; `lib/gnus/client.ts`, `errors.ts`; `lib/session/machine.ts`, `store.ts`; `lib/submit/outcome.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

- `detectTransport(env, { hasActiveWalletConnectSession })` already locks the choice and allows the late
  injection; the store passes `() => false` today and does nothing on `walletconnect` but show `noWallet`.
- `createGnusClient(transport)` parses every reply with zod and normalises errors; a WalletConnect transport
  slots in with no client change. `useJobUpdates`, `useAccountQuery` and the submit store need no change.
- `classifyError` sends any code-null error to the lookup by key; nothing-spent codes include `4200`.
- The dev mock entry is `installMockFromLocation` in `_app.tsx`, folded out of production builds.

</code_context>

<deferred>
## Deferred Ideas

- One owner tab for the WalletConnect client (Web Locks); an "Open GeniusWallet" deep link; AppKit or any
  wallet picker; the browser path on phones; proposing the wallet's other GNUS chains.

</deferred>

<gaps>
## Live checks recorded as gaps

- WC-08: a real pairing round-tripping every read method waits on a wallet phase 47 build.
- Two tabs on one session, and Verify VALID on the hosted origin (phase 7 plus Reown Cloud), are live-only.

</gaps>
