import "./marker";
import type { SeedKind } from "./seeds";

export type WireError = { code: number; message: string; data?: Record<string, unknown> };

const wire = (code: number, message: string, reason?: string, extra?: Record<string, unknown>): WireError =>
  reason === undefined ? { code, message } : { code, message, data: { reason, ...extra } };

export interface MockProfile {
  readonly description: string;
  /** What the SDK behind the wallet can fill: today = SDK gaps are null; populated = every field set; allNulls = every nullable field null. */
  readonly data: "today" | "populated" | "allNulls";
  /** Amounts above 2^53: balance "9007199254740993", cost "1000000000000000000000", earned.total "18446744073709551617". */
  readonly bigAmounts?: boolean;
  /** Jobs the first node account already has when the mock starts. */
  readonly jobs?: SeedKind;
  /** The page's first request rejects with this (connect prompt rejected). */
  readonly firstCallError?: WireError;
  /** A method name, or "*" for every method, rejects with this. */
  readonly errors?: Partial<Record<string, WireError>>;
  /** Every method rejects 4900 until this long after creation. */
  readonly notReadyForMs?: number;
  /** Account switching window from creation: other methods are -32015, then a new account. */
  readonly switchingForMs?: number;
  /** The native confirm takes this long. */
  readonly confirmDelayMs?: number;
  /** reject: 4001 after the delay, nothing burned. manual: waits for controls.answerConfirm. */
  readonly confirm?: "approve" | "reject" | "manual";
  readonly submitOutcome?:
    | "submitted"
    | "bridgeFailed"
    | "bridgedNotProcessedStatus"
    | "bridgedNotProcessedError"
    | "unconfirmed"
    | "outcomeUnknown"
    /** The burn happens, then the call never answers: the wallet died mid-submit. */
    | "walletStops";
  /** The origin starts unconnected: the first call opens a prompt that approves itself after this long unless answered. */
  readonly connectPromptMs?: number;
  /** Estimate takes 1000 ms; a second one meanwhile is -32005 rate_limited. */
  readonly busyWhenConcurrent?: boolean;
  /** Estimate balance is a fixed string below cost. */
  readonly balanceBelowCost?: boolean;
  /** false: the payer cannot sign. */
  readonly payerCanSign?: boolean;
  /** Estimate balance is null; submit fails closed with -32603 balance_unavailable. */
  readonly balanceUnreadable?: boolean;
  readonly malformed?: "numericAmount" | "swappedAddress" | "missingField";
}

export const MOCK_PROFILES = {
  today: {
    description: "What the wallet answers today: SDK fields it cannot fill yet are null",
    data: "today",
  },
  populated: {
    description: "The SDK gaps are filled: job ids, jobs processed, earned total and history, job results",
    data: "populated",
  },
  allNulls: {
    description: "Every nullable field is null and the payer cannot sign, so submit is refused",
    data: "allNulls",
  },
  bigAmounts: {
    description: "Populated, with amounts above 2^53 that a JS number would round",
    data: "populated",
    bigAmounts: true,
  },
  jobHistory: {
    description: "25 jobs for the first node account, the three statuses the wallet can report today, two pages of 20",
    data: "today",
    jobs: "history",
  },
  readsFail: {
    description: "Job history is seeded but gnus_listJobs, gnus_getJob and gnus_getEarnings fail with -32603",
    data: "today",
    jobs: "history",
    errors: {
      gnus_listJobs: wire(-32603, "Internal error"),
      gnus_getJob: wire(-32603, "Internal error"),
      gnus_getEarnings: wire(-32603, "Internal error"),
    },
  },
  connectRejected: {
    description: "The connect prompt is rejected: the first call is 4001, later calls work",
    data: "today",
    firstCallError: wire(4001, "User rejected the request"),
  },
  rejectConfirm: {
    description: "The user rejects the native confirm: submit is 4001, nothing burned or recorded",
    data: "today",
    confirm: "reject",
  },
  connectPrompt: {
    description: "The origin starts unconnected: the first call opens a connect prompt that approves itself after 5 s",
    data: "today",
    connectPromptMs: 5000,
  },
  originNotAllowed: {
    description: "The origin was revoked: every call is 4100",
    data: "today",
    errors: { "*": wire(4100, "Origin not allowed") },
  },
  methodUnsupported: {
    description: "An older wallet without earnings: gnus_getEarnings is 4200",
    data: "today",
    errors: { gnus_getEarnings: wire(4200, "Method not supported") },
  },
  sdkStarting: {
    description: "The SDK is still starting: every call is 4900 for 5 s, then fine",
    data: "today",
    notReadyForMs: 5000,
  },
  internalError: {
    description: "gnus_estimate fails with -32603",
    data: "today",
    errors: { gnus_estimate: wire(-32603, "Internal error") },
  },
  rateLimited: {
    description: "Estimate takes 1 s and a second concurrent estimate is -32005 rate_limited",
    data: "today",
    busyWhenConcurrent: true,
  },
  confirmOpen: {
    description: "Another confirm is open in the wallet: submit is -32005 confirm_open",
    data: "today",
    errors: { gnus_submitJob: wire(-32005, "A confirm is already open", "confirm_open") },
  },
  costUnavailable: {
    description: "The SDK price is unavailable: estimate and submit are -32010",
    data: "today",
    errors: {
      gnus_estimate: wire(-32010, "Cost unavailable"),
      gnus_submitJob: wire(-32010, "Cost unavailable"),
    },
  },
  insufficientBalance: {
    description: "The payer holds less than the cost: estimate shows both, submit is -32011",
    data: "today",
    balanceBelowCost: true,
    errors: { gnus_submitJob: wire(-32011, "Insufficient GNUS balance") },
  },
  payerCannotSign: {
    description: "The paying wallet cannot sign: submit is -32012",
    data: "today",
    payerCanSign: false,
  },
  balanceUnavailable: {
    description: "The payer balance cannot be read: estimate balance null, submit -32603 balance_unavailable",
    data: "today",
    balanceUnreadable: true,
  },
  bridgeFailed: {
    description: "The burn fails: submit is -32013, nothing spent or recorded",
    data: "today",
    submitOutcome: "bridgeFailed",
  },
  bridgeUnavailable: {
    description: "The wallet has no bridge on its EVM network: estimate and submit are -32013 bridge_unavailable",
    data: "today",
    errors: {
      gnus_estimate: wire(-32013, "No bridge on this network", "bridge_unavailable"),
      gnus_submitJob: wire(-32013, "No bridge on this network", "bridge_unavailable"),
    },
  },
  unconfirmedSubmit: {
    description: "The burn was sent but not confirmed: submit resolves with status unconfirmed, one burn, job listed",
    data: "today",
    submitOutcome: "unconfirmed",
  },
  submissionOutcomeUnknown: {
    description: "A same-key submit whose earlier outcome was lost: -32603 submission_outcome_unknown, no burn hash",
    data: "today",
    submitOutcome: "outcomeUnknown",
  },
  bridgedNotProcessedStatus: {
    description: "Paid but not processed, as a result: submit resolves with status bridgedNotProcessed",
    data: "today",
    submitOutcome: "bridgedNotProcessedStatus",
  },
  bridgedNotProcessedError: {
    description: "Paid but not processed, as an error: submit is -32014 with data.burnTxHash, job listed",
    data: "today",
    submitOutcome: "bridgedNotProcessedError",
  },
  switching: {
    description: "The account is switching for 2 s: other calls are -32015, then a new account arrives",
    data: "today",
    switchingForMs: 2000,
  },
  slowConfirm: {
    description: "The native confirm waits three minutes",
    data: "today",
    confirmDelayMs: 180000,
  },
  malformedNumericAmount: {
    description: "Contract drift: estimate cost is a JSON number",
    data: "today",
    malformed: "numericAmount",
  },
  malformedSwappedAddress: {
    description: "Contract drift: getAccounts node and payer addresses are swapped",
    data: "today",
    malformed: "swappedAddress",
  },
  malformedMissingField: {
    description: "Contract drift: getAccounts has no unit",
    data: "today",
    malformed: "missingField",
  },
  manualConfirm: {
    description: "The native confirm stays open until a test calls controls.answerConfirm",
    data: "today",
    confirm: "manual",
  },
  walletStopsMidSubmit: {
    description: "The wallet burns, then stops: the submit call never answers and getJob by key says pending",
    data: "today",
    submitOutcome: "walletStops",
  },
} satisfies Record<string, MockProfile>;

export type MockProfileName = keyof typeof MOCK_PROFILES;

export const DEFAULT_PROFILE: MockProfileName = "today";

export function isMockProfileName(name: string): name is MockProfileName {
  return Object.prototype.hasOwnProperty.call(MOCK_PROFILES, name);
}
