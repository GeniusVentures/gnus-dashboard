import {
  estimateSchema,
  submitResultSchema,
  jobSchema,
  jobDetailSchema,
  jobListSchema,
  earningsSchema,
  disconnectSchema,
  networkSchema,
  eventSchemas,
  accountsSchema,
  JOB_STATUSES,
} from "../../../lib/gnus/schema";

const hex = (pair, n) => "0x" + pair.repeat(n);
const sdk = hex("a1", 64);
const evm = hex("b2", 20);
const hash = hex("c3", 32);

const network = () => ({ sdk: "staging", evmChainId: 80002 });
const estimate = (over = {}) => ({
  cost: "1500000000000000000",
  gas: { gasPriceGwei: "30.5", symbol: "POL" },
  balance: "9000000000000000000",
  network: network(),
  ...over,
});
const submit = (over = {}) => ({ jobId: "job-1", burnTxHash: hash, sdkAddress: sdk, status: "submitted", ...over });
const job = (over = {}) => ({
  jobId: "job-1",
  burnTxHash: hash,
  sdkAddress: sdk,
  origin: "https://dashboard.example",
  idempotencyKey: "key-1",
  submittedAt: "2026-10-27T01:02:03Z",
  cost: "1500000000000000000",
  status: "submitted",
  ...over,
});
const detail = (over = {}) => ({ ...job(), result: null, ...over });
const list = (over = {}) => ({ jobs: [job()], nextCursor: null, ...over });
const earnings = (over = {}) => ({
  sdkAddress: sdk,
  balance: "5",
  processing: { isProcessing: true, jobsProcessed: "12" },
  earned: { total: "100", history: [{ at: "2026-10-27T01:02:03Z", amount: "10", jobId: "job-1" }] },
  ...over,
});
const accounts = () => ({
  node: { sdkAddress: sdk, linkedEvm: evm, role: "main", main: null },
  payer: { evmAddress: evm, canSign: true },
  switching: false,
  network: network(),
  version: "1",
  unit: { symbol: "GNUS", decimals: 18 },
});

const ok = (schema, v) => expect(schema.safeParse(v).success).toBe(true);
const bad = (schema, v) => expect(schema.safeParse(v).success).toBe(false);

describe("valid examples parse", () => {
  test.each([
    ["estimate with gas", estimateSchema, estimate()],
    ["estimate with gas null", estimateSchema, estimate({ gas: null })],
    ["estimate with balance null", estimateSchema, estimate({ balance: null })],
    ["submit with jobId", submitResultSchema, submit()],
    ["submit with jobId null", submitResultSchema, submit({ jobId: null })],
    ["submit bridgedNotProcessed", submitResultSchema, submit({ status: "bridgedNotProcessed" })],
    ["job", jobSchema, job()],
    ["job detail result null", jobDetailSchema, detail()],
    ["job detail with cids", jobDetailSchema, detail({ result: { cids: ["Qm1"], data: { a: 1 } }, error: "x" })],
    ["list with cursor", jobListSchema, list({ nextCursor: "c1" })],
    ["list without cursor", jobListSchema, list()],
    ["earnings set", earningsSchema, earnings()],
    ["earnings all null", earningsSchema, earnings({ processing: { isProcessing: false, jobsProcessed: null }, earned: { total: null, history: null } })],
    ["disconnect", disconnectSchema, { code: 4900, message: "closing" }],
    ["networkChanged", networkSchema, network()],
  ])("%s", (_name, schema, value) => ok(schema, value));
});

describe("amounts", () => {
  test("numbers and exponent strings fail", () => {
    bad(estimateSchema, estimate({ cost: 1000 }));
    bad(estimateSchema, estimate({ balance: "1e21" }));
    bad(earningsSchema, earnings({ processing: { isProcessing: true, jobsProcessed: 12 } }));
  });
  test("gas price is a decimal string", () => {
    ok(estimateSchema, estimate({ gas: { gasPriceGwei: "30.5", symbol: "POL" } }));
    bad(estimateSchema, estimate({ gas: { gasPriceGwei: 30.5, symbol: "POL" } }));
  });
  test("a missing cost fails", () => {
    const e = estimate();
    delete e.cost;
    bad(estimateSchema, e);
  });
});

describe("identifiers", () => {
  test("wrong shapes fail", () => {
    bad(jobSchema, job({ sdkAddress: evm }));
    bad(jobSchema, job({ burnTxHash: hex("c3", 64) }));
    bad(jobSchema, job({ burnTxHash: hash.toUpperCase().replace("0X", "0x") }));
  });
  test("required fields", () => {
    const j = job();
    delete j.idempotencyKey;
    bad(jobSchema, j);
    const e = earnings();
    delete e.earned;
    bad(earningsSchema, e);
  });
});

describe("status", () => {
  test("unseen job status reads unknown", () => {
    expect(jobSchema.parse(job({ status: "paused" })).status).toBe("unknown");
    for (const s of JOB_STATUSES) {
      expect(jobSchema.parse(job({ status: s })).status).toBe(s);
    }
  });
  test("non-string job status fails", () => bad(jobSchema, job({ status: 3 })));
  test("submit status is a strict enum", () => bad(submitResultSchema, submit({ status: "queued" })));
});

describe("timestamps", () => {
  test("ISO with Z or offset", () => {
    ok(jobSchema, job({ submittedAt: "2026-10-27T01:02:03.456789Z" }));
    ok(jobSchema, job({ submittedAt: "2026-10-27T01:02:03+02:00" }));
    bad(jobSchema, job({ submittedAt: "yesterday" }));
  });
});

describe("shape handling", () => {
  test("unknown keys are stripped", () => {
    const out = jobSchema.parse(job({ extra: "x" }));
    expect("extra" in out).toBe(false);
  });
  test("nullable fields come out as null", () => {
    const e = earningsSchema.parse(earnings({ processing: { isProcessing: false, jobsProcessed: null }, earned: { total: null, history: null } }));
    expect(e.processing.jobsProcessed).toBeNull();
    expect(e.earned.total).toBeNull();
    expect(e.earned.history).toBeNull();
    expect(jobSchema.parse(job({ jobId: null })).jobId).toBeNull();
    expect(jobDetailSchema.parse(detail()).result).toBeNull();
    expect(estimateSchema.parse(estimate({ gas: null, balance: null })).gas).toBeNull();
    expect(accountsSchema.parse({ ...accounts(), node: { sdkAddress: sdk, linkedEvm: null, role: "none", main: null }, payer: { evmAddress: null, canSign: false } }).payer.evmAddress).toBeNull();
  });
  test("eventSchemas map the four events", () => {
    expect(Object.keys(eventSchemas).sort()).toEqual(["disconnect", "gnus_accountsChanged", "gnus_jobUpdated", "gnus_networkChanged"]);
    expect(eventSchemas.gnus_accountsChanged).toBe(accountsSchema);
    expect(eventSchemas.gnus_jobUpdated).toBe(jobSchema);
  });
});
