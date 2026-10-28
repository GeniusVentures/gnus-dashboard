import { EVENTS, METHODS } from "../schema";
import type { Listener, RequestArgs, Transport } from "./types";

export const WC_CHAIN = "eip155:80002";
export const WC_METHODS: readonly string[] = Object.values(METHODS);
export const WC_EVENTS: readonly string[] = [EVENTS.accountsChanged, EVENTS.networkChanged, EVENTS.jobUpdated];

export interface WcNamespace {
  chains?: string[];
  methods: string[];
  events: string[];
  accounts: string[];
}

export interface WcSession {
  topic: string;
  expiry: number;
  namespaces: Record<string, WcNamespace>;
}

export interface WcReason {
  code: number;
  message: string;
}

export interface WcProposal {
  uri?: string;
  approval(): Promise<WcSession>;
}

export interface WcEventMap {
  session_event: { topic: string; params: { event: { name: string; data: unknown }; chainId: string } };
  session_delete: { topic: string; reason?: WcReason };
  session_expire: { topic: string };
}

/** The part of Reown's Sign Client this page uses. The real client is adapted to it below; tests and the dev server pass a fake. */
export interface SignClientLike {
  /** Proposes the gnus methods and events on the Amoy chain and returns the pairing link. */
  connect(): Promise<WcProposal>;
  request(params: {
    topic: string;
    chainId: string;
    request: { method: string; params: Record<string, unknown> };
    expiry?: number;
  }): Promise<unknown>;
  ping(params: { topic: string }): Promise<void>;
  disconnect(params: { topic: string; reason: WcReason }): Promise<void>;
  getSessions(): WcSession[];
  on<E extends keyof WcEventMap>(event: E, listener: (args: WcEventMap[E]) => void): void;
  off<E extends keyof WcEventMap>(event: E, listener: (args: WcEventMap[E]) => void): void;
  /** False when the browser has no network, so a request can fail at once instead of waiting out its timer. */
  isOnline(): boolean;
  /** Closes the relay socket. Sessions stay stored. */
  close(): Promise<void>;
}

/** What the session store imports, on the browser path only. */
export interface WalletConnectModule {
  /** Null when this build has no Reown project id. */
  createClient(): Promise<SignClientLike | null>;
  createWalletConnectTransport(client: SignClientLike, session: WcSession): Transport;
  classifyNamespaces(session: WcSession): SessionKind;
}

export type WalletConnectLoader = () => Promise<WalletConnectModule>;

export type SessionKind = "ok" | "notGenius" | "oldGenius";

/** What the wallet approved: every gnus method and event on the Amoy chain, some of them, or none. */
export function classifyNamespaces(session: WcSession): SessionKind {
  const namespace = session.namespaces.eip155;
  const methods = namespace ? WC_METHODS.filter((method) => namespace.methods.includes(method)) : [];
  if (!namespace || methods.length === 0) {
    return "notGenius";
  }
  const onChain =
    namespace.chains?.includes(WC_CHAIN) === true || namespace.accounts.some((a) => a.startsWith(`${WC_CHAIN}:`));
  const complete =
    methods.length === WC_METHODS.length && WC_EVENTS.every((event) => namespace.events.includes(event)) && onChain;
  return complete ? "ok" : "oldGenius";
}

const PROPOSAL = {
  optionalNamespaces: { eip155: { chains: [WC_CHAIN], methods: [...WC_METHODS], events: [...WC_EVENTS] } },
};

export async function createClient(): Promise<SignClientLike | null> {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
  if (!projectId) {
    return null;
  }
  const { default: SignClient } = await import("@walletconnect/sign-client");
  const { origin } = window.location;
  const client = await SignClient.init({
    projectId,
    telemetryEnabled: false,
    metadata: {
      name: "GNUS Dashboard",
      description: "Submit jobs to the GNUS network and follow what your node earns",
      url: origin,
      icons: [`${origin}/favicon.ico`],
    },
  });
  return {
    connect: () => client.connect(PROPOSAL),
    request: (params) => client.request<unknown>(params),
    ping: (params) => client.ping(params),
    disconnect: (params) => client.disconnect(params),
    getSessions: () => client.session.getAll(),
    on: (event, listener) => void client.on(event, listener),
    off: (event, listener) => void client.off(event, listener),
    isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
    close: () => client.core.relayer.transportClose(),
  };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reown's Dart side cannot send an error's data, so the wallet folds it into the message as JSON. */
function decodeError(err: unknown): unknown {
  if (!isPlainObject(err) || typeof err.message !== "string") {
    return err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(err.message);
  } catch {
    return err;
  }
  if (isPlainObject(parsed) && typeof parsed.message === "string" && isPlainObject(parsed.data)) {
    return { code: err.code, message: parsed.message, data: parsed.data };
  }
  return err;
}

/** The wallet cannot send a null result either and sends an empty object, which no result in the contract is. */
const decodeResult = (result: unknown): unknown =>
  isPlainObject(result) && Object.keys(result).length === 0 ? null : result;

export function createWalletConnectTransport(client: SignClientLike, session: WcSession): Transport {
  const listeners = new Map<string, Set<Listener>>();
  const emit = (name: string, payload: unknown): void => {
    for (const listener of [...(listeners.get(name) ?? [])]) {
      listener(payload);
    }
  };

  const onEvent = (args: WcEventMap["session_event"]): void => {
    const { name, data } = args.params.event;
    if (args.topic === session.topic && args.params.chainId === WC_CHAIN && WC_EVENTS.includes(name)) {
      emit(name, data);
    }
  };
  const onEnd = (args: { topic: string; reason?: WcReason }): void => {
    if (args.topic === session.topic) {
      emit(EVENTS.disconnect, args.reason ?? { code: 6000, message: "WalletConnect session ended" });
    }
  };
  client.on("session_event", onEvent);
  client.on("session_delete", onEnd);
  client.on("session_expire", onEnd);

  return {
    async request({ method, params }: RequestArgs) {
      try {
        const result = await client.request({
          topic: session.topic,
          chainId: WC_CHAIN,
          request: { method, params: params ?? {} },
          expiry: 300,
        });
        return decodeResult(result);
      } catch (err) {
        throw decodeError(err);
      }
    },
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
    close() {
      client.off("session_event", onEvent);
      client.off("session_delete", onEnd);
      client.off("session_expire", onEnd);
      listeners.clear();
    },
  };
}
