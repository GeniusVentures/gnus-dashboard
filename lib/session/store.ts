import { GnusClient, createGnusClient } from "../gnus/client";
import { GnusError, normalizeError } from "../gnus/errors";
import { createInjectedTransport } from "../gnus/transport/injected";
import { DetectEnv, detectTransport } from "../gnus/transport/select";
import { INITIAL_STATE, SessionEvent, SessionState, reduce } from "./machine";

export interface SessionEnv extends DetectEnv {
  /** False while the tab is hidden. Left out, the tab counts as visible. */
  isVisible?(): boolean;
}

/** A tracked read unanswered for this long shows "GeniusWallet isn't responding"; the read is not abandoned. */
export const NO_REPLY_MS = 15000;

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
  let readInFlight = false;
  let slowReads = 0;
  // Counts identity events, so a read that began before one cannot put the older identity back.
  let identityEvents = 0;
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
    if (retryTimer !== null || readInFlight || disposed) {
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

  function track<T>(read: Promise<T>): Promise<T> {
    let slow = false;
    const timer = env.setTimeout(() => {
      slow = true;
      slowReads += 1;
      dispatch({ type: "noReply" });
    }, NO_REPLY_MS);
    const settled = (): void => {
      env.clearTimeout(timer);
      if (slow) {
        slowReads -= 1;
        if (slowReads === 0 && !disposed) {
          dispatch({ type: "replyArrived" });
        }
      }
    };
    read.then(settled, settled);
    return read;
  }

  // The connect call has no timeout: the wallet may hold it until the user answers its prompt.
  // A re-read of a connected session is tracked like any other read.
  function readAccounts(source: "connect" | "identity" = "connect"): void {
    if (!client || readInFlight) {
      return;
    }
    readInFlight = true;
    const seen = identityEvents;
    const read = client.getAccounts();
    (source === "identity" ? track(read) : read).then(
      (accounts) => {
        readInFlight = false;
        if (!disposed && (seen === identityEvents || state.accounts === null)) {
          dispatch({ type: "accountsReceived", accounts });
        }
      },
      (err: unknown) => {
        readInFlight = false;
        if (!disposed) {
          const error = normalizeError(err);
          dispatch(source === "connect" ? { type: "connectFailed", error } : { type: "errorReported", error, source });
        }
      },
    );
  }

  function onVisible(): void {
    if (env.isVisible?.() !== false && (state.phase === "ready" || state.phase === "switching")) {
      readAccounts("identity");
    }
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
        (accounts) => {
          identityEvents += 1;
          dispatch({ type: "accountsReceived", accounts });
        },
        (error) => dispatch({ type: "errorReported", error, source: "identity" }),
      ),
    );
    cleanups.push(
      injected.on(
        "disconnect",
        () => dispatch({ type: "disconnected" }),
        () => dispatch({ type: "disconnected" }),
      ),
    );
    cleanups.push(
      injected.on(
        "gnus_networkChanged",
        (network) => {
          identityEvents += 1;
          dispatch({ type: "networkChanged", network });
        },
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
    cleanups.push(detection.onNotReady(() => dispatch({ type: "noBridge" })));
    env.win.addEventListener("visibilitychange", onVisible);
    cleanups.push(() => env.win.removeEventListener("visibilitychange", onVisible));
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
    track,
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
      isVisible: () => win.document.visibilityState === "visible",
      userAgent: win.navigator.userAgent,
      setTimeout: (fn, ms) => win.setTimeout(fn, ms),
      clearTimeout: (id) => win.clearTimeout(id as number),
    });
    stores.set(win, store);
  }
  return store;
}
