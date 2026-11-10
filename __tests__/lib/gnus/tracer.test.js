import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { createInjectedTransport } from "../../../lib/gnus/transport/injected";
import { detectTransport, WALLET_WAIT_MS } from "../../../lib/gnus/transport/select";
import { createGnusClient } from "../../../lib/gnus/client";
import { GnusError, GnusContractMismatchError } from "../../../lib/gnus/errors";

function makeWindow(gnus) {
  const win = new EventTarget();
  if (gnus) {
    win.gnus = gnus;
  }
  return win;
}

function detectEnv(win) {
  return {
    userAgent: "test",
    win,
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  };
}

const noSession = { hasActiveWalletConnectSession: () => false };

function fakeProvider(reply) {
  return {
    isGeniusWallet: true,
    version: "1",
    request: jest.fn(() => Promise.resolve(reply)),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
}

describe("tracer: gnus_getAccounts end to end", () => {
  test("detection picks injected for the mock provider", async () => {
    const win = makeWindow(createMockProvider());
    const detection = detectTransport(detectEnv(win), noSession);
    await expect(detection.choice).resolves.toBe("injected");
    expect(detection.current()).toBe("injected");
    detection.dispose();
  });

  test("getAccounts resolves to a parsed Accounts value", async () => {
    const mock = createMockProvider();
    const client = createGnusClient(createInjectedTransport(makeWindow(mock)));
    const accounts = await client.getAccounts();
    expect(accounts.node.sdkAddress).toMatch(/^0x[0-9a-f]{128}$/);
    expect(accounts.payer.evmAddress).toMatch(/^0x[0-9a-f]{40}$/);
    expect(accounts.version).toBe("1");
    expect(Number.isInteger(accounts.unit.decimals)).toBe(true);
    expect(mock.controls.calls).toEqual([{ method: "gnus_getAccounts" }]);
    expect(Object.keys(mock.controls.calls[0])).toEqual(["method"]);
  });

  test("an EVM-format sdkAddress is a contract mismatch naming the version", async () => {
    const good = await createGnusClient(createInjectedTransport(makeWindow(createMockProvider()))).getAccounts();
    const bad = JSON.parse(JSON.stringify(good));
    bad.node.sdkAddress = "0x" + "a1".repeat(20);
    const client = createGnusClient(createInjectedTransport(makeWindow(fakeProvider(bad))));
    const err = await client.getAccounts().catch((e) => e);
    expect(err).toBeInstanceOf(GnusContractMismatchError);
    expect(err.message.startsWith("Wallet contract mismatch")).toBe(true);
    expect(err.message).toContain("1");
    expect(err.kind).toBe("contractMismatch");
    expect(err.method).toBe("gnus_getAccounts");
  });

  test("a wire rejection becomes a GnusError with its code", async () => {
    const provider = fakeProvider({});
    provider.request = jest.fn(() => Promise.reject({ code: 4100, message: "x" }));
    const client = createGnusClient(createInjectedTransport(makeWindow(provider)));
    const err = await client.getAccounts().catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBe(4100);
  });

  describe("no wallet on the window", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test("choice resolves to walletconnect after WALLET_WAIT_MS", async () => {
      const detection = detectTransport(detectEnv(makeWindow()), noSession);
      expect(detection.current()).toBeNull();
      jest.advanceTimersByTime(WALLET_WAIT_MS);
      await expect(detection.choice).resolves.toBe("walletconnect");
      expect(detection.current()).toBe("walletconnect");
    });

    test("a late gnus#initialized event with the wallet resolves injected", async () => {
      const win = makeWindow();
      const detection = detectTransport(detectEnv(win), noSession);
      win.gnus = createMockProvider();
      win.dispatchEvent(new Event("gnus#initialized"));
      await expect(detection.choice).resolves.toBe("injected");
      jest.advanceTimersByTime(WALLET_WAIT_MS);
      expect(detection.current()).toBe("injected");
    });
  });
});

describe("mock profiles", () => {
  const { isMockProfileName } = require("../../../lib/gnus/mock/profiles");

  test("default and today behave the same", async () => {
    const a = await createMockProvider().request({ method: "gnus_getAccounts" });
    const b = await createMockProvider({ profile: "today" }).request({ method: "gnus_getAccounts" });
    expect(b).toEqual(a);
  });

  test("an unknown profile throws and lists the known names", () => {
    expect(() => createMockProvider({ profile: "nope" })).toThrow(/nope.*today/);
  });

  test("isMockProfileName checks own keys only", () => {
    expect(isMockProfileName("today")).toBe(true);
    expect(isMockProfileName("toString")).toBe(false);
  });
});
