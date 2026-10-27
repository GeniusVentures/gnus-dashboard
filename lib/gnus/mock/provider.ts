import type { Accounts, Earnings, Estimate, Job, JobStatus } from "../schema";
import { DEFAULT_PROFILE, MOCK_PROFILES, MockProfile, isMockProfileName } from "./profiles";
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
  result: unknown;
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
}

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MOCK_ORIGIN = "http://localhost:3000";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_KEY_LENGTH = 256;
const MAX_CURSOR_LENGTH = 512;
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
    payer: { evmAddress: nulls ? null : evm, canSign: !nulls },
    switching: false,
    network: { sdk: "staging", evmChainId: 80002 },
    version: "1",
    unit: { symbol: "GNUS", decimals: 18 },
  };
}

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function fail(code: number, message: string, reason?: string): { code: number; message: string; data?: { reason: string } } {
  return reason === undefined ? { code, message } : { code, message, data: { reason } };
}

const invalid = (message: string, reason?: string) => fail(-32602, message, reason);

function pause(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
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
  const emit = (event: string, payload: unknown): void => state.deliver(event, copy(payload));

  const data = state.profile.data;
  const amounts = amountsFor(state.profile);
  const node = (): string => state.accounts.node.sdkAddress;
  const mine = (): JobRecord[] => state.jobs.filter((job) => job.sdkAddress === node());
  const publicJob = ({ result: _result, ...job }: JobRecord): Job => job;

  function getAccounts(): Accounts {
    return state.accounts;
  }

  function estimate(args: RequestArgs): Estimate {
    jobOf(paramsOf(args, true));
    const nulls = data === "allNulls";
    return {
      cost: amounts.cost,
      gas: nulls ? null : { gasPriceGwei: "30.5", symbol: "POL" },
      balance: nulls ? null : amounts.payerBalance,
      network: state.accounts.network,
    };
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
      return earlier.result;
    }
    if (state.submitInFlight) {
      throw fail(-32005, "A submit is already in flight", "submit_in_flight");
    }
    state.submitInFlight = true;
    try {
      if (!state.accounts.payer.canSign) {
        throw fail(-32012, "The paying wallet cannot sign", state.accounts.payer.evmAddress === null ? "no_wallet" : "view_only");
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
      await pause(0);
      record.status = "submitted";
      record.jobId = data === "populated" ? `job-${state.burns}` : null;
      const result = {
        jobId: record.jobId,
        burnTxHash,
        sdkAddress: record.sdkAddress,
        status: "submitted",
      };
      state.replays.set(key, { at: Date.now(), body, result });
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

  async function request(args: RequestArgs): Promise<unknown> {
    state.calls.push(args.params === undefined ? { method: args.method } : { method: args.method, params: args.params });
    switch (args.method) {
      case "gnus_getAccounts":
        return copy(getAccounts());
      case "gnus_estimate":
        return copy(estimate(args));
      case "gnus_submitJob":
        return copy(await submitJob(args));
      case "gnus_listJobs":
        return copy(listJobs(args));
      case "gnus_getJob":
        return copy(getJob(args));
      case "gnus_getEarnings":
        return copy(getEarnings(args));
      default:
        throw fail(4200, "Method not supported");
    }
  }

  const controls: MockControls = {
    emit: (event, payload) => state.deliver(event, payload),
    reinject: () => createFacade(state),
    switchAccount() {
      state.nodeCount += 1;
      state.accounts.node.sdkAddress = sdkAddressFor(state.nodeCount);
      emit("gnus_accountsChanged", state.accounts);
    },
    setNetwork(network) {
      state.accounts.network = { ...network };
      emit("gnus_networkChanged", state.accounts.network);
    },
    advanceJob(burnTxHash, status) {
      const found = state.jobs.find((job) => job.burnTxHash === burnTxHash);
      if (!found) {
        throw new Error(`Mock has no job with burnTxHash ${burnTxHash}`);
      }
      const next = status ?? STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(found.status) + 1, STATUS_ORDER.length - 1)];
      found.status = next as JobStatus;
      emit("gnus_jobUpdated", publicJob(found));
    },
    disconnect(code = 4900, message = "Wallet disconnected") {
      emit("disconnect", { code, message });
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
  };
  return createFacade(state);
}
