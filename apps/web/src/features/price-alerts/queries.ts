import type { CreatePriceAlertInput } from "@flysmart/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPriceAlertApi,
  deletePriceAlertApi,
  listPriceAlertsApi,
  togglePriceAlertApi,
} from "./api";

export const priceAlertKeys = {
  all: ["price-alerts"] as const,
  list: () => [...priceAlertKeys.all, "list"] as const,
};

export function usePriceAlerts() {
  return useQuery({
    queryKey: priceAlertKeys.list(),
    queryFn: listPriceAlertsApi,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePriceAlertInput) => createPriceAlertApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceAlertKeys.list() });
    },
  });
}

export function useTogglePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => togglePriceAlertApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceAlertKeys.list() });
    },
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePriceAlertApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceAlertKeys.list() });
    },
  });
}
