import { z } from "zod";

export const initiatePaymentSchema = z.object({
  bookingId: z.string().min(1, "شناسه رزرو الزامی است"),
  callbackUrl: z.string().url("آدرس بازگشت نامعتبر است"),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export interface PaymentInitiateResponseDto {
  paymentId: string;
  paymentUrl: string;
  amount: number;
}

export const verifyPaymentSchema = z.object({
  authority: z.string().min(1),
  status: z.string().min(1),
  bookingId: z.string().min(1),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export interface PaymentReceiptDto {
  paymentId: string;
  bookingId: string;
  bookingReference: string;
  trackingCode: string;
  cardPanMasked?: string;
  amount: number;
  isSuccessful: boolean;
  message: string;
  paidAt: string;
}
