# Phase 3: Connect and identity - Context

**Gathered:** 2026-10-28 (autonomous on Braian's instruction; every decision is (D), not yet reviewed by Braian)
**Status:** Ready for planning

<domain>
## Phase Boundary

The first user-facing UI: a session that detects the wallet, connects, and shows "Earning as",
"Paying from" and the network in a new header with Submit, My jobs and Earnings under it; one named
screen state per wallet state; account and network switches that drop the old account's data; light
and dark that both pass WCAG AA. Injected `window.gnus` and the mock only: the WalletConnect transport,
its connect panel and Disconnect are phase 6. Estimate and submit buttons are phase 4; this phase gives
them the gate they must read (`canEstimate`, `canSubmit`).

</domain>

<contract_changes>
## Contract changes since the phase 2 snapshot

`research/gnus-rpc-contract.md` is now the wallet's canonical copy of 2026-10-28. What changes here:
- Declining the connect prompt is `4001`. Revoking forgets the origin: its next call prompts again.
  `4100` now means an origin outside the allowlist, or a call in flight at the revoke.
- Wallet phase 44 (consent): every method needs the connection first, so an unconnected page never sees
  `4900`; a call that needs a prompt while that origin's prompt is open gets `-32005 confirm_open` at once,
  nothing queues; at most 3 prompts a minute per origin, then `-32005 rate_limited`.
- `-32603` gains `data.reason: "submission_outcome_unknown"` with `data` = `{ idempotencyKey, burnTxHash,
  sdkAddress, payer, cost, createdAt }`, every field but the key nullable.
- `gnus_submitJob` status gains `unconfirmed`. `Job.status` gains `unconfirmed` and `pending`; `pending`
  comes only from `gnus_getJob({ idempotencyKey })` and has `burnTxHash` and `jobId` null, other fields
  null when the wallet's record is unreadable.

</contract_changes>

<decisions>
## Implementation Decisions

### Contract layer
- **D-01 (D):** Phase 3 brings `lib/gnus` to the new contract in its own wave-1 plan, so phases 4 and 5
  (parallel worktrees) never both edit `schema.ts` or `errors.ts`. Every new value parses and maps here;
  what the user sees for `unconfirmed`, `pending` and outcome-unknown stays with phase 4 (submit) and
  phase 5 (status words).
- **D-02 (D):** Schema: submit status adds `unconfirmed`; `JOB_STATUSES` adds `unconfirmed` and `pending`;
  only `getJob` accepts a pending record (a union branch with the nullable fields); list and event jobs
  keep `burnTxHash` required. Errors: reason `submission_outcome_unknown` gets kind
  `submissionOutcomeUnknown`, message "GeniusWallet can't tell whether this payment went through. Check
  it in GeniusWallet before you submit again.", action `openWallet`; `GnusError` gains `outcome`, each
  field parsed on its own and null when it does not parse, so this error never becomes a mismatch.
- **D-03 (D):** Mock connect model: a `connected` flag, true for every existing profile so the phase 2
  suites keep their meaning. New profile `connectPrompt` starts unconnected and auto-approves after 5 s
  (dev server). Unconnected: the first call opens a prompt and waits; any other call meanwhile is
  `-32005 confirm_open`; `controls.answerConnect(approve)` settles it (decline is `4001`, still
  unconnected). `controls.revokeOrigin()` forgets the origin and rejects open spend confirms with `4100`.
  `originRevoked` is renamed `originNotAllowed`. New profiles `unconfirmedSubmit` and
  `submissionOutcomeUnknown`. Simulating a crash mid-submit (pending records) is phase 4's.

### Session
- **D-04 (D):** A pure reducer `lib/session/machine.ts` owns the phase; a framework-free store
  `lib/session/store.ts` runs detection, the client, events and timers. One store per page load, created
  on first client use, never at import; React subscribes through `useSyncExternalStore` in
  `SessionProvider`. StrictMode's double mount must never send a second connect call (the wallet would
  answer it `confirm_open`). Components branch only on `phase`.
- **D-05 (D):** Phases: `detecting`, `connecting`, `ready`, `switching`, `startingUp`, `notResponding`,
  `denied`, `unsupported`, `noWallet`, `failed` (any other connect error, with its errors.ts message).
- **D-06 (D):** One wallet call at a time until `ready`: account queries are disabled outside
  `ready`/`switching` (the wallet answers a second prompt-needing call with `confirm_open`).
- **D-07 (D):** The connect call (first `gnus_getAccounts`, every Connect again, every Retry from a
  failure screen) has no timeout. Other injected reads show `notResponding` after 15 s but are not
  abandoned: a late answer still moves the machine on (a revoked origin's read can sit behind a prompt).
  WalletConnect's 60 s rule is phase 6.
- **D-08 (D):** Mapping, from the connect call or any account query: `4001` and `4100` to `denied`;
  `4900` to `startingUp`, retrying `gnus_getAccounts` after 1, 2, 4, 8, 16, then every 30 s, plus Try now,
  no toast; `-32015` to `switching`; `-32005 confirm_open` to `connecting`; `-32005 rate_limited` on
  Connect again keeps `denied` and shows the table's message; `4200`, a contract mismatch, or an
  unsupported version on `getAccounts` or an identity event to `unsupported`; `disconnect` to
  `notResponding`. Everything else stays with the feature that asked. A `4001` from `gnus_submitJob`
  belongs to phase 4.
- **D-09 (D):** Re-read `gnus_getAccounts` when the tab becomes visible. No polling.
- **D-10 (D):** Account data is read only through `useAccountQuery(kind, fn)`, keyed
  `[kind, network, sdkAddress]`. When `sdkAddress` or `network` changes, every query under another pair
  is cancelled and removed; a late reply for the old pair cannot render.
- **D-11 (D, revised by Braian 2026-10-28):** The dashboard does not decide which EVM chains may estimate
  or submit. The wallet burns on Amoy (80002), BNB Testnet (97) and Sepolia (11155111) and refuses any other
  chain itself with `-32013` and `data.reason: "bridge_unavailable"` before a confirm. The header shows the
  network the wallet reports. errors.ts maps that reason to kind `bridgeUnavailable`, message "Not available
  on this network. Switch the network in GeniusWallet.", action `openWallet`. The SDK network this build
  serves is set at build time, `NEXT_PUBLIC_GNUS_SDK_NETWORK` (default `staging`), always inlined through
  `next.config.js` `env`; there is no EVM chain variable. A wallet SDK network that differs, null included,
  shows a banner and blocks estimate and submit. The EVM chain id never blocks anything client-side.
- **D-12 (D):** `canEstimate` = `ready` and the network matches; `canSubmit` = `canEstimate` and
  `payer.canSign`. Switching shows a banner over the page, not a full screen: the data on screen is still
  the current account's until `gnus_accountsChanged` names a new one.

### Screens and copy (exact words)
- **D-13 (D):** Each wallet page wraps its content in `WalletGate`; the 404 page is not gated. A state
  screen is an h1, one paragraph and at most one action, announced through `role="status"`; a spinner
  only ever sits next to text.

| Phase (cause) | Heading | Body | Action |
|---|---|---|---|
| detecting | Looking for GeniusWallet | This takes a few seconds. | none |
| connecting | Confirm in your wallet | GeniusWallet is asking whether this site may connect. Approve it there to continue. | none |
| startingUp | GeniusWallet is starting up | This page connects as soon as GeniusWallet is ready. | Try now |
| notResponding (noReply) | GeniusWallet isn't responding | GeniusWallet hasn't answered for 15 seconds. If it is asking you to allow this site, approve it there. | Retry |
| notResponding (disconnected) | GeniusWallet isn't responding | GeniusWallet closed its connection to this page. | Retry |
| notResponding (noBridge) | GeniusWallet isn't responding | GeniusWallet opened this page but has not connected to it yet. | Reload page |
| denied (declined) | Allow this site in GeniusWallet | You declined the connection. This site needs it to show your account and submit jobs. | Connect again |
| denied (notAllowed) | Allow this site in GeniusWallet | GeniusWallet hasn't allowed this site. | Connect again |
| unsupported (walletOld) | Update GeniusWallet | This GeniusWallet does not support this page. Update it, then open the page again. | Get the latest GeniusWallet |
| unsupported (pageOld) | This page needs an update | Your GeniusWallet uses contract version {v}; this page supports version 1. Try again later. | none |
| noWallet | GeniusWallet required | This dashboard pays for jobs and shows your earnings through GeniusWallet. Open this page from GeniusWallet. | Get GeniusWallet |
| failed | GeniusWallet couldn't connect | the error's message from errors.ts | Retry |

  A mismatch with the same version reads as walletOld with the `GnusContractMismatchError` message as body.
  Banners: "Switching account" / "Submitting is paused until GeniusWallet finishes switching." and
  "Wrong network" / "GeniusWallet is on {sdk}. This dashboard works on {sdk}. Switch the network in
  GeniusWallet." (null reads "not set").
- **D-14 (D):** Get GeniusWallet links to `https://gnus.ai/`, the only official site the wallet itself
  links to (Braian to confirm a download URL). `ExternalLink` (`target="_blank"`, `rel="noopener noreferrer"`)
  is created now; DISP-02's lint and CID links stay phase 5.

### Header, layout, theme
- **D-15 (D):** Header on every page: the head icon (decorative) and the text "GNUS Dashboard" (the
  wordmark PNGs are white and vanish in light mode); "Earning as" and "Paying from", each `0x` + 4 hex +
  "..." + 4 hex with a copy button named "Copy earning address" / "Copy paying address"; "No paying
  wallet" for a null payer; "Network: {sdk}, chain {id}"; "Not connected" before ready; then the nav:
  Submit a job, My jobs, Earnings. The home page says what the two identities mean and links the three.
- **D-16 (D):** `lib/copyText.ts`: Clipboard API, else a hidden textarea and `execCommand("copy")`. The
  button reads "Copied" for 2 s through a polite live region; on failure it says "Copy failed. Select the
  address to copy it." and shows the full address in a selected read-only field. No toasts.
- **D-17 (D):** Light and dark follow the OS through Bootstrap 5.3's `$color-mode-type: media-query`:
  CSS only, so no script, no flash, nothing for the strict CSP to block. No manual switch. Dark keeps
  today's look (black page, mint accents); light is a white page, near-black text and dark-teal links
  (#0b7a5e, 5.3:1 on white); mint stays the button fill with black text. Focus is a 2px outline in the
  body emphasis colour. The theme's dark-mode overrides that set text-emphasis and bg-subtle to black are
  fixed. New markup uses only Bootstrap's mode-aware utilities, no fixed white or black classes and no
  inline colours.
- **D-18 (D):** Removed: the video background (IPFS-hosted; phase 7 had "local or removed"), the Network
  toggle (it only toasted "Mainnet coming soon"), `NavDropdownMain` (no route has children). The footer
  becomes one row: copyright, socials, Privacy policy and Terms as external links to the gnus.ai pages the
  wallet uses; its empty privacy modal, dead `#` links, missing routes and old support address go.

### Tooling and tests
- **D-19 (D):** `@tanstack/react-query` 5.105.0, pinned (registry checked 2026-10-28: TanStack/query,
  one dependency `@tanstack/query-core` 5.105.0 with none). `networkMode: "always"`, no retries, no
  persistence, no devtools. Added with `useAccountQuery`, not before.
- **D-20 (D):** Jest for the reducer, the store (fake timers) and components (Testing Library,
  jest-axe). Cypress against the production `out/` with the mock installed in `onBeforeLoad`, as
  `mock-wallet.cy.js` does. An axe sweep of every state in light and dark: colour scheme set through the
  Chrome DevTools Protocol (`Emulation.setEmulatedMedia`), axe-core 4.10.2 already in the tree through
  jest-axe, read by a Cypress task; no new package. Keyboard walk with `cy.press` (Cypress 14.5).
- **D-21 (D):** Source comments carry no plan, phase or decision ids.

### Claude's Discretion
- File split inside `sub-components/wallet/`, backoff constants' names, exact shades if axe flags one.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/gnus-rpc-contract.md` sections 2, 3 (`gnus_getAccounts`), 4, 5, 6
- `.planning/ROADMAP.md` Phase 3; `.planning/REQUIREMENTS.md` CONN-02..CONN-11
- `.planning/research/ARCHITECTURE.md` "Session State Machine", "Account switching"; `PITFALLS.md` 2, 8, 14;
  `FEATURES.md` "Wallet states"; `STACK.md` "Data fetching and caching"
- GeniusWallet `.planning/phases/44-dashboard-consent-and-limits/44-CONTEXT.md` D-01, D-06, D-07, D-09, D-10
- `.planning/phases/02-contract-client-and-mock-wallet/02-0{4,5,6,7}-SUMMARY.md`

</canonical_refs>

<code_context>
## Existing Code Insights

- `detectTransport` already gives `choice`, `onSwitch` (late injection) and `onNotReady` (10 s stall).
- `createInjectedTransport` has no timeout by design; the 15 s hint lives in the store.
- `GnusContractMismatchError.version` carries the wallet's version; `accountsSchema.version` is the literal "1".
- Cypress runs the production `out/`; specs install the mock themselves and drive it through `controls`.
- `__tests__/mocks/` is outside test discovery, so test helpers go there.

</code_context>

<deferred>
## Deferred Ideas

- WalletConnect connect panel and Disconnect (phase 6); estimate and submit controls (phase 4).
- A chain-name table for the network label; a manual theme switch.

</deferred>
