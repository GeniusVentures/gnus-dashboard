import { copyText } from "../../lib/copyText";

const setClipboard = (value) => Object.defineProperty(navigator, "clipboard", { value, configurable: true });

afterEach(() => {
  setClipboard(undefined);
  delete document.execCommand;
});

describe("copyText", () => {
  test("uses the Clipboard API when present", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    document.execCommand = jest.fn();
    await expect(copyText("0xabc")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("0xabc");
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  test("without it, copies through a hidden textarea and removes it", async () => {
    let copied = null;
    document.execCommand = jest.fn((command) => {
      copied = document.querySelector("textarea").value;
      return command === "copy";
    });
    await expect(copyText("0xabc")).resolves.toBe(true);
    expect(copied).toBe("0xabc");
    expect(document.querySelector("textarea")).toBeNull();
  });

  test("a refused Clipboard API falls back to execCommand", async () => {
    setClipboard({ writeText: jest.fn().mockRejectedValue(new Error("denied")) });
    document.execCommand = jest.fn(() => true);
    await expect(copyText("x")).resolves.toBe(true);
  });

  test("false when both paths fail, with the textarea still removed", async () => {
    document.execCommand = jest.fn(() => false);
    await expect(copyText("x")).resolves.toBe(false);
    document.execCommand = jest.fn(() => {
      throw new Error("nope");
    });
    await expect(copyText("x")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});
