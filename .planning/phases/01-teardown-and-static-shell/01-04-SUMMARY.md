---
phase: 01-teardown-and-static-shell
plan: 04
status: complete
---

# Phase 1 Plan 4: Dependency prune, one lockfile, pins Summary

Dependencies cut to 8 runtime and 13 dev packages in three batches, package-lock.json deleted, Node pinned to 22, Next and eslint-config-next pinned at exactly 14.2.35, and `yarn test` is plain Jest.

**Tasks:** 2/2. **Date:** 2026-10-26.

## Task commits

| Batch | Commit | Subject |
|-------|--------|---------|
| 6a | e705668 | chore(01): remove server and libp2p dependencies (group 6a) |
| 6b | 1f669de | chore(01): remove wallet and web3 dependencies (group 6b) |
| 6c | a37ea29 | chore(01): remove explorer, UI and Redux dependencies (group 6c) |
| 6d | 5a3d4a4 | chore(01): one lockfile, pinned Node and Next 14.2.35 (group 6d) |

## Gate results

| Point | `yarn build` | Jest |
|-------|--------------|------|
| After 6a | exit 0 | exit 0, 3 suites, 13 tests, 1 snapshot |
| After 6b | exit 0 | exit 1 first (node-fetch gone, 3 suites failed to start), exit 0 after the polyfill fix: 3 suites, 13 tests |
| After 6c | exit 0 | exit 0, 3 suites, 13 tests, 1 snapshot |
| After 6d (after `rm -rf node_modules` and `yarn install --frozen-lockfile`) | exit 0 (shared First Load JS 198 kB) | `yarn test --ci` exit 0, 3 suites, 13 tests, 1 snapshot |

The frozen install exited 0 and a second run left the staged yarn.lock unchanged.

## Packages removed

- 6a (dependencies): koffi, dotenv, nodemon, node-cache, tsc, string_decoder, @bufbuild/protobuf, @bufbuild/protoc-gen-es, protobufjs, protons-runtime, libp2p, the 17 @libp2p/* packages, @chainsafe/libp2p-gossipsub, -noise, -yamux, @multiformats/dns, multiaddr, multiaddr-matcher, helia, @helia/delegated-routing-v1-http-api-client, @ipld/dag-pb, @dcdn/graphsync, blockstore-core, datastore-core, it-pipe, any-signal, delay, bs58, cheerio, @types/cheerio. Dev: protons, @protobuf-ts/plugin, node-mocks-http.
- 6b: @web3modal/ethers, @reown/appkit, @reown/appkit-adapter-ethers, @reown/walletkit, @walletconnect/core, @walletconnect/utils, @walletconnect/web3-provider, @coinbase/wallet-sdk, ethers.
- 6c: apexcharts, react-apexcharts, recharts, react-gauge-component, react-simple-maps, @pathofdev/react-tag-input, @formkit/auto-animate, validator, @types/validator, uuid, axios, react-transition-group, @reduxjs/toolkit, react-redux, next-seo, react-tooltip. Dev: react-test-renderer, eslint-config-prettier, eslint-config-standard, eslint-plugin-import, eslint-plugin-node, eslint-plugin-prettier, eslint-plugin-promise.

Remaining runtime: @types/react, bootstrap, next, react, react-bootstrap, react-dom, react-toastify, sass. Remaining dev (13): @testing-library/dom, jest-dom, react, user-event, @types/node, cypress, eslint, eslint-config-next, jest, jest-axe, jest-environment-jsdom, start-server-and-test, typescript. This is exactly the set the plan's verify asserts. `git grep` found no kept source file importing any removed package except `next-seo` in `pages/_app.tsx`, which was edited in 6c. Nothing was kept back.

Kept on purpose: jest-axe and @testing-library/user-event (phases 3 and 7), start-server-and-test (01-05).

## ethereumjs-abi

The git+ssh `ethereumjs-abi` entry in yarn.lock came in through the wallet packages. After 6b, yarn.lock holds no `git+ssh` or `ethereumjs-abi` string (count 0). The env-only https git rewrite is no longer needed for `yarn install`; I still exported it for every install in this plan, so the claim "install works without it" is read from the lockfile, not tested.

## Polyfill change (6b)

`node-fetch` was never declared and only resolved through the wallet packages. After 6b `require.resolve('node-fetch')` failed and all 3 suites failed to start. Per the contingency I deleted the fetch block in `__tests__/utils/jest.polyfills.js` and the `expect(global.fetch).toBeDefined()` line in `__tests__/e2e/basic-smoke.test.js`. Test count unchanged: 13 tests before and after (the assertion sat inside an existing `it`). It is committed with 6b.

## Other changes

- `pages/_app.tsx` (6c): NextSeo, useRouter, the `process.env.baseURL` page URL and the title constant are gone; `<title>GNUS.AI Dashboard</title>` sits in Head; `<base href="/" />` is kept.
- `data/navbars/navbarRoutes.ts`: no edit. It was already `[]` with no uuid import and no `id` fields after earlier plans.
- 6d: package-lock.json, `scripts/test-runner.js` and `__tests__/README.md` deleted; `.nvmrc` is `22`; `engines.node` is `>=22 <23`; `next` and `eslint-config-next` are `14.2.35` (yarn.lock has `next@14.2.35:`); scripts are `dev`, `build`, `lint`, `test: jest`; the `identity-obj-proxy` stylesheet mapping is removed from `jest.config.js`. Node on this machine is v22.19.0, matching the pin.

## Deviations from Plan

1. **[Rule 3 - Blocking] node-fetch polyfill** - see above.
2. `navbarRoutes.ts` needed no change (already empty).
3. The verify's `git diff --quiet yarn.lock` compares against the index, and the `yarn add` rewrote yarn.lock, so I staged yarn.lock first and then proved the frozen reinstall leaves it unchanged. The chained verify was run in its parts.

## Self-Check

Four commits in `git log`; author braianwegmann@gmail.com on all; `package-lock.json`, `scripts/test-runner.js`, `__tests__/README.md` absent; no trailer in any message.
