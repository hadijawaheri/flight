import { z } from "zod";

export const PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * The simulated gateway honours `outcome` so every payment branch can be demonstrated. A real
 * provider ignores it; the web app only shows the switch when the API reports the mock provider.
 */
export const payBookingSchema = z.object({
  outcome: z.enum(["SUCCESS", "FAILURE"]).default("SUCCESS"),
});
export type PayBookingInput = z.infer<typeof payBookingSchema>;

export interface PaymentDto {
  id: string;
  bookingId: string;
  amount: number;
  status: PaymentStatus;
  provider: string;
  /** Gateway reference shown on the receipt. */
  referenceId: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

/** Tells the checkout whether the gateway is simulated, so it can offer the outcome switch. */
export interface PaymentConfigDto {
  provider: string;
  simulated: boolean;
}
