import { AppException } from "../../common/app-exception.js";
import type { SmsDelivery } from "./sms.provider.js";
import { SmsProvider } from "./sms.provider.js";

/** Production without an SMS vendor yet: the site runs, sign-in answers 503 until a vendor is set. */
export class DisabledSmsProvider extends SmsProvider {
  sendOtp(): Promise<void> {
    return Promise.reject(
      new AppException(
        503,
        "SMS_UNAVAILABLE",
        "ورود با پیامک هنوز فعال نشده است؛ به‌زودی فعال می‌شود",
      ),
    );
  }

  sendPriceAlert(): Promise<SmsDelivery> {
    return Promise.resolve("SKIPPED");
  }
}
