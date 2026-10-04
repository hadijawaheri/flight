import { z } from "zod";

import { nationalCodeSchema } from "../common/iran";

export const PASSENGER_TYPES = ["ADULT", "CHILD", "INFANT"] as const;
export type PassengerType = (typeof PASSENGER_TYPES)[number];

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const createPassengerSchema = z.object({
  firstNameFa: z
    .string()
    .trim()
    .min(2, "نام فارسی باید حداقل ۲ حرف باشد")
    .max(50, "نام فارسی طولانی است"),
  lastNameFa: z
    .string()
    .trim()
    .min(2, "نام خانوادگی فارسی باید حداقل ۲ حرف باشد")
    .max(50, "نام خانوادگی فارسی طولانی است"),
  firstNameEn: z
    .string()
    .trim()
    .min(2, "نام انگلیسی باید حداقل ۲ حرف باشد")
    .max(50, "نام انگلیسی طولانی است")
    .regex(/^[A-Za-z\s'-]+$/, "نام انگلیسی فقط باید شامل حروف لاتین باشد"),
  lastNameEn: z
    .string()
    .trim()
    .min(2, "نام خانوادگی انگلیسی باید حداقل ۲ حرف باشد")
    .max(50, "نام خانوادگی انگلیسی طولانی است")
    .regex(/^[A-Za-z\s'-]+$/, "نام خانوادگی انگلیسی فقط باید شامل حروف لاتین باشد"),
  nationalId: nationalCodeSchema,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ تولد باید YYYY-MM-DD باشد"),
  gender: z.enum(GENDERS, {
    error: "جنسیت باید مشخص شود",
  }),
  passengerType: z.enum(PASSENGER_TYPES).default("ADULT"),
  passportNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,12}$/, "شماره گذرنامه نامعتبر است")
    .optional()
    .nullable(),
  passportExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ انقضای گذرنامه نامعتبر است")
    .optional()
    .nullable(),
  isDefault: z.boolean().default(false),
});

export type CreatePassengerInput = z.infer<typeof createPassengerSchema>;

export const updatePassengerSchema = createPassengerSchema.partial();
export type UpdatePassengerInput = z.infer<typeof updatePassengerSchema>;

export interface PassengerDto {
  id: string;
  userId: string;
  firstNameFa: string;
  lastNameFa: string;
  firstNameEn: string;
  lastNameEn: string;
  nationalId: string;
  birthDate: string;
  gender: Gender;
  passengerType: PassengerType;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
