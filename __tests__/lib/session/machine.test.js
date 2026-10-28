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

describe("switching and the served network", () => {
  const { canEstimate, canSubmit, networkMismatch } = require("../../../lib/session/machine");
  const withAccounts = (patch) => ({ ...accounts, ...patch });

  test("accounts with switching true give switching, and a later switching false gives ready", () => {
    const switching = reduce(INITIAL_STATE, { type: "accountsReceived", accounts: withAccounts({ switching: true }) });
    expect(switching.phase).toBe("switching");
    expect(reduce(switching, { type: "accountsReceived", accounts }).phase).toBe("ready");
  });

  test("a reported -32015 keeps the accounts and gives switching; without accounts it does nothing", () => {
    const next = reduce(ready(), { type: "errorReported", error: new GnusError(-32015), source: "query" });
    expect(next).toMatchObject({ phase: "switching", accounts });
    expect(reduce(INITIAL_STATE, { type: "errorReported", error: new GnusError(-32015), source: "query" })).toEqual(INITIAL_STATE);
  });

  test("staging matches whatever the EVM chain; another SDK network or a null does not", () => {
    expect(networkMismatch({ sdk: "staging", evmChainId: 80002 })).toBe(false);
    expect(networkMismatch({ sdk: "staging", evmChainId: 97 })).toBe(false);
    expect(networkMismatch({ sdk: "staging", evmChainId: 11155111 })).toBe(false);
    expect(networkMismatch({ sdk: "staging", evmChainId: null })).toBe(false);
    expect(networkMismatch({ sdk: "mainnet", evmChainId: 80002 })).toBe(true);
    expect(networkMismatch({ sdk: null, evmChainId: 80002 })).toBe(true);
  });

  test("networkChanged updates the label in place", () => {
    const next = reduce(ready(), { type: "networkChanged", network: { sdk: "mainnet", evmChainId: 1 } });
    expect(next.accounts.network).toEqual({ sdk: "mainnet", evmChainId: 1 });
    expect(next.phase).toBe("ready");
    expect(reduce(INITIAL_STATE, { type: "networkChanged", network: { sdk: "x", evmChainId: 1 } })).toEqual(INITIAL_STATE);
  });

  test("canEstimate needs ready and the served SDK network; canSubmit also needs payer.canSign", () => {
    expect(canEstimate(ready())).toBe(true);
    expect(canSubmit(ready())).toBe(true);
    expect(canEstimate({ ...ready(), phase: "switching" })).toBe(false);
    expect(canSubmit({ ...ready(), phase: "switching" })).toBe(false);
    expect(canEstimate(INITIAL_STATE)).toBe(false);
    const watchOnly = { ...ready(), accounts: withAccounts({ payer: { evmAddress: null, canSign: false } }) };
    expect(canEstimate(watchOnly)).toBe(true);
    expect(canSubmit(watchOnly)).toBe(false);
    const wrong = { ...ready(), accounts: withAccounts({ network: { sdk: "mainnet", evmChainId: 80002 } }) };
    expect(canEstimate(wrong)).toBe(false);
    expect(canSubmit(wrong)).toBe(false);
  });

  test("a chain the wallet cannot burn on does not block estimating; the wallet's own refusal does", () => {
    const onBnb = { ...ready(), accounts: withAccounts({ network: { sdk: "staging", evmChainId: 97 } }) };
    expect(canEstimate(onBnb)).toBe(true);
    const unavailable = new GnusError(-32013, { reason: "bridge_unavailable" });
    expect(unavailable.kind).toBe("bridgeUnavailable");
    expect(reduce(onBnb, { type: "errorReported", error: unavailable, source: "query" })).toEqual(onBnb);
  });
});
