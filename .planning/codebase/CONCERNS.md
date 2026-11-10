# Codebase Concerns

**Analysis Date:** 2026-10-26

## Tech Debt

**Server-side native SDK loaded at import time (Windows binary only in repo):**
- Issue: `functions/ipfs/node.ts` calls `koffi.load(libraryPath)` at module top level. The path is chosen by `process.platform`: `data/GeniusSDK.dll` (win32), `data/libGeniusSDK.dylib` (darwin), `data/libGeniusSDK.so` (linux). Only `data/GeniusSDK.dll` (about 26 MB) is committed. `.gitignore` ignores `*.so` and `data/SuperGNUSNode*`, so a Linux library cannot be committed without a force-add.
- Files: `functions/ipfs/node.ts`, `data/GeniusSDK.dll`, `.gitignore`
- Impact: On the EC2 Linux host, a fresh `git clone`/`git reset --hard` (see deploy workflow) does not deliver `libGeniusSDK.so`. Any API route importing `functions/ipfs/node` throws at load and returns a 500. Nothing in the repo (README, workflow, scripts) documents how the `.so` reaches EC2. The README (19 lines) does not mention the SDK.
- Fix approach: Not decided here. Fact to resolve: where the Linux binary is placed on the server.

**Single shared node identity and key for all users:**
- Issue: `createNode()` in `functions/ipfs/node.ts` calls `GeniusSDKInit(basePath, ethPrivateKey, true, false, 40001, true)` with a hard-coded 64-hex-character string literal as the Ethereum private key (placeholder-looking value, committed in source). One module-level `node` object and one SDK instance per Node process serve every visitor. Base path is `data/` inside the repo checkout.
- Files: `functions/ipfs/node.ts`, `pages/api/libp2p/startLibp2p.tsx`
- Impact: All requests share one identity, one wallet and one set of module-level arrays (`transactionOutList`, `transactionInList`, `blockList`, `requestout`). Second argument `process=false` and the key are not read from env or config.

**Job submission is signed by the server node, not the user wallet:**
- Issue: `pages/api/processing/submitJob.ts` forwards `req.body.jsonRequest` to `runGeniusSDKProcess()` (`functions/ipfs/node.ts`), which calls `GeniusSDKProcess(json)` using the server's SDK identity. The user pays via an ERC1155 `bridgeOut(...)` call from the browser signer in `sub-components/job-order/OrderForm.tsx` (around lines 321-370 and 524-570). The browser then POSTs to `/api/processing/submitJob`. The request carries no tx hash, no signature and no wallet address.
- Files: `pages/api/processing/submitJob.ts`, `sub-components/job-order/OrderForm.tsx`, `functions/ipfs/node.ts`
- Impact: The server does not verify that payment occurred. Anyone who can reach `/api/processing/submitJob` can submit jobs against the server node's account without paying on the bridge. Payment (user wallet, on-chain bridge) and execution (server key, SuperGenius node) are linked only by client-side sequencing.

**submitJob and startLibp2p have incorrect response handling:**
- `runGeniusSDKProcess` returns `void`; `submitJob.ts` does `parseInt(response)` on `undefined`, so it logs "NaN" and responds `200` with `null`. Errors inside `runGeniusSDKProcess` are caught and swallowed, so the route returns 200 even if the SDK call failed.
- `createNode()` returns `undefined` and swallows errors. `pages/api/libp2p/startLibp2p.tsx` then sends `res.status(200).json(data)`, and on error also writes a 500 first, so the handler can respond twice.
- `getGeniusSDKCost` returns `null` on failure; `getEstimate.ts` does `parseInt(null)` and returns `NaN`/`null` with 200.
- Files: `pages/api/processing/submitJob.ts`, `pages/api/processing/getEstimate.ts`, `pages/api/libp2p/startLibp2p.tsx`, `functions/ipfs/node.ts`

**SDK/IPFS node lifecycle is tied to page loads and never shut down:**
- `hooks/ipfs/useIPFS.tsx` runs `axios.get("/api/libp2p/startLibp2p")` in a `useEffect` on every client mount. Each call runs `GeniusSDKInit` again; there is no "already initialized" guard (`node` is set but never checked). `GeniusSDKShutdown` is declared but not wired to any process-exit or route.
- `hooks/ipfs/useIPFS.tsx` also starts a `setInterval` (2 s) polling `/api/networkData/getBlocksPrev` and `/api/networkData/getTransPrev` with no cleanup (the `setTimeout`/`setInterval` handles are never cleared on unmount).
- `CheckTransactions()` in `functions/ipfs/node.ts` is exported but has no caller outside tests; it dedupes by O(n*m) byte comparison against ever-growing in-memory lists and logs full buffers with `console.log`.
- `/api/networkData/getBlocksPrev` and `/api/networkData/getTransPrev` return static data from `data/prepared/blockchainInfo.jsx` / `transactionInfo.jsx`, not live SDK data.
- Files: `hooks/ipfs/useIPFS.tsx`, `functions/ipfs/node.ts`, `pages/api/networkData/getBlocksPrev.tsx`, `pages/api/networkData/getTransPrev.tsx`, `data/prepared/blockchainInfo.jsx`
- Leftover libp2p/Helia dependencies (see Dependencies) are not imported by app code; `data/ipfs/bootstrapConfig.ts` lists legacy public bootstrap peers (`ipfs.io` hosts, `/ipfs/` multiaddrs) and has no importer in app code.

**Dead, duplicated or stale files:**
- `app.config` (no extension) and `app.config.js` have identical content. Neither is imported anywhere. Files: `app.config`, `app.config.js`.
- `testProcess.json` (root): sample job JSON (Filebase IPFS URL, `mnnimage` model, `data/ballet.data`). Not referenced by code or tests.
- `.htaccess` (root): Apache SPA rewrite to `index.html`; the deploy uses `pm2` + `next build`, no Apache. Not used.
- Both `yarn.lock` (14166 lines) and `package-lock.json` (43509 lines) are committed, plus `.yarnrc.yml` pointing to `.yarn/releases/yarn-classic.cjs`. The deploy uses `yarn install`; local scripts and tests may use npm. The two lockfiles can resolve different versions.
- `data/protobuf/bcast.ts` and `data/protobuf/crdt/bcast.ts`, `data/protobuf/delta.ts` and `data/protobuf/crdt/delta.ts`, plus `broadcast.*`, `message.*` overlap by name; `data/protobuf/processing/SGProcessing.ts` (1539 lines) has no matching `.proto` in the repo.
- `global.d.ts`, `next-env.d.ts`, and `__tests__/README.md` exist; `package.json` includes `now-build` (Vercel-era script) and `"tsc": "^2.0.4"` as a runtime dependency (unrelated npm package named `tsc`, not TypeScript).
- `functions/ipfs/node.ts` has unused imports (`get` from `http`, `getStruct`, `GeniusMatrix`, `GeniusAddress`, `DAGStruct` and others) and mixes `require("data/protobuf/...")` with ES imports.

## Known Bugs

**`gasPrice` and cost routes return unusable values on failure:**
- Symptoms: See "incorrect response handling" above. `pages/api/gas/gasPrice.ts` returns the string `"Error fetching gas price."` as JSON on 500.
- Files: `pages/api/gas/gasPrice.ts`, `pages/api/processing/getEstimate.ts`

**Hard-coded placeholder data presented as live:**
- `pages/transaction/[transaction].tsx` uses a literal signer address in mock data; `data/prepared/*.jsx` and `data/charts/activeNodes.ts`, `data/map/markers.ts` are static.

## Security Considerations

**Private key material committed to the repo:**
- Risk: `data/secure_storage.json` is tracked and contains a `GeniusAccount.sgns_key` entry (SuperGenius account key). `functions/ipfs/node.ts` contains a hard-coded 64-hex Ethereum private key literal passed to `GeniusSDKInit`. The SDK base path is `data/`, so the SDK reads and may write `secure_storage.json` in the repo checkout; the deploy runs `git reset --hard`, which overwrites any server-side changes to tracked files.
- Files: `data/secure_storage.json`, `functions/ipfs/node.ts`, `data/dev_config.json`
- Current mitigation: None detected. Treat the committed key as exposed (repo history has 160 commits).
- Recommendations: Rotate any key that has real funds or identity; values are intentionally not reproduced here.

**Third-party API credential committed in source:**
- `pages/api/gas/gasPrice.ts` embeds a BlastAPI Ethereum mainnet RPC URL that includes an API token in the path. Kind: RPC provider token.
- `config/config.ts` contains a Reown/WalletConnect `projectId` (public-by-design client identifier, but domain allow-listing is not enforced in code) and two contract addresses (Amoy, Sepolia).
- No `.env*` files are tracked. `process.env.baseURL` is read in `pages/_app.tsx` but is not defined in `next.config.js` (no `env` block), so it evaluates to `undefined` unless set externally.

**Unauthenticated API routes with server-side effects:**
- `/api/processing/submitJob`, `/api/processing/getEstimate`, `/api/libp2p/startLibp2p` have no authentication, no rate limiting, no body validation beyond `typeof string` in `functions/ipfs/node.ts`. `jsonRequest` is passed straight to native code (`GeniusSDKProcess`, `GeniusSDKGetCost`) via koffi, so native-side parse faults can crash the Node process.
- `/api/libp2p/startLibp2p` can be called by anyone to re-run `GeniusSDKInit`.

**Verbose logging of request bodies:**
- `functions/ipfs/node.ts` logs full job JSON, transaction buffers and SDK init results with `console.log`.

**EC2 deploy workflow (`.github/workflows/aws-ec2-deploy.yml`):**
- Triggers on push to `main` (paths-ignore `README.md`, `.github/**`) and `workflow_dispatch`. The step condition also allows `develop`, but the `on.push.branches` list only contains `main`; `workflow_dispatch` on `develop` is the only way that branch deploys.
- Writes `secrets.DEPLOY_ACTION_SSH_PRIVATE_KEY` to a file `private_key` in the runner workspace with `echo`; SSH uses `-o StrictHostKeyChecking=no` (no host key pinning, MITM exposure). The key file is never removed (runner is ephemeral).
- Remote script: `git checkout`, `git fetch --all`, `git reset --hard origin/$BRANCH`, `yarn install`, `yarn run build $BUILD_OPTIONS`, `pm2 restart gnus-dashboard`. `BUILD_OPTIONS` is never defined in the workflow (expands empty on both runner and remote). The heredoc is unquoted (`<<-ENDSSH`), so `$BRANCH` expands on the runner and unescaped `$` variables are runner-side; the `#!/usr/bin/env bash` line is sent as a comment inside the remote stdin.
- `git clone git@gnus-dashboard.github.com:...` relies on a host alias in the server's `~/.ssh/config`; not in the repo.
- No tests, lint, or typecheck run before deploy. Build and `yarn install` run on the production host. No `--frozen-lockfile`. `pm2 restart` requires the process to already exist (no `pm2 start` fallback). The `.dll`/`.so` is not provisioned by this workflow. The Cloudflare deploy step is commented out. Deploys use `environment: ${{ github.ref_name }}`.
- The `deploy` user's host (`secrets.DEPLOY_HOSTNAME`) runs the SDK node with `GeniusSDKInit` base port `40001`; firewall/security-group config is not in the repo.

## Performance Bottlenecks

**Client polling:**
- `hooks/ipfs/useIPFS.tsx` polls two API routes every 2 s per open tab, returning static data. Each tab also triggers `startLibp2p`.
- `functions/ipfs/node.ts` `CheckTransactions` re-decodes all transactions and linearly searches prior buffers on each call.

**Large committed binary:**
- `data/GeniusSDK.dll` (about 26 MB, a Windows PE binary) is in git history without LFS; `.gitattributes` only sets `* text=auto`.

## Fragile Areas

**Protobuf drift vs SuperGenius:**
- Files: `data/protobuf/*.proto`, `data/protobuf/*.ts`, `data/protobuf/crdt/*.ts`, `data/protobuf/processing/SGProcessing.ts`
- Why fragile: TypeScript outputs were regenerated by hand in commit `0156529` ("Regenerated TypeScript protobuf files from updated .proto in SuperGenius develop branch"). There is no script, `package.json` entry, or CI step that regenerates or checks them; `@protobuf-ts/plugin`, `@bufbuild/protoc-gen-es`, `protons`, `protobufjs`, and `protons-runtime` are all declared, and different generated files use different generators. `SGProcessing.ts` has no `.proto` source in this repo. No version pin ties the `.proto` set or `GeniusSDK.dll` build to a SuperGenius commit; the SDK signatures in `functions/ipfs/node.ts` (declared C prototypes such as `GeniusSDKInit(const char*, const char*, bool, bool, uint16_t, bool)`) must match the binary exactly or koffi calls misbehave at runtime.
- `ParseTransaction` in `functions/ipfs/node.ts` tries decoding as Mint, Processing, Escrow, then Transfer in order, using exception-based dispatch; protobuf is lenient, so the first type that decodes without throwing wins, which can misclassify messages.
- Safe modification: regenerate from the upstream SuperGenius `.proto` files, then run `__tests__/functions/ipfs/node.test.js` and `__tests__/functions/messages/processing.test.js`.

**koffi bindings and structs:**
- `functions/ipfs/structs.ts` and `functions/ipfs/node.ts` hand-declare C structs (`GeniusTokenValue` char[22], `GeniusTokenID` 32 bytes). No header file is in the repo to verify against.

## Scaling Limits

**One process, one SDK instance:**
- Capacity: One Node process (pm2 app `gnus-dashboard`) holds the only SDK instance and in-memory state; multiple Next workers or instances each init their own node on the same `data/` directory and port `40001`.
- Limit: Horizontal scaling conflicts on port and on `data/` state files.

## Static SPA blockers

Facts that prevent `next export`/static hosting as-is:
- API routes under `pages/api/` (`gas/gasPrice.ts`, `libp2p/startLibp2p.tsx`, `networkData/getBlocksPrev.tsx`, `networkData/getTransPrev.tsx`, `processing/getEstimate.ts`, `processing/submitJob.ts`) are server-only; Next static export does not support them.
- `functions/ipfs/node.ts` loads a native library via `koffi` (Node-only) and uses `process.cwd()`, `path`, and the file system layout of `data/`.
- Client code calls these routes directly: `hooks/ipfs/useIPFS.tsx`, `hooks/prices/usePrices.tsx` (`/api/gas/gasPrice`), `sub-components/job-order/OrderForm.tsx` (`getEstimate`, `submitJob`).
- Catch-all `pages/[...].tsx` and dynamic routes `pages/address/[address].tsx`, `pages/block/[block].tsx`, `pages/transaction/[transaction].tsx` need `getStaticPaths` or client-only handling for export; none define `getStaticProps`/`getServerSideProps`.
- `next.config.js` has no `output: "export"`, no `images.unoptimized` (`next/image` is used in `sub-components/dashboard/analytics/DeviceMix.tsx` and in `OrderForm.tsx`), and `pages/_app.tsx` reads `process.env.baseURL`.
- The root `.htaccess` implies an earlier static-hosting assumption but is unused.
- Wallet signing (Reown/Web3Modal, `context/wallet/Web3Modal.tsx`, ethers `BrowserProvider`) is already client-side; job submission is the part that needs the server SDK.

## Dependencies at Risk

**Stale / overlapping packages (from `package.json`):**
- `next ^14.0.3` with `eslint-config-next ^13.3.1` (major mismatch); `react ^18.2.0` with `react-test-renderer ^19.1.1` (major mismatch); `eslint ^8` with `eslint-config-standard ^16`, `eslint-plugin-prettier ^3`.
- Wallet stack is duplicated and partly deprecated: `@web3modal/ethers ^5`, `@reown/appkit ^1.4.1`, `@reown/appkit-adapter-ethers`, `@reown/walletkit`, `@walletconnect/core`, `@walletconnect/utils`, `@walletconnect/web3-provider ^1.8.0` (v1, deprecated), `@coinbase/wallet-sdk`.
- libp2p stack is v1-era (`libp2p ^1.3.1`, `helia ^4.1.0`, `@libp2p/*` 1.x/4.x) and, apart from tests/mocks, not imported by app code; `@dcdn/graphsync`, `@libp2p/echo`, `@libp2p/plaintext`, `@libp2p/webrtc`, `cheerio`, `bs58`, `string_decoder`, `delay`, `nodemon` appear unused in app source.
- Build-only tools in `dependencies`: `@bufbuild/protoc-gen-es`, `@types/react`, `@types/cheerio`, `@types/validator`, `tsc`, `nodemon`.
- `cypress ^14` is in devDependencies, but `__tests__/e2e/*.test.js` run under Jest scripts (`scripts/test-runner.js`); no Cypress config detected.
- `react-simple-maps ^3.0.0` declares React <=18 peers; `yarn.lock` pulls `ethereumjs-abi` from a git URL.
- `koffi ^2.9.2` is a native dependency compiled/prebuilt per platform; the deploy host must have a matching prebuilt binary.

## Missing Critical Features

**Server-side payment verification for jobs:**
- Problem: `submitJob` does not check the `bridgeOut` transaction.
- Blocks: Any pay-per-job guarantee.

**Linux SDK provisioning and key management:**
- Problem: no documented or automated path for `libGeniusSDK.so` or for supplying the node key from environment.

## Test Coverage Gaps

**Native SDK path is only tested through mocks:**
- What's not tested: real `koffi.load`, `GeniusSDKInit`, struct layouts. Tests in `__tests__/functions/ipfs/node.test.js` and `__tests__/pages/api/processing/*.test.js` mock the library.
- Files: `functions/ipfs/node.ts`, `functions/ipfs/structs.ts`
- Priority: High

**Deploy workflow and protobuf generation have no checks:**
- What's not tested: `.github/workflows/aws-ec2-deploy.yml` has no test/lint/typecheck job; there is no protobuf drift check.
- Priority: Medium

**TypeScript strictness off:**
- `tsconfig.json` has `"strict": false`; about 39 `any`/`ts-ignore` occurrences outside `data/protobuf` and `__tests__`. `reactStrictMode: false` in `next.config.js`.
- Priority: Low

---

*Concerns audit: 2026-10-26*
