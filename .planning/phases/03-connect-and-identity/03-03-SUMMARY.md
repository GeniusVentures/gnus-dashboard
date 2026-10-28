---
phase: 03-connect-and-identity
plan: 03
status: complete
requirements: [CONN-03, CONN-04, CONN-06, CONN-10]
actuals:
  tasks: 3
  commits: 3
---

# Phase 3 Plan 3: Connect-time states Summary

Every connect-time wallet outcome has a named session phase, one screen with its exact words and at most one action, and a Cypress walk on the production export.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | b5b3423 | Map every connect-time wallet outcome in the session machine, with startup backoff and late injection |
| 2 | 5a9ede2 | One screen per connect-time state, every wallet page gated |
| 3 | b8cb2ab | Walk the connect-time states on the real export with the mock |

## What exists

- `reduce` handles `connectAgain`, `lateInjection`, `connectFailed` and `errorReported(error, source)`. Source `connect` may end in `failed`; `identity` and `query` leave unrelated errors to the feature that asked. Versions compare as whole numbers (wallet above 1 is `pageOld`, anything else `walletOld`). `connectAgain` keeps the cause, so a rate-limited retry stays on the denied screen.
- Store: `connectAgain()`, `tryNow()`, `report(error)`. Startup retries run at 1, 2, 4, 8, 16, then every 30 s with one timer that leaving `startingUp` cancels; they do not flip the screen to connecting. A late injection after `noWallet` attaches a client and connects.
- `WalletGate` holds the D-13 words in one `screenFor` function. Gated: index, submit, jobs, job detail, earnings; 404 is not.
- Tests: machine (10), store recovery (4), WalletGate (jest-axe clean on every screen), pages gate check.

## Deviations

- `accountsReceived` always gives `ready`; switching and the notResponding rows come with 03-05.
- No toast anywhere in connect handling; the existing `ToastContainer` in `_app` is untouched.

## Verification

- `yarn jest --ci`: 21 suites, 403 tests. `yarn -s tsc -p tsconfig.strict.json` clean.
- `connect.cy.js`: 8 passing on the built `out/` (starting up reaches the header in about 7 s).

## Self-Check: PASSED
