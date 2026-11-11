import { z } from "zod";

import { diffDaysIso, isoDateSchema } from "../common/dates";
import { isKnownLocationCode } from "../reference/airports";

export const MEAL_PLANS = ["ROOM_ONLY", "BREAKFAST", "HALF_BOARD", "FULL_BOARD"] as const;
export type MealPlan = (typeof MEAL_PLANS)[number];

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  ROOM_ONLY: "بدون وعده‌ی غذایی",
  BREAKFAST: "با صبحانه",
  HALF_BOARD: "صبحانه و شام",
  FULL_BOARD: "سه وعده",
};

export const BED_TYPES = ["DOUBLE", "TWIN", "SINGLE", "TRIPLE"] as const;
export type BedType = (typeof BED_TYPES)[number];

export const BED_TYPE_LABELS: Record<BedType, string> = {
  DOUBLE: "یک تخت دونفره",
  TWIN: "دو تخت یک‌نفره",
  SINGLE: "یک تخت یک‌نفره",
  TRIPLE: "سه تخت یک‌نفره",
};

export const HOTEL_SORTS = ["recommended", "price", "stars", "airport"] as const;
export type HotelSort = (typeof HOTEL_SORTS)[number];

/** A stay longer than this is not a trip add-on; the search refuses it. */
export const MAX_HOTEL_NIGHTS = 30;
export const MAX_HOTEL_ROOMS = 4;
/** Same length as a flight seat hold, so both run out together at checkout. */
export const HOTEL_HOLD_MINUTES = 15;

const booleanFlag = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((value) => value === true || value === "true" || value === "1")
  .optional();

const stayFields = {
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  adults: z.coerce.number().int().min(1, "حداقل یک بزرگسال لازم است").max(9).default(1),
  children: z.coerce.number().int().min(0).max(8).default(0),
  rooms: z.coerce.number().int().min(1).max(MAX_HOTEL_ROOMS).default(1),
};

function refineStay(
  value: { checkIn: string; checkOut: string; adults: number; rooms: number },
  ctx: z.RefinementCtx,
): void {
  const nights = diffDaysIso(value.checkOut, value.checkIn);
  if (nights < 1) {
    ctx.addIssue({
      code: "custom",
      message: "تاریخ خروج باید بعد از تاریخ ورود باشد",
      path: ["checkOut"],
    });
  } else if (nights > MAX_HOTEL_NIGHTS) {
    ctx.addIssue({
      code: "custom",
      message: `حداکثر ${MAX_HOTEL_NIGHTS} شب`,
      path: ["checkOut"],
    });
  }
  if (value.rooms > value.adults) {
    ctx.addIssue({
      code: "custom",
      message: "در هر اتاق دست‌کم یک بزرگسال لازم است",
      path: ["rooms"],
    });
  }
}

export const hotelSearchQuerySchema = z
  .object({
    /** Airport or city-group code of the destination (THR and IKA both mean Tehran). */
    city: z.string().trim().toUpperCase().refine(isKnownLocationCode, "شهر مقصد شناخته نشد"),
    ...stayFields,
    minStars: z.coerce.number().int().min(1).max(5).optional(),
    /** Upper bound on the whole-stay total of the cheapest room, rial. */
    maxTotal: z.coerce.number().int().positive().optional(),
    breakfast: booleanFlag,
    freeCancellation: booleanFlag,
    sort: z.enum(HOTEL_SORTS).default("recommended"),
  })
  .superRefine(refineStay);
export type HotelSearchQuery = z.infer<typeof hotelSearchQuerySchema>;

export const hotelStayQuerySchema = z.object(stayFields).superRefine(refineStay);
export type HotelStayQuery = z.infer<typeof hotelStayQuerySchema>;

export const createRoomHoldSchema = z
  .object({
    hotelId: z.string().trim().min(1),
    roomId: z.string().trim().min(1),
    ...stayFields,
    /** The total the traveller saw; a different current price answers 409 FARE_CHANGED. */
    quotedTotal: z.coerce.number().int().positive(),
  })
  .superRefine(refineStay);
export type CreateRoomHoldInput = z.infer<typeof createRoomHoldSchema>;

/* ---------------------------------- cancellation ---------------------------------- */

export interface HotelCancellationTier {
  /** The tier applies while at least this many hours remain before check-in time. */
  minHoursBeforeCheckIn: number;
  penaltyPercent: number;
  label: string;
}

/**
 * Stepped penalty on the stay total, the way Iranian hotels and booking sites publish it
 * ("free until 72 hours before, then first night, then everything").
 */
export interface HotelCancellationPolicy {
  refundable: boolean;
  tiers: HotelCancellationTier[];
  /** Penalty once check-in time has passed without arrival. */
  noShowPenaltyPercent: number;
}

/* ---------------------------------- response shapes ---------------------------------- */

export interface NightlyRateDto {
  /** The night that starts on this date. */
  date: string;
  amount: number;
}

export interface RoomOfferDto {
  id: string;
  nameFa: string;
  bed: BedType;
  maxOccupancy: number;
  mealPlan: MealPlan;
  /** One entry per night of the stay, rial, for one room. */
  nightlyRates: NightlyRateDto[];
  /** All nights for all requested rooms, rial: the number shown on the card. */
  total: number;
  cancellationPolicy: HotelCancellationPolicy;
  /** Local `YYYY-MM-DDTHH:mm` until which cancelling is free, or null when it never is. */
  freeCancellationUntil: string | null;
  roomsLeft: number;
}

export interface HotelOfferDto {
  id: string;
  nameFa: string;
  nameEn: string;
  stars: number;
  cityFa: string;
  /** Nearest airport with flights, used for transfers and the "near the airport" sort. */
  airportCode: string;
  neighbourhoodFa: string;
  addressFa: string;
  distanceToAirportKm: number;
  distanceToCenterKm: number;
  /** Local wall clock, `HH:mm`. */
  checkInTime: string;
  checkOutTime: string;
  amenitiesFa: string[];
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Cheapest room total for the whole stay and every requested room, rial. */
  fromTotal: number;
  breakfastAvailable: boolean;
  freeCancellationAvailable: boolean;
}

export interface HotelSearchResultDto {
  hotels: HotelOfferDto[];
  checkIn: string;
  checkOut: string;
  nights: number;
}

export interface HotelDetailDto extends HotelOfferDto {
  rooms: RoomOfferDto[];
}

/** Rooms set aside for a traveller while they finish checkout. */
export interface RoomHoldDto {
  id: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  total: number;
  expiresAt: string;
}
