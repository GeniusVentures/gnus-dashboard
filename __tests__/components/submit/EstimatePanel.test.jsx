import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import EstimatePanel from "../../../sub-components/submit/EstimatePanel";
import JobInput from "../../../sub-components/submit/JobInput";
import SubmitPanel from "../../../sub-components/submit/SubmitPanel";
import { JOB_TEXT, failing, gated, renderWithSubmit } from "../../mocks/submit";

expect.extend(toHaveNoViolations);

const Form = () => (
  <>
    <JobInput />
    <EstimatePanel />
    <SubmitPanel />
  </>
);

async function estimateWith(options) {
  const view = renderWithSubmit(<Form />, options);
  fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: JOB_TEXT } });
  const button = screen.getByRole("button", { name: "Estimate cost" });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  return view;
}

const pay = () => screen.getByRole("button", { name: "Pay and submit" });

describe("EstimatePanel", () => {
  it("shows the loading line and a disabled button while the wallet answers", async () => {
    const provider = createMockProvider({ profile: "today" });
    const release = gated(provider, "gnus_estimate");
    renderWithSubmit(<Form />, { provider });
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: JOB_TEXT } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Estimate cost" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Estimate cost" }));
    expect(screen.getByText("Asking GeniusWallet for the price...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estimate cost" })).toBeDisabled();
    release();
    expect(await screen.findByText("3 GNUS")).toBeInTheDocument();
  });

  it("shows cost, balance and gas in the wallet's unit and enables Pay and submit", async () => {
    const { container } = await estimateWith({ profile: "today" });
    expect(await screen.findByText("3 GNUS")).toBeInTheDocument();
    expect(screen.getByText("50 GNUS")).toBeInTheDocument();
    expect(screen.getByText("30.5 gwei (POL)")).toBeInTheDocument();
    expect(screen.getByText("GeniusWallet shows the final amount when you confirm.")).toBeInTheDocument();
    expect(pay()).toBeEnabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("costUnavailable says Price unavailable and keeps Pay and submit off", async () => {
    const { container } = await estimateWith({ profile: "costUnavailable" });
    expect(await screen.findByText("Price unavailable")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("GeniusWallet couldn't get a price for this job.");
    expect(pay()).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("adds the wallet's reason as text", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", {
      code: -32010,
      message: "Cost unavailable",
      data: { reason: "<b>ca_bundle</b>" },
    });
    await estimateWith({ provider });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Reason: <b>ca_bundle</b>");
    expect(alert.querySelector("b")).toBeNull();
  });

  it("insufficientBalance shows both amounts and keeps Pay and submit off", async () => {
    const { container } = await estimateWith({ profile: "insufficientBalance" });
    expect(await screen.findByText("Not enough GNUS")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("This job costs 3 GNUS. The paying wallet holds 1 GNUS.");
    expect(pay()).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("allNulls reads Gas not estimated and Balance not available, and names the missing paying wallet", async () => {
    await estimateWith({ profile: "allNulls" });
    expect(await screen.findByText("Gas not estimated")).toBeInTheDocument();
    expect(screen.getByText("Balance not available")).toBeInTheDocument();
    expect(pay()).toBeDisabled();
    expect(screen.getByText("There is no paying wallet in GeniusWallet. Add one first.")).toBeInTheDocument();
  });

  it("bridgeUnavailable shows the switch-network message", async () => {
    await estimateWith({ profile: "bridgeUnavailable" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Not available on this network. Switch the network in GeniusWallet.",
    );
    expect(pay()).toBeDisabled();
  });

  it("shows errors.ts's message and the wallet's text for -32602", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", {
      code: -32602,
      message: "inputs[0].type is required",
    });
    await estimateWith({ provider });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "GeniusWallet rejected the request. Check the job and try again. inputs[0].type is required",
    );
    expect(screen.getByRole("button", { name: "Estimate cost" })).toBeEnabled();
  });

  it("says the job changed after an edit and hides the amounts", async () => {
    const { container } = await estimateWith({ profile: "today" });
    await screen.findByText("3 GNUS");
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: JOB_TEXT + " " } });
    expect(screen.getByText("The job changed. Estimate again before you submit.")).toBeInTheDocument();
    expect(screen.queryByText("3 GNUS")).not.toBeInTheDocument();
    expect(pay()).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });
});
