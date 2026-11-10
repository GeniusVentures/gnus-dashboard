import type { JobDefinition } from "../gnus/schema";

export const REQUIRED_KEYS = ["inputs", "outputs", "passes"] as const;

/** The wallet's own limit on a job: 5 MiB of UTF-8. */
export const JOB_CAP_BYTES = 5 * 1024 * 1024;

export const FILE_TOO_LARGE = "This file is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB.";
export const JOB_TOO_LARGE = "This job is larger than 5 MB. GeniusWallet accepts jobs up to 5 MB.";

export const fileTooLarge = (size: number): boolean => size > JOB_CAP_BYTES;

// A UTF-16 unit is at most 3 UTF-8 bytes, so short text is under the cap without being encoded.
const overCap = (text: string): boolean =>
  text.length * 3 > JOB_CAP_BYTES && new TextEncoder().encode(text).length > JOB_CAP_BYTES;

export type ParsedJob =
  | { state: "empty" }
  | { state: "invalid"; message: string }
  | { state: "ok"; job: JobDefinition; sent: string };

export type Digest = (bytes: Uint8Array) => Promise<ArrayBuffer>;

export function parseJob(text: string): ParsedJob {
  if (text.trim() === "") {
    return { state: "empty" };
  }
  if (overCap(text)) {
    return { state: "invalid", message: JOB_TOO_LARGE };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { state: "invalid", message: "This is not valid JSON." };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { state: "invalid", message: "The job must be a JSON object." };
  }
  const job = value as JobDefinition;
  const missing = REQUIRED_KEYS.filter((key) => !Object.hasOwn(job, key));
  if (missing.length > 0) {
    return {
      state: "invalid",
      message: `The job needs inputs, outputs and passes at the top level. Missing: ${missing.join(", ")}.`,
    };
  }
  const sent = JSON.stringify(job);
  // Rewriting numbers can make the sent text longer than the pasted one, and the wallet counts what is sent.
  return overCap(sent) ? { state: "invalid", message: JOB_TOO_LARGE } : { state: "ok", job, sent };
}

/** SHA-256 of the exact string sent to the wallet, as lowercase hex. */
export async function hashJob(sent: string, digest: Digest): Promise<string> {
  const bytes = new Uint8Array(await digest(new TextEncoder().encode(sent)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const browserDigest: Digest = (bytes) => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return Promise.reject(new Error("WebCrypto is not available"));
  }
  return subtle.digest("SHA-256", bytes);
};

export function jobLabel(job: JobDefinition): string {
  const name = typeof job.name === "string" ? job.name.trim() : "";
  return (name || "Job").slice(0, 40);
}
