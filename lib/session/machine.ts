import { GnusContractMismatchError, GnusError } from "../gnus/errors";
import { Accounts, CONTRACT_VERSION, Network } from "../gnus/schema";
import type { TransportChoice } from "../gnus/transport/select";

export type Phase =
  | "detecting"
  | "connecting"
  | "ready"
  | "switching"
  | "startingUp"
  | "notResponding"
  | "denied"
  | "unsupported"
  | "noWallet"
  | "pairing"
  | "pairingDeclined"
  | "disconnected"
  | "failed";

export type Cause =
  | "declined"
  | "notAllowed"
  | "walletOld"
  | "pageOld"
  | "noReply"
  | "disconnected"
  | "noBridge"
  | "offline"
  | "notGenius";

export interface SessionState {
  readonly phase: Phase;
  readonly cause: Cause | null;
  readonly accounts: Accounts | null;
  readonly error: GnusError | null;
  /** Which wallet connection the session runs on; null until one is chosen. */
  readonly transport: "injected" | "walletconnect" | null;
  /** The WalletConnect pairing link while phase is pairing. */
  readonly uri: string | null;
  /** The wallet's own words when it declined a pairing. */
  readonly detail: string | null;
}

export const INITIAL_STATE: SessionState = {
  phase: "detecting",
  cause: null,
  accounts: null,
  error: null,
  transport: null,
  uri: null,
  detail: null,
};

/** Where an error came from decides how much of the session it can move: only the connect call may end in `failed`. */
export type ErrorSource = "connect" | "identity" | "query";

export type SessionEvent =
  | { type: "transportChosen"; transport: "injected" | "walletconnect" }
  | { type: "pairingStarted"; uri: string }
  | { type: "pairingDeclined"; message: string | null }
  | { type: "pairingRefused"; cause: "notGenius" | "walletOld" }
  | { type: "sessionEnded" }
  | { type: "restoreStarted" }
  | { type: "walletOffline" }
  | { type: "detected"; choice: TransportChoice }
  | { type: "lateInjection" }
  | { type: "connectStarted" }
  | { type: "connectAgain" }
  | { type: "accountsReceived"; accounts: Accounts }
  | { type: "networkChanged"; network: Network }
  | { type: "disconnected" }
  | { type: "noReply" }
  | { type: "replyArrived" }
  | { type: "noBridge" }
  | { type: "connectFailed"; error: GnusError }
  | { type: "errorReported"; error: GnusError; source: ErrorSource };

/** The SDK network this build serves, set at build time. The EVM chain never gates anything here: the wallet refuses chains it cannot burn on. */
export const servedSdkNetwork = (): string | null => process.env.NEXT_PUBLIC_GNUS_SDK_NETWORK ?? null;

export const networkMismatch = (network: Network): boolean => network.sdk === null || network.sdk !== servedSdkNetwork();

/** The gate the estimate and submit buttons read. */
export const canEstimate = (state: SessionState): boolean =>
  state.phase === "ready" && state.accounts !== null && !networkMismatch(state.accounts.network);

export const canSubmit = (state: SessionState): boolean => canEstimate(state) && state.accounts?.payer.canSign === true;

const away = (phase: Phase, cause: Cause | null, error: GnusError | null): SessionState => ({
  ...INITIAL_STATE,
  phase,
  cause,
  error,
});

function unsupportedCause(error: GnusError): Cause {
  const version = error instanceof GnusContractMismatchError ? error.version : null;
  return version !== null && /^\d+$/.test(version) && Number(version) > Number(CONTRACT_VERSION)
    ? "pageOld"
    : "walletOld";
}

function onError(state: SessionState, error: GnusError, source: ErrorSource): SessionState {
  const { code, kind } = error;
  if (kind === "walletOffline") {
    return state.accounts && source !== "connect"
      ? { ...state, phase: "notResponding", cause: "offline" }
      : away("notResponding", "offline", null);
  }
  if (code === 4001 || code === 4100) {
    return away("denied", code === 4001 ? "declined" : "notAllowed", error);
  }
  if (code === 4900) {
    return away("startingUp", null, error);
  }
  if (kind === "switching" && code === -32015) {
    return state.accounts ? { ...state, phase: "switching" } : state;
  }
  if (kind === "confirmOpen") {
    return away("connecting", null, null);
  }
  if (kind === "rateLimited") {
    // Connect again keeps the denied screen and shows this message.
    const wasDenied = state.cause === "declined" || state.cause === "notAllowed";
    if (wasDenied && (state.phase === "denied" || state.phase === "connecting")) {
      return away("denied", state.cause, error);
    }
  }
  if (code === 4200 || error instanceof GnusContractMismatchError) {
    return source === "query" ? state : away("unsupported", unsupportedCause(error), error);
  }
  return source === "connect" ? away("failed", null, error) : state;
}

/** True while no wallet session exists yet, so a wallet injected late may still take over. */
const sessionless = (state: SessionState): boolean =>
  state.phase === "noWallet" ||
  state.phase === "detecting" ||
  (state.transport === "walletconnect" && state.accounts === null);

/** Every transition keeps the transport; only transportChosen changes it. */
export function reduce(state: SessionState, event: SessionEvent): SessionState {
  if (event.type === "transportChosen") {
    return state.transport === event.transport ? state : { ...state, transport: event.transport };
  }
  const next = step(state, event);
  return next === state || next.transport === state.transport ? next : { ...next, transport: state.transport };
}

function step(state: SessionState, event: Exclude<SessionEvent, { type: "transportChosen" }>): SessionState {
  switch (event.type) {
    case "pairingStarted":
      return { ...INITIAL_STATE, phase: "pairing", uri: event.uri };
    case "pairingDeclined":
      return { ...INITIAL_STATE, phase: "pairingDeclined", detail: event.message };
    case "pairingRefused":
      return event.cause === "notGenius" ? away("noWallet", "notGenius", null) : away("unsupported", "walletOld", null);
    case "restoreStarted":
      return INITIAL_STATE;
    case "sessionEnded":
      return away("disconnected", null, null);
    case "walletOffline":
      return away("notResponding", "offline", null);
    case "detected":
      return event.choice === "walletconnect" && state.phase === "detecting"
        ? { ...INITIAL_STATE, phase: "noWallet" }
        : state;
    case "lateInjection":
      return sessionless(state) ? away("connecting", null, null) : state;
    case "connectStarted":
      return away("connecting", null, null);
    case "connectAgain":
      return { ...INITIAL_STATE, phase: "connecting", cause: state.cause };
    case "networkChanged":
      return state.accounts ? { ...state, accounts: { ...state.accounts, network: event.network } } : state;
    case "disconnected":
      return away("notResponding", "disconnected", null);
    case "noBridge":
      return state.phase === "detecting" ? away("notResponding", "noBridge", null) : state;
    case "noReply":
      return state.accounts && (state.phase === "ready" || state.phase === "switching")
        ? { ...state, phase: "notResponding", cause: "noReply" }
        : state;
    case "replyArrived":
      return state.phase === "notResponding" && state.cause === "noReply" && state.accounts
        ? { ...state, phase: state.accounts.switching ? "switching" : "ready", cause: null }
        : state;
    case "accountsReceived":
      return {
        ...INITIAL_STATE,
        phase: event.accounts.switching ? "switching" : "ready",
        accounts: event.accounts,
      };
    case "connectFailed":
      return onError(state, event.error, "connect");
    case "errorReported":
      return onError(state, event.error, event.source);
  }
}
