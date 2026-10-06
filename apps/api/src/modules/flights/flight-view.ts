import {
  addDaysIso,
  type Airport,
  buildFareBreakdown,
  businessSeats,
  type Cabin,
  demandForDate,
  diffDaysIso,
  economySeats,
  type FareBreakdown,
  type FlightPointDto,
  type FlightSummaryDto,
  hoursBetween,
  type PassengerType,
  type RefundPolicy,
  refundPolicyFor,
  utcToLocalString,
} from "@flysmart/contracts";

import type { FlightRecord } from "../../infra/flight/flight.provider.js";

/** Online sales close this long before departure. */
export const SALES_CUTOFF_MINUTES = 120;

const CABIN_BAGGAGE_KG = { ECONOMY: 7, BUSINESS: 10 } as const;
const BUSINESS_EXTRA_BAGGAGE_KG = 10;

export function localDateOf(instant: Date, airport: Airport): string {
  return utcToLocalString(instant, airport.utcOffsetMinutes).slice(0, 10);
}

export function departureDateOf(record: FlightRecord): string {
  return localDateOf(record.departureUtc, record.origin);
}

export function isSalesClosed(record: FlightRecord, now: Date): boolean {
  return hoursBetween(record.departureUtc, now) * 60 < SALES_CUTOFF_MINUTES;
}

export function daysToDeparture(record: FlightRecord, today: string): number {
  return diffDaysIso(departureDateOf(record), today);
}

export function capacityOf(record: FlightRecord): number {
  return record.cabin === "BUSINESS"
    ? businessSeats(record.aircraft)
    : economySeats(record.aircraft);
}

export function expandMix(mix: {
  adults: number;
  children: number;
  infants: number;
}): PassengerType[] {
  return [
    ...Array.from({ length: mix.adults }, (): PassengerType => "ADULT"),
    ...Array.from({ length: mix.children }, (): PassengerType => "CHILD"),
    ...Array.from({ length: mix.infants }, (): PassengerType => "INFANT"),
  ];
}

export function fareFor(
  record: Pick<FlightRecord, "flightType" | "international">,
  adultBaseFare: number,
  types: readonly PassengerType[],
): FareBreakdown {
  return buildFareBreakdown({
    adultBaseFare,
    flightType: record.flightType,
    international: record.international,
    passengerTypes: types,
  });
}

/** Total one adult pays at a given base fare, the number shown as "the price". */
export function adultTotalFor(
  record: Pick<FlightRecord, "flightType" | "international">,
  adultBaseFare: number,
): number {
  return fareFor(record, adultBaseFare, ["ADULT"]).total;
}

export function refundPolicyOf(
  record: Pick<FlightRecord, "flightType" | "fareFamily">,
): RefundPolicy {
  return refundPolicyFor(record.flightType, record.fareFamily);
}

function pointOf(airport: Airport, instant: Date): FlightPointDto {
  return {
    airportCode: airport.code,
    airportNameFa: airport.nameFa,
    cityFa: airport.cityFa,
    localTime: utcToLocalString(instant, airport.utcOffsetMinutes),
    utcOffsetMinutes: airport.utcOffsetMinutes,
  };
}

export function toFlightSummary(record: FlightRecord): FlightSummaryDto {
  const allowance = record.international
    ? record.airline.baggageKg.international
    : record.airline.baggageKg.domestic;
  return {
    id: record.id,
    flightNumber: record.flightNumber,
    airline: {
      code: record.airline.code,
      nameFa: record.airline.nameFa,
      nameEn: record.airline.nameEn,
    },
    origin: pointOf(record.origin, record.departureUtc),
    destination: pointOf(record.destination, record.arrivalUtc),
    departureUtc: record.departureUtc.toISOString(),
    arrivalUtc: record.arrivalUtc.toISOString(),
    durationMinutes: record.durationMinutes,
    aircraft: { id: record.aircraft.id, nameFa: record.aircraft.nameFa },
    cabin: record.cabin,
    flightType: record.flightType,
    international: record.international,
    fareFamily: record.fareFamily,
    baggageKg: record.cabin === "BUSINESS" ? allowance + BUSINESS_EXTRA_BAGGAGE_KG : allowance,
    cabinBaggageKg: CABIN_BAGGAGE_KG[record.cabin],
    meal: record.airline.meal || record.cabin === "BUSINESS",
  };
}

export type TimeBucketName = "NIGHT" | "MORNING" | "AFTERNOON" | "EVENING";

export function timeBucketOf(record: FlightRecord): TimeBucketName {
  const hour = Number(
    utcToLocalString(record.departureUtc, record.origin.utcOffsetMinutes).slice(11, 13),
  );
  if (hour < 6) return "NIGHT";
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

export function demandOf(record: FlightRecord) {
  return demandForDate(departureDateOf(record));
}

export function windowDates(
  center: string,
  radius: number,
  today: string,
  horizonDays: number,
): string[] {
  const dates: string[] = [];
  for (let offset = -radius; offset <= radius; offset += 1) {
    const date = addDaysIso(center, offset);
    if (date < today || diffDaysIso(date, today) > horizonDays) continue;
    dates.push(date);
  }
  return dates;
}

export function cabinLabelFa(cabin: Cabin): string {
  return cabin === "BUSINESS" ? "بیزنس" : "اکونومی";
}
