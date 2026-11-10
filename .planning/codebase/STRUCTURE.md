# Codebase Structure

**Analysis Date:** 2026-10-26

## Directory Layout

```
gnus-dashboard/
├── pages/                 # Next pages router: UI routes + api/ routes
│   ├── _app.tsx           # Providers, global CSS
│   ├── index.tsx          # Landing / live tables
│   ├── [...].tsx          # Catch-all redirect to /
│   ├── analytics/index.tsx
│   ├── job-orders/index.tsx
│   ├── block/[block].tsx
│   ├── transaction/[transaction].tsx
│   ├── address/[address].tsx
│   └── api/
│       ├── processing/{getEstimate,submitJob}.ts
│       ├── libp2p/startLibp2p.tsx
│       ├── gas/gasPrice.ts
│       └── networkData/{getBlocksPrev,getTransPrev}.tsx
├── sub-components/        # Feature UI: dashboard/, job-order/, navbar/, tables/, socials/, videos/
├── widgets/               # Generic UI: charts/, forms/, stats/
├── layouts/               # DefaultLayout.tsx, navbars/, footers/
├── context/               # ipfs/, prices/, wallet/ providers
├── hooks/                 # ipfs/useIPFS.tsx, prices/usePrices.tsx
├── store/                 # Redux Toolkit (store.js, appSlice.js)
├── functions/             # ipfs/ (koffi SDK bridge), messages/ (tx handlers), time/
├── data/                  # Static data, protobuf, native lib, in-memory feeds
│   ├── GeniusSDK.dll      # Native SDK (Windows binary, committed)
│   ├── protobuf/          # .proto + generated .ts (protobuf-ts)
│   ├── prepared/          # Module-level mutable arrays (blocks, txs, escrow)
│   ├── ipfs/bootstrapConfig.ts
│   ├── charts/ map/ navbars/ orderForm/
│   └── dev_config.json, secure_storage.json  # SDK config/state files
├── config/config.ts       # Wallet/network/contract config
├── styles/                # theme.scss + theme/ partials (Bootstrap-based)
├── public/                # Static assets: images, fonts, videos
├── __tests__/             # Jest + Cypress-style tests (mirrors source tree)
├── scripts/test-runner.js # Test orchestration
├── .github/workflows/aws-ec2-deploy.yml
├── next.config.js, app.config.js, tsconfig.json, jest.config.js, jest.setup.js
├── global.d.ts, .eslintrc.json
└── package.json, yarn.lock, package-lock.json
```

## Directory Purposes

**`pages/api/`:** the only server-side code; each file default-exports a `(req, res)` handler. Import SDK helpers from `functions/ipfs/node` via the `baseUrl: "./"` path (`tsconfig.json`).
**`functions/ipfs/`:** `node.ts` (koffi bindings, `createNode`, `getGeniusSDKCost`, `runGeniusSDKProcess`, `CheckTransactions`, balance/mint/transfer helpers), `structs.ts` (koffi struct registry).
**`functions/messages/`:** one handler per tx type (`mint`, `transfer`, `processing`, `escrow`, `block`), default export, write into `data/prepared/*`.
**`functions/time/`:** `elapseTime.ts`, `lastUpdate.ts`, browser-safe helpers.
**`data/protobuf/`:** schema sources and generated code. Regenerate from the SuperGenius repo `.proto` files; do not hand-edit `.ts`.
**`data/prepared/`:** `updateX`/exported `let` pairs acting as server memory.
**`sub-components/job-order/OrderForm.tsx`:** all job-order, wallet, and payment logic.
**`__tests__/`:** mirrors source (`components/`, `context/`, `functions/`, `hooks/`, `pages/`, `pages/api/`, `e2e/`, `mocks/`, `utils/`).

## Key File Locations

**Entry Points:**
- `pages/_app.tsx`: provider tree `Redux > ToastContainer > Web3Modal > PricesWrapper > IPFSWrapper > DefaultLayout`.
- `pages/api/processing/getEstimate.ts`, `pages/api/processing/submitJob.ts`: job API.

**Configuration:**
- `config/config.ts`: Reown projectId, metadata, `networks.{sepolia,amoy}`, `amoyContract`, `sepoliaContract`.
- `next.config.js`: minimal; no `output`, no `env`, no webpack customization.
- `app.config.js`: app name, version, default skin (used by `store/appSlice.js`).
- `tsconfig.json`: `strict: false`, `baseUrl: "./"` (imports like `"data/..."`, `"context/..."`, `"hooks/..."` resolve from repo root).
- `data/dev_config.json`, `data/secure_storage.json`: SDK-side config (address, cut, token, write directory).

**Core Logic:**
- `functions/ipfs/node.ts`: native bridge.
- `sub-components/job-order/OrderForm.tsx`: order flow.
- `hooks/prices/usePrices.tsx`: price polling.

**Testing:**
- `__tests__/pages/api/processing/{getEstimate,submitJob}.test.js`, `__tests__/functions/ipfs/node.test.js`, `__tests__/components/job-order/OrderForm.test.jsx`, `__tests__/e2e/job-order-flow.test.js`.

## Naming Conventions

**Files:**
- Components: PascalCase `.tsx` (`OrderForm.tsx`, `NavbarDefault.tsx`).
- Hooks: `useX.tsx` inside a topic folder (`hooks/ipfs/useIPFS.tsx`).
- Contexts: `XContext.tsx|jsx` or `Web3Modal.tsx`.
- Utilities/handlers: camelCase `.ts` (`elapseTime.ts`, `processing.ts`).
- Routes: Next convention; dynamic `[param].tsx`.
- Mixed `.jsx`/`.js` exist (`context/ipfs/IPFSContext.jsx`, `store/*.js`, `data/prepared/*.jsx`).

**Directories:** lowercase, kebab-case for multiword (`job-orders`, `sub-components`).

## Where to Add New Code

**New page:** `pages/<route>/index.tsx` (client component, default export `React.FC`).
**New API route:** `pages/api/<group>/<name>.ts`; put native/SDK logic in `functions/ipfs/node.ts`, keep handler thin.
**New UI piece:** `sub-components/<feature>/Name.tsx`; generic reusable pieces in `widgets/`.
**New provider/hook:** `context/<topic>/` and `hooks/<topic>/`; register in `pages/_app.tsx`.
**New tx type handler:** `functions/messages/<type>.ts` plus decode branch in `ParseTransaction` in `functions/ipfs/node.ts`.
**Protobuf changes:** update `.proto` in `data/protobuf/`, regenerate `.ts` with `@protobuf-ts/plugin`.
**Static config/data:** `data/<topic>/`; network or contract values in `config/config.ts`.
**Tests:** `__tests__/<mirror of source path>/Name.test.(js|jsx|tsx)`.
**Styles:** `styles/theme/components/_name.scss` imported via `styles/theme.scss`.

## Special Directories

**`data/`:** mixed static data and runtime files; contains native binary and SDK state JSON. Committed: yes.
**`data/protobuf/`:** generated: yes (protobuf-ts). Committed: yes.
**`public/`:** static assets served at `/`. Committed: yes.
**`.next/`:** build output. Generated, not committed (absent).
**`.yarn/releases/`:** vendored yarn. Committed: yes.
**`.planning/`:** GSD planning docs.

---

*Structure analysis: 2026-10-26*
