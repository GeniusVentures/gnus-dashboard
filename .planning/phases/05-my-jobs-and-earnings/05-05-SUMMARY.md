---
phase: 05-my-jobs-and-earnings
plan: 05
status: complete
requirements: [JOBS-01, JOBS-06, JOBS-07]
actuals:
  tasks: 3
  commits: 3
---

# Phase 5 Plan 5: Live updates and search Summary

A `gnus_jobUpdated` event changes the matching row and open detail in place, the views re-read on mount, tab return and a slow poll that only runs while a job can still change, and search finds a job whether or not it is loaded.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 611436d | Pure merge and search rules for live job updates and search |
| 2 | 94310d5 | Live job updates: events patch the list and detail in place, refetch on focus, a slow poll only while a job can change |
| 3 | a266861 | Search by job id or burn hash: filter what is loaded, open an exact job through its detail page; live walk on the export |

## What exists

- `lib/jobs.ts`: `replaceInPages`, `replaceInDetail` (keeps result and error), `searchTarget`, `matchesSearch`; pure, no react-query.
- `useJobUpdates` subscribes per mounted view, drops events for another account, patches list and detail, invalidates the list for a job it does not hold and the detail when a job finishes, and re-reads both when an event fails its schema. It unsubscribes on unmount.
- Both queries refetch on tab focus and every 30 s while a non-final job is on screen (react-query pauses the interval while the tab is hidden); with only final rows nothing polls (tested under fake timers).
- `role="search"` form: typing filters loaded rows with no wallet call; submit opens the one loaded match, a whole hash as `?hash=`, other text as `?id=`, or asks for the whole hash.

## Deviations

- The poll interval is held in component state set from the loaded rows, because the query that needs it is the one that supplies them.
- A `0x` prefix typed alone matches every row, so it gets the whole-hash message rather than opening a row.

## Gaps for a human

- Real events need wallet v4.0 phase 43; live states need SDK-STATUS. The 30 s poll is only timer-tested, never watched in a browser tab left in the background.

## Self-Check: PASSED
