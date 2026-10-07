import {
  type AircraftType,
  type Airline,
  AIRLINES,
  type Airport,
  type FareFamily,
  fitsSector,
  type FlightKey,
  type FlightType,
  getAircraft,
  getAirport,
  getRoute,
  localToUtc,
  persianWeekday,
  type RouteSpec,
  unitFromKey,
} from "@flysmart/contracts";

/**
 * Deterministic timetable of the simulated market. Everything here is a pure function of the
 * route, the date and the slot, so the same flight id always yields the same flight and a fare
 * quoted to a traveller can be re-derived later. A real provider replaces this directory.
 */

export type ScheduleKey = Omit<FlightKey, "cabin">;

export interface ScheduledFlight {
  key: ScheduleKey;
  origin: Airport;
  destination: Airport;
  route: RouteSpec;
  airline: Airline;
  aircraft: AircraftType;
  flightNumber: string;
  /** Local minutes after midnight at the origin. */
  departureMinutes: number;
  blockMinutes: number;
  departureUtc: Date;
  arrivalUtc: Date;
  flightType: FlightType;
  fareFamily: FareFamily;
}

interface Slot {
  index: number;
  airline: Airline;
  aircraft: AircraftType;
  flightNumber: string;
  departureMinutes: number;
  blockMinutes: number;
  flightType: FlightType;
  fareFamily: FareFamily;
}

const OPERATING_PROBABILITY = 0.85;
const roundTo = (value: number, step: number): number => Math.round(value / step) * step;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

const operatorCache = new Map<string, Airline[]>();

/**
 * The fleet types an airline could put on a route: sector length rules out wide-bodies on short
 * hops (Kish–Dubai) and turboprops or old jets on long ones.
 */
export function suitableAircraft(airline: Airline, route: RouteSpec): AircraftType[] {
  return airline.fleet
    .map((id) => getAircraft(id))
    .filter(
      (aircraft): aircraft is AircraftType =>
        aircraft !== undefined && fitsSector(aircraft, route.distanceKm),
    );
}

/** Airlines that serve a route; stable over time, symmetric in direction. */
export function operatorsFor(route: RouteSpec): Airline[] {
  const cacheKey = `${route.origin}-${route.destination}`;
  const cached = operatorCache.get(cacheKey);
  if (cached) return cached;

  const origin = getAirport(route.origin);
  const destination = getAirport(route.destination);
  if (!origin || !destination) return [];
  const pair = pairKey(origin.code, destination.code);

  let operators: Airline[];
  if (route.international) {
    const foreign = origin.countryCode === "IR" ? destination : origin;
    const iranian = origin.countryCode === "IR" ? origin : destination;
    const eligible = AIRLINES.filter((airline) => {
      if (!airline.destinations?.includes(foreign.code)) return false;
      if (airline.gateways && !airline.gateways.includes(iranian.code)) return false;
      // A carrier with nothing that fits the sector (a wide-body-only fleet on a short hop) skips it.
      if (suitableAircraft(airline, route).length === 0) return false;
      return !(
        airline.kind === "IRANIAN" &&
        airline.bases[0] !== "*" &&
        !airline.bases.includes(iranian.code) &&
        iranian.code !== "IKA"
      );
    });
    const presence = (airline: Airline): number =>
      unitFromKey(`${airline.code}|${pair}|presence`) / airline.network;
    operators = eligible.filter((airline) => presence(airline) < 1);
    // Someone must fly a route in the network: the likeliest eligible carrier, else Iran Air.
    const likeliest = [...eligible].sort((x, y) => presence(x) - presence(y))[0];
    if (operators.length === 0 && likeliest) operators = [likeliest];
    if (operators.length === 0) operators = AIRLINES.filter((airline) => airline.code === "IR");
  } else {
    operators = AIRLINES.filter((airline) => {
      if (airline.kind !== "IRANIAN") return false;
      const serves =
        airline.bases[0] === "*" ||
        airline.bases.includes(origin.code) ||
        airline.bases.includes(destination.code);
      return (
        serves &&
        suitableAircraft(airline, route).length > 0 &&
        unitFromKey(`${airline.code}|${pair}|presence`) < airline.network
      );
    });
    if (operators.length === 0) operators = AIRLINES.filter((airline) => airline.code === "IR");
  }
  operatorCache.set(cacheKey, operators);
  return operators;
}

function weightedPick<T extends { network: number }>(items: readonly T[], unit: number): T {
  const total = items.reduce((sum, item) => sum + item.network, 0);
  let cursor = unit * total;
  for (const item of items) {
    cursor -= item.network;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1] as T;
}

function chooseAircraft(airline: Airline, route: RouteSpec, unit: number): AircraftType {
  const pool = suitableAircraft(airline, route);
  const aircraft = pool[Math.floor(unit * pool.length) % pool.length];
  // operatorsFor only returns airlines with a fitting type, so an empty pool is a programming error.
  if (!aircraft)
    throw new Error(`${airline.code} has no aircraft for ${route.origin}-${route.destination}`);
  return aircraft;
}

function chooseFareFamily(airline: Airline, flightType: FlightType, unit: number): FareFamily {
  if (flightType === "CHARTER") return "SAVER";
  const [saver, standard] =
    airline.priceFactor < 1 ? [0.5, 0.9] : airline.priceFactor > 1.1 ? [0.2, 0.7] : [0.35, 0.8];
  return unit < saver ? "SAVER" : unit < standard ? "STANDARD" : "FLEX";
}

const slotCache = new Map<string, Slot[]>();

function slotsFor(route: RouteSpec): Slot[] {
  const cacheKey = `${route.origin}-${route.destination}`;
  const cached = slotCache.get(cacheKey);
  if (cached) return cached;

  const operators = operatorsFor(route);
  const count = Math.max(1, route.flightsPerDay);
  const start = route.international ? 120 : 360;
  const end = route.international ? 1380 : 1350;
  const span = (end - start) / count;
  const routeKey = `${route.origin}${route.destination}`;

  const slots = Array.from({ length: count }, (_, index): Slot => {
    const seed = `${routeKey}|${index}`;
    const airline = weightedPick(operators, unitFromKey(`${seed}|airline`));
    const aircraft = chooseAircraft(airline, route, unitFromKey(`${seed}|aircraft`));
    const jitter = (unitFromKey(`${seed}|time`) - 0.5) * span * 0.7;
    const departureMinutes = clamp(roundTo(start + span * (index + 0.5) + jitter, 5), 0, 1435);
    const speedScale = clamp(800 / aircraft.cruiseKmh, 0.92, 1.45);
    const blockMinutes = Math.max(35, roundTo(route.blockMinutes * speedScale, 5));
    const flightType: FlightType =
      route.charterOnly ||
      (!route.international &&
        airline.kind === "IRANIAN" &&
        unitFromKey(`${seed}|charter`) < airline.charterShare)
        ? "CHARTER"
        : "SYSTEMIC";
    const number = 100 + Math.floor(unitFromKey(`${airline.code}|${seed}|number`) * 8800);
    return {
      index,
      airline,
      aircraft,
      flightNumber: `${airline.code}${number}`,
      departureMinutes,
      blockMinutes,
      flightType,
      fareFamily: chooseFareFamily(airline, flightType, unitFromKey(`${seed}|family`)),
    };
  });
  slotCache.set(cacheKey, slots);
  return slots;
}

function operatesOn(route: RouteSpec, slot: Slot, isoDate: string): boolean {
  if (slot.index < 2) return true;
  const weekday = persianWeekday(isoDate);
  return (
    unitFromKey(`${route.origin}${route.destination}|${slot.index}|wd${weekday}`) <
    OPERATING_PROBABILITY
  );
}

function materialize(route: RouteSpec, slot: Slot, isoDate: string): ScheduledFlight | null {
  const origin = getAirport(route.origin);
  const destination = getAirport(route.destination);
  if (!origin || !destination) return null;
  const departureUtc = localToUtc(isoDate, slot.departureMinutes, origin.utcOffsetMinutes);
  return {
    key: {
      origin: origin.code,
      destination: destination.code,
      date: isoDate,
      airlineCode: slot.airline.code,
      slot: slot.index,
    },
    origin,
    destination,
    route,
    airline: slot.airline,
    aircraft: slot.aircraft,
    flightNumber: slot.flightNumber,
    departureMinutes: slot.departureMinutes,
    blockMinutes: slot.blockMinutes,
    departureUtc,
    arrivalUtc: new Date(departureUtc.getTime() + slot.blockMinutes * 60_000),
    flightType: slot.flightType,
    fareFamily: slot.fareFamily,
  };
}

/** Every flight that departs `origin` for `destination` on a local date, ordered by departure. */
export function scheduleFor(
  origin: string,
  destination: string,
  isoDate: string,
): ScheduledFlight[] {
  const route = getRoute(origin, destination);
  if (!route) return [];
  return slotsFor(route)
    .filter((slot) => operatesOn(route, slot, isoDate))
    .map((slot) => materialize(route, slot, isoDate))
    .filter((flight): flight is ScheduledFlight => flight !== null)
    .sort((a, b) => a.departureMinutes - b.departureMinutes);
}

export function findScheduled(key: ScheduleKey): ScheduledFlight | null {
  const route = getRoute(key.origin, key.destination);
  if (!route) return null;
  const slot = slotsFor(route).find((candidate) => candidate.index === key.slot);
  if (!slot || slot.airline.code !== key.airlineCode || !operatesOn(route, slot, key.date))
    return null;
  return materialize(route, slot, key.date);
}
