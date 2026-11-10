import { createGnusClient } from "../../../lib/gnus/client";
import { GnusError, GnusOfflineError } from "../../../lib/gnus/errors";
import { createFakeRelay } from "../../../lib/gnus/mock/relay";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { createWalletConnectTransport } from "../../../lib/gnus/transport/walletconnect";
import { INITIAL_STATE, reduce } from "../../../lib/session/machine";

const tick = (ms) => jest.advanceTimersByTimeAsync(ms);
const JOB = { type: "demo", n: 1 };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function connected(options = {}) {
  const relay = createFakeRelay(options);
  await relay.connect();
  relay.controls.approvePending();
  const [session] = relay.getSessions();
  const transport = createWalletConnectTransport(relay, session);
  return { relay, session, transport, client: createGnusClient(transport) };
}

// A client whose replies the test scripts, for the cases a fake wallet would have to be bent to produce.
function scripted() {
  const listeners = new Map();
  const sent = [];
  const replies = [];
  const fake = {
    sent,
    reply: (impl) => replies.push(impl),
    emit: (event, args) => (listeners.get(event) ?? []).forEach((l) => l(args)),
    request: (params) => {
      sent.push(params);
      return (replies.shift() ?? (() => Promise.resolve({})))(params);
    },
    ping: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    getSessions: () => [],
    connect: () => Promise.reject(new Error("unused")),
    on: (event, l) => listeners.set(event, [...(listeners.get(event) ?? []), l]),
    off: (event, l) => listeners.set(event, (listeners.get(event) ?? []).filter((x) => x !== l)),
    isOnline: () => true,
    close: () => Promise.resolve(),
  };
  const session = {
    topic: "t1",
    expiry: 1,
    namespaces: {
      eip155: {
        chains: ["eip155:80002"],
        methods: ["gnus_getAccounts", "gnus_getJob", "gnus_getEarnings", "gnus_listJobs"],
        events: ["gnus_accountsChanged", "gnus_networkChanged", "gnus_jobUpdated"],
        accounts: [],
      },
    },
  };
  return { fake, transport: createWalletConnectTransport(fake, session) };
}

const accountsReply = () => createMockProvider().request({ method: "gnus_getAccounts" });

describe("timers and expiries", () => {
  test("a read nobody answers ends in GnusOfflineError at 60 s and was sent with expiry 300", async () => {
    const { relay, client } = await connected({ profile: "latency" });
    const read = client.listJobs();
    const outcome = read.then(
      () => "answered",
      (err) => err,
    );
    await tick(59_999);
    expect(relay.controls.requests[0].expiry).toBe(300);
    await tick(1);
    const err = await outcome;
    expect(err).toBeInstanceOf(GnusOfflineError);
    expect(err.kind).toBe("walletOffline");
  });

  test("gnus_submitJob is sent with expiry 900 and the page waits 900 s", async () => {
    const { relay, client } = await connected({ profile: "zombie" });
    const outcome = client.submitJob({ job: JOB, idempotencyKey: "k1" }).then(
      () => "answered",
      (err) => err,
    );
    await tick(899_999);
    expect(relay.controls.requests[0].expiry).toBe(900);
    await tick(1);
    expect(await outcome).toBeInstanceOf(GnusOfflineError);
  });

  test("gnus_getAccounts waits 900 s on the first call, 300 s after a success, 900 s again after a 4001", async () => {
    const { fake, transport } = scripted();
    fake.reply(() => Promise.resolve(accountsReply()));
    fake.reply(() => Promise.resolve(accountsReply()));
    fake.reply(() => Promise.reject({ code: 4001, message: "User rejected the request" }));
    fake.reply(() => Promise.resolve(accountsReply()));
    const call = () => transport.request({ method: "gnus_getAccounts" }).catch(() => {});
    await call();
    await call();
    await call();
    await call();
    expect(fake.sent.map((p) => p.expiry)).toEqual([900, 300, 300, 900]);
  });
});

describe("what comes back", () => {
  test("an error with data over the wire keeps its data: -32014 gives the burn hash", async () => {
    const { client } = await connected({ mockProfile: "bridgedNotProcessedError" });
    const err = await client.submitJob({ job: JOB, idempotencyKey: "k2" }).catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBe(-32014);
    expect(err.burnTxHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("-32005 confirm_open keeps its reason", async () => {
    const { client } = await connected({ mockProfile: "confirmOpen" });
    const err = await client.submitJob({ job: JOB, idempotencyKey: "k3" }).catch((e) => e);
    expect(err.kind).toBe("confirmOpen");
  });

  test("an error message that is not JSON is kept as sent", async () => {
    const { fake, transport } = scripted();
    fake.reply(() => Promise.reject({ code: -32603, message: "plain words" }));
    await expect(transport.request({ method: "gnus_getEarnings" })).rejects.toEqual({ code: -32603, message: "plain words" });
  });

  test("JSON without a data object is not unwrapped", async () => {
    const { fake, transport } = scripted();
    const message = JSON.stringify({ message: "x", data: "not an object" });
    fake.reply(() => Promise.reject({ code: 1, message }));
    await expect(transport.request({ method: "gnus_getEarnings" })).rejects.toEqual({ code: 1, message });
  });

  test("gnus_getJob with no record resolves null although the relay sent {}", async () => {
    const { relay, client } = await connected();
    expect(await client.getJob({ jobId: "nope" })).toBeNull();
    expect(relay.controls.requests[0].params).toEqual({ jobId: "nope" });
  });
});

describe("refusals before sending", () => {
  test("a method the session did not approve is 4200 and nothing is sent", async () => {
    const { relay, client } = await connected({ profile: "oldGenius" });
    const err = await client.listJobs().catch((e) => e);
    expect(err.code).toBe(4200);
    expect(relay.controls.requests).toHaveLength(0);
  });

  test("an offline relay rejects with GnusOfflineError and sends nothing", async () => {
    const { relay, client } = await connected();
    relay.controls.setOnline(false);
    expect(await client.getEarnings().catch((e) => e)).toBeInstanceOf(GnusOfflineError);
    expect(relay.controls.requests).toHaveLength(0);
  });
});

describe("events", () => {
  const payload = { jobId: null };
  const event = (overrides = {}) => ({
    topic: "t1",
    params: { chainId: "eip155:80002", event: { name: "gnus_jobUpdated", data: payload } },
    ...overrides,
  });

  test("gnus_jobUpdated on the Amoy chain for this session is delivered", () => {
    const { fake, transport } = scripted();
    const heard = jest.fn();
    transport.on("gnus_jobUpdated", heard);
    fake.emit("session_event", event());
    expect(heard).toHaveBeenCalledWith(payload);
  });

  test.each([
    ["accountsChanged", event({ params: { chainId: "eip155:80002", event: { name: "accountsChanged", data: [] } } })],
    ["chainChanged", event({ params: { chainId: "eip155:80002", event: { name: "chainChanged", data: "0x1" } } })],
    ["another chain", event({ params: { chainId: "eip155:1", event: { name: "gnus_jobUpdated", data: payload } } })],
    ["another topic", event({ topic: "other" })],
  ])("%s is not delivered", (_label, args) => {
    const { fake, transport } = scripted();
    const heard = jest.fn();
    for (const name of ["gnus_jobUpdated", "accountsChanged", "chainChanged"]) {
      transport.on(name, heard);
    }
    fake.emit("session_event", args);
    expect(heard).not.toHaveBeenCalled();
  });

  test("session_delete and session_expire for this session emit disconnect with the wallet's reason or 6000", () => {
    const { fake, transport } = scripted();
    const heard = jest.fn();
    transport.on("disconnect", heard);
    fake.emit("session_delete", { topic: "t1", reason: { code: 5900, message: "bye" } });
    fake.emit("session_expire", { topic: "t1" });
    fake.emit("session_delete", { topic: "other" });
    expect(heard.mock.calls).toEqual([[{ code: 5900, message: "bye" }], [{ code: 6000, message: "WalletConnect session ended" }]]);
  });
});

describe("the session machine", () => {
  test("a walletOffline error from a query keeps a ready session's accounts and moves it to offline", () => {
    const ready = reduce(INITIAL_STATE, {
      type: "accountsReceived",
      accounts: { switching: false, network: { sdk: "staging", evmChainId: 80002 } },
    });
    const next = reduce(ready, { type: "errorReported", error: new GnusOfflineError(), source: "query" });
    expect(next).toMatchObject({ phase: "notResponding", cause: "offline", accounts: ready.accounts });
    const lost = reduce(INITIAL_STATE, { type: "connectFailed", error: new GnusOfflineError() });
    expect(lost).toMatchObject({ phase: "notResponding", cause: "offline", accounts: null });
  });
});
