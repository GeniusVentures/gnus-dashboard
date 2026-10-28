import React from "react";
import { render, screen } from "@testing-library/react";
import Amount from "../../sub-components/shared/Amount";

describe("Amount", () => {
  test("null never formats to 0", () => {
    const { container } = render(<Amount value={null} decimals={18} />);
    const text = container.textContent;
    expect(text).not.toBe("0");
    expect(text).not.toMatch(/\d/);
    expect(text).toBe("Not available yet");
  });

  test("the caller can word the null state", () => {
    render(<Amount value={null} decimals={18} unavailable="Gas not estimated" />);
    expect(screen.getByText("Gas not estimated")).toBeInTheDocument();
  });

  test("a value renders formatted with its symbol", () => {
    render(<Amount value="1500000000000000000" decimals={18} symbol="GNUS" />);
    expect(screen.getByText("1.5 GNUS")).toBeInTheDocument();
  });

  test("a value above 2^53 renders exactly", () => {
    render(<Amount value="9007199254740993" decimals={0} />);
    expect(screen.getByText("9007199254740993")).toBeInTheDocument();
  });
});
