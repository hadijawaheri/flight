import type {
  TransferCancellationPolicy,
  TransferDirection,
  VehicleClass,
} from "@flysmart/contracts";

/** A part of a city a transfer is priced to, measured from one airport. */
export interface TransferZoneRecord {
  id: string;
  nameFa: string;
  airportCode: string;
  distanceKm: number;
  /** Typical drive without traffic, minutes. */
  driveMinutes: number;
}

export interface TransferRateRequest {
  zone: TransferZoneRecord;
  direction: TransferDirection;
  pickupAt: Date;
  passengers: number;
  bags: number;
}

export interface TransferRateRecord {
  vehicle: VehicleClass;
  price: number;
  freeWaitingMinutes: number;
  cancellationPolicy: TransferCancellationPolicy;
}

/**
 * Source of airport transfer prices. Simulated first; a real supplier is selected by
 * TRANSFER_PROVIDER. Pickup times are not the provider's business: they come from
 * `pickupTimeFor` in contracts so every supplier gets the same instant.
 */
export abstract class TransferProvider {
  abstract readonly dataSource: "simulation" | "supplier";

  abstract zones(airportCode: string): Promise<TransferZoneRecord[]>;
  abstract findZone(zoneId: string): Promise<TransferZoneRecord | null>;

  /** The zone a point at this distance from the airport falls in (used for a booked hotel). */
  abstract zoneForDistance(
    airportCode: string,
    distanceKm: number,
  ): Promise<TransferZoneRecord | null>;

  /** Prices for every vehicle that can carry the party, any order. */
  abstract rates(request: TransferRateRequest): Promise<TransferRateRecord[]>;
}
