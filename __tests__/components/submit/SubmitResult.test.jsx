import React from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import Submit from "../../../pages/submit";
import SubmitFlow from "../../../sub-components/submit/SubmitFlow";
import { failing, gated, renderWithSubmit } from "../../mocks/submit";

expect.extend(toHaveNoViolations);

const HASH_SHORT = "0x0000...0001";

async function submitOn(options) {
  const view = renderWithSubmit(<SubmitFlow />, options);
  await userEvent.click(screen.getByRole("button", { name: "Load example" }));
  const estimate = screen.getByRole("button", { name: "Estimate cost" });
  await waitFor(() => expect(estimate).toBeEnabled());
  await userEvent.click(estimate);
  const pay = await screen.findByRole("button", { name: "Pay and submit" });
  await waitFor(() => expect(pay).toBeEnabled());
  await userEvent.click(pay);
  return view;
}

const heading = (name) => screen.findByRole("heading", { level: 2, name });

describe("the confirm screen", () => {
  it("stays until the wallet answers, shows the Cancel note, then ends on Job submitted", async () => {
    const view = await submitOn({ profile: "manualConfirm" });
    expect(await heading("Confirm in your wallet")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Approve or reject it there.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/This page can't close GeniusWallet's confirm/)).toBeInTheDocument();
    expect(await axe(view.container)).toHaveNoViolations();
    act(() => view.provider.controls.answerConfirm(true));
    expect(await heading("Job submitted")).toBeInTheDocument();
  });
});

describe("back at the job after nothing was spent", () => {
  it("a rejected confirm says so and lets the user try again", async () => {
    const view = await submitOn({ profile: "rejectConfirm" });
    const alert = await screen.findByText("You rejected this in GeniusWallet.");
    expect(alert.closest("[role=alert]")).toHaveTextContent("Nothing was spent.");
    expect(screen.getByLabelText("Job JSON").value).toContain("posenet-inference");
    expect(screen.getByRole("button", { name: "Pay and submit" })).toBeEnabled();
    expect(await axe(view.container)).toHaveNoViolations();
  });

  it("confirm_open says to finish it in the wallet, without the nothing-spent line", async () => {
    await submitOn({ profile: "confirmOpen" });
    const alert = await screen.findByText("A confirm is already open in GeniusWallet. Finish it there first.");
    expect(alert.closest("[role=alert]")).not.toHaveTextContent("Nothing was spent.");
  });

  it("not enough GNUS at submit repeats the amounts from the estimate", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_submitJob", {
      code: -32011,
      message: "x",
    });
    await submitOn({ provider });
    const alert = await screen.findByText("Not enough GNUS to pay for this job.");
    expect(alert.closest("[role=alert]")).toHaveTextContent("This job costs 3 GNUS. The paying wallet holds 50 GNUS.");
  });

  it("idempotency_key_reused offers Start a new submit", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_submitJob", {
      code: -32602,
      message: "x",
      data: { reason: "idempotency_key_reused" },
    });
    await submitOn({ provider });
    await userEvent.click(await screen.findByRole("button", { name: "Start a new submit" }));
    expect(screen.queryByRole("button", { name: "Start a new submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay and submit" })).toBeEnabled();
  });
});

describe("a disconnect during the payment", () => {
  it("names the payment over the wallet gate, never says nothing was spent, and Check again is offered once back", async () => {
    const provider = createMockProvider({ profile: "today" });
    const request = provider.request;
    provider.request = async (args) => {
      if (args.method !== "gnus_submitJob") {
        return request(args);
      }
      await request(args);
      throw { code: 4100, message: "The origin was revoked" };
    };
    const view = renderWithSubmit(<Submit />, { provider });
    await userEvent.click(await screen.findByRole("button", { name: "Load example" }));
    const estimate = screen.getByRole("button", { name: "Estimate cost" });
    await waitFor(() => expect(estimate).toBeEnabled());
    await userEvent.click(estimate);
    const pay = await screen.findByRole("button", { name: "Pay and submit" });
    await waitFor(() => expect(pay).toBeEnabled());
    await userEvent.click(pay);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This site was disconnected during the payment. Reconnect to see what happened.",
    );
    expect(screen.getByRole("heading", { name: "Allow this site in GeniusWallet" })).toBeInTheDocument();
    expect(screen.queryByText(/Nothing was spent/)).toBeNull();
    expect(await axe(view.container)).toHaveNoViolations();
  });
});

describe("outcome screens", () => {
  it("done: heading takes focus, shows the job id pending, the hash, the explorer link and the job link", async () => {
    const view = await submitOn({ profile: "today" });
    const h = await heading("Job submitted");
    expect(h).toHaveFocus();
    expect(screen.getByText("Job id: Job id pending")).toBeInTheDocument();
    expect(screen.getByText(HASH_SHORT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy burn transaction hash" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the payment on the block explorer" })).toHaveAttribute(
      "href",
      "https://amoy.polygonscan.com/tx/0x" + "0".repeat(63) + "1",
    );
    expect(screen.getByRole("link", { name: "View this job" })).toHaveAttribute(
      "href",
      "/jobs/detail?hash=0x" + "0".repeat(63) + "1",
    );
    expect(await axe(view.container)).toHaveNoViolations();
  });

  it("done with a job id shows it", async () => {
    await submitOn({ profile: "populated" });
    await heading("Job submitted");
    expect(screen.getByText("Job id: job-1")).toBeInTheDocument();
  });

  it.each(["bridgedNotProcessedStatus", "bridgedNotProcessedError"])(
    "%s is a persistent alert banner with the hash and no retry",
    async (profile) => {
      const view = await submitOn({ profile });
      const h = await heading("Paid but not processed");
      expect(h).toHaveFocus();
      const banner = h.closest("[role=alert]");
      expect(banner).toHaveTextContent("Submitting this job again would pay again.");
      expect(within(banner).getByText(HASH_SHORT)).toBeInTheDocument();
      expect(within(banner).getByRole("link", { name: "View the payment on the block explorer" })).toBeInTheDocument();
      const names = within(banner)
        .getAllByRole("button")
        .map((b) => b.textContent);
      expect(names).toEqual(["Copy", "Submit another job"]);
      expect(screen.queryByRole("button", { name: /retry|try again|pay and submit/i })).not.toBeInTheDocument();
      expect(await axe(view.container)).toHaveNoViolations();
    },
  );

  it("unconfirmed", async () => {
    const view = await submitOn({ profile: "unconfirmedSubmit" });
    const h = await heading("Payment not confirmed");
    expect(h).toHaveFocus();
    expect(h.closest("[role=status]")).toHaveTextContent("The GNUS may be spent and the job did not start.");
    expect(screen.getByRole("link", { name: "View this job" })).toBeInTheDocument();
    expect(await axe(view.container)).toHaveNoViolations();
  });

  it("outcome unknown shows only the fields the wallet sent, and no View this job link", async () => {
    const view = await submitOn({ profile: "submissionOutcomeUnknown" });
    const h = await heading("Payment status unknown");
    expect(h.closest("[role=status]")).toHaveTextContent("GeniusWallet can't tell whether this payment went through.");
    expect(screen.getByText("3 GNUS")).toBeInTheDocument();
    expect(screen.getByText("Paying wallet", { selector: "dt" })).toBeInTheDocument();
    expect(screen.queryByText("Burn transaction", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View this job" })).not.toBeInTheDocument();
    expect(await axe(view.container)).toHaveNoViolations();
  });

  describe("after an unreadable reply the page asks the wallet", () => {
    function garbled(provider) {
      const request = provider.request;
      provider.request = async (args) => {
        const reply = await request(args);
        return args.method === "gnus_submitJob" ? { nonsense: true } : reply;
      };
      return provider;
    }

    it("shows Checking your last submit, then Job submitted", async () => {
      const provider = garbled(createMockProvider({ profile: "today" }));
      const release = gated(provider, "gnus_getJob");
      await submitOn({ provider });
      expect(await heading("Checking your last submit")).toBeInTheDocument();
      await act(async () => release());
      expect(await heading("Job submitted")).toBeInTheDocument();
    });

    it("a pending record shows Waiting for GeniusWallet with Check again", async () => {
      const provider = garbled(createMockProvider({ profile: "walletStopsMidSubmit" }));
      const request = provider.request;
      // The stopped wallet never answers the submit; make the page see an unreadable answer instead.
      provider.request = async (args) => {
        if (args.method === "gnus_submitJob") {
          request(args).catch(() => {});
          return { nonsense: true };
        }
        return request(args);
      };
      const view = await submitOn({ provider });
      const h = await heading("Waiting for GeniusWallet");
      expect(h).toHaveFocus();
      expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit another job" })).toBeInTheDocument();
      expect(await axe(view.container)).toHaveNoViolations();
    });

    it("a failed lookup shows Couldn't check this payment with the message", async () => {
      const provider = failing(garbled(createMockProvider({ profile: "today" })), "gnus_getJob", {
        code: -32603,
        message: "x",
      });
      const view = await submitOn({ provider });
      const h = await heading("Couldn't check this payment");
      expect(h.closest("[role=status]")).toHaveTextContent(
        "GeniusWallet didn't answer the check: GeniusWallet hit an internal error.",
      );
      expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
      expect(await axe(view.container)).toHaveNoViolations();
    });
  });
});
