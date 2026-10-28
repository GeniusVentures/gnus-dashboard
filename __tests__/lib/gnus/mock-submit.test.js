import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { jobLookupSchema } from "../../../lib/gnus/schema";

const JOB = { name: "tiny", inputs: [], outputs: [], passes: [] };
const submit = (provider, key = "k1", job = JOB) =>
  provider.request({ method: "gnus_submitJob", params: { job, idempotencyKey: key } });
const lookup = (provider, key) => provider.request({ method: "gnus_getJob", params: { idempotencyKey: key } });
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("manualConfirm", () => {
  it("holds the call open until the test answers, then submits and burns once", async () => {
    const provider = createMockProvider({ profile: "manualConfirm" });
    let done = false;
    const call = submit(provider).then((result) => {
      done = true;
      return result;
    });
    await settle();
    expect(done).toBe(false);
    expect(provider.controls.confirmCount()).toBe(1);
    provider.controls.answerConfirm(true);
    await expect(call).resolves.toMatchObject({ status: "submitted" });
    expect(provider.controls.burnCount()).toBe(1);
  });

  it("rejects with 4001 on reject, burns nothing, and a same-key retry opens a new confirm", async () => {
    const provider = createMockProvider({ profile: "manualConfirm" });
    const first = submit(provider);
    await settle();
    provider.controls.answerConfirm(false);
    await expect(first).rejects.toMatchObject({ code: 4001 });
    expect(provider.controls.burnCount()).toBe(0);
    const second = submit(provider);
    await settle();
    expect(provider.controls.confirmCount()).toBe(2);
    provider.controls.answerConfirm(true);
    await expect(second).resolves.toMatchObject({ status: "submitted" });
    expect(provider.controls.burnCount()).toBe(1);
  });

  it("throws when no confirm is open", () => {
    const provider = createMockProvider({ profile: "manualConfirm" });
    expect(() => provider.controls.answerConfirm(true)).toThrow(/no open confirm/);
  });

  it("counts confirms on every profile, none before a submit", async () => {
    const provider = createMockProvider({ profile: "today" });
    expect(provider.controls.confirmCount()).toBe(0);
    await submit(provider);
    expect(provider.controls.confirmCount()).toBe(1);
  });

  it("is aborted by a node account switch (-32015) and by a revoke (4100)", async () => {
    const switched = createMockProvider({ profile: "manualConfirm" });
    const first = submit(switched);
    await settle();
    switched.controls.switchAccount();
    await expect(first).rejects.toMatchObject({ code: -32015, data: { reason: "account_changed" } });
    expect(() => switched.controls.answerConfirm(true)).toThrow();

    const revoked = createMockProvider({ profile: "manualConfirm" });
    const second = submit(revoked);
    await settle();
    revoked.controls.revokeOrigin();
    await expect(second).rejects.toMatchObject({ code: 4100 });
    expect(revoked.controls.burnCount()).toBe(0);
  });

  it("answers a same-key submit with submit_in_flight while the confirm is open, without a second confirm", async () => {
    const provider = createMockProvider({ profile: "manualConfirm" });
    const first = submit(provider);
    await settle();
    await expect(submit(provider)).rejects.toMatchObject({ code: -32005, data: { reason: "submit_in_flight" } });
    expect(provider.controls.confirmCount()).toBe(1);
    provider.controls.answerConfirm(true);
    await first;
  });
});

describe("submit intents", () => {
  it("answers null for the key before the confirm is answered", async () => {
    const provider = createMockProvider({ profile: "manualConfirm" });
    const call = submit(provider);
    await settle();
    await expect(lookup(provider, "k1")).resolves.toBeNull();
    provider.controls.answerConfirm(true);
    await call;
  });

  it("walletStopsMidSubmit: never answers, burns once, reads back as pending, then refuses a second burn", async () => {
    const provider = createMockProvider({ profile: "walletStopsMidSubmit" });
    let settled = false;
    submit(provider).then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await settle();
    await settle();
    expect(settled).toBe(false);
    expect(provider.controls.burnCount()).toBe(1);

    const pending = await lookup(provider, "k1");
    const parsed = jobLookupSchema.parse(pending);
    expect(parsed).toMatchObject({ status: "pending", jobId: null, result: null });
    expect(parsed.burnTxHash).toBe("0x" + "0".repeat(63) + "1");

    const again = await submit(provider).catch((err) => err);
    expect(again).toMatchObject({ code: -32603, data: { reason: "submission_outcome_unknown" } });
    expect(again.data).toMatchObject({
      idempotencyKey: "k1",
      burnTxHash: parsed.burnTxHash,
      sdkAddress: parsed.sdkAddress,
      cost: parsed.cost,
    });
    expect(again.data.payer).toMatch(/^0x[0-9a-f]{40}$/);
    expect(again.data.createdAt).toBe(parsed.submittedAt);
    const other = await submit(provider, "k1", { ...JOB, name: "other" }).catch((err) => err);
    expect(other).toMatchObject({ code: -32602, data: { reason: "idempotency_key_reused" } });
    expect(provider.controls.burnCount()).toBe(1);
  });

  it("frees the in-flight slot after the wallet stops, as after a restart", async () => {
    const provider = createMockProvider({ profile: "walletStopsMidSubmit" });
    submit(provider, "k1").catch(() => {});
    await settle();
    let refused = null;
    submit(provider, "k2").catch((err) => {
      refused = err;
    });
    await settle();
    expect(refused).toBeNull();
    expect(provider.controls.burnCount()).toBe(2);
  });

  it("resolves the intent after a normal submit: getJob by key answers the job, not pending", async () => {
    const provider = createMockProvider({ profile: "today" });
    await submit(provider);
    const found = await lookup(provider, "k1");
    expect(found.status).toBe("submitted");
    expect(found.burnTxHash).toBe("0x" + "0".repeat(63) + "1");
  });

  it("submissionOutcomeUnknown leaves a pending record with no burn hash", async () => {
    const provider = createMockProvider({ profile: "submissionOutcomeUnknown" });
    await expect(submit(provider)).rejects.toMatchObject({ code: -32603, data: { reason: "submission_outcome_unknown" } });
    const pending = jobLookupSchema.parse(await lookup(provider, "k1"));
    expect(pending).toMatchObject({ status: "pending", burnTxHash: null });
    expect(provider.controls.burnCount()).toBe(0);
  });

  it("keeps an unresolved intent across reinject, as the wallet does across a page reload", async () => {
    const provider = createMockProvider({ profile: "walletStopsMidSubmit" });
    submit(provider).catch(() => {});
    await settle();
    const reloaded = provider.controls.reinject();
    expect(jobLookupSchema.parse(await lookup(reloaded, "k1"))).toMatchObject({ status: "pending" });
  });
});
