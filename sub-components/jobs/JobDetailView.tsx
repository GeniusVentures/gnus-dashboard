import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { GnusContractMismatchError, GnusError } from "../../lib/gnus/errors";
import type { JobLookup } from "../../lib/gnus/schema";
import { JobRef, cidHref, isFinal, parseJobRef } from "../../lib/jobs";
import Amount from "../shared/Amount";
import ExternalLink from "../shared/ExternalLink";
import AddressChip from "../wallet/AddressChip";
import { useSession } from "../wallet/SessionProvider";
import { useAccountQuery } from "../wallet/useAccountQuery";
import JobStatusBadge from "./JobStatusBadge";
import { useJobUpdates } from "./useJobUpdates";

const UNEXPECTED = "GeniusWallet returned an unexpected error.";
const NOT_RECORDED = "Not recorded";
// A slow re-read while the job can still change; paused while the tab is hidden.
const POLL_MS = 30000;

const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

const NoJob: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div>
    <h2 className="h4">{title}</h2>
    <p>{body}</p>
    <Link href="/jobs">My jobs</Link>
  </div>
);

const Result: React.FC<{ job: NonNullable<JobLookup> }> = ({ job }) => {
  const { result } = job;
  return (
    <>
      <h2 className="h4 mt-4">Result</h2>
      {result === null ? (
        <>
          <p className="mb-1">Result not available yet</p>
          <p>GeniusWallet can&apos;t fetch job results yet. They show up here when it can.</p>
        </>
      ) : (
        <>
          {result.cids.length === 0 ? (
            <p>No result files</p>
          ) : (
            <ul className="list-unstyled">
              {result.cids.map((cid) => {
                const href = cidHref(cid);
                return (
                  <li key={cid} className="d-flex flex-wrap align-items-center gap-3">
                    <code>{cid}</code>
                    {href ? (
                      <ExternalLink href={href} aria-label={`Open in IPFS gateway: ${cid}`}>
                        Open in IPFS gateway
                      </ExternalLink>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {result.data ? (
            <pre
              tabIndex={0}
              aria-label="Result data"
              className="border rounded p-2 overflow-auto"
              style={{ maxHeight: "20rem" }}
            >
              {JSON.stringify(result.data, null, 2)}
            </pre>
          ) : null}
        </>
      )}
      {job.error ? (
        <>
          <h2 className="h4 mt-4">Error</h2>
          <p>{job.error}</p>
        </>
      ) : null}
    </>
  );
};

const Fields: React.FC<{ job: NonNullable<JobLookup> }> = ({ job }) => {
  const { state } = useSession();
  const unit = state.accounts?.unit;
  return (
    <>
      <p className="d-flex flex-wrap gap-3">
        {job.burnTxHash ? (
          <AddressChip label="Burn transaction" address={job.burnTxHash} copyName="Copy burn transaction hash" />
        ) : (
          <span>Burn transaction {NOT_RECORDED}</span>
        )}
        {job.sdkAddress ? (
          <AddressChip label="Node account" address={job.sdkAddress} copyName="Copy node account address" />
        ) : (
          <span>Node account {NOT_RECORDED}</span>
        )}
      </p>
      <dl className="row">
        <dt className="col-sm-3">Status</dt>
        <dd className="col-sm-9">
          <JobStatusBadge status={job.status} explain />
        </dd>
        <dt className="col-sm-3">Job id</dt>
        <dd className="col-sm-9">
          {job.jobId ?? (
            <>
              Job id pending
              <div className="small">The network doesn&apos;t return job ids yet.</div>
            </>
          )}
        </dd>
        <dt className="col-sm-3">Submitted from</dt>
        <dd className="col-sm-9">{job.origin ?? NOT_RECORDED}</dd>
        <dt className="col-sm-3">Submitted</dt>
        <dd className="col-sm-9">
          {job.submittedAt ? (
            <time dateTime={job.submittedAt}>{when.format(new Date(job.submittedAt))}</time>
          ) : (
            NOT_RECORDED
          )}
        </dd>
        <dt className="col-sm-3">Cost</dt>
        <dd className="col-sm-9">
          {unit && job.cost ? <Amount value={job.cost} decimals={unit.decimals} symbol={unit.symbol} /> : NOT_RECORDED}
        </dd>
        <dt className="col-sm-3">Submit key</dt>
        <dd className="col-sm-9">
          <code>{job.idempotencyKey}</code>
        </dd>
      </dl>
      <Result job={job} />
    </>
  );
};

const JobDetailBody: React.FC<{ jobRef: JobRef }> = ({ jobRef }) => {
  const { state } = useSession();
  const accounts = state.accounts;
  const [selector, value] =
    "burnTxHash" in jobRef ? (["burnTxHash", jobRef.burnTxHash] as const) : (["jobId", jobRef.jobId] as const);
  const [poll, setPoll] = useState<number | false>(false);
  useJobUpdates();
  const query = useAccountQuery(
    `job:${selector}:${value}`,
    async (client) => {
      const job = await client.getJob(
        "burnTxHash" in jobRef ? { burnTxHash: jobRef.burnTxHash } : { jobId: jobRef.jobId },
      );
      // The wallet answers only for the current node account; another account's job means the contract is broken.
      if (job && accounts && job.sdkAddress !== null && job.sdkAddress !== accounts.node.sdkAddress) {
        throw new GnusContractMismatchError("gnus_getJob", accounts.version);
      }
      return job;
    },
    { refetchOnWindowFocus: true, refetchInterval: poll },
  );
  const live = query.data != null && !isFinal(query.data.status);
  useEffect(() => {
    setPoll(live ? POLL_MS : false);
  }, [live]);
  if (query.isPending) {
    return (
      <p role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        Loading this job
      </p>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="text-danger-emphasis">
        <h2 className="h4">Couldn&apos;t load this job</h2>
        <p>{query.error instanceof GnusError ? query.error.message : UNEXPECTED}</p>
        <button type="button" className="btn btn-primary" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (query.data === null) {
    return (
      <NoJob
        title="No job found"
        body={`GeniusWallet has no job with this ${selector === "burnTxHash" ? "burn hash" : "job id"} for this account.`}
      />
    );
  }
  return <Fields job={query.data} />;
};

const JobDetailView: React.FC = () => {
  const router = useRouter();
  const { state } = useSession();
  const accounts = state.accounts;
  const jobRef = router.isReady ? parseJobRef(router.query) : null;
  return (
    <section className="container py-4">
      <Head>
        <title>Job detail | GNUS.AI Dashboard</title>
      </Head>
      <h1 className="display-6 mb-4">Job detail</h1>
      {!router.isReady ? (
        <p role="status">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Loading this job
        </p>
      ) : !jobRef ? (
        <NoJob title="This link doesn't name a job." body="Open a job from your list to see it here." />
      ) : accounts ? (
        <JobDetailBody key={`${accounts.node.sdkAddress}:${JSON.stringify(jobRef)}`} jobRef={jobRef} />
      ) : null}
    </section>
  );
};

export default JobDetailView;
