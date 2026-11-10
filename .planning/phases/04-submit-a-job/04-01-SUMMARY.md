---
phase: 04-submit-a-job
plan: 01
status: complete
requirements: [DEF-03, EST-01, SUB-01, SUB-05]
actuals:
  tasks: 2
  commits: 2
---

# Phase 4 Plan 1: Submit tracer Summary

On the mock, `/submit` loads the bundled example, estimates in the wallet's units, pays through one click and ends on "Job submitted" with the burn hash, an Amoy explorer link and a job link.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 9e0f5c5 | Submit page: load the example, estimate, pay and show the job submitted on the mock |
| 2 | 2f933ed | Test the submit store's spend guarantees |

## What exists

- `lib/submit/job.ts` (parse, shape check, SHA-256 via WebCrypto, label), `drafts.ts` (zod entry, create, markSent, markSettled, remove), `store.ts` (one store per session store, injected storage, clock, key maker and digest), `lib/explorer.ts` (the wallet's six chains).
- `sub-components/submit/`: `useSubmit`, `SubmitFlow`, `JobInput`, `EstimatePanel`, `SubmitPanel`, `SubmitResult`; `pages/submit/index.tsx` is the gated flow.
- The draft `gnus.submit.<key>` holds the key, a hash of the sent JSON, a label, timestamps, `sentAt`, `chainId` and `settled`; never the job body.
- Jest: key saved before the call, no call when the write fails, one call for two clicks, a late estimate dropped after `setText` or `switchAccount`, the explorer table. Cypress `submit.cy.js` runs the path on `out/`.

## Deviations

- **[Braian override] Draft binds to a hash, not the job text.** D-12, D-13 and D-20 in 04-CONTEXT were rewritten (WebCrypto SHA-256 of `JSON.stringify(job)`, label only). A reload can no longer restore the typed job; loading the same job again finds the same key by hash (04-06).
- No hash without `crypto.subtle` (plain http off localhost): the estimate shows, submit stays off, the page says why.
- `submitBlocker` returns `""` for "off, nothing to say"; 04-04 fills in the words.

## Gaps for a human

- Look at the form, estimate and result in light and dark in a browser; 04-07 sweeps them with axe.

## Self-Check: PASSED
