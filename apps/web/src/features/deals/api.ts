import type { ApiResponse, DealDto, ExploreResultDto } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const dealsApi = {
  flash: async (origin: string, limit = 8) =>
    (await api<ApiResponse<DealDto[]>>(`/deals/flash?origin=${origin}&limit=${limit}`)).data,
  explore: async (params: { origin: string; budget: number; scope: string; days?: number }) => {
    const search = new URLSearchParams({
      origin: params.origin,
      budget: String(params.budget),
      scope: params.scope,
      days: String(params.days ?? 30),
    });
    return (await api<ApiResponse<ExploreResultDto>>(`/deals/explore?${search.toString()}`)).data;
  },
};
