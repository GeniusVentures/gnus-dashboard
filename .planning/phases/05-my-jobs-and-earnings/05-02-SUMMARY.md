---
phase: 05-my-jobs-and-earnings
plan: 02
status: complete
requirements: [DISP-02]
actuals:
  tasks: 2
  commits: 2
---

# Phase 5 Plan 2: External links Summary

Every link that leaves the dashboard goes through `ExternalLink`, and lint fails the build on any that does not.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 7bca898 | ExternalLink takes a name and class; Socials goes through it |
| 2 | 9c7a028 | Lint keeps every external link on ExternalLink, and CI runs it |

## What exists

- `ExternalLink` takes `href`, children, `className` and `aria-label`; `target` and `rel` are not props. The seven social links use it with the same names; the footer already did.
- `.eslintrc.json`: `no-restricted-syntax` errors on any JSX `target` and on an absolute `http://`, `https://` or `//` `href` on any element but `ExternalLink`; off inside `ExternalLink.tsx`.
- `yarn lint` covers `pages`, `sub-components`, `layouts`, `lib` and `data` (bare `next lint` skips most of them); CI runs it right after the strict tsc.
- Probes, written and deleted by hand: a `target` link, an `https://` link and a `//` link each fail lint; an `ExternalLink` to an absolute URL passes.

## Deviations

- The `//` pattern is written `\x2f\x2f` in the selector: esquery's regex syntax cannot contain a `/`.
- A relative `<a href="/jobs">` also fails lint, but through Next's own `no-html-link-for-pages` rule, not this one.

## Gaps for a human

- None. CI has not run this step remotely (nothing is pushed).

## Self-Check: PASSED
