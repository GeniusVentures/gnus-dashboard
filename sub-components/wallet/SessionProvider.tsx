import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { INITIAL_STATE, SessionState } from "../../lib/session/machine";
import { SessionStore, getSessionStore } from "../../lib/session/store";

interface SessionContextValue {
  store: SessionStore | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const noopSubscribe = (): (() => void) => () => {};

export const SessionProvider: React.FC<{ store?: SessionStore; children: React.ReactNode }> = ({
  store: given,
  children,
}) => {
  // The static export renders on a server with no window; the store exists only in the browser.
  const [value] = useState<SessionContextValue>(() => ({
    store: given ?? (typeof window === "undefined" ? null : getSessionStore()),
  }));
  const { store } = value;
  useEffect(() => {
    store?.start();
  }, [store]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
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
