import {
  FREE_WAITING_MINUTES_AIRPORT,
  FREE_WAITING_MINUTES_CITY,
  getAirport,
  roundRial,
  type TransferCancellationPolicy,
  utcToLocalString,
  VEHICLE_CLASSES,
  type VehicleClass,
  vehicleFits,
} from "@flysmart/contracts";

import { findZone, zonesFor } from "./simulation/zones.js";
import type {
  TransferRateRecord,
  TransferRateRequest,
  TransferZoneRecord,
} from "./transfer.provider.js";
import { TransferProvider } from "./transfer.provider.js";

/** Placeholder tariff for the simulation, rial: flag fall plus a per-km rate, by vehicle. */
const TARIFF: Record<VehicleClass, { base: number; perKm: number }> = {
  SEDAN: { base: 2_500_000, perKm: 180_000 },
  VAN: { base: 4_000_000, perKm: 260_000 },
  VIP: { base: 6_000_000, perKm: 420_000 },
};
/** Night pickups (00:00–06:00 local) cost more, as airport taxis charge. */
const NIGHT_SURCHARGE = 0.25;
/** Suitcases beyond two are charged per bag. */
const FREE_BAGS = 2;
const EXTRA_BAG_RIAL = 300_000;

const CANCELLATION: TransferCancellationPolicy = {
  freeUntilHoursBefore: 12,
  latePenaltyPercent: 100,
  label: "تا ۱۲ ساعت پیش از زمان سوار شدن رایگان؛ بعد از آن کل مبلغ",
};

export class SimulatedTransferProvider extends TransferProvider {
  readonly dataSource = "simulation" as const;

  zones(airportCode: string): Promise<TransferZoneRecord[]> {
    return Promise.resolve(zonesFor(airportCode));
  }

  findZone(zoneId: string): Promise<TransferZoneRecord | null> {
    return Promise.resolve(findZone(zoneId));
  }

  zoneForDistance(airportCode: string, distanceKm: number): Promise<TransferZoneRecord | null> {
    const zones = zonesFor(airportCode);
    const nearest = zones.sort(
      (a, b) => Math.abs(a.distanceKm - distanceKm) - Math.abs(b.distanceKm - distanceKm),
    )[0];
    return Promise.resolve(nearest ?? null);
  }

  rates(request: TransferRateRequest): Promise<TransferRateRecord[]> {
    const offset = getAirport(request.zone.airportCode)?.utcOffsetMinutes ?? 210;
    const hour = Number(utcToLocalString(request.pickupAt, offset).slice(11, 13));
    const night = hour < 6;
    const extraBags = Math.max(0, request.bags - FREE_BAGS);
    return Promise.resolve(
      VEHICLE_CLASSES.filter((vehicle) =>
        vehicleFits(vehicle, request.passengers, request.bags),
      ).map((vehicle) => {
        const tariff = TARIFF[vehicle];
        const fare = tariff.base + tariff.perKm * request.zone.distanceKm;
        const price = fare * (night ? 1 + NIGHT_SURCHARGE : 1) + extraBags * EXTRA_BAG_RIAL;
        return {
          vehicle,
          price: roundRial(price, 100_000),
          freeWaitingMinutes:
            request.direction === "FROM_AIRPORT"
              ? FREE_WAITING_MINUTES_AIRPORT
              : FREE_WAITING_MINUTES_CITY,
          cancellationPolicy: CANCELLATION,
        };
      }),
    );
  }
}
