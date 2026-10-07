import { z } from "zod";

import { isoDateSchema } from "../common/dates";
import type { AirlineRefDto } from "../flights/flights.schema";
import { locationCodeSchema } from "../flights/flights.schema";
import { type PriceVerdict } from "../pricing/price-insight";

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

/* ------------------------------- trip ideas by party and budget ------------------------------- */

export const TRIP_PARTY_KEYS = ["solo", "couple", "family", "group"] as const;
export type TripPartyKey = (typeof TRIP_PARTY_KEYS)[number];

export const TRIP_SCOPES = ["domestic", "international"] as const;
export type TripScope = (typeof TRIP_SCOPES)[number];

export interface TripPartySpec {
  key: TripPartyKey;
  label: string;
  description: string;
  adults: number;
  children: number;
  infants: number;
}

/** The travelling parties people actually plan for: alone, as a couple, a family of four, a group of friends. */
export const TRIP_PARTIES: Record<TripPartyKey, TripPartySpec> = {
  solo: {
    key: "solo",
    label: "تک‌نفره",
    description: "یک بزرگسال",
    adults: 1,
    children: 0,
    infants: 0,
  },
  couple: {
    key: "couple",
    label: "دونفره",
    description: "دو بزرگسال",
    adults: 2,
    children: 0,
    infants: 0,
  },
  family: {
    key: "family",
    label: "خانواده‌ی چهارنفره",
    description: "دو بزرگسال و دو کودک",
    adults: 2,
    children: 2,
    infants: 0,
  },
  group: {
    key: "group",
    label: "چهار نفر دوست",
    description: "چهار بزرگسال",
    adults: 4,
    children: 0,
    infants: 0,
  },
};

export const TRIP_BAND_IDS = ["saver", "balanced", "relaxed"] as const;
export type TripBandId = (typeof TRIP_BAND_IDS)[number];

/**
 * Where the cheap, middle and comfortable budgets end, as the total for the whole party in toman.
 * Calibrated to the simulated market's fares (a one-way adult fare is roughly 1.5–6.5M toman
 * domestically and 5–10M abroad), and scaled by how many full fares the party pays.
 */
const BAND_LIMITS_TOMAN: Record<TripPartyKey, Record<TripScope, readonly [number, number]>> = {
  solo: { domestic: [2_500_000, 4_000_000], international: [6_500_000, 9_000_000] },
  couple: { domestic: [5_000_000, 8_000_000], international: [13_000_000, 18_000_000] },
  family: { domestic: [7_500_000, 12_000_000], international: [22_000_000, 30_000_000] },
  group: { domestic: [10_000_000, 16_000_000], international: [26_000_000, 36_000_000] },
};

export interface TripBand {
  id: TripBandId;
  title: string;
  /** Inclusive lower bound, toman; 0 for the first band. */
  minToman: number;
  /** Inclusive upper bound, toman; null for the open-ended last band. */
  maxToman: number | null;
}

export function tripBands(party: TripPartyKey, scope: TripScope): TripBand[] {
  const [low, high] = BAND_LIMITS_TOMAN[party][scope];
  return [
    { id: "saver", title: "اقتصادی", minToman: 0, maxToman: low },
    { id: "balanced", title: "میان‌رده", minToman: low, maxToman: high },
    { id: "relaxed", title: "راحت‌تر", minToman: high, maxToman: null },
  ];
}

/** Which band a party total (rial) falls in; a boundary price belongs to the cheaper band. */
export function bandOfTotal(totalRial: number, party: TripPartyKey, scope: TripScope): TripBandId {
  const toman = totalRial / 10;
  const [low, high] = BAND_LIMITS_TOMAN[party][scope];
  if (toman <= low) return "saver";
  if (toman <= high) return "balanced";
  return "relaxed";
}

export const tripIdeasQuerySchema = z.object({
  origin: locationCodeSchema.default("TEH"),
  party: z.enum(TRIP_PARTY_KEYS).default("solo"),
  scope: z.enum(TRIP_SCOPES).default("domestic"),
  /** Length of the window searched for the cheapest day, 7–60. */
  days: z.coerce.number().int().min(7).max(60).default(30),
});
export type TripIdeasQuery = z.infer<typeof tripIdeasQuerySchema>;

export interface TripIdeaDto {
  flightId: string;
  destination: string;
  cityFa: string;
  countryFa: string;
  international: boolean;
  date: string;
  airline: AirlineRefDto;
  durationMinutes: number;
  /** All-in price for the whole party on this flight, rial. */
  totalForParty: number;
  /** The same fare split evenly, rial. */
  perPerson: number;
  band: TripBandId;
}

export interface TripIdeasDto {
  origin: string;
  party: TripPartyKey;
  scope: TripScope;
  adults: number;
  children: number;
  infants: number;
  /** Cheapest bookable flight per destination, cheapest first. */
  ideas: TripIdeaDto[];
  /** Why there are no ideas, when the origin simply has no such flights; otherwise null. */
  note: string | null;
}
