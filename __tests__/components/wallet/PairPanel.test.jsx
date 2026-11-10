import React from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import WalletGate from "../../../sub-components/wallet/WalletGate";
import { relayLoader, renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

// axe waits on real timers; the pages here need fake ones only to get to the screen.
async function expectNoViolations(container) {
  jest.useRealTimers();
  try {
    expect(await axe(container)).toHaveNoViolations();
  } finally {
    jest.useFakeTimers();
  }
}

const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));

async function pairing(relayOptions = {}, options = {}) {
  const relay = createFakeRelay(relayOptions);
  const view = renderWithSession(<WalletGate>ready</WalletGate>, {
    provider: null,
    loadWalletConnect: relayLoader(relay),
    ...options,
  });
  await tick(3000);
  return { relay, ...view };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("pairing screen", () => {
  test("shows an SVG code, copies the link, and still copies when the Clipboard API is missing", async () => {
    const { relay, container } = await pairing();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    expect(container.querySelector("svg[aria-label='WalletConnect pairing code']")).not.toBeNull();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(relay.controls.proposals[0].uri);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    document.execCommand = jest.fn(() => true);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  test("an expired proposal gets a new, different code while the tab is visible", async () => {
    const { relay } = await pairing({ profile: "proposalExpires" });
    const first = relay.controls.proposals[0].uri;
    act(() => relay.controls.expirePending());
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(2);
    expect(relay.controls.proposals[1].uri).not.toBe(first);
    expect(screen.getByRole("heading", { name: "Connect GeniusWallet" })).toBeInTheDocument();
  });

  test("while the tab is hidden no new code is made until it is visible again", async () => {
    let visible = false;
    const { relay, env } = await pairing({ profile: "proposalExpires" }, { isVisible: () => visible });
    act(() => relay.controls.expirePending());
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(1);
    visible = true;
    act(() => env.win.dispatchEvent(new Event("visibilitychange")));
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(2);
  });

  test("a declined pairing shows the wallet's words as text, cut at 200 characters, and Try again makes a new code", async () => {
    const { relay } = await pairing({ profile: "decline" });
    const hostile = `<img src=x onerror=alert(1)>${"a".repeat(300)}`;
    act(() => relay.controls.declinePending(hostile));
    await tick(0);
    expect(screen.getByRole("heading", { name: "GeniusWallet declined the connection." })).toBeInTheDocument();
    const shown = hostile.slice(0, 200);
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    act(() => screen.getByRole("button", { name: "Try again" }).click());
    await tick(0);
    expect(relay.controls.proposals).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Connect GeniusWallet" })).toBeInTheDocument();
  });
});

describe("the wrong wallet", () => {
  test("a wallet with no gnus method is refused as not GeniusWallet and its session is ended", async () => {
    const { relay } = await pairing({ profile: "notGenius" });
    act(() => relay.controls.approvePending());
    await tick(0);
    expect(screen.getByRole("heading", { name: "GeniusWallet required" })).toBeInTheDocument();
    expect(screen.getByText("The wallet you connected is not GeniusWallet. Connect GeniusWallet instead.")).toBeInTheDocument();
    expect(relay.controls.disconnects).toHaveLength(1);
    expect(relay.controls.requests).toHaveLength(0);
  });

  test("a wallet with some gnus methods is asked to update, and its session is ended", async () => {
    const { relay } = await pairing({ profile: "oldGenius" });
    act(() => relay.controls.approvePending());
    await tick(0);
    expect(screen.getByRole("heading", { name: "Update GeniusWallet" })).toBeInTheDocument();
    expect(relay.controls.disconnects).toHaveLength(1);
  });

  test("every gnus method without the Amoy chain counts as old", async () => {
    const full = ["gnus_getAccounts", "gnus_estimate", "gnus_submitJob", "gnus_listJobs", "gnus_getJob", "gnus_getEarnings"];
    const namespaces = {
      eip155: {
        chains: ["eip155:1"],
        methods: full,
        events: ["gnus_accountsChanged", "gnus_networkChanged", "gnus_jobUpdated"],
        accounts: ["eip155:1:0xabc"],
      },
    };
    const { relay } = await pairing({ namespaces });
    act(() => relay.controls.approvePending());
    await tick(0);
    expect(screen.getByRole("heading", { name: "Update GeniusWallet" })).toBeInTheDocument();
  });
});

describe("accessibility", () => {
  test("pairing, declined and both refusals have no axe violations", async () => {
    const pair = await pairing({ profile: "decline" });
    await expectNoViolations(pair.container);
    act(() => pair.relay.controls.declinePending("No thanks"));
    await tick(0);
    await expectNoViolations(pair.container);
    pair.unmount();
    const refused = await pairing({ profile: "notGenius" });
    act(() => refused.relay.controls.approvePending());
    await tick(0);
    await expectNoViolations(refused.container);
    refused.unmount();
    const old = await pairing({ profile: "oldGenius" });
    act(() => old.relay.controls.approvePending());
    await tick(0);
    await expectNoViolations(old.container);
  });
});
