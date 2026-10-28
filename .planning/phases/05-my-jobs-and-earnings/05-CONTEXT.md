# Phase 5: My jobs and earnings - Context

**Gathered:** 2026-10-28 (autonomous on Braian's instruction; every decision is (D), not yet reviewed by Braian)
**Status:** Ready for planning

<domain>
## Phase Boundary

The read side of the dashboard: My jobs (list, detail, search, live updates) and Earnings for the node
account, built null-first. Today SDK-JOBID, SDK-STATUS, SDK-RESULT and SDK-EARNINGS leave `jobId`,
live states, `result`, `jobsProcessed` and `earned.*` null; the UI is designed for that state and fills
in when the wallet sends data (the `populated` mock profiles prove it). DISP-02 (every external link
through `ExternalLink`, enforced by lint) lands here. Phase 4 (submit) is planned in parallel and owns
the submit flow, the idempotency key, `pending` recovery by `idempotencyKey` and its mock changes.

</domain>

<contract_reads>
## What this phase reads (contract snapshot of 2026-10-28, unchanged)

- `gnus_listJobs({ limit?, cursor? })` gives `{ jobs, nextCursor }`, newest first, only the current
  node account's jobs. `Job.status` is one of `JOB_STATUSES`; an unseen string already parses to `unknown`.
- `gnus_getJob` by exactly one of `jobId`, `burnTxHash`, `idempotencyKey` gives the job plus `result`
  (null until SDK-RESULT) and an optional top-level `error`, or `null` when nothing matches for this account.
- `gnus_getEarnings({})`: `balance` and `processing.isProcessing` are real today; `jobsProcessed`,
  `earned.total` and `earned.history` are null until SDK-EARNINGS. `includeChildren` is ignored in v1.
- `gnus_jobUpdated` carries a full `Job` (no `result`), wallet-polled until the SDK pushes.
- Every amount is base units of `unit.decimals`; display goes through `Amount` (DISP-01), never `Number`.

</contract_reads>

<decisions>
## Implementation Decisions

### Contract layer and mock
- **D-01 (D):** No change to `lib/gnus` contract code (`schema.ts`, `client.ts`, `errors.ts`, transport).
  The mock needs seeded jobs and stored results so every state is reachable: a new
  `lib/gnus/mock/seeds.ts` (imports `./marker` like every mock module), a one-line seed hook and a
  stored-result read in `provider.ts`, and new profiles in `profiles.ts`. No existing profile changes.
- **D-02 (D):** Profiles. `jobHistory` (data today): 25 jobs for the first node account, statuses
  `submitted`, `bridgedNotProcessed`, `unconfirmed` only (all the wallet can say before SDK-STATUS),
  each present on the newest page; `jobId` and `result` null; inserted oldest first; two pages at 20.
  `jobResults` (data populated): one job per live state plus one unseen status string (parses to
  `unknown`); job ids set except on `bridgedNotProcessed` and `unconfirmed`; a completed job with two CIDs
  and a `data` object; a failed job with an `error`; one failed job whose `origin`, `error` and `data`
  carry HTML and script payloads. `readsFail`: the `jobHistory` seeds with `gnus_listJobs`, `gnus_getJob`
  and `gnus_getEarnings` failing `-32603`. Seed hashes use fixed prefixes (`0x5eed`, `0x7e57`) built from
  short patterns, so they never collide with the mock's submit hashes.

### Queries and keys
- **D-03 (D):** The list uses a new `useAccountInfiniteQuery` beside `useAccountQuery`, same key
  `[kind, network, sdkAddress]`, same enabled rule, every read through `store.track`. Kind `"jobs"`;
  `limit: 20` is always sent; `nextCursor` drives "Load more jobs". No `sdkAddress` param: the wallet
  scopes the list, the key scopes the cache. Loaded pages are flattened in wallet order and de-duplicated
  by `burnTxHash` (a job landing between pages shifts an offset cursor). Phase 4 may refresh the list
  after a submit with `invalidateQueries({ queryKey: ["jobs"] })`.
- **D-04 (D):** Keys stay exactly three elements, because `SessionProvider` compares `key.slice(1)` to
  drop other identities. A detail folds its selector into the kind: `job:burnTxHash:<hash>` or `job:jobId:<id>`.
- **D-05 (D):** Data naming a different `sdkAddress` than the current node account is a contract breach:
  a list page with a foreign row, a foreign detail, or foreign earnings throws
  `GnusContractMismatchError(method, accounts.version)` and shows as that feature's error state. A
  `gnus_jobUpdated` for another account is dropped silently (a late event across a switch is normal).
- **D-06 (D):** An account switch clears everything: phase 3's key handling drops the old cache, and each
  view body is keyed by `sdkAddress` so search text and other local state reset. A new account shows the
  empty state, never an old row.

### Status words (JOBS-03)
- **D-07 (D):** One table in `lib/jobs.ts` maps every `JobStatus` to a badge label, a one-line
  explanation, `final` and `marked`. Badges always carry words; colour is never the only signal. Marked
  rows show the explanation under the badge in the list.

| Status | Badge | Explanation | Final | Marked |
|---|---|---|---|---|
| submitted | Submitted to the network | The network has the job. GeniusWallet can't report its progress yet. | no | no |
| queued | Queued | The job is waiting for a node. | no | no |
| processing | Processing | Nodes are working on the job. | no | no |
| completed | Completed | The job finished. | yes | no |
| failed | Failed | The job did not finish. | yes | no |
| bridgedNotProcessed | Paid but not processed | The payment went through, but the network did not start the job. Check it in GeniusWallet. | yes | yes |
| unconfirmed | Payment not confirmed | The payment was sent but not confirmed in time. The GNUS may be spent and the job did not start. Check it in GeniusWallet. | no | yes |
| pending | Outcome not recorded | GeniusWallet recorded this submit but not its outcome. Check it in GeniusWallet. | no | yes |
| unknown | Status unknown | GeniusWallet sent a status this page doesn't know. | no | no |

  No progress bar and no "running" anywhere. Badge variants: success (completed), danger (failed),
  warning (the three marked), info (submitted, queued, processing), secondary (unknown), as
  Bootstrap `text-bg-*` so the text colour is contrast-computed in both schemes.

### List (JOBS-01, JOBS-02)
- **D-08 (D):** Columns Status, Submitted, Cost, From, Job, in `.table-responsive` with a visually hidden
  caption "Your jobs, newest first". Submitted is `<time dateTime={iso}>` shown with
  `Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })`. Cost through `Amount` with
  `unit.decimals` and `unit.symbol` from `gnus_getAccounts`. From is the origin as plain text. Job is the
  short id (`jobId` when 14 characters or fewer, else `shorten` from `AddressChip`; `shorten(burnTxHash)`
  when `jobId` is null), linking to `/jobs/detail?hash=<burnTxHash>` always (stable before and after SDK-JOBID).
- **D-09 (D):** States: "Loading your jobs" with a spinner beside the text; empty: "No jobs yet" / "Jobs
  you submit from this account show up here." plus a "Submit a job" link; error: "Couldn't load your
  jobs", the `GnusError` message (else "GeniusWallet returned an unexpected error.") and Retry. "Load more
  jobs" reads "Loading more jobs" while fetching; afterwards focus moves to the first new row's link and a
  polite status says "Showing {n} jobs". No button when `nextCursor` is null. A failed next page keeps the
  loaded rows and shows its message with Retry.

### Detail (JOBS-04, JOBS-05)
- **D-10 (D):** `/jobs/detail?hash=` or `?id=`, read after `router.isReady` (STATE D5). Exactly one: `hash`
  is `0x` + 64 hex (lowercased), `id` is 1-256 characters; anything else reads "This link doesn't name a
  job." with a link to My jobs. h1 is "Job detail" in every state. `useRouter` is called only inside the
  gated view, so the page shell renders without a router.
- **D-11 (D):** Burn transaction and Node account through `AddressChip` ("Copy burn transaction hash",
  "Copy node account address"); the rest in a `<dl>`: Status (badge and explanation), Job id (else "Job id
  pending" and "The network doesn't return job ids yet."), Submitted from, Submitted, Cost, Submit key
  (`idempotencyKey`). A pending-shaped record shows "Not recorded" for each null field. `null` reads "No job
  found" / "GeniusWallet has no job with this burn hash for this account." (or "job id").
- **D-12 (D):** Result (h2 "Result"): `null` reads "Result not available yet" and "GeniusWallet can't fetch
  job results yet. They show up here when it can." Present: each CID as monospace text plus "Open in IPFS
  gateway" through `ExternalLink` to `https://ipfs.io/ipfs/<cid>` (one constant; Braian to confirm a GNUS
  gateway), only for CIDs matching `^[A-Za-z0-9]+$`, else text only; no CIDs reads "No result files";
  `data` as `JSON.stringify(data, null, 2)` in a scrollable `<pre>`; top-level `error` under h2 "Error" as
  plain text. Wallet text is only ever a React text node.

### Live updates and search (JOBS-06, JOBS-07)
- **D-13 (D):** `useJobUpdates()` subscribes per mounted jobs view through
  `store.getClient().on("gnus_jobUpdated", ...)` and unsubscribes on unmount. A job for the current
  account replaces its row in place and any matching `job:` detail, keeping that detail's `result` and
  `error`; a job not in the cache invalidates `"jobs"`; a move to `completed` or `failed` also invalidates
  the detail so its result and error are read. A payload that fails its schema refetches list and detail.
- **D-14 (D):** Refetch on mount (every return to ready remounts the gated view: Retry, reconnect, switch
  back), on tab focus (`refetchOnWindowFocus: true` per query; the provider default stays off), and every
  30 s while a non-final job is on screen, paused while hidden. Never faster. ponytail: a list reply built
  before an event and delivered after it can show the older status until the next refetch (at most 30 s,
  since that older status is non-final).
- **D-15 (D):** Search field "Search by job id or burn hash" in a `role="search"` form. Typing filters
  loaded rows (case-insensitive substring of `jobId` or `burnTxHash`); none reads "No loaded job matches."
  Submitting: one loaded match opens its detail; else a full burn hash opens `?hash=`, text not starting
  with `0x` opens `?id=`, a partial `0x` string says "Enter the whole burn hash (0x and 64 characters) to
  look it up." No wallet call per keystroke; the exact lookup is the detail page's `gnus_getJob`.

### Earnings (EARN-01..04)
- **D-16 (D):** `/earnings` reads `getEarnings({})` through `useAccountQuery("earnings")`. h1 "Earnings";
  "For the account that earns: {short sdkAddress}"; scope note "These figures cover this account only, not
  its child accounts."; a `<dl>`: "Node account balance (SGNUS)" (Amount with `unit.decimals` and
  `unit.symbol`, plus "Held by the node account on the SuperGenius network, not by the wallet that pays."),
  "Processing" ("This node is processing jobs." / "This node is not processing jobs."), "Jobs processed"
  (Amount, decimals 0), "Earned in total" (Amount). h2 "Earnings history": Date, Amount, Job id as text
  (no link: those are other people's jobs this node processed).
- **D-17 (D):** Null reads "Not available yet" plus one line: "The network doesn't report processed jobs
  per account yet." / "The network doesn't report earnings per account yet." / "Your earnings history
  shows up here once the network reports it." Never 0, never an empty table. `history: []` reads "No
  earnings recorded yet."
- **D-18 (D):** "Last updated {time}" from `dataUpdatedAt` in a polite status region; "Refresh" refetches,
  disabled with a spinner beside it while fetching. Account or network change re-reads through the key;
  tab focus re-reads; no polling. Error: "Couldn't load your earnings", the message, Retry.

### Links (DISP-02)
- **D-19 (D):** `ExternalLink` passes `className` and `aria-label` through and stays the only element with
  `target`. Socials' seven `Link target="_blank"` become `ExternalLink`. `.eslintrc.json`
  `no-restricted-syntax`: any JSX `target` attribute, and an absolute `http(s)://` literal `href` on any
  element but `ExternalLink`, is an error outside `ExternalLink.tsx`. The lint script covers `pages`,
  `sub-components`, `layouts`, `lib`, `data` (`next lint` alone skips most of them; clean on 2026-10-28) and
  CI runs it.

### Parallel work and tests
- **D-20 (D):** Phase 5 leaves `schema.ts`, `client.ts`, `errors.ts`, `SessionProvider`, `WalletGate`,
  `a11y.cy.js`, `mock.test.js` and `__tests__/mocks/session.jsx` alone. Shared with phase 4, each in its own
  hunk: `tsconfig.strict.json` (phase 5 inserts its lines right after `"lib/**/*.ts",`),
  `__tests__/pages/placeholders.test.jsx` (phase 5 deletes only its three rows, once), `profiles.ts` (new
  entries after `bigAmounts`, new interface field after `bigAmounts?`) and `provider.ts`. Whoever merges
  second keeps both sides.
- **D-21 (D):** Jest for `lib/jobs.ts`, the seeds and each view through `renderWithSession` with the real
  mock (jest-axe on each state; `next/router` mocked per file). Cypress on the production `out/` with the
  mock in `onBeforeLoad`: `jobs.cy.js`, `earnings.cy.js`, and `a11y-jobs.cy.js` sweeping every phase 5
  state in light and dark plus a keyboard walk (its two axe helpers copied from `a11y.cy.js`: a second
  copy, not yet worth sharing).
- **D-22 (D):** Source comments carry no plan, phase or decision ids.

### Claude's Discretion
- File split inside `sub-components/jobs/` and `sub-components/earnings/`; badge shades if axe flags one;
  spacing.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/gnus-rpc-contract.md` sections 3 (`gnus_listJobs`, `gnus_getJob`, `gnus_getEarnings`), 4, 7
- `.planning/ROADMAP.md` Phase 5; `.planning/REQUIREMENTS.md` JOBS-01..07, EARN-01..04, DISP-01, DISP-02, "Dependencies"
- `.planning/research/ARCHITECTURE.md` "Jobs" (merge rule, events are hints, detail route); `PITFALLS.md` (CIDs as links)
- `.planning/phases/03-connect-and-identity/03-CONTEXT.md` D-10, D-13, D-14, D-17, D-20; `03-05-SUMMARY.md`

</canonical_refs>

<code_context>
## Existing Code Insights

- `useAccountQuery` is the only reader of account data; `SessionProvider` cancels and removes other identities' keys.
- `WalletGate` unmounts its children outside ready and switching, so a remount is the "reconnect" refetch.
- `Amount` renders null as "Not available yet" (or `unavailable`); `formatAmount` is exact for any size.
- `AddressChip` and `shorten` copy and shorten; `ExternalLink` exists with `target="_blank"`, `rel="noopener noreferrer"`.
- The mock lists `mine()` newest first by insertion, pages by `c<offset>` cursors, and `advanceJob(hash, status)` emits `gnus_jobUpdated`.

</code_context>

<deferred>
## Deferred Ideas

- In-page notice when a job completes (JOBX-06, after SDK-STATUS); live announcements of status changes.
- A retry for paid-but-not-processed (U5, `gnus_retryProcess`); a chain-explorer link for burn hashes.
- Children's earnings; a GNUS-run IPFS gateway.

</deferred>

<gaps>
## Live checks recorded as gaps

Real lists and events wait on wallet v4.0 phase 43; ids, live states, results and earnings wait on
SDK-JOBID, SDK-STATUS, SDK-RESULT and SDK-EARNINGS. Each is a recorded gap at verification, never skipped.

</gaps>
