import React from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import JobsView from "../../../sub-components/jobs/JobsView";
import { renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

const OTHER_NODE = "0x" + "c3".repeat(64);
const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);

// Wraps one provider so the test can change what gnus_listJobs answers.
function listJobsHook(profile, hook) {
  const provider = createMockProvider({ profile });
  const request = provider.request;
  provider.request = async (args) => {
    if (args.method === "gnus_listJobs") {
      return hook(args, () => request(args));
    }
    return request(args);
  };
  return provider;
}

describe("JobsView", () => {
  it("lists 20 rows newest first with status words, time, cost, origin and a link to the job", async () => {
    const { container } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(rows()).toHaveLength(20);
    const first = within(rows()[0]);
    expect(first.getByRole("link")).toHaveAttribute("href", "/jobs/detail?hash=0x5eed" + "0".repeat(58) + "19");
    expect(first.getByText("3 GNUS")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Submitted" })).toBeInTheDocument();
    expect(screen.getByText("Your jobs, newest first")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "My jobs" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says No jobs yet for an account with no jobs, with a link to submit", async () => {
    const { container } = renderWithSession(<JobsView />, { profile: "today" });
    expect(await screen.findByText("No jobs yet")).toBeInTheDocument();
    expect(screen.getByText("Jobs you submit from this account show up here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Submit a job" })).toHaveAttribute("href", "/submit");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the wallet's message with Retry when the list cannot be read, and the session stays ready", async () => {
    const { container, store } = renderWithSession(<JobsView />, { profile: "readsFail" });
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Couldn't load your jobs")).toBeInTheDocument();
    expect(within(alert).getByText("GeniusWallet hit an internal error.")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
    expect(screen.getByRole("heading", { level: 1, name: "My jobs" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the contract mismatch message when a row belongs to another account", async () => {
    const provider = listJobsHook("jobHistory", async (_args, real) => {
      const page = await real();
      page.jobs[3].sdkAddress = OTHER_NODE;
      return page;
    });
    const { store } = renderWithSession(<JobsView />, { provider });
    expect(await screen.findByText(/Wallet contract mismatch/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(store.getState().phase).toBe("ready");
  });

  it("loads the next page, moves focus to its first row and announces the count", async () => {
    renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Load more jobs" }));
    await waitFor(() => expect(rows()).toHaveLength(25));
    expect(within(rows()[20]).getByRole("link")).toHaveFocus();
    expect(screen.getByText("Showing 25 jobs")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more jobs/i })).not.toBeInTheDocument();
  });

  it("shows Loading more jobs while the next page is read", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const provider = listJobsHook("jobHistory", async (args, real) => {
      if (args.params.cursor) {
        await gate;
      }
      return real();
    });
    renderWithSession(<JobsView />, { provider });
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Load more jobs" }));
    expect(screen.getByRole("button", { name: "Loading more jobs" })).toBeDisabled();
    await act(async () => release());
    await waitFor(() => expect(rows()).toHaveLength(25));
  });

  it("keeps the loaded rows when the next page fails, and Retry reads it again", async () => {
    let fail = true;
    const provider = listJobsHook("jobHistory", async (args, real) => {
      if (args.params.cursor && fail) {
        throw { code: -32603, message: "x" };
      }
      return real();
    });
    renderWithSession(<JobsView />, { provider });
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Load more jobs" }));
    expect(await screen.findByText(/Couldn't load more jobs: GeniusWallet hit an internal error\./)).toBeInTheDocument();
    expect(rows()).toHaveLength(20);
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(rows()).toHaveLength(25));
  });

  it("drops the same job arriving on two pages", async () => {
    const provider = listJobsHook("jobHistory", async (args, real) => {
      const page = await real();
      if (args.params.cursor) {
        const first = await listFirst(provider);
        page.jobs.push(first);
      }
      return page;
    });
    async function listFirst(p) {
      const { jobs } = await p.request({ method: "gnus_getJob", params: { burnTxHash: "0x5eed" + "0".repeat(58) + "19" } }).then((job) => ({ jobs: [job] }));
      const { result: _result, ...job } = jobs[0];
      return job;
    }
    renderWithSession(<JobsView />, { provider });
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: "Load more jobs" }));
    await waitFor(() => expect(rows()).toHaveLength(25));
  });

  it("clears the old rows when the node account switches", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    act(() => provider.controls.switchAccount());
    expect(await screen.findByText("No jobs yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
