import type {
  BedType,
  HotelCancellationPolicy,
  MealPlan,
  NightlyRateDto,
} from "@flysmart/contracts";

/** One hotel as a supplier describes it, independent of dates. */
export interface HotelRecord {
  id: string;
  nameFa: string;
  nameEn: string;
  stars: number;
  /** Airport the hotel's city is served from. */
  airportCode: string;
  cityFa: string;
  neighbourhoodFa: string;
  addressFa: string;
  distanceToAirportKm: number;
  distanceToCenterKm: number;
  /** Local wall clock, `HH:mm`. */
  checkInTime: string;
  checkOutTime: string;
  utcOffsetMinutes: number;
  amenitiesFa: string[];
}

export interface HotelStay {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
}

/** A room type priced for one stay, per room. */
export interface RoomRateRecord {
  id: string;
  hotelId: string;
  nameFa: string;
  bed: BedType;
  maxOccupancy: number;
  mealPlan: MealPlan;
  nightlyRates: NightlyRateDto[];
  cancellationPolicy: HotelCancellationPolicy;
  roomsLeft: number;
}

/**
 * Source of hotels and room prices. The simulation implements it for development and demos; a real
 * supplier (issue 18) plugs in behind the same contract and is selected by HOTEL_PROVIDER.
 */
export abstract class HotelProvider {
  abstract readonly dataSource: "simulation" | "supplier";

  /** Hotels in the city of an airport (or city-group) code. */
  abstract search(cityCodes: string[]): Promise<HotelRecord[]>;
  abstract find(hotelId: string): Promise<HotelRecord | null>;

  /** Room types that can host the party for the stay, with nightly prices per room. */
  abstract rates(hotel: HotelRecord, stay: HotelStay): Promise<RoomRateRecord[]>;
}
