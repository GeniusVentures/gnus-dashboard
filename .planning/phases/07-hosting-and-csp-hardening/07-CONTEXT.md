# Phase 7: Hosting and CSP hardening - Context

**Gathered:** 2026-10-28, autonomously. Braian chose Cloudflare Pages; every other decision is (D) and open to him.
**Status:** Ready for planning

<domain>
## Phase Boundary

Serve `out/` from Cloudflare Pages with headers as code and a strict CSP, prove the same headers locally
in CI, make every route violation-free, keep wallet text inert, and pass WCAG 2.1 AA with a keyboard-only
submit. Done means the Linux wallet pairs with the hosted dashboard from a desktop browser under the policy.
Braian has not yet created the Cloudflare account, token, domain or Reown projects, so everything builds and
tests without them and the deploy skips itself with a notice until they exist. Cutover and rollback are phase 8.

</domain>

<decisions>
## Implementation Decisions

### Host and deploy
- **D-01:** Cloudflare Pages, Direct Upload from GitHub Actions (Braian, 2026-10-28) with
  `cloudflare/wrangler-action` v4.1.3 pinned to commit `953926a2e2182532811c01a25e53647d93bf07c0` and
  `wranglerVersion: 4.154.0` (both checked 2026-10-28), running `pages deploy out --project-name=... --branch=...`.
- **D-02 (D):** `.github/workflows/deploy.yml` has two jobs. `build` references no secret: frozen install,
  `yarn build` with the environment's Reown id, `check-deploy.js` against `serve-out.js`, upload `out/` as an
  artifact. `deploy` downloads the artifact and runs wrangler; it never checks out or runs repository code,
  so PR code never shares a job with the token.
- **D-03 (D):** Push to `main` deploys production under GitHub environment `production` (branch rule: `main`
  only). A pull request from this repository deploys a preview under environment `preview` with
  `--branch=pr-<number>` (alias `pr-<number>.<project>.pages.dev`). Fork PRs never deploy. A preview never
  sees the production Reown id.
- **D-04 (D):** Missing `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_PAGES_PROJECT`: the
  deploy step is skipped and a `::notice::` names what to set; the workflow stays green. After a deploy,
  `check-deploy.js` runs against the deployment URL wrangler reports.
- **D-05 (D):** `aws-ec2-deploy.yml` is not touched: manual (`workflow_dispatch`) and failing at its first
  step until the phase 8 cutover.

### Configuration (no values in the repo)

| Name | Kind | Where | Holds |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | repository | token with Account > Cloudflare Pages > Edit only |
| `CLOUDFLARE_ACCOUNT_ID` | secret | repository | account id |
| `CLOUDFLARE_PAGES_PROJECT` | variable | repository | Pages project name, suggested `gnus-dashboard` |
| `NEXT_PUBLIC_WC_PROJECT_ID` | variable | environments `production` and `preview` | a different Reown project id in each |
| `DASHBOARD_ORIGIN` | variable | environment `production` | custom domain placeholder, e.g. `https://dashboard.gnus.ai` (undecided) |

- **D-06 (D):** Until a custom domain exists the production origin is `https://<project>.pages.dev`. No code
  holds the origin: WalletConnect metadata reads `window.location.origin`. `DASHBOARD_ORIGIN`, once set, is
  what `check-deploy.js` also probes after a production deploy, what Reown Cloud verifies, and what the
  wallet's phase 46 release pin takes. Dev uses a dev Reown id in `.env.local`, never committed.

### Headers as code
- **D-07 (D):** One CommonJS module, `scripts/headers.js`, holds the policy and the header table. After
  `next build` it writes `out/_headers` in Cloudflare syntax (`build` becomes `next build && node
  scripts/headers.js`); `serve-out.js` sends the same headers from the same module. `CSP_ENFORCED = false`
  sends `Content-Security-Policy-Report-Only`; true sends `Content-Security-Policy`.
- **D-08 (D):** On `/*`: the CSP, `Strict-Transport-Security: max-age=31536000` (no includeSubDomains until
  the domain is known), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`,
  `Cross-Origin-Opener-Policy: same-origin`. On `/_next/static/*`: `Cache-Control: public,
  max-age=31536000, immutable`. HTML keeps Pages' default `public, max-age=0, must-revalidate`; no
  Cache-Control on `/*`, because Pages joins a header set by two rules with a comma. `serve-out.js` sends
  `no-cache` for HTML. Not `no-referrer`: Verify's frame learns the page origin from the browser, and an
  attestation without one reads UNKNOWN, which the wallet refuses.
- **D-09 (D):** Starting policy: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
  font-src 'self'; manifest-src 'self'; connect-src 'self' wss://relay.walletconnect.org; frame-src
  https://verify.walletconnect.org; frame-ancestors 'none'; base-uri 'self'; form-action 'none';
  object-src 'none'`. `base-uri 'self'` because `_app` sets `<base href="/">`. No `upgrade-insecure-requests`
  (it breaks the local http server; the host is https only). No `report-uri`: a static host has no endpoint.
  Anything else is added only when the smoke shows a violation, with a comment naming its source (likely:
  Bootstrap's `data:` SVG form icons in `img-src`, prerendered `style` attributes in `style-src-attr`).
- **D-10 (D):** WalletConnect hosts come from the installed `@walletconnect/core` 2.26.0 source: the relay
  `wss://relay.walletconnect.org` (the only relay URL in it) and Verify's attestation iframe
  `https://verify.walletconnect.org/v3/attestation`, loaded by the page on every proposal and request. Left
  out on purpose: `pulse` (telemetry is off), `echo` (wallet push), `rpc.walletconnect.org`
  (UniversalProvider only), `verify.walletconnect.com` and `relay.walletconnect.com` (not the 2.26.0 defaults).
  A test scans the built chunks for walletconnect and reown hosts and fails on any host neither listed nor
  named as unused, so an SDK bump cannot silently need a new one.
- **D-11 (D):** Report-only first (SEC-06). The flip to enforced lands only after a hosted pairing with
  GeniusWallet passes under report-only with zero violations. Until wallet phase 47 has a build, the preview
  proves the relay and the Verify frame (pairing code shown, zero violations) and the flip is a recorded gap.

### Assets (SEC-07)
- **D-12 (D):** Roboto, the theme's only used web font, is self-hosted from `@fontsource/roboto` 5.3.0
  (exact; registry 2026-10-28: repo fontsource/font-files, maintainers jwr1 and lotusdevshack, no
  dependencies), imported in `_app.tsx` for the weights the built CSS uses. The Inter, Material Icons and
  Font Awesome imports in `styles/theme.scss` are deleted (no page uses them). `public/videos/gnus-ai-background.mp4`
  is deleted (nothing references it). `react-tooltip` is already out of `package.json`; its vendor SCSS is
  plain CSS. Feather and hkModular are already same-origin and stay.

### Proof
- **D-13 (D):** `scripts/check-deploy.js <baseUrl>` (Node `fetch`, no dependency): `/`, `/submit`, `/jobs`,
  `/jobs/detail?hash=0x` plus 64 hex, `/earnings` answer 200 HTML; `/no-such-page` answers 404 with the 404
  page; a `/_next/static/` file is immutable; HTML is not immutable and is `no-cache` or `max-age=0`; every
  HTML response carries the CSP in the configured mode, equal to the policy, and every D-08 header. CI runs
  it against `serve-out.js`; the deploy runs it against the deployment. `trailingSlash` stays `false` (Pages
  serves `jobs.html` for `/jobs`); the check on the host proves it.
- **D-14 (D):** `cypress/e2e/csp.cy.js` runs with `--config experimentalCspAllowList=true` (Cypress strips CSP
  headers by default) through `yarn test:csp`. It fails on any `securitypolicyviolation` and first proves the
  header is live by catching a planted one. Axe stays in the existing specs, which inject it with `eval`.
- **D-15 (D):** SEC-05: `react/no-danger` is an error over the lint directories. A `hostileText` mock profile
  puts HTML and script payloads in every wallet-text field the pages show (job origin, error, result data,
  the `-32602` message on estimate and submit); a Cypress walk of every route asserts nothing runs and the
  payloads read as text.
- **D-16 (D):** VER-06: every route, including the 404 page and the WalletConnect screens on the export,
  passes axe WCAG 2.1 A and AA in light and dark; only uncovered routes get new cases. A keyboard-only walk
  of the submit flow on the mock uses `cy.press(Cypress.Keyboard.Keys.TAB)` (Cypress 14.3 and later).

### Claude's Discretion
- Script and spec names, the order of headers, the font weights list, notice wording.

</decisions>

<human_checklist>
## What Braian must create (nothing here blocks the code)

1. Cloudflare: an account, then a Pages project for Direct Upload named as `CLOUDFLARE_PAGES_PROJECT`, production branch `main`.
2. A Cloudflare API token limited to Account > Cloudflare Pages > Edit; add it and the account id as repository secrets.
3. GitHub: environments `production` (deployment branch `main` only) and `preview`; set the variables in the table.
4. Reown Cloud: two projects. Production: allow and verify the production origin. Preview and dev: allow
   `127.0.0.1` and the preview host; if Reown cannot verify `pages.dev` hosts, the release-build walk needs
   the custom domain.
5. Later: the custom domain in Pages > Custom domains, `DASHBOARD_ORIGIN` set, and the origin sent to the wallet team for phase 46.

</human_checklist>

<canonical_refs>
## Canonical References

- `.planning/phases/06-walletconnect-browser-flow/06-CONTEXT.md` D-02, D-03, D-08
- GeniusWallet `47-CONTEXT.md` D-03 (Verify), D-15 (walk on the hosted page or, if it is not up, the local dev server)
- `.planning/research/STACK.md` (CSP block; its `frame-src 'none'` and verify notes are superseded by D-09, D-10)
- `.planning/research/PITFALLS.md` pitfalls 11, 12, 13 and 16; `.planning/REQUIREMENTS.md` SEC-05..07, DEP-02, DEP-03, VER-06
- `scripts/serve-out.js`, `.github/workflows/ci.yml`, `.github/workflows/aws-ec2-deploy.yml`, `styles/theme.scss`, `pages/_app.tsx`

</canonical_refs>

<deferred>
## Deferred Ideas

- A CSP report endpoint (needs a Worker), HSTS preload and includeSubDomains, Cloudflare Web Analytics,
  the EC2 cutover and rollback rehearsal (phase 8).

</deferred>

<gaps>
## Live checks recorded as gaps

- Real deploys and header checks on the host wait on the human checklist.
- The hosted GeniusWallet pairing and the enforcement flip wait on wallet phase 47 and Reown Verify.

</gaps>
