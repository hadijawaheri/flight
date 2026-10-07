import { ageOnDate, passengerTypeForAge } from "./fare";

/**
 * Pricing treats 12+ as an adult, but the person responsible for an infant or child must be a
 * legal adult. A few airlines accept 16 with written consent; the simulation uses the strict 18.
 */
export const MIN_ESCORT_AGE = 18;

export const ESCORT_MESSAGES = {
  noEscort:
    "همراه کودک یا نوزاد باید حداقل ۱۸ سال داشته باشد؛ مسافر ۱۲ تا ۱۷ ساله نمی‌تواند مسئول کودک یا نوزاد باشد",
  tooManyInfants: "به ازای هر نوزاد یک همراه ۱۸ سال به بالا لازم است",
} as const;

export interface EscortPassenger {
  birthDate: string;
}

/**
 * Checks the escort rules on every travel date, because a passenger can turn 18 between the
 * outbound and return legs, or a child can turn 2. Returns the first problem in Persian, or null.
 * Counts-only validation (no birth dates yet, e.g. the search form) stays in validatePassengerMix.
 */
export function validateEscort(
  passengers: readonly EscortPassenger[],
  travelDates: readonly string[],
): string | null {
  for (const date of travelDates) {
    const escorts = passengers.filter(
      (passenger) => ageOnDate(passenger.birthDate, date) >= MIN_ESCORT_AGE,
    ).length;
    const types = passengers.map((passenger) => passengerTypeForAge(passenger.birthDate, date));
    const infants = types.filter((type) => type === "INFANT").length;
    const hasMinor = types.some((type) => type !== "ADULT");

    if (hasMinor && escorts < 1) return ESCORT_MESSAGES.noEscort;
    if (infants > escorts) return ESCORT_MESSAGES.tooManyInfants;
  }
  return null;
}
