import React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import EstimatePanel from "../../../sub-components/submit/EstimatePanel";
import JobInput from "../../../sub-components/submit/JobInput";
import { JOB_TEXT, renderWithSubmit } from "../../mocks/submit";

expect.extend(toHaveNoViolations);

const Form = () => (
  <>
    <JobInput />
    <EstimatePanel />
  </>
);

const fakeFile = (text, size = text.length) => ({ name: "job.json", size, type: "application/json", text: jest.fn(() => Promise.resolve(text)) });
const choose = (file) => fireEvent.change(screen.getByLabelText("Choose a file"), { target: { files: [file] } });

describe("JobInput", () => {
  it("puts a chosen file in Job JSON and shows the preview", async () => {
    renderWithSubmit(<Form />, { profile: "today" });
    choose(fakeFile(JOB_TEXT));
    await waitFor(() => expect(screen.getByLabelText("Job JSON")).toHaveValue(JOB_TEXT));
    expect(screen.getByRole("heading", { name: "What will be sent" })).toBeInTheDocument();
    expect(document.querySelector("pre")).toHaveTextContent('"name": "tiny"');
  });

  it("refuses a file over the cap by size, without reading it", async () => {
    renderWithSubmit(<Form />, { profile: "today" });
    await userEvent.type(screen.getByLabelText("Job JSON"), "keep");
    const big = fakeFile("x", 5242881);
    choose(big);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This file is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB.",
    );
    expect(big.text).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Job JSON")).toHaveValue("keep");
  });

  it("shows invalid JSON in an alert tied to the field and keeps Estimate cost disabled", async () => {
    renderWithSubmit(<Form />, { profile: "today" });
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: "{" } });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This is not valid JSON.");
    expect(screen.getByLabelText("Job JSON")).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getByRole("button", { name: "Estimate cost" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "What will be sent" })).not.toBeInTheDocument();
  });

  it("shows the preview as the exact object that is sent, only while the job parses", async () => {
    renderWithSubmit(<Form />, { profile: "today" });
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: JOB_TEXT } });
    expect(document.querySelector("pre").textContent).toBe(JSON.stringify(JSON.parse(JOB_TEXT), null, 2));
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: "[" } });
    expect(document.querySelector("pre")).toBeNull();
  });

  it("fills the field from Load example", async () => {
    renderWithSubmit(<Form />, { profile: "today" });
    await userEvent.click(screen.getByRole("button", { name: "Load example" }));
    expect(screen.getByLabelText("Job JSON").value).toContain("posenet-inference");
  });

  it("has no axe violations with a job loaded or an error shown", async () => {
    const { container } = renderWithSubmit(<Form />, { profile: "today" });
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: JOB_TEXT } });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.change(screen.getByLabelText("Job JSON"), { target: { value: "{" } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
