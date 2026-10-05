import { normalizeDigits } from "@flysmart/contracts";
import { z } from "zod";

/** The target is typed in toman, with Persian digits and separators tolerated; the API stores rial. */
export const targetTomanSchema = z
  .string()
  .transform((value) => normalizeDigits(value).replace(/[,٬\s]/g, ""))
  .pipe(z.string().regex(/^\d+$/, "مبلغ را به تومان و با عدد وارد کنید"))
  .transform(Number)
  .pipe(z.number().min(10_000, "مبلغ خیلی کم است"));

export const targetFormSchema = z.object({ targetToman: targetTomanSchema });
export type TargetFormInput = z.input<typeof targetFormSchema>;
export type TargetFormOutput = z.output<typeof targetFormSchema>;
