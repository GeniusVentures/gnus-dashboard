import { useEffect } from "react";
import { InfiniteData, Query, useQueryClient } from "@tanstack/react-query";
import type { JobList, JobLookup } from "../../lib/gnus/schema";
import { replaceInDetail, replaceInPages } from "../../lib/jobs";
import { useSession } from "../wallet/SessionProvider";

// Cache keys are [kind, network, sdkAddress]; a detail folds its selector into the kind as "job:<selector>:<value>".
const isList = (query: Query): boolean => query.queryKey[0] === "jobs";
const isDetail = (query: Query): boolean => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("job:");

/**
 * Applies gnus_jobUpdated to the cached list and detail in place. An event is a hint: a job the cache does not hold,
 * a finished job (whose result and error the event lacks) and an unreadable event all make the views read again.
 */
export function useJobUpdates(): void {
  const { state, store } = useSession();
  const queryClient = useQueryClient();
  const node = state.accounts?.node.sdkAddress ?? null;
  useEffect(() => {
    const client = store?.getClient();
    if (!client || node === null) {
      return undefined;
    }
    return client.on(
      "gnus_jobUpdated",
      (job) => {
        // A late event across an account switch is normal; it is not this account's.
        if (job.sdkAddress !== node) {
          return;
        }
        let found = false;
        queryClient.setQueriesData<InfiniteData<JobList>>({ predicate: isList }, (old) => {
          if (!old) {
            return old;
          }
          const next = replaceInPages(old.pages, job);
          found = found || next.found;
          return next.found ? { ...old, pages: next.pages } : old;
        });
        queryClient.setQueriesData<JobLookup>({ predicate: isDetail }, (old) => replaceInDetail(old, job));
        if (!found) {
          void queryClient.invalidateQueries({ predicate: isList });
        }
        if (job.status === "completed" || job.status === "failed") {
          void queryClient.invalidateQueries({
            predicate: (query) => isDetail(query) && (query.state.data as JobLookup | undefined)?.burnTxHash === job.burnTxHash,
          });
        }
      },
      () => {
        void queryClient.invalidateQueries({ predicate: (query) => isList(query) || isDetail(query) });
      },
    );
  }, [store, node, queryClient]);
}
