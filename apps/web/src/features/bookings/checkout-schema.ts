import type { PassengerType } from "@flysmart/contracts";
import {
  addDaysIso,
  bookingContactSchema,
  bookingPassengerSchema,
  passengerTypeForAge,
  SEAT_PREFERENCES,
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

/** Same six-month rule the API enforces, counted from the last flight. */
export const PASSPORT_VALIDITY_DAYS = 183;

export const TYPE_MISMATCH_MESSAGES: Record<PassengerType, string> = {
  ADULT: "این مسافر باید ۱۲ سال یا بیشتر داشته باشد",
  CHILD: "این مسافر باید ۲ تا ۱۱ سال داشته باشد",
  INFANT: "این مسافر باید کمتر از ۲ سال داشته باشد",
};

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
    })
    .superRefine((value, ctx) => {
      const lastDate = [...rules.flightDates].sort().at(-1) ?? "";
      const validUntil = addDaysIso(lastDate, PASSPORT_VALIDITY_DAYS);
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

        if (rules.international) {
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
          } else if (passenger.passportExpiry < validUntil) {
            ctx.addIssue({
              code: "custom",
              message: "گذرنامه باید حداقل ۶ ماه پس از پرواز اعتبار داشته باشد",
              path: ["passengers", index, "passportExpiry"],
            });
          }
        }

        if (seen.has(passenger.nationalId)) {
          ctx.addIssue({
            code: "custom",
            message: "کد ملی مسافران نباید تکراری باشد",
            path: ["passengers", index, "nationalId"],
          });
        }
        seen.add(passenger.nationalId);
      });
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
