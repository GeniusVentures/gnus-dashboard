import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import JobsView from "../../../sub-components/jobs/JobsView";
import { renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();
jest.mock("next/router", () => ({ useRouter: () => ({ isReady: true, query: {}, push: mockPush }) }));

beforeEach(() => mockPush.mockClear());

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

describe("search", () => {
  const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;
  const field = () => screen.getByLabelText("Search by job id or burn hash");
  const type = (value) => fireEvent.change(field(), { target: { value } });
  const submit = () => fireEvent.submit(screen.getByRole("search"));

  it("filters the loaded rows as the user types, and says when none match", async () => {
    const { container } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    type("0019");
    expect(rows()).toHaveLength(1);
    expect(await axe(container)).toHaveNoViolations();
    type("zzzz");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("No loaded job matches.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    type("");
    expect(rows()).toHaveLength(20);
  });

  it("sends no wallet call while typing", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    const before = provider.controls.calls.length;
    type("0");
    type("00");
    type("0019");
    expect(provider.controls.calls).toHaveLength(before);
  });

  it("opens the one loaded match on submit", async () => {
    renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    type("0019");
    submit();
    expect(mockPush).toHaveBeenCalledWith(`/jobs/detail?hash=${hashOf(25)}`);
  });

  it("opens a whole burn hash that is not loaded, and a job id", async () => {
    renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    type(hashOf(2).toUpperCase().replace("0X", "0x"));
    submit();
    expect(mockPush).toHaveBeenLastCalledWith(`/jobs/detail?hash=${hashOf(2)}`);
    type("job-x");
    submit();
    expect(mockPush).toHaveBeenLastCalledWith("/jobs/detail?id=job-x");
  });

  it("asks for the whole hash when a 0x string stops short, and pushes nothing", async () => {
    renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    type("0x12");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the whole burn hash (0x and 64 characters) to look it up.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does nothing for a blank search", async () => {
    renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    submit();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("starts empty after a node account switch, with no old row", async () => {
    const { provider } = renderWithSession(<JobsView />, { profile: "jobHistory" });
    await screen.findByRole("table");
    type("0019");
    act(() => provider.controls.switchAccount());
    expect(await screen.findByText("No jobs yet")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("0019")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

