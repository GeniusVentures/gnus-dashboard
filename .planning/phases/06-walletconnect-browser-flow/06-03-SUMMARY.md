---
phase: 06-walletconnect-browser-flow
plan: 03
status: complete
requirements: [WC-04, WC-07]
actuals:
  tasks: 2
  commits: 2
---

# Phase 6 Plan 3: Timeouts, expiry recovery and events Summary

The page waits honestly over the relay, a submit whose reply is lost ends on its true outcome with one burn, and job, account and network events keep the views live.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 1063112 | Time out WalletConnect requests honestly: page timers, request expiries and an offline error |
| 2 | 0a1a0d8 | Prove a lost submit reply is recovered by key with one burn, and events stay live over the session |

## What exists

- `GnusOfflineError` (code null, kind `walletOffline`, "GeniusWallet is offline.", retry). The machine maps it from any source: a ready session keeps its accounts and shows Wallet offline, a failed connect loses them.
- Transport: reads wait 60 s with request expiry 300; `gnus_submitJob` and a `gnus_getAccounts` that may open the prompt wait 900 s with expiry 900. The prompt flag is set at the start and after any 4001 or 4100, cleared by a getAccounts success. An unapproved method is 4200 and an offline browser is `GnusOfflineError`, both before anything is sent.
- No submit code changed (D-18): the code-null error reaches phase 4's lookup by key. Tests show the lookup finds nothing at 900 s while the wallet's confirm is open, the later "Pay and submit" finds the one burn, and a wallet that stopped after the burn shows "Waiting for GeniusWallet" where Check again only asks.
- The confirm screens add "Open GeniusWallet where you scanned the code." on WalletConnect only.
- Events over the session: row update in place without `gnus_listJobs`, account switch re-reads under the new key, network label, a dropped event recovered on tab return, identity never taken from the session's CAIP-10 account.

## Deviations

- [Rule 1] The fake relay's `zombie` profile dropped every reply, so the lookup by key could not be answered. It now drops only the `gnus_submitJob` reply.
- The plan expected the 900 s lookup to show the pending screen. With a confirm still open the wallet has no record, so the page shows its "no record of this submit" note; the pending screen is tested with `walletStopsMidSubmit`, where the intent exists.
- Late success of a timed-out getAccounts still clears the prompt flag, since the wallet did record the grant.

## Gaps for a human

- None new; the Reown relay's real 5-minute pending expiry and the wallet's 10-minute-plus-60-s hold are wallet-side and wait on wallet phase 47.

## Self-Check: PASSED
