import {
  addDaysIso,
  buildFlightId,
  type Cabin,
  demandForDate,
  type DemandInfo,
  diffDaysIso,
  roundRial,
  unitFromKey,
} from "@flysmart/contracts";

import type { ScheduledFlight } from "./schedule.js";

/** Business is sold at a multiple of the economy fare on the same flight. */
export const BUSINESS_FARE_FACTOR = 2.4;
/** Tickets go on sale this many days before departure. */
export const SALES_HORIZON_DAYS = 330;

const CURVE_KNOTS: ReadonlyArray<readonly [days: number, factor: number]> = [
  [0, 1.7],
  [1, 1.6],
  [3, 1.45],
  [7, 1.28],
  [14, 1.14],
  [21, 1.06],
  [30, 1.0],
  [45, 0.96],
  [60, 0.93],
  [120, 0.9],
];

/** Typical booking curve: fares sit lowest months ahead and climb as departure approaches. */
export function bookingCurve(daysToDeparture: number): number {
  const days = Math.max(0, daysToDeparture);
  for (let index = 1; index < CURVE_KNOTS.length; index += 1) {
    const [farDays, farFactor] = CURVE_KNOTS[index] as readonly [number, number];
    if (days <= farDays) {
      const [nearDays, nearFactor] = CURVE_KNOTS[index - 1] as readonly [number, number];
      const ratio = (days - nearDays) / (farDays - nearDays);
      return nearFactor + (farFactor - nearFactor) * ratio;
    }
  }
  return (CURVE_KNOTS[CURVE_KNOTS.length - 1] as readonly [number, number])[1];
}

const demandCache = new Map<string, DemandInfo>();
export function cachedDemand(isoDate: string): DemandInfo {
  let info = demandCache.get(isoDate);
  if (!info) {
    info = demandForDate(isoDate);
    if (demandCache.size > 2000) demandCache.clear();
    demandCache.set(isoDate, info);
  }
  return info;
}

export function flightIdOf(flight: ScheduledFlight, cabin: Cabin): string {
  return buildFlightId({ ...flight.key, cabin });
}

function timeOfDayFactor(departureMinutes: number): number {
  const hour = departureMinutes / 60;
  if (hour < 7) return 0.93;
  if (hour < 10) return 1.04;
  if (hour < 16) return 1;
  if (hour < 21) return 1.05;
  return 0.94;
}

/** Fare of a flight on a typical day, before the booking curve, in rial per adult. */
function baseFare(flight: ScheduledFlight, cabin: Cabin): number {
  // Business is priced off the economy fare of the same flight, so all random draws use its id.
  const id = flightIdOf(flight, "ECONOMY");
  const slotFactor = 0.95 + 0.12 * unitFromKey(`${id}|slot-price`);
  const charterFactor = flight.flightType === "CHARTER" ? 0.88 : 1;
  const cabinFactor = cabin === "BUSINESS" ? BUSINESS_FARE_FACTOR : 1;
  return (
    flight.route.baseFareRial *
    flight.airline.priceFactor *
    charterFactor *
    cabinFactor *
    timeOfDayFactor(flight.departureMinutes) *
    slotFactor
  );
}

export interface FareAtOptions {
  /** The price a model would predict: booking curve and demand only, no daily noise or promos. */
  expected?: boolean;
}

/** Adult base fare, rial, observed on `observationDate` for a flight departing on its own date. */
export function fareAt(
  flight: ScheduledFlight,
  cabin: Cabin,
  observationDate: string,
  options: FareAtOptions = {},
): number {
  const days = Math.max(0, diffDaysIso(flight.key.date, observationDate));
  const demand = cachedDemand(flight.key.date).multiplier;
  const structural = baseFare(flight, cabin) * demand * bookingCurve(days);
  if (options.expected) return roundRial(structural);

  const id = flightIdOf(flight, "ECONOMY");
  const phase = unitFromKey(`${id}|phase`);
  const wave = 1 + 0.06 * Math.sin(2 * Math.PI * (days / 11 + phase));
  const promo = unitFromKey(`${id}|promo|${Math.floor(days / 5)}`) < 0.12 ? 0.9 : 1;
  const noise = 0.97 + 0.06 * unitFromKey(`${id}|${observationDate}`);
  return roundRial(structural * wave * promo * noise);
}

/** Share of the cabin already sold elsewhere, as seen `daysToDeparture` days before departure. */
export function loadFactorAt(
  flight: ScheduledFlight,
  cabin: Cabin,
  daysToDeparture: number,
): number {
  const days = Math.min(Math.max(0, daysToDeparture), 60);
  const fill = 0.18 + 0.72 * (1 - days / 60) ** 1.6;
  const demand = Math.min(1.5, Math.max(0.9, cachedDemand(flight.key.date).multiplier));
  const cabinFactor = cabin === "BUSINESS" ? 0.6 : 1;
  const offset = (unitFromKey(`${flightIdOf(flight, cabin)}|load`) - 0.5) * 0.24;
  return Math.min(0.98, Math.max(0.05, fill * demand * cabinFactor + offset));
}

export function observationDates(
  today: string,
  flight: ScheduledFlight,
  pastDays: number,
): string[] {
  const dates: string[] = [];
  for (let offset = pastDays; offset >= 0; offset -= 1) {
    const date = addDaysIso(today, -offset);
    const days = diffDaysIso(flight.key.date, date);
    if (days < 0 || days > SALES_HORIZON_DAYS) continue;
    dates.push(date);
  }
  return dates;
}
