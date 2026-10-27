# Architecture Research

**Domain:** Static SPA client of a wallet-owned JSON-RPC contract (`gnus_*`), two transports, mock-first development
**Researched:** 2026-10-26
**Confidence:** HIGH on the contract-driven structure, branch analysis and Next static-export rules (read from the contract file, git and the official docs). MEDIUM on the WalletConnect transport details (custom methods with object params were not verified against a live wallet).

## Summary of Recommendations

1. Put everything wallet-facing behind one small, framework-free module, `lib/gnus/`: contract types, a typed client, and a `Transport` interface with three implementations (injected, WalletConnect, mock). No React, no `window` access at import time.
2. Hold session, accounts, jobs and earnings state in Redux Toolkit (already installed, currently only holds theme). Events from the transport dispatch actions; React only reads selectors. This makes every flow testable without rendering.
3. Build against the mock first. The mock is a real implementation of the `window.gnus` shape with scriptable scenarios. The same contract test suite runs against the mock now and against the real wallet later.
4. Delete the server side and the 1066-line `OrderForm.tsx` outright. Do not port the 11-field job form: it builds the old `data/model/input` schema that the wallet now rejects.
5. Base v1 on the current `gsd/dashboard-v1` (which is `main` plus planning docs). Merge none of the unmerged remote branches. Port four small ideas by hand (see "Branch Recommendation").
6. Job detail uses a query-string route (`/jobs/view?tx=0x...`), not a dynamic segment. Static export cannot enumerate job ids.

## Standard Architecture

### System Overview

```
+------------------------------------------------------------------------------+
| Pages (static export, client-rendered)                                       |
|  /            /submit        /jobs          /jobs/view?tx=   /earnings       |
+---------+------------+-------------+---------------+--------------+----------+
          |            |             |               |              |
+---------v------------v-------------v---------------v--------------v----------+
| Feature UI (sub-components/)                                                 |
|  wallet/ (ConnectionGate, IdentityCards, StatusBanner, ConnectPanel)         |
|  submit/ (JobDefinitionInput, EstimatePanel, SubmitFlow, RecoveryNotice)     |
|  jobs/   (JobsTable, JobDetail, StatusBadge)    earnings/ (EarningsPanel)    |
|  shared: DecimalAmount, AddressLabel, ExternalLink                           |
+---------+--------------------------------------------------------------------+
          | selectors + dispatch (hooks/gnus/*)
+---------v--------------------------------------------------------------------+
| State (store/): wallet slice, jobs slice (entity adapter), earnings slice    |
|  thunks get the client via extraArgument; transport events -> actions        |
+---------+--------------------------------------------------------------------+
          | typed calls                                  ^ events
+---------v----------------------------------------------+---------------------+
| lib/gnus/client.ts   GnusClient: getAccounts, estimate, submitJob,           |
|   listJobs, getJob, getEarnings, on/off. Error normalising, result guards.   |
+---------+--------------------------------------------------------------------+
          | request({method, params}) / on(event)
+---------v--------------------------------------------------------------------+
| lib/gnus/transport/   Transport interface                                    |
|   injected.ts (window.gnus)   walletconnect.ts (lazy)   mock/ (dev + tests)  |
|   select.ts: detect, wait for gnus#initialized (3 s), pick ONE, lock         |
+---------+----------------------------+---------------------------------------+
          |                            |
   window.gnus (WebView)        WalletConnect relay -> GeniusWallet
          \________ both land on the wallet's gnus_* handler ________/
```

The dashboard has no other backend. Anything that is not a `gnus_*` call is either static assets or (optionally) a third-party read the CSP explicitly allows.

### Component Responsibilities

| Component | Responsibility | Boundary rule |
|-----------|----------------|---------------|
| `lib/gnus/contract.ts` | Method map (`GnusMethods`: params and result per method), event map, error codes, `Job`, `Accounts`, constants (`CONTRACT_VERSION = "1"`, WalletConnect chain `eip155:80002`, optional methods/events lists) | Only place that spells a method name, event name or error code. Types only plus constants |
| `lib/gnus/errors.ts` | `GnusError {code, message, data?}`, `normalizeError(unknown)`, predicates (`isRejected`, `isWalletNotReady`, `isSwitching`, `isBridgedNotProcessed`) | Injected providers may reject with plain objects or `Error`s with `code`; everything above this line sees one shape |
| `lib/gnus/address.ts`, `amount.ts` | Branded `SdkAddress` (`0x`+128 hex), `EvmAddress` (`0x`+40 hex), guards, short display; `DecimalString` type, BigInt formatting | Never converts between address formats, never uses `Number` for an amount |
| `lib/gnus/client.ts` | `createGnusClient(transport)`: typed method wrappers, light result guards (address formats, decimal strings, null handling), subscription helpers | No React, no Redux, no `window` |
| `lib/gnus/transport/types.ts` | `interface Transport { request; on; removeListener; close }` | The one seam. Matches the contract's EIP-1193 shape so `window.gnus` almost satisfies it as-is |
| `transport/injected.ts` | Wrap `window.gnus`: normalise rejections, check `version === "1"`, no timeout (waits on human confirm) | Created only after `select.ts` decided |
| `transport/walletconnect.ts` | Headless `@walletconnect/sign-client`: pairing URI, session restore, `session_request` with `{method, params}` on `eip155:80002`, `session_event` to `on()`, 60 s read timeout to a `WalletOffline` error | Dynamic `import()` only; never in the in-wallet bundle path |
| `transport/select.ts` | Detection and lock: `window.gnus?.isGeniusWallet`, else wait up to 3 s for `gnus#initialized`, else WalletConnect. One decision per session | Pure function over an injectable env object so tests need no jsdom tricks |
| `lib/gnus/mock/` | `createMockProvider(scenario)` implementing the `window.gnus` shape plus test controls; `installMock()` for dev | Dev and test only; excluded from production output (see Mock section) |
| `store/walletSlice.ts` | Session phase (state machine), accounts, network, `epoch` counter | Single owner of "who am I and can I act" |
| `store/jobsSlice.ts` | Entity adapter keyed by `burnTxHash`; cursor; per-job fetch state | Single owner of job records. Events and fetches both upsert here |
| `store/earningsSlice.ts` | Last `gnus_getEarnings` result, fetch state | Nulls preserved as null |
| `hooks/gnus/*` | `useWalletSession`, `useJobs`, `useJob`, `useEarnings`, `useSubmitJob` | The only things pages and components import for wallet data |
| `sub-components/*` | Presentation. Render `phase` states, never branch on transport kind | Components do not know whether the wallet is injected, WalletConnect or mock |

## Recommended Project Structure

New and changed directories only (existing top-level layout without `src/` is kept; `baseUrl: "./"` imports keep working).

```
lib/gnus/                     # NEW. Framework-free. Fully unit-tested.
  contract.ts                 # types + method/event/error constants
  errors.ts
  address.ts
  amount.ts
  client.ts
  jobDefinition.ts            # light structural check of the job JSON (not schema validation)
  transport/
    types.ts
    injected.ts
    walletconnect.ts          # lazy
    select.ts
  mock/                       # NEW. dev + tests only
    mockProvider.ts
    scenarios.ts
    install.ts                # sets window.gnus, optional delayed gnus#initialized
store/
  store.js                    # CHANGED: makeStore({client}) factory + singleton; theme slice untouched
  walletSlice.ts              # NEW
  jobsSlice.ts                # NEW
  earningsSlice.ts            # NEW
  session.ts                  # NEW. Owns the live client, subscribes events -> dispatch. Idempotent
hooks/gnus/                   # NEW
sub-components/
  wallet/  submit/  jobs/  earnings/  shared/      # NEW
  navbar/, tables/BlockTransactions etc.            # navbar CHANGED, explorer tables DELETED
pages/
  _app.tsx                    # CHANGED
  index.tsx                   # REPLACED: connect + identity + summary
  submit.tsx  earnings.tsx    # NEW
  jobs/index.tsx  jobs/view.tsx   # NEW
  404.tsx                     # NEW (static)
__tests__/
  lib/gnus/                   # unit: client, errors, select, injected, walletconnect(mocked SignClient)
  contract/                   # contract conformance suite, run against mock (later: real wallet)
  store/  hooks/  components/ # integration with makeStore({client: mockClient})
```

### Structure Rationale

- **`lib/gnus/` outside React and outside `store/`:** the contract client is the part that changes when the wallet side changes. Keeping it free of React and Redux means a contract bump touches one directory, and tests need no providers.
- **`lib/` is already declared** in `tsconfig.json` paths (`@/lib/*`), so the directory name costs nothing.
- **Slices per concern, not per page:** accounts, jobs and earnings each have one owner and several readers (nav, submit page, jobs page).
- **Pages stay thin:** page = gate + one feature component. The 1066-line component problem came from mixing wallet, validation, estimate, payment and rendering in one file.

## New, Modified, Deleted

### Deleted (server and explorer)

| Path | Reason |
|------|--------|
| `pages/api/**` | No server in v1 |
| `functions/ipfs/**`, `data/GeniusSDK.dll`, `data/secure_storage.json`, `data/dev_config.json` | koffi bridge and SDK state files; also removes the literal private key |
| `functions/messages/**`, `data/prepared/**`, `data/protobuf/**` | Dead decode pipeline (`CheckTransactions` has no caller); protobuf only served the server |
| `hooks/ipfs`, `context/ipfs`, `data/ipfs/bootstrapConfig.ts` | Polls routes that no longer exist; no consumer |
| `pages/block`, `pages/transaction`, `pages/address`, `pages/[...].tsx` | Explorer is out of v1. The catch-all and the dynamic pages have no `getStaticPaths` and cannot export |
| `sub-components/dashboard/BlockchainInfo.tsx`, `tables/*`, `dashboard/analytics/*`, `data/charts`, `data/map`, `widgets/charts` | Fake or hardcoded data. Analytics gauges, map and charts are out of scope. Delete in the same phase as their pages so the build never has orphan imports |
| `context/wallet/Web3Modal.tsx`, `@web3modal/*`, `@reown/appkit*`, `@walletconnect/web3-provider` (v1, dead) | Module-scope `createWeb3Modal` must not run in the wallet WebView. WalletConnect is re-added headless |
| `sub-components/job-order/OrderForm.tsx`, `data/orderForm/*` (after reading the type list for one datum: `https/ipfs/file`) | See "OrderForm decomposition" |
| `libp2p`, `helia`, `@libp2p/*`, `@chainsafe/*`, `@helia/*`, `@ipld/*`, `any-signal`, `it-pipe`, `datastore-core`, `blockstore-core`, `cheerio`, `@bufbuild/*`, `koffi` | None are imported by source (the architecture map says so). Pruning once, early, shrinks `yarn.lock` churn to a single commit |
| `package-lock.json` | Yarn Classic is authoritative (`PROJECT.md`) |
| `.github/workflows/aws-ec2-deploy.yml` | Builds and runs `pm2 restart`. Replace once the hosting decision is made (see Open Decisions) |
| Tests: `__tests__/pages/api/**`, `functions/ipfs/**`, `functions/messages/**`, `hooks/ipfs`, `context/ipfs`, `e2e/**`, `mocks/web3Modal.js`, `components/dashboard/**` | Test code that is gone. The two `e2e` files never touch the real app (TESTING.md), so deleting them loses no real coverage |

### Kept as is

`styles/`, `layouts/footers`, `public/` (images, fonts), `app.config.js`, theme slice in `store/appSlice.js`, `functions/time/*` (browser-safe, has a test), `widgets/forms/ToggleSwitch.tsx`, `sub-components/socials`, Bootstrap and react-bootstrap, `react-toastify`, `react-tooltip`, `@formkit/auto-animate`, `uuid` (idempotency keys), `validator` if still needed.

### Modified

| Path | Change |
|------|--------|
| `next.config.js` | `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }` (the default loader is unsupported; no file imports `next/image` today so this is a guard), `reactStrictMode: true` |
| `pages/_app.tsx` | Remove `dotenv/config`, `Web3Modal`, `PricesWrapper`, `IPFSWrapper`; fix canonical URL (`process.env.baseURL` is undefined, so today it renders `undefined/...`); wrap with Redux Provider and a `WalletSessionBoot` effect component |
| `store/store.js` | Export `makeStore(extra)`; keep `store` singleton. Add three slices. Leave `appSlice` alone (its reducer touches `document`; not worth changing) |
| `layouts/navbars/NavbarDefault.tsx`, `data/navbars/navbarRoutes.ts` | New routes (Submit, My jobs, Earnings); the dead `/wallet` link goes; identity chip replaces the price pill |
| `layouts/DefaultLayout.tsx` | Remote Pinata video background is a third-party fetch and a CSP entry. Either self-host the file under `public/` or drop it in the hardening phase |
| `config/config.ts` | Keep contract constants only if the dashboard still needs them (it does not call `bridgeOut`; probably only `amoy.chainId` for the WalletConnect chain). Remove keyed RPC URLs |
| `jest.config.js`, `package.json` scripts | Fix known infra gaps (`identity-obj-proxy`, `chalk`, e2e script that boots `next dev`) |
| `tsconfig.json` | Leave `strict: false`. Add `tsconfig.strict.json` that includes only `lib/gnus/**` and `store/*.ts` and run it in CI (see "Strictness") |

### Price and gas pill: delete in v1

`Price.tsx` / `usePrices` call CoinGecko and CoinPaprika from the browser and `/api/gas/gasPrice` on the server. Cost and gas now come from `gnus_estimate`, and every extra third-party origin is a CSP `connect-src` entry on a wallet-allowlisted page. Not in the v1 requirement list; recommend deleting and re-adding later if wanted. Flag for the roadmap as a scope call.

## OrderForm decomposition (1066 lines)

What the file mixes today, by line range:

| Lines | Concern | v1 fate |
|-------|---------|---------|
| 21-120 | Web3Modal connect, network check, signer, ERC1155 `balanceOf` | Deleted. Balance now arrives in `gnus_estimate.balance` |
| 34-48, 123-168 | Old 11-field `input[]` section state | Deleted. Old schema (`data/model/input`) is rejected by the wallet |
| 169-399 | `manualSubmitHandler`: validate, estimate (`axios`), `bridgeOut`, submit | Deleted. Wallet does estimate, confirm, burn, process atomically |
| 400-635 | `fileSubmitHandler`: same flow from an uploaded JSON, duplicated | Deleted |
| 636-1066 | JSX: manual field form (~724-1005), file form (1006-) | Manual form deleted; file/paste input kept in spirit as `JobDefinitionInput` |

Replacement, in `sub-components/submit/`:

- `JobDefinitionInput`: file upload and paste box for a processing-definition JSON (`inputs`/`outputs`/`passes`), an "example job" button using the spike's `posenet-job.json`. Output: a parsed object or an inline parse error.
- `lib/gnus/jobDefinition.ts`: only "is this a JSON object and does it have the top-level keys the contract names". Do not re-implement schema validation. The wallet answers `-32602` for a bad job; show its message. One validator, in the wallet.
- `EstimatePanel`: calls `gnus_estimate` (debounced on explicit button, not on keystroke), shows `cost`, `gas` (nullable), `balance`, and a disabled-with-reason Submit when `cost > balance` (BigInt compare on decimal strings) or when `phase !== 'ready'`.
- `SubmitFlow`: the state machine below.
- `RecoveryNotice`: persisted pending submission and `bridgedNotProcessed` display.

A field-by-field job builder is deferred until the SDK schema is the target; there is no schema file in this repo, and building a form for an unfinished schema repeats the old drift (SDK gap 4 in the spike). This is a product decision to confirm: "v1 submits by uploading or pasting a job definition".

### Submit state machine (hook `useSubmitJob`, `useReducer`, local to the page)

```
idle -> editing -> estimating -> estimated{cost,gas,balance}
                                    |
                                  submit (idempotencyKey fixed at first Submit click, persisted)
                                    v
                         awaitingWalletConfirm   (no timeout; human in the loop)
                          |        |         |            |
                      4001    submitted   bridgedNot-   other error
                    rejected   {burnTx,    Processed     (-32011 balance, -32012 cannot sign,
                    (back to    jobId?}    {burnTx}       -32013 nothing spent, -32005 busy,
                     estimated)  -> go to  -> RecoveryNotice  4900/4901 not ready/switching)
                                 /jobs/view
```

Rules that fall out of the contract:

- **The dashboard never sends a cost.** `gnus_submitJob` takes `{job, idempotencyKey}`; the wallet re-estimates and shows its own confirm. The estimate on screen is advisory and labelled so.
- **Idempotency key lifecycle:** `uuid` generated when the user clicks Submit, written to `localStorage` with a hash of the job and a timestamp before the call, cleared on any terminal result. On mount, an unresolved entry younger than 24 h shows "A submission was in progress" with "Check again" (re-call with the same key; the wallet returns the first result instead of burning twice). Different job text gets a new key.
- **Two tabs:** the wallet answers `-32005` to the second concurrent call. Show "another confirmation is already open", not a generic error.
- **After success:** upsert the returned job into the jobs slice (status `submitted` or `bridgedNotProcessed`, key `burnTxHash`) and navigate. Then confirm with `gnus_getJob({burnTxHash})`. Never insert a job optimistically before the wallet answered.

## Session State Machine (walletSlice)

```
detecting --(window.gnus or gnus#initialized)--> connecting
    |
    +--(3 s, nothing)--> needsWallet --(user starts)--> pairing --(session)--> connecting
                                                           |                       |
persisted WalletConnect session found ------------------------------------------->|
                                                                                   v
connecting --getAccounts ok--> ready{accounts, network}
           --4100--> denied        --4900--> sdkNotReady (retry w/ backoff)
           --timeout (WC only)--> walletOffline (retry button, no spinner)
ready --switching:true or 4901--> switching (reads suspended, submit disabled)
      --disconnect event--> disconnected --> needsWallet or detecting
```

Facts the state machine encodes:

- **First call is a human prompt.** The contract says the first call from an origin asks the user to connect, like `eth_requestAccounts`. That first `gnus_getAccounts` can sit behind a native dialog, so it must not use the 60 s read timeout. Use a separate "connect" call path with no timeout and a "waiting for approval in your wallet" message. Later reads use 60 s over WalletConnect.
- **`phase` is the only thing components branch on.** `ready` renders the feature; every other value renders a named state with one action (Retry, Connect, Open wallet). This is the "handle wallet offline, SDK not ready and account switch as states" requirement from `PROJECT.md`.
- **Late injection after fallback:** if `gnus#initialized` fires after the 3 s fallback and no WalletConnect session is paired yet, tear down WalletConnect and switch to injected. If a WalletConnect session is already active, ignore the late event. This keeps "never both in one session" and rescues slow Android/iOS/macOS injection.
- **Browser users pay the 3 s wait on every load** unless a persisted WalletConnect session exists. Skip the wait when one does. A WebView user never has one.
- **Two identities in state:** `accounts.node` (SDK address, earns, owns jobs) and `accounts.payer` (EVM, pays). Selectors `selectNodeAddress` and `selectPayer` are separate. "My jobs" and "earnings" read only the node address. The payer is a label.

### Account switching (`gnus_accountsChanged`, `switching`)

- Slice holds `epoch`, incremented whenever `node.sdkAddress` changes or `switching` flips to true.
- Every async thunk reads `epoch` at start and returns it with its result; reducers drop results whose epoch is stale. This blocks a slow `listJobs` for account A from filling account B's table.
- When `node.sdkAddress` changes: clear jobs and earnings slices, abort the pending-submission banner (it belongs to the old account; keep the persisted entry, key it by `sdkAddress`), refetch.
- While `switching: true`: disable Submit and Estimate, keep showing the last data with a "switching account" banner, retry on the next `gnus_accountsChanged`. A `4901` reply means the same thing.
- `gnus_networkChanged`: store `network`; if the SDK network or EVM chain changes, treat as an account change for caching purposes (jobs belong to a network).

## Job Record and Live Updates

- **Key:** `burnTxHash`. It is present from the first moment; `jobId` can be null (SDK-JOBID) and can appear later on the same job. Entity adapter `selectId: j => j.burnTxHash`.
- **Merge rule:** upsert, never replace with something older. Compare `status` ordering only to avoid regressing a terminal state from a stale list response: terminal = `completed | failed`. `bridgedNotProcessed` stays visible until the wallet says otherwise. `unknown` renders as "Unknown", not as failure.
- **Sources feeding one slice:** (1) `gnus_listJobs` pages (cursor, default 20), (2) `gnus_getJob` for the detail view, (3) `gnus_jobUpdated` events, (4) the `submitJob` result.
- **Events are hints, not truth.** Over WalletConnect, events can be missed (backgrounded phone, relay gap). So: refetch page 1 on `ready`, on reconnect, and on `visibilitychange` to visible; while the jobs page is open and any job is non-terminal, also poll `listJobs` every 20-30 s. Injected transport events are reliable but the same backstop is cheap and covers the wallet's "wallet-polled until SDK pushes" gap.
- **Null fields:** `cost`, `result`, `jobId` render through shared components (`DecimalAmount`, `AddressLabel`) that show "Not available yet" for `null`. Never `0`, never blank.
- **Detail route:** `/jobs/view?tx=<burnTxHash>`; reads `useRouter().query` only after `router.isReady` (in a static export, `query` is empty on the first render). Calls `gnus_getJob` once on mount and then follows the slice.
- **Result links:** `result.cids` become `https` gateway links opened with `ExternalLink` (`target="_blank" rel="noopener noreferrer"`), which the wallet sends to the system browser. No in-page downloads and no `window.open`.

## Typed Contract Client

```typescript
// lib/gnus/contract.ts (shape)
export type DecimalString = string & { readonly __brand: "decimal" };
export type SdkAddress = `0x${string}` & { readonly __brand: "sdk" };   // 128 hex
export type EvmAddress = `0x${string}` & { readonly __brand: "evm" };   // 40 hex

export interface GnusMethods {
  gnus_getAccounts: { params: undefined;                result: Accounts };
  gnus_estimate:    { params: { job: JobDefinition };   result: Estimate };
  gnus_submitJob:   { params: { job: JobDefinition; idempotencyKey: string }; result: SubmitResult };
  gnus_listJobs:    { params: { limit?: number; cursor?: string }; result: { jobs: Job[]; nextCursor: string | null } };
  gnus_getJob:      { params: { jobId: string } | { burnTxHash: string }; result: JobDetail };
  gnus_getEarnings: { params: { includeChildren?: false }; result: Earnings };
}
export interface GnusEvents {
  gnus_accountsChanged: Accounts;
  gnus_networkChanged:  { sdk: string; evmChainId: number };
  gnus_jobUpdated:      Job;
  disconnect:           { code: number; message: string };
}

// lib/gnus/transport/types.ts
export interface Transport {
  request(args: { method: string; params?: object }): Promise<unknown>;
  on(event: string, h: (payload: unknown) => void): void;
  removeListener(event: string, h: (payload: unknown) => void): void;
  close?(): void;
}

// lib/gnus/client.ts
export function createGnusClient(t: Transport): GnusClient { /* typed wrappers + guards */ }
```

Rules:

- **Guards at the trust boundary, not a schema library.** Check: address formats (`/^0x[0-9a-f]{128}$/`, `/^0x[0-9a-f]{40}$/`), decimal strings (`/^\d+$/`), `status` in the known set (map anything else to `unknown`), `version === "1"`. No new dependency. On mismatch throw `GnusError` with a local code, surface as "wallet speaks a different contract version".
- **Params are always objects**, never positional arrays. The `Transport` types enforce it.
- **Cost display units are an open contract gap.** `gnus_estimate`, `Job.cost` and `gnus_getEarnings` carry decimal strings but no `decimals`/`unit`. The contract (U1) says display with the wallet's decimals and do not rescale. The dashboard cannot do that without being told the decimals. Raise as a change request to the wallet side: add `decimals` (or `unit`) to `network` or to each amount result. Until then, show the raw decimal string with the label "GNUS (wallet units)" and no conversion.

## Patterns to Follow

### Pattern 1: Select the provider once, lazily load the other

**What:** `select.ts` returns a `Transport` and locks the choice. WalletConnect code sits behind `await import("./walletconnect")` and is never evaluated in the injected path.
**When:** Always. A module-scope `createWeb3Modal` is exactly what the current app does and what must not happen inside the wallet.
**Trade-offs:** One extra async chunk for browser users; worth it for the in-wallet guarantee.

```typescript
export async function selectTransport(env: Env): Promise<{ kind: "injected" | "walletconnect"; transport: Transport }> {
  if (env.window.gnus?.isGeniusWallet) { return { kind: "injected", transport: wrapInjected(env.window.gnus) }; }
  if (await env.waitForEvent("gnus#initialized", 3000) && env.window.gnus?.isGeniusWallet) {
    return { kind: "injected", transport: wrapInjected(env.window.gnus) };
  }
  const { createWalletConnectTransport } = await import("./walletconnect");
  return { kind: "walletconnect", transport: await createWalletConnectTransport(env) };
}
```

### Pattern 2: Detection only in an effect

**What:** Provider detection runs in `useEffect` inside `WalletSessionBoot`, never at module scope or during render. Initial store state is `detecting`, identical on server (the static HTML) and client.
**When:** Always under static export; avoids `window is not defined` at build and hydration mismatches.

### Pattern 3: Client injected through the store

**What:** `makeStore({ client })`; thunks use `extra.client`. Tests build a store around `createGnusClient(createMockProvider(...))`.
**When:** All state logic. No module-level singleton of the client except the one assembled in `store/session.ts` at app boot.

### Pattern 4: Idempotent subscribe

**What:** `session.ts` registers event handlers keyed by transport instance and removes them on teardown. With `reactStrictMode: true` effects run twice in dev; this is the test that it holds.

### Pattern 5: Strictness only where it is new

**What:** Leave `strict: false` for the legacy tree. `tsconfig.strict.json` includes `lib/gnus/**` and the new slices with `strict: true` and runs as `tsc -p tsconfig.strict.json --noEmit` in CI. The unmerged `security/typescript-headers` branch turns strict on globally; with a codebase full of `any` this is a large unrelated diff.

## Anti-Patterns

### Anti-Pattern 1: Reading `window.gnus` at import time

**What people do:** `const provider = window.gnus` at module scope.
**Why it's wrong:** Missing in the static build; late-arriving on Android, iOS, macOS; breaks the 3 s wait.
**Do this instead:** `select.ts` in an effect, with the `gnus#initialized` listener.

### Anti-Pattern 2: Inferring identity from the payer

**What people do:** key "my jobs" on the connected EVM address (as the current app does).
**Why it's wrong:** An SDK address cannot be derived from an EVM address; payer and node differ by design.
**Do this instead:** key everything on `accounts.node.sdkAddress`; show payer as a label.

### Anti-Pattern 3: Treating null as zero or a spinner

**What people do:** `earned.total ?? 0`, or spin forever on a WalletConnect timeout.
**Why it's wrong:** The core value is "never a fake or misleading number". Timeouts are states.
**Do this instead:** `DecimalAmount` renders "Not available yet"; timeout becomes `walletOffline` with Retry.

### Anti-Pattern 4: Events as the only source of truth

**What people do:** wait for `gnus_jobUpdated` and never refetch.
**Why it's wrong:** Over WalletConnect, events are dropped when the phone sleeps.
**Do this instead:** events upsert; refetch on ready, reconnect, visibility; poll while non-terminal jobs are shown.

### Anti-Pattern 5: Two-provider hybrids

**What people do:** use `window.gnus` to submit and Web3Modal to pay (the identity-research failure mode).
**Why it's wrong:** Bypasses the wallet's bridge gate; payer and job owner drift.
**Do this instead:** one transport per session, `gnus_submitJob` only; no `bridgeOut`, no `ethers.Contract` in the dashboard.

### Anti-Pattern 6: Mock leaking into production

**What people do:** `if (location.search.includes("mock")) installMock()` in `_app.tsx`.
**Why it's wrong:** A `window.gnus` that the page installs itself would sit on a wallet-allowlisted origin and show fake accounts and jobs.
**Do this instead:** gate on a build-time constant and verify the output (next section).

### Anti-Pattern 7: Porting the old form

**What people do:** carry `block_len`, `chunk_stride` fields into a new component.
**Why it's wrong:** Old schema; the wallet rejects it (`-32602`).
**Do this instead:** JSON upload or paste; schema validation stays in the wallet.

## Data Flow

### Boot and connect

```
page load (static HTML, phase = detecting)
  -> WalletSessionBoot effect
  -> select.ts: window.gnus? / gnus#initialized (3 s) / persisted WC session? / WC
  -> store/session.ts: client = createGnusClient(transport); subscribe events
  -> thunk connect(): gnus_getAccounts   (no timeout: may show a native approval)
  -> walletSlice: phase = ready{accounts, network}   (or denied/sdkNotReady/offline)
  -> ConnectionGate renders children; identity cards show node + payer
```

### Submit

```
JobDefinitionInput -> parsed object
EstimatePanel -> gnus_estimate{job} -> {cost,gas,balance}
user clicks Submit -> key = uuid; persist {key, jobHash, sdkAddress, ts}
  -> gnus_submitJob{job,key}            (wallet: confirm, burn, process; may take minutes)
  -> result {burnTxHash, jobId|null, status}
  -> jobsSlice.upsert -> router.push('/jobs/view?tx=...') -> gnus_getJob -> follow slice
```

### Live update

```
wallet polls SDK -> gnus_jobUpdated(Job) -> transport.on -> session.ts -> jobsSlice.upsert
                                                           backstop: refetch on ready / visibility / 30 s
```

### State management

```
Transport events --> store/session.ts --> actions --> slices --> selectors --> components
Components --> hooks (dispatch thunks) --> client --> Transport --> wallet
```

## Routing Under Static Export

Verified against the Next.js pages-router static export guide (HIGH). Relevant rules: no API routes, rewrites, redirects or `headers()`; default image loader unsupported; dynamic routes need `getStaticPaths` without `fallback`; `getServerSideProps` unsupported.

| Decision | Recommendation | Why |
|----------|----------------|-----|
| Config | `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true` | `trailingSlash` emits `/jobs/index.html`, which static hosts serve on `/jobs/` with no rewrite rules. Without it, hosts need `try_files $uri.html` style config |
| Job detail | Query string: `/jobs/view?tx=0x...` | Job ids and burn hashes are unbounded at build time; `getStaticPaths` cannot list them. Works on any static host, deep-linkable, no history/hash tricks |
| Catch-all `[...]` | Delete; add `pages/404.tsx` that links home | A catch-all without `getStaticPaths` breaks `output: 'export'` |
| Old `/job-orders` | Optional 5-line client redirect page to `/submit`, only if existing links matter. `config/config.ts` metadata still references it | Server redirects do not exist in export |
| Auth gating | Client `ConnectionGate` in each page | No middleware. Pre-rendered HTML shows the `detecting` state, then the page resolves |
| `router.query` | Wait for `router.isReady` | Empty on first render of a static page |
| Env | `NEXT_PUBLIC_*` only, inlined at build. WalletConnect project id is public by design (domain-restricted in Reown cloud); build-time variable is enough | No runtime config in a static bundle |
| Headers / CSP | Cannot come from Next. Set at the host (response headers policy, nginx). Next 14 pages export emits inline scripts (`__NEXT_DATA__`), so a strict CSP needs hashes or `unsafe-inline` for script; plan this as a hardening task, not a one-liner | `security/typescript-headers` has a CSP string using `unsafe-eval` and `unsafe-inline`; useful only as a list of origins to start from |
| Hosting | One pinned https origin; wallet allowlist must contain its exact scheme+host+port | Decision outstanding (see Open Decisions) |

Route set for v1: `/` (connect, identity, short summary), `/submit`, `/jobs`, `/jobs/view`, `/earnings`, `404`.

## Mock Provider and Testing Without the Wallet

### What the mock is

`createMockProvider(options)` returns an object with the `window.gnus` surface (`isGeniusWallet: true`, `version: "1"`, `request`, `on`, `removeListener`) plus test controls (`emit(event, payload)`, `setScenario`, `advanceJobs()`, `calls` log). It is a stateful in-memory fake of the wallet side of the contract: accounts, a job list that moves through `submitted -> queued -> processing -> completed` on timers or on `advanceJobs()`, idempotency table with a 24 h window, and a `-32005` concurrency guard.

Scenarios (named, selectable by test or dev panel):

| Scenario | Exercises |
|----------|-----------|
| `happy` | Full path including estimate, submit, live updates, earnings with real values |
| `lateInjection` | `window.gnus` appears after N ms and `gnus#initialized` fires (Android/iOS/macOS path) |
| `neverInjected` | No `window.gnus` (drives the WalletConnect branch with a fake WC transport) |
| `sdkNotReady` | 4900 for N seconds, then fine |
| `switching` | `switching: true`, 4901 on reads, then `gnus_accountsChanged` with a new `sdkAddress` |
| `rejectConfirm` | 4001 on submit |
| `bridgedNotProcessed` | burn ok, `status: bridgedNotProcessed`, and `-32014` variant |
| `costUnavailable`, `insufficientBalance`, `cannotSign` | `-32010`, `-32011`, `-32012` |
| `duplicateKey` | same key returns the first result; second concurrent call returns `-32005` |
| `nullEarnings`, `jobIdNull` | SDK gaps as they are today (jobId null, `earned: null`) |
| `walletOffline` | request never resolves (drives timeout UI) |
| `permissionDenied` | first call returns 4100 |

### Where it runs

1. **Unit and integration (Jest + RTL, primary):** import `createMockProvider`, wrap with `createGnusClient`, build `makeStore({client})`, render the real component tree. No `jest.mock` of Web3Modal or axios needed; this replaces most of the current fragile module mocks. Use `jest.useFakeTimers()` for job progression and the 3 s detection window.
2. **Dev server in a normal browser:** `yarn dev:mock` sets `NEXT_PUBLIC_GNUS_MOCK=1`. `_app.tsx` does `if (process.env.NEXT_PUBLIC_GNUS_MOCK === "1") { await import("lib/gnus/mock/install") }` before boot. Next inlines the variable, so the branch and the import are dead-code-eliminated when unset. The same install script can delay `window.gnus` and dispatch `gnus#initialized` to rehearse the late path. A small dev-only panel (scenario picker, "advance jobs") is optional; a `?scenario=` query read only inside the mock install is enough.
3. **Build verification:** add a CI step that fails if `out/` contains a marker string from the mock (for example `__GNUS_MOCK__`) when built without the flag. Cheap, and it enforces Anti-Pattern 6.
4. **Real-browser smoke:** one test against the exported `out/` served statically, injecting the mock before page scripts. Cypress is already a devDependency but unconfigured; Playwright is not installed. Pick Cypress to avoid a new dependency unless its `onBeforeLoad` injection proves awkward for the delayed case. This replaces the fake Jest "e2e" suite and the `next dev` boot in `test:e2e`. Static serving needs `serve` or similar as a devDependency (`next start` does not serve an export).

### Contract conformance suite

`__tests__/contract/gnusContract.test.ts` takes a provider factory and asserts the contract: result shapes, address formats, decimal strings, error codes for bad params, idempotency, null handling. Run against the mock now. Later, run the same file against the real wallet in a staging environment (a manual or nightly job over the injected transport) so the mock cannot drift silently from the wallet. The snapshot of the contract is at `research/gnus-rpc-contract.md`; the version check (`window.gnus.version`) is the tripwire.

### WalletConnect transport tests

- **Unit:** mock `@walletconnect/sign-client`. Assert: request becomes `client.request({ topic, chainId: "eip155:80002", request: { method, params } })` with object params preserved; `session_event` maps to `on()` handlers; 60 s timeout becomes `WalletOffline`; `gnus_submitJob` has no timeout; session restore.
- **Not testable without a live wallet:** the proposal's optional methods/events being approved by GeniusWallet, and object `params` surviving the relay. Plan one manual pairing against a real GeniusWallet build as an acceptance step, not a unit test. The repo already carries `@reown/walletkit` and could play wallet in a Node test, but it needs the real relay and network; treat as optional.

### WalletConnect library choice (MEDIUM)

Use headless `@walletconnect/sign-client` directly and render the pairing URI as a QR plus "open in wallet" link in our own `ConnectPanel`. Reasons: custom non-standard methods with named params go through `client.request` unchanged; `@walletconnect/ethereum-provider` and AppKit are built around standard `eth_*` methods and add a modal and chain-switch behaviour the dashboard does not want. `sign-client` 2.17.3 and `qrcode` 1.5.3 are already in `yarn.lock` transitively; add them as direct dependencies. Declare `gnus_*` methods and events as `optionalNamespaces.eip155` (per the contract), chain `eip155:80002`. Verify with the wallet owners that object params are accepted by their `session_request` handler; the web search for custom-method handling found nothing authoritative.

## Branch Recommendation

Facts (from `git log` and `git diff main...origin/<branch> --stat`, no checkout):

| Ref | Position vs `main` | Touches | Verdict |
|-----|--------------------|---------|---------|
| `origin/develop` | `b84e319`, an ancestor of `main` (PR #3 merged it) | already in `main` | Nothing to take. The tests TESTING.md describes are exactly this content |
| `origin/security/epic-17` | `b84e319`, ancestor of `main` | none | Nothing to take |
| `origin/security/credential-management` | +1 commit | `functions/ipfs/node.ts`, `pages/api/gas/gasPrice.ts`, `pages/api/health.ts`, `.env.example`, `config/config.ts`, `data/secure_storage.json` | Skip. All server files except `config.ts`, which only swaps constants for `process.env.*` (its `.env.example` also lists JWT, DB, Sentry and `ETH_PRIVATE_KEY`) |
| `origin/security/authentication-validation` | +1 commit | `middleware/auth.ts`, `validation.ts`, `pages/api/processing/*` | Skip. JWT and joi for API routes that no longer exist |
| `origin/security/logging-rate-limiting` | +1 commit | `middleware/rateLimit.ts`, `utils/logger.ts` | Skip. Server only |
| `origin/security/cicd-dependencies` | +2 commits | EC2 deploy workflow, `jest.config.js` (+14 lines of bare-import mappers), `package.json` (adds `joi`, `jsonwebtoken`, `packageManager`), `yarn.lock` (+1832 lines), rewrites API-route tests, `authTestHelper.js` | Skip as a merge. It rewrites tests for files v1 deletes and adds two dependencies v1 does not want. Its `jest.config.js` hunk is the only reusable idea |
| `origin/chore/update-dependencies` | +1 commit | deletes `package-lock.json` (44k lines), bumps protobuf plugin, `packageManager`, `.gitignore`, fixes a protobuf import in `node.ts` | Skip as a merge (touches `yarn.lock` and a file v1 deletes). Its useful content is "delete `package-lock.json`", which v1 does itself |
| `origin/security/typescript-headers` | +1 commit | `next.config.js` `headers()` (unsupported in export), `tsconfig.json` `strict: true` | Skip. Ideas ported by hand (below) |
| `origin/test/*` (5 branches) | +1 commit each, 2-3 files | protobuf, SDK signature and processing tests | Skip. They test koffi and protobuf code that v1 deletes |

**Recommendation:** base v1 on the current `gsd/dashboard-v1` (`main` `479b95f` plus planning docs). Do not merge any remote branch. Every one of them either is already in `main` or changes files that v1's first phase deletes, so merging first only creates conflicts in `package.json`/`yarn.lock` and in files being removed.

Port by hand, each a few lines:
1. Delete `package-lock.json` (from `chore/update-dependencies`; matches the Yarn Classic constraint).
2. If Jest cannot resolve bare `baseUrl` imports (`data/...`, `context/...`), add the mapper block from `cicd-dependencies` `jest.config.js`. Check first: `next/jest` may already resolve them.
3. `reactStrictMode: true` (from `typescript-headers`); it surfaces double-effect bugs in the session wiring during development.
4. The CSP origin list in `typescript-headers`, as a starting inventory for the hardening phase only.

Note on history: the literal private key stays in git history on every branch and on `main`. Deleting it from the tree satisfies the v1 requirement; rotating it is the human action `PROJECT.md` already names. Do not spend a phase on history rewriting.

Also note: local `main` is one docs commit ahead of `origin/main` (`707accb`). When `gsd/dashboard-v1` is eventually proposed upstream, the diff base is `origin/main`.

## Build Order and Dependencies

```
P1 Static shell and teardown ------------------+
P2 Contract, client, transports, mock (lib/) --+--> P3 Session state and connect UI
   (can start once jest infra works)           |        |
                                               |        +--> P4 Submit job
                                               |        +--> P5 My jobs and live updates
                                               |        +--> P6 Earnings
                                               +----------> P7 WalletConnect transport and browser flow
                                                            P8 Hardening, hosting, device walks   (needs P4-P7)
```

| Phase | Content | Depends on | Notes |
|-------|---------|------------|-------|
| P1 Static shell and teardown | `output: 'export'`, delete server, koffi, explorer, Web3Modal, old OrderForm, dead deps, `package-lock.json`, key and keyed RPC URL gone, `dotenv` import gone, jest infra fixed (`identity-obj-proxy`, `chalk`), fake e2e removed, placeholder pages so the build is green | none | Exit: `yarn build` produces `out/`; `git grep -n "koffi\|api/processing\|createWeb3Modal"` empty; secret scan clean; remaining tests pass. Run the test baseline before and after and record both |
| P2 Contract layer and mock | `contract.ts`, `errors`, `address`, `amount`, `client`, `select`, `injected`, `mock/`, contract conformance suite, `tsconfig.strict.json` | jest infra from P1 | Pure TypeScript, no UI. Can run in parallel with the second half of P1. Exit: conformance suite green on the mock; `select` tested for early, late (3 s) and absent injection |
| P3 Session state and connect UI | `makeStore`, `walletSlice`, `session.ts`, `WalletSessionBoot`, `ConnectionGate`, identity cards, status banners (offline, SDK not ready, switching, denied, disconnected), new layout and nav, mock install behind `NEXT_PUBLIC_GNUS_MOCK` | P2 | Exit: every `phase` is reachable and visible through mock scenarios; account switch drops stale results; StrictMode double mount is clean |
| P4 Submit job | `JobDefinitionInput`, `EstimatePanel`, `useSubmitJob`, idempotency persistence, `RecoveryNotice`, error mapping | P3 | Highest risk of money loss; richest test matrix (rejection, balance, duplicate key, reload mid-call, `bridgedNotProcessed`). Needs wallet answers on same-key replay behaviour (below) |
| P5 My jobs and live updates | `jobsSlice`, list with cursor, `/jobs/view`, `gnus_jobUpdated` upsert, refetch backstops, null-aware rendering | P3 (P4 only for the post-submit hand-off, mockable) | Parallel with P4 and P6 |
| P6 Earnings | `earningsSlice`, panel, "not available yet" for nulls, node identity label | P3 | Smallest. Parallel with P4 and P5 |
| P7 WalletConnect transport | `sign-client` transport, QR/deep-link `ConnectPanel`, session persistence and restore, timeouts, event mapping | P2 interface, P3 states | External dependency: the wallet must approve a proposal with `gnus_*` optional methods. Schedule after the in-wallet slices so it never blocks them. Needs a real-device acceptance step |
| P8 Hardening | Hosting and pinned origin, CSP via host headers (script hashes), self-host or drop remote video, external-link and download audit, mock-excluded build check, Cypress smoke on `out/`, a11y pass, deploy workflow replaced, Windows/Linux/Android WebView walks | P4-P7 | Wallet allowlist needs the final origin before the in-wallet release builds |

Why this order: P2 before any UI so nothing is built on guessed shapes; P3 before features because every feature renders `phase` and reads `accounts`; P4-P6 are independent leaves over P3; WalletConnect last among features because it is the only piece that needs the wallet team and a real device, and the mock covers everything else.

## Open Decisions and Contract Gaps (change requests go to the wallet side)

| # | Item | Why it matters | Owner |
|---|------|----------------|-------|
| 1 | Amount decimals/unit absent from `gnus_estimate`, `Job.cost`, earnings (contract U1) | Cannot display correctly without rescaling, which the contract forbids | Wallet |
| 2 | No method to recover a `bridgedNotProcessed` job | `PROJECT.md` wants a "recoverable" state; the contract only says the wallet keeps the record. Either add a retry method or the UI text is "open GeniusWallet to resume" | Wallet |
| 3 | Same-key replay: does it prompt again? What if the first call is still pending? | Defines the reload-recovery UX in P4 | Wallet |
| 4 | First-call connect prompt: confirm that `gnus_getAccounts` may block on a native dialog and that 4100 is retryable | Drives the no-timeout connect path | Wallet |
| 5 | WalletConnect: are `gnus_jobUpdated` and `gnus_accountsChanged` delivered as `session_event` for a dashboard session, and are object params accepted | Decides whether polling is the only live path in the browser | Wallet |
| 6 | `Job` has no title, kind or job hash | My jobs rows will show only burn hash, time, cost, status. Consider a `label` the dashboard can send and the wallet echo | Wallet / product |
| 7 | Job input mode: JSON upload and paste only in v1? | Drops the field-form builder | Product (Braian) |
| 8 | Price and gas pill dropped in v1 | Fewer third-party origins | Product |
| 9 | Hosting and pinned origin, deploy pipeline | The EC2 `pm2` workflow stops working after export; wallet allowlist needs the final origin | Product / infra |
| 10 | Late `gnus#initialized` after the 3 s fallback | Resolution proposed above (switch if no WC session yet); confirm with wallet team | Dashboard + wallet |

## Scaling Considerations

A static SPA talking to a local or paired wallet has no server scaling problem. The relevant limits are client-side.

| Concern | Now | Later |
|---------|-----|-------|
| Job list size | Cursor pages of 20; entity adapter in memory | Virtualise the table past a few hundred rows; server-side paging is already the contract |
| Polling load on the wallet | One `listJobs` poll every 20-30 s only while non-terminal jobs are visible | Drop polling for injected transport once the wallet pushes reliably |
| WalletConnect relay | One session; requests are small | Session expiry handling and re-pair prompts |
| Bundle size | Removing libp2p/helia/web3modal/ethers-contract code should shrink it a lot | Keep WalletConnect lazy |

## Sources

- `.planning/PROJECT.md`, `.planning/research/gnus-rpc-contract.md` (contract draft 2026-10-26), `webview-bridge-spike.md`, `wallet-identity.md`
- `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `TESTING.md`; direct reads of `package.json`, `next.config.js`, `tsconfig.json`, `jest.config.js`, `pages/_app.tsx`, `store/*`, `sub-components/job-order/OrderForm.tsx`, `layouts/DefaultLayout.tsx` (HIGH)
- Git: `git log main..origin/<branch>`, `git diff main...origin/<branch> --stat` and selected file diffs; ancestry checked with `git merge-base --is-ancestor` (HIGH)
- Next.js, "How to create a static export of your Next.js application" (pages router), https://nextjs.org/docs/pages/guides/static-exports, last updated 2025-05-12 (HIGH)
- WalletConnect/Reown Ethereum Provider docs (optional namespaces guidance) via web search; custom-method handling not confirmed in any source (LOW for that detail, hence the manual acceptance step)
- `yarn.lock` entries for `@walletconnect/sign-client@2.17.3` and `qrcode@1.5.3` (transitive today)

---
*Architecture research for: gnus-dashboard v1 static SPA over the gnus_* wallet contract*
*Researched: 2026-10-26*
