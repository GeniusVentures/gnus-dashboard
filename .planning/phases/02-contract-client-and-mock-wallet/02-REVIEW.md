---
phase: 02-contract-client-and-mock-wallet
reviewed: 2026-10-27T03:24:40Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - .github/workflows/ci.yml
  - __tests__/components/Amount.test.jsx
  - __tests__/contract/factories/mock.js
  - __tests__/contract/gnus-contract.test.js
  - __tests__/contract/gnus-errors.test.js
  - __tests__/lib/gnus/address.test.js
  - __tests__/lib/gnus/amount.test.js
  - __tests__/lib/gnus/client.test.js
  - __tests__/lib/gnus/errors.test.js
  - __tests__/lib/gnus/injected.test.js
  - __tests__/lib/gnus/mock.test.js
  - __tests__/lib/gnus/schema.test.js
  - __tests__/lib/gnus/select.test.js
  - __tests__/lib/gnus/tracer.test.js
  - __tests__/pages/app-mock.test.jsx
  - cypress/e2e/mock-wallet.cy.js
  - jest.config.js
  - lib/gnus/address.ts
  - lib/gnus/address.typecheck.ts
  - lib/gnus/amount.ts
  - lib/gnus/client.ts
  - lib/gnus/errors.ts
  - lib/gnus/mock/install.ts
  - lib/gnus/mock/profiles.ts
  - lib/gnus/mock/provider.ts
  - lib/gnus/schema.ts
  - lib/gnus/transport/injected.ts
  - lib/gnus/transport/select.ts
  - lib/gnus/transport/types.ts
  - next.config.js
  - package.json
  - pages/_app.tsx
  - scripts/check-secrets.sh
  - sub-components/shared/Amount.tsx
  - tsconfig.strict.json
findings:
  critical: 0
  warning: 7
  info: 12
  total: 19
status: issues_found
fix_status: warnings_fixed (WR-01..WR-07); info items open
---

# Phase 2: Code Review Report

**Reviewed:** 2026-10-27T03:24:40Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

I reviewed `git diff b13b31e HEAD` without `.planning/`. I checked it against the contract snapshot
(`.planning/research/gnus-rpc-contract.md`), `ARCHITECTURE.md`, and the wallet's real handler in GeniusWallet
(`lib/gnus_bridge/gnus_rpc_handler.dart`, `gnus_job_store.dart`, `gnus_amounts.dart`) to see what the wallet actually sends.

Commands run: `tsc -p tsconfig.strict.json` exits 0, and the phase 2 Jest suites pass (13 suites, 290 tests).
Not run: `yarn build`, Cypress, and both gate scripts (`check-secrets.sh` and `--mock-import-test`).

What holds up:
- Every method, event, field, null and `data.reason` in the contract has a schema or a table row.
- `BigInt` appears only in `amount.ts`.
- `formatAmount` is exact for 2^53+1 and 1e21.
- No code converts between address brands.
- The listener is attached before `window.gnus` is read.
- No prototype pollution path. zod rebuilds objects and drops `__proto__` keys from records (probed on zod 4.6.7). The error table uses `Object.hasOwn`.

What needs fixing:
- The schemas accept payloads of any size.
- The schemas reject a null `evmChainId`, which the wallet really sends.
- A malformed account event is dropped silently.
- Detection inside the wallet can wait forever.
- The mock is kept out of production only by convention: nothing stops a production build with the flag set, and the marker only exists in one of the three mock files.
- The conformance suites burn real GNUS when pointed at a real wallet.

## Warnings

### WR-01: Wire payloads are unbounded; a long digit string blocks the UI in BigInt

**File:** `lib/gnus/amount.ts:4`, `lib/gnus/schema.ts:98-99,110,114,119-121,134`
**Issue:** `baseUnitsSchema` is `/^\d+$/` with no length limit. `formatAmount` then runs `BigInt` and division on whatever arrives. A 1,000,000-digit string took about 750 ms to divide in Node, and `Amount` does this on every render. The same gap is open everywhere else: `jobs` has no `.max(100)` although the contract caps `limit` at 100, and `origin`, `idempotencyKey`, `jobId`, `cids[]`, `error`, `symbol`, `network.sdk` and `nextCursor` have no `.max`. The trust boundary is meant to bound payloads, and it does not.
**Fix:**
```ts
// amount.ts: u256 is 78 digits
export const baseUnitsSchema = z.string().regex(/^\d{1,78}$/);
// schema.ts
const shortString = z.string().max(256);
jobs: z.array(jobSchema).max(100),
cids: z.array(z.string().min(1).max(256)).max(1000),
origin: shortString, idempotencyKey: shortString, error: z.string().max(2000).optional(),
```

**Status:** fixed in `959e044`. Sizes are bounded in zod: amounts `{1,78}` digits, strings 256, `error`/`message` 2000, `jobs` 100, `cids` 1000, `nextCursor` 512. Over-limit is a contract mismatch. Tests in `schema.test.js`.

### WR-02: `evmChainId` is non-nullable, but the wallet sends null

**File:** `lib/gnus/schema.ts:29`
**Issue:** The schema has `evmChainId: z.number().int().positive()`. The wallet builds the field from `details.selectedNetwork?.chainId` (`gnus_rpc_handler.dart:239,620,713`), so it is `null` whenever no EVM network is selected. Today such a reply makes `getAccounts` and `estimate` fail as `contractMismatch` ("update wallet"), and it makes `gnus_networkChanged` and `gnus_accountsChanged` mismatch too. The contract text shows only `80002` and never says whether null is allowed, so the two repos have drifted.
**Fix:** Settle the contract first. If null is legal, use `evmChainId: z.number().int().positive().nullable()` and add a null case to `schema.test.js`. If it is not, file the wallet fix. Either way, record the decision in the contract snapshot.

**Status:** fixed in `ae161ed`. `evmChainId` and `sdk` are nullable (contract snapshot updated by the wallet side). Mock `setNetwork` takes nulls. Null cases added to `schema.test.js` and `mock.test.js`.

### WR-03: An invalid event payload is dropped silently by default

**File:** `lib/gnus/client.ts:40,94-96`
**Issue:** `onMismatch` is optional, and with no handler a failed parse is ignored without a trace. `client.test.js:163` locks this behaviour in. Combined with WR-02, a real account switch whose payload fails parsing never reaches the page. The dashboard keeps showing the old `node.sdkAddress` while the wallet submits as the new one. The contract tripwire goes quiet exactly when it matters.
**Fix:** Make `onMismatch` required in `GnusClient.on`. Failing that, give it a default that surfaces the error, for example one session-level `onContractMismatch` passed to `createGnusClient(transport, { onMismatch })`. Update the "dropped quietly" test to match.

**Status:** fixed in `be43fa7`. `GnusClient.on` now requires `onMismatch`. The "dropped quietly" test became "reported to onMismatch".

### WR-04: With the wallet marker in the user agent and no injection, detection never settles

**File:** `lib/gnus/transport/select.ts:93-101`
**Issue:** The timer is only armed when `!insideWallet`. If the user agent carries ` GeniusWallet/x gnus/1` and the shim never arrives (a shim bug, an old wallet build, an injection failure), `choice` stays pending and `current()` stays `null` forever. `select.test.js:111` locks this in. The contract says the page should wait instead of guessing, but it does not say the page should hang: nothing tells the UI that the wait has failed, so phase 3 can only show a spinner that never ends. That breaks the "states, not spinners" requirement.
**Fix:** Keep WalletConnect off inside the wallet, but report the stall:
```ts
export type TransportChoice = "injected" | "walletconnect" | "walletMissing";
// inside the wallet: arm a longer timer (e.g. 10 s) that resolves "walletMissing" and keeps listening,
// so a later gnus#initialized still moves it to "injected" via onSwitch.
```

**Status:** fixed in `381a4af`. `detectTransport` gains `notReady()` and `onNotReady()`: inside the wallet, after `WALLET_NOT_READY_MS` (10 s) the signal turns on while `current()` stays null and detection keeps waiting. It clears if the wallet then arrives. `choice` is unchanged.

### WR-05: A production build with `NEXT_PUBLIC_GNUS_MOCK=1` silently ships a fake wallet

**File:** `next.config.js:7`, `pages/_app.tsx:11-13`
**Issue:** The out/ gate only checks the build CI makes, and CI never sets the flag. Any other `next build` with `NEXT_PUBLIC_GNUS_MOCK=1` (a host env var, a CI variable, a copy-pasted dev command) produces an export that installs `window.gnus` with `isGeniusWallet: true`. Detection picks it and every user sees fake accounts. Nothing at build time refuses this. The flag is only needed for `next dev`: Cypress imports `installMock` straight into the spec, and `test:e2e` serves a build made without the flag.
**Fix:** Fail closed in the config:
```js
const { PHASE_PRODUCTION_BUILD } = require("next/constants");
module.exports = (phase) => {
  if (phase === PHASE_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_GNUS_MOCK === "1") {
    throw new Error("NEXT_PUBLIC_GNUS_MOCK=1 is dev-server only; refusing to build an export with the mock");
  }
  return { ...nextConfig, env: { NEXT_PUBLIC_GNUS_MOCK: phase === PHASE_PRODUCTION_BUILD ? "0" : (process.env.NEXT_PUBLIC_GNUS_MOCK === "1" ? "1" : "0") } };
};
```

**Status:** fixed in `285b6cb`. `next.config.js` throws when `NEXT_PUBLIC_GNUS_MOCK=1` and `NODE_ENV=production`, unless `GNUS_MOCK_PRODUCTION_BUILD_TEST_ONLY=1`. The out/ marker gate is unchanged. Test in `__tests__/scripts/next-config.test.js`.

### WR-06: The mock marker exists only in `provider.ts`, so parts of the mock can ship undetected

**File:** `lib/gnus/mock/provider.ts:5`, `lib/gnus/mock/profiles.ts:1-166`, `lib/gnus/mock/install.ts:41-62`, `scripts/check-secrets.sh:65`
**Issue:** The gate greps out/ for `__GNUS_MOCK__`, a string that only appears in the facade `createFacade` returns. A production import of `MOCK_PROFILES` or `isMockProfileName` (say, a profile picker), or of `mockOptionsFromSearch` alone, gets tree-shaken down to code that never references the provider. The fault table and parser ship and the gate stays green. The planted-probe test only covers the full `installMock` path.
**Fix:** Put the boundary at import time rather than in the bundle output. Add an ESLint `no-restricted-imports` rule that bans `**/lib/gnus/mock/**` everywhere except `pages/_app.tsx`, `__tests__/` and `cypress/`, and run `next lint` in CI. Alternatively, export the marker from `profiles.ts` (the module every mock file depends on) and reference it in each mock module's exports.

**Status:** fixed in `b2fe84a`. The marker lives in `lib/gnus/mock/marker.ts` with a side-effecting assignment so it is not tree-shaken; `profiles.ts`, `provider.ts` and `install.ts` import it. The gate reads it from there. `--mock-import-test` now plants three imports (install, profiles-only, option parser only), each must trip the gate.

### WR-07: The conformance suites burn real GNUS and reuse fixed keys when pointed at a real wallet

**File:** `__tests__/contract/gnus-contract.test.js:193-195,275-338`, `__tests__/contract/gnus-errors.test.js:8-10,84,95-98,106,112-117`
**Issue:** D-06 says to run the same suites against the real wallet via `GNUS_CONTRACT_FACTORY`. Against a real wallet, about 8 contract tests call `submitJob`, each a real `bridgeOut` burn behind a native confirm, with nothing marking them as spending. `gnus-errors.test.js` also uses the fixed key `"k"` across rows. Inside the wallet's 24 h idempotency window, a second run (or a second row) with a different body gets `idempotency_key_reused` instead of the expected code, and a same-body replay hides the real error.
**Fix:** Run spend cases only on targets that opt in:
```js
const itSpends = factory.name === "mock" || process.env.GNUS_CONTRACT_ALLOW_SPEND === "1" ? it : it.skip;
```
Use `newKey()` (already in `gnus-contract.test.js`) for every key in `gnus-errors.test.js`.

**Status:** fixed in `dceb978`. Spend cases skip unless the factory is `mock` or `GNUS_CONTRACT_ALLOW_SPEND=1`. Keys come from `newKey()` (random UUID) in `factories/spend.js`, used in both suites.

## Info

### IN-01: Re-injection without `gnus#initialized` leaves the event listeners behind

**File:** `lib/gnus/transport/injected.ts:31-36,42-48`
**Issue:** `request` reads `win.gnus` on every call, but listeners only move on `gnus#initialized`. If the shim replaces `window.gnus` without the event, requests go to the new object while events stay on the dead one. The per-call read already admits this can happen.
**Fix:** In `request`, call `if (provider !== tracked && stored.size > 0) { moveTo(provider); }` before `provider.request(args)`.

### IN-02: The contract version in the user agent and in `window.gnus.version` is never checked

**File:** `lib/gnus/transport/select.ts:8-19`, `lib/gnus/transport/injected.ts:4`
**Issue:** ARCHITECTURE.md:65 says `injected.ts` checks `version === "1"`. `parseWalletMarker` extracts `contractVersion` and `appVersion` and both are thrown away, so the only check is the `getAccounts` literal. That works as long as `getAccounts` really is the first call.
**Fix:** Either drop the unused fields (`return MARKER.test(userAgent)`) or report a mismatch early from `select` when `contractVersion !== CONTRACT_VERSION`.

### IN-03: The schema accepts `cost: "0"`, which the contract rules out

**File:** `lib/gnus/schema.ts:59`
**Issue:** The contract says "a zero or failed SDK cost is an error (-32010), never `cost: "0"`". The schema accepts `"0"`, which would show the job as free.
**Fix:** `cost: baseUnitsSchema.regex(/[1-9]/)`, plus a schema test.

### IN-04: `earned.history[].jobId` is non-nullable while `jobId` is null everywhere else

**File:** `lib/gnus/schema.ts:134`
**Issue:** `jobId` is null until SDK-JOBID lands. A history row keyed to a job without an id would make the whole earnings reply a mismatch. The contract's `"..."` placeholder does not say either way.
**Fix:** Use `jobId: z.string().min(1).nullable()`, or confirm with the wallet side and note it in the contract.

### IN-05: zod `jitless` is a global set by import order

**File:** `lib/gnus/schema.ts:6`
**Issue:** zod reads `jitless` when an object schema is constructed (`zod/v4/core/schemas.js:1194`). It works today only because every `z.object` sits in `schema.ts` after the `z.config` call. An object schema added to `address.ts` or `amount.ts`, or any module imported before `schema.ts`, would be JIT-compiled and trip the CSP.
**Fix:** Move `z.config({ jitless: true })` into a tiny `lib/gnus/zod.ts` that re-exports `z`, and import `z` only from there.

### IN-06: Getters that throw in a reply escape as raw errors

**File:** `lib/gnus/client.ts:65-75,89-97`
**Issue:** `rememberVersion` and `safeParse` run outside the try block. A reply object with a throwing getter or a Proxy (the injected path shares the page realm) throws a raw error instead of a `GnusError`. Inside an event wrapper, it also stops the provider's emit loop.
**Fix:** Wrap the parse in `try { ... } catch { throw new GnusContractMismatchError(method, lastVersion); }`, and do the same in the event wrapper.

### IN-07: The mock accepts jobs the wallet rejects

**File:** `lib/gnus/mock/provider.ts:144-153`
**Issue:** The wallet rejects an empty job, jobs deeper than `_maxJobDepth`, and jobs larger than `maxJobBytes` (`gnus_rpc_handler.dart:369-384`). The mock accepts any plain object, including `{}`, which `client.test.js` uses. Tests that pass against the mock can fail on the wallet.
**Fix:** Reject `{}` in `jobOf` and add a size cap matching the wallet. Add an "empty job is invalidParams" case to the conformance suite.

### IN-08: The -32602 message talks about the job even for cursor, limit and selector errors

**File:** `lib/gnus/errors.ts:56-57`
**Issue:** The wallet sends -32602 with no reason for `limit`, `cursor`, `selector` and `includeChildren` too. "Check the job and try again" with the `editJob` action is wrong for a bad list cursor.
**Fix:** Use a neutral fallback ("GeniusWallet rejected the request.") with `retry`, and let the submit flow add its own wording about the job.

### IN-09: Assertions that cannot fail or never run

**File:** `__tests__/contract/gnus-contract.test.js:282,334-336`
**Issue:** `expect(r.sdkAddress).not.toBe(accounts.payer.evmAddress)` compares a 128-hex value with a 40-hex value, so it can never fail. The `getJob({ jobId })` branch never runs on the `today` profile, so the conformance suite never tests the jobId lookup.
**Fix:** Delete the `.not.toBe` line. Run the getJob case on `populated` as well, or assert the jobId lookup explicitly when `sent.jobId !== null`.

### IN-10: The Cypress spec tests the mock, not the dashboard

**File:** `cypress/e2e/mock-wallet.cy.js:1-49`
**Issue:** Both specs install the mock and call `win.gnus.request` directly. No dashboard code runs, so they only show that the mock bundles in Cypress. That is acceptable before phase 3, but these specs should not be counted as e2e coverage.
**Fix:** Rename the describe to say this is a mock smoke test, and drive the page through detection in phase 3.

### IN-11: Constants are duplicated or unused

**File:** `lib/gnus/schema.ts:20-25`, `lib/gnus/mock/provider.ts:64,411-431,443,452,455`, `lib/gnus/address.ts:24-32`
**Issue:** `EVENTS` is exported and used nowhere. The mock hardcodes every method and event name instead of using `METHODS` and `EVENTS`, so two copies of the contract's names exist. `parseSdkAddress` and `parseEvmAddress` have no production caller yet.
**Fix:** Use `METHODS` and `EVENTS` in the mock. Drop `EVENTS` if it stays unused, and add the address parsers when a caller needs them.

### IN-12: The gate builds the marker regex one bracket per character

**File:** `scripts/check-secrets.sh:15-16,65`
**Issue:** Wrapping each character of the marker in brackets is a clever way to get a fixed-string match through `grep -E`. A plain `grep -rIlF -e "$MOCK_MARKER" out` does the same in one line, and that is easier to read.
**Fix:** Run a separate `grep -F` check for the marker outside the ERE loop.

---

_Reviewed: 2026-10-27T03:24:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
