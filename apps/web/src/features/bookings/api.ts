import type {
  ApiResponse,
  BookingDto,
  CreateBookingInput,
  PaymentInitiateResponseDto,
  PaymentReceiptDto,
  UpdateBookingInput,
} from "@flysmart/contracts";

import { api } from "@/lib/api/client";

export async function listBookingsApi(): Promise<BookingDto[]> {
  const res = await api<ApiResponse<BookingDto[]>>("/bookings");
  return res.data;
}

export async function getBookingByIdApi(id: string): Promise<BookingDto> {
  const res = await api<ApiResponse<BookingDto>>(`/bookings/${id}`);
  return res.data;
}

export async function createBookingApi(input: CreateBookingInput): Promise<BookingDto> {
  const res = await api<ApiResponse<BookingDto>>("/bookings", {
    method: "POST",
    json: input,
  });
  return res.data;
}

export async function updateBookingApi(id: string, input: UpdateBookingInput): Promise<BookingDto> {
  const res = await api<ApiResponse<BookingDto>>(`/bookings/${id}`, {
    method: "PATCH",
    json: input,
  });
  return res.data;
}

export async function cancelBookingApi(id: string): Promise<BookingDto> {
  const res = await api<ApiResponse<BookingDto>>(`/bookings/${id}/cancel`, {
    method: "POST",
  });
  return res.data;
}

export async function initiatePaymentApi(
  bookingId: string,
  callbackUrl: string,
): Promise<PaymentInitiateResponseDto> {
  const res = await api<ApiResponse<PaymentInitiateResponseDto>>("/payments/initiate", {
    method: "POST",
    json: { bookingId, callbackUrl },
  });
  return res.data;
}

export async function verifyPaymentApi(
  authority: string,
  status: string,
  bookingId: string,
): Promise<PaymentReceiptDto> {
  const res = await api<ApiResponse<PaymentReceiptDto>>("/payments/verify", {
    method: "POST",
    json: { authority, status, bookingId },
  });
  return res.data;
}
