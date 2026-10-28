import type { Accounts, Earnings, Estimate, Job, JobStatus } from "../schema";
import { DEFAULT_PROFILE, MOCK_PROFILES, MockProfile, WireError, isMockProfileName } from "./profiles";
import type { InjectedProvider, Listener, RequestArgs } from "../transport/types";
import { MOCK_MARKER } from "./marker";
import { seedJobs } from "./seeds";

export interface MockControls {
  emit(event: string, payload: unknown): void;
  /** A new facade over the same state with no listeners; older facades stop receiving events. */
  reinject(): MockProvider;
  /** New node sdkAddress; emits gnus_accountsChanged with the new accounts. */
  switchAccount(): void;
  /** Emits gnus_networkChanged. */
  setNetwork(network: { sdk: string | null; evmChainId: number | null }): void;
  /** Moves a job to the next status (submitted, queued, processing, completed) or to the given one; emits gnus_jobUpdated. */
  advanceJob(burnTxHash: string, status?: string): void;
  /** Emits disconnect { code, message }; the code defaults to 4900. */
  disconnect(code?: number, message?: string): void;
  /** Settles the open connect prompt: approve connects the origin, decline rejects the waiting call with 4001. Throws when none is open. */
  answerConnect(approve: boolean): void;
  /** Forgets the origin: its next call prompts again, and open spend confirms reject 4100. */
  revokeOrigin(): void;
  burnCount(): number;
  /** Answers the open manual confirm: approve burns, reject answers the waiting call with 4001. Throws when none is open. */
  answerConfirm(approve: boolean): void;
  /** How many native confirms have opened since the mock was created. */
  confirmCount(): number;
  readonly calls: Array<{ method: string; params?: unknown }>;
}

export interface MockProvider extends InjectedProvider {
  readonly isGeniusWallet: true;
  readonly version: string;
  readonly mockMarker: typeof MOCK_MARKER;
  readonly controls: MockControls;
}

type Params = Record<string, unknown>;
type JobRecord = Job & { result: { cids: string[] } | null };

interface Replay {
  at: number;
  body: string;
  reply: unknown;
  rejected: boolean;
}

/** What the wallet writes once a confirm is approved, before it knows how the burn and Process ended. */
interface Intent {
  body: string;
  sdkAddress: string;
  payer: string | null;
  cost: string;
  createdAt: number;
  burnTxHash: string | null;
}

interface MockState {
  profile: MockProfile;
  accounts: Accounts;
  calls: Array<{ method: string; params?: unknown }>;
  deliver: (event: string, payload: unknown) => void;
  nodeCount: number;
  burns: number;
  jobs: JobRecord[];
  replays: Map<string, Replay>;
  cursors: Set<string>;
  submitInFlight: boolean;
  intents: Map<string, Intent>;
  confirms: number;
  pendingConfirm: { answer: (approve: boolean) => void } | null;
  createdAt: number;
  firstCallPending: boolean;
  estimating: boolean;
  connected: boolean;
  prompt: { settle: (approve: boolean) => void } | null;
  /** Open confirms to abort when the node account changes or the origin is revoked. */
  accountWatchers: Set<(err: WireError) => void>;
}

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MOCK_ORIGIN = "http://localhost:3000";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_KEY_LENGTH = 256;
const MAX_CURSOR_LENGTH = 512;
const MAX_JOB_DEPTH = 32;
const MAX_JOB_BYTES = 5 * 1024 * 1024;
const ACCOUNTS_CHANGED = "gnus_accountsChanged";
const STATUS_ORDER: readonly string[] = ["submitted", "queued", "processing", "completed"];

const units = (whole: string): string => whole + "0".repeat(18);

// ponytail: amounts are fixed strings per profile and the balance never drops after a burn, so amount.ts stays the only amount math. Upgrade: compare through amount.ts if a profile needs it.
function amountsFor(profile: MockProfile): { cost: string; payerBalance: string; nodeBalance: string; earned: string } {
  if (profile.bigAmounts) {
    return {
      cost: units("1000"),
      payerBalance: units("5000"),
      nodeBalance: "9007199254740993",
      earned: "18446744073709551617",
    };
  }
  return { cost: units("3"), payerBalance: units("50"), nodeBalance: units("12"), earned: units("7") };
}

// Hex values are built from short patterns so no long high-entropy literal sits in source.
function sdkAddressFor(index: number): Accounts["node"]["sdkAddress"] {
  return ("0x" + ((0xa1 + index) % 256).toString(16).padStart(2, "0").repeat(64)) as Accounts["node"]["sdkAddress"];
}

function initialAccounts(profile: MockProfile): Accounts {
  const nulls = profile.data === "allNulls";
  const evm = ("0x" + "b2".repeat(20)) as NonNullable<Accounts["node"]["linkedEvm"]>;
  return {
    node: { sdkAddress: sdkAddressFor(0), linkedEvm: nulls ? null : evm, role: "main", main: null },
    payer: { evmAddress: nulls ? null : evm, canSign: !nulls && profile.payerCanSign !== false },
    switching: false,
    network: { sdk: "staging", evmChainId: 80002 },
    version: "1",
    unit: { symbol: "GNUS", decimals: 18 },
  };
}

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fail(code: number, message: string, reason?: string, extra?: Record<string, unknown>): WireError {
  return reason === undefined ? { code, message } : { code, message, data: { reason, ...extra } };
}

const invalid = (message: string, reason?: string) => fail(-32602, message, reason);

function pause(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function emitFrom(state: MockState, event: string, payload: unknown): void {
  state.deliver(event, copy(payload));
}

function changeNode(state: MockState): void {
  state.nodeCount += 1;
  state.accounts.node.sdkAddress = sdkAddressFor(state.nodeCount);
  const watchers = [...state.accountWatchers];
  state.accountWatchers.clear();
  for (const abort of watchers) {
    abort(fail(-32015, "The account changed while the confirm was open", "account_changed"));
  }
  emitFrom(state, ACCOUNTS_CHANGED, state.accounts);
}

function isPlainObject(value: unknown): value is Params {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function paramsOf(args: RequestArgs, required: boolean): Params {
  if (args.params === undefined) {
    if (required) {
      throw invalid("Invalid params: an object is required");
    }
    return {};
  }
  if (!isPlainObject(args.params)) {
    throw invalid("Invalid params: params must be an object");
  }
  return args.params;
}

// Same rule as the wallet's job check; it does not look for any particular key.
function withinJobDepth(value: unknown, depth: number): boolean {
  if (depth > MAX_JOB_DEPTH) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.every((child) => withinJobDepth(child, depth + 1));
  }
  if (isPlainObject(value)) {
    return Object.values(value).every((child) => withinJobDepth(child, depth + 1));
  }
  return true;
}

function jobOf(params: Params): Params {
  const job = params.job;
  if (!isPlainObject(job) || Object.keys(job).length === 0 || !withinJobDepth(job, 1)) {
    throw invalid("Invalid params: job must be a non-empty object nested at most 32 levels");
  }
  if (new TextEncoder().encode(JSON.stringify(job)).length > MAX_JOB_BYTES) {
    throw invalid("Invalid params: job is larger than 5 MiB");
  }
  return job;
}

function boundedString(value: unknown, name: string, max: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    throw invalid(`Invalid params: ${name} must be a string of 1 to ${max} characters`);
  }
  return value;
}

function createFacade(state: MockState): MockProvider {
  const listeners = new Map<string, Set<Listener>>();
  state.deliver = (event, payload) => {
    for (const listener of [...(listeners.get(event) ?? [])]) {
      listener(payload);
    }
  };
  const profile = state.profile;
  const data = profile.data;
  const amounts = amountsFor(profile);
  const node = (): string => state.accounts.node.sdkAddress;
  const mine = (): JobRecord[] => state.jobs.filter((job) => job.sdkAddress === node());
  const publicJob = ({ result: _result, ...job }: JobRecord): Job => job;

  async function getAccounts(): Promise<Accounts> {
    await admit("gnus_getAccounts");
    return state.accounts;
  }

  async function estimate(args: RequestArgs): Promise<Estimate> {
    jobOf(paramsOf(args, true));
    await admit("gnus_estimate");
    if (profile.busyWhenConcurrent) {
      if (state.estimating) {
        throw fail(-32005, "Too many requests", "rate_limited");
      }
      state.estimating = true;
      try {
        await pause(1000);
      } finally {
        state.estimating = false;
      }
    }
    const nulls = data === "allNulls";
    let balance: string | null = amounts.payerBalance;
    if (nulls || profile.balanceUnreadable) {
      balance = null;
    } else if (profile.balanceBelowCost) {
      balance = units("1");
    }
    return {
      cost: amounts.cost as Estimate["cost"],
      gas: nulls ? null : { gasPriceGwei: "30.5" as Estimate["cost"], symbol: "POL" },
      balance: balance as Estimate["balance"],
      network: state.accounts.network,
    };
  }

  // The wallet checks params first, then the connection, then readiness, then a switch in progress.
  async function admit(method: string): Promise<void> {
    if (!state.connected) {
      if (state.prompt) {
        throw fail(-32005, "A connect prompt is already open", "confirm_open");
      }
      await new Promise<void>((resolve, reject) => {
        const timer =
          profile.connectPromptMs === undefined
            ? undefined
            : setTimeout(() => state.prompt?.settle(true), profile.connectPromptMs);
        state.prompt = {
          settle(approve) {
            clearTimeout(timer);
            state.prompt = null;
            state.connected = approve;
            if (approve) {
              resolve();
            } else {
              reject(fail(4001, "User rejected the request"));
            }
          },
        };
      });
    }
    if (profile.notReadyForMs !== undefined && Date.now() - state.createdAt < profile.notReadyForMs) {
      throw fail(4900, "Wallet not ready");
    }
    if (state.accounts.switching && method !== "gnus_getAccounts") {
      throw fail(-32015, "Account switch in progress");
    }
  }

  // Resolves after the native confirm; a node account change or a revoke meanwhile aborts it with nothing burned.
  function confirmWait(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const abort = (err: WireError): void => {
        clearTimeout(timer);
        reject(err);
      };
      const timer = setTimeout(() => {
        state.accountWatchers.delete(abort);
        resolve();
      }, ms);
      state.accountWatchers.add(abort);
    });
  }

  // Waits for controls.answerConfirm; a node account change or a revoke aborts it like the timed confirm.
  function manualConfirmWait(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const abort = (err: WireError): void => {
        state.pendingConfirm = null;
        reject(err);
      };
      state.accountWatchers.add(abort);
      state.pendingConfirm = {
        answer(approve) {
          state.accountWatchers.delete(abort);
          state.pendingConfirm = null;
          resolve(approve);
        },
      };
    });
  }

  async function submitJob(args: RequestArgs): Promise<unknown> {
    const params = paramsOf(args, true);
    const job = jobOf(params);
    const key = boundedString(params.idempotencyKey, "idempotencyKey", MAX_KEY_LENGTH);
    await admit("gnus_submitJob");
    // ponytail: bodies are compared as JSON.stringify(job), so key order counts. Upgrade: canonical JSON if the wallet documents its rule.
    const body = JSON.stringify(job);
    const earlier = state.replays.get(key);
    if (earlier && Date.now() - earlier.at <= IDEMPOTENCY_WINDOW_MS) {
      if (earlier.body !== body) {
        throw invalid("The idempotency key was used for a different job", "idempotency_key_reused");
      }
      if (earlier.rejected) {
        throw copy(earlier.reply);
      }
      return earlier.reply;
    }
    // An intent without a record means the wallet lost how the earlier submit ended; a retry must not pay again.
    const intent = state.intents.get(key);
    if (intent) {
      if (intent.body !== body) {
        throw invalid("The idempotency key was used for a different job", "idempotency_key_reused");
      }
      throw fail(-32603, "The earlier submit has no recorded outcome", "submission_outcome_unknown", {
        idempotencyKey: key,
        burnTxHash: intent.burnTxHash,
        sdkAddress: intent.sdkAddress,
        payer: intent.payer,
        cost: intent.cost,
        createdAt: new Date(intent.createdAt).toISOString(),
      });
    }
    if (state.submitInFlight) {
      throw fail(-32005, "A submit is already in flight", "submit_in_flight");
    }
    state.submitInFlight = true;
    try {
      if (!state.accounts.payer.canSign) {
        throw fail(-32012, "The paying wallet cannot sign", state.accounts.payer.evmAddress === null ? "no_wallet" : undefined);
      }
      if (profile.balanceUnreadable) {
        throw fail(-32603, "The payer balance cannot be read", "balance_unavailable");
      }
      state.confirms += 1;
      let approved = profile.confirm !== "reject";
      if (profile.confirm === "manual") {
        approved = await manualConfirmWait();
      } else {
        await confirmWait(profile.confirmDelayMs ?? 0);
      }
      if (!approved) {
        throw fail(4001, "User rejected the request");
      }
      const outcome = profile.submitOutcome ?? "submitted";
      if (outcome === "bridgeFailed") {
        throw fail(-32013, "The bridge transaction failed");
      }
      const written: Intent = {
        body,
        sdkAddress: node(),
        payer: state.accounts.payer.evmAddress,
        cost: amounts.cost,
        createdAt: Date.now(),
        burnTxHash: null,
      };
      state.intents.set(key, written);
      if (outcome === "outcomeUnknown") {
        throw fail(-32603, "The earlier submit has no recorded outcome", "submission_outcome_unknown", {
          idempotencyKey: key,
          burnTxHash: null,
          sdkAddress: written.sdkAddress,
          payer: written.payer,
          cost: written.cost,
          createdAt: new Date(written.createdAt).toISOString(),
        });
      }
      state.burns += 1;
      const burnTxHash = "0x" + state.burns.toString(16).padStart(64, "0");
      written.burnTxHash = burnTxHash;
      if (outcome === "walletStops") {
        // As after a wallet restart: the burn happened, the call never answers, and the in-flight slot is free again.
        state.submitInFlight = false;
        return new Promise<never>(() => {});
      }
      const record: JobRecord = {
        jobId: null,
        burnTxHash: burnTxHash as Job["burnTxHash"],
        sdkAddress: state.accounts.node.sdkAddress,
        origin: MOCK_ORIGIN,
        idempotencyKey: key,
        submittedAt: new Date().toISOString(),
        cost: amounts.cost as Job["cost"],
        status: "bridgedNotProcessed",
        result: null,
      };
      state.jobs.push(record);
      state.intents.delete(key);
      if (outcome === "bridgedNotProcessedError") {
        const error: WireError = { code: -32014, message: "Burn succeeded, Process failed", data: { burnTxHash } };
        state.replays.set(key, { at: Date.now(), body, reply: error, rejected: true });
        throw copy(error);
      }
      if (outcome === "submitted") {
        await pause(0);
        record.status = "submitted";
        record.jobId = data === "populated" ? `job-${state.burns}` : null;
      } else if (outcome === "unconfirmed") {
        record.status = "unconfirmed";
      }
      const result = { jobId: record.jobId, burnTxHash, sdkAddress: record.sdkAddress, status: record.status };
      state.replays.set(key, { at: Date.now(), body, reply: result, rejected: false });
      return result;
    } finally {
      state.submitInFlight = false;
    }
  }

  async function listJobs(args: RequestArgs): Promise<unknown> {
    const params = paramsOf(args, false);
    let limit = DEFAULT_LIMIT;
    if (params.limit !== undefined) {
      if (typeof params.limit !== "number" || !Number.isInteger(params.limit) || params.limit < 1 || params.limit > MAX_LIMIT) {
        throw invalid(`Invalid params: limit must be a whole number from 1 to ${MAX_LIMIT}`);
      }
      limit = params.limit;
    }
    let start = 0;
    if (params.cursor !== undefined) {
      const cursor = boundedString(params.cursor, "cursor", MAX_CURSOR_LENGTH);
      if (!state.cursors.has(cursor)) {
        throw invalid("Invalid params: unknown cursor");
      }
      start = Number(cursor.slice(1));
    }
    await admit("gnus_listJobs");
    const newestFirst = mine().reverse();
    const end = start + limit;
    let nextCursor: string | null = null;
    if (end < newestFirst.length) {
      nextCursor = `c${end}`;
      state.cursors.add(nextCursor);
    }
    return { jobs: newestFirst.slice(start, end).map(publicJob), nextCursor };
  }

  async function getJob(args: RequestArgs): Promise<unknown> {
    const params = paramsOf(args, true);
    const given = (["jobId", "burnTxHash", "idempotencyKey"] as const).filter(
      (name) => params[name] !== undefined && params[name] !== null,
    );
    if (given.length !== 1) {
      throw invalid("Invalid params: give exactly one of jobId, burnTxHash, idempotencyKey");
    }
    const selector = given[0];
    const value = boundedString(params[selector], selector, MAX_KEY_LENGTH);
    await admit("gnus_getJob");
    const found = mine().find((job) => job[selector] === value);
    if (!found) {
      const pending = selector === "idempotencyKey" ? state.intents.get(value) : undefined;
      if (pending && pending.sdkAddress === node()) {
        return {
          status: "pending",
          jobId: null,
          burnTxHash: pending.burnTxHash,
          sdkAddress: pending.sdkAddress,
          origin: MOCK_ORIGIN,
          idempotencyKey: value,
          submittedAt: new Date(pending.createdAt).toISOString(),
          cost: pending.cost,
          result: null,
        };
      }
      return null;
    }
    const completed = data === "populated" && found.status === "completed";
    return { ...publicJob(found), result: completed ? { cids: ["bafy" + "q".repeat(40)] } : null };
  }

  async function getEarnings(args: RequestArgs): Promise<Earnings> {
    const params = paramsOf(args, false);
    if (params.includeChildren !== undefined && typeof params.includeChildren !== "boolean") {
      throw invalid("Invalid params: includeChildren must be a boolean");
    }
    await admit("gnus_getEarnings");
    const filled = data === "populated";
    return {
      sdkAddress: state.accounts.node.sdkAddress,
      balance: amounts.nodeBalance as Earnings["balance"],
      processing: { isProcessing: true, jobsProcessed: filled ? ("42" as Earnings["balance"]) : null },
      earned: {
        total: filled ? (amounts.earned as Earnings["balance"]) : null,
        history: filled
          ? [{ at: "2026-10-01T12:00:00.000Z", amount: units("1") as Earnings["balance"], jobId: "job-0" }]
          : null,
      },
    };
  }

  function scriptedError(method: string): WireError | undefined {
    for (const name of [method, "*"]) {
      if (profile.errors && Object.hasOwn(profile.errors, name)) {
        return profile.errors[name];
      }
    }
    return undefined;
  }

  // The scripted faults of the profile, checked before any method handler runs.
  function preDispatch(method: string): void {
    if (state.firstCallPending) {
      state.firstCallPending = false;
      if (profile.firstCallError) {
        throw copy(profile.firstCallError);
      }
    }
    const scripted = scriptedError(method);
    if (scripted) {
      throw copy(scripted);
    }
  }

  // Applied to the built reply just before it is returned, nowhere else.
  function applyMalformed(reply: unknown, method: string): unknown {
    const body = reply as Record<string, unknown> & Partial<Accounts>;
    if (profile.malformed === "numericAmount") {
      for (const key of ["cost", "balance"]) {
        if (typeof body[key] === "string") {
          body[key] = Number(body[key]);
        }
      }
    } else if (method === "gnus_getAccounts" && body.node && body.payer) {
      if (profile.malformed === "swappedAddress") {
        const sdk = body.node.sdkAddress;
        body.node.sdkAddress = body.payer.evmAddress as never;
        body.payer.evmAddress = sdk as never;
      } else if (profile.malformed === "missingField") {
        delete body.unit;
      }
    }
    return body;
  }

  async function request(args: RequestArgs): Promise<unknown> {
    state.calls.push(args.params === undefined ? { method: args.method } : { method: args.method, params: args.params });
    preDispatch(args.method);
    let built: unknown;
    switch (args.method) {
      case "gnus_getAccounts":
        built = await getAccounts();
        break;
      case "gnus_estimate":
        built = await estimate(args);
        break;
      case "gnus_submitJob":
        built = await submitJob(args);
        break;
      case "gnus_listJobs":
        built = await listJobs(args);
        break;
      case "gnus_getJob":
        built = await getJob(args);
        break;
      case "gnus_getEarnings":
        built = await getEarnings(args);
        break;
      default:
        throw fail(4200, "Method not supported");
    }
    const reply = copy(built);
    return profile.malformed === undefined || reply === null ? reply : applyMalformed(reply, args.method);
  }

  const controls: MockControls = {
    emit: (event, payload) => state.deliver(event, payload),
    reinject: () => createFacade(state),
    switchAccount: () => changeNode(state),
    setNetwork(network) {
      state.accounts.network = { ...network };
      emitFrom(state, "gnus_networkChanged", state.accounts.network);
    },
    advanceJob(burnTxHash, status) {
      const found = state.jobs.find((job) => job.burnTxHash === burnTxHash);
      if (!found) {
        throw new Error(`Mock has no job with burnTxHash ${burnTxHash}`);
      }
      const next = status ?? STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(found.status) + 1, STATUS_ORDER.length - 1)];
      found.status = next as JobStatus;
      emitFrom(state, "gnus_jobUpdated", publicJob(found));
    },
    disconnect(code = 4900, message = "Wallet disconnected") {
      emitFrom(state, "disconnect", { code, message });
    },
    answerConnect(approve) {
      if (!state.prompt) {
        throw new Error("Mock has no open connect prompt");
      }
      state.prompt.settle(approve);
    },
    revokeOrigin() {
      state.connected = false;
      const watchers = [...state.accountWatchers];
      state.accountWatchers.clear();
      for (const abort of watchers) {
        abort(fail(4100, "The origin was revoked while the confirm was open"));
      }
    },
    burnCount: () => state.burns,
    answerConfirm(approve) {
      if (!state.pendingConfirm) {
        throw new Error("Mock has no open confirm");
      }
      state.pendingConfirm.answer(approve);
    },
    confirmCount: () => state.confirms,
    calls: state.calls,
  };

  return {
    isGeniusWallet: true,
    version: "1",
    mockMarker: MOCK_MARKER,
    request,
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener);
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
    },
    controls,
  };
}

export function createMockProvider(options?: { profile?: string }): MockProvider {
  const name = options?.profile ?? DEFAULT_PROFILE;
  if (!isMockProfileName(name)) {
    throw new Error(`Unknown mock profile "${name}". Known profiles: ${Object.keys(MOCK_PROFILES).join(", ")}`);
  }
  const profile: MockProfile = MOCK_PROFILES[name];
  const state: MockState = {
    profile,
    accounts: initialAccounts(profile),
    calls: [],
    deliver: () => {},
    nodeCount: 0,
    burns: 0,
    jobs: seedJobs(profile.jobs, sdkAddressFor(0)),
    replays: new Map(),
    cursors: new Set(),
    submitInFlight: false,
    intents: new Map(),
    confirms: 0,
    pendingConfirm: null,
    createdAt: Date.now(),
    firstCallPending: profile.firstCallError !== undefined,
    estimating: false,
    connected: profile.connectPromptMs === undefined,
    prompt: null,
    accountWatchers: new Set(),
  };
  const provider = createFacade(state);
  if (profile.switchingForMs !== undefined) {
    // Contract: -32015 means retry after gnus_accountsChanged.
    state.accounts.switching = true;
    setTimeout(() => emitFrom(state, ACCOUNTS_CHANGED, state.accounts), 0);
    setTimeout(() => {
      state.accounts.switching = false;
      changeNode(state);
    }, profile.switchingForMs);
  }
  return provider;
}
