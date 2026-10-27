import { z } from "zod";
import { evmAddressSchema, sdkAddressSchema } from "./address";

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

// The 0..36 bound keeps a hostile value from driving a huge power of ten in formatting.
export const unitSchema = z.object({
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(36),
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
