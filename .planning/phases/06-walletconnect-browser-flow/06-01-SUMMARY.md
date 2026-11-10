---
phase: 06-walletconnect-browser-flow
plan: 01
status: complete
requirements: [WC-01, WC-02]
actuals:
  tasks: 2
  commits: 3
---

# Phase 6 Plan 1: Browser path tracer Summary

With no `window.gnus`, the page loads the WalletConnect code, shows a pairing link, and after approval runs the same client and session store as the injected path against a fake relay.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | aadbb4f | Pair from a normal browser over WalletConnect and show both identities |
| 2 | 35157ef | Define the Reown project id at build time and allow the curve constants the SDK ships |
| 2 | e8fac68 | Sync the contract snapshot with the wallet's copy and note the WalletConnect wire rules |

## What exists

- `lib/gnus/transport/walletconnect.ts`: `SignClientLike`, the real adapter `createClient()` (null without an id, otherwise dynamic-imports sign-client 2.26.0, `telemetryEnabled: false`, metadata from `window.location.origin`), and `createWalletConnectTransport` (eip155:80002, params always an object, error and null-result decoding, event filter).
- `lib/gnus/mock/relay.ts`: the fake relay with all ten profiles and the wallet's wire encoding; only `approve` is tested here, plans 02 and 03 test the rest.
- The store takes `loadWalletConnect` in its env and imports `walletconnect.ts` only by type, so the chunk loads on the browser path alone. `setWalletConnectLoader` is the one seam for the dev server.
- The machine gained `transport`, `uri`, `detail`, the phases `pairing`, `pairingDeclined`, `disconnected` and causes `offline`, `notGenius`.
- Integrity in `yarn.lock` equals the registry's for both packages; the audit gate passes.

## Deviations

- [Rule 3] The out/ secret scan failed on 17 quoted 64-hex values that `@noble/curves` ships in the sign-client chunk (curve parameters, found in `node_modules/@noble/curves`, plus one ABI offset). They are listed by exact value in `.gitleaks.toml`; `scripts/check-secrets.sh` reads that list for its grep scan, so the list stays the single source.
- `jest.setup.js` forces an empty id so a developer's `.env.local` cannot switch on the real client in tests. The snapshot's wire note names wallet phase 47 D-06 and D-08 (D-25).

## Gaps for a human

- No Reown project id exists, so `createClient()` has only run against a mocked sign-client in Jest. A real pairing waits on an id and a wallet phase 47 build.

## Self-Check: PASSED
