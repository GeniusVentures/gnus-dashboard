import type { JobStatus } from "./gnus/schema";
import { shorten } from "../sub-components/wallet/AddressChip";

export interface StatusInfo {
  label: string;
  explanation: string;
  /** No later status follows from the wallet. */
  final: boolean;
  /** Needs the user's eyes: the payment may be spent without a started job. */
  marked: boolean;
  variant: "success" | "danger" | "warning" | "info" | "secondary";
}

// The one place job status words live. "Running" and a progress bar are never shown: the wallet cannot report progress.
export const STATUS_TEXT: Record<JobStatus, StatusInfo> = {
  submitted: {
    label: "Submitted to the network",
    explanation: "The network has the job. GeniusWallet can't report its progress yet.",
    final: false,
    marked: false,
    variant: "info",
  },
  queued: {
    label: "Queued",
    explanation: "The job is waiting for a node.",
    final: false,
    marked: false,
    variant: "info",
  },
  processing: {
    label: "Processing",
    explanation: "Nodes are working on the job.",
    final: false,
    marked: false,
    variant: "info",
  },
  completed: { label: "Completed", explanation: "The job finished.", final: true, marked: false, variant: "success" },
  failed: { label: "Failed", explanation: "The job did not finish.", final: true, marked: false, variant: "danger" },
  bridgedNotProcessed: {
    label: "Paid but not processed",
    explanation: "The payment went through, but the network did not start the job. Check it in GeniusWallet.",
    final: true,
    marked: true,
    variant: "warning",
  },
  unconfirmed: {
    label: "Payment not confirmed",
    explanation:
      "The payment was sent but not confirmed in time. The GNUS may be spent and the job did not start. Check it in GeniusWallet.",
    final: false,
    marked: true,
    variant: "warning",
  },
  pending: {
    label: "Outcome not recorded",
    explanation: "GeniusWallet recorded this submit but not its outcome. Check it in GeniusWallet.",
    final: false,
    marked: true,
    variant: "warning",
  },
  unknown: {
    label: "Status unknown",
    explanation: "GeniusWallet sent a status this page doesn't know.",
    final: false,
    marked: false,
    variant: "secondary",
  },
};

export const isFinal = (status: JobStatus): boolean => STATUS_TEXT[status].final;
export const isMarked = (status: JobStatus): boolean => STATUS_TEXT[status].marked;

const SHORT_ID_MAX = 14;

/** The id shown in a list: the job id when it is short, else shortened; the burn hash while there is no job id. */
export function shortJobId(job: { jobId?: string | null; burnTxHash: string }): string {
  if (job.jobId == null) {
    return shorten(job.burnTxHash);
  }
  return job.jobId.length <= SHORT_ID_MAX ? job.jobId : shorten(job.jobId);
}

export type JobRef = { burnTxHash: string } | { jobId: string };

const BURN_HASH = /^0x[0-9a-f]{64}$/;
const MAX_ID = 256;

/** Exactly one of ?hash= and ?id= must name a job; anything else is not a link to a job. */
export function parseJobRef(query: Record<string, string | string[] | undefined>): JobRef | null {
  const { hash, id } = query;
  if ((hash === undefined) === (id === undefined)) {
    return null;
  }
  if (hash !== undefined) {
    const lower = typeof hash === "string" ? hash.toLowerCase() : "";
    return BURN_HASH.test(lower) ? { burnTxHash: lower } : null;
  }
  return typeof id === "string" && id.length >= 1 && id.length <= MAX_ID ? { jobId: id } : null;
}

/** One gateway for every CID link; the choice of a GNUS-run gateway is open. */
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** A CID becomes a link only when it is plain letters and digits, so it cannot carry a path, query or scheme. */
export const cidHref = (cid: string): string | null => (/^[A-Za-z0-9]+$/.test(cid) ? IPFS_GATEWAY + cid : null);
