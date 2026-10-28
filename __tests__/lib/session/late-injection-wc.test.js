import React from "react";
import { act, screen } from "@testing-library/react";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { installMock, mockOptionsFromSearch } from "../../../lib/gnus/mock/install";
import { getSessionStore } from "../../../lib/session/store";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { relayLoader, renderWithSession } from "../../mocks/session";

const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));
const Page = () => (
  <>
    <IdentityHeader />
    <WalletGate>ready</WalletGate>
  </>
);
const inject = (env) => {
  env.win.gnus = createMockProvider();
  act(() => env.win.dispatchEvent(new Event("gnus#initialized")));
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("a wallet injected after the browser path began", () => {
  test("with no session yet, WalletConnect is closed and the injected wallet takes over", async () => {
    const relay = createFakeRelay();
    const { env } = renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
    await tick(3000);
    expect(screen.getByRole("heading", { name: "Connect GeniusWallet" })).toBeInTheDocument();
    inject(env);
    await tick(0);
    expect(relay.controls.closeCount()).toBe(1);
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
    expect(screen.getByText("0xa1a1...a1a1")).toBeInTheDocument();
  });

  test("with a session attached, nothing switches", async () => {
    const relay = createFakeRelay();
    const { env } = renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
    await tick(3000);
    act(() => relay.controls.approvePending());
    await tick(0);
    inject(env);
    await tick(0);
    expect(relay.controls.closeCount()).toBe(0);
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });
});

describe("the dev entry", () => {
  test("?gnusWc selects the fake relay with that profile and injects no window.gnus", async () => {
    expect(mockOptionsFromSearch("?gnusWc=decline")).toEqual({ relayProfile: "decline" });
    expect(mockOptionsFromSearch("?gnusMock=jobHistory&gnusWc=approve")).toEqual({
      profile: "jobHistory",
      relayProfile: "approve",
    });
    const win = new EventTarget();
    win.navigator = { userAgent: "Mozilla/5.0" };
    installMock(win, { relayProfile: "decline" });
    await tick(5000);
    expect(win.gnus).toBeUndefined();
  });

  test("the relay answers by itself and the page reaches the declined screen", async () => {
    const win = Object.assign(new EventTarget(), {
      document: { visibilityState: "visible" },
      navigator: { userAgent: "Mozilla/5.0" },
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
    });
    installMock(win, { relayProfile: "decline" });
    const store = getSessionStore(win);
    store.start();
    await tick(3000);
    expect(store.getState().phase).toBe("pairing");
    await tick(2000);
    expect(store.getState().phase).toBe("pairingDeclined");
    store.dispose();
  });

  test("an unknown relay profile throws like a bad gnusInject", () => {
    expect(() => mockOptionsFromSearch("?gnusWc=nope")).toThrow(/gnusWc must be one of/);
    expect(() => mockOptionsFromSearch("?gnusInject=soon")).toThrow(/gnusInject must be/);
  });

  test("with gnusInject as well, a late injection takes over from the relay", async () => {
    const win = new EventTarget();
    installMock(win, { relayProfile: "approve", injectAfterMs: 4000 });
    await tick(4000);
    expect(win.gnus.isGeniusWallet).toBe(true);
  });
});
