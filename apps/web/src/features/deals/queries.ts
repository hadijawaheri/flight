import { useQuery } from "@tanstack/react-query";

import { dealsApi } from "./api";

export function useFlashDeals(origin: string, limit = 8) {
  return useQuery({
    queryKey: ["deals", "flash", origin, limit],
    queryFn: () => dealsApi.flash(origin, limit),
    staleTime: 5 * 60_000,
  });
}

export function useExplore(params: { origin: string; budget: number; scope: string } | null) {
  return useQuery({
    queryKey: ["deals", "explore", params],
    queryFn: () => dealsApi.explore(params as NonNullable<typeof params>),
    enabled: params !== null,
  });
}
