# Phase 4: Submit a job - Context

**Gathered:** 2026-10-28 (autonomous on Braian's instruction; every decision is (D), not yet reviewed by Braian)
**Status:** Ready for planning

<domain>
## Phase Boundary

The `/submit` page: load, file-pick or paste a processing-definition job, see a preview and an estimate in
the wallet's units, pay and submit through one wallet confirm, and always see what happened to the
payment, also after a reload. Injected transport and the mock only. My jobs, job detail and earnings are
phase 5 (the result links to `/jobs/detail?hash=`, which phase 5 builds). WalletConnect wording and the
900 s expiry recovery are phase 6. The keyboard-only walk of the submit flow is phase 7 (VER-06); this
phase runs axe in light and dark.

</domain>

<contract_reads>
## Contract facts this phase builds on

- Ken's architecture notes (PROJECT.md): the wallet owns all signing; burn then Process is sequential, not
  atomic, so `bridgedNotProcessed` is a real outcome. The page never signs, never calls `bridgeOut`, and
  never calls `gnus_submitJob` without a user click.
- Read from the wallet's handler (`lib/gnus_bridge/gnus_rpc_handler.dart`, v4.0 branch): the submit intent
  is written after the confirm is approved, before the burn. So during the confirm `gnus_getJob` by key
  answers null, and a same-key submit is `-32005 submit_in_flight`. The wallet caps the key at 128 chars.
- A rejected confirm (`4001`) records nothing, so a same-key retry opens a new confirm.

</contract_reads>

<decisions>
## Implementation Decisions

### Scope and shared files
- **D-01 (D):** `lib/gnus` edits are limited to: `amount.ts` gains one integer comparison (BigInt stays
  in that file, RPC-04); `mock/provider.ts` and `mock/profiles.ts` gain the confirm control, submit intents
  and a stop-mid-submit profile (03 D-03 handed crash simulation to phase 4). `client.ts`, `schema.ts` and
  `errors.ts` are untouched; their copy is used as is.
- **D-02 (D):** Shared with phase 5, each in its own hunk: `tsconfig.strict.json` (phase 4 appends at the
  end of `include`; phase 5 inserts after `"lib/**/*.ts",`), `__tests__/pages/placeholders.test.jsx` (phase 4
  deletes only the submit row), `profiles.ts` (phase 4 appends profiles after `malformedMissingField` and
  interface fields after `malformed?`), `provider.ts` (phase 4's `getJob` change sits inside the no-record
  branch only). Whoever merges second keeps both sides.

### Job input
- **D-03 (D):** One textarea labelled "Job JSON" holds the job text. "Load example" fills it; "Choose a
  file" (`accept=".json,application/json"`) reads the file in the page with `File.text()` into it; pasting
  is typing into it. Nothing is uploaded anywhere.
- **D-04 (D):** The example is SuperGenius's posenet processing job, copied from the spike's
  `posenet-job.json` into `data/jobs/posenet-example.json` and imported as a module, so it ships inside the
  bundle and no test file is served from the allowlisted origin.
- **D-05 (D):** Cap 5 MiB (5,242,880 bytes, the wallet's own limit). A larger file is refused by `size`
  before it is read: "This file is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB." Pasted text over
  the cap by UTF-8 length: "This job is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB."
- **D-06 (D):** Shape check only (no local schema copy). Empty: no message, Estimate disabled. Not JSON:
  "This is not valid JSON." Not an object: "The job must be a JSON object." Missing keys: "The job needs
  inputs, outputs and passes at the top level. Missing: {names}." Deeper errors are the wallet's `-32602`:
  errors.ts's message plus the wallet's own message as plain text.
- **D-07 (D):** "What will be sent": a read-only `<pre>` of the parsed object, two-space indented, shown
  only while the job parses. Estimate and submit send exactly that object.

### Estimate
- **D-08 (D):** "Estimate cost" button, enabled with `canEstimate` (03 D-12), a parsing job and nothing in
  flight; one estimate at a time; "Asking GeniusWallet for the price..." with a spinner beside it. Never on
  typing or load. Estimates go through `session.track` (the 15 s hint).
- **D-09 (D):** Rows: "Cost" `Amount(cost, unit.decimals, unit.symbol)`; "Paying wallet balance" (null reads
  "Balance not available" and does not block: the wallet fails closed); "Network fee rate"
  `{gasPriceGwei} gwei ({symbol})` or "Gas not estimated", never added to the cost. Note: "GeniusWallet shows
  the final amount when you confirm." `unit` comes from `gnus_getAccounts`.
- **D-10 (D):** Blocks submit: `-32010` "Price unavailable", "GeniusWallet couldn't get a price for this
  job.", plus "Reason: {data.reason}" when sent; cost above balance (amount.ts) "Not enough GNUS", "This job
  costs {cost}. The paying wallet holds {balance}."; `-32013 bridge_unavailable` with errors.ts's message.
  Any other estimate error shows errors.ts's message; the button stays the retry.
- **D-11 (D):** An estimate belongs to one job text and one identity (network, node account, paying
  wallet). Editing the text drops it and shows "The job changed. Estimate again before you submit."; an
  identity change drops it; a late reply for an old text or identity is ignored.

### Idempotency key
- **D-12 (D, revised by Braian 2026-10-28):** The review step is a successful estimate. There the page hashes
  the job (D-13) and reuses the unsettled draft with the same identity (node account and SDK network) and the
  same `jobHash`, else makes a key with `crypto.randomUUID()` (v4 from `getRandomValues` where it is missing,
  as on a plain-http dev host) and writes the draft at once. Submit stays disabled until that write
  succeeded; a failed write shows "This browser couldn't save the submit, so a reload could lose track of the
  payment. Free some site storage, then estimate again." Without `crypto.subtle` (a plain-http host that is
  not localhost) no hash can be made, so the same message variant "This browser can't hash the job" blocks
  submit rather than falling back to the job text.
- **D-13 (D, revised by Braian 2026-10-28):** The key binds to a SHA-256 of the canonical job JSON (SUB-01),
  not to the stored job text. Canonical means the exact string sent: `JSON.stringify` of the parsed object
  (whitespace normalised, key order kept), so equal hash means equal bytes to the wallet. The hash is
  lowercase hex from WebCrypto `crypto.subtle.digest("SHA-256", utf8)`. Jobs run to 5 MiB and localStorage
  holds about 5 MB per origin, so the entry never holds the job body: one entry per job draft,
  `gnus.submit.<key>` = `{ v: 1, idempotencyKey, sdkAddress, sdkNetwork, jobHash, label, createdAt, sentAt,
  chainId, settled }`, `label` being a short caption (the job's name or "Job", at most 40 characters). Read
  through zod; a bad entry is removed. "Same job" is equal `jobHash`. Lifecycle: `sentAt` and `chainId` (the
  reported `evmChainId`) are written before `gnus_submitJob`, and no call goes out if that write fails;
  `settled` on any outcome where the payment went or its fate is unknown; unchanged on a nothing-spent
  error; removed on `idempotency_key_reused`, on "Submit another job", and, if never sent, when the job is
  edited away from its hash; removed at page start when older than 23 h (from `sentAt`, else `createdAt`).
  A reload cannot restore the job text (the page never stored it); the user loads the same job again and the
  hash finds the same key.
- **D-14 (D):** "Pay and submit", enabled with `canSubmit`, a fresh unblocked estimate, a saved draft and
  nothing in flight; a guard set before any await drops a second click. Never retried by the page. When
  `payer.canSign` is false the button explains with errors.ts's `-32012` message (`no_wallet` when the payer
  address is null).
- **D-15 (D):** While the call is open: h2 "Confirm in your wallet", "GeniusWallet shows the cost, the
  paying wallet and the account that runs the job. Approve or reject it there." No timeout. "Cancel"
  reveals "This page can't close GeniusWallet's confirm. Reject it in GeniusWallet to cancel; until then
  this page waits for its answer." The page keeps waiting.
- **D-16 (D):** One pure classifier, `lib/submit/outcome.ts`. Result `submitted` is done; `bridgedNotProcessed`
  or `-32014` is paidNotProcessed (hash from either shape); `unconfirmed` is unconfirmed; `-32603
  submission_outcome_unknown` is outcomeUnknown. Nothing spent, back to the job with the same key: `4001`,
  `4100`, `4200`, `4900`, `-32005` (every reason), `-32010`, `-32011`, `-32012`, `-32013`, `-32015`, `-32602`,
  `-32603` with `balance_unavailable`, `checking` or `missing_data`. Anything else (contract mismatch, an
  unknown or missing code, `-32603` with no listed reason) is an unknown fate: look it up by key (D-20)
  before showing anything. A looked-up record maps by status: `bridgedNotProcessed`, `unconfirmed` and
  `pending` to their screens, any other status to done, null to notSeen.
- **D-17 (D):** Outcome screens, each an h2 that takes focus, then its body:

| Outcome | Heading | Body | Shows | Actions |
|---|---|---|---|---|
| done | Job submitted | GeniusWallet paid for this job and sent it to the network. | job id or "Job id pending"; burn hash | View this job; Submit another job |
| paidNotProcessed | Paid but not processed | Your payment went through, but the network did not start the job. GeniusWallet keeps the payment record; open GeniusWallet to see it. Submitting this job again would pay again. | burn hash | View this job; Submit another job |
| unconfirmed | Payment not confirmed | GeniusWallet sent the payment, but the network had not confirmed it when GeniusWallet stopped waiting. The GNUS may be spent and the job did not start. Check the payment on the block explorer or in GeniusWallet before you submit again. | burn hash | View this job; Submit another job |
| outcomeUnknown | Payment status unknown | errors.ts's message | burn hash, cost, paying wallet, start time, each only when not null | Submit another job |
| pending | Waiting for GeniusWallet | GeniusWallet started this payment and hasn't recorded how it ended. If it is still working on it, check again in a moment. Check it in GeniusWallet before you submit again. | burn hash when set | Check again; Submit another job |
| unknown | Couldn't check this payment | GeniusWallet didn't answer the check: {message}. Check it in GeniusWallet before you submit again. | none | Check again; Submit another job |
| checking | Checking your last submit | Asking GeniusWallet what happened to it. | spinner beside the text | none |

  paidNotProcessed is a `role="alert"` banner that stays until the user leaves it (no toast, no retry);
  the others are `role="status"`. "View this job" links `/jobs/detail?hash={burnTxHash}`.
- **D-18 (D):** Back at the job after a nothing-spent error: errors.ts's message, then "Nothing was spent."
  unless the message already says so (`-32013` fallback, `-32015 account_changed`); never for `-32005`. For
  `-32011` the D-10 amounts from the last estimate follow. `idempotency_key_reused` adds "Start a new
  submit", which makes and saves a fresh key. Only `4100` and `4900` are also reported to the session; a
  submit's `4001` or `-32005` must not move the session (03 D-08).
- **D-19 (D):** Burn hash: `AddressChip` with label "Burn transaction" and copy name "Copy burn
  transaction hash" (phase 5 uses the same words), plus "View the payment on the block explorer" through
  `ExternalLink`. `lib/explorer.ts` maps chain id to a tx URL prefix, the six the wallet links in
  `transaction_utils.dart` (1, 11155111, 137, 80002, 56, 97). The chain is the one stored on the draft at
  send; an unknown or null chain shows no link. This pulls part of v2 JOBX-03 into v1 at Braian's request (accepted 2026-10-28; ROADMAP and REQUIREMENTS updated).
- **D-20 (D, revised):** Recovery runs once per identity per page load (StrictMode safe): the newest draft for
  the identity is restored. Never sent: nothing to show (the page holds no job text); the draft stays for
  reuse by hash. Sent or settled: checking, then `gnus_getJob({ idempotencyKey })` (a tracked read) gives the
  outcome screen; notSeen puts the form back with the same key kept and "GeniusWallet has no record of this
  submit. If its confirm is still open, answer it there. To submit again, load the same job: the same submit
  is never paid twice."; a failed lookup is unknown. pending and unknown re-check only on "Check again": no
  timer, no polling.

### Architecture and tests
- **D-21 (D):** `lib/submit/store.ts` is framework-free, one per session store (a WeakMap keyed by it), so a
  gate screen that unmounts the page never loses an open submit. React reads it through
  `useSyncExternalStore` in `sub-components/submit/useSubmit.ts`. Storage, clock, key maker and digest are injected:
  Jest's global `localStorage` and `randomUUID` are stubs, so tests pass a Map-backed storage and a digest (Node's webcrypto). Actions:
  `setText`, `loadExample`, `estimate`, `submit`, `showCancelNote`, `checkAgain`, `newKey`, `startOver`.
  Components: `SubmitFlow`, `JobInput`, `JobPreview`, `EstimatePanel`, `SubmitPanel`, `SubmitResult`.
- **D-22 (D):** Text from the wallet or the job renders as React text only. Only mode-aware Bootstrap
  utilities (03 D-17). Error lines are `role="alert"`.
- **D-23 (D):** Jest for each `lib/submit` module, `lib/explorer.ts`, the amount comparison and the store
  against the real mock; a reload is a new store over the same storage and a `reinject()`ed facade of the
  same mock. Cypress on `out/`, one spec per plan so parallel plans never share one: `submit.cy.js`,
  `submit-input.cy.js`, `submit-estimate.cy.js`, `submit-outcomes.cy.js`, `submit-reload.cy.js`,
  `a11y-submit.cy.js` (axe in light and dark, helpers copied from `a11y.cy.js`, which stays untouched). A
  Cypress reload keeps one mock in the spec: every `window:before:load` injects `controls.reinject()` and
  fires `gnus#initialized`, so burns and replays survive the reload as in the wallet.
- **D-24 (D):** Mock: profile `manualConfirm` waits for `controls.answerConfirm(approve)`;
  `controls.confirmCount()` counts confirms opened. Intents are written after an approved confirm, get the
  burn hash at the burn, and resolve when the record is written. `getJob` by key answers the pending shape
  for an unresolved intent; a same-key submit with one answers `-32603 submission_outcome_unknown` with its
  fields (`idempotency_key_reused` for another body). Profile `walletStopsMidSubmit`: after the confirm the
  intent gets a hash, one burn counts, the call never answers and the in-flight slot is freed, as after a
  restart. `submissionOutcomeUnknown` also leaves an unresolved intent.
- **D-25 (D):** Source comments carry no plan, phase or decision ids.

### Claude's Discretion
- The store's internal state shape; markup and layout inside `sub-components/submit/`; test helper names.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/gnus-rpc-contract.md` sections 3 (`gnus_estimate`, `gnus_submitJob`, `gnus_getJob`), 5
- `.planning/REQUIREMENTS.md` DEF-01..05, EST-01..05, SUB-01..08; `.planning/ROADMAP.md` Phase 4
- `.planning/research/PITFALLS.md` 3, 4, 6, 14, 15; `ARCHITECTURE.md` "OrderForm decomposition"
- `.planning/phases/03-connect-and-identity/03-CONTEXT.md` D-03, D-08, D-12, D-17, D-21
- `.planning/phases/05-my-jobs-and-earnings/05-CONTEXT.md` D-11, D-19, D-20 (shared files, copy names)

</canonical_refs>

<code_context>
## Existing Code Insights

- `canEstimate`, `canSubmit`, `networkMismatch` are exported from `lib/session/machine.ts`.
- `store.report()` maps `4001`, `4100` to denied and `confirm_open` to connecting: only `4100` and `4900` from
  a submit may go there.
- `GnusError` carries `reason`, `burnTxHash`, `outcome` and `wireMessage`; `formatAmount` and `Amount`
  already take `unit.decimals`; `AddressChip` copies with a fallback; `ExternalLink` exists.
- The mock's `today` profile confirms at once and burns `0x00..01`; `reinject()` keeps its state.

</code_context>

<deferred>
## Deferred Ideas

- A BroadcastChannel or Web Locks guard across tabs (the wallet's `-32005` is the guard); a retry for
  paid-but-not-processed (U5); draft persistence before the review step (BUILD-03); a job builder.
- The WalletConnect line on the confirm screen ("open GeniusWallet on your phone") lands with phase 6's
  transport; the keyboard-only submit walk is phase 7.

</deferred>
