import { z } from "zod";
import { GnusContractMismatchError, normalizeError } from "./errors";
import {
  Accounts,
  Earnings,
  Estimate,
  GnusEventName,
  GnusEventPayload,
  JobDefinition,
  JobDetail,
  JobList,
  METHODS,
  SubmitResult,
  accountsSchema,
  earningsSchema,
  estimateSchema,
  eventSchemas,
  jobDetailSchema,
  jobListSchema,
  submitResultSchema,
} from "./schema";
import type { RequestArgs, Transport } from "./transport/types";

export type GetJobParams =
  | { jobId: string; burnTxHash?: never; idempotencyKey?: never }
  | { burnTxHash: string; jobId?: never; idempotencyKey?: never }
  | { idempotencyKey: string; jobId?: never; burnTxHash?: never };

export interface GnusClient {
  getAccounts(): Promise<Accounts>;
  estimate(params: { job: JobDefinition }): Promise<Estimate>;
  submitJob(params: { job: JobDefinition; idempotencyKey: string }): Promise<SubmitResult>;
  listJobs(params?: { limit?: number; cursor?: string }): Promise<JobList>;
  getJob(params: GetJobParams): Promise<JobDetail | null>;
  getEarnings(params?: { includeChildren?: false }): Promise<Earnings>;
  /** Returns an unsubscribe function. */
  on<E extends GnusEventName>(
    event: E,
    handler: (payload: GnusEventPayload<E>) => void,
    onMismatch?: (err: GnusContractMismatchError) => void,
  ): () => void;
  close(): void;
}

export function createGnusClient(transport: Transport): GnusClient {
  let lastVersion: string | null = null;

  // Read from the raw payload so a reply that fails parsing still names its version.
  function rememberVersion(raw: unknown): void {
    if (typeof raw === "object" && raw !== null && "version" in raw) {
      const version = (raw as { version: unknown }).version;
      if (typeof version === "string") {
        lastVersion = version;
      }
    }
  }

  async function call<T>(
    method: string,
    params: Record<string, unknown> | undefined,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const args: RequestArgs = params === undefined ? { method } : { method, params };
    let raw: unknown;
    try {
      raw = await transport.request(args);
    } catch (err) {
      throw normalizeError(err);
    }
    rememberVersion(raw);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new GnusContractMismatchError(method, lastVersion);
    }
    return parsed.data;
  }

  const nullableJobDetail = jobDetailSchema.nullable();

  return {
    getAccounts: () => call(METHODS.getAccounts, undefined, accountsSchema),
    estimate: (params) => call(METHODS.estimate, params, estimateSchema),
    submitJob: (params) => call(METHODS.submitJob, params, submitResultSchema),
    listJobs: (params = {}) => call(METHODS.listJobs, params, jobListSchema),
    getJob: (params) => call(METHODS.getJob, params, nullableJobDetail),
    getEarnings: (params = {}) => call(METHODS.getEarnings, params, earningsSchema),
    on(event, handler, onMismatch) {
      const schema: z.ZodType = eventSchemas[event];
      const wrapper = (payload: unknown): void => {
        rememberVersion(payload);
        const parsed = schema.safeParse(payload);
        if (parsed.success) {
          handler(parsed.data as GnusEventPayload<typeof event>);
        } else {
          onMismatch?.(new GnusContractMismatchError(event, lastVersion));
        }
      };
      transport.on(event, wrapper);
      return () => transport.removeListener(event, wrapper);
    },
    close: () => transport.close(),
  };
}
