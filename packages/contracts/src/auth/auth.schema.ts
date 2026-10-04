import { z } from "zod";

import { digitsString, mobileSchema } from "../common/iran";

export const requestOtpSchema = z.object({ mobile: mobileSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  mobile: mobileSchema,
  code: digitsString.pipe(z.string().regex(/^\d{6}$/, "کد تأیید ۶ رقم است")),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
