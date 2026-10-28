---
phase: 01-teardown-and-static-shell
reviewed: 2026-10-27T02:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - .github/workflows/aws-ec2-deploy.yml
  - .github/workflows/ci.yml
  - .gitignore
  - .gitleaks.toml
  - .nvmrc
  - __tests__/e2e/basic-smoke.test.js
  - __tests__/pages/placeholders.test.jsx
  - __tests__/scripts/check-audit.test.js
  - __tests__/utils/jest.polyfills.js
  - audit-allowlist.json
  - cypress.config.js
  - cypress/e2e/static-shell.cy.js
  - data/navbars/navbarRoutes.ts
  - jest.config.js
  - layouts/navbars/NavbarDefault.tsx
  - next.config.js
  - package.json
  - pages/404.tsx
  - pages/_app.tsx
  - pages/earnings/index.tsx
  - pages/index.tsx
  - pages/jobs/detail.tsx
  - pages/jobs/index.tsx
  - pages/submit/index.tsx
  - scripts/check-audit.js
  - scripts/check-secrets.sh
  - scripts/serve-out.js
  - sub-components/shared/Placeholder.tsx
  - tsconfig.json
findings:
  critical: 1
  warning: 4
  info: 10
  total: 15
status: issues_found
fix_status: CR-01 and WR-01..WR-04 fixed, IN-04 fixed, other info items open
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-27T02:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Scope: `git diff a3dd2e6 HEAD -- . ':(exclude).planning'`, focused on added and changed files. The deletions are clean. A grep for Redux, Web3Modal, koffi, libp2p, IPFS, `functions/`, `context/`, `store/`, `node-fetch` and `test-runner` finds nothing in app code. The only leftovers are in `jest.config.js`, SCSS imports and an old snapshot.

What I verified by running it:
- **Deploy workflow:** it can no longer run on push. The only trigger is `workflow_dispatch`, the first step runs `exit 1`, and the later steps get GitHub's implicit `success()` check, so they are skipped.
- **CI pins:** both action SHAs match their tags (`actions/checkout` v7.0.1, `actions/setup-node` v7.1.0). The gitleaks Linux checksum matches the official `checksums.txt` for v8.30.1.
- **Audit gate:** `node scripts/check-audit.js` exits 0 against the live registry. The audit reports 3 critical and 11 high advisories, and every one is allowlisted.
- **serve-out.js:** I probed it with curl. `%2e%2e`, `..%2f`, `%5c..%5c` and POST were all rejected correctly.
- **`out/`:** a grep found no infura, alchemy, quiknode, decimal-key or backtick-hex values.

Main concerns:
1. One audit allowlist premise is false for `yarn dev`.
2. The secret gate's detectors are narrower than its claims.
3. The secret gate checks only the tip of the tree, not the history a PR adds.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Audit allowlist waves through a critical Windows RCE on a false premise; `yarn dev` is an exposed Next server

**File:** `audit-allowlist.json:10` (also `:5`), `package.json:6`
**Issue:** `GHSA-p293-qw3h-jr36` is rated critical: "Unauthenticated Remote Code Execution on windows-hosted servers", affecting Pages and App router. Its allowlist reason says "no Next.js server is run or hosted". That is true of `out/` and false for development:
- `yarn dev` runs `next dev`, which is a Pages Router server.
- The team develops on Windows.
- Next 14.2.35 binds `next dev` to `0.0.0.0` by default. `node_modules/next/dist/bin/next` says `-H, --hostname ... (default: 0.0.0.0)`.

So every developer who runs `yarn dev` exposes an unpatched critical RCE to the LAN, and the gate records it as accepted. `GHSA-c4j6-fc7j-m34r` (SSRF through WebSocket upgrades to the built-in Node server) rests on the same false premise, and the dev server handles WebSocket upgrades for HMR. The gate exists to block exactly this case.
**Fix:** Bind dev to loopback, and make each reason state the real exposure:
```json
"dev": "next dev -H 127.0.0.1",
```
```json
"GHSA-p293-qw3h-jr36": "next: RCE on Windows-hosted Pages/App servers; production is a static export with no server; the only server is `next dev`, bound to 127.0.0.1 by package.json; fixed only in next >=15.5.24"
```
Apply the same wording to `GHSA-c4j6-fc7j-m34r`. The real fix is the Next upgrade that was deferred out of this phase.

## Warnings

### WR-01: The `out/` scan never runs gitleaks; five narrow regexes guard the shipped artifact

**File:** `scripts/check-secrets.sh:43-49`, `.gitleaks.toml:27`
**Issue:** `.gitleaks.toml` allowlists `out/`, so gitleaks never looks at the build output. The only thing that checks what ships is five greps: `blastapi`, `sgns_key`, PEM, `bridge-test`, and a quoted 64-hex value. These pass when they should not:
- an infura, alchemy or quiknode keyed URL inlined from a `NEXT_PUBLIC_*` variable in a developer's `.env.local` (the source rule `keyed-rpc-url` covers these, but only in source);
- any API token format covered by gitleaks' default rules;
- a 64-hex value in a template literal (backticks);
- a key written in decimal form. The deleted `sgns_key` was a 77-digit decimal string, so it would be caught only by the `sgns_key` property name.

The `out/` scan is the last line of defence for SEC-02, and right now it is the weakest one.
**Fix:** Scan `out/` with the same config, from inside `out/`, so the `^out/` path allowlist does not match. This needs no second config file:
```bash
# in check_out(), after the existing greps
(cd out && "$GL" dir . --config ../.gitleaks.toml --redact --no-banner --exit-code 1) || {
  echo "FAIL out-scan: gitleaks reported findings"; bad=1; }
```
Keep the `bridge-test` filename check.

### WR-02: Source detector is tuned to its own fixture; common key names and mnemonics pass

**File:** `.gitleaks.toml:9`, `scripts/check-secrets.sh:102`
**Issue:** `hex-private-key` matches only names containing `privkey`, `private_key`, `secret`, `mnemonic` or `seed`. The self-test fixture is `ethPrivateKey = "<hex>"`, which is the exact name the deleted `functions/ipfs/node.ts:139` used. So the self-test proves that this one historical form is caught, not that keys in general are caught. These pass the source scan:
- `const pk = "0x<64hex>"`
- `signerKey: "<64hex>"`
- `KEY="<64hex>"` in a script
- a 12 or 24-word mnemonic, for which no rule exists

For a dashboard that gets a contract client in phase 2, these are the likely leaks.
**Fix:** Add a name-agnostic rule for source, with the existing path allowlist (`.yarn/releases` and `yarn.lock` already hold the known 64-hex curve constants):
```toml
[[rules]]
id = "quoted-64-hex"
description = "Any quoted 32-byte hex value"
regex = '''["'`](0x)?[0-9a-fA-F]{64}["'`]'''
```
Then add exact-value allowlist entries for any public constants it trips on, which matches the policy comment at `check-secrets.sh:3`. Add one self-test fixture with a neutral name such as `const v = "<hex>"`.

### WR-03: The secret gate scans the working tree only; a secret added and removed inside a PR lands in history

**File:** `.github/workflows/ci.yml:16`, `:31`; `scripts/check-secrets.sh:15`
**Issue:** `gitleaks dir .` scans the checked-out tip, and `actions/checkout` defaults to `fetch-depth: 1`. Suppose a PR commits a key in commit 1 and deletes it in commit 2. The gate passes, and after a rebase or merge the key sits in `main`'s history. That is the same unrecoverable state as the existing leak (D-06), and this gate was added to prevent it.
**Fix:** On `pull_request`, also scan the commits the PR adds:
```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
  with:
    fetch-depth: 0
...
- if: github.event_name == 'pull_request'
  run: gitleaks git --config .gitleaks.toml --redact --no-banner --exit-code 1 --log-opts="${{ github.event.pull_request.base.sha }}..HEAD"
```

### WR-04: `yarn test:e2e` exits 1 on Windows and leaves the server running

**File:** `package.json:12`
**Issue:** `start-server-and-test` looks up the process tree with `wmic`. Windows 11 no longer ships `wmic`, so after Cypress passes the command crashes with `spawn wmic.exe ENOENT`, exits 1, and leaves `serve-out.js` holding port 4173 (recorded in 01-05-SUMMARY). The documented e2e gate cannot be run green on the team's main OS, so people will skip it or run an ad-hoc equivalent. The dependency exists only to start and stop one local server.
**Fix:** Let `serve-out.js` run the follow-up command itself and exit with that command's code, then drop `start-server-and-test` (deletion over addition):
```js
// end of serve-out.js
const server = http.createServer(handler).listen(port, "127.0.0.1", () => {
  if (process.argv[2]) {
    const r = require("child_process").spawnSync(process.argv.slice(2).join(" "), { stdio: "inherit", shell: true });
    server.close();
    process.exit(r.status ?? 1);
  }
});
```
```json
"test:e2e": "node scripts/serve-out.js yarn cy:run"
```

## Info

### IN-01: serve-out.js resolves `root + ".html"` outside `out/`

**File:** `scripts/serve-out.js:42-48`
**Issue:** The containment check runs on `target` and not on each candidate. For `/.` or `//`, `target === root`, so the second candidate is `<repo>/out.html`, a sibling of `out/`. It is only one fixed filename and the server is localhost-only, but the containment check is not airtight.
**Fix:** Return `index.html` whenever `target === root` (check this before the loop), or run the `startsWith(root + path.sep)` check on each candidate.

### IN-02: serve-out.js crashes on a read error; `/404` answers 200

**File:** `scripts/serve-out.js:57`, `:82-87`
**Issue:** `readFileSync` throws inside the request handler, and nothing catches it. That happens if `404.html` is missing (for example after a partial build) or if a file disappears between `isFile` and the read. The throw kills the server process. Separately, `GET /404` resolves to `404.html` and is served with status 200.
**Fix:** Wrap the handler body in try/catch and answer 500. Treat `pathname === "/404"` as not found.

### IN-03: Self-test fixture coverage is partial, and one assertion is meaningless

**File:** `scripts/check-secrets.sh:93-121`, `:115`
**Issue:**
- Only 4 of the 9 detectors have a fixture. There is none for `sgns_key`, PEM, `bridge-test` content, `public/*bridge-test*`, or any gitleaks default rule.
- The `bridge-test page in out/` case passes `$token` as the value that must not be echoed, but that token was never written to `out/`, so the "no echo" check cannot fail.

**Fix:** Plant a fixture for `sgns_key` and for `public/bridge-test.html`, and pass `"bridge-test"` (or nothing) as the echo value for the filename case.

### IN-04: jest.config.js still points at deleted modules

**File:** `jest.config.js:20-30`, `:48-61`, `:64-89`
**Issue:**
- `moduleNameMapper` still maps `@/functions`, `@/context`, `@/store`, `@/hooks` and `@/components`, which are all deleted or never existed.
- `testPathIgnorePatterns` lists seven deleted `__tests__/utils/*` files.
- `collectCoverageFrom` and the 70% `coverageThreshold` cover deleted directories, and no script runs coverage any more.

**Fix:** Delete the dead mappings, ignore patterns and coverage block.

### IN-05: Placeholder tests that cannot catch an app regression

**File:** `__tests__/basic.test.js`, `__tests__/e2e/basic-smoke.test.js`, `__tests__/__snapshots__/basic.test.js.snap`
**Issue:** These tests assert arithmetic, inline mock components and a snapshot that still lists `analytics` and `job-orders`. They inflate the Jest baseline (24 tests) without testing any app code. `e2e/basic-smoke` is not e2e.
**Fix:** Delete them. `placeholders.test.jsx` and the Cypress spec cover the shell.

### IN-06: Dependency prune left unused and misplaced packages

**File:** `package.json:15`, `:28-34`
**Issue:**
- `jest-axe` and `@testing-library/user-event` have no importer anywhere.
- `@types/react` sits in `dependencies`, so the audit gate audits it.
- `@types/node` is `^20` while the pinned engine is Node 22.

**Fix:** Remove the two unused packages, move `@types/react` to `devDependencies`, and bump `@types/node` to `^22`.

### IN-07: SCSS still imports styles for deleted libraries

**File:** `styles/theme/_theme.scss:41-43`
**Issue:** It imports the react-tooltip, tag-input and apex-chart vendor styles, but those libraries were removed in group 6c.
**Fix:** Delete the three imports and their `vendor/` files.

### IN-08: Deploy workflow keeps a dead job and commented-out code

**File:** `.github/workflows/aws-ec2-deploy.yml:15-39`
**Issue:** The steps after the `exit 1` are unreachable. They still write the SSH key to disk and use `StrictHostKeyChecking=no`. A revert of commit `55e6288` restores them anyway, so keeping them adds no rollback ability. Lines 15-17 are commented-out code.
**Fix:** Acceptable as a deliberate D-01 choice. At minimum, delete the commented-out CloudFlare block.

### IN-09: Pointless alias in `_app.tsx`

**File:** `pages/_app.tsx:11`
**Issue:** `const Layout = DefaultLayout;` is a leftover from the removed provider nesting.
**Fix:** Render `<DefaultLayout>` directly.

### IN-10: Local `.next/cache` still holds the old blastapi key

**File:** `.gitleaks.toml:26` (allowlists `.next`)
**Issue:** `.next/cache/webpack/server-production/4.pack` contains `bb92548d-...`. It is gitignored and does not ship, and the out/ grep would catch it if it leaked into `out/`. But it stays on disk and is invisible to gitleaks.
**Fix:** `rm -rf .next` once after the teardown. Optionally add `rm -rf .next` before `next build` in CI docs.

## Fix Status

| ID | Status | Commit |
|----|--------|--------|
| CR-01 | fixed: `next dev -H 127.0.0.1`; both allowlist reasons now name the dev server on loopback as the only Next server | c1b48fd |
| WR-01 | fixed: gitleaks also scans `out/` from inside it; a keyed-RPC-URL-in-out/ fixture added to the self-test | 26ea012 |
| WR-02 | fixed: one rule for any quoted or assigned 64-hex value (also backticks, 0x), one for quoted 12 or 24 word phrases; the self-test fixture uses a neutral name; two public gitleaks archive checksums allowlisted by exact value | a1282e7 |
| WR-03 | fixed: `fetch-depth: 0` and a pull_request step running `gitleaks git` over `base.sha..HEAD` | fbeee80 |
| WR-04 | fixed: `serve-out.js <command>` runs the command, stops the server and exits with its code; start-server-and-test removed, yarn.lock pruned, frozen install passes. The review snippet used `spawnSync`, which would block the server's event loop, so the fix uses async `spawn` | c117f5d |
| IN-04 | fixed: dead aliases, ignore patterns and coverage globs removed | 67f6dd5 |
| IN-01..03, IN-05..10 | open | |

Checked on Windows after the fixes: `yarn build`, `yarn test --ci` (4 suites, 24 tests), secret gate and self-test (6 fixtures), `node scripts/check-audit.js`, `yarn test:e2e` (6 Cypress tests) all exit 0.

---

_Reviewed: 2026-10-27T02:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
