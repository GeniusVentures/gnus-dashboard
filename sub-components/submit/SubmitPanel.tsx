import React from "react";
import { submitBlocker } from "../../lib/submit/store";
import { useSession } from "../wallet/SessionProvider";
import { useSubmit } from "./useSubmit";

const SubmitPanel: React.FC = () => {
  const { store: session } = useSession();
  const { state, store } = useSubmit();
  if (state.step === "confirm") {
    return (
      <section role="status">
        <h2 className="h4">Confirm in your wallet</h2>
        <p>
          GeniusWallet shows the cost, the paying wallet and the account that runs the job. Approve or reject it
          there.
        </p>
      </section>
    );
  }
  const blocker = session ? submitBlocker(state, session) : "";
  return (
    <div className="mb-3">
      {state.saveError ? (
        <p role="alert" className="text-danger-emphasis">
          {state.saveError}
        </p>
      ) : null}
      {state.submitError ? (
        <p role="alert" className="text-danger-emphasis">
          {state.submitError}
        </p>
      ) : null}
      {blocker ? (
        <p id="submit-blocker" className="mb-2">
          {blocker}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary"
        disabled={blocker !== null}
        aria-describedby={blocker ? "submit-blocker" : undefined}
        onClick={() => void store.submit()}
      >
        Pay and submit
      </button>
    </div>
  );
};

export default SubmitPanel;
