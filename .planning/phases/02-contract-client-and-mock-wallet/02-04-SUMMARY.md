---
phase: 02-contract-client-and-mock-wallet
plan: 04
status: complete
requirements: [CONN-01, RPC-01, RPC-06]
---

# Phase 2 Plan 4: Detection rules and re-injection-safe injected transport Summary

`detectTransport` now follows the contract's rules (user-agent marker, 3 s wait, one locked choice, one allowed late-injection switch), the injected transport moves its listeners to a re-injected provider exactly once, and the mock injects at 0, N ms or twice from options or a query string.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Detection + mock timings | 57c7a40 | feat(02): transport detection with UA marker, lock and late injection; mock injection timings (CONN-01) |
| 2 Injected transport | 67293bd | feat(02): injected transport re-subscribes on re-injection (Pitfall 2) |

## Detection table as run (`select.test.js`, fake timers)

| UA | Mock injection | current() over time | onSwitch |
|----|----------------|---------------------|----------|
| plain | 0 ms | injected at 0 | 0 |
| plain | 500 ms | null at 499, injected at 500 | 0 |
| plain | 4000 ms | null at 2999, walletconnect at 3000, injected at 4000 | 1 |
| plain | 500 then 1500 | injected at 500, still injected at 1500 | 0 |
| marker | 0 ms | injected at 0 | 0 |
| marker | 500 ms | null at 499, injected at 500 | 0 |
| marker | 4000 ms | null at 3000, injected at 4000, never walletconnect | 0 |
| marker | 500 then 1500 | injected at 500 and 1500 | 0 |

Also covered: active WalletConnect session at the 4000 ms injection keeps walletconnect and fires no onSwitch (the session is checked at that moment, not earlier); marker UA with no injection is still unsettled after 60 s; foreign or absent `window.gnus` announcements change nothing; an announcement fired during the first read of `window.gnus` is not missed; `dispose()` stops the switch and the timer; after the late switch `createGnusClient(createInjectedTransport(win)).getAccounts()` resolves.

## Numbers

- Jest after the plan: 13 suites, 189 tests, 1 snapshot (after 02-03: 11 suites, 149 tests). New: `select.test.js` 32, `injected.test.js` 8.
- `tsc -p tsconfig.strict.json`, `yarn build`, secret gate (no leaks), `node scripts/check-audit.js` ("audit ok"), `yarn install --frozen-lockfile`: green. Cypress: 6 passing.

## Deviations from Plan

None in scope. Run after 02-03 rather than in parallel, at the orchestrator's request. In `mock/provider.ts` the state holds a `deliver` function for the newest facade, so `controls.emit` from any facade reaches only the newest facade's listeners.

## Known Stubs

None. `hasActiveWalletConnectSession` is a caller-supplied function; no WalletConnect transport exists yet (phase 6), as planned.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits 57c7a40 and 67293bd present; author braianwegmann@gmail.com; no trailer; tree clean outside `.planning`.
