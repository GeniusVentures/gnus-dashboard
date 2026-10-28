import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { explorerTxUrl } from "../../lib/explorer";
import AddressChip from "../wallet/AddressChip";
import ExternalLink from "../shared/ExternalLink";
import { useSubmit } from "./useSubmit";

const SubmitResult: React.FC = () => {
  const { state, store } = useSubmit();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const { outcome, draft } = state;
  if (!outcome) {
    return null;
  }
  const url = explorerTxUrl(draft?.chainId ?? null, outcome.burnTxHash);
  return (
    <section role="status">
      <h2 ref={heading} tabIndex={-1} className="h4">
        Job submitted
      </h2>
      <p>GeniusWallet paid for this job and sent it to the network.</p>
      <p>Job id: {outcome.jobId ?? "Job id pending"}</p>
      <p>
        <AddressChip label="Burn transaction" address={outcome.burnTxHash} copyName="Copy burn transaction hash" />
      </p>
      {url ? (
        <p>
          <ExternalLink href={url}>View the payment on the block explorer</ExternalLink>
        </p>
      ) : null}
      <p className="d-flex flex-wrap gap-3 align-items-center">
        <Link href={`/jobs/detail?hash=${outcome.burnTxHash}`}>View this job</Link>
        <button type="button" className="btn btn-outline-secondary" onClick={store.startOver}>
          Submit another job
        </button>
      </p>
    </section>
  );
};

export default SubmitResult;
