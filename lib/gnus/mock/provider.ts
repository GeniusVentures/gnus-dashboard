import type { Accounts } from "../schema";
import { DEFAULT_PROFILE, MOCK_PROFILES, MockProfile, isMockProfileName } from "./profiles";
import type { InjectedProvider, Listener, RequestArgs } from "../transport/types";

export const MOCK_MARKER = "__GNUS_MOCK__";

export interface MockControls {
  emit(event: string, payload: unknown): void;
  readonly calls: Array<{ method: string; params?: unknown }>;
}

export interface MockProvider extends InjectedProvider {
  readonly isGeniusWallet: true;
  readonly version: string;
  readonly mockMarker: typeof MOCK_MARKER;
  readonly controls: MockControls;
}

interface MockState {
  profile: MockProfile;
  accounts: Accounts;
  calls: Array<{ method: string; params?: unknown }>;
}

// Hex values are built from short patterns so no long high-entropy literal sits in source.
function initialAccounts(): Accounts {
  return {
    node: {
      sdkAddress: ("0x" + "a1".repeat(64)) as Accounts["node"]["sdkAddress"],
      linkedEvm: ("0x" + "b2".repeat(20)) as NonNullable<Accounts["node"]["linkedEvm"]>,
      role: "main",
      main: null,
    },
    payer: { evmAddress: ("0x" + "b2".repeat(20)) as NonNullable<Accounts["payer"]["evmAddress"]>, canSign: true },
    switching: false,
    network: { sdk: "staging", evmChainId: 80002 },
    version: "1",
    unit: { symbol: "GNUS", decimals: 18 },
  };
}

function createFacade(state: MockState): MockProvider {
  const listeners = new Map<string, Set<Listener>>();

  async function request(args: RequestArgs): Promise<unknown> {
    state.calls.push(args.params === undefined ? { method: args.method } : { method: args.method, params: args.params });
    if (args.method === "gnus_getAccounts") {
      return JSON.parse(JSON.stringify(state.accounts));
    }
    throw { code: 4200, message: "Method not supported" };
  }

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
    controls: {
      emit(event, payload) {
        for (const listener of [...(listeners.get(event) ?? [])]) {
          listener(payload);
        }
      },
      calls: state.calls,
    },
  };
}

export function createMockProvider(options?: { profile?: string }): MockProvider {
  const name = options?.profile ?? DEFAULT_PROFILE;
  if (!isMockProfileName(name)) {
    throw new Error(`Unknown mock profile "${name}". Known profiles: ${Object.keys(MOCK_PROFILES).join(", ")}`);
  }
  const state: MockState = { profile: MOCK_PROFILES[name], accounts: initialAccounts(), calls: [] };
  return createFacade(state);
}
