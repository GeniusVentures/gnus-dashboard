import { INITIALIZED_EVENT } from "../schema";
import type { WindowLike } from "./types";

export const WALLET_WAIT_MS = 3000;

export type TransportChoice = "injected" | "walletconnect";

export interface DetectEnv {
  userAgent: string;
  win: WindowLike;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface Detection {
  readonly choice: Promise<TransportChoice>;
  current(): TransportChoice | null;
  dispose(): void;
}

export function detectTransport(
  env: DetectEnv,
  _options: { hasActiveWalletConnectSession(): boolean },
): Detection {
  let current: TransportChoice | null = null;
  let timer: unknown = null;
  let resolveChoice: (choice: TransportChoice) => void = () => {};
  const choice = new Promise<TransportChoice>((resolve) => {
    resolveChoice = resolve;
  });

  const isWallet = () => env.win.gnus?.isGeniusWallet === true;

  function settle(value: TransportChoice): void {
    if (current !== null) {
      return;
    }
    current = value;
    dispose();
    resolveChoice(value);
  }

  function onInitialized(): void {
    if (isWallet()) {
      settle("injected");
    }
  }

  function dispose(): void {
    env.win.removeEventListener(INITIALIZED_EVENT, onInitialized);
    if (timer !== null) {
      env.clearTimeout(timer);
      timer = null;
    }
  }

  // Listener first, then the read: an event fired between the two would otherwise be lost.
  env.win.addEventListener(INITIALIZED_EVENT, onInitialized);
  if (isWallet()) {
    settle("injected");
  } else {
    timer = env.setTimeout(() => settle("walletconnect"), WALLET_WAIT_MS);
  }

  return { choice, current: () => current, dispose };
}
