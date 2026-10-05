import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { passengersApi } from "./api";

export const passengerKeys = { all: ["passengers"] as const };

export function usePassengers(enabled = true) {
  return useQuery({ queryKey: passengerKeys.all, queryFn: passengersApi.list, enabled });
}

export function useCreatePassenger() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: passengersApi.create,
    onSuccess: () => client.invalidateQueries({ queryKey: passengerKeys.all }),
  });
}

export function useUpdatePassenger() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof passengersApi.update>[1];
    }) => passengersApi.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: passengerKeys.all }),
  });
}

export function useDeletePassenger() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: passengersApi.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: passengerKeys.all }),
  });
}
