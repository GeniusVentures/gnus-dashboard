import {
  DRAFT_TTL_MS,
  createDraft,
  findReusable,
  listDrafts,
  markSent,
  markSettled,
  newestFor,
  prune,
  randomKey,
  removeIfUnsent,
} from "../../../lib/submit/drafts";
import { MemoryStorage } from "../../mocks/submit";

const NODE = "0x" + "a1".repeat(64);
const OTHER_NODE = "0x" + "a2".repeat(64);
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HOUR = 60 * 60 * 1000;

const make = (storage, key, over = {}) =>
  createDraft(storage, {
    idempotencyKey: key,
    sdkAddress: NODE,
    sdkNetwork: "staging",
    jobHash: HASH_A,
    label: "Job",
    createdAt: 1000,
    ...over,
  });
const identity = { sdkAddress: NODE, sdkNetwork: "staging" };

describe("findReusable", () => {
  it("finds the unsettled draft with the same identity and job hash", () => {
    const storage = new MemoryStorage();
    make(storage, "k1");
    expect(findReusable(storage, identity, HASH_A).idempotencyKey).toBe("k1");
  });

  it("gives null for another job, address, network, or a settled draft", () => {
    const storage = new MemoryStorage();
    const settled = make(storage, "k1");
    markSettled(storage, settled);
    expect(findReusable(storage, identity, HASH_A)).toBeNull();
    make(storage, "k2");
    expect(findReusable(storage, identity, HASH_B)).toBeNull();
    expect(findReusable(storage, { ...identity, sdkAddress: OTHER_NODE }, HASH_A)).toBeNull();
    expect(findReusable(storage, { ...identity, sdkNetwork: "mainnet" }, HASH_A)).toBeNull();
  });

  it("keeps a sent but unsettled draft reusable: a reload during the confirm must not mint a second key", () => {
    const storage = new MemoryStorage();
    markSent(storage, make(storage, "k1"), 80002, 2000);
    expect(findReusable(storage, identity, HASH_A).idempotencyKey).toBe("k1");
  });

  it("prefers the newest of several", () => {
    const storage = new MemoryStorage();
    make(storage, "old", { createdAt: 1 });
    make(storage, "new", { createdAt: 2 });
    expect(findReusable(storage, identity, HASH_A).idempotencyKey).toBe("new");
  });
});

describe("prune", () => {
  it("removes drafts past 23 h counted from sentAt else createdAt, and keeps one at 22 h", () => {
    const storage = new MemoryStorage();
    make(storage, "unsent-old", { createdAt: 0 });
    make(storage, "unsent-new", { createdAt: 3 * HOUR });
    markSent(storage, make(storage, "sent-recent", { createdAt: 0 }), null, 3 * HOUR);
    const now = 24 * HOUR + 1;
    prune(storage, now);
    expect(listDrafts(storage).map((d) => d.idempotencyKey).sort()).toEqual(["sent-recent", "unsent-new"]);
    prune(storage, 3 * HOUR + 22 * HOUR);
    expect(storage.keys()).toHaveLength(2);
    prune(storage, 3 * HOUR + DRAFT_TTL_MS + 1);
    expect(storage.keys()).toEqual([]);
  });

  it("removes entries that are not JSON or fail the schema and leaves other keys alone", () => {
    const storage = new MemoryStorage();
    storage.map.set("gnus.submit.junk", "{not json");
    storage.map.set("gnus.submit.wrong", JSON.stringify({ v: 2 }));
    storage.map.set("gnus.submit.mismatch", JSON.stringify({ ...make(new MemoryStorage(), "other"), v: 1 }));
    storage.map.set("theme", "dark");
    make(storage, "good");
    prune(storage, 2000);
    expect([...storage.map.keys()].sort()).toEqual(["gnus.submit.good", "theme"]);
  });
});

describe("newestFor", () => {
  it("gives the identity's newest draft by createdAt and ignores other identities", () => {
    const storage = new MemoryStorage();
    make(storage, "a1", { createdAt: 1 });
    make(storage, "a2", { createdAt: 5 });
    make(storage, "b9", { createdAt: 9, sdkAddress: OTHER_NODE });
    expect(newestFor(storage, identity).idempotencyKey).toBe("a2");
    expect(newestFor(storage, { sdkAddress: OTHER_NODE, sdkNetwork: "staging" }).idempotencyKey).toBe("b9");
    expect(newestFor(storage, { sdkAddress: NODE, sdkNetwork: "mainnet" })).toBeNull();
  });
});

describe("removeIfUnsent", () => {
  it("removes a never-sent draft and keeps a sent one", () => {
    const storage = new MemoryStorage();
    const unsent = make(storage, "u");
    const sent = markSent(storage, make(storage, "s"), 1, 5);
    removeIfUnsent(storage, unsent);
    removeIfUnsent(storage, sent);
    expect(storage.keys()).toEqual(["gnus.submit.s"]);
  });
});

describe("storage that cannot be used", () => {
  it("a failing write gives null and nothing saved", () => {
    const storage = new MemoryStorage();
    storage.failWhen = () => true;
    expect(make(storage, "k")).toBeNull();
  });

  it("reads tolerate Jest's localStorage stub, which answers undefined", () => {
    const stub = { getItem: () => undefined, setItem() {}, removeItem() {}, key: () => undefined, length: 0 };
    expect(listDrafts(stub)).toEqual([]);
    expect(findReusable(stub, identity, HASH_A)).toBeNull();
  });
});

describe("randomKey", () => {
  const original = globalThis.crypto;
  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
  });

  it("uses crypto.randomUUID when present", () => {
    Object.defineProperty(globalThis, "crypto", { value: { randomUUID: () => "fixed" }, configurable: true });
    expect(randomKey()).toBe("fixed");
  });

  it("builds a version 4 UUID from getRandomValues otherwise", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: { getRandomValues: (bytes) => bytes.fill(255) },
      configurable: true,
    });
    for (let i = 0; i < 3; i += 1) {
      expect(randomKey()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
});
