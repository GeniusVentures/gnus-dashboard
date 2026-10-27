import { GnusError, GnusContractMismatchError, normalizeError } from "../../../lib/gnus/errors";

// Rows come from contract section 5, its reasons table (2026-10-27), and the submit reasons in section 3.
const ROWS = [
  [4001, null, "rejected", "You rejected this in GeniusWallet.", "retry"],
  [4100, null, "unauthorized", "Allow this site in GeniusWallet.", "connect"],
  [4200, null, "unsupportedMethod", "Your GeniusWallet does not support this yet. Update GeniusWallet.", "updateWallet"],
  [4900, null, "notReady", "GeniusWallet is starting up.", "retry"],
  [-32602, null, "invalidParams", "GeniusWallet rejected the request. Check the job and try again.", "editJob"],
  [-32602, "idempotency_key_reused", "idempotencyKeyReused", "This submit was already used for a different job. Start a new submit.", "newSubmit"],
  [-32603, null, "internal", "GeniusWallet hit an internal error.", "retry"],
  [-32603, "balance_unavailable", "internal", "GeniusWallet cannot read your GNUS balance right now.", "retry"],
  [-32603, "checking", "internal", "GeniusWallet is still checking the paying wallet.", "retry"],
  [-32603, "missing_data", "internal", "GeniusWallet is missing data it needs for this payment.", "openWallet"],
  [-32005, null, "busy", "GeniusWallet is busy. Try again in a moment.", "retry"],
  [-32005, "rate_limited", "rateLimited", "Too many requests. Wait a moment, then try again.", "retry"],
  [-32005, "confirm_open", "confirmOpen", "A confirm is already open in GeniusWallet. Finish it there first.", "openWallet"],
  [-32005, "submit_in_flight", "submitInFlight", "A submit from this page is already in progress.", "wait"],
  [-32010, null, "costUnavailable", "Price unavailable.", "retry"],
  [-32011, null, "insufficientBalance", "Not enough GNUS to pay for this job.", "addFunds"],
  [-32011, "no_gnus", "insufficientBalance", "The paying wallet has no GNUS.", "addFunds"],
  [-32011, "gnus_elsewhere", "insufficientBalance", "Your GNUS is not in the paying wallet. Move it there in GeniusWallet.", "openWallet"],
  [-32012, null, "payerCannotSign", "The paying wallet cannot sign. Pick a wallet with a key in GeniusWallet.", "openWallet"],
  [-32012, "no_wallet", "payerCannotSign", "There is no paying wallet in GeniusWallet. Add one first.", "openWallet"],
  [-32012, "view_only", "payerCannotSign", "The paying wallet is view-only and cannot sign.", "openWallet"],
  [-32012, "child", "payerCannotSign", "A child account cannot pay. Pay from the main account.", "openWallet"],
  [-32012, "not_earning", "payerCannotSign", "This account is not earning in GeniusWallet yet. Start earning there first.", "openWallet"],
  [-32012, "wrong_network", "payerCannotSign", "The paying wallet is on another network. Switch networks in GeniusWallet.", "openWallet"],
  [-32013, null, "bridgeFailed", "The payment did not go through. Nothing was spent.", "retry"],
  [-32014, null, "bridgedNotProcessed", "Paid, but the job was not processed. GeniusWallet keeps the payment record.", "openWallet"],
  [-32015, null, "switching", "GeniusWallet is switching accounts.", "waitForSwitch"],
  [-32015, "account_changed", "switching", "Your account changed while the confirm was open. Nothing was spent.", "retry"],
];

const make = (code, reason) => new GnusError(code, reason ? { reason } : undefined);
const codeRows = ROWS.filter((r) => r[1] === null);
const reasonRows = ROWS.filter((r) => r[1] !== null);
const RPC05_REASONS = ["idempotency_key_reused", "rate_limited", "confirm_open", "submit_in_flight"];

describe("error table", () => {
  test("row counts", () => {
    expect(codeRows).toHaveLength(13);
    expect(reasonRows).toHaveLength(15);
  });

  test.each(ROWS)("%s %s", (code, reason, kind, message, action) => {
    const err = make(code, reason);
    expect(err.kind).toBe(kind);
    expect(err.message).toBe(message);
    expect(err.action).toBe(action);
    expect(err.code).toBe(code);
    expect(err.reason).toBe(reason);
  });

  test("17 distinct kinds across the code rows and the four RPC-05 reason rows", () => {
    const kinds = new Set([
      ...codeRows.map((r) => r[2]),
      ...reasonRows.filter((r) => RPC05_REASONS.includes(r[1])).map((r) => r[2]),
    ]);
    expect(kinds.size).toBe(17);
  });

  test("the other 11 reason rows keep their code's kind but refine the message", () => {
    const others = reasonRows.filter((r) => !RPC05_REASONS.includes(r[1]));
    expect(others).toHaveLength(11);
    for (const [code, , kind, message] of others) {
      const base = codeRows.find((r) => r[0] === code);
      expect(kind).toBe(base[2]);
      expect(message).not.toBe(base[3]);
    }
  });

  test("fixed wording", () => {
    expect(new GnusError(4100).message).toBe("Allow this site in GeniusWallet.");
    expect(new GnusError(-32010).message).toBe("Price unavailable.");
  });
});

describe("fallbacks", () => {
  test("a listed code with an unlisted reason uses the code default", () => {
    const busy = make(-32005, "something_new");
    expect(busy.kind).toBe("busy");
    expect(busy.message).toBe("GeniusWallet is busy. Try again in a moment.");
    expect(make(-32012, "something_new").message).toBe(codeRows.find((r) => r[0] === -32012)[3]);
    expect(make(-32602, "selector").kind).toBe("invalidParams");
    expect(make(-32005, "something_new").reason).toBe("something_new");
  });

  test("a reason on a code that lists none is ignored for kind and message", () => {
    expect(make(4001, "no_gnus").kind).toBe("rejected");
  });

  test("unlisted codes, null codes and TypeErrors are unknown", () => {
    expect(new GnusError(12345).kind).toBe("unknown");
    expect(new GnusError(null).kind).toBe("unknown");
    expect(normalizeError(new TypeError("boom")).kind).toBe("unknown");
    expect(normalizeError(new GnusError(null)).action).toBe("retry");
  });
});

describe("burnTxHash and reason", () => {
  const good = "0x" + "c3".repeat(32);
  test("exposed for -32014 when valid", () => {
    expect(new GnusError(-32014, { burnTxHash: good }).burnTxHash).toBe(good);
  });
  test.each([
    ["uppercase", "0x" + "C3".repeat(32)],
    ["40 hex", "0x" + "c3".repeat(20)],
    ["a number", 12345],
  ])("%s gives null", (_n, value) => {
    expect(new GnusError(-32014, { burnTxHash: value }).burnTxHash).toBeNull();
  });
  test("no data gives null; other codes give null", () => {
    expect(new GnusError(-32014).burnTxHash).toBeNull();
    expect(new GnusError(-32013, { burnTxHash: good }).burnTxHash).toBeNull();
  });
  test("reason is null unless data is an object with a string reason", () => {
    expect(new GnusError(-32005, "submit_in_flight").reason).toBeNull();
    expect(new GnusError(-32005, null).reason).toBeNull();
    expect(new GnusError(-32005, { reason: 7 }).reason).toBeNull();
  });
});

describe("wire text", () => {
  test("the wallet's message stays in wireMessage and never becomes display text", () => {
    const err = normalizeError({ code: -32005, message: "busy", data: { reason: "submit_in_flight" } });
    expect(err.kind).toBe("submitInFlight");
    expect(err.wireMessage).toBe("busy");
    expect(err.message).not.toBe("busy");
  });
});

describe("contract mismatch", () => {
  test("kind, action and message", () => {
    const err = new GnusContractMismatchError("gnus_estimate", "1");
    expect(err.kind).toBe("contractMismatch");
    expect(err.action).toBe("updateWallet");
    expect(err.message).toContain("Wallet contract mismatch");
    expect(err.message).toContain("1");
    expect(err.burnTxHash).toBeNull();
  });
});
