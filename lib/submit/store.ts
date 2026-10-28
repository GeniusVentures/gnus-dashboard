import exampleJob from "../../data/jobs/posenet-example.json";
import { exceeds } from "../gnus/amount";
import { GnusError, normalizeError } from "../gnus/errors";
import type { Estimate, SubmitResult } from "../gnus/schema";
import { canEstimate, canSubmit } from "../session/machine";
import type { SessionStore } from "../session/store";
import {
  Draft,
  DraftStorage,
  browserStorage,
  createDraft,
  findReusable,
  isOpen,
  markSent,
  markSettled,
  newestFor,
  prune,
  randomKey,
  removeDraft,
  removeIfUnsent,
} from "./drafts";
import { Digest, ParsedJob, browserDigest, hashJob, jobLabel, parseJob } from "./job";
import { Outcome, classifyError, classifyLookup, classifyResult, isDefinitive } from "./outcome";

export type { Outcome } from "./outcome";

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

export type Step = "job" | "confirm" | "outcome";

/** A submit that spent nothing: the page is back at the job with the same key. */
export interface SubmitFailure {
  error: GnusError;
  nothingSpentLine: boolean;
  newKey: boolean;
}

export interface SubmitState {
  text: string;
  parsed: ParsedJob;
  estimate: EstimateState;
  jobHash: string | null;
  draft: Draft | null;
  saveError: string | null;
  step: Step;
  cancelNote: boolean;
  submitError: SubmitFailure | null;
  notSeen: boolean;
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
  jobHash: null,
  draft: null,
  saveError: null,
  step: "job",
  cancelNote: false,
  submitError: null,
  notSeen: false,
  outcome: null,
};

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
  /** Reveals that this page cannot close the wallet's confirm. */
  showCancelNote(): void;
  /** Asks the wallet again what happened to the last submit. */
  checkAgain(): Promise<void>;
  /** After idempotency_key_reused: the same job under a new, saved key. */
  newKey(): void;
  startOver(): void;
}

const identityOf = (session: SessionStore): string | null => {
  const accounts = session.getState().accounts;
  return accounts ? JSON.stringify([accounts.network, accounts.node.sdkAddress, accounts.payer.evmAddress]) : null;
};

const reportable = (error: GnusError): boolean => error.code === 4100 || error.code === 4900;

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
  // The submit call in flight; a reconnect abandons it, since a wallet that restarted never answers it.
  let sending: object | null = null;
  let away = false;
  let lastIdentity = identityOf(session);
  const recovered = new Set<string>();
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) {
      listener();
    }
  };
  const set = (patch: Partial<SubmitState>): void => {
    state = { ...state, ...patch };
    notify();
  };

  // A reply belongs to the text and the identity it was asked for; anything newer makes it stale.
  // A drop to no identity (a disconnect) is not a change of account.
  function onSession(): void {
    const current = identityOf(session);
    if (current !== null && current !== lastIdentity) {
      lastIdentity = current;
      epoch += 1;
      if (state.step === "outcome") {
        state = INITIAL;
        notify();
      } else if (state.step === "job" && (state.estimate.status !== "idle" || state.notSeen)) {
        set({ estimate: { status: "idle" }, jobHash: null, draft: null, saveError: null, notSeen: false });
      }
    }
    if (session.getState().accounts === null) {
      away = true;
    } else if (away) {
      away = false;
      resume();
    }
    void recover();
  }

  // Back from a disconnect: an open submit or an interrupted check is asked about by key, as its call may never answer.
  function resume(): void {
    const { draft, step, outcome } = state;
    if (!draft || !(step === "confirm" || outcome?.kind === "checking" || outcome?.kind === "disconnected")) {
      return;
    }
    sending = null;
    epoch += 1;
    void lookup(draft);
  }

  function setText(text: string): void {
    if (text === state.text) {
      return;
    }
    if (state.draft && deps.storage) {
      removeIfUnsent(deps.storage, state.draft);
    }
    epoch += 1;
    const had = state.estimate.status === "ready" || state.estimate.status === "stale";
    set({
      text,
      parsed: parseJob(text),
      estimate: { status: had ? "stale" : "idle" },
      jobHash: null,
      draft: null,
      saveError: null,
      submitError: null,
      notSeen: false,
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
    set({
      estimate: { status: "loading" },
      jobHash: null,
      draft: null,
      saveError: null,
      submitError: null,
      notSeen: false,
    });
    let reply: Estimate;
    try {
      reply = await session.track(client.estimate({ job: parsed.job }));
    } catch (err) {
      const error = normalizeError(err);
      // Only these two move the session; a rejected estimate or a busy wallet is just this page's message.
      if (reportable(error)) {
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
    let draft: Draft | null = null;
    if (deps.storage && accounts) {
      const identity = { sdkAddress: accounts.node.sdkAddress, sdkNetwork: accounts.network.sdk };
      draft =
        findReusable(deps.storage, identity, jobHash) ??
        createDraft(deps.storage, {
          idempotencyKey: deps.newKey(),
          ...identity,
          jobHash,
          label: jobLabel(parsed.job),
          createdAt: deps.now(),
        });
    }
    set({ estimate: { status: "ready", estimate: reply }, jobHash, draft, saveError: draft ? null : SAVE_FAILED });
  }

  // Only a definitive answer retires the draft; any other outcome keeps its key for the same job.
  function finish(draft: Draft, outcome: Outcome): void {
    const kept = deps.storage ? markSettled(deps.storage, draft, isDefinitive(outcome)) : draft;
    set({ draft: kept, step: "outcome", outcome, cancelNote: false });
  }

  // Asks the wallet by key; never sends a submit. True only when the wallet has no record of the key.
  async function lookup(draft: Draft): Promise<boolean> {
    const client = session.getClient();
    if (!client) {
      return false;
    }
    const mine = epoch;
    set({ step: "outcome", outcome: { kind: "checking" }, cancelNote: false });
    let found;
    try {
      found = await session.track(client.getJob({ idempotencyKey: draft.idempotencyKey }));
    } catch (err) {
      const error = normalizeError(err);
      if (reportable(error)) {
        session.report(error);
      }
      if (mine === epoch) {
        finish(draft, error.code === 4100 ? { kind: "disconnected" } : { kind: "unknown", message: error.message });
      }
      return false;
    }
    if (mine !== epoch) {
      return false;
    }
    const result = classifyLookup(found);
    if (result.kind === "notSeen") {
      const open = deps.storage ? markSettled(deps.storage, draft, false) : draft;
      set({ step: "job", outcome: null, notSeen: true, draft: open });
      return true;
    }
    finish(draft, result.outcome);
    return false;
  }

  // Once per identity per page load: a draft that reached the wallet is accounted for before anything else shows.
  async function recover(): Promise<void> {
    const { accounts, phase } = session.getState();
    if (!accounts || phase !== "ready" || !deps.storage) {
      return;
    }
    const identity = { sdkAddress: accounts.node.sdkAddress, sdkNetwork: accounts.network.sdk };
    const id = JSON.stringify(identity);
    if (recovered.has(id)) {
      return;
    }
    recovered.add(id);
    prune(deps.storage, deps.now());
    const draft = newestFor(deps.storage, identity);
    // A draft never sent has no payment to account for; it waits for the same job to be estimated again.
    if (!draft || (draft.sentAt === null && !draft.settled) || state.step !== "job" || state.draft) {
      return;
    }
    set({ draft });
    await lookup(draft);
  }

  async function failed(error: GnusError, draft: Draft): Promise<void> {
    if (reportable(error)) {
      session.report(error);
    }
    const result = classifyError(error);
    if (result.kind === "outcome") {
      finish(draft, result.outcome);
    } else if (result.kind === "notSpent") {
      if (result.newKey && deps.storage) {
        removeDraft(deps.storage, draft.idempotencyKey);
      }
      set({
        step: "job",
        cancelNote: false,
        draft: result.newKey ? null : draft,
        submitError: { error, nothingSpentLine: result.nothingSpentLine, newKey: result.newKey },
      });
    } else {
      await lookup(draft);
    }
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
    const mine = {};
    sending = mine;
    try {
      // A key that went out before is asked about first: past the wallet's 24 h replay window only a lookup is safe.
      if (draft.sentAt !== null && !(await lookup(draft))) {
        return;
      }
      if (submitBlocker(state, session) !== null || state.draft?.idempotencyKey !== draft.idempotencyKey) {
        return;
      }
      const chainId = session.getState().accounts?.network.evmChainId ?? null;
      const sent = markSent(storage, draft, chainId, deps.now());
      if (!sent) {
        set({ saveError: SAVE_FAILED });
        return;
      }
      set({ draft: sent, step: "confirm", cancelNote: false, submitError: null, notSeen: false });
      let result: SubmitResult;
      try {
        result = await client.submitJob({ job: parsed.job, idempotencyKey: sent.idempotencyKey });
      } catch (err) {
        if (sending === mine) {
          await failed(normalizeError(err), sent);
        }
        return;
      }
      // An abandoned call that still answers is the truth about its key, as long as the page is on that key.
      if (sending === mine || state.draft?.idempotencyKey === sent.idempotencyKey) {
        finish(sent, classifyResult(result));
      }
    } finally {
      if (sending === mine) {
        sending = null;
      }
    }
  }

  async function checkAgain(): Promise<void> {
    const { draft, outcome } = state;
    if (!draft || (outcome?.kind !== "pending" && outcome?.kind !== "unknown" && outcome?.kind !== "disconnected")) {
      return;
    }
    await lookup(draft);
  }

  function newKey(): void {
    const { jobHash, parsed } = state;
    const accounts = session.getState().accounts;
    if (!state.submitError?.newKey || !jobHash || parsed.state !== "ok" || !accounts || !deps.storage) {
      return;
    }
    const draft = createDraft(deps.storage, {
      idempotencyKey: deps.newKey(),
      sdkAddress: accounts.node.sdkAddress,
      sdkNetwork: accounts.network.sdk,
      jobHash,
      label: jobLabel(parsed.job),
      createdAt: deps.now(),
    });
    set({ draft, submitError: null, saveError: draft ? null : SAVE_FAILED });
  }

  // An open draft stays: its key is what keeps the same job from being paid for twice, and a reload shows it again.
  function startOver(): void {
    if (state.draft && deps.storage && !isOpen(state.draft)) {
      removeDraft(deps.storage, state.draft.idempotencyKey);
    }
    epoch += 1;
    state = INITIAL;
    notify();
  }

  session.subscribe(onSession);
  void recover();

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
    showCancelNote: () => set({ cancelNote: true }),
    checkAgain,
    newKey,
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
