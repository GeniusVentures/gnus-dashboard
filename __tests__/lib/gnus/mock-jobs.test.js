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

describe("jobResults", () => {
  const hash = (n) => `0x7e57${n.toString(16).padStart(60, "0")}`;
  const getJob = (provider, n) => provider.request({ method: "gnus_getJob", params: { burnTxHash: hash(n) } });

  it("lists nine jobs, one per state, with job ids except on the two the wallet reports today", async () => {
    const provider = createMockProvider({ profile: "jobResults" });
    const { jobs } = jobListSchema.parse(await list(provider, { limit: 100 }));
    expect(jobs).toHaveLength(9);
    const byStatus = Object.fromEntries(jobs.map((job) => [job.burnTxHash, job]));
    expect(jobs.map((job) => job.status).sort()).toEqual(
      ["bridgedNotProcessed", "completed", "failed", "failed", "processing", "queued", "submitted", "unconfirmed", "unknown"].sort(),
    );
    for (const job of jobs) {
      expect(job.jobId === null).toBe(job.status === "bridgedNotProcessed" || job.status === "unconfirmed");
    }
    expect(Object.keys(byStatus)).toHaveLength(9);
  });

  it("gives the completed job two CIDs and data, and the failed job its error", async () => {
    const provider = createMockProvider({ profile: "jobResults" });
    const done = jobLookupSchema.parse(await getJob(provider, 4));
    expect(done.status).toBe("completed");
    expect(done.result.cids).toHaveLength(2);
    expect(done.result.data).toEqual({ frames: 24, label: "pose" });
    const failed = jobLookupSchema.parse(await getJob(provider, 5));
    expect(failed.error).toBe("The node ran out of memory.");
  });

  it("keeps result and error out of listJobs and out of jobUpdated payloads", async () => {
    const provider = createMockProvider({ profile: "jobResults" });
    const { jobs } = await list(provider, { limit: 100 });
    for (const job of jobs) {
      expect(job).not.toHaveProperty("result");
      expect(job).not.toHaveProperty("error");
    }
    const seen = [];
    provider.on("gnus_jobUpdated", (payload) => seen.push(payload));
    provider.controls.advanceJob(hash(4), "failed");
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toHaveProperty("result");
    expect(seen[0]).not.toHaveProperty("error");
  });

  it("parses an unseen status to unknown instead of failing", async () => {
    const provider = createMockProvider({ profile: "jobResults" });
    const { jobs } = jobListSchema.parse(await list(provider, { limit: 100 }));
    expect(jobs.find((job) => job.jobId === "job-archived").status).toBe("unknown");
  });

  it("carries markup and script payloads in the hostile job's origin, error and data", async () => {
    const provider = createMockProvider({ profile: "jobResults" });
    const hostile = jobLookupSchema.parse(await getJob(provider, 9));
    expect(hostile.origin).toContain('<img src="x" onerror=');
    expect(hostile.error).toContain("onerror");
    expect(JSON.stringify(hostile.result.data)).toContain("<script>");
  });

  it("leaves profiles without seeds as they were", async () => {
    const provider = createMockProvider({ profile: "today" });
    expect((await list(provider)).jobs).toEqual([]);
  });
});
