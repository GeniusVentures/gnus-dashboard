import React from "react";
import { act, screen } from "@testing-library/react";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { WALLET_UA, makeStore, relayLoader, renderWithSession } from "../../mocks/session";

const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));
const Page = () => (
  <>
    <IdentityHeader />
    <WalletGate>ready</WalletGate>
  </>
);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("browser path over a fake relay", () => {
  test("no wallet for 3 s loads WalletConnect once and shows the pairing link", async () => {
    const relay = createFakeRelay();
    const loadWalletConnect = relayLoader(relay);
    const { container } = renderWithSession(<Page />, { provider: null, loadWalletConnect });
    await tick(2999);
    expect(loadWalletConnect).not.toHaveBeenCalled();
    await tick(1);
    expect(loadWalletConnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Connect GeniusWallet" })).toBeInTheDocument();
    expect(relay.controls.proposals[0].uri).toMatch(/^wc:/);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("approval shows the confirm screen while the first call waits, then both identities", async () => {
    const relay = createFakeRelay({ mockProfile: "connectPrompt" });
    renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
    await tick(3000);
    act(() => relay.controls.approvePending());
    await tick(0);
    expect(screen.getByRole("heading", { name: "Confirm in your wallet" })).toBeInTheDocument();
    act(() => relay.provider.controls.answerConnect(true));
    await tick(0);
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByText(/Earning as/)).toBeInTheDocument();
    expect(screen.getByText("0xa1a1...a1a1")).toBeInTheDocument();
    expect(screen.getByText(/Paying from/)).toBeInTheDocument();
    expect(screen.getByText("0xb2b2...b2b2")).toBeInTheDocument();
  });

  test("every request goes out on the Amoy chain with an object for params", async () => {
    const relay = createFakeRelay();
    renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
    await tick(3000);
    act(() => relay.controls.approvePending());
    await tick(0);
    expect(relay.controls.requests.map((r) => [r.method, r.params, r.chainId])).toEqual([
      ["gnus_getAccounts", {}, "eip155:80002"],
    ]);
    expect(relay.provider.controls.calls[0]).toEqual({ method: "gnus_getAccounts", params: {} });
  });

  test("an injected wallet means WalletConnect is never loaded", async () => {
    const relay = createFakeRelay();
    const now = relayLoader(relay);
    renderWithSession(<Page />, { provider: createMockProvider(), loadWalletConnect: now });
    await tick(5000);
    const marker = relayLoader(relay);
    const { store, env } = makeStore({ provider: null, userAgent: WALLET_UA, loadWalletConnect: marker });
    store.start();
    await tick(500);
    env.win.gnus = createMockProvider();
    act(() => env.win.dispatchEvent(new Event("gnus#initialized")));
    await tick(5000);
    expect(now).not.toHaveBeenCalled();
    expect(marker).not.toHaveBeenCalled();
    expect(store.getState().phase).toBe("ready");
  });

  test("a build without a project id shows GeniusWallet required", async () => {
    const loadWalletConnect = jest.fn(async () => ({ createClient: async () => null }));
    renderWithSession(<Page />, { provider: null, loadWalletConnect });
    await tick(3000);
    expect(screen.getByRole("heading", { name: "GeniusWallet required" })).toBeInTheDocument();
  });
});
