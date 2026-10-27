import { z } from "zod";
import { evmAddressSchema, sdkAddressSchema, txHashSchema } from "./address";
import { baseUnitsSchema, decimalSchema, decimalsSchema } from "./amount";

// zod's compiled parsers use `new Function`, which the planned script-src 'self' CSP blocks and reports.
z.config({ jitless: true });

export const CONTRACT_VERSION = "1";
export const INITIALIZED_EVENT = "gnus#initialized";

export const METHODS = {
  getAccounts: "gnus_getAccounts",
  estimate: "gnus_estimate",
  submitJob: "gnus_submitJob",
  listJobs: "gnus_listJobs",
  getJob: "gnus_getJob",
  getEarnings: "gnus_getEarnings",
} as const;

export const EVENTS = {
  accountsChanged: "gnus_accountsChanged",
  networkChanged: "gnus_networkChanged",
  jobUpdated: "gnus_jobUpdated",
  disconnect: "disconnect",
} as const;

export const networkSchema = z.object({
  sdk: z.string().min(1),
  evmChainId: z.number().int().positive(),
});
export type Network = z.infer<typeof networkSchema>;

export const unitSchema = z.object({
  symbol: z.string().min(1),
  decimals: decimalsSchema,
});

export const accountsSchema = z.object({
  node: z.object({
    sdkAddress: sdkAddressSchema,
    linkedEvm: evmAddressSchema.nullable(),
    role: z.enum(["main", "child", "none"]),
    main: sdkAddressSchema.nullable(),
  }),
  payer: z.object({
    evmAddress: evmAddressSchema.nullable(),
    canSign: z.boolean(),
  }),
  switching: z.boolean(),
  network: networkSchema,
  version: z.literal(CONTRACT_VERSION),
  unit: unitSchema,
});
export type Accounts = z.infer<typeof accountsSchema>;

export type JobDefinition = Record<string, unknown>;

export const estimateSchema = z.object({
  cost: baseUnitsSchema,
  gas: z.object({ gasPriceGwei: decimalSchema, symbol: z.string().min(1) }).nullable(),
  balance: baseUnitsSchema.nullable(),
  network: networkSchema,
});
export type Estimate = z.infer<typeof estimateSchema>;

export const submitResultSchema = z.object({
  jobId: z.string().min(1).nullable(),
  burnTxHash: txHashSchema,
  sdkAddress: sdkAddressSchema,
  status: z.enum(["submitted", "bridgedNotProcessed"]),
});
export type SubmitResult = z.infer<typeof submitResultSchema>;

export const JOB_STATUSES = [
  "submitted",
  "queued",
  "processing",
  "completed",
  "failed",
  "bridgedNotProcessed",
  "unknown",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

function toJobStatus(value: string): JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value) ? (value as JobStatus) : "unknown";
}

// An unseen status string is a rendered state, not a crash; a non-string is still a mismatch.
const jobStatusSchema = z.string().transform(toJobStatus);

const isoTimestampSchema = z.iso.datetime({ offset: true });

export const jobSchema = z.object({
  jobId: z.string().min(1).nullable(),
  burnTxHash: txHashSchema,
  sdkAddress: sdkAddressSchema,
  origin: z.string(),
  idempotencyKey: z.string(),
  submittedAt: isoTimestampSchema,
  cost: baseUnitsSchema,
  status: jobStatusSchema,
});
export type Job = z.infer<typeof jobSchema>;

// gnus_getJob answers null when nothing matches; the client wraps this with .nullable().
export const jobDetailSchema = jobSchema.extend({
  result: z
    .object({
      cids: z.array(z.string().min(1)),
      data: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable(),
  error: z.string().optional(),
});
export type JobDetail = z.infer<typeof jobDetailSchema>;

export const jobListSchema = z.object({
  jobs: z.array(jobSchema),
  nextCursor: z.string().nullable(),
});
export type JobList = z.infer<typeof jobListSchema>;

export const earningsSchema = z.object({
  sdkAddress: sdkAddressSchema,
  balance: baseUnitsSchema,
  processing: z.object({
    isProcessing: z.boolean(),
    jobsProcessed: baseUnitsSchema.nullable(),
  }),
  earned: z.object({
    total: baseUnitsSchema.nullable(),
    history: z
      .array(z.object({ at: isoTimestampSchema, amount: baseUnitsSchema, jobId: z.string() }))
      .nullable(),
  }),
});
export type Earnings = z.infer<typeof earningsSchema>;

export const disconnectSchema = z.object({
  code: z.number().int(),
  message: z.string(),
});

export const eventSchemas = {
  gnus_accountsChanged: accountsSchema,
  gnus_networkChanged: networkSchema,
  gnus_jobUpdated: jobSchema,
  disconnect: disconnectSchema,
} as const;
export type GnusEventName = keyof typeof eventSchemas;
export type GnusEventPayload<E extends GnusEventName> = z.infer<(typeof eventSchemas)[E]>;
