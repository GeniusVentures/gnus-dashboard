// Every contract error code and reason (section 5 of .planning/research/gnus-rpc-contract.md) reaches the page as its typed error.
// Loads the factory like gnus-contract.test.js; a profile the target cannot create is skipped by name and reported as not observed.
const path = require("path");
const { createGnusClient } = require("../../lib/gnus/client");
const { GnusError, GnusContractMismatchError } = require("../../lib/gnus/errors");
const { formatAmount } = require("../../lib/gnus/amount");
const { spendAllowed, newKey } = require("./factories/spend");

const factory = process.env.GNUS_CONTRACT_FACTORY
  ? require(path.resolve(process.cwd(), process.env.GNUS_CONTRACT_FACTORY))
  : require("./factories/mock");

const canSpend = spendAllowed(factory);
const itSpends = canSpend ? it : it.skip;
// Marks a row whose call submits a valid job: on a real wallet that burns GNUS, so it needs the opt-in.
const spends = (call) => Object.assign(call, { spends: true });

const JOB = factory.exampleJob;
const OTHER_JOB = { ...JOB, name: `${JOB.name}-other` };

const EXPECTED_ROWS = [
  "4001", "4100", "4200", "4900",
  "-32602", "-32602:idempotency_key_reused",
  "-32603", "-32603:balance_unavailable",
  "-32005:rate_limited", "-32005:confirm_open", "-32005:submit_in_flight",
  "-32010", "-32011", "-32012", "-32013", "-32014",
  "-32015", "-32015:account_changed",
];

const observed = new Set();

function available(profile, needsControls) {
  const probe = factory.create(profile);
  if (!probe) {
    return false;
  }
  probe.transport.close();
  return !needsControls || Boolean(probe.controls);
}

const targets = [];
function open(profile) {
  const target = factory.create(profile);
  targets.push(target);
  return { client: createGnusClient(target.transport), controls: target.controls };
}

afterEach(() => {
  jest.useRealTimers();
  while (targets.length > 0) {
    targets.pop().transport.close();
  }
});

afterAll(() => {
  const missing = EXPECTED_ROWS.filter((row) => !observed.has(row));
  if (factory.name === "mock") {
    expect(missing).toEqual([]);
  } else if (missing.length > 0) {
    console.warn(`gnus-errors: rows not observed on "${factory.name}": ${missing.join(", ")}`);
  }
});

const rejection = (promise) =>
  promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (err) => err,
  );

// Asserts the typed error and records the code (and reason) it was observed with.
function recordRow(id, err, kind) {
  expect(err).toBeInstanceOf(GnusError);
  expect(err.kind).toBe(kind);
  expect(err.message.length).toBeGreaterThan(0);
  expect(err.action).toBeTruthy();
  const seen = err.reason ? `${err.code}:${err.reason}` : `${err.code}`;
  expect(seen).toBe(id);
  observed.add(seen);
}

// profile, call and expected kind per row; extra checks run after the row is recorded.
const ROWS = [
  ["4001", "connectRejected", "rejected", async ({ client }) => client.getAccounts()],
  [
    "4001",
    "rejectConfirm",
    "rejected",
    spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() })),
    async ({ client }) => expect((await client.listJobs()).jobs).toEqual([]),
  ],
  ["4100", "originRevoked", "unauthorized", async ({ client }) => client.getAccounts()],
  ["4200", "methodUnsupported", "unsupportedMethod", async ({ client }) => client.getEarnings()],
  ["4900", "sdkStarting", "notReady", async ({ client }) => client.getAccounts(), null, true],
  ["-32602", "today", "invalidParams", async ({ client }) => client.submitJob({ job: "not an object", idempotencyKey: newKey() })],
  [
    "-32602:idempotency_key_reused",
    "today",
    "idempotencyKeyReused",
    spends(async ({ client }) => {
      const key = newKey();
      await client.submitJob({ job: JOB, idempotencyKey: key });
      return client.submitJob({ job: OTHER_JOB, idempotencyKey: key });
    }),
  ],
  ["-32603", "internalError", "internal", async ({ client }) => client.estimate({ job: JOB })],
  [
    "-32603:balance_unavailable",
    "balanceUnavailable",
    "internal",
    spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() })),
    async ({ client }) => expect((await client.estimate({ job: JOB })).balance).toBeNull(),
  ],
  ["-32005:confirm_open", "confirmOpen", "confirmOpen", spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() }))],
  ["-32010", "costUnavailable", "costUnavailable", async ({ client }) => client.estimate({ job: JOB })],
  ["-32010", "costUnavailable", "costUnavailable", spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() }))],
  [
    "-32011",
    "insufficientBalance",
    "insufficientBalance",
    spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() })),
    async ({ client }) => {
      const estimate = await client.estimate({ job: JOB });
      expect(BigInt(estimate.balance)).toBeLessThan(BigInt(estimate.cost));
    },
  ],
  ["-32012", "payerCannotSign", "payerCannotSign", spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() }))],
  [
    "-32013",
    "bridgeFailed",
    "bridgeFailed",
    spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() })),
    async ({ client }) => expect((await client.listJobs()).jobs).toEqual([]),
  ],
  [
    "-32014",
    "bridgedNotProcessedError",
    "bridgedNotProcessed",
    spends(async ({ client }) => client.submitJob({ job: JOB, idempotencyKey: newKey() })),
    async ({ client }, err) => {
      const { jobs } = await client.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].status).toBe("bridgedNotProcessed");
      expect(err.burnTxHash).toBe(jobs[0].burnTxHash);
    },
  ],
];

describe(`gnus error conformance (${factory.name})`, () => {
  describe.each(ROWS)("row %s from %s", (id, profile, kind, call, after, fakeTimers) => {
    const run = available(profile) && (canSpend || !call.spends) ? it : it.skip;
    run("arrives as its typed error", async () => {
      if (fakeTimers) {
        jest.useFakeTimers();
      }
      const ctx = open(profile);
      const err = await rejection(call(ctx));
      recordRow(id, err, kind);
      if (after) {
        await after(ctx, err);
      }
    });
  });

  (available("rateLimited") ? it : it.skip)("row -32005:rate_limited from rateLimited", async () => {
    jest.useFakeTimers();
    const { client } = open("rateLimited");
    const first = client.estimate({ job: JOB });
    const err = await rejection(client.estimate({ job: JOB }));
    recordRow("-32005:rate_limited", err, "rateLimited");
    await jest.advanceTimersByTimeAsync(1000);
    await expect(first).resolves.toBeDefined();
  });

  (available("slowConfirm") ? itSpends : it.skip)("row -32005:submit_in_flight and a three-minute confirm from slowConfirm", async () => {
    jest.useFakeTimers();
    const { client } = open("slowConfirm");
    let settled = false;
    const first = client.submitJob({ job: JOB, idempotencyKey: newKey() }).finally(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(10000);
    const err = await rejection(client.submitJob({ job: JOB, idempotencyKey: newKey() }));
    recordRow("-32005:submit_in_flight", err, "submitInFlight");
    await jest.advanceTimersByTimeAsync(169000);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1000);
    await expect(first).resolves.toMatchObject({ status: "submitted" });
  });

  (available("switching") ? it : it.skip)("row -32015 from switching, then a new account", async () => {
    jest.useFakeTimers();
    const { client } = open("switching");
    const events = [];
    client.on("gnus_accountsChanged", (accounts) => events.push(accounts), (err) => {
      throw err;
    });
    const during = await client.getAccounts();
    expect(during.switching).toBe(true);
    const err = await rejection(client.estimate({ job: JOB }));
    recordRow("-32015", err, "switching");
    await jest.advanceTimersByTimeAsync(2000);
    const last = events[events.length - 1];
    expect(last.switching).toBe(false);
    expect(last.node.sdkAddress).not.toBe(during.node.sdkAddress);
    await expect(client.estimate({ job: JOB })).resolves.toBeDefined();
  });

  (available("slowConfirm", true) ? itSpends : it.skip)(
    "[needs controls] row -32015:account_changed from slowConfirm and switchAccount",
    async () => {
      jest.useFakeTimers();
      const { client, controls } = open("slowConfirm");
      const pending = rejection(client.submitJob({ job: JOB, idempotencyKey: newKey() }));
      await jest.advanceTimersByTimeAsync(10000);
      controls.switchAccount();
      recordRow("-32015:account_changed", await pending, "switching");
      expect((await client.listJobs()).jobs).toEqual([]);
    },
  );

  (available("bridgedNotProcessedStatus") ? itSpends : it.skip)("paid but not processed as a result keeps the status", async () => {
    const { client } = open("bridgedNotProcessedStatus");
    const result = await client.submitJob({ job: JOB, idempotencyKey: newKey() });
    expect(result.status).toBe("bridgedNotProcessed");
    expect(result.jobId).toBeNull();
    const { jobs } = await client.listJobs();
    expect(jobs.map((job) => job.status)).toEqual(["bridgedNotProcessed"]);
  });

  describe("malformed replies are named contract mismatches", () => {
    function expectMismatch(err) {
      expect(err).toBeInstanceOf(GnusContractMismatchError);
      expect(err.message.startsWith("Wallet contract mismatch")).toBe(true);
      expect(err.message).toContain("1");
    }

    (available("malformedNumericAmount") ? it : it.skip)("a numeric amount", async () => {
      const { client } = open("malformedNumericAmount");
      await client.getAccounts();
      expectMismatch(await rejection(client.estimate({ job: JOB })));
    });

    (available("malformedSwappedAddress") ? it : it.skip)("swapped addresses", async () => {
      const { client } = open("malformedSwappedAddress");
      expectMismatch(await rejection(client.getAccounts()));
    });

    (available("malformedMissingField") ? it : it.skip)("a missing field", async () => {
      const { client } = open("malformedMissingField");
      expectMismatch(await rejection(client.getAccounts()));
    });
  });

  (available("bigAmounts") ? it : it.skip)("amounts above 2^53 format exactly with the wallet's decimals", async () => {
    const { client } = open("bigAmounts");
    const { unit } = await client.getAccounts();
    const earnings = await client.getEarnings();
    const estimate = await client.estimate({ job: JOB });
    expect(unit.decimals).toBe(18);
    expect(formatAmount(earnings.balance, unit.decimals)).toBe("0.009007199254740993");
    expect(formatAmount(estimate.cost, unit.decimals)).toBe("1000");
    expect(formatAmount(earnings.balance, 0)).toBe("9007199254740993");
    expect(formatAmount(estimate.cost, 0)).toBe("1000000000000000000000");
  });
});
