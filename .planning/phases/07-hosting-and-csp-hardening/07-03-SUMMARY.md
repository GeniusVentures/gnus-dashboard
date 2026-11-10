---
phase: 07-hosting-and-csp-hardening
plan: 03
status: complete
requirements: [DEP-02]
actuals:
  tasks: 2
  commits: 2
---

# Phase 7 Plan 3: Cloudflare Pages workflow Summary

`deploy.yml` is complete and has never run: no Cloudflare account, token or domain exists. With the secrets or the project variable absent the deploy step skips itself with a notice, so pull request CI stays green.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 9442a78 | Publish the export to Cloudflare Pages: production from main, a preview per pull request |
| 2 | f506557 | Describe hosting and the checklist for switching the deploy on |

## What exists

- Three jobs. `build`: no secret, environment `production` on a push and `preview` on a pull request, frozen install, `yarn build` with the environment's Reown id, `check-deploy.js` against `serve-out.js`, artifact `out`. `deploy`: downloads the artifact and runs `cloudflare/wrangler-action` (commit 953926a, v4.1.3) with wrangler 4.154.0 and `pages deploy out --branch=main` or `pr-<number>`; it never checks out code and only its first step and wrangler touch the token. `verify`: no secret; runs `check-deploy.js` on the deployment URL and, on a push, on `DASHBOARD_ORIGIN`.
- Fork pull requests skip `build`, so the other jobs skip too. Every action in `deploy.yml` and `ci.yml` is pinned to a full SHA with its version; the upload and download action SHAs were read from the tags with `gh`.
- The skip script was run locally with none, one and all three values set (notice text and `ready` output as intended). YAML parses.
- 15 Jest cases read the workflow as text; `aws-ec2-deploy.yml` is unchanged and a test holds it manual and failing.

## Deviations

- The token is passed as step `env` only to the configuration check, not at job level, to keep it away from the download action.
- `DASHBOARD_ORIGIN` reaches `verify` as a `deploy` job output, because an environment variable is visible only to a job that names the environment.

## Pending human steps (nothing ran)

1. Cloudflare account, a Direct Upload Pages project (production branch `main`), an API token limited to Account > Cloudflare Pages > Edit.
2. GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `CLOUDFLARE_PAGES_PROJECT`; environments `production` (branch `main` only) and `preview`, each with its own `NEXT_PUBLIC_WC_PROJECT_ID`; `DASHBOARD_ORIGIN` later.
3. Open a pull request: `pr-<number>` deploys and `verify` passes; `curl -sI` shows the report-only header and an immutable static file; the pairing code appears with no CSP report.

## Self-Check: PASSED
