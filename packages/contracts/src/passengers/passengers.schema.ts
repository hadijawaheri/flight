import { z } from "zod";

import { isoDateSchema } from "../common/dates";
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

/** Identity fields shared by the traveler vault and booking forms. */
export const passengerIdentitySchema = z.object({
  firstNameFa: persianName("نام فارسی"),
  lastNameFa: persianName("نام خانوادگی فارسی"),
  firstNameEn: latinName("نام انگلیسی"),
  lastNameEn: latinName("نام خانوادگی انگلیسی"),
  nationalId: nationalCodeSchema,
  birthDate: isoDateSchema,
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
