import { GnusClient, createGnusClient } from "../gnus/client";
import { GnusError, normalizeError } from "../gnus/errors";
import { createInjectedTransport } from "../gnus/transport/injected";
import { DetectEnv, detectTransport } from "../gnus/transport/select";
import { INITIAL_STATE, SessionEvent, SessionState, reduce } from "./machine";

export type SessionEnv = DetectEnv;

/** Seconds between getAccounts retries while the wallet is starting up; the last step repeats. */
export const STARTUP_RETRY_SECONDS = [1, 2, 4, 8, 16, 30];

export interface SessionStore {
  getState(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Idempotent: detection and the connect call run once per store. */
  start(): void;
  /** Re-runs the connect call from a failure screen. */
  retry(): void;
  /** The Connect again button: one more connect call, which prompts in the wallet. */
  connectAgain(): void;
  /** Retries getAccounts now and restarts the startup schedule. */
  tryNow(): void;
  /** The live client, or null before the injected wallet is attached. */
  getClient(): GnusClient | null;
  /** Wraps an account read so the session can notice when the wallet stops answering. */
  track<T>(read: Promise<T>): Promise<T>;
  /** An account query's error: the session moves only for the codes that concern it. */
  report(error: GnusError): void;
  dispose(): void;
}

export function createSessionStore(env: SessionEnv): SessionStore {
  let state = INITIAL_STATE;
  let started = false;
  let disposed = false;
  let client: GnusClient | null = null;
  let retryTimer: unknown = null;
  let retryStep = 0;
  let retryInFlight = false;
  const cleanups: Array<() => void> = [];
  const listeners = new Set<() => void>();

  function stopRetryTimer(): void {
    if (retryTimer !== null) {
      env.clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  // One timer while the wallet is starting up; leaving that phase cancels it.
  function syncRetryTimer(): void {
    if (state.phase !== "startingUp") {
      stopRetryTimer();
      retryStep = 0;
      return;
    }
    if (retryTimer !== null || retryInFlight || disposed) {
      return;
    }
    const seconds = STARTUP_RETRY_SECONDS[Math.min(retryStep, STARTUP_RETRY_SECONDS.length - 1)];
    retryStep += 1;
    retryTimer = env.setTimeout(() => {
      retryTimer = null;
      readAccounts();
    }, seconds * 1000);
  }

  function dispatch(event: SessionEvent): void {
    const next = reduce(state, event);
    if (next !== state) {
      state = next;
      for (const listener of [...listeners]) {
        listener();
      }
    }
    syncRetryTimer();
  }

  // No timeout: the wallet may hold a connect call until the user answers its prompt.
  function readAccounts(): void {
    if (!client || retryInFlight) {
      return;
    }
    retryInFlight = true;
    client.getAccounts().then(
      (accounts) => {
        retryInFlight = false;
        if (!disposed) {
          dispatch({ type: "accountsReceived", accounts });
        }
      },
      (err: unknown) => {
        retryInFlight = false;
        if (!disposed) {
          dispatch({ type: "connectFailed", error: normalizeError(err) });
        }
      },
    );
  }

  function connect(first: SessionEvent): void {
    if (!client) {
      return;
    }
    stopRetryTimer();
    dispatch(first);
    readAccounts();
  }

  function attach(): void {
    const injected = createGnusClient(createInjectedTransport(env.win));
    client = injected;
    cleanups.push(() => injected.close());
    cleanups.push(
      injected.on(
        "gnus_accountsChanged",
        (accounts) => dispatch({ type: "accountsReceived", accounts }),
        (error) => dispatch({ type: "errorReported", error, source: "identity" }),
      ),
    );
    cleanups.push(
      injected.on(
        "gnus_networkChanged",
        (network) => dispatch({ type: "networkChanged", network }),
        (error) => dispatch({ type: "errorReported", error, source: "identity" }),
      ),
    );
    connect({ type: "connectStarted" });
  }

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    const detection = detectTransport(env, { hasActiveWalletConnectSession: () => false });
    cleanups.push(() => detection.dispose());
    cleanups.push(
      detection.onSwitch(() => {
        if (!disposed) {
          dispatch({ type: "lateInjection" });
          attach();
        }
      }),
    );
    void detection.choice.then((choice) => {
      if (disposed) {
        return;
      }
      dispatch({ type: "detected", choice });
      if (choice === "injected") {
        attach();
      }
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
    retry: () => connect({ type: "connectStarted" }),
    connectAgain: () => connect({ type: "connectAgain" }),
    tryNow() {
      stopRetryTimer();
      retryStep = 0;
      readAccounts();
    },
    getClient: () => client,
    track: (read) => read,
    report: (error) => dispatch({ type: "errorReported", error, source: "query" }),
    dispose() {
      disposed = true;
      listeners.clear();
      stopRetryTimer();
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
