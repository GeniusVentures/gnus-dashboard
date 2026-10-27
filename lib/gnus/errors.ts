export type GnusErrorKind = "contractMismatch" | "unknown";
export type GnusErrorAction = "updateWallet" | "retry";

interface Description {
  kind: GnusErrorKind;
  message: string;
  action: GnusErrorAction;
}

function describeError(_code: number | null, _reason: string | null): Description {
  return { kind: "unknown", message: "GeniusWallet returned an unexpected error.", action: "retry" };
}

function readReason(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "reason" in data) {
    const reason = (data as { reason: unknown }).reason;
    return typeof reason === "string" ? reason : null;
  }
  return null;
}

export class GnusError extends Error {
  readonly code: number | null;
  readonly kind: GnusErrorKind;
  readonly action: GnusErrorAction;
  readonly reason: string | null;
  readonly wireMessage: string | null;

  // `override` lets subclasses carry their own message and kind; callers outside this file leave it out.
  constructor(code: number | null, data?: unknown, wireMessage?: string, override?: Description) {
    const reason = readReason(data);
    const described = override ?? describeError(code, reason);
    super(described.message);
    this.name = "GnusError";
    this.code = code;
    this.kind = described.kind;
    this.action = described.action;
    this.reason = reason;
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
