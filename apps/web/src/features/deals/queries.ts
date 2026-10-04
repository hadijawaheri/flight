import type { BudgetExploreQuery } from "@flysmart/contracts";
import { useQuery } from "@tanstack/react-query";

import { exploreBudgetApi, getCheapDealsApi } from "./api";

export const dealKeys = {
  all: ["deals"] as const,
  list: () => [...dealKeys.all, "list"] as const,
  budget: (query: BudgetExploreQuery) => [...dealKeys.all, "budget", query] as const,
};

export function useCheapDeals() {
  return useQuery({
    queryKey: dealKeys.list(),
    queryFn: getCheapDealsApi,
    staleTime: 60_000,
  });
}

export function useBudgetExplore(query: BudgetExploreQuery, enabled = true) {
  return useQuery({
    queryKey: dealKeys.budget(query),
    queryFn: () => exploreBudgetApi(query),
    enabled,
    staleTime: 60_000,
  });
}
