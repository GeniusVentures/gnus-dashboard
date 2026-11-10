---
phase: 05-my-jobs-and-earnings
plan: 01
status: complete
requirements: [JOBS-01, JOBS-02, JOBS-03]
actuals:
  tasks: 3
  commits: 3
---

# Phase 5 Plan 1: My jobs list Summary

`/jobs` lists the node account's jobs newest first through the real client, every status in true words, with loading, empty, error and paging states.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | f378ac8 | My jobs: seeded jobs reach the table through the real client, newest first |
| 2 | 40b98c9 | Job statuses in true words: one table, badges, marked rows keep their explanation |
| 3 | 93266bf | My jobs: loading, empty, error and paging states with focus and announcements |

## What exists

- Mock: `seeds.ts` and profiles `jobHistory` (25 jobs, `0x5eed` hashes, three statuses, two pages of 20) and `readsFail`; `provider.ts` only takes its starting jobs from `seedJobs`.
- `useAccountInfiniteQuery` beside `useAccountQuery`, same key and enabled rule, every read through `store.track`; `useAccountQuery` takes optional refetch options.
- `lib/jobs.ts`: the status table (label, explanation, final, marked, badge variant) and the short-id rule. `JobStatusBadge` always carries words.
- `JobsView`: table in `.table-responsive` with a hidden caption, pages flattened and de-duplicated by burn hash, a foreign row throws the contract mismatch, Load more jobs moves focus to the first new row and says "Showing n jobs", a failed next page keeps the rows and offers Retry. The body is keyed by the node address.
- The placeholders table in `placeholders.test.jsx` is empty now, so the whole block is deleted (it ran second after phase 4 removed the submit row).

## Deviations

- `shortJobId` takes `jobId?: string | null`: the root `tsconfig` is non-strict, where zod's nullable fields come out optional, and `yarn build` type-checks with it.
- `tsconfig.strict.json` globs for `sub-components/jobs`, `sub-components/earnings`, `pages/jobs` and `pages/earnings` were added right after `lib/**/*.ts`.

## Gaps for a human

- Real lists wait on wallet v4.0 phase 43; job ids and live states on SDK-JOBID and SDK-STATUS. Look at the list in light and dark.

## Self-Check: PASSED
