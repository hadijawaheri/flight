import { roundRial } from "../common/money";
import {
  type Airport,
  AIRPORTS,
  distanceKm,
  expandAirportCode,
  getAirport,
  locationLabel,
} from "./airports";

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
  /** Flown only as seasonal or pilgrim charters, so every flight on it is sold as a charter. */
  charterOnly?: boolean;
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

/**
 * Foreign airports each Iranian airport flies to. Routes are symmetric and always have exactly one
 * Iranian end. Only airports listed here have international service.
 */
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
    "JED",
    "MED",
    "SVO",
    "LED",
  ],
  THR: ["NJF", "BGW", "SAW"],
  MHD: ["IST", "DXB", "NJF", "BGW", "DOH", "SHJ", "JED", "MED", "SVO"],
  SYZ: ["DXB", "DOH", "IST", "NJF", "SHJ", "KWI", "JED", "MED"],
  IFN: ["DXB", "IST", "NJF", "BGW", "DOH", "JED", "MED"],
  TBZ: ["IST", "EVN", "GYD", "DXB", "TBS", "NJF", "JED", "MED"],
  // Kish–Doha is not a regular scheduled service, so it is left out of the network.
  KIH: ["DXB", "SHJ"],
  BND: ["DXB", "SHJ", "MCT", "AUH"],
  AWZ: ["NJF", "BGW", "DXB", "KWI"],
  KER: ["NJF", "BGW", "JED"],
  AZD: ["NJF", "BGW"],
  RAS: ["IST", "GYD", "NJF"],
  OMH: ["IST", "ESB"],
  GSM: ["DXB", "SHJ"],
};

/**
 * Pairs (Iranian-foreign) that run only as seasonal or pilgrim charters; the rest of the foreign
 * airport's routes stay scheduled. Hajj and Umrah flights are sold through pilgrim programmes, so
 * every Saudi route is charter; Tbilisi from Tabriz and St Petersburg are seasonal.
 */
const CHARTER_ONLY_PAIRS = new Set(["TBZ-TBS", "IKA-LED"]);
const CHARTER_ONLY_FOREIGN = new Set(["JED", "MED"]);

function isCharterOnly(iranian: Airport, foreign: Airport): boolean {
  return (
    CHARTER_ONLY_FOREIGN.has(foreign.code) ||
    CHARTER_ONLY_PAIRS.has(`${iranian.code}-${foreign.code}`)
  );
}

/**
 * Share of a foreign airport's hub frequencies that an Iranian airport gets. Imam Khomeini is the
 * gateway and keeps the full figure; secondary airports fly a fraction, never more than a few a day.
 */
const INTL_SHARE: Record<string, number> = {
  IKA: 1,
  MHD: 0.35,
  SYZ: 0.25,
  KIH: 0.25,
  BND: 0.25,
  THR: 0.25,
  IFN: 0.22,
  TBZ: 0.22,
  AWZ: 0.2,
};
const DEFAULT_INTL_SHARE = 0.15;

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
  JED: 3,
  MED: 2,
  SVO: 2,
  LED: 1,
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
      const share = INTL_SHARE[partner.iranian.code] ?? DEFAULT_INTL_SHARE;
      const weight = FOREIGN_WEIGHT[partner.foreign.code] ?? 2;
      const charterOnly = isCharterOnly(partner.iranian, partner.foreign);
      spec = {
        origin: origin.code,
        destination: destination.code,
        international: true,
        distanceKm: Math.round(km),
        flightsPerDay: clamp(Math.round(weight * share * (charterOnly ? 0.5 : 1)), 1, 9),
        blockMinutes: Math.round(40 + km / 12.5),
        baseFareRial: roundRial(30_000_000 + 40_000 * km),
        ...(charterOnly ? { charterOnly } : {}),
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

/* ------------------------------ what each airport offers ------------------------------ */

export const ROUTE_KINDS = ["DOMESTIC", "INTERNATIONAL"] as const;
export type RouteKind = (typeof ROUTE_KINDS)[number];

export const ROUTE_KIND_LABELS: Record<RouteKind, string> = {
  DOMESTIC: "داخلی",
  INTERNATIONAL: "خارجی",
};

/** Airports (real codes, never a group) a traveller can fly to directly; an origin group expands first. */
export function destinationsFrom(origin: string, kind?: RouteKind): string[] {
  const origins = expandAirportCode(origin);
  const found = new Set<string>();
  for (const airport of AIRPORTS) {
    for (const from of origins) {
      const route = getRoute(from, airport.code);
      if (!route) continue;
      if (kind && route.international !== (kind === "INTERNATIONAL")) continue;
      found.add(airport.code);
    }
  }
  return [...found];
}

/** True when the airport has at least one direct route of this kind. */
export function airportServes(code: string, kind: RouteKind): boolean {
  return destinationsFrom(code, kind).length > 0;
}

/** Every airport that has a route of this kind: the origins a traveller may start from. */
export function airportsServing(kind: RouteKind): Airport[] {
  return AIRPORTS.filter((airport) => airportServes(airport.code, kind));
}

/** Which kind of flight links two places, or null when no direct route exists. */
export function routeKindBetween(origin: string, destination: string): RouteKind | null {
  for (const from of expandAirportCode(origin)) {
    for (const to of expandAirportCode(destination)) {
      const route = getRoute(from, to);
      if (route) return route.international ? "INTERNATIONAL" : "DOMESTIC";
    }
  }
  return null;
}

const CITY_COUNT = AIRPORTS.reduce(
  (counts, airport) => counts.set(airport.cityFa, (counts.get(airport.cityFa) ?? 0) + 1),
  new Map<string, number>(),
);

/** The city, plus the airport's name where a city has more than one airport (Tehran, Istanbul). */
export function airportLabel(airport: Airport): string {
  if ((CITY_COUNT.get(airport.cityFa) ?? 0) <= 1) return airport.cityFa;
  return `${airport.cityFa} (${airport.nameFa === airport.cityFa ? airport.code : airport.nameFa})`;
}

/**
 * Why two places have no flight between them, in words a traveller can act on; null when there is a
 * route. The search form never offers such a pair, so this is for links, bookmarks and the assistant.
 */
export function routeProblem(origin: string, destination: string): string | null {
  if (routeKindBetween(origin, destination)) return null;

  const from = expandAirportCode(origin).map(getAirport);
  const to = expandAirportCode(destination).map(getAirport);
  if (from.some((a) => !a) || to.some((a) => !a) || from.length === 0 || to.length === 0) {
    return "فرودگاه مبدأ یا مقصد شناخته‌شده نیست";
  }
  const [a] = from as Airport[];
  const [b] = to as Airport[];
  if (!a || !b) return "فرودگاه مبدأ یا مقصد شناخته‌شده نیست";

  const iranianPair = from.every((x) => x && isIranian(x)) && to.every((x) => x && isIranian(x));
  if (iranianPair) {
    const gateway = [...from, ...to].find((x) => x && x.code === "IKA");
    if (gateway) {
      return "در این سرویس فرودگاه امام خمینی فقط پرواز خارجی دارد و پرواز داخلی از یا به آن ثبت نشده است. برای سفر داخلی، مهرآباد را انتخاب کنید.";
    }
    return `بین ${locationLabel(origin)} و ${locationLabel(destination)} پرواز مستقیم داخلی نداریم؛ معمولاً باید از تهران یا یکی از فرودگاه‌های اصلی عبور کنید.`;
  }
  if (from.every((x) => x && !isIranian(x)) && to.every((x) => x && !isIranian(x))) {
    return "فقط پروازهای از و به ایران ارائه می‌شود.";
  }
  const iranian = from.every((x) => x && isIranian(x)) ? a : b;
  const foreign = iranian === a ? b : a;
  if (!airportServes(iranian.code, "INTERNATIONAL") && iranian.code !== "TEH") {
    return `از ${iranian.cityFa} پرواز خارجی نداریم؛ فرودگاه‌های دارای پرواز خارجی را انتخاب کنید.`;
  }
  const gateways = [
    ...new Set(
      destinationsFrom(foreign.code)
        .map((code) => getAirport(code))
        .flatMap((airport) => (airport ? [airportLabel(airport)] : [])),
    ),
  ];
  const hint =
    gateways.length > 0
      ? ` پرواز به ${airportLabel(foreign)} از ${gateways.join("، ")} انجام می‌شود.`
      : "";
  return `بین ${airportLabel(iranian)} و ${airportLabel(foreign)} پرواز مستقیم نداریم.${hint}`;
}

/** A sentence explaining why an origin has no flights of a kind; null when it has some. */
export function kindGap(origin: string, kind: RouteKind): string | null {
  if (airportServes(origin, kind)) return null;
  const places = expandAirportCode(origin).map(getAirport);
  const first = places[0];
  if (!first) return "فرودگاه مبدأ شناخته‌شده نیست";
  const name = airportLabel(first);
  if (kind === "DOMESTIC") {
    return isIranian(first)
      ? `در این سرویس ${name} فقط پرواز خارجی دارد؛ برای سفر داخلی مهرآباد یا یک شهر دیگر را انتخاب کنید.`
      : "پرواز داخلی فقط بین شهرهای ایران است.";
  }
  return isIranian(first)
    ? `از ${name} پرواز خارجی نداریم؛ فرودگاه‌های دارای پرواز خارجی مثل امام خمینی، مشهد یا شیراز را امتحان کنید.`
    : `${name} مبدأ پرواز خارجی ما نیست؛ پروازهای خارجی از و به ایران است.`;
}
