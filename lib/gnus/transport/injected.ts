import type { Listener, Transport, WindowLike } from "./types";

export function createInjectedTransport(win: WindowLike): Transport {
  const added = new Map<string, Set<Listener>>();

  return {
    request(args) {
      const provider = win.gnus;
      if (!provider) {
        return Promise.reject({ code: 4900, message: "GeniusWallet is not ready" });
      }
      return provider.request(args);
    },
    on(event, listener) {
      let listeners = added.get(event);
      if (!listeners) {
        listeners = new Set();
        added.set(event, listeners);
      }
      listeners.add(listener);
      win.gnus?.on(event, listener);
    },
    removeListener(event, listener) {
      added.get(event)?.delete(listener);
      win.gnus?.removeListener(event, listener);
    },
    close() {
      for (const [event, listeners] of added) {
        for (const listener of listeners) {
          win.gnus?.removeListener(event, listener);
        }
      }
      added.clear();
    },
  };
}
