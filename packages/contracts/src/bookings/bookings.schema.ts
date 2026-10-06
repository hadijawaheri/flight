import { z } from "zod";

import { mobileSchema } from "../common/iran";
import type { FareBreakdown, PassengerType } from "../domain/fare";
import type { RefundPolicy, RefundResult } from "../domain/refund";
import { parseSeatNumber } from "../domain/seatmap";
import { flightIdSchema } from "../flights/flight-id";
import type { FlightSummaryDto } from "../flights/flights.schema";
import { passengerIdentitySchema } from "../passengers/passengers.schema";
import type { PaymentDto } from "../payments/payments.schema";

export const BOOKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SLICE_DIRECTIONS = ["OUTBOUND", "RETURN"] as const;
export type SliceDirection = (typeof SLICE_DIRECTIONS)[number];

export const SEAT_PREFERENCES = ["ANY", "WINDOW", "AISLE"] as const;

/** Minutes a seat is held while the traveller pays. */
export const BOOKING_HOLD_MINUTES = 15;

export const bookingContactSchema = z.object({
  mobile: mobileSchema,
  email: z
    .string()
    .trim()
    .email("ایمیل معتبر نیست")
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type BookingContactInput = z.infer<typeof bookingContactSchema>;

export const bookingPassengerSchema = passengerIdentitySchema.extend({
  /** Present when the identity came from the traveler vault. */
  savedPassengerId: z.string().optional(),
});
export type BookingPassengerInput = z.infer<typeof bookingPassengerSchema>;

export const createBookingSchema = z
  .object({
    outboundFlightId: flightIdSchema,
    returnFlightId: flightIdSchema.optional(),
    passengers: z.array(bookingPassengerSchema).min(1, "حداقل یک مسافر لازم است").max(9),
    contact: bookingContactSchema,
    /** Grand total the traveller saw, rial; a mismatch means the fare changed (409 FARE_CHANGED). */
    quotedTotal: z.number().int().positive(),
    seatPreference: z.enum(SEAT_PREFERENCES).default("ANY"),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.passengers.map((passenger) => passenger.nationalId));
    if (ids.size !== value.passengers.length) {
      ctx.addIssue({
        code: "custom",
        message: "کد ملی مسافران نباید تکراری باشد",
        path: ["passengers"],
      });
    }
  });
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const seatSelectionSchema = z.object({
  slice: z.enum(SLICE_DIRECTIONS),
  passengerIndex: z.number().int().min(0).max(8),
  seat: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => parseSeatNumber(value) !== null, "شماره‌ی صندلی معتبر نیست"),
});

export const assignSeatsSchema = z
  .object({ seats: z.array(seatSelectionSchema).min(1).max(18) })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.seats.forEach((selection, index) => {
      const key = `${selection.slice}:${selection.seat}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: "یک صندلی برای دو مسافر انتخاب شده است",
          path: ["seats", index],
        });
      }
      seen.add(key);
    });
  });
export type AssignSeatsInput = z.infer<typeof assignSeatsSchema>;

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(BOOKING_STATUSES).optional(),
  /** `upcoming` hides flown and cancelled trips; `past` shows only them. */
  when: z.enum(["upcoming", "past"]).optional(),
});
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;

/* ---------------------------------- response shapes ---------------------------------- */

export interface BookingPassengerDto {
  index: number;
  type: PassengerType;
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  /** Masked: ******1234. */
  nationalIdMasked: string;
  passportNumberMasked: string | null;
  seats: Partial<Record<SliceDirection, string>>;
  tickets: Partial<Record<SliceDirection, string>>;
}

export interface BookingSliceDto {
  direction: SliceDirection;
  flight: FlightSummaryDto;
  fare: FareBreakdown;
  seatFees: number;
  refundPolicy: RefundPolicy;
  /** True once the flight has departed. */
  departed: boolean;
}

export interface BookingContactDto {
  mobile: string;
  email: string | null;
}

export interface BookingTotalsDto {
  fareTotal: number;
  seatFeesTotal: number;
  total: number;
}

export interface RefundSummaryDto {
  refundAmount: number;
  penaltyAmount: number;
  nonRefundableFees: number;
  processedAt: string;
}

export interface BookingDto {
  id: string;
  /** Six-character booking reference shown on the ticket. */
  pnr: string;
  status: BookingStatus;
  slices: BookingSliceDto[];
  passengers: BookingPassengerDto[];
  contact: BookingContactDto;
  totals: BookingTotalsDto;
  /** Seats are released when this passes without payment. */
  holdExpiresAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refund: RefundSummaryDto | null;
  createdAt: string;
}

export interface BookingListItemDto {
  id: string;
  pnr: string;
  status: BookingStatus;
  originCode: string;
  destinationCode: string;
  originCityFa: string;
  destinationCityFa: string;
  departureUtc: string;
  returnDepartureUtc: string | null;
  passengerCount: number;
  total: number;
  createdAt: string;
}

export interface RefundQuoteSliceDto {
  direction: SliceDirection;
  hoursBeforeDeparture: number;
  result: RefundResult;
}

export interface RefundQuoteDto {
  bookingId: string;
  cancellable: boolean;
  /** Why cancelling is impossible, when `cancellable` is false. */
  blockedReason: string | null;
  slices: RefundQuoteSliceDto[];
  totalRefund: number;
  totalPenalty: number;
  totalNonRefundableFees: number;
}

export interface PayBookingResultDto {
  payment: PaymentDto;
  booking: BookingDto;
}
