import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { GnusContractMismatchError, GnusError } from "../../lib/gnus/errors";
import type { Job, JobList } from "../../lib/gnus/schema";
import { isMarked, shortJobId } from "../../lib/jobs";
import Amount from "../shared/Amount";
import { useSession } from "../wallet/SessionProvider";
import { useAccountInfiniteQuery } from "../wallet/useAccountQuery";
import JobStatusBadge from "./JobStatusBadge";

const PAGE_SIZE = 20;
const UNEXPECTED = "GeniusWallet returned an unexpected error.";

const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

// A job that lands between two pages shifts an offset cursor, so the same job can arrive twice.
function distinct(pages: JobList[]): Job[] {
  const seen = new Map<string, Job>();
  for (const page of pages) {
    for (const job of page.jobs) {
      if (!seen.has(job.burnTxHash)) {
        seen.set(job.burnTxHash, job);
      }
    }
  }
  return [...seen.values()];
}

const Spinner: React.FC<{ text: string }> = ({ text }) => (
  <p role="status">
    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
    {text}
  </p>
);

const JobsBody: React.FC = () => {
  const { state } = useSession();
  const accounts = state.accounts;
  const query = useAccountInfiniteQuery(
    "jobs",
    async (client, cursor): Promise<JobList> => {
      const page = await client.listJobs(cursor === undefined ? { limit: PAGE_SIZE } : { limit: PAGE_SIZE, cursor });
      // The wallet lists only the current node account's jobs; a row for another account means the contract is broken.
      if (accounts && page.jobs.some((job) => job.sdkAddress !== accounts.node.sdkAddress)) {
        throw new GnusContractMismatchError("gnus_listJobs", accounts.version);
      }
      return page;
    },
    (last) => last.nextCursor,
  );
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  const focusFrom = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const jobs = distinct(query.data?.pages ?? []);

  // After "Load more jobs" the focus moves to the first new row so a keyboard user does not start over.
  useEffect(() => {
    if (focusFrom.current !== null && jobs.length > focusFrom.current) {
      links.current[focusFrom.current]?.focus();
      setAnnouncement(`Showing ${jobs.length} jobs`);
      focusFrom.current = null;
    }
  }, [jobs.length]);

  const unit = accounts?.unit;
  if (query.isPending) {
    return <Spinner text="Loading your jobs" />;
  }
  if (query.isError && jobs.length === 0) {
    const error = query.error;
    return (
      <div role="alert" className="text-danger-emphasis">
        <h2 className="h4">Couldn&apos;t load your jobs</h2>
        <p>{error instanceof GnusError ? error.message : UNEXPECTED}</p>
        <button type="button" className="btn btn-primary" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  }
  if (jobs.length === 0 || !unit) {
    return (
      <div>
        <h2 className="h4">No jobs yet</h2>
        <p>Jobs you submit from this account show up here.</p>
        <Link href="/submit">Submit a job</Link>
      </div>
    );
  }
  const loadMore = (): void => {
    focusFrom.current = jobs.length;
    void query.fetchNextPage();
  };
  return (
    <>
      <div className="table-responsive">
        <table className="table align-middle">
          <caption className="visually-hidden">Your jobs, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Submitted</th>
              <th scope="col">Cost</th>
              <th scope="col">From</th>
              <th scope="col">Job</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, index) => (
              <tr key={job.burnTxHash}>
                <td>
                  <JobStatusBadge status={job.status} explain={isMarked(job.status)} />
                </td>
                <td>
                  <time dateTime={job.submittedAt}>{when.format(new Date(job.submittedAt))}</time>
                </td>
                <td>
                  <Amount value={job.cost} decimals={unit.decimals} symbol={unit.symbol} />
                </td>
                <td>{job.origin}</td>
                <td>
                  <Link
                    href={`/jobs/detail?hash=${job.burnTxHash}`}
                    ref={(element) => {
                      links.current[index] = element;
                    }}
                  >
                    {shortJobId(job)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.isFetchNextPageError ? (
        <div role="alert" className="text-danger-emphasis mb-2">
          <p className="mb-1">
            Couldn&apos;t load more jobs: {query.error instanceof GnusError ? query.error.message : UNEXPECTED}
          </p>
        </div>
      ) : null}
      {query.hasNextPage || query.isFetchNextPageError ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={query.isFetchingNextPage}
          onClick={loadMore}
        >
          {query.isFetchingNextPage ? "Loading more jobs" : query.isFetchNextPageError ? "Retry" : "Load more jobs"}
        </button>
      ) : null}
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
    </>
  );
};

const JobsView: React.FC = () => {
  const { state } = useSession();
  return (
    <section className="container py-4">
      <Head>
        <title>My jobs | GNUS.AI Dashboard</title>
      </Head>
      <h1 className="display-6 mb-4">My jobs</h1>
      {state.accounts ? <JobsBody key={state.accounts.node.sdkAddress} /> : null}
    </section>
  );
};

export default JobsView;
