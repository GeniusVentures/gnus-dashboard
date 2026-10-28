import { JOB_STATUSES } from "../../lib/gnus/schema";
import { IPFS_GATEWAY, STATUS_TEXT, cidHref, isFinal, isMarked, matchesSearch, parseJobRef, replaceInDetail, replaceInPages, searchTarget, shortJobId } from "../../lib/jobs";

const HASH = "0x" + "ab".repeat(32);

describe("STATUS_TEXT", () => {
  it("has an entry for every contract status with words", () => {
    expect(Object.keys(STATUS_TEXT).sort()).toEqual([...JOB_STATUSES].sort());
    for (const status of JOB_STATUSES) {
      const { label, explanation } = STATUS_TEXT[status];
      expect(label.length).toBeGreaterThan(0);
      expect(explanation.length).toBeGreaterThan(0);
      expect(`${label} ${explanation}`).not.toMatch(/running|progress bar/i);
    }
  });

  it("reads submitted as Submitted to the network", () => {
    expect(STATUS_TEXT.submitted.label).toBe("Submitted to the network");
    expect(STATUS_TEXT.bridgedNotProcessed.label).toBe("Paid but not processed");
    expect(STATUS_TEXT.unknown.label).toBe("Status unknown");
  });

  it("is final for completed, failed and bridgedNotProcessed only", () => {
    expect(JOB_STATUSES.filter(isFinal).sort()).toEqual(["bridgedNotProcessed", "completed", "failed"]);
  });

  it("marks bridgedNotProcessed, unconfirmed and pending only", () => {
    expect(JOB_STATUSES.filter(isMarked).sort()).toEqual(["bridgedNotProcessed", "pending", "unconfirmed"]);
  });
});

describe("shortJobId", () => {
  it("uses a job id of 14 characters or fewer as is", () => {
    expect(shortJobId({ jobId: "job-1", burnTxHash: HASH })).toBe("job-1");
    expect(shortJobId({ jobId: "x".repeat(14), burnTxHash: HASH })).toBe("x".repeat(14));
  });

  it("shortens a longer job id and falls back to the shortened hash", () => {
    expect(shortJobId({ jobId: "0x" + "cd".repeat(20), burnTxHash: HASH })).toBe("0xcdcd...cdcd");
    expect(shortJobId({ jobId: "x".repeat(15), burnTxHash: HASH })).toBe("xxxxxx...xxxx");
    expect(shortJobId({ jobId: null, burnTxHash: HASH })).toBe("0xabab...abab");
  });
});

describe("parseJobRef", () => {
  const hash = "0x" + "ab".repeat(32);

  it("reads one hash, lowercased, or one id", () => {
    expect(parseJobRef({ hash })).toEqual({ burnTxHash: hash });
    expect(parseJobRef({ hash: hash.toUpperCase().replace("0X", "0x") })).toEqual({ burnTxHash: hash });
    expect(parseJobRef({ id: "job-1" })).toEqual({ jobId: "job-1" });
    expect(parseJobRef({ id: "x".repeat(256) })).toEqual({ jobId: "x".repeat(256) });
  });

  it("gives null for none, both, an array value, a short hash or a 257-character id", () => {
    expect(parseJobRef({})).toBeNull();
    expect(parseJobRef({ hash, id: "job-1" })).toBeNull();
    expect(parseJobRef({ hash: [hash, hash] })).toBeNull();
    expect(parseJobRef({ id: ["a", "b"] })).toBeNull();
    expect(parseJobRef({ hash: "0x12" })).toBeNull();
    expect(parseJobRef({ hash: hash + "0" })).toBeNull();
    expect(parseJobRef({ id: "" })).toBeNull();
    expect(parseJobRef({ id: "x".repeat(257) })).toBeNull();
  });
});

describe("cidHref", () => {
  it("links a CID of letters and digits only", () => {
    expect(cidHref("bafyabc123")).toBe(IPFS_GATEWAY + "bafyabc123");
    expect(IPFS_GATEWAY).toBe("https://ipfs.io/ipfs/");
  });

  it.each(["a/b", "a:b", "a b", "a.b", "a%2Fb", "", "javascript:alert(1)", "//evil.com"])("gives null for %j", (cid) => {
    expect(cidHref(cid)).toBeNull();
  });
});

describe("replaceInPages", () => {
  const job = (n, status = "submitted") => ({ burnTxHash: "0x" + String(n).repeat(64), status, jobId: null });
  const pages = () => [
    { jobs: [job(1), job(2)], nextCursor: "c2" },
    { jobs: [job(3)], nextCursor: null },
  ];

  it("swaps the job wherever its page is, keeping order", () => {
    const given = pages();
    const result = replaceInPages(given, job(3, "completed"));
    expect(result.found).toBe(true);
    expect(result.pages[1].jobs[0].status).toBe("completed");
    expect(result.pages[0].jobs.map((j) => j.burnTxHash)).toEqual([job(1).burnTxHash, job(2).burnTxHash]);
    expect(result.pages[0]).toBe(given[0]);
  });

  it("reports not found and returns the same pages untouched", () => {
    const given = pages();
    const result = replaceInPages(given, job(9));
    expect(result.found).toBe(false);
    expect(result.pages).toBe(given);
  });
});

describe("replaceInDetail", () => {
  const detail = { burnTxHash: "0x" + "1".repeat(64), status: "processing", result: { cids: ["a"] }, error: "late" };
  const event = { burnTxHash: detail.burnTxHash, status: "completed", jobId: "job-1" };

  it("updates the job fields and keeps result and error", () => {
    expect(replaceInDetail(detail, event)).toEqual({ ...detail, status: "completed", jobId: "job-1" });
  });

  it("returns a different job or a null detail unchanged", () => {
    expect(replaceInDetail(detail, { ...event, burnTxHash: "0x" + "2".repeat(64) })).toBe(detail);
    expect(replaceInDetail(null, event)).toBeNull();
    expect(replaceInDetail(undefined, event)).toBeUndefined();
  });
});

describe("searchTarget", () => {
  const hash = "0x" + "ab".repeat(32);

  it("reads a whole burn hash in any case, lowercased", () => {
    expect(searchTarget(hash)).toEqual({ burnTxHash: hash });
    expect(searchTarget("  0X" + "AB".repeat(32) + " ")).toEqual({ burnTxHash: hash });
  });

  it("reads other text as a job id and a short 0x string as a partial hash", () => {
    expect(searchTarget("job-x")).toEqual({ jobId: "job-x" });
    expect(searchTarget("0x12")).toEqual({ partialHash: "0x12" });
    expect(searchTarget(hash + "0")).toEqual({ partialHash: hash + "0" });
    expect(searchTarget("x".repeat(257))).toBeNull();
  });

  it("gives null for blank text", () => {
    expect(searchTarget("")).toBeNull();
    expect(searchTarget("   ")).toBeNull();
  });
});

describe("matchesSearch", () => {
  const job = { jobId: "Job-ABC", burnTxHash: "0x" + "ab".repeat(32) };

  it("is a case-insensitive substring test on the job id and the burn hash", () => {
    expect(matchesSearch(job, "job-a")).toBe(true);
    expect(matchesSearch(job, "ABAB")).toBe(true);
    expect(matchesSearch(job, "zzz")).toBe(false);
    expect(matchesSearch({ jobId: null, burnTxHash: job.burnTxHash }, "job")).toBe(false);
    expect(matchesSearch(job, "")).toBe(true);
  });
});
