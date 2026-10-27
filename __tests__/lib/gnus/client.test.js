import { createGnusClient } from "../../../lib/gnus/client";
import { GnusError, GnusContractMismatchError } from "../../../lib/gnus/errors";

const hex = (pair, n) => "0x" + pair.repeat(n);
const sdk = hex("a1", 64);
const evm = hex("b2", 20);
const hash = hex("c3", 32);

const network = { sdk: "staging", evmChainId: 80002 };
const accounts = (version = "1") => ({
  node: { sdkAddress: sdk, linkedEvm: evm, role: "main", main: null },
  payer: { evmAddress: evm, canSign: true },
  switching: false,
  network,
  version,
  unit: { symbol: "GNUS", decimals: 18 },
});
const job = (over = {}) => ({
  jobId: "job-1",
  burnTxHash: hash,
  sdkAddress: sdk,
  origin: "https://dashboard.example",
  idempotencyKey: "key-1",
  submittedAt: "2026-10-27T01:02:03Z",
  cost: "1",
  status: "submitted",
  ...over,
});
const replies = {
  gnus_getAccounts: () => accounts(),
  gnus_estimate: () => ({ cost: "1", gas: null, balance: null, network }),
  gnus_submitJob: () => ({ jobId: null, burnTxHash: hash, sdkAddress: sdk, status: "submitted" }),
  gnus_listJobs: () => ({ jobs: [job()], nextCursor: null }),
  gnus_getJob: () => ({ ...job(), result: null }),
  gnus_getEarnings: () => ({
    sdkAddress: sdk,
    balance: "5",
    processing: { isProcessing: false, jobsProcessed: null },
    earned: { total: null, history: null },
  }),
};

function fakeTransport(handler = (args) => Promise.resolve(replies[args.method]())) {
  return {
    request: jest.fn(handler),
    on: jest.fn(),
    removeListener: jest.fn(),
    close: jest.fn(),
  };
}

describe("request shape", () => {
  const jobDef = { inputs: [] };
  const cases = [
    ["getAccounts", [], { method: "gnus_getAccounts" }],
    ["estimate", [{ job: jobDef }], { method: "gnus_estimate", params: { job: jobDef } }],
    ["submitJob", [{ job: jobDef, idempotencyKey: "k" }], { method: "gnus_submitJob", params: { job: jobDef, idempotencyKey: "k" } }],
    ["listJobs", [], { method: "gnus_listJobs", params: {} }],
    ["listJobs", [{ limit: 5, cursor: "c" }], { method: "gnus_listJobs", params: { limit: 5, cursor: "c" } }],
    ["getJob", [{ jobId: "j" }], { method: "gnus_getJob", params: { jobId: "j" } }],
    ["getEarnings", [], { method: "gnus_getEarnings", params: {} }],
  ];
  test.each(cases)("%s sends the exact request", async (name, args, expected) => {
    const transport = fakeTransport();
    const client = createGnusClient(transport);
    await client[name](...args);
    expect(transport.request).toHaveBeenCalledWith(expected);
    expect("params" in transport.request.mock.calls[0][0]).toBe("params" in expected);
  });

  test("each method resolves to the parsed reply", async () => {
    const client = createGnusClient(fakeTransport());
    expect((await client.estimate({ job: {} })).cost).toBe("1");
    expect((await client.submitJob({ job: {}, idempotencyKey: "k" })).jobId).toBeNull();
    expect((await client.listJobs()).jobs).toHaveLength(1);
    expect((await client.getJob({ jobId: "job-1" })).result).toBeNull();
    expect((await client.getEarnings()).earned.total).toBeNull();
  });

  test("getJob resolves to null when the wallet answers null", async () => {
    const client = createGnusClient(fakeTransport(() => Promise.resolve(null)));
    await expect(client.getJob({ idempotencyKey: "k" })).resolves.toBeNull();
  });
});

describe("contract mismatch", () => {
  test("numeric amount, swapped address and missing field each name method and version", async () => {
    const transport = fakeTransport((args) => {
      if (args.method === "gnus_estimate") return Promise.resolve({ cost: 1000, gas: null, balance: null, network });
      if (args.method === "gnus_getEarnings") return Promise.resolve({ ...replies.gnus_getEarnings(), sdkAddress: evm });
      if (args.method === "gnus_listJobs") return Promise.resolve({ jobs: [] });
      return Promise.resolve(replies[args.method]());
    });
    const client = createGnusClient(transport);
    const first = await client.estimate({ job: {} }).catch((e) => e);
    expect(first).toBeInstanceOf(GnusContractMismatchError);
    expect(first.method).toBe("gnus_estimate");
    expect(first.message).toContain("unknown");

    await client.getAccounts();
    for (const call of [() => client.estimate({ job: {} }), () => client.getEarnings(), () => client.listJobs()]) {
      const err = await call().catch((e) => e);
      expect(err).toBeInstanceOf(GnusContractMismatchError);
      expect(err.message).toContain("version 1");
    }
  });

  test("a version 2 getAccounts reply is a mismatch and later ones name 2", async () => {
    const transport = fakeTransport((args) =>
      Promise.resolve(args.method === "gnus_getAccounts" ? accounts("2") : { nope: true }),
    );
    const client = createGnusClient(transport);
    const err = await client.getAccounts().catch((e) => e);
    expect(err).toBeInstanceOf(GnusContractMismatchError);
    expect(err.message).toContain("2");
    const later = await client.estimate({ job: {} }).catch((e) => e);
    expect(later.message).toContain("2");
  });
});

describe("wire rejections", () => {
  test("a coded rejection keeps code and reason", async () => {
    const client = createGnusClient(
      fakeTransport(() => Promise.reject({ code: -32011, message: "x", data: { reason: "no_gnus" } })),
    );
    const err = await client.estimate({ job: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBe(-32011);
    expect(err.reason).toBe("no_gnus");
  });

  test("a thrown TypeError becomes a GnusError with code null", async () => {
    const client = createGnusClient(fakeTransport(() => Promise.reject(new TypeError("boom"))));
    const err = await client.getAccounts().catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBeNull();
  });
});

describe("events", () => {
  test("a valid payload reaches the handler parsed; an invalid one goes to onMismatch only", () => {
    const transport = fakeTransport();
    const client = createGnusClient(transport);
    const handler = jest.fn();
    const onMismatch = jest.fn();
    const off = client.on("gnus_jobUpdated", handler, onMismatch);
    const wrapper = transport.on.mock.calls[0][1];
    expect(transport.on.mock.calls[0][0]).toBe("gnus_jobUpdated");

    wrapper(job({ status: "paused" }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].status).toBe("unknown");

    wrapper({ nope: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onMismatch.mock.calls[0][0]).toBeInstanceOf(GnusContractMismatchError);

    off();
    expect(transport.removeListener).toHaveBeenCalledWith("gnus_jobUpdated", wrapper);
  });

  test("an invalid payload is reported to onMismatch, never dropped silently", () => {
    const transport = fakeTransport();
    const handler = jest.fn();
    const onMismatch = jest.fn();
    createGnusClient(transport).on("gnus_networkChanged", handler, onMismatch);
    transport.on.mock.calls[0][1]({ sdk: "" });
    expect(handler).not.toHaveBeenCalled();
    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onMismatch.mock.calls[0][0]).toBeInstanceOf(GnusContractMismatchError);
  });

  test("an accountsChanged payload updates the remembered version", () => {
    const transport = fakeTransport();
    const client = createGnusClient(transport);
    const onMismatch = jest.fn();
    client.on("gnus_accountsChanged", jest.fn(), onMismatch);
    transport.on.mock.calls[0][1]({ ...accounts("3"), version: "3" });
    expect(onMismatch.mock.calls[0][0].message).toContain("3");
  });

  test("close() closes the transport", () => {
    const transport = fakeTransport();
    createGnusClient(transport).close();
    expect(transport.close).toHaveBeenCalledTimes(1);
  });
});
