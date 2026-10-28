import React from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import EarningsView from "../../../sub-components/earnings/EarningsView";
import { renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

const NODE = "0x" + "a1".repeat(64);
const earningsCalls = (provider) => provider.controls.calls.filter((c) => c.method === "gnus_getEarnings");

const body = (over = {}) => ({
  sdkAddress: NODE,
  balance: "12" + "0".repeat(18),
  processing: { isProcessing: true, jobsProcessed: null },
  earned: { total: null, history: null },
  ...over,
});

// The real mock for every method but gnus_getEarnings, which answers what the case says.
function answering(answer, profile = "today") {
  const provider = createMockProvider({ profile });
  const request = provider.request;
  provider.request = (args) => (args.method === "gnus_getEarnings" ? Promise.resolve(answer) : request(args));
  return provider;
}

describe("EarningsView", () => {
  it("today: the three null fields read Not available yet with their lines, never 0, and no history table", async () => {
    const { container } = renderWithSession(<EarningsView />, { profile: "today" });
    expect(await screen.findByText("12 GNUS")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByText("For the account that earns: 0xa1a1...a1a1")).toBeInTheDocument();
    expect(screen.getByText("These figures cover this account only, not its child accounts.")).toBeInTheDocument();
    expect(screen.getByText("Held by the node account on the SuperGenius network, not by the wallet that pays.")).toBeInTheDocument();
    expect(screen.getByText("This node is processing jobs.")).toBeInTheDocument();
    expect(screen.getAllByText("Not available yet")).toHaveLength(3);
    expect(screen.getByText("The network doesn't report processed jobs per account yet.")).toBeInTheDocument();
    expect(screen.getByText("The network doesn't report earnings per account yet.")).toBeInTheDocument();
    expect(screen.getByText("Your earnings history shows up here once the network reports it.")).toBeInTheDocument();
    const processed = screen.getByText("Jobs processed").nextElementSibling;
    expect(processed).not.toHaveTextContent(/^0$/);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("populated: counts, earned total and a history row whose job id is text, not a link", async () => {
    const { container } = renderWithSession(<EarningsView />, { profile: "populated" });
    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("Earned in total").nextElementSibling).toHaveTextContent("7 GNUS");
    const table = screen.getByRole("table");
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).getByText("1 GNUS")).toBeInTheDocument();
    expect(within(row).getByText("job-0")).toBeInTheDocument();
    expect(within(row).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Not available yet")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("bigAmounts: shows amounts above 2^53 exactly", async () => {
    renderWithSession(<EarningsView />, { profile: "bigAmounts" });
    expect(await screen.findByText("0.009007199254740993 GNUS")).toBeInTheDocument();
    expect(screen.getByText("18.446744073709551617 GNUS")).toBeInTheDocument();
  });

  it("reads No earnings recorded yet for an empty history, and says when the node is not processing", async () => {
    const provider = answering(body({ processing: { isProcessing: false, jobsProcessed: "0" }, earned: { total: "0", history: [] } }));
    renderWithSession(<EarningsView />, { provider });
    expect(await screen.findByText("No earnings recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("This node is not processing jobs.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Not available yet")).not.toBeInTheDocument();
  });

  it("readsFail: Couldn't load your earnings with the wallet's words and Retry", async () => {
    const { container, store } = renderWithSession(<EarningsView />, { profile: "readsFail" });
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Couldn't load your earnings")).toBeInTheDocument();
    expect(within(alert).getByText("GeniusWallet hit an internal error.")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("methodUnsupported: shows the 4200 message and leaves the session ready", async () => {
    const { store } = renderWithSession(<EarningsView />, { profile: "methodUnsupported" });
    expect(await screen.findByText("Your GeniusWallet does not support this yet. Update GeniusWallet.")).toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
  });

  it("shows Last updated after the first answer, and Refresh sends one more read and is disabled while it runs", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const provider = createMockProvider({ profile: "today" });
    const request = provider.request;
    let held = false;
    provider.request = async (args) => {
      if (args.method === "gnus_getEarnings" && held) {
        await gate;
      }
      return request(args);
    };
    renderWithSession(<EarningsView />, { provider });
    expect(await screen.findByText(/^Last updated /)).toBeInTheDocument();
    expect(earningsCalls(provider)).toHaveLength(1);
    held = true;
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    await act(async () => release());
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    expect(earningsCalls(provider)).toHaveLength(2);
  });

  it("re-reads on a node account switch and shows the new account's short address", async () => {
    const { provider } = renderWithSession(<EarningsView />, { profile: "today" });
    await screen.findByText("For the account that earns: 0xa1a1...a1a1");
    act(() => provider.controls.switchAccount());
    expect(await screen.findByText("For the account that earns: 0xa2a2...a2a2")).toBeInTheDocument();
    await waitFor(() => expect(earningsCalls(provider)).toHaveLength(2));
  });

  it("shows the contract mismatch message when the figures name another account", async () => {
    const provider = answering(body({ sdkAddress: "0x" + "c3".repeat(64) }));
    const { store } = renderWithSession(<EarningsView />, { provider });
    expect(await screen.findByText(/Wallet contract mismatch/)).toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
  });
});
