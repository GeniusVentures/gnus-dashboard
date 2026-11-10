import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { SAVE_FAILED, getSubmitStore } from "../../../lib/submit/store";
import { JOB_TEXT, MemoryStorage, makeSubmit, submitCalls } from "../../mocks/submit";

async function estimated(options) {
  const made = await makeSubmit(options);
  made.submit.setText(JOB_TEXT);
  await made.submit.estimate();
  return made;
}

describe("submit store spend guarantees", () => {
  it("saves the draft with sentAt before gnus_submitJob reaches the wallet, and sends the stored key", async () => {
    const storage = new MemoryStorage();
    let providerRef;
    const sentAtWrites = [];
    storage.onWrite = (key, draft) => {
      if (draft.sentAt !== null) {
        sentAtWrites.push({ key, submitCallsSoFar: submitCalls(providerRef).length });
      }
    };
    const made = await estimated({ profile: "today", storage });
    providerRef = made.provider;
    await made.submit.submit();
    expect(sentAtWrites[0]).toEqual({ key: "gnus.submit.key-1", submitCallsSoFar: 0 });
    const [call] = submitCalls(made.provider);
    expect(call.params.idempotencyKey).toBe("key-1");
    expect(made.submit.getState().outcome).toMatchObject({ kind: "done", jobId: null });
    expect(made.submit.getState().draft).toMatchObject({ sentAt: 1000, chainId: 80002, settled: true });
  });

  it("stores a hash and a label, never the job text", async () => {
    const made = await estimated({ profile: "today" });
    const raw = made.storage.getItem("gnus.submit.key-1");
    expect(JSON.parse(raw)).toMatchObject({ v: 1, idempotencyKey: "key-1", label: "tiny", sentAt: null, settled: false });
    expect(JSON.parse(raw).jobHash).toMatch(/^[0-9a-f]{64}$/);
    expect(raw).not.toContain("passes");
  });

  it("sends nothing when the sentAt write fails, and says why", async () => {
    const made = await estimated({ profile: "today" });
    made.storage.failWhen = (key, value) => JSON.parse(value).sentAt !== null;
    await made.submit.submit();
    expect(submitCalls(made.provider)).toHaveLength(0);
    expect(made.submit.getState().saveError).toBe(SAVE_FAILED);
    expect(made.submit.getState().step).toBe("job");
    expect(made.provider.controls.burnCount()).toBe(0);
  });

  it("refuses to enable submit when the draft could not be saved", async () => {
    const storage = new MemoryStorage();
    storage.failWhen = () => true;
    const made = await estimated({ profile: "today", storage });
    expect(made.submit.getState().draft).toBeNull();
    expect(made.submit.getState().saveError).toBe(SAVE_FAILED);
    await made.submit.submit();
    expect(submitCalls(made.provider)).toHaveLength(0);
  });

  it("sends one gnus_submitJob for two submit() calls in a row", async () => {
    const made = await estimated({ profile: "today" });
    await Promise.all([made.submit.submit(), made.submit.submit()]);
    expect(submitCalls(made.provider)).toHaveLength(1);
    expect(made.provider.controls.burnCount()).toBe(1);
  });

  describe("an estimate reply that arrives late", () => {
    function gated() {
      const provider = createMockProvider({ profile: "today" });
      const request = provider.request;
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      provider.request = async (args) => {
        if (args.method === "gnus_estimate") {
          await gate;
        }
        return request(args);
      };
      return { provider, release };
    }

    it("is not shown after setText", async () => {
      const { provider, release } = gated();
      const made = await makeSubmit({ provider });
      made.submit.setText(JOB_TEXT);
      const pending = made.submit.estimate();
      expect(made.submit.getState().estimate.status).toBe("loading");
      made.submit.setText(JSON.stringify({ inputs: [1], outputs: [], passes: [] }));
      release();
      await pending;
      expect(made.submit.getState().estimate.status).toBe("idle");
      expect(made.submit.getState().draft).toBeNull();
      expect(made.storage.keys()).toEqual([]);
    });

    it("is not shown after the node account switches", async () => {
      const { provider, release } = gated();
      const made = await makeSubmit({ provider });
      made.submit.setText(JOB_TEXT);
      const pending = made.submit.estimate();
      provider.controls.switchAccount();
      release();
      await pending;
      expect(made.submit.getState().estimate.status).toBe("idle");
      expect(made.storage.keys()).toEqual([]);
    });
  });

  it("gives one store per session store", async () => {
    const made = await makeSubmit({ profile: "today" });
    expect(getSubmitStore(made.session, made.deps)).toBe(getSubmitStore(made.session));
  });
});
