import { UseInfiniteQueryResult, InfiniteData, UseQueryResult, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { GnusClient } from "../../lib/gnus/client";
import { useSession } from "./SessionProvider";

export interface AccountQueryOptions {
  refetchOnWindowFocus?: boolean;
  /** Milliseconds between re-reads; false (the default) never polls. */
  refetchInterval?: number | false;
}

/**
 * The only way a component reads account data. The key carries the network and the node account, so a reply
 * for a previous account can never fill the current one.
 */
export function useAccountQuery<T>(
  kind: string,
  read: (client: GnusClient) => Promise<T>,
  options: AccountQueryOptions = {},
): UseQueryResult<T> {
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
    ...options,
  });
}

/** A paged read under the same key and rules as useAccountQuery; the next cursor comes from the last page. */
export function useAccountInfiniteQuery<T>(
  kind: string,
  read: (client: GnusClient, cursor: string | undefined) => Promise<T>,
  getNext: (last: T) => string | null,
  options: AccountQueryOptions = {},
): UseInfiniteQueryResult<InfiniteData<T, string | undefined>> {
  const { state, store } = useSession();
  const { accounts } = state;
  const live = state.phase === "ready" || state.phase === "switching";
  return useInfiniteQuery<T, Error, InfiniteData<T, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: [kind, accounts?.network ?? null, accounts?.node.sdkAddress ?? null],
    queryFn: ({ pageParam }) => {
      const client = store?.getClient();
      if (!client || !store) {
        return Promise.reject(new Error("The wallet is not connected"));
      }
      return store.track(read(client, pageParam));
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => getNext(last) ?? undefined,
    enabled: live && accounts !== null && store !== null,
    ...options,
  });
}
