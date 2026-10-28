---
phase: 06-walletconnect-browser-flow
plan: 02
status: complete
requirements: [WC-02, WC-03, WC-05, WC-06]
actuals:
  tasks: 2
  commits: 2
---

# Phase 6 Plan 2: Pairing screens and session lifecycle Summary

Every pairing outcome has its own screen and words, a session survives a reload by ping, and it ends cleanly from the page or the wallet.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 394f0b9 | Show the pairing code, handle declined and expired proposals, refuse the wrong wallet |
| 2 | 1e59892 | Restore a stored WalletConnect session with a ping, and disconnect from either side |

## What exists

- `PairPanel.tsx`: an SVG code (`qrcode.react` `QRCodeSVG`, black on a white box so it scans in dark mode), Copy link through `copyText`, a declined state with the wallet's words as a text node cut at 200 characters, and Try again.
- `classifyNamespaces` in `walletconnect.ts`: `ok` needs all six methods, all three events and the Amoy chain; none is "not GeniusWallet", anything between is "Update GeniusWallet". The failing session is ended before the screen shows.
- Store: a proposal that expires gets a new code while visible, or on the next `visibilitychange` when hidden. On start the newest unexpired `ok` session is pinged (10 s page timer), the others are ended. `retry` pings again, `disconnect()` ends the session, `connectAgain` pairs fresh when no session is attached.
- Screens: Wallet offline (Retry, Disconnect), Disconnected (Connect again). The header shows Disconnect on WalletConnect only. `SessionProvider` removes every cached account query on `disconnected`.
- 8 + 8 Jest cases including jest-axe on pairing, declined, both refusals, Wallet offline and Disconnected.

## Deviations

- The restoring wait uses a new `restoreStarted` machine event (the "Looking for GeniusWallet" screen) so Retry shows progress; the plan did not name it.
- A ping that is rejected by the relay (session unknown) is treated as a dead session: it is ended and a fresh code is made, rather than shown as offline.
- axe runs on real timers inside the otherwise fake-timer tests; fake timers hang it.

## Gaps for a human

- Look at pairing, declined, Wallet offline and Disconnected in light and dark once the dev entry exists (plan 04, `?gnusWc=`).

## Self-Check: PASSED
