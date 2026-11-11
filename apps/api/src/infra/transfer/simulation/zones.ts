import {
  type Airport,
  AIRPORTS,
  getAirport,
  randomBetween,
  seededRandom,
} from "@flysmart/contracts";

import type { TransferZoneRecord } from "../transfer.provider.js";

/**
 * Seeded city zones around each domestic airport. Zone ids are `Z` + airport + slot, so a zone is
 * rebuilt from its id like hotels and flights are.
 */

const ZONE_PATTERN = /^Z([A-Z]{3})(\d)$/;

const ZONE_NAMES = ["مرکز شهر", "شمال شهر", "غرب شهر", "شرق شهر", "جنوب شهر"] as const;

/** Airports far from the city they serve; zones there start at this distance. */
const REMOTE_AIRPORT_MIN_KM: Record<string, number> = { IKA: 35 };

/** Average urban speed for the drive time, km/h. */
const CITY_SPEED_KMH = 30;

function domestic(code: string): Airport | null {
  const airport = getAirport(code);
  return airport && airport.countryCode === "IR" ? airport : null;
}

function zoneCount(airport: Airport): number {
  return airport.code === "THR" || airport.code === "IKA" || airport.code === "MHD" ? 5 : 3;
}

function buildZone(airport: Airport, slot: number): TransferZoneRecord {
  const random = seededRandom(`zone:${airport.code}:${slot}`);
  const base = REMOTE_AIRPORT_MIN_KM[airport.code] ?? 3;
  const distanceKm = Math.round(base + randomBetween(random, 4, 18) + slot * 2);
  return {
    id: `Z${airport.code}${slot}`,
    nameFa: `${airport.cityFa}، ${ZONE_NAMES[slot - 1] ?? ZONE_NAMES[0]}`,
    airportCode: airport.code,
    distanceKm,
    driveMinutes: Math.round((distanceKm / CITY_SPEED_KMH) * 60),
  };
}

export function zonesFor(airportCode: string): TransferZoneRecord[] {
  const airport = domestic(airportCode);
  if (!airport) return [];
  return Array.from({ length: zoneCount(airport) }, (_, index) => buildZone(airport, index + 1));
}

export function findZone(zoneId: string): TransferZoneRecord | null {
  const match = ZONE_PATTERN.exec(zoneId.toUpperCase());
  if (!match) return null;
  const airport = domestic(match[1]!);
  const slot = Number(match[2]);
  if (!airport || slot < 1 || slot > zoneCount(airport)) return null;
  return buildZone(airport, slot);
}

/** Every domestic airport has zones; used by tests and the assistant. */
export const TRANSFER_AIRPORTS: readonly string[] = AIRPORTS.filter(
  (airport) => airport.countryCode === "IR",
).map((airport) => airport.code);
