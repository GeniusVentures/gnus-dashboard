import { GnusClient, createGnusClient } from "../gnus/client";
import { normalizeError } from "../gnus/errors";
import { createInjectedTransport } from "../gnus/transport/injected";
import { DetectEnv, detectTransport } from "../gnus/transport/select";
import { INITIAL_STATE, SessionEvent, SessionState, reduce } from "./machine";

export type SessionEnv = DetectEnv;

export interface SessionStore {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Idempotent: detection and the connect call run once per store. */
  start(): void;
  /** Re-runs the connect call. */
  retry(): void;
  dispose(): void;
}

export function createSessionStore(env: SessionEnv): SessionStore {
  let state = INITIAL_STATE;
  let started = false;
  let disposed = false;
  let client: GnusClient | null = null;
  const cleanups: Array<() => void> = [];
  const listeners = new Set<() => void>();

  function dispatch(event: SessionEvent): void {
    const next = reduce(state, event);
    if (next !== state) {
      state = next;
      for (const listener of [...listeners]) {
        listener();
      }
    }
  }

  // No timeout: the wallet may hold the first call until the user answers its connect prompt.
  function connect(): void {
    if (!client) {
      return;
    }
    dispatch({ type: "connectStarted" });
    client.getAccounts().then(
      (accounts) => {
        if (!disposed) {
          dispatch({ type: "accountsReceived", accounts });
        }
      },
      (err: unknown) => {
        if (!disposed) {
          dispatch({ type: "connectFailed", error: normalizeError(err) });
        }
      },
    );
  }

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    const detection = detectTransport(env, { hasActiveWalletConnectSession: () => false });
    cleanups.push(() => detection.dispose());
    void detection.choice.then((choice) => {
      if (disposed) {
        return;
      }
      dispatch({ type: "detected", choice });
      if (choice !== "injected") {
        return;
      }
      const injected = createGnusClient(createInjectedTransport(env.win));
      client = injected;
      cleanups.push(() => injected.close());
      cleanups.push(
        injected.on(
          "gnus_accountsChanged",
          (accounts) => dispatch({ type: "accountsReceived", accounts }),
          (error) => dispatch({ type: "connectFailed", error }),
        ),
      );
      connect();
    });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    retry: connect,
    dispose() {
      disposed = true;
      listeners.clear();
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    },
  };
}

const stores = new WeakMap<object, SessionStore>();

/** One store per window, made on first use and never at import. */
export function getSessionStore(win: Window = window): SessionStore {
  let store = stores.get(win);
  if (!store) {
    store = createSessionStore({
      win: win as unknown as DetectEnv["win"],
      userAgent: win.navigator.userAgent,
      setTimeout: (fn, ms) => win.setTimeout(fn, ms),
      clearTimeout: (id) => win.clearTimeout(id as number),
    });
    stores.set(win, store);
  }
  return store;
}
