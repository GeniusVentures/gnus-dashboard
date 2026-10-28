import React from "react";
import { act, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { GnusError } from "../../../lib/gnus/errors";
import { useAccountQuery } from "../../../sub-components/wallet/useAccountQuery";
import { useSession } from "../../../sub-components/wallet/SessionProvider";
import { renderWithSession } from "../../mocks/session";

// react-query notifies observers on a zero-delay timer.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));
const SDK_A = "0x" + "a1".repeat(64);

// Each read waits until the test settles it, so a reply can arrive after the account changed.
function setup(options) {
  const reads = [];
  let cache = null;
  const Probe = () => {
    cache = useQueryClient().getQueryCache();
    const { state } = useSession();
    const query = useAccountQuery("probe", () => new Promise((resolve, reject) => reads.push({ resolve, reject })));
    return (
      <div>
        <p>phase:{state.phase}</p>
        <p>data:{query.data ?? "none"}</p>
        <p>error:{query.error instanceof GnusError ? query.error.kind : "none"}</p>
      </div>
    );
  };
  const view = renderWithSession(<Probe />, options);
  return { ...view, reads, cacheKeys: () => cache.getAll().map((query) => JSON.stringify(query.queryKey)) };
}

describe("useAccountQuery", () => {
  test("a reply for account A that arrives after the switch never renders", async () => {
    const { provider, reads, cacheKeys } = setup();
    await screen.findByText("phase:ready");
    await act(async () => {});
    expect(reads).toHaveLength(1);
    act(() => provider.controls.switchAccount());
    await act(async () => {});
    expect(reads).toHaveLength(2);
    await act(async () => reads[0].resolve("from-A"));
    await flush();
    expect(screen.queryByText("data:from-A")).not.toBeInTheDocument();
    expect(screen.getByText("data:none")).toBeInTheDocument();
    await act(async () => reads[1].resolve("from-B"));
    expect(await screen.findByText("data:from-B")).toBeInTheDocument();
    expect(cacheKeys().join("")).not.toContain(SDK_A);
  });

  test("the cache holds no key with the old address after a switch", async () => {
    const { provider, reads, cacheKeys } = setup();
    await screen.findByText("phase:ready");
    await act(async () => {});
    await act(async () => reads[0].resolve("from-A"));
    expect(cacheKeys().join("")).toContain(SDK_A);
    act(() => provider.controls.switchAccount());
    await act(async () => {});
    expect(cacheKeys().join("")).not.toContain(SDK_A);
  });

  test("while connecting the probe sends no request", async () => {
    const { reads, provider } = setup({ profile: "connectPrompt" });
    await screen.findByText("phase:connecting");
    await act(async () => {});
    expect(reads).toHaveLength(0);
    expect(provider.controls.calls.map((call) => call.method)).toEqual(["gnus_getAccounts"]);
  });

  test("a 4100 moves the session to denied; a -32603 leaves it ready with the error on the probe", async () => {
    const denied = setup();
    await screen.findByText("phase:ready");
    await act(async () => {});
    await act(async () => denied.reads[0].reject(new GnusError(4100)));
    expect(await screen.findByText("phase:denied")).toBeInTheDocument();
    denied.unmount();

    const failing = setup();
    await screen.findByText("phase:ready");
    await act(async () => {});
    await act(async () => failing.reads[0].reject(new GnusError(-32603)));
    expect(screen.getByText("phase:ready")).toBeInTheDocument();
    expect(await screen.findByText("error:internal")).toBeInTheDocument();
  });
});
