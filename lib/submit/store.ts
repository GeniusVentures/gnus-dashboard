import exampleJob from "../../data/jobs/posenet-example.json";
import { exceeds } from "../gnus/amount";
import { GnusError, normalizeError } from "../gnus/errors";
import type { Estimate } from "../gnus/schema";
import { canEstimate, canSubmit } from "../session/machine";
import type { SessionStore } from "../session/store";
import { Draft, DraftStorage, browserStorage, createDraft, markSent, markSettled, removeDraft } from "./drafts";
import { Digest, ParsedJob, browserDigest, hashJob, jobLabel, parseJob } from "./job";

export interface SubmitDeps {
  /** Null when the browser has no usable storage: nothing can then be saved, so nothing is sent. */
  storage: DraftStorage | null;
  now(): number;
  newKey(): string;
  digest: Digest;
}

export type EstimateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "stale" }
  | { status: "ready"; estimate: Estimate }
  | { status: "error"; error: GnusError };

export type Outcome = { kind: "done"; jobId: string | null; burnTxHash: string };

export type Step = "job" | "confirm" | "outcome";

export interface SubmitState {
  text: string;
  parsed: ParsedJob;
  estimate: EstimateState;
  draft: Draft | null;
  saveError: string | null;
  step: Step;
  submitError: string | null;
  outcome: Outcome | null;
}

export const SAVE_FAILED =
  "This browser couldn't save the submit, so a reload could lose track of the payment. Free some site storage, then estimate again.";
export const HASH_FAILED =
  "This browser can't hash the job, so it can't keep track of the payment. Open this page over https.";

const INITIAL: SubmitState = {
  text: "",
  parsed: { state: "empty" },
  estimate: { status: "idle" },
  draft: null,
  saveError: null,
  step: "job",
  submitError: null,
  outcome: null,
};

export function randomKey(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function defaultDeps(): SubmitDeps {
  return { storage: browserStorage(), now: () => Date.now(), newKey: randomKey, digest: browserDigest };
}

export interface SubmitStore {
  getState(): SubmitState;
  subscribe(listener: () => void): () => void;
  setText(text: string): void;
  loadExample(): void;
  estimate(): Promise<void>;
  submit(): Promise<void>;
  startOver(): void;
}

const identityOf = (session: SessionStore): string | null => {
  const accounts = session.getState().accounts;
  return accounts ? JSON.stringify([accounts.network, accounts.node.sdkAddress, accounts.payer.evmAddress]) : null;
};

/** True when the paying wallet holds less than the job costs; an unreadable balance never blocks (the wallet fails closed). */
export const insufficient = (estimate: Estimate): boolean =>
  estimate.balance !== null && exceeds(estimate.cost, estimate.balance);

/** Why Pay and submit is disabled: null when it is allowed, "" when it is off and the page already says why. */
export function submitBlocker(state: SubmitState, session: SessionStore): string | null {
  const { accounts } = session.getState();
  if (state.step !== "job") {
    return "";
  }
  if (canEstimate(session.getState()) && accounts && !accounts.payer.canSign) {
    return new GnusError(-32012, accounts.payer.evmAddress === null ? { reason: "no_wallet" } : undefined).message;
  }
  if (
    state.estimate.status !== "ready" ||
    insufficient(state.estimate.estimate) ||
    state.draft === null ||
    !canSubmit(session.getState())
  ) {
    return "";
  }
  return null;
}

const EXAMPLE_TEXT = JSON.stringify(exampleJob, null, 2);

export function createSubmitStore(session: SessionStore, deps: SubmitDeps): SubmitStore {
  let state = INITIAL;
  let epoch = 0;
  let sending = false;
  let lastIdentity = identityOf(session);
  const listeners = new Set<() => void>();

  const set = (patch: Partial<SubmitState>): void => {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) {
      listener();
    }
  };

  // A reply belongs to the text and the identity it was asked for; anything newer makes it stale.
  session.subscribe(() => {
    const current = identityOf(session);
    if (current === lastIdentity) {
      return;
    }
    lastIdentity = current;
    epoch += 1;
    if (state.step === "job" && state.estimate.status !== "idle") {
      set({ estimate: { status: "idle" }, draft: null, saveError: null });
    }
  });

  function setText(text: string): void {
    if (text === state.text) {
      return;
    }
    epoch += 1;
    const had = state.estimate.status === "ready" || state.estimate.status === "stale";
    set({
      text,
      parsed: parseJob(text),
      estimate: { status: had ? "stale" : "idle" },
      draft: null,
      saveError: null,
      submitError: null,
    });
  }

  async function estimate(): Promise<void> {
    const parsed = state.parsed;
    const client = session.getClient();
    if (
      parsed.state !== "ok" ||
      !client ||
      identityOf(session) === null ||
      !canEstimate(session.getState()) ||
      state.estimate.status === "loading" ||
      state.step !== "job"
    ) {
      return;
    }
    const mine = ++epoch;
    set({ estimate: { status: "loading" }, draft: null, saveError: null, submitError: null });
    let reply: Estimate;
    try {
      reply = await session.track(client.estimate({ job: parsed.job }));
    } catch (err) {
      const error = normalizeError(err);
      // Only these two move the session; a rejected estimate or a busy wallet is just this page's message.
      if (error.code === 4100 || error.code === 4900) {
        session.report(error);
      }
      if (mine === epoch) {
        set({ estimate: { status: "error", error } });
      }
      return;
    }
    let jobHash: string;
    try {
      jobHash = await hashJob(parsed.sent, deps.digest);
    } catch {
      if (mine === epoch) {
        set({ estimate: { status: "ready", estimate: reply }, saveError: HASH_FAILED });
      }
      return;
    }
    if (mine !== epoch) {
      return;
    }
    const accounts = session.getState().accounts;
    const draft =
      deps.storage && accounts
        ? createDraft(deps.storage, {
            idempotencyKey: deps.newKey(),
            sdkAddress: accounts.node.sdkAddress,
            sdkNetwork: accounts.network.sdk,
            jobHash,
            label: jobLabel(parsed.job),
            createdAt: deps.now(),
          })
        : null;
    set({ estimate: { status: "ready", estimate: reply }, draft, saveError: draft ? null : SAVE_FAILED });
  }

  async function submit(): Promise<void> {
    const client = session.getClient();
    const { parsed, draft } = state;
    const { storage } = deps;
    if (
      sending ||
      !client ||
      !storage ||
      draft === null ||
      parsed.state !== "ok" ||
      submitBlocker(state, session) !== null
    ) {
      return;
    }
    sending = true;
    try {
      const chainId = session.getState().accounts?.network.evmChainId ?? null;
      const sent = markSent(storage, draft, chainId, deps.now());
      if (!sent) {
        set({ saveError: SAVE_FAILED });
        return;
      }
      set({ draft: sent, step: "confirm", submitError: null });
      try {
        const result = await client.submitJob({ job: parsed.job, idempotencyKey: sent.idempotencyKey });
        set({
          draft: markSettled(storage, sent),
          step: "outcome",
          outcome: { kind: "done", jobId: result.jobId, burnTxHash: result.burnTxHash },
        });
      } catch (err) {
        set({ step: "job", submitError: normalizeError(err).message });
      }
    } finally {
      sending = false;
    }
  }

  function startOver(): void {
    if (state.draft && deps.storage) {
      removeDraft(deps.storage, state.draft.idempotencyKey);
    }
    epoch += 1;
    state = INITIAL;
    set({});
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setText,
    loadExample: () => setText(EXAMPLE_TEXT),
    estimate,
    submit,
    startOver,
  };
}

const stores = new WeakMap<SessionStore, SubmitStore>();

/** One store per session store, so a gate screen that unmounts the page never loses an open submit. */
export function getSubmitStore(session: SessionStore, deps?: SubmitDeps): SubmitStore {
  let store = stores.get(session);
  if (!store) {
    store = createSubmitStore(session, deps ?? defaultDeps());
    stores.set(session, store);
  }
  return store;
}
