# Coding Conventions

**Analysis Date:** 2026-10-26

## Naming Patterns

**Files:**
- React components use PascalCase file names: `sub-components/job-order/OrderForm.tsx`, `widgets/forms/ToggleSwitch.tsx`, `sub-components/navbar/Price.tsx`
- Hooks use the `use` prefix with camelCase file names: `hooks/prices/usePrices.tsx`, `hooks/ipfs/useIPFS.tsx`
- Context modules are PascalCase and end in `Context` or `Wrapper`: `context/prices/PricesContext.tsx`, `context/ipfs/IPFSContext.jsx`, `context/wallet/Web3Modal.tsx`
- Utility and function modules are camelCase: `functions/time/elapseTime.ts`, `functions/time/lastUpdate.ts`, `functions/messages/transfer.ts`
- Next.js dynamic routes use bracket syntax: `pages/block/[block].tsx`, `pages/address/[address].tsx`, `pages/transaction/[transaction].tsx`
- Protobuf-generated modules keep the schema name: `data/protobuf/SGTransaction.ts` (generated from `data/protobuf/SGTransaction.proto`). Do not hand-edit them.
- Mixed casing exists in `data/` (`data/orderForm/models.ts`, `data/map/worldMap.ts`) and `public/`. Follow the nearest directory's style when adding files there.

**Functions:**
- camelCase for all functions: `elapsedTime` in `functions/time/elapseTime.ts`, `runGeniusSDKProcess` in `functions/ipfs/node.ts`, `usePrices` in `hooks/prices/usePrices.tsx`
- API route handlers are named for their purpose, not the route. Example: `pages/api/processing/submitJob.ts` declares `const getEstimate = async (req, res) => ...` and exports it as default. Name the handler after the route it serves when you add new routes.
- Event handlers use the `handle` prefix: `handleToggleClick` in `widgets/forms/ToggleSwitch.tsx`

**Variables:**
- camelCase for locals and state: `showSpinner`, `modelFile`, `walletProvider` (`sub-components/job-order/OrderForm.tsx`)
- State setters follow React convention: `const [file, setFile] = useState<File | null>(null);`
- Module-level constants are camelCase in source files (`initialState` in `store/appSlice.js`), and UPPER_SNAKE_CASE only for shared test constants (`TEST_CONSTANTS`, `MOCK_CONFIGS` in `__tests__/utils/testSetup.js` and `__tests__/utils/mockFactory.js`)

**Types and interfaces:**
- Interfaces use `PascalCase` and are not prefixed with `I`: `Prices` in `hooks/prices/usePrices.tsx`, `PricesContextValue` in `context/prices/PricesContext.tsx`, `ToggleSwitchProps` in `widgets/forms/ToggleSwitch.tsx`
- Props types are named `<Component>Props`: `ToggleSwitchProps`
- Component typing uses `React.FC<Props>` in most files: `const OrderForm: React.FC = () => {...}`, `const ToggleSwitch: React.FC<ToggleSwitchProps>`
- Some files use `any` for SDK and protobuf values (`functions/ipfs/node.ts`, `functions/time/elapseTime.ts`). `tsconfig.json` sets `"strict": false`, so new code is not forced to be strictly typed. Prefer explicit interfaces for new public functions.

## Code Style

**Formatting:**
- No Prettier config file is committed (`.prettierrc*` is absent), but `eslint-plugin-prettier` and `eslint-config-prettier` are in `devDependencies`.
- Quotes and semicolons are mixed across the codebase. Newer TSX files (`hooks/prices/usePrices.tsx`, `context/prices/PricesContext.tsx`) use double quotes, trailing commas, and semicolons. Some older files (`store/appSlice.js`, `pages/api/networkData/*`) do not follow that style. Match the file you are editing.
- Indentation is 2 spaces. Trailing commas in multi-line objects and arrays are the norm in `hooks/` and `sub-components/`.
- Keep line-wrapped JSX and imports in the same style as the surrounding file.

**Linting:**
- ESLint is configured in `.eslintrc.json` with a single line: `"extends": "next/core-web-vitals"`. There are no custom rules, and no `eslint-config-standard` or Prettier rules are wired in.
- Run lint with `npm run lint` (runs `next lint`).
- Do not add rules to `.eslintrc.json` without a reason. Lint is currently minimal.

**Test-only style:**
- Test files import `React` explicitly and use plain JS inside JSX. See `__tests__/e2e/basic-smoke.test.js`.

## Import Organization

**Order (observed in `sub-components/job-order/OrderForm.tsx` and `hooks/prices/usePrices.tsx`):**
1. React and React-adjacent packages: `import React, { useState } from "react";`
2. UI and third-party libraries: `react-bootstrap`, `ethers`, `validator`, `react-toastify`, `@web3modal/ethers/react`, `axios`
3. Next.js modules: `next/link`, `next/router`
4. Application modules using the root-relative path: `data/orderForm/models`, `config/config`, `functions/ipfs/node`
5. Relative imports for siblings: `./structs`, `../messages/transfer`

**Path style:**
- `tsconfig.json` sets `"baseUrl": "./"`, so application modules are imported from the repo root without a leading `@/`. Examples: `import { runGeniusSDKProcess } from "functions/ipfs/node";`, `import models from "data/orderForm/models";`, `import { usePrices } from "hooks/prices/usePrices";`
- The `paths` block in `tsconfig.json` only maps `@/components/*`, `@/lib/*`, and `@/styles/*`. Those directories (`components/`, `lib/`) do not exist. Do not rely on the `@/` alias for new code in this repo.
- The Jest `moduleNameMapper` in `jest.config.js` maps `@/components`, `@/pages`, `@/hooks`, `@/functions`, `@/context`, `@/sub-components`, `@/widgets`, `@/layouts`, `@/store`, `@/styles`, `@/data`, `@/test-utils`, and `@/test-mocks`. It does not match the `tsconfig.json` paths. See `TESTING.md`.
- Bare imports such as `data/protobuf/SGTransaction` work at runtime and in TypeScript only because of `baseUrl`. Jest needs `modulePaths` or `moduleDirectories` for them, which `jest.config.js` does not set. Tests that mock these modules pass `{ virtual: true }`. See `__tests__/functions/ipfs/node.test.js`.

## Error Handling

**API routes:**
- Wrap the SDK call in `try/catch` and return a fixed JSON error body with status 500. Example in `pages/api/processing/submitJob.ts`:
```ts
try {
  const response: any = await runGeniusSDKProcess(jsonRequest);
  res.status(200).json(parseInt(response));
} catch (err) {
  res.status(500).json({ error: "failed to process job." });
}
```
- The error is swallowed, not logged. When you add a route, log the error server-side with `console.error` before responding. Do not return the raw `err.message` to the client.

**Hooks and data fetching:**
- Upstream price APIs are wrapped with `.catch` that logs and returns `null`, so one failing source does not fail the whole hook. Example in `hooks/prices/usePrices.tsx`:
```ts
const coingeckoResponse = await axios
  .get("https://api.coingecko.com/api/v3/simple/price?ids=genius-ai&vs_currencies=usd")
  .catch((err) => {
    console.error("CoinGecko Error:", err);
    return null;
  });
```
- Hook state carries an `error: string | null` field alongside the data. Follow the same shape for new hooks.

**Context access:**
- Consumer hooks throw when used outside their provider. See `usePricesContext` in `context/prices/PricesContext.tsx`:
```ts
if (!context) {
  throw new Error("usePricesContext must be used within a PricesWrapper");
}
```
- Follow this pattern for new context hooks. The error names the hook and the provider.

**User-facing feedback:**
- Use `react-toastify` (`toast.success`, `toast.error`, `toast`) for user notifications. Example: `widgets/forms/ToggleSwitch.tsx` shows a `toast` with `className: "gnus-toast"`.

**Pure utilities:**
- Throw `Error` for invalid input in pure functions: `functions/time/elapseTime.ts` throws `"Invalid timestamp format"` when the date does not parse.

## Logging

**Framework:** `console` only. No logging library is installed.

**Patterns:**
- Use `console.error("<Label>:", err)` for caught errors in hooks and data fetchers (`hooks/prices/usePrices.tsx`).
- Debug `console.log` calls are present in `functions/time/elapseTime.ts` and `pages/api/processing/submitJob.ts`. Do not add new debug logs in committed code.
- Tests replace `console.error` and `console.warn` with `jest.fn()` in `jest.setup.js`, so logs from components do not show in test output. Do not rely on console output in assertions.

## Comments

**When to Comment:**
- Comment the non-obvious. Examples in the codebase: `// Parse the input timestamp` above the date parse in `functions/time/elapseTime.ts`, `// Define additional structs that match the C header` in `functions/ipfs/node.ts`, and `// Prevents the checkbox from toggling` in `widgets/forms/ToggleSwitch.tsx`.
- Many lines carry obvious comments that restate the code. Avoid adding those.
- Use `// TODO` only when there is a concrete follow-up. Searching `src/` finds few; most work lives in the top-level directories.

**JSDoc/TSDoc:**
- Not used in application code.
- The shared test helpers in `__tests__/utils/` use JSDoc-style `@param` and `@returns` blocks. Follow that style for new test helpers.

## Function Design

**Size:** Keep hooks and page components focused. `sub-components/job-order/OrderForm.tsx` is a large single component with many `useState` calls and is a known outlier. Do not follow that as a template for new components. Split out API calls and validation into `functions/` or `hooks/`.

**Parameters:**
- Prefer a single object parameter for functions with several inputs. The SDK wrappers in `functions/ipfs/node.ts` take an object such as `runGeniusSDKProcess(jsonRequest)`.
- Hooks take no parameters and read everything from context or internal state (`usePrices()`, `useIPFS()`).

**Return Values:**
- Hooks return a plain object with named fields, not arrays. Exception: `useState` and `useAutoAnimate` follow React's tuple form.
- API routes return `res.status(...).json(...)`. Do not return values from the handler itself.

## Module Design

**Exports:**
- Components use default exports: `export default ToggleSwitch;` in `widgets/forms/ToggleSwitch.tsx`. Exception: `OrderForm` is `const OrderForm: React.FC` with a default export.
- Hooks and context helpers use named exports: `export const usePrices`, `export function PricesWrapper`, `export function usePricesContext`.
- Redux slices export the actions as named exports and the reducer as default: `store/appSlice.js` exports `changeSkin` and `appSlice.reducer`.

**Barrel Files:**
- Not used. Import from the specific module path, for example `hooks/prices/usePrices`, not from an index file.
- The only index-style module is `__tests__/utils/index.js`, which re-exports test helpers for tests.

**Next.js conventions:**
- Pages live in `pages/`. API routes live in `pages/api/`. Dynamic routes use `[param].tsx`.
- Global providers wrap the app in `pages/_app.tsx`.

## Where to Put New Code

- New page: `pages/<route>.tsx`. New API route: `pages/api/<area>/<name>.ts`.
- New reusable component: `sub-components/<area>/` for dashboard pieces, `widgets/` for generic form and chart widgets.
- New hook: `hooks/<area>/use<Name>.tsx`. New context: `context/<area>/<Name>Context.tsx`.
- New pure helper: `functions/<area>/<name>.ts`.
- New static data or config: `data/<area>/`. Do not put secrets in these files. See the forbidden-files rules in the mapper prompt and `.gitignore`.

---

*Convention analysis: 2026-10-26*
