---
phase: 07-hosting-and-csp-hardening
plan: 01
status: complete
requirements: [DEP-03, SEC-06, SEC-07]
actuals:
  tasks: 2
  commits: 2
---

# Phase 7 Plan 1: One policy from build to browser Summary

`scripts/headers.js` is the only place the CSP and headers live. The build writes `out/_headers` from it, `serve-out.js` sends the same headers, `check-deploy.js` checks them on any URL, and a Cypress smoke proves the home page loads with zero violations under the report-only policy.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | c0743db | Serve the export under one report-only CSP from build to browser, with fonts from the origin |
| 2 | 6f15647 | Check routes, statuses, caching and headers of any served export with one script |

## What exists

- Policy exactly as 07-CONTEXT D-09; `CSP_ENFORCED = false`. Headers per D-08 in `out/_headers`: the `/*` block has no Cache-Control, the `/_next/static/*` block only the immutable one.
- Build fails when a chunk names a Reown or WalletConnect host the policy neither allows nor lists in `UNUSED_HOSTS` with a reason (five hosts listed).
- Roboto from `@fontsource/roboto` 5.3.0 (exact, integrity equals the registry's), latin 400, 500 and 700; the built CSS has no outside `@import`.
- `yarn test:csp` (`experimentalCspAllowList`): the header equals the module's, home has 0 violations, a planted outside image is caught.
- `check-deploy.js`: 5 routes plus the detail link, 404 page, immutable asset, HTML not immutable, every header. Jest covers pass and six failure shapes. CI runs it and `test:csp` after the e2e step.

## Deviations

- Three prerendered `style` attributes (footer socials gap and margin, the main min-height) were the only violations. They became classes in `styles/theme.scss` instead of opening `style-src-attr`; the `gap` prop of `Socials` went with them (one caller).
- `test:csp` names the spec file in `specPattern` rather than a glob, because the shell would expand a glob on CI.
- Jest tests of `check-deploy` pass a small Node fetch, since the jsdom environment has none; the real server run is the CI step.

## Gaps for a human

- None new. The policy has only run against `serve-out.js`; the hosted header check waits on the Cloudflare checklist (07-03).

## Self-Check: PASSED
