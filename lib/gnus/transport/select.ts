import { INITIALIZED_EVENT } from "../schema";
import type { WindowLike } from "./types";

export const WALLET_WAIT_MS = 3000;

export type TransportChoice = "injected" | "walletconnect";

export interface WalletMarker {
  appVersion: string;
  contractVersion: string;
}

const MARKER = / GeniusWallet\/(\S+) gnus\/(\S+)$/;

/** Matches the contract's suffix " GeniusWallet/<app version> gnus/<contract version>" at the end of the UA. */
export function parseWalletMarker(userAgent: string): WalletMarker | null {
  const match = MARKER.exec(userAgent);
  return match ? { appVersion: match[1], contractVersion: match[2] } : null;
}

export interface DetectEnv {
  userAgent: string;
  win: WindowLike;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface Detection {
  /** The first decision. */
  readonly choice: Promise<TransportChoice>;
  /** Null while waiting. */
  current(): TransportChoice | null;
  /** Fires once if a late injection takes over from walletconnect. Returns unsubscribe. */
  onSwitch(handler: (choice: "injected") => void): () => void;
  dispose(): void;
}

export function detectTransport(
  env: DetectEnv,
  options: { hasActiveWalletConnectSession(): boolean },
): Detection {
  const insideWallet = parseWalletMarker(env.userAgent) !== null;
  const switchHandlers = new Set<(choice: "injected") => void>();
  let current: TransportChoice | null = null;
  let timer: unknown = null;
  let listening = false;
  let resolveChoice: (choice: TransportChoice) => void = () => {};
  const choice = new Promise<TransportChoice>((resolve) => {
    resolveChoice = resolve;
  });

  const isWallet = (): boolean => env.win.gnus?.isGeniusWallet === true;

  function stopListening(): void {
    if (listening) {
      env.win.removeEventListener(INITIALIZED_EVENT, onInitialized);
      listening = false;
    }
  }

  function stopTimer(): void {
    if (timer !== null) {
      env.clearTimeout(timer);
      timer = null;
    }
  }

  function onInitialized(): void {
    if (!isWallet()) {
      return;
    }
    if (current === null) {
      current = "injected";
      stopTimer();
      stopListening();
      resolveChoice("injected");
    } else if (current === "walletconnect") {
      // The one allowed change: a late injection, and only while no WalletConnect session exists.
      stopListening();
      if (!options.hasActiveWalletConnectSession()) {
        current = "injected";
        for (const handler of [...switchHandlers]) {
          handler("injected");
        }
      }
    }
  }

  // Listener first, then the read: an announcement between the two would otherwise be lost.
  env.win.addEventListener(INITIALIZED_EVENT, onInitialized);
  listening = true;
  onInitialized();
  if (current === null && !insideWallet) {
    timer = env.setTimeout(() => {
      timer = null;
      if (current === null) {
        current = "walletconnect";
        resolveChoice("walletconnect");
      }
    }, WALLET_WAIT_MS);
  }

  return {
    choice,
    current: () => current,
    onSwitch(handler) {
      switchHandlers.add(handler);
      return () => {
        switchHandlers.delete(handler);
      };
    },
    dispose() {
      stopListening();
      stopTimer();
      switchHandlers.clear();
    },
  };
}
