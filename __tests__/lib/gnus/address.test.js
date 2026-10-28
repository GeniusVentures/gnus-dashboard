import {
  sdkAddressSchema,
  evmAddressSchema,
  txHashSchema,
  parseSdkAddress,
  parseEvmAddress,
} from "../../../lib/gnus/address";
import { baseUnitsSchema, decimalSchema, decimalsSchema } from "../../../lib/gnus/amount";

const hex = (pair, n) => "0x" + pair.repeat(n);
const sdk = hex("a1", 64);
const evm = hex("b2", 20);
const hash = hex("c3", 32);

const accepts = (schema, v) => expect(schema.safeParse(v).success).toBe(true);
const rejects = (schema, v) => expect(schema.safeParse(v).success).toBe(false);

describe("address schemas", () => {
  test("sdkAddressSchema", () => {
    accepts(sdkAddressSchema, sdk);
    for (const bad of [evm, hash, hex("a1", 63) + "a", hex("a1", 64) + "a", sdk.toUpperCase().replace("0X", "0x"), sdk.slice(2), 12345]) {
      rejects(sdkAddressSchema, bad);
    }
  });

  test("evmAddressSchema", () => {
    accepts(evmAddressSchema, evm);
    for (const bad of [sdk, hex("b2", 19) + "b", evm + "b", evm.toUpperCase().replace("0X", "0x"), evm.slice(2)]) {
      rejects(evmAddressSchema, bad);
    }
  });

  test("txHashSchema", () => {
    accepts(txHashSchema, hash);
    rejects(txHashSchema, evm);
    rejects(txHashSchema, sdk);
  });

  test("parseSdkAddress trims and lowercases user input", () => {
    expect(parseSdkAddress(`  0x${"A1".repeat(64)}\n`)).toBe(sdk);
    expect(parseSdkAddress(evm)).toBeNull();
    expect(parseSdkAddress("garbage")).toBeNull();
  });

  test("parseEvmAddress mirrors it", () => {
    expect(parseEvmAddress(` 0x${"B2".repeat(20)} `)).toBe(evm);
    expect(parseEvmAddress(sdk)).toBeNull();
    expect(parseEvmAddress("")).toBeNull();
  });
});

describe("amount schemas", () => {
  test("baseUnitsSchema", () => {
    for (const ok of ["0", "1", "9007199254740993", "1000000000000000000000"]) {
      accepts(baseUnitsSchema, ok);
    }
    for (const bad of [1000, "1e21", "1.5", "-1", "", " 1", "0x10"]) {
      rejects(baseUnitsSchema, bad);
    }
  });

  test("decimalSchema", () => {
    for (const ok of ["30", "30.5", "0.000000016"]) {
      accepts(decimalSchema, ok);
    }
    for (const bad of ["30.", ".5", "1e3", 30, "-1"]) {
      rejects(decimalSchema, bad);
    }
  });

  test("decimalsSchema", () => {
    for (const ok of [0, 6, 18, 36]) {
      accepts(decimalsSchema, ok);
    }
    for (const bad of [37, -1, 1.5, "18"]) {
      rejects(decimalsSchema, bad);
    }
  });
});
