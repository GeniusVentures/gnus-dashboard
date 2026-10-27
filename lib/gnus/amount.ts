import { z } from "zod";

// Every GNUS amount and count in the contract: integer base units of unit.decimals, as a digit string.
export const baseUnitsSchema = z.string().regex(/^\d+$/);

// gas.gasPriceGwei: digits with an optional fraction, formatted by the wallet (gnus_amounts.dart, \d+(\.\d+)?).
// Not a GNUS amount, so it is not held to the base-units rule.
export const decimalSchema = z.string().regex(/^\d+(\.\d+)?$/);

// unit.decimals; the 0..36 bound stops a hostile value from driving a huge power of ten in formatting.
export const decimalsSchema = z.number().int().min(0).max(36);
