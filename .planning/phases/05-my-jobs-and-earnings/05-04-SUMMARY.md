---
phase: 05-my-jobs-and-earnings
plan: 04
status: complete
requirements: [EARN-01, EARN-02, EARN-03, EARN-04]
actuals:
  tasks: 2
  commits: 2
---

# Phase 5 Plan 4: Earnings Summary

`/earnings` shows the node account's balance and processing state, "Not available yet" for everything the SDK cannot report, a scope note, the last-updated time and a working Refresh.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 11173e3 | Earnings: the node account's balance and processing from the wallet, every null as Not available yet |
| 2 | 648bdc3 | Earnings: every field state, last updated, Refresh and the account switch |

## What exists

- `EarningsView` reads `getEarnings({})` through `useAccountQuery("earnings")` with refetch on tab focus; includeChildren is never sent. The body is keyed by the node address, so a switch re-reads and shows the new short address.
- Balance, jobs processed (decimals 0), earned in total and history rows go through `Amount`; a null reads "Not available yet" plus its one line, never 0 or an empty table; `history: []` reads "No earnings recorded yet."; the history job id is text.
- "Last updated" in a polite status; Refresh is disabled with a spinner while fetching; an answer for another account is the contract mismatch.
- The unused `Placeholder` component is deleted: no page uses it any more.

## Deviations

- The plan's bigAmounts balance (`0.000000009007199254740993`) is a typo; 9007199254740993 base units at 18 decimals is `0.009007199254740993 GNUS`, which is what is asserted.

## Gaps for a human

- `jobsProcessed`, `earned.total` and `earned.history` are null on a real wallet until SDK-EARNINGS. Look at the page in light and dark.

## Self-Check: PASSED
