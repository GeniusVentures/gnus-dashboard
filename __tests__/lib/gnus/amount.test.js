import { formatAmount } from "../../../lib/gnus/amount";

describe("formatAmount", () => {
  test.each([
    ["9007199254740993", 0, "9007199254740993"],
    ["9007199254740993", 18, "0.009007199254740993"],
    ["1000000000000000000000", 0, "1000000000000000000000"],
    ["1000000000000000000000", 18, "1000"],
    ["1500000000000000000", 18, "1.5"],
    ["1", 18, "0.000000000000000001"],
    ["0", 18, "0"],
    ["007", 0, "7"],
    ["18446744073709551617", 6, "18446744073709.551617"],
  ])("%s with %i decimals is %s", (base, decimals, expected) => {
    expect(formatAmount(base, decimals)).toBe(expected);
  });

  test("null stays null", () => {
    expect(formatAmount(null, 18)).toBeNull();
    expect(formatAmount(null, 0)).toBeNull();
  });

  test.each([["1e21"], ["1.5"], ["-1"], [""]])("rejects the base %p", (base) => {
    expect(() => formatAmount(base, 18)).toThrow(RangeError);
  });

  test.each([[37], [-1], [1.5]])("rejects decimals %p", (decimals) => {
    expect(() => formatAmount("1", decimals)).toThrow(RangeError);
  });
});
