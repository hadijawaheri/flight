import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type BookingListParams, bookingsApi } from "./api";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (params: BookingListParams) => [...bookingKeys.all, "list", params] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
  refund: (id: string) => [...bookingKeys.all, "refund", id] as const,
  paymentConfig: ["payments", "config"] as const,
};

export function useBookings(params: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: string) {
  return useQuery({ queryKey: bookingKeys.detail(id), queryFn: () => bookingsApi.get(id) });
}

export function useRefundQuote(id: string, enabled: boolean) {
  return useQuery({
    queryKey: bookingKeys.refund(id),
    queryFn: () => bookingsApi.refundQuote(id),
    enabled,
    staleTime: 0,
  });
}

export function usePaymentConfig() {
  return useQuery({
    queryKey: bookingKeys.paymentConfig,
    queryFn: bookingsApi.paymentConfig,
    staleTime: 5 * 60_000,
  });
}

export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => client.invalidateQueries({ queryKey: bookingKeys.all }),
  });
}

export function useAssignSeats(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof bookingsApi.assignSeats>[1]) =>
      bookingsApi.assignSeats(id, input),
    onSuccess: (booking) => client.setQueryData(bookingKeys.detail(id), booking),
  });
}

export function usePayBooking(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof bookingsApi.pay>[1]) => bookingsApi.pay(id, input),
    onSuccess: (result) => {
      client.setQueryData(bookingKeys.detail(id), result.booking);
      void client.invalidateQueries({ queryKey: [...bookingKeys.all, "list"] });
    },
  });
}

export function useCancelBooking(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.cancel(id),
    onSuccess: (booking) => {
      client.setQueryData(bookingKeys.detail(id), booking);
      void client.invalidateQueries({ queryKey: [...bookingKeys.all, "list"] });
    },
  });
}
