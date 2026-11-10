# Feature Landscape

**Domain:** Compute-job dashboard that is a client of a wallet (submit jobs, track status and results, show node earnings), served in two places: a WebView inside GeniusWallet (`window.gnus`) and a desktop browser (WalletConnect).
**Researched:** 2026-10-26
**Overall confidence:** MEDIUM. The contract and identity model are HIGH (read directly from the repo's own research). Peer-marketplace patterns are MEDIUM (official docs for Akash and io.net, plus EIP-1193; Golem, Render and Bittensor are from general knowledge and not re-verified here).

## How peers do it, in short

| Project | What it shows | Lesson for this dashboard |
|---------|---------------|---------------------------|
| Akash Console | Wallet connect via Keplr/Leap, deployment status that steps through named stages (Manifest Received, Starting Services, Active), separate Logs and Events tabs, escrow balance and cost tracking. Troubleshooting is "extension installed? on the right network?" | Named stages beat a spinner. A separate events/timeline view is where users look when something fails. Wrong-network and no-wallet states are first-class screens, not toasts. |
| io.net (worker side) | Earnings and Rewards tab split into block rewards and job earnings, with active time and job counts. Search by Job ID, filter by date. Payment is delayed (immediate if a job finishes within a day, else daily). Docs say a worker offline during a job is not paid for that stretch | Earnings lag the work. A "pending" or empty history is normal and must be explained, not shown as 0. Job ID search is a baseline expectation. |
| Golem, Render, Bittensor dashboards | Provider/requestor split, per-task state, earnings per provider. Bittensor and Render explorers are public and read-only by address | Peers separate "what I requested" from "what I earned". The two roles are different screens, same as our two identities. Public-by-address views exist but are the explorer, which is out of v1. (LOW: not re-verified this run.) |
| EIP-1193 dApps | `accountsChanged`, `chainChanged`, `disconnect` drive UI. Dapps re-read all account-bound state on change, remove listeners on teardown, and treat an empty accounts array as "no accounts" | The contract's `gnus_accountsChanged` and `disconnect` follow this. Every account-keyed query must be invalidated on change. |

Note for the contract owner: in EIP-1193, 4900 means "disconnected from all chains" and 4901 means "chain not connected". The `gnus_*` contract reuses 4900 for "SDK not initialized" and 4901 for "account switch in progress". The dashboard should map by code in one place and not assume stock EIP-1193 meanings; worth flagging to the wallet milestone so generic libraries do not misread them. (MEDIUM, from the EIP text versus the contract table.)

## Table Stakes

Features users expect. Missing means the product feels broken or unsafe.

### Connect and identity

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Transport auto-detect: `window.gnus` (with up to 3 s wait for `gnus#initialized`), else WalletConnect | Two runtimes, one build; already in the contract | Med | One provider per session. Never mount Web3Modal when `window.gnus` exists. Race to handle: shim arrives after first render. |
| Two labelled identity chips: "Earning as" (node `sdkAddress`) and "Paying from" (`evmAddress`) | The identities differ by design; mislabelling pay vs earn is the core confusion in `wallet-identity.md` | Low | Truncate with copy button. SDK address is 130 chars, EVM is 42; never convert, never mix formats in one field. |
| Network label (`network.sdk`, `evmChainId`) in the header | Wrong-network is the most common wallet-dApp failure (Akash docs lead with it) | Low | Show a mismatch banner on `gnus_networkChanged`. |
| Connection state machine: detecting, connecting, connected, wallet offline, SDK not ready, switching, disconnected, unsupported (no GeniusWallet) | Each of these needs different copy and a different recovery action | Med | See "Wallet states" below. One state source, not scattered booleans. |
| Re-read everything on `gnus_accountsChanged` | Stale-account data is the top identity bug (WalletConnect freezes the account; Edge case 2) | Med | Clear job list, earnings and any draft estimate tied to the old account. Do not carry them across. |
| Disconnect and reconnect control | Basic wallet-dApp hygiene | Low | WalletConnect only; in-wallet there is nothing to disconnect, hide the button. |
| Read-only message for browsers with no GeniusWallet | PROJECT.md: MetaMask-only users cannot submit | Low | Plain empty state with a link to get the wallet. No fake submit button. |

### Job input

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| JSON upload of a processing definition | The current app already has it; power users arrive with a file | Med | Mobile WebView needs a file-chooser handler (Android) and results need a download handler. Parse client-side only. |
| Validate against the SDK processing-definition schema before estimate | Wallet returns `-32602` on bad schema; catching it early saves a round trip and gives field-level messages | Med-High | Needs a JSON Schema copy (from SuperGenius `posenet-processing-job.json`) vendored and versioned. Which schema version the wallet accepts is a contract question. Show errors with JSON path, not "invalid". |
| Inline error list with line/path, and a disabled Estimate button until valid | Standard form behaviour | Low | |
| Preview of the exact job that will be sent (read-only pretty JSON) | The user is about to pay for it; the wallet confirm dialog will not show the full job | Low | Same object goes to estimate and submit, byte for byte. |

### Cost estimate

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Show `cost`, `balance` and `gas` from `gnus_estimate`, with units and token symbol | Users will not pay without seeing price and whether they can afford it | Low | Decimal strings only, no `Number`. Display with the wallet's decimals, do not rescale (open question U1). |
| Insufficient balance state before submit (`cost` > `balance`, and `-32011`) | Peers show escrow/balance up front (Akash) | Low | Compare as strings/BigInt. |
| Estimate failure state (`-32010`, with `data.reason` when present) | SDK-CA means cost is currently always 0, so this is the live path today | Low | Never render a zero cost as "free". Say "price unavailable" and block submit. |
| `gas: null` shown as "not estimated", submit still allowed | Contract allows it | Low | |
| Re-estimate on job edit; mark a stale estimate as stale | Cost can change between estimate and confirm | Low | The wallet burns its own fresh estimate, so the dashboard figure is advisory. Say "the wallet will confirm the final amount". |

### Submit flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Idempotency key generated once per submit intent, persisted before the call | Contract dedupes for 24 h; reloads and double-clicks are the named risk (Edge case 15) | Med | Key is created when the user commits the job, stored in `sessionStorage`/`localStorage` with the job payload, and reused on retry. A new edit creates a new key. Do not mint a key per click. |
| Disable submit while a request is in flight; handle `-32005` (confirm already open) | A second click must not open a second confirm | Low | |
| Pending-confirm state: "Confirm in your wallet", no timeout | The wallet waits on a human; contract says no timeout for submit | Low | Offer Cancel (dashboard-side only; the wallet prompt remains) and explain that. Over WalletConnect on a phone, say the app must be opened. |
| Rejected state (`4001`) with a way back to the job | A user declining is normal, not an error | Low | Keep the form content and the same idempotency key (nothing was spent). |
| Success state: show `burnTxHash` always, `jobId` when not null, link to job detail | Core value: user sees what happened | Low | Detail is keyed on `burnTxHash` while `jobId` is null (SDK-JOBID). |
| "Paid but not processed" state (`bridgedNotProcessed` or `-32014`) | Funds are spent; user must be told, with the burn hash | Med | Persistent: shown in the job list as a row and as a banner on detail, not a toast. States plainly "your payment went through, the network did not start the job". |
| Recovery action for paid-but-not-processed | Peers always give a next step. Here the wallet owns the record | Med | v1 recovery = resubmit with the same idempotency key (contract returns the first result and does not double-burn) plus copy of burn hash for support. A real "retry Process only" needs a wallet method that does not exist; flag it as a contract request, do not fake it. |
| Failure states for `-32013` (nothing spent), `4100` (permission), `-32012` (payer cannot sign), `4900/4901` | Each has a different user action | Low-Med | One error-to-copy table in one module. |
| Never call `bridgeOut` or `/api/processing/*` | PROJECT.md decision | Low | Enforce by deleting the code, not by flags. |

### My jobs

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Job list from `gnus_listJobs` with cursor pagination | Peers all have a job history | Low-Med | Newest first. Keyed on current `sdkAddress`. |
| Row shows status, submittedAt, cost, origin, short id (`jobId` or `burnTxHash`) | Minimum to recognise a job | Low | |
| Status badge covering all contract states including `bridgedNotProcessed` and `unknown` | `unknown` is a real value | Low | Today every job reads `submitted` (SDK-STATUS). Do not label `submitted` as "running" or "done". Use wording that is true: "Submitted to the network". |
| Job detail from `gnus_getJob` by `jobId` or `burnTxHash` | Click-through is expected | Low-Med | Result block renders "Result not available yet" while `result` is null (SDK-RESULT). |
| Job search by id or burn hash | io.net has Job ID search | Low | Client-side filter over loaded pages; exact-id lookup via `gnus_getJob`. |
| Live status updates via `gnus_jobUpdated` | Named in the requirements | Med | Merge by job key into the list and open detail. Do not rely on events alone: re-fetch on reconnect and on tab focus, since WalletConnect events can be missed while the phone is backgrounded. |
| Empty state for a new account, error state for failed list | Basic | Low | |
| Result display for `cids` and `data` when present | Core promise; blocked on SDK-RESULT | Med | Build the view now against the mock. CIDs open via a gateway link in the system browser. |

### Earnings

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Node balance (SGNUS) and "is processing" indicator | Both available today | Low | Label the balance as the node account's SGNUS, not the payer's Polygon balance (Edge case 9). |
| Null renders as "Not available yet", never 0, never blank | Core value statement | Low | One shared component that takes `string \| null`. A unit test that a null never formats to "0". Applies to `jobsProcessed`, `earned.total`, `earned.history`. |
| Earned history table, empty until SDK-EARNINGS | io.net shows per-job earnings with dates | Med | Build against the mock. Show an explanation line, not an empty table. |
| Scope note: "this account only, not child accounts" | `includeChildren` is ignored in v1 | Low | Otherwise a main sees a low number and assumes it is complete. |
| Refresh on account change and a manual refresh | Earnings lag (io.net pays daily) | Low | Show "last updated" time. |

### Wallet states (cross-cutting)

| State | Trigger | UI | Complexity |
|-------|---------|----|-----------|
| Wallet offline | WalletConnect read timeout (60 s), session closed, `disconnect` | Banner: "GeniusWallet isn't responding. Open the app." plus Retry. Not a spinner | Med |
| SDK not ready | `4900` | "GeniusWallet is starting up". Auto-retry with backoff; do not show an error toast | Low |
| Account switching | `switching: true` or `4901` | Disable estimate and submit, show "Switching account"; resume on `gnus_accountsChanged` | Med |
| Permission not granted | `4100` | "Allow this site in GeniusWallet" with a retry that re-requests | Low |
| Unsupported method / old wallet | `4200` or `window.gnus.version` mismatch | "Update GeniusWallet" | Low |
| Late injection | `window.gnus` absent at load inside the wallet | Wait up to 3 s on a neutral loading state, then fall back to the browser path | Med |

## Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Guided job builder (form that produces the processing-definition) in addition to upload | Lowers the barrier for non-technical users; the current app has a form | High | The schema has `inputs/outputs/passes`, so a general form is large. Recommend a template-driven builder: pick a template (e.g. PoseNet), edit its few fields, see the JSON live. Ship upload first, builder in a later phase. |
| Job templates / example jobs (download or "load example") | Cheap, and teaches the schema | Low | Ship one or two bundled examples. Highest value-per-effort item in this list. |
| Raw JSON editor with schema-aware errors (an editor, not just a file picker) | Covers 80% of what a builder does for developers | Med | Textarea with line-level errors is enough. Avoid adding a heavy editor dependency. |
| Per-job timeline (submitted, burn tx, queued, processing, completed) | Akash's Events tab is the page users rely on when things go wrong | Med | Only the first two steps have data today; render the rest as "not reported yet" rather than hiding them. |
| Persistent "needs attention" surface for paid-but-not-processed jobs | Turns the worst failure into a recoverable one | Low-Med | A count badge in the nav. |
| Explorer link for `burnTxHash` on the Polygon Amoy explorer | Lets users verify payment independently | Low | Opens in the system browser (WebView rule). |
| Copy-as-support-bundle (jobId, burnTxHash, sdkAddress, network, timestamps, error code) | Support loops are the cost of a failed-payment flow | Low | Never includes keys; the wallet never exposes them anyway. |
| Estimate-vs-confirmed cost diff | Builds trust where cost units are still unsettled (U1) | Low | The submit result has the burned amount via the job's `cost`. |
| Draft persistence (job JSON survives reload) | Reload is a named risk; also saves the user's work | Low | Same storage as the idempotency key. |
| Notifications when a job completes (in-page toast only) | Peers push status | Low | Only meaningful after SDK-STATUS; no OS or push notifications in v1. |
| Account-aware earnings for mains (aggregate children) | Real earner need | High | Blocked on SDK-EARNINGS; out of v1 by PROJECT.md. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Dashboard-side payment (`bridgeOut` via Web3Modal) | Splits pay and submit across providers and bypasses the wallet's bridge gate; the origin of the free-compute bug | `gnus_submitJob` only |
| Mounting Web3Modal inside the wallet WebView | It deep-links to other wallets and can pair the wallet with itself | Skip it when `window.gnus` exists |
| Showing `0` for unknown values (cost, jobsProcessed, earned) | Misleading number is explicitly against the core value | "Not available yet" / "Price unavailable" |
| Treating `submitted` as `processing` or `completed`, or showing a progress bar | There is no per-job progress data (SDK-STATUS); a fake bar is a fake number | Show the true state with a note that live status is coming |
| Auto-retry of `gnus_submitJob` on error | A retry can spend again; only an explicit user action with the same idempotency key is safe | User-initiated retry, same key |
| Optimistic "Success" as soon as the call returns a hash (the current behaviour) | Hides `bridgedNotProcessed` | Branch on `status` |
| JS `Number` for any amount, or rescaling cost by 1e18 in the dashboard | Overflows; contradicts U1 | Decimal strings and BigInt formatting only, wallet's decimals |
| Converting or guessing between SDK and EVM addresses; using the EVM address as the "my jobs" key | Cannot be derived; key must be `sdkAddress` | Show EVM as a label only |
| Silent fallback to a hosted/custodial node for MetaMask-only users | Product decision made: no custodial processing | Read-only state with explanation |
| Block/tx/address explorer, analytics gauges, map, "live" tables | Out of v1; today's data is random | Remove from nav; do not keep fake tables |
| Polling the wallet in a tight loop for job status | Wallet already polls and pushes `gnus_jobUpdated`; WalletConnect polling wakes the phone | Subscribe to events, refetch on focus and reconnect, slow poll only as a fallback |
| Showing private keys, mnemonics, or accepting them | Wallet never exposes them | Not applicable by design |
| Two-device account linking UI | No contract support (U3) | Document as out of scope |
| Spinner-only waiting on a wallet request | Peers and the contract both call for explicit offline states | State machine above |
| Toast-only errors for paid-but-not-processed | The user leaves the page and loses the only record | Persistent row and banner |
| Notification/email/push infrastructure | Needs a server; the app is static | In-page only |

## Feature Dependencies

```
Transport detect (window.gnus | WalletConnect)
  -> gnus_getAccounts (two identities, network, switching)
      -> every account-keyed view (jobs, earnings, estimate)

Schema vendoring -> JSON upload validation -> gnus_estimate -> cost display
                                                     -> idempotency key + draft storage -> gnus_submitJob
                                                           -> submit result states (submitted | bridgedNotProcessed | rejected | errors)
                                                                 -> My jobs list (listJobs) -> job detail (getJob)
                                                                       -> live updates (gnus_jobUpdated)

Null-safe display component -> earnings view, job result, cost
Mock window.gnus provider -> everything above is buildable now
```

Dependencies on SDK changes (wallet-side milestone v4.0 builds the methods; these gate real data):

| Feature | Works today with | Waits on | Until then the UI shows |
|---------|------------------|----------|-------------------------|
| Cost estimate and live submit | Contract and mock | SDK-CA (live cost is always 0, so `-32010`) | "Price unavailable"; submit blocked. This is the real state in production today |
| Cost error reasons | `-32010` without reason | SDK-COSTERR | Generic "price unavailable" |
| Job id, detail by `jobId` | Keyed on `burnTxHash` | SDK-JOBID | Burn hash as id; "Job id pending" |
| Live job status (queued/processing/completed/failed) | `submitted`, `bridgedNotProcessed` only | SDK-STATUS | "Submitted to the network"; no progress UI |
| Job result (`cids`, `data`) | `result: null` | SDK-RESULT (and SDK-JOBID) | "Result not available yet" |
| `jobsProcessed`, `earned.total`, `earned.history` | `balance`, `isProcessing` | SDK-EARNINGS | "Not available yet" per field |
| Children aggregated in earnings | Ignored flag | SDK-EARNINGS | Scope note |
| Payout address display | Absent | SDK-PAYOUT | Not shown |
| Smooth UI during estimate | 100-800 ms freeze possible | SDK-ASYNC | Always show a loading state on estimate; do not assume it is instant |

Not an SDK dependency but a wallet-milestone dependency: the whole connect/estimate/submit/list/earnings path needs the wallet's `gnus_*` methods shipped (or the mock). Build and test against the mock first.

## MVP Recommendation

Prioritize, in order:

1. Transport detection, one `request()` client, mock provider, connection state machine (all wallet states above).
2. Two-identity header plus network label, with account-change invalidation.
3. Job input: JSON upload with schema validation and preview, one bundled example.
4. Estimate display including the `-32010` and insufficient-balance states.
5. Submit flow: idempotency key persisted before the call, pending-confirm, rejected, success, paid-but-not-processed with a persistent surface.
6. My jobs list and detail keyed on `sdkAddress`, `burnTxHash` as id fallback, null-safe result block, live updates with refetch fallback.
7. Earnings view with balance, isProcessing, and null-safe "not available yet" fields.

Pick exactly one differentiator for v1: job templates / "load example". It is low cost and directly lowers schema friction. Add the per-job timeline if capacity allows, since it reuses data the job detail already has.

Defer:
- Guided job builder: large (schema is generic), and upload plus examples covers early users. Revisit after the schema stabilises and users ask.
- Children aggregation, payout address, two-device linking: blocked on SDK or contract work.
- Any notification beyond in-page toasts: needs a server or wallet push.
- Explorer: out of scope.

## Open Questions for Requirements

- Which processing-definition schema version does the wallet validate against, and who owns the copy the dashboard vendors? Without it, client-side validation can disagree with `-32602`. Treat the wallet's `-32602` as authoritative and the local schema as a courtesy check. (Ask the wallet milestone.)
- Is "resubmit with the same idempotency key" an acceptable recovery for `bridgedNotProcessed`? The contract says the same key returns the first result, which would not retry Process. If real recovery matters, a wallet method such as `gnus_retryProcess` is needed. Raise as a contract change request. (HIGH that the gap exists, from the contract text.)
- Draft and key storage: `localStorage` is shared across tabs, which helps two-tab safety but means a stale key can outlive its draft. Decide expiry (the wallet window is 24 h).
- Cost units (U1) affect every cost display; the UI must take decimals from the wallet, not hardcode 18.
- Should "my jobs" include jobs submitted from other origins (the wallet's own app)? `listJobs` returns an `origin` field, so the list may mix them. Show origin and do not filter.

## Sources

- `.planning/PROJECT.md`, `.planning/research/gnus-rpc-contract.md`, `.planning/research/wallet-identity.md`, `.planning/codebase/ARCHITECTURE.md` (HIGH, primary for contract, identity, and current-app behaviour)
- [Akash: Using Console with Your Wallet](https://akash.network/docs/developers/deployment/akash-console/with-wallet) (MEDIUM, official docs: wallet requirements, status stages, Logs and Events tabs)
- [Akash: Deployments & Lifecycle](https://akash.network/docs/learn/core-concepts/deployments/) (MEDIUM, official docs)
- [io.net: Earnings & Rewards](https://docs.io.net/docs/earnings-rewards) (MEDIUM, official docs: split of block and job earnings, delayed payment, Job ID search and date filter)
- [io.net: Monitor & Manage Workers](https://docs.io.net/docs/monitor-manage-workers) (MEDIUM, official docs)
- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193) (HIGH for event and error-code semantics)
- [MetaMask Provider API reference](https://docs.metamask.io/metamask-connect/evm/reference/provider-api.md) (MEDIUM, listener and account-change handling)
- Golem, Render Network and Bittensor dashboard behaviour: general knowledge, not re-verified in this run (LOW)
