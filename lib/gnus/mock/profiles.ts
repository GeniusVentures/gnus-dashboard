export interface MockProfile {
  readonly description: string;
}

export const MOCK_PROFILES = {
  today: {
    description: "What the wallet answers today: SDK fields it cannot fill yet are null",
  },
} satisfies Record<string, MockProfile>;

export type MockProfileName = keyof typeof MOCK_PROFILES;

export const DEFAULT_PROFILE: MockProfileName = "today";

export function isMockProfileName(name: string): name is MockProfileName {
  return Object.prototype.hasOwnProperty.call(MOCK_PROFILES, name);
}
