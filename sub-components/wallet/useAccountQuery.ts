import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { GnusClient } from "../../lib/gnus/client";
import { useSession } from "./SessionProvider";

/**
 * The only way a component reads account data. The key carries the network and the node account, so a reply
 * for a previous account can never fill the current one.
 */
export function useAccountQuery<T>(kind: string, read: (client: GnusClient) => Promise<T>): UseQueryResult<T> {
  const { state, store } = useSession();
  const { accounts } = state;
  const live = state.phase === "ready" || state.phase === "switching";
  return useQuery<T>({
    queryKey: [kind, accounts?.network ?? null, accounts?.node.sdkAddress ?? null],
    queryFn: () => {
      const client = store?.getClient();
      if (!client || !store) {
        return Promise.reject(new Error("The wallet is not connected"));
      }
      return store.track(read(client));
    },
    enabled: live && accounts !== null && store !== null,
  });
}
