import { z } from "zod";

export const DRAFT_PREFIX = "gnus.submit.";

// The draft holds a hash of the job and a short label, never the job: jobs run to 5 MiB and the browser keeps about 5 MB per origin.
const draftSchema = z.object({
  v: z.literal(1),
  idempotencyKey: z.string().min(1).max(128),
  sdkAddress: z.string().max(256),
  sdkNetwork: z.string().max(256).nullable(),
  jobHash: z.string().regex(/^[0-9a-f]{64}$/),
  label: z.string().max(40),
  createdAt: z.number().int(),
  sentAt: z.number().int().nullable(),
  chainId: z.number().int().positive().nullable(),
  settled: z.boolean(),
});
export type Draft = z.infer<typeof draftSchema>;

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage, or null when the browser refuses it (private modes throw on access). */
export function browserStorage(): DraftStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft(storage: DraftStorage, idempotencyKey: string): Draft | null {
  const name = DRAFT_PREFIX + idempotencyKey;
  let raw: string | null | undefined;
  try {
    raw = storage.getItem(name);
  } catch {
    return null;
  }
  if (typeof raw !== "string") {
    return null;
  }
  let parsed: z.ZodSafeParseResult<Draft> | null = null;
  try {
    parsed = draftSchema.safeParse(JSON.parse(raw));
  } catch {
    parsed = null;
  }
  if (parsed?.success && parsed.data.idempotencyKey === idempotencyKey) {
    return parsed.data;
  }
  try {
    storage.removeItem(name);
  } catch {
    // an entry that cannot be removed is read as absent every time
  }
  return null;
}

/** False when the browser refused the write: the caller must not go on as if the draft were saved. */
export function writeDraft(storage: DraftStorage, draft: Draft): boolean {
  try {
    storage.setItem(DRAFT_PREFIX + draft.idempotencyKey, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(storage: DraftStorage, idempotencyKey: string): void {
  try {
    storage.removeItem(DRAFT_PREFIX + idempotencyKey);
  } catch {
    // nothing to do: the entry ages out after 23 h
  }
}

export interface DraftInit {
  idempotencyKey: string;
  sdkAddress: string;
  sdkNetwork: string | null;
  jobHash: string;
  label: string;
  createdAt: number;
}

export function createDraft(storage: DraftStorage, init: DraftInit): Draft | null {
  const draft: Draft = { v: 1, ...init, sentAt: null, chainId: null, settled: false };
  return writeDraft(storage, draft) ? draft : null;
}

/** Writes sentAt and chainId; null means nothing was written and no call may go out. */
export function markSent(storage: DraftStorage, draft: Draft, chainId: number | null, now: number): Draft | null {
  const next: Draft = { ...draft, sentAt: now, chainId };
  return writeDraft(storage, next) ? next : null;
}

/** Best effort: a settled flag that fails to save is still recovered by the key lookup. */
export function markSettled(storage: DraftStorage, draft: Draft): Draft {
  const next: Draft = { ...draft, settled: true };
  writeDraft(storage, next);
  return next;
}
