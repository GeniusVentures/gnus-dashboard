import { z } from "zod";

// Two formats that are never mixed and never converted: an SDK address cannot be derived from an EVM one.
export const sdkAddressSchema = z
  .string()
  .regex(/^0x[0-9a-f]{128}$/)
  .brand<"SdkAddress">();
export type SdkAddress = z.infer<typeof sdkAddressSchema>;

export const evmAddressSchema = z
  .string()
  .regex(/^0x[0-9a-f]{40}$/)
  .brand<"EvmAddress">();
export type EvmAddress = z.infer<typeof evmAddressSchema>;
