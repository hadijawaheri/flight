import { z } from "zod";

import { isoDateSchema } from "../common/dates";
import {
  type FareBreakdown,
  FLIGHT_TYPES,
  type FlightType,
  validatePassengerMix,
} from "../domain/fare";
import type { FareFamily, RefundPolicy } from "../domain/refund";
import { CABINS, type Cabin } from "../domain/seatmap";
import type { PriceInsightSummary } from "../pricing/summary";
import type { PriceInsight, PricePoint } from "../pricing/price-insight";
import { isKnownLocationCode } from "../reference/airports";

export const FLIGHT_SORTS = ["best", "price", "departure", "duration"] as const;
export type FlightSort = (typeof FLIGHT_SORTS)[number];

/** 00–06, 06–12, 12–18, 18–24 at the origin airport. */
export const TIME_BUCKETS = ["NIGHT", "MORNING", "AFTERNOON", "EVENING"] as const;
export type TimeBucket = (typeof TIME_BUCKETS)[number];

export const FLIGHT_TAGS = ["CHEAPEST", "FASTEST", "BEST_VALUE"] as const;
export type FlightTag = (typeof FLIGHT_TAGS)[number];

export const locationCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().refine(isKnownLocationCode, "مبدأ یا مقصد شناخته‌شده نیست"));

const csv = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((part) => part.trim().toUpperCase())
            .filter(Boolean)
        : undefined,
    )
    .pipe(z.array(z.enum(values)).optional());

const passengerCount = (max: number, fallback: number) =>
  z.coerce.number().int().min(0).max(max).default(fallback);

export const passengerMixSchema = z.object({
  adults: z.coerce.number().int().min(1, "حداقل یک بزرگسال لازم است").max(9).default(1),
  children: passengerCount(8, 0),
  infants: passengerCount(8, 0),
});
export type PassengerMixInput = z.infer<typeof passengerMixSchema>;

function refineMix(value: PassengerMixInput, ctx: z.RefinementCtx): void {
  const problem = validatePassengerMix(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["infants"] });
}

export const searchFlightsQuerySchema = z
  .object({
    origin: locationCodeSchema,
    destination: locationCodeSchema,
    date: isoDateSchema,
    adults: passengerMixSchema.shape.adults,
    children: passengerMixSchema.shape.children,
    infants: passengerMixSchema.shape.infants,
    cabin: z.enum(CABINS).default("ECONOMY"),
    sort: z.enum(FLIGHT_SORTS).default("best"),
    /** Comma-separated airline codes, e.g. `IR,W5`. */
    airlines: z
      .string()
      .optional()
      .transform((value) =>
        value
          ? value
              .split(",")
              .map((part) => part.trim().toUpperCase())
              .filter((part) => /^[A-Z0-9]{2}$/.test(part))
          : undefined,
      ),
    flightType: z.enum(FLIGHT_TYPES).optional(),
    times: csv(TIME_BUCKETS),
    /** Upper bound on the per-adult total fare, rial. */
    maxPrice: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    refineMix(value, ctx);
    if (value.origin === value.destination) {
      ctx.addIssue({
        code: "custom",
        message: "مبدأ و مقصد نباید یکسان باشند",
        path: ["destination"],
      });
    }
  });
export type SearchFlightsQuery = z.infer<typeof searchFlightsQuerySchema>;

export const flightQuoteQuerySchema = z
  .object({
    adults: passengerMixSchema.shape.adults,
    children: passengerMixSchema.shape.children,
    infants: passengerMixSchema.shape.infants,
  })
  .superRefine(refineMix);
export type FlightQuoteQuery = z.infer<typeof flightQuoteQuerySchema>;

export const fareCalendarQuerySchema = z
  .object({
    origin: locationCodeSchema,
    destination: locationCodeSchema,
    /** First day of the window; defaults to today in Tehran. */
    from: isoDateSchema.optional(),
    days: z.coerce.number().int().min(7).max(60).default(30),
    cabin: z.enum(CABINS).default("ECONOMY"),
  })
  .refine((value) => value.origin !== value.destination, {
    message: "مبدأ و مقصد نباید یکسان باشند",
    path: ["destination"],
  });
export type FareCalendarQuery = z.infer<typeof fareCalendarQuerySchema>;

/* ---------------------------------- response shapes ---------------------------------- */

export interface AirlineRefDto {
  code: string;
  nameFa: string;
  nameEn: string;
}

export interface FlightPointDto {
  airportCode: string;
  airportNameFa: string;
  cityFa: string;
  /** Local wall clock at the airport, `YYYY-MM-DDTHH:mm`. */
  localTime: string;
  utcOffsetMinutes: number;
}

export interface FlightSummaryDto {
  id: string;
  flightNumber: string;
  airline: AirlineRefDto;
  origin: FlightPointDto;
  destination: FlightPointDto;
  departureUtc: string;
  arrivalUtc: string;
  durationMinutes: number;
  aircraft: { id: string; nameFa: string };
  cabin: Cabin;
  flightType: FlightType;
  international: boolean;
  fareFamily: FareFamily;
  /** Checked baggage per passenger, kg. */
  baggageKg: number;
  /** Carry-on allowance per passenger, kg. */
  cabinBaggageKg: number;
  meal: boolean;
}

export interface FlightOfferDto extends FlightSummaryDto {
  seatsLeft: number;
  /** Adult base fare before taxes and fees, rial. */
  adultBaseFare: number;
  /** Total per adult including taxes and fees, rial — the headline price on result cards. */
  pricePerAdult: number;
  /** Fare for the whole party that was searched. */
  fare: FareBreakdown;
  refundPolicy: RefundPolicy;
  insight: PriceInsightSummary;
  tags: FlightTag[];
}

export interface AirlineFacetDto {
  code: string;
  nameFa: string;
  count: number;
  minPricePerAdult: number;
}

export interface FlightSearchResultDto {
  offers: FlightOfferDto[];
  summary: {
    count: number;
    minPricePerAdult: number | null;
    maxPricePerAdult: number | null;
    airlines: AirlineFacetDto[];
    /** Why this date is cheap or expensive (holidays, season, weekday). */
    demandReasons: string[];
    isPeakDate: boolean;
  };
}

export interface FareCalendarDayDto {
  date: string;
  /** Cheapest total per adult that day, null when nothing flies. */
  lowestPricePerAdult: number | null;
  isPeak: boolean;
}

export interface FareCalendarDto {
  origin: string;
  destination: string;
  cabin: Cabin;
  days: FareCalendarDayDto[];
  cheapestDate: string | null;
}

export interface PriceAnalysisDto {
  flightId: string;
  /** Today's per-adult total, rial. */
  currentPrice: number;
  daysToDeparture: number;
  insight: PriceInsight;
  /** One point per day, oldest first, ending today. */
  history: PricePoint[];
  /** The next days until departure (max 14), nearest first. */
  forecast: PricePoint[];
  /** Cheaper neighbouring dates on the same route, if any. */
  cheaperDates: Array<{ date: string; pricePerAdult: number; savings: number }>;
}
