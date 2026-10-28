---
phase: 06-walletconnect-browser-flow
plan: 04
status: complete
requirements: [WC-01, WC-07, WC-08]
actuals:
  tasks: 3
  commits: 3
---

# Phase 6 Plan 4: Browser path at its edges Summary

The contract suite passes through the WalletConnect transport, the export keeps WalletConnect out of the wallet, and the dev server shows every pairing screen with `?gnusWc=<profile>`. The real pairing (WC-08) is a recorded gap.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 11a58e3 | Run the whole contract suite through the WalletConnect transport over the fake relay |
| 2 | 0f46296 | Show every WalletConnect screen on the dev server with ?gnusWc, and keep the relay out of the export |
| 3 | 28f0dd8 | Prove on the export that WalletConnect loads on the browser path only |

## What exists

- `factories/walletconnect.js` (`walletconnect-mock`): 53 contract cases pass through the real transport over the relay, none skipped; CI runs the suite twice. Factories now declare `mockBacked` instead of being matched by name.
- Late injection: a wallet injected after the 3 s wait with no session closes the relay socket and takes over; with a session attached nothing switches.
- `?gnusWc=<profile>` (with `?gnusMock=` for the wallet behind it, `?gnusInject=` to test a late wallet); the relay answers by itself after 2 s. The secret gate's planted-import test now plants the relay too (4 imports).
- `walletconnect.cy.js` on `out/`: the no-wallet path fetches the module chunk once; mock at 0 ms, marker plus 500 ms, and a late injection never reach a walletconnect or reown host.

## Deviations

- [Rule 3] D-23 named the chunk holding `relay.walletconnect.org`. The export is built without an id, so `createClient()` returns before importing Reown's client and that chunk is never fetched. The spec watches the module chunk (holds `eip155:80002`) for the positive control and asserts the relay chunk and every Reown host stay unrequested.
- `setWalletConnectLoader` is the store seam D-21 asked for; the relay loader is built in `install.ts`, which only the guarded dev entry requires.

## Gaps for a human (WC-08)

- A real pairing is not done: no Reown project id and no wallet phase 47 build exist. With a debug wallet build and a dev id in `.env.local`, run `yarn dev`, scan the code, approve the session and the connect prompt, open Submit, My jobs, a job detail and Earnings, and confirm the wallet log shows every read method with named params and the approved namespace lists six methods and three events.
- Look at pairing, Wallet offline and Disconnected in light and dark with `?gnusWc=`.

## Self-Check: PASSED
