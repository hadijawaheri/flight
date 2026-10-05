import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { priceAlertsApi } from "./api";

export const priceAlertKeys = { all: ["price-alerts"] as const };

export function usePriceAlerts() {
  return useQuery({ queryKey: priceAlertKeys.all, queryFn: priceAlertsApi.list });
}

export function useCreatePriceAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: priceAlertsApi.create,
    onSuccess: () => client.invalidateQueries({ queryKey: priceAlertKeys.all }),
  });
}

export function useUpdatePriceAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetPrice }: { id: string; targetPrice: number }) =>
      priceAlertsApi.update(id, { targetPrice }),
    onSuccess: () => client.invalidateQueries({ queryKey: priceAlertKeys.all }),
  });
}

export function useDeletePriceAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: priceAlertsApi.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: priceAlertKeys.all }),
  });
}
