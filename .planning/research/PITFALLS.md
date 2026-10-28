# Pitfalls Research

**Domain:** dApp dashboard that runs inside a wallet WebView (injected `window.gnus`) and in a desktop browser (WalletConnect), submitting paid compute jobs through a wallet-owned `gnus_*` contract. Brownfield: Next.js 14 pages router + Node/koffi server becoming a static SPA.
**Researched:** 2026-10-26
**Confidence:** MEDIUM-HIGH. Most items are derived from the repo, the contract snapshot, the bridge spike and the identity note (HIGH, read directly). WalletConnect/AppKit behaviour comes from prior knowledge plus one web check (MEDIUM, flagged inline). Android/iOS/macOS WebView behaviour is unverified on a device (the spike ran Windows and Linux only), flagged inline.

Phase names below are proposed, not final, so the roadmap can rename them:

- **P1 Static shell and server removal** (export config, delete `pages/api`, koffi, explorer pages; secrets out of source)
- **P2 Provider layer** (`request()` client, `window.gnus` transport, WalletConnect transport, mock provider)
- **P3 Connect and identity** (accounts, node vs payer, account switch, wallet offline states)
- **P4 Submit** (estimate, `gnus_submitJob`, idempotency, paid-but-not-processed)
- **P5 Jobs and earnings** (list, detail, live updates, null handling)
- **P6 Hardening and cutover** (CSP, hosting, mobile WebView checks, EC2 retirement)

## Critical Pitfalls

### Pitfall 1: Web3Modal still mounts inside the wallet (module-scope side effect)

**What goes wrong:**
The user opens the dashboard in GeniusWallet and gets a second connect flow. AppKit auto-restores a stored session, opens its modal, or fires deep links (`metamask://`, `wc:`) out of the WebView. On Windows the wallet's in-app browser also auto-pairs any `wc:` URI on the clipboard every 2 s, so the wallet can pair with itself.

**Why it happens:**
`context/wallet/Web3Modal.tsx` calls `createWeb3Modal(...)` at module scope, and `pages/_app.tsx` imports it statically. The side effect runs on import, before any component can check `window.gnus`. Hiding the modal behind `if (!window.gnus)` in JSX does not help: the instance already exists, and `OrderForm.tsx` also opens it on mount when not connected.

**How to avoid:**
- Load the WalletConnect code only through a dynamic `import()` called after the provider decision is made, so the module is never evaluated in-wallet. A conditional render is not enough.
- Prefer not using AppKit at all. Only GeniusWallet can answer `gnus_*`, so a wallet picker listing hundreds of other wallets is wrong for this product. Use `@walletconnect/universal-provider` (or the ethereum-provider) with a QR for GeniusWallet only. This also shrinks the CSP surface (see Pitfall 11). Decide in STACK.
- Delete `OrderForm.tsx`'s auto-open of the modal and its `bridgeOut` path outright; do not leave it behind a flag.
- Enforce "one provider per session" in code: a single `getProvider()` that returns one object and throws if a second transport is asked for.

**Warning signs:**
A network tab entry to `relay.walletconnect.*` or `api.web3modal.org` while running in the wallet; `localStorage` keys starting `wc@2` or `W3M` appearing in the WebView profile; the wallet logging a pairing from its own app.

**Phase to address:** P2 (structure), P1 (delete the old modal and order-form path).

---

### Pitfall 2: Detection race on Android, iOS and macOS (shim arrives after page start)

**What goes wrong:**
Three variants:
1. The page checks `window.gnus` once at load, sees nothing, and starts the browser path even though it is inside the wallet.
2. The page attaches the `gnus#initialized` listener after the event already fired (check-then-listen gap).
3. The 3 s fallback fires on a slow cold start, the dashboard switches to WalletConnect, and then `window.gnus` appears. Now two providers are live, which is the exact bug this milestone exists to remove.

**Why it happens:**
`webview_flutter` (Android, iOS, macOS) has no document-start script hook, so the shim is injected on page start and again on page finish (spike finding). Windows and Linux inject at document start, so the dev machines never reproduce the race. The spike never ran the mobile path.

**How to avoid:**
- Order of operations: attach the `gnus#initialized` listener first, then read `window.gnus`, then decide. This closes the gap.
- Make the initialized handler idempotent. The shim is injected twice, so the event can fire twice and `window.gnus` may be a new object the second time. Re-read `window.gnus` per call instead of caching the first reference, and re-subscribe `on(...)` listeners on each `gnus#initialized`.
- Treat a late `window.gnus` after fallback as authoritative: tear down WalletConnect and switch. Better, ask the wallet side for a user-agent suffix (for example `GeniusWallet/<ver>`) so the page knows it is in the wallet and waits longer instead of guessing. Raise as a change request to the wallet contract, not a local workaround.
- Separate three states in the UI: no provider, provider present but not ready (4900, retry with backoff), provider ready. Do not collapse 4900 into "no wallet".
- Static prerender runs with no `window`. Render a neutral "detecting wallet" state first and decide in an effect, or you get hydration mismatches and a flash of the browser connect UI inside the wallet.

**Warning signs:**
Works on Windows and Linux, shows the Connect button on a phone for a second; the dashboard has both a `window.gnus` provider and a WC session in state at once; `on('gnus_accountsChanged')` stops firing after a reload of the page.

**Phase to address:** P2. The mock provider must be able to inject late (see Pitfall 17). Android/iOS device walk in P6.

---

### Pitfall 3: Reload or two tabs burn twice (idempotency key mishandled)

**What goes wrong:**
The wallet dedupes on `idempotencyKey` for 24 h. The dashboard defeats it by creating a fresh `crypto.randomUUID()` inside the click handler on every call, so a reload, a double click, a retry after timeout, or a second tab produces a different key and a second burn.

**Why it happens:**
The key looks like a request id, so it gets generated per request. It is actually an intent id: one per "this job, this user decision". It must exist before the first call and survive reloads.

**How to avoid:**
- Create the key when the user reaches the review step, bind it to a hash of the job JSON, and write `{key, jobHash, createdAt}` to `localStorage` before calling `gnus_submitJob`. Reuse it for every retry of the same job. Generate a new key only when the job content changes or the user explicitly starts a new submission.
- Keep submit state in a store outside the component (the call can wait minutes on a human confirm, and an SPA route change unmounts the component but not the promise).
- On page load, if a pending record exists, reconcile by calling `gnus_submitJob` again with the same key. By contract that returns the first result instead of burning again, or prompts the user if the first call never completed. Do not guess from `gnus_listJobs`: `Job` has no idempotency key field, only `burnTxHash`, `origin`, `submittedAt`, `cost`.
- Drop pending records older than about 23 h. After 24 h the same key burns again. Past that point reconcile through `gnus_listJobs` instead of replaying.
- Handle `-32005` as "a submit is already open or you are rate limited, look at My jobs", never as a failure to retry automatically. The code is overloaded in the contract (rate limit and confirm already open); ask the wallet side for `data.reason` so the UI can tell them apart.
- `crypto.randomUUID` exists only in secure contexts. It is missing on plain-http LAN dev hosts (for example a phone reaching the PC by IP). Provide a `getRandomValues` fallback.
- Use `BroadcastChannel` or the Web Locks API to stop two tabs from both showing an active Submit button. The wallet's `-32005` is the backstop, not the UX.

**Warning signs:**
`randomUUID()` appears inside an `onClick`; submit state lives in `useState`; no `localStorage` write before the request; QA reload test during the confirm dialog produces two confirm dialogs.

**Phase to address:** P4. Add a scripted test against the mock provider: submit, reload at each step, assert one burn.

---

### Pitfall 4: Paid but not processed is shown as success, failure, or lost

**What goes wrong:**
The burn succeeded and Process failed. The contract reports this two ways: a result with `status: "bridgedNotProcessed"`, and an error `-32014` with `data.burnTxHash`. A dashboard that handles only one shows a generic error for a spent payment. Another shows "failed, try again", the user retries, and a second burn follows. A third shows nothing after a reload because the state was in memory.

**Why it happens:**
Two representations of one outcome, plus the old app's habit of declaring success on a tx hash. The contract also defines no "retry process for this burn" method, so the recovery path is undefined.

**How to avoid:**
- Normalise both shapes into one `BridgedNotProcessed{burnTxHash}` state at the transport boundary.
- Never auto-retry after `-32014` or `-32603` on submit. `-32013` is the only error that guarantees nothing was spent.
- Persist nothing the wallet already persists; source the state from `gnus_listJobs` (`bridgedNotProcessed` status) so it survives reloads and appears on a second device or tab.
- Show the burn hash with a copy button and a plain message. Do not offer a retry button until the wallet ships a recovery method.
- Raise the missing recovery method as a contract change request in the wallet milestone.

**Warning signs:**
A `catch` block that toasts `error.message` for every code; no UI for `-32014`; success screen triggered by receiving any non-error response.

**Phase to address:** P4 (states), P5 (list shows it). Contract gap flagged in SUMMARY.

---

### Pitfall 5: Null rendered as 0, and `strict: false` hides it

**What goes wrong:**
`jobsProcessed`, `earned.total`, `earned.history`, `jobId`, `result`, `gnus.gas`, `payer.evmAddress` and `node.linkedEvm` are legitimately null today (SDK-EARNINGS, SDK-JOBID, SDK-RESULT missing). The UI shows "0 jobs, 0 GNUS earned", which is a fake number and breaks the project's core value.

**Why it happens:**
JavaScript turns null into zero in many quiet ways: `Number(null) === 0`, `value || 0`, `value ?? 0` in a formatter, `useState(0)` as the initial value, `Intl.NumberFormat.format(null)` giving `"0"`, chart libraries plotting null as zero, `String(x) || "0"`. The repo has `"strict": false` in `tsconfig.json`, so TypeScript will not flag `string | null` flowing into a number context.

**How to avoid:**
- Model availability explicitly: `type Maybe<T> = { state: "loading" } | { state: "unavailable" } | { state: "value"; value: T }`, or at minimum a single `<Amount value={string | null}>` component that is the only place amounts are formatted, and renders "not available yet" for null. Ban ad hoc formatting in views.
- Turn on `strictNullChecks` for new code. Whole-repo strict is a large diff; a separate `tsconfig` for the new `lib/gnus/**` and `views/**` directories, or enabling `strictNullChecks` globally once the explorer code is deleted (it is the bulk of the `any` debt), are both cheap.
- Distinguish loading, unavailable and error. Initial state is `loading`, never `0`.
- Do not use `jobId` as a React key or route param when it can be null; use `burnTxHash`, which is always present.
- The mock provider must return nulls like the real wallet does today, with a switchable "SDK maturity" profile. A mock that returns populated earnings makes the dev UI look finished and the real wallet look broken.
- Also treat `status: "unknown"` and any status string the dashboard has not seen as a rendered state, not a crash (exhaustive switch with a default branch). Do not render "Processing..." for `submitted`: while SDK-STATUS is missing the honest label is "Submitted, status not available yet".

**Warning signs:**
`?? 0`, `|| 0`, `parseFloat(x)` or `Number(x)` anywhere near a field that can be null; a grep for `toFixed(` in views; the earnings page looks good against the mock and empty against the wallet.

**Phase to address:** P5 (and P2 for the mock profile). Add a render test that feeds every nullable field null and asserts no digit appears.

---

### Pitfall 6: JS `Number` on token amounts

**What goes wrong:**
Balances and costs lose precision or print as `1e+21`. Existing code does exactly this: `OrderForm.tsx:118` does `parseInt(bal) / 10 ** 18` then `.toFixed(2)`. u64 and 1e18-scaled values exceed 2^53, so low digits are silently wrong, and comparisons (cost vs balance) can pass or fail incorrectly.

**Why it happens:**
Amounts arrive as JSON strings, and `parseInt`, `parseFloat`, `Number` or `+x` is the shortest path to doing arithmetic or formatting. A `type="number"` input has the same problem on the way in.

**How to avoid:**
- Amounts stay decimal strings in state, props, `localStorage` and URLs. Use `BigInt` (or a decimal library) only inside one `amounts.ts` module for compare and format. `BigInt` cannot go through `JSON.stringify` (it throws), another reason to keep strings in state.
- Validate at the transport boundary: a runtime check (hand-written or zod) that every amount field is a string matching `^[0-9]+$` or the contract's decimal form, and reject `typeof === "number"`. If a wallet bug ever emits a number, it is already imprecise after `JSON.parse`; fail loudly rather than display it.
- The contract does not state decimals, and it is ambiguous whether "decimal string" means integer base units or a decimal like "1.5". Open question U1 (cost units) is unresolved. Do not guess a scale: ask the wallet to add `decimals` (and a unit label) to `gnus_estimate` and `gnus_getEarnings`, and until then show the raw string with its unit unknown rather than dividing by 1e18. The old dashboard multiplied the estimate by 1e18 and the wallet burns as-is, so a carried-over `* 1e18` is a likely 1e18-times overcharge.
- Compare `cost` to `balance` with BigInt. Do not trust the UI's comparison for gating; the wallet returns `-32011` and that is the source of truth.

**Warning signs:**
`parseInt`, `parseFloat`, `Number(`, `10 **`, `toFixed(` near cost, balance or earnings; amounts in `useState<number>`; a test with a value above 9007199254740993 that does not exist.

**Phase to address:** P2 (type and validator at the boundary), P4 and P5 (consumers). Unit tests with values at 2^53+1 and 1e21.

---

### Pitfall 7: Two address formats confused

**What goes wrong:**
An SDK address (`0x` + 128 hex) is passed to `ethers.isAddress` or `getAddress` and rejected or throws; or an EVM address (`0x` + 40 hex) is used as the key for "my jobs" and returns nothing; or the SDK address is rendered as a Polygonscan link; or the payer's address is shown as "your account" when the node account is a different one.

**Why it happens:**
Both start with `0x` and look like addresses. Existing code validates only EVM (`Search.tsx:14`), and the old `GeniusAddress` struct is 32 chars. An SDK address cannot be derived from an EVM address, so there is no safe conversion to fall back on.

**How to avoid:**
- Two branded types, `SdkAddress` and `EvmAddress`, each with a single parse function (`/^0x[0-9a-f]{128}$/`, `/^0x[0-9a-f]{40}$/` on the lowercased input). No function accepts `string` for an address. Never call ethers address helpers on an SDK address; never convert between the two.
- Compare lowercase. The contract says the wallet returns lowercase; checksummed addresses from config or a user paste compare unequal with `===`.
- Key all caches, query keys and polls on `(network, sdkAddress)`. EVM address is a display label only.
- UI: label every address with its role ("Earning account", "Paying wallet"). A 128-hex string truncated to `0x1234...abcd` looks like any other address; show enough characters and a copy button that copies the full value. Block-explorer links only for EVM addresses and tx hashes.
- In WalletConnect mode, never take identity from `session.namespaces.eip155.accounts`. It is frozen at approval (wallet never re-emits on wallet switch) and can be an unusable account. Identity comes from `gnus_getAccounts`, refreshed on events and on tab visibility.
- Do not fall back from a null `linkedEvm` or `payer.evmAddress` to the node account. That is the wallet's own known stale-fallback bug; render "no linked wallet".

**Warning signs:**
`useAccount()` / `useWeb3ModalAccount()` still imported anywhere; a regex `0x[0-9a-fA-F]{40}` in views; one `address: string` prop used for both kinds.

**Phase to address:** P2 (types), P3 (labels and identity source), P5 (keys).

---

### Pitfall 8: Account switch and in-flight responses (stale data under the wrong identity)

**What goes wrong:**
The user switches "Earn with this account" in the wallet. A `gnus_listJobs` response for the old account lands after `gnus_accountsChanged` and is rendered under the new one. Or a submit starts during the switch window (`switching: true`), runs as the old account, and the job belongs to an account the user no longer sees. The wallet answers `4901` for these, but the dashboard must also stop asking.

**Why it happens:**
Requests are fire-and-forget with a global "current data" slot. Events are treated as the only trigger and a missed event (WalletConnect while the tab slept, WebView resume) leaves the UI stale.

**How to avoid:**
- Tag every fetch with the `sdkAddress` and network it was issued for; commit the response only if they still match the current identity. Query-cache keys include both, and an accounts-changed event clears everything keyed to the old pair.
- While `switching` is true or on `4901`: disable Submit and show a blocked state, then re-fetch `gnus_getAccounts` on `gnus_accountsChanged`. Do not retry in a loop.
- Do not trust events alone. Re-fetch `gnus_getAccounts` on `visibilitychange`, on WebView resume and on WalletConnect reconnect.
- Listener hygiene: every `on(...)` gets a `removeListener` in effect cleanup. The existing `useIPFS.tsx` `setInterval` with no cleanup is the anti-pattern; React 18 StrictMode (currently off) doubles effects in dev and would double the subscriptions.
- A submit pending when the account changes: warn that the wallet will confirm against whichever account is current.

**Warning signs:**
Jobs list does not change after a switch until reload; duplicate toast per event; the Network tab shows polls after navigating away.

**Phase to address:** P3 (identity state machine), P5 (cache keys).

---

### Pitfall 9: WalletConnect session rejected, or approved without the methods

**What goes wrong:**
- Proposing the `gnus_*` methods in `requiredNamespaces` makes any wallet that does not implement them reject the whole session, and gives the wallet a reason to reject chains it lacks. The contract says optional.
- Conversely, a user connects MetaMask (or any other wallet). The session is approved, but without `gnus_*` methods. Calls fail client-side with an unsupported-method error, and the UI spins.
- Hardcoding `eip155:80002` in every `request` call fails when the wallet approved a different chain subset; a request must use a chain id that exists in the session.
- Custom events (`gnus_accountsChanged`, `gnus_jobUpdated`) arrive only if they were declared in the namespace `events`, and the high-level EthereumProvider wrapper may filter to the standard EIP-1193 events. (Unverified; check against the installed version.)
- AppKit overwriting: setting `optionalNamespaces` on some AppKit/Reown stacks replaces the library's own definition, so the `eip155` base methods must be re-listed (Reown Flutter docs say this; web behaviour unverified). A search for an AppKit `universalProviderConfigOverride` option returned no documentation, so do not plan on it.

**Why it happens:**
Custom RPC over WalletConnect is a documented but rarely exercised path, and most examples are `eth_sendTransaction` and `personal_sign`.

**How to avoid:**
- Use `optionalNamespaces.eip155` with `methods: ["gnus_getAccounts", ...]`, `events: ["gnus_accountsChanged", ...]`, `chains: ["eip155:80002"]`; require nothing, or require only the minimum the wallet always supports. Confirm what GeniusWallet's proposal handler actually approves.
- After approval, inspect `session.namespaces.eip155.methods`. If `gnus_getAccounts` is absent, show "this wallet cannot be used with the dashboard, open GeniusWallet" and disconnect. Same for events.
- Choose the request chain from `session.namespaces.eip155.chains`.
- Listen to raw `session_event`, `session_update`, `session_delete`, `session_expire` on the sign client; do not rely on a wrapper to forward custom events.
- Always send `params` as an object (`{}` when empty). Many WalletConnect libraries and wallet handlers assume array params. The contract chose named params and the wallet is Dart, so the first cross-stack test must be a real named-params round trip.
- Make sure the Reown Cloud project allowlists the pinned origin and `localhost` dev origin. `config.ts` `metadata.url` is `https://dashboard.gnus.ai/job-orders` (a path, not an origin) and `icons` is a relative path. Wallet-side Verify compares the metadata URL to the real origin and will flag a mismatch; use the bare origin and an absolute icon URL.

**Warning signs:**
A wallet shows "unverified domain" or "invalid domain" on the proposal; connect succeeds with a non-Genius wallet and then every call hangs; events never arrive although the wallet emits them.

**Phase to address:** P2 (namespace config and the first real-wallet round trip), P3 (unsupported-wallet state).

---

### Pitfall 10: WalletConnect timeouts and zombie requests

**What goes wrong:**
- The dashboard times out a request (wallet backgrounded, app closed, phone locked). The relay still holds it. When the user opens the wallet the confirm dialog appears for a request the dashboard abandoned. The user retries, then confirms both: two submits. With a fresh idempotency key each time, two burns.
- The contract says "no timeout for `gnus_submitJob`", but the WalletConnect sign request has an expiry. The default is about 5 minutes (allowed range 5 minutes to 7 days per the WalletConnect docs; the spec text on a missing expiry is inconsistent, so confirm against the installed version). The request quietly expires while the user is still reading the dialog.
- A spinner on a request that can never answer. iOS cannot answer WalletConnect requests from the background.
- Sleeping laptop: pairing/proposal TTL (about 5 minutes) passes and the QR on screen is dead. Relay socket drops and pending requests are lost.
- A mobile browser plus GeniusWallet on the same phone means an app switch per request. That path is poor UX by nature.

**Why it happens:**
Treating WalletConnect like an HTTP call. The relay is a mailbox with a TTL; a client timeout does not cancel the wallet-side request.

**How to avoid:**
- Idempotency keys (Pitfall 3) are what make zombie requests harmless. Retry the same key; never mint a new one after a timeout.
- Set an explicit request expiry for `gnus_submitJob` (the sign client's request supports an expiry argument) long enough for a human, and treat expiry as "unknown outcome, reconcile", not "failed".
- Reads: 60 s timeout then a "wallet offline" state with a Retry button. Not a spinner, not an error toast loop.
- Poll WalletConnect reads slowly (and not at all while the tab is hidden); prefer `gnus_jobUpdated` events. Each poll is a relay message to a phone and can hit the wallet's rate limit (`-32005`).
- Regenerate the QR on proposal expiry; reconnect and re-run `gnus_getAccounts` on `visibilitychange`.
- Handle `session_delete`/`session_expire`/`disconnect` by returning to the disconnected state. The persisted session in `localStorage` can outlive the wallet's copy (WalletConnect sessions expire, typically after 7 days).
- Two browser tabs share the same WalletConnect storage and both subscribe to the same session. Elect one tab (Web Locks) as the owner of the WalletConnect client, or document that submit works from one tab. Unverified; test with two tabs against a real wallet.
- Recommend the browser path for desktop; in the UI, nudge phone users to open the dashboard inside GeniusWallet.

**Warning signs:**
A confirm dialog appears in the wallet minutes after the dashboard showed "timed out"; the relay logs `No matching key`; submit "hangs" at exactly 5 minutes.

**Phase to address:** P2 (timeouts, expiry, reconnect), P4 (zombie-request reconciliation).

---

### Pitfall 11: CSP breaks WalletConnect silently, or breaks the page itself

**What goes wrong:**
- `connect-src` omits the relay: connect never completes, no error in the UI, only a console CSP violation.
- A strict `script-src 'self'` blocks something inline. A meta-tag CSP cannot express `frame-ancestors`, `report-uri` or `sandbox`.
- CSP verified only in dev: Next dev uses eval for refresh, so a strict policy is turned off in dev and nobody sees prod breakage until deploy.
- The injected shim stops working under CSP on some platform.

**Why it happens:**
A static export has no server to set a per-request nonce, so the usual "nonce every script" approach is not available. Policy has to come from the static host's response headers or hashes of inline scripts. WalletConnect needs several origins (relay websockets, verify iframe, explorer images, API) and they change between SDK versions.

**How to avoid:**
- Set the CSP as a real response header on the host (CloudFront response-headers policy or nginx), not a meta tag. Build the policy from what the export actually emits: Next pages router export has external script chunks plus an inline `__NEXT_DATA__` JSON block (`application/json`, not executed, so not blocked) and inline `style` attributes (so `style-src 'unsafe-inline'` is typically needed; keep `script-src` strict). Check the real `out/*.html` for inline `<script>` bodies and hash them at build time if any exist.
- Starting `connect-src` for the browser path (MEDIUM, verify against the installed SDK): `wss://relay.walletconnect.org`, `wss://relay.walletconnect.com`, `https://*.walletconnect.org`, `https://*.walletconnect.com`, plus `https://verify.walletconnect.org` / `.com` in `frame-src`, wallet icons in `img-src`, the chosen RPC and price hosts. Keep the list in one file with a comment per entry. Fewer entries if AppKit is dropped (Pitfall 1).
- Test the CSP against the exported build served with the real headers, in a real browser doing a real WalletConnect pairing, and again inside the wallet WebView on every platform. Hosted-only checks miss platform differences.
- Verify the shim runs under the policy on each platform. Host-side script evaluation (`evaluateJavascript`, `WKUserScript`, WebView2 document-created script) is normally exempt from page CSP, but this was not tested in the spike; one cheap page-load test settles it.
- Add `Content-Security-Policy-Report-Only` first to collect violations, then enforce.
- `frame-ancestors 'none'` as a header: the wallet already ignores iframe messages, but this stops clickjacking in a browser.

**Warning signs:**
QR code never appears or "connecting" forever with a clean UI; CSP violations in the console only on the deployed host; the policy contains `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.

**Phase to address:** P6 (policy and host), with a CI check in P1 that the export contains no inline script bodies that would need hashing.

---

### Pitfall 12: Static export traps (dynamic routes, trailing slashes, hosting rules)

**What goes wrong:**
- `output: 'export'` build fails or silently drops routes while `pages/api/*` still exists. The catch-all `pages/[...].tsx` and `[address]`, `[block]`, `[transaction]` need `getStaticPaths`; job ids are unbounded runtime values, so a `/jobs/[id]` route cannot be pre-rendered.
- Reading `router.query.id` in a statically exported page gives `undefined` on first render (`router.isReady` is false). The page fires `gnus_getJob({jobId: undefined})` and shows `-32602` or "not found".
- `next/image` fails the build without `images.unoptimized: true` (used in `DeviceMix.tsx` and `OrderForm.tsx`).
- Host mapping: with `trailingSlash: false` Next emits `job-orders.html`; with `true` it emits `job-orders/index.html`. S3/CloudFront only serves the second for subdirectory requests if you add a rewrite (CloudFront default root object covers `/` only). Wrong choice gives 403/404 on refresh or deep link while the dev server worked.
- No server means no catch-all fallback: unknown paths need `404.html` plus a host rule (CloudFront custom error response).
- `pages/_app.tsx` has `import "dotenv/config"` (a Node module in the client bundle), `process.env.baseURL` (undefined; used for canonical and og URLs), and `<base href="/" />`.
- Build-time environment: `NEXT_PUBLIC_*` and `config.ts` values are frozen into the bundle. The pinned origin and network are per-environment, so staging and production are different builds, not one artefact promoted.
- Version skew after a deploy: an old cached `index.html` points at chunk files the new deploy deleted, giving `ChunkLoadError` in a WebView that caches hard.

**How to avoid:**
- P1 deletes `pages/api/**`, the explorer pages (`address`, `block`, `transaction`, the catch-all, analytics) and `functions/ipfs`, since the explorer is out of scope; that removes the `getStaticPaths` problem for free.
- Job detail route is a static page reading `?id=` / `?tx=` after `router.isReady` (or a hash route). Decide once and keep ids out of the path.
- Set `images: { unoptimized: true }`, `output: 'export'`, pick `trailingSlash` to match the chosen host, and test deep-link refresh against the real host config, not `next dev`.
- Remove `dotenv/config`, `process.env.baseURL` and the `<base>` tag, and use the absolute pinned origin from build config for canonical URLs.
- Hosting: `index.html` with `no-cache`, `/_next/static/*` with long immutable cache, and keep the previous build's assets on the bucket for some days (no immediate `sync --delete`).
- Do not add a service worker; it adds a second cache layer in front of the same problem.

**Warning signs:**
Build output has no `404.html`; a deep link refresh returns the host's XML error; `window is not defined` during `next build`; a job detail page that works when navigated to from the list and breaks on refresh.

**Phase to address:** P1 (export config and route shape), P6 (host rewrite rules and cache headers).

---

### Pitfall 13: Secrets and keyed URLs end up in the public bundle

**What goes wrong:**
Static export ships everything importable. Specific traps here:
- `pages/api/gas/gasPrice.ts` embeds a BlastAPI URL with a token in the path. If the "removal of the server" is done by moving that fetch into a hook, the token moves into the client bundle. `usePrices` currently calls the API route.
- The literal private key in `functions/ipfs/node.ts` and `data/secure_storage.json` (`sgns_key`) are in git history regardless of deletion. The repo is public. Deleting the file does not un-leak it.
- `public/` is copied verbatim into `out/`. The untracked `public/bridge-test.html` and `public/posenet-job.json` from the spike, if added to the repo, would deploy to the pinned origin, which the wallet allows to call `gnus_*`. A test page on the production allowlisted origin is a wallet-facing surface.
- Reown `projectId` is public by design but unrestricted; anyone can reuse it from another domain.
- Supply chain: every script on the allowed origin gets wallet access (spike finding). The tree carries many unused dependencies (libp2p, helia, cheerio, nodemon, `tsc`) and two lockfiles (`yarn.lock`, `package-lock.json`) that can resolve different versions.

**How to avoid:**
- Use a keyless RPC or none. For the gas display, query a public endpoint or the wallet's `gnus_estimate.gas`; if a keyed RPC is unavoidable, it needs domain-restricted keys by provider, not a path token.
- Add a CI gate that greps the built `out/` for 64-hex strings, `blastapi`, `BEGIN .* PRIVATE KEY`, `sgns_key`, and fails the build. Add a secret scanner (gitleaks) over the working tree.
- Keep `bridge-test.html` out of `public/`, or exclude it from the export step with an allowlist copy, and assert in CI that `out/` contains no `bridge-test`.
- Lock the Reown project to the pinned origin and the dev origin in the Cloud settings.
- Delete unused dependencies, delete `package-lock.json`, build with `yarn install --frozen-lockfile`. Keep third-party analytics and font CDNs out of the page (each one is wallet-capable code).
- Rotating the leaked key is a human action outside the project; record it as a blocker on the cutover checklist, and confirm no funds sit on the old server account before EC2 is retired (Pitfall 16).

**Warning signs:**
A `fetch("https://...blastapi.io/<token>")` in `hooks/`; `out/` listing a `data/` folder; `git grep -E '[0-9a-f]{64}'` still hits source after the cleanup.

**Phase to address:** P1 (removal and scanning gate), P6 (CI enforcement and Reown restriction).

---

### Pitfall 14: Mobile WebView limits (file input, links, downloads, clipboard, back)

**What goes wrong:**
Not verified on a device; from code reading and platform behaviour (MEDIUM).
- `<input type="file">` for JSON job upload does nothing on Android WebView unless the host implements a file-chooser handler (identity note: needs `setOnShowFileSelector`). iOS handles it natively. The user taps Upload and nothing happens.
- Plain `<a href="https://polygonscan...">` without `target="_blank"` triggers a top-level navigation. The wallet locks top-level navigation to the allowlist, so the user dead-ends or sees nothing. `window.open` and `target=_blank` open in the system browser. The `Socials.tsx` links already use `_blank`; a sweep is needed for every other external anchor.
- Downloads: `<a download>` and blob URLs commonly do nothing in Android WebView without a download listener, and older WKWebView ignores blob downloads. A "download result" button silently fails.
- `navigator.clipboard.writeText` needs a secure context and a user gesture, and may need permission on Android. Copy-address and copy-burn-hash are core actions here.
- History traps: pushing a history entry per filter or modal breaks the Android back button ordering (the wallet goes back in the page before popping its route).
- Mixed content on the pinned https origin: any `http://` fetch (IPFS gateways, price APIs) is blocked.
- Dev reach: a phone cannot reach `localhost:3000`; the emulator's `localhost` is itself; Android blocks cleartext by default. `adb reverse` or an allowlisted LAN origin is needed, and `crypto.randomUUID` is missing on plain-http LAN hosts (Pitfall 3).

**How to avoid:**
- Make "paste job JSON" a first-class path equal to upload, and treat upload as an enhancement. Use `accept=".json,application/json"` and test on the Android build. Ask the wallet side to confirm the file chooser handler is in scope for the Android build.
- One `ExternalLink` component that always sets `target="_blank" rel="noopener noreferrer"`. Lint for raw `<a href="http`.
- Results as copyable CIDs plus an https gateway link that opens externally, rather than a client-generated download. If a download is required, defer to the wallet side.
- A `copyText()` helper with an `execCommand("copy")` fallback and visible success.
- Do not manipulate history except through the router; keep modals out of history.
- Add `window.gnus.version` check at startup (`"1"`); over WalletConnect there is no version field, so ask the wallet to include one in `gnus_getAccounts` or in the session metadata, then show "update GeniusWallet" on mismatch.
- Run the dashboard on an Android GW_Test emulator and an iOS device before cutover; the spike's Windows/Linux pass proves none of the above.

**Warning signs:**
Upload works in Chrome and the Windows wallet and not on the Android build; clicking a Polygonscan link inside the wallet does nothing; "copied" toast with an empty clipboard.

**Phase to address:** P6 (device walk), with the paste-JSON and `ExternalLink` decisions in P4/P5.

---

### Pitfall 15: Estimate spam freezes the wallet and trips rate limits

**What goes wrong:**
`gnus_estimate` takes 100 to 800 ms of synchronous FFI on the wallet's UI isolate (spike measurement), freezing the wallet UI. A debounced-by-nothing "estimate on every keystroke" order form fires dozens per minute, hits `-32005`, and makes the wallet janky while the user types.

**How to avoid:**
- Estimate on an explicit action (Review / Estimate button) or a long debounce after valid JSON, never per keystroke. One in-flight estimate at a time, latest wins.
- Key the estimate to the job hash. Editing the job invalidates it and disables Submit until re-estimated.
- Treat cost as a quote: the wallet's own confirm shows the final amount, so the dashboard's copy should say "estimated". If estimate is a zero string, refuse it even though the contract says the wallet returns `-32010` instead; this costs one line.
- `-32010` (cost unavailable) is an expected state today (SDK-CA keeps cost at 0), so the order form must have a designed "cost unavailable, try later" screen, not a toast.

**Phase to address:** P4.

---

### Pitfall 16: Removing the server breaks the live EC2 app, or the live wallet allowlist

**What goes wrong:**
- The deploy workflow triggers on every push to `main`. Merging the static-export branch runs `git reset --hard`, `yarn install`, `yarn build`, then `pm2 restart gnus-dashboard`. pm2 runs `next start`, which refuses an `output: 'export'` app, so the process crash-loops and the live site is down. Also the workflow definition used is the one in the pushed commit, so a workflow edit in the same merge decides what runs.
- Cutover regresses users. The live app can submit jobs today (insecurely). The static app cannot until a GeniusWallet release ships `gnus_*` and the SDK-CA fix makes cost non-zero. Cutting over earlier turns a working page into "wallet required" for everyone.
- The wallet's release builds pin one https origin per network. Installed wallets cannot learn a new origin without an app update, so a host move (new domain, `www` vs apex, CloudFront default domain, a redirect to another host) yields `4100` on every call, and top-level redirects to a non-allowlisted origin are blocked.
- Unknown consumers: `/api/processing/*` is public and unauthenticated; scripts or partners may call it. Shutting it off without checking logs breaks them.
- State on the server: `data/secure_storage.json` and the SDK `data/` directory live on EC2. The server account key is public in git, so any balance on it is at risk; losing the instance loses that state.
- Branch conflicts: seven unmerged remote branches touch the same code. `security/logging-rate-limiting` and `security/authentication-validation` add API-route middleware; merging them re-adds `pages/api` and breaks export. `origin/develop` tests target the API routes.

**How to avoid:**
- Do all the work on a long-lived feature branch. Do not merge to `main` until the workflow is replaced. Disable the EC2 job (or replace it with an S3/CloudFront publish job) in a commit that lands before or with the merge, and verify by reading the workflow in the merge commit.
- Pin the production origin to the existing `dashboard.gnus.ai` and keep it for the life of the product; make the cutover a swap of what that origin serves (DNS or CloudFront origin) with the EC2 instance left running for instant rollback. Ask the wallet team to confirm which origin is pinned before choosing hosting.
- Cutover gate checklist: wallet build with `gnus_*` released to stores, SDK-CA fixed (cost non-zero), `gnus_submitJob` proven on a device, old key rotated by a human, access logs checked for third-party API users, CSP enforced, EC2 `data/` backed up and funds moved off the server account. Only then stop the instance, after a rollback window.
- The dashboard handles old wallets: no `window.gnus` plus a session lacking `gnus_*` methods, or `4200`, shows "update GeniusWallet".
- Decide the fate of the unmerged branches before P1: merge only what is static-compatible (`chore/update-dependencies`, `cicd-dependencies`), close or rebase the rest, and treat `origin/develop` tests as rewrite targets. Remove koffi, `data/GeniusSDK.dll` (26 MB in history) and `pages/api` in one deliberate step.
- Price and gas data move client-side: CoinGecko/CoinPaprika free tiers will 429 when every visitor calls them directly. Cache briefly and show "price unavailable", never 0.

**Warning signs:**
`pm2` restart loops after a merge; `next start` complaining about export; a wallet log line of `4100` after a host change; the "all green" cutover where nobody has tried a phone.

**Phase to address:** P1 (branch policy, deleting server code), P6 (cutover, rollback, EC2 retirement). The cutover gate depends on wallet and SDK milestones outside this repo.

---

### Pitfall 17: A mock provider that is too kind

**What goes wrong:**
The whole milestone develops against a mock `window.gnus`. If the mock always answers instantly, with populated fields and no failures, every pitfall above is invisible until the first device walk.

**How to avoid:**
Build the mock to the contract, including faults, selectable at runtime (query string or dev panel):
- late injection (fire `gnus#initialized` after 0, 500 and 4000 ms, plus twice);
- all error codes, and `switching: true` windows;
- nulls everywhere the contract allows today;
- `bridgedNotProcessed` in both shapes;
- confirm that takes minutes, duplicate `idempotencyKey` returning the first result, and `-32005` on concurrent calls;
- a WalletConnect-shaped adapter with latency, drops and zombie requests;
- amounts above 2^53.

Keep the mock a thin implementation of the same `request` interface so the dashboard cannot tell it apart. It must be excluded from the production export (dev-only import behind a build flag, and a CI assertion).

**Phase to address:** P2, extended in each phase as new states appear.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep the old `OrderForm` and bolt `window.gnus` on | Fast demo | Two payment paths, `bridgeOut` from the dashboard, Web3Modal in-wallet | Never |
| Keep AppKit "for the browser path" with the full wallet list | Familiar connect UI | Users pick MetaMask and cannot submit; big CSP surface; module-scope side effects | Only if a read-only MetaMask view is a product requirement |
| Cache `window.gnus` in a module constant at load | Simple code | Breaks when the shim is re-injected on page finish | Never on mobile |
| Format amounts with `Number` in views | Quick | Wrong digits above 2^53, fake zeros | Never |
| Global TypeScript `strict` stays off | No migration | Null-as-zero bugs invisible | Only with `strictNullChecks` on the new modules |
| Poll for job status every 2 s (copy `useIPFS`) | Live feel | Relay traffic, wallet rate limit, battery, jobs of the old account | Never over WalletConnect; WebView poll slowly as a fallback to `gnus_jobUpdated` |
| One build served at multiple origins | One artefact | Wallet allowlist mismatch (`4100`), wrong network config | Never; one build per pinned origin |
| Leave `public/bridge-test.html` for QA | Handy | Test page on an allowlisted production origin | Dev builds only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `window.gnus` | One check at load; cache the object | Listener first, then read; re-read per call; re-subscribe on each `gnus#initialized` |
| GeniusWallet over WalletConnect | Required namespaces; hardcoded chain; trust session accounts | Optional `gnus_*` methods/events; chain from session; identity from `gnus_getAccounts` |
| Reown Cloud | Unrestricted project id; metadata URL with a path; relative icon | Restrict domains; bare origin; absolute icon URL |
| `gnus_submitJob` | New key per click; success on any non-error | Persisted intent key; both `bridgedNotProcessed` shapes handled |
| `gnus_listJobs` / `gnus_getJob` | Key rows by `jobId` (null today) | Key by `burnTxHash`; `jobId` optional |
| `gnus_getEarnings` | Display `earned.total` null as 0 | "Not available yet" for null, always |
| Price/gas APIs | Call from every client with a token or expect no rate limits | Keyless sources, short cache, "unavailable" state |
| Static host | Assume dev-server routing | Rewrite rules for `.html`/`index.html`, `404.html`, header-based CSP, cache split |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Estimate per keystroke | Wallet UI freezes 100-800 ms repeatedly, `-32005` | Explicit action or long debounce, one in flight | First real user typing JSON |
| Fast polling over WalletConnect | Relay traffic, phone wakes, rate limit | Events first, slow poll, pause when hidden | A few concurrent users |
| Bundling AppKit, ethers, libp2p remnants into every page | Slow first load in mobile WebView | Dynamic-import WalletConnect, delete unused deps | First phone test |
| Unbounded `listJobs` rendering | Long list jank | `limit` 20-100 with `cursor` paging | Hundreds of jobs per account |
| Direct client calls to CoinGecko | 429, blank prices | Cache, fallback label | Once traffic is non-trivial |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Any third-party script on the allowed origin | Full wallet access (every script on the origin can call `gnus_*`), submit prompts only | No analytics/CDN scripts; strict CSP; dependency pruning; only confirm dialog protects spends |
| Leaked key in git history treated as fixed after deletion | Funds loss on the server account | Human rotation, move funds, scanner in CI |
| Rendering `error.message` or job result HTML unsanitised | XSS on a wallet-privileged origin | Render as text only; no `dangerouslySetInnerHTML` for results; results are CIDs and data objects |
| User-uploaded job JSON passed through unvalidated | Wallet-side parse errors, oversized relay payloads | Size cap, parse check, rely on `-32602` for schema errors; test realistic sizes over WalletConnect |
| Open redirects or `postMessage` handlers added to the page | Navigation lock bypass | None; keep navigation to the router only |
| `http://localhost` origins in a production build | Wallet allowlist accepts localhost only in dev builds, but a CSP with localhost entries invites mistakes | Separate dev/prod CSP and config |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Spinner when the wallet is closed | User waits indefinitely | "Wallet offline" with Retry and an instruction |
| One identity shown | User pays from wallet B, jobs belong to node account A, confusion | Two labelled identities: "Earning account" and "Paying wallet" |
| "Processing..." forever | False progress | "Submitted, status not available yet" until SDK-STATUS lands |
| Retry button after a burn | Second payment | No retry on `-32014`; show burn hash and message |
| Fake 0 or hidden unavailable | Misleading numbers | "Not available yet" |
| Submit enabled during account switch | Job runs as the wrong account | Blocked state until `gnus_accountsChanged` |
| Connect button in the wallet | Competing flows | No connect UI when `window.gnus` exists |

## "Looks Done But Isn't" Checklist

- [ ] **Provider detection:** works on Android/iOS (late injection) — verify with a 4 s delayed `gnus#initialized` in the mock and on a device.
- [ ] **No second provider:** inside the wallet, zero requests to WalletConnect/Reown hosts — verify in the WebView network log.
- [ ] **Idempotency:** reload during the confirm dialog yields one burn — verify with the mock and the real wallet.
- [ ] **Paid-not-processed:** both result shapes render the same recoverable state after a reload — verify with the mock.
- [ ] **Nulls:** every nullable field renders "not available yet" — verify with a null-everywhere profile.
- [ ] **Big numbers:** value 9007199254740993 and 1e21 display exactly — verify with unit tests.
- [ ] **Addresses:** 128-hex and 40-hex both parse, neither goes through ethers helpers — verify with unit tests and a grep.
- [ ] **Account switch:** switching drops stale list responses — verify with a delayed mock response.
- [ ] **Static export:** deep link refresh, `404.html`, job detail by query param on the real host — verify against the deployed preview.
- [ ] **CSP:** real WalletConnect pairing works with the enforced header — verify in a browser and each wallet platform.
- [ ] **Secrets:** `out/` contains no keys, tokens, `bridge-test.html`, mock — verify with the CI grep.
- [ ] **External links, copy, paste-JSON:** work in the Android and iOS wallet WebViews — verify on a device.
- [ ] **EC2 safety:** merge to `main` does not restart pm2 — verify by reading the workflow in the merge commit.
- [ ] **Old wallets:** an older GeniusWallet or MetaMask gets a clear "unsupported" screen — verify by connecting both.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double burn from missing idempotency | HIGH (funds) | Cannot reverse; compare `listJobs` burn hashes; wallet-side refund policy is a product call; fix key handling before release |
| Live site down after merge to `main` | MEDIUM | Revert the merge, re-run the old deploy, or repoint DNS to the EC2 instance if still running |
| Wrong origin pinned in released wallets | HIGH | Wallet release required; keep the old origin serving until adoption; avoid by pinning the existing domain |
| Secret shipped in bundle | MEDIUM | Rotate the key/token, redeploy a clean build, purge CDN cache |
| CSP blocks WalletConnect after launch | LOW | Switch header to report-only, add the missing origin, redeploy header (no rebuild) |
| Chunk errors after deploy | LOW | Restore previous `_next/static` files, invalidate `index.html` |
| Stale account data shown | LOW | Release a fix keyed on `(network, sdkAddress)`; no user funds at risk |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Web3Modal mounts in wallet | P1 delete, P2 dynamic import | No relay requests in wallet network log |
| 2 Detection race | P2, P6 device walk | Delayed/double `gnus#initialized` tests; Android/iOS walk |
| 3 Double burn / idempotency | P4 | Reload-at-each-step test, one burn |
| 4 Paid not processed | P4, P5 | Both shapes render the same state after reload |
| 5 Null as 0 | P2 mock profile, P5 | Null-everywhere render test |
| 6 `Number` on amounts | P2 validator, P4/P5 | 2^53+1 and 1e21 unit tests, grep for `parseInt`/`Number(` |
| 7 Address formats | P2 types, P3, P5 | Parse tests, no ethers on SDK addresses |
| 8 Account switch and stale responses | P3, P5 | Delayed-response test across a switch |
| 9 WC namespaces and unsupported wallets | P2, P3 | Real GeniusWallet round trip; MetaMask gets "unsupported" |
| 10 WC timeouts and zombie requests | P2, P4 | Background the wallet, then confirm late: one job |
| 11 CSP | P6 (P1 CI check) | Real pairing under enforced header |
| 12 Static export traps | P1, P6 | Deep-link refresh and `404.html` on the real host |
| 13 Secrets in bundle | P1, P6 | CI grep on `out/`; scanner |
| 14 Mobile WebView limits | P4/P5 design, P6 walk | Android and iOS checks |
| 15 Estimate spam | P4 | Typing test: at most one estimate in flight |
| 16 EC2 / allowlist / cutover | P1 branch policy, P6 cutover | Workflow read, rollback drill |
| 17 Kind mock | P2 onward | Fault profiles exist and run in CI |

## Phase-Specific Research Flags

- **P2 (WalletConnect transport):** needs hands-on research. Custom methods/events over the chosen WalletConnect client, request expiry argument, named params round trip with the Dart wallet. Largest unverified area.
- **P6 (CSP and hosting):** needs research on the exact origin list for the installed SDK versions and the host's header mechanism. Also depends on which origin the wallet pins.
- **P6 (mobile WebView):** needs device time; nothing mobile has been run.
- **P1, P3, P5:** standard patterns, low research need.

## Contract gaps to send to the wallet side (found while writing this)

1. `Job` has no `idempotencyKey`; add it, or add `gnus_getSubmission({idempotencyKey})`, so reload recovery does not depend on replaying the call.
2. No decimals/unit field on `cost`, `balance`, earnings; ambiguity between base units and decimal strings.
3. No contract version available over WalletConnect; add it to `gnus_getAccounts` or session metadata.
4. `-32005` mixes rate limiting and "confirm already open"; add `data.reason`.
5. No recovery method for `bridgedNotProcessed`.
6. User-agent marker for "inside GeniusWallet" to remove the detection guess on mobile.
7. Same key with a different job body: behaviour unspecified.

## Sources

- Repo: `.planning/PROJECT.md`, `.planning/research/gnus-rpc-contract.md`, `webview-bridge-spike.md`, `wallet-identity.md`, `.planning/codebase/CONCERNS.md` (HIGH).
- Repo code read for this file: `pages/_app.tsx`, `context/wallet/Web3Modal.tsx`, `config/config.ts`, `next.config.js`, `.github/workflows/aws-ec2-deploy.yml`, `package.json` scripts, `OrderForm.tsx` greps (HIGH).
- WalletConnect Sign RPC methods and expiry: https://specs.walletconnect.com/2.0/specs/clients/sign/rpc-methods and https://docs.walletconnect.network/guides/app-extended-sessions (MEDIUM; web search, expiry default about 5 minutes with 5 minute to 7 day range, spec wording on missing expiry inconsistent).
- Reown docs on optionalNamespaces overwrite behaviour: https://docs.reown.com/appkit/flutter/core/custom-chains and https://docs.reown.com/advanced/providers/universal (MEDIUM; Flutter text, web behaviour not confirmed; no documentation found for an AppKit `universalProviderConfigOverride` option).
- Next.js static export behaviour (API routes, `next/image`, `trailingSlash`, `router.isReady`, `getStaticPaths`): prior knowledge, not re-fetched this session (MEDIUM; confirm against Next 14 docs in P1).
- Platform WebView behaviour (Android file chooser, downloads, CSP exemption of host-injected scripts): prior knowledge plus the wallet-identity note; unverified on device (LOW-MEDIUM).

---
*Pitfalls research for: wallet-WebView plus WalletConnect dApp dashboard, static export, paid compute jobs*
*Researched: 2026-10-26*
