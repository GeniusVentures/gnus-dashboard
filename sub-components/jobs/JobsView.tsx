import React from "react";
import Head from "next/head";
import Link from "next/link";
import { GnusContractMismatchError } from "../../lib/gnus/errors";
import type { JobList } from "../../lib/gnus/schema";
import { isMarked, shortJobId } from "../../lib/jobs";
import Amount from "../shared/Amount";
import { useSession } from "../wallet/SessionProvider";
import { useAccountInfiniteQuery } from "../wallet/useAccountQuery";
import JobStatusBadge from "./JobStatusBadge";

const PAGE_SIZE = 20;

const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

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
  const unit = accounts?.unit;
  const jobs = query.data?.pages.flatMap((page) => page.jobs) ?? [];
  if (!unit || jobs.length === 0) {
    return null;
  }
  return (
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
          {jobs.map((job) => (
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
                <Link href={`/jobs/detail?hash=${job.burnTxHash}`}>{shortJobId(job)}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
