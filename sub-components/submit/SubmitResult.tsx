import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { explorerTxUrl } from "../../lib/explorer";
import type { SubmissionOutcome } from "../../lib/gnus/errors";
import type { Outcome } from "../../lib/submit/outcome";
import Amount from "../shared/Amount";
import ExternalLink from "../shared/ExternalLink";
import AddressChip from "../wallet/AddressChip";
import { useSession } from "../wallet/SessionProvider";
import { useSubmit } from "./useSubmit";

export const DISCONNECTED = "This site was disconnected during the payment. Reconnect to see what happened.";

interface Screen {
  heading: string;
  body: string;
  alert?: boolean;
}

// Every outcome's heading and body live here; wallet text never reaches the markup except as text.
function screenFor(outcome: Outcome): Screen {
  switch (outcome.kind) {
    case "done":
      return { heading: "Job submitted", body: "GeniusWallet paid for this job and sent it to the network." };
    case "paidNotProcessed":
      return {
        heading: "Paid but not processed",
        body: "Your payment went through, but the network did not start the job. GeniusWallet keeps the payment record; open GeniusWallet to see it. Submitting this job again would pay again.",
        alert: true,
      };
    case "unconfirmed":
      return {
        heading: "Payment not confirmed",
        body: "GeniusWallet sent the payment, but the network had not confirmed it when GeniusWallet stopped waiting. The GNUS may be spent and the job did not start. Check the payment on the block explorer or in GeniusWallet before you submit again.",
      };
    case "outcomeUnknown":
      return { heading: "Payment status unknown", body: outcome.message };
    case "pending":
      return {
        heading: "Waiting for GeniusWallet",
        body: "GeniusWallet started this payment and hasn't recorded how it ended. If it is still working on it, check again in a moment. Check it in GeniusWallet before you submit again.",
      };
    case "unknown":
      return {
        heading: "Couldn't check this payment",
        body: `GeniusWallet didn't answer the check: ${outcome.message}. Check it in GeniusWallet before you submit again.`,
      };
    case "disconnected":
      return { heading: "Disconnected during the payment", body: DISCONNECTED };
    case "checking":
      return { heading: "Checking your last submit", body: "Asking GeniusWallet what happened to it." };
  }
}

const BurnHash: React.FC<{ hash: string; chainId: number | null }> = ({ hash, chainId }) => {
  const url = explorerTxUrl(chainId, hash);
  return (
    <p className="d-flex flex-wrap align-items-center gap-3">
      <AddressChip label="Burn transaction" address={hash} copyName="Copy burn transaction hash" />
      {url ? <ExternalLink href={url}>View the payment on the block explorer</ExternalLink> : null}
    </p>
  );
};

const Details: React.FC<{ details: SubmissionOutcome; decimals: number; symbol: string; chainId: number | null }> = ({
  details,
  decimals,
  symbol,
  chainId,
}) => (
  <>
    {details.burnTxHash ? <BurnHash hash={details.burnTxHash} chainId={chainId} /> : null}
    <dl className="row mb-3">
      {details.cost ? (
        <>
          <dt className="col-sm-4">Cost</dt>
          <dd className="col-sm-8">
            <Amount value={details.cost} decimals={decimals} symbol={symbol} />
          </dd>
        </>
      ) : null}
      {details.payer ? (
        <>
          <dt className="col-sm-4">Paying wallet</dt>
          <dd className="col-sm-8">
            <AddressChip label="Paying wallet" address={details.payer} copyName="Copy paying wallet address" />
          </dd>
        </>
      ) : null}
      {details.createdAt ? (
        <>
          <dt className="col-sm-4">Started</dt>
          <dd className="col-sm-8">
            <time dateTime={details.createdAt}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(
                new Date(details.createdAt),
              )}
            </time>
          </dd>
        </>
      ) : null}
    </dl>
  </>
);

const SubmitResult: React.FC = () => {
  const { state: session } = useSession();
  const { state, store } = useSubmit();
  const heading = useRef<HTMLHeadingElement>(null);
  const { outcome, draft } = state;
  const kind = outcome?.kind;
  useEffect(() => {
    heading.current?.focus();
  }, [kind]);
  if (!outcome) {
    return null;
  }
  const screen = screenFor(outcome);
  const unit = session.accounts?.unit ?? { decimals: 18, symbol: "GNUS" };
  const chainId = draft?.chainId ?? null;
  const hash = "burnTxHash" in outcome ? outcome.burnTxHash : null;
  const canCheck = outcome.kind === "pending" || outcome.kind === "unknown" || outcome.kind === "disconnected";
  return (
    <section role={screen.alert ? "alert" : "status"} className={screen.alert ? "border border-warning border-3 rounded p-3" : undefined}>
      <h2 ref={heading} tabIndex={-1} className="h4">
        {screen.heading}
      </h2>
      <p className="d-flex align-items-center">
        {outcome.kind === "checking" ? (
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        ) : null}
        {screen.body}
      </p>
      {outcome.kind === "done" ? <p>Job id: {outcome.jobId ?? "Job id pending"}</p> : null}
      {outcome.kind === "outcomeUnknown" && outcome.details ? (
        <Details details={outcome.details} decimals={unit.decimals} symbol={unit.symbol} chainId={chainId} />
      ) : null}
      {outcome.kind !== "outcomeUnknown" && hash ? <BurnHash hash={hash} chainId={chainId} /> : null}
      {outcome.kind !== "checking" ? (
        <p className="d-flex flex-wrap gap-3 align-items-center mb-0">
          {outcome.kind === "done" || outcome.kind === "paidNotProcessed" || outcome.kind === "unconfirmed" ? (
            hash ? <Link href={`/jobs/detail?hash=${hash}`}>View this job</Link> : null
          ) : null}
          {canCheck ? (
            <button type="button" className="btn btn-primary" onClick={() => void store.checkAgain()}>
              Check again
            </button>
          ) : null}
          <button type="button" className="btn border" onClick={store.startOver}>
            Submit another job
          </button>
        </p>
      ) : null}
    </section>
  );
};

export default SubmitResult;
