import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { jobLookupSchema, jobListSchema } from "../../../lib/gnus/schema";

const list = (provider, params = {}) => provider.request({ method: "gnus_listJobs", params });
const hashOf = (n) => `0x5eed${n.toString(16).padStart(60, "0")}`;

describe("jobHistory", () => {
  it("lists 25 jobs for the first node account as pages of 20 and 5, newest first", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const first = jobListSchema.parse(await list(provider, { limit: 20 }));
    expect(first.jobs).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    expect(first.jobs[0].burnTxHash).toBe(hashOf(25));
    const second = jobListSchema.parse(await list(provider, { limit: 20, cursor: first.nextCursor }));
    expect(second.jobs).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    expect(second.jobs[4].burnTxHash).toBe(hashOf(1));
  });

  it("carries only the statuses the wallet can report today, with no job id", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const { jobs } = await list(provider, { limit: 100 });
    expect(new Set(jobs.map((job) => job.status))).toEqual(new Set(["submitted", "bridgedNotProcessed", "unconfirmed"]));
    expect(jobs.every((job) => job.jobId === null)).toBe(true);
  });

  it("puts each status on the newest page", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const { jobs } = await list(provider, { limit: 20 });
    expect(new Set(jobs.map((job) => job.status))).toEqual(new Set(["submitted", "bridgedNotProcessed", "unconfirmed"]));
  });

  it("finds a page-2 job by its burn hash, with a null result", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const found = jobLookupSchema.parse(await provider.request({ method: "gnus_getJob", params: { burnTxHash: hashOf(2) } }));
    expect(found).toMatchObject({ burnTxHash: hashOf(2), result: null, jobId: null });
  });

  it("shows an empty list after the node account switches", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    provider.controls.switchAccount();
    expect((await list(provider)).jobs).toEqual([]);
  });

  it("never collides with the mock's own submit hashes", async () => {
    const provider = createMockProvider({ profile: "jobHistory" });
    const job = { name: "x", inputs: [], outputs: [], passes: [] };
    const result = await provider.request({ method: "gnus_submitJob", params: { job, idempotencyKey: "k" } });
    expect(result.burnTxHash).toBe("0x" + "0".repeat(63) + "1");
    expect((await list(provider, { limit: 100 })).jobs).toHaveLength(26);
  });
});

describe("readsFail", () => {
  it("fails the three read methods with -32603 and leaves getAccounts alone", async () => {
    const provider = createMockProvider({ profile: "readsFail" });
    await expect(list(provider)).rejects.toMatchObject({ code: -32603 });
    await expect(provider.request({ method: "gnus_getJob", params: { jobId: "x" } })).rejects.toMatchObject({ code: -32603 });
    await expect(provider.request({ method: "gnus_getEarnings", params: {} })).rejects.toMatchObject({ code: -32603 });
    await expect(provider.request({ method: "gnus_getAccounts" })).resolves.toBeTruthy();
  });
});
