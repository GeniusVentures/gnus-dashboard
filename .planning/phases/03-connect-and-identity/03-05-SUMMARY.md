---
phase: 03-connect-and-identity
plan: 05
status: complete
requirements: [CONN-05, CONN-07, CONN-08, CONN-09]
actuals:
  tasks: 3
  commits: 4
---

# Phase 3 Plan 5: Runtime wallet states Summary

Account and network switches drop the old account's data, spending is gated while switching or on the wrong SDK network, and a silent, disconnected or unbridged wallet has its own screen.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | aff6b5b | Add react-query 5.105.0 and useAccountQuery keyed by network and account |
| 2 | 68a9b3b | Switching and wrong-SDK-network banners, canEstimate and canSubmit; the EVM chain never blocks |
| 3 | aa03e4b | Not responding for a disconnect, a silent read and a missing bridge; re-read on tab return |
| 3 | 64f0e81 | Walk switching, network, disconnect and revoke on the real export with the mock |

## What exists

- `@tanstack/react-query` 5.105.0 pinned (registry integrity matches `yarn.lock`, frozen install clean). `useAccountQuery(kind, read)` keys on `[kind, network, sdkAddress]`, runs only in `ready` and `switching`, and goes through `store.track`. When the identity changes, queries under another pair are cancelled and removed; the query cache's `onError` calls `store.report`.
- Machine: `networkChanged`, `disconnected`, `noReply`, `replyArrived`, `noBridge`; exports `networkMismatch`, `canEstimate`, `canSubmit`. `accounts.switching` or a `-32015` gives `switching`.
- Store: 15 s hint without abandoning the read (two slow reads need both answers), `getAccounts` re-read when the tab turns visible (one in flight at a time, none while hidden), `disconnect` and `gnus_networkChanged` handlers, `onNotReady` feeds `noBridge`.
- Gate: Switching account and Wrong network banners over the page; three "GeniusWallet isn't responding" screens.

## Deviations

- Revised D-11 applies: `next.config.js` defines only `NEXT_PUBLIC_GNUS_SDK_NETWORK` (default `staging`), there is no chain variable, and `networkMismatch` compares the SDK network only. The wrong-network banner names the SDK networks only. A wallet on BNB Testnet (97) or Sepolia shows no banner; the wallet's `-32013 bridge_unavailable` maps to "Not available on this network" for phase 4 to render.
- `jest.setup.js` copies the `next.config.js` env into `process.env`, so the default lives in one file.

## Verification

- `yarn jest --ci`: 24 suites, 443 tests. `wallet-runtime.cy.js`: 6 passing on the built `out/`.

## Self-Check: PASSED
