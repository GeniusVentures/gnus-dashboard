import { INITIALIZED_EVENT } from "../schema";
import type { InjectedProvider, Listener, Transport, WindowLike } from "./types";

export function createInjectedTransport(win: WindowLike): Transport {
  const stored = new Map<string, Set<Listener>>();
  // The provider object the stored listeners are attached to.
  let tracked: InjectedProvider | null = null;

  function forEachStored(fn: (event: string, listener: Listener) => void): void {
    for (const [event, listeners] of stored) {
      for (const listener of listeners) {
        fn(event, listener);
      }
    }
  }

  // The shim can be injected twice as a fresh object; events from the old one stop (Pitfall 2).
  function moveTo(next: InjectedProvider): void {
    const previous = tracked;
    tracked = next;
    forEachStored((event, listener) => {
      try {
        previous?.removeListener(event, listener);
      } catch {
        // The old provider may be dead.
      }
      next.on(event, listener);
    });
  }

  function onInitialized(): void {
    const next = win.gnus;
    if (next && next !== tracked) {
      moveTo(next);
    }
  }

  win.addEventListener(INITIALIZED_EVENT, onInitialized);

  return {
    // No timeout: the first call can wait on a human connect prompt (contract section 6).
    request(args) {
      const provider = win.gnus;
      if (!provider) {
        return Promise.reject({ code: 4900, message: "GeniusWallet is not ready" });
      }
      return provider.request(args);
    },
    on(event, listener) {
      let listeners = stored.get(event);
      if (!listeners) {
        listeners = new Set();
        stored.set(event, listeners);
      }
      listeners.add(listener);
      const provider = win.gnus;
      if (provider && provider !== tracked) {
        moveTo(provider);
      } else {
        tracked?.on(event, listener);
      }
    },
    removeListener(event, listener) {
      stored.get(event)?.delete(listener);
      tracked?.removeListener(event, listener);
    },
    close() {
      win.removeEventListener(INITIALIZED_EVENT, onInitialized);
      forEachStored((event, listener) => tracked?.removeListener(event, listener));
      stored.clear();
      tracked = null;
    },
  };
}
