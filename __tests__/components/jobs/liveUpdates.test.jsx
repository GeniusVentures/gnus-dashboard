import React from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import JobDetailView from "../../../sub-components/jobs/JobDetailView";
import JobsView from "../../../sub-components/jobs/JobsView";
import { renderWithSession } from "../../mocks/session";

let mockRouter = { isReady: true, query: {}, push: jest.fn() };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));

const NODE = "0x" + "a1".repeat(64);
const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const calls = (provider, method) => provider.controls.calls.filter((c) => c.method === method).length;
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

const payload = (over = {}) => ({
  jobId: null,
  burnTxHash: "0x" + "9".repeat(64),
  sdkAddress: NODE,
  origin: "http://localhost:3000",
  idempotencyKey: "live-1",
  submittedAt: "2026-10-03T10:00:00.000Z",
  cost: "3" + "0".repeat(18),
  status: "submitted",
  ...over,
});

// A mock whose gnus_listJobs answers only final jobs, to prove the slow poll stays off.
function onlyFinal() {
  const provider = createMockProvider({ profile: "jobHistory" });
  const request = provider.request;
  provider.request = async (args) => {
    if (args.method === "gnus_listJobs") {
      const page = await request(args);
      return { jobs: page.jobs.slice(0, 3).map((job) => ({ ...job, status: "completed" })), nextCursor: null };
    }
    return request(args);
  };
  return provider;
}

beforeEach(() => {
  mockRouter = { isReady: true, query: {}, push: jest.fn() };
});

describe("live updates on the list", () => {
  it("changes the row's badge in place, without reading the list again", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    expect(within(rows()[0]).getByText("Submitted to the network")).toBeInTheDocument();
    act(() => provider.controls.advanceJob(hashOf(25), "processing"));
    expect(await within(rows()[0]).findByText("Processing")).toBeInTheDocument();
    expect(calls(provider, "gnus_listJobs")).toBe(1);
  });

  it("reads the list again for a job it does not hold", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    act(() => provider.controls.emit("gnus_jobUpdated", payload()));
    await waitFor(() => expect(calls(provider, "gnus_listJobs")).toBe(2));
  });

  it("ignores an event for another account", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    act(() =>
      provider.controls.emit("gnus_jobUpdated", payload({ sdkAddress: "0x" + "c3".repeat(64), burnTxHash: hashOf(25) })),
    );
    await act(async () => {});
    expect(calls(provider, "gnus_listJobs")).toBe(1);
    expect(within(rows()[0]).getByText("Submitted to the network")).toBeInTheDocument();
  });

  it("reads the list again when an event does not parse", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    act(() => provider.controls.emit("gnus_jobUpdated", { nonsense: true }));
    await waitFor(() => expect(calls(provider, "gnus_listJobs")).toBe(2));
  });

  it("removes its listener on unmount", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const removed = [];
    const remove = provider.removeListener;
    provider.removeListener = (event, listener) => {
      removed.push(event);
      return remove(event, listener);
    };
    const { unmount } = renderWithSession(<JobsView />, { provider });
    await screen.findByRole("table");
    unmount();
    expect(removed).toContain("gnus_jobUpdated");
  });

  it("reads the list again when the tab becomes visible", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(calls(provider, "gnus_listJobs")).toBe(2));
  });
});

describe("live updates on the detail", () => {
  it("updates the badge and reads the job again for its result when it completes", async () => {
    mockRouter = { isReady: true, query: { hash: hashOf(25) }, push: jest.fn() };
    const { provider } = renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    await screen.findByText("Submitted to the network");
    expect(calls(provider, "gnus_getJob")).toBe(1);
    act(() => provider.controls.advanceJob(hashOf(25), "completed"));
    expect(await screen.findByText("Completed")).toBeInTheDocument();
    await waitFor(() => expect(calls(provider, "gnus_getJob")).toBe(2));
  });

  it("moves to a non-final status without a re-read", async () => {
    mockRouter = { isReady: true, query: { hash: hashOf(25) }, push: jest.fn() };
    const { provider } = renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    await screen.findByText("Submitted to the network");
    act(() => provider.controls.advanceJob(hashOf(25), "processing"));
    expect(await screen.findByText("Processing")).toBeInTheDocument();
    await act(async () => {});
    expect(calls(provider, "gnus_getJob")).toBe(1);
  });
});

describe("the slow poll", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const tick = (ms) => act(async () => jest.advanceTimersByTimeAsync(ms));
  // Replies reach React through timers, so fake time has to move for the first answer to render.
  async function loaded(isShown) {
    for (let i = 0; i < 40 && !isShown(); i += 1) {
      await tick(250);
    }
    expect(isShown()).toBe(true);
  }
  const showsTable = () => screen.queryByRole("table") !== null;
  const showsBadge = () => screen.queryByText("Submitted to the network") !== null;

  it("reads the list every 30 s while a job on screen can still change", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await loaded(showsTable);
    const base = calls(provider, "gnus_listJobs");
    await tick(31000);
    expect(calls(provider, "gnus_listJobs")).toBe(base + 1);
    await tick(30000);
    expect(calls(provider, "gnus_listJobs")).toBe(base + 2);
  });

  it("does not poll the list when every job is final", async () => {
    const provider = onlyFinal();
    renderWithSession(<JobsView />, { provider });
    await loaded(showsTable);
    const base = calls(provider, "gnus_listJobs");
    await tick(90000);
    expect(calls(provider, "gnus_listJobs")).toBe(base);
  });

  it("polls an open detail while it can change, and stops once it is final", async () => {
    mockRouter = { isReady: true, query: { hash: hashOf(25) }, push: jest.fn() };
    const { provider } = renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    await loaded(showsBadge);
    const base = calls(provider, "gnus_getJob");
    await tick(31000);
    expect(calls(provider, "gnus_getJob")).toBe(base + 1);
    act(() => provider.controls.advanceJob(hashOf(25), "failed"));
    await tick(1000);
    const after = calls(provider, "gnus_getJob");
    await tick(90000);
    expect(calls(provider, "gnus_getJob")).toBe(after);
  });
});
