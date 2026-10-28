import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { insufficient, submitBlocker } from "../../../lib/submit/store";
import { JOB_TEXT, failing, gated, makeSubmit } from "../../mocks/submit";

async function estimated(options) {
  const made = await makeSubmit(options);
  made.submit.setText(JOB_TEXT);
  await made.submit.estimate();
  return made;
}

const estimateCalls = (provider) => provider.controls.calls.filter((call) => call.method === "gnus_estimate");

describe("estimate states", () => {
  it("sends nothing for a second estimate while one is in flight", async () => {
    const provider = createMockProvider({ profile: "today" });
    const release = gated(provider, "gnus_estimate");
    const made = await makeSubmit({ provider });
    made.submit.setText(JOB_TEXT);
    const first = made.submit.estimate();
    await made.submit.estimate();
    release();
    await first;
    expect(estimateCalls(provider)).toHaveLength(1);
  });

  it("costUnavailable is an error that blocks submit, with the wallet's reason when sent", async () => {
    const made = await estimated({ profile: "costUnavailable" });
    const { estimate } = made.submit.getState();
    expect(estimate).toMatchObject({ status: "error", error: { code: -32010 } });
    expect(submitBlocker(made.submit.getState(), made.session)).not.toBeNull();

    const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", {
      code: -32010,
      message: "Cost unavailable",
      data: { reason: "ca_bundle" },
    });
    const withReason = await estimated({ provider });
    expect(withReason.submit.getState().estimate.error.reason).toBe("ca_bundle");
  });

  it("insufficientBalance is ready but blocks submit", async () => {
    const made = await estimated({ profile: "insufficientBalance" });
    const { estimate } = made.submit.getState();
    expect(estimate.status).toBe("ready");
    expect(insufficient(estimate.estimate)).toBe(true);
    expect(submitBlocker(made.submit.getState(), made.session)).toBe("");
  });

  it("compares above 2^53 exactly", () => {
    expect(insufficient({ cost: "9007199254740993", balance: "9007199254740992" })).toBe(true);
    expect(insufficient({ cost: "9007199254740992", balance: "9007199254740993" })).toBe(false);
    expect(insufficient({ cost: "5", balance: null })).toBe(false);
  });

  it("today allows submit", async () => {
    const made = await estimated({ profile: "today" });
    expect(submitBlocker(made.submit.getState(), made.session)).toBeNull();
  });

  it("allNulls keeps gas and balance null, and the button explains the missing paying wallet", async () => {
    const made = await estimated({ profile: "allNulls" });
    const { estimate } = made.submit.getState();
    expect(estimate.status).toBe("ready");
    expect(estimate.estimate).toMatchObject({ gas: null, balance: null });
    expect(submitBlocker(made.submit.getState(), made.session)).toBe(
      "There is no paying wallet in GeniusWallet. Add one first.",
    );
  });

  it("payerCannotSign names the wallet's reason, not no_wallet", async () => {
    const made = await estimated({ profile: "payerCannotSign" });
    expect(submitBlocker(made.submit.getState(), made.session)).toBe(
      "The paying wallet cannot sign. Pick a wallet with a key in GeniusWallet.",
    );
  });

  it("bridgeUnavailable shows the wallet-table message", async () => {
    const made = await estimated({ profile: "bridgeUnavailable" });
    expect(made.submit.getState().estimate.error.message).toBe(
      "Not available on this network. Switch the network in GeniusWallet.",
    );
  });

  it("keeps a -32602 message for display next to errors.ts's words", async () => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", {
      code: -32602,
      message: "inputs[0].type is required",
    });
    const made = await estimated({ provider });
    const { error } = made.submit.getState().estimate;
    expect(error.message).toBe("GeniusWallet rejected the request. Check the job and try again.");
    expect(error.wireMessage).toBe("inputs[0].type is required");
  });

  it("drops the estimate when the text changes and says the job changed", async () => {
    const made = await estimated({ profile: "today" });
    made.submit.setText(JOB_TEXT + " ");
    expect(made.submit.getState().estimate.status).toBe("stale");
    expect(made.submit.getState().draft).toBeNull();
    expect(submitBlocker(made.submit.getState(), made.session)).toBe("");
    await made.submit.estimate();
    expect(made.submit.getState().estimate.status).toBe("ready");
  });

  it("drops the estimate when the identity changes", async () => {
    const made = await estimated({ profile: "today" });
    made.provider.controls.switchAccount();
    expect(made.submit.getState().estimate.status).toBe("idle");
  });

  it.each([
    [4100, "denied"],
    [4900, "startingUp"],
  ])("reports %i from an estimate to the session", async (code, phase) => {
    const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", { code, message: "x" });
    const made = await estimated({ provider });
    expect(made.session.getState().phase).toBe(phase);
  });

  it("does not move the session for -32603 or 4001", async () => {
    for (const code of [-32603, 4001]) {
      const provider = failing(createMockProvider({ profile: "today" }), "gnus_estimate", { code, message: "x" });
      const made = await estimated({ provider });
      expect(made.session.getState().phase).toBe("ready");
      expect(made.submit.getState().estimate.status).toBe("error");
    }
  });
});
