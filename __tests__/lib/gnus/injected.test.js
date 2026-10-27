import { createInjectedTransport } from "../../../lib/gnus/transport/injected";
import { createGnusClient } from "../../../lib/gnus/client";
import { createMockProvider } from "../../../lib/gnus/mock/provider";
import { GnusError } from "../../../lib/gnus/errors";

const announce = (win) => win.dispatchEvent(new Event("gnus#initialized"));
const call = { method: "gnus_getAccounts" };

describe("per-call read", () => {
  test("a replaced window.gnus gets the next request", async () => {
    const win = new EventTarget();
    const first = createMockProvider();
    const second = createMockProvider();
    win.gnus = first;
    const transport = createInjectedTransport(win);
    await transport.request(call);
    win.gnus = second;
    await transport.request(call);
    expect(first.controls.calls).toHaveLength(1);
    expect(second.controls.calls).toHaveLength(1);
  });

  test("an absent window.gnus rejects with 4900, a GnusError through the client", async () => {
    const win = new EventTarget();
    const transport = createInjectedTransport(win);
    await expect(transport.request(call)).rejects.toMatchObject({ code: 4900 });
    const err = await createGnusClient(transport).getAccounts().catch((e) => e);
    expect(err).toBeInstanceOf(GnusError);
    expect(err.code).toBe(4900);
  });
});

describe("listeners follow re-injection", () => {
  test("a listener receives the next event from the new provider exactly once", () => {
    const win = new EventTarget();
    const first = createMockProvider();
    win.gnus = first;
    const transport = createInjectedTransport(win);
    const listener = jest.fn();
    transport.on("gnus_networkChanged", listener);

    first.controls.emit("gnus_networkChanged", "a");
    expect(listener.mock.calls).toEqual([["a"]]);

    const second = first.controls.reinject();
    win.gnus = second;
    announce(win);
    second.controls.emit("gnus_networkChanged", "b");
    expect(listener.mock.calls).toEqual([["a"], ["b"]]);
  });

  test("announcing the same object again does not double-subscribe", () => {
    const win = new EventTarget();
    const provider = createMockProvider();
    win.gnus = provider;
    const transport = createInjectedTransport(win);
    const listener = jest.fn();
    transport.on("e", listener);
    announce(win);
    announce(win);
    provider.controls.emit("e", 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("a listener added before the wallet appears is attached on the first announcement", () => {
    const win = new EventTarget();
    const transport = createInjectedTransport(win);
    const listener = jest.fn();
    transport.on("e", listener);
    const provider = createMockProvider();
    win.gnus = provider;
    announce(win);
    provider.controls.emit("e", 1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("removeListener stops delivery from the current provider", () => {
    const win = new EventTarget();
    const provider = createMockProvider();
    win.gnus = provider;
    const transport = createInjectedTransport(win);
    const listener = jest.fn();
    transport.on("e", listener);
    transport.removeListener("e", listener);
    provider.controls.emit("e", 1);
    expect(listener).not.toHaveBeenCalled();
    const second = provider.controls.reinject();
    win.gnus = second;
    announce(win);
    second.controls.emit("e", 2);
    expect(listener).not.toHaveBeenCalled();
  });

  test("close stops delivery and later announcements re-subscribe nothing", () => {
    const win = new EventTarget();
    const provider = createMockProvider();
    win.gnus = provider;
    const transport = createInjectedTransport(win);
    const listener = jest.fn();
    transport.on("e", listener);
    transport.close();
    provider.controls.emit("e", 1);
    const second = provider.controls.reinject();
    win.gnus = second;
    announce(win);
    second.controls.emit("e", 2);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("import time", () => {
  test("no lib/gnus module reads window.gnus when imported", () => {
    let reads = 0;
    Object.defineProperty(window, "gnus", {
      configurable: true,
      get() {
        reads += 1;
        return undefined;
      },
    });
    try {
      jest.isolateModules(() => {
        for (const path of ["client", "schema", "address", "amount", "errors", "transport/select", "transport/injected", "mock/provider", "mock/install"]) {
          require(`../../../lib/gnus/${path}`);
        }
      });
    } finally {
      delete window.gnus;
    }
    expect(reads).toBe(0);
  });
});
