import "server-only";

import type {
  AirportGuideDto,
  ApiResponse,
  ListRulesQuery,
  RuleEntryDto,
  RulesIndexDto,
} from "@flysmart/contracts";

import { serverApi } from "@/lib/api/server";

// Rules change rarely and are the same for everyone, so an hour of caching is safe and fast.
const REVALIDATE_SECONDS = 3600;

export async function fetchRules(query: ListRulesQuery): Promise<RulesIndexDto> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.q) params.set("q", query.q);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return (
    await serverApi<ApiResponse<RulesIndexDto>>(`/rules${suffix}`, {
      revalidate: REVALIDATE_SECONDS,
    })
  ).data;
}

export async function fetchRule(id: string): Promise<RuleEntryDto> {
  return (
    await serverApi<ApiResponse<RuleEntryDto>>(`/rules/${encodeURIComponent(id)}`, {
      revalidate: REVALIDATE_SECONDS,
    })
  ).data;
}

export async function fetchAirportGuide(code: string): Promise<AirportGuideDto> {
  return (
    await serverApi<ApiResponse<AirportGuideDto>>(`/airports/${encodeURIComponent(code)}/guide`, {
      revalidate: REVALIDATE_SECONDS,
    })
  ).data;
}
