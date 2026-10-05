import { roundRial } from "../common/money";
import { distanceKm, getAirport, type Airport } from "./airports";

/**
 * Route network of the simulated market. Hub-and-spoke with Tehran Mehrabad as the domestic hub
 * and Imam Khomeini as the international gateway. A real provider replaces this whole file.
 */

export interface RouteSpec {
  origin: string;
  destination: string;
  international: boolean;
  distanceKm: number;
  /** Scheduled frequencies per direction per day. */
  flightsPerDay: number;
  blockMinutes: number;
  /** Economy base fare before airline, season and demand adjustments (rial). */
  baseFareRial: number;
}

/** Relative traffic weight of Iranian airports; drives the number of daily frequencies. */
const AIRPORT_WEIGHT: Record<string, number> = {
  THR: 100,
  MHD: 60,
  SYZ: 50,
  IFN: 40,
  TBZ: 38,
  AWZ: 38,
  KIH: 48,
  BND: 34,
  GSM: 20,
  KER: 22,
  RAS: 20,
  ZAH: 14,
  OMH: 16,
  AZD: 16,
  BUZ: 14,
  KSH: 15,
  SRY: 12,
  ADU: 8,
  HDM: 8,
  ABD: 12,
  ZBR: 10,
  BJB: 6,
  GBT: 8,
  SDG: 8,
  KHD: 6,
  BXR: 5,
  RZR: 8,
  XBJ: 6,
  JWN: 5,
  LRR: 5,
  AJK: 5,
  IIL: 5,
  DEF: 5,
  BDH: 5,
  YES: 6,
  IKA: 100,
};

const SECONDARY_HUBS = new Set(["MHD", "SYZ", "IFN", "TBZ", "AWZ", "KIH", "BND"]);

const INTL_DESTINATIONS: Record<string, readonly string[]> = {
  IKA: [
    "IST",
    "SAW",
    "ESB",
    "DXB",
    "SHJ",
    "AUH",
    "DOH",
    "KWI",
    "MCT",
    "NJF",
    "BGW",
    "EVN",
    "TBS",
    "GYD",
  ],
  THR: ["NJF", "BGW", "SAW"],
  MHD: ["IST", "DXB", "NJF", "BGW", "DOH", "SHJ"],
  SYZ: ["DXB", "DOH", "IST", "NJF", "SHJ", "KWI"],
  IFN: ["DXB", "IST", "NJF", "BGW", "DOH"],
  TBZ: ["IST", "EVN", "GYD", "DXB", "TBS", "NJF"],
  KIH: ["DXB", "SHJ", "DOH"],
  BND: ["DXB", "SHJ", "DOH", "MCT", "AUH"],
  AWZ: ["NJF", "BGW", "DXB", "KWI"],
};

const FOREIGN_WEIGHT: Record<string, number> = {
  IST: 9,
  SAW: 4,
  ESB: 2,
  DXB: 9,
  SHJ: 3,
  AUH: 2,
  DOH: 4,
  KWI: 2,
  MCT: 2,
  NJF: 5,
  BGW: 4,
  EVN: 3,
  TBS: 2,
  GYD: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isIranian(airport: Airport): boolean {
  return airport.countryCode === "IR";
}

function internationalPartner(
  a: Airport,
  b: Airport,
): { iranian: Airport; foreign: Airport } | null {
  const [iranian, foreign] = isIranian(a) ? [a, b] : [b, a];
  if (!isIranian(iranian) || isIranian(foreign)) return null;
  return INTL_DESTINATIONS[iranian.code]?.includes(foreign.code) ? { iranian, foreign } : null;
}

function domesticExists(a: Airport, b: Airport): boolean {
  if (a.code === "IKA" || b.code === "IKA") return false;
  if (a.code === "THR" || b.code === "THR") return true;
  return SECONDARY_HUBS.has(a.code) && SECONDARY_HUBS.has(b.code);
}

function domesticFrequencies(a: Airport, b: Airport): number {
  if (a.code === "THR" || b.code === "THR") {
    const other = a.code === "THR" ? b : a;
    return clamp(Math.round((AIRPORT_WEIGHT[other.code] ?? 5) / 5), 1, 14);
  }
  const weight = Math.min(AIRPORT_WEIGHT[a.code] ?? 5, AIRPORT_WEIGHT[b.code] ?? 5);
  return clamp(Math.round(weight / 14), 1, 4);
}

const cache = new Map<string, RouteSpec | null>();

export function getRoute(originCode: string, destinationCode: string): RouteSpec | undefined {
  const key = `${originCode}-${destinationCode}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached ?? undefined;

  const origin = getAirport(originCode);
  const destination = getAirport(destinationCode);
  let spec: RouteSpec | null = null;

  if (origin && destination && origin.code !== destination.code) {
    const km = distanceKm(origin, destination);
    const partner = internationalPartner(origin, destination);
    if (partner) {
      const base = partner.iranian.code === "IKA" ? 1 : 0.5;
      const weight = FOREIGN_WEIGHT[partner.foreign.code] ?? 2;
      spec = {
        origin: origin.code,
        destination: destination.code,
        international: true,
        distanceKm: Math.round(km),
        flightsPerDay: clamp(Math.round(weight * base), 1, 9),
        blockMinutes: Math.round(40 + km / 12.5),
        baseFareRial: roundRial(30_000_000 + 40_000 * km),
      };
    } else if (isIranian(origin) && isIranian(destination) && domesticExists(origin, destination)) {
      spec = {
        origin: origin.code,
        destination: destination.code,
        international: false,
        distanceKm: Math.round(km),
        flightsPerDay: domesticFrequencies(origin, destination),
        blockMinutes: Math.round(35 + km / 12),
        baseFareRial: roundRial(Math.max(15_000_000, 4_000_000 + 52_000 * km)),
      };
    }
  }

  cache.set(key, spec);
  return spec ?? undefined;
}

/** Every destination reachable from an airport, used by the budget explorer. */
export function routesFrom(originCode: string, airportCodes: readonly string[]): RouteSpec[] {
  const routes: RouteSpec[] = [];
  for (const code of airportCodes) {
    const route = getRoute(originCode, code);
    if (route) routes.push(route);
  }
  return routes;
}
