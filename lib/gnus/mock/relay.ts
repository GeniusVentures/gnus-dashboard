// Dev and test only: a fake Sign Client over the mock wallet, with the wire quirks of the real wallet.
import { WC_CHAIN, WC_EVENTS, WC_METHODS } from "../transport/walletconnect";
import type { SignClientLike, WcEventMap, WcNamespace, WcReason, WcSession } from "../transport/walletconnect";
import "./marker";
import { MockProvider, createMockProvider } from "./provider";

export const RELAY_PROFILES = {
  approve: "The wallet approves the pairing with every gnus method",
  decline: "The wallet declines the pairing",
  notGenius: "The wallet approves, but it is not GeniusWallet: no gnus methods",
  oldGenius: "The wallet approves with only some of the gnus methods",
  proposalExpires: "The pairing is never answered, so the proposal expires",
  offline: "Nothing reaches the wallet: pings and requests are never answered",
  walletEnds: "Approves like approve; the page can end the session from the wallet side",
  latency: "Replies arrive 70 seconds late",
  dropEvents: "Approves like approve; the wallet's events never reach the page",
  zombie: "A gnus_submitJob reaches the wallet and runs there, but its reply never reaches the page",
} as const;
export type RelayProfile = keyof typeof RELAY_PROFILES;

export const isRelayProfile = (name: string): name is RelayProfile => Object.hasOwn(RELAY_PROFILES, name);

const PROPOSAL_MS = 5 * 60 * 1000;
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_LATENCY_MS = 70_000;

export interface RelayOptions {
  profile?: RelayProfile;
  /** The mock wallet profile behind the relay; ignored when a provider is given. */
  mockProfile?: string;
  provider?: MockProvider;
  /** Answers each proposal by itself after this long (approve or decline, by profile). Left out, a control answers. */
  autoAnswerMs?: number;
  declineMessage?: string;
  latencyMs?: number;
  /** Replaces the namespaces the wallet approves. */
  namespaces?: Record<string, WcNamespace>;
}

export interface RelayControls {
  approvePending(): void;
  declinePending(message?: string): void;
  expirePending(): void;
  /** Ends every session as the wallet would, with an optional reason. */
  endFromWallet(reason?: WcReason): void;
  setOnline(online: boolean): void;
  readonly requests: Array<{ method: string; params: unknown; expiry?: number; chainId: string; topic: string }>;
  readonly disconnects: Array<{ topic: string; reason: WcReason }>;
  readonly proposals: Array<{ uri: string }>;
  pingCount(): number;
  closeCount(): number;
}

export interface FakeRelay extends SignClientLike {
  readonly provider: MockProvider;
  readonly controls: RelayControls;
}

interface Pending {
  resolve(session: WcSession): void;
  reject(reason: unknown): void;
  timers: Array<ReturnType<typeof setTimeout>>;
}

const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Reown's Dart side sends neither error data nor a null result; the wallet works around both the same way.
function encodeError(err: unknown): { code: number; message: string } {
  const { code, message, data } = (err ?? {}) as { code?: number; message?: string; data?: unknown };
  const text = typeof message === "string" ? message : "Wallet error";
  return {
    code: typeof code === "number" ? code : -32603,
    message: data === undefined ? text : JSON.stringify({ message: text, data }),
  };
}

const encodeResult = (result: unknown): unknown => (result === null || result === undefined ? {} : wire(result));

function namespacesFor(profile: RelayProfile): Record<string, WcNamespace> {
  const account = "0x" + "b2".repeat(20);
  if (profile === "notGenius") {
    return {
      eip155: {
        chains: ["eip155:1"],
        methods: ["eth_sendTransaction", "personal_sign"],
        events: ["chainChanged", "accountsChanged"],
        accounts: [`eip155:1:${account}`],
      },
    };
  }
  const methods = profile === "oldGenius" ? WC_METHODS.slice(0, 3) : [...WC_METHODS];
  return {
    eip155: { chains: [WC_CHAIN], methods, events: [...WC_EVENTS], accounts: [`${WC_CHAIN}:${account}`] },
  };
}

export function createFakeRelay(options: RelayOptions = {}): FakeRelay {
  const profile = options.profile ?? "approve";
  const provider = options.provider ?? createMockProvider({ profile: options.mockProfile });
  const sessions = new Map<string, WcSession>();
  const listeners = new Map<string, Set<(args: never) => void>>();
  const requests: RelayControls["requests"] = [];
  const disconnects: RelayControls["disconnects"] = [];
  const proposals: RelayControls["proposals"] = [];
  let online = profile !== "offline";
  const slot: { proposal: Pending | null } = { proposal: null };
  let pings = 0;
  let closes = 0;
  let topics = 0;

  function emit<E extends keyof WcEventMap>(event: E, args: WcEventMap[E]): void {
    for (const listener of [...(listeners.get(event) ?? [])]) {
      (listener as (a: WcEventMap[E]) => void)(args);
    }
  }

  function forward(topic: string): () => void {
    const handlers = WC_EVENTS.map((name) => {
      const handler = (data: unknown): void => {
        if (profile !== "dropEvents" && sessions.has(topic)) {
          emit("session_event", { topic, params: { event: { name, data: wire(data) }, chainId: WC_CHAIN } });
        }
      };
      provider.on(name, handler);
      return [name, handler] as const;
    });
    return () => handlers.forEach(([name, handler]) => provider.removeListener(name, handler));
  }

  const stops = new Map<string, () => void>();

  // Takes the open proposal for an answer and stops its timers.
  function takeProposal(): Pending {
    const answer = slot.proposal;
    if (!answer) {
      throw new Error("Relay has no open proposal");
    }
    slot.proposal = null;
    answer.timers.forEach(clearTimeout);
    return answer;
  }

  function drop(topic: string): void {
    sessions.delete(topic);
    stops.get(topic)?.();
    stops.delete(topic);
  }

  function openSession(): WcSession {
    topics += 1;
    const session: WcSession = {
      topic: `faketopic${topics}`,
      expiry: Math.floor(Date.now() / 1000) + SESSION_SECONDS + topics,
      namespaces: options.namespaces ?? namespacesFor(profile),
    };
    sessions.set(session.topic, session);
    stops.set(session.topic, forward(session.topic));
    return session;
  }

  const controls: RelayControls = {
    approvePending() {
      takeProposal().resolve(openSession());
    },
    declinePending(message = options.declineMessage ?? "User rejected the connection") {
      takeProposal().reject({ code: 5000, message });
    },
    expirePending() {
      takeProposal().reject({ code: 0, message: "Proposal expired" });
    },
    endFromWallet(reason) {
      for (const topic of [...sessions.keys()]) {
        drop(topic);
        emit("session_delete", reason ? { topic, reason } : { topic });
      }
    },
    setOnline(next) {
      online = next;
    },
    requests,
    disconnects,
    proposals,
    pingCount: () => pings,
    closeCount: () => closes,
  };

  return {
    provider,
    controls,
    connect() {
      const uri = `wc:fakeproposal${proposals.length + 1}@2?relay-protocol=irn&symKey=fakekey`;
      proposals.push({ uri });
      const mine: Pending = { resolve: () => {}, reject: () => {}, timers: [] };
      const approval = new Promise<WcSession>((resolve, reject) => {
        mine.resolve = resolve;
        mine.reject = reject;
      });
      slot.proposal = mine;
      // A proposal that nothing answers expires, as the real one does after five minutes.
      mine.timers.push(
        setTimeout(() => {
          if (slot.proposal === mine) {
            controls.expirePending();
          }
        }, PROPOSAL_MS),
      );
      if (options.autoAnswerMs !== undefined && profile !== "proposalExpires") {
        mine.timers.push(
          setTimeout(() => {
            if (slot.proposal === mine) {
              if (profile === "decline") {
                controls.declinePending();
              } else {
                controls.approvePending();
              }
            }
          }, options.autoAnswerMs),
        );
      }
      return Promise.resolve({ uri, approval: () => approval });
    },
    request({ topic, chainId, request, expiry }) {
      requests.push({ method: request.method, params: wire(request.params), expiry, chainId, topic });
      if (!online) {
        return new Promise(() => {});
      }
      const run = provider.request({ method: request.method, params: wire(request.params) });
      if (profile === "zombie" && request.method === "gnus_submitJob") {
        run.catch(() => {});
        return new Promise(() => {});
      }
      const latency = profile === "latency" ? (options.latencyMs ?? DEFAULT_LATENCY_MS) : 0;
      return new Promise((resolve, reject) => {
        const later = (fn: () => void): void => {
          if (latency > 0) {
            setTimeout(fn, latency);
          } else {
            fn();
          }
        };
        run.then(
          (result) => later(() => resolve(encodeResult(result))),
          (err: unknown) => later(() => reject(encodeError(err))),
        );
      });
    },
    ping({ topic }) {
      pings += 1;
      if (!online) {
        return new Promise(() => {});
      }
      return sessions.has(topic) ? Promise.resolve() : Promise.reject(new Error(`No matching key. session topic doesn't exist: ${topic}`));
    },
    disconnect({ topic, reason }) {
      disconnects.push({ topic, reason });
      drop(topic);
      return Promise.resolve();
    },
    getSessions: () => [...sessions.values()],
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener as (args: never) => void);
    },
    off(event, listener) {
      listeners.get(event)?.delete(listener as (args: never) => void);
    },
    isOnline: () => online,
    close() {
      closes += 1;
      return Promise.resolve();
    },
  };
}
