import { useSyncExternalStore } from "react";
import { SubmitState, SubmitStore, getSubmitStore } from "../../lib/submit/store";
import { useSession } from "../wallet/SessionProvider";

/** The submit flow of the current session, read through useSyncExternalStore. */
export function useSubmit(): { state: SubmitState; store: SubmitStore } {
  const { store: session } = useSession();
  if (!session) {
    throw new Error("useSubmit needs a connected session");
  }
  const store = getSubmitStore(session);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { state, store };
}
