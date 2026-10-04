import { z } from "zod";

import { mobileSchema } from "../common/iran";

export const createPriceAlertSchema = z.object({
  origin: z.string().trim().min(2, "کد مبدا الزامی است").max(10),
  originName: z.string().trim().min(2, "نام شهر مبدا الزامی است"),
  destination: z.string().trim().min(2, "کد مقصد الزامی است").max(10),
  destinationName: z.string().trim().min(2, "نام شهر مقصد الزامی است"),
  targetMaxPrice: z.number().int().positive("قیمت باید عدد مثبت باشد"),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "فرمت تاریخ YYYY-MM-DD است")
    .optional(),
  notifyViaSms: z.boolean().default(true),
  mobile: mobileSchema.optional(),
});

export type CreatePriceAlertInput = z.infer<typeof createPriceAlertSchema>;

export interface PriceAlertDto {
  id: string;
  userId: string;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  targetMaxPrice: number;
  targetDate?: string;
  currentLowestPrice: number;
  notifyViaSms: boolean;
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}
