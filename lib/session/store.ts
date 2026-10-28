import { GnusClient, createGnusClient } from "../gnus/client";
import { GnusError, normalizeError } from "../gnus/errors";
import { createInjectedTransport } from "../gnus/transport/injected";
import { DetectEnv, detectTransport } from "../gnus/transport/select";
import type { Transport } from "../gnus/transport/types";
import type {
  SignClientLike,
  WalletConnectLoader,
  WalletConnectModule,
  WcSession,
} from "../gnus/transport/walletconnect";
import { INITIAL_STATE, SessionEvent, SessionState, reduce } from "./machine";

export interface SessionEnv extends DetectEnv {
  /** False while the tab is hidden. Left out, the tab counts as visible. */
  isVisible?(): boolean;
  /** Loads the WalletConnect code on the browser path. Left out, the browser path ends at "GeniusWallet required". */
  loadWalletConnect?: WalletConnectLoader;
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
  let walletConnect: SignClientLike | null = null;
  let wcModule: WalletConnectModule | null = null;
  let wcSession: WcSession | null = null;
  // Counts pairings, so an answer to a code that was replaced is ignored.
  let pairingRun = 0;
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

  function attach(transport: Transport, kind: "injected" | "walletconnect"): void {
    dispatch({ type: "transportChosen", transport: kind });
    const live = createGnusClient(transport);
    client = live;
    cleanups.push(() => live.close());
    cleanups.push(
      live.on(
        "gnus_accountsChanged",
        (accounts) => {
          identityEvents += 1;
          dispatch({ type: "accountsReceived", accounts });
        },
        (error) => dispatch({ type: "errorReported", error, source: "identity" }),
      ),
    );
    const ended = (): void => dispatch({ type: kind === "walletconnect" ? "sessionEnded" : "disconnected" });
    cleanups.push(live.on("disconnect", ended, ended));
    cleanups.push(
      live.on(
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

  function closeWalletConnect(): void {
    const closing = walletConnect;
    walletConnect = null;
    wcSession = null;
    pairingRun += 1;
    closing?.close().catch(() => {});
  }

  function attachSession(session: WcSession): void {
    if (!walletConnect || !wcModule) {
      return;
    }
    wcSession = session;
    attach(wcModule.createWalletConnectTransport(walletConnect, session), "walletconnect");
  }

  function pair(): void {
    const wc = walletConnect;
    if (!wc) {
      return;
    }
    const run = (pairingRun += 1);
    void (async () => {
      try {
        const proposal = await wc.connect();
        if (disposed || run !== pairingRun) {
          return;
        }
        dispatch({ type: "pairingStarted", uri: proposal.uri ?? "" });
        const session = await proposal.approval();
        if (!disposed && run === pairingRun) {
          attachSession(session);
        }
      } catch {
        // Declined and expired proposals get their own handling in the next step.
      }
    })();
  }

  async function startBrowserPath(): Promise<void> {
    let wc: SignClientLike | null = null;
    try {
      const loaded = env.loadWalletConnect ? await env.loadWalletConnect() : null;
      wc = loaded ? await loaded.createClient() : null;
      wcModule = loaded;
    } catch {
      wc = null;
    }
    if (disposed) {
      void wc?.close();
      return;
    }
    if (!wc) {
      dispatch({ type: "detected", choice: "walletconnect" });
      return;
    }
    walletConnect = wc;
    cleanups.push(closeWalletConnect);
    dispatch({ type: "transportChosen", transport: "walletconnect" });
    pair();
  }

  function start(): void {
    if (started) {
      return;
    }
    started = true;
    const detection = detectTransport(env, { hasActiveWalletConnectSession: () => wcSession !== null });
    cleanups.push(() => detection.dispose());
    cleanups.push(detection.onNotReady(() => dispatch({ type: "noBridge" })));
    env.win.addEventListener("visibilitychange", onVisible);
    cleanups.push(() => env.win.removeEventListener("visibilitychange", onVisible));
    cleanups.push(
      detection.onSwitch(() => {
        if (!disposed) {
          closeWalletConnect();
          dispatch({ type: "lateInjection" });
          attach(createInjectedTransport(env.win), "injected");
        }
      }),
    );
    void detection.choice.then((choice) => {
      if (disposed) {
        return;
      }
      if (choice === "injected") {
        dispatch({ type: "detected", choice });
        attach(createInjectedTransport(env.win), "injected");
      } else {
        void startBrowserPath();
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

let loadWalletConnect: WalletConnectLoader = () => import("../gnus/transport/walletconnect");

/** For the dev server only: swaps the real WalletConnect code for a fake relay. Production code never calls it. */
export function setWalletConnectLoader(loader: WalletConnectLoader): void {
  loadWalletConnect = loader;
}

/** One store per window, made on first use and never at import. */
export function getSessionStore(win: Window = window): SessionStore {
  let store = stores.get(win);
  if (!store) {
    store = createSessionStore({
      win: win as unknown as DetectEnv["win"],
      isVisible: () => win.document.visibilityState === "visible",
      userAgent: win.navigator.userAgent,
      loadWalletConnect: () => loadWalletConnect(),
      setTimeout: (fn, ms) => win.setTimeout(fn, ms),
      clearTimeout: (id) => win.clearTimeout(id as number),
    });
    stores.set(win, store);
  }
  return store;
}
