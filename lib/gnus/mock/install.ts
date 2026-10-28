// Dev and test only; the production-export gate lives in the mock entry point, not here.
import { setWalletConnectLoader } from "../../session/store";
import { INITIALIZED_EVENT } from "../schema";
import type { WindowLike } from "../transport/types";
import { classifyNamespaces, createWalletConnectTransport } from "../transport/walletconnect";
import "./marker";
import { MockProvider, createMockProvider } from "./provider";
import { RELAY_PROFILES, RelayProfile, createFakeRelay, isRelayProfile } from "./relay";

export interface MockWindow extends WindowLike {
  dispatchEvent(event: Event): boolean;
  Event?: typeof Event;
}

export interface MockInstallOptions {
  profile?: string;
  injectAfterMs?: number;
  injectTwice?: boolean;
  /** Puts a fake WalletConnect relay on the browser path; with no injection of its own, no window.gnus appears. */
  relayProfile?: RelayProfile;
}

const DEFAULT_TWICE_FIRST_MS = 500;
const TWICE_GAP_MS = 1000;
// By hand there is nobody to answer the wallet's side, so the relay answers and ends sessions itself.
const DEV_ANSWER_MS = 2000;
const DEV_END_MS = 8000;

export function installMock(win: MockWindow, options: MockInstallOptions = {}): MockProvider {
  const relay =
    options.relayProfile === undefined
      ? null
      : createFakeRelay({
          profile: options.relayProfile,
          mockProfile: options.profile,
          autoAnswerMs: DEV_ANSWER_MS,
          endAfterMs: DEV_END_MS,
        });
  if (relay) {
    setWalletConnectLoader(async () => ({
      createClient: async () => relay,
      createWalletConnectTransport,
      classifyNamespaces,
    }));
  }
  const first = relay ? relay.provider : createMockProvider({ profile: options.profile });
  const inject = (provider: MockProvider): void => {
    win.gnus = provider;
    win.dispatchEvent(new (win.Event ?? Event)(INITIALIZED_EVENT));
  };
  const at = (ms: number, fn: () => void): void => {
    if (ms <= 0) {
      fn();
    } else {
      setTimeout(fn, ms);
    }
  };
  const firstMs = options.injectAfterMs ?? (options.injectTwice ? DEFAULT_TWICE_FIRST_MS : 0);
  if (!relay || options.injectAfterMs !== undefined) {
    at(firstMs, () => inject(first));
    if (options.injectTwice) {
      at(firstMs + TWICE_GAP_MS, () => inject(first.controls.reinject()));
    }
  }
  return first;
}

const INJECT_FORMS = "a whole number of ms such as 0, 500 or 4000, or twice";

/** ?gnusMock=<profile>&gnusInject=<whole ms | twice>&gnusWc=<relay profile> */
export function mockOptionsFromSearch(search: string): MockInstallOptions {
  const params = new URLSearchParams(search);
  const options: MockInstallOptions = {};
  const profile = params.get("gnusMock");
  if (profile !== null) {
    options.profile = profile;
  }
  const relay = params.get("gnusWc");
  if (relay !== null) {
    if (!isRelayProfile(relay)) {
      throw new Error(`gnusWc must be one of ${Object.keys(RELAY_PROFILES).join(", ")}`);
    }
    options.relayProfile = relay;
  }
  const inject = params.get("gnusInject");
  if (inject === "twice") {
    options.injectAfterMs = DEFAULT_TWICE_FIRST_MS;
    options.injectTwice = true;
  } else if (inject !== null) {
    if (!/^\d+$/.test(inject)) {
      throw new Error(`gnusInject must be ${INJECT_FORMS}`);
    }
    options.injectAfterMs = Number(inject);
  }
  return options;
}

export function installMockFromLocation(win: MockWindow & { location: { search: string } }): MockProvider {
  return installMock(win, mockOptionsFromSearch(win.location.search));
}
