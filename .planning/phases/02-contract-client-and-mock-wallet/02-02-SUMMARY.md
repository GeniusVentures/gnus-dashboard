---
phase: 02-contract-client-and-mock-wallet
plan: 02
status: complete
requirements: [RPC-01, RPC-02, RPC-03, RPC-04]
---

# Phase 2 Plan 2: Full contract schemas and six-method client Summary

`schema.ts` now holds one zod schema per contract result and event, and `client.ts` exposes all six `gnus_*` methods plus parsed events over the one `Transport`, with every mismatch naming the wallet's version.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 Schemas | b530e33 | feat(02): zod schemas for every gnus_* result and event (RPC-02) |
| 2 Client | 78ee6ab | feat(02): typed client for all six gnus_* methods and parsed events (RPC-01) |

## Decisions in code

- ISO timestamps use `z.iso.datetime({ offset: true })`. Checked at run time against the installed zod 4.6.7: accepts `...03.456789Z` and `...03+02:00`, rejects `yesterday`.
- Job `status` is `z.string().transform(...)` to a known value or `"unknown"`; submit `status` is a strict two-value enum.
- `getJob` parses with `jobDetailSchema.nullable()`; the schema itself is not nullable.
- No `regex(` in `schema.ts` (grep prints nothing); address and amount rules are imported.
- The client remembers a `version` string from the raw payload of any reply or event that carries one (only accounts replies and `gnus_accountsChanged` do), per client instance.

## Numbers

- Jest after the plan: 8 suites, 85 tests, 1 snapshot (after 02-01: 6 suites, 41 tests). New: `schema.test.js` 27, `client.test.js` 17.
- `tsc -p tsconfig.strict.json`, `yarn build`, secret gate (no leaks), `yarn install --frozen-lockfile`: green. Cypress: 6 passing.

## Deviations from Plan

None. The plan's "parallel with 02-03 and 02-04" was run sequentially at the orchestrator's request. Gitleaks came from the SHA-checked binary extracted in 02-01 (Windows `tar.exe`, no `unzip`).

## Known Stubs

None.

## Threat flags

None beyond the plan's register.

## Self-Check

Commits b530e33 and 78ee6ab present; author braianwegmann@gmail.com; no trailer; tree clean outside `.planning`.
