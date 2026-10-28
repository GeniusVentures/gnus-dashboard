import { JOB_STATUSES } from "../../lib/gnus/schema";
import { IPFS_GATEWAY, STATUS_TEXT, cidHref, isFinal, isMarked, parseJobRef, shortJobId } from "../../lib/jobs";

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
