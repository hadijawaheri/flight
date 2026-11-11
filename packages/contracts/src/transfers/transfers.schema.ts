import { z } from "zod";

export const TRANSFER_DIRECTIONS = ["TO_AIRPORT", "FROM_AIRPORT"] as const;
export type TransferDirection = (typeof TRANSFER_DIRECTIONS)[number];

export const TRANSFER_DIRECTION_LABELS: Record<TransferDirection, string> = {
  TO_AIRPORT: "رفتن به فرودگاه",
  FROM_AIRPORT: "از فرودگاه",
};

export const VEHICLE_CLASSES = ["SEDAN", "VAN", "VIP"] as const;
export type VehicleClass = (typeof VEHICLE_CLASSES)[number];

export interface VehicleSpec {
  nameFa: string;
  maxPassengers: number;
  /** Checked suitcases; carry-ons ride on laps and do not count. */
  maxBags: number;
}

export const VEHICLES: Record<VehicleClass, VehicleSpec> = {
  SEDAN: { nameFa: "سواری", maxPassengers: 4, maxBags: 3 },
  VAN: { nameFa: "ون", maxPassengers: 7, maxBags: 8 },
  VIP: { nameFa: "سواری VIP", maxPassengers: 3, maxBags: 3 },
};

export function vehicleFits(vehicle: VehicleClass, passengers: number, bags: number): boolean {
  const spec = VEHICLES[vehicle];
  return passengers <= spec.maxPassengers && bags <= spec.maxBags;
}

/** Waiting time at arrivals before the driver may charge or leave. */
export const FREE_WAITING_MINUTES_AIRPORT = 60;
/** Waiting time at a hotel or address for a ride to the airport. */
export const FREE_WAITING_MINUTES_CITY = 15;

export const transferQuoteQuerySchema = z
  .object({
    /** The flight the ride meets or catches. Either this or `bookingId`. */
    flightId: z.string().trim().min(1).optional(),
    bookingId: z.string().trim().min(1).optional(),
    direction: z.enum(TRANSFER_DIRECTIONS),
    /** Hotel the ride starts or ends at, or `zoneId` when the traveller has no hotel with us. */
    hotelId: z.string().trim().min(1).optional(),
    zoneId: z.string().trim().min(1).optional(),
    passengers: z.coerce.number().int().min(1).max(9).default(1),
    bags: z.coerce.number().int().min(0).max(20).default(1),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.flightId) === Boolean(value.bookingId)) {
      ctx.addIssue({
        code: "custom",
        message: "یکی از پرواز یا رزرو را مشخص کنید",
        path: ["flightId"],
      });
    }
    if (Boolean(value.hotelId) === Boolean(value.zoneId)) {
      ctx.addIssue({
        code: "custom",
        message: "یکی از هتل یا منطقه را مشخص کنید",
        path: ["zoneId"],
      });
    }
  });
export type TransferQuoteQuery = z.infer<typeof transferQuoteQuerySchema>;

/* ---------------------------------- response shapes ---------------------------------- */

export interface TransferZoneDto {
  id: string;
  nameFa: string;
  /** Airport the zone is served from. */
  airportCode: string;
  distanceKm: number;
}

export interface TransferCancellationPolicy {
  /** Free cancellation while at least this many hours remain before pickup. */
  freeUntilHoursBefore: number;
  /** Share of the price kept when cancelled later, or on no-show. */
  latePenaltyPercent: number;
  label: string;
}

export interface TransferOfferDto {
  id: string;
  direction: TransferDirection;
  vehicle: VehicleClass;
  vehicleNameFa: string;
  maxPassengers: number;
  maxBags: number;
  /** Whole ride, rial. */
  price: number;
  /** Pickup instant (UTC ISO) and the same moment on the local wall clock, `YYYY-MM-DDTHH:mm`. */
  pickupAt: string;
  pickupLocalTime: string;
  pickupPlaceFa: string;
  dropoffPlaceFa: string;
  freeWaitingMinutes: number;
  cancellationPolicy: TransferCancellationPolicy;
}

export interface TransferQuoteDto {
  direction: TransferDirection;
  flightId: string;
  airportCode: string;
  zone: TransferZoneDto;
  /** Vehicles that fit the party, cheapest first. */
  offers: TransferOfferDto[];
}
