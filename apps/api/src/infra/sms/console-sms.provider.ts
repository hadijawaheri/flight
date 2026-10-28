import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

import type { PriceAlertSms, SmsDelivery } from "./sms.provider.js";
import { priceAlertText, SmsProvider } from "./sms.provider.js";

@Injectable()
export class ConsoleSmsProvider extends SmsProvider {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  sendOtp(mobile: string, code: string): Promise<void> {
    // Dev only: env validation forbids this provider in production
    this.logger.info({ mobile, code }, "OTP (console provider)");
    return Promise.resolve();
  }

  sendPriceAlert(mobile: string, alert: PriceAlertSms): Promise<SmsDelivery> {
    this.logger.info(
      { mobile, message: priceAlertText(alert) },
      "Price alert SMS (console provider)",
    );
    return Promise.resolve("SENT");
  }
}
