import React from "react";
import Head from "next/head";
import { GnusContractMismatchError, GnusError } from "../../lib/gnus/errors";
import Amount from "../shared/Amount";
import { useSession } from "../wallet/SessionProvider";
import { useAccountQuery } from "../wallet/useAccountQuery";

const UNEXPECTED = "GeniusWallet returned an unexpected error.";

const stamp = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

const Spinner: React.FC<{ text: string }> = ({ text }) => (
  <span role="status">
    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
    {text}
  </span>
);

const EarningsBody: React.FC = () => {
  const { state } = useSession();
  const accounts = state.accounts;
  const query = useAccountQuery(
    "earnings",
    async (client) => {
      const earnings = await client.getEarnings({});
      // The wallet answers for the current node account only; another account's figures mean the contract is broken.
      if (accounts && earnings.sdkAddress !== accounts.node.sdkAddress) {
        throw new GnusContractMismatchError("gnus_getEarnings", accounts.version);
      }
      return earnings;
    },
    { refetchOnWindowFocus: true },
  );
  const unit = accounts?.unit;
  if (!accounts || !unit) {
    return null;
  }
  if (query.isPending) {
    return <Spinner text="Loading your earnings" />;
  }
  if (query.isError) {
    return (
      <div role="alert" className="text-danger-emphasis">
        <h2 className="h4">Couldn&apos;t load your earnings</h2>
        <p>{query.error instanceof GnusError ? query.error.message : UNEXPECTED}</p>
        <button type="button" className="btn btn-primary" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  const { data } = query;
  const { history } = data.earned;
  return (
    <>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div>
          <div className="small text-body-secondary mb-1">
            Node account balance, held on the SuperGenius network &mdash; not by the wallet that pays
          </div>
          <div className="hero-metric">
            <Amount value={data.balance} decimals={unit.decimals} />
            <span className="unit">{unit.symbol}</span>
          </div>
        </div>
        <div className="d-flex flex-column align-items-end gap-2">
          <span
            className="status-pill"
            data-status={data.processing.isProcessing ? "active" : "idle"}
          >
            {data.processing.isProcessing ? "Processing jobs" : "Idle"}
          </span>
          <div className="d-flex align-items-center gap-2 small text-body-secondary">
            <span role="status">Updated {stamp.format(new Date(query.dataUpdatedAt))}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      <dl className="row">
        <dt className="col-sm-4">Node account balance (SGNUS)</dt>
        <dd className="col-sm-8">
          <Amount value={data.balance} decimals={unit.decimals} symbol={unit.symbol} />
          <div className="small">Held by the node account on the SuperGenius network, not by the wallet that pays.</div>
        </dd>
        <dt className="col-sm-4">Jobs processed</dt>
        <dd className="col-sm-8">
          <Amount value={data.processing.jobsProcessed} decimals={0} />
          {data.processing.jobsProcessed === null ? (
            <div className="small">The network doesn&apos;t report processed jobs per account yet.</div>
          ) : null}
        </dd>
        <dt className="col-sm-4">Earned in total</dt>
        <dd className="col-sm-8">
          <Amount value={data.earned.total} decimals={unit.decimals} symbol={unit.symbol} />
          {data.earned.total === null ? (
            <div className="small">The network doesn&apos;t report earnings per account yet.</div>
          ) : null}
        </dd>
      </dl>
      <p className="small text-body-secondary">
        These figures cover this account only, not its child accounts.
      </p>
      <h2 className="h4 mt-4">Earnings history</h2>
      {history === null ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📈</div>
          <h2>History not available yet</h2>
          <p>Your earnings history shows up here once the network reports it.</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📈</div>
          <h2>No earnings recorded yet</h2>
          <p>Processed jobs land here as they pay out. Submit or process a job to start.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <caption className="visually-hidden">Earnings history</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Amount</th>
                <th scope="col">Job id</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, index) => (
                <tr key={`${row.at}:${row.jobId}:${index}`}>
                  <td>
                    <time dateTime={row.at}>{stamp.format(new Date(row.at))}</time>
                  </td>
                  <td>
                    <Amount value={row.amount} decimals={unit.decimals} symbol={unit.symbol} />
                  </td>
                  <td>{row.jobId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

const EarningsView: React.FC = () => {
  const { state } = useSession();
  return (
    <section className="container py-4">
      <Head>
        <title>Earnings | GNUS.AI Dashboard</title>
      </Head>
      <h1 className="display-6 mb-4">Earnings</h1>
      {state.accounts ? <EarningsBody key={state.accounts.node.sdkAddress} /> : null}
    </section>
  );
};

export default EarningsView;
