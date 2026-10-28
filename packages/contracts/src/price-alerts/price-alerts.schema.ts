import { z } from "zod";

import { isoDateSchema } from "../common/dates";
import { type Cabin, CABINS } from "../domain/seatmap";
import { locationCodeSchema } from "../flights/flights.schema";

export const PRICE_ALERT_STATUSES = ["ACTIVE", "TRIGGERED", "EXPIRED"] as const;
export type PriceAlertStatus = (typeof PRICE_ALERT_STATUSES)[number];

export const MAX_ACTIVE_ALERTS = 20;

/** SKIPPED: the deployment has no SMS channel for alerts; the alert still shows in the dashboard. */
export const PRICE_ALERT_SMS_STATUSES = ["PENDING", "SENT", "FAILED", "SKIPPED"] as const;
export type PriceAlertSmsStatus = (typeof PRICE_ALERT_SMS_STATUSES)[number];

/** Attempts per triggered alert before the SMS is given up as FAILED. */
export const MAX_ALERT_SMS_ATTEMPTS = 3;

export const createPriceAlertSchema = z
  .object({
    origin: locationCodeSchema,
    destination: locationCodeSchema,
    date: isoDateSchema,
    cabin: z.enum(CABINS).default("ECONOMY"),
    /** Notify when the cheapest total per adult falls to or below this, rial. */
    targetPrice: z.number().int().positive(),
  })
  .refine((value) => value.origin !== value.destination, {
    message: "مبدأ و مقصد نباید یکسان باشند",
    path: ["destination"],
  });
export type CreatePriceAlertInput = z.infer<typeof createPriceAlertSchema>;

export const updatePriceAlertSchema = z.object({ targetPrice: z.number().int().positive() });
export type UpdatePriceAlertInput = z.infer<typeof updatePriceAlertSchema>;

export interface PriceAlertDto {
  id: string;
  origin: string;
  destination: string;
  originCityFa: string;
  destinationCityFa: string;
  date: string;
  cabin: Cabin;
  targetPrice: number;
  /** Cheapest total per adult right now; null when no flight operates that day. */
  currentLowestPrice: number | null;
  status: PriceAlertStatus;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  /** Flight that matched, so the card can deep-link to it. */
  triggeredFlightId: string | null;
  /** Text message about the trigger; null until the alert fires. */
  sms: { status: PriceAlertSmsStatus; sentAt: string | null } | null;
  createdAt: string;
}
