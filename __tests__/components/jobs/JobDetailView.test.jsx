import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import JobDetailView from "../../../sub-components/jobs/JobDetailView";
import { SessionProvider } from "../../../sub-components/wallet/SessionProvider";
import { renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

let mockRouter = { isReady: true, query: {} };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));

const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
const NODE = "0xa1".padEnd(2 + 128, "a1").slice(0, 130);
const at = (query, isReady = true) => {
  mockRouter = { isReady, query };
};

// A provider whose gnus_getJob answers what the test says, over the real mock for everything else.
function answering(profile, job) {
  const provider = createMockProvider({ profile });
  const request = provider.request;
  provider.request = (args) => (args.method === "gnus_getJob" ? Promise.resolve(job) : request(args));
  return provider;
}

const detail = (over = {}) => ({
  jobId: "job-1",
  burnTxHash: hashOf(9),
  sdkAddress: "0x" + "a1".repeat(64),
  origin: "http://localhost:3000",
  idempotencyKey: "k-9",
  submittedAt: "2026-10-02T10:00:00.000Z",
  cost: "3" + "0".repeat(18),
  status: "completed",
  result: null,
  ...over,
});

describe("JobDetailView", () => {
  it("shows every field of a job opened by its burn hash", async () => {
    at({ hash: hashOf(3) });
    const { container } = renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    expect(await screen.findByText("Job id pending")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Job detail" })).toBeInTheDocument();
    expect(screen.getByText("The network doesn't return job ids yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy burn transaction hash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy node account address" })).toBeInTheDocument();
    expect(screen.getByText("3 GNUS")).toBeInTheDocument();
    expect(screen.getByText("seed-3")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:3000")).toBeInTheDocument();
    expect(screen.getByText("Result not available yet")).toBeInTheDocument();
    expect(screen.getByText("GeniusWallet can't fetch job results yet. They show up here when it can.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("opens a page-2 job and reads its status badge with the explanation", async () => {
    at({ hash: hashOf(1) });
    renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    expect(await screen.findByText("Submitted to the network")).toBeInTheDocument();
    expect(screen.getByText("The network has the job. GeniusWallet can't report its progress yet.")).toBeInTheDocument();
  });

  it("says No job found for a hash the account does not have", async () => {
    at({ hash: "0x" + "9".repeat(64) });
    renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    expect(await screen.findByText("No job found")).toBeInTheDocument();
    expect(screen.getByText("GeniusWallet has no job with this burn hash for this account.")).toBeInTheDocument();
  });

  it("uses the job id wording for ?id=", async () => {
    at({ id: "job-x" });
    renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    expect(await screen.findByText("GeniusWallet has no job with this job id for this account.")).toBeInTheDocument();
  });

  it("says the link doesn't name a job, with a way back", async () => {
    at({});
    renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    expect(await screen.findByText("This link doesn't name a job.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My jobs" })).toHaveAttribute("href", "/jobs");
    expect(screen.getByRole("heading", { level: 1, name: "Job detail" })).toBeInTheDocument();
  });

  it("shows Not recorded for each null field of a pending record", async () => {
    at({ hash: hashOf(1) });
    const provider = answering("jobHistory", {
      status: "pending",
      jobId: null,
      burnTxHash: null,
      sdkAddress: null,
      origin: null,
      idempotencyKey: "k",
      submittedAt: null,
      cost: null,
      result: null,
    });
    renderWithSession(<JobDetailView />, { provider });
    await screen.findByText("Outcome not recorded");
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/Burn transaction Not recorded/)).toBeInTheDocument();
  });

  it("shows the contract mismatch message when the job belongs to another account", async () => {
    at({ hash: hashOf(9) });
    const provider = answering("jobHistory", detail({ sdkAddress: "0x" + "c3".repeat(64) }));
    const { store } = renderWithSession(<JobDetailView />, { provider });
    expect(await screen.findByText(/Wallet contract mismatch/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Couldn't load this job" })).toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
  });

  it("sends no gnus_getJob before the router is ready, then reads once it is", async () => {
    at({}, false);
    const { provider, store, rerender } = renderWithSession(<JobDetailView />, { profile: "jobHistory" });
    await screen.findByText("Loading this job");
    await waitFor(() => expect(store.getState().phase).toBe("ready"));
    expect(provider.controls.calls.filter((c) => c.method === "gnus_getJob")).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 1, name: "Job detail" })).toBeInTheDocument();
    at({ hash: hashOf(3) });
    rerender(
      <SessionProvider store={store}>
        <JobDetailView />
      </SessionProvider>,
    );
    expect(await screen.findByText("Job id pending")).toBeInTheDocument();
    expect(provider.controls.calls.filter((c) => c.method === "gnus_getJob")).toHaveLength(1);
  });
});

describe("the result block", () => {
  const withResult = (result, extra = {}) => {
    at({ hash: hashOf(9) });
    return renderWithSession(<JobDetailView />, { provider: answering("jobHistory", detail({ result, ...extra })) });
  };

  it("lists each CID with a gateway link and the data as indented JSON", async () => {
    const { container } = withResult({ cids: ["bafyone", "bafytwo"], data: { frames: 2, nested: { ok: true } } });
    await screen.findByRole("heading", { name: "Result" });
    const links = screen.getAllByRole("link", { name: /Open in IPFS gateway/ });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["https://ipfs.io/ipfs/bafyone", "https://ipfs.io/ipfs/bafytwo"]);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByText("bafyone")).toBeInTheDocument();
    expect(document.querySelector("pre").textContent).toBe(JSON.stringify({ frames: 2, nested: { ok: true } }, null, 2));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a CID with a slash as text and no link, and an empty list as No result files", async () => {
    withResult({ cids: ["a/b"] });
    await screen.findByText("a/b");
    expect(screen.queryByRole("link", { name: /IPFS/ })).not.toBeInTheDocument();
  });

  it("reads No result files for an empty list", async () => {
    withResult({ cids: [] });
    expect(await screen.findByText("No result files")).toBeInTheDocument();
  });

  it("renders the error under Error as text and adds no element from a payload", async () => {
    const payload = '<img src=x onerror="window.__gnusXss=1">';
    const { container } = withResult(null, { status: "failed", error: payload });
    expect(await screen.findByRole("heading", { name: "Error" })).toBeInTheDocument();
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(window.__gnusXss).toBeUndefined();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows hostile data and origin as text too", async () => {
    const { container } = withResult(
      { cids: [], data: { note: "<script>window.__gnusXss=1</script>" } },
      { origin: '<img src=x onerror="window.__gnusXss=1">' },
    );
    await screen.findByRole("heading", { name: "Result" });
    expect(container.querySelector("img, script")).toBeNull();
    expect(within(container).getByText('<img src=x onerror="window.__gnusXss=1">')).toBeInTheDocument();
  });
});
