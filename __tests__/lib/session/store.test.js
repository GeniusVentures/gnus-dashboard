import React from "react";
import { act, screen } from "@testing-library/react";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { makeStore, renderWithSession } from "../../mocks/session";

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
