<!-- refreshed: 2026-10-26 -->
# Architecture

**Analysis Date:** 2026-10-26

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     Browser (React 18, Next 14 pages router)          │
│  `pages/_app.tsx` providers: Redux > Web3Modal > Prices > IPFS > Layout│
├───────────────┬───────────────┬───────────────┬──────────────────────┤
│ Dashboard     │ Analytics     │ Job Orders    │ Block/Tx/Address      │
│ `pages/       │ `pages/       │ `pages/       │ `pages/block|         │
│  index.tsx`   │ analytics/`   │ job-orders/`  │ transaction|address/` │
└───────┬───────┴───────────────┴───────┬───────┴──────────────────────┘
        │ axios (same-origin /api/*)    │ ethers v6 via WalletConnect (Web3Modal)
        ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ Next API routes (Node server)│   │ ERC1155 contract on Polygon Amoy  │
│ `pages/api/**`               │   │ `config/config.ts` amoyContract   │
└───────┬──────────────────────┘   └──────────────────────────────────┘
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ `functions/ipfs/node.ts` : koffi FFI to native GeniusSDK              │
│ `data/GeniusSDK.dll` (win32) / libGeniusSDK.dylib / libGeniusSDK.so   │
│ SDK embeds the IPFS/libp2p/CRDT node (in-process, native)             │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell | Global CSS, provider nesting, SEO head | `pages/_app.tsx` |
| Layout | Video background, navbar, footer | `layouts/DefaultLayout.tsx` |
| Order form | Job input, estimate, on-chain payment, job submit | `sub-components/job-order/OrderForm.tsx` |
| Wallet init | `createWeb3Modal` at module load (Amoy only) | `context/wallet/Web3Modal.tsx` |
| Prices context | GNUS price (CoinGecko, CoinPaprika) and gas | `context/prices/PricesContext.tsx`, `hooks/prices/usePrices.tsx` |
| IPFS context | Starts SDK node, polls prepared block/tx data | `context/ipfs/IPFSContext.jsx`, `hooks/ipfs/useIPFS.tsx` |
| Native SDK bridge | koffi bindings, init, cost, process, tx decode | `functions/ipfs/node.ts`, `functions/ipfs/structs.ts` |
| Message handlers | Convert decoded protobuf txs to display rows | `functions/messages/*.ts` |
| In-memory store | Module-level arrays for blocks and txs | `data/prepared/blockchainInfo.jsx`, `data/prepared/transactionInfo.jsx` |
| Redux store | Theme skin only | `store/store.js`, `store/appSlice.js` |

## Pattern Overview

**Overall:** Next.js 14 pages-router app: React client UI plus co-located API routes that wrap a native SDK via FFI. Wallet and payment logic run entirely in the browser.

**Key Characteristics:**
- Pages are client-rendered; no `getServerSideProps`/`getStaticProps` anywhere. No `output: 'export'` in `next.config.js` (only `reactStrictMode: false`, `swcMinify: true`).
- All server work is in 5 API routes under `pages/api/`.
- Only 2 routes touch the native DLL for job work (`getEstimate`, `submitJob`); a third (`startLibp2p`) initializes it.
- Dashboard block/transaction feeds shown to users are simulated in the browser, not read from the node.
- Payment is a client-signed on-chain tx; the server does not verify it before processing.

## Layers

**Pages:** `pages/` - route components, mostly layout plus local state. Depend on `sub-components/`, `functions/time/`.
**Sub-components / widgets:** `sub-components/`, `widgets/` - UI pieces; `OrderForm.tsx` (1066 lines) holds all job logic.
**Context + hooks:** `context/`, `hooks/` - providers wired in `_app.tsx`.
**API routes (Node-only):** `pages/api/` - thin handlers.
**Native bridge (Node-only):** `functions/ipfs/` - koffi, `path`, `process.cwd()`.
**Data:** `data/` - static config, generated protobuf TS, native binary, in-memory arrays.

## Pages

| Route | File | Shows |
|-------|------|-------|
| `/` | `pages/index.tsx` | Landing with video bg, CTA, and `BlockchainInfo` live block/tx tables |
| `/analytics` | `pages/analytics/index.tsx` | Network summary gauges, map, device mix, resources leased, spent assets (`sub-components/dashboard/analytics/*`, data from `data/charts/activeNodes.ts`, `data/map/*`) |
| `/job-orders` | `pages/job-orders/index.tsx` | Renders `OrderForm` 500 ms after mount |
| `/block/[block]` | `pages/block/[block].tsx` | Block detail; state is hardcoded placeholder values |
| `/transaction/[transaction]` | `pages/transaction/[transaction].tsx` | Tx detail; hardcoded placeholder values |
| `/address/[address]` | `pages/address/[address].tsx` | Address detail; hardcoded balance and price |
| `/[...]` | `pages/[...].tsx` | Catch-all, `router.replace("/")` |
| `/wallet` | none | Listed in `data/navbars/navbarRoutes.ts`, no page exists (falls to catch-all) |

## Job Submission End to End

1. User opens `/job-orders`; `OrderForm` mounts and, if wallet not connected, calls `open({view:"Connect"})`, then `open({view:"Networks"})` if chain is not Amoy 80002 (`sub-components/job-order/OrderForm.tsx` ~lines 60-85).
2. `fetchBal()` builds `new ethers.BrowserProvider(walletProvider)`, gets signer, reads `balanceOf(address, 0)` on ERC1155 `config.amoyContract` (`config/config.ts`), displays `/1e18`.
3. User fills form (data URL, model type from `data/orderForm/types.ts`, model file, one or more input sections) or uploads a JSON file `{data, model, input}` (`fileSubmitHandler`, parsed with `FileReader`). Validation is client-side with `validator`.
4. Client POSTs `/api/processing/getEstimate` with body `{ jsonRequest: "<JSON string>" }`. The string is `{"data":{"type","URL"},"model":{"name","file"},"input":[{image,block_len,block_line_stride,block_stride,chunk_line_stride,chunk_offset,chunk_stride,chunk_subchunk_height,chunk_subchunk_width,chunk_count,channels}]}`.
5. `pages/api/processing/getEstimate.ts` reads `req.body.jsonRequest`, calls `getGeniusSDKCost(jsonRequest)` in `functions/ipfs/node.ts`, which calls native `uint64_t GeniusSDKGetCost(const char*)` via koffi, wraps in `BigInt`, returns `null` on error. Handler responds `200` with `parseInt(estimate)` (a bare JSON number, GNUS units) or `500 {error:"Failed to get estimate."}`.
6. Client calls `tokenContract.bridgeOut(BigInt(estimate * 1e18).toString(), 0, destChainID)` where `destChainID = parseInt("deba5edc0de", 16)`, signed by the connected wallet on Amoy. ABI: `balanceOf(address,uint256)`, `bridgeOut(uint256,uint256,uint256)`.
7. If `tx?.hash` exists (it does not wait for confirmation), client POSTs `/api/processing/submitJob` with the same `{jsonRequest}` shape (note: single-form path uses key `url`, file path uses `data` as parsed, and estimate path uses `URL`).
8. `pages/api/processing/submitJob.ts` calls `runGeniusSDKProcess(jsonRequest)` -> native `void GeniusSDKProcess(const char*)`. The function returns nothing and swallows errors, so the handler responds `200` with `parseInt(undefined)` = `NaN`, serialized as `null`. `500 {error:"failed to process job."}` only if the handler itself throws.
9. Client shows toasts, refreshes balance, sets `success`.

No server-side check ties the `bridgeOut` tx to the `submitJob` call. Routes have no auth.

## IPFS Node and Job Data Flow

- The node is not JS libp2p/Helia. It lives inside the native SDK loaded in the Next server process: `koffi.load(...)` at module top of `functions/ipfs/node.ts`, path `process.cwd()/data/{GeniusSDK.dll|libGeniusSDK.dylib|libGeniusSDK.so}` by `process.platform`. Only `data/GeniusSDK.dll` is committed; the `.dylib`/`.so` are not in the repo.
- Start: browser mounts `IPFSWrapper` -> `useIPFS` -> `axios.get("/api/libp2p/startLibp2p")` -> `createNode()` -> `GeniusSDKInit(basePath, ethPrivateKey, autodht=true, process=false, baseport=40001, is_full_node=true)`. The private key is a hardcoded placeholder literal in `functions/ipfs/node.ts`. `createNode` returns `undefined` (sets module var `node`), so the route responds `200` with empty JSON. Init is per call; no guard against repeated calls.
- Job data: the dashboard sends only the JSON job description (a URL plus model/input metadata) to the SDK; the SDK handles distribution to the network. No file bytes are uploaded through the dashboard to IPFS. `getEstimate`/`submitJob` rely on the SDK having been initialized by an earlier `startLibp2p` call in the same server process.
- Read side (incoming txs): `CheckTransactions()` in `node.ts` decodes `GeniusSDKGetInTransactions/OutTransactions` matrices and feeds `ParseTransaction`; it is exported but never called anywhere in the repo. Consequently `data/prepared/*.jsx` arrays stay empty, and `/api/networkData/getBlocksPrev` and `getTransPrev` return those empty arrays. `useIPFS` polls both every 2 s (after 3 s), but `BlockExplorerPreview.tsx` and `TransactionsPreview.tsx` have the `useIPFSContext` usage commented out; no component consumes the context value.
- `sub-components/dashboard/BlockchainInfo.tsx` generates fake blocks (every 3.35 s) and transactions (every 2.15 s) with `Math.random()` hashes entirely client-side.
- Unused JS libp2p stack: `data/ipfs/bootstrapConfig.ts` (bootstrap multiaddrs, mostly commented) and many `libp2p`/`helia`/`@libp2p/*` dependencies in `package.json` are not imported by any source file.
- `functions/messages/*.ts` handlers hold module-level state in `data/prepared/*`; shared in-process across API requests, lost on restart.
- Other IPFS reference: `layouts/DefaultLayout.tsx` loads background video from a Pinata gateway URL (client fetch).

## Protobufs

- Schemas: `data/protobuf/*.proto` (`SGTransaction`, `SGBlocks`, `delta`, `bcast`, `broadcast`, `message`). Generated TS (protobuf-ts 2.9.4, header `@generated`) alongside: `data/protobuf/*.ts`, `data/protobuf/crdt/*.ts`, `data/protobuf/processing/SGProcessing.ts`.
- Used only in `functions/ipfs/node.ts` (server): `require("data/protobuf/SGTransaction")` for `MintTx, ProcessingTx, EscrowTx, TransferTx`; `ParseTransaction` tries `MintTx.fromBinary`, then Processing, Escrow, Transfer in order, first success wins (try/catch cascade, no discriminator). Also required but unused: `delta`, `SGBlocks`.
- Handlers in `functions/messages/{mint,processing,escrow,transfer,block}.ts` map decoded messages to rows pushed into `data/prepared/*`.
- Job request/estimate path uses plain JSON strings, not protobuf.

## Wallet to Payment Wiring

- `context/wallet/Web3Modal.tsx` calls `createWeb3Modal({chains:[amoy], ethersConfig: defaultConfig({metadata}), projectId, ...})` at import time; the `Web3Modal` component just returns `children`. Config from `config/config.ts` (projectId, metadata, networks, contract addresses).
- `OrderForm.tsx` consumes `@web3modal/ethers/react` hooks: `useWeb3Modal`, `useWeb3ModalProvider`, `useWeb3ModalAccount`, `useWeb3ModalEvents`, `useWeb3ModalState`. Events `MODAL_OPEN`, `MODAL_CLOSE`, `CONNECT_SUCCESS` drive modal status and balance refresh.
- Signer is stored in component state (`signer`) and used for the `bridgeOut` contract call. Wallet state is not in Redux or a custom context.

## State Management

- `store/store.js` / `store/appSlice.js`: Redux Toolkit slice `app` with `version`, `skin`; `changeSkin` mutates `document` inside the reducer. Provider in `_app.tsx`.
- `context/prices/PricesContext.tsx`: `usePrices()` calls CoinGecko and CoinPaprika directly from the browser and `/api/gas/gasPrice` (server) for gas; consumed by `sub-components/navbar/Price.tsx`.
- `context/ipfs/IPFSContext.jsx`: exposes `{blockchainInfo, transactionInfo, ...}` from `hooks/ipfs/useIPFS.tsx`; no active consumers.
- Everything else is component-local `useState`/`useRef`.

## Server-Process Dependence (static SPA split)

Requires a Node server process:
- `pages/api/processing/getEstimate.ts` - native `GeniusSDKGetCost` via `functions/ipfs/node.ts`.
- `pages/api/processing/submitJob.ts` - native `GeniusSDKProcess`.
- `pages/api/libp2p/startLibp2p.tsx` - native `GeniusSDKInit` (starts the node, binds port 40001, reads/writes `data/` dir).
- `functions/ipfs/node.ts`, `functions/ipfs/structs.ts` - `koffi`, `path`, `process.cwd()`, native binary in `data/`.
- `pages/api/gas/gasPrice.ts` - server-side axios POST to an Ethereum mainnet RPC URL (hardcoded, includes an embedded key). Pure HTTP; no native code. Browser calling it directly would be subject to the RPC provider's CORS.
- `pages/api/networkData/getBlocksPrev.tsx`, `getTransPrev.tsx` - return module-level in-memory arrays from `data/prepared/*` (server state; currently always empty).
- `functions/messages/*.ts`, `data/prepared/*.jsx` - server-side in-memory state, only reachable from `node.ts`.
- `.github/workflows/aws-ec2-deploy.yml` - deploy is `yarn build` plus `pm2 restart gnus-dashboard` on EC2 (a running Node server).

Pure client code (no server needed):
- All files in `pages/*.tsx` non-api, `layouts/`, `widgets/`, `sub-components/` (except the API calls listed below), `store/`, `styles/`, `data/charts`, `data/map`, `data/navbars`, `data/orderForm`, `config/config.ts`.
- Wallet connection and payment: `context/wallet/Web3Modal.tsx`, the ethers/WalletConnect parts of `OrderForm.tsx` (balance read, `bridgeOut`), all browser-to-RPC/wallet.
- Prices: CoinGecko and CoinPaprika calls in `hooks/prices/usePrices.tsx` (browser to third party), except its `/api/gas/gasPrice` call.
- Dynamic routes `/block/[block]`, `/transaction/[transaction]`, `/address/[address]` read `router.query` client-side and use placeholder data; the `[...]` catch-all is a client redirect. Next static export would need `getStaticPaths` or SPA-style fallback for these dynamic segments; no `getStaticPaths` exists today.
- `pages/_app.tsx` imports `dotenv/config` and reads `process.env.baseURL` (build-time inlining only if defined in `env`; `next.config.js` defines none).

Client calls that hit the Node server (the exact seams to replace):
- `hooks/ipfs/useIPFS.tsx`: `GET /api/libp2p/startLibp2p`, `GET /api/networkData/getBlocksPrev`, `GET /api/networkData/getTransPrev`.
- `hooks/prices/usePrices.tsx`: `GET /api/gas/gasPrice`.
- `sub-components/job-order/OrderForm.tsx`: `POST /api/processing/getEstimate` (lines ~321, ~524), `POST /api/processing/submitJob` (lines ~356, ~562).

## Key Abstractions

**jsonRequest:** a stringified job description passed unchanged from form to native SDK. Defined inline in `OrderForm.tsx`; no shared type.
**koffi structs:** `GeniusArray`, `GeniusMatrix`, `GeniusAddress` in `functions/ipfs/structs.ts` (global registry on `globalThis.structRegistry` to survive HMR); `GeniusTokenValue`, `GeniusTokenID` in `node.ts`.

## Entry Points

**Browser:** `pages/_app.tsx` then the route page. **Server:** Next dev/start (`yarn dev`, `yarn build`, `pm2` in deploy); API routes per file. **Tests:** `scripts/test-runner.js` wrapping Jest/Cypress.

## Architectural Constraints

- **Threading:** Single Node process; koffi calls are synchronous and block the event loop.
- **Global state:** `node`, `requestout`, `transactionOutList`, `transactionInList`, `blockList` in `functions/ipfs/node.ts`; `blockchainData`/`transactionData` in `data/prepared/*.jsx`; `globalThis.structRegistry` in `functions/ipfs/structs.ts`; `createWeb3Modal` singleton in `context/wallet/Web3Modal.tsx`; Redux store in `store/store.js`.
- **Import-time side effects:** importing `functions/ipfs/node.ts` loads the native library; a missing/mismatched binary throws at route load.
- **Init ordering:** `getEstimate`/`submitJob` do not call init; they depend on `startLibp2p` having run in the same process.
- **Circular imports:** none detected.

## Anti-Patterns

### Fire-and-forget SDK calls
**What happens:** `runGeniusSDKProcess` returns void and catches errors; `submitJob.ts` does `parseInt(undefined)`.
**Why it's wrong:** client gets 200/`null` regardless of outcome.
**Do this instead:** return a status from `functions/ipfs/node.ts` and surface it in `pages/api/processing/submitJob.ts`.

### Payment not bound to job
**What happens:** `OrderForm.tsx` submits the job right after `bridgeOut` returns a hash; server never checks the tx.
**Why it's wrong:** `submitJob` is callable by anyone without payment.

### Dead data pipeline
**What happens:** `CheckTransactions` is never invoked; UI uses random data from `BlockchainInfo.tsx`.

## Error Handling

**Strategy:** try/catch with `console.log`; API routes return `500 {error}`; client uses `react-toastify` toasts (`gnus-toast` class).

## Cross-Cutting Concerns

**Logging:** `console.log` throughout, including SDK params and full job JSON.
**Validation:** client-side `validator` in `OrderForm.tsx`; server only checks `typeof jsonData === "string"` in `functions/ipfs/node.ts`.
**Authentication:** none on API routes; wallet connection only on the client.
**Secrets in source:** WalletConnect projectId (`config/config.ts`), RPC URL with key (`pages/api/gas/gasPrice.ts`), placeholder private key (`functions/ipfs/node.ts`).

---

*Architecture analysis: 2026-10-26*
