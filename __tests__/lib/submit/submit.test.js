import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { submitBlocker } from "../../../lib/submit/store";
import { JOB_TEXT, failing, gated, makeSubmit, submitCalls } from "../../mocks/submit";

async function ready(options) {
  const made = await makeSubmit(options);
  made.submit.setText(JOB_TEXT);
  await made.submit.estimate();
  return made;
}

const state = (made) => made.submit.getState();
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const wire = (code, reason, extra) => ({ code, message: "wallet text", data: reason ? { reason, ...extra } : undefined });

// The wallet answers a submit with garbage after really processing it, so the page cannot tell what happened.
function garbledSubmit(provider) {
  const request = provider.request;
  provider.request = async (args) => {
    const reply = await request(args);
    return args.method === "gnus_submitJob" ? { nonsense: true } : reply;
  };
  return provider;
}

function lookupAnswers(provider, answer) {
  const request = provider.request;
  provider.request = (args) => {
    if (args.method === "gnus_getJob") {
      provider.lookups = (provider.lookups ?? 0) + 1;
      return typeof answer === "function" ? answer(args) : Promise.resolve(answer);
    }
    return request(args);
  };
}

describe("the confirm", () => {
  it("waits with no timeout and ends on Job submitted when answered", async () => {
    const made = await ready({ profile: "manualConfirm" });
    jest.useFakeTimers();
    try {
      const pending = made.submit.submit();
      await Promise.resolve();
      expect(state(made).step).toBe("confirm");
      jest.advanceTimersByTime(10 * 60 * 1000);
      await Promise.resolve();
      expect(state(made).step).toBe("confirm");
      expect(made.session.getState().phase).toBe("ready");
      made.submit.showCancelNote();
      expect(state(made).cancelNote).toBe(true);
      made.provider.controls.answerConfirm(true);
      await pending;
    } finally {
      jest.useRealTimers();
    }
    expect(state(made).outcome).toMatchObject({ kind: "done" });
    expect(made.provider.controls.burnCount()).toBe(1);
  });

  it("a rejected confirm returns to the job with the same key and nothing spent", async () => {
    const made = await ready({ profile: "rejectConfirm" });
    const key = state(made).draft.idempotencyKey;
    await made.submit.submit();
    expect(state(made).step).toBe("job");
    expect(state(made).submitError).toMatchObject({ error: { code: 4001 }, nothingSpentLine: true });
    expect(state(made).draft.idempotencyKey).toBe(key);
    expect(state(made).text).toBe(JOB_TEXT);
    expect(submitBlocker(state(made), made.session)).toBeNull();
    expect(made.session.getState().phase).toBe("ready");
  });

  it("confirm_open is shown without the nothing-spent line and the page never retries", async () => {
    const made = await ready({ profile: "confirmOpen" });
    await made.submit.submit();
    expect(state(made).submitError).toMatchObject({ error: { code: -32005 }, nothingSpentLine: false });
    expect(submitCalls(made.provider)).toHaveLength(1);
    expect(made.session.getState().phase).toBe("ready");
  });

  it("revoking the origin during a confirm moves the session to denied with nothing burned", async () => {
    const made = await ready({ profile: "manualConfirm" });
    const pending = made.submit.submit();
    await settle();
    made.provider.controls.revokeOrigin();
    await pending;
    expect(made.session.getState().phase).toBe("denied");
    expect(made.provider.controls.burnCount()).toBe(0);
  });
});

describe("outcomes from the wallet's own replies", () => {
  it.each([
    ["bridgedNotProcessedStatus", "paidNotProcessed"],
    ["bridgedNotProcessedError", "paidNotProcessed"],
    ["unconfirmedSubmit", "unconfirmed"],
    ["submissionOutcomeUnknown", "outcomeUnknown"],
  ])("%s ends on %s", async (profile, kind) => {
    const made = await ready({ profile });
    await made.submit.submit();
    expect(state(made).outcome.kind).toBe(kind);
    expect(state(made).draft.settled).toBe(true);
    expect(submitCalls(made.provider)).toHaveLength(1);
  });

  it("both paid-but-not-processed shapes carry the burn hash", async () => {
    for (const profile of ["bridgedNotProcessedStatus", "bridgedNotProcessedError"]) {
      const made = await ready({ profile });
      await made.submit.submit();
      expect(state(made).outcome.burnTxHash).toBe("0x" + "0".repeat(63) + "1");
    }
  });

  it("populated shows the job id", async () => {
    const made = await ready({ profile: "populated" });
    await made.submit.submit();
    expect(state(made).outcome).toMatchObject({ kind: "done", jobId: "job-1" });
  });

  it("a nothing-spent bridge failure says so once and keeps the key", async () => {
    const made = await ready({ profile: "bridgeFailed" });
    await made.submit.submit();
    expect(state(made).submitError).toMatchObject({ error: { code: -32013 }, nothingSpentLine: false });
    expect(made.provider.controls.burnCount()).toBe(0);
  });
});

describe("nothing-spent faults", () => {
  it.each([
    [wire(-32011, undefined), "Not enough GNUS to pay for this job.", true],
    [wire(-32012, "view_only"), "The paying wallet is view-only and cannot sign.", true],
    [wire(-32013, "bridge_unavailable"), "Not available on this network. Switch the network in GeniusWallet.", true],
    [wire(-32015, "account_changed"), "Your account changed while the confirm was open. Nothing was spent.", false],
  ])("%j", async (fault, message, line) => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_submitJob", fault);
    const made = await ready({ provider });
    await made.submit.submit();
    expect(state(made).submitError.error.message).toBe(message);
    expect(state(made).submitError.nothingSpentLine).toBe(line);
    expect(state(made).step).toBe("job");
  });

  it("4900 also moves the session to starting up", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_submitJob", wire(4900));
    const made = await ready({ provider });
    await made.submit.submit();
    expect(made.session.getState().phase).toBe("startingUp");
  });

  it("idempotency_key_reused offers a new key, saved, and drops the old draft", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_submitJob", wire(-32602, "idempotency_key_reused"));
    const made = await ready({ provider });
    await made.submit.submit();
    expect(state(made).submitError.newKey).toBe(true);
    expect(made.storage.keys()).toEqual([]);
    expect(submitBlocker(state(made), made.session)).toBe("");
    made.submit.newKey();
    expect(state(made).draft.idempotencyKey).toBe("key-2");
    expect(made.storage.keys()).toEqual(["gnus.submit.key-2"]);
    expect(state(made).submitError).toBeNull();
    expect(submitBlocker(state(made), made.session)).toBeNull();
  });
});

describe("an unknown fate is looked up by key", () => {
  it("shows Checking, then the real record", async () => {
    const provider = garbledSubmit(createMockProvider({ profile: "today" }));
    const release = gated(provider, "gnus_getJob");
    const made = await ready({ provider });
    const pending = made.submit.submit();
    await settle();
    await settle();
    expect(state(made).outcome).toEqual({ kind: "checking" });
    release();
    await pending;
    expect(state(made).outcome).toMatchObject({ kind: "done" });
    expect(submitCalls(provider)).toHaveLength(1);
    expect(provider.controls.calls.filter((c) => c.method === "gnus_getJob")[0].params).toEqual({
      idempotencyKey: "key-1",
    });
  });

  it("a pending record shows Waiting; a failed lookup shows unknown; Check again asks once more", async () => {
    const provider = garbledSubmit(createMockProvider({ profile: "today" }));
    lookupAnswers(provider, { status: "pending", jobId: null, burnTxHash: null, sdkAddress: null, origin: null, idempotencyKey: "key-1", submittedAt: null, cost: null, result: null });
    const made = await ready({ provider });
    await made.submit.submit();
    expect(state(made).outcome).toEqual({ kind: "pending", burnTxHash: null });

    lookupAnswers(provider, () => Promise.reject({ code: -32603, message: "x" }));
    await made.submit.checkAgain();
    expect(state(made).outcome.kind).toBe("unknown");
    const before = provider.lookups;
    lookupAnswers(provider, null);
    await made.submit.checkAgain();
    expect(provider.lookups).toBe(before + 1);
    expect(state(made).step).toBe("job");
    expect(state(made).notSeen).toBe(true);
    expect(submitCalls(provider)).toHaveLength(1);
  });

  it("a record that was never seen puts the job back with the same, unsettled key", async () => {
    const provider = garbledSubmit(createMockProvider({ profile: "today" }));
    lookupAnswers(provider, null);
    const made = await ready({ provider });
    await made.submit.submit();
    expect(state(made).notSeen).toBe(true);
    expect(state(made).draft).toMatchObject({ idempotencyKey: "key-1", settled: false });
  });
});

describe("startOver", () => {
  it("removes the draft and clears the form", async () => {
    const made = await ready({ profile: "today" });
    await made.submit.submit();
    made.submit.startOver();
    expect(state(made).text).toBe("");
    expect(state(made).outcome).toBeNull();
    expect(made.storage.keys()).toEqual([]);
  });
});
