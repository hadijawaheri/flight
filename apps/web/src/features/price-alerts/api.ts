import type {
  ApiResponse,
  CreatePriceAlertInput,
  PriceAlertDto,
  UpdatePriceAlertInput,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export const priceAlertsApi = {
  list: async () => (await api<ApiResponse<PriceAlertDto[]>>("/price-alerts")).data,
  create: async (input: CreatePriceAlertInput) =>
    (await api<ApiResponse<PriceAlertDto>>("/price-alerts", { method: "POST", json: input })).data,
  update: async (id: string, input: UpdatePriceAlertInput) =>
    (await api<ApiResponse<PriceAlertDto>>(`/price-alerts/${id}`, { method: "PATCH", json: input }))
      .data,
  remove: (id: string) => api<void>(`/price-alerts/${id}`, { method: "DELETE" }),
};
