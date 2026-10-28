import React from "react";
import { render } from "@testing-library/react";
import { createMockProvider } from "../../lib/gnus/mock/provider";
import { createSessionStore } from "../../lib/session/store";
import { SessionProvider } from "../../sub-components/wallet/SessionProvider";

import * as walletconnect from "../../lib/gnus/transport/walletconnect";

// A WalletConnect loader over a fake relay, with the real transport.
export const relayLoader = (relay) =>
  jest.fn(async () => ({
    createWalletConnectTransport: walletconnect.createWalletConnectTransport,
    classifyNamespaces: walletconnect.classifyNamespaces,
    createClient: async () => relay,
  }));

export const WALLET_UA = "Mozilla/5.0 GeniusWallet/4.0.0 gnus/1";

// A fake window that already holds a mock provider (or none), with timers read at call time so jest fake timers apply.
export function makeEnv({ provider, userAgent = "Mozilla/5.0", loadWalletConnect } = {}) {
  const win = new EventTarget();
  if (provider) {
    win.gnus = provider;
  }
  return {
    win,
    userAgent,
    loadWalletConnect,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
}

// provider: null means no wallet; leave it out for a mock of the given profile.
export function makeStore({ profile, provider = createMockProvider({ profile }), userAgent, loadWalletConnect } = {}) {
  const env = makeEnv({ provider, userAgent, loadWalletConnect });
  return { store: createSessionStore(env), provider, env };
}

export function renderWithSession(ui, { strict = false, ...options } = {}) {
  const { store, provider } = makeStore(options);
  const tree = <SessionProvider store={store}>{ui}</SessionProvider>;
  const result = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
  return { ...result, store, provider };
}
