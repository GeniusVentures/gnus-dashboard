import { GnusContractMismatchError, GnusError } from "../../../lib/gnus/errors";
import { INITIAL_STATE, reduce } from "../../../lib/session/machine";
import { createMockProvider } from "../../../lib/gnus/mock/provider";

let accounts;
beforeAll(async () => {
  accounts = await createMockProvider().request({ method: "gnus_getAccounts" });
});

const ready = () => ({ phase: "ready", cause: null, accounts, error: null });
const failedWith = (state, error, type = "connectFailed") => reduce(state, { type, error, source: "query" });
const reason = (code, why) => new GnusError(code, { reason: why });

describe("connect-time transitions", () => {
  test("4001 is denied/declined, 4100 is denied/notAllowed", () => {
    const declined = reduce({ ...INITIAL_STATE, phase: "connecting" }, { type: "connectFailed", error: new GnusError(4001) });
    expect(declined).toMatchObject({ phase: "denied", cause: "declined", accounts: null });
    const notAllowed = reduce(declined, { type: "connectFailed", error: new GnusError(4100) });
    expect(notAllowed).toMatchObject({ phase: "denied", cause: "notAllowed" });
  });

  test("connectAgain goes to connecting and keeps the cause", () => {
    const denied = reduce(INITIAL_STATE, { type: "connectFailed", error: new GnusError(4001) });
    expect(reduce(denied, { type: "connectAgain" })).toMatchObject({ phase: "connecting", cause: "declined" });
  });

  test("confirm_open from ready gives connecting", () => {
    const next = failedWith(ready(), reason(-32005, "confirm_open"), "errorReported");
    expect(next.phase).toBe("connecting");
    expect(next.accounts).toBeNull();
  });

  test("rate_limited on Connect again stays denied with the error", () => {
    const denied = reduce(INITIAL_STATE, { type: "connectFailed", error: new GnusError(4001) });
    const again = reduce(denied, { type: "connectAgain" });
    const limited = reason(-32005, "rate_limited");
    const next = reduce(again, { type: "connectFailed", error: limited });
    expect(next).toMatchObject({ phase: "denied", cause: "declined", error: limited });
    expect(reduce(denied, { type: "errorReported", error: limited, source: "query" }).phase).toBe("denied");
  });

  test("rate_limited anywhere else is not a denial", () => {
    const limited = reason(-32005, "rate_limited");
    expect(reduce(INITIAL_STATE, { type: "connectFailed", error: limited }).phase).toBe("failed");
    expect(failedWith(ready(), limited, "errorReported")).toEqual(ready());
  });

  test("4900 is startingUp", () => {
    expect(reduce(INITIAL_STATE, { type: "connectFailed", error: new GnusError(4900) })).toMatchObject({
      phase: "startingUp",
    });
  });

  test.each([
    ["4200", new GnusError(4200), "walletOld"],
    ["a mismatch with version 1", new GnusContractMismatchError("gnus_getAccounts", "1"), "walletOld"],
    ["a mismatch with version 2", new GnusContractMismatchError("gnus_getAccounts", "2"), "pageOld"],
    ["a mismatch with version 10", new GnusContractMismatchError("gnus_getAccounts", "10"), "pageOld"],
    ["a mismatch with version 0", new GnusContractMismatchError("gnus_getAccounts", "0"), "walletOld"],
    ["a mismatch with no version", new GnusContractMismatchError("gnus_getAccounts", null), "walletOld"],
    ["a mismatch with a word", new GnusContractMismatchError("gnus_getAccounts", "two"), "walletOld"],
  ])("%s on connect is unsupported/%s", (_name, error, cause) => {
    const next = reduce(INITIAL_STATE, { type: "connectFailed", error });
    expect(next).toMatchObject({ phase: "unsupported", cause, error });
  });

  test("a mismatched identity event is unsupported; a mismatched query result is not", () => {
    const mismatch = new GnusContractMismatchError("gnus_accountsChanged", "2");
    expect(reduce(ready(), { type: "errorReported", error: mismatch, source: "identity" })).toMatchObject({
      phase: "unsupported",
      cause: "pageOld",
    });
    expect(reduce(ready(), { type: "errorReported", error: mismatch, source: "query" })).toEqual(ready());
  });

  test("any other connect error is failed, and a query error elsewhere is left to its feature", () => {
    const internal = new GnusError(-32603);
    expect(reduce(INITIAL_STATE, { type: "connectFailed", error: internal })).toMatchObject({ phase: "failed", error: internal });
    expect(failedWith(ready(), internal, "errorReported")).toEqual(ready());
  });

  test("a late injection moves noWallet to connecting and nothing else", () => {
    const none = reduce(INITIAL_STATE, { type: "detected", choice: "walletconnect" });
    expect(none.phase).toBe("noWallet");
    expect(reduce(none, { type: "lateInjection" }).phase).toBe("connecting");
    expect(reduce(ready(), { type: "lateInjection" })).toEqual(ready());
  });
});
