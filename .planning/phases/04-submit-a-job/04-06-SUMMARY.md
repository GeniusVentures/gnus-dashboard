---
phase: 04-submit-a-job
plan: 06
status: complete
requirements: [SUB-01, SUB-02, SUB-08]
actuals:
  tasks: 3
  commits: 3
---

# Phase 4 Plan 6: Reload recovery Summary

After a reload at any step the page ends on the true outcome, the same job finds the same key by its hash, and the mock sees exactly one burn.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | c2260f1 | Drafts: reuse by job hash, expiry after 23 h, newest per identity, the key maker |
| 2 | 2c80ea5 | Recover a submit after a reload: reuse the key by job hash, look a sent draft up by key, once per identity |
| 3 | c5271a9 | Reload at every step of a submit on the export, one burn each time |

## What exists

- `drafts.ts`: `findReusable` (unsettled, same node account, SDK network and job hash; a sent-but-unsettled draft counts), `newestFor`, `prune` (23 h from `sentAt` else `createdAt`, bad entries removed, other keys untouched), `removeIfUnsent`, `randomKey` (v4 from `getRandomValues` without `randomUUID`).
- Store recovery runs once per identity per page load, at creation or when the session first reaches ready (StrictMode safe: one `gnus_getJob`). A never-sent draft is left for reuse; a sent or settled one shows Checking, then the outcome; no record puts the form back with the note; Check again is the only re-check.
- Jest `reload.test.js` (11): review, during the confirm, after a lost response, result screen, wallet stops mid-submit, outcome unknown, account switch, expiry, StrictMode. Cypress `submit-reload.cy.js` repeats five of them across `cy.reload()`.

## Deviations

- **Override consequence:** the draft holds a hash, not the job, so a reload cannot put the typed job back. At review the form is empty and the user loads the same job again; reuse by hash gives the same key. The Jest "at review" test asserts that instead of "the text comes back".
- `DraftStorage` gained `key()` and `length` so drafts can be listed.

## Gaps for a human

- A reload inside the real wallet's webview, which may clear site storage between launches, is untested.

## Self-Check: PASSED
