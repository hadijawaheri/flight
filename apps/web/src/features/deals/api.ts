import type {
  ApiResponse,
  BudgetDestinationDto,
  BudgetExploreQuery,
  CheapDealDto,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function getCheapDealsApi(): Promise<CheapDealDto[]> {
  const res = await api<ApiResponse<CheapDealDto[]>>("/deals");
  return res.data;
}

export async function exploreBudgetApi(query: BudgetExploreQuery): Promise<BudgetDestinationDto[]> {
  const searchParams = new URLSearchParams({
    origin: query.origin,
    maxBudget: String(query.maxBudget),
  });
  if (query.month) searchParams.set("month", query.month);

  const res = await api<ApiResponse<BudgetDestinationDto[]>>(
    `/deals/explore?${searchParams.toString()}`,
  );
  return res.data;
}
