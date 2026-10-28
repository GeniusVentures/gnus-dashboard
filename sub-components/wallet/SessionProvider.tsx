import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeError } from "../../lib/gnus/errors";
import { INITIAL_STATE, SessionState } from "../../lib/session/machine";
import { SessionStore, getSessionStore } from "../../lib/session/store";

interface SessionContextValue {
  store: SessionStore | null;
  queryClient: QueryClient;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const noopSubscribe = (): (() => void) => () => {};

// Account query keys are [kind, network, sdkAddress]; the last two name the identity the data belongs to.
const identityOfKey = (key: readonly unknown[]): string => JSON.stringify(key.slice(1));

function currentIdentity(state: SessionState): string | null {
  return state.accounts ? JSON.stringify([state.accounts.network, state.accounts.node.sdkAddress]) : null;
}

function createContextValue(given: SessionStore | undefined): SessionContextValue {
  // The static export renders on a server with no window; the store exists only in the browser.
  const store = given ?? (typeof window === "undefined" ? null : getSessionStore());
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => store?.report(normalizeError(error)) }),
    defaultOptions: {
      queries: { networkMode: "always", retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
      mutations: { networkMode: "always", retry: 0 },
    },
  });
  return { store, queryClient };
}

export const SessionProvider: React.FC<{ store?: SessionStore; children: React.ReactNode }> = ({
  store: given,
  children,
}) => {
  const [value] = useState(() => createContextValue(given));
  const { store, queryClient } = value;

  useEffect(() => {
    store?.start();
  }, [store]);

  // When the account or network changes, everything cached for another identity is cancelled and removed.
  useEffect(() => {
    if (!store) {
      return undefined;
    }
    return store.subscribe(() => {
      const current = currentIdentity(store.getState());
      if (store.getState().phase === "disconnected") {
        void queryClient.cancelQueries();
        queryClient.removeQueries();
      }
      if (current === null) {
        return;
      }
      const stale = (query: { queryKey: readonly unknown[] }): boolean => identityOfKey(query.queryKey) !== current;
      void queryClient.cancelQueries({ predicate: stale });
      queryClient.removeQueries({ predicate: stale });
    });
  }, [store, queryClient]);

  return (
    <SessionContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionContext.Provider>
  );
};

export function useSession(): { state: SessionState; store: SessionStore | null } {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  const { store } = value;
  const state = useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    store ? store.getState : () => INITIAL_STATE,
    () => INITIAL_STATE,
  );
  return { state, store };
}
