import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { GnusContractMismatchError, GnusError } from "../../../lib/gnus/errors";
import { INITIAL_STATE } from "../../../lib/session/machine";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { SessionProvider } from "../../../sub-components/wallet/SessionProvider";
import WalletGate from "../../../sub-components/wallet/WalletGate";

expect.extend(toHaveNoViolations);

function fakeStore(state) {
  return {
    getState: () => state,
    subscribe: () => () => {},
    start: jest.fn(),
    retry: jest.fn(),
    connectAgain: jest.fn(),
    tryNow: jest.fn(),
    report: jest.fn(),
    dispose: jest.fn(),
  };
}

function show(state) {
  const store = fakeStore(state);
  const view = render(
    <SessionProvider store={store}>
      <WalletGate>
        <p>page content</p>
      </WalletGate>
    </SessionProvider>,
  );
  return { store, ...view };
}

const phase = (name, extra = {}) => ({ ...INITIAL_STATE, phase: name, ...extra });
const GET = "Get GeniusWallet";

const CASES = [
  ["detecting", phase("detecting"), "Looking for GeniusWallet", "This takes a few seconds.", null],
  [
    "connecting",
    phase("connecting"),
    "Confirm in your wallet",
    "GeniusWallet is asking whether this site may connect. Approve it there to continue.",
    null,
  ],
  [
    "startingUp",
    phase("startingUp", { error: new GnusError(4900) }),
    "GeniusWallet is starting up",
    "This page connects as soon as GeniusWallet is ready.",
    "Try now",
  ],
  [
    "denied declined",
    phase("denied", { cause: "declined", error: new GnusError(4001) }),
    "Allow this site in GeniusWallet",
    "You declined the connection. This site needs it to show your account and submit jobs.",
    "Connect again",
  ],
  [
    "denied notAllowed",
    phase("denied", { cause: "notAllowed", error: new GnusError(4100) }),
    "Allow this site in GeniusWallet",
    "GeniusWallet hasn't allowed this site.",
    "Connect again",
  ],
  [
    "walletOld",
    phase("unsupported", { cause: "walletOld", error: new GnusError(4200) }),
    "Update GeniusWallet",
    "This GeniusWallet does not support this page. Update it, then open the page again.",
    null,
  ],
  [
    "pageOld",
    phase("unsupported", { cause: "pageOld", error: new GnusContractMismatchError("gnus_getAccounts", "2") }),
    "This page needs an update",
    "Your GeniusWallet uses contract version 2; this page supports version 1. Try again later.",
    null,
  ],
  [
    "noWallet",
    phase("noWallet"),
    "GeniusWallet required",
    "This dashboard pays for jobs and shows your earnings through GeniusWallet. Open this page from GeniusWallet.",
    null,
  ],
  [
    "notResponding noReply",
    phase("notResponding", { cause: "noReply" }),
    "GeniusWallet isn't responding",
    "GeniusWallet hasn't answered for 15 seconds. If it is asking you to allow this site, approve it there.",
    "Retry",
  ],
  [
    "notResponding disconnected",
    phase("notResponding", { cause: "disconnected" }),
    "GeniusWallet isn't responding",
    "GeniusWallet closed its connection to this page.",
    "Retry",
  ],
  [
    "notResponding noBridge",
    phase("notResponding", { cause: "noBridge" }),
    "GeniusWallet isn't responding",
    "GeniusWallet opened this page but has not connected to it yet.",
    "Reload page",
  ],
  [
    "failed",
    phase("failed", { error: new GnusError(-32603) }),
    "GeniusWallet couldn't connect",
    "GeniusWallet hit an internal error.",
    "Retry",
  ],
];

describe("WalletGate banners", () => {
  let accounts;
  beforeAll(async () => {
    accounts = await createMockProvider().request({ method: "gnus_getAccounts" });
  });
  const on = (network, name = "ready") => phase(name, { accounts: { ...accounts, network } });

  test("switching shows its banner over the children, not a full screen", async () => {
    const { container } = show(on({ sdk: "staging", evmChainId: 80002 }, "switching"));
    expect(screen.getByText("Switching account")).toBeInTheDocument();
    expect(screen.getByText("Submitting is paused until GeniusWallet finishes switching.")).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("a different SDK network shows both networks; null reads not set", async () => {
    const { container, unmount } = show(on({ sdk: "mainnet", evmChainId: 1 }));
    expect(screen.getByText("Wrong network")).toBeInTheDocument();
    expect(
      screen.getByText("GeniusWallet is on mainnet. This dashboard works on staging. Switch the network in GeniusWallet."),
    ).toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    show(on({ sdk: null, evmChainId: null }));
    expect(
      screen.getByText("GeniusWallet is on not set. This dashboard works on staging. Switch the network in GeniusWallet."),
    ).toBeInTheDocument();
  });

  test.each([80002, 97, 11155111, 1, null])("staging on EVM chain %s shows no banner", (evmChainId) => {
    show(on({ sdk: "staging", evmChainId }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});

describe("WalletGate screens", () => {
  test.each(CASES)("%s", async (_name, state, heading, body, action) => {
    const { container } = show(state);
    const region = screen.getByRole("status");
    expect(within(region).getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(within(region).getByText(body)).toBeInTheDocument();
    expect(within(region).queryAllByRole("button")).toHaveLength(action ? 1 : 0);
    if (action) {
      expect(within(region).getByRole("button", { name: action })).toBeInTheDocument();
    }
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("a mismatch with the same version shows the mismatch message as the body", () => {
    const error = new GnusContractMismatchError("gnus_getAccounts", "1");
    show(phase("unsupported", { cause: "walletOld", error }));
    expect(screen.getByText(error.message)).toBeInTheDocument();
    expect(error.message).toContain("Wallet contract mismatch");
  });

  test("the update and get-wallet links go to gnus.ai in a new tab", () => {
    show(phase("unsupported", { cause: "walletOld", error: new GnusError(4200) }));
    const link = screen.getByRole("link", { name: "Get the latest GeniusWallet" });
    expect(link).toHaveAttribute("href", "https://gnus.ai/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("no wallet offers a Get GeniusWallet link and no button", () => {
    show(phase("noWallet"));
    expect(screen.getByRole("link", { name: GET })).toHaveAttribute("href", "https://gnus.ai/");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("a rate-limited Connect again shows the table message under the heading", () => {
    const error = new GnusError(-32005, { reason: "rate_limited" });
    show(phase("denied", { cause: "declined", error }));
    expect(screen.getByText("Too many requests. Wait a moment, then try again.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Allow this site in GeniusWallet" })).toBeInTheDocument();
  });

  test.each([
    ["Connect again", phase("denied", { cause: "declined" }), "connectAgain"],
    ["Try now", phase("startingUp"), "tryNow"],
    ["Retry", phase("failed", { error: new GnusError(-32603) }), "retry"],
    ["Retry", phase("notResponding", { cause: "disconnected" }), "retry"],
  ])("%s calls the store", async (label, state, method) => {
    const { store } = show(state);
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(store[method]).toHaveBeenCalledTimes(1);
  });

  test("ready renders the page", () => {
    show(phase("ready"));
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("a spinner only sits next to text and is hidden from the accessibility tree", () => {
    const { container } = show(phase("connecting"));
    const spinner = container.querySelector(".spinner-border");
    expect(spinner).toHaveAttribute("aria-hidden", "true");
    expect(spinner.parentElement).toHaveTextContent("Approve it there to continue.");
  });
});
