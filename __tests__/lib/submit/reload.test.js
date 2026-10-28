import React from "react";
import { screen } from "@testing-library/react";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import SubmitFlow from "../../../sub-components/submit/SubmitFlow";
import { DRAFT_PREFIX } from "../../../lib/submit/drafts";
import { JOB_TEXT, MemoryStorage, counterKeys, gated, makeSubmit, reload, renderWithSubmit, submitCalls, until } from "../../mocks/submit";

const state = (made) => made.submit.getState();
const settled = (made) => until(() => state(made).outcome?.kind !== "checking" && state(made).step !== "confirm");
const lookups = (made) => made.provider.controls.calls.filter((c) => c.method === "gnus_getJob");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function estimate(made) {
  made.submit.setText(JOB_TEXT);
  await made.submit.estimate();
}

describe("a reload at every step", () => {
  it("at review: nothing to look up, and the same job gets the same key back", async () => {
    const first = await makeSubmit({ profile: "today" });
    await estimate(first);
    const key = state(first).draft.idempotencyKey;

    const page = await reload(first);
    await settle();
    expect(lookups(page)).toHaveLength(0);
    expect(state(page).text).toBe("");
    await estimate(page);
    expect(state(page).draft.idempotencyKey).toBe(key);
    await page.submit.submit();
    expect(state(page).outcome).toMatchObject({ kind: "done" });
    expect(page.provider.controls.burnCount()).toBe(1);
  });

  it("an edited job gets a new key, and the unsent one is dropped", async () => {
    const made = await makeSubmit({ profile: "today" });
    await estimate(made);
    const first = state(made).draft.idempotencyKey;
    made.submit.setText(JSON.stringify({ inputs: [1], outputs: [], passes: [] }));
    expect(made.storage.keys()).toEqual([]);
    await made.submit.estimate();
    expect(state(made).draft.idempotencyKey).not.toBe(first);
  });

  it("during the confirm: the wallet has no record yet, a same-key submit is in flight, one burn", async () => {
    const first = await makeSubmit({ profile: "manualConfirm" });
    await estimate(first);
    const key = state(first).draft.idempotencyKey;
    first.submit.submit();
    await settle();
    expect(first.provider.controls.confirmCount()).toBe(1);

    const page = await reload(first);
    await settled(page);
    expect(lookups(page)).toHaveLength(1);
    expect(state(page)).toMatchObject({ step: "job", notSeen: true });
    expect(state(page).draft.idempotencyKey).toBe(key);

    await estimate(page);
    expect(state(page).draft.idempotencyKey).toBe(key);
    await page.submit.submit();
    expect(state(page).submitError.error.code).toBe(-32005);
    expect(page.provider.controls.confirmCount()).toBe(1);

    page.provider.controls.answerConfirm(true);
    await settle();
    await page.submit.submit();
    expect(state(page).outcome).toMatchObject({ kind: "done", burnTxHash: "0x" + "0".repeat(63) + "1" });
    expect(page.provider.controls.burnCount()).toBe(1);
  });

  it("after a lost response: the next page finds the real outcome with no click", async () => {
    const first = await makeSubmit({ profile: "manualConfirm" });
    await estimate(first);
    first.submit.submit();
    await settle();
    const second = await reload(first);
    await settled(second);
    first.provider.controls.answerConfirm(true);
    await settle();

    const third = await reload(second);
    await settled(third);
    expect(state(third).outcome).toMatchObject({ kind: "done" });
    expect(third.provider.controls.burnCount()).toBe(1);
    expect(submitCalls(third.provider)).toHaveLength(1);
  });

  it("on a result screen: it shows again, and Submit another job leaves an empty form after a reload", async () => {
    const first = await makeSubmit({ profile: "bridgedNotProcessedStatus" });
    await estimate(first);
    await first.submit.submit();
    expect(state(first).outcome.kind).toBe("paidNotProcessed");

    const second = await reload(first);
    await settled(second);
    expect(state(second).outcome).toMatchObject({ kind: "paidNotProcessed", burnTxHash: "0x" + "0".repeat(63) + "1" });
    expect(second.provider.controls.burnCount()).toBe(1);

    second.submit.startOver();
    const third = await reload(second);
    await settle();
    expect(state(third)).toMatchObject({ step: "job", text: "", outcome: null, draft: null });
    expect(lookups(third).length).toBe(lookups(second).length);
  });

  it("walletStopsMidSubmit: Waiting for GeniusWallet with the hash; Check again sends one lookup; one burn", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit" });
    await estimate(first);
    first.submit.submit();
    await settle();
    expect(first.provider.controls.burnCount()).toBe(1);

    const page = await reload(first);
    await settled(page);
    expect(state(page).outcome).toEqual({ kind: "pending", burnTxHash: "0x" + "0".repeat(63) + "1" });
    const before = lookups(page).length;
    await page.submit.checkAgain();
    expect(lookups(page)).toHaveLength(before + 1);
    expect(state(page).outcome.kind).toBe("pending");
    expect(page.provider.controls.burnCount()).toBe(1);
  });

  it("submissionOutcomeUnknown is still pending after a reload, with no hash", async () => {
    const first = await makeSubmit({ profile: "submissionOutcomeUnknown" });
    await estimate(first);
    await first.submit.submit();
    const page = await reload(first);
    await settled(page);
    expect(state(page).outcome).toEqual({ kind: "pending", burnTxHash: null });
  });
});

describe("a payment whose fate is open keeps its key until the wallet answers for good", () => {
  it("a failed check, a reload and a null lookup: the same job keeps one key and pays once", async () => {
    const first = await makeSubmit({ profile: "manualConfirm" });
    await estimate(first);
    const key = state(first).draft.idempotencyKey;
    // The submit reply is unclassifiable while the confirm stays open, and the check after it fails.
    const request = first.provider.request;
    first.provider.request = (args) => {
      if (args.method === "gnus_submitJob") {
        request(args).catch(() => {});
        return Promise.reject({ code: -32603, message: "Internal error" });
      }
      if (args.method === "gnus_getJob") {
        return Promise.reject({ code: -32005, message: "Too many requests", data: { reason: "rate_limited" } });
      }
      return request(args);
    };
    await first.submit.submit();
    expect(state(first).outcome.kind).toBe("unknown");
    expect(state(first).draft.settled).toBe(false);

    const page = await reload(first);
    await settled(page);
    expect(state(page)).toMatchObject({ step: "job", notSeen: true });
    await estimate(page);
    expect(state(page).draft.idempotencyKey).toBe(key);

    page.provider.controls.answerConfirm(true);
    await settle();
    await page.submit.submit();
    expect(state(page).outcome).toMatchObject({ kind: "done" });
    expect(page.provider.controls.burnCount()).toBe(1);
    expect(page.provider.controls.confirmCount()).toBe(1);
  });

  it("Submit another job on a pending payment keeps the key; the same job is looked up, never sent again", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit" });
    await estimate(first);
    const key = state(first).draft.idempotencyKey;
    first.submit.submit();
    await settle();
    const page = await reload(first);
    await settled(page);
    expect(state(page).outcome.kind).toBe("pending");

    page.submit.startOver();
    expect(page.storage.keys()).toEqual([`${DRAFT_PREFIX}${key}`]);
    await estimate(page);
    expect(state(page).draft.idempotencyKey).toBe(key);
    await page.submit.submit();
    expect(state(page).outcome.kind).toBe("pending");
    expect(submitCalls(page.provider)).toHaveLength(1);
    expect(page.provider.controls.burnCount()).toBe(1);
  });

  it("submission_outcome_unknown keeps the key, and the same job never pays again", async () => {
    const made = await makeSubmit({ profile: "submissionOutcomeUnknown" });
    await estimate(made);
    const key = state(made).draft.idempotencyKey;
    await made.submit.submit();
    expect(state(made).outcome.kind).toBe("outcomeUnknown");
    made.submit.startOver();
    await estimate(made);
    expect(state(made).draft.idempotencyKey).toBe(key);
    await made.submit.submit();
    expect(state(made).outcome.kind).toBe("pending");
    expect(submitCalls(made.provider)).toHaveLength(1);
  });

  it("an open payment is kept and looked up at any age", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit", now: () => 0 });
    await estimate(first);
    first.submit.submit();
    await settle();
    first.session.dispose();
    const page = await makeSubmit({
      provider: first.provider.controls.reinject(),
      storage: first.storage,
      now: () => 30 * 24 * 60 * 60 * 1000,
    });
    await settled(page);
    expect(page.storage.keys()).toHaveLength(1);
    expect(state(page).outcome.kind).toBe("pending");
  });

  it("a definitive answer retires the key: the same job gets a new one", async () => {
    const made = await makeSubmit({ profile: "today" });
    await estimate(made);
    const key = state(made).draft.idempotencyKey;
    await made.submit.submit();
    expect(state(made).draft.settled).toBe(true);
    made.submit.startOver();
    await estimate(made);
    expect(state(made).draft.idempotencyKey).not.toBe(key);
  });
});

describe("a spent payment never drops off the screen", () => {
  it("a newer estimate that was never paid does not hide an older payment from the reload", async () => {
    const first = await makeSubmit({ profile: "manualConfirm", now: () => 1000 });
    await estimate(first);
    first.submit.submit();
    await settle();
    first.session.dispose();
    const second = await makeSubmit({ provider: first.provider.controls.reinject(), storage: first.storage, now: () => 2000, newKey: counterKeys("second") });
    await settled(second);
    expect(state(second).notSeen).toBe(true);
    second.provider.controls.answerConfirm(true);
    await settle();

    second.submit.setText(JSON.stringify({ name: "other", inputs: [], outputs: [], passes: [] }));
    await second.submit.estimate();
    expect(state(second).draft.sentAt).toBeNull();
    const third = await reload(second);
    await settled(third);
    expect(state(third).outcome).toMatchObject({ kind: "done", burnTxHash: "0x" + "0".repeat(63) + "1" });
    expect(third.provider.controls.burnCount()).toBe(1);
  });

  it("a new paying wallet or EVM chain keeps Paid but not processed and its burn hash", async () => {
    const made = await makeSubmit({ profile: "bridgedNotProcessedStatus" });
    await estimate(made);
    await made.submit.submit();
    const shown = state(made).outcome;
    expect(shown.kind).toBe("paidNotProcessed");

    const accounts = made.session.getState().accounts;
    made.provider.controls.emit("gnus_accountsChanged", {
      ...accounts,
      payer: { ...accounts.payer, evmAddress: "0x" + "b2".repeat(20) },
    });
    expect(made.session.getState().accounts.payer.evmAddress).toBe("0x" + "b2".repeat(20));
    made.provider.controls.setNetwork({ sdk: accounts.network.sdk, evmChainId: 137 });
    await settle();
    expect(state(made).outcome).toEqual(shown);
    expect(state(made).draft.chainId).toBe(accounts.network.evmChainId);
  });

  it("a new paying wallet during a check does not leave the page on Checking", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit" });
    await estimate(first);
    first.submit.submit();
    await settle();
    first.session.dispose();
    const provider = first.provider.controls.reinject();
    const release = gated(provider, "gnus_getJob");
    const page = await makeSubmit({ provider, storage: first.storage });
    expect(state(page).outcome.kind).toBe("checking");
    const accounts = page.session.getState().accounts;
    provider.controls.emit("gnus_accountsChanged", { ...accounts, payer: { ...accounts.payer, evmAddress: "0x" + "b2".repeat(20) } });
    expect(page.session.getState().accounts.payer.evmAddress).toBe("0x" + "b2".repeat(20));
    expect(state(page).outcome.kind).toBe("checking");
    release();
    await settled(page);
    expect(state(page).outcome.kind).toBe("pending");
  });

  it("switching back to the node account shows its open payment again", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit" });
    await estimate(first);
    first.submit.submit();
    await settle();
    const made = await reload(first);
    await settled(made);
    expect(state(made).outcome.kind).toBe("pending");
    const accounts = made.session.getState().accounts;
    made.provider.controls.emit("gnus_accountsChanged", {
      ...accounts,
      node: { ...accounts.node, sdkAddress: "0x" + "c3".repeat(64) },
    });
    await settle();
    expect(state(made).outcome).toBeNull();
    made.provider.controls.emit("gnus_accountsChanged", accounts);
    await settled(made);
    expect(state(made).outcome).toMatchObject({ kind: "pending", burnTxHash: "0x" + "0".repeat(63) + "1" });
  });
});

describe("identity", () => {
  it("a switched node account does not see the old account's result, and its draft is not restored", async () => {
    const made = await makeSubmit({ profile: "bridgedNotProcessedStatus" });
    await estimate(made);
    const first = state(made).draft.idempotencyKey;
    await made.submit.submit();
    expect(state(made).outcome.kind).toBe("paidNotProcessed");

    made.provider.controls.switchAccount();
    await settle();
    expect(state(made).outcome).toBeNull();

    const page = await reload(made);
    await settle();
    expect(state(page)).toMatchObject({ outcome: null, draft: null, step: "job" });
    expect(lookups(page)).toHaveLength(0);

    await estimate(page);
    expect(state(page).draft.idempotencyKey).not.toBe(first);
  });

  it("the same job under a switched account gets a new key before anything is sent", async () => {
    const made = await makeSubmit({ profile: "today" });
    await estimate(made);
    const first = state(made).draft.idempotencyKey;
    made.provider.controls.switchAccount();
    expect(state(made).estimate.status).toBe("idle");
    await made.submit.estimate();
    expect(state(made).draft.idempotencyKey).not.toBe(first);
  });
});

describe("expiry", () => {
  it("drops a draft older than 23 h at page start", async () => {
    const first = await makeSubmit({ profile: "bridgedNotProcessedStatus", now: () => 0 });
    await estimate(first);
    await first.submit.submit();
    first.session.dispose();
    const page = await makeSubmit({
      provider: first.provider.controls.reinject(),
      storage: first.storage,
      now: () => 24 * 60 * 60 * 1000,
    });
    await settle();
    expect(page.storage.keys()).toEqual([]);
    expect(state(page).outcome).toBeNull();
  });
});

describe("StrictMode", () => {
  it("sends one gnus_getJob for a sent draft", async () => {
    const first = await makeSubmit({ profile: "walletStopsMidSubmit" });
    await estimate(first);
    first.submit.submit();
    await settle();
    first.session.dispose();
    const provider = first.provider.controls.reinject();
    const view = renderWithSubmit(<SubmitFlow />, { provider, storage: first.storage, strict: true });
    expect(await screen.findByRole("heading", { level: 2, name: "Waiting for GeniusWallet" })).toBeInTheDocument();
    expect(lookups({ provider })).toHaveLength(1);
    expect(view.storage.getItem(`${DRAFT_PREFIX}key-1`)).not.toBeNull();
  });
});
