import React from "react";
import Amount from "../shared/Amount";
import { GnusError } from "../../lib/gnus/errors";
import { canEstimate } from "../../lib/session/machine";
import { insufficient } from "../../lib/submit/store";
import { useSession } from "../wallet/SessionProvider";
import { useSubmit } from "./useSubmit";

// Wallet text renders as plain text only.
const EstimateError: React.FC<{ error: GnusError }> = ({ error }) => {
  if (error.code === -32010) {
    return (
      <>
        <strong>Price unavailable</strong>
        <br />
        GeniusWallet couldn&apos;t get a price for this job.
        {error.reason ? <> Reason: {error.reason}</> : null}
      </>
    );
  }
  return (
    <>
      {error.message}
      {error.code === -32602 && error.wireMessage ? <> {error.wireMessage}</> : null}
    </>
  );
};

const EstimatePanel: React.FC = () => {
  const { state: session } = useSession();
  const { state, store } = useSubmit();
  const { estimate } = state;
  const unit = session.accounts?.unit;
  const loading = estimate.status === "loading";
  return (
    <div className="mb-3">
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canEstimate(session) || state.parsed.state !== "ok" || loading}
        onClick={() => void store.estimate()}
      >
        Estimate cost
      </button>
      {loading ? (
        <span role="status" className="ms-3">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Asking GeniusWallet for the price...
        </span>
      ) : null}
      {estimate.status === "stale" ? (
        <p role="status" className="mt-2 mb-0">
          The job changed. Estimate again before you submit.
        </p>
      ) : null}
      {estimate.status === "error" ? (
        <p role="alert" className="text-danger-emphasis mt-2 mb-0">
          <EstimateError error={estimate.error} />
        </p>
      ) : null}
      {estimate.status === "ready" && unit ? (
        <>
          <dl className="row mt-3 mb-1">
            <dt className="col-sm-4">Cost</dt>
            <dd className="col-sm-8">
              <Amount value={estimate.estimate.cost} decimals={unit.decimals} symbol={unit.symbol} />
            </dd>
            <dt className="col-sm-4">Paying wallet balance</dt>
            <dd className="col-sm-8">
              <Amount
                value={estimate.estimate.balance}
                decimals={unit.decimals}
                symbol={unit.symbol}
                unavailable="Balance not available"
              />
            </dd>
            <dt className="col-sm-4">Network fee rate</dt>
            <dd className="col-sm-8">
              {estimate.estimate.gas
                ? `${estimate.estimate.gas.gasPriceGwei} gwei (${estimate.estimate.gas.symbol})`
                : "Gas not estimated"}
            </dd>
          </dl>
          <p className="mb-0">GeniusWallet shows the final amount when you confirm.</p>
          {insufficient(estimate.estimate) ? (
            <p role="alert" className="text-danger-emphasis mt-2 mb-0">
              <strong>Not enough GNUS</strong>
              <br />
              This job costs <Amount value={estimate.estimate.cost} decimals={unit.decimals} symbol={unit.symbol} />.
              The paying wallet holds{" "}
              <Amount value={estimate.estimate.balance} decimals={unit.decimals} symbol={unit.symbol} />.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default EstimatePanel;
