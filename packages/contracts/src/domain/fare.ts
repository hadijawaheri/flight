import { percentOf, roundRial } from "../common/money";

export const PASSENGER_TYPES = ["ADULT", "CHILD", "INFANT"] as const;
export type PassengerType = (typeof PASSENGER_TYPES)[number];

export const FLIGHT_TYPES = ["SYSTEMIC", "CHARTER"] as const;
export type FlightType = (typeof FLIGHT_TYPES)[number];

/**
 * Fare assumptions of the simulated market. Airlines publish their own rules; a real flight
 * provider returns per-passenger prices and this table is then only used for previews.
 */
export const FARE_POLICY = {
  /** Child (2–11) share of the adult base fare. */
  childFactor: { SYSTEMIC: 0.75, CHARTER: 1 } satisfies Record<FlightType, number>,
  /** Infant (under 2, no seat) share of the adult base fare. */
  infantFactor: 0.1,
  airportTaxRial: { domestic: 1_500_000, international: 6_000_000 },
  insuranceRial: 200_000,
  serviceFeePercent: 0.8,
  serviceFeeMinRial: 500_000,
  maxPassengersPerBooking: 9,
} as const;

export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface FareQuoteInput {
  /** Adult economy base fare of the flight, rial. */
  adultBaseFare: number;
  flightType: FlightType;
  international: boolean;
  passengerTypes: readonly PassengerType[];
}

export interface PassengerFare {
  type: PassengerType;
  baseFare: number;
  taxes: number;
  serviceFee: number;
  total: number;
}

export interface FareBreakdown {
  perPassenger: PassengerFare[];
  baseTotal: number;
  taxTotal: number;
  serviceFeeTotal: number;
  total: number;
}

export function countPassengers(types: readonly PassengerType[]): PassengerCounts {
  return {
    adults: types.filter((type) => type === "ADULT").length,
    children: types.filter((type) => type === "CHILD").length,
    infants: types.filter((type) => type === "INFANT").length,
  };
}

export function seatedPassengerCount(types: readonly PassengerType[]): number {
  return types.filter((type) => type !== "INFANT").length;
}

/** Validates the infant/adult relationship used by every airline: one adult per infant. */
export function validatePassengerMix(counts: PassengerCounts): string | null {
  const total = counts.adults + counts.children + counts.infants;
  if (counts.adults < 1) return "حداقل یک بزرگسال لازم است";
  if (counts.infants > counts.adults) return "به ازای هر نوزاد یک بزرگسال همراه لازم است";
  if (total > FARE_POLICY.maxPassengersPerBooking) return "حداکثر ۹ مسافر در یک رزرو مجاز است";
  return null;
}

function baseFareFor(type: PassengerType, adultBaseFare: number, flightType: FlightType): number {
  if (type === "ADULT") return adultBaseFare;
  if (type === "CHILD") return roundRial(adultBaseFare * FARE_POLICY.childFactor[flightType]);
  return roundRial(adultBaseFare * FARE_POLICY.infantFactor);
}

export function buildFareBreakdown(input: FareQuoteInput): FareBreakdown {
  const airportTax = input.international
    ? FARE_POLICY.airportTaxRial.international
    : FARE_POLICY.airportTaxRial.domestic;

  const perPassenger = input.passengerTypes.map<PassengerFare>((type) => {
    const baseFare = baseFareFor(type, input.adultBaseFare, input.flightType);
    // Infants occupy no seat: no airport charge or insurance, a small service fee only.
    const taxes = type === "INFANT" ? 0 : airportTax + FARE_POLICY.insuranceRial;
    const serviceFee = Math.max(
      type === "INFANT" ? 0 : FARE_POLICY.serviceFeeMinRial,
      percentOf(baseFare, FARE_POLICY.serviceFeePercent),
    );
    return { type, baseFare, taxes, serviceFee, total: baseFare + taxes + serviceFee };
  });

  const sum = (pick: (fare: PassengerFare) => number): number =>
    perPassenger.reduce((acc, fare) => acc + pick(fare), 0);

  return {
    perPassenger,
    baseTotal: sum((fare) => fare.baseFare),
    taxTotal: sum((fare) => fare.taxes),
    serviceFeeTotal: sum((fare) => fare.serviceFee),
    total: sum((fare) => fare.total),
  };
}

/** Completed years of age on a given ISO date. */
export function ageOnDate(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = onDate.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

/** Passenger type from a birth date on the travel date (ISO dates). Infants are under 2, children under 12. */
export function passengerTypeForAge(birthDate: string, travelDate: string): PassengerType {
  const age = ageOnDate(birthDate, travelDate);
  if (age < 2) return "INFANT";
  if (age < 12) return "CHILD";
  return "ADULT";
}
