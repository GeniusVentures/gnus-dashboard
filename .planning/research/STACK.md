# Technology Stack

**Project:** GNUS Dashboard v1 (static SPA, wallet-backed)
**Researched:** 2026-10-26
**Scope:** stack additions, removals and changes for v1. The current system is described in `.planning/codebase/STACK.md` and is not re-researched here.

How this was verified: npm registry (`npm view`), official docs (nextjs.org, docs.reown.com, zod.dev, tanstack.com), and by running things. I built a throwaway Next 14.2.35 pages-router app with `output: 'export'` to test the static-export rules, installed `@walletconnect/sign-client` and `@walletconnect/universal-provider` 2.26.0 and read their code, and measured bundle sizes. Findings from those runs are marked "(built)" or "(source)" and are HIGH confidence.

## Verdict in one paragraph

Keep Next 14.2.35 (pinned) and React 18.3.1 for v1 and export statically. Add exactly four runtime libraries: `@walletconnect/sign-client` (browser transport), `@tanstack/react-query` (async state), `zod` (the contract as code, validates every wallet reply), `qrcode.react` (pairing QR). Do not use AppKit, Web3Modal, UniversalProvider, ethers or viem in the dashboard. Delete about 60 of the 77 current runtime dependencies. Serve `out/` from a static host that sets headers from a file in the repo, with a strict CSP that works with `script-src 'self'` (verified: the export has no inline scripts). Plan a Next 16 upgrade as a separate follow-up, not part of v1.

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js (pages router) | 14.2.35, pin exactly | Static export (`output: 'export'`) | Constraint from PROJECT.md; export works on 14 (built). Last 14.x release. See "Next 14 or move" below for the EOL tradeoff. | HIGH |
| React / react-dom | 18.3.1, pin | UI | Next 14 peers on `^18.2.0` only. | HIGH |
| TypeScript | ^5.9.3 | Types | npm `latest` is 7.0.2, but nothing here has been tested on it with Next 14. Stay on 5.x. | MEDIUM |
| Node (build only) | 22 LTS, add `.nvmrc` and `engines` | Build and tests | Repo pins nothing today. Next 14 needs >=18.17; my export build ran on Node 22.19. No Node at runtime in v1. | HIGH |
| Yarn Classic | 1.x (vendored) | Package manager | Constraint. Delete `package-lock.json`; `yarn.lock` is authoritative. | HIGH |
| Bootstrap 5 / react-bootstrap / Sass | keep current | Layout and theme | Not part of the data-path re-architecture; leave alone. | HIGH |

`next.config.js` for v1 (all items verified by build):

```js
module.exports = {
  output: 'export',
  images: { unoptimized: true },   // default loader fails the export build
  trailingSlash: false,
  reactStrictMode: false,          // keep current; revisit separately
};
```

No `headers()`, `rewrites()`, `redirects()`: Next prints "will not automatically work with output: export" for each (built) and they do nothing. Headers move to the host (see Hosting).

### Wallet transport (browser path)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@walletconnect/sign-client` | 2.26.0, pin exactly | WalletConnect session to GeniusWallet, `request()`, `session_event`, `session_delete` | Smallest layer that sends custom `eip155` methods and fails closed. Not deprecated: last published 2026-10-21, and current Reown docs list it as the dApp Sign API. See comparison below. | HIGH |
| `qrcode.react` | ^4.2.0 | Render the `wc:` pairing URI as an SVG QR | SVG is inserted into the DOM, so it needs no `img-src data:` or canvas. React 18 and 19 peers. Tiny. | HIGH |
| Injected `window.gnus` | no dependency | WebView transport | Plain object with `request/on/removeListener`; wrap it, do not adapt it through ethers or viem. | HIGH |

Load the WalletConnect transport only with a dynamic `import()` after detection says "no `window.gnus`". Measured (built): the sign-client chunk is 137 KB gzip (469 KB raw), not in any page's First Load JS, so the WebView never downloads it. A page with react-query + zod is 34 KB route size on top of the 80.7 KB shared baseline. The dynamic import also keeps sign-client out of prerendering (it touches IndexedDB), and the export built clean with it.

### Data and validation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| `@tanstack/react-query` | ^5.105.0 | Cache, dedupe, cursor pagination, mutation state for `gnus_*` calls | See "Data fetching" below. React `^18 || ^19` peer. | HIGH |
| `zod` | ^4.6.7 | One schema per method result and event; branded `SdkAddress` / `EvmAddress`; decimal-string amounts; nullable fields | Enforces the contract rules at the single trust boundary: two address formats never mix, amounts are strings, null is "not available yet". Compiles under the repo's `moduleResolution: node` with `strict` on (built, `zod` and `zod/mini` both resolved). | HIGH |
| Native `BigInt`, `crypto.randomUUID()`, `fetch` | built in | Amount formatting, idempotency keys, any plain HTTP | Replaces ethers `formatUnits`, `uuid`, `axios`. Needs a secure context, which the pinned https origin and localhost both are. | HIGH |

Zod requires `"strict": true` in tsconfig (zod.dev: "You must enable `strict` mode"). The repo has `strict: false` today. After the explorer and server code are deleted the remaining TS surface is small, so flip `strict: true` in the same phase that adds `lib/gnus`. Fallback if legacy errors drag: a second `tsconfig.strict.json` that covers only `lib/gnus` and the new pages, run in CI. Strict null checks also matter on their own: "render null as not available, never as 0" is only enforced by the compiler with `strictNullChecks`.

Do not duplicate the SDK's processing-definition schema in zod. The wallet owns it and answers `-32602` for a bad job. The dashboard checks only that `job` is an object. One owner per rule.

### Testing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Jest + `next/jest` | ^30.5.2 (keep) | Unit and component tests; client and transports with a fake provider | Already installed and working with Next 14. | HIGH |
| `jest-environment-jsdom`, Testing Library (react 16.3, dom 10.4, jest-dom 6.6, user-event 14.6) | keep | Component tests | Keep. | HIGH |
| `jest-axe` | ^10 (keep) | a11y smoke | Keep. | MEDIUM |
| Cypress | keep ^14.5.x | E2E against the built `out/` | Already a devDependency but unused: no `cypress/` directory or config is tracked (`git ls-files` shows none). Use `cy.visit(url, { onBeforeLoad(win) { win.gnus = mock } })` to inject the mock at document start, and dispatch `gnus#initialized` later for the late-injection case. Cypress 16.2.0 exists but needs Node 22/24; stay on 14 unless Node is pinned and there is a reason. | MEDIUM |
| Mock `window.gnus` | own code, about 150 lines in `lib/gnus/mock` | Dev server, Jest and Cypress share it | Scripted scenarios: ready, `4900` not ready, `4901` switching, `-32011` insufficient balance, `-32014` / `bridgedNotProcessed`, null earnings, wallet offline (never resolves), late injection, `gnus_jobUpdated` pushes. | HIGH |

No MSW: there is no HTTP between the page and the wallet. No Playwright: Cypress is already here. Revisit only if WebKit-engine coverage becomes a requirement (WKWebView on iOS/macOS, WebKitGTK on Linux), since Playwright's WebKit is the closer proxy for those wallet WebViews than Cypress's engines.

Remove `react-test-renderer ^19` (mismatched with React 18, unused by the new code) and `node-mocks-http` (API route tests only). `jest.config.js` maps styles to `identity-obj-proxy`, which is not in `package.json`; add it or let `next/jest` handle CSS/SCSS and delete the mapping.

### Hosting and headers
| Technology | Purpose | Why | Confidence |
|------------|---------|-----|------------|
| Static host with headers-as-code (Cloudflare Pages `public/_headers`, or S3 + CloudFront response-headers policy, or nginx on the existing EC2) | One pinned https origin per network, strict CSP | `next.config.js` headers do nothing in a static export (built). `frame-ancestors` cannot be set from a `<meta>` CSP, so a real header is required. Cloudflare Pages is the smallest change (a deploy trigger is already scaffolded, commented out, in the current workflow; `_headers` lives in the repo). The host choice is Braian's, not settled by research. | MEDIUM |
| `scripts/serve-out.js` (about 20 lines, no dependency) | Serve `out/` for e2e with the same CSP | `next start` does not work with `output: 'export'`. E2E must run against the real headers or the CSP is untested. Generate `_headers` and this server's headers from one `csp` constant. | MEDIUM |

CSP starting point (verified inputs: the exported HTML has only `src=` scripts plus one `<script type="application/json" id="__NEXT_DATA__">` data block, no executable inline script; the sign-client chunk contains no `eval(` or `new Function(`):

```
default-src 'none';
script-src 'self';
style-src 'self'; style-src-attr 'unsafe-inline';
img-src 'self'; font-src 'self'; media-src 'self'; manifest-src 'self';
connect-src 'self' wss://relay.walletconnect.org wss://relay.walletconnect.com;
frame-src 'none'; frame-ancestors 'none';
base-uri 'none'; form-action 'none'; object-src 'none';
upgrade-insecure-requests
```

Notes on this policy:
- Ship it as `Content-Security-Policy-Report-Only` first, with a Cypress hook that fails any test on a `securitypolicyviolation` event.
- `style-src-attr 'unsafe-inline'` is needed because prerendered HTML carries `style="..."` attributes; the default Next 404 page already has one (built). A custom `pages/404.tsx` plus avoiding style props in prerendered markup would let you drop it. React setting styles through the CSSOM at runtime is not blocked.
- `react-tooltip` 5 injects a `<style>` tag at runtime, which `style-src 'self'` blocks. Use its `disableStyleInjection` prop and import the CSS file, or replace it.
- WalletConnect endpoints seen in the sign-client chunk (built): `wss://relay.walletconnect.org`, `https://pulse.walletconnect.org/batch` (telemetry), `https://rpc.walletconnect.org/v1`, `https://verify.walletconnect.org|com`, `https://echo.walletconnect.com`. Pass `telemetryEnabled: false` to `SignClient.init` (the option exists on the Core types) and `pulse` drops out of `connect-src`. `rpc` is only hit by UniversalProvider fallbacks, `verify` is the wallet-side attestation iframe, `echo` is push; none is needed for a dApp using sign-client. Reown's own AppKit CSP lists both relay hosts (`.org` and `.com`), so keep both. Confirm with report-only on a real pairing before enforcing.
- No `connect-src` entry is needed for the WebView path: `window.gnus` is a JS bridge, not a network call.
- Third-party assets that break `default-src 'none'` today, from `styles/theme.scss` and `layouts/DefaultLayout.tsx`: Google Fonts CSS (Inter, Roboto, Material Icons), Font Awesome 5.11.2 from cdnjs (no SRI), and a Pinata-hosted background video. Self-host the fonts (`@fontsource-variable/inter`, `@fontsource/roboto`, `material-icons`, `@fortawesome/fontawesome-free` only if the icons are still used) and ship or drop the video. Each runtime third party is also something the wallet WebView must fetch.
- Cache policy: `/_next/static/*` immutable, HTML `no-cache`, so a wallet WebView on a pinned origin always picks up a new build. Also send `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and HSTS.

## WalletConnect: which library for custom `gnus_*` methods

| Option | Custom method in `eip155` | Fails closed on unapproved method | Events | Weight / CSP | Verdict |
|--------|--------------------------|-----------------------------------|--------|--------------|---------|
| `@walletconnect/sign-client` 2.26.0 | Yes: `connect({ optionalNamespaces: { eip155: { chains, methods, events } } })`, `request({ topic, chainId, request: { method, params } })` | Yes (source): `request()` throws `request() method: X` locally if X is not in the approved session namespaces | `session_event` delivered only if the event name is in the approved namespace and `chainId` is an approved chain; otherwise dropped (source) | 137 KB gzip lazy chunk. Needs your own QR. Fewest hosts. | **Use** |
| `@walletconnect/universal-provider` 2.26.0 | Yes via the same namespaces | **No** (source): for an `eip155` method not in the approved list it falls through to `getHttpProvider().request(...)`, an HTTP JSON-RPC call to `rpc.walletconnect.org` | Re-emits `accountsChanged` / `chainChanged` specially; custom event names are passed through | Adds an EIP-1193 facade you do not need | Avoid |
| `@reown/appkit` 1.8.24 (+ ethers or wagmi adapter) | Only through `universalProviderConfigOverride` (methods, events, chains per namespace) | Inherits UniversalProvider's fall-through | Same | Pulls viem, valtio, Lit UI, pay/wallet packages; calls Reown API hosts; needs a long CSP and a Reown Cloud project allowlist. Pins `@walletconnect/universal-provider` 2.23.7, so mixing it with sign-client 2.26.0 duplicates the WalletConnect core. A `2.0.0` canary exists, so a major is coming. | Avoid for this app |
| `@web3modal/ethers` 5.1.11 (current) | No documented path | n/a | n/a | Superseded by AppKit; the deprecation page lists `@web3modal/*` -> `@reown/appkit-*` | Remove |
| `@walletconnect/modal` 2.7.0 | n/a | n/a | n/a | Deprecated: the Reown dApp docs say "use @reown/appkit instead" | Do not add |

Why not just use AppKit for the nice wallet picker: the dashboard talks to one wallet, GeniusWallet. A wallet list adds nothing, and the AppKit stack costs a long CSP, third-party API calls from a page that handles job data, and a version-pinning problem. A 60-line connect dialog (QR, copy-URI button, "waiting for wallet" and "rejected" states) is smaller than the integration glue. If a deep link scheme for GeniusWallet exists, add an "Open GeniusWallet" button that opens the `wc:` URI; the wallet side has to confirm that.

How the transport should use it (all from source or docs):
- Propose `optionalNamespaces` only, with `requiredNamespaces: {}`. `requiredNamespaces` is deprecated in the Reown docs. Chains `['eip155:80002']` plus the wallet's GNUS chains once known. Methods and events are exactly the contract's list. The wallet must echo the methods and events it supports in its approved namespace, or the dApp cannot call or hear them.
- Wallet-side requirement to hand to the wallet milestone: every `session_event` must carry a `chainId` that is in the approved session (here `eip155:80002`), and the event name must be in the approved `events`. Otherwise the dApp's engine silently drops it (source). `gnus_jobUpdated` and `gnus_accountsChanged` are therefore only as reliable as that.
- Approved session accounts are CAIP-10 `eip155:80002:<evmAddress>`, so the session is tied to the EVM payer. An `sdkAddress` (`0x` + 128 hex) cannot be a session account and must come from `gnus_getAccounts`. A payer with `evmAddress: null` cannot be paired; the wallet must decide what that user sees. Flag for the wallet side.
- `request()` takes an `expiry`. Reads: 60 s as the contract suggests. `gnus_submitJob` waits on a human, so pass a long bounded expiry (WalletConnect caps request expiry; the contract's "none" must become a bounded value such as 1 hour with a "still waiting on the wallet" state, not an infinite spinner). Confirm the exact bounds in a spike; I did not pin them down.
- Never reuse `pairingTopic` in `connect()`: the engine logs that it is deprecated and will be removed in the next major (source). Restore with `client.session.getAll()` after reload, then `client.ping({ topic })`; if the ping fails show "wallet offline", do not silently forget the session.
- Map `session_delete` and expiry to the contract's `disconnect` event so the UI has one disconnect path for both transports.
- Make the SignClient injectable (`createWalletConnectTransport({ init })`) so Jest can drive the transport with a fake and never touch the relay.
- Pin `@walletconnect/sign-client` to an exact version. The `@walletconnect/*` packages release in lockstep (core, utils, types, all 2.26.0 here); a floating range can produce mixed copies.

## Typed client and mock provider (no library needed)

Build `lib/gnus/` as the only module that knows the wire format:

```
lib/gnus/
  schema.ts        zod schemas = the contract (methods, results, events, error codes); branded address types
  transport.ts     interface GnusTransport { request(req): Promise<unknown>; on(ev, h): void; removeListener(ev, h): void }
  injected.ts      window.gnus wrapper + 'gnus#initialized' wait (3 s) + version check
  walletconnect.ts dynamic-imported; sign-client wrapper implementing GnusTransport
  client.ts        typed methods: getAccounts, estimate, submitJob, listJobs, getJob, getEarnings; parses every reply with zod; maps errors to a typed GnusError { code, message, data }
  mock/            createMockGnus({ scenario }) implements the same shape; only included when NEXT_PUBLIC_GNUS_MOCK === '1'
```

- Parse results with zod and reject on mismatch with a "wallet contract mismatch" error that shows the received `window.gnus.version`. This is the guard against contract skew while the contract is a draft and bumps `version` on breaking changes.
- The mock must be unreachable in production builds. Gate the import with `process.env.NEXT_PUBLIC_GNUS_MOCK === '1'` inside a dynamic `import()` so Next folds the constant and drops the chunk, and add a CI check that greps `out/` for a mock marker string. A mock that returns plausible numbers in production contradicts the Core Value.
- The wallet owns the contract, so ask the wallet milestone for machine-readable fixtures (example replies per method, including error payloads) and run them through the zod schemas in Jest. That is the contract test between the two repos. Until then the schemas are a hand transcription of `research/gnus-rpc-contract.md` and drift is possible.
- Amounts: schema type is `z.string().regex(/^\d+$/)`, formatted with a small `formatUnits(value: string, decimals: number)` over `BigInt`, with one test. The estimate result carries no `decimals`, and open question U1 (cost units) is unresolved; the display function must take decimals as input from the wallet and not hardcode 18. Raise this as a contract request.
- Keep two address brands (`SdkAddress` = `^0x[0-9a-f]{128}$`, `EvmAddress` = `^0x[0-9a-f]{40}$`) so passing one where the other is expected is a type error.
- Idempotency key: `crypto.randomUUID()`, stored in `localStorage` against the pending submit before the call, reused on reload, cleared on a final result. That is what makes the wallet's 24 h replay protection work across a page reload.

## Data fetching and caching: react-query, not plain hooks

Use `@tanstack/react-query` v5. Reasons specific to this app:
- Every request is a relay round trip over WalletConnect. Dedupe and caching matter, and each of my jobs, job detail and earnings screens would otherwise reimplement loading, error and stale handling.
- Account switching is a correctness issue. Key every query by `sdkAddress` (`['jobs', sdkAddress]`), and on `gnus_accountsChanged` set the accounts query. A switched account then reads a different cache entry and cannot show the previous account's jobs or earnings. Plain hooks can do this, but it is exactly the sort of misleading-number bug a keyed cache removes.
- Events become cache updates: `gnus_jobUpdated` -> `setQueryData` for that job and invalidate the list. This is the "live-updated" requirement without a polling loop; add `refetchOnWindowFocus` (default on) so returning from the wallet app on a phone refreshes.
- `useInfiniteQuery` fits the cursor pagination of `gnus_listJobs`.
- `useMutation` models `gnus_submitJob` (pending -> submitted | bridgedNotProcessed | error) without retry.

Settings that are not the defaults, and why:
- `networkMode: 'always'` for queries and mutations. The default `'online'` pauses fetches on `navigator.onLine === false`; here "offline" means "wallet unreachable", which is a timeout, not a browser flag (TanStack docs: use `always` for non-HTTP sources).
- `retry`: never retry on contract errors (`4001`, `4100`, `4200`, `4900`, `4901`, `-32602`, `-32010`...). Retry reads once or twice on timeout only. Mutations: `retry: 0`, always. An automatic retry of a spend call is the failure this design exists to prevent.
- Do not use `persistQueryClient` or any storage for job or earnings data. Cached values from a previous session or account are the "fake or misleading number" risk. Only the idempotency key is persisted.
- No devtools in production. `@tanstack/react-query-devtools` is optional and dev-only, loaded dynamically.

Plain hooks win only if there were two or three simple reads. There are six methods, two transports, four event types and a pagination cursor. SWR was considered and rejected: no mutation or infinite-query primitives of this quality, and it would still need hand-written event handling.

Redux Toolkit and react-redux are removed. The only slice, `store/appSlice.js`, stores `skin` and sets `data-theme` on `<html>`; replace with one small module or drop the theme switch. Connection state (detecting, connecting, ready, wallet offline, SDK not ready, switching, disconnected) is a single `useSyncExternalStore` store or context in `lib/gnus`; no state library is needed.

## Next 14 static export: rules that bite this repo (all built and tested)

| Rule | Evidence | Action |
|------|----------|--------|
| No API routes, `getServerSideProps`, ISR, i18n routing, middleware | Next docs, Static Exports page | Delete `pages/api/*`. Nothing in `pages/` uses `getServerSideProps` or `getStaticProps` today (grep). |
| `next/image` default loader fails the build | Built: "Image Optimization using the default loader is not compatible with export" | Set `images: { unoptimized: true }`. |
| `headers()`, `rewrites()`, `redirects()` are ignored with a warning | Built | Move to the host. |
| Dynamic route without `getStaticPaths` exports one shell file literally named `jobs/[id].html` | Built: `out/jobs/[id].html` for page `/jobs/[id]`, `query: {}` | Do not use a dynamic route for job detail. Job ids exist only at runtime, so a plain static host would 404 `/jobs/abc` on a hard load or reload, and a custom rewrite is host-specific. Use `/jobs/detail?id=...` (or `?hash=` when `jobId` is null) and read `router.query` after `router.isReady`. Built and exported as `jobs/detail.html` with no host config. |
| `getStaticPaths` with `fallback: true` / `'blocking'` unsupported | Next docs | Not applicable once there is no dynamic route. |
| The old `pages/[...].tsx` catch-all and `.htaccess` SPA fallback | Existing code | Delete both. Unknown paths use `404.html`. Add a custom `pages/404.tsx`. |
| Prerender runs in Node | Built: the sign-client dynamic import prerendered fine | Never import `window.gnus`, WalletConnect or storage at module top level; touch them only in effects or event handlers. |
| `dotenv/config` import in `_app.tsx` | Existing code | Remove. Client code reads only `NEXT_PUBLIC_*` values, which are inlined at build time. The WalletConnect/Reown project id becomes `NEXT_PUBLIC_WC_PROJECT_ID`. |
| `next dev` still works and uses `eval` | Known | Fine for dev; CSP is checked only against the built `out/`. |

## Next 14 or move

**Recommendation: stay on 14.2.35 for v1, and plan Next 16.4 as a separate follow-up. Confidence MEDIUM-HIGH.**

Facts:
- Next 14 is listed under "Unsupported Versions" on nextjs.org/support-policy. Next 15 is Maintenance LTS with a two-year window that ends about now (the page implies about October 2026; the exact date is an inference). Next 16 is the Active LTS, current `latest` is 16.4.3.
- `npm audit` on a bare 14.2.35 install reports 25+ Next advisories plus PostCSS ones, and the only offered fix is `next@16.4.3` (built, run today). Almost all concern features a static export does not ship or run: the image optimizer, React Server Components and Server Actions, rewrites, middleware, custom servers, the `next start` cache. One that can matter client-side is XSS in `beforeInteractive` scripts with untrusted input (do not use `beforeInteractive`). PostCSS advisories apply to build-time CSS processing of untrusted CSS, which is not our input.
- So the runtime risk for a static export is the static host plus the client bundle, not the Next server. The real costs of staying are a failing audit gate (an `origin/security/cicd-dependencies` branch exists and may add one), no future Next fixes, and drifting ecosystem peer ranges.
- Next 14's browser baseline is Chrome 64 / Edge 79 / Firefox 67 / Safari 12; Next 16's is Chrome 111 / Safari 16.4. The wallet embeds WebView2, WKWebView, Android WebView and a runtime-loaded WebKitGTK whose version depends on the user's Linux distro. Staying on 14 is not a guarantee (sign-client already needs a modern engine), but v1 should not narrow the WebKitGTK range for free.
- Next 16 breaks specific things here: Turbopack is the default for `next build` and the repo's Sass uses `@import "~bootstrap/scss/..."` in `styles/theme.scss` and `styles/theme/_utilities.scss` (Turbopack rejects the `~` prefix; fix by removing the tilde or building with `--webpack`); `next lint` is removed (switch to the ESLint CLI; `eslint-config-next@16` needs ESLint 9+); Node >=20.9; TypeScript >=5.1. React 18.2+ is still accepted (peer range `^18.2.0 || ^19`), so the React upgrade is not forced.
- Doing the framework migration and the data-path re-architecture together doubles the unknowns while the bridge is still pre-merge.

Trigger to upgrade early: a CI audit gate that cannot be waived, a hosting or security review that rejects an EOL framework, or a need for a library that drops Next 14. Cheapest moment: right after the deletion phase, when the codebase is smallest. The follow-up scope is: `next` 16.4.x, drop tilde imports, move to ESLint flat config, Node 22, re-run the CSP report-only pass. Do not run `yarn audit` as a blocking gate in v1 without an allowlist that records the reason (static export, feature not shipped).

Also fix a version mismatch that exists now: `eslint-config-next ^13.3.1` against `next ^14`. Align it to `14.2.35` (or the follow-up version) and keep ESLint at `^8.57`.

## What to delete

Every item below is either unimported in app code (grep of source outside `__tests__`) or belongs to the server, native SDK or explorer that v1 removes. Verify with `yarn build` and the test suite after each group, and grep once more before removing the "check first" items.

**Server and native**
- Dependencies: `koffi`, `dotenv`, `nodemon`, `node-cache`, `tsc` (a placeholder npm package, not TypeScript), `string_decoder`, `node-mocks-http`.
- Files: `functions/` (includes `ipfs/node.ts` with the literal private key and `koffi` loader, `ipfs/structs.ts`, `messages/*`), `pages/api/**`, `data/GeniusSDK.dll` (26.5 MB binary in git), `data/secure_storage.json`, `data/dev_config.json`, `data/ipfs/`, `data/prepared/`, `testProcess.json`, `package-lock.json`, `.htaccess`, `.github/workflows/aws-ec2-deploy.yml` (replace with a static build and deploy; its `StrictHostKeyChecking=no` and un-deleted key file go away with it).
- Git history still contains the private key and the keyed RPC URL; removing files does not remove them. Rotation is the human action already noted in PROJECT.md.

**libp2p / IPFS leftovers (declared, zero imports)**
- `libp2p`, every `@libp2p/*` (autonat, bootstrap, circuit-relay-v2, crypto, dcutr, echo, identify, kad-dht, keychain, mplex, peer-id, peer-id-factory, ping, plaintext, tcp, webrtc, websockets), `@chainsafe/libp2p-gossipsub|noise|yamux`, `@multiformats/dns|multiaddr|multiaddr-matcher`, `helia`, `@helia/delegated-routing-v1-http-api-client`, `@ipld/dag-pb`, `@dcdn/graphsync`, `blockstore-core`, `datastore-core`, `it-pipe`, `any-signal`, `delay`.

**Protobuf (only the deleted server decoder used it)**
- `@bufbuild/protobuf`, `@bufbuild/protoc-gen-es`, `protobufjs`, `protons-runtime`, `protons`, `@protobuf-ts/plugin`, and the folder `data/protobuf/`. If a later phase needs to decode SuperGenius transactions, that is a wallet or SDK job under the contract, not a dashboard one.

**Wallet and web3 (replaced by the transports)**
- `@web3modal/ethers`, `@reown/appkit`, `@reown/appkit-adapter-ethers`, `@reown/walletkit` (that is the wallet-side library, it should never be in a dApp), `@walletconnect/core`, `@walletconnect/utils`, `@walletconnect/web3-provider` (the dead v1 package), `@coinbase/wallet-sdk`, `ethers`.
- Files: `context/wallet/Web3Modal.tsx`, ABI and `bridgeOut` code in `sub-components/job-order/OrderForm.tsx`, `config/config.ts` (contract addresses, RPC URLs, project id; keep only the WalletConnect project id and chain id constants, via env).
- The dashboard never calls `bridgeOut` or reads the chain; `ethers` has no remaining job. Use BigInt for amounts.

**Misc and small**
- `uuid` -> `crypto.randomUUID()`; `axios` -> `fetch` (or nothing, if the price display is deferred); `bs58`, `cheerio`, `@types/cheerio`, `validator`, `@types/validator` (check the two `validator` imports first; likely replaceable by a regex or zod), `react-transition-group` (react-bootstrap brings its own), `@reduxjs/toolkit`, `react-redux`, `next-seo` (one use; `next/head` is enough).
- `react-test-renderer`, `node-mocks-http`.

**Explorer UI (out of scope per PROJECT.md; delete with the pages)**
- Pages: `pages/address`, `pages/block`, `pages/transaction`, `pages/analytics`, `pages/[...].tsx`; plus `data/charts`, `data/map`, `sub-components/dashboard/analytics`, `BlockchainInfo.tsx` and its random-data generators.
- Dependencies: `apexcharts`, `react-apexcharts`, `recharts`, `react-gauge-component`, `react-simple-maps`, `@pathofdev/react-tag-input` (check first: zero imports found, may be used by the job form), `@formkit/auto-animate` (5 imports; keep if the kept pages use it).

**Decide, then act**
- GNUS price and gas display (`usePrices.tsx`, CoinGecko and CoinPaprika, `/api/gas/gasPrice`) is not in the v1 Active requirements. Recommendation: defer. The gas route is deleted with the server. If the price stays, it needs `connect-src` entries for `api.coingecko.com` and `api.coinpaprika.com` and a plain `fetch` hook; the "highest of two sources" rule in the current code is a misleading-number risk worth revisiting.

Result: about 77 runtime dependencies down to roughly 14 (next, react, react-dom, bootstrap, react-bootstrap, sass, react-toastify, react-tooltip, @formkit/auto-animate, plus the four new ones and a few UI leftovers).

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| WalletConnect client | sign-client | `@walletconnect/universal-provider` | Unapproved custom methods fall through to an HTTP RPC call to `rpc.walletconnect.org` carrying the params, instead of failing locally (source). Job definitions should not leave through that path. |
| WalletConnect client | sign-client + own dialog | `@reown/appkit` | Weight, CSP breadth, third-party API calls, version pin conflict with universal-provider 2.23.7, upcoming 2.0 canary, and a wallet picker the app does not need. Reasonable only if the product wants multi-wallet browsing later. |
| WalletConnect client | sign-client | keep `@web3modal/ethers` v5 | Superseded by AppKit; no documented custom-method path; drags ethers. |
| Async state | react-query v5 | Plain hooks | Account-keyed cache, event-driven updates, cursor pagination and mutation state are all needed; see above. |
| Async state | react-query v5 | SWR 2.5 | No equal mutation or infinite-query story for a spend call. |
| Validation | zod 4 | Hand-written type guards | Contract is draft and versioned; runtime parse catches skew; branded addresses. Costs the `strict` flip, which is wanted anyway. |
| Amount math | native `BigInt` | ethers `formatUnits`, bignumber.js | The dashboard only formats decimal strings; no extra library. |
| Next | 14.2.35 now | 16.4.3 now | Two migrations at once; Sass `~` imports; ESLint 9; Node 20.9. Scheduled as a follow-up. |
| E2E | Cypress (installed) | Playwright | Only if WebKit-engine coverage is required. |
| Hosting headers | headers file at the host | `<meta http-equiv>` CSP | Cannot express `frame-ancestors`; no report endpoint. |
| Job detail route | query string | `[id]` dynamic page | Needs a host rewrite; hard loads 404 on a plain static host (built). |

## Installation

```bash
# Add
yarn add @walletconnect/sign-client@2.26.0 @tanstack/react-query@^5.105.0 zod@^4.6.7 qrcode.react@^4.2.0

# Pin framework
yarn add next@14.2.35 react@18.3.1 react-dom@18.3.1
yarn add -D eslint-config-next@14.2.35 typescript@^5.9.3

# Remove (run in groups, build and test between groups)
yarn remove koffi dotenv nodemon node-cache tsc string_decoder uuid axios bs58 cheerio @types/cheerio validator @types/validator react-transition-group \
  @reduxjs/toolkit react-redux next-seo ethers @web3modal/ethers @reown/appkit @reown/appkit-adapter-ethers @reown/walletkit \
  @walletconnect/core @walletconnect/utils @walletconnect/web3-provider @coinbase/wallet-sdk \
  @bufbuild/protobuf @bufbuild/protoc-gen-es protobufjs protons-runtime \
  libp2p helia @helia/delegated-routing-v1-http-api-client @ipld/dag-pb @dcdn/graphsync blockstore-core datastore-core it-pipe any-signal delay \
  @multiformats/dns @multiformats/multiaddr @multiformats/multiaddr-matcher \
  @chainsafe/libp2p-gossipsub @chainsafe/libp2p-noise @chainsafe/libp2p-yamux
# plus every @libp2p/* entry in package.json
yarn remove -D protons @protobuf-ts/plugin node-mocks-http react-test-renderer
# explorer (with the pages)
yarn remove apexcharts react-apexcharts recharts react-gauge-component react-simple-maps
```

Then add `"engines": { "node": ">=20" }`, an `.nvmrc` with `22`, set `output: 'export'`, and delete `package-lock.json`.

## Open items for the roadmap

- Where the pinned https origin is hosted (decides how `_headers` or nginx config is shipped). Needs Braian and the wallet allowlist. [Not researchable.]
- Wallet-side confirmations from the sign-client findings: the wallet approves proposals with empty `requiredNamespaces` and returns the `gnus_*` methods and events in the approved namespace; emits `session_event` with an approved `chainId`; what a payer with no EVM address can pair as; how a deep link to GeniusWallet is formed. [Wallet milestone.]
- Contract additions to request: cost `decimals` in `gnus_estimate` (open question U1), machine-readable fixtures.
- Exact WalletConnect request-expiry bounds for `gnus_submitJob`; one spike with a real wallet. [Phase-level research.]
- Whether the Linux WebKitGTK versions the wallet falls back to run Next 14 output plus modern JS; a walk on the slave box. [Phase-level.]
- Whether the price display stays in v1 (Braian's call).

## Sources

- Next.js static exports (supported and unsupported features, image loader): https://nextjs.org/docs/pages/guides/static-exports (HIGH)
- Next.js support policy (14 unsupported, 15 maintenance, 16 active): https://nextjs.org/support-policy (HIGH)
- Next.js 16 upgrade guide (Node 20.9, Turbopack default, `next lint` removed, browsers Chrome 111 / Safari 16.4): https://nextjs.org/docs/pages/guides/upgrading/version-16 (HIGH)
- Next.js 14 supported browsers: https://nextjs.org/docs/14/architecture/supported-browsers (HIGH)
- Reown dApp Sign API usage (sign-client install, `session_event`, `session_delete`, `@walletconnect/modal` deprecated): https://docs.reown.com/advanced/api/sign/dapp-usage.md (HIGH)
- Reown AppKit JS options (`universalProviderConfigOverride`, `customRpcUrls`): https://docs.reown.com/appkit/javascript/core/options (HIGH)
- Reown content security policy for WalletConnect and AppKit: https://docs.reown.com/advanced/security/content-security-policy (MEDIUM; page content summarised by search, not read in full)
- Reown deprecations (`@web3modal/*` -> `@reown/appkit-*`): https://docs.reown.com/advanced/walletconnect-deprecations (MEDIUM; page returned 404 on direct fetch, content from search snippet)
- Zod requirements (strict mode, TS 5.5+) and Zod Mini size: https://zod.dev/ and https://zod.dev/v4 (HIGH)
- TanStack Query network mode: https://tanstack.com/query/latest/docs/framework/react/guides/network-mode (HIGH)
- npm registry versions checked 2026-10-26: next 14.2.35 / 16.4.3, @walletconnect/sign-client 2.26.0, @walletconnect/universal-provider 2.26.0, @reown/appkit 1.8.24, @tanstack/react-query 5.105.0, zod 4.6.7, qrcode.react 4.2.0, cypress 14.5.4 / 16.2.0, typescript 5.9.3 / 7.0.2 (HIGH)
- Source reads of `@walletconnect/sign-client` and `@walletconnect/universal-provider` 2.26.0 (request validation, event validation, HTTP fall-through, telemetry option, endpoints, deprecated `pairingTopic`): installed and inspected locally (HIGH)
- Local builds on Next 14.2.35: static export rules, inline-script check, bundle sizes, `npm audit` (HIGH)
