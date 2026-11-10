import { detectTransport, parseWalletMarker, WALLET_NOT_READY_MS, WALLET_WAIT_MS } from "../../../lib/gnus/transport/select";
import { createInjectedTransport } from "../../../lib/gnus/transport/injected";
import { createGnusClient } from "../../../lib/gnus/client";
import { installMock, mockOptionsFromSearch, installMockFromLocation } from "../../../lib/gnus/mock/install";
import { createMockProvider } from "../../../lib/gnus/mock/provider";

const PLAIN_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36";
const WALLET_UA = `${PLAIN_UA} GeniusWallet/3.1.0 gnus/1`;

const env = (win, userAgent) => ({
  userAgent,
  win,
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
});
const noSession = { hasActiveWalletConnectSession: () => false };
const activeSession = { hasActiveWalletConnectSession: () => true };
const foreign = () => ({ request: jest.fn(), on: jest.fn(), removeListener: jest.fn() });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("parseWalletMarker", () => {
  test("reads the suffix", () => {
    expect(parseWalletMarker(WALLET_UA)).toEqual({ appVersion: "3.1.0", contractVersion: "1" });
  });
  test("no gnus part, or marker not at the end, is null", () => {
    expect(parseWalletMarker(`${PLAIN_UA} GeniusWallet/3.1.0`)).toBeNull();
    expect(parseWalletMarker(`${WALLET_UA} Safari/604.1`)).toBeNull();
    expect(parseWalletMarker(PLAIN_UA)).toBeNull();
  });
});

// [label, user agent, mock options, timeline of [ms to advance, expected current()], expected onSwitch calls]
const TABLE = [
  ["plain UA, inject at 0", PLAIN_UA, { injectAfterMs: 0 }, [[0, "injected"]], 0],
  ["plain UA, inject at 500", PLAIN_UA, { injectAfterMs: 500 }, [[499, null], [1, "injected"]], 0],
  ["plain UA, inject at 4000", PLAIN_UA, { injectAfterMs: 4000 }, [[2999, null], [1, "walletconnect"], [1000, "injected"]], 1],
  ["plain UA, injected twice", PLAIN_UA, { injectAfterMs: 500, injectTwice: true }, [[500, "injected"], [1000, "injected"]], 0],
  ["marker UA, inject at 0", WALLET_UA, { injectAfterMs: 0 }, [[0, "injected"]], 0],
  ["marker UA, inject at 500", WALLET_UA, { injectAfterMs: 500 }, [[499, null], [1, "injected"]], 0],
  ["marker UA, inject at 4000", WALLET_UA, { injectAfterMs: 4000 }, [[3000, null], [1000, "injected"]], 0],
  ["marker UA, injected twice", WALLET_UA, { injectAfterMs: 500, injectTwice: true }, [[500, "injected"], [1000, "injected"]], 0],
];

describe("detection table", () => {
  it.each(TABLE)("%s", async (_label, ua, mockOptions, timeline, switchCalls) => {
    const win = new EventTarget();
    installMock(win, mockOptions);
    const detection = detectTransport(env(win, ua), noSession);
    const switched = jest.fn();
    detection.onSwitch(switched);
    for (const [advance, expected] of timeline) {
      await jest.advanceTimersByTimeAsync(advance);
      expect(detection.current()).toBe(expected);
    }
    expect(switched).toHaveBeenCalledTimes(switchCalls);
    if (switchCalls > 0) {
      expect(switched).toHaveBeenCalledWith("injected");
    }
    detection.dispose();
  });

  test("the late switch ends with a working client", async () => {
    const win = new EventTarget();
    installMock(win, { injectAfterMs: 4000 });
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    await jest.advanceTimersByTimeAsync(4000);
    expect(detection.current()).toBe("injected");
    const accounts = await createGnusClient(createInjectedTransport(win)).getAccounts();
    expect(accounts.version).toBe("1");
    detection.dispose();
  });

  test("with an active WalletConnect session the late injection is ignored", async () => {
    const win = new EventTarget();
    installMock(win, { injectAfterMs: 4000 });
    const detection = detectTransport(env(win, PLAIN_UA), activeSession);
    const switched = jest.fn();
    detection.onSwitch(switched);
    await jest.advanceTimersByTimeAsync(WALLET_WAIT_MS);
    expect(detection.current()).toBe("walletconnect");
    await jest.advanceTimersByTimeAsync(5000);
    expect(detection.current()).toBe("walletconnect");
    expect(switched).not.toHaveBeenCalled();
    await expect(detection.choice).resolves.toBe("walletconnect");
  });

  test("the session check is made at the moment of the late injection", async () => {
    const win = new EventTarget();
    let active = false;
    installMock(win, { injectAfterMs: 4000 });
    const detection = detectTransport(env(win, PLAIN_UA), { hasActiveWalletConnectSession: () => active });
    await jest.advanceTimersByTimeAsync(WALLET_WAIT_MS);
    active = true;
    await jest.advanceTimersByTimeAsync(1000);
    expect(detection.current()).toBe("walletconnect");
  });

  test("a second late injection does not create a second choice", async () => {
    const win = new EventTarget();
    installMock(win, { injectAfterMs: 4000, injectTwice: true });
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    const switched = jest.fn();
    detection.onSwitch(switched);
    await jest.advanceTimersByTimeAsync(10000);
    expect(detection.current()).toBe("injected");
    expect(switched).toHaveBeenCalledTimes(1);
  });

  test("marker UA and no injection keeps waiting but reports not ready after 10 s", async () => {
    const win = new EventTarget();
    const detection = detectTransport(env(win, WALLET_UA), noSession);
    const settled = jest.fn();
    const notReady = jest.fn();
    detection.choice.then(settled);
    detection.onNotReady(notReady);
    await jest.advanceTimersByTimeAsync(WALLET_NOT_READY_MS - 1);
    expect(detection.notReady()).toBe(false);
    expect(notReady).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(detection.notReady()).toBe(true);
    expect(notReady).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60000);
    expect(detection.current()).toBeNull();
    expect(settled).not.toHaveBeenCalled();
    expect(notReady).toHaveBeenCalledTimes(1);
  });

  test("a wallet that arrives after the not-ready report still takes over", async () => {
    const win = new EventTarget();
    const detection = detectTransport(env(win, WALLET_UA), noSession);
    await jest.advanceTimersByTimeAsync(WALLET_NOT_READY_MS);
    expect(detection.notReady()).toBe(true);
    installMock(win, { injectAfterMs: 0 });
    expect(detection.current()).toBe("injected");
    expect(detection.notReady()).toBe(false);
    await expect(detection.choice).resolves.toBe("injected");
  });

  test("a plain browser never reports not ready; an early injection cancels the timer", async () => {
    const plain = detectTransport(env(new EventTarget(), PLAIN_UA), noSession);
    const early = new EventTarget();
    installMock(early, { injectAfterMs: 500 });
    const inside = detectTransport(env(early, WALLET_UA), noSession);
    const notReady = jest.fn();
    plain.onNotReady(notReady);
    inside.onNotReady(notReady);
    await jest.advanceTimersByTimeAsync(60000);
    expect(plain.notReady()).toBe(false);
    expect(inside.notReady()).toBe(false);
    expect(notReady).not.toHaveBeenCalled();
  });
});

describe("what counts as the wallet", () => {
  test("an announcement with no provider or a foreign one changes nothing", () => {
    const win = new EventTarget();
    const detection = detectTransport(env(win, WALLET_UA), noSession);
    win.dispatchEvent(new Event("gnus#initialized"));
    win.gnus = foreign();
    win.dispatchEvent(new Event("gnus#initialized"));
    win.gnus = { ...foreign(), isGeniusWallet: false };
    win.dispatchEvent(new Event("gnus#initialized"));
    expect(detection.current()).toBeNull();
    win.gnus = createMockProvider();
    win.dispatchEvent(new Event("gnus#initialized"));
    expect(detection.current()).toBe("injected");
  });

  test("a foreign window.gnus at load is not the wallet", async () => {
    const win = new EventTarget();
    win.gnus = foreign();
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    await jest.advanceTimersByTimeAsync(WALLET_WAIT_MS);
    expect(detection.current()).toBe("walletconnect");
  });
});

describe("listener before read", () => {
  test("an announcement fired during the first read of window.gnus is not missed", () => {
    const win = new EventTarget();
    const provider = createMockProvider();
    let reads = 0;
    Object.defineProperty(win, "gnus", {
      configurable: true,
      get() {
        reads += 1;
        if (reads === 1) {
          Object.defineProperty(win, "gnus", { value: provider, configurable: true, writable: true });
          win.dispatchEvent(new Event("gnus#initialized"));
          return undefined;
        }
        return provider;
      },
    });
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    expect(detection.current()).toBe("injected");
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("dispose", () => {
  test("a later injection fires no onSwitch and no detection timer runs", async () => {
    const win = new EventTarget();
    installMock(win, { injectAfterMs: 4000 });
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    const switched = jest.fn();
    detection.onSwitch(switched);
    detection.dispose();
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(5000);
    expect(switched).not.toHaveBeenCalled();
    expect(detection.current()).toBeNull();
  });

  test("onSwitch returns an unsubscribe", async () => {
    const win = new EventTarget();
    installMock(win, { injectAfterMs: 4000 });
    const detection = detectTransport(env(win, PLAIN_UA), noSession);
    const switched = jest.fn();
    detection.onSwitch(switched)();
    await jest.advanceTimersByTimeAsync(4000);
    expect(switched).not.toHaveBeenCalled();
  });
});

describe("installMock", () => {
  test("inject 0 sets window.gnus synchronously and announces once", () => {
    const win = new EventTarget();
    const seen = jest.fn();
    win.addEventListener("gnus#initialized", seen);
    const provider = installMock(win, { injectAfterMs: 0 });
    expect(win.gnus).toBe(provider);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  test("with no options it injects synchronously", () => {
    const win = new EventTarget();
    expect(installMock(win)).toBe(win.gnus);
  });

  test("injectTwice announces a different object that answers the same accounts", async () => {
    const win = new EventTarget();
    const objects = [];
    win.addEventListener("gnus#initialized", () => objects.push(win.gnus));
    const first = installMock(win, { injectAfterMs: 500, injectTwice: true });
    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(1000);
    expect(objects).toHaveLength(2);
    expect(objects[0]).toBe(first);
    expect(objects[1]).not.toBe(first);
    const a = await objects[0].request({ method: "gnus_getAccounts" });
    const b = await objects[1].request({ method: "gnus_getAccounts" });
    expect(b).toEqual(a);
  });

  test("uses the page realm Event constructor when the window has one", () => {
    const win = new EventTarget();
    const made = jest.fn((type) => new Event(type));
    win.Event = made;
    installMock(win);
    expect(made).toHaveBeenCalledWith("gnus#initialized");
  });

  test("an unknown profile is rejected by the mock", () => {
    expect(() => installMock(new EventTarget(), { profile: "nope" })).toThrow(/nope/);
  });

  test("installMockFromLocation reads the query string", async () => {
    const win = new EventTarget();
    win.location = { search: "?gnusInject=500" };
    installMockFromLocation(win);
    expect(win.gnus).toBeUndefined();
    await jest.advanceTimersByTimeAsync(500);
    expect(win.gnus).toBeDefined();
  });
});

describe("mockOptionsFromSearch", () => {
  test("parses the forms", () => {
    expect(mockOptionsFromSearch("?gnusMock=today&gnusInject=4000")).toEqual({ profile: "today", injectAfterMs: 4000 });
    expect(mockOptionsFromSearch("?gnusInject=twice")).toEqual({ injectAfterMs: 500, injectTwice: true });
    expect(mockOptionsFromSearch("?gnusInject=0")).toEqual({ injectAfterMs: 0 });
    expect(mockOptionsFromSearch("")).toEqual({});
  });
  test.each([["?gnusInject=soon"], ["?gnusInject=1.5"], ["?gnusInject=-5"], ["?gnusInject="]])("%s throws", (q) => {
    expect(() => mockOptionsFromSearch(q)).toThrow(/whole number of ms.*twice/);
  });
});

describe("mock reinject", () => {
  test("older facades stop receiving events", () => {
    const first = createMockProvider();
    const second = first.controls.reinject();
    const onFirst = jest.fn();
    const onSecond = jest.fn();
    first.on("e", onFirst);
    second.on("e", onSecond);
    first.controls.emit("e", 1);
    second.controls.emit("e", 2);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onSecond.mock.calls).toEqual([[1], [2]]);
    expect(second.controls.calls).toBe(first.controls.calls);
  });
});
