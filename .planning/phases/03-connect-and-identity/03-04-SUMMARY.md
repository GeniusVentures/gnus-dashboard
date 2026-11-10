---
phase: 03-connect-and-identity
plan: 04
status: complete
requirements: [CONN-02, CONN-11]
actuals:
  tasks: 3
  commits: 3
---

# Phase 3 Plan 4: Header, layout and colour scheme Summary

Copy buttons that work without the Clipboard API, one header with the identities and navigation on every route, a one-row footer with working links, and light and dark from the OS with AA link colours.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 34c865d | Copy buttons for both identities, with an execCommand fallback and a selected-field failure state |
| 2 | 81ae9b6 | One header with identity and navigation, a footer with working links, no video or fake controls |
| 3 | e1cbfe4 | Follow the OS light and dark scheme with AA link colours and a visible focus ring |

## What exists

- `lib/copyText.ts` (Clipboard API, else hidden textarea and `execCommand`, false when both fail); `AddressChip` copies the full address, says "Copied" for 2 s in a polite live region, and on failure shows the full address in a focused, selected read-only field.
- One `<header>`: head icon (decorative) and "GNUS Dashboard", the identities and network, then Submit a job, My jobs, Earnings. The toggle is the text "Menu". Removed: video background, Network toggle, `NavDropdownMain`, the privacy modal and dead footer links.
- Scheme: `$color-mode-type: media-query`, so the built CSS carries `prefers-color-scheme: dark`; no script. Light is a white page with #0b7a5e links (5.3:1); dark keeps a black page with mint links. The forced-black dark overrides are gone and `$min-contrast-ratio` is 4.5. Focus is a 2px ring in the emphasis colour.

## Deviations

- Edited `_nav.scss` and `_button.scss` (not in the plan): `.nav-link` and `.social-links` were fixed white with `!important`, and `.btn-link` took a compile-time colour, so all three broke light mode. They now read the mode-aware `--fc-` variables.
- `Placeholder` and the 404 page lost `text-white` and the full-height minimum, which the plan's files covered only partly.
- The copy button is `btn-link` (the outline variant uses mint text, which fails AA on white).

## Verification

- `yarn jest --ci` 414 tests at the end of the plan; build clean; `static-shell.cy.js` and `connect.cy.js` pass; no fixed white or black class and no inline colour in the new markup.
- Human check pending: look at the header, home page, a state screen and the 404 page in light and dark.

## Self-Check: PASSED
