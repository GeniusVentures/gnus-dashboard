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
  key(index: number): string | null;
  readonly length: number;
}

/**
 * A draft older than this, counted from sentAt else createdAt, is dropped. A sent draft the wallet never answered
 * for definitively is kept at any age: its key is the only thing that stops the same job being paid for twice.
 */
export const DRAFT_TTL_MS = 23 * 60 * 60 * 1000;

/** The node account and SDK network a draft belongs to. */
export interface DraftIdentity {
  sdkAddress: string;
  sdkNetwork: string | null;
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

/**
 * Writes sentAt and chainId; null means nothing was written and no call may go out. A key sent on two chains gets no
 * chain: the wallet may replay the first burn, and no explorer link is better than one to a chain without the payment.
 */
export function markSent(storage: DraftStorage, draft: Draft, chainId: number | null, now: number): Draft | null {
  const chain = draft.sentAt === null || draft.chainId === chainId ? chainId : null;
  const next: Draft = { ...draft, sentAt: now, chainId: chain };
  return writeDraft(storage, next) ? next : null;
}

/**
 * Settled means the wallet answered for this key for good, so the same job may get a new key.
 * Best effort: a flag that fails to save is put right by the next key lookup.
 */
export function markSettled(storage: DraftStorage, draft: Draft, settled: boolean): Draft {
  if (draft.settled === settled) {
    return draft;
  }
  const next: Draft = { ...draft, settled };
  writeDraft(storage, next);
  return next;
}

/** A sent draft without a definitive answer: its fate is open, so it is never pruned or removed. */
export const isOpen = (draft: Draft): boolean => draft.sentAt !== null && !draft.settled;

// Keys are read first and entries after, because reading can remove a bad entry and shift the indexes.
function draftKeys(storage: DraftStorage): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const name = storage.key(i);
      if (typeof name === "string" && name.startsWith(DRAFT_PREFIX)) {
        keys.push(name.slice(DRAFT_PREFIX.length));
      }
    }
  } catch {
    return [];
  }
  return keys;
}

export function listDrafts(storage: DraftStorage): Draft[] {
  return draftKeys(storage).flatMap((key) => readDraft(storage, key) ?? []);
}

const sameIdentity = (draft: Draft, identity: DraftIdentity): boolean =>
  draft.sdkAddress === identity.sdkAddress && draft.sdkNetwork === identity.sdkNetwork;

/** The unsettled draft for this identity and this exact job, a sent one first, so a retry of the same job reuses its key. */
export function findReusable(storage: DraftStorage, identity: DraftIdentity, jobHash: string): Draft | null {
  const found = listDrafts(storage).filter(
    (draft) => !draft.settled && draft.jobHash === jobHash && sameIdentity(draft, identity),
  );
  return found.sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.createdAt - a.createdAt)[0] ?? null;
}

/** The identity's most recently sent draft, settled or not: the one a reload has to account for. Unsent drafts paid nothing. */
export function newestSent(storage: DraftStorage, identity: DraftIdentity): Draft | null {
  const found = listDrafts(storage).filter((draft) => draft.sentAt !== null && sameIdentity(draft, identity));
  return found.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))[0] ?? null;
}

/** Drops expired drafts, except open ones, and entries that do not parse; keys outside the prefix are never touched. */
export function prune(storage: DraftStorage, now: number): void {
  for (const key of draftKeys(storage)) {
    const draft = readDraft(storage, key);
    if (draft && !isOpen(draft) && now - (draft.sentAt ?? draft.createdAt) > DRAFT_TTL_MS) {
      removeDraft(storage, key);
    }
  }
}

/** A draft that never reached the wallet has nothing to account for once its job is edited away. */
export function removeIfUnsent(storage: DraftStorage, draft: Draft): void {
  if (draft.sentAt === null) {
    removeDraft(storage, draft.idempotencyKey);
  }
}

export function randomKey(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }
  // randomUUID exists only in secure contexts; a plain-http dev host still gets a version 4 UUID.
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
