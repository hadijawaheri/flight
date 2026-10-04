import type { ApiResponse, CreatePriceAlertInput, PriceAlertDto } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function listPriceAlertsApi(): Promise<PriceAlertDto[]> {
  const res = await api<ApiResponse<PriceAlertDto[]>>("/price-alerts");
  return res.data;
}

export async function createPriceAlertApi(input: CreatePriceAlertInput): Promise<PriceAlertDto> {
  const res = await api<ApiResponse<PriceAlertDto>>("/price-alerts", {
    method: "POST",
    json: input,
  });
  return res.data;
}

export async function togglePriceAlertApi(id: string): Promise<PriceAlertDto> {
  const res = await api<ApiResponse<PriceAlertDto>>(`/price-alerts/${id}/toggle`, {
    method: "PATCH",
  });
  return res.data;
}

export async function deletePriceAlertApi(id: string): Promise<void> {
  await api(`/price-alerts/${id}`, {
    method: "DELETE",
  });
}
