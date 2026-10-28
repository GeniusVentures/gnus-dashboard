import { z } from "zod";

// Every GNUS amount and count in the contract: integer base units of unit.decimals, as a digit string.
// 78 digits is the u256 ceiling; a longer string would only cost BigInt time on every render.
export const baseUnitsSchema = z.string().regex(/^\d{1,78}$/);

// gas.gasPriceGwei: digits with an optional fraction, formatted by the wallet (gnus_amounts.dart, \d+(\.\d+)?).
// Not a GNUS amount, so it is not held to the base-units rule.
export const decimalSchema = z.string().regex(/^\d+(\.\d+)?$/);

// unit.decimals; the 0..36 bound stops a hostile value from driving a huge power of ten in formatting.
export const decimalsSchema = z.number().int().min(0).max(36);

// Exact decimal rendering of base units. Null in, null out: an unknown amount must never read as 0.
// Bad input is a programming error (the client already parsed wallet values), so it throws.
export function formatAmount(base: string | null, decimals: number): string | null {
  if (base === null) {
    return null;
  }
  if (!baseUnitsSchema.safeParse(base).success || !decimalsSchema.safeParse(decimals).success) {
    throw new RangeError("formatAmount: invalid base units or decimals");
  }
  const scale = BigInt(10) ** BigInt(decimals);
  const value = BigInt(base);
  const whole = (value / scale).toString();
  const fraction = decimals === 0 ? "" : (value % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction === "" ? whole : `${whole}.${fraction}`;
}

// Exact comparison of two base-unit amounts; BigInt lives only in this file so no amount ever passes through Number.
export function exceeds(amount: string, limit: string): boolean {
  if (!baseUnitsSchema.safeParse(amount).success || !baseUnitsSchema.safeParse(limit).success) {
    throw new RangeError("exceeds: invalid base units");
  }
  return BigInt(amount) > BigInt(limit);
}
