import React from "react";
import { act, screen, within } from "@testing-library/react";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import JobsView from "../../../sub-components/jobs/JobsView";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import { relayLoader, renderWithSession } from "../../mocks/session";

jest.mock("next/router", () => ({ useRouter: () => ({ isReady: true, query: {}, push: jest.fn() }) }));

const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const calls = (relay, method) => relay.provider.controls.calls.filter((c) => c.method === method).length;
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
const tick = (ms) => act(() => jest.advanceTimersByTimeAsync(ms));
const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await tick(0);
  }
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function pairedJobs(relayOptions = {}) {
  const relay = createFakeRelay({ mockProfile: "jobHistory", ...relayOptions });
  const view = renderWithSession(
    <>
      <IdentityHeader />
      <JobsView />
    </>,
    { provider: null, loadWalletConnect: relayLoader(relay) },
  );
  await tick(3000);
  act(() => relay.controls.approvePending());
  await settle();
  expect(screen.getByRole("table")).toBeInTheDocument();
  return { relay, ...view };
}

describe("events over the session", () => {
  test("a job update changes the row in place with no new gnus_listJobs", async () => {
    const { relay } = await pairedJobs();
    expect(within(rows()[0]).getByText("Submitted to the network")).toBeInTheDocument();
    act(() => relay.provider.controls.advanceJob(hashOf(25), "processing"));
    await settle();
    expect(within(rows()[0]).getByText("Processing")).toBeInTheDocument();
    expect(calls(relay, "gnus_listJobs")).toBe(1);
  });

  test("an account switch empties the old rows and reads again under the new account", async () => {
    const { relay } = await pairedJobs();
    expect(screen.getByText("0xa1a1...a1a1")).toBeInTheDocument();
    act(() => relay.provider.controls.switchAccount());
    await settle();
    expect(screen.getByText("0xa2a2...a2a2")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(calls(relay, "gnus_listJobs")).toBe(2);
  });

  test("a network event updates the label", async () => {
    const { relay } = await pairedJobs();
    act(() => relay.provider.controls.setNetwork({ sdk: "staging", evmChainId: 11155111 }));
    await settle();
    expect(screen.getByText("Network: staging, chain 11155111")).toBeInTheDocument();
  });

  test("identity comes from gnus_getAccounts, not from the account the session lists", async () => {
    const full = ["gnus_getAccounts", "gnus_estimate", "gnus_submitJob", "gnus_listJobs", "gnus_getJob", "gnus_getEarnings"];
    const namespaces = {
      eip155: {
        chains: ["eip155:80002"],
        methods: full,
        events: ["gnus_accountsChanged", "gnus_networkChanged", "gnus_jobUpdated"],
        accounts: [`eip155:80002:0x${"c3".repeat(20)}`],
      },
    };
    await pairedJobs({ namespaces });
    expect(screen.getByText("0xb2b2...b2b2")).toBeInTheDocument();
    expect(screen.queryByText("0xc3c3...c3c3")).not.toBeInTheDocument();
  });

  test("events the wallet's relay dropped are recovered by the read on tab return", async () => {
    const { relay } = await pairedJobs({ profile: "dropEvents" });
    act(() => relay.provider.controls.advanceJob(hashOf(25), "processing"));
    await settle();
    expect(within(rows()[0]).getByText("Submitted to the network")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    await settle();
    expect(calls(relay, "gnus_listJobs")).toBe(2);
    expect(within(rows()[0]).getByText("Processing")).toBeInTheDocument();
  });
});
