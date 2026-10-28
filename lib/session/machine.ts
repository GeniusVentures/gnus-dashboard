import type { GnusError } from "../gnus/errors";
import type { Accounts } from "../gnus/schema";
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
  | "failed";

export type Cause = "declined" | "notAllowed" | "walletOld" | "pageOld" | "noReply" | "disconnected" | "noBridge";

export interface SessionState {
  readonly phase: Phase;
  readonly cause: Cause | null;
  readonly accounts: Accounts | null;
  readonly error: GnusError | null;
}

export const INITIAL_STATE: SessionState = { phase: "detecting", cause: null, accounts: null, error: null };

export type SessionEvent =
  | { type: "detected"; choice: TransportChoice }
  | { type: "connectStarted" }
  | { type: "accountsReceived"; accounts: Accounts }
  | { type: "connectFailed"; error: GnusError };

export function reduce(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "detected":
      return event.choice === "walletconnect" && state.phase === "detecting"
        ? { ...INITIAL_STATE, phase: "noWallet" }
        : state;
    case "connectStarted":
      return { ...INITIAL_STATE, phase: "connecting" };
    case "accountsReceived":
      return { phase: "ready", cause: null, accounts: event.accounts, error: null };
    case "connectFailed":
      return { ...INITIAL_STATE, phase: "failed", error: event.error };
  }
}
