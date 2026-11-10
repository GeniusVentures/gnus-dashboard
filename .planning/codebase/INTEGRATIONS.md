# External Integrations

**Analysis Date:** 2026-10-26

## Native GNUS SDK (`data/GeniusSDK.dll`)

**What it is:**
- Prebuilt native shared library, `data/GeniusSDK.dll` (about 26.5 MB), tracked in git (blob `932ae01d...`). It is the only native binary in the repo.
- It runs the GNUS node: the libp2p/DHT networking, identity, balances, transactions, processing cost estimates, and job submission. The Node app talks to it through a C ABI.

**How it is loaded (server-side only):**
- `functions/ipfs/node.ts` is the single loader. It `import`s `koffi`, picks a library path from `process.platform`, and calls `koffi.load(libraryPath)` at module load:
  - `win32` -> `path.join(process.cwd(), "data", "GeniusSDK.dll")`
  - `darwin` -> `data/libGeniusSDK.dylib`
  - `linux` -> `data/libGeniusSDK.so`
  - anything else -> throws `Unsupported platform`
- The darwin and linux binaries are not in the repo. Only the Windows DLL exists, so macOS and Linux will fail at load time.
- The path is relative to `process.cwd()`, so the app must be started from the repo root. Starting from another directory breaks the load.
- Struct definitions for the ABI are in `functions/ipfs/structs.ts` (`GeniusArray`, `GeniusMatrix`, `GeniusAddress`) and in `functions/ipfs/node.ts` (`GeniusTokenValue`, `GeniusTokenID`). Structs are cached on `globalThis.structRegistry` to avoid re-definition during hot reload.
- Functions bound with `GeniusSDK.func(...)` in `functions/ipfs/node.ts`:
  - Lifecycle: `GeniusSDKInit`, `GeniusSDKInitSecure`, `GeniusSDKInitMinimal`, `GeniusSDKShutdown`
  - Balances: `GeniusSDKGetBalance`, `GeniusSDKGetBalanceGNUS`, `GeniusSDKGetBalanceGNUSString`, `GeniusSDKGetGNUSPrice`
  - Address and transactions: `GeniusSDKGetAddress`, `GeniusSDKGetInTransactions`, `GeniusSDKGetOutTransactions`, `GeniusSDKFreeTransactions`
  - Mint and transfer: `GeniusSDKMint`, `GeniusSDKMintGNUS`, `GeniusSDKTransfer`, `GeniusSDKTransferGNUS`, `GeniusSDKPayDev`
  - Processing: `GeniusSDKGetCost`, `GeniusSDKGetCostGNUS`, `GeniusSDKProcess`
- `createNode()` calls `GeniusSDKInit(basePath, ethPrivateKey, true, false, 40001, true)`. The arguments are base path (`data/`), an Ethereum private key, auto-DHT on, process off, port 40001, full node on.
- The private key is a literal in `functions/ipfs/node.ts` (`ethPrivateKey` inside `createNode`). The source comment says "Replace with the actual private key". See the security concern below. Do not copy the value anywhere.

**Who calls it:**
- `pages/api/libp2p/startLibp2p.tsx` calls `createNode()`. It is hit by `hooks/ipfs/useIPFS.tsx` on mount (`axios.get("/api/libp2p/startLibp2p")`).
- `pages/api/processing/getEstimate.ts` calls `getGeniusSDKCost(jsonRequest)`.
- `pages/api/processing/submitJob.ts` calls `runGeniusSDKProcess(jsonRequest)`.
- `CheckTransactions()` in `functions/ipfs/node.ts` reads outgoing and incoming transaction lists, decodes them, and dispatches each to a message handler. It is exported from `functions/ipfs/node.ts` but has no caller in this repo.

**Platform constraints and gotchas:**
- Windows x64 only. macOS and Linux need the matching library placed in `data/`.
- Each call to `startLibp2p` reruns `GeniusSDKInit` on the same module-level `node` variable. The same process-wide SDK instance is shared by all requests. Calls are synchronous FFI calls, so long SDK calls block the Node event loop.
- Returned `const char*` and struct pointers are decoded by koffi. The transaction lists must be freed with `GeniusSDKFreeTransactions`. The code does this in `CheckTransactions`.

## IPFS / libp2p Node

**Actual node:**
- The running IPFS/libp2p node is inside the native SDK (`GeniusSDKInit`). It is started from the Next.js API route `pages/api/libp2p/startLibp2p.tsx`.
- The node uses the SDK's own networking. Port `40001` is passed to `GeniusSDKInit`.
- Config inputs: base path `data/` (contains `dev_config.json`, `secure_storage.json`, and the SDK's data directory), private key (hardcoded, see below), and the boolean flags above.

**Bootstrap peers (not wired into the SDK call):**
- `data/ipfs/bootstrapConfig.ts` exports `bootstrapConfig.list`. Only the public `/ip4/` and `/ip6/` multiaddrs for the Protocol Labs bootstrap nodes (`mars`, `pluto`, `saturn`, `venus`, `earth`) are active. The `dnsaddr` and `wss` entries are commented out.
- `functions/ipfs/node.ts` does not import `bootstrapConfig`. Whether the SDK reads this list is not visible in this repo.

**Other IPFS usage:**
- `pages/_app.tsx` and `layouts/DefaultLayout.tsx` load the background video from a Pinata gateway (`https://orange-generous-tern-256.mypinata.cloud/ipfs/<cid>`, used by `sub-components/videos/StaticVideoBG.tsx`). This is the only outbound IPFS gateway use found.
- The libp2p, helia, and IPFS npm packages are declared in `package.json` but not imported. See STACK.md.

## Protobuf Schemas (regenerated from SuperGenius)

**Generator:** `protobuf-ts` (`@protobuf-ts/plugin` 2.9.4 in `devDependencies`, `@protobuf-ts/runtime` at runtime). Generated files carry a `@generated by protobuf-ts <version>` header.

**Location and contents:**

| Generated file | Source `.proto` | Package | Messages |
|---|---|---|---|
| `data/protobuf/SGTransaction.ts` | `data/protobuf/SGTransaction.proto` | `SGTransaction` | `DAGStruct`, `DAGWrapper`, `TransferUTXOInput`, `TransferOutput`, `UTXOTxParams`, `TransferTx`, `ProcessingTx`, `MintTx`, `EscrowTx` |
| `data/protobuf/SGBlocks.ts` | `data/protobuf/SGBlocks.proto` | `SGBlocks` | `BlockID`, `BlockHashData`, `BlockHeaderData`, `BlockPayloadData` |
| `data/protobuf/bcast.ts` | `data/protobuf/bcast.proto` | `sgns.crdt.pb` | `CRDTBroadcast`, `Head` |
| `data/protobuf/broadcast.ts` | `data/protobuf/broadcast.proto` | `sgns.crdt.broadcasting` | `BroadcastMessage`, `PeerInfo` |
| `data/protobuf/delta.ts` | `data/protobuf/delta.proto` | `sgns.crdt.pb` | `Delta`, `Element` |
| `data/protobuf/message.ts` | `data/protobuf/message.proto` | `sgns.ipfs_lite.ipfs.graphsync.pb` | `Message` (with nested `Request`, `Response`, `Block`) |
| `data/protobuf/crdt/bcast.ts` | none in repo | `sgns.crdt.pb` | Broadcast/heads, generated with protobuf-ts 2.11.1 |
| `data/protobuf/crdt/delta.ts` | none in repo | `sgns.crdt.pb` | Delta/element, protobuf-ts 2.11.1 |
| `data/protobuf/crdt/heads.ts` | none in repo | `sgns.crdt.pb` | Head/heads, protobuf-ts 2.11.1 |
| `data/protobuf/processing/SGProcessing.ts` | none in repo | `SGProcessing` | Processing messages, protobuf-ts 2.11.1 (about 1500 lines) |

The `crdt/` and `processing/` files came in commit `0156529` (Aug 2025), "Regenerated TypeScript protobuf files from updated .proto in SuperGenius develop branch". That commit added only the four generated files. The upstream `.proto` sources live in the SuperGenius repo.

**Where the messages are used:**
- `functions/ipfs/node.ts` decodes SDK transaction blobs with `MintTx`, `ProcessingTx`, `EscrowTx`, `TransferTx` (from `SGTransaction`), and imports `Delta`, `Element` (from `delta`) and `BlockID`, `BlockHashData`, `BlockHeaderData`, `BlockPayloadData` (from `SGBlocks`). The `ParseTransaction` function tries each type in order.
- Handlers: `functions/messages/mint.ts`, `processing.ts`, `escrow.ts`, `transfer.ts`, `block.ts`. Each writes into the in-memory store in `data/prepared/*.jsx` (`updateBCD`, `updateTD`, and the transaction feed).
- `functions/ipfs/node.ts` imports `require("data/protobuf/SGTransaction")`, so the `data/protobuf/*.ts` files are loaded through the baseUrl alias.

## Blockchain / RPC Providers

**Chains configured (`config/config.ts`, `networks`):**

| Key | chainId | RPC | Explorer | Currency |
|---|---|---|---|---|
| `networks.sepolia` | 11155111 | `https://rpc.sepolia.org/` | `https://sepolia.etherscan.io` | ETH |
| `networks.amoy` | 80002 | `https://polygon-amoy.drpc.org/` | `https://amoy.polygonscan.com/` | POL |

- Amoy is the only chain passed to the wallet modal (`context/wallet/Web3Modal.tsx`: `chains: [networks.amoy]`, `defaultChain: networks.amoy`). Sepolia is configured but not active in the wallet modal.
- The active token/contract address is `config.amoyContract` (`config/config.ts`, `amoyContract` key). `sub-components/job-order/OrderForm.tsx` sets `tokenAddress.current = config.amoyContract`. `config.sepoliaContract` is defined but not used in the code I read.
- `OrderForm.tsx` also checks `selectedNetworkId` and `chainId` and asks the user to switch to Amoy (chainId 80002).

**Ethereum mainnet RPC (server-side):**
- `pages/api/gas/gasPrice.ts` posts a JSON-RPC `eth_gasPrice` request to an endpoint at `https://eth-mainnet.blastapi.io/<path>`. The API key is part of the URL path, hardcoded in the file. Do not copy it. Move this to an env var (see concerns). The response is converted from wei to gwei.

**Client library:**
- `ethers ^6.13.4`. `BrowserProvider(walletProvider)` in `OrderForm.tsx` wraps the injected wallet. `new ethers.Contract(tokenAddress, abi, signer)` is used for the GNUS token contract. Contract ABIs are inline in the component.
- Wallet state hooks from `@web3modal/ethers/react`: `useWeb3ModalAccount`, `useWeb3ModalProvider`, `useWeb3ModalState`.

## Wallet Connection (`context/wallet/Web3Modal.tsx`)

- Library: `@web3modal/ethers ^5.1.11`, imported from `@web3modal/ethers/react` (`createWeb3Modal`, `defaultConfig`). This is the library that runs at runtime. The `@reown/appkit` packages are declared in `package.json` but not imported by `Web3Modal.tsx`.
- Initialized once at module load in `context/wallet/Web3Modal.tsx`, and mounted from `pages/_app.tsx` (`<Web3Modal>`). The file is marked `"use client"`.
- Settings: `chains: [networks.amoy]`, `defaultChain: networks.amoy`, `enableOnramp: false`, `enableSwaps: false`, theme variables for accent and color mix.
- Metadata comes from `config/config.ts` (`metadata`: name, description, url `https://dashboard.gnus.ai/job-orders`, icon).
- Project ID: read from `config.reown.projectId` in `config/config.ts`. This is a literal value in the source, not an env var. The Reown/WalletConnect Cloud dashboard (`https://cloud.walletconnect.com`, cited in the file) issues it. Do not copy the value into docs or logs.
- Wallet providers (Coinbase Wallet SDK, WalletConnect) are reached through the Web3Modal and `@coinbase/wallet-sdk`.

## API Routes (`pages/api/`)

Each route is a Next.js pages-router API handler. There is no auth check in any of them.

| Route | Handler file | External service | Purpose |
|---|---|---|---|
| `/api/gas/gasPrice` | `pages/api/gas/gasPrice.ts` | `https://eth-mainnet.blastapi.io/<key-in-path>` (Ethereum mainnet JSON-RPC) | Returns gas price in gwei. Called by `hooks/prices/usePrices.tsx`. |
| `/api/libp2p/startLibp2p` | `pages/api/libp2p/startLibp2p.tsx` | Local native SDK via `functions/ipfs/node.ts` (`createNode`) | Initializes the GeniusSDK node. Called by `hooks/ipfs/useIPFS.tsx` on mount. |
| `/api/networkData/getBlocksPrev` | `pages/api/networkData/getBlocksPrev.tsx` | None (returns in-memory `blockchainData` from `data/prepared/blockchainInfo.jsx`) | Block list feed for the dashboard, polled every 2 seconds by `hooks/ipfs/useIPFS.tsx`. |
| `/api/networkData/getTransPrev` | `pages/api/networkData/getTransPrev.tsx` | None (returns in-memory `transactionData` from `data/prepared/transactionInfo.jsx`) | Transaction feed, polled every 2 seconds. |
| `/api/processing/getEstimate` | `pages/api/processing/getEstimate.ts` | Local native SDK (`getGeniusSDKCost`) | Cost estimate for a job, JSON body `jsonRequest`. Called by `sub-components/job-order/OrderForm.tsx`. |
| `/api/processing/submitJob` | `pages/api/processing/submitJob.ts` | Local native SDK (`runGeniusSDKProcess`) | Submits a processing job, JSON body `jsonRequest`. Called by `OrderForm.tsx`. Note: the function inside is named `getEstimate` (copy-paste). |

Other outbound HTTP calls from the browser (not API routes):
- `hooks/prices/usePrices.tsx` calls:
  - `https://api.coingecko.com/api/v3/simple/price?ids=genius-ai&vs_currencies=usd` (price)
  - `https://api.coinpaprika.com/v1/tickers/gnus-genius-ai` (price and 24h change)
  - `/api/gas/gasPrice` (gas, via the proxy above)
  - Refresh interval: every 3 minutes (`setInterval(fetchPrices, 3 * 60 * 1000)`). The highest of the two prices is used.
- `pages/api/networkData/*` endpoints feed `data/prepared/*.jsx` and are polled by the browser.

Test files under `__tests__/pages/api/` mock these routes with `node-mocks-http` (see `__tests__/pages/api/gas/gasPrice.test.js`, `__tests__/pages/api/processing/*.test.js`).

## Data Storage

**Databases:**
- None detected. There is no ORM, SQL, or NoSQL client in the code or in `package.json`.

**Local files:**
- `data/` is the SDK working directory (passed as `basePath` to `GeniusSDKInit`). It holds `dev_config.json` (keys: `Address`, `Cut`, `TokenValue`, `TokenID`, `WriteDirectory`), `secure_storage.json` (contains a `GeniusAccount` key), and `GeniusSDK.dll`. The SDK probably writes runtime state here.
- `data/prepared/*.jsx` and `functions/messages/*.ts` keep block and transaction feeds in module-level arrays (`blockchainData`, `transactionData`). This is in-memory and resets on restart. The API routes read these arrays.

**File storage:**
- Local filesystem only for code. Static assets live in `public/` (images, fonts, videos).
- Remote: Pinata-hosted video at `https://orange-generous-tern-256.mypinata.cloud/ipfs/...` (read-only).

**Caching:**
- `node-cache ^5.1.2` is declared in `package.json`. No usage was found in the files I read.
- Browser state lives in Redux (`store/store.js`) and React Context.

## Authentication & Identity

- No app-level user auth. There is no login, session, or JWT code.
- Wallet-based identity only: the user connects an injected or WalletConnect/Coinbase wallet through the Web3Modal (`context/wallet/Web3Modal.tsx`). The address and chain come from `useWeb3ModalAccount`.
- SDK identity: the Ethereum private key passed to `GeniusSDKInit` in `functions/ipfs/node.ts`. This key is in source. See concerns.

## Monitoring & Observability

**Error tracking:**
- None detected (no Sentry, Datadog, or similar).

**Logs:**
- `console.log` and `console.error` throughout. Notable: `functions/ipfs/node.ts` logs the library path, the SDK init result, and the full transaction lists on every call. PM2 captures stdout/stderr on the server.

## Analytics

- None detected in the code I read (no Google Analytics, Segment, or similar).

## CI/CD & Deployment

**Hosting:**
- AWS EC2 host, reached over SSH. The host name comes from the GitHub secret `DEPLOY_HOSTNAME`. The IP and address are not in the repo.
- Process manager: PM2, process name `gnus-dashboard`.
- A Cloudflare deploy trigger is in the workflow as a commented-out step (`CLOUD_FLARE_TRIGGER_DEPLOY`). It is disabled.
- `.htaccess` (Apache SPA fallback) exists, but the workflow does not use it.

**CI Pipeline:** GitHub Actions. Workflow: `.github/workflows/aws-ec2-deploy.yml` ("CI/CD Deploy Genius Dashboard Backend/Frontend").
- Triggers: `push` to `main` (ignores `README.md` and `.github/**` paths), and `workflow_dispatch`.
- Runner: `ubuntu-latest`. Environment: `${{ github.ref_name }}` (GitHub environment named after the branch).
- Step "Deploy to AWS/EC2" runs when the ref is `main` or `develop`.
  - Writes `secrets.DEPLOY_ACTION_SSH_PRIVATE_KEY` to a `private_key` file (chmod 600).
  - Opens an SSH session as the `deploy` user to `secrets.DEPLOY_HOSTNAME`, with `StrictHostKeyChecking=no`.
  - On the remote: clones `gnus-dashboard` if missing, checks out the branch, runs `git fetch --all`, `git reset --hard origin/$BRANCH`, `git pull`, `yarn install`, `yarn run build`, and `pm2 restart gnus-dashboard`.
- Workflow issues to know about: the `git clone` URL uses a non-standard host (`git@gnus-dashboard.github.com:...`), `StrictHostKeyChecking=no` disables host key verification, and the `private_key` file is written to the runner workspace and never deleted.

**Deploy target summary:** AWS EC2 Linux host, SSH as `deploy`, app directory `~/gnus-dashboard`, PM2 process `gnus-dashboard`. The branch deployed is the pushed branch (`main` or `develop`).

## Environment Configuration

**Required environment variables (app code):**
- `baseURL` - read in `pages/_app.tsx` for the canonical and OG URL. Not required for the app to start, but it builds an `undefined` URL when unset.
- Optional `.env` file: loaded by `dotenv/config` in `pages/_app.tsx`. Not tracked in git (`.gitignore`).

**Required GitHub Actions secrets (names only):**
- `DEPLOY_ACTION_SSH_PRIVATE_KEY` - SSH private key for the `deploy` user
- `DEPLOY_HOSTNAME` - Target EC2 host
- `CLOUD_FLARE_TRIGGER_DEPLOY` - Used only by the disabled Cloudflare step

**Values hardcoded in source (not env-driven):**
- WalletConnect/Reown project ID: `config/config.ts` (`reown.projectId`)
- Ethereum private key for the SDK: `functions/ipfs/node.ts` (`createNode`)
- Blast RPC key in the URL path: `pages/api/gas/gasPrice.ts`
- Contract addresses: `config/config.ts` (`amoyContract`, `sepoliaContract`)

**Secrets location:**
- GitHub Actions secrets (deploy). No secret manager in code (no AWS Secrets Manager, Vault, or similar).
- `data/secure_storage.json` (contains a `GeniusAccount` key, value not recorded here).

## Webhooks & Callbacks

**Incoming:**
- None. No webhook endpoints under `pages/api/` receive external POSTs.

**Outgoing:**
- None sent by the app itself. The browser makes outbound calls to CoinGecko, CoinPaprika, and the Pinata gateway (see above). The server makes outbound JSON-RPC calls to Blast in `pages/api/gas/gasPrice.ts`.

## Security Concerns (integration-related)

- A literal Ethereum private key is in `functions/ipfs/node.ts`. Its value is a placeholder-looking string, but the source comment says it should be replaced. Move it to a server-only env var and rotate it if it has ever held a funded key.
- The Blast RPC key is embedded in the URL in `pages/api/gas/gasPrice.ts`. Move it to an env var.
- The WalletConnect/Reown project ID is hardcoded in `config/config.ts`. It is client-visible by design, but it should still be managed with an env var so it can be rotated.
- `data/secure_storage.json` is committed. It holds an account entry (value not recorded here).
- The API routes under `pages/api/processing/` have no rate limiting or auth, and they pass request bodies straight to the native SDK.

---

*Integration audit: 2026-10-26*
