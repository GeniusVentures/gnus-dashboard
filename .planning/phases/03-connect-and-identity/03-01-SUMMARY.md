---
phase: 03-connect-and-identity
plan: 01
status: complete
requirements: [CONN-02, CONN-03, CONN-10]
actuals:
  tasks: 2
  commits: 2
---

# Phase 3 Plan 1: Session tracer Summary

One path from the injected mock wallet through detection, the client and a session store to the identity header and a gated home page.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | 3180357 | Connect to the wallet, show both identities and the network, gate the home page |
| 2 | 9347a19 | Test the session store: one connect call, no timeout, identity events |

## What exists

- `lib/session/machine.ts`: `Phase`, `Cause`, `SessionState` and a pure `reduce` (detected, connectStarted, accountsReceived, connectFailed). Other events land in 03-03 and 03-05.
- `lib/session/store.ts`: `createSessionStore(env)` and `getSessionStore(win)`. `start()` is idempotent, the connect call has no timeout, `gnus_accountsChanged` replaces the accounts, `retry()` re-runs the connect call. Nothing runs at import, and the provider never disposes the store, so StrictMode's second mount sends no second call.
- `SessionProvider` (useSyncExternalStore with an initial-state server snapshot, `useSession`), `WalletGate` (detecting, connecting, noWallet, failed), `IdentityHeader`, `ExternalLink`.
- `__tests__/mocks/session.jsx`: `renderWithSession`, `makeStore`, `makeEnv`.
- Cypress `connect.cy.js` (mock identities and network; no wallet shows GeniusWallet required with the gnus.ai link and no submit control); `static-shell.cy.js` installs the mock for every route.

## Deviations

- The header sits in a `pt-8` wrapper under the fixed navbar as a stopgap; 03-04 replaces the navbar and layout.
- Only `pages/index.tsx` is gated here; the other four pages follow in 03-03, as planned.

## Verification

- `yarn jest --ci`: 19 suites, 360 tests. `yarn -s tsc -p tsconfig.strict.json` clean. `yarn -s build` clean.
- `connect.cy.js` and `static-shell.cy.js`: 8 passing against the production `out/`.

## Self-Check: PASSED
