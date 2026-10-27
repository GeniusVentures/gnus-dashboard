export interface MockProfile {
  readonly description: string;
  /** What the SDK behind the wallet can fill: today = SDK gaps are null; populated = every field set; allNulls = every nullable field null. */
  readonly data: "today" | "populated" | "allNulls";
  /** Amounts above 2^53: balance "9007199254740993", cost "1000000000000000000000", earned.total "18446744073709551617". */
  readonly bigAmounts?: boolean;
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
} satisfies Record<string, MockProfile>;

export type MockProfileName = keyof typeof MOCK_PROFILES;

export const DEFAULT_PROFILE: MockProfileName = "today";

export function isMockProfileName(name: string): name is MockProfileName {
  return Object.prototype.hasOwnProperty.call(MOCK_PROFILES, name);
}
