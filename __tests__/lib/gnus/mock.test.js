import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { MOCK_PROFILES } from "../../../lib/gnus/mock/profiles";
import { createInjectedTransport } from "../../../lib/gnus/transport/injected";
import { createGnusClient } from "../../../lib/gnus/client";
import { GnusError } from "../../../lib/gnus/errors";

const JOB = { name: "posenet", inputs: [], outputs: [], passes: [] };
const OTHER_JOB = { name: "other", inputs: [], outputs: [], passes: [] };
const DAY_MS = 24 * 60 * 60 * 1000;

function make(profile) {
  const win = new EventTarget();
  const mock = createMockProvider(profile === undefined ? undefined : { profile });
  win.gnus = mock;
  const transport = createInjectedTransport(win);
  const client = createGnusClient(transport);
  return { win, mock, transport, client, controls: mock.controls };
}

const wireError = (promise) => promise.then(() => null, (e) => e);

function collect(client, event) {
  const seen = [];
  const mismatches = [];
  client.on(event, (payload) => seen.push(payload), (err) => mismatches.push(err));
  return { seen, mismatches };
}

describe("every profile parses through the client", () => {
  test.each(["today", "populated", "allNulls", "bigAmounts"])("%s", async (profile) => {
    const { client } = make(profile);
    const accounts = await client.getAccounts();
    await client.estimate({ job: JOB });
    await client.listJobs();
    await client.getEarnings();
    await expect(client.getJob({ burnTxHash: "0x" + "0".repeat(64) })).resolves.toBeNull();
    if (profile !== "allNulls") {
      const result = await client.submitJob({ job: JOB, idempotencyKey: "k" });
      expect(result.sdkAddress).toBe(accounts.node.sdkAddress);
      await client.getJob({ burnTxHash: result.burnTxHash });
      expect((await client.listJobs()).jobs).toHaveLength(1);
    }
  });
});

describe("profile data", () => {
  test("today answers the way the wallet does today", async () => {
    const { client } = make("today");
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    expect(sent.jobId).toBeNull();
    expect(sent.status).toBe("submitted");
    const detail = await client.getJob({ burnTxHash: sent.burnTxHash });
    expect(detail.result).toBeNull();
    const earnings = await client.getEarnings();
    expect(earnings.processing.jobsProcessed).toBeNull();
    expect(earnings.earned.total).toBeNull();
    expect(earnings.earned.history).toBeNull();
    expect((await client.estimate({ job: JOB })).gas).not.toBeNull();
  });

  test("no profile name means today", async () => {
    const a = await make().mock.request({ method: "gnus_getEarnings" });
    const b = await make("today").mock.request({ method: "gnus_getEarnings" });
    expect(a).toEqual(b);
  });

  test("populated fills every field", async () => {
    const { client, controls } = make("populated");
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    expect(sent.jobId).toMatch(/^job-\d+$/);
    const earnings = await client.getEarnings();
    expect(earnings.processing.jobsProcessed).toMatch(/^\d+$/);
    expect(earnings.earned.total).toMatch(/^\d+$/);
    expect(earnings.earned.history).toHaveLength(1);
    controls.advanceJob(sent.burnTxHash, "completed");
    const detail = await client.getJob({ jobId: sent.jobId });
    expect(detail.result.cids.length).toBeGreaterThanOrEqual(1);
  });

  test("allNulls nulls every nullable field and cannot submit", async () => {
    const { client } = make("allNulls");
    const accounts = await client.getAccounts();
    expect(accounts.node.linkedEvm).toBeNull();
    expect(accounts.node.main).toBeNull();
    expect(accounts.payer.evmAddress).toBeNull();
    expect(accounts.payer.canSign).toBe(false);
    const estimate = await client.estimate({ job: JOB });
    expect(estimate.gas).toBeNull();
    expect(estimate.balance).toBeNull();
    const earnings = await client.getEarnings();
    expect(earnings.processing.jobsProcessed).toBeNull();
    expect(earnings.earned.total).toBeNull();
    expect(earnings.earned.history).toBeNull();
    const err = await client.submitJob({ job: JOB, idempotencyKey: "k" }).catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBe(-32012);
    expect(err.reason).toBe("no_wallet");
  });

  test("the raw submit reply in today has a null jobId", async () => {
    const { mock } = make("today");
    const reply = await mock.request({ method: "gnus_submitJob", params: { job: JOB, idempotencyKey: "k" } });
    expect(reply.jobId).toBeNull();
  });

  test("bigAmounts keeps digits above 2^53 byte for byte", async () => {
    const { client } = make("bigAmounts");
    expect((await client.getEarnings()).balance).toBe("9007199254740993");
    expect((await client.estimate({ job: JOB })).cost).toBe("1000000000000000000000");
    expect((await client.getEarnings()).earned.total).toBe("18446744073709551617");
  });

  test("an unknown profile throws and lists every known name", () => {
    let message = "";
    try {
      createMockProvider({ profile: "nope" });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("nope");
    for (const name of Object.keys(MOCK_PROFILES)) {
      expect(message).toContain(name);
    }
    for (const name of ["today", "populated", "allNulls", "bigAmounts"]) {
      expect(message).toContain(name);
    }
  });
});

describe("wire values", () => {
  test("rejections are plain objects with a numeric code and a string message", async () => {
    const { mock } = make();
    const err = await wireError(mock.request({ method: "gnus_nope" }));
    expect(err).not.toBeInstanceOf(Error);
    expect(typeof err.code).toBe("number");
    expect(typeof err.message).toBe("string");
  });

  test("replies are copies", async () => {
    const { mock } = make();
    const first = await mock.request({ method: "gnus_getAccounts" });
    first.node.sdkAddress = "tampered";
    const second = await mock.request({ method: "gnus_getAccounts" });
    expect(second.node.sdkAddress).toMatch(/^0x[0-9a-f]{128}$/);
  });

  test("controls.calls records every request", async () => {
    const { mock, controls } = make();
    await mock.request({ method: "gnus_getAccounts" });
    await wireError(mock.request({ method: "gnus_nope", params: { a: 1 } }));
    expect(controls.calls).toEqual([{ method: "gnus_getAccounts" }, { method: "gnus_nope", params: { a: 1 } }]);
  });
});

describe("parameter rules", () => {
  const submit = (params) => ({ method: "gnus_submitJob", params });
  const code = async (req) => (await wireError(make().mock.request(req)))?.code;
  const reasonOf = async (req) => (await wireError(make().mock.request(req)))?.data?.reason;

  test("params must be an object", async () => {
    expect(await code({ method: "gnus_listJobs", params: [] })).toBe(-32602);
    expect(await code({ method: "gnus_estimate", params: [JOB] })).toBe(-32602);
    expect(await code({ method: "gnus_estimate" })).toBe(-32602);
  });

  test.each([
    ["a string", "job"],
    ["null", null],
    ["an array", []],
    ["the old model shape", { model: "m", data: {}, input: {} }],
    ["model with no passes", { model: "m" }],
    ["input with no passes", { input: "i" }],
  ])("a job that is %s is -32602", async (_label, job) => {
    expect(await code({ method: "gnus_estimate", params: { job } })).toBe(-32602);
    expect(await code(submit({ job, idempotencyKey: "k" }))).toBe(-32602);
  });

  test.each([
    ["missing", undefined],
    ["empty", ""],
    ["too long", "k".repeat(257)],
    ["not a string", 7],
  ])("an idempotencyKey that is %s is -32602", async (_label, idempotencyKey) => {
    expect(await code(submit({ job: JOB, idempotencyKey }))).toBe(-32602);
  });

  test("a 256 character key is accepted", async () => {
    const { client } = make();
    await expect(client.submitJob({ job: JOB, idempotencyKey: "k".repeat(256) })).resolves.toBeDefined();
  });

  test.each([0, 101, 2.5, "5", -1])("limit %p is -32602", async (limit) => {
    expect(await code({ method: "gnus_listJobs", params: { limit } })).toBe(-32602);
  });

  test("limits 1 and 100 are accepted", async () => {
    const { client } = make();
    await client.listJobs({ limit: 1 });
    await client.listJobs({ limit: 100 });
  });

  test("a cursor that is empty or never issued is -32602", async () => {
    expect(await code({ method: "gnus_listJobs", params: { cursor: "" } })).toBe(-32602);
    expect(await code({ method: "gnus_listJobs", params: { cursor: "never-issued" } })).toBe(-32602);
    expect(await code({ method: "gnus_listJobs", params: { cursor: "c".repeat(513) } })).toBe(-32602);
  });

  test("getJob needs exactly one selector", async () => {
    const hash = "0x" + "1".repeat(64);
    expect(await code({ method: "gnus_getJob", params: {} })).toBe(-32602);
    expect(await code({ method: "gnus_getJob", params: { jobId: null } })).toBe(-32602);
    expect(await code({ method: "gnus_getJob", params: { jobId: "a", burnTxHash: hash } })).toBe(-32602);
    expect(await code({ method: "gnus_getJob", params: { jobId: "" } })).toBe(-32602);
    expect(await code({ method: "gnus_getJob", params: { idempotencyKey: "k".repeat(257) } })).toBe(-32602);
  });

  test("includeChildren must be a boolean", async () => {
    expect(await code({ method: "gnus_getEarnings", params: { includeChildren: "yes" } })).toBe(-32602);
    expect(await code({ method: "gnus_getEarnings", params: { includeChildren: false } })).toBeUndefined();
    expect(await reasonOf({ method: "gnus_getEarnings", params: { includeChildren: "yes" } })).toBeUndefined();
  });

  test("an unknown method is 4200", async () => {
    expect(await code({ method: "gnus_getAddress" })).toBe(4200);
  });
});

describe("idempotency and the in-flight guard", () => {
  afterEach(() => jest.useRealTimers());

  test("the same key and job twice burns once", async () => {
    const { client, controls } = make();
    const first = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const second = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    expect(second).toEqual(first);
    expect(controls.burnCount()).toBe(1);
    expect((await client.listJobs()).jobs).toHaveLength(1);
  });

  test("the same key with another job is idempotency_key_reused", async () => {
    const { client, controls } = make();
    await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const err = await client.submitJob({ job: OTHER_JOB, idempotencyKey: "k" }).catch((e) => e);
    expect(err.kind).toBe("idempotencyKeyReused");
    expect(err.code).toBe(-32602);
    expect(controls.burnCount()).toBe(1);
  });

  test("after 24 h the same key burns again, not before", async () => {
    jest.useFakeTimers();
    const { client, controls } = make();
    await client.submitJob({ job: JOB, idempotencyKey: "k" });
    jest.advanceTimersByTime(DAY_MS);
    await client.submitJob({ job: JOB, idempotencyKey: "k" });
    expect(controls.burnCount()).toBe(1);
    jest.advanceTimersByTime(1);
    await client.submitJob({ job: JOB, idempotencyKey: "k" });
    expect(controls.burnCount()).toBe(2);
  });

  test("two submits started together: one resolves, one is submit_in_flight", async () => {
    const { client, controls } = make();
    const results = await Promise.allSettled([
      client.submitJob({ job: JOB, idempotencyKey: "a" }),
      client.submitJob({ job: JOB, idempotencyKey: "b" }),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[1].reason.kind).toBe("submitInFlight");
    expect(results[1].reason.code).toBe(-32005);
    expect(controls.burnCount()).toBe(1);
    await expect(client.submitJob({ job: JOB, idempotencyKey: "b" })).resolves.toBeDefined();
  });

  test("the burn hash is 0x plus 64 lowercase hex and differs per burn", async () => {
    const { client } = make();
    const a = await client.submitJob({ job: JOB, idempotencyKey: "a" });
    const b = await client.submitJob({ job: JOB, idempotencyKey: "b" });
    expect(a.burnTxHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a.burnTxHash).not.toBe(b.burnTxHash);
  });
});

describe("listJobs and getJob", () => {
  async function submitMany(client, count) {
    for (let i = 1; i <= count; i += 1) {
      await client.submitJob({ job: JOB, idempotencyKey: `k${i}` });
    }
  }

  test("newest first and defaults to 20", async () => {
    const { client } = make();
    await submitMany(client, 21);
    const page = await client.listJobs();
    expect(page.jobs).toHaveLength(20);
    expect(page.jobs[0].idempotencyKey).toBe("k21");
    expect(page.nextCursor).not.toBeNull();
    const rest = await client.listJobs({ cursor: page.nextCursor });
    expect(rest.jobs.map((j) => j.idempotencyKey)).toEqual(["k1"]);
    expect(rest.nextCursor).toBeNull();
  });

  test("pages by cursor to the end", async () => {
    const { client } = make();
    await submitMany(client, 3);
    const keys = [];
    let cursor;
    let pages = 0;
    do {
      const page = await client.listJobs(cursor === undefined ? { limit: 1 } : { limit: 1, cursor });
      keys.push(...page.jobs.map((j) => j.idempotencyKey));
      cursor = page.nextCursor ?? null;
      pages += 1;
    } while (cursor !== null);
    expect(keys).toEqual(["k3", "k2", "k1"]);
    expect(pages).toBe(3);
  });

  test("records a job as submitted once Process succeeded", async () => {
    const { client } = make();
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const [job] = (await client.listJobs()).jobs;
    expect(job.status).toBe("submitted");
    expect(job.origin).toBe("http://localhost:3000");
    expect(job.burnTxHash).toBe(sent.burnTxHash);
    expect(job.sdkAddress).toBe(sent.sdkAddress);
  });

  test("getJob finds the same job by hash, key and id", async () => {
    const { client } = make("populated");
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const byHash = await client.getJob({ burnTxHash: sent.burnTxHash });
    const byKey = await client.getJob({ idempotencyKey: "k" });
    const byId = await client.getJob({ jobId: sent.jobId });
    expect(byKey).toEqual(byHash);
    expect(byId).toEqual(byHash);
    expect(byHash.burnTxHash).toBe(sent.burnTxHash);
  });

  test("an unknown burnTxHash gives null", async () => {
    const { client } = make();
    await expect(client.getJob({ burnTxHash: "0x" + "9".repeat(64) })).resolves.toBeNull();
  });
});

describe("controls and events", () => {
  test("switchAccount emits accountsChanged with a different node; jobs are per node", async () => {
    const { client, controls } = make();
    const before = await client.getAccounts();
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const events = collect(client, "gnus_accountsChanged");
    controls.switchAccount();
    expect(events.seen).toHaveLength(1);
    expect(events.seen[0].node.sdkAddress).not.toBe(before.node.sdkAddress);
    expect(events.mismatches).toHaveLength(0);
    expect((await client.getAccounts()).node.sdkAddress).toBe(events.seen[0].node.sdkAddress);
    expect((await client.listJobs()).jobs).toEqual([]);
    await expect(client.getJob({ burnTxHash: sent.burnTxHash })).resolves.toBeNull();
    expect((await client.getEarnings()).sdkAddress).toBe(events.seen[0].node.sdkAddress);
  });

  test("setNetwork emits networkChanged", async () => {
    const { client, controls } = make();
    const events = collect(client, "gnus_networkChanged");
    controls.setNetwork({ sdk: "main", evmChainId: 137 });
    expect(events.seen).toEqual([{ sdk: "main", evmChainId: 137 }]);
    expect((await client.getAccounts()).network).toEqual({ sdk: "main", evmChainId: 137 });
    expect((await client.estimate({ job: JOB })).network).toEqual({ sdk: "main", evmChainId: 137 });
  });

  test("advanceJob walks the statuses and emits jobUpdated", async () => {
    const { client, controls } = make();
    const sent = await client.submitJob({ job: JOB, idempotencyKey: "k" });
    const events = collect(client, "gnus_jobUpdated");
    controls.advanceJob(sent.burnTxHash);
    controls.advanceJob(sent.burnTxHash);
    controls.advanceJob(sent.burnTxHash);
    controls.advanceJob(sent.burnTxHash);
    expect(events.seen.map((j) => j.status)).toEqual(["queued", "processing", "completed", "completed"]);
    controls.advanceJob(sent.burnTxHash, "failed");
    expect(events.seen[4].status).toBe("failed");
    expect((await client.getJob({ burnTxHash: sent.burnTxHash })).status).toBe("failed");
    expect(events.mismatches).toHaveLength(0);
  });

  test("advanceJob on an unknown hash throws", () => {
    expect(() => make().controls.advanceJob("0x" + "7".repeat(64))).toThrow();
  });

  test("disconnect emits code 4900 by default", () => {
    const { client, controls } = make();
    const events = collect(client, "disconnect");
    controls.disconnect();
    controls.disconnect(1006, "gone");
    expect(events.seen).toEqual([
      { code: 4900, message: expect.any(String) },
      { code: 1006, message: "gone" },
    ]);
    expect(events.mismatches).toHaveLength(0);
  });

  test("events go to the newest facade only", () => {
    const { mock, controls } = make();
    const old = jest.fn();
    mock.on("disconnect", old);
    const next = controls.reinject();
    const fresh = jest.fn();
    next.on("disconnect", fresh);
    controls.disconnect();
    expect(old).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
