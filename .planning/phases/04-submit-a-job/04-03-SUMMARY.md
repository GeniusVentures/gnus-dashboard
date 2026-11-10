---
phase: 04-submit-a-job
plan: 03
status: complete
requirements: [DEF-01, DEF-02, DEF-03, DEF-04, DEF-05]
actuals:
  tasks: 3
  commits: 3
---

# Phase 4 Plan 3: Job input Summary

A job comes in by file, paste or the bundled example, shows exactly what will be sent, and bad input keeps Estimate cost off with a plain message.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 4a6c5e4 | Job input rules: shape messages and the 5 MB cap, tested |
| 2 | ffaf661 | Job input: choose a file, paste, and a preview of exactly what is sent |
| 3 | 7eebe40 | Walk file pick, paste, example, the 5 MB cap and the shape errors on the export |

## What exists

- `parseJob` checks JSON, object, and the three top-level keys; the cap is 5,242,880 UTF-8 bytes, counted by bytes and checked before `JSON.parse`. It also refuses a job whose sent text (re-stringified) crosses the cap.
- `JobInput` has Job JSON, Load example and Choose a file (`.json`); a file over the cap is refused by `size` and never read; its text goes through `store.setText` like a paste. `JobPreview` shows `JSON.stringify(job, null, 2)` in a focusable, scrollable `<pre>` only while the job parses.
- `renderWithSubmit` and `makeSubmit` in `__tests__/mocks/submit.js` give component and store tests Map-backed storage, a Node digest and a counter for keys.
- Cypress: file pick (the estimate's params deep-equal the file), a 5 MB + 1 file, three bad pastes, the example.

## Deviations

- Added a size check on the re-stringified job (the wallet counts what is sent, and number rewriting can grow it).
- Plan 04-03 left the file chooser's wording open; the label is "Choose a file" and the input sits beside Load example.

## Gaps for a human

- Choose a real `.json` from disk in a real browser and the wallet's webview; Cypress selects a file programmatically.

## Self-Check: PASSED
