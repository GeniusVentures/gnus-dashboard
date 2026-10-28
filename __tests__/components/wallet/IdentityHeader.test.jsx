import React from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import IdentityHeader from "../../../sub-components/wallet/IdentityHeader";
import { renderWithSession } from "../../mocks/session";

expect.extend(toHaveNoViolations);

const SDK = "0x" + "a1".repeat(64);
const EVM = "0x" + "b2".repeat(20);
const setClipboard = (value) => Object.defineProperty(navigator, "clipboard", { value, configurable: true });

afterEach(() => {
  setClipboard(undefined);
  delete document.execCommand;
  jest.useRealTimers();
});

async function connected(options) {
  const view = renderWithSession(<IdentityHeader />, options);
  await screen.findByText("Network: staging, chain 80002");
  return view;
}

describe("IdentityHeader copy buttons", () => {
  test("each button copies the full address, not the short text", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await connected();
    await userEvent.click(screen.getByRole("button", { name: "Copy earning address" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy paying address" }));
    expect(writeText).toHaveBeenNthCalledWith(1, SDK);
    expect(writeText).toHaveBeenNthCalledWith(2, EVM);
    expect(SDK).toHaveLength(130);
    expect(EVM).toHaveLength(42);
  });

  test("Copied shows in a polite live region and is gone after 2 s", async () => {
    setClipboard({ writeText: jest.fn().mockResolvedValue(undefined) });
    await connected();
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Copy earning address" }));
    const note = await screen.findByText("Copied");
    expect(note).toHaveAttribute("aria-live", "polite");
    act(() => jest.advanceTimersByTime(1700));
    expect(screen.getByText("Copied")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(400));
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  test("without the Clipboard API it falls back to execCommand", async () => {
    document.execCommand = jest.fn(() => true);
    await connected();
    await userEvent.click(screen.getByRole("button", { name: "Copy paying address" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  test("when copying fails it says so and shows the full address selected", async () => {
    document.execCommand = jest.fn(() => false);
    await connected();
    await userEvent.click(screen.getByRole("button", { name: "Copy earning address" }));
    expect(await screen.findByText("Copy failed. Select the address to copy it.")).toBeInTheDocument();
    const field = screen.getByDisplayValue(SDK);
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(SDK.length);
  });

  test("a null payer reads No paying wallet and has no copy button; axe is clean", async () => {
    const { container } = await connected({ profile: "allNulls" });
    expect(screen.getByText("No paying wallet", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy paying address" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy earning address" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("a connected header passes axe and shows the short forms", async () => {
    const { container } = await connected();
    expect(screen.getByText("0xa1a1...a1a1")).toBeInTheDocument();
    expect(screen.getByText("0xb2b2...b2b2")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  test("before ready it says Not connected", () => {
    renderWithSession(<IdentityHeader />, { provider: null });
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });
});
