import React from "react";
import { act, screen } from "@testing-library/react";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { createSessionStore } from "../../../lib/session/store";
import { makeEnv, makeStore, renderWithSession } from "../../mocks/session";

const GET_ACCOUNTS = "gnus_getAccounts";
const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));

afterEach(() => jest.useRealTimers());

describe("session store", () => {
  test("a StrictMode mount sends exactly one gnus_getAccounts", async () => {
    const { provider } = renderWithSession(<IdentityHeader />, { strict: true });
    expect(await screen.findByText("Network: staging, chain 80002")).toBeInTheDocument();
    expect(provider.controls.calls.filter((call) => call.method === GET_ACCOUNTS)).toHaveLength(1);
  });

  test("a call the wallet never answers stays on Confirm in your wallet", async () => {
    jest.useFakeTimers();
    const silent = { isGeniusWallet: true, request: () => new Promise(() => {}), on() {}, removeListener() {} };
    renderWithSession(<WalletGate>ready</WalletGate>, { provider: silent });
    await tick(10 * 60 * 1000);
    expect(screen.getByRole("heading", { name: "Confirm in your wallet" })).toBeInTheDocument();
  });

  test("switchAccount replaces the address in the header", async () => {
    const { provider } = renderWithSession(<IdentityHeader />);
    expect(await screen.findByText("0xa1a1...a1a1")).toBeInTheDocument();
    act(() => provider.controls.switchAccount());
    expect(screen.getByText("0xa2a2...a2a2")).toBeInTheDocument();
    expect(screen.queryByText("0xa1a1...a1a1")).not.toBeInTheDocument();
  });

  test("without a wallet the page is detecting at 2999 ms and noWallet at 3000 ms", async () => {
    jest.useFakeTimers();
    const { store } = makeStore({ provider: null });
    store.start();
    await tick(2999);
    expect(store.getState().phase).toBe("detecting");
    await tick(1);
    expect(store.getState().phase).toBe("noWallet");
  });

  test("an internal error fails with its message and retry reaches ready", async () => {
    const mock = createMockProvider();
    let first = true;
    const flaky = {
      isGeniusWallet: true,
      request(args) {
        if (first) {
          first = false;
          return Promise.reject({ code: -32603, message: "boom" });
        }
        return mock.request(args);
      },
      on: (...args) => mock.on(...args),
      removeListener: (...args) => mock.removeListener(...args),
    };
    renderWithSession(<WalletGate>ready</WalletGate>, { provider: flaky });
    expect(await screen.findByRole("heading", { name: "GeniusWallet couldn't connect" })).toBeInTheDocument();
    expect(screen.getByText("GeniusWallet hit an internal error.")).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "Retry" }).click());
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });

  test("loading pages/_app makes no store and reads no window.gnus", () => {
    const reads = jest.fn();
    Object.defineProperty(window, "gnus", { configurable: true, get: () => reads() });
    const created = jest.fn();
    jest.isolateModules(() => {
      jest.doMock("../../../lib/session/store", () => {
        const actual = jest.requireActual("../../../lib/session/store");
        return {
          ...actual,
          createSessionStore: (...args) => (created(), actual.createSessionStore(...args)),
          getSessionStore: (...args) => (created(), actual.getSessionStore(...args)),
        };
      });
      require("../../../pages/_app");
    });
    delete window.gnus;
    jest.dontMock("../../../lib/session/store");
    expect(created).not.toHaveBeenCalled();
    expect(reads).not.toHaveBeenCalled();
  });
});

describe("connect-time recovery in the store", () => {
  function startingUp() {
    const mock = createMockProvider();
    const state = { up: false, calls: [] };
    const provider = {
      isGeniusWallet: true,
      request(args) {
        state.calls.push(Date.now());
        return state.up ? mock.request(args) : Promise.reject({ code: 4900, message: "not ready" });
      },
      on: (...args) => mock.on(...args),
      removeListener: (...args) => mock.removeListener(...args),
    };
    return { provider, state };
  }

  test("startingUp retries at 1, 2, 4, 8, 16, 30, 30 s and Try now restarts the schedule", async () => {
    jest.useFakeTimers();
    const { provider, state } = startingUp();
    const { store } = makeStore({ provider });
    store.start();
    await tick(0);
    expect(store.getState().phase).toBe("startingUp");
    const t0 = state.calls[0];
    await tick(91000);
    expect(state.calls.slice(1).map((at) => (at - t0) / 1000)).toEqual([1, 3, 7, 15, 31, 61, 91]);
    store.tryNow();
    await tick(0);
    expect(state.calls).toHaveLength(9);
    const afterTryNow = state.calls[8];
    await tick(1000);
    expect(state.calls[9] - afterTryNow).toBe(1000);
    store.dispose();
  });

  test("the retry reaches ready without a click, and leaving startingUp cancels the timer", async () => {
    jest.useFakeTimers();
    const { provider, state } = startingUp();
    const { store } = makeStore({ provider });
    store.start();
    await tick(0);
    state.up = true;
    await tick(1000);
    expect(store.getState().phase).toBe("ready");
    const calls = state.calls.length;
    await tick(120000);
    expect(state.calls).toHaveLength(calls);
  });

  test("a late injection after the no-wallet screen connects", async () => {
    jest.useFakeTimers();
    const env = makeEnv({ provider: null });
    const store = createSessionStore(env);
    store.start();
    await tick(3000);
    expect(store.getState().phase).toBe("noWallet");
    env.win.gnus = createMockProvider();
    env.win.dispatchEvent(new Event("gnus#initialized"));
    expect(store.getState().phase).toBe("connecting");
    await tick(0);
    expect(store.getState().phase).toBe("ready");
  });

  test("Connect again after a decline prompts again and reaches ready", async () => {
    const { store, provider } = makeStore({ profile: "connectPrompt" });
    store.start();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().phase).toBe("connecting");
    provider.controls.answerConnect(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState()).toMatchObject({ phase: "denied", cause: "declined" });
    store.connectAgain();
    expect(store.getState().phase).toBe("connecting");
    provider.controls.answerConnect(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().phase).toBe("ready");
  });
});

describe("runtime states in the store", () => {
  const { WALLET_UA } = require("../../mocks/session");

  async function ready() {
    const made = makeStore();
    made.store.start();
    await tick(0);
    expect(made.store.getState().phase).toBe("ready");
    return made;
  }

  test("a disconnect event gives notResponding/disconnected and Retry reconnects", async () => {
    jest.useFakeTimers();
    const { store, provider } = await ready();
    act(() => provider.controls.disconnect());
    expect(store.getState()).toMatchObject({ phase: "notResponding", cause: "disconnected", accounts: null });
    store.retry();
    await tick(0);
    expect(store.getState().phase).toBe("ready");
  });

  test("a tracked read unanswered at 15 s is notResponding/noReply, and the late answer restores ready", async () => {
    jest.useFakeTimers();
    const { store } = await ready();
    let answer;
    const read = store.track(new Promise((resolve) => (answer = resolve)));
    await tick(14999);
    expect(store.getState().phase).toBe("ready");
    await tick(1);
    expect(store.getState()).toMatchObject({ phase: "notResponding", cause: "noReply" });
    expect(store.getState().accounts).not.toBeNull();
    answer("late");
    await expect(read).resolves.toBe("late");
    await tick(0);
    expect(store.getState().phase).toBe("ready");
  });

  test("a read answered in time never shows the hint, and two slow reads need both answers", async () => {
    jest.useFakeTimers();
    const { store } = await ready();
    await store.track(Promise.resolve(1));
    await tick(60000);
    expect(store.getState().phase).toBe("ready");
    let first;
    let second;
    store.track(new Promise((resolve) => (first = resolve)));
    store.track(new Promise((resolve) => (second = resolve)));
    await tick(15000);
    expect(store.getState().phase).toBe("notResponding");
    first();
    await tick(0);
    expect(store.getState().phase).toBe("notResponding");
    second();
    await tick(0);
    expect(store.getState().phase).toBe("ready");
  });

  test("inside the wallet with no injection, noBridge shows at 10 s and a later injection still connects", async () => {
    jest.useFakeTimers();
    const env = makeEnv({ provider: null, userAgent: WALLET_UA });
    const store = createSessionStore(env);
    store.start();
    await tick(9999);
    expect(store.getState().phase).toBe("detecting");
    await tick(1);
    expect(store.getState()).toMatchObject({ phase: "notResponding", cause: "noBridge" });
    env.win.gnus = createMockProvider();
    env.win.dispatchEvent(new Event("gnus#initialized"));
    await tick(0);
    expect(store.getState().phase).toBe("ready");
  });

  test("returning to the tab re-reads getAccounts once; a second event meanwhile sends nothing; nothing polls", async () => {
    jest.useFakeTimers();
    const mock = createMockProvider();
    const hold = { release: null };
    const provider = {
      isGeniusWallet: true,
      request(args) {
        if (hold.release === "wait") {
          return new Promise((resolve) => (hold.release = () => resolve(mock.request(args))));
        }
        return mock.request(args);
      },
      on: (...a) => mock.on(...a),
      removeListener: (...a) => mock.removeListener(...a),
    };
    const { store, env } = makeStore({ provider });
    store.start();
    await tick(0);
    const reads = () => mock.controls.calls.filter((call) => call.method === GET_ACCOUNTS).length;
    await tick(10 * 60 * 1000);
    expect(reads()).toBe(1);
    hold.release = "wait";
    env.win.dispatchEvent(new Event("visibilitychange"));
    env.win.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    expect(typeof hold.release).toBe("function");
    hold.release();
    await tick(0);
    expect(reads()).toBe(2);
    env.win.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    expect(reads()).toBe(3);
  });

  // getAccounts answers with the identity as it was when the read began, then waits until released.
  function heldReads() {
    const mock = createMockProvider();
    const hold = { on: false, release: null };
    const provider = {
      isGeniusWallet: true,
      async request(args) {
        const reply = await mock.request(args);
        if (hold.on && args.method === GET_ACCOUNTS) {
          const snapshot = structuredClone(reply);
          await new Promise((resolve) => (hold.release = resolve));
          return snapshot;
        }
        return reply;
      },
      on: (...a) => mock.on(...a),
      removeListener: (...a) => mock.removeListener(...a),
    };
    return { mock, hold, provider };
  }

  test("a re-read that began before an account switch does not put the old account back", async () => {
    jest.useFakeTimers();
    const { mock, hold, provider } = heldReads();
    const { store, env } = makeStore({ provider });
    store.start();
    await tick(0);
    const before = store.getState().accounts.node.sdkAddress;
    hold.on = true;
    env.win.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    act(() => mock.controls.switchAccount());
    const after = store.getState().accounts.node.sdkAddress;
    expect(after).not.toBe(before);
    hold.release();
    await tick(0);
    expect(store.getState().accounts.node.sdkAddress).toBe(after);
  });

  test("a re-read that began before a network change does not put the old network back", async () => {
    jest.useFakeTimers();
    const { mock, hold, provider } = heldReads();
    const { store, env } = makeStore({ provider });
    store.start();
    await tick(0);
    hold.on = true;
    env.win.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    act(() => mock.controls.setNetwork({ sdk: "staging", evmChainId: 137 }));
    hold.release();
    await tick(0);
    expect(store.getState().accounts.network.evmChainId).toBe(137);
  });

  test("a hidden tab does not re-read", async () => {
    jest.useFakeTimers();
    const made = makeStore();
    made.env.isVisible = () => false;
    made.store.start();
    await tick(0);
    made.env.win.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    expect(made.provider.controls.calls.filter((call) => call.method === GET_ACCOUNTS)).toHaveLength(1);
  });
});
