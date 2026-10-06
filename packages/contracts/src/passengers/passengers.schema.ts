import { z } from "zod";

import { isoDateSchema, toIsoDate } from "../common/dates";
import { nationalCodeSchema } from "../common/iran";

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

const latinName = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} باید حداقل ۲ حرف باشد`)
    .max(50, `${label} طولانی است`)
    .regex(/^[A-Za-z][A-Za-z\s'-]*$/, `${label} فقط باید شامل حروف لاتین باشد`)
    .transform((value) => value.replace(/\s+/g, " ").toUpperCase());

const persianName = (label: string) =>
  z.string().trim().min(2, `${label} باید حداقل ۲ حرف باشد`).max(50, `${label} طولانی است`);

const passportNumber = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6,12}$/, "شماره گذرنامه نامعتبر است")
  .transform((value) => value.toUpperCase());

const OLDEST_TRAVELLER_YEARS = 120;

// Without bounds a typo like 1700 or 2030 passes the shape check and only fails later with an
// unrelated "an adult is required" message
const birthDateSchema = isoDateSchema
  .refine((value) => value <= toIsoDate(new Date()), "تاریخ تولد نمی‌تواند در آینده باشد")
  .refine((value) => {
    const limit = new Date();
    limit.setUTCFullYear(limit.getUTCFullYear() - OLDEST_TRAVELLER_YEARS);
    return value >= toIsoDate(limit);
  }, "تاریخ تولد معتبر نیست");

/** Identity fields shared by the traveler vault and booking forms. */
export const passengerIdentitySchema = z.object({
  firstNameFa: persianName("نام فارسی"),
  lastNameFa: persianName("نام خانوادگی فارسی"),
  firstNameEn: latinName("نام انگلیسی"),
  lastNameEn: latinName("نام خانوادگی انگلیسی"),
  nationalId: nationalCodeSchema,
  birthDate: birthDateSchema,
  gender: z.enum(GENDERS, { error: "جنسیت باید مشخص شود" }),
  passportNumber: passportNumber.nullable().optional(),
  passportExpiry: isoDateSchema.nullable().optional(),
});
export type PassengerIdentity = z.infer<typeof passengerIdentitySchema>;

export const createPassengerSchema = passengerIdentitySchema.extend({
  isDefault: z.boolean().default(false),
});
export type CreatePassengerInput = z.infer<typeof createPassengerSchema>;

// Built from the identity schema, not createPassengerSchema.partial(): Zod 4 applies a field's
// default inside optional(), which would silently reset isDefault to false on every PATCH.
export const updatePassengerSchema = passengerIdentitySchema.partial().extend({
  isDefault: z.boolean().optional(),
});
export type UpdatePassengerInput = z.infer<typeof updatePassengerSchema>;

export interface PassengerDto {
  id: string;
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  nationalId: string;
  birthDate: string;
  gender: Gender;
  passportNumber: string | null;
  passportExpiry: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
