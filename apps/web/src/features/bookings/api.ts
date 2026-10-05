import type {
  ApiResponse,
  AssignSeatsInput,
  BookingDto,
  BookingListItemDto,
  PageMeta,
  PaginatedResponse,
  PayBookingResultDto,
  PaymentConfigDto,
  RefundQuoteDto,
} from "@flysmart/contracts";
import type { CreateBookingInput, PayBookingInput } from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export interface BookingListParams {
  page: number;
  limit: number;
  when?: "upcoming" | "past";
}

export const bookingsApi = {
  list: async (
    params: BookingListParams,
  ): Promise<{ items: BookingListItemDto[]; meta: PageMeta }> => {
    const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.when) search.set("when", params.when);
    const res = await api<PaginatedResponse<BookingListItemDto>>(`/bookings?${search.toString()}`);
    return { items: res.data, meta: res.meta };
  },
  get: async (id: string) => (await api<ApiResponse<BookingDto>>(`/bookings/${id}`)).data,
  create: async (input: CreateBookingInput) =>
    (await api<ApiResponse<BookingDto>>("/bookings", { method: "POST", json: input })).data,
  assignSeats: async (id: string, input: AssignSeatsInput) =>
    (await api<ApiResponse<BookingDto>>(`/bookings/${id}/seats`, { method: "PATCH", json: input }))
      .data,
  pay: async (id: string, input: PayBookingInput) =>
    (
      await api<ApiResponse<PayBookingResultDto>>(`/bookings/${id}/pay`, {
        method: "POST",
        json: input,
      })
    ).data,
  refundQuote: async (id: string) =>
    (await api<ApiResponse<RefundQuoteDto>>(`/bookings/${id}/refund-quote`)).data,
  cancel: async (id: string) =>
    (await api<ApiResponse<BookingDto>>(`/bookings/${id}/cancel`, { method: "POST" })).data,
  paymentConfig: async () => (await api<ApiResponse<PaymentConfigDto>>("/payments/config")).data,
};
