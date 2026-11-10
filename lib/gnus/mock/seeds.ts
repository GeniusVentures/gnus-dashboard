import "./marker";
import type { Job, JobStatus } from "../schema";

export type SeedKind = "history" | "results";

export type SeededJob = Job & {
  result: { cids: string[]; data?: Record<string, unknown> } | null;
  error?: string;
};

const units = (whole: string): string => whole + "0".repeat(18);

// Hex is built from short patterns so no long high-entropy literal sits in source.
const hashOf = (prefix: string, n: number): Job["burnTxHash"] =>
  ("0x" + prefix + n.toString(16).padStart(64 - prefix.length, "0")) as Job["burnTxHash"];

const FIRST_SUBMITTED_MS = Date.UTC(2026, 9, 1, 9, 0, 0);
const HOUR_MS = 60 * 60 * 1000;

function record(prefix: string, i: number, sdkAddress: string, over: Partial<SeededJob>): SeededJob {
  return {
    jobId: null,
    burnTxHash: hashOf(prefix, i + 1),
    sdkAddress: sdkAddress as Job["sdkAddress"],
    origin: i % 2 === 0 ? "http://localhost:3000" : "https://dashboard.gnus.ai",
    idempotencyKey: `seed-${i + 1}`,
    submittedAt: new Date(FIRST_SUBMITTED_MS + i * HOUR_MS).toISOString(),
    cost: units("3") as Job["cost"],
    status: "submitted",
    result: null,
    ...over,
  };
}

const HISTORY_STATUSES = ["submitted", "bridgedNotProcessed", "unconfirmed"] as const;

function history(sdkAddress: string): SeededJob[] {
  return Array.from({ length: 25 }, (_, i) => record("5eed", i, sdkAddress, { status: HISTORY_STATUSES[i % 3] }));
}

// One job per state the SDK will report once it can, the two the wallet reports today, one status this page has never
// seen (the client parses it to unknown), and one whose text is hostile.
function results(sdkAddress: string): SeededJob[] {
  const cid = (letter: string): string => "bafy" + letter.repeat(40);
  const hostile = '<img src="x" onerror="window.__gnusXss=1">';
  const specs: Array<Partial<SeededJob>> = [
    { status: "submitted", jobId: "job-submitted" },
    { status: "queued", jobId: "job-queued" },
    { status: "processing", jobId: "job-processing" },
    {
      status: "completed",
      jobId: "job-completed",
      result: { cids: [cid("a"), cid("b")], data: { frames: 24, label: "pose" } },
    },
    { status: "failed", jobId: "job-failed", error: "The node ran out of memory." },
    { status: "bridgedNotProcessed" },
    { status: "unconfirmed" },
    { status: "archived" as JobStatus, jobId: "job-archived" },
    {
      status: "failed",
      jobId: "job-hostile",
      origin: hostile,
      error: hostile,
      result: { cids: [], data: { note: "<script>window.__gnusXss=1</script>" } },
    },
  ];
  return specs.map((over, i) => record("7e57", i, sdkAddress, over));
}

/** Jobs a profile starts with, oldest first like the mock's own record list; none for a profile that names no seed. */
export function seedJobs(kind: SeedKind | undefined, sdkAddress: string): SeededJob[] {
  if (kind === "history") {
    return history(sdkAddress);
  }
  return kind === "results" ? results(sdkAddress) : [];
}
