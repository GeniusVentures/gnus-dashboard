import { GnusContractMismatchError, GnusError } from "../../../lib/gnus/errors";
import { classifyError, classifyLookup, classifyResult, isDefinitive } from "../../../lib/submit/outcome";

const HASH = "0x" + "ab".repeat(32);
const NODE = "0x" + "a1".repeat(64);
const record = (status, extra = {}) => ({
  jobId: "job-1",
  burnTxHash: HASH,
  sdkAddress: NODE,
  origin: "http://localhost:3000",
  idempotencyKey: "k",
  submittedAt: "2026-10-28T12:00:00.000Z",
  cost: "3",
  status,
  result: null,
  ...extra,
});

describe("classifyResult", () => {
  it.each([
    ["submitted", { kind: "done", jobId: "job-1", burnTxHash: HASH }],
    ["bridgedNotProcessed", { kind: "paidNotProcessed", burnTxHash: HASH }],
    ["unconfirmed", { kind: "unconfirmed", burnTxHash: HASH }],
  ])("%s", (status, expected) => {
    expect(classifyResult({ jobId: "job-1", burnTxHash: HASH, sdkAddress: NODE, status })).toEqual(expected);
  });
});

describe("classifyError", () => {
  it("-32014 is paid-not-processed with the hash from data", () => {
    expect(classifyError(new GnusError(-32014, { burnTxHash: HASH }))).toEqual({
      kind: "outcome",
      outcome: { kind: "paidNotProcessed", burnTxHash: HASH },
    });
  });

  it("submission_outcome_unknown carries the wallet's fields", () => {
    const error = new GnusError(-32603, { reason: "submission_outcome_unknown", burnTxHash: HASH, cost: "3" });
    const result = classifyError(error);
    expect(result.outcome).toMatchObject({ kind: "outcomeUnknown", details: { burnTxHash: HASH, cost: "3" } });
    expect(result.outcome.message).toBe(error.message);
  });

  it.each([
    [4001, undefined],
    [4200, undefined],
    [4900, undefined],
    [-32005, "confirm_open"],
    [-32005, "submit_in_flight"],
    [-32005, "rate_limited"],
    [-32010, undefined],
    [-32011, undefined],
    [-32011, "no_gnus"],
    [-32012, "view_only"],
    [-32013, undefined],
    [-32013, "bridge_unavailable"],
    [-32015, undefined],
    [-32015, "account_changed"],
    [-32602, undefined],
    [-32602, "idempotency_key_reused"],
    [-32603, "balance_unavailable"],
    [-32603, "checking"],
    [-32603, "missing_data"],
  ])("code %i reason %s spent nothing", (code, reason) => {
    const result = classifyError(new GnusError(code, reason ? { reason } : undefined));
    expect(result.kind).toBe("notSpent");
  });

  it.each([
    [new GnusContractMismatchError("gnus_submitJob", "1")],
    [new GnusError(null)],
    [new GnusError(-32099)],
    [new GnusError(-32603)],
    [new GnusError(-32603, { reason: "something_new" })],
  ])("an unknown fate asks the wallet: %#", (error) => {
    expect(classifyError(error)).toEqual({ kind: "lookup" });
  });

  it("4100 is a disconnect with an open fate: a call in flight at a revoke may already have burned", () => {
    expect(classifyError(new GnusError(4100))).toEqual({ kind: "outcome", outcome: { kind: "disconnected" } });
  });

  it("asks for a new key only for idempotency_key_reused", () => {
    expect(classifyError(new GnusError(-32602, { reason: "idempotency_key_reused" })).newKey).toBe(true);
    expect(classifyError(new GnusError(-32602)).newKey).toBe(false);
  });

  it.each([
    [4001, undefined, true],
    [-32011, undefined, true],
    [-32013, "bridge_unavailable", true],
    [-32013, undefined, false],
    [-32015, "account_changed", false],
    [-32015, undefined, true],
    [-32005, "confirm_open", false],
    [-32005, "submit_in_flight", false],
  ])("code %i reason %s: Nothing was spent line is %s", (code, reason, line) => {
    expect(classifyError(new GnusError(code, reason ? { reason } : undefined)).nothingSpentLine).toBe(line);
  });
});

describe("classifyLookup", () => {
  it.each([
    ["bridgedNotProcessed", "paidNotProcessed"],
    ["unconfirmed", "unconfirmed"],
    ["pending", "pending"],
    ["submitted", "done"],
    ["queued", "done"],
    ["processing", "done"],
    ["completed", "done"],
    ["failed", "recorded"],
    ["unknown", "recorded"],
  ])("status %s gives %s", (status, kind) => {
    expect(classifyLookup(record(status)).outcome.kind).toBe(kind);
  });

  it("a failed or unknown status never claims the job was sent; only failed retires the key", () => {
    const failed = classifyLookup(record("failed")).outcome;
    const unknown = classifyLookup(record("unknown")).outcome;
    expect(failed).toEqual({ kind: "recorded", burnTxHash: HASH, status: "failed" });
    expect(isDefinitive(failed)).toBe(true);
    expect(isDefinitive(unknown)).toBe(false);
  });

  it("null is not seen", () => {
    expect(classifyLookup(null)).toEqual({ kind: "notSeen" });
  });

  it("a pending record with no hash keeps the null", () => {
    expect(classifyLookup(record("pending", { burnTxHash: null, jobId: null }))).toEqual({
      kind: "outcome",
      outcome: { kind: "pending", burnTxHash: null },
    });
  });
});
