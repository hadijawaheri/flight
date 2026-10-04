import type { CreatePassengerInput, UpdatePassengerInput } from "@flysmart/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPassengerApi,
  deletePassengerApi,
  listPassengersApi,
  updatePassengerApi,
} from "./api";

export const passengerKeys = {
  all: ["passengers"] as const,
  list: () => [...passengerKeys.all, "list"] as const,
  detail: (id: string) => [...passengerKeys.all, "detail", id] as const,
};

export function usePassengers() {
  return useQuery({
    queryKey: passengerKeys.list(),
    queryFn: listPassengersApi,
  });
}

export function useCreatePassenger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePassengerInput) => createPassengerApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passengerKeys.list() });
    },
  });
}

export function useUpdatePassenger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePassengerInput }) =>
      updatePassengerApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passengerKeys.list() });
    },
  });
}

export function useDeletePassenger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePassengerApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passengerKeys.list() });
    },
  });
}
