import { z } from "zod";

import { isoDateSchema, toIsoDate } from "../common/dates";
import { digitsString, isValidNationalCode } from "../common/iran";
import {
  DEFAULT_NATIONALITY,
  isIranian,
  NATIONALITY_CODES,
  type NationalityCode,
} from "../common/nationalities";

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

// Optional here because foreigners may skip it; passengerIdentityIssues enforces it for Iranians
const persianName = (label: string) => z.string().trim().max(50, `${label} طولانی است`).optional();

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

export const nationalityCodeSchema = z.enum(NATIONALITY_CODES, {
  error: "ملیت مسافر باید مشخص شود",
});

/**
 * Identity fields without the cross-field rules. Kept as a plain object because Zod 4 objects with
 * refinements cannot be extended or made partial; the refined variants below are built from it.
 * `nationality` has no default here on purpose: a default inside `.partial()` would reset it on
 * every PATCH (see updatePassengerSchema).
 */
export const passengerIdentityObject = z.object({
  firstNameFa: persianName("نام فارسی"),
  lastNameFa: persianName("نام خانوادگی فارسی"),
  firstNameEn: latinName("نام انگلیسی"),
  lastNameEn: latinName("نام خانوادگی انگلیسی"),
  nationality: nationalityCodeSchema.optional(),
  // Only digits are normalised here; whether it is a valid code depends on the nationality
  nationalId: digitsString.nullable().optional(),
  birthDate: birthDateSchema,
  gender: z.enum(GENDERS, { error: "جنسیت باید مشخص شود" }),
  passportNumber: passportNumber.nullable().optional(),
  passportExpiry: isoDateSchema.nullable().optional(),
});

export interface IdentityCheckInput {
  nationality?: string | null | undefined;
  firstNameFa?: string | null | undefined;
  lastNameFa?: string | null | undefined;
  nationalId?: string | null | undefined;
  passportNumber?: string | null | undefined;
  passportExpiry?: string | null | undefined;
}

export interface IdentityIssue {
  path: "firstNameFa" | "lastNameFa" | "nationalId" | "passportNumber" | "passportExpiry";
  message: string;
}

/**
 * Iranians identify with a national code and Persian names; foreigners with a passport (Persian
 * names optional). Shared by every schema and by the API when it merges a partial update.
 */
export function passengerIdentityIssues(value: IdentityCheckInput): IdentityIssue[] {
  const issues: IdentityIssue[] = [];
  const iranian = isIranian(value.nationality);

  const names = [
    ["firstNameFa", "نام فارسی"],
    ["lastNameFa", "نام خانوادگی فارسی"],
  ] as const;
  for (const [key, label] of names) {
    const length = (value[key] ?? "").trim().length;
    if (iranian ? length < 2 : length === 1) {
      issues.push({ path: key, message: `${label} باید حداقل ۲ حرف باشد` });
    }
  }

  if (iranian) {
    const code = value.nationalId ?? "";
    if (!isValidNationalCode(code)) {
      issues.push({
        path: "nationalId",
        message: code ? "کد ملی معتبر نیست" : "کد ملی الزامی است",
      });
    }
  } else {
    if (!value.passportNumber) {
      issues.push({
        path: "passportNumber",
        message: "شماره گذرنامه برای مسافر غیرایرانی الزامی است",
      });
    }
    if (!value.passportExpiry) {
      issues.push({
        path: "passportExpiry",
        message: "تاریخ انقضای گذرنامه برای مسافر غیرایرانی الزامی است",
      });
    }
  }
  return issues;
}

export function refinePassengerIdentity(value: IdentityCheckInput, ctx: z.RefinementCtx): void {
  for (const issue of passengerIdentityIssues(value)) {
    ctx.addIssue({ code: "custom", message: issue.message, path: [issue.path] });
  }
}

/**
 * Stable key for "is this the same person": the national code for Iranians, the issuing country
 * plus passport number for foreigners. Null while the identifying field is still missing.
 */
export function passengerIdentityKey(value: IdentityCheckInput): string | null {
  if (isIranian(value.nationality)) {
    return value.nationalId ? `${DEFAULT_NATIONALITY}:${value.nationalId}` : null;
  }
  return value.passportNumber ? `${value.nationality ?? ""}:${value.passportNumber}` : null;
}

export const DUPLICATE_PASSENGER_MESSAGE =
  "مشخصات هویتی مسافران (کد ملی یا شماره گذرنامه) نباید تکراری باشد";

/** Identity fields shared by the traveler vault and booking forms. */
export const passengerIdentitySchema = passengerIdentityObject
  .extend({ nationality: nationalityCodeSchema.default(DEFAULT_NATIONALITY) })
  .superRefine(refinePassengerIdentity);
export type PassengerIdentity = z.infer<typeof passengerIdentitySchema>;

export const createPassengerSchema = passengerIdentityObject
  .extend({
    nationality: nationalityCodeSchema.default(DEFAULT_NATIONALITY),
    isDefault: z.boolean().default(false),
  })
  .superRefine(refinePassengerIdentity);
export type CreatePassengerInput = z.infer<typeof createPassengerSchema>;

// Built from the identity object, not createPassengerSchema.partial(): Zod 4 applies a field's
// default inside optional(), which would silently reset isDefault (or nationality) on every PATCH.
// Which fields are mandatory depends on the stored nationality, so the service re-checks the
// merged result with passengerIdentityIssues; here only a malformed national code is caught.
export const updatePassengerSchema = passengerIdentityObject
  .partial()
  .extend({ isDefault: z.boolean().optional() })
  .superRefine((value, ctx) => {
    if (
      value.nationalId &&
      isIranian(value.nationality) &&
      !isValidNationalCode(value.nationalId)
    ) {
      ctx.addIssue({ code: "custom", message: "کد ملی معتبر نیست", path: ["nationalId"] });
    }
  });
export type UpdatePassengerInput = z.infer<typeof updatePassengerSchema>;

/** Persian name when the passenger has one, the Latin name otherwise (foreigners may have none). */
export function passengerDisplayName(value: {
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
}): string {
  const persian = `${value.firstNameFa} ${value.lastNameFa}`.trim();
  return persian || `${value.firstNameEn} ${value.lastNameEn}`.trim();
}

export interface PassengerDto {
  id: string;
  /** Empty for a foreigner who gave no Persian name. */
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  nationality: NationalityCode;
  /** Null for foreigners. */
  nationalId: string | null;
  birthDate: string;
  gender: Gender;
  passportNumber: string | null;
  passportExpiry: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
