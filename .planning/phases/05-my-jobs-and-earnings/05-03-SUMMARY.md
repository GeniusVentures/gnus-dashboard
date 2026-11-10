---
phase: 05-my-jobs-and-earnings
plan: 03
status: complete
requirements: [JOBS-04, JOBS-05, DISP-02]
actuals:
  tasks: 3
  commits: 2
---

# Phase 5 Plan 3: Job detail Summary

A deep link or a row link opens one job from `gnus_getJob` with every field, a result block that stays inert, and a mock profile that reaches every state.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1, 2 | 48e4ba7 | Job detail by deep link: every field from gnus_getJob, the result block with gateway links, data and error as text |
| 3 | 69f8039 | Mock jobResults: a job per state, stored results and errors, hostile text; detail and results walked on the export |

## What exists

- `parseJobRef` (exactly one of `?hash=` and `?id=`; the hash is lowercased) and `cidHref` (letters and digits only, one gateway constant) in `lib/jobs.ts`.
- `JobDetailView` reads `useRouter` only after `isReady`; the h1 is "Job detail" in every state. Kind `job:<selector>:<value>`; burn transaction and node account as copy chips, the rest in a `<dl>`; null jobId, null lookup, pending nulls and the foreign-account mismatch have their words.
- Result block: CIDs as monospace text with "Open in IPFS gateway" through `ExternalLink` (accessible name includes the CID), `data` in a focusable `<pre>`, `error` under h2 "Error"; everything from the wallet is a text node.
- Mock: seeds `results` (nine jobs, `0x7e57`), profile `jobResults`; the record stores its own result and error and `publicJob` strips both from lists and events.

## Deviations

- Tasks 1 and 2 touch the same component and went in as one commit.
- `window.__gnusXss` stays undefined in Jest and Cypress for the hostile job; no `dangerouslySetInnerHTML` anywhere.

## Gaps for a human

- Job ids, live states and results are null on a real wallet until SDK-JOBID, SDK-STATUS and SDK-RESULT; real lists wait on wallet v4.0 phase 43. The gateway host (`ipfs.io`) is a placeholder for Braian to confirm.

## Self-Check: PASSED
