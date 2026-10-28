import React, { useSyncExternalStore } from "react";
import type { SessionStore } from "../../lib/session/store";
import { getSubmitStore } from "../../lib/submit/store";
import { useSession } from "../wallet/SessionProvider";
import { DISCONNECTED } from "./SubmitResult";

const Notice: React.FC<{ session: SessionStore }> = ({ session }) => {
  const submit = getSubmitStore(session);
  const state = useSyncExternalStore(submit.subscribe, submit.getState, submit.getState);
  if (state.outcome?.kind !== "disconnected" && state.step !== "confirm") {
    return null;
  }
  return (
    <p role="alert" className="alert alert-warning rounded-0 mb-0 text-center">
      {DISCONNECTED}
    </p>
  );
};

/** The wallet gate hides the submit page while the site is disconnected, so a payment caught in that is named here. */
const SubmitAwayNotice: React.FC = () => {
  const { state, store } = useSession();
  return store && state.accounts === null && state.phase !== "detecting" ? <Notice session={store} /> : null;
};

export default SubmitAwayNotice;
