import React from "react";
import { createHash } from "crypto";
import { render } from "@testing-library/react";
import { getSubmitStore } from "../../lib/submit/store";
import { SessionProvider } from "../../sub-components/wallet/SessionProvider";
import { makeStore } from "./session";

// Backed by a Map so a test can keep it across a "reload", record every write, or make writes fail.
export class MemoryStorage {
  constructor() {
    this.map = new Map();
    this.writes = [];
    this.failWhen = null;
    this.onWrite = null;
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWhen && this.failWhen(key, value)) {
      throw new Error("QuotaExceededError");
    }
    this.map.set(key, value);
    this.writes.push({ key, value: JSON.parse(value) });
    if (this.onWrite) {
      this.onWrite(key, JSON.parse(value));
    }
  }

  removeItem(key) {
    this.map.delete(key);
  }

  keys() {
    return [...this.map.keys()].filter((key) => key.startsWith("gnus.submit."));
  }
}

// Jest's global crypto is a stub, so the digest is Node's and keys come from a counter.
export const nodeDigest = (bytes) => Promise.resolve(createHash("sha256").update(bytes).digest().buffer);

export function counterKeys(prefix = "key") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export async function untilReady(session) {
  session.start();
  for (let i = 0; i < 100 && session.getState().phase !== "ready"; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (session.getState().phase !== "ready") {
    throw new Error(`session stuck in ${session.getState().phase}`);
  }
}

export const JOB = { name: "tiny", inputs: [], outputs: [], passes: [] };
export const JOB_TEXT = JSON.stringify(JOB);

// A submit store over makeStore from session.jsx; pass storage or provider to keep them across a reload.
export async function makeSubmit({ profile, provider, storage = new MemoryStorage(), now = () => 1000, newKey } = {}) {
  const made = makeStore(provider ? { provider } : { profile });
  await untilReady(made.store);
  const deps = { storage, now, newKey: newKey ?? counterKeys(), digest: nodeDigest };
  const submit = getSubmitStore(made.store, deps);
  return { ...made, session: made.store, submit, storage, deps };
}

export function submitCalls(provider) {
  return provider.controls.calls.filter((call) => call.method === "gnus_submitJob");
}

// Renders ui under a session whose submit store has Map-backed storage; the session starts with the provider.
export function renderWithSubmit(ui, { profile, provider, storage = new MemoryStorage(), now = () => 1000, newKey, strict = false } = {}) {
  const made = makeStore(provider ? { provider } : { profile });
  const deps = { storage, now, newKey: newKey ?? counterKeys(), digest: nodeDigest };
  const submit = getSubmitStore(made.store, deps);
  const tree = <SessionProvider store={made.store}>{ui}</SessionProvider>;
  const result = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
  return { ...result, ...made, session: made.store, submit, storage, deps };
}
