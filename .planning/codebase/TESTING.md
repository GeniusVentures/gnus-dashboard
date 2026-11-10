# Testing Patterns

**Analysis Date:** 2026-10-26

## Test Framework

**Runner:**
- Jest `^30.0.5` (`devDependencies` in `package.json`)
- Environment: `jest-environment-jsdom` `^30.0.5`, set as `testEnvironment` in `jest.config.js`
- Transform: `next/jest` wrapper (`createJestConfig` in `jest.config.js`) plus an explicit `babel-jest` transform with `next/babel`
- Config: `jest.config.js` (root)
- Setup: `jest.setup.js` (root, runs after the framework via `setupFilesAfterEnv`)
- Polyfills: `__tests__/utils/jest.polyfills.js` (runs via `setupFiles`, before the framework)

**Assertion and DOM libraries:**
- `@testing-library/jest-dom` `^6.6.4` (imported in `jest.setup.js` for matchers such as `toBeInTheDocument`)
- `@testing-library/react` `^16.3.0` (`render`, `renderHook`, `screen`, `waitFor`, `act`, `cleanup`)
- `@testing-library/user-event` `^14.6.1` (used in `__tests__/utils/standardTestPatterns.js` and `__tests__/utils/index.js`)
- `@testing-library/dom` `^10.4.1` (peer of the React testing library)
- `jest-axe` `^10.0.0` (installed for accessibility checks, used by the shared patterns in `__tests__/utils/standardTestPatterns.js`)
- `node-mocks-http` `^1.17.2` (API route tests. Example: `__tests__/pages/api/gas/gasPrice.test.js`)

**Other test tools installed:**
- Cypress `^14.5.3` is listed in `devDependencies`. No Cypress config or `cypress/` directory exists in the repo. The e2e suite is Jest, not Cypress. Treat Cypress as unused until a `cypress.config.*` file is added.
- `start-server-and-test` `^2.0.13` is used by the `test:e2e*` scripts to boot `next dev` before the e2e run.

**Run Commands (from `package.json` scripts):**
```bash
npm test                      # All tests via scripts/test-runner.js --type all
npm run test:watch            # All tests in watch mode
npm run test:coverage         # All tests with coverage
npm run test:changed          # Only tests for changed files (git diff HEAD~1)
npm run test:parallel         # All tests in parallel (--max-workers default 4)
npm run test:ci               # All tests, coverage, parallel, bail on first failure
npm run test:quick            # Unit tests in parallel
npm run test:full             # All tests, coverage, verbose

npm run test:unit             # Unit suite only
npm run test:unit:watch       # Unit suite in watch mode
npm run test:unit:coverage    # Unit suite with coverage

npm run test:integration      # Integration suite only
npm run test:integration:watch

npm run test:e2e              # Boots `next dev` on http://localhost:3000, then runs the e2e suite
npm run test:e2e:open         # e2e suite in watch mode after boot
npm run test:e2e:parallel     # e2e suite in parallel after boot
```

The `package.json` scripts are run with `npm`, but both `package-lock.json` and `yarn.lock` are committed. Use one package manager consistently to avoid drifting lock files.

**Single file or name filter (direct Jest):**
```bash
npx jest __tests__/components/job-order/OrderForm.test.jsx
npx jest --testNamePattern "renders the form"
```

`--pattern` on the runner is passed as `--testNamePattern="<value>"`. It filters test names, not files.

## Test Runner Script

`scripts/test-runner.js` wraps the Jest CLI. It runs `npx jest` with these path groups:

| `--type` | Paths passed to Jest |
|----------|----------------------|
| `unit` | `__tests__/functions`, `__tests__/hooks`, `__tests__/context`, `__tests__/basic.test.js` |
| `integration` | `__tests__/components`, `__tests__/pages`, `__tests__/integration` |
| `e2e` | `__tests__/e2e` |
| `all` | Runs `unit`, then `integration`, then `e2e` as three separate Jest processes |

Flags accepted by the runner: `--type`, `--watch`, `--coverage`, `--parallel`, `--changed`, `--verbose`, `--bail`, `--pattern`, `--max-workers`, `--help`.

Known gap: `__tests__/integration` is listed in the runner but does not exist. Integration runs cover `__tests__/components` and `__tests__/pages` only.

Known gap: `scripts/test-runner.js` requires `chalk`, which is not in `package.json`. It is present in `package-lock.json` only as a transitive dependency. A clean install that drops that transitive package will break the runner.

## Jest Configuration

`jest.config.js` (key settings):

- `setupFilesAfterEnv: ['<rootDir>/jest.setup.js']`
- `setupFiles: ['<rootDir>/__tests__/utils/jest.polyfills.js']`
- `testEnvironment: 'jest-environment-jsdom'`
- `testMatch`: `__tests__/**/*.{js,jsx,ts,tsx}`, any `**/__tests__/**/*`, and any `*.test.*` or `*.spec.*` file under the root
- `testPathIgnorePatterns` excludes `__tests__/mocks/`, `__tests__/README.md`, and several `__tests__/utils/` files. Some of those names (`testPatterns.js`, `e2eTestBase.js`, `componentHelpers.js`, `apiHelpers.js`) do not exist. Only `index.js`, `jest.polyfills.js`, `mockFactory.js`, `standardTestPatterns.js`, `testData.js`, `testHelpers.js`, and `testSetup.js` are in the directory.
- `clearMocks: true` and `restoreMocks: true`, so mock call history and implementations reset between tests
- `testTimeout: 10000`
- `errorOnDeprecated: true`
- `coverageThreshold.global`: 70% for branches, functions, lines, and statements
- `collectCoverageFrom` covers `pages/`, `components/`, `hooks/`, `functions/`, `context/`, `sub-components/`, `widgets/`, `layouts/`, and `store/`. `components/` does not exist. Type declarations (`*.d.ts`) are excluded.

**Coverage target mismatch:** `__tests__/README.md` says the thresholds are 80% (statements, functions, lines) and 75% (branches). `jest.config.js` enforces 70% across all four. Treat `jest.config.js` as the enforced value.

## Jest Setup (`jest.setup.js`)

This file runs before every test file. It does the following:

1. Imports `@testing-library/jest-dom` and calls `configure` from `@testing-library/react`:
   - `testIdAttribute: 'data-testid'`
   - `asyncUtilTimeout: 5000`
2. Registers an `afterEach` that calls `cleanup()`, `jest.clearAllMocks()`, and restores `console.error` and `console.warn`.
3. Registers a `beforeEach` that replaces `console.error` and `console.warn` with `jest.fn()`. Component errors do not print during tests. Assert on mock calls if you need to check a console message.
4. Stubs browser APIs that jsdom lacks:
   - `window.matchMedia` (returns `matches: false`)
   - `IntersectionObserver` and `ResizeObserver` (no-op classes)
   - `HTMLCanvasElement.prototype.getContext` (returns an object of `jest.fn()` drawing methods, for ApexCharts and Recharts)
   - `URL.createObjectURL` and `URL.revokeObjectURL`
   - `File` and `FileReader` (lightweight classes, `readAsText` and `readAsDataURL` resolve on `setTimeout`)
   - `crypto` (`getRandomValues`, `randomUUID` returns a fixed UUID, `subtle.digest` returns a 32-byte buffer)
   - `window.localStorage` and `window.sessionStorage` (jest mocks)
5. Defines `global.testUtils` with `waitFor(callback, timeout)` and `createMockFunction(name, impl)`. Use the built-in `waitFor` from `@testing-library/react` in new tests. `global.testUtils` is legacy.
6. MSW (`__tests__/mocks/server.js`) is wired but disabled. The `server.listen` and `server.close` hooks are commented out, and `msw` is not in `package.json` or `package-lock.json`. Do not import `__tests__/mocks/server.js` until MSW is installed.

## Jest Polyfills (`__tests__/utils/jest.polyfills.js`)

Runs before the framework. It fills in missing Node and browser globals if absent: `TextEncoder`/`TextDecoder` (from `util`), `fetch` (from `node-fetch`), `AbortController`, `structuredClone`, `performance`, `requestAnimationFrame`, `requestIdleCallback`, `Blob`, `FormData`, `Headers`, `Response`, and `Request`.

Note: `node-fetch` is in the lock file as a transitive dependency. It is not declared in `package.json`.

## Test File Organization

**Location:** All tests live under the top-level `__tests__/` directory. Tests do not sit next to source files. Each test directory mirrors the source path:

```
__tests__/
├── basic.test.js                       # Jest setup sanity checks (unit)
├── __snapshots__/basic.test.js.snap
├── components/
│   ├── dashboard/BlockchainInfo.test.jsx        -> sub-components/dashboard/BlockchainInfo.tsx
│   ├── job-order/OrderForm.test.jsx             -> sub-components/job-order/OrderForm.tsx
│   └── navbar/Price.test.jsx                    -> sub-components/navbar/Price.tsx
├── context/
│   ├── ipfs/IPFSContext.test.jsx                -> context/ipfs/IPFSContext.jsx
│   └── prices/PricesContext.test.jsx            -> context/prices/PricesContext.tsx
├── functions/
│   ├── ipfs/node.test.js                        -> functions/ipfs/node.ts
│   ├── messages/processing.test.js              -> functions/messages/processing.ts
│   └── time/elapseTime.test.js                  -> functions/time/elapseTime.ts
├── hooks/
│   ├── ipfs/useIPFS.test.js                     -> hooks/ipfs/useIPFS.tsx
│   └── prices/usePrices.test.js                 -> hooks/prices/usePrices.tsx
├── pages/
│   ├── _app.test.tsx                            -> pages/_app.tsx
│   ├── index.test.jsx                           -> pages/index.tsx
│   └── api/
│       ├── gas/gasPrice.test.js                 -> pages/api/gas/gasPrice.ts
│       └── processing/
│           ├── getEstimate.test.js              -> pages/api/processing/getEstimate.ts
│           └── submitJob.test.js                -> pages/api/processing/submitJob.ts
├── e2e/
│   ├── basic-smoke.test.js
│   └── job-order-flow.test.js
├── mocks/                                       # Shared mock modules (not run as tests)
│   ├── fileMock.js
│   ├── nextRouter.js
│   ├── reactToastify.js
│   ├── server.js                                # MSW server, unused
│   └── web3Modal.js
└── utils/                                       # Shared helpers (not run as tests)
    ├── index.js
    ├── jest.polyfills.js
    ├── mockFactory.js
    ├── standardTestPatterns.js
    ├── testData.js
    ├── testHelpers.js
    └── testSetup.js
```

Extensions: `.test.js`, `.test.jsx`, `.test.tsx`. `__tests__/README.md` is documentation, not a test.

**Naming:**
- `<ModuleName>.test.<ext>` for the file under test.
- `describe` blocks name the module. `it` blocks describe behavior in plain English, for example `it('initializes with empty arrays', ...)` in `__tests__/hooks/ipfs/useIPFS.test.js`.

## Test Types: Unit vs Integration vs E2E

The split is by directory, not by test content. The `unit`/`integration`/`e2e` labels exist only in `scripts/test-runner.js` and the npm script names.

**Unit (`__tests__/functions`, `__tests__/hooks`, `__tests__/context`, `__tests__/basic.test.js`):**
- Pure functions, hooks (`renderHook`), and context providers.
- Heavy dependencies are mocked: `axios`, `ethers`, `data/protobuf/*`, and `functions/messages/*`.
- Example: `__tests__/functions/time/elapseTime.test.js` tests `elapsedTime` with fake timers. `__tests__/hooks/ipfs/useIPFS.test.js` uses `jest.useFakeTimers()` and mocks `axios`.

**Integration (`__tests__/components`, `__tests__/pages`):**
- React components rendered with Testing Library and their provider and wallet context mocked.
- API routes called directly as functions, with `node-mocks-http` `createMocks` for `req` and `res`. Example: `__tests__/pages/api/gas/gasPrice.test.js`.
- Page tests mock child components (`__tests__/pages/index.test.jsx` mocks `sub-components/dashboard/BlockchainInfo` and `sub-components/videos/StaticVideoBG`).

**E2E (`__tests__/e2e`):**
- These are not browser tests. They run in jsdom under Jest. They do not drive a real Next.js server or a real wallet.
- `__tests__/e2e/basic-smoke.test.js` renders inline `TestApp`/`MockApp` components and checks `process.env.NODE_ENV === 'test'` and the presence of `fetch`, `TextEncoder`, and `TextDecoder`.
- `__tests__/e2e/job-order-flow.test.js` defines a `JobOrderForm` inside the test file, stubs `global.fetch` to return canned responses for `/api/processing/getEstimate` and `/api/processing/submitJob`, and asserts on the inline markup. It does not import `sub-components/job-order/OrderForm.tsx`.
- Because of this, a passing e2e run does not prove the real app works. A real browser e2e suite would need Cypress (installed but not configured) or Playwright (not installed).
- `npm run test:e2e` still boots `next dev` on port 3000 through `start-server-and-test`. The boot is wasted for the current tests because they do not call the server.

## Mocking

**Framework:** Jest built-ins (`jest.mock`, `jest.fn`, `jest.spyOn`, `jest.useFakeTimers`). No `sinon` or `msw` in active use.

**Module mocks (pattern used across the suite):**
```javascript
jest.mock('@web3modal/ethers/react', () => ({
  useWeb3Modal: () => ({ open: jest.fn() }),
  useWeb3ModalAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    chainId: 80002,
    isConnected: true
  }),
  useWeb3ModalProvider: () => ({
    walletProvider: { getSigner: jest.fn().mockResolvedValue({ /* ... */ }) }
  })
}));
```
Source: `__tests__/components/job-order/OrderForm.test.jsx`.

**Auto-mock for HTTP:**
```javascript
jest.mock('axios');
const mockedAxios = require('axios');
mockedAxios.get.mockResolvedValue({ data: {} });
```
Used in `__tests__/hooks/ipfs/useIPFS.test.js`, `__tests__/hooks/prices/usePrices.test.js`, `__tests__/pages/api/gas/gasPrice.test.js`, and `__tests__/components/job-order/OrderForm.test.jsx`.

**Shared mock modules in `__tests__/mocks/`:**
- `web3Modal.js`: exports `createMockWalletProvider`, `createMockWeb3Modal`, `createMockUseWeb3ModalAccount`, `createMockUseWeb3ModalProvider`, `createMockUseWeb3ModalEvents`, `createMockUseWeb3ModalTheme`. Default state is `chainId: 80002` (Polygon Amoy testnet).
- `nextRouter.js`: router stub for `next/router`.
- `reactToastify.js`: `toast` stub.
- `fileMock.js`: returns `'test-file-stub'` for static asset imports. Mapped in `jest.config.js` for images, fonts, and video.
- `server.js`: MSW server. Not active. See Jest Setup above.

The shared mocks are referenced in `__tests__/README.md` as `jest.mock('@web3modal/ethers/react', () => require('../mocks/web3Modal'))`. Few test files actually do this. Most inline their own `jest.mock` factory. Check the existing file before adding a new mock, to avoid two mocks for the same module.

### Wallet (`@web3modal/ethers/react`, `ethers`)

- Mock the Web3Modal hooks by module path: `useWeb3Modal`, `useWeb3ModalAccount`, `useWeb3ModalProvider`, `useWeb3ModalEvents`, `useWeb3ModalState`. Return a fixed `address` and `chainId` (use `80002`, the Polygon Amoy testnet ID).
- `context/wallet/Web3Modal.tsx` wraps the app with the Web3Modal provider. `__tests__/pages/_app.test.tsx` mocks that module (`../../context/wallet/Web3Modal`) so the app shell renders without a provider.
- Mock `ethers` at the module level in tests that touch the signer: `BrowserProvider`, `Contract`, `formatUnits`, `parseUnits` (see `__tests__/components/job-order/OrderForm.test.jsx` and `__tests__/pages/api/gas/gasPrice.test.js`).
- Never connect to a real wallet or RPC in tests. The `chainId`, `address`, and balance values are constants.

### IPFS and the native SDK (`functions/ipfs/node.ts`, `data/protobuf/*`, `GeniusSDK.dll`)

- The native GeniusSDK is loaded through `koffi` from `data/GeniusSDK.dll` in `functions/ipfs/node.ts`. Tests do not load the DLL. Mock the module that wraps it.
- API route tests mock the SDK wrapper module by path, then control results per test:
```javascript
jest.mock('../../../../functions/ipfs/node', () => ({
  getGeniusSDKCost: jest.fn(),
  runGeniusSDKProcess: jest.fn()
}));
import { runGeniusSDKProcess } from '../../../../functions/ipfs/node';

runGeniusSDKProcess.mockResolvedValueOnce(mockResponse);
runGeniusSDKProcess.mockRejectedValueOnce(new Error('SDK error'));
```
Source: `__tests__/pages/api/processing/submitJob.test.js`, `__tests__/pages/api/processing/getEstimate.test.js`.
- Generated protobuf modules are mocked as factories with `create: jest.fn()` members, marked `{ virtual: true }` because the bare specifiers (`data/protobuf/SGTransaction`) are not resolvable by Jest's default resolver:
```javascript
jest.mock('data/protobuf/SGTransaction', () => ({
  MintTx: { create: jest.fn() },
  EscrowTx: { create: jest.fn() },
  // ...
}), { virtual: true });
```
Source: `__tests__/functions/ipfs/node.test.js`.
- The IPFS hook talks to the server, not to IPFS directly. `hooks/ipfs/useIPFS.tsx` calls `GET /api/libp2p/startLibp2p` through axios. Tests mock `axios` and assert the URL: `expect(mockedAxios.get).toHaveBeenCalledWith('/api/libp2p/startLibp2p')`.
- `context/ipfs/IPFSContext.jsx` is tested by mocking `hooks/ipfs/useIPFS` (`__tests__/context/ipfs/IPFSContext.test.jsx`). There is no direct libp2p or Helia mock in the suite. `helia` and `libp2p` appear in `package.json` but are not imported by any test. A test that reaches those packages will need its own `jest.mock`.
- `__tests__/functions/ipfs/node.test.js` contains placeholder assertions (`expect(mockCreateNode).toBeDefined()` on `jest.fn()` results). It verifies the mock setup, not `node.ts` behavior.

### Next.js router and pages

- `next/router` is mocked in `__tests__/pages/index.test.jsx` and `__tests__/pages/_app.test.tsx`:
```javascript
jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', query: {}, push: jest.fn() })
}));
```
- `_app.test.tsx` also mocks the CSS imports (`bootstrap/dist/css/bootstrap.min.css`, `../styles/globals.css`) because `globals.css` does not exist in the repo. The real stylesheets are under `styles/theme/`.

### Toasts

- `react-toastify` is mocked with `toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }`. Assert with `expect(toast.error).toHaveBeenCalledWith(...)`. Used in `__tests__/components/job-order/OrderForm.test.jsx` and `__tests__/pages/_app.test.tsx`.

### Charts and layout

- `ApexCharts` and `Recharts` require canvas. `jest.setup.js` stubs `HTMLCanvasElement.prototype.getContext`. Components that use `IntersectionObserver` or `ResizeObserver` get the no-op stubs from `jest.setup.js`.
- `sub-components/dashboard/BlockchainInfo.tsx` is mocked in page tests, and its own table sub-components are mocked in `__tests__/components/dashboard/BlockchainInfo.test.jsx`.

### Static files

- `.css`, `.scss`, and `.sass` imports are mapped to `identity-obj-proxy` in `jest.config.js`. `identity-obj-proxy` is not installed (not in `package.json` or `package-lock.json`). Stylesheet imports will fail until it is added, or the mapping is replaced with `<rootDir>/__tests__/mocks/fileMock.js` or a local stub.
- Images, fonts, and video (`.jpg`, `.png`, `.svg`, `.mp4`, etc.) map to `__tests__/mocks/fileMock.js`.

### What to Mock

- External HTTP (`axios`), wallets (`@web3modal/ethers/react`, `ethers`), the native SDK wrapper (`functions/ipfs/node`), protobuf modules, Next.js router, toasts, and child components in page tests.
- Time for elapsed-time logic: use `jest.useFakeTimers()` and `jest.setSystemTime()`.
- Browser APIs jsdom does not provide (already stubbed in `jest.setup.js`).

### What NOT to Mock

- The component under test and its direct presentational children, unless the child is expensive (charts, map) or pulls in network or wallet code.
- Pure utilities such as `functions/time/elapseTime.ts`. Test them directly.
- React state and context. Use the real provider or a thin test wrapper.

## Fixtures and Factories

**Test Data:**
- Shared constants and generators live in `__tests__/utils/testData.js` (`testData.addresses`, `testData.blocks`, and similar) and `__tests__/utils/mockFactory.js` (`MOCK_CONFIGS.MOCK_DATA`).
- Inline fixtures are common. Most tests define their own arrays at the top of the `describe` block:
```javascript
const mockBlockchainData = [
  { block: 1, hash: 'hash1', transactions: 5, time: '1234567890' },
  { block: 2, hash: 'hash2', transactions: 3, time: '1234567891' }
];
```
Source: `__tests__/hooks/ipfs/useIPFS.test.js`.
- Use `0x1234567890123456789012345678901234567890` as the standard test wallet address. It is used in `mockFactory.js`, `testSetup.js`, `OrderForm.test.jsx`, and `web3Modal.js`.

**Location:**
- `__tests__/utils/` for shared helpers. `__tests__/mocks/` for module mocks. Keep fixtures inside the test file unless two or more files need them.

**Factory helpers:**
- `__tests__/utils/mockFactory.js` exports `MOCK_CONFIGS` and wallet mock builders such as `createWeb3ModalMock(state)` with states `disconnected`, `connecting`, `connected`, and `error`.
- `__tests__/utils/testSetup.js` exports `TEST_CONSTANTS` (timing, addresses, chain IDs) and `setupTimingMocks`.
- `__tests__/utils/standardTestPatterns.js` exports `createComponentRenderTests` (generates `renders without crashing`, `renders with correct test IDs`, and an accessibility check that every `img` has `alt`).
- `__tests__/utils/index.js` re-exports `testData` and the other helpers in one place.

**Caveat:** `__tests__/utils/testSetup.js`, `mockFactory.js`, `standardTestPatterns.js`, and `index.js` import from each other and call `jest.fn()` and `jest.mock(...)` at module scope in some branches. Importing them from a test file pulls in every helper. Prefer direct imports of only the helper you need, and verify the import loads before relying on it. Several of the tests that claim to use these helpers (for example `job-order-flow.test.js` calls `setupTestEnvironment`) carry this risk.

## Test Structure

**Suite organization:**
```javascript
import { render, screen } from '@testing-library/react';
import OrderForm from '../../../sub-components/job-order/OrderForm';

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

describe('OrderForm', () => {
  beforeEach(() => {
    // per-test setup
  });

  it('renders the form fields', () => {
    render(<OrderForm />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

**Patterns:**
- `jest.mock` calls go at the top of the file. Jest hoists them, so order matters only for `require` calls that run in the module body.
- `beforeEach` resets per-test state. `jest.clearAllMocks()` is already run in `jest.setup.js` and `restoreMocks: true` is set, so you rarely need to clear manually.
- `afterEach` for timers: `jest.useRealTimers()` after `jest.useFakeTimers()` (see `useIPFS.test.js`).
- Use `describe` to group by feature or user action. Nested `describe` is used in `__tests__/functions/time/elapseTime.test.js` and `__tests__/e2e/job-order-flow.test.js`.

## Async Testing

**Hooks with effects and fetches:**
```javascript
import { renderHook, waitFor, act } from '@testing-library/react';

it('fetches data', async () => {
  mockedAxios.get.mockResolvedValue({ data: { 'genius-ai': { usd: 0.5 } } });
  const { result } = renderHook(() => usePrices());
  await waitFor(() => expect(result.current.price).toBe(0.5));
});
```

**Fake timers for intervals:**
```javascript
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('polls every interval', async () => {
  renderHook(() => useIPFS());
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(mockedAxios.get).toHaveBeenCalledTimes(2);
});
```
Use `await act(...)` around timer advances that cause state updates.

**Waiting for DOM changes:**
```javascript
await waitFor(() => {
  expect(screen.getByText('job_123')).toBeInTheDocument();
});
```

## Error Testing

**Rejected promises from the SDK or API:**
```javascript
runGeniusSDKProcess.mockRejectedValueOnce(new Error('SDK error'));
await handler(req, res);
expect(res._getStatusCode()).toBe(500);
expect(res._getJSONData()).toEqual({ error: 'failed to process job.' });
```
Source pattern: `__tests__/pages/api/processing/submitJob.test.js`. The 500 response body matches `pages/api/processing/submitJob.ts`.

**Invalid input:**
```javascript
expect(() => elapsedTime('not-a-date')).toThrow('Invalid timestamp format');
```
Source: `__tests__/functions/time/elapseTime.test.js`.

**Hook errors (context misuse):**
```javascript
expect(() => renderHook(() => usePricesContext())).toThrow(
  'usePricesContext must be used within a PricesWrapper'
);
```

**Console output:** `jest.setup.js` silences `console.error` and `console.warn`. Assert with `expect(console.error).toHaveBeenCalled()` only if you need to check that a component logged an error.

## API Route Testing

Pattern from `__tests__/pages/api/gas/gasPrice.test.js` and `__tests__/pages/api/processing/submitJob.test.js`:
```javascript
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/processing/submitJob';

it('returns the job result', async () => {
  const { req, res } = createMocks({ method: 'POST', body: { jsonRequest: {} } });
  await handler(req, res);
  expect(res._getStatusCode()).toBe(200);
});
```
Note: `pages/api/processing/submitJob.ts` reads `req.body.jsonRequest`. Pass the body explicitly.

## Coverage

**Requirements:** 70% global threshold for branches, functions, lines, and statements (`coverageThreshold` in `jest.config.js`). `__tests__/README.md` states 80% and 75%. The enforced value is 70%.

**Scope:** `collectCoverageFrom` covers `pages/`, `hooks/`, `functions/`, `context/`, `sub-components/`, `widgets/`, `layouts/`, and `store/`. Files outside those directories (for example `data/`, `config/`, `scripts/`) are not measured.

**Caveat:** The coverage run uses the Jest runner with `--coverage`. Several tests in `__tests__/e2e/` and some placeholder tests in `__tests__/functions/ipfs/node.test.js` do not exercise source files, so they add test count but no coverage.

**View coverage:**
```bash
npm run test:coverage         # All suites, prints table and writes coverage/
npm run test:unit:coverage    # Unit suites only
```
`coverage/` is in `.gitignore`. Open `coverage/lcov-report/index.html` for the HTML report.

## Test Types

**Unit Tests:**
- Scope: pure functions, hooks, and context providers
- Location: `__tests__/functions/`, `__tests__/hooks/`, `__tests__/context/`, `__tests__/basic.test.js`
- Approach: `renderHook`, direct function calls, module mocks for network and SDK

**Integration Tests:**
- Scope: component rendering with mocked providers and API route handlers
- Location: `__tests__/components/`, `__tests__/pages/`
- Approach: `render` from Testing Library, `createMocks` for API routes, mocks at the module boundary

**E2E Tests:**
- Framework: Jest in jsdom. Not a browser test. Cypress is installed but not configured. Playwright is not installed.
- Location: `__tests__/e2e/`
- Approach: inline component markup and stubbed `fetch`. Does not exercise `sub-components/job-order/OrderForm.tsx` or the live Next.js server.
- Run with `npm run test:e2e`, which boots `next dev` first.

## Snapshot Testing

- One snapshot exists: `__tests__/__snapshots__/basic.test.js.snap`, produced by `__tests__/basic.test.js`. Snapshot content is a plain object (`features`, `name`, `version`), not rendered UI.
- Do not add UI snapshot tests without a reason. Prefer role and text queries.

## Test Environment Notes

- `process.env.NODE_ENV` is `'test'` under Jest. `next/jest` loads `next.config.js` and any `.env` files from the root. Do not put real secrets in test fixtures. The mapper's forbidden-file rules apply.
- jsdom does not provide `window.scrollTo`, `HTMLElement.prototype.scrollIntoView`, or `window.matchMedia` by default. `matchMedia` is stubbed in `jest.setup.js`. Stub the others per file as needed.
- `global.fetch` is polyfilled from `node-fetch` in `jest.polyfills.js`. Tests that need predictable responses should replace it with `global.fetch = jest.fn()` (as `job-order-flow.test.js` does).

## Known Test Setup Issues

1. `identity-obj-proxy` is mapped in `jest.config.js` but not installed. CSS imports break until it is added.
2. `chalk` is required by `scripts/test-runner.js` but not declared in `package.json`.
3. `__tests__/integration` is referenced by the runner but does not exist.
4. `__tests__/mocks/server.js` (MSW) is wired in comments only. `msw` is not installed.
5. `jest.config.js` `testPathIgnorePatterns` names several helper files that do not exist. Harmless, but misleading.
6. Coverage threshold conflict: 70% in `jest.config.js`, 80%/75% in `__tests__/README.md`.
7. `tsconfig.json` `paths` (`@/components/*`, `@/lib/*`, `@/styles/*`) do not match the Jest `moduleNameMapper`, which also maps `@/hooks`, `@/functions`, and others that `tsconfig` does not declare. Tests that use `@/` aliases will resolve in Jest but not in TypeScript.
8. Many tests in `__tests__/e2e/` and `__tests__/functions/ipfs/node.test.js` test mock behavior, not application code.
9. `npm run test:e2e` boots the dev server even though the current e2e tests do not call it.

Do not run the suite to verify these items. Confirm them by reading the files.

## Common Patterns Summary

| Need | Use |
|------|-----|
| Mock a wallet hook | `jest.mock('@web3modal/ethers/react', () => ({ ... }))` |
| Mock HTTP | `jest.mock('axios')` then `mockedAxios.get.mockResolvedValue(...)` |
| Mock the native SDK | `jest.mock('<path>/functions/ipfs/node', () => ({ runGeniusSDKProcess: jest.fn() }))` |
| Mock protobuf modules | `jest.mock('data/protobuf/...', factory, { virtual: true })` |
| Mock Next router | `jest.mock('next/router', () => ({ useRouter: ... }))` |
| Mock toasts | `jest.mock('react-toastify', () => ({ toast: { ... } }))` |
| Hook test | `renderHook` from `@testing-library/react` |
| API route test | `createMocks` from `node-mocks-http` |
| Timers | `jest.useFakeTimers()` in `beforeEach`, `jest.useRealTimers()` in `afterEach` |
| Async DOM | `await waitFor(() => expect(...))` |

---

*Testing analysis: 2026-10-26*
