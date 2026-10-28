import { EvmAddress, SdkAddress, TxHash, evmAddressSchema, sdkAddressSchema, txHashSchema } from "./address";
import { baseUnitsSchema } from "./amount";
import { isoTimestampSchema } from "./schema";

export type GnusErrorKind =
  | "rejected"
  | "unauthorized"
  | "unsupportedMethod"
  | "notReady"
  | "invalidParams"
  | "idempotencyKeyReused"
  | "internal"
  | "busy"
  | "rateLimited"
  | "confirmOpen"
  | "submitInFlight"
  | "costUnavailable"
  | "insufficientBalance"
  | "payerCannotSign"
  | "bridgeFailed"
  | "bridgeUnavailable"
  | "bridgedNotProcessed"
  | "submissionOutcomeUnknown"
  | "switching"
  | "contractMismatch"
  | "unknown";

export type GnusErrorAction =
  | "retry"
  | "connect"
  | "updateWallet"
  | "editJob"
  | "newSubmit"
  | "openWallet"
  | "wait"
  | "addFunds"
  | "waitForSwitch";

interface Description {
  kind: GnusErrorKind;
  message: string;
  action: GnusErrorAction;
}

interface Entry {
  fallback: Description;
  reasons?: Record<string, Description>;
}

const row = (kind: GnusErrorKind, message: string, action: GnusErrorAction): Description => ({ kind, message, action });

// The one place user-facing error copy lives (contract section 5). A reason refines a code only if listed here.
const TABLE: Record<number, Entry> = {
  4001: { fallback: row("rejected", "You rejected this in GeniusWallet.", "retry") },
  4100: { fallback: row("unauthorized", "Allow this site in GeniusWallet.", "connect") },
  4200: {
    fallback: row("unsupportedMethod", "Your GeniusWallet does not support this yet. Update GeniusWallet.", "updateWallet"),
  },
  4900: { fallback: row("notReady", "GeniusWallet is starting up.", "retry") },
  [-32602]: {
    fallback: row("invalidParams", "GeniusWallet rejected the request. Check the job and try again.", "editJob"),
    reasons: {
      idempotency_key_reused: row(
        "idempotencyKeyReused",
        "This submit was already used for a different job. Start a new submit.",
        "newSubmit",
      ),
    },
  },
  [-32603]: {
    fallback: row("internal", "GeniusWallet hit an internal error.", "retry"),
    reasons: {
      balance_unavailable: row("internal", "GeniusWallet cannot read your GNUS balance right now.", "retry"),
      checking: row("internal", "GeniusWallet is still checking the paying wallet.", "retry"),
      missing_data: row("internal", "GeniusWallet is missing data it needs for this payment.", "openWallet"),
      submission_outcome_unknown: row(
        "submissionOutcomeUnknown",
        "GeniusWallet can't tell whether this payment went through. Check it in GeniusWallet before you submit again.",
        "openWallet",
      ),
    },
  },
  [-32005]: {
    fallback: row("busy", "GeniusWallet is busy. Try again in a moment.", "retry"),
    reasons: {
      rate_limited: row("rateLimited", "Too many requests. Wait a moment, then try again.", "retry"),
      confirm_open: row("confirmOpen", "A confirm is already open in GeniusWallet. Finish it there first.", "openWallet"),
      submit_in_flight: row("submitInFlight", "A submit from this page is already in progress.", "wait"),
    },
  },
  [-32010]: { fallback: row("costUnavailable", "Price unavailable.", "retry") },
  [-32011]: {
    fallback: row("insufficientBalance", "Not enough GNUS to pay for this job.", "addFunds"),
    reasons: {
      no_gnus: row("insufficientBalance", "The paying wallet has no GNUS.", "addFunds"),
      gnus_elsewhere: row(
        "insufficientBalance",
        "Your GNUS is not in the paying wallet. Move it there in GeniusWallet.",
        "openWallet",
      ),
    },
  },
  [-32012]: {
    fallback: row(
      "payerCannotSign",
      "The paying wallet cannot sign. Pick a wallet with a key in GeniusWallet.",
      "openWallet",
    ),
    reasons: {
      no_wallet: row("payerCannotSign", "There is no paying wallet in GeniusWallet. Add one first.", "openWallet"),
      view_only: row("payerCannotSign", "The paying wallet is view-only and cannot sign.", "openWallet"),
      child: row("payerCannotSign", "A child account cannot pay. Pay from the main account.", "openWallet"),
      not_earning: row(
        "payerCannotSign",
        "This account is not earning in GeniusWallet yet. Start earning there first.",
        "openWallet",
      ),
      wrong_network: row(
        "payerCannotSign",
        "The paying wallet is on another network. Switch networks in GeniusWallet.",
        "openWallet",
      ),
    },
  },
  [-32013]: {
    fallback: row("bridgeFailed", "The payment did not go through. Nothing was spent.", "retry"),
    reasons: {
      bridge_unavailable: row(
        "bridgeUnavailable",
        "Not available on this network. Switch the network in GeniusWallet.",
        "openWallet",
      ),
    },
  },
  [-32014]: {
    fallback: row(
      "bridgedNotProcessed",
      "Paid, but the job was not processed. GeniusWallet keeps the payment record.",
      "openWallet",
    ),
  },
  [-32015]: {
    fallback: row("switching", "GeniusWallet is switching accounts.", "waitForSwitch"),
    reasons: {
      account_changed: row(
        "switching",
        "Your account changed while the confirm was open. Nothing was spent.",
        "retry",
      ),
    },
  },
};

const UNKNOWN = row("unknown", "GeniusWallet returned an unexpected error.", "retry");

function describeError(code: number | null, reason: string | null): Description {
  const entry = code === null || !Object.hasOwn(TABLE, code) ? undefined : TABLE[code];
  if (!entry) {
    return UNKNOWN;
  }
  if (reason !== null && entry.reasons && Object.hasOwn(entry.reasons, reason)) {
    return entry.reasons[reason];
  }
  return entry.fallback;
}

function readField(data: unknown, key: string): unknown {
  return typeof data === "object" && data !== null && key in data ? (data as Record<string, unknown>)[key] : undefined;
}

export interface SubmissionOutcome {
  idempotencyKey: string | null;
  burnTxHash: TxHash | null;
  sdkAddress: SdkAddress | null;
  payer: EvmAddress | null;
  cost: string | null;
  createdAt: string | null;
}

// Each field is parsed alone: a bad one becomes null and never turns this error into a contract mismatch.
function parseOutcome(data: unknown): SubmissionOutcome | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const field = <T>(key: string, schema: { safeParse(v: unknown): { success: boolean; data?: T } }): T | null => {
    const parsed = schema.safeParse(readField(data, key));
    return parsed.success ? (parsed.data as T) : null;
  };
  const key = readField(data, "idempotencyKey");
  return {
    idempotencyKey: typeof key === "string" && key.length > 0 && key.length <= 256 ? key : null,
    burnTxHash: field<TxHash>("burnTxHash", txHashSchema),
    sdkAddress: field<SdkAddress>("sdkAddress", sdkAddressSchema),
    payer: field<EvmAddress>("payer", evmAddressSchema),
    cost: field<string>("cost", baseUnitsSchema),
    createdAt: field<string>("createdAt", isoTimestampSchema),
  };
}

export class GnusError extends Error {
  readonly code: number | null;
  readonly kind: GnusErrorKind;
  readonly action: GnusErrorAction;
  readonly reason: string | null;
  readonly burnTxHash: TxHash | null;
  readonly outcome: SubmissionOutcome | null;
  readonly wireMessage: string | null;

  // `override` lets subclasses carry their own message and kind; callers outside this file leave it out.
  constructor(code: number | null, data?: unknown, wireMessage?: string, override?: Description) {
    const rawReason = readField(data, "reason");
    const reason = typeof rawReason === "string" ? rawReason : null;
    const described = override ?? describeError(code, reason);
    super(described.message);
    this.name = "GnusError";
    this.code = code;
    this.kind = described.kind;
    this.action = described.action;
    this.reason = reason;
    const unknownOutcome = code === -32603 && reason === "submission_outcome_unknown";
    this.outcome = unknownOutcome ? parseOutcome(data) : null;
    const hash = code === -32014 ? txHashSchema.safeParse(readField(data, "burnTxHash")) : null;
    this.burnTxHash = hash?.success ? hash.data : (this.outcome?.burnTxHash ?? null);
    this.wireMessage = wireMessage ?? null;
  }
}

export class GnusContractMismatchError extends GnusError {
  readonly method: string;
  readonly version: string | null;

  constructor(method: string, version: string | null) {
    super(null, undefined, undefined, {
      kind: "contractMismatch",
      message: `Wallet contract mismatch (wallet contract version ${version ?? "unknown"})`,
      action: "updateWallet",
    });
    this.name = "GnusContractMismatchError";
    this.method = method;
    this.version = version;
  }
}

export function normalizeError(err: unknown): GnusError {
  if (err instanceof GnusError) {
    return err;
  }
  if (typeof err === "object" && err !== null) {
    const { code, message, data } = err as { code?: unknown; message?: unknown; data?: unknown };
    if (typeof code === "number" && Number.isInteger(code)) {
      return new GnusError(code, data, typeof message === "string" ? message : undefined);
    }
  }
  return new GnusError(null);
}
