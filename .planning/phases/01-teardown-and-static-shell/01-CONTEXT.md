# Phase 1: Teardown and static shell - Context

**Gathered:** 2026-10-27 (overnight, auto; every decision is (D), not yet reviewed by Braian)
**Status:** Ready for planning

<domain>
## Phase Boundary

Delete everything v1 does not keep (server SDK path, explorer, Web3Modal, OrderForm, price and gas pill,
Redux), make `yarn build` a static export with placeholder pages for the v1 routes, remove secrets from
source with CI gates that prove they stay out, and make sure a merge to `main` can no longer restart the
live EC2 app on a static build. No new feature code: the contract client is phase 2.

</domain>

<decisions>
## Implementation Decisions

### Deploy safety
- **D-01:** Change `.github/workflows/aws-ec2-deploy.yml` to `on: workflow_dispatch` only (no `push` trigger) and add a first step that fails with a clear message ("static export: EC2 deploy disabled until cutover, see DEP-04/DEP-05"). Keep the file so the old deploy can be restored for rollback by reverting one commit. — **Reversibility:** reversible — one-commit revert.
- **D-02:** Nothing is pushed tonight. CI changes are verified by running the same commands locally; that remote CI has not run is recorded in the phase VERIFICATION.

### Teardown order
- **D-03:** Delete in groups, each its own commit with `yarn build` and `yarn test` (or the repo's Jest command) green between groups: (1) explorer pages and data, (2) server SDK path (`functions/`, `pages/api/`, koffi, `data/*` native binaries, protobuf, libp2p), (3) Web3Modal + `OrderForm.tsx` + `data/orderForm/*`, (4) price/gas pill, (5) Redux, (6) dependency prune and lockfile, (7) static export config and placeholder routes. Record the Jest/Cypress counts before group 1 and after group 7.
- **D-04:** Tests that only cover deleted code are deleted with it, and the plan lists them by name so the before/after count difference is explained, never silently dropped.

### Theme without Redux
- **D-05:** Redux is deleted; nothing switches the theme today, so no theme module, no persistence, no test; the theme renders as today. (revised 2026-10-27 overnight: no switch exists. `changeSkin` was never dispatched and no stylesheet selects on `data-theme`.)

### Secrets and CI gates
- **D-06:** Remove the literal key, `data/secure_storage.json` and the keyed RPC URL from the tree in the same group that deletes their code. Do not rewrite git history (that is a human decision tied to key rotation, DEP-04); note in VERIFICATION that the key stays in history.
- **D-07:** Secret gate: a `scripts/check-secrets` step (gitleaks via its GitHub Action or `npx`-free binary if available, plus a grep of `out/` for hex keys, `blastapi`, `bridge-test.html`). Prove it with a planted fixture that the test removes again. Audit gate: `yarn audit --groups dependencies` (or `npm audit` on a generated lock) failing on high/critical, with a checked-in allowlist file, one reason per entry.
- **D-08:** Pin Node with `.nvmrc` and `engines` to the version the repo builds with today (verify locally; Next 14.2 needs Node 18.17+).

### Static export
- **D-09:** `output: 'export'`, `images.unoptimized: true`, keep `reactStrictMode` as the research recommends (true), no `headers()`/rewrites/redirects. Placeholder pages for `/`, `/submit`, `/jobs`, `/jobs/detail`, `/earnings` and a custom `pages/404.tsx`. `trailingSlash` left at the default until the host is chosen (phase 7).
- **D-10:** Bump Next only within 14.2.x if needed for export fixes; no major upgrade (research D3).

### Claude's Discretion
- Exact group boundaries if a dependency spans two groups; file names for the theme module and scripts.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` § Phase 1 (5 success criteria); `.planning/REQUIREMENTS.md` SHELL-01..09, SEC-01..03, DEP-01
- `.planning/research/SUMMARY.md` § Decisions D1-D7, Implications phase 1; `research/STACK.md` (what to delete, export findings); `research/PITFALLS.md` pitfalls 1, 12, 13, 16
- `.planning/codebase/ARCHITECTURE.md` § Server-Process Dependence (exact seams), `CONCERNS.md`, `TESTING.md`
- `.github/workflows/aws-ec2-deploy.yml`

</canonical_refs>

<code_context>
## Existing Code Insights

- `pages/_app.tsx` nests Redux > Web3Modal > Prices > IPFS > Layout; all but Layout go.
- `store/appSlice.js` `changeSkin` mutates `document` inside the reducer; that side effect is what the theme module keeps.
- `data/navbars/navbarRoutes.ts` holds nav entries for deleted pages.
- Both `yarn.lock` and `package-lock.json` are committed; `yarn.lock` is authoritative (Yarn Classic vendored in `.yarn/releases`).
- The main checkout has an untracked `public/bridge-test.html`; it is not in this worktree and must never be committed (the out/ grep covers it).

</code_context>

<deferred>
## Deferred Ideas

- Next 16 upgrade (follow-up after phase 1).
- Git history rewrite for the leaked key (human, with rotation).

</deferred>
