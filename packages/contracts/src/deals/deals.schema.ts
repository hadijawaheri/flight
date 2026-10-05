import { z } from "zod";

import { isoDateSchema } from "../common/dates";
import { type PriceVerdict } from "../pricing/price-insight";
import type { AirlineRefDto } from "../flights/flights.schema";
import { locationCodeSchema } from "../flights/flights.schema";

export const flashDealsQuerySchema = z.object({
  origin: locationCodeSchema.default("THR"),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});
export type FlashDealsQuery = z.infer<typeof flashDealsQuerySchema>;

export const DESTINATION_SCOPES = ["all", "domestic", "international"] as const;

export const exploreQuerySchema = z.object({
  origin: locationCodeSchema.default("THR"),
  /** Maximum total per adult, rial. */
  budget: z.coerce.number().int().positive(),
  from: isoDateSchema.optional(),
  /** Length of the window searched for the cheapest day, 7–60. */
  days: z.coerce.number().int().min(7).max(60).default(30),
  scope: z.enum(DESTINATION_SCOPES).default("all"),
});
export type ExploreQuery = z.infer<typeof exploreQuerySchema>;

export interface DealDto {
  flightId: string;
  origin: string;
  destination: string;
  originCityFa: string;
  destinationCityFa: string;
  date: string;
  airline: AirlineRefDto;
  pricePerAdult: number;
  /** Median price of the same flight over the observed window. */
  typicalPrice: number;
  discountPercent: number;
  verdict: PriceVerdict;
}

export interface ExploreDestinationDto {
  destination: string;
  cityFa: string;
  countryFa: string;
  international: boolean;
  cheapestPricePerAdult: number;
  cheapestDate: string;
  flightId: string;
  durationMinutes: number;
}

export interface ExploreResultDto {
  budget: number;
  destinations: ExploreDestinationDto[];
}
