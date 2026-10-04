import type { CreateBookingInput, UpdateBookingInput } from "@flysmart/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelBookingApi,
  createBookingApi,
  getBookingByIdApi,
  initiatePaymentApi,
  listBookingsApi,
  updateBookingApi,
  verifyPaymentApi,
} from "./api";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: () => [...bookingKeys.all, "list"] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};

export function useBookings() {
  return useQuery({
    queryKey: bookingKeys.list(),
    queryFn: listBookingsApi,
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => getBookingByIdApi(id),
    enabled: Boolean(id),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBookingApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.list() });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookingInput }) =>
      updateBookingApi(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(bookingKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: bookingKeys.list() });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBookingApi(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.list() });
    },
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: ({ bookingId, callbackUrl }: { bookingId: string; callbackUrl: string }) =>
      initiatePaymentApi(bookingId, callbackUrl),
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: ({
      authority,
      status,
      bookingId,
    }: {
      authority: string;
      status: string;
      bookingId: string;
    }) => verifyPaymentApi(authority, status, bookingId),
  });
}
