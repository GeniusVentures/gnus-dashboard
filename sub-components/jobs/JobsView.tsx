import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { GnusContractMismatchError, GnusError } from "../../lib/gnus/errors";
import type { Job, JobList } from "../../lib/gnus/schema";
import { isFinal, isMarked, matchesSearch, searchTarget, shortJobId } from "../../lib/jobs";
import Amount from "../shared/Amount";
import { useSession } from "../wallet/SessionProvider";
import { useAccountInfiniteQuery } from "../wallet/useAccountQuery";
import JobStatusBadge from "./JobStatusBadge";
import { useJobUpdates } from "./useJobUpdates";

const PAGE_SIZE = 20;
// A slow re-read while a job on screen can still change; never faster, and paused while the tab is hidden.
const POLL_MS = 30000;
const UNEXPECTED = "GeniusWallet returned an unexpected error.";
const PARTIAL_HASH = "Enter the whole burn hash (0x and 64 characters) to look it up.";

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
  const [poll, setPoll] = useState<number | false>(false);
  useJobUpdates();
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
    { refetchOnWindowFocus: true, refetchInterval: poll },
  );
  const router = useRouter();
  const links = useRef(new Map<string, HTMLAnchorElement>());
  const focusFrom = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [term, setTerm] = useState("");
  const [searchNote, setSearchNote] = useState("");
  const jobs = distinct(query.data?.pages ?? []);
  const shown = jobs.filter((job) => matchesSearch(job, term));
  const live = jobs.some((job) => !isFinal(job.status));
  useEffect(() => {
    setPoll(live ? POLL_MS : false);
  }, [live]);

  // After "Load more jobs" the focus moves to the first new row so a keyboard user does not start over.
  useEffect(() => {
    if (focusFrom.current !== null && jobs.length > focusFrom.current) {
      const first = jobs[focusFrom.current];
      links.current.get(first.burnTxHash)?.focus();
      setAnnouncement(`Showing ${jobs.length} jobs`);
      focusFrom.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the count grows; the rows are read from that render
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
  // Typing only filters what is loaded; the exact lookup is the detail page's own gnus_getJob.
  const search = (event: React.FormEvent): void => {
    event.preventDefault();
    const target = searchTarget(term);
    if (target === null) {
      return;
    }
    const matches = jobs.filter((job) => matchesSearch(job, term));
    if (matches.length === 1) {
      void router.push(`/jobs/detail?hash=${matches[0].burnTxHash}`);
    } else if ("burnTxHash" in target) {
      void router.push(`/jobs/detail?hash=${target.burnTxHash}`);
    } else if ("jobId" in target) {
      void router.push(`/jobs/detail?id=${encodeURIComponent(target.jobId)}`);
    } else {
      setSearchNote(PARTIAL_HASH);
    }
  };
  return (
    <>
      <form role="search" className="d-flex flex-wrap align-items-end gap-2 mb-3" onSubmit={search}>
        <div>
          <label htmlFor="job-search" className="form-label">
            Search by job id or burn hash
          </label>
          <input
            id="job-search"
            type="search"
            className="form-control"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setSearchNote("");
            }}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>
      {searchNote ? (
        <p role="alert" className="text-danger-emphasis">
          {searchNote}
        </p>
      ) : null}
      {shown.length === 0 ? (
        <p role="status">No loaded job matches.</p>
      ) : (
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
              {shown.map((job) => (
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
                        if (element) {
                          links.current.set(job.burnTxHash, element);
                        } else {
                          links.current.delete(job.burnTxHash);
                        }
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
      )}
      {query.isFetchNextPageError ? (
        <div role="alert" className="text-danger-emphasis mb-2">
          <p className="mb-1">
            Couldn&apos;t load more jobs: {query.error instanceof GnusError ? query.error.message : UNEXPECTED}
          </p>
        </div>
      ) : null}
      {query.hasNextPage || query.isFetchNextPageError ? (
        <button type="button" className="btn btn-primary" disabled={query.isFetchingNextPage} onClick={loadMore}>
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
