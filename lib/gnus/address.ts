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

// Transaction hashes sit with the other hex identifier formats so there is one owner for them.
export const txHashSchema = z
  .string()
  .regex(/^0x[0-9a-f]{64}$/)
  .brand<"TxHash">();
export type TxHash = z.infer<typeof txHashSchema>;

// User input may be padded or checksummed; the wire schemas stay lowercase-strict.
export function parseSdkAddress(input: string): SdkAddress | null {
  const parsed = sdkAddressSchema.safeParse(input.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

export function parseEvmAddress(input: string): EvmAddress | null {
  const parsed = evmAddressSchema.safeParse(input.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}
