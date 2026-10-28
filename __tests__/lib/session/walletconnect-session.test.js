import React from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountQuery } from "../../../sub-components/wallet/useAccountQuery";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { relayLoader, renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));
const Page = () => (
  <>
    <IdentityHeader />
    <WalletGate>ready</WalletGate>
  </>
);
const getAccountsCalls = (relay) => relay.provider.controls.calls.filter((c) => c.method === "gnus_getAccounts");

async function expectNoViolations(container) {
  jest.useRealTimers();
  try {
    expect(await axe(container)).toHaveNoViolations();
  } finally {
    jest.useFakeTimers();
  }
}

// Pairs once and returns the relay holding the approved session.
async function pairedRelay(options = {}) {
  const relay = createFakeRelay(options);
  const first = renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
  await tick(3000);
  act(() => relay.controls.approvePending());
  await tick(0);
  expect(screen.getByText("ready")).toBeInTheDocument();
  first.store.dispose();
  first.unmount();
  return relay;
}

const reopen = async (relay) => {
  const view = renderWithSession(<Page />, { provider: null, loadWalletConnect: relayLoader(relay) });
  await tick(3000);
  return view;
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("restoring a stored session", () => {
  test("a reload pings the stored session and brings the header back without a new code", async () => {
    const relay = await pairedRelay();
    await reopen(relay);
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(1);
    expect(relay.controls.pingCount()).toBe(1);
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(getAccountsCalls(relay)).toHaveLength(2);
  });

  test("a wallet that does not answer shows Wallet offline after 10 s; Retry pings again", async () => {
    const relay = await pairedRelay();
    relay.controls.setOnline(false);
    await reopen(relay);
    expect(screen.getByRole("heading", { name: "Looking for GeniusWallet" })).toBeInTheDocument();
    await tick(10000);
    expect(screen.getByRole("heading", { name: "Wallet offline" })).toBeInTheDocument();
    expect(screen.getByText("GeniusWallet didn't answer over WalletConnect. Open GeniusWallet, then retry.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    relay.controls.setOnline(true);
    act(() => screen.getByRole("button", { name: "Retry" }).click());
    await tick(0);
    expect(relay.controls.pingCount()).toBe(2);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  test("of two stored gnus sessions the newer is attached and the older is ended", async () => {
    const relay = createFakeRelay();
    for (let i = 0; i < 2; i += 1) {
      await relay.connect();
      relay.controls.approvePending();
    }
    const [older, newer] = relay.getSessions();
    await reopen(relay);
    await tick(0);
    expect(relay.controls.disconnects.map((d) => d.topic)).toEqual([older.topic]);
    expect(relay.controls.requests.every((r) => r.topic === newer.topic)).toBe(true);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});

describe("disconnect", () => {
  test("the header offers Disconnect on WalletConnect only", async () => {
    const injected = renderWithSession(<Page />);
    expect(await screen.findByText("ready")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
    injected.unmount();
    const relay = await pairedRelay();
    await reopen(relay);
    await tick(0);
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  test("Disconnect ends the session and Connect again asks for a new code", async () => {
    const relay = await pairedRelay();
    await reopen(relay);
    await tick(0);
    act(() => screen.getByRole("button", { name: "Disconnect" }).click());
    await tick(0);
    expect(relay.controls.disconnects).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Disconnected" })).toBeInTheDocument();
    expect(screen.getByText("This page is no longer connected to GeniusWallet.")).toBeInTheDocument();
    act(() => screen.getByRole("button", { name: "Connect again" }).click());
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Connect GeniusWallet" })).toBeInTheDocument();
  });

  test("a wallet-side end lands on Disconnected, while an injected disconnect keeps its own screen", async () => {
    const relay = await pairedRelay();
    await reopen(relay);
    await tick(0);
    act(() => relay.controls.endFromWallet({ code: 6000, message: "User disconnected." }));
    await tick(0);
    expect(screen.getByRole("heading", { name: "Disconnected" })).toBeInTheDocument();
    const injected = renderWithSession(<Page />);
    expect(await screen.findAllByText("ready")).not.toHaveLength(0);
    act(() => injected.provider.controls.disconnect());
    expect(screen.getAllByRole("heading", { name: "GeniusWallet isn't responding" })).toHaveLength(1);
  });
});

describe("account queries", () => {
  test("Disconnect removes every cached account query", async () => {
    let cache;
    const Probe = () => {
      cache = useQueryClient().getQueryCache();
      useAccountQuery("probe", (client) => client.getEarnings());
      return null;
    };
    const relay = await pairedRelay();
    renderWithSession(
      <>
        <Page />
        <Probe />
      </>,
      { provider: null, loadWalletConnect: relayLoader(relay) },
    );
    await tick(3000);
    await tick(0);
    const named = () => cache.getAll().filter((query) => query.queryKey[2] !== null);
    expect(named()).toHaveLength(1);
    act(() => screen.getByRole("button", { name: "Disconnect" }).click());
    await tick(0);
    expect(named()).toHaveLength(0);
  });
});

describe("accessibility", () => {
  test("Wallet offline and Disconnected have no axe violations", async () => {
    const relay = await pairedRelay();
    relay.controls.setOnline(false);
    const view = await reopen(relay);
    await tick(10000);
    await expectNoViolations(view.container);
    relay.controls.setOnline(true);
    act(() => screen.getByRole("button", { name: "Disconnect" }).click());
    await tick(0);
    await expectNoViolations(view.container);
  });
});
