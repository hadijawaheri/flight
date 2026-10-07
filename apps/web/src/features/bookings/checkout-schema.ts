import type { PassengerType } from "@flysmart/contracts";
import {
  ageOnDate,
  assessPassport,
  bookingContactSchema,
  bookingPassengerSchema,
  DUPLICATE_PASSENGER_MESSAGE,
  isIranian,
  MIN_ESCORT_AGE,
  passengerIdentityKey,
  passengerTypeForAge,
  PASSPORT_MESSAGES,
  SEAT_PREFERENCES,
  validateEscort,
} from "@flysmart/contracts";
import { z } from "zod";

export interface CheckoutRules {
  /** One entry per traveller slot: adults first, then children, then infants. */
  slotTypes: readonly PassengerType[];
  /** Departure dates of every leg, ISO. */
  flightDates: readonly string[];
  /** Any foreign leg makes the passport mandatory. */
  international: boolean;
}

export const TYPE_MISMATCH_MESSAGES: Record<PassengerType, string> = {
  ADULT: "این مسافر باید ۱۲ سال یا بیشتر داشته باشد",
  CHILD: "این مسافر باید ۲ تا ۱۱ سال داشته باشد",
  INFANT: "این مسافر باید کمتر از ۲ سال داشته باشد",
};

interface PassportHolder {
  nationality?: string | null | undefined;
  passportNumber?: string | null | undefined;
  passportExpiry?: string | null | undefined;
}

/** Slots whose passport is valid on the trip but has under six months left: a warning, not a block. */
export function shortPassportSlots(
  passengers: readonly (PassportHolder | undefined)[],
  rules: Pick<CheckoutRules, "flightDates" | "international">,
): number[] {
  const options = { international: rules.international, travelDates: rules.flightDates };
  return passengers.flatMap((passenger, index) =>
    passenger && assessPassport(passenger, options) === "SHORT_VALIDITY" ? [index] : [],
  );
}

/**
 * Where the escort problem is shown: on the birth date of the slot that was meant to be the
 * escort but is under 18, otherwise on the first child or infant slot.
 */
function escortIssueIndex(
  passengers: readonly { birthDate: string }[],
  rules: CheckoutRules,
): number {
  const tooYoung = passengers.findIndex(
    (passenger, index) =>
      rules.slotTypes[index] === "ADULT" &&
      rules.flightDates.some((date) => ageOnDate(passenger.birthDate, date) < MIN_ESCORT_AGE),
  );
  if (tooYoung >= 0) return tooYoung;
  return Math.max(
    0,
    rules.slotTypes.findIndex((type) => type !== "ADULT"),
  );
}

/**
 * The party size was fixed when the traveller searched and the fare was quoted for it, so each
 * form slot must be a person of the matching age on every flight date. Catching it here avoids a
 * round trip that ends in a confusing FARE_CHANGED.
 */
export function buildCheckoutSchema(rules: CheckoutRules) {
  return z
    .object({
      passengers: z.array(bookingPassengerSchema).length(rules.slotTypes.length),
      contact: bookingContactSchema,
      seatPreference: z.enum(SEAT_PREFERENCES),
      /** Required only while some passport triggers the six-month warning. */
      passportValidityAcknowledged: z.boolean(),
    })
    .superRefine((value, ctx) => {
      const options = { international: rules.international, travelDates: rules.flightDates };
      const seen = new Set<string>();

      value.passengers.forEach((passenger, index) => {
        const expected = rules.slotTypes[index];
        const mismatched =
          expected !== undefined &&
          rules.flightDates.some(
            (date) => passengerTypeForAge(passenger.birthDate, date) !== expected,
          );
        if (expected && mismatched) {
          ctx.addIssue({
            code: "custom",
            message: TYPE_MISMATCH_MESSAGES[expected],
            path: ["passengers", index, "birthDate"],
          });
        }

        const passport = assessPassport(passenger, options);
        // A foreigner's missing passport is already reported by the identity schema
        if (passport === "MISSING" && isIranian(passenger.nationality)) {
          if (!passenger.passportNumber) {
            ctx.addIssue({
              code: "custom",
              message: "برای پرواز خارجی شماره‌ی گذرنامه الزامی است",
              path: ["passengers", index, "passportNumber"],
            });
          }
          if (!passenger.passportExpiry) {
            ctx.addIssue({
              code: "custom",
              message: "تاریخ انقضای گذرنامه الزامی است",
              path: ["passengers", index, "passportExpiry"],
            });
          }
        } else if (passport === "EXPIRED") {
          ctx.addIssue({
            code: "custom",
            message: PASSPORT_MESSAGES.expired,
            path: ["passengers", index, "passportExpiry"],
          });
        }

        const key = passengerIdentityKey(passenger);
        if (key !== null) {
          if (seen.has(key)) {
            ctx.addIssue({
              code: "custom",
              message: DUPLICATE_PASSENGER_MESSAGE,
              path: [
                "passengers",
                index,
                isIranian(passenger.nationality) ? "nationalId" : "passportNumber",
              ],
            });
          }
          seen.add(key);
        }
      });

      const escortProblem = validateEscort(value.passengers, rules.flightDates);
      if (escortProblem) {
        ctx.addIssue({
          code: "custom",
          message: escortProblem,
          path: ["passengers", escortIssueIndex(value.passengers, rules), "birthDate"],
        });
      }

      if (
        shortPassportSlots(value.passengers, rules).length > 0 &&
        !value.passportValidityAcknowledged
      ) {
        ctx.addIssue({
          code: "custom",
          message: PASSPORT_MESSAGES.acknowledgementRequired,
          path: ["passportValidityAcknowledged"],
        });
      }
    });
}

export type CheckoutFormInput = z.input<ReturnType<typeof buildCheckoutSchema>>;
export type CheckoutFormOutput = z.output<ReturnType<typeof buildCheckoutSchema>>;

export function slotTypesFor(mix: {
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
