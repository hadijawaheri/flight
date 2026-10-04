import { z } from "zod";

export const FLIGHT_CLASSES = ["ECONOMY", "BUSINESS", "FIRST"] as const;
export type FlightClass = (typeof FLIGHT_CLASSES)[number];

export const FLIGHT_TYPES = ["SYSTEMIC", "CHARTER"] as const;
export type FlightType = (typeof FLIGHT_TYPES)[number];

export const PRICE_TRENDS = ["FALLING", "RISING", "STABLE"] as const;
export type PriceTrend = (typeof PRICE_TRENDS)[number];

export const PRICE_ADVICES = ["BUY_NOW", "WAIT"] as const;
export type PriceAdvice = (typeof PRICE_ADVICES)[number];

export const SORT_OPTIONS = ["price_asc", "price_desc", "departure_asc", "duration_asc"] as const;
export type FlightSortOption = (typeof SORT_OPTIONS)[number];

export const flightSearchQuerySchema = z.object({
  origin: z.string().trim().min(2, "مبدا باید مشخص شود").max(10),
  destination: z.string().trim().min(2, "مقصد باید مشخص شود").max(10),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ رفت باید YYYY-MM-DD باشد"),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ برگشت نامعتبر است")
    .optional(),
  adults: z.coerce.number().int().min(1, "حداقل ۱ بزرگسال الزامی است").max(9).default(1),
  children: z.coerce.number().int().min(0).max(9).default(0),
  infants: z.coerce.number().int().min(0).max(4).default(0),
  flightClass: z.enum(FLIGHT_CLASSES).optional(),
  isCharter: z.coerce.boolean().optional(),
  airline: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(SORT_OPTIONS).default("price_asc"),
});

export type FlightSearchQuery = z.infer<typeof flightSearchQuerySchema>;

export interface RefundRule {
  timeBeforeDeparture: string;
  penaltyPercentage: number;
  description: string;
}

export interface PricePrediction {
  trend: PriceTrend;
  confidence: number;
  advice: PriceAdvice;
  reasoning: string;
}

export interface FlightDto {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  airlineLogo: string;
  origin: string;
  originCode: string;
  originAirport: string;
  destination: string;
  destinationCode: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  aircraft: string;
  flightClass: FlightClass;
  flightType: FlightType;
  availableSeats: number;
  basePrice: number;
  finalPrice: number;
  baggageAllowanceKg: number;
  isRefundable: boolean;
  refundRules: RefundRule[];
  pricePrediction: PricePrediction;
  features: string[];
}

export interface FareMatrixItemDto {
  date: string;
  lowestPrice: number;
  isLowestInWeek: boolean;
  flightCount: number;
}

export const fareMatrixQuerySchema = z.object({
  origin: z.string().trim().min(2).max(10),
  destination: z.string().trim().min(2).max(10),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(3).max(14).default(7),
});

export type FareMatrixQuery = z.infer<typeof fareMatrixQuerySchema>;
