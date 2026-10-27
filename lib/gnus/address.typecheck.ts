// Compile-time brand check: tsc runs it, nothing imports it. A directive that stops erroring fails tsc.
import type { EvmAddress, SdkAddress, TxHash } from "./address";

declare const evm: EvmAddress;
declare const sdk: SdkAddress;
declare const hash: TxHash;

// @ts-expect-error an EVM address is not an SDK address
export const a: SdkAddress = evm;
// @ts-expect-error an SDK address is not an EVM address
export const b: EvmAddress = sdk;
// @ts-expect-error a tx hash is not an SDK address
export const c: SdkAddress = hash;
// @ts-expect-error a plain string is not an SDK address
export const d: SdkAddress = "0x00";
// @ts-expect-error a plain string is not an EVM address
export const e: EvmAddress = "0x00";
