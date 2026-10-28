import React from "react";
import { submitBlocker } from "../../lib/submit/store";
import Amount from "../shared/Amount";
import { useSession } from "../wallet/SessionProvider";
import { useSubmit } from "./useSubmit";

const CANCEL_NOTE =
  "This page can't close GeniusWallet's confirm. Reject it in GeniusWallet to cancel; until then this page waits for its answer.";
const NOT_SEEN =
  "GeniusWallet has no record of this submit. If its confirm is still open, answer it there. Submitting the same job again from this browser reuses this submit's key, and GeniusWallet never pays twice for one key.";

const SubmitPanel: React.FC = () => {
  const { state: sessionState, store: session } = useSession();
  const { state, store } = useSubmit();
  const unit = sessionState.accounts?.unit;
  if (state.step === "confirm") {
    return (
      <section>
        <h2 className="h4">Confirm in your wallet</h2>
        <p role="status">
          GeniusWallet shows the cost, the paying wallet and the account that runs the job. Approve or reject it
          there.
          {sessionState.transport === "walletconnect" ? " Open GeniusWallet where you scanned the code." : null}
        </p>
        <button type="button" className="btn border" onClick={store.showCancelNote}>
          Cancel
        </button>
        <div role="status">{state.cancelNote ? <p className="mt-2 mb-0">{CANCEL_NOTE}</p> : null}</div>
      </section>
    );
  }
  const blocker = session ? submitBlocker(state, session) : "";
  const failure = state.submitError;
  const estimate = state.estimate.status === "ready" ? state.estimate.estimate : null;
  return (
    <div className="mb-3">
      {state.saveError ? (
        <p role="alert" className="text-danger-emphasis">
          {state.saveError}
        </p>
      ) : null}
      {failure ? (
        <div role="alert" className="text-danger-emphasis mb-2">
          <p className="mb-1">
            {failure.error.message}
            {failure.error.code === -32602 && failure.error.reason !== "idempotency_key_reused" && failure.error.wireMessage
              ? ` ${failure.error.wireMessage}`
              : null}
          </p>
          {failure.nothingSpentLine ? <p className="mb-1">Nothing was spent.</p> : null}
          {failure.error.code === -32011 && estimate && unit ? (
            <p className="mb-1">
              This job costs <Amount value={estimate.cost} decimals={unit.decimals} symbol={unit.symbol} />. The paying
              wallet holds{" "}
              <Amount value={estimate.balance} decimals={unit.decimals} symbol={unit.symbol} unavailable="an unknown amount" />.
            </p>
          ) : null}
          {failure.newKey ? (
            <button type="button" className="btn border" onClick={store.newKey}>
              Start a new submit
            </button>
          ) : null}
        </div>
      ) : null}
      {state.notSeen ? (
        <p role="status" className="mb-2">
          {NOT_SEEN}
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
