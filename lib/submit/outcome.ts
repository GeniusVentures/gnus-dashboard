import { GnusError, SubmissionOutcome } from "../gnus/errors";
import type { JobLookup, SubmitResult } from "../gnus/schema";

/** What the submit page shows after a payment; the words live in SubmitResult. */
export type Outcome =
  | { kind: "done"; jobId: string | null; burnTxHash: string }
  | { kind: "paidNotProcessed"; burnTxHash: string | null }
  | { kind: "unconfirmed"; burnTxHash: string | null }
  | { kind: "outcomeUnknown"; message: string; details: SubmissionOutcome | null }
  | { kind: "pending"; burnTxHash: string | null }
  | { kind: "unknown"; message: string }
  | { kind: "checking" };

export type ErrorClass =
  | { kind: "outcome"; outcome: Outcome }
  /** Nothing was spent: back to the job with the same key. */
  | { kind: "notSpent"; error: GnusError; nothingSpentLine: boolean; newKey: boolean }
  /** The fate is unknown: ask the wallet by key before showing anything. */
  | { kind: "lookup" };

export type LookupClass = { kind: "outcome"; outcome: Outcome } | { kind: "notSeen" };

const NOTHING_SPENT_CODES = new Set([4001, 4100, 4200, 4900, -32005, -32010, -32011, -32012, -32013, -32015, -32602]);
const NOTHING_SPENT_INTERNAL = new Set(["balance_unavailable", "checking", "missing_data"]);

export function classifyResult(result: SubmitResult): Outcome {
  switch (result.status) {
    case "submitted":
      return { kind: "done", jobId: result.jobId, burnTxHash: result.burnTxHash };
    case "bridgedNotProcessed":
      return { kind: "paidNotProcessed", burnTxHash: result.burnTxHash };
    case "unconfirmed":
      return { kind: "unconfirmed", burnTxHash: result.burnTxHash };
  }
}

export function classifyError(error: GnusError): ErrorClass {
  const { code, reason } = error;
  if (code === -32014) {
    return { kind: "outcome", outcome: { kind: "paidNotProcessed", burnTxHash: error.burnTxHash } };
  }
  if (code === -32603 && reason === "submission_outcome_unknown") {
    return {
      kind: "outcome",
      outcome: { kind: "outcomeUnknown", message: error.message, details: error.outcome },
    };
  }
  const spentNothing =
    code !== null && (NOTHING_SPENT_CODES.has(code) || (code === -32603 && reason !== null && NOTHING_SPENT_INTERNAL.has(reason)));
  if (!spentNothing) {
    return { kind: "lookup" };
  }
  // The -32013 fallback and -32015 account_changed already say nothing was spent; -32005 says nothing about money.
  const saysSo = (code === -32013 && reason !== "bridge_unavailable") || (code === -32015 && reason === "account_changed");
  return {
    kind: "notSpent",
    error,
    nothingSpentLine: !saysSo && code !== -32005,
    newKey: code === -32602 && reason === "idempotency_key_reused",
  };
}

export function classifyLookup(job: JobLookup): LookupClass {
  if (job === null) {
    return { kind: "notSeen" };
  }
  switch (job.status) {
    case "bridgedNotProcessed":
      return { kind: "outcome", outcome: { kind: "paidNotProcessed", burnTxHash: job.burnTxHash } };
    case "unconfirmed":
      return { kind: "outcome", outcome: { kind: "unconfirmed", burnTxHash: job.burnTxHash } };
    case "pending":
      return { kind: "outcome", outcome: { kind: "pending", burnTxHash: job.burnTxHash } };
    default:
      // Only a pending record carries a null hash; if any other status did, the safe screen is the pending one.
      return {
        kind: "outcome",
        outcome:
          job.burnTxHash === null
            ? { kind: "pending", burnTxHash: null }
            : { kind: "done", jobId: job.jobId, burnTxHash: job.burnTxHash },
      };
  }
}
