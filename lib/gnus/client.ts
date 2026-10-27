import { z } from "zod";
import { GnusContractMismatchError, normalizeError } from "./errors";
import { Accounts, METHODS, accountsSchema } from "./schema";
import type { RequestArgs, Transport } from "./transport/types";

export interface GnusClient {
  getAccounts(): Promise<Accounts>;
  close(): void;
}

export function createGnusClient(transport: Transport): GnusClient {
  let lastVersion: string | null = null;

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
    readsVersion = false,
  ): Promise<T> {
    const args: RequestArgs = params === undefined ? { method } : { method, params };
    let raw: unknown;
    try {
      raw = await transport.request(args);
    } catch (err) {
      throw normalizeError(err);
    }
    if (readsVersion) {
      rememberVersion(raw);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new GnusContractMismatchError(method, lastVersion);
    }
    return parsed.data;
  }

  return {
    getAccounts: () => call(METHODS.getAccounts, undefined, accountsSchema, true),
    close: () => transport.close(),
  };
}
