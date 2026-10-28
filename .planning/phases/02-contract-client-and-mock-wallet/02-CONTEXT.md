# Phase 2: Contract client and mock wallet - Context

**Gathered:** 2026-10-27 (overnight, auto; every decision is (D), not yet reviewed by Braian)
**Status:** Ready for planning

<domain>
## Phase Boundary

`lib/gnus/`: the contract as code (zod schemas, branded addresses, decimal-string amounts, error mapping),
one typed client over one `Transport` interface, transport selection (injected `window.gnus` with the
user-agent marker and late-injection rules), the injected transport, a mock wallet with fault profiles, the
shared `Amount` component, and a conformance suite. No WalletConnect transport (phase 6), no session
context or pages (phase 3).

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Layout per research ARCHITECTURE/STACK: `lib/gnus/{schema,errors,address,amount,client,transport/{types,select,injected},mock/}.ts`. `select.ts` is pure (inputs: UA string, a `window`-like object, timers) so detection is tested without a browser.
- **D-02:** zod 4 at the single boundary (client parses every result and event payload). Mismatch -> `GnusContractMismatchError` carrying the wallet's `version` when known. Amounts are `z.string().regex(/^\d+$/)` base-unit strings; numbers are rejected.
- **D-03:** `amount.ts` is the only file with `BigInt`; `formatAmount(base: string | null, decimals: number)` exact for 9007199254740993 and 1e21 (as `"1000000000000000000000"`). `Amount` component (React) over `string | null` renders "Not available yet" for null.
- **D-04:** `errors.ts`: one table, code (+ `data.reason`) -> `{ kind, message, action }`, covering every code in the contract snapshot incl. -32005 reasons, -32010..-32015, -32602 `idempotency_key_reused`.
- **D-05:** Mock: `lib/gnus/mock/` implements every contract method and event in memory, with named fault profiles (late injection 0/500/4000 ms and twice; every error code; switching windows; null profile; both paid-but-not-processed shapes; a slow confirm; replayed idempotency key; -32005 on concurrent calls; amounts above 2^53). Installed only when `NEXT_PUBLIC_GNUS_MOCK=1`; a CI check greps `out/` for a mock marker string and goes red on a planted import (extend the phase 1 secret/out gate script rather than adding a new one).
- **D-06:** Conformance suite `__tests__/contract/` takes a transport factory; runs against the mock in CI; a real-wallet run is a recorded gap until wallet phase 43 ships a transport.
- **D-07:** `tsconfig.strict.json` (strict: true) over `lib/gnus/**` and new code, checked by `tsc -p tsconfig.strict.json` in CI; the main tsconfig stays as is until the legacy surface is gone.
- **D-08:** New dependency: `zod@4` only (research STACK). No react-query yet (phase 3).

### Claude's Discretion
- Internal file split, fault profile naming, how the dev server exposes the profile picker (query param or env).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/research/gnus-rpc-contract.md` — the contract snapshot (canonical copy lives in GeniusWallet; updated 2026-10-27: `gas.gasPriceGwei`, all GNUS amounts base units of `unit.decimals`)
- `.planning/ROADMAP.md` § Phase 2; `.planning/REQUIREMENTS.md` RPC-01..08, CONN-01, SEC-04, DISP-01
- `.planning/research/SUMMARY.md`, `STACK.md` (zod, versions), `ARCHITECTURE.md` (layout, select rules), `PITFALLS.md` (2, 5, 6, 7, 17)
- `.planning/phases/01-teardown-and-static-shell/01-06-SUMMARY.md` — the out/ gate script to extend

</canonical_refs>

<deferred>
## Deferred Ideas

- Machine-readable contract fixtures from the wallet side (asked for; schemas are a hand transcription until then, `version` is the tripwire).

</deferred>
