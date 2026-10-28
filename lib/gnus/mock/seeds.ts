import "./marker";
import type { Job } from "../schema";

export type SeedKind = "history";

export type SeededJob = Job & { result: { cids: string[] } | null };

const units = (whole: string): string => whole + "0".repeat(18);

// Hex is built from short patterns so no long high-entropy literal sits in source.
const hashOf = (prefix: string, n: number): Job["burnTxHash"] =>
  ("0x" + prefix + n.toString(16).padStart(64 - prefix.length, "0")) as Job["burnTxHash"];

const HISTORY_COUNT = 25;
const HISTORY_STATUSES = ["submitted", "bridgedNotProcessed", "unconfirmed"] as const;
const FIRST_SUBMITTED_MS = Date.UTC(2026, 9, 1, 9, 0, 0);
const HOUR_MS = 60 * 60 * 1000;

/** Jobs a profile starts with, oldest first like the mock's own record list; none for a profile that names no seed. */
export function seedJobs(kind: SeedKind | undefined, sdkAddress: string): SeededJob[] {
  if (kind !== "history") {
    return [];
  }
  return Array.from({ length: HISTORY_COUNT }, (_, i) => ({
    jobId: null,
    burnTxHash: hashOf("5eed", i + 1),
    sdkAddress: sdkAddress as Job["sdkAddress"],
    origin: i % 2 === 0 ? "http://localhost:3000" : "https://dashboard.gnus.ai",
    idempotencyKey: `seed-${i + 1}`,
    submittedAt: new Date(FIRST_SUBMITTED_MS + i * HOUR_MS).toISOString(),
    cost: units("3") as Job["cost"],
    status: HISTORY_STATUSES[i % HISTORY_STATUSES.length],
    result: null,
  }));
}
