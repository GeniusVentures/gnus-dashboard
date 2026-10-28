---
phase: 03-05 (connect and identity, submit a job, my jobs and earnings)
reviewed: 2026-10-28T00:00:00Z
depth: deep
files_reviewed: 32
files_reviewed_list:
  - lib/submit/store.ts
  - lib/submit/drafts.ts
  - lib/submit/job.ts
  - lib/submit/outcome.ts
  - lib/session/machine.ts
  - lib/session/store.ts
  - lib/gnus/errors.ts
  - lib/gnus/schema.ts
  - lib/gnus/client.ts
  - lib/gnus/amount.ts
  - lib/gnus/mock/provider.ts
  - lib/jobs.ts
  - lib/explorer.ts
  - lib/copyText.ts
  - sub-components/submit/SubmitFlow.tsx
  - sub-components/submit/JobInput.tsx
  - sub-components/submit/JobPreview.tsx
  - sub-components/submit/EstimatePanel.tsx
  - sub-components/submit/SubmitPanel.tsx
  - sub-components/submit/SubmitResult.tsx
  - sub-components/jobs/JobsView.tsx
  - sub-components/jobs/JobDetailView.tsx
  - sub-components/jobs/useJobUpdates.ts
  - sub-components/earnings/EarningsView.tsx
  - sub-components/wallet/SessionProvider.tsx
  - sub-components/wallet/WalletGate.tsx
  - sub-components/wallet/useAccountQuery.ts
  - sub-components/wallet/IdentityHeader.tsx
  - sub-components/wallet/AddressChip.tsx
  - sub-components/shared/ExternalLink.tsx
  - pages/_app.tsx
  - next.config.js
findings:
  critical: 1
  warning: 8
  info: 11
  total: 20
status: issues_found
fix_status: critical_and_warnings_fixed
fixed_at: 2026-10-28
---

# Phases 3-5: Code Review Report

**Reviewed:** 2026-10-28
**Depth:** deep (commits `15e2ee1..2eab933`, source only)
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The spend path is mostly well built. The key is written before the call and the double-click guard is synchronous. Same text gives the same SHA-256, so it gets the same key. Amounts are BigInt-only and null-safe. Every outcome code has a screen, wallet text renders only as React text, and CIDs and hashes are validated before they become links. The mock cannot reach `out/`: Cypress injects it from the spec side, and `next.config.js` plus `check-secrets.sh --mock-import-test` guard the build.

The defects cluster around the draft lifecycle. `settled` means two things: "the payment ended" and "we don't know what happened". A settled draft is never reused. So after a failed or pending check, the same job gets a fresh key, even though the page promises "the same submit is never paid twice" (CR-01). The recovery picker and the identity reset can also hide or wipe a spent payment (WR-02, WR-03). Some classifications claim more than the contract supports: `4100` is shown as "Nothing was spent" (WR-01), and an unknown status reads as "GeniusWallet paid for this job and sent it to the network" (WR-05).

Not run: `yarn test`, `yarn build` and Cypress/axe. Contrast was not measured by hand; the a11y findings below come from reading the markup.

## Fix status (2026-10-28)

Critical and warning findings are fixed; info findings were out of scope (IN-11 partly fixed in passing).
Gates after the fixes: `tsc -p tsconfig.strict.json` clean, lint clean, build clean, Jest 741/741 (was 717),
Cypress 178/178 (was 173), check-secrets clean, mock-import test passed, audit ok.

| Finding | Status | Commit |
|---|---|---|
| CR-01 | Fixed | a7bd2db |
| WR-01 | Fixed | 4cc9217 |
| WR-02 | Fixed | 7deee99 |
| WR-03 | Fixed | 7deee99 |
| WR-04 | Fixed | 82c97dd |
| WR-05 | Fixed | e7585a8 |
| WR-06 | Fixed, differently from the suggestion | 5d02394 |
| WR-07 | Fixed | 4cc9217 |
| WR-08 | Fixed | 51b7f9a |
| IN-11 | Partly fixed: an identity change clears submitError; the footer year is open | 7deee99 |
| IN-01..IN-10 | Open (info, out of scope) | |

Cypress walks for CR-01, WR-01, WR-02 and WR-03: 9263295.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A failed or pending check settles the draft, so the same job gets a new key and can be paid twice

**File:** `lib/submit/store.ts:258-261, 279-281, 288-291`; `lib/submit/drafts.ts:143-148`; `sub-components/submit/SubmitPanel.tsx:9-10`

**Issue:** `lookup()` sends a failed `gnus_getJob` to `finish(draft, { kind: "unknown" })`. A `pending` record also goes to `finish`. `finish` calls `markSettled`. `findReusable` skips settled drafts, so the next estimate of the same job mints a fresh key. The `notSeen` branch (line 289) never clears `settled`, but it shows "You can submit the same job again: the same submit is never paid twice."

**Scenario:**
1. Pay and submit with key K1. The reply is unclassifiable: a schema mismatch, `-32603` with no reason, or (phase 6) a WalletConnect expiry. The page runs a lookup.
2. The lookup fails, for example with `-32005 rate_limited` or `4900`. The screen says "Couldn't check this payment" and the draft is now `settled: true`.
3. The user reloads. Recovery looks K1 up again. The wallet's confirm is still open, and the intent is written only after approval, so the answer is `null` and the page shows the notSeen promise.
4. The user loads the same job and estimates. `findReusable` skips K1, so the page creates K2.
5. The user approves the first confirm, then clicks Pay and submit. K2 is a new submit, so the wallet opens a second confirm, and approving it is a second burn.

The same thing happens after a `pending` screen if the wallet later drops its intent. Phase 6's 900 s expiry makes step 1 the normal path. No test covers "lookup fails, later lookup answers null".

**Fix:** Settle only on outcomes where the payment's fate is decided (done, paidNotProcessed, unconfirmed, outcomeUnknown). On notSeen, un-settle the draft:
```ts
// lookup()
if (result.kind === "notSeen") {
  const open = deps.storage ? { ...draft, settled: false } : draft;
  if (deps.storage) { writeDraft(deps.storage, open); }
  set({ step: "job", outcome: null, notSeen: true, draft: open });
}
// catch branch and pending: show the screen without markSettled
set({ draft, step: "outcome", outcome: { kind: "unknown", message: error.message }, cancelNote: false });
```
Add a reload test: unknown, then reload, then a `null` lookup, then the same job. It must assert one key and `burnCount() === 1`.

**Status:** Fixed (a7bd2db). A draft is retired only on a definitive answer: done, paid-but-not-processed, a
failed job record, or an error the contract guarantees spent nothing. A failed check, pending, unconfirmed,
`submission_outcome_unknown`, an unclassifiable reply and `4100` keep the key at any age (prune skips them).
notSeen reopens the draft, Submit another job keeps an open draft, and a key that went out before is looked
up by `gnus_getJob({ idempotencyKey })` before it is sent again, which covers the wallet's undefined
behaviour past 24 h. The notSeen line now says what holds: "Submitting the same job again from this browser
reuses this submit's key, and GeniusWallet never pays twice for one key." Tests: the reviewer's reload
scenario, pending plus Submit another job, `submission_outcome_unknown`, an open draft at 30 days.

## Warnings

### WR-01: `4100` on a submit is shown as "Nothing was spent", but the contract says a call in flight at a revoke also gets `4100`

**File:** `lib/submit/outcome.ts:23`
**Issue:** Contract section 6 says `4100` is "an origin outside the allowlist **or a call in flight at the revoke**". After the confirm is approved, the burn may already be signed or sent when the user revokes. `classifyError` treats `4100` as nothing spent and `nothingSpentLine` adds "Nothing was spent." The mock aborts only during the confirm, so the tests never see a revoke after the burn.
**Scenario:** The user approves, then revokes the dashboard in GeniusWallet while the bridge transaction is pending. The page says "Allow this site in GeniusWallet. Nothing was spent." The GNUS is burned.
**Fix:** Take `4100` out of `NOTHING_SPENT_CODES` for `gnus_submitJob` so it falls through to `lookup`. That lookup also gets `4100`, so the page ends on the honest "Couldn't check this payment" screen, and recovery runs after reconnecting. At minimum, drop the "Nothing was spent." line for `4100`.
**Status:** Fixed (4cc9217). `4100` on a submit (or on its lookup) is a `disconnected` outcome: the key is
kept, "This site was disconnected during the payment. Reconnect to see what happened." shows over the wallet
gate, and the key is looked up once the session is back. "Nothing was spent" never shows for it.

### WR-02: Reload recovery picks the newest draft by `createdAt`, so a newer unsent draft hides an older sent one

**File:** `lib/submit/drafts.ts:151-154`; `lib/submit/store.ts:308-311`
**Issue:** `newestFor` sorts every draft of the identity by `createdAt`. Then `recover()` returns early if that one was never sent. A draft that was sent but never resolved, and is older than any later estimate, is never looked up. A reused draft also keeps its first `createdAt`, so a key that was sent again sorts as old.
**Scenario:** The user submits job A. They reload during the confirm and get notSeen, then approve A in the wallet. Then they estimate job B without paying and reload. Recovery picks B, finds it unsent and stops. A's burn is never shown.
**Fix:** Recover the newest **sent** draft, sorted by `sentAt`. Unsent drafts never need recovery:
```ts
const found = listDrafts(storage).filter((d) => sameIdentity(d, identity) && (d.sentAt !== null || d.settled));
return found.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null;
```
**Status:** Fixed (7deee99). `newestSent` picks the identity's most recently sent draft by `sentAt`, which
each send updates, so a re-sent key ranks as new.

### WR-03: A payer or EVM-chain change wipes the "Paid but not processed" screen, and nothing restores it

**File:** `lib/submit/store.ts:103-106, 156-163, 302-306`
**Issue:** `identityOf` includes the network and `payer.evmAddress`. Any change to them resets an outcome screen to `INITIAL`. Recovery runs once per `{sdkAddress, sdkNetwork}`, which is already in `recovered`, so the screen does not come back until a full reload. The plan says the paidNotProcessed alert "stays until the user leaves it".
**Scenario:** The page shows "Paid but not processed" with the burn hash. The user opens GeniusWallet to look and switches the paying wallet, or the EVM chain flips and fires `gnus_networkChanged`. The page now shows an empty job form. The burn hash and the explorer link are gone.
**Fix:** Reset the outcome screen only when the node account or SDK network changes (the draft's identity), not on payer or chain changes. Or keep spent outcomes (paidNotProcessed, unconfirmed, outcomeUnknown, pending, unknown) until "Submit another job".
**Status:** Fixed (7deee99). A payer or chain change drops only an estimate; outcome screens and checks in
progress stay. A node account or SDK network change still clears the screen, and switching back runs that
account's recovery again.

### WR-04: A late `gnus_getAccounts` reply can overwrite a newer `gnus_accountsChanged`

**File:** `lib/session/store.ts:108-127, 131-135, 151-155`
**Issue:** `readAccounts("identity")` runs on every tab return and always dispatches `accountsReceived` with its reply. If the wallet switches accounts while that read is in flight, the event delivers account B first. Then the reply, computed before the switch, puts account A back.
**Scenario:** The user comes back to the tab just as the wallet switches the node account. The header shows A. The query keys say A, but `gnus_listJobs` and `gnus_getEarnings` answer for B, so the foreign-row guards throw "Wallet contract mismatch". A submit draft is tagged with A's identity while the wallet pays as B. This lasts until the next event or tab return.
**Fix:** Stamp each read. Drop a reply if an `accountsChanged` event arrived after the read began:
```ts
let eventSeq = 0;
// in the accountsChanged handler: eventSeq += 1
const startedAt = eventSeq;
read.then((a) => { if (eventSeq === startedAt) dispatch({ type: "accountsReceived", accounts: a }); });
```
**Status:** Fixed (82c97dd). `gnus_accountsChanged` and `gnus_networkChanged` both count; a stale reply is
dropped unless the session holds no accounts (a connect still completes).

### WR-05: A looked-up job with an unknown or failed status is reported as "Job submitted, GeniusWallet paid for this job and sent it to the network"

**File:** `lib/submit/outcome.ts:74-82`; `sub-components/submit/SubmitResult.tsx:21-22`
**Issue:** The `default` branch of `classifyLookup` maps every non-pending status with a hash to `done`. That includes `unknown` (any status string the page doesn't know), `failed`, `queued` and `processing`. The done body asserts facts the record does not support.
**Scenario:** After a reload, the wallet answers a status this build doesn't know, perhaps a future `refunded` or `reverted`. The page says "Job submitted. GeniusWallet paid for this job and sent it to the network."
**Fix:** Map only `submitted`, `queued`, `processing` and `completed` to `done`. Send `failed` and `unknown` to a neutral screen ("GeniusWallet recorded this payment. Open the job to see its status.") with "View this job".
**Status:** Fixed (e7585a8). New `recorded` outcome, heading "Payment recorded". `failed` retires the key;
`unknown` keeps it.

### WR-06: Reusing a sent key overwrites `chainId` and `sentAt`, so the explorer link can name the wrong chain and the draft can outlive the wallet's 24 h window

**File:** `lib/submit/drafts.ts:107-110`; `lib/submit/store.ts:355-356`
**Issue:** `markSent` always writes the current `evmChainId` and `now`. The draft identity ignores the payer and the chain, so a key sent on chain 80002 can be sent again on chain 137. The wallet then replays the first result, whose burn is on 80002, but the page builds the polygonscan.com mainnet link. Resetting `sentAt` also pushes the 23 h TTL past the wallet's 24 h replay window, and the contract does not define a same-key submit after that window when a job record exists.
**Scenario:** After notSeen the user switches the EVM chain and submits the same job. The wallet replays the earlier burn. "View the payment on the block explorer" opens a chain where the transaction does not exist, so the user concludes nothing was paid.
**Fix:** Keep the first send's values: `{ ...draft, sentAt: draft.sentAt ?? now, chainId: draft.sentAt === null ? chainId : draft.chainId }`.
**Status:** Fixed differently (5d02394). Keeping the first chain is wrong when the first send burned nothing
(a rejected confirm) and the second burned on the new chain. A key keeps its chain while every send is on
it; once a send is on another chain it gets none, so the burn shows without an explorer link rather than
with a wrong one. `sentAt` still moves to the last send: open drafts are no longer pruned, so the TTL
concern is gone, and recovery ranks by it.

### WR-07: After a disconnect and a successful Retry, an open submit stays on "Confirm in your wallet" for good

**File:** `lib/submit/store.ts:156-169, 302-306`; `lib/session/machine.ts:111-112`
**Issue:** `disconnected` clears `accounts`, and `onSession` ignores the move to no identity. When Retry reconnects the same identity, `recover()` returns because the identity is already in `recovered`. If the wallet restarted, the original `submitJob` promise never settles, so `step` stays `"confirm"` with no lookup. This is the `walletStopsMidSubmit` case without a page reload.
**Fix:** When the session comes back to `ready` after `disconnected` and `step === "confirm"`, run `lookup(state.draft)`. Or clear `recovered` for that identity when the session disconnects.
**Status:** Fixed (4cc9217). After any loss of accounts, the return to ready looks the key up when the page
was on the confirm, a check, or a disconnected outcome. The abandoned call no longer blocks a new submit; if
it still answers for the same key, that answer is shown.

### WR-08: Each outcome screen is one live region that holds its buttons, and its heading is also focused

**File:** `sub-components/submit/SubmitResult.tsx:108-121`; `sub-components/submit/SubmitPanel.tsx:18`
**Issue:** The whole `<section>` is `role="alert"` (paidNotProcessed) or `role="status"`, buttons and links included. The h2 also takes focus. Screen readers announce the heading twice and read the button labels as part of the message. `role="alert"` re-announces on every content change, such as the AddressChip "Copied" text.
**Fix:** Put the live role on the body `<p>` only, or drop it and rely on the heading focus. Keep buttons outside any live region.
**Status:** Fixed (51b7f9a). The role sits on the body text of each outcome and of the confirm screen; the
cancel note has its own status region.

## Info

### IN-01: Hardcoded `decimals: 18` fallback
**File:** `sub-components/submit/SubmitResult.tsx:115`. The contract says `unit.decimals` must be read and never hardcoded. The fallback can't be reached today, because WalletGate renders only with accounts, but it would mis-scale every amount if it ever ran. Render nothing, or "Amount not available", when `unit` is missing.

### IN-02: BigInt outside `amount.ts`
**File:** `lib/gnus/client.ts:86` (from phase 2). This contradicts the comment at `amount.ts:30`. Use `!/[1-9]/.test(estimate.cost)` or add an `isZero()` to `amount.ts`.

### IN-03: Job numbers beyond 2^53 are silently rounded
**File:** `lib/submit/job.ts:48`. Large integers are rounded, and `1e400` is sent as `null`. The preview shows the rewritten value, so it is truthful, but no message points it out. Compare `parsed.sent` with the normalised input and warn when the numbers differ.

### IN-04: Unit label disagrees with the amount
**File:** `sub-components/earnings/EarningsView.tsx:67-69`. The row "Node account balance (SGNUS)" renders "… GNUS" (`unit.symbol`). Drop "(SGNUS)" or say why the symbol differs.

### IN-05: Failed refreshes are invisible once rows have loaded
**File:** `sub-components/jobs/JobsView.tsx:88`. A failed 30 s poll or focus refetch shows nothing, so old statuses look current. Show "Couldn't refresh" with the last-updated time, as Earnings does.

### IN-06: Search jumps to a single substring match
**File:** `sub-components/jobs/JobsView.tsx:121`. Searching "a" jumps to the only job whose hash contains "a". Navigate only on an exact id or hash.

### IN-07: `ExternalLink` accepts any URL scheme, and the lint rule only sees literal hrefs
**File:** `sub-components/shared/ExternalLink.tsx:9-10`; `.eslintrc.json`. `<a href={url} target=…>` with an expression slips past the `href` selector. Today's callers are safe. Have ExternalLink return plain text for any `href` that is not `https:`.

### IN-08: `lib/jobs.ts` imports from a React component
**File:** `lib/jobs.ts:2`. It imports `shorten` from `sub-components/wallet/AddressChip`, so lib depends on the UI layer. Move `shorten` into `lib/`.

### IN-09: Dead branches, and one that would mislead
**Files:** `lib/gnus/errors.ts:218`, `sub-components/jobs/JobsView.tsx:100`, `sub-components/wallet/IdentityHeader.tsx:19`. `GnusError.action` is never read. In JobsView, `jobs.length === 0 || !unit` would say "No jobs yet" while jobs exist: an unknown shown as empty. IdentityHeader renders "Paying from No paying wallet".

### IN-10: An out-of-order event can move a status backwards
**File:** `sub-components/jobs/useJobUpdates.ts:32-40`. A late `gnus_jobUpdated` can take a job from `completed` back to `processing`. Ignore a non-final status for a job the cache already holds as final.

### IN-11: Two smaller lifecycle leaks
**Files:** `lib/submit/store.ts:164-165`, `layouts/footers/Footer.tsx:8`. An identity change keeps the old account's `submitError` on screen. The footer year is fixed at export time, so in a new year it differs from the browser's date and React logs a hydration mismatch.
**Status:** Partly fixed (7deee99): the submitError is cleared on an identity change. The footer year is open.

---

_Reviewed: 2026-10-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
