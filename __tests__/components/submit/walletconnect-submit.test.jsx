import React from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import SubmitFlow from "../../../sub-components/submit/SubmitFlow";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { relayLoader } from "../../mocks/session";
import { renderWithSubmit, submitCalls } from "../../mocks/submit";

const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));
const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await tick(0);
  }
};
const NOT_SEEN = /GeniusWallet has no record of this submit/;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function pairedSubmit(relayOptions) {
  const relay = createFakeRelay(relayOptions);
  const view = renderWithSubmit(
    <WalletGate>
      <SubmitFlow />
    </WalletGate>,
    { provider: null, loadWalletConnect: relayLoader(relay) },
  );
  await tick(3000);
  act(() => relay.controls.approvePending());
  await settle();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.click(screen.getByRole("button", { name: "Load example" }));
  await settle();
  await user.click(screen.getByRole("button", { name: "Estimate cost" }));
  await settle();
  await user.click(await screen.findByRole("button", { name: "Pay and submit" }));
  await settle();
  return { relay, user, ...view };
}

describe("a submit whose reply never reaches the page", () => {
  test("the page gives up at 900 s, asks by key, and a later retry finds the one burn", async () => {
    const { relay, user } = await pairedSubmit({ profile: "zombie", mockProfile: "manualConfirm" });
    expect(screen.getByRole("heading", { name: "Confirm in your wallet" })).toBeInTheDocument();
    expect(screen.getByText(/Open GeniusWallet where you scanned the code\./)).toBeInTheDocument();
    await tick(899_000);
    expect(screen.getByRole("heading", { name: "Confirm in your wallet" })).toBeInTheDocument();
    await tick(1_000);
    await settle();
    expect(screen.getByText(NOT_SEEN)).toBeInTheDocument();
    expect(submitCalls(relay.provider)).toHaveLength(1);
    expect(relay.provider.controls.calls.at(-1)).toMatchObject({ method: "gnus_getJob" });

    await tick(50_000);
    act(() => relay.provider.controls.answerConfirm(true));
    await settle();
    await user.click(screen.getByRole("button", { name: "Pay and submit" }));
    await settle();
    expect(await screen.findByRole("heading", { name: "Job submitted" })).toBeInTheDocument();
    expect(relay.provider.controls.burnCount()).toBe(1);
    expect(submitCalls(relay.provider)).toHaveLength(1);
  });

  test("a wallet that stopped after the burn shows the pending screen, and Check again only asks", async () => {
    const { relay, user } = await pairedSubmit({ profile: "zombie", mockProfile: "walletStopsMidSubmit" });
    await tick(900_000);
    await settle();
    expect(screen.getByRole("heading", { name: "Waiting for GeniusWallet" })).toBeInTheDocument();
    const lookups = () => relay.provider.controls.calls.filter((c) => c.method === "gnus_getJob").length;
    const before = lookups();
    await user.click(screen.getByRole("button", { name: "Check again" }));
    await settle();
    expect(lookups()).toBe(before + 1);
    expect(submitCalls(relay.provider)).toHaveLength(1);
    expect(relay.provider.controls.burnCount()).toBe(1);
  });
});

describe("the connect and confirm words", () => {
  test("Confirm in your wallet carries the line on WalletConnect only", async () => {
    const relay = createFakeRelay({ mockProfile: "connectPrompt" });
    renderWithSubmit(<WalletGate>ready</WalletGate>, { provider: null, loadWalletConnect: relayLoader(relay) });
    await tick(3000);
    act(() => relay.controls.approvePending());
    await settle();
    expect(screen.getByText(/Open GeniusWallet where you scanned the code\./)).toBeInTheDocument();
  });

  test("the injected path has no such line", async () => {
    renderWithSubmit(<WalletGate>ready</WalletGate>, { profile: "connectPrompt" });
    await tick(0);
    expect(screen.getByRole("heading", { name: "Confirm in your wallet" })).toBeInTheDocument();
    expect(screen.queryByText(/where you scanned the code/)).not.toBeInTheDocument();
  });
});
