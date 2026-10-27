// Asserts the contract snapshot in .planning/research/gnus-rpc-contract.md.
// Set GNUS_CONTRACT_FACTORY to a factory module path to run it against another transport.
// Cases that need `controls` are skipped by name on targets without them.
const path = require("path");
const { createGnusClient } = require("../../lib/gnus/client");
const { normalizeError } = require("../../lib/gnus/errors");

const factory = process.env.GNUS_CONTRACT_FACTORY
  ? require(path.resolve(process.cwd(), process.env.GNUS_CONTRACT_FACTORY))
  : require("./factories/mock");

const probe = factory.create("today");
const hasControls = Boolean(probe && probe.controls);
if (probe) {
  probe.transport.close();
}
const itControls = hasControls ? it : it.skip;
const SKIP_NOTE = "[needs controls]";

const JOB = factory.exampleJob;
const OTHER_JOB = { ...JOB, name: `${JOB.name}-other` };
const HASH = /^0x[0-9a-f]{64}$/;
const SDK = /^0x[0-9a-f]{128}$/;
const EVM = /^0x[0-9a-f]{40}$/;
const DIGITS = /^\d+$/;

let keyCount = 0;
const newKey = () => `contract-${Date.now()}-${(keyCount += 1)}`;

const targets = [];
function fresh() {
  const target = factory.create("today");
  if (!target) {
    throw new Error(`factory "${factory.name}" cannot create profile "today"`);
  }
  targets.push(target);
  return { target, client: createGnusClient(target.transport), controls: target.controls };
}
afterEach(() => {
  while (targets.length > 0) {
    targets.pop().transport.close();
  }
});

async function eventually(check, label) {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function listen(client, event) {
  const seen = [];
  const mismatches = [];
  client.on(event, (payload) => seen.push(payload), (err) => mismatches.push(err));
  return { seen, mismatches };
}

async function kindOf(target, method, params) {
  try {
    await target.transport.request(params === undefined ? { method } : { method, params });
  } catch (err) {
    return normalizeError(err).kind;
  }
  return "resolved";
}

describe(`gnus contract (${factory.name})`, () => {
  describe("methods", () => {
    test("getAccounts", async () => {
      const { client } = fresh();
      const a = await client.getAccounts();
      expect(a.node.sdkAddress).toMatch(SDK);
      expect(a.payer.evmAddress === null || EVM.test(a.payer.evmAddress)).toBe(true);
      expect(a.version).toBe("1");
      expect(Number.isInteger(a.unit.decimals)).toBe(true);
    });

    test("estimate", async () => {
      const { client } = fresh();
      const e = await client.estimate({ job: JOB });
      expect(e.cost).toMatch(DIGITS);
      expect(e.balance === null || DIGITS.test(e.balance)).toBe(true);
      expect(e.gas === null || /^\d+(\.\d+)?$/.test(e.gas.gasPriceGwei)).toBe(true);
    });

    test("submitJob keys the job on the node account, not the payer", async () => {
      const { client } = fresh();
      const accounts = await client.getAccounts();
      const r = await client.submitJob({ job: JOB, idempotencyKey: newKey() });
      expect(["submitted", "bridgedNotProcessed"]).toContain(r.status);
      expect(r.burnTxHash).toMatch(HASH);
      expect(r.sdkAddress).toBe(accounts.node.sdkAddress);
      expect(r.sdkAddress).not.toBe(accounts.payer.evmAddress);
    });

    test("replaying a submit returns the first result and leaves one job", async () => {
      const { client } = fresh();
      const key = newKey();
      const first = await client.submitJob({ job: JOB, idempotencyKey: key });
      const second = await client.submitJob({ job: JOB, idempotencyKey: key });
      expect(second).toEqual(first);
      const walked = await listAll(client);
      expect(walked.filter((job) => job.idempotencyKey === key)).toHaveLength(1);
    });

    test("the same key with another job is idempotencyKeyReused", async () => {
      const { client } = fresh();
      const key = newKey();
      await client.submitJob({ job: JOB, idempotencyKey: key });
      const err = await client.submitJob({ job: OTHER_JOB, idempotencyKey: key }).catch((e) => e);
      expect(err.kind).toBe("idempotencyKeyReused");
    });

    test("two concurrent submits give one result and one submitInFlight", async () => {
      const { client } = fresh();
      const results = await Promise.allSettled([
        client.submitJob({ job: JOB, idempotencyKey: newKey() }),
        client.submitJob({ job: JOB, idempotencyKey: newKey() }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.filter((r) => r.status === "rejected");
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason.kind).toBe("submitInFlight");
    });

    test("listJobs is newest first and a limit-1 cursor walk reaches the end", async () => {
      const { client } = fresh();
      const first = newKey();
      const second = newKey();
      await client.submitJob({ job: JOB, idempotencyKey: first });
      await client.submitJob({ job: JOB, idempotencyKey: second });
      const keys = (await listAll(client)).map((job) => job.idempotencyKey);
      expect(keys.indexOf(second)).toBeGreaterThanOrEqual(0);
      expect(keys.indexOf(second)).toBeLessThan(keys.indexOf(first));
    });

    test("getJob finds the same job by hash, key and id, and null for an unknown hash", async () => {
      const { client } = fresh();
      const key = newKey();
      const sent = await client.submitJob({ job: JOB, idempotencyKey: key });
      const byHash = await client.getJob({ burnTxHash: sent.burnTxHash });
      expect(byHash).not.toBeNull();
      expect(byHash.burnTxHash).toBe(sent.burnTxHash);
      expect(await client.getJob({ idempotencyKey: key })).toEqual(byHash);
      if (sent.jobId !== null) {
        expect(await client.getJob({ jobId: sent.jobId })).toEqual(byHash);
      }
      expect(await client.getJob({ burnTxHash: "0x" + "0".repeat(64) })).toBeNull();
    });

    test("getEarnings", async () => {
      const { client } = fresh();
      const accounts = await client.getAccounts();
      const e = await client.getEarnings();
      expect(e.sdkAddress).toBe(accounts.node.sdkAddress);
      expect(e.balance).toMatch(DIGITS);
      for (const value of [e.processing.jobsProcessed, e.earned.total]) {
        expect(value === null || DIGITS.test(value)).toBe(true);
      }
    });
  });

  describe("invalid parameters", () => {
    const hash = "0x" + "1".repeat(64);
    const cases = [
      ["submitJob with a string job", "gnus_submitJob", { job: "x", idempotencyKey: "k" }],
      ["submitJob with the old model/input shape", "gnus_submitJob", { job: { model: "m", input: {} }, idempotencyKey: "k" }],
      ["submitJob without a key", "gnus_submitJob", { job: JOB }],
      ["estimate with a string job", "gnus_estimate", { job: "x" }],
      ["listJobs limit 0", "gnus_listJobs", { limit: 0 }],
      ["listJobs limit 101", "gnus_listJobs", { limit: 101 }],
      ["listJobs cursor empty", "gnus_listJobs", { cursor: "" }],
      ["getJob with no selector", "gnus_getJob", {}],
      ["getJob with two selectors", "gnus_getJob", { jobId: "a", burnTxHash: hash }],
    ];
    test.each(cases)("%s is invalidParams", async (_label, method, params) => {
      const { target } = fresh();
      expect(await kindOf(target, method, params)).toBe("invalidParams");
    });

    test("an unknown method is unsupportedMethod", async () => {
      const { target } = fresh();
      expect(await kindOf(target, "gnus_getAddress")).toBe("unsupportedMethod");
    });
  });

  describe("events", () => {
    itControls(`${SKIP_NOTE} gnus_accountsChanged after switchAccount; the new account has no jobs`, async () => {
      const { client, controls } = fresh();
      const before = await client.getAccounts();
      await client.submitJob({ job: JOB, idempotencyKey: newKey() });
      const events = listen(client, "gnus_accountsChanged");
      controls.switchAccount();
      await eventually(() => events.seen.length > 0, "gnus_accountsChanged");
      expect(events.seen[0].node.sdkAddress).not.toBe(before.node.sdkAddress);
      expect((await client.listJobs()).jobs).toEqual([]);
      expect(events.mismatches).toHaveLength(0);
    });

    itControls(`${SKIP_NOTE} gnus_networkChanged after setNetwork`, async () => {
      const { client, controls } = fresh();
      const events = listen(client, "gnus_networkChanged");
      controls.setNetwork({ sdk: "other", evmChainId: 137 });
      await eventually(() => events.seen.length > 0, "gnus_networkChanged");
      expect(events.seen[0]).toEqual({ sdk: "other", evmChainId: 137 });
      expect(events.mismatches).toHaveLength(0);
    });

    itControls(`${SKIP_NOTE} gnus_jobUpdated with the advanced status after advanceJob`, async () => {
      const { client, controls } = fresh();
      const sent = await client.submitJob({ job: JOB, idempotencyKey: newKey() });
      const events = listen(client, "gnus_jobUpdated");
      controls.advanceJob(sent.burnTxHash, "completed");
      await eventually(() => events.seen.length > 0, "gnus_jobUpdated");
      expect(events.seen[0].burnTxHash).toBe(sent.burnTxHash);
      expect(events.seen[0].status).toBe("completed");
      expect(events.mismatches).toHaveLength(0);
    });

    itControls(`${SKIP_NOTE} disconnect with a numeric code after disconnect()`, async () => {
      const { client, controls } = fresh();
      const events = listen(client, "disconnect");
      controls.disconnect();
      await eventually(() => events.seen.length > 0, "disconnect");
      expect(typeof events.seen[0].code).toBe("number");
      expect(events.mismatches).toHaveLength(0);
    });
  });
});

async function listAll(client) {
  const jobs = [];
  let cursor;
  for (let page = 0; page < 200; page += 1) {
    const result = await client.listJobs(cursor === undefined ? { limit: 1 } : { limit: 1, cursor });
    jobs.push(...result.jobs);
    if (result.nextCursor === null) {
      return jobs;
    }
    cursor = result.nextCursor;
  }
  throw new Error("listJobs did not reach a null nextCursor in 200 pages");
}
