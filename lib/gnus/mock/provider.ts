import type { Accounts, Earnings, Estimate, Job, JobStatus } from "../schema";
import { DEFAULT_PROFILE, MOCK_PROFILES, MockProfile, WireError, isMockProfileName } from "./profiles";
import type { InjectedProvider, Listener, RequestArgs } from "../transport/types";

export const MOCK_MARKER = "__GNUS_MOCK__";

export interface MockControls {
  emit(event: string, payload: unknown): void;
  /** A new facade over the same state with no listeners; older facades stop receiving events. */
  reinject(): MockProvider;
  /** New node sdkAddress; emits gnus_accountsChanged with the new accounts. */
  switchAccount(): void;
  /** Emits gnus_networkChanged. */
  setNetwork(network: { sdk: string; evmChainId: number }): void;
  /** Moves a job to the next status (submitted, queued, processing, completed) or to the given one; emits gnus_jobUpdated. */
  advanceJob(burnTxHash: string, status?: string): void;
  /** Emits disconnect { code, message }; the code defaults to 4900. */
  disconnect(code?: number, message?: string): void;
  burnCount(): number;
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
  createdAt: number;
  firstCallPending: boolean;
  estimating: boolean;
  /** Open confirms to abort when the node account changes. */
  accountWatchers: Set<() => void>;
}

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MOCK_ORIGIN = "http://localhost:3000";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_KEY_LENGTH = 256;
const MAX_CURSOR_LENGTH = 512;
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

function fail(code: number, message: string, reason?: string): WireError {
  return reason === undefined ? { code, message } : { code, message, data: { reason } };
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
    abort();
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

function jobOf(params: Params): Params {
  const job = params.job;
  if (!isPlainObject(job)) {
    throw invalid("Invalid params: job must be an object");
  }
  if (!("passes" in job) && ("data" in job || "model" in job || "input" in job)) {
    throw invalid("Invalid params: the data/model/input job shape is not accepted");
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

  function getAccounts(): Accounts {
    return state.accounts;
  }

  async function estimate(args: RequestArgs): Promise<Estimate> {
    jobOf(paramsOf(args, true));
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

  // Resolves after the native confirm; a node account change meanwhile aborts it with nothing burned.
  function confirmWait(ms: number): Promise<void> {
    if (ms <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        clearTimeout(timer);
        reject(fail(-32015, "The account changed while the confirm was open", "account_changed"));
      };
      const timer = setTimeout(() => {
        state.accountWatchers.delete(abort);
        resolve();
      }, ms);
      state.accountWatchers.add(abort);
    });
  }

  async function submitJob(args: RequestArgs): Promise<unknown> {
    const params = paramsOf(args, true);
    const job = jobOf(params);
    const key = boundedString(params.idempotencyKey, "idempotencyKey", MAX_KEY_LENGTH);
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
      await confirmWait(profile.confirmDelayMs ?? 0);
      if (profile.confirm === "reject") {
        throw fail(4001, "User rejected the request");
      }
      const outcome = profile.submitOutcome ?? "submitted";
      if (outcome === "bridgeFailed") {
        throw fail(-32013, "The bridge transaction failed");
      }
      state.burns += 1;
      const burnTxHash = "0x" + state.burns.toString(16).padStart(64, "0");
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
      if (outcome === "bridgedNotProcessedError") {
        const error: WireError = { code: -32014, message: "Burn succeeded, Process failed", data: { burnTxHash } };
        state.replays.set(key, { at: Date.now(), body, reply: error, rejected: true });
        throw copy(error);
      }
      if (outcome === "submitted") {
        await pause(0);
        record.status = "submitted";
        record.jobId = data === "populated" ? `job-${state.burns}` : null;
      }
      const result = { jobId: record.jobId, burnTxHash, sdkAddress: record.sdkAddress, status: record.status };
      state.replays.set(key, { at: Date.now(), body, reply: result, rejected: false });
      return result;
    } finally {
      state.submitInFlight = false;
    }
  }

  function listJobs(args: RequestArgs): unknown {
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
    const newestFirst = mine().reverse();
    const end = start + limit;
    let nextCursor: string | null = null;
    if (end < newestFirst.length) {
      nextCursor = `c${end}`;
      state.cursors.add(nextCursor);
    }
    return { jobs: newestFirst.slice(start, end).map(publicJob), nextCursor };
  }

  function getJob(args: RequestArgs): unknown {
    const params = paramsOf(args, true);
    const given = (["jobId", "burnTxHash", "idempotencyKey"] as const).filter(
      (name) => params[name] !== undefined && params[name] !== null,
    );
    if (given.length !== 1) {
      throw invalid("Invalid params: give exactly one of jobId, burnTxHash, idempotencyKey");
    }
    const selector = given[0];
    const value = boundedString(params[selector], selector, MAX_KEY_LENGTH);
    const found = mine().find((job) => job[selector] === value);
    if (!found) {
      return null;
    }
    const completed = data === "populated" && found.status === "completed";
    return { ...publicJob(found), result: completed ? { cids: ["bafy" + "q".repeat(40)] } : null };
  }

  function getEarnings(args: RequestArgs): Earnings {
    const params = paramsOf(args, false);
    if (params.includeChildren !== undefined && typeof params.includeChildren !== "boolean") {
      throw invalid("Invalid params: includeChildren must be a boolean");
    }
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
    if (profile.notReadyForMs !== undefined && Date.now() - state.createdAt < profile.notReadyForMs) {
      throw fail(4900, "Wallet not ready");
    }
    if (state.accounts.switching && method !== "gnus_getAccounts") {
      throw fail(-32015, "Account switch in progress");
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
        built = getAccounts();
        break;
      case "gnus_estimate":
        built = await estimate(args);
        break;
      case "gnus_submitJob":
        built = await submitJob(args);
        break;
      case "gnus_listJobs":
        built = listJobs(args);
        break;
      case "gnus_getJob":
        built = getJob(args);
        break;
      case "gnus_getEarnings":
        built = getEarnings(args);
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
    burnCount: () => state.burns,
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
    jobs: [],
    replays: new Map(),
    cursors: new Set(),
    submitInFlight: false,
    createdAt: Date.now(),
    firstCallPending: profile.firstCallError !== undefined,
    estimating: false,
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
