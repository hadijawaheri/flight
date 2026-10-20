import { z } from "zod";

import { digitsString, mobileSchema } from "../common/iran";

export const requestOtpSchema = z.object({ mobile: mobileSchema });
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

const otpCodeSchema = digitsString.pipe(z.string().regex(/^\d{6}$/, "کد تأیید ۶ رقم است"));

export const verifyOtpSchema = z.object({ mobile: mobileSchema, code: otpCodeSchema });
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// Irreversible actions ask for a fresh OTP sent to the signed-in user's own mobile
export const deleteAccountSchema = z.object({ code: otpCodeSchema });
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
